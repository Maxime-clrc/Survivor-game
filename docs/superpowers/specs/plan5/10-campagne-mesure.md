# Lot X — Campagne de mesure et recalibrage

Dépend de tous les lots précédents.

---

## X0. Ce que le lot a déjà livré *(première passe)*

Le lot devait être une campagne de mesure. Le porteur du projet a tranché quatre
points de conception avant qu'elle ne commence, et ils sont livrés : les mesurer
d'abord aurait mesuré un jeu qu'on ne voulait plus.

| # | décision | conséquence |
|---|---|---|
| **X-a** | **Un niveau ouvre son écran de cartes** | la file ne subsiste que pendant un combat de boss, où l'on ne coupe pas |
| **X-b** | **La carte garantie par boss disparaît** ; après un boss : cartes en attente **puis** reliques | le boss reste un point d'étape par la *qualité* du tirage et par le marchand |
| **X-c** | **`LEVEL_XP_BASE` : 6000 → 1800**, mesuré | 11 → 24 cartes par manche ; un niveau par minute sur les neuf premières |
| **X-d** | **Les accalmies sont retirées** ; les six étapes portent un **nom** | la prémisse — écran fixe, pas de caméra — est fausse depuis le lot I |

**Correctif trouvé en chemin, et il vaut d'être écrit** : le marchand de reliques
ne s'ouvrait **plus du tout** depuis le lot P. `openMerchant()` était appelé
depuis `_endWave`, supprimé avec les vagues ; aucune ligne n'était fausse,
l'appelant avait simplement disparu. L'enchaînement des écrans passe désormais
par un point unique, `openNextScreen()`.

Trois conséquences pour la campagne qui suit :

- les **critères 6 à 15** (progression) sont à relever contre la nouvelle courbe,
  pas contre celle des lots P à W ;
