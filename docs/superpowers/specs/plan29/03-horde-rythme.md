# 03 · Horde — le goulot n'est ni le plafond, ni le spawn, ni les armes

## Ce que la mesure dit

Protocole (`sim/pop5.mjs`) : horde pure à minute cible figée par
`(segment, beat)`, boss neutralisé, bots immortels en kiting, moyenne sur les
60 % finaux de la fenêtre. Deux modes : armes actives et armes muettes
(`p.fireCd = 999` chaque tick).

### Solo normal, plafond 220

| minute | 1 | 5 | 10 | 15 | 20 | 25 | 30 |
|---|---|---|---|---|---|---|---|
| sans tir (fenêtre 45 s) | 28 | 44 | 63 | 69 | 94 | 107 | 107 |
| avec tir (fenêtre 45 s) | 24 | 42 | 63 | 69 | 94 | 107 | 107 |
| part retirée par les armes | 14 % | 4 % | **0 %** | **0 %** | **0 %** | **0 %** | **0 %** |

| fenêtre à la minute 25 | sans tir | avec tir |
|---|---|---|
| 45 s | 107 (49 % du plafond) | 107 (49 %) |
| **300 s** | **220 (100 %)** | **220 (100 %)** |

### Trois conclusions, toutes contraires aux hypothèses du brief

1. **Les armes ne pèsent pas sur la population.** Part retirée : 0 % de la
   minute 10 à la fin. Les deux courbes sont superposées. L'hypothèse « les
   armes tuent trop vite » est **réfutée**.
2. **Le spawn rate suffit.** Sur 300 s ininterrompues, la horde sature son
   plafond de 220. L'hypothèse « le spawn rate est trop faible » est
   **réfutée** — au sens où l'augmenter ne changerait pas le résultat tant que
   la cause réelle tient.
3. **Le plafond n'est pas le levier.** Il est atteint quand on laisse le temps.
   Monter `MAX_ENEMIES_BASE` ou `MAX_ENEMIES_HARD_CAP` ne produirait rien.

**Le goulot est le temps de horde ininterrompu.** Saturer demande entre 45 s
et 300 s ; la structure de manche ne l'accorde jamais.

## Ce qui interrompt la horde

### I1 — Les boss coupent tout (M3)

`_spawner(dt)` : `if (this.boss || this.bossPending) return;` — **zéro spawn**
pendant un boss. Et `_bossAddCap() = min(_enemyCap(), 42 × joueurs^0.75)`
plafonne la horde résiduelle à **42 corps en solo** (119 à 4 joueurs).

Vérification indépendante : une mesure où les bots restaient bloqués en combat
de boss a donné une population parfaitement plate à 42 (solo) / 119 (4j), soit
exactement `BOSS_ADD_CAP_BASE × n^0.75`.

Conséquence de design : les boss valent `PART_BOSS: 0.2` du temps de manche, et
ce cinquième se joue à **19 % de la densité nominale**, juste après le pic de
tension monté par la horde. La courbe réelle est en dents de scie — montée
lente pendant 4-5 minutes, effondrement à chaque boss, redémarrage de zéro.

### I2 — Chaque battement remet le compteur à zéro

`_startBeat()` fait `this.spawnAcc = 0`. Avec `BEAT_TIME = 60` et
`BEATS = 5`, c'est 5 remises à zéro par segment. L'effet unitaire est faible
(`spawnAcc < 1`, donc moins d'un ennemi perdu par battement), mais il est
systématique et va dans le même sens que I1.

### I3 — Écrans de carte et de relique

Chaque montée de niveau et chaque marchand suspend la simulation. Non mesuré
ici (les bots les expédient en un tick), mais en jeu réel un joueur qui délibère
10 s sur trois cartes ajoute 10 s de horde figée à chaque niveau.

## Chantiers proposés

### C1 — Ne pas couper la horde pendant les boss (P0)

C'est le levier à plus fort effet, et il ne touche ni le plafond ni le taux.

Options, à trancher par mesure :
- **C1a** : laisser `_spawner` tourner pendant un boss à taux réduit
  (ex. 40-60 % du taux nominal) plutôt qu'à zéro ;
- **C1b** : relever `BOSS_ADD_CAP_BASE` (42 → 90-120 en solo) sans toucher au
  spawner, pour que la horde présente à l'arrivée du boss ne soit pas purgée ;
- **C1c** : les deux, dosés.

**Risque de second ordre, à mesurer avant** : un boss est un combat de
positionnement. Ajouter de la horde pendant un boss augmente la pression
mécaniquement — le Tank et le Soigneur deviennent plus forts, le solo devient
plus dur que le coop à effectif égal. Mesurer `verifierBoss` et
`verifierMecaniques` (dont la garantie d'abri) **avant et après**, et pas
seulement le confort visuel.

### C2 — Accélérer la montée en début de segment (P1)

La courbe met 4-5 minutes à atteindre ~107 alors qu'elle sature en 5 minutes
pleines. Après un boss, elle repart de 42. Une rampe de reprise post-boss
(taux temporairement majoré pendant 30-45 s après la mort du boss) restaurerait
la densité plus vite sans toucher au régime permanent.

### C3 — Ne pas remettre `spawnAcc` à zéro entre battements (P2)

Correctif d'une ligne dans `_startBeat()`. Effet faible mais gratuit, et il va
dans le sens des deux précédents. À faire seulement après C1, pour ne pas
mélanger deux causes dans la même mesure.

## Ce qu'il ne faut PAS faire

- **Augmenter `MAX_ENEMIES_BASE` / `HARD_CAP`** : mesuré sans effet, le plafond
  est déjà atteint quand la horde a le temps.
- **Nerfer les armes pour « laisser vivre » la horde** : mesuré sans effet, les
  armes retirent 0 % de la population passé la minute 10.
- **Augmenter le taux de spawn nominal** : il sature déjà le plafond en régime
  ininterrompu. L'augmenter ne ferait qu'accélérer une montée qui est de toute
  façon purgée au boss suivant.

Ces trois pistes figuraient dans les briefs d'origine ; les trois sont écartées
par la mesure.

## Protocole de validation

Rejouer `sim/pop5.mjs` après chaque changement, aux mêmes minutes cibles, en
comparant la **courbe complète** et non le pic. Critère d'acceptation proposé :
la population moyenne hors boss ne descend jamais sous 50 % du plafond après la
minute 15, et la chute post-boss est résorbée en moins de 60 s.

Compléter par le banc de performance existant (`?banc`, relevé `R`) aux
densités réellement atteintes après correction — la mesure de population de ce
plan ne dit rien du coût CPU/GPU à 220 corps avec VFX et 4 joueurs.

## Fichiers

- `shared/game_state.js` — `_spawner`, `_bossAddCap`, `_startBeat`,
  `CFG.BOSS_ADD_CAP_BASE`
- `shared/timeline.js` — taux par battement si C2
- `docs/regles/SIMULATION.md`
