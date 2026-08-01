# Lot 1 — Vagues et progression

## Objectif

Remplacer le flux continu par des vagues discrètes, rendre les cartes fréquentes
au lieu d'exceptionnelles, et indexer la difficulté sur la puissance réelle de
l'équipe plutôt que sur le temps écoulé.

## Le problème à corriger

Trois constats mesurés sur la base actuelle :

1. Les cartes n'arrivent qu'à la mort d'un boss, soit toutes les 180 s. Sur une
   survie moyenne de ~182 s, **la plupart des parties ne voient qu'un seul
   choix de carte**, parfois zéro. Toute la dérive de rareté par boss
   (`RARITY_DRIFT`) ne se déclenche jamais en pratique.
2. Il existe **deux progressions parallèles** : les niveaux donnent +30 % de
   dégâts chacun jusqu'au niveau 12 (soit ×4,3) automatiquement, et les cartes
   s'ajoutent par-dessus. Aucune des deux n'est lisible.
3. Les PV du boss sont indexés sur `_playerPower`, mais **pas la pression des
   vagues**, qui suit une rampe purement temporelle (`ENEMY_HP_RAMP`,
   `SPAWN_RAMP`). Avec quinze cartes au lieu de quatre, les vagues deviendront
   triviales pendant que le boss restera calibré.

## 1. Le système de vagues

### Modèle

Une vague est définie par un **budget d'apparitions**. Elle se termine quand le
budget est épuisé **et** que l'arène est vide.

```
CFG.WAVE_BUDGET_BASE: 14        // apparitions de la vague 1
CFG.WAVE_BUDGET_RAMP: 6         // apparitions ajoutees par vague
CFG.WAVE_CROWD_EXP: 0.75        // budget x joueurs^0.75
CFG.WAVE_BREATHER: 4            // secondes de repit entre deux vagues
CFG.WAVE_BOSS_EVERY: 5          // la vague 5, 10, 15... est un boss
CFG.WAVE_STRAGGLER_DELAY: 8     // secondes avant de traquer les retardataires
CFG.WAVE_STRAGGLER_SPEED: 1.6
```

`WAVE_CROWD_EXP` à 0,75 donne ×2,8 à quatre joueurs, contre ×2 pour le
`sqrt(joueurs)` actuel — la difficulté à effectif élevé était trop molle. La
constante est exposée précisément pour être balayée en mesure.

La proportion d'élites monte elle aussi avec l'effectif, pas seulement leur
nombre absolu : `ELITE_MIN`/`ELITE_MAX` divisés par `joueurs^0.4`.

### Les retardataires

Le point faible du modèle « nettoyage » : shooters et runners fuient, et
traquer les six derniers à travers 1600 × 900 est fastidieux.

Passé `WAVE_STRAGGLER_DELAY` secondes après l'épuisement du budget, les ennemis
restants reçoivent un halo visible, leur vitesse est multipliée par
`WAVE_STRAGGLER_SPEED` et les shooters perdent leur distance de sécurité
(`standoff = 0`) : ils viennent au contact. La vague se termine d'elle-même en
quelques secondes.

### Enchaînement

```
vague N -> budget epuise -> arene vide
        -> si niveaux en attente : PHASE_CARDS (autant de choix que de niveaux)
        -> repit WAVE_BREATHER
        -> vague N+1
```

Le boss occupe la vague entière : à l'entrée d'une vague de boss, on garde le
balayage d'arène existant, et le budget d'apparitions est nul — seuls les
renforts appelés par le boss sortent (`BOSS_SUMMON_*`, déjà en place).

### Ce qui disparaît

`BOSS_FIRST` et `BOSS_EVERY` sont remplacés par `WAVE_BOSS_EVERY`. Le champ
`bossCount` reste, il sert à la qualité de tirage et à la croissance des PV.

## 2. Expérience d'équipe

### Pourquoi commune

Les niveaux montent aux kills. Un soigneur en mode soin ne tue rien, un tank
tue moins qu'un DPS. Avec des niveaux individuels donnant des cartes, le DPS
accumule pendant que le soigneur décroche — et moins il a de cartes, moins il
tue. C'est une spirale, et elle rend les rôles de soutien injouables.

Une jauge commune supprime le problème entièrement et donne une barre de
progression partagée, visible de tous.

### Modèle

```
CFG.LEVEL_KILLS_BASE: 40        // releve : la jauge est desormais commune
CFG.LEVEL_KILLS_GROWTH: 1.35
CFG.WAVE_XP_BONUS: 12           // en equivalent kills, verse a la fin d'une vague
CFG.LEVEL_MAX: 30               // plafond haut : un niveau = une carte
```

