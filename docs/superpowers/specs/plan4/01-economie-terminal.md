# Lot H — Économie du Terminal

**Validé en équipe** : réduire la courbe de progression pour que la monnaie
gagnée soit plus étalée dans le temps et nécessite davantage de parties avant
de compléter un arbre. Ce lot reprend et affine la spécification déjà rédigée.

Deux sujets liés : les noyaux arrivent beaucoup trop vite, et l'arbre est
coincé dans un salon déjà surchargé.

---

## F1. Le diagnostic, chiffres réels à l'appui

### La formule est quadratique

```js
// shared/progression.js
const base = PROG_CFG.CORE_WAVE * wave * (wave + 1) / 2
  + PROG_CFG.CORE_BOSS * bossKills;
```

`wave × (wave + 1) / 2` est la somme de toutes les vagues traversées. Le revenu
croît donc **au carré** du nombre de vagues, alors que les coûts
(`TIER_COSTS: [150, 260, 420, 650, 1000]`) croissent linéairement. Plus on
progresse, plus on distance les prix.

**C'est une erreur de la spécification d'origine**, implémentée fidèlement. Le
même document annonçait « 250 à 500 noyaux par partie » et « 35 à 45 parties
pour un arbre complet » — deux cibles que la formule contredit.

### Ce que montre `data/progress.json` (relevé historique, avant la bascule Supabase)

```json
"runs": 1, "best": { "wave": 15 },
"classes": { "dps": { "tiers": { "calibre": 5, "precision": 1 } } },
"cores": 171
```

**Une seule partie.** Le joueur a déjà porté une ligne entière au palier
maximal (2 480 noyaux), acheté un palier d'une seconde ligne (150), et il lui
reste 171 noyaux. Soit environ **2 800 noyaux en une partie**.

Décomposition :

| source | montant |
|---|---|
| vagues (4 × 15 × 16 / 2) | 480 |
| 3 boss | 360 |
| sous-total ×1,35 | 1 134 |
| primes vagues 5, 10, 15 | 1 400 |
| primes 2 premiers boss | 600 |
| **total** | **≈ 3 100** |

**Les primes de première fois représentent les deux tiers du total**, et elles
tombent toutes dans la même partie. C'est le principal coupable, avant même la
formule quadratique.

---

## F2. Les corrections

### a. Le revenu devient linéaire

On paie **la vague atteinte**, pas la somme des vagues traversées.

```js
CORE_WAVE: 10,             // x vague atteinte, sans cumul
CORE_BOSS: 40,
CORE_RUN_CAP: 600,         // plafond par partie
DIFF_MUL: [1, 1.4, 2],     // la difficulte pese plus
```

```js
export function coresForRun(wave, bossKills, diffIndex) {
  const base = PROG_CFG.CORE_WAVE * wave + PROG_CFG.CORE_BOSS * bossKills;
  return Math.min(PROG_CFG.CORE_RUN_CAP,
                  Math.round(base * PROG_CFG.DIFF_MUL[diffIndex]));
}
```

Vague 15 avec 3 boss en normal : 150 + 120 = 270, ×1,4 = **378 noyaux**.
Contre 3 100 aujourd'hui.

Le plafond par partie n'est pas cosmétique : sans lui, une soirée où vous allez
très loin efface un mois de progression.

### b. Les primes de première fois ne donnent plus de monnaie

C'est le changement structurel. **Les jalons donnent des emplacements et des
cartes, jamais des noyaux.**

```js
CORE_FIRST_WAVES: {},      // supprime
CORE_FIRST_BOSS: 0,        // supprime
```

Séparation nette : la **monnaie** vient du jeu répété, la **capacité** vient des
jalons. Ça supprime l'aubaine de la première partie, et ça récompense un joueur
qui joue souvent même s'il meurt tôt — ce que la version actuelle ne fait pas.

### c. Les emplacements se gagnent aux jalons, plus aux achats

```js
SLOTS_STEP: 12,   // a supprimer
```

Avec des coûts géométriques, « +1 emplacement tous les 12 paliers » devient
inatteignable. Et surtout, lier la capacité à la dépense fait que celui qui a le
plus de noyaux a aussi le plus d'emplacements : les deux avantages se cumulent.

À la place :

| jalon | gain |
|---|---|
| départ | 3 emplacements |
| vague 10 atteinte | +1 |
| trois boss différents vaincus | +1 |
| 25 parties jouées | +1 |

Maximum 6, comme aujourd'hui.

### d. Les coûts deviennent géométriques

```js
TIER_COSTS: [200, 420, 880, 1800, 3600],   // 6 900 la ligne complete
```

Avec 378 noyaux par partie :

- premier palier d'une ligne : **partie 1**
- trois premiers paliers : **partie 4**
- une ligne au maximum : **partie 18**
- trois lignes au maximum : **environ 55 parties**

Un arbre complet (six lignes, 41 400 noyaux) demande une centaine de parties —
mais **on n'est pas censé tout acheter** : avec six emplacements maximum pour
six lignes, l'optimum est d'en spécialiser trois ou quatre. Le reste est de
l'optionnalité.

### e. Le tronc de confort reste, avec des coûts revus

```js
CONFORT_COSTS: { relance: 1200, quatrieme: 2500, ravitaillement: 900 },
```

Ces trois-là sont les achats les plus puissants du système — la quatrième carte
proposée améliore toutes les parties futures. Ils doivent rester des objectifs
de moyen terme, pas des achats de la troisième partie.

---

## F3. La migration des sauvegardes

