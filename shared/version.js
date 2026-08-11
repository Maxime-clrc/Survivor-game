/* ===========================================================================
   VERSION — LA source de verite. Module pur, sur le modele de `units.js` : il
   n'exporte qu'une chaine et ne depend de RIEN. Le serveur et le navigateur
   l'importent par le meme chemin, `resolvePath()` dans `server.js` routant deja
   `/shared/*` depuis la racine du depot.

   Elle est ici et non dans `package.json` : le paquet est `private` et n'est
   jamais publie, donc son champ `version` n'est lu par personne — alors qu'un
   navigateur ne peut pas lire un fichier hors de `public/` sans qu'on le lui
   serve. Une constante litterale, lisible telle quelle par un import ES.

   Le serveur COMPARE quand meme `package.json` a cette valeur au demarrage et
   journalise s'ils divergent. Garde-fou, pas seconde source de verite.

   ---------------------------------------------------------------------------
   COMMENT ON INCREMENTE : `minor` = le plan, `patch` = le rang du lot dedans.
   plan5 occupe donc 0.7.x, et plan6 ouvrira 0.8.0.

   La correspondance lettre -> chiffre est ECRITE ci-dessous et non calculee.
   Raison : un correctif hors lot prend le patch suivant comme un lot. Un
   quatrieme composant (0.7.1.1) sortirait de semver, et une pre-version
   (0.7.1-fix) donnerait deux formes de chaine a comparer cote client, pour la
   seule comparaison dont depend la detection d'onglet perime. Le patch cesse
   donc d'etre deductible de la lettre, et une correspondance qu'on ne peut pas
   deduire doit s'ecrire.

   Cette table est aussi le CHANGELOG que le depot n'a pas, et c'est deliberement
   ICI qu'elle vit : `shared/version.js` est le seul fichier qu'un lot livre est
   OBLIGE de toucher, donc le seul endroit ou l'on ne peut pas bumper sans dire
   ce qu'on bumpe. Un fichier a part se serait desynchronise au deuxieme lot.

     0.7.0  lot O  numero de version affiche, detection d'onglet perime
     0.7.1  lot P  segments et horloge : les vagues disparaissent au profit
                   d'un script fixe de six segments de 300 s de horde
     0.7.2  lot Q  l'experience vaut les PV detruits ; tout se reindexe sur le
                   niveau d'equipe ; une carte garantie par boss (profil v4)
     0.7.3  lot R  script strictement fixe (D2) : plus aucun scaling de
                   puissance, plancher de barre de boss et enrage
     0.7.4  lot S  bestiaire et traits : `shared/enemies.js`, neuf types,
                   six traits attaches par difficulte, `adaptType`
     0.7.5  lot T  profils de difficulte : script, roster, traits et decor par
                   mode ; les multiplicateurs ne sont plus qu'un residu
     0.7.6  lot U  evenements : une colonne du script, quatre familles, remise
                   a plein a la reussite
     0.7.7  lot V  environnement et biomes : `shared/biomes.js`, trois lieux,
                   cinq dangers, meteo, couverture destructible — et RIEN sur le
                   reseau, la geometrie se regenere des deux cotes
     0.7.8  lot W  boss final : l'Amalgame, huit barres, synthese et sceau ;
                   Oracle et Jumeaux ouverts au solo ; le plancher de barre tient
                   jusqu'au bout et la banque se vide barre par barre
     0.7.9  fusion plan5 <- develop : la grande arene et la camera (lot I), la
                   refonte des menus, les reliques (K) et le bannissement (J)
                   entrent dans le plan 5 ; les lots L, M et N sont abandonnes au
                   profit de U, S et W, qui font la meme chose en mieux integre.
                   Economie : forme du lot H (lineaire, plafonnee) sur l'unite du
                   plan 5 (le niveau). Profil v5, migration en chaine.
     0.7.10 remontee d'erreur client : le navigateur n'a pas de journal qu'on
                   relise, le serveur si — une erreur non rattrapee y arrive
                   desormais, dedupliquee et aplatie
     0.7.11 correctif de fusion : `VERSION` reimporte dans `client.js`. Sans lui
                   le module jetait A L'EVALUATION, donc tout ce qui suit restait
                   en zone morte — d'ou le second symptome, `PARTICLE_GL`
                   inaccessible au clic. UNE cause, DEUX erreurs de console
     0.7.12 correctif de fusion : `updateWave()` retire du HUD. Le bandeau de
                   vague a ete remplace par celui de segment ; l'appel etait
                   reste, et il jetait a CHAQUE IMAGE d'une manche
     0.7.13 les types d'ennemi entrent en jeu a la MINUTE DE HORDE et non au
                   niveau d'equipe : le niveau 2 arrivait a la dixieme minute,
                   donc une partie entiere se jouait contre des grunts
     0.7.14 lot X  la boucle de progression se reserre : UN NIVEAU OUVRE SON
                   ECRAN DE CARTES, la carte gratuite du boss disparait,
                   `LEVEL_XP_BASE` tombe de 6000 a 1800 (mesure : 11 -> 24
                   cartes par manche), les ACCALMIES sont retirees du script, et
                   les six etapes portent un NOM. Au passage : le marchand de
                   reliques ne s'ouvrait plus depuis le lot P — `openMerchant()`
                   etait branche sur `_endWave`, disparu avec les vagues
     0.7.15 fix : les ennemis ne se materialisent plus SOUS LES YEUX du joueur.
                   `_spawnBox` est ecretee aux bords de la salle, donc colle a un
                   mur le cote correspondant tombait a portee de vue — et la
                   camera etant clampee elle aussi, on regardait pile l'endroit
                   ou ca sortait. Mesure : 15 % des apparitions dans le champ en
                   solo, 34 % a quatre, et tres asymetriques (1901 a l'est contre
                   346 a l'ouest) — d'ou « ils sortent tous du meme cote ».
                   Zero apres correctif, hors nuees de pondeuse qui doivent
                   naitre pres de leur mere
     0.7.16 l'experience change d'unite une SECONDE fois : une valeur ECRITE par
                   type (`ENEMY_TYPES[i].xp`) multipliee par une courbe indexee
                   sur le niveau d'equipe. Les PV max reglaient l'effondrement de
                   fin de partie et creaient le symetrique — un grunt vaut 16 PV
                   au debut, donc le premier palier ne se remplissait pas.
                   Mesure : niveau 2 a 32-50 s contre « moins de la moitie apres
                   une minute ». Plus deux correctifs d'exploitation : la BOUCLE
                   DE RENDU ne meurt plus sur une exception (elle mourait
                   definitivement, d'ou « l'ecran de cartes ne s'affiche pas, ni
                   la pause » — un defaut passager devenait une panne), et le
                   journal serveur va sur DISQUE (`data/serveur.log`)
     0.7.17 fix : UNE BALISE. `#vote` n'etait jamais ferme dans `index.html`,
                   donc le parseur adoptait tout ce qui suivait — `#brief`,
                   `#cards`, `#build` et `#pause` devenaient des ENFANTS de
                   `#panel`, masque pendant une manche. Les quatre ecrans de
                   combat etaient donc invisibles depuis toujours, sans une seule
                   erreur : le DOM disait `display: flex`, mais un enfant d'un
                   parent en `display: none` n'a pas de boite (rect 0x0)
     0.7.18 quatre correctifs rapportes en partie.
                   LE CRISTAL DE RECOLTE se detruit a nouveau aux balles : le
                   code de collision avait purement disparu a la fusion —
                   `_harvests` renvoyait encore a « voir _bullets » et plus rien
                   n'y touchait `h.hp`, donc les tirs le traversaient et la
                   moitie des points de recolte etait injouable.
                   UN POINT DE RECOLTE ne nait plus dans un pilier : la marge est
                   son rayon PLUS celui du personnage, il ne suffit pas que le
                   centre soit dehors, il faut pouvoir venir se tenir dessus.
                   LA BARRE DE BOSS ne ment plus : le plancher borne les PV et
                   met l'exces de cote, donc elle restait FIGEE 46 a 60 % du
                   combat — la reserve est desormais transmise (13e element de
                   `bo`) et dessinee en attente, en ambre.
                   L'ARENE DE BOSS EST NUE : obstacles et dangers du biome
                   s'eteignent le temps du combat, des deux cotes. La geometrie
                   des mecaniques est calculee sur les bounds et ne les evite
                   pas, et le boss lui-meme ne collisionne pas avec eux

   --- plan6 : le client se decoupe, puis les cartes se redessinent -------------
     0.8.0 lot A  LE CLIENT PASSE DE 1 FICHIER A 17, EN COUCHES. `client.js`
                   faisait 10 311 lignes et melangeait trois couches sans
                   rapport : 3 000 lignes de menus DOM, 1 000 de reseau et de
                   saisie, 4 800 de rendu du monde. Il n'en reste que 44 —
                   l'amorce, comme `server.js`. La regle posee est plus forte
                   que « pas de cycle » : un module n'importe QUE des modules
                   d'indice inferieur. Mesure au moment du decoupage : 39 cycles
                   existaient, tous nes de declarations ecrites la ou elles
                   servaient et non la ou elles sont lues — 22 des 25 violations
                   venaient a elles seules de `resetFeedback` et de la boucle de
                   rendu, ecrites au milieu des effets.
                   AUCUN CHANGEMENT DE COMPORTEMENT : les lectures d'etat n'ont
                   pas bouge d'une ligne (une liaison de module ES est vivante),
                   seules les 152 ECRITURES croisees passent par un setter.
                   Trois criteres rejouables : zero violation de couche, zero
                   ligne perdue, et le graphe entier se charge dans Node derriere
                   un faux DOM — ce dernier verifie que chaque import nomme
                   existe a l'export, c'est-a-dire toute la classe de defauts que
                   la balise `#vote` non fermee avait illustree

     0.8.1 lot B  LES CARTES SE REDESSINENT. Trois defauts, tous mesures avant
                   correction, aucun visible dans le code isolement.
                   CHEVAUCHEMENT : `HZ_NORMAL` etait UNE table de coordonnees
                   pour TROIS geometries, et elle tombait sur les piliers — 53
                   dangers sur 54 recouvraient un obstacle en `normal`. Table
                   par biome, positions calees sur celles de `cauchemar` (le
                   mode qui enseigne la carte pose ses champs la ou souffleront
                   les geysers), et 5e regle d'acceptation dans
                   `verifierBiomes()` : 53/54 -> 0.
                   COULEUR : `BIOMES[].tint` et `.grid` etaient declares depuis
                   le lot V et LUS PAR PERSONNE, donc les trois lieux d'un meme
                   mode avaient la meme couleur (dE 0,00) ; et `calme` se
                   separait de `normal` de dE 0,36 malgre « ardoise franchement
                   froide » ecrit dans la table. Les deux axes se disputaient la
                   teinte : le mode passe sur la CLARTE, le biome garde la
                   teinte (`teinter()`, chroma importee a clarte constante).
                   Reglage cherche par balayage — dE 3,64 entre modes, 3,42
                   entre biomes, 4,94 entre le sol et sa grille.
                   MATIERE ET SILHOUETTE : `render/material.js` cuit une tuile
                   de 400 px (= `GRID_MAJOR`) par (biome, mode, graine) —
                   transparente, figee, en cache, donc UN `fillRect` par image
                   la ou la grille coutait des centaines de traces. Et un
                   obstacle a enfin une silhouette par biome, avec une face
                   superieure decalee vers le centre de la vue pour le volume et
                   une ombre portee pour le poser au sol. Aucune collision ne
                   bouge : la face du sol reste sur la boite de simulation

     0.8.2 fix : SIX IMPORTS MANQUANTS, dont deux qui manquaient DEJA avant le
                   decoupage. Symptome rapporte : `fxShard is not defined` au
                   clic de connexion.
                   Cause de l'outillage : `let fxWhite = 0, fxShard = 0,
                   fxGlow = 0;` — une ligne, trois declarateurs, et l'analyse
                   s'arretait au premier. `fxShard` et `fxGlow` n'existaient donc
                   pour personne (ni export, ni import, ni setter), et le linker
                   ES ne dit rien : il ne verifie que ce qu'on lui demande
                   d'importer. L'erreur n'arrive qu'a l'APPEL.
                   Cause jumelle : l'extraction des imports coupait sur les
                   commentaires ecrits DANS un bloc `import`, d'ou la perte de
                   `DAMAGE_SOURCES`, `fullMods` et `powerIndex`.
                   Et `SRC_TINT` n'etait importe NULLE PART dans le client
                   d'origine : la ventilation des degats subis du bilan jetait a
                   chaque fin de manche, depuis toujours, sans que personne l'ait
                   relie a un import.
                   Le garde-fou qui manquait : un controle d'IDENTIFIANTS LIBRES
                   sur les modules emis — reference quelque part, declaree nulle
                   part, importee par personne. C'est la seule verification qui
                   couvre ce que ni `node --check` ni le linker ne voient. Il
                   passe a zero sur les 18 modules

     0.8.3 fix : LA BARRE DE BOSS. `updateBoss` testait `final`, un identifiant
                   JAMAIS declare — ReferenceError a chaque image d'un combat,
                   donc `updateHud` mourait avant d'ecrire les PV, le nom et les
                   pastilles de barre. Le defaut date du lot N et ne se voyait
                   pas parce que la boucle de rendu rattrape les exceptions
                   depuis la 0.7.16 : un defaut permanent deguise en « la vie du
                   boss ne s'affiche pas ».
                   Le bloc etait mort de toute facon — il ecrivait
                   `--boss-pulse`, qu'aucune feuille ne lit, et contredisait la
                   regle ecrite vingt lignes plus haut (la pulsation ne se pilote
                   pas par image). La vraie implementation, au changement de
                   barre, etait deja la.
                   Le controle d'identifiants libres ne couvrait que les 18
                   modules issus du decoupage : il couvre desormais les 38 du
                   depot, client ET `shared/`. Un controle partiel donne surtout
                   de la confiance

     0.8.4 equilibrage : LE RUNNER RATTRAPE ENFIN. Rapporte en partie — « les
                   ennemis semblent apparaitre depuis la ou on regarde, si
                   j'avance en reculant je n'ai jamais d'ennemis derriere moi ».
                   L'APPARITION N'Y EST POUR RIEN : mesuree a 20 000 tirages par
                   cas, elle rend 25 % par cote a un dixieme pres, et ZERO
                   apparition dans le champ — au centre comme colle a un mur.
                   Rien dans ce code ne lit la camera ni la visee ; `beatSide`
                   est tire au hasard par beat.
                   La cause est la VITESSE. Le joueur va a 260 px/s, le runner —
                   le plus rapide du bestiaire — a 188. Aucun type ne pouvait
                   donc rejoindre une cible en mouvement ; la rampe de 4 px/s par
                   minute finissait par le faire, mais seulement a la minute 13
                   contre un Rempart et 21 contre un Tireur, soit apres la moitie
                   d'une manche de trente minutes. Le runner passe a 245 : au-
                   dessus du Rempart des la premiere minute, du Tireur vers la
                   sixieme, et les cartes de vitesse le repoussent ensuite —
                   c'est ce qu'elles achetent.
                   Second enseignement de la mesure, garde par ecrit : l'arene
                   est FINIE. Un joueur qui fuit tout droit atteint un mur en
                   dix-huit secondes et se fait rejoindre — 3,5 % des ennemis nes
                   derriere atteignaient deja le contact, 5,5 % desormais. On ne
                   distance jamais indefiniment, on distance jusqu'au mur

     0.8.5 deux correctifs rapportes en partie.
                   LES RELIQUES S'AFFICHAIENT EN COLONNE. `.overlay` est une
                   colonne en `align-items: center`, donc ses enfants sont
                   dimensionnes sur leur contenu ; une rangee `flex-wrap` ainsi
                   contrainte retombe a sa largeur MINIMALE des que la place
                   manque — une carte par ligne au lieu de deux puis une. Trois
                   cartes de 268 px et leurs gouttieres demandent 836 px.
                   `#cardsRow` avait exactement le meme defaut : l'ecran de
                   cartes s'effondrait pareil sous cette largeur, personne ne
                   l'avait encore vu. Les deux prennent desormais la largeur du
                   conteneur, bornee par `--shell`.
                   LE SON DE GEYSER EST RETIRE. Aucun filtrage de distance :
                   l'usine en cauchemar pose VINGT-SEPT geysers sur la salle, de
                   periodes 5,4 a 7 s, soit quatre a cinq declenchements par
                   seconde — dont la quasi-totalite pour des bouches situees a
                   deux ecrans de la. Retire plutot que borne a la vue, parce que
                   la regle du lot V dit deja pourquoi : un danger d'environnement
                   est du SOL, il s'annonce par sa geometrie permanente, et un son
                   n'ajoute rien a ce que l'oeil voit deja partir. Le mur qui cede
                   garde le sien — il n'arrive qu'une fois

     0.8.6 detail visuel : LES TROIS CLASSES SONT ENRICHIES a partir d'une
                   planche de reference generee (docs/refs/classes.png,
                   spritecook — voir aussi bestiaire-socle.png, bestiaire-lot-s.png
                   et boss.png pour le reste du bestiaire, non encore porte).
                   Le lot 6 avait deja corrige la silhouette (masse du Rempart,
                   coque en oeuf du Soigneur, dard du Tireur) ; elle restait
                   plate — deux nervures, un embleme, un highlight. Tout
                   l'ajout vit en ACCENT et non dans le trace (hexagone de
                   plaque inscrit, rivets, collier de canon, coutures de
                   coque, bille d'antenne) : sur la rampe NEUTRE et claire des
                   classes, un detail sombre se voit sans avoir a entrer dans
                   la silhouette. Seule exception, en silhouette : un aileron
                   arriere D'UN SEUL COTE sur le Tireur, seule classe encore
                   sans irregularite structurelle asymetrique (le Soigneur a
                   son antenne depuis le lot 6, le bouclier du Rempart doit
                   rester symetrique par construction — il porte desormais son
                   irregularite en accent, un voyant de coeur d'un seul cote).
                   Aucun changement de proportions, de couleur ni de reseau.

     0.8.7 detail visuel, suite : LE BESTIAIRE ET LES BOSS SONT PASSES EN REVUE
                   contre les memes planches (docs/refs/bestiaire-socle.png,
                   bestiaire-lot-s.png, boss.png), et le verdict n'est PAS le
                   meme que pour les classes. Sept des neuf types (grunt,
                   runner, brood, kamikaze, bulwark, medic, choeur) et les six
                   boss collaient deja a la reference — le bestiaire etait deja
                   au niveau, contrairement aux classes qui n'avaient qu'un
                   accent chacune. Deux ecarts reels, corriges :
                   LE TANK gagne une ligne de plaque frontale et deux rivets
                   d'epaule (accent seul, comme le Rempart).
                   LE SHOOTER gagne un vrai CANON PROEMINENT — un epaulement
                   puis un tube fin — la ou le trace precedent n'etait qu'un
                   museau tapere ; `shooterAccents` prend desormais `recoil`
                   en parametre, sur le meme modele que `medicAccents` et
                   `choeurAccents`, pour qu'un reflet de canon suive le recul.
                   LES SIX BOSS NE BOUGENT PAS. `render/boss.js` est un systeme
                   different et deja plus mature : animation procedurale,
                   posture d'annonce en trois temps, asymetrie deja encodee ou
                   elle sert (pattes de la Matriarche, moities des Jumeaux,
                   cinq citations de l'Amalgame). Le fichier dit lui-meme sa
                   philosophie — « une citation de trois traits se lit mieux
                   qu'une reproduction » — et le Ravageur porte la mention
                   « l'original, conserve ». Y superposer le detail organique
                   de la reference aurait contredit l'abstraction geometrique
                   qui fait deja tout le travail. Verifie via `?planche` : les
                   deux types touches restent sans trou ni artefact, la barre
                   des sept boss est inchangee.
     0.8.8 BANDE SON EN FICHIERS, a cote de la synthese et jamais a sa place.
                   `public/tracks.js` : deux platines `<audio>` dans le bus de
                   musique existant, fondu croise a PUISSANCE CONSTANTE de 2 s,
                   quatre pistes de horde en rotation et une piste de boss en
                   boucle. La SCENE (menu / horde / boss) est poussee par la
                   boucle de rendu comme l'intensite l'est deja : une piste ne
                   se dose pas, elle se remplace.
                   `music.js` devient l'AIGUILLAGE — le reste du client ne
                   connait toujours que `startMusic` / `setMusicIntensity` /
                   `setMusicScene` et ignore laquelle des deux joue.
                   LES PISTES NE JOUENT QU'EN MANCHE : hors manche la synthese
                   reprend, y compris en source « pistes ». Elle a ete ecrite
                   pour ce moment-la et ne se repete pas, la ou un morceau
                   compose veut etre entendu — on passe plus de temps a lire un
                   salon qu'a traverser un segment.
                   UN SEUL reglage (`survivor.audio.source`, tenu par
                   `audio.js`) commande la musique ET le son de tir : le laser
                   echantillonne remplace le carre synthetise dans la meme
                   bascule, parce que les deux sont le meme essai — revenir en
                   arriere doit tout rendre a la synthese, pas la moitie.
                   Les FICHIERS sont le DEFAUT, et ils ne peuvent l'etre que
                   parce que le repli est automatique des deux cotes :
                   l'echantillon par son test sur le tampon charge, la musique
                   par le rappel d'echec de `tracks.js` que `music.js` pose
                   (`setTrackFallback`, modele de `setReconnecter`). Un
                   deploiement sans `public/assets/` sonne donc comme avant.
                   LA MUSIQUE S'ETOUFFE (0,45, soit ~ −7 dB) des qu'un menu
                   s'ouvre par-dessus la partie — cartes, marchand, pause,
                   build : ce sont les moments ou l'on lit, et la bande son y
                   restait au niveau qu'elle avait sous les explosions. Sur le
                   BUS, donc les deux sources sont couvertes sans rien savoir.
                   Le fondu n'est arme qu'a `canplay` (sinon l'ancienne piste
                   descend pendant que la nouvelle telecharge : un trou de deux
                   secondes), le differe de coupure verifie que la platine n'a
                   pas ete reprise entre-temps, et les assets audio sont la
                   seule chose du depot mise en cache — `no-store` sur un mp3
                   de six mega-octets le retelechargerait a chaque enchainement.

   `npm run version-check` refuse un deploiement dont les sources ont bouge sans
   que cette constante suive : la mention ambre du client ne vaut que si quelqu'un
   pense a bumper, et un bump oublie ne se signale pas tout seul.

   La table est un COMMENTAIRE : le module reste pur, sans dependance, et le
   navigateur continue de n'en importer qu'une chaine.
   =========================================================================== */

export const VERSION = "0.8.8";
