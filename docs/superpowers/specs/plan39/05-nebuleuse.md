# D — NÉBULEUSE · 12 biomes

**Thème** — infrastructure orbitale. Charte inchangée (`BIOME_SKIN.nebuleuse`,
la seule ambiante froide, `k = 0.70` le plus profond, émissif **cyan** —
le seul non ambre du dépôt —, `fond: "espace"`, grille `grilleNervure`,
`LED type feux`). **Aucune quincaillerie terrestre** : la règle écrite dans
`props.js` est juste et tient pour les douze.

**L'axe du thème est la PRESSION.** C'est le seul thème où l'on peut être
*dedans* ou *dehors*, et le dépôt possède déjà toute la machinerie pour le
montrer (`drawBaies`, `VITRAGE.espace`, `orbite`, `scintiller`) — elle ne sert
aujourd'hui qu'à un fond commun.

```
PRESSURISE   coursive · laboratoire · serre · baie de service    sol plein, hublots
DEPRESSURISE dock · cargaison · ferme · reacteur                 sol ajoure, feux
LE VIDE      derive · chantier · epave · relique                 pas de sol continu
```

Le **niveau de pression décide du sol**, donc de la plus grande surface de
l'écran, donc de la reconnaissance immédiate. C'est le levier le plus fort du
thème et il est gratuit : la mécanique de baie existe.

**Sort des quatre régions actuelles** :

| aujourd'hui | devient |
|---|---|
| `nebuleuse[0]` la dérive | **N01 · La dérive**, avec un vocabulaire propre |
| `nebuleuse[1]` le champ d'épaves | **fusionné dans N01** — c'était « la dérive avec plus de petits » |
| `nebuleuse[2]` les grands fragments | **fusionné dans N01** — c'était un facteur d'échelle |
| `nebuleuse[3]` la brèche | **transformé en N11 · L'épave éventrée** — il aura une paroi à percer |

---

### N01 · LA DÉRIVE — `derive` — **P0**

- **Concept** — un champ de débris qui flotte. Rien n'est fixe, rien n'est au
  sol, il n'y a pas de sol.
- **Fonction** — c'est ce qui reste. Le fond du thème.
- **Trame** — `CRIBLE` **irrégulier** de fragments de toutes tailles, sur un
  réseau lâche, sans axe. Le vide entre eux est majoritaire.
- **Silhouette** — des masses isolées **sans ombre portée au sol**, parce qu'il
  n'y a pas de sol. Le contraste de gabarit le plus fort du dépôt (existant, à
  conserver).
- **Arrangements** — `CONTRASTE`, `DEGAGEMENT`.
- **Obstacles** — `B_FRAGMENT` *(existe, coin cisaillé — bon)*, `B_DEBRIS`
  *(existe, destructible)*, `B_TRAVEE` *(existe, très allongé)*.