**Point à ne pas rater.** Changer les coûts invalide les comptes existants : le
joueur du compte relevé en F1 a payé 2 630 noyaux pour six paliers qui en
coûteront désormais 1 500.

La persistance n'est plus `data/progress.json` mais **Supabase, une ligne par
compte** (`LISEZMOI-BDD.md`). La migration se fait donc **par ligne**, en
version 2 du schéma de profil, exécutée une fois au chargement de chaque
compte (au boot pour les lignes déjà en mémoire, à la première connexion pour
les autres) :

1. Pour chaque compte en version 1, **rembourser intégralement** les noyaux
   dépensés selon l'ancienne grille (`TIER_COSTS` v1 et `CONFORT_COSTS` v1).
2. **Remettre à zéro** `tiers`, `equipped` et `confort`.
3. **Conserver** `cores`, `runs`, `best`, `milestones`, `unlockedCards`, `kills`.
4. **Recalculer les emplacements** selon les nouveaux jalons.
5. Écrire `version: 2` dans le profil de la ligne.

Le remboursement plutôt que l'effacement : personne ne perd de progression, et
tout le monde repart avec un choix libre sur la nouvelle grille. Journaliser
chaque migration, et **prendre un instantané de la table avant la première
écriture migrée** (export ou table `comptes_v1` copiée côté Supabase) — une
migration ratée sans copie, c'est la progression du groupe perdue. La
migration est **idempotente** : une ligne déjà en version 2 ne se migre
jamais deux fois, même si le serveur redémarre au milieu du lot.

---

## F4. Le Terminal

### Le problème

Le panneau `#meta` est aujourd'hui **dans le salon**, entre le choix de classe
et le vote de difficulté :

```html
<div id="lobby">
  ... tableau des scores ...
  <div id="classRow">...</div>
  <div id="meta" hidden> ... arbre, confort, jalons ... </div>
  <div id="vote">...</div>
  <button id="start">
```

Six lignes d'arbre, trois achats de confort et la liste des jalons empilés
au-dessus du bouton de lancement : l'écran le plus important du jeu — celui où
l'on décide de lancer — est noyé.

### L'écran

Un plein écran appelé depuis le salon par un bouton **Terminal**, cohérent avec
la direction « l'arène est une machine ».

```
┌── TERMINAL ──────────────────────────────── 1 240 noyaux ──┐
│                                                             │
│  [ REMPART ]  [ SOIGNEUR ]  [ TIREUR ]   Emplacements 4 / 6 │
│                                                             │
│  CALIBRE        ●●●●●   +20 % dégâts              max       │
│  PRÉCISION      ●○○○○   +2 % critique             420  ▸    │
│  LÉTALITÉ       ○○○○○   —                         200  ▸    │
│  MUNITIONS      ●●○○○   +12 % vitesse balles      880  ▸    │
│  CHARGE         ○○○○○   —                         200  ▸    │
│  SURCHAUFFE     ○○○○○   —                         200  ▸    │
│                                                             │
│  ÉQUIPÉ   ▸ Calibre  ▸ Munitions  ▸ [ vide ]  ▸ [ vide ]    │
│                                             [ Réattribuer ] │
│                                                             │
│  [ Confort ]  [ Jalons ]                        [ Fermer ]  │
└─────────────────────────────────────────────────────────────┘
```

Cinq exigences :

**Les emplacements sont visibles en permanence, en haut.** C'est la contrainte
qui structure toutes les décisions ; elle ne doit jamais demander un clic.

**Trois états visuellement distincts** : acheté et équipé, acheté non équipé,
non acheté. Trois traitements nets, pas trois gris.

**Afficher le cumulé, pas l'incrément.** « +20 % de dégâts », jamais « +4 % par
palier ». Le joueur veut savoir où il en est.

**La réattribution est gratuite et instantanée.** Si elle coûte, personne
n'expérimente et le système devient un compteur.

**Confort et jalons passent en onglets**, pas en empilement. L'onglet Jalons
affiche les conditions restantes — c'est ce qui donne des objectifs entre deux
parties.

### Ce qui reste au salon

Uniquement : le tableau des scores, le choix de classe, le vote de difficulté,
le bouton Terminal, le bouton de lancement. Rien d'autre.

Le bouton Terminal affiche une pastille quand des noyaux sont dépensables —
sinon personne ne pensera à l'ouvrir.

---

## F5. Mesures

| mesure | attendu |
|---|---|
| noyaux d'une partie vague 12, normal | 250 à 350 |
| noyaux d'une partie vague 20, cauchemar | plafonné à 600 |
| parties pour un premier palier | 1 |
| parties pour une ligne complète | 16 à 20 |
| parties pour trois lignes complètes | 50 à 60 |
| écart de vague atteinte, compte neuf / compte maximal | inférieur à 1,5 vague |

Cette dernière ligne reste la métrique décisive. Si l'écart dépasse 1,5 vague,
réduire le **nombre d'emplacements**, jamais les valeurs individuelles : c'est
le seul levier qui préserve l'équilibre relatif des lignes entre elles.

## F6. Critères d'acceptation

- Une première partie ne permet plus de porter une ligne au maximum.
- Les jalons ne créditent aucun noyau.
- La migration v1 → v2 rembourse intégralement, est idempotente par ligne, et
  un instantané de la table existe avant la première écriture migrée.
- Le salon ne contient plus l'arbre de progression.
- Le bouton Terminal signale la présence de noyaux dépensables.
- La réattribution d'emplacements est gratuite et n'est possible qu'au salon.
