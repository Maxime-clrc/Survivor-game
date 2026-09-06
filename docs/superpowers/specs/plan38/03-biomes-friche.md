# FRICHE — 13 biomes

**Le monde** : un ancien monde industriel abandonné. Récupération, ruine,
végétation invasive, pollution, matériaux dégradés. **Rien n'éclaire** — c'est la
seule ambiante plate du dépôt (`k = 0.62`), et c'est ce qui rend le thème lisible
au premier coup d'œil.

**Ce qui reste vrai partout** : la palette `#1b1a13` / `#5c5f55` / ambre sourd ·
la tuile `friche` (dalles, joints de coulage irréguliers, pas de maille
technique) · le tremblement de position par cellule (`j = 40`) · l'étendue de
calibre la plus large des cinq thèmes.

**Interdits** : espace, architecture futuriste propre, jungle tropicale, désert,
usine neuve, ville habitée. La friche est **habitée par personne**.

**La friche a un second axe d'identité que les autres thèmes n'ont pas : ce que
le lieu ÉTAIT.** C'est cet axe qu'on exploite ci-dessous, et il donne à lui seul
treize zones qui ne se confondent pas.

---

### R01 · Le champ — `champ` — **P0, existe** (`OBSTACLES.friche[0]`)

**Composition** — `SEMIS` épars, deux champs de ruines et du terrain nu.
**Obstacles** — `ruine`, `mur`, `carcasse` (trois formats à surface égale).
**Gameplay** — la référence. Beaucoup d'espace, des couvertures ponctuelles.

---

### R02 · Le mur — `mur` — **P0, existe** (`OBSTACLES.friche[1]`)

**Composition** — `LINEAIRE`. Une longue ruine avec **plusieurs** brèches larges :
une seule ferait un goulot, et un goulot détruit le kite.

---

### R03 · Le cratère — `cratere` — **P0, existe** (`OBSTACLES.friche[2]`)

**Composition** — `POURTOUR`. Vide au centre, dense au pourtour — l'inverse de la
loi du thème. On y combat au milieu, dos à rien.

---

### R04 · L'effondrement — `effondrement` — **P0, existe** (`OBSTACLES.friche[3]`)

**Composition** — `SEMIS` à contraste maximal. La variante sans règle apparente,
donc dont la règle est le contraste.

---

### R05 · La cour de ferraille — `ferraille` — **P1**

> **Ce que c'était.** Une casse automobile. Récupération, démontage, compactage.
> Abandonnée depuis assez longtemps pour que les piles se soient tassées.

**Architecture** — de grandes zones ouvertes cernées de **piles d'épaves** ; des
clôtures grillagées en lambeaux ; un petit bâtiment administratif effondré ; les
anciennes voies de circulation encore lisibles au sol.
**Composition** — `POURTOUR`. Une grande aire centrale, des amas périphériques,
deux ou trois passages étroits entre les amas.
**Obstacles** — `pile d'épaves` (**nouveau**, système `EMPILEMENT` : haute,
irrégulière, silhouette dentelée qui remplit son AABB) · `epave` (système
`VEHICULE`, 4 sous-types : couchée, sur le toit, en travers, écrasée) ·
`compacteur` (**nouveau**, masse machine) · `barriere` (système `MUR`, basse et
percée).
**Props** — pneu (nouveau, micro, en tas), jante, batterie, câble, bidon,
carcasse, **moteur déposé** (nouveau), palette.
**Sol** — asphalte fissuré, taches d'huile anciennes, graviers, mauvaises herbes
dans les fissures, éclats de verre (micro, réfléchissants — le seul micro-prop du
thème qui accroche la lumière).
**Silhouette** — la **montagne de carcasses** au fond, plus un vieux pont roulant
de casse, bras baissé. C'est la signature du biome et elle est visible de trois
quartiers de distance.
**Vertical** — la pile d'épaves est le seul objet haut de la friche.
**Gameplay** — forte lisibilité, aire centrale favorable aux armes à distance,
amas périphériques qui servent de couverture et de piège. Les passages entre amas
sont à `2 × PASSAGE_MIN` — assez pour éviter le bouchon, assez étroits pour
compter. Les épaves au sol sont des obstacles bas et isolés : elles cassent la
ligne de tir sans arrêter la course.
**Assets** — nouveaux : pile d'épaves, épave ×4, compacteur, barrière, pneu,
moteur.

