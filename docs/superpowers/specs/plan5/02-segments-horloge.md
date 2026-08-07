# Lot P — Segments et horloge

Le squelette de la refonte. Aucune dépendance ; tous les autres lots s'y accrochent.

Remplace le modèle « budget puis nettoyage » par une **chronologie scriptée** de six
segments. C'est le lot qui supprime les vagues.

---

## P1. Structure

```
manche = 6 SEGMENTS
segment = 300 s de horde  ->  crescendo  ->  balayage  ->  BOSS (hors horloge)  ->  cartes  ->  suivant
```

- 6 × 300 s = **1800 s de horde**, identiques pour toutes les équipes.
- 5 boss intermédiaires puis le **boss final** au segment 6 (lot W).
- **D1 — l'horloge de segment s'arrête** pendant le combat de boss et pendant l'écran de
  cartes. Elle ne mesure que la horde.

C'est ce qui rend deux parties comparables, et c'est la condition du classement au temps
(`plan4` lot N, repris au lot W). Durée réelle attendue : **1800 s + 6 à 9 min de boss
≈ 37 min**.

### Le boss final devient gratuit à conditionner

`plan4/07` demandait *« après qu'un cycle complet du roster a été effectué »*, ce qui
donnait la vague 30 par arithmétique. Ici le **segment 6 est** cet instant, par
construction. La condition `FINAL_BOSS_AFTER_FULL_ROSTER` disparaît, la garantie reste.

---

## P2. Le script de débit

Cinq beats de 60 s par segment, trente beats au total. Débit en apparitions par seconde,
**avant** effectif et difficulté — mêmes facteurs qu'aujourd'hui : `crowd^0.75 ×
diff.spawn`.

| segment | intention | b1 | b2 | b3 | b4 | b5 crescendo | boss |
|---|---|---|---|---|---|---|---|
| 1 | installation | 0,6 | 0,9 | 1,2 | **0,5** silence | 1,8 | B1 |
| 2 | on domine | 1,4 | 1,7 | 2,0 | **0,7** silence | 2,6 | B2 |
| 3 | la crise | 2,0 | 2,4 | 2,2 | 2,8 | 3,2 | B3 |
| 4 | chaos maîtrisé | 2,2 | **0,8** silence | 2,9 | 3,3 | 3,8 | B4 |
| 5 | pression maximale | 3,0 | 3,4 | 3,2 | 3,9 | 4,4 | B5 |
| 6 | apothéose | 3,4 | **1,0** silence long | 4,0 | 4,6 | 5,0 | FINAL |

Repères pour juger l'échelle : la vague 1 actuelle est à **0,8/s**, la vague 16 à
**3,05/s**. Le script part plus bas et finit plus haut, avec des creux que le modèle
actuel n'a jamais eus ailleurs qu'entre deux vagues.

### La courbe n'est pas monotone dans un segment

2,4 puis 2,2 au segment 3 ; 3,4 puis 3,2 au segment 5. Ce n'est pas une coquille.

Une rampe strictement croissante se lit comme un **état**. Un resserrement qui relâche
puis reprend se lit comme une **respiration**. C'est exactement le raisonnement déjà écrit
pour la posture des boss : *« `gather` monte de 0 à 1 en carré, jamais en linéaire : une
rampe droite se lit comme un état, un resserrement qui accélère se lit comme un élan qui
se charge. »*

---

## P3. Le silence est la pièce porteuse, pas un ornement

**C'est le principal danger technique de la refonte, et il faut le nommer.**

Sans nettoyage de vague, dans une arène d'un seul écran — 1600 × 900, `MAX_ENEMIES: 200`,
**aucune caméra** (vérifié : `plan4/00-index.md`, *« le rendu est câblé sur l'arène
entière tenant dans un seul écran »*) — la population tend vers son plafond et **y
reste**. Le jeu devient « toujours 200 ennemis », c'est-à-dire l'inverse exact de la
courbe émotionnelle recherchée.

La phase de nettoyage de vague **était** ce qui créait la respiration. En la retirant, il
faut l'écrire.

