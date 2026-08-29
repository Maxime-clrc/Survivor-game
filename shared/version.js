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

   `npm run version-check` refuse un deploiement dont les sources ont bouge sans
   que cette constante suive : la mention ambre du client ne vaut que si quelqu'un
   pense a bumper, et un bump oublie ne se signale pas tout seul.

   La table est un COMMENTAIRE : le module reste pur, sans dependance, et le
   navigateur continue de n'en importer qu'une chaine.
   =========================================================================== */

export const VERSION = "0.25.2";
