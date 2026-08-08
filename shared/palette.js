/* ===========================================================================
   PALETTE — la charte visuelle, en une seule source.

   Module PUR, sur le modele exact de `units.js` : il ne depend de rien, et
   `cards.js`, `classes.js` et le client l'importent. Un cycle d'import
   casserait le chargement des modules dans le navigateur.

   Pourquoi ici et pas dans une feuille de style : le canvas a besoin des
   memes couleurs que le DOM, et il ne sait pas lire une variable CSS
   autrement qu'en interrogeant `getComputedStyle` a chaque image. Deux listes
   — une en CSS, une en JavaScript — divergent au premier reglage : on a donc
   UNE table ici, et c'est le client qui pose les variables CSS a partir
   d'elle (`cssVars()`), jamais l'inverse. `public/css/tokens.css` ne contient
   pour cette raison aucune couleur : uniquement ce que le canvas n'a pas a
   connaitre (echelle typographique, grille d'espacement, rayons, durees).

   La direction : SIGNAL ET INSTRUMENTATION. L'interface est un poste de
   controle, l'arene un ecran de mesure. D'ou des fonds tres sombres et
   desatures, des filets fins, et de la couleur uniquement quand elle dit
   quelque chose.
   =========================================================================== */

/* --- fonds et surfaces -----------------------------------------------------
   Six valeurs et pas une de plus. Chaque niveau a un role : au-dela, on choisit
   un gris a l'oeil et l'ecran perd sa profondeur. */
export const SURFACE = {
  void:     "#08090d",   // la page, hors arene
  arena:    "#0f1219",   // fond de l'arene
  panel:    "#161a24",   // panneaux, cartes
  raised:   "#1e2431",   // elements interactifs
  line:     "#2a3140",   // filets
  lineSoft: "#1c222d",   // grille de l'arene, filets tres faibles
  /* Grille du sol a DEUX niveaux : un trait tous les 5 m, un trait marque tous
     les 20 m. C'est ce qui donne une echelle lisible a l'arene et rend les
     distances en metres des descriptions de cartes immediatement
     comprehensibles — sans elle, « rayon 6 m » ne veut rien dire a l'ecran. */
  gridFine:  "#171b24",
  gridMajor: "#222836",
  // Le noir pur ne sert QU'a une ombre portee : un aplat noir dans l'interface
  // creuse un trou dans l'ecran, c'est pour ca que `void` n'est pas noir.
  shadow:   "#000000",
};

/* --- DECOR PAR DIFFICULTE (lot T) ------------------------------------------
   Le joueur doit comprendre IMMEDIATEMENT ou il se trouve. Une variante par
   mode, ici et jamais ailleurs — « une couleur en dur dans `client.js` ou dans
   une feuille de style est un bug », et `cssVars()` la pousse sur `:root`.

   LA REGLE QUI CONTRAINT TOUT LE RESTE : la difficulte ne change pas les
   creatures, elle change LA MACHINE. Le contraste de la direction est conserve
   sans exception — decor froid, precis, saturation sous 18 % ; creatures
   chaudes, organiques, saturees. Teinter les monstres en cauchemar detruirait la
   seule chose qui les rend lisibles a deux cents a l'ecran, et casserait au
   passage l'identite par type.

   Corollaire : ces trois variantes ne touchent QUE le sol, la grille et le
   vignettage. Aucune ne reattribue un des six roles de la grammaire (cyan « il
   faut y aller », ambre « sortir », rouge « letal », blanc « un allie », violet
   « persistant », vert « gain ») — une seule exception et le joueur cesse de
   faire confiance au code couleur, donc lit tout au cas par cas.

   `skip` : une ligne de grille fine sur N est ETEINTE en cauchemar. C'est
   visuel et jamais un trou dans la graduation — la grille reste graduee en
   metres dans les trois modes, sinon « rayon 6 m » cesse de vouloir dire quelque
   chose a l'ecran, ce qui est sa seule raison d'exister.

   TABLEAU ORDONNE, index = celui de `DIFFICULTIES`. */
