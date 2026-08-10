# Lot B ??? le bestiaire : vitesse, dégâts, difficultés

Lot ajouté après relevé du calcul d'apparition (`_spawnEnemy`). Il traite le
défaut le plus ressenti manette en main : **on ne peut pas semer la horde.**

## Constat 1 ??? la rampe de vitesse est plate, additive, et efface le bestiaire

```js
speed: (t.speed * (0.9 + Math.random() * 0.2) + past * CFG.ENEMY_SPEED_MIN_RAMP)
```

`ENEMY_SPEED_MIN_RAMP = 4` px/s par minute, **en addition** et **identique pour
tous les types**. À la minute 30, chaque ennemi du jeu gagne 120 px/s.

| type | base | minute 30 | gain |
|---|---|---|---|
| tank | 52 | 172 | **+231 %** |
| bulwark | 58 | 178 | +207 % |
| shooter | 62 | 182 | +194 % |
| grunt | 95 | 215 | +126 % |
| kamikaze | 118 | 238 | +102 % |
| **runner** | **245** | **365** | +49 % |

Deux conséquences.

**Le joueur ne peut plus fuir.** `PLAYER_SPEED = 260`. Un runner naît déjà à
94 % de la vitesse du joueur ; à la minute 30 il est à **140 %**. Même une build
lourdement investie en mobilité (`Foulée` ×5, `Semelles`, `Célérité`, `Rodage`)
plafonne vers 380-400 ??? elle ne fait que rattraper. Le décrochage, qui est
l'argument même de la grande arène du lot I (« la respiration vient du
DÉPLACEMENT »), **n'existe plus passé la mi-manche**.

**Le bestiaire se dissout.** Le rapport de vitesse entre le type le plus lent et
le plus rapide passe de **4,7×** à la minute 1 à **2,1×** à la minute 30. Une
rampe additive uniforme est mathématiquement une compression : elle rapproche
tout le monde de la moyenne, ce qui est le contraire d'un bestiaire. Un tank,
dont l'identité entière est « lent et résistant », finit la manche plus rapide
qu'un grunt du début.

## Constat 2 ??? la vitesse ne distingue pas les difficultés

`DIFFICULTIES` porte quatre multiplicateurs : `hp`, `spawn`, `dmg`, `boss`.
**Aucun sur la vitesse.** Un runner de « calme » et un runner de « cauchemar »
se déplacent exactement à la même allure. Or la vitesse décide si une menace est
lisible : c'est le premier levier qu'on attend d'un mode d'apprentissage, et il
n'existe pas.

## Constat 3 ??? les dégâts de contact ne s'additionnent pas

**Question tranchée par lecture du code**, elle était ouverte dans la version
précédente du plan. `hitCd` est porté par le **joueur** (`p.hitCd`), pas par le
couple (joueur, ennemi) :

```js
if (!ignoreCooldown && p.hitCd > 0) return;
// ...
if (!overTime) p.hitCd = CFG.PLAYER_HIT_CD;
```

Conséquence : **être encerclé par vingt runners fait exactement les mêmes dégâts
qu'en affronter un seul.** Le contact est plafonné à `dmg / 0,55` quel que soit
le nombre d'assaillants.

| | dégâts/s | temps pour tuer 100 PV |
|---|---|---|
| runner `dmg: 12`, normal | 21,8 | **4,6 s** |
| runner `dmg: 12`, cauchemar (×1,25) | 27,3 | **3,7 s** |
| runner `dmg: 7`, normal | 12,7 | 7,9 s |
| runner `dmg: 7`, cauchemar | 15,9 | 6,3 s |

Cela **réordonne le lot** : puisque la foule ne multiplie pas les dégâts, le
danger du runner n'est pas sa frappe, c'est qu'**il interdit de partir**. La
correction de vitesse est donc le levier principal ; la baisse de dégâts est un
réglage de confort qui double la fenêtre de réaction.

*Note pour plus tard, hors périmètre :* les dégâts appliqués sont ceux du
**premier ennemi rencontré dans la boucle**, pas du plus dangereux. Un joueur
collé à un tank et à cinq runners subit tantôt 30, tantôt 12, sans logique
lisible. Ce n'est pas un défaut d'équilibrage mais de lisibilité, à traiter
séparément.

## Décisions

### 1. La rampe devient multiplicative et par type

```js
// remplace ENEMY_SPEED_MIN_RAMP: 4
ENEMY_SPEED_RAMP_PCT: 0.007,   // +21 % à la minute 30, proportionnel au type
```

