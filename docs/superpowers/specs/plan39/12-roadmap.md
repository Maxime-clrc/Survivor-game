# L — ASSETS À PRODUIRE · M — ROADMAP

---

## L.1 — Le principe de priorité

```
P0  sans lui, rien de ce dossier ne se voit
P1  tres important : porte un thème entier ou une mecanique reutilisee
P2  amelioration : ajoute un biome ou une variete reelle
P3  polish : la derniere couche, celle qui ne se voit qu en s arretant
```

**Un asset P0 sert au moins trois thèmes.** C'est le critère, pas le goût.

---

## L.2 — LES ASSETS, PAR PRIORITÉ

### P0 — 14 assets, sans lesquels le dossier ne produit rien

| # | asset | type | thèmes | pourquoi P0 |
|---|---|---|---|---|
| 1 | **`floorPattern(+loi)`** | plomberie | 5 | la plus grande surface de l'écran devient régionale. **Un argument.** |
| 2 | **les 12 traitements de sol** | matière | 5 | ce que l'argument ci-dessus permet de dire |
| 3 | **`poserTrame()` + les 6 primitives** | génération | 5 | la couche architecture, absente du dépôt |
| 4 | **`verifierTrame()`** | vérificateur | 5 | connexité, brèches, culs-de-sac, apparition |
| 5 | **`verifierSignature()`** | vérificateur | 5 | le seul contrôle qui compare deux biomes |
| 6 | silhouette `peigne` | dessin | 5 | la structure de rangement — 8 biomes la tirent |
| 7 | silhouette `cadre` | dessin | 5 | transparent-bloquant — 11 biomes la tirent |
| 8 | silhouette `nappe` (FAILLE) | dessin | 5 | le trou — 8 biomes, et cinq noms du dépôt le promettaient déjà |
| 9 | silhouette `pile` | dessin | 3 | l'empilement |
| 10 | silhouette `treillis` | dessin | 3 | la structure triangulée |
| 11 | macro `oblique` | génération | 3 | 3 à 5 AABB en escalier, zéro impact collision |
| 12 | habillage `beton_brut` | matière | 2 | le liant des sols et masses non finies |
| 13 | habillage `claire_voie` | matière | 5 | voir sans passer — la mécanique la plus lisible du dossier |
| 14 | habillage `composite_blanc` | matière | 1 | porte à lui seul les 5 biomes pressurisés de la Nébuleuse |

### P1 — 16 assets

| asset | type | thèmes |
|---|---|---|
| silhouette `masse_molle` (bord irrégulier) | dessin | 2 |
| silhouette `arc` (anneau, couronne) | dessin | 3 |
| silhouette `gradin` | dessin | 1 |
| habillage `tole_peinte` (neuf, propre) | matière | 2 |
| habillage `tole_rouillee` | matière | 2 |
| habillage `verre_enseigne` | matière | 1 |
| habillage `granulat` | matière | 2 |
| habillage `eau` (nappe + reflets) | matière | 3 |
| habillage `vegetal` | matière | 2 |
| **`AMER[biome]`, un par quartier** | dessin | 5 |
| **`sonder()` rend la position** | plomberie | 5 |
| les 11 primitives de trace nouvelles | dessin | 5 |
| `ZONES[theme][biome]` | table | 5 |
| `BAIE_TAUX` par biome | plomberie | 2 |
| l'ombre portée large (dalle, conduite, panneau) | dessin | 3 |
| `champ()` paramétré (vapeur, papiers, ascendant) | dessin | 4 |

### P2 — 14 assets

| asset | type | thèmes |
|---|---|---|
| habillage `maconnerie` | matière | 2 |
| habillage `bache` | matière | 2 |
| habillage `refractaire` | matière | 1 |
| habillage `pierre_polie` | matière | 1 |
| habillage `bitume` (extension) | matière | 2 |
| habillage `givre` (extension) | matière | 1 |
| les 11 familles de props paramétriques | dessin | 5 |
| lumière : gerbes d'étincelles périodiques | effet | 2 |
| lumière : sources vacillantes (foyer, brasero) | effet | 2 |
| lumière : bandes courantes (laminoir, chenille) | effet | 2 |
| lumière tachetée (canopée) | effet | 1 |
| gradient de matière (givre, humidité, roussi) | matière | 3 |
| reflets anisotropes (tôle larmée) | matière | 1 |
| baie à contour libre | dessin | 1 |

### P3 — 9 assets

| asset | type |
|---|---|
| habillage `ecran` (surface animée) | matière |
| habillage `effluent` (nappe émissive) | matière |
| habillage `cristal` (émissif, veines) | matière |
| sol émissif (N12) | matière |
| ombre mobile (panneaux solaires) | effet |
| empreintes de pas (F05, R12) | trace |
| inscriptions manuscrites (R12) | trace |
| silhouettes fugitives (mouettes, rats) | effet |
| reflets animés au sol (S04) | effet |

