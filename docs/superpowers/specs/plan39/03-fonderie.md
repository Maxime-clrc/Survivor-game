# D — FONDERIE · 12 biomes

**Thème** — un complexe métallurgique. Charte inchangée (`BIOME_SKIN.fonderie`,
émissif `#ff8a2a`, `PROP.fonte` réservé au métal en fusion, grille `grilleRepere`,
`LED type gueule`, contour le plus faible du dépôt après la Friche).

**L'axe du thème est la TEMPÉRATURE.** C'est le seul thème qui possède un
gradient physique lisible, et le dépôt ne s'en sert pas : le « refroidissement »
actuel est aussi chaud que la coulée. Les douze biomes se rangent sur cet axe, et
**c'est lui qui les distingue avant toute autre chose**.

```
CHAUD  fusion · coulee · laminoir                    fonte, orange, halo
TIEDE  sablerie · ebarbage · refractaire · souffl.   gris chaud, braises
FROID  refroidissement · minerai · brames · crassier gris, bleu, vapeur blanche
RESEAU conduites                                     hors gradient
```

**Sort des quatre régions actuelles** :

| aujourd'hui | devient |
|---|---|
| `fonderie[0]` la coulée | **F01 · La coulée**, la trame devenant `couleeDe()` promue |
| `fonderie[1]` les cuves | **transformé en F05 · La sablerie** — « cuve » n'était qu'un octogone moyen |
| `fonderie[2]` le refroidissement | **transformé en F03**, qui refroidit vraiment |
| `fonderie[3]` le puits | **transformé en F02 · La fusion** — il promettait un trou, il aura un four |

---

### F01 · LA COULÉE — `coulee` — **P0**

- **Concept** — le métal liquide qui circule. Rigoles couvertes, regards
  incandescents, poches sur rails.
- **Fonction** — on transporte le chaud. Tout le reste attend ce qui passe ici.
- **Trame** — `RUBAN`. **`couleeDe()` existe déjà** et est le seul objet du dépôt
  ancré au monde : il devient officiellement une trame, avec ses regards comme
  sources et sa géométrie partagée décor/lumière. Deux rigoles par quartier,
  franchies par des ponts de service.
- **Silhouette** — deux lignes **qui brillent** d'un bout à l'autre de la vue.
- **Arrangements** — `AXE`, `ASYMETRIE`.
- **Obstacles** — `B_RIGOLE` *(ruban couvert, signature)*, `B_POCHE` *(cuve à
  jupe sur chariot, signature)*, `B_MASSIF`.
- **Props gros** — chariot de poche, quenouille, busette de coulée.
- **Props moyens** — lingotière, râble, bac de prélèvement.
- **Micro** — projections figées, sable de bouchage, empreintes de rail.
- **Sol** — **fonte vitrifiée** : la matière existe déjà dans la tuile Fonderie
  (`LISEZMOI` la nomme). Traces : `SOUILLURE` chaude, `CENDRES`.
- **Background** — aucun.
- **Verticaux** — les potences de poche.
- **Lumière** — **la plus forte du jeu**. Les regards de la coulée sont des
  sources filtrées à la génération (déjà écrit), et le halo orange sature le sol.
- **Gameplay** — le ruban brûlant est un **danger visible qui structure** : on ne
  le traverse qu'aux ponts, la horde aussi. Le seul biome où la trame elle-même
  fait mal.
- **Signature** — **le regard incandescent** dans un sol sombre.
- **Assets neufs** — aucun. Tout existe.
- **Mutualisés** — `couleeDe`, `P_POCHE`, `P_RIGOLE`, `EMISSIF`.
- **Complexité** faible · **Différenciation 5/5**

---

### F02 · LA FUSION — `fusion` — **P0**

- **Concept** — le four lui-même. Une masse énorme, une gueule, une ceinture de
  plateformes de service.
- **Fonction** — on fond. C'est le cœur, et tout y monte en température.
- **Trame** — `COURONNE`. Une masse centrale de **2 vues de diamètre** — de loin
  le plus gros objet du jeu — ceinte d'un anneau de plateformes et de conduites,
  quatre accès radiaux.