- **Props gros** — coque retournée, réservoir crevé, section de mât.
- **Props moyens** — panneau arraché, bouteille de gaz, module éventré.
- **Micro** — givre sur les arêtes, éclats en suspension, poussière qui **dérive
  en ligne droite** (pas de gravité : c'est la signature du mouvement du thème).
- **Sol** — **il n'y en a pas.** La plateforme est ajourée : le sol est fait de
  passerelles étroites et de vide. La tuile est **majoritairement transparente**,
  et `drawBaies` fait le reste — la mécanique existe et n'est utilisée qu'à 38 %
  (`BAIE_TAUX`). Ici elle monte à 65 %.
- **Background** — l'espace : nébuleuse, étoiles, `orbite`, `scintiller`.
  **Tout existe.**
- **Verticaux** — aucun. Le thème n'a pas de haut.
- **Lumière** — les feux de position (`LED type feux`), rien d'autre. Le biome le
  plus sombre du dépôt.
- **Gameplay** — beaucoup de vide, peu d'obstacles, très longue ligne de vue. La
  respiration du thème, et le meilleur terrain de boss.
- **Signature** — **le vide sous les pieds**.
- **Assets neufs** — aucun. Monter `BAIE_TAUX` par biome.
- **Mutualisés** — tout le module `decor.js` de fond.
- **Complexité** **nulle** · **Différenciation 4/5**

---

### N02 · LE DOCK — `dock` — **P0**

- **Concept** — les postes d'amarrage. Des bras d'amarrage alignés, des coques à
  quai, des passerelles télescopiques.
- **Fonction** — on accoste. C'est là que le trafic entre.
- **Trame** — `PEIGNE` : une échine de circulation et 5 à 8 **postes** alignés,
  chacun tenant une coque partielle. Cousin structurel de U03, **et
  volontairement** : le dossier assume que « quai » est une idée qui traverse
  trois thèmes, et que ce sont la matière et l'échelle qui les séparent.
- **Silhouette** — des **pinces** régulières le long d'une ligne, chacune tenant
  une masse plus grosse qu'elle.
- **Arrangements** — `AXE`, `ASYMETRIE`.
- **Obstacles** — `B_BRAS_AMARRAGE` *(pince articulée, signature)*, `B_COQUE`
  *(masse lisse énorme, partielle — elle sort du cadre)*, `B_PASSERELLE_TELE`
  *(tube articulé)*.
- **Props gros** — nourrice d'ergols, chariot de fret, plot d'ancrage.
- **Props moyens** — flexible, bouteille, coffret de service, feu d'approche.
- **Micro** — givre aux raccords, marques de choc sur les butoirs, numéros de
  poste peints, éclats.
- **Sol** — **caillebotis d'amarrage** : ajouré à 50 %, avec des **bandes pleines
  d'usure** aux passages. On voit le vide entre ses pieds sauf sur les chemins,
  et c'est une information de sécurité.
- **Background** — l'espace, plus **les coques à quai** qui masquent une partie
  du ciel — la première occlusion partielle du fond du dépôt.
- **Verticaux** — les bras, articulés, qui **bougent lentement** (matière).
- **Lumière** — feux d'approche cyan **cadencés**, un par poste, déphasés. La
  seule lumière rythmée du thème, et elle reste continue et périodique.
- **Gameplay** — le peigne donne des alvéoles courtes ouvertes sur l'échine :
  kite en zigzag, comme U02 mais avec des dents **plus courtes et plus larges**.
  Les coques partielles font des dos absolus.
- **Signature** — **la pince d'amarrage**.
- **Assets neufs** — `B_BRAS_AMARRAGE` (silhouette articulée), `B_COQUE`
  (masse lisse à très grande échelle).
- **Mutualisés** — `P_ANCRAGE` et `P_BALISE` existent ; `peigne` de U02.
- **Complexité** moyenne · **Différenciation 5/5**

---

### N03 · LE CHANTIER ORBITAL — `chantier` — **P0**

- **Concept** — une structure en cours de construction. Des **membrures nues**,
  pas de coque, on voit à travers de partout.
- **Fonction** — on assemble. **Le seul biome du dépôt qui soit intégralement
  transparent.**
- **Trame** — `CRIBLE` de membrures : un réseau régulier de poutres treillis
  formant une ossature, avec des panneaux de bordé posés par endroits seulement.
- **Silhouette** — un **grillage à grande échelle**. On voit les étoiles à
  travers toute la structure.
- **Arrangements** — `SEMIS` régulier, `DEGAGEMENT`.
- **Obstacles** — `B_MEMBRURE` *(poutre treillis, signature — bloque, ne cache
  pas)*, `B_BORDE` *(panneau plein posé, seul objet opaque)*, `B_DEBRIS`.
- **Props gros** — bras de manipulation, module en cours, nacelle de soudeur.
- **Props moyens** — bobine de câble, palette de bordé, coffret, jalon.
- **Micro** — **étincelles de soudure** ponctuelles, gouttes de métal figées en
  sphères (pas de gravité), marquages de repérage.
- **Sol** — **l'ossature elle-même** : ajouré à 80 %, le vide domine. Le sol le
  plus transparent du dossier.
- **Background** — l'espace, vu **à travers la structure entière**. Le fond
  devient un motif.
- **Verticaux** — les membrures montent hors cadre.
- **Lumière** — les soudures : des **éclairs blancs brefs et déphasés**, la seule
  lumière blanche du thème.
- **Gameplay** — obstacles qui **bloquent sans cacher** : on voit toute la horde
  en permanence mais on ne peut pas tirer partout. Cas tactique inverse de la
  brume. Excellent pour la lecture, dur pour l'exécution.
- **Signature** — **la goutte de soudure sphérique**.
- **Assets neufs** — `B_MEMBRURE` (treillis à grande échelle — partagé avec U08
  et R13).
- **Mutualisés** — `P_RAIL`, `P_ANCRAGE`, `P_MODULE` existent ; étincelles de
  F07.
- **Complexité** moyenne · **Différenciation 5/5**

---

### N04 · LA COURSIVE — `coursive` — **P1**

- **Concept** — l'intérieur pressurisé. Des couloirs larges, un sol plein, des
  hublots, des portes étanches.
- **Fonction** — on circule **dedans**. Le contrepoint indispensable du thème :
  sans lui, « dehors » ne veut rien dire.
- **Trame** — `NEF` : deux parois continues, un couloir d'une vue de large, des
  **portes étanches** régulières qui ne se ferment jamais (aucun blocage
  artificiel, §14) mais dont les cadres coupent la vue.
- **Silhouette** — des parois **pleines** d'un bord à l'autre. Le seul biome du
  thème où l'on ne voit **pas** les étoiles au sol.
- **Arrangements** — `AXE`, `CROIX`.
- **Obstacles** — `B_CLOISON_ETANCHE` *(cadre massif, signature)*,
  `B_CONSOLE` *(poste mural)*, `B_CAISSON` *(rangement encastré)*.
- **Props gros** — sas, échelle inter-pont, armoire de survie.
- **Props moyens** — extincteur, poignée, panneau de signalisation, câbleau.
- **Micro** — traces de main sur les parois, étiquettes de repérage, poussière
  dans les angles, rayures de sol.
- **Sol** — **plaques techniques pleines** : mat, gris-bleu, avec des lignes de
  repérage colorées qui **conduisent quelque part**. Le seul sol du thème qui
  soit plein, et le seul du dépôt qui porte une **signalétique directionnelle**.
- **Background** — **les hublots** : des ronds d'espace dans une paroi pleine.
  `drawBaies` sert ici à l'inverse de son usage actuel — trous rares dans du
  plein, au lieu de plein rare dans des trous.
- **Verticaux** — les cadres de porte.
- **Lumière** — **régulière et froide**, plafonniers alignés. Le biome le plus
  éclairé du thème, ce qui l'oppose franchement à N01.
- **Gameplay** — couloir large avec des cadres qui hachent la vue tous les
  400 px : ligne de tir longue mais interrompue. Effet inédit.
- **Signature** — **la ligne de repérage colorée au sol**.
- **Assets neufs** — `B_CLOISON_ETANCHE`, matière `plaque technique`.
- **Mutualisés** — `verre()` pour les hublots ; `P_MODULE`.
- **Complexité** faible · **Différenciation 5/5**

---

### N05 · LA SERRE — `serre` — **P1**

- **Concept** — l'anneau agricole. Des bacs de culture sous verre, de la
  végétation, une lumière violette de croissance.
- **Fonction** — on nourrit la station. **Le seul endroit vivant du thème.**
- **Trame** — `COURONNE` : un anneau vitré autour d'un moyeu technique, quatre
  accès radiaux, les bacs disposés en arcs concentriques.
- **Silhouette** — des **arcs**. La seule géométrie courbe régulière du dépôt.
- **Arrangements** — `POURTOUR`, `ECHELON`.
- **Obstacles** — `B_BAC_CULTURE` *(bac long courbe, signature)*,
  `B_MOYEU` *(masse centrale technique)*, `B_VITRAGE` *(paroi transparente
  courbe — bloque, ne cache pas)*.
- **Props gros** — colonne hydroponique, réservoir d'eau, pompe.
- **Props moyens** — plateau de semis, tuyau goutte-à-goutte, bac vide, outil.
- **Micro** — **feuilles flottantes** (le seul débris organique du thème),
  condensation sur le verre, racines visibles, algues.
- **Sol** — **caillebotis sur bacs** : on marche entre les cultures, et le sol
  est en partie **végétal**. Le seul vert du thème, et il est ici **saturé** —
  une exception assumée à la règle « la matière est désaturée », justifiée par le
  fait que c'est de la lumière de croissance, pas de la peinture.
- **Background** — **l'espace vu à travers le vitrage courbe**, avec la
  condensation dessus. Le fond est déformé : le seul endroit où le ciel n'est pas
  net.
- **Verticaux** — les colonnes hydroponiques, la seule verticalité **organisée**
  du thème.
- **Lumière** — **magenta-violet** de croissance. C'est la teinte du Secteur, et
  c'est le seul emprunt de charte du dossier — assumé, parce qu'une lampe
  horticole est physiquement violette, et parce que les deux thèmes ne se
  rencontrent jamais sur une carte.
- **Gameplay** — l'anneau donne un circuit fermé praticable : kite en rotation
  continue, comme U07 mais **avec de la végétation qui cache**. Les vitrages
  bloquent sans cacher, les cultures cachent sans bloquer : les deux inverses
  dans un même biome.
- **Signature** — **la lumière violette**.
- **Assets neufs** — `B_BAC_CULTURE` courbe, matière `verdure sous verre`.
- **Mutualisés** — `P_BROUSSE` retexturé ; `verre()`.
- **Complexité** moyenne · **Différenciation 5/5**

---

### N06 · LE RÉACTEUR — `reacteur` — **P1**

- **Concept** — le cœur énergétique. Une masse centrale rayonnante, des anneaux
  de radiateurs, des boucliers.
- **Fonction** — on alimente. Le seul endroit chaud d'un thème froid.
- **Trame** — `COURONNE` : un cœur central infranchissable de 1,5 vue, ceint de
  **panneaux radiateurs** rayonnants en étoile, quatre couloirs d'accès.
- **Silhouette** — une **étoile**. Des branches longues et régulières partant
  d'un centre : rien d'autre n'irradie comme ça.
- **Arrangements** — `NOYAU`, `POURTOUR`.
- **Obstacles** — `B_COEUR` *(masse à ailettes, signature)*, `B_RADIATEUR`
  *(panneau long et mince, rayonnant)*, `B_BOUCLIER` *(arc épais)*.
- **Props gros** — échangeur, conduite de caloporteur, poste de contrôle.
- **Props moyens** — vanne, coffret, sonde, panneau d'alerte.
- **Micro** — givre **d'un seul côté** des radiateurs (le côté à l'ombre),
  cristaux, marquages de rayonnement.
