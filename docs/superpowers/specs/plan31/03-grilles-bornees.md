# 03 · Deux structures couvrent l'arène, la horde occupe une boîte

## Ce que la mesure dit

`sim/grille.mjs` et `sim/nav.mjs`. Deux structures, un seul défaut : leur coût est
indexé sur `CFG.ARENA_W × CFG.ARENA_H`, alors que ce qu'elles décrivent tient dans
la boîte des joueurs.

### `_grille()` — le coût ne bouge pas avec la population

| arène | cases | 200 corps | 600 corps |
|---|---:|---:|---:|
| 4800 × 2700 | 3 225 | 17,4 µs | **16,6 µs** |
| 9600 × 5400 (**la cible**) | 12 750 | 36,1 µs | 44,9 µs |

Tripler la population laisse le coût inchangé sur l'arène actuelle. C'est la
signature d'une structure dominée par sa partie vide : `start.fill(0, 0, cells+1)`
puis la somme préfixe `for (let c = 0; c < cells; c++) start[c+1] += start[c]`
balaient les 3 225 cases quel que soit le nombre de corps — et l'écrasante
majorité sont vides, puisque la horde naît dans `_spawnBox()` et n'en sort pas.

Trois appels par tick (`_separateEnemies`, `_separateFromPlayers`, `_relaisPass`)
à 60 Hz : **3,1 ms/s** par salle aujourd'hui, **6,5 ms/s** à la cible, avec
`ROOM_MAX = 16`.

### `diffuser()` — le coût de surface, multiplié par l'effectif

| arène | cases | une diffusion | 4 joueurs à 5 Hz |
|---|---:|---:|---:|
| 4800 × 2700 | 8 160 | 443 µs | 8,87 ms/s |
| 9600 × 5400 (**la cible**) | 32 400 | **1 510 µs** | **30,20 ms/s** |

La pointe compte plus que la moyenne : **1,5 ms pour une diffusion** à la cible,
quatre champs pouvant échoir dans le même tick, pour un budget de 16,6 ms.

## Pourquoi `REBUILD_MIN` n'est pas le levier

`NAV_CFG.REBUILD_MIN = 0,2 s` porte sa mesure dans le commentaire du module :
*« un joueur à 150 px/s traverse une case en 0,27 s »*. Le relever fait suivre la
horde à un champ périmé, et le rattrapage local (`LOS_PERIOD`, `NEAR = 96`) ne
couvre que la dernière foulée.

**Le levier est la surface, pas la fréquence.**

## Ce que la recherche donne, et pourquoi on fait plus simple

Le domaine est documenté : Supreme Commander 2 (Elijah Emerson, *Game AI Pro*,
ch. 23), Planetary Annihilation, et les moteurs récents convergent sur le même
principe — **découper la carte en secteurs, ne calculer le champ que pour les
secteurs contenant des agents**, avec un graphe de **portails** entre secteurs pour
les trajets longs. Raffinement classique : un secteur entièrement libre référence
un champ « dégagé » partagé au lieu d'allouer le sien.

**Le cas de Survivor LAN est plus simple, et c'est décisif.** Dans un RTS, une
unité peut être à l'autre bout de la carte de son objectif — d'où les portails.
Ici, **les ennemis n'existent que dans `_spawnBox()`**, c'est-à-dire autour des
joueurs. Un corps n'est jamais loin de sa cible, donc **il n'y a jamais de trajet
long à planifier**.

Pas de secteurs, pas de portails, pas de graphe hiérarchique. Une fenêtre.

## Ce qui change

### C1 — `_grille()` se bâtit sur la boîte occupée

La grille prend une origine et des dimensions au lieu de partir de (0, 0) :

```
x0   = min(x des corps, x des joueurs) - cell
y0   = min(y ...)                      - cell
cols = ceil((x1 - x0) / cell)   rows = ceil((y1 - y0) / cell)
```

`celluleDe` devient `floor((x - x0) / cell)`. La somme préfixe, `items` et `at` ne
bougent pas d'une ligne.

