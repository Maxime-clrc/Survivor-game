# NÉBULEUSE — 12 biomes

**Le monde** : une infrastructure orbitale abandonnée, à la dérive dans un nuage
de gaz. Pas de gravité, pas de poussière, pas de haut ni de bas — ce qui marque
une coque est ce qui l'a **heurtée**.

**Ce qui reste vrai partout** : la palette `#06080f` / `#38455f` / cyan
`#7fd0e8` · la seule ambiante froide et la plus profonde (`k = 0.70`) · le fond
`espace` en trois couches (loin / gaz / étoiles) · les baies pleines (verre) qui
ouvrent sur le vide · le contraste de taille extrême · **aucun emprunt terrestre**.

**Interdits** : quincaillerie industrielle terrestre (tuyaux, caillebotis,
câbles au sol), poussière, végétation non gelée, sol qui pourrit.

**L'axe d'identité du thème est la FONCTION orbitale.** Aujourd'hui les quatre
variantes sont quatre tailles de cailloux ; ci-dessous, chaque biome est une
installation qui servait à quelque chose.

---

### N01 · La dérive — `derive` — **P0, existe** (`OBSTACLES.nebuleuse[0]`)

**Composition** — `SEMIS` à contraste maximal. Deux masses en diagonale, deux
travées à l'aplomb des bords, des éclats. Le centre reste vide.

---

### N02 · Le champ d'épaves — `epaves` — **P0, existe** (`OBSTACLES.nebuleuse[1]`)

**Composition** — `SEMIS` de petits éclats. Rien ne cache, tout accroche : on voit
la horde arriver de partout et on ne peut jamais s'en couper.

---

### N03 · Les grands fragments — `fragments` — **P0, existe** (`OBSTACLES.nebuleuse[2]`)

**Composition** — `MASSE` ×3, très espacées. Chaque contournement est long : on
perd la horde de vue et elle réapparaît d'un côté qu'on a quitté.

---

### N04 · La brèche — `breche` — **P0, existe** (`OBSTACLES.nebuleuse[3]`)

**Composition** — `POURTOUR` **asymétrique** : le bâti sur un bord, l'autre ouvert
sur le vide. Le miroir de cellule en fait une loi qui change de côté d'une région
à l'autre, sans table supplémentaire.

---

### N05 · L'anneau d'amarrage — `amarrage` — **P1**

> **Ce que c'était.** La couronne d'accostage de la station. Bras d'amarrage
> radiaux, sas, passerelles rétractables. Ce qui recevait les vaisseaux.

**Architecture** — **radiale**. Des bras longs et fins rayonnant depuis un moyeu
central. C'est la seule architecture non orthogonale et non aléatoire du thème :
une géométrie **construite** et **circulaire**.
**Composition** — `MASSE` centrale + rayons. Circulation obligatoirement
tangentielle ou radiale, jamais diagonale.
**Obstacles** — `moyeu` (**nouveau**, masse centrale octogonale) · `bras`
(**nouveau** : variante orientée de `travee`, disposée en rayons à 45°) ·
`sas` (**nouveau**, petit, aux extrémités des bras).
**Props** — ancrage ×4, balise ×2, rail, module, **cordon d'amarrage** (nouveau).
**Sol** — rayures d'accostage rayonnantes, marquage d'approche, **aucun débris**
au centre : l'aire est dégagée parce qu'elle devait l'être.
**Silhouette** — la couronne complète, vue en biais, avec un vaisseau encore
amarré à un bras.
**Gameplay** — géométrie **radiale** unique dans le jeu : les rayons créent des
secteurs, et passer d'un secteur à l'autre demande de revenir au centre ou de
faire le tour par l'extérieur. C'est un vrai levier de kite, et un vrai piège
pour un joueur isolé. Les rayons sont espacés de `3 × PASSAGE_MIN` à mi-longueur.
**Signature** — la géométrie radiale. Rien d'autre dans le jeu n'a de rayons.
**Assets** — nouveaux : moyeu, bras radial, sas, cordon.

---

### N06 · La ferme énergétique — `ferme` — **P1**

> **Ce que c'était.** Les panneaux solaires de la station. Des surfaces immenses,
> plates, orientées, sur des mâts fins.