- le **critère 3** (population au fond d'un silence) **n'a plus d'objet** : il
  disparaît de la table, il n'est pas « échoué » ;
- la **différenciation des modes** (critères 26 à 31) devient plus fragile : la
  variante de script ne porte plus que la géométrie. Voir X10.

Premières mesures, dispositif de X1 (bot invulnérable, boss expédié au crédit
exact de `BOSS_XP_K`, 1800 s de horde, biome `usine`, compte neuf) :

| | avant lot X | après |
|---|---|---|
| cartes / joueur, solo normal | 11 | **24 à 26** |
| niveau à la minute 30 | 8 | **25 à 27** |
| population moyenne, solo normal | 123 | **106** |
| part du temps au plafond de 200 | 41 % | **25 %** |

La baisse de population est **contre-intuitive et expliquée** : les cartes
arrivent deux fois plus vite, donc l'équipe tue plus. Ce n'est pas un effet du
débit.

**Ce n'est pas une formalité, c'est le lot qui décide si l'ensemble tient.** Toutes les
valeurs des lots P à W sont des **points de départ dérivés des mesures existantes**, pas des
réglages validés. Le dépôt a une règle et elle s'applique ici plus qu'ailleurs :

> Mesurer, ne pas extrapoler. *« Plusieurs ajustements de cette base de code se sont révélés
> contre-intuitifs à la mesure : un buff de dégâts qui divise par trois la durée d'un combat
> de boss, des élites en probabilité dont le nombre explose en fin de manche. »*

---

## X1. Le protocole

Inchangé dans sa forme, et c'est le point : la logique reste **pure**, donc tout se mesure en
important les modules dans un script jetable. 600 s de jeu se simulent en ~1 s de CPU, une
campagne complète est bon marché.

```js
import { GameState, CFG } from "file:///d:/wamp64/www/Survivor-game/shared/game_state.js";
import { SCRIPTS } from "file:///d:/wamp64/www/Survivor-game/shared/timeline.js";

const g = new GameState(1, { script: "A", biome: "usine" });  // 0 calme, 1 normal, 2 cauchemar
g.addPlayer(1, "bot", 0);
// 1800 s de horde + boss, releve par minute :
//   niveau, population, PV detruits, cartes prises, degats subis par provenance
```

Les méthodes préfixées `_` restent appelables depuis un test — `_segmentTick`, `_spawner`,
`_killEnemy`, `_bossBreak`, `_zoneHits` — *« elles isolent une mécanique sans avoir à jouer une
manche entière »*.

### Chaque mesure porte cinq champs

| champ | valeurs |
|---|---|
| profil de compte | **neuf** (aucune amélioration) / **maximal** (tous emplacements remplis) |
| difficulté | calme / normal / cauchemar |
| variante de script | A / B / C |
| biome | usine / fonderie / friche |
| effectif | 1 / 2 / 3 / 4 |

Trois de ces champs sont **nouveaux** (variante, biome, difficulté comme axe à part entière et
non comme facteur d'échelle). Sans eux les chiffres ne se comparent plus, et une mesure
incomparable n'apprend rien.

L'espace complet fait 2 × 3 × 3 × 3 × 4 = **216 configurations**, ce qui est trop. Plan
d'échantillonnage :

- **grille complète** sur (difficulté × effectif) = 12, en compte neuf, variante A, biome
  usine, cinq essais chacune. C'est la mesure de référence.
- **balayage d'un axe à la fois** ensuite : les trois variantes à normal / 2 joueurs, les trois
  biomes à cauchemar / 2 joueurs, le compte maximal à normal / 1 et 4 joueurs.

L'écart mesuré sur un axe balayé sert à décider s'il mérite la grille complète.

---

## X2. Le tableau des critères d'acceptation

Consolidé depuis les lots P à W. **C'est la table qui décide de la livraison.**

### Rythme et durée

| # | critère | cible | lot |
|---|---|---|---|
| 1 | durée totale, normal, build médiane | 1800 s de horde + 6 à 9 min de boss | P |
| 2 | population moyenne, normal, 4 joueurs | **90 à 140** | P |
| 3 | ~~population au fond de chaque silence~~ | **sans objet** — les accalmies sont retirées (X-d) | — |
| 4 | temps consécutif à `MAX_ENEMIES` avant le segment 5 | **< 30 s** (normal), **< 60 s** (cauchemar) | P, T |
| 4b | **part du temps passée au plafond de `MAX_ENEMIES`**, toute la manche | **< 10 %** — relevé à 25 % après X-d, voir X10 | X |
| 5 | reproductibilité, même variante / biome / mode / effectif | débit et composition **identiques minute par minute** | P |

### Progression — les chiffres qui portent la thèse

| # | critère | cible | lot |
|---|---|---|---|
| 6 | niveau à la minute 30, build médiane, compte neuf | **22 à 26** | Q |
| 7 | **écart de niveau p90/p10 à la minute 30** | **≥ 3 niveaux** | Q |
| 8 | … et borné | **≤ 7 niveaux** | Q |
| 9 | niveau plancher, build défensive malchanceuse | **≥ 14** | Q |
| 10 | cartes obtenues | **24 à 26**, dont 6 de boss | Q |
| 11 | légendaires par joueur et par manche | **1 à 2**, plafond dur respecté | Q |
| 12 | cartes distinctes proposées sur une manche | **≥ 40** | Q |
| 13 | part d'expérience venant des boss | **< 25 %** | Q |
| 14 | parité d'effectif, cartes obtenues à 1 et à 4 joueurs | **±10 %** | Q |
| 15 | écart de cartes, table avec soigneur vs sans | **≤ 2 cartes** | Q |

Les critères **7 et 8** sont la raison d'être de ce plan. Le 7 est le défaut à corriger — il
est proche de zéro aujourd'hui. Le 8 est sa borne : au-delà, l'équipe faible n'atteint jamais
le jalon de légendaire à 22 et le système perd sa pointe.

### Pression et boss

| # | critère | cible | lot |
|---|---|---|---|
| 16 | temps de mise à mort d'un grunt, build médiane | **0,15 à 0,50 s** du début à la fin | R |
| 17 | durée d'un boss, builds 1,26 → 5,71 | 131 s → 29 s, **jamais sous 40 s** | R |
| 18 | répertoire de boss effectivement joué | **100 %** des mécaniques débloquées | R |
| 19 | combats atteignant l'enrage, build médiane | **< 5 %** | R |
| 20 | combats atteignant l'enrage, build défensive malchanceuse | **20 à 50 %** | R |
| 21 | écart lit / ignore les annonces, par boss | **> 40 %** | R, W |
| 22 | taux d'échec par mécanique, au premier contact | **aucune au-dessus de 60 %** | R, W |
| 23 | une mécanique ratée tue-t-elle un joueur à pleine vie | **jamais**, y compris enrage actif en cauchemar avec trois cumuls | R |
| 24 | durée du boss final, build médiane | **~155 s**, jamais sous **80 s** | W |
| 25 | écart lit / ignore, Oracle et Jumeaux **en solo** | **> 40 %** ; sinon renverser la décision W2 | W |

### Différenciation des modes

| # | critère | cible | lot |
|---|---|---|---|
| 26 | segment atteint, build médiane | calme **6**, normal **5-6**, cauchemar **4-5** | T |
| 27 | écart de survie calme → cauchemar | facteur **1,5 à 2,5** | T |
| 28 | part des dégâts subis venant de la zone, cauchemar | **nettement supérieure** à normal | T, V |
| 29 | part des dégâts subis venant de l'environnement | **0 %** en normal, **10 à 20 %** en cauchemar | V |
| 30 | part des dégâts venant du contact | **baisse** de calme à cauchemar | T |
| 31 | écart de survie entre les trois biomes, même mode | **≤ 20 %** | V |

### Survie — le risque principal

| # | critère | cible | lot |
|---|---|---|---|
| 32 | segment atteint par la survie médiane | **au moins le segment 4** | X |
| 33 | écart compte neuf / compte maximal | **< 1,5 segment** | X |

### Coût

| # | critère | cible | lot |
|---|---|---|---|
| 34 | CPU par tick, population 200 soutenue, cauchemar, 4 joueurs | moyenne **< 1 ms**, p99 **< 8 ms** (budget 16,7) | P, S, V |
| 35 | CPU / 600 s, six combats enchaînés | **< 3 s** | W |
| 36 | poids d'instantané, pire cas | hausse **< 10 %** vs référence actuelle | P |
| 37 | bande passante par joueur, pire cas | **< 160 Ko/s** | P |
| 38 | appels de dessin, `?perf`, tous dangers actifs | **2 à 4** | V |
| 39 | surface couverte par les dangers actifs, cauchemar | **≤ 12 %** à tout instant | V |

### Compatibilité

| # | critère | cible | lot |
|---|---|---|---|
| 40 | un client d'avant le plan reste jouable | clés inconnues ignorées, aucun champ déplacé, aucune insertion au milieu d'un tableau ordonné | tous |
| 41 | une ligne de compte en version antérieure | **gelée**, ni adoptée ni réécrite | Q |

---

## X3. Le critère 34 est le seul sans précédent rassurant

L'évitement mutuel des ennemis est en **O(n²)** et la population moyenne passe d'environ 50 à
120 — soit environ **six fois plus** de tests sur ce poste.

Références existantes : *« sans aucune carte 0,07 ms de moyenne, 1,9 ms au p99 ; toutes les
cartes lourdes prises 0,35 ms et 6,3 ms »*, sur un budget de 16,7 ms. Et
*« l'évitement entre ennemis reste en O(n²). À 180 c'est négligeable ; au-delà de 400, il
faudrait une grille spatiale. »*

Le repli est connu et il ne se décide qu'à la mesure : **une grille spatiale**, qui ferait
tomber au passage l'évitement ennemi / joueur, lui aussi en O(joueurs × ennemis).

Ne pas l'écrire d'avance. La mesure du critère 34 tranchera, et si elle passe, cette
complexité n'a pas à exister.

---

## X4. L'économie de récupération — le lot dans le lot

**C'est le risque principal du plan, et il est chiffré.**

La survie mesurée aujourd'hui va de **162 s à 445 s** selon la composition. L'objectif est
**1800 s de horde plus six combats de boss**, soit un facteur **4 à 11**.

Le dépôt a déjà mesuré que les deux leviers évidents **ne marchent pas** :

- *« donner plus de cartes ne rallonge pas la survie — à 22 cartes par manche au lieu de 4, la
  survie ne bouge pas. Les morts viennent des dégâts subis, et un joueur qui choisit ses
  cartes en prend majoritairement des offensives. »*
- *« Réduire la pression des vagues ne marche pas davantage : −55 % sur les PV, le débit et le
  budget ne change rien à la vague atteinte. »*

Ce qui a marché, une fois : **ajouter une source de récupération** (`WAVE_HEAL: 18`), avec la
conclusion écrite noir sur blanc — *« un répit qui ne rend rien n'est pas un répit, c'est un
compte à rebours »*.

Or le lot P **supprime `WAVE_HEAL`** : il n'y a plus de fin de vague.

### La table des sources

| source | quantité | fréquence sur la manche | lot |
|---|---|---|---|
| mort de boss | **100 % des PV, du bouclier, et relèvement** | 6 | Q, W |
| réussite d'un événement | **100 % des PV, du bouclier, et relèvement** | ~6 | U |
| ~~silence~~ | ~~un bonus au sol forcé~~ | **supprimée** par X-d | — |
| bonus de soin au sol | `HEAL_AMOUNT: 45` | toutes les 18-26 s, 2 au sol maximum | existant |
| classe soigneur, cartes défensives, vol de vie | continu | — | existant |

Somme des sources **garanties** : environ **douze remises à plein sur trente-sept minutes**,
soit une toutes les trois minutes.

**C'est un point de départ à mesurer, pas une conclusion.**

### La règle de correction

Si le critère 32 échoue — la survie médiane n'atteint pas le segment 4 — la correction se
cherche **dans cette table**, et **pas dans le débit**. La mesure existante dit que le débit
n'est pas le levier, et refaire cette erreur coûterait une campagne entière.

Ordre des leviers, du moins au plus intrusif :

1. **fréquence des bonus au sol** (`POWERUP_MIN` / `POWERUP_MAX`, aujourd'hui 18-26 s) — le
   plus fin, le dépôt a déjà mesuré l'effet de son doublement, et c'est désormais le
   **seul** réglage de cadence des bonus depuis que le bonus forcé des accalmies a disparu ;
2. ~~nombre de silences par segment~~ — **plus disponible** (X-d). À la place :
   les écrans de cartes, deux fois plus nombreux depuis X-c, arrêtent la
   simulation et rendent une fenêtre de repositionnement — mais **ils ne rendent
   aucun PV**, et c'est précisément ce que cette table mesure ;
3. **remise à plein partielle** à mi-segment, comme un mini-événement ;
4. **relever `HEAL_AMOUNT`** ;
5. en dernier recours seulement, **le résidu `dmg`** du profil de difficulté.

---

## X10. L'effectif : la population et la courbe d'expérience, ensemble

**C'est la mesure la plus importante de la campagne, et les deux moitiés ne se
règlent pas séparément.**

> **L'hypothèse de cette section a été RÉFUTÉE par la campagne, et le passage est
> conservé tel quel — le dépôt garde ses raisonnements morts.** On y lisait
> « à quatre joueurs le débit triple, le plafond ne bouge pas, donc le plafond
> mord d'autant plus tôt », avec un relevé partiel (11 % en solo, 19 % à quatre)
> qui semblait le confirmer. La grille complète dit l'inverse : la saturation
> **ne suit pas l'effectif**, elle suit le **rapport entre le débit et ce que
> l'équipe tue**. En calme elle tombe de 29 % en solo à 3,4 % à quatre ; en
> normal elle monte de 32 % à 56 %. Un plafond indexé sur l'effectif aurait donc
> aggravé le seul cas où il n'y a pas de problème. Voir X11 pour la lecture
> correcte et la décision.

### Ce qui existe déjà

Un seul exposant porte les deux, et c'est délibéré : `WAVE_CROWD_EXP = 0,75`
multiplie le débit du script (`joueurs^0,75`) et **divise** le gain
d'expérience par la même quantité. Une table de quatre voit donc 2,8 fois plus
d'ennemis qu'un solo et paie ses paliers 2,8 fois plus cher : le rythme des
cartes est censé être identique à tout effectif. C'est ce que le critère 14
vérifie, et il passe (26 / 22 / 24 cartes à 1, 2 et 4 joueurs après X-c, sous
l'écart-type de six cartes du dispositif).

**Ne jamais les régler séparément.** Un exposant sur le débit sans son jumeau sur
l'expérience donne à la grande table plus de cartes pour la même horde, ou moins
de cartes pour une horde plus dense — dans les deux cas la parité mesurée depuis
`plan4` est perdue, et elle est la seule raison pour laquelle une partie à un et
à quatre joueurs se comparent encore.

### Ce qui ne va pas

`MAX_ENEMIES` est un **plafond global** que l'effectif ne touche pas. La
conséquence se mesure : à quatre joueurs le débit triple, le plafond ne bouge
pas, donc **le plafond mord d'autant plus tôt** — et passé lui, la difficulté
cesse d'augmenter au moment précis où l'équipe est en train de perdre. Relevé
après X-d, sur 1800 s : **11 %** du temps au plafond en solo, **19 %** à quatre,
**36 %** à deux (le point à deux est le plus mauvais, ce qui demande à être
confirmé avant d'être expliqué).

Un plafond atteint un quart de la manche n'est plus un garde-fou : c'est le
régime nominal de la seconde moitié du script, et il rend les débits des beats 4
et 5 des segments 5 et 6 purement décoratifs.

### Les trois options, et laquelle mesurer d'abord

1. **Plafond indexé sur l'effectif** — `MAX_ENEMIES` devient
   `BASE × joueurs^k`. C'est la correction directe, et `k` doit être **le même
   0,75** que le débit, sinon on rouvre l'écart qu'on vient de fermer. Coût : le
   O(n²) de l'évitement mutuel, qui est exactement le critère 34 — c'est
   pourquoi les deux se mesurent dans la même passe.
2. **Débit rabaissé en fin de script** — moins intrusif, mais le dépôt a déjà
   mesuré que le débit n'est pas le levier de la survie, et ça ne corrigerait
   que le symptôme visible.
3. **Rien, et on assume le plafond** — défendable seulement si la mesure montre
   que l'équipe médiane n'y arrive jamais. À 25 % du temps en solo, ce n'est pas
   le cas.

Mesurer 1 en premier, avec le critère 34 **dans la même passe** : c'est la seule
option qui puisse échouer pour une raison technique, et si elle échoue les deux
autres restent.

### Critères ajoutés

| # | critère | cible |
|---|---|---|
| 42 | part du temps au plafond, par effectif (1 / 2 / 3 / 4) | **< 10 %** partout, et **pas d'écart > 2×** entre effectifs |
| 43 | cartes par joueur, 1 → 4 joueurs, à courbe et plafond figés | **±10 %** (c'est le 14, relevé après toute retouche de `WAVE_CROWD_EXP` ou de `MAX_ENEMIES`) |
| 44 | CPU par tick au nouveau plafond, 4 joueurs, cauchemar | moyenne **< 1 ms**, p99 **< 8 ms** — le 34, sur la population réellement atteinte |

**Règle** : toute retouche de `MAX_ENEMIES` ou de `WAVE_CROWD_EXP` relève les
trois d'un coup. Ce sont trois vues d'un même réglage, pas trois réglages.

---

## X5. Le coût d'un échec tardif

Une équipe qui meurt à la minute 26 perd vingt-six minutes. C'est une punition d'un ordre de
grandeur supérieur à celle du modèle actuel, et elle décidera de la **rejouabilité réelle**
bien plus que le contenu.

Trois mesures minimales, sans nouveau système :

- **les noyaux sont payés au segment franchi.** `coresPartial` existe déjà et fait exactement
  ce calcul (*« les vagues jouées, rien d'autre — ni boss ni jalons, qui se constatent à la
  fin »*) ; il change simplement d'unité au lot Q ;
- **l'écran de fin nomme le segment atteint**, pas le numéro de manche. Le dépôt a déjà fait ce
  choix une fois, pour la même raison : *« "Manche 1 terminée" après douze vagues se lit comme
  un compteur cassé »* ;
- **le classement enregistre le segment**, ce qui donne un objectif intermédiaire à une équipe
  qui ne finira pas.

À relever pendant la campagne : **le segment de la mort**, en distribution et pas seulement en
médiane. Une distribution bimodale (on meurt au segment 1 ou on finit) dirait que la difficulté
n'a pas de pente ; une distribution plate dirait que rien ne fait mur.

---

## X6. Rejouabilité — les cinq sources et leur poids

Le brief demande de *« conserver une forte rejouabilité malgré une progression entièrement
scriptée »*. Par ordre d'importance **mesurée** :

| # | source | poids |
|---|---|---|
| 1 | **les cartes** | **×4,54** d'écart de build mesuré, dont **×2,93 par la chance seule** ; 31 à 55 cartes distinctes par manche |
| 2 | **l'ordre des boss** | cinq tirés sans répétition sur cinq segments = **120 permutations**, et le combat du segment 3 — le point bas — n'est jamais le même |
| 3 | **les variantes de campagne** | trois scripts par difficulté (A / B / C), tirés au lancement, **nommés et affichés** |
| 4 | **le biome** | trois, tirés au lancement |
| 5 | **la méta** | cartes déverrouillées, lignes équipées, emplacements |

Aucun script ne produira jamais autant de variance que la source 1. C'est important à dire :
la rejouabilité de ce jeu **ne dépend pas** du hasard de la chronologie, et c'est précisément
ce qui permet de la fixer.

### Les variantes de campagne résolvent la tension du brief

On ne randomise pas le script — cela casserait la comparabilité et le classement. **On en a
plusieurs.** Déterministe dans une partie, différent d'une partie à l'autre, et le joueur sait
laquelle il joue.

### Conséquence obligatoire sur le classement

Un temps n'est comparable qu'à **variante, biome, difficulté et effectif égaux**. Le score
enregistré porte ces quatre champs (lot W §W7). Sans eux, le classement compare des parties
différentes — exactement le défaut que `plan4/L3` avait identifié pour les vagues spéciales
aléatoires, et que `plan4/N8` avait confirmé comme rédhibitoire.

**Et sous D1, « le temps pour atteindre le boss final » est constant** : les seuls records qui
ont un sens sont le **temps de mise à mort du boss final** et le **niveau atteint**.

---

## X7. Contrôles manuels

Ce qui ne se mesure pas en script jetable.

```bash
node --check server.js && node --check room.js && node --check hub.js
for f in shared/*.js public/*.js; do node --check "$f"; done
npm start                      # port 7777
```

| adresse ou action | ce qu'on vérifie |
|---|---|
| `?planche` | les quatre nouvelles silhouettes se regroupent par type sans hésiter, **en résolution native** — aucun trou transparent (le piège de `mirrored()`) ; la silhouette du boss final aussi |
| `?perf` | images par seconde, fragments, chemin de rendu, **appels de dessin** — avec tous les dangers actifs en cauchemar |
| `localStorage.setItem("survivor.renderer", "canvas2d")` | le repli 2D reste jouable avec le nouveau bestiaire et les dangers |
| onglet laissé ouvert pendant un redéploiement | la mention ambre « recharge la page » (lot O) |
| un onglet sur une version antérieure au plan | reste jouable : clés inconnues ignorées |
| bascule de GPU / veille / redémarrage de pilote | le contexte WebGL se restaure et **retélécharge l'atlas** — sinon sprites blancs |
| menu pause en solo puis à deux | `pauseReal` ne vaut vrai que sur la réponse du serveur ; la pause se lève à l'arrivée d'un second joueur |
| Échap depuis la fenêtre de build | rend le menu pause, puis le ferme — pas les deux dans la même frappe |

**Les images par seconde ne se mesurent qu'au navigateur** : *« le rendu logiciel de Chrome
sans tête ne dit rien d'un GPU réel, et le temps virtuel fige les horloges »*.

---

## X8. Mise à jour de la documentation

Le lot n'est pas terminé sans ça. `LISEZMOI.md` est *« la documentation de référence — elle
explique le pourquoi de chaque choix d'équilibrage et contient les mesures relevées »*, et la
moitié de ses chiffres sont périmés par ce plan.

| section de `LISEZMOI.md` | action |
|---|---|
| « Vagues » | **supprimée**, remplacée par « Segments » |
| « Niveaux » | réécrite : l'unité est le PV détruit |
| « Difficulté » | la table à quatre colonnes devient une section par mode |
| « Types d'ennemis » | neuf entrées, plus la table des traits par mode |
| « Difficulté indexée sur la puissance de l'équipe » | devient **l'historique d'une décision renversée**, avec la raison — le dépôt garde ses raisonnements morts, c'est son style |
| « Mesures relevées » | **tout à remesurer** ; les anciennes tables ne se réécrivent pas, elles se datent |
| « Durée des combats de boss » | six entrées, avec le grand écart de D2 |
| « Limites connues » | ajouter l'O(n²) à population doublée, et le coût d'un échec tardif |

Et `CLAUDE.md` gagne **cinq lignes de registre** — segment, événement, danger, biome,
anticipation d'ennemi — plus la mention que `TRAITS` est un registre **purement client**, au
même titre que le son, le glyphe et l'image de sprite.

### Une mesure se remesure, elle ne se réécrit pas

Règle déjà appliquée dans le dépôt : *« Mesure prise à 106 cartes — le catalogue en compte 116
depuis, et l'effet ne peut qu'avoir grandi. Le chiffre n'est pas mis à jour ici : une mesure se
remesure, elle ne se réécrit pas. »*

Les tables d'avant ce plan restent, datées et étiquetées « modèle par vagues ». Elles sont la
référence contre laquelle tout ce plan se juge.

---

## X11. Résultats de la campagne

Relevés le 2026-08-09, version **0.7.14**, compte **neuf**, biome **usine**
(sauf mention), 1800 s de horde. Bancs jetables : `banc.mjs` (le moteur),
`grille.mjs`, `survie.mjs`, `horde.mjs`, `boss.mjs`, `final.mjs`.

### Le dispositif, et ce qu'il ne sait pas faire

Quatre régimes, parce qu'un seul bot ne peut pas répondre à quatre questions :

| régime | bot | boss | ce qu'il mesure |
|---|---|---|---|
| **flux** | invulnérable | expédié au crédit exact de `BOSS_XP_K` | rythme, progression, population, CPU |
| **horde** | vulnérable | expédié | jusqu'où la **horde seule** porte une équipe |
| **survie** | vulnérable | combattu (plafond 240 s) | la manche entière |
| **boss** | invulnérable | combattu (plafond 600 s) | durée des combats selon la build |

**Le bot ne joue aucune compétence, n'occupe aucune tour et ne relève
personne.** C'est la limite du dispositif et elle est structurante : en régime
`survie`, il meurt au **premier boss, 5 fois sur 5, dans les neuf
configurations** (segment médian 1, 306 à 503 s). Il traverse pourtant les 300 s
de horde du segment 1 sans mourir. Autrement dit le dispositif mesure « un
joueur qui ignore toutes les mécaniques », ce qui est utile pour le critère 21
et **inutilisable** pour le critère 32 — d'où le régime `horde`, qui isole la
question.

### Grille complète — régime flux (3 essais par case)

| diff | j | niveau | cartes | distinctes | légend. | pop.moy | %max | série avant seg 5 | part XP boss | CPU moy | CPU p99 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| calme | 1 | 18,3 | 17,3 | 39,3 | 1,33 | 102,9 | 29,0 % | 117,7 s | 7,9 % | 0,065 | 0,240 |
| calme | 2 | 25,0 | 24,0 | 74,3 | 2,00 | 88,5 | 20,8 % | 84,0 s | 2,6 % | 0,258 | 1,019 |
| calme | 3 | 20,0 | 19,0 | 79,3 | 1,44 | 64,2 | 4,5 % | 0,0 s | 1,7 % | 0,175 | 0,862 |
| calme | 4 | 25,7 | 24,7 | 92,3 | 2,00 | 56,4 | 3,4 % | 30,8 s | 1,6 % | 0,165 | 0,858 |
| normal | 1 | 19,7 | 18,7 | 42,0 | 1,33 | 92,0 | 31,8 % | 130,8 s | 9,1 % | 0,284 | 0,801 |
| normal | 2 | 20,7 | 19,7 | 67,0 | 1,50 | 131,4 | 43,8 % | 184,8 s | 4,1 % | 0,414 | 1,123 |
| normal | 3 | 22,7 | 21,7 | 83,7 | 1,67 | 123,0 | 35,5 % | 84,8 s | 2,4 % | 0,479 | 1,376 |
| normal | 4 | 23,3 | 22,3 | 93,7 | 1,67 | 142,5 | 55,6 % | 222,0 s | 4,8 % | 0,676 | 1,600 |
| cauchemar | 1 | 21,0 | 20,0 | 43,3 | 1,33 | 119,6 | 39,1 % | 179,8 s | 4,6 % | 0,473 | 1,409 |
| cauchemar | 2 | 19,0 | 18,0 | 65,7 | 1,50 | 152,3 | 63,5 % | 247,0 s | 12,8 % | 0,601 | 1,370 |
| cauchemar | 3 | 25,3 | 24,3 | 87,0 | 1,78 | 145,6 | 52,9 % | 162,2 s | 3,5 % | 0,676 | 1,668 |
| cauchemar | 4 | 22,3 | 21,3 | 88,0 | 1,42 | 142,6 | 53,3 % | 162,8 s | 5,4 % | 0,726 | 1,816 |

### Horde seule — régime horde (5 essais)

| diff | j | segment médian | temps médian | manches finies | contact | projectile | environnement |
|---|---|---|---|---|---|---|---|
| calme | 1 | **3** | 815 s | 0/5 | 75,4 % | 24,6 % | 0 % |
| calme | 2 | **6** | 1800 s | 3/5 | 65,4 % | 34,6 % | 0 % |
| calme | 4 | **6** | 1800 s | 4/5 | 60,2 % | 39,8 % | 0 % |
| normal | 1 | **2** | 440 s | 0/5 | 66,7 % | 27,1 % | 0 % |
| normal | 2 | **2** | 449 s | 0/5 | 61,3 % | 33,0 % | 0 % |
| normal | 4 | **4** | 1190 s | 1/5 | 33,6 % | 49,8 % | 0 % |
| cauchemar | 1 | **2** | 428 s | 0/5 | 68,5 % | 16,0 % | 15,3 % |
| cauchemar | 2 | **2** | 371 s | 0/5 | 73,2 % | 9,4 % | 16,7 % |
| cauchemar | 4 | **1** | 275 s | 0/5 | 79,3 % | 0 % | 17,6 % |

Distribution du segment de la mort, normal, tous effectifs (15 manches) :
**seg 2 : 8 · seg 3 : 2 · seg 4 : 2 · seg 5 : 1 · seg 6 : 2**. Ni bimodale ni
plate — un mur net au segment 2, puis une queue. C'est exactement la forme
qu'on ne veut pas : le mur arrive **avant** que la build existe.

### Durée des combats de boss — régime boss (normal, 2 joueurs)

| ×dégâts | durées relevées (s) | min | enrage atteint |
|---|---|---|---|
| ×0,5 | 40 · 40 · 62 · 264 · 295 · 394 · 510 · 600+ | 40 | oui (16 paliers) |
| ×1 | 60 · 60 · 81 · 85 · 96 · 100 · 183 · 205 | 60 | oui |
| ×2 | 40 · 40 · 40 · 41 · 49 · 52 · 55 · 57 | 40 | oui |
| ×4 | 40 × 8 | 40 | non |
| ×8 | 40 × 8 | 40 | non |
| ×20 | 40 × 8 (max 49) | 40 | non |

**Le plancher de barre tient exactement** : jamais un combat sous 40 s, quelle
que soit la build, y compris à ×20. C'est `(bars − 1) × BAR_DWELL` au chiffre
près, et c'est la promesse du lot R vérifiée.

**Boss final** (`fightT` enregistré) : ×1 → 87 et 424 s · ×2 → 101 et 200 s ·
×4 → 83 et 80 s · ×8 → 80 et 80 s · ×20 → 80 et 80 s. **Jamais sous 80 s**, soit
`7 × BAR_DWELL + FINAL_BAR_DWELL` exactement. La médiane de ~155 s annoncée par
le lot W n'est **pas** confirmée : la dispersion à build médiane va de 87 à
424 s selon la manche.

### Réseau

Pire cas mesuré (cauchemar, 4 joueurs, biome friche, 200 ennemis, 900 s) :

| | clair | après deflate niveau 1 |
|---|---|---|
| instantané moyen | 3 818 o | **1 487 o** (−61,0 %) |
| instantané pire | 9 438 o | **3 776 o** |
| bande passante / joueur | 74,6 / 179,5 Ko/s | **29,1 / 73,8 Ko/s** |

Le gain de 61 % annoncé dans `CLAUDE.md` est **retrouvé au dixième**. En clair
le pire cas dépasse le budget de 160 Ko/s ; c'est la mauvaise mesure —
permessage-deflate est négocié, `prepareMessage()` comprime une fois par
diffusion, et c'est la trame compressée qui part sur le fil.

### Le tableau des verdicts

| # | critère | cible | relevé | verdict |
|---|---|---|---|---|
| 1 | durée totale | 1800 s + 6-9 min | ~1800 s + 4 à 15 min selon build | ✅ |
| 2 | population moyenne, normal, 4 j | 90-140 | **142,5** | ⚠️ limite |
| 3 | population au fond d'un silence | — | — | *sans objet* (X-d) |
| 4 | série à `MAX_ENEMIES` avant seg 5 | < 30 s / < 60 s | **84 à 247 s** | ❌ |
| 4b | part du temps au plafond | < 10 % | **3,4 à 63,5 %** | ❌ |
| 5 | reproductibilité | identique | identique à graine égale | ✅ |
| 6 | niveau à la minute 30 | 22-26 | **18,3 à 25,7** | ⚠️ |
| 7 | écart p90/p10 de niveau | ≥ 3 | non relevé (3 essais/case) | — |
| 8 | … et borné | ≤ 7 | non relevé | — |
| 9 | niveau plancher | ≥ 14 | **18,3** au pire | ✅ |
| 10 | cartes obtenues | 24-26 | **17,3 à 24,7** | ⚠️ |
| 11 | légendaires / joueur | 1-2, plafond tenu | **1,33 à 2,00** | ✅ |
| 12 | cartes distinctes proposées | ≥ 40 | **39,3 à 93,7** | ✅ (39,3 = calme solo, à la limite) |
| 13 | part d'XP venant des boss | < 25 % | **1,6 à 12,8 %** | ✅ largement |
| 14 | parité 1 / 4 joueurs | ±10 % | calme **+42 %**, normal **+20 %**, cauchemar **+7 %** | ❌ en calme |
| 16 | temps de mise à mort d'un grunt | 0,15-0,50 s | non instrumenté | — |
| 17 | durée d'un boss, jamais sous 40 s | 40 s | **40 s exactement** | ✅ |
| 18 | répertoire joué | 100 % | non instrumenté | — |
| 19 | enrage, build médiane | < 5 % | **atteint à ×1 et ×2** | ❌ *(voir décision)* |
| 20 | enrage, build faible | 20-50 % | atteint à ×0,5 | ✅ |
| 21 | écart lit / ignore | > 40 % | **+112 %** de dégâts zone+mécanique | ✅ |
| 22 | échec par mécanique | < 60 % | non instrumenté | — |
| 23 | une mécanique tue-t-elle à pleine vie | jamais | non instrumenté | — |
| 24 | boss final, jamais sous 80 s | 80 s | **80 s exactement** | ✅ (médiane 155 s non confirmée) |
| 25 | Oracle / Jumeaux en solo | > 40 % | non instrumenté | — |
| 26 | segment atteint par mode | 6 / 5-6 / 4-5 | **3-6 / 2-4 / 1-2** | ❌ |
| 27 | écart de survie calme → cauchemar | ×1,5-2,5 | **×1,9 à ×4,9** | ⚠️ |
| 28 | part des dégâts de zone en cauchemar | > normal | 0,2-3,1 % contre 0-0,2 % | ⚠️ (trop faible pour conclure) |
| 29 | part de l'environnement | 0 % normal, 10-20 % cauchemar | **0 %** et **15,3 à 17,6 %** | ✅ **exactement** |
| 30 | part du contact, calme → cauchemar | baisse | **monte** (60-75 % → 68-79 %) | ❌ |
| 31 | écart entre biomes | ≤ 20 % | non relevé | — |
| 32 | survie médiane | ≥ segment 4 | **segment 2** en normal | ❌ |
| 33 | écart compte neuf / maximal | < 1,5 segment | non relevé | — |
| 34 | CPU par tick | < 1 ms moy, < 8 ms p99 | **0,065-0,726** et **0,240-1,816** | ✅ largement |
| 36 | poids d'instantané | +10 % max | pas de référence comparable | — |
| 37 | bande passante | < 160 Ko/s | **73,8 Ko/s** au pire | ✅ |
| 42 | part au plafond par effectif | < 10 %, écart < 2× | **3,4 à 63,5 %**, écart **×19** | ❌ |
| 43 | cartes 1 → 4 joueurs | ±10 % | voir 14 | ❌ en calme |
| 44 | CPU au plafond | < 1 / < 8 ms | voir 34 | ✅ |

### Les décisions écrites

Aucun critère rouge n'est laissé sans phrase — c'est la règle de X9.

**Critères 4, 4b et 42 — la saturation. C'est LE résultat de la campagne, et la
décision est de ne pas la corriger à l'aveugle.** Le plafond de 200 est atteint
entre 3 % et 64 % du temps selon la case, avec des séries de deux à quatre
minutes. Passé lui, `_spawnEnemy` jette les apparitions en silence : les débits
des beats 4 et 5 des segments 5 et 6 sont donc **décoratifs**, et c'est le
plafond, pas le script, qui règle la fin de manche.

L'hypothèse de X10 est réfutée : ce n'est pas un problème d'effectif. La
saturation suit le **rapport débit / capacité de nettoyage**, qui dépend de la
build — elle est donc pire là où l'équipe tue mal, et c'est pour ça qu'elle
s'effondre en calme à quatre (3,4 %) et culmine en cauchemar à deux (63,5 %).

**Et ce n'est pas un phénomène tardif.** Profil minute par minute (même bot que
la grille ; `.` sous 2 % du temps au plafond, `-` jusqu'à 25 %, `o` jusqu'à 60 %,
`#` au-delà) :

```
min           1234567890123456789012345678901
              |seg1||seg2||seg3||seg4||seg5||seg6|
calme     1j  .......-o-...oo...o#.......-..    1re minute saturee :  9
calme     2j  .......--o.................--o                         10
calme     4j  .......--o....-...--...--..---                         10
normal    1j  .......o##..###.-###...##.####                          8
normal    2j  .......oo#.o###.o###-.-##-####                          8
normal    4j  .......oo#.-ooo.####o.ooo-ooo#                          8
cauchemar 1j  .......###.o###.o###..-##-####                          8
cauchemar 2j  ....o.-###-####.o###-.o##-####                          5
cauchemar 4j  ....o.####-####-####o.o#######                          5
```

La première minute saturée est la **5ᵉ** en cauchemar à deux et quatre joueurs,
la **8ᵉ** en normal, la 9ᵉ ou 10ᵉ en calme — soit dès la première ou la deuxième
tranche de cinq minutes, pas à la fin. Le plafond lâche après chaque boss (le
clean vide l'arène) puis se recolle en deux ou trois minutes. En normal comme en
cauchemar, **les deux tiers de la partie se jouent contre le plafond et non
contre le script**.

Le gradient entre les trois modes est net et il est le bon — calme respire,
normal sature à mi-parcours, cauchemar sature presque tout du long. Mais il
tient au **résidu `hp` et au roster**, pas au débit : c'est ce que la ligne
`cauchemar 1j` montre en creux, elle sature à la 8ᵉ minute comme normal, avec le
même débit et des monstres plus durs à tuer.

**Corollaire qui ferme le débat sur le résidu** : `diff.spawn` (×0,80 / ×1,00 /
×1,28) est lui aussi **inopérant dans les fenêtres saturées** — trois modes qui
butent sur le même plafond envoient exactement la même quantité. La quantité ne
peut donc structurellement pas différencier les modes, quoi qu'on écrive dans le
profil. Ce sont les **traits, les patterns d'attaque et de mouvement, et le
roster** qui doivent le faire, et c'est la direction retenue par le porteur du
projet.

Trois corrections possibles, aucune n'est neutre :

1. **Relever `MAX_ENEMIES`.** Le CPU le permet largement — p99 mesuré à 1,8 ms
   sur un budget de 16,7, soit un facteur neuf de marge, et l'O(n²) redouté par
   X3 n'est pas un sujet. Mais 300 ennemis à l'écran est un problème de
   **lisibilité**, pas de performance, et le dépôt a dépensé tout son budget de
   lisibilité à 200.
2. **Abaisser les derniers beats du script.** Rend au script son autorité, au
   prix d'une fin de manche moins spectaculaire.
3. **Ne rien faire** et assumer que le plafond est le régime nominal de la
   seconde moitié.

**Arbitrage rendu par le porteur du projet : option 3.** Le plafond reste, et il
reste pour ce qu'il est — une contrainte de performance, pas un réglage
d'équilibrage : un monstre tué libère une place, la place est réutilisée, la
limite est nécessaire. Ce qui différenciera les modes, ce sont **les patterns
d'attaque et de mouvement** — donc les traits et le roster, pas la quantité.

Ce que cette décision oblige à écrire, et qui est fait : les débits du script
au-delà de la 8ᵉ minute et le résidu `spawn` du profil sont **inopérants dans
les fenêtres saturées**. Personne ne doit passer une soirée à régler l'un ou
l'autre en croyant changer quelque chose.

**Critères 26, 30, 32 — la survie.** Le régime `horde` donne un segment médian
de 2 en normal, contre 4 visé, et la distribution montre un mur net au
segment 2. Trois lectures possibles et **la campagne ne permet pas de choisir** :
le bot ne joue pas de compétence, ne relève personne et ne joue aucun soigneur.
Le critère 30 (« la part du contact baisse en cauchemar ») échoue pour la même
raison mécanique : on meurt au segment 1-2, avant que les traits et les dangers
n'aient le temps de peser. **Décision : ces trois critères ne sont pas
concluants avec ce dispositif**, et la table X4 ne doit pas être ouverte sur
leur foi. Ce qu'il faudrait est écrit : une manche jouée à la main, ou un bot
qui joue ses compétences — et le second est un projet à part entière.

Ce que la campagne dit tout de même : **la horde du segment 1 ne tue pas**
(traversée sans mort dans les neuf configurations), et **le premier boss tue
systématiquement** un joueur qui ignore les mécaniques. Le mur est le boss, pas
la horde.

**Critère 14 — parité d'effectif en calme (+42 %).** Trois essais par case et un
écart-type historique de six cartes : l'écart est du même ordre que le bruit.
Normal (+20 %) et cauchemar (+7 %) encadrent la cible. **Décision : à remesurer
à cinq essais avant toute retouche de `WAVE_CROWD_EXP`** — retoucher un exposant
sur la foi de trois manches serait précisément l'erreur que ce lot existe pour
éviter.

**Critères 6 et 10 — la courbe de cartes.** 17,3 à 24,7 cartes selon la case,
pour une cible de 24-26. La courbe a été calibrée en **normal solo** (23,8
mesurées au balayage) et elle y tient ; **calme rend moins** (17,3 en solo)
parce que ses multiplicateurs `hp: 0,78` et `spawn: 0,80` réduisent les PV
détruits, donc l'expérience, de ~37 %. **Décision : ne pas toucher
`LEVEL_XP_BASE`.** Le mode le plus facile donnant le moins de cartes est
cohérent — c'est le mode qui enseigne, pas celui qui récompense — et corriger
par la base déréglerait normal, qui est la référence. Si l'écart doit se
fermer, le levier est le résidu de calme, pas la courbe.

**Critère 19 — enrage à build médiane.** Atteint à ×1 et ×2, ce qui devrait être
rare. Cause identifiée et **non imputable au boss** : le bot ne détruit pas la
nourrice de la Matriarche assez vite, et `FEED_HEAL` la soigne plus vite qu'il
ne l'entame — trois combats sur les six atteignent le plafond de 600 s à ×0,5.
C'est une mesure du bot. **Décision : à remesurer avec un bot qui priorise
correctement, ou à la main.**

**Critère 24 — la médiane de 155 s du boss final n'est pas confirmée** (87 s et
424 s à build médiane). Le plancher de 80 s, lui, est exact. **Décision : la
cible de 155 s est retirée** — elle avait été dérivée, jamais mesurée, et la
dispersion réelle interdit de parler d'une médiane à deux manches. Ce qui compte
et qui tient, c'est le plancher.

**Critères 7, 8, 16, 18, 22, 23, 25, 31, 33, 36 — non relevés, et pourquoi.**
Les 7 et 8 demandent une distribution (p90/p10) que trois essais par case ne
donnent pas. Les 16, 18, 22, 23 et 25 demandent une instrumentation par
mécanique que le banc n'a pas — ce sont les plus coûteux à écrire et les moins
susceptibles d'avoir bougé, aucun lot depuis W n'ayant touché aux mécaniques.
Le 31 (biomes) et le 33 (compte maximal) sont des balayages d'axe que la grille
de référence ne couvre pas. Le 36 n'a pas de référence comparable : le format
d'instantané a changé six fois depuis la mesure d'origine.

---

## X9. Critères d'acceptation du lot

- Les **44 critères** de X2 et X10 sont relevés, chacun avec ses cinq champs de contexte
  (le 3 est sans objet depuis X-d, le 4b et les 42 à 44 sont nés du même lot).
- Les quatre décisions de X0 sont **remesurées** et non reprises de la première passe :
  elles ont été calibrées au bot invulnérable, ce qui ne dit rien de la survie.
- Chaque critère échoué est accompagné d'une **décision écrite** : réglage modifié, cible
  révisée avec sa raison, ou lot rouvert. Jamais un critère laissé rouge sans phrase.
- Le critère **32** (survie médiane ≥ segment 4) est traité par la table X4 et **jamais par le
  débit**.
- La distribution du **segment de la mort** est relevée, pas seulement sa médiane.
- `LISEZMOI.md` et `CLAUDE.md` sont à jour ; les anciennes mesures sont **conservées et
  datées**, pas écrasées.
- Le plan d'échantillonnage de X1 est respecté : grille complète sur difficulté × effectif,
  balayage d'un axe à la fois ensuite.
- Aucune valeur de ce plan n'est restée « point de départ » sans avoir été soit mesurée, soit
  explicitement notée comme non mesurée et pourquoi.