**Total : 53 assets.** 14 P0, 16 P1, 14 P2, 9 P3. Le couple 1:1 en aurait
demandé plus de 190.

---

## L.3 — TOP 10 BIOMES, par ratio impact / différenciation / réemploi / coût

| rang | biome | impact visuel | diff. | réemploi | coût | pourquoi |
|---|---|---|---|---|---|---|
| 1 | **U02 magasin** | 5 | 5 | `peigne` × 8 biomes | faible | paie la silhouette la plus réutilisée du dossier, et se voit immédiatement |
| 2 | **N01 dérive** | 4 | 4 | `BAIE_TAUX` × 12 | **nul** | **zéro asset neuf** : un paramètre existant monté à 65 % |
| 3 | **S02 ruelle** | 5 | 5 | `mur_aveugle`, escalier | faible | contraste maximal avec S01 pour deux dessins |
| 4 | **R09 dépôt éventré** | 4 | 4 | tout U02, retourné | **très faible** | un habillage suffit ; et c'est la meilleure narration inter-thèmes |
| 5 | **F03 refroidissement** | 5 | 5 | `nappe`, `eau` × 4 biomes | moyen | paie la FAILLE **et** corrige le mensonge le plus visible du dépôt |
| 6 | **U03 expédition** | 5 | 5 | `chassis` × 3 thèmes, baie | moyen | le premier biome à faire voir dehors dans un intérieur |
| 7 | **R03 chantier** | 5 | 5 | `treillis`, `beton_brut` | faible | le plus clair du thème le plus sombre : la rupture se voit de loin |
| 8 | **F02 fusion** | 5 | 5 | l'octogone existe | faible | la seule masse de deux vues : elle prouve la trame à elle seule |
| 9 | **S03 parvis** | 5 | 5 | `pierre_polie`, monolithe | faible | la propreté dans un thème sale, pour deux dessins |
| 10 | **U06 traitement** | 5 | 5 | FAILLE × 8 biomes | **fort** | cher, mais il paie la primitive pour tout le dossier |

**Les quatre premiers coûtent presque rien** et couvrent quatre thèmes sur cinq.
C'est par eux qu'on commence.

---

## M — LA ROADMAP

**Convention du dépôt** : `minor` = le plan, `patch` = le rang du lot. Un lot
livré = un commit = un bump + son vérificateur (`rituel de lot`).

### Phase 1 — LES DEUX LEVIERS (lots 01 à 04)

> À la fin de cette phase, **les vingt régions actuelles sont déjà
> reconnaissables**, sans qu'un seul biome nouveau ait été écrit. C'est la
> preuve que le diagnostic est le bon, et elle arrive vite.

| lot | contenu | vérificateur | risque |
|---|---|---|---|
| **01** | **le sol par région** : `floorPattern(+loi)`, `CACHE_MAX = 8`, les 12 traitements, un traitement affecté à chacune des 20 régions actuelles | `verifierMatiere` étendu (un biome sans traitement, un traitement orphelin) + mesure de cuisson au franchissement de frontière | **faible** — un argument et une table |
| **02** | **la TRAME** : `TRAME[]`, `poserTrame()`, budget scindé `0.045 / 0.055`, une trame affectée à chacune des 20 régions actuelles | **`verifierTrame()`** : connexité pleine arène (40 graines × 5 × 3), brèches ≥ 240 px, culs-de-sac ≤ 400 px, apparition ≥ ¼ du périmètre | **moyen** — c'est le lot qui touche le jeu |
| **03** | **silhouette × habillage** : `BLOC` scindé en deux tables, **zéro pixel changé**. Lot de plomberie, comme le 0.42.0 | `verifierBlocs` étendu (silhouette/habillage orphelin, règle `cadre ⇒ habillage peint`) | **faible** |
| **04** | **les garde-fous avant le contenu** : `verifierSignature()`, `verifierVue()`, clefs i18n **nommées** au lieu d'indexées, plafond de `signatureVariante` par enveloppe de thème | eux-mêmes | **faible**, mais **obligatoire avant le lot 05** |

### Phase 2 — LES P0 (lots 05 à 09, un thème par lot)

Quatre biomes P0 par thème, soit **20 biomes**. À la fin, chaque thème a de quoi
remplir une carte de 3 à 6 quartiers **sans jamais répéter une loi**, et la borne
de `verifierRegions` tombe à zéro.

| lot | thème | biomes | assets payés |
|---|---|---|---|
| **05** | USINE | U01 ligne · U02 magasin · U03 expédition · U04 maintenance | `peigne`, `pile`, `chassis`, `tole_peinte` |
| **06** | NÉBULEUSE | N01 dérive · N02 dock · N03 chantier · N04 coursive | `BAIE_TAUX` par biome, `composite_blanc`, `treillis` |
| **07** | FRICHE | R01 casse · R02 effondrée · R03 chantier · R09 dépôt | macro `oblique`, `beton_brut`, `tole_rouillee` |
| **08** | SECTEUR | S01 rue · S02 ruelle · S03 parvis · S06 marché | `pierre_polie`, `bache`, sol à deux matières |
| **09** | FONDERIE | F01 coulée · F02 fusion · F03 refroidissement · F05 sablerie | `nappe` (FAILLE), `eau`, `granulat`, `arc` |