Un **silence** est un beat à débit très bas (0,4 à 1,0/s). Pendant un silence :

- la horde présente se fait détruire — la population doit descendre **sous 25**, sinon le
  silence ne se lit pas, il ne fait que ralentir ;
- un **bonus au sol est forcé** au début du silence : `_powerups` a déjà son minuteur, il
  suffit de le déclencher. C'est une pièce de l'économie de récupération (lot X) ;
- c'est la fenêtre de repositionnement et de lecture du HUD.

**Règles de placement** : trois silences par manche au minimum, jamais deux segments de
suite sans silence — **sauf le segment 3, qui n'en a aucun, délibérément**. C'est la
crise, et c'est le point bas de la partie.

---

## P4. Le segment se termine par un crescendo, pas par un balayage gratuit

Aujourd'hui l'arrivée du boss vide l'arène (`this.enemies = []` dans `_boss`), et c'est
justifié : *« sans ça il débarquait au milieu de 200 ennemis déjà présents : sa
silhouette, ses zones et sa barre de vie se perdaient dans la masse. »*

En modèle continu, cette suppression devient une **récompense pour avoir arrêté de
jouer** : à 4 min 30 d'un segment, ne plus tirer et attendre le balayage est strictement
optimal.

Correction, en deux parties indissociables :

1. la **dernière minute de chaque segment est un crescendo** — le débit le plus haut du
   segment ;
2. le balayage qui suit ne crédite **aucune expérience**, exactement comme il ne crédite
   déjà aucun point (*« aucun point n'est crédité : ce n'est pas un cadeau de score »*).

L'équipe qui tue le crescendo gagne souvent un niveau ; celle qui tourne en rond le perd.
Le choix existe, il a un coût des deux côtés, et il n'est pas gratuit.

---

## P5. La saturation remplace le scaling — par de l'information

Sous D2 (lot R), une équipe faible accumule jusqu'à `MAX_ENEMIES` et les apparitions en
trop sont **silencieusement jetées** — `_spawnEnemy` rend `null` et `_spawner` sort. C'est
une miséricorde involontaire : la difficulté plafonne au moment où l'équipe est en train
de perdre, et **rien à l'écran ne le dit**.

Réponse : **afficher la saturation** (population / plafond) dans le HUD. Une équipe à
100 % pendant plus de dix secondes est en train de perdre, et le sait.

La saturation **ne traverse pas le réseau** : elle se déduit de `enemies.length`, que le
client a déjà. Même règle que les trois informations déjà déduites — cadence des tireurs,
direction des projectiles, déplacement d'un joueur.

Passé le plafond, la difficulté ne monte plus par le nombre mais par les **PV** (lot R) et
les **traits** (lot T), ce qui est authored et mesurable.

---

## P6. Géométrie d'apparition

Aujourd'hui `_spawnPoint()` tire un des quatre bords, uniformément : une seule géométrie
pour toute la partie. Le script en nomme plusieurs — c'est ce qui distingue un mur de
runners par le nord d'une pression diffuse.

| géométrie | description | usage |
|---|---|---|
| `bords` | les quatre bords, uniforme | défaut, pression diffuse |
| `front` | un seul bord, tiré au beat | un mur qui arrive d'un côté : on recule |
| `pince` | deux bords opposés | on ne peut plus reculer, il faut percer |
| `quatre-fronts` | les quatre bords simultanément, par paquets | effectif 3-4 seulement (P7) |
| `anneau` | un cercle à mi-distance du centre | encerclement ; réservé aux événements (lot U) |

### Le piège d'`anneau`

C'est la seule géométrie qui fait apparaître un ennemi **à l'intérieur** des limites. Elle
doit donc passer par **`_spawnSweep()`** — le balayage du segment centre du joueur → point
d'apparition.

Sans ça, un ennemi peut naître dans le disque de 16 px autour d'un joueur où il serait
strictement invulnérable à son porteur : les balles naissent à 16 px du centre, un runner
a 9 px de rayon et une balle 4, donc la collision se fait à 13 px. C'est le bug documenté
de la séparation ennemi/joueur, et il se reproduirait exactement ici.

