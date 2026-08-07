# Lot Q — Expérience aux PV détruits

Dépend du lot P. **Non négociable avant le lot R** : le script sans la nouvelle expérience
produit une courbe de cartes fausse, et l'inverse produit une pression fausse.

C'est le lot qui réalise la promesse centrale du brief — *« une équipe efficace tue
davantage, gagne plus d'expérience, monte plus vite, devient réellement plus puissante »*.

---

## Q1. Le piège, et pourquoi il est fatal si on n'y touche pas

Le brief dit *« les joueurs gagnent de l'expérience uniquement en éliminant des
ennemis »*. Appliqué **littéralement** avec le `score` actuel (10 / 14 / 30 / 25 / 20
selon le type), le système **s'annule tout seul**.

Les PV des ennemis montent sur l'horloge (`ENEMY_HP_BASE: 16` plus une rampe). Un grunt de
la minute 30 coûte une vingtaine de fois plus de dégâts qu'un grunt de la minute 1 et
rapporte **exactement les mêmes 10 points**.

Conséquences, toutes contraires à l'intention :

- l'expérience par minute **s'effondre** au fil de la partie ;
- la courbe de cartes s'écrase là où elle devrait s'ouvrir ;
- une équipe efficace tue surtout **plus d'ennemis faciles au début** — pas plus
  d'ennemis tard, quand ça compte.

---

## Q2. La règle

> **L'expérience créditée à la mort d'un ennemi vaut ses PV max.**

On garde la lettre du brief — le crédit a lieu **au kill**, dans `_killEnemy`, point de
passage unique déjà existant — et on change l'**unité**.

Quatre propriétés, toutes acquises sans code supplémentaire :

- **Immune à la rampe de PV.** Un ennemi deux fois plus coriace rapporte deux fois plus.
  L'expérience par minute devient proportionnelle aux **dégâts par seconde de l'équipe**,
  ce qui est exactement l'effet demandé.
- **Pas de dernier coup à voler.** La valeur ne dépend pas de qui achève, et la jauge est
  de toute façon commune à l'équipe.
- **Les élites valent leur ×3 de PV**, sans une ligne de plus (`ELITE_HP_MUL: 3`).
- **Un tank vaut 4,5 grunts** (`hpMul: 4.5`), ce qui est exactement ce qu'il coûte en
  dégâts.

### `score` reste inchangé

Deux nombres, deux usages, et il ne faut pas les confondre :

| nombre | dit | lu par |
|---|---|---|
| `score` | la valeur **tactique** d'une cible — un shooter vaut plus qu'un grunt à surface égale | le tableau des scores |
| PV max | la valeur **économique** — ce que la cible a coûté en dégâts | la progression |

---

## Q3. Le frein est déjà écrit

Objection immédiate : si l'expérience est proportionnelle aux dégâts et que les dégâts
montent avec les cartes, la boucle est positive et s'emballe.

**Elle ne s'emballe pas, et le frein existe déjà.**

`LEVEL_KILLS_GROWTH` vaut **1,18** — chaque palier coûte 18 % de plus que le précédent.
Une carte vaut de l'ordre de **+9 %** de puissance (mesuré : puissance médiane 2,36 pour
~13 cartes). Le coût d'un niveau croît donc

```
1,18 / 1,09 ≈ 1,08
```

fois plus vite que la puissance qu'il rapporte : **chaque niveau prend 8 % de temps de plus
que le précédent**. La courbe décélère d'elle-même, sans plafond dur ni falaise.

C'est le même raisonnement que le genou des PV de boss, et il tient parce que le facteur
qui décélère (le coût) est **déjà** plus raide que celui qui accélère (la puissance).
Aucune constante nouvelle n'est nécessaire pour l'obtenir.

---

## Q4. Conversion des constantes

| aujourd'hui | devient | dérivation |
|---|---|---|
| `LEVEL_KILLS_BASE: 15` (kills) | `LEVEL_XP_BASE: 240` (PV) | 15 kills × 16 PV de grunt à la vague 1 |
| `LEVEL_KILLS_GROWTH: 1.18` | **inchangé** | c'est le frein, cf. Q3 |
| `WAVE_XP_BONUS: 12` | **supprimé** | il n'y a plus de fin de vague |
| — | `BOSS_XP_K: 0.35` | les dégâts au boss créditent à 35 % : le boss avance la build sans devenir la source principale |
| `LEVEL_MAX: 30` | **inchangé** | objectif niveau 22-26 à la minute 30, donc le plafond ne mord pas |

### Ce qui ne bouge pas

- **La normalisation sur l'effectif** (`joueurs^WAVE_CROWD_EXP`, 0,75) est conservée telle
  quelle : c'est la raison mesurée pour laquelle une partie à un et à quatre joueurs donne
  le même nombre de cartes.
- **La jauge reste commune à l'équipe.** L'argument d'origine est intact : *« un soigneur
  ne tue rien, un tank tue moins qu'un DPS. Avec des jauges individuelles donnant des
  cartes, le DPS accumule pendant que le soutien décroche — et moins il a de cartes, moins
  il tue. C'est une spirale, et elle rend les rôles de soutien injouables. »*
