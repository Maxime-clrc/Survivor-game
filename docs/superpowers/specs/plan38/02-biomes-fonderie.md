# FONDERIE — 12 biomes

**Le monde** : une aciérie en marche. Masse, chaleur, métal en fusion, poussière
minérale. Tout y est **plus gros** qu'ailleurs — c'est le seul mot du thème.

**Ce qui reste vrai partout** : la palette `#1d1310` / `#5a4034` / `#ff8a2a` · la
lumière `[0.55, 0.84]` · la tuile `fonderie` et sa maille de 5 m · `PROP.fonte`
comme seul ton plus chaud que l'ambre, réservé à la matière en fusion · le type
d'émission `gueule`.

**La chaleur devient un gradient de biome.** C'est le levier d'identité principal
du thème et il n'est pas exploité aujourd'hui : chaud (fusion) → tiède
(refroidissement, expédition) → froid (parc à minerai, crassier, réfectoire).
La palette d'accent suit ce gradient, bornée.

---

### F01 · La halle de coulée — `coulee` — **P0, existe** (`OBSTACLES.fonderie[0]`)

> **Ce que c'est.** Le cœur : deux fours et le canal entre eux.

**Architecture** — deux masses octogonales énormes en diagonale, conduites
plaquées à 0,12 des bords, cuves aux angles.
**Composition** — `AXES` massif. Deux masses, un couloir.
**Obstacles** — `four`, `conduite`, `cuve`.
**Props** — poche, rigole ×2, moule, lingots, caillebotis.
**Sol** — souillure cuite, cendres, vitrifié par plaques.
**Signature** — le canal de `couleeDe`, ancré au monde, avec ses regards allumés.
**Gameplay** — la référence historique du thème. Le couloir central est la
seule ligne franche, donc le lieu de tous les affrontements.

---

### F02 · Le parc à cuves — `cuves` — **P0, existe** (`OBSTACLES.fonderie[1]`)

**Composition** — `SEMIS` de masses moyennes, **aucun axe**. Un four, cinq cuves.
**Gameplay** — la coulée donne une direction à suivre ; celui-ci n'en donne
aucune. C'est tout ce qui les sépare, et ça suffit.

---

### F03 · Le refroidissement — `refroidissement` — **P0, existe** (`OBSTACLES.fonderie[2]`)

**Composition** — `GRILLE` en quinconce, écart entre rangs = `2 × PASSAGE_MIN`
strict (0,22 → 198 px pour un minimum de 80). C'est la géométrie de l'abri
parfait, et elle ne revient qu'avec cette contrainte écrite.

---

### F04 · Le puits — `puits` — **P0, existe** (`OBSTACLES.fonderie[3]`)

**Composition** — `MASSE` centrale. Le seul biome du thème où le centre est
interdit : on tourne autour, donc la horde arrive toujours d'un côté qu'on ne
regarde pas.

---

### F05 · Le parc à minerai — `minerai` — **P1**

> **Ce que c'était.** Le stockage matière première : tas coniques de minerai, de
> coke et de chaux, une chargeuse, des trémies d'alimentation.

**Architecture** — des **tas**. C'est la seule architecture **non orthogonale** du
thème : des masses coniques, larges à la base, sans arête. La régularité vient
des trémies, alignées le long d'un bord.
**Composition** — `POCHES` entre les tas ; les tas sont grands et peu nombreux.
**Obstacles** — `tas` (**nouveau**, système `TAS` : silhouette trapézoïdale
remplissant son AABB, base large, sommet écrêté — mutualisé Friche), `tremie`
(**nouveau**), `conduite`.
**Props** — trémie, outillage, **godet** (nouveau), **bande transporteuse au sol**
(mutualisé `convoyeur` usine, habillage fonderie), scorie, caillebotis.
**Sol** — poussière **minérale** dominante (la plus dense des 61 biomes) ; roulage
d'engin lourd ; aucune trace de fusion — c'est un lieu **froid**.
**Accent** — le plus froid de la Fonderie : `emis` réduit de 40 %, `arena` −4 L,
teinte tirée vers le gris minéral. C'est la borne basse de l'enveloppe.
**Silhouette** — la crête des tas, courbe et irrégulière, contre un ciel de
poussière. C'est le seul horizon **organique** du thème.
**Gameplay** — masses larges et rondes : on ne les longe pas, on les contourne
franchement. Excellentes couvertures contre les projectiles, mauvaises contre les
zones. Le tas ne peut pas former d'abri parfait — sa base est trop large pour
créer une fente.
**Signature** — la silhouette conique. Aucun autre biome du jeu n'a de courbe à
cette échelle.
**Assets** — nouveaux : `tas` (système `TAS`), `tremie`, godet.

