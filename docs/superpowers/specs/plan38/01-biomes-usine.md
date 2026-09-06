# USINE — 12 biomes

**Le monde** : un complexe de production encore alimenté. Métal froid, ambre,
orthogonalité, joints techniques de 5 m, machines qui tournent.

**Ce qui reste vrai partout** : la palette `#121a26` / `#4e5a6e` / `#ffa63d` · la
lumière `[0.62, 0.78]` · la tuile `usine` avec sa maille de 5 m · l'ambre comme
seul ton chaud · le mouvement continu et périodique (jamais un télégraphe).

**Ce qui différencie un biome** : la loi d'implantation, les familles tirées, la
densité, le calibre, les traces, les dangers, l'accent de palette, le repère.

Codes de composition (voir `06-matrice-variete.md`) : `BANDES` `AXES` `SEMIS`
`DEGAGE` `COULOIRS` `POURTOUR` `MASSE` `POCHES` `LINEAIRE` `GRILLE`.

---

### U01 · La ligne — `ligne` — **P0, existe** (`OBSTACLES.usine[0]`, « la chaine »)

> **Ce que c'est.** La chaîne d'assemblage principale. Le cœur productif.

**Architecture** — deux convoyeurs longs en diagonale opposée, postes en bout de
ligne, cellules robotisées au milieu. Long et mince, strictement orthogonal.
**Composition** — `BANDES`. Chaîne · allée · chaîne. On longe, on ne traverse pas.
**Obstacles** — `chaine`, `poste`, `machine`.
**Props** — convoyeur ×3, bras, presse, palettier, marquage, allée.
**Sol** — béton lissé, roulage dense sur les allées, souillure sous les cellules.
**Silhouette** — le bâti de la ligne : caissons alignés, passerelle de service.
**Gameplay** — les allées sont des couloirs de kite naturels, orientés. Excellente
lisibilité en enfilade, mauvaise latéralement : la horde arrive par le flanc.
**Signature** — deux bandes parallèles qui ne se touchent jamais.
**Assets** — aucun. C'est la référence historique, elle ne bouge pas.

---

### U02 · Le carrefour — `carrefour` — **P0, existe** (`OBSTACLES.usine[1]`)

> **Ce que c'est.** L'intersection des deux allées principales du hall.

**Architecture** — quatre îlots de machines poussés hors des deux bandes
centrales ; chaînes plaquées à 0,12 des bords.
**Composition** — `AXES`. Deux allées larges qui se croisent.
**Obstacles** — `machine`, `chaine`, `poste`.
**Props** — allée, marquage, caisses en périphérie d'îlot.
**Sol** — marquage au sol dominant, roulage aux quatre branches.
**Gameplay** — on contourne au lieu de longer. Quatre lignes de fuite, aucun
goulot. La meilleure composition du thème pour un boss.
**Signature** — la croix vide au centre.

---

### U03 · L'atelier — `atelier` — **P0, existe** (`OBSTACLES.usine[2]`)

> **Ce que c'est.** La maintenance : établis, servantes, petits postes.

**Composition** — `SEMIS` dense de petits postes. Beaucoup d'angles, rien qui
bloque une traversée.
**Gameplay** — on tire court, on ne voit jamais loin. Défavorable aux armes à
portée, favorable aux zones et aux souffles.
**Signature** — aucune masse ne dépasse la taille d'un joueur ×3.

---

### U04 · Le dégagement — `degagement` — **P0, existe** (`OBSTACLES.usine[3]`)

> **Ce que c'est.** Le hall de réception, vidé pour laisser passer les convois.

**Composition** — `DEGAGE`. Presque vide, deux masses isolées contre les bords.
**Gameplay** — la respiration du thème : on traverse en ligne droite, ce qu'aucun
autre biome d'usine ne permet. C'est aussi le pire endroit où se faire encercler.
**Signature** — on voit d'un bord à l'autre de la région.

---

### U05 · Le magasin — `magasin` — **P1**

> **Ce que c'était.** Le stockage palettes. Gerbage sur quatre niveaux, allées de
> chariot calibrées à l'engin.