`state.xp`, `state.level`, `state.levelAt` remplacent les champs par joueur.
Chaque kill incrémente `state.xp` quel qu'en soit l'auteur ; la fin de vague
verse `WAVE_XP_BONUS`.

**Les montées de niveau se mettent en file** (`state.pendingLevels`) et se
consomment à la fin de la vague, jamais en plein combat. Deux niveaux gagnés
pendant la vague = deux choix de carte d'affilée pendant la pause.

### Suppression des gains automatiques

`LEVEL_DAMAGE_STEP`, `LEVEL_HP_STEP` et `LEVEL_HEAL` disparaissent. Un niveau
ne donne plus que le droit de choisir une carte.

**C'est une perte de puissance considérable** — ×4,3 de dégâts en fin de manche
qui s'évaporent. Les cartes doivent la reprendre à leur compte, et c'est
précisément ce que la mesure de fin de lot doit vérifier. Si la survie s'effondre,
le levier est `LEVEL_KILLS_BASE` (plus de cartes, plus vite), pas la
réintroduction d'un gain passif.

## 3. Qualité de tirage par contexte

`drawCards(cards, bossCount, forceRare)` devient
`drawCards(cards, quality, forceRare)` où `quality` est un entier croissant.

```
quality = niveau d'equipe / 4                       // fin de vague normale
quality = niveau d'equipe / 4 + CARD_CFG.BOSS_QUALITY   // vague de boss
CARD_CFG.BOSS_QUALITY: 4
```

La dérive `RARITY_DRIFT` s'applique `quality` fois au lieu de `bossCount` fois.
Et sur une vague de boss, **au moins une rare est garantie** dans les trois
offertes — c'est ce qui fait du boss un événement de progression et pas
seulement un mur de PV.

### Épuisement du pool

Avec 15 à 20 tirages au lieu de 4, les raretés basses se vident. Trois mesures :

- Relever les plafonds des communes de cumul (`max`) à 6 ou 8.
- Ajouter les douze cartes de la section 5.
- Prévoir un **repli** : si `drawCards` ne peut pas fournir trois cartes
  distinctes, compléter avec une carte de secours « Ravitaillement » (soin
  complet + 200 points), toujours disponible et sans plafond.

## 4. Difficulté indexée sur la puissance

### Le piège à éviter

La tentation est d'ajuster la difficulté selon la composition — plus de PV aux
monstres s'il y a un soigneur. **Ne pas le faire.** Cela revient à facturer le
soigneur à l'équipe : celui qui le choisit rend la partie plus dure pour tout
le monde, et plus personne ne le choisit. C'est le mécanisme qui a tué les
rôles de soutien dans beaucoup de jeux coopératifs.

### L'approche retenue

Étendre `_playerPower` (déjà utilisé pour les PV du boss) en `_teamPower()`, et
l'appliquer **aussi** à la pression des vagues :

```
CFG.WAVE_HP_POWER_K: 0.55       // part de la puissance repercutee sur les PV
CFG.WAVE_RATE_POWER_K: 0.35     // ... et sur le debit d'apparition

hp    = ENEMY_HP_BASE * (1 + WAVE_HP_POWER_K   * (power - 1)) * rampe de vague
debit = SPAWN_BASE    * (1 + WAVE_RATE_POWER_K * (power - 1)) * rampe de vague
```

Une équipe avec soigneur a mécaniquement moins de dégâts bruts, donc une
puissance mesurée plus faible, donc des vagues un peu plus tendres.
L'ajustement se fait tout seul, sans que personne ne se sente taxé.

Réserve connue : la puissance capture les dégâts, pas la survie. Un soigneur
augmente surtout la durée de vie. Si la mesure montre un écart, **corriger le
débit et non les PV** — c'est la densité qui tue, pas la résistance (constat
déjà établi dans `LISEZMOI.md`).

## 5. Douze cartes supplémentaires

Objectif : nourrir un pool sollicité quatre fois plus, et introduire des cartes
**conditionnelles**, qui ne valent que combinées à autre chose. C'est ce qui
transforme un tirage en décision, alors que les cartes purement additives ne se
combinent pas, elles s'additionnent.

### Communes

| id | nom | effet | max |
|---|---|---|---|
| `culasse` | Culasse allégée | −7 % d'intervalle de tir | 6 |
| `plaquage` | Plaquage | +18 PV max | 6 |
| `affutage` | Affûtage | +12 % de dégâts | 6 |
| `foulee` | Foulée | +7 % de vitesse | 5 |

### Rares — conditionnelles

