# ÉTAPE 6 — PRIORISATION ET ROADMAP

---

# 1. TOP 10 DES BIOMES À PRODUIRE EN PREMIER

Critères pondérés : impact visuel · différenciation réelle mesurée par la
matrice · apport gameplay · coût de production · réutilisation d'assets ·
risque technique · valeur de rejouabilité.

| rang | biome | pourquoi lui | coût | débloque |
|---|---|---|---|---|
| **1** | **R05 · Cour de ferraille** (Friche) | c'est l'exemple de référence de la demande, et le plus démonstratif : silhouette immédiate, composition claire, gameplay sain | moyen | systèmes `EMPILEMENT` et `VEHICULE`, réemployés par 11 autres biomes |
| **2** | **U05 · Le magasin** (Usine) | la première géométrie **vraiment** neuve du jeu : couloirs longs, verticalité haute, anisotropie maximale | moyen | système `RAYONNAGE`, réemployé par N09 et R09 |
| **3** | **S06 · Les docks** (Secteur) | prouve la mutualisation : le conteneur existe, l'empilement le multiplie par quatre | **faible** | système `OSSATURE` (portique), réemployé par F11, R08, S12 |
| **4** | **F05 · Le parc à minerai** (Fonderie) | la seule silhouette **courbe** du dépôt, et le premier accent thermique | moyen | système `TAS`, réemployé par F06, R10, N10, S12 |
| **5** | **N06 · La ferme énergétique** (Nébuleuse) | le plan haut et son ombre balayante : la démonstration que le décor peut occuper l'écran sans bloquer | moyen | le mécanisme `hors` étendu, réemployé par F12, S06, S11, U12 |
| **6** | **S05 · La ruelle** (Secteur) | l'amplitude du thème : après le parvis, la ruelle prouve qu'une ville n'est pas uniforme | faible | système `MUR` en façade continue, réemployé par R09, N08, S12 |
| **7** | **R07 · Le parking** (Friche) | le biome le moins cher du plan (presque pas de bâti) et l'un des plus parlants : l'ordre humain sous l'abandon | **très faible** | rien, mais il valide `MATIERE` au niveau du biome |
| **8** | **F07 · Le hall des lingots** (Fonderie) | premier obstacle dont la **destruction change la circulation** de façon lisible | faible | l'empilement destructible, réemployé par R12 et S05 |
| **9** | **U06 · L'expédition** (Usine) | la seule composition **adossée** du jeu : un bord dur, une aire ouverte | moyen | `quai` et `remorque`, réemployés par R06 et S06 |
| **10** | **R10 · La friche verte** (Friche) | le seul accent vert du dépôt, et le contrepoids nécessaire à R05 et R08 | moyen | système `TAS` en variante organique, `MAT` en arbre |

**Couverture** : les dix couvrent les cinq thèmes (Usine 2, Fonderie 2, Friche 3,
Nébuleuse 1, Secteur 2) et **les quatre systèmes neufs**. Après ces dix, les 51
autres biomes sont majoritairement des recombinaisons de vocabulaire déjà produit.

**Un thème reste sous-servi à ce stade : la Nébuleuse.** C'est délibéré — elle a
la DA la plus aboutie et la moins urgente à corriger, et son biome prioritaire
(N06) est aussi celui qui débloque le plan haut pour les quatre autres.

---

# 2. TOP 20 DES ASSETS LES PLUS RENTABLES

Un asset est rentable quand il sert dans plusieurs biomes, idéalement dans
plusieurs thèmes. « Réemplois » compte les biomes qui le tirent.

## Bâti

| rang | asset | type | réemplois | thèmes |
|---|---|---|---|---|
| 1 | **`EMPILEMENT`** (silhouette dentelée) | système | 14 | 5 |
| 2 | **`MAT`** (emprise minimale, silhouette haute) | système *(existe)* | 13 | 5 |
| 3 | **`MUR`** (continu, percé) | système *(existe)* | 12 | 5 |
| 4 | **`TAS`** (trapèze, base large) | **système neuf** | 9 | 4 |
| 5 | **`VEHICULE`** (allongé, angles cassés) | système *(existe)* | 9 | 4 |
| 6 | **`OSSATURE`** (fine, ajourée) | **système neuf** | 8 | 4 |
| 7 | **`BASSIN`** (bordure épaisse) | **système neuf** | 5 | 4 |
| 8 | **`RAYONNAGE`** (long, fin, montants) | **système neuf** | 5 | 3 |
| 9 | `conteneur` empilé (variante haute) | déclinaison | 6 | 3 |
| 10 | `poteau` (déclinaison de `MAT`) | déclinaison | 6 | 3 |