**Architecture** — de **grandes surfaces planes**, très larges, très minces, toutes
inclinées dans le même sens, portées par des mâts à petite emprise. Le bloc a une
**très grande silhouette** et une **très petite empreinte** — c'est la seule
famille du jeu où les deux divergent à ce point, et c'est ce qui fait tout.
**Composition** — `GRILLE` de mâts sous un plafond de panneaux.
**Obstacles** — `mat de voile` (système `MAT`, emprise minimale) · `panneau`
(**nouveau** : le panneau lui-même est **au-dessus** du plan de jeu, donc **non
bloquant** — il n'existe que par son ombre portée et par ce qu'il masque du fond).
**Props** — voile ×4, givre, cristal, balise, **cellule photovoltaïque brisée**
(nouveau, micro).
**Sol** — l'ombre des panneaux **est** la matière du sol : des bandes régulières
sombres qui balaient lentement. C'est la seule « trace » animée du jeu, et elle
est continue et périodique, donc jamais un télégraphe.
**Silhouette** — les panneaux à contre-jour, la seule fois où le thème a un
contre-jour.
**Gameplay** — le sol le plus **lisible** de la Nébuleuse (peu de blocs, tous
minuscules) avec la vue la plus **encombrée** (le plafond). Les ombres ne changent
rien au gameplay et beaucoup à la lecture — à surveiller : elles ne doivent
jamais assombrir une entité, seulement le sol.
**Signature** — les bandes d'ombre qui balaient.
**Assets** — nouveaux : mât de voile, panneau (décor haut + ombre), cellule brisée.

---

### N07 · La cale sèche — `cale` — **P1**

> **Ce que c'était.** Le chantier orbital. Une carcasse de vaisseau en
> construction, prise dans une ossature d'échafaudages.

**Architecture** — **une** structure gigantesque, unique, occupant la moitié de la
région, entourée d'une ossature fine. C'est le plus grand objet du jeu, et il est
le biome à lui seul.
**Composition** — `MASSE` traversante. Un objet, et l'espace autour.
**Obstacles** — `quille` (**nouveau** : la plus grande AABB du jeu, une masse
longue traversant plusieurs cellules — nécessite un `poser` **inter-cellules**,
voir `08-architecture-technique.md`) · `echafaudage` (mutualisé F11) · `fragment`.
**Props** — module ×3, ancrage, rail, **plaque de bordé** (nouveau), **soudeuse
inerte** (nouveau, émissive faible).
**Sol** — rayures d'outillage, éclats, rien de naturel : c'est un atelier.
**Silhouette** — la carcasse, nervures apparentes, contre le gaz.
**Gameplay** — une masse énorme = deux moitiés de région et un contournement long.
La composition la plus « lente » du jeu. Les échafaudages autour donnent une
couverture fine et perméable, ce que le thème n'a nulle part ailleurs.
**Attention** — un obstacle plus grand qu'une cellule casse l'hypothèse actuelle
de `buildBiome` (tout `poser` est fractionnaire dans **une** cellule). C'est le
seul biome des 61 qui demande une extension du modèle, et il faut décider s'il
vaut ce coût. Alternative sans extension : trois blocs bord à bord, alignés par
la table, ce que la Friche fait déjà avec ses tronçons de mur.
**Signature** — les nervures.
**Assets** — nouveaux : quille, plaque de bordé, soudeuse.

---

### N08 · Le module d'habitation — `habitat` — **P2**

> **Ce que c'était.** Les quartiers d'équipage. Dépressurisés. Des cloisons, des
> coursives, des hublots, et tout ce qui n'était pas fixé est parti.

**Architecture** — des **cloisons continues** formant des coursives régulières.
C'est le seul biome **intérieur** du thème, donc le seul où l'on ne voie pas le
vide en permanence — et c'est ce qui le rend saisissant quand une baie s'ouvre.
**Composition** — `COULOIRS` en réseau, avec quatre élargissements.
**Obstacles** — `cloison` (**nouveau**, système `MUR`, avec des ouvertures de
sas) · `module` (mutualisé prop → bloc) · `mobilier fixé` (**nouveau**, petit).
**Props** — module, givre ×3, **casier** (nouveau), **effet personnel** (nouveau,
micro : ce qui flotte encore), balise.
**Sol** — givre en plaques, rayures, **traces de décompression** : des marques
radiales convergeant vers une brèche. Le sol raconte l'accident.
**Baies** — c'est le biome où le vitrage compte le plus : les baies sont
nombreuses, petites, et chacune montre le fond. `verifierBaies` garantit déjà
qu'une baie est **pleine** ; ici elles doivent aussi être **fréquentes**.
**Gameplay** — le plus fermé du thème, et le seul labyrinthe orbital. Combat court,
angles morts, souffles efficaces. Contrepoids exact de N03 et N06.
**Signature** — un couloir, et une brèche au bout qui donne sur les étoiles.
**Assets** — nouveaux : cloison, mobilier fixé, casier, effet personnel.