---

### F06 · Le crassier — `crassier` — **P1**

> **Ce que c'était.** Le dépôt de laitier. Ce qu'on jette quand on a fini de
> couler. Encore tiède, longtemps après.

**Architecture** — un terrain **accidenté** : des amas bas et étalés, aucune
verticale, aucune arête droite. C'est l'inverse exact de F01.
**Composition** — `SEMIS` très étalé, faible encombrement, contraste bas.
**Obstacles** — `tas` (variante basse et large), `carcasse` (mutualisé friche :
un wagon de laitier renversé), `cuve` (une poche abandonnée).
**Props** — scorie ×4 (le taux le plus fort du jeu), lingots ratés, **poche
retournée** (nouveau), outillage.
**Sol** — cendres, corrosion, **braise résiduelle** : le seul sol du jeu qui
émette faiblement sans être un danger. C'est de la matière, pas un signal — donc
saturation basse, mouvement lent et continu.
**Danger** — `HZ_EMBER` doublé (le front de combustion rampe dans le laitier),
`HZ_GEYSER` absent : rien n'est sous pression ici.
**Silhouette** — un terril, plus haut que tout le reste, au bord de la région.
**Gameplay** — le biome le plus **ouvert** de la Fonderie. Peu de couverture,
beaucoup de sol chaud : on y gère la position par rapport aux dangers, pas par
rapport aux murs. Le contrepoids exact de F04.
**Signature** — la lueur sous les cendres, visible seulement quand on passe
dessus.
**Assets** — nouveaux : poche retournée. Réutilise `tas` de F05.

---

### F07 · Le hall des lingots — `lingots` — **P1**

> **Ce que c'était.** Le stockage produit fini. Des piles régulières, basses,
> parfaitement alignées, sur un sol qui ne bouge pas.

**Architecture** — un **quadrillage** de piles basses. La seule architecture
régulière et **basse** du thème : on voit par-dessus tout, mais on ne passe
qu'entre.
**Composition** — `GRILLE` orthogonale, maille large.
**Obstacles** — `pile` (**nouveau** : basse, carrée, `hp` — on peut la faire
tomber au tir, ce qui **ouvre un passage**. Premier obstacle du jeu dont la
destruction change la circulation de manière lisible).
**Props** — lingots ×4, cerclage, marquage, caillebotis, outillage.
**Sol** — rayures d'engin, roulage strict, corrosion sur les joints.
**Silhouette** — une ligne d'horizon **rase** et régulière : le seul biome du jeu
où l'horizon soit plus bas que le joueur.
**Gameplay** — lignes de vue longues (tout est bas) mais circulation contrainte
(tout bloque). C'est la combinaison exacte que le jeu n'a nulle part : **on voit
la horde et on ne peut pas la fuir en ligne droite**. Les piles destructibles
donnent au joueur un levier sur sa propre géométrie.
**Signature** — le quadrillage vu de haut, et une pile effondrée qui trahit un
combat précédent.
**Assets** — nouveaux : `pile` (système `EMPILEMENT`, mutualisé Secteur/docks).

---

### F08 · La sablerie — `sablerie` — **P2**

> **Ce que c'était.** Le moulage : châssis, sable de fonderie, noyautage. Un lieu
> **poudreux** au milieu du métal.

