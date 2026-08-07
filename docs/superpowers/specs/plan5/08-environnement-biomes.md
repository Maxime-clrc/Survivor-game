# Lot V — Environnement et biomes

Dépend du lot T : l'identité visuelle par difficulté vit dans le profil.

C'est le lot qui répond à *« les cartes deviennent de véritables éléments de gameplay »*.
C'est aussi le lot le plus facile à rater, pour une raison qui n'a rien à voir avec les
dangers eux-mêmes.

---

## V1. Le budget de lisibilité est déjà dépensé

À 200 ennemis, plus les zones de boss, plus les télégraphes, plus les marqueurs de
mécanique, plus les chiffres de dégâts, plus les traînées du lot S — l'écran est plein.

Ajouter des dangers d'environnement avec le **même vocabulaire visuel** que les mécaniques de
boss casserait la seule chose qui rend le jeu jouable à cette densité : *« une zone se
reconnaît à sa signature avant sa couleur »*.

Deux règles non négociables en découlent.

### Règle 1 — un danger d'environnement est du SOL, pas un télégraphe

Il est **statique ou périodique**, sa position est **fixe pour la manche**, il **s'apprend**.

Le canal du télégraphe instantané appartient au boss et **n'est pas partagé**. Un geyser qui
s'annonce par un cercle ambre de 1,4 s est indistinguable d'une zone de Ravageur, et le
joueur cesse de savoir lequel des deux il regarde.

Un danger d'environnement s'annonce par sa **géométrie permanente** : la bouche du geyser est
visible en permanence, seul son jet est intermittent. On apprend la carte, on ne lit pas un
compte à rebours.

### Règle 2 — plafond de surface

**L'ensemble des dangers actifs ne couvre jamais plus de 12 % de l'arène**, traînées du lot S
et spores comprises.

Repère du dépôt, et il est chiffré : `SHRINK_MIN: 0.45`, avec le commentaire *« en dessous, la
horde de 200 ennemis ne tient plus et le combat devient une bouillie où le positionnement ne
veut plus rien dire »*. Sans caméra, dans un écran fixe de 1600 × 900, la surface est une
**ressource rare** — et le lot P vient d'y mettre une population moyenne deux fois plus
dense.

Le plafond est **strict et non indicatif**, comme `PUDDLE_MAX: 25` : *« sans lui, une fin de
combat à 200 ennemis pavait le sol, le snapshot enflait et la mécanique devenait illisible
avant d'être difficile »*.

---

## V2. Tout existe déjà — un seul concept nouveau

C'est le résultat le plus utile de ce lot : la quasi-totalité des dangers demandés se
construit avec des primitives en place.

| danger demandé | primitive réutilisée |
|---|---|
| obstacle infranchissable | **`state.walls`** — la seule entité du jeu qui interdit un déplacement, avec sa règle de repoussée *« du côté d'où l'on venait »* et sa réplication dans la prédiction client |
| flaque de poison, zone corrompue | **`_zone`** avec `life` + `dot`, cadencé par `ZONE_TICK` et `overTime: true` |
| geyser | **`_zone`** périodique (`period`, `left`) à position fixe |
| zone ralentissante | champ de ralentissement sur le modèle de **`frostRadius`** |
| sol glissant | **`sp`** du lot 4, déjà transmis, déjà dessiné |
| incendie qui se propage | **`_zone`** avec `vx`/`vy` — la dérive existe déjà (`MECH_DRIFT`) |
| constriction, couronne mortelle | **`state.bounds`** et `_clampToBounds()` |
| destructible | `state.walls` **plus un champ de PV** — *le seul ajout réel* |
| météorologie | un **modificateur global** par segment (visibilité, vitesse), pas une entité |

Un seul concept nouveau : des murs qui ont des PV.

### Conséquences des primitives réutilisées

Trois pièges héritent automatiquement de leurs corrections, et il ne faut pas les rouvrir :

- une zone persistante inflige `dot` par **paliers de `ZONE_TICK`**, jamais à chaque image, et
  passe **`overTime: true`** à `_hurt()`. Sans ce drapeau, *« une mare de quinze secondes remet
  `hitCd` à 0,55 s quatre fois par seconde et rend sa victime immunisée au contact, aux tirs
  et aux autres zones. On mourait en sécurité dans une flaque. »* ;
- `ZONE_FORGIVE` (0,9) s'applique : la zone **affichée** reste plus grande que la zone qui
  blesse, et le sens s'inverse pour ce qui **épargne** ;
- tout ce qui borne un déplacement lit **`state.bounds`**, jamais `CFG.ARENA_W/H` en dur —
  *« un seul oubli laisse un joueur, un boss, une tour ou un bonus dans la couronne mortelle
  sans moyen d'en sortir »*.

---

## V3. Murs destructibles — le seul ajout

`state.walls` bloque et ne blesse pas. Un mur destructible ajoute un champ de PV et une
condition de destruction. Trois décisions :

- **Il se casse au tir du joueur** et à rien d'autre. Pas aux dégâts d'ennemis : deux cents
  monstres qui abattent la couverture en dix secondes rendraient la mécanique invisible, et
  un mur qui disparaît sans qu'on sache pourquoi est un bug de retour.
