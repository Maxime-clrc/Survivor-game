# OBSTACLES, PROPS, FONDS — et la stratégie de mutualisation

---

# 1. LES SYSTÈMES D'OBSTACLE

La demande — « un système générique réutilisable, puis des déclinaisons » — a une
réponse presque gratuite dans ce dépôt, parce que la moitié du travail est faite.

## 1.1 Ce qui existe déjà

`blocs.js` porte **quinze** fonctions de silhouette (`formeChaine`,
`formeOctogone`, `formeRuine`, `formeFragment`, `formePylone`…) et quinze
habillages, associés par la table `BLOC[lieu][kind] = {forme, habit, hors}`.

La règle de fer est écrite et vérifiée : **la silhouette remplit son rectangle**.
La collision est une AABB repoussée par axe ; une forme qui rentre ses coins fait
buter le joueur sur du vide. `verifierEmpreinte` juge déjà les silhouettes sur les
gabarits réels tirés de `gabaritsDe`.

## 1.2 Les 12 systèmes proposés

Un **système** = une silhouette paramétrée + une hauteur apparente déclarée.
Un **kind** = un système + un habillage + un propriétaire (thème).
Une **déclinaison** = un sous-type tiré de `graine(o)` **dans** l'habillage, donc
gratuite : `formeFragment` le fait déjà avec son coin cisaillé.

| système | silhouette | `hauteur` | existe ? | déclinaisons typiques |
|---|---|---|---|---|
| `BARRE` | longue, fine, chanfreinée | 0,2 | **oui** (`formeChaine`) | chaîne, conduite, travée, gaine, machine longue |
| `PAVE` | rectangle à coins cassés | 0,5 | **oui** (`formeMachine`) | machine, poste, armoire, module, mobilier |
| `PRISME` | octogone / hexagone | 0,7 | **oui** (`formeOctogone`) | four, moyeu, hexagone, silo |
| `CUVE` | cylindre vu de haut | 0,6 | **oui** (`formeCuve`) | cuve, transformateur, réservoir |
| `MUR` | continu, percé de brèches | 0,4 | **oui** (`formeMurBas`) | mur, paroi, façade, palissade, garde-corps, cloison, barrière |
| `VEHICULE` | allongé, angles cassés | 0,3 | **oui** (`formeCarcasse`) | épave, remorque, wagon, voiture, coque, moto |
| `ECLAT` | irrégulier, un coin cisaillé | 0,4 | **oui** (`formeFragment`) | fragment, débris, gravats |
| `MAT` | emprise minimale, fût vertical | **0,9** | **oui** (`formePylone`) | pylône, poteau, pilier, colonne, mât, arbre, lampadaire |
| `EMPILEMENT` | dentelée, crête irrégulière | 0,8 | partiel (`formeConteneur`) | pile d'épaves, pile de fûts, containers, cage, benne, lingots |
| **`TAS`** | trapèze, base large, sommet écrêté | 0,6 | **NON** | tas de minerai, terril, massif végétal, roche, bloc abattu |
| **`RAYONNAGE`** | très long, très fin, montants réguliers | **0,9** | **NON** | rack, palettier, verrière, étagère |
| **`OSSATURE`** | fine, ajourée, montants + traverses | 0,7 | **NON** | échafaudage, coffrage, portique, tunnel |
| **`BASSIN`** | bordure épaisse, intérieur distinct | 0,1 | **NON** | bac de trempe, bassin, cuvette |

**Quatre silhouettes neuves suffisent** pour ouvrir les 61 biomes. C'est le
meilleur ratio du plan : 4 fonctions de dessin contre 45 objets identifiables.

## 1.3 Ce que `hauteur` change

`hauteur` est déclarée **par système**, une fois, et sert à trois choses :

1. l'axe `verticalite` de la matrice (`06-matrice-variete.md`) ;
2. la longueur de l'ombre portée, qui lit déjà `lumDir()` — un mât projette une
   ombre longue, un bassin n'en projette aucune ;
