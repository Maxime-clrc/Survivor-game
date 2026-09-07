# E — NOUVELLE LISTE D'OBSTACLES · F — BIBLIOTHÈQUE DE PROPS

---

## E.0 — Le principe : casser le couple 1:1

Aujourd'hui, `BLOC[lieu][kind] = { forme, habit }` — **15 familles, 15 formes,
15 habillages**. Un objet n'existe qu'une fois, dans un lieu, et le réemploi est
interdit par construction.

Proposé : **une famille bâtie = (SILHOUETTE, HABILLAGE, GABARIT, CONTOUR)**.

```js
// avant
usine: { [B_CHAINE]: { forme: formeChaine, habit: chaine } }

// apres
usine: { [B_CONVOYEUR]: { sil: SIL_BARRE, hab: HAB_TOLE_PEINTE, ech: [0.30, 0.036] },
         [B_RAIL_ARRIM]: { sil: SIL_BARRE, hab: HAB_GIVRE,      ech: [0.26, 0.020] } }
```

Le dessin d'une famille est **la composition de deux fonctions**, chacune
réutilisable. `verifierBlocs()` garde son rôle (un `kind` sans fiche replie en
silence) et gagne un croisement de plus : **une silhouette ou un habillage que
plus aucune famille ne tire est mort.**

---

## E.1 — LES SILHOUETTES · 22, dont 14 existent — plus UN macro de pose

| # | silhouette | ce qu'elle dit | état | tirée par |
|---|---|---|---|---|
| 1 | `caisson` | un volume fabriqué, chanfreiné | **existe** (`formeCellule`) | 5 thèmes |
| 2 | `barre` | quelque chose qui court | **existe** (`formeChaine`) | usine, fonderie, nébuleuse |
| 3 | `octogone` | une masse à gueule | **existe** | fonderie |
| 4 | `fut` | un contenant sous pression | **existe** (`formeCuve`) | usine, fonderie |
| 5 | `tube` | un réseau | **existe** (`formeConduite`) | usine, fonderie, secteur |
| 6 | `pan` | un mur qui a cassé | **existe** (`formeRuine`) | friche |
| 7 | `mur_bas` | une limite franchie du regard | **existe** | friche, secteur |
| 8 | `chassis` | un véhicule | **existe** (`formeCarcasse`) | usine, friche, secteur |
| 9 | `eclat` | quelque chose s'est détaché | **existe** (`formeFragment`) | nébuleuse |
| 10 | `travee` | une poutre structurelle | **existe** | nébuleuse, usine |
| 11 | `debris` | un petit reste mordu | **existe** | nébuleuse, friche |
| 12 | `devanture` | une surface qui vend | **existe** | secteur |
| 13 | `mat` | un support fin et haut | **existe** | secteur, nébuleuse, friche |
| 14 | `conteneur` | une boîte normalisée | **existe** | 4 thèmes |
| 15 | **`peigne`** | on range en rangées | **NEUF** | usine, fonderie, friche, nébuleuse, secteur |
| 16 | **`cadre`** | on voit à travers mais on ne passe pas | **NEUF** | 5 thèmes |
| 17 | **`pile`** | on a empilé | **NEUF** | usine, friche, nébuleuse |
| 18 | **`treillis`** | une structure triangulée | **NEUF** | usine, friche, nébuleuse |
| 19 | **`masse_molle`** | ça s'est accumulé tout seul | **NEUF** | fonderie, friche |
| 20 | **`gradin`** | on a creusé par paliers | **NEUF** | friche |
| 21 | **`nappe`** | il manque du sol | **NEUF** | 5 thèmes (la primitive FAILLE) |
| 22 | **`arc`** | une géométrie tournée autour d'un centre | **NEUF** | fonderie, nébuleuse, secteur |
| — | **`oblique`** | ça n'est pas resté en place | **NEUF, et ce n'est PAS une silhouette** | usine, friche, nébuleuse, secteur |

**Huit silhouettes nouvelles**, dont trois portent l'essentiel :
`peigne` (structure de rangement, 5 thèmes), `cadre` (transparent-bloquant,
5 thèmes) et `nappe` (la faille, 5 thèmes).