**Architecture** — des **palettiers** : longues structures très fines, régulières,
parallèles, toutes dans le même sens. C'est la seule architecture répétitive du
thème, et c'est ce qui la rend reconnaissable en un quart de seconde.
**Composition** — `COULOIRS`. 4 à 5 rangées, écart constant. **Deux traverses**
coupent les rangées : sans elles c'est un peigne, donc un piège.
**Obstacles** — `rack` (**nouveau**, long et fin, `hp` sur les travées basses),
`poste` en tête d'allée, `machine` (gerbeur à l'arrêt).
**Props** — palettier, caisses ×2, marquage, allée, **cerclage** (nouveau, micro),
**film étirable** (nouveau, micro).
**Sol** — roulage TRÈS dense et strictement parallèle aux allées ; souillure au
pied des racks ; poussière dans les fonds de rack (là où personne ne balaye).
**Silhouette** — la crête des palettiers, tous à la même hauteur : une ligne
d'horizon **plate**, unique dans le thème.
**Vertical** — le rack est le seul objet du thème qui se lit comme haut.
**Gameplay** — couloirs longs et droits : les armes perçantes et les faisceaux
sont rois, le corps à corps est puni. **Risque de bouchon** : chaque allée est
tenue à `2 × PASSAGE_MIN` minimum et les traverses garantissent deux issues par
allée. Le champ de navigation y est trivial (couloirs), donc le coût CPU baisse.
**Signature** — la perspective d'allée : deux lignes qui fuient au même point.
**Assets** — nouveaux : `rack` (système `RAYONNAGE`), cerclage, film. Réutilisés :
palettier, caisses, marquage, allée.

---

### U06 · L'expédition — `expedition` — **P1**

> **Ce que c'était.** Les quais de chargement. Portes sectionnelles, niveleurs,
> remorques à quai.

**Architecture** — une **façade** : un mur de quais sur un bord de la cellule,
avec des remorques en épi devant, et un immense parvis bétonné au milieu.
**Composition** — `POURTOUR` asymétrique (bord bâti / centre vide). Une seule des
quatre arêtes est fermée — c'est le biome le plus asymétrique du thème.
**Obstacles** — `quai` (**nouveau**, masse longue et basse contre un bord),
`remorque` (**nouveau**, système `VEHICULE`, 3 sous-types : à quai, décrochée,
renversée), `conteneur` (mutualisé depuis le Secteur, habillage usine).
**Props** — palettier, caisses, marquage de quai, **cale de roue** (nouveau),
**transpalette** (nouveau), allée.
**Sol** — béton peint, marquage d'aire de manœuvre en arc, roulage large.
**Silhouette** — la ligne de portes sectionnelles, rythme régulier de rectangles
clairs sur la masse sombre.
**Gameplay** — grande aire ouverte + un bord dur : c'est la composition qui
**adosse** l'équipe. Kite en arc contre la façade. Les remorques cassent la ligne
de tir de biais, ce que rien d'autre ne fait dans le thème.
**Signature** — une remorque en travers, portes ouvertes.
**Assets** — nouveaux : `quai`, `remorque` ×3, cale, transpalette.

---

### U07 · Les utilités — `utilites` — **P2**

> **Ce que c'était.** Le poste de livraison électrique et la salle des
> compresseurs. Ce qui alimente tout le reste.

**Architecture** — des **armoires** en batteries serrées, des transformateurs
isolés dans des enclos grillagés, des plots béton. Peu d'objets, mais tous
denses et carrés. Le grillage est **visuel et non bloquant** : il dit « on ne
passe pas » sans que la navigation l'entende — c'est un risque, donc l'enclos
porte un vrai collider sur ses **montants**, pas sur sa maille.
**Composition** — `POCHES`. Quatre enclos qui font quatre petites arènes reliées.
**Obstacles** — `armoire` (**nouveau**, petit et carré), `transformateur`
(**nouveau**, cubique, émissif), `machine`.
**Props** — câble ×3 (le plus fort taux du thème), ventilation, marquage
d'avertissement, **chemin de câbles** (nouveau), tube.
**Sol** — rayures, poussière, marquage jaune-noir sur les seuils d'enclos.
**Silhouette** — les gaines aériennes qui relient les enclos entre eux.
**Gameplay** — quatre poches = quatre zones de combat courtes reliées par des
passages nets. Le meilleur biome du thème pour les classes de contrôle, le pire
pour le kite long. Le danger `jetDeVapeur` y est doublé (échelle 1,10).
**Signature** — l'arc bleu d'un transformateur qui claque, à intervalle fixe.
**Assets** — nouveaux : `armoire`, `transformateur`, `enclos` (montants seuls),
chemin de câbles.

