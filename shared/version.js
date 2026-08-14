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

   `npm run version-check` refuse un deploiement dont les sources ont bouge sans
   que cette constante suive : la mention ambre du client ne vaut que si quelqu'un
   pense a bumper, et un bump oublie ne se signale pas tout seul.

   La table est un COMMENTAIRE : le module reste pur, sans dependance, et le
   navigateur continue de n'en importer qu'une chaine.
   =========================================================================== */

export const VERSION = "0.10.1";