**Architecture** — des **châssis** au sol, à plat, très nombreux, plus une
malaxeuse centrale. Le bâti est bas et dense ; l'obstacle dominant est petit.
**Composition** — `SEMIS` dense, faible contraste.
**Obstacles** — `chassis` (**nouveau**, bas, carré, en tas de deux ou trois),
`machine` (mutualisé usine, habillage fonderie : la malaxeuse), `tremie`.
**Props** — moule ×4, outillage, trémie, **sac de liant** (nouveau).
**Sol** — poussière dominante, empreintes, souillure. Aucune fusion.
**Accent** — beige-gris chaud : la Fonderie sans le rouge.
**Gameplay** — sol dense en petits obstacles : on ne bloque jamais mais on ne
court jamais droit. La navigation y est la plus coûteuse du thème (beaucoup de
petites boîtes) — à mesurer.
**Signature** — la poussière qui se lève au passage. C'est le seul biome où le
**mouvement du joueur** marque le décor.
**Assets** — nouveaux : `chassis`, sac de liant.

---

### F09 · Les bassins — `bassins` — **P2**

> **Ce que c'était.** Le refroidissement à eau. Bassins ouverts, passerelles,
> vapeur permanente.

**Architecture** — des **bassins** : grandes bordures rectangulaires bloquantes,
intérieur infranchissable, reliés par des passerelles étroites.
**Composition** — `LINEAIRE` + `POCHES`. Trois bassins, deux passerelles chacun.
**Obstacles** — `bac` (mutualisé U08, habillage fonderie), `conduite`, `cuve`.
**Props** — tuyau, caillebotis ×2, pompe (mutualisé U08), rigole.
**Sol** — ruissellement, vitrifié aux abords, corrosion partout.
**Danger** — `HZ_GEYSER` (vapeur) doublé, `HZ_POOL` absent : l'eau est déjà là et
elle n'est pas un piège, elle est un mur.
**Silhouette** — la nappe de vapeur, dense et basse, qui masque le fond de la
région. C'est le seul biome du jeu où l'atmosphère limite la vue **sans être une
météo**.
**Gameplay** — les passerelles sont des goulots **assumés**, donc chacune est
doublée et large de `2 × PASSAGE_MIN`. C'est le biome le plus punitif pour un
mauvais positionnement, et le meilleur pour les armes de zone.
**Signature** — la vapeur qui monte de trois bassins en phases décalées.
**Assets** — réutilise `bac`, pompe. Aucun bâti neuf.

---

### F10 · La coulée continue — `continue` — **P2**

> **Ce que c'était.** La machine la plus longue de l'usine : une seule ligne, de
> la poche au refroidisseur, sur toute la longueur du hall.

**Architecture** — **une** masse, très longue, traversant la cellule de part en
part, avec des passages ménagés dessous à intervalle régulier.
**Composition** — `LINEAIRE` pur. La cellule est coupée en deux moitiés reliées
par trois passages.
**Obstacles** — `machine longue` (**nouveau** : variante extrême de `tunnel`,
élongation la plus forte du jeu), `cuve`, `conduite`.
**Props** — rigole ×3, poche, lingots, outillage, caillebotis.
**Sol** — vitrifié en bande sous la machine, cendres, souillure.
**Gameplay** — deux moitiés d'arène et trois passages : c'est la géométrie la plus
« niveau » du jeu, donc celle à surveiller. **Trois** passages minimum, jamais
deux : avec deux, une horde qui prend les deux enferme l'équipe.
**Signature** — la ligne rouge continue sur toute la largeur de l'écran.
**Assets** — nouveaux : `machine longue`.

---

### F11 · La réfection — `refection` — **P3**

> **Ce que c'est.** Un four à l'arrêt, ouvert, en cours de rebriquetage.
> Échafaudages, briques réfractaires empilées, gravats.

