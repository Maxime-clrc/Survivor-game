# Lot X — Campagne de mesure et recalibrage

Dépend de tous les lots précédents.

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
| 3 | population au fond de chaque silence | **< 25** | P |
| 4 | temps consécutif à `MAX_ENEMIES` avant le segment 5 | **< 30 s** (normal), **< 60 s** (cauchemar) | P, T |
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
| silence | un bonus au sol **forcé** en début de silence | ~4 | P |
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
   plus fin, et le dépôt a déjà mesuré l'effet de son doublement ;
2. **nombre de silences** par segment — un silence est une fenêtre de récupération autant
   qu'un beat de rythme ;
3. **remise à plein partielle** à mi-segment, comme un mini-événement ;
4. **relever `HEAL_AMOUNT`** ;
5. en dernier recours seulement, **le résidu `dmg`** du profil de difficulté.

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

## X9. Critères d'acceptation du lot

- Les **41 critères** de X2 sont relevés, chacun avec ses cinq champs de contexte.
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
