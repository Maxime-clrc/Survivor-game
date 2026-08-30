# Survivor LAN — plan 25 : la couture

La demande porte sur la **cohérence** : faire tenir ensemble ce que les plans 20
à 24 ont posé, sans ajouter de mécanique. Le dépôt a déjà, mesuré et rejouable,
la plus grande partie de ce que la mission réclame — le travail restant est un
petit nombre de trous réels, et ils ont presque tous la même forme : **une chose
enregistrée à un endroit sur les neuf qu'il fallait**.

L'audit ci-dessous est **mesuré**, pas relu.

---

## 1 · Ce que l'audit a trouvé

### Ce qui est déjà là, et qu'on ne refait pas

| demande de la mission | état | preuve |
|---|---|---|
| « le bouclier ne doit plus être illisible sur la vie » | **déjà réglé** : deux lignes, jamais deux couches — `#selfShield` est la rangée sœur de `#selfHp`, avec son libellé, sa jauge et son chiffre | `index.html:98-107`, `hud.js:754` |
| DPS meter optionnel et secondaire | un seul contrôle à **trois crans** (masquée / combat / détail), masqué par défaut | `ui/pause.js`, `hudDps` + `hudStats` |
| transitions de menu non brutales | croisement 280 ms sortie / 380 ms entrée, retrait `--screen-hold` 120 ms, ce sont les **voiles** qui se croisent et jamais les contenus | `menus.css:826-848`, `ui/screens.js:114` |
| transition d'arrivée de boss | deux canaux à constantes distinctes, la **lumière change avant la matière** (`kL` 1,2 s, `kS` 0,8 s démarrée à `kL > 0,85`) | `render/lumiere.js`, `pasBoss()` |
| identité propre des quatre lieux | `verifierBiomes()` **muet sur 200 graines × 4 lieux × 3 modes** (19,3 s) : deux lieux ne peuvent pas partager une loi d'implantation | rejoué |
| hiérarchie audio, limiteur, ducking | 16 voix, **aucune voix volée à aucune densité**, refus qui montent avec la foule ; musique étouffée à 0,45 sur le **bus**, en rampe | `LISEZMOI.md` § le mix ; `AUDIO_CFG.MUSIC_DUCK` |
| performance CPU et pathfinding | `verifierPopulation` (45 min × 3 modes × 3 effectifs) ne signale **aucun** dépassement du budget de 16 ms au p99 ; `verifierDeplacement` et `verifierEncerclement` muets | rejoué |
| allocations | `champ()` et `props.js` n'allouent rien par image ; **zéro `Math.random`** dans les six modules de décor déterministe | rejoué |
| multijoueur sans divergence | la géométrie se régénère des deux côtés ; `verifierEffets` **muet sur 539 817 images** (6 cas de 25 min) — aucun champ posé sur un effet et jamais transporté | rejoué |
| logs inutiles | **8 `console.*`** dans tout `public/` et `shared/`, tous délibérés (`_poolWarn` dédupliqué par manche, perte de contexte WebGL, relevé du banc) | `grep` |
| registres partagés serveur ↔ client | dix tables croisées — `POWERUP_ICON` / `STYLE` / `COLOR`, `STATUS_ICON`, `SRC_ICON` / `TINT`, `ENEMY.TINT`, `BOSS_SKIN`, `CADRE_SKIN`, `DEATH_BURST` — **aucune entrée manquante, aucune en trop** | rejoué |

Vingt vérificateurs sont muets et le restent : `verifierGrammaire`,
`verifierCoexistence`, `verifierArchetypes`, `verifierPrises`, `verifierElites`,
`verifierScript`, `verifierArmes`, `verifierHautsFaits`, `verifierNavigation`
(480 géométries), `verifierCatalogue`, `verifierCartes`, `verifierReliques`,
`verifierBonus`, `verifierVitesses`, `verifierClasses`, `verifierTraits`,
`verifierBlocs`, `verifierEmpreinte`, `verifierDangers`, `verifierAmers`,
`verifierFeedback`.

### Les sept défauts