---

### N09 · La serre — `serre` — **P2**

> **Ce que c'était.** L'anneau agricole. Hydroponie sous verrière. Le chauffage a
> lâché ; tout a gelé en place.

**Architecture** — de **longues verrières** basses et parallèles, avec des bacs de
culture dedans. Le seul biome du thème qui ait de la **matière organique**, et
elle est gelée — c'est ce qui l'autorise dans la DA.
**Composition** — `COULOIRS` entre les verrières.
**Obstacles** — `verriere` (**nouveau** : longue, basse, **translucide** — on voit
au travers mais on ne passe pas, ce qui est une première dans le jeu et un
risque de lisibilité. Correctif : un montant opaque tous les 40 px, franc, et
`contourDe` renforcé) · `bac` (mutualisé U08/F09/R11, habillage nébuleuse) · `travee`.
**Props** — givre ×3, cristal, **plant gelé** (nouveau), **nutriment** (nouveau),
module.
**Sol** — givre uniforme, **traces de racines mortes**, aucune poussière.
**Accent** — le seul accent **vert-glacé** du thème : `PROP.vert` désaturé, tiré
vers le cyan. Borné, et il ne touche pas `arena`.
**Silhouette** — les verrières alignées, et à travers, des masses vertes gelées.
**Gameplay** — couloirs longs avec vue latérale : on voit la horde arriver à
travers la verrière **avant** qu'elle atteigne l'ouverture. Le seul biome du jeu
qui offre une information sans offrir un passage. Excellent pour les armes de
préparation (mines, tourelles, zones).
**Signature** — du vert dans l'espace, et il est mort.
**Assets** — nouveaux : verrière (translucide), plant gelé, nutriment.

---

### N10 · Le champ d'astéroïdes — `asteroides` — **P2**

> **Ce que c'est.** De la roche. Pas du métal. Ancrée par un filet de câbles
> d'arrimage à une ancienne opération minière.

**Architecture** — des **masses rocheuses** de toutes tailles, sans arête droite,
avec des points d'ancrage plantés dedans. Le seul biome du thème sans métal
dominant.
**Composition** — `SEMIS` au contraste le plus élevé des 61 biomes (rapport
max/min sur la surface).
**Obstacles** — `roche` (**nouveau**, système `TAS`, silhouette irrégulière) ·
`ancrage lourd` (**nouveau**, petit, planté) · `debris`.
**Props** — cristal ×3, ancrage ×2, givre, **filon** (nouveau, émissif faible),
**foreuse abandonnée** (nouveau).
**Sol** — régolithe, rayures d'extraction, éclats. Pas de trace organique.
**Accent** — le plus **minéral** : `bloc` tiré vers un gris-brun, `emis` réduit.
Borne basse de l'enveloppe Nébuleuse.
**Silhouette** — des masses rocheuses en suspension, à trois profondeurs.
**Gameplay** — contraste de taille maximal : de très grosses couvertures et des
cailloux qu'on frôle. Le biome où la lecture de la géométrie demande le plus
d'attention. Attention aux abris parfaits : deux roches proches créent une fente
— écart minimal `2 × PASSAGE_MIN`, vérifié sur 50 graines.
**Signature** — la roche. Aucun autre biome spatial n'en a.
**Assets** — nouveaux : roche, ancrage lourd, filon, foreuse.

---

### N11 · Le cimetière de coques — `cimetiere` — **P3**

> **Ce que c'était.** Une aire de désarmement. Des épaves **rangées**, alignées par
> un remorqueur, en attente d'être découpées. Personne n'est venu.

**Architecture** — des épaves **alignées et parallèles**, toutes dans le même sens,
espacées régulièrement. L'ordre au milieu du désordre — c'est la même idée que le
parking de la Friche, transposée, et c'est ce qui les rend cousins sans les
confondre : ici les objets sont énormes.
**Composition** — `COULOIRS` très larges entre les coques.
**Obstacles** — `coque` (**nouveau** : très grande, allongée, silhouette de
vaisseau — trois sous-types : cargo, remorqueur, patrouilleur) · `travee` ·
`debris`.
**Props** — épave ×3, module, ancrage, rail, plaque de bordé.
**Sol** — rayures de remorquage **parallèles**, marquage d'aire, débris alignés.
**Silhouette** — la file de coques, s'enfonçant dans le gaz.
**Gameplay** — des couloirs très larges bordés de masses énormes : le kite y est
excellent en longueur, impossible en travers. Lignes de vue longues dans un axe,
nulles dans l'autre — la lecture la plus **anisotrope** du jeu.
**Signature** — la file. Vue depuis un bout, elle fuit.
**Assets** — nouveaux : coque ×3.