**Architecture** — **un** four éventré (masse creuse : la silhouette montre
l'intérieur), entouré d'échafaudages et de piles de briques.
**Composition** — `MASSE` unique + `SEMIS` périphérique.
**Obstacles** — `four` (variante ouverte), `echafaudage` (**nouveau**, système
`OSSATURE` : très fin, haut, traversable visuellement), `pile` (briques).
**Props** — outillage ×2, **brique réfractaire** (nouveau, micro), **bâche**
(nouveau, mutualisé friche/secteur), scorie.
**Sol** — poussière, gravats, aucune fusion : le four est froid, et c'est **la**
information du biome.
**Accent** — froid, comme F05, mais par une autre route : ici c'est la **brique**
qui donne le ton (`PROP.brique`), pas le minerai.
**Gameplay** — une grande masse creuse dans laquelle **on peut entrer** : c'est
le seul obstacle du jeu qui offre un intérieur. Une poche fermée sur trois côtés,
donc un piège volontaire, et une couverture parfaite si on la tient.
**Signature** — la gueule du four, éteinte. Toute la Fonderie l'a allumée ; ici
elle est noire.
**Assets** — nouveaux : `echafaudage` (système `OSSATURE`), brique, bâche.

---

### F12 · Le pont roulant — `pont` — **P3**

> **Ce que c'était.** Le hall vu depuis le sol, avec la structure du pont roulant
> au-dessus. Peu de choses par terre, tout est en l'air.

**Architecture** — des **piliers** : très peu d'objets au sol, mais hauts et
réguliers. Le pont lui-même est au-dessus du plan de jeu, donc il **ne bloque
pas** — il n'existe que par son ombre portée et son mouvement.
**Composition** — `DEGAGE` structuré. Six piliers, rien d'autre.
**Obstacles** — `pilier` (**nouveau**, système `MAT` : très petite emprise, très
haute silhouette — la plus petite AABB bloquante du jeu).
**Props** — marquage au sol de zone de levage, crochet, élingue, lingots.
**Sol** — marquage circulaire d'interdiction sous le pont, roulage, rayures.
**Silhouette** — **la** signature : la poutre du pont roulant traverse tout
l'écran, au-dessus de tout, et son ombre balaie le sol lentement.
**Gameplay** — la plus grande surface libre du thème avec le plus haut plafond
visuel. Les piliers sont des points de kite ponctuels : on tourne autour, on ne
se cache pas derrière. Idéal pour un boss.
**Attention technique** — l'ombre mobile du pont est un **mouvement continu et
périodique**, donc jamais un télégraphe. Elle ne doit rien assombrir de
gameplay : elle multiplie le sol, pas les entités.
**Signature** — l'ombre qui passe.
**Assets** — nouveaux : `pilier` (système `MAT`), poutre de pont (décor haut, sans
collider), ombre balayante.

---

## Récapitulatif FONDERIE

| # | biome | compo | ouvert. | thermie | densité | priorité | bâti neuf |
|---|---|---|---|---|---|---|---|
| F01 | la halle de coulée | AXES | moy | **chaud** | 1,00 | P0 | — |
| F02 | le parc à cuves | SEMIS | moy | chaud | 1,10 | P0 | — |
| F03 | le refroidissement | GRILLE | moy | tiède | 0,90 | P0 | — |
| F04 | le puits | MASSE | basse | chaud | 0,80 | P0 | — |
| F05 | le parc à minerai | POCHES | moy | **froid** | 0,85 | **P1** | tas, trémie |
| F06 | le crassier | SEMIS | **très h.** | tiède | 0,70 | **P1** | poche retournée |
| F07 | le hall des lingots | GRILLE | basse | froid | 1,15 | **P1** | pile |
| F08 | la sablerie | SEMIS | basse | froid | 1,30 | P2 | châssis |
| F09 | les bassins | LINEAIRE | basse | tiède | 0,95 | P2 | — |
| F10 | la coulée continue | LINEAIRE | basse | **chaud** | 0,75 | P2 | machine longue |
| F11 | la réfection | MASSE | moy | froid | 1,05 | P3 | échafaudage |
| F12 | le pont roulant | DEGAGE | très h. | tiède | 0,55 | P3 | pilier |

Le gradient thermique donne au thème un second axe de séparation que la seule
géométrie n'aurait pas fourni : F02 et F08 partagent `SEMIS` mais pas la
température, F03 et F07 partagent `GRILLE` mais pas la hauteur ni la thermie.