| # | défaut | preuve mesurée |
|---|---|---|
| 1 | **Un écran est enregistré à UNE place sur neuf.** `#hautsFaits` n'est ni dans `ui/dom.js`, ni dans l'observateur de `screens`, ni dans `UI_SOUND_SCREENS`, ni dans la liste `[hidden].leaving`, ni dans le balayage, ni dans les deux listes de curseur. Il n'est que dans `TOPBAR_SCREENS`. Conséquences : il **disparaît d'un coup** au lieu de sortir, ses **14 contrôles sont muets**, et son nœud est cherché par `getElementById` à **quatre** endroits. C'est exactement le mode de défaillance que `RENDU.md` décrit — « neuf endroits, aucun facultatif, un oubli ne produit jamais d'erreur ». | table des 14 écrans × 9 points, ci-dessous |
| 2 | **Trois écrans de décision n'ont pas de voix.** `#brief` (le choix d'arme : trois offres, une relance, un « continuer »), `#merchant` (acheter, relancer, passer) et `#hautsFaits` (13 cadres, un retour) sont hors de `UI_CLICK_SCREENS` — **environ 24 contrôles**. `#cards` et `#build`, ouverts aux mêmes moments de la partie, y sont. Le choix d'arme est la décision la plus lourde de la manche, et c'est la seule qui ne fait aucun bruit. | `ui/screens.js:137-139` croisé au markup |
| 3 | **UN ORDRE DE BOSS ARRIVE EN SILENCE.** `applyAlert()` sonne `evenement` pour une **météo** et pour un **événement**, et **rien** pour `msg.mech` — le bandeau `ALERT_ORDER`, à rebours, la ligne la plus urgente du jeu. La recette qui lui était destinée existe, prend un `level` et distingue déjà l'ordre de l'avertissement ; **aucun chemin ne la nomme**. `annonce` est la seule des **50** recettes d'`audio.js` qu'aucun fichier du dépôt ne cite. Un changement de temps s'entend, un ordre de boss non. | `net/interp.js:282-289` ; croisement des 50 recettes contre tout le dépôt |
| 4 | **`verifierSilhouettes()` est ROUGE, et il l'est depuis 0.21.7.** Porte-bouclier et chœur se confondent sur les **cinq** axes : élancement 0,96 / 1,12 pour une tolérance de 0,18 · matière 0,66 / 0,78 pour 0,14 · remplissage 0,79 / 0,78 · sommets 29 / 27 · avance 0,001 / 0,001. Deux corps dont la bonne réponse est opposée — on contourne l'un, on tue l'autre en premier. | rejoué |
| 5 | **Plus d'un tiers des bonus au sol sont sous un corps à 200 ennemis.** L'ordre de dessin met le bonus **sous** la horde, et le bonus est le seul objet de gameplay sans anneau, sans télégraphe et sans priorité. La surface occupée par les corps reste faible — 3,3 % de la vue : ce n'est pas un problème de densité, c'est un problème d'**ordre**. | cauchemar, 4 joueurs, 300 s par densité, vue réelle |
| 6 | **Le palier de qualité et le confort ne sont pas là où on les cherche.** `setGfx` a **un seul appelant**, le menu de pause — donc joignable seulement une manche en cours. « Paramètres » annonce « les réglages de cette machine » et porte langue, audio et contrôles, pas celui-là. Et `prefers-reduced-motion` s'arrête au DOM : le tressaillement est un `transform` **écrit par JS** sur `#arena`, le hitstop est `timeWarp`, les éclairs sont sur le canvas — les trois blocs de `menus.css` ne les touchent pas, et rien ne lit un réglage de confort parce qu'il n'y en a pas. | `grep setGfx` : 1 appelant ; `render/world.js:287-295` |
| 7 | **Dix-sept exports morts et dix clés anglaises mortes.** Définis une fois, nommés nulle part : `stopMusic` — que `RENDU.md` décrit pourtant comme l'un des **quatre** aiguillages de `music.js` —, `statusNom`, `statusDesc`, `STATUS_BY_KEY`, `hazardNom`, `classBrief`, `typeAt`, `beatIndex`, `atlasCanvas`, `hudHfEl` (doublon de la propre recherche de `hud.js`), `sampleReady`, `audioReady`, `getMusicDuck`, `getMusicIntensity`, `musicStats`, `tracksStats`, `CADRE_PALIER_MAX`. Et `u.rebond`, `u.plomb`, `u.obus`, `u.grenade`, `u.drone` — dix clés traduites qu'aucun `tn()` n'atteint. **Le nom d'un état et le nom d'un danger sont traduits et jamais montrés.** | balayage des exports et des 1 437 clés anglaises |

#### Les 14 écrans contre les 9 points d'enregistrement

| écran | dom.js | observateur | fil / masque | son | entrée css | sortie css | balayage | curseur |
|---|---|---|---|---|---|---|---|---|
| gate | oui | oui | oui | oui | oui | oui | oui | oui |
| loading | oui | oui | oui | — | — | oui | — | oui |
| hubScreen | oui | oui | oui | oui | oui | oui | oui | oui |
| bilan | oui | oui | oui | oui | oui | oui | oui | oui |
| fin | oui | oui | oui | oui | oui | oui | — | oui |
| menu | oui | oui | oui | oui | oui | oui | oui | oui |
| **hautsFaits** | **NON** | **NON** | oui | **NON** | oui | **NON** | **NON** | **NON** |
| settings | oui | oui | oui | oui | oui | oui | oui | oui |
| panel | oui | oui | oui | oui | oui | oui | oui | oui |
| brief | oui | oui | oui | **NON** | oui | oui | — | — |
| cards | oui | oui | oui | oui | — | — | — | — |
| **merchant** | oui | — | — | **NON** | — | — | — | — |
| build | oui | — | — | oui | — | — | — | — |
| pause | oui | oui | — | oui | — | oui | — | oui |

