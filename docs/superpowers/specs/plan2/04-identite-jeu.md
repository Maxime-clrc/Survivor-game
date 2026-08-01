# Lot 4 — Identité en jeu : HUD, arène, monstres

Dépend du lot 3, dont il consomme les jetons.

## 1. Le HUD — cause racine et correctif

### Le diagnostic

Le HUD est **dessiné dans le canvas**, en coordonnées d'arène, avec des polices
de 8 à 15 px. Le canvas fait 1600 × 900 et le CSS le contraint en
`max-width: 100%`. Sur une fenêtre large, il est mis à l'échelle vers le bas :
une police de 11 px dans le canvas peut finir à 7 px réels.

Autrement dit : **plus l'écran est grand, plus le HUD est petit.** C'est
l'inverse de ce qu'on veut, et aucun ajustement de taille de police ne le
corrigera durablement.

### Le correctif

**Sortir le HUD du canvas et le passer en surcouche DOM.**

```html
<div id="stage">
  <canvas id="cv" width="1600" height="900"></canvas>
  <div id="hud"><!-- positionne en absolu par-dessus --></div>
</div>
```

Le HUD est alors dimensionné en pixels CSS, indépendant de l'échelle du canvas,
net à toutes les résolutions, et il bénéficie de la charte du lot 3 sans
réimplémenter des mesures de texte au canvas.

Ce qui **reste** dans le canvas : tout ce qui est ancré à une position du monde
— barres de vie au-dessus des joueurs, marqueurs, chiffres de dégâts,
télégraphes. Ce qui **sort** : chronomètre, compteurs, jauge d'équipe, barre de
vie personnelle, icônes de compétence, effets actifs, bandeau d'alerte, barre
de boss.

C'est le seul vrai travail de structure du lot, et il conditionne tout le
reste.

### Disposition

```
┌─────────────────────────────────────────────────────────┐
│ 02:14        ┌── VAGUE 7 ───────┐              ÉQUIPE   │
│ 74 kills     │ ████████░░░░ 68 %│           Max   ██████│
│ 12 ennemis   └──────────────────┘           Léa   ████░░│
│                                                          │
│              [ RAVAGEUR I — positionnement ]             │
│              ████████████░░░░░░░░░░░  ×3                 │
│                                                          │
│                                                          │
│ ┌──────────────────────┐                    ◈ ✦ ❋ ⬡     │
│ │ ████████████░░ 85/85 │  [A] [E] [ESPACE]   effets      │
│ │ ▓▓▓▓ bouclier        │   9s   prêt  prêt              │
│ │ niv. 6 ██████░░      │                                 │
│ └──────────────────────┘                                 │
└─────────────────────────────────────────────────────────┘
```

Principes :

- **Le bloc personnel est en bas à gauche et il est gros.** PV, bouclier,
  niveau, compétences. C'est ce qu'on regarde en panique.
- **Le cadre d'équipe est en haut à droite**, une ligne par joueur avec barre
  et états. Indispensable au soigneur.
- **Les compétences sont des pastilles carrées** avec la touche en grand, un
  voile de recharge circulaire, et un éclat bref quand elles redeviennent
  prêtes.
- **Les effets actifs** (lot 1) forment une rangée d'icônes près du bloc
  personnel.
- La barre de boss reste centrée en haut, elle est déjà bien placée.

### Tailles minimales

En pixels CSS, non négociables : PV chiffrés à 15 px, touches de compétence à
13 px en gras, noms d'équipe à 13 px, chronomètre à 26 px.

## 2. Les chiffres de dégâts

### Ce qui manque

Ils n'existent que sur le boss. Rien n'indique les dégâts infligés à la
piétaille, ni surtout **les dégâts subis** — un joueur qui perd 40 PV ne sait
pas d'où ça vient.

### Ce qu'il faut faire

**a. Sur tous les ennemis**, avec trois garde-fous sans lesquels l'écran
devient illisible à 200 ennemis :

- **Agrégation** : les coups portés au même ennemi dans une fenêtre de 200 ms
  fusionnent en un seul nombre qui s'incrémente. Un ennemi sous feu nourri
  affiche un compteur qui monte, pas quarante nombres.
- **Plafond global** : `DMG_NUM_MAX: 40` nombres actifs. Au-delà, les plus
  anciens disparaissent.
- **Seuil d'affichage** : rien en dessous de 5 % des PV max de la cible. Les
  micro-dégâts de brûlure ne doivent pas noyer les coups qui comptent.

**b. Les dégâts subis**, et c'est le plus important : nombre **rouge**, plus
gros, qui monte depuis le joueur, avec un léger décalage horizontal aléatoire
pour que deux coups rapprochés restent lisibles. Accompagné du flash de
vignette rouge existant.

**c. Les soins reçus** en vert, même traitement. Sans ça le soigneur ne sait
pas s'il soigne.

**d. Distinction visuelle** : coup normal en blanc cassé, coup critique ou gros
coup en ambre et plus gros, dégâts subis en rouge, soin en vert.

### Provenance

Les chiffres se déduisent de la timeline interpolée, comme les sons — jamais de
`latest`, sinon ils apparaissent 110 ms avant l'image correspondante.

Pour les dégâts subis, la variation de PV entre deux images suffit. Pour les
dégâts infligés, la variation de PV de l'ennemi — ce qui a l'avantage de
n'exiger **aucun** ajout au snapshot.

## 3. Les silhouettes de classe

### Le problème

Les trois classes sont le même cercle avec un canon. Impossible de savoir qui
est le tank sans lire les noms.

### La grammaire

