# Lot H — les boss

**Dépend de C** (`BOSS_POWER_REF` remesuré) et **se lit avec D** (la courbe de
cartes est la référence à laquelle les boss doivent se caler).

Lot ajouté après vérification des points de contact entre les boss et les six
autres lots. La porte fermée du README (« pas de refonte des boss ») était trop
large : elle protégeait à juste titre **les mécaniques**, mais elle laissait
passer trois incohérences de **calibrage**, dont une qui est le défaut exact que
le lot D corrige ailleurs.

---

## H-1 · Les PV de boss sont indexés sur le COMPTEUR, pas sur la minute

### Constat

```js
const hp = CFG.BOSS_HP_BASE * Math.pow(crowd, 1.15)
  * (1 + (this.bossCount - 1) * CFG.BOSS_GROWTH)   // BOSS_GROWTH = 0.06
  * power * CFG.BOSS_HP_MUL * this.diff.boss * def.hpMul;
```

Aucun terme de minute. Les PV d'un boss dépendent de l'effectif, du **numéro du
boss** (+6 % chacun), de la difficulté et du type — jamais du temps écoulé.

Or entre le premier boss et le sixième, le joueur, lui, gagne une vingtaine de
cartes :

| | minute | cartes | puissance joueur | PV du boss |
|---|---|---|---|---|
| boss 1 | ~5 | ~7 | ×1,7 | ×1,00 |
| boss 3 | ~15 | ~15 | ×2,7 | ×1,12 |
| boss 6 | ~30 | ~26 | ×4,5 | ×1,30 |

**La puissance joueur fait ×2,6 pendant que les PV de boss font ×1,30.** Le
sixième boss est proportionnellement **deux fois plus facile** que le premier.

C'est aussi une **incohérence interne** au jeu : la horde, elle, rampe bien sur
la minute (`ENEMY_HP_MIN_RAMP`). Les deux moitiés du contenu ne suivent pas le
même axe, donc les combats de boss deviennent une respiration de plus en plus
confortable au fil d'une manche où la horde, elle, se durcit.

### Décision

Même correction que le lot D, pour la même raison : **indexer sur la minute**,
axe extérieur, fixe et mesurable.

```js
BOSS_GROWTH: 0,                  // neutralisé — la clé reste, elle documente
BOSS_HP_MINUTE_RAMP: 0.055,      // +5,5 % par minute de horde
```

```js
* Math.pow(1 + CFG.BOSS_HP_MINUTE_RAMP, this.hordeMinutes())
```

À la minute 5 : ×1,28. À la minute 30 : ×2,65. Rapport boss 1 → boss 6 :
**×2,07**, contre ×2,6 pour la puissance joueur — l'écart résiduel est voulu, il
laisse la progression se sentir sans annuler la montée en difficulté.

**`BOSS_HP_BASE` est à recalibrer** dans le même geste : à la minute 5 le
nouveau terme vaut déjà ×1,28, donc la base doit baisser d'autant pour que le
premier boss ne change pas.

### Pourquoi pas simplement monter `BOSS_GROWTH` à 0,20

Ça donnerait le bon rapport (1 + 5×0,20 = 2,0) et rien d'autre. Le compteur de
boss reste un axe **discret et dépendant du parcours** : une équipe qui rate un
boss décale tout son barème, alors que la minute est la même pour tout le monde.
C'est l'argument du plan 5 quand il a quitté l'horloge des vagues.

---

## H-2 · Le plafond de renforts ne suit pas l'effectif

### Constat

```js
BOSS_ADD_CAP: 55,          // plafond des renforts
// ...
if (this.enemies.length < CFG.BOSS_ADD_CAP) { ... }
```

**Valeur absolue, identique de 1 à 4 joueurs.** Alors que les PV du boss, eux,
suivent `crowd^1.15` — soit ×5,2 à quatre joueurs.

Résultat : à quatre, le combat est **cinq fois plus long avec la même pression
d'ajouts**, donc quatre fois moins dense par tête. C'est exactement l'inverse de
ce que le lot A rétablit hors combat de boss, où la densité suit
`joueurs^0,75`.