**`oblique` n'est pas une silhouette, et c'est `verifierEmpreinte()` qui le
dit** : une masse oblique ne remplit pas son AABB, donc le vérificateur la
refuserait — à juste titre, la collision étant une AABB et une forme qui rentre
ses coins faisant buter sur du vide. C'est donc un **macro de pose** :
`{ oblique: true, x0, y0, x1, y1, ep, kind }`, développé par `buildBiome` en une
chaîne de 3 à 5 rectangles en escalier, chacun remplissant le sien. Zéro
changement de collision, zéro exception au vérificateur (§K.1.1). Les tables
ci-dessous l'écrivent en position de silhouette : c'est ce qu'il **dit**, pas ce
qu'il **est**.

---

## E.2 — LES HABILLAGES · 29, dont 15 existent

Un habillage est **une matière et son usure**, pas un objet.

| habillage | matière | thèmes | état |
|---|---|---|---|
| `tole_peinte` | tôle propre, liseré, écran | usine, nébuleuse | dérivé de `cellule()` |
| `tole_rouillee` | tôle corrodée, coulées | friche, usine (rebut) | dérivé de `carcasse()` |
| `beton_brut` | béton coffré, balèvres | usine, friche | **neuf** |
| `beton_lave` | béton délavé, éclats | friche | dérivé de `ruinePan()` |
| `pierre_polie` | dallage lisse, reflets | secteur | **neuf** |
| `fonte_noircie` | fonte, calamine, gueule | fonderie | `four()` existe |
| `refractaire` | brique, joints clairs | fonderie | **neuf** |
| `composite_blanc` | panneau lisse, joints fins | nébuleuse | **neuf** |
| `givre` | métal + givre d'arête | nébuleuse | `P_GIVRE` existe |
| `cristal` | prisme émissif, veines | nébuleuse | `cristal()` existe |
| `verre_enseigne` | vitrine, cadre, néon | secteur | `devanture()` existe |
| `ecran` | surface lumineuse animée | secteur | **neuf** |
| `claire_voie` | grillage / caillebotis | 5 thèmes | `caillebotis()` existe |
| `maconnerie` | parpaing, brique, mortier | friche, secteur | **neuf** |
| `bache` | toile tendue, plis, cordes | friche, secteur | **neuf** |
| `vegetal` | feuillage, bord organique | friche, nébuleuse | `P_BROUSSE` existe |
| `granulat` | tas, grain, bord flou | fonderie, friche | **neuf** |
| `eau` | nappe, reflets, ondulation | fonderie, friche, secteur | **neuf** |
| `effluent` | nappe émissive, dérive lente | secteur | **neuf** |
| `bitume` | asphalte, marquages | friche, secteur | `secteur()` existe |
| … | + les 9 habillages existants conservés tels quels | | |

**Quatorze habillages nouveaux.** Chacun sert 2 à 5 thèmes.

**Coût total réel de la bibliothèque** : 8 silhouettes + 1 macro de pose +
14 habillages = **23 postes à écrire**, pour ~50 couples distincts et ~115
familles bâties sur 63 biomes. Le couple 1:1 en aurait demandé 115.

---

## E.3 — LES FAMILLES BÂTIES, PAR THÈME

Notation : `famille` = (silhouette × habillage). **Signature** = famille exclusive
à un biome. Les familles existantes sont marquées **(∃)**.

### USINE · 24 familles

| famille | sil × hab | biomes | rôle |
|---|---|---|---|
| `convoyeur` **(∃)** | barre × tole_peinte | U01, U09 | trame RUBAN |
| `robot` | caisson × tole_peinte | U01 | **signature U01** |
| `cage` | cadre × claire_voie | U01, U07 | transparent-bloquant |
| `armoire` **(∃)** | caisson × tole_peinte | 7 biomes | le liant du thème |
| `palettier` | peigne × tole_peinte | U02 | **signature U02** |
| `pile` | pile × tole_peinte | U02, U03, U08 | destructible |
| `quai` | gradin × beton_brut | U03 | **signature U03** |
| `remorque` | chassis × tole_peinte | U03 | **signature U03** |
| `porte_sect` | mur_bas × tole_peinte | U03 | mur percé |
| `etabli` | caisson × tole_rouillee | U04, F07 | bas et long |
| `machine_ouverte` | caisson × tole_rouillee | U04 | **signature U04** |
| `transfo` | fut × tole_peinte | U05 | **signature U05** |
| `cloture` | cadre × claire_voie | U05, U10, R01 | voir sans passer |
| `bac` | nappe × eau | U06 | **signature U06** |
| `passerelle` | barre × claire_voie | U06, F03, S13 | franchir une faille |
| `hotte` | caisson × tole_peinte | U06 | occlusion haute |
| `portique_rob` | treillis × tole_peinte | U07 | enjambe |
| `presse` | oblique × fonte_noircie | U08 | **signature U08** (col de cygne) |
| `poteau_charp` | treillis × beton_brut | U08, R06 | vertical fin |
| `silo` | fut × tole_peinte | U09 | **signature U09** |
| `tremie` **(∃)** | octogone × tole_rouillee | U09, F06 | |
| `benne` | conteneur × tole_rouillee | U10, S02 | ouvert débordant |
| `balle` | conteneur × tole_rouillee | U10, R10 | cube compressé |
| `cabine` | cadre × verre_enseigne | U11 | **signature U11** |
| `marbre` | caisson × pierre_polie | U11 | dalle massive basse |
| `faisceau` | barre × tole_peinte | U12 | **signature U12** (strié coloré) |
| `cloison` | cadre × composite_blanc | U13, N04 | bas, vitré en tête |