Reprise de la règle du lot 3 : **la forme dit la classe, la couleur dit le
joueur.** Les quatre couleurs de joueur restent inchangées — on ne peut pas
coder la classe par la couleur, elle est déjà prise.

| classe | silhouette | traits |
|---|---|---|
| **Rempart** | hexagone trapu | contour épais 3 px, plus large que haut, deux plaques latérales |
| **Soigneur** | cercle à croix | contour fin, emblème en croix, halo doux permanent |
| **Tireur** | dard triangulaire | pointe marquée vers la visée, contour net, plus petit |

Chaque silhouette est orientée vers la direction de visée — le tireur en tire
un vrai bénéfice de lisibilité, le rempart moins mais la cohérence prime.

Le canon actuel reste, adapté à chaque forme : long et fin pour le tireur,
court et large pour le rempart, remplacé par un faisceau pour le soigneur en
mode soin.

**Le mode soin doit se voir de loin** : quand il est actif, la silhouette du
soigneur porte un liseré vert et ses projectiles changent de couleur. C'est une
information tactique pour toute l'équipe.

### Sprites

Même technique que les monstres : un canevas hors écran par classe et par
couleur de joueur, construit au démarrage, puis collé et pivoté. Douze sprites
au total, négligeable en mémoire, et ça évite de redessiner des tracés à chaque
image.

## 4. Les monstres

Les silhouettes actuelles sont correctes — le travail porte sur la
**hiérarchie** et la **cohérence**, pas sur un redessin complet.

### Ce qui manque

**a. Les élites ne se distinguent pas assez.** Aujourd'hui un liseré. Il faut
qu'un élite se repère instantanément dans une foule de 200 : contour blanc
épais, lueur, et **une taille supérieure de 30 %**. La taille est le signal le
plus rapide à lire.

**b. La palette d'ennemis n'est pas structurée.** Les cinq types ont des
couleurs proches (rouges et magentas). Les écarter selon leur menace :

| type | couleur | logique |
|---|---|---|
| grunt | `#c9364a` rouge sourd | la masse, doit reculer visuellement |
| runner | `#f97316` orange vif | vitesse = couleur chaude et saturée |
| tank | `#7f1d3a` bordeaux sombre | masse = valeur sombre |
| shooter | `#a855f7` violet | seul type à distance, couleur froide |
| brood | `#ec4899` rose | anomalie, couleur la plus saturée |

Le violet du shooter le sépare enfin du reste — c'est le type le plus dangereux
à ignorer et il était noyé.

**c. Aucune animation.** Deux ajouts peu coûteux qui changent tout :
- une **respiration** : léger cycle d'échelle, désynchronisé par entité via son
  identifiant.
- un **écrasement au déplacement** : l'entité s'étire légèrement dans son axe.

**d. La mort est trop discrète.** Éclat blanc bref + particules à la couleur du
type, déjà prévus, mais à vérifier : c'est ce qui donne la sensation de récompense.

## 5. L'arène

### Le sol

La grille uniforme actuelle ne raconte rien. Trois ajouts :

- **Une grille à deux niveaux** : lignes fines tous les 5 m, lignes plus
  marquées tous les 20 m. Ça donne une échelle lisible — et ça rend les
  distances en mètres du lot 1 immédiatement compréhensibles.
- **Un vignettage** sur les bords, qui concentre le regard et masque les
  apparitions hors champ.
- **Une réaction aux impacts** : les explosions de zone et les ondes de choc
  font brièvement briller les lignes de grille dans leur rayon. Peu coûteux,
  très caractéristique du registre instrumentation.

### Les attaques à revoir

Par ordre de gain :

- **Les zones persistantes contre les télégraphes** : vérifier que la
  distinction annonce / actif du lot 3 est appliquée partout. C'est la
  confusion la plus dangereuse du jeu.
- **Les projectiles ennemis** manquent de présence : leur ajouter une traînée
  courte, et une lueur pour ceux du boss.
- **Les balles du joueur** sont des points jaunes. Un étirement dans l'axe du
  tir et une traînée les rendent bien plus satisfaisantes, sans changer leur
  taille de collision.
- **Les explosions de bombe** doivent avoir un vrai souffle : anneau qui se
  dilate, éclat central, tressaillement d'écran.

## 6. Modifications par fichier

### `public/index.html` + `public/css/`
Surcouche HUD en DOM, positionnement, tailles CSS.

### `public/client.js`
- Retrait du HUD canvas, câblage de la surcouche.
- Sprites de classe, sprites d'élite agrandis.
- Chiffres de dégâts : agrégation, plafond, seuil, catégories.
- Grille à deux niveaux, vignettage, réaction aux impacts.
- Traînées de projectiles, souffle des explosions.

### `public/events.js`
Émission des événements de dégâts subis et de soins reçus depuis la timeline
interpolée.

### `shared/palette.js`
Couleurs d'ennemis restructurées.

## 7. Mesures à relever

| mesure | attendu |
|---|---|
| images par seconde à 220 ennemis, 40 chiffres, 300 particules | pas de chute sous 60 |
| taille réelle du texte de PV sur écran 1080p et 1440p | supérieure à 14 px CSS dans les deux cas |
| nombre de chiffres simultanés, pire cas | plafonné à 40 |

## 8. Critères d'acceptation

- Le HUD garde la même taille lisible quelle que soit la taille de la fenêtre.
- Les trois classes sont identifiables sans lire de texte, de loin.
- Un élite se repère instantanément dans une foule de 200.
- Les dégâts subis sont toujours accompagnés d'un nombre rouge.
- Aucun chiffre de dégâts n'apparaît avant l'image correspondante.
- Le mode soin du soigneur est visible par les autres joueurs.
