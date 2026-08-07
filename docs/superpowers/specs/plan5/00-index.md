# Plan 5 — index

Refonte complète de la macro-boucle. Dix lots, lettres O à X (la série continue
`plan4`, qui s'arrête à N).

**Ce plan annule une décision de `plan4`** : *« le modèle de vague actuel (budget puis
nettoyage) est conservé »* (`plan4/00-index.md`). Les autres lots de `plan4` restent
valides et sont réutilisés ici — nouveaux ennemis (lot M) au lot S, vagues spéciales
(lot L) au lot U, boss final (lot N) au lot W.

---

## Le problème

Le jeu fonctionne par **vagues à nettoyer** : un budget d'apparitions, une phase de
nettoyage, un répit de 4 s, un boss toutes les 5 vagues. Le modèle a réussi ce qu'on lui
demandait — la raison est encore écrite dans `CFG` : *« le flux continu ne laissait jamais
respirer et rendait impossible de donner une carte ailleurs qu'à la mort d'un boss. La
plupart des parties ne voyaient qu'un seul choix de carte. »*

Et il a produit quatre défauts, **tous mesurés dans `LISEZMOI.md`**, pas supposés :

| défaut | mesure |
|---|---|
| toutes les parties se ressemblent | 15,8 à 18,0 vagues en 900 s, niveau 13,8 à 15,4 — quel que soit l'effectif |
| une bonne équipe ne progresse pas plus vite | les PV de boss suivaient la puissance en linéaire plein : **×1,00** de sensation de puissance pour un écart de build de **×4,54** |
| le rythme est haché | traquer les six derniers fuyards prenait **plus de 40 s sur une vague de 50 s** — d'où tout le système de retardataires, qui est un pansement |
| les difficultés ne sont que des chiffres | quatre multiplicateurs : `hp`, `spawn`, `dmg`, `boss` |

## La thèse

> **La pression est écrite, la progression est gagnée.**

La chronologie des monstres devient un script fixe, identique d'une partie à l'autre, qui
raconte une histoire de 30 minutes. L'expérience ne vient que des kills, donc une équipe
efficace monte réellement plus vite, construit sa build plus tôt et le ressent. **Rien
n'ajuste la difficulté derrière son dos.**

---

## Décisions verrouillées

Prises par le porteur du projet. Elles cadrent les dix lots et ne se rouvrent pas sans
raison.

| # | décision | conséquence | lot |
|---|---|---|---|
| **D1** | **Horloge de horde** : le boss est hors horloge | 1800 s de horde + 6 à 9 min de boss ≈ **37 min réelles**. Toutes les équipes voient la même quantité de horde, donc l'équilibrage reste comparable | P |
| **D2** | **Script strictement fixe, aucun scaling de puissance** | la durée d'un combat de boss devient inversement proportionnelle à la build : **29 s à 131 s** au lieu de 50-80 s. Deux garde-fous obligatoires | R |
| **D3** | **Tout s'indexe sur le niveau d'équipe** | `LEGENDARY_WAVES`, `CORE_WAVE`, le jalon « vague 8 », `ENEMY_TYPES.from` et les records changent d'unité | Q |
| **D4** | **Traits composables + quelques ennemis exclusifs** | un seul bestiaire, des modules de comportement attachés par profil de difficulté | S, T |

**Lecture explicite de D2** : « aucun scaling » porte sur la **puissance mesurée** de
l'équipe (`powerIndex`) et sur ses **performances** (DPS, morts, dégâts subis). Le
scaling par **effectif** reste — il est demandé et il est la seule raison pour laquelle
une partie à un et à quatre joueurs est aujourd'hui comparable.

Coût d'implémentation de D2 : **trois constantes**, pas une ligne de logique.
`WAVE_HP_POWER_K = 0`, `WAVE_RATE_POWER_K = 0`, et le terme `power` des PV de boss
remplacé par une référence fixe. Le genou (`BOSS_POWER_KNEE`, `BOSS_POWER_K`) reste dans
le code : c'est l'échappatoire déjà écrite si la mesure dit que le grand écart est
intenable.

---

## La boucle, en une page

```
manche = 6 SEGMENTS
segment = 300 s de horde  ->  crescendo  ->  balayage  ->  BOSS (hors horloge)  ->  cartes  ->  suivant
```

- 6 × 300 s = **1800 s de horde**, identiques pour tous.
- 5 boss intermédiaires (les cinq du roster, ordre tiré sans répétition) puis le **boss
  final** au segment 6.
- L'horloge de segment **s'arrête** pendant le boss et pendant l'écran de cartes.
- Cinq beats de 60 s par segment, dont des **silences** — débit très bas, population sous
  25, un bonus au sol forcé. Le silence est la pièce porteuse, pas un ornement (voir lot P).

| segment | intention | b1 | b2 | b3 | b4 | b5 crescendo | boss |
|---|---|---|---|---|---|---|---|
| 1 | installation | 0,6 | 0,9 | 1,2 | **0,5** silence | 1,8 | B1 |
| 2 | on domine | 1,4 | 1,7 | 2,0 | **0,7** silence | 2,6 | B2 |
| 3 | la crise | 2,0 | 2,4 | 2,2 | 2,8 | 3,2 | B3 |
| 4 | chaos maîtrisé | 2,2 | **0,8** silence | 2,9 | 3,3 | 3,8 | B4 |
| 5 | pression maximale | 3,0 | 3,4 | 3,2 | 3,9 | 4,4 | B5 |
| 6 | apothéose | 3,4 | **1,0** silence long | 4,0 | 4,6 | 5,0 | FINAL |

Le point bas de la partie est **volontairement au segment 3**, pas au 5 : une courbe qui
ne fait que monter n'a pas de sommet, et le creux du segment 4 est ce qui rend le
segment 5 spectaculaire.

---

## Ordre recommandé

| # | lot | fichier | dépend de | pourquoi cette place |
|---|---|---|---|---|
| **O** | Numéro de version | [01-version.md](01-version.md) | — | aucune dépendance, et neuf lots vont être déployés : savoir quelle version tourne est la première question à poser |
| **P** | Segments et horloge | [02-segments-horloge.md](02-segments-horloge.md) | — | le squelette ; tout le reste s'y accroche |
| **Q** | Expérience aux PV détruits | [03-experience-pv-detruits.md](03-experience-pv-detruits.md) | P | sans elle, la courbe de cartes du nouveau modèle est fausse |
| **R** | Script fixe (D2) | [04-script-fixe.md](04-script-fixe.md) | P, Q | la pression ne se règle qu'une fois la progression juste |
| **S** | Bestiaire et traits | [05-bestiaire-traits.md](05-bestiaire-traits.md) | P | indépendant de Q et R, peut avancer en parallèle |
| **T** | Profils de difficulté | [06-profils-difficulte.md](06-profils-difficulte.md) | S | les traits doivent exister avant qu'un profil les attache |
| **U** | Événements | [07-evenements.md](07-evenements.md) | P, S | reprend `plan4` lot L |
| **V** | Environnement et biomes | [08-environnement-biomes.md](08-environnement-biomes.md) | T | l'identité visuelle par difficulté vit dans le profil |
| **W** | Boss final | [09-boss-final.md](09-boss-final.md) | R, S, U | reprend `plan4` lot N ; à calibrer une fois le reste stable |
| **X** | Campagne de mesure et recalibrage | [10-campagne-mesure.md](10-campagne-mesure.md) | tous | le lot qui décide si l'ensemble tient |

**P → Q → R n'est pas négociable** : le script sans la nouvelle expérience produit une
courbe de cartes fausse, et l'inverse produit une pression fausse.

**X n'est pas une formalité.** Toutes les valeurs de ce plan sont des **points de départ
dérivés des mesures existantes**, pas des réglages validés.

---

## Le tableau des autorités

À relire quand un réglage ne produit pas l'effet attendu.

| grandeur | qui décide | indexé sur | lot |
|---|---|---|---|
| débit d'apparition | le script | temps de horde, effectif, difficulté | P |
| composition | le script, borné par `adaptType` | temps de horde **et** niveau | S |
| géométrie d'apparition | le script | temps, effectif | P |
| PV des ennemis | `CFG` | temps de horde **seul** (D2) | R |
| traits | le profil de difficulté | difficulté, type | T |
| PV du boss | `CFG` | effectif, segment, `BOSS_POWER_REF` fixe | R |
| répertoire du boss | `BOSS_ROSTER` | segment, barre brisée | R |
| expérience | `_killEnemy` | PV max de la cible | Q |
| coût d'un niveau | `CFG` | niveau (croissance 1,18) | Q |
| qualité de tirage | `CARD_CFG` | niveau | Q |
| dangers d'environnement | le biome | difficulté, segment | V |

**Rien n'est indexé sur les performances.** C'est D2, et c'est ce qui rend chaque ligne
de ce tableau mesurable en script jetable.

---

## Ce qui a été remis en question dans le brief initial

| demandé | retenu | pourquoi |
|---|---|---|
| « XP uniquement en éliminant des ennemis » | **le crédit vaut les PV max**, pas le `score` | avec un `score` fixe et des PV qui montent ×20 sur la manche, l'XP par minute s'effondre et la boucle demandée s'annule (lot Q) |
| « remplacer les vagues par un spawn continu » | **des silences scriptés obligatoires** | sans caméra, dans un écran fixe, le flux continu sature en permanence : la courbe émotionnelle disparaît. Le nettoyage de vague *était* la respiration (lot P) |
| « un système de scaling intelligent » lisant DPS, morts, dégâts subis | **refusé** (D2) ; la seule rétroaction restante est `adaptType` | un scaler dont l'entrée est sa propre sortie n'est pas mesurable, et ce dépôt ne se pilote que par la mesure |
| « chaque difficulté est une version différente du jeu » | **traits composables**, pas trois bestiaires | le dépôt a déjà refusé cette duplication : *« cinq variantes de cinq boss auraient dérivé au premier réglage »* (lots S, T) |
| des cartes riches en dangers | **plafond de 12 % de surface**, dangers statiques ou périodiques | le budget de lisibilité est déjà dépensé à 200 ennemis, et le canal du télégraphe instantané appartient au boss (lot V) |
| — | **plancher de barre de boss** et **enrage** | conséquences directes de D2 : sans eux, un bon build saute la moitié du contenu et un mauvais bloque l'horloge (lot R) |
| — | **compter les joueurs vivants** dans les termes de pression | sur trente minutes et six boss, une équipe à moitié morte affronte encore un boss calibré pour quatre (lot R) |
| — | **l'économie de récupération est un lot** | le dépôt a mesuré que ni plus de cartes ni moins de pression ne rallongent la survie ; seule une source de récupération l'a fait (lot X) |
| `plan4/N8` : classement au temps pour *atteindre* le boss final | **temps de mise à mort** du boss final + niveau | sous D1, le temps pour l'atteindre est constant : le record n'aurait aucun sens (lot W) |

---

## Le risque principal, chiffré

La survie mesurée aujourd'hui va de **162 s à 445 s** selon la composition. L'objectif est
**1800 s de horde plus six combats de boss**, soit un facteur **4 à 11**.

Le dépôt a déjà mesuré que les deux leviers évidents ne marchent pas :

- *« donner plus de cartes ne rallonge pas la survie — à 22 cartes par manche au lieu de
  4, la survie ne bouge pas. Les morts viennent des dégâts subis »* ;
- *« −55 % sur les PV, le débit et le budget ne change rien à la vague atteinte »*.

Ce qui a marché, une fois : **ajouter une source de récupération** (`WAVE_HEAL: 18`), avec
la conclusion écrite noir sur blanc — *« un répit qui ne rend rien n'est pas un répit,
c'est un compte à rebours »*. Or ce plan **supprime `WAVE_HEAL`** : il n'y a plus de fin
de vague. L'économie de récupération est donc traitée explicitement au lot X, et c'est là
que se cherche la correction si la survie médiane n'atteint pas le segment 4 — **pas dans
le débit**, la mesure dit que ce n'est pas le levier.

---

## Ce qui NE circule pas sur le réseau

Résultat notable de ce plan : **aucun champ nouveau sur le tuple d'ennemi**, alors qu'on
ajoute des traits, des dangers et des événements.

| information | pourquoi elle ne circule pas |
|---|---|
| traits d'un ennemi | déductibles de `(diffIndex, type)`, tous deux déjà connus du client |
| saturation de l'arène | `enemies.length` est déjà là |
| script, variante, biome | envoyés **une fois** dans le salon, comme la difficulté |
| catégorie de carte, son, glyphe, image de sprite | inchangé, déjà déduits |

Clés **nommées** ajoutées au snapshot (une clé inconnue est ignorée par un client plus
ancien) : `sg` segment et temps restant, `ev` événement actif, `hz` dangers actifs,
`wu` ennemis en anticipation.

---

## Invariants du dépôt

Inchangés, à relire avant chaque lot (`CLAUDE.md`) :

- `shared/game_state.js` ne référence jamais le DOM, le canvas, le clavier, le réseau ni
  le système de fichiers.
- Snapshots en append-only, lecture client avec repli.
- Tableaux exportés ordonnés, index circulant sur le réseau : **ajouter en fin, jamais au
  milieu**.
- Tout ce qui blesse passe par `_hurt()` / `_damage()` ; tout ce qui pose un état par
  `_applyStatus()`.
- Les systèmes lisent `p.mods`, jamais la liste de cartes.
- Le serveur valide tout choix client.
- Une seule source de vérité pour les couleurs : `shared/palette.js`.
- Commentaires et identifiants en français **sans accents** ; chaînes affichées au joueur
  **avec accents**.
- **Mesurer, ne pas extrapoler.**
- Toute mesure précise son profil de compte (neuf / maximal) — et désormais aussi sa
  **variante de script**, son **biome** et son **effectif**.