- **Sol** — **plaques réfractaires ajourées**, avec des **zones incandescentes**
  près du cœur : un gradient thermique lisible au sol, comme F09 mais en cyan
  vers l'orange.
- **Background** — l'espace, **balayé par la lumière du cœur** : le fond change
  de clarté selon la distance au centre.
- **Verticaux** — les radiateurs, qui sortent du plan.
- **Lumière** — **la source la plus forte du thème** et la seule chaude. Elle
  **pulse** lentement. Le contraste cyan-ambiant / orange-source est l'identité
  du biome.
- **Gameplay** — noyau infranchissable + branches rayonnantes = **secteurs
  angulaires** séparés. On change de secteur en passant près du cœur (donc au
  chaud) ou par l'extérieur (donc long). Vrai arbitrage spatial.
- **Signature** — **le givre d'un seul côté**.
- **Assets neufs** — `B_COEUR`, `B_RADIATEUR`.
- **Mutualisés** — `P_GIVRE` existe ; la gueule de four de F02, retéintée.
- **Complexité** moyenne · **Différenciation 5/5**

---

### N07 · LA CARGAISON — `cargaison` — **P2**

- **Concept** — la soute. Des conteneurs spatiaux **sanglés** sur des rails
  d'arrimage, en piles régulières.
- **Fonction** — on transporte. La logistique du thème.
- **Trame** — `CRIBLE` très régulier de conteneurs arrimés, avec des **rails
  d'arrimage** au sol qui dessinent la grille.
