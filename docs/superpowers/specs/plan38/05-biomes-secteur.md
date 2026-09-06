# SECTEUR — 12 biomes

**Le monde** : un pont logistique urbain posé au-dessus d'une mégalopole. Rues
trempées, néons, passerelles, caillebotis qui donnent sur la ville trente étages
plus bas. **Le seul lieu habité** — les quatre autres *font* quelque chose, celui-ci
*s'adresse à vous*.

**Ce qui reste vrai partout** : le magenta `#ff3d9a` et le cyan `#4de0ff` comme
seuls saturés, et **toujours au niveau du joueur** · la lumière presque
horizontale `[0.86, 0.51]` (une rue est éclairée par ses murs) · `k` le plus bas
des cinq (le mouillé renvoie la lumière) · le fond `ville` en trois couches
(toits / smog / circulation), **jamais de néon dedans** · l'eau, qui autorise le
néon à exister deux fois, en l'air et par terre.

**L'axe d'identité du thème est le QUARTIER.** Une mégalopole a des quartiers
riches et pauvres, commerçants et techniques, et c'est exactement le registre que
les quatre variantes actuelles n'exploitent pas.

---

### S01 · L'artère — `artere` — **P0, existe** (`OBSTACLES.secteur[0]`, « la rue »)

**Composition** — `AXES`. Les devantures bordent deux axes, la chaussée reste
franche au milieu. C'est ce que le mot « rue » veut dire, et c'est ce qui donne
une ligne de fuite que la Fonderie n'a pas.

---

### S02 · La place — `place` — **P0, existe** (`OBSTACLES.secteur[1]`)

**Composition** — `POURTOUR`. Ouvert au centre, encombré au pourtour. On tient le
milieu, la horde arrive par les angles.

---

### S03 · Le marché — `marche` — **P0, existe** (`OBSTACLES.secteur[2]`)

**Composition** — `SEMIS` serré de petites structures. On se faufile partout, on
ne se cache nulle part.

---

### S04 · Le parvis — `parvis` — **P0, existe** (`OBSTACLES.secteur[3]`)

**Composition** — `DEGAGE`. Deux masses monumentales. La respiration du thème, et
la seule où l'on voie d'un bout à l'autre de la région.

---

### S05 · La ruelle — `ruelle` — **P1**

> **Ce que c'est.** L'arrière des blocs. Là où on sort les poubelles, où les
> groupes de clim soufflent, où l'enseigne d'en face est la seule lumière.

