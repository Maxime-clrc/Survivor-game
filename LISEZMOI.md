# Survivor — mesures et reglages

Ce fichier ne contient QUE ce qui ne se relit pas dans le code : les chiffres
releves en simulation, les reglages qui en decoulent et les limites connues.
Les regles du projet vivent dans `CLAUDE.md`, le catalogue dans `shared/`.

**Remesurer plutot qu'extrapoler** quand un reglage change.

## Mesures relevées

### Expérience indexée sur la minute (lot D du plan d'équilibrage)

Protocole du lot C, plus une **graine écrite par manche** (`Math.random` remplacé
par un mulberry32 dérivé du numéro de manche, restauré en `finally`) : deux
réglages se comparent alors sur les **mêmes** manches, et le vérificateur est
**rejouable** — deux appels rendent la même liste. Sans ça rien n'était décidable
— voir plus bas. `mesureProgression()` / `verifierProgression()`, huit manches,
normal.

`XP_LEVEL_GROWTH` faisait dépendre la valeur d'un kill du **niveau d'équipe**,
c'est-à-dire de la sortie de la jauge qu'il alimente. Remplacé par
`XP_MINUTE_GROWTH = 1,055` sur la **minute de horde** (`_xpTimeMul()`, renommé
depuis `_xpLevelMul`).

| niveau atteint, mêmes graines | min 8 | min 20 | min 32 | cartes | écart-type |
|---|---|---|---|---|---|
| avant — 1 j | 13 ±1,5 | 25,5 ±5,6 | 30 ±5,7 | 26,3 | 5,0 |
| après — 1 j | **10 ±0,6** | 21 ±3,6 | 25,5 ±4,2 | 26,6 | **3,1** |
| avant — 4 j | 14,5 ±2,2 | 26 ±6,0 | 27,5 ±5,3 | 24,9 | 4,5 |
| après — 4 j | **10 ±1,2** | 27 ±5,3 | 30 ±5,3 | 26,1 | 4,3 |

Cible : 10 / 20 / 27. **Le début se cale exactement et sa dispersion est divisée
par deux et demi** ; le milieu et la fin restent au-dessus à quatre joueurs.

Verdict de `verifierProgression([1, 4], 8)`, rejouable tel quel : solo, l'écart
-type des cartes est à 3,1 pour un plafond de 3 et la minute 32 à 25,5 pour 27 —
les deux autres marques passent. À quatre, la minute 20 est à 27 pour 20, la
minute 32 au plafond de niveau, et **la cadence se resserre au milieu** (0,89 puis
0,71 min par niveau). La cause n'est pas la courbe mais la **normalisation par
l'effectif** : quatre joueurs tuent bien plus de quatre fois plus vite, et
`joueurs^WAVE_CROWD_EXP` ne reprend pas tout. L'exposant est **verrouillé** sur
celui du plafond de population (lot A) : il ne se corrige pas depuis ce lot.

**Deux constantes de coût bougent, et ce n'est pas dans le plan.** Le coût d'un
palier croissait de **1,18 par niveau** contre un revenu de 1,055 par minute : à
`LEVEL_XP_BASE` fixé, aucune valeur ne tient les deux bornes à la fois — la
tranche du milieu demande une base basse, celle de la fin une base haute, et
l'écart entre les deux demandes est d'un facteur deux. Mesuré sur onze couples,
`LEVEL_XP_GROWTH 1,18 -> 1,10` avec `LEVEL_XP_BASE 200 -> 330` est le seul
attelage qui cale le début, garde 26-27 cartes et resserre la dispersion. Les
onze couples sont dans l'historique de `shared/version.js`.

**Le plafond de niveau mordait.** À l'ancienne courbe la moitié des manches
finissaient collées à `LEVEL_MAX` (29 cartes), ce qui écrasait artificiellement
l'écart-type par le haut. Après, la fin de manche est à 25,5-26,6 : le plafond ne
borne plus rien, et l'écart-type mesure enfin la courbe.

**Le critère de dispersion reste rouge, et il mesure la mauvaise chose.**
L'écart-type du nombre de cartes par manche tombe de 5,0 à 3,1 en solo pour un
plafond de 3, mais ce qu'il capture surtout est la **longueur de manche** : 3
manches sur 8 se terminent en solo contre 7 sur 8 à quatre. La dispersion propre
à la courbe se lit à minute fixe, et là elle est franche : ±1,5 → ±0,6 à la
minute 8. Un critère d'écart-type sur une grandeur de fin de manche a besoin que
les manches se terminent — c'est-à-dire du lot H.

**Garde-fou remplacé et mesurable** (`verifierProgression`) : la cadence en
minutes par niveau doit rester **croissante** par tranche, à 10 % près
(`CADENCE_TOL` — sans tolérance, deux manches suffisent à retourner le signe).
Après : 0,89 / 1,09 / 2,67. Une cadence qui se resserrerait en fin de manche
serait une progression sans fin, et c'est ce que l'ancien garde-fou (« ne pas
monter au-dessus de `LEVEL_XP_GROWTH` ») disait sans pouvoir se vérifier.

**Rien de ce que le lot C avait réglé ne recule**, vérifié à graines appariées en
normal : durée médiane d'un combat de boss 88 → 87 s en solo et 74 → 83 s à
quatre, victoires 4/8 → 3/8 et 7/8 → 7/8 (dans le bruit). Le ttk de fin de manche
**s'améliore** au passage, 1,08 → **0,47 s** en solo, parce que la courbe plate
place les derniers niveaux là où l'ancienne les rendait inatteignables. Un relevé
non apparié donnait 4/6 → 1/6 sur les victoires : c'était du bruit, et c'est
exactement pour ça que les graines sont écrites.

### PV, temps de mise à mort et référence de boss (lot C du plan d'équilibrage)

