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

   `npm run version-check` refuse un deploiement dont les sources ont bouge sans
   que cette constante suive : la mention ambre du client ne vaut que si quelqu'un
   pense a bumper, et un bump oublie ne se signale pas tout seul.

   La table est un COMMENTAIRE : le module reste pur, sans dependance, et le
   navigateur continue de n'en importer qu'une chaine.
   =========================================================================== */

export const VERSION = "0.13.16";