---

### U08 · Le traitement de surface — `traitement` — **P2**

> **Ce que c'était.** La ligne de bains : dégraissage, phosphatation, rinçage.
> Des cuves alignées, une passerelle au-dessus, des vapeurs.

**Architecture** — une **enfilade de bacs** rectangulaires très longs, séparés
par des passages étroits calibrés. C'est la seule architecture du thème dont les
intervalles soient la donnée principale.
**Composition** — `LINEAIRE`. Un axe unique, traversé par trois passerelles.
**Obstacles** — `bac` (**nouveau**, système `BASSIN` : bordure épaisse bloquante,
intérieur = sol différent, non franchissable), `machine`, `poste`.
**Props** — tuyau, tube, ventilation, **pompe** (nouveau), **bidon de produit**
(mutualisé friche, habillage usine).
**Sol** — souillure chimique (teinte froide), ruissellement le long des bacs.
**Gameplay** — le biome le plus **contraint** de l'usine. Les passages entre bacs
sont larges de `2 × PASSAGE_MIN` exactement — assez pour deux corps, pas trois.
La horde s'y ordonne en file, ce qui est une figure que le jeu n'a nulle part
ailleurs. À surveiller : c'est le candidat n°1 au bouchon, donc `verifierBiomes`
doit le rejouer sur 50 graines et non 3.
**Signature** — la vapeur qui monte de trois bacs, décalée en phase.
**Assets** — nouveaux : `bac` (système `BASSIN`, réutilisé par la Fonderie et la
Friche), pompe.

---

### U09 · Le contrôle — `controle` — **P2**

> **Ce que c'était.** Métrologie et supervision. Cabines vitrées, bureaux au
> milieu de l'atelier, un pupitre qui voit toute la ligne.

**Architecture** — des **cabines** : petits volumes fermés, vitrés sur deux
faces, posés au milieu du vide. Rien d'autre. C'est le biome le plus **vide et
le plus lisible** du thème après le dégagement, mais il est vide autrement : les
masses sont peu nombreuses et **hautes**.
**Composition** — `MASSE` décentrée. Une grande cabine, deux petites.
**Obstacles** — `cabine` (**nouveau**, vitrée : l'habillage montre l'intérieur),
`poste`, `armoire`.
**Props** — marquage, câble, allée, **pupitre** (nouveau), **écran mort**
(nouveau, micro, émissif faible).
**Sol** — sol technique propre, rayures, très peu de traces : c'est ce qui le
distingue — **la propreté est une information**.
**Silhouette** — les vitrages allumés, les seuls rectangles de lumière du thème.
**Gameplay** — lignes de vue très longues, trois obstacles seulement. Le biome
où les armes à distance donnent leur maximum et où le boss a le plus de place.
**Signature** — voir la horde à travers une vitre avant qu'elle contourne.
**Assets** — nouveaux : `cabine` (vitrage), pupitre, écran.

---

### U10 · La galerie technique — `galerie` — **P2** *(souterrain)*

> **Ce que c'était.** Le sous-sol : chemins de câbles, gaines, conduites de
> fluide. On y passe, on n'y travaille pas.

**Architecture** — des **murs** au sens propre : deux parois continues avec des
niches, pas des objets isolés. C'est le seul biome du thème dont le bâti soit
**continu**.
**Composition** — `COULOIRS` sinueux, avec trois élargissements (des « salles »).
**Obstacles** — `paroi` (**nouveau**, système `MUR` mutualisé friche/secteur),
`conduite` (mutualisé fonderie, habillage usine), `armoire`.
**Props** — câble ×4, tuyau, caillebotis, tube (le seul allumé), gaine.
**Sol** — ruissellement, souillure, corrosion. Aucun marquage : personne ne
circule ici en engin.
**Accent de palette** — le plus sombre du thème : `arena` −8 L, `emis` inchangé.
La galerie est **la limite basse** de l'enveloppe Usine, pas une sortie.
**Gameplay** — le biome le plus fermé des 61. Danger réel de bouchon : les
élargissements sont obligatoires et `coeurTraversable` doit passer sur les deux
axes. En contrepartie, c'est le seul endroit du jeu où le joueur **choisit** un
couloir, donc où la horde arrive par un seul côté.
**Signature** — la lueur intermittente d'un tube au bout du couloir.
**Assets** — nouveaux : `paroi` (système `MUR`), niche.