- **Il ne rend ni score ni expérience.** Ce n'est pas un ennemi ; le crédit vaut les PV max
  d'un **ennemi tué** (lot Q), et une couverture n'en est pas un.
- **Il ne passe pas par `_damage()`.** Ce point de passage porte le vol de vie, les critiques,
  l'exécution et le compteur de touches — aucun n'a de sens sur un mur, et l'exécution en
  supprimerait un d'un tir. Même raisonnement que *« le soin du medic est un chemin neuf, pas
  un `_damage()` négatif »*.

La couleur reste celle des murs : *« le verrouillage par quadrant est la seule entité du jeu
qui interdit un déplacement ; d'où une couleur franchement différente de tout ce qui
explose »*. Un mur destructible est un mur, il ne devient pas ambre parce qu'on peut le
casser — un liseré suffit à dire qu'il cède.

---

## V4. Météorologie : un modificateur, pas une entité

Une météo est un **modificateur global** valable un segment, annoncé par le canal d'alerte au
niveau `ALERT_INFO`. Jamais une entité, jamais une zone : elle n'a pas de position.

| météo | effet | mode |
|---|---|---|
| brume | portée d'affichage réduite au bord de l'arène (vignettage renforcé) | normal, cauchemar |
| bourrasque | pousse légèrement joueurs **et** ennemis dans une direction | cauchemar |
| cendres | les bonus au sol expirent plus vite | cauchemar |

**Le piège** : une météo qui touche la **visibilité** ne doit jamais masquer un télégraphe de
boss ni un marqueur posé sur un joueur. Le vignettage se renforce sur les **bords**, où rien
d'important ne se joue ; le centre reste net. Sans cette contrainte, la brume devient une
difficulté artificielle qui punit la lecture — l'inverse de ce que le dépôt mesure comme
« difficile » (*« l'écart entre un joueur qui lit les annonces et un joueur qui les
ignore »*).

Une bourrasque qui pousse **les deux camps** et non le seul joueur : sinon c'est une taxe, et
le dépôt refuse les taxes déguisées en mécanique (cf. le retrait des dégâts de rupture de
barre).

---

## V5. Biomes

`shared/biomes.js`, module **pur**, aucune dépendance, sur le modèle de `statuses.js`.

Un biome = un **jeu de dangers** + une **variante de palette** + une **densité de grille**.
Il est tiré au lancement de la manche, **affiché** au salon, et enregistré avec le score
(lot X — sans lui, deux temps ne sont pas comparables).

| biome | géométrie | dangers en cauchemar |
|---|---|---|
| `usine` | piliers en grille régulière, couloirs francs | geysers de vapeur aux intersections, sol glissant |
| `fonderie` | ouvertures larges, deux cuves centrales | flaques brûlantes rémanentes, incendies qui dérivent |
| `friche` | obstacles épars, asymétrique | zones corrompues fixes, cover destructible |

`BIOMES` est un **tableau ordonné dont l'index circule** — une fois, dans le payload de
salon, comme `diffIndex`. Ajouter en fin, jamais au milieu.

### Ce que la difficulté fait d'un biome

C'est la même géométrie dans les trois modes — la carte s'apprend — et seuls les dangers
changent :

| mode | ce qui est actif |
|---|---|
| calme | la géométrie seule : **aucun danger** |
| normal | obstacles statiques, deux zones ralentissantes, **rien qui blesse** |
| cauchemar | la table ci-dessus, plus une météo par segment |

Un joueur qui connaît `usine` en calme reconnaît `usine` en cauchemar. C'est ce qui rend la
montée en difficulté apprenable au lieu d'être un autre jeu.

---

## V6. La géométrie ne bouge pas en cours de manche

Les obstacles sont posés **à la création de la manche** et n'apparaissent jamais en cours de
route. Trois raisons, toutes déjà écrites dans le dépôt :

- **la prédiction locale** rejoue la règle des murs côté client ; un mur qui apparaît sous un
  joueur en pleine esquive (162 px en trois images) le téléporterait ;
- **la géométrie des zones de boss** garde volontairement l'arène pleine — *« redécouper la
  grille à chaque palier changerait la taille des cases en plein combat »*. Un damier calculé
  sur une arène dont la surface libre change n'est plus lisible ;
- **`_dropPoint()`** doit pouvoir poser un bonus ailleurs que dans un mur, et il ne peut pas
  vérifier une géométrie qui change.

Ce qui **peut** apparaître en cours de manche : les zones (geyser, flaque, incendie), qui sont
des dangers **traversables**. Elles ne bloquent rien, donc elles ne cassent ni la prédiction
ni le placement.

**Corollaire à ne pas oublier** : la constriction du Ravageur (`MECH_SHRINK`) réduit
`state.bounds` pendant un combat de boss. Un obstacle qui se retrouve dans la couronne
mortelle est sans effet — mais un obstacle qui **enferme** un joueur dans un coin de l'arène
réduite est un piège mortel involontaire. Les obstacles doivent donc laisser un passage dans
le **carré central minimal** (`SHRINK_MIN`, 45 % de chaque dimension), vérifié à la
génération.