---

## P7. Effectif : garder la parité mesurée, changer la forme

### Ce qui ne change pas

`crowd^0.75` sur le débit et sur les paliers d'expérience, `crowd^0.4` sur la cadence
d'élite, `crowd^1.15` sur les PV de boss. Ces exposants produisent la parité mesurée —
15,8 vagues en solo contre 16,0 à quatre — et le dépôt dit explicitement que *« le
résultat quasi identique à un et à quatre joueurs est le but »*. Les toucher, c'est
rouvrir un équilibrage réussi pour un gain non démontré.

### Ce qui change : la géométrie, pas la quantité

À **budget constant** :

| effectif | forme de la pression | mécanisme |
|---|---|---|
| 1-2 | **moins de menaces, plus grosses** : plus d'élites, plus de tanks, géométrie `front` ou `pince` | on résout par le positionnement |
| 3-4 | **plus de fronts simultanés** : `quatre-fronts`, plus d'événements demandant de se répartir | on résout par la coordination |

Implémentation : les entrées du script portent `minPlayers` et `fallback` — **la même
signature que `MECHS`**. `adaptMech` est généralisé ou dupliqué en `adaptEntry`, avec un
**seul point de passage**, sinon la table d'adaptation cesse d'être vraie, ce qui est
exactement l'argument déjà écrit pour `adaptMech`.

---

## P8. Nouveau module : `shared/timeline.js`

Module **pur**, aucune dépendance, sur le modèle de `statuses.js` et `bosses.js` :
`game_state.js` l'importe, jamais l'inverse — un cycle d'import casserait le chargement
dans le navigateur.

Contenu :

- `SEGMENT_TIME` (300), `SEGMENTS` (6) ;
- les **variantes de campagne** : trois scripts par difficulté (A / B / C), tirés au
  lancement et **affichés** (lot X pour la conséquence sur le classement) ;
- la table des beats : `{ at, rate, mix, from, event, minPlayers, fallback }` ;
- la table des `GEOMETRIES` (P6) — **tableau ordonné, l'index ne circule pas** : la
  géométrie est résolue côté serveur au moment de l'apparition ;
- `adaptEntry(entry, alive)`.

Les constantes de comportement du script vivent **ici**, à côté de leur table, et non dans
`CFG` — même règle que `CARD_CFG`, `SKILL_CFG`, `STATUS_CFG` et `BOSS_CFG`.

---

## P9. Ce qui change dans `game_state.js`

| aujourd'hui | devient |
|---|---|
| `_waveTick(dt)` | `_segmentTick(dt)` : avance l'horloge de horde, change de beat, déclenche le boss en fin de segment |
| `_startWave()` / `_endWave()` | **supprimés** |
| `_spawner(dt)` | lit le beat courant (débit, composition, géométrie) au lieu de `SPAWN_BASE + wave × RAMP` |
| `_spawnPoint()` | prend une géométrie en argument |
| `_boss(dt)` | déclenché par la fin de segment au lieu de `waveBossPending` |
| `this.wave`, `waveBudget`, `waveSpawned`, `wavePhase`, `waveTimer`, `waveBoss`, `waveBossPending` | `this.segment`, `hordeTime`, `beat` |
| `snapshot()` | clé nommée **`sg`** : segment et temps de horde restant. `wv`, `wp`, `wbs`, `wb` disparaissent |

### Bloc `CFG` retiré

`WAVE_BUDGET_BASE`, `WAVE_BUDGET_RAMP`, `WAVE_BREATHER`, `WAVE_BOSS_EVERY`, `WAVE_HEAL`,
`SPAWN_BASE`, `SPAWN_WAVE_RAMP`, `ENEMY_HP_WAVE_RAMP` et `ENEMY_SPEED_WAVE_RAMP`
(remplacés par des rampes **par minute** au lot R), `WAVE_XP_BONUS` (lot Q).