Les quatre systèmes neufs (rangs 4, 6, 7, 8) coûtent **quatre fonctions de
silhouette** et servent 27 biomes. C'est le meilleur investissement du plan.

## Props

| rang | asset | catégorie | réemplois | thèmes |
|---|---|---|---|---|
| 11 | **`USURE_PROP`** (le paramètre de vieillissement) | mécanisme | 12 props × 3 thèmes | 3 |
| 12 | **`GRAPPE`** (ancre + satellites) | mécanisme | tous | 5 |
| 13 | `palette` (usure variable) | moyen | 9 | 3 |
| 14 | `caisse` (usure variable) | moyen | 9 | 3 |
| 15 | `bidon` / fût (usure variable) | moyen | 8 | 3 |
| 16 | `bache` | moyen | 7 | 4 |
| 17 | `cone` / balise de chantier | micro | 6 | 3 |
| 18 | `marquage_efface` (primitive de trace) | trace | 11 | 4 |
| 19 | `empreintes` (primitive de trace) | trace | 10 | 4 |
| 20 | `vegetation` (primitive de trace) | trace | 8 | 2 |

Les trois primitives de trace (18, 19, 20) coûtent trois fonctions de dessin et
donnent 29 emplacements de quartier. Même logique que les systèmes : une
**grammaire**, pas un catalogue.

## Hors classement, mais décisifs

- **Le repère de quartier** (§4.3 de `07-`) : cinq points remarquables au lieu
  d'un. Une fonction de dessin par biome, mais c'est la signature visible de loin
  — l'asset qui fait le plus pour « je suis dans une vraie zone ».
- **Les trois fonds neufs** (`complexe`, `aciérie`, `friche`) : trois recettes
  pour trois thèmes qui n'ont aujourd'hui **aucun** horizon.

---

# 3. ROADMAP DE PRODUCTION

Un lot = un commit = un bump (`minor` = le plan, `patch` = le rang du lot).
Chaque lot livre **son vérificateur**, sans quoi il n'est pas fini.

## Lot 01 — Le reparentage *(aucun contenu neuf)*

Le lot le plus important et le moins spectaculaire. Il ne doit **rien** changer à
l'écran, et c'est son critère de réussite.

- `BIOMES` → `THEMES`, `lieuAt` → `zoneAt`, renommage mécanique.
- `BIOMES[themeKey]` : les 4 variantes actuelles de chaque thème deviennent ses
  4 premiers **biomes**, à l'identique — arrangement unique chacun.
- `lieuxDe` → `biomesDe` ; `BIOME_COMPOSE` supprimé ; `Room.drawBiome()` retrouve
  le tirage de thème avec anti-répétition.
- `ZONES`, `QUARTIER`, `MATIERE`, `DENSITE_LIEU`, `ECHELLE_LIEU`, `HZ_*`,
  `ECHELLE` passent du thème au biome, **avec les mêmes valeurs**.
- **Correction des cinq défauts vivants** de `08-architecture-technique.md` §1 :
  ils tombent d'eux-mêmes, il suffit de vérifier qu'ils sont tombés.
- `amerCache` à 6 entrées.

**Vérificateur** : `verifierReparentage()` — pour les 5 thèmes, 3 modes et 20
graines, l'arène construite par le nouveau code est **identique** à celle de
l'ancien sur les mêmes entrées, obstacle par obstacle. Sans lui, tout le reste du
plan est bâti sur une régression invisible.

## Lot 02 — La matrice

- `signatureBiome` étendue aux 9 axes (`verticalite`, `anisotropie`, `ouverture`).
- `SYSTEME[s].hauteur` déclarée pour les 8 systèmes existants.
- Enveloppes de thème écrites, plafond par paires **supprimé**, plancher à 2 axes
  sur 25 %.