---

### U11 · La ligne démontée — `demontee` — **P3**

> **Ce que c'est.** Une chaîne en cours de dépose. Les mêmes objets que U01, mais
> l'ordre a été cassé.

**Architecture** — les familles de U01, **désalignées** : convoyeurs en biais,
cellules ouvertes, postes écartés. Le tremblement de la Friche (`j = 40`)
s'applique ici, et **seulement** ici dans le thème.
**Composition** — `SEMIS` à fort contraste (le rapport max/min le plus élevé du
thème).
**Obstacles** — `chaine`, `machine`, `poste`, `rack` — toutes les familles, aucune
neuve.
**Props** — tout le catalogue, plus **caisse d'outillage** et **élingue**
(nouveaux, micro).
**Sol** — rayures profondes là où une machine a été traînée, taches d'huile
anciennes, poussière.
**Gameplay** — géométrie imprévisible : le seul biome d'usine où la position des
masses ne se devine pas. Rejouabilité pure.
**Signature** — un convoyeur en biais. Dans une usine, **rien n'est en biais**.
**Assets** — aucun bâti neuf. C'est le biome le moins cher du thème, et il double
la valeur des cinq familles déjà produites.

---

### U12 · Le four à chaîne — `etuve` — **P3**

> **Ce que c'était.** Le tunnel de séchage / cuisson au bout de la ligne. Chaud,
> long, traversé par un convoyeur qui ne s'arrête jamais.

**Architecture** — un **tunnel** unique, très long, ouvert aux deux bouts, avec
un convoyeur bloquant à l'intérieur : on entre, on longe, on sort. Autour, du
vide et des ventilateurs.
**Composition** — `MASSE` linéaire traversante.
**Obstacles** — `tunnel` (**nouveau** : deux longues masses parallèles à
`3 × PASSAGE_MIN` d'écart, avec deux brèches latérales — jamais un couloir
unique), `machine`, `poste`.
**Props** — ventilation ×3, convoyeur, tube, gaine.
**Sol** — cendres légères, souillure cuite, aucun ruissellement.
**Accent** — le plus chaud du thème : `emis` tiré de 20 % vers `#ff8a2a`. C'est la
**limite haute** de l'enveloppe Usine, et c'est ce qui la rapproche de la Fonderie
sans y entrer — la matière de sol reste `usine`, et c'est elle qui tranche.
**Gameplay** — le tunnel est une décision : le traverser (rapide, exposé aux deux
bouts) ou le contourner (long, sûr). Le seul biome du thème qui pose ce choix.
**Signature** — la gueule du tunnel, éclairée de l'intérieur.
**Assets** — nouveaux : `tunnel` (deux masses + brèches, réutilisable Fonderie).

---

## Récapitulatif USINE

| # | biome | compo | ouvert. | densité | vertical | priorité | bâti neuf |
|---|---|---|---|---|---|---|---|
| U01 | la ligne | BANDES | moy | 1,15 | bas | P0 | — |
| U02 | le carrefour | AXES | haute | 1,00 | bas | P0 | — |
| U03 | l'atelier | SEMIS | basse | 1,35 | bas | P0 | — |
| U04 | le dégagement | DEGAGE | très h. | 0,70 | bas | P0 | — |
| U05 | le magasin | COULOIRS | basse | 1,25 | **haut** | **P1** | rack |
| U06 | l'expédition | POURTOUR | haute | 0,95 | moy | **P1** | quai, remorque |
| U07 | les utilités | POCHES | basse | 1,20 | moy | P2 | armoire, transfo, enclos |
| U08 | le traitement | LINEAIRE | basse | 1,05 | bas | P2 | bac |
| U09 | le contrôle | MASSE | très h. | 0,60 | **haut** | P2 | cabine |
| U10 | la galerie | COULOIRS | très b. | 1,40 | moy | P2 | paroi |
| U11 | la ligne démontée | SEMIS | moy | 1,30 | moy | P3 | — |
| U12 | l'étuve | MASSE | moy | 0,85 | **haut** | P3 | tunnel |

Deux biomes partagent `COULOIRS` (U05, U10) et deux `SEMIS` (U03, U11) : ils sont
séparés par la densité, la verticalité et l'ouverture — voir la matrice.