**L'ordre des thèmes n'est pas neutre** : l'Usine est celle dont les captures
montrent le défaut, la Nébuleuse est celle qui coûte le moins (son levier est un
paramètre existant), la Friche paie l'oblique dont trois thèmes dépendent, et la
Fonderie vient en dernier parce qu'elle paie la FAILLE — la primitive la plus
chère, et celle qui bénéficie d'avoir vu tourner les quatre autres lots.

### Phase 3 — LE SEMIS ET LE REPÈRE (lots 10 à 12)

| lot | contenu | vérificateur |
|---|---|---|
| **10** | `ZONES[theme][biome]`, `AIR` fondu dans le biome, les 11 familles de props paramétriques | `verifierZones` / `verifierSemis` par biome |
| **11** | les 20 primitives de trace avec leur **classe** (ancrée / orientée / libre), `sonder()` rend la position | `verifierTraces` étendu : deux biomes au même jeu, une trace ancrée sans source |
| **12** | **`AMER[biome]`, un par quartier** — 3 à 6 repères par arène au lieu d'un | `verifierAmers` par quartier |

### Phase 4 — LE RESTE DE LA BIBLIOTHÈQUE (lots 13 à 18)

| lot | contenu |
|---|---|
| **13** | P1 usine (U05 utilités · U06 traitement · U07 robotisée) + P1 fonderie (F04 laminoir · F06 minerai) |
| **14** | P1 friche (R04 voie · R05 repris · R06 parking) + P1 nébuleuse (N05 serre · N06 réacteur) |
| **15** | P1 secteur (S04 strip · S05 capsules) + P2 usine (U08 · U09 · U10 · U11) |
| **16** | P2 fonderie (F07 · F08 · F09 · F10) + P2 friche (R07 · R08 · R10) |
| **17** | P2 nébuleuse (N07 · N08 · N09 · N10) + P2 secteur (S07 · S08 · S09 · S10) |
| **18** | tous les P3 (U12 · U13 · F11 · F12 · R11 · R12 · R13 · N11 · N12 · S11 · S12 · S13) |

### Phase 5 — LA PÉRIODICITÉ (lot 19, isolé exprès)

| lot | contenu | pourquoi isolé |
|---|---|---|
| **19** | `my = (cx·2+cy)&1` → hachage à deux bits : **16 → 64 arrangements distincts** | **il déplace toutes les arènes déjà mesurées.** Il se livre seul, avec sa remesure complète (`verifierBiomes`, `verifierNavigation`, `verifierSuperpositions`, les campagnes), jamais dans le même lot qu'un équilibrage |

---

## M.2 — Les jalons visibles

| après | ce qu'un joueur constate |
|---|---|
| **lot 01** | « le sol change quand je traverse » — sur les 20 régions actuelles, sans un biome neuf |
| **lot 02** | « il y a des bâtiments maintenant » — la première structure plus grande qu'un écran |
| **lot 04** | rien (lot de garde-fous) — mais plus aucun doublon ne peut être livré après lui |
| **lot 09** | **la vision finale, sur les 5 thèmes, en version P0** : chaque carte est un vrai complexe de 3 à 6 installations différentes |
| **lot 12** | « je me repère » — 3 à 6 amers par carte, un semis qui suit l'architecture |
| **lot 18** | 63 biomes, `C(12,5) = 792` compositions de carte par thème |
| **lot 19** | plus aucune répétition lisible à l'échelle de deux écrans |

---

## M.3 — Ce que ce dossier refuse de faire

- **Ajouter des petits props d'abord.** Le §25 du cahier des charges le dit, et
  la mesure du §B.0 le prouve : le semis est déjà le canal le plus travaillé du
  dépôt et il ne suffit pas. Les props arrivent **au lot 10**, après le sol, la
  trame et les vingt biomes P0.
- **Remplir le quota.** Quatre biomes ont été fusionnés ou supprimés avant
  écriture (`nebuleuse[1]`, `nebuleuse[2]`, `secteur[1]`, `friche[2]`), deux
  paires sont sous surveillance mesurée (F04/F12, S01/S04) et **F12 est déclarée
  sacrifiable**. 63 est un résultat, pas une cible.
- **Toucher l'équilibrage.** Aucun point de vie, aucun dégât, aucun plafond,
  aucune vitesse, aucun rayon de danger ne bouge. Le budget de surface bâtie est
  **constant**.
- **Toucher le réseau.** Zéro octet, zéro champ d'instantané (§K.0).