- **Silhouette** — des pavés identiques alignés au cordeau. La régularité la plus
  stricte du thème.
- **Arrangements** — `ECHELON`, `AXE`.
- **Obstacles** — `B_CONTENEUR_SPATIAL` *(caisson à angles renforcés, signature,
  destructible)*, `B_RAIL_ARRIMAGE` *(barre au sol, franchissable)*,
  `B_CAISSON`.
- **Props gros** — chariot d'arrimage, sangle tendue, palan.
- **Props moyens** — plot d'ancrage, bordereau, coin de calage, bouteille.
- **Micro** — sangles, codes-barres, éraflures de manutention, givre aux coins.
- **Sol** — **plancher d'arrimage** : plein, quadrillé de rails encastrés, très
  usé aux passages. Le seul sol du dépôt dont le **motif soit fonctionnel** et
  non décoratif.
- **Background** — l'espace par les portes de soute, d'un seul côté.
- **Verticaux** — les piles de conteneurs.
- **Lumière** — de service, blanche et faible, plus les feux d'arrimage cyan.
- **Gameplay** — crible régulier et **destructible** : le terrain s'ouvre au fil
  de la manche. C'est le pendant spatial du marché du Secteur, et le meilleur
  biome du thème pour les armes explosives.
- **Signature** — **la sangle tendue**.
- **Assets neufs** — habillage `conteneur spatial` sur `caisson` (partagé avec
  U03, R08, S-xx : **le meilleur asset mutualisé du dossier**).