- **Silhouette** — une montagne. Le premier objet du dépôt qu'on voit avant
  d'arriver dessus.
- **Arrangements** — `NOYAU`, `POURTOUR`.
- **Obstacles** — `B_FOUR` *(octogone massif, existe, à agrandir)*,
  `B_PLATEFORME` *(dalle annulaire, signature)*, `B_TUYERE` *(bec radial,
  signature)*.
- **Props gros** — machine de bouchage, plancher de coulée, tuyère.
- **Props moyens** — barre de débouchage, coffret de refroidissement, échelle.
- **Micro** — croûtes de laitier, gouttes figées, calorifuge fendu.
- **Sol** — **dalle réfractaire** : grands modules carrés sombres, joints clairs,
  bombés au centre. Traces : `CENDRES`, `CORROSION`.
- **Background** — aucun.
- **Verticaux** — le four occupe toute la hauteur perceptible : il porte des
  **anneaux de ceinture** dessinés en perspective d'écrasement.
- **Lumière** — la gueule (`LED type gueule`, existe) éclaire un secteur entier
  et **pulse lentement**.
- **Gameplay** — un obstacle infranchissable de deux vues change tout : on perd
  la horde de vue longtemps, on la retrouve d'un côté imprévu. **Le meilleur
  terrain de boss du thème** : un dos garanti et une arène annulaire.
- **Signature** — **la masse qui ne se contourne pas d'un écran**.
- **Assets neufs** — `B_PLATEFORME` (anneau), échelle trame de `formeOctogone`.
- **Mutualisés** — `four()` et sa gueule existent, à monter en échelle.
- **Complexité** moyenne · **Différenciation 5/5**

---

### F03 · LE REFROIDISSEMENT — `refroidissement` — **P0**

- **Concept** — les bassins de trempe. Le seul endroit **froid** du thème, et il
  doit se voir en un dixième de seconde.
- **Fonction** — on éteint. L'inverse de F02, et ils ne doivent jamais être
  confondus.
- **Trame** — `FAILLE`. Deux à trois bassins en fosse, larges, bord franc,
  franchis par des passerelles ; nappes de vapeur au-dessus.
- **Silhouette** — des **surfaces sombres et planes** entourées de vapeur claire.
- **Arrangements** — `ECHELON`, `DEGAGEMENT`.
- **Obstacles** — `B_BASSIN` *(nappe en fosse, signature)*, `B_PASSERELLE`
  *(réemploi U06)*, `B_PILE` de pièces refroidies.
- **Props gros** — pont de trempe, panier de charge, échangeur.
- **Props moyens** — pièce brute sur tréteaux, pompe, bac de décantation.
- **Micro** — flaques, sels blancs, gouttes, buée.
- **Sol** — **béton mouillé sombre**, réfléchissant, avec des **auréoles de
  calcaire clair**. C'est le seul sol chaud-thème à reflet froid, et le
  contraste avec F01/F02 est l'effet principal du biome. Traces :
  `RUISSELLEMENT`, `CORROSION`.
- **Background** — le fond du bassin, sous la surface.
- **Verticaux** — les ponts de trempe.
- **Lumière** — **la plus froide du thème** : l'émissif de lieu recule, la vapeur
  diffuse une lumière blanche. La palette de région (§C) travaille ici à plein.
- **Gameplay** — la faille sépare sans cacher, la vapeur cache sans séparer. Les
  deux ensemble donnent un terrain où l'on perd la horde de vue **sans** perdre
  la ligne de tir : cas unique.
- **Signature** — **la vapeur blanche dans un lieu orange**.
- **Assets neufs** — partage la primitive `FAILLE` avec U06 ; nappe d'eau.
- **Mutualisés** — `champ()` de vapeur (U06), passerelles (U06).
- **Complexité** moyenne *(la primitive est payée par U06)* · **Différenciation 5/5**

---

### F04 · LE LAMINOIR — `laminoir` — **P1**

- **Concept** — le train de laminage. Une file de cages, une barre incandescente
  qui court entre elles.
- **Fonction** — on étire. Le lieu le plus **rapide** du thème.
- **Trame** — `RUBAN` : un train de 5 à 8 cages alignées sur une ligne unique
  traversant tout le quartier, avec des rouleaux entre elles.
