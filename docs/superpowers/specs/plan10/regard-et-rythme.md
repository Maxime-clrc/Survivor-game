# Plan — le regard, et la progressivité des combats de boss

**Vérifié contre l'archive du 16 août.**

Deux défauts distincts, mais qui se cumulent pour produire la même sensation :
**on subit sans comprendre**.

---

## A · La mécanique de regard est punitive parce qu'elle est SOUTENUE

### Ce que fait le code

```js
GAZE_WARN: WARN_STANDARD,   // 1,6 s d'avertissement — classe « standard »
GAZE_TIME: 2.0,             // puis 2 s d'ETAT DANGEREUX
GAZE_TICK: 0.5,             // un test toutes les 0,5 s
GAZE_RATIO: 0.22,           // 22 % des PV max par test
```

```js
} else if (b.gaze > 0) {
  b.gaze -= dt;
  for (const p of this._alivePlayers()) {
    p.gazeCd -= dt;
    if (p.gazeCd > 0) continue;
    if ((p.aimX * dx + p.aimY * dy) / d < 0.6) continue;
    p.gazeCd = BOSS_CFG.GAZE_TICK;
    this._mechHit(p, BOSS_CFG.GAZE_RATIO);
  }
}
```

**Deux secondes d'état, un test toutes les demi-secondes : jusqu'à quatre coups
à 22 %, soit 88 % des PV max.** Un joueur qui met une seconde à comprendre est
déjà à moitié mort.

Et le problème n'est pas que le chiffre : c'est la **forme**. Un état soutenu
n'a pas de fin lisible. Le joueur ne sait pas quand il peut viser de nouveau,
donc il attend trop, perd son DPS, puis reprend au hasard — souvent trop tôt.

### La refonte : un instant de résolution, pas un état

Le modèle de FFXIV, et c'est le bon : **un décompte, une résolution, terminé.**

```js
GAZE_WARN: WARN_PREPARATION,   // 4,0 s — la classe des mécaniques qui demandent
                               // de CHANGER DE POSTURE (stack, spread, tours),
                               // pas seulement de lire le sol. Pas de valeur
                               // hors classes.
GAZE_TIME: 0,              // SUPPRIMÉ : plus d'état soutenu
GAZE_TICK: 0,              // SUPPRIMÉ : plus de tic
GAZE_RATIO: 0.30,          // UN seul coup, donc plus fort qu'un tic
```

À la fin du décompte, **un seul instantané** : chaque joueur dont la visée est
orientée vers le boss prend un coup, une fois. Puis la mécanique est finie.

Trois gains, et le troisième est le plus important :

- **le pire cas passe de 88 % à 30 %** des PV max ;
- **le décompte dit quoi faire et quand** — on détourne la visée avant la fin, on
  la reprend juste après ;
- **la fin est un événement**, pas une absence. Le joueur sait que c'est passé.

### Le canal visuel — la partie la plus importante du lot

**Le regard est la seule mécanique dont la réponse n'est pas spatiale.** Toutes
les autres disent « va là », et un télégraphe au sol suffit. Celle-ci dit
« oriente ta visée autrement » — aucun marquage au sol ne peut l'exprimer. Elle a
donc besoin de son propre canal, et c'est pour ça qu'un œil discret sur le boss
ne suffira jamais.

Un motif unique, décliné sur quatre couches : **l'œil barré**. Le même signe
partout, pour qu'il s'apprenne en une fois.

#### Couche 1 — la pulsation d'arène

Une onde circulaire part du boss et traverse **toute l'arène**, portant le motif
d'œil barré en filigrane. Elle bat sur un tempo qui **accélère** à mesure que le
décompte se referme — dernière pulsation au moment de la résolution.

C'est la couche qui dit « quelque chose se passe » à quelqu'un qui regarde
ailleurs, et le tempo remplace le chiffre : on sent l'échéance sans la lire.

⚠ **Faible opacité, obligatoirement.** En cauchemar, `parPhase: 2` superpose deux
mécaniques : si la pulsation masque un télégraphe au sol, elle transforme une
mécanique lisible en piège. Elle doit se voir sans jamais concurrencer le sol.

#### Couche 2 — la vignette d'écran

Les bords de l'écran s'assombrissent et pulsent au même tempo. C'est de l'espace
écran, donc **impossible à manquer** quelle que soit la position de la caméra, et
ça n'occupe aucun pixel de jeu.

La machinerie existe déjà : `FOG_VIGNETTE` et `FOG_FROM` servent à la brume.

#### Couche 3 — l'œil barré au centre du regard

Grand, au centre de l'écran, **qui se remplit** pendant le décompte. Le
remplissage EST le compte à rebours, comme pour tout autre télégraphe.

Son état dit ce que fait le joueur : **éteint et sourd quand la visée est
détournée, vif et rouge quand elle ne l'est pas.**

#### Couche 4 — le secteur interdit, ancré sur le joueur

**C'est la couche qui règle ton « on ne comprend pas ».**

Un cône rouge part du personnage en direction du boss, de demi-angle
`acos(0,6) ≈ 53°` — exactement le seuil que le code teste. Tant que le réticule
est dedans, il est rouge ; dès qu'il en sort, il redevient neutre.