export const DECOR = [
  {
    // Calme — ardoise franchement froide, grille reguliere, vignettage leger.
    // Rien ne distrait : c'est le mode qui enseigne a lire l'espace.
    arena: "#0e1219", gridFine: "#171d28", gridMajor: "#232c3d",
    vignette: 0.40, vignetteFrom: 0.46, skip: 0, pulse: 0,
  },
  {
    // Normal — la reference. C'est l'arene que le depot a toujours eue.
    arena: SURFACE.arena, gridFine: SURFACE.gridFine, gridMajor: SURFACE.gridMajor,
    vignette: 0.55, vignetteFrom: 0.42, skip: 0, pulse: 0,
  },
  {
    /* Cauchemar — l'ardoise vire au brun, la grille perd une ligne sur trois et
       le vignettage pulse lentement. La machine est abimee, et c'est le seul
       endroit ou on a le droit de le dire : le sol PARTICIPE dans ce mode, il
       doit en avoir l'air avant meme la premiere trainee. */
    arena: "#130f10", gridFine: "#1f1a19", gridMajor: "#2e2624",
    vignette: 0.68, vignetteFrom: 0.34, skip: 3, pulse: 0.06,
  },
];

export function decorAt(diffIndex) { return DECOR[diffIndex] ?? DECOR[1]; }

/* --- texte ---------------------------------------------------------------- */
export const TEXT = {
  base:  "#e9edf5",
  dim:   "#8892a6",
  faint: "#5a6376",
};

/* --- la grammaire de couleurs ----------------------------------------------
   Fonctionnelle, jamais esthetique : une couleur dit UNE chose. La regle qui
   compte le plus est celle du rouge — jamais de rouge pour quelque chose ou il
   faut aller. Une seule exception et le joueur cesse de faire confiance au code
   couleur, donc lit tout au cas par cas, ce qui est intenable a 200 ennemis. */
export const SIGNAL = {
  go:      "#38bdf8",   // cyan   : il faut y aller
  warn:    "#f5a524",   // ambre  : danger, sortir
  lethal:  "#ef4056",   // rouge  : danger letal
  ally:    "#e9edf5",   // blanc  : ca concerne un allie
  persist: "#a855f7",   // violet : persistant, ca restera la apres
  gain:    "#34d399",   // vert   : gain, soin
};

/* LE VERT DU SOIN, et il n'y en a qu'UN.

   Il y en avait quatre : `SIGNAL.gain` sur les chiffres de soin et `MARK.ok`,
   `POWERUP_COLOR.heal` (#6fe3a0) sur le bonus au sol, et `CLASS_COLOR.soigneur`
   (#8ef0c8) sur le tir de soin, le sanctuaire, la vague de soin et la balise.
   Quatre verts qu'aucun joueur ne peut distinguer volontairement, donc quatre
   fois la meme information dite de quatre facons — c'est-a-dire aucune.

   Pire : `POWERUP_COLOR.beacon` valait exactement `CLASS_COLOR.soigneur`. Une
   balise posee au sol avait la couleur d'un joueur soigneur, ce que la charte
   interdit partout ailleurs.

   Regle : TOUT CE QUI REND DES PV OU RELEVE UN ALLIE porte `HEAL`, alias de
   `SIGNAL.gain`. Le relevement en fait partie — il restaure un allie, c'est la
   meme promesse. `CLASS_COLOR.soigneur` reste l'identite du JOUEUR et ne dit
   plus jamais « ceci soigne » : c'est la distinction entre le qui et le quoi,
   et c'est elle qui rendait la table incoherente.

   Un alias plutot qu'une valeur recopiee : deux litteraux identiques divergent
   au premier reglage, ce que ce fichier existe precisement pour empecher. */
export const HEAL = SIGNAL.gain;

/* --- raretes ---------------------------------------------------------------
   Chaque rarete a un MATERIAU et pas seulement une couleur — bordure, lueur,
   degrade, balayage : c'est ce qui la rend reconnaissable au coin de l'oeil,
   avant meme d'etre lue. Le detail du materiau vit dans la feuille de style,
   la couleur ici. Tableau ORDONNE, l'index est la rarete. */
export const RARITY_COLOR = ["#94a3b8", "#38bdf8", "#c084fc", "#fbbf24"];

/* --- categories de carte ---------------------------------------------------
   Elles REPRENNENT la grammaire fonctionnelle au lieu d'inventer cinq teintes
   de plus : offensif = ce qui fait mal, defensif = ce qu'on tient, soutien = ce
   qui rend, zone = ce qui persiste au sol, utilitaire = le reste.

   L'ecran de cartes est HORS COMBAT, et c'est ce qui autorise le rouge ici : la
   regle « jamais de rouge pour quelque chose ou il faut aller » porte sur
   l'arene, ou une erreur de code couleur coute une mort. Sur un panneau de choix
   le rouge ne designe pas un endroit, il nomme une famille d'effet — et c'est la
   seule teinte de la grammaire qui veuille dire « degats ». */
export const CARD_CATEGORY_COLOR = {
  off:     SIGNAL.lethal,
  def:     SIGNAL.go,
  soutien: SIGNAL.gain,
  zone:    SIGNAL.persist,
  util:    TEXT.dim,
};