- Accents de palette : structure + `ACCENT_LAB_MIN` / `MAX`.
- Découpage rapide / `--tout` des vérificateurs coûteux.

**Vérificateur** : `verifierBiomes()` étendu (les 8 points de `06-` §6). À ce
stade il doit être **vert sur les 20 biomes existants**, ce qui prouve que les
seuils sont calibrés sur du réel avant qu'on écrive du neuf.

## Lot 03 — Les quatre systèmes

`TAS`, `RAYONNAGE`, `OSSATURE`, `BASSIN` : quatre silhouettes, la déclaration
`hauteur`, l'extension de `hors` au plan haut, et la règle « un système sert au
moins deux thèmes ».

**Vérificateur** : `verifierEmpreinte` étendu aux quatre nouvelles formes (elles
remplissent leur rectangle sur les gabarits réels de `gabaritsDe`) ;
`verifierSystemes()` (tout système est employé par ≥ 2 thèmes, tout kind a un
système, toute hauteur ≥ 0,9 déclare ce qu'elle met en plan haut).

## Lot 04 — Les grappes et l'usure

`GRAPPE`, `USURE_PROP`, les trois primitives de trace neuves, et le bucketing de
`sonder()` (§4.3 de `08-`).

**Vérificateur** : `verifierGrappes()` ; `verifierTraces()` étendu ; mesure de
`refresh()` avant/après sur une traversée d'arène complète.

## Lots 05 à 09 — Les biomes, par vagues de deux ou trois

Ordre imposé par le TOP 10 : `R05 + U05` · `S06 + F05` · `N06 + S05` ·
`R07 + F07` · `U06 + R10`.

Chaque lot : les tables du biome, ses habillages, son repère, son entrée de
matrice. **Un lot n'est fini que quand `verifierBiomes` est vert sur 50 graines
en `--tout`.**

## Lot 10 — Les trois fonds

`complexe`, `aciérie`, `friche` + leurs habillages de baie (`lanterneau`,
`evacuation`, `dechirure`).

**Vérificateur** : `verifierFonds` et `verifierBaies` (existants) couvrent déjà
les deux sens ; ils passent de 2 à 5 recettes sans changer de forme.

## Lots 11 et suivants — Le reste du catalogue

Les 51 biomes restants, par thème, dans l'ordre de priorité de chaque fichier
`01-` à `05-`. À partir de là, chaque lot est de la **recombinaison** : le
vocabulaire est produit, il ne reste que la composition.

---

# 4. JALONS DE VALIDATION

| jalon | ce qui doit être vrai |
|---|---|
| **après le lot 01** | une carte = un thème ; l'écran est **identique** à avant ; les cinq défauts vivants sont morts ; `verifierReparentage` vert |
| **après le lot 02** | la matrice est verte sur les 20 biomes existants, avec les seuils écrits **avant** |
| **après le lot 04** | le sol ne se lit plus comme « jeté au hasard » — critère subjectif, jugé sur capture d'écran, et c'est le bon juge |
| **après le lot 09** | 30 biomes jouables, 5 thèmes servis, aucun bouchon sur 50 graines × 3 modes |
| **après le lot 10** | les cinq thèmes ont un horizon |
| **fin de plan** | 61 biomes, 792 compositions par thème, et un joueur qui sait toujours dans quel monde il est |

---

# 5. LE RISQUE PRINCIPAL, NOMMÉ

Ce n'est ni la performance ni le pathfinding : les deux ont des gardes
mesurables et le dépôt sait déjà les écrire.

**C'est la dilution du thème.** Douze biomes par thème, c'est douze occasions de
sortir de l'enveloppe. Le garde-fou n'est pas une intention, c'est
`verifierBiomes` §2 (« un biome hors de l'enveloppe de son thème ») — et il ne
sert que si les enveloppes sont écrites **avant** les biomes, et jamais élargies
pour faire passer un biome qu'on aime bien.

Si un biome ne rentre pas dans l'enveloppe : **on le retire, on n'élargit pas
l'enveloppe.** C'est la seule règle du plan qui ne se négocie pas, parce que
c'est exactement la règle dont la violation a produit le défaut qu'on corrige.
