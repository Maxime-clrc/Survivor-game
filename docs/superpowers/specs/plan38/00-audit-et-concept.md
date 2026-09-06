# Plan 38 — THÈME et BIOME : refonte du système de lieux

**Phase de conception. Aucun code n'est modifié par ce document.**

Audit du dépôt en `0.41.1`. Les six étapes demandées se répartissent ainsi :

| étape | fichier |
|---|---|
| 1 — audit du système actuel | ce fichier |
| 2 — inventaire des 5 thèmes | ce fichier |
| le concept corrigé | ce fichier |
| 3 — brainstorm, 61 biomes | `01-` à `05-` |
| 4 — matrice de variété | `06-matrice-variete.md` |
| nouveaux obstacles, props, mutualisation | `07-obstacles-et-props.md` |
| 5 — architecture technique, impacts | `08-architecture-technique.md` |
| 6 — priorisation, roadmap | `09-priorisation-et-roadmap.md` |

---

# ÉTAPE 1 — AUDIT DU SYSTÈME ACTUEL

## 1.1 Où vit quoi, aujourd'hui

| donnée | fichier | forme | clé |
|---|---|---|---|
| les 5 lieux | `shared/biomes.js` `BIOMES` | tableau ordonné, index réseau | — |
| lois d'implantation | `shared/biomes.js` `OBSTACLES[lieu][v]` | 4 variantes par lieu, `poser[]` de rectangles fractionnaires | `lieu` |
| familles bâties | `shared/biomes.js` `BLOCS` | 15 entrées, 3 par lieu, append-only | `kind` |
| dangers | `shared/biomes.js` `HZ_NORMAL` / `HZ_CAUCHEMAR` / `ECHELLE` | 5 kinds recomposés par lieu | `lieu` |
| découpage en quartiers | `shared/biomes.js` `districtsDe` | 3 à 6 régions d'un seul tenant, germes + bruit | graine |
| affectation des lieux | `shared/biomes.js` `lieuxDe` | **une permutation des 5 lieux sur les quartiers** | graine |
| dessin du bâti | `public/render/blocs.js` `BLOC[lieu][kind]` | `{forme, habit, hors}` | `lieu`, `kind` |
| émission des blocs | `public/render/blocs.js` `LED[lieu]` | profil + `type` unique par lieu | `lieu` |
| matière du sol | `public/render/material.js` `TUILE` / `MACRO_TUILE` | 2 périodes cuites par `(lieu, mode, graine)` | `lieu` |
| arrière-plan | `material.js` `FOND` + `decor.js` `VITRAGE` / `VIE` | 3 couches, **2 recettes seulement** | `fond` |
| catalogue de props | `public/render/props.js` `TABLE` | 12 à 14 props par lieu, disjoints | `lieu` |
| arrangement des props | `public/render/props.js` `ZONES` | **4 quartiers par lieu** | `lieu` |
| ancrage architectural | `props.js` `QUARTIER[lieu][kind]` | famille bâtie → quartier, portée 90 px | `lieu`, `kind` |
| densité / calibre | `props.js` `DENSITE_LIEU` / `ECHELLE_LIEU` | **une constante par lieu** | `lieu` |
| traces au sol | `props.js` `MATIERE[lieu]` | une primitive par quartier, 9 primitives | `lieu` |
| dangers dessinés | `public/render/dangers.js` `DANGER` / `SOUFFLE` | table `(lieu, kind)` | `lieu` |
| charte | `shared/palette.js` `BIOME_SKIN` | couleurs écrites, croisées en LAB | `lieu` |
| repère | `public/render/decor.js` `AMERS` | **un amer par arène**, un dessin par lieu | `lieu` |
| lieu d'un point | `public/render/stage.js` `lieuKeyAt(x, y)` | point de passage unique du rendu | — |

Arène : `14400 × 8100`, vue `1600 × 900` → **9 × 9 = 81 cellules**.
`DISTRICT_CELLULES = 18` → `round(81/18) = 5` quartiers, bornés à `[3, 6]`.

## 1.2 Le défaut, et il tient à une fonction

`shared/biomes.js:906` — `lieuxDe()` distribue **les 5 entrées de `BIOMES`** sur
les 5 quartiers, en bijection, et `verifierCarte` **exige** que les cinq soient
présents et d'un seul tenant.

