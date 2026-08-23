# Survivor LAN — plan 12 : l'exécution sous Claude Code

Oui : les lots du [README](README.md) **sont** l'ordre d'exécution, et chacun est
dimensionné pour tenir dans une session Claude Code. Ce document les traduit en
sessions, avec pour chacune ce qu'il faut lire, ce qu'il faut toucher, ce qu'il
ne faut surtout pas toucher, et comment savoir que c'est fini.

**Onze sessions.** Les lots 1, 2, 3, 6 et 7 tiennent en une session chacun ; le
lot 4 en demande cinq, le lot 5 en demande deux — leur volume dépasse ce qu'un
contexte tient sans dériver.

---

## Les règles qui valent pour les onze sessions

**Une session, un lot, un commit.** Ne jamais enchaîner deux lots dans la même
session : le contexte se remplit du premier et le second se fait à moitié.

**Le versionnage suit la convention du dépôt** (`shared/version.js`) — `minor` =
le plan, `patch` = le rang du lot. Le plan 11 occupait `0.14.x`, donc **le plan
12 ouvre `0.15.0`** et chaque session incrémente le patch. Le changelog en tête
de `version.js` prend une entrée par lot, dans la forme des précédentes :
majuscules pour la phrase qui dit **ce qui a changé de nature**, minuscules pour
le détail.

**Les conventions du dépôt s'appliquent** (`CLAUDE.md`, section Conventions) :
commentaires et identifiants en **français sans accents**, chaînes affichées au
joueur **avec** accents, et **le minimum de commentaires possible** — par
défaut aucun. Un commentaire ne se justifie que s'il dit *pourquoi*, jamais
*quoi*.

**Aucune dépendance npm.** Vanilla JS, modules ES, rien d'autre.

**Vérification minimale avant chaque commit :**

```bash
node --check shared/game_state.js && node --check shared/cards.js \
  && node --check shared/armes.js && node --check shared/hauts_faits.js
PORT=7913 timeout 5 node server.js
npm run version-check
```

**Prompt d'ouverture commun** — à mettre en tête de chaque session :

> Lis `docs/superpowers/specs/plan12/README.md` puis le plan indiqué ci-dessous.
> Tu exécutes **un seul lot**. Respecte `CLAUDE.md` (français sans accents dans
> le code, minimum de commentaires). N'anticipe sur aucun autre lot : si tu
> croises un défaut qui appartient à un lot ultérieur, note-le et laisse-le.

---

## Session 1 — lot 1 : arrêter les pertes

**Plan :** [01-INTERFACE.md](01-INTERFACE.md) · chantiers **12c** (immédiat),
**10** (immédiat), **11** (affichage), **01**, **02**
**Version :** `0.15.1`

> Cinq changements courts, dans cet ordre :
>
> 1. `shared/cards.js` — retirer « Second canon » du pool des armes qui ne lisent
>    pas `extraBarrels` (dispersion, grenade, tesla, lame, laser). Un champ sur
>    la carte, lu par `eligibleCards`. **Ne touche pas encore à `_volley`** —
>    c'est le lot 3.
> 2. `shared/armes.js` — `FAMILLES_D_ARME` se **déclare** au lieu de se déduire :
>    ajouter `famille: true` aux quatre armes qui ont réellement des cartes
>    (assaut, laser, tesla, lame) et filtrer là-dessus.
> 3. `public/ui/screens.js` — `nomsRecompense()` : ajouter la branche
>    `type === "arme"`. `armeNom` est déjà importé ligne 13.
> 4. `public/css/ui.css` — `.overlay` : `justify-content: safe center`.
> 5. `public/css/menus.css` — `#briefArme { width: 100% }`, `#briefArmeRow` en
>    `repeat(3, minmax(0, 1fr))`, et les états `:hover` / `:focus-visible` /
>    `.mine` de `.armeOpt` avec `--tint`.

**Ne pas toucher :** `shared/game_state.js`. Aucun des cinq gestes n'a de raison
d'y aller — si tu t'y retrouves, tu as pris un raccourci.

**Fini quand :** une manche à la lame ne peut plus proposer « Second canon » ; la
page Hauts faits est lisible depuis le haut sur une fenêtre de 600 px ; les trois
armes tiennent sur une ligne et réagissent au survol ; l'écran des hauts faits
affiche « Fusil à dispersion » et non « dispersion ».

---

## Session 2 — lot 2 : les règles fausses

**Plan :** [02-REGLES.md](02-REGLES.md) · chantiers **03**, **04**, **06** ·
plus **12b** de [03-AUDIT-ARMES.md](03-AUDIT-ARMES.md)
**Version :** `0.15.2`

