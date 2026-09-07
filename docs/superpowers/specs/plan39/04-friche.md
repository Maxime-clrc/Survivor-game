# D — FRICHE · 13 biomes

**Thème** — abandon, ruine, récupération, dégradation. Charte inchangée
(`BIOME_SKIN.friche`, ambiante **plate** — dans une friche rien n'éclaire donc
rien ne modèle —, contour le plus faible du dépôt, grille `grilleEffacee`,
tremblement `jMax = 40`).

**L'axe du thème est une multiplication** : *ce qui a été abandonné* × *ce qui
l'a repris*. Le dépôt n'a aujourd'hui que le premier terme, et flou (« des
ruines »). Le second terme est ce qui rend deux friches irréconciliables.

```
CE QUI A ETE ABANDONNE   usine · logement · transport · chantier · depot · extraction
CE QUI L A REPRIS        la vegetation · l eau · le feu · la rouille · LES GENS
```

**Sort des quatre régions actuelles** :

| aujourd'hui | devient |
|---|---|
| `friche[0]` le champ | **éclaté** — ses trois formats de carcasse partent en R01, sa dispersion devient l'arrangement `CONTRASTE` |
| `friche[1]` le mur | **promu en trame** — c'est le prototype du `RUBAN`, il devient la trame de R04 et R13 |
| `friche[2]` le cratère | **supprimé** — nom sans objet ; la disposition devient l'arrangement `POURTOUR` |
| `friche[3]` l'effondrement | **transformé en R02 · L'usine effondrée** — il aura enfin quelque chose d'effondré |

---

### R01 · LA CASSE — `casse` — **P0**

- **Concept** — la casse automobile. Des carcasses **empilées**, une grue à
  grappin, des allées entre les piles.
- **Fonction** — on démonte pour revendre. Un abandon **organisé**.
- **Trame** — `CRIBLE` de piles de véhicules, hautes, sur un réseau irrégulier,
  avec deux allées de service traversantes.
- **Silhouette** — des **empilements verticaux** irréguliers. Rien d'autre dans
  le jeu n'empile.
- **Arrangements** — `ECHELON`, `CONTRASTE`.
- **Obstacles** — `B_PILE_EPAVES` *(empilement de châssis, signature)*,
  `B_CARCASSE` *(existe, trois formats)*, `B_CLOTURE` (réemploi U05).
- **Props gros** — grue à grappin, presse à voitures, bac à pièces.
- **Props moyens** — moteur déposé, portière, pneus empilés, batterie.
- **Micro** — **verre brisé** en nappes brillantes, boulons, taches d'huile
  sèche, herbe entre les piles.
- **Sol** — **terre battue huileuse** : sombre, tassée, avec des flaques irisées.
  Traces : `SOUILLURE`, `ROULAGE` de chenilles.
- **Background** — aucun.
- **Verticaux** — les piles, et la grue.
- **Lumière** — aucune source propre. Le biome le plus sombre du thème, et c'est
  l'huile qui renvoie le peu qu'il y a.
- **Gameplay** — allées orthogonales bordées de hauts couverts opaques : très
  bon kite, très mauvaise lisibilité. La horde surgit d'entre les piles.
- **Signature** — **la pile de voitures**.
- **Assets neufs** — silhouette `pile` d'épaves (variante de `pile`, U02) ;
  la grue à grappin.
- **Mutualisés** — `carcasse()` existe entièrement ; `chassis` de U03 ;
  `P_CARCASSE`, `P_BIDON`, `P_DEBRIS`.
- **Complexité** faible · **Différenciation 5/5**

---

### R02 · L'USINE EFFONDRÉE — `effondree` — **P0** *(remplace « l'effondrement »)*

- **Concept** — une halle industrielle dont **la toiture est par terre**. La
  charpente forme un enchevêtrement de poutres au sol, les murs tiennent encore.
- **Fonction** — c'était l'ancêtre du thème Usine. Narration inter-thèmes.
- **Trame** — `NEF` **cassée** : deux murs longs debout, et entre eux une
  charpente **couchée** — des poutres obliques, longues, franchissables par
  endroits.