---

### R06 · Le faisceau — `faisceau` — **P1**

> **Ce que c'était.** L'embranchement ferroviaire de l'usine. Voies de garage,
> wagons oubliés, un quai de déchargement, un heurtoir en bout.

**Architecture** — des **voies parallèles**, très longues, matérialisées au sol,
avec des wagons dessus. Le bâti est **linéaire et orienté** : c'est le seul biome
de la friche qui ait une direction.
**Composition** — `COULOIRS` naturels entre les rames. Trois passages à niveau
coupent les voies.
**Obstacles** — `wagon` (**nouveau**, système `VEHICULE`, 3 sous-types : tombereau,
citerne, plat — le plat est **franchissable visuellement mais bloquant**, donc à
éviter ; on le rend bas et clairement plein) · `quai` (mutualisé U06, habillage
friche) · `heurtoir` (**nouveau**, petit, en bout de voie) · `mur`.
**Props** — rail (mutualisé nébuleuse, habillage friche), traverse (nouveau,
micro), ballast (micro), brousse entre les voies, jonchée, panneau.
**Sol** — ballast, rails, roulage impossible : ici on ne roule pas, on **suit**.
Végétation systématique entre les traverses.
**Silhouette** — la perspective des voies, et un pont-rail au fond.
**Gameplay** — le biome le plus **directionnel** du thème. Les rames forment des
couloirs longs : les armes perçantes y donnent leur maximum, mais on ne peut pas
esquiver latéralement sans les traverser. Les passages à niveau sont les seuls
points de bascule — trois minimum.
**Signature** — une rame de wagons, alignée jusqu'à l'horizon.
**Assets** — nouveaux : wagon ×3, heurtoir, traverse, ballast.

---

### R07 · Le parking — `parking` — **P1**

> **Ce que c'était.** Le parking du personnel. Marquage encore lisible, quelques
> véhicules jamais repris, des lampadaires tombés.

**Architecture** — presque **rien de bâti**. Une grande dalle plate, un marquage
au sol régulier, des véhicules épars, des lampadaires couchés. C'est le biome le
plus vide des 61, et son identité vient entièrement du **sol** et du **semis**.
**Composition** — `DEGAGE`. Deux ou trois masses seulement.
**Obstacles** — `epave` (système `VEHICULE`, en rangées régulières — l'ordre du
marquage survit à l'abandon) · `lampadaire` (**nouveau**, système `MAT`, **couché**
donc long et fin, à plat au sol) · `abri` (**nouveau**, auvent effondré).
**Props** — marquage (le plus dense du jeu), brousse dans les fissures, jonchée,
panneau, **caddie** (nouveau, micro), verre.
**Sol** — asphalte, marquage blanc délavé, fissures **avec végétation dedans**,
taches d'huile aux emplacements.
**Silhouette** — la ligne des lampadaires, dont un sur trois est encore debout.
**Gameplay** — la plus grande surface dégagée de la friche. Aucune couverture
fiable : c'est le biome où l'équipe doit tenir par le mouvement et non par la
géométrie. Contrepoids exact de R09 et R13.
**Signature** — le marquage régulier sous la végétation. L'ordre humain visible
sous l'abandon — c'est la phrase de tout le thème, en une image.
**Assets** — nouveaux : lampadaire couché, auvent, caddie. Réutilise `epave`.

---

### R08 · Le chantier interrompu — `chantier` — **P2**

> **Ce que c'était.** Une extension jamais finie. La dalle est coulée, les
> coffrages sont encore en place, la grue n'a jamais été démontée.

