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
     0.8.6 quatre correctifs de simulation, plus l'ecran qui les rendait
                   invisibles. Trois d'entre eux ont la MEME racine : le lot P a
                   supprime le modele par vagues, mais sept lectures de champs
                   disparus lui ont survecu. Elles ne plantaient pas, elles se
                   taisaient — `undefined`, donc NaN, donc du silence.
                   LES ECLATS RESTAIENT A ZERO APRES UNE RELANCE : `rerollRelic`
                   facturait sur `this.wave`, donc un cout NaN — la garde de
                   solde ne bloquait rien, le solde devenait NaN, et
                   `JSON.stringify(NaN)` valant "null" le client lisait 0 et
                   grisait tout le marchand pour le reste de la manche. Le prix
                   AFFICHE se calculait deja sur le niveau : les deux ne
                   portaient pas sur la meme grandeur. Meme racine :
                   `finalVictory`, objet que personne ne lisait, portait
                   `wave: undefined` — retire ; et trois libelles qui disaient
                   encore « vague » (historique du salon fige a « vague 0 »,
                   liste des salles et encart de reprise a « vague 1 »).
                   LE BONUS DE CADENCE SURVIT AUX BOSS. Le balayage d'arrivee
                   (`enemies = []`, sans passer par `_killEnemy`) faisait tomber
                   30 cumuls de frenesie — +60 % de cadence — trois secondes
                   apres le debut du combat, pour un premier renfort a la
                   quinzieme. Mesure : intervalle 0,100 s puis 0,160 s des t=3 s
                   avant, 0,100 s jusqu'a t=18 s apres. Les cumuls de kill
                   recoivent un SURSIS, pas un gel : le contrat de la carte
                   reprend des le premier renfort tue. Le balayage passe par un
                   point unique, `_sweepEnemies` — l'autre site, l'evenement
                   `chasse`, avait exactement le meme defaut.
                   LES RECOLTES partent avec le reste : un cristal n'a aucune
                   duree de vie, donc quatre nes avant un boss saturaient le
                   plafond au sol pour toute la manche. Mesure sur 1800 s : 4
                   points apparus avant, 25 apres, cinq boss traverses.
                   « MEMOIRE GRAVEE » retrouve son unite — son drapeau etait
                   remis a zero dans `_startWave`, disparu au lot P, donc
                   l'epique a 45 eclats ne servait qu'UNE fois par manche. Elle
                   se recharge par beat, dans `_startBeat`.
                   « MEUTE » compte le boss (via `_bossTargets`) : elle rendait
                   zero pendant tout le debut d'un combat, alors que la
                   puissance s'applique bien aux degats du boss.
                   Et la FENETRE DE BUILD cesse de mentir sur deux lignes : le
                   niveau d'equipe est celui du snapshot (cle `xl`) au lieu
                   d'une deduction impossible, et la cadence est l'intervalle
                   EFFECTIF releve par le serveur (34e champ du tuple joueur,
                   +0,25 % de poids d'instantane arene pleine). C'est cette
                   ligne muette qui avait masque la perte de cadence
     0.8.7 trois correctifs d'interface, et le plus cher tient en un caractere.
                   L'ACCOLADE DE `#meta` N'ETAIT PAS FERMEE dans `ui.css`,
                   depuis le lot D : un parseur CSS qui rencontre un bloc non
                   ferme avale tout ce qui suit SANS une seule erreur, donc le
                   navigateur ne lisait que 40 des 137 regles de la feuille.
                   Personne ne l'avait vu parce que `menus.css`, ecrit apres et
                   charge apres, en redeclare 65 : les ecrans avaient l'air
                   habilles. Les 32 autres n'habillaient rien — titre de
                   victoire et son animation, barre des provenances de degats du
                   bilan, pastille de version et sa mention ambre, survol des
                   lignes du tableau, liste de cartes de la fenetre de build.
                   Meme famille que la balise `#vote` non fermee qui avait rendu
                   quatre ecrans invisibles.
                   C'etait aussi la vraie cause du « BANNIR » COUPE : `.cardBan`
                   perdait son `align-self` et son remplissage, se retrouvait
                   large comme la carte et colle au bord, donc l'ecretage
                   arrondi le rognait. Texte coupe sur 16 px avant, 0 apres,
                   sans toucher a la carte. Les regles mortes PAR DECISION
                   partent avec (echeance de bilan, classe `victoire` que rien
                   ne pose) plutot que de ressusciter un ecran qui n'existe pas.
                   LE BOUTON « PRET » DISPARAIT EN SOLO : se declarer pret a
                   soi-meme est un clic sans destinataire, et « 1 joueur sur 1
                   est prêt » se lit comme un compteur casse. La regle vit dans
                   `notReady()`, dont heritent la garde du `start` et la
                   revalidation par tick. L'arrivee d'un deuxieme joueur pendant
                   les trois secondes annule en NOMMANT la vraie raison — pas
                   « X n'est plus prêt », personne ne s'etant jamais declare.
                   UN ECRAN DE FIN DE MANCHE, avant le bilan : tombe ou
                   victoire, l'etape, le niveau, le temps. Purement client,
                   aucun message nouveau, aucun compte a rebours. Ce que le lot
                   W refusait etait DEUX ECRANS EN CONCURRENCE — le salon sous
                   le bilan — pas un ecran de plus
     0.8.8 LES ENNEMIS CONTOURNENT LES OBSTACLES. Le repoussage par axe corrige
                   une position deja fautive : il fait glisser le long du mur,
                   mais le chemin reste une ligne droite vers le joueur, donc la
                   horde rase la geometrie au lieu de l'eviter. Le vecteur est
                   desormais BRAQUE sur un preavis, avant le deplacement, avec
                   une force proportionnelle a la penetration de la sonde — meme
                   patron que `ENEMY_SEPARATION`, rien de stocke sur l'entite,
                   une passe par tick, rien au reseau. Le vecteur est
                   renormalise (sinon on contourne plus vite qu'on avance), le
                   cote se choisit du bord ou l'ennemi se trouve deja, et la
                   parite de l'identifiant departage les arrivees frontales : la
                   horde se separe en deux flux. Pas d'evitement en RECUL — un
                   vecteur braque parcouru a l'envers ramenerait le tireur vers
                   l'obstacle. `e.ang` n'est pas touche : le bouclier du bulwark
                   protege ce qu'il regarde.
                   Mesures, cauchemar, graine 1, deux joueurs, 600 s : taux de
                   plaques 48,9 -> 34,5 % sur la friche et 12,9 -> 9,9 % sur
                   l'usine, et surtout un tiers d'ennemis en moins se retrouvent
                   derriere la geometrie (3599 -> 2734 echantillons). CPU p99
                   2,1 -> 2,0 ms, sous le budget de 8. Population moyenne et
                   temps au plafond INCHANGES : le plateau est regle par le
                   debit face a ce que l'equipe nettoie, pas par les obstacles —
                   c'est le defaut ouvert du lot X, l'evitement ne le touche pas.
                   `ENEMY_AVOID_TURN` a 0 restitue l'ancien comportement

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

     0.8.9 LE DEPOT PERD SES COMMENTAIRES. Nouvelle regle de convention : le
                   minimum possible, par defaut aucun — un commentaire se paie
                   a chaque lecture du fichier, et le depot est lu bien plus
                   souvent qu'il n'est ecrit. Ce qui explique un CHOIX DE
                   CONCEPTION vit dans `CLAUDE.md` et `LISEZMOI.md`, ou il est
                   ecrit une fois et relu quand on le cherche.
                   4705 commentaires retires, 16 581 lignes sur 41 000. Fait
                   par un scanner a etats (chaines, gabarits imbriques, regex)
                   et non par expression reguliere, avec pour critere la
                   RECONSTRUCTION EXACTE de chaque source en reinjectant les
                   coupes — donc la garantie que rien d'autre qu'un commentaire
                   n'a bouge. `node --check` sur les 52 modules, simulation et
                   demarrage serveur verifies apres coup.
                   QUATRE EXCEPTIONS, chacune pour la meme raison — l'info
                   n'existe nulle part ailleurs : cette table (le CHANGELOG du
                   depot), la note de duplication de palette d'`admin.css`, et
                   le miroir `--cursor-go` entre `menus.css` et `ui/screens.js`,
                   commente des deux cotes.
                   LA DOCUMENTATION SUIT. `CLAUDE.md` est injecte a chaque
                   session : 262 962 -> 76 472 caracteres, une ligne par regle,
                   zero recit. `LISEZMOI.md` est reduit a ce qui ne se relit pas
                   dans le code — mesures, reglages, limites : 292 705 ->
                   50 643. `cartes-ameliorations.md` disparait, ses valeurs sont
                   dans `cards.js` depuis longtemps

   --- plan d'equilibrage (docs/superpowers/specs/plan6) ---------------------
   Ses lots portent les memes LETTRES que ceux du decoupage client ci-dessus.
   La table est la seule correspondance qui fasse foi : 0.8.0 = lot A du
   decoupage, 0.8.10 = lot A de l'equilibrage. Rien ne se deduit de la lettre.

     0.8.10 equilibrage, lot A  LE PLAFOND DE POPULATION DEVIENT UNE FONCTION.
                   `MAX_ENEMIES: 200` etait une constante, et une fois atteinte
                   `_spawnEnemy` rendait `null` : TROIS systemes s'eteignaient
                   ensemble — les debits 2,2 a 5,0 des segments 4/5/6, le
                   `diff.spawn` des trois modes, et surtout `WAVE_CROWD_EXP`,
                   qui n'etait eteint que D'UN COTE. `_addXp` divisait toujours
                   le gain par `joueurs^0,75` alors que la contrepartie — une
                   horde 2,83 fois plus dense — n'arrivait jamais. Jouer a
                   quatre etait une taxe sur la progression.
                   `enemyCap(diffIndex, joueurs)` porte le MEME exposant que la
                   division d'experience : la horde grossit exactement de ce que
                   la normalisation retire. 176 a 900 corps selon mode et
                   effectif. Mesure, tues divises par `joueurs^0,75` a 1, 2 et 4
                   joueurs : 100 / 100 / 104 % en calme, 100 / 98 / 95 % en
                   normal, contre 26 / 22 / 24 cartes avant.
                   LE PREREQUIS ETAIT UNE GRILLE SPATIALE, et il n'existait pas.
                   Les deux separations (entre ennemis, et ennemi/joueur)
                   etaient en O(n²) et en O(joueurs × ennemis) — 193 000 paires
                   par image a 622 corps. `_grille()` : tri par comptage dans
                   des `Int32Array` reutilises, cellule = deux fois le plus
                   grand rayon, voisinage 3×3. C'est la TAILLE DE CELLULE qui
                   prouve la couverture — deux corps qui se chevauchent sont a
                   moins d'une cellule — et l'ecretage des coordonnees est
                   1-lipschitzien, donc un corps repousse hors salle ne perd pas
                   ses voisins.
                   Profilage, arene forcee pleine : 3,56 ms au p99 a 900 corps,
                   7,04 a 1600, 14,58 a 2000 pour un budget de 16. Le plafond de
                   900 garde donc 1,8× de marge en nombre de corps ; c'est elle
                   que B et J depenseront. En jeu, le plafond ne mord plus que
                   dans trois cas sur neuf, tous apres la minute 9 : le
                   regulateur de fin de manche n'est plus lui mais le debit face
                   a ce que l'equipe nettoie.
                   A-2, LA DETTE DU LOT : les debits des segments 4/5/6, ecrits
                   en sachant qu'ils etaient inoperants, sont remesures. Un beat
                   a 5,0/s remplit le plafond en 44 s sur les 300 du segment, et
                   le temps est le MEME a 1, 2 et 4 joueurs — meme exposant des
                   deux cotes. La montee reste un gradient : un beat d'ouverture
                   de segment 4 ne remplit que 60 % du plafond. Les deux autres
                   dettes ecrites au plan (traversabilite de la horde,
                   `TRAIL_MAX`) appartiennent aux lots B et J.
                   `verifierPopulation()` livre avec le lot, sur le modele de
                   `verifierScript()` et `verifierBiomes()`. Deux reserves
                   ecrites dans `LISEZMOI.md`, toutes deux sur le PROTOCOLE :
                   cauchemar en solo est degenere (les bots immortels restent
                   bloques quarante minutes sur le premier boss), et la
                   croissance de population n'est pas monotone au segment 3 —
                   la puissance de l'equipe y monte plus vite que le script,
                   ce qui se regle au lot C et non en relevant le plafond

     0.8.11 equilibrage, lot B  ON PEUT ENFIN SEMER LA HORDE. Mesure avant
                   correction : le poursuivant le plus proche est a 22 px — soit
                   exactement la distance de separation — a 5, 10 et 15 s de
                   fuite en ligne droite, dans les trois modes et a toutes les
                   minutes. Pas « difficile a distancer » : colle, indefiniment.
                   Apres, a la minute 25 et sans aucune carte de mobilite, 1144
                   px en calme, 726 en normal, 365 en cauchemar.
                   LA RAMPE DE VITESSE DEVIENT MULTIPLICATIVE.
                   `ENEMY_SPEED_MIN_RAMP = 4` px/s par minute s'appliquait
                   IDENTIQUEMENT a tous les types, donc +231 % au tank et +49 %
                   au runner : une rampe additive uniforme est mathematiquement
                   une compression du bestiaire. Le rapport lent/rapide tombait
                   de 4,7x a 2,1x sur une manche, un tank finissait plus rapide
                   qu'un grunt du debut. `ENEMY_SPEED_RAMP_PCT = 0,007` le rend
                   invariant par minute : 3,55x partout.
                   LA DOCTRINE DES 90 % est ecrite dans le code
                   (`verifierVitesses()`, `SPEED_DOCTRINE`) : aucun type de
                   horde ne depasse 90 % de la vitesse de la classe medIane, a
                   aucune minute, dans aucune difficulte, TIRAGE COMPRIS.
                   La table du plan cassait sa propre doctrine — ecrite pour un
                   runner a 196, elle oubliait le `speed` de difficulte qu'elle
                   introduisait et le tirage +-10 % deja present : 196 x 1,21 =
                   237 pour un plafond de 234, avant tout multiplicateur de
                   mode. Resolu sur le pire cas reel : runner 156. Le rapport
                   lent/rapide tombant alors a 3,0x, deux fiches sont touchees
                   hors plan pour tenir le plancher de 3,5x — tank 52 -> 44 et
                   bulwark 58 -> 50. Pire cas mesure : 233 px/s pour 234.
                   LE MUR DE CORPS N'EN EST PAS UN, et c'est la reponse a la
                   question laissee ouverte par le lot A. Traverser 900 corps
                   depuis le centre d'un encerclement coute 2,3 s contre 2,31 s
                   a vide, parce qu'un invariant deja ecrit le dit :
                   `_separateFromPlayers` ne deplace jamais le joueur. Le prix
                   d'une traversee est en DEGATS DE CONTACT, pas en temps.
                   `verifierEncerclement()` reste comme garde-fou.
                   UN CRITERE SORT ROUGE : la mort mediane en solo devait passer
                   le segment 3, elle est a 3,7 min en cauchemar (2,7 avant) et
                   5,3 ailleurs. Le chiffre mesure le BOT et non le jeu — il ne
                   pare pas, n'esquive pas, n'utilise aucune de ses deux
                   competences. Un critere de survie a besoin d'un pilote

     0.8.12 equilibrage, lot J  LES DEUX PLAFONDS DE TRAITS SE DERIVENT DE
                   L'ECRAN. Ni l'un ni l'autre n'en etait encore un.
                   `TRAIL_MAX = 18` etait ecrit pour deux cents ennemis ; la
                   demande naturelle, plafond leve, est de 200 a 400 zones
                   vivantes en cauchemar, et elle couvrait alors 19 a 27 % d'une
                   vue en moyenne et jusqu'a 165 % — le double du budget de sol
                   deja ecrit au depot (`HAZARD_SURFACE_MAX`, 12 %). Le trait
                   n'existait donc pas : dix-huit places pour quarante porteurs.
                   `trailMax()` rend ce qui remplit 12 % d'UNE VUE, soit 81. Le
                   plan proposait `_enemyCap() x 0,09` — exactement 81 au plafond
                   de cauchemar a quatre, mais indexe sur une grandeur qui bouge :
                   a un joueur il serait tombe a 29 alors que la horde entiere
                   tient sur le seul ecran de ce joueur. LA LISIBILITE EST UNE
                   PROPRIETE DE LA VUE, PAS DE L'EFFECTIF.
                   Le plafond seul ne suffisait pas — 200 a 400 de demande contre
                   81 places restait sature, donc constant. L'empreinte par
                   porteur (`TRAIL_LIFE x vitesse / TRAIL_STEP`) passe de 8,7 a
                   2,1 zones vivantes : `TRAIL_LIFE 4 -> 1`, et `TRAIL_DOT
                   14 -> 26` rend en intensite ce que la duree perd. Le pas ne
                   bouge pas, une trainee reste continue. Saturation mesuree :
                   80/79/84 % avant, 18/41/48 % apres.
                   LE PREAVIS DE RUEE DEVIENT UN BUDGET PAR VUE, PAS UNE
                   RECHARGE. Le plan proposait `DASH_CD` par difficulte ; mesure,
                   les porteurs a portee vont de 17 a 283 selon le cas, ce qui
                   demanderait un `DASH_CD` de 2,6 a 14 s, a re-regler a chaque
                   changement de plafond. `DASH_WARN_MAX = 8` EST le critere,
                   applique a l'octroi : 31/11/22 preavis simultanes avant, 8
                   exactement dans les neuf cas apres. Un preavis refuse ne
                   consomme pas sa recharge. Deux pieges payes : le budget se
                   compte a la position de l'ENNEMI et non de sa cible (un ennemi
                   lance sur A s'affiche sur l'ecran de B), et un preavis accorde
                   doit s'inscrire dans les DEUX tables — celle de l'image et
                   celle qui la reporte a la suivante. Sans le second appel, le
                   plafond effectif double exactement : 16 pour 8.
                   LE LEVIER « COMPORTEMENT » SE LIT AU NOMBRE DE TRAITS PAR
                   CORPS. Le critere du plan (facteur 2 de calme a cauchemar) est
                   vrai par construction, calme n'attachant aucun trait : il ne
                   dit rien. Traits par corps : 0,00 / 0,90 / 1,66, soit x1,85 de
                   normal a cauchemar. C'est cette croissance stricte que
                   `verifierTraits()` surveille, avec la saturation des plafonds
                   et les preavis a l'ecran.
                   LES ELITES DILUAIENT AVEC L'EFFECTIF :
                   `WAVE_ELITE_CROWD_EXP` valait 0,4 face au 0,75 de
                   `WAVE_CROWD_EXP`, donc une part d'elites en `joueurs^-0,35`.
                   Porte a 0,75, meme exposant des deux cotes comme le plafond de
                   population du lot A. Rapport 4 j / 1 j : 0,52 -> 0,80, le reste
                   dans le bruit. Une elite reste a 1-2 corps sur cent.
                   DEUX RELEVES SANS DECISION, faute de pilote. Les bonus au sol :
                   le bot ne va pas les chercher, 1 a 12 % ramasses, mais le sol
                   porte 1,1 a 2,9 bonus en permanence pour un
                   `POWERUP_MAX_GROUND` de 2 — le generateur est bloque par des
                   bonus que personne ne prend, et les depouilles passent
                   au-dessus du plafond. Et le critere de composition sans tank :
                   neutraliser `trail` en normal, ou AUCUN type ne le porte,
                   deplace le chiffre d'un facteur deux. La mesure est dominee par
                   le bruit et le bot n'utilise ni Rempart ni Provocation, les
                   deux seules choses qui font un tank. `mesureComposition()` est
                   livree, le critere est renvoye au lot I

     0.8.13 equilibrage, lot C  LES PV DE HORDE CESSENT DE COURIR APRES LA
                   PUISSANCE. `ENEMY_HP_MIN_RAMP = 13` faisait x25 sur une manche
                   quand la build fait x3 : le ttk d'un grunt passait de 0,40 s a
                   la minute 1 a 2,15 s a la minute 30, du spongieux et non du
                   difficile — et l'experience valant les PV detruits, la boucle
                   se bouchait elle-meme. Porte a 7 : 0,34 -> 0,87 s.
                   LE CRITERE SORT ROUGE PASSE LA MINUTE 20 et le refus d'un
                   troisieme aller-retour sur la rampe est ecrit dans le plan. La
                   cible de 0,60 s est tenue partout jusqu'a la minute 10, cassee
                   dans deux cas sur six a la minute 20 et dans quatre a la minute
                   30. Ce n'est pas la rampe : la puissance mediane REELLE est
                   mesuree entre 2,7 et 3,2 la ou le plan la supposait a 4,7. Le
                   niveau 30 tombe vers la minute 20 et la build s'arrete la.
                   L'ecart appartient au lot D.
                   `BOSS_POWER_REF` 2,36 -> 2,89, ET LA MESURE EST SON PROPRE
                   POINT FIXE. La valeur datait d'un modele a ~13 cartes.
                   `_playerPower()` releve a la mort de chaque boss, en normal —
                   le seul mode ou `diff.boss` vaut 1 : 3,06 en solo, 2,72 a
                   quatre. Reinjectee, elle se remesure a 2,92 : une iteration a
                   suffi. A 2,36 la moitie des combats tombaient sur le PLANCHER
                   DE BARRE (40 s) — le boss mourait de la vitesse a laquelle les
                   barres consentent a casser, pas de ses PV, symptome exact d'une
                   reference perimee. Durees medianes apres : 43 a 85 s.
                   UN ARTEFACT DE MESURE PAYE : `botInput` vise le corps le plus
                   proche, donc les renforts et jamais le boss. Un combat de boss
                   ne se terminait pas et la moitie des manches restaient au
                   segment 1, horloge de horde a l'arret. `botVersBoss` corrige,
                   local au lot pour ne pas deplacer les mesures des lots B et J.
                   La carte est desormais tiree AU HASARD parmi les trois offertes
                   et non prise en premiere : « build mediane » n'a de sens que
                   sur un tirage neutre.
                   LE CRITERE DE NON-REGRESSION N'EST PAS MESURABLE, troisieme
                   lot de suite. Les quinze manches non immortelles meurent au
                   premier boss, au segment 1, avant et apres : ce n'est pas la
                   horde qui tue le bot, donc baisser ses PV ne peut rien
                   deplacer. Il faut un pilote

     0.8.14 equilibrage, lot D  LA VALEUR D'UN KILL QUITTE LA JAUGE QU'ELLE
                   REMPLIT. `XP_LEVEL_GROWTH` indexait l'experience sur le NIVEAU
                   D'EQUIPE, c'est-a-dire sur la sortie de la jauge qu'elle
                   alimente : boucle amortie (1,09 < 1,18) donc convergente, mais
                   NON MESURABLE — et c'etait la cause de l'ecart-type de six
                   cartes que le lot X constatait sans l'expliquer.
                   `XP_MINUTE_GROWTH = 1,055` sur la minute de horde,
                   `_xpLevelMul` renomme `_xpTimeMul` (deux appels).
                   DEUX CONSTANTES DE COUT BOUGENT, HORS PLAN, et la mesure y
                   force : le cout d'un palier croissait de 1,18 par niveau contre
                   un revenu de 1,055 par minute, et a `LEVEL_XP_BASE` fixe aucune
                   valeur ne tient les deux bornes — la tranche du milieu demande
                   une base basse, celle de la fin une base haute, d'un facteur
                   deux. Onze couples mesures : 200/1,18 donne 13/25,5/30 pour une
                   cible de 10/20/27, 270/1,12 donne 11/23/28, 355/1,08 donne
                   10/23,5/28,5. Retenu 330/1,10 : 10/21/25,5, 26,6 cartes.
                   LES GRAINES SONT ECRITES, sans quoi rien n'etait decidable :
                   `Math.random` remplace par un mulberry32 derive du numero de
                   manche, deux reglages compares sur LES MEMES manches. Non
                   apparie, le meme couple rendait 18 puis 23 au niveau de la
                   minute 20 et 4/6 puis 1/6 sur les victoires. Tout ce qui
                   ressemblait a une regression du lot C etait du bruit : boss 88
                   -> 87 s en solo a graines appariees, et le ttk de fin de manche
                   S'AMELIORE, 1,08 -> 0,47 s.
                   LE PLAFOND DE NIVEAU MORDAIT et falsifiait le critere : la
                   moitie des manches finissaient collees a `LEVEL_MAX`, 29 cartes
                   exactement, ce qui ecrasait l'ecart-type par le haut. Apres, la
                   fin de manche est a 25,5-26,6 et le plafond ne borne plus rien.
                   LE CRITERE DE DISPERSION RESTE ROUGE ET MESURE LA MAUVAISE
                   CHOSE : 5,0 -> 3,1 cartes en solo pour un plafond de 3, mais ce
                   qu'il capture est la LONGUEUR de manche (3 manches sur 8 se
                   terminent en solo, 7 sur 8 a quatre). La dispersion propre a la
                   courbe se lit a minute fixe, et la elle est franche : +-1,5 ->
                   +-0,6 au niveau de la minute 8.
                   LE GARDE-FOU DEVIENT MESURABLE : la cadence en minutes par
                   niveau doit rester croissante par tranche, a 10 % pres
                   (`CADENCE_TOL`). Apres : 0,89 / 1,09 / 2,67 en solo. A QUATRE
                   ELLE SE RESSERRE (0,89 puis 0,71) et la minute 20 monte a 27
                   pour une cible de 20 : quatre joueurs tuent bien plus de quatre
                   fois plus vite et `joueurs^WAVE_CROWD_EXP` ne reprend pas tout.
                   L'exposant est verrouille sur celui du plafond de population du
                   lot A — ca ne se corrige pas depuis ce lot

     0.8.15 equilibrage, lot H  LES PV DE BOSS QUITTENT LE COMPTEUR POUR LA
                   MINUTE. `BOSS_GROWTH` donnait +6 % par boss, soit x1,30 sur la
                   manche contre x2,6 de puissance joueur : la duree des combats
                   DECROISSAIT d'un facteur deux a trois (147 -> 40 s en solo). Le
                   sixieme boss etait proportionnellement deux fois plus facile que
                   le premier. `BOSS_HP_MINUTE_RAMP = 0,055` compose : derive
                   -73 % -> -5 % en solo, -58 % -> -19 % a quatre, a douze manches.
                   LA RAMPE EST COMPOSEE ET LA TABLE DU LOT ETAIT FAUSSE : le
                   document ecrivait `pow(1 + 0,055, minutes)` mais chiffrait x1,28
                   a la minute 5 et x2,65 a la minute 30, donc du lineaire. Les
                   deux formes mesurees : en lineaire la duree redecroit de 32 a
                   49 %, la rampe ne suit pas la puissance. C'est la formule qui
                   est juste.
                   `BOSS_HP_BASE` 1200 -> 520, pas 918. Le document demandait de
                   diviser par le facteur de la minute 5 « pour que le premier boss
                   ne change pas » — sauf que le premier boss durait 147 s, tres
                   au-dessus de la fourchette 50-90 s du lot C.
                   `FINAL_HP_MUL` 2,2 -> 1,3 : a la minute 30 la rampe vaut x4,98
                   contre x1,30 pour l'ancien compteur, et le boss final passait de
                   106 a 232 s. Ses barres sont intouchables par ce lot, donc la
                   compensation passe par ses PV. Apres : 107 et 108 s.
                   LE PLAFOND DE RENFORTS NE MORDAIT JAMAIS. La population moyenne
                   pendant un combat est de 3 a 4 corps pour un plafond de 55 : ce
                   qui reglait la densite etait le COMPTE d'invocations,
                   `BOSS_SUMMON_BASE + joueurs`, soit 4 renforts par joueur en solo
                   contre 1,75 a quatre. Porte a `BOSS_SUMMON_BASE x
                   joueurs^WAVE_CROWD_EXP`. Debit par joueur 0,300/s en solo contre
                   0,178/s a quatre : 19 % d'ecart une fois l'exposant retire,
                   contre 62 % avant. Le plafond devient `BOSS_ADD_CAP_BASE = 42`
                   fois le meme exposant, borne par `_enemyCap()`.
                   LA DENSITE EN CORPS VIVANTS NE PEUT PAS S'EGALISER (3,6 contre
                   1,4) : un renfort meurt quatre fois plus vite face a quatre
                   joueurs. Le reglage controle un DEBIT, pas une population.
                   DEUX CRITERES NE SE MESURENT PAS ICI : en calme les boss
                   ordinaires tombent au plancher de barre (40-47 s), c'est
                   `diff.boss` qui regle et pas la courbe ; et la matrice de
                   coherence demande les trois profils de compte, que le bot n'a
                   pas

     0.8.16 equilibrage, lot G  LA META SE PAIE EN QUALITATIF AVANT DE SE PAYER
                   EN POURCENTAGES. La matrice de PROFILS.md demande 5 % -> 50 %
                   de reussite en normal entre P0 et P1 quand l'arbre n'offrait
                   que x1,25 de puissance : un multiplicateur ne fait pas ce saut.
                   `CONFORT` passe de trois a cinq entrees (bannissement, seconde
                   relance), une ligne `SECOURS` de cinq paliers donne `selfRevive`
                   au cinquieme — le mod existait deja, rien de neuf en simulation
                   — et trois lignes de TRONC COMMUN s'achetent une fois pour les
                   trois classes : la polyvalence cessait d'etre gratuite.
                   `TIER_COSTS` 6 900 -> 2 000 la ligne, parce que le compte compte
                   desormais dix lignes et plus une. Compte complet : 26 600
                   noyaux, soit P1 a 25 manches et P2 a 53.
                   LE CRITERE DE COUT D'UNE LIGNE EST REMPLACE. « 15-20 manches
                   pour une ligne » datait du cadrage a une seule ligne ; ce que le
                   budget suppose vraiment est un REVENU PAR MANCHE (420), et c'est
                   lui que `verifierMeta` surveille a 25 % pres. Mesure : 501 en
                   normal, +19 %.
                   LE PLAFOND DE NOYAUX NE MORD QUE LA OU IL DOIT, donc
                   `CORE_LEVEL` reste a 8 : 0 manche plafonnee en calme et en
                   normal (546 au plus haut pour un plafond de 600), 5 sur 8 en
                   cauchemar solo et toutes terminees. MAIS EN CAUCHEMAR A QUATRE
                   IL MORD HUIT FOIS SUR HUIT, dont une manche non terminee : ce
                   n'est plus un plafond de securite, c'est le regime du mode. Ca
                   se corrige par `DIFF_MUL`, pas par le plafond.
                   LE NIVEAU 30 REDEVIENT LE MUR depuis le lot H : les manches se
                   terminent, donc le plafond de niveau reborne la fin de courbe
                   que le lot D venait de liberer, et le revenu devient plat.
                   DEUX CRITERES SE VERIFIENT SANS SIMULER : `gainMeta()` rend
                   x1,34 de puissance au tireur et x1,45 de PV au rempart pour un
                   plafond de x1,8 — le plan surestimait a x1,65 ; `coutMeta()`
                   rend la trajectoire P1/P2.
                   Jalons du lot G-3 : `SLOTS_LEVEL` 12 -> 13, `LEGENDARY_LEVELS`
                   [12, 22] -> [13, 24]. Profil v6, migration enchainee depuis v3 ;
                   le bannissement devenant un achat, un compte qui en avait deja
                   use le garde. Les comptes existants gardent leurs paliers sans
                   remboursement — le profil ne trace pas la depense

     0.8.17 equilibrage, lot E vague 1  LE TIRAGE SE CONDITIONNE. Le catalogue
                   proposait des cartes sans effet chez celui qui les tire :
                   `Surcharge orbitale` sortait sans `Orbiteurs`, donc une offre
                   sur trois etait un fantome. Quatre filtres dans
                   `eligibleCards` : `requires`, `minPlayers`, `teamUnique` (le
                   porteur empile encore, la table ne la revoit plus) et
                   `requiresSystem`. Le `ctx` est optionnel — un script de mesure
                   n'a rien a construire. Les trois filtres de CONTEXTE sont
                   inertes jusqu'a la vague 2 : aucune carte actuelle ne les
                   declare, 99 cartes eligibles en solo comme a quatre.
                   `requires` NE PREND PAS `essaim`, contrairement au plan :
                   `orbiterDamageMul` n'est lu qu'a un seul endroit, la boucle des
                   lames. Avec `essaim` dans la liste la carte restait morte sur
                   une build d'essaim.
                   TROIS DEFAUTS TROUVES PAR L'AUDIT, TOUS REELS. `railgun`
                   declarait une incompatibilite avec `perforation` que
                   `perforation` ne declarait pas, et l'inverse pour `inertie` :
                   deux paires a moitie ecrites, donc contournables selon l'ordre
                   de tirage. `sharedSupport` etait un champ MORT — pose par « Voeu
                   partage », lu nulle part, le systeme lisant l'identifiant de
                   carte et non le mod ; supprime, `apply` devient optionnel.
                   Aucun autre mod n'est mort.
                   IL N'Y A PAS DE GENOU DE PLAFONNEMENT ADDITIF, contrairement au
                   constat du plan. Gain marginal en empilant les dix sources
                   additives de `damageMul` : 12,0 % a la premiere carte, 7,5 % a
                   la sixieme, 9,2 % a la quinzieme, 9,2 % a la vingt-cinquieme. La
                   dilution est INTERNE a une pile et le pas d'une autre famille la
                   remet a 12 %. Le pool de communes n'a pas a se vider plus tot.
                   `scoreMul` n'est plus une cible de carte et reste dans
                   `defaultMods` et `_credit`. `Bourse` devient +25 % d'eclats,
                   `Ferraille` garde le PV par kill et gagne `pickupRadiusMul`,
                   seconde cle en aval — `Poches larges` garde son plancher.
                   LA BRUME NE MENT PLUS (D4b) : « on ne voit plus venir » au lieu
                   de « les bords de l'arene se ferment », que rien n'implementait.
                   Vagues 2 et 3 a venir : les deux seules interruptions
                   volontaires du plan

     0.8.18 equilibrage, lot E vague 2  LES DEUX PLUS GROS TROUS DU CATALOGUE.
                   Le jeu est cooperatif et avait six cartes de cooperation sur
                   116 ; les boss occupent un cinquieme de la manche et n'en
                   avaient qu'une. Neuf cartes ajoutees EN FIN DE TABLEAU :
                   `cordee`, `relais`, `bouclier_partage`, `serment`,
                   `porte_voix`, `phalange` (seule legendaire du lot), plus
                   `reperes`, `briseur`, `traqueur`. Les six cartes de coop
                   portent `minPlayers: 2` — premier usage reel des filtres de
                   contexte de la vague 1 : zero offerte en solo, six a deux.
                   `REPERES_STEP` 0,07 -> 0,12, ET LA MESURE L'IMPOSAIT. A +7 %,
                   une commune qui ne vaut que contre les boss etait MOINS BONNE
                   qu'une commune de degats generiques : un tirage aleatoire y
                   perdait ses offres et la derive des durees de boss en solo
                   partait a +141 %. A parite, elle retombe a +5 %.
                   `BOSS_DAMAGE_CAP = 1,6`, sur le modele de `CRIT_CHANCE_CAP` :
                   `Reperes` pleine plus `Traqueur` a quatre barres cumulent x2,13,
                   et a quatre porteurs le boss fondait.
                   UN CRITERE DU LOT H REPASSE ROUGE A QUATRE JOUEURS, et ce n'est
                   pas un defaut de ces cartes : derive du premier au dernier boss
                   ordinaire -14 % -> -37 % a quatre, +5 % en solo (douze manches).
                   La cause est `cordee` — les bots se REGROUPENT pendant un combat
                   de boss, ils visent tous la meme cible, et se dispersent pendant
                   la horde. Une carte qui paie le regroupement paie exactement la
                   situation que le lot H mesure. Le levier est la rampe de PV ou
                   `diff.boss`, pas la valeur de la carte.
                   POINT DE PASSAGE NEUF : `_grantShield(p, montant, plafond)`. Le
                   bouclier se gagnait a cinq endroits — regeneration, rempart,
                   surplus de soin, bonus au sol, relique de secours — et
                   `Bouclier partage` avait besoin d'un seul. Le partage ne se
                   repartage pas.
                   LE PARTAGE DE BONUS NE CONCERNE QUE LE PERSONNEL : ni le
                   ralentissement global, ni ce qui fait naitre une entite. Sans
                   cette liste, un bonus ramasse posait quatre tourelles

     0.8.19 equilibrage, lot E vague 3  LES CINQ AXES ORPHELINS. Douze cartes en
                   fin de tableau, catalogue 116 -> 137. Environnement
                   (`crampons`, `conducteur`, `terrain_conquis`) : cinq dangers du
                   sol pour une seule carte. Entrave (`filins`, `etau`, `nasse`) :
                   `STATUS_ROOT` existait, etait reseau, etait rendu, et AUCUN
                   joueur ne pouvait entraver. Evenements (`opportuniste`,
                   `curee`) : quatre familles, zero carte. Recolte
                   (`prospecteur`, `filon`) et esquive (`contre_pied`,
                   `sillage`). `appel_du_vide` reste ecartee (D6).
                   UN CONSTAT DU PLAN EST FAUX : les elites larguent DEJA un bonus,
                   inconditionnellement, dans `_killEnemy`. `curee` telle qu'ecrite
                   etait morte a l'ecriture ; elle en donne un SECOND.
                   L'ENTRAVE D'UN ENNEMI NE TRAVERSE PAS LE RESEAU. Les ennemis ne
                   portent pas la `Map` de statuts des joueurs mais des champs
                   (`burn`, `vulnUntil`) ; `rootUntil` en est un de plus, et
                   l'immobilite EST le retour visuel.
                   `etau` et `terrain_conquis` se branchent sur les DEUX souffles du
                   joueur, l'explosion et l'onde (`_blastAfter`, `_blastGround`).
                   Le plan demandait un `requires` de zone : aucune carte n'en cree,
                   elles viennent de l'arme et de la competence. `crampons` porte
                   `requiresSystem` en plus de `teamUnique` — sans dangers, en
                   calme, elle ne fait rien.
                   LE CRITERE DE DERIVE DES BOSS EST TROP BRUITE POUR ATTRIBUER UNE
                   VAGUE : +5 % apres la vague 2, +42 % apres la vague 3 en solo ;
                   -37 % puis -14 % a quatre. Le plancher de barre tronque la
                   distribution, et UNE GRAINE CESSE D'ETRE APPARIEE des que le
                   catalogue change — le tirage ne consomme plus le meme nombre de
                   nombres aleatoires. Trancher demande un pilote qui CHOISIT.
                   PIEGE PAYE : un releve non graine a rendu « puissance mediane
                   1,70, une victoire sur six » puis « 3,94, trois sur six » au
                   MEME code. Un releve non graine est du bruit
     0.8.20 equilibrage, lot F  LE MARCHAND DEVIENT UN CHOIX. Catalogue 10 -> 24
                   reliques (10/7/5/2), quatorze ecrites, quatre offres par visite,
                   UN SEUL ACHAT, poids de tirage `[50, 28, 15, 4]`, relance qui
                   croit DANS la visite (x1,8), rendement d'un point 15-35 -> 8-17.
                   `REROLL_WAVE` devient `REROLL_LEVEL` : le mot « vague » n'existe
                   plus depuis le plan 5.
                   LE PLAFOND STRUCTUREL EST CINQ ACHATS, PAS SIX : le boss final
                   clot la manche, il n'ouvre pas de marchand derriere lui.
                   LE RENDEMENT DU PLAN NE PRODUIT PAS LA CIBLE DU PLAN : 10-22
                   rendent 576 eclats sur une manche pleine pour une cible de
                   400-500 — la « division par deux » est un facteur 0,64. A 8-17
                   le modele rend 450, et c'est ce montant qui fait exister la
                   relance (19 % des visites contre 65 % a 576).
                   LE BOT NE RECOLTE PAS : le revenu est INJECTE depuis le modele
                   (`revenuRecolte`), sinon la mesure juge le pilotage. Il se
                   verifie sur le modele, pas sur une manche.
                   LE TAUX DE RELANCE EST UNE PROPRIETE DE LA POLITIQUE : 6 % pour
                   un acheteur qui se contente d'une rare, 65 % pour un chasseur
                   d'epique, au MEME code. Le critere porte sur `gourmand`, qui le
                   borne par le haut. Et « aucun palier dans plus de 50 % des
                   achats » n'est pas testable — un maximisateur concentre par
                   construction, un acheteur au hasard reproduit `WEIGHT` ; ce qui
                   se teste est la COUVERTURE, trois paliers sur quatre.
                   Le fanion n'a PAS de rayon : un PV max qui clignote au pas d'un
                   coequipier est une fabrique de defauts

     0.8.21 equilibrage, lot I  LE PILOTE, ET CE QU'IL REVELE. Le lot est un
                   PROTOCOLE : le plan interdit toute decision de valeur avant
                   mesure, et les trois mesures qu'il demande — survie par classe,
                   debit par classe, valeur d'une composition — etaient impossibles.
                   Les lots B, C, D et J ont chacun sorti un critere rouge avec la
                   meme note : IL FAUT UN PILOTE. Ce lot paie la dette.
                   DEUX BOTS, ET ILS NE SE REMPLACENT PAS. `botInput` avance sur le
                   corps le plus proche et n'appuie sur rien ; il reste INTACT,
                   parce que toutes les mesures des lots A a H se rejouent contre
                   lui. `pilotage()` recule d'une menace ponderee, teste douze
                   directions a 10 Hz en interrogeant `_zoneHits` sur le point
                   candidat (la geometrie d'une zone ne se recopie pas), releve,
                   ramasse, se met DANS le rempart d'un allie, et consomme ses
                   recharges : 100 / 45 % pour le tank, 91 / 94 % pour le tireur.
                   `metaProfil()` rend les trois profils de `PROFILS.md` dans la
                   forme exacte que `room.js` construit — EMPLACEMENTS et CARTES
                   VERROUILLEES compris. A P0 les quinze legendaires sont
                   verrouillees : le jalon garanti de `LEGENDARY_LEVELS` rend trois
                   cartes ordinaires, et c'est structurel, pas un defaut.
                   LE REMPART SOLO A P0 EN CALME EST VERT, et large : 676 s contre
                   388 (soigneur) et 479 (tireur), premier des trois. D14 (b) est
                   confirme a la lettre — la reponse du tank a la horde n'est pas la
                   fuite mais son Rempart. Avec un declencheur timide (« au moins
                   deux corps dans le rayon ») le meme tank tombait a 331 s : une
                   mesure de classe est d'abord une mesure de son pilotage. Aucune
                   correction de competence n'est donc autorisee, et `speedMul` ne
                   bouge pas.
                   LA DOCTRINE DES 90 % S'ECRIT AU LIEU DE SE SUPPOSER :
                   `vitesseClasseMediane()` la deduit de `CLASSES` au lieu de
                   supposer `CFG.PLAYER_SPEED`, et l'exception du Rempart se verifie.
                   UN CRITERE SORT ROUGE : le tireur domine les deux autres classes
                   EN SOLO hors calme (656 s contre 331 pour le tank a P0 normal,
                   13 236 degats par minute contre 4 354). Le kit du tank est en
                   valeurs fixes la ou le tireur multiplie sa build, donc `diff.dmg`
                   mange le premier ; en calme l'ordre s'inverse. Le levier est au
                   lot J, comme le plan l'ecrit — pas dans les valeurs de classe.
                   MAIS UNE CLASSE NE SE JUGE PAS LA OU ELLE N'EXISTE PAS. Deux
                   classes sur trois sont `unique` : la matrice « classe x
                   effectif » n'a de sens qu'EN SOLO, « deux tanks deux soigneurs »
                   n'est pas jouable, et au-dessus d'un joueur la comparaison est une
                   COMPOSITION. Lue en chaine (chaque ligne ajoute une classe), elle
                   donne l'apport : le soigneur vaut +40 % en normal et +36 % en
                   cauchemar, le tank +57 % en normal et zero en cauchemar. La
                   composition 1/1/2 va +120 % plus loin que quatre tireurs en normal
                   et +35 % en cauchemar, en sortant MOINS de degats : le systeme de
                   classes n'est pas decoratif, et l'echange est celui que trois
                   roles promettent. Le tank a zero en cauchemar est le residu du
                   lot, et il recoupe la matrice solo — c'est le mode ou sa survie
                   propre s'effondre.
                   LE TANK N'APPORTE RIEN A UNE TABLE QUI NE LE SUIT PAS : avec des
                   allies qui ignorent son rempart, la meme composition tombait a
                   691 s contre 1 021 pour quatre tireurs. Un terme de cohesion dans
                   le pilote la remet a parite. La valeur d'un tank est une question
                   de POSITIONNEMENT, et c'est mesure.
                   UN TAUX DE REUSSITE ABSOLU NE SE MESURE PAS SANS PILOTE HUMAIN :
                   la matrice de `PROFILS.md` reste le critere de CLOTURE du plan.
                   Ce qui se mesure ici est le relatif, a graines appariees

   --- plan7 : le ressenti ------------------------------------------------------
     0.9.0 lot L1  LE RETOUR DE COMBAT SE HIERARCHISE PAR LA FREQUENCE. Un jeu
                   de combat, c'est cinq impacts par seconde : chacun peut etre un
                   evenement. Un survivor a la minute 25, c'est vingt a soixante
                   MORTS par seconde — si chaque mort est un evenement, plus rien
                   n'en est un, et le limiteur de voix `admit` existe parce que ce
                   mur avait deja ete rencontre. La regle du lot : la frequence
                   d'un evenement determine INVERSEMENT son budget de retour.
                   LE CLIENT SAVAIT CE QUI ARRIVAIT, JAMAIS COMBIEN. Une grenade
                   qui fauchait trente ennemis produisait exactement la meme image
                   et le meme son qu'une grenade dans le vide. Les quatre souffles
                   (nova, grenade, onde, bombe) portent desormais leur nombre de
                   tues en clef `n`, coupee par `trimTail` quand elle est nulle :
                   duree, taille, gravite du sub et amplitude de l'anneau s'y
                   mettent a l'echelle.
                   LE CRITIQUE EXISTE ENFIN POUR LA HORDE. `crit` ne partait que
                   pour les boss, et sous forme agregee. Un second compteur
                   CYCLIQUE de 0 a 9 sur l'ennemi (`critSeq`, meme forme que
                   `hitSeq`) suffit, et le critique QUI TUE — qui ne laisse aucune
                   trace, le corps ayant disparu avec son compteur — vit sur le
                   TUEUR (`p.critKills`). Le retour est differencie par la couleur
                   et la hauteur, jamais par la taille et le volume : le son de
                   critique PREND la place de la touche dans le limiteur, donc le
                   nombre de voix par seconde ne bouge pas d'un cran.
                   L'ECLAIR CHANGE DE COULEUR SANS COUTER UN VIDAGE. `aFx` avait
                   quatre octets par sommet et n'en utilisait qu'un : la teinte
                   d'eclair devient un attribut de sommet, la ou l'uniforme global
                   aurait impose un lot de dessin par couleur. La touche d'un
                   allie sort donc a SA couleur, et le critique en ambre.
                   LES SOUFFLES SE COMPOSENT EN COUCHES, chacune avec sa propre
                   constante de temps : noyau de deux images, boule de feu, onde
                   de choc qui DEPASSE le remplissage, debris, fumee, marque au
                   sol. Le noyau NAIT a sa taille maximale — la montee progressive
                   est ce qui fait « animation » plutot que « detonation ».
                   LA MATIERE BOUGE (`_blastPush`) : impulsion radiale decroissante
                   avec la distance, integree comme une VITESSE qui retombe et non
                   comme une teleportation. En vue de dessus, rien d'autre ne dit
                   la puissance — quinze ennemis chasses vers l'exterieur se
                   voient, quinze qui disparaissent non. Le trou ouvert supprime
                   localement les apparitions pendant 1,1 s (`_dansUnTrou`), sans
                   quoi il se comble avant d'avoir ete vu. La bombe devient un
                   outil de POSITIONNEMENT : c'est signale a l'equilibrage.
                   TIRER SUR UN BOSS NE PRODUISAIT AUCUN RETOUR, et ce n'etait pas
                   un reglage trop discret mais un canal ABSENT : l'eclair blanc
                   vit dans `flashAtlas`, le boss est trace a la main hors atlas.
                   Sa silhouette est rejouee en clair par-dessus, 80 ms. Le point
                   d'impact, prevu dans `bossDmg` depuis toujours, n'etait rempli
                   que pour les Jumeaux — `_damage` prend deux coordonnees
                   optionnelles et les ramene sur la silhouette, donc chiffres et
                   etincelles naissent la ou la balle a touche. La barre garde son
                   segment perdu en clair 300 ms : une barre qui glisse en continu
                   ne se voit pas.
                   L'ARC EST UNE FONCTION, PAS UN TRAIT. Deplacement de point
                   milieu a amplitude decroissante, double couche additive (coeur
                   clair fin plus halo large), une a deux branches MORTES,
                   regeneration a 17 Hz. Ricochet, salve et lien du soigneur ennemi
                   y passent. Trois champs morts partent avec : `healTarget`,
                   `drawHealLinks`, `healCd`, `pressT` et `lastSeq` — le client
                   DEDUIT deja le lien du medic, la clef reseau ne servait a
                   personne.
                   LE RESTE : echelle de tonalite sur les kills en chaine (un
                   demi-ton par tue dans 0,4 s, plafonne a l'octave — la hauteur
                   est gratuite, aucune voix de plus), explosion en trois couches
                   d'oscillateurs, canalisation de recolte en huit paliers montants
                   puis accord de liberation, pouls d'equipe a la montee de niveau,
                   relevement d'un allie au plus gros budget du jeu, flux d'XP du
                   cadavre vers le joueur (aucune entite, aucun ramassage), hitstop
                   de 100 ms RESERVE aux barres de boss et rattrape a mi-vitesse,
                   melange additif enfin applique au chemin canvas 2D, et fusion
                   des chiffres proches avant que le plafond de quarante elements
                   DOM ne morde a quatre joueurs sur un boss.
                   Deux defauts trouves en chemin : `SRC_TINT` avait six entrees
                   pour sept provenances, et l'amortissement des particules etait
                   indexe sur l'IMAGE et non sur le temps

     0.9.1 lot L2  LE SOIN DEVIENT UN LIEN CONTINU. Le projectile de soin
                   disparait : en posture, le soigneur ne tire plus et des liens
                   s'accrochent seuls aux allies proches.
                   CE QUE CA COUTE EST ASSUME. Le depot identifiait la ligne de
                   vue comme l'interet de la classe — « soigner quelqu'un derriere
                   la horde est un probleme de position, pas un clic sur une
                   barre » — et un lien de proximite supprime cette visee. La
                   contrainte n'est donc pas RETIREE, elle est REMPLACEE : la
                   question passe de « ai-je une ligne de tir ? » a « puis-je
                   RESTER pres de lui ? », l'echec passe du tir rate au lien
                   casse, et le geste passe de viser a travers la horde a tenir
                   une position dangereuse. Pour un jeu cooperatif c'est un
                   meilleur probleme, et ca regle la faiblesse du role : ce que
                   fait le soigneur devient visible pour toute la table.
                   LE SOCLE NE LIE QUE LES ALLIES et ne rend aucun PV au soigneur.
                   `HEAL_MODE_SELF` valait 8,6 PV/s en continu, la vague seule
                   vaut 2,2 : l'auto-subsistance est divisee par quatre et la
                   posture devient INERTE en solo. C'est un choix, pas une
                   regression — un soutien seul n'a pas de sens strategique, et
                   c'est un probleme d'affichage : la carte de classe le dit
                   AVANT, elle ne le laisse pas decouvrir a la minute 8.
                   LE DEBIT NE MONTE PAS. 20 PV/s sur une cible contre 28,6
                   theoriques : le lien ne rate jamais, il ne peut donc pas
                   soigner autant. A deux cibles le total monte a 40, et c'est
                   l'objet du lot — un gain de GROUPE, pas de puissance brute.
                   Mesure : 20,0 PV/s sur une cible, zero clignotement sur un
                   allie qui oscille a la limite du rayon (le delai de grace
                   tient), rupture franche a 0,75 s, relevement a 10 m en 1,00 s.
                   TROIS CARTES ET DEUX LIGNES DE META CHANGENT DE SENS.
                   `faisceau_double` devenait vide (« le projectile traverse un
                   allie ») : elle devient `ramification`, un lien de plus, meme
                   intention transposee. `siphon` (epique) rend l'autonomie en
                   REECRIVANT une regle du mode — les liens LIBRES prennent des
                   ennemis, jamais la place d'un allie blesse. `portee` cesse
                   d'etre une portee de tir pour devenir un rayon de tolerance,
                   donc la ligne DEFENSIVE du soigneur. `catalyse` s'applique a
                   tous les allies lies a taux reduit (0,02 par point au lieu de
                   0,03) : le plafond reste comparable a deux cibles, et
                   l'archetype « lier large » se paie en efficacite par cible au
                   lieu d'etre gratuit.
                   LE PILOTE SUIT LA MECANIQUE, sans quoi la mesure de composition
                   jugerait un soigneur qui laisse casser tous ses liens : il
                   n'entre plus en posture pour se soigner lui-meme, ne vise plus
                   personne, et TIENT SA POSITION pres de celui qu'il soigne.
                   Menage : `_healBullet`, `_fireHeal`, `_healPurgeHit`,
                   `p.healHits`, `mods.healPierce`, `BOLT_CROSS` et
                   `COMBAT.bulletHeal` disparaissent avec le projectile ; le tuple
                   de balle perd son drapeau de soin, donc `owner` remonte a
                   l'index 3. La purge par le soin se comptait en TOUCHES, elle se
                   compte desormais en TEMPS de lien

     0.10.0 lot 01 QUATRE CORRECTIFS, ET DEUX N'ETAIENT PAS CE QU'ILS
                   PARAISSAIENT. « Terrain conquis » ne montrait pas de flaque :
                   la zone existait, mais `_zoneApply` ne frappe QUE des joueurs
                   — le sol brulant du joueur brulait SON AUTEUR (13,5 PV/s
                   mesures) et ne touchait aucun ennemi. Une zone porte donc un
                   proprietaire (`z.pj`, clef de queue du tuple) : elle frappe la
                   horde par `_damage`, epargne les joueurs, et se teinte de la
                   couleur de son auteur au lieu d'etre indistinguable d'une
                   trainee ennemie.
                   LES DRONES ETAIENT SIMULES, SERIALISES ET DESSINES — ils
                   orbitaient a 30 et 46 px, dans la pile d'anneaux du joueur
                   (`RING_BUFF0` = 30), et le sprite du joueur les recouvrait. Ils
                   prennent une bande de rayon EXCLUSIVE au-dela des lames
                   (92 et 112 px). Le champ, le reseau et le trace etaient bons :
                   c'etait la regle des bandes exclusives qui manquait.
                   LE ZOOM AUX BORDS EST UNE DISCONTINUITE DE VITESSE. La camera
                   etait lissee puis ECRETEE : au bord elle s'arretait net, en une
                   image, et l'oeil lit cette rupture comme un zoom. On ecrete la
                   CIBLE, le lissage porte l'arrivee. Au passage la projection GL
                   prend une ECHELLE et non une taille de monde — seul moyen que
                   les trois couches derivent leurs pixels-par-unite du meme
                   nombre. `?repere` pose la meme croix aux memes coordonnees sur
                   les trois couches : critere rejouable de l'alignement.
                   LA RECHARGE DE BOUCLIER ETAIT UN INTERRUPTEUR. Le delai de 6 s
                   fonctionnait, mais rendait le pool ENTIER d'un coup :
                   `SHIELD_REGEN_RAMP` (1,8 s pour le pool plein) punit les degats
                   espaces. Mesure : un coup vidant le bouclier toutes les 7 s
                   plafonne a 55,6 % du pool, contre 100 % avant

     0.10.1 lot 02 LA BANQUE DE DEGATS DISPARAIT — LE DPS EXCEDENTAIRE EST
                   PERDU. Ce qui depassait le plancher d'une barre etait mis de
                   cote puis RENDU a la rupture : le palier cadencait la mort du
                   boss sans jamais la retarder. D'ou les deux symptomes a la
                   fois — « ils meurent trop vite » (plusieurs barres tombaient
                   d'un coup, en boucle) et « on ne fait plus de degats » (les PV
                   affiches restaient colles au plancher pendant que la banque se
                   remplissait). Le second etait le pire : la fenetre n'etait pas
                   seulement invisible, elle MENTAIT, puisque les degats
                   comptaient vraiment.
                   `_bossFloor` est le plancher, et il est unique : `_damage` s'y
                   arrete, `_bossBars` l'attend. La boucle `while` devient un
                   passage : UNE barre par palier, jamais avant la fin du delai.
                   Mesure : 40,6 s de combat a 1500 dps, 40,2 s a 6000 — le
                   plancher `(bars - 1) x BAR_DWELL` est desormais REEL, et la
                   phase 4 est atteinte dans les deux cas. Les couches `unlock[2]`
                   et `unlock[3]`, jamais jouees jusqu'ici, sortent enfin :
                   douze cles d'attaque distinctes sur un seul combat contre
                   quatre avant.
                   LE PALIER SE VOIT ET IL EST OCCUPE. Enveloppe blanche pulsee,
                   barre de vie qui passe au blanc et se vide sur la duree,
                   ricochets sans chiffre (une touche sans degat porte le point
                   d'impact et rien d'autre), effet d'ENTREE (`kind: 15`) la ou
                   `kind: 6` marquait la sortie. Et la mecanique de la phase
                   suivante s'y joue : ce que `_deferAtk` faisait pour l'Amalgame
                   vaut pour les cinq autres. La transition cesse d'etre un temps
                   mort pour devenir le sommet de la phase.
                   Le champ `bank` du tuple de boss, dont la lecture est morte,
                   est remplace par `palier` — la part de palier restante

     0.10.2 lot 04 LES EFFETS MUETS, ET LE BLANC QUI SATURE. `EFFECT_SOUND` ne
                   couvrait que sept identifiants sur les quinze emis : balayage,
                   arc, rempart, provocation et vague de soin ne faisaient aucun
                   bruit. Ils en ont un, ecrit a l'oscillateur. Trois restent
                   muets VOLONTAIREMENT et c'est ecrit dans la table : `2` et `6`
                   sonnent deja par leur evenement nomme (les doubler les ferait
                   sonner deux fois), `4` est un fourre-tout — un son unique pour
                   la balise, la purification, la Sentence et le relevement
                   mentirait.
                   L'ARC PREND LA PLACE D'UNE TOUCHE dans le limiteur (`key:
                   "impact"`), comme le critique : une build de ricochet en
                   produit plusieurs par seconde et le nombre de voix ne bouge
                   pas d'un cran.
                   L'ELECTRICITE N'EST PAS UN BOURDONNEMENT. `foudre` est une
                   serie de craquements aux intervalles IRREGULIERS (30 a 90 ms)
                   sur un corps carre desaccorde : un intervalle constant donne
                   une machine a coudre, et le carre est ce qui la rend sale.
                   LE COEUR D'UN SOUFFLE N'EST PLUS BLANC PUR. En additif, un
                   `#ffffff` a alpha plein sature des la deuxieme couche — c'est
                   une surexposition, pas une detonation. `COMBAT.blastCore`
                   (`#fff4e0`) baisse la SOURCE et laisse l'empilement fabriquer
                   le coeur chaud. `COMBAT.flash` reste blanc pur : il sert au
                   flash de touche de la horde, ou c'est correct

     0.10.3 lot 05 TRENTE ET UNE MECANIQUES, ET AUCUNE CONVENTION COMMUNE : rien
                   ne s'apprenait d'un boss a l'autre. Trois axes, tous
                   verifiables (`verifierGrammaire`).
                   LA FORME DIT L'ACTION. Onze formes pour trente et une
                   mecaniques — une forme sert plusieurs mecaniques, une
                   mecanique ne change JAMAIS de forme. Elle est rappelee a cote
                   de l'ordre, ce qui finit par rendre le texte inutile.
                   LA COULEUR DIT L'INTENTION, ET LE COLLECTIF NE SE DECLARE PAS.
                   Toute mecanique a `minPlayers >= 2` est violette : la regle
                   s'applique seule sur les donnees existantes, il n'y a pas de
                   champ a tenir a jour. Le violet dit « ce n'est pas ton
                   probleme, c'est notre probleme ».
                   LE TEMPS DIT L'URGENCE, et il n'a plus que QUATRE valeurs :
                   reflexe 0,8 · standard 1,6 · lecture 2,4 · preparation 4,0.
                   Les seize `*_WARN` s'y rangent (`SEAL_WARN` tombe de 6,0 a
                   4,0). `PUDDLE_WARN` reste a 0,4 : ce n'est pas un
                   avertissement, c'est un effet.
                   DEUX TEXTES PAR MECANIQUE. Les textes existants etaient de
                   bonnes EXPLICATIONS utilisees comme ORDRES — « le nombre
                   inscrit doit etre exact » ne se lit pas en combat. L'imperatif
                   court (quatre mots au plus, verifie) passe en combat,
                   l'explication est reservee a la PREMIERE rencontre.
                   LE METRONOME EST JOUABLE SON COUPE. Il frappe desormais sur le
                   temps, et la grille est `this.time` — que le client a deja.
                   Rien ne traverse le reseau, donc le metronome visuel ne peut
                   pas mentir : quatre temoins sous la barre, anneau qui se
                   contracte et claque au quatrieme. Mesure : douze frappes
                   consecutives a moins d'un tick du temps fort.
                   NON FAIT, ET ASSUME : le shader de telegraphes (B-4). Il
                   demande un second programme GL et une parite complete avec le
                   chemin 2D de repli, sur la surface la plus regardee du jeu,
                   pour un gain qu'aucun critere d'acceptation du lot ne demande

     0.10.4 lot 06 LES SIX BOSS ETAIENT DES MONSTRES QUI SE DEPLACENT. Le verbe
                   les differenciait sur le papier, l'espace non — et c'est
                   l'espace que le joueur ressent : cinq boss qui l'occupent de
                   la meme facon se vivent comme UN boss a cinq jeux de
                   telegraphes. Six archetypes, un par boss, `verifierArchetypes`
                   refuse le partage.
                   ANCRE (Oracle) : il s'encastre dans un bord tire au sort et ne
                   bouge plus — mesure : 0 px parcouru en 25 s, contre 1100 pour
                   les autres. Aucune de ses mecaniques n'avait besoin qu'il se
                   deplace : c'est un archetype gagne sans en reecrire une seule.
                   Un cote de l'arene devient dangereux en permanence, l'autre
                   est un refuge, et la distance redevient un arbitrage.
                   CONSTRICTEUR (Ravageur) : la constriction cesse d'etre une
                   attaque pour devenir l'ETAT du combat — un cran par rupture,
                   jamais repris. Mesure : 100 % puis 76 % de surface sur deux
                   ruptures. Un soft-enrage entierement spatial, sans compte a
                   rebours. LA COURONNE REPOUSSE, ELLE NE TUE PLUS (`CROWN_PUSH`
                   remplace `CROWN_DPS`) : une arene qui se referme en permanence
                   aurait fait du nettoyage gratuit, credite en experience.
                   DIFFUS (Matriarche) : elle se soigne de TOUTE la foule proche,
                   plafonnee a douze corps. Le seul boss qui utilise la horde au
                   lieu de la subir — donc impossible dans un survivor solo.
                   MULTIPLE (Jumeaux) : `TWIN_HEAL` passe de 0,008 a 0,022 et le
                   lien est visible EN PERMANENCE, plus seulement pendant
                   `MECH_LINK`. Le joueur doit voir POURQUOI il faut les separer.
                   FIXE (Amalgame) : il ne marche plus, il se teleporte.
                   MOBILE (Metronome) : il le garde, et il est desormais le seul

     0.10.5 lot 07 LA DIFFICULTE D'UN COMBAT DE BOSS NE SE REGLE NI PAR LES PV
                   NI PAR LES DEGATS, MAIS PAR LE NOMBRE DE CHOSES A LIRE EN
                   MEME TEMPS. Jusqu'ici seul `diff.boss` bougeait, sur les PV :
                   les mecaniques etaient identiques en calme et en cauchemar.
                   `bossProfil` ouvre une cle du profil de difficulte et porte
                   six leviers, avec un seul point de lecture (`_bossProfil`).
                   Un telegraphe seul est facile ; un telegraphe pendant qu'on
                   tient une tour et qu'un allie est marque, c'est un vrai
                   probleme — et c'est plus interessant que +25 % de PV.
                   `BAR_DWELL` MONTE avec la difficulte (8 / 10 / 12). C'est
                   contre-intuitif et c'est voulu : le palier est le moment ou se
                   joue la mecanique de la phase suivante (lot 02), donc en
                   cauchemar on en subit PLUS. Mesure du plancher de combat :
                   32,1 s en calme, 40,1 en normal, 48 attendus en cauchemar.
                   CALME NE DEBLOQUE PAS `unlock[3]`. La couche la plus dure de
                   chaque boss devient ce que `normal` a de plus, au lieu du meme
                   contenu en plus mou. Verifie : aucun `unlock[3]` n'entre dans
                   le repertoire en calme, sur les six boss.
                   P4 · L'ECHEC EST D'ABORD INDIVIDUEL, et c'est ce qui separe un
                   jeu de fete d'un jeu de raid. `_mechFail(fautifs, ratio, mech)`
                   est le point de passage. En calme, seul le fautif encaisse
                   (mesure : innocent a -0 PV) ; en cauchemar tout le monde ; en
                   normal, seules les mecaniques d'OCCUPATION restent collectives
                   — et elles se reconnaissent a leur forme `colonne`, deja
                   ecrite par le lot 05. La grammaire fait le travail, il n'y a
                   aucune liste a tenir a jour.
                   `_warn` DEPLACE une duree d'un cran de classe, il n'en invente
                   pas : calme lit tout en `lecture` (1,6 -> 2,4), cauchemar tombe
                   en `reflexe` (0,8) a partir de la phase 5. Trente-deux
                   telegraphes y passent ; `PUDDLE_WARN` reste dehors, ce n'est
                   pas un avertissement.
                   `STACK_RADIUS` et `SPREAD_MIN` suivent enfin l'EFFECTIF : ce
                   qui est serre a quatre etait trivial a deux.
                   LES RENFORTS DE CAUCHEMAR DURCISSENT EN SE REGROUPANT. Ca
                   force l'ecartement de l'equipe sans aucun telegraphe, juste
                   par une regle : elle ne s'annonce pas, elle se decouvre. Elle
                   passe par la grille (jamais en n²) et respecte la regle des
                   auras — la MEILLEURE reduction, jamais le produit

     0.10.6 lot 08 TROIS BOSS DE PLUS, ET UN FINAL PAR DIFFICULTE. Le roster
                   passe de six a onze entrees, en APPEND-ONLY : l'index circule
                   dans `bo[9]`, inserer au milieu reecrirait le sens de tous les
                   instantanes. Le pool cesse donc d'etre un prefixe pour devenir
                   une LISTE (`BOSS_POOL`, huit entrees) et `BOSS_POOL_COUNT`
                   reprend son vrai sens : combien une MANCHE en montre, pas
                   combien le depot en compte. Une partie n'en voit plus que 5/8.
                   VEILLEUR (renoncement) : bati sur `MECH_GAZE`, la seule
                   mecanique qui interdit l'action principale — en tir a double
                   stick, detourner le regard veut dire renoncer a son DPS. En
                   derniere phase l'oeil ne se ferme plus.
                   TISSEUR (espace) : le Ravageur RETIRE de l'arene par la
                   peripherie, le Tisseur CONSTRUIT a l'interieur. Les mares
                   deviennent sa passive, et les noeuds sont la contrepartie —
                   c'est le seul boss ou le joueur REPARE l'arene.
                   PRISME (identification, `minPlayers: 2`) : la ou les Jumeaux
                   demandent de SEPARER, il demande de DISTINGUER. Premier boss
                   reserve au multijoueur, et c'est assume. Verifie : zero
                   tirage sur 4000 en solo.
                   RECITANT (calme, 5 barres) rejoue ce que les autres ont
                   appris et rend l'equipe a plein a chaque rupture — un examen
                   blanc. SILENCE (cauchemar, 6 barres) est le seul boss du
                   depot autorise a casser UNE regle : passe la phase 5, une
                   mecanique deja vue revient SANS ANNONCE. Le telegraphe au sol
                   reste — c'est l'annonce qui disparait, pas la geometrie. Ca ne
                   tient que parce que la grammaire du lot 05 est acquise
                   partout ailleurs.
                   DEUX MANCHES DE SUITE NE SE RESSEMBLENT PLUS : le tirage se
                   souvient de la precedente (`bossPrecedents`, memoire tenue par
                   la SALLE). Mesure : au moins 3 boss nouveaux entre deux
                   manches, pire cas sur 500 paires — contre 0 garanti sans la
                   memoire, un pool plus grand ne suffisant pas.
                   UN BOSS QUI SE SOIGNE NE CASSAIT PLUS AUCUNE BARRE. Bug reel
                   trouve a la mesure : le soin le decollait du plancher entre le
                   clamp de `_damage` et le test de `_bossBars`, donc la rupture
                   n'arrivait jamais. Matriarche et Jumeaux restaient bloques a
                   80 % de PV indefiniment. `_bossHeal` devient le point de
                   passage unique de tout soin de boss : jamais au-dessus du
                   plafond de la barre courante, et rien du tout quand une
                   rupture est en attente.
                   LE PARTAGE DES LEGENDAIRES NE BOUGE PAS (cinq paquets) : les
                   jalons des boss 6 a 10 rendent des armes, comme le sixieme le
                   faisait deja. Aucun compte ne se reverrouille ; en revanche
                   rencontrer les cinq porteurs prend plusieurs manches

     0.11.0 lot 01 TROIS CORRECTIFS, ET LE PREMIER TENAIT DANS UNE SOUSTRACTION.
                   Les chiffres de degats du boss ne s'affichaient pas :
                   `pushDamage` passait des coordonnees MONDE a `hudDamage`, qui
                   attend des coordonnees de VUE et ecarte tout ce qui depasse
                   `VIEW_W`. Un boss a x = 2400 etait donc ecarte a chaque coup.
                   Les deux autres appelants soustrayaient bien la camera —
                   l'etincelle et le coup de zoom sortaient, seul le nombre
                   manquait, ce qui rendait le defaut illisible.
                   LE REBOND NE CONNAISSAIT QUE LES BORDS. Une balle a rebond
                   mourait sur un obstacle de biome. Elle s'y reflechit
                   desormais, par la meme resolution d'AXE que `_obstacleBlock`
                   (on ressort par la face d'ou l'on venait, sinon une balle
                   rapide traverse et repart du mauvais cote). Un mur
                   destructible encaisse ET renvoie : `_obstacleHit` reste le
                   point de passage unique des degats de couverture, il rend
                   maintenant l'obstacle au lieu d'un booleen. Au plus un rebond
                   consomme par tick, bord et obstacle confondus.
                   LES JUMEAUX SORTENT DU SOLO (`minPlayers: 2`). Les deux corps
                   visent le meme `_nearestPlayer` : a un seul joueur ils ne se
                   separent jamais, restent dans `TWIN_HEAL_RANGE` et se soignent
                   de 2,2 %/s — il fallait depasser ce taux en net pour avancer
                   DANS une barre, ce qu'un joueur seul ne fait pas. Deuxieme
                   boss reserve au multijoueur apres le Prisme. Verifie : zero
                   tirage sur 4000 en solo, six boss encore eligibles pour cinq
                   places, archetypes toujours uniques

     0.11.1 lot 02 LA METEO ETAIT UN VECTEUR CONSTANT QUI POUSSAIT TOUT LE
                   MONDE — donc elle ne faisait rien. Une bourrasque appliquee
                   aussi a la horde ne change pas la distance entre elle et le
                   joueur : elle TRANSLATE la scene. `_gust` n'a plus qu'un
                   appelant, `_players`, et le texte de la table le dit.
                   `windAt(w, t)` remplace `{dx, dy}` : angle et force sont des
                   FONCTIONS DU TEMPS DE MANCHE, rejouables a l'identique des
                   deux cotes, toujours sans un octet de reseau (le tirage ne
                   depend que de la graine et du segment). L'enveloppe reprend
                   la forme de `hazardState` — periode, fenetre active, rampe —
                   parce qu'un vent qui ne retombe jamais a zero cesse d'etre un
                   evenement pour devenir une taxe. Deux sinus d'angle
                   incommensurables dont la somme depasse le demi-tour : la
                   rafale s'inverse en cours de segment. Mesure : vent present
                   59 % du segment, plus longue accalmie 10,9 s, balayage 195°,
                   exposition moyenne 15,4 px/s contre 46 en permanence avant —
                   moyenne divisee par trois, pic identique, et le pic compte
                   maintenant vraiment puisque la horde n'y est plus soumise.
                   LA METEO SE VOIT ENFIN. `drawWeather` pose un champ de brins
                   sans une seule particule allouee : la position d'un brin est
                   une fonction de son indice et du temps, un seul `stroke` pour
                   tout le champ, ancrage MONDE et non camera (ancre a la
                   camera, le vent parait accroche au joueur). Densite, longueur
                   et vitesse lisent la meme `force`, donc une accalmie se VOIT
                   avant de se sentir. La cendre reutilise le meme champ. Sous
                   les zones : la meteo est du sol, le telegraphe garde le
                   dessus. Deux teintes entrent dans la charte (`WEATHER`)

     0.11.2 lot 03 LA GEOMETRIE DE BIOME NE BOUGE PLUS APRES LA CONSTRUCTION,
                   ELLE S'INDEXE DONC UNE FOIS. `_obstacleBlock` et `_ground`
                   balayaient toute la table pour chaque corps et chaque tick :
                   8,7 millions d'appels sur 420 s de mesure, la part la plus
                   chere du pas de simulation. `_statIndex()` construit un tri
                   par comptage a la premiere requete, et `_statCandidats` rend
                   un voisinage 3x3.
                   MEME PREUVE QUE `_grille()`, ce qui est le seul interet de
                   reprendre sa forme : `cell = plus grande demi-boite +
                   STAT_MARGE`, donc une boite qui recouvre la requete a son
                   centre a moins d'une cellule, donc dans le voisinage.
                   Ecretage 1-lipschitzien, il ne separe jamais. Une requete
                   plus large que la marge (aucune aujourd'hui : le plus gros
                   corps du depot est le gibier de chasse, rayon 62) REPLIE sur
                   le balayage complet au lieu de mentir.
                   LES CANDIDATS SORTENT EN ORDRE CROISSANT D'INDICE, par tri
                   par insertion. Ce n'est pas de la coquetterie :
                   `_obstacleBlock` applique ses poussees en sequence et
                   `_obstacleAt` rend la premiere trouvee, donc l'ordre de
                   visite fait partie du resultat des qu'un corps touche deux
                   boites a la fois.
                   `_ground` rend un objet REUTILISE : appele pour chaque corps
                   et chaque tick, il allouait des millions de couples de
                   scalaires. Ses deux appelants le lisent immediatement.
                   Verifie a l'identique et non a l'estime : six manches de
                   420 s rejouees deux fois, graine de `Math.random` comprise,
                   avec index et avec le balayage remis en place — empreintes
                   egales a chaque seconde ; plus 80 000 requetes exhaustives
                   comparees au balayage. Gain mesure sur le meme scenario de
                   saturation : step median 0,83 -> 0,42 ms, p99 1,44 -> 0,72,
                   soit moitie moins

     0.11.3 lot 04 MESURER DE VRAIES PARTIES. `?mesure` dans l'URL arme une
                   trace JSONL cote SERVEUR : le client ne voit qu'un instantane
                   deja coupe et agrege, donc une trace prise au navigateur ne
                   serait pas comparable a un `GameState` de simulation.
                   Une ligne = un objet JSON : une manche interrompue laisse un
                   fichier exploitable au lieu d'un tableau tronque, et un script
                   de mesure le relit en une ligne de code.
                   Le contrat de `Room` tient : elle produit des objets et ne
                   connait ni disque, ni chemin, ni format de nom — le HUB reste
                   le seul ecrivain, comme pour la progression. Nouveau hook,
                   `trace`. L'etat est attache a la SALLE, deux salles se
                   tracent independamment.
                   TOUT SE DEDUIT D'UNE COMPARAISON AVEC L'IMAGE PRECEDENTE :
                   niveau, segment, boss, barre, evenement, meteo, mise a terre,
                   relevement, mort. La simulation ne sait pas qu'on l'observe.
                   Seules poses et echecs de mecanique n'etaient pas observables
                   du dehors et demandaient deux compteurs (`mechStats`, pose
                   comptee AVANT le Silence : la mecanique existe meme quand elle
                   ne s'annonce pas). Les cartes REFUSEES sont enregistrees avec
                   la prise — c'est le couple qui dit ce qu'une carte vaut.
                   La mesure SE VOIT (`#trace`, pendant la manche, contrairement
                   a la version) : enregistrer la partie des autres sans le dire
                   ne se fait pas. Etat porte aussi par le salon, pour qui arrive
                   apres.
                   AU PASSAGE, UN VRAI BUG : deux `case "lobby"` cohabitaient
                   dans le routeur depuis le decoupage du client (0.8.0). JS
                   retient le PREMIER, donc le bloc qui differait par la file du
                   monde etait mort et le vivant tombait sans `break` dans
                   `serverInfo` — `rtt` indefini a chaque salon, historique de
                   manches jamais mis a jour, et l'invariant « le salon s'applique
                   a la reception SAUF si la file n'est pas vide » viole

     0.11.4 lot 05 L'INSTANTANE SE FILTRE PAR VUE. `snapshot(vue)` jette ce qui
                   est loin ; `vue` absent rend l'instantane complet, au bit
                   pres. Le rectangle est celui que le client AFFICHE vraiment :
                   centre sur le joueur puis ECRETE a l'arene, comme
                   `updateCamera` et comme `_pushOffScreen` — centrer sans
                   ecreter laisserait, dans un coin, une bande visible a l'ecran
                   que le serveur aurait filtree.
                   RESTENT ENTIERS : les joueurs (les fleches de coequipiers hors
                   champ les lisent), le boss, les ZONES et les MARQUEURS. Un
                   telegraphe rate est une perte de jeu, et ils ne pesent qu'un
                   dixieme du paquet — le refus est deliberé.
                   LA CLE EST ARRONDIE VERS L'EXTERIEUR sur une grille de 256 px,
                   donc deux joueurs proches partagent un rectangle et une seule
                   compression : groupee, l'equipe coute exactement ce qu'elle
                   coutait avant. Arrondir vers l'exterieur n'enleve jamais rien.
                   COTE CLIENT, UNE ABSENCE N'EST PLUS UNE MORT. `diffSnapshots`
                   lisait tout ennemi disparu comme un mort — filtre, il aurait
                   fabrique une explosion et un son a chaque sortie de champ.
                   `dansVue` borne l'evenement a la vue, avec une marge PLUS
                   ETROITE que celle du serveur : un corps filtre n'y est donc
                   jamais. Meme correctif pour le ramassage d'un bonus et pour le
                   son de tir, qui se lisaient aussi sur une apparition.
                   Mesure a 736 corps : equipe eclatee aux quatre coins,
                   7,4 -> 2,4 Mbit/s pour la salle, soit 67 % ; equipe groupee,
                   0 %, mais une seule compression au lieu de quatre. Le filtrage
                   paie exactement quand l'equipe se separe et ne coute rien
                   quand elle ne se separe pas. Verifie : sur 8400 instantanes a
                   quatre joueurs, camera du client rejouee a l'identique et
                   retard d'interpolation compris, RIEN de ce qui est a l'ecran
                   ne manque du paquet

     0.11.5 lot 07 LE PROFILEUR A DESIGNE MON PROPRE LOT 03. `_statCandidats`
                   pesait 65 % du pas de simulation : l'index est bien deux fois
                   plus rapide que le balayage qu'il remplace, mais il refaisait
                   a CHAQUE requete un travail qui ne depend que de la geometrie
                   — neuf cellules scannees puis triees, par corps, trois fois
                   par tick.
                   OR LE VOISINAGE 3x3 D'UNE CELLULE NE CHANGE JAMAIS. Il se
                   cuit : une liste par cellule, dedupliquee et triee, et la
                   requete se reduit a lire une plage (`_statCell` rend la
                   cellule, `vstart`/`vitems` la plage). 486 entrees pour 28x16
                   cellules. Le tri par insertion et le tampon `sortie`
                   disparaissent avec.
                   L'ordre croissant d'indice est conserve — il est desormais
                   garanti a la CUISSON au lieu de l'etre a la requete, et il
                   reste ce qui fait que deux boites touchees en meme temps se
                   resolvent dans le meme ordre qu'au balayage.
                   Gain reel, A CHAUD : 23,5 -> 20,4 ms de CPU par seconde de
                   jeu, soit 13 %. Les 76 % annonces au commit etaient un
                   ARTEFACT DE CHAUFFE (voir 0.11.6) : a froid le meme banc
                   donne 68,1 -> 19,1, mais un serveur qui tourne est chaud.
                   Verifie comme le lot 03, a l'identique : six manches de 420 s
                   rejouees avec et sans index, empreintes egales, plus 80 000
                   requetes exhaustives. Ce qui reste vrai sans reserve, c'est la
                   SIMPLIFICATION : plus de tri par insertion, plus de tampon de
                   sortie, plus de balayage 3x3 a la requete

     0.11.6 correctif de MESURE, aucun changement de code. Deux bancs se
                   contredisaient sur le lot 07 ; l'arbitrage (meme processus,
                   meme scenario, a froid puis a chaud) montre que le gain
                   annonce mesurait surtout la compilation JIT :

                     a froid   avant 68,1 ms/s   apres 19,1   -72 %
                     a chaud   avant 23,5 ms/s   apres 20,4   -13 %

                   DEUX CONCLUSIONS TOMBENT AVEC. L'« anomalie » equipe eclatee
                   3,5 fois plus chere que groupee n'existait pas : a chaud,
                   avant le lot 07, eclatee coutait 23,5 et groupee 26,1 — elle
                   etait moins chere. Et le CPU n'a jamais ete le facteur
                   limitant a 3-4 salles : les 127 % d'un coeur qui ont motive le
                   lot 07 etaient du froid, la vraie valeur d'alors etait ~45 %.
                   LECON, ecrite ici parce qu'elle resservira : un banc a passage
                   unique sur du JS mesure le JIT autant que le code. Toute
                   mesure de CPU de ce depot doit chauffer avant de compter

     0.11.7 LA BRUME NE FAISAIT RIEN, ET CE QU'ELLE FAISAIT ALLAIT A L'ENVERS.
                   Aucun effet de simulation (`WX_BRUME` n'apparaissait nulle
                   part dans `game_state.js`), et cote rendu elle ne
                   reparametrait qu'un vignettage DEJA present en permanence
                   (0,68 en cauchemar). Pire, `FOG_FROM: +0,12` eloignait le
                   depart du degrade : mesure, le bord haut/bas de l'ecran
                   (450 px, la demi-hauteur) passait de 0,155 a 0,051 — elle
                   ECLAIRCISSAIT la moitie des directions d'arrivee, alors que sa
                   propre ligne de table promet « on ne voit plus venir ».
                   ELLE DEVIENT UN CHAMP DE VISION. `voileBrume(x, y)` :
                   visibilite pleine jusqu'a `FOG_CLEAR` (260), plus rien au-dela
                   de `FOG_BLIND` (480), decroissance en carre entre les deux. Le
                   disque est centre sur LE JOUEUR et non sur la vue — c'est sa
                   vision qui se retrecit, et la camera s'ecrete aux bords de
                   l'arene alors que lui non. Cout reseau nul, le serveur reste
                   autoritaire : on cesse de DESSINER, on ne cesse pas de savoir.
                   UNE SEULE REGLE, ET ELLE DECIDE DE TOUT : la brume masque LA
                   HORDE, jamais une annonce. Zones, telegraphes, marqueurs,
                   boss, allies, structures restent intacts. Et ce qui s'annonce
                   PERCE le voile — un fonceur declenche a `DASH_RANGE` (420),
                   donc dans la brume : son preavis y serait a 7 % d'opacite.
                   Un preavis qu'on ne voit pas n'est pas difficile, il est
                   injuste. Le corps qui prend son elan redevient net.
                   Ce qui TIRE reste visible par construction, sans regle
                   speciale : le tireur se place a 170 et le soigneur ennemi a
                   240, tous deux dans la zone claire.
                   `FOG_FROM` passe a -0,10 pour que le vignettage accompagne le
                   masquage au lieu de le contredire. Les deux constantes de
                   portee sont un PREMIER REGLAGE, a juger en jouant

     0.12.2 lot 03 LE JEU ETAIT DESSINE, L'INTERFACE NON. Sprites traces, boss
                   proceduraux, sol cuit — et par-dessus, une barre de vie de
                   cinq pixels a couleur pleine : deux langages visuels
                   cohabitaient et l'interface etait le pauvre des deux. Le HUD
                   RESTE EN DOM, c'est un chantier de MATIERE, pas
                   d'architecture — le cache d'ecriture de `hud.js` est la bonne
                   reponse, et le CSS sait deja tout faire.
                   LE FANTOME DE DEGATS DEVIENT UN POINT DE PASSAGE UNIQUE
                   (`barGhost`). Il n'existait que pour la barre de boss ; il
                   couvre maintenant la barre de soi et celles des allies. C'est
                   le gain de lisibilite du lot : une barre qui glisse ne se voit
                   pas, une barre qui laisse une trace montre COMBIEN on vient de
                   prendre.
                   LE BOUCLIER PASSE PAR-DESSUS LA VIE, PAS A COTE. C'etait une
                   seconde barre de 4 px au-dessus : le joueur lisait deux
                   nombres au lieu d'un etat. Surcouche translucide a trame
                   diagonale, qui S'ETEINT au coup et pulse pendant la rampe de
                   `SHIELD_REGEN_RAMP` — sans ca il subit une regle qu'il ne voit
                   pas. Une seule classe `.gauge` porte les six traitements
                   (matiere, fantome, graduations, seuil bas, bouclier,
                   epaisseur), donc soi et allies ne peuvent plus diverger.
                   LES GRADUATIONS SONT DES PV, PAS UNE PROPORTION : un repere
                   tous les 25 PV, pose par `--tick` calcule sur `maxHp`. A
                   150 PV pour un Rempart et 85 pour un Tireur, la meme fraction
                   ne dit pas la meme chose.
                   L'APPUI SE NOTE MEME EN RECHARGE (`pipPress` en couche 0,
                   ecrit par `input.js` via `notePress`, lu par le HUD). Sans ce
                   retour le joueur ne sait pas s'il a mal appuye ou si c'est
                   indisponible — et ca ne touche pas la validation serveur.
                   L'ultime prend son rang : encadre, plus grand, sa propre
                   pulsation de disponibilite, et le palier 3 vire au
                   legendaire — la promotion cesse de n'exister que dans le code.
                   LA DUREE D'UN BONUS EST UNE FONCTION DE CE QUE LE CLIENT A
                   DEJA : `CFG.BUFF_TIME` et le front montant du bit. Zero octet
                   de reseau, et le serveur reste la verite — bit encore pose
                   apres l'echeance = ramassage qui a rafraichi, on repart d'un
                   cycle plein. Un bonus PARTAGE (`powerupShare`) dure moins
                   longtemps que la jauge ne le dit ; l'ecart se resorbe au cycle
                   suivant et ne valait pas une cle d'instantane. Les pastilles
                   se reconcilient par CLE au lieu de se reconstruire, sinon
                   toute la rangee rejouerait son apparition a chaque changement.
                   LE PANNEAU DONNE DES VALEURS EFFECTIVES, JAMAIS DES
                   POURCENTAGES — « 18,4 degats », pas « +52 % ». Tout se deduit
                   de l'instantane, des cartes et des reliques ; le nombre de
                   canons reprend EXACTEMENT la formule de `powerIndex` pour que
                   panneau et fenetre de build ne puissent pas se contredire.
                   Seul le terme `barDamage` manque — il demande `barsBroken`,
                   que le client n'a pas, et c'est une relique sur vingt-quatre.
                   LE DETAIL PAR JOUEUR N'EXISTE PAS, ET C'EST LA DECISION. Un
                   compteur de DPS par joueur dans un jeu cooperatif entre amis
                   cree du reproche, partout ou il existe ; le Rempart et le
                   Soigneur auront toujours un mauvais chiffre, c'est leur
                   travail. Ce qui est offert a la place est plus instructif :
                   les DEGATS SUBIS PAR SOURCE, accumules cote client a partir de
                   la chute de PV et de `lastSrc`. Panneau et compteur sont
                   masques par defaut et se reglent separement au menu pause.
                   Le panneau se rafraichit a 4 Hz, pas a l'image : `fullMods` ne
                   se recalcule que si la signature du chargement bouge, et la
                   ligne qui change s'illumine une seconde — ce qui relie un
                   choix a son effet sans hameçon sur la prise de carte

     0.12.3 lot 04 LES TROISIEMES COMPETENCES SE DECLENCHAIENT COMME N'IMPORTE
                   QUEL SORT. Quatre traitements communs, ecrits une fois pour
                   les trois, avec un point de passage unique (`_ultFire`) :
                   AMORCE de 0,35 s pendant laquelle le joueur est ENGAGE — pas
                   d'annulation, c'est ce qui distingue un ultime d'un sort ;
                   onde d'ecran tiree pour SON lanceur seulement (un voile plein
                   ecran a chaque ultime allie serait une gene, pas une
                   information) ; marqueur au-dessus du lanceur, parce qu'a
                   quatre, savoir qu'un coequipier vient de lacher son ultime
                   change tes propres decisions ; et un PALIER 3 qui se lit sans
                   chiffre — couronne doublee, teinte legendaire jusque sur son
                   icone de competence.
                   L'amorce coute UN BIT (`SKILL_ULT_WIND`), pas une cle.
                   LA SALVE N'EST PLUS DU HITSCAN. Huit missiles au plus, par
                   lancement et par joueur, sur le chemin des projectiles
                   existant : un 5e element du tuple `b`, emis SEULEMENT pour un
                   missile, donc zero octet pour les centaines de balles
                   ordinaires. Acquisition a 360° — un tir a tete chercheuse qui
                   respecte un cone est incoherent — mais la visee DEPARTAGE
                   (`score = d² × 2,2` hors cone).
                   L'ATTRIBUTION EN TROIS PASSES EST LE LOT. La passe 3 reserve
                   les degats de chaque missile et n'en engage un de plus sur un
                   ennemi que si le deja-reserve ne suffit pas a le tuer ; le
                   surplus DOUBLE au lieu d'etre perdu, un ultime ne doit jamais
                   donner l'impression de gacher. Deux bugs trouves a la mesure,
                   pas a la lecture : sans la passe 2 (repartition par curseur
                   tournant) la garde ne mord pas avant longtemps et TOUTE la
                   salve retombe sur la cible la plus proche ; et la gerbe
                   detonait sur le premier corps croise — un missile ne s'arme
                   donc que sur SA cible.
                   LA GERBE S'ORDONNE PAR RELEVEMENT DE CIBLE. Distribuer les
                   ecarts dans l'ordre d'attribution lance des missiles a
                   l'oppose de leur cible, et une poursuite pure a taux de virage
                   borne ne rattrape pas : elle se met en ORBITE. Mesure : 4,4
                   cibles distinctes sur 6, et monter `SALVE_TURN_RATE` de 6 a 30
                   n'y changeait rien — le reglage ne pouvait pas sauver la
                   geometrie. Ordonnee, la salve touche 6 cibles sur 6, cent pour
                   cent, sur 200 tirages a cibles fixes comme mobiles. Une fusee
                   de proximite avait ete ecrite pour compenser : mesuree
                   inutile, elle a ete SUPPRIMEE plutot que gardee « au cas ou ».
                   `SALVE_TURN_RATE` reste donc a la valeur de la spec.
                   LECON DE BANC, elle resservira : le premier banc mesurait
                   surtout son propre desordre (cibles qui meurent, joueur pris a
                   partie, obstacles de biome). Il donnait une surface de reglage
                   avec une falaise entre 6 et 7 rad/s — une falaise pareille ne
                   ressemble pas a de la physique, et c'etait bien le banc.
                   `SALVE_BOSS_MUL: 0,25`, aligne sur `DPS_BOMB_BOSS_MUL` : sur
                   une cible UNIQUE toutes les cibles sont saturees, donc tout
                   double dessus — sans plafond la Salve serait la meilleure
                   source de degats du jeu contre un boss.
                   L'ANCRE MONTRE ENFIN CE QU'ELLE TIENT. Le role du tank est
                   entierement fait de choses qui n'arrivent pas ; c'est la seule
                   competence qui puisse montrer son travail a l'equipe. Les
                   retenus SE DEDUISENT de la geometrie cote client — l'entree
                   dans le rayon se rejoue comme `drawMedicLinks` rejoue le choix
                   du serveur — donc vingt chaines a l'ecran coutent zero octet.
                   LE SANCTUAIRE DEVIENT L'ULTIME DU LIEN. Dans le dome, les
                   liens s'accrochent a TOUS les allies, sans plafond et sans
                   rupture, et ils survivent a la sortie du mode soin : c'est un
                   ultime, pas une posture. Le Soigneur depasse enfin sa limite
                   de deux cibles (mesure : 3 liens hors posture pour un plafond
                   de 2). Les liens partent du DOME et non du soigneur, ce qui le
                   libere du centre — un 4e element sur `hl`, absent partout
                   ailleurs. `_healLinks` se scinde en `_postureLinks` et
                   `_sanctLinks` sans cesser d'etre le point de passage unique

     0.12.4 lot 05 LE BOUCLIER ETAIT UN CERCLE BLEU DE TROIS PIXELS, et il
                   n'avait NI APPARITION NI RUPTURE — la seule ressource du jeu
                   qui disparaissait en silence. Il devient une COQUE : neuf
                   plaques discretes au lieu d'un arc continu, donc une charge
                   qui se COMPTE au lieu de s'estimer (meme raison que les
                   graduations en PV du lot 03) ; rotation lente et respiration,
                   parce qu'une coque inerte se lit comme de l'interface ; et la
                   lumiere en arc haut-gauche, comme toute creature de la charte.
                   TROIS FRONTS, TROIS BUDGETS, ZERO OCTET DE RESEAU. Pose,
                   touche et rupture sont trois fronts sur `p.shield`, une valeur
                   deja transportee : `events.js` les emet comme il emet deja une
                   mort ou un relevement. La touche est l'eclair d'une image
                   (liseré qui s'allume), la pose un fait notable, la rupture le
                   moment ou le joueur perd son tampon.
                   LA RUPTURE EST DU VERRE, et le verre existait deja :
                   `fx_shard` est la case « eclat anguleux » de l'atlas, donc les
                   eclats passent par le lot WebGL comme le reste — pas de
                   quatrieme case, pas de chemin special, 22 eclats en GL et 10
                   en 2D. Ils naissent sur le BORD de la coque et non au centre :
                   c'est la coque qui cede, pas le personnage qui explose. AUCUN
                   TRESSAILLEMENT — ce n'est pas une detonation, et le
                   tressaillement reste reserve aux gros evenements.
                   Deux sons opposes (`bouclier` monte, `bouclierBrise` casse) :
                   une bascule ne rend jamais le meme son dans ses deux sens.
                   LA TABLE DES BANDES DE RAYON DESCEND DANS `fx.js`, la couche
                   la plus basse qui en a besoin. Les eclats doivent naitre
                   exactement sur le rayon que `boss.js` dessine, et deux
                   definitions du meme rayon finissent toujours par diverger.
                   LES LIENS N'ETAIENT PAS DES TRAITS DROITS, MAIS ILS EN AVAIENT
                   L'AIR : le lien de soin est a `amp: 0,035`, donc un deplacement
                   de point milieu invisible a l'oeil. Le reflexe aurait ete de
                   monter l'amplitude — c'etait casser l'invariant « soin chaud et
                   CALME, siphon froid et AGITE », qui est ce qui les distingue.
                   `drawArc` gagne donc un FLUX au lieu d'agitation : des perles
                   qui courent le long du trace, sans une seule allocation
                   (position = fonction de l'indice, du temps et de la longueur
                   cumulee, comme les croix du sanctuaire), et qui s'estompent aux
                   deux bouts pour naitre du porteur au lieu d'apparaitre en
                   l'air.
                   LE SENS DU FLUX EST UNE INFORMATION DE JEU qu'un trait ne
                   portait pas : le soin coule vers l'allie, le siphon vers le
                   soigneur, la chaine vers l'ancre, le soin ennemi vers sa cible.
                   Le lien des Jumeaux ALTERNE — c'est un echange, pas un don.
                   Les six appelants de `drawArc` y passent, et le point de
                   passage unique reste unique

     0.12.5 lot 06 MA PROPRE COQUE DU LOT 05 ETAIT UNE JAUGE, et c'est la regle
                   du depot que j'avais enfreinte : la ligne de partage est « ou
                   VIT l'element ». La charge chiffree vit deja au HUD ; la
                   repeter autour du personnage en arc qui se vide, c'est mettre
                   de l'ECRAN dans le MONDE. Elle redevient une BULLE — la charge
                   ne s'y lit pas, elle s'y SENT : densite du degrade, epaisseur
                   de membrane et amplitude d'ondulation, jamais un remplissage.
                   Trois choses la font passer pour un volume : un degrade radial
                   creux au centre et dense au bord (seul moyen qu'un disque vu
                   de dessus se lise comme une sphere), un rayon qui ondule par
                   somme de deux sinus INCOMMENSURABLES — un cercle parfait se
                   lit comme de l'interface — et DEUX reflets, l'arc haut-gauche
                   de la charte plus un court en bas a droite. Un seul point de
                   lumiere ne fabrique pas de relief. Zero allocation : le rayon
                   est une fonction de l'angle, du temps et de l'identifiant.
                   UNE LETTRE DANS UNE CASE EST UN RACCOURCI CLAVIER, PAS UNE
                   ICONE. Les pips affichaient « ESP / A / E / 3 » : ca ne se
                   reconnait pas du coin de l'oeil, et c'est pourtant la seule
                   facon dont on regarde ses recharges. Dix glyphes entrent dans
                   `icons.js`, dessines au canvas comme les bonus au sol — le
                   verbe de la competence, pas son initiale. La touche reste
                   ecrite, en petit, dans un coin. Une competence indisponible se
                   DESATURE au lieu de disparaitre : on la reconnait encore, on
                   sait juste qu'elle ne part pas.
                   Les glyphes sont passes au test de la SILHOUETTE avant d'etre
                   gardes, comme les sprites : rendus hors navigateur en noir sur
                   blanc. Deux ont ete refaits — la Salve etait asymetrique (une
                   rotation fausse), la Vague de soin etait un pate.
                   LA LISTE D'EQUIPE SE LIT PENDANT QU'ON ESQUIVE. Elle n'avait
                   ni role ni chiffre : le glyphe de classe passe en tete, parce
                   que c'est le ROLE qui decide si on va aider, et les PV
                   s'ecrivent en CHIFFRES — « il lui reste 40 PV » se decide, « il
                   est a un quart » se devine. Le score reste mais descend au
                   dernier rang de lecture. Un fond decolle enfin les lignes du
                   monde : des noms clairs sur un sol clair ne se lisaient pas.
                   LE CHIFFRE DE PV PASSE SUR LA BARRE au lieu d'a cote : l'oeil
                   faisait deux sauts pour une seule information. Le bloc de soi
                   devient un OBJET pose sur le monde — fond, lisere, liseré cyan
                   qui dit « c'est toi » comme au bilan et dans la build. Angles
                   DURS partout : la derogation de rayon appartient aux menus, le
                   HUD garde ses 2 px.
                   AU PASSAGE, SIX SELECTEURS MORTS : `iconImg` rend une `<img>`,
                   et le CSS visait `canvas` depuis le debut. Aucune des icones
                   posees dans le HUD n'avait donc son `display: block`

     0.12.6 lot 07 LE PANNEAU DE STATISTIQUES MENTAIT. `fullMods` rend
                   `{ mods, maxHp }`, pas les mods : le lire a plat donnait des
                   `NaN` en cascade, puis le premier `.toFixed` sur un champ
                   absent LEVAIT — et une exception dans la boucle de rendu
                   vidait toutes les lignes suivantes. Trois lignes fausses, huit
                   lignes vides, et le defaut se lisait comme « le panneau est a
                   moitie fini » au lieu de « le panneau est casse ».
                   « CRITIQUE » NE DISAIT PAS SI C'ETAIT LE TAUX OU LES DEGATS.
                   Deux lignes valent mieux qu'un libelle a deviner : « taux de
                   critique » et « degats critiques ».
                   UN PANNEAU OU UNE CARTE PRISE NE BOUGE RIEN NE SERT A RIEN, et
                   c'etait le cas d'une famille entiere : « Poudre dense » et
                   « Canon long » ne touchent ni les degats ni la cadence, donc
                   les prendre n'affichait strictement aucun changement. Portee,
                   perforation et ricochets entrent, plus projectiles par tir et
                   bouclier max. Verifie carte par carte : chaque axe du
                   catalogue deplace au moins une ligne

     0.13.0 lot 01 LE JEU NE PARLAIT QUE FRANCAIS. Moteur de traduction
                   (`shared/i18n.js`), dictionnaire anglais (`shared/lang/en.js`)
                   et selecteur a DEUX entrees : bascule FR/EN en haut a droite
                   de la barre, choix explicite dans les parametres.
                   LE FRANCAIS RESTE ECRIT A COTE DE SA DONNEE et sert de repli :
                   une langue etrangere est une SURCHARGE par cle, jamais une
                   seconde source de verite. Une cle absente rend le texte
                   francais, donc une traduction partielle degrade au lieu de
                   trouer l'ecran — et le dictionnaire ne recopie pas le FR.
                   LE MARKUP SE TRADUIT PAR ATTRIBUT (`data-i18n`, `-title`,
                   `-ph`), releve une fois au premier passage dans une `WeakMap`.
                   Point de passage unique : `traduireStatique()` dans `ui/dom.js`
                   — la seule reference DOM du moteur, pour que `shared/i18n.js`
                   reste importable par le serveur.
                   Ce lot couvre le HTML statique. Les textes construits en JS
                   (ecrans, HUD) et les tables de donnees (cartes, reliques, boss,
                   classes, progression) suivent aux lots 02 a 04

     0.13.1 lot 02 LES TEXTES CONSTRUITS EN JS. `screens.js`, `hud.js`,
                   `ui/build.js`, `ui/pause.js`, `ui/boot.js`, `net/router.js` et
                   les libelles d'attaque de `core/state.js` passent par `t()`.
                   TROIS FORMES, PARCE QU'UNE PHRASE N'EST PAS UNE ETIQUETTE :
                   `t(cle, repli)` pour un libelle, `tf` pour `{marqueur}` — ce
                   qui permet a une traduction de changer l'ORDRE des mots la ou
                   une concatenation le figeait —, `tn` pour le pluriel, dont la
                   regle differe (le francais bascule a 2, l'anglais a tout ce
                   qui n'est pas 1) et se choisit donc dans la langue AFFICHEE.
                   `dec()` : le separateur decimal appartient a la langue, pas au
                   nombre. « ×1,84 » et « ×1.84 ».
                   LE SERVEUR N'ENVOIE PLUS DE PHRASE FRANCAISE AU CLIENT, il
                   envoie un CODE : `cancelLaunch(why, qui)` rend `etat`,
                   `arrivee`, `pasPret`, `clic` au lieu du texte, `closeRoom` rend
                   `erreur`, et `authError` etait deja porteur d'un motif. Sa
                   phrase ne sert plus que de repli pour un motif inconnu du
                   client. Le journal, lui, reste francais : il est cote
                   operateur.
                   CHAQUE MODULE SE RAFRAICHIT LUI-MEME (`onLangChange` dans
                   `screens.js`, `hud.js`, `ui/pause.js`, `ui/build.js`) au lieu
                   d'une fonction centrale : la couche qui possede un ecran est la
                   seule a savoir le reconstruire. Le HUD, lui, OUBLIE sa table
                   `memo` — il n'ecrit que si la valeur a change, or un changement
                   de langue change toutes les valeurs sans changer une seule des
                   signatures qui les gardent.
                   AU PASSAGE, `VOTE_STATS` ETAIT MORT : declare, jamais lu.
                   Supprime au lieu d'etre traduit

     0.13.2 lot 03 LE CATALOGUE. 138 cartes et 30 reliques : nom, description,
                   cumul, effet courant, rarete, categorie, famille.
                   UNE DESCRIPTION NE RECOPIE TOUJOURS PAS UN NOMBRE, dans
                   AUCUNE des deux langues. Les 44 descriptions qui composaient
                   `fmtM(LA_CONSTANTE)` deviennent une chaine a MARQUEURS
                   POSITIONNELS plus un thunk `vals` : le francais reste lisible
                   a cote de sa donnee, l'anglais reordonne ses mots, et les deux
                   lisent la meme constante. Conversion faite par transformation
                   de source, pas a la main — 316 comparaisons prouvent que le
                   francais rendu est inchange, au caractere pres.
                   LE TEXTE D'UNE CARTE NE TRAVERSE PLUS LE RESEAU : `cardBrief`
                   n'envoie que l'identifiant et la rarete. Le client a la table,
                   il la lit. C'est la regle « chercher si la valeur est une
                   fonction de ce que le client a deja », appliquee a l'envers.
                   `fmtM` ET `num` SUIVENT LA LANGUE : le separateur decimal
                   appartient a la langue, pas au nombre. « 4,3 m » et « 4.3 m ».
                   `ordinal(n)` de meme — le francais distingue le premier du
                   reste, l'anglais distingue 1/2/3 puis les adolescents.
                   `plur(n, mot)` prend le MOT FRANCAIS POUR CLE, ce qui evite
                   une table de correspondance : `u.ennemi`, `u.balle`, `u.lame`

     0.13.3 lot 04 LES TABLES DE DONNEES, ce qui clot la traduction : classes et
                   competences, etats, boss, mecaniques, evenements, biomes,
                   dangers, meteos, etapes de manche, difficultes, provenances de
                   degat, arbres de progression, confort, jalons, et les quatre
                   etiquettes posees DANS le monde par `render/boss.js`.
                   1115 entrees anglaises. Le francais reste ecrit a cote de sa
                   donnee et sert de repli, sans exception.
                   « VAINCRE RAVAGEUR » COMPOSE LE NOM DU BOSS AU LIEU DE LE
                   RECOPIER : `MILESTONES[].label` devient une FONCTION, sans
                   quoi le jalon serait reste francais dans un ecran anglais —
                   il etait fige au chargement du module.
                   `segmentName()` traduit A L'INTERIEUR : c'etait deja le point
                   de passage unique, et son seul appelant serveur est un
                   journal, ou le francais est le bon texte.
                   L'ALERTE LIT LA TABLE AU MOMENT DE L'EMPILER, pas a la
                   construction : `applyAlert` passait `def.nom` / `def.texte`
                   tels quels dans une entree gardee 1,5 s. La langue peut
                   changer entre-temps.
                   AU PASSAGE, DEUX NOMBRES FAUX A L'ECRAN : l'arbre du Tireur
                   affichait « −1,7999999999999998 s de recharge de bombe » et le
                   tronc « +3,5999999999999996 PV/s ». Un flottant concatene sans
                   arrondi. `nombre()` (i18n) est desormais le seul chemin — il
                   arrondit AVANT de formater, et rend l'entier sans decimale

     0.13.4 lot 05 QUATRE TEXTES RESTAIENT EN FRANCAIS A L'ECRAN, tous rates par
                   la meme cause : je cherchais le francais PAR SES ACCENTS.
                   « esquive », « temps ralenti », « la horde reprend » n'en ont
                   aucun. Le nouveau balayage cherche une chaine de PLUSIEURS
                   MOTS qui n'est pas un repli de `t/tf/tn` — il trouve aussi la
                   deuxieme forme de `tn`, que la premiere version prenait pour
                   du texte en dur.
                   Les deux libelles de competence des pastilles lisaient
                   `cdef.skills[i].nom` au lieu de `skillNom()` : la table, pas
                   le point de passage. C'est exactement ce que la regle interdit,
                   et rien ne le signalait — un acces direct a un champ traduit
                   rend le francais sans erreur.
                   `metaSlow` est pose UNE FOIS au chargement, hors de la table
                   `memo` : l'oubli de `memo` ne le reecrivait pas. Il est reposé
                   dans `onLangChange`.
                   Les noms de competence du Soigneur raccourcis en anglais
                   (« Heal stance ») : la pastille coupe a 11 caracteres

     0.13.5 lot 06 TROIS EFFETS EN RETARD SUR LE RESTE. La coque de bouclier
                   passait DANS le joueur : `RING_SHIELD` partait de
                   `PLAYER_RADIUS` (14) alors que les silhouettes de classe vont
                   jusqu'a 24 px dans l'atlas. Les quatre bandes remontent
                   (+12/17/22/27) — la premiere se derive de la SILHOUETTE, pas
                   du rayon de collision.
                   La vague de soin etait un disque plat et un anneau. Elle
                   prend le vocabulaire des souffles — couches a constantes de
                   temps distinctes, front qui devance sa trainee — avec le
                   gradient INVERSE (creux au centre, dense au bord) : le soin
                   part vers l'exterieur, il ne remplit pas. Et elle se
                   reconnait a ses croix, comme le sanctuaire, sauf qu'elles
                   sont PORTEES par le front.
                   Le rempart se dessine enfin comme ce qu'il est : un mur.
                   Couronne de 14 plaques a joints ouverts, epaisseur visible,
                   phase tiree de l'identifiant — un mur qui tourne n'est plus
                   un mur. Les deux poses ont leur front de particules
                   (`spawnHealWave`, `spawnBulwark`)

     0.13.6 lot 07 LE VEILLEUR NE LAISSAIT PLUS TIRER. A la derniere phase son
                   repertoire comptait cinq regards sur huit entrees, pour un
                   cycle d'attaque (2,05 s) plus court que le regard lui-meme
                   (1,6 de preavis + 2,0 d'oeil ouvert) : le bandeau « NE VISEZ
                   PLUS » couvrait 91 % du combat. Trois causes, trois
                   corrections : `_gazeOuvre` devient le point de passage unique
                   et REFUSE tant que l'oeil se repose (`GAZE_REST`, 2,6 s — la
                   fenetre de tir cesse d'etre un tirage), le doublon « regard »
                   de `unlock[1]` disparait, et la rupture de barre cesse d'en
                   poser un de plus. Le regard permanent CLIGNOTE (4 x 1,4 s
                   ouvert / 1,2 s ferme) au lieu de tenir huit secondes : son
                   propre commentaire promettait deja l'intermittence.
                   Mesure, trois graines par phase, phases 0/2/4 : bandeau
                   66/88/91 % -> 41/44/46 %, oeil ouvert d'affilee 3,3 s ->
                   2,0 s, plus longue fenetre de tir 7,4 s -> 9,0 s.
                   ANCRE ET GUETTEUR NE BOUGEAIENT JAMAIS, donc le combat
                   entier se jouait dans le meme coin — et le guetteur naissait
                   sur le bord de la vue, la moitie de l'ecran perdue. Ils se
                   REINSTALLENT a chaque rupture de barre (`_bossReplace`,
                   annonce `MECH_RELOC`) : l'ancre change de bord, le guetteur
                   se poste a 520 px de l'equipe, jamais au bord. `b.bord`
                   etait ecrit et jamais relu, il sert enfin

     0.13.7 lot 08 LA LIGNE DE VIE DEBORDAIT SOUS LES PASTILLES. `#selfText`
                   etait un flex `space-between` de deux enfants `nowrap` : rien
                   ne borne ca. Grille `minmax(0,1fr) auto`, ellipse sur la ligne
                   de vie, jauge a 320 px.
                   LE BOUCLIER PASSAIT SOUS LES GRADUATIONS — le quadrillage
                   mangeait sa trame. `z-index: 1` sur la surcouche, trame plus
                   franche (92/30 %), et le BORD porte la valeur : 2 px et une
                   lueur qui deborde.
                   L'ARC NE S'ENTENDAIT PAS, et pour une raison qui n'etait pas
                   le gain : partageant la cle du limiteur avec la touche, il se
                   faisait REFUSER par celle qui venait de passer. `claim`
                   inverse la priorite — il marque la cle sans demander
                   l'admission, donc il fait taire la PROCHAINE touche au lieu
                   d'etre tu par la precedente, et le nombre de voix ne bouge
                   pas. Cadence propre, `CLAIM_GAP` 90 ms. La recette y gagne
                   une bande mediane : un highpass a 3 kHz ne laisse passer que
                   de l'air

     0.13.8 fix : « CLIENT.JS NON CHARGE » S'AFFICHAIT SUR UN CLIENT SAIN. Le
                   garde-fou d'amorce d'`index.html` etait un `setTimeout` UNIQUE
                   a 1500 ms : passe ce delai il ecrivait son message d'erreur et
                   plus rien ne le retirait, alors que `__clientReady` arrivait
                   une seconde plus tard sur une premiere ouverture froide. Rien
                   d'autre n'ecrit dans `#status` avant le clic de connexion,
                   donc la fausse alerte restait a l'ecran toute la porte
                   d'entree. Le garde-fou devient une VEILLE : meme delai, mais
                   elle retire son propre message des que le client est pret, et
                   seulement le sien (comparaison a la chaine posee, pour ne pas
                   effacer un vrai statut). Une panne reelle laisse le message,
                   `__clientReady` ne venant jamais

     0.13.9 fix : DEUX OUBLIS DE BRANCHEMENT SUR LE TIREUR. « Terrain conquis »
                   et « Etau » se disaient branches sur les DEUX souffles du
                   joueur, l'explosion (`_explode`) et l'onde (`_wave`) — il y en
                   a TROIS, la bombe (`_bombBlast`) est un chemin a part et ne
                   passait ni par `_blastGround` ni par `_blastAfter`. La flaque
                   sortait donc du lance-grenades mais jamais de la competence,
                   alors que c'est elle qu'on appelle une explosion en jouant.
                   L'ACQUISITION DE LA SALVE NE VOYAIT QUE LA HORDE. `_salveCible`
                   (garde de l'appui), `_salveTries`, `_salveReseek` et le
                   rattrapage d'identifiant de `_guide` parcouraient
                   `this.enemies` seul ; or `_sweepEnemies` vide l'arene a
                   l'arrivee du boss, donc l'ultime du tireur refusait de partir
                   pendant tout le combat — la ou le reste de sa panoplie tape
                   deja le boss. Les quatre passent par `_bossTargets()`. La
                   collision balle/boss traitait deja les missiles, rien a y
                   changer. La garde anti-surtuage lit `this.boss.hp` pour les
                   DEUX Jumeaux : deux points d'application, une reserve

     0.13.10 fix : L'ECRAN SE VIDAIT PENDANT UNE CAGE. `drawMarks` declarait
                   `const t = performance.now() / 1000` — le nom du point de
                   passage de la traduction, importe en tete de module. Les
                   quatre marqueurs qui portent une etiquette (`stack`, `seal`,
                   `link`, `jail`) appelaient donc un NOMBRE : TypeError, image
                   avortee. Or la boucle de rendu attrape et poursuit, et
                   `gl.end()` vit APRES `drawWorld` — un lot GL ouvert et jamais
                   vide, un `#cv` deja efface : plus de joueurs, plus de boss,
                   plus de projectiles, plus de monstres, tant que le marqueur
                   existait. Le sol restait, ce qui faisait lire un probleme de
                   couches WebGL. L'horloge locale s'appelle `sec` ; le meme
                   masquage dans `drawMarkColumns` tombe avec

     0.13.11 lot 09 LE REGARD DEVIENT UN INSTANT DE RESOLUTION. Il etait un ETAT
                   soutenu : 2 s d'oeil ouvert, un test toutes les 0,5 s a 22 %
                   des PV max, donc jusqu'a 88 % sur une occurrence — et surtout
                   une forme sans fin lisible, ou le joueur attend trop puis
                   reprend au hasard. Un decompte (`WARN_PREPARATION`, 4 s), une
                   resolution, termine : UN coup a 30 %, avec 0,2 s de tolerance
                   relevee en continu (`GAZE_GRACE`, `p.gazeSafe`) pour qu'un
                   joueur qui detourne au dernier moment ne soit pas juge a
                   l'image pres. `GAZE_PERMANENT` reste la SEULE occurrence
                   d'etat soutenu du jeu, avec son propre ratio de tic.
                   Le canal visuel est la moitie du lot : quatre couches, un
                   seul signe, l'oeil barre. Pulsation d'arene dessinee AVANT
                   tout telegraphe au sol — c'est la construction, pas un
                   reglage d'opacite, qui garantit qu'elle n'en masque aucun ;
                   vignette d'ecran au meme tempo ; oeil qui se REMPLIT au
                   centre haut de la vue ; et le secteur interdit ancre sur le
                   personnage, de demi-angle `acos(GAZE_COS)`, exactement le
                   seuil que le serveur mesure — le reticule y porte le meme
                   verdict en continu. Les quatre s'effondrent ensemble a la
                   resolution, meme pour qui a reussi.
                   LES COMBATS MONTENT AU LIEU DE COMMENCER PLEIN REGIME.
                   `BOSS_ATTACK_CD` 3,2 -> 4,6 et `BOSS_PHASE_CD_STEP` 0,09 ->
                   0,11 (4,60 / 4,09 / 3,59 / 3,08 / 2,58 s, rapport 1,79) ;
                   `parPhase` suit la PHASE et plus seulement la difficulte
                   (`min(parPhase, 1 + floor(phase / 2))`) : une mecanique aux
                   barres 1 et 2, deux a partir de la 3 ; et l'anti-repetition
                   garde les TROIS dernieres (`ATK_MEMO`, `_pickAtk`) au lieu de
                   la seule precedente, qui produisait A B A B A B.
                   Mesure, Veilleur, trois graines : un joueur qui lit les
                   annonces encaisse 0 touche de regard, un qui les ignore en
                   encaisse une par occurrence — l'ecart qui manquait

     0.13.12 fix : LA LANGUE NE SE CHOISISSAIT QU'UNE FOIS CONNECTE. Les deux
                   entrees (bascule de la barre superieure, ligne des
                   parametres) vivent derriere `#gate`, or la barre y est
                   masquee : un joueur anglophone devait traverser l'ecran de
                   connexion en francais. TROISIEME entree sur `#gate`,
                   `#gateLangRow`, remplie par le meme chemin que la ligne des
                   parametres (`remplirLangRow`) — un seul etat, `survivor.lang`.
                   `boot.js` se rafraichit lui-meme comme les autres modules : le
                   placeholder du mot de passe, la ligne de bascule
                   connexion/creation et les puces de serveur sont ECRITS en JS,
                   donc hors de portee de `traduireStatique()`. Deux gardes —
                   rien si `#gate` est cache (`renderGateMode()` rouvre les
                   formulaires), rien sur le mode que si l'ecran de session
                   dupliquee est ouvert ; derniere reponse de `/etat` memorisee
                   pour rejouer les puces

     0.13.13 fix : DEUX MECANIQUES POUVAIENT DEMANDER L'IMPOSSIBLE. Rien ne
                   connaissait la relation entre deux mecaniques vivantes : `tours`
                   et `denombrement` sont deux CLES du meme repertoire pour une
                   seule mecanique d'occupation, donc `_pickAtk` les tirait
                   ensemble — 4 tours pour 2 joueurs (le repli de `denombrement`
                   sous `minPlayers: 3` est `MECH_TOWER`), jusqu'a 8 places pour 4,
                   dont une « a 2 » a cote d'une « a 1 ». Meme trou pour
                   « REGROUPEZ-VOUS » + « ECARTEZ-VOUS » (5,5/min de combat en
                   normal) et « NE VISEZ PLUS » + « DETRUIS LA GRAPPE ». Et
                   `_zone()` ne consultait jamais `state.marks` : une zone letale
                   tombait sur un foyer a tenir 9,7/min de combat.
                   `parPhase` n'etait pas le seul chemin — la cadence suffit
                   (3,08 s en phase 3 contre 4 s d'annonce de tours), donc le
                   calme, a `parPhase: 1`, n'etait pas protege non plus.
                   TROIS REGLES, ET LA GRAMMAIRE LES PORTAIT DEJA. `AXES`
                   (`bosses.js`) dit ce qu'un ordre prend au joueur — une `place`
                   ou une `visee` — et dans quel sens : deux ordres du meme axe et
                   de sens contraire ne sont pas deux choses a lire, c'est une
                   consigne impossible. `_mechLibre` en est le point de passage,
                   lu par `_pickAtk` AVANT le tirage : un refus est un retirage,
                   pas un repli sur `_atkMarques` — la premiere version repliait et
                   les combats s'allongeaient de moitie.
                   IL Y A TOUJOURS UN ABRI, et il peut y avoir du TIMING. Une zone
                   qui recouvrirait un foyer ou un refuge s'ecarte (`_zoneEcarteAbris`,
                   rejoue a chaque image pour les zones qui bougent), SAUF si elle
                   se resout `ABRI_RETOUR` avant l'echeance : l'explosion dans la
                   zone sure devient alors un probleme de reflexe, ce qui est le
                   but. Symetrique a la pose (`_foyerPoint`, `_foyerLibre`), qui
                   ecarte aussi les obstacles de biome (7-8 % des foyers naissaient
                   dedans, inatteignables) et les dangers qui blessent (14,5 % en
                   cauchemar). Un refuge FUIT le feu (`_zoneFeu`).
                   TOUJOURS UN SAFE SPOT AU SOL : un seul motif de saturation a la
                   fois (`b.solT`, duree MESUREE sur les zones posees), parce que
                   le creux de l'un tombe sous le plein de l'autre.
                   Trois corollaires : `_resolveTowers` clampe le nombre de foyers
                   sur l'effectif VIVANT comme `_resolveSceau` le faisait deja ; la
                   jauge de l'Oracle se lit sur UN groupe de tours ; un joueur
                   emprisonne ne prend plus le sol — la parade d'une prison est la
                   cage, pas l'esquive.
                   `verifierMecaniques()` est le critere rejouable : ordres
                   incompatibles, places > joueurs, abri sous le feu a l'echeance,
                   aucun safe spot. Les trois premiers a zero, le quatrieme a zero,
                   sur 24 manches de 42 min en 1/2/3/4 joueurs et trois modes

     0.13.14 feat : LA BANDE SON SE TIRE AU SORT. Sept pistes de horde (la
                   premiere d'une manche reste « Chrome Grid », le reste au
                   hasard sans rejouer la precedente), cinq pistes de boss, et
                   une scene « final » de deux pistes, choisie par `estFinal`
                   dans la boucle de rendu

     0.13.15 correctif LES JUMEAUX SE SEPARENT PAR LE FOCUS, ce qui leve la
                   restriction posee en 0.11.0. Deux causes, pas une : les deux
                   corps naissaient a 140 px l'un de l'autre au lieu de 520
                   (chaque jumeau etait ECRETE separement contre les bords de la
                   vue, or `_spawnPoint()` tombe hors vue — les deux revenaient
                   sur le meme bord), et `_bossMove` demandait a CHACUN le meme
                   `_nearestPlayer`, donc meme cible, meme vitesse, convergence a
                   ~100 px et soin mutuel en continu. 0.11.0 avait vu la seconde
                   et l'avait contournee en sortant le boss du solo ; a deux
                   joueurs groupes le probleme restait entier.
                   LE VERBE DU ROSTER EST « separation » : il lui manquait le
                   geste. Frapper un jumeau lui pose un FOCUS (`_damage`, sur
                   l'entite REELLEMENT touchee, avant la redirection vers
                   `boss`), il poursuit son agresseur, et son frere non focalise
                   s'ECARTE jusqu'a `TWIN_STANDOFF`. Le focus expire apres
                   `TWIN_FOCUS_TIME` : cesser de frapper, c'est les laisser se
                   rejoindre. L'ecretage porte desormais sur le CENTRE, plus sur
                   les corps, donc l'ecart de naissance est garanti.
                   `minPlayers` retombe a 1 : la cause ecrite dans le commentaire
                   de 0.11.0 n'existe plus, et le deck redistribue cinq boss pour
                   cinq places a tout effectif.
                   Mesure (bot qui tire et recule) : ecart 506-561 px contre 400
                   de portee de soin, soin actif 0 % du temps a un, deux et
                   quatre joueurs, contre 100 % avant.
                   UN SEUL CUE NOUVEAU : `drawTwinLink` disait deja POURQUOI il
                   faut les separer, il ne disait pas QUI tient lequel. Le
                   porteur du focus ne se deduit pas d'un instantane — `bo2`
                   gagne donc deux places en QUEUE, coupees par `trimTail` tant
                   que personne ne le tient, et chaque jumeau porte un anneau a
                   la couleur de celui qui le tire

     0.13.16 feat : LA PAUSE APPARTIENT A L'HOTE. Elle etait refusee des qu'un
                   SECOND CLIENT etait connecte — un spectateur suffisait a la
                   retirer au joueur seul, et a plusieurs personne ne pouvait
                   arreter la partie. Deux portes desormais : l'hote (a tout
                   effectif, meme en spectateur) et le joueur seul dans sa
                   salle. Reprendre appartient a celui qui a fige (`pausedBy`)
                   et a l'hote ; le depart du pauseur leve la pause, l'arrivee
                   d'un joueur ne la leve plus. Bandeau `#hudPause` pour ceux
                   qui n'ont pas ouvert le menu, et `readMove()` cesse de
                   predire tant que la simulation est figee.
                   correctif LE COMPTE A REBOURS DES CARTES ETAIT UNE ECHEANCE
                   ABSOLUE. `cards` et `merchant` portaient un horodatage du
                   SERVEUR ; le client le comparait a son horloge a lui. Sur une
                   machine en retard, la jauge restait pleine alors que la manche
                   avait DEJA repris (`forceRemainingPicks` puis `resumeRound`) :
                   le joueur mourait devant son ecran de cartes. Le message porte
                   une DUREE (`duree`, `cardLeft()`), comme `launch` le faisait
                   deja.
                   UN COMPTEUR DE DEGATS JUGE LA PARTIE, PAS UNE FENETRE : le
                   total divise par `tm` (qui ne court ni pendant le briefing ni
                   pendant un ecran, donc c'est du temps de COMBAT). La fenetre
                   glissante de 5 s est SUPPRIMEE, pas rangee ailleurs : elle
                   sautait d'un facteur trois entre deux paquets d'ennemis, ce
                   qui ne se compare a rien.
                   LE CRITIQUE SE VOIT ET S'ENTEND. Il ne teintait que la cible :
                   son CHIFFRE reste ambre jusqu'au bout (`a.crit` traverse
                   l'agregation de 200 ms, un seul critique dans le lot suffit),
                   les eclats montent a cinq avec un noyau chaud, et le son cesse
                   d'etre un transitoire SEUL — la touche reste dessous, la
                   difference se fait au timbre : deux partiels qui descendent
                   correctif LE PANNEAU DE STATS IGNORAIT LA META. Il annonce
                   des valeurs EFFECTIVES mais ne lisait que `fullMods` (cartes
                   + classe) : « Precision » au maximum affichait encore 5 % de
                   taux de critique la ou le serveur en roulait 15. Le panneau et
                   la fenetre de build rejouent maintenant `applyMeta` sur son
                   PROPRE profil (celui d'un allie ne voyage pas), via
                   `metaLinesFor()`, extrait de `room.js` pour que les deux cotes
                   lisent la meme regle — lignes EQUIPEES seulement. Le calcul,
                   lui, etait juste : la meta est ADDITIVE sur le taux de base
                   (0,05 + 5 x 0,02 = 0,15).

     0.13.17 fix : UN ECRAN NE TUE PAS. La simulation est figee pendant les
                   cartes et le marchand, mais l'ennemi au contact garde sa
                   position ET sa recharge : a la reprise il frappait avant meme
                   que le client n'ait redessine l'arene (un instantane, plus
                   110 ms d'interpolation). `CFG.RESUME_GRACE` (0,6 s) rend
                   `_hurt()` inerte a toute reprise de simulation figee — ecran
                   de cartes, marchand, et pause, qui a la meme dette.
                   fix : le plancher manquait a `_warn` — un `warn` negatif
                   sortait de `WARN_CLASSES` et rendait `undefined`.
                   CAUCHEMAR : `mechRatio` 1,15 -> 1,40. Le verrou de saturation
                   du lot 0.13.13 coute la MOITIE de la presence au sol en solo
                   (5,77 -> 2,85 zones hostiles en moyenne, 54 % des tirages de
                   sol refuses) : c'est le prix de la garantie du safe spot, et il
                   se paie sur `bossProfil`, jamais sur le verrou. Trois autres
                   leviers ont ete essayes et REFUSES par la mesure — `parPhase` 3
                   + `reflexe` 3 (31,7 -> 17,1 PV/min perdus par un bot qui ignore
                   tout : plus de mecaniques simultanees = plus de refus de
                   coexistence = moins de sol), une cadence a 0,80 (+13 % a deux,
                   -26 % en solo), et sortir la constriction du verrou
                   (`verifierMecaniques` : 0 -> 6 images d'abri sous le feu, elle
                   resserre les bounds sous un motif deja pose).
                   `warn: -1`, le vrai levier du mode, reste bloque : `ABRI_RETOUR`
                   vaut 1,2 s en dur quand le telegraphe tomberait a 0,8 s. Le
                   rendre proportionnel a la classe est un lot a part.
                   `verifierMecaniques` cauchemar 1/2/4 joueurs : RAS.
     ---------------------------------------------------------------------------
     plan11 — cartes, armes, hauts faits
     ---------------------------------------------------------------------------

     0.14.0 lot 01 LE CATALOGUE N'AVAIT JAMAIS ETE ETENDU AU-DELA DE CINQ AXES.
                   139 cartes, 21 dans une famille : tout axe qui avait une
                   famille etait propre, tout axe qui n'en avait pas etait en
                   doublon. La correction n'est pas de supprimer, c'est de creer
                   les familles — SEPT au lieu des six du plan, l'axe `areaMul`
                   (expansion / deflagration / singularite) etant un doublon que
                   la table du plan ne listait pas.
                   recharge, portee, bouclier, critique, brulure, execution,
                   souffle. Neuf cartes ecrites pour combler les paliers vides :
                   Coup de grace, Canon de siege, Coque, Brasier, Dynamo,
                   Horizon, Fournaise, Faucheuse, Cataclysme.
                   « Ressort de detente » et « Rodage » DISPARAISSENT : doublons
                   purs de « Culasse allegee » et de « Condensateur » a un point
                   pres, et les quatre paliers de leur famille etaient pris.
                   UN 4/4 QUI NE PORTE PAS LA STATISTIQUE DE SA FAMILLE SE
                   VERROUILLE HORS DE SA PROPRE ECHELLE : le palier superieur
                   retire les inferieurs du pool, donc « Pacte de fer » sans
                   bouclier, « Sentence capitale » sans chance critique et
                   « Vif-argent » sans vitesse devenaient des cartes mortes des
                   qu'on les prenait. Les trois portent maintenant leur axe.
                   LA FORME DU POOL ETAIT INVERSEE : 28 communes pour 44 epiques.
                   19 epiques qui n'ajustaient qu'un nombre passent rares, 19
                   rares passent communes — 44 / 49 / 28 / 23, soit 1,57 commune
                   par epique. `filins` et `etau` restent rares : `nasse` les
                   exige, et un prerequis commun n'est plus un filtre (c'est
                   `verifierCartes()` qui l'a dit).
                   LES INVOCATIONS DECROCHAIENT. Lame orbitale, essaim, drone,
                   tourelle, pulsar et onde de mort s'indexaient sur le seul
                   `damageMul`, alors que le tir gagne aussi la cadence, les
                   degats bruts et le critique. Point de passage unique
                   `_summonMul(p)` : l'indice de puissance ENTIER, a exposant
                   `SUMMON_SCALE` = 0,6. Mesure (10 graines, bot au contact,
                   « Orbiteurs » pris a la minute 5) : les lames font 40 % des
                   degats en moyenne apres la minute 25, 9 graines sur 10
                   au-dessus des 15 % du critere.
                   `verifierCatalogue()` (cards.js) est le critere rejouable ;
                   `verifierCartes()` (game_state.js) reste le point d'entree et
                   l'appelle.
                   REPERES DE PUISSANCE REMESURES (`POWER_MARKS`, ui/build.js) :
                   36 manches semees, solo, trois classes. Le pool reforme monte
                   le plancher et rabote la pointe — p10 1,09 -> 1,61, mediane
                   3,07 -> 3,54, p75 4,42 -> 6,58, max 12,37 -> 10,61. « forte »
                   passe de 4,10 a 6,50, « max » de 5,71 a 9,00, l'echelle de
                   6,5 a 10,5.
                   LES CINQ LEGENDAIRES NEUVES SONT EN QUEUE DE TABLE :
                   `legendairesDuBoss` partitionne par `k % 5` sur l'ORDRE de
                   `CARDS`, donc une insertion au milieu reverrouillerait des
                   cartes deja gagnees chez tous les comptes

     0.14.1 lot 03 LES JALONS DEVIENNENT DES HAUTS FAITS. 36 exigences en trois
                   niveaux (10 simples, 14 intermediaires, 12 defis), 13 cadres,
                   et surtout : TOUTE RECOMPENSE EST NOMMEE.
                   C'ETAIT LE FIL ROUGE DU PLAN. `armes.filter((_, k) => k % 2
                   === 0)` et `legendairesDuBoss(i)` dependaient d'une POSITION
                   dans `CARDS` : passer de trois a dix armes decalait la parite
                   et reverrouillait des cartes chez tous les comptes existants.
                   `reward: { type, ids }` supprime le defaut, et une recompense
                   qui nomme une arme que le depot ne connait pas encore
                   (`laser`, `tesla`, `lame`, `siege`, `precision`, `assaut`)
                   traverse sans rien verrouiller — c'est pour ca que ce lot
                   passe AVANT celui des armes.
                   UNE CARTE, UNE RELIQUE OU UNE LIGNE EST VERROUILLEE SI ET
                   SEULEMENT SI UN HAUT FAIT LA DONNE : la liste des verrous se
                   deduit de la table au lieu d'etre tenue a cote. 31 cartes,
                   15 reliques et les deux familles de lignes communes.
                   ON NE RETIRE JAMAIS UN DEBLOCAGE ACQUIS, et la garantie ne
                   passe PAS par une correspondance jalon -> haut fait : la
                   migration v6 -> v7 releve CARTE PAR CARTE ce qu'un compte
                   avait ouvert et le range dans `profile.debloquees`, qui le
                   suit pour toujours. Ses tables sont FIGEES — une migration
                   decrit le passe, elle ne suit pas `CARDS`. Mesure : 209
                   profils, 2 371 deblocages testes, zero perdu.
                   `profile.milestones` reste le journal des evenements de
                   progression (emplacements de cartes), `profile.hf` la liste
                   des hauts faits : deux listes, deux roles, rien a convertir.
                   TOUS LES COMPTEURS SONT PERSONNELS (`p.hf`), jamais l'etat de
                   manche — un compteur d'equipe serait atteint quatre fois plus
                   vite a quatre joueurs. Les deux fenetres glissantes sont des
                   anneaux d'une case par seconde, somme tenue a jour, et on ne
                   balaie que les secondes ECOULEES.
                   LES SEUILS DU PLAN ETAIENT DES PARIS ET LA PLUPART ETAIENT
                   FAUX. 40 joueurs-manches en normal, pilote, un et quatre
                   joueurs : trois seuils etaient deja atteints par la mediane,
                   donc ne testaient rien — « moins de 200 tirs pour 100 kills »
                   quand la mediane est a 118 recompensait le tir de base, alors
                   qu'il doit enseigner le fusil de siege. Tableau complet dans
                   LISEZMOI.md.
                   DEUX MESURES RENDAIENT ZERO PARTOUT, ET UNE SEULE ETAIT LA
                   FAUTE DU HARNAIS. « Sous 25 % de PV » ne pouvait pas monter
                   parce que le harnais remettait les PV au maximum a chaque
                   image. « Tues par explosion » ne montait pas non plus, et la
                   c'etait le jeu : `_bombBlast` resout son souffle LUI-MEME,
                   sans passer par `_explode`, donc le drapeau de cause ne voyait
                   pas la source la plus naturelle du jeu. Deux points de
                   passage, pas un.
                   LE BANDEAU ATTEND LA FIN DU COMBAT et ne recouvre jamais un
                   ecran de cartes : une salle emet `hautsFaits` a la mort d'un
                   boss, le hub — seul ecrivain du magasin — evalue et pousse.
                   `vueStats` FUSIONNE sans ecrire, `cumulerStats` REPLIE la
                   manche dans le profil apres l'evaluation ; les appeler dans
                   l'autre ordre compterait la manche deux fois.
                   En cooperatif, seuls TES hauts faits font un bandeau ; ceux
                   des allies passent en une ligne d'info, posee directement
                   parce qu'`applyAlert` reste reserve aux trois tables du
                   serveur.
                   Le cadre ne coute rien au reseau : il voyage avec le salon et
                   le bilan, comme la couleur. Autour d'un nom c'est un
                   SOULIGNEMENT, jamais une boite — rien de decoratif ne se
                   superpose au jeu.
                   `verifierHautsFaits()` est le critere rejouable : il refuse
                   une arme derriere un defi, un cadre ailleurs qu'en defi, un
                   palier sans jauge et un cadre que personne ne donne
                   FUSION AVEC L AMONT : la page dediee `#hautsFaits` (sortie
                   du Terminal le 2026-08-19, decision du porteur) est GARDEE
                   et remplie par ce systeme au lieu de `MILESTONES` — on ne
                   rouvre pas des onglets qui viennent d etre fermes. Le ban
                   par manche de l amont est garde aussi : le profil n apporte
                   plus que les VERROUS DE HAUT FAIT au filtre de tirage.

     0.14.2 lot 02 LES ARMES, PREMIERE TRANCHE. Quatre neuves — canon d'assaut,
                   canon laser, tesla, lame tournoyante — et les trois anciennes
                   entrees dans la meme table : huit fiches dans `shared/armes.js`.
                   LA VARIETE NE VIENT PAS DU PROJECTILE. Dix armes qui se
                   distinguent par leur balle se jouent toutes pareil. Les quatre
                   neuves couvrent les quatre AXES du plan : le mouvement (la
                   rampe du canon d'assaut), la ressource (la chaleur du laser),
                   la visee (le tesla, qui n'en demande aucune), la distance (la
                   lame, portee nulle). `verifierArmes()` refuse un depot ou l'un
                   des quatre est vide.
                   UNE ARME NE CHANGE PAS CE QU'UNE CARTE FAIT, ELLE CHANGE CE
                   QU'ELLE LUI RAPPORTE : six coefficients par arme, un seul pool
                   de cartes. Une carte de cadence est excellente sur le tesla et
                   presque inutile sur le railgun, sans ecrire une carte neuve.
                   La cadence se rescale sur sa REDUCTION — `fireIntervalMul`
                   descend quand la cadence monte, donc appliquer le coefficient
                   a la valeur brute inverserait le levier sur toute arme lente.
                   AUCUNE ARME SOUS 60 % DE LA REFERENCE DANS L'UN DES DEUX
                   CONTEXTES. Les boss sont un cinquieme du temps de manche,
                   contre une cible unique : une arme qui saute entre les cibles
                   n'a rien a sauter. `conversionBoss()` CALCULE la conversion au
                   lieu de la declarer — les arcs du tesla reviennent (0,43 ->
                   0,96), la lame empile une marque (0,45 -> 0,62), les plombs
                   convergent sous 250 px (0,30 -> 0,94).
                   TROIS BUGS TROUVES PAR LE BANC, AUCUN D'EQUILIBRAGE : `boss.r`
                   n'existe pas (le rayon est `CFG.BOSS_RADIUS`) et une garde de
                   portee comparee a NaN LAISSE PASSER au lieu de rejeter, donc
                   le faisceau touchait un boss hors de vue ; le souffle du
                   lance-grenades se calculait en fraction de `CFG.BULLET_DAMAGE`,
                   juste tant qu'une arme etait une carte, faux des qu'elle
                   declare ses degats (1 540 % de la reference) ; et un combat de
                   boss resserre `state.bounds`, donc un mannequin pose en absolu
                   ne tient pas une image.
                   SEIZE CARTES DE FAMILLE, quatre par arme neuve, sur le systeme
                   `family`/`tier` existant. La famille de l'arme PORTEE est
                   garantie dans le pool, celles des autres en sont retirees :
                   plus de manche condamnee par un tirage qui ne coopere pas. Ce
                   sont les seules cartes qui ne peuvent jamais faire doublon, et
                   elles sortent du rapport communes/epiques — les seize ne sont
                   jamais disponibles ensemble.
                   UNE ARME N'EST PLUS UNE CARTE. Dispersion, railgun et
                   lance-grenades quittent `CARDS` pour la table : trois offres au
                   depart, LE TIR STANDARD TOUJOURS PARMI ELLES (repli sur pour un
                   debutant), une relance. Le choix vit dans le BRIEFING, qui
                   retient deja la vague et attend deja tout le monde — un ecran
                   de plus pour trois boutons serait neuf points d'enregistrement
                   pour rien. Une arme est verrouillee si et seulement si un haut
                   fait la donne, comme une carte ou une relique.
                   L'index d'arme circule dans l'instantane : `ARMES` est
                   APPEND-ONLY, comme `ENEMY_TYPES` ou `BOSS_ROSTER`. Trois
                   places en queue du tuple joueur — index, ressource, angle.
                   `perforation` et `inertie` perdent leur incompatibilite avec le
                   railgun : le COEFFICIENT dit mieux « inutile » qu'un refus
                   binaire, et le railgun n'est plus une carte.
                   RESTE A FAIRE sur ce lot : l'identite SONORE par arme (section
                   8.2), la jauge de chaleur sous le reticule (l'anneau de rampe,
                   lui, est pose sur le personnage), et les deux armes hors
                   tranche — fusil de siege et fusil de precision, deja NOMMEES
                   par leurs hauts faits et qui traversent sans rien verrouiller.

     0.14.3 lot 02 LES ARMES S'EQUILIBRENT ENTRE ELLES. Le banc disait ce qu'une
                   arme SORT, pas ce qu'elle fait GAGNER : manche reelle, profil
                   P1, six graines, et LA MORT COMPTE. La mesure est le temps
                   tenu, rapporte au tir standard.
                   LE PILOTE NE SAVAIT PAS JOUER DEUX DES QUATRE ARMES, et c'est
                   ce qu'il fallait etablir AVANT de toucher un chiffre. Rampe
                   tenue 0,39, chaleur 0,99, lame a 196 px pour une portee de
                   110 : la mesure jugeait l'incapacite du bot. `pilotage()`
                   gagne donc une TENUE DE DISTANCE deduite de l'arme et un terme
                   d'immobilite pour les armes a rampe — les deux ne s'activent
                   que si l'arme les declare, donc avec le tir standard son
                   comportement est INCHANGE et les mesures des lots I a K
                   gardent leur sens.
                   UN DEFAUT DE CONCEPTION QUE SEULE CETTE MESURE POUVAIT
                   MONTRER : la chaleur montait des qu'on tirait, or le tir est
                   AUTOMATIQUE et le plan interdit d'ajouter une entree. La
                   ressource n'etait donc pas pilotable — un metronome. Elle
                   monte maintenant quand le faisceau TOUCHE : on la gere en
                   visant ailleurs, sans un bouton de plus. 0,99 -> 0,64.
                   Un bug d'echantillonnage se cachait dessous : le faisceau se
                   resout a 10 Hz, la chaleur s'integre a 60, donc elle
                   refroidissait cinq images sur six et ne montait jamais.
                   LE LANCE-GRENADES DEBORDAIT PAR SA SURFACE, PAS PAR SES
                   DEGATS : 0,67 de la reference en cible unique et pourtant
                   1 063 kills contre 416, x1,88 de survie. La premiere coupe
                   portait sur les degats — `verifierArmes()` l'a REFUSEE, elle
                   le faisait tomber a 53 % de la reference. Rayon de souffle
                   130 -> 95 px, et l'arme rentre a x1,03.
                   LE RAYON DE LA LAME N'EST PAS UN LEVIER, C'EST UN SEUIL :
                   130 px -> x0,66, 156 px -> x1,58. Vingt pour cent de rayon
                   font basculer la survie d'un facteur 2,4, parce qu'en dessous
                   de ~150 px la lame ne perce pas l'anneau qui se referme sur
                   elle. Le rayon se pose donc AU-DESSUS du seuil et c'est l'ARC
                   qui regle : 162° -> 108°, ce qui demande en plus de faire
                   face. x1,14.
                   Le rayon lui-meme cesse d'etre un nombre invente a cote d'une
                   colonne qui disait deja combien : il se DEDUIT de `portee`,
                   avec un facteur `LAME_UTILE` mesure et non suppose.
                   ETAT FINAL, ecart 0,76 a 1,30 : assaut 0,76 (il paie sa survie
                   pour 2,22 fois la reference en degats), railgun 0,93 avec le
                   meilleur TTK boss (66 s), tesla 1,05, grenade 1,03, lame 1,14,
                   laser 1,28, dispersion 1,30.
                   RESTE NON MESURE : un seul effectif, une seule difficulte, un
                   seul profil. Les compositions a plusieurs et le cauchemar
                   restent a faire.

     0.14.4 lot 04 UN CADRE CESSE D'ETRE UNE COULEUR. Douze traits colores ne se
                   distinguent pas a la largeur d'un nom : Or et Arsenal etaient
                   deux ambres voisins, et rien ne disait ce qu'un cadre avait
                   coute. La peau quitte `hauts_faits.js` pour `CADRE_SKIN`
                   (`palette.js`), meme decoupe que BOSS_ROSTER / BOSS_SKIN.
                   CINQ EMPLACEMENTS A VALEURS NOMMEES — fond, bordure, ornement,
                   lueur, insigne — et `menus.css` a une regle par VALEUR, jamais
                   par cadre : un treizieme cadre est une ligne de table et un
                   glyphe, zero CSS.
                   LE PALIER SE CROISE AVEC L'EXIGENCE au lieu de se declarer :
                   1 mat (6 defis libres), 2 relief (5 defis cauchemar), 3 le seul
                   anime (`legende`). `verifierHautsFaits()` refuse un palier qui
                   ne concorde pas — les quatre tests negatifs mordent.
                   L'insigne est un MASQUE CSS et non un <svg> injecte : les sites
                   d'appel construisent des chaines HTML, et un masque prend
                   `var(--cadre)`, donc le spectre du Prismatique s'y applique
                   sans cas particulier. La lueur passe par `filter: drop-shadow`
                   parce que `encoche` est un `clip-path`, qui decouperait une
                   ombre exterieure — meme piege que « --bevel et --glow-go ne
                   coexistent pas », resolu au lieu d'etre evite.
                   EN MANCHE, RIEN NE CHANGE DE SURFACE : le soulignement reste,
                   il gagne la teinte et la lueur a partir du palier 2. Le sol
                   porte les telegraphes, une plaque le couvrirait.
                   Reseau et persistance inchanges : le serveur envoie un
                   identifiant, comme avant.

     0.15.0 lot 1  ARRETER LES PERTES. Cinq defauts qui retiraient de la valeur
                   au joueur pendant que le reste du plan 12 s'ecrivait.
                   « SECOND CANON » ETAIT UN MALUS PUR SUR CINQ ARMES SUR HUIT :
                   `barrelDamageMul` se paie en haut de `_volley`, avant
                   l'aiguillage, alors qu'`extraBarrels` n'est lu que par la
                   branche a balles unitaires. Dispersion, tesla, lame et
                   grenade payaient -18 %, cumulable deux fois, pour rien ; le
                   laser ne payait ni ne recevait. Rarete 1, donc frequente, et
                   son texte promettait un gain. La carte declare `canons`, le
                   pool la retire par `litCanons(arme)` — DEDUIT du tir, pas une
                   liste a tenir. La penalite descendra dans la branche au lot 3.
                   LA FAMILLE D'ARME SE DECLARE au lieu de se deduire de « n'est
                   pas le tir standard » : une famille deduite se vide des qu'on
                   ajoute une arme, et dispersion, railgun et grenade en
                   declaraient une vide. Pool inchange a la mesure — c'est le
                   critere du lot 3 qui mordra, pas le tirage d'aujourd'hui.
                   `nomsRecompense()` n'avait pas de branche `arme` : neuf hauts
                   faits annoncaient « dispersion » au lieu de « Fusil a
                   dispersion ». `armeNom` etait deja importe.
                   `justify-content: safe center` sur `.overlay` : un conteneur
                   de defilement qui centre place le debordement DES DEUX COTES,
                   et scrollTop 0 est deja sous le debut du contenu. Les
                   premieres lignes de Hauts faits etaient inatteignables ; huit
                   overlays repares d'un mot-cle, `#brief` compris.
                   L'ECRAN D'ARME : `#briefArme` sans `width` se reduisait a son
                   contenu sous le `align-items: center` de `.briefWrap`, et
                   `auto-fit` renvoyait la troisieme arme a la ligne. La grille
                   dit TROIS. Survol, focus et selection existent enfin, en
                   `--tint` et non `--go` : le briefing porte la teinte de
                   classe.

     0.15.1 lot 2  REPARER LES REGLES FAUSSES. Quatre endroits ou le jeu annonce
                   une chose et en fait une autre.
                   LE PLAFOND DE PV NE PLAFONNAIT PAS. `hpCap` etait pose au
                   MILIEU de la chaine, dans `fullMods` ; `applyMeta` et les
                   reliques passaient apres et par-dessus. Contrat de sang
                   annonce 60 PV, un compte avance en gardait 198. `plafonnerHp`
                   devient le DERNIER maillon, appele une fois dans
                   `_recomputeMods` — toute source de PV branchee plus tard
                   passera devant lui au lieu de le contourner. La fenetre de
                   build le rejoue, sinon elle annoncerait ce que la carte
                   interdit. Mesure : 60 exactement, meta pleine et deux
                   reliques de PV comprises.
                   UN CRISTAL EST UNE CIBLE. `_harvestHit` n'etait appele que
                   depuis `_bullets` : le faisceau, l'arc et le balayage ne
                   poussent rien dans `bullets`, donc laser, tesla et lame ne
                   pouvaient pas casser un cristal — les eclats achetent les
                   reliques, c'etait un axe de progression ferme a trois armes.
                   Le lance-grenades non plus, son direct etant nul : le souffle
                   d'un JOUEUR entame maintenant, celui d'un kamikaze non.
                   `_harvestDamage` porte l'APPLICATION, la geometrie reste a
                   l'arme, qui l'a deja pour les corps. Le tesla garde une
                   reserve : le cristal n'est acquis que si plus rien de vivant
                   n'est a portee — un cristal qui aspire les arcs en pleine
                   vague est une punition. Mesure : les huit le cassent, de 0,28
                   a 1,28 s ; le cristal reste INTACT avec trois ennemis a cote.
                   LA GRENADE DETONE AU RETICULE. `court` multipliait la duree
                   de vie, donc l'explosion tombait toujours a la meme distance
                   et « il faut anticiper la trajectoire » ne voulait rien dire.
                   Le client envoie desormais `ar` BRUT : il le clampait par
                   `bombRange` avant l'envoi, donc l'arme heritait de l'allonge
                   de la Bombe (460 px) au lieu de la sienne (864). Point de
                   passage `porteeReticule()`, qui ASSAINIT seul ; chaque usage
                   pose sa propre borne. Un corps rencontre avant fait sauter la
                   grenade plus tot, comme avant. Mesure : 5 m -> 5,2 m ;
                   60 m -> 43,3 m, la portee de l'arme. La portee UTILE de la
                   grenade passe de 475 a 864 px : c'est le lot 5 qui tranche.
                   Un marqueur au sol annonce le point d'impact, sature quand le
                   reticule depasse. La portee se DEDUIT des cartes du client,
                   aucune cle d'instantane ouverte.
                   DEUX ARMES ETAIENT MUETTES. `kind 17` manquait a
                   `EFFECT_SOUND` : la lame prend `balayage`, mais PITCHE et sans
                   tressaillement — le boss balaie une fois par phase, la lame
                   2,5 fois par seconde, c'est un palier 2 et un tir ordinaire ne
                   secoue pas l'ecran. Le laser prend une BOUCLE et non un
                   declenchement : un faisceau continu ne se decoupe pas en tirs,
                   et un tick par 0,1 s serait un metronome. Sa hauteur monte
                   avec la chaleur, coupee NET a saturation — la ressource
                   devient audible avant d'etre fatale. Une voix, hors limiteur.

     0.15.2 lot 3  POSER LES FILETS. Pas une ligne de contenu : les criteres qui
                   empecheront les lots suivants de recreuser les memes trous. Le
                   fil rouge du plan 11 s'est casse trois fois — recompense
                   indexee, famille deduite, recompense nommee sans cible —
                   parce que chaque garde-fou a ete ecrit APRES le contenu.
                   `conversionBoss()` NE VOYAIT PAS LA CHALEUR. `powerIndex` lit
                   `dpsBase x conversionBoss`, et `powerIndex` alimente
                   `bossPower` : la mise a l'echelle des boss tournait sur une
                   conversion fausse. Banc monte pour trancher (boss fige et
                   increvable, horde videe a chaque tick, critique coupe, 300 s,
                   neuf distances, en part du tir standard) : standard 1,00 ·
                   assaut 0,98 · laser 1,18 · tesla 2,21 · lame 1,40 · dispersion
                   1,01 · railgun 1,04 · grenade 1,04. UNE SEULE manquait, celle
                   du laser — le spec en annoncait six. Elle se CALCULE : contre
                   une cible unique le faisceau ne rate jamais, donc la chaleur
                   sature, et le bonus se paie sur la moyenne du cycle entre le
                   plancher que laisse le mutisme et 1. L'uptime n'y entre pas,
                   c'est un terme a part du modele. La convergence de la
                   dispersion MAINTIENT ses six plombs a 1, elle ne depasse pas.
                   `perforation` ET `ricochet`, deux axes au lieu d'un. `pierce`
                   et `chain` sont deux clefs de `mods` : mettre la perforation du
                   railgun a zero — ce qu'exige la realite, `perforeTout` ecrasant
                   le mod avant lecture — aurait tue son rebond avec. Le ricochet
                   reprend VERBATIM l'ancienne colonne, donc zero changement de
                   comportement ; seule la perforation tombe, sur le laser et le
                   railgun, ou la statistique etait deja infinie.
                   LES AXES D'UNE CARTE SE RELEVENT (`axesDeCarte`) : on observe
                   ce que `apply` et `applyAfter` ecrivent dans `mods`, au lieu
                   d'un champ `axes:` qui derive des que l'effet bouge. 28 cartes
                   sur 158 touchent le tableau. `inertia` y compte comme une
                   perforation : pas de colonne a elle, morte partout ou la
                   perforation l'est.
                   UNE CARTE A COEFFICIENT NUL SORT DU POOL. Retire, par arme :
                   Perforation et Inertie (5 armes), Ricochet (4), Second canon
                   (5). `poolThin` se rejoue arme par arme — aucun pool maigre.
                   LA PENALITE DESCEND OU VIT LE BENEFICE. `barrelDamageMul` se
                   payait en haut de `_volley`, avant l'aiguillage ; il descend
                   dans la branche a balles unitaires, avec `powerIndex` et le
                   panneau de stats. Mesure sur cible unique : les cinq armes qui
                   ne lisent pas `extraBarrels` passent de -26 % a 0,0 % exact.
                   L'incoherence devient impossible au lieu d'etre rattrapee.
                   TROIS CRITERES NEUFS, et ils MORDENT — un lot 3 silencieux
                   aurait pose des tests complaisants. `verifierArmes(cards,
                   axesDeCarte)` : 3 erreurs, les trois armes sans famille.
                   `verifierHautsFaits(…, armeIds)` : 2 erreurs, les deux armes
                   que neuf hauts faits donnent et que la table ne contient pas —
                   plus le test INVERSE, une arme que personne ne donne. Toute
                   carte offensive doit toucher un axe ou porter `horsEchelle`,
                   exemption EXPLICITE : 52 posees a la main, une par une.
                   `verifierCatalogue()` reste silencieux, et c'est dit.

     0.15.3 lot 4  LE CONTENU QUI MANQUAIT. Huit armes deviennent DIX, quatre
                   familles de cartes deviennent DIX, et les trois verificateurs
                   poses au lot 3 redeviennent silencieux — c'etait leur travail.
                   LE RAILGUN A UNE CHARGE, ET C'EST UNE HORLOGE. Sa fiche en
                   annoncait une, son axe declare etait « ressource », et le code
                   n'avait rien : un fusil lent qui perfore, meme capsule que le
                   tir standard. Le tir etant AUTOMATIQUE, une charge qu'on
                   relache n'existe pas et une charge purement temporelle est un
                   metronome — le meme piege que la chaleur du laser. Elle se lit
                   donc SUR LA LIGNE DE TIR, qui se dessine un peu plus loin a
                   chaque image : elle dit QUAND et OU en meme temps, et ce que le
                   joueur pilote est sa position a l'instant ou le rail part.
                   1,6 s et 140 degats : 87,5 de dps nominal contre 85,7 avant,
                   donc le lot d'equilibrage repart du meme point.
                   DEUX ARMES ENFIN ECRITES. Le fusil de SIEGE : six obus, puis
                   1,8 s ou l'arme ne rend rien. Le chargeur est un COMPTE, donc
                   des crans, et le meme anneau porte la recharge — c'est la meme
                   question. `armeMuet` la ferme, le meme champ que la saturation
                   du laser. Sa garde x3 est rendue A LA FIN de la fenetre, sinon
                   la contrepartie devenait un cadeau permanent ; elle n'annule
                   pas la vulnerabilite, elle l'empeche d'etre letale. Le fusil de
                   PRECISION : portee x2,2, 20 % de critique de base, traverse un
                   corps. `armesOuvertes` les verrouille toute seule — leurs hauts
                   faits les nommaient depuis le lot 03 du plan 11.
                   UN OBUS N'EST NI UNE GRENADE NI UN MISSILE. Trois champs, trois
                   sens : `missile` GUIDE et ne touche que sa cible, `direct` fait
                   le direct PUIS le souffle, `lob` RALENTIT. Les deduire l'un de
                   l'autre a casse deux fois — l'obus ralenti par son `boom`, puis
                   la grenade acceleree par son percuteur alors que sa duree de vol
                   se calcule sur la vitesse attendue. Mesure apres correction :
                   reticule a 200 / 400 / 600 / 864 / 1200 px -> detonation a
                   204 / 403 / 603 / 867 / 867, avec percuteur comme sans.
                   VINGT CARTES DE FAMILLE, cinq familles a quatre paliers, en
                   QUEUE de `CARDS`. Meme regle que les quatre premieres : le 3/4
                   corrige la faiblesse de l'arme dans le contexte ou elle est la
                   plus faible — convergence totale, sillon incandescent,
                   percuteur, dernier obus, cible froide — et le 4/4 REPORTE la
                   statistique du 1/1, sans quoi il se verrouille hors de sa
                   propre echelle et meurt a la prise.
                   La reaction en chaine a une PROFONDEUR BORNEE : sans plafond,
                   une nuee serree fait exploser toute la vue en une image.
                   Mesure : dix armes, 600 s de pilote chacune, aucune exception ;
                   famille pleine sur chacune, 300 s, idem. Aucun pool maigre.

     0.15.4 lot 5  EQUILIBRER, UNE FOIS. Le critere d'avant ne connaissait qu'un
                   nombre — le dps nominal en cible unique — et il est reste MUET
                   pendant que le tesla dominait et que la grenade faisait x1,88
                   de survie. Il ne mentait pas, il regardait le mauvais nombre.
                   QUATRE COMPTEURS sur le joueur : `armeTemps`, `armeMuet`,
                   `armeCibles`, `armeDegats`. `armeMuet` ne compte que le refus
                   pour cause de RESSOURCE — saturation du laser, recharge du
                   siege : un temps mort volontaire mesurerait le style du pilote.
                   La charge du railgun n'en est pas, elle EST sa cadence, et
                   compter une cadence comme du mutisme rendrait toute arme lente
                   muette. L'attribution passe par `_sousArme` : une balle de
                   competence et une balle de tir sortent toutes deux de `_fire`,
                   donc le drapeau voyage sur la balle jusqu'a l'impact.
                   LE MODELE : V = 0,8 Dh + 0,2 Db + S. Le plan ecrivait
                   `(0,8 Vhorde + 0,2 Vboss) x U x R`, ou `Vhorde` porte deja les
                   cibles et `R` deja le rapport au nominal : les multiplier
                   compte deux fois la meme chose. Une mesure directe contient U
                   et R par construction ; les deux restent RELEVES, parce que ce
                   sont eux qui disent quel terme deborde.
                   ON MESURE L'ABSORBE, JAMAIS L'ENVOYE. Le surtuage pesait
                   jusqu'a 76 % des degats d'une arme a gros coup : compter le
                   brut classait les armes par gaspillage. Consequence directe et
                   contre-intuitive — `degats` SATURE sur une arme qui tue deja en
                   un coup, et le levier devient la cadence ou les cibles.
                   LES DEUX BANCS SONT IMMORTELS. Sans ca `Dh` est confondu avec
                   la survie : une arme qui tient plus longtemps atteint des
                   minutes plus denses, donc mesure un debit plus eleve, et la
                   survie serait comptee deux fois. Le banc de boss laisse le boss
                   ATTAQUER et le pilote REPONDRE : figer le tireur offrait la
                   rampe pleine au canon d'assaut et le mesurait a 2,6 x nominal.
                   `D` SE NOTE SUR DES MECANIQUES (`exige`, cinq colonnes), pas
                   sur une impression : « y a-t-il une jauge » a une reponse dans
                   le code, donc la note se rejoue quand une onzieme arme arrive.
                   Cible 1,00 + 0,04 x (D - 0,5), soit 0,95 a 1,17.
                   DEUX DEFAUTS TROUVES PAR LA CAMPAGNE, pas par la lecture. Le
                   direct d'un OBUS n'atteignait pas les boss — la branche de
                   collision ne le rendait que pour un missile de Salve, donc tout
                   ce que le siege delivrait a une cible unique venait de son
                   souffle, et reduire le rayon le faisait tomber a ZERO. Et une
                   balle en vol resolvait sur un JUMEAU disparu : `hp -= x` dans
                   un cadavre rend `undefined - x`, donc NaN, donc du silence.
                   `conversionBoss` compte enfin le souffle de l'obus : sans lui
                   le siege se lisait a 53 % de la reference la ou le banc en
                   mesure 80 %.
                   LA RESOLUTION DE LA CAMPAGNE EST DE +-0,08 sur les armes
                   chaotiques, plus large que la tolerance de +-0,05 : le canon
                   d'assaut change de 0,16 pour 2 % de degats. Au-dela de vingt
                   graines on ajuste du bruit. Le critere de sortie est la BANDE
                   GLOBALE, et elle est tenue.

     0.15.5 lot 6  LE TESLA SE VISE. Une arme qui atteint la reference SANS EXIGER
                   DE VISEE n'est pas une arme alternative, c'est l'arme optimale —
                   et elle retirait le seul geste que le jeu demande. `sansVisee`
                   etait l'idee du plan 11 ; l'idee etait mauvaise. Le reste tient
                   debout : les arcs, les rebonds, le 0 % de critique, la
                   conversion boss. C'est la DELIVRANCE qui change.
                   Le champ `sansVisee` n'etait d'ailleurs lu NULLE PART : l'auto-
                   visee vivait en dur dans `_teslaTir`. Le trait part maintenant
                   droit devant et s'accroche au PREMIER CORPS DU SEGMENT, avec
                   40 px de tolerance laterale — le tesla est l'arme qui PARDONNE
                   la visee, pas celle qui s'en passe : sans cette marge on aurait
                   remplace « ca ne peut pas rater » par « ca rate tout le temps »,
                   ce qui n'est pas plus un choix. La projection sort de
                   `_segmentHits` (`_surSegment`) au lieu d'etre reecrite, et le
                   cristal suit la meme regle : il ne s'acquiert que dans l'axe.
                   UN REBOND de base au lieu de deux, le second s'achete ; saut a
                   220 px, la dispersion est locale et non un ratissage ; portee
                   0,85 — 34 m etait enorme PARCE QUE L'ARME VISAIT SEULE.
                   Mesure du critere : sur un groupe de quatre corps, viser le
                   groupe donne 45/11/0/21, viser a cote 74/0/106/0, viser ailleurs
                   ZERO. Un tir tesla peut enfin rater.
                   L'AMORCE SE DISTINGUE DE LA DISPERSION : le premier arc porte
                   `n: 1` — le champ de magnitude, DEJA dans le tuple d'effet, donc
                   aucune clef ouverte — et se dessine presque droit et epais la ou
                   les rebonds restent agites et fins. Sans cette difference l'arme
                   se relit comme automatique, ce qu'elle n'est plus.
                   `botInput` envoyait `ar: 1` : sans effet tant que `bombRange` le
                   remontait a 80, FAUX depuis que `porteeReticule` le prend au
                   mot — une grenade detonait au pied du bot de mesure.
                   La refonte a coute 0,16 au tesla (0,906 -> 0,744), ce que le
                   plan annoncait : c'est l'arme dont la realisation change le plus.
                   CAMPAGNE DE CLOTURE (20 graines x 20 min) : les DIX armes dans
                   la bande 0,95-1,17 ET dans la tolerance de +-0,05, ecart maximal
                   0,035. Le dernier a rentrer est le laser, et pas par ses degats —
                   sa reponse y est non monotone — mais par sa LARGEUR : 10,5
                   cibles/s contre 4,7 pour la reference. 26 -> 22 px, 1,126 ->
                   1,037. Le releve complet est dans LISEZMOI.md.

     0.15.6 lot 7  UN CADRE CESSE D'ETRE UN MOT. Il decorait le TEXTE d'un nom :
                   un inline-block avec deux pseudos dans son padding, invisible
                   dans les menus, a l'etroit au bilan. Une plaque a une
                   silhouette, une profondeur, une lueur et une zone morte — rien
                   de tout ca ne tient autour de sept lettres. Le support devient
                   la LIGNE D'EQUIPE, dont `renderTeamList` construisait deja
                   exactement l'anatomie : il y avait un `appliquerCadre` a
                   deplacer d'un niveau, pas une structure a refaire.
                   LA PORTEE « ligne » DISPARAIT AVEC SON BESOIN : elle desactivait
                   le fond au bilan, donc elle admettait que l'endroit etait
                   mauvais. Plus aucun cadre au bilan, et `.nameCadre` avec —
                   une classe dont la seule lecture est morte se supprime.
                   L'insigne devient un MEDAILLON sur l'avatar, a sa vraie taille ;
                   l'encoche passe de 7 a 12 px, a l'echelle de ce qu'elle
                   entaille ; l'apercu du Terminal rend une vraie ligne en
                   miniature — on equipe ce qu'on a VU.
                   Deux pieges payes. `.teamRow` sert AUSSI au HUD (`hud.css`) :
                   on SCOPE en `:is(#teamList, .cadreApercu)` au lieu d'elargir,
                   sinon les styles de salon fuient dans la partie. Et la ligne
                   posait `background:` en raccourci, ce qui efface le
                   `background-image` du fond de cadre a chaque rendu, avec un ID
                   qui bat la specificite des regles d'emplacement — passe en
                   `background-color`. Zero regle CSS par cadre, comme avant.
                   LE RAILGUN SE DETACHE DE LA CAPSULE COMMUNE. Cinq armes
                   partageaient la meme silhouette ; le rail prend la sienne, une
                   aiguille longue a trainee DROITE et coeur clair — un rail ne
                   flotte pas. Elle se DEDUIT : le proprietaire voyage dans le
                   tuple de balle, son arme dans le tuple joueur, donc aucune clef
                   d'instantane a ouvrir.

     0.15.7 lot 8  CLAUDE.md PASSE DE 132 k A 20,5 k CARACTERES. Il est charge a
                   CHAQUE session : tout ce qui ne sert qu'a un domaine y coutait
                   des tokens a chaque tache, y compris celles qui n'en touchaient
                   aucun. La racine ne garde que ce qui vaut pour TOUTE tache —
                   commandes, version, plan de fichiers, regle des couches, points
                   de passage uniques, conventions, workflow — plus une CARTE et
                   les pieges dont l'echec est SILENCIEUX : tables append-only,
                   instantane positionnel, couches et setters, unites, repli
                   francais. Le reste part dans `docs/regles/` — SIMULATION,
                   RESEAU, RENDU, CONTENU, LANGUES — qui ne sont PAS charges : on
                   les ouvre quand la carte le dit. Meme motif que `LISEZMOI.md`,
                   deja lu a la demande. Une tache de rendu paie desormais 54 k au
                   lieu de 132 k, une tache d'outillage 20 k.
                   NEUF INFORMATIONS MORTES retirees, relevees en croisant chaque
                   identifiant cite avec le depot — 890 cites, 14 introuvables,
                   les 5 restants sont des exemples generiques :
                     `LEGENDARY_SPLIT` et le partage des legendaires en cinq
                     paquets, un systeme qui n'existe plus ;
                     `atkCdMul` et `zoneMul`, deux champs de roster disparus ;
                     `CORE_WAVE` — c'est `CORE_LEVEL`, et la formule lit le
                     NIVEAU, pas la vague ;
                     `bestFinalRun`, jamais ecrit au profil ;
                     `_bossDead`, `_waveTick`, `renderVoteDetail`, `b.sealDone`,
                     tous renommes ;
                     `clientWidth`, que `resize()` ne lit pas — il mesure par
                     `getBoundingClientRect()`.
                   `armes.js` etait a 37 % de commentaires, le pire du depot : ses
                   blocs recitaient la doctrine que les docs portent deja, ce que
                   la convention interdit explicitement. Treize blocs ramenes a
                   leur mesure et a leur piege. Le depot reste a 6 % au total.

     0.15.8 lot cadres : un cadre devient une PLAQUE, la rarete se lit a la
                   complexite technique et non a la couleur.
                   LA SILHOUETTE EST LE SIXIEME EMPLACEMENT. Elle etait soudee a
                   `bordure: encoche`, or la FORME et l'EPAISSEUR sont deux
                   decisions — une plaque blindee peut avoir un bord fin.
                   `CADRE_EMPLACEMENTS` liste les six, et `verifierHautsFaits`
                   refuse desormais une peau dont un emplacement est vide.
                   Valeurs neuves : silhouette droit/coupe/cran/blindee/brisee,
                   fond circuit/plaque, bordure blindee/chassis, ornement
                   boulons/rail, lueur segment. `CADRE_MARQUEURS_2` et
                   `CADRE_ANIMES` suivent, donc le croisement palier x exigence
                   couvre les nouvelles valeurs au lieu de les laisser passer.
                   LA PLAQUE EST UNE COUCHE, PAS LA LIGNE. `appliquerCadre()`
                   insere une couche `cadreCouche` en PREMIER ENFANT, absolue et
                   en `z-index: -1` : le contenu d'une ligne d'equipe — avatar,
                   nom, hote, classe, ping, etat — ne sait rien du cadre, et rien
                   n'entre dans le flux. Elle est construite dans `ui/cadres.js`
                   et non dans les chaines HTML des deux sites d'appel : un cadre
                   qui change ne touche qu'un fichier, et une ligne sans peau ne
                   porte pas d'element mort. Le parametre `portee` disparait avec
                   la boite qu'il supprimait.
                   LE PALIER NE SE DECLARE PLUS CADRE PAR CADRE : `menus.css` LIT
                   `data-cadre-palier` pour doser la visserie, le reflet et la
                   profondeur. Aucune regle ne nomme un cadre, donc un treizieme
                   cadre reste UNE LIGNE dans `CADRE_SKIN`.

     0.15.9 correctif de test : la dispersion se SCINDE, le canon en plus vaut
                   pour dix armes, la trainee de Vif-argent se voit, le cadre
                   suit le salon.
                   LA DISPERSION EST UNE DISTANCE, PAS UN CONE. Six plombs en
                   cone sur 24 m ne demandaient rien au joueur. Une balle unique
                   part, vaut deux plombs, et se scinde a 260 px : muette sous
                   276, 1,55 x la reference entre 276 et 350, 0,50 au-dela. La
                   carte 3/4 « Canon a ame lisse » ne resserre plus un cone, elle
                   SUPPRIME la divergence — la queue s'aplatit au lieu que la
                   pointe monte. `arme.convergence`, `mods.convergeTotale` et les
                   options `lat`/`conv` de `_fire` sont morts avec elle.
                   L'OUVERTURE EST LE LEVIER DE HORDE, PAS LES DEGATS : a 0,42
                   rad les plombs se marchaient dessus et le surtuage plafonnait
                   `Dh` (5,45 -> 7,9 de degats n'a rendu que +1). Arc 0,80,
                   interval 0,32, degats 6,2 — V 0,99 pour une cible de 1,06.
                   UN CANON EN PLUS N'AJOUTE PAS LA MEME CHOSE PARTOUT
                   (`canonEffet`) : une balle en eventail, deux plombs, une
                   grenade, un arc, une nappe. « Second canon » etait retire du
                   pool de cinq armes, qui n'avaient donc AUCUNE carte de
                   projectile. `litCanons` s'en deduit, `canonGain` porte le gain
                   pour `_volley`, `powerIndex()` et le panneau de stats. Le
                   bonus « double » emprunte le meme chemin.
                   ATTRIBUTION A L'ARME CORRIGEE : `_bullets` posait le drapeau
                   pendant le vol, l'impact se resout dans `_collisions` — toute
                   une image de touches etait creditee a la derniere balle
                   parcourue, degats de classe et de zone compris. Le `Dh` de
                   toutes les armes a balle baisse de ~20 %, reference comprise ;
                   le tesla (1,44) et le laser (1,19) n'ont pas bouge, leur ecart
                   etait MASQUE. `hf.armeDegats` ne sert qu'au banc, aucun haut
                   fait ne le lit : rien ne change en partie.
                   VIF-ARGENT NE FAISAIT RIEN A L'ECRAN. Elle blessait depuis
                   toujours ; sans trace au sol le joueur ne pouvait pas le
                   savoir. `spawnDashMark` pose un point tous les 10 px — pas un
                   par image, sinon la densite suit la frequence d'affichage.
                   LE POOL DE CARTES IGNORAIT L'ARME PORTEE : `_cardCtx()` est
                   d'EQUIPE, `p.arme` est du JOUEUR, et `offerCards` ne l'y
                   ajoutait pas. Les trois filtres par arme tombaient en silence
                   — la famille du porteur RETIREE du pool au lieu d'y etre
                   garantie, aucune carte a coefficient nul ecartee, « Second
                   canon » offert partout. C'est la cause reelle de « la carte ne
                   change rien ».
                   LE CADRE NE SUIVAIT PAS LE SALON : `metaCadre` renvoyait le
                   profil sans rediffuser `lobbyPayload()`, donc il fallait
                   quitter la salle et y revenir.

     0.16.1 lot 1  LE PALIER DE QUALITE. Premier lot du plan 13, qui fait monter
                   d'un cran le rendu de l'arene sans toucher une regle de jeu.
                   Il n'ameliore rien a l'ecran : il rend les six lots suivants
                   comparables, reversibles et mesurables.
                   `survivor.gfx` — quatre paliers, `high` par defaut. Un defaut
                   prudent ferait que personne ne voit jamais le travail ; `low`
                   reste a un clic. Le NOM est ce qu'on range, pas l'indice : un
                   palier insere plus tard reinterpreterait un indice stocke.
                   `low` EST UN CONTRAT, mais sur la TECHNIQUE : matiere, semis,
                   lumiere, grille d'avant le plan 13. C'est le bouton AVANT de
                   la comparaison visuelle, et le repli d'une machine qui ne suit
                   pas. Tout lot suivant qui touche un chemin partage verifie
                   qu'il n'a pas bouge. La PALETTE d'arene est hors contrat (lot
                   2) : un palier regle un cout de rendu, il n'annule pas une
                   decision de direction artistique.
                   Ce qui ne change JAMAIS entre paliers : la simulation, les
                   collisions, les apparitions, la position de quoi que ce soit.
                   Deux joueurs de la meme partie a deux paliers voient la meme
                   INFORMATION, pas la meme image.
                   Bouton cyclique au menu pause, a cote des deux bascules de
                   HUD, meme modele que `survivor.renderer`.

     0.16.2 lot 2  LA MATIERE. Le sol donnait « texture repetee » pour une raison
                   arithmetique : 400 px repetes dans 1600 x 900, c'est 4 x 2,25
                   repetitions VISIBLES EN MEME TEMPS. Aucune quantite de detail
                   dans la tuile ne rattrape ca — c'est la periode qui se voit,
                   pas le contenu. Deuxieme echelle (`MACRO`, 1 200) faite de
                   nappes sans aucune arete, plus un semis qui, lui, ne se repete
                   jamais.
                   LA GRILLE DESCEND DANS LA MATIERE. `TILE` valait deja
                   exactement `GRID_MAJOR` et la maille de 5 m le divise par 4 :
                   la tuile portait donc les deux grilles sans le savoir. Un
                   joint a une epaisseur et deux cotes, donc il decrit une
                   SURFACE ; une ligne tracee decrit un plan technique — c'etait
                   le marqueur « prototype » numero un. La 20 m reste tracee a
                   50 %, seule a servir a lire une portee. `GRID_FINE` ne bouge
                   pas : `drawGridPings` s'en sert toujours.
                   `props.js` NE GARDE RIEN : presence, type, angle et echelle
                   d'un prop sont des fonctions de sa cellule monde et de la
                   graine. Meme motif que `champ()`, ancre a une cellule au lieu
                   d'un indice — semis infini, non repetitif, identique chez
                   tous, cache par rectangle de cellules et non par image.
                   RIEN DANS LE SEMIS NE SE LIT COMME BLOQUANT : tout est plaque
                   au sol et toute cellule occupee par un obstacle ou un danger
                   est sautee. Un pylone visuel traversable serait un mensonge de
                   gameplay ; ce qui doit bloquer reste un obstacle de
                   `biomes.js`. Collisions, apparitions, dangers : au bit pres.
                   L'ARENE EST ANTHRACITE, PAS INDIGO. Le bleu tirait la matiere
                   vers le plastique. `DECOR[]` et la teinte de la Friche
                   glissent vers le gris neutre-froid ; `SURFACE` et `UI_THEME`
                   ne bougent pas — deux palettes, deux portees, et les fusionner
                   defaisait un choix ecrit. Le vert de la Friche cesse de
                   piloter et redevient une trace : c'est une installation
                   abandonnee, pas un pre.
                   L'AMBRE CESSE D'ETRE UNIQUEMENT UN SIGNAL. Il devient une
                   matiere (`PROP.rouille`) et une lumiere (`PROP.led`). Les deux
                   ne se confondent pas : un signal est sature et anime, une
                   matiere est desaturee et fixe.

     0.16.3 lot 3  LA LUMIERE. Il n'y en avait AUCUNE : tout etait eclaire a
                   plat, seul le vignettage modulait. Premiere cause de l'ecart
                   de gamme, et la moins chere a corriger.
                   LA PILE DE CANVAS SEPARE DEJA SOL / ENTITES / EFFETS, donc une
                   passe posee sur `#cvUnder` NE PEUT PAS atteindre un ennemi, un
                   projectile, un telegraphe ou un marqueur. `drawLumiere()` est
                   appelee apres le sol et les props, AVANT le premier element de
                   gameplay : la hierarchie de lisibilite est structurelle, pas
                   reglee. La deplacer d'une ligne plus bas la casse en silence.
                   TAMPON A 1/4 DE LA VUE (1/2 en `ultra`) : le
                   sur-echantillonnage bilineaire du `drawImage` donne la douceur
                   GRATUITEMENT. A pleine resolution il faudrait un flou.
                   DEUX PASSES, PAS UNE. `multiply` fait l'ombre, `lighter` fait
                   l'emission. `multiply` seul rend un jeu plus sombre — pas un
                   jeu eclaire ; `lighter` seul delave. La base ambiante repart
                   dans la seconde passe : a 12 % d'une luminance de 0,45 le
                   relevement plat est negligeable, les taches claires montent.
                   TOUTE SOURCE EST LUE, AUCUNE N'EST POUSSEE : dangers par
                   `hazardState()` (donc la lumiere d'un geyser EST son etat,
                   rien a resynchroniser), props par `forEachPropLight()`,
                   souffles par `bursts`, joueurs par `playerList`. Ecrire vers
                   une couche superieure est interdit, et rien n'y obligeait.
                   UN PROJECTILE N'EST PAS UNE SOURCE : il y en a des centaines
                   par seconde a la minute 25, le sol clignoterait au rythme de
                   la cadence de tir. Un stroboscope n'a pas de fonction
                   artistique.
                   Une source plafonne a 0,85 : c'est l'EMPILEMENT qui fabrique
                   le coeur clair, exactement comme pour un souffle.

     0.16.4 lot 4  LE VOLUME. Une ombre bien placee en dit plus sur un volume que
                   n'importe quelle quantite de detail sur sa face.
                   `drawObstacles` FAISAIT DEJA LES DEUX GESTES, et les deux
                   etaient justes : l'extrusion RADIALE dit ou est la camera, le
                   decalage CONSTANT d'ou vient la lumiere. Le second etait ecrit
                   en dur a un seul endroit et rien d'autre ne le connaissait.
                   `lumDir()` le nomme et le partage — il vit dans `stage.js`,
                   la couche la plus basse qui en ait besoin, sous `fx.js` et
                   sous `decor.js`. Deux ombres qui pointent differemment sur le
                   meme ecran sont LE defaut visible d'un rendu 2D ; il n'existe
                   plus de second endroit ou l'ecrire.
                   L'OMBRE DE CONTACT. Sans elle une entite FLOTTE : aucune ancre
                   au sol. Un quad `fx_glow` teinte noir — la teinte
                   premultipliee donne un melange alpha classique — dans le lot
                   NORMAL qui existe deja : aucun appel de dessin en plus.
                   PASSE SEPAREE, et c'est la seule facon correcte : une ombre
                   posee juste avant SON corps tombe sur le corps deja dessine du
                   voisin. Elle ne s'additionne pas (200 ennemis serres feraient
                   une flaque noire), elle est ecrasee et decalee — jamais
                   centree, sinon elle se lit comme un halo. Pas d'ombre pour un
                   projectile : la frequence, comme pour la lumiere.
                   Le boss n'est pas dans l'atlas : son ombre est un TRACE.
                   LA FACE DU DESSUS DEVIENT UNE MATIERE : tole striee, coin use,
                   et une bande LED qui eclaire reellement le sol. `ledDe()` vit
                   dans `lumiere.js` et `decor.js` la lit — sinon la lueur et le
                   trait finissent sur deux aretes differentes. Reservee aux blocs
                   PERMANENTS : sur une couverture destructible elle
                   concurrencerait le contour tirete, qui est du gameplay.
                   Tout l'habillage est clippe a la silhouette : rien ne deborde
                   sur le sol, ou vivent les telegraphes.

     0.16.5 lot 5  L'ATMOSPHERE. Le lot le moins cher du plan 13 : la mecanique
                   existait deja, entiere, et elle etait bonne.
                   `champ()` PREND UN CENTRE. Trois parametres positionnels de
                   plus — pas un objet d'options, le module ne doit rien allouer
                   par image — et la meteo devient aussi la vapeur d'un geyser et
                   les etincelles d'un coffret. Un parametre, pas une seconde
                   fonction.
                   C'est un champ de particules SANS PARTICULES : la position
                   d'un brin est une fonction de son indice et du temps. Rien ne
                   s'alloue, un `stroke` par champ, et deux clients voient la
                   meme chose. C'est aussi ce qui empeche le lot de deriver — un
                   effet qui aurait besoin d'un tableau persistant n'est pas ici,
                   il est dans `fx.js` sous `PARTICLE_MAX`.
                   UN PROP EMISSIF EXISTE PAR TROIS CANAUX : il gresille, il
                   crache des etincelles, il eclaire son pourtour. Les trois
                   lisent la MEME declaration (`forEachPropLight`), ecrite au lot
                   2 et deja consommee par le lot 3. Un coffret qui n'aurait que
                   le premier serait du decor ; avec les trois c'est un objet.
                   LE PREMIER PLAN, trois regles sans exception : rien au centre
                   (il appartient au joueur), jamais opaque, et COUPE pendant un
                   boss — l'arene se resserre deja a une vue, y ajouter du bord
                   serait le contraire de ce que le resserrement cherche. La
                   parallaxe est une derive globale proportionnelle a la position
                   de camera : assez pour la profondeur, trop peu pour l'oeil.
                   PAS DE PLUIE, PAS DE BROUILLARD VOLUMETRIQUE. La Friche est
                   interieure-abandonnee ; et `voileBrume()` occupe deja le canal
                   de la brume — il est un CHAMP DE VISION, pas une teinte, deux
                   brumes se contrediraient.

     0.16.6 lot 6  LE BOSS PREND L'ARENE. Il n'y apparaissait que comme une
                   entite de plus ; le monde ne reagissait pas.
                   Le profil vit dans `BOSS_SKIN`, la table deja indexee par
                   `kind` : `amb`, `k`, `vig`, `puls`, `atmo`. Ce sont des
                   NOMBRES, donc l'application est une interpolation et non une
                   structure. Les cinq dernieres lignes sont les finals par
                   difficulte — meme profil, c'est le meme combat.
                   DEUX CANAUX A CONSTANTES DE TEMPS DISTINCTES, et l'ordre est
                   tout : `kL` (1,2 s) porte l'ambiante et le vignettage, `kS`
                   (0,8 s) ne demarre qu'a `kL > 0.85` et porte la teinte du sol
                   et l'atmosphere. LA LUMIERE CHANGE AVANT LA MATIERE : on sent
                   l'arrivee avant de la voir, ce qui est l'ordre dans lequel une
                   menace se manifeste. Une bascule instantanee de la couleur du
                   sol se lit comme un bug de rendu, pas comme une entree.
                   LA TEINTE DU SOL PASSE PAR L'AMBIANTE de la passe de lumiere,
                   jamais par un recuit de la tuile : le mecanisme du lot 3
                   existe deja et il coute un `melange()`. Recuire 400 x 400 par
                   image pour la meme image aurait ete le chemin evident et le
                   mauvais.
                   Le profil est GARDE pendant la sortie — il devient null des la
                   mort du boss alors que les deux canaux ont encore 1,5 s a
                   redescendre. Une rupture de barre est une POINTE, pas un
                   palier.
                   AUCUN TELEGRAPHE NE PERD DE CONTRASTE : le profil ne pilote
                   que l'ambiante, qui ne touche que le sol. Barre de PV,
                   marqueurs et annonces vivent sur `#cv` et dans le HUD DOM.
                   Le champ d'atmosphere du boss est le SEUL qui traverse le
                   centre : il annonce ce qui s'y trouve.
                   `pasBoss()` avance meme sans tampon de lumiere — le vignettage
                   le lit aussi, et il vit a tous les paliers.

     0.16.7 lot 7  UNE MAP DOIT RESSEMBLER A SON NOM. Le semis du lot 2 partageait
                   huit props entre les trois biomes, reponderes : un sol d'usine
                   et un sol de fonderie recevaient les memes plaques et les
                   memes cables, donc les trois etaient interchangeables.
                   Six props communs — honnetement industriels, ils valent
                   partout — plus un jeu PROPRE a chaque biome, qui porte son
                   verbe. L'Usine FABRIQUE : convoyeurs, caisses cerclees, allees
                   peintes. La Fonderie COULE : rigoles en fusion, lingots
                   coules, croutes de scorie. La Friche a ETE ABANDONNEE, elle
                   garde le sien.
                   UNE ALLEE N'EST PAS UN AVERTISSEMENT : deux lignes continues
                   et pales, pas des hachures. Un marquage hachure se lit comme
                   un telegraphe, et le sol en porte deja.
                   TROIS LUMIERES, TROIS COMPORTEMENTS : un tube mort GRESILLE
                   (il tient, faiblit, revient d'un coup), un voyant RESPIRE, du
                   metal en fusion ONDULE sans jamais s'eteindre. Le comportement
                   dit la matiere mieux que la couleur. Un prop emissif declare
                   donc son rayon ET sa teinte — `PROP.fonte` est le seul ton du
                   depot plus chaud que l'ambre de signal, et il ne sert qu'a de
                   la matiere en fusion.
                   LA COULEE DE LA FONDERIE NE DEPENDAIT QUE DE L'USURE : en mode
                   calme il n'en restait AUCUNE et le sol etait celui d'un
                   couloir. C'est le LIEU qui la decide, pas la difficulte — un
                   plancher de scorie, de croute et de brique refractaire existe
                   a tous les modes, l'usure ne fait qu'en ajouter.
                   L'USINE TRANSPORTE : deux paires de traces de roulage
                   traversent la tuile de bout en bout. Une usure DIRECTIONNELLE
                   est ce qui separe un sol d'atelier d'un sol de couloir.

     0.16.8 lot 8  LA NEBULEUSE, quatrieme biome. Ajoutee EN FIN de `BIOMES` —
                   la table est append-only, son index circule dans l'instantane
                   et sur le reseau. Le tirage lit `BIOMES.length`, donc elle
                   entre en rotation sans qu'une ligne de serveur bouge.
                   AUCUN DANGER NEUF : elle recompose les cinq. En apesanteur
                   c'est le FREINAGE qui manque, donc le champ de ralentissement
                   devient un puits de gravite ; le sol glissant EST l'apesanteur ;
                   la braise est un debris incandescent qui traverse la travee.
                   Meme regle, memes chiffres, aucune surface de simulation neuve.
                   `verifierBiomes()` muet sur 4 biomes x 3 modes x 4 graines :
                   surfaces sous budget, calme sans danger, normal sans danger qui
                   blesse, coeur traversable, aucun danger pose sur un obstacle.
                   30 s simulees aux trois difficultes, rien ne leve.
                   LE SEUL SOL QUI SOUSTRAIT. Les trois autres tuiles POSENT des
                   couches translucides sur la couleur d'arene ; celle-ci peint un
                   pont presque opaque puis en RETIRE les baies (`clearRect`), et
                   c'est par ces trous que le vide se voit. On marche sur un
                   plancher, jamais sur le vide — un sol transparent aurait rendu
                   la lecture des positions impossible.
                   0,93 et non 1,0 : la teinte de mode traverse encore, sinon le
                   pont serait identique en calme et en cauchemar. Les baies
                   tombent sur la maille de 5 m et les joints se dessinent APRES :
                   ils deviennent les meneaux du vitrage au lieu de les
                   contredire.
                   `drawFond()` est le SEUL arriere-plan du jeu, et il n'existe
                   que pour un biome qui declare `fond`. DEUX PARALLAXES, parce
                   qu'un fond a une seule vitesse est un autocollant : astres a
                   0,05, etoiles a 0,16, deux `drawImage` par image. La derive
                   maximale sur cette arene est de 256 px et la marge cuite en
                   fait 300 — rien a boucler.
                   Les etoiles sont groupees par PALIER DE CLARTE : trois `fill`
                   pour 765 etoiles. Un `arc` par point aurait coute autant de
                   chemins que de pixels. Un astre sans TERMINATEUR est un disque :
                   le croissant sombre coute un second arc en `destination-out`.
                   PAS DE RAINBOW NEON : quatre teintes de nebuleuse, deux froides
                   une violette une chaude, toutes sous 22 %. `PROP.balise` est le
                   seul cyan du decor et il ne sert qu'a une balise d'arrimage —
                   la station eclaire en chaud, elle se signale en froid.

     0.16.9 lot 9  L IDENTITE DE TIR. Une arme ne se reconnait pas a sa fiche,
                   elle se reconnait a ce qu'elle projette — et cinq d'entre
                   elles partageaient la meme capsule.
                   LA PORTEE DU LASER SORTAIT DE L ECRAN A TOUS LES COUPS : la
                   vue fait 1600 px, le joueur en voit 800 devant lui, le
                   faisceau en parcourait 1536. Une portee dont on ne voit jamais
                   la fin EST une portee illimitee, quoi qu'en dise la table.
                   0,9 (43 m) la fait tomber juste au-dela du demi-ecran, et un
                   TERMINUS la dessine meme quand rien n'est touche : elle
                   s'apprend en la voyant s'arreter, sans qu'on l'ecrive.
                   LA CHALEUR NE MONTAIT QUE SI L ON TOUCHAIT, donc tirer dans le
                   vide etait gratuit et la jauge ne se remplissait que dans les
                   moments ou le joueur gagnait deja — jamais dans ceux ou il
                   aurait appris qu'elle existe. Elle monte desormais tant que le
                   faisceau est ACTIF, a deux regimes (4,2 s en contact, 7 s a
                   vide) pour ne pas punir la couverture de zone. MESURE : le
                   laser passe de V 1,187 a 1,083 pour une cible de 1,06, donc
                   DANS la fourchette pour la premiere fois.
                   UN FAISCEAU CONTINU N A PAS D INSTANT DE DEPART, il apparait.
                   L'allumage lui en donne un — 90 ms plus large et plus clair —
                   et il revient a chaque sortie de saturation, seul moment ou le
                   tir s'interrompt. L'impulsion a ete REFUSEE : elle aurait fait
                   du laser un railgun rapide et rendu la chaleur sans objet.
                   LA RAMPE DE L ASSAUT SE LIT DANS LES BALLES. Elle n'existait
                   que comme un anneau autour du personnage — une jauge
                   d'interface pour une mecanique qui doit se voir dans le tir.
                   La gerbe s'ouvre a ASSAUT_DISPERSION x (1 - armeRes), ~9 deg
                   a rampe nulle, tir chirurgical a rampe pleine. AUCUN ETAT
                   NEUF : armeRes portait deja exactement la bonne valeur.
                   Ce n'est pas un habillage : l'exigence de VISEE monte de 0,5 a
                   1 (choisir entre tirer et bouger), donc D passe de 2,0 a 2,5
                   et la cible de 1,06 a 1,08. MESURE : V tombe de 1,046 a 0,926,
                   et la compensation porte sur le NOMINAL — seul terme que la
                   dispersion n'ait pas touche — 6 -> 7 rend 1,050.
                   SEPT SILHOUETTES DE PROJECTILE, une par mecanique de
                   delivrance : capsule (standard x1,0, assaut x0,85), grain rond
                   (dispersion x0,7), aiguille (railgun x1,6), baril en ROTATION
                   (grenade x1,3), obus court et epais (siege x1,4), trait fin a
                   longue trainee (precision x0,8). Forme ET taille se DEDUISENT
                   de l'arme du proprietaire : le tuple d'une balle porte deja
                   son proprietaire, et le tuple du joueur son arme. AUCUNE CLEF
                   D INSTANTANE NE S OUVRE — la table est cuite une fois depuis
                   ARMES, donc le tir standard, de loin le plus nombreux, ne
                   grossit pas d'un octet.

     0.16.10 lot 10 LE TISSEUR N A PAS DE GRAPPES, il a des NOEUDS — le jeu les
                   dessinait comme des grappes et annoncait une eclosion qui
                   n'arrivait jamais. Le joueur lisait « DETRUIS la grappe avant
                   l'eclosion », echouait, ne voyait rien eclore, et en concluait
                   correctement qu'il n'avait pas compris. LE JEU LUI MENTAIT
                   DANS LA SEULE PHRASE QU IL LUI ECRIVAIT.
                   MECH_CLUSTER N EST PAS SEPARE, et c'est delibere : deux
                   mecaniques d'occupation ne doivent pas tourner ensemble, donc
                   le partage du creneau est correct. Ce qui devait diverger est
                   ce que le joueur LIT et ce qu'il VOIT. `variantes` porte le
                   seul libelle — ni le niveau, ni la forme, ni le creneau, ni le
                   comptage ne se redeclarent — et le SILENCE s'en souvient PAR
                   VARIANTE : avoir vu une grappe n'apprend rien sur un noeud.
                   La grappe hative (repli solo de `_atkPrison`) prend la sienne :
                   deux fois moins de temps sans aucun signe que l'urgence
                   differe etait le meme defaut, un cran plus bas.
                   L EMPREINTE FAIT TOUT LE TRAVAIL. Un cercle de NOEUD_R en
                   pointilles fins, sous le noeud, DES SON APPARITION : le joueur
                   voit la place qu'il va perdre, a l'echelle reelle, pendant les
                   9 s ou il peut encore l'empecher. Une mecanique dont on montre
                   la consequence AVANT qu'elle arrive n'a plus a etre expliquee.
                   Des amarres vers le boss disent qui tisse.
                   LA ZONE NAIT DE L EMPREINTE au lieu d'apparaitre : le
                   pointille s'epaissit et se remplit, donc la cause reste
                   visible pendant la transition. A la destruction l'empreinte se
                   RETRACTE vers le centre — le Tisseur est le seul boss ou le
                   joueur repare l'arene, ca doit se voir se refermer.
                   LE CLIENT SAIT POURQUOI UN NOEUD A DISPARU SANS QU ON LE LUI
                   ENVOIE : detruit, il s'en va avec du temps au compteur ; tenu
                   jusqu'au bout, il s'en va a zero. Un onzieme champ sur le
                   marqueur (`m.noeud`), ajoute EN FIN de tuple, suffit a tout.

     0.17.1 lot 1  LA CHARTE DE LIEU. Premier lot du plan 14, dont le constat
                   tient en une mesure : apres `teinter()`, qui preserve la
                   luminance de la base, LES QUATRE ARENES TENAIENT DANS 15
                   NIVEAUX RGB SUR 255. Quatre sols a 6 % l un de l autre ne sont
                   pas quatre lieux, et aucune quantite de props ne rattrape ca.
                   Un biome declarait sa couleur a TROIS endroits — `tint` et
                   `grid` dans `biomes.js`, son ambiante dans `LUM` — et son bloc
                   a AUCUN : les quatre partageaient `BIOME.block`. Les deux
                   moities se neutralisaient.
                   `BIOME_SKIN` est desormais le SEUL endroit ou un lieu se
                   declare : arene, grille, bloc, ambiante, direction de lumiere,
                   emissif. La couleur est ECRITE et non derivee, et le mode ne
                   fait plus qu un FACTEUR DE CLARTE (`solDeBiome`) releve sur
                   `DECOR` — il assombrit, il ne teinte plus. C est la seule
                   facon d avoir a la fois trois modes et quatre lieux.
                   `teinter()` n a plus de lecteur : il est supprime, pas garde.
                   `BIOMES[].tint`, `.grid` et `.skip` avec lui — `.skip` etait
                   deja mort, la grille fine lit `DECOR`.
                   `ledDe()` porte sa TEINTE : la bande d un bloc s allume a
                   l emissif du lieu, donc la Nebuleuse s eclaire froid.

     0.17.2 lot 2  L ARCHITECTURE. La masse a l ecran est l OBSTACLE, et les
                   quatre biomes partageaient UNE silhouette (seul le chanfrein
                   changeait) et UN habillage (tole striee + bande LED). Quatre
                   sols differents sous quatre memes blocs donnent quatre memes
                   maps — le semis de props ne rattrape pas ca.
                   `render/blocs.js`, entre `props` et `lumiere` : quatre formes
                   et quatre matieres. La machine est PANNEAUTEE (panneau creuse,
                   nervures, pupitre a trois voyants, boulons), le four est
                   MACONNE (rangs de brique en quinconce, tirants rivetes, gueule
                   incandescente et sa suie), la ruine est FISSUREE (crete
                   brisee, fers a beton qui depassent, fissures qui se divisent,
                   percement, coulures de rouille, lichen au pied), la travee est
                   AJOUREE (croisillon, cadre, feux de position qui courent).
                   LA SILHOUETTE REMPLIT SON RECTANGLE, et ce n est pas
                   negociable : la collision est une AABB repoussee par axe, donc
                   une forme qui rentre ses coins fait buter le joueur sur du
                   vide. Toute la difference se joue DANS l empreinte.
                   `ledDe()` demenage avec le bloc et porte desormais sa TEINTE,
                   son RAYON et son TYPE — bande, gueule, feux, tube. La gueule
                   du four eclaire deux fois plus loin et deux fois plus fort que
                   la bande d une machine, la friche n a presque plus rien
                   d allume : elle a ete abandonnee.
                   `gfx` garde ses CINQ points de lecture — `blocs.js` n en est
                   pas un, c est `decor.js` qui coupe l habillage en `low`.

     0.17.3 lot 3  LES DANGERS DIEGETIQUES. Un danger etait un disque ambre
                   hachure, le meme dans les quatre lieux : un element de debug
                   pose sur la map, pas un objet du monde. Le gameplay ne bouge
                   pas d un chiffre — rayons, degats, ralentissements, collisions
                   sont intacts. Le DISQUE RESTE, il devient invisible.
                   `render/dangers.js` porte une table `(biome, kind) -> dessin`,
                   et ajouter un danger a un lieu est desormais UNE entree. Seize
                   representations : gravats, boue, flaque toxique et cable sous
                   tension pour la Friche ; convoyeur qui defile, huile, jet de
                   vapeur et chariot sur rail pour l Usine ; scorie aux fissures
                   rouges, coulee en fusion, louche sur rail et grille chaude pour
                   la Fonderie ; puits de gravite, dalles en apesanteur, champ de
                   radiation, debris plasma et anomalie pour la Nebuleuse.
                   TROIS REGLES TIENNENT LA LISIBILITE. L empreinte reste lisible
                   au bord pres — chaque dessin ferme sur une `limite()` franche a
                   `h.r`, jamais un degrade qui s eteint : un danger dont on ne lit
                   pas le bord est injuste. Un danger s annonce par sa GEOMETRIE
                   PERMANENTE et jamais par un clignotement — le canal du
                   telegraphe appartient au boss, donc ce qui bouge ici est de la
                   matiere : un flux, une vapeur, une etincelle. Enfin ce qui
                   blesse est chaud et ce qui ralentit est froid, seule constante
                   entre les quatre lieux, et c est elle qui rend la table
                   extensible sans reapprentissage.
                   Les dangers a phase gardent leur double etat : au repos on voit
                   l INSTALLATION (la buse, le cable mort, la grille de fonte), et
                   c est elle l annonce ; a l amorce le jet, l arc ou la chaleur
                   montent avec `st.k`.

     0.17.4 lot 4  LA COMPOSITION. Les quatre implantations etaient quatre semis
                   de rectangles dans la meme gamme de taille : un espace
                   uniformement encombre, donc sans dense ni ouvert, donc sans
                   rythme. Une arene se traverse, elle ne se pietine pas.
                   Chaque lieu a maintenant SA loi d implantation. L Usine pose
                   des BANDES — chaine, allee, chaine — longues, minces,
                   orthogonales. La Fonderie pose DEUX MASSES et un couloir entre
                   elles : cinq objets par vue au lieu de six, mais 6,8 % de
                   surface contre 4,2 %, et c est exactement le contraste
                   recherche. La Friche pose DEUX CHAMPS DE RUINES et laisse du
                   terrain nu au milieu — dix objets par vue, tous petits. La
                   Nebuleuse pose de TRES LONGUES TRAVEES et des passages francs.
                   Les dangers suivent l architecture au lieu de la doubler : la
                   louche de la Fonderie court dans le couloir ENTRE les deux
                   fours, les jets de vapeur de l Usine tombent dans les allees,
                   les flaques de la Friche s installent dans les gravats.
                   Chaque lieu recompose les cinq dangers, aucun n en invente :
                   memes rayons, memes degats, meme horloge. La Fonderie et la
                   Friche gagnent un GEYSER — grille chaude et cable sous tension
                   — la Nebuleuse une FLAQUE, qui y est un champ de radiation.
                   VERIFIE : `verifierBiomes()` muet sur 200 graines. Plafonds de
                   surface tenus, aucun danger pose sur un obstacle malgre les
                   40 px de gigue de la Friche, carre central traversable dans
                   les deux axes pour les quatre lieux et les trois modes.

     0.17.5 lot 5  LE SOL, LE FOND, LE BORD. Trois couches partagees restaient,
                   et elles suffisaient a rendre les quatre lieux cousins.
                   LE SOL. La Friche perd la maille de 5 m — `cuire()` la saute
                   pour elle : un joint technique regulier decrit une
                   installation entretenue, et ce lieu n en est plus une. A la
                   place, des JOINTS DE COULAGE irreguliers (sinus de periode
                   entiere sur la tuile, donc raccordes d une tuile a l autre),
                   une valeur par dalle, des fissures qui partent des joints et
                   jamais du milieu d une dalle, de la vegetation qui ne pousse
                   QUE dans les joints, et des flaques mates sans reflet.
                   La Nebuleuse perd la maille aussi et gagne un NID D ABEILLE :
                   ses baies deviennent des CELLULES retirees en
                   `destination-out` — un hexagone ne se `clearRect` pas, et
                   c est justement ce qui l empeche de redevenir un rectangle.
                   La Fonderie gagne ses VOIES coulees dans le sol, traverses
                   comprises, et des ZONES VITRIFIEES : la ou le metal est tombe,
                   le sol a fondu puis refroidi en verre — la seule surface du
                   depot plus sombre que le fond.
                   LE FOND. Une BANDE de nebuleuse traverse toute l image en
                   diagonale : elle donne l echelle parce qu elle ne tient pas
                   dans l ecran, la ou un amas de taches de meme taille se lisait
                   comme du bruit. Elle DERIVE — 8 px sur deux minutes, assez
                   pour qu elle cesse d etre un autocollant, trop peu pour
                   attirer l oeil en combat. La derive ne touche que la couche
                   lointaine : les etoiles proches restent fixes, sinon c est le
                   vaisseau qui semblerait tanguer.
                   LE BORD. Les memes colonnes grises dans les quatre biomes
                   etaient la derniere piece qui les rendait interchangeables
                   jusque dans les marges : passerelle et conduites a l Usine,
                   cheminees et fumee a la Fonderie, grillage affaisse a la
                   Friche — la seule silhouette des quatre qui ne tienne pas
                   droit — haubans et antennes dans le vide. Meme budget de
                   dessin, quatre lectures, et les trois regles du premier plan
                   tiennent : rien au centre, jamais opaque, coupe pendant un
                   boss.

     0.17.6 lot 6  LES REGLES ECRITES, ET DE QUOI LES VERIFIER. `RENDU.md` portait
                   encore les regles d avant le plan 14 : une seule silhouette,
                   un seul habillage, des baies sur la maille de 5 m. Quatre
                   sections nouvelles — quatre lieux pas quatre couleurs, la
                   masse batie, un danger n est pas un cercle, la composition —
                   et le critere de non-regression ECRIT : si on echange les
                   quatre noms et que les captures restent difficiles a
                   attribuer, le travail n est pas fini.
                   `BIOME=<cle> GRAINE=<n>` forcent le tirage d une salle, POUR
                   LES TESTS UNIQUEMENT, meme statut que `ROOM_GRACE_MS` et
                   `ROOM_MAX`. Sans ca, comparer quatre lieux demande de relancer
                   des salles jusqu au bon tirage — le genre de protocole qu on
                   finit par ne plus faire, donc le genre de verification qui
                   n a plus lieu.

     0.18.1 lot 1  LA FICHE ET LA VOIX. Premier lot du plan 15, dont le constat
                   tient dans un `break` : `diffSnapshots` s arretait a la
                   PREMIERE balle neuve d un instantane et poussait un `tir`
                   anonyme. Dix armes, quatre joueurs, UN SEUL SON generique
                   toutes les 50 ms — l identite sonore d une arme n etait pas
                   mal reglee, elle etait STRUCTURELLEMENT IMPOSSIBLE.
                   `shared/feedback.js` : la fiche de retour d une arme, module
                   pur sur le modele de `palette.js`. Ce qu une arme VAUT reste
                   dans `armes.js`, ce qu elle DIT vit ici, et la famille se
                   DEDUIT des champs de mecanique — meme idiome que
                   `silhouetteArme()` et `canonEffet()`. Une onzieme arme herite
                   d un retour coherent sans une ligne de table.
                   TROIS FAMILLES NE SONNENT PAS AU DEPART, et c est une decision :
                   le faisceau est une boucle, l arc du tesla sonne par l effet 3,
                   le balayage de la lame par l effet 17. Leur donner un son de
                   depart le doublerait.
                   LOBEE ET DIRECTE NE SONNENT PAS PAREIL : grenade et siege
                   saturent tous deux le poids, donc l echelle ne pouvait pas les
                   separer. Le depot les separait deja a l image — le baril
                   TOURNE, l obus vole DROIT — il ne manquait que la voix.
                   LE POIDS D UN COUP EST SA CADENCE, releve sur `interval` et
                   jamais declare : hauteur, gain et duree de queue en sortent. Un
                   echantillon de 260 ms rejoue neuf fois par seconde etait un
                   mur ; il est desormais coupe a la cadence qui l appelle.
                   `tir` porte `owner` et `n`, RIEN NE CIRCULE EN PLUS : le
                   proprietaire voyage deja dans le tuple de la balle et son arme
                   dans le sien. Une balle neuve loin de son proprietaire n est
                   pas un depart — c est une scission a 260 px ou une tourelle —
                   donc seule la naissance a la bouche compte.
                   UN ALLIE SONNE PLUS BAS QUE SOI (0,55) : sans cet ecart, a
                   quatre joueurs on n entend plus SON arme.
                   `bu.heal` supprime : sa seule lecture etait morte depuis que le
                   soin est un arc, le tuple de balle ne porte pas ce champ.
                   MESURE, 8 min, 4 joueurs, mode normal : quatre armes
                   differentes montent de 1 012 a 1 165 sons pour un pic de 5 voix
                   sur 16, zero volee ; quatre fois la MEME arme rapide emet 2 678
                   evenements et rend exactement 805 sons, le compte d avant. Le
                   pire cas est gratuit, seule la difference se paie.

     0.18.2 lot 2  LE DEPART DU COUP. `grep -rn "muzzle|bouche|recul" public/`
                   rendait ZERO LIGNE : un projectile apparaissait a 16 px du
                   corps, et c etait le seul evenement du jeu sans depart. Canal
                   absent, pas canal mal regle — comme l eclair de touche du boss.
                   ELLE EST ATTACHEE AU CANON, PAS AU MONDE. Le tir est
                   enregistre par proprietaire et trace a la position RENDUE, dans
                   l axe ou le joueur pointe : une position monde figee
                   decrocherait du personnage des qu il bouge, et c est le
                   decrochage qui se voit, pas les 50 ms de retard de visee.
                   C est aussi pourquoi l evenement `tir` NE PORTE PAS d angle :
                   un champ dont le lecteur contredit la valeur ne vaut rien.
                   23 px, MESURE sur les trois traces de classe — tireur 24,
                   rempart 23, soigneur 21. Un seul nombre, l ecart ne se voit pas.
                   LA FORME SE LIT SUR LA FAMILLE et non sur un champ de la fiche :
                   aiguille et rails en travers pour le rail, trois lobes pour la
                   gerbe, bouffee RONDE pour le tube lobe, cone plus anneau de
                   pression pour l obus, claquement court et barre pour le
                   balistique. Elle NAIT A SA TAILLE MAXIMALE, meme regle que le
                   noyau d un souffle.
                   LE RECUL EST VISUEL ET RIEN D AUTRE : la position simulee ne
                   bouge pas d un pixel — un retour de tir qui deplacerait le
                   personnage serait du gameplay decide par le client. Il porte le
                   SPRITE et son liseré, jamais les anneaux : meme partage que le
                   tressaillement d un ennemi touche, le corps encaisse a
                   l interieur de son aura. Decalage ET ecrasement dans le meme
                   axe — un decalage seul se lit comme une desynchronisation.
                   LA DOUILLE est le seul debris du jeu qui ne vienne pas d une
                   destruction : elle sort sur le cote et elle tourne, et c est ce
                   qui rend l arme mecanique.
                   Les trois memes familles n ont pas de bouche que celles qui n
                   ont pas de son, et pour la meme raison : leur depart existe
                   deja (allumage du faisceau, origine de l arc, balayage).
                   BUDGET : 3 a 8 particules par tir, ~98 vivantes en regime a 4
                   joueurs sur les 3 000 du chemin WebGL. Le chemin 2D plafonne a
                   300 — la bouche y prendrait un tiers du budget et affamerait
                   les morts, qui sont le palier au-dessus : un canon, la moitie
                   des etincelles, une bouffee. Aucune sixieme lecture de `gfx`.

     0.18.3 lot 3  L IMPACT SAIT D OU VIENT LE COUP. Il le deduisait du JOUEUR LE
                   PLUS PROCHE : un tir allie venu de l autre bout de l ecran
                   envoyait ses etincelles a 180 degres du bon axe. Or `auteurDe`
                   retrouvait deja la balle, il jetait sa direction.
                   UN PROJECTILE PERFORANT NE MEURT PAS SUR SA CIBLE : railgun et
                   precision traversent, aucune balle ne s eteint, donc 38 % des
                   impacts n avaient AUCUN auteur — dont tous ceux de l arme la
                   plus directionnelle du jeu. Une balle survivante qui passe pres
                   du coup l explique aussi bien, et sa direction est exacte. Les
                   eteintes passent d abord : morte la vaut mieux que passee par
                   la. MESURE : 38 % -> 8,6 % sur les vraies touches.
                   L axe d une balle eteinte se lit sur la LIGNE DE TIR et non sur
                   son dernier pas — des centaines de pixels au lieu de trente, et
                   ca reste juste quand la balle meurt sur le corps.
                   UN TICK DE BRULURE N EST PAS UNE TOUCHE, et le serveur le disait
                   deja : `_damage(..., overTime)` n incremente pas `hitSeq`. Le
                   client ecrasait l information avec `Math.max(1, hits)`. MESURE,
                   4 graines x 12 min, 4 joueurs : sur 92 968 evenements d impact,
                   75 651 — 81 % — sont du degat CONTINU. Ils rendaient l eclair
                   blanc, le recul directionnel, deux etincelles et une voix, pour
                   un poison. Ils gardent un eclair, ils perdent le reste.
                   Cet eclair ne peut pas disparaitre : RIEN ne rend l etat
                   « brule » sur un ennemi, la brulure n est pas dans l instantane,
                   donc il est la SEULE information. Il passe au VIOLET — la
                   grammaire de couleur dit deja persistant — et cesse de se lire
                   comme un ennemi qu on frappe en continu.
                   QUATRE PALIERS, DECIDES PAR LA CIBLE. La part de PV max retiree
                   dit la puissance du coup ET la masse de ce qui l encaisse : le
                   meme rail rend LOURD sur un fantassin et LEGER sur un colosse,
                   donc « un ennemi lourd reagit moins » sort du meme nombre, sans
                   table de masse. Seuils 0,25 et 0,60, RELEVES : sur 17 317 vraies
                   touches la part vaut 0,3 % a la mediane et 16,3 % au p90, et les
                   deux seuils decoupent 93 / 5 / 2 %, soit 31,7 / 1,7 / 0,53 par
                   seconde. Le cone se resserre quand le coup porte.
                   LA BOUCHE DIT L ARME, L IMPACT DIT LE COUP : l identite voyage
                   deja par le depart, la silhouette et la voix. Un quatrieme axe
                   sur un evenement a 34 par seconde serait invisible.
                   LA POUSSIERE EST DE LA MATIERE DU LIEU, et le lieu la declare
                   deja : `skin().blocEdge` rend le beton lave de la Friche, la
                   tole peinte de l Usine, la fonte brulee de la Fonderie, le
                   composite froid de la Nebuleuse. Aucune table de plus. Elle part
                   A CONTRE-SENS et lentement — les etincelles disent ou va
                   l energie, la poussiere ce qui s est detache.
                   `impactLourd` prend la place de la touche dans le limiteur, avec
                   `claim` : sans lui les 31,7 touches legeres par seconde le
                   refusaient. Zero voix de plus.
                   BILAN MESURE : particules d impact 67,8/s -> 21,3/s (-69 %),
                   voix de touche 2,7/s -> 1,2/s (-55 %), pointe 2 voix sur 16.
                   Trois paliers, un axe juste et la matiere du lieu coutent MOINS
                   que ce qu il y avait avant.

     0.18.4 lot 4  LA MORT DIT DE QUOI C ETAIT FAIT. `DEATH_BURST` distinguait
                   deja neuf types par le nombre, la taille et la vitesse ; les
                   neuf partageaient la meme CASE d atlas et le meme son. Or un
                   eclat anguleux qui tournoie ne peut pas dire « poche qui
                   creve », et les trois cases de particule sont dans l atlas
                   depuis le plan 13 : le canal existait, il n etait pas branche.
                   CE QU UNE CREATURE EST FAITE SE DEDUIT DE CE QU ELLE FAIT.
                   Aucun champ neuf dans le bestiaire : celle qui SE DIVISE est un
                   sac (`splits`), celles qui SOIGNENT ou PORTENT UNE AURA
                   tiennent de l energie (`heal`, `auraRadius`), les six autres
                   ont une carapace. Trois regles, cuites une fois.
                   L axe est la MATIERE et non le metal contre l organique : la
                   charte dit que l arene est une machine et que les monstres sont
                   ce qui s y est introduit. Il n y a pas d ennemi en tole.
                   LA HAUTEUR DISAIT L INDEX. `1.3 - type * 0.12` notait l ordre
                   d arrivee dans la table : le coureur, plus petit corps du
                   bestiaire, sonnait plus GRAVE que le fantassin, et le colosse
                   plus AIGU que le couvain — l inverse de ce qu on voit. Elle dit
                   desormais la MASSE, relevee sur `r`, qui etait deja la.
                   L elite garde un cran a lui : c est un fait notable, et un fait
                   notable se distingue par la hauteur. `ELITE_RADIUS_MUL` vaut
                   1,18, trop peu pour s entendre seul.
                   LES TROIS TIMBRES PARTAGENT LA CLEF `mort` : le palier 1 porte
                   sur la CADENCE des morts, pas sur la mort, donc trois recettes
                   ne coutent pas trois places.
                   LE SOIGNEUR ET LE CHOEUR PRENNENT LA PLACE (`claim`). L un rend
                   la horde increvable, l autre lui donne 35 % de reduction : leur
                   chute est une information tactique. Ils n existent QUE en
                   cauchemar — roster `[0..8]` contre `[0..6]` en normal — et
                   seulement apres la minute 19 : le cout est nul ailleurs.
                   MESURE, cauchemar, bestiaire force, 32 min : 86 % carapace,
                   5 % organique, 9 % energie. 36 % des morts d energie
                   s entendent contre 28 % pour la horde, pour +4 % de voix et une
                   pointe de 4 sur 16. Zero particule de plus : seuls la case, la
                   rotation, la croissance et l opacite changent.
                   `spawnBlast` N A PAS BOUGE, et c est une verification, pas un
                   oubli : le kamikaze ne passe pas par `_explode` mais par une
                   ZONE telegraphiee (`warn: blastDelay`), donc son souffle a deja
                   sa signature — craquelures, couleur hostile, evenement
                   `explosion` mis a l echelle du rayon. Aucune famille de souffle
                   d ennemi a ajouter.

     0.18.5 lot 5  TUER UN BOSS NE PRODUISAIT RIEN. `_killBoss` met `this.boss` a
                   `null` et n emet aucun effet, aucune zone, aucun son : le corps
                   disparaissait entre deux images. Le seul moment de palier 3 du
                   jeu sans aucun budget, et c est celui que la manche prepare.
                   Le client le deduit de l ABSENCE, donc zero octet : le boss a
                   disparu et il etait sur sa DERNIERE barre. La garde compte —
                   sans elle, la remise a zero de manche, l autre endroit ou
                   `this.boss` passe a `null`, se lirait comme une mort.
                   VERIFIE : 4 500 s, 3 graines, 38 barres brisees, 9 boss tues,
                   9 evenements emis. Aucun faux positif, aucun manque.
                   CINQ ECHEANCES ET C EST L ETALEMENT QUI FAIT L EVENEMENT :
                   souffle et cassure a 0, anneaux a 90 / 200 / 360 / 620 ms qui
                   s elargissent et RALENTISSENT, debris a 200, fumee a 360, queue
                   grave a 620 — elle arrive quand l image est finie. Tout au meme
                   instant n aurait fait qu un flash.
                   Le hitstop appartient aux barres de boss ; la DERNIERE en est
                   une, et c est la seule qui n en avait pas parce que `_killBoss`
                   n emet pas `barre`.
                   REGRESSION DU LOT 3 CORRIGEE : l evenement d impact d un boss ne
                   porte pas de `hits` — il n y a pas de `hitSeq` sur un boss —
                   donc `palierDe` le classait CONTINU et le rendait MUET depuis
                   0.18.3. Le boss sort desormais en premier et par un chemin
                   complet : deux baremes, deux chemins.
                   LA TOUCHE D UN BOSS SE MESURE EN PART DE BARRE, et elle etait
                   PLATE : le meme eclair de 80 ms pour un tick de brulure et pour
                   un rail, sur la seule cible qu on regarde en continu. MESURE,
                   12 694 instantanes ou le boss perd des PV : la part d une barre
                   par pas de 50 ms vaut 0,01 % a la mediane, 1,14 % au p90,
                   4,22 % au p99. Plein a 2 %, plancher a 0,25, et LA RACINE — en
                   lineaire 82 % des touches tombaient sur le plancher et tout le
                   milieu du bareme etait vide. La racine rend 62 / 0,41 / 0,76.
                   L eclair dure 73 ms a la mediane et 140 ms au p99, contre 80 ms
                   fixes. Meme grammaire de son que la horde, meme clef.
                   LE CRITIQUE N ETAIT PAS DILUE, IL ETAIT ABSENT : `spawnCritShards`
                   sortait a CHAQUE coup sur le boss, vingt fois par seconde, donc
                   un critique ressemblait exactement a un coup ordinaire. Les
                   eclats ambres redeviennent le signe du critique ; le coup
                   ordinaire garde deux traits blancs. `crit` remonte par
                   `bossDmg`, deja transporte.
                   PAS DE VOIX DE TOUCHE PAR ARME sur le boss, et c est un refus :
                   le joueur entend deja le DEPART de son arme a sa cadence, et
                   ajouter un timbre d impact assorti vingt fois par seconde
                   redirait la meme chose en remplissant le mix. Ce qui manquait
                   sur le boss n etait pas « quelle arme » mais « combien de barre
                   vient de partir ».

     0.18.6 lot 6  LES REGLES ECRITES, ET DE QUOI LES VERIFIER. Le plan 15 avait
                   cinq lots de code et aucune trace : `RENDU.md` ignorait la
                   fiche, la bouche, les paliers, la matiere et la mort du boss.
                   `verifierFeedback(armes, types, recettes)` croise les DEUX
                   tables avec ce qu `audio.js` expose. UN NOM DE RECETTE FAUX NE
                   LEVE RIEN : `playSound` rend `false` et l evenement devient
                   MUET — exactement la classe de bug que `CLAUDE.md` appelle
                   « silence ». Verifie en retirant `tirRail` : la garde crie.
                   La matiere d une creature DEMENAGE dans `shared/feedback.js`,
                   a cote de la famille d une arme : c est la meme question — ce
                   que le combat DIT — et c est ce qui permet de croiser tout le
                   vocabulaire sonore en une passe, sans charger le rendu.
                   `RENDU.md` gagne une section « Le combat » dont la premiere
                   ligne est la regle qui tient tout le reste : QUATRE CANAUX
                   DISENT QUATRE CHOSES DIFFERENTES. La bouche dit l arme, le
                   projectile ce qu elle envoie, l impact ce que ca a coute a la
                   cible, la mort de quoi c etait fait. Ajouter l arme a l impact
                   c est payer deux fois pour une information.
                   DEUX REGLES ECRITES ETAIENT FAUSSES.
                   1. `fx` n avait pas `PARTICLE_MAX` pour point de lecture de
                   `gfx` : son seul `gfx` est l OMBRE DE CONTACT. `PARTICLE_MAX`
                   suit le RENDERER (300 en 2D, 3 000 en WebGL), et c est correct
                   — un plafond mesure le cout PAR particule, dix fois plus eleve
                   sur un chemin ou chaque fragment est un `fill`. Les deux axes
                   sont independants et doivent le rester.
                   2. Le hitstop n appartenait qu aux barres de boss. La MORT est
                   la derniere barre ; elle n en avait pas parce que `_killBoss`
                   n emet pas `barre`, pas parce qu elle n y avait pas droit.
                   `?perf` sort desormais `frag/PLAFOND` — un compteur de
                   particules sans son plafond ne dit pas si on sature, et c est
                   la seule question qu il pose — le nombre d effets vivants
                   (souffles, depouilles, bouches, echeances, touches en attente),
                   les balles, et les refus et vols de voix. Deux lignes :
                   `#hudPerf` est deja en `pre-line`.
                   `LISEZMOI.md` porte les chiffres des six lots ET LE PROTOCOLE,
                   avec ses trois pieges deja payes : un bot maison rend 54
                   impacts la ou `pilotage()` en rend 1 590 ; une fenetre de 12
                   minutes ne voit jamais deux des trois matieres ; le soigneur et
                   le choeur n existent qu en cauchemar, donc les mesurer en normal
                   rend zero et zero ressemble a un bug.

     0.18.7 correctif de jeu : trois retours de table.
                   LE TESLA N AVAIT JAMAIS PAYE SON ECART. Releve a 1,40 pour
                   une cible de 1,02 en 0.15.9 — « masque par la sur-attribution
                   des autres », donc jamais corrige. Il tenait dans la PORTEE
                   et la CADENCE, pas dans le coup : 41 -> 34 m et 0,30 -> 0,42 s
                   rendent 0,99 (5 graines x 10 min). Sur une arme qui enchaine,
                   toucher aux degats remonte les DEUX colonnes a la fois.
                   « PROSPECTEUR » COMPTAIT LE MAUVAIS EVENEMENT. `p.hf.harvests`
                   montait au ramassage d un FRAGMENT (carte « Recolte », 8 % des
                   morts) et jamais dans `_harvestYield` : qui cassait des cristaux
                   sans cette carte restait a zero. Il est credite la ou les
                   eclats le sont, a chaque joueur — un cristal vaut un point,
                   quel que soit l effectif. Le fragment ne compte plus.
                   UNE LIGNE COMMUNE SE COUPE. Les lignes de classe se
                   desequipent depuis toujours par les emplacements ; les
                   COMMUNES s appliquaient sans recours, donc `sursis` regenerait
                   chez qui voulait s en passer. `profile.communOff` est une liste
                   d EXCLUSION — le champ absent vaut TOUT ACTIF, aucun profil a
                   migrer — filtree dans `metaLinesFor`, seul point de lecture du
                   serveur, du HUD et de la fenetre de build.

     0.18.8        LE PERSONNAGE NE RECULE PLUS AU TIR. Essaye au lot 2, retire
                   apres essai en jeu : dans un survivor le corps du joueur est ce
                   qu on lit en permanence pour esquiver, et le faire bouger pour
                   une raison qui n est pas un deplacement le rend illisible — a
                   six tirs par seconde il ne revenait jamais au repos.
                   Le champ `recul` part avec, il ne se debranche pas : un champ
                   dont la seule lecture est morte se supprime. `reculDe()`,
                   `RECUL_MS` et la peremption qui les attendait disparaissent
                   aussi — la bouche s efface maintenant a sa propre duree.
                   Le depart se dit DEVANT le personnage, jamais sur lui, et
                   `RENDU.md` porte la raison pour que l essai ne se refasse pas.

     0.18.9 correctif : LE BOUTON NE FAISAIT RIEN, ET RIEN NE LE DISAIT.
                   `metaCommunOff` (0.18.7) avait son `case` dans `handleMeta` mais
                   pas son entree dans l aiguillage de `handleConnection`, qui
                   nomme les types `meta*` UN PAR UN : le message tombait dans la
                   branche salle, ou personne ne le connait non plus. Le clic
                   partait, la progression ne bougeait pas, aucune erreur nulle
                   part. Verifie bout en bout cette fois — faux `conn` sur un vrai
                   `createHub` : achat, coupure, remise, ligne non possedee refusee.
                   LA COUPURE SE LIT SANS LE BOUTON : la ligne passe en `.coupee`,
                   meme vocabulaire que `.banned` — nom barre, ligne en retrait. Un
                   etat porte par le seul libelle d un bouton se rate. Et la ligne
                   commune perd `.confort` : elle a des paliers ET deux boutons, donc
                   la grille a cinq colonnes, pas les trois qui la faisaient
                   replier depuis toujours.

     0.19.0 lot 1  LA GRILLE CESSE D ETRE UNIVERSELLE. Premier lot du plan 16,
                   dont le constat est que six elements transverses ecrasent tout
                   ce que le plan 14 distingue : quatre sols, quatre blocs, quatre
                   dangers, et par-dessus LE MEME plan technique — 400 px, lignes
                   droites pleine arene, une petite dizaine par vue, identiques au
                   pixel dans les quatre lieux.
                   Le pas de 20 m reste : c est la seule chose a l ecran qui serve
                   a lire une portee. Ce qui change est ce qui le PORTE. `GRILLE`
                   dans `decor.js` — l Usine garde le trait franc, c est le repere
                   auquel les trois autres se comparent ; la Fonderie l efface a
                   30 % et ne garde que les NOEUDS, sa matiere portant deja des
                   joints de plaque et une seconde trame faisant deux reseaux ;
                   la Friche n a plus qu un MARQUAGE peint et efface — trois
                   troncons par maille, un sur trois manquant, aucun dans l axe,
                   le pas se reconstruit d un troncon a l autre ; la Nebuleuse n a
                   plus de ligne du tout, le pas est porte par les NERVURES du
                   pont, une bande sombre et son cote eclaire lu sur `lumDir()`.
                   Elle n avait sinon QUE des reseaux — nid d abeille, puis trame
                   par-dessus : d ou la lecture « salle futuriste ».
                   ET LE LISERE DE BLOC DEVIENT UNE PROPRIETE DE LA MATIERE,
                   `contourDe()` : trace a 0,45 / 0,70 sur les quatre, il disait
                   « panneau usine » quelle que soit la couleur du sol dessous. La
                   Fonderie tombe a 0,16 / 0,26 et la Friche a 0,10 / 0,16 — un
                   four se lit a sa masse et a sa gueule, une ruine n a pas d arete
                   nette. Les couvertures destructibles gardent le leur, plein :
                   leur contour tirete dit des points de vie, il est du GAMEPLAY.
                   La FORME d un lieu n est pas dans le contrat de `low` : elle
                   vaut a tous les paliers, comme `silhouetteBloc` et comme la
                   palette d arene. Aucun point de lecture de `gfx` en plus.

     0.19.1 lot 2  LA NEBULEUSE ETAIT UNE SALLE BLEUE, ET SON COSMOS ETAIT
                   DESSOUS. `fondEspace()` existait depuis le plan 14 — bande de
                   nebuleuse, astres a terminateur, 765 etoiles en trois `fill` —
                   et ne se voyait pas : le plancher est peint a 0,93, et les
                   baies etaient trois hexagones de 41 px par tuile de 400, soit
                   4 % de la surface, DECOUPES DANS LE MOTIF donc repetes sur un
                   reseau de 400 px.
                   LA BAIE DEMENAGE ET DEVIENT UNE VERRIERE. Tiree par cellule de
                   nervure — meme pas que ce qui la borde, ce qui explique sa
                   place —, deux formats, et elle REDESSINE l arriere-plan a
                   pleine valeur au lieu de compter sur ce qui transparait.
                   Mesure : 20,0 % d arene ouverte, 18 a 25 % de la vue, onze
                   baies au pire. Vitree et non ouverte, et ce n est pas un
                   detail : un trou franc ment — le joueur le traverse, un
                   obstacle du biome peut tomber dessus et son ombre porterait
                   sur du vide. La verriere donne la meme image sans qu une seule
                   regle de deplacement bouge, donc rien a exclure du semis ni
                   des obstacles. Ombre de cadre tracee DANS le clip pour donner
                   au plancher son EPAISSEUR, meneaux pour l echelle.
                   TROIS PARALLAXES : le gaz entre a 0,10, cuit en
                   DEMI-RESOLUTION et etire au blit — une nappe floue n a pas
                   besoin d un pixel par pixel, et l etirement est le flou qu on
                   aurait paye. Sa bande CROISE celle du lointain. Nuages sombres
                   ajoutes : une nebuleuse sans masque d absorption est une brume.
                   Le scintillement ne se cuit pas — une couche cuite qu on fait
                   pulser fait pulser tout le ciel d un coup. Le blit passe par
                   SOUS-RECTANGLE : une baie de 300 px ne paie pas une image de
                   2 200. Les etoiles quittent la passe pleine vue, invisibles
                   sous un plancher a 0,93. `arena` descend a #06080f : a #0b1020
                   le ciel n avait nulle part ou etre plus sombre que le sol.

     0.19.2 lot 3  LA NEBULEUSE NE PARTAGE PLUS RIEN. Elle tirait CINQ props sur
                   douze dans le fonds commun — caillebotis, plaque, cable,
                   tuyau, coffret : de la quincaillerie terrestre posee au sol
                   d une station orbitale parce qu elle etait deja ecrite, la
                   seule justification qu un prop n a pas le droit d avoir. Cinq
                   props remplacent les cinq : EPAVE (fragment de coque anguleux
                   a nervure interne), VOILE (panneau solaire bleu-noir et son
                   bras), MODULE (capsule, anneaux, hublot — le seul prop du lieu
                   qui ait ete habite), CRISTAL (emissif froid, il RESPIRE
                   profond : la seule source du depot qui ne soit pas un
                   appareil), ANTENNE (parabole MORTE — ce qui appelle encore ici
                   est la balise, et il ne doit y avoir qu une chose qui appelle).
                   Douze tirages sur douze lui appartiennent. Les trois lieux
                   terrestres gardent leur fonds : ils SONT industriels.
                   SA LOI D IMPLANTATION ETAIT CELLE DE L USINE a un centieme
                   pres — barre 0,230 x 0,036 contre 0,300 x 0,034. Deux lieux a
                   la meme implantation sont le meme lieu. La sienne devient le
                   CONTRASTE DE TAILLE : deux masses en diagonale, deux travees a
                   l aplomb des bords, des eclats. Mesure du rapport plus grosse
                   piece / plus petite : x18,9 contre x4,7 Fonderie, x2,5 Usine,
                   x2,1 Friche — et le centre reste vide. `verifierBiomes()` muet
                   sur 200 graines x 4 lieux x 3 modes.
                   L AMBIANCE SUIT LE LIEU : dans le vide rien ne reste en
                   suspension, donc pas de poussiere — du DEBRIS, cinq fois plus
                   lent et froid, en DEUX nappes croisees. Une seule nappe se lit
                   comme du vent, et il n y a pas de vent dans le vide.
                   ET LE BORD SE VOIT ENFIN : les haubans etaient des traits noirs
                   a 0,40 sur le fond le plus sombre du jeu, donc rien. Des
                   VOILURES les remplacent — une surface se lit en noir sur noir
                   par le decoupage de sa trame — plus un ratelier d antennes pour
                   l echelle.

     0.19.3 lot 4  LA FRICHE ETAIT A ZERO. Douze tirages de props, AUCUN qui lui
                   appartienne — et dedans un coffret a voyant et un caillebotis,
                   dans un lieu abandonne depuis vingt ans. C etait le pire score
                   des quatre, et une friche n est pas une usine dont on a baisse
                   les lumieres : c est un endroit d ou l homme est parti, et ce
                   qui le prouve est ce qui a POUSSE depuis.
                   Six props a elle : BROUSSE (le plus tire des trois — les
                   touffes naissent d un centre et s ecartent, une couronne
                   reguliere ferait un massif), JONCHEE (du beton casse et non de
                   la ferraille, le fer est ce qui distingue un moellon d un
                   caillou), GRILLAGE tombe (maille AFFAISSEE, une maille
                   reguliere decrirait une cloture encore debout), CARCASSE (sa
                   trappe est OUVERTE : on est venu prendre ce qu il y avait a
                   prendre), BIDON couche (jamais debout — un fut debout est un
                   obstacle, et rien dans ce module n a le droit de se lire comme
                   bloquant), PANNEAU tombe avec son massif. Part propre mesuree :
                   0 % -> 83 %, cible du plan a 70 %.
                   Le COFFRET part, le TUBE reste et n est plus tire que par elle :
                   un neon qui gresille dit l abandon, un voyant qui respire dit
                   qu un appareil FONCTIONNE. Aucune entree morte au catalogue —
                   verifie, les sept props communs sont tous encore tires.
                   LA BRECHE, dans `blocs.js` : deux blocs sur trois ont un pan
                   qui a CEDE. Elle vit DANS l empreinte, donc la collision ne
                   bouge pas d un pixel ; elle se lit comme un trou parce que ce
                   qui la remplit est un eboulis. Elle part du pied — un mur cede
                   par le bas — et ne touche jamais un coin. Son eboulis deborde
                   hors du clip, plaque au sol : un mur perce dont rien n est
                   tombe est un mur perce proprement.

     0.19.4 lot 5  L USINE EST LE SEUL LIEU DONT LE VERBE SOIT AU PRESENT, ET
                   RIEN N Y BOUGEAIT. Quatre machines a elle, toutes animees sauf
                   une : BRAS (il pivote et S ARRETE a chaque bout — un mouvement
                   qui ne s arrete jamais se lit comme une rotation libre, pas
                   comme un geste commande), PRESSE (descente vive, remontee
                   lente, temps mort en haut : c est le rythme qui dit la force,
                   l inverse ferait un ressort), VENTILATION (le seul mouvement
                   continu — une soufflerie ne s arrete pas), PALETTIER, fixe et
                   il doit l etre : quatre machines animees sans rien d immobile
                   autour font une vitrine, pas un atelier.
                   LA BANDE DEFILE. Un convoyeur a l arret est un caisson. Le
                   decalage est une fonction du temps modulo le pas des taquets,
                   donc rien ne derive et rien ne se garde ; le sens depend de la
                   cellule, sinon toute l usine transporte vers la meme chose.
                   LA BANDE LED PORTE UNE CHENILLE : une bande qui pulse dit qu un
                   appareil est sous tension, un point qui COURT dit qu une ligne
                   tourne. C est la difference entre allume et en marche.
                   `evacDe()` ET `evacEtat()` : un bloc sur trois EVACUE, sur le
                   cote oppose a la bande — deux choses sur la meme arete se
                   disputent la lecture. Meme forme de declaration que `ledDe` :
                   `decor.js` LIT, personne ne pousse. La bouffee sort dans la
                   direction de la bouche, un jet vertical partout dirait qu il y
                   a un plafond.
                   ET L INVARIANT QUI AUTORISE TOUT CA, ECRIT : un mouvement de
                   decor est CONTINU ET PERIODIQUE, donc sans debut ni echeance,
                   donc ce n est pas un telegraphe — ce canal appartient au boss.
                   L enveloppe d une bouffee est douce des DEUX cotes : un flanc
                   franc refabriquerait une echeance. Le depot avait deja
                   assoupli « une matiere est fixe » sans le dire — le tube
                   gresille, le voyant respire, la fonte ondule, la balise bat.
                   Part propre : 42 % -> 83 %. Le fonds commun est desormais
                   DECLARE et non deduit dans le releve : « un prop que deux lieux
                   tirent » se retourne tout seul, purger l Usine aurait fait
                   passer la Fonderie de 50 a 83 % sans qu une ligne bouge.

     0.19.5 lot 6  LA FONDERIE TENAIT DANS UNE TUILE DE 400 PX. Rigoles, voies,
                   vitrifie : des PIECES, repetees, jamais une installation. Il
                   lui manquait ce qu une fonderie a et qu un atelier n a pas —
                   quelque chose de LONG QUI TRAVERSE, et par rapport a quoi tout
                   le reste se situe.
                   `couleeDe()` : deux canaux orthogonaux ancres au MONDE, coudes
                   francs (une conduite tourne a angle droit, une riviere
                   serpente). IL EST COUVERT, et ce n est pas un detail : la nappe
                   libre de fusion est DEJA prise, c est `couleeEnFusion`, un
                   DANGER avec son collider. La peindre sans collider apprendrait
                   au joueur soit a fuir ce qui ne blesse pas, soit a ignorer ce
                   qui blesse. Un canal couvert n a pas ce probleme — on lit une
                   conduite, et la lumiere sort par ses joints et ses REGARDS.
                   Seuls les regards sont des sources : un joint tous les 46 px en
                   ferait des centaines, et une source tous les 46 px n est plus
                   une source, c est une nappe. Ils se filtrent A LA GENERATION —
                   releve avant : un a quatre regards SOUS un bloc (un halo sans
                   rien qui l emette) et jusqu a deux DANS un danger (deux fois la
                   meme matiere, dont une seule blesse). Apres : zero et zero, sur
                   six graines. Filtrer une fois sert les DEUX lecteurs, `decor`
                   qui dessine et `lumiere` qui allume ; a l usage les deux listes
                   divergeraient. Le canal, lui, passe sous un bloc sans filtre :
                   une conduite passe sous une machine, c est la SOURCE qui n a pas
                   le droit d etre invisible.
                   LA CHALEUR MONTE, ancree sur le regard et pas sur la vue : elle
                   dit ou est la source au lieu de teindre l image. Une distorsion
                   thermique aurait demande un second tampon et un blit par image
                   pour le meme mot ; un brin qui monte le dit avec un `stroke`.
                   Quatre props a elle : POCHE (le plus gros du depot et la plus
                   forte source du sol, posee sur son socle — une poche en l air
                   demanderait une grue donc un volume), MOULE (le rang n est pas
                   uniforme : une fonderie coule EN CONTINU, c est le degrade du
                   rang qui le raconte), TREMIE (ce qui ENTRE), OUTILLAGE (le seul
                   prop du lieu qui parle de la MAIN). Part propre : 50 % -> 83 %.
                   ET LA PLAQUE ET LE COFFRET SONT SUPPRIMES, pas deplaces : elle
                   etait la derniere a les tirer. Un prop que plus aucune table ne
                   tire ne s oublie pas au catalogue. Le fonds commun tombe a cinq.
                   L EMBASE DE CHEMINEE ferme la boucle avec le premier plan : les
                   cheminees du bord ont enfin un pied.

     0.19.6 lot 7  LE CRITERE DU PLAN NE S EXECUTAIT PAS. « Si on echange les
                   quatre noms et que les captures restent difficiles a
                   attribuer, le travail n est pas fini » : vrai, et inverifiable.
                   La moitie qui pouvait devenir du code l est.
                   `signatureBiome()` decrit une loi d implantation en QUATRE
                   nombres — densite, encombrement, contraste de taille,
                   elongation — et `verifierBiomes()` refuse que deux lieux se
                   ressemblent sur les quatre a la fois : un axe doit les separer
                   d au moins 40 %. Exiger les quatre interdirait des variations
                   legitimes, n en exiger aucun a produit deux fois la meme map.
                   Le contraste seul laissait passer Usine/Friche, l elongation
                   seule laissait passer Usine/Nebuleuse — il faut les quatre
                   axes pour que le test tienne.
                   ET IL ATTRAPE LE DEFAUT QU IL EST CENSE ATTRAPER : rejoue
                   contre l ancienne table de la Nebuleuse, celle d avant le lot
                   3, le meilleur axe tombe a 28 % pour un seuil de 40 %. Les deux
                   lois auraient ete signalees. Ecarts actuels : 47 a 89 %.
                   `verifierBiomes()` muet sur 200 graines, lois comprises.
                   AU PASSAGE, UN INVARIANT FAUX DEPUIS LE PLAN 13 : `gfx` avait
                   SIX points de lecture, pas cinq — `actors.js` gardait sa passe
                   d ombres par un `gfx >= GFX_MEDIUM`, et la documentation
                   affirmait le contraire depuis 0.16.10. `ombresActives()`, meme
                   motif que `lumiereActive()` : l appelant apprend ce qu il doit
                   savoir sans devenir un point de lecture. Sauter une passe qui
                   balaye la horde entiere vaut la peine ; le payer d un sixieme
                   point, non. Verifie au grep : material, props, lumiere, decor,
                   fx, et rien d autre.
                   CE QUI NE SE MESURE PAS A SON PROTOCOLE, dans `LISEZMOI.md` :
                   le test du nom masque (captures RECADREES SOUS LE BANDEAU, le
                   nom du lieu y est ecrit) et le releve de cout aux quatre
                   paliers `gfx` sur les deux lieux les plus charges — la
                   Nebuleuse et ses onze baies, la Fonderie et ses dix regards.

     0.20.0 lot 1  LE HUD N AVAIT PAS DE MATIERE. Premier lot du plan 17, dont
                   le constat est que le monde a passe quatre plans a se donner
                   une charte pendant que le HUD gardait la sienne : cinq
                   panneaux, cinq fonds, trois epaisseurs de filet, aucun geste
                   commun. LA GAINE est ce geste — noir translucide en deux
                   densites, un filet clair d un pixel, un coin coupe et un
                   repere d angle. Le rang de lecture ne change QUE la densite
                   du fond et la presence de l arete d accent : deux panneaux
                   qui different par leur bordure se lisent comme deux systemes.
                   LE BISEAU COUPE LE COIN QUI REGARDE LE CENTRE, l arete
                   d accent longe le bord ; ils sont diagonalement opposes,
                   donc `clip-path` ne mange jamais l arete — il clippe la
                   bordure, il ne la suit pas. Et il tombe dans le RETRAIT :
                   dix pixels de coupe demandent douze de retrait, sans quoi la
                   troisieme competence perd son coin.
                   LA MARGE EST UN TOKEN, PLUS UNE CONSTANTE PAR BLOC :
                   `--hud-safe` tient les neuf ancrages, et deux paliers la font
                   descendre. ILS SE REGLENT SUR LE CADRE ET NON SUR LA FENETRE
                   (`container-type: size` sur `#frame`, licite parce que sa
                   taille vient du rapport et de la largeur, jamais du contenu) :
                   le HUD est en pixels d ecran alors que le cadre retrecit,
                   donc a 1280 il occupait une part bien plus grande qu a 1920.
                   DEUX DEFAUTS SILENCIEUX AU PASSAGE. `#hudHf` peignait
                   `var(--panel)`, un token que `cssVars()` n a jamais expose :
                   le bandeau de haut fait n avait aucun fond, ses quatre lignes
                   se lisaient a meme l arene. Et il etait ancre dans le MEME
                   coin que `#hudStats`, qu il recouvrait des que les deux
                   sortaient ensemble — il se pose desormais au-dessus,
                   `--hf-lift` etant lu une fois a l ouverture et jamais par
                   image.
                   RIEN N EST DEPLACE, RIEN N EST AJOUTE : meme contenu a
                   l ecran, meme table `memo`, aucun son, aucune cle de reseau.

     0.20.1 lot 2  LE BOUCLIER NE DISAIT PAS LA VERITE. La barre se normalisait
                   sur `CFG.SHIELD_POOL` — 80 — alors que la reserve de base
                   vaut ZERO et vient des cartes (+12, +30, +45, +60) et de
                   l arme (le siege en ajoute). Un joueur avec une seule carte de
                   bouclier avait une reserve de 12 : PLEIN, il affichait 15 % de
                   barre. La reserve se rejoue desormais par joueur avec
                   `fullMods` — cartes, cartes COOP des autres, classe, arme ;
                   la meta ne touche pas la reserve — toutes les 250 ms, parce
                   qu une reserve ne bouge qu a la prise d une carte. Sans
                   reserve la reference reste 80 : c est ce que donne le bonus
                   ramasse, et l ordre de grandeur du dome et du mode soin.
                   AU-DESSUS DE LA RESERVE la barre est pleine et son arete
                   passe au blanc — dome, mode soin, recharge du siege depassent
                   tous le plafond de regeneration, et ce qui deborde ne
                   reviendra pas.
                   DEUX LIGNES, JAMAIS DEUX COUCHES. Le bouclier etait une trame
                   posee SUR la vie et son chiffre vivait dans la meme phrase que
                   celui des PV : trois lectures sur une surface. Chaque ligne
                   porte son libelle, sa hauteur, sa matiere et son chiffre, et
                   le chiffre est HORS de la barre — dessus, il devenait
                   illisible des qu elle se vidait sous lui.
                   LES ETATS QUITTENT LE COIN LE PLUS FROID. Vulnerabilite,
                   brulure, entrave et sentence ne s affichaient que dans la
                   ligne d equipe, en haut a droite, en 13 px — les seules
                   donnees du HUD dont la lecture change ce qu on fait dans la
                   seconde. Une bande unique au-dessus des vitales, trois rangs :
                   etats, bonus, effets de build, et seul le rang 3 se replie.
                   LE SEUIL BAS NE CLIGNOTE PLUS : une arete franche sur la
                   jauge, l arete du panneau qui passe au rouge, une vignette
                   d ecran a 2,6 s — la periode du vignettage de cauchemar — et
                   une sortie en fondu.
                   TROIS LECTURES MORTES AU PASSAGE. `.shielded` etait posee
                   soixante fois par seconde sans qu aucune regle ne la lise.
                   `relicFlat(id, "flatShield")` lisait une clef qu aucune
                   relique ne porte. Et la MATIERE de la jauge est un
                   `background-image` : la couleur posee en `background` depuis
                   le script la remplacait a chaque image — le verre du plan 12
                   n avait jamais existe a l ecran, ni pour soi ni pour l equipe.

     0.20.2 lot 3  LA RECHARGE DU SOIGNEUR N EXISTAIT PAS A L ECRAN. Sa bascule
                   vit dans `healSwapCd`, pas dans `cd1` — l emplacement etait
                   donc rempli de zeros pour une classe sur trois, et sa premiere
                   case s affichait PRETE en permanence, y compris quand la
                   competence refusait de partir. Aucune clef ne s ouvre :
                   l instantane ecrit `healSwapCd` dans l emplacement de `cd1`
                   pour cette classe, et la variable reste seule source.
                   LA BASE D UNE RECHARGE EST CELLE QU ON A VUE. Deux tables
                   recopiaient les constantes du serveur en ignorant tout ce que
                   les cartes en font — `skillCdMul` descend a x0,55, `bombCdCut`
                   retranche, `tauntCd` ajoute, `cdPerKill` raccourcit a chaque
                   mort. Une recharge divisee par la mauvaise base part deja a
                   moitie remplie. Le SOMMET OBSERVE est exact, gratuit, et il n a
                   rien a tenir a jour. Les deux tables disparaissent, avec les
                   imports qui les nourrissaient et le `dashCd` que le HUD
                   recevait sans plus le lire.
                   LA BOMBE EST UNE RESERVE, PAS UNE RECHARGE : elle part tant
                   qu il reste une charge, et `cd1` mesure la remise en stock de
                   la suivante. La case annoncait PRETE a stock vide.
                   LE VOILE NE TOURNE PLUS. Un balayage conique sur une case
                   CARREE ne dit rien : l angle parcouru n est pas la fraction
                   d aire, et a quarante-quatre pixels personne ne lit un angle.
                   L acquis s eclaire par le bas, le reste s assombrit, et un
                   FRONT de deux pixels separe les deux — un voile sombre sur une
                   case deja sombre ne se voyait pas.
                   LE LIBELLE PORTE DEUX CHOSES, JAMAIS DEUX LIGNES : le nom
                   quand la case est prete, le decompte pendant la recharge. La
                   hauteur du bloc ne bouge pas d un pixel entre les deux.
                   ET LES DEUX REPONSES A UN APPUI CESSENT DE SE RESSEMBLER : la
                   case qui part s enfonce et s eclaire, celle qui refuse tremble
                   sur place. `pipPress` naissait a zero, donc les quatre cases
                   se croyaient pressees pendant les 160 premieres millisecondes
                   de la page — meme piege que `hit: 0` au lot precedent.
                   RIEN NE PULSE PLUS EN PERMANENCE : l ultime disponible se
                   signale UNE FOIS puis tient son etat. Le socle verrouille perd
                   son opacite globale — cadre en pointilles, glyphe desature,
                   NOM lisible : c est lui qui dit ce qui manque.

     0.20.3 lot 4  UN ALLIE HORS DU CHAMP N EXISTAIT NULLE PART. Ni marqueur, ni
                   direction, ni distance — ni dans le monde ni dans le HUD.
                   L arene fait 4800 x 2700 pour une vue de 1600 x 900 : c est le
                   cas ORDINAIRE, pas un cas limite. Un chevron par allie, ramene
                   sur le RECTANGLE de la vue et non sur un cercle — un cercle
                   laisse les quatre coins vides et fait glisser le marqueur —
                   avec la distance EN METRES. Rien ne s ouvre sur le reseau : les
                   joueurs ne sont jamais filtres par vue, leur position etait
                   deja la, et la camera arrive par le contexte que le rendu
                   passe deja.
                   IL GARDE LA COULEUR DU JOUEUR, TOUJOURS. C est une DIRECTION,
                   et la charte interdit le rouge pour ce vers quoi il faut
                   aller ; l etat passe donc par la FORME — chevron creux pour un
                   allie loin, triangle plein pour un allie a terre — par la
                   presence et par le mot.
                   LE BOUCLIER DES ALLIES SORT DE LA BARRE DE VIE. Il y etait
                   superpose en trame, donc deux valeurs se lisaient sur une
                   surface ; il a son filet de trois pixels dessous, et ce filet
                   n existe que s il a quelque chose a dire. La surcouche `<u>`
                   disparait du depot : le bouclier a la meme forme partout.
                   A TERRE, LA BARRE DEVIENT CELLE DU RELEVEMENT — elle est vide
                   de toute facon, et c est la seule chose qui bouge encore pour
                   ce joueur. L arete de la ligne passe au rouge sombre, et le mot
                   ne s ecrit plus deux fois sur la meme ligne.
                   MES ETATS NE SE REPETENT PLUS dans ma propre ligne d equipe :
                   ils sont dans la bande, au-dessus de mes vitales, depuis le
                   lot precedent. Deux endroits pour la meme information, c est un
                   endroit de trop a surveiller.

     0.20.4 lot 5  LA VAGUE CIRCULAIT SANS JAMAIS S AFFICHER. `v.beat` ne servait
                   qu a detecter le crescendo, alors que c est le SEUL palier de
                   progression a l echelle de la minute : un segment dure cinq
                   minutes, une vague soixante secondes. Le joueur savait dans
                   quel segment il etait, sur six, et rien de plus fin.
                   L en-tete de mission tient desormais trois rangs et pas un de
                   plus : OU je suis (le lieu, en inscription de 13 px), OU J EN
                   SUIS (la vague, en 18 px), COMBIEN DE TEMPS (la barre et le
                   decompte). Le nom du lieu etait un TITRE de 22 px au milieu du
                   bord haut, affiche cinq minutes d affilee.
                   LA BARRE MONTE, LE CHIFFRE DESCEND. Elle se vidait, donc son
                   front tombait a l oppose du compte de vagues ; elle se remplit,
                   et ses CINQ graduations tombent exactement sur les limites de
                   vague. La graduation dit combien il y en a, le front dit ou
                   l on en est.
                   ET LE BLOC S EFFACE au bout de six secondes quand plus rien ne
                   change — la place et la vague sont acquises. Un evenement en
                   cours ou un crescendo le rallument.
                   LE PING AVAIT LE POIDS DES KILLS. Six lignes de la meme taille
                   et de la meme couleur en haut a gauche : le bloc se lit
                   maintenant en colonnes, libelle a gauche et chiffre a droite,
                   avec le reseau d un rang en dessous. Il ne dit rien sur la
                   partie, il dit si le lien tient.

     0.20.5 lot 6  UNE COLLISION DE CLEF DANS LA TABLE `memo`. `bpl` servait au
                   COMPTE DE BARRES du boss et, par le helper, a l etat de
                   palier : chaque image ecrasait le dernier compte par un
                   booleen. Le rail se retoggait soixante fois par seconde pour
                   rien, et surtout AUCUNE variation du compte n etait
                   detectable — la rupture de barre ne pouvait pas se jouer.
                   Trouvee en croisant les clefs ecrites en direct avec celles
                   passees aux helpers : une seule intersection dans tout le
                   fichier, et c etait elle.
                   LE RAIL FAISAIT NEUF PIXELS SOUS LA JAUGE : il fallait COMPTER
                   des pastilles pour savoir ou on en etait. Il prend la largeur,
                   se remplit DE LA GAUCHE comme la barre de mission, et la
                   POSITION du segment allume EST le numero de la barre en cours.
                   Il se vidait par la droite : quatre segments allumes pour
                   « barre 2 / 5 ».
                   « x4 » ET LE RAIL DISAIENT LA MEME CHOSE de deux facons, et le
                   « x4 » vivait a l exterieur du cadre. Le rail MONTRE, le texte
                   NOMME — et il nomme la barre en cours, pas celles qui restent.
                   LE TOTAL DE PV DISPARAIT. « 3400 / 5000 » demandait d etre
                   rapporte a une jauge qui n en montre qu un cinquieme : trois
                   canaux pour une seule question. Le rail dit combien de combat
                   reste, la jauge dit ou en est la barre, la phase dit la
                   difficulte.
                   L EMPORTEMENT ETAIT UN SUFFIXE DU NOM, ET IL CLIGNOTAIT en
                   boucle : le nom cessait d etre un nom, et une pulsation
                   permanente n annonce rien. Phase et emportement deviennent un
                   ETAT du cadre, sous le nom. La rupture, elle, se joue dans le
                   rail — 420 ms, le segment tombe casse sur place ; le hitstop et
                   le son restent au canal d evenements.
                   Le SCEAU du boss final garde sa pulsation : seule animation
                   permanente du HUD, et sa periode dit les barres restantes.

     0.20.6 lot 7  LA CHOSE LA PLUS VOYANTE DE L ECRAN CLIGNOTAIT EN PERMANENCE.
                   Le cadre de consigne pulsait a 280 ms en boucle : ce qui
                   clignote tout le temps n annonce plus rien. Il ENTRE une fois
                   — 180 ms — se lit, et part avant la resolution comme avant. Il
                   passe en une rangee : la FORME a gauche, l ordre, son nom, et
                   le decompte colle au bord bas. La pastille de forme tenait une
                   ligne a elle seule.
                   LE HUD S ABONNE AU CANAL D EVENEMENTS. `hudEvent` est le
                   troisieme point d entree du module, appele par `fx.js` avant
                   ses propres retours. Deux fronts ne se deduisent pas d une
                   comparaison de valeurs : la RUPTURE d un bouclier — tomber de
                   trente a zero d un coup n est pas la meme chose que se faire
                   grignoter — et la MONTEE DE NIVEAU, qui est un fait d equipe.
                   `events.js` les emettait deja et `fx.js` les faisait sonner ;
                   le HUD n ouvre pas un second canal, il ecoute celui-la, et il
                   n ajoute AUCUN son.
                   Les deux retours ne touchent que la couleur et un balayage :
                   aucun pixel de mise en page ne bouge.
                   CE QUI PULSE ENCORE, ET POURQUOI : le vignettage de seuil bas
                   (2,6 s) et la rampe de bouclier (1,1 s) disent un ETAT EN
                   COURS et s arretent avec lui ; le sceau du boss final dit les
                   barres restantes par sa periode ; l attente de briefing est
                   hors combat. Tout le reste — cadre de consigne, emportement,
                   ultime pret — a ete rendu ponctuel par les lots 3, 6 et 7.

     0.20.7 lot 8  QUATRE ELEMENTS ETAIENT AFFICHES EN PERMANENCE, VIDES. Une
                   regle d AUTEUR qui pose `display` bat celle du navigateur,
                   quelle que soit sa specificite : tout ce que le HUD masque par
                   l attribut `hidden` et qui porte un `display` restait a
                   l ecran. Les quatre temoins du Metronome sous CHAQUE boss, la
                   ligne d eclats a zero, la ligne de bouclier sans reserve, et —
                   depuis le lot 7 — le cadre de consigne, vide, au milieu de
                   l ecran. Une seule regle desormais, `#hud [hidden]`, dont le
                   selecteur porte l identifiant du HUD et passe donc devant tous
                   les `display` du fichier.
                   DEUX BOUTONS POUR UN SEUL PANNEAU. Le compteur de degats et le
                   panneau de statistiques etaient deux interrupteurs
                   independants alors qu ils sont deux NIVEAUX de la meme couche.
                   Un controle, trois crans — masquee, combat, detail — et les
                   deux drapeaux restent, donc un reglage deja enregistre se
                   relit tel quel.
                   « 1284 dps · 42813 total » ETAIT UNE PHRASE : deux nombres
                   colles dans un ordre qu il fallait relire. Deux lignes, la
                   meme grammaire libelle/valeur que le bloc de comptes et que
                   les quatorze lignes de detail — la primitive sert desormais
                   trois blocs, et le cyan est parti : dans l arene il dit « il
                   faut y aller », et un compteur ne dit jamais ou aller.
                   Au-dela de dix mille, les milliers ne se lisent plus, ils
                   s estiment : « 42,8 K ».
                   ET LE CONFORT RECULE D UN RANG PENDANT UN BOSS (`#hud.boss`) :
                   il ne disparait pas, on coupe la telemetrie dans les reglages,
                   pas au milieu d un combat.
                   FIN DU PLAN 17.

     0.21.0 lot 1  LA HORDE NE COMPRENAIT PAS L ARENE. Un ennemi sondait UN
                   point a 46 + r px devant lui pour decider d une tangente. La
                   cloison la plus mince du depot fait 32 px : le point sautait
                   par-dessus, le corps ne voyait RIEN, se collait a la face, et
                   le centre d une face est un attracteur — composante
                   tangentielle nulle par symetrie. Mesure : sur l Usine, un
                   corps lache a 212 px de sa cible derriere la chaine de
                   production n arrivait JAMAIS en 40 s et se figeait a 134 px,
                   au pixel pres, pendant 39 des 40 secondes. Dans une poche en
                   U : jamais en 60 s.
                   TROIS COUCHES SEPAREES, une seule nouvelle. `navigation.js`
                   repond a « OU ALLER » par une diffusion de Dial sur une
                   grille de 40 px, UNE PAR JOUEUR et non par ennemi : 200 corps
                   lisent quatre champs, donc le cout ne suit pas la population.
                   « COMMENT EVITER » reste la tangente locale, corrigee de trois
                   echantillons au lieu d un. « COMMENT SE TASSER » ne bouge pas.
                   Le champ ne sert QUE quand la ligne droite ne passe pas : en
                   terrain libre le comportement est identique au pixel pres.
                   DEUX PIEGES PAYES, tous deux mesures. La case libre « la plus
                   proche » d un corps plaque contre une cloison est celle d EN
                   FACE : elle porte une distance plus courte, donc elle aspire
                   le corps DANS le mur. Le bon cote ne se deduit pas, il se
                   SOUVIENT (`navAncre`). Et le point vise doit se rejoindre en
                   ligne droite, sinon la tangente locale corrige un cap qui
                   traverse la boite et annule justement la composante qui ferait
                   tourner le coin.
                   UN TIREUR NE TIENT SA DISTANCE QUE SI LA LIGNE EXISTE : sans
                   ce test il se figeait a son `standoff` et vidait son chargeur
                   dans la boite, que `_shots` absorbe deja.
                   LE DESENCLAVEMENT A ETE ECRIT, MESURE, PUIS SUPPRIME : detection
                   d immobilite, biais lateral, reprise forcee du champ. Il ne
                   changeait RIEN (1 px sur une moyenne de 283, sur douze mesures)
                   parce que le champ resout deja la geometrie et que la foule
                   releve de la separation. La detection vit dans
                   `verifierDeplacement`, ou elle est un critere, pas du code mort.
                   Cout mesure : +0,002 a +0,033 ms par pas a 200 corps, et la
                   horde ferme 1 a 8 % de distance en plus.

     0.21.1 lot 2  NEUF TYPES PARTAGEAIENT UNE SEULE FACON DE BOUGER. Trois
                   mecanismes, et DEUX DES TROIS SE DEDUISENT — une colonne de
                   plus dans le bestiaire est une colonne de plus a tenir
                   d accord avec le reste.
                   LA MASSE EST LA SURFACE (`(r / 12)^2`, bornee) et elle
                   repartit la poussee de separation a son inverse. A masses
                   egales on retombe EXACTEMENT sur le demi-demi d avant
                   (`2 x 0,5 = 1`), et une elite paie son rayon sans qu aucune
                   ligne ne le dise. Mesure sur six graines : le coureur recule
                   de 2,3 px, la pondeuse avance de 9,6, le colosse de 7,0 —
                   monotone en masse.
                   CE QU ELLE NE FAIT PAS, ET C EST MESURE : elle ne change pas
                   le debit d un passage. 90 corps devant un goulet de 200 px,
                   90/90 franchissent en 30 s dans les quatre configurations. Les
                   colosses ne bouchaient pas, ils sont LENTS — 1 600 px de
                   detour a 44 px/s. La difference va au registre d equilibrage,
                   pas dans une constante changee au milieu d un lot.
                   L ECART DE POSTE ne joue qu entre pairs du MEME type, et il
                   DIMENSIONNE LA CELLULE de `_grille()` : la preuve de
                   couverture du voisinage 3x3 porte sur la plus grande distance
                   d interaction, pas sur les rayons. 14 tireurs autour d une
                   cible : voisin le plus proche de 39,4 a 65,3 px, pour un
                   reglage de 64 — il se lit directement dans le resultat.
                   LE FLANC EST LE SEUL CHAMP QUI RESTE DECLARE : « arriver par
                   le cote » est une intention, elle ne se lit dans aucune
                   statistique. Il s arque de loin et se resorbe de pres, sinon
                   le corps tourne sans jamais commettre ; son cote vient de
                   l identifiant, donc il ne change jamais. Il ne s applique QUE
                   quand la ligne droite passe — sur un cap rendu par le champ,
                   un biais lateral pousse dans la boite que le champ contourne.
                   ET LE VERIFICATEUR DU LOT 1 SE CORRIGE : son goulet etait fait
                   de deux boites qui SE TOUCHENT, donc un mur de 1 400 px, et sa
                   fenetre etait taillee pour le fantassin. Il comptait 11
                   colosses sur 20 « bloques » alors qu ils marchaient encore. La
                   fenetre se derive du plus lent du roster, et l horloge est
                   avancee pour que le roster soit OUVERT — sans quoi `adaptType`
                   repliait les cinq types sur le fantassin.
                   Cout : nul (0,148 -> 0,135 ms a 200 corps).

     0.21.2 lot 3  DEUX ATTAQUES SUR TROIS PARTAIENT SANS RIEN ANNONCER. Le tir
                   du tireur n avait aucune anticipation, et la meche du kamikaze
                   valait 0,15 s — le temps d apercevoir la bague et rien de
                   plus. Seule la ruee avait un preavis.
                   UN SEUL CHIFFRE, PORTE PAR LE CORPS. `ATK_CFG.WARN` vaut 0,5 s
                   pour les trois : le joueur apprend « quand un corps se ramasse,
                   quelque chose part une demi-seconde plus tard », pas trois
                   durees selon le type. Le canal du telegraphe AU SOL reste au
                   boss — une arene a 200 corps n aurait plus de sol lisible.
                   MESURE : la meche a 0,5 s, un joueur qui s ecarte passe de 90
                   degats subis a ZERO. L explosion etait inevitable, elle ne
                   punit plus que l inattention.
                   LA RUEE EST RATIONNEE, LA VISEE NON, et c est une decision
                   payee par la mesure. Un creneau de ruee refuse REPORTE une
                   ruee ; un creneau de tir refuse ANNULE le tir. Les avoir mis
                   sous le meme budget coutait 84 % du volume de tir en cauchemar
                   a quatre (46 613 -> 7 554 balles). Ce n est pas une regle de
                   lisibilite, c est un affaiblissement. Ce qui borne les visees
                   est le plafond de PART du tireur.
                   ET LE PREAVIS SE PAIE SUR LA RECHARGE, pas sur la cadence
                   (`shootCd - WARN`) : ecart final de 0,8 %.
                   LE BUDGET SE COMPTE AVANT D ETRE DEPENSE. Il etait reporte de
                   l image precedente, donc un corps qui ENTRAIT dans une vue en
                   cours de preavis n y figurait pas : 10 preavis pour un budget
                   de 8. Une passe dediee le rend exact — 8, jamais 9.
                   `wu` SE FILTRE PAR VUE comme toute autre liste, et transporte
                   donc des CORPS et non des identifiants : un identifiant ne sait
                   pas ou il est. Sans ce filtre, chaque client recevait la
                   soixantaine de preavis de toute l arene.
                   DEUX PREAVIS, DEUX LANGAGES : le ramassement annonce un corps
                   qui VIENT SUR VOUS et garde l ecrasement, la visee annonce un
                   corps qui RESTE OU IL EST et n a que sa pose. Le client cesse
                   au passage de DEVINER la visee a partir de `def.shootCd`, que
                   le serveur ne respecte pas.
                   CE QUE LA VISEE N APPORTE PAS, ET IL FAUT LE DIRE : elle
                   n ameliore pas le taux d esquive. 33 % de touches sur une cible
                   immobile, 9 % sur une cible qui bouge, avant comme apres — le
                   temps de vol fournissait deja la fenetre. Elle est gardee pour
                   l ATTRIBUTION, et le lot 5 doit le demontrer.
                   ENFIN, LA MESURE DE COUVERTURE DU SOL ETAIT FAUSSE : elle
                   additionnait le disque ENTIER d une zone a moitie hors champ et
                   comptait DEUX FOIS les recouvrements, d ou « 120 % d une vue ».
                   Rasterisee, elle donne 21 a 41 % — l exces est reel, mais sa
                   cause n est pas la horde : `_groundZone` estampille `horde: 1`
                   sur ses CINQ appelants, dont la carte de terrain du joueur et
                   les noeuds du boss.

     0.21.3 lot 4  TROIS ARCHETYPES, TROIS VERBES. Aucun n est un jeu de
                   statistiques de plus : chacun repose au joueur une question
                   que le roster ne posait pas.
                   HARCELEUR — « es-tu couvert ? » Il choisit l ISOLE et se
                   retire apres avoir touche. 59 % de ses cibles sont le joueur
                   seul contre 46 % pour un fantassin, et il passe 6 % de son
                   temps au contact contre 80 % pour un fantassin et 100 % pour
                   un coureur. Son verbe n existe qu a plusieurs, et en solo il
                   se comporte comme un coureur — assume, comme la posture du
                   Soigneur.
                   GENERATEUR — « qui d abord ? » Il ne blesse presque pas, il
                   couvre la horde autour de lui. L ignorer coute +52 % de
                   degats pour nettoyer le meme paquet ; le tuer d abord, +13 %.
                   LE BOUCLIER PLAT NE MARCHAIT PAS, ET LA MESURE L A DIT : a 26
                   points fixes l ecart n etait que de +12 %, parce qu une
                   reserve constante vaut 38 % d un fantassin a la cinquieme
                   minute et 9 % a la trentieme. En PART DES PV elle ne bouge
                   plus avec la rampe. Elle est DONNEE entiere a l entree sous le
                   rayon — une coque qui se charge en trois secondes ne protege
                   que ce qui traine avec la source depuis trois secondes.
                   SABOTEUR — « ou te tiens-tu ? » Meme grammaire que le tir,
                   mais il verrouille la PLACE au lieu de l ANGLE : « la ou tu es
                   dans une demi-seconde ne sera plus a toi ». Une cible qui
                   campe encaisse 3 850, une cible qui se deplace 13.
                   DEUX REGLES NEUVES, ET AUCUN `if (type === …)` : le RETRAIT
                   (`fleeT`) devient general — le soigneur le posait sous le feu,
                   le harceleur le pose apres avoir touche — et `_isolementPass`
                   se releve UNE fois par image, pas par corps. L isolement est un
                   POIDS et non un seuil : il n y a pas d instant ou l on devient
                   isole.
                   LE RELAIS PASSE AU LOT 5. C est une interaction ENTRE CORPS,
                   donc sa place est dans le lot du groupe, pas dans celui des
                   archetypes.
                   Cout : 0,226 ms a 200 corps, 0,454 ms a 400, p99 sous la
                   milliseconde. Les trois nouveaux pesent 14,5 % de la horde en
                   cauchemar.

     0.21.4 lot 5  LE RELAIS, ET CE QUE LA MESURE A REFUSE DE CONFIRMER.
                   LE RELAIS est le seul corps du roster dont la menace n est pas
                   LUI mais la PAIRE : deux relais tendent un arc, et l arc est ce
                   qui blesse. Un joueur ne compte plus des corps, il lit une
                   geometrie — et pour la premiere fois la valeur d une cible
                   depend d une AUTRE cible. Tuer une extremite casse l arc
                   (0,90 -> 0,23 paire vive a deux corps). C est une menace
                   POSITIONNELLE : 701 degats sur une cible qui campe, 45 sur une
                   cible qui bouge.
                   TROIS REGLES QUI TIENNENT L ARC. L appariement est
                   DETERMINISTE et se lit dans l ordre de la liste — sinon deux
                   corps se choisissent l un l autre a des images differentes et
                   l arc clignote. La rupture est PLUS LARGE que la formation,
                   sans quoi une paire qui oscille autour de sa portee bat au lieu
                   de tenir. Et la cohesion ne joue qu au-dela de la moitie de la
                   portee : de pres les corps sont libres, et c est ce qui garde
                   l arc mobile.
                   LES PRIORITES DE COMBAT EXISTENT, ET ELLES SE LISENT SUR LE
                   DEBIT : viser les soutiens tue +37 % et vide le terrain de ses
                   soutiens (26,3 -> 1,9 en vue).
                   MAIS LE TEMOIN A INVALIDE LA COLONNE DES DEGATS SUBIS. Tirer
                   sur le corps le plus LOIN — la pire politique concevable —
                   encaisse MOINS que la meilleure. A 500 corps le contact sature
                   et aucune politique de cible ne le change. Une mesure dont le
                   temoin ne bouge pas ne mesure rien.
                   VERDICT SUR LE PREAVIS DE VISEE. Le lot 3 s etait engage a le
                   demontrer ou a le retirer. Second instrument monte expres —
                   douze tireurs et rien d autre, pression maintenue constante :
                   368 degats contre 372, aucun gain. La promesse etait LE MAUVAIS
                   TEST : la valeur d un telegraphe est la lisibilite pour un
                   HUMAIN, et aucun banc de bots ne la mesure. Il est conserve SUR
                   SON COUT — 0,8 % de volume de tir, quelques octets, une
                   devinette fausse du client supprimee — pas sur un gain
                   demontre, et il sera juge a l ecran.
                   ET LE VERIFICATEUR DU LOT 1 SE CORRIGE ENCORE : sa fenetre
                   d apres-breche etait en dur a douze secondes, donc son verdict
                   dependait du tirage de vitesse (+-10 %) — muet seul, bavard
                   apres d autres verificateurs. Un critere qui change de reponse
                   sans que le jeu change n est pas un critere.
                   Cout : 0,242 ms a 200 corps, 0,463 ms a 400.

     0.21.5 lot 6  UNE ELITE ETAIT TROIS MULTIPLICATEURS. Elle est desormais une
                   VARIANTE DE COMPORTEMENT, ecrite SUR LA LIGNE DE SON TYPE, et
                   les treize en ont une.
                   `defDe(type, elite)` est LE point de lecture du bestiaire par
                   corps, des deux cotes du reseau. Il est PUR, donc le client le
                   rejoue a partir du bit `e.elite` qu il recoit deja : aucune
                   fiche ne traverse le reseau. Une surcharge ne touche QUE du
                   comportement — `ELITE_INTERDIT` refuse les statistiques
                   d apparition et l economie, sans quoi une elite deviendrait un
                   type de plus qui vole son quota et son score au sien.
                   `verifierElites()` est le critere rejouable.
                   LE PORTE-BOUCLIER ABSORBAIT DE TOUTES LES DIRECTIONS DEPUIS
                   QU IL EXISTE. Le serveur comparait `def.shieldArc` — 100, en
                   DEGRES — au retour de `_angleDiff`, qui vaut au plus 3,15
                   RADIANS : le test etait toujours vrai. Le client, lui, ne
                   dessinait le blocage que de face. Apres correction, corps
                   oriente vers 0 : absorbe a 45, passe a 60 pour un arc de 100 ;
                   absorbe a 80, passe a 90 pour l elite a 165. C est exactement
                   ce que le client dessinait deja. Le changement d equilibre est
                   REEL et va au registre : tout ce qui le frappait de dos devient
                   efficace.
                   DOUZE VARIANTES SUR TREIZE SE LISENT, PV egalises et geometrie
                   choisie ENTRE la valeur de base et celle de l elite — seule
                   position d ou l ecart se voit. Le fantassin explose (0 -> 57),
                   le coureur va chercher l isole (0,00 -> 0,31), le tireur passe
                   de 154 a 270 balles, le soigneur rend 153 PV la ou sa base n en
                   rend aucun, le relais tend un arc a 350 px la ou sa base n en
                   tend pas.
                   UNE SURCHARGE A ETE ECRITE, MESUREE, PUIS RETIREE : l elite
                   harceleur portait `flanc: 1.25`, et son propre verbe de ciblage
                   TOMBAIT de 0,32 a 0,16 — un flanc plus large deplace le corps,
                   et le corps deplace ne choisit plus le meme joueur. La
                   surcharge combattait son type.
                   ET LE HARCELEUR RESTE LA PLUS FAIBLE DES TREIZE (0,05 -> 0,04
                   de temps au contact) : sa base n y passe deja presque aucun
                   temps, donc allonger son retrait ne change presque rien. Note
                   au registre plutot que chiffre invente.

     0.21.6 lot 7  LE RESIDU DE CAUCHEMAR NE PORTAIT PAS LA DIFFICULTE. Un
                   pilote IDENTIQUE partout, sur un beat sans evenement, en fait
                   varier un multiplicateur a la fois — et deux resultats sur
                   trois sont contre-intuitifs.
                   `hp` NE RETIENT PERSONNE. A la population plafond, des PV en
                   plus n epaississent que les corps : 1,35 -> 1,10 laisse la
                   pression a quatre joueurs a MOINS DE 2 % d ecart (1 447 contre
                   1 477 degats/min) tout en rendant +22 % de debit de mise a
                   mort et -17 % de PV moyen. C est le « sac a PV » que la
                   consigne refuse, mesure. Il passe donc a 1,10.
                   `spawn` EST INERTE AU PLAFOND : 1,28 -> 1,45 ne produit aucun
                   effet, la horde etant deja saturee. Il ne compte qu avant la
                   saturation.
                   `dmg` EST LE SEUL LEVIER CHIFFRE qui deplace la pression, a
                   peu pres lineairement, et c est pour cela qu on n y touche pas.
                   CE QUI PORTE VRAIMENT LES MODES : cinq / huit / treize types,
                   et zero / six / douze attachements de trait. Le calme s arrete
                   aux cinq d origine, le normal AVANT le soutien et le deni de
                   sol, le cauchemar prend tout. Les quatre archetypes des lots 4
                   et 5 n avaient AUCUN trait dans AUCUN mode — cauchemar ne les
                   durcissait pas du tout. Ils en ont quatre desormais, pour +3 %
                   de pression : peu, et c est le point — cauchemar etait DEJA
                   porte par sa composition, et le 1,35 etait du poids mort.
                   UN EFFET NON DESIRE, SIGNALE PLUTOT QU ENTERRE : a quatre
                   joueurs l ecart est conserve, mais EN SOLO la pression monte de
                   23 a 38 % selon les graines — une horde qui meurt plus vite se
                   renouvelle plus vite. Trois graines ne suffisent pas a regler
                   ca et aucun ajustement n a ete valide aux DEUX effectifs : au
                   registre, pas dans un chiffre invente.

     0.21.7 lot 8  LA CHARTE DISAIT QU'UN CORPS SE RECONNAIT SANS SA COULEUR ;
                   RIEN NE LE VERIFIAIT. A treize types la roue de teintes est
                   saturee, donc la silhouette porte seule — et une regle qu'on
                   ne peut pas rejouer n'est pas une regle.
                   CINQ NOMBRES PAR SILHOUETTE, sur le modele de
                   `signatureBiome()` : elancement, remplissage, sommets, avance,
                   matiere. `verifierSilhouettes()` refuse deux types qui se
                   ressemblent sur les CINQ a la fois, et `SILHOUETTES` sort de
                   `plan()` pour que la mesure existe hors du four a atlas.
                   DEUX MESURES ONT ETE REFAITES AVANT DE SERVIR. L aire signee
                   n a AUCUN sens sur ces formes : un corps est fait de
                   sous-traces DISJOINTS dont les enroulements s annulent — elle
                   rendait 0,03 pour le harceleur et 1,00 pour le colosse, c est
                   a dire du bruit. Remplacee par l ENVELOPPE CONVEXE. Et
                   l enveloppe ne voit pas les creux : il a fallu un cinquieme
                   axe, `matiere`, pour separer un ANNEAU d un DISQUE — c est lui
                   qui separe le generateur (0,39) du kamikaze (0,63), les deux
                   seuls corps que les quatre premiers axes confondaient.
                   UNE PAIRE RESISTE, ET ELLE EST ANTERIEURE AU PLAN :
                   porte-bouclier et choeur. Le pavois a ete avance de huit
                   pixels — son verbe est un blocage FRONTAL, sa silhouette ne le
                   disait pas — mais LA MESURE NE BOUGE PAS : deplacer la masse
                   deplace la boite englobante, et `avance` est invariante par
                   translation. Le changement est garde pour son SENS, pas pour
                   le chiffre. Sculpter une forme contre un indicateur qu on ne
                   peut pas regarder ferait pire.
                   QUATRE TYPES MOURAIENT EN FANTASSIN : `DEATH_BURST` s arretait
                   a neuf entrees et `?? DEATH_BURST[0]` faisait le reste, en
                   silence. Chacun a la sienne, et `cone` porte l intention — le
                   harceleur eclate VERS L AVANT, la coque du generateur se defait
                   en gros eclats lents, le chassis du saboteur se demonte, le mat
                   du relais cede en un jet court.
                   CE QU UN CORPS FAIT SE LIT SUR L INSTANTANE, jamais sur une
                   clef de plus : la coque d un voisin dit que le generateur
                   travaille, l appariement dit que le relais tend son arc, `wu`
                   dit qui s apprete — et la visee n etait lue que pour le tireur,
                   donc le saboteur restait inerte sous son propre preavis.
                   AUCUN SON AJOUTE, ET C EST LA BONNE REPONSE.
                   `verifierFeedback()` croise avec les 41 recettes REELLES
                   d `audio.js` est muet : les archetypes heritent de `mort` /
                   `mortEnergie` par `matiereDe()`, et le relais y passe a
                   ENERGIE — il emet un arc. Le limiteur voit TROIS clefs de mort
                   pour treize types, pas treize.
                   FIN DU PLAN 18.

     0.21.8 fix    LE SOL DE HORDE N ETAIT PAS DE LA HORDE. `verifierTraits` signalait
                   « le sol de horde couvre 21 a 41 % d une vue pour un budget de
                   12 % » a CHAQUE execution depuis le lot 1 ; le lot 3 avait dit
                   ou regarder, le correctif tient en un renommage.
                   `_groundZone` a CINQ appelants et estampillait le meme drapeau
                   sur tous : la trainee, les spores et le saboteur — la horde —
                   mais aussi LA CARTE DE TERRAIN D UN JOUEUR et LES NOEUDS DU
                   BOSS. Le drapeau portait deux sens : « ce sol est persistant,
                   ce n est pas un telegraphe », vrai pour les cinq et lu comme
                   tel par la logique d abri du boss ; et « ce sol compte dans le
                   budget de la horde », faux pour trois sur cinq.
                   LA PREUVE ETAIT DANS LA MESURE : le CALME, qui n attache aucun
                   trait et n a donc ni trainee ni spore, affichait quand meme
                   21 %. Et le plafond evinçait « la plus ancienne zone de horde »
                   sans regarder qui l avait posee — le terrain d un joueur
                   pouvait donc effacer une trainee, et l inverse.
                   La provenance est nommee (`SOL_HORDE`, `SOL_JOUEUR`, `SOL_BOSS`)
                   et reste TOUJOURS VRAIE : la logique d abri du boss ne bouge
                   pas d un pixel, seuls le plafond et la mesure savent desormais
                   de quoi ils parlent. `verifierTraits` est MUET, pour la
                   premiere fois du plan.

     0.22.0 lot 1  UN LIEU N AVAIT QU UNE SEULE FORME D OBSTACLE. Premier lot du
                   plan 19. Le plan 16 avait releve sept denominateurs communs
                   aux quatre lieux et en avait traite quatre ; le troisieme —
                   « les silhouettes sont sous le seuil de perception » — n a
                   jamais ete mis en lot. Il l est ici, par sa cause : ce n est
                   pas le chanfrein qui est trop petit, c est qu un lieu ne
                   dispose que d UNE silhouette, redimensionnee. Trois lieux sur
                   quatre partagent donc le meme rectangle.
                   LES FAMILLES EXISTAIENT DEJA DANS LA TABLE, sans nom : la
                   barre de 0,230 x 0,036 de l Usine et son armoire de
                   0,048 x 0,090 ne sont pas le meme objet. `kind` les nomme
                   (`BLOCS`, table ordonnee append-only, `lieu` en declare le
                   proprietaire) et `BLOC[biome][kind]` les dessine — meme forme
                   que `DANGER[biome][kind]`, qui marche depuis le plan 14.
                   IL NE CIRCULE PAS SUR LE RESEAU et le serveur ne le lit
                   jamais : la geometrie se regenere des deux cotes depuis
                   (index, graine), et collision, navigation, apparition et depot
                   restent sur l AABB. Les quatre signatures d implantation sont
                   inchangees au dixieme — 7,0/4,2 %/x2,5/x11,4 pour l Usine
                   comme en 0.19.6 —, ce lot est de la PLOMBERIE et ne change pas
                   un pixel.
                   DEUX SENS VERIFIES, PAS UN : `verifierBiomes()` refuse un
                   obstacle qui porterait la famille d un autre lieu ET une
                   famille que plus aucune table ne tire, meme regle que pour les
                   props. `verifierBlocs()` refuse qu un `kind` soit prive de
                   fiche de dessin — sans lui, `fiche()` replierait en silence sur
                   la premiere famille du lieu, exactement le defaut que
                   `verifierFeedback()` traque pour les recettes de son.
                   Muet sur 200 graines x 4 lieux x 3 modes, navigation comprise.

     0.22.1 lot 2  LA FRICHE : L ABANDON, EN TROIS MATIERES. Elle avait UN objet
                   bati — un pan de beton fissure — decline en dix tailles. Elle
                   en a trois, et aucun n a cede de la meme facon : le PAN se
                   fissure, le MUR BAS se descelle (joints de banche, trous de
                   tige, couronnement parti par blocs, eboulis sur toute la
                   longueur), la CARCASSE rouille (tole plissee, cabine crevee,
                   moyeux nus, seule silhouette ORIENTEE du depot).
                   LE MUR BAS FAIT 36 PX DE HAUT, et c est pourquoi sa crete est
                   en MARCHES et non dentelee : a cette hauteur une morsure de
                   4 px fait le tiers de la piece et se lit comme du bruit.
                   TROIS EPAVES DE MEME GABARIT ETAIENT TROIS FOIS LE MEME OBJET.
                   Trois formats a surface egale a 3 % pres — couche, carre,
                   debout —, et la vue etant en 16/9 un format debout demande
                   h/w > 1,78 en fraction, pas 1,2. La branche verticale de la
                   silhouette ne s executait jamais avant ce changement.
                   L AIR AUSSI EST DU LIEU. Trois biomes sur quatre tiraient la
                   meme poussiere d atelier. Une friche n a plus de ventilation,
                   donc plus de courant d air : ce qui derive est ce que la
                   brousse relache — vert, deux fois plus lent, plus court, moins
                   nombreux. Et sa couche large de 1 200 px cesse d etre les
                   memes douze nappes rondes que partout ailleurs : elle porte le
                   LESSIVAGE (trainees longues et PARALLELES — une pente n a
                   qu une direction, c est ce qui separe une composition d un
                   tirage) et la COLONISATION, qui elle n en suit aucune.
                   « LA SILHOUETTE REMPLIT SON RECTANGLE » ETAIT ECRIT, PAS
                   TENU : rien ne le rejouait. `verifierEmpreinte()` fait
                   dessiner chaque famille dans un enregistreur de chemin et
                   mesure la part de rectangle vide, sur les gabarits REELS et
                   cinq positions. Seuil 12 %, pire cas 9,6 % (le debris de la
                   Nebuleuse, anterieur au plan). PIEGE PAYE : `graine(o)` vaut
                   ZERO en (0, 0), donc une forme mesuree a l origine tire sa
                   variante nulle — le banc annoncait 0,0 % sur le mur bas, ce
                   qui etait vrai et ne voulait rien dire.
                   Signature de la Friche inchangee : 10,0 / 4,4 % / x2,1 / x4,9.

     0.22.2 lot 3  L USINE : TROIS ROLES DANS UNE MEME LIGNE. La CHAINE
                   transporte, la CELLULE transforme, le POSTE commande. C est
                   le seul des quatre lieux dont le verbe soit au PRESENT, donc
                   le seul ou quelque chose bouge dans la masse batie : un taquet
                   court sur le tapis, au pas des rouleaux, et le groupe
                   d entrainement au bout donne un SENS a la piece — sans lui une
                   barre reste une barre. Mouvement CONTINU ET PERIODIQUE, donc
                   sans echeance, donc pas un telegraphe.
                   LA CHAINE EST LA SEULE PIECE DU DEPOT SANS UN COIN CASSE. A
                   368 x 32 px un chanfrein de 6 px ne se voit pas ; ce qui se
                   voit est qu une poutre de convoyeur est EXTRUDEE. Les trois
                   autres familles d Usine ont leurs coins coupes, celle-ci non.
                   LA CELLULE A UN BATI ET UNE TABLE, donc un profil en MARCHE.
                   Un caisson plein se lit « armoire » quelle que soit sa
                   taille ; ce qui dit « machine-outil » est qu une partie soit
                   haute et l autre basse, et qu on voie CE QU ELLE TIENT — la
                   table est nue et porte une piece. Marche a 12 % de la hauteur,
                   soit 14 px sur 117, pour 5,4 % d empreinte vide.
                   LE POSTE S OUVRE, et c est tout ce qui fait une armoire : un
                   joint de porte franc d un bord a l autre, une poignee dessus,
                   des ouies groupees du cote oppose. Les striations d avant
                   disaient « tole », ce qu on peut dire d une machine comme
                   d une caisse ; une porte ne se dit que d un meuble.
                   L USINE NE DERIVE PAS, ELLE TIRE. Le champ commun faisait
                   osciller son angle de ±0,30 rad — la signature d un courant
                   d air LIBRE, donc de tout sauf d une extraction. Son air a
                   maintenant une direction tenue (`swing: 0`, un reglage et non
                   un oubli), va trois fois plus vite, et n est pas horizontal :
                   a 0 exactement les brins se confondraient avec le trait franc
                   de la grille de 20 m.
                   DEUX TROUVAILLES DU BANC. `verifierEmpreinte` a leve
                   « g.rect is not a function » au lieu de mesurer du vide :
                   l enregistreur de chemin ignorait `rect`, que la chaine est la
                   premiere a utiliser. Et la bascule d orientation de `chaine()`
                   n aurait jamais tourne — la loi de ce lieu ne pose que des
                   bandes horizontales ; elle est retiree plutot que gardee.
                   Signatures des quatre lieux inchangees.

     0.22.3 lot 4  LA FONDERIE : LA CHALEUR ET LA MASSE, PAS L ORANGE. Trois
                   familles la ou une seule maconnerie servait aux trois. Le
                   FOUR garde son octogone — huit cotes egaux, peu coupes, une
                   masse posee. La CONDUITE ne coupe QUE ses coins de bout, et
                   profond : un cylindre vu de dessus a les flancs droits et les
                   bouts ronds, et il CONTINUE hors du cadre. La CUVE a un biseau
                   ALLONGE la ou le four les prend egaux — capsulaire au lieu de
                   trapu, donc pas un four en petit.
                   CE QUI REND UNE CONDUITE RONDE EST SON DEGRADE, rien d autre :
                   un aplat avec des lignes dessus reste une planche. Elle est
                   CALORIFUGEE, donc ce qui brule est dedans et ne se voit qu aux
                   JOINTS — une piece manifestement brulante qui n est pas une
                   source de lumiere de plus. La cuve, elle, montre sa SURFACE :
                   noire, avec des dechirures oranges qui ondulent. Du metal
                   liquide n est pas orange, il est croute et dechire.
                   NEUF CONDUITES PAR ARENE PORTAIENT UNE BOUCHE DE FOUR. Les
                   trois familles tiraient la meme `ledDe` ; une conduite ne
                   s ouvre pas. Sources fixes de ce lieu : 45 avant, 26 apres.
                   ET L EMBASE DE CHEMINEE N AVAIT JAMAIS ETE DESSINEE UNE SEULE
                   FOIS. Le seuil de la Fonderie valait 10, donc `(h % 10) >= 10`
                   etait TOUJOURS faux, donc `ledDe` ne rendait jamais `null`,
                   donc la branche `if (!l)` de `four()` etait morte — alors que
                   la charte declare que le pied des cheminees du premier plan
                   vit la. Le code disait le contraire de la regle, en silence.
                   Seuil a 6 : 8 fours sur 18 montrent leur bouche, 10 montrent
                   leur conduit, et la halle cesse d etre chaude partout.
                   L AIR MONTE, et c est l oppose terme a terme de l Usine : sept
                   fois plus lent, deux fois plus long, deux fois moins nombreux,
                   le trait le plus epais du depot. Teinte CENDRE et non fonte —
                   ce qui flotte a refroidi, le ton chaud reste a ce qui brule.
                   `AMB_DEFAUT` est SUPPRIME : les quatre lieux declarent leur
                   air, et un cinquieme qui ne le ferait pas n en aurait aucun
                   plutot que celui d un autre en silence.
                   Sa couche de 1 200 px n est plus les douze nappes rondes
                   communes : trois foyers TRES larges, des zones froides plus
                   profondes qu ailleurs, et AUCUNE nappe claire — le seul clair
                   de ce lieu doit venir de ce qui brule vraiment.
                   Signatures des quatre lieux inchangees.

     0.22.4 lot 5  LA NEBULEUSE : UNE STATION QUI S EST ROMPUE, EN TROIS TEMPS.
                   La TRAVEE tient encore — charpente au pas de sa propre
                   silhouette, membrures, goussets, feux qui courent. Le FRAGMENT
                   s en est detache : borde et non ajoure, un seul flanc
                   CISAILLE, et c est la seule piece du depot qui montre son
                   interieur structurel, uniquement la ou elle a casse. Le DEBRIS
                   n est plus qu un eclat : facettes, moignon, et du GIVRE sur la
                   face qui ne voit jamais d etoile. Une chronologie, pas trois
                   objets.
                   LE PLAN INTERMEDIAIRE MANQUAIT. Le fond avait trois vitesses —
                   0,05 / 0,10 / 0,16 — donc trois couches toutes a l infini ou
                   presque : rien entre le ciel et le plancher, alors que c est
                   la que se joue la sensation d espace. Une structure qu on
                   depasse dit la distance, une etoile ne le peut pas. `orbite()`
                   pose asteroides, modules et epaves a 0,22, tires par cellule
                   d un espace intermediaire. IL N EST PAS CUIT : une quatrieme
                   image de 2 200 x 1 500 aurait coute 13 Mo pour quelques pour
                   cent d occupation, et ce sont des SILHOUETTES, donc des
                   chemins. Plus rapide que les etoiles donc plus proche, donc
                   dessine APRES elles ; sous le voile de verre ; et seulement
                   dans les BAIES, par l argument qui avait deja sorti les
                   etoiles de `drawFond()`. Une seule direction de lumiere pour
                   toute la couche : dans le vide il y a un astre, pas douze.
                   TROIS DEFAUTS QUE LE BANC A LEVES, ET AUCUN NE SE VOYAIT.
                   Le debris laissait 9,6 % de son rectangle vide, le pire du
                   depot : il portait le chanfrein de 16 px du fragment sur un
                   gabarit de 58 x 29, soit quatre coins coupes de plus de la
                   moitie de la hauteur. Sa loi propre le met a 2,3 %.
                   La premiere travee alternait plat / creux d un nœud a
                   l autre — un CRENEAU, qui retire la moitie de la longueur :
                   12,7 %, au-dessus du seuil, et un joueur qui glisse le long
                   aurait bute sur du vide un pas sur deux. Un creux triangulaire
                   au nœud seul : 2,5 %.
                   Et le coin cisaille du fragment emettait ses deux points
                   toujours dans le meme ordre, alors que le premier est sur
                   l arete d ARRIVEE : trace qui se croise, 10,0 % mesures pour
                   3,4 % reels. Le seuil descend de 12 a 10 % — il avait ete pose
                   sur le debris a 9,6 %, et garder cette marge reviendrait a la
                   garder pour un defaut corrige.
                   Sa couche de 1 200 px porte l OMBRE DE LA CHARPENTE au-dessus,
                   deux bandes larges et paralleles. Un plancher de station n a
                   aucune raison d etre sale : rien ne s y depose.
                   Signatures des quatre lieux inchangees.

     0.22.5 lot 6  LES DANGERS : UNE ECHELLE PAR LIEU, ET SIX ENTREES QUI NE SE
                   RENCONTRAIENT PAS. `h.r` etait lu par `buildBiome` depuis
                   toujours (`h.r ?? d.r`) et AUCUNE table ne s en servait : tout
                   geyser faisait 70 px dans les quatre lieux, toute flaque 85.
                   Le dessin changeait, la geometrie non — et c est la geometrie
                   qu on joue. `ECHELLE` donne son gabarit a chaque lieu ;
                   l USINE N Y FIGURE PAS parce qu elle EST la reference, et les
                   trois autres se lisent par rapport a elle.
                   `dot` NE BOUGE PAS. Ce qui blesse doit blesser pareil partout,
                   sinon le joueur reapprend un bareme a chaque lieu. Un lieu se
                   dit par la TAILLE et le RYTHME, pas par le chiffre.
                   LE MODE NORMAL ETAIT LE MEME PARTOUT : deux champs de
                   ralentissement, meme rayon, meme place, 5,28 % de surface dans
                   les quatre. Toute une difficulte sans une once d identite.
                   Les deux dangers qui ne blessent pas sont pourtant deux verbes
                   opposes — l un freine, l autre emporte — et ca suffit : huile
                   a l Usine, scorie a la Fonderie, boue a la Friche, et a la
                   Nebuleuse le glissant le plus large des quatre.
                   COUVERTURE 3/5, 4/5, 3/5, 4/5. Quatre dessins n etaient tires
                   par aucune difficulte — le chariot de l Usine, la boue de la
                   Friche, le glissant de la Fonderie, l anomalie de la
                   Nebuleuse — pendant que l Usine et la Friche posaient des
                   `kind` sans dessin. Les quatre lieux posent desormais 5/5, et
                   `verifierDangers()` croise les deux tables DANS LES DEUX SENS :
                   une entree morte ne se signale jamais, et un `kind` sans
                   dessin replie sur `defaut()`, un disque ambre qui a l air d un
                   placeholder mais qui joue normalement.
                   ET LA FONDERIE DESSINAIT SON RALENTI ET SON GLISSANT AVEC LA
                   MEME FONCTION. Deux mecaniques opposees sous une seule image :
                   tant que le glissant n y etait pose nulle part ca n avait
                   aucune consequence, et c est ce qui rendait la chose
                   invisible. Il a son VITRIFIE — la matiere est deja dans sa
                   tuile de sol. Trois dessins nouveaux : bac de trempe (Usine),
                   front de combustion (Friche), vitrifie (Fonderie).
                   LE BUDGET EVINCAIT EN SILENCE. `buildBiome` jette ce qui
                   depasse `HAZARD_SURFACE_MAX` sans le dire : la Fonderie
                   perdait 3 flaques, 11 braises et 11 geysers sur un premier
                   equilibrage. `hazardJetes` les compte et `verifierBiomes()`
                   les refuse.
                   ET LES QUATRE RESTENT COMPARABLES, C EST VERIFIE : aucune
                   surface ne s ecarte de plus de 25 % de la moyenne des quatre a
                   mode egal. Normal 4,61 / 5,16 / 5,60 / 6,03 %, cauchemar
                   6,34 / 6,16 / 6,85 / 6,36 %. Le §28 rendu executable.

     0.22.6 lot 7  LA DIFFICULTE TOUCHE ENFIN LE TERRAIN. « La geometrie est la
                   MEME dans les trois modes, seuls les dangers changent » etait
                   ecrit comme un invariant depuis le plan 14 ; il tombe ici, et
                   c est le seul point du plan qui leve une regle du depot.
                   `min` sur une entree d `OBSTACLES` dit a partir de quel mode
                   elle existe — 0 partout, 1 des le normal, 2 en cauchemar seul.
                   CE QUI CHANGE EST CE QU IL Y A, PAS LA TAILLE DE CE QU IL Y A.
                   Un facteur d echelle sur `w`/`h` aurait donne la meme arene
                   grossie, donc le meme parcours avec moins de place ; une
                   entree en plus ou en moins change le CHEMIN. C est la
                   difference entre « plus exigeant spatialement » et « le joueur
                   ne peut plus bouger ».
                   ON OUVRE PAR LE CENTRE, ON RESSERRE PAR LE POURTOUR : les
                   entrees retirees au calme sont celles qui encombrent le milieu,
                   celles ajoutees au cauchemar sont pres des bords. Et ce que la
                   Nebuleuse ajoute est DESTRUCTIBLE — `celluleTraversable`
                   ignore les couvertures, donc densifier par la ne peut pas
                   fermer le carre central, et le joueur garde un moyen de
                   rouvrir un passage au tir.
                   MONOTONIE STRICTE, VERIFIEE. `verifierBiomes()` refuse qu un
                   mode n ait pas plus d obstacles ET plus de surface que le
                   precedent, par lieu. Trois modes qui produisent la meme
                   geometrie ne servent a rien ; un cauchemar plus OUVERT qu un
                   normal serait une inversion de signe que personne ne
                   remarquerait a l ecran.
                   Objets par vue : usine 5/7/9, fonderie 3/5/7, friche 6/10/12,
                   nebuleuse 4/7/9. Surface 2,9/4,2/5,3 — 5,1/6,8/8,5 —
                   2,6/4,4/5,3 — 5,6/7,0/7,3 %, plafond 10 % tenu.
                   LES QUATRE LOIS RESTENT SEPAREES AUX MEMES ECARTS — 47, 57,
                   87, 56, 75, 89 % : la loi est celle du cauchemar et les deux
                   autres modes en sont des retraits, donc `signatureBiome()` ne
                   bouge que d un facteur commun.
                   AUCUN PV, AUCUN DEGAT, AUCUN MULTIPLICATEUR. Le terrain n est
                   pas un second systeme de difficulte : `_teamPower()` et le
                   residu de `DIFFICULTIES` restent seuls.

     0.22.7 lot 8  L AMER : LE POINT QU ON MONTRE DU DOIGT. Le semis etait
                   homogene du premier au dernier pixel — rien ne disait ou l on
                   est, donc 4 800 x 2 700 se traversaient sans jamais se situer.
                   Ce qui manquait n etait pas du detail, c etait un POINT
                   UNIQUE. Un par arene, ancre au monde, tire par graine :
                   l embase de la tour de refroidissement et son pan qui a cede,
                   le cœur de ligne et ses ancrages d une machine demontee, le
                   creuset et son trou de coulee, le collier d amarrage et ses
                   griffes.
                   IL EST PLAQUE AU SOL, ET CE N EST PAS UNE ECONOMIE. Un grand
                   objet qui aurait du volume mentirait : le pathfinding verrait
                   du vide la ou l œil voit une masse, et c est exactement
                   l erreur que la charte interdit. Ce qui se lit comme bloquant
                   est un OBSTACLE, avec son AABB. Un amer est une EMPREINTE —
                   socle, fosse, creuset, collier — donc le plus grand element du
                   lieu est aussi celui qui ne coute PAS UN PIXEL de collision,
                   pas un octet de reseau et pas une source de lumiere.
                   Il passe SOUS la grille de 20 m : la graduation reste la seule
                   chose de l ecran qui serve a lire une portee.
                   ON PREND LE MOINS MAUVAIS, PAS LE PREMIER QUI PASSE. En
                   cauchemar l arene porte jusqu a 45 dangers : un « premier
                   emplacement libre » n aurait aucune garantie d exister, et un
                   repli silencieux poserait l amer sur une flaque — deux
                   marquages au sol au meme endroit, dont un seul blesse.
                   `verifierAmers()` l a d ailleurs signale : le premier jet
                   tirait UN decalage applique aux six candidats, donc un motif
                   rigide translate en bloc, donc six essais qui reussissaient ou
                   echouaient ensemble. La Friche — le lieu le plus dense —
                   tombait a 139-186 px pour une garde de 187, sur onze graines
                   sur quarante. Le defaut n etait pas la garde, c etait le
                   nombre de points reellement distincts : quatorze candidats,
                   chacun avec son propre ecart. Muet sur 200 graines.
                   Collision de nom evitee : `drawRepere` existe deja et c est la
                   mire de calage `?repere`. Le terme cartographique exact pour
                   un point de repere est un AMER.

     0.22.8 lot 9  VERIFICATION DU PLAN 19. Chiffres dans `LISEZMOI.md`.
                   CE QUE LE PLAN N A PAS TOUCHE EST SON RESULTAT LE PLUS FORT :
                   `shared/game_state.js` n apparait pas dans le diff, ni
                   `room.js`, ni `server.js`, ni `hub.js`, ni `public/net/`.
                   Trois mille lignes, et le cœur de simulation n a pas bouge
                   d un caractere — zero octet de reseau, zero regle de
                   deplacement, zero point de vie.
                   LE COUT DE NAVIGATION NE SUIT PAS LE NOMBRE D OBSTACLES : de
                   27 a 108 boites, `construireNav` reste entre 0,04 et 0,07 ms,
                   parce qu il est domine par l allocation de la grille (8 160
                   cellules) et non par le marquage. `diffuser` est plat a
                   0,17 ms, amorti a 0,014 ms par tick.
                   Le pas complet a 200 corps coute 0,117 a 0,146 ms, soit 0,9 %
                   du budget d image ; la geometrie de cauchemar ajoute au plus
                   20 % a celle de normal.
                   LA HORDE ARRIVE PLUS VITE EN CAUCHEMAR QU EN CALME, et ce
                   n est pas le terrain : c est le roster, la cadence et la rampe
                   de vitesse du plan 18. Le temoin garde donc le PROFIL FIXE et
                   ne change que la GEOMETRIE — seule facon d attribuer un ecart
                   au lot 7. Verdict : densifier le cauchemar coute 0,3 a 0,9 s
                   sur l approche mediane et ne bouche JAMAIS. Au pire un corps
                   sur 90 n arrive pas en 60 s, et le colosse a 44 px/s — signale
                   E4 au plan 18 — arrive a 95 % dans les quatre lieux.
                   L ESPACE JOUABLE decroit proprement : 91-95 % en calme, 89-92
                   en normal, 82-85 en cauchemar, avec un degagement median qui
                   passe de 171-196 px a 63-81. Monotone dans les quatre lieux et
                   sur les trois metriques.
                   SIX CONTROLES REJOUABLES, TOUS MUETS. Trois n existaient pas
                   avant ce plan, et LES CINQ DEFAUTS QU ILS ONT TROUVES ETAIENT
                   TOUS SILENCIEUX : l embase de cheminee jamais dessinee, la
                   travee en creneau, le trace qui se croise, les six entrees de
                   dangers qui ne se rencontraient pas, les candidats d amer
                   translates en bloc.
                   RESTE CE QU AUCUN BANC NE MESURE : le test du nom masque, le
                   cout de rendu par palier a `?perf`, et la lisibilite a 200
                   corps. Protocoles ecrits dans `LISEZMOI.md`.

     0.23.0 lot 1  LA MATIERE A L IMPACT, ET UN TIR QUI N ENTRAIT PAS. Premier
                   lot du plan 20. `MATIERE` disait ce qu une creature fait en
                   MOURANT ; elle dit maintenant aussi ce qu elle fait quand on
                   la TOUCHE, par un second champ `touche` sur les memes trois
                   lignes. Frapper un couvain, un colosse et un soigneur rendait
                   la meme gerbe blanche : le PALIER dit combien le coup a coute,
                   la MATIERE dit a quoi il s est heurte, et aucun des deux ne
                   redit l autre. L identite de l arme reste ou elle etait — la
                   bouche et la silhouette — donc le quatrieme canal n existe pas.
                   AUCUNE PARTICULE DE PLUS : `PALIER` garde le compte, le cone
                   et la vitesse ; la matiere plie la case d atlas, la teinte, la
                   duree, le freinage, la portance et la taille. `PARTICLE_MAX`
                   ne bouge pas.
                   UN TIR BLOQUE SE LISAIT COMME UNE TOUCHE. Dans
                   `_bulletHitInterne`, la seconde garde `e.shieldArc > 0` etait
                   INATTEIGNABLE depuis que la premiere teste en radians : c est
                   elle qui portait l effet de blocage, jamais pousse une seule
                   fois. Le porte-bouclier absorbait en incrementant `hitSeq`
                   sans degat, ce que le client lit comme un HIT_LEGER — eclair
                   blanc, etincelles, voix. Le blocage devient son propre
                   evenement (`kind: 18`, l angle d incidence dans `n`), ne
                   touche plus le compteur de touches, et rend une plaque qui
                   s allume EN TRAVERS de l axe avec des etincelles qui GLISSENT.
                   Recette `bloque` : l attaque d un impact et rien derriere —
                   c est l absence de queue qui dit que ca n est pas entre. Elle
                   prend la CLE `impact` du limiteur : un blocage est une touche
                   qui n est pas passee, pas une voix de plus.
                   `verifierFeedback()` croise desormais les dix champs de
                   `touche` — un zero pose par distraction ne leve rien tout seul.

     0.23.1 lot 2  LA LAME BALAYAIT TOUJOURS VERS L EST. `_lameTir` posait `ang`
                   et `n2` sur son effet ; la serialisation d `effects` portait
                   `[id,x,y,r,k,kind,owner,0,n]` — un ZERO LITTERAL a l index 7 —
                   donc le client lisait `f.ang ?? 0` et dessinait l arc vers
                   l est quelle que soit la visee. L arme la plus courte du jeu
                   n avait aucun canal disant OU elle frappe, et rien ne le
                   signalait : c est exactement ce que `??` fait taire.
                   L index 7 devient l ANGLE quand l effet en a un, et reste `y2`
                   pour les deux kinds d arc — meme emplacement, deux lectures,
                   comme l index 6 qui porte deja `x2` ou le proprietaire. Zero
                   octet de plus : la place etait deja envoyee, remplie de zero.
                   `n2` SE SUPPRIME AU LIEU DE SE TRANSPORTER : le second
                   tranchant vient d une carte, donc de `fullMods` du porteur —
                   comme la portee du reticule et la nappe du laser. Il en va de
                   meme pour l ouverture de l arc (`lameArc`), qu une carte
                   legendaire elargit de 15 % sans que le trace le sache.
                   LE BALAYAGE PASSE AU LIEU D APPARAITRE : traine en quatre
                   troncons dont l opacite tombe vers la QUEUE — c est le
                   gradient qui dit le sens, pas une fleche —, pointe fine et
                   claire, et un trait radial EN TRAVERS de l arc, sans lequel
                   une lame se lit comme une onde. Le contact EPAISSIT le trait
                   au lieu d ajouter une gerbe : a 2,5 balayages par seconde le
                   palier 2 ne paie pas de particules.

     0.23.2 lot 3  LA SCISSION EST LE SEUL CHIFFRE QUE LE FUSIL A DISPERSION
                   DEMANDE D APPRENDRE, et elle partageait son `kind: 14` avec
                   le blocage, le teleport de boss et la recolte : un petit
                   anneau, la meme chose que trois autres mecaniques, et pour
                   toute voix un `impact` transpose d une quinte.
                   Elle a son `kind` a elle (19), son sens de vol dans l index 7
                   ouvert par le lot 2, et son nombre de plombs dans `n`. La
                   FORME de la gerbe — parallele ou ouverte — se DEDUIT des
                   cartes du porteur : deux endroits ou ecrire « la gerbe s ouvre
                   de 0,8 rad » finiraient par diverger.
                   Ce qu elle dessine est UN CORPS QUI SE DIVISE : des rais qui
                   divergent depuis un point, dans le sens du vol, jamais un
                   cercle — et le point ou le porteur a cesse d exister RESTE en
                   place et s eteint, parce que c est lui qui marque la distance.
                   Recette `scission` : une bande qui S OUVRE vers le haut en
                   60 ms, sans grave et sans queue. La gerbe POUSSE au depart, la
                   scission CRAQUE 13 m plus loin, et les deux partagent la cle
                   `tirGerbe` du limiteur — l arme ne coute pas deux voix par
                   coup, et les deux ne se croisent jamais.
                   BRANCHE MORTE RETIREE : le second `if (f.kind === 14)` d
                   `actors.js` etait inatteignable — celui qui le precede fait
                   `continue` sur la meme condition.

     0.23.3 lot 4  TROIS RESSOURCES D ARME SUR QUATRE ETAIENT MUETTES. `armeRes`
                   circule depuis longtemps (index 36 du tuple joueur) et le
                   client le DESSINE quatre fois — nappe de chaleur, ligne de
                   charge, anneau de rampe, crans de chargeur. Seule la chaleur
                   avait une voix.
                   `routerFaisceau` devient `routerArme`, point de passage unique
                   et LOCAL : ce qu on entend est SA propre arme. Quatre joueurs
                   sur quatre railguns ne font pas quatre bourdonnements, et
                   aucune de ces voix ne dispute sa place a celles de la horde.
                   LA CHARGE DU RAIL est la meme horloge que la ligne de tir qui
                   se remplit : l oeil et l oreille lisent `armeRes`, donc ils ne
                   peuvent pas se contredire. Une seule voix, hors du limiteur,
                   gain en CARRE — le debut d une charge ne doit pas s entendre,
                   sa fin doit se sentir venir — et coupee a 0,98 : la fin de la
                   montee appartient au claquement du depart.
                   LE CHARGEUR SE COMPTE A L OREILLE, et le SENS DU PAS suffit a
                   le lire : `armeRes` descend par crans tant qu il reste des
                   obus, et monte en continu pendant la recharge. `dernierCoup`
                   previent, `recharge` ouvre la fenetre de 1,8 s ou l arme ne
                   rend rien, `rechargeFin` la ferme — et seule la derniere
                   RESOUT, parce que c est la seule des trois qui soit une bonne
                   nouvelle. Aucun champ ne s ouvre, aucun front ne vient du
                   serveur.
                   LA RAMPE S ENTEND SANS COUTER UNE VOIX : l assaut sonnait
                   pareil au premier coup et au trentieme, alors que tout ce qu
                   il enseigne est « reste ». La MEME voix de depart monte d un
                   demi-ton et s appuie avec `armeRes`, et elle redescend
                   progressivement quand le joueur bouge — comme la rampe.

     0.23.4 lot 5  LA CHALEUR BASCULAIT AU LIEU DE MONTER. Le faisceau virait au
                   rouge d un coup a 0,7 et ne disait RIEN avant : une jauge qu
                   on ne peut pas piloter est une jauge subie, et celle-ci est la
                   moitie de l arme.
                   Quatre choses montent ensemble et aucune n encombre l ecran :
                   la teinte GLISSE (`melange`), le halo s epaissit d un tiers,
                   le trace se met a TREMBLER au-dela de la moitie de la jauge,
                   et de la matiere s echappe du canon. L instabilite est une
                   fonction du temps et de l identifiant — ni tableau, ni
                   allocation — et elle reste sous le DEGRE : elle doit se
                   sentir, pas gener la visee.
                   LE COEUR RESTE FIN. C est lui qu on suit, et un coeur qui
                   grossirait avec la chaleur effacerait ce qu il traverse au
                   moment ou il faut le plus le voir. Il ne gagne que le
                   tremblement.
                   LA MATIERE N EXISTE QU EN HAUT DE LA JAUGE (0,45), sinon elle
                   dit « ca marche » au lieu de « ca chauffe ». Cadence bornee
                   par emetteur : le trace tourne a 60 Hz et plus, l emission a
                   16 — et le compte suit `glActive()` comme partout ailleurs.
                   AU SON, LA HAUTEUR NE SUFFISAIT PAS : elle dit « ca monte »,
                   pas « ca va lacher ». Ce qui le dit est que la note ne TIENT
                   plus, donc une gigue sur le FILTRE — un fondamental instable
                   sonne casse, un filtre instable sonne chaud — et un gain qui
                   suit la jauge, pousse seulement une fois l attaque finie :
                   deux automations au meme instant sur le meme parametre ne se
                   departagent pas.

     0.23.5 lot 6  L AMORCE DU TESLA N A JAMAIS ETE TRACEE. Le tuple d arc s
                   arretait a `y2` : `f.n` valait TOUJOURS zero cote client,
                   donc la branche « amorce » de `drawEffects` — le trait epais
                   et droit qu on a VISE, contre les arcs agites qu il declenche
                   — n a pas ete dessinee une seule fois depuis qu elle existe.
                   Troisieme champ mort du plan, meme famille que `f.ang` du
                   lot 2 : ecrit d un cote, jamais envoye, et `??` taisait tout.
                   L index 8 porte desormais le RANG du saut — 1 pour l amorce,
                   puis 2, 3, 4 — et il porte plus que la distinction perdue :
                   chaque saut coute 30 % de la decharge, et c etait la seule
                   chose que l image ne disait pas. Plus loin dans la chaine, le
                   trait est plus FIN, plus AGITE et plus PALE ; le nombre de
                   sauts se lit donc sans compter les traits.
                   UNE CHAINE EST UN EVENEMENT, PAS TROIS. Les segments d un
                   meme tir arrivent dans le MEME lot de differences et `claim`
                   en refusait deux sur trois : un rebond ne s entendait pas du
                   tout. `arcLot` les cumule et `flushArcs()` sonne UNE fois
                   apres le lot, avec la longueur de la chaine — la voix dure
                   plus longtemps et craque plus loin quand ca saute, et chaque
                   craquement DESCEND, parce que la decharge perd a chaque bond.
                   Trois sauts ne coutent toujours qu une place.
                   L entree 3 de `EFFECT_SOUND` se supprime : sa seule lecture
                   est morte.

     0.23.6 lot 7  LES QUATRE SOUFFLES PARTAGEAIENT LEUR COEUR. `blastCore` etait
                   le meme creme pour la nova, la detonation, l onde et la bombe :
                   quatre matieres differentes finissaient par le meme point, et
                   c est justement le point qu on regarde. Chaque coeur est tire
                   vers le FEU de son style — lumineux mais chaud, jamais blanc.
                   `COMBAT.flash` ne bouge pas et reste ou il est correct : sur l
                   eclair d une touche.
                   LA SECONDE ONDE DIT L ECHELLE, PAS UN RAYON PLUS GRAND. Elle n
                   existe qu au-dela d une magnitude — sur un petit souffle deux
                   anneaux ne disent pas « plus gros », ils disent « deux
                   souffles » — et elle est FINE, PLUS LENTE et va PLUS LOIN :
                   c est l ecart des deux vitesses qui donne la taille.
                   UN SOUFFLE A UN SENS, OU N EN A PAS. L obus du siege percute
                   et sa matiere continue devant lui ; la grenade est LOBEE, donc
                   elle retombe et n arrive plus de nulle part. `_sensBoom(b)` le
                   releve sur le VOL et jamais sur la visee — un projectile qui a
                   rebondi n arrive plus d ou il est parti — et `undefined` dit
                   RADIAL. Le cone des debris est la seule difference, et c est
                   celle qui separe les deux armes explosives a l oeil.
                   `ang` DEVIENT LE SENS DE TOUT EFFET QUI EN A UN : l incidence
                   d un tir bloque quitte `n`, ou elle n avait pas de sens, et
                   `events.js` le transporte. Un emplacement, deux lectures,
                   comme l index 6.

     0.23.7 lot 8  LE BANC, ET LE CONTROLE QUI AURAIT TROUVE LES TROIS DEFAUTS.
                   `verifierEffets(g)` refuse un champ pose sur un effet et
                   jamais transporte — la forme exacte des lots 2, 6 et du
                   `n2` supprime. Il ne DECLARE pas les emplacements du tuple,
                   une seconde liste diverge : il les MESURE en serialisant l
                   etat courant, et toute valeur numerique non nulle qui ne
                   ressort nulle part est perdue. Une valeur qui arrondit a zero
                   est rognee par `trimTail` et n est pas une perte. Temoin :
                   remettre `n2` a la main le fait parler immediatement.
                   LE MIX SE MESURE AVEC LE VRAI LIMITEUR. Un `AudioContext` de
                   papier laisse tourner les recettes du depot et `audioStats()`
                   rend donc les chiffres du jeu, pas ceux d un modele. Les
                   instantanes sont diffes par `diffSnapshots()` a 20 Hz avec la
                   vue reelle, et la manche est pilotee par `pilotage()` au
                   profil engage — un bot ecrit pour l occasion ne tue rien, et
                   un banc de mix qui ne tue rien mesure le silence.
                   AUCUNE VOIX VOLEE, A AUCUNE DENSITE NI SUR AUCUNE ARME. La
                   pointe monte de 8 a 14 sur 16 entre 50 et 200 corps : le
                   limiteur travaille, il ne rompt pas. Chiffres et protocoles
                   dans `LISEZMOI.md`.
                   RESTE CE QU AUCUN BANC NE MESURE : le cout WebGL par palier a
                   `?perf`, la lisibilite a 200 corps, et le contraste du retour
                   contre chaque sol — l additif sur un plancher clair est
                   justement le cas qui se juge a l oeil.

     0.24.0 lot 1  LE PROJECTILE LOURD, ET LA TRAVERSEE. Premier lot du plan 21.
                   LA GRENADE N AVAIT AUCUNE TRAINEE. Le baril tournait — deux
                   axes valent mieux qu un pour dire « objet LANCE » — mais rien
                   ne disait d ou il venait, donc l arme la plus lente du jeu
                   etait la moins anticipable. La trainee suit le VOL pendant que
                   le corps TOURNE, et c est tout le sujet : deux axes differents
                   sur le meme objet separent un objet lance d un projectile
                   tire. Elle est LOURDE ET DISCRETE — large, tres pale, courte —
                   parce qu une grenade doit s anticiper sans attirer plus l oeil
                   que le corps qu on vise. Trois troncons de trait, AUCUNE
                   particule : a une grenade par seconde et par joueur, le budget
                   du palier 0 ne paie pas de gerbe.
                   LA PULSATION DIT « ARMEE », et pas « ca va sauter » : la duree
                   de vie ne circule pas, et une pulsation qui accelererait
                   MENTIRAIT. Periode fixe, fonction de l identifiant, aucune
                   allocation, et elle reste sous le corps — la charte interdit
                   la boule lumineuse.
                   `vole` GARDE LA PREMIERE IMAGE : une balle neuve n a pas de
                   position precedente, et une trainee posee sur un axe suppose
                   pointerait vers l est pendant une image. Meme classe de defaut
                   que les trois du plan 20, evitee cette fois a l ecriture.
                   UNE BALLE QUI RESSORT NE LE DISAIT PAS. Le railgun et le fusil
                   de precision traversent une file entiere en rendant exactement
                   ce que rend une balle qui s arrete. Le client le SAIT deja —
                   l attribution par balle SURVIVANTE est precisement « elle est
                   ressortie », par opposition a la balle eteinte qui est morte
                   sur le corps — donc `perce` ne coute pas un octet de reseau.
                   UNE SEULE PARTICULE, et c est une LIGNE : ce qu il faut lire
                   est un axe qui continue derriere le corps. Une gerbe de plus
                   dirait « plus fort » au lieu de « ca passe a travers ».
                   MESURE : 100 % des impacts du fusil de precision portent le
                   drapeau, 0 % de ceux du tir standard.

     0.24.1 lot 2  LE REBOND A UN DEPART, ET UN EVENEMENT PORTAIT UN FAUX NOM.
                   L arc dit « ces deux corps sont relies » ; il ne disait pas
                   « l energie est PARTIE d ici VERS la ». Un chevron a l origine,
                   ouvert dans l axe du saut, le dit en trois traits — et il n
                   existe QUE sur un rebond (rang 1 et au-dela) : sur l amorce il
                   redirait le tir, qui a deja sa bouche. Il vit dans le meme
                   `globalAlpha` que l arc, donc il s efface avec lui et paie la
                   meme perte par rang.
                   L EVENEMENT « ricochet » N EN ETAIT PAS UN. `bd` est vide a
                   chaque diffusion, donc une entree presente avec un `d` a zero
                   veut dire « j ai touche le boss pour moins d un point », pas
                   « ca a rebondi » — le vrai ricochet de carte passe par
                   `_ricochet` et sort en arcs. Il devient `effleure`.
                   UN NOM FAUX NE LEVE RIEN, exactement comme un champ non
                   transporte : il envoie seulement le lecteur suivant chercher
                   le ricochet a l endroit ou il n est pas. Le RETOUR, lui, etait
                   deja juste et ne bouge pas d un pixel — une touche sous le
                   seuil d affichage merite une etincelle et rien de plus.

     0.24.2 lot 3  L ACTE FINAL, ET LA DERNIERE COLONNE DU POIDS.
                   LA MORT AVAIT SES QUATRE TEMPS — trois images de depouille, l
                   eclat de type, la matiere, le flux d XP — mais pas sa
                   CONSEQUENCE : ce que le corps maintenait POUR LES AUTRES s
                   arretait en silence. `finalDe(def)` le deduit de ce que la
                   creature TENAIT, exactement comme `matiereDe` deduit de ce qu
                   elle fait : `lienRange` rend un dernier arc vers le corps qu
                   elle aurait pu relier, `auraRadius`/`egideRadius` un champ qui
                   SE RETRACTE, un rayon de type >= 20 un anneau court et epais
                   plus trois morceaux lents. Aucun champ neuf dans le bestiaire.
                   QUATRE LIGNES SUR TREIZE, ET C EST LA CONDITION. Un acte de
                   fermeture sur les treize types sortirait 20 a 60 fois par
                   seconde : ce ne serait plus une information, ce serait du
                   bruit. Le rayon est celui du TYPE et non de l instance — une
                   elite ne change pas d acte, elle joue le sien en plus gros.
                   AUCUNE MECANIQUE DE RENDU EN PLUS : le champ est un `burst`
                   dont le rayon MAXIMAL est plus petit que celui de depart, donc
                   il rentre au lieu de s ouvrir, et c est la seule chose a dire.
                   L arc, lui, est une DONNEE que `fx.js` pose et qu `actors.js`
                   trace : `drawArc` vit une couche plus haut, et un module n
                   importe que vers le bas.
                   LE POIDS PILOTE ENFIN LE TRESSAILLEMENT. `PALIER` decidait de
                   l eclair, des eclats, du cone, de la poussiere, de l onde et
                   de la voix — la regle vivait a un seul endroit SAUF pour
                   celle-la. Il n existe que sur SES PROPRES coups lourds, et les
                   deux bornes comptent : « lourd » vaut 2 % des touches, soit
                   0,53/s pour toute l equipe, et le reserver a son tireur le
                   ramene sous 0,15/s. 1,2 px sur une vue de 1 600 : il se SENT,
                   il ne se voit pas. Un coup lourd d un allie ne secoue pas MON
                   ecran — il a deja son onde, son noyau et sa voix.
                   `col` NE POUVAIT PAS REPONDRE « est-ce mon coup » : il est nul
                   aussi bien pour moi que pour une source sans proprietaire —
                   zone, brulure, danger. Le drapeau se pose donc explicitement.

     0.24.3 fix    LE TRESSAILLEMENT DE TOUCHE PASSE DE 1,2 A 0,7 px, sur retour
                   de jeu. La borne de FREQUENCE etait la bonne — ses propres
                   coups lourds seulement, sous 0,15/s — mais l amplitude ne l
                   etait pas : a 12 % de `SHAKE_MAX` il commencait a se lire
                   comme une petite detonation, et le tressaillement franc doit
                   rester le seul a dire ca. A 7 % il se SENT sans se voir, et il
                   ne peut plus se confondre avec l onde d un souffle.

     0.25.0 lot 1  LE BANC A L ECRAN. Premier lot du plan 22. Quatre protocoles
                   de `LISEZMOI.md` etaient restes ouverts, et tous pour la meme
                   raison : ILS SE JUGENT A L OEIL. Aucune simulation ne dit si
                   une arme est reconnaissable, si un faisceau se voit sur un
                   plancher clair, ou si le retour a 200 corps est spectaculaire
                   plutot que bruyant. Ce qui manquait n etait pas la difficulte,
                   c etait l OUTIL : pouvoir choisir l arme, la densite et le
                   lieu sans relancer dix manches.
                   `BANC=1` cote serveur, `?banc` cote client, et LES DEUX
                   MOITIES SONT NECESSAIRES : un joueur ne peut pas s ouvrir le
                   catalogue depuis sa barre d adresse. Meme statut que `BIOME`
                   et `GRAINE`, qui existaient deja pour la meme raison.
                   1-0 les dix armes, [ et ] la densite par pas de 50, H coupe le
                   HUD. L ETIQUETTE DU BANC TOMBE AVEC LE HUD, et c est le point :
                   le test du nom masque exige que TOUT ce qui nomme l arme se
                   taise, sinon il ne teste rien.
                   AUCUN SECOND CHEMIN D APPARITION : le remplissage passe par
                   `_spawnEnemy`, donc il voit les obstacles, les quotas de type
                   et l adaptation au niveau. Le plafond est MASQUE sur l instance
                   — une propriete propre couvre la methode du prototype, et la
                   supprimer la rend — donc `_enemyCap()` reste le point de
                   passage unique et le jeu hors banc ne connait pas ce chemin.
                   Le banc TIENT la population au lieu de la poser une fois : les
                   corps meurent, et une densite qui retombe ne mesure rien.

     0.25.1 lot 2  LE RELEVE. `?perf` MONTRE les chiffres, il ne les RETIENT pas.
                   Quatre densites fois cinq paliers de qualite font vingt
                   relevés, et recopier a la main un compteur qui bouge en donne
                   vingt dont aucun n est comparable au suivant — c est ce qui a
                   tenu ce protocole ferme, pas la difficulte de la mesure.
                   `R` echantillonne dix secondes et imprime UNE ligne prete a
                   coller, dans la console ET le presse-papier, en la laissant a
                   l ecran. Elle porte le palier, le rendu, l arme, la densite,
                   les FPS, le temps d image, `draws`, `quads`, la pointe de
                   fragments et les trois compteurs du limiteur.
                   LE PIRE CENTILE COMPTE PLUS QUE LA MOYENNE, et c est pour ca
                   que la ligne porte les DEUX : un rendu a 60 images en mediane
                   qui tombe a 22 sur les souffles est pire qu un rendu plat a
                   50, et c est justement la mediane qui le cache. Le p95 du
                   temps d image est ce qui se SENT a la manette.
                   Le temps mesure est le BRUT et non `dt` : celui-la est
                   plafonne a 0,1 s pour la simulation, donc il ment exactement
                   sur les images qui coutent.
                   AUCUNE ALLOCATION PAR IMAGE : trois tableaux poses au
                   demarrage, remplis en place, tries une seule fois a l echeance.
                   L echeance vit dans `core/state.js` parce que la touche est
                   couche 19 et la mesure couche 14 — une liaison ES est morte a
                   l ecriture, donc elle passe par un setter.

     0.25.2 fix    LE p95 RATAIT EXACTEMENT CE QU IL CHERCHAIT, et c est son
                   propre controle qui l a dit : sur 105 images dont 5 a 45 ms,
                   la pointe pese 4,76 %, donc le p95 tombe JUSTE EN DESSOUS et
                   rend 60 images par seconde sur un echantillon qui en perd
                   cinq. Une mesure qui manque ce qu elle cherche est pire qu une
                   mesure absente : elle rassure.
                   La ligne porte desormais le p99 ET LE MAXIMUM. Trois formes de
                   pointe, trois lectures : a 5 % le p99 la voit, a 1 % il la
                   rate deja et c est le maximum qui la tient, et sur UNE image a
                   120 ms le maximum est le seul temoin. Le p99 dit ce qui se
                   sent a la manette, le maximum dit s il existe une image qui
                   saute.
                   Trouve en verifiant le lot dans la minute qui a suivi sa
                   livraison, par un controle qui tient en douze lignes et qui ne
                   demande pas de navigateur — les centiles sont du code pur.

     0.26.0 lot 1  QUATRE BONUS SUR TREIZE NE SONT JAMAIS TOMBES. Premier lot du
                   plan 23. `damage`, `rate`, `double` et `pierce` sont dans
                   `POWERUP_TYPES` depuis le premier commit, absents de
                   `POWERUP_ROTATION` depuis le premier commit, et les trois
                   autres points d apparition — l elite, le `ravitaillement`, la
                   carte Recolte — passent TOUS par `_randomPowerupType()`. Leur
                   effet est ecrit, leur bit de reseau est ecrit, leur pastille de
                   HUD avec son compte a rebours est ecrite, leur insigne sur le
                   corps du joueur est ecrit : quatre chaines completes que rien
                   n allumait. Un tableau exporte dont on ne tire qu une partie ne
                   leve rien.
                   SIX RAMASSAGES POUVAIENT NE RIEN RENDRE. `heal` a PV pleins,
                   `fragment` a PV pleins, `purification` sans etat pose : le
                   surplus part maintenant en bouclier par `_soinBonus`, comme
                   celui du Soigneur dans `_heal`, et une purification a vide
                   rend la moitie d un soin. `shield` plafonnait a
                   `CFG.SHIELD_POOL` ecrit comme plafond ABSOLU : une build
                   bouclier au-dela de 80 ramassait la pastille pour rien —
                   `_capBonus(p)` ajoute les 80 A la jauge de la build. La balise
                   ecrivait `o.shield` a la main, donc sans plafond ni relais
                   `shieldShare` ; le montant ne bouge pas, le chemin oui.
                   `slow` ECRASAIT au lieu de prendre le maximum, et coupait donc
                   net le ralentissement plus long de la carte Instinct.
                   `fragment` sortait par `return` avant le partage : son entree
                   dans `PARTAGEABLES` etait morte.
                   `noHeal` (Serment de fer) etait CONTOURNE — le soin d un bonus
                   ne passe pas par `_heal`. Il coupe desormais la part PV et
                   laisse passer la part bouclier : la contrepartie dit « aucun
                   soin recu », pas « aucun tampon ».
                   `verifierBonus()` MESURE les trois questions au lieu de les
                   declarer : un type qu aucune source ne fait tomber, un
                   ramassage dont l empreinte de combat ne bouge pas sur un etat
                   defavorable mais plausible, et un bit d arme pose que la balle
                   ou la cadence ne lit pas. L effet pousse a l ecran ne compte
                   PAS comme un ecrit — c est lui qui masquait la purification a
                   vide. Temoins : remettre l ancien soin fait parler heal,
                   fragment et purification ; retirer trois entrees de la rotation
                   les nomme toutes les trois.

     0.26.1 lot 2  UN TIRAGE PLAT FAIT TOMBER UN SOIN SUR UNE EQUIPE INTACTE.
                   Onze types se partageaient la rotation a parts egales, donc
                   une nova sur un ecran vide, une perforation sur un faisceau qui
                   traverse deja tout, une cadence sur une arme a `interval` nul —
                   la pastille est ramassee, elle ne rend rien, et le joueur
                   apprend a ne plus se detourner. Le poids devient une FONCTION
                   de l etat : PV manquants, corps a l ecran, boss, joueurs a
                   terre, et CE QUE LES ARMES DE L EQUIPE SAVENT LIRE
                   (`litCadence`, `litCanons`, `litPerce`, `litRebond`, a cote de
                   la table qui les porte). Jamais un interdit : le plancher
                   `CFG.POWERUP_POIDS_MIN` garde les onze tirables, y compris
                   celui qui ne sert pas maintenant.
                   LA DENSITE NE SE NORMALISE PAS SUR LE PLAFOND. Premiere
                   ecriture : `enemies.length / _enemyCap()`. MESURE : 29 corps
                   medians a deux joueurs pour un plafond de 370, donc une densite
                   de 0,08 en permanence et une nova qui tombait trois fois moins
                   qu une part plate. La reference est la FOULE par joueur vivant,
                   `CFG.POWERUP_FOULE = 28`, reglee pour que la mediane tombe a
                   mi-echelle.
                   LE FRAGMENT BLOQUAIT LE GENERATEUR. Il tombe d une carte, sur
                   un kill, donc par dizaines, et il comptait dans
                   `POWERUP_MAX_GROUND` : 55 % des apparitions d une manche
                   cauchemar a quatre joueurs, et le sol reste plein — exactement
                   le releve de 0.8.12, dont la cause n avait jamais ete nommee.
                   Les deux populations ont chacune leur plafond.
                   LA PURIFICATION GARDE SES DEUX CONSTANTES et gagne son facteur :
                   la chance est modulee par les etats reellement poses, plancher
                   quand l equipe est propre, x2 quand chacun en porte un.
                   `mesureBonus()` compte les APPARITIONS et non les ramassages —
                   le bot ne se detourne pas, c est un fait releve en 0.8.12 — et
                   `verifierTirageBonus()` refuse un type qui depasse le double de
                   sa part plate ou qui tombe sous le cinquieme. Le denominateur
                   est la ROTATION seule : le fragment et la purification ont
                   chacun leur source. MESURE, six couples (difficulte, effectif),
                   3 x 25 min : toutes les parts entre 6,3 et 12,4 % pour une part
                   plate de 9,1 %, aucune sortie.
                   AUCUN LEVIER DE DIFFICULTE dans la table de poids : compenser
                   un mode par des recompenses est le defaut que le plan refuse.

     0.26.2 lot 3  TREIZE DISQUES IDENTIQUES, UN SEUL SON, AUCUN PREAVIS. Un bonus
                   se ramasse EN COURANT : l icone est ce qu on lit en dernier, et
                   c etait la seule chose qui separait les treize. Le socle prend
                   la forme de sa FAMILLE — disque pour ce qui rend au corps,
                   hexagone pour ce qui arme le tir, losange pour ce qui se pose
                   dans l arene — et la teinte reste celle du type. Troisieme
                   sujet de `feedback.js`, meme regle qu aux deux autres : la
                   famille porte la matiere, le type porte l identite. Elle se
                   DECLARE et ne se deduit pas, `POWERUP_TYPES` etant une liste de
                   clefs sans champ de mecanique.
                   TROIS RECETTES, UNE SEULE PLACE DE VOIX. `bonusSurvie`,
                   `bonusArme`, `bonusTerrain` partagent la clef `bonus` du
                   limiteur — un ramassage est un ramassage. Le RANG ajoute une
                   quinte au-dessus et un second anneau au sol, jamais du gain ni
                   de la taille : « rare » se dit en hauteur et en portee
                   (RENDU.md, palier 2). Trois types sur treize le portent.
                   UN BONUS QUI EXPIRAIT SONNAIT COMME UN BONUS RAMASSE. Le seul
                   critere etait « l identifiant disparait pres d un joueur », et
                   la portee de ramassage monte pourtant a 146 px avec la carte
                   d aimantation contre 80 px de test : un bonus attire de loin
                   disparaissait EN SILENCE. La part de vie restante prend le
                   cinquieme emplacement du tuple `w` et tranche aux deux bouts —
                   `bonusNe` a l apparition, `bonus` au ramassage, `bonusPerdu` a
                   l extinction. Elle ne se deduit pas : l instantane FILTRE par
                   vue, donc une horloge locale demarrerait a l entree dans le
                   champ et ferait naitre une seconde fois un bonus deja vieux.
                   LE CADRAN NE S ALLUME QU AU DERNIER TIERS, sinon treize
                   horloges tournent en permanence. L apparition DEPASSE puis
                   retombe : une montee lineaire fait « animation », un
                   depassement fait « ca vient de tomber ». Une occasion perdue n a
                   pas de voix, trois grains qui retombent.
                   LE MOT EST L EXPLICATION. `hudLabel` monte le nom du bonus a
                   l endroit du ramassage, dans sa teinte ; il ne FUSIONNE pas,
                   contrairement aux chiffres de degats — deux ramassages sont deux
                   faits. Le francais est ecrit a cote de `POWERUP_STYLE`, la
                   surcharge se fait par clef `bonus.<type>`.
                   `_poserBonus()` devient le point de pose unique : cinq endroits
                   ecrivaient le bonus a la main et QUATRE ignoraient la cendre,
                   dont les depouilles d elite. `verifierFeedback()` croise les
                   quatre recettes neuves et refuse un type sans famille.

     0.26.3 lot 4  VINGT-QUATRE RELIQUES, HUIT FORMES DE DEGATS BRUTS, SEPT
                   ARCHETYPES VIDES. Le critique, le bouclier, la cadence, le
                   controle, les explosions, la mobilite et la RESSOURCE d arme
                   n avaient aucune relique — la cadence en avait une, le controle
                   une, le bouclier une. Onze reliques neuves les ouvrent, en
                   queue de `RELICS` : `lentille_taillee`, `verre_taille`,
                   `dissipateur`, `barillet_long`, `culasse_froide`, `ancrage`,
                   `gaine_creuse`, `coque_stratifiee`, `givre_de_poche`,
                   `culasse_legere`, `pas_de_cote`. Chacune porte une exigence
                   d arme ou une contrepartie ecrite : une relique sans condition
                   ni cout est un pourcentage de plus.
                   `requiresArme` FILTRE L OFFRE SUR L ARME PORTEE
                   (`ARME_EXIGENCE`, predicats sur la fiche d `armes.js`). Une
                   relique de chaleur sur un railgun etait un emplacement d offre
                   perdu. Le filtre vit au meme endroit que `minPlayers` — ET dans
                   `visePalier()`, sinon l acheteur du banc vise un palier que le
                   tirage ne peut pas lui montrer et relance a vide.
                   AUCUN COUT SUR LES DEGATS BRUTS. Premiere ecriture :
                   `culasse_legere` valait -14 bruts. Une arme nominale fait 7 a
                   53, et un flat s applique PAR PLOMB sur la dispersion : le
                   malus retournait le SIGNE du degat sur l assaut. Les
                   contreparties portent donc sur les PV ou sur une recharge, deux
                   axes bornes qui ne peuvent pas passer sous zero.
                   L ACHAT RECALCULE TOUJOURS. La liste des champs qui exigeaient
                   `_recomputeAll()` (`flatHp`, `allyFlatHp`) etait a tenir a jour
                   a la main, et la moitie des reliques neuves touche `mods` : un
                   achat par visite, sur un ecran, le recalcul complet ne coute
                   rien. Le panneau de stats suit — critique et jauge de bouclier
                   se lisent au point d application, donc le client les manquait.
                   `verifierReliques()` MESURE que chaque champ apparait comme
                   litteral dans la source des methodes de `GameState` — une
                   relique se lit a un POINT D APPLICATION, donc un champ mal
                   orthographie ne leve rien du tout — et qu un malus porte sa
                   `contrepartie` ecrite. Un nombre negatif n est pas un malus :
                   `rateFlat` descend quand la cadence monte.
                   MESURE, `verifierMarchand([1,4], 6)` : MUET, la ou le depot
                   sortait « 41 % de visites relancees, bande 15-40 % » avant le
                   lot. 15/10/8/2 reliques par palier, la proportion d avant a
                   35 pieces. 1j : 5 achats, 40 % du catalogue vu, 21 % de
                   relances. 4j : 5 achats, 43 % vu, 32 % de relances.

     0.26.4 lot 5  LE LOT 1 AVAIT UNE DETTE, ET `LISEZMOI` LA DISAIT DEPUIS
                   LONGTEMPS. « Quatre bonus sur treize ne tombent jamais »
                   n etait pas un oubli : la section « Retrait des bonus au sol »
                   enregistre le retrait comme une DECISION MESUREE, anterieure au
                   premier commit du depot. Et elle tenait quelque chose que le
                   lot 1 n avait pas vu : la rotation a sept types comptait TROIS
                   bonus de survie sur sept, soit 42,9 % des chutes. A onze types
                   et poids egaux ils tombent a 29 %, et la survie mediane passe
                   de 1 044 a 708 s. Le retrait n economisait pas du code, il
                   CONCENTRAIT les chutes sur le soin.
                   LES POIDS DE SURVIE MONTENT D AUTANT. `heal`, `shield` et
                   `beacon` reprennent 41,2 % des chutes — c est le MIX qui
                   change, pas la cadence, `POWERUP_MIN/MAX` n a pas bouge du
                   plan. A/B seize manches par bras, meme processus, seule
                   `POWERUP_ROTATION` differe : 906 s de moyenne contre 876,
                   692 s de mediane contre 710, pour un ecart interquartile de
                   1 000 s. LA SURVIE NE BOUGE PAS, et le temps passe avec un
                   bonus d arme actif est MULTIPLIE PAR QUATRE (7,9 % contre
                   2,0 %). C est ce que le plan visait : de la variete, pas de la
                   puissance.
                   SEIZE MANCHES ET PAS SIX. Le meme A/B a rendu successivement
                   708/1044, 961/896 puis 1055/367 a six manches : la mediane
                   d une manche de survie avec bots oscille d un facteur trois.
                   Le seul chiffre stable a six est l uptime.
                   LE PLANCHER EST UNE PART, PAS UN POIDS. `POWERUP_POIDS_MIN`
                   valait 0,20 en absolu, or le total monte avec les PV
                   manquants : le ricochet d une equipe qui ne sait pas le lire
                   passait sous le cinquieme d une part plate en cauchemar, et
                   nulle part ailleurs. `CFG.POWERUP_PART_MIN = 0,04` garantit
                   par CONSTRUCTION ce que le critere verifie.
                   ET LE CRITERE MANQUAIT D ECHANTILLON : a 66 apparitions un type
                   au plancher en vaut 1,2, donc « ricochet 1,8 % » tenait a UN
                   tirage. Vingt par type, et les huit couples (difficulte,
                   effectif) sont muets.
                   LE GENERATEUR SE MESURE BLOQUE, PAS PLEIN. L occupation moyenne
                   depasse le plafond a quatre joueurs parce que les depouilles d
                   elite ne le consultent pas — c est voulu, une recompense de
                   kill tombe toujours. Ce qui se mesure est la part du temps ou
                   l echeance est passee ET le sol plein : 1 a 9 % a un et deux
                   joueurs, la ou 0.8.12 le decrivait bloque la plupart du temps ;
                   21 a 24 % a quatre, et c est structurel.
                   `verifierRythmeBonus()` tient les deux invariants — sol et part
                   de survie. `mesureRamassage()` a ete ECRITE PUIS RETIREE : elle
                   embarquait un second pilote alors que `pilotage()` va deja
                   chercher les bonus, et `manchePilotee` comptait deja poses,
                   ramasses et perimes. Deux chemins pour la meme mesure valent
                   deux mesures qui divergent. Chiffres dans `LISEZMOI.md`.

     0.27.0 lot 1  LE PALIER S OUVRE AU PLANCHER, PAS A LA RUPTURE PRECEDENTE.
                   `BAR_DWELL` comptait depuis `lastBreak`, donc une barre fondue
                   en 2 s laissait 8 s ou le boss ne prenait plus rien et une
                   barre lente n en laissait aucune : LE TEMPS MORT ETAIT MAXIMAL
                   EXACTEMENT QUAND L EQUIPE JOUAIT LE MIEUX. Le defaut n etait
                   pas le niveau moyen (10 % a la mediane) mais la VARIANCE — 4 %
                   au Ravageur contre 54 % a l Oracle en calme, 42 % en normal,
                   40 % au Metronome, 37 % au Veilleur a quatre.
                   `PALIER_TIME` remplace `BAR_DWELL` et `FINAL_BAR_DWELL`, et le
                   levier de profil `dwell` devient `palier` (1,0 / 1,4 / 1,8 —
                   il monte toujours avec la difficulte, c est la que se joue la
                   mecanique de la phase suivante). Mesure apres : 5 a 17 %
                   partout, contre 0 a 54 % avant.
                   ELLE EST COURTE PARCE QUE LA MESURE LE DIT. Premiere ecriture
                   a 2,6 s : quatre paliers pesaient 10,4 s sur un combat de 53 s,
                   soit 20 % — plus de temps mort que la regle qu elle remplacait
                   n en produisait a la mediane. Le niveau et la variance sont deux
                   reglages, et seul le second etait casse.
                   `b.finalLibre` EST LE TERMINUS DE LA DERNIERE BARRE DU FINAL.
                   Elle a son palier comme les autres ; sans terminus le plancher
                   se rouvrait a l image suivante, `palierOuvert` retombant a zero
                   des que le plancher disparait — un boss final immortel.
                   `verifierBoss` gagne un critere PAR BOSS (duree et part de
                   palier) : la mediane par SEGMENT melange cinq boss tires au
                   sort, donc un boss aberrant s y noie — releve 189 s a la
                   Matriarche en solo pour une bande de 50 a 90 s, invisible au
                   critere de segment. Et la bande du final passe de
                   `[7 x FINAL_BAR_DWELL, 180]` a `[2 x 50, 2 x 90]` : la borne
                   basse etait un plancher de sejour qui n existe plus.
                   LE CRITERE PAR BOSS SE DECLARE NON MESURE PLUTOT QUE VERT.
                   Six manches ne donnent que trois ou quatre combats par boss et
                   la duree d un meme boss va de 49 a 126 s : `BOSS_ECHANTILLON_MIN`
                   vaut 8, et en dessous `verifierBoss` NOMME les boss qu il n a
                   pas pu juger. Un critere qui passe au vert sans avoir rien
                   regarde est le defaut que ce lot vient de trouver ailleurs.

     0.27.1 lot 2  L EMPORTEMENT SE COMPTE PAR BARRE. `ENRAGE_AT` valait 150 s et
                   `FINAL_ENRAGE_AT` 300 s contre des combats de 40 a 120 s :
                   0 % des combats en calme, 0 % en normal a deux joueurs, 4 % a
                   quatre, 8 % en solo, JAMAIS sur un final. Un anti-enlisement
                   qui ne part jamais est du contenu mort, et le critere ne le
                   voyait pas — `BOSS_ENRAGE_MAX` etait un plafond SANS PLANCHER.
                   `ENRAGE_PAR_BARRE x b.bars` remplace les deux constantes : le
                   nombre de barres est ce qui fait la longueur d un combat, donc
                   un boss a huit barres a plus de temps qu un boss a cinq sans
                   qu on ecrive une seconde constante pour lui. 105 s pour un
                   ordinaire, 168 s pour le final, 126 s pour le Silence.
                   21 EST LU SUR LA DISTRIBUTION : 82 combats ordinaires, huit
                   manches, trois effectifs — p50 65 s, p75 90 s, p90 118 s. 18 s
                   par barre donne 26 % de combats emportes, 21 en donne 15 %,
                   24 en donne 10 %.
                   `BOSS_ENRAGE_MIN` ferme la bande. Un critere a une seule borne
                   laisse passer « jamais », et c est exactement ce qui s est
                   produit pendant tout un plan.
                   CE QUE LA MESURE A REFUSE DE DONNER : la bande aux TROIS
                   effectifs. Au meme seuil, 48 % des combats ordinaires partent
                   en emportement en solo, 0 % a deux, 6 % a quatre — parce que
                   les combats solo durent le double. Aucune forme de seuil ne
                   rattrape un ecart de DUREE ; le lever ici reviendrait a
                   compenser un desequilibre par une punition. Le critere le dit
                   maintenant au lieu de le taire.

     0.27.2 lot 3  LA RESPIRATION DU FINAL, PAYEE EN PV. Le lot 1 lui avait deja
                   rendu ses paliers (0 % du combat avant, 11 a 13 % apres) ;
                   restait qu ils etaient tous de la meme longueur. Sept ruptures
                   qui ouvrent chacune une couche, toutes cadencees pareil, sont
                   une escalade sans palier de lecture.
                   `FINAL_PALIER_RAMP` allonge la fenetre avec la phase :
                   1,38 · 1,88 · 2,37 · 2,87 · 3,35 · 3,85 · 4,33 · 4,82 s,
                   mesurees dans le moteur. La derniere — celle ou il devient
                   tuable — vaut 3,5 fois la premiere, et le patron differe par
                   `PALIER_AMORCE` s y RESOUT au lieu de deborder : la mecanique
                   de la phase suivante se joue pendant qu il est invulnerable,
                   ce qui est l intention ecrite du palier depuis le debut.
                   ELLE SE PAIE EN PV, JAMAIS SUR L HORLOGE. `FINAL_HP_MUL`
                   1,30 -> 1,17, de ce que les fenetres ajoutent (11,2 -> 24,9 s).
                   Ce qui change est la COMPOSITION du combat : moins de fonte,
                   plus de moments etages. Ajoutee par-dessus elle rendait 182 s
                   a quatre joueurs, hors de la bande.
                   MESURE : part de palier du final 11-13 % -> 21-23 %. Duree a
                   deux joueurs 99 -> 109 s, donc DANS la bande. A un joueur la
                   mediane bouge de 87 a 147 s sur quatre combats, ce que
                   l echantillon ne separe pas de la fourchette historique
                   (82-152 s) : la duree par effectif demande le protocole
                   profond, meme conclusion qu au lot 1.

     0.27.3 lot 4  UN BOSS A UNE VOIX, ET ELLE SE DEDUIT. Onze boss partageaient
                   UN son d arrivee (`boss`) et UN son de rupture : le seul canal
                   d identite qui n avait rien a lui, alors que la silhouette, la
                   teinte, le verbe, le repertoire et l archetype en ont un.
                   L ARCHETYPE PORTE LA MATIERE. C est deja ce qui separe les
                   boss — `ARCHETYPES` dit comment chacun DEFORME l arene et
                   `verifierArchetypes()` en garantit l unicite sur le pool —
                   donc la deduction se paie une seule fois et un dixieme boss de
                   pool arrivera avec sa voix. Neuf jeux : le guetteur tient une
                   sinus mince sans aucun bruit, le batisseur un creneau qui
                   descend d une marche, le reflet un battement a 1,03, l ancre un
                   grave tenu, le constricteur une voix qui DESCEND, le diffus un
                   granuleux a 1,01, le multiple une QUINTE, le mobile une voix
                   qui MONTE, le fixe la reference.
                   LES BARRES PORTENT L ECHELLE. Trois finaux partagent « fixe »
                   — le roster l autorise, un seul sort par manche — mais pas leur
                   nombre de barres : Recitant 98->82 Hz, Silence 92->77,
                   Amalgame 83->70, et la duree monte d autant. Les onze arrivees
                   se separent donc quand meme.
                   UNE SEULE RECETTE, `bossVoix`, neuf jeux de parametres. La
                   table porte les nombres, `audio.js` porte la forme — le modele
                   de `BOUCHE`. Neuf recettes ecrites a la main auraient neuf
                   enveloppes a tenir d accord. `pitch` va aussi a `barre`,
                   `bossBrise` et `bossQueue` : une barre de l Amalgame se brise
                   plus bas qu une barre du Metronome. La CASSURE ne bouge pas —
                   c est du bruit large, le transporter ferait un autre son au
                   lieu du meme plus gros.
                   `verifierFeedback` prend le roster et la table d archetypes :
                   il refuse un archetype SANS voix (il retomberait sur le repli,
                   donc deux boss identiques a l oreille sans que rien ne le dise)
                   et deux boss de meme archetype ET meme nombre de barres. Vert,
                   zero souci, onze voix distinctes.
                   AU PASSAGE, LE REGARD DOUBLE. `_atkRegardDouble` calculait son
                   differe sur `GAZE_WARN` BRUT alors que `_atkRegard` ouvre sur
                   `_warn(GAZE_WARN)` : en cauchemar derniere phase la fenetre
                   tombe a 0,8 s et le second regard arrivait quand meme 4,0 s
                   plus tard. 3,2 s de trou, et le double regard cessait d etre un
                   double pour devenir deux regards — la signature du Veilleur se
                   defaisait la ou elle devait etre la plus serree.

     0.27.4 lot 5  CINQ BOSS PORTAIENT LA PRISE D ARENE DE L AMALGAME, AU
                   CARACTERE PRES : `amb #2e2a30, k 0.80, vig 1.45,
                   puls [0.35, 0.22], atmo #e8e4dc`. Le commentaire de
                   `BOSS_SKIN` les appelait « les finals par difficulte » — or
                   TROIS d entre eux (Veilleur, Tisseur, Prisme) sont des boss de
                   POOL, ajoutes en queue apres l ecriture de ce commentaire. La
                   doc justifiait donc la copie par une phrase devenue fausse, et
                   rien ne levait : la table etait bien indexee, les couleurs de
                   corps differaient, seule la PRISE etait la meme. Pour ces cinq
                   boss, « le monde repete le boss » se reduisait a un changement
                   de couleur de corps — exactement ce que le plan interdit.
                   Chacun rejoue maintenant son verbe. Le Veilleur porte le
                   vignettage le plus fort du roster : c est un IRIS qui se
                   resserre, et son battement lent et faible est un clignement.
                   Le Tisseur epaissit l ombre et n a AUCUN battement — ce qu il
                   fait n a pas de rythme, c est une accumulation. Le Prisme ouvre
                   l arene, claire et sans cadre, et son battement rapide EST
                   l interference. Le Recitant est le meme combat en plus clair.
                   Le Silence n a aucun battement non plus, et c est son verbe :
                   il n y aura pas d avertissement.
                   `verifierPrises(BOSS_SKIN)` est le miroir de
                   `verifierArchetypes()` sur l autre moitie de l identite —
                   l archetype dit comment le boss deforme l espace, la prise dit
                   ce que le MONDE en fait. La table arrive en ARGUMENT :
                   `bosses.js` ne depend que d `i18n.js` et n importera pas la
                   charte pour un verificateur.
                   L ATMOSPHERE A SA PROPRE REGLE, et ce n est pas une redite du
                   tuple : c est le seul champ de la prise qui traverse le CENTRE
                   de l ecran. Elle a attrape un cas que le tuple laissait
                   passer — le Prisme soufflait la couleur des Jumeaux.

     0.27.5 lot 6  L AMER TELEPORTAIT A L ARRIVEE DU BOSS. `amerDe` prend le
                   candidat le plus LOIN de tout danger ; `drawAmer` lui passait
                   `hazardsActifs()`, vide pendant un combat. Tous les candidats
                   valaient alors `Infinity`, et `Infinity > Infinity` est faux :
                   c est le PREMIER qui sortait, pas le meilleur. 299 cas sur 320
                   (4 lieux x 2 modes x 40 graines), saut jusqu a 2 596 px, et
                   rejoue A L ENVERS a la mort du boss. Un objet de 460 px de
                   rayon dont sa propre regle dit qu il est « ancre au MONDE »
                   traversait l arene deux fois par combat. Le semis bougeait pour
                   la meme raison : `occupe()` ne rejetait plus rien, donc des
                   props naissaient dans l empreinte des blocs — et sa cle de
                   cache ne contient ni obstacles ni dangers, donc c est le
                   PANORAMIQUE du combat qui declenchait le recalcul.
                   LA REGLE : ce qui est PLACE UNE FOIS pour la manche lit
                   `obstaclesDuLieu()` / `hazardsDuLieu()`, ce qui se DESSINE par
                   image lit `obstaclesActifs()` / `hazardsActifs()`. Les deux
                   lecteurs de decor pose une fois etaient les seuls a confondre ;
                   les huit autres lecteurs sont du dessin par image et restent
                   sur les listes actives. Mesure apres : 0 cas sur 320.
                   L ARENE DU BOSS RESTE NUE, ET C EST MAINTENANT ECRIT.
                   `biomeNu` n existait dans aucune doc — la seule ligne qui
                   aurait du le dire (« le boss n y passe pas ») etait devenue
                   vide de sens, puisqu il n y a plus rien a traverser. Les deux
                   raisons entrent dans `SIMULATION.md` : les six archetypes
                   supposent un sol neutre, et la garantie d abri est ecrite sur
                   un sol propre. Ce lot ne remet donc NI obstacle NI danger dans
                   l arene du boss ; il corrige ce que la boite nue faisait bouger.
                   AUCUN CHANGEMENT DE SIMULATION : trois fichiers de rendu.

     0.27.6 lot 7  LA CAMPAGNE. Aucun changement de comportement : ce lot MESURE
                   les six precedents et ecrit ce qu ils laissent ouvert.
                   SUITE STATIQUE, SEPT VERIFICATEURS, TOUS VERTS :
                   `verifierGrammaire` (11 formes pour 32 mecaniques),
                   `verifierCoexistence` (41 paires incompatibles, toutes
                   gardees), `verifierArchetypes` (9 archetypes, unicite sur le
                   pool), `verifierPrises` (8 prises d arene distinctes,
                   atmospheres comprises), `verifierFeedback` (11 voix, 9 timbres,
                   aucune recette absente), la couverture des patrons (45 cles,
                   45 `case`, 0 orphelin dans les deux sens) et l amer (0 sur 320
                   deplacements).
                   Les deux constantes que le plan a deplacees, dans leur forme
                   finale : l emportement a 21 s x barres (105 s pour un
                   ordinaire, 126 s au Silence, 168 s a l Amalgame) et le palier a
                   1,40 s x 4 pour un ordinaire, 1,40 a 4,83 s pour le final.

     0.28.0 lot 1  UN ECRAN ETAIT ENREGISTRE A UNE PLACE SUR NEUF. `#hautsFaits`
                   n etait que dans `TOPBAR_SCREENS` : ni dans `ui/dom.js`, ni
                   dans l observateur, ni dans `UI_SOUND_SCREENS`, ni dans la
                   regle `[hidden].leaving`, ni dans le balayage, ni dans les
                   deux listes de curseur. Il disparaissait donc D UN COUP au
                   lieu de sortir, ses quatorze controles etaient muets et il
                   prenait la fleche du systeme — et rien ne levait, parce qu un
                   oubli d enregistrement ne produit jamais d erreur.
                   `ECRANS` remplace les quatre listes JS qui se recopiaient :
                   l observateur, le masquage de la barre et les deux selecteurs
                   de son se DERIVENT maintenant de la table, donc ces quatre
                   points ne peuvent plus diverger. `TOPBAR_SCREENS` en est un
                   filtre, et l ORDRE des lignes est la priorite du fil d Ariane.
                   Les quatre points qui vivent en CSS y restent — un selecteur
                   ne se lit pas depuis JS sans supposer la structure de la
                   feuille — et `verifierEcrans(css)` les croise DANS LES DEUX
                   SENS, comme `verifierDangers` : un ecran qui declare un point
                   absent de la regle, et un identifiant dans la regle que la
                   table ne declare pas. La feuille arrive en argument, sur le
                   modele de `verifierPrises(BOSS_SKIN)`.
                   Deux choses que le controle a trouvees en s ecrivant : `#pause`
                   a bien une entree (`animation: fadeIn var(--fade)`), et
                   `#brief` a la sienne a une autre duree (`--brief-in`), ce qui
                   est la regle deja ecrite et non une exception a declarer.
                   Restent deux trous CONNUS et declares, pour le lot 2 :
                   `#brief` et `#merchant` n ont pas de son.

     0.28.1 lot 2  TROIS ECRANS DE DECISION N AVAIENT PAS DE VOIX. `#brief` (le
                   choix d arme : trois offres, une relance, un « continuer »),
                   `#merchant` (acheter, relancer, passer) et `#hautsFaits`
                   (treize cadres, un retour) etaient hors des selecteurs de son
                   — environ vingt-quatre controles — alors que `#cards` et
                   `#build`, ouverts aux memes moments, y etaient. Le choix
                   d arme est la decision la plus lourde de la manche et c etait
                   la seule qui ne faisait aucun bruit.
                   `#brief` et `#merchant` prennent le regime `appui`, celui de
                   `#cards` et `#build` : un ecran pose sur une manche qui tourne
                   garde le reticule, donc il n a pas de crochet a montrer, donc
                   il ne sonne pas au survol. `#hautsFaits` a pris `survol` au
                   lot 1. Quatorze ecrans, dix en `survol`, quatre en `appui`,
                   aucun muet qui porte un controle.
                   `uiSoundFor` gagne trois lignes, et AUCUNE recette nouvelle :
                   les trois degres de la famille existaient deja. Acheter une
                   relique depense des eclats et ferme la visite, choisir une
                   arme verrouille la manche, fermer le briefing lance la vague —
                   les trois prennent `pret`, la deuxieme marche. Une carte parmi
                   trois reste `selection` : elle ne coute rien et l ecran ne se
                   referme pas sur elle.
                   Le miroir du curseur devient EXECUTABLE. « Ce qui montre le
                   crochet est exactement ce qui sonne au survol » etait une
                   duplication assumee, ecrite des deux cotes ; c est une
                   cinquieme regle de `verifierEcrans`, croisee dans les deux
                   sens comme les quatre autres.

     0.28.2 correctif  LA BANDE DE DUREE SUIT LES PV. Trois defauts de CRITERE
                   que la campagne du lot 7 a leves, dont deux sont entres au
                   lot 1 avec le critere par boss lui-meme.
                   Elle ne suivait pas la DIFFICULTE : `BOSS_FIGHT_MIN/MAX` est
                   une bande de normal, appliquee aux trois modes elle sortait
                   neuf lignes en calme — ou `diff.boss` vaut 0,75 et ou
                   `LISEZMOI` ecrit depuis le lot H que les combats tombent a
                   40-47 s. Mesure : p50 de 47 s en calme contre 65 s en normal,
                   soit 0,72, et la bande scalee par 0,75 tombe dessus.
                   Elle ne suivait pas les BARRES : ecrite `[2 x MIN, 2 x MAX]`
                   au lot 3 en pensant a l Amalgame et ses HUIT barres, elle
                   declarait le RECITANT hors bande a 76-87 s alors qu il en a
                   CINQ. Le seuil d emportement du lot 2 se met a l echelle des
                   barres ; la bande de duree aurait du le faire des le depart.
                   `bandeDuree(kind, diffIndex)` la fait suivre les barres, le
                   multiplicateur de final et le mode — et SURTOUT PAS `hpMul`,
                   qui est le reglage sous test : l y faire entrer rendrait le
                   critere vrai par construction, le piege meme que le lot 2 avait
                   evite en refusant d indexer l emportement sur `BOSS_FIGHT_MAX`.
                   Bandes obtenues : calme [38, 68], normal [50, 90], cauchemar
                   [63, 113] pour un ordinaire ; [44, 79], [94, 168], [88, 158]
                   pour le final de chaque mode.
                   Et le taux d emportement s affiche a la decimale : « 10 % des
                   combats, sous le plancher de 10 % » etait 9,83 % arrondi.

     0.28.3 lot 3  UN ORDRE DE BOSS ARRIVAIT EN SILENCE. `applyAlert` est le
                   chemin unique des trois tables du serveur, et il sonnait pour
                   une METEO et pour un EVENEMENT — pas pour une MECANIQUE. Le
                   bandeau `ALERT_ORDER`, celui qui porte un compte a rebours et
                   dit ou aller, etait donc le seul des trois a ne rien emettre :
                   un changement de temps s entendait, un ordre de boss non.
                   La recette existait, ecrite POUR cet appel : `annonce` prend
                   un `level` et lit `level === 0` pour separer l ordre de
                   l avertissement, et `ALERT_ORDER` vaut 0. Elle n avait jamais
                   ete branchee — et un nom de recette que personne ne nomme ne
                   leve rien. `level` sert aussi de clef de limiteur, donc un
                   ordre ne prend pas la place d un avertissement.
                   LE CONTROLE EST STATIQUE, ET C EST UNE DECISION.
                   `verifierFeedback` refuse un nom de recette ABSENT de la
                   palette ; le sens inverse — une recette presente qu aucun
                   chemin n atteint — se croise sur le TEXTE du depot :
                   `annonce` etait la seule des cinquante. Un compteur dans
                   `playSound` a ete ecrit, mesure, puis RETIRE : sur cent
                   minutes de jeu pilote et quinze combats de boss, le pipeline
                   complet n en nomme que 28 sur 50, et les vingt-deux autres ne
                   sont pas orphelines (voix d armes que le bot n equipe pas,
                   sons d interface sans interface, mise a terre avec des bots
                   immortels). Un comptage mesure une COUVERTURE, pas une
                   orpheline, et un compteur dont la seule lecture ne peut pas
                   conclure est ce que ce depot supprime. Protocole et chiffres
                   dans `LISEZMOI`.

     0.28.4 lot 4  LE BONUS ETAIT LE SEUL OBJET DE GAMEPLAY DESSINE SOUS LA
                   HORDE. Ordre impose : sol, zones, BONUS, ennemis, projectiles,
                   joueurs — et un bonus n a ni anneau d equipe ni telegraphe pour
                   se rattraper. Mesure, cauchemar a quatre joueurs, 300 s par
                   densite, sur la vue reelle : la part de bonus recouverts par un
                   corps va de 2,6 % a 50 corps a 18,0 % a 100, 21,3 % a 150 et
                   36,9 % a 200. Ce n est pas une affaire de DENSITE — les corps
                   ne couvrent que 3,3 % de la vue a 200 —, c est une affaire
                   d ORDRE.
                   CE QUI MONTE EST LE SIGNAL, PAS L OBJET. Faire passer le bonus
                   entier au-dessus mettrait treize disques opaques devant la
                   horde, soit du decor devant du gameplay. Seul ce qui DESIGNE
                   monte — socle de famille, cadran de fin, anneau de rarete, des
                   traits fins et jamais un aplat ; l icone, celle qu on lit en
                   dernier et de pres, reste ou elle est. Meme geste que
                   `drawMarkColumns`, l autre chose qui a le droit de passer
                   devant la horde.
                   LA HIERARCHIE EST STRUCTURELLE, comme la passe de lumiere :
                   `drawBonusSignal` est appelee apres `setCtx(overCtx)`, donc
                   elle vit sur `#cv`, au-dessus du `#cvGl` ou vivent les corps.
                   La deplacer d une ligne avant la bascule la casse en silence.
                   AUCUN PIXEL NOUVEAU : la geometrie tracee par les deux passes
                   reunies est identique a celle de la passe unique d avant,
                   rejouee sur un contexte enregistreur — 24 anneaux, 12 dans
                   chaque passe. Les deux lisent le meme `bonusEtat`, et seule la
                   passe basse inscrit la naissance : l ordre des deux ne peut pas
                   decider qu un bonus vient de tomber.

     0.28.5 lot 5  PORTE-BOUCLIER ET CHOEUR CESSAIENT DE SE DISTINGUER, et
                   `verifierSilhouettes` etait ROUGE depuis 0.21.7 : elancement
                   0,96 / 1,12 pour une tolerance de 0,18, matiere 0,66 / 0,78
                   pour 0,14, remplissage 0,79 / 0,78, sommets 29 / 27, avance
                   0,001 / 0,001. Deux corps dont la bonne reponse est OPPOSEE —
                   on contourne l un, on tue l autre en premier.
                   Le plan 18 avait avance le pavois de huit pixels et note que
                   la mesure ne bougeait pas : `avance` est invariante par
                   translation. L axe qui separe la paire est l ELANCEMENT, et
                   c est le seul dont la DIRECTION porte le verbe des deux — un
                   pavois est large et bas, une planche qui barre le passage ; un
                   choeur est haut, sa couronne monte. Les deux autres axes
                   possibles allaient contre le verbe : baisser la matiere du
                   pavois le rendrait ajoure, monter celle du choeur lui fermerait
                   sa couronne.
                   Le pavois perd 7,5 px de hauteur et les hanches 3,5 :
                   **0,96 -> 0,78**, ecart 0,34 pour une tolerance de 0,18.
                   `verifierSilhouettes` MUET, et la paire la plus serree du
                   bestiaire passe de 0,87 a 1,20 fois sa tolerance — c est
                   couvain / porte-bouclier, et elle tient. Le bord de case est
                   respecte : `x = 29` laisse la moitie du contour avant la
                   gouttiere de 2 px.
                   Reste a valider a l oeil, planche `?planche` en resolution
                   native : la mesure dit qu une paire est confusable, elle ne
                   dit pas quoi dessiner.

     0.28.6 lot 6  IMAGE ET CONFORT, LA OU ON LES CHERCHE. `setGfx` n avait qu UN
                   appelant, le menu de pause : le palier de qualite n etait donc
                   joignable qu une manche en cours, alors que « Parametres »
                   annonce « les reglages de cette machine » et porte deja la
                   langue, l audio et les controles. Il est maintenant dans les
                   deux vues, avec UN seul setter — meme forme qu `audioUi`, dont
                   les trois rangees incluent deja celles de la pause.
                   ET LE CONFORT S ARRETAIT AU DOM. `prefers-reduced-motion` est
                   lu par trois blocs de `menus.css` ; le tressaillement est un
                   `transform` ECRIT PAR JS sur `#arena`, le hitstop est
                   `timeWarp`, les eclairs sont sur le canvas — la preference ne
                   les atteignait pas, et rien ne lisait un reglage parce qu il
                   n y en avait pas.
                   `secousseMul()` a UN SEUL POINT DE LECTURE, `addShake`, comme
                   `gfx` en a cinq et pas six. Trois crans et non un
                   interrupteur : le tressaillement porte de l information (une
                   detonation, une rupture de barre), le couper est un choix,
                   le baisser en est un autre.
                   La preference systeme donne la VALEUR PAR DEFAUT et n ecrase
                   jamais un choix — elle n est lue que si la clef est absente.
                   Aucune regle de simulation ne bouge, et `gfx` garde ses cinq
                   points de lecture.

     0.28.7 lot 7  DIX-SEPT EXPORTS MORTS ET SEIZE CLES ANGLAISES MORTES,
                   supprimes. Definis une fois, nommes nulle part :
                   `sampleReady`, `getMusicDuck`, `audioReady`,
                   `getMusicIntensity`, `musicStats`, `stopMusic`, `atlasCanvas`,
                   `tracksStats`, `hudHfEl`, `hazardNom`, `classBrief`,
                   `typeAt`, `CADRE_PALIER_MAX`, `STATUS_BY_KEY`, `statusNom`,
                   `statusDesc`, `beatIndex`.
                   TROIS CAS ONT DEMANDE UNE DECISION, pas une suppression
                   mecanique.
                   `stopMusic` : `RENDU.md` l appelait l un des QUATRE aiguillages
                   de `music.js`. Il y en a trois. `startMusic()` part une fois a
                   l amorce, `setMusicScene("menu")` couvre le hors-manche, et
                   `refreshMusicSource()` appelle deja `stopSynth`/`stopTracks`
                   en direct : RIEN n arrete la musique, et rien ne doit. La doc
                   est corrigee, pas le code ressuscite.
                   `statusNom`/`statusDesc` et `hazardNom` etaient les seuls
                   lecteurs de `STATUSES[].nom/desc` et de `HAZARDS[].nom` — donc
                   ces champs et leurs treize traductions etaient morts aussi.
                   UN ETAT SE LIT A SON ICONE, A SA TEINTE ET A SON ANNEAU ; un
                   danger s annonce par sa geometrie permanente. Leur donner un
                   lecteur voudrait dire une info-bulle au HUD, or on ne survole
                   rien pendant une vague. Les champs partent avec leurs
                   accesseurs.
                   `beatIndex` : `SIMULATION.md` ecrivait « reste exporte ».
                   `verifierScript` calculait deja son indice en ligne.
                   Restent dix cles anglaises que ni `t()` ni `tn()` n atteignait
                   — `u.rebond`, `u.plomb`, `u.obus`, `u.grenade`, `u.drone`.
                   1 437 -> 1 421 cles, ZERO sans point d appel. Le balayage des
                   exports ne rend plus une seule ligne a « interne 0 ».

     0.28.8 lot 8  LES CHIFFRES ET LA CHECKLIST. Aucun changement de
                   comportement : ce lot ECRIT ce que les sept precedents ont
                   mesure, et il nomme ce qu ils ne corrigent pas.
                   Dans `LISEZMOI` : la lisibilite aux quatre densites (2,6 % de
                   bonus recouverts a 50 corps, 36,9 % a 200, pour 3,3 % de
                   surface couverte — c est un probleme d ORDRE, pas de densite),
                   la ligne de silhouette du pavois et le passage de la paire la
                   plus serree du bestiaire de 0,87 a 1,20 fois sa tolerance, et
                   les quatorze ecrans contre les neuf points (1/9 -> 9/9,
                   quatre listes JS qui se recopiaient -> zero, cinq regles CSS
                   croisees).
                   HUIT VERIFICATEURS DE SIMULATION SONT ROUGES, TOUS ANTERIEURS
                   AU PLAN, releves sur l arbre du plan 24 avant toute
                   modification. Sept sont de l EQUILIBRAGE — `verifierBoss`,
                   `verifierTTK`, `verifierPopulation`, `verifierProgression`,
                   `verifierMeta`, `verifierMarchand`, `verifierEquilibreArmes` —
                   et la mission interdit d y toucher sous couvert de polish.
                   Le huitieme n en est pas : `verifierMecaniques` compte des
                   ABRIS SOUS LE FEU a l echeance, en normal, a 1, 2, 3 et 4
                   joueurs (6/3/4/3 images), REJOUE DEUX FOIS AUX MEMES CHIFFRES
                   — donc deterministe. C est la garantie d abri, « le seul
                   invariant que le depot a paye deux fois », et le plan 24
                   l enregistrait vert. Il est nomme dans `plan25/README` § 4 :
                   il n entre pas dans ce plan parce que ce plan ne touche pas
                   `game_state.js`, mais il n attend pas une campagne
                   d equilibrage.
                   CE QUI RESTE AU BANC : la table de `?banc` est la seule chose
                   de ce plan qui demande un navigateur. Ce qui se mesure sans
                   lui l est — `verifierPopulation` ne signale aucun depassement
                   du budget de 16 ms au p99.

     0.29.0 lot 1  CE QUI BLESSE EXHALE SA PROPRE MATIERE. `render/dangers.js`
                   separait VINGT representations au sol, et l air au-dessus n en
                   separait AUCUNE : `drawAtmosphere` posait le meme brin de
                   `WEATHER.wind`, meme vitesse, meme opacite, sur les douze
                   dangers qui blessent. Une vapeur d eau, une coulee de metal et
                   un front de braise respiraient le meme gris — un danger etait
                   lisible en bas et muet en haut, alors que la table du sol avait
                   deja paye le travail de le rendre diegetique.
                   `SOUFFLE[biome][kind]`, parallele a `DANGER` et non deduite :
                   la matiere qui monte n est pas calculable depuis le `kind`,
                   c est le LIEU qui decide si la flaque fume chaud (le bac de
                   trempe de l Usine) ou DERIVE lourd (la flaque toxique de la
                   Friche, seule entree dont l angle n est pas la verticale — un
                   gaz plus lourd que l air se separe d une vapeur a l oeil avant
                   toute couleur). Chaque entree reprend la teinte que son dessin
                   au sol porte deja, donc rien de neuf a apprendre.
                   AUCUNE ALLOCATION, AUCUN APPEL DE DESSIN EN PLUS : c est
                   `champ()`, qui coute un `stroke` par source et dont la position
                   d un brin reste une fonction de son indice et du temps. Le
                   nombre de brins par danger passe de 14 fixe a 7-16 selon la
                   matiere. Le serveur ne bouge pas d un octet — ni `hazardState`,
                   ni le collider, ni le `dot`.
                   `verifierDangers()` croise MAINTENANT LES DEUX TABLES, dans les
                   deux sens et sur les trois questions : un danger qui blesse
                   sans souffle, un souffle jamais pose, un souffle sur un danger
                   FROID. `souffleDe` replie en silence sur le brin gris d avant —
                   un lieu oublie ne se serait signale que par un danger chaud qui
                   exhale du vent, ce que personne ne va chercher. Verifie rouge
                   sur mutation avant d etre enregistre vert.

     0.29.1 lot 2  LA SEULE CARTE QUI POSE DU FEU N EN MONTRAIT PAS.
                   `terrain_conquis` (« tes explosions et tes ondes laissent un
                   sol brulant ») est le SEUL des cinq appelants de `_groundZone`
                   a passer un `pj` non nul. `drawZonesActive` recevait
                   `ownerColorOf(pj)` et l appliquait aux QUATRE canaux — braise,
                   bord, fond, hachure : le sol brulant d un joueur bleu crachait
                   des braises BLEUES. Les particules montantes existaient deja,
                   elles portaient la couleur d equipe au lieu du feu.
                   LA COULEUR DIT A QUI, LA MATIERE DIT QUOI. Le contour prend la
                   teinte du proprietaire — c etait deja une passe separee, en
                   `ZONE.persist` fixe, donc elle ne coute rien —, et les trois
                   autres canaux prennent `ZONE.braise` / `braiseBord` /
                   `braiseFond` : un lit sombre, des braises chaudes, un lisere
                   clair. VOLONTAIREMENT A L ECART DE `BIOME.hazard` : l ambre des
                   biomes dit « evite », or ce sol ne blesse que la horde.
                   Le branchement lit `pj`, JAMAIS la couleur : `ownerColorOf`
                   rend `null` des qu un joueur quitte le salon, et la matiere du
                   sol se serait alors mise a changer sous les pieds.
                   Rien sur le reseau : `pj` voyage deja (tuple de zone, indice
                   15, `ingest.js` le lit avec un repli). Verifie de bout en bout
                   — carte posee, `_blastGround` declenche, une zone `SOL_JOUEUR`
                   `pj=1` dans l instantane, et une zone de horde `pj=0` a cote
                   qui garde exactement le rouge d avant.
                   CE QUI RESTE MUET, ET C EST UN LOT A PART : la famille
                   `brulure` (quatre cartes, 3 a 50 degats). `burn` n apparait pas
                   UNE fois dans `public/` ; le tuple ennemi ne porte aucun champ
                   d etat ; la balle incendiaire est `[id, x, y, owner]`, la meme
                   qu une balle ordinaire ; `enemyStatusMask()` a un seul
                   appelant, le bonus de degats de `catalyseur`. Un ennemi qui
                   brule ne le montre nulle part — le corriger demande un champ en
                   FIN de tuple, donc un lot de reseau, pas de rendu.

     0.29.2 lot 3  UN ENNEMI QUI BRULE LE MONTRE. La famille `brulure` — quatre
                   cartes, `braises` / `incendiaire` / `brasier` / `fournaise`,
                   de 3 a 115 degats cumules — etait ENTIEREMENT muette : `burn`
                   n apparaissait pas UNE fois dans `public/`, le tuple ennemi ne
                   portait aucun etat, la balle incendiaire etait `[id, x, y,
                   owner]` comme toutes les autres, et `enemyStatusMask()` n avait
                   qu un appelant — le calcul de degats de `catalyseur`.
                   UN EMPLACEMENT, EN FIN DE TUPLE (indice 11), lu avec un repli.
                   Et une PART DE DUREE, pas un drapeau : la lueur s eteint AVEC
                   la brulure au lieu de disparaitre d un coup, ce qui aurait dit
                   « purge » alors que la brulure va au bout. `trimTail` la retire
                   a zero, donc la horde qui ne brule pas ne paie rien — mesure :
                   tuple de 7 inchange sans brulure, 12 avec, et retour a 7 des
                   l extinction (1 -> 0,67 -> 0,33 -> absent sur 3 s).
                   BANDE PASSANTE, APRES COMPRESSION (c est la seule qui compte,
                   `ws_lite` deflate a chaque envoi), horde de 900 a 4 joueurs :
                   +0 o a 0 % de brulants, +586 o (6,4 %) a 25 %, +1283 o (14,0 %)
                   quand les 900 brulent en meme temps. Le pire cas tient sur un
                   LAN, et il n est pas atteignable en jeu.
                   RENDU : meme primitive que l ombre — un quad `fx_glow` teinte,
                   dans le lot NORMAL, aucun appel de dessin en plus — et la meme
                   couleur que le glyphe du HUD, pour que l etat se dise d une
                   seule voix sur le joueur et sur la horde. PASSE SEPAREE, meme
                   raison que les ombres : une lueur posee juste avant SON corps
                   tomberait sur le corps deja dessine du voisin. Les braises ont
                   un budget PAR IMAGE (8) et non par ennemi, parce que la brulure
                   se PROPAGE et que leur nombre suivrait sinon la horde.
                   AUCUNE GARDE `gfx` : une brulure est de l INFORMATION, pas un
                   agrement. `gfx` regle la matiere, il ne decide jamais de ce qui
                   se lit — et ses cinq points de lecture restent cinq.
                   VERIFICATEUR ECARTE, ET C EST MESURE : un `verifierEnnemis` sur
                   le modele de `verifierEffets` (tout champ numerique non nul doit
                   atteindre un emplacement) leverait sur QUINZE champs legitimement
                   serveur-seul — `speed`, `standoff`, `navAncre`, `navT`, `masse`,
                   `xpWorth`, `traits`… que le client derive de `defDe(type)`. La
                   liste d exclusion serait plus longue que la regle et pourrirait.
                   `verifierEffets` reste vert mais ne couvre que la liste `f` : il
                   ne dit RIEN de ce lot, la preuve est le relevé bout en bout.
                   CE QUI N EST PAS FAIT : le BOSS brule aussi (`b.burn`) et son
                   tuple ne porte pas la part. Une entite contre neuf cents, et son
                   rendu vit dans `boss.js` — lot a part.

     0.29.3 lot 4  L ARMURE OUVERTE SE VOIT. `vulnUntil` sur un ennemi vaut
                   +25 % de degats (`VULNERABLE_MUL`) et SEPT sources le posent —
                   un critique (`critVuln`), une ruee (`contre_pied`), un souffle,
                   une balle porteuse. Le joueur ne pouvait pas savoir sur QUI
                   frapper : rien ne le montrait, exactement comme la brulure au
                   lot precedent.
                   UN EMPLACEMENT DE PLUS, EN FIN DE TUPLE (indice 12), et EN
                   SECONDES et non en part : `VULNERABLE_TIME` (4 s) et
                   `CONTRE_PIED_TIME` (3 s) different, donc une part obligerait le
                   client a savoir QUI l a posee — il ne le sait pas et n a aucune
                   raison de l apprendre.
                   DES POINTES, JAMAIS UN ANNEAU. Les trois anneaux lisses sont
                   deja pris — elite, aura, egide — et `#f4b04a` frole l or
                   d elite (`#ffd76e`) : c est donc la SIGNATURE qui separe, pas
                   la teinte, la meme regle que pour les zones. Quatre pointes
                   radiales sous le corps, qui sortent proprement du bord au lieu
                   de barrer la silhouette, en rotation CONTINUE — donc sans debut
                   ni echeance, donc le canal du telegraphe reste au boss.
                   QUATRE CAS MESURES, dont celui qui coute : rien = tuple de 7
                   inchange ; brulure seule = 12 ; vuln SEULE = 13, avec un zero a
                   l indice 11 que `trimTail` ne peut pas couper puisqu il n est
                   plus en queue — deux octets, le prix des tuples positionnels ;
                   les deux = 13. Retour a 7 a l extinction.
                   ET ELLE EST QUASI GRATUITE SUR LE FIL : horde de 900 a 4
                   joueurs, apres compression, +212 o (2,3 %) a 25 % de
                   vulnerables, et le pire cas brulure ET vuln a 100 % coute
                   +1272 o (13,9 %) — soit MOINS que la brulure seule au lot
                   precedent (+1283 o). Les secondes entieres se repetent, deflate
                   les absorbe.
                   LE BOSS RESTE MUET SUR LES DEUX : il brule (`b.burn`) et il est
                   vulnerable (`vulnUntil`, meme ligne que la horde), son tuple ne
                   porte ni l un ni l autre. Une entite contre neuf cents, rendu
                   dans `boss.js` — le lot qui ferme cette serie.

     0.29.4 lot 5  LE BOSS DIT LES MEMES ETATS, PAR LA MEME MAIN. Il brulait et
                   devenait vulnerable depuis toujours sans qu un pixel ne le
                   dise — or un boss qui encaisse +25 % pendant quatre secondes
                   est exactement le moment ou l equipe doit tout donner, et
                   c etait le seul moment ou personne ne le savait.
                   DEUX EMPLACEMENTS EN FIN DE TUPLE `bo` (15 et 16), dans les
                   MEMES unites que la horde : part de duree pour la brulure,
                   secondes pour la vulnerabilite. `bo` n est pas rogne par
                   `trimTail`, donc il passe de 15 a 17 champs en permanence —
                   deux nombres pour UNE entite, la ou le meme choix coutait 900
                   tuples cote horde. Mesure : indices 0-14 inchanges, extinction
                   1 -> 0,67 -> 0,33 -> 0 et 4 -> 3 -> 2 -> 1 -> 0.
                   ET LE TRACE EST PARTAGE, PAS RECOPIE. `drawVulnerable` quitte
                   `actors.js` pour `fx.js`, a cote de `drawBrulure` : les deux
                   signes vivent desormais au meme endroit et le boss les appelle
                   tels quels. Un second vocabulaire pour le boss aurait fait
                   apprendre l etat DEUX FOIS — un boss n est pas un autre jeu.
                   La longueur des pointes suit le rayon (`7 + r * 0,12`) : quatre
                   traits de 7 px disparaissaient sur un corps de 84.
                   LE JUMEAU LES PORTE AUSSI, et par la ligne qui existait deja :
                   `world.js` lui transmettait deja `hp`, `maxHp`, `phase` et
                   `bars` du boss principal parce qu ils partagent la barre.
                   `_damage` redirige le jumeau vers le boss AVANT de lire l etat,
                   donc les deux corps le partagent exactement comme la barre —
                   l etat est sur `bo`, jamais sur `bo2`.
                   Un seul lecteur du tuple `bo` dans tout le depot (`ingest.js`),
                   par indice et avec repli : rien d autre ne depend de sa
                   longueur, ni la telemetrie ni la page d administration.
                   CE QUI FERME LA SERIE : les quatre cartes de `brulure` et les
                   sept sources de vulnerabilite se lisent maintenant sur la
                   horde ET sur le boss. La `vulnUntil` propre au JUMEAU reste
                   posee par les souffles (`_bossTargets`) et n est lue par
                   personne — defaut anterieur a ce plan, laisse tel quel : le
                   corriger est une question de simulation, pas de rendu.

     0.29.5 lot 6  L ENTRAVE SE VOIT, ET LES TROIS ETATS TIENNENT ENSEMBLE.
                   `rootUntil` sur un ennemi fait DEUX choses : `mul = 0`, le
                   corps ne bouge plus du tout — mesure : 0,00 px sur une
                   demi-seconde —, et `nasse` en fait une cible a +degats. Trois
                   sources la posent : `etau` (souffles et ondes), `filins`
                   (balles) et le tesla legendaire (`teslaEntrave`).
                   ET LE CORPS QUI S ARRETE NE SUFFISAIT PAS A LE DIRE. C est la
                   question qu il fallait se poser avant d ajouter un signe, et la
                   reponse est non pour deux raisons : `nasse` oblige a DESIGNER
                   les entraves pour concentrer le feu, et un corps immobile est
                   autrement indistinguable d un corps qui vise, qui prend son
                   elan, ou qui bute sur un obstacle.
                   TROIS ETATS, TROIS PLANS — et c est ca qui les rend lisibles
                   ensemble, pas la couleur : la brulure est une lueur AUTOUR du
                   corps, la vulnerabilite des pointes qui en SORTENT, l entrave
                   un anneau AU SOL. Superposes sur le meme corps, aucun ne peut
                   etre pris pour un autre.
                   FROID, et c est la regle du depot appliquee telle quelle : ce
                   qui blesse est chaud, ce qui RALENTIT est froid — une entrave
                   est le ralentissement total. Deux epaisseurs, la fine seule
                   saturee, jamais de pointilles : le meme trait franc que
                   `limite()` pose sur un danger, et le pointille appartient au
                   telegraphe.
                   SEPT CAS DE TUPLE MESURES : rien = 7 ; brulure = 12 ; vuln = 13
                   ; entrave SEULE = 14, avec DEUX zeros en 11 et 12 que `trimTail`
                   ne peut pas couper — quatre octets, le prix des tuples
                   positionnels, et il n y a pas moyen de l eviter sans reordonner,
                   ce qui casserait l append-only.
                   ET LA SERIE ENTIERE NE COUTE RIEN DE PLUS : horde de 900 a 4
                   joueurs, apres compression, les TROIS etats a 100 % coutent
                   +1299 o (14,1 %) — contre +1283 o (14,0 %) pour la brulure
                   SEULE en 0.29.2. Deux etats de plus pour seize octets : les
                   valeurs se repetent, deflate les absorbe. A 25 % des trois,
                   +538 o (5,9 %).
                   `doom` n a PAS de trou : il est joueur-seul, aucun ennemi n en
                   porte. Et le boss n est jamais entrave — `mul = 0` vit dans la
                   boucle de deplacement de la horde, `_rootEnemy` n a que deux
                   appelants et aucun ne vise un boss.

     0.29.6 lot 7  UN LIEU A DES QUARTIERS. `props.js` tirait chaque prop
                   UNIFORMEMENT dans toute la liste du biome, independamment de
                   ses voisins : un bras robotise naissait a cote d un marquage au
                   sol et d un palettier sans qu aucune regle ne l en empeche. Le
                   semis etait deterministe dans son CALCUL et parfaitement
                   aleatoire dans sa DISTRIBUTION — c est la difference entre
                   « genere » et « compose », et c est elle qui rendait les quatre
                   lieux plats.
                   UNE FONCTION DE PLUS, PAS UNE COUCHE DE PLUS : la zone est un
                   hachage de la cellule DIVISEE par trois (600 px, soit deux a
                   trois quartiers par vue). Rien ne s alloue, rien ne se garde
                   entre deux images, et le resultat reste une fonction pure de
                   (cellule, graine) — les trois proprietes qui font que deux
                   clients voient la meme chose. Le hachage prend `g + 8`, le
                   premier decalage libre : les sept precedents portent deja
                   presence, type, angle, echelle, opacite et phase, et reutiliser
                   l un d eux aurait CORRELE le quartier avec l inclinaison des
                   props.
                   `TABLE` reste ce que le lieu POSSEDE, `ZONES` devient la facon
                   dont il l ARRANGE — quatre quartiers par lieu, tires uniquement
                   dans son propre catalogue : l Usine fabrique, empile, circule et
                   entretient ; la Fonderie coule, moule, stocke et rebute ; la
                   Friche repousse, casse, cloture et garde un reste allume ; la
                   Nebuleuse a sa coque morte, sa voilure, son givre et son
                   amarrage.
                   LA FUITE (18 %) EST CE QUI EMPECHE LA GRILLE DE SE VOIR. Sans
                   elle, la frontiere de deux quartiers est une droite franche
                   tous les 600 px — un damier, pas une installation. Une part des
                   props ignore donc sa zone et tire dans le fonds du lieu.
                   MESURE, cinq graines, densite `ultra`. Props VOISINS de meme
                   type : 12,8 -> 26,0 % a l Usine, 12,5 -> 22,9 % a la Fonderie,
                   13,4 -> 22,9 % a la Friche, 12,5 -> 22,3 % a la Nebuleuse — le
                   regroupement DOUBLE.
                   ET LA CONTRE-MESURE, qui est la vraie question : a-t-on paye en
                   MONOTONIE ? Non. Types distincts visibles dans une vue :
                   8,7 -> 8,4 sur neuf. Types encore presents sur l arene entiere :
                   9 -> 9, dans les quatre lieux. Rien n a disparu, tout s est
                   range.
                   `verifierZones()` croise les deux tables DANS LES DEUX SENS. Un
                   prop du catalogue qu aucune zone ne tire est un prop SUPPRIME
                   du lieu en silence — le piege que `CLAUDE.md` nomme en premier —
                   et l inverse fait entrer un prop sans que le catalogue le dise.
                   Verifie rouge sur les deux mutations avant d etre enregistre
                   vert.

     0.29.7 lot 8  UN CINQUIEME LIEU : LE SECTEUR. Rue trempee, neons,
                   passerelles. C est le SEUL lieu habite du depot, et c est son
                   verbe : les quatre autres FONT quelque chose — fabriquer,
                   couler, pourrir, deriver — celui-ci S ADRESSE A VOUS. Tout y
                   est une surface qui vend.
                   TREIZE TABLES, ET C EST LE CHIFFRAGE QUI A DECIDE DU DECOUPAGE.
                   Un lieu ne se livre pas en tranches : `BIOMES` sans `DANGER`
                   replie sur un disque ambre, sans `BLOC` sur une silhouette
                   d emprunt, sans `HZ_*` sur un lieu SANS DANGERS. Chaque etat
                   intermediaire est soit un verificateur rouge, soit pire, un
                   repli SILENCIEUX. Donc un seul lot.
                   CE QUI LE SEPARE DES QUATRE AUTRES, table par table. Sa
                   LUMIERE vient d en FACE (`dir` 0,86/0,51, le plus proche de
                   l horizontale) parce qu une rue est eclairee par ses vitrines
                   et non par son toit ; son `k` est le plus BAS des cinq parce
                   qu une chaussee mouillee RENVOIE au lieu d absorber — l inverse
                   exact de la Nebuleuse. Son emissif est MAGENTA, le seul du
                   depot qui ne soit ni ambre ni cyan, donc le seul qui ne puisse
                   se confondre avec un signal de jeu : c est la condition pour
                   qu un lieu ait le droit d etre sature.
                   SON SOL A DES REPRISES et pas de maille de 5 m — troisieme lieu
                   dans ce cas apres la Friche et la Nebuleuse. Une chaussee n a
                   pas de joints techniques reguliers, elle a des tranchees
                   rebouchees, et ce sont elles qui disent qu il y a un RESEAU
                   dessous. C est aussi ce qui justifie ses dangers : ils en
                   sortent tous. Le seul lieu dont les cinq dangers soient des
                   ACCIDENTS et non une matiere.
                   SON AIR TOMBE : seule ambiance des cinq qui descende, les
                   autres derivent, tirent ou montent. Sans la pluie au-dessus,
                   l eau par terre n a pas de cause.
                   SON AMER EST UN VIDE : les quatre autres ont un OBJET —
                   creuset, tour, sas, coeur de ligne. Une ville ne se repere pas
                   a un objet mais a un CROISEMENT, donc le carrefour est le seul
                   amer du depot defini par ce qu il n a pas.
                   UN DEFAUT ATTRAPE PAR `verifierEmpreinte`, et c est exactement
                   celui que `CLAUDE.md` nomme : le premier pylone avait un pied
                   evase et un mat etroit — juste physiquement, et FAUX ici, parce
                   que la collision est une AABB. 33 % de l empreinte vide, donc
                   on aurait bute sur du vide. Reecrit plein, et ce qui le separe
                   de la travee de la Nebuleuse est desormais sa TETE (deux coupes
                   au seul bout haut) et non sa masse.
                   UN AUTRE ATTRAPE PAR `verifierBiomes` : les dangers tombaient
                   sur les pylones. Repositionnes sur une carte des creux calculee,
                   pas devinee — et la carte a montre au passage que la trame
                   d obstacles ET celle des dangers se REPETENT sur 3 x 3 cellules
                   de 1600 x 900, ce qui rend toute intuition en coordonnees
                   d arene fausse.
                   MESURE, contre les quatre autres lieux : 54/81/108 obstacles
                   selon le mode (la Friche fait 54/90/108), 2,68 -> 5,21 % de
                   surface batie pour un budget de 10 %, 4,61 -> 6,20 % de surface
                   dangereuse pour un budget de 8 %. Il tombe en famille partout.
                   LES SIX VERIFICATEURS DE RENDU SONT VERTS sur le nouveau lieu :
                   `verifierBiomes`, `verifierBlocs`, `verifierEmpreinte`,
                   `verifierDangers`, `verifierZones`, `verifierAmers`.

     0.29.8 lot 9  LE DEFAUT IMPLICITE ETAIT LE VRAI DEFAUT. Le lot precedent a
                   ajoute un cinquieme lieu et les six verificateurs de rendu
                   l ont accepte — mais ils ne couvrent que ce qui est deja une
                   TABLE. Trois aiguillages par lieu n en etaient pas : des
                   chaines de `if` a defaut implicite, dans `cuire`, `cuireMacro`
                   et `drawPremierPlan`.
                   ET L UN DES TROIS ETAIT DEJA FAUX : le Secteur n avait AUCUNE
                   branche dans `cuireMacro`, donc sa seconde periode — la nappe
                   de 1200 px, celle qu on lit a 400 px de distance — etait celle
                   de l Usine. De la rouille d atelier et du blanc de halogene sur
                   de l asphalte mouille, livre en 0.29.7 sans que rien ne puisse
                   le dire, parce qu un defaut implicite est indistinguable d un
                   CHOIX.
                   TROIS TABLES ET DEUX VERIFICATEURS. `TUILE`, `MACRO_TUILE` et
                   `PORTE_MAILLE` dans `material.js`, croisees par
                   `verifierMatiere()` ; `PREMIER_PLAN` dans `decor.js`, croisee
                   par `verifierPremierPlan()`. Dans les deux sens : un lieu sans
                   entree, et une entree sans lieu.
                   `macroUsine` EST EXTRAIT. C etait le corps de repli de
                   `cuireMacro`, donc la seconde periode de tout lieu qui n en
                   declarait pas ; il porte maintenant son nom et sa ligne. Un
                   lieu qui herite de l Usine le fait desormais parce que
                   quelqu un l a ecrit.
                   `verifierPremierPlan` POSE UNE QUESTION DE PLUS que les autres
                   tables : deux lieux ne peuvent pas PARTAGER une silhouette de
                   bord. Les cinq n ont aucune orientation commune — passerelle
                   horizontale, cheminees verticales, grillage affaisse, haubans
                   en diagonale, montants d immeuble — et deux bords
                   interchangeables annuleraient tout le travail fait sur le sol
                   et les blocs. Meme role que la garde qui refuse un ralenti et
                   un glissant sous le meme dessin.
                   LE SECTEUR A DONC SA SECONDE PERIODE : des HALOS et non des
                   taches. Les quatre autres posent de la salissure a cette
                   echelle — rouille, vegetation, suie, givre ; une rue de nuit a
                   des ilots de lumiere et du noir entre eux, et c est ce qui lui
                   donne son rythme quand on la traverse.
                   Les deux verificateurs sont enregistres verts APRES avoir ete
                   vus rouges sur mutation.

     0.29.9 lot 10 LA CHENILLE N APPARTENAIT QU A L USINE, ET LE SECTEUR LA
                   PORTAIT. Troisieme et dernier aiguillage par lieu a defaut
                   implicite : `ledDe`, cinq valeurs choisies par une chaine de
                   ternaires. Le cinquieme lieu heritait donc du profil emissif
                   COMPLET de l Usine — seuil, longueur, portee et TYPE.
                   ET LE TYPE PORTE UN COMPORTEMENT : `dessinerLed` fait courir un
                   point sur une bande d Usine, et son commentaire dit noir sur
                   blanc pourquoi ca n appartient qu a elle — un point qui COURT
                   dit qu une ligne TOURNE. Une devanture ne tourne pas. La regle
                   etait ecrite, le code disait le contraire, et rien ne pouvait
                   le signaler : meme forme exacte que la gueule de four jamais
                   dessinee que ce depot avait deja payee.
                   `LED` EST UNE TABLE, `verifierLed()` la croise avec `BIOMES`
                   dans les deux sens ET refuse deux lieux sous le meme `type` —
                   la meme question que `verifierPremierPlan` pose sur les
                   silhouettes de bord, parce que c est la meme faute : deux lieux
                   qui disent la meme chose ne sont plus deux lieux.
                   `seuil` et `porte` gardent leur variation PAR FAMILLE, avec un
                   `defaut` explicite que le verificateur exige : un four ouvre sa
                   gueule, une conduite jamais, et cette nuance-la n est pas du
                   defaut implicite mais une regle ecrite.
                   LE SECTEUR EMET NEUF FOIS SUR DIX, la part la plus haute des
                   cinq, et c est son identite : sa masse batie EST de la
                   signaletique. La bande la plus longue (0,72), la portee la plus
                   grande (118) — une devanture eclaire le trottoir d en face, pas
                   seulement son propre pied.
                   ET SON COMPORTEMENT EST LE TROISIEME ETAT D ENTRETIEN du depot.
                   Le TUBE de la Friche grelotte : un neon mort qui ne s amorce
                   plus. L ENSEIGNE tient sa lumiere puis LACHE d un coup,
                   brievement, et revient : un ballast fatigue, pas un tube mort.
                   La BANDE de l Usine respire, parce que l installation marche.
                   Elle ne pouvait pas grelotter comme la Friche : ce lieu VEND, et
                   une enseigne illisible ne vend rien.
                   LES NEUF VERIFICATEURS DE RENDU SONT VERTS. Les trois
                   aiguillages a defaut implicite sont fermes — `cuire`,
                   `cuireMacro`, `drawPremierPlan` au lot precedent, `ledDe` ici.
                   `evacDe` reste une chaine, et c est JUSTE : il commence par
                   `biomeKey() !== "usine"`, donc son appartenance est ecrite au
                   lieu d etre heritee.

    0.29.10 lot 11 DEUX LIEUX NE PEUVENT PAS AVOIR LA MEME COULEUR, ET CA SE
                   MESURE. Le depot refusait deja deux lieux sous la meme
                   silhouette de bord, sous le meme type de source, et deux
                   mecaniques opposees sous le meme dessin. La CHARTE etait le
                   dernier axe d identite qu aucune mesure ne tenait.
                   ET LE CINQUIEME LIEU EST PARTI FAUX. Son sol etait a 3,5 de dE
                   de celui de la Nebuleuse — la paire la plus proche du depot,
                   LOIN devant la deuxieme a 6,1. Deux lieux quasi indistinguables
                   sur la surface qu on regarde le PLUS, livre en 0.29.7 avec neuf
                   verificateurs verts, parce qu aucun ne regardait la couleur.
                   C est le troisieme defaut du Secteur trouve apres coup, et le
                   seul que je ne pouvais pas voir autrement qu en le mesurant.
                   LA MESURE A RAMENE LE LIEU A CE QUI ETAIT DEJA ECRIT deux
                   lignes plus bas dans sa propre fiche : `k: 0.44`, le plus bas
                   des cinq, parce qu une rue trempee RENVOIE la lumiere et que
                   rien n y est vraiment noir. Un sol quasi noir contredisait sa
                   propre justification. `arena` passe a #181026 (dE 10,6 du plus
                   proche), `bloc` a #4e3f6c (16,4), et la tuile de `material.js`
                   suit — elle etait calee sur l ancienne valeur, a 7,2 de son
                   propre fond, elle est maintenant a 1,0.
                   EN LAB, PAS EN RVB : deux hex proches en octets peuvent etre
                   loin a l oeil et l inverse. CIE76 suffit — on demande « est-ce
                   que ces deux lieux se confondent », pas une egalisation fine.
                   LES SEUILS SONT LES MINIMA DEJA ACCEPTES par les quatre lieux
                   d origine, pas des chiffres choisis : `arena` 6 (fonderie /
                   friche a 6,1), `bloc` 9 (usine / nebuleuse a 9,8), `emis` 8
                   (usine / friche a 8,4). Le verificateur dit donc exactement
                   « ne fais pas pire que ce qui existe », et il ne peut pas
                   devenir rouge sur l existant.
                   `dir` N EST PAS VERIFIE, deliberement : deux lieux peuvent
                   partager leur direction de lumiere sans consequence, puisqu on
                   n en voit jamais deux sur le meme ecran — la regle sur les
                   ombres vaut DANS une vue, pas entre deux lieux.
                   Enregistre vert APRES avoir ete vu rouge sur la couleur
                   exactement telle qu elle a ete livree en 0.29.7.
                   CE LOT DIT AUSSI QUE PLAN 26 EST EPUISE : la derniere premisse
                   qui restait a verifier — la relique de chaleur offerte sur une
                   arme sans chaleur — est corrigee des DEUX cotes, `_offerRelics`
                   et `visePalier`. Sept chantiers sur huit etaient perimes ou
                   deja faits ; restent 01 (bestiaire) et 06 (surchauffe).

    0.29.11 lot 12 L ARCHITECTURE DECIDE, LE SEMIS SUIT. Le lot 0.29.6 avait donne
                   des quartiers aux lieux, mais il les posait sur un hachage de
                   la cellule divisee : coherents avec eux-memes, et AU HASARD par
                   rapport aux batiments. Une « zone stockage » pouvait tomber a
                   dix metres d une presse et loin de tout rack. Les quartiers
                   etaient corrects et ne racontaient RIEN — c est exactement la
                   moitie du travail que le brief demandait, et la moitie facile.
                   La regle manquante etait une HIERARCHIE : un prop assez proche
                   d un bloc prend le quartier de ce bloc ; loin de tout, il
                   retombe sur le hachage. Et ce repli n est pas un defaut, c est
                   le SENS : le stockage et la circulation sont precisement ce qui
                   occupe l espace ENTRE les machines, donc ils n ont pas
                   d architecture propre a suivre.
                   LA DONNEE ETAIT DEJA LA. `occupe()` balayait les memes obstacles
                   pour eviter les collisions et JETAIT la distance. `sonder()` la
                   garde, et repond aux deux questions en un seul balayage —
                   `refresh()` teste une centaine de props, les separer relirait la
                   liste deux fois. Distance au RECTANGLE et non a son centre : une
                   chaine de 368 px rayonnerait depuis son milieu et ne dirait rien
                   a ses extremites.
                   LA MESURE A CORRIGE MON PROPRE REGLAGE, et c est le vrai
                   contenu de ce lot. A 190 px l architecture couvrait 62 a 78 %
                   du sol, donc les quartiers qu elle ne dessert pas tombaient a
                   0-1 % : le stockage et la circulation de l Usine, la chaussee du
                   Secteur etaient MORTS. Balayage a 60 / 90 / 120 / 190 : a 90 px
                   aucun quartier ne descend sous 11 %, et l architecture gouverne
                   un col d environ 4,5 m — assez pour qu un prop colle a sa
                   machine, pas assez pour manger l espace libre.
                   REPARTITION FINALE : 21 a 35 % des props suivent l architecture
                   (0 % avant), 47 a 60 % relevent du hachage en terrain libre,
                   18 % de fuite. Et les 9 (12 pour le Secteur) types restent tous
                   presents dans les cinq lieux — la fuite est ce qui le garantit.
                   `verifierZones()` couvre maintenant `QUARTIER` : une famille qui
                   pointe sur un quartier inexistant retomberait en SILENCE sur le
                   modulo, une famille du lieu absente de la table ne dirait rien
                   de ce qui l entoure, et un lieu dont toutes les familles menent
                   au meme quartier n aurait pas de composition. Les trois fautes
                   verifiees rouges avant enregistrement.

    0.29.12 lot 13 LE SECTEUR EST SURELEVE, ET IL LE MONTRE. Le brief nomme la
                   profondeur « probablement le plus gros manque visuel actuel »
                   et concoit la map cyberpunk en quatre plans. J en avais livre
                   UN — le premier plan. UN SEUL LIEU DU DEPOT avait un
                   arriere-plan, la Nebuleuse, et ce n etait pas celui concu pour
                   montrer une skyline.
                   LE MECANISME EXISTAIT, IL N ETAIT PAS PARTAGEABLE. `fondEspace`
                   etait la seule recette possible, en dur, et `decor.js` la
                   demandait par un `fond !== "espace"` : un deuxieme lieu qui
                   declarait un fond n aurait simplement rien affiche. Trois tables
                   maintenant — `FOND` (ce qui se CUIT), `VITRAGE` (ce qui SEPARE),
                   `VIE` (ce qui BOUGE) —, et deux verificateurs, `verifierFonds`
                   et `verifierBaies`.
                   LA VILLE EST VUE D EN HAUT : des TOITS, pas des facades. Un
                   immeuble vu du dessus est un rectangle sombre borde de lumiere,
                   et c est la seule chose qui le distingue d une tache. Les
                   avenues sont posees AVANT les ilots — batir au hasard donne un
                   champ de rectangles, poser la trame puis batir dedans donne une
                   ville.
                   PAS DE NEON DANS LE FOND, et c est la regle du lieu appliquee :
                   le sature appartient aux enseignes, qui sont AU NIVEAU DU
                   JOUEUR. Une ville lointaine qui clignoterait en magenta
                   concurrencerait ses propres devantures. Le fond est froid et
                   sourd, et c est le contraste qui fait exister les enseignes.
                   UNE BAIE EST TOUJOURS PLEINE, et la regle vient de la Nebuleuse :
                   « un trou franc dans le plancher ment » — le joueur le traverse,
                   la horde le traverse, un obstacle peut tomber dessus. Le verre
                   devient donc un CAILLEBOTIS ici : les deux sont des sols sur
                   lesquels on marche, les deux laissent voir en dessous, et aucun
                   ne demande de toucher au deplacement. Il justifie du meme coup
                   ce que le lieu portait deja sans raison — ses grilles d air, ses
                   plaques d egout et son effluent donnent tous sur QUELQUE CHOSE.
                   ET LA CIRCULATION CIRCULE. `scintiller` et `orbite` sont propres
                   au vide : rien n y passe. Une ville, elle, a du trafic, et un
                   trafic immobile est une contradiction — la couche « pres » du
                   Secteur est la seule des six a deriver toute seule, en continu
                   et dans un seul sens. Deux couleurs qui disent le SENS : blanc
                   ce qui vient, rouge ce qui s eloigne.
                   Les trois fautes verifiees rouges avant enregistrement : fond
                   declare sans recette, sans habillage, et deux fonds sous le meme
                   habillage.

    0.29.13 lot 14 UN LIEU N AVAIT QU UNE SEULE MATIERE. La tuile de
                   `material.js` est cuite une fois par (lieu, mode, graine) :
                   elle donne au sol son grain et sa couleur, et c est tout ce
                   qu il dit. Deux endroits d une meme Usine — devant une presse
                   et au fond d un rack — portaient exactement le meme beton,
                   alors que ce qui les distingue dans une vraie installation
                   n est pas le MATERIAU mais ce qui lui est ARRIVE.
                   SIX PRIMITIVES PARTAGEES, PAS SOIXANTE MARQUES. Le brief
                   demande une grammaire de materiaux, pas un catalogue : les
                   memes six gestes — rouler, souiller, empoussierer, cendrer,
                   rayer, ruisseler — suffisent aux cinq lieux, et c est la TABLE
                   `MATIERE[lieu]` qui dit lequel appartient a quel quartier.
                   Ajouter un lieu = une ligne.
                   ELLES SUIVENT LE QUARTIER, DONC L ARCHITECTURE — et c est le
                   lot precedent qui rend celui-ci possible. Une trace de roulage
                   n a de sens que dans une circulation, une souillure que la ou
                   quelque chose fonctionne. Posees au hasard, ce serait du bruit
                   avec des noms.
                   `null` EST PERMIS, et c est un choix : un quartier sans trace
                   est du sol NU, et le contraste en a besoin. La Friche n a rien
                   sur sa cloture, la Nebuleuse rien sur sa voilure.
                   ET LA NEBULEUSE N A NI POUSSIERE NI ROULAGE. Sans gravite rien
                   ne se depose et rien ne roule : ce qui marque une coque est ce
                   qui l a HEURTEE. Elle porte donc des RAYURES, le seul des six
                   gestes qui ne demande pas de sol.
                   MEME CONTRAT QUE LE SEMIS : fonction pure de (cellule, graine),
                   rien ne s alloue, meme cache de fenetre de cellules. La trace
                   se sonde au CENTRE de la cellule et non a la position d un prop
                   — elle est plus grande que ce qui traine dessus, et une cellule
                   vide de props a autant de raisons d etre marquee. Deux cellules
                   sur trois seulement : au-dela le sol devient un tapis et plus
                   rien ne ressort.
                   SOUS LA GRILLE DE 20 M, comme l amer : c est de la matiere, pas
                   une graduation. Et sous les props — ce qui traine est POSE SUR
                   ce qui a marque le sol, jamais l inverse.
                   COUT MESURE, par vue et en densite `ultra` : 13 a 36 traces
                   pour 18 a 46 operations de dessin, contre une centaine de props
                   deja poses. Environ un tiers de ce que coute la couche qui
                   existait. Le Secteur en porte deux fois plus que les autres —
                   aucun `null` dans sa ligne, et son architecture couvre plus de
                   sol : une rue mouillee est marquee partout.
                   `verifierTraces()` refuse un lieu sans matiere, un lieu qui en
                   pose moins de DEUX differentes (sans quoi il n y a pas de
                   grammaire, juste une texture), une longueur qui ne suit pas ses
                   quartiers, et une primitive ecrite que plus aucun lieu ne tire.
                   Verifie rouge sur trois mutations, dont une qui en a leve deux.

    0.29.14 lot 15 LA RECOMPENSE LA PLUS RARE DU JEU ETAIT MUETTE. `hud.js` ne
                   jouait pas UN son — zero appel a `playSound` dans tout le
                   module —, et c est lui qui porte le bandeau de haut fait : son
                   propre nœud, sa propre transition, sa fenetre de 3,2 s, et
                   aucune voix. Une recompense muette est une notification qu on
                   peut manquer entierement, et c est la seule chose que le jeu
                   accorde qui ne s entende pas.
                   AVANT DE L ECRIRE, LE RELEVE : 50 recettes declarees, 27 noms
                   joues en litteral, ZERO fantome — le son du depot est bien plus
                   complet que le brief ne le suppose. Impacts, boss, niveau,
                   relevement, recolte, bonus, evenements, interface : tout sonne.
                   Les 23 recettes absentes du releve litteral passent par un nom
                   CALCULE (`ficheDe`, `matiereDe`, `voixDe`, `bonusFamille`), que
                   `verifierFeedback()` croise deja. Le seul trou etait celui-la.
                   ET AUCUNE DES 50 NE POUVAIT SERVIR : `niveau` est la montee de
                   niveau, `bonusSurvie` un ramassage, `bossBrise` une barre.
                   Une 51e, donc, et elle se separe de `niveau` — l autre triade
                   montante — sur trois points : `niveau` est un evenement
                   d EQUIPE, rapide, en triangle, sur une fondamentale grave qui
                   RESOUT ; celui-ci est PERSONNEL, plus lent, en sinus, et il se
                   pose sur une quinte TENUE qui laisse l accord ouvert. Une
                   triade qui se resout dit une etape, une triade qui reste
                   ouverte dit un accomplissement. Et il ne claque pas : aucun
                   bruit, aucun transitoire — ce qui claque ici est ce qui frappe,
                   et un haut fait ne frappe personne.
                   LE HAUT FAIT D UN ALLIE RESTE MUET, et c est deja la regle du
                   depot : seuls les tiens produisent un bandeau, ceux des allies
                   passent en une ligne du fil. Leur donner la meme fanfare
                   effacerait cette distinction.
                   `sonsManques()` FERME LA CLASSE. Le depot savait deja qu un nom
                   de recette faux rend `false` et devient muet — c est ecrit
                   au-dessus de `recettes()` — et `verifierFeedback` couvre les
                   noms calcules. Les noms LITTERAUX, une trentaine ecrits a la
                   main, n etaient couverts par rien. On ENREGISTRE donc ce qui a
                   ete demande et qui n existait pas, au lieu de tenir une seconde
                   liste de noms attendus qui pourrirait. Rien sur le chemin
                   chaud : la recherche a lieu de toute facon. Verifie sur deux
                   fautes de frappe, comptees et nommees.

    0.29.15 lot 16 UN BUILD SE VOYAIT COMME UNE PILE DE POURCENTAGES. Le joueur
                   empilait des statistiques sans qu aucun ecran ne lui dise qu il
                   venait de fabriquer une FACON DE JOUER. Sept archetypes se
                   lisent maintenant sur ce qu il possede, et le badge se pose a
                   cote de sa classe — la classe est CHOISIE, l archetype est
                   CONSTATE.
                   IL NE CHANGE RIEN, ET C EST LA CONDITION. Aucun bonus, aucun
                   deblocage, aucun filtre de tirage : pure lecture de l etat de
                   build que le client a deja, rien de plus ne circule. Un badge
                   qui modifierait quoi que ce soit serait une classe cachee.
                   IL NE POUVAIT PAS SE DEDUIRE DE `family`, ET C EST MESURE.
                   `family` est une ECHELLE VERTICALE — vingt-et-une familles de
                   quatre cartes, une par rarete — et 94 cartes sur 178 n en ont
                   AUCUNE, dont precisement les cartes-graines (`elan`, `meute`,
                   `adrenaline`, `symbiose`). Surtout, elle est LOURDE :
                   `eligibleCards` refuse un palier inferieur a ce qu on possede,
                   les armes filtrent dessus, `appliquerEchelle` la lit. Poser une
                   famille sur une graine pour la rattacher a un archetype aurait
                   change CE QUI SORT DU TIRAGE. Un archetype cite donc des
                   familles ET des cartes nommees, et ne touche a rien.
                   LES SEUILS SORTENT DE LA MESURE. Plafond tenable par archetype :
                   sniper 13, forteresse 10, berserker 8, demolition 8, acrobat 7,
                   technicien 7, incendiaire 5. Mais quatre des treize du sniper et
                   quatre des huit de la demolition n arrivent QU AVEC une arme
                   precise — sans la grenade, la demolition tombe a QUATRE. Un
                   seuil de 4 l aurait rendue inatteignable pour qui ne joue pas
                   cette arme, et aurait exige 4 cartes sur 5 a l incendiaire.
                   D ou TROIS, et `verifierBuilds()` refuse tout seuil qu un
                   archetype ne peut pas atteindre SANS son arme dediee.
                   ET LA MESURE CORRIGE LE PLAN 26 : il avertissait contre
                   « Acrobat, risque d archetype creux ». Le plus fragile est
                   l INCENDIAIRE (plafond 5), et c est celui que le brief prend en
                   exemple. Acrobat en tient sept, toutes universelles — plus que
                   la demolition sans sa grenade.
                   UNE ERREUR ATTRAPEE EN CHEMIN, et elle aurait ete silencieuse :
                   `buildInfo` expose `counts`, pas `cards`. `archetypeDe(undefined)`
                   rend `null`, donc aucun badge et AUCUNE erreur — le lot entier
                   aurait paru fonctionner.
                   Verifie sur l exemple exact du brief (braises, incendiaire,
                   brasier, catalyseur) : `incendiaire`, n = 4. Deux cartes seules
                   ne declenchent rien. Trois mutations rouges, temoin vert.

    0.29.16 lot 17 LE CODEX A SA DONNEE. Premier lot d une serie : ce qu un compte
                   a RENCONTRE, enregistre, persiste et transporte. L ecran vient
                   ensuite ; sans cette moitie-la il n aurait rien a montrer.
                   RENCONTRE ET NON VAINCU, et c est la seule decision qui compte
                   ici. `milestones` porte deja `boss_<kind>` pour les boss TUES,
                   ecrit a la fin de manche : le reutiliser aurait laisse en « ? »
                   eternel tout boss qui vous tue. Les deux existent donc, et ils
                   ne disent pas la meme chose. La cle s ecrit a l APPARITION du
                   corps et a l ARRIVEE du boss.
                   DEUX POINTS D ECRITURE, ET CE SONT LES POINTS DE PASSAGE :
                   `_spawnEnemy` — le seul endroit ou un corps nait — et le bloc
                   d apparition du boss. Le codex ne peut donc pas rater un type.
                   Il note la LIGNE DE BASE et non la variante : une elite n est
                   pas une creature de plus.
                   DES CLES, PAS DES INDEX. `ENEMY_TYPES` et `BOSS_ROSTER` sont
                   append-only, mais un profil dure plus longtemps qu une table, et
                   c est le seul champ de progression qu on ne pourrait JAMAIS
                   reparer si les index bougeaient — il n a pas de source de verite
                   ailleurs. `e:grunt`, `b:metronome`.
                   PAS DE BUMP DE `PROG_CFG.VERSION`, ET C EST DELIBERE. Le magasin
                   fait `reset = row.version < VERSION && !migre` : ajouter le champ
                   par une version aurait REMIS A NEUF tout profil sans entree de
                   migration — on aurait efface la progression de tous pour un
                   tableau vide. Le depot a deja le bon motif deux lignes au-dessus
                   (`if (!Array.isArray(profile.hf)) profile.hf = []`) : on
                   normalise a la LECTURE, et un compte existant commence son codex
                   a zero sans rien perdre.
                   UNE MANCHE PERDUE COMPTE. Le repli passe par `awardRun`, appele
                   depuis `endRound`, qui couvre les DEUX sorties : on a bien
                   rencontre ce qu on a rencontre, meme en mourant.
                   `verifierCodex()` refuse une cle inconnue, une entree sans cle,
                   et deux entrees qui partageraient la leur. Une cle mal formee ne
                   leve rien du tout : elle se persiste pour toujours et laisse son
                   entree en « ? » que le joueur ne pourra jamais ouvrir.
                   MESURE : 24 entrees (13 corps, 11 boss), les treize types notes
                   quand le bestiaire est deverrouille, le boss note a l arrivee,
                   et un second repli de la meme manche n ajoute rien.
                   ET UN PIEGE DE MESURE, PAS UN DEFAUT : forcer les treize types a
                   la minute zero n en enregistre qu UN. `adaptType` replie ce qui
                   n est pas encore debloque sur le grognard — le codex note donc
                   ce qui est REELLEMENT apparu, et c est la bonne semantique.

    0.29.17 lot 18 TREIZE CREATURES N AVAIENT PAS DE NOM. Elles n avaient que leur
                   cle de code — `grunt`, `brood`, `bulwark` —, jamais montree, et
                   le jeu les a fait combattre pendant tout ce temps sans jamais
                   les nommer. Un bestiaire commence par la. Deuxieme lot de la
                   serie du codex : ses TEXTES.
                   ET LE RELEVE A CHANGE LE LOT. Les BOSS, eux, portent deja
                   `nom`, `verbe`, `sous` et `archetype` — leur fiche se DEDUIT, il
                   n y avait rien a ecrire pour eux. Ce lot ne touche donc que les
                   corps de horde.
                   CE QUI S ECRIT ET CE QUI SE DEDUIT, et la ligne entre les deux
                   est celle de `feedback.js`. Le NOM et le LORE s ecrivent :
                   aucun chiffre ne les porte. Le ROLE se DEDUIT de la fiche de
                   combat — `splits`, `shieldArc`, `egideRadius`, `poseCd`,
                   `lienRange`, vitesse, masse — parce qu un role redige a la main
                   aurait menti au premier equilibrage et que personne n aurait
                   pense a le relire.
                   UN CAS QUE LE VERIFICATEUR A TROUVE, ET QUI N ETAIT PAS UN
                   DEFAUT : le fantassin ne declenche AUCUNE ligne de role. Normal
                   — les deux references de comparaison SONT ses propres chiffres,
                   donc il est litteralement l etalon des douze autres. Mais une
                   fiche vide aurait eu l air d un texte manquant sans en etre un,
                   d ou un repli qui le DIT. `verifierFiches()` peut donc exiger
                   qu aucune creature ne soit sans role.
                   `enemies.js` IMPORTE MAINTENANT `i18n.js`, et c est l exception
                   que `CLAUDE.md` nomme deja : tout ce qui porte du texte de
                   joueur l importe (`cards.js`, `reliques.js`, `units.js`).
                   Feuille vers feuille, aucun cycle — `game_state.js` importe
                   `enemies.js`, jamais l inverse.
                   `verifierFiches()` croise dans les deux sens : une creature sans
                   fiche afficherait sa cle de code a l ecran, ce qui a l air d un
                   texte manquant sans en etre un ; une fiche qu aucune creature ne
                   tire est du texte a traduire pour rien. Et deux creatures de
                   meme nom rendraient le bestiaire illisible. Trois mutations
                   rouges, temoin vert.

    0.29.18 lot 19 L ECRAN DU CODEX. Troisieme lot de la serie : la donnee
                   (0.29.16) et les textes (0.29.17) avaient de quoi remplir une
                   page, il leur manquait la page.
                   LE « ? » N EST PAS UNE CASE VIDE. Il garde la place, la taille
                   et le rang de la fiche qu il cache : on voit donc TOUJOURS
                   combien il en reste et ou elles sont. Une grille qui
                   n afficherait que le connu serait une liste, pas une
                   collection — elle ne dirait pas qu il manque quelque chose.
                   Et la carte fermee n est pas GRISEE : une carte assombrie a
                   l air desactivee, donc d une chose qu on ne peut pas avoir. Ici
                   on PEUT l avoir, il suffit de croiser la creature. Elle garde
                   son fond et perd seulement son contenu.
                   AUCUN CHIFFRE DE COMBAT SUR UNE FICHE. Le codex dit ce qu une
                   creature EST et ce qu elle FAIT ; ses PV et ses degats
                   appartiennent a l equilibrage et changeraient sous le texte.
                   `roleDe()` porte le comportement et se DEDUIT, donc il suit un
                   reglage tout seul.
                   LE BOSS N A RIEN A ECRIRE : `bossNom`, `bossSous` et
                   `bossVerbe` existent deja — ecrits pour l annonce d arrivee, et
                   ils disent exactement ce qu un codex doit dire. Un second texte
                   les aurait fait diverger.
                   LES CINQ REGLES CSS SONT TENUES, et c est le filet de ce lot :
                   `verifierEcrans` croise la table `ECRANS` avec la feuille dans
                   les deux sens, sur `entre`, `sort`, `balaye`, `curseur` et
                   `crochet`. Seize ecrans, rien a signaler — un ecran a moitie
                   enregistre disparaitrait d un coup au lieu de sortir, et ses
                   boutons seraient muets. C est exactement ce qui etait arrive a
                   `#hautsFaits` avant 0.28.0.
                   QUATRE VARIABLES CSS N EXISTAIENT PAS. Le premier jet employait
                   `--r-2`, `--fs-1`, `--fs-4` et `--panel` : aucune n est definie,
                   et une variable absente ne leve RIEN — la regle tombe et la
                   carte s affiche sans rayon, sans taille et sans fond. Relevees
                   une par une contre `tokens.css` et ce que `cssVars()` expose,
                   puis remplacees par `--radius`, `--t-s`, `--t-l`, `--bg-panel`.
                   `--fs-1` et `--fs-4` sont d ailleurs deja employees AILLEURS
                   dans la feuille sans etre definies : defaut anterieur, laisse
                   tel quel, mais pas propage.
                   Verifie sur trois etats — compte neuf 0/24, apres une manche
                   3/24, tout rencontre 24/24 — et l ecran est servi par le
                   serveur avec son bouton.

    0.29.19 lot 20 LE CODEX PREND SES DEUX AUTRES FAMILLES : cartes et reliques.
                   237 entrees au lieu de 24.
                   UN SEUL CHAMP, PAS TROIS. Elles auraient pu avoir leur propre
                   tableau — ce sont les memes questions, qu ai-je rencontre et que
                   me reste-t-il — mais trois systemes paralleles auraient demande
                   trois replis dans `awardRun`, trois normalisations a la lecture
                   et trois verificateurs. Le prefixe suffit a les separer, et
                   `codexSection()` est le seul endroit qui le sache.
                   ET LES QUATRE N ENTRENT PAS AU MEME MOMENT. Un corps et un boss
                   entrent a la RENCONTRE : on les subit, on ne les choisit pas.
                   Une carte et une relique entrent quand on les PREND, pas quand
                   on les voit — une carte apercue dans un tirage n a rien appris a
                   personne, et « avec quoi ai-je deja joue » a une reponse la ou
                   « qu ai-je deja apercu » n en a pas.
                   DES PUCES ET NON DES FICHES, et ce n est pas une economie de
                   place. Le texte d une carte EXISTE DEJA — au tirage, chez le
                   marchand, sur l ecran de build : le repeter ici en ferait une
                   TROISIEME copie a tenir a jour, ce que ce depot refuse partout
                   ailleurs. Ce que le codex apporte pour elles est ce qu aucun
                   autre ecran ne dit : combien il en reste, et lesquelles.
                   La fiche reste riche pour les creatures parce que la
                   l information n existe nulle part ailleurs — rien dans le jeu
                   ne nommait un Pavois avant le lot precedent.
                   L ORDRE DES PUCES EST CELUI DU CATALOGUE, jamais « obtenues
                   d abord » : il est stable d une visite a l autre, donc un trou
                   reste au meme endroit et se REMARQUE. Trier par decouverte
                   ferait bouger la grille a chaque prise et effacerait cette
                   lecture.
                   UN COMPTEUR PERIME ATTRAPE PAR SON PROPRE VERIFICATEUR :
                   `verifierCodex` comparait le nombre de cles a une SOMME ECRITE
                   (`ENEMY_TYPES.length + BOSS_ROSTER.length`), donc il a cri au
                   doublon des que le codex a grandi. Il se releve maintenant sur
                   `codexClefs()` — ajouter une famille ne doit pas obliger a se
                   souvenir d un compteur ailleurs. 237 cles, zero doublon.
                   Les cinq regles CSS restent tenues sur les seize ecrans, et
                   toutes les variables de la feuille resolvent.

    0.29.20 lot 21 UN FIL D ARIANE QUI NE MONTRE QUE LA FEUILLE N EN EST PAS UN.
                   `syncTopbar` posait `vue.fil()` — UNE etiquette —, donc ouvrir
                   le Codex depuis un salon affichait « Codex » et perdait le fait
                   qu on etait dans une salle. La question que cette barre doit
                   repondre n est pas « quel ecran » mais OU SUIS-JE, et les deux
                   ne se confondent qu au premier niveau. C est la demande du
                   brief, mot pour mot : « le joueur doit savoir ou il est ».
                   `parent` EST UNE FONCTION, pas une chaine, parce que le chemin
                   d un ecran n est pas toujours le meme : les Parametres s ouvrent
                   depuis le hub, un salon, un bilan ou la progression, et
                   `settingsFrom` sait deja lequel — on le RELIT au lieu d en tenir
                   une seconde copie qui divergerait. C est le seul des cinq
                   parents qui varie.
                   ET LA MESURE A TROUVE UN DEFAUT QUE LE PREMIER JET AVAIT :
                   le point median sert DEJA dans les libelles — « Salon · Nuit »,
                   « Progression · Tireur » —, donc l employer aussi entre les
                   niveaux rendait « Salons · Salon · Nuit · Codex » : quatre items
                   plats la ou il y a trois niveaux. Le chevron dit la DESCENTE, le
                   point median QUALIFIE. Deux roles, deux signes.
                   LA REMONTEE EST BORNEE, et pas par prudence : un parent qui
                   pointerait vers lui-meme ferait une boucle infinie dans la barre
                   de titre — la page GELE sans lever la moindre erreur.
                   `verifierFil()` refuse le cycle et le parent inconnu, la borne
                   rattrape ce qui passerait quand meme.
                   Trois mutations rouges (parent inconnu, cycle, parent sans fil),
                   etat reel vert, et les cinq regles CSS restent tenues sur les
                   seize ecrans.

    0.29.21 lot 22 LES HAUTS FAITS DEVIENNENT DES PLAQUES. Le systeme derriere
                   etait deja riche — progression chiffree, trois niveaux,
                   recompenses nommees, treize cadres — et il s affichait en lignes
                   de texte : rien n y donnait envie de collectionner. C est le
                   §5-6 du brief, et le plan 25 avait deja repare l ecran sans
                   toucher a ce qu il montre.
                   DEUX FORMES, ET C EST LA MESURE QUI L IMPOSE. Le plan 26
                   demandait de « verifier la forme exacte de `hfProgres` avant de
                   coder l etat intermediaire » : sur les 36 hauts faits,
                   DIX-HUIT seulement ont une progression chiffree utile
                   (`max > 1`) — dix-sept n en rendent aucune et un seul a `max: 1`.
                   Les dix-huit autres sont a pile ou face : `debout`,
                   `intouchable`, `foudroyant`, `puriste`, `ascete`...
                   UNE GRILLE UNIFORME AURAIT DONC MONTRE DIX-HUIT BARRES VIDES,
                   soit exactement la moitie des plaques ayant l air CASSEE. Celles
                   qui n ont pas de compteur montrent leur CONDITION a la place :
                   l information existe (`hfTexte`), elle n a simplement pas la
                   forme d une jauge. Et une barre a zero aurait dit « bloque » la
                   ou il faut lire « pas encore ».
                   OBTENU N EST PAS « ALLUME », C EST « PLEIN » : le lisere passe
                   au ton de gain et la plaque cesse d etre sourde, sans rayonner.
                   Une plaque acquise qui brillerait concurrencerait le bandeau
                   d obtention — le seul moment ou ca doit se voir, et il a
                   maintenant sa voix depuis 0.29.14.
                   Verifie aux trois etats : compte neuf 0 obtenus / 18 jauges /
                   18 conditions, moitie faite 18/5/13, tout obtenu 36/0/0. Les 36
                   sont couvertes a chaque fois, aucune jauge sans denominateur.
                   Les cinq regles CSS tiennent sur les seize ecrans, le fil reste
                   vert, et toutes les variables de la feuille resolvent.

    0.29.22 lot 23 LA CHAMBRE THERMIQUE : la seule carte qui change le CONTROLE de
                   l arme. On tire en tenant le clic, l arme chauffe et frappe
                   jusqu a +70 %, et a saturation elle se tait 1,5 s.
                   ET LA PREMISSE DU PLAN 26 ETAIT FAUSSE. Il annoncait « rien de
                   nouveau cote moteur de chaleur — c est le systeme du laser,
                   reutilise ». Mesure : `chaleur` n est pas une ressource
                   generique, elle est SOUDEE a la livraison en faisceau. Les deux
                   vivaient dans le meme `if (arme.chaleur)`, et `_shoot` ne
                   demande qu `interval > 0` — poser `chaleur: true` sur le Tir
                   standard l aurait fait tirer DEUX FOIS, le faisceau et les
                   balles. Le faisceau se garde donc sur ce qui le definit, un
                   intervalle NUL ; la chaleur sur ce qui la porte, arme ou carte.
                   A COUPS DISCRETS, LA CHALEUR MONTE PARCE QU ON TIENT, pas parce
                   qu on touche : lier la montee au contact punirait de viser une
                   cible qui bouge, alors que le choix qu on demande au joueur est
                   QUAND relacher.
                   ET LA CHALEUR DEVAIT PAYER SUR LE COUP. Le bonus ne vivait que
                   dans `_faisceauInterne` : sans ca, l arme aurait porte une jauge
                   qui monte, se tait a saturation, et ne rend RIEN — que du risque.
                   +70 % ET NON +55 %, ET C EST LA SIMULATION QUI LE DIT. A +55 %,
                   un joueur PARFAIT rendait 72,3 de DPS contre 75,0 en
                   automatique : la carte etait strictement PIRE que de ne pas la
                   prendre. A +70 % il repasse devant d environ 5 %, et l ecart
                   parfait/moyen ne bouge presque pas — il tient au taux
                   d occupation, pas au bonus final. C est le PLANCHER qu on regle,
                   pas la recompense du bon joueur. Le reste s equilibrera en jeu.
                   LA GACHETTE EST CONTINUE, comme la visee et la portee au
                   reticule — les ponctuels (`d`, `s1`..`s3`) se remettent a zero
                   apres le tick, pas elle. Elle se relache sur TROIS evenements :
                   `mouseup`, `blur` de la fenetre et `mouseleave` du canvas. Sans
                   les deux derniers, un alt-tab en plein tir la laisse ENFONCEE
                   pour toujours. Le champ part toujours, meme sans la carte, et le
                   serveur ne le lit que si `tirManuel` est pose : `?? true` fait
                   qu un client qui ne l envoie pas tire comme avant.
                   UN DEFAUT TROUVE PAR LE TEST, ET IL ETAIT SILENCIEUX : en `apply`
                   ordinaire, l ordre du catalogue faisait passer `surchauffe`
                   AVANT `chaine_assaut`, donc `noOverheat` n etait pas encore pose
                   et la garde ne voyait rien — les deux cartes ensemble donnaient
                   une gachette SANS contrepartie, exactement ce que la garde
                   devait empecher. Passee en `applyAfter`, elle lit un
                   `noOverheat` definitif.
                   SIX NON-REGRESSIONS, comptees a `_shoot` qui est le point de
                   passage : sans la carte, 60 tirs sur 10 s que le champ soit
                   absent, faux ou vrai ; avec, 44 en tenant (les mutismes) et 0
                   en relachant ; le laser en rend toujours 0, il est un faisceau.

    0.29.23 lot 24 LE FEU S ETEINT AU LIEU DE CLIGNOTER, ET IL LAISSE UNE TRACE.
                   Les deux dernieres etapes du §2 du brief — « les flammes
                   disparaissent, les braises restent un moment, le sol brule
                   reste » — dont je n avais livre que la premiere.
                   UN OUBLI DANS MON PROPRE LOT 0.29.1. La teinte d equipe couvrait
                   QUATRE canaux — braise, bord, fond, hachure — et je les ai tous
                   corriges. Le CINQUIEME, `dying`, avait survecu : le sol brulant
                   d un joueur mourait encore en rose pale, la couleur de la zone
                   de horde. Cinq canaux, quatre corriges, et rien ne l a dit.
                   UNE ZONE DE HORDE CLIGNOTE, UN FEU S ETEINT, et c est la meme
                   difference qu entre un avertissement et une matiere. Le
                   clignotement est un carre (`sin > 0`), donc a flanc FRANC : il
                   annonce une echeance, ce qui est juste pour un sol qui va cesser
                   de blesser le JOUEUR. Le sol brulant d une carte ne blesse que
                   la horde — il n a personne a avertir, et un flanc franc y
                   fabriquerait un telegraphe qui ne dit rien. Il retombe donc en
                   continu sur ses trois dernieres secondes, vers une cendre tiede.
                   ET LE SOL BRULE RESTE. `scorches` ne se posait que sur une
                   DETONATION (`zoneResolved`, `blast > 0.15`), or un sol de carte
                   a `blast: 0` — verifie : `warn 0, blast 0, life 4`. Il naissait
                   sous une explosion qui a deja son propre dessin, et s eteignait
                   sans rien laisser.
                   ON DETECTE LA DISPARITION, ON NE LA FAIT PAS DIRE PAR LE RESEAU :
                   le serveur n a pas a annoncer qu une zone s eteint, le client la
                   voyait a l image precedente et ne la voit plus. Meme idiome que
                   `zoneMotion` et `blastSeen` — une carte cote client, bornee,
                   videe quand elle grossit. Aucun champ de plus ne circule.
                   SEULEMENT LE FEU D UN JOUEUR : une zone de horde qui expire a
                   deja son clignotement, et laisser une trace la ou le danger a
                   CESSE dirait le contraire de ce qu on veut.
                   Verifie sur quatre questions : la trace se pose quand le feu
                   disparait et pas avant, une seule fois, jamais pour une zone de
                   horde, et le plafond de 24 tient sous soixante disparitions.
                   LA NAISSANCE N EST PAS AJOUTEE, et c est un choix : le sol de
                   carte nait SOUS une explosion, qui a deja son burst, sa secousse
                   et son eclat. Un second depart y serait un doublon.

    0.29.24 lot 25 DEUX COMMUNES POUR UN SEUL PALIER DE PUISSANCE. Le plan 26 le
                   signalait ; la mesure le confirme, et par un chemin qu il ne
                   donnait pas : la distance d une balle vaut `vitesse x duree`,
                   donc « Poudre dense » (+12 % de vitesse) ALLONGEAIT AUSSI LA
                   PORTEE de 12 %. Elle faisait le meme travail que le palier 0 de
                   l echelle `portee`, en moins lisible et hors de l echelle.
                   L ECHELLE DONNAIT DEJA LES DEUX STATS A PARTIR DU PALIER 1 :
                   vitesse x1,10 / x1,20 / x1,40 pour `chargeur_long`,
                   `canon_siege`, `horizon`. Seul le palier 0 n en donnait qu une —
                   et la carte hors echelle portait l autre. `canonLong` recupere
                   donc sa moitie manquante et « Poudre dense » disparait.
                   +5 % ET NON +12 % : la vitesse de l echelle monte desormais
                   1,05 / 1,10 / 1,20 / 1,40, monotone sur les DEUX axes. Reprendre
                   le chiffre de la poudre aurait rendu le palier 0 plus rapide que
                   le palier 1. Trois exemplaires donnent x2,01 de portee la ou les
                   deux cartes ensemble en demandaient SIX pour x2,38.
                   RETRAIT SUR : `CARDS` est append-only, mais rien ne le lit par
                   INDEX — tout passe par `CARD_BY_ID`, verifie sur tout le depot.
                   Et « poudre » n etait cite nulle part ailleurs que dans sa
                   definition et sa traduction : ni haut fait, ni archetype, ni
                   progression.
                   ET LE VERIFICATEUR A ATTRAPE UNE CONSEQUENCE QUE JE N AVAIS PAS
                   VUE. `verifierCartes` exige `communes >= epiques x 1,5`, et ce
                   plancher est DYNAMIQUE. Trace : avant la session 44/28, plancher
                   42,0 — confortable. La Chambre thermique (0.29.22, epique) l a
                   monte a 43,5 : encore vert, mais a marge NULLE. La fusion a
                   retire la derniere commune de reserve, et il est passe rouge.
                   Deux de mes propres changements, dont aucun n est fautif seul.
                   « Recolte » descend donc en commune, et c est elle et pas une
                   autre : de toutes les peu-communes sans famille, c est le seul
                   effet qui n ouvre AUCUNE mecanique — pas de rebond, pas de
                   tourelle, pas d etat, pas d aura. Huit pour cent de fragments a
                   cinq PV est un appoint, et un appoint est ce qu une commune doit
                   etre. Pool revenu a 44/29, plancher 43,5, vert.
                   178 cartes. `verifierCartes`, `verifierBuilds` et
                   `verifierCodex` verts, et une manche de 120 s tourne.

    0.30.1 lot 1 UNE RELIQUE LUE DANS UN SEUL SENS. `verifierReliques` existait
                   deja et couvrait le sens CHAMP -> LECTEUR : il relit la source
                   des methodes de `GameState` et exige que chaque champ y
                   apparaisse en litteral. Le plan 27 l a d abord cru absent — il
                   n est pas exporte par `reliques.js` mais par `game_state.js`.
                   Le sens INVERSE manquait, et il etait aveugle a trois choses :
                   un LECTEUR qui reclame un champ que plus aucune relique ne
                   porte (systeme ecrit avant sa relique, champ renomme d un seul
                   cote) — un `_relicFlag(p, "blindageFlat")` ajoute laissait le
                   controle VERT et rendait zero ; un `requiresSystem` mal
                   orthographie, compare EN DUR a deux points, qui n exclut alors
                   plus rien et fait offrir la relique sans que le systeme existe ;
                   une entree d `ARME_EXIGENCE` que plus personne ne demande.
                   Les trois se MESURENT sur la source au lieu de tenir une
                   seconde liste qui pourrirait — meme idiome que `sonsManques`.
                   Les trois prouves rouges par mutation, puis verts.

    0.30.2 lot 2 SIX CONTREPARTIES SUR NEUF DISAIENT LA MEME CHOSE. « -N PV bruts »
                   etait la seule monnaie du catalogue, et la cause etait
                   structurelle : le controle ne connaissait que « ce drapeau est
                   un malus » et « ce champ negatif est un malus ». Le sens
                   POSITIF n avait pas de case, donc payer en cadence, en esquive
                   ou en charge etait irrepresentable. `RELIC_MALUS_POS` l ouvre ;
                   `pas_de_cote` portait deja un `dashCdFlat` positif et sa
                   contrepartie ecrite, il valide la regle sur l existant.
                   Trois axes proposes, deux rejetes par la MESURE et non par le
                   gout : `harvestSpeed` est lu par un `Math.max` depuis 0, donc un
                   negatif y est jete ; `shieldFlat` a ses trois lecteurs gardes
                   par `shieldPool > 0`, donc sans carte de bouclier la jauge vaut
                   zero et le malus ne coute RIEN — un bonus deguise.
                   Deux reliques : `ame_rayee` (+18 degats, +0,04 s d intervalle)
                   est le meme gain que `noyau_instable` dans une autre monnaie, et
                   le seul axe de prix qui vaut pour les DIX armes ;
                   `condensateur_fracture` (+35 degats, -2 munitions) contredit
                   `barillet_long`, donc porter les deux revient a n avoir rien
                   pris. Le chargeur n existe que sur le siege : la relique est
                   etroite, et c est dit.
                   La mutation a trouve un trou de plus : `chargeurPlus` negatif n
                   etait pas un malus reconnu, la relique aurait pu partir sans
                   contrepartie ecrite. Ajoute a `RELIC_MALUS_NEG`.
                   Part des PV : 6 sur 9 avant, 6 sur 11 apres ; leviers distincts
                   3 -> 5. 37 reliques (15/11/9/2). Les trois directions de malus
                   prouvees rouges par mutation.

    0.30.3 lot 3 QUATRE RELIQUES POUVAIENT RENDRE EXACTEMENT ZERO. Le plan 27
                   annoncait « dix bonus plats » au palier 0 a conditionner ; la
                   mesure dit autre chose. Six des dix portent DEJA une condition
                   reelle — esquive, recolte, sols glissants, allie — simplement
                   pas DECLAREE, et l audit qui ne regardait que les conditions
                   declarees les avait comptees comme seches. Quatre seulement
                   sont des bonus plats francs, et ce n est pas un defaut : une
                   commune a 25 eclats est un appoint.
                   Le vrai defaut etait ailleurs, et il est pire qu un bonus
                   ennuyeux : quatre reliques sont NULLES selon la partie. `silex`
                   est lu derriere `p.mods.burnDmg > 0 ? ... : 0` et `burnDmg`
                   vaut 0 a la base, aucune des dix armes ne brulant ;
                   `battery_secours` recharge 50 % d une jauge qui vaut 0 sans
                   carte de bouclier ; `fanion` et `trousse_campagne` bouclent sur
                   les AUTRES joueurs. Achetees, elles ne faisaient rien — et
                   c est exactement l « emplacement d offre perdu » que le
                   commentaire de `requiresArme` decrivait deja.
                   `requiresMod` declare la condition de build, `minPlayers`
                   existait deja pour l effectif. Zero relique nulle sur 1600
                   emplacements solo ; offertes a taux normal des que la condition
                   est remplie.
                   ET LE FILTRE DEVIENT UN SEUL ENDROIT. Il vivait recopie dans
                   `_offerRelics` et `visePalier`, avec le commentaire qui disait
                   deja le danger : une condition ajoutee d un seul cote et l
                   acheteur vise un palier que le tirage ne peut pas montrer, donc
                   il relance jusqu a epuiser sa bourse. `_relicOffrable` les
                   reunit ; `lockedRelics` reste dehors, c est un choix du joueur
                   sur SON offre et non une eligibilite. `mesureMarchand` tourne a
                   travers le refactor.
                   Un `requiresMod` mal orthographie teste `undefined > 0`, donc la
                   relique n est JAMAIS offerte : croise avec `defaultMods()`,
                   prouve rouge par mutation.

    0.30.4 lot 4 DEUX SYSTEMES PARTAGEAIENT LE MOT « SURCHAUFFE », UN SEUL ETAIT
                   IMPLEMENTE. `chaine_assaut` annonce depuis toujours « la
                   surchauffe ne s applique plus » ; son drapeau n a JAMAIS ete lu
                   par `_armeTick`. Il descend le plancher du multiplicateur d
                   intervalle de 0,35 a 0,20, rien d autre. Mesure : laser seul et
                   laser + la carte montent la jauge a 0,48 tous les deux, a l
                   identique.
                   ON ALIGNE LE TEXTE SUR LE CODE ET NON L INVERSE, et c est la
                   lecture de `_armeTick` qui le decide : `porteChaleur` garde tout
                   le bloc, FAISCEAU COMPRIS. Rendre la promesse vraie en coupant
                   cette garde aurait eteint le laser — le commentaire du bloc
                   decrivait deja ce piege pour le double tir. `noOverheat` devient
                   `lowRateFloor`, qui est ce qu il fait ; « levé » aurait surdit a
                   son tour, le plancher DESCEND et c est la cadence qui plafonne
                   plus haut.
                   ET MA PROPRE GARDE TOMBE AVEC. La Chambre thermique (0.29.22) se
                   neutralisait sur ce drapeau, au motif ecrit que la legendaire
                   retirait la surchauffe. Elle ne l a jamais retiree : les deux
                   cartes ensemble donnaient `tirManuel` a 0 et une jauge a 0,00 —
                   une epique payee pour RIEN. Elles coexistent maintenant, et la
                   contrepartie existe toujours : 91 pas de mutisme sur 400.
                   L `applyAfter` disparait avec la garde qui l exigeait.
                   Le chantier 02 devait commencer par mesurer le pool laser ; la
                   mesure a trouve ce defaut en amont et s y est arretee. La
                   decision A/B/C reste a prendre au lot suivant.

    0.30.5 lot 5 LA CHALEUR EST UN SYSTEME, SES CARTES ETAIENT UN CONTENU D ARME.
                   La Chambre thermique donne une jauge, un bonus et un mutisme a
                   saturation — et AUCUNE carte ne pouvait l ameliorer : les quatre
                   paliers de chaleur portent `family: "arme_laser"`, et ce verrou
                   lit l arme PORTEE. La carte-graine ne germait pas.
                   Le brief demandait trois cartes de plus (Refroidissement brutal,
                   Pression critique, Fusion) ; elles EXISTENT deja sous ces quatre
                   paliers — Dissipateur, Circuit froid, Focale ardente, Purge
                   thermique. Les ecrire aurait produit quatre quasi-doublons.
                   `systeme` relache le verrou pour qui porte le systeme, sans
                   DEPLACER la famille — et c est mesure : la sortir de
                   `FAMILLES_D_ARME` aurait vide l echelle du laser, la table etant
                   DERIVEE des armes, et fait entrer quatre cartes dans le plancher
                   `communes >= epiques x 1,5` qui n a que 0,5 commune de marge.
                   Le pool laser ne bouge PAS : 109 cartes et 39/33/20/17 avant
                   comme apres, memes quatre cartes de chaleur. Une build
                   `tirManuel` sur n importe quelle arme les voit desormais.
                   La Set de `_cardCtx` est PARTAGEE par les joueurs d une meme
                   salve : elle est recopiee, sinon la chaleur d un joueur ouvrirait
                   les cartes des autres.
                   Les quatre descriptions cessent de nommer le canon laser : elles
                   disent ce que fait la CHALEUR, puisqu elles ne s adressent plus a
                   une seule arme.
                   `verifierCartes` croise `systeme` et `requiresSystem` avec ce que
                   la source POSE dans la Set — une faute de frappe rend la carte
                   introuvable pour toujours, sans rien lever. Il refuse aussi un
                   `systeme` sur une carte sans famille d arme : il n y aurait rien
                   a deverrouiller. Les deux prouves rouges par mutation.

    0.30.6 lot 6 LE TROISIEME ORBITEUR NE RENDAIT RIEN, ET C EST MESURE DANS LE CAS
                   FAVORABLE. `orbitHits` est indexe par ENNEMI et partage par
                   toutes les lames : une fois touche, un ennemi est immunise
                   `ORBIT_HIT_CD` contre TOUTES. Le nombre de lames ne decide donc
                   pas des degats. 300 s x 5 graines appariees, bot immobile —
                   la horde vient a lui, c est la scene la plus favorable a la
                   carte : +32 % a un exemplaire, +40 % a deux, +39 % a trois.
                   `max` passe de 3 a 2. `surcharge_orbitale` reste la facon d
                   investir plus et elle, elle passe a l echelle (+94 % a deux).
                   DEUX PISTES ESSAYEES ET REJETEES PAR LA MESURE. Diviser la
                   recharge par le nombre de lames ne change rien (16 717 a six
                   lames) : ce n est pas la recharge qui lie, les ennemis
                   TRAVERSENT la bande au lieu d y sejourner. Et le rayon ne peut
                   pas descendre vers la foule — a 46 et 30 px la pile d anneaux du
                   joueur recouvre ce qui orbite, defaut deja paye par `DRONE_ORBIT`.
                   CE QUE LE BANC NE PEUT PAS DIRE, et c est ecrit dans LISEZMOI :
                   les deux bots sont des extremes. L immobile laisse 29,7 % des
                   ennemis a 20-40 px, celui qui recule en garde 96,4 % a 220-240 px
                   et n en laisse approcher aucun. Aucun ne represente un joueur, et
                   la bande des lames tient 2,6 % du temps dans le meilleur des cas.
                   La question du PALIER de la carte reste donc OUVERTE — elle
                   demande une partie reelle. Ce qui est tranche ne depend pas du
                   bot : un exemplaire mort promis par `max`.

    0.30.7 lot 7 DEUX ARCHETYPES SUR SEPT ETAIENT DES BADGES QUE PERSONNE NE
                   POUVAIT OBTENIR. Les QUATRE graines de `demolition` etaient des
                   cartes de la grenade : sans elle, 4 cartes pour un seuil de 3.
                   Mesure sur 300 manches par politique, 25 cartes, en jouant POUR
                   l archetype : 4 % d obtention. `technicien` en avait 6 et rendait
                   4 % aussi.
                   Le controle existait et comptait JUSTE — il excluait deja les
                   cartes d arme — mais son plancher etait le seuil nu, et un bassin
                   egal au seuil demande que les trois cartes soient offertes ET
                   prises sur 25 tirages. La mesure donne l echelle : 4 cartes
                   rendent 4 %, 5 en rendent 17 %, 7 en rendent 25 %, 8 en rendent
                   69 %. Plancher a `seuil + 2`.
                   ET LE VERROU DE CLASSE EST LE MEME QUE CELUI D ARME, ce que le
                   controle ne voyait pas : une carte `cls` ne sort que pour une
                   classe sur trois. Les cartes qui collaient au theme demolition
                   sans dependre d une arme — `bombe_fragmentation`, `bombe_double`,
                   `detonateur` — sont toutes `cls: "dps"`. Seules `etau`,
                   `terrain_conquis`, `contreAttaque` et `pulsar` sont libres des
                   deux ; ce sont elles qui sont ajoutees.
                   Apres : demolition 4 % -> 77 %, technicien 4 % -> 72 %. Et les
                   manches qui ne lisent AUCUN archetype tombent de 55 % a 40 % en
                   prise au hasard, de 58 % a 36 % en prise gloutonne — le badge
                   parle plus souvent.
                   `incendiaire` (17 %) et `acrobat` (25 %) restent faibles et sont
                   NOTES au lieu d etre corriges : ils sont atteignables. Matrice
                   complete et protocole dans LISEZMOI.

    0.30.8 lot 8 LES DEUX MANQUES DU SECTEUR, RELEVES CONTRE LE BRIEF. Le lieu
                   repondait a cinq des sept exigences de la megapole nocturne ;
                   il manquait la PUBLICITE au loin et les CABLES devant.
                   La publicite est cuite dans `cuireVille`, sur un toit sur neuf.
                   C est le seul endroit du lieu ou la couleur a le droit de
                   saturer — le brief le demande explicitement, et une enseigne a
                   trente etages plus bas ne dispute rien au centre de l ecran,
                   elle est a DEUX couches de lui. Deux teintes et non une : une
                   seule ferait une ville qui appartient a un seul annonceur. Le
                   panneau est franchement debout ou franchement couche, jamais
                   carre — un carre lumineux sur un toit est un edicule qui brille.
                   Le halo est un second rectangle plus pale et non un flou : la
                   couche est CUITE une fois, un flou coute a chaque pixel pour un
                   resultat invisible a cette echelle.
                   Les cables passent DERRIERE les montants, et ce sont les seules
                   courbes d un premier plan qui n avait que des rectangles. Trois
                   brins : un cable seul se lit comme une rayure. La fleche reste
                   DANS la bande — un cable qui sagerait vers le centre entrerait
                   dans le champ de jeu, et la regle du premier plan est que rien
                   n y descend.
                   Les deux formules du montant deviennent `mont()` et `haut_i()` :
                   les cables doivent s accrocher exactement ou le montant finit, et
                   deux copies de la meme formule auraient diverge au premier
                   reglage.
                   RIEN DE TOUT CECI N EST VERIFIE A L OEIL : le rendu ne s importe
                   pas hors navigateur, seul `node --check` a tourne.

    0.31.0 lot 1  LE BAC A SABLE, ET IL OUVRE LE PLAN 28. Tester un arbre, un
                  noyau commun, un cadre ou une ligne verrouillee demandait de
                  jouer les manches qui les debloquent — et l environnement
                  local ne persistant rien (voulu), ces manches etaient a
                  rejouer a chaque redemarrage. `BAC=1` fait naitre tout profil
                  neuf avec `cores` a 1e6 et `hf` complet.
                  DEUX LIGNES, ET C EST LE POINT DE PASSAGE QUI LES REND
                  SUFFISANTES. Les noyaux ne se depensent qu a trois endroits
                  (`hub.js` 368/391/444), tous en `if (pr.cores < cost) break`,
                  donc une reserve posee en amont les couvre sans qu aucun
                  chemin de production ne change. Et les recompenses des hauts
                  faits NE SE STOCKENT PAS : `lignesVerrouillees()` et
                  `cadresDe()` les relisent de `hf` par `recompensesDe()`.
                  Poser `hf` ouvre donc d un coup les lignes d arbre, les
                  cadres, les cartes et les reliques — ecrire aussi `cadres`
                  serait une seconde source pour la meme information.
                  `1e6` ET NON `Infinity` : `Infinity` se serialise en `null`,
                  donc plus rien ne serait payable. L inverse exact du but, et
                  le genre de defaut que ce depot paie en silence.
                  JAMAIS DEDUIT DE L ABSENCE DE SUPABASE, et c est la seule
                  decision du lot. C est pourtant la definition pratique de
                  « local » — mais un hote de production dont la configuration
                  Supabase est mal renseignee est dans le MEME etat, et il
                  ouvrirait la meta a de vrais joueurs sans que rien ne le dise.
                  Un drapeau explicite ne peut pas arriver par accident.
                  IL NE REMPLIT PAS LE CODEX : c est precisement ce que le lot
                  03 du plan 28 doit pouvoir verifier.
                  Verifie sur socket reelle : `BAC=1` donne 1 000 000 noyaux,
                  36/36 hauts faits, 13/13 cadres, zero ligne verrouillee ; une
                  manche complete jusqu a la mort ne declenche AUCUNE annonce de
                  haut fait (`gagnes` vide) ; sans la variable, un compte neuf
                  nait a 0 noyau et 0 haut fait.

    0.31.1 lot 2  UNE EXCEPTION DE RENDU NE SE VOYAIT NULLE PART. `draw()`
                  commence par repeindre le sol et effacer la couche haute, et le
                  HUD passe en DERNIER : un throw dans `drawWorld` laisse donc une
                  arene VIDE avec un HUD FIGE sur ses dernieres valeurs. C est
                  exactement l image rapportee comme « bug de map », et c est la
                  seule construction du client qui la produise.
                  `signalerErreur` n ecrivait qu en console et vers le serveur.
                  Sur une partie LAN le journal utile est donc sur la machine de
                  QUELQU UN D AUTRE, et le joueur qui voit son arene disparaitre
                  n a aucun moyen de savoir qu une exception a eu lieu. Un bandeau
                  s affiche desormais, EN STYLE EN LIGNE et se creant lui-meme :
                  il doit tenir quand ce qui a casse est la feuille de style ou le
                  DOM du jeu. C est le seul endroit du client ou `document` sert
                  sans passer par `ui/dom.js`, et la couche 0 n importe toujours
                  rien.
                  TROIS IMAGES ET NON UNE. Le rendu se gele apres trois images
                  CONSECUTIVES en echec : un accroc isole — un contexte WebGL
                  perdu le temps d une image — ne doit pas figer une partie, une
                  panne installee doit se voir. `draw()` sort alors immediatement,
                  donc la DERNIERE IMAGE RESTE a l ecran au lieu d etre effacee
                  soixante fois par seconde. Le compteur retombe a zero des qu une
                  image passe, et le gel ne se leve pas.
                  ET LE JOURNAL DE L HOTE PORTE LE LIEU ET LA GRAINE, sans quoi
                  une exception de rendu n est pas rejouable :
                  `[client] max [fonderie graine 1767893249] — rendu : ...` donne
                  directement `BIOME=fonderie GRAINE=1767893249 npm start`.
                  Verifie : le bandeau se cree une fois, cumule deux erreurs
                  distinctes, dedoublonne la meme (harnais avec faux DOM) ; la
                  ligne de journal porte le lieu et la graine EN salle et rien
                  hors salle (client WebSocket reel). Le gel lui-meme n a pas de
                  navigateur pour etre joue — sa preuve est la prochaine
                  occurrence, ce qui est l objet meme du lot.

    0.31.2 lot 3  LA CHAINE DE L USINE RECULAIT DEUX FOIS PAR SECONDE. Les
                  taquets se posent tous les `CHAINE_PAS * 4` — 52 px — et leur
                  avance etait repliee sur `CHAINE_PAS`, 13. A 26 px/s, ils
                  avancaient donc 13 px puis revenaient tous en arriere d un
                  quart d ecartement, indefiniment.
                  RIEN NE POUVAIT LE LEVER : un `%` qui rend un nombre trop petit
                  rend un nombre parfaitement valide. Le motif ne se voit qu a
                  l oeil, ou en le mesurant — ce qui a ete fait : sur dix
                  secondes, 120 taquets deplaces sur 600 images, saut de 13,00 px,
                  exactement `CHAINE_PAS`. Apres : zero.
                  ET LE PREMIER TAQUET NAISSAIT SUR LE TAPIS. La boucle demarrait
                  au bord gauche ; elle demarre maintenant une periode avant, donc
                  un taquet ENTRE au lieu d apparaitre. Le clip de `habillerBloc`
                  retient ce qui deborde — verifie, l habillage est dessine sous
                  `silhouetteBloc(...); ctx.clip()`.
                  `CHAINE_MOTIF` devient une constante nommee a cote des deux
                  autres : c est elle, et non `CHAINE_PAS`, qui est la periode du
                  MOUVEMENT. `CHAINE_PAS` reste le pas de la SURFACE, celui des
                  deux rangs de stries du tapis, et ils ne se confondent plus.
                  LES TROIS AUTRES MOUVEMENTS PERIODIQUES DU LIEU ONT ETE RELUS :
                  `convoyeur()` (`props.js`) est juste — le modulo et le pas de
                  boucle sont le meme nombre, et le tapis est clippe ; les brides
                  de `conduite()` et `dessinerLed()` sont des enveloppes en `sin`,
                  sans repli ; `feux()` est juste en regime, son argument etant
                  negatif la premiere seconde d une partie mais absorbe par un
                  `Math.max(0, ...)`.

    0.31.3 lot 4  UNE RENCONTRE NE DEPEND PLUS DE LA FACON DONT LA MANCHE SE
                  TERMINE. Le codex ne s ecrivait qu a `endRound()`, donc sur une
                  victoire ou une defaite. Les deux autres sorties — quitter par
                  le menu pause, fermer l onglet — passent par `awardPartial`, qui
                  versait des noyaux et JETAIT tout ce qu on avait croise.
                  MESURE, sur socket reelle : a 22 s de manche, `vus` est vide et
                  aucun `roundEnd` n a eu lieu ; apres `leaveRound`, `vus` porte
                  `e:grunt`, les noyaux sont verses, et c est bien un `roundAbort`
                  qui suit — le chemin exact qui perdait tout. Le chemin de la
                  mort, lui, rend le meme resultat qu avant : verifie sur une
                  manche jouee jusqu au bout.
                  UN SEUL CHEMIN, `mergerCodex(pr, state)`, appele par `awardRun`
                  ET par `awardPartial`. La boucle qui vivait dans `awardRun`
                  disparait : deux copies de la meme fusion auraient diverge a la
                  premiere famille ajoutee au codex.
                  LA GARDE DE `awardPartial` RESTE COMMUNE, et c est une decision :
                  `players.has(c.id)` exclut le SPECTATEUR. Un spectateur entre a
                  la derniere seconde heriterait sinon de tout ce que la salle a
                  vu depuis le debut, ce qui ferait dependre la collection du
                  hasard des connexions plutot que du jeu.
                  ET LE SECOND TROU, PLUS PETIT : `case "progress"` (`net/router`)
                  rafraichissait la meta et les hauts faits mais pas le codex —
                  ouvert pendant qu une manche se terminait, il restait sur ses
                  « ? » jusqu a ce qu on le referme. `renderCodex()` porte deja sa
                  garde `hidden`, l ajout est inconditionnel et gratuit.
                  AUCUNE MIGRATION : `progress_store.js` normalise deja `vus` a la
                  lecture, et bumper `PROG_CFG.VERSION` remettrait a neuf tout
                  profil sans entree de migration.

    0.31.4 lot 5  LA TRACE SE DESSINAIT LA OU ELLE SE SONDE, ET LES DEUX PLUS
                  GRANDES N AVAIENT AUCUNE FORME. Deux defauts independants, la
                  meme couche, et ensemble ils annulaient la composition par
                  quartiers livree au plan 26.
                  LE CENTRE EST LE BON POINT POUR LIRE UN QUARTIER — stable,
                  independant des props — ET LE PIRE POUR POSER UNE MARQUE. La
                  sonde reste au centre, le point de dessin est maintenant tire de
                  la meme cellule. Mesure sur une vue de 1600x900 : au centre, 22
                  traces sur UNE colonne et UNE ligne distinctes, c est-a-dire un
                  reseau de 200 px ; avec le decalage, 18 et 18. C etait le reseau
                  qu on voyait, pas les taches.
                  UNE MARQUE A UN BORD ET UNE DIRECTION, une ellipse lisse n a ni
                  l un ni l autre. La SOUILLURE revendiquait « un bord net et une
                  aureole » dans son propre commentaire et posait un ovale sous un
                  halo radial : son contour est desormais tire de la cellule —
                  sept rayons refermes en courbes par leurs milieux, une tache et
                  non un polygone — et une COULEE part du bord, seul trait
                  directionnel de la marque. La POUSSIERE avait deja son arete
                  balayee, mais son degrade RADIAL debordait du trapeze de tous
                  les cotes et rendait justement cette arete invisible ; il devient
                  LINEAIRE et PERPENDICULAIRE a elle, dense contre le bord net,
                  eteint du cote qui fuit.
                  AUCUNE DES DEUX NE CHANGE DE TAILLE : c est la forme qui
                  manquait, pas l echelle. Un ovale plus petit reste un ovale.
                  LE CONTRAT DU SEMIS TIENT : fonction pure de (cellule, graine),
                  rien ne s alloue, deux clients voient le meme sol. Verifie en
                  extrayant les deux fonctions du fichier REEL — une copie dans un
                  test aurait diverge de ce qu on mesure : 75 000 coordonnees
                  emises sur mille cellules, ZERO NaN, et deux appels identiques
                  rendent la meme suite de points.
                  LES TABLES NE BOUGENT PAS — `MATIERE`, `ZONES`, `QUARTIER` sont
                  intactes, donc `verifierTraces()` et `verifierZones()` disent la
                  meme chose qu avant.

    0.31.5 lot 6  LE SOL DISPARAISSAIT SANS RIEN LEVER, ET C EST UNE FUITE.
                  Le cache de tuiles de `material.js` n avait AUCUNE eviction —
                  aucun `cache.delete`, aucun plafond — et sa clef porte la
                  GRAINE, que `room.drawBiome()` retire a CHAQUE sortie de manche,
                  victoire, defaite ou interruption. Chaque manche cuisait donc
                  deux toiles de plus, gardees pour toujours : une tuile de sol de
                  400 px et une seconde periode de 1200 px, aux dimensions
                  multipliees par le rapport de pixels.
                  MESURE, en instrumentant les allocations de canvas : 9,8 Mo par
                  manche a dpr 1 — donc environ 39 a dpr 2, ce que rend
                  `Math.min(devicePixelRatio, 2)` sur un ecran moderne. Dix
                  manches passent la barre des 400 Mo de fonds de canvas, et rien
                  ne le signale.
                  CE QUI ARRIVE ENSUITE EST LE DEFAUT VISIBLE. Quand le navigateur
                  ne peut plus allouer, `createPattern` rend `null`, donc
                  `floorPattern` rend `null`, donc `drawFloor` SORT SANS RIEN
                  DIRE — deux `if (!p) return;` de suite. Il ne reste a l ecran
                  que la couleur d arene et la grille de 20 m : une carte qui a
                  l air cassee alors qu aucune exception n a ete levee, dans
                  N IMPORTE QUEL lieu. C est exactement la forme rapportee, et
                  exactement pourquoi le lot 2 ne l aurait pas attrapee : il n y
                  avait rien a attraper.
                  UNE ENTREE PAR FAMILLE, et c est la borne juste : il n y a
                  qu une arene a la fois, donc qu une tuile de sol et qu une
                  seconde periode. Changer de lieu, de mode, de graine ou de
                  palier de qualite jette la precedente.
                  ET LE SILENCE EST ROMPU : un `createPattern` nul passe par
                  `signalerErreur`, donc par le bandeau du lot 2 et par le journal
                  de l hote, qui porte deja le lieu et la graine.
                  Verifie sur le vrai module : graine A puis B puis A DE NOUVEAU
                  donne trois cuissons — la premiere a bien ete jetee ; une meme
                  clef deux fois de suite n en donne qu une, le cache sert
                  toujours ; sol et macro coexistent, deux familles, deux entrees.
                  Et les 50 400 appels de passe de rendu (5 lieux x 3 modes x 12
                  graines x 5 vues x 4 paliers) restent muets.
                  CE QUI N EST PAS PROUVE : que ce soit la SEULE cause des ecrans
                  rapportes. La fuite est mesuree, le silence l etait aussi, et
                  les deux produisent la bonne image ; les corps absents des memes
                  captures peuvent tenir a une autre allocation qui echoue sous la
                  meme pression. La prochaine occurrence le dira, et elle parlera.

    0.31.6 lot 7  LA CINQUIEME CARTE ETAIT INJOUABLE ET INVISIBLE, ET C EST UN
                  `return` MANQUANT. `cuireMacro` rendait ce que la RECETTE DE
                  LIEU rendait ; quatre recettes sur cinq finissaient par
                  `return cv`, `macroSecteur` non. Sur le Secteur et lui seul,
                  `createPattern(undefined)` LEVE — a chaque image, a tous les
                  paliers au-dessus de `low`, dans les trois modes, quelle que
                  soit la graine.
                  C EST LE BANDEAU DU LOT 2 QUI L A DIT, mot pour mot :
                  « Failed to execute 'createPattern' … The provided value is not
                  of type … at motif (material.js:42:11) », puis « arrete apres 3
                  images en echec ». Le lot 01 du plan 28 ne pretendait pas
                  corriger le defaut, il pretendait le rendre capturable ; c est
                  ce qu il a fait, et la premiere occurrence a suffi.
                  ET LE JOUEUR NE POUVAIT PAS LE NOMMER. `resetHud()` vide le
                  memo, pas le DOM, et le nom du lieu n est ecrit que par
                  `updateSegment` — qui ne tourne plus des que l image leve. Le
                  bandeau du HUD pouvait donc porter le lieu de la manche
                  PRECEDENTE, ce qui explique « je n arrive jamais a tomber sur la
                  nouvelle map » : on y tombait, elle mourait avant de s afficher.
                  LA CORRECTION N EST PAS LE `return` MANQUANT. La toile appartient
                  a `cuireMacro`, donc c est elle qui la rend ; les cinq recettes
                  ne rendent plus rien. Une recette PEINT, elle ne decide pas de ce
                  qui sort. `cuire` avait deja cette forme — c est `cuireMacro` qui
                  etait l exception.
                  ET `cv` DISPARAIT DE LEUR SIGNATURE : aucune des cinq ne le
                  lisait, et un parametre dont la seule lecture est morte se
                  supprime. La forme dit maintenant le contrat.
                  POURQUOI LES NEUF VERIFICATEURS ETAIENT VERTS : `verifierMatiere`
                  croise les TABLES et voit bien une entree `secteur` ; ce qui
                  manquait n etait pas l entree, c etait ce qu elle rend. Et le
                  balayage de rendu du lot 6 passait aussi — parce que le canvas de
                  papier acceptait n importe quoi. UN HARNAIS QUI NE REFUSE PAS CE
                  QUE LE NAVIGATEUR REFUSE NE VERIFIE RIEN : `createPattern` du
                  harnais leve maintenant sur un non-canvas, et les 50 400 appels
                  de passe designent le Secteur avant correction, et se taisent
                  apres.
                  CE QUE 0.31.5 DISAIT DE TROP : la fuite du cache de tuiles est
                  reelle et mesuree — 9,8 Mo par manche a dpr 1, aucune eviction —
                  et son correctif tient. Mais elle n etait PAS la cause des ecrans
                  rapportes. Celle-ci l est.

    0.31.7 lot 8  « ON NORMALISE A LA LECTURE » NE NORMALISAIT RIEN. Le bloc qui
                  garantit `vus`, `hf`, `debloquees`, `cadres`, `cadreActif` et
                  `stats` vivait DANS `migrateProfile`, qui sort en tete sur
                  `from === PROG_CFG.VERSION` — et `adoptRow` ne l appelle que si
                  `row.version < VERSION`. Un profil deja a la version courante
                  ne le traversait donc JAMAIS, ce qui est exactement la
                  population visee : les comptes enregistres AVANT qu un champ
                  n existe, sans bump de version.
                  TROIS SYMPTOMES, AUCUN QUI NOMME SA CAUSE. `pr.vus` restait
                  `undefined` ; `progressPayload` le masquait avec `?? []`, donc
                  un codex vide a l ecran, pour toujours ; et `mergerCodex` levait
                  sur `pr.vus.push`, ce que `hub.tick` attrape en FERMANT LA
                  SALLE. Le joueur voyait sa partie s arreter et un codex vide,
                  et rien ne reliait les deux.
                  ET MES DEUX ESSAIS PRECEDENTS NE POUVAIENT PAS LE VOIR : ils
                  creaient un compte NEUF, donc `newProfile`, donc `vus: []`. Un
                  correctif de progression se mesure sur un profil EXISTANT.
                  L essai le fait maintenant : faux Supabase local, une ligne a la
                  version courante privee de `vus`, `hf`, `cadres` et `stats`.
                  Avant : `TypeError` a `mergerCodex`, salle fermee. Apres :
                  340 noyaux et 12 manches conserves, les quatre champs rendus,
                  aucune exception, salon atteint, `vus` porte `e:grunt` dans le
                  profil ET dans le payload.
                  `normaliserProfil` sort donc de `migrateProfile`, qui la
                  TERMINE, et `adoptRow` la passe sur TOUTE ligne adoptee. Elle
                  est idempotente par construction.
                  ET LES DEUX `?? []` DU PAYLOAD DISPARAISSENT : c est ce masque
                  qui rendait un champ absent indistinguable d un tableau vide.
                  LE PREMIER PLAN S ALLEGE, `PP_VOILE = 0.78`. Un `globalAlpha`
                  pose dans `drawPremierPlan` plutot que cinq alphas a tenir
                  d accord — la bande et les silhouettes suivent ensemble, et
                  `restore()` le rend.

    0.31.8 lot 9  LE CODEX MONTRE CE QU IL NOMME. Une fiche qui nomme sans
                  montrer demande au joueur de se souvenir d une silhouette — or
                  c est precisement le travail du depot (« un corps se reconnait
                  sans sa couleur », `verifierSilhouettes`). La vignette est la
                  suite de cette regle, pas une decoration.
                  DEUX CHEMINS PARCE QU IL Y A DEUX NATURES. Un corps de horde est
                  CUIT DANS L ATLAS a sa taille reelle : `drawSprite` a l echelle 1
                  rend donc les tailles RELATIVES justes — un colosse est plus gros
                  qu un rampant sans qu on l ecrive nulle part. Un boss n est PAS
                  dans l atlas, son corps est un trace ; `portraitBoss` detourne
                  donc le `ctx` du module, exactement comme `bossSheet()` le fait
                  deja, et le rend dans un `finally` — un portrait qui leverait
                  laisserait sinon TOUT le rendu sur un canvas de vignette.
                  ELLE SE PEINT APRES `innerHTML` : une balise `<canvas>` dans une
                  chaine n a pas de contexte tant qu elle n est pas dans le
                  document. Et une vignette qui echoue ne peut pas emporter la
                  grille — la fiche reste lisible sans elle, et l erreur passe par
                  `signalerErreur`.
                  LA FICHE PASSE EN RANGEE : vignette a gauche, texte a droite. En
                  colonne, un carre de 72 px poussait le nom sous la ligne de
                  flottaison sur vingt-quatre fiches ; la grille passe de 210 a
                  268 px de colonne. La carte FERMEE garde son centrage, elle n a
                  rien a ranger.
                  Verifie hors navigateur : atlas cuit a 106 images, les 13 types
                  ont chacun leur case `eN_idle` — aucune absente, aucune
                  partagee —, les 11 portraits de boss passent sans exception, et
                  le `ctx` du module est rendu DANS LES DEUX CAS, y compris quand
                  le dessin leve.
    0.32.0 lot 1  LE CLASSEMENT DETRUISAIT DES RECORDS A CHAQUE MANCHE, ET IL
                  OUVRE LE PLAN 29. Trois defauts distincts, tous des pertes de
                  donnees actives.
                  LA CLEF ETAIT LA DIFFICULTE SEULE. Un profil n avait donc qu un
                  record par mode, tous effectifs confondus : un bon temps a
                  quatre DETRUISAIT DEFINITIVEMENT le record solo. `players` etait
                  bien ecrit — mais APRES la comparaison qui avait deja decide
                  d ecraser, donc la donnee existait sans jamais servir au bon
                  moment. `clefRecord(difficulty, players)` devient le point de
                  passage unique de la clef ; le stockage, la migration et le
                  classement la lisent de la.
                  LES RECORDS DEJA ECRASES SONT PERDUS POUR DE BON, et ca s ecrit
                  ici au lieu de se masquer : la migration v7 -> v8 rend son
                  effectif a ce qui reste, elle ne ressuscite pas ce que le defaut
                  avait deja mange. Un `players` absent ou nul vaut 1.
                  UNE MANCHE D EQUIPE EST UNE LIGNE, ET ELLE EN OCCUPAIT QUATRE.
                  `recordFinal` s appelle PAR PROFIL : deux bonnes manches a
                  quatre consommaient huit places sur dix. Le regroupement se fait
                  a l AFFICHAGE, sur (difficulte, effectif, temps, date) — chaque
                  joueur garde son record personnel, le classement montre la
                  manche une fois, pseudos joints.
                  ET C EST POUR CA QUE LE TAMPON HORAIRE SORT DE LA BOUCLE. A la
                  milliseconde pres, quatre appels a `toISOString()` donnaient
                  quatre dates et le regroupement ne prenait pas. Une manche a un
                  instant, pas quatre.
                  `classement()` QUITTE `hub.js` POUR `progression.js` : c est une
                  lecture de `bestFinal`, donc elle vit avec sa donnee — et un
                  test peut l appeler sans monter un serveur. Un test qui rejoue
                  l algorithme au lieu de l appeler est une seconde source de
                  verite ; le premier jet de ce lot en etait un, il a ete refait.
                  SIX CHAMPS SUR SEPT ETAIENT STOCKES PUIS JETES. `level` et
                  `biome` remontent a l ecran : un temps sans contexte ne dit pas
                  a quel prix il a ete fait. L ecran passe en sections par
                  effectif — Solo, Duo, Trio, Quatuor.
                  Verifie hors navigateur : un record solo et un record a quatre
                  coexistent, un moins bon temps au meme effectif est refuse, la
                  migration rend son effectif a chaque entree et elle est
                  idempotente, quatre profils d une meme manche font UNE ligne a
                  quatre pseudos, et aucun effectif ne contient l entree d un
                  autre. Sur socket reelle, le message `leaderboard` rend bien un
                  tableau de trois difficultes indexe par effectif.
    0.32.1 lot 2  UN ROLE NE SE LIT PAS SUR SON DPS, ET RIEN NE MESURAIT LE
                  RESTE. Le dps brut du Soigneur n a aucune raison d etre
                  competitif avec celui du Tireur : tant qu on ne mesure que le
                  dps, « le role est-il satisfaisant » n a pas de reponse
                  mesurable, seulement un avis. Ce lot est un PREREQUIS — il
                  debloque le chantier de la horde, dont le risque de second ordre
                  (plus de pression pendant les boss renforce Rempart et Soigneur)
                  n etait pas evaluable.
                  LES TRACES NE POUVAIENT PAS REPONDRE, et c etait la premiere
                  etape a ecarter. `traces/` contient DEUX manches, toutes deux
                  SOLO, en v0.11.5 — vingt versions avant. Aucune composition,
                  aucun degat evite, detourne ou rendu possible. La mesure est donc
                  un banc de simulation, par la donnee et non par preference.
                  QUATRE GRANDEURS AUX POINTS DE PASSAGE EXISTANTS. `p.contrib`
                  porte `evites` (MA reduction), `proteges` (MON aura sur un
                  ALLIE, attribue au PORTEUR et non a la victime), `detournes` (ce
                  que j encaisse pendant MA provocation — `_nearestPlayer` rend le
                  Rempart a tout ennemi du rayon, donc la fenetre EST la mecanique
                  et il n y a pas de contre-factuel a calculer) et `permis` (les
                  degats qu un allie delivre grace a MA catalyse). Ecrit dans
                  `_hurt`, `_heal` et `_damage`, jamais ailleurs.
                  LA DIFFICULTE N EST PAS UN MERITE : `diff.dmg` s applique AVANT
                  le releve, on ne compte que ce que la reduction du JOUEUR retire.
                  Et `permis` se DEFAIT au lieu de se recalculer — le
                  multiplicateur est deja dans le montant, la part vaut
                  `amount x (1 - 1/cata)` ; `catalyseDe` retient le porteur, sans
                  quoi ces degats ne s attribuent a personne.
                  LE BANC PRECISE SON PROFIL, ET LE DEFAUT EST COMPLET. Premier
                  passage au profil neuf : `proteges` et `permis` sortent a ZERO
                  partout, parce que `guardAura` et `catalyse` sont des lignes de
                  META. Le banc mesurait « ce qu un compte neuf n a pas encore ».
                  Il est aussi MORTEL et pilote : la survie EST le resultat, et un
                  apport de soutien se voit dans les recharges consommees, que
                  `botInput` ne consomme pas.
                  LA REPONSE, CHIFFREE. En trio 1/1/1 le Soigneur delivre 3 037
                  degats/min et en REND POSSIBLES 1 864 — 61 % de son propre debit,
                  plus 775 PV/min soignes. Comparer son dps aux 38 552 du Tireur ne
                  mesurait pas les deux tiers de sa contribution.
                  ET LE MONO-TIREUR EST DOMINE A TOUS LES EFFECTIFS, l ecart
                  croissant : x2,0 en solo, x1,9 en duo, x2,9 en trio, x4,3 en
                  quatuor. QUATRE TIREURS SURVIVENT AUSSI LONGTEMPS QU UN SEUL
                  (5,5 min) — ajouter des tireurs n ajoute rien pendant que la
                  horde suit `joueurs^0,75`. Le critere §4 de `verifierClasses`
                  (« 1/1/2 doit aller au moins aussi loin que quatre tireurs »)
                  est tenu avec 4,3x de marge ; c est le risque INVERSE qui est
                  ouvert. `verifierContribution` (`COMPO_VIABLE = 0,5`) le remonte.
                  Aucun equilibrage dans ce lot : le levier est la horde, donc le
                  chantier suivant. Ce lot livre de quoi en juger le resultat.
    0.32.2 lot 3  LES EMPLACEMENTS N ARBITRAIENT PLUS. `TREES` porte SIX lignes
                  par classe et `SLOTS_MAX` valait SIX : 3 sur 6 en debut de compte
                  (vrai arbitrage), 6 sur 6 en fin (aucun). Les trois jalons
                  menaient a la DISPARITION du choix, pas a son elargissement — le
                  systeme etait dimensionne pour se desactiver lui-meme.
                  `SLOTS_MAX = 4` : a cinq, renoncer a une ligne sur six se resout
                  par « celle qui rapporte le moins », ce qui est un tri.
                  LA BORNE SE RELIT DANS `metaLinesFor`. `cp.equipped` est une
                  liste STOCKEE et `metaEquip` n en verifie la longueur qu a
                  l ECRITURE : sans borne a la lecture, abaisser la constante
                  n aurait rien change aux comptes existants.
                  ET UN BUDGET DE DOCTRINE POUR LES HUIT ITEMS HORS CLASSE. Ils
                  pesent 13, on en tient 6. Une seule enveloppe : 4 + 4 items sont
                  trop peu pour scinder. Le poids suit l EFFET et non le PRIX —
                  `relance2` coute 900 noyaux et pese moins que `relance` a 250,
                  parce qu une seconde relance ne fait que repeter la premiere.
                  UN SEUL POIDS DEPEND DU PALIER, `sursis` : 2 sous le plein, 3 a
                  T5. `metaPoids(id, profile)` prend donc le profil, et SANS profil
                  rend le poids PLEIN — le majorant, donc un appelant qui ne sait
                  pas ne peut jamais sous-estimer la charge. Payer ce palier peut
                  faire deborder un budget qui tenait : `rangerDoctrine` normalise
                  la liste stockee A L ACHAT, sinon l ecran afficherait un item
                  equipe que le serveur n applique pas.
                  `profile.equipes` est une liste d INCLUSION la ou `communOff`
                  etait une liste d EXCLUSION, et l inversion est FORCEE : deux
                  mecanismes de renoncement pour la meme categorie, l un couteux et
                  l autre gratuit, n auraient pas coexiste. Profil v9, migration en
                  chaine : aucun palier, aucun achat, aucune commune perdus.
                  `GAINMETA` NE VOIT PAS CE LOT, et c est le resultat a retenir. Il
                  rend exactement les memes plafonds a 3, 4, 5 et 6 emplacements,
                  parce que `powerIndex` et `maxHp` reunis sont AVEUGLES A 13 DES
                  18 LIGNES DE CLASSE — reduction de degats subis, recharges,
                  epines, aura, soins prodigues, vitesse de reanimation, rayon de
                  lien n entrent dans aucun des deux. `verifierMeta` vert n est
                  donc PAS une preuve que ce lot est sans effet.
                  L INSTRUMENT QUI VOIT EST LE BANC DE CONTRIBUTION DU LOT 2.
                  Quatuor 1/1/2 : 30,0 min a six emplacements, 19,2 a quatre.
                  Solo tireur : 14,1 -> 14,0, INCHANGE — ses quatre premieres
                  lignes portent deja sa puissance. La borne mord sur le jeu
                  d equipe et les roles de soutien, pas sur le tireur solo.
                  UN DEFAUT CREE PAR CE LOT, TROUVE PAR SA PROPRE MESURE. Premier
                  passage a quatre : 15,5 min, `proteges` ZERO, `permis` ZERO.
                  `metaProfil` prenait `slice(0, emplacements)` — sans consequence
                  tant que six emplacements prenaient TOUT, mais a quatre l ordre
                  de la table DEVIENT un choix, et il met `garde` et `catalyse` en
                  sixieme position. Le banc jetait donc les deux seules lignes qui
                  produisent ces grandeurs et jouait la pire build possible.
                  `LIGNES_MESURE` rend l ordre EXPLICITE : +3,7 min et les deux
                  grandeurs restaurees. L artefact aurait corrompu en silence toute
                  mesure de classe a venir.
    0.32.3 lot 4  LE FAISCEAU ET L ARC TIRAIENT A TRAVERS LES MURS, ET C ETAIENT
                  LES DEUX SEULS. Mesure sur les dix armes, mur plein entre le
                  joueur et un mannequin : une balle meurt deja sur la couverture,
                  une grenade y saute, une zone n en sort pas. Ce sont aussi les
                  deux seules a ne pas lancer de PROJECTILE PHYSIQUE, donc les deux
                  qui echappaient naturellement au test. Le perimetre se referme
                  exactement sur elles — precision (portee 2,2) et railgun (1,8)
                  etaient deja arretes. Mise en coherence, pas penalite neuve.
                  `_vueCoupee` est le point de passage unique. SEGMENT CONTRE AABB
                  PAR LES DALLES et non une marche a pas fixe : la plus petite
                  cloison du depot fait 32 px, une marche assez large pour etre bon
                  marche l enjambe. `droitPossible` ne convient pas non plus — il
                  raisonne sur la grille de 40 px AVEC la marge d un CORPS, or un
                  tir passe ou un corps ne passe pas.
                  LA COUVERTURE DESTRUCTIBLE ENCAISSE (§3 du chantier tranche :
                  oui). Ne pas l entamer rendrait un joueur a couvert invulnerable
                  a ces deux armes la ou une balle perce le mur, et le tireur
                  n aurait aucun retour sur ce qui a bloque.
                  LE LASER PERD PLUS DE LA MOITIE DE SON DEPASSEMENT : +0,158 ->
                  +0,072, a graines appariees, 6 x 15 min. C etait le levier que le
                  chantier cherchait — sa perforation native infinie et gratuite —
                  et il se borne SANS TOUCHER UN SEUL COEFFICIENT. Il reste
                  au-dessus de sa cible.
                  LA DETTE DU TESLA, PAYEE SUR UN LEVIER MESURE. Borner l arc lui
                  coute 0,16 de V. Le SAUT est le seul levier HORDE PURE — contre
                  une cible unique l arc n a nulle part ou sauter, et `Db` reste a
                  74 pour toutes les valeurs, la ou la portee le fait monter a 89,
                  ce qui la disqualifie. 220 -> 380 : V 0,858 -> 0,998, et aucune
                  des neuf autres armes ne bouge d un millieme.
                  LE PROTOCOLE SE CHOISIT AVANT LA VALEUR. A 3 graines x 10 min la
                  courbe du saut etait NON MONOTONE — c etait du bruit ; a 6 x 15
                  elle est monotone. Et les deux protocoles ne donnent pas la meme
                  liste rouge : railgun et grenade sont hors tolerance a 3 x 10 et
                  dedans a 6 x 15, la lame l inverse. Le defaut de
                  `verifierEquilibreArmes(3, 10)` n est pas ce qu il mesure, c est
                  COMBIEN.
                  ET LE BANC D ARMES EST AVEUGLE AUX SEPT COEFFICIENTS D ECHELLE.
                  `mesureArmes` ne gere ni `cardsPending` ni `takeCard` : le joueur
                  du banc n a AUCUNE carte, or `appliquerEchelle` met a l echelle ce
                  que les CARTES donnent a `mods`. Verifie : `ech.degats` du laser a
                  0, a 1,2 et a 5 rend des `Dh` et des `V` IDENTIQUES A QUATRE
                  DECIMALES. `verifierEquilibreArmes` ne peut donc pas detecter un
                  desequilibre d echelle, et le levier que le chantier designait en
                  premier pour le laser est inevaluable en l etat. La largeur du
                  faisceau, son levier historique de 0.15.5, est inerte elle aussi
                  — a la densite actuelle il couvre deja tout ce qui est dans son
                  axe. Le laser reste a +0,072, levier non identifie : le rendre
                  mesurable demande que le banc prenne des cartes, ce qui
                  deplacerait toutes les valeurs de V enregistrees. Chantier de
                  mesure, pas reglage.
    0.32.4 lot 5  LE GOULOT DE LA HORDE N EST NI LE PLAFOND, NI LE TAUX, NI LES
                  ARMES — et le levier que le chantier proposait en P0 se retourne
                  contre son propre objectif. Mesure : les armes retirent 0 % de la
                  population passe la minute 10, et sur 300 s ininterrompues la
                  horde SATURE son plafond. Le goulot est le TEMPS DE HORDE
                  ININTERROMPU.
                  AJOUTER DE LA HORDE PENDANT UN BOSS EST AUTO-DESTRUCTEUR. Le tir
                  se disperse, le boss meurt plus lentement, la part du temps passee
                  en boss monte — donc l exposition TOTALE a la horde BAISSE. A
                  toutes les doses essayees (taux 0,20 a 0,50, plafond 60 a 100),
                  `hors boss` chute de 81 a 40-55 corps et la part de boss passe de
                  17 % a 35-67 %. C1 N EST PAS LIVRE : le plafond de boss reste a
                  42 et le spawner reste coupe pendant un combat. Le risque de
                  second ordre que le chantier demandait d evaluer avant n etait pas
                  celui qu il annoncait — ce n est pas le Rempart qui devient fort,
                  c est le RYTHME qui casse.
                  LE LEVIER QUI TIENT EST LA REPRISE. Un boss laisse la horde a zero
                  en partant et elle met 158 s (solo) a retrouver la moitie du
                  plafond ; sur cinq boss, c est la moitie de la manche passee a
                  remonter une pente. `BOSS_REPRISE_TIME` x `BOSS_REPRISE_MUL` —
                  45 s a taux triple APRES la mort du boss, et seulement la. Le
                  regime permanent ne bouge pas, le combat de boss non plus.
                  Solo : population hors boss 39 % -> 54 % du plafond (seuil 50),
                  chute resorbee en 25 s au lieu de 148 (seuil 60). Les DEUX
                  criteres d acceptation du chantier sont tenus. Part du temps en
                  boss inchangee : 33 % contre 34 %.
                  A QUATRE JOUEURS SEUL LE CRITERE DE REPRISE EST TENU (jamais ->
                  31 s). La population y reste a 10 % du plafond, et elle y est DEJA
                  hors boss chez le temoin (7 %) : le plafond suit `joueurs^0,75`
                  mais la vitesse de nettoyage d une equipe monte plus vite. C est
                  une question de taux nominal PAR EFFECTIF, hors du perimetre de ce
                  lot — le chantier interdisait d y toucher sans preuve, la preuve
                  existe maintenant.
                  DEUX PIEGES DE MESURE PAYES, ET LES DEUX ONT FAILLI FAIRE
                  CONCLURE FAUX. La graine de `GameState` ne seme que le BIOME : les
                  tirages de cartes, les types d ennemi et la cadence d elite passent
                  par `Math.random`, global et non seme. Deux campagnes du MEME code
                  ont rendu 28 % puis 50 % de temps en boss. Et le compteur d abri
                  sous le feu de `verifierMecaniques` est un NOMBRE D IMAGES, pas un
                  taux : a deux manches il a rendu 1, 2, 3, 12 puis 18 sans suivre
                  la dose. A six manches la reponse est nette et INVERSE de l alarme
                  — 39 images sans reprise contre 18 avec. La rampe AMELIORE la
                  garantie d abri au lieu de la degrader.
    0.32.5 lot 6  VINGT-CINQ BATTEMENTS SUR TRENTE ETAIENT MUETS. Cinq evenements
                  dans tout le script, une geometrie declaree JAMAIS tiree, et la
                  meme dent de scie montante repetee six fois. Tout est une TABLE
                  DE DONNEES : aucun systeme a construire.
                  `anneau` etait dans `GEOMETRIES`, IMPLEMENTEE (`_ringPoint`, avec
                  ses huit essais et sa distance de degagement) et absente des TROIS
                  scripts. Elle est tiree quatre fois.
                  UN EVENEMENT EST UNE DONNEE, PAS UNE MECANIQUE : un tableau de
                  types, un multiplicateur de taux, une annonce. Deux types de plus
                  — Essaim et Chaine de relais — n ecrivent RIEN dans la
                  simulation, et ils sont ce qui permet ONZE evenements sans
                  qu aucun ne serve plus de DEUX fois. Quatre types n en auraient
                  autorise que huit, et repeter la Nuee etait le defaut d origine.
                  `EVENTS` est append-only : son index circule sur le reseau.
                  LA SOMME PAR SEGMENT NE BOUGE PAS — 6,0 · 10,0 · 12,6 · 14,7 ·
                  17,9 · 20,7, conservees au dixieme. On redistribue DANS le
                  segment, on n ajoute pas : sans ca, tout ce que les lots
                  precedents ont mesure serait a refaire.
                  MAIS LA PRESSION EFFECTIVE N EST PAS LA SOMME DES TAUX. Un
                  evenement MULTIPLIE — de x0,38 pour le siege a x2,6 pour la nuee.
                  Un premier jet a sommes egales et types repartis « pour la
                  variete » donnait 7,4 · 12,4 · 10,8 · 21,4 · 13,4 · 18,2 : le
                  segment 4 plus intense que le 5, et l apogee du 6 SOUS le 4 — la
                  manche redescendait deux fois. Les gros multiplicateurs vont donc
                  tard : 5,3 · 8,6 · 12,0 · 17,6 · 18,4 · 32,5, monotone.
                  EN SOLO, UN SEGMENT NE PERD PLUS DEUX BATTEMENTS.
                  `quatre-fronts` exige trois joueurs et le repli est SILENCIEUX ;
                  les segments 5 et 6 en portaient deux chacun, donc l apogee du
                  solo etait doublement degradee — et d autant plus en cauchemar, ou
                  `GEOM_CAUCHEMAR` mappe `pince -> quatre-fronts`.
                  `verifierScript` ne verifiait que la POSE d un evenement. Il
                  refuse desormais un type servi plus de deux fois, une geometrie
                  declaree jamais tiree, deux segments consecutifs de meme FORME
                  (la suite des signes de variation, pas les valeurs), un segment
                  qui perd plus d un battement en solo, et une pression effective
                  qui retombe. Vert sur les trois scripts.
                  MESURE : la mi-manche gagne jusqu a 17 % de densite sans que la
                  somme des taux change — minute 15, 69 -> 81 corps ; minute 5,
                  44 -> 49 ; minute 20, 93 -> 100. Le plateau de fin ne bouge pas,
                  c est la fenetre de mesure qui le borne, pas le script.
                  Et une premisse ecartee : `TL_CFG.QUARRY_*` EST utilise —
                  `_spawnQuarry` est appele par l evenement Chasse.
    0.32.6 lot 7  LA JAUGE DE PUISSANCE N EXISTAIT PLUS DEPUIS UN AN, ET RIEN NE
                  LE DISAIT. `powerBlockHtml()` etait complete, ses reperes
                  MESURES, sa CSS ecrite dans DEUX feuilles, la regle de rendu
                  documentee — et `<div id="buildPower">` avait disparu du markup.
                  Un producteur sans consommateur est le meme silence qu un champ
                  sans lecteur : personne ne voyait la jauge. Elle est remise.
                  Meme forme, un cran plus bas : `.sectionTitle` n avait aucune
                  regle `[hidden]` et ce depot n en a pas de globale, donc
                  `buildSkillsTitle.hidden = true` ne faisait RIEN — le titre
                  « Competences » restait sous une ligne vide.
                  LE PLAFOND D UN ARCHETYPE SE COMPTE, IL NE SE DECLARE PAS. Les
                  sept chiffres du commentaire etaient releves a la main et deux
                  avaient pourri : la demolition valait 8 AVANT ses quatre graines
                  et vaut 12, l acrobat 7 alors que deux de ses trois graines SONT
                  des cartes de `mobilite` — donc 5. Une jauge calee dessus se
                  serait remplie a 66 % un badge plein en main. `plafondDe()`
                  compte sur les tables, `verifierBuilds()` refuse un plafond qui
                  touche le seuil.
                  L ARCHETYPE DEVIENT UNE SECTION, PLUS UN SUFFIXE. Icone, jauge du
                  SEUIL au PLAFOND, deux forces et deux faiblesses par archetype —
                  du texte, jamais une regle : aucun bonus, aucun deblocage, aucun
                  filtre de tirage. Il DISPARAIT tant que rien n est engage. Le
                  badge accole au nom de classe disparait : la meme chose dite deux
                  fois sur un ecran ne se lit plus qu une fois.
                  LE BILAN DIT CE QUE LA MANCHE A LAISSE AU COMPTE, et seulement
                  au SIEN — un record et un haut fait sont des faits de PROFIL,
                  quatre lignes dont trois ne se lisent pas n en valent pas une.
                  `c.lastFinal` etait ECRIT et lu NULLE PART depuis sa creation :
                  il porte desormais l ecart, et l ancien temps se lit AVANT
                  `recordFinal` — qui l ecrase — sur la meme `clefRecord`, donc a
                  effectif egal (lot 1). `c.hfRun` accumule les hauts faits des
                  DEUX chemins : `lastHf` ne portait que ceux de la fin, et ceux
                  gagnes en cours de manche ne seraient jamais apparus.
                  Le tableau du bilan porte l archetype sous la classe. Rien de
                  plus ne circule : `ownedCounts` est deja chez le client.
                  PREMISSE ECARTEE : le 10a du chantier — attribuer les degats
                  subis a une source — etait DEJA FAIT. `DAMAGE_SOURCES` porte
                  SEPT categories, `_hurt` les cumule dans `p.hurtBy`, le bilan en
                  fait une barre empilee et le HUD une ventilation en direct.
    0.32.7 lot 8  LE DEPOT AVAIT UN ABRI PARFAIT, ET IL NE TENAIT QU AU CALAGE DE
                  LA GRILLE. Deux conduites de la Fonderie, 65 px d ecart sur
                  416 px de long : gonfle de `CLEARANCE`, il reste 36 px de bande
                  libre, moins qu une case. Aucun centre ne tombe dedans, la
                  navigation y voit un MUR PLEIN — le joueur s y tient, le champ ne
                  peut pas l y rejoindre. MESURE : 119 s avant le premier contact,
                  et JAMAIS avec le spawner reel, contre 4,4 s pour la fente
                  JUMELLE, meme objet, meme largeur, autre calage. Le meme obstacle
                  fermait le meme abri contre le BORD de l arene, a 32 px.
                  IL N Y EN AVAIT QU UN, ET IL A FALLU DEUX METHODES POUR LE VOIR.
                  Le balayage large — 17 286 positions, 5 lieux x 2 modes, la horde
                  en anneau a 800 px — repond « aucun abri, pire contact 6,3 s »,
                  parce qu au pas de 80 px il ne pose jamais le joueur DANS une
                  fente de 64 px. La forme se cherche donc sur la GEOMETRIE
                  (`passagesAveugles()`) et se confirme en simulation.
                  L EN-TETE DE `navigation.js` DECRIVAIT LA MOITIE DU PIEGE. Une
                  CLOISON plus mince que `CELL - 2 x CLEARANCE` passe entre deux
                  centres — garde. Un PASSAGE dont la bande libre est plus etroite
                  qu une case n en porte aucun — pas garde. `verifierNavigation()`
                  rejoue desormais les deux, et il tourne sur les CINQ lieux.
                  SEUILS MESURES, PAS CHOISIS. Au pire calage — fente centree sur
                  un multiple de `CELL` — 50, 65 et 68 px d ecart ne sont JAMAIS
                  contestes, 72 et 80 le sont en 5 s ; une fente de 160 px de long
                  est contestee en 4,2 s, une de 200 px ne l est jamais. D ou
                  `PASSAGE_MIN = 80` et `PASSAGE_LONG = 200`. Onzieme cas de
                  `NAV_CAS`, pose AU PIRE CALAGE : a 1350 il passait meme a 50 px
                  d ecart et ne gardait rien, a 1360 il mord.
                  La conduite passe de 0,06 a 0,12, seule valeur qui satisfasse les
                  deux contraintes — 173 px entre deux conduites, 86 px contre le
                  bord. Les cinq lieux sont muets. Remesure de l espace jouable de
                  la Fonderie : 93,0 -> 89,5 -> 80,1 % contre 93,3 -> 90,6 ->
                  81,6 %, monotonie et classement inchanges.
                  L ABRI DU BOSS N EST PAS CELUI-CI, et c est ce qui permettait de
                  toucher a l un sans casser l autre : `ABRI_RETOUR` / `_abris()`
                  garantissent qu un MOTIF laisse ou se mettre, pour une duree
                  bornee. La fente n a ni echeance ni role qui la conteste.
                  LES TROIS DERNIERES MATIERES DU BRIEF SONT UN DEDOUBLONNAGE, PAS
                  UN AJOUT : trois lieux repetaient une trace sur deux de leurs
                  quatre quartiers. Corrosion, fissures et dechets prennent ces
                  places — l entrepot d une fonderie rouille au lieu de bruler, ce
                  qui heurte une coque assez fort la FEND au lieu de la rayer, une
                  livraison laisse ses emballages. Chacune se separe de sa voisine
                  par UN trait et jamais par sa couleur : la corrosion a un FOYER
                  la ou la souillure a un bord, la fissure SE DIVISE la ou la
                  rayure reste droite, le dechet est oriente au hasard et porte une
                  OMBRE — il est pose SUR le sol, la cendre est retombee DEDANS.
                  DEUX PREMISSES ECARTEES. `drawTraces()` coupe sous `GFX_LOW` :
                  c est voulu et ce n est pas un tout-ou-rien — les paliers sont
                  QUATRE et seul le premier coupe, l intermediaire demande existe.
                  Et le lien lieu -> arme n est pas construit : ce qui est arbitre
                  est la CONTRAINTE du jour ou il le sera — fixer le lieu des
                  manches classees, l autre issue donnant 60 classements.
    0.32.8 lot 9  UNE CAPACITE N EST PAS UN COEFFICIENT, ET LE TABLEAU D ECHELLE
                  NE SAIT DIRE QUE LE SECOND. Il rend un axe plus ou moins payant ;
                  il ne sait pas dire « cette arme ne lance pas de projectile ».
                  Les cartes concernees sont justement `horsEchelle` — leur effet
                  ne passe par aucune clef d `AXE_DE_CLEF` — donc le filtre par
                  axes ne pouvait pas les voir. `CAPACITE` les branche : la carte
                  porte `exige`, `eligibleCards` interroge le predicat de l arme.
                  « BALLES REBONDISSANTES » ETAIT OFFERTE AUX DIX ARMES. Morte sur
                  les quatre qui ne lancent pas de balle — `m.bounce` voyage sur le
                  projectile — et PIRE QUE MORTE sur l obus du siege :
                  `if (o && b.bounce > 0)` le fait rebondir sur l obstacle AU LIEU
                  d exploser, donc la carte lui retire son souffle. `litRebond`
                  disait deja tout cela depuis le debut, mais il ne servait qu a
                  ponderer les BONUS AU SOL — jamais le tirage des cartes.
                  DEUX SENS DE « REBOND », AUCUNE LIGNE EN COMMUN : sur le DECOR
                  (`m.bounce`), et entre CIBLES (`mods.chain` pour une balle,
                  `TESLA_REBONDS` pour l arc). Le tesla porte le second et pas le
                  premier — c est pour ca que son `ech.ricochet` est a zero alors
                  qu il est l arme qui rebondit le plus.
                  LE LASER DECLARAIT 0,4 DE CADENCE ET N EN LIT AUCUNE.
                  `_faisceauInterne` avance sur `LASER_TICK` et ne touche jamais a
                  `fireIntervalMul` ; `_shoot` est garde par `arme.interval > 0`.
                  Quatre cartes d echelle mortes dans son offre, plus echo, salve
                  arriere, frenesie et adrenaline qui passent toutes par `_shoot` —
                  neuf cartes, de 113 a 104. `ZERO_LEGITIME` remplace la liste en
                  dur « perforation et ricochet » : l exemption se LIT sur la
                  capacite, sinon la prochaine arme la rouvre en silence.
                  PREMISSE ECARTEE : `ech.cadence` n est PAS la cause du +16 % du
                  laser. `mesureArmes` joue SANS CARTES, donc `appliquerEchelle`
                  n y intervient pas. Le coefficient ne reduisait que la
                  DECLARATION ; l effet etait deja nul.
                  `rapportCarteArme()` rassemble les trois verrous ecrits a trois
                  endroits — famille d arme, exigence, axes — et ne DECIDE rien.
                  `verifierPools()` garde ce qu ils produisent : une exigence
                  inconnue, une capacite que plus aucune carte n exige ou que
                  TOUTES les armes ont, et un pool sous 80 % de celui du tir
                  standard. Le laser est le plus pauvre a 93 %.
                  L EQUILIBRE DES ARMES A BOUGE ET PERSONNE NE L AVAIT REJOUE.
                  Cinq armes hors tolerance : lame +21 (elle n etait pas dans le
                  tableau du plan), laser +18, siege -13, dispersion -14,
                  precision -5. Railgun et grenade sont RENTRES depuis. Le sens du
                  deplacement suit le lot 5 — densite de mi-manche +17 %, donc les
                  armes de zone montent et les cible-unique descendent. RIEN N EST
                  CORRIGE ICI : ce lot porte sur la compatibilite, et la regle du
                  plan est de mesurer le levier avant d y toucher.
    0.32.9 lot 10 « ARRETEE » N EST PAS « GAGNEE », ET LE CHAMP S APPELAIT `finie`.
                  `hfStatsDeManche` le pose a l evaluation de FIN DE MANCHE, quelle
                  qu en soit l issue — la victoire a son propre champ, `complete`,
                  et trois hauts faits le lisaient deja. SEPT autres ecrivaient
                  « terminer une manche » en lisant `finie` : ils tombaient donc en
                  MOURANT. Le champ s appelle `arretee`, et le nom etait la seule
                  chose qui manquait pour que les deux cessent de se confondre.
                  MESURE, avant -> apres : `veteran` (intermediaire, trois reliques)
                  passe de m1 PARTOUT a m11 en solo ; `puriste` et `nuit_blanche`,
                  deux DEFIS qui donnent des cadres, passent de la PREMIERE manche
                  a jamais en vingt. `perfection` et `quatuor` suivent.
                  `recrue` et `debout` gardent `arretee` : ils ouvrent la ligne
                  `tronc` et l ARME dispersion. Enfermer du contenu de depart
                  derriere une victoire est le seul risque que ce chantier ne prend
                  pas — leurs TEXTES ont ete corriges a la place. C est pour ca que
                  l exemption du verificateur se lit sur la RECOMPENSE et jamais sur
                  une liste d identifiants.
                  LA REGLE SE MESURE, ELLE NE SE RELIT PAS. `verifierHautsFaits`
                  evalue chaque condition sur des etats identiques et genereux dont
                  il ne fait varier que l issue : celle qui change de verdict avec
                  `arretee` parle de la fin de manche, et si elle ne change pas avec
                  `complete` elle confond les deux. Aucune lecture de libelle, donc
                  rien a tenir a jour. Premiere version de la regle ECARTEE : « un
                  defi ne se valide jamais sur une manche perdue » accusait quatre
                  defis d exploit PONCTUEL — un boss sans ultime, un segment sans
                  degat — qui ne lisent ni l un ni l autre.
                  LA LISTE BLANCHE DES CHAMPS PROTEGE L INVARIANT QUE RIEN NE
                  GARDAIT. « Ils ouvrent des portes, ils ne donnent pas de
                  puissance » etait tenu depuis toujours, et il suffisait d ajouter
                  `mods` a une entree pour qu une puissance permanente entre par la
                  porte de service sans qu aucune erreur ne se leve.
                  `HF_NIVEAUX` DECLARE UNE DIFFICULTE, RIEN NE LA MESURAIT.
                  `mesureHautsFaits()` fait jouer un COMPTE — vingt manches, cartes
                  prises, marchand, arme et classe tournantes, et il peut mourir.
                  Sans ces quatre choses, trente hauts faits sur trente-six sont hors
                  de portee par construction : le premier banc n en voyait que six.
                  Il dit aussi ce qu il NE joue pas — une jauge a 7 % signifie « le
                  pilote ne fait pas ca », une a 77 % « le seuil est juste au-dessus ».
                  Le pilote gagne UNE manche sur vingt : tout verdict sur un haut
                  fait de victoire est borne par le bot et non par le seuil, et c est
                  la limite principale du banc.
    0.32.10 lot 11 TRENTE-TROIS VERIFICATEURS DANS NEUF MODULES, ET RIEN NE LES
                  LANCAIT. Chacun est ecrit a cote de sa donnee — c est la bonne
                  place et elle ne bouge pas — mais personne n avait la LISTE. Ce
                  plan en a trouve TROIS rouges, tous par hasard en cherchant autre
                  chose : l equilibre des armes (lot 9), la progression (lot 10) et
                  les boss (celui-ci). Le defaut est dans l ABSENCE D APPEL, la
                  seule chose qu un verificateur ne peut pas signaler lui-meme.
                  `verif.js` est le point d entree. 22 verificateurs de TABLE en
                  moins d une seconde, donc lancables avant chaque commit ; les 11
                  campagnes simulees derriere `--tout`. Un outil qu on n ose pas
                  lancer ne se lance pas, et c est la SEULE raison des deux modes.
                  LE COUT SE MESURE, IL NE SE DEVINE PAS : `verifierBoss` lit une
                  table de mecaniques et prend 446 s, `verifierBiomes` genere 200
                  graines sur cinq lieux et prend 0,0 s. Parier d apres le nom
                  donnait l inverse dans les deux cas.
                  UNE CONSTANTE SANS LECTEUR NE LEVE RIEN. Balayage des 689 clefs
                  des quinze tables : NEUF sans lecteur. Un bloc `CFG.SEAL_*`
                  doublait `BOSS_CFG.SEAL_*` — et se cachait derriere son propre
                  prefixe —, un cooldown de touche sur un drone qui se CONSOMME, une
                  intensite de ralentissement que le canal global portait deja, une
                  purge comptee en touches que le code disait lui-meme remplacee.
                  Plus trois leviers a zero dans un terme neutre : `(1 + 0 * x)`
                  vaut 1 et coutait un `_teamPower()` par apparition.
                  UN ZERO N EST PAS UNE MORT : `GAZE_TIME: 0` distingue le regard
                  INSTANTANE du regard permanent, le zero PORTE la mecanique.
                  DEUX DEFAUTS DANS LA SONDE AVANT QU ELLE NE DISE VRAI, tous deux
                  du genre qu elle cherche : `` dans un litteral gabarit est un
                  BACKSPACE — zero lecteur pour les 689 clefs —, et
                  `indexOf("CFG.SEAL_RADIUS")` trouve `BOSS_CFG.SEAL_RADIUS`.
                  UN ARCHETYPE SE MESURE AU COMPTE NEUF. `verifierBuilds` comptait
                  a contenu COMPLET ; la carte de rarete 3 de CHAQUE famille etant
                  la recompense d un haut fait, deux archetypes tombaient sous le
                  plancher pour qui commence. `sillage` entre chez l acrobat —
                  seule carte libre de verrou, d arme et de classe qui parle
                  d esquive sans appartenir deja a un autre archetype.
                  `TIR_FIGE` est une seconde source de verite VOLONTAIRE : `tir`
                  aiguille `_volleyInterne`, et le changer fait basculer une arme
                  d une branche a l autre sans qu aucune erreur ne se leve.
                  RELEVE NON CORRIGE : les sept constats de `verifierBoss` — les
                  combats RACCOURCISSENT (79 s au premier boss, 55 s au dernier),
                  segment 1 a 95 s et final a 173 s hors bornes a quatre,
                  emportement a 29,4 % pour un plafond de 25 %, renforts a 58 %
                  d ecart selon l effectif. Meme cause probable que les deux
                  precedents, le lot 5. Et DEUX des sept n en sont pas : le
                  verificateur melange « rouge » et « je n ai pas pu mesurer ».

   --- plan 30 : ce que le lot 5 du plan 29 a deplace ------------------------

    0.33.0 lot 1  L INSTRUMENT MENTAIT SUR TROIS POINTS, ET DEUX EMPECHAIENT LE
                  REGLAGE. Avant de corriger les trois verificateurs rouges que le
                  plan 29 laisse, il fallait constater que la MESURE elle-meme
                  etait fausse.
                  `LEVEL_MARKS` demandait le niveau 27 a la MINUTE 32 alors que la
                  horde dure exactement TRENTE minutes — six segments de 300 s. La
                  marque ne se mesurait jamais : `mesureProgression` rendait la
                  derniere valeur connue, et le verificateur lisait le PLAFOND de
                  niveau comme un depassement.
                  UN VERIFICATEUR REND CE QUI EST ROUGE, ET SEPAREMENT CE QU IL N A
                  PAS PU MESURER. `verifierBoss` comptait SEPT problemes la ou il y
                  en a CINQ : les deux autres disaient seulement « moins de huit
                  combats pour ce boss ». Un echantillon maigre est un defaut de la
                  MESURE, pas du jeu, et les confondre apprend a ne plus lire la
                  sortie. Le contrat devient `{ err, note }` et accepte toujours un
                  tableau nu, donc les trente-deux autres ne bougent pas.
                  UN BUDGET DE PRESSION N EST PAS UN PARTAGE DE RECOMPENSE.
                  `WAVE_CROWD_EXP` gouvernait SIX grandeurs — plafond de population,
                  taux d apparition, part d elites, ajouts et renforts du boss — ET
                  le partage d XP par effectif. Regler l un cassait l autre, donc
                  aucun des deux n etait reglable : quand le lot 5 a densifie la
                  mi-manche de 17 %, l XP a suivi la densite sans que le partage
                  puisse s ajuster, et la courbe de niveau a diverge SELON
                  L EFFECTIF. `XP_CROWD_EXP` est le levier qui manquait, pose a la
                  valeur IDENTIQUE : aucun comportement ne change, le reglage vient
                  au lot suivant.
                  PIEGE DE MESURE PAYE : a trois manches la courbe n est pas
                  monotone — `LEVEL_XP_GROWTH` a 1,12 rend un niveau PLUS HAUT qu a
                  1,10 a quatre joueurs, ecart-type 4,2 cartes. Le systeme a une
                  retroaction (niveaux -> cartes -> kills -> XP). La sortie n est
                  pas « plus de manches » mais le DECOUPLAGE : on mesure l XP BRUTE
                  cumulee par minute, le revenu ne dependant pas du cout des
                  niveaux, et une seule campagne par effectif teste alors tous les
                  couples. Le resultat redevient monotone.

    0.33.1 correctif  `badgePoids` etait declare APRES la boucle de l arbre qui
                  l appelle : `const` dans une zone morte temporelle, donc
                  `renderMeta` levait a chaque ouverture de la progression et
                  l ecran restait vide. Declaration remontee avant les deux
                  boucles qui la lisent.

   --- plan 31 : les fondations ---------------------------------------------

    0.34.0 lot 02 LE HASARD APPARTENAIT AU PROCESSUS, ET SEIZE SALLES SE LE
                  PARTAGEAIENT. La graine existait — `new GameState(diff, biome,
                  seed)` pilotait deja `buildBiome` et `weatherFor` — mais le
                  DEROULE tirait ses 91 decisions de `Math.random`, une variable
                  GLOBALE. `hub.js` tient jusqu a `ROOM_MAX = 16` salles dans un
                  processus, avancees par la meme boucle : il n existait aucun
                  moyen d imposer une graine a une salle sans l imposer aux quinze
                  autres. Le generateur est desormais un CHAMP de l etat,
                  `this.alea = mulberry32(this.seed ^ 0x9E3779B9)` — le decalage
                  evite que le terrain et le deroule partagent la meme suite.
                  LE DEFAUT ETAIT EN PRODUCTION ET LE BANC LE MONTRAIT. Six
                  campagnes semaient en ECRASANT la fonction globale
                  (`Math.random = grainer(r * 7919)`) : correct pour un script a
                  une seule `GameState`, faux des qu il y en a deux. `grainer` est
                  SUPPRIME — c etait une recopie exacte de `rng()` (`biomes.js`),
                  le meme mulberry32 ecrit deux fois — et les six campagnes
                  passent la graine au CONSTRUCTEUR : `mesureTTK` et
                  `manchePilotee` la prennent en argument, les quatre autres la
                  posent a la construction. Le `try/finally` de restauration
                  disparait avec.
                  LE PILOTE DE BANC TIRAIT AUSSI, ET IL TIRAIT DU GLOBAL. Dix
                  choix — la carte prise, la relique achetee, la position d un
                  corps en anneau — venaient de `Math.random` et devenaient
                  irreproductibles des que le global cessait d etre seme. Ils
                  passent par `g.alea` : une manche de banc redevient entierement
                  fonction de sa graine.
                  LE BIOME SE TIRE DE LA GRAINE quand il n est pas impose. Sinon
                  « meme graine, meme terrain » etait faux hors banc : le lieu
                  etait choisi avant que la graine existe.
                  `verifierDeterminisme()` AVANCE DEUX ETATS EN ALTERNANCE, et
                  c est tout le test : avances l un apres l autre ils passeraient
                  meme avec un generateur global. Verifie aussi l inverse — deux
                  graines differentes doivent donner deux manches differentes,
                  sinon le critere passerait sur un jeu devenu constant. En
                  `--tout`, 10 s.
                  MESURE, ET C EST LA CONTREPARTIE ANNONCEE : un generateur change
                  decale toutes les suites de tirage. Les verificateurs lents ne
                  changent pas de couleur, mais leurs chiffres BOUGENT.

    0.34.1 lot 03 DEUX STRUCTURES COUVRAIENT L ARENE, LA HORDE OCCUPE UNE BOITE.
                  Leur cout etait indexe sur `ARENA_W x ARENA_H` alors que ce
                  qu elles decrivent tient dans la boite d apparition. Mesure :
                  `_grille()` coutait 17,4 us a 200 corps et 16,6 a 600 — tripler
                  la population ne le bougeait pas, signature d une structure
                  dominee par ses cases VIDES.
                  LA GRILLE SE BORNE A L ENGLOBANTE des corps et des joueurs,
                  plus UNE CELLULE de marge. 3 225 cases -> 1 118, 16,6 us ->
                  8,8 us, et 7,5 us sur une arene DOUBLEE dans le banc : le cout
                  cesse de dependre de la surface, ce qui est le critere — une
                  amelioration restee proportionnelle n aurait rien regle.
                  LA MARGE N EST PAS DECORATIVE : `_separateFromPlayers` et
                  `_renforts` interrogent le VOISINAGE d une case, et sans elle un
                  corps au bord cherche un voisin hors tableau — la separation
                  echoue en SILENCE. L origine sort de `_grille()` avec le reste.
                  LE CHAMP DE NAVIGATION S ALLOUE SUR UNE FENETRE ancree sur sa
                  source, de la demi-diagonale de la boite d apparition plus
                  quatre cases. 8 160 cases -> 3 481, 184 us -> 83 us, et la
                  taille NE DEPEND PAS de l arene : a la map cible, la diffusion
                  pleine arene passait a 32 400 cases et 1,5 ms — quatre champs
                  pouvant echoir dans le meme tick, pour un budget de 16,6 ms.
                  PAS DE SECTEURS, PAS DE PORTAILS. La litterature (Supreme
                  Commander 2, Game AI Pro ch. 23) decoupe la carte et relie les
                  secteurs par un graphe, parce qu une unite de RTS peut etre a
                  l autre bout de sa cible. Ici les ennemis n existent QUE dans
                  `_spawnBox()` : il n y a jamais de trajet long a planifier.
                  UNE FENETRE EST UNE NAV A PART ENTIERE — meme cellule, meme
                  masque, une ORIGINE — donc `celluleDe`, `viser`, `libreProche`
                  et `droitPossible` la lisent sans savoir qu elle en est une. Sa
                  TAILLE EST FIXE et c est l ORIGINE QUI GLISSE : des dimensions
                  variables au bord de l arene rendraient les tampons
                  irreutilisables, et une allocation par diffusion couterait plus
                  que la diffusion. `nav.bloque` reste plein arene, bati une fois
                  par manche, hors boucle.
                  L ANCRE VOYAGE EN COORDONNEES MONDE. Un indice de case retenu a
                  l image precedente ne designe plus la meme case quand la fenetre
                  a glisse — et l ancre est ce qui empeche un corps plaque contre
                  une cloison d etre aspire DANS le mur (mesure du plan 19 : 4
                  corps sur 4 plantes, 0 arrivee en 40 s).
                  HORS FENETRE, LA DROITE LIGNE : c est deja ce que fait tout
                  corps sous `NEAR`, et un corps a deux mille pixels de sa cible n
                  a pas d obstacle a contourner qui vaille une diffusion.
                  `verifierGrilles()` dans la suite RAPIDE : couverture (500 corps,
                  aucune paire a moins de `POSTE_ECART` hors du voisinage 3x3),
                  BORD (les quatre coins de la boite occupee trouvent leurs
                  voisins — le test de la marge), et les deux couts, chacun
                  remesure sur une arene DOUBLEE. Restent verts : `navigation`,
                  `encerclement`, `deplacement`, `determinisme`.

    0.34.2 lot 06 LA DOCTRINE DE L XP, ECRITE — AUCUNE LIGNE DE CODE. Une regle
                  qui a ete decidee et qui contraint tous les plans suivants ; elle
                  est beaucoup plus facile a TENIR qu a reparer, et une decision
                  qui ne vit que dans un document de brainstorming est perdue au
                  troisieme plan.
                  L XP ET LE NIVEAU SONT DES GRANDEURS DE SALLE, la carte, les
                  eclats, les reliques et le loot de run des grandeurs de JOUEUR.
                  Ce qui est individuel est le CHOIX, pas la cadence.
                  `_addXp` A DEUX APPELANTS, ET LA LISTE EST FERMEE : `_killEnemy`
                  pour la horde, `_damage` pour le boss — AU PRORATA des degats
                  infliges, jamais a la mort. Le document de decisions en annoncait
                  trois : releve fait, `_killBoss` n en est pas un, et cette
                  conception (on est paye pour avoir tape, pas pour avoir acheve)
                  n etait ecrite nulle part.
                  TOUTE RECOMPENSE D OBJECTIF SE VERSE EN ECLATS OU EN LOOT, JAMAIS
                  EN XP : l XP est le seul canal qui ne peut pas distinguer qui a
                  pris le risque. `_eventReward()` ne verse deja aucune XP — on ne
                  cree pas une contrainte, on ECRIT une propriete que le code a
                  deja et qu un futur lot casserait sans le savoir. Sans elle,
                  partir chercher un objectif pendant qu un autre farme ne coute
                  rien : les deux montent au meme niveau a la meme seconde, et
                  l arbitrage central du plan n existe pas.
                  `TL_CFG.QUARRY_XP_WORTH = 40` est la seule exception en attente :
                  quand la proie deviendra un mini-boss porteur de recompense,
                  cette valeur se CONVERTIT en eclats et en loot, elle ne s y
                  ajoute pas.
                  RETIRER N EST PAS TUER, ecrit une fois pour le recyclage lointain
                  et pour les deux retraits du mini-boss a venir.

    0.34.3 lot 04 SE SEPARER NE PARTAGEAIT PAS LA HORDE, IL LA TIRAIT AU SORT.
                  `_spawnBox()` construisait UNE boite englobante de tous les
                  joueurs et `_edgePoint(side)` en tirait un bord d apres
                  `beatSide` — c est-a-dire d apres le battement du script, qui
                  ignore ou sont les joueurs. Sur une boite de 3 600 px de large,
                  le bord tire est colle a l un et a 3 600 px de l autre. Mesure a
                  cet ecart : rapport de 2,7 a 24,2 entre les deux joueurs, ET LE
                  SENS CHANGE AVEC LA GRAINE. Ce n est pas une difficulte, c est
                  une loterie : rien a l ecran ne dit de quel cote la vague tombe.
                  UNE BOITE PAR GROUPE, et `beatSide` s applique DEDANS : la
                  geometrie du battement dit d ou ca vient, elle n a jamais eu a
                  dire pour qui. Rapport apres : 1,13 · 1,36 · 1,39 sur les trois
                  graines mesurables, et le total en jeu passe de 196 a 41, de 130
                  a 52. A 400 px, RIEN NE CHANGE D UN CHIFFRE — si la calibration
                  avait bouge pour une equipe soudee, la geometrie n aurait pas ete
                  corrigee, elle aurait ete deplacee.
                  LE BUDGET SE REPARTIT, IL NE SE MULTIPLIE PAS : poids =
                  effectif^0,5, part = poids / somme x budget. Le total ne bouge
                  jamais, quel que soit l exposant — c est ce qui rend ce bouton
                  sur : il deplace la pression entre groupes, il n en cree pas.
                  `crowd^WAVE_CROWD_EXP` reste calcule sur l effectif TOTAL. A
                  e = 1 un joueur parti seul d une equipe de quatre recevrait 0,71
                  fois la horde d un vrai solo — partir seul serait PLUS DOUX que
                  jouer solo ; a e = 0,5 il recoit 1,04, sans aucune des
                  compensations du solo.
                  LE PLAFOND SE REPARTIT, IL NE SE DIVISE PAS. `_enemyCap()` reste
                  global — sinon se separer multiplierait la horde — mais chaque
                  groupe recoit une part proportionnelle a son effectif, avec du
                  jeu : sans elle le groupe le plus fourni consomme tout et l autre
                  joue dans le vide.
                  UN CORPS A PLUS DE `RECYCLE_DIST` DE TOUT JOUEUR EST RETIRE EN
                  SILENCE. A 3 600 px la population doublait ou triplait sans que
                  le contact augmente : les corps en trop etaient EN TRANSIT, on
                  payait leur simulation, leur separation et leur instantane, et
                  ils ne menacaient personne. Il ne passe PAS par `_killEnemy()` —
                  retirer n est pas tuer — et il epargne les elites et le porteur
                  d objectif, sinon un contrat « tuez trois elites » se viderait
                  tout seul.
                  DEUX DEFAUTS TROUVES PAR LA MESURE, INVISIBLES A LA LECTURE.
                  Un joueur A TERRE a l instant du battement sortait de TOUS les
                  groupes, et sa part de horde tombait sur son voisin : rapport 4,2
                  la ou le partage doit rendre 1. Et un GROUPEMENT PERIME est pire
                  que pas de groupement — refait au seul battement, il tenait
                  jusqu a soixante secondes apres une separation, la horde naissant
                  pendant tout ce temps sur la boite englobante : 358 corps d un
                  cote contre 11, et cette masse consommait le plafond bien apres
                  le regroupement. La validite se verifie a chaque tick, avec
                  HYSTERESIS — on entre a une vue, on sort a une vue et demie —
                  sinon deux joueurs a la limite font clignoter la geometrie.
                  `verifierGroupes()` dans la suite RAPIDE : conservation du budget
                  sur sept decoupes, la part de l isole contre un vrai solo, la
                  fermeture transitive, le joueur a terre qui reste dans un groupe,
                  et le recyclage qui epargne elite et objectif sans compter de
                  mort. La composition est LISIBLE depuis l etat (`this.groupes`) :
                  le Director en aura besoin pour ne PAS venir au secours de qui
                  s isole.

    0.34.4 lot 01 LE CLASSEMENT ETAIT ECRIT A 95 % ET NE MONTRAIT RIEN. Toute la
                  chaine existait — `classement()` regroupe par difficulte x
                  effectif et dedoublonne une manche d equipe, `hub.js` repond au
                  message `leaderboard`, `renderBoard()` affiche les sections avec
                  le joueur surligne. Le blocage tenait en UNE condition : la
                  victoire n ouvrait qu UN chiffre, le temps.
                  TROIS CLASSEMENTS SUR LA MEME MANCHE, ET ILS SONT PAR ROLE : le
                  temps recompense l equipe qui finit vite, les kills celui qui
                  tient la horde, les degats celui qui frappe. La victoire reste la
                  porte d entree des TROIS : on n entre au tableau qu en ayant
                  fini, et la condition `victory && finalKill > 0` ne bouge pas.
                  LE DEDOUBLONNAGE VAUT POUR LE TEMPS ET NE VAUT PAS POUR LES DEUX
                  AUTRES, et c est LE point du lot. Le temps est une grandeur d
                  EQUIPE — une manche, une ligne, quatre pseudos ; les kills et les
                  degats sont des grandeurs de JOUEUR. Applique a eux, le
                  regroupement ferait disparaitre TROIS JOUEURS SUR QUATRE, alors
                  que le sens d un classement par role est de les montrer tous les
                  quatre avec leur chiffre. Un PARAMETRE de `classement()`, jamais
                  une troisieme fonction : la coupe par difficulte x effectif ne
                  doit pas se recopier.
                  TROIS RECORDS INDEPENDANTS, DONC TROIS CLEFS (`bestFinal`,
                  `bestKills`, `bestDegats`). Un joueur peut battre son record de
                  kills dans une manche PLUS LENTE ; une entree unique « la
                  meilleure au temps » aurait jete ce record-la. Trois clefs
                  plutot que trois sous-entrees : AUCUNE MIGRATION, les profils
                  existants se lisent tels quels.
                  UN PROFIL D AVANT CE LOT A SA LIGNE, A ZERO. `classement()`
                  parcourt les manches GAGNEES et lit la valeur dans la table du
                  mode : une absence vaut zero et se classe en bas, ce qui est
                  exact — ces manches n ont pas mesure ces grandeurs. Un `undefined`
                  casserait le tri au premier profil ancien.
                  `p.kills` et `p.damageDealt` etaient DEJA comptes en manche :
                  rien a instrumenter, deux champs a transporter. `verifierClassement()`
                  entre dans la suite rapide — une manche a quatre rend UNE ligne
                  au temps et QUATRE aux kills, et c est la seule chose qui separe
                  les deux modes.

    0.34.5 lot 05 UN ALLIE HORS ECRAN RECEVAIT DEUX CHEVRONS SUPERPOSES, A DEUX
                  MARGES DIFFERENTES. `drawAllyArrows` (canvas, `ARROW_MARGIN`) et
                  `updateMarks` (DOM, `MARK_MARGE`) tournaient TOUTES LES DEUX a
                  chaque image. L une etait le vestige d un remplacement dont la
                  suppression a ete oubliee — exactement le code mort que le `grep`
                  doit trouver.
                  ON GARDE LE DOM. Son vocabulaire d etat est plus riche : la FORME
                  change avant la couleur, et il ecrit « a terre » A LA PLACE de la
                  distance. Son commentaire decrit une CONCEPTION avec deux defauts
                  deja payes — un cercle laisserait les quatre coins vides, la
                  charte interdit le rouge pour ce vers quoi il faut ALLER — la ou
                  celui de la version canvas decrivait une implementation. Et c est
                  du DOM, donc le clignotement du ping se pilotera par une classe
                  CSS, sans toucher a la boucle de rendu ni au budget d image.
                  LE CHEVRON D UN ALLIE A TERRE PULSE, et c est un AJOUT : c etait
                  le seul des trois signaux — direction, distance en metres, etat a
                  terre — que la version canvas portait et que le DOM n avait pas.
                  La forme et le mot se lisent quand on REGARDE ; la pulsation se
                  voit sans regarder, et un allie a terre hors ecran est l
                  information la plus urgente que ce systeme transporte.
                  L import `fmtM` de `world.js` part avec le chemin qu il servait :
                  un import sans lecteur est du code mort, et la distance en metres
                  reste ecrite par le DOM, qui a garde le SEUL point de conversion.
                  Ce lot ne livre PAS le ping : le message, la classe `.pingue`, la
                  duree et le son appartiennent au plan qui portera les sept sons —
                  celui du ping doit etre compose AVEC les six autres. Ce lot retire
                  le doublon qui le bloquait, sans quoi le ping ferait clignoter une
                  couche sur deux.

   --- plan 32 : l outillage de mesure ---------------------------------------

    0.35.0 lot 01 LA MESURE S ARMAIT PAR L URL, ET UNE URL NE SE VOIT PAS. Le code
                  justifiait `?mesure` par « elle ne doit couter aucun clic a
                  personne — et surtout pas vivre dans un menu ou on l oublierait
                  armee ». L objection etait juste, la reponse ne l etait pas :
                  une URL ne se voit pas non plus, pas meme de celui qui l a tapee
                  deux manches plus tot. Elle devient une OPTION DE SALLE, cochee
                  avant la manche, et le temoin reste a l ecran pendant toute la
                  partie avec le nom de qui l a armee. La moitie du travail etait
                  deja faite : `armerTrace` diffusait `traceState` a toute la
                  salle, et l etat etait deja porte par la SALLE.
                  LE COMPTE RENDU EST UNE REDUCTION DE LA TRACE, JAMAIS UNE SECONDE
                  COLLECTE. `traceLigne()` pousse chaque ligne dans le JSONL ET
                  dans `Rapport`, au meme instant : on n instrumente jamais deux
                  fois, et le compte rendu NE PEUT PAS diverger du fichier.
                  IL EST BORNE, ET C EST UN CRITERE. Trente minutes a 1 Hz font
                  1 800 echantillons — illisible et couteux a coller. On ne les
                  garde jamais : on les AGREGE par segment a l arrivee, et le texte
                  tient en quelques dizaines de lignes quelle que soit la duree.
                  `verifierRapport()` fabrique une manche complete et refuse
                  au-dela de 400 lignes.
                  AUCUN PSEUDO DANS LE CORPS : chaque joueur y apparait par sa
                  CLASSE et sa COULEUR (« Rempart bleu »). Le compte rendu est fait
                  pour etre colle ailleurs. Seul l en-tete nomme qui a arme la
                  mesure — une trace anonyme ne dit pas de quelle table elle vient.
                  DEFAUT TROUVE PAR LE TEST BOUT EN BOUT : `traceLigne` est gardee
                  par `traceArme`, donc desarmer en cours de manche baissait le
                  drapeau AVANT `traceFin` et jetait la ligne `fin` — du JSONL
                  comme du compte rendu, qui annoncait « en cours » sur une manche
                  terminee. On ferme la trace, PUIS on desarme.
                  Le JSONL reste la sortie secondaire : il ne coute rien et il sert
                  quand le resume ne suffit pas, mais il demande un acces au disque
                  de la machine. Le compte rendu, lui, se colle.

    0.35.1 lot 04 DEUX INDICES MESURES, ET RIEN NE LES LIT. C EST LE POINT. Le
                  Director arrive deux plans plus tard avec six reglages a
                  calibrer — A, B, C, DECAY, seuil bas, seuil haut ; s il apportait
                  sa mesure avec lui, il n existerait AUCUNE manche enregistree
                  pour dire a quoi ressemble une courbe normale, et les six
                  seraient devines. En livrant la mesure maintenant, chaque manche
                  jouee d ici la accumule une courbe — et si la mesure est
                  mauvaise, on le voit AVANT qu un systeme s appuie dessus.
                  LA TENSION EST UN RESSENTI, PAS UN COMPTE. Les degats y entrent
                  en FRACTION DES PV MAX — un Rempart et un Tireur ne recoivent pas
                  le meme coup de la meme facon — et la DENSITE PROCHE est le seul
                  terme qui monte AVANT qu on prenne des coups : sans elle la
                  mesure est toujours en retard, et etre au contact est une tension
                  meme quand on gagne.
                  AUCUNE INSTRUMENTATION NEUVE : le terme de degats se prend dans
                  `_hurt()`, passage oblige de tout ce qui blesse un joueur ; la
                  densite se compte dans `_separateFromPlayers`, qui parcourt DEJA
                  le voisinage 3x3 ; `p.downed` existe. Cout mesure, meme graine et
                  600 s de simulation : p50 17,7 -> 18,0 us, p99 216 -> 219 us,
                  soit +1,2 % — sous le bruit.
                  DEUX AGREGATS D EQUIPE, PAS UN. `tensionMax` dira « trop haut »,
                  `tensionMoy` dira « trop bas » : l ennui est un etat COLLECTIF.
                  Une moyenne seule effacerait exactement ce que le plan 31 a
                  mesure — a 3 600 px de separation, un joueur voyait 137 corps
                  pendant que l autre en voyait 36.
                  LA MEMOIRE COURTE EST UNE DUREE : depuis la derniere elite,
                  depuis le dernier evenement, et le temps passe SOUS LE SEUIL BAS.
                  Une tension basse dix secondes n est rien, quatre-vingt-dix c est
                  une manche plate.
                  `survieIndex()` REPARE UN DEFAUT QUE PERSONNE N A CONCU, ET IL NE
                  SERT QU A LA TENSION. `powerIndex()` est purement OFFENSIF —
                  delibere, il dit ce que l arme rend contre une cible unique — mais
                  il remonte jusqu aux PV DU BOSS : une equipe cuirassee est donc
                  mesuree FAIBLE, et un loot defensif serait invisible a l indice
                  donc entierement gratuit, la ou un loot offensif grossit le boss
                  et paie une partie de lui-meme. `powerIndex()` ne bouge pas, ni
                  `BOSS_POWER_REF`, ni `SUMMON_REF`, ni la courbe des six boss.
                  `verifierIndices()` en `--tout` : meme graine, meme courbe ; borne
                  [0, 1] ; NI PLATE NI SATUREE — une tension qui reste a zero ou
                  colle a 1 ne dit rien. Les poids sont des VALEURS DE DEPART : on
                  regardera des courbes de vraies manches et on ajustera, et c est
                  exactement pour ca que ce lot vient avant le Director.

    0.35.2 lot 02 QUATRE GRANDEURS EXISTAIENT ET NE SORTAIENT NULLE PART.
                  LES DEGATS INFLIGES N ETAIENT PAS VENTILES. `p.hurtBy` ventilait
                  ce qu un joueur SUBIT par source, et il n existait rien de
                  symetrique pour ce qu il INFLIGE : `damageDealt` etait un total.
                  On ne savait donc pas quelle part venait de l arme, des
                  invocations, des zones posees, de la brulure ou du ricochet —
                  c est exactement ce qui manque pour equilibrer une arme sur une
                  VRAIE partie. `_damage()` prend une SOURCE, comme `_hurt()` en a
                  une, et la balle la porte jusqu a l impact comme elle porte deja
                  son drapeau d arme : au moment ou elle touche, plus personne ne
                  sait qui a tire. Releve sur une manche de banc : un joueur a
                  65,6 % de souffle et 33,6 % d arme la ou le total ne disait rien.
                  LA SOMME DOIT EGALER LE TOTAL, et `verifierVentilation()` le
                  rejoue sur trois manches completes : deux comptes de la meme
                  chose derivent au premier oubli, et separement ils restent tous
                  les deux plausibles.
                  `p.contrib` ETAIT CALCULE ET NE SORTAIT NULLE PART. Quatre
                  grandeurs — evites, proteges, detournes, permis — ecrites aux
                  points de passage et lues par le seul banc de bots. UN REMPART
                  QUI JOUE PARFAITEMENT AVAIT UN TABLEAU DE FIN VIDE : c est le
                  seul role du jeu dont la contribution etait invisible, et les
                  quatre nombres qui la disent existaient deja.
                  LA BUILD N ETAIT DATEE QUE DE LA FIN. On ne pouvait pas rattacher
                  un saut de DPS a une prise. Une ligne `carte` par prise, deduite
                  PAR COMPARAISON comme le reste — la simulation ne sait toujours
                  pas qu on l observe.
                  Le compte rendu montre les trois, et il n ecrit que ce qui pese :
                  cinq colonnes a zero ne sont pas une information.

    0.35.3 lot 03 LE SERVEUR TRACAIT UNE MANCHE DONT IL IGNORAIT LE RENDU. Le
                  releve client existait, il etait bon — dix secondes, zero
                  allocation par image, images/s medianes ET p99, duree p99 ET
                  maximum — et il allait dans le PRESSE-PAPIER. Il remonte
                  desormais, et PAR SEGMENT : « ca a rame au segment 5 » est la
                  question qu on se pose reellement, « la manche a fait 48
                  images/s en moyenne » ne l est pas. Les six fenetres se lisent
                  contre les six lignes de segment de la trace — population,
                  evenement, meteo, etat du boss.
                  QUATRE JOUEURS SONT QUATRE MACHINES, ET LA PLUS FAIBLE DECIDE DE
                  L EXPERIENCE. Le compte rendu donne les fenetres de CHACUN,
                  jamais une moyenne : une moyenne d images par seconde sur des
                  machines heterogenes ne veut rien dire. C est ce qui dira si
                  « ca rame » veut dire chez tout le monde ou sur une seule
                  machine, et c est ce qui rend le lot utile en LAN.
                  L INSTRUMENT TOURNE TOUJOURS, tracee ou non, et c est ce qui rend
                  le critere tenable : un instrument qui ne s allume que quand on
                  mesure CHANGE ce qu il mesure. Quatre ecritures de tableau par
                  image, sans allocation, meme plafond que le releve de banc.
                  UNE FENETRE PART DES QU ELLE EST FERMEE, pas a la fin de la
                  manche : un client qui se deconnecte au segment 4 laisse ses
                  trois premieres au lieu de tout perdre.
                  LE RESEAU AVEC : la salle echantillonnait deja la taille des
                  messages sous `PERF_ON` et c etait jete — la ligne de segment est
                  sa place.
                  DEUX DEFAUTS PAYES EN ECRIVANT. Un second `case "roundEnd"` dans
                  le meme `switch` aurait MASQUE le vrai : un `switch` ne previent
                  pas, il prend le premier. Et `subisPar` est un TABLEAU indexe par
                  `DAMAGE_SOURCES`, pas un objet nomme : le lire avec
                  `Object.entries` imprimait « 0 0 · 1 0 · 2 0 » — des indices et
                  des zeros. La fixture du verificateur mentait sur la forme, donc
                  elle validait un rendu que la vraie manche ne produit jamais.

    0.35.4 lot 05 LE COMPTE RENDU CHERCHE DE LUI-MEME. « Trois images au-dessus de
                  33 ms, toutes pendant une nova a 190 corps » est une
                  information ; un tableau de 1 800 durees d image n en est pas
                  une. C est la seule section qui LIT au lieu de presenter, et
                  c est pour elle que le plan existe : la trace serveur sait ce qui
                  se passait a la seconde pres, le releve client sait ce que la
                  machine rendait, et rien ne croisait les deux.
                  CINQ ANOMALIES, ET CHACUNE PORTE SON CONTEXTE. L image qui saute
                  avec la population, l evenement et la meteo de cet instant ; le
                  PLAFOND tenu, qui dit que le budget d apparition demande plus que
                  le moteur ne rend et que la difficulte cesse de monter ; le
                  joueur A TERRE longtemps, qui dit que personne n a pu venir —
                  `REVIVE_RADIUS` vaut 96 px, et sur une map plus grande ce sera
                  frequent ; l ARME MUETTE ; et la TENSION PLATE, qu on saura AVANT
                  que le Director existe. Plus la mecanique de boss jamais posee,
                  qui est un reglage mort.
                  UNE ANOMALIE NON DETECTEE EST UN DEFAUT ; UNE ANOMALIE DETECTEE
                  TROP SOUVENT EST UN BRUIT. Si une ligne sort dans TOUS les comptes
                  rendus, ce n est plus une anomalie — c est un reglage a corriger
                  ou un seuil a relever. Les huit seuils sont donc DECLARES dans une
                  table, jamais ecrits dans le code de detection.
                  LE CRITERE A DEUX MOITIES, et la premiere compte plus : une
                  manche saine ne produit RIEN (une section toujours pleine ne sera
                  plus lue), une manche fabriquee avec des defauts connus les fait
                  tous sortir. `verifierRapport()` rejoue les deux.
                  DEFAUT PAYE EN ECRIVANT : l instant precedent etait lu APRES que
                  le cumul de DPS l avait remplace, donc l ecart valait toujours
                  ZERO et toutes les anomalies de DUREE restaient muettes. Un defaut
                  qui ne se voit que sur une manche malade — c est-a-dire jamais,
                  sans le second critere.
                  Et les durees se comptent sur l ECART entre deux echantillons,
                  jamais sur leur NOMBRE : la trace est nominalement a 1 Hz, mais
                  une pause ou un ecran de cartes decalent l horloge.

   --- plan 33 : le mode custom ----------------------------------------------

    0.36.0 lot 01 DES RANGS, PAS DES CURSEURS. Le modele est le Pacte de Chatiment
                  de Hades, et il donne trois choses qu un curseur ne donne pas :
                  un INDICE DE SEVERITE qui existe sans etre calcule — la SOMME des
                  couts, plus honnete qu un produit de multiplicateurs parce qu un
                  cout ecrit a la main peut dire ce qu un produit ne sait pas dire ;
                  un ESPACE FINI ET COMPARABLE, ou deux joueurs se disent « j ai
                  fait 24 » ; et des PALIERS DEJA PENSES — un curseur invite a
                  mettre 87 % parce que c est possible, un rang oblige a decider ce
                  que veut dire chaque cran.
                  ONZE CONDITIONS SUR LES CINQ FAMILLES, severite maximale 40. La
                  table est DECLARATIVE et c est un critere : un rang ne porte que
                  des NOMBRES sous des noms fixes, jamais de logique. Ce qui les
                  applique ne connait pas les conditions une par une — sinon chaque
                  condition nouvelle demanderait du code, et la table cesserait d
                  etre une table.
                  LE COUT D UN RANG EST UN JUGEMENT, PAS UN CALCUL. Deux reperes :
                  un rang qui change peu coute peu mais JAMAIS ZERO — un rang
                  gratuit est toujours pris, donc il n est pas un choix ; et un rang
                  dont l effet depend fortement de la build coute CHER, parce qu il
                  sera pris par ceux a qui il ne coute rien. « Ruee » (vitesse de la
                  horde) coute 3 et 4 pour cette seule raison : une arme a cible
                  unique et longue portee y perd tout, une arme de zone au contact
                  presque rien.
                  L INDICE EST UNE APPROXIMATION, ET IL SE PRESENTE COMME TELLE. Le
                  wiki de Hades le dit lui-meme : beaucoup de conditions sont
                  presque sans effet contre une build et extremement dures contre
                  une autre. Avec dix armes et trois classes, c est double — et
                  c est ce qui rend le mode utile a l EQUILIBRAGE : un mutateur dont
                  la severite varie de trois a un selon l arme EST un resultat de
                  mesure.
                  LE SCRIPT EST UNE CONDITION COMME LES AUTRES, et c est la ligne
                  qui multiplie par trois l espace du mode : « courbe calme,
                  ennemis de cauchemar » n existe dans aucun des trois modes.
                  LE PLANCHER EST UN OU DEUX CRANS SOUS LA REFERENCE, PAS CINQ.
                  Calme est deja a hp 0,78 et spawn 0,80 : descendre franchement en
                  dessous ne produit plus une partie mais une demonstration.
                  `verifierConditions()` refuse un rang gratuit, un rang dont l
                  effet repete le precedent, un cout qui redescend, et surtout un
                  maximum global qui depasserait `MAX_ENEMIES_HARD_CAP` : ce n est
                  pas un reglage de difficulte, c est le point au-dela duquel le
                  rendu et le reseau lachent — et l echec y est SILENCIEUX.

    0.36.1 lot 02 LE MODE, BRANCHE — ET LA DIFFICULTE VOYAGE PAR LE CONSTRUCTEUR,
                  JAMAIS PAR LA TABLE. Ecrire dans `DIFFICULTIES[3]` aurait ete
                  exactement la panne que le plan 31 a corrigee pour le hasard :
                  seize salles d un processus se seraient partage un objet, et deux
                  customs simultanes se seraient mentis l un a l autre.
                  L INDEX 3 EST RESERVE ET NE SE REORDONNE JAMAIS : il circule dans
                  le message `round`, dans `clefRecord` et dans les profils.
                  L entree existe pour l index et les libelles ; la manche ne lit
                  jamais ses coefficients.
                  QUATRE GARDE-FOUS, CHACUN EXPLICITE. Pas de classement — une
                  course dont chacun ecrit les regles ne se compare a rien. Pas de
                  noyaux : `DIFF_MUL` a TROIS entrees et en garde trois, et son
                  `??` rendrait 1 pour l index 3, c est-a-dire le tarif de NORMAL —
                  mesure, 390 noyaux pour une manche dont le joueur a ecrit les
                  regles. « x2 loot, -50 % ennemis » serait alors la meilleure facon
                  de farmer la meta. Pas de hauts faits, meme raison. Et le plafond
                  MOTEUR reste : une borne qu on suppose inatteignable finit par
                  etre atteinte.
                  LE SUR MESURE NE SE VOTE PAS, IL SE CONFIGURE : un vote l aurait
                  choisi avec les reglages par defaut, donc une manche normale
                  privee de noyaux, de records et de hauts faits sans que personne
                  l ait voulu.
                  TROIS DEFAUTS TROUVES PAR LE CRITERE, ET AUCUN N AURAIT LEVE.
                  `custom(normal)` DOIT rendre `normal`, sinon la construction ment
                  et toute mesure faite avec ce mode est fausse — c est le meilleur
                  test du lot, et il a echoue trois fois. `TRAIT_BY_TYPE`,
                  `typesFor` et `enemySpeed` lisaient la TABLE au lieu de la
                  difficulte de la salle ; `buildBiome`, `weatherFor` et
                  `finalPour` sont indexes par MODE et lisaient un index 3 dont
                  leurs tables n ont pas d entree — le terrain lui-meme differait,
                  et le TEMPS divergeait. Le sur mesure herite donc de l index dont
                  il derive pour tout ce qui est indexe par mode.
                  ET LE CUSTOM N EST PAS UN MODE MESURABLE : huit boucles de
                  campagne bouclaient sur `DIFFICULTIES` et se seraient mises a
                  mesurer une quatrieme difficulte dont les coefficients
                  appartiennent au JOUEUR. Pire, `COMPO_MODES` disait « normal et
                  cauchemar » par `length - 1` : il aurait silencieusement dit
                  « normal et custom ».

    0.36.2 lot 03 PARTAGE ET PREREGLAGES. Les reglages s exportent en une chaine
                  courte, collable, lisible A VOIX HAUTE en LAN — un code deux fois
                  plus court mais indebogable serait un mauvais echange.
                  LE VRAI USAGE N EST PAS LE FUN, C EST LE PROTOCOLE D EXPERIENCE :
                  « voici le code, voici la graine, voici le compte rendu » devient
                  une phrase qui suffit a reproduire une mesure, chez un ami ou dans
                  une conversation avec un modele. C est le chainon qui manquait
                  entre le mode et l outillage du plan 32, et c est ce qui rend le
                  banc utilisable A PLUSIEURS.
                  LA CHAINE PORTE SA VERSION, ET CE N EST PAS DECORATIF. Un code
                  colle apres un changement de table DECALE SILENCIEUSEMENT les
                  rangs : la condition 4 rang 2 devient autre chose, et rien ne le
                  dit — une soiree de mesure fausse avant qu on comprenne. Le
                  collage REFUSE au lieu d appliquer a moitie : un choix partiel
                  serait pire que rien, il serait plausible.
                  LA VERSION EST CELLE DE LA TABLE, PAS CELLE DU DEPOT : un lot qui
                  ne touche pas aux conditions ne doit pas invalider les codes de la
                  veille. Elle se bouge A LA MAIN, et aucun verificateur ne peut le
                  deviner.
                  IL PORTE LES RANGS ET RIEN D AUTRE — ni la graine, ni le biome :
                  un reglage et une graine ne se partagent pas toujours ensemble.
                  QUATRE PREREGLAGES, ET ILS N EXISTENT PAS POUR JOUER : ils
                  ENSEIGNENT le mode. Une page de curseurs vierges n apprend rien.
                  Chacun doit etre JOUABLE — pas une demonstration de maximum — et
                  ils couvrent des FAMILLES DIFFERENTES : trois variantes de « plus
                  dur » n enseigneraient rien. `verifierPartage()` refuse d ailleurs
                  un jeu de prereglages qui tiendrait dans moins de trois familles.
                  `verifierPrereglages()` les JOUE, courts mais reels : un
                  prereglage qui bloque une manche ne leve rien — il rend une partie
                  qui n avance pas, et personne ne saura si c est le reglage ou le
                  jeu.

    0.36.3 lot 04 L INTERFACE DU SUR MESURE, ET DEUX INDICATEURS QUI NE DISENT PAS
                  LA MEME CHOSE. La SEVERITE annonce l intention — une somme de
                  couts ecrits a la main ; le PRODUIT annonce ce que la simulation
                  va reellement subir, parce que les coefficients se COMPOSENT et
                  que le produit explose bien avant que chaque facteur soit a son
                  maximum. Les deux ensemble evitent la surprise de la composition,
                  et le repere « x fois cauchemar » en dit plus a quelqu un qui
                  ouvre le mode qu un nombre absolu.
                  PAS D ONGLETS PAR FAMILLE : les onze conditions tiennent sur un
                  ecran, et voir deux d entre elles ensemble est ce qui donne envie
                  de les combiner. Pas d avertissement moralisateur non plus —
                  « attention, ce reglage est tres difficile » n apprend rien a qui
                  vient de tout pousser expres.
                  L HOTE POSE, TOUT LE MONDE VOIT. Le mode decide de ce que la
                  salle entiere va jouer ET de ce qu elle ne gagnera pas : ce n est
                  pas un reglage personnel. Un joueur qui rejoint voit les regles
                  AVANT de se dire pret, et le HUD porte la mention en manche —
                  elle disparait dans les trois modes normaux, parce qu un temoin
                  permanent qui ne dit rien cesse d etre lu.
                  UNE VIOLATION DE COUCHES PAYEE EN ECRIVANT : le HUD (couche 12)
                  doit afficher le reglage, et il ne peut pas lire l ecran de salon
                  (couche 14). L etat descend donc en COUCHE 0, comme `traceOn` —
                  le serveur restant sa seule source.

   --- plan 34 : les contrats -------------------------------------------------

    0.37.0 lot 04 LES SEPT SONS, ECRITS EN UNE FOIS — ET C EST TOUT LE LOT. Trois
                  servent dans ce plan (borne, interaction, contrat), quatre
                  serviront aux plans 35 et 37. Le depot a deja paye le defaut
                  inverse : « treize bonus rendaient la meme quinte montante »,
                  corriges en une seule fois par les trois matieres. Sept sons
                  ecrits par sept lots differents ne font pas une palette, ils font
                  un bruit, et il faut les refaire. Ils peuvent etre approximatifs
                  et changer plus tard ; ils ne peuvent pas etre ecrits a sept
                  moments differents.
                  LA RAREUR SE DIT EN HAUTEUR, JAMAIS EN GAIN — la regle de la
                  palette, et les seize expressions de gain des sept recettes sont
                  constantes : aucune ne depend d un rang. Le LOOT porte sa rarete
                  par la QUINTE DE RANG, mecanisme deja ecrit et deja mesure, sur
                  une QUATRIEME matiere — cristalline, la seule qui ne soit ni
                  organique, ni metallique, ni massive.
                  LE PING PORTE L IDENTITE DE CELUI QUI APPELLE : quatre joueurs,
                  quatre fondamentales, donc on entend QUI appelle avant de
                  regarder l ecran. C est gratuit et ca double la valeur du son.
                  Famille `annonce` — c est la famille qui COUPE, et il doit percer
                  deux cents corps.
                  LE REVEIL DU MINI-BOSS N EST PAS DE LA FAMILLE `annonce` : bas,
                  physique, sans resolution. Il ne doit surtout pas sonner comme un
                  boss — le boss a son bandeau et sa musique, le mini-boss n a que
                  ca.
                  ACCEPTER N EST PAS ACCOMPLIR : le contrat pris est un `recolteFin`
                  plus petit, le contrat fait resout SOUS sa triade la ou le haut
                  fait garde son accord OUVERT. L echec descend en dents de scie
                  sans resoudre, comme `aterre` mais plus court : ce n est pas une
                  mort, c est un renoncement.
                  L ENTREE DANS LE RAYON est le plus REPETE, donc le plus discret —
                  une note, tres courte, tres basse en gain. Il ne sonne qu a l
                  ENTREE : l appelant tient l etat, un son ne sait pas se taire
                  tout seul.
                  RESTE A ECOUTER : le ping a 200 corps avec un boss, et le
                  huitieme son — la borne reperee — que le « ! » rend peut-etre
                  inutile. Un son a chaque borne qui entre dans le champ
                  deviendrait un tic-tac.

    0.37.1 lot 01 LA BORNE : un objet du monde, TIRE DE LA GRAINE, avec lequel on
                  interagit. Deux manches de meme graine les posent aux memes
                  endroits — c est la moitie du protocole d experience du plan 33.
                  Ce qu elle PROPOSE, lui, se tirera a l activation : la borne est
                  dans la graine, son contenu ne l est pas.
                  ELLE NE DISPARAIT PAS. On part, on revient : c est un CHOIX
                  DIFFERE et non une occasion qui s evapore, ce qui supprime le
                  « il faut y aller maintenant » d un jeu dont le fond reste la
                  horde. CONSEQUENCE REGLEE ICI : si refuser ne coutait rien, on
                  relancerait le tirage jusqu a obtenir ce qu on veut — la recharge
                  est ce prix, refuser coute d ATTENDRE, pas de renoncer.
                  LE MARQUEUR EST AU-DESSUS, ET C EST LE SEUL CANAL LIBRE : les
                  anneaux au sol sont TOUS pris — relevement, aura du colosse,
                  egide, cercles de competence. Le canal au-dessus du corps avait
                  deja un precedent dans le depot, et « ! » / « ? » est une
                  convention que le joueur connait d ailleurs : il l apprend en une
                  seconde. Il flotte, il ne CLIGNOTE pas — un clignotement au-dessus
                  de deux cents corps devient du bruit.
                  CINQ APPARENCES, UN SEUL OBJET : le modele de `BLOC[biome][kind]`.
                  L apparence suit le THEME et jamais la variante, donc elle
                  restera compatible avec les variantes de biome du plan 37. De
                  loin, elle se remarque parce qu elle est EMISSIVE — la couleur
                  d identite du lieu saute aux yeux sur son propre sol, ce qui
                  dispense d un marqueur global.
                  LA TOUCHE EST GENERIQUE. `F` interagit avec ce qui est a portee,
                  pas « avec une borne » : une touche par systeme est ce qui rend
                  un jeu impossible a apprendre, et celle-ci ouvrira le ramassage
                  volontaire et l activation sans rien deplacer. `KeyF` est la meme
                  touche physique en AZERTY et en QWERTY, et `enSaisie()` garde
                  deja la porte.
                  TROIS DEFAUTS PAYES EN ECRIVANT, ET AUCUN N AURAIT LEVE. `bo` est
                  DEJA le boss dans l instantane et `bn` les bounds : une borne
                  sous l une des deux l aurait ECRASEE en silence — un instantane
                  est un objet, pas un schema. Et les bornes naissaient AVANT
                  `_nextId` : leurs identifiants valaient NaN, donc `null` sur le
                  reseau, donc quatre bornes que le client ne pouvait pas
                  distinguer.
                  ELLE EVITE LES DANGERS AUTANT QUE LES OBSTACLES : `_dropPoint`
                  pousse hors des boites et ne connait pas les nappes. Une borne
                  dans une flaque de fusion demanderait de traverser le feu pour
                  lire une proposition qu on peut refuser.

    0.37.2 lot 02 LES OBJECTIFS. Meme forme declarative qu `EVENTS`, mais une TABLE
                  SEPAREE, et c est un choix : un evenement remplace la COMPOSITION
                  du battement, un contrat ne touche a RIEN du budget de pression.
                  Les melanger ferait qu accepter un contrat changerait la horde, et
                  `verifierScript()` mesurerait alors deux choses a la fois.
                  QUATRE OBJECTIFS, ET AUCUN NE DEMANDE D INSTRUMENTER LA
                  SIMULATION : c est le critere de selection. Kills, elites, temps
                  tenu, position tenue — les compteurs existaient tous, sauf celui
                  des elites, qui est UNE LIGNE au point de passage unique de toute
                  mort. Un objectif qui aurait demande un compteur neuf serait
                  sorti de la table.
                  QUATRE RARETES QUI CHANGENT LA FORME, PAS QUE LA QUANTITE : plus
                  le joueur accepte de mettre la manche en danger, plus la
                  recompense change la FORME de sa run. Le `loot` est DECLARE et
                  pas encore verse — le plan 35 le branchera, et le declarer
                  maintenant evite d ecrire deux fois la table des recompenses.
                  UN SEUL CONTRAT ACTIF : le suivi reste lisible, et le jeu ne
                  devient pas une liste de taches.
                  LE CONTRAT SE TIRE A L ACTIVATION, PAS A LA GRAINE. Consequence
                  ASSUMEE ET ECRITE : deux manches de meme graine ont les memes
                  bornes aux memes endroits et des contrats DIFFERENTS. Les
                  occasions sont rejouables, leur contenu ne l est pas — a savoir
                  avant de promettre un challenge a graine imposee, qui comparerait
                  alors des parcours et non des tirages.
                  IL NE VERSE JAMAIS D XP, et la regle etait deja respectee : ce lot
                  la PRESERVE. L XP est le seul canal qui ne peut pas distinguer qui
                  a pris le risque — les eclats sont individuels, l objectif est d
                  equipe, et chacun touche la meme part ou qu il soit.
                  UN COMPTEUR DE TEMPS RECULE, IL NE SE REMET PAS A ZERO : une
                  progression perdue d un coup se lit comme un bug, pas comme un
                  cout.
                  `verifierObjectifs()` rejoue les seize couples objectif x rarete :
                  seuil atteint, contrat ferme, eclats verses a chacun, ZERO XP,
                  borne consommee — et l echec qui ne verse rien, ne casse pas le
                  battement, et rend la borne avec sa recharge. Defaut paye en
                  ecrivant : le test forcait le PROGRES la ou les objectifs de
                  kills le RECALCULENT depuis les compteurs, donc il echouait sur
                  un code juste. On deplace la reference, ce qui exerce le vrai
                  chemin.

    0.37.3 lot 03 LE SUIVI, A GAUCHE — ET C EST LE PREMIER ELEMENT PERSISTANT DU
                  HUD DE JEU. Tout ce qui informe aujourd hui est TRANSITOIRE : les
                  bandeaux s effacent, les popups passent, les pips sont des etats
                  et non des messages. Celui-ci reste tant que le contrat vit, donc
                  il ne rappelle que ce qui CHANGE — un encart fige pendant deux
                  minutes devient du decor. Il ne porte NI la recompense, qui etait
                  dans la proposition au moment d accepter, NI de fleche vers la
                  zone : le ping est un autre systeme, et un contrat n est pas une
                  destination imposee.
                  LA PLACE ETAIT LIBRE, ET C EST LA SEULE : `#hudRun` occupe le coin
                  haut-gauche et ne descend pas, `#hudTeam` tient la droite avec ses
                  190 px. Toute la hauteur gauche sous l horloge etait disponible.
                  LA PROPOSITION NE SUSPEND PAS LA SIMULATION, ET C EST LA DECISION
                  D ARCHITECTURE DU LOT. Les ecrans de carte et de marchand FIGENT
                  la manche ; celui-ci non — sinon activer une borne devient une
                  pause, et le joueur l utilisera comme telle sous la horde. La
                  tentation de reutiliser le mecanisme d ecran existant etait forte,
                  et il est le mauvais : la proposition est un element du HUD.
                  `verifierProposition()` le MESURE au lieu de l affirmer — le temps
                  avance, la horde meurt, aucun ecran ne s ouvre.
                  LA RARETE SE LIT SANS TEXTE, PAR LA FORME AVANT LA COULEUR : un
                  lisere qui s epaissit puis se dedouble. La charte interdit le
                  rouge pour ce vers quoi il faut aller, donc aucune rarete n y
                  touche.
                  LA MEME TOUCHE ACCEPTE : on active avec F, on accepte avec F —
                  deux touches pour deux moments du meme geste seraient une regle de
                  plus a apprendre. `G` refuse, parce que refuser doit couter un
                  geste DIFFERENT pour ne jamais se faire par inadvertance.
                  UN JOUEUR QUI REJOINT VOIT LE CONTRAT ACTIF : il voyage ENTIER et
                  SANS filtre de vue — c est le seul element de l instantane qui
                  doive rester lisible quand on est LOIN de ce qu il decrit, et
                  c est meme tout l interet d un suivi.
                  Defaut paye en ecrivant : le pilote de banc s ELOIGNE de la borne
                  entre deux ticks, donc le verificateur activait dans le vide. Le
                  test ramene le pilote pour l instant de l activation — et mesure
                  ensuite que la proposition SURVIT a son depart.

    0.37.4 regles  LES REGLES DES CONTRATS, ECRITES. Les trois lots precedents ont
                  livre le code et ses verificateurs ; ce qui explique un CHOIX de
                  conception appartient a `docs/regles/`, et il y manquait. Rien
                  d executable ne bouge.
                  Ce qui entre dans `SIMULATION.md` : la borne est dans la graine
                  et son contrat ne l est pas ; elle ne disparait pas, et la
                  recharge est le prix du refus ; la touche d interaction est
                  GENERIQUE ; un contrat n est pas un evenement et sa table est
                  separee, parce qu un evenement remplace la composition du
                  battement et qu un contrat ne touche a rien du budget de
                  pression ; aucun objectif n instrumente la simulation ; un
                  compteur de temps RECULE au lieu de se remettre a zero ; les
                  quatre raretes changent la FORME ; un contrat ne paie jamais en
                  XP ; et la proposition ne suspend pas la simulation.
                  Ce qui entre dans `RESEAU.md` : les deux registres neufs, et
                  surtout AVANT D AJOUTER UNE CLE A L INSTANTANE, RELEVER CELLES QUI
                  EXISTENT — `bo` est le boss, `bn` les bounds, et la borne a heurte
                  les deux coup sur coup. Un instantane est un OBJET, pas un
                  schema : une collision ecrase en silence.

   --- plan 35 : mini-boss, loot, statistiques ------------------------------

    0.38.0 lot 03 CHANCE, ESQUIVE, ARMURE — ET LE TROU QU ELLES COMBLENT EST
                  MESURE. Sur les 151 clefs de `defaultMods()`, 53 sont offensives
                  et 24 defensives, mais les SEPT AXES que la table d echelle des
                  armes sait lire sont TOUS offensifs. Consequence jamais ecrite :
                  IL N EXISTAIT AUCUN ARBITRAGE DEFENSIF — on empilait des PV et de
                  la reduction, sans jamais choisir.
                  TROIS AXES DE NATURES DIFFERENTES, ET C EST TOUT LEUR INTERET. L
                  ESQUIVE est binaire et variante la ou `damageTakenMul` est lisse
                  et multiplicatif : deux joueurs a +30 % de survie ne jouent pas
                  pareil selon lequel des deux ils ont pris. L ARMURE est
                  SOUSTRACTIVE donc ANTI-CORRELEE — mesure : elle retire 50 % d un
                  coup de 8 et 3 % d un coup de 120, ce qui specialise le Rempart
                  contre le CONTACT DE HORDE plutot que contre les mecaniques de
                  boss. La CHANCE agit sur la RARETE SEULE et jamais sur la
                  quantite : c est ce qui garde l axe lisible a haut niveau, la ou
                  le genre devient illisible en faisant les deux.
                  L ESQUIVE A UN PLAFOND DES LE PREMIER JOUR — 60 %, mesure a
                  59,7 % sur vingt mille tirages. Sans lui c est une IMMUNITE
                  STOCHASTIQUE, et en cooperation elle rend le Soigneur illisible :
                  on ne sait plus si un allie tient parce qu il est soigne ou parce
                  qu il a eu de la chance. Elle tire dans `this.alea`, donc deux
                  manches de meme graine esquivent aux memes instants, et elle se
                  branche sur `PLAYER_HIT_CD` — la fenetre d invulnerabilite
                  existait deja.
                  LA CARTE OUVRE L AXE, LE LOOT L AMPLIFIERA. Un axe qui n
                  existerait que dans le loot serait un axe qu on SUBIT : on ne peut
                  pas decider de « jouer esquive » si l esquive tombe au hasard. Un
                  axe qui n existerait que dans les cartes rendrait le loot
                  redondant. Trois cartes ouvrent les trois — et `CARDS` est
                  APPEND-ONLY, donc elles s ajoutent a la fin.
                  `powerIndex()` NE LIT PAS LA DEFENSE, ET C EST VERIFIE A L
                  IDENTIQUE : il remonte jusqu aux PV du boss, donc s il apprenait a
                  lire l armure, la calibration des six boss et `BOSS_POWER_REF`
                  bougeraient d un coup SANS QUE RIEN NE LEVE. C est `survieIndex()`
                  qui porte les trois axes, et il ne sert QU A la tension — sinon un
                  loot defensif serait invisible donc ENTIEREMENT GRATUIT, et avec
                  six loots par manche l optimum deviendrait « tout defensif » : ce
                  n est pas un choix, c est un tarif.
                  LA CHANCE ENTRE PAR LE POIDS DE RARETE, PAS PAR `quality` :
                  celle-ci est plafonnee par `RARITY_DRIFT_CAP` et deja saturee en
                  fin de manche, donc une chance qui s y ajouterait ne ferait plus
                  rien la ou elle compte le plus. Elle pese les raretes au-dessus de
                  la commune et laisse `count` intact — mesure : 38,1 % de cartes
                  non communes sans, 47,8 % avec les trois `Flair`. Le verificateur
                  mesure LES DEUX, la part ET le compte : une clef de chargement que
                  personne ne lit ne leve rien, elle rend `undefined` donc `NaN`
                  donc RIEN, et la carte promettrait une rarete qu elle ne donne pas.
                  LES DEUX VERIFICATEURS LENTS ETAIENT DEJA ROUGES AVANT LE LOT,
                  et c est MESURE contre l arbre a HEAD : `equilibreArmes` rend les
                  quatre memes ecarts (dispersion 82 %, railgun 116 %, grenade 90 %,
                  siege 93 %) et `progression` six defauts avant comme apres. Leur
                  COMPOSITION bouge parce que trois cartes entrent dans un pool de
                  181, donc les manches simulees divergent des le premier tirage —
                  pas parce que la defense y touche. Le lot 04 de ce plan est celui
                  qui recalibre, et il est imperativement DERNIER.
                  L ORDRE DE LA CHAINE DE CALCUL entre dans `CONTENU.md` : il
                  existait depuis toujours et n etait nulle part. Le loot s inserera
                  APRES les reliques et AVANT le plafond de PV.

    0.38.1 lot 01 LE MINI-BOSS — UN ENNEMI, PAS UN `this.boss`. Il joue sur la map
                  normale, donc il n a ni arene, ni barres, ni pause, ni CERCLE AU
                  SOL : ce canal appartient au boss et ne se partage pas, sans quoi
                  une arene a 200 corps n a plus de sol lisible. Il ne lui reste que
                  la POSTURE, et c est ce qui a decide de son verbe.
                  LE BELIER CHARGE SANS CORRIGER SA COURSE. Le cap se verrouille au
                  DEBUT du preavis, comme l angle du tireur : fige a la fin, il
                  suivrait la cible une demi-seconde, et une attaque qui suit sa
                  cible jusqu a la detente n est pas une attaque. Esquiver l envoie
                  dans un obstacle, et l encastrement OUVRE UNE FENETRE — immobile
                  et Vulnerable, l etat existait deja avec ses pointes et ses
                  +25 %. C est la seule punition d esquive du bestiaire. Mesure :
                  89 encastrements pour 268 charges, un tiers, avec un pilote qui
                  ne les cherche pas.
                  SON PREAVIS SE COMPTE MAIS NE SE REFUSE JAMAIS. `_windupSature`
                  est une regle de lisibilite d ecran ; un mini-boss a qui l on
                  refuserait son creneau ne chargerait pas du tout, et son unique
                  verbe disparaitrait derriere huit fantassins.
                  RETIRER N EST PAS TUER, ET LE VERIFICATEUR LE MESURE. Trois des
                  quatre sorties du cycle ne doivent RIEN laisser : `_killEnemy`
                  porte l XP, le kill compte, les hauts faits et le butin, et un
                  retrait qui y passerait paierait quatre fois sans qu une ligne le
                  dise. Abattu paie en ECLATS et jamais en XP — `e.xpWorth = 0` le
                  coupe a la source, et `TL_CFG.QUARRY_XP_WORTH` s est CONVERTI la,
                  il ne s y est pas ajoute.
                  `EV_CHASSE` EST REDEFINI, PAS RETIRE : son index circule. Sa proie
                  etait un mini-boss qui ne disait pas son nom ; ce qui reste est ce
                  que l evenement a toujours voulu dire, une ELITE DESIGNEE dans la
                  horde. Les quatre constantes `QUARRY_*` disparaissent avec elle.
                  TROIS DEFAUTS SILENCIEUX PAYES EN ECRIVANT, ET AUCUN NE LEVAIT.
                  1) `hordeTime` est une horloge DE SEGMENT, pas de manche : compares
                  a elle, les deux derniers mini-boss n apparaissaient JAMAIS —
                  « zero rencontre sur six manches ». Les instants cumules se lisent
                  sur `hordeMinutes()`. 2) Les quatre compteurs de charge n etaient
                  pas initialises : `e.chgCd -= dt` vaut `NaN`, donc `NaN <= 0` est
                  faux, donc LA CHARGE NE PARTAIT JAMAIS — zero charge sur
                  trente-six secondes de combat. 3) A `PREMIER = 260` le premier
                  mini-boss naissait quarante secondes avant le boss du premier
                  segment et se faisait balayer : trois occasions sur trois perdues.
                  Les trois fenetres tiennent maintenant chacune dans un segment.
                  DEUX ANNONCES TOMBAIENT DEJA DANS LE VIDE, ET LA SECONDE EST CELLE
                  DU PLAN 34. `applyAlert` resolvait `def` dans les trois tables du
                  serveur puis sortait sur `!def` : le contrat rempli (`msg.contrat`,
                  livre au lot 34/02) et la menace rendaient `null`, donc `return`,
                  donc RIEN. Pas une erreur, pas un journal — une annonce muette.
                  `verifierSilhouettes` ETAIT ECRIT, EXPORTE, ET APPELE PAR PERSONNE.
                  C est le defaut que `verif.js` existe pour fermer, et le seul qui
                  garde les corps distinguables quand on en ajoute un quatorzieme.
                  Il ne demandait qu a resoudre les specificateurs ABSOLUS du client
                  — `sprites.js` ne touche au DOM qu au four, pas a l import. Le
                  belier passe par l AVANCE (0,125 contre 0,038 au mieux ailleurs) :
                  toute sa masse est devant, et c est le seul axe sur lequel une
                  quatorzieme variation de silhouette pouvait encore separer.
                  TROIS TABLES MANQUAIENT A `constantes_check` — `ATK_CFG`,
                  `BORNE_CFG` et `MINI_CFG`, ajoutees par des lots successifs sans
                  que personne les inscrive. Meme defaut, meme forme : l ABSENCE
                  d appel.
                  ECHELLE : les PV d une elite ne dependent que du TEMPS, ceux d un
                  boss portent `crowd^1,15` — « entre les deux » est donc deux
                  positions differentes selon l effectif. `CROWD_EXP = 0,6` tient
                  dans les deux cas. Temps d abattage median mesure : 24/11/13/12 s
                  en calme, 42/27/16 s en normal, 86/65/39/24 s en cauchemar, MEDIANE
                  GLOBALE 18 s sur 50 abattages. Il BAISSE avec l effectif, et c est
                  la consequence assumee de l exposant : le lot 04 du plan est celui
                  qui recalibre.

    0.38.2 lot 02 LE LOOT TOMBE AU SOL, ET IL FAUT PASSER DESSUS. C est la seule
                  source de puissance de manche qui coute un DEPLACEMENT : la
                  carte s offre a chaque niveau et FIGE la manche, la relique
                  s achete, l arme se porte. `shared/loot.js` : trois rangs,
                  seize objets, tirage, application.
                  IL IGNORE `pickupRadius` ET `pickupRadiusMul`, ET C EST TOUT LE
                  LOT. Un bonus se ramasse de loin, un loot de PRES : passer sur
                  un point precis pendant qu une horde arrive est une prise de
                  risque, donc une decision. L asymetrie se DIT dans trois
                  canaux — socle de 9 px contre 13, losange au lieu d un polygone
                  de famille, et un anneau tirete pose EXACTEMENT a la portee de
                  ramassage : le joueur voit ou poser ses pieds. Contrepartie
                  notee pour l equilibrage : `pickupRadius` perd de la valeur
                  sans qu on l ait touchee.
                  INSTANCIE PAR JOUEUR, DONC QUATRE PROBLEMES DISPARAISSENT D UN
                  COUP : conflit, vol, joueur prioritaire, arbitrage permanent.
                  Un loot partage a negocier ARRETE le jeu au moment ou deux
                  cents corps arrivent. Il reste REPOSABLE — `pj` a zero veut dire
                  « a qui le veut » — donc « le DPS prend les degats, le Tank la
                  defense » est vrai sans couter un ecran. Le poseur ne le reprend
                  pas pendant 4 s : il se tient dessus, sinon reposer et reprendre
                  seraient la meme image.
                  TROIS RANGS, ET LE VERIFICATEUR TIENT LEUR SENS. Rang 1 plat et
                  cumulable, rang 2 CONVERSION avec contrepartie — `verifierLoot`
                  REFUSE un rang 2 sans cout, sinon « dangereux » ne veut plus
                  rien dire —, rang 3 fort dont la rarete EST le prix. La CHANCE
                  du lot 03 monte le RANG et jamais la quantite : la promesse
                  « elle agit sur la rarete seule » se tient ici.
                  DEUX SOURCES. Le mini-boss lache du rang 2 en deux exemplaires,
                  sur sa depouille ; le contrat verse ce que `RARETES[].loot`
                  DECLARAIT DEPUIS LE LOT 34/02 SANS QUE PERSONNE NE LE LISE — un
                  champ dont la seule lecture est morte ne leve rien. Le point de
                  chute est celui de l OBJECTIF, donc le loot tombe forcement dans
                  la vue de qui vient de le meriter : le verificateur le confirme
                  aux quatre coins de l arene au lieu de l esperer.
                  `p.powerMods` ET `p.mods` ETAIENT LE MEME OBJET, et c est le
                  defaut que ce lot a paye. Sans meta, `fullMods` rend un seul
                  objet pour les deux : tout ce qui ecrit dans `p.mods` apres coup
                  ecrivait donc dans l INDICE DE PUISSANCE. Les reliques passent a
                  cote par `_relicSum` et ne l ont jamais montre ; le loot applique
                  ses `apply` directement, et `powerIndex` passait de 1,050 a
                  1,134 sur UN objet et 1,487 sur deux. Rien ne levait — c est la
                  calibration des six boss qui aurait derive.
                  LE PLAFOND AU SOL NE REFUSE JAMAIS : a la limite on retire le
                  PLUS VIEUX. Un loot qui n apparait pas parce que le sol est
                  plein est un loot vole, et il serait vole exactement quand on
                  vient d en gagner beaucoup. La CENDRE ne raccourcit pas sa vie,
                  alors qu elle raccourcit celle d un bonus : personne ne ferait
                  le lien.
                  LE PILOTE DE MESURE APPREND A LE RAMASSER, et c etait
                  indispensable : sans ca la premiere mesure rendait « zero loot
                  ramasse sur quarante minutes » — le systeme etait simplement
                  INVISIBLE au banc. Mesure apres : 3 groupes poses et 2 ramasses
                  en solo, 6 et 3 a deux, 9 et 2 a trois.

    0.38.3 lot 04 L EQUILIBRAGE — ET LE LOT A D ABORD DU MESURER SES PROPRES
                  INSTRUMENTS, QUI NE MESURAIENT PAS CE QU ILS ANNONCAIENT.
                  `verifierEquilibreArmes`, REJOUE A 3, 6 ET 12 MANCHES SUR LE MEME
                  CODE, rend cinq armes rouges, puis sept, puis cinq. Trois seules
                  tiennent aux trois tailles — laser, lame, dispersion — et elles
                  sont toutes au-dela de 9 points d ecart ; toutes les
                  entrantes-sortantes sont a 5-9 points, c est-a-dire a portee de
                  `TOLERANCE_V = 0,05` plus la dispersion du banc. CONTRE-EPREUVE
                  DECISIVE : retirer les trois cartes du lot 0.38.0 du pool ne
                  change RIEN au verdict — memes cinq armes, memes pourcentages.
                  Ce n est donc pas le contenu du plan qui a bouge la liste, c est
                  l ECHANTILLON.
                  LA TOLERANCE DIT CE QU ON ACCEPTE, LA RESOLUTION CE QUE
                  L INSTRUMENT DISTINGUE. `RESOLUTION_V = 0,10` et le contrat
                  `{ err, note }` — qui existait deja pour `verifierBoss` — separent
                  ce qui est rouge de ce qu on n a pas pu mesurer.
                  `BOSS_POWER_REF = 2,89` NE BOUGE PAS, ET C EST UNE DECISION
                  MESUREE. `mesurePuissanceBoss` rend 1,58 sur 52 releves, p10 0,93,
                  p90 4,08, etendue 0,89 - 6,23, et ses medianes par tiers valent
                  2,45 / 1,71 / 1,50 : l estimateur ne converge pas, il derive avec
                  la famille de graines. A quatre manches, retirer trois cartes sur
                  181 fait passer le releve de 2,60 a 5,30. Recalibrer la constante
                  qui gouverne les PV des six boss sur ce releve serait deplacer le
                  jeu sur du BRUIT. L ancienne valeur reste, et la raison est
                  ecrite dans `LISEZMOI.md` et `CONTENU.md`.
                  LE BANC DE `mesureTTK` NE RAMASSE RIEN, donc la puissance qu il
                  mesure est celle d un jeu SANS loot — meme maintenant que le loot
                  existe. C est `pilotage()` qui ramasse : a quatre joueurs, 3,204
                  avant le plan 35 et 3,587 apres, pour 22 loots sur trois manches,
                  soit +12 %. C est la seule mesure honnete de ce que le loot
                  ajoute, et elle est bien plus petite que la peremption annoncee.
                  TROIS ARMES CORRIGEES, ET CHACUNE PAR UN LEVIER DIFFERENT.
                  Le LASER a demande deux passes : le multiplicateur releve donnait
                  69, a 69 il rendait 95 %. -8 % de degats coutent -20 % de debit
                  horde — un faisceau qui tue moins vite garde ses cibles devant lui
                  plus longtemps, donc sa reponse N EST PAS LINEAIRE. 75 -> 72,
                  interpolation des deux points mesures, ecart +0,092 -> -0,035.
                  La LAME ne pouvait PAS etre corrigee par les degats, et c est le
                  garde-fou du dps nominal qui l a dit : son debit sur CIBLE UNIQUE
                  etait deja au plancher (51 % au banc, 53 % au modele, plancher a
                  60 %). Le RAYON ne touche que la horde : 0,25 -> 0,227, l aire
                  x0,824, ecart +0,135 -> +0,051.
                  La DISPERSION etait a 31 points sous sa cible, trois fois l ecart
                  de n importe quelle autre arme et le seul chiffre identique aux
                  trois tailles d echantillon. 6,2 -> 8,75, ecart -0,308 -> -0,050.
                  UN GARDE-FOU ANALYTIQUE PEUT ETRE FAUX, ET IL L ETAIT DEPUIS
                  TOUJOURS. Le plancher/plafond de dps nominal lisait la dispersion
                  a 219 % de la reference sur cible unique quand le banc en mesure
                  110 % : `dpsBase` compte `degats x plombs` et `conversionBoss`
                  rendait 1, avec un commentaire affirmant que « la gerbe couvre un
                  boss a la scission sans depasser ». Un plomb sur deux porte,
                  `DISP_GERBE = 0,50`. Le modele ne s est trahi qu au moment ou l on
                  a touche la ligne.
                  RESULTAT : `verifierEquilibreArmes` rend ZERO ROUGE a 3 comme a 12
                  manches. `verifierProgression` passe de six defauts a trois. Le
                  temps d abattage du mini-boss est remesure apres coup — mediane
                  globale 16 s sur 52 abattages contre 18 avant, etendue resserree
                  de 5-205 s a 5-114 s.
                  LE TARIF DU LOOT DEFENSIF PASSE PAR LA RARETE (`POIDS_DEF = 0,7`),
                  pas par la valeur : elle laisse au loot defensif sa valeur de
                  TROUVAILLE quand il tombe, au lieu d en faire une version tiede de
                  l offensif. La magnitude est PROVISOIRE et c est ecrit — aucun bot
                  ne sait exprimer l optimum « tout defensif », donc seul le compte
                  rendu de vraies manches peut la regler.

   --- plan 36 : le Director -----------------------------------------------

    0.39.0 lot 01 LA LISTE FERMEE DU DIRECTOR, ET SON VERIFICATEUR — ECRITS AVANT
                  LE DIRECTOR. L ordre n est pas cosmetique : un Director ecrit
                  d abord derive en SILENCE, parce qu il n existe aucun moment ou
                  quelqu un compare ce qu il fait a ce qu il a le droit de faire,
                  et une decision de trop ressemble a un reglage.
                  QUATRE LEVIERS — composition, geometrie, elite, evenement — et
                  RIEN D AUTRE. Le `rate` est le BUDGET, et `verifierScript()` en
                  tient les sommes ; les PV, la vitesse et les degats sont les
                  leviers de la DIFFICULTE, et les melanger rendrait un mode
                  illisible ; la respiration est ecrite dans le script, et un
                  Director qui pourrait OTER de la pression pourrait rendre une
                  manche plus facile que ce qui est ecrit ; le plafond de
                  population est une limite de MOTEUR.
                  `validerDecision` NE RELIT PAS UNE LISTE D INTERDITS, ELLE
                  COMPARE le battement avant et apres, champ par champ. Une liste
                  d interdits se contourne en ajoutant un champ au script ; une
                  comparaison protege les champs futurs sans que personne y pense.
                  Le croisement va dans les DEUX SENS, et il a deja servi :
                  `rateMul` figurait parmi les proteges alors qu il appartient aux
                  EVENEMENTS et qu aucun battement ne le porte — proteger un champ
                  qui n existe pas donne l illusion d une couverture.
                  LE COUT D UN CORPS EST L INVERSE DE SON ABONDANCE, DONC IL N Y A
                  RIEN A ECRIRE. `share` dit quelle part du plafond un type a le
                  droit d occuper : fantassin 1,00, colosse 4,55, choeur 12,50. Une
                  colonne de cout a cote de `share` serait un SECOND systeme
                  d equilibrage a tenir d accord avec le premier.
                  LA COUTURE EST NEUTRE, ET C EST CE QUI PROTEGE LES DEUX CRITERES.
                  `DECISION_NEUTRE` rend le battement A L IDENTIQUE — pas une
                  copie, le MEME OBJET — donc `verifierScript` et
                  `verifierPopulation` restent des verdicts sur le SCRIPT pendant
                  qu on construit ce qui va le plier. `_beat()` est le point de
                  passage unique : un second accesseur « dirige » aurait laisse une
                  moitie du jeu lire le script brut, et la moitie oubliee ne se
                  serait vue nulle part. La decision se prend AU BATTEMENT et pas
                  dans `_beat()`, qui est appele plusieurs fois par image.
                  `verifierDirector` REJOUE CENT BATTEMENTS et relit le journal :
                  aucune decision hors des quatre leviers, et deux manches de meme
                  graine decident PAREIL — sinon tout ce que le plan 31 a construit
                  ne sert a rien.
                  RELEVE AU PASSAGE, ET IL N EST PAS DE CE LOT :
                  `verifierPopulation(45, [1,2,4], 16)` etait DEJA rouge avant le
                  plan 35 — treize problemes contre dix-sept aujourd hui, meme
                  famille de plainte. Et son message se contredisait :
                  « population en baisse (41 -> 41) », arrondi a l entier sur une
                  baisse de deux dixiemes de corps. Le libelle est corrige ici ; le
                  SEUIL en dessous duquel une baisse est du bruit est le meme
                  defaut que `verifierEquilibreArmes` avant 0.38.3, et il appartient
                  a un lot d equilibrage.

    0.39.1 lot 02 ENNUI, NORMAL, SURCHARGE — ET UN JUGEMENT MORAL AU MILIEU.
                  UNE EQUIPE EN DIFFICULTE EST UN ACCIDENT, UN JOUEUR QUI S ISOLE
                  EST UNE DECISION. Le Director soulage le premier et pas le
                  second. Sans cette regle, tout le lot 04 du plan 31 est annule :
                  le joueur isole a une tension elevee, le Director la lit comme
                  une surcharge, et il ADOUCIT la composition — exactement
                  l inverse de l effet voulu. Aucune contradiction avec « ne jamais
                  punir un joueur qui joue bien » : on ne lui ajoute rien, on
                  s abstient de lui RETIRER ce qu il a choisi d affronter. Le cas
                  limite est tranche par l EFFECTIF VIVANT et pas par celui du
                  groupe — un joueur seul parce que les trois autres sont morts n a
                  rien choisi.
                  DEUX AGREGATS ET PAS UN, ecart assume avec Left 4 Dead et fonde
                  sur une mesure de ce jeu : a 3 600 px de separation, un joueur
                  voit 137 corps pendant que l autre en voit 36. `tensionMax` dit
                  « trop haut », `tensionMoy` dit « trop bas », jamais les deux en
                  meme temps, et la surcharge passe devant.
                  LA RESPIRATION SE DEDUIT, ELLE NE SE DECLARE PAS : un battement
                  dont le taux RETOMBE par rapport au precedent en est une — seg 2
                  passe de 1,6 a 1,2, seg 5 de 3,8 a 2,7. Une colonne serait une
                  seconde source de verite a tenir d accord avec les taux. Le
                  Director s efface devant, quel que soit l etat que la tension
                  appellerait : un rythme sans creux n est plus un rythme.
                  L ENNUI EPUISE LA FORME AVANT LA QUANTITE — composition plus dure,
                  une elite de plus, geometrie d un cran plus exigeante, et un
                  evenement seulement apres 200 s sans. C est ce qui garantit qu une
                  equipe forte recoit une manche plus INTERESSANTE et non plus
                  LONGUE. `rate` n est pas dans la liste, et `verifierEtatsDirector`
                  le mesure sur les deux etats et sur les cinq geometries.
                  IL NE SE VOIT PAS : aucune annonce, aucun retour visuel, aucune
                  clef de reseau. L etat vit a cote de la decision et jamais dedans
                  — `validerDecision` refuse tout ce qui n est pas un des quatre
                  leviers, et c est exactement ce qu on lui demande.
                  MESURE, ET ELLE DIT QUE LE SYSTEME N EST PAS DECORATIF : sur
                  quatre cas et 140 battements, l etat neutre couvre 26/39 en calme
                  solo et 31/36 en cauchemar a deux. L ENNUI DISPARAIT QUAND LA
                  TENSION MONTE — 10 battements sur 39 a tension moyenne 0,120
                  contre 1 sur 36 a 0,264 — ce qui est la direction attendue.
                  LES SEUILS NE SONT PAS CALIBRES, ET C EST ECRIT. `ENNUI_T = 75 s`
                  et `SURCHARGE = 0,82` sont des defauts RAISONNES : le lot 03 les
                  regle sur les courbes accumulees en VRAIES parties, et aucun bot
                  ne remplace ca.

    0.39.2 fix    UN SEUIL POUR UNE GRANDEUR, ET LE SIEN EXISTAIT DEJA.
                  `TENSION_CFG.SEUIL_HAUT = 0,7` est ecrit depuis le plan 32 et
                  N AVAIT AUCUN LECTEUR ; le Director du lot precedent en a recree
                  un a cote, `DIR_CFG.SURCHARGE = 0,82`, sans savoir que l autre
                  attendait. Deux tables pour une meme grandeur divergent au
                  premier reglage — et « seuil bas, seuil haut » sont deux des SIX
                  reglages que le lot 03 calibre, donc ils appartiennent a la table
                  de la MESURE et pas a celle de la politique. Le doublon
                  disparait, le seuil du Director tombe de 0,82 a 0,70.
                  `TENSION_CFG` ENTRE DANS `constantes_check` — elle n y etait pas,
                  donc sa constante morte n aurait rien leve. Il a fallu l EXPORTER
                  pour ca : une table locale est invisible au balayage.
                  LA SENSIBILITE DES SIX REGLAGES, MESUREE. Chaque poids double,
                  tout le reste identique : `A` rend +30,8 % sur `tensionMoy`,
                  `DECAY` -46,1 %, `B` +1,8 %, `DENSITE_REF` -1,5 %, `C` 0,0 %.
                  DEUX POIDS PORTENT LA COURBE et `DECAY` plus que tout le reste.
                  `C` A 0,0 % N EST PAS UN POIDS MORT : le banc releve les joueurs
                  a chaque tick pour que toutes les mesures voient la meme horde,
                  donc un poids qui ne s applique qu a terre ne peut pas s exprimer.
                  Lire ce zero comme « a supprimer » serait exactement le piege que
                  ce releve existe pour eviter.
                  ET LA COURBE EST PLATE : 73 % des releves sous le seuil bas, p20 a
                  0,000. Le rythme attendu — pression, pic, resolution, respiration
                  — n est pas celui qu on observe. Ce sont donc les POIDS qu il faut
                  corriger avant les seuils, et cette correction se lit sur des
                  manches REELLES : c est la barriere B6, la seule du corpus qui
                  demande du temps et non un ordre.

   --- plan 37 : la map ------------------------------------------------------

    0.40.0 lot 01 QUATRE VARIANTES PAR THEME, VINGT LOIS D IMPLANTATION. Le
                  generateur pavait deja l arene en cellules et rejouait LA MEME
                  table sous quatre orientations miroir ; une variante est donc
                  une dimension de tableau, et le reste ne bouge pas. LA VARIANTE
                  0 EST LA LOI HISTORIQUE DU LIEU, a l identique : c est elle que
                  toutes les mesures des plans precedents ont vue.
                  LES BORDS SE DECLARENT, L ASSEMBLEUR NE DEVINE PAS. C est un
                  probleme de WANG TILES : chaque variante dit l etat de ses
                  quatre bords, et l assembleur ne pose que des voisines
                  compatibles. Douze aretes internes sur un 3 x 3, chaque cellule
                  ne regarde que ses DEUX voisins deja poses — l ordre de parcours
                  suffit, aucun solveur. `bordsDe` SUIT LE MIROIR : une variante
                  retournee echange est et ouest, et comparer les bords ecrits a
                  ceux du voisin retourne accorderait deux aretes qui ne se
                  touchent pas.
                  LE PLANCHER SE LIT SUR SIX AXES, LE PLAFOND SUR QUATRE, ET
                  L ASYMETRIE EST LE GARDE-FOU. Le plafond repond « est-ce encore
                  le meme lieu ? », donc il n emploie que les axes dont
                  `verifierLois` se sert pour separer deux LIEUX ; le plancher
                  repond « est-ce encore la meme variante ? », et deux
                  arrangements opposes a inventaire EGAL sont deux variantes —
                  d ou `centrage` et `etalement`, que la signature de lieu n a pas.
                  Sans cette separation, « le degagement » et « l atelier »
                  etaient interdits par leur propre plafond.
                  TRENTE PAIRES MESUREES, TRENTE ENTRE LE PLANCHER (15 %) ET LE
                  PLAFOND (`LOI_ECART`, 40 %).
                  ET C EST LA MESURE ELARGIE QUI A TROUVE LE SEUL VRAI DEFAUT.
                  Avec un tirage PAR CELLULE, trois graines ne couvrent plus rien :
                  la suite passe a CINQUANTE, et elle a rendu treize rouges d un
                  coup — deux travees de la Nebuleuse fermaient le carre central en
                  cauchemar UNE GRAINE SUR QUATRE. Le lieu n avait pas change, la
                  mesure si. Une seule travee, et le defaut disparait.
                  `verifierNavigation` NE TOURNAIT QUE SUR LA GRAINE 7. Le nouveau
                  poste « passages » le rejoue sur cinq lieux, trois modes et huit
                  graines — 750 arenes construites a la taille reelle, zero faute.
                  C est la mesure de largeur de passage que le plan demandait « sur
                  toute la region, pas seulement au centre ».
                  SOIXANTE-DOUZE PUIS VINGT-NEUF ENTREES DEPLACEES par un solveur
                  jetable : un obstacle pose sur un danger le rend invisible, et la
                  FRICHE secoue les siens de 40 px a la construction — la marge doit
                  couvrir la gigue, sinon l entree est libre sur la table et fautive
                  une graine sur trois.
                  UN THEME A UNE SEULE VARIANTE NE TIRE RIEN : consommer un
                  `rand()` pour un choix qui n existe pas deplacerait toutes les
                  arenes deja mesurees. C est ce qui a permis de livrer la
                  restructuration AVANT les tables, a comportement identique.

    0.40.1 lot 02 9600 x 5400 — QUATRE REGIONS, ET LE CRITERE DU LOT EST UNE
                  NON-MESURE. Le plan 31 avait retire les deux couts de surface ;
                  ce lot verifie qu il avait raison, et il avait raison la ou ca
                  compte : LA FENETRE DE DIFFUSION NE BOUGE PAS D UNE CASE —
                  3 025 avant, 3 025 apres — parce qu elle est ancree sur la boite
                  d apparition et pas sur l arene.
                  `_grille` DOUBLE, ET CE N EST PAS UN COUT DE SURFACE : elle est
                  batie sur la BOITE OCCUPEE, donc elle suit l ecartement des
                  joueurs, et une arene quatre fois plus grande leur permet de s
                  ecarter deux fois plus. 816 -> 1 540 cases en solo, 1 900 ->
                  4 002 a quatre, soit 15,5 us sur une image de 16 600 : 0,09 %.
                  Le terme `ARENA_W x ARENA_H` a bien disparu ; ce qui reste est
                  une consequence de gameplay.
                  CE QUI MONTE VRAIMENT EST LA POPULATION. A plusieurs, la moyenne
                  DOUBLE — 75 -> 115 en normal a quatre, 52 -> 96 en cauchemar —
                  parce qu un corps met plus longtemps a traverser, donc reste plus
                  longtemps EN TRANSIT, donc vit plus longtemps a taux egal. En
                  solo c est l inverse : le joueur s eloigne et `_recyclerLoin`
                  ramasse (174 -> 56 de pic). 637 us de `step` sur 16 600 restent
                  a 3,8 %, et si ca mord un jour le levier est `RECYCLE_DIST`.
                  LA DENSITE D INTERET : LA MEDIANE NE BOUGE JAMAIS, LA QUEUE
                  DOUBLE. 1,0 s d ecart median des deux cotes, mais le plus long
                  trou passe de 44-55 s a 76-103 s et les trous de plus de 30 s
                  TRIPLENT. C est la queue qui se joue.
                  ET LE LEVIER PRESCRIT NE REPOND PAS. Passer de 4 a 7 bornes n
                  ameliore rien — il degrade deux cases sur trois — parce que
                  `pilotage()` NE VA PAS AUX BORNES : il ne cherche que le loot et
                  les bonus. Ce banc mesure l errance du bot, pas la densite
                  d interet d un joueur, et un joueur qui VOIT une borne y va. Le
                  passage a sept bornes et cinq mini-boss reste, mais sa
                  justification est ARITHMETIQUE — a nombre egal la densite
                  spatiale est divisee par quatre — et elle est ecrite comme telle.
                  LE BANC DE SEPARATION ETAIT DEJA HORS DE SA BORNE, ET
                  L AGRANDISSEMENT LE REPARE : rapport 4,04 a 4800, 1,68 a 9600.
                  La cause est que 3 600 px font 75 % de la largeur de l ancienne
                  arene — les deux joueurs se retrouvent a 600 px d un bord, les
                  boites d apparition sont ecretees, et le traitement cesse d etre
                  symetrique. Aucune des deux tailles n atteint 1,4.
                  LE BOSS ETAIT DEJA CONFINE, et la question ouverte du plan etait
                  deja tranchee dans le code : `this.bounds` lui donne une boite de
                  la taille d une VUE centree sur l EQUIPE, donc pas de deplacement
                  force et pas de region tiree. `verifierMecaniques` rend 3 defauts
                  a 9600 contre 4 a 4800, meme famille. `verifierPopulation` rend
                  13 contre 13 avant le plan 35.

    0.40.2 lot 03 LE PING, ET IL NE DESSINE RIEN DE NEUF. Le chevron de l emetteur
                  clignote, avec un son. Le plan 31 lot 05 avait retire le doublon
                  de chevron, le plan 34 lot 04 avait compose le son AVEC les six
                  autres : il ne restait que le message et la classe.
                  DEUX CAUSES DE PULSATION SUR LE MEME CHEVRON, ET ELLES NE SE
                  CONFONDENT PAS. « A terre » pulse en 900 ms et grossit de 12 % ;
                  l appel pulse en 380 ms et grossit de 35 %. Un appel volontaire
                  est un EVENEMENT, une chute est un ETAT. La couleur ne bouge
                  dans aucun des deux cas — le chevron garde celle du joueur,
                  toujours, parce que c est une DIRECTION.
                  UN PING PAR JOUEUR AU MAXIMUM, puisque c est SON chevron qui
                  clignote : deux pings du meme joueur ne peuvent pas s empiler.
                  C est une propriete du choix de conception, pas un garde-fou a
                  ecrire. LA RECHARGE EST SERVEUR — un client ne se rationne pas
                  lui-meme — et elle vaut la duree du clignotement, donc un appel
                  ne recouvre jamais le precedent.
                  AUCUN CHAMP RESEAU, SUR AUCUNE TAILLE DE MAP. La liste `p` de l
                  instantane n est PAS filtree par la vue — elle l est pour les
                  ennemis, les balles, les tirs et les zones, jamais pour les
                  joueurs — donc les chevrons ont deja tout, y compris a
                  9 600 x 5 400.
                  LE CAS QU ON OUBLIE EST L EMETTEUR DANS LA VUE : il n a pas de
                  chevron, la classe se pose sur un element cache, et le SON
                  suffit. C est pourquoi on ne teste pas la visibilite a la pose.
                  VERIFIE BOUT EN BOUT, PAR LA VRAIE SOCKET : deux clients RFC
                  6455 a la main, une manche lancee, et les trois points mesures —
                  le ping arrive chez l allie avec le bon emetteur, la recharge
                  mord (deux envois, une seule rediffusion), et l emetteur recoit
                  le sien. Trois pieges de banc payes en l ecrivant : le pseudo
                  doit etre UNIQUE par passe — un compte deja pris fait echouer
                  `register` en silence —, le code de salle vient de `roomJoined`
                  et non du `lobby`, et `ready` ne lance rien sans un `start` de l
                  hote.
                  IL DIT « VENEZ VERS MOI », PAS « ALLEZ LA-BAS ». Pour un contrat
                  a deux mille pixels dans l autre sens il faudrait un marqueur de
                  LIEU, qui est un autre systeme — et c est aussi ce qui justifie
                  de ne pas construire de minicarte.

    0.40.3 lot 04 QUATRE SYSTEMES ETEINTS, ET AUCUN NE LEVAIT — SAUF LE DERNIER.
                  `hud.js` lisait CONTRATS, RARETES et CUSTOM_INDEX sans les
                  importer. Le troisieme est dans `updateHud`, hors de toute
                  garde : ReferenceError a CHAQUE image, donc le HUD entier muet
                  puis le gel de rendu au bout de trois. Les deux premiers, eux,
                  n avaient JAMAIS leve — et c est ca, l information.
                  ILS ETAIENT SOUS `if (ct)`, ET `ct` NE POUVAIT PAS EXISTER.
                  Le serveur emet `lo`, `bq` et `ct`, `ingest.js` les decode, et
                  `flatten()` comme `interpolated()` ne les RECOPIAIENT PAS. Or
                  le rendu et le HUD ne voient que cette vue-la. Le loot au sol,
                  les bornes, le suivi de contrat et sa proposition : quatre
                  systemes complets, cables de bout en bout, noirs au dernier
                  saut. Les gardes defensifs les taisaient tous — `if (!list)
                  return` dans `drawLoots` et `drawBornes`, `!ct` dans le HUD.
                  Un champ absent rend `undefined`, et `undefined` ne leve pas.
                  ET LES DEUX DEFAUTS SE VERROUILLAIENT : reparer le transport
                  seul aurait fait lever CONTRATS a la premiere proposition.
                  `drawTraces()` ETAIT IMPORTEE ET JAMAIS APPELEE. Le lot 0.29.13
                  n avait ajoute que la ligne d import dans `world.js` : tout le
                  systeme MATIERE[biome] — six primitives, une table par quartier,
                  un point de passage ECRIT dans CLAUDE.md — n a jamais rien
                  dessine. `verifierTraces()` etait vert : il croise les TABLES,
                  pas le site d appel. Meme forme que `macroSecteur`.
                  L ARENE SE REPEIGNAIT HORS MANCHE. La branche du menu faisait
                  `fillRect(0, 0, 9600, 5400)` puis `drawGrid()` sur toute l
                  arene, a chaque image, dans un canvas en `visibility: hidden`.
                  Invisible, mais la couche restait SALE — et tout
                  `backdrop-filter` pose au-dessus refaisait son flou soixante
                  fois par seconde. Le menu payait un decor qu il ne montre pas.
                  RENDU.md enoncait deja la regle, la branche ne la suivait pas.
                  LE SCAN QUI LES TROUVE EST GENERIQUE : croiser les noms
                  exportes du depot avec ce que chaque fichier utilise sans l
                  importer ni le declarer. Trois vrais, sept faux positifs, tous
                  dans des commentaires ou des clefs d objet.

    0.40.4 lot 05 CE QUE PLUS PERSONNE NE LIT. Quarante et un imports sans
                  usage, quatre constantes sans lecteur, un chiffre d arene
                  perime dans les regles.
                  LES QUATRE `CONTRAT_*` DE `timeline.js` N AVAIENT AUCUN
                  LECTEUR — les contrats circulent par leur INDICE, et
                  `contratAt` / `rareteAt` suffisent. `constantes-check` ne les
                  voyait pas : il ne couvre que `CFG`.
                  LE BRUIT N EST PAS NEUTRE : `drawTraces` s etait cache dans
                  cette liste pendant onze lots. Un import mort ne coute rien a
                  l execution, mais il rend invisible celui qui designe un appel
                  MANQUANT — c est la seule raison de les retirer.
                  LE SCAN A DEUX PIEGES, ET LES DEUX ONT MORDU. Compter les
                  usages sur le fichier ENTIER compte la ligne d import
                  elle-meme. Et exclure ce qui suit un point pour ignorer les
                  acces de propriete exclut aussi le SPREAD : ...f(x) se lit
                  comme .f, donc `signatureSilhouette`, bien appele, sortait
                  comme mort. Une suppression sur ce scan-la aurait casse le
                  verificateur de silhouettes.
                  `oublierManques` RESTE. Aucun appelant dans le depot, mais
                  c est la remise a zero de `sonsManques()`, instrument prevu
                  pour un script de mesure jetable — le retirer amputerait un
                  outil au lieu de nettoyer du bruit.
                  RENDU.md DISAIT ENCORE 4800 x 2700. C est 9600 x 5400 depuis
                  0.40.1, et c est precisement le chiffre qui rend le decor non
                  cull quatre fois plus cher.

    0.40.5 lot 06 TROIS GACHIS DE CHEMIN CHAUD, AUCUN VISIBLE A L IMAGE.
                  LES BLOCS ETAIENT LES SEULS A NE PAS SE CULLER. Dangers,
                  baies, amer et coulee testaient deja `inView` ; `drawObstacles`
                  parcourait la liste du LIEU ENTIER — 262 usine, 187 fonderie,
                  310 friche, 232 nebuleuse, 319 secteur — quand la vue en montre
                  le trente-sixieme depuis 0.40.1. Environ huit blocs utiles sur
                  trois cents, chacun paye quatre `save/translate/silhouette/fill`
                  plus l habillage et la LED. La marge est la demi-boite plus l
                  ombre portee et le relief : `dessinerLed` trace une LIGNE sur l
                  arete, pas un halo, donc sa portee n entre pas dedans — elle n
                  appartient qu a la source de `lumiere.js`.
                  L AGRANDISSEMENT DE 0.40.1 N AVAIT MESURE QUE LE SERVEUR. Le
                  message du lot chiffre `_grille` et `step` ; la liste de blocs a
                  quadruple cote client sans que rien ne la regarde.
                  LA BOITE D ABORD, LA COUVERTURE ENSUITE. `cover.find` est un
                  balayage lineaire, et il tournait AVANT le test de
                  recouvrement : un balayage par bloc et par image, au rendu
                  comme dans la prediction. L ordre inverse ne change aucun
                  resultat — les deux sont des `continue`.
                  `#cvUnder` REPEINT TOUJOURS SON FOND, donc `alpha: false`. Il n
                  a aucun pixel translucide a porter, et le `scale(1.015)` de
                  `#arena` recouvre le pixel d arrondi du bord.
                  UNE SOURIS EMET MILLE FOIS PAR SECONDE, LA BOITE BOUGE UNE FOIS
                  PAR IMAGE. `getBoundingClientRect` force un calcul de mise en
                  page a chaque `mousemove`. La boite est retenue, jetee par
                  `applyCamera()` — une fois par image, et c est `#arena` qui
                  porte le tressaillement —, par le redimensionnement et par le
                  defilement. Au pixel identique. Elle se declare AU-DESSUS d
                  `applyCamera` : `resize()` tourne au chargement du module et l
                  appelle, donc un `let` pose pres de son lecteur serait lu dans
                  sa zone morte.
                  `desynchronized: true` N EST PAS PRIS. Il desynchroniserait les
                  deux contextes 2D du canvas WebGL qui les separe, et une horde
                  en retard d une image sur son sol se verrait. A mesurer, pas a
                  supposer.
                  AUCUN GAIN CHIFFRE ICI : les releves disponibles ont ete pris
                  sous un compositeur LOGICIEL. Le gachis, lui, est compte.
    0.40.6 lot 07 LE SUR MESURE ETAIT INJOUABLE, ET IL PAYAIT QUAND MEME.
                  UNE CASE DE VOTE QUE LE SERVEUR REFUSE. `renderVote` bouclait
                  sur `DIFFICULTIES` entier, donc posait un quatrieme bouton
                  « sur mesure » ; le handler `vote` de `room.js` casse sur
                  `v === CUSTOM_INDEX` — le mode ne se vote pas, il se configure.
                  Le clic ne levait rien et ne faisait rien. Le meme bouton
                  annoncait « noyaux x1 », `PROG_CFG.DIFF_MUL` n ayant pas de
                  quatrieme entree et le `??` rendant le tarif de normal :
                  l inverse exact de ce que le mode paie. `renderBoard` posait de
                  meme un onglet de classement definitivement vide.
                  « AUCUNE PROGRESSION » VOULAIT DIRE TROIS CHOSES DE MOINS.
                  Noyaux, hauts faits et records etaient coupes ; passaient encore
                  les JALONS — dont chacun ouvre un emplacement de meta —,
                  `pr.kills` et surtout `cumulerStats`, qui replie la manche dans
                  les compteurs que la manche SUIVANTE lira pour accorder un haut
                  fait. « x2 loot, -50 % ennemis » restait donc la facon de farmer
                  la meta, par un chemin plus lent et parfaitement silencieux.
                  `awardRun` sort maintenant AVANT toute ecriture de profil, et
                  `awardPartial` — qui ne coupait que les noyaux — sort avec lui :
                  le codex partait encore par la.
    0.40.7 lot 08 QUATRE RAPPORTS DE PARTIE, ET TROIS ETAIENT DES SILENCES.
                  LE SUIVI DE CONTRAT TOMBAIT SUR LA LIGNE DE PING.
                  `#hudContrat` etait ancre en absolu a `--hud-safe + 92px`, une
                  hauteur de `#hudRun` SUPPOSEE — la ligne d etat, le bandeau sur
                  mesure et le ping la font varier. Il passe DANS LE FLUX, en
                  frere de `#hudMeta` : un frere ne peut pas se tromper de
                  hauteur. Le chiffre en dur ne pouvait que perimer.
                  LE NOM DU LIEU DISPARAISSAIT AU BOUT DE SIX SECONDES. Il vivait
                  dans l en-tete de mission, qui se ternit quand plus rien ne
                  change ET SE CACHE PENDANT UN BOSS : passe la deuxieme minute,
                  plus rien a l ecran ne disait ou l on jouait. Il monte dans
                  `#hudRun`, qui ne s efface jamais ; l en-tete garde les deux
                  rangs qu on relit vraiment.
                  AUCUNE INVITE SUR LA BORNE. Le socle portait « ! », qui dit « il
                  y a quelque chose », jamais « appuyez sur F ». L invite est AU
                  SOL et pas dans un coin : « F » repond a « quoi, ICI ». Elle ne
                  parait que dans le rayon ou `_interagir` accepte, et le drapeau
                  `pret` — cinquieme champ du tuple `bq`, en FIN, lu avec repli —
                  la retire pendant la recharge, ou la borne reste pourtant
                  `BORNE_LIBRE`.
                  `BORNE_FORME` PORTAIT DEUX CLEFS QUI N EXISTENT PAS. `ville` et
                  `serre` n ont jamais ete des clefs de lieu : le `??` rendait la
                  borne de l USINE sur la friche et le secteur — deux lieux sur
                  cinq — et deux formes ecrites la n etaient tirees par personne.
                  Meme famille que la fiche de bloc, et aucun verificateur ne
                  regardait cette table parce qu elle n etait pas declaree comme
                  une table de lieu.
                  LA NEBULEUSE POSAIT DE LA POUSSIERE SOUS SA PROPRE REGLE. Le
                  commentaire de `MATIERE` dit « pas de gravite, donc pas de
                  poussiere qui tombe » et le quatrieme quartier tirait
                  `TRACE_POUSSIERE`. Il tire `TRACE_DECHETS` : ce qui flotte
                  encore autour d une coque.
                  14400 x 8100 — NEUF REGIONS DE L ARENE D ORIGINE. Les deux
                  dimensions restent des MULTIPLES ENTIERS de la vue (9 x 9) :
                  `cols = round(ARENA_W / VIEW_W)` arrondit, donc une taille qui
                  ne tombe pas juste etire les cellules du generateur par rapport
                  a ce que la camera montre. `BORNE_CFG.PAR_MANCHE` 7 -> 10, le
                  nombre suivant la dimension LINEAIRE ; le mini-boss ne suit
                  RIEN, son compte etant borne par l horloge et pas par la
                  surface. `verifierVariantes` verifiait encore 4800 x 2700, son
                  defaut de module, donc un assemblage que le jeu ne construit
                  plus depuis 0.40.1.
                  MESURE : population INCHANGEE (154 -> 155 a quatre), et c est
                  une limite du banc — les bots suivent la meme trajectoire, donc
                  le meme ecart et le meme temps de transit. `step` a quatre monte
                  de 38 % (140 -> 193 us) et ce sont les OBSTACLES, dont le nombre
                  suit la surface : 1,2 % d une image.
    0.40.8 lot 09 « AUCUNE DIFFERENCE VISUELLE ENTRE LES LIEUX » — MESURE, PUIS
                  UNE VRAIE CAUSE TROUVEE. Le banc de rendu hors navigateur
                  (contexte 2D qui ENREGISTRE, balayage des 81 vues) dit que les
                  cinq lieux rendent bien des choses differentes au palier
                  ELEVEE : 819 a 2 444 ops de props par vue, 51 a 124 objets, un
                  fond et des baies pour les deux seuls lieux qui en declarent
                  un. Le systeme n est donc pas eteint — c est le PALIER qui
                  decide, et il decidait mal.
                  `low` BAISSAIT LA TECHNIQUE ET CHANGEAIT DE LIEU. `nebuleuse()`
                  et `secteur()` faisaient `return usine(...)` : au palier bas,
                  TROIS LIEUX SUR CINQ portaient le sol de l usine — mesure, 8
                  ops de cuisson pour les trois. La Friche avait pourtant la
                  bonne forme depuis toujours (`fricheLegacy`, SA PROPRE tuile
                  d avant le plan 13) ; ces deux lieux sont nes apres, donc ils n
                  avaient pas d ancienne tuile et on leur avait prete celle du
                  voisin. Ils ont la leur : la coque hexagonale pour l une, l
                  enrobe et ses reprises pour l autre. Le sol rend maintenant
                  8 / 4 / 16 / 6 / 1.
                  ET CA NE COUTE RIEN PAR IMAGE : la tuile est cuite UNE FOIS par
                  manche puis repetee en motif. Le prix de `low` est aux props,
                  aux traces, a la lumiere, a l atmosphere et au premier plan —
                  tous a ZERO op sur 81 vues, ce qui est son contrat.
                  LA GARDE DE PALIER PASSAIT APRES LE FOUR. `drawFond` et
                  `drawBaies` appelaient `fondDe()` — une toile pleine vue — puis
                  sortaient sur `gfx <= GFX_LOW`. Cuite, jamais dessinee.
                  ET `meteo` REND ZERO DANS LES CINQ LIEUX, CE QUI EST CORRECT :
                  `weatherFor` sort sur `diffIndex < 2`. Il n y a de meteo qu en
                  cauchemar, et un segment sur trois n en a pas meme la. Le banc
                  le dit au lieu de le supposer.
    0.40.9 lot 10 LA QUATRIEME CARTE REVIENT, ET CETTE FOIS ELLE FAIT QUELQUE
                  CHOSE. Le lot 07 avait retire du vote une carte que le serveur
                  refusait : le symptome partait, la question restait. La
                  difficulte est UN choix, et l offrir a deux endroits — trois
                  cartes dans la rangee, une case a cocher plus bas — demande au
                  joueur de deviner que les deux parlent de la meme chose. Elle
                  reprend donc sa place, mais comme INTERRUPTEUR D HOTE et non
                  comme bulletin : elle envoie `custom`, jamais `vote`.
                  ELLE PORTE SON STATUT SANS TEXTE : lisere TIRETE tant qu elle n
                  est pas retenue — la convention de la couverture destructible,
                  ce qui n est pas plein n est pas acquis —, plein quand elle EST
                  le mode, grisee chez qui n est pas hote.
                  LE VOTE SURVIT DESSOUS. Armer n efface pas : desarmer rend la
                  main a la majorite, donc les voix restent visibles et seule la
                  couronne bouge. Corollaire ecrit : l HOTE qui choisit un des
                  trois desarme dans le meme geste, sinon la carte qu il vient de
                  cocher n est pas celle que le serveur jouera — `this.custom`
                  passe avant la majorite.
                  L INTERRUPTEUR EN DOUBLE A DISPARU. La case « Jouer en sur
                  mesure » visait le meme etat que la carte ; deux portes vers un
                  meme etat se desynchronisent le jour ou l une des deux oublie
                  un cas. Le bloc de reglages n a plus ni numero de section ni
                  interrupteur, il est CE QUE LA CARTE OUVRE — et il ne s affiche
                  que si le mode est arme : onze lignes de reglages qui ne reglent
                  rien sont onze lignes de trop.
                  LE WIDGET SE DEDUIT DE LA TABLE. Un rang qui pose un NOM
                  (`script: "cauchemar"`) n est pas sur un axe, donc des cases ;
                  tout le reste est un coefficient, donc un CURSEUR, qui dit d un
                  coup combien de crans il reste. Rien cote ecran ne connait
                  `script`. L axe est ordonne par COUT et « aucun » en est le
                  zero — `Maree` et `Carapace` ont des rangs plus DOUX que rien,
                  ils sont a gauche. Deux rangs de meme cout (`Maree` en a deux a
                  +2) se departagent par l ordre de la TABLE, ecrit et non
                  emprunte a la stabilite de `sort`. L indice qui circule sur le
                  reseau reste celui de la table.
                  ET L ENVOI ATTEND QU ON LACHE LE CURSEUR : `oninput` ne fait que
                  l apercu local, `onchange` envoie. Un `input` emet a chaque
                  pixel, et chacun serait un message de salon rediffuse a toute la
                  table.
                  LA PASTILLE DIT « aucun gain » : `DIFF_MUL` n a pas de
                  quatrieme entree, et le `?? 1` du lot 07 annoncait « noyaux x1 ».
                  L absence est lue comme telle, pas rattrapee par un defaut.
    0.40.10 lot 11 UN `t` QUI EN CACHAIT UN AUTRE, LE PREMIER PLAN RETIRE, ET LE
                  SEMIS QUI DEVIENT PROPRE A CHAQUE LIEU.
                  `t` EST DEUX CHOSES. Le lot 07 a importe `t` d `i18n.js` dans
                  `actors.js` pour l invite de borne ; `drawBornes` declarait deja
                  `const t = performance.now() / 1000`. `t("ui.borne.invite")`
                  appelait donc un NOMBRE : TypeError a la premiere borne a
                  portee, trois images en echec, rendu arrete. Le local s appelle
                  `tm`. Un balayage dit que c etait le seul du depot — dix
                  modules importent `t`, `boss.js` en declare un local sans jamais
                  traduire dans sa portee.
                  LE PREMIER PLAN EST RETIRE (-284 lignes). Il tenait ses trois
                  regles et il a quand meme saute : sur une arene de 9 x 9 vues,
                  une bordure presente a CHAQUE ecran devient la chose la plus
                  repetee du jeu, et elle mange la hauteur utile. Ce qui decore
                  les bords concurrence ce qui decore le monde ; le budget
                  appartient au sol, aux props et aux blocs, qui sont ancres et
                  donc jamais deux fois pareils.
                  ET LA PREMIERE COUPE A EMPORTE DEUX VOISINS. `carrefour` (l amer
                  du Secteur), `grilleCaniveau` et `drawWalls` vivaient APRES la
                  derniere fonction de premier plan : une coupe « du commentaire
                  a la fin du fichier » les a pris avec. `node --check` ne peut
                  pas voir un `ReferenceError` de table, et `verif` ne charge pas
                  les modules de rendu. C est le harnais du lot 09 — DOM de papier
                  plus hook de resolution — qui l a leve, en une seconde.
                  LE SEMIS ETAIT LE MEME PARTOUT. `DENSITE[gfx]` et l echelle
                  `0,72 + h x 0,66` n avaient AUCUN terme de lieu : les cinq
                  posaient le meme nombre d objets a la meme taille et ne
                  differaient que par leur catalogue. C est ce qui les faisait se
                  ressembler EN MOUVEMENT — ce qui se lit a la seconde est un
                  encombrement, pas un inventaire. `DENSITE_LIEU` et
                  `ECHELLE_LIEU` portent le verbe du lieu ; mesure sur 81 vues :
                  53 partout AVANT, 65 / 62 / 53 / 41 / 30 APRES, soit 2,2x
                  d ecart. `verifierSemis()` refuse un lieu sans entree ET deux
                  lieux au meme couple.
                  LE RELEVE DE PROPS DE 0.40.8 ETAIT FAUX et il est corrige :
                  il comptait les `translate`, donc des traits de dessin. Un prop
                  est un `ctx.scale`, le seul du module.
                  LA PALETTE EST MESUREE, PAS CORRIGEE. `arena` tient dans SEPT
                  points de luminance sur cent, et les paires les plus proches
                  sont a 6,1 et 8,9 de dE quand « indiscernable » commence a 5 ;
                  trois emissifs sur cinq sont ambre. Les seuils de
                  `verifierCharte` (6/9/8) sont les minima DEJA presents, donc il
                  ratifie l existant au lieu de poser une barre. Ecrit dans
                  LISEZMOI, pas touche ici.
    0.40.11 lot 12 « J AI PARCOURU LA MAP, LE LIEU N A JAMAIS CHANGE » — CE N EST
                  PAS UNE PANNE, C EST LA CONCEPTION, ET ELLE N ETAIT ECRITE
                  NULLE PART. Un lieu par MANCHE, pour toute l arene :
                  `room.drawBiome()` tire a la creation de la salle puis a chaque
                  sortie de manche, et `buildBiome` pave les 81 cellules avec les
                  variantes de CE lieu. C est ce qui rend possible tout ce qui est
                  cuit une fois — tuile de sol, fond, coulee, semis, charte. La
                  regle entre dans SIMULATION.md : sans elle la question se
                  reposera, et elle s est deja posee comme un rapport de bug.
                  LE DEFAUT REEL ETAIT AILLEURS, ET IL EST PETIT : le tirage
                  uniforme sur cinq rendait le meme lieu deux manches de suite
                  une fois sur cinq. La salle memorise deja le quintette de boss
                  pour exactement cette raison ; le lieu, non. Un joueur ne compte
                  pas les tirages, il compte ce qu il a vu — et deux fois l usine
                  de suite se conclut « il n y a pas de biomes ». Le redecalage
                  est mesure sur 200 000 tirages : ZERO repetition immediate,
                  0,39 % d ecart a l uniforme, donc aucun lieu favorise.
                  `BIOME` (env) PASSE DEVANT : un test qui redemande la fonderie
                  doit l obtenir deux fois. La memoire appartient a la SALLE, pas
                  au module — seize salles d un processus ne partagent pas un
                  etat, c est la panne que le plan 31 a corrigee pour le hasard.
    0.40.12 lot 13 UN LIEU A DES QUARTIERS, ET UN QUARTIER SE TRAVERSE. Les deux
                  machineries existaient et produisaient du BRUIT, chacune a une
                  echelle differente et sans jamais se parler.
                  LE LAYOUT TIRAIT PAR CELLULE. Mesure : 45 a 48 amas de meme
                  variante par arene, de 1,8 cellule — on changeait de loi
                  d implantation tous les deux ecrans. Quatre lois existaient et
                  aucune n avait la place de se faire reconnaitre. `districtsDe()`
                  plante quelques germes, les fait pousser, donne UNE variante par
                  quartier, et la boucle de compatibilite d avant ne repare plus
                  que les aretes fautives : 12 a 21 amas de 3,9 a 7,0 cellules.
                  ET LE BRUIT S AJOUTE A LA DISTANCE, JAMAIS A SON CARRE. Premier
                  jet : `+/- 3,4` sur une distance au carre — pres d un germe les
                  carres valent 0, 1, 4, donc le bruit decidait seul et le
                  decoupage sortait MOUCHETE. Treize quartiers epars au lieu de
                  cinq blocs. Il vaut maintenant au plus une demi-cellule.
                  LE SEMIS AVAIT SON PROPRE DECOUPAGE. `ZONE_CELL = 3` x 200 px =
                  une maille de 600 px, PLUS PETITE QU UNE VUE : quatre cases de
                  quartier par ecran, donc rien qui puisse designer un endroit. Et
                  il etait independant du bati — deux decoupages a deux echelles
                  qui ne tombent jamais d accord. Il lit `quartierMonde()`, le
                  meme decoupage qui a choisi la loi d implantation : 1,32 quartier
                  par vue, mesure sur des vues NON ALIGNEES (la camera suit le
                  joueur, elle ne tombe pas sur la grille). `sonder` passe toujours
                  devant et `FUITE` brouille toujours la frontiere.
                  `verifierDistricts()` EXIGE UN SEUL TENANT. Un quartier en deux
                  morceaux est deux endroits qui se ressemblent sans se toucher, et
                  c est pire que pas de quartier : le joueur croit revenir sur ses
                  pas. Plus un plancher de trois cellules et une moyenne au-dessus
                  de huit, sinon on est revenu au bruit sans le voir.
                  `verifierVariantes` RESTE A ZERO FAUTE d arete, et `passages`
                  comme `navigation` restent verts : le decoupage change ce qui se
                  LIT, pas ce qui se TRAVERSE.
    0.40.13 lot 14 DEUX FOURS QUI SE TRAVERSENT, ET DES RONDS QUI REVIENNENT AU
                  PAS DE LA GRILLE — LES DEUX SE VOIENT SUR UNE CAPTURE DE LA
                  FONDERIE, ET AUCUN VERIFICATEUR NE LES REGARDAIT.
                  LES BLOCS. « Le puits » posait ses deux fours a 0,35 et 0,30 :
                  112 px sur 171 de recouvrement. La masse restait un rectangle
                  propre, donc la collision et la navigation ne disaient rien ; ce
                  qui se voyait etait le second HABILLAGE — panneau et fente —
                  pose en decale sur le corps du premier. Mesure sur 40 graines et
                  cinq lieux : l Usine et le Secteur sont a ZERO, la Fonderie
                  n avait que cette paire, la Friche et la Nebuleuse en gardent
                  respectivement six et deux — releve, non corrige, faute d avoir
                  ete rapporte. Le second four passe EN HAUTEUR (0,35 / 0,69) :
                  colle a cote il venait toucher le glissant de `HZ_NORMAL` a
                  0,16, et `verifierBiomes` refuse un danger pose sur un obstacle
                  — c est ce refus qui a choisi la solution.
                  LES RONDS. Les « zones vitrifiees » de la tuile de Fonderie
                  etaient trois ellipses de 60 a 152 px a 0,44 de noir dans une
                  tuile de 400 px : un motif a FORT contraste revient donc au pas
                  exact de la grille de 20 m, et la seconde periode de 1 200 px ne
                  casse que ce qui est DOUX. Elles cumulaient le second defaut —
                  une ellipse lisse n a ni bord ni direction et ne se lit que
                  comme un rond, exactement ce que la souillure de `props.js`
                  avait deja paye. Supprimees : ce qui a coule reste dit par la
                  COULEE, qui a un sens. La regle entre dans RENDU.md — ce qui est
                  grand et contraste n appartient pas a la tuile, il appartient a
                  `MATIERE[lieu]`, pose par cellule monde et sans periode.
    0.40.14 lot 15 LE LASER NE TIRE PLUS TOUT SEUL, ET SA PORTEE RENTRE DANS
                  L ECRAN. Le depot pose « le tir est automatique » partout, et
                  une carte — la Chambre thermique — achete le contraire. Sur le
                  laser cette carte n achetait RIEN : le faisceau porte deja sa
                  jauge, donc elle ne rendait que la gachette a tenir. La
                  contrepartie du faisceau EST sa chaleur, et une jauge qu on ne
                  peut pas relacher n est pas geree, elle est SUBIE.
                  `manuel` sur la fiche, lu par le meme `const manuel` que la
                  carte : un seul chemin pour « je tire quand je le decide ».
                  `exige: "tirAuto"` retire la Chambre thermique de l offre du
                  laser — une carte offerte qui ne rend rien fait un choix a deux
                  options sans le dire.
                  LE CLIENT NE POUVAIT PAS LE DEDUIRE. Le faisceau se dessinait
                  des que `armeRes < 1`, ce qui etait vrai en permanence tant que
                  le tir etait automatique ; relache, il serait reste allume. Le
                  bit `ETAT_TIR` (32) entre dans le masque de bonus qui circule
                  deja : ses deux lecteurs le parcourent par LISTE de bits, donc
                  un bit de plus leur est inerte, et aucun champ ne s ajoute au
                  tuple joueur. L image et le son lisent la meme condition.
                  LA PORTEE : 43 m tombaient « juste au-dela du demi-ecran », ce
                  qui veut dire DEHORS — 864 px pour 800 visibles, donc une portee
                  dont on ne voit jamais la fin. 0,7 rend 672 px, qui s arretent
                  128 px avant le bord.
                  CE QUE CA COUTE AU MODELE, ECRIT PLUTOT QUE TU :
                  `verifierEquilibreArmes` pilote une gachette tenue en
                  permanence, donc il lit desormais le PLAFOND d uptime du laser
                  et non sa moyenne. Un chiffre de laser ne se corrige plus sur la
                  seule campagne simulee.
    0.40.15 lot 16 LE SEUL SYSTEME QUE PLUS AUCUNE LIGNE DE JOUEUR NE NOMMAIT.
                  Rapport de partie : « je n ai pas de talent de bouclier et j en
                  ai 20, et il passe a 60 puis revient a 20 tout seul ». C est le
                  Fusil de siege, exactement comme il est ecrit — `SIEGE_BOUCLIER`
                  20 en propre, `SIEGE_GARDE` x3 pendant les 1,8 s de recharge,
                  rendu a la fermeture de la fenetre. Aucun defaut.
                  MAIS AUCUN TEXTE NE LE DISAIT : le resume parlait d une
                  « recharge a couvert » sans dire d ou venait le couvert, et la
                  contrainte ne comptait que les secondes. Une jauge qui bouge
                  seule et qu aucune ligne n annonce se lit comme un bug — c est
                  le rapport qu on vient de recevoir. Le resume porte desormais
                  les deux chiffres, FR et EN.
    0.40.16 lot 17 LES CINQ LIEUX PASSES AU CRIBLE : PLUS AUCUN BLOC N EN
                  TRAVERSE UN AUTRE, ET UN VERIFICATEUR LE TIENT.
                  UNE SUPERPOSITION NE LEVE RIEN. La collision est une AABB :
                  deux AABB qui se recouvrent bornent exactement comme leur
                  union, et la navigation lit les memes rectangles. Ce qui se
                  voit est le DESSIN — `silhouetteBloc` remplit son rectangle et
                  `contourDe` le cerne, donc le second habillage se pose en
                  decale sur le corps du premier. Le defaut est remonte par une
                  CAPTURE D ECRAN, avec quarante verificateurs verts.
                  RELEVE AVANT CORRECTION, 40 graines x 3 modes sur l arene
                  reelle : Usine 0, Secteur 0, Fonderie 0 (corrigee en 0.40.13),
                  Nebuleuse 2 814 paires, Friche 19 318.
                  LE TREMBLEMENT DE LA FRICHE ETAIT LA MOITIE DU PROBLEME. Tire
                  PAR OBSTACLE, il rapprochait deux voisins de 80 px au pire —
                  plus que l ecart de la plupart des paires d un champ de ruines,
                  qui est dense par definition. Il passe PAR CELLULE : l ecart
                  entre deux blocs d une meme variante ne bouge plus, donc la
                  table redevient le seul endroit ou une superposition peut
                  naitre. On perd le desordre DANS une cellule, on garde la
                  desynchronisation ENTRE cellules — la seule qui casse une
                  grille de 1600 x 900, la seule qui se voie.
                  L AUTRE MOITIE ETAIT DANS LES TABLES, onze paires a la Friche
                  et trois a la Nebuleuse. Deux entrees identiques qui se
                  recouvrent AUX TROIS MODES sont une entree : le mur de « le
                  mur » etait deux `B_MUR` a 0,29 et 0,33, il devient un seul de
                  0,150 a 0,31 — MEME EMPRISE, meme parcours, memes breches, un
                  seul contour. Quand les `min` different c est l inverse : le
                  tronçon du mode superieur PROLONGE celui d en dessous (0,71 ->
                  0,79) au lieu de le doubler.
                  Le reste est du deplacement : la ruine debout de « l
                  effondrement » tombait dans les deux murs ET dans une grande
                  ruine — quatre superpositions a elle seule —, et la travee de
                  « la breche » traversait ses deux fragments sur 32 x 86 px a
                  toutes les graines. La travee ne bouge pas, elle : sa position
                  tient d une passe a cinquante graines sur la fermeture du carre
                  central. Ce sont les fragments qui s ecartent, de 92 px, donc
                  plus que `PASSAGE_MIN`.
                  `verifierSuperpositions()` CONSTRUIT LES ARENES, il ne lit pas
                  la table : le miroir de cellule, le tremblement et le voisinage
                  entre deux cellules n y sont pas. Seaux de cellule, 50 graines
                  x 5 lieux x 3 modes en 0,1 s. Tolerance 1 px — deux blocs qui
                  se TOUCHENT sont une masse plus longue, figure legitime.
                  Les onze autres verificateurs de terrain restent verts :
                  signatures de variante, lois de lieu, monotonie des modes,
                  carre central traversable, passages, navigation.
    0.40.17 lot 18 LE LASER S ARRETE SUR CE QU IL RENCONTRE, ET SA CHALEUR SE
                  VOIT. Trois defauts d une meme partie, et le troisieme est le
                  seul qui soit une INFORMATION FAUSSE.
                  LE TRACE MENTAIT. `_segmentHits` coupait le faisceau sur le
                  premier obstacle depuis toujours ; le rendu le dessinait quand
                  meme jusqu au bout de sa portee. Un trait qui traverse un mur
                  sans rien y faire n est pas un effet. `_vueCoupee` sort de la
                  classe sous le nom `segmentCoupe` — elle ne lisait que
                  `this.obstacles` — et `render/boss.js` l appelle avec
                  `obstaclesActifs()` : UNE geometrie, deux lecteurs.
                  `perforeTout` EST PARTI, et c est ce qui rend son axe jouable.
                  Un faisceau qui traverse tout n a rien a acheter : sa
                  perforation valait ZERO dans le tableau d echelle, donc quatre
                  cartes ne lui rendaient rien — dont `Inertie`, qui est
                  litteralement une perforation infinie. Il compte maintenant
                  comme une balle (`litPerce` s ouvre au `faisceau`), budget
                  `1 + pierce`, decroissance de 0,65 par corps sous `Inertie`, et
                  `ech.perforation` passe de 0 a 1,5. Le point d arret RABAISSE
                  la portee : un cristal derriere un corps n est pas touche non
                  plus, un faisceau bloque est bloque pour tout.
                  LE DEGAT N EST PLUS LE LEVIER DE SA HORDE, ET C EST MESURE. A
                  une cible a la fois `Dh` sature : 72 -> 100 de degats ne l a
                  fait passer que de 32,9 a 35,5 (+8 %), le reste part en
                  surtuage. Ce qui a rendu les seize points manquants est l
                  UPTIME — la chaleur monte en 6 s au lieu de 4,2, ce qui est de
                  toute facon la vraie correction : une jauge qu on ne peut pas
                  relacher n a pas besoin d etre lente, une jauge qu on GERE si.
                  Le plafond de `verifierArmes` (1,6 fois la reference en cible
                  unique) borne les degats a ~101 pour cette arme, donc le levier
                  n existait pas de ce cote.
                  Releve final, 6 manches x 10 min : laser 105 % pour une cible
                  de 106 %. Les neuf autres armes ne bougent pas.
                  LA CHALEUR N AVAIT AUCUNE JAUGE, et c est la seule ressource du
                  depot dans ce cas : la rampe a son anneau, la charge sa ligne
                  de tir, le chargeur ses crans. On la lisait sur la TEINTE du
                  faisceau, donc seulement en tirant — et depuis 0.40.14 le tir
                  est manuel, donc elle quittait l ecran au moment precis ou l on
                  relache pour la gerer. Meme anneau que les deux autres
                  ressources ; un joueur n en porte jamais deux. Le MUTISME bat,
                  parce que c est lui qui punit et qu il ne se deduit pas de la
                  jauge, qui REDESCEND pendant : d ou `ETAT_MUET` (64), un bit de
                  plus dans un masque qui circulait deja.
                  LA PORTEE : 34 m -> 29 m. 672 px s arretaient encore trop loin
                  pour qu on les LISE ; 576 laissent 224 px de vide au bout.
                  ET LE LIEU SE JOURNALISE. « Le nom de biome ne change jamais » :
                  le tirage est juste — verifie, douze salles neuves et onze
                  manches d une meme salle donnent bien cinq lieux — mais rien,
                  hors du HUD d une manche en cours, ne permettait de le VOIR. La
                  ligne dit aussi quand `BIOME=` fige le tirage depuis l
                  environnement, qui est la seule facon dont il puisse ne pas
                  changer.
    0.40.18 lot 19 CE QU ON RAMASSE DIT CE QU IL FAIT, ET LA ZONE QU ON TIENT SE
                  VOIT. Deux informations que le jeu DEMANDAIT et ne donnait pas.
                  LE LOOT NE DISAIT QUE SON RANG. Un a trois points, dans la
                  couleur de son PROPRIETAIRE : deux informations utiles, aucune
                  sur ce que l objet augmente — pour la seule source de puissance
                  qui coute un DEPLACEMENT, donc la seule ou la decision se prend
                  de loin.
                  DEUX QUESTIONS, DEUX CANAUX. « A qui » reste sur le cercle de
                  ramassage et sur l opacite, ou le joueur le lisait deja ;
                  « quoi » prend le socle. La COULEUR dit l axe et elle est celle
                  des CARTES (`LOOT_AXE_COLOR` derive de `CARD_CATEGORY_COLOR`) :
                  offensif rouge, defensif bleu, exactement comme dans l ecran de
                  choix — un joueur qui a appris une couleur en la CHOISISSANT la
                  relit au sol sans rien reapprendre. `mob` prend le vert de ce
                  qui rend, `eco` l or des eclats et des cristaux.
                  NEUF SIGNES POUR SEIZE OBJETS, et c est voulu : ce qui se decide
                  en courant est « offensif ou defensif, et sur quel axe », pas le
                  detail du pourcentage. Trois signes REPRENNENT un glyphe de
                  bonus — degats, cadence, armure —, six sont neufs. Les points de
                  rang passent SOUS le socle : a neuf pixels de rayon, un glyphe
                  et trois points superposes se mangent.
                  LA CLEF EST DANS LE DOMAINE, LE GLYPHE DANS LE CLIENT.
                  `LOOT_SIGNES` est une liste FERMEE et `verifierLoot` refuse une
                  fiche sans signe, un signe hors liste ou un axe inconnu ;
                  `LOOT_ICON` dessine. Sans glyphe, `paintIcon` ne dessine rien et
                  le socle retombe sur ses points — l etat d avant, jamais un
                  trou.
                  LA ZONE D UN CONTRAT « POSITION TENUE » N ETAIT DESSINEE NULLE
                  PART. Le HUD disait « tenez la borne 30 secondes » et le
                  compteur montait ou descendait sans qu aucun pixel ne dise OU.
                  Le rayon vaut `BORNE_CFG.INTERACTION x 2`, soit QUATRE FOIS le
                  cercle d activation : impossible a deviner depuis la borne.
                  ELLE DIT « RESTE LA », PAS « EVITE ». La charte interdit le
                  rouge pour ce vers quoi il faut aller, et le vocabulaire des
                  dangers — bord franc et chaud — veut dire l inverse : bleu de
                  `SIGNAL.go`, aplat tres faible, bord DOUX.
                  Elle porte son propre etat : l arc compte la progression sur le
                  BORD (le centre est la ou l on se bat), et « quelqu un est
                  dedans » se lit sans le HUD — trait plein qui respire quand elle
                  est tenue, pointille eteint sinon. AUCUN CHAMP RESEAU : la
                  position du contrat voyage deja (`ct[5]`, `ct[6]`) et le client
                  rejoue la meme regle au meme rayon. Elle se dessine avec le SOL,
                  sous les obstacles.
    0.41.0 lot 1  UNE CARTE PORTE LES CINQ LIEUX, ET LE DECOUPAGE EXISTAIT DEJA.
                  « Ce n est pas un biome une partie, c est une grande map
                  composee de plusieurs biomes colles avec une transition. »
                  `districtsDe` rendait deja 3 a 6 quartiers d UN SEUL TENANT sur
                  les 81 cellules — cinq en pratique, de seize cellules, soit
                  quatre ecrans de cote. C est exactement la taille d une REGION.
                  On y pose un LIEU au lieu d une variante, et tout ce qui etait
                  par lieu devient par CELLULE.
                  UNE BIJECTION, PAS UN TIRAGE. Cinq quartiers, cinq lieux, chacun
                  une fois. Le premier jet ne bornait que l adjacence et un modulo
                  rendait deux regions eloignees au meme lieu : sur trois graines,
                  deux cartes ne montraient que TROIS lieux sur cinq.
                  DEUX DECOUPAGES SUPERPOSES, et c est ce qui evite seize ecrans
                  identiques : le premier porte le lieu, le second la loi
                  d implantation.
                  `BIOME_COMPOSE` (-1) VOYAGE COMME UN INDEX DE LIEU. Le salon
                  envoie deja `biome` et les deux cotes rejouent `buildBiome` sur
                  la meme graine : AUCUN champ reseau, une valeur de plus dans
                  celui qui existe. Un index force encore un lieu unique, et c est
                  ce qui garde `BIOME=`, les campagnes de mesure et TOUS les
                  verificateurs par lieu — ils tournent toujours sur des cartes
                  d un seul lieu, donc leurs mesures restent comparables.
                  LE SEUIL NE FERME RIEN, et c est la contrainte posee : pas de
                  mur, pas de goulot — un goulot detruit le kiting. Deux lieux
                  bord a bord font une COUTURE ; on la DECLARE au lieu de la
                  cacher. Une plaque de 150 px, a plat, sans collider, avec un
                  bord franc de chaque cote : la droite cesse d etre un accident
                  et devient une piece. Vocabulaire technique — le metal, seule
                  matiere que les cinq lieux partagent — jamais la teinte de l un
                  des deux, qui dirait que ce lieu deborde.
                  CE QUI RESTE GLOBAL, ET POURQUOI : la LUMIERE d abord. Deux
                  ombres qui pointent differemment sur le meme ecran est le defaut
                  le plus visible d un rendu 2D, et une direction par region ferait
                  exactement ca A CHAQUE FRONTIERE — elle devient une propriete de
                  la CARTE. Meme raison pour la grille, le vignettage, l
                  arriere-plan et l ambiance : ils peignent la vue entiere.
                  LE SOL SE PEINT PAR CELLULE. Une cellule fait exactement une vue,
                  donc la camera en touche quatre au pire. Le motif reste ancre a
                  l ORIGINE DU MONDE : deux cellules du meme lieu se raccordent au
                  pixel. Le cache de tuiles passe d une entree PAR FAMILLE a une
                  par LIEU — sinon une vue a quatre lieux recuisait une toile par
                  cellule et par image.
                  DEUX DEFAUTS PREEXISTANTS SORTIS PAR LE NOUVEAU VERIFICATEUR.
                  Le tremblement de la Friche posait un bloc sur son propre danger :
                  41 arenes sur 200, carte d un seul lieu, ARENE REELLE. Invisible
                  a `verifierBiomes`, qui tourne sur 1600 x 900 — une cellule, un
                  seul jeu de miroirs. Et `coeurTraversable` testait les 750
                  obstacles de l arene pour chacun des 5 000 points d une cellule,
                  81 fois : 315 millions de comparaisons, 15 s la ou la
                  construction en met 25. Le filtre par cellule est EXACT et rend
                  0,6 s.
                  ONZE VERIFICATEURS DE RENDU ETAIENT ECRITS ET APPELES PAR
                  PERSONNE. `verifierZones`, `verifierTraces`, `verifierSemis`,
                  `verifierBlocs`, `verifierLed`, `verifierDangers`,
                  `verifierAmers`, `verifierBaies`, `verifierMatiere`,
                  `verifierFonds` — tous dans `public/render/*`, donc derriere le
                  DOM, et `verif.js` y renoncait pour cette seule raison. C est le
                  defaut que `verif.js` existe pour fermer, sous une autre forme :
                  l ABSENCE d appel. `verif_dom.js` est un canvas de PAPIER : il ne
                  dessine rien, il CHARGE — et le chargement lui-meme est un
                  critere, puisqu une table qui reference un identifiant absent ne
                  se leve qu a l evaluation et que `node --check` ne la voit pas.
                  Verifie en injectant la faute : `modulesRendu` la remonte.
                  41 -> 53 verificateurs, 2 s. Les 31 modules du client chargent.
    0.41.1 lot 2  UN IMPORT MANQUANT QUE CINQUANTE-TROIS VERIFICATEURS VERTS ONT
                  LAISSE PASSER. `drawGrid` lisait `biomeKey()` sans que
                  `decor.js` l importe : l arene ne se peignait plus, le rendu se
                  figeait apres trois images en echec, et rien — ni
                  `node --check`, ni les onze verificateurs de rendu, ni le
                  chargement des trente et un modules du client — ne pouvait le
                  voir.
                  CHARGER NE SUFFIT PAS, IL FAUT APPELER. `verif_dom.js` attrape
                  ce qui casse a l EVALUATION ; un identifiant utilise DANS une
                  fonction et jamais importe ne leve qu a l APPEL.
                  `verif_dessin.js` appelle donc le decor entier — sol, seuils,
                  grille, obstacles, dangers, lumiere, semis, amer, coulee, baies,
                  meteo, atmosphere, vignette — plus ce qui se pose dessus : les
                  SEIZE fiches de loot (un glyphe absent ne se voit que la), la
                  zone de contrat, les bornes, les bonus, les cristaux.
                  CINQ LIEUX x TROIS MODES x LA CARTE COMPOSEE, et QUATRE POINTS
                  DE VUE dont deux sont des frontieres : tout ce qui se dessine la
                  est aiguille par lieu, donc un seul lieu teste une branche sur
                  six. 0,2 s.
                  DEUX REGLES POUR QU IL VERIFIE VRAIMENT, et les deux sont des
                  pieges deja payes : la camera se POSE a la main — `updateCamera`
                  lisse vers `predicted`, nul hors jeu, et rend une camera `NaN`
                  qui cull tout en silence — et tout est DANS LE CHAMP, sans quoi
                  `inView` sort avant le corps de la fonction.
                  Verifie en reinjectant les deux fautes : `biomeKey` absent de
                  `decor.js` et `LOOT_ICON` absent d `actors.js` sortent toutes
                  les deux.
    0.42.0 lot 1  UNE CARTE EST D UN SEUL THEME, ET ELLE PORTE PLUSIEURS BIOMES
                  DE CE THEME. Le decoupage posait LES CINQ ENTREES DE `BIOMES` —
                  donc cinq MONDES — sur les cinq regions d une arene, et
                  `verifierCarte` l EXIGEAIT : une friche pouvait etre une
                  nebuleuse. Le mot « biome » designait un THEME ; ce qui joue le
                  role d un biome est la LOI D IMPLANTATION.
                  CINQ DEFAUTS VIVANTS MEURENT AVEC LA CARTE COMPOSEE, tous par
                  la meme cause — `biomeIndex` valait -1, donc `biomeAt(-1)`
                  repliait sur l Usine : `drawFond` et `drawBaies` rendaient
                  `null`, donc AUCUN arriere-plan nulle part, Nebuleuse comprise ;
                  `AMBIANCE` soufflait l air de l Usine dans les cinq regions ;
                  `contourDe` donnait son lisere a tous les blocs ; et
                  `=== "fonderie"` etait toujours faux, donc la coulee ne
                  degageait JAMAIS sa chaleur.
                  LE BORD APPARTIENT A LA REGION, PAS A LA CELLULE. `mx` et `my`
                  changent TOUJOURS d une cellule a sa voisine, donc le bord sud
                  de l une et le bord nord de l autre etaient le MEME element de
                  table : un bord rencontrait lui-meme, et une loi portant un
                  `BORD_MUR` etait incompatible avec ELLE-MEME. La reparation par
                  cellule reecrivait alors la moitie d une region — 50 % sur la
                  Friche (le cratere), 48 % sur la Nebuleuse (la breche) — et la
                  region cessait de se lire. `bordsDe` est supprime ; deux LOIS
                  s accordent si aucun de leurs quatre bords n est `BORD_MUR` des
                  deux cotes.
                  L ADJACENCE DES REGIONS SE CONSTRUIT DANS LES DEUX SENS : le
                  premier jet ne regardait que le voisin de gauche et du haut deja
                  pose, donc un quartier entierement a droite d un autre ne le
                  voyait jamais et les deux pouvaient porter la meme loi.
                  `verifierRegions` : toutes les cellules d une region portent SA
                  loi, deux voisines en portent deux — borne au pigeonnier quand
                  le theme a moins de lois qu il n y a de regions —, leurs bords
                  s accordent, et la carte montre autant de lois que le theme peut
                  en donner. 24 graines x 5 themes.
                  Supprimes : `BIOME_COMPOSE`, `lieuxDe`, `lieuIndexAt`,
                  `verifierCarte`, `bordsDe`, `lieuAt`, `lieuKeyAt`, `skinAt`,
                  `solDe`, `lieuxCourants`, `lieuxPortent`, `drawSeuils` et la
                  plaque de seuil. Aucun champ reseau ne bouge : `biome` porte un
                  index de theme, et il est maintenant TOUJOURS reel.
                  `Room.drawBiome` retrouve sa regle : deux manches de suite ne
                  montrent pas le meme theme.
                  Conception complete des 61 biomes dans
                  `docs/superpowers/specs/plan38/`.
    0.42.1 lot 2  LE BIOME SE VOIT, ET IL SE NOMME. Le lot 1 avait raison sur la
                  structure et invisible a l ecran : une loi d implantation ne
                  deplace que des blocs, et a une dizaine de blocs par ecran ca ne
                  se voit pas. Rapport de terrain : cinq regions traversees sans
                  qu un joueur remarque une frontiere, et un bandeau qui ne
                  changeait jamais de nom.
                  LE BANDEAU NOMME LA REGION (« Friche · Le cratere »). Une carte
                  etant d un seul theme, un bandeau qui ne portait que le theme ne
                  pouvait par construction JAMAIS changer — c etait le rapport de
                  bug, mot pour mot. Vingt etiquettes, vingt clefs anglaises.
                  L ACCENT DE PALETTE, borne des DEUX cotes. Plancher : 2,0 de dE
                  entre deux regions d un theme, sinon la frontiere ne se voit pas.
                  PLAFOND : PAS UN NOMBRE, UNE APPARTENANCE — un ecart maximal en
                  dur ne veut rien dire, le dE grandissant avec la clarte (mesure :
                  a reglages egaux, de 1,2 a 27,6). Une region reste PLUS PROCHE de
                  la base de son theme que de toute autre, marge 1,15.
                  Il ne touche que le SOL et sa grille : `bloc` reste au theme —
                  une ruine de Friche est la meme partout, c est le VOCABULAIRE du
                  lieu — et il bouge trois fois plus vite en dE, c est lui qui
                  bridait tout. Deux valeurs sortent de la MESURE : assombrir
                  l Usine la fait marcher vers la Nebuleuse (5,4 de sa base pour
                  6,0 du vide), donc son atelier se dit par l huile ; et la
                  Nebuleuse est si sombre que tout ce qui l eclaircit va vers
                  l Usine et tout ce qui la violette va vers le Secteur — son trio
                  sort d une recherche numerique, ecart minimal 3,0.
                  L AIR D UNE REGION (`AIR[theme][loi]`) : combien, gros comment,
                  quelles zones de props, quelles traces au sol. Le theme garde son
                  vocabulaire, la region n en tire qu une part — c est la
                  difference entre « un autre lieu » et « un autre endroit du meme
                  lieu ». Remplace `MATIERE`, qui etait par theme.
                  LE NOMBRE DE REGIONS SE TIRE, entre 3 et 6 : cinq a chaque partie
                  donnait un rythme de traversee fixe. L ecart entre germes suit
                  leur nombre — fixe, il epuisait ses trente-deux essais a six et
                  posait un quartier d une cellule. Et une region d un seul tenant
                  se REPARE au lieu de retirer le bruit : sans bruit les frontieres
                  sont les bissectrices des germes, donc des droites.
                  `verifierAccents` (plancher, plafond, appartenance) et
                  `verifierTraces` reecrit sur `AIR` — il refuse aussi qu une zone
                  de props ne soit tiree par aucune region. 55 verificateurs.

    0.43.0 lot 1  LE SOL EST CELUI DE LA REGION. Ouverture du plan 39. Trois
                  mesures ont ouvert l audit, et aucun des 55 verificateurs ne les
                  signalait : les 20 regions emploient LES TROIS familles baties de
                  leur theme, une arene de 81 vues ne contient que 16 arrangements
                  distincts, et quatre themes sur cinq ont deux regions au
                  vocabulaire de props IDENTIQUE.
                  `floorPattern` n avait pas d argument de region : une arene de
                  14400 x 8100 avait UN sol, et le sol est la plus grande surface
                  de l ecran. Le theme donne la MATIERE, la region donne le
                  TRAITEMENT — douze passes fermees posees sur la tuile du theme,
                  dans sa palette. Il vaut a TOUS les paliers de `gfx` : c est de
                  la DA, pas de la qualite ; seule la densite des grains suit.
                  LA REGION ENTRE DANS LA FAMILLE DE LA CLEF DE CACHE, pas apres
                  elle — `motif()` jette ce dont le RESTE differe, donc chaque
                  cellule aurait vide le cache de sa voisine. `CACHE_MAX` 5 -> 8.
                  Mesure : traversee de quatre regions, 0,212 ms a froid puis
                  0,014 ms, x15.
                  `verifierMatiere` refuse deux regions d un theme au meme
                  traitement — c est le premier verificateur du depot qui COMPARE
                  deux regions — et un traitement que plus rien ne tire.
                  `verifierDessin` cuit les vingt regions explicitement : ses
                  quatre points de vue ne voient que ce que le tirage a pose.

    0.43.1 lot 2  LA TRAME — CE QUI A LA TAILLE D UN QUARTIER. Le depot n avait
                  que DEUX echelles, le bloc (40 a 420 px) et le prop (20 a
                  140 px), pour une vue de 1600 x 900 : rien n avait la taille d un
                  ecran, donc rien ne se reconnaissait de loin et une region ne
                  pouvait etre qu un rangement. Le plus grand objet passe de 504 px
                  a 3680, et 4 a 9 objets par arene couvrent au moins une vue.
                  Cinq primitives — ruban, nef, peigne, couronne, crible — tirees
                  UNE FOIS par region, en coordonnees de QUARTIER : une table de
                  `poser` est en fractions de cellule, donc periodique par
                  construction. La FAILLE attend sa silhouette de vide : une faille
                  rendue en bloc plein serait un mensonge.
                  ELLE PREND SA PART DU MEME BUDGET. `OBSTACLE_SURFACE_MAX` reste
                  le plafond de tout ; la trame se sert d abord (0,030) et les
                  cellules remplissent le reste. Pire cas 0,0743 -> 0,0844, donc le
                  plafond n est jamais atteint et rien n est evince.
                  ON DECOUPE, ON NE JETTE PAS. Rejeter un bloc entier des qu il
                  touche un danger faisait perdre la MOITIE de la trame en
                  cauchemar (1,82 % -> 0,75 % a la Fonderie) : le mode le plus tendu
                  etait le moins lisible. Apres, 1,5 a 2,4 % dans les trois modes et
                  le nombre de blocs MONTE avec la difficulte.
                  Deux defauts trouves par les verificateurs et pas a l oeil : 207
                  paires de blocs qui se traversent (la boite englobante d un
                  quartier n est pas le quartier — il est d un seul tenant mais pas
                  convexe) et 332 fentes aveugles de 33 px (jeter ce qui se traverse
                  ne suffit pas, il faut `TRAME_GARDE` = 88 px).
                  `verifierTrame` : une trame par loi, jamais la meme dans deux
                  regions d un theme, une famille du lieu, une primitive que
                  personne ne tire, et une trame qui ne pose AUCUN bloc sur des
                  arenes reelles. 56 verificateurs.

    0.43.2 lot 3  UNE FAMILLE BATIE EST UN COUPLE, PAS UN DESSIN. `forme` et
                  `habit` etaient dans la meme entree, donc 1:1 : quinze familles,
                  quinze formes, quinze habillages, aucun reemploi possible. Un
                  conteneur n existait qu une fois, dans le Secteur.
                  Separes, ils se composent : `BLOC[biome][kind]` devient
                  { sil, hab, hors? } ou `sil` indexe SILHOUETTE (la forme, ce que
                  la collision AABB doit remplir) et `hab` indexe HABILLAGE (la
                  matiere et son usure). Une meme barre portera de la tole peinte a
                  l Usine et du givre a la Nebuleuse : deux familles, un dessin de
                  forme, deux de matiere.
                  ZERO PIXEL CHANGE. Les trente fonctions sont celles d avant, aux
                  memes appels et dans le meme ordre ; seule la table change de
                  forme. C est le lot de PLOMBERIE qui rend la bibliotheque de
                  biomes payable — le couple 1:1 demandait un dessin par famille.
                  `verifierBlocs` croise les trois tables dans les DEUX sens : une
                  fiche qui nomme une silhouette absente repliait sur `caisson` en
                  silence, et une silhouette que plus rien ne tire est un dessin
                  mort qu on entretient.

    0.43.3 lot 4  DEUX REGIONS AU MEME VOCABULAIRE SONT UNE SEULE REGION, et
                  c etait le cas de QUATRE THEMES SUR CINQ. `AIR[...].zones` etait
                  tire dans un ORDRE different — usine [2,1] contre [1,2],
                  nebuleuse [0,2] contre [2,0], secteur [0,1] contre [1,0] — et
                  l ordre ne change rien a un ENSEMBLE : les deux regions posaient
                  exactement les memes props et ne differaient plus que par `dens`
                  et `ech`, un nombre et un calibre. La friche faisait pire :
                  [2,1] contre [0,2,1], donc une region STRICTEMENT INCLUSE dans
                  l autre. Les MATIERES avaient le meme defaut sur les memes
                  themes, la Nebuleuse deux fois.
                  `verifierZones` repond « tout est branche », `verifierTraces`
                  aussi ; AUCUN ne repond « tout est different », et les deux
                  etaient verts. `verifierVocabulaire` compare les regions DEUX A
                  DEUX — le premier verificateur du semis a le faire.
                  LE SEUIL EST L IDENTITE, PAS UNE FRACTION. Un theme n a que
                  quatre zones : deux regions qui en tirent deux en partagent une
                  dans quatre cas sur six, donc 0,4 a 0,6 de Jaccard est le mieux
                  que la table permette. L ecart maximal sort AVEC le verdict, et
                  c est lui qui dira quand le plafond peut descendre.
                  57 verificateurs.

    0.43.4 lot 5  LES DEUX GARDE-FOUS QUI EMPECHAIENT DOUZE REGIONS PAR THEME.
                  LE PLAFOND GEOMETRIQUE EST SUPPRIME, et c est une mesure qui l a
                  dit : `verifierVariantes` refusait deux regions divergeant de
                  plus de 40 % sur l un des quatre axes de `verifierLois`. Or ces
                  axes ne portent pas l identite d un theme — en distance
                  normalisee au centroide, TROIS regions sur vingt sont deja plus
                  proches du centroide d un AUTRE theme que du leur (atelier 0,49,
                  cuves 0,98, mur 0,72). Le plafond ne les voyait pas parce qu il
                  comparait deux a deux ; une cinquieme region un peu plus vide
                  l aurait fait rougir sur une conception juste.
                  Ce qui tient un theme est ailleurs et deja verifie : la charte
                  est par theme PAR CONSTRUCTION, et le vocabulaire l est aussi
                  (`verifierBiomes`, `verifierTrame`, `verifierBlocs`). La
                  geometrie doit etre LIBRE — c est ce qui separe deux endroits
                  d un meme monde. Le PLANCHER reste, sur ses six axes.
                  UNE CLEF EST UN IDENTIFIANT, JAMAIS UN RANG. `loiNom` composait
                  `biome.<lieu>.loi<i>` : reordonner `OBSTACLES` reecrivait TOUS
                  les noms affiches, dans les deux langues, sans qu une ligne de
                  traduction ne bouge et sans qu aucun verificateur ne le voie.
                  Chaque region porte sa `cle`.
                  ET UNE TRADUCTION MANQUANTE NE SE SIGNALE JAMAIS : `t()` replie
                  sur le francais. `clefsDe(code)` (`i18n.js`) est le point
                  d entree qui permet a un verificateur de LIRE le dictionnaire ;
                  `verifierVariantes` refuse une region sans nom anglais.

    0.43.5 lot 6  LES DEUX PREMIERES REGIONS A POSSEDER UN OBJET. Le magasin et
                  l expedition ouvrent l Usine a SIX regions, et ce sont les deux
                  premieres du depot a porter une SIGNATURE — une famille batie
                  que personne d autre du theme n emploie. Avant : zero region sur
                  vingt, les vingt employant LES TROIS familles de leur theme.
                  Quatre familles neuves : palettier (une travee ajouree, dont la
                  repetition EST la silhouette), pile, quai (arete accostable,
                  butoirs, bande hachuree) et remorque.
                  LA REMORQUE EST LE PREMIER REEMPLOI DU COUPLE : c est le CHASSIS
                  de la Friche avec une matiere peinte au lieu d une carcasse
                  rouillee. Une silhouette, deux themes, deux lectures — ce que le
                  couple 1:1 rendait impossible.
                  LE COUPLE DE TRAME REMPLACE LE TYPE. Cinq primitives ne peuvent
                  pas donner douze regions distinctes, et ce n est pas la bonne
                  question : un peigne de racks et un peigne de quais ne se
                  ressemblent pas. On refuse le doublon ENTIER, structure ET
                  vocabulaire.
                  LE DANGER COMMANDE LA TABLE. Trois familles sur quatre tombaient
                  sur un danger en cauchemar (41 travees, 46 piles, 37 quais sur
                  cinq graines) : ce mode porte une braise qui BALAIE 420 px en x.
                  Les rangs se calent sur les creux, et la remorque passe de 0,150
                  a 0,130 — a 0,150 son nez entrait dans le balayage.
                  `verifierEmpreinte` EXISTAIT, ETAIT EXPORTE, ET PERSONNE NE
                  L APPELAIT. Il entre dans la suite (52 ms) : une silhouette qui
                  ne remplit pas son rectangle fait buter sur du vide, et c est
                  exactement ce qu une silhouette NEUVE risque. 58 verificateurs.

    0.43.6 lot 7  L USINE PASSE A SEPT REGIONS, DONT QUATRE POSSEDENT UN OBJET.
                  L atelier devient LA MAINTENANCE : son nom promettait des
                  etablis et il posait des armoires en petit. Deux familles a
                  elle — l ETABLI, bas et long, et la MACHINE OUVERTE, dont les
                  capots sont poses A COTE : un objet qui raconte qu on l a
                  demonte, et rien d autre du depot ne le fait.
                  LES UTILITES ouvrent le premier obstacle qui BLOQUE LE CORPS
                  SANS CACHER LA VUE — la claire-voie. Comportement inedit,
                  immediatement lisible, et c est toute l identite de la region.
                  Le cadre est la silhouette la plus reutilisee du dossier ; elle
                  a sa regle : elle n est JAMAIS habillee d un vide.
                  DEUX REEMPLOIS DU COUPLE : la remorque est le chassis de la
                  Friche, le transformateur est le fut de la Fonderie. Deux
                  recipients a la meme silhouette, et ce sont les AILETTES qui
                  disent lequel.
                  `verifierEmpreinte` a refuse la machine ouverte a 11,8 % pour
                  un seuil de 10 : l echancrure passe de 0,30 a 0,19. Il venait
                  d entrer dans la suite au lot 6, et c est exactement ce qu une
                  silhouette echancree risque.
                  Quatre regions de l Usine sur sept ont une signature, contre
                  zero sur vingt a l ouverture du plan. 58 verificateurs.

    0.43.7 lot 8  LA FONDERIE : LE REFROIDISSEMENT REFROIDIT. C etait le plus gros
                  ecart du depot entre un nom et un pixel — la region s appelait
                  « refroidissement » et il y faisait aussi chaud qu a la coulee :
                  meme teinte, meme emissif, meme sol, memes trois familles. Elle
                  porte maintenant des BASSINS de trempe, une eau calme dans un
                  lieu orange, seule matiere froide du theme.
                  « Les cuves » deviennent LA SABLERIE : deux tailles d un meme
                  octogone ne font pas deux endroits. Des chassis de sable POSES
                  AU SOL, rien qui monte — la seule occupation basse du depot,
                  donc le seul endroit ou la ligne de vue et la ligne de marche
                  divergent.
                  LE CADRE SERT DEJA DEUX THEMES : claire-voie a l Usine, chassis
                  de sable a la Fonderie. Une silhouette qui laisse voir a travers
                  n a pas qu un usage.
                  Deux defauts trouves par les verificateurs et pas a l oeil : le
                  four et le chassis se traversaient sur 120 x 45 px (1410 paires
                  sur 50 graines), et la conduite a 0,10 laissait 68 px jusqu au
                  bord de cellule. Six regions sur vingt-trois ont une signature.

    0.43.8 lot 9  LA FRICHE : LE CRATERE SANS CRATERE. Le nom decrivait une
                  disposition et promettait un objet — ni sol brule, ni bourrelet,
                  ni pente. Il devient LA CASSE : des piles d epaves, seul
                  empilement vertical du theme et seule chose du depot qui monte
                  en s ecartant de l aplomb.
                  LE CHANTIER arrive : grille de poteaux nus, fers en attente,
                  banches. Le seul endroit du theme ou ce qui est la soit NEUF et
                  deja mort — il dit INACHEVE la ou tout le reste dit DETRUIT, et
                  c est la region la plus ouverte de la Friche.
                  LE CADRE SERT TROIS THEMES SANS UN DESSIN DE PLUS : claire-voie
                  a l Usine, chassis de sable a la Fonderie, grillage de casse a
                  la Friche. La palette du lieu suffit a les separer.
                  `verifierEmpreinte` a refuse la banche a 15,6 % : elle portait
                  la silhouette `mur_bas`, dont les creneaux disent qu un mur a
                  CASSE. Le verificateur a attrape un mensonge de forme en meme
                  temps qu un vide de collision.
                  Huit regions sur vingt-quatre ont une signature.

    0.43.9 lot 10 LA NEBULEUSE : DEUX REGIONS QUI N ETAIENT QU UN FACTEUR
                  D ECHELLE. « Le champ d epaves » etait la derive avec des eclats
                  plus petits, « les grands fragments » la derive a `ech` 1,30 —
                  et le commentaire d `OBSTACLES` l interdisait deux cents lignes
                  plus haut : un facteur d echelle donne la meme arene grossie.
                  Elles deviennent LE DOCK — bras d amarrage en file et COQUES qui
                  SORTENT DU CADRE, seul objet du depot plus grand que ce qu on en
                  voit — et LA COURSIVE, le seul sol PLEIN du theme. Sans elle,
                  « depressurise » ne veut rien dire.
                  Trois defauts, trois verificateurs, aucun visible a l oeil : le
                  dock portait un BORD_MUR face a celui de la coursive, donc
                  l assembleur REPETAIT une loi (3 lois pour 5 regions) ; la
                  console tombait dans le fragment sur 80 x 23 px, 904 paires sur
                  50 graines ; et la derive partageait 71 % de ses props avec le
                  dock, la coursive 83 %.
                  Dix regions sur vingt-quatre ont une signature.

    0.43.10 lot 11 LE SECTEUR, ET LES VINGT-QUATRE REGIONS DU DEPOT. « La place »
                  posait le MEME catalogue de props que la rue dans un autre
                  rangement — l une des quatre paires identiques mesurees a
                  l ouverture du plan. Elle devient LA RUELLE : aucune vitrine,
                  des MURS AVEUGLES (la seule famille du Secteur qui n emette pas,
                  dans le seul lieu ou neuf blocs sur dix emettent) et des
                  escaliers de secours. Meme theme, meme palette, contraste
                  maximal.
                  Le MARCHE a enfin des ETALS — il posait des conteneurs, donc des
                  caisses — et le PARVIS son MONOLITHE, seul objet du depot sans
                  aucun detail : dans un lieu ou tout est une surface qui vend, ce
                  qui ne dit rien est ce qui impressionne.
                  BILAN DES SIX LOTS DE CONTENU : 13 regions sur 24 possedent une
                  famille exclusive, contre 0 sur 20 a l ouverture. Les onze
                  restantes sont exactement celles que le dossier appelle des
                  ARRANGEMENTS et non des biomes.
                  23 familles neuves pour DIX silhouettes, dont cinq reemployees
                  telles quelles : un `caisson` porte l etabli, le bassin, la
                  coque, la cloison, la console, le mur aveugle, l escalier et le
                  monolithe — huit lectures, un dessin de forme.

    0.43.11 lot 12 UNE TRACE A UNE SOURCE, ET ELLE EXISTAIT DEJA. `sonder`
                  balayait les obstacles, gardait le plus proche, en tirait un
                  quartier et JETAIT sa position — alors qu une trace n est pas un
                  motif, c est la consequence de quelque chose qui est encore la.
                  Mesure : une trace n est posee que si ce balayage rend un
                  quartier, donc QUE si un bloc est a moins de 90 px — 18 a 30 %
                  des cellules selon le theme. La source etait toujours
                  disponible, aucune primitive ne s en servait.
                  LE CENTRE D UN BLOC N EST PAS SA SOURCE : une bande de trame
                  fait jusqu a 3680 px, donc son centre peut etre a dix-huit cents
                  pixels d une trace qui la touche. On garde le POINT LE PLUS
                  PROCHE DU RECTANGLE.
                  Deux primitives qui s en servent : l AUREOLE entoure ce qui a
                  deborde puis seche, la COULEE en part et maigrit — la seule
                  marque au sol du depot qui porte un SENS.
                  DEUX REGLES ECRITES PUIS RETIREES DANS LE MEME LOT. Une table de
                  classe dont le seul lecteur etait un controle de completude SUR
                  ELLE-MEME — ce qu elle disait est porte par la signature. Et une
                  regle « il faut une trace libre » qui protegeait d un cas
                  IMPOSSIBLE, le terrain libre n en portant aucune de toute facon.
                  Une regle qui garde un cas impossible fait croire qu on a
                  verifie.

    0.43.12 lot 13 LE PUITS A ENFIN UN TROU. Le depot ne savait dessiner que du
                  PLEIN, et trois de ses regions portaient un nom de vide : le
                  cratere (corrige en 0.43.8), la breche, et le puits — qui posait
                  deux fours colles.
                  `creux` sur la fiche fait sauter a `drawObstacles` les DEUX
                  passes qui font lire un volume : l ombre portee et le corps
                  decale vers la camera. Restent le contour et l habillage, qui
                  porte seul la profondeur — parois eclairees du cote oppose a la
                  lumiere, fond qui s assombrit vers le centre.
                  LA FOSSE BLOQUE LES TIRS, ET C EST UNE DECISION : la rendre
                  traversable demanderait que la simulation lise `kind`, or `kind`
                  ne circule pas et le serveur ne le lit JAMAIS. L invariant passe
                  devant l effet.
                  `fosse()` employait `lumDir` sans l importer dans `blocs.js` —
                  un identifiant utilise DANS une fonction ne leve qu a l APPEL,
                  donc `node --check` passe et les 31 modules chargent. Seul
                  `verifierDessin` l a vu, mot pour mot le defaut de `drawGrid`
                  en 0.41.1. Quatorze regions sur vingt-quatre ont une signature.

    0.43.13 lot 14 LA PREMIERE OBLIQUE DU DEPOT. Tout le jeu etait horizontal ou
                  vertical, et pour une bonne raison : `verifierEmpreinte` refuse
                  une forme qui ne remplit pas son rectangle, la collision etant
                  une AABB — une masse penchee ferait buter sur du vide sur toute
                  la surface de ses coins.
                  Le macro `oblique` DEPLIE EN ESCALIER : trois a huit AABB,
                  chacune remplissant la sienne. Releve sur l arene reelle, quatre
                  marches de 104 x 32 decalees de 22 px — moins que `ep`, donc
                  aucune fuite entre marches, et intervalles disjoints sur l axe
                  long, donc aucune superposition. Le depliage est en fractions de
                  cellule, donc cache et jamais recalcule.
                  `gabaritsDe` lisait la pose NON DEPLIEE : une entree oblique n a
                  ni `w` ni `h`, donc le verificateur jugeait la silhouette sur
                  NaN x NaN et rendait 100 % de vide.
                  ET LA POUTRE EST A L USINE, PAS A LA FRICHE qui a pourtant la
                  charpente : la Friche tremble de +/- 40 px par cellule et la
                  meme poutre y fermait 3 a 11 cases inatteignables sur quatre
                  graines. Une marge qui tient sans tremblement ne tient pas avec.

    0.43.14 lot 15 LE CATALOGUE ETAIT LE GOULOT, PAS LE RANGEMENT. Sept regions
                  d Usine pour QUATRE quartiers de props : deux d entre elles
                  partageaient 67 % de leur inventaire, et ajouter des zones SANS
                  ajouter de props n aurait rien change — les memes objets,
                  redistribues.
                  Dix props neufs — gerbeur, transpalette, cale, servante, carter,
                  coffret HT a l Usine ; pneus, moteur depose, parpaings, plot a
                  la Friche — et ces deux themes passent a SIX quartiers. Le pire
                  recouvrement du depot tombe de 67 % a 63 %.
                  DEUX SUR-ENSEMBLES TROUVES PAR LA MESURE : les utilites a
                  zones [5,3] CONTENAIENT la maintenance, et le degagement a
                  [1,5] contenait les utilites. Un sur-ensemble n est pas une
                  variation. Les deux passent a un seul quartier — un inventaire
                  ETROIT est une identite, pas un manque, et c est ce qui rend la
                  maintenance, les utilites et le chantier reconnaissables.
                  63 % reste le plafond du catalogue : a quatre props par quartier
                  et deux quartiers par region, deux regions qui partagent un
                  quartier partagent la moitie de leur inventaire.

    0.43.15 lot 16 UN REPERE UNIQUE NE REPERAIT RIEN. L amer etait visible dans
                  QUATRE VUES SUR QUATRE-VINGT-UNE : sur 14400 x 8100 c est un
                  point qu on ne rencontre presque jamais, donc il ne servait pas
                  a se situer. Il y en a maintenant UN PAR QUARTIER — 5,3 par
                  arene en moyenne.
                  ET TROIS FOIS LE MEME DESSIN NE REPERE PAS DAVANTAGE : c est ce
                  qui avait fait reporter ce lot une premiere fois. Chaque amer
                  porte une VARIANTE — le compte de sa repetition radiale et son
                  element central — et la rotation acheve de les separer. Trois et
                  pas douze : au-dela, chacune coute un dessin entier pour un
                  objet vu quatre fois par partie.
                  DEUX MESURES ONT CORRIGE LE PREMIER JET. La boite d un quartier
                  est quatre fois plus petite que l arene, donc quatorze candidats
                  y sont trop serres — la Friche en cauchemar tombait a 177 px
                  d un danger pour une garde de 187, et vingt-huit points la
                  degagent. Et deux quartiers voisins ont des boites qui SE
                  RECOUVRENT (une region est d un seul tenant mais pas convexe),
                  donc deux reperes tombaient cote a cote : `verifierAmers` refuse
                  une paire a moins de leur diametre.
                  Chaque variante se dessine vraiment : le dessin est cull par
                  `inView`, donc une branche peut n etre jamais atteinte par les
                  quatre points de vue de `verifierDessin`.

    0.43.16 lot 17 LE MIROIR D UNE CELLULE ETAIT A MOITIE MORT. `my = (cx*2+cy)&1`
                  vaut `cy&1` — `cx*2` est pair — donc les DEUX miroirs avaient la
                  meme periode de deux cellules, et le bati se repetait tous les
                  deux ecrans REGULIEREMENT. Deux bits d un hachage de
                  (cx, cy, graine) les rendent independants.
                  CE QUE CA N AJOUTE PAS, ET LE DOSSIER SE TROMPAIT DESSUS : il n y
                  a que QUATRE combinaisons (mx, my), donc le nombre
                  d arrangements distincts vaut « lois presentes x 4 » — 16 hier,
                  21,3 aujourd hui parce qu une carte montre 5,3 lois. Le hachage
                  n en cree aucun.
                  CE QU IL ENLEVE, MESURE : deux cellules distantes de deux
                  portaient la MEME disposition dans 100 % des cas, en x comme en
                  y ; apres, 28 % et 25 %, soit le hasard pur. La repetition
                  existe toujours, elle n est plus REGULIERE — et c est ca qu on
                  voyait, pas le nombre.
                  IL A EXPOSE UN DEFAUT LATENT. Une epave a y = 0,94 tombe a 27 px
                  de sa jumelle miroitee de la cellule voisine ; la Friche est le
                  seul theme qui tremble, deux cellules se decalent de 40 px
                  CHACUNE, et l ecart se referme — 17 paires qui se traversent sur
                  cinquante graines, jusqu a 108 x 44 px. La garde y vaut
                  2 x jMax + PASSAGE_MIN = 160 px, et la casse passe de cinq piles
                  a trois.

    0.43.17 lot 18 LES CINQ THEMES ONT CINQ REGIONS. Fonderie, Nebuleuse et
                  Secteur n en avaient que quatre. LE LAMINOIR — une file de
                  cages, la seule region ou tout tient sur une ligne. LE CHANTIER
                  ORBITAL — des membrures qui BLOQUENT SANS CACHER, l inverse
                  exact de la brume. LES CAPSULES — un mur d alveoles dont chacune
                  a sa lumiere, seul damier lumineux d un theme fait de grandes
                  enseignes.
                  LE CENTRE D UNE CELLULE APPARTIENT AUX DANGERS, et ce lot l a
                  paye quatre fois. Le laminoir posait sept boites en travers avec
                  8 a 56 px d ecart — un MUR, donc un carre central
                  infranchissable : la table a rouleaux, pourtant juste
                  physiquement, est SUPPRIMEE, et les cages seules disent la meme
                  chose avec 360 et 264 px d ecart. Le chantier orbital posait six
                  poutres de 207 px en travers de deux dangers centraux : six
                  appuis de 108 px repartis dans les couloirs disent la meme
                  ossature — c est le RESEAU qui se lit, pas la longueur d une
                  piece. Et les deux passerelles des capsules ne se font plus
                  face, une passerelle de 384 px centree traversant forcement un
                  geyser ou la braise.
                  Dix-huit regions sur vingt-sept ont une signature.

    0.43.18 lot 19 LA SIXIEME PRIMITIVE DE TRAME, ET L USINE A NEUF REGIONS. La
                  FAILLE etait declaree dans le dossier et jamais posee : le
                  `creux` existait depuis 0.43.12 mais aucune trame ne tracait de
                  saignee a l echelle d un quartier. LE TRAITEMENT DE SURFACE la
                  paie — une tranchee de bacs traverse la region, franchie en
                  trois points. Elle est 2,4 fois plus epaisse qu un ruban et il
                  n y en a QU UNE : deux tranchees paralleles feraient une bande
                  impraticable entre elles.
                  LA ZONE ROBOTISEE ouvre le seul sol du depot SANS USURE, parce
                  que personne n y marche — un endroit propre dans une usine sale
                  dit tout.
                  LE MEME DEFAUT QUE `gabaritsDe`, UNE SECONDE FOIS.
                  `signatureVariante` lisait la pose NON DEPLIEE : une entree
                  oblique n a ni `w` ni `h`, donc `o.w * o.h` rend NaN, `surf`
                  devient NaN, et LES DEUX COMPARAISONS DE MIN ET DE MAX SONT
                  FAUSSES POUR UN NaN — l entree disparaissait de trois axes sur
                  six sans rien lever. Symptome : deux regions declarees
                  semblables a 13 % alors que leurs densites different de 36 %.
                  Vingt regions sur vingt-neuf ont une signature.

    0.43.19 lot 20 UNE TABLE PAR REGION SE LIT PAR CLEF, JAMAIS PAR RANG. `AIR`
                  et `SOL_REGION` etaient des tableaux indexes par RANG :
                  inserer une region au milieu d `OBSTACLES` decale toutes les
                  suivantes, donc chacune heritait des props ET du sol de sa
                  voisine. SIX REGIONS SUR NEUF a l Usine, DEUX SUR CINQ a la
                  Friche, et aucun des 58 verificateurs ne pouvait le voir : les
                  deux tables restaient completes et bien formees. C est ce que
                  `loiNom` a paye au lot 5, corrige LA SEULEMENT. `clesDe` et
                  `loiCle` sont le point de passage, et les deux verificateurs
                  croisent dans LES DEUX SENS.
                  LE RE-CLEFAGE A DECOUVERT UN DEFAUT DE CONTENU que le
                  desalignement masquait : le traitement a [3, 5] CONTENAIT la
                  maintenance [3], donc 67 %. Redistribuer ne pouvait rien — a
                  neuf regions pour six quartiers dont deux tires seuls, toute
                  paire les contenant contient une region, et les six paires de
                  {0,1,2,4} etaient prises. UN SEPTIEME QUARTIER : vanne, fut
                  sur retention, douche de securite. Le pire recouvrement
                  redescend a 63 %.
                  DEUX REGIONS NEUVES, le parc a minerai et le terrain repris,
                  et la premiere forme MOLLE du depot. UNE FORME RONDE NE PEUT
                  PAS PASSER `verifierEmpreinte` : un contour circulaire inscrit
                  laisse 1 - pi/4 = 21,5 % de vide pour un seuil de 10 %. Elle
                  parcourt donc le PERIMETRE de sa boite avec un retrait.
                  Vingt-deux regions sur trente et une ont une signature.

    0.43.20 lot 21 LES NEUF REGIONS D ORIGINE N AVAIENT AUCUN OBJET A ELLES.
                  Neuf regions sur trente et une n employaient que des familles
                  partagees, et ce sont exactement les regions D ORIGINE de
                  chaque theme — celles que sept lots de contenu avaient laissees
                  intactes. Trois paires batissaient meme avec un jeu de familles
                  STRICTEMENT EGAL. NEUF FAMILLES NEUVES, ZERO SILHOUETTE NEUVE :
                  `caisson` en porte cinq, `cadre` deux, `masse_molle` deux.
                  Trente et une regions sur trente et une ont maintenant une
                  famille a elles, et `verifierSignature()` le tient — plancher
                  ZERO, et il est arithmetique : chaque theme porte plus de
                  familles que de regions. Le plafond de recouvrement (0,65)
                  garde contre la REGRESSION, la visee du dossier (0,50) reste
                  ecrite : le pire mesure est 0,60 et il est structurel.
                  UNE REGION SATUREE PREND SA SIGNATURE EN REMPLACANT, PAS EN
                  AJOUTANT. `signatureBiome` construit une arene d UNE cellule,
                  donc la region d origine EST la signature de son theme : deux
                  poses ajoutees a la coulee ont fait tomber la separation
                  fonderie/secteur de 41,7 % a 28,6 % pour un seuil de 40. Deux
                  cuves DEVENUES convertisseurs, a geometrie identique, ne
                  touchent aucun des quatre axes.
                  Et trois contraintes de position qui ne se voient pas dans la
                  table : les dangers ne sont PAS miroites alors que les poses le
                  sont, le tremblement mange la garde contre un BORD mais pas
                  contre un danger (un talus a 103 px du bord laissait une fente
                  de 64 px), et la garde de 80 px vaut aussi entre deux blocs de
                  la meme region.

    0.43.21 lot 22 LE NOYAU PARTAGE ETAIT UNE CONTRADICTION ECRITE DANS LA TABLE.
                  Le pire recouvrement bati tombe de 0,60 a 0,50 — la visee du
                  dossier — sur les 86 paires de regions, et sans une seule
                  famille neuve. Le defaut etait le meme dans les cinq themes :
                  un NOYAU de trois familles que deux ou trois regions
                  employaient TOUTES, plus une exclusive chacune, donc 3/5 quoi
                  qu on ajoute par ailleurs.
                  Et ce noyau n etait pas une contrainte d art : un FOUR dans le
                  refroidissement, un MUR dans le champ, une DEVANTURE au marche,
                  un PYLONE sur le parvis, un POSTE dans le degagement. Huit
                  poses changent de famille, aucune ne change de boite — chaque
                  substitution rend la region plus juste ET la separe.
                  UNE SUBSTITUTION DE `kind` A BOITE EGALE NE TOUCHE AUCUN AXE :
                  les six de `signatureVariante` et les quatre de
                  `signatureBiome` se lisent tous sur la GEOMETRIE. Les 59
                  verificateurs sont verts du premier coup, ce qu aucun lot de
                  contenu de ce plan n avait fait.
                  `SIGNATURE_MAX` passe de 0,65 a 0,50 : le seuil n est plus
                  au-dessus de la mesure.

    0.43.22 lot 23 POSSEDER UN OBJET N EST PAS LE MONTRER. `verifierSignature`
                  dit qu une region POSSEDE une famille batie a elle ; il ne dit
                  pas qu on la VOIT, et le cahier des charges demande l autre.
                  `verifierVue()` est le test du screenshot rendu mecanique : on
                  balaie les 81 vues d une arene reelle, cinq graines et deux
                  modes, et on compte celles qui montrent au moins une piece de
                  la famille exclusive de la region qui les couvre. Plancher
                  90 % PAR REGION — une moyenne cacherait une region invisible
                  une fois sur cinq. Mesure : 99,8 %, la plus basse a 95,9 %.
                  CE QUI FAIT MANQUER UNE VUE EST LE BUDGET, PAS LA TABLE.
                  `buildBiome` jette un bloc des que la surface batie de l ARENE
                  depasserait `OBSTACLE_SURFACE_MAX`, et il parcourt les cellules
                  DANS L ORDRE : ce qui tombe vient en dernier, et le premier a
                  tomber est le PLUS GROS. Le puits demandait 15,5 % d une
                  cellule pour un plafond d arene de 10 %, donc il ne pouvait pas
                  etre bati tel qu ecrit — a la graine 42 la Fonderie plafonne a
                  10,00 % et perd sa FOSSE, la seule chose qui nomme la region,
                  14 fois sur 172. Les deux poses retirees sont celles du
                  vocabulaire PARTAGE, donc le correctif separe aussi : 95,9 % de
                  vues signees et 20 % de bati commun avec le refroidissement au
                  lieu de 40.
                  Preuve que le verificateur mord : `OBSTACLE_SURFACE_MAX` a
                  0,075 sort quatre regions de la Fonderie, la coulee a 77,6 %
                  et le puits a 65,7 %.

    0.43.23 lot 24 LA MOITIE DES MATIERES DE TRACE ETAIENT INJOIGNABLES. Les neuf
                  primitives qui manquaient sont ecrites — vingt au total —, et
                  en les branchant on decouvre que la moitie des matieres deja
                  ecrites ne sortaient jamais. Deux defauts empiles, aucun
                  visible : `matieres[mq % n]` indexait par le numero de QUARTIER
                  du theme et non par la position dans les zones tirees, et
                  surtout un quartier de PROPS n a aucune raison d etre un
                  quartier de BATI — 24 regions sur 31 tiraient une zone dont
                  elles ne posaient aucun bloc, donc leur seconde matiere etait
                  strictement inatteignable. `verifierTraces` la voyait tiree,
                  DANS LA TABLE.
                  LA CORRECTION EST UNE REFONTE : une trace est la consequence de
                  ce qui est ENCORE LA. `matieres[0]` dit ce que la region fait
                  au sol partout, `matieres[1]` ce que SON objet lui fait.
                  `SONDE.kind` porte la famille du bloc le plus proche (deja
                  calculee et jetee), `LI.sig` vient d `exclusivesDe`, et
                  `verifierVue` garantit que la signature se voit dans 90 % des
                  vues — donc la seconde matiere est atteignable partout ou elle
                  est ecrite. Le nombre de matieres n est plus lie au nombre de
                  zones : une ou deux, jamais une par zone.
                  `tracesManquees()` rend le controle mecanique, sur le modele de
                  `sonsManques()` : on mesure ce qui est VRAIMENT dessine. Deux
                  primitives sur vingt ne l etaient par aucune des soixante vues,
                  les deux tables vertes. Vingt sur vingt maintenant.

    0.43.24 lot 25 NEUF REGIONS PORTAIENT LA TRAME D UNE AUTRE. `TRAMES` etait la
                  TROISIEME table indexee par rang, apres `loiNom` au lot 5 et
                  `AIR`/`SOL_REGION` au lot 20 — meme mecanique, meme silence, et
                  cette fois sur la plus grosse structure de l ecran : une bande
                  de trame va jusqu a 3 680 px. Six regions sur neuf a l Usine,
                  trois sur six a la Friche.
                  ET SIX D ENTRE ELLES BATISSAIENT AVEC LA FAMILLE EXCLUSIVE
                  D UNE VOISINE : la zone robotisee batissait des bacs de
                  traitement, le degagement des palettiers de magasin. L
                  exclusivite que `verifierSignature` declarait etait donc fausse
                  EN JEU, parce qu il ne lisait que `poser` et jamais la trame.
                  `familles()` compte desormais le `kind` de la trame — ce qui
                  est pose est pose, quel que soit le systeme qui l a pose — et
                  `verifierTrame` refuse qu une region batisse sa trame avec une
                  famille qu elle ne pose pas elle-meme, en croisant la table
                  dans LES DEUX SENS. Le pire Jaccard bati reste 0,50 une fois la
                  trame comptee.
                  Effet de bord revelateur : `verifierVue` sort alors le
                  degagement a 83,3 % pour un plancher de 90 — sa charpente
                  tombee est sa seule famille a elle et elle n avait qu UNE pose.

    0.43.25 lot 26 LE SECTEUR PASSE DE CINQ REGIONS A HUIT. Premier lot de contenu
                  depuis que les six tables par region sont TOUTES indexees par
                  clef : l ajout ne decale plus rien.
                  LE PARKING est le seul endroit du depot ou les masses soient
                  RANGEES — sol lisse, vehicules bas et larges, on voit
                  par-dessus et on ne passe pas au travers. LA STATION est la
                  seule region dont l architecture soit une REGLE et non une
                  installation : une file de tourniquets, intervalles de 112 px,
                  donc jamais un goulot. LE POSTE DE CONTROLE est la seule
                  composition qui impose un detour sans rien fermer : trois
                  chicanes decalees, aucune bloquante.
                  Quatre familles neuves, ZERO silhouette neuve : `conteneur`
                  porte le vehicule, `cadre` le tourniquet, `caisson` la barriere
                  et la guerite.
                  AJOUTER UNE REGION PEUT RETIRER SA SIGNATURE A UNE VOISINE : la
                  station posait des abribus, et l abribus etait la seule famille
                  que la rue eut a elle. `verifierSignature` l a dit tout seul.
                  Et `mur_bas` a ete refuse pour la barriere — ses creneaux
                  disent qu un mur a CASSE, un bloc de chicane est MOULE, et a
                  144 x 27 ils mangent 11,5 % du rectangle pour un seuil de 10.
                  34 regions, 34 signatures, pire Jaccard bati inchange a 0,50.

    0.43.26 lot 27 LA NEBULEUSE PASSE DE CINQ REGIONS A HUIT. La serre (sol
                  vegetal, bacs de culture en cadres) est la seule chose VIVANTE
                  hors de la Friche : la couleur dit qu on a change d endroit
                  avant qu on ait identifie un objet. Le reacteur porte le TORE,
                  seule masse intacte et refermee d un theme fait d aretes
                  cassees — son interieur n est PAS un trou, la silhouette
                  remplit son rectangle et c est la bande claire qui dit
                  l anneau. Le champ d antennes est la seule region du depot dont
                  les masses aient une ORIENTATION COMMUNE.
                  QUATRE ROUGES, ET TROIS DISAIENT LA MEME CHOSE : une region
                  neuve RETIRE sa signature a ses voisines — cloisons de la
                  coursive, consoles de la coursive, bras du dock, roche de la
                  derive. Et remplacer au hasard recree un NOYAU partage, ce que
                  le lot 22 a casse : chaque region neuve garde donc DEUX
                  familles, la sienne et la travee, qui n est exclusive a
                  personne.
                  LE QUATRIEME EST DE NOUVEAU LE CATALOGUE, PAS LE RANGEMENT. Le
                  champ d antennes a [0, 3] CONTENAIT le dock — 71 % pour un
                  plafond de 70 — et les six paires de quatre quartiers etaient
                  prises par les cinq regions d origine. Meme arithmetique qu a
                  l Usine au lot 20 : un CINQUIEME quartier, deux props neufs
                  (reflecteur, boitier), et il s appelle CE QUI ECOUTE. 12,5 %
                  apres.
                  37 regions, 37 signatures, 62 props tous atteints.

    0.43.27 lot 28 LA FRICHE PASSE DE SIX REGIONS A NEUF. La voie (sol mineral,
                  wagons a l arret) est la seule LIGNE DROITE du theme : la
                  Friche est faite de ce qui s est effondre au hasard, une voie
                  ferree a ete TRACEE. La decharge, ce sont des CUBES — un
                  effondrement produit des morceaux de toutes les tailles, ici
                  une machine a tout ramene au meme gabarit : le desordre est
                  accidentel, la decharge est un rangement. La halle eventree est
                  la seule region du depot ou une structure soit lisible A PLAT.
                  LA FRICHE EST LE THEME LE PLUS CHARGE EN DANGERS DU DEPOT, et
                  ca se paie dans la table : quatorze dangers en cauchemar plus
                  leurs quatre miroirs, et un tremblement de 40 px qui mange la
                  garde contre les bords. Une enveloppe de ferme de 0,31 x 0,15
                  n a AUCUNE position libre sur la cellule ; a 0,21 x 0,09 il en
                  reste deux. La halle porte donc deux fermes et non trois, en
                  sens INVERSE — deux charpentes ne s effondrent pas du meme
                  cote — et le peigne de la trame en pose d autres a l echelle du
                  quartier.
                  Le solveur de placement est plus strict que `verifierBiomes`,
                  et c est voulu : le verificateur mesure des arenes REELLES ou
                  le clipping au quartier peut ecarter une pose fautive, le
                  solveur teste les quatre miroirs contre TOUS les dangers des
                  deux modes. Trois positions passaient par chance.
                  40 regions, 40 signatures. Usine 9, Fonderie 6, Friche 9,
                  Nebuleuse 8, Secteur 8.

    0.43.28 lot 29 LA FONDERIE PASSE DE SIX REGIONS A NEUF. La modelerie est la
                  seule piece FROIDE ET SECHE du theme : on y taille les modeles
                  avant de fondre quoi que ce soit, et c est ce qui la rend
                  reconnaissable la ou tout brule. Elle reprend le PALETTIER du
                  magasin de l Usine — deux themes, une silhouette, du bois au
                  lieu de l acier. La cabine d ebarbage est le seul objet du
                  depot dont la fonction soit de CONTENIR ce qui gicle et non de
                  bloquer un passage. Le parc a brames est le contraire du parc a
                  minerai : meme fonction, deux etats de la matiere, et la
                  silhouette le dit — un tas n a pas d arete, une pile n a que
                  ca.
                  AJOUTER DES REGIONS LEGERES FAIT BAISSER LE BUDGET DU THEME, et
                  c est ce qui regle le defaut du lot 23 a la source : la
                  Fonderie passe de 9,46 % a 8,29 % de bati en cauchemar pour un
                  plafond de 10. Elle n y touche plus, donc `buildBiome` ne jette
                  plus rien et aucune signature ne disparait par manque de place.
                  Une allee de rayonnage ou l on ne passe pas n est pas une
                  allee : les gabarits espaces de 108 px pour 32 de haut ne
                  laissaient que 76 px, sous `PASSAGE_MIN`. Ils passent a 126 px
                  d ecart, soit 94 px libres.
                  43 regions, 43 signatures. Usine 9, Fonderie 9, Friche 9,
                  Nebuleuse 8, Secteur 8.

    0.43.29 lot 30 L USINE PASSE DE NEUF REGIONS A DOUZE, ET LE DEPOT GAGNE UN
                  TREIZIEME SOL. La cour est la premiere fois qu on est DEHORS
                  dans ce theme — les neuf autres regions sont des interieurs, et
                  rien d autre n a de terre battue. La chaudiere reprend
                  l OCTOGONE du four : ce qui contient une combustion n a pas de
                  coin, quel que soit le theme, et ce qui l en separe est la
                  BRIQUE. La borne de charge est a hauteur de genou, la seule du
                  theme, et son cable traine vers l engin ABSENT.
                  LE TREIZIEME TRAITEMENT DE SOL DEBLOQUE LES CINQ THEMES :
                  `verifierMatiere` exige un traitement different par region d un
                  theme, donc a douze traitements, DOUZE REGIONS PAR THEME etait
                  un plafond dur. `T_RESINE` le leve. C est aussi le seul sol du
                  depot qu on ait CHOISI pour sa couleur — les douze autres sont
                  ce que la matiere donne. Il a deux marques a lui : le LUSTRE
                  des passes de lisseuse et les CLOQUES, la seule usure du depot
                  qui soit un CONTOUR et non une tache.
                  Un rouge instructif : la maintenance et la charge posaient
                  EXACTEMENT les memes quatre props, toutes deux sur le quartier
                  de l entretien seul. On charge des ENGINS, donc la manutention
                  vient avec, et les deux se separent a 50 %.
                  46 regions, 46 signatures, 13 traitements de sol. Usine 12,
                  Fonderie 9, Friche 9, Nebuleuse 8, Secteur 8.

    0.43.30 lot 31 LE SECTEUR PASSE DE HUIT REGIONS A DOUZE, ET QUATRE VUES NE
                  SUFFISAIENT PLUS. Le parc porte la FONTAINE, troisieme creux
                  du depot et le seul qui soit PLEIN — la fosse et le bac sont
                  des vides. La tremie est la seule composition du jeu qui donne
                  un SENS a une cellule : deux murs de soutenement qui se
                  rapprochent, contreforts d un seul cote. La berge est la seule
                  fois du depot ou le hors-champ soit une information : des
                  bittes alignees le long d un bord, et rien au-dela. Le hall
                  est le seul interieur PROPRE du Secteur.
                  Un CINQUIEME quartier de props, et c est la troisieme fois que
                  l arithmetique le demande apres l Usine au lot 20 et la
                  Nebuleuse au lot 27 : quatre quartiers donnent six paires, et
                  a douze regions elles sont epuisees bien avant. Celui-ci est
                  LE MOBILIER URBAIN — banc, jardiniere, corbeille.
                  QUATRE POINTS DE VUE NE SUFFISAIENT PLUS A `verifierDessin` :
                  a douze regions par theme, trois graines et quatre vues, une
                  region sur douze pouvait n etre atteinte par AUCUNE vue, et
                  avec elle sa trace et ses props. `TRACE_EMPREINTE` a disparu
                  du balayage le jour ou le Secteur est passe a douze — la table
                  etait juste, c est l echantillonnage qui ne l etait plus, et
                  c est `tracesManquees()` qui l a dit. Neuf vues, 0,1 s.
                  50 regions, 50 signatures, 65 props. Usine 12, Fonderie 9,
                  Friche 9, Nebuleuse 8, Secteur 12.

    0.43.31 lot 32 LA NEBULEUSE PASSE DE HUIT REGIONS A DOUZE, ET SIX QUARTIERS
                  DEVIENNENT UNE REGLE. La soute est la seule region du theme ou
                  rien ne bouge parce que quelqu un l a VOULU : tout y est
                  sangle a un rail. La navette est la seule coque INTACTE, et
                  c est la premiere fois que la silhouette `chassis` ne dit pas
                  une epave. Le condenseur est le seul endroit MOUILLE d un
                  theme sans gravite — l eau d une station ne tombe pas, elle se
                  depose sur ce qui est froid — et ses echangeurs sont le seul
                  objet du depot dont les deux longs cotes ne disent pas la meme
                  chose. La carriere est la seule activite du theme qui
                  PRODUISE quelque chose.
                  SIX QUARTIERS POUR DOUZE REGIONS : quatre quartiers donnent
                  six paires distinctes, cinq en donnent dix, et a douze regions
                  il en faut quinze. La Nebuleuse est le troisieme theme a le
                  payer, apres l Usine au lot 20 et le Secteur au lot 31. Le
                  sien est CE QU ON TRANSPORTE.
                  Et la carte des dangers dessine la table : l axe x = 0,50
                  appartient a une nappe de 99 px et a ses quatre miroirs sur
                  toute la hauteur, donc les fronts de taille de la carriere
                  tiennent les colonnes 0,18 / 0,34 / 0,66 / 0,82 et jamais le
                  milieu.
                  54 regions, 54 signatures, 67 props, 84 familles baties.
                  Usine 12, Fonderie 9, Friche 9, Nebuleuse 12, Secteur 12.

   `npm run version-check` refuse un deploiement dont les sources ont bouge sans
   que cette constante suive : la mention ambre du client ne vaut que si quelqu'un
   pense a bumper, et un bump oublie ne se signale pas tout seul.

   La table est un COMMENTAIRE : le module reste pur, sans dependance, et le
   navigateur continue de n'en importer qu'une chaine.
   =========================================================================== */

export const VERSION = "0.43.31";
