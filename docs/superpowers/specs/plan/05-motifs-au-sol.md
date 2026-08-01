# Lot 5 — Motifs au sol

## Objectif

Sortir du « tout instantané » : zones persistantes, motifs mobiles, et
mécaniques qui restructurent l'arène.

Dépend du lot 4 : les motifs se distribuent entre les boss.

## 1. Le manque structurel

Aujourd'hui une zone s'annonce (`warn`), explose (`blast 0.25`) et disparaît.
Il n'existe **aucune zone persistante**, donc aucune notion de « rester dedans
coûte cher ».

C'est le champ à ajouter avant tout le reste :

```
zone = { ..., dot: 0, life: 0 }   // degats par seconde, duree de vie
```

`_zoneHits()` existe déjà ; il faut simplement pouvoir le rejouer à intervalle
(`ZONE_TICK: 0.25`) au lieu d'une seule fois. Ça ouvre la moitié du catalogue
ci-dessous pour très peu de code.

## 2. Formes manquantes

Le registre actuel est `0` disque, `1` rectangle orienté, `2` anneau. Trois
ajouts couvrent presque tout le reste — **à ajouter en fin de registre**, avec
mise à jour de `zonePath()` côté client et de `_zoneHits()` côté serveur.

| index | forme | usage |
|---|---|---|
| 3 | **Cône** | attaque frontale, protéens en éventail sur chaque joueur |
| 4 | **Pac-Man** | disque avec un secteur sûr — oblige à se placer derrière une direction précise |
| 5 | **Croix** | quatre bandes depuis un centre, quatre quadrants sûrs |

Plus un **mode de résolution** et non une forme : `proximity: true`, où les
dégâts se dégradent avec la distance à l'épicentre, létal au centre.

## 3. Motifs mobiles

### Exaflares

Série de disques qui traversent l'arène en ligne droite, **seule la première
explosion et la direction étant marquées** — le joueur doit extrapoler la suite.

```
EXA_STEP_DIST: 130      // distance entre deux explosions successives
EXA_STEP_TIME: 0.55
EXA_COUNT: 7
EXA_RADIUS: 90
```

Trois lignes en biais qui se croisent créent un couloir sûr mobile. C'est le
motif le plus élégant du genre et tout existe déjà : ce sont des disques
successifs avec un décalage temporel.

### Zones poursuivantes

Elles déposent des explosions **en suivant le déplacement d'un joueur**, au lieu
de suivre un motif prédéfini. Différent de la traque actuelle qui vise une
position figée : là, ça colle aux talons, et il faut dessiner sa trajectoire
pour ne pas piéger ses alliés.

### Appâts

La zone se dépose **là où le joueur était il y a une seconde**, avec un fantôme
visible qui le suit.

C'est la version domestiquée de la mécanique la plus détestée de FFXIV (des
zones qui apparaissent sous les pieds à la fin d'une incantation, obligeant à
un petit cercle en toute fin). Le fantôme la rend lisible ; sans lui, elle est
punitive.

### Zones en translation

Un disque ou une bande persistante qui glisse à vitesse constante à travers
l'arène. Oblige à un déplacement latéral continu au lieu d'un saut ponctuel.
Complément du mur mobile existant, en moins binaire.

### Flaques rémanentes

Chaque impact de projectile ennemi laisse une mare de 15 s. L'arène se réduit
au fil du combat : un combat qui traîne devient physiquement plus dur. C'est un
chronomètre déguisé, bien plus élégant qu'un enrage brutal.

**Plafonner strictement** le nombre de flaques simultanées (`PUDDLE_MAX: 25`),
sinon le sol devient injouable et le snapshot enfle.

## 4. Mécaniques d'arène

### Constriction

La couronne extérieure devient létale par paliers, toutes les 25 s. L'arène
passe de 1600 × 900 à un carré central.

Effet secondaire majeur, et c'est ce qui la rend intéressante **ici**
spécifiquement : la horde de 200 ennemis se retrouve compressée avec les
joueurs. Aucun autre jeu du genre n'a cette interaction.

**Seule mécanique de sol qui blesse aussi les ennemis** — voir section 6.

### Verrouillage par quadrant

Des murs infranchissables découpent l'arène en quatre pendant 20 s. Les joueurs
sont séparés, chacun avec sa portion de horde. Ça brise le regroupement et met
le soigneur hors de portée.

À réserver aux effectifs de 3-4 : à deux, ça revient à jouer deux parties solo,
et en solo ça ne veut rien dire.

### Sanctuaires

L'inverse : toute l'arène devient dangereuse sauf deux ou trois disques sûrs
qui se déplacent lentement. Tout le monde s'entasse, ennemis compris.

### Sol glissant

Le déplacement conserve son inertie (`SLIP_FRICTION: 0.86` par tick). Simple à
coder, et ça rend soudain difficiles des motifs déjà existants — bon
multiplicateur de valeur sur du contenu déjà écrit.