- **Mutualisés** — `caisson` ×4 thèmes, `P_ANCRAGE`, `P_RAIL`.
- **Complexité** **faible** · **Différenciation 4/5**

---

### N08 · LE LABORATOIRE — `laboratoire` — **P2**

- **Concept** — les modules de recherche. Des cellules de confinement blanches,
  des hublots d'observation, une propreté clinique.
- **Fonction** — on étudie **ce qu'on a trouvé**. La narration du thème.
- **Trame** — `NEF` cloisonnée : un couloir central et deux files de **cellules**
  vitrées, chacune ouverte sur le couloir.
- **Silhouette** — une répétition de **cadres vitrés** de part et d'autre d'un
  axe. Cousin de U11 (contrôle) et de R08 (cité) par la structure, séparé par
  l'échelle et la matière.
- **Arrangements** — `AXE`, `SEMIS`.
- **Obstacles** — `B_CELLULE` *(cadre + verre, signature)*, `B_PAILLASSE`
  *(caisson bas long)*, `B_SAS` *(volume de transition)*.
- **Props gros** — cuve d'observation, bras manipulateur, centrifugeuse.
- **Props moyens** — portoir, écran, conteneur d'échantillon, casier.
- **Micro** — étiquettes, éclats de verre dans une cellule (une seule, celle où
  ça a mal tourné), traces de gants, marques d'incident.
- **Sol** — **résine blanche continue à plinthes arrondies** : le sol le plus
  clair du dépôt, sans joint, sans angle. Il **renvoie** la lumière au lieu de
  l'absorber, et à `k = 0.70` ça se voit énormément.
- **Background** — l'espace par les hublots des cellules extérieures.
- **Verticaux** — les cadres de cellule.
- **Lumière** — blanche, forte, **uniforme**. La rupture la plus violente du
  thème avec sa charte, et elle est justifiée : c'est un endroit qu'on veut voir.