```js
speed: t.speed * (0.9 + Math.random() * 0.2)
     * (1 + past * CFG.ENEMY_SPEED_RAMP_PCT)
     * (this.diff.speed ?? 1)
     * (elite ? CFG.ELITE_SPEED_MUL : 1)
```

Le rapport lent/rapide est **conservé** sur toute la manche : un tank reste un
tank, un runner reste un runner, et la rampe se sent sans effacer personne.

### 2. Un multiplicateur de vitesse par difficulté

```js
calme:     { hp: 0.78, spawn: 0.80, dmg: 0.80, boss: 0.75, speed: 0.85 },
normal:    { hp: 1.00, spawn: 1.00, dmg: 1.00, boss: 1.00, speed: 1.00 },
cauchemar: { hp: 1.25, spawn: 1.28, dmg: 1.25, boss: 1.25, speed: 1.12 },
```

### 3. La doctrine de plafond ??? la décision qui compte

> **Aucun type de horde ne dépasse 90 % de `PLAYER_SPEED` à aucun moment de la
> manche, dans aucune difficulté.**

C'est la règle qui garantit qu'il reste toujours quelque chose à semer. Elle ne
s'applique **pas** aux boss ni aux invocations de mécanique, qui doivent pouvoir
rattraper ??? c'est leur rôle, et le joueur y a des murs et des zones sûres.

Conséquence directe sur le runner :

| | base actuelle | base proposée | minute 30, cauchemar |
|---|---|---|---|
| runner | 245 (94 % du joueur) | **196** (75 %) | 234 = **90 %** ??? |
| grunt | 95 | 95 | 113 |
| tank | 52 | 52 | 62 |
| kamikaze | 118 | 118 | 141 |

### 4. Le runner, ce qu'il doit être

Le ramener à 196 ne suffit pas : c'est **le deuxième type le plus fréquent** du
jeu (`weight 0.55`, `share 0.45`), il arrive dès la minute 1.

Sa fonction dans le bestiaire doit être de **déplacer le joueur**, pas de
l'user ??? c'est le type qui punit de rester immobile, là où le tank punit de fuir
sans tirer.

```js
{ key: "runner", speed: 196, dmg: 7, hpMul: 0.40, ... }   // speed 245, dmg 12
```

La mort par runner cesse d'être un accident et devient une **erreur de
positionnement prolongée**, la seule mort qu'un joueur accepte.

## Ce que le lot NE fait pas

**Aucune statistique d'ennemi ne varie avec l'effectif.** La tentation est là ???
« le runner tue trop en solo » ??? et il faut y résister : des stats de monstre
indexées sur le nombre de joueurs, c'est un scaler dont l'entrée est l'état de
l'équipe, donc le principe 2 s'applique. Ce qui varie avec l'effectif reste la
**quantité** (lot A) et la **géométrie** (`adaptEntry`).

Si le solo reste trop dur après A + B, le levier est `MAX_ENEMIES_BASE` ou
`WAVE_CROWD_EXP`, jamais la fiche du runner.

## Critères d'acceptation

1. **Doctrine du plafond respectée** : script de vérification sur les trois
   difficultés × 30 minutes, listant tout type dépassant `0,90 × PLAYER_SPEED`.
   À écrire sur le modèle de `verifierScript()` et `verifierBiomes()` ??? même
   rôle, même forme, rejouable.
2. **Spread conservé** : le rapport lent/rapide ne descend pas sous **3,5×** à
   la minute 30 (il est à 2,1× aujourd'hui).
3. Un joueur **sans aucune carte de mobilité** peut décrocher d'un paquet à la
   minute 25, dans les trois modes.
4. La mort médiane en solo n'arrive plus avant le segment 3.
5. **Le joueur peut traverser un paquet d'ennemis.** `verifierBiomes()` garantit
   un passage entre les obstacles **statiques** ; rien ne garantit qu'il en
   existe un entre les **corps**, qui se repoussent entre eux et forment un mur
   mobile. À 200 ennemis il est franchissable ; à 622 (lot A), personne ne le
   sait. **On ne fuit pas ce qu'on ne peut pas contourner** : un runner à 196 px/s
   ne sert à rien si le joueur est enfermé dans une poche de corps.
   *Mesure : temps de sortie d'un encerclement, à plafond plein, par difficulté
   et par effectif — la doctrine des 90 % est vide sans ce chiffre.*