*Attention* : interagit avec la prédiction locale du client. La même friction
doit être appliquée des deux côtés, sinon le recalage devient permanent.

## 5. Tolérance de collision — point technique important

Les guides FFXIV relèvent que le jeu décide des dégâts **au moment où le
télégraphe disparaît**, pas au moment de l'animation.

Ici, le client affiche avec **110 ms de retard** sur l'état serveur. Un joueur
qui sort de la zone à l'image exacte où elle explose *sur son écran* était
encore dedans côté serveur. Sur des zones instantanées, ça passe. Sur des
exaflares ou des zones mobiles, où l'on frôle en permanence, ce sera la source
numéro un de « j'étais sorti ! ».

Deux correctifs possibles, le second étant recommandé :

1. Résoudre contre la position du joueur telle qu'elle était il y a
   `INTERP_MS` — exact mais demande un historique de positions.
2. **Rétrécir le rayon de collision de 10 % par rapport au rayon affiché**
   (`ZONE_FORGIVE: 0.9`). Trois lignes, et ça pardonne toujours dans le bon sens.

Documenter le choix : c'est le genre d'écart affichage/logique qu'un futur
lecteur prendrait pour un bug.

## 6. Les zones blessent-elles les ennemis ?

Décision de conception à trancher explicitement, elle change tout :

- **Zones de boss : non.** Si elles blessaient les ennemis, la difficulté
  s'annulerait d'elle-même — on attirerait la horde dedans et le boss
  deviendrait une ressource.
- **Constriction : oui.** Ça en fait un outil de nettoyage désespéré et rend la
  mécanique mémorable.
- **Flaques, sanctuaires, sol glissant : non**, pour la même raison que les
  zones de boss.

## 7. Répartition par boss

| boss | motifs |
|---|---|
| **Métronome** | exaflares, appâts, zones en translation, sanctuaires, sol glissant |
| **Ravageur** | constriction, verrouillage par quadrant |
| **Matriarche** | flaques rémanentes issues des rejetons |
| **Oracle** | cônes, Pac-Man, dégâts de proximité |
| **Jumeaux** | croix depuis chacun, intersection mortelle |

## 8. Lisibilité — condition de réussite

L'arène contient déjà des zones rouges, 200 ennemis et des projectiles. Ajouter
des zones persistantes exige une distinction visuelle **nette** entre les deux
temps :

| état | rendu |
|---|---|
| **annonce** | contour animé, remplissage 10 %, arc de progression |
| **actif** | remplissage 45 %, contour fixe, léger pulsé |

Si les deux se ressemblent, tout ce catalogue devient du bruit. C'est la partie
du lot à ne pas bâcler.

Plafond global de zones affichées, et fusion visuelle des flaques qui se
chevauchent.

## 9. Modifications par fichier

### `shared/game_state.js`

- Zone : champs `dot`, `life`, `proximity`, `vel` (translation).
- `_zones(dt)` : gérer la persistance, le déplacement, le tic de dégâts.
- `_zoneHits()` : formes 3, 4, 5, mode proximité, `ZONE_FORGIVE`.
- Générateurs : `_atkExaflare`, `_atkAppat`, `_atkTranslation`, `_atkSanctuaire`.
- Arène : `state.bounds` (constriction), `state.walls` (verrouillage),
  `state.slip` (sol glissant) — et **tout ce qui borne un déplacement doit lire
  `state.bounds`**, pas `CFG.ARENA_W/H` en dur. C'est le principal risque de
  régression du lot.

### `public/client.js`

- `zonePath()` : formes 3, 4, 5.
- Rendu distinct annonce / actif, dégradé de proximité.
- Murs de verrouillage, bordure de constriction.
- Même friction que le serveur dans la prédiction locale.

### `CLAUDE.md`

Registre `shape` étendu, et note sur `ZONE_FORGIVE` dans les invariants.

## 10. Mesures à relever

| mesure | attendu |
|---|---|
| zones simultanées, pire cas | inférieur à 40 |
| coût du snapshot avec flaques et exaflares | +20 % maximum sur le pire cas actuel |
| temps CPU de `_zoneHits` à 4 joueurs et 40 zones | négligeable devant l'évitement des ennemis |
| taux de « touché alors que sorti » ressenti | à vérifier en jeu réel, pas en simulation |

## 11. Critères d'acceptation

- Une zone persistante inflige des dégâts à intervalle régulier, pas à chaque
  tick.
- La constriction ne piège jamais un joueur hors des limites (repousser vers
  l'intérieur, ne pas tuer instantanément).
- Le verrouillage par quadrant ne se déclenche jamais à moins de 3 joueurs.
- Le sol glissant ne provoque pas de recalage permanent de la prédiction.
- Aucun déplacement ne borne encore sur `CFG.ARENA_W/H` en dur.
