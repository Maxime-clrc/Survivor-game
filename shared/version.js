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

   `npm run version-check` refuse un deploiement dont les sources ont bouge sans
   que cette constante suive : la mention ambre du client ne vaut que si quelqu'un
   pense a bumper, et un bump oublie ne se signale pas tout seul.

   La table est un COMMENTAIRE : le module reste pur, sans dependance, et le
   navigateur continue de n'en importer qu'une chaine.
   =========================================================================== */

export const VERSION = "0.7.18";