Le joueur n'a plus à deviner s'il « regarde » : **il le voit**, en continu, et il
sait de combien il doit encore tourner. C'est l'avantage que FFXIV n'a pas — dans
un MMO, la visée n'est pas explicite, donc le joueur ne sait jamais s'il a réussi
avant la résolution.

#### La résolution

Les quatre couches s'effondrent **ensemble** vers l'intérieur, avec un éclair —
même pour ceux qui ont réussi. C'est ce qui dit « c'est passé, revise », et c'est
la moitié de ce qui manque aujourd'hui.

**Une tolérance de 0,2 s** avant l'instant : un joueur qui détourne dans la
dernière fraction de seconde ne doit pas être puni par un test à l'image près.

#### Accessibilité

Les quatre couches sont **visuelles**. Le son de résolution accélère la lecture,
il n'en porte aucune information exclusive.

### Une variante à garder pour cauchemar

`GAZE_PERMANENT: 4` existe déjà — le regard qui ne se ferme plus, en phase
tardive du Veilleur. **Elle reste**, mais devient la seule occurrence d'état
soutenu du jeu, réservée à la dernière phase en cauchemar. Une règle ne se brise que si elle est
solide partout ailleurs — et ce serait alors la seule exception du jeu.

---

## B · Les combats ne sont pas assez progressifs

### Ce que fait le code

```js
BOSS_ATTACK_CD: 3.2,
BOSS_PHASE_CD_STEP: 0.09,
const phase = Math.max(0.55, 1 - CFG.BOSS_PHASE_CD_STEP * b.phase);
```

| phase | intervalle |
|---|---|
| 1 | 3,20 s |
| 2 | 2,91 s |
| 3 | 2,62 s |
| 4 | 2,34 s |
| 5 | 2,05 s |

**La rampe existe mais elle est plate** : un facteur 1,6 entre le début et la
fin. Et surtout, le départ à 3,2 s est déjà rapide — avec `parPhase: 2` en
normal, une seconde mécanique tombe `SUITE_GAP` (2,2 s) après la première. Donc
dès la **phase 1**, deux mécaniques en 2,2 s puis une pause de 1 s.

C'est ça que tu ressens : le combat commence à son rythme de croisière.

### Correction 1 — un départ plus lent et une rampe plus marquée

```js
BOSS_ATTACK_CD: 4.6,        // était 3.2
BOSS_PHASE_CD_STEP: 0.11,   // était 0.09
```

| phase | avant | après |
|---|---|---|
| 1 | 3,20 s | **4,60 s** |
| 2 | 2,91 s | 4,09 s |
| 3 | 2,62 s | 3,59 s |
| 4 | 2,34 s | 3,08 s |
| 5 | 2,05 s | **2,58 s** |

La phase 5 reste plus dense qu'aujourd'hui en phase 3, mais la phase 1 laisse
respirer. Le facteur passe de 1,6 à **1,8**, et le combat **monte** au lieu de
commencer plein régime.

### Correction 2 — `parPhase` suit la PHASE, pas seulement la difficulté

C'est le vrai levier de progressivité. Il applique la courbe voulue : *barre 1 =
A seule · barre 2 = B seule · barre 3 = A+B · barre 4 = C seule · barre 5 =
tout*.

Aujourd'hui `parPhase` est une constante de difficulté (1 en calme, 2 sinon).
Deux mécaniques simultanées dès la première barre en normal, c'est contraire à
la courbe voulue.

```js
// nombre de mécaniques par salve = min(parPhase, 1 + floor(phase / 2))
// normal, parPhase 2 :  phase 1 -> 1  |  phase 2 -> 1  |  phase 3+ -> 2
// cauchemar reste plus dur par `superpose`, pas par le nombre
```

Le joueur apprend une mécanique à la fois, puis les voit se combiner. C'est
exactement ce que la structure `base` + `unlock[0..3]` prépare déjà — il ne
manquait que la cadence pour l'accompagner.

### Correction 3 — une mémoire de trois, pas de un

```js
if (choice === b.lastAttack && pool.length > 1) { ... }
```

L'anti-répétition ne regarde que **la dernière** attaque. Avec un pool de trois
ou quatre, on obtient facilement `A B A B A B` — d'où ta remarque que le regard
revient trop souvent.

**Garder les trois dernières** et tirer hors de cette liste tant que le pool le
permet. Trois lignes, et la variété perçue change du tout au tout.

---

## Critères d'acceptation

1. Un joueur ne peut plus perdre **plus de 30 %** de ses PV max sur une seule
   occurrence de regard.
2. Après une résolution de regard, un joueur **reprend sa visée dans la seconde**
   — mesurable : temps moyen entre la résolution et le premier tir.
2bis. **Un joueur sait à tout instant s'il est en faute**, sans attendre la
   résolution — c'est la couche 4 qui le garantit.
2ter. La pulsation d'arène **ne masque aucun télégraphe au sol** quand deux
   mécaniques se superposent.
3. **Aucune mécanique ne se répète avant que trois autres soient passées**, tant
   que le pool contient au moins quatre entrées.
4. En normal, la **phase 1 ne présente jamais deux mécaniques simultanées**.
5. L'intervalle entre mécaniques en phase 1 est **au moins 1,7×** celui de la
   phase 5.