---

## V7. Fichiers touchés

| fichier | ce qui change |
|---|---|
| `shared/biomes.js` | **nouveau** — `BIOMES` (ordonné), jeux de dangers, référence de palette, densité de grille, constantes de danger |
| `shared/game_state.js` | pose de la géométrie à la construction ; PV sur `state.walls` ; dangers périodiques dans le tick ; modificateur de météo ; clé `hz` dans `snapshot()` ; plafond de surface |
| `shared/palette.js` | une variante de décor par biome, croisée avec la variante de mode du lot T |
| `public/client.js` | dessin des obstacles et des dangers sur **`#cvUnder`** (sol, zones, télégraphes, remparts) — jamais sur les couches supérieures ; liseré de mur destructible ; vignettage de météo |
| `public/hud.js` | nom du biome et météo active dans le bandeau hors combat |
| `public/events.js` | événement d'activation de danger, de destruction de mur |
| `public/audio.js` | une entrée de `PALETTE` par danger ; la météo peut porter une nappe dans `music.js` |
| `shared/game_state.js` | **une provenance en fin de `DAMAGE_SOURCES`** : « environnement » |
| `public/icons.js` | son glyphe dans `SRC_ICON` |
| `room.js` | le payload de salon porte le biome tiré |

### La couche de rendu est imposée

Tout ce lot dessine sur **`#cvUnder`**, le canvas 2D du bas : *« sol, grille, zones,
télégraphes, remparts, tourelles, marqueurs, sillage d'esquive »*. Un danger d'environnement
est du sol (V1) ; le mettre sur `#cv` le ferait passer **au-dessus** des entités, et un
geyser dessiné par-dessus la horde masquerait exactement ce qu'il faut voir.

C'est le même raisonnement que `drawEffects`, qui reste volontairement **sous** les entités :
*« une onde de 250 px de rayon dessinée par-dessus masquerait exactement les joueurs que le
liseré vient de rendre identifiables »*.

---

## V8. Mesures

| mesure | cible |
|---|---|
| part de l'arène couverte par les dangers actifs, cauchemar | **≤ 12 %** à tout instant, traînées et spores comprises |
| surface libre dans le carré central minimal (`SHRINK_MIN`) | **passage garanti** dans les trois biomes, vérifié par script |
| part des dégâts subis venant de l'environnement, cauchemar | **10 à 20 %** — en dessous le biome est décoratif, au-dessus il concurrence la horde |
| part des dégâts subis venant de l'environnement, normal | **0 %** — normal n'a aucun danger qui blesse |
| écart de survie entre trois biomes, même mode et même variante | **≤ 20 %** — au-delà, un biome est plus dur qu'un autre et le classement par biome devient obligatoire |
| murs destructibles cassés par manche | à relever ; s'il est proche de zéro, la couverture n'intéresse personne |
| poids d'instantané, clé `hz`, cauchemar, pire cas | hausse **< 3 %** |
| CPU par tick, cauchemar, tous dangers actifs, 200 ennemis, 4 joueurs | moyenne **< 1 ms**, p99 **< 8 ms** |
| appels de dessin, `?perf`, dangers actifs | **2 à 4** — le lot ne doit pas casser le batcher |

---

## V9. Critères d'acceptation

- Aucun danger d'environnement n'utilise le vocabulaire du **télégraphe de boss** : chacun est
  visible en permanence par sa géométrie, seul son effet est intermittent.
- La surface couverte par l'ensemble des dangers actifs ne dépasse **jamais 12 %** de
  l'arène ; le plafond est strict, pas indicatif.
- La géométrie d'obstacles est posée **à la création de la manche** et ne change jamais en
  cours de route.
- Un passage traversable existe dans le **carré central minimal** de chaque biome, vérifié par
  script sur les trois biomes.
- Tous les dangers sont dessinés sur **`#cvUnder`**, aucun sur `#cv` ni sur `#cvGl`.
- Toute zone persistante passe **`overTime: true`** à `_hurt()` et inflige par paliers de
  `ZONE_TICK`.
- Tout ce qui borne un déplacement lit **`state.bounds`**, jamais `CFG.ARENA_W/H`.
- Un mur destructible ne cède qu'au **tir du joueur**, ne rend **ni score ni expérience**, et
  ne passe **pas** par `_damage()`.
- La météo ne réduit la visibilité que sur les **bords** : aucun télégraphe de boss, aucun
  marqueur de joueur, aucun chiffre de dégâts n'est jamais masqué.
- Une bourrasque pousse **joueurs et ennemis**, jamais les joueurs seuls.
- Calme n'a **aucun** danger actif ; normal n'a **aucun** danger qui blesse.
- Le même biome est reconnaissable dans les trois modes : la géométrie est identique.
- `BIOMES` est un tableau ordonné, l'index circule une seule fois (payload de salon), aucune
  insertion au milieu.
- Une provenance « environnement » est ajoutée **en fin** de `DAMAGE_SOURCES`, avec son glyphe
  dans `SRC_ICON`, et elle apparaît dans la répartition du bilan de fin de manche.