**Architecture** — une **trame régulière** de poteaux de béton et de plots, sur
une dalle propre. Le seul endroit de la friche où la géométrie est **neuve** —
c'est ce qui rend le lieu troublant, et c'est voulu : il n'a jamais servi.
**Composition** — `GRILLE` de poteaux + `MASSE` (la base de grue).
**Obstacles** — `poteau` (système `MAT`, petit, régulier) · `bloc de béton`
(**nouveau**, système `EMPILEMENT` : plots empilés, `hp`) · `coffrage`
(**nouveau**, système `OSSATURE`) · `mur` (voiles non finis).
**Props** — palette, **ferraillage** (nouveau, micro), sac de ciment, bidon,
brousse rare, bâche.
**Sol** — béton **propre**, poussière de ciment, empreintes, peu de végétation.
C'est le sol le moins dégradé du thème, et c'est l'information.
**Silhouette** — la **grue**, immobile, flèche pointée. Le plus grand objet
d'horizon du thème.
**Vertical** — poteaux + grue : le biome le plus vertical de la friche.
**Gameplay** — la trame régulière de poteaux est une géométrie que le jeu n'a
nulle part : des obstacles minuscules, nombreux et parfaitement réguliers. Le
kite y est excellent (on tourne autour), la ligne de tir y est cassée en
permanence. Coût navigation à mesurer : beaucoup de petites boîtes.
**Signature** — la grue, et l'ombre de sa flèche.
**Assets** — nouveaux : bloc de béton, coffrage, ferraillage, grue (décor haut).

---

### R09 · La halle éventrée — `halle` — **P2**

> **Ce que c'était.** Un entrepôt logistique. Le toit est tombé, les poteaux
> tiennent encore, les rayonnages ont plié.

**Architecture** — un **intérieur devenu extérieur** : une enveloppe rectangulaire
partiellement debout, une trame de poteaux dedans, des rayonnages effondrés en
travers. On est à la fois dedans et dehors.
**Composition** — `POURTOUR` fermé + `GRILLE` intérieure.
**Obstacles** — `paroi` (système `MUR`, longue, percée de grandes brèches) ·
`poteau` · `rack effondré` (**nouveau** : variante couchée de `rack`, en travers,
donc un obstacle **oblique** — le seul du jeu).
**Props** — palettier renversé, caisses éclatées, jonchée, brousse au pied des
murs, tube mort, câble pendant.
**Sol** — dalle industrielle, gravats de toiture en bandes régulières (là où les
pannes sont tombées), végétation le long des murs seulement — la lumière n'entre
que par les bords.
**Silhouette** — l'ossature de charpente nue contre le ciel.
**Gameplay** — un espace clos avec des brèches : le seul biome de la friche qui
ait une **enceinte**. La horde entre par des points connus. C'est la composition
la plus « défendable » du thème, donc précieuse pour les contrats de défense.
Les brèches sont au minimum quatre, jamais deux.
**Signature** — les bandes de gravats parallèles au sol, dessinant la charpente
absente.
**Assets** — nouveaux : rack effondré (variante), charpente (décor haut).

---

### R10 · La friche verte — `verte` — **P1**

> **Ce que c'est.** L'endroit où la végétation a gagné. Le bâti est encore là,
> mais il est en dessous.