### FONDERIE · 21 familles

| famille | sil × hab | biomes | rôle |
|---|---|---|---|
| `rigole` | barre × fonte_noircie | F01 | **signature F01**, trame |
| `poche` | fut × fonte_noircie | F01 | sur chariot |
| `four` **(∃)** | octogone × fonte_noircie | F02, F11 | la masse |
| `plateforme` | arc × refractaire | F02 | anneau de ceinture |
| `tuyere` | tube × fonte_noircie | F02 | bec radial |
| `bassin` | nappe × eau | F03 | **signature F03** |
| `cage_laminoir` | caisson × fonte_noircie | F04 | **signature F04** |
| `table_rouleaux` | barre × fonte_noircie | F04, F09 | franchissable du regard |
| `chassis_moule` | cadre × granulat | F05 | **signature F05** |
| `malaxeur` | fut × tole_rouillee | F05 | |
| `tas` | masse_molle × granulat | F06, F08 | bord flou |
| `ecran_ebarb` | cadre × tole_rouillee | F07 | **signature F07** |
| `terril` | masse_molle × granulat | F08 | bord dentelé |
| `wagon` | chassis × tole_rouillee | F08, R04 | |
| `brame` | pile × fonte_noircie | F09 | **signature F09**, strié |
| `conduite` **(∃)** | tube × fonte_noircie | F10 | trame, surélevée |
| `bequille` | treillis × fonte_noircie | F10 | **signature F10** |
| `four_ouvert` | octogone × refractaire | F11 | **signature F11** (échancré) |
| `echafaud` | treillis × tole_rouillee | F11, R03 | voir à travers |
| `soufflante` | fut × tole_peinte | F12 | couché sur massif |
| `massif` | caisson × beton_brut | F04, F09, F12 | socle |

### FRICHE · 24 familles

| famille | sil × hab | biomes | rôle |
|---|---|---|---|
| `pile_epaves` | pile × tole_rouillee | R01 | **signature R01** |
| `carcasse` **(∃)** | chassis × tole_rouillee | R01, R06, R10 | 3 formats |
| `poutre_ob` | oblique × treillis | R02 | **signature R02** |
| `pan` **(∃)** | pan × beton_lave | 8 biomes | le liant du thème |
| `machine_morte` | caisson × tole_rouillee | R02 | vocabulaire d'Usine, mort |
| `poteau_nu` | mat × beton_brut | R03 | **signature R03** |
| `banche` | mur_bas × tole_peinte | R03 | coffrage debout |
| `plot` | conteneur × beton_brut | R03 | destructible |
| `wagon` | chassis × tole_rouillee | R04 | |
| `butoir` | caisson × beton_lave | R04 | |
| `bosquet` | masse_molle × vegetal | R05 | **signature R05** |
| `ronce` | mur_bas × vegetal | R05 | destructible |
| `pilier` | fut × beton_brut | R06 | **signature R06** |
| `dalle_penchee` | oblique × beton_brut | R06, R13 | ombre portée |
| `fut_masse` | fut × tole_rouillee | R07 | **signature R07** |
| `merlon` | mur_bas × granulat | R07 | butte linéaire |
| `barre_hab` | mur_bas × maconnerie | R08 | **signature R08** (percée) |
| `cage_escalier` | caisson × maconnerie | R08 | |
| `rack_tordu` | peigne × tole_rouillee | R09 | **signature R09** |
| `monticule` | masse_molle × granulat | R10 | mou |
| `gradin_roche` | gradin × granulat | R11 | **signature R11** |
| `abri` | pile × bache | R12 | **signature R12** |
| `barricade` | pile × tole_rouillee | R12 | destructible |
| `pile_viaduc` | caisson × beton_brut | R13 | **signature R13** |

