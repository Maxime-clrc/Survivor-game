# Décisions — TOUTES TRANCHÉES

**Les 15 décisions de design sont arrêtées.** Le plan est exécutable d'un bout à
l'autre sans nouvel arbitrage.

Restent les **7 mesures** (section 2) : elles ne se décident pas, elles se
constatent en faisant tourner le jeu. Les valeurs écrites dans les lots sont donc
des **estimations**, dont certaines à ±50 %. D'où l'exigence transversale du
README : **chaque lot livre son script de vérification en même temps que son
code.** On exécute les dix, on lance les scripts une fois, on sait quel critère
est rouge et de combien.

## Récapitulatif

| # | décision | arrêté |
|---|---|---|
| D1 | achat unique par marchand | **oui** — `BUY_PER_VISIT: 1`, `OFFER_COUNT: 4` |
| D2 | doctrine des 90 % de vitesse | **oui**, avec script de vérification |
| D3 | armes | **le tableau `armes` ne bouge pas** — filtre `requires` à la place |
| D4 | `Brume` | **(b)** retexter |
| D5 | « météo » → « conditions » | **oui** à l'affichage, `WX_*` inchangé en interne |
| D6 | `appel_du_vide` | **non** au premier passage |
| D7 | cible de TTK | **0,15-0,60 s** |
| D8 | élargir la méta | **oui, par le qualitatif** + budget entièrement redérivé |
| D9 | matrice de cohérence | **oui**, en taux de réussite |
| D10 | cloisonnement de l'arbre | **tronc commun** de 3 lignes + `SECOURS`, partagés |
| D11 | PV de boss sur la minute | **oui**, `BOSS_HP_MINUTE_RAMP: 0,055` |
| D12 | périmètre d'écriture | **trois vagues** |
| D13 | corps comme obstacle | critère ajouté au lot B |
| D14 | vitesse de référence | **classe médiane** (260) + sous-vérif. tank solo |
| D15 | `RELIC_WEIGHT` | `[50, 28, 15, 4]`, réglable en test |

---

## 1. Le détail des quinze