**Architecture** — des **masses molles** : les ruines sont couvertes, donc leur
silhouette est arrondie et irrégulière. C'est le seul biome où la végétation est
**bloquante** et non décorative.
**Composition** — `POCHES`. Des clairières reliées par des passages entre les
massifs.
**Obstacles** — `massif` (**nouveau**, système `TAS` : une ruine sous végétation,
silhouette organique, remplit son AABB) · `ruine` (variante couverte) · `arbre`
(**nouveau**, système `MAT` : petite emprise, haute silhouette).
**Props** — brousse ×5 (le taux le plus fort du jeu), **ronce** (nouveau),
**souche** (nouveau), jonchée, grillage pris dans la végétation.
**Sol** — terre, herbe, dalle **par plaques** — le béton n'apparaît que là où
rien ne pousse, et cette alternance est la lecture du biome.
**Accent** — le seul accent **vert** du dépôt : `PROP.vert` monte en dominante,
`arena` tiré de 12 % vers l'olive. Borné : la friche reste grise, elle verdit.
**Silhouette** — une ligne d'arbres irrégulière, et une cheminée qui dépasse.
**Gameplay** — les massifs sont de grosses couvertures aux contours flous : on ne
sait pas exactement où le collider s'arrête, ce qui est un **défaut**. Correctif :
la silhouette reste franche à 8 px près de l'AABB, la souplesse est dans la
texture, pas dans la forme. Circulation en poches : combats courts et rapprochés.
**Signature** — le vert. Aucun autre biome du jeu n'en a autant.
**Assets** — nouveaux : massif, arbre, ronce, souche.

---

### R11 · Le bassin — `bassin` — **P2**

> **Ce que c'était.** Le bassin de rétention des eaux industrielles. Il ne se vide
> plus. Les berges se sont éboulées.

**Architecture** — une **cuvette** : une grande bordure bloquante, un fond
inaccessible, des berges en pente couvertes de boue. Autour, des ouvrages
techniques : vannes, déversoirs, une passerelle.
**Composition** — `MASSE` creuse décentrée + `POURTOUR`.
**Obstacles** — `bac` (mutualisé U08/F09, habillage friche : le bassin lui-même) ·
`vanne` (**nouveau**, petit ouvrage) · `mur` (les murets de berge).
**Props** — bidon, tuyau, **flotteur** (nouveau, micro), brousse de bord d'eau,
jonchée, **roseau** (nouveau).
**Sol** — boue, ruissellement, souillure, corrosion. Le sol le plus **mouillé** de
la friche.
**Danger** — `HZ_SLIP` (boue) doublé, `HZ_POOL` (flaque toxique) doublé,
`HZ_GEYSER` absent.
**Silhouette** — la ligne de berge, et un déversoir en béton.
**Gameplay** — une grande masse infranchissable au milieu, donc une circulation
**annulaire** forcée : on tourne autour du bassin, la horde aussi, et les deux
arrivent par le côté opposé. C'est la seule géométrie annulaire du jeu, et c'est
un vrai levier de kite.
**Signature** — l'eau immobile, plus sombre que tout.
**Assets** — nouveaux : vanne, flotteur, roseau. Réutilise `bac`.

---

### R12 · Le dépôt de fûts — `depot` — **P2**

> **Ce que c'était.** Un stockage de produits chimiques. Personne n'est venu les
> reprendre. Le périmètre est encore balisé.

**Architecture** — des **rangées de fûts** empilés sur palettes, sous des bâches
déchirées, à l'intérieur d'un périmètre balisé. La régularité de la rangée
contraste avec le désordre du reste de la friche.
**Composition** — `COULOIRS` courts + `SEMIS`.
**Obstacles** — `pile de fûts` (système `EMPILEMENT`, `hp` — on peut la faire
tomber, ce qui **crée une flaque toxique** : premier obstacle du jeu dont la
destruction pose un danger) · `barriere` · `abri` (bâche sur ossature).
**Props** — bidon ×4, bâche, panneau d'avertissement (le seul prop **lisible**
du thème : un pictogramme), jonchée, **combinaison abandonnée** (nouveau, micro).
**Sol** — souillure chimique très marquée, cernes de couleur, végétation
**absente** en cercles — le sol est mort par plaques, et c'est visible.
**Accent** — le seul accent **acide** de la friche : un vert-jaune de contamination
en dominante secondaire. Borné, et il ne touche pas `bloc`.
**Danger** — `HZ_POOL` triplé. Le biome le plus dangereux du thème.
**Gameplay** — un biome où **la géométrie change en jouant** : détruire une pile
ouvre un passage et pose une flaque. C'est le seul endroit du jeu où le joueur
crée un danger, et il faut le mesurer avant de le garder (risque : l'équipe se
tue elle-même sans comprendre).
**Signature** — les cercles de sol mort.
**Assets** — nouveaux : pile de fûts, combinaison. Réutilise barrière, abri, bâche.