**Le piège** : la marge d'une cellule n'est pas décorative. `_separateFromPlayers`
et `_relaisPass` interrogent le **voisinage** d'une cellule ; sans marge, un corps
au bord de la boîte cherche un voisin à un indice hors tableau et la séparation
échoue **en silence**.

Gain attendu : en groupe, la boîte occupée fait au plus `VIEW + 2 × SPAWN_MARGIN`,
soit ≈ 1 720 × 1 020 — **432 cases au lieu de 3 225**, et cette valeur **cesse de
dépendre de la taille de l'arène**.

*Interaction avec le lot 04 : avec plusieurs groupes, la boîte occupée est
l'englobante de tous. Elle reste très inférieure à l'arène, mais le gain est
moindre quand l'équipe est éclatée. Une grille par groupe serait le raffinement ;
elle n'est pas nécessaire tant que la mesure ci-dessous passe.*

### C2 — `diffuser()` s'alloue sur une fenêtre ancrée sur sa source

Deux façons de l'écrire, et **la seconde est la bonne** :

- **borner la distance de Dial** — le plafond existe déjà
  (`(cols + rows) × COUT_DIAG + 8`). Simple, mais `dist` reste alloué sur toute la
  grille et le `dist.fill(NAV_INF)` d'ouverture reste en O(cases) : on ne retire
  que la moitié du coût ;
- **allouer le champ sur une sous-grille** ancrée sur la source, comme `_grille()`
  ci-dessus. `dist`, `buckets` et le `fill` suivent tous la fenêtre.

Taille de fenêtre : la demi-diagonale de la boîte d'apparition, plus une marge.

La sous-grille demande que `viser()` et `libreProche()` sachent lire une origine.
**`nav.bloque` reste plein arène** : il est bâti une fois par manche
(`this._navG`), il n'est pas dans la boucle, et le refaire par fenêtre coûterait
plus qu'il ne rend.

**Contrepartie assumée** : un corps hors fenêtre n'a plus de champ et retombe sur
le comportement `NEAR` — viser en droite ligne. C'est déjà ce que fait tout corps
à moins de 96 px, et un corps à 2 000 px de sa cible n'a pas d'obstacle à
contourner qui vaille 1,5 ms. Le lot 04 rend d'ailleurs ce cas rare : un corps
très loin de tout joueur sera recyclé.

## Critère d'acceptation

`verifierGrilles()`, en mode rapide :

1. **couverture** — 500 corps tirés dans l'arène ; pour chaque paire à moins de
   `POSTE_ECART`, la grille bornée la trouve. Zéro paire manquée.
2. **bord** — quatre corps posés exactement aux quatre coins de la boîte occupée ;
   chacun trouve ses voisins. C'est le test de la marge.
3. **coût** — `_grille()` sous **20 µs** à 600 corps, **et cette valeur ne bouge
   pas** quand on double `CFG.ARENA_W` et `CFG.ARENA_H` dans le banc. C'est le
   critère qui dit que le défaut est **retiré**, pas atténué.
4. **navigation** — `verifierNavigation()` (existant : cloison de 32 px, passage
   de 80 px, sur les trois modes) reste vert avec le champ fenêtré. Il teste
   précisément ce que la fenêtre pourrait casser.
5. **coût de diffusion** — `diffuser()` sous **500 µs**, et **invariant** au
   doublement de l'arène dans le banc.

Le point 3 et le point 5 sont la raison d'être du lot. Une amélioration qui
resterait proportionnelle à la surface n'aurait rien réglé.

## Ce que ce lot ne fait pas

Il **ne touche pas** `_statIndex()`, lui aussi dimensionné sur l'arène
(`cols = ceil(ARENA_W / cell)`), mais **bâti une seule fois par manche** et mis en
cache dans `this._statG`. C'est de la mémoire, pas du temps : quelques dizaines de
kilo-octets par salle à la cible. À noter, pas à corriger.

Il **n'agrandit pas l'arène**. `CFG.ARENA_W / ARENA_H` ne bougent pas.

## Nature de la tâche

Logique de simulation avec invariants croisés — la marge, le repli `NEAR`, et les
deux pièges de calage déjà payés dans `navigation.js`. **Fil principal.** Le
relevé des appelants de `celluleDe`, `viser` et `libreProche` se délègue.