/* --- classes ---------------------------------------------------------------
   LA COULEUR DIT LA CLASSE. C'est l'inverse de la regle d'origine — « la forme
   dit la classe, la couleur dit le joueur » — et le renversement est
   deliberé : a la table, la question posee vingt fois par manche est « ou est
   le soigneur », pas « lequel de ces deux points est Paul ». La silhouette
   continue de dire la classe, elle aussi ; les deux se renforcent au lieu de
   se partager le travail.

   Le Rempart est BLEU, le Soigneur VERT, le Tireur AMBRE ou VIOLET. Deux
   teintes de tireur parce que c'est la seule classe non unique : `tank` et
   `soigneur` portent `unique: true` dans `classes.js`, donc au plus un de
   chaque, alors qu'une table de quatre peut aligner quatre tireurs.

   Ces quatre valeurs sont AUSSI les quatre couleurs de joueur : voir
   `PLAYER_COLORS` dans `game_state.js`, qui les reprend dans cet ordre plutot
   que de recopier des litteraux. */
export const CLASS_COLOR = {
  tank:     "#7fd8e8",
  soigneur: "#8ef0c8",
  dps:      "#f4d35e",
  /* Seconde teinte de tireur. Violet, et non un second ambre : `bullet` et
     `shot` etaient deux ambres voisins et c'est le pire cas connu de ce
     depot — deux tireurs en ambre voisin auraient refait la meme erreur, entre
     coequipiers cette fois. Le violet est deja prouve comme couleur de joueur,
     c'etait la troisieme de l'ancienne table. */
  dps2:     "#d98cf0",
};

/* --- combat ----------------------------------------------------------------
   Ce qui vole et ce qui touche. Le projectile de soin est vert parce que le
   vert dit « gain » : a la table, on doit voir sans demander que le soigneur
   ne fait plus de degats.

   `bullet` et `shot` etaient DEUX AMBRES VOISINS (#f4d35e et #ff9d4d), et
   c'etait le pire cas possible : a 220 ennemis on ne distinguait plus ce qu'on
   tire de ce qu'on recoit, et l'ecran devenait une bouillie orange. Trois
   correctifs indissociables, tous les trois necessaires :

     - les balles prennent la COULEUR DE LEUR TIREUR (les quatre couleurs de
       joueur existent deja), ce qui repond du meme coup a « qui a tire ca » ;
     - les projectiles ennemis passent au ROUGE FRANC. Le rouge et non un autre
       ambre : le TIREUR est ambre (#f4d35e), un tir ennemi ambre aurait croise
       sa couleur — et depuis que la teinte dit la classe, c'est meme la couleur
       de la classe qui tire le plus ;
     - le tir hostile change de FORME (losange etire, cf. `drawBolt` cote
       client). La couleur se perd dans le chaos, la forme non — c'est la seule
       distinction qui survit a la saturation.

   `bullet` reste la teinte de REPLI : un serveur anterieur n'envoie pas le
   proprietaire de la balle, et le tir garde alors son ambre d'origine. */
export const COMBAT = {
  bullet:     "#f4d35e",          // tir des joueurs, teinte de repli
  /* Le vert du SOIN et non celui de la classe : ce projectile ne dit pas qui
     tire — les balles portent deja la couleur de leur tireur — il dit ce que le
     tir FAIT. C'etait ecrit dans ce commentaire depuis le debut, et la valeur
     disait le contraire. */
  bulletHeal: HEAL,               // tir du soigneur en mode soin
  shot:       "#ff3b5c",          // tir ennemi : rouge franc, jamais un ambre
  flash:      "#ffffff",          // eclair d'impact, silhouette blanche
  downed:     "#4a5568",          // joueur a terre
  /* Lisere permanent des joueurs. Le correctif le PLUS RENTABLE du lot : rien
     ne distinguait un joueur d'un monstre en priorite d'affichage. Il est
     dessine par la silhouette blanche deja cuite dans l'atlas, agrandie d'un
     cran sous le sprite — donc un quad de plus et aucune nouvelle image. */
  outline:    "#ffffff",
};

/* --- monstres --------------------------------------------------------------
   Teintes d'IDENTITE, une par type : c'est a quoi on reconnait ce qui arrive.
   `TINT` est un tableau ORDONNE dont l'index est le type d'ennemi, comme
   `ENEMY_TYPES` — ne jamais inserer au milieu.

   La table est structuree par MENACE et non par gout : la masse recule
   visuellement, la vitesse est chaude et saturee, le poids est sombre. Le
   violet du tireur le sort enfin du tas de rouges — c'est le type le plus
   dangereux a ignorer, et il y etait noye.

   Une SEULE teinte par type : les cinq valeurs qui donnent son volume au sprite
   (ombre, base, lumiere, accent, contour) sont derivees par `ramp()`. Ecrire
   les cinq a la main pour cinq types, c'etait vingt-cinq valeurs a garder
   coherentes — et un decalage de teinte dans l'ombre qu'on finit par oublier. */