Protocole : six cas (trois modes × 1 et 4 joueurs), manche complète, bots
immortels, **carte tirée au hasard parmi les trois offertes** (le bot des lots
précédents prenait toujours la première, ce qui n'est pas une build médiane),
médiane sur 6 manches. `mesureTTK()` / `verifierTTK()`.

TTK = PV d'un grunt ÷ (`BULLET_DAMAGE / FIRE_INTERVAL` × `powerIndex`) : la
puissance EST le multiplicateur de dps, le dps nu est une cadence de base.

| ttk d'un grunt | min 1 | min 10 | min 20 | min 30 |
|---|---|---|---|---|
| avant — normal 1 j | 0,40 | 0,91 | 1,46 | 2,15 |
| après — normal 1 j | 0,34 | 0,58 | 0,71 | **0,87** |
| après — normal 4 j | 0,32 | 0,44 | 0,54 | **0,79** |
| après — calme 1 / 4 j | 0,26 / 0,25 | 0,25 / 0,35 | 0,32 / 0,45 | 0,46 / **0,63** |
| après — cauchemar 1 / 4 j | 0,42 / 0,45 | 0,51 / 0,54 | 0,51 / **0,74** | 0,60 / **0,99** |

**Le critère sort rouge en fin de manche, et le plan le prévoyait à moitié.**
`ENEMY_HP_MIN_RAMP` passe de 13 à 7 comme décidé, ce qui divise l'écart par plus
de deux : la cible de 0,60 s est tenue partout jusqu'à la minute 10, cassée dans
deux cas sur six à la minute 20 et dans quatre à la minute 30. La cause
n'est pas la rampe : c'est la **puissance médiane réelle**. Le plan la supposait à
×4,7 en fin de manche, elle est mesurée entre **2,7 et 3,2** — le niveau 30 est
atteint vers la minute 20 et la build cesse alors de progresser. Un troisième
aller-retour sur la rampe est explicitement refusé ; l'écart appartient au lot D.

**`BOSS_POWER_REF` : 2,36 → 2,89, et la valeur converge.** Relevé de
`_playerPower()` à la mort de chaque boss, en normal (le seul mode où
`diff.boss` vaut 1) : médiane 3,06 en solo et 2,72 à quatre, soit 2,89. Réinjectée,
elle se remesure à 2,65 / 3,18, médiane **2,92** — la mesure est son propre point
fixe, une seule itération a suffi.

| durée médiane d'un combat de boss | calme | normal | cauchemar |
|---|---|---|---|
| `BOSS_POWER_REF` 2,36 — 1 / 4 j | 41 / 47 | 65 / 74 | 62 / 51 |
| `BOSS_POWER_REF` 2,89 — 1 / 4 j | 43 / 59 | **85 / 60** | 76 / 82 |

À 2,36 la moitié des combats tombaient sur le **plancher de barre** (40 s,
`BOSS_BARS × BAR_DWELL`) : le boss ne mourait pas de ses PV mais de la vitesse à
laquelle les barres consentent à casser, ce qui est le symptôme exact d'une
référence périmée. Seul calme solo reste sous la fourchette de 50-90 s, à 43 s,
et c'est cohérent : `diff.boss` y vaut 0,75.

**Le critère de non-régression n'est pas mesurable avec ce bot.** Survie médiane
d'une équipe qui joue mal, `ENEMY_HP_MIN_RAMP` 13 puis 7 : 5,0 → 5,3 min en
normal solo, 5,3 → 5,3 à quatre, 5,3 → 5,3 en calme. Les quinze manches meurent
au **premier boss**, au segment 1 : le bot ne pare pas, n'esquive pas et
n'utilise aucune compétence. Ce n'est pas la horde qui le tue, donc baisser les
PV de horde ne peut pas déplacer le chiffre. Même limite qu'aux lots B et J.

**Un artefact de mesure trouvé en chemin :** `botInput` vise le corps le plus
proche, donc les renforts et jamais le boss — un combat de boss ne se terminait
pas et la moitié des manches restaient bloquées au segment 1, horloge de horde à
l'arrêt. `botVersBoss` corrige, localement au lot C pour ne pas déplacer les
mesures des lots précédents.

### Traits, élites et bonus au sol (lot J du plan d'équilibrage)

Protocole : neuf cas (trois modes × 1, 2 et 4 joueurs), 37 min de jeu simulé,
bots immortels, échantillonnage à 6 Hz.

**Aucun des deux plafonds de traits n'en était encore un.**

| | plafond de traînée | saturé | préavis de ruée à l'écran |
|---|---|---|---|
| avant — cauchemar 1 / 2 / 4 j | 18 | 80 / 79 / 84 % | 31 / 11 / 22 |
| après — cauchemar 1 / 2 / 4 j | 81 | 18 / 41 / 48 % | 8 / 8 / 8 |

**La demande naturelle de traînée est de 200 à 400 zones.** Plafond levé, en
cauchemar : 397 (1 j), 268 (2 j), 200 (4 j) zones vivantes pour **18 places**.
Chaque porteur en tenait donc moins d'un vingtième : le trait n'existait pas. Et
il couvrait alors **19 à 27 % d'une vue en moyenne, jusqu'à 165 %** — le double
du budget de sol déjà écrit dans le dépôt (`HAZARD_SURFACE_MAX`, 12 %).

**Le plafond se dérive de l'ÉCRAN, pas de la population.** `trailMax()` rend ce
qui remplit 12 % d'une vue à `TRAIL_R = 26`, soit **81**. Le plan proposait
`_enemyCap() × 0,09`, qui vaut exactement 81 au plafond de cauchemar à quatre —
même nombre, mais indexé sur une grandeur qui bouge : à un joueur il serait tombé
à 29 alors que la horde entière tient sur le seul écran de ce joueur. La
lisibilité est une propriété de la vue, pas de l'effectif.

**Le plafond seul ne suffisait pas** : 200 à 400 de demande contre 81 places, il
serait resté saturé en permanence, donc constante et non plafond. L'empreinte par
porteur (`TRAIL_LIFE × vitesse / TRAIL_STEP`) valait 8,7 zones vivantes ; elle
est ramenée à 2,1 par `TRAIL_LIFE 4 → 1`, avec `TRAIL_DOT 14 → 26` pour rendre en
intensité ce que la durée perd. Le pas ne bouge pas : une traînée reste continue,
elle s'efface en une seconde.

**Le préavis de ruée devient un budget par VUE, pas une recharge.** Porteurs à
portée de ruée d'un joueur, selon le cas : **17 à 283**. Tenir « huit préavis à
l'écran » par la recharge aurait demandé un `DASH_CD` de 2,6 à 14 s selon le cas,
à re-régler à chaque changement de plafond. `DASH_WARN_MAX = 8` est le critère
lui-même, appliqué à l'octroi : mesuré à **8 exactement** dans les neuf cas, et un
préavis refusé ne consomme pas sa recharge.

**Le levier « comportement » se lit au nombre de traits par corps, pas à la part
de porteurs.**

| | traits par corps | part de horde porteuse |
|---|---|---|
| calme | 0,00 | 0 % |
| normal | 0,90 | 89 à 91 % |
| cauchemar | 1,66 | 97 à 99 % |

Le critère du plan — facteur 2 de `calme` à `cauchemar` — est vrai **par
construction**, `calme` n'attachant aucun trait : il ne dit rien. Le chiffre qui
dit quelque chose est le nombre de traits par corps, **×1,85 de normal à
cauchemar**, et c'est celui-là que `verifierTraits()` surveille, en croissance
stricte d'un mode au suivant.

**Les élites diluaient avec l'effectif.** `WAVE_ELITE_CROWD_EXP` valait 0,4 face
au 0,75 de `WAVE_CROWD_EXP` : la part d'élites décroissait en `joueurs^-0,35`.
Porté à **0,75** — même exposant des deux côtés, comme le plafond de population du
lot A.

| part des corps | 1 j | 2 j | 4 j | élites vues sur la manche |
|---|---|---|---|---|
| avant, calme | 2,5 % | 1,5 % | 1,3 % | 63 / 83 / 109 |
| après, calme | 2,3 % | 2,1 % | 1,9 % | 63 / 106 / 173 |
| après, normal | 2,2 % | 2,6 % | 1,7 % | 63 / 105 / 176 |

Le rapport 4 j / 1 j passe de 0,52 à 0,80 ; le reste est dans le bruit (±0,4 point
entre deux essais identiques). Une élite reste rare — 1 à 2 corps sur cent — donc
identifiable, ce que « Curée » (lot E-7) suppose.

**Les bonus au sol ne se mesurent pas sans pilote.** Le bot ne va pas les
chercher : 1 à 12 % ramassés, tout le reste périmé. Le seul chiffre
pilote-indépendant est l'occupation du sol, **1,1 à 2,9 bonus en permanence** pour
un `POWERUP_MAX_GROUND` de 2 — le générateur est donc bloqué la plupart du temps
par des bonus que personne n'a pris, et les dépouilles de `_killEnemy` passent
au-dessus du plafond. Aucune valeur touchée : la clémence des bonus est un critère
de profil, et le protocole du dépôt n'a pas de pilote.

**Le critère de composition sans tank sort rouge, et c'est le protocole.**
Dégâts subis par joueur et par minute, 12 min, trois essais :

| | avec tank | sans tank | écart |
|---|---|---|---|
| normal, rien neutralisé | 578 | 265 | 0,46× |
| normal, `dash` neutralisé | 406 | 350 | 0,86× |
| normal, `trail` neutralisé | 283 | 277 | 0,98× |

**Aucun type ne porte `trail` en normal** : neutraliser un trait absent déplace le
chiffre d'un facteur deux. La mesure est dominée par le bruit, et augmenter les
essais n'y changerait rien — le bot n'utilise ni Rempart ni Provocation, les deux
seules choses qui font un tank. `mesureComposition()` est livrée avec le lot ; le
critère est renvoyé au lot I, qui a besoin d'un pilote (même réserve qu'au lot B).

### Vitesse et bestiaire (lot B du plan d'équilibrage)

**Le décrochage n'existait pas.** Distance au poursuivant le plus proche, joueur
sans aucune carte de mobilité, fuite en ligne droite, paquet de 40 corps, sans
réapprovisionnement :

| | 5 s | 10 s | 15 s |
|---|---|---|---|
| avant, les trois modes, toutes les minutes | 22 px | 22 px | 22 px |
| après — calme, minute 25 | 387 | 765 | 1 144 px |
| après — normal, minute 25 | 264 | 503 | 726 px |
| après — cauchemar, minute 25 | 171 | 268 | 365 px |

22 px est exactement `r_runner + PLAYER_RADIUS - PLAYER_BITE`, la distance de
séparation : le poursuivant était **collé**, indéfiniment, dans les neuf cas.

**La rampe additive effaçait le bestiaire.** `ENEMY_SPEED_MIN_RAMP = 4` px/s par
minute, identique pour tous, était mathématiquement une compression : le rapport
lent/rapide tombait de 4,7× à 2,1× sur une manche. La rampe multiplicative
(`ENEMY_SPEED_RAMP_PCT = 0,007`) le rend **invariant par minute** : 3,55×, à la
minute 0 comme à la minute 30, dans les trois modes.

**La table du plan cassait sa propre doctrine.** Écrite pour un runner à 196, elle
oubliait deux facteurs — le `speed` de difficulté qu'elle introduisait elle-même,
et le tirage ±10 % qui existait déjà. Vitesse du runner à la minute 30 :

| | nominale | haut de tirage | plafond |
|---|---|---|---|
| normal | 237 | 261 | 234 |
| cauchemar | 266 | 292 | 234 |

`196 × 1,21 = 237` : la base cassait la doctrine **avant** tout multiplicateur de
mode. Résolu sur le pire cas réel (haut de tirage, cauchemar, minute 30) :
runner **156**. Ce qui faisait tomber le rapport lent/rapide à 3,0×, d'où deux
fiches touchées hors plan pour tenir le plancher de 3,5× — **tank 52 → 44** et
**bulwark 58 → 50**. Le pire cas mesuré est à 233 px/s pour un plafond de 234.

**Le mur de corps n'en est pas un.** Temps pour parcourir 600 px depuis le centre
d'un encerclement, arène au plafond, biome nu :

| | corps | sortie |
|---|---|---|
| à vide | 0 | 2,31 s |
| calme / normal, tout effectif | 176 à 622 | 2,3 s |
| cauchemar 4 joueurs | 900 | 2,3 à 2,5 s |

C'est la réponse à la question laissée ouverte par le lot A (« à 622, personne ne
sait ») et elle tient dans un invariant déjà écrit : `_separateFromPlayers` ne
déplace **jamais** le joueur, seulement l'ennemi. Traverser neuf cents corps coûte
donc des **dégâts de contact**, pas du temps. `verifierEncerclement()` reste comme
garde-fou : le jour où un corps repoussera un joueur, il le dira.

**La mort médiane solo ne franchit pas le seuil demandé.** Neuf essais, bot
mortel :

| | avant | après |
|---|---|---|
| calme | 5,3 min | 5,3 min |
| normal | 4,8 min | 5,3 min |
| cauchemar | 2,7 min | 3,7 min |

Le critère visait le segment 3, soit dix minutes ; aucun mode n'y arrive, ni avant
ni après. **Ce chiffre mesure le bot, pas le jeu** : il ne pare pas, n'esquive pas
et n'utilise aucune de ses deux compétences. Le seul enseignement exploitable est
l'écart, +37 % en cauchemar. Un critère de survie a besoin d'un pilote, et le
protocole du dépôt n'en a pas.

### Plafond de population et grille spatiale (lot A du plan d'équilibrage)

Protocole : bots immortels, 45 min de jeu simulé, trois essais par case, les six
segments traversés dans les 27 cas. Population moyenne par segment, temps de
première saturation, ms de simulation par image.

| | plafond | population par segment | 1ʳᵉ saturation | ms méd. / p99 |
|---|---|---|---|---|
| calme 1j | 176 | 5 12 21 27 35 37 | 35 min (1 essai/3) | 0,06 / 0,20 |
| calme 2j | 296 | 6 20 21 33 44 48 | 35 min (1/3) | 0,07 / 0,26 |
| calme 4j | 498 | 10 24 20 26 36 43 | jamais | 0,13 / 0,59 |
| normal 1j | 220 | 6 19 24 32 37 28 | jamais | 0,09 / 0,32 |
| normal 2j | 370 | 9 29 35 34 80 86 | jamais | 0,12 / 1,29 |
| normal 4j | 622 | 17 67 45 125 166 100 | 31 min (1/3) | 0,17 / 4,55 |
| cauchemar 1j | 319 | dégénéré — voir plus bas | 9,6 min (1/3) | 0,04 / 0,97 |
| cauchemar 2j | 536 | 15 109 75 96 95 108 | 9,1 min (2/3) | 0,21 / 3,71 |
| cauchemar 4j | 900 | 20 52 34 67 70 82 | jamais | 0,19 / 2,26 |