### NÉBULEUSE · 22 familles

| famille | sil × hab | biomes | rôle |
|---|---|---|---|
| `fragment` **(∃)** | eclat × givre | N01, N11 | |
| `debris` **(∃)** | debris × givre | N01, N03, N11, N12 | destructible |
| `travee` **(∃)** | travee × givre | N01, N09 | très allongé |
| `bras_amarrage` | oblique × composite_blanc | N02 | **signature N02** |
| `coque` | masse_molle × composite_blanc | N02, N10 | énorme, partielle |
| `passerelle_tele` | tube × composite_blanc | N02, N10 | |
| `membrure` | treillis × givre | N03 | **signature N03** |
| `borde` | caisson × composite_blanc | N03 | seul opaque |
| `cloison_etanche` | cadre × composite_blanc | N04, N11 | **signature N04** |
| `console` | caisson × composite_blanc | N04, N08 | |
| `bac_culture` | arc × vegetal | N05 | **signature N05** |
| `vitrage` | arc × verre_enseigne | N05 | voir sans passer |
| `coeur` | octogone × fonte_noircie | N06 | **signature N06** |
| `radiateur` | travee × composite_blanc | N06 | rayonnant |
| `conteneur_sp` | conteneur × givre | N07 | **signature N07**, destructible |
| `rail_arrimage` | barre × givre | N07, N01 | franchissable |
| `cellule` | cadre × composite_blanc | N08 | **signature N08** |
| `paillasse` | caisson × composite_blanc | N08 | |
| `mat_solaire` | mat × givre | N09 | **signature N09** |
| `berceau` | arc × composite_blanc | N10 | **signature N10** |
| `dechirure` | nappe × givre | N11 | **signature N11** |
| `cristal_masse` | oblique × cristal | N12 | **signature N12** |

### SECTEUR · 24 familles

| famille | sil × hab | biomes | rôle |
|---|---|---|---|
| `devanture` **(∃)** | devanture × verre_enseigne | S01, S07 | front continu |
| `pylone` **(∃)** | mat × verre_enseigne | S01, S04 | coupe la ligne de tir |
| `mobilier_urbain` | caisson × verre_enseigne | S01, S11 | bas et varié |
| `vehicule` | chassis × bitume | S01, S04 | destructible |
| `mur_aveugle` | mur_bas × maconnerie | S02 | **signature S02**, n'émet pas |
| `escalier` | oblique × tole_rouillee | S02 | **signature S02** |
| `monolithe` | caisson × pierre_polie | S03 | **signature S03**, sans texture |
| `borne_sec` | mat × pierre_polie | S03, S10 | plot bas en file |
| `bassin_orn` | nappe × eau | S03 | |
| `facade_ecran` | devanture × ecran | S04 | **signature S04** |
| `totem` | mat × ecran | S04 | très haut, très fin |
| `alveole` | mur_bas × maconnerie | S05 | **signature S05**, percée |
| `coursive` | barre × claire_voie | S05 | |
| `etal` | peigne × bache | S06 | **signature S06**, destructible |
| `pilier_auvent` | mat × tole_rouillee | S06 | |
| `vitrine` | cadre × verre_enseigne | S07 | **signature S07** |
| `escalator` | oblique × pierre_polie | S07 | |
| `barge` | chassis × tole_rouillee | S08 | **signature S08** |
| `grue_portique` | treillis × tole_rouillee | S08, U10 | enjambe |
| `bouche` | arc × claire_voie | S09 | **signature S09** |
| `groupe_clim` | caisson × claire_voie | S09, S12 | batterie d'ailettes |
| `portique_sec` | cadre × pierre_polie | S10 | **signature S10** |
| `rame` | mur_bas × verre_enseigne | S11 | **signature S11**, percée |
| `collecteur` | tube × effluent | S13 | **signature S13** |

**Total : ~115 familles déclarées, ~50 couples silhouette × habillage
distincts, 23 postes de dessin nouveaux.** Chaque biome porte **2 à 4 familles**, dont
**au moins une signature exclusive** — l'invariant du §C.3.

---

## F — LA BIBLIOTHÈQUE DE PROPS

### F.1 — Le principe : le prop suit la FONCTION, pas le lieu

Aujourd'hui `TABLE[lieu]` est une liste plate de 12 à 14 props par thème, et
`ZONES[lieu]` en fait quatre paquets de quatre. C'est déjà la bonne idée (elle
est écrite dans `props.js` et elle fonctionne), mais elle s'arrête au thème.