/* Les QUATRE teintes du lot S sont ajoutees EN FIN, comme les types eux-memes.
   Elles ont ete choisies contre les cinq existantes et non dans l'absolu : la
   gamme chaude (cramoisi, orange, lie-de-vin, violet, rose) etait pleine, et une
   sixieme creature chaude aurait ete la sixieme tache rouge d'un ecran qui en
   compte deja deux cents.

     kamikaze — vert acide. Instable, toxique, et surtout la SEULE teinte du jeu
       qui ne ressemble a rien d'autre : c'est le type qu'il ne faut pas laisser
       arriver au contact, il doit se voir arriver.
     bulwark  — ocre brule. Meme famille que l'orange du runner mais deux crans
       plus sombre et desature : la masse recule visuellement, comme le
       lie-de-vin du tank.
     medic    — jade. La seule creature FROIDE du bestiaire, et c'est assume :
       c'est le type dont le reperage instantane dans une melee chaude est toute
       la mecanique. Deliberement PAS le vert `HEAL` (#34d399), qui veut dire
       « ceci te soigne » — celui-la soigne quelqu'un d'autre.
     choeur   — indigo profond. Voisin du violet du tireur en teinte, tres loin
       en valeur et en saturation ; le tireur est clair et vif, le choeur sombre
       et dense. */
export const ENEMY = {
  TINT: ["#c9364a", "#f97316", "#7f1d3a", "#a855f7", "#ec4899",
         "#84cc16", "#a16207", "#2dd4bf", "#4f46e5"],

  // Rang d'elite : or. Le halo froid des retardataires a disparu avec eux —
  // ils n'existaient que pour rendre traquables les derniers fuyards d'un
  // nettoyage de vague, et il n'y a plus de vague a nettoyer.
  elite:      "#ffd76e",
  base:       "#e05263",   // teinte de repli d'un type inconnu
};

/* --- zones de degats -------------------------------------------------------
   Gamme de rouges PROPRE aux zones, distincte de celle du boss : une annonce au
   sol et une barre de boss ne doivent jamais se confondre, et les zones se
   superposent entre elles — d'ou un rouge d'annonce, un rouge de remplissage
   plus dense, et un liseré violet qui n'ajoute QUE l'information de duree. Le
   lot 4 les retouchera contre la grammaire ; elles sont ici pour qu'il n'ait
   plus a les chercher dans le code de rendu. */
export const ZONE = {
  imminent: "#ff3c5a",   // annonce sur le point de resoudre
  edge:     "#ff5a78",   // contour dilate d'une zone persistante
  fill:     "#d62850",   // remplissage
  blast:    "#ff788c",   // souffle a la detonation
  dying:    "#ffbecd",   // trois dernieres secondes, clignotement
  persist:  "#b282ff",   // lisere de duree
};

/* Murs de verrouillage. Ils BLOQUENT et ne blessent pas : d'ou une teinte
   franchement etrangere a tout ce qui explose. */
export const WALL = { fill: "#7896ff", edge: "#aac3ff" };

/* --- BIOME (lot V) ---------------------------------------------------------
   Deux familles, et la separation est la meme que celle de `WALL` ci-dessus :
   ce qui BLOQUE et ce qui BLESSE ne partagent pas une couleur.

   Un OBSTACLE est de la matiere : gris de machine, franchement etranger a tout
   ce qui explose et distinct du bleu du verrouillage — celui-la est temporaire
   et pose par un boss, celui-ci fait partie de la carte. Un mur DESTRUCTIBLE
   reste un mur : il ne devient pas ambre parce qu'on peut le casser, un lisere
   suffit a dire qu'il cede.

   Un DANGER suit la grammaire fonctionnelle et rien d'autre : ambre pour ce
   dont il faut sortir, violet pour ce qui persiste. Il n'a PAS le rouge des
   zones de boss, et c'est le point le plus important de la table — le canal du
   telegraphe instantane appartient au boss et ne se partage pas. Un danger
   d'environnement est du SOL, pas une annonce.

   Le champ de ralentissement ne blesse pas : il est cyan-gris, la seule teinte
   de la table qui ne dise pas « sortir ». */