`WAVE_CROWD_EXP` (0,75) **reste** : il porte la normalisation d'effectif du débit et des
paliers d'expérience, et c'est la valeur mesurée qui donne la parité 1 / 4 joueurs.

---

## P10. Code qui disparaît — un gain net

**Le système de retardataires** (`WAVE_STRAGGLER_DELAY`, `WAVE_STRAGGLER_SPEED`, le halo
client, le `standoff` remis à zéro, le marquage `+200` dans le champ de type) existe
uniquement parce qu'il fallait nettoyer une vague : *« traquer les six derniers shooters à
travers 1600 × 900 prenait plus longtemps que la vague elle-même »*. Il n'a plus d'objet.

**Il faut le retirer, pas le laisser dormir.** `waveTimer` n'existant plus, la condition de
déclenchement deviendrait indéfinie et pourrait marquer toute l'arène en permanence — le
dépôt a déjà connu ce bug exact quand `_wave` écrasait `_waveTick` en silence et qu'un
`waveTimer` avancé de plusieurs centaines de secondes *« marquait toute l'arène comme
retardataire au premier kill »*.

Le décodage client se simplifie de la même manière : `type = a[5] % 100`, sans le test
`>= 200`.

---

## P11. Autres fichiers

| fichier | ce qui change |
|---|---|
| `room.js` | phases inchangées (`PHASE_LOBBY` / `PHASE_ROUND` / `PHASE_CARDS`) ; `startRound()` tire la variante de script ; le payload de salon et `roundEnd` les portent |
| `public/hud.js` | `updateWave()` → `updateSegment()` : segment sur 6, temps de horde restant, **saturation**. La table `memo` continue de n'écrire que si la valeur a changé |
| `public/client.js` | `worldQueue` / `pushWorld()` inchangés — les messages de transition continuent de se consommer depuis la timeline interpolée |
| `public/events.js` | événement de changement de segment et de beat, déduits du snapshot |
| `LISEZMOI.md` | la section « Vagues » disparaît, une section « Segments » la remplace |

---

## P12. Mesures

| mesure | attendu |
|---|---|
| population moyenne sur la manche, normal, 4 joueurs | **90 à 140** |
| population au fond de chaque silence | **< 25** |
| temps consécutif passé à `MAX_ENEMIES` avant le segment 5 | **< 30 s** |
| durée réelle d'une manche complète, build médiane | 1800 s de horde + 6 à 9 min de boss |
| CPU par tick, population 200 soutenue, 4 joueurs | moyenne **< 1 ms**, p99 **< 8 ms** (budget 16,7) |
| poids d'instantané, pire cas | hausse **< 10 %** par rapport à la référence actuelle |

Le CPU est le seul chiffre sans précédent rassurant : l'évitement mutuel des ennemis est
en **O(n²)** et la population moyenne passe d'environ 50 à 120. Le dépôt annonce que ça
tient *« jusqu'à 400, au-delà il faudrait une grille spatiale »* ; c'est à mesurer et non
à extrapoler, et la grille spatiale est le repli connu si la mesure le demande.

---

## P13. Critères d'acceptation

- Une manche compte exactement **six segments** de 300 s de horde, boss et écrans de
  cartes exclus de l'horloge.
- Deux manches lancées avec la même variante, le même biome, la même difficulté et le même
  effectif ont un **débit et une composition identiques minute par minute**.
- La population descend **sous 25** au fond de chaque silence.
- Le balayage précédant un boss ne crédite **ni score ni expérience**.
- Aucun ennemi ne peut apparaître dans le disque de 16 px autour d'un joueur, y compris en
  géométrie `anneau` (vérifié par `_spawnSweep`).
- La saturation est lisible au HUD et **ne circule pas** dans le snapshot.
- Le système de retardataires est **entièrement retiré** : aucune référence à
  `WAVE_STRAGGLER_*`, aucun ennemi jamais marqué `+200`.
- Un client resté sur une version antérieure au lot reste jouable : les clés `wv`/`wp`
  disparues sont lues avec un repli, la clé `sg` inconnue est ignorée.