---

### N12 · Le collecteur — `collecteur` — **P3** *(le seul « étranger »)*

> **Ce que c'est.** Une structure qui n'a pas été construite par les mêmes mains.
> Géométrie non orthogonale, matériau qui ne rouille pas, symétrie inhabituelle.
> La station s'est arrimée dessus, pas l'inverse.

**Architecture** — des formes **hexagonales et concentriques**, une symétrie
d'ordre 6 (là où tout le reste du jeu est en 4), et des surfaces sans jointure.
`material.js` a déjà la maille hexagonale (`HEX = 50`, `cellule`) pour la
Nébuleuse : le biome la **remonte au niveau du bâti**, ce qui la justifie enfin.
**Composition** — `POCHES` concentriques.
**Obstacles** — `hexagone` (**nouveau**, système `PRISME` : silhouette hexagonale
remplissant son AABB, plusieurs tailles emboîtées) · `arche` (**nouveau**, non
orthogonale) · `fragment` (des morceaux de la station humaine, encastrés).
**Props** — cristal ×4, **glyphe** (nouveau, émissif : le seul motif **lisible**
du thème), givre, module humain incongru.
**Sol** — la maille hexagonale, sans usure, **sans trace** : rien ne l'a marquée.
C'est la seule cellule des 61 biomes qui n'ait aucune trace au sol, et c'est
l'information.
**Accent** — le seul accent **violet** du dépôt, borné et **très** contenu : il ne
touche que `emis`, jamais `arena` ni `bloc`. Sans quoi le biome sortirait du
thème, ce que la matrice refuserait.
**Silhouette** — une arche, immense, qui ne repose sur rien.
**Gameplay** — la symétrie hexagonale change les angles de contournement (60° au
lieu de 90°) : la horde y trouve des trajectoires que le joueur ne prévoit pas
tout de suite. Effet réel et léger, exactement le niveau demandé.
**Attention** — c'est le biome le plus risqué du plan sur le plan de la cohérence
de thème. Il tient **uniquement** si la palette, la matière de sol et le fond
restent ceux de la Nébuleuse, et si un seul canal (l'émissif) dévie. Si la
matrice le fait sortir de l'enveloppe, il faut le retirer, pas l'assouplir.
**Signature** — l'hexagone, et l'absence totale d'usure.
**Assets** — nouveaux : hexagone (système `PRISME`), arche, glyphe.

---

## Récapitulatif NÉBULEUSE

| # | biome | compo | ouvert. | contraste | densité | priorité | bâti neuf |
|---|---|---|---|---|---|---|---|
| N01 | la dérive | SEMIS | haute | **max** | 0,62 | P0 | — |
| N02 | le champ d'épaves | SEMIS | moy | bas | 0,80 | P0 | — |
| N03 | les grands fragments | MASSE | haute | haut | 0,45 | P0 | — |
| N04 | la brèche | POURTOUR | moy | haut | 0,70 | P0 | — |
| N05 | l'anneau d'amarrage | MASSE+rayons | moy | haut | 0,75 | **P1** | moyeu, bras, sas |
| N06 | la ferme énergétique | GRILLE | **très h.** | bas | 0,55 | **P1** | mât, panneau |
| N07 | la cale sèche | MASSE | basse | **max** | 0,50 | **P1** | quille |
| N08 | le module d'habitation | COULOIRS | **très b.** | bas | 1,10 | P2 | cloison, casier |
| N09 | la serre | COULOIRS | basse | moy | 0,90 | P2 | verrière |
| N10 | le champ d'astéroïdes | SEMIS | moy | **max** | 0,85 | P2 | roche, ancrage lourd |
| N11 | le cimetière de coques | COULOIRS | moy | haut | 0,60 | P3 | coque ×3 |
| N12 | le collecteur | POCHES | basse | moy | 0,95 | P3 | hexagone, arche |

Trois biomes partagent `SEMIS` (N01, N02, N10) : ils sont séparés par le contraste
(max / bas / max), la matière (métal / métal / roche) et la densité. Trois
partagent `COULOIRS` (N08, N09, N11) : fermé-opaque / fermé-translucide /
ouvert-très large. Aucun doublon ne survit à la matrice.