export const BIOME = {
  block:     "#5b6472",   // obstacle plein
  blockEdge: "#8b96a8",   // son arete, cote lumiere
  cover:     "#6d6152",   // couverture destructible : la meme matiere, plus tiede
  coverEdge: "#c9a86a",   // son lisere — c'est lui qui dit « ca cede »
  hazard:    "#e8912f",   // danger actif : l'ambre de la grammaire
  hazardIdle:"#6a5334",   // sa geometrie PERMANENTE, eteinte
  slow:      "#7fa8b8",   // champ de ralentissement : il ne blesse pas
  slip:      "#8fb6c9",   // sol glissant
};

/* --- boss ------------------------------------------------------------------
   Le boss garde sa propre gamme de rouges : c'est la seule entite du jeu assez
   grande pour porter un degrade, et sa barre doit se distinguer de tout le
   reste de l'ecran au premier coup d'oeil. Le Jumeau bleu est l'exception qui
   dit « il y en a deux ». */
export const BOSS = {
  skin:     "#ff4d6d",
  skinDark: "#8e1230",
  edge:     "#5c0b1c",
  twin:     "#9fb4ff",
  twinDark: "#2a3a7a",
  twinEdge: "#1b2450",
  maw:      "#2a0410",   // gueule
  eye:      "#ffe08a",

  barLow:   "#ff8fa3",   // texte et jauges de barre de boss
  barWarn:  "#ffd7de",   // annonce imminente : presque blanc
  barRing:  "#ffb3c1",
  barDeep:  "#7a0f26",   // pied du degrade de la barre
  barEmpty: "#783c4b",   // pastille d'une barre deja brisee
  ult:      "#a97bff",   // jauge d'ultime : violet, ca s'accumule
  ultSoft:  "#c8b4ff",
  crack:    "#ffdc78",   // fissures qui s'ouvrent avec les degats
};

/* UNE TEINTE PAR BOSS. Tableau ORDONNE indexe par `BOSS_ROSTER` — l'index
   circule deja dans le snapshot (`bo[9]`), on n'en ajoute pas un second.

   Le roster a ete concu autour de cinq VERBES differents (positionnement,
   gestion de cibles, mouvement, cohesion, separation) : mecaniquement ils n'ont
   rien a voir, et jusqu'au lot 6 ils partageaient une seule routine de dessin et
   une seule couleur. C'etait le plus gros ecart identite / contenu du jeu.

   Les cinq teintes evitent les cinq teintes d'ENEMY.TINT : un boss ne doit
   jamais se confondre avec la piétaille qu'il invoque. Elles ne suivent pas la
   grammaire de signal — ce sont des couleurs d'IDENTITE, comme celles des
   classes et des types de monstres : elles disent QUI, pas QUOI.

   `bar` et `deep` servent a la barre du HUD, qui prend la teinte de la creature
   qu'elle mesure : deux informations sur le meme adversaire ne peuvent pas etre
   de deux couleurs differentes. */
export const BOSS_SKIN = [
  // Ravageur — le rouge d'origine : c'est la reference dont les autres
  // s'ecartent, et le seul boss dont l'apparence ne change pas au lot 6.
  { skin: "#ff4d6d", dark: "#8e1230", edge: "#5c0b1c", bar: "#ff8fa3", deep: "#7a0f26" },
  // Matriarche — vert acide de couvee. La seule teinte organique du roster,
  // pour le seul boss dont la menace vient de ce qu'il PRODUIT.
  { skin: "#a8d13a", dark: "#4a6112", edge: "#2b3a08", bar: "#c6e46a", deep: "#3f5410" },
  // Metronome — acier froid. Le seul boss qui doit paraitre MECANIQUE : il ne
  // frappe jamais, il occupe l'espace.
  { skin: "#9db4c8", dark: "#3f5266", edge: "#25313d", bar: "#c2d3e2", deep: "#374857" },
  // Oracle — indigo. Il regarde, il ordonne, il ne touche pas.
  { skin: "#8b5cf6", dark: "#3b1d80", edge: "#22114d", bar: "#b79dff", deep: "#331a70" },
  // Jumeaux — orange, celui de la Brulure qu'il applique. Son frere garde le
  // bleu de l'Entrave (`twin` ci-dessus) : la couleur dit lequel on vient de
  // toucher, donc comment ne pas cumuler les deux etats par accident.
  { skin: "#ff8a3d", dark: "#8a3c05", edge: "#4d2103", bar: "#ffb782", deep: "#7a3604" },
  /* Amalgame — le boss final (lot W). PAS une sixieme teinte du meme genre : un
     blanc-os presque desature, la seule creature du jeu qui ne porte aucune
     couleur franche. C'est ce qui le distingue le mieux des cinq, parce qu'il
     est fait d'eux : leur donner une sixieme teinte vive l'aurait aligne avec
     eux au lieu de le poser au-dessus.

     Et c'est le seul boss dont la teinte ne peut pas mentir sur son verbe : il
     n'a pas de gamme a lui, il prend celle des autres — la barre en garde une
     lueur froide pour rester distincte de tout le HUD. */
  { skin: "#e8e4dc", dark: "#6f6a63", edge: "#2f2c28", bar: "#f4f1ea", deep: "#5b5750" },
];