- **Gameplay** — couloir + alvéoles vitrées : on voit dans chaque cellule sans y
  être. Terrain très lisible, beaucoup d'angles courts.
- **Signature** — **la cellule où ça a mal tourné** — une seule par quartier,
  déterministe, avec son verre brisé et ses traces.
- **Assets neufs** — matière `resine blanche`, `B_CELLULE`.
- **Mutualisés** — `verre()`, `cadre ouvert` de U11 et U13.
- **Complexité** faible · **Différenciation 5/5**

---

### N09 · LA FERME SOLAIRE — `ferme` — **P2**

- **Concept** — les champs de panneaux. Des rangées immenses, minces, orientées,
  et l'ombre qu'elles portent.
- **Fonction** — on capte. L'infrastructure la plus étendue du thème.
- **Trame** — `RUBAN` **multiple** : 4 à 6 rangées de panneaux traversant tout le
  quartier, minces, hautes, écartées largement. Les mâts sont les seuls
  obstacles ; les panneaux sont **au-dessus**.
- **Silhouette** — des lignes fines et parallèles à perte de vue, et **leurs
  ombres au sol**, qui **tournent lentement**.
- **Arrangements** — `AXE`, `DEGAGEMENT`.
- **Obstacles** — `B_MAT_SOLAIRE` *(mât fin, signature — le plus petit obstacle
  du thème)*, `B_ONDULEUR` *(caisson au pied)*, `B_TRAVEE` (existe).
- **Props gros** — panneau tombé, tourelle d'orientation, faisceau de câbles.
- **Props moyens** — coffret, capteur, jalon, débris de cellule.
- **Micro** — éclats de cellule photovoltaïque **irisés** (les seuls props
  irisés du dépôt), micro-impacts, poussière.
- **Sol** — **grille technique ajourée**, très ouverte, **rayée par les ombres
  des panneaux**. Le sol de N09 se lit par ce qui est au-dessus de lui — même
  principe que F10, autre matière, autre échelle.
- **Background** — l'espace, **haché** par les panneaux au-dessus.
- **Verticaux** — les panneaux, seuls objets **au-dessus du joueur** du thème.
- **Lumière** — **l'ombre tourne**. Un cycle très lent (matière, continu,
  périodique) : le sol change de motif au fil de la manche sans jamais rien
  annoncer. Le meilleur effet d'ambiance du dossier pour son coût.
- **Gameplay** — presque aucun obstacle réel : c'est la seconde respiration du
  thème avec N01, mais avec une **occlusion visuelle mobile**. La lisibilité
  varie lentement, ce qui pousse au repositionnement.
- **Signature** — **l'ombre qui tourne**.
- **Assets neufs** — `B_MAT_SOLAIRE`, l'ombre mobile (une passe d'assombrissement
  ancrée au monde, cousine de R06 et F10).
- **Mutualisés** — `travee()` existe ; l'ombre de dalle est le même code que R06.
- **Complexité** faible · **Différenciation 5/5**

---

### N10 · LA BAIE DE SERVICE — `service` — **P2**

- **Concept** — le hangar de maintenance pressurisé. Un vaisseau sur berceau,
  démonté, des bras robotisés autour.
- **Fonction** — on répare. Le pendant orbital de U04, et **ça doit se voir comme
  une parenté**, pas comme une répétition.
- **Trame** — `NEF` **haute** : un volume clos immense, un seul objet au centre
  (le vaisseau sur berceau), et des passerelles de service autour.
- **Silhouette** — **un seul très gros objet** dans un volume vide. Aucun autre
  biome du dossier n'est composé d'une pièce unique.
- **Arrangements** — `NOYAU`, `DEGAGEMENT`.
- **Obstacles** — `B_BERCEAU` *(support en U, signature)*, `B_COQUE` *(N02, ici
  entière et démontée)*, `B_PASSERELLE_TELE` (N02).