---

### R13 · La cité — `cite` — **P3** *(résidentiel)*

> **Ce que c'était.** Le logement ouvrier au pied de l'usine. Deux rangées de
> petits bâtiments bas, une rue entre les deux, des jardins repris par la ronce.

**Architecture** — des **blocs bas alignés**, séparés par des ruelles régulières
perpendiculaires à une rue centrale. C'est la seule architecture **habitée** de la
friche, et donc la seule qui ait des ouvertures à hauteur d'homme.
**Composition** — `GRILLE` de blocs + un `AXE` central.
**Obstacles** — `bloc d'habitation` (**nouveau** : rectangle plein, portes et
fenêtres dans l'habillage, jamais franchissable — la lisibilité prime) · `mur` de
jardin (bas, percé) · `epave` dans la rue.
**Props** — jonchée, brousse de jardin, **linge** (nouveau, micro : une corde
tendue entre deux façades), **mobilier** (nouveau), tube, panneau.
**Sol** — pavés, trottoirs, seuils, végétation dans les jardins uniquement.
**Silhouette** — les pignons alignés, tous à la même hauteur, avec une toiture
sur quatre effondrée.
**Gameplay** — un réseau de ruelles courtes et régulières : circulation en
labyrinthe **prévisible**, ce qui le sépare de R10 (labyrinthe imprévisible) et
de R06 (couloirs longs). Beaucoup d'angles morts courts : les armes de zone et
les souffles y sont excellents.
**Attention** — c'est le biome le plus fermé du thème. Chaque ruelle a deux
issues, aucune impasse, et `coeurTraversable` doit passer sur les deux axes.
**Signature** — une rue. Dans une friche.
**Assets** — nouveaux : bloc d'habitation (3 gabarits), linge, mobilier.

---

## Récapitulatif FRICHE

| # | biome | compo | ouvert. | végétation | densité | priorité | bâti neuf |
|---|---|---|---|---|---|---|---|
| R01 | le champ | SEMIS | moy | moy | 0,78 | P0 | — |
| R02 | le mur | LINEAIRE | moy | moy | 0,85 | P0 | — |
| R03 | le cratère | POURTOUR | basse | moy | 0,90 | P0 | — |
| R04 | l'effondrement | SEMIS | basse | moy | 1,00 | P0 | — |
| R05 | la cour de ferraille | POURTOUR | haute | faible | 0,95 | **P1** | pile, épave, compacteur |
| R06 | le faisceau | COULOIRS | basse | **forte** | 0,80 | **P1** | wagon, heurtoir |
| R07 | le parking | DEGAGE | **très h.** | moy | 0,45 | **P1** | lampadaire, auvent |
| R08 | le chantier | GRILLE | moy | **nulle** | 1,10 | P2 | bloc béton, coffrage |
| R09 | la halle éventrée | POURTOUR | basse | faible | 1,05 | P2 | rack effondré |
| R10 | la friche verte | POCHES | basse | **maximale** | 1,20 | **P1** | massif, arbre |
| R11 | le bassin | MASSE | moy | moy | 0,70 | P2 | vanne |
| R12 | le dépôt de fûts | COULOIRS | moy | faible | 1,15 | P2 | pile de fûts |
| R13 | la cité | GRILLE | **très b.** | moy | 1,25 | P3 | bloc d'habitation |

La friche porte treize biomes sans forcer parce qu'elle a deux axes au lieu d'un :
la **loi spatiale** et **ce que le lieu était**. R07 et R08 sont tous deux ouverts
et réguliers, mais l'un est mort et couvert de marquage, l'autre est neuf et
jamais utilisé.