- **Silhouette** — une file d'objets identiques sur un axe strict. Différent du
  convoyeur d'Usine : ici les objets sont **gros et espacés**, pas continus.
- **Arrangements** — `AXE` uniquement.
- **Obstacles** — `B_CAGE_LAMINOIR` *(bloc à deux tourillons, signature)*,
  `B_TABLE_ROULEAUX` *(barre basse à rouleaux, franchissable visuellement)*,
  `B_MASSIF`.
- **Props gros** — bobineuse, cisaille volante, refroidisseur.
- **Props moyens** — cylindre de rechange, chandelle, pupitre de cage.
- **Micro** — **calamine** (paillettes noires brillantes), eau de
  refroidissement, marques de rouleau.
- **Sol** — **calamine sur béton** : sombre, moucheté, brillant par plaques. Un
  sol qui **scintille**, et rien d'autre dans le dépôt ne fait ça.
- **Background** — aucun.
- **Verticaux** — les cages.
- **Lumière** — une **ligne** incandescente qui court le long de la table, en
  boucle continue et périodique. C'est de la matière, pas un télégraphe.
- **Gameplay** — un couloir unique et très long : la meilleure ligne de tir du
  jeu, et le pire endroit pour se faire encercler. À réserver aux cartes qui ont
  d'autres quartiers ouverts.
- **Signature** — **la barre orange qui file**.
- **Assets neufs** — `B_CAGE_LAMINOIR`, la barre courante (un `champ()` linéaire).
- **Mutualisés** — la table à rouleaux réemploie `formeChaine`.
- **Complexité** moyenne · **Différenciation 5/5**

---

### F05 · LA SABLERIE — `sablerie` — **P1** *(remplace « les cuves »)*

- **Concept** — la halle de moulage. Des châssis de sable au sol, en rangées, un
  sol noir et poudreux.
- **Fonction** — on met en forme. C'est là que la fonte prend un corps.
- **Trame** — `NEF` basse : une halle large, plafond bas suggéré par des poutres,
  remplie de rangées de châssis.
- **Silhouette** — **une nappe de rectangles bas et réguliers**. Le seul biome du
  jeu dont l'occupation soit majoritairement **au ras du sol**.
- **Arrangements** — `SEMIS` régulier, `AXE`.
- **Obstacles** — `B_CHASSIS` *(cadre bas rempli de sable, signature,
  franchissable par le tir)*, `B_MALAXEUR` *(cylindre sur pieds)*, `B_PILE` de
  châssis vides.
- **Props gros** — malaxeur, secoueuse, tas de sable préparé.
- **Props moyens** — modèle en bois, spatule, seau de noir de fonderie.
- **Micro** — **sable répandu**, empreintes de pas nettes (le seul sol du jeu qui
  garde une empreinte), poussière noire.
- **Sol** — **sable de fonderie** : mat, noir, absorbant, **sans aucun reflet**.
  C'est le sol le plus sombre et le plus mat du dépôt, à l'opposé exact de la
  calamine de F04. Traces : `POUSSIERE` noire, empreintes.
- **Background** — aucun.
- **Verticaux** — presque rien, et c'est la signature : **un biome plat**.
- **Lumière** — le sable **ne renvoie rien** : les sources y meurent vite, les
  halos sont courts. Effet physique lisible sans un mot.
- **Gameplay** — occupation basse : on voit loin, on tire loin, mais les châssis
  arrêtent les corps. **Le seul biome où la ligne de vue et la ligne de marche
  divergent complètement**, et c'est un vrai cas tactique.
- **Signature** — **l'empreinte de pas dans le sable**.
- **Assets neufs** — `B_CHASSIS`, matière `sable` (mate, non réfléchissante).
- **Mutualisés** — `P_MOULE` existe déjà et devient le prop moyen.
- **Complexité** faible · **Différenciation 5/5**

---

### F06 · LE PARC À MINERAI — `minerai` — **P1**

- **Concept** — le stock de matière première à ciel ouvert. Des tas coniques, une
  roue-pelle, de la poussière rouge.