/* --- bonus au sol ----------------------------------------------------------
   Une couleur par bonus. Elles ne suivent pas la grammaire de signal : un
   bonus n'est ni un danger ni une consigne, c'est un objet qu'on identifie de
   loin, et sa teinte sert a le reconnaitre parmi douze autres au sol.

   DEUX EXCEPTIONS, et elles vont dans l'autre sens : `heal` et `beacon` rendent
   des PV ou relevent un allie, donc ils portent `HEAL` comme tout le reste de
   cette famille. Un bonus qui soigne est d'abord un soin, ensuite un objet — et
   `beacon` valait par-dessus le marche exactement `CLASS_COLOR.soigneur`, ce qui
   donnait a une balise au sol la couleur d'un joueur. */
export const POWERUP_COLOR = {
  heal:     HEAL,
  damage:   "#f4d35e",
  rate:     "#5ab6f0",
  double:   "#d98cf0",
  shield:   "#7fd8e8",
  slow:     "#9fb4ff",
  pierce:   "#ff9d4d",
  nova:     "#ff6b8a",
  beacon:   HEAL,
  turret:   "#c8d24a",
  ricochet: "#66e0d8",
  // Teinte proche du soin mais distincte : c'est un sous-produit de la Recolte,
  // pas le vrai bonus de soin, et les deux peuvent trainer au sol en meme temps.
  fragment: "#bfe36a",
  // Blanc bleute, la seule teinte qui ne soit prise par aucun etat : c'est le
  // bonus qui les efface, il ne doit ressembler a aucun d'eux.
  purification: "#e6f2ff",
};

/* --- effets possedes -------------------------------------------------------
   La bande d'icones du HUD et les effets dessines autour du personnage lisent
   la meme table : une carte doit avoir la meme couleur dans le bandeau et dans
   l'arene, sinon la bande ne sert a rien. */
export const EFFECT_COLOR = {
  orbiteurs:     "#d98cf0",
  givre:         "#9acdff",
  drone:         "#66e0d8",
  essaim:        "#f4d35e",
  pulsar:        "#ff6b8a",
  bouclierRegen: "#7fd8e8",
  vampirisme:    "#ff8fa3",
  vif_argent:    "#9acdff",
};

/* --- entites posees par les joueurs --------------------------------------- */
export const OWNED = {
  droneAtk:   "#7fd0f0",
  /* Le mini-drone d'ESSAIM, qui fonce au contact et fait des degats. Il
     s'appelait `droneHeal` — le nom mentait, pas la couleur : l'orange convient
     a un dard qui se consume, et rien dans le jeu ne soigne en orange. */
  droneSwarm: "#f0a15f",
  orphan:     "#9aa4c0",   // proprietaire deconnecte : gris, il n'appartient plus
  bomb:       "#ff9d4d",
  bulwarkArc: "#b4f0fa",   // arc de duree restante du rempart
};

/* --- effets ponctuels ------------------------------------------------------
   Un `kind` d'effet, une paire de teintes : le corps de l'onde et son liseré
   clair. Les familles sont VOULUES — chaud pour tout ce qui explose, froid pour
   les ondes de zone, vert pour ce qui soigne, dore pour ce qui recompense. Le
   joueur n'a jamais a savoir quelle carte a produit l'onde ; il doit savoir en
   un dixieme de seconde si elle lui veut du bien. */
export const FX = {
  flash:        "#ffffff",   // voile et halo blancs
  veil:         "#fff0f5",   // voile plein ecran des evenements de boss
  ricochet:     "#66e0d8",
  ricochetCore: "#c8fffa",
  /* Balise, vague de soin, sanctuaire : le MEME vert que le reste de la famille.
     Il valait `CLASS_COLOR.soigneur`, ce qui faisait dire a un effet ce qu'il ne
     dit pas — une vague de soin ne parle pas du soigneur, elle parle du soin, et
     un Rempart avec la carte Vague de soin en produisait une de la couleur d'une
     autre classe. */
  heal:         HEAL,
  healSoft:     "#dcfff0",   // secondaire pale : une VALEUR, pas une seconde teinte
  elite:        "#ffd76e",
  blastFill:    "#ff8c3c",   // grenade
  blastEdge:    "#ffb45a",
  bombFill:     "#ff7828",   // bombe du tireur, plus dense que la grenade
  bombEdge:     "#ffc878",
  wave:         "#ebf5ff",   // onde blanche des cartes
  waveSoft:     "#9fb4ff",
  level:        "#f4d35e",   // montee de niveau
  levelSoft:    "#fff5cd",
  nova:         "#ff6b8a",   // nova, effet par defaut
  novaSoft:     "#ffc8d2",
  slow:         "#7896ff",   // voile de temps ralenti
};