- **`_xcostMul`** (surcoût de la carte « Dette ») continue de prendre le plus élevé de la
  table, jamais le cumul.
- **Un niveau ne donne rien d'autre que le droit de choisir une carte.**

---

## Q5. Le boss crédite ses dégâts, à 35 %

`state.bossDmg` existe déjà : `_damage()` y cumule les dégâts portés au boss depuis le
dernier instantané, au point de passage unique, et le serveur le vide après diffusion.
C'est exactement la matière première.

`BOSS_XP_K: 0.35` plutôt que 1 pour une raison de rythme : les PV d'un boss valent
plusieurs milliers (`BOSS_HP_BASE: 1200 × BOSS_HP_MUL: 2.6 × crowd^1.15`), soit une
fraction importante d'un palier tardif. À plein, le boss deviendrait la source principale
d'expérience et la horde ne servirait plus qu'à passer le temps — l'inverse de ce que le
script raconte.

**Le dégât `overTime` ne crédite rien de spécial** : la règle est déjà que le crédit passe
par `_damage`, donc brûlure et couronne mortelle comptent, comme pour le reste.

---

## Q6. Une carte garantie par boss

Six boss, **six choix de carte indépendants du niveau**. C'est ce qui fait du boss un
checkpoint de progression et pas seulement un mur de PV — le rôle que tenait
`BOSS_QUALITY: 4` et qu'il continue de tenir en plus.

Total attendu :

```
6 cartes de boss + 18 à 20 cartes de niveau = 24 à 26 cartes
```

contre **13 à 15 aujourd'hui**, sur une manche deux fois plus longue. Le rythme par minute
est donc comparable ; c'est la **dispersion** qui change, et c'est le but.

Mécanique : le boss vaincu appelle `openCards()` une fois de plus, indépendamment de
`pendingLevels`. `resumeRound()` continue de rouvrir un écran tant qu'il reste des choix en
attente — rien à changer dans l'enchaînement.

---

## Q7. Réindexation sur le niveau (D3)

Le numéro de vague disparaît. Tout ce qui le lisait lit désormais le **niveau d'équipe**.

| constante | aujourd'hui | devient |
|---|---|---|
| `CARD_CFG.LEGENDARY_WAVES: [10, 20]` | vagues | `LEGENDARY_LEVELS: [12, 22]` |
| `CARD_CFG.QUALITY_PER_LEVEL: 4` | déjà sur le niveau | **inchangé** |
| `CARD_CFG.SKILL3_MIN_WAVE: 4` | vague | `SKILL3_MIN_LEVEL: 5` |
| `PROG_CFG.CORE_WAVE: 4` × vague | vague | `CORE_LEVEL: 4` × niveau |
| `PROG_CFG.CORE_FIRST_WAVES {5,10,15,20}` | vagues | niveaux `{6, 12, 18, 24}` |
| `PROG_CFG.NO_DOWN_MIN_WAVE: 5` | vague | niveau **6** |
| `MILESTONES` « atteindre la vague 8 » | vague | « atteindre le niveau 10 » |
| `profile.best.wave` | vague | `best.level` **et** `best.segment` |
| `fullMods(cards, others, cls, wave)` | vague | niveau — « Cœur de forge » gagne 5 % par **niveau** |
| `_startWave()` rejoue les mods des porteurs de « Cœur de forge » | fin de vague | **à la montée de niveau**, dans `_addXp` |

### Le mécanisme du jalon de légendaire est conservé intégralement

Y compris le correctif documenté : il se déclenche au premier écran atteint **à partir du**
niveau seuil et non pendant ce niveau exactement, et **une seule fois** même si trois
niveaux tombent d'affilée. `legendaryWaveDone` devient `legendaryLevelDone` et reste dans
`GameState`, jamais dans `cards.js`, *« qui doit rester une fonction de ses arguments »*.

Ce correctif existe parce que la garantie **sautait une fois sur deux** ; le changement
d'unité ne le rend pas inutile.

---

## Q8. Builds coopératives contre builds offensives

Conséquence qu'il faut nommer : l'expérience venant des PV détruits, une build **purement
défensive gagne moins de cartes**, donc décroche.

Le brief demande que le coopératif garde sa place. Il faut donc que le soutien produise des
dégâts **indirectement mesurables**. Le dépôt a déjà l'outil et l'argument : la ligne méta
`catalyse` du soigneur — *« la ligne la plus importante du lot : elle rend le soigneur
offensif INDIRECTEMENT, le seul moyen de le rendre désirable sans en faire un tireur »*.

Règle générale à retenir :

> **Une carte de soutien doit accélérer la progression de l'équipe, pas seulement sa
> survie.**

Concrètement, les cartes portant le tag `coop` gagnent une contrepartie offensive d'équipe
(aura de dégâts, marquage de cible, transfert de cadence) plutôt qu'un pur gain de PV.