> Quatre correctifs de simulation, indépendants entre eux :
>
> 1. **03** — sortir `hpCap` de `applyMeta` et en faire un point de passage
>    unique appelé en **fin** de `_recomputeMods`, après les reliques.
> 2. **04** — le cristal devient une cible pour `_segmentHits` (laser),
>    `_teslaTir` et `_lameTir`. Réserve sur le tesla : le cristal n'est acquis
>    **que si aucun ennemi n'est à portée**.
> 3. **06** — la grenade détone à `p.aimR` borné par la portée de l'arme.
>    Ajouter `vie` en option de `_fire` sans retirer `court`, et un marqueur au
>    sol sous le réticule quand le lance-grenades est porté.
> 4. **12b** — `17: { son: "balayage", force: 0.8, shake: 2 }` dans
>    `EFFECT_SOUND` (`public/render/fx.js`), et une boucle sonore pour le
>    faisceau dont la hauteur suit `armeRes`.

**Attention :** le point 3 modifie `_fire`, que **toutes** les armes traversent.
Vérifier qu'aucune arme sans `opt.vie` ne change de portée.

**Fini quand :** les huit armes cassent un cristal en un temps comparable ;
Contrat de sang plafonne même avec Cœur-machine et la ligne de PV au max ; la
grenade explose sous le curseur ; aucune arme n'est silencieuse.

---

## Session 3 — lot 3 : poser les filets

**Plan :** [03-AUDIT-ARMES.md](03-AUDIT-ARMES.md) et
[04-POOL.md](04-POOL.md) · chantiers **12d**, **12e**, **12c** (structurel),
**08**, **10** (critère), **11** (validation), plus le préalable
**Version :** `0.15.3`

**La session la plus importante des neuf.** Elle n'ajoute aucun contenu : elle
ajoute les critères qui empêcheront les sessions 4 à 8 de recreuser les mêmes
trous.

> Dans cet ordre strict :
>
> 1. **Préalable — `conversionBoss()` dans `shared/armes.js`.** Elle ne calcule
>    aujourd'hui que `rebonds` et `lame`, et renvoie `1` pour les six autres. Les
>    mécaniques existent dans la simulation : bonus de chaleur du laser
>    (`game_state.js:1433`), convergence de la dispersion (ligne 1542),
>    détonation au contact de la grenade. **Les calculer, pas les déclarer.**
> 2. **12d** — `perforation: 0` pour le laser et le railgun. Les deux portent
>    `perforeTout`, donc leurs coefficients de 1,5 et 2,0 sont inertes.
>    `Ricochet` agit sur `chain`, pas `pierce` : il ne part pas avec.
> 3. **12c structurel** — `barrelDamageMul` descend dans la branche `default` de
>    `_volley`, là où `extraBarrels` est lu. La liste de la session 1 devient
>    alors inutile : la retirer.
> 4. **08** — le filtre par axe dans `eligibleCards` : `axes` sur les cartes
>    concernées, exclusion si **tous** les axes sont à 0 pour l'arme portée.
>    `every`, pas `some`. Rejouer `poolThin()` par arme.
> 5. **12e**, **10** (critère), **11** (validation) — les trois nouveaux tests
>    dans `verifierArmes()` et `verifierHautsFaits()`.

**Le critère de sortie est contre-intuitif :** à la fin de cette session, les
vérificateurs doivent remonter **au moins une erreur** — celles des sessions 4 à
6, qui ne sont pas encore faites (deux armes absentes, douze familles
incomplètes). Un lot 3 qui rend tout silencieux a posé des tests complaisants,
pas des filets.

**Conséquence à surveiller :** corriger `conversionBoss` change `powerIndex()`,
donc `bossPower()`, donc l'échelle des boss. Faire tourner `verifierBoss()` et
`verifierTTK()` après, et noter les écarts — ils sont attendus, mais ils doivent
être **lus**, pas subis.

---

## Session 4 — lot 4a : trancher le railgun

**Plan :** [03-AUDIT-ARMES.md](03-AUDIT-ARMES.md) § a · chantier **12a**
**Version :** `0.15.4`

**Cette session commence par une question au porteur, pas par du code.** Le
railgun annonce « une charge avant chaque tir » et n'en a aucune. Deux issues :
implémenter la charge (`armeRes` monte pendant le maintien, le tir part au
relâchement ou à saturation — le mécanisme existe déjà pour la rampe et la
chaleur), ou retirer la charge de la fiche et rebaser le railgun sur l'axe
distance.