Proposé : **`ZONES` devient indexé par BIOME**, et le lien avec l'architecture
passe par `QUARTIER`, qui existe déjà et qui rend au semis le quartier du bloc le
plus proche (`sonder()`). **Aucune couche nouvelle** : la table change d'index.

```js
ZONES[theme]           ->  ZONES[theme][biome]      // 4 zones -> 3 zones par biome
QUARTIER[theme][kind]  ->  inchange, avec plus de kinds
AIR[theme][loi]        ->  fondu dans le BIOME (dens, ech, zones, matieres)
```

### F.2 — Le raisonnement de composition, appliqué

Le §10 du cahier des charges demande d'abandonner `CELLULE → PROP RANDOM`. Le
dépôt le fait déjà à moitié : la zone se lit sur l'architecture proche, puis
retombe sur le découpage du lieu. **Ce qui manque, c'est la chaîne complète :**

```
BIOME  ->  FONCTION      ->  INFRASTRUCTURE  ->  OBJETS NECESSAIRES  ->  USURE
U03    ->  on charge     ->  quai, porte     ->  palette, transpalette, cale
                                                 ->  gomme de pneu, bordereau, sangle
```

Chaque biome déclare **trois quartiers de props** au lieu de deux :

| quartier | ce qu'il contient | où il tombe |
|---|---|---|
| **ACTIVITÉ** | les objets de la fonction du lieu | contre l'architecture signature |
| **SUPPORT** | ce qui sert la fonction sans être elle | contre les familles secondaires |
| **ABANDON / RÉSIDU** | ce que l'activité laisse | en terrain libre, par le hachage |

C'est la même mécanique à trois sources qu'aujourd'hui (`architecture décide,
hachage comble, fuite brouille`), avec un vocabulaire trois fois plus grand et un
index de biome.

### F.3 — Les familles de props paramétriques

Le §16 demande des familles réutilisables. Onze familles couvrent ~85 % des
besoins des 63 biomes :

| famille | paramètres | thèmes | exemples d'instance |
|---|---|---|---|
| `caisse` | taille, matière, état, empilement | 5 | palette, cageot, conteneur, caisson spatial |
| `roulant` | gabarit, matière, état | 5 | transpalette, chariot, AGV, brouette, moto |
| `contenant` | taille, matière, contenu, fuite | 5 | fût, bidon, cuve, réservoir, citerne |
| `reseau` | section, orientation, isolation | 5 | tuyau, gaine, câble, faisceau, flexible |
| `surface_verticale` | matière, message, usure | 5 | panneau, affiche, écran, tag, plaque |
| `mobilier` | usage, matière, état | 4 | banc, établi, paillasse, étal, bureau |
| `vegetal` | densité, teinte, taille | 3 | brousse, bosquet, bac de culture, mousse |
| `luminaire` | teinte, portée, comportement | 5 | tube, néon, balise, applique, guirlande |
| `sol_marque` | motif, netteté, couleur | 5 | marquage, passage, ligne, bande, adresse |
| `residu` | matière, taille, dispersion | 5 | débris, jonchée, gravats, éclats, déchets |
| `ouverture` | forme, vitrage, ce qu'on voit | 4 | baie, hublot, porte, trou de toiture, bouche |

**Un prop = (famille, paramètres, palette de thème).** Le catalogue passe de 48
entrées à ~150 **instances**, pour **11 fonctions de dessin paramétrées** au lieu
de 48 fonctions distinctes. Les 48 actuelles se rangent dans les onze familles
sans en réécrire une seule au premier lot : elles deviennent les instances de
référence.

### F.4 — Ce que le dépôt gagne à ne PAS mutualiser

Trois interdits, hérités de règles déjà écrites et qui restent :

1. **La Nébuleuse ne prend aucune quincaillerie terrestre.** Sa mutualisation se
   fait par la **famille** (`caisse`, `contenant`), jamais par l'instance. Un
   caisson spatial et une palette sont deux instances de `caisse`, pas le même
   objet retéinté.
2. **Le Secteur ne prend rien d'industriel monté.** Ce qui traîne dans une rue a
   été **jeté ou posé**, jamais boulonné.
3. **La règle « une matière est désaturée »** tient, avec deux exceptions
   déclarées : la lumière de croissance de N05 (physique) et les plastiques de
   R10 (physique). Toute autre saturation reste réservée au gameplay.