- **Props gros** — bras robotisé de service, tourelle de soudure, nacelle.
- **Props moyens** — panneau de bordé déposé, tréteau, servante, bouteille.
- **Micro** — copeaux en suspension, protections orange sur les arêtes,
  marquages de zone de travail, cales.
- **Sol** — **plancher de hangar plein, peint**, avec une **empreinte de berceau**
  marquée et des zones de sécurité hachurées. Cousin du sol de U04 (empreintes
  de machines) — parenté assumée, palette et échelle différentes.
- **Background** — aucun : c'est le biome **le plus fermé** du thème, et cette
  fermeture est l'information (on a mis un toit pour travailler).
- **Verticaux** — le vaisseau, plus haut que tout.
- **Lumière** — projecteurs de travail, blancs et durs, dirigés vers l'objet
  central : **l'écran a un sujet**, ce qui n'arrive nulle part ailleurs.
- **Gameplay** — un noyau énorme, du vide autour : kite en rotation pure, et le
  meilleur terrain de mini-boss du thème.
- **Signature** — **le vaisseau démonté sur son berceau**.
- **Assets neufs** — `B_BERCEAU`.
- **Mutualisés** — `B_COQUE` (N02), bras robotisé (U01), passerelle (N02).
- **Complexité** faible · **Différenciation 4/5**

---

### N11 · L'ÉPAVE ÉVENTRÉE — `epave` — **P3** *(remplace « la brèche »)*

- **Concept** — une coque **déchirée**. Une saignée traverse la structure, ouverte
  sur le vide ; d'un côté c'est pressurisé, de l'autre non.
- **Fonction** — quelque chose a percé. **Le biome qui porte l'axe du thème dans
  une seule vue.**
- **Trame** — `FAILLE` : une déchirure irrégulière, bords retournés vers
  l'extérieur, traversant tout le quartier. Trois points de franchissement.
- **Silhouette** — une **plaie** : bord non rectiligne, métal retourné, la seule
  grande forme irrégulière du thème.
- **Arrangements** — `ASYMETRIE` (dominant), `CONTRASTE`.
- **Obstacles** — `B_DECHIRURE` *(bord de faille à métal retourné, signature)*,
  `B_CLOISON_ETANCHE` (N04, ici tordue), `B_DEBRIS`.
- **Props gros** — section de coque arrachée, module éventré, mobilier soufflé.
- **Props moyens** — bouteille, panneau, câble pendant, extincteur.
- **Micro** — **givre progressif** : dense près de la déchirure, absent loin
  d'elle. Un dégradé de sol qui dit la fuite d'air, et il est unique dans le
  dépôt.
- **Sol** — **deux sols dans un quartier** : plaques pleines côté pressurisé
  (N04), rien côté vide (N01). La frontière est la déchirure. **Aucun autre
  biome ne montre son axe aussi directement.**
- **Background** — l'espace **dans** la déchirure, par une forme non
  rectangulaire — première baie à contour libre.
- **Verticaux** — les bords retournés.
- **Lumière** — les feux de secours **rouges** clignotent du côté pressurisé.
  Seule exception rouge du dépôt, réservée à ce biome, et elle est un signal
  d'urgence permanent — donc de la matière, pas un télégraphe : elle n'annonce
  rien parce qu'elle ne s'arrête jamais.
- **Gameplay** — la faille sépare l'arène en deux régimes ; le joueur choisit son
  côté et la horde doit franchir. Trois passages, donc jamais bloquant.
- **Signature** — **le dégradé de givre**.
- **Assets neufs** — baie à contour libre, `B_DECHIRURE`.
- **Mutualisés** — `FAILLE` (payée par U06), sols de N01 et N04.
- **Complexité** moyenne · **Différenciation 5/5**

---

### N12 · LA RELIQUE — `relique` — **P3**

- **Concept** — une structure **non humaine**. Géométrie non orthogonale,
  matière cristalline, aucune fonction identifiable.
