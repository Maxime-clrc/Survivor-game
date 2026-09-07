# 02 · Le hasard appartient à la salle, pas au processus

## Le constat

La graine existe : `new GameState(diffIndex, biomeIndex, seed)`, et `this.seed`
pilote `buildBiome()` et `weatherFor()`. Deux manches de même graine ont donc **le
même terrain**. Elles n'ont rien d'autre en commun.

| fichier | portée | appels à `Math.random` |
|---|---|---:|
| `game_state.js` lignes 1-8854 | **simulation** | **91** |
| `game_state.js` lignes 8855-12129 | mesure / vérification | 46 |
| `cards.js` | tirage d'offre | 1 |
| `room.js` | attribution, mélange | 3 |

Les 91 de la simulation couvrent `_pickType`, `_spawnEnemy`, `_spawnGeom`,
`_edgePoint`, `_ringPoint`, `_spawner` (cadence d'élite), `_randomPowerupType`,
`_powerups`, `_harvests`, `_harvestPoint`, `_harvestYield`, `_killEnemy`,
`_pickBoss`, `_pickAtk`, `_bossMove`, `_bossBars`, `_atkDamier` (parité) et
vingt-deux autres attaques de boss.

## Le piège déjà payé, et il est en production

Six campagnes de mesure sèment en **écrasant la fonction globale** :

```js
// game_state.js:10096
const alea = Math.random;
Math.random = grainer(r * 7919);
```

Correct pour un script à une seule `GameState`. Faux dès qu'il y en a deux, et
`hub.js` en tient **seize** (`ROOM_MAX = 16`) dans le même processus, avancées par
la même boucle de `room.js`. Il n'existe aujourd'hui **aucun moyen** d'imposer une
graine à une salle sans l'imposer aux quinze autres.

Et `grainer()` (`game_state.js:10082`) est une recopie exacte de `rng()`
(`biomes.js:211`) : le même mulberry32, écrit deux fois dans le dépôt.

## Ce que ça débloque, et qui vient plus tard

Sans ce lot, **rien de ce que le plan de décisions prévoit n'est reproductible** :

- les **variantes de biome** tirées de la graine ;
- les **mini-boss** dont le nombre, les instants et les positions sont figés à la
  construction ;
- le **mode custom** comme banc : même graine, un mutateur changé, deux comptes
  rendus comparables ;
- le **Director**, qui doit être déterministe sous peine de faire diverger deux
  manches identiques ;
- les **challenges à graine imposée**, si jamais ils arrivent.

Ce lot ne livre que la propriété. **Personne ne la voit.**

## Ce qui change

### 1 · Une source unique, portée par l'état

`shared/biomes.js` exporte déjà `mulberry32(seed)`. `GameState` prend un
générateur en champ, dérivé de sa propre graine :

```js
this.alea = mulberry32(this.seed ^ 0x9E3779B9);
```

Le décalage évite que le terrain et le déroulé partagent la même suite : deux
manches de même graine sur des biomes forcés différents doivent rester
comparables.

**`grainer()` est supprimé, pas déplacé.** C'est un doublon, et un doublon de
générateur est exactement le genre de champ qui dérive en silence.

### 2 · Les 91 appels de simulation passent par `this.alea`

Substitution mécanique. Deux points demandent une décision, pas une frappe :

- **`cards.js` et `reliques.js` ne connaissent pas `GameState`** et ne doivent pas
  le connaître — la règle des couches veut qu'ils ne dépendent de rien sauf
  `i18n.js`. `offerCards` et `_offerRelics` reçoivent donc le générateur **en
  argument**, comme `buildBiome` reçoit déjà sa graine ;
- **`room.js`** sème l'attribution des couleurs et le mélange des armes proposées.
  Ce sont des décisions **hors manche** : elles restent sur `Math.random`. Le
  déterminisme porte sur la simulation, pas sur le salon.

### 3 · Les campagnes cessent d'écraser le global

`mesureProgression`, `mesureTTK`, `mesureArmes`, `mesureContribution`,
`mesurePuissanceBoss` et `mesureComposition` passent la graine au constructeur au
lieu de la poser sur `Math.random`. C'est **moins** de code : le `try/finally` de
restauration disparaît.

## Ce qu'une graine garantit, et ce qu'elle ne garantit pas

À écrire dans `docs/regles/SIMULATION.md`, parce que la confusion est facile :

> Une graine identique donne le **même contenu** — même terrain, même composition
> de horde, mêmes instants d'élite, mêmes attaques de boss. Elle ne donne jamais
> le **même résultat** : les entrées des joueurs restent des entrées.

C'est exactement ce qu'un challenge quotidien demande, et c'est aussi la raison
pour laquelle le contrat, tiré à l'activation d'une borne, sort volontairement du
domaine rejouable (décisions, §XIV) : la borne est dans la graine, son contenu ne
l'est pas.

## Critère d'acceptation

`verifierDeterminisme()` dans `verif.js`, en mode `--tout` :

```
deux GameState de meme graine, memes entrees scriptees, 600 s
  → meme time, level, xp, totalKills, bossCount
  → meme empreinte de horde : somme des (type, elite, cellule de 200 px)
  → ET les deux etats sont avances EN ALTERNANCE dans la meme boucle
```

**La dernière ligne est le critère qui compte.** Deux états avancés l'un après
l'autre passeraient même avec un générateur global ; alternés, ils ne passent que
si chacun porte le sien. C'est la panne de production, et c'est elle qu'on teste.

Coût : 600 s de simulation pure valent ≈ 1 s de CPU, donc deux valent 2 s. Le
vérificateur va en `--tout`, pas dans la suite rapide qui tient en 12 s.

**Non-régression obligatoire.** Après substitution, rejouer la suite complète :
`verifierScript`, `verifierBiomes`, `verifierPopulation`, `verifierProgression`,
`verifierEquilibreArmes`, `verifierTirageBonus`, `verifierRythmeBonus`. Un
générateur changé décale toutes les suites de tirage — les mesures ne doivent pas
sortir de leurs bornes, mais elles **bougeront**, et il faut savoir de combien
avant de croire à une régression.

## Nature de la tâche

| étape | qui |
|---|---|
| relevé des 91 sites et de leur méthode | investigator |
| substitution mécanique `Math.random` → `this.alea` | builder |
| signature de `offerCards` / `_offerRelics`, suppression de `grainer`, vérificateur, relevé des écarts de mesure | **fil principal** |

La substitution est de la frappe une fois la décision prise. Le passage du
générateur à travers la frontière `game_state` → `cards` touche une règle
d'architecture : il ne se délègue pas.