**Architecture** — deux **façades continues** très proches, avec des décrochements,
des escaliers de secours, des groupes de clim en saillie. Un réseau de couloirs
étroits perpendiculaires, tous connectés.
**Composition** — `COULOIRS` en réseau serré, avec quatre élargissements (les
cours intérieures).
**Obstacles** — `facade` (**nouveau**, système `MUR`, continue et décrochée) ·
`benne` (**nouveau**, système `EMPILEMENT`, `hp`) · `groupe de clim`
(**nouveau**, petit, en saillie sur la façade).
**Props** — cageot ×3, flaque ×2, grille d'air, gaine, **poubelle** (nouveau),
**affiche déchirée** (variante d'`affiche`), néon au sol.
**Sol** — ruissellement dominant, souillure, déchets. Le sol le plus **sale** du
thème, et le seul sans marquage : personne n'organise une ruelle.
**Accent** — le plus **sombre** du thème : `arena` −6 L, l'émissif ne vient que de
l'enseigne d'en face, donc **latéral**. Borne basse de l'enveloppe Secteur.
**Silhouette** — la bande de ciel entre deux façades, et l'enseigne au bout.
**Gameplay** — le biome le plus fermé du thème. Couloirs courts, angles morts,
combat de contact. Les bennes destructibles rouvrent des passages. Toute ruelle a
**deux** issues, aucune impasse, `coeurTraversable` sur les deux axes.
**Signature** — le reflet du néon dans une flaque, dans le noir.
**Assets** — nouveaux : façade, benne, groupe de clim, poubelle.

---

### S06 · Les docks — `docks` — **P1**

> **Ce que c'est.** Le quai de fret du pont. Containers empilés sur trois hauteurs,
> une grue portique, des aires de manœuvre peintes.

**Architecture** — des **piles de containers** rangées en blocs réguliers, séparées
par des allées calibrées à l'engin. Le seul quartier **ordonné** du thème.
**Composition** — `GRILLE` de blocs + `COULOIRS`.
**Obstacles** — `conteneur` (existant, **empilé** : la variante haute est neuve,
même famille) · `portique` (**nouveau**, système `OSSATURE`, jambes bloquantes,
poutre au-dessus du plan) · `remorque` (mutualisé U06).
**Props** — cageot, marquage de quai, **transtockeur** (nouveau), gaine, flaque,
plaque d'égout.
**Sol** — marquage d'aire très présent, roulage lourd, ruissellement dans les
caniveaux, souillure.
**Silhouette** — le portique, jambes écartées, poutre en travers de tout l'écran.
**Vertical** — les piles de containers : trois hauteurs visibles, la plus grande
verticalité du thème après S09.
**Gameplay** — la géométrie la plus **régulière** du Secteur : allées droites,
angles francs, tout est prévisible. C'est l'inverse exact de S05, et c'est ce qui
donne au thème son amplitude. Les allées à `2 × PASSAGE_MIN`, les blocs de
containers d'au plus 3 × 2 pour qu'aucun ne fasse mur.
**Signature** — le portique. Et l'ordre.
**Assets** — nouveaux : conteneur empilé (variante), portique, transtockeur.

---

### S07 · Le niveau P — `parking` — **P1** *(couvert)*

> **Ce que c'est.** Un niveau de stationnement du pont. Poteaux réguliers, plafond
> bas, rampes, éclairage au néon froid, marquage jaune.

**Architecture** — une **trame parfaitement régulière** de poteaux, avec un plafond
bas qui **coupe le fond** : c'est le seul biome du thème où l'on ne voie pas la
ville. Toute la lumière est locale.
**Composition** — `GRILLE` régulière, maille serrée.
**Obstacles** — `poteau` (mutualisé R08, habillage secteur) · `voiture` (système
`VEHICULE`, 4 sous-types, **rangée** dans les emplacements) · `rampe`
(**nouveau** : masse inclinée, bloquante, qui monte hors du plan).
**Props** — marquage d'emplacement (le plus dense du thème), néon au sol,
flaque, borne de recharge, **cône** (nouveau, micro), moto.
**Sol** — béton sec **par plaques** et mouillé aux bouches d'aération ; marquage
jaune ; taches d'huile. Le seul sol du Secteur qui ne soit pas mouillé partout.
**Accent** — le seul accent **froid** du thème : le magenta cède au cyan des tubes
de plafond. Borné : `emis` seulement, jamais `arena`.
**Silhouette** — **pas d'horizon**. C'est l'unique biome des 61 sans fond visible,
et c'est ce qui le rend claustrophobe.
**Gameplay** — trame régulière de petits obstacles + véhicules bas : circulation
totalement fluide, lignes de tir constamment coupées. Le meilleur biome du jeu
pour le kite en cercle, le pire pour les faisceaux.
**Signature** — la répétition des poteaux, et la ville qui a disparu.
**Assets** — nouveaux : rampe, cône. Réutilise poteau, voiture.

---

### S08 · La station — `station` — **P2**

> **Ce que c'est.** Le nœud de transit du pont. Quais, tourniquets, un hall à
> colonnes, une signalétique qui fonctionne encore.

**Architecture** — un **hall à colonnes** avec des quais linéaires de part et
d'autre et une ligne de tourniquets qui coupe l'espace en deux. C'est la seule
architecture **monumentale et symétrique** du thème.
**Composition** — `LINEAIRE` symétrique + `MASSE` (le hall).
**Obstacles** — `colonne` (système `MAT`, grosse emprise, régulière) · `tourniquet`
(**nouveau** : une rangée de petits blocs avec des **passages calibrés** — la
géométrie la plus contrainte du thème) · `devanture` (les commerces du hall).
**Props** — passage ×2, affiche ×3, distributeur, borne, **panneau d'affichage**
(nouveau, émissif, animé), plaque d'égout.
**Sol** — dallage propre, marquage de file, ruissellement aux entrées seulement.
Le sol le plus **propre** du thème.
**Silhouette** — la verrière du hall, et la ville derrière.
**Gameplay** — la ligne de tourniquets est un **filtre** : elle laisse passer les
corps un par un sans jamais fermer. C'est la figure de gameplay la plus originale
du thème, et la plus risquée — elle doit avoir au moins six passages sur la
largeur, sinon c'est un bouchon garanti. À mesurer sur 50 graines avant de la
garder.
**Signature** — la symétrie. Le Secteur n'en a nulle part ailleurs.
**Assets** — nouveaux : tourniquet, panneau d'affichage, colonne (habillage).

---

### S09 · Les cages — `cages` — **P2** *(résidentiel pauvre)*

> **Ce que c'est.** Le logement empilé. Des modules d'habitation entassés contre
> les flancs du pont, reliés par des escaliers extérieurs, des câbles, du linge.

**Architecture** — un **empilement irrégulier** de petits volumes, avec des
passages étroits entre eux et des saillies partout. La densité la plus forte des
61 biomes.
**Composition** — `POCHES` très serrées.
**Obstacles** — `cage` (**nouveau**, système `EMPILEMENT` : petits modules empilés
en désordre, silhouette dentelée) · `escalier` (**nouveau**, oblique, bloquant) ·
`facade` (mutualisé S05).
**Props** — linge (mutualisé R13, habillage secteur), parabole ×3, cageot,
**réchaud** (nouveau, émissif faible), affiche, néon au sol, poubelle.
**Sol** — ruissellement permanent, déchets, souillure. Aucun marquage.
**Accent** — chaud et sale : l'émissif tire vers l'ambre (les réchauds et les
ampoules nues) au lieu du magenta. Borné, et il ne touche pas `bloc`.
**Silhouette** — l'empilement, dentelé, contre le smog. Le plus **haut** du thème.
**Vertical** — maximal. Les paraboles et le linge occupent tout le plan haut.
**Gameplay** — le biome le plus dense et le plus fermé du jeu. Il faut vérifier
que la navigation ne s'y étrangle pas : chaque poche a **trois** sorties minimum
et l'écart entre deux cages ne descend jamais sous `2 × PASSAGE_MIN`.
**Signature** — le linge, les paraboles, et les ampoules nues.
**Assets** — nouveaux : cage, escalier, réchaud.

---

### S10 · Le viaduc — `viaduc` — **P2**

> **Ce que c'est.** Le tronçon de pont lui-même. Une plate-forme longue,
> garde-corps de chaque côté, et le vide autour. Des voies de circulation
> encore actives au-dessus.

**Architecture** — une **bande** : deux bords infranchissables (le vide), une
chaussée large, quelques ouvrages au milieu. La seule architecture du jeu où
**les bords sont l'obstacle**.
**Composition** — `LINEAIRE` bordé. Une seule direction possible.
**Obstacles** — `garde-corps` (**nouveau**, système `MUR`, continu sur deux bords,
avec des brèches — et les brèches donnent sur le vide, donc elles ne sont **pas**
des passages : premier obstacle du jeu dont une ouverture ne mène nulle part.
Correctif de lisibilité : la brèche est signalée par un marquage rouge franc au
sol, à hauteur de collider) · `pylone` · `remorque`.
**Props** — marquage d'axe, néon au sol, borne, flaque, gaine, **caténaire**
(nouveau, décor haut).
**Sol** — chaussée, marquage d'axe continu, ruissellement en caniveau, roulage.
**Silhouette** — la ville **des deux côtés**, en contrebas, et un autre tronçon de
pont parallèle au loin. La plus forte lecture de fond du jeu.
**Gameplay** — un couloir très large sans issue latérale. Le kite y est en
va-et-vient pur, ce qu'aucun autre biome n'impose. Excellent pour un boss (une
seule direction de fuite), à surveiller pour la horde (elle arrive par deux
côtés seulement, donc plus dense).
**Signature** — le vide de chaque côté.
**Assets** — nouveaux : garde-corps, caténaire.

---

### S11 · La sous-station — `sous_station` — **P3** *(technique)*

> **Ce que c'est.** Le ventre du pont. Ce qui alimente les enseignes : gaines,
> transformateurs, ventilation, grilles d'air par lesquelles monte l'air chaud.

**Architecture** — de la **machinerie** en batteries, des gaines énormes qui
traversent, des grilles au sol. Aucune enseigne : c'est le seul quartier du
Secteur qui ne vend rien, et c'est **exactement** ce qui le rend intéressant dans
un thème dont le verbe est « s'adresser à vous ».
**Composition** — `SEMIS` dense + traversées de gaines.
**Obstacles** — `armoire` (mutualisé U07, habillage secteur) · `gaine maitresse`
(**nouveau** : très longue, très grosse, traverse la cellule au-dessus du sol,
donc **non bloquante**, avec des supports au sol qui, eux, bloquent) ·
`transformateur` (mutualisé U07).
**Props** — gaine ×4, grille d'air ×3, ventilation, câble, tube, plaque d'égout.
**Sol** — caillebotis (on voit la ville dessous, comme partout dans le thème),
ruissellement, corrosion, souillure.
**Accent** — désaturé : l'émissif tombe au minimum de l'enveloppe. C'est le seul
endroit du Secteur qui soit **presque monochrome**, et il rend le retour à
l'artère spectaculaire.
**Silhouette** — les gaines qui montent et disparaissent dans le plafond du pont.
**Gameplay** — semis dense de blocs moyens avec des grandes gaines qui **passent
au-dessus** : la lecture verticale y compte plus qu'ailleurs, et le sol reste
lisible. Bonne circulation, mauvaise ligne de vue.
**Signature** — pas un seul néon.
**Assets** — nouveaux : gaine maîtresse (+ supports). Réutilise armoire, transfo.

---

### S12 · Le chantier — `chantier` — **P3**

> **Ce que c'est.** Un bloc en démolition. Le pont se refait en permanence :
> échafaudages, filets, bâches, gravats, et une palissade publicitaire tout autour.

**Architecture** — une **enceinte de palissades** couverte d'affiches, et dedans un
squelette d'échafaudage sur une masse à moitié abattue. L'intérieur et
l'extérieur sont deux compositions différentes dans le même biome — c'est le seul
qui fasse ça.
**Composition** — `POURTOUR` fermé (l'enceinte) + `MASSE` (le bloc) + `SEMIS`
(les gravats).
**Obstacles** — `palissade` (**nouveau**, système `MUR`, avec des portails —
couverte d'affiches, donc c'est la surface publicitaire la plus grande du jeu) ·
`echafaudage` (mutualisé F11/R08) · `bloc abattu` (**nouveau**, système `TAS`).
**Props** — bâche, cageot, affiche ×4 (le taux le plus fort du jeu), gravats,
**projecteur de chantier** (nouveau, émissif fort et **blanc** — le seul blanc
saturé du thème), cône.
**Sol** — gravats, poussière **mouillée** (une boue de béton), ruissellement,
marquage de sécurité.
**Silhouette** — l'échafaudage, les filets qui bougent, et l'affiche géante.
**Gameplay** — une enceinte percée de deux portails + une masse dedans : la
circulation la plus contrainte du thème après S05. Le combat se déroule soit
**dans** l'enceinte (piège), soit **autour** (kite long). Deux jeux dans un biome.
**Signature** — l'affiche géante sur la palissade, et le projecteur blanc.
**Assets** — nouveaux : palissade, bloc abattu, projecteur.

---

## Récapitulatif SECTEUR

| # | biome | compo | ouvert. | fond visible | densité | priorité | bâti neuf |
|---|---|---|---|---|---|---|---|
| S01 | l'artère | AXES | moy | oui | 1,28 | P0 | — |
| S02 | la place | POURTOUR | haute | oui | 1,10 | P0 | — |
| S03 | le marché | SEMIS | basse | oui | 1,45 | P0 | — |
| S04 | le parvis | DEGAGE | très h. | oui | 0,80 | P0 | — |
| S05 | la ruelle | COULOIRS | **très b.** | à peine | 1,55 | **P1** | façade, benne, clim |
| S06 | les docks | GRILLE | moy | oui | 1,05 | **P1** | portique, empilement |
| S07 | le niveau P | GRILLE | moy | **non** | 1,20 | **P1** | rampe |
| S08 | la station | LINEAIRE | haute | oui | 0,95 | P2 | tourniquet |
| S09 | les cages | POCHES | **très b.** | oui | **1,70** | P2 | cage, escalier |
| S10 | le viaduc | LINEAIRE | haute | **maximal** | 0,70 | P2 | garde-corps |
| S11 | la sous-station | SEMIS | basse | oui (dessous) | 1,35 | P3 | gaine maîtresse |
| S12 | le chantier | POURTOUR | basse | partiel | 1,25 | P3 | palissade, bloc abattu |

Le Secteur est le thème dont l'**amplitude de densité** est la plus large : 0,70
au viaduc contre 1,70 aux cages. C'est cohérent avec le sujet — une ville n'est
pas uniforme — et c'est ce qui le sépare des quatre autres, dont l'amplitude tient
dans un facteur 2.