| id | nom | effet | max |
|---|---|---|---|
| `symbiose` | Symbiose | +5 % de dégâts par carte défensive possédée | 2 |
| `austerite` | Austérité | +30 % de dégâts si aucune carte épique ou légendaire | 1 |
| `surcharge_orbitale` | Surcharge orbitale | +60 % aux dégâts des lames orbitales | 2 |
| `munition_dense` | Munition dense | +40 % de dégâts, −25 % de vitesse des balles | 2 |

### Épiques — règles réécrites

| id | nom | effet | max |
|---|---|---|---|
| `rebond` | Balles rebondissantes | les balles rebondissent sur les bords de l'arène, −25 % de dégâts après rebond | 1 |
| `inertie` | Inertie | les balles ne disparaissent plus à l'impact, elles perdent 35 % de dégâts par ennemi traversé | 1 |
| `resonance` | Résonance | chaque carte de cadence donne aussi +4 % de dégâts | 2 |
| `dette` | Dette | +50 % de dégâts, mais chaque montée de niveau coûte 20 % de kills en plus | 1 |

`inertie` mérite un mot : elle réécrit le fonctionnement du tir et rend
soudain intéressantes toutes les cartes de portée et de vitesse de balle, qui
sont aujourd'hui les plus faibles du pool. C'est le genre de carte qui crée une
build à elle seule.

## 6. Modifications par fichier

### `shared/game_state.js`

- `CFG` : ajouter les constantes des sections 1, 2, 4 ; retirer `BOSS_FIRST`,
  `BOSS_EVERY`, `LEVEL_DAMAGE_STEP`, `LEVEL_HP_STEP`, `LEVEL_HEAL`.
- État : `wave`, `waveBudget`, `waveSpawned`, `wavePhase` (0 apparition,
  1 nettoyage, 2 répit), `xp`, `level`, `levelAt`, `pendingLevels`.
- `_spawner()` : consommer un budget au lieu d'un débit infini ; ne rien faire
  pendant le nettoyage et le répit.
- Nouveau `_wave(dt)` : gère les transitions, le marquage des retardataires, le
  versement d'expérience.
- `_teamPower()` : extraire de `_boss`, y intégrer les mods de cartes, l'utiliser
  dans `_spawner` et `_spawnEnemy`.
- `_killEnemy()` : alimenter `state.xp` au lieu du compteur par joueur.
- `offerCards()` : signature à `quality`.
- Retirer la montée de niveau par joueur, ajouter la file commune.

### `shared/cards.js`

- Douze cartes de la section 5, plus `ravitaillement` en secours.
- `drawCards(cards, quality, forceRare)` : dérive sur `quality`, garantie de
  rare, repli quand le pool est vide.
- `computeMods` : clés `symbiose`, `austerite`, `resonance`, `dette`, `rebond`,
  `inertie` (les trois dernières sont des drapeaux, pas des multiplicateurs).

### `server.js`

- Le déclenchement de `PHASE_CARDS` passe de « boss mort » à « fin de vague avec
  niveaux en attente », et gère **plusieurs choix d'affilée**.
- Diffuser le numéro de vague, l'avancement du budget et la jauge d'expérience.

### `public/client.js` + `index.html`

- Bandeau de vague : « Vague 7 » et une barre d'avancement.
- Jauge d'expérience commune, en bas de l'écran.
- Halo sur les retardataires.
- L'écran de cartes doit enchaîner plusieurs choix sans revenir au salon.

## 7. Mesures à relever

Bots immobiles visant l'ennemi le plus proche, cinq essais par configuration :

| mesure | attendu |
|---|---|
| vague atteinte à 1, 2, 3, 4 joueurs | croissance douce, pas de plateau |
| cartes obtenues sur une partie complète | 12 à 20 |
| répartition des raretés obtenues | légendaire ≈ 1 partie sur 3 |
| durée moyenne d'une vague normale | 45 à 70 s |
| durée d'un combat de boss | comparable à l'actuel (54 à 68 s) |
| pire cas de bande passante | ne doit pas dépasser 160 Ko/s par joueur |
| temps CPU pour 600 s simulées | rester sous 3 s |

Reporter les chiffres dans `LISEZMOI.md`, section « Mesures relevées ».

## 8. Critères d'acceptation

- Une partie complète enchaîne au moins dix vagues sans blocage ni vague qui ne
  se termine jamais.
- Un joueur qui se déconnecte en pleine vague ne bloque pas la fin de vague.
- Les choix de cartes s'enchaînent correctement quand deux niveaux tombent
  ensemble.
- Le délai de choix d'office (`CARD_CFG.PICK_TIME`) fonctionne toujours.
- Aucune régression sur les onze cas de flux de partie existants (salon, hôte,
  spectateur, interruption de manche).