- **Fonction** — on ne sait pas. Le seul biome du dossier dont la fonction soit
  **illisible**, et c'est ça qui le rend inquiétant.
- **Trame** — `COURONNE` : un massif cristallin central aux faces obliques, avec
  des excroissances régulières mais **non alignées sur les axes du monde**.
- **Silhouette** — des **obliques cristallines**. Le seul biome dont aucune arête
  ne soit horizontale ni verticale.
- **Arrangements** — `NOYAU`, `CONTRASTE`.
- **Obstacles** — `B_CRISTAL_MASSE` *(prisme oblique, signature)*, `B_ARETE`
  *(lame fine oblique)*, `B_DEBRIS` (humains, autour — on est venu voir).
- **Props gros** — matériel d'étude humain abandonné, balise, tente pressurisée.
- **Props moyens** — capteur, mât, câble, caisse d'échantillons.
- **Micro** — **motifs gravés** dans la roche cristalline, lueur interne, givre
  qui **évite** le cristal (il est tiède), et le matériel humain qui contraste.
- **Sol** — **cristal poli** : dur, réfléchissant, traversé de **veines
  lumineuses** qui pulsent lentement. Le seul sol émissif du dépôt.
- **Background** — l'espace, **réfracté** par les arêtes du cristal en bordure de
  vue.
- **Verticaux** — les prismes.
- **Lumière** — **le sol éclaire**. C'est physiquement l'inverse de tout le reste
  du dépôt, et c'est la meilleure raison qu'ait ce biome d'exister.
- **Gameplay** — obliques : trajectoires de horde non orthogonales, ricochets
  imprévisibles, angles morts inhabituels. Le biome le plus déroutant, à réserver
  à un quartier par carte.
- **Signature** — **le sol qui éclaire par dessous**.
- **Assets neufs** — `B_CRISTAL_MASSE` (oblique, partage la primitive oblique de
  R02), matière `cristal` émissive.
- **Mutualisés** — `P_CRISTAL` existe déjà et est émissif (`EMISSIF[P_CRISTAL]`) ;
  l'oblique de R02.
- **Complexité** moyenne · **Différenciation 5/5**

---

## Récapitulatif NÉBULEUSE

| # | biome | trame | signature | sol | pression | P |
|---|---|---|---|---|---|---|
| N01 | derive | CRIBLE fragment | le vide sous les pieds | ajouré 65 % | vide | P0 |
| N02 | dock | PEIGNE bras | la pince d'amarrage | caillebotis 50 % | dépressurisé | P0 |
| N03 | chantier | CRIBLE membrure | goutte sphérique | ossature 80 % | vide | P0 |
| N04 | coursive | NEF cloison | ligne de repérage | plaques pleines | pressurisé | P1 |
| N05 | serre | COURONNE bac | lumière violette | caillebotis + verdure | pressurisé | P1 |
| N06 | reacteur | COURONNE cœur | givre d'un seul côté | réfractaire ajouré | dépressurisé | P1 |
| N07 | cargaison | CRIBLE conteneur | la sangle tendue | plancher d'arrimage | pressurisé | P2 |
| N08 | laboratoire | NEF cellule | la cellule ratée | résine blanche | pressurisé | P2 |
| N09 | ferme | RUBAN mât | l'ombre qui tourne | grille ajourée | dépressurisé | P2 |
| N10 | service | NEF berceau | vaisseau démonté | plancher peint | pressurisé | P2 |
| N11 | epave | FAILLE déchirure | dégradé de givre | **deux sols** | les deux | P3 |
| N12 | relique | COURONNE cristal | le sol qui éclaire | cristal émissif | inconnu | P3 |

Douze sols distincts, dont **onze taux d'ajourage différents** — la mécanique
existante (`BAIE_TAUX`) suffit à porter la moitié de la différenciation du thème.
Trames : CRIBLE ×3, NEF ×3, COURONNE ×3, RUBAN ×1, PEIGNE ×1, FAILLE ×1.
