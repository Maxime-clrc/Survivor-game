# Lot R — Script strictement fixe (D2)

Dépend des lots P et Q. **La pression ne se règle qu'une fois la progression juste** :
mesurer un débit contre une courbe de cartes fausse ne dit rien.

C'est le lot qui retire tout scaling de puissance et qui répare les deux choses que ce
retrait casse.

---

## R1. Ce que « aucun scaling » veut dire exactement

D2 porte sur la **puissance mesurée de l'équipe** (`powerIndex`) et sur ses
**performances** (DPS, vitesse d'élimination, morts, dégâts subis). Aucune de ces
grandeurs n'entre plus dans la difficulté.

Le scaling par **effectif** reste : il est demandé au brief, et c'est la seule raison pour
laquelle une partie à un et à quatre joueurs est aujourd'hui comparable
(15,8 vagues en solo contre 16,0 à quatre).

### La raison de fond

Un scaler dont l'entrée est sa propre sortie n'est **pas mesurable**, et ce dépôt ne se
pilote que par la mesure — *« plusieurs ajustements de cette base de code se sont révélés
contre-intuitifs à la mesure »*. Il se ressent aussi : le joueur qui réussit voit le mur
monter, ce qui est le défaut classique de la DDA.

Ce qui disparaît est un mécanisme dont le dépôt documente lui-même le défaut : les PV du
boss suivaient `_teamPower()` en **linéaire plein**, donc une durée de combat
rigoureusement constante — **×1,00 de sensation de puissance** pour un écart de build
mesuré à **×4,54**. Le genou (`BOSS_POWER_KNEE: 2.5`, `BOSS_POWER_K: 0.50`) était la
première moitié du chemin ; D2 est la seconde.

---

## R2. Trois constantes, pas une ligne de logique

```js
WAVE_HP_POWER_K: 0,        // etait 0.55 — les PV d'ennemi ne suivent plus la puissance
WAVE_RATE_POWER_K: 0,      // etait 0.35 — le debit non plus
BOSS_POWER_REF: 2.36,      // remplace `power` dans les PV de boss : la build MEDIANE mesuree
```

Les deux premiers termes sont déjà écrits sous la forme `(1 + K × (power - 1))` : à `K = 0`
le facteur vaut 1 et le terme s'évanouit. **Zéro modification de logique.**

Le troisième doit remplacer l'appel : `const power = this._bossPower()` devient
`const power = CFG.BOSS_POWER_REF`.

### Pourquoi une référence et non le genou à zéro

`bossPower(p)` avec `BOSS_POWER_K = 0` rend `BOSS_POWER_KNEE` pour toute puissance
supérieure au genou, mais rend **`p` en dessous** — donc une build faible aurait encore des
PV de boss réduits, ce qui est un scaling résiduel. Et `BOSS_POWER_KNEE = 0` avec
`K = 0` rend **zéro** : le boss n'aurait plus de PV du tout.

Une référence explicite est la seule forme correcte, et elle est plus lisible : le boss est
calibré sur la build médiane, un point.

### L'échappatoire reste écrite

`bossPower()`, `BOSS_POWER_KNEE` et `BOSS_POWER_K` **restent dans le code**, ainsi que
`powerIndex()` et `_teamPower()` — ce dernier alimente encore la fenêtre de build, qui
affiche l'indice de puissance au joueur. Si la mesure du lot X dit que le grand écart est
intenable, revenir en arrière est un changement de trois constantes.

---

## R3. La conséquence chiffrée sur les boss

La durée d'un combat devient **inversement proportionnelle à la build**. En reprenant les
mesures du dépôt — 58 combats, médiane 70 s ; écart de build ×4,54 sur 300 manches solo :

| build | puissance | durée attendue |
|---|---|---|
| défensive et malchanceuse | 1,26 | **131 s** |
| médiane | 2,36 | **70 s** |
| chanceuse | 4,10 | 40 s |
| optimisée | 5,71 | **29 s** |

C'est le grand écart demandé, et il est **jouable aux deux bouts** — ce qui n'était pas
évident avant de faire le calcul. Mais il casse deux choses, et les deux se réparent.

---

## R4. Garde-fou 1 — plancher de barre : la chorégraphie doit se jouer

Un boss a **5 barres**, et chaque barre brisée ouvre du répertoire (`unlock[i]` dans
`BOSS_ROSTER`) : *« on apprend le combat par couches, ce qui est exactement ce que fait un
raid »*.

Un combat de 29 s traverse les cinq barres sans que la moitié des mécaniques n'ait le temps
de sortir. **On perd du contenu au moment précis où l'on récompense le joueur** — et le
répertoire est justement ce qui fait la difficulté des combats tardifs à la place des PV.

```js
BOSS_BAR_DWELL: 8,         // secondes minimales entre deux ruptures de barre
```

Les dégâts en excès sont **conservés** et s'appliquent à l'échéance : rien n'est perdu, la
rupture est différée. Cinq barres × 8 s = **40 s de combat au minimum**, ce qui garantit que
le répertoire complet passe à l'écran.

Deux points d'attache :

- la rupture est déjà un point de passage unique (`_bossBreak`), le plancher s'y insère
  sans nouveau chemin ;
- le boss peut déjà mourir dans sa propre rupture — *« deux barres traversées dans la même
  image : tester `this.boss` après chaque tour de boucle »*. Le plancher **supprime** ce
  cas, mais le test reste, il ne coûte rien et il protège la prochaine mécanique.

Le boss final passe à **10 s** (8 barres × 10 s = 80 s minimum, cf. lot W).

---

## R5. Garde-fou 2 — enrage : borner la longue queue

À 131 s, et bien au-delà si la build est pire que la pire mesurée, le boss **bloque
l'horloge de horde indéfiniment**. Il faut une sortie, et elle ne doit pas être une mort
sèche.

```js
BOSS_ENRAGE_AT: 150,       // secondes de combat avant le premier palier d'enrage
BOSS_ENRAGE_STEP: 30,      // un palier de plus toutes les 30 s
```

Passé le seuil, le boss gagne des dégâts et une mécanique de plus par palier,
**annoncé par le canal d'alerte**. Jamais en silence : c'est la règle déjà écrite pour les
variantes de rupture de barre — *« une variante muette surprend au lieu d'informer, ce qui
est exactement le reproche fait à une mécanique punitive »*.

L'équipe perd sur un pic qu'elle a vu venir, ce qui se lit comme « nous n'étions pas assez
forts » et non comme un compteur invisible.

### L'enrage ne contourne aucun invariant

- Une mécanique ratée **ne tue jamais un joueur à pleine vie** : le plafond vit dans
  `_hurt()` derrière le drapeau `mech` et l'enrage ne le touche pas.
- La progression de la sanction reste portée par le **cumul de Vulnérabilité** posé par
  `_mechHit()`. L'enrage **accélère ce cumul** plutôt que d'augmenter la valeur brute — même
  raisonnement que `MECH_DAMAGE_RATIO`, calibré en part des PV max et non en valeur brute
  *« qui vieillirait mal dès que les cartes de PV entrent en jeu »*.
- Une nouvelle entrée dans `MECHS`, en **fin** de table, pour l'annonce d'enrage. Niveau
  `ALERT_WARN` : le joueur n'a rien à *faire* d'un enrage, il a besoin de savoir ce qui
  vient de changer.

---

## R6. Les rampes passent au temps de horde

`ENEMY_HP_WAVE_RAMP` et `ENEMY_SPEED_WAVE_RAMP` étaient indexées sur le numéro de vague.
Elles s'indexent désormais sur la **minute de horde**, qui est la même pour tous.

```js
ENEMY_HP_MIN_RAMP: 13,     // PV gagnes par minute de horde
ENEMY_SPEED_MIN_RAMP: 4,   // inchange en valeur, l'unite change
```

### Dérivation de 13, depuis les mesures existantes

Le raisonnement compte plus que le chiffre, parce que le chiffre sera remesuré.

1. À la vague 16 — la fin de manche mesurée aujourd'hui — un grunt a
   `16 + 9 × 15 = 151` PV de base.
2. La puissance médiane y vaut 2,36, absorbée à `WAVE_HP_POWER_K = 0.55`, soit un facteur
   `1 + 0,55 × 1,36 = 1,75`. **PV effectifs : ~264**, et l'équilibrage y est jugé correct.
3. Sous D2, plus rien n'absorbe la puissance : les PV doivent porter seuls ce que la rampe
   *et* le terme de puissance portaient à deux.
4. La manche est deux fois plus longue et l'équipe deux fois plus chargée (24-26 cartes
   contre 13-15), d'où une escalade au-delà de la « sensation vague 16 » d'environ ×1,6 :
   **cible ~420 PV à la minute 30**.