> Si la charge est retenue : `armeRes` alimenté dans `_shoot`, un anneau de
> charge sur le personnage sur le modèle de la rampe (`render/boss.js:1373`), et
> `armeMuet` incrémenté pendant la charge — la session 7 en a besoin.

**Pourquoi en premier des trois sessions du lot 4 :** la note de difficulté du
railgun (`D = 3,5` ou `D = 1,5`) dépend de cette décision, et la session 7 la
lit pour fixer sa cible. Trancher après la campagne obligerait à la rejouer.

---

## Session 5 — lot 4b : les deux armes manquantes

**Plan :** [05-ARMES-MANQUANTES.md](05-ARMES-MANQUANTES.md) · chantier **11**
**Version :** `0.15.5`

> Le fusil de siège et le fusil de précision entrent dans `ARMES`. Les deux sont
> entièrement spécifiés — fiche, contrepartie, coefficients, paliers de famille.
> Il n'y a rien à trancher.
>
> Le chargeur du fusil de siège et son bouclier ×3 pendant la recharge sont la
> seule mécanique neuve : un état d'arme à trois temps (tir, vide, recharge),
> qui doit être lisible au HUD et qui alimente `armeMuet`.

**Fini quand :** `verifierHautsFaits(…, armeIds)` ne remonte plus d'arme inconnue,
et chaque arme est donnée par exactement un haut fait.

---

## Session 6 — lot 4c : les vingt cartes de famille

**Plan :** [04-POOL.md](04-POOL.md) § 10 et
[05-ARMES-MANQUANTES.md](05-ARMES-MANQUANTES.md) · chantiers **10** + **11**
**Version :** `0.15.6`

> Vingt cartes, cinq familles de quatre : dispersion, railgun, lance-grenades,
> fusil de siège, fusil de précision. Les paliers sont donnés dans les deux
> plans.
>
> La règle du plan 11 tient : **le palier 3 est systématiquement celui qui
> corrige la faiblesse boss.** Le joueur qui investit répare lui-même son arme.

**Session à surveiller pour la dérive de contexte.** Vingt cartes, c'est long,
et une carte écrite en fin de session ressemble rarement à une carte écrite au
début. Si le contexte se remplit, **couper après trois familles** et faire les
deux dernières dans une session 6bis — c'est moins coûteux qu'une passe de
relecture sur vingt cartes hétérogènes.

**Fini quand :** `verifierArmes()` et `verifierCatalogue()` sont silencieux, et
`poolThin()` l'est pour les dix armes.

---

## Session 6bis — lot 4d : l'identité de tir

**Plan :** [08-IDENTITE-DE-TIR.md](08-IDENTITE-DE-TIR.md) · chantiers **13**,
**14**, **15**
**Version :** `0.15.7`