- **Silhouette** — des obliques. **Le seul biome du jeu où les lignes ne sont ni
  horizontales ni verticales**, et ça se lit instantanément.
- **Arrangements** — `CONTRASTE`, `SEMIS`.
- **Obstacles** — `B_POUTRE` *(poutre treillis couchée en oblique, signature)*,
  `B_PAN` *(pan de mur debout, existe sous `B_MUR`)*, `B_MACHINE_MORTE`
  *(carcasse de machine — le vocabulaire d'Usine, rouillé)*.
- **Props gros** — tôle de toiture froissée, machine renversée, cuve éventrée.
- **Props moyens** — poutrelle, bloc de béton, tôle ondulée, câble pendant.
- **Micro** — gravats fins, verre de lanterneau, **flaques sous les trous de
  toiture** — chaque flaque dit un trou au-dessus.
- **Sol** — **béton industriel éclaté** avec des **plaques de gravats** aux
  endroits d'effondrement. Traces : `FISSURES`, `POUSSIERE`.
- **Background** — aucun, mais les trous de toiture sont des **taches de ciel**
  claires, dessinées comme des baies au sol.
- **Verticaux** — les pans de mur, très hauts et très minces.
- **Lumière** — **des puits de lumière** verticaux sous les trous : quelques
  zones claires dans un lieu noir. Le meilleur contraste du thème.
- **Gameplay** — les obliques donnent des couloirs **non orthogonaux**, uniques
  dans le jeu : la horde prend des trajectoires en biais, le kite ne se fait plus
  en aller-retour. Les poutres franchissables par endroits font des raccourcis
  connus des habitués.
- **Signature** — **la poutre oblique**.
- **Assets neufs** — silhouette `poutre treillis` **en oblique** (le dépôt n'a
  aucun obstacle non aligné aux axes — impact technique, §K).
- **Mutualisés** — `ruinePan()`, `murBas()`, `eboulisPied()` existent.
- **Complexité** **forte** (l'oblique touche la collision) · **Différenciation 5/5**

---

### R03 · LE CHANTIER ABANDONNÉ — `chantier` — **P0**

- **Concept** — un bâtiment jamais fini. Structure nue, banches, plots, une grue
  immobile.
- **Fonction** — l'argent est parti avant la fin. **Un abandon sans usure** : ce
  qui est là est neuf et déjà mort.
- **Trame** — `CRIBLE` de **poteaux de structure** sur trame régulière — c'est
  une ossature de bâtiment, donc une grille parfaite d'appuis — et rien entre.
- **Silhouette** — une **grille de points** verticaux. On voit très loin entre
  eux : le biome le plus ouvert du thème.
- **Arrangements** — `SEMIS` régulier, `DEGAGEMENT`.
- **Obstacles** — `B_POTEAU_NU` *(poteau béton, signature — fin, bloque le
  corps, presque pas la vue)*, `B_BANCHE` *(panneau de coffrage debout)*,
  `B_PLOT` *(bloc béton bas, destructible)*.
- **Props gros** — bétonnière, tas de sable, palette de parpaings.
- **Props moyens** — brouette, ferraillage en botte, plot de chantier, tourets.
- **Micro** — **barrières Heras** couchées, rubans de chantier déchirés,
  empreintes de pluie dans le sable, laitance.
- **Sol** — **dalle brute non finie** : béton clair, laitance, **fers en attente
  qui dépassent** (motif de points réguliers). Un sol qui dit « inachevé » et non
  « détruit », ce qui n'existe nulle part ailleurs. Traces : `POUSSIERE` claire.
- **Background** — aucun.
- **Verticaux** — la grue, immobile — et **elle ne bouge pas**, contrairement à
  tout ce qui bouge ailleurs. L'immobilité est ici l'information.
- **Lumière** — plein jour cru, ombres nettes portées par les poteaux. **Le biome
  le plus clair du thème** et l'opposé exact de R01.
- **Gameplay** — grille régulière de couverts **minces** : on voit la horde
  arriver de loin, on peut se cacher du tir mais pas du regard. Excellent pour
  les armes précises, faible pour les zones.
- **Signature** — **le fer en attente qui sort de la dalle**.
- **Assets neufs** — `B_POTEAU_NU`, `B_BANCHE`, motif de fers en attente.
- **Mutualisés** — `P_GRILLAGE`, `P_PANNEAU` ; le tas de sable vient de F05.
- **Complexité** faible · **Différenciation 5/5**

---

### R04 · LA VOIE FERRÉE — `voie` — **P1**

- **Concept** — un faisceau de voies désaffecté. Ballast, rails rouillés, wagons
  à l'arrêt, herbe entre les traverses.
- **Fonction** — on ne dessert plus. **Le transport abandonné.**
- **Trame** — `RUBAN` : trois à cinq voies parallèles traversant le quartier,
  avec des **wagons immobilisés** dessus qui font les vrais obstacles ; les rails
  eux-mêmes ne bloquent pas.
- **Silhouette** — des lignes parallèles au sol **et** des volumes longs posés
  dessus. La combinaison est unique.
- **Arrangements** — `AXE`, `ASYMETRIE`.
- **Obstacles** — `B_WAGON` *(châssis long, signature)*, `B_BUTOIR` *(masse
  courte en bout de voie)*, `B_PAN`.
- **Props gros** — bogie déposé, tampon, aiguillage, plaque tournante.
- **Props moyens** — traverse empilée, tire-fond, lanterne, borne kilométrique.
- **Micro** — **herbe entre les traverses** (le seul semis en ligne du jeu),
  éclisses, graisse séchée, ballast répandu.
- **Sol** — **ballast** : gros grain, gris clair, très texturé, **rayé par les
  voies**. Le seul sol du dépôt qui porte une **direction imposée**. Traces :
  `POUSSIERE`, `CORROSION` le long des rails.
- **Background** — aucun.
- **Verticaux** — les wagons, plus hauts que tout au sol.
- **Lumière** — plate, extérieure. Quelques lanternes mortes (`P_TUBE` éteint).
- **Gameplay** — couloirs parallèles séparés par des wagons : on change de voie
  aux intervalles. **Kite en peigne** sans l'être : la structure est un ruban et
  se joue comme un peigne, ce qui est un cas hybride intéressant.
- **Signature** — **l'herbe qui pousse en ligne entre les traverses**.
- **Assets neufs** — `B_WAGON` (silhouette `chassis`, U03), matière `ballast`.
- **Mutualisés** — `P_RAIL` existe (Nébuleuse) ; `P_BROUSSE` en semis linéaire.
- **Complexité** faible · **Différenciation 5/5**

---

### R05 · LE TERRAIN REPRIS — `repris` — **P1**

- **Concept** — la végétation a gagné. Bosquets denses, ronces, un bâtiment à
  peine visible sous la masse verte.
- **Fonction** — plus rien. **Le seul biome du jeu où le vivant domine le bâti.**
- **Trame** — `COURONNE` végétale : un **bosquet massif** au centre du quartier
  (1,3 vue), infranchissable, avec des percées ; des lisières irrégulières
  autour.
- **Silhouette** — une masse **organique** à bord dentelé et **mouvante** — les
  bords des bosquets ondulent lentement (matière, continu, périodique).
- **Arrangements** — `NOYAU`, `CONTRASTE`.
- **Obstacles** — `B_BOSQUET` *(masse végétale à bord irrégulier, signature —
  bloque, semi-opaque)*, `B_RONCE` *(bande basse, destructible)*, `B_PAN`
  *(pan de mur à demi enseveli)*.
- **Props gros** — arbre isolé, souche, bâtiment noyé sous le lierre.
- **Props moyens** — buisson, tas de branches, poteau tordu envahi.
- **Micro** — feuilles, graines, mousse sur le béton, racines qui soulèvent une
  dalle.
- **Sol** — **humus sur béton** : le béton n'apparaît plus que par plaques, entre
  des zones de terre et de mousse. **Le seul sol vert du dépôt**, et il est
  désaturé (`PROP.vert` existe déjà). Traces : `null` dominant + racines.
- **Background** — aucun.
- **Verticaux** — les arbres, plus hauts que le bâti restant. Renversement.
- **Lumière** — **tachetée** : la canopée découpe la lumière en taches
  irrégulières qui **dérivent lentement**. Effet de matière unique dans le
  dépôt.
- **Gameplay** — masse centrale semi-opaque : on voit **des silhouettes** à
  travers sans pouvoir tirer proprement. Les ronces destructibles se dégagent au
  tir — le terrain s'ouvre au fil de la manche, comme au marché du Secteur mais
  organiquement.
- **Signature** — **la lumière tachetée qui bouge**.
- **Assets neufs** — `B_BOSQUET` (bord organique), matière `humus`, filtre de
  canopée.
- **Mutualisés** — `P_BROUSSE` existe et devient le semis dominant ;
  `champ()` pour l'ondulation.
- **Complexité** moyenne · **Différenciation 5/5**

---

### R06 · LE PARKING EFFONDRÉ — `parking` — **P1**

- **Concept** — un parking à étages dont une dalle s'est affaissée. Des piliers
  réguliers, une dalle penchée, des voitures écrasées dessous.
- **Fonction** — on stationnait. **La ruine par le poids.**
- **Trame** — `NEF` à piliers : une grille régulière de piliers ronds, et une
  **dalle inclinée** qui couvre un tiers du quartier — donc un tiers du sol est
  **à l'ombre franche** et le reste au clair.
- **Silhouette** — une **forêt de piliers ronds réguliers** avec une masse
  penchée dessus. Régularité + accident : la combinaison est la signature.
- **Arrangements** — `SEMIS` régulier, `ASYMETRIE`.
- **Obstacles** — `B_PILIER` *(cylindre, signature — le seul obstacle rond fin
  du thème)*, `B_DALLE_PENCHEE` *(masse oblique, réemploi de l'oblique de R02)*,
  `B_CARCASSE` (écrasée).
- **Props gros** — voiture écrasée, cage d'ascenseur, rampe cassée.
- **Props moyens** — barrière de parking, borne, extincteur, plot.
- **Micro** — **marquage de places** peint (des rectangles réguliers au sol
  dont plus rien n'occupe l'intérieur), flèches, numéros, gravats.
- **Sol** — **enrobé de parking** lisse et clair, **couvert de son marquage
  intact** — le sol le mieux conservé du thème, et c'est ce qui rend la ruine
  cruelle. Traces : `FISSURES`, `DECHETS`.
- **Background** — aucun.
- **Verticaux** — les piliers, la dalle penchée au-dessus.
- **Lumière** — **la zone d'ombre franche sous la dalle**, avec un bord net. Un
  biome à deux éclairages dans une même vue : rien d'autre n'a ça.
- **Gameplay** — la forêt de piliers est le meilleur terrain de **rupture de
  ligne de vue** du jeu : on se déplace à couvert continu. La zone d'ombre est un
  vrai choix tactique (on y voit mal, on y est mal vu).
- **Signature** — **les places peintes vides**.
- **Assets neufs** — `B_PILIER` (cylindre fin), l'ombre de dalle (une zone
  d'assombrissement ancrée au monde, cousine de `drawOmbre`).
- **Mutualisés** — l'oblique de R02, `P_MARQUAGE`, `P_CARCASSE`.
- **Complexité** moyenne · **Différenciation 5/5**

---

### R07 · LA ZONE CONTAMINÉE — `contaminee` — **P2**

- **Concept** — un dépôt de produits qui a fui. Fûts corrodés, sol taché, rien
  ne pousse.
- **Fonction** — quelque chose a mal tourné. **Le seul biome du thème qui soit
  dangereux par lui-même.**
- **Trame** — `FAILLE` : une **fosse de rétention** longue, aux bords francs,
  pleine d'un effluent sombre, franchie par deux passages.
- **Silhouette** — une nappe **colorée** dans un thème gris-vert. La couleur est
  la silhouette.
- **Arrangements** — `POURTOUR`, `ECHELON`.
- **Obstacles** — `B_FUT_MASSE` *(groupe de fûts, signature, destructible)*,
  `B_MERLON` *(butte de terre linéaire)*, `B_PAN`.
- **Props gros** — cuve percée, big-bag éventré, camion-citerne.
- **Props moyens** — fût seul, palette de bidons, panneau de danger, combinaison
  abandonnée.
- **Micro** — **cristallisations** en bordure de flaque, mousse chimique,
  oiseaux morts (un seul, rare — l'objet le plus narratif du dossier), sol nu.
- **Sol** — **terre stérile tachée** : brune, craquelée, avec des **auréoles
  colorées** (jaune-vert désaturé) qui débordent des flaques. Traces :
  `CORROSION`, auréoles.
- **Background** — le fond de la fosse.
- **Verticaux** — presque rien : **la stérilité se dit par l'absence**, y compris
  de hauteur.
- **Lumière** — une **fluorescence très faible** au bord des flaques, la seule
  lumière propre du thème. Elle est froide et elle ne rassure pas.
- **Gameplay** — le thème a déjà `HZ_POOL` et `HZ_EMBER` ; ce biome les **groupe
  et les rend lisibles** par le sol. On y joue en lisant le sol, ce qui est le
  contrat du §12.
- **Signature** — **l'auréole colorée qui déborde d'une flaque**.
- **Assets neufs** — auréoles de sol (réemployables en U06), fluorescence de
  bord.
- **Mutualisés** — `P_BIDON` existe ; `FAILLE` payée par U06.
- **Complexité** faible · **Différenciation 5/5**

---

### R08 · LA CITÉ — `cite` — **P2**

- **Concept** — des barres d'habitation vidées. Cages d'escalier ouvertes,
  balcons, fenêtres borgnes.
- **Fonction** — **on habitait ici.** Le seul biome du thème à échelle humaine,
  et le seul qui parle de gens.
- **Trame** — `PEIGNE` : trois à cinq **barres** parallèles très longues, avec
  des porches traversants réguliers qui les percent.
- **Silhouette** — des **façades**, c'est-à-dire des lignes hautes et régulières
  percées de trous réguliers. Aucun autre biome de Friche n'a de façade.
- **Arrangements** — `AXE`, `ASYMETRIE`.
- **Obstacles** — `B_BARRE` *(longue masse percée de porches, signature)*,
  `B_CAGE_ESCALIER` *(volume vertical accolé)*, `B_CONTENEUR` *(benne à
  ordures)*.
- **Props gros** — carcasse de voiture brûlée, banc, transformateur de pied
  d'immeuble.
- **Props moyens** — poubelle, matelas, antenne parabolique tombée, poteau.
- **Micro** — **linge oublié**, jouets, verre de fenêtre, tags, herbe dans les
  joints de dallage.
- **Sol** — **dallage de cour** : grandes dalles béton irrégulières, joints
  herbeux, avec des **restes de jeux peints** (marelle, terrain). Le sol qui
  raconte le plus du dépôt. Traces : `FISSURES`, `DECHETS`.
- **Background** — aucun, mais les **porches** laissent voir de l'autre côté :
  des trouées de clair dans les façades.
- **Verticaux** — les barres, plus hautes que tout le thème.
- **Lumière** — les barres jettent de **longues ombres parallèles**, comme les
  conduites de F10 mais à une autre échelle. Aucune source propre : tout est
  éteint depuis longtemps.
- **Gameplay** — couloirs très longs entre les barres, franchissables aux
  porches. **La géométrie la plus contraignante du dossier** — à limiter à un
  quartier par carte, comme la galerie technique.
- **Signature** — **la marelle effacée**.
- **Assets neufs** — `B_BARRE` (silhouette percée), `B_CAGE_ESCALIER`.
- **Mutualisés** — façades partagées avec le Secteur (habillages différents :
  béton nu contre enseignes) ; `P_PARABOLE` existe.
- **Complexité** moyenne · **Différenciation 5/5**

---

### R09 · LE DÉPÔT ÉVENTRÉ — `depot` — **P2**

- **Concept** — un entrepôt sans toit. Les racks tiennent encore, tordus, et il
  pleut dedans.
- **Fonction** — c'était le magasin de l'Usine. Narration inter-thèmes, deuxième
  paire après F02/F11.
- **Trame** — `NEF` **sans couverture** : les murs et les racks sont là, le
  plafond n'existe plus.
- **Silhouette** — la structure de U02 **tordue**. La reconnaissance passe par la
  comparaison, et c'est voulu.
- **Arrangements** — `ECHELON`, `CONTRASTE`.
- **Obstacles** — `B_RACK_TORDU` *(peigne déformé, signature)*, `B_PILE`
  *(palettes pourries, destructible)*, `B_PAN`.
- **Props gros** — chariot élévateur renversé, rack effondré en accordéon, cuve.
- **Props moyens** — carton détrempé, film étirable, palette cassée, bidon.
- **Micro** — flaques permanentes sous chaque trouée, mousse au pied des
  montants, papier délavé, rouille en coulée verticale.
- **Sol** — **béton détrempé** : sombre, avec des **coulées de rouille
  verticales** partant de chaque montant de rack — un sol qui montre où la
  structure meurt. Traces : `RUISSELLEMENT`, `CORROSION`.
- **Background** — aucun.
- **Verticaux** — les racks tordus, penchés — donc **non verticaux**, et c'est
  l'information.
- **Lumière** — plein ciel, plate. Rien d'ambre.
- **Gameplay** — comme U02 mais avec des travées **irrégulières** et des
  effondrements qui ferment certaines dents. La carte de kite change d'un
  quartier à l'autre.
- **Signature** — **la coulée de rouille sous un montant**.
- **Assets neufs** — variante déformée du `peigne` de U02 (habillage seul).
- **Mutualisés** — tout U02, retourné.
- **Complexité** **faible** — le meilleur rapport du dossier · **Différenciation 4/5**

---

### R10 · LA DÉCHARGE — `decharge` — **P2**

- **Concept** — le dépôt sauvage. Un monticule d'ordures compactées, des
  goélands, une odeur qu'on devine.
- **Fonction** — on jette **ici**, sans permission.
- **Trame** — `COURONNE` : un monticule central bas et large, à bord très
  irrégulier, entouré d'un anneau de déchets épars.
- **Silhouette** — proche de F08 (crassier). **La distinction se fait par la
  matière et par le mouvement** : ici c'est mou, coloré, et il y a des **plastiques
  qui claquent au vent**. Si la matrice du §I les rapproche encore, **c'est R10
  qui saute** — la Friche a d'autres candidats.
- **Arrangements** — `NOYAU`, `SEMIS`.
- **Obstacles** — `B_MONTICULE` *(masse molle, signature)*, `B_BALLE_DECHETS`
  *(cube compressé, destructible — cousin de U10)*, `B_CARCASSE`.
- **Props gros** — camion-benne enlisé, bulldozer, tas de pneus.
- **Props moyens** — électroménager, sacs, ferraille, palette.
- **Micro** — **sacs plastiques accrochés qui claquent**, papiers qui volent
  (`champ()`), verre, mouettes (silhouettes qui traversent l'écran).
- **Sol** — **détritus tassé** : hétérogène, mat, ponctué de couleurs saturées
  très localisées — le seul sol du dépôt qui ait des **taches de couleur vive**,
  et c'est le plastique qui les justifie. Traces : `DECHETS` dominant.
- **Background** — aucun.
- **Verticaux** — le monticule, les tas de pneus.
- **Lumière** — plate, avec des **reflets ponctuels** sur les plastiques : des
  scintillements qui bougent au vent.
- **Gameplay** — masse centrale à bord flou : on ne s'y adosse pas franchement,
  ce qui empêche les positions parfaites. Bon anti-camping.
- **Signature** — **le sac plastique qui claque**.
- **Assets neufs** — matière `detritus`, `champ()` de papiers volants.
- **Mutualisés** — `B_BALLE` (U10), `P_DEBRIS`, `P_BIDON`, `P_JONCHEE`.
- **Complexité** faible · **Différenciation 4/5**

---

### R11 · LA CARRIÈRE NOYÉE — `carriere` — **P3**

- **Concept** — une extraction abandonnée qui s'est remplie d'eau. Des gradins de
  roche, une eau verte immobile, du matériel resté en bas.
- **Fonction** — on a creusé puis on est parti. **Le seul biome du thème qui ne
  soit pas construit du tout.**
- **Trame** — `FAILLE` **large** : une excavation à gradins occupe la moitié du
  quartier, l'eau en occupe le fond.
- **Silhouette** — des **gradins concentriques**. Aucune autre forme du jeu n'est
  étagée.
- **Arrangements** — `POURTOUR`, `DEGAGEMENT`.
- **Obstacles** — `B_GRADIN` *(marche de roche longue, signature)*, `B_ROCHE`
  *(bloc irrégulier)`, `B_ENGIN` *(châssis d'engin de carrière)*.
- **Props gros** — concasseur, tapis de reprise, pelle enlisée.
- **Props moyens** — bloc taillé, tuyau de pompage, plot, câble.
- **Micro** — poussière de roche claire, éclats, joncs au bord de l'eau, traces
  de forage régulières sur les fronts de taille.
- **Sol** — **roche nue et poussière blanche** : le sol le **plus clair** du
  dépôt, et le seul minéral non transformé. Traces : `POUSSIERE` blanche,
  `RAYURES` de forage.
- **Background** — le fond de l'eau, vert sombre, avec ce qui y a coulé.
- **Verticaux** — les fronts de taille.
- **Lumière** — la roche claire **renvoie beaucoup** : le biome le plus lumineux
  du thème, l'exact opposé de R01. L'eau ajoute des reflets mobiles lents.
- **Gameplay** — les gradins font des couverts **longs et parallèles** à
  hauteurs différentes. L'eau est une faille très large : elle sépare
  franchement, on tire par-dessus. Excellente arène de boss.
- **Signature** — **les traces de forage régulières sur un front de taille**.
- **Assets neufs** — `B_GRADIN`, matière `roche claire`, nappe d'eau (partagée
  avec F03).
- **Mutualisés** — `FAILLE`, la nappe de F03, `chassis`.
- **Complexité** moyenne · **Différenciation 5/5**

---

### R12 · LE CAMPEMENT — `campement` — **P3**

- **Concept** — des récupérateurs se sont installés. Abris de bâche, feux,
  installations bricolées **encore vivantes**.
- **Fonction** — **on habite là maintenant.** Le seul biome habité du thème, et
  le seul du dépôt hors Secteur où quelque chose fonctionne encore.
- **Trame** — `CRIBLE` d'abris, irrégulier et serré, organisé autour de deux ou
  trois **foyers** qui font les seules sources chaudes du thème.
- **Silhouette** — des formes **souples** : bâches tendues, toits en pente, rien
  d'orthogonal. Rupture totale avec les douze autres.
- **Arrangements** — `SEMIS` dense, `CONTRASTE`.
- **Obstacles** — `B_ABRI` *(volume bâché, signature — bord souple)*,
  `B_BARRICADE` *(assemblage hétéroclite, destructible)*, `B_CONTENEUR`
  *(converti en logement)*.
- **Props gros** — brasero, citerne d'eau, groupe électrogène, antenne bricolée.
- **Props moyens** — corde à linge, jerricane, chaise, panneau solaire.
- **Micro** — **cendres de foyer**, empreintes, restes de repas, marques à la
  craie sur les murs (les seules **inscriptions manuscrites** du dépôt).
- **Sol** — **terre tassée par le passage** : des **sentiers** clairs relient les
  abris entre eux. Le seul sol du dépôt dont le motif soit **fait par des pieds**,
  et il dit tout de l'occupation. Traces : sentiers, `CENDRES`.
- **Background** — aucun.
- **Verticaux** — les antennes bricolées, les cordes à linge tendues **au-dessus
  du joueur**.
- **Lumière** — **les foyers**, la seule lumière chaude, mobile et vacillante du
  thème (mouvement continu, matière). L'ambiante plate du thème rend chaque foyer
  précieux.
- **Gameplay** — semis serré de couverts irréguliers, très mauvaise ligne de vue,
  beaucoup de recoins. Le plus « intérieur » des biomes extérieurs.
- **Signature** — **le sentier tracé par les pieds**.
- **Assets neufs** — `B_ABRI` (bord souple, bâche), foyer (source vacillante),
  sentiers de sol.
- **Mutualisés** — `B_CONTENEUR` du Secteur ; `P_TUBE` allumé (existe).
- **Complexité** moyenne · **Différenciation 5/5**

---

### R13 · LE VIADUC — `viaduc` — **P3**

- **Concept** — un ouvrage d'art routier dont deux travées sont tombées. Des
  piles massives, un tablier interrompu, des gravats au sol.
- **Fonction** — on passait **au-dessus**. Le seul biome dont l'objet principal
  n'a jamais été destiné au sol.
- **Trame** — `RUBAN` **interrompu** : une file de piles massives régulières, un
  tablier au-dessus par tronçons, et deux **brèches** où le tablier est tombé en
  travers.
- **Silhouette** — la plus reconnaissable du thème : une **ligne haute
  discontinue** portée par des masses régulières.
- **Arrangements** — `AXE`, `CONTRASTE`.
- **Obstacles** — `B_PILE_VIADUC` *(masse rectangulaire massive, signature)*,
  `B_TABLIER_TOMBE` *(dalle oblique effondrée, réemploi de l'oblique R02)*,
  `B_ROCHE` *(gravats)*.
- **Props gros** — section de garde-corps, véhicule tombé, bloc de tablier.
- **Props moyens** — panneau routier, barrière, câble de précontrainte.
- **Micro** — gravats calibrés, fers apparents, herbes dans les fissures,
  ruissellement sous les joints.
- **Sol** — **remblai et gravats** sous l'ouvrage, **enrobé routier** sur les
  tronçons debout. Deux matières dans un même quartier, séparées franchement par
  la trame — cas unique du dossier. Traces : `FISSURES`, `POUSSIERE`.
- **Background** — sous le tablier debout : **l'ombre franche** ; dans les
  brèches : le ciel.
- **Verticaux** — les piles, les plus hauts objets du thème.
- **Lumière** — alternance stricte **ombre/plein jour** le long de l'axe : on
  entre et on sort de l'ombre tous les deux écrans.
- **Gameplay** — un axe fort avec des masses infranchissables régulières : le
  meilleur terrain de « perdre et retrouver » du thème. Les zones d'ombre
  changent la lisibilité en continu.
- **Signature** — **le tablier tombé en travers**.
- **Assets neufs** — `B_PILE_VIADUC`, tablier (réemploi de l'oblique).
- **Mutualisés** — l'oblique de R02, l'ombre de dalle de R06, `P_PANNEAU`.
- **Complexité** moyenne · **Différenciation 5/5**

---

## Récapitulatif FRICHE

| # | biome | trame | signature | sol | repris par | P |
|---|---|---|---|---|---|---|
| R01 | casse | CRIBLE pile | pile de voitures | terre huileuse | la rouille | P0 |
| R02 | effondree | NEF charpente | la poutre oblique | béton éclaté | l'effondrement | P0 |
| R03 | chantier | CRIBLE poteau | fer en attente | dalle brute | rien (inachevé) | P0 |
| R04 | voie | RUBAN voie | herbe entre traverses | ballast | la végétation | P1 |
| R05 | repris | COURONNE bosquet | lumière tachetée | humus | la végétation | P1 |
| R06 | parking | NEF pilier | places peintes vides | enrobé + marquage | le poids | P1 |
| R07 | contaminee | FAILLE fosse | auréole colorée | terre stérile | la chimie | P2 |
| R08 | cite | PEIGNE barre | la marelle effacée | dallage de cour | l'abandon | P2 |
| R09 | depot | NEF rack tordu | coulée de rouille | béton détrempé | l'eau | P2 |
| R10 | decharge | COURONNE monticule | le sac qui claque | détritus | les gens | P2 |
| R11 | carriere | FAILLE gradin | traces de forage | roche claire | l'eau | P3 |
| R12 | campement | CRIBLE abri | le sentier | terre à sentiers | **LES GENS** | P3 |
| R13 | viaduc | RUBAN pile | tablier tombé | remblai + enrobé | l'effondrement | P3 |

Treize sols distincts. Trames : CRIBLE ×3, NEF ×3, RUBAN ×2, FAILLE ×2,
COURONNE ×2, PEIGNE ×1. **Paire la plus proche : R10/F08** (deux thèmes
différents, donc jamais sur la même carte — surveillée quand même).