3. le fait qu'un système **puisse dépasser du plan de jeu** : à `hauteur ≥ 0,9`,
   l'objet a le droit d'avoir une partie non bloquante au-dessus (la poutre d'un
   portique, le panneau d'une ferme solaire, la gaine maîtresse), déclarée par
   `hors` — le champ existe déjà dans `BLOC`.

**Règle de sécurité** : ce qui est au-dessus du plan de jeu ne bloque jamais, ne
projette qu'une ombre, et **ne masque jamais une entité**. Une poutre qui cacherait
un ennemi serait un défaut de gameplay, pas un effet.

## 1.4 Répartition des kinds par thème

`BLOCS` est append-only et son `kind` **ne circule pas sur le réseau** (le
serveur ne le lit jamais, la géométrie se régénère des deux côtés) : ajouter 30
entrées ne peut donc déplacer aucun mur ni reverrouiller aucun compte.

| thème | kinds aujourd'hui | kinds visés | systèmes employés |
|---|---|---|---|
| USINE | 3 | 11 | BARRE, PAVE, MUR, RAYONNAGE, OSSATURE, BASSIN, MAT, VEHICULE, EMPILEMENT |
| FONDERIE | 3 | 11 | PRISME, BARRE, CUVE, TAS, EMPILEMENT, OSSATURE, BASSIN, MAT, PAVE |
| FRICHE | 3 | 13 | MUR, ECLAT, VEHICULE, EMPILEMENT, TAS, MAT, OSSATURE, BASSIN, PAVE |
| NÉBULEUSE | 3 | 12 | ECLAT, BARRE, PRISME, MAT, RAYONNAGE, OSSATURE, MUR, TAS, VEHICULE |
| SECTEUR | 3 | 12 | PAVE, MAT, EMPILEMENT, MUR, OSSATURE, VEHICULE, BARRE, TAS |

Total : **15 → 59 kinds**, pour **4 silhouettes neuves** et ~44 habillages.
Un habillage fait 20 à 40 lignes dans le style actuel de `blocs.js`.

## 1.5 La règle de non-réutilisation, et comment l'assouplir sans mentir

`verifierBiomes` refuse aujourd'hui qu'un obstacle porte la famille d'un autre
lieu (`f.lieu !== b.key`). C'est une bonne règle et elle doit **rester** : elle
empêche un tuyau d'usine d'apparaître dans la Nébuleuse.

Mais elle interdit aussi la mutualisation honnête. Correctif : un `kind` reste
possédé par **un** thème, et la mutualisation se fait **au niveau du système**,
pas du kind. Concrètement :

```
BLOCS.push({ key: "bac_usine",    lieu: "usine",    systeme: BASSIN })
BLOCS.push({ key: "bac_fonderie", lieu: "fonderie", systeme: BASSIN })
```

Deux entrées, deux habillages, **une** silhouette. La règle du dépôt tient
(« une famille appartient à un lieu ») et le coût de production ne double pas.
`verifierBlocs` gagne une exigence : **tout `systeme` déclaré est employé par au
moins deux thèmes** — sinon ce n'est pas un système, c'est un objet.

---

# 2. LA BIBLIOTHÈQUE DE PROPS

## 2.1 L'état actuel

48 identifiants, 12 à 14 par thème, **catalogues disjoints**. La Nébuleuse et le
Secteur ne partagent rien avec personne, délibérément et pour de bonnes raisons
écrites dans le code : de la quincaillerie terrestre au sol d'une station
orbitale est « la seule justification qu'un prop n'a pas le droit d'avoir ».

**Cette règle ne se négocie pas.** La mutualisation demandée doit donc passer
ailleurs, et il y a deux endroits pour ça.

## 2.2 Mutualisation n°1 — le fonds industriel honnête (3 thèmes)

Usine, Fonderie et Friche **sont** des installations industrielles terrestres.
Elles partagent déjà `caillebotis`, `tuyau`, `cable`, `debris`. On peut étendre ce
fonds à condition que l'**état** diffère, ce qui se règle par une table de
vieillissement plutôt que par un dessin :

```
USURE_PROP = { usine: 0.15, fonderie: 0.35, friche: 0.90 }
```

Un même `caisse` dessinée à 0,15 (angles nets, peinture) et à 0,90 (angles
mangés, éventrée, envahie) sont deux objets à l'œil. Un paramètre, deux lieux.
**Candidats au fonds partagé** : caisse, palette, bidon, câble, tuyau, marquage,
grillage, panneau, bâche, cône, ferraillage, brique. Douze props, trois thèmes,
un paramètre. Gain : 24 props évités.

## 2.3 Mutualisation n°2 — les six primitives de trace

`MATIERE` porte déjà 9 primitives (`roulage`, `souillure`, `poussiere`,
`cendres`, `rayures`, `ruissellement`, `corrosion`, `fissures`, `dechets`) et
c'est une **grammaire**, pas un catalogue : chacune est paramétrée et vaut pour
tous les thèmes. Trois primitives suffisent à couvrir les 61 biomes en ajoutant :

- **`empreintes`** (pas, pneus, chenilles) — l'activité passée ;
- **`vegetation`** (mousse dans un joint, herbe dans une fissure) — le temps ;
- **`marquage_efface`** (une peinture au sol qui a été là) — l'ordre disparu.

Douze primitives pour 61 biomes × 4 quartiers = 244 emplacements. Le vérificateur
existant (`verifierTraces`) garantit déjà ≥ 2 matières distinctes par lieu et
refuse une primitive que plus personne ne tire. Il passe simplement du thème au
biome.

## 2.4 Les props neufs, par catégorie

**Gros props (structure, > 100 px)** — 14 neufs
gerbeur · transtockeur · pompe · foreuse · compacteur · groupe de clim · réchaud
de rue · projecteur de chantier · distributeur de quai · malaxeuse · soudeuse ·
panneau d'affichage · parabole géante · grue de casse (décor).

**Props moyens (30–100 px)** — 26 neufs
palette (usure) · cerclage · film étirable · cale de roue · transpalette ·
chemin de câbles · pupitre · casier · mobilier · linge · cageot (existe) ·
poubelle · benne (obstacle) · cône · ferraillage · sac de liant · godet ·
brique réfractaire · bâche · flotteur · roseau · plant gelé · nutriment ·
cordon d'amarrage · plaque de bordé · filon.

**Micro-détails (< 30 px)** — 20 neufs
pneu · jante · batterie · moteur · verre brisé · traverse · ballast · caddie ·
combinaison · effet personnel · cellule photovoltaïque · glyphe · écran mort ·
élingue · crochet · outillage épars · papier · mégot · douille · éclat de brique.

**Total : 60 props neufs** pour 61 biomes, dont 12 mutualisés sur trois thèmes.

## 2.5 La règle de contextualité, rendue exécutable

> « Une palette ne doit pas apparaître au milieu d'une zone où elle n'a aucune
> raison d'être. »

C'est exactement ce que `ZONES` + `QUARTIER` + `sonder()` font déjà, et le
vérificateur `verifierZones` croise les deux tables dans les deux sens. Le passage
au biome renforce le mécanisme sans le changer :

- `TABLE[theme]` = le vocabulaire du monde (24 à 30 props) ;
- `ZONES[biome]` = 2 à 4 quartiers, **tirant dans le vocabulaire du thème** ;
- `QUARTIER[biome][kind]` = ce que l'architecture attire autour d'elle ;
- `FUITE = 0.18` reste : sans elle la frontière entre deux quartiers est une
  droite, donc un découpage administratif.

`verifierZones` gagne deux exigences : **tout prop du catalogue d'un thème est
tiré par au moins un biome de ce thème** (sinon il est mort), et **aucun biome ne
tire plus de 60 % du catalogue de son thème** (sinon il n'a pas d'identité, il a
la liste).

---

# 3. LES GRAPPES — la réponse au « jeté aléatoirement »

C'est le manque le plus visible du semis actuel, et il n'est pas dans les tables :
il est dans `refresh()`. **Un prop n'a aucun voisin.** Chacun est tiré
indépendamment par `h2(cx, cy, g)`, donc rien ne peut se grouper, rien ne peut
appartenir à autre chose.

## 3.1 Le principe

Un prop peut être une **ancre**. Une ancre émet 1 à 3 **satellites** déterminés
par sa propre graine, dans un rayon déclaré, tirés dans une liste déclarée.

```
GRAPPE = {
  [P_PALETTIER]: { r: [40, 90], n: [1, 3], quoi: [P_CAISSES, P_PALETTE, P_FILM] },
  [P_EPAVE]:     { r: [30, 70], n: [2, 3], quoi: [P_PNEU, P_JANTE, P_VERRE] },
  [P_CAGEOT]:    { r: [20, 45], n: [1, 2], quoi: [P_CAGEOT, P_DECHET] },
  [P_POCHE]:     { r: [50, 110], n: [1, 2], quoi: [P_LINGOTS, P_SCORIE] },
}
```

## 3.2 Pourquoi c'est gratuit

- **Déterministe** : la position d'un satellite est `h2(cx, cy, graine_ancre + i)`,
  exactement le même moule que le reste du module.
- **Sans allocation** : les satellites entrent dans le tableau `props` déjà
  existant, pendant le même `refresh()`, qui ne tourne qu'au changement de fenêtre.
- **Sans nouveau concept** : `sonder()` est rejoué sur chaque satellite, donc un
  satellite ne tombe jamais dans un bloc ni dans un danger, comme aujourd'hui.
- **Budget borné** : la densité totale reste plafonnée. Une ancre consomme sa
  place **et** celle de ses satellites, donc le nombre d'objets par cellule ne
  monte pas — il se **réorganise**.

## 3.3 Ce que ça change à l'écran

Aujourd'hui : douze objets espacés régulièrement dans une cellule, tous
équidistants, tous seuls. C'est *exactement* la lecture « jeté au hasard », et
elle est correcte : ils l'ont été.

Après : trois ancres avec leur cortège, et du sol nu entre elles. Le sol nu n'est
pas une perte, c'est ce qui fait exister les groupes — la même raison pour
laquelle `MATIERE.friche` garde un `null`.

## 3.4 Vérificateur

`verifierGrappes()` : toute ancre pointe sur des props du catalogue de son thème ;
aucun satellite n'est lui-même une ancre (pas de récursion) ; le rayon maximal
reste sous `CELL` (200 px), sinon une grappe déborde de la cellule qui l'a tirée
et devient non déterministe au bord de fenêtre.

---

# 4. FONDS ET SILHOUETTES

## 4.1 L'état

`FOND = { espace, ville }`. Deux recettes, trois couches chacune (loin /
séparation / près). **Trois thèmes sur cinq n'ont pas d'horizon du tout.**

`verifierFonds` et `verifierBaies` croisent déjà les tables dans les deux sens :
ajouter une recette est une entrée, pas une refonte.

## 4.2 Trois recettes de fond neuves

| `fond` | thème | `loin` | `sep` | `pres` |
|---|---|---|---|---|
| `espace` | Nébuleuse | nébuleuse lointaine | gaz | étoiles | *(existe)* |
| `ville` | Secteur | toits vus d'en haut | smog | circulation | *(existe)* |
| **`complexe`** | Usine | halles et sheds, ligne d'horizon dentelée | vapeur d'évent | fumées lentes de cheminée |
| **`aciérie`** | Fonderie | hauts fourneaux, tours de refroidissement | poussière chaude | lueur pulsée des coulées lointaines |
| **`friche`** | Friche | silhouettes cassées, pylônes, une cheminée | brume basse | oiseaux, papiers portés par le vent |

Les trois nouvelles suivent le même contrat que les deux existantes : cuites une
fois, blittées avec trois dérives différentes, `FOND_MARGE = 300`.

**Le fond ne se voit pas partout.** Sur les thèmes terrestres il n'apparaît que
par les **ouvertures** : une baie de toit, une brèche dans un mur, le bout d'une
allée. `VITRAGE` (déjà une table) déclare l'habillage : `verre` pour l'espace,
`caillebotis` pour la ville, et pour les trois neufs `lanterneau` (usine),
`evacuation` (fonderie), `dechirure` (friche).

## 4.3 Le repère de quartier — la vraie réponse aux silhouettes

`drawAmer()` pose aujourd'hui **un** point remarquable par arène, tiré par graine
et écarté des dangers, sans collider, sous la grille de 20 m, avec son
vérificateur (`verifierAmers`).

**Proposition : un repère par quartier, donc par biome.** Cinq au lieu d'un, sur
la même machinerie, avec la même garde.

C'est la meilleure réponse du plan à « le joueur doit voir qu'il est dans une
vraie zone » :

- il donne à chaque biome sa **signature visible de loin** — la grue de casse, le
  terril, le portique, l'anneau d'amarrage, la palissade publicitaire ;
- il coûte une entrée par biome dans `AMERS`, une fonction de dessin, rien
  d'autre ;
- il **sert d'orientation** : cinq points fixes sur une arène de 14400 × 8100
  transforment la carte en territoire. Aujourd'hui rien ne permet de savoir où
  l'on est.

Contraintes reconduites, non négociables : **plaqué au sol, sans collider** — un
grand objet qui aurait du volume ferait voir une masse là où le pathfinding voit
du vide ; il passe sous la grille de 20 m ; il n'émet pas de lumière ;
`verifierAmers` refuse qu'il tombe sur un danger, et l'étend à « refuse que deux
repères soient à moins d'une vue l'un de l'autre ».

## 4.4 Le plan haut

Trois biomes en ont besoin (U12 étuve, N06 ferme, S06 docks, S11 sous-station,
F12 pont roulant). Le champ `hors` de `BLOC` existe déjà pour « ce qui sort de
l'empreinte » ; il suffit de l'autoriser à sortir **beaucoup**, avec deux règles :

1. ce qui est en haut **ne bloque rien** et n'est **jamais** dessiné par-dessus une
   entité — il est peint avant les corps, jamais après ;
2. son ombre passe par `drawOmbre` et par `lumDir()`, comme tout le reste. Deux
   ombres qui divergent sur un même écran est le défaut visible d'un rendu 2D, et
   il n'y a pas de second endroit où l'écrire.