**La parité d'effectif est le résultat principal**, et elle ne se lit pas sur le
niveau atteint (écrêté par `LEVEL_MAX = 30`, et bruyant à ±5 niveaux entre deux
essais identiques) mais sur les **tués**, une fois divisés par `joueurs^0,75` —
la division exacte que `_addXp` applique à l'expérience :

| | 1j | 2j | 4j | ÷ `joueurs^0,75` |
|---|---|---|---|---|
| calme | 4 889 | 8 220 | 14 350 | 4 889 / 4 887 / 5 074 |
| normal | 6 066 | 10 041 | 16 282 | 6 066 / 5 970 / 5 757 |

Soit **95 à 104 %**. C'est ce que le lot achetait : le plafond porte le **même
exposant** que la division d'expérience, donc la horde grossit exactement de ce
que la normalisation retire. Avant, la division s'appliquait seule.

**Le plafond ne mord presque plus.** Trois cases seulement saturent, toutes après
la minute 9, et jamais dans les trois essais. Le régulateur de fin de manche
n'est plus le plafond mais le **débit face à ce que l'équipe nettoie**.

**Le moteur tient bien plus que le plafond.** Arène forcée pleine, bots au repos,
60 s par palier :

| corps | médiane | p99 |
|---|---|---|
| 220 | 0,18 ms | 0,95 ms |
| 622 | 0,73 ms | 1,77 ms |
| 900 | 2,00 ms | 3,56 ms |
| 1600 | 4,98 ms | 7,04 ms |
| 2000 | 8,75 ms | 14,58 ms |

`MAX_ENEMIES_HARD_CAP = 900` coûte donc 3,6 ms au p99 sur un budget de 16, et le
budget ne casse qu'entre 1600 et 2000 corps. **La marge est de 1,8× en nombre de
corps** — c'est elle que les lots B et J dépensent s'ils alourdissent le coût par
ennemi. Le plafond de 900 ne mord au demeurant qu'en cauchemar à quatre, où la
valeur naturelle est 902.

**Les débits du script sont redevenus opérants** (A-2). Temps qu'un beat met à
remplir le plafond, horde jamais nettoyée :

| beat | débit | calme | normal | cauchemar |
|---|---|---|---|---|
| segment 4 beat 1 | 2,2/s | 60 % en 60 s | 60 % en 60 s | 53 % en 60 s |
| segment 4 beat 5 | 3,8/s | 58 s | 58 s | 91 % en 60 s |
| segment 5 beat 5 | 4,4/s | 50 s | 50 s | 57 s |
| segment 6 beat 5 | 5,0/s | 44 s | 44 s | 50 s |

**Le temps est le même à 1, 2 et 4 joueurs**, au dixième de seconde : plafond et
débit portent le même exposant d'effectif, donc l'un ne peut pas rattraper
l'autre. Et la montée reste un gradient et non une marche — un beat d'ouverture
de segment 4 ne remplit que 60 % du plafond, le crescendo du segment 6 le remplit
en 44 s sur les 300 du segment.

Deux réserves écrites, parce qu'elles portent sur le protocole et non sur le lot :

- **cauchemar en solo est dégénéré** : les bots immortels restent bloqués sur le
  premier boss quarante minutes (segment 1 ou 2 atteint sur trois essais). Ses
  chiffres ne veulent rien dire, dans aucun sens.
- **la croissance de population n'est pas monotone** sur huit cases : creux au
  segment 3 partout, et au segment 6 en normal. La quantité écrite au script
  monte bien ; c'est la **puissance de l'équipe** qui monte plus vite qu'elle sur
  ces deux fenêtres. Ça se règle en C (PV et TTK), pas en relevant le plafond.

Simulation à 4 joueurs, mesurée sur ce projet :

| t | ennemis | snapshot | bande passante / joueur |
|---|---|---|---|
| 60 s | 16 | 2,7 Ko | 53 Ko/s |
| 120 s | 28 | 3,1 Ko | 62 Ko/s |
| 180 s | 33 | 3,8 Ko | 75 Ko/s |
| 300 s | 52 | 3,9 Ko | 78 Ko/s |
| pire cas | 200 (plafond) | 8,1 Ko | 163 Ko/s |

430 s de jeu se simulent en 0,9 s de CPU, soit 460× le temps réel.

Ces chiffres sont ceux du **banc**, arène pleine construite à la main. Le relevé
en **production** (VPS, vague 22 atteinte en jeu réel) monte à **9,5 Ko clair,
3,9 Ko déflaté** : la ligne « pire cas » ci-dessus n'est donc pas un plafond
absolu, seulement le pire cas *de ce banc*. Ce qui compte est que la valeur
transmise soit celle **déflatée** — c'est elle qui passe sur le lien.

Le pire cas est mesuré arène pleine en cauchemar, avec quatre tourelles posées,
le ricochet actif sur tout le monde et **24 zones simultanées** (un damier plus
un balayage). Les tourelles coûtent 5 nombres chacune, une zone 12 : le poste
dominant reste et restera la liste des ennemis. À quatre joueurs, cela
représente environ 5,2 Mbit/s en sortie du serveur — sans conséquence sur un
réseau local filaire ou en Wi-Fi correct.

Le rang d'élite ne coûte **rien** : il voyage dans le champ de type (+100)
plutôt que dans un drapeau séparé, qui aurait ajouté un nombre sur chacun des
200 ennemis. Le marquage de **retardataire** s'y ajoute (+200) pour la même
raison : un huitième élément payé sur tous les ennemis, vingt fois par seconde,
pour une information qui ne concerne que les dernières secondes d'une vague.

Le **compteur de touches**, lui, a bien fallu le payer — c'est le seul champ
ajouté à la liste d'ennemis depuis l'origine. Mesuré arène pleine, tous les
ennemis déjà touchés (le pire cas absolu) :

| version du compteur | poids de l'instantané | hausse |
|---|---|---|
| sans compteur | 6,65 Ko | référence |
| un octet complet (0 à 255) | 7,43 Ko | **+11,8 %** |
| un chiffre (0 à 9) | 7,04 Ko | **+5,9 %** |

Le budget qu'on s'était fixé était de 10 %. La première version le dépassait, et
c'est la mesure qui a tranché : un chiffre suffit largement, puisque le client ne
lit qu'une différence entre deux instantanés consécutifs. Sur une campagne
normale à un joueur, la bande passante passe de 11,0 à 11,6 Ko/s.

### Les deux champs du lot de lisibilité

Le **propriétaire d'une balle** et la **provenance du dernier dégât subi**. Le
dépôt avait jusqu'ici refusé de transmettre le premier, et la raison était bonne :
il ne servait qu'à attribuer des dégâts, ce que `bd` résout côté boss sans rien
payer par balle. Ce qui a changé, c'est l'usage — la lisibilité du tir, qu'aucune
déduction locale ne peut retrouver.

Pire cas mesuré : arène pleine (200 ennemis, la moitié déjà touchés), **400 balles
en vol**, 50 projectiles ennemis, quatre joueurs.

| version | poids de l'instantané | hausse |
|---|---|---|
| avant le lot | 14 844 o | référence |
| + provenance (4 joueurs) | 14 852 o | **+0,05 %** |
| + propriétaire (400 balles) | 15 652 o | **+5,4 %** |

Sur une manche réelle de 420 s, moyenne sur 25 200 instantanés : **+0,9 %** en
solo (889 → 897 o), **+2,0 %** à quatre (1 834 → 1 870 o). La provenance coûte
quatre nombres par instantané, quelle que soit la scène ; c'est la balle qui paie,
et elle ne paie qu'en fin de manche chargée.

Le total reste sous le budget de 10 % et du même ordre que le compteur de touches.
La répartition des dégâts subis par provenance est mesurée plus haut, dans « D'où
viennent les dégâts qu'on prend ».

### Grande arène et caméra (lot I)