Les tirets sont des absences **voulues** et documentées : `#cards`, `#merchant`,
`#build` et `#pause` s'ouvrent une manche en cours, gardent la palette de jeu et
le réticule, et ne font pas le croisement d'écran. Les **NON** en gras sont les
trous.

#### La lisibilité, aux quatre densités demandées

Cauchemar, quatre joueurs, population forcée, 300 s par cas, relevé deux fois par
seconde sur la vue **réelle** du joueur 1 (1600 × 900 centrée puis écrêtée).

| pop | corps dans la vue | surface couverte | paires en contact | bonus vus | **part recouverte** |
|---|---|---|---|---|---|
| 50 | 30,0 | 1,0 % | 3,2 | 499 | **2,6 %** |
| 100 | 52,1 | 1,7 % | 10,1 | 478 | **18,0 %** |
| 150 | 96,8 | 3,1 % | 23,4 | 2 036 | **21,3 %** |
| 200 | 106,3 | 3,3 % | 46,5 | 2 049 | **36,9 %** |

**Ce que la mesure dit, et ce qu'elle ne dit pas.** Les corps ne mangent pas
l'écran : 3,3 % de la vue à 200. Le personnage, les projectiles, les
télégraphes, le boss et les objectifs vivent tous sur une couche au-dessus de la
horde ou dans le HUD. **Le bonus est le seul objet de gameplay dessiné en
dessous**, et c'est le seul chiffre qui se dégrade — de 2,6 % à 36,9 %, soit ×14
pour une densité ×4.

---

## 2 · Les lots

| lot | version | contenu | critère |
|---|---|---|---|
| **1** | 0.28.0 | **L'écran qui n'a jamais été enregistré.** `#hautsFaits` prend ses neuf entrées, son nœud descend dans `ui/dom.js` et les quatre `getElementById` disparaissent. Puis le contrôle qui empêche que ça recommence : `verifierEcrans()` croise le markup avec les neuf points et refuse un écran qui n'en tient qu'une partie — les absences voulues se **déclarent**, elles ne s'oublient pas. | `verifierEcrans()` muet ; sortie d'écran mesurée à `--screen-out` et non à zéro |
| **2** | 0.28.1 | **Trois écrans de décision retrouvent une voix.** `#brief`, `#merchant` et `#hautsFaits` entrent dans `UI_CLICK_SCREENS` et dans la liste de curseur qui lui sert de miroir. `uiSoundFor()` gagne ce que l'engagement demande : un achat résout, une relance ne résout pas, « passer » est la bascule descendante. **Aucune recette nouvelle.** | ~24 contrôles qui sonnent ; `verifierEcrans` vert sur la colonne « son » |
| **3** | 0.28.2 | **Un ordre de boss s'entend.** `applyAlert()` sonne `annonce` sur `msg.mech`, `level` portant la classe d'alerte. Puis le sens inverse dans `verifierFeedback` : **une recette qu'aucune table ne nomme est une entrée morte**, exactement comme un `kind` sans dessin dans `verifierDangers`. | 0 recette orpheline sur 50 ; annonces par combat relevées, et le mix rejoué au harnais du limiteur pour vérifier qu'aucune voix n'est volée |
| **4** | 0.28.3 | **Le bonus cesse de passer sous la horde.** Ce qui monte est le **signal**, pas l'objet : le socle de famille et le cadran de fin se dessinent au-dessus des corps, l'icône reste où elle est. Précédent écrit : `drawMarkColumns` est déjà « la seule chose au-dessus de la horde ». | part recouverte **sous 5 %** aux quatre densités ; ordre de dessin inchangé pour tout le reste |
| **5** | 0.28.4 | **Porte-bouclier et chœur cessent de se confondre.** On sculpte sur l'axe qui a un **sens** — le pavois est un blocage frontal, le chœur est un champ ouvert —, jamais contre le chiffre. | `verifierSilhouettes()` muet, et la planche `?planche` regardée en résolution native |
| **6** | 0.28.5 | **Image et confort, là où on les cherche.** Une section dans « Paramètres » : le palier de qualité (même setter que la pause, pas un second) et l'intensité du tressaillement à trois crans, lue en **un seul point** comme `gfx`. `prefers-reduced-motion` sert de valeur par défaut au premier démarrage et n'écrase jamais un choix. | aucune règle de simulation touchée ; `low` inchangé au pixel ; `gfx` garde ses cinq points de lecture |
| **7** | 0.28.6 | **Ce qui est mort se supprime.** Les 17 exports et les 10 clés anglaises. `stopMusic` est le cas à **trancher**, pas à supprimer d'office : soit il a un appelant, soit la doc cesse de l'appeler un aiguillage. | balayage des exports rejoué ; `verifierFeedback` vert |
| **8** | 0.28.7 | **Le banc, enfin lu, et la checklist.** La table de `LISEZMOI.md` est vide depuis 0.25.1 : l'instrument a été construit et jamais relevé. Quatre densités × cinq paliers, plus la checklist de régression du § 4. | la table remplie ; la checklist rejouée une fois de bout en bout |