/* --- marqueurs de mecanique ------------------------------------------------
   Ils PORTENT la grammaire, ils ne l'illustrent pas : c'est le seul endroit du
   jeu ou une couleur est une consigne, et ou une erreur de code couleur coute
   une mort. */
export const MARK = {
  go:    SIGNAL.go,       // occuper, se regrouper
  away:  SIGNAL.lethal,   // quitter
  break: SIGNAL.warn,     // detruire
  bait:  "#ff8f4d",       // appat : ni consigne ni danger, un objet a suivre
  ok:    SIGNAL.gain,     // condition remplie
};

/* --- HUD -------------------------------------------------------------------
   Seuils de barre de vie. Le passage a l'ambre puis au rouge se lit sans
   compter les pixels, ce qu'une barre d'une seule couleur ne permet pas. */
export const HUD = {
  low:      "#ff6b8a",
  mid:      "#f4b04a",
  ready:    "#ffffff",   // competence disponible
  notReady: "#565c6e",
  xp:       "#f4d35e",
};

/* --- echelle typographique -------------------------------------------------
   Sept tailles, et pas une de plus. Elle vit ICI et non dans `tokens.css` pour
   la meme raison que les couleurs : le canvas ecrit du texte lui aussi, et deux
   echelles — une en CSS, une en JavaScript — se seraient decalees d'un pixel
   au premier reglage.

   Le HUD dessine dans le canvas n'y est PAS encore aligne : il sort du canvas
   au lot 4, et le realigner deux fois n'aurait servi a rien. */
export const TYPE = [11, 13, 15, 19, 26, 34, 46];

/* Teinte d'une couleur avec un alpha. Remplace les `rgba(...)` en dur : la
   valeur reste dans la table, seule l'opacite varie au point d'appel.

   Le triplet est mis en cache — la fonction est appelee des centaines de fois
   par image, et reparser six caracteres hexadecimaux a chaque appel se voit au
   profileur. L'alpha, lui, est continu : il n'y a rien a mettre en cache. */
const RGB_CACHE = new Map();

export function alpha(hex, a) {
  let t = RGB_CACHE.get(hex);
  if (!t) {
    t = [parseInt(hex.slice(1, 3), 16),
         parseInt(hex.slice(3, 5), 16),
         parseInt(hex.slice(5, 7), 16)];
    RGB_CACHE.set(hex, t);
  }
  return `rgba(${t[0]},${t[1]},${t[2]},${a})`;
}

/* --- rampes de valeurs -----------------------------------------------------
   Le defaut des sprites generes au code est d'etre PLATS : un aplat, un
   contour. Ce qui donne du volume, c'est une rampe — cinq valeurs derivees
   d'une seule teinte de base.

   Le DECALAGE DE TEINTE dans l'ombre et dans la lumiere, plutot qu'un simple
   assombrissement, est ce qui distingue une palette dessinee d'un degrade
   mecanique : une ombre pure n'existe pas, elle tire toujours vers une autre
   couleur. C'est aussi la raison pour laquelle le contour n'est jamais noir —
   un noir pur ecrase la teinte et rend les cinq types identiques de loin. */
function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l * 100];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r)      h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else                h = (r - g) / d + 4;
  return [(h * 60 + 360) % 360, s * 100, l * 100];
}

function hslToHex(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  const t = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
          : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return "#" + t.map(v => Math.round((v + m) * 255).toString(16).padStart(2, "0")).join("");
}

const RAMP_CACHE = new Map();