L'arène passe de 1600 × 900 à **4800 × 2700** ; la **vue** reste 1600 × 900,
chaque client suit sa position prédite (caméra lissée, recalage sec au-delà
d'un écran, clamp à la salle). Les combats de boss se jouent dans des
**bounds resserrés à une vue**, ancrés sur le centre de gravité de l'équipe —
c'est le mécanisme de constriction du lot 5, réutilisé tel quel, et toute la
géométrie des mécaniques (damier, exaflares, couronne…) lit désormais les
bounds au lieu de l'arène dessinée.

Coût des coordonnées à quatre chiffres, mesuré arène pleine (200 ennemis, la
moitié touchés, 400 balles, 4 joueurs, 4 points de récolte) :

| version | poids de l'instantané | hausse |
|---|---|---|
| même scène à l'échelle 1600 × 900 | 15 791 o | référence |
| grande arène (coordonnées + clé `hv` + éclats) | 16 547 o | **+4,8 %** |

Sous le budget de 10 %. La caméra a été vérifiée en jeu réel : le suivi
s'arrête exactement à `ARENA_W − VIEW_W/2 = 4000` px au bord droit, et la
conversion souris reste juste pendant le déplacement (mémorisée en vue,
convertie en monde à la lecture).

Les **points de récolte** (cristal à détruire, amas à canaliser 1,5 s)
n'apparaissent jamais à moins de 1100 px d'un joueur vivant ni pendant un
boss ; le rendement (15-35 **éclats**, la monnaie de manche, jamais persistée)
est versé à chaque joueur — même logique que l'expérience commune. Les
retardataires sont resserrés (5 s, ×2,0) : un fuyard sur une salle neuf fois
plus grande ne se rattrapait plus. Les apparitions se tirent **autour de la
boîte englobante des joueurs** (hors écran, écrêtée à la salle) et non plus
sur les bords : sur une arène d'une seule vue, ce tirage redonne exactement
les quatre bords d'avant.

Restent à mesurer en conditions réelles (fenêtre visible, table à quatre) :
les images par seconde avec culling actif — le compteur `?perf` est en place —
et la durée moyenne d'une vague avant/après (attendu : écart sous 15 %).

### Économie du Terminal (lot H)

Le revenu devient **linéaire et plafonné** — on paie la vague atteinte, plus
la somme des vagues traversées, qui croissait au carré : une seule bonne
partie payait une ligne entière au palier maximal (≈ 3 100 noyaux mesurés,
dont deux tiers de primes de première fois, supprimées avec le lot). Les
coûts deviennent géométriques (200 → 3 600, 6 900 la ligne), les emplacements
se gagnent aux **jalons du compte** et plus aux achats. Cibles du spec F5,
vérifiées avec les fonctions réelles :

| mesure | attendu | relevé |
|---|---|---|
| vague 12, normal, 2 boss | 250 à 350 | **280** |
| vague 20, cauchemar, 4 boss | plafonné à 600 | **600** |
| parties pour un premier palier | 1 | **1** (200 ◈, ~280-378/partie) |
| parties pour une ligne complète | 16 à 20 | **18,3** |
| parties pour trois lignes complètes | 50 à 60 | **54,8** |
| emplacements compte neuf → maximal | 3 → 6 | **3 → 6** (jalons) |

Vérifié en jeu réel : une manche vague 1 en normal verse exactement 14 noyaux
(10 × 1 × 1,4). L'écart compte neuf / compte maximal reste à remesurer en
simulation complète (attendu sous 1,5 vague — les valeurs des lignes n'ont
pas changé, seuls le rythme d'acquisition et la capacité ont bougé).

### Rendu WebGL

Mesuré dans Chrome sans tête, sur un banc synthétique qui reproduit le pire cas
annoncé — 220 ennemis plus 3 000 particules :

| mesure | attendu | relevé |
|---|---|---|
| appels de dessin par image | 2 à 4 | **2** (un normal, un additif) |
| quads par image, pire cas | sous 4 000 | **3 220** |
| mémoire GPU de l'atlas | sous 16 Mo | **1,5 Mo** à densité 1, **6,1 Mo** à densité 2 |
| teinte, alpha, éclair, additif | exacts | lecture de pixels conforme aux quatre |

Les deux appels de dessin sont le chiffre qui compte : un lot vidé à chaque
sprite donnerait des centaines d'appels pour exactement la même image, et rien à
l'écran ne le dirait. `?perf` dans l'adresse les affiche en jeu, à côté des
images par seconde, du nombre de fragments et du chemin de rendu utilisé.

La lecture de pixels vérifie les quatre points où une bascule WebGL échoue
visuellement : une teinte rouge pleine rend `255,0,0,255`, un alpha de 0,5 rend
`127,127,127,127` (prémultiplié — un `255,255,255,127` aurait signalé l'erreur),
un éclair à 1 rend du blanc pur, et deux quads additifs à `0x40` rendent `128`.

Les images par seconde ne sont **pas** mesurables ainsi : le rendu logiciel de
Chrome sans tête ne dit rien d'un GPU réel, et le temps virtuel fige les
horloges. Elles se relèvent en session réelle avec `?perf`.

### Les axes de cartes du lot 6

Les dégâts par seconde sont mesurés sur **cible fixe et immortelle** — un ennemi
neuf replanté à chaque tick, 120 s de tir. C'est la seule mesure qui compare
deux chargements sans faire dépendre le résultat de la survie du bot.

La comparaison se fait **à nombre de cartes égal**, ce qui est le seul angle
honnête : un chargement critique complet ne coûte pas le même nombre de tirages
qu'un chargement brut complet.

| chargement | cartes | dps | chance critique |
|---|---|---|---|
| nu | 0 | 60 | 5 % |
| critique orienté (Précision ×2, Mire, Œil de faucon) | 4 | 98 | 49 % |
| brut (Affûtage ×3, Calibre) | 4 | 98 | 5 % |
| critique maximal (+ Talon faible ×2) | 8 | 135 | 60 % |
| brut (Affûtage ×6, Calibre ×2) | 8 | 134 | 5 % |

**Écart entre build critique et build brute : 1,1 %** à huit cartes, 0,9 % à
quatre — le critère du lot était « moins de 30 % ». La chance critique d'une
build orientée atteint 49 %, au-dessus de la fourchette de 25 à 45 % annoncée
dans le plan : les plafonds d'exemplaires ont déjà été abaissés une fois à la
mesure (Précision 5 → 3, Mire 3 → 2, Œil de faucon 2 → 1), et descendre plus bas
faisait tomber la build critique **sous** la build brute.

Conséquence chiffrée du critique de base : la puissance d'un joueur nu passe de
1,00 à **1,05** dans `_playerPower()`, donc les PV de boss et la pression des
vagues montent de 5 % — c'est exact, tout le monde inflige réellement 5 % de
dégâts en plus, et c'est précisément le rôle de l'indexation.

Variété du pool, 200 manches simulées avec la même dérive de qualité que le jeu :

| tirages dans la manche | communes distinctes vues | pire cas |
|---|---|---|
| 18 | 14,3 | 8 |
| 20 | **15,1** | 11 |

Le critère était « plus de 15 ». Il est atteint en haut de la fourchette de
tirages (le dépôt en annonce quinze à vingt) et manqué de peu en bas : le pool
de rareté basse se vide toujours en milieu de manche, parce que la dérive de
qualité pousse mécaniquement les épiques. Douze communes ajoutées au lieu des
huit du plan, et c'est le levier qui reste si le chiffre doit encore monter.

Aucune case de secours (Ravitaillement) n'a été servie sur les 200 manches, là
où le pool d'avant en servait : c'est l'effet secondaire attendu d'un catalogue
passé de 77 à 106 cartes. **Mesure prise à 106 cartes** — le catalogue en compte
116 depuis, et l'effet ne peut qu'avoir grandi. Le chiffre n'est pas mis à jour
ici : une mesure se remesure, elle ne se réécrit pas.

### Les trois modes, mesurés séparément

C'est le lot où la mesure par mode devient **obligatoire** : depuis que la
difficulté n'est plus un facteur d'échelle, elle ne se déduit plus d'un
multiplicateur.

Protocole : quatre joueurs, **immortels**, 300 s de horde à segment fixe,
niveau 20 (bestiaire complet déverrouillé), compte neuf. Le bot est le même dans
les trois modes — il vise le plus proche, s'écarte de la masse et esquive dès que
la recharge est prête. Ce n'est pas un joueur ; l'écart entre modes est la mesure,
la valeur absolue ne l'est pas. Les joueurs sont immortels parce qu'avec un bot
les trois modes meurent au **même mur** — le premier boss, qui est identique
partout — et la survie brute ne mesurait alors que ce mur.

| segment | mode | population moyenne | dégâts subis / min | CPU moyen | p99 |
|---|---|---|---|---|---|
| 1 | calme | 11 | 58 | 0,006 ms | 0,033 ms |
| 1 | normal | 66 | 1 944 | 0,023 ms | 0,116 ms |
| 1 | cauchemar | 130 | 1 415 | 0,062 ms | 0,201 ms |
| 3 | calme | 175 | 698 | 0,058 ms | 0,143 ms |
| 3 | normal | 183 | 2 019 | 0,075 ms | 0,178 ms |
| 3 | cauchemar | 189 | 2 688 | 0,095 ms | 0,211 ms |
| 5 | calme | 187 | 1 177 | 0,062 ms | 0,148 ms |
| 5 | normal | 191 | 2 754 | 0,074 ms | 0,169 ms |
| 5 | cauchemar | 194 | 3 033 | 0,085 ms | 0,190 ms |

Quatre lectures, dont deux sont des avertissements.

**Les modes se séparent au segment 1 et se rejoignent après.** 11 / 66 / 130 en
population au segment 1, puis 187 / 191 / 194 au segment 5 : la population sature
contre `MAX_ENEMIES` dans les trois modes dès qu'on ne meurt pas. C'est une limite
du protocole — des bots immortels ne tuent pas assez — et pas un défaut des modes,
mais elle dit quelque chose de vrai : **c'est le début de manche qui porte
l'identité du mode**, la fin les rapproche mécaniquement par le plafond.

**Les dégâts subis se classent correctement à partir du segment 3** (698 / 2 019 /
2 688, puis 1 177 / 2 754 / 3 033) mais **pas au segment 1**, où cauchemar (1 415)
passe sous normal (1 944). Ce n'est pas une erreur de mesure : en cauchemar les
quotas font entrer des medics et des choeurs, qui n'infligent rien eux-mêmes et
prennent la place de types qui frappent — et l'aura du choeur allonge la durée de
vie de tout le paquet, donc réduit le nombre de kamikazes qui arrivent au bout de
leur course. Un mode plus dur qui fait *moins* mal la première minute est un
résultat contre-intuitif à surveiller au lot X ; il n'est pas absurde — un mur qui
ne se perce pas est une autre façon d'être dur.

**La part de zone reste quasi nulle partout** (0,3 % au mieux) alors que les
traînées de cauchemar plafonnent bien à 18 zones. Deux causes : un bot qui kite en
permanence est précisément le joueur qui ne met jamais le pied dans une flaque, et
surtout **le biome n'existe pas encore** — c'est le lot V qui porte la promesse
« le sol participe ». La cible du plan (« cauchemar doit montrer une part de zone
nettement plus élevée ») n'est donc pas atteignable à ce lot, et c'est attendu.

**Le coût CPU reste très en dessous du budget** : 0,095 ms de moyenne et 0,211 ms
de p99 dans le pire cas mesuré, contre 1 ms et 8 ms de budget. Les neuf types, les
six traits et les trois profils ne coûtent rien.

Mesure complémentaire, joueurs **mortels** cette fois, cinq essais par mode, à
quatre : survie médiane **307 s** en calme, **298 s** en normal, **236 s** en
cauchemar, soit un facteur **1,30**. Sous la cible de 1,5 à 2,5 — mais les trois
médianes tombent au même endroit, l'arrivée du premier boss à 300 s, ce qui
signifie que la mesure est saturée par le mur du boss et non par le mode. À
refaire au lot X avec un pilote capable de passer un boss.

### Vagues et progression

Cinq essais par configuration, bots qui visent l'ennemi le plus proche (le boss
en priorité quand il est là), fuient la menace et esquivent au contact.

| joueurs | vagues en 900 s | niveau d'équipe | cartes prises | durée d'une vague normale |
|---|---|---|---|---|
| 1 | 15,8 | 15,4 | 14,2 | 56,5 s |
| 2 | 17,6 | 14,2 | 13,2 | 51,8 s |
| 3 | 18,0 | 13,8 | 12,6 | 47,1 s |
| 4 | 16,0 | 14,0 | 13,0 | 49,2 s |

Le résultat quasi identique à un et à quatre joueurs **est le but** : le budget
de vague et les paliers de niveau portent le même exposant d'effectif (0,75), ce
qui donne la même partie quel que soit le nombre de joueurs.

Coût, sur les mêmes essais : **22,9 à 55,6 Ko/s** par joueur (plafond fixé à
160), et **0,20 à 1,07 s de CPU pour 600 s simulées** (plafond fixé à 3 s).

Chargements forcés sur les cartes qui réécrivent le tir, que des bots ne
tireraient jamais spontanément — c'est le cas qui inquiétait, une balle qui ne
disparaît plus se teste contre 200 ennemis à chaque image :

| chargement | CPU / 600 s | bande passante |
|---|---|---|
| témoin, tirage libre | 0,59 s | 42 Ko/s |
| Inertie | 0,71 s | 52 Ko/s |
| Inertie + Canon long ×3 + Poudre ×3 | 0,55 s | 48 Ko/s |
| Rebond + Inertie + Canon long ×3 | **0,92 s** | **68 Ko/s** |
| Rebond + Second canon ×2 + Écho | 0,74 s | 65 Ko/s |

Le pire cas reste à moins d'un tiers du budget CPU. Ce sont le plancher de
dégâts d'Inertie et le plafond de rebonds qui le tiennent : sans eux, une balle
à 0,1 dégât restait en vol jusqu'à expiration en se testant contre toute
l'arène, et le coût montait avec la densité — c'est-à-dire au pire moment.

### Classes : écarts entre compositions

Cinq essais par composition, mêmes bots que ci-dessus, avec en plus l'usage des
deux compétences dès que la situation s'y prête. **Aucun réglage n'a encore été
touché à la suite de ces chiffres** — ils sont le constat, pas la conclusion.

| composition | j | vague | niveau | survie | durée d'une vague | durée d'un boss |
|---|---|---|---|---|---|---|
| tireur | 1 | 5,6 | 7,2 | 162 s | 27,3 s | 42 s |
| soigneur | 1 | 4,8 | 6,6 | 162 s | 27,9 s | — |
| tank | 1 | 6,0 | 8,0 | 218 s | 34,9 s | 56 s |
| tireur ×2 | 2 | 5,4 | 6,2 | 196 s | 30,2 s | 54 s |
| tank + tireur | 2 | 5,0 | 5,8 | 180 s | 28,2 s | — |
| soigneur + tireur | 2 | 7,0 | 7,8 | 286 s | 37,2 s | 59 s |
| tank + soigneur + tireur | 3 | 8,6 | 9,8 | 445 s | 50,9 s | 77 s |
| trio + tireur | 4 | 8,0 | 8,4 | 354 s | 39,9 s | 66 s |

**Écart à effectif égal** — le chiffre qui décide : **1,2 vague à un joueur**
(4,8 à 6,0), mais **2,0 vagues à deux** (5,0 à 7,0), au-dessus de la limite de
1,5 qu'on s'était fixée. Le duo le plus fort est *soigneur + tireur*, le plus
faible *tank + tireur*.

| classe | dégâts | part du tireur | soins |
|---|---|---|---|
| tank (avec tireur) | 7 024 | 45 % | — |
| tank (trio) | 35 478 | 56 % | — |
| soigneur (avec tireur) | 13 087 | 31 % | 458 |
| soigneur (trio) | 16 371 | 26 % | 1 191 |

Le tank tient l'objectif (au moins 40 % des dégâts du tireur), **le soigneur ne
le tient pas** : 26 à 31 %. C'était attendu — le temps passé en mode soin est du
temps sans dégâts — mais l'objectif était écrit sans compter les soins à part.

Survie du **soigneur solo : 162,1 s contre 162,0 s** pour le tireur solo, soit
0,1 % d'écart là où on tolérait 20 %.

Taux d'utilisation des compétences : **17 à 79 %** des recharges consommées,
contre 80 % attendus. Le chiffre en dit plus sur les bots que sur les
compétences : ils ne déclenchent que sous condition (rempart s'il y a au moins
deux ennemis dans la zone, bombe s'il y en a deux dans le rayon visé), et un bot
qui appuierait dès que c'est prêt afficherait 100 % sans rien prouver.

Coût : **0,06 à 0,88 s de CPU pour 900 s simulées** (plafond 3 s) et **7,7 à
11,3 Ko/s par joueur** (plafond 160). Le lot n'a rien changé à ces deux postes.

Observation structurelle, à garder en tête avant tout réglage : **les PV du boss
sont indexés sur la puissance de l'équipe, qui intègre le multiplicateur de
dégâts de classe**. Le +20 % du tireur lui achète donc +20 % de PV de boss et
ne lui laisse que ses 85 PV en moins ; le −20 % du tank lui rend un boss plus
tendre en plus de ses 150 PV. Sur les vagues, l'indexation est partielle (55 %
et 35 %), donc l'effet ne s'y annule pas de la même manière.

### États et purge

Dix essais par composition, mêmes bots que ci-dessus, avec en plus : le soigneur
vise l'allié et non l'ennemi quand il est en mode soin, et un joueur sous
Sentence court vers lui. La Sentence et le Miasme n'ont pas encore de porteur —
le roster de boss est le lot suivant — ils sont donc **posés par le harnais** aux
cadences prévues (Miasme toutes les 25 s pendant un boss, Sentence toutes les
20 s) : c'est la mécanique qu'on mesure, pas son câblage.

| composition | survie | vague | états simultanés / joueur | max | purges par manche |
|---|---|---|---|---|---|
| témoin, système débranché | 208 s | 5,7 | 0,00 | 0 | — |
| tank + soigneur + tireur | 173 s | 5,0 | 0,06 | 2 | 3,2 (59 % des états posés) |
| tank + tireur + tireur | 161 s | 5,0 | 0,06 | 1 | 0,4 (13 %) |

**Écart avec / sans soigneur : 7 %**, pour une limite fixée à 25 %. L'objectif du
lot est tenu : le soigneur accélère, il n'est pas une condition d'accès. Les
états simultanés restent très en dessous de la limite de 2 — les sources sont
rares aujourd'hui (les élites, et le Miasme seulement pendant un boss), le
chiffre était à **remesurer au lot 4** quand les boss en poseraient vraiment.

**Remesuré**, en trio, sur 120 s de combat par boss porteur d'états :

| boss | états simultanés / joueur | max | cumuls de Vulnérabilité |
|---|---|---|---|
| Oracle | 0,90 | 1 | 2,59 |
| Jumeaux | 0,35 | 1 | 0,02 |

La limite de 2 tient toujours, et le maximum de 1 chez les Jumeaux **n'est pas un
hasard** : cumuler Brûlure et Entrave déclenche l'explosion, qui retire les deux
dans la foulée. Chez l'Oracle, ce sont les **cumuls** qui montent — 2,59 sur 3
possibles, entre le Miasme toutes les 25 s et les échecs de mécanique. C'est
exactement l'usure que le lot 3 avait prévue sans pouvoir encore la produire.

Deux chiffres ne tiennent pas leur cible :

- **Taux de purge : 59 %** contre 60 % attendus, ce qui est la limite. Sans
  soigneur, les 13 % viennent des seuls rempart et Purification : c'est peu, mais
  c'est cohérent avec le principe — les états expirent tous seuls.
- **Survie à la Sentence : 42 %** contre 80 % attendus, sur 19 poses. La
  ventilation par classe est la vraie information : **tireur 4/5, tank 4/10,
  soigneur 0/4.**

Le soigneur ne peut pas se purger lui-même : son faisceau ne se soigne pas, et sa
seule réponse est la vague de soin, dont la recharge (16 s) est plus longue que
la cadence de Sentence testée (20 s à peine). **Contrainte pour le lot 4 : un
boss ne doit pas viser le soigneur avec la Sentence, ni en enchaîner plus vite
que la recharge de la vague.** Ne pas corriger en allongeant l'état ni en
autorisant une double purge — les deux videraient la règle d'ordre de son sens.
Le tank à 4/10 s'explique autrement : « soigné à plein » coûte d'autant plus cher
qu'on a de PV, et 150 PV à remonter en 8 s dans un combat de boss demande que le
soigneur lâche tout le reste. Un soigneur en ligne de vue purge en **0,48 s**,
mesuré à part : ce qui manque n'est pas la puissance de la purge, c'est la
position.

Coût CPU d'un tick, arène pleine (200 ennemis), quatre joueurs, après rodage du
JIT :

| situation | moyenne | p99 | pire |
|---|---|---|---|
| sans états | 0,051 ms | 0,17 ms | 0,29 ms |
| 4 états sur les 4 joueurs | 0,059 ms | 0,19 ms | 0,42 ms |

Le système coûte **8 µs par tick** dans le pire cas raisonnable, pour un budget
de 16,7 ms. C'était attendu : les états vivent sur les joueurs, qui sont quatre,
et non sur les ennemis, qui sont deux cents.

### Roster de boss

Cinq essais par configuration et par politique, renforts du boss coupés pendant
la mesure (on veut l'écart dû au **répertoire**, pas le bruit de deux cents
contacts), dix cartes par bot.

**Durée du combat**, bots invulnérables — on mesure ici le mur de PV seul, sans
que la survie des bots ne s'y mêle. Cible : 50 à 80 s, comparable d'un boss à
l'autre.

| boss | 1 j. | 2 j. | 4 j. |
|---|---|---|---|
| Ravageur | 49 s | 53 s | 57 s |
| Matriarche | 80 s | 76 s | 66 s |
| Métronome | 45 s | 48 s | 52 s |
| Oracle | — | 71 s | 78 s |
| Jumeaux | — | 70 s | 77 s |

Trois réglages sont sortis de cette table, et aucun n'était prévisible :

- **soin mutuel des Jumeaux, 2 % → 0,8 %** par seconde. À 2 %, le combat durait
  **167 à 198 s** : ils se rejoignent d'eux-mêmes puisqu'ils poursuivent des
  joueurs, et la mécanique n'invitait plus à se séparer, elle interdisait de
  gagner.
- **lien nourricier, 1,2 % → 0,5 %** par seconde et par rejeton, plus **un seul
  rejeton et une seule grappe en solo**. À deux, un joueur peut se détacher
  pendant que l'autre tient le boss ; seul, chaque cible secondaire est du temps
  de tir pris sur le boss lui-même — 95 s de combat contre 49 pour le Ravageur.
- **Oracle ×1,10 → ×0,95** de PV, pour la raison décrite plus haut.

Un bug a été trouvé par la même table : le lien nourricier était créé avec une
échéance nulle et se résolvait au premier tick, donc **le soin ne s'appliquait
jamais**. Les durées de la Matriarche n'ont pas bougé d'un réglage tant que
c'était vrai.

**L'écart entre un bot qui lit les annonces et un bot qui les ignore** — la
mesure qui compte. Elle est prise en **temps de survie**, les deux politiques
partageant l'esquive et le maintien de distance (c'est le geste de base du jeu,
pas de la lecture). Cible : plus de 40 %.

| boss | 1 j. | 2 j. | 4 j. |
|---|---|---|---|
| Ravageur | −7 % | +69 % | +63 % |
| Matriarche | +20 % | +37 % | +96 % |
| Métronome | +66 % | +99 % | +87 % |
| Oracle | — | +107 % | +120 % |
| Jumeaux | — | +26 % | +52 % |

**Neuf configurations sur onze au-dessus de la cible**, et l'ordre est celui
qu'on espérait : l'Oracle, dont tout le répertoire est collectif, double la
survie d'une équipe qui lit. Les deux qui échouent sont **solo** — normal, un
boss solo n'a presque que des zones à lire, et c'est exactement ce que le bot
« ignore » sait déjà faire à moitié via l'esquive commune. Le −7 % du Ravageur
solo dit surtout que notre bot esquive mal ; il ne dit rien de neuf sur le
combat, qui n'a pas changé dans ce lot.

**Taux d'échec par mécanique**, politique « lit », toutes configurations
confondues. Cible : aucune au-dessus de 60 % au premier contact.

| mécanique | poses | échec |
|---|---|---|
| appâts | 211 | 0 % |
| dispersion | 70 | 4 % |
| grappes | 66 | 0 % |
| tours | 64 | 31 % |
| regroupement | 62 | 18 % |
| sanctuaires | 59 | 0 % |
| proximité | 38 | 3 % |
| dénombrement | 8 | 25 % |
| lien | 2 | 100 % |

Le **lien** est le seul au-dessus de la cible, sur deux poses seulement : le bot
le traite après l'esquive des zones, et les croix des Jumeaux tombent pendant ce
temps-là. Test dédié, avec des bots qui s'écartent : **20 rompus sur 20**. La
mécanique est saine, la mesure ne l'est pas — elle est notée ici pour être
refaite avec de vrais joueurs.

Les **tours** à 31 % et le **dénombrement** à 25 % sont dans la cible et sont les
deux seules mécaniques que des bots ratent vraiment : ce sont aussi les deux qui
demandent de se répartir, donc de se parler.

**Coût**, 600 s simulées par boss, quatre joueurs, combats enchaînés :

| boss | CPU / 600 s | bande passante / joueur | marqueurs moyens |
|---|---|---|---|
| Ravageur | 0,43 s | 9,4 Ko/s | 0,0 |
| Matriarche | 0,29 s | 8,5 Ko/s | 2,5 |
| Métronome | 0,36 s | 8,9 Ko/s | 1,3 |
| Oracle | 0,21 s | 6,7 Ko/s | 1,3 |
| Jumeaux | 0,27 s | 8,2 Ko/s | 0,0 |

Plafonds : 3 s de CPU et 160 Ko/s. Les marqueurs coûtent 11 nombres chacun et il
y en a moins de trois en moyenne — c'est le poste le moins cher du snapshot.

**Critères d'acceptation**, vérifiés par script plutôt que supposés :

- cinq boss sortent, **sans répétition avant épuisement** — deux cycles complets
  vérifiés ;
- **l'Oracle et les Jumeaux ne sortent jamais en solo** — 200 tirages solo, trois
  boss vus ;
- une mécanique ratée **ne tue jamais** un joueur à pleine vie, y compris avec
  trois cumuls de Vulnérabilité en cauchemar ;
- une **déconnexion** en pleine mécanique de groupe ne bloque rien : les
  marqueurs orphelins se suppriment, le combat continue ;
- une **cage détruite** rend immédiatement sa mobilité au prisonnier.

### Durée des combats de boss

**q1 49 s, médiane 70 s, q3 89 s** sur 58 combats. Référence de l'ancienne
courbe, mesurée en solo dans les mêmes conditions : 54 / 63 / 64 / 68 s.

La médiane dépasse légèrement l'ancienne fourchette et la dispersion est large.
Les deux s'expliquent par le chargement : le bot prend systématiquement la plus
haute rareté offerte, et une série défensive ne fait aucun dégât au boss là où
une série offensive le plie. Les PV du boss restent indexés sur la puissance
mesurée de l'équipe, donc la durée ne dérive **pas** d'un boss au suivant — ce
qui n'était pas vrai avant ce lot : `_playerPower` comptait les canons
supplémentaires sans la pénalité de dégâts qui les accompagne, et surestimait la
puissance de 44 % avec deux « Second canon ». Le boss recevait des PV pour des
dégâts qui n'existaient pas : 76 s au premier boss, 172 s au troisième.

### Raretés obtenues

La dérive de rareté a dû être **remesurée** avec le passage aux vagues. Elle
était indexée sur le nombre de boss, qui ne dépassait pas 2 ou 3 par manche :
l'exposant restait petit tout seul. Indexée sur la qualité de tirage, qui monte
jusqu'à 11, l'ancienne dérive (1,35 / 1,8) donnait **3,06 légendaires par manche
et 99 % des manches en voyant au moins une**, contre 0,67 et 53 % avant le lot.
Le système entier perdait sa pointe.

Deux leviers plutôt qu'un : la dérive a été adoucie (**1,18**) *et* plafonnée
(6 crans). Adoucir seul ne suffisait pas ; plafonner seul à 1 tuait le bonus de
qualité des vagues de boss, qui n'avait alors plus aucun effet. Ce sont les
**épiques** qui absorbent l'augmentation du nombre de cartes, et c'est voulu :
c'est le palier où deux joueurs de la même table cessent de jouer le même jeu.

#### Ce que la mesure par effectif a montré

Ce calibrage-là avait été fait **à un seul effectif**, et c'est ce qui a produit
le défaut constaté en jeu — trop de légendaires en solo. Remesuré à 1, 2, 3 et
4 joueurs séparément, **12 manches menées jusqu'à la vague 20** par effectif,
dégâts désactivés (la mesure porte sur le contenu des tirages, pas sur le niveau
du bot ; sans ce masque la moitié des manches s'arrêtaient au premier boss et
aucune n'atteignait le jalon de la vague 10) :

| effectif | niveau atteint | cartes / joueur | légendaires | max | épiques |
|---|---|---|---|---|---|
| **avant** 1 j. | 16,75 | 15,08 | 0,92 | **3** | 7,08 |
| avant 2 j. | 15,33 | 14,25 | 0,79 | 2 | 6,13 |
| avant 3 j. | 13,83 | 12,67 | 0,75 | **3** | 5,81 |
| avant 4 j. | 14,67 | 13,25 | 0,63 | 2 | 6,21 |
| **après** 1 j. | 16,50 | 15,50 | 1,17 | **2** | 7,33 |
| après 2 j. | 15,08 | 14,00 | 1,25 | **2** | 5,71 |
| après 3 j. | 13,67 | 12,50 | 1,36 | **2** | 5,25 |
| après 4 j. | 14,67 | 13,42 | 1,31 | **2** | 5,67 |

Trois choses s'y lisent :

- **Le cas dégénéré existait bel et bien** : trois légendaires chez un joueur, à
  1 et à 3 joueurs. C'est ce que le plafond dur supprime — jamais plus de deux,
  quel que soit l'effectif, quelle que soit la chance.
- **Le nombre de légendaires ne dépend plus de l'effectif** : 1,17 à 1,36 par
  joueur, soit 16 % d'écart entre le meilleur et le pire, contre une moyenne qui
  variait sans raison lisible avant. Ce n'est plus une loterie, c'est une
  récompense de progression : deux jalons, deux légendaires si la manche va loin.
- **L'écart d'épiques entre effectifs vient du niveau atteint, pas des poids.**
  Brut, il atteint 40 % (5,25 à 7,33) et manque la cible de 30 % ; ramené au
  nombre de cartes obtenues — la seule comparaison honnête, puisqu'un solo monte
  1,4 niveau de plus sur vingt vagues — il tombe à **15 %** (41 à 47 % des cartes
  d'un joueur sont épiques, quel que soit l'effectif). Ce qui reste à corriger,
  si on veut y revenir, est la normalisation de l'XP sur l'effectif, pas la table
  des raretés.

Le pool ne s'épuise plus : **31 à 55 cartes distinctes** proposées sur une
manche complète selon l'effectif, sur un pool commun passé de 56 à 64 cartes. Les répétitions (9 à 40 sur ~45 tirages de trois cartes) sont attendues et
voulues : une carte cumulable doit pouvoir ressortir tant qu'elle n'est pas
plafonnée.

### Retrait des bonus au sol

Quatre bonus sortis de la rotation et fréquence divisée par deux : la réserve
était qu'une équipe **sans soigneur** en souffre plus que les autres, le bonus
`heal` étant sa principale source de récupération. Cela aurait contredit la
décision du lot précédent — le soigneur accélère, il n'est jamais une condition
d'accès. Mesuré sur **25 manches par configuration et par effectif**, bots
normaux (les dégâts comptent, cette fois — c'est la survie qu'on mesure) :

| | durée moyenne avant | après | écart |
|---|---|---|---|
| **sans soigneur** | 233,4 s | 239,5 s | **+2,6 %** |
| **avec soigneur** | 327,8 s | 372,2 s | **+13,6 %** |

L'absence de soigneur n'est donc **pas** devenue plus punitive : les deux
compositions gagnent, et l'écart entre les deux écarts (11 points) reste sous la
barre des 20 % qui aurait imposé de relever le poids de `heal` sans soigneur. Le
mécanisme existe pourtant déjà pour `purification` — il n'a pas été branché sur
`heal`, parce qu'un second bonus dont le poids dépend de la composition ferait
de `hasHealer()` un réglage de difficulté, ce que le dépôt refuse par principe.

La **vague atteinte** bouge de moins d'une demi-vague (5,98 → 6,19 sans
soigneur, 7,13 → 7,62 avec), sous la cible d'une vague d'écart. Par effectif
isolé, la dispersion reste large (−17 % à +29 %) : c'est la variance d'une
manche de survie avec bots, pas un effet du retrait — d'où la lecture sur la
moyenne des quatre effectifs.

### Motifs au sol

Bots remis à neuf après chaque image — la sanction de mécanique est calibrée en
part des PV **max**, gonfler la réserve ne protège donc de rien et les bots
tombaient au bout d'une minute. On mesure ainsi le combat entier et son pire cas
de zones, les dégâts encaissés étant comptés avant la remise à neuf.

**Zones simultanées et coût réseau**, un combat entier par ligne :

| boss | 1 j. | 2 j. | 4 j. |
|---|---|---|---|
| Ravageur | 15 | 20 | 13 |
| Matriarche | 7 | 13 | 8 |
| Métronome | 6 | 8 | 16 |
| Oracle | — | 2 | 4 |
| Jumeaux | — | 12 | 12 |

Pire cas mesuré : **20 zones simultanées**, moyenne de 1 à 4,5 selon le boss.
La cible du lot était « moins de 40 » : on est à la moitié, et le plafond de
rendu à 40 n'a jamais été atteint en jeu.

**Coût du snapshot.** Le pire cas réel n'est pas un combat de boss — son arrivée
balaie l'arène — mais une vague normale à arène pleine. Mesuré sur un état
synthétique (200 ennemis, 60 projectiles, un damier de 12 cases, 4 joueurs) :

| état | snapshot |
|---|---|
| sans le lot 5 | 6,4 ko |
| avec 25 flaques, arène resserrée et murs | 7,5 ko (**+16 %**) |

Sous la cible de +20 %. Deux choses y contribuent : `bn` et `wl` sont **absentes**
tant que l'arène ne bouge pas, et les **zéros de queue** des tuples de zone sont
coupés — un tuple en compte quinze et la plupart des formes n'en remplissent que
douze, ce qui économise trente-six nombres par damier et par instantané.

En combat réel de Matriarche maintenu à 150 s, le plafond de 25 mares n'est
jamais atteint : **11 zones simultanées** au pire, la horde ne tirant pas assez
vite. Le plafond reste en place — il protège du cas où la composition des
renforts changerait, et il coûte une boucle sur une liste déjà parcourue.

**CPU.** `_zoneHits` sur 40 zones (les six formes mélangées) × 4 joueurs :
**0,002 ms par tick**, contre **0,050 ms** pour l'évitement mutuel de 200
ennemis. Soit **4 %** du coût de l'évitement — négligeable, comme attendu.

**Écart entre lire les annonces et les ignorer**, la mesure de référence du dépôt
pour juger une mécanique. Dégâts subis sur 180 s à deux joueurs, **moyenne sur
huit combats** : sur un seul, le tirage d'attaques suffit à inverser le signe.

| boss | ignore | lit | écart |
|---|---|---|---|
| Ravageur | 1702 | 1175 | 31 % |
| Matriarche | 2139 | 1219 | 43 % |
| Métronome | 2245 | 1240 | 45 % |
| Oracle | 2703 | 2530 | 6 % |
| Jumeaux | 4042 | 3444 | 15 % |

Les trois premiers écarts sont sains. **Les deux derniers ne disent rien du lot**
et sont un artefact du bot : sa règle d'évitement est « fuir le centre de la zone
la plus proche », ce qui est exactement le mauvais geste pour un Pac-Man (où il
faut se **placer** dans un secteur) et ne traite ni le Regard, ni les tours, ni
la séparation des Jumeaux — c'est-à-dire l'essentiel des dégâts de ces deux
combats. À vérifier en jeu réel, pas en simulation.

### Ce qui n'a pas marché

**Donner plus de cartes ne rallonge pas la survie.** C'était le levier prévu
pour compenser la suppression des gains de niveau. Mesuré : à 22 cartes par
manche au lieu de 4, la survie ne bouge pas (77 à 128 s selon l'effectif, contre
95 à 134 s avec la courbe normale). Les morts viennent des **dégâts subis**, et
un joueur qui choisit ses cartes en prend majoritairement des offensives.

Réduire la pression des vagues ne marche pas davantage : −55 % sur les PV, le
débit et le budget ne change rien à la vague atteinte.

Ce qui manquait était ailleurs. La suppression des niveaux avait emporté avec
elle **+88 PV max** et **10 PV rendus par palier**, sans rien mettre à la place :
il ne restait plus aucune source de récupération entre deux vagues, sauf la mort
d'un boss — soit une fois toutes les cinq vagues. D'où le **soin de fin de
vague** (18 PV), qui ne figurait pas au plan du lot. Un répit qui ne rend rien
n'est pas un répit, c'est un compte à rebours.

Coût CPU d'un tick, arène pleine (200 ennemis), quatre joueurs :

| situation | moyenne | p99 | pire |
|---|---|---|---|
| sans aucune carte | 0,07 ms | 1,9 ms | 5,3 ms |
| toutes les cartes lourdes prises | 0,35 ms | 6,3 ms | 38 ms |

Le budget d'un tick est de 16,7 ms. Les cartes multiplient le coût par cinq et
il reste deux ordres de grandeur de marge : la crainte annoncée dans la
spécification — brûlure, vampirisme, ricochet et chaîne de foudre alourdissant
la boucle de collision au point de menacer le plafond de 200 ennemis — ne s'est
**pas** vérifiée. Les pics isolés à 38 ms sont des passages du ramasse-miettes,
et l'accumulateur du serveur les rattrape au tick suivant.

Effet du passage à une cadence fixe, deux joueurs simulés, moyenne sur huit
manches : survie de **182 s** contre 182 s pour l'ancienne courbe, même nombre
de boss atteints, **20 % de kills en moins**. Le réglage a demandé trois séries
de mesures — voir le commentaire de `FIRE_INTERVAL`, qui documente pourquoi la
valeur qui reproduisait le mieux l'ancienne pression (0,09) a justement été
écartée.

### Retour sensoriel

Mesures relevées avec un script jetable qui importe `public/audio.js` et
`public/events.js` tels quels, avec un faux `AudioContext` — les deux modules ne
dépendent ni du DOM ni du canvas, exactement pour ça.

| mesure | attendu | relevé |
|---|---|---|
| voix simultanées, 50 déclenchements dans la même image | plafonnées à 16 | **16** actives, 34 volées |
| même son 50 fois dans la même image | filtré par la recharge | **49 refusés**, 1 joué |
| une seconde à 18 déclenchements par image | pas de dérive | pic **16** voix, 8 volées, 1072 refusées |
| décalage son / image sur un impact | moins de 30 ms, jamais en avance | **+6,7 ms** (une image = 16,7 ms) |
| coût de la diffusion, 200 ennemis / 400 balles / 12 zones | négligeable | **0,015 ms** par snapshot |
| mise à jour de 300 particules | négligeable | **0,001 ms** par image |
| bandeau effacé avant la résolution | toujours | **250 ms** de marge au pire (Exaflare, la plus courte annonce du jeu) |

Le décalage de +6,7 ms est la seule mesure qui comptait vraiment : il est
**positif**, donc le son arrive après l'image et jamais avant. C'est la
conséquence directe du choix d'horloge — les événements se déduisent de deux
snapshots consécutifs mais ne sont livrés qu'au moment où l'horloge de rendu
franchit le second. À la réception, le même son serait tombé **110 ms trop tôt**.

Les 34 voix volées sur 50 déclenchements ne sont pas une perte : quand cinquante
choses se produisent dans la même image, les seize premières disent déjà tout, et
les trente-quatre autres n'auraient produit qu'un mur de bruit saturé.

**Les images par seconde se mesurent au navigateur**, pas en simulation : le
coût du rendu est celui du canvas, qui n'existe pas dans Node. Ouvrir
`http://localhost:8080/?perf` affiche images par seconde, nombre de fragments,
nombre d'ennemis, **chemin de rendu et appels de dessin**, et voix actives dans
le coin bas gauche. Le budget est large : les deux parts mesurables du lot —
diffusion et particules — consomment ensemble **0,016 ms** sur les 16,7 ms d'une
image.

## Réglages

Tout est en haut de `shared/game_state.js`.

```js
ARENA_W / ARENA_H       // 1600 x 900
DASH_TIME / DASH_CD: 0.18 s / 3 s   // durée du bond, puis recharge
DASH_SPEED: 900         // 162 px parcourus
ELITE_MIN / MAX: 22-34  // secondes entre deux élites
ELITE_HP_MUL: 3         // et butin garanti
BOSS_BARS: 5            // barres de vie, une mécanique de plus par barre brisée
BOSS_HP_MUL: 2.6        // par rapport à l'ancien boss
BOSS_HP_BASE: 1200      // PV de référence, avant joueurs / puissance / difficulté
BOSS_GROWTH: 0.06       // croissance d'un boss au suivant
GRID_COLS / ROWS: 4 x 3 // découpe du damier
SWEEP_BLADES: 12        // pales du balayage
REVIVE_TIME: 1.0        // secondes, divisées par le nombre de sauveteurs
REVIVE_HP_RATIO: 0.45   // part des PV max rendus au relevé

WAVE_BUDGET_BASE: 14    // apparitions de la vague 1
WAVE_BUDGET_RAMP: 6     // apparitions ajoutées par vague
WAVE_CROWD_EXP: 0.75    // budget ET paliers de niveau × joueurs^0.75
WAVE_BREATHER: 4        // secondes de répit entre deux vagues
WAVE_HEAL: 18           // PV rendus à la fin d'une vague
WAVE_BOSS_EVERY: 5      // la vague 5, 10, 15... est un boss
WAVE_STRAGGLER_DELAY: 8 // secondes avant de marquer les retardataires
WAVE_STRAGGLER_SPEED: 1.6
WAVE_HP_POWER_K: 0.55   // part de la puissance d'équipe répercutée sur les PV
WAVE_RATE_POWER_K: 0.35 // ... et sur le débit d'apparition

LEVEL_KILLS_BASE: 15    // kills normalisés du premier palier
LEVEL_KILLS_GROWTH: 1.18 // coût de chaque palier suivant
WAVE_XP_BONUS: 12       // équivalent kills versé à la fin d'une vague
LEVEL_MAX: 30           // plafond — un niveau = une carte
POWERUP_MIN / MAX: 18-26 // secondes entre deux bonus au sol
POWERUP_MAX_GROUND: 2   // bonus présents au sol simultanément
MAX_ENEMIES_BASE: 220   // plafond de reference, solo, normal
MAX_ENEMIES_DIFF: [0.80, 1.00, 1.45]  // par mode
MAX_ENEMIES_HARD_CAP: 900             // limite du MOTEUR, reglee au profileur
ENEMY_HP_WAVE_RAMP: 9   // PV gagnés par les ennemis, par vague
SPAWN_WAVE_RAMP: 0.15   // apparitions par seconde gagnées par vague
TURRET_LIFE / RANGE: 20 s / 350 px
RICOCHET_RADIUS: 250    // portée d'un saut de chaîne
SHIELD_POOL: 80         // réserve du bouclier
SLOW_MUL: 0.45          // vitesse des ennemis pendant le ralentissement
NOVA_RADIUS: 430        // portée de l'onde de choc
FIRE_INTERVAL: 0.16     // intervalle de tir, fixe : il ne progresse plus seul
FIRE_INTERVAL_MIN: 0.05 // plancher, cartes et bonus cumulés
BOSS_FIRST: 180         // premier boss
BOSS_EVERY: 180         // puis tous les
BOSS_SUMMON_EVERY: 15   // intervalle des renforts pendant le combat
BOSS_ADD_CAP: 55        // plafond des renforts
BUFF_TIME: 14           // durée des bonus
```

Courbe de difficulté, dans `_spawner()` :

```js
const rate = (0.8 + this.time / 78) * Math.sqrt(crowd);  // ennemis par seconde
const hp = 16 + this.time * 0.16;                        // PV de base
```

Le nombre de joueurs entre en `sqrt` : à quatre, la pression monte sans devenir
quatre fois plus forte, sinon les grosses parties seraient plus faciles.

Les deux ont été détendus en même temps que la cadence est devenue fixe. Le
levier qui compte est **le débit d'apparition, pas les PV** : baisser
`ENEMY_HP_RAMP` seul ne rallongeait la survie que de quelques secondes, alors
que `SPAWN_RAMP` la déplaçait de trente. C'est la densité qui tue, pas la
résistance.

Les valeurs propres aux cartes vivent dans `CARD_CFG`, en haut de
`shared/cards.js`, celles des compétences dans `SKILL_CFG` (`shared/classes.js`),
celles des états dans `STATUS_CFG` (`shared/statuses.js`) et celles des boss dans
`BOSS_CFG` (`shared/bosses.js`) — pour que ces modules ne dépendent de rien :
`game_state.js` les importe, l'inverse créerait un cycle.

Les réglages des états, dans `STATUS_CFG` :

```js
VULN_PER_STACK: 0.25    // dégâts subis en plus, par cumul (3 au maximum)
BURN_DPS: 6             // dégâts par seconde
ROOT_SLOW: 0.40         // part de vitesse perdue
PURGE_HITS / WINDOW: 2 impacts en 3 s   // purge par insistance du faisceau
ELITE_STATUS_CD: 4      // secondes entre deux applications par la même élite
BOSS_MIASMA_EVERY: 25   // usure imposée par les boss qui l'utilisent (lot 4)
PURIFY_CHANCE: 0.06     // ... et 0,16 quand l'équipe n'a pas de soigneur
```

Les réglages des boss et de leurs mécaniques, dans `BOSS_CFG` — les valeurs qui
ont bougé à la mesure portent leur historique en commentaire dans le fichier :

```js
MECH_DAMAGE_RATIO: 0.90  // sanction d'un échec, en part des PV max de la cible
MECH_VULN: 1             // cumuls de Vulnérabilité posés par un échec
STACK_RADIUS: 135        // regroupement : rayon du cercle
SPREAD_MIN: 230          // dispersion : distance minimale entre joueurs
TOWER_RADIUS: 95         // tours : rayon d'une zone à occuper
LINK_BREAK: 300          // lien : distance qui le rompt
JAIL_HP: 240             // cage, avant indexation sur la puissance de l'équipe
GAZE_TIME: 2.0           // regard : durée de la fenêtre
FEED_HEAL: 0.005         // soin par seconde et par rejeton, en part des PV max
TWIN_HEAL: 0.008         // soin mutuel des Jumeaux, à moins de 400 px
ULT_FILL / ULT_DRAIN     // 1/42 par seconde, 1/9 tours tenues
SLIP_ACCEL: 3.4          // sol glissant : plus c'est bas, plus ça patine

PUDDLE_MAX: 25           // flaques simultanées — plafond STRICT, la plus ancienne cède
PUDDLE_LIFE / DOT: 15 s / 20  // durée d'une mare et dégâts par seconde
CONE_R / CONE_SPREAD     // 640 px, demi-angle 0,40 rad (~23°)
PACMAN_R / PACMAN_SAFE   // 700 px, secteur épargné de 0,58 rad (~33°)
CROSSD_LIFE / DOT: 8 s / 26   // croix durable des Jumeaux
SHRINK_STEP / MIN: 0.13 / 0.45 // constriction : palier, puis plancher de l'arène
SHRINK_WARN: 2.6         // annonce d'un palier
CROWN_DPS: 60            // dégâts par seconde aux ennemis restés dans la couronne
QUAD_TIME / QUAD_THICK   // verrouillage : 20 s, murs de 26 px (3 joueurs minimum)
```

Et les réglages génériques des zones, dans `CFG` :

```js
ZONE_TICK: 0.25          // paliers de dégâts d'une zone persistante
ZONE_FORGIVE: 0.9        // rayon de collision / rayon affiché — écart ASSUMÉ
HUNT_CHASE: 165          // vitesse de poursuite de la traque (joueur : 260)
```

Le roster lui-même — verbes, seuils d'effectif, multiplicateurs de PV et
répertoires par barre — vit dans `BOSS_ROSTER`, et les seuils par mécanique dans
`MECHS`, tous deux **tableaux ordonnés dont l'index circule sur le réseau**.

Composition des vagues, dans `ENEMY_TYPES` : `from` (moment d'apparition),
`weight` (poids du tirage) et `share` (quota, en part du plafond).

## Limites connues

- `ws_lite.js` couvre le nécessaire, pas plus : **pas de TLS**, qui est le
  travail du proxy inverse. Il fait en revanche la compression
  (`permessage-deflate`) depuis le lot infra.
- L'évitement entre ennemis passe par une grille spatiale depuis le lot A du plan
  d'équilibrage (`_grille()`). C'est ce qui a permis de relever le plafond de
  population de 200 à 176-900 selon mode et effectif.
- Pas de reprise de partie : une coupure en pleine manche fait perdre la place
  dans la salle en cours. La **session**, elle, se reprend toute seule
  (`loginToken`) — on ne retape pas son mot de passe.
- Pas de récupération de mot de passe autonome : sans email, seul l'opérateur
  peut réinitialiser (`adminPassReset`). Assumé, documenté dans
  `LISEZMOI-BDD.md`.
- Les collisions sont testées par distance, sans balayage continu **en vol** :
  une balle très rapide pourrait traverser un ennemi très fin. Aux vitesses
  actuelles le cas ne se produit pas. Seule l'**apparition** est balayée en
  continu, parce que là le cas se produisait vraiment — voir la séparation
  ennemi/joueur.
- L'évitement ennemi/joueur passe par la même grille, qu'il reconstruit lui-même
  — il est appelé depuis deux endroits (la boucle des ennemis et `_areaPull`), et
  une grille périmée séparerait mal. Deux passes en O(n) contre une passe en
  O(joueurs × ennemis) : le compte y est dès la centaine d'ennemis.
- Les fragments passent **sous** le boss et les barres de vie depuis la bascule
  WebGL, là où le chemin canvas 2D les mettait au-dessus de tout. Les remonter
  demanderait un second contexte WebGL par-dessus la couche 2D supérieure — un
  canvas de plus à composer à chaque image pour quatre cents millisecondes
  d'effet derrière un boss.
- La bascule WebGL s'est arrêtée aux capacités qui servaient déjà à quelque
  chose : teinte, éclair, additif, particules. Restent ouvertes, dans l'ordre du
  rapport effet/effort — la passe de post-traitement (vignettage, aberration
  chromatique à l'impact, étalonnage par difficulté, flou directionnel pendant
  l'esquive), la distorsion du souffle des explosions, et l'échange de palette
  par texture de correspondance pour des variantes d'ennemis sans une seule
  image d'atlas de plus. L'éclairage dynamique est possible mais c'est un
  chantier à part entière, à ne pas embarquer dans la même migration.