---

## 3 · Ce que le plan ne fait PAS, et pourquoi

- **Il ne touche à aucune statistique.** Ni DPS, ni PV, ni XP, ni monnaie, ni
  échelle. `verifierPopulation` signale deux choses — des paliers de population
  qui redescendent d'un segment à l'autre, et un écart de niveau atteint selon
  l'effectif — qui relèvent de l'**équilibrage**, mesurées au bot et pas au
  joueur. Elles vont dans une campagne d'équilibrage, pas dans un lot de polish,
  et la mission l'interdit explicitement.
- **Il ne montre pas le nom d'un état ni celui d'un danger.** Les deux sont
  traduits et morts (défaut 7). Leur donner un lecteur voudrait dire une
  info-bulle au HUD, or le budget du HUD est déjà dépensé et la mission dit de ne
  pas le remplir. **La règle du dépôt tranche** : un champ dont la seule lecture
  est morte se supprime, il ne se répare pas.
- **Il ne remplace pas le test à l'œil.** La lisibilité à 200 corps, le contraste
  du faisceau sur la Nébuleuse, la planche de silhouettes : aucun banc ne les
  remplace, et les lots 4, 5 et 8 portent chacun leur protocole.
- **Il n'ajoute aucune mécanique, aucun écran, aucune recette de son.** Les huit
  lots ne font que **brancher** ce qui existe déjà et **supprimer** ce qui ne sert
  plus.
- **Il ne réécrit pas le HUD.** Les quatre demandes de la mission qui le
  concernent — bouclier, hiérarchie, boss, multijoueur — sont tenues, et le
  compteur de dégâts est déjà optionnel et secondaire.

---

## 4 · La checklist de régression

Une passe complète. Rien de ceci n'est automatisable : ce qui l'est vit dans les
vérificateurs, et la liste des vingt muets est au § 1.

**Armes** — les dix, au banc (`BANC=1` + `?banc`, touches 1-0) : bouche, voix de
départ, silhouette de projectile, impact, ressource (chaleur, charge, chargeur,
rampe) visible pour son seul porteur, terminus du faisceau dans le champ de
vision, conversion contre le boss.

**Ennemis** — les treize, en cauchemar après la minute 19 : silhouette
reconnaissable sans la couleur (`?planche`), préavis sur le corps, éclatement
propre au type, acte final pour les quatre qui en ont un, matière à la touche.

**Boss** — les onze, un par un : arrivée (voix, prise d'arène, resserrement des
bounds), les patrons du répertoire, la rupture de barre, le palier,
l'emportement, la mort en cinq échéances.

**Lieux** — les quatre, aux trois modes, deux graines : sol, semis, blocs, amer,
dangers, lumière, arrière-plan, premier plan, grille de 20 m. Le critère de
non-régression est celui de `RENDU.md` : échanger les quatre noms et voir si les
captures restent difficiles à attribuer.

**Bonus** — les treize : socle de famille, teinte de type, apparition, présence,
cadran de fin, ramassage, expiration, second anneau des trois qui portent un
rang, et — après le lot 4 — la lecture sous la horde.

**Difficultés** — les trois : roster, traits, script, dangers, météo, profil de
boss, décor de mode.

**Multijoueur** — deux clients sur la même salle : salon, prêt, lancement différé
et son annulation, briefing et son attente, couleurs, cartes, marchand, boss,
bilan, pause, reprise, départ en pleine manche, reconnexion.

**Écrans** — les quatorze, dans les deux sens, en regardant la **sortie** : le
croisement, le voile, le curseur, le son au survol et à l'appui, le fil d'Ariane.

**Performance** — le banc, quatre densités × cinq paliers, dans la Fonderie
(souffles) et la Nébuleuse (faisceau) : FPS médian et p1, ms p99 et max, `draws`,
`quads`, particules, voix en pointe, refusées, volées.