Le système fait donc exactement ce pour quoi il a été écrit, et ce pour quoi il a
été écrit est le défaut. Une arène montre la Friche **et** la Nébuleuse **et** la
Fonderie, garanties par un test.

Le mot « biome » désigne aujourd'hui **un thème**. Ce qui joue en pratique le
rôle d'un biome — une sous-zone avec sa loi spatiale — ce sont les **variantes**
de `OBSTACLES[lieu]`, et il n'y en a que quatre par thème.

## 1.3 Ce qui est déjà bon, et qu'il ne faut pas casser

Six briques nécessaires sont déjà écrites **et** vérifiées :

1. **Le découpage en régions** (`districtsDe`) — germes espacés, croissance,
   bruit sur la distance, régions d'un seul tenant, 16 cellules en moyenne. C'est
   exactement la granularité d'un biome. Rien à refaire.
2. **Le pavage Wang** (`bordsDe`, `bordsAccordes`, `grilleVariantes`) — trois
   états de bord, l'assembleur ne pose que des voisines compatibles, réparation
   locale de l'arête fautive. Extensible tel quel.
3. **La hiérarchie architecture → semis** (`QUARTIER`, `sonder`,
   `PORTE_QUARTIER = 90`) — un prop assez proche d'un bloc prend le quartier de
   ce bloc. La moitié du « chaque élément a une raison d'être » existe déjà.
4. **Les tables croisées dans les deux sens** — `verifierZones`, `verifierTraces`,
   `verifierLed`, `verifierFonds`, `verifierBaies`, `verifierMatiere`,
   `verifierBlocs`, `verifierSemis`. Aucun ajout ne peut disparaître en silence.
   C'est la propriété la plus chère du dépôt, et elle est acquise.
5. **Les garde-fous de similarité** — `signatureBiome` (4 axes, seuil
   `LOI_ECART = 0.40` entre thèmes), `signatureVariante` (6 axes, plancher 15 % /
   plafond 40 %), `verifierCharte` (LAB sur `arena`/`bloc`/`emis`). La « matrice
   de variété » demandée existe déjà sous forme **exécutable**.
6. **Le déterminisme complet** — `buildBiome` est pur et rejoué des deux côtés
   sur la graine ; `props.js` sème par hachage de cellule, sans allocation ni
   état. **Rien de ce plan ne demande un octet de réseau.**

## 1.4 Ce qui est trop générique, mesuré

| constat | mesure | conséquence |
|---|---|---|
| 4 lois d'implantation par thème | `OBSTACLES[lieu].length === 4` partout | un thème se répète tous les 4 quartiers |
| 3 familles bâties par thème | `BLOCS.length === 15` | l'objet qui occupe l'écran a 3 formes |
| toute silhouette remplit son AABB | `silhouetteBloc` | tout est un rectangle chanfreiné |
| densité et calibre par **thème** | `DENSITE_LIEU`, `ECHELLE_LIEU` | deux zones d'une usine ont la même quantité d'objets |
| 4 quartiers de props par thème | `ZONES[lieu].length === 4` | l'arrangement ne descend pas au biome |
| props tirés indépendamment | `props.js:refresh` | un prop n'a **aucun voisin** : ni grappe, ni ancre |
| 1 trace par cellule, 2 sur 3 | `TRACE_TAUX = 0.66` | la micro-décoration est uniforme |
| **1 amer par arène** | `amerDe` | 81 cellules, un seul point remarquable |
| **2 fonds sur 5 thèmes** | `FOND = {espace, ville}` | trois thèmes n'ont pas d'horizon |
| échelle de danger par thème | `ECHELLE[lieu]` | tout le thème a le même calibre |

Le diagnostic tient en une phrase : **il n'existe rien entre la cellule
(1600 × 900) et le thème.** Le quartier existe comme découpage mais ne porte
qu'une variante d'implantation ; toutes les autres tables sautent directement du
thème à la cellule. C'est *exactement* ce qui produit l'impression de
« props jetés au hasard » : ils sont posés par une règle qui ne connaît que le
thème, donc qui ne désigne aucun endroit.

---

# ÉTAPE 2 — INVENTAIRE DES 5 THÈMES

## USINE — `#121a26`, ambre `#ffa63d`, lumière `[0.62, 0.78]`

**Verbe : elle fabrique. Au présent.** Seul thème dont les machines tournent
encore : convoyeurs qui défilent, voyants qui respirent, ventilation.