**C'est un chantier de catalogue, à traiter dans son propre lot** — pas un réglage de cette
refonte, mais une conséquence qu'elle rend obligatoire. À vérifier au lot X : si l'écart de
cartes obtenues entre une table avec soigneur et une table sans dépasse deux cartes sur la
manche, ce lot devient prioritaire.

---

## Q9. Fichiers touchés

| fichier | ce qui change |
|---|---|
| `shared/game_state.js` | `_killEnemy` crédite `e.maxHp` ; `_addXp` change d'unité ; `WAVE_XP_BONUS` retiré ; `BOSS_XP_K` branché sur `state.bossDmg` ; `fullMods(..., level)` ; le recalcul « Cœur de forge » passe de `_startWave` à `_addXp` |
| `shared/cards.js` | `LEGENDARY_WAVES` → `LEGENDARY_LEVELS` ; `SKILL3_MIN_WAVE` → `SKILL3_MIN_LEVEL` ; `drawCards(..., waveNow)` → `levelNow` |
| `shared/progression.js` | `CORE_WAVE` → `CORE_LEVEL` ; `CORE_FIRST_WAVES` → niveaux ; `NO_DOWN_MIN_WAVE` ; jalon « vague 8 » → « niveau 10 » ; `coresForRun(level, …)`, `coresPartial(level, …)` ; `newProfile.best` |
| `room.js` | `roundEnd` porte le niveau et le segment atteints |
| `public/client.js` | bilan et fenêtre de build : niveau et segment au lieu de vague ; `POWER_MARKS` à remesurer |
| `public/hud.js` | la jauge d'expérience affiche des PV détruits — libellé à revoir |
| `progress_store.js` | `PROG_CFG.VERSION` **+1** et migration de `best.wave` → `best.level` |

### Migration de persistance

`PROG_CFG.VERSION` passe de 3 à 4. La règle du dépôt s'applique telle quelle : une ligne de
**version inconnue est GELÉE** — ni adoptée, ni jamais réécrite. La migration se fait
**par ligne de compte**, avec instantané de table préalable (même politique que
`plan4` lot H).

`best.wave` n'est pas convertible en `best.level` par calcul : les deux unités ne mesurent
pas la même chose. Le champ est **conservé tel quel sous son ancien nom** (record
historique du modèle par vagues) et `best.level` démarre à zéro. Un record ancien reste
lisible, il ne se réécrit pas — même raison que *« une mesure se remesure, elle ne se
réécrit pas »*.

---

## Q10. Mesures

Cinq essais par configuration, effectifs 1 à 4, trois difficultés, **profil de compte neuf
sauf mention**.

| mesure | cible |
|---|---|
| niveau à la minute 30, build médiane | **22 à 26** |
| cartes obtenues sur la manche | **24 à 26**, dont 6 de boss |
| **écart de niveau p90/p10 à la minute 30** | **≥ 3 niveaux** — *c'est le défaut à corriger, il est proche de zéro aujourd'hui* |
| … et borné | **≤ 7 niveaux** — au-delà, l'équipe faible n'atteint jamais le jalon de légendaire à 22 et le système perd sa pointe |
| niveau plancher, build défensive malchanceuse | **≥ 14** — en dessous, la build n'existe pas et la manche n'est pas jouable |
| légendaires par joueur et par manche | **1 à 2**, plafond dur `LEGENDARY_MAX` respecté |
| cartes distinctes proposées sur une manche | **≥ 40** (référence : 31 à 55 sur une manche deux fois plus courte) |
| part d'expérience venant des boss | **< 25 %** du total — au-delà, baisser `BOSS_XP_K` |
| écart de cartes obtenues, table avec soigneur vs sans | **≤ 2 cartes** ; au-delà, le chantier Q8 devient prioritaire |
| parité d'effectif | cartes obtenues à 1 et à 4 joueurs à **±10 %** — la propriété mesurée à ne pas casser |

**Toute mesure précise son profil de compte, sa variante de script, son biome et son
effectif.** Quatre champs de plus qu'aujourd'hui, mais sans eux les chiffres ne se
comparent plus.

---

## Q11. Critères d'acceptation

- L'expérience créditée à la mort d'un ennemi est **exactement ses PV max**, élite
  comprise, quel que soit le nombre de coups reçus et quel que soit l'auteur du dernier.
- Un ennemi qui disparaît sans mourir (balayage de fin de segment) crédite **zéro**.
- Chaque boss vaincu ouvre **un choix de carte**, même si aucun niveau n'a été gagné.
- Le jalon de légendaire tombe **une seule fois** même si trois niveaux sont gagnés
  d'affilée, et se déclenche au premier écran atteint **à partir du** niveau seuil.
- Aucun système ne lit plus `state.wave` : la grandeur n'existe plus.
- `PROG_CFG.VERSION` incrémenté ; une ligne de compte en version 3 est **gelée**, pas
  adoptée en silence.
- Un profil migré conserve son ancien `best.wave` intact.
- La jauge d'expérience reste **commune à l'équipe** et un niveau ne donne rien d'autre
  qu'un choix de carte.