5. `(420 − 16) / 30 ≈ 13,5`.

**À remesurer, pas à extrapoler.** Le critère d'acceptation qui compte n'est pas la valeur
de la rampe mais le **temps de mise à mort d'un grunt** : il doit rester dans une bande de
**0,15 à 0,50 s** pour une build médiane, du début à la fin. C'est cette bande qui fait que
« 120 ennemis » veut dire la même chose à la minute 5 et à la minute 25.

---

## R7. Compter les joueurs vivants

`_teamPower()` est une **moyenne sur tous les joueurs**, à terre compris, et les PV de boss
suivent `crowd^1.15` avec `crowd = players.size`. Une équipe de quatre dont deux sont morts
affronte donc un boss calibré pour quatre.

Sur une manche de trois minutes c'était du bruit. Sur trente minutes avec six boss, c'est
structurel.

**Les termes de pression comptent les joueurs vivants**, avec une **hystérésis** de quelques
secondes pour qu'une mise à terre de deux secondes ne fasse pas osciller la formule.

Sous D2, cela ne concerne plus que deux endroits — le `crowd` des PV de boss et le `crowd`
du débit — mais c'est là que ça compte le plus. Un point de passage unique, `aliveCrowd()`,
pour la même raison que `assignColors()` en a un : sinon chaque appel refait le test à sa
manière.

