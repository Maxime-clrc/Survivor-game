# Lot A — le plafond de population

**Prérequis :** la grille spatiale de séparation (chantier de perf en cours).
Le lot A est ce que ce chantier finance : sans lui, on ne peut pas relever le
plafond, et sans plafond relevé, rien du reste du plan ne tient.

## Constat

C'est écrit dans `timeline.js` (« CES DÉBITS SONT INOPÉRANTS DÈS LA 5e MINUTE »),
mais la portée du constat dépasse le script. Une fois `CFG.MAX_ENEMIES` atteint,
`_spawnEnemy` rend `null` et **trois systèmes s'éteignent en même temps** :

| système | valeur écrite | effet réel après la minute 5-10 |
|---|---|---|
| `SCRIPT` segments 4/5/6 | débits 2,2 → 5,0 | aucun — le plafond mord |
| `DIFFICULTIES[i].spawn` | 0,80 / 1,00 / 1,28 | aucun — les trois modes convergent |
| `WAVE_CROWD_EXP` (0,75) | ×2,83 à quatre joueurs | aucun sur la horde |

Le dernier est le plus coûteux, parce qu'il n'est éteint **que d'un côté** :
`_addXp` divise toujours le gain par `joueurs^0,75` alors que la contrepartie —
une horde 2,83 fois plus dense — n'arrive jamais. **Jouer à quatre est
aujourd'hui une taxe pure sur la progression.** La mesure du lot X le montrait
déjà (26 / 22 / 24 cartes à 1, 2 et 4 joueurs) et l'avait mise sur le compte de
l'écart-type ; ce n'en est pas.

## Décision

`MAX_ENEMIES` cesse d'être une constante et devient une fonction de la
**difficulté** et de l'**effectif**. C'est le seul levier qui change réellement
ce qu'il y a à l'écran une fois que le plafond mord.

```js
// CFG — remplace MAX_ENEMIES: 200
MAX_ENEMIES_BASE: 220,
MAX_ENEMIES_DIFF: [0.80, 1.00, 1.45],   // même ordre que DIFFICULTIES
MAX_ENEMIES_HARD_CAP: 900,              // limite du MOTEUR, pas du design
```

```js
_enemyCap() {
  const d = CFG.MAX_ENEMIES_DIFF[this.diffIndex] ?? 1;
  const crowd = Math.pow(Math.max(1, this.players.size), CFG.WAVE_CROWD_EXP);
  return Math.min(CFG.MAX_ENEMIES_HARD_CAP,
    Math.round(CFG.MAX_ENEMIES_BASE * d * crowd));
}
```

Plafond effectif par table :

| | solo | 2 joueurs | 3 joueurs | 4 joueurs |
|---|---|---|---|---|
| calme | 176 | 296 | 401 | 498 |
| normal | 220 | 370 | 501 | 622 |
| cauchemar | 319 | 536 | 727 | 900 (borné) |

`MAX_ENEMIES_HARD_CAP` est une limite de moteur et doit rester documentée comme
telle : **c'est la seule valeur du lot qu'on ajuste en regardant un profileur et
non une partie.** Elle ne mord qu'en cauchemar à quatre.

## Ce que ça débloque

- les débits 3,0 → 5,0 des segments 4/5/6 redeviennent opérants ;
- `diff.spawn` retrouve un effet en fin de manche ;
- `WAVE_CROWD_EXP` s'applique enfin **des deux côtés** : la division de l'XP
  dans `_addXp` cesse d'être une taxe et redevient une normalisation.

## Critères d'acceptation

1. Le plafond n'est atteint **avant la minute 12** dans aucune configuration
   (mesure : temps de première saturation, par difficulté × effectif).
2. Sur les six segments, la population moyenne suit une courbe **monotone
   croissante** — aujourd'hui elle est plate à partir du segment 2.
3. Aucune image au-dessus de **16 ms** de temps de simulation serveur à plafond
   plein, sur la machine de référence.
4. Le nombre de cartes obtenues par joueur devient **égal à ±2 entre 1 et 4
   joueurs** (aujourd'hui 26 / 22 / 24 — l'écart est structurel, pas du bruit).

## A-2 · La dette que ce lot crée

Deux systèmes ont été calibrés **en sachant** que le plafond valait 200. Les
recalibrer fait partie du lot, pas d'un suivi.

**Les débits du `SCRIPT`.** Les segments 4/5/6 (2,2 à 5,0/s) ont été écrits en
sachant qu'ils étaient inopérants. Ils redeviennent réels : à vérifier qu'un
débit de 5,0/s remplit effectivement un plafond de 622, et que la montée entre
segments reste lisible plutôt qu'instantanée.

**La traversabilité de la horde.** `verifierBiomes()` ne parle que des obstacles
statiques. À 622 corps qui se repoussent, le mur mobile devient une contrainte de
déplacement que personne n'a mesurée — et c'est la promesse du lot B qui en
dépend. Critère porté par **[B](B-bestiaire.md)**, mesure à faire en même temps
que le profilage.

**Les plafonds de traits.** `TRAIT_CFG.TRAIL_MAX = 18` est justifié dans le code
par « deux cents ennemis à traînée ». À 622, la traînée disparaît en tant que
menace. Traité au **[lot J](J-traits.md)**, qui est pour cette raison une
dépendance de A et non un lot parallèle.

## Risque

C'est le seul lot du plan qui peut casser la performance. Le repli est trivial
(`MAX_ENEMIES_BASE` redescendu) mais il faut mesurer **avant** les autres lots :
B et C se calibrent sur la densité obtenue ici.
