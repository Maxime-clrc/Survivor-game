# D — SECTEUR · 13 biomes

**Thème** — une mégapole, et plus précisément **un pont logistique posé
au-dessus d'elle**. Charte inchangée (`BIOME_SKIN.secteur`, émissif **magenta**,
`k = 0.52` le plus bas — une rue trempée renvoie —, `dir [0.86, 0.51]` quasi
horizontale — la lumière vient des vitrines —, `fond: "ville"`, grille
`grilleCaniveau`, `LED type enseigne` : neuf blocs sur dix émettent).

**Deux constantes du thème et rien d'autre** : **c'est mouillé**, et **c'est
habité**. Tout le reste varie. Le dépôt le sait déjà (« le seul lieu dont la
matière soit MOUILLEE, et l'eau est ce qui autorise le néon à exister deux fois,
en l'air et par terre ») et n'en tire qu'une région sur quatre.

**L'axe du thème est QUI PAIE.** C'est le seul axe social du dossier, et il
donne des environnements physiquement différents sans quitter la ville.

```
CORPORATIF   parvis · checkpoint · galerie          propre, froid, surveille
COMMERCANT   rue · strip · marche                   sature, chaud, encombre
HABITE       capsules · ruelle                       serre, bricole, prive
TECHNIQUE    cheminee · sous-niveau · canal · toit  fonctionnel, sale, ouvert
TRANSIT      station                                 en mouvement
```

**Sort des quatre régions actuelles** :

| aujourd'hui | devient |
|---|---|
| `secteur[0]` la rue | **S01 · La rue**, avec chaussée et trottoirs réels |
| `secteur[1]` la place | **supprimée** — catalogue de props identique à la rue, aucune identité propre |
| `secteur[2]` le marché | **transformé en S06 · Le marché** — il aura des étals |
| `secteur[3]` le parvis | **transformé en S03 · Le parvis** — il aura un monolithe |

---

### S01 · LA RUE — `rue` — **P0**

- **Concept** — l'artère commerçante. Une chaussée, deux trottoirs, des
  devantures des deux côtés, des enseignes qui débordent.
- **Fonction** — on passe et on achète. Le fond du thème.
- **Trame** — `RUBAN` : deux fronts bâtis continus de part et d'autre d'une
  **chaussée** franche, avec des **traversées** régulières et des ruelles
  latérales qui percent les fronts.
- **Silhouette** — un canyon. Deux masses continues et un vide au milieu.
- **Arrangements** — `AXE`, `CROIX` (aux carrefours).
- **Obstacles** — `B_DEVANTURE` *(existe, à promouvoir en front continu)*,
  `B_PYLONE` *(existe)*, `B_MOBILIER_URBAIN` *(abribus, kiosque, borne — bas et
  varié)*, `B_VEHICULE` *(à l'arrêt sur la chaussée, destructible)*.
- **Props gros** — kiosque, poubelle publique, terrasse, vélo-cargo.
- **Props moyens** — borne, panneau, cageot, distributeur.
- **Micro** — mégots, tickets, flaques de néon, plaques d'égout, gomme.
- **Sol** — **chaussée d'asphalte mouillé** au centre, **trottoirs de dalles**
  aux bords, séparés par un caniveau et une bordure. Trois matières dans une vue,
  et c'est ce que la région actuelle n'a pas : `P_PASSAGE` et `P_MARQUAGE` sont
  aujourd'hui des props semés, pas une voie.
- **Background** — la ville en contrebas (`fond: ville`, existe), vue par les
  caillebotis (`VITRAGE.ville`, existe).
- **Verticaux** — les enseignes en potence, qui **surplombent la chaussée**.
- **Lumière** — le maximum du thème : enseignes des deux côtés, reflets au sol.
- **Gameplay** — un couloir large avec des retraits (ruelles, renfoncements de
  devanture). Longue ligne de vue sur l'axe, courtes sur les côtés.
- **Signature** — **la bordure de trottoir**, qui sépare deux sols.
- **Assets neufs** — sol à trois matières (chaussée/caniveau/trottoir).
- **Mutualisés** — `devanture()`, `pylone()`, `P_PASSAGE`, `P_FLAQUE`,
  `P_NEON_SOL`, `P_BORNE`, `P_AFFICHE` : **tout existe**.
- **Complexité** faible · **Différenciation 4/5**

---

### S02 · LA RUELLE — `ruelle` — **P0**

- **Concept** — l'arrière. Étroite, encombrée, sans vitrine — que des portes de
  service, des gaines, des bennes, du linge tendu.
- **Fonction** — on livre et on jette. **Le dos de S01**, et la paire doit se
  lire comme telle.
- **Trame** — `NEF` **étroite** : deux murs aveugles à une demi-vue l'un de
  l'autre, sur toute la longueur du quartier, avec des recoins et des escaliers
  de secours.
- **Silhouette** — le canyon le plus **serré** du dossier. On ne voit jamais loin
  latéralement.
- **Arrangements** — `AXE` uniquement, plus `SEMIS` dans les recoins.
- **Obstacles** — `B_MUR_AVEUGLE` *(front sans ouverture, signature — il
  n'émet PAS, seule exception au profil `enseigne`)*, `B_BENNE` (U10),
  `B_ESCALIER` *(volée métallique en zigzag, signature)*.
- **Props gros** — benne, groupe de climatisation, palettes empilées.
- **Props moyens** — cageot, bidon, vélo, carton détrempé.
- **Micro** — **linge tendu au-dessus**, flaques permanentes, tags, rats
  (silhouettes fugitives), gouttes.
- **Sol** — **béton sale et détrempé**, jamais lavé, avec des **coulées** sortant
  des gaines. Le sol le plus sombre du thème.
- **Background** — presque rien : les murs montent, on ne voit pas la ville.
  **L'absence de fond est l'information** — on est enfermé.
- **Verticaux** — les escaliers de secours, le linge, les gaines.
- **Lumière** — **une seule source par écran** : une applique au-dessus d'une
  porte de service. Contraste maximal avec S01, même thème, même palette.
- **Gameplay** — couloir étroit : la horde arrive en file, le kite se fait en
  aller-retour pur. Excellent pour les armes perforantes, dangereux pour tout le
  reste. **Un quartier par carte au maximum.**
- **Signature** — **le linge tendu au-dessus de la tête**.
- **Assets neufs** — `B_ESCALIER`, `B_MUR_AVEUGLE`, le linge (`champ()`).
- **Mutualisés** — `P_GAINE`, `P_GRILLE_AIR`, `P_CAGEOT` existent ; `B_BENNE`
  vient de U10.
- **Complexité** faible · **Différenciation 5/5**

---

### S03 · LE PARVIS CORPORATIF — `parvis` — **P0**

- **Concept** — l'esplanade d'une tour. Vide, dallée, monumentale, surveillée. Un
  monolithe au centre.
- **Fonction** — on impressionne. **Le seul endroit du thème qui ne vende rien.**
- **Trame** — `COURONNE` : un **monolithe** central infranchissable (0,8 vue),
  une esplanade dallée autour, des bornes de sécurité en ceinture.
- **Silhouette** — une masse **lisse et sans détail** au milieu d'un vide. Le
  seul objet du dépôt sans texture.
- **Arrangements** — `NOYAU`, `DEGAGEMENT`.
- **Obstacles** — `B_MONOLITHE` *(masse lisse, signature)*, `B_BORNE_SEC`
  *(plot bas en file régulière)*, `B_BASSIN` *(nappe d'eau ornementale,
  réemploi F03)*.
- **Props gros** — sculpture, bac végétal taillé, mât de drapeau.
- **Props moyens** — banc de pierre, panneau directionnel, borne d'accueil.
- **Micro** — **aucun déchet**. Un sol dallé parfait, des joints réguliers, de
  l'eau propre. **L'absence de saleté est la signature.**
- **Sol** — **dallage de pierre polie**, très clair, à joints fins, **réfléchissant
  comme un miroir sous la pluie**. Le sol le plus clair et le plus lisse du
  thème.
- **Background** — la ville, vue de très haut et **dégagée** : l'esplanade est en
  surplomb.
- **Verticaux** — le monolithe.
- **Lumière** — **froide et blanche**, montante depuis le sol (encastrés). Le
  seul biome du thème sans magenta, et c'est ce qui dit « corporatif » sans un
  mot.
- **Gameplay** — grande arène ouverte avec un noyau central : la meilleure arène
  de boss du thème, et la seule où l'on voit venir de partout.
- **Signature** — **la propreté et le froid dans un thème sale et chaud**.
- **Assets neufs** — matière `pierre polie`, `B_MONOLITHE`.
- **Mutualisés** — nappe d'eau (F03), `P_BORNE`.
- **Complexité** faible · **Différenciation 5/5**

---

### S04 · LA STRIP — `strip` — **P1**

- **Concept** — le quartier des enseignes. Une saturation lumineuse totale : les
  façades sont des écrans du sol au sommet, le sol est un miroir.
- **Fonction** — on **crie**. La version maximale de S01, et donc son voisinage
  doit être surveillé — elles restent séparées par le sol, l'échelle et
  l'absence de trottoir.
- **Trame** — `RUBAN` **saturé** : les fronts sont continus, sans retrait, et
  **débordent au-dessus de la chaussée** par des passerelles publicitaires.
- **Silhouette** — un tunnel de lumière. Le fond du canyon est **fermé en haut**.
- **Arrangements** — `AXE` uniquement.
- **Obstacles** — `B_FACADE_ECRAN` *(front lumineux continu, signature)*,
  `B_TOTEM` *(colonne d'enseignes, très haute et fine)*, `B_VEHICULE`.
- **Props gros** — totem, distributeur géant, stand.
- **Props moyens** — projecteur, câblage aérien, borne, panneau.
- **Micro** — **reflets de néon au sol** qui **défilent** (les écrans changent),
  gobelets, flyers.
- **Sol** — **asphalte noir sans marquage**, entièrement recouvert de reflets
  mouvants. Le sol n'a **aucun motif propre** : il est ce qu'on projette dessus.
  C'est unique dans le dépôt, et c'est le seul sol dont le motif soit **animé**.
- **Background** — aucun : le ciel est masqué par les passerelles. **La ville
  disparaît**, et c'est ce qui distingue S04 de S01 en un coup d'œil.
- **Verticaux** — les totems, les passerelles.
- **Lumière** — **la plus forte du dépôt**, et la seule dont la teinte **change**
  lentement (cycle des écrans). Toutes les couleurs de la charte magenta-cyan.
- **Gameplay** — couloir sans retrait : aucune couverture latérale, tout se joue
  sur l'axe. Le contraste de lisibilité est ici un vrai enjeu : la horde se perd
  dans les reflets, et c'est le seul endroit où **`gfx` peut décider de ce qu'on
  voit** — donc il faut une garde (§K).
- **Signature** — **le sol qui n'a pas de couleur à lui**.
- **Assets neufs** — reflets animés au sol, `B_FACADE_ECRAN`.
- **Mutualisés** — `dessinerLed` type enseigne, `P_AFFICHE`, `P_NEON_SOL`.
- **Complexité** moyenne · **Différenciation 5/5**

---

### S05 · LES CAPSULES — `capsules` — **P1**

- **Concept** — le logement dense. Des alvéoles empilées sur trois hauteurs, des
  coursives, du linge, des câbles piratés.
- **Fonction** — **on dort ici.** L'habitat du thème.
- **Trame** — `PEIGNE` **vertical** : un mur d'alvéoles court le long du
  quartier, avec des coursives et des échelles, et des dents perpendiculaires qui
  forment des cours.
- **Silhouette** — une **grille régulière de petits trous éclairés**. Chaque
  alvéole a sa lumière propre, donc le mur est un damier lumineux.
- **Arrangements** — `SEMIS` dense, `ASYMETRIE`.
- **Obstacles** — `B_ALVEOLE` *(mur d'alvéoles, signature)*, `B_COURSIVE`
  *(passerelle basse)*, `B_CAGEOT_PILE` *(destructible)*.
- **Props gros** — groupe électrogène, citerne d'eau, antenne parabolique.
- **Props moyens** — vélo, bidon, chaise, réchaud, cordes.
- **Micro** — **linge**, jouets, plantes en pot, câbles piratés qui pendent en
  faisceaux désordonnés, autocollants.
- **Sol** — **dalle usée jonchée** : sombre, avec une **couche de vie** dessus
  (paillassons, tapis, cartons). Le seul sol du dépôt qu'on ait **aménagé**.
- **Background** — la ville, entrevue entre les blocs d'alvéoles.
- **Verticaux** — les trois niveaux d'alvéoles.
- **Lumière** — **des dizaines de petites sources**, chacune d'une teinte
  légèrement différente. Le seul biome à lumière **multi-teinte diffuse**, contre
  les grandes enseignes uniformes de S01 et S04.
- **Gameplay** — semis dense et alvéoles en cul-de-sac courts : très mauvaise
  ligne de vue, beaucoup de recoins. Le pendant urbain de R12.
- **Signature** — **le damier de petites lumières**.
- **Assets neufs** — `B_ALVEOLE` (mur percé régulier — parenté R08, autre échelle
  et autre lumière), sol jonché.
- **Mutualisés** — `P_PARABOLE`, `P_CAGEOT`, `P_MOTO` existent ; linge de S02.
- **Complexité** moyenne · **Différenciation 5/5**

---

### S06 · LE MARCHÉ — `marche` — **P1** *(remplace « le marché » actuel)*

- **Concept** — le marché couvert. Des **étals** sous auvent, une allée centrale,
  des bâches, de l'eau au sol.
- **Fonction** — on vend au détail. La version populaire de S01.
- **Trame** — `PEIGNE` : une allée centrale et deux files d'**étals**
  perpendiculaires, avec un auvent continu au-dessus.
- **Silhouette** — une répétition de **petits volumes bas sous une grande
  couverture**. Le contraste d'échelle entre l'auvent et les étals est la
  signature.
- **Arrangements** — `SEMIS` dense, `AXE`.
- **Obstacles** — `B_ETAL` *(table couverte, signature, destructible)*,
  `B_PILIER_AUVENT` *(poteau fin régulier)*, `B_CONTENEUR` (existe).
- **Props gros** — chariot, glacière, balance, présentoir.
- **Props moyens** — cageot, bassine, ventilateur, tabouret.
- **Micro** — **déchets organiques**, eau savonneuse au sol, sacs, prix écrits à
  la main, guirlandes.
- **Sol** — **carrelage industriel mouillé et savonneux** avec des **rigoles**
  d'écoulement. Le sol le plus glissant du thème, et le seul carrelé.
- **Background** — masqué par l'auvent, sauf sur les bords. Le marché est **à
  demi couvert**, ce qui est un état que rien d'autre n'a.
- **Verticaux** — l'auvent, à hauteur intermédiaire.
- **Lumière** — **des guirlandes et des tubes**, chaudes et basses, sous l'auvent.
  Une lumière qui vient d'à peine au-dessus de la tête.
- **Gameplay** — peigne d'étals destructibles : le terrain s'ouvre au fil de la
  manche. Le meilleur biome du thème pour les explosifs, et la seule structure
  qu'on peut **effacer**.
- **Signature** — **la guirlande sous l'auvent**.
- **Assets neufs** — `B_ETAL`, auvent (occlusion partielle, réemploi de l'ombre
  de dalle R06).
- **Mutualisés** — `peigne`, `P_CAGEOT`, `P_FLAQUE`.
- **Complexité** faible · **Différenciation 5/5**

---

### S07 · LA GALERIE — `galerie` — **P2**

- **Concept** — le centre commercial. Vitrines des deux côtés, sol poli, plafond
  haut, propreté maintenue.
- **Fonction** — on achète **au chaud**. Le pendant corporatif de S01.
- **Trame** — `NEF` **large et haute** : deux fronts de vitrines continues, un
  volume intérieur d'une vue et demie, des **puits de lumière** réguliers.
- **Silhouette** — des vitrines identiques, régulières, à perte de vue. La
  régularité **commerciale**, contre le désordre de S06.
- **Arrangements** — `AXE`, `CROIX`.
- **Obstacles** — `B_VITRINE` *(cadre + verre + intérieur éclairé, signature)*,
  `B_ILOT` *(kiosque central bas)*, `B_ESCALATOR` *(masse oblique — réemploi de
  l'oblique R02)*.
- **Props gros** — kiosque, jardinière, banc, borne interactive.
- **Props moyens** — poubelle chromée, mannequin, panneau promotionnel.
- **Micro** — reflets sur le sol poli, empreintes de chaussures, prospectus,
  musique visible par des haut-parleurs.
- **Sol** — **marbre synthétique poli** : très clair, très réfléchissant, à
  grands modules. Il **renvoie les vitrines** : le sol double la scène. Cousin de
  S03 (pierre polie), séparé par la couleur (chaud contre froid) et par le fait
  qu'il est **couvert** — donc sec, le seul sol sec du thème.
- **Background** — le ciel par les puits de lumière, la ville nulle part.
- **Verticaux** — les escalators, les puits.
- **Lumière** — **chaude et abondante**, venant des vitrines et des puits.
  Uniforme, sans zone d'ombre : l'inverse exact de S02.
- **Gameplay** — nef large avec des îlots centraux : bonne visibilité, couvertures
  ponctuelles. Le biome le plus « équilibré » du thème, utile comme respiration.
- **Signature** — **le sol sec** dans un thème mouillé.
- **Assets neufs** — matière `marbre poli`, `B_VITRINE` (habillage
  `verre + enseigne` sur `cadre ouvert`).
- **Mutualisés** — `devanture()` retexturé ; l'oblique de R02.
- **Complexité** faible · **Différenciation 4/5**

---

### S08 · LE CANAL — `canal` — **P2**

- **Concept** — une voie d'eau qui traverse le pont logistique. Des berges
  bétonnées, des barges à quai, des grues.
- **Fonction** — on transporte lourd. **Le seul biome du thème où l'eau soit
  autre chose qu'une flaque.**
- **Trame** — `FAILLE` : le canal traverse le quartier de bout en bout, bords
  francs, franchi par trois **ponts**.
- **Silhouette** — une **bande sombre et réfléchissante** qui coupe la vue. La
  seule grande surface homogène du thème.
- **Arrangements** — `ASYMETRIE`, `AXE`.
- **Obstacles** — `B_BARGE` *(masse longue à quai, signature)*, `B_BOLLARD`
  *(plot d'amarrage en file)*, `B_GRUE_PORTIQUE` *(portique enjambant le canal)*.
- **Props gros** — conteneur, treuil, passerelle de barge, bitte.
- **Props moyens** — pneu de défense, cordage, bidon, panneau de navigation.
- **Micro** — **irisations d'hydrocarbures** sur l'eau, mousse, déchets flottants
  qui **dérivent lentement**, algues sur les bords.
- **Sol** — **berge de béton strié** antidérapant, avec des **marches d'accès à
  l'eau**. Le seul sol du dépôt qui descende.
- **Background** — la ville, plus **le reflet des enseignes dans l'eau du
  canal** : le fond apparaît deux fois, à l'endroit et à l'envers.
- **Verticaux** — les portiques.
- **Lumière** — **le canal renvoie tout** : c'est la plus grande surface
  réfléchissante du dépôt, et elle **ondule**. La signature lumineuse du biome.
- **Gameplay** — la faille sépare franchement ; on tire par-dessus, on franchit
  aux ponts. Cas identique à U06 et R07, mais avec une **très longue ligne de
  vue** le long des berges.
- **Signature** — **le néon réfléchi qui ondule**.
- **Assets neufs** — nappe d'eau ondulante (réemploi F03 + animation),
  `B_BARGE`.
- **Mutualisés** — `FAILLE` (U06), nappe (F03), `caisson` (conteneur).
- **Complexité** moyenne · **Différenciation 5/5**

---

### S09 · LA CHEMINÉE — `cheminee` — **P2**

- **Concept** — l'extraction d'air de la mégapole. Une bouche géante qui souffle
  vers le haut, des grilles, un courant d'air permanent, de la chaleur.
- **Fonction** — la ville d'en bas respire par ici. **Ce qui justifie tout le
  reste du thème** : on est sur un pont, et voici ce qui passe à travers.
- **Trame** — `COURONNE` : une bouche circulaire énorme (1,2 vue) au centre,
  grillagée — donc **traversable par la vue et par les projectiles, pas par le
  corps** —, entourée d'un anneau de machinerie.
- **Silhouette** — un **disque lumineux** au sol qui souffle. On le voit de très
  loin, c'est le meilleur amer du dossier.
- **Arrangements** — `NOYAU`, `POURTOUR`.
- **Obstacles** — `B_BOUCHE` *(disque grillagé, signature)*, `B_VENTILO`
  *(caisson à ailettes, en anneau)*, `B_GAINE_GEANTE` *(tube épais)*.
- **Props gros** — filtre, moteur, échangeur, garde-corps.
- **Props moyens** — coffret, échelle, panneau, câble.
- **Micro** — **papiers et poussières qui montent** en spirale au-dessus de la
  bouche (un `champ()` ascendant — le seul du dépôt), suie sur les grilles.
- **Sol** — **caillebotis lourd** autour de la bouche, sec (l'air chaud sèche
  tout) puis mouillé au loin. Un **gradient d'humidité** au sol, unique.
- **Background** — **la ville, vue directement par la bouche**, très en dessous,
  avec du mouvement. `VITRAGE.ville` sert ici à pleine échelle.
- **Verticaux** — les gaines.
- **Lumière** — **la lumière monte du sol** par la bouche : contre-jour, ombres
  qui pointent vers l'extérieur en étoile. La seule lumière montante du dépôt.
- **Gameplay** — un obstacle central **transparent** : on voit la horde à
  travers, on lui tire dessus à travers, on ne peut pas la traverser. Cas
  tactique inédit et immédiatement lisible.
- **Signature** — **la poussière qui monte**.
- **Assets neufs** — `champ()` ascendant, `B_BOUCHE`, ombres en étoile.
- **Mutualisés** — `caillebotis()` et `VITRAGE.ville` existent ;
  `P_GRILLE_AIR` ; ventilation de U01.
- **Complexité** moyenne · **Différenciation 5/5**

---

### S10 · LE CHECKPOINT — `checkpoint` — **P2**

- **Concept** — le filtre corporatif. Barrières automatiques, portiques, tourelles
  éteintes, sas, marquages au sol impératifs.
- **Fonction** — on trie les gens. Le pouvoir, matérialisé.
- **Trame** — `CRIBLE` de **modules de contrôle** identiques sur une trame
  régulière, avec des couloirs de canalisation entre eux.
- **Silhouette** — une **répétition administrative** : des modules identiques,
  parfaitement alignés, avec des chicanes.
- **Arrangements** — `ECHELON`, `CROIX`.
- **Obstacles** — `B_PORTIQUE_SEC` *(cadre de détection, signature — on passe
  dessous, il ne bloque pas ; ce sont ses pieds qui bloquent)*, `B_BARRIERE`
  *(lisse basculante, basse)*, `B_MODULE_CTRL` *(guérite vitrée)*.
- **Props gros** — guérite, tourelle éteinte, scanner, plot anti-bélier.
- **Props moyens** — potelet, cordon, panneau d'interdiction, caméra.
- **Micro** — **marquages impératifs au sol** (flèches, files d'attente, zones
  interdites hachurées), aucun déchet, traces de pas usées **dans le couloir
  autorisé uniquement**.
- **Sol** — **résine grise à marquages contraignants** : le sol le plus **écrit**
  du dépôt, et il ordonne un parcours qu'on n'a plus aucune raison de suivre.
  C'est la narration environnementale la plus économique du dossier.
- **Background** — la ville, derrière une clôture.
- **Verticaux** — les portiques, les caméras sur mâts.
- **Lumière** — **froide, blanche, avec des voyants rouges éteints**. La lumière
  corporative de S03, mais anxieuse.
- **Gameplay** — chicanes régulières : le chemin le plus court n'est jamais
  droit, sans jamais être bloqué. Bon terrain de kite structuré.
- **Signature** — **le marquage au sol qu'on ignore**.
- **Assets neufs** — `B_PORTIQUE_SEC`, marquages impératifs.
- **Mutualisés** — `claire-voie` (U05), guérite = `cadre + verre` (U11).
- **Complexité** faible · **Différenciation 4/5**

---

### S11 · LA STATION — `station` — **P3**

- **Concept** — le transit. Un quai, des rames à l'arrêt, des portes palières,
  des panneaux d'affichage.
- **Fonction** — on part. Le seul biome du thème qui parle d'ailleurs.
- **Trame** — `NEF` : un quai central long, des voies de part et d'autre, des
  **rames** immobiles qui font les murs.
- **Silhouette** — deux masses longues et continues **percées de portes
  régulières**, avec un vide au milieu.
- **Arrangements** — `AXE` uniquement.
- **Obstacles** — `B_RAME` *(masse longue percée, signature)*, `B_PORTE_PALIERE`
  *(cadre vitré en file)*, `B_BANC_QUAI`.
- **Props gros** — distributeur de titres, panneau d'affichage, poubelle
  transparente.
- **Props moyens** — banc, poteau, valise abandonnée, plan mural.
- **Micro** — bande podotactile, ligne de sécurité jaune, tickets, annonces
  visibles.
- **Sol** — **granito à bande podotactile** : gris moucheté, avec une **ligne
  jaune continue** parallèle à la voie. Le seul sol du dépôt qui porte une
  **interdiction**.
- **Background** — les tunnels aux deux bouts : deux **trous noirs** dans l'axe,
  ce qui fait un point de fuite. Unique dans le dépôt.
- **Verticaux** — les rames, les panneaux suspendus.
- **Lumière** — néons de quai réguliers, plus **l'intérieur éclairé des rames**
  qui fait deux bandes lumineuses continues à hauteur d'œil.
- **Gameplay** — couloir strict avec des portes régulières comme seules brèches
  latérales : géométrie très contrainte. **Un quartier par carte.**
- **Signature** — **la ligne jaune de sécurité**.
- **Assets neufs** — `B_RAME` (silhouette percée à grande échelle), granito.
- **Mutualisés** — `B_ALVEOLE` de S05 (même primitive « masse percée »),
  `verre()`.
- **Complexité** moyenne · **Différenciation 4/5**

---

### S12 · LE TOIT — `toit` — **P3**

- **Concept** — au-dessus de tout. Groupes de climatisation, hélisurface,
  antennes, du vent, et la ville à 360°.
- **Fonction** — la machinerie du bâtiment. **Le seul endroit ouvert du thème.**
- **Trame** — `COURONNE` : une **hélisurface** peinte au centre, dégagée par
  obligation, ceinte de groupes techniques et d'un acrotère continu.
- **Silhouette** — un **grand cercle peint** vide au milieu de petits volumes
  serrés. La lisibilité la plus immédiate du dossier.
- **Arrangements** — `NOYAU` inversé (centre **vide**), `POURTOUR`.
- **Obstacles** — `B_GROUPE_CLIM` *(caisson à ailettes en batterie, signature)*,
  `B_ACROTERE` *(muret périphérique bas)*, `B_ANTENNE_MASSE` *(pylône haubané)*.
- **Props gros** — extracteur, chemin de câbles, réservoir, cabanon d'accès.
- **Props moyens** — plot de lestage, échelle, girouette, panneau.
- **Micro** — gravillons de toiture qui **bougent au vent**, flaques dans les
  creux, fientes, câbles vibrants.
- **Sol** — **gravillons sur étanchéité bitumeuse**, plus la **peinture de
  l'hélisurface** au centre. Deux matières franches, la seconde en cercle.
- **Background** — **la ville tout autour, en contrebas**, sans caillebotis : le
  fond est visible directement au bord. `fondDe("ville")` à pleine puissance.
- **Verticaux** — les antennes.
- **Lumière** — **feux d'obstacle rouges clignotants** en périphérie, plus le
  halo de la ville venant d'en bas. La lumière ne vient pas du niveau du joueur :
  rupture nette avec les onze autres.
- **Gameplay** — le seul biome **ouvert** du thème : très longue ligne de vue,
  vent (`WX_BOURRASQUE` y est chez lui). Excellente respiration entre deux
  quartiers de canyon.
- **Signature** — **le cercle peint vide**.
- **Assets neufs** — matière `gravillons`, `B_GROUPE_CLIM`.
- **Mutualisés** — `P_PARABOLE`, `P_GRILLE_AIR` ; `fondDe("ville")`.
- **Complexité** faible · **Différenciation 5/5**

---

### S13 · LE SOUS-NIVEAU — `sousniveau` — **P3**

- **Concept** — sous le pont. Collecteurs, effluent lumineux, condensation,
  passerelles de service au-dessus du vide.
- **Fonction** — on évacue. **Le seul biome du thème où l'on est en dessous.**
- **Trame** — `FAILLE` **longitudinale** : un collecteur ouvert court sur toute
  la longueur, les passerelles le bordent, et sous elles il n'y a rien.
- **Silhouette** — des passerelles étroites au-dessus d'un vide **qui brille**.
- **Arrangements** — `AXE`, `ASYMETRIE`.
- **Obstacles** — `B_COLLECTEUR` *(tube géant, signature)*, `B_PASSERELLE`
  (U06), `B_VANNE_GEANTE`.
- **Props gros** — pompe de relevage, grille de dégrillage, treuil.
- **Props moyens** — vanne, échelle à crinoline, coffret étanche, flexible.
- **Micro** — **condensation qui goutte** en continu, dépôts, mousses, rats.
- **Sol** — **caillebotis étroit au-dessus du vide**, et l'effluent en dessous.
  Le sol le plus ajouré du thème, et le seul dont **le dessous soit lumineux**.
- **Background** — **l'effluent**, magenta pâle, qui **coule lentement** sous les
  pieds. Le fond est en dessous, ce qui n'arrive nulle part ailleurs — même la
  Nébuleuse regarde vers l'horizon.
- **Verticaux** — les collecteurs, au-dessus **et** en dessous.
- **Lumière** — **elle vient d'en bas**, de l'effluent, en magenta pâle et
  ondulant. La lumière la plus étrange du dépôt, et elle est justifiée par ce
  que le lieu porte déjà (`P_NEON_SOL`, l'effluent est nommé dans les
  commentaires de `biomes.js`).
- **Gameplay** — passerelles étroites : circulation contrainte, chutes
  impossibles (aucun blocage artificiel — les bords sont des murs) mais lecture
  difficile. **Un quartier par carte.**
- **Signature** — **la lumière qui vient de sous les pieds**.
- **Assets neufs** — effluent lumineux (nappe animée émissive), `B_COLLECTEUR`.
- **Mutualisés** — `FAILLE`, `caillebotis()`, `P_PLAQUE_EGOUT`, `P_GAINE`.
- **Complexité** moyenne · **Différenciation 5/5**

---

## Récapitulatif SECTEUR

| # | biome | trame | signature | sol | qui paie | P |
|---|---|---|---|---|---|---|
| S01 | rue | RUBAN devanture | la bordure de trottoir | asphalte + trottoirs | commerçant | P0 |
| S02 | ruelle | NEF mur aveugle | le linge tendu | béton détrempé | habité | P0 |
| S03 | parvis | COURONNE monolithe | la propreté froide | pierre polie | corporatif | P0 |
| S04 | strip | RUBAN façade-écran | sol sans couleur propre | asphalte à reflets | commerçant | P1 |
| S05 | capsules | PEIGNE alvéole | damier de lumières | dalle jonchée | habité | P1 |
| S06 | marche | PEIGNE étal | la guirlande | carrelage savonneux | commerçant | P1 |
| S07 | galerie | NEF vitrine | **le sol sec** | marbre poli | corporatif | P2 |
| S08 | canal | FAILLE eau | néon réfléchi ondulant | berge striée | technique | P2 |
| S09 | cheminee | COURONNE bouche | la poussière qui monte | caillebotis + gradient | technique | P2 |
| S10 | checkpoint | CRIBLE portique | marquage qu'on ignore | résine à marquages | corporatif | P2 |
| S11 | station | NEF rame | la ligne jaune | granito + podotactile | transit | P3 |
| S12 | toit | COURONNE hélisurface | le cercle peint vide | gravillons | technique | P3 |
| S13 | sousniveau | FAILLE collecteur | lumière d'en dessous | caillebotis sur vide | technique | P3 |

Treize sols distincts. Trames : NEF ×3, COURONNE ×3, RUBAN ×2, PEIGNE ×2,
FAILLE ×2, CRIBLE ×1. **Paires surveillées : S01/S04** (séparées par le sol, le
trottoir et le fond) et **S03/S07** (séparées par sec/mouillé et chaud/froid).