- **Fonction** — on stocke le brut. L'amont du thème.
- **Trame** — `CRIBLE` de **tas coniques**, très gros, sur un réseau lâche.
- **Silhouette** — des **cônes**. Le seul objet non anguleux et non usiné du
  dépôt : sa base est irrégulière, son sommet arrondi.
- **Arrangements** — `CONTRASTE`, `DEGAGEMENT`.
- **Obstacles** — `B_TAS` *(cône irrégulier, signature — bord flou)*,
  `B_CONVOYEUR_MAITRE` (réemploi U01, ici en surélevé), `B_TREMIE`.
- **Props gros** — roue-pelle, godet, culbuteur de wagon.
- **Props moyens** — jalon, bâche déchirée, pneu de chargeuse.
- **Micro** — **coulées de minerai** en éventail au pied des tas, empreintes de
  chenilles, poussière rouge en suspension.
- **Sol** — **poussière de minerai** : le seul sol **rouge-brun saturé** du
  dépôt, et le seul dont la couleur vient de ce qui est stocké dessus.
  Traces : `POUSSIERE` rouge, chenilles.
- **Background** — aucun, mais l'air est chargé : voile permanent.
- **Verticaux** — la roue-pelle, silhouette treillis très reconnaissable.
- **Lumière** — plein jour diffus, ombres molles. **Le biome le plus clair du
  thème**, ce qui est en soi une rupture.
- **Gameplay** — peu d'objets, énormes, à bord flou. On les contourne longtemps,
  on ne s'y adosse pas franchement. La visibilité réduite par la poussière rend
  les armes de zone meilleures que les armes précises.
- **Signature** — **le tas conique à bord flou**.
- **Assets neufs** — silhouette `tas` (bord irrégulier — première forme non
  polygonale nette du dépôt), roue-pelle.
- **Mutualisés** — convoyeur (U01), trémie (U09).
- **Complexité** moyenne · **Différenciation 5/5**

---

### F07 · L'ÉBARBAGE — `ebarbage` — **P2**

- **Concept** — le parachèvement. Postes de meulage en alvéoles, gerbes
  d'étincelles, pièces brutes partout.
- **Fonction** — on nettoie la pièce. Le lieu le plus **bruyant** et le plus
  encombré.
- **Trame** — `PEIGNE` : une échine de circulation, 6 à 8 **alvéoles** ouvertes
  d'un côté, séparées par des écrans de protection.
- **Silhouette** — une file de niches. Structure très lisible, très différente
  des travées du magasin (fermées sur trois côtés, larges et courtes).
- **Arrangements** — `SEMIS` dense, `ECHELON`.
- **Obstacles** — `B_ECRAN` *(panneau de protection, signature — mince, opaque,
  haut)*, `B_ETABLI` (réemploi U04), `B_PILE` de pièces brutes.
- **Props gros** — meuleuse sur potence, tourelle d'aspiration, banc de contrôle.
- **Props moyens** — disque usé, cage à pièces, bac à copeaux.
- **Micro** — **poussière métallique brillante**, disques cassés, marques de
  brûlure sur les écrans.
- **Sol** — **béton semé de poussière métallique** : gris sombre avec des points
  clairs très fins. Traces : `RAYURES`, `SOUILLURE`.
- **Background** — aucun.
- **Verticaux** — les écrans, qui coupent la vue à mi-hauteur.
- **Lumière** — **des gerbes d'étincelles périodiques** dans les alvéoles :
  sources brèves, blanches, décalées les unes des autres. Le seul lieu à
  lumière stroboscopique du dépôt, et elle reste **continue et périodique**.
- **Gameplay** — beaucoup de couverts courts, aucune ligne longue. On combat en
  poche, la horde arrive par l'échine. Très bon en mêlée, difficile pour les
  armes lentes.
