# Plan 31 — les fondations

**Adossé à `decisions-2026-09-03.md` v7.** Trois mesures rejouables dans `sim/`.

Ce plan **n'ajoute aucun contenu visible**, à une exception près : le classement,
qui rend fonctionnel quelque chose de déjà écrit. Tout le reste est du socle —
les trois chantiers de contenu (contrats, mini-boss et loot, Director) reposent
dessus, et aucun ne se mesure sans lui.

Principe hérité du plan 30, et il vaut toujours : **on ne calibre pas un système
contre une base qu'on s'apprête à changer.**

---

## Ordre des lots, et pourquoi

```
01 classement            isole, petit, debloque un systeme ecrit a 95 %
02 determinisme          EN AMONT : sans lui, rien de ce qui suit ne se mesure
                         a graines appariees
03 grilles bornees       le cout de surface, retire AVANT d agrandir
04 horde par groupe      un defaut ACTUEL, mesure, qui empire avec la map
05 chevron unique        un doublon a resoudre avant d y brancher le ping
06 doctrine XP           pas de code : une regle a ecrire, et elle contraint
                         les plans 32 et suivants
```

Le lot 02 vient tôt parce que **tout le reste se mesure**. Les lots 03, 04 et 05
sont indépendants entre eux. Le lot 06 n'écrit aucune ligne de code.

## Les quatre mesures qui pilotent ce plan

### M1 — Le classement n'enregistre presque rien

`hub.js`, une condition :

```js
if (state.victory && state.finalKill > 0) { ... recordFinal(pr, { ... }); }
```

`recordFinal` n'est appelé **que si l'équipe tue le boss final**. Toute autre fin
— mort, abandon, trente minutes sans le coup de grâce — n'écrit aucun record.
Tout le reste de la chaîne existe et est bon : `classement()` regroupe par
difficulté × effectif et dédoublonne une manche d'équipe en une ligne,
`hub.js` répond au message `leaderboard`, `renderBoard()` affiche quatre sections
avec le joueur surligné. **Le système est écrit à 95 % et il ne montre rien.**
→ **lot 01**

### M2 — Le banc sème par une variable GLOBALE

`mesureProgression()` et cinq autres campagnes font littéralement :

```js
const alea = Math.random;
Math.random = grainer(r * 7919);
```

Correct pour un script à une seule `GameState`. En production, `hub.js` tient
jusqu'à `ROOM_MAX = 16` salles **dans le même processus**, avancées par la même
boucle. Une seule variable globale pour seize simulations signifie qu'aucune
n'est isolable, et qu'une graine imposée est impossible à honorer.

Inventaire : **91** appels à `Math.random` dans la moitié simulation de
`game_state.js`, 46 dans la moitié mesure, 1 dans `cards.js`, 3 dans `room.js`.
Et `grainer()` (`game_state.js:10082`) est une **recopie** de `rng()`
(`biomes.js:211`) — deux implémentations du même mulberry32.
→ **lot 02**

### M3 — Deux coûts suivent la SURFACE, pas la population

`sim/grille.mjs` et `sim/nav.mjs`.

`_grille()`, 2 000 appels :

| arène | cases | 200 corps | 600 corps |
|---|---:|---:|---:|
| 4800 × 2700 (actuel) | 3 225 | 17,4 µs | **16,6 µs** |
| 6800 × 3820 (×2) | 6 420 | 25,3 µs | 25,8 µs |
| 9600 × 5400 (×4, **la cible**) | 12 750 | 36,1 µs | 44,9 µs |

Tripler la population laisse le coût inchangé : il est **entièrement dans les
cases vides**.

`diffuser()`, une source, grille de 40 px :

| arène | cases | une diffusion | 4 joueurs à 5 Hz |
|---|---:|---:|---:|
| 4800 × 2700 | 8 160 | 443 µs | 8,87 ms/s |
| 9600 × 5400 (**la cible**) | 32 400 | **1 510 µs** | **30,20 ms/s** |

La pointe compte plus que la moyenne : **1,5 ms pour une diffusion**, quatre
champs pouvant échoir dans le même tick, pour un budget de 16,6 ms.
→ **lot 03**

### M4 — Se séparer ne partage pas la horde, il la tire au sort

`sim/separation.mjs`. Deux joueurs invulnérables **maintenus** à écart fixe,
manche réelle depuis t = 0, relevé minutes 10-15 hors boss, corps à moins de
700 px. Trois graines.

| écart | graine | près de A | près de B | rapport | total en jeu |
|---|---|---:|---:|---:|---:|
| 400 px | 3517 | 65,7 | 65,0 | **1,0** | 69 |
| 400 px | 10007 | 45,0 | 45,1 | **1,0** | 55 |
| 3600 px | 7919 | 14,1 | 63,2 | **4,5** | 106 |
| 3600 px | 3517 | 54,5 | 117,2 | **2,2** | 196 |
| 3600 px | 10007 | 136,8 | 36,1 | **3,8** | 200 |

Ensemble, les deux joueurs voient **exactement** la même horde. Séparés, l'un est
noyé et l'autre au chômage, dans un rapport de 2,2 à 4,5 — et **le sens change
avec la graine**. Ce n'est pas un biais de position, c'est un tirage.

Et la population **double ou triple** (55-69 → 106-200) sans que le contact
augmente : les corps en trop sont **en transit**.

`_spawnBox()` construit une seule boîte englobante de tous les joueurs ;
`_edgePoint(side)` en tire un bord d'après `beatSide`, c'est-à-dire d'après le
battement du script, qui ignore où sont les joueurs. **Le défaut est mesuré sur
l'arène actuelle**, à un écart que trois écrans permettent.
→ **lot 04**

## Ce que ce plan ne fait pas

- **`CFG.ARENA_W / ARENA_H` ne bougent pas.** L'agrandissement à 9600 × 5400 est
  un plan ultérieur, et il n'a de sens qu'une fois M3 retiré — sinon on mesurera
  un mélange de causes.
- **Aucun système de contenu** : ni contrat, ni mini-boss, ni loot, ni Director,
  ni mode custom. Ils ont leurs plans.
- **Le ping n'est pas livré**, seulement le doublon qui le bloque (lot 05).
- **La mesure de tension n'est pas ici** : elle part avec l'outillage, au plan
  suivant, et elle ne pilotera rien avant le Director.

## Deux corvées à faire au passage, hors lot

- **`LISEZMOI.md` § Réglages est périmé** : il annonce `ARENA_W/H: 1600 x 900`
  (c'est 4800 × 2700), `BOSS_HP_BASE: 1200` (c'est 520), et une quinzaine de
  constantes `WAVE_*` / `LEVEL_KILLS_*` absentes de `CFG`.
  `npm run constantes-check` attrape une constante sans lecteur, pas une doc qui
  invente une constante. **À régénérer avant la première mesure du lot 02**,
  sinon un lot partira d'une valeur fausse.
- **Le document du plan 30 doit porter sa réserve** : ses valeurs calibrées
  supposent que toute la puissance vient des niveaux, des cartes et des reliques.
  Le loot de run les invalidera, et elles seront à **remesurer, pas à
  reconduire**.