**Attention au piège symétrique** : la normalisation de l'expérience
(`joueurs^WAVE_CROWD_EXP` dans `_addXp`) doit continuer de compter les joueurs
**connectés**, pas les vivants. Sinon une équipe qui perd deux joueurs voit ses paliers
d'expérience *baisser* au moment où elle tue moins — un cadeau exactement au mauvais
moment, et une boucle de rétroaction que D2 refuse.

---

## R8. Répertoire de boss sur le segment, pas sur le compteur

Aujourd'hui `floor: Math.min(this.bossCount - 1, CFG.BOSS_BARS - 1)` — le boss démarre avec
le répertoire déjà ouvert des combats précédents. C'est bon et ça reste ; l'unité change
pour le **numéro de segment**, qui est le même pour tous.

Deux équipes voient donc la **même chorégraphie au segment 4**, ce qui la rend apprenable et
racontable — la condition de tout contenu de boss, et la même raison qui a fait passer les
seuils d'ennemis du temps écoulé au numéro de vague : *« sur une horloge, la composition
d'une vague dépendait de la vitesse à laquelle l'équipe avait nettoyé les précédentes »*.

En pratique `bossCount` et `segment` coïncident, mais l'écrire ainsi supprime la
possibilité qu'ils divergent (un boss non tué, une reprise, un événement).

---

## R9. Saturation au HUD

Conséquence directe de D2, détaillée au lot P (§P5) : les apparitions au-delà de
`MAX_ENEMIES` sont silencieusement jetées, donc la difficulté **plafonne au moment où
l'équipe perd** et rien ne le dit.

Le lot R livre l'affichage : population / plafond, en **information et non en scaling**. Se
déduit de `enemies.length`, ne circule pas.

Passé le plafond, la difficulté ne monte plus par le nombre mais par les **PV** (R6) et les
**traits** (lot T).

---

## R10. Fichiers touchés