- **Signature** — **la gerbe d'étincelles qui sort d'une alvéole**.
- **Assets neufs** — `B_ECRAN`, gerbe (réemploi direct des particules d'impact).
- **Mutualisés** — établi (U04), `P_OUTILLAGE` (existe).
- **Complexité** faible · **Différenciation 4/5**

---

### F08 · LE CRASSIER — `crassier` — **P2**

- **Concept** — le terril de scories. Une montagne de déchet vitreux, dehors, à
  l'abandon partiel.
- **Fonction** — on jette le laitier. La sortie basse du thème.
- **Trame** — `COURONNE` **inversée** : un terril central bas mais très large
  (1,6 vue), infranchissable au centre, avec des ravines qui le découpent.
- **Silhouette** — une masse **basse et étalée**, à bord dentelé. Elle se lit par
  sa couleur avant sa forme.
- **Arrangements** — `NOYAU`, `CONTRASTE`.
- **Obstacles** — `B_TERRIL` *(masse à bord dentelé, signature)*, `B_WAGON`
  *(châssis basculant, réemploi de la silhouette `chassis`)*, `B_TAS` (F06).
- **Props gros** — culbuteur, benne à laitier, tracteur enlisé.
- **Props moyens** — bloc de laitier vitrifié, rail tordu, bidon.
- **Micro** — **éclats vitreux** qui accrochent la lumière, mâchefer, mauvaises
  herbes (les premières du thème — le crassier est ce qui commence à mourir).
- **Sol** — **scorie** : gris-noir, granuleux, ponctué d'éclats **verts-bleus**
  vitrifiés. Le seul sol du thème avec une teinte froide, et il l'a par la
  chimie, pas par le goût. Traces : `CORROSION`, `DECHETS`.
- **Background** — aucun.
- **Verticaux** — le terril, seul relief.
- **Lumière** — presque aucune source propre : c'est le biome **sombre** du
  thème, et c'est ce qui l'oppose à F06 (clair) et F01 (brûlant).
- **Gameplay** — une masse centrale basse mais large : on la contourne, on ne la
  franchit pas. Les ravines font des poches. Très bon pour perdre la horde.
- **Signature** — **l'éclat vitreux vert dans un thème orange**.
- **Assets neufs** — `B_TERRIL` (bord dentelé), matière `scorie vitrifiee`.
- **Mutualisés** — `P_SCORIE` existe ; `chassis` (U03) ; herbes = `P_BROUSSE`
  (Friche), premier pont assumé entre deux thèmes.
- **Complexité** faible · **Différenciation 5/5**

---

### F09 · LE STOCK DE BRAMES — `brames` — **P2**

- **Concept** — le stockage des demi-produits. Des piles de brames et de lingots,
  toutes du même gabarit, sous pont.
- **Fonction** — on entrepose du chaud qui refroidit. Le tampon du thème.
- **Trame** — `CRIBLE` très **régulier** de piles rectangulaires identiques, avec
  deux allées de service larges.
- **Silhouette** — la régularité pure : des pavés identiques, alignés, espacés.
- **Arrangements** — `ECHELON`, `AXE`.
- **Obstacles** — `B_BRAME` *(pile de plaques, signature — strié sur la
  tranche)*, `B_MASSIF`, `B_TABLE_ROULEAUX` (F04).
- **Props gros** — pont magnétique, chevalet, chariot cavalier.
- **Props moyens** — cale de bois carbonisée, plaque d'identification, chaîne.
- **Micro** — traces de chaleur en auréole autour des piles récentes, calamine,
  numéros peints à la craie.
- **Sol** — **béton à joints larges, roussi par plaques** — les auréoles disent
  où une brame chaude a été posée. Le seul sol du dépôt qui garde la **mémoire
  d'un objet absent**. Traces : `CENDRES`, `ROULAGE`.
- **Background** — aucun.
- **Verticaux** — le pont magnétique, dessiné en surplomb.
- **Lumière** — les piles récentes **rougeoient faiblement à leur base**, les
  vieilles non. Un gradient thermique lisible **dans un même écran**.
- **Gameplay** — crible régulier : allées orthogonales, angles morts courts,
  excellente lisibilité. Le biome le plus « propre » tactiquement du thème,
  utile comme respiration entre deux quartiers chargés.
- **Signature** — **l'auréole roussie autour d'une pile**.
- **Assets neufs** — habillage `pile striee`, auréole de sol.
- **Mutualisés** — `P_LINGOTS` existe ; silhouette `pile` (U02).
- **Complexité** faible · **Différenciation 4/5**

---

### F10 · LES CONDUITES — `conduites` — **P2**

- **Concept** — le réseau de vent et de gaz. Des conduites énormes, des
  compensateurs, des vannes de la taille d'un homme.
- **Fonction** — on souffle. Hors du gradient thermique : c'est l'infrastructure.
- **Trame** — `RUBAN` : deux à trois conduites de très gros diamètre traversant
  le quartier, **surélevées sur béquilles**, avec des passages dessous.
- **Silhouette** — des **tubes** épais et continus, sur pieds. On passe **sous**
  eux, ce qui n'arrive nulle part ailleurs.
- **Arrangements** — `AXE`, `ASYMETRIE`.
- **Obstacles** — `B_CONDUITE` *(existe, à promouvoir à l'échelle trame)*,
  `B_BEQUILLE` *(pied en A, signature — l'obstacle réel, la conduite ne bloque
  pas)*, `B_VANNE`.
- **Props gros** — compensateur, vanne papillon, purgeur.
- **Props moyens** — échelle à crinoline, boîte de manœuvre, calorifuge.
- **Micro** — condensats, brides boulonnées, repères de couleur, suies.
- **Sol** — **béton propre, sec, rayé par les ombres des conduites** — la seule
  matière du dépôt dont la lecture vienne d'un objet au-dessus. Traces :
  `POUSSIERE`, `CORROSION`.
- **Background** — aucun.
- **Verticaux** — les conduites, **au-dessus du joueur**. Le vocabulaire de
  verticalité le plus fort du thème.
- **Lumière** — les conduites projettent des **bandes d'ombre franches** : le sol
  est zébré, et c'est l'identité visuelle du biome.
- **Gameplay** — un obstacle qui ne bloque que par ses pieds : on circule
  librement mais on perd la vue par bandes. **Les béquilles font des piliers
  espacés** : très bon terrain de kite, mauvais pour la visée continue.
- **Signature** — **le sol zébré d'ombres**.
- **Assets neufs** — `B_BEQUILLE`, l'ombre portée large *(la direction de lumière
  du thème existe déjà, `lumDir()`)*.
- **Mutualisés** — `conduite()` existe intégralement ; `P_TUYAU`.
- **Complexité** faible · **Différenciation 5/5**

---

### F11 · LE RÉFRACTAIRE — `refractaire` — **P3**

- **Concept** — la maintenance lourde. Un four à l'arrêt, éventré, en cours de
  remaçonnage. Échafaudages, briques par palettes, gravats.
- **Fonction** — on répare le cœur. Le seul endroit du thème où le feu est
  **éteint**.
- **Trame** — `NEF` : la carcasse d'un four ouvert forme une halle irrégulière,
  avec des échafaudages qui la ceinturent.
- **Silhouette** — une **structure ouverte** : on voit à l'intérieur d'un objet
  qui est ailleurs opaque. Rupture forte avec F02.
- **Arrangements** — `CONTRASTE`, `SEMIS`.
- **Obstacles** — `B_FOUR_OUVERT` *(octogone échancré, signature — c'est le four
  de F02 avec un quartier retiré)*, `B_ECHAFAUD` *(treillis, coupe la vue à
  moitié)*, `B_PILE` de briques.
- **Props gros** — palette de briques réfractaires, bétonnière, ascenseur de
  chantier.
- **Props moyens** — seau de mortier, gravats, projecteur de chantier.
- **Micro** — poussière de brique **ocre clair**, éclats, bâches, plots.
- **Sol** — **gravats de brique** : ocre, clair, granuleux, très différent de
  tout le reste du thème. Traces : `POUSSIERE` ocre, `DECHETS`.
- **Background** — l'intérieur du four, sombre, par l'échancrure.
- **Verticaux** — les échafaudages.
- **Lumière** — **des projecteurs de chantier**, blancs et crus, à contre-emploi
  total de l'ambre du thème. Le biome se reconnaît à sa lumière avant sa forme.
- **Gameplay** — beaucoup de couverts partiels (échafaudages) : on voit à
  travers, on ne passe pas. Terrain très lisible et très fermé.
- **Signature** — **le four ouvert** — le même objet que F02, éteint et cassé.
  La paire F02/F11 est la meilleure narration environnementale du dossier.
- **Assets neufs** — échancrure sur `formeOctogone` (variante), `B_ECHAFAUD`.
- **Mutualisés** — tout le vocabulaire de F02, retourné.
- **Complexité** faible · **Différenciation 5/5**

---

### F12 · LES SOUFFLANTES — `soufflantes` — **P3**

- **Concept** — la salle des machines. Turbo-soufflantes alignées sur massifs,
  sol de tôle, vibration.
- **Fonction** — on fournit l'air. Le poumon.
- **Trame** — `NEF` haute et étroite : deux longs murs, une file de machines au
  centre, une passerelle de service qui longe.
- **Silhouette** — une file de gros cylindres couchés sous une voûte. Le seul
  volume **voûté** du dépôt.
- **Arrangements** — `AXE` uniquement.
- **Obstacles** — `B_SOUFFLANTE` *(cylindre couché sur massif, signature)*,
  `B_MASSIF`, `B_CONDUITE` (F10, en liaison).
- **Props gros** — filtre à air, moteur d'entraînement, pupitre.
- **Props moyens** — jauge, bidon d'huile, casier à outils.
- **Micro** — flaques d'huile irisées, boulons de massif, marques de vibration.
- **Sol** — **tôle larmée** — la seule surface métallique praticable du dépôt.
  Motif en losanges, brillante aux passages, mate ailleurs. Traces :
  `SOUILLURE`, `RAYURES`.
- **Background** — aucun.
- **Verticaux** — la voûte, suggérée par des arceaux.
- **Lumière** — reflets **anisotropes** sur la tôle : la lumière s'étire dans le
  sens du larmage. Un effet de matière que rien d'autre ne fait.
- **Gameplay** — couloir unique bordé de gros volumes : ligne de tir longue,
  latéral nul. Complémentaire de F04 (même géométrie, autre matière, autre
  éclairage) — **et c'est la limite : F04 et F12 sont la paire la plus proche du
  thème.** Elles restent distinctes par la trame (RUBAN contre NEF), le sol
  (calamine contre tôle) et la lumière (incandescente contre reflet). Si la
  mesure du §I les rapproche encore, **c'est F12 qui saute.**
- **Signature** — **la tôle larmée**.
- **Assets neufs** — matière `tole larmee`, silhouette `voute/arceau`.
- **Mutualisés** — massifs (F04), conduites (F10).
- **Complexité** faible · **Différenciation 4/5**

---

## Récapitulatif FONDERIE

| # | biome | trame | signature bâtie | sol | temp. | P |
|---|---|---|---|---|---|---|
| F01 | coulee | RUBAN rigole | regard incandescent | fonte vitrifiée | chaud | P0 |
| F02 | fusion | COURONNE four | la masse de 2 vues | dalle réfractaire | chaud | P0 |
| F03 | refroidissement | FAILLE bassin | vapeur blanche | béton mouillé | froid | P0 |
| F04 | laminoir | RUBAN train | barre qui file | calamine | chaud | P1 |
| F05 | sablerie | NEF châssis | empreinte de pas | sable noir mat | tiède | P1 |
| F06 | minerai | CRIBLE tas | cône à bord flou | poussière rouge | froid | P1 |
| F07 | ebarbage | PEIGNE alvéole | gerbe d'étincelles | poussière métallique | tiède | P2 |
| F08 | crassier | COURONNE terril | éclat vitreux vert | scorie | froid | P2 |
| F09 | brames | CRIBLE pile | auréole roussie | béton roussi | froid | P2 |
| F10 | conduites | RUBAN conduite | sol zébré d'ombres | béton sec | réseau | P2 |
| F11 | refractaire | NEF four ouvert | le four éteint | gravats de brique | tiède | P3 |
| F12 | soufflantes | NEF cylindre | tôle larmée | tôle larmée | tiède | P3 |

Douze sols distincts. Six trames : RUBAN ×3, NEF ×3, COURONNE ×2, CRIBLE ×2,
FAILLE ×1, PEIGNE ×1. **Paire la plus proche : F04/F12** — surveillée par la
matrice du §I, F12 sacrifiable.
