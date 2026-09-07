# D — USINE · 13 biomes

**Thème** — un complexe manufacturier **en activité**. C'est le seul thème dont
le verbe soit au présent : des choses bougent, des voyants respirent, des
convoyeurs tournent. Charte inchangée (`BIOME_SKIN.usine`, ambre de signal,
lumière de toit `dir [0.62, 0.78]`, pas d'arrière-plan).

**Ce qu'on garde de l'existant** — les quatre lois deviennent des
**arrangements** (`AXE`, `CROIX`, `SEMIS`, `DEGAGEMENT`) et servent aux treize
biomes. Aucune n'est perdue, aucune n'est un biome.

**Sort des quatre régions actuelles** :

| aujourd'hui | devient |
|---|---|
| `usine[0]` la chaîne | **U01 · La ligne**, augmentée d'une trame RUBAN et d'un vocabulaire propre |
| `usine[1]` le carrefour | **supprimé comme biome** — c'est l'arrangement `CROIX`, il n'a jamais été autre chose |
| `usine[2]` l'atelier | **transformé en U04 · La maintenance** — le nom promettait des établis, il aura des établis |
| `usine[3]` le dégagement | **supprimé comme biome** — c'est l'arrangement `DEGAGEMENT` |

---

### U01 · LA LIGNE — `ligne` — **P0**

- **Concept** — la chaîne d'assemblage principale. Tout est orienté par un axe
  unique et tout le sert.
- **Fonction** — on assemble. Le produit avance, les postes le bordent.
- **Trame** — `RUBAN`, un convoyeur maître, 62 px d'épaisseur, traversant le
  quartier de bout en bout, avec des **passerelles de franchissement** (brèches
  de 280 px tous les deux écrans). Un second ruban parallèle à 0,34 dans la
  moitié des quartiers.
- **Silhouette** — deux lignes continues qui vont d'un bord à l'autre de la vue
  et continuent au-delà. Rien d'autre dans le jeu ne fait ça.
- **Arrangements** — `AXE` (dominant), `SEMIS` de postes entre les deux rubans.
- **Obstacles** — `B_CONVOYEUR_MAITRE` *(barre à taquets, échelle trame)*,
  `B_ROBOT` *(socle + bras replié, signature)*, `B_CAGE` *(cadre ouvert
  grillagé autour d'un poste)*, `B_ARMOIRE` *(caisson, mutualisé)*.
- **Props gros** — poste d'assemblage, convoyeur de liaison, portique de vision.
- **Props moyens** — bac à pièces, desserte d'outillage, pupitre de ligne.
- **Micro** — copeaux, colliers de serrage tombés, marquage de pas de poste,
  bandes jaune-noir au pied des cages.
- **Sol** — traitement **résine époxy** : lisse, réfléchissant, **couloirs
  peints** de part et d'autre du ruban. Traces : `ROULAGE` léger, `SOUILLURE`
  d'huile aux pieds de robot.
- **Background** — aucun (thème intérieur). L'horizon est fermé par la trame
  elle-même, et c'est ce qui donne la sensation d'intérieur.
- **Verticaux** — cages de sécurité (1,2 hauteur de bloc), portiques de vision
  au-dessus du ruban.
- **Lumière** — bandes ambre le long du convoyeur (`LED type bande`, existant),
  éclairs bleus intermittents de soudure au poste **le plus proche** — c'est le
  seul lieu qui a le droit à un flash, et il est court et périodique.
- **Gameplay** — deux corridors longs le long des rubans, franchissement en
  points nommés. Excellent pour les armes à portée, dur pour les zones. La horde
  suit le corridor et s'accumule aux brèches : **point de rendez-vous naturel**.
- **Signature** — **le bras robotisé en cage**. Personne d'autre n'en a.
- **Assets neufs** — silhouette `peigne` non ; `cadre ouvert` (cage), habillage
  `tole peinte` (existe), bras robotisé (prop `P_BRAS` existe, à promouvoir en
  bloc).
- **Mutualisés** — le convoyeur reprend `formeChaine`/`chaine()` à l'échelle
  trame ; l'armoire est `formeCellule`/`cellule()` tel quel.
- **Complexité** faible · **Différenciation 4/5**

---

### U02 · LE MAGASIN — `magasin` — **P0**

- **Concept** — le stockage en racks. Un volume rempli de vide organisé.
- **Fonction** — on garde. Rien ne se transforme ici, tout attend.
- **Trame** — `PEIGNE`. Une échine de circulation centrale, 6 à 9 **travées de
  racks** perpendiculaires, écartées de 2 × `PASSAGE_MIN`, longues d'une
  demi-vue. Les dents sont ouvertes au bout : jamais de cul-de-sac de plus de
  400 px.
- **Silhouette** — la répétition régulière la plus forte du jeu. Des lignes
  parallèles à perte de vue, séparées par des allées.
- **Arrangements** — `ECHELON` (racks décalés d'une travée à l'autre), `AXE`.
- **Obstacles** — `B_PALETTIER` *(peigne, signature)*, `B_PILE` *(empilement de
  palettes, destructible)*, `B_ARMOIRE`.
- **Props gros** — gerbeur à l'arrêt, transpalette, pile de palettes vides.
- **Props moyens** — cartons filmés, chariot de préparation, échelle de rack.
- **Micro** — étiquettes d'emplacement au sol, film étirable arraché, éclats de
  palette, adresses peintes.
- **Sol** — **béton lissé clair**, très propre, **grands rectangles peints**
  d'emplacement. Traces : `ROULAGE` marqué (les allées sont noires de roulage),
  `POUSSIERE` dans les travées peu servies.
- **Background** — aucun.
- **Verticaux** — les racks sont les plus hauts objets du thème.
- **Lumière** — plafonniers alignés sur les allées, donc **des bandes claires et
  des travées sombres**. Le contraste allée/travée est l'effet du biome.
- **Gameplay** — le peigne est le plus fort effet spatial du jeu : on kite en
  zigzag entre les travées, la horde se scinde et arrive par plusieurs dents.
  Redoutable pour la mêlée, très bon pour les armes à ricochet.
- **Signature** — **la travée de rack ouverte des deux bouts**.
- **Assets neufs** — silhouette `peigne`, silhouette `pile`, habillage
  `tole peinte` (existe).
- **Mutualisés** — `P_PALETTIER` et `P_CAISSES` existent en props et deviennent
  les props moyens du biome.
- **Complexité** moyenne · **Différenciation 5/5**

---

### U03 · L'EXPÉDITION — `expedition` — **P0**

- **Concept** — le quai de chargement. Le bord du bâtiment, ouvert sur
  l'extérieur.
- **Fonction** — on charge. Tout converge vers une file de portes.
- **Trame** — `PEIGNE` **à échine de bord** : une ligne de 5 à 8 quais alignés
  sur un côté du quartier, avec les remorques à cul, et une vaste aire de
  manœuvre devant. Asymétrique par construction.
- **Silhouette** — une rangée de gros volumes identiques d'un côté, du vide
  franc de l'autre. Se lit d'une vue entière.
- **Arrangements** — `ASYMETRIE` (dominant), `DEGAGEMENT` côté aire.
- **Obstacles** — `B_QUAI` *(dalle surélevée + butoirs, signature)*,
  `B_REMORQUE` *(châssis, signature)*, `B_PORTE` *(porte sectionnelle, mur
  percé)*, `B_PILE`.
- **Props gros** — niveleur de quai, transpalette, cale de roue, pont de
  liaison.
- **Props moyens** — palettes filmées prêtes, chariot de quai, borne de calage.
- **Micro** — marquages de manœuvre au sol (les seuls **courbes** du dépôt),
  traces de pneus, sangles, bordereaux.
- **Sol** — **béton d'aire**, joints larges, **marquage de circulation jaune
  continu**. Traces : `ROULAGE` très marqué et **courbe**, `SOUILLURE` de gomme
  aux pieds de quai.
- **Background** — aucun, mais **les portes ouvertes laissent voir du vide
  clair** : c'est le seul endroit de l'Usine où l'on voit dehors, et c'est ce
  qui dit « bord de bâtiment ». Réemploi direct de la mécanique `baie` du
  Secteur, avec un `fond` neutre.
- **Verticaux** — les remorques, plus hautes que tout le reste au sol.
- **Lumière** — les portes ouvertes sont des **sources froides** ; l'intérieur
  reste ambre. Le seul contraste de température de couleur du thème.
- **Gameplay** — une grande aire ouverte adossée à une ligne de couverts. On
  recule vers les quais quand ça déborde, on se retrouve dos au mur. Très bon
  pour les boss (la place existe), dangereux quand la horde referme l'aire.
- **Signature** — **la remorque à cul de quai**.
- **Assets neufs** — silhouette `chassis` (remorque, réemployée en Friche et
  Secteur), silhouette `dalle` (quai), porte sectionnelle (habillage sur `mur`).
- **Mutualisés** — `baie`/`VITRAGE` du Secteur ; `chassis` sert trois thèmes.
- **Complexité** moyenne · **Différenciation 5/5**

---

### U04 · LA MAINTENANCE — `maintenance` — **P0** *(remplace « l'atelier »)*

- **Concept** — la halle de réparation. Des machines **ouvertes**, des pièces au
  sol, un pont roulant au-dessus.
- **Fonction** — on répare. Rien n'est fini, tout est démonté.
- **Trame** — `NEF`. Deux murs longs qui définissent une halle d'une vue et
  demie de large, fermée à un bout, et **une poutre de pont roulant qui
  traverse** au-dessus (dessinée, non collidante — c'est de la verticalité pure).
- **Silhouette** — un volume clos avec une ligne haute qui le traverse. La poutre
  du pont est le seul élément du jeu qui passe **au-dessus** du joueur.
- **Arrangements** — `SEMIS` (dominant, dense), `CONTRASTE`.
- **Obstacles** — `B_ETABLI` *(caisson bas et long, signature)*, `B_MACHINE_OUVERTE`
  *(carter écarté, capots posés à côté, signature)*, `B_ARMOIRE`, `B_PILE`.
- **Props gros** — moteur déposé sur chandelles, pont élévateur, servante à
  outils.
- **Props moyens** — carter au sol, touret, bac d'égouttage, chariot de pièces.
- **Micro** — flaques d'huile, boulons, joints, traces de chaîne, empreintes de
  pieds de machine sur le sol.
- **Sol** — **béton huilé**, sombre, marqué d'**empreintes rectangulaires** là où
  des machines ont été enlevées. Traces : `SOUILLURE` dominante, `CORROSION`.
- **Background** — aucun.
- **Verticaux** — la poutre du pont roulant et son crochet, qui **oscille
  lentement** (mouvement continu et périodique : matière, pas télégraphe).
- **Lumière** — baladeuses ponctuelles au sol, halogènes de poste. Éclairage
  **local et inégal**, l'inverse du magasin.
- **Gameplay** — encombré et anguleux, on tire court, pas de longue ligne de vue.
  L'établi long fait un dos. Le meilleur biome de l'Usine pour la mêlée, le pire
  pour les armes à charge.
- **Signature** — **la machine ouverte, capots posés à côté d'elle**. Un objet
  qui raconte qu'on l'a démonté.
- **Assets neufs** — habillage `machine ouverte` (variante d'habillage sur
  `formeCellule` — coût très faible), poutre de pont roulant.
- **Mutualisés** — établi = `caisson` allongé ; `P_OUTILLAGE` existe (Fonderie).
- **Complexité** faible · **Différenciation 4/5**

---

### U05 · LES UTILITÉS — `utilites` — **P1**

- **Concept** — le poste d'énergie. Transformateurs, jeux de barres, rien qui ne
  soit dangereux.
- **Fonction** — on alimente. La zone existe pour le reste de l'usine.
- **Trame** — `CRIBLE`. Un parc de transformateurs sur un réseau régulier, deux
  à quatre cases manquantes, **entouré d'une clôture grillagée** avec deux
  portails.
- **Silhouette** — un damier de masses identiques derrière une claire-voie. On le
  voit à travers, ce qui n'arrive nulle part ailleurs.
- **Arrangements** — `ECHELON`, `POURTOUR`.
- **Obstacles** — `B_TRANSFO` *(cuve à ailettes, signature)*, `B_CLOTURE`
  *(claire-voie, bloque le corps, laisse voir)*, `B_ARMOIRE`.
- **Props gros** — jeu de barres, self, bac de rétention.
- **Props moyens** — coffret de coupure, échelle de transformateur, panneau
  danger.
- **Micro** — gravier, cosses, isolateurs cassés, herbe entre les cailloux.
- **Sol** — **gravier de rétention** — le seul sol granuleux de l'Usine, et le
  seul non lisse. Traces : `POUSSIERE`, `CORROSION` aux pieds.
- **Background** — aucun.
- **Verticaux** — les isolateurs sur les transformateurs, la clôture.
- **Lumière** — un bourdonnement lumineux : halo ambre très faible et **continu**
  sur chaque transformateur, plus les arcs des dangers `HZ_GEYSER` déjà présents.
- **Gameplay** — le crible donne des allées orthogonales seulement : les armes
  perforantes y règnent, les zones ricochent. La clôture **casse le corps mais
  pas la vue** — comportement inédit, très lisible.
- **Signature** — **la claire-voie qu'on voit à travers**.
- **Assets neufs** — silhouette `cuve a jupe` + ailettes, habillage
  `claire-voie` (le motif existe déjà : `caillebotis` de `decor.js`).
- **Mutualisés** — le gravier réemploie la matière de la Friche avec la palette
  Usine.
- **Complexité** moyenne · **Différenciation 4/5**

---

### U06 · LE TRAITEMENT DE SURFACE — `traitement` — **P1**

- **Concept** — la ligne de bains. Une **fosse** de cuves de traitement, une
  passerelle au-dessus, des vapeurs.
- **Fonction** — on trempe. Peinture, phosphatation, dégraissage.
- **Trame** — `FAILLE`. Une fosse longue et franche traverse le quartier ;
  dedans, une file de bacs. On la franchit par **trois passerelles nommées**.
- **Silhouette** — la seule **absence** de sol du thème. Un vide net et long.
- **Arrangements** — `AXE`, `ASYMETRIE`.
- **Obstacles** — `B_BAC` *(cuve rectangulaire en fosse, signature)*,
  `B_PASSERELLE` *(dalle étroite, franchissable, seul « pont » du jeu)*,
  `B_HOTTE` *(volume suspendu, coupe la vue sans bloquer)*.
- **Props gros** — palonnier de trempe, cuve de rinçage, groupe de filtration.
- **Props moyens** — fût de produit, bac de récupération, douche de sécurité.
- **Micro** — auréoles colorées au sol, gouttes séchées, caillebotis, gaines.
- **Sol** — **résine anti-acide** mate, **auréoles pâles** irrégulières autour
  des bacs. Traces : `RUISSELLEMENT` (réemploi Secteur), `CORROSION`.
- **Background** — le fond de la fosse, deux mètres plus bas : sombre, humide,
  avec des reflets. Réemploi de la mécanique `baie` en mode « vers le bas ».
- **Verticaux** — les hottes d'aspiration, au-dessus de la fosse.
- **Lumière** — la vapeur **diffuse** la lumière : c'est le biome le plus flou de
  l'Usine, le seul avec un `champ()` de vapeur permanent.
- **Gameplay** — la faille est un séparateur qui **ne bloque pas les
  projectiles** : on tire par-dessus, on ne marche pas dessus. Cas de jeu inédit
  — le kite se fait le long, l'engagement se fait à travers. La horde doit passer
  par les trois passerelles : c'est le seul goulot **volontaire** du dossier, et
  il est triple, donc jamais bloquant.
- **Signature** — **la fosse**. Aucun autre biome du jeu n'a de trou.
- **Assets neufs** — primitive `FAILLE` (rendu du bord franc + fond), silhouette
  `nappe`, `B_BAC`.
- **Mutualisés** — `champ()` de vapeur = `champ()` de météo, paramétré ;
  `RUISSELLEMENT` existe.
- **Complexité** **forte** (c'est le biome qui paie la primitive FAILLE)
  · **Différenciation 5/5**

---

### U07 · LA ZONE ROBOTISÉE — `robotisee` — **P1**

- **Concept** — l'usine sans homme. Des cellules grillagées, des chariots
  autonomes qui circulent, aucun poste de travail.
- **Fonction** — on produit **seul**. Rien n'est à hauteur d'homme.
- **Trame** — `COURONNE`. Une cellule robotisée circulaire de 1,4 vue de
  diamètre, ceinte de grillage, quatre portes de service ; le reste du quartier
  est un circuit d'AGV.
- **Silhouette** — un anneau. La seule forme courbe majeure du thème.
- **Arrangements** — `NOYAU`, `DEGAGEMENT` autour.
- **Obstacles** — `B_CAGE` *(anneau de claire-voie)*, `B_PORTIQUE` *(robot
  portique sur rails, signature)*, `B_ARMOIRE`.
- **Props gros** — AGV à l'arrêt, station de charge, tourne-palette.
- **Props moyens** — balise de sol, miroir de carrefour, borne d'arrêt.
- **Micro** — **bande magnétique au sol** dessinant un circuit fermé (le prop le
  plus narratif du biome), marquages de zone dangereuse, pas de traces de pieds.
- **Sol** — **béton clair impeccable** — le seul sol du jeu **sans usure**, parce
  que personne n'y marche. `usure` forcée bas. Traces : uniquement `ROULAGE` fin
  et **parfaitement régulier**, ce qui est en soi une information.
- **Background** — aucun.
- **Verticaux** — le portique, qui enjambe la cellule.
- **Lumière** — froide et régulière, plus **des balises orange qui tournent**
  (mouvement continu, matière). Aucun halogène chaud : personne n'a besoin de
  voir.
- **Gameplay** — l'anneau est une couverture continue avec quatre entrées : on
  peut tourner autour indéfiniment, ce qui en fait le meilleur biome de kite pur
  du thème, et le pire pour être encerclé quand on est dedans.
- **Signature** — **le sol sans usure et la bande magnétique**. Un endroit propre
  dans une usine sale dit tout.
- **Assets neufs** — `B_PORTIQUE`, la bande magnétique (prop de sol continu).
- **Mutualisés** — `claire-voie` de U05, `formeCellule` pour les armoires.
- **Complexité** moyenne · **Différenciation 5/5**

---

### U08 · LA PRESSERIE — `presserie` — **P2**

- **Concept** — l'emboutissage. Des masses énormes sur des massifs de fondation,
  des chutes de tôle partout.
- **Fonction** — on frappe. C'est le lieu le plus lourd du thème.
- **Trame** — `NEF` à charpente lourde : une halle avec des **poteaux
  monumentaux** régulièrement espacés, et rien d'autre entre eux que les presses.
- **Silhouette** — peu d'objets, très gros. Le contraste de gabarit le plus fort
  du thème.
- **Arrangements** — `CONTRASTE`, `AXE`.
- **Obstacles** — `B_PRESSE` *(col de cygne sur massif, signature)*,
  `B_POTEAU` *(poutre treillis, mince et infranchissable)*, `B_PILE` de tôles.
- **Props gros** — bobine de tôle, benne à chutes, outil de presse déposé.
- **Props moyens** — cric, palette de flans, cage à ressorts.
- **Micro** — chutes de tôle brillantes (les seuls props **réfléchissants** du
  thème), huile de coupe, empreintes de massif.
- **Sol** — **dalle épaisse à joints larges**, avec les **massifs de fondation**
  visibles comme des rectangles plus clairs. Traces : `SOUILLURE`, `RAYURES`.
- **Background** — aucun.
- **Verticaux** — les poteaux de charpente, seuls objets qui vont du sol au haut
  de l'écran.
- **Lumière** — sombre entre les presses, une lampe par machine.
- **Gameplay** — peu d'obstacles mais énormes : on contourne longtemps, la horde
  disparaît puis réapparaît. Excellent pour les explosifs (les masses renvoient),
  mauvais pour la visée à distance.
- **Signature** — **le col de cygne**, une forme en C que rien d'autre ne fait.
- **Assets neufs** — silhouette `col de cygne`, silhouette `poutre treillis`.
- **Mutualisés** — la benne vient de U10, les piles de U02.
- **Complexité** moyenne · **Différenciation 4/5**

---

### U09 · LE PARC À MATIÈRES — `parc` — **P2**

- **Concept** — la réception des matières premières. Silos, trémies, vis.
- **Fonction** — on stocke en vrac. L'amont de tout.
- **Trame** — `CRIBLE` de silos cylindriques sur jupes, réseau large, deux cases
  manquantes.
- **Silhouette** — des **cercles**, en nombre, tous du même diamètre. Le thème
  n'a rien d'autre de rond en série.
- **Arrangements** — `ECHELON`, `POURTOUR`.
- **Obstacles** — `B_SILO` *(cylindre sur jupe, signature)*, `B_TREMIE` *(trémie
  au sol)*, `B_CONVOYEUR_MAITRE` (liaison entre silos, réemploi U01).
- **Props gros** — vis d'Archimède, benne de réception, dépoussiéreur.
- **Props moyens** — big-bag, sac crevé, cône de granulés.
- **Micro** — **granulés répandus** en traînées depuis les trémies, poussière
  claire, empreintes dans la poudre.
- **Sol** — **béton poudré clair**, avec des **coulées de granulés** qui partent
  des trémies — un sol qui montre une direction d'écoulement.
- **Background** — aucun.
- **Verticaux** — les silos sont les plus hauts volumes du thème.
- **Lumière** — poussière en suspension : léger halo autour de chaque source.
- **Gameplay** — le crible de cylindres donne des couloirs **courbes** aux
  intersections, donc des angles morts plus courts qu'avec des blocs droits. Bon
  compromis kite/tir.
- **Signature** — **la coulée de granulés au sol**, qui pointe toujours vers une
  trémie.
- **Assets neufs** — silhouette `fut/cylindre` à jupe (réemployée Fonderie).
- **Mutualisés** — `P_TREMIE` existe (Fonderie) ; convoyeur de U01.
- **Complexité** faible · **Différenciation 4/5**

---

### U10 · LA COUR À FERRAILLE — `ferraille` — **P2**

- **Concept** — les rebuts de production. Bennes, cisaille, balles de métal
  compressé. **Dehors, mais toujours dans l'usine.**
- **Fonction** — on jette. La sortie basse du complexe.
- **Trame** — `CRIBLE` de bennes, irrégulier, avec un axe de circulation pour le
  camion.
- **Silhouette** — des parallélépipèdes ouverts, débordants, jamais alignés.
- **Arrangements** — `CONTRASTE`, `SEMIS`.
- **Obstacles** — `B_BENNE` *(caisson ouvert débordant, signature)*, `B_BALLE`
  *(cube compressé, destructible)*, `B_CLOTURE`.
- **Props gros** — presse à balles, cisaille, aimant de levage.
- **Props moyens** — fût, palette cassée, sacs de gravats.
- **Micro** — limaille, copeaux longs, taches de rouille, flaques.
- **Sol** — **enrobé fatigué** avec de la terre par endroits. Le seul sol de
  l'Usine qui laisse voir du **sous-sol**. Traces : `CORROSION`, `DECHETS`.
- **Background** — aucun, mais la clôture ouvre sur du vide clair d'un côté.
- **Verticaux** — la cisaille, l'aimant sur potence.
- **Lumière** — projecteurs sur mâts, donc des ombres **longues et dures** :
  c'est le seul biome d'Usine où la lumière vient de haut et de loin.
- **Gameplay** — désordre contrôlé, beaucoup de petits couverts destructibles :
  le terrain change au fil de la manche. Le seul biome du thème où l'on peut
  **se fabriquer** un dégagement.
- **Signature** — **la balle de métal compressé**, cube net dans un chaos.
- **Assets neufs** — habillage `tole rouillee` (existe côté Friche), `B_BENNE`.
- **Mutualisés** — la Friche prête presque tout : `P_BIDON`, `P_DEBRIS`,
  `P_GRILLAGE`.
- **Complexité** faible · **Différenciation 4/5**

---

### U11 · LE CONTRÔLE — `controle` — **P2**

- **Concept** — la métrologie. Cabines vitrées climatisées, marbres de mesure,
  propreté hostile.
- **Fonction** — on mesure. C'est le seul endroit calme du complexe.
- **Trame** — `COURONNE` : un îlot cloisonné vitré au centre du quartier, ouvert
  sur quatre côtés, avec une zone tampon marquée autour.
- **Silhouette** — un volume **transparent**. On voit à travers et il coupe quand
  même le passage : unique dans le dépôt.
- **Arrangements** — `NOYAU`, `POURTOUR`.
- **Obstacles** — `B_CABINE` *(cadre + verre, signature — bloque, ne cache pas)*,
  `B_MARBRE` *(dalle massive basse)*, `B_ARMOIRE`.
- **Props gros** — machine à mesurer tridimensionnelle, banc d'essai, portique.
- **Props moyens** — pupitre, écran, chariot d'échantillons, casier.
- **Micro** — **marquage de zone propre** (une bordure continue au sol), pas de
  saleté, chaussons jetables, étiquettes de conformité.
- **Sol** — **sol conducteur clair**, uni, très peu usé, bordé d'une bande
  continue. Traces : quasi aucune — `null` dominant. **Le sol nu est ici une
  information**, exactement comme le dit le commentaire de `MATIERE`.
- **Background** — aucun.
- **Verticaux** — la cabine.
- **Lumière** — blanche, uniforme, sans halo. Rupture nette avec l'ambre du
  thème, et c'est le point : on change de pièce.
- **Gameplay** — la cabine est une couverture **qu'on voit à travers**, donc on
  suit la horde des yeux sans pouvoir tirer. Effet tactique nouveau et lisible.
- **Signature** — **la propreté**. Un biome qui se reconnaît par ce qu'il n'a
  pas.
- **Assets neufs** — habillage `verre` sur `cadre ouvert` (le verre existe :
  `verre()` de `decor.js`).
- **Mutualisés** — `VITRAGE.espace` réemployé à plat.
- **Complexité** faible · **Différenciation 4/5**

---

### U12 · LA GALERIE TECHNIQUE — `galerie` — **P3**

- **Concept** — la servitude. Faisceaux de gaines, chemins de câbles,
  collecteurs. Un couloir dans les murs de l'usine.
- **Fonction** — on dessert. Aucun produit ne passe ici.
- **Trame** — `RUBAN` **multiple et serré** : trois à cinq faisceaux parallèles
  qui traversent le quartier, écartés de `PASSAGE_MIN` × 2,5, avec des ponts de
  franchissement.
- **Silhouette** — des lignes parallèles serrées d'un bord à l'autre. Le
  contraire du magasin : ici, la ligne est **le sol**, pas le mur.
- **Arrangements** — `AXE` uniquement, plus `ASYMETRIE`.
- **Obstacles** — `B_FAISCEAU` *(gaines empilées, signature)*, `B_COLLECTEUR`
  *(gros tube coudé)*, `B_VANNE`.
- **Props gros** — pompe, échangeur, armoire de distribution.
- **Props moyens** — vanne murale, purgeur, manomètre, échelle.
- **Micro** — condensats au sol, étiquettes de repérage colorées, calorifuge
  arraché, flaques.
- **Sol** — **béton brut + caillebotis** par plaques, avec des **flaques
  permanentes**. Traces : `RUISSELLEMENT`, `CORROSION`.
- **Background** — aucun. C'est le biome le plus fermé du jeu.
- **Verticaux** — les faisceaux passent aussi **au-dessus** : deux niveaux de
  lignes, un au sol, un dessiné en surplomb.
- **Lumière** — la plus basse du thème, quelques tubes, beaucoup d'ombre.
- **Gameplay** — couloirs longs et parallèles, très peu de latéral. Les armes
  perforantes et les rayons y sont excellents, les zones inutiles. **À doser** :
  un seul quartier de ce type par carte, sinon on étouffe. Contrainte de
  génération, pas de dessin.
- **Signature** — **le faisceau de gaines colorées**, seul objet du jeu qui porte
  plusieurs teintes de repérage.
- **Assets neufs** — `B_FAISCEAU` (silhouette `barre` + habillage strié).
- **Mutualisés** — `P_TUYAU`, `P_CAILLEBOTIS`, `P_CABLE` existent tous.
- **Complexité** faible · **Différenciation 4/5**

---

### U13 · LA MEZZANINE TECHNIQUE — `mezzanine` — **P3**

- **Concept** — les bureaux d'atelier posés au-dessus de la production. Cloisons
  légères, mobilier, verrière donnant sur la halle.
- **Fonction** — on décide. Le seul endroit du complexe qui ne fabrique rien.
- **Trame** — `NEF` cloisonnée : une grille de cloisons légères formant des
  bureaux ouverts, avec un couloir périphérique continu.
- **Silhouette** — une **grille orthogonale de cloisons basses**. Rien d'autre
  dans le jeu n'est aussi régulier ni aussi bas.
- **Arrangements** — `SEMIS` régulier, `CROIX`.
- **Obstacles** — `B_CLOISON` *(mur bas vitré en tête, signature — bloque, coupe
  la vue à moitié)*, `B_MOBILIER` *(bureau, destructible)*, `B_ARMOIRE`.
- **Props gros** — bureau, armoire à plans, photocopieur.
- **Props moyens** — chaise renversée, plante morte, carton d'archives.
- **Micro** — papiers au sol, tasses, câbles réseau, dalles de faux plancher
  soulevées.
- **Sol** — **dalles plastiques** en damier fin, usées au couloir. Traces :
  `ROULAGE` de chaise (petits arcs), `POUSSIERE`.
- **Background** — **la halle en contrebas**, vue par la verrière du bord : un
  vrai arrière-plan, et le seul de l'Usine. Réemploi complet de `baie`.
- **Verticaux** — la verrière.
- **Lumière** — néons plats et froids, très différente du reste du thème.
- **Gameplay** — labyrinthe **bas** : on voit par-dessus les cloisons mais on ne
  passe pas. Excellent pour la lecture tactique, difficile pour la fuite. Le
  mobilier destructible permet d'ouvrir des raccourcis.
- **Signature** — **la cloison qu'on voit par-dessus mais qu'on ne franchit
  pas** — la seule couverture « basse » du jeu.
- **Assets neufs** — `B_CLOISON` (silhouette `cadre ouvert` + habillage cloison).
- **Mutualisés** — `baie` du Secteur, mobilier partagé avec Secteur (bureaux
  corporatifs).
- **Complexité** moyenne · **Différenciation 4/5**

---

## Récapitulatif USINE

| # | biome | trame | signature bâtie | sol | P |
|---|---|---|---|---|---|
| U01 | ligne | RUBAN convoyeur | robot en cage | résine + couloirs | P0 |
| U02 | magasin | PEIGNE rack | travée de rack | béton lissé + emplacements | P0 |
| U03 | expedition | PEIGNE quai | remorque à quai | béton d'aire + manœuvre | P0 |
| U04 | maintenance | NEF pont roulant | machine ouverte | béton huilé + empreintes | P0 |
| U05 | utilites | CRIBLE transfo | claire-voie | gravier | P1 |
| U06 | traitement | FAILLE fosse | la fosse | résine + auréoles | P1 |
| U07 | robotisee | COURONNE cage | sol sans usure | béton neuf + bande AGV | P1 |
| U08 | presserie | NEF charpente | col de cygne | dalle + massifs | P2 |
| U09 | parc | CRIBLE silo | coulée de granulés | béton poudré | P2 |
| U10 | ferraille | CRIBLE benne | balle compressée | enrobé fatigué | P2 |
| U11 | controle | COURONNE cabine | la propreté | conducteur clair | P2 |
| U12 | galerie | RUBAN faisceau | gaines colorées | brut + caillebotis | P3 |
| U13 | mezzanine | NEF cloison | cloison basse | dalles plastiques | P3 |

**Aucune paire ne partage (trame, famille signature).** Treize sols distincts,
treize signatures bâties distinctes. Six trames pour treize biomes : RUBAN ×2,
PEIGNE ×2, NEF ×3, CRIBLE ×3, COURONNE ×2, FAILLE ×1.
