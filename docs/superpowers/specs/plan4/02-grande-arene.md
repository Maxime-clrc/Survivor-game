# Lot I — Grande arène et caméra

Le lot le plus lourd de cette série, parce qu'il introduit un système qui
n'existe pas du tout aujourd'hui : **aucune caméra n'est implémentée**. Le
rendu est câblé sur l'hypothèse que l'arène entière (1600×900) tient dans un
seul écran. Ce n'est pas un agrandissement de deux constantes, c'est une
brique nouvelle.

Décisions actées par l'équipe, à ne pas rouvrir :

- **Le modèle de vague actuel (budget puis nettoyage) est conservé tel quel**,
  y compris sur la grande arène.
- **Aucun danger de bordure de carte** dans cette itération.
- **Aucune incitation à rester groupé** au-delà de l'existant : le rayon
  d'action court du soigneur et du tank est assumé comme un coût
  d'exploration.
- **Un classement au temps** devient possible pour la partie complète
  (voir lot N) — conséquence à anticiper dans la persistance de ce lot.

---

## I1. Ce qui change, ce qui ne change pas

### Ne change pas

- Le modèle de fin de vague : budget d'apparitions épuisé, puis arène vide.
- La difficulté indexée sur `_teamPower()`.
- Les arènes de boss (lot séparé, restent à taille actuelle).

### Change

- L'arène de vagues normales devient **beaucoup plus grande que l'écran**.
- Un système de caméra apparaît, qui n'existait pas.
- Des points de récolte apparaissent aléatoirement sur la carte.
- Une monnaie de manche, non persistante, rémunère leur destruction.

---

## I2. La caméra

### Le principe

Chaque client a sa propre caméra, centrée sur **sa position prédite**
(`predicted.x/y`), pas sur une caméra d'équipe unique. Chaque joueur voit midi
à sa porte, ce qui est le seul choix cohérent avec le fait que l'exploration
soit individuelle.

```js
// public/client.js
const camera = { x: 0, y: 0 };

function updateCamera(dt) {
  const target = predicted ?? { x: CFG.ARENA_W / 2, y: CFG.ARENA_H / 2 };
  const pull = 1 - Math.exp(-CAMERA_FOLLOW_RATE * dt);
  camera.x += (target.x - camera.x) * pull;
  camera.y += (target.y - camera.y) * pull;
  camera.x = clamp(camera.x, VIEW_W / 2, ARENA_W - VIEW_W / 2);
  camera.y = clamp(camera.y, VIEW_H / 2, ARENA_H - VIEW_H / 2);
}
```

Lissage exponentiel plutôt que suivi rigide — sinon chaque micro-correction de
la prédiction locale (déjà présente pour absorber la latence réseau) se
répercute sur la caméra et produit un tremblement perceptible.

### Ce que ça implique pour le rendu

**Toutes les fonctions de dessin qui reçoivent des coordonnées monde doivent
désormais les convertir en coordonnées écran** via un unique point de passage :

```js
function worldToScreen(x, y) {
  return { x: x - camera.x + VIEW_W / 2, y: y - camera.y + VIEW_H / 2 };
}
```

C'est le changement le plus large en surface de code, parce que `client.js`
dessine aujourd'hui directement en coordonnées monde sur un canvas qui
correspond à l'arène entière. **Chaque appel de dessin d'entité, de zone, de
particule et de télégraphe doit passer par cette conversion.**

Le HUD (déjà en DOM depuis le lot de refonte visuelle) n'est pas concerné : il
reste ancré à l'écran, pas au monde.

### Le culling

Avec une arène bien plus grande que l'écran, dessiner les entités hors champ
gaspille du temps. Un test de rectangle avant chaque appel de `drawSprite` :

```js
if (x < camera.x - MARGIN || x > camera.x + VIEW_W + MARGIN || ...) continue;
```

`MARGIN` couvre le rayon du plus grand sprite, pour éviter qu'une entité
apparaisse ou disparaisse brutalement au bord de l'écran.

### Les flèches de coéquipier

Pour chaque allié hors du rectangle de vue, une flèche en bord d'écran pointe
vers sa direction :

```js
function offscreenIndicator(ally) {
  const dx = ally.x - camera.x, dy = ally.y - camera.y;
  const angle = Math.atan2(dy, dx);
  // projection sur le rectangle de l'ecran, marge de 24px
}
```

Couleur du joueur concerné, avec la distance affichée en mètres en dessous de
la flèche — l'unité déjà en place pour les autres distances du jeu.

---

## I3. Taille de l'arène

**« Suffisamment grande pour encourager l'exploration »**, sans borne
supérieure fixée par l'équipe. Proposition de départ, à ajuster en mesure :

```
ARENA_W: 4800   // x3 par rapport a l'actuel
ARENA_H: 2700   // x3
VIEW_W: 1600    // taille de vue actuelle, inchangee
VIEW_H: 900
```

