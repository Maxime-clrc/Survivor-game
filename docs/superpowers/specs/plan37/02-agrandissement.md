# 02 · 9600 × 5400

## Ce que ça change

`CFG.ARENA_W` et `CFG.ARENA_H` passent à **9600 × 5400** — un 2 × 2 de régions,
chacune de la taille de l'arène d'aujourd'hui.

Chaque région continue de paver ses **3 × 3 cellules** de vue avec sa table et ses
quatre orientations miroir. Ce qui est neuf est au-dessus : quelle table pour
quelle région, et l'accord des quatre arêtes internes.

## Ce qui ne coûte rien, et il faut le savoir

Le plan 31 a retiré les deux coûts de surface. Après lui, **la taille de l'arène
n'apparaît plus dans aucun coût de boucle**, ni client ni serveur :

- `_grille()` est bâtie sur la boîte occupée — 432 cases, indépendant de l'arène ;
- `diffuser()` est fenêtré sur la boîte d'apparition — constant ;
- le réseau est filtré par vue ;
- le sol est un motif répété sur la vue ;
- les props bouclent sur les cellules de la caméra.

Il ne reste que de la **mémoire** — les tableaux d'obstacles et de dangers,
quelques centaines de kilo-octets — et du temps de génération, une fois par
manche.

**Le critère d'acceptation du lot est donc une non-mesure** : rien ne doit bouger.

## Ce qui change vraiment, et ce n'est pas technique

**Le temps de déplacement sans rencontre.** C'est le seul vrai risque d'une map
quatre fois plus grande, et il ne se règle pas avec du code.

Les trois réponses existent et elles sont déjà écrites :

- les **bornes de contrat** (plan 34) — trois à cinq par manche ;
- les **mini-boss** (plan 35) — deux à quatre, avec une fenêtre de présence
  généreuse précisément pour être croisés ;
- les **cristaux** — `HARVEST_PLAYER_DIST = 1100` les fait déjà naître près d'un
  joueur, donc ils suivent.

**C'est la mesure de densité d'intérêt qu'il faut relever**, pas la mesure CPU :
combien de secondes s'écoulent entre deux choses qui valent le détour. Le compte
rendu du plan 32 doit pouvoir y répondre, et si la réponse est mauvaise, le levier
est le nombre de bornes — pas la taille de la map.

## Le boss dans une région

`this.bounds` sait **déjà** borner une sous-arène : `_atkDamier`, `_atkCouronne`,
`_atkCouloirs`, `_arena`, `shrink` et `walls` lisent `bounds`, pas
`CFG.ARENA_*`. Confiner un boss à une région ne demande **aucune** réécriture de
mécanique.

Et « le Tisseur apparaît toujours dans les soutes » est le genre de chose qui se
retient. C'est gratuit, et c'est une identité de plus.

*À trancher en écrivant* : la région du boss est-elle tirée de la graine, ou
est-ce celle où l'équipe se trouve ? La seconde évite un déplacement forcé ; la
première rend la manche rejouable.

## Les vingt-cinq lectures de `ARENA_W`

Il n'y en a que vingt-cinq dans tout `game_state.js` — la simulation est
majoritairement pilotée par `this.bounds`. Elles sont à relire une par une : la
plupart sont des bornes de placement, quelques-unes des centres.

`_spawnQuarry()` en est une : elle pose la proie à `(ARENA_W / 2, 120)`. Elle est
remplacée au plan 35, mais si l'ordre change, c'est un point à corriger ici.

## Critère d'acceptation

1. **Rien ne bouge en performance.** `_grille()` et `diffuser()` gardent leurs
   valeurs du plan 31, à 9600 × 5400 comme à 4800 × 2700. C'est le critère
   principal : s'ils bougent, le plan 31 n'a pas fait son travail.
2. `verifierPopulation` reste vert : la horde suit toujours les joueurs.
3. Le banc de séparation reste dans ses bornes — rapport ≤ 1,4, population dans
   ±25 %.
4. La densité d'intérêt est **relevée et écrite**, même si aucun seuil n'est encore
   fixé. On ne peut pas régler ce qu'on n'a pas mesuré une fois.
5. Le boss confiné à une région ne casse aucune de ses six mécaniques.

## Nature de la tâche

Deux constantes, vingt-cinq relectures, et une campagne de mesure. Le relevé des
vingt-cinq se délègue ; la campagne et son interprétation sont au fil principal.