| fichier | ce qui change |
|---|---|
| `shared/game_state.js` | les trois constantes ; `_spawnEnemy` sans terme de puissance ; `ENEMY_HP_MIN_RAMP` ; `_boss` lit `BOSS_POWER_REF` et `segment` pour `floor` ; `aliveCrowd()` ; `_bossBreak` porte le plancher de barre ; l'enrage |
| `shared/bosses.js` | `BOSS_BAR_DWELL`, `BOSS_ENRAGE_AT`, `BOSS_ENRAGE_STEP` dans `BOSS_CFG` ; une entrée d'enrage en **fin** de `MECHS` |
| `public/hud.js` | saturation ; barre de boss : marquer visuellement l'enrage |
| `public/client.js` | `pushAlert` pour l'enrage ; `POWER_MARKS` à remesurer — *« un multiplicateur affiché sans échelle n'informe personne »*, et l'échelle change de sens quand le boss ne suit plus la puissance |
| `LISEZMOI.md` | la section « Difficulté indexée sur la puissance de l'équipe » devient l'historique d'une décision renversée, avec la raison |

### Ce qui reste, et pourquoi

`powerIndex()`, `bossPower()`, `_teamPower()`, `_playerPower()`, `p.powerMods` : **tous
conservés**. Ils alimentent la fenêtre de build, qui affiche l'indice de puissance au
joueur, et *« le recoder côté client donnerait deux implémentations qui divergent au premier
réglage »*. Ils cessent seulement d'alimenter la difficulté.

Corollaire agréable : la règle *« la progression permanente est exclue de la difficulté par
construction »* devient triviale — plus rien n'est indexé sur les mods, donc `p.powerMods`
n'est plus qu'un chiffre d'affichage. L'invariant tient sans avoir à y penser.

---

## R11. Mesures

| mesure | cible |
|---|---|
| durée d'un boss, builds 1,26 → 5,71 | 131 s → 29 s, **jamais sous 40 s** (plancher de barre) |
| répertoire de boss effectivement joué | **100 %** des mécaniques débloquées sortent au moins une fois par combat |
| part des combats atteignant l'enrage, build médiane | **< 5 %** — au-delà, `BOSS_ENRAGE_AT` est trop bas ou `BOSS_HP_BASE` trop haut |
| part des combats atteignant l'enrage, build défensive malchanceuse | **20 à 50 %** — c'est la population que le garde-fou doit attraper |
| temps de mise à mort d'un grunt, build médiane | **0,15 à 0,50 s** du début à la fin |
| écart lit / ignore les annonces, par boss | **> 40 %** — règle du dépôt, à revérifier |
| taux d'échec par mécanique, au premier contact | **aucune au-dessus de 60 %** — règle du dépôt |
| une mécanique ratée tue-t-elle un joueur à pleine vie | **jamais**, y compris en cauchemar avec trois cumuls de Vulnérabilité **et l'enrage actif** |

---

## R12. Critères d'acceptation

- `WAVE_HP_POWER_K` et `WAVE_RATE_POWER_K` valent **0** ; aucun autre chemin ne réintroduit
  la puissance dans les PV d'ennemi ni dans le débit.
- Les PV d'un boss ne dépendent **que** de l'effectif vivant, du numéro de segment, de la
  difficulté et de son `hpMul` de roster.
- Une barre de boss ne se rompt **jamais** moins de `BOSS_BAR_DWELL` après la précédente, et
  les dégâts en excès ne sont **pas perdus**.
- Un combat de boss dure **au moins 40 s** (80 s pour le boss final), quelle que soit la
  build.
- L'enrage **s'annonce** par le canal d'alerte à chaque palier.
- L'enrage ne permet jamais de tuer un joueur à pleine vie par un seul échec de mécanique.
- La normalisation de l'expérience compte les joueurs **connectés**, la pression les
  joueurs **vivants**, et les deux ne sont jamais confondus.
- `powerIndex()` et `bossPower()` restent exportés et purs : la fenêtre de build continue
  d'afficher l'indice de puissance et le genou.
- Revenir à l'ancien comportement est un changement de **trois constantes**, vérifié en
  rejouant une mesure de référence.