export function ramp(hex) {
  let r = RAMP_CACHE.get(hex);
  if (r) return r;
  const [h, s, l] = hexToHsl(hex);
  /* Plancher de clarte. Sans lui, une teinte deja sombre — le bordeaux du tank
     est a 30 % — produit un contour a zero, c'est-a-dire du noir pur : la
     chose que la charte interdit, parce qu'un noir pur ecrase la teinte et
     rend les cinq types identiques a moyenne distance. Le plancher garde la
     teinte visible tout en laissant l'ecart de valeur faire son travail. */
  const dark = (drop, floor) => hslToHex(h - 8, s + 10, Math.max(floor, l - drop));
  r = {
    ombre:   dark(28, 13),
    base:    hex,
    lumiere: hslToHex(h + 6,  s - 12, Math.max(l + 16, 34)),
    accent:  hslToHex(h + 40, s + 20, Math.max(l + 30, 62)),  // yeux, plaques, points chauds
    contour: hslToHex(h - 4,  s + 14, Math.max(l - 40, 8)),
    /* CONTRE-JOUR : le liseré clair du cote OPPOSE a la lumiere principale.
       C'est la valeur qui detache une creature d'un fond sombre, et l'arene
       l'est — sans lui, une silhouette sombre sur un sol sombre ne tient que
       par son contour, c'est-a-dire par la seule chose qui ne dit rien de sa
       forme.

       Elle reste derivee de la TEINTE DU TYPE et non d'une couleur d'ambiance
       commune : un lisere identique sur les cinq types les aurait rapproches a
       moyenne distance, ce que toute la charte refuse. Tres clair mais
       desature — un contre-jour est une valeur, pas une couleur. */
    rim:     hslToHex(h + 10, Math.max(0, s - 30), Math.min(92, l + 44)),
  };
  RAMP_CACHE.set(hex, r);
  return r;
}

/* Les variables CSS, posees sur `:root` par le client au chargement. C'est la
   traduction de la table ci-dessus vers le DOM, et le seul sens autorise :
   recopier ces valeurs dans une feuille de style les ferait diverger a la
   premiere retouche. */
/* `diffIndex` (lot T) : le DECOR seul en depend — sol, grille, vignettage. Tout
   le reste de la table est identique dans les trois modes, et c'est un critere
   d'acceptation : la grammaire fonctionnelle, les raretes, les classes et les
   teintes de creature ne bougent pas d'un mode a l'autre. Par defaut normal,
   pour que l'appel du chargement — qui a lieu AVANT qu'on sache dans quelle
   salle on va entrer — rende exactement l'ancienne palette. */
export function cssVars(diffIndex = 1) {
  const D = decorAt(diffIndex);
  return {
    "--bg-void":   SURFACE.void,
    "--bg-arena":  D.arena,
    "--bg-panel":  SURFACE.panel,
    "--bg-raised": SURFACE.raised,
    "--line":      SURFACE.line,
    "--line-soft": SURFACE.lineSoft,

    "--text":       TEXT.base,
    "--text-dim":   TEXT.dim,
    "--text-faint": TEXT.faint,

    "--go":      SIGNAL.go,
    "--warn":    SIGNAL.warn,
    "--lethal":  SIGNAL.lethal,
    "--ally":    SIGNAL.ally,
    "--persist": SIGNAL.persist,
    "--gain":    SIGNAL.gain,

    "--commune":    RARITY_COLOR[0],
    "--rare":       RARITY_COLOR[1],
    "--epique":     RARITY_COLOR[2],
    "--legendaire": RARITY_COLOR[3],

    /* Couleurs d'IDENTITE de classe. Le salon les lisait deja ; le HUD en DOM
       les lit maintenant aussi — barre de bouclier, pastilles de competence. */
    "--cls-tank":     CLASS_COLOR.tank,
    "--cls-soigneur": CLASS_COLOR.soigneur,
    "--cls-dps":      CLASS_COLOR.dps,

    /* La gamme du boss. Elle descend dans le DOM depuis que la barre de boss
       est un element CSS et non plus un trace : c'est le seul element du HUD
       qui a le droit d'etre voyant, et il porte un degrade. */
    "--boss-low":      BOSS.barLow,
    "--boss-warn":     BOSS.barWarn,
    "--boss-deep":     BOSS.barDeep,
    "--boss-empty":    BOSS.barEmpty,
    "--boss-ult":      BOSS.ult,
    "--boss-ult-soft": BOSS.ultSoft,
    "--boss-eye":      BOSS.eye,

    /* Seuils de barre de vie et jauge d'experience. */
    "--hud-low": HUD.low,
    "--hud-mid": HUD.mid,
    "--xp":      HUD.xp,

    "--downed": COMBAT.downed,

    "--t-xs":  TYPE[0] + "px",
    "--t-s":   TYPE[1] + "px",
    "--t-m":   TYPE[2] + "px",
    "--t-l":   TYPE[3] + "px",
    "--t-xl":  TYPE[4] + "px",
    "--t-2xl": TYPE[5] + "px",
    "--t-3xl": TYPE[6] + "px",
  };
}