- **Ce qui marche** : les bandes (chaîne · allée · chaîne) ; l'orthogonalité ; le
  contraste barre longue / armoire ; l'ambre comme seul chaud ; le mouvement
  périodique des props, qui n'est jamais un télégraphe.
- **Trop générique** : `chaine`/`machine`/`poste` sont trois rectangles ; aucune
  zone d'usine n'a d'architecture propre — production, stockage et maintenance
  partagent la même loi ; pas d'horizon.
- **Réutilisable tel quel** : `TUILE.usine` (voies + maille 5 m), `macroUsine`,
  la charte, les 5 dangers (`jetDeVapeur`, `huile`, `convoyeur`, `chariot`,
  `bacDeTrempe`), les 12 props.
- **À refondre** : les familles bâties, la densité (constante 1,15), les 4 zones
  de props, l'absence de fond.

## FONDERIE — `#1d1310`, orange `#ff8a2a`, lumière `[0.55, 0.84]`

**Verbe : elle coule.** Seul thème dont la masse soit le mot principal, et seul
qui ait une lumière propre au sol (`couleeDe`, dont les regards sont des sources
filtrées à la génération et lues par `decor.js` **et** `lumiere.js`).

- **Ce qui marche** : deux masses et un couloir ; l'échelle de danger la plus
  large des cinq ; la gueule de four comme type d'émission ; le vitrifié comme
  surface glissante née de la matière et non d'un décalque.
- **Trop générique** : 4 variantes qui sont 4 façons de poser fours et cuves.
  Rien du **cycle** — minerai, four, coulée, refroidissement, expédition,
  crassier — n'est lisible spatialement.
- **Réutilisable** : `TUILE.fonderie`, `couleeDe`, toute la table de dangers,
  `LED.fonderie` type `gueule`, les 12 props.
- **À refondre** : le catalogue bâti ; l'horizon ; la répartition thermique,
  aujourd'hui uniforme alors que la chaleur devrait être le gradient qui
  identifie une zone.

## FRICHE — `#1b1a13`, ambiante **plate** (`k = 0.62`, rien n'éclaire)

**Verbe : elle a été abandonnée.** Seul thème avec un tremblement de position
(`j = 40`, par cellule) et la plus large étendue de calibre de props.

- **Ce qui marche** : l'ambiante plate ; le contraste des calibres ; les
  carcasses en trois formats à surface égale (couché, carré, debout) ; la
  végétation comme prop dominant ; le tremblement par cellule.
- **Trop générique** : « des ruines partout » est la seule loi. Le mur, le
  cratère et l'effondrement sont trois façons d'espacer les mêmes blocs. Rien ne
  dit ce que le lieu **était** avant d'être une friche.
- **Réutilisable** : `TUILE.friche` (dalles, joints irréguliers), `macroFriche`,
  les dangers (`cableSousTension`, `boue`, `flaqueToxique`,
  `frontDeCombustion` — le seul qui rampe deux fois plus loin et deux fois plus
  lentement), les 12 props, le tremblement.
- **À refondre** : tout le bâti ; la végétation (un seul prop `brousse` pour
  porter tout un registre) ; l'horizon.

## NÉBULEUSE — `#06080f`, cyan `#7fd0e8`, seule ambiante froide, `k` le plus haut

**Verbe : elle flotte.** Catalogue entièrement propre, aucun emprunt terrestre.