> 1. **13 — laser.** `portee: 0.9` (la portée actuelle de 77 m sort de l'écran à
>    tous les coups : la vue fait 1600 px et le faisceau en parcourt 1540).
>    `CHALEUR_MONTEE_VIDE: 1/7.0` — la chaleur monte tant que le faisceau est
>    actif, plus seulement quand il touche. Une amorce d'allumage, un terminus
>    dessiné au bout de la portée, et la boucle sonore du chantier 12b.
> 2. **14 — assaut.** `disp = ASSAUT_DISPERSION * (1 - p.armeRes)` dans la
>    branche `default` de `_volley`. **Aucun état nouveau** : `armeRes` porte
>    déjà exactement la bonne valeur.
> 3. **15 — formes.** Un sixième champ `forme` sur le projectile sérialisé, absent
>    par défaut (`trimTail`, donc le tir standard ne grossit pas d'un octet), et
>    les formes du tableau. Puis la scission du fusil à dispersion à ~150 px.

**Ces trois chantiers changent la valeur mesurée**, malgré leur apparence
cosmétique — une portée divisée par deux, une gerbe qui s'ouvre en mouvement, un
projectile qui ne se scinde qu'à mi-distance. **Ils doivent être finis avant la
campagne du lot 5**, sinon elle est à rejouer.

**Note d'équilibrage à reporter :** la note de difficulté de l'assaut passe de
`D = 2,0` à `D = 2,5` (l'axe *visée* monte de 0,5 à 1 — il faut désormais choisir
entre tirer et bouger). La session 7 doit lire cette valeur.

---

## Sessions 7 et 8 — lot 5 : équilibrer

**Plan :** [06-EQUILIBRAGE.md](06-EQUILIBRAGE.md) · chantier **07**
**Versions :** `0.15.8` (instrumentation) et `0.15.9` (correction)

**Session 7 — instrumenter et mesurer.**

> Les quatre compteurs sur le joueur (`armeTemps`, `armeMuet`, `armeCibles`,
> `armeDegats`), remis à zéro par manche. `armeMuet` s'incrémente là où le tir
> est **refusé pour cause de ressource** — saturation du laser, recharge du
> siège, charge du railgun — jamais là où le joueur choisit de ne pas tirer.
>
> Puis `verifierArmes()` passe de vérificateur statique à vérificateur de
> campagne, sur le modèle de `verifierMarchand()` qui existe déjà.
>
> Enfin : une manche complète par arme, difficulté normale, et le relevé de `V`
> pour les dix.

**Session 8 — corriger.**

> Comparer `V` à `1,00 + 0,04 × (D − 0,5)`, tolérance ± 0,05. Pour chaque arme
> hors fourchette, corriger **le terme que la mesure désigne** — pas les dégâts
> par défaut. Le commentaire du lance-grenades dans `armes.js` est le précédent
> à suivre : la première coupe portait sur les dégâts, `verifierArmes()` l'a
> refusée, et la bonne coupe portait sur le rayon.
>
> Puis rejouer la campagne entière et vérifier qu'aucune correction n'en a cassé
> une autre.

**Séparer les deux sessions est délibéré.** Instrumenter et corriger dans le même
contexte pousse à ajuster les compteurs jusqu'à ce que les chiffres plaisent. La
mesure doit être commitée **avant** qu'on sache ce qu'elle dit.

---

## Sessions 9 à 11 — lots 6 et 7 : tesla, Tisseur, habillage

**Plans :** [07-TESLA.md](07-TESLA.md), [09-TISSEUR.md](09-TISSEUR.md) et
[01-INTERFACE.md](01-INTERFACE.md) § 09 · chantiers **05**, **16**, **09**
**Versions :** `0.15.10` (tesla) et `0.15.11` (cadres et Tisseur)

> **Tesla d'abord.** Le tir part droit au réticule, s'accroche au premier corps
> du segment avec une tolérance latérale (`TESLA_ACCROCHE`), et se disperse à
> l'impact. `sansVisee` disparaît. Rien à portée dans l'axe : le tir se perd.
>
> `_segmentHits` fait déjà la projection nécessaire — l'extraire, pas la
> réécrire.
>
> **`_bot()` et le simulateur doivent viser** comme pour toute autre arme.
> Les laisser en l'état ferait mentir la campagne sur la seule arme qu'on vient
> de changer.
>
> Puis repasser le tesla seul à la campagne : c'est l'arme dont `R` change le
> plus.
>
> **Le Tisseur ensuite** (chantier **16**,
> [09-TISSEUR.md](09-TISSEUR.md)) : `m.noeud` existe déjà et suffit à tout. Un
> texte d'alerte par variante, l'empreinte pointillée de la future zone sous le
> nœud dès son apparition, des amarres vers le boss sur le modèle du trait de
> `MECH_FEED`, et une empreinte qui se rétracte quand le nœud tombe. **Ne pas
> séparer `MECH_CLUSTER`** — le partage du créneau est correct, c'est l'annonce
> et le rendu qui doivent diverger.
>
> **Cadres enfin**, si le contexte le permet — sinon en session 11. Le cadre
> s'applique à `.teamRow` et non à `.teamName`, la portée `"ligne"` disparaît
> avec sa règle CSS, et le bilan cesse d'en porter.

---

## Ce qu'il ne faut pas laisser Claude Code faire

**Réordonner les lots.** L'ordre encode des dépendances qui ne se voient pas dans
le code : `08` lit des coefficients que `12d` corrige, la note `D` du railgun
dépend de `12a`, la campagne du lot 5 mesure des armes que le lot 4 crée. Un
agent qui trouve « plus logique » de commencer par l'équilibrage produira une
campagne sur huit armes qu'il faudra rejouer sur dix.

**Élargir une session.** Un lot fini tôt n'est pas une invitation à prendre le
suivant. C'est une invitation à commiter.

**Corriger un vérificateur qui parle.** À la fin de la session 3, les
vérificateurs remontent des erreurs, et c'est le résultat attendu. Un agent qui
les fait taire en assouplissant les seuils a détruit le lot.

**Écrire un commentaire par bloc.** `CLAUDE.md` dit *le minimum possible, par
défaut aucun*. Le dépôt a des commentaires denses là où ils portent un
raisonnement ; c'est l'exception qui a été gagnée, pas le style à imiter partout.