Vérification faite au passage : **la horde est bien suspendue pendant un combat
de boss** (`if (!this.boss && !this.waveBoss ...)` dans la boucle d'apparition),
et le terrain est balayé à l'arrivée du boss (`BOSS_SWEEP_R = 1000`). Les
renforts sont donc **toute** la pression d'ajouts du combat — ce plafond n'est
pas un détail de confort, c'est le réglage de densité du combat.

### Décision

```js
BOSS_ADD_CAP_BASE: 42,
// plafond effectif = BOSS_ADD_CAP_BASE * joueurs^WAVE_CROWD_EXP
```

Soit 42 en solo, 71 à deux, 119 à quatre. Le même exposant que la horde, pour la
même raison, et la base descend de 55 à 42 parce que le solo était le seul cas où
le plafond de 55 mordait vraiment.

⚠ **Interaction avec le lot A :** le plafond de renforts doit rester **borné par
`_enemyCap()`**, sinon deux plafonds règlent la même grandeur — ce que le README
interdit. Le plus petit des deux gagne.

---

## H-3 · Ce que les autres lots corrigent déjà, sans rien écrire

À vérifier, pas à changer.

**Les renforts de boss sont des runners** (`_spawnEnemy(1, ...)`). Le lot B les
ramène de 245 à 196 px/s : **les combats de boss deviennent mécaniquement plus
lisibles sans qu'une seule ligne de `bosses.js` ne bouge.** C'est un effet de
bord favorable qu'il faut mesurer avant de conclure que H-2 en donne trop.

**La vitesse des boss est hors sujet.** `BOSS_SPEED = 44`, soit **17 % de
`PLAYER_SPEED`**. La doctrine des 90 % du lot B exclut explicitement les boss ;
à 17 %, l'exclusion ne sert même pas — un boss ne poursuit personne, sa menace
est entièrement mécanique. Rien à faire.

**L'XP de boss suit déjà le lot D.** `BOSS_XP_BASE` passe par `_xpTimeMul` au
point d'appel de `_damage` : le renommage et le changement d'indexation du lot D
s'appliquent aux boss sans traitement particulier.

**L'enrage reste la soupape.** `ENRAGE_AT` / `ENRAGE_STEP` existent pour le
combat qui s'éternise. Avec H-1, il devrait se déclencher **moins souvent** en
début de manche et **plus souvent** en fin — c'est un bon indicateur secondaire :
si le taux d'enrage ne bouge pas après H-1, c'est que la rampe n'a pas mordu.

---

## H-4 · Les boss sont l'endroit où la méta se voit

Conséquence de l'architecture relevée dans [PROFILS.md](PROFILS.md) : les PV de
boss se calculent avec la constante `BOSS_POWER_REF`, **pas** avec la puissance
réelle de l'équipe, et la méta est exclue de `_playerPower`.

Donc un compte P2 (×1,45) abat un boss **45 % plus vite** qu'un compte P1, sans
aucune compensation. **Le combat de boss est le seul endroit du jeu où la
progression permanente est directement visible** — la horde, elle, se contente de
mourir un peu plus vite.

Ça fait des boss le **levier de calibrage de la matrice de cohérence** :

| | attendu |
|---|---|
| P0 en normal | bute sur le **boss 3 ou 4** |
| P1 en normal | passe le boss 6 |
| P2 en cauchemar | passe le boss 6 |

Si la matrice de `PROFILS.md` ne se vérifie pas en test, **c'est ici qu'on
règle**, via `diff.boss` et `BOSS_HP_MINUTE_RAMP` — pas sur la horde, dont le
rôle est l'usure et non le mur.

---

## Ce que le lot NE fait pas

La porte fermée du README est **maintenue, mais reformulée** : le lot H ne touche
ni les six combats, ni leurs barres, ni leurs mécaniques (`MECHS`,
`MECH_TOWER`, les variantes de rupture, le nombre de barres du final). Il ne
touche que **la courbe de PV et la densité de renforts**.

Si les durées de combat restent hors cible après H-1 et la remesure de
`BOSS_POWER_REF`, ce sera un plan 7.

---

## Critères d'acceptation

1. **La durée médiane d'un combat ne décroît pas sur la manche.** Aujourd'hui
   elle décroît d'un facteur 2. Cible : boss 1 et boss 6 à ±20 % l'un de l'autre,
   dans la fourchette 50-90 s du lot C.
2. **La densité de renforts par joueur est égale à ±15 % entre 1 et 4 joueurs.**
3. Le taux de déclenchement de l'**enrage** reste sous 25 % des combats à P1 —
   au-delà, la rampe H-1 est trop raide.
4. La matrice de cohérence de [PROFILS.md](PROFILS.md) se vérifie **sur les boss**
   (tableau H-4).
5. Aucun combat ne dépasse `_enemyCap()` en population totale (garde-fou H-2).