Un facteur 3 dans chaque dimension donne une surface 9 fois plus grande — assez
pour qu'un aller-retour vers un point de récolte représente un vrai
déplacement, pas un pas de côté. À valider en jouant : si les points de récolte
sont systématiquement visibles depuis le point d'apparition des vagues, le
facteur est insuffisant.

---

## I4. Points de récolte

### Nature

Deux formes, pour varier le geste :

- **Cristaux au sol** — détruits en tirant dessus, quelques PV, immobiles.
- **Amas à activer** — un joueur reste dessus 1,5 s pour les récolter, ce qui
  crée une décision différente (s'arrêter plutôt que tirer en passant).

### Fréquence

« Relativement rares et suffisamment intéressants » — donc pas un revenu
continu, plutôt un événement notable.

```
HARVEST_MIN: 25    // secondes entre deux apparitions
HARVEST_MAX: 45
HARVEST_MAX_GROUND: 4   // plafond simultane sur la carte
HARVEST_YIELD_MIN: 15   // monnaie de manche par point
HARVEST_YIELD_MAX: 35
```

Position tirée aléatoirement sur l'arène, avec une marge minimale par rapport
à la position d'apparition des vagues — sinon les points de récolte
apparaissent systématiquement au centre de l'action et l'exploration n'a pas
lieu d'être.

### Signal

Un point de récolte actif émet un signal visuel repérable à distance (pulsation
lumineuse, couleur distincte de la palette fonctionnelle — proposition : la
même teinte or que les cartes légendaires, pour créer une association
« rareté et valeur » cohérente dans tout le jeu) et un indicateur de direction
similaire à celui des coéquipiers, mais optionnel dans l'affichage (activable,
pour ne pas réduire l'exploration à du suivi de flèche).

---

## I5. La monnaie de manche

### Principe

**Non persistante.** Elle n'existe que pour la partie en cours, se
remet à zéro à chaque nouvelle manche, et ne transite jamais par
`data/progress.json`. C'est la distinction fondamentale avec les noyaux du
Terminal (lot H) : l'une est un investissement de session, l'autre un
investissement de compte.

```js
// dans GameState, pas dans progression.js
this.runCurrency = 0;
```

Nom proposé, cohérent avec le vocabulaire déjà en place (noyaux pour la méta) :
les **éclats**. Une monnaie de manche qui se dépense avant la fin de la partie,
au marchand (lot K).

### Répartition

Comme pour l'expérience d'équipe, **versée à l'équipe entière**, pas seulement
au joueur qui a détruit le point de récolte. Sinon on retombe sur le défaut
déjà identifié pour l'expérience individuelle : celui qui explore prend le
risque, celui qui reste au contact du groupe subit une pénalité de revenu sans
justification de gameplay.

---

## I6. Rééquilibrage des vagues

L'équipe a noté : *« il faudra probablement rééquilibrer certaines vagues pour
conserver un bon rythme »*.

Le modèle de fin de vague ne change pas, mais deux paramètres doivent être
revus parce que l'espace change :

**Le temps d'apparition à un point donné.** Le budget d'ennemis reste le même,
mais s'ils apparaissent sur une zone 9 fois plus grande, le temps pour qu'un
joueur les rencontre tous s'allonge. `_spawnPoint()` doit continuer à générer
des positions **autour des joueurs actifs**, pas uniformément sur toute
l'arène — sinon la moitié du budget apparaît hors de portée et la vague traîne
sans raison de gameplay.

**Le seuil de traque des retardataires** (`WAVE_STRAGGLER_DELAY`,
`WAVE_STRAGGLER_SPEED`) doit être revu à la baisse : un ennemi isolé sur une
arène 9 fois plus grande met plus longtemps à retrouver un joueur par ses
propres moyens.

Proposition de départ à mesurer :

```
WAVE_STRAGGLER_DELAY: 8 -> 5     // secondes avant traque
WAVE_STRAGGLER_SPEED: 1.6 -> 2.0
```

---

## I7. Mesures

| mesure | attendu |
|---|---|
| images par seconde avec culling actif, 220 ennemis dispersés | pas de chute sous 60 |
| durée moyenne d'une vague, avant / après | écart inférieur à 15 % |
| taux d'exploration observé (bots simulant un comportement mixte) | à définir en jouant, pas en simulation |
| éclats gagnés sur une manche moyenne | à calibrer une fois le lot K écrit |

## I8. Critères d'acceptation

- Chaque client affiche sa propre vue, centrée sur sa position.
- Aucune entité n'est dessinée en coordonnées monde brutes hors du point de
  passage `worldToScreen`.
- Les flèches de coéquipier pointent correctement même en diagonale et près
  des coins de l'arène.
- Le culling ne fait disparaître aucune entité de façon visible à l'œil (test
  sur la marge).
- La monnaie de manche ne survit jamais à la fin d'une manche.
- Un point de récolte n'apparaît jamais à moins d'une distance minimale du
  point d'apparition des vagues en cours.