- **Ce qui marche** : le contraste de taille extrême ; le centre vide ; les
  travées très longues et fines ; les baies ouvertes sur le vide (`fondDe`
  `espace` : loin / gaz / étoiles) ; le givre ; l'absence de poussière
  (`MATIERE.nebuleuse` — sans gravité, ce qui marque une coque l'a heurtée).
- **Trop générique** : la moitié du thème est « des cailloux qui dérivent ».
  Aucune **fonction** orbitale n'est lisible : ni amarrage, ni énergie, ni
  chantier, ni habitation.
- **Réutilisable** : tout le fond `espace`, la charte, les 12 props, l'échelle de
  dangers (champs larges, ponctuels fins).
- **À refondre** : `fragment`/`travee`/`debris` sont trois tailles d'un même
  objet. Il faut des **structures** en plus des **masses**.

## SECTEUR — magenta `#ff3d9a`, lumière presque horizontale `[0.86, 0.51]`, `k` le plus bas

**Verbe : il s'adresse à vous.** Le seul habité, le seul mouillé, le seul éclairé
par ses murs, le seul avec trois sources au sol, et un fond `ville` qui dit qu'il
est **au-dessus** de la mégapole — ce qui justifie ses grilles d'air, ses plaques
d'égout et son effluent, qui donnent tous sur quelque chose.

- **Ce qui marche** : la rue comme volume bordé et non rempli ; les pylônes fins
  qui coupent la ligne de tir sans fermer le passage ; le fond en trois couches ;
  le néon interdit au fond pour que les enseignes existent ; `LED.secteur` à
  9/10 et la portée la plus grande.
- **Trop générique** : quatre variantes qui sont quatre densités de la **même**
  rue. Aucun quartier n'a d'identité : commercial, résidentiel, logistique et
  technique se ressemblent.
- **Réutilisable** : le fond `ville`, la charte, les 14 props, la table de
  dangers, le caillebotis comme vitrage.
- **À refondre** : `devanture`/`pylone`/`conteneur` ne couvrent ni un quartier
  pauvre ni un dock ; la densité 1,28 est constante alors que le contraste
  ruelle / parvis **est** l'identité d'une ville.

---

# LE CONCEPT CORRIGÉ

```
THÈME            5, index réseau, append-only          — LE MONDE
  └─ BIOME       10 à 13 par thème, index local        — UNE ZONE DE CE MONDE
       └─ ARRANGEMENT  2 à 4 par biome, par cellule    — UNE VUE DE CETTE ZONE
```

**Une carte = UN thème.** Les 5 quartiers d'une arène reçoivent 5 **biomes de ce
thème**, sans répétition, avec la même bijection et le même vérificateur
qu'aujourd'hui. `lieuxDe(seed, cols, rows)` devient
`biomesDe(theme, seed, cols, rows)` : une ligne de sémantique, pas une
réécriture.

**BIOME contre VARIANT** — la distinction demandée, rendue opérationnelle :

- **BIOME** = une identité spatiale. Il change la loi d'implantation, le
  sous-ensemble de familles bâties, les zones de props, la densité, le calibre,
  les traces, les dangers. Il occupe **un quartier** (~16 cellules, 4 vues de
  côté). C'est ce qu'on traverse.
- **ARRANGEMENT** = une variation compositionnelle du même biome. Il rejoue les
  mêmes familles avec une autre disposition, et il se tire **par cellule** sous
  contrainte de bords Wang. C'est ce qu'on voit.
- **ACCENT** = une variation esthétique du même biome (sec / mouillé /
  contaminé). Il ne bouge aucune géométrie : un delta borné de palette, un choix
  de traces, une météo favorisée. C'est ce qu'on ressent.

## Ce qui change de niveau

| donnée | avant | après |
|---|---|---|
| palette de base, direction de lumière | thème | **thème** |
| matière de sol, macro-période | thème | **thème** |
| fond (loin / séparation / près) | thème | **thème** |
| familles bâties : le catalogue | thème | **thème** |
| props : le catalogue | thème | **thème** |
| dangers : le dessin et le souffle | thème | **thème** |
| loi d'implantation | thème (4) | **biome** (2-4 arrangements) |
| familles bâties **tirées** | implicite (toutes) | **biome** (sous-ensemble déclaré) |
| zones de props | thème (4) | **biome** (2-4) |
| traces au sol | thème | **biome** |
| densité, calibre | thème | **biome** |
| dangers posés (kind, place, échelle) | thème | **biome** |
| accent de palette | — | **biome** (delta borné en LAB) |
| repère / silhouette lointaine | arène (1) | **biome** (1 par quartier) |

## Ce qui ne bouge pas du tout

Le réseau (`biome` reste l'index du thème) · le déterminisme · `lieuKeyAt` comme
point de passage unique du rendu · `OBSTACLE_SURFACE_MAX = 0.10` ·
`HAZARD_SURFACE_MAX = 0.08` · `NAV_CFG.PASSAGE_MIN` · la traversabilité du carré
central sur les deux axes, à chaque graine et à chaque mode · la monotonie
calme < normal < cauchemar en nombre **et** en surface · l'ordre append-only de
`BIOMES` et de `BLOCS`.

## Rejouabilité

12 biomes tirés 5 à 5 = **792 compositions** par thème, avant même de compter
l'arrangement des cellules, l'accent et la graine. Aujourd'hui : **1**.