### D1 · Achat unique par marchand ? — **lot F** ⚠ structurante
**Ce que ça engage :** rouvre une décision verrouillée de `reliques.js`
(« achats INDÉPENDANTS… c'est un budget à répartir »).
**TRANCHÉE : oui.** Le raisonnement d'origine était bon, sa prémisse ne l'a
jamais été — le budget n'a jamais été inférieur à ce qu'il y a à acheter. Le lot
F part avec `BUY_PER_VISIT: 1`, `OFFER_COUNT: 4`, relance croissante dans la
visite, catalogue à 24.

### D2 · La doctrine « aucun type ne dépasse 90 % de `PLAYER_SPEED` » ? — **lot B** ⚠ structurante
**Ce que ça engage :** une contrainte permanente sur tout futur type de monstre,
vérifiée par script au même titre que `verifierBiomes()`.
**TRANCHÉE : oui**, avec le script de vérification rejouable. La référence est
fixée par D14 : **la classe médiane** (Soigneur, 260 px/s).

### D3 · Arme accessible tôt : comment, sans casser les jalons ? — **lot E-3** ⚠ structurante
**Le conflit :** `boss_5` débloque toutes les `armes` ; `sans_chute` et
`kills500` se partagent la liste **par parité d'index**. Ajouter des armes de
départ dans le même tableau décale ce partage et **reverrouille des cartes chez
les comptes existants**.
**TRANCHÉE — et reformulée, ce qui supprime le conflit.** Le besoin réel n'est
pas de rendre une arme accessible tôt : c'est qu'**une carte de dégâts d'arme ne
puisse sortir que si l'arme a été prise**. C'est le filtre `requires` de E-1,
appliqué aux armes.

**Le tableau `armes` ne bouge donc pas du tout** : aucun index ne se décale,
`boss_5` / `sans_chute` / `kills500` sont intacts, **zéro risque de migration**.
Le pic de puissance repose entièrement sur la chaîne `family`/`tier`, qui fait
diverger les builds dès le niveau 1.

**Audit obligatoire :** lister toutes les cartes qui bonifient une arme
spécifique et vérifier qu'aucune n'échappe au filtre.

### D4 · `Brume` : implémenter, retexter, ou retirer ? — **lot E-6**
Le texte promet « les bords de l'arène se ferment » ; rien ne les ferme.
- **(a)** implémenter le resserrement (cohérent avec la constriction du Ravageur,
  qui sait déjà resserrer les `bounds`) — le plus coûteux et le plus fidèle ;
- **(b)** retexter en « on ne voit plus venir » — coût : une chaîne ;
- **(c)** la retirer — il ne resterait que deux météos.

**TRANCHÉE : (b).** Retexter en « brume dense — on ne voit plus venir ». Une
gêne visuelle honnête vaut mieux qu'une mécanique promise. (a) reste ouvert pour
un plan ultérieur.

### D5 · Renommer « météo » en « conditions » ? — **lot E-6** · décision d'équipe
Le mot convient à bourrasque et cendres, mal à un système réservé à un mode et
qui ne fait rien de mécanique dans un cas sur trois. `WX_*` peut rester tel quel
en interne (comme `segment` que le joueur lit « Crise »).
**TRANCHÉE : renommer à l'affichage, garder `WX_*` en interne** — même motif que
`segment` que le joueur lit « Crise ». À confirmer avec ton collègue : c'est le
seul point du plan qui ne touche pas au code et peut se rediscuter sans coût.

### D6 · `appel_du_vide` : on l'écrit ? — **lot E-7**
La carte qui augmente la densité pour toute la table contre des éclats.
**TRANCHÉE : non**, la carte n'est pas écrite dans ce plan. `Dette` est la seule
carte qui engage le groupe et c'est une exception assumée ; à deux, ce n'est plus
une exception, c'est un motif. À reprendre une fois `Dette` remesurée.

### D7 · Assouplir la cible de TTK de 0,50 à 0,60 s ? — **lot C**
**Ce que ça engage :** on modifie un critère d'acceptation qu'on s'était donné.
**TRANCHÉE : oui, 0,15-0,60 s.** Le critère à 0,50 n'a jamais été tenu ;
prétendre l'atteindre du premier coup ferait sur-corriger la rampe de PV et
rendrait la fin de manche molle. Resserrable à 0,50 dans un plan ultérieur.

### D8 · Élargir la méta par le qualitatif ? — **lot G-2** ⚠ structurante
**Le constat :** la méta complète vaut **×1,45** au bout de ~135 parties, quand
une manche donne ×4 à ×5 par ses seules cartes. Elle pèse un dixième d'une
partie. Si l'intention est « les améliorations permanentes finissent par ouvrir
la fin », elle est sous-dimensionnée pour ce rôle.
**Ma recommandation :** élargir par le **qualitatif** et non par le pourcentage —
une ligne `sursis` (relèvement automatique au palier 5), deux entrées `CONFORT` de
plus (bannissement, seconde relance), et un **tronc commun** partagé entre les
classes. Monter les pourcentages rendrait le compte complet trivial sans rien
changer au compte neuf.
**TRANCHÉE : oui, par le qualitatif.** Ligne `sursis`, deux entrées `CONFORT` de
plus, tronc commun (D10).

**Et le budget entièrement redérivé à rebours de la matrice D9**, parce que
l'ancien ne la produisait pas : la matrice demande 5 % → 50 % de réussite en
`normal` entre P0 et P1, quand l'arbre n'offrait que ×1,25 de puissance. **Un
multiplicateur de 1,25 ne fait pas ça.**

Le saut P0 → P1 se paie donc en **qualitatif** (`CONFORT` porté à 5 entrées,
ligne `SECOURS` avec relèvement automatique au palier 5) et le saut P1 → P2 en
**pourcentages**. Quatre familles de coûts remplacent la grille unique — voir le
tableau complet du lot G-2. Total pour un compte complet : **26 600 noyaux**,
soit P1 à **30 parties** et P2 à **63**, contre 135 auparavant.

⚠ **La décision du plan la plus dépendante d'une hypothèse non vérifiée** : le
nombre de parties que joue réellement votre public, et le revenu réel par manche
(mesure M4). À revoir en premier après les premiers retours.

### D9 · La matrice de cohérence — **TRANCHÉE** ⚠ structurante
**Décision :** la matrice médiane, exprimée en **taux de réussite** et non en
« segment atteint » — seule forme qui capture le « si » de l'intention (*calme
doit être terminable par un bon joueur, sans noyaux, **s'il** a un bon build*).

| | calme | normal | cauchemar |
|---|---|---|---|
| **P0** compte neuf | **20-30 %** | 5 % | ~0 % |
| **P1** ~30 parties | 70 % | **45-60 %** | 5-10 % |
| **P2** compte complet | 90 % | 75 % | **25-35 %** |

- **calme** ne demande aucune méta, mais demande de bien jouer **et** d'avoir un
  bon build. Au-dessus de 40 %, la progression permanente perd sa raison d'être ;
  sous 15 %, un débutant ne voit jamais la fin de rien ;
- **normal** est le mode où les améliorations deviennent nécessaires ;
- **cauchemar** reste le vrai défi **même à P2** : la méta ouvre la porte, elle ne
  garantit pas la victoire.

C'est le critère de clôture du plan — voir `PROFILS.md`.

### D10 · Le cloisonnement de l'arbre par classe — **lot G-2**
41 400 noyaux par classe, ~400 parties pour les trois. Dans un jeu coopératif où
l'on change de rôle selon la table, c'est une taxe sur la polyvalence.
**TRANCHÉE : trois lignes de tronc commun** (PV, vitesse, portée de ramassage)
achetées une fois pour toutes les classes ; les lignes spécifiques restent
cloisonnées. Distinction boutique globale / traits par personnage de Halls of
Torment.

### D11 · Indexer les PV de boss sur la minute ? — **lot H-1**
**Le constat :** `BOSS_GROWTH = 0,06` par boss donne ×1,30 sur la manche, quand
la puissance joueur fait ×2,6. **Le sixième boss est deux fois plus facile que le
premier**, et la horde, elle, rampe bien sur la minute — les deux moitiés du
contenu ne suivent pas le même axe.
**Ma recommandation : oui**, `BOSS_HP_MINUTE_RAMP = 0,055`, avec `BOSS_HP_BASE`
recalibrée d'autant. C'est le défaut exact que le lot D corrige pour l'XP, et le
même remède : un axe extérieur plutôt qu'un compteur dépendant du parcours.
**TRANCHÉE : oui**, `BOSS_HP_MINUTE_RAMP: 0,055`, `BOSS_GROWTH: 0`, avec
`BOSS_HP_BASE` recalibrée pour que le premier boss ne change pas.

### D12 · Périmètre d'écriture des cartes/reliques : tout d'un coup, ou par vagues ? — **lots E et F**
19 cartes et 14 reliques, c'est beaucoup à équilibrer simultanément.
**Ma recommandation :** trois vagues.
1. **E-1** (conditionnement) + **E-2** (retrait de `scoreMul`) — aucune carte
   neuve, correction pure ;
2. les axes **coop** (6 cartes) et **boss** (3) — les deux plus gros trous ;
3. le reste (environnement, entrave, événements, récolte, esquive) + les reliques.

**TRANCHÉE : trois vagues**, avec une mesure entre chacune. Vingt cartes neuves
d'un coup rendent impossible d'attribuer un déséquilibre à sa cause. Les vagues 2
et 3 sont les deux seuls endroits du plan où l'exécution s'interrompt
volontairement.

### D13 · Le corps des ennemis comme obstacle mobile — **lot B**
Trouvé en repassant le test de couverture (voir `PERIMETRE.md`).
`verifierBiomes()` garantit un passage entre les obstacles **statiques** ; rien
ne garantit qu'il en existe un entre les **corps**, qui se repoussent entre eux
et forment un mur mobile. À 622 (lot A), personne ne sait si ce mur reste
franchissable.
**Ce n'est pas vraiment une décision** — c'est un critère d'acceptation
supplémentaire du lot B (temps de sortie d'un encerclement, à plafond plein), déjà
ajouté à sa liste. Il figure ici parce qu'il **conditionne la clôture de D2** : la
doctrine des 90 % ne veut rien dire si le joueur ne peut de toute façon pas
avancer dans la direction où il fuit.

### D14 · Contre quelle vitesse mesure-t-on la doctrine des 90 % ? — **lots B et I** ⚠ structurante
**Le constat :** le Rempart (tank) a `speedMul 0,92`, soit 239 px/s. Un runner à
234 px/s à la minute 30 (lot B) est à **98 % de sa vitesse** : la garantie de
fuite ne le couvre pas, alors qu'il est la classe la plus jouée par les débutants
et que le critère visait justement le profil P0.

| classe | vitesse | runner min. 30 | couvert ? |
|---|---|---|---|
| Rempart | 239 | 234 = 98 % | ✘ |
| Soigneur | 260 | 234 = 90 % | ✔ |
| Tireur | 270 | 234 = 87 % | ✔ |

- **(a)** mesurer contre la classe la plus lente → runner de base à **159 px/s** —
  le plus protecteur, le plus coûteux pour la menace du runner ;
- **(b)** mesurer contre la classe **médiane** et assumer que le tank ne fuit
  pas — c'est un tank, il a 150 PV, une provocation invulnérable et un rempart ;
- **(c)** relever `speedMul` du tank à 1,00 et lui retirer de la puissance ailleurs.

**TRANCHÉE : (b) — la classe médiane.** Un tank est plus lent, mais il a des
options de défense, et c'est aux autres joueurs de l'aider. Écrit explicitement
dans la doctrine du lot B, et non laissé implicite : une garantie avec une
exception non écrite est une garantie fausse. Le runner reste à **196 px/s**.

⚠ **Sous-vérification portée par le lot I : le tank SOLO.** Le raisonnement est
coopératif, et il est juste à 2, 3 et 4. En solo, personne n'aide. Critère : un
Rempart solo à P0 doit atteindre 20-30 % en `calme` comme les autres classes ;
si non, le correctif porte sur ses **compétences**, jamais sur `speedMul`.

### D15 · Le taux de tirage `RELIC_WEIGHT` — **lot F**
`[50, 28, 15, 4]`, plus plat que celui des cartes (`[60, 28, 10, 1]`), posé sans
mesure — c'est une intention (« voir une épique sans pouvoir se la payer est une
décision, pas une frustration »), pas un calcul.
**TRANCHÉE : `[50, 28, 15, 4]`**, à ajuster en test — c'est un poids, pas une
structure de données, il se change sans rien réécrire.

---

## 2. Mesures bloquantes — à faire, pas à décider

### M1 · Le plafond réel de la grille spatiale — bloque **A**
`MAX_ENEMIES_HARD_CAP: 900` est une valeur d'intention. Elle se constate au
profileur, sur la machine de référence, à plafond plein. C'est la seule valeur du
plan qu'on règle en regardant un profileur et non une partie.

### M2 · `BOSS_POWER_REF` remesuré — bloque **C**
Bot invulnérable, manche complète, `_playerPower()` relevé à la mort de chaque
boss, médiane sur 6 manches par effectif. La valeur actuelle (2,36) date d'un
modèle à ~13 cartes ; le lot X en distribue 26.

### M3 · `LEVEL_XP_BASE` rebalayé — bloque **D**
Ne peut se faire qu'après C : le TTK pilote le débit de kills, donc le débit
d'XP. Le balayage devient possible **parce que** D rend la courbe déterministe.

### M4 · La distribution de niveaux post-D — bloque **G-1**
G-1 ne se tranche pas, il se constate. Rejouer le calcul de `coresForRun` avec la
distribution réelle.

### M5 · Le net du plan sur P0 — bloque la clôture du plan
Les lots A à C se compensent : A ajoute des ennemis, B et C en retirent la
vitesse et les PV. **Le net sur un compte neuf n'est écrit nulle part.**

> **P0 en normal ne doit pas reculer.** S'il atteignait le segment 3 avant le plan
> et le segment 2 après, le plan a échoué même si tous les critères individuels
> des lots A, B et C sont verts.

C'est le seul critère qui porte sur l'**ensemble** plutôt que sur un lot, et il
protège du piège le plus banal d'un chantier d'équilibrage : dix lots corrects
dont la somme est mauvaise.

### M6 · Le relevé des traits — bloque **J**, et conditionne la clôture de A et C
Proportion de la horde porteuse d'au moins un trait, par minute et par
difficulté, **une fois le plafond du lot A appliqué**. C'est le chiffre qui dit
si le levier « comportement » invoqué par A et C existe réellement ou si c'est
une intention non tenue.

### M7 · Les matrices de classes — bloque **I**
Survie par classe (3 difficultés × 4 effectifs × 3 profils) et valeur des quatre
compositions plausibles à quatre joueurs (4 tireurs / 3+1 tank / 2+1+1 / 2+2).
Sans elles, on ignore si le système de classes est structurant ou décoratif en
coopératif — question que D14 laisse ouverte tant qu'elle n'est pas répondue.

---

## 3. Déjà tranché — résolu par lecture du code, pas par choix

| question | réponse | conséquence |
|---|---|---|
| `PLAYER_HIT_CD` par joueur ou par couple ? | **par joueur** (`p.hitCd`) | la foule ne multiplie pas les dégâts → dans le lot B, **la vitesse est le levier principal**, la baisse de dégâts n'est qu'un réglage de confort |
| Ajouter une légendaire casse-t-il les affectations de boss ? | **non si append-only** | règle d'insertion écrite en E-1 ; `Phalange` va en fin de `CARDS` |
| `Bourse` vs `Sourcier` (doublon éclats) | `Sourcier` **retirée** | 19 cartes et non 20 |
| `Œil du cyclone` et `Cœur de tempête` | **retirées** — météo cauchemar-only | remplacées par `Terrain conquis` et `Terre brûlée`, adossées aux hasards |
| `hordeMinutes()` disponible pour la courbe d'XP ? | **oui**, déjà utilisée par `_spawnEnemy` | lot D sans dépendance cachée |
| La horde continue-t-elle pendant un combat de boss ? | **non**, elle est suspendue, et le terrain est balayé à l'arrivée | les renforts sont **toute** la pression du combat → `BOSS_ADD_CAP` est un réglage de densité, pas un détail |
| Les renforts de boss sont-ils touchés par le lot B ? | **oui** — ce sont des runners | les combats deviennent plus lisibles sans toucher `bosses.js` ; à mesurer avant de conclure sur H-2 |
| La vitesse des boss viole-t-elle la doctrine du lot B ? | **non** — `BOSS_SPEED = 44`, soit 17 % de `PLAYER_SPEED` | rien à faire |
| La difficulté compense-t-elle la progression de compte ? | **non, par construction** — `_playerPower` lit `powerMods` (cartes + classe), la méta est appliquée en aval | la méta est de la puissance **pure et non taxée** : l'architecture soutient déjà l'intention, seule la magnitude est à revoir |

---

## 4. Non bloquant — à trancher plus tard, volontairement

- **Qualité de l'offre du marchand par segment** (lot F). Correctif possible si
  « sauter les deux premiers marchands » s'avère dominant. Posé d'avance, il
  masquerait le vrai problème.
- **Les dégâts de contact appliquent ceux du premier ennemi rencontré dans la
  boucle**, pas du plus dangereux (lot B). Défaut de lisibilité, pas
  d'équilibrage — hors périmètre, à traiter séparément.
- **Genou du plafonnement additif sur `damageMul`** (lot E-4). À mesurer ; n'a de
  conséquence que si l'on décide ensuite de vider le pool de communes plus tôt.
- **D15** (poids de tirage des reliques) — voir plus haut, réglable en test.

---

## 5. Exécutable dès maintenant, sans aucune décision

Trois chantiers ne dépendent d'aucun arbitrage et corrigent des défauts avérés :

1. **E-1, filtre `requires`** — `Surcharge orbitale` tombe aujourd'hui chez des
   joueurs sans lame orbitale. C'est un défaut existant, indépendamment de toute
   carte neuve.
2. **E-1, garde-fou de pool** — le compteur qui journalise quand une rareté
   descend sous 6 cartes éligibles. Pure prévention, aucun effet de jeu.
3. **F, renommage `REROLL_WAVE` → `REROLL_LEVEL`** — la fonction reçoit déjà le
   niveau ; seuls le nom et le commentaire mentent.

Et deux vérifications à lancer en parallèle, puisqu'elles conditionnent la suite :
le **profilage de la grille spatiale** (M1) et la **remesure de
`BOSS_POWER_REF`** (M2).

---

## Ce qui reste ouvert après ce document

**Rien côté décision.** Les quinze sont arrêtées, l'exécution peut enchaîner les
dix lots.

**Deux points à revoir en premier après les premiers retours**, non parce qu'ils
sont indécis mais parce qu'ils reposent sur une hypothèse plutôt que sur une
mesure :

1. **La compression de `TIER_COSTS` (D8)** — elle suppose un public qui joue une
   cinquantaine de parties. Si vos sessions LAN sont plus courtes, il faut
   comprimer davantage ; si le jeu se joue au long cours, moins.
2. **Les taux de la matrice (D9)** — 20-30 % en `calme` à P0 est une cible, pas
   une mesure. C'est le premier chiffre à confronter au réel.

**Et les sept mesures**, qui ne sont pas des décisions : elles produisent les
valeurs que les lots portent aujourd'hui en estimation.
