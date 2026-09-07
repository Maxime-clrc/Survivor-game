# 01 · La courbe de niveau monte trop vite

## Le constat

`verifierProgression()` — cibles niveau **10 / 20 / 27**, tolérance ±1 :

| | min 8 | min 20 | min 32 |
|---|---:|---:|---:|
| solo | ok | **25** | **30** |
| ×4 | **11,5** | **26,5** | **30** |

Plus l'écart-type de cartes à quatre : **3,7** pour un plafond de 3.

## Trois causes, mesurées

### 1. Une marque impossible

La horde dure **exactement 30 minutes** (`TL_CFG.SEGMENTS × SEGMENT_TIME`, six
fois 300 s). La marque `[32, 27]` ne se mesurait donc jamais :
`mesureProgression` rendait la dernière valeur connue, et le vérificateur lisait
le **plafond de niveau** (`LEVEL_MAX: 30`) comme un dépassement.

→ `LEVEL_MARKS` corrigé en `[[8, 10], [20, 20], [30, 27]]`.

### 2. Un budget de pression et un partage de récompense sous une seule constante

`WAVE_CROWD_EXP` gouverne **six** grandeurs :

| lecteur | rôle |
|---|---|
| `enemyCap` | plafond de population par effectif |
| taux d'apparition | pression de horde |
| part d'élites | composition |
| `_bossAddCap` / renforts | ajouts du boss |
| **`_addXp`** | **partage d'XP par effectif** |

Les cinq premiers sont un **budget de pression**, le sixième un **partage de
récompense**. Régler l'un cassait l'autre, donc aucun n'était réglable — et
quand le lot 5 du plan 29 a densifié la mi-manche de 17 %, l'XP a suivi la
densité sans que le partage puisse s'ajuster. C'est **la** raison pour laquelle
la courbe diverge *selon l'effectif*.

→ `XP_CROWD_EXP` séparée, initialisée à la même valeur (0,75) : aucun
changement de comportement, et le levier devient réglable.

### 3. Le coût par niveau

`LEVEL_XP_GROWTH` reste à calibrer une fois le partage corrigé.

## Piège de méthode, déjà payé

**À 3 manches, la mesure n'est pas monotone** : `1.12` rend un niveau *plus
haut* que `1.10` à quatre joueurs, et l'écart-type atteint 4,2 cartes. Le
système a une rétroaction (niveaux → cartes → kills → XP) et la variance du
script domine.

La sortie n'est pas « plus de manches » mais **le découplage** : on mesure l'XP
**brute** cumulée par minute de horde (une campagne par effectif), puis on
résout la courbe analytiquement. Le revenu ne dépend pas du coût des niveaux,
donc une seule campagne teste tous les couples — et le résultat redevient
monotone.

Valide en milieu et fin de manche, là où les écarts sont : à saturation, le
revenu est piloté par le **spawn** et non par le DPS (mesure M2 du plan 29,
« part de horde retirée par les armes : 0 % »).

## Critère de sortie

`verifierProgression()` vert aux deux effectifs, et `npm run verif` toujours
vert sur les 22 autres.
