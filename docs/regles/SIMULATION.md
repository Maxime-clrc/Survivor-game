# Simulation, ennemis, boss, zones, états, script, biome

**Quand lire ce fichier :** on touche à `shared/game_state.js`, `enemies.js`, `bosses.js`, `timeline.js`, `statuses.js`, `biomes.js` — tout ce qui décide ce qui se passe.

Les règles qui valent pour *toute* tâche vivent dans `CLAUDE.md`, à la racine.
Celui-ci ne porte que ce qui ne sert qu'ici — et il n'est PAS chargé
automatiquement : c'est la carte de `CLAUDE.md` qui dit quand l'ouvrir.
### Simulation

- **Toute chaîne d'effets mémorise ses cibles** (`Set` du ricochet).
- **L'ARÈNE FAIT 9600 × 5400, ET LA TAILLE N'APPARAÎT DANS AUCUN COÛT DE
  BOUCLE.** `_grille()` est bâtie sur la **boîte occupée**, `diffuser()` est
  **fenêtré** sur la boîte d'apparition, le réseau est filtré par vue, le sol est
  un motif répété sur la vue, les props bouclent sur les cellules de la caméra. Ce
  qui reste est de la **mémoire** et le temps de génération, une fois par manche.
- **CE QUI MONTE AVEC L'ARÈNE EST LA POPULATION, PAS LE COÛT PAR CORPS.** Un corps
  met plus longtemps à traverser, donc reste plus longtemps **en transit**, donc
  vit plus longtemps à taux d'apparition égal : la moyenne **double** à plusieurs.
  En solo c'est l'inverse — le joueur s'éloigne et `_recyclerLoin` ramasse. Le
  levier, si ça mord, est `RECYCLE_DIST` et pas le plafond.
- **LE BOSS EST CONFINÉ À UNE BOÎTE DE LA TAILLE D'UNE VUE, CENTRÉE SUR
  L'ÉQUIPE.** C'était déjà le cas avant l'agrandissement, et ça répond à la
  question « région tirée de la graine ou région de l'équipe ? » : celle de
  l'équipe, ce qui évite un déplacement forcé avant chaque boss. Aucune des six
  mécaniques ne lit `CFG.ARENA_*` — elles lisent `bounds`.
- **UN LIEU A QUATRE LOIS D'IMPLANTATION, TIRÉES PAR CELLULE — ET LA VARIANTE 0
  EST LA LOI HISTORIQUE.** C'est elle que toutes les mesures des plans précédents
  ont vue ; la déplacer invaliderait des relevés qui n'ont rien demandé.
- **LES BORDS SE DÉCLARENT, L'ASSEMBLEUR NE DEVINE PAS.** Le problème des
  transitions est un problème de **Wang tiles** : chaque variante dit l'état de
  ses quatre bords, et l'assembleur ne pose que des voisines compatibles. Sur un
  3 × 3 il y a douze arêtes internes, et chaque cellule ne regarde que ses **deux
  voisins déjà posés** — l'ordre de parcours suffit, aucun solveur. `bordsDe` suit
  le **miroir** : une variante retournée échange est et ouest, et comparer les
  bords écrits à ceux du voisin retourné accorderait deux arêtes qui ne se
  touchent pas.
- **LE PLANCHER SE LIT SUR SIX AXES, LE PLAFOND SUR QUATRE, ET L'ASYMÉTRIE EST LE
  GARDE-FOU.** Le plafond répond « est-ce encore le même lieu ? », donc il n'emploie
  que les axes dont `verifierLois` se sert pour séparer deux **lieux** ; le plancher
  répond « est-ce encore la même variante ? », et deux arrangements opposés à
  inventaire égal **sont** deux variantes — d'où `centrage` et `etalement`, que la
  signature de lieu n'a pas.
- **UN THÈME À UNE SEULE VARIANTE NE TIRE RIEN.** Consommer un `rand()` pour un
  choix qui n'existe pas déplacerait toutes les arènes déjà mesurées.
- **AVEC UN TIRAGE PAR CELLULE, TROIS GRAINES NE COUVRENT PLUS RIEN.** Elles
  couvraient le générateur d'avant ; celui-ci en demande cinquante, et c'est la
  passe élargie qui a trouvé le seul vrai défaut du lot — deux travées de la
  Nébuleuse fermaient le carré central en cauchemar **une graine sur quatre**.
  Le lieu n'avait pas changé, la mesure si.

- **Les Jumeaux sont deux entités pour UNE réserve de vie.** `state.boss` est la
  source de vérité, `state.boss2` un second point d'application ; redirection
  dans `_damage()`. **Tout retour visuel vise l'entité RÉELLEMENT touchée**
  (`struck`, point d'impact dans `bossDmg`).
- **Le soin mutuel des Jumeaux se coupe par le FOCUS, et le focus se prend en
  FRAPPANT** (`struck`, avant la redirection). Le jumeau focalisé poursuit son
  agresseur, celui qui ne l'est pas s'écarte jusqu'à `TWIN_STANDOFF` : sans ce
  second point, deux corps qui demandent le même `_nearestPlayer` à la même
  vitesse convergent, et le soin ne s'arrête jamais. Le focus **expire**
  (`TWIN_FOCUS_TIME`) — cesser de frapper les laisse se rejoindre. L'écart de
  naissance écrête le **centre**, jamais les deux corps.
- **Une mécanique ratée met à terre, elle ne tue jamais un joueur à pleine vie**
  (drapeau `mech` dans `_hurt`). La progression de la sanction passe par le
  **cumul de Vulnérabilité** posé par `_mechHit()`. Options écrites une seule
  fois : `MECH_HURT`.
- **`_hurt()` prend un SAC D'OPTIONS** : `{ ignoreCooldown, fromZone, overTime,
  mech, src }`.
- **Tout dégât subi porte une PROVENANCE** (`src`, index de `DAMAGE_SOURCES`,
  **sept** entrées), relevée après tous les multiplicateurs. `p.lastSrc` traverse
  le réseau, `p.hurtBy` sort au bilan. Un appel qui oublie `src` compte en
  **contact**.
- **Un dégât continu passe `overTime = true`** à `_hurt()` **et** à `_damage()`.
  Sans lui : victime immunisée au reste (`hitCd` remis à zéro 60×/s), et ennemi
  qui clignote en permanence. Un `overTime` **ne critique jamais**.
- **Critique, momentum et exécution vivent dans `_damage()`.** L'exécution ne
  touche **ni le boss ni une structure de mécanique**. `this.lastCrit` est relu
  immédiatement par `_bulletHitEnemy` (Sentence capitale).
- **Le critique figure dans `_playerPower()`, le momentum non** — le second est
  transitoire, il vit dans `p.power`, relevé une fois par tick par `_momentum()`.
- **`areaMul` a deux points d'application** : les rayons **déjà mods**
  (`bulwarkRadiusMul`, `healWaveRadiusMul`, `frostRadius`) l'absorbent à la fin de
  `computeMods()` ; les rayons **constants** chez leur appelant.
- **Les conversions se calculent sur les valeurs de BASE** (`fullMods`), jamais
  l'une sur le résultat de l'autre.
- **Un ennemi ne chevauche jamais un joueur** (`_separateFromPlayers()`,
  `PLAYER_SEPARATION`). Trois règles indissociables : constante **dédiée**, le
  joueur n'est **jamais** déplacé en retour, le contact garde une **morsure d'un
  pixel** (`PLAYER_BITE`). `_spawnSweep()` teste le segment centre du joueur →
  point d'apparition, dans l'ordre où la balle le parcourt.
- **AUCUN TYPE DE HORDE NE DÉPASSE 90 % DE LA VITESSE DE LA CLASSE MÉDIANE**
  (`SPEED_DOCTRINE` × `vitesseClasseMediane()`, **déduite de `CLASSES`** et jamais
  écrite en dur), à aucune minute, dans aucune difficulté, **tirage de vitesse
  compris**. C'est ce qui garantit qu'il reste toujours quelque chose à semer. Le
  Rempart (`speedMul 0,92`) n'est **pas couvert**, et cette exception se vérifie
  (`verifierClasses`) au lieu de se supposer : un tank ne répond pas à la horde en
  fuyant, il pose son Rempart. Ne s'applique **ni aux boss ni aux invocations de
  mécanique**, qui doivent pouvoir rattraper.
- **La rampe de vitesse est MULTIPLICATIVE** (`ENEMY_SPEED_RAMP_PCT`) : une rampe
  additive uniforme est mathématiquement une compression du bestiaire — elle
  rapproche tout le monde de la moyenne. Le rapport lent/rapide est donc
  **invariant par minute** ; il a un plancher, `SPEED_SPREAD_MIN`.
- **Les deux séparations passent par la GRILLE** (`_grille()`) : tri par comptage
  dans des `Int32Array` réutilisés, cellule = `2 × max(rayon, PLAYER_RADIUS)`,
  voisinage 3×3, coordonnées de cellule **écrêtées** (un corps repoussé hors salle
  retombe dans une cellule de bord — l'écrêtage est 1-lipschitzien, donc il ne
  sépare jamais deux corps qui se touchent). La taille de cellule est ce qui
  **prouve** la couverture : deux corps qui se chevauchent sont à moins d'une
  cellule, donc dans le voisinage. La toucher casse la preuve.
- **LA GRILLE COUVRE LA BOÎTE OCCUPÉE, PAS L'ARÈNE.** Son coût est **entièrement
  dans ses cases vides** — le `fill` et la somme préfixe balaient toute la grille
  quel que soit le nombre de corps, et tripler la population ne le bougeait pas
  (17,4 µs à 200 corps, 16,6 µs à 600). Bornée à l'englobante des corps et des
  joueurs, elle passe à **1 118 cases et 8,8 µs**, et elle **cesse de dépendre de
  `ARENA_W × ARENA_H`** : doubler l'arène ne change plus rien. C'est le critère,
  pas la vitesse — une amélioration restée proportionnelle à la surface n'aurait
  rien réglé.
- **LA MARGE D'UNE CELLULE N'EST PAS DÉCORATIVE.** `_separateFromPlayers` et
  `_renforts` interrogent le **voisinage** d'une case ; sans marge, un corps au
  bord de la boîte cherche un voisin hors tableau et la séparation échoue **en
  silence**. L'origine `x0/y0` sort de `_grille()` avec le reste : un lecteur qui
  calculerait encore `floor(x / cell)` viserait une autre case.
- **UN VÉRIFICATEUR REND CE QUI EST ROUGE, ET SÉPARÉMENT CE QU’IL N’A PAS PU
  MESURER.** Les deux étaient dans le même tableau : `verifierBoss` comptait
  **sept** problèmes là où il y en a **cinq**, les deux autres disant seulement
  « moins de huit combats pour ce boss ». Un échantillon trop maigre est un défaut
  de la **mesure**, pas du jeu, et les confondre apprend à ne plus lire la sortie.
  Le contrat est `{ err, note }` ; il accepte toujours un tableau nu, donc les
  trente-deux autres ne bougent pas.
- **UNE MARQUE DE MESURE DOIT PORTER SUR UN INSTANT QUI EXISTE.** `LEVEL_MARKS`
  demandait le niveau 27 à la **minute 32** alors que la horde dure exactement
  **30 minutes** (`TL_CFG.SEGMENTS × SEGMENT_TIME`). La marque ne se mesurait
  jamais : `mesureProgression` rendait la dernière valeur connue, et le
  vérificateur lisait le **plafond de niveau** comme un dépassement.
- **L'XP ET LE NIVEAU SONT DES GRANDEURS DE SALLE ; LA CARTE, LES ÉCLATS, LES
  RELIQUES ET LE LOOT DE RUN SONT DES GRANDEURS DE JOUEUR.** `this.xp`,
  `this.level`, `this.levelAt` : un seul compteur pour tout le monde, et le
  snapshot écrit la même valeur sur la ligne de chaque joueur. Ce qui est
  individuel est le **choix**, pas la cadence.
- **`_addXp` A DEUX APPELANTS, ET LA LISTE EST FERMÉE** : `_killEnemy()` pour la
  horde, et `_damage()` pour le boss — qui crédite **au prorata des dégâts
  infligés** sur ses PV max, jamais à la mort. On est payé pour avoir tapé, pas
  pour avoir achevé : un joueur qui meurt à 5 % des PV du boss a déjà touché 95 %
  de son XP. Un troisième appelant est une erreur, et c'est cette ligne qui le
  dit.
- **TOUTE RÉCOMPENSE D'OBJECTIF SE VERSE EN ÉCLATS OU EN LOOT, JAMAIS EN XP** —
  parce que l'XP est le seul canal qui **ne peut pas distinguer qui a pris le
  risque**. La règle est déjà respectée : `_eventReward()` rend des PV, remonte
  le bouclier et relève les joueurs à terre, rien d'autre. On ne l'introduit pas,
  on la **préserve** : sans elle, partir chercher un objectif pendant qu'un autre
  farme ne coûte rien à personne, et l'arbitrage n'existe pas.
- **UNE ÉQUIPE EN DIFFICULTÉ EST UN ACCIDENT, UN JOUEUR QUI S'ISOLE EST UNE
  DÉCISION.** Le Director soulage le premier et pas le second. Sans cette règle,
  tout le lot 04 du plan 31 est annulé : le joueur isolé a une tension élevée, le
  Director la lit comme une surcharge, et il **adoucit** la composition —
  exactement l'inverse de l'effet voulu. Aucune contradiction avec « ne jamais
  punir un joueur qui joue bien » : on ne lui ajoute rien, on **s'abstient de lui
  retirer** ce qu'il a choisi d'affronter.
- **LE CAS LIMITE EST TRANCHÉ PAR L'EFFECTIF VIVANT, PAS PAR CELUI DU GROUPE** :
  un joueur seul parce que les trois autres sont morts n'a rien choisi.
- **DEUX AGRÉGATS ET PAS UN, ET C'EST UN ÉCART ASSUMÉ AVEC LEFT 4 DEAD.**
  `tensionMax` dit « trop haut » — un joueur qui se noie est une tension même si
  les trois autres s'ennuient ; `tensionMoy` dit « trop bas » — l'ennui est un état
  **collectif**. Jamais les deux en même temps, et la surcharge passe devant.
- **LA RESPIRATION EST ÉCRITE DANS LE SCRIPT, ET LE DIRECTOR S'EFFACE DEVANT.**
  Elle se **déduit** — un battement dont le taux retombe par rapport au précédent
  en est une, seg 2 passe de 1,6 à 1,2 — plutôt que de se déclarer dans une colonne
  qu'il faudrait tenir d'accord avec les taux. Un Director qui durcirait un
  battement de répit ne ferait pas une manche plus intéressante, il **retirerait le
  répit**, et un rythme sans creux n'est plus un rythme.
- **L'ENNUI ÉPUISE LES LEVIERS DE FORME AVANT TOUT LEVIER DE QUANTITÉ**, et c'est
  ce qui garantit qu'une équipe forte reçoit une manche plus **intéressante** et non
  une manche plus **longue**. Le budget ne bouge pas : `rate` n'est pas dans la
  liste, et le vérificateur le mesure sur les deux états et sur chaque géométrie.
- **LE DIRECTOR A UNE LISTE FERMÉE, ET ELLE EST ÉCRITE AVANT LUI.** Quatre
  leviers — composition, géométrie, élite, événement — et **rien d'autre** : le
  `rate` est le budget que `verifierScript()` tient, les PV/vitesse/dégâts sont les
  leviers de la **difficulté**, la respiration est écrite dans le script, et le
  plafond de population est une limite de **moteur**.
- **`validerDecision` NE RELIT PAS UNE LISTE D'INTERDITS : ELLE COMPARE.** Le
  battement avant et après la décision, champ par champ. Une liste d'interdits se
  contourne en ajoutant un champ au script ; une comparaison protège les champs
  futurs sans que personne y pense. Le croisement va dans les deux sens, et il a
  déjà servi : `rateMul` figurait parmi les protégés alors qu'il appartient aux
  **événements** et qu'aucun battement ne le porte — protéger un champ qui n'existe
  pas donne l'illusion d'une couverture.
- **LE COÛT D'UN CORPS EST L'INVERSE DE SON ABONDANCE, DONC IL N'Y A RIEN À
  ÉCRIRE.** `share` dit quelle part du plafond un type a le droit d'occuper ; un
  type rare est un type cher, et le rapport des deux **est** le prix. Une colonne
  de coût à côté de `share` serait un second système d'équilibrage à tenir d'accord
  avec le premier — on n'en diverge que si une mesure le demande.
- **LA COUTURE EST NEUTRE TANT QUE LE DIRECTOR N'EXISTE PAS**, et c'est ce qui
  garde `verifierScript` et `verifierPopulation` comme des verdicts sur le
  **script** pendant qu'on construit ce qui va le plier. `DECISION_NEUTRE` rend le
  battement à l'identique — pas une copie, **le même objet**.
- **LA PROIE DE `EV_CHASSE` EST DEVENUE LE MINI-BOSS, ET `QUARRY_XP_WORTH` S'EST
  CONVERTI.** Les quarante corps d'XP sont partis en **éclats** sur le mini-boss ;
  ils ne s'y sont pas ajoutés. `EV_CHASSE` est **redéfini, pas retiré** — son index
  circule — et désigne maintenant une **élite** dans la horde, qui passe par
  `_killEnemy` comme n'importe quel corps.
- **LE MINI-BOSS EST UN ENNEMI, PAS UN `this.boss`.** Il joue sur la map normale,
  donc il n'a ni arène, ni barres, ni pause, ni **cercle au sol** : ce canal
  appartient au boss et ne se partage pas. Il ne lui reste que la **posture**, et
  c'est ce qui a décidé de son verbe.
- **SON VERBE NE CORRIGE PAS SA COURSE.** Le cap se verrouille au **début** du
  préavis, comme l'angle du tireur : figé à la fin, il suivrait la cible pendant
  une demi-seconde, et une attaque qui suit sa cible jusqu'à la détente n'est pas
  une attaque. Esquiver l'envoie dans un obstacle, et l'encastrement **ouvre une
  fenêtre** — il est immobile et **Vulnérable**, l'état existait déjà et porte ses
  pointes et ses +25 %. C'est la seule punition d'esquive du bestiaire.
- **SON PRÉAVIS SE COMPTE MAIS NE SE REFUSE JAMAIS.** `_windupSature` est une règle
  de lisibilité d'écran ; un mini-boss à qui l'on refuserait son créneau ne
  chargerait pas du tout, et son unique verbe disparaîtrait derrière huit
  fantassins.
- **IL EST DANS LA GRAINE, SON CONTRAT NE L'EST PAS** — même partage que la borne :
  instants et positions se tirent à la construction, la rencontre non. Le placement
  est **biaisé vers les bornes** un essai sur deux : c'est le seul contrepoids
  honnête au risque du lot, un corps qui n'attire pas, ne se signale pas et
  disparaît peut n'être **jamais** rencontré.
- **LES TROIS FENÊTRES TIENNENT CHACUNE DANS UN SEGMENT, ET C'EST MESURÉ.** À
  `PREMIER = 260` le premier mini-boss naissait quarante secondes avant le boss et
  se faisait **balayer** — trois occasions sur trois perdues, sans qu'une ligne le
  dise. Et le premier n'est pas dans le premier segment : « Installation » vaut ce
  que vaut la première minute.
- **LA PRÉSENCE COURT TOUT LE TEMPS ET NE SE RÉARME JAMAIS ; LA FENÊTRE DE COMBAT
  SE RECHARGE À CHAQUE COUP ENCAISSÉ.** C'est ce qui fait que **l'échec coûte du
  temps** : on retente tant qu'il est là, on ne rallonge pas son séjour, et
  l'occasion peut se refermer pendant qu'on se soigne.
- **LA LAISSE SE MESURE DEPUIS SON ANCRE, JAMAIS DEPUIS LE JOUEUR LE PLUS PROCHE**
  — deux joueurs qui se relaient le promèneraient d'un bout à l'autre de la carte.
  Rentrer lui rend ses PV, ce qui interdit de l'user en plusieurs passages, et le
  retour est **visible** : corps qui marche à l'envers, sinon la barre repart en
  haut sans que rien ne l'explique.
- **DEUX MENACES NOMMÉES À LA FOIS, C'EST LA LISIBILITÉ PERDUE.** Un mini-boss
  **attend** le boss au lieu de se supprimer — sans quoi un boss long ferait
  disparaître une occasion que personne n'a refusée.
- **IL N'A PAS D'ÉLITE, ET `verifierElites` le saute explicitement** : il n'a ni
  quota, ni part de pool, ni score de pool. Une variante serait un troisième palier
  que rien ne tire. Il est hors des **deux** filtres de `_spawnEnemy` — le plafond
  de population règle une densité, le roster dit ce que le **script** tire — et
  sans cette porte `ti` retomberait sur le fantassin, en silence.
- **SES PV NE SUIVENT NI LA COURBE DE L'ÉLITE NI CELLE DU BOSS.** Ceux d'une élite
  ne dépendent que du **temps**, ceux d'un boss portent `crowd^1,15` : « entre les
  deux » est donc deux positions différentes selon l'effectif, et à quatre la bande
  basse est vide. `CROWD_EXP = 0,6` reste entre les deux dans les deux cas. Et il
  **suit la puissance du joueur** avec son propre genou, plus bas que celui du boss
  — lequel est calibré sur une référence fixe, `BOSS_POWER_REF`.
- **LA CELLULE DE `_grille()` DOUBLE TANT QU'UN MINI-BOSS EST VIVANT.** Elle se
  dimensionne sur le plus grand rayon **présent**, pas sur la table : un corps de
  47 px la porte de `50 à 94 px, donc environ 3,5 fois plus de candidats par
  voisinage 3×3. C'est assumé — le coût ne dure que le temps de la rencontre — mais
  ça se sait avant d'ajouter un deuxième grand corps.
- **RETIRER N'EST PAS TUER.** `_killEnemy()` est le point de passage unique de
  toute **mort** d'ennemi : XP, cumuls, hauts faits, butin. Un corps qui **part**
  — recyclé au loin, mini-boss qui se retire — n'y passe pas, et il ne doit rien
  laisser derrière lui.
- **UN BUDGET DE PRESSION N’EST PAS UN PARTAGE DE RÉCOMPENSE.**
  `WAVE_CROWD_EXP` gouvernait six grandeurs — plafond de population, taux
  d’apparition, part d’élites, ajouts et renforts du boss — **et** le partage
  d’XP par effectif. Régler l’un cassait l’autre, donc aucun des deux n’était
  réglable : quand la mi-manche a été densifiée de 17 %, l’XP a suivi la densité
  sans que le partage puisse s’ajuster, et la courbe de niveau a divergé **selon
  l’effectif**. `XP_CROWD_EXP` est le levier qui manquait, posé à la valeur
  identique — donc sans changer un seul comportement.
- **RIEN NE REJOUAIT LES VÉRIFICATEURS, ET C’EST LE SEUL DÉFAUT QU’AUCUN D’EUX NE
  PEUT SIGNALER.** Trente-trois vivaient dans neuf modules — chacun à côté de sa
  donnée, ce qui est la bonne place — et personne n’avait la liste. Trois étaient
  rouges depuis des lots, tous trouvés **par hasard** en cherchant autre chose.
  `verif.js` est le seul appelant ; `npm run verif` passe en moins d’une seconde,
  donc il se lance avant chaque commit.
- **LE COÛT D’UN VÉRIFICATEUR SE MESURE, IL NE SE DEVINE PAS.** `verifierBoss` lit
  une table de mécaniques et prend **446 s** ; `verifierBiomes` génère 200 graines
  sur cinq lieux et prend **0,0 s**. Parier d’après le nom donnait l’inverse dans
  les deux cas, et c’est ce qui décide du mode par défaut.
- **UNE CONSTANTE SANS LECTEUR NE LÈVE RIEN.** Elle reste dans la table, se lit
  comme un réglage, et ment sur ce que le jeu fait — un bloc `CFG.SEAL_*` doublait
  `BOSS_CFG.SEAL_*` derrière son propre préfixe. `constantes_check.js` balaie les
  689 clés des quinze tables ; il accepte la lecture par **alias** (`C.GUST_PERIOD`)
  dans le fichier qui **définit** la table, et nulle part ailleurs.
- **UN ZÉRO N’EST PAS UNE MORT.** `BOSS_CFG.GAZE_TIME: 0` distingue le regard
  instantané du regard permanent : le zéro **porte** la mécanique. Trois autres
  leviers à zéro ne portaient rien — `(1 + 0 × x)` vaut 1 — et coûtaient un appel
  à `_teamPower()` par apparition. La différence se lit sur l’usage, pas sur la
  valeur.
- **LA NAVIGATION EST UNE PILE DE TROIS COUCHES, ET ELLES NE SE MÉLANGENT PAS.**
  *Où aller* = `shared/navigation.js` ; *comment éviter* = la tangente locale de
  `_enemies()` ; *comment se tasser* = `_separateEnemies` / `_separateFromPlayers`.
  Une couche qui ferait le travail d'une autre est le défaut d'origine : le
  sondage local seul ne contourne ni un mur plus large que sa portée, ni une
  poche, et un champ seul ne gère ni le contact ni la foule.
- **LE CHAMP EST INDEXÉ SUR LE JOUEUR, JAMAIS SUR L'ENNEMI** : une diffusion de
  Dial par joueur vivant, au plus **une par image** (`_navBudget`), rejouée
  seulement si la cible a changé de case depuis `REBUILD_MIN`. 200 corps lisent
  quatre champs — c'est la seule raison pour laquelle la chose tient à 200.
- **LE CHAMP EST UNE FENÊTRE ANCRÉE SUR SA SOURCE**, de la demi-diagonale de la
  boîte d'apparition plus quatre cases (`NAV_FENETRE`). Une diffusion pleine
  arène coûte 184 µs pour 8 160 cases et **1,5 ms à la map cible** ; la fenêtre en
  coûte 83 pour 3 481, et **la même chose quelle que soit la taille de l'arène**.
  Le levier est la **surface diffusée, jamais `REBUILD_MIN`** : sa valeur porte sa
  mesure (« un joueur à 150 px/s traverse une case en 0,27 s »), et la relever
  ferait suivre la horde à un champ périmé.
- **Hors fenêtre, un corps retombe sur la droite ligne** — celle qu'il suit déjà
  sous `NEAR`. Contrepartie assumée : un corps à deux mille pixels de sa cible
  n'a pas d'obstacle à contourner qui vaille une diffusion.
- **Une fenêtre est une nav à part entière** : même cellule, même masque, une
  **origine**. `celluleDe`, `celluleX` et `celluleY` la lisent sans savoir qu'elle
  en est une. Sa **taille est fixe et c'est l'origine qui glisse**, sinon les
  tampons ne se réutilisent pas et l'allocation coûte plus que la diffusion.
  `nav.bloque` **reste plein arène** : bâti une fois par manche, hors boucle.
- **L'ancre de navigation voyage en coordonnées MONDE**, plus en indice de case :
  le champ est une fenêtre qui glisse, donc un indice retenu à l'image précédente
  ne désigne plus la même case.
- **LE CHAMP NE SERT QUE SI LA LIGNE DROITE NE PASSE PAS** (`droitPossible`,
  testé une image sur `LOS_PERIOD`, échelonné par `e.id`). En terrain libre le
  déplacement est celui d'avant, au pixel près : c'est ce qui rend la couche
  gratuite là où elle n'a rien à faire, et vérifiable là où elle agit.
- **Sous `NAV_CFG.NEAR`, on vise la cible EN DROITE LIGNE.** La dernière foulée
  appartient à l'évitement local : un joueur collé à un mur est dans une case
  fermée, et un corps qui ne lirait que le champ ne le rejoindrait jamais.
- **UNE CASE EST FERMÉE QUAND SON CENTRE TOMBE DANS LA BOÎTE GONFLÉE**, jamais
  quand les deux se recouvrent — le recouvrement ferme un couloir d'une case de
  large. La contrepartie a **deux faces**, et une seule était gardée : une
  **cloison** plus mince que `CELL - 2 × CLEARANCE` passe entre deux centres, et
  un **passage** dont la bande libre (`écart - 2 × CLEARANCE`) est plus étroite
  qu'une case n'en porte aucun. `verifierNavigation()` rejoue désormais les deux.
- **UNE FENTE PLUS ÉTROITE QUE `NAV_CFG.PASSAGE_MIN` EST UN ABRI PARFAIT.** Le
  joueur s'y tient, la grille y voit un mur plein, donc le champ ne peut pas l'y
  rejoindre — et comme la fente est plus longue que `PASSAGE_LONG`, l'évitement
  local ne compense pas. C'était le seul abri du dépôt : deux conduites de la
  Fonderie, 65 px d'écart sur 416 px, **119 s** avant le premier contact contre
  4,4 s pour la fente jumelle mieux calée — et **jamais** avec le spawner réel.
  Le même objet fermait le même abri contre le **bord de l'arène**, à 32 px.
- **CE DÉFAUT NE DÉPEND QUE DU CALAGE DE LA GRILLE, donc il est invisible à la
  lecture** : le *même* objet, à la *même* largeur, est franchi à un endroit de
  l'arène et infranchissable à un autre. Un correctif à la position photographiée
  n'aurait rien réglé ; c'est la **forme** qui est en faute, et elle est
  maintenant le onzième cas de `NAV_CAS` — posé au **pire** calage, centre sur un
  multiple de `CELL`, sans quoi le cas passe et ne garde rien.
- **Les seuils sont mesurés, pas choisis.** Au pire calage, 50, 65 et 68 px
  d'écart ne sont **jamais** contestés, 72 et 80 le sont en 5 s ; une fente de
  160 px de long est contestée en 4,2 s, une de 200 px ne l'est jamais. D'où
  `PASSAGE_MIN = 80` et `PASSAGE_LONG = 200`.
- **L'abri du BOSS et l'abri de la HORDE sont deux systèmes sans rapport.**
  `ABRI_RETOUR` / `_abris()` garantissent qu'un motif de boss laisse toujours où
  se mettre — c'est **voulu**, et `verifierMecaniques` compte ces abris. La fente
  de navigation n'est pas de cette famille : rien ne la borne dans le temps et
  aucun rôle ne la contexte. Corriger l'une n'approche jamais l'autre.
- **En terrain découvert, aucun abri n'existe** : 17 286 positions balayées sur
  5 lieux × 2 modes, la horde lâchée en anneau à 800 px, **toutes** contestées,
  pire cas 6,3 s. Le balayage au pas de 80 px ne voyait pas l'intérieur d'une
  fente de 64 px — c'est pour ça que le défaut se cherche sur la **géométrie**
  (`passagesAveugles`) et se confirme en simulation, jamais l'inverse.
- **UN CORPS PLAQUÉ CONTRE UNE BOÎTE EST DANS UNE CASE FERMÉE** (`CLEARANCE`
  vaut 14, le plus petit rayon 9). Son côté **ne se déduit pas, il se souvient**
  (`navAncre`, posée tant qu'on est libre) : prendre la case libre « la plus
  proche » désigne celle d'**en face**, qui porte une distance plus courte et
  aspire donc le corps DANS le mur.
- **LE POINT VISÉ SE REJOINT EN LIGNE DROITE**, sinon la tangente locale corrige
  un cap qui traverse la boîte et annule exactement la composante qui ferait
  tourner le coin. Le premier pas y échappe : il est adjacent, donc sûr.
- **Une distance de tir ne se tient que si la ligne existe** : sans ligne, le
  tireur et le soigneur ferment la distance au lieu de garder leur `standoff`.
  `_shots` absorbe déjà sur l'obstacle — tenir sa place derrière une cloison,
  c'est ne plus menacer personne et ne plus jamais bouger.
- **Un désenclavement a été écrit, mesuré, puis SUPPRIMÉ** : détection
  d'immobilité, biais latéral, reprise forcée du champ. Il ne changeait rien
  (1 px sur 283 de moyenne) — le champ résout la géométrie, la séparation résout
  la foule. La détection reste, mais comme **critère** (`verifierDeplacement`),
  pas comme code. Ne pas le réintroduire sans une mesure qui le demande.
- **CE QU'UN RÔLE APPORTE NE SE LIT PAS SUR SON DPS.** Le dps brut du Soigneur
  n'a aucune raison d'être compétitif avec celui du Tireur : tant qu'on ne mesure
  que le dps, « le rôle est-il satisfaisant » n'a pas de réponse mesurable,
  seulement un avis. `p.contrib` porte les quatre grandeurs indirectes, écrites
  aux points de passage qui existaient déjà — rien n'est recalculé ailleurs.
- **`evites` et `proteges` sont DEUX grandeurs, et leur différence est toute la
  contribution du Rempart.** `evites` est ce que **ma** réduction m'épargne ;
  `proteges` est ce que **mon** aura épargne à un **allié**, et il s'attribue au
  **porteur**, pas à la victime. `detournes` est ce que j'encaisse pendant **ma**
  provocation : `_nearestPlayer` rend le Rempart à tout ennemi dans le rayon, donc
  ces dégâts seraient allés ailleurs — pas de contrefactuel à calculer, la fenêtre
  **est** la mécanique.
- **La difficulté n'est pas un mérite.** Dans `_hurt`, `diff.dmg` s'applique
  **avant** le relevé : on compte ce que la réduction du joueur retire, jamais ce
  que le mode ajoute.
- **`permis` se DÉFAIT au lieu de se recalculer.** Le multiplicateur de catalyse
  est déjà dans le montant délivré, donc la part vaut `amount × (1 − 1/cata)`. Le
  porteur du multiplicateur se retient dans `catalyseDe` : sans lui, les dégâts
  qu'une catalyse rend possibles ne s'attribuent à personne.
- **UN BANC DE CONTRIBUTION PRÉCISE SON PROFIL, et le défaut est COMPLET.**
  `guardAura` et `catalyse` sont des lignes de **méta** : sur un compte neuf, deux
  des quatre grandeurs indirectes valent structurellement zéro et le banc mesure
  « ce qu'un compte neuf n'a pas encore » au lieu de « ce que le rôle apporte ».
  Vérifié : au profil neuf, `proteges` et `permis` sortent à **0** partout.
- **Le banc est MORTEL et il est piloté.** La survie **est** le résultat, donc on
  ne relève pas les joueurs — contrairement à `mesureComposition`, qui mesure les
  dégâts subis et doit donc durer. Et un apport de soutien se voit dans les
  recharges consommées, que `botInput` ne consomme pas.
- **Le critère n'est pas l'égalité, c'est la viabilité** (`verifierContribution`,
  `COMPO_VIABLE = 0,5`) : aucune composition ne doit rendre une manche impossible,
  aucune ne doit être strictement dominée. En dessous de la moitié du meilleur **à
  effectif égal**, une composition n'est plus un choix, c'est une erreur.
- **UN TIR NE TRAVERSE PAS UNE COUVERTURE, ET DEUX ARMES LE FAISAIENT.** Mesuré
  sur les dix : le faisceau (`_segmentHits`) et l'arc (`_teslaTir`) sont **les
  deux seuls** — une balle meurt déjà sur un mur, une grenade y saute, une zone
  n'en sort pas. Ce sont aussi les deux seuls à ne pas lancer de **projectile
  physique**, donc les deux qui échappaient naturellement au test. Le périmètre se
  referme exactement sur eux ; précision et railgun, malgré leurs portées de 2,2
  et 1,8, sont déjà arrêtés. C'est une mise en cohérence, pas une pénalité neuve.
- **`_vueCoupee(x0, y0, dx, dy, portée)` est le point de passage unique de la
  ligne de vue.** Segment contre AABB **par les dalles**, et non une marche à pas
  fixe sur `_obstacleAt` : la plus petite cloison du dépôt fait 32 px, une marche
  assez large pour être bon marché l'enjambe, et un tir qui traverse un mur *à
  certains angles* est exactement le défaut silencieux qu'on retire.
  `droitPossible` ne convient pas non plus — il raisonne sur la grille de 40 px
  **avec la marge d'un corps**, or un tir passe où un corps ne passe pas.
- **La portée se rabote AVANT le choix de cible, jamais après.** Un corps derrière
  un mur ne doit pas être *candidat* : sinon il vole la sélection à celui qui est
  devant, et l'arme se tait au lieu de frapper ce qu'elle voit.
- **La couverture destructible ENCAISSE le faisceau et l'amorce de l'arc.** Ne pas
  l'entamer rendrait un joueur à couvert invulnérable à ces deux armes là où une
  balle perce le mur, et le tireur n'aurait aucun retour sur ce qui a bloqué. Le
  point d'impact mord d'`VUE_MORDU` (1 px) **dans** la boîte : `_vueCoupee` rend
  l'entrée exacte, donc le point tombe sur la face, et `_obstacleAt` teste
  `< w / 2` strictement.
- **Les rebonds de l'arc ne changent pas** : ils sautent de corps à corps, c'est
  une capacité distincte du rebond-sur-mur — et c'est ce qui fait de `TESLA_SAUT`
  un levier **horde pure**, `Db` restant identique à toutes ses valeurs.
- **`mesureArmes` NE PREND AUCUNE CARTE, donc le banc d'armes est AVEUGLE aux sept
  coefficients d'`ech`.** `appliquerEchelle` met à l'échelle ce que les **cartes**
  donnent à `mods` ; sans carte, aucun `mods` ne bouge. Vérifié : `ech.degats` du
  laser à **0, 1,2 et 5** rend des `Dh` et des `V` identiques à quatre décimales.
  Conséquence : **`verifierEquilibreArmes` ne peut structurellement pas détecter
  un déséquilibre d'échelle**, et un écart qu'il remonte ne vient jamais de là.
- **LE GOULOT DE LA HORDE N'EST NI LE PLAFOND, NI LE TAUX, NI LES ARMES.** Mesuré :
  les armes retirent **0 %** de la population passé la minute 10 (les courbes avec
  et sans tir sont superposées), et sur 300 s ininterrompues la horde **sature**
  son plafond de 220. Les trois pistes des briefs — monter `MAX_ENEMIES_*`,
  nerfer les armes, monter le taux nominal — sont écartées **par la mesure**. Le
  goulot est le **temps de horde ininterrompu**.
- **AJOUTER DE LA HORDE PENDANT UN BOSS EST AUTO-DESTRUCTEUR, et c'est mesuré.**
  Le tir se disperse, le boss meurt plus lentement, la part du temps passée en
  boss monte — donc l'exposition **totale** à la horde **baisse**. À toutes les
  doses essayées (taux 0,20 à 0,50, plafond 60 à 100), `hors boss` chute de 81 à
  40-55 corps et la part de boss passe de 17 % à 35-67 %. Le levier proposé par le
  chantier se retourne contre son propre objectif.
- **Le levier qui marche est la REPRISE, pas le combat.** Un boss laisse la horde
  à zéro en partant et elle met **158 s** (solo) à retrouver la moitié du plafond ;
  sur cinq boss, c'est la moitié de la manche passée à remonter une pente. Le taux
  est majoré `BOSS_REPRISE_MUL` fois pendant `BOSS_REPRISE_TIME` **après** la mort
  du boss, et seulement là — le régime permanent ne bouge pas, et le combat de
  boss reste un combat de positionnement.
- **UN COMPTE NE SE COMPARE QU'À ÉCHANTILLONNAGE ÉGAL.** Le compteur d'abri sous
  le feu de `verifierMecaniques` est un **nombre d'images**, pas un taux : il
  grandit avec le nombre de manches. À deux manches il a rendu 1, 2, 3, 12 puis 18
  **sans suivre la dose** ; à six, la réponse est nette et **inverse** de l'alarme
  — 39 images sans reprise contre 18 avec. Une garantie qu'on arbitre sur un
  échantillon trop court arbitre le bruit.
- **UNE MESURE DE POPULATION EST APPARIÉE OU ELLE N'EST RIEN.** La graine de
  `GameState` ne sème que le **biome** : les tirages de cartes, les types d'ennemi
  et la cadence d'élite passent par `Math.random`, global et non semé. Sans le
  semer, deux campagnes du **même code** ont rendu 28 % et 50 % de temps en boss.
  Tout banc qui compare deux états doit remplacer `Math.random` lui-même.
- **Le critère de population n'est pas atteignable à quatre joueurs par ce
  levier** : le plafond suit `joueurs^0,75` mais la vitesse de nettoyage d'une
  équipe monte plus vite, donc la horde y vit à 7-10 % de son plafond **même hors
  boss**. La reprise, elle, passe de « jamais » à 31 s. C'est une question de
  taux nominal **par effectif**, pas de reprise.
- **UNE GÉOMÉTRIE DÉCLARÉE ET JAMAIS TIRÉE EST DU CODE MORT QUE RIEN NE SIGNALE.**
  `anneau` était dans `GEOMETRIES`, **implémentée** (`_ringPoint`, avec ses huit
  essais et sa distance de dégagement) et absente des **trois** scripts. Elle est
  maintenant tirée quatre fois. `verifierScript` croise `GEOMETRIES` avec la table
  **source** — les scripts dérivés remappent (`GEOM_CALME`, `GEOM_CAUCHEMAR`),
  donc seule la source doit tout couvrir.
- **UN ÉVÉNEMENT EST UNE DONNÉE, PAS UNE MÉCANIQUE** : un tableau de types
  d'ennemi, un multiplicateur de taux et une annonce. Ajouter un type n'écrit rien
  dans la simulation — et quatre types pour trente battements imposaient de
  répéter la Nuée ou de laisser 83 % des battements muets. Six types autorisent
  onze événements sans qu'aucun ne serve plus de **deux** fois. `EVENTS` est
  **append-only** : son index circule sur le réseau.
- **LA SOMME PAR SEGMENT NE BOUGE PAS quand on réécrit le script.** On
  redistribue la pression *dans* le segment, on n'en ajoute pas — sinon tout ce
  qui a été mesuré ailleurs est à refaire. Sommes conservées au dixième :
  6,0 · 10,0 · 12,6 · 14,7 · 17,9 · 20,7.
- **MAIS LA PRESSION EFFECTIVE N'EST PAS LA SOMME DES TAUX.** Un événement
  **multiplie** — de ×0,38 pour le siège à ×2,6 pour la nuée —, donc une somme de
  base croissante ne dit rien de ce que la manche fait sentir. Casser la monotonie
  **dans** un segment est le but ; la casser **entre** eux ferait redescendre la
  manche, et c'est ce qu'un premier jet à sommes conservées produisait
  (segment 4 à 21,4 contre segment 5 à 13,4). Les gros multiplicateurs vont tard,
  et `verifierScript` refuse une pression qui retombe.
- **LA FORME D'UN SEGMENT EST LA SUITE DES SIGNES DE VARIATION**, pas ses valeurs.
  Deux segments consécutifs de même forme sont le même segment joué deux fois — le
  script en avait **six**.
- **EN SOLO, UN SEGMENT NE PERD PAS DEUX BATTEMENTS.** `quatre-fronts` exige trois
  joueurs et le repli est **silencieux** ; les segments 5 et 6 en portaient deux
  chacun, donc l'apogée du solo était doublement dégradée — et d'autant plus en
  cauchemar, où `GEOM_CAUCHEMAR` mappe `pince → quatre-fronts`.
- **La grille se refait quand une couverture cède** (`_obstacleHit`), et
  seulement là : la géométrie de biome ne bouge pas autrement.
- **LA MASSE EST LA SURFACE** (`masseDe(r)` = `(r / 12)²`, bornée) et elle
  **répartit** la poussée de séparation à son inverse. À masses égales on
  retombe exactement sur le demi-demi d'avant : `2 × 0,5 = 1`. Elle est
  **déduite du rayon**, donc une élite la paie sans qu'aucune ligne ne le dise.
  Elle ne change **pas** le débit d'un passage (mesuré : 90/90 dans les quatre
  configurations) — elle change **qui est au premier rang**.
- **L'ÉCART DE POSTE NE JOUE QU'ENTRE PAIRS DU MÊME TYPE** (`ecartDe(def)`, tout
  ce qui a `shootCd` ou `heal`), et il **dimensionne la cellule de `_grille()`**
  : la preuve de couverture du voisinage 3×3 porte sur la plus grande
  **distance d'interaction**, pas sur les rayons. La toucher sans toucher la
  cellule casse la preuve en silence.
- **Le flanc est le seul champ de rôle qui reste déclaré** (`flanc` sur la ligne
  du coureur) : « arriver par le côté » est une intention, elle ne se lit dans
  aucune statistique. Il **s'arque de loin et se résorbe de près**
  (`FLANC_NEAR` / `FLANC_SPAN`) — sinon le corps tourne sans jamais commettre —
  et son côté vient de l'identifiant, donc il ne change jamais.
- **Le flanc ne s'applique QUE quand la ligne droite passe** : sur un cap rendu
  par le champ, un biais latéral pousse dans la boîte que le champ contourne.
- **LE PRÉAVIS DE LA HORDE SE PORTE SUR LE CORPS, celui du boss sur le SOL.**
  Le canal du télégraphe au sol appartient au boss et ne se partage pas ; une
  arène à 200 corps n'aurait plus de sol lisible. Un corps qui s'apprête se voit
  à sa **posture**, et les trois attaques (ruée, visée, amorce d'explosion)
  partagent **un seul chiffre** (`ATK_CFG.WARN`) : le joueur apprend « quand un
  corps se ramasse, quelque chose part une demi-seconde plus tard ».
- **LA RUÉE EST RATIONNÉE, LA VISÉE NON.** Un créneau de ruée refusé **reporte**
  une ruée ; un créneau de tir refusé **annule** le tir, parce que le tireur ne
  fait que ça. Les mettre sous le même budget coûtait **84 %** du volume de tir
  en cauchemar à quatre. Ce qui borne les visées à l'écran est le plafond de
  **part** du tireur (`share`), pas un budget.
- **Le budget de préavis se compte AVANT d'être dépensé** : une passe dédiée sur
  ce qui s'apprête déjà, puis les octrois. Reporté de l'image précédente, il
  ratait les corps qui *entraient* dans une vue en cours de préavis.
- **Le préavis se paie sur la RECHARGE, pas sur la cadence** (`shootCd -
  ATK_CFG.WARN`) : `shootCd` a toujours voulu dire « temps entre deux balles ».
- **L'angle de tir se VERROUILLE au début de la visée.** Un tir qui suit sa
  cible jusqu'à la détente n'est pas une attaque, c'est une taxe.
- **`wu` se filtre par vue**, comme toute autre liste, et il transporte donc des
  **corps** et non des identifiants — un identifiant ne sait pas où il est.
- **Deux préavis, deux langages à l'écran** : le ramassement annonce un corps
  qui **vient sur vous** et garde l'écrasement ; la visée annonce un corps qui
  **reste où il est** et n'a que sa pose. Les deux percent la brume.
- **UN ARCHÉTYPE EST UN VERBE, PAS UN JEU DE STATISTIQUES.** Chacun repose une
  question au joueur : le harceleur « es-tu couvert ? », le générateur « qui
  d'abord ? », le saboteur « où te tiens-tu ? ». Un type qui ne repose aucune
  question neuve n'entre pas dans le bestiaire.
- **`_isolementPass()` est relevé UNE fois par image**, pas par corps :
  `_nearestPlayer(x, y, isole)` lit la table. Un joueur couvert pèse jusqu'à
  `ISOLE_COUVERT` fois sa distance — c'est un **poids**, pas un seuil : il n'y a
  pas d'instant où l'on « devient » isolé. **Le verbe du harceleur n'existe
  qu'à plusieurs**, et en solo il se comporte comme un coureur ; c'est assumé,
  comme la posture du Soigneur.
- **Le retrait (`fleeT`) est GÉNÉRAL**, il n'appartient à aucun type : le
  soigneur le pose sous le feu, le harceleur après avoir touché (`recul`, posé
  dans `_collisions`). Un corps qui frappe et reste au contact n'a pas harcelé.
- **L'ÉGIDE EST UNE RÉSERVE, PAS UN POURCENTAGE**, et c'est ce qui la sépare du
  chœur à l'œil comme à la décision : une réduction se subit, une réserve se
  **casse**. Elle vaut une **part des PV** (`egideShield`), jamais un nombre —
  un bouclier plat vaudrait 38 % d'un fantassin à la cinquième minute et 9 % à
  la trentième. Elle est **donnée entière** à l'entrée sous le rayon et se
  recharge une fois brisée ; hors du rayon elle tombe à zéro.
- **L'égide absorbe en DERNIER dans `_damage()`**, après critique, vol de vie et
  crédit d'XP : ce que le joueur a produit reste ce qu'il a produit, seule la
  chair est épargnée. Elle n'interrompt pas `hitSeq` — un coup encaissé par la
  coque reste un coup à l'écran.
- **Le saboteur verrouille la PLACE là où le tireur verrouille l'ANGLE.** Même
  grammaire, autre verbe : il annonce « là où tu es dans une demi-seconde ne
  sera plus à toi ».
- **L'ARC DU RELAIS EST LA MENACE, PAS LE CORPS** — le seul du roster dont la
  valeur d'une cible dépend d'une **autre** cible. Un joueur ne compte plus des
  corps, il lit une géométrie.
- **L'APPARIEMENT EST DÉTERMINISTE et se lit dans l'ordre de la liste** : le
  plus petit identifiant libre prend le plus proche libre. Sans cet ordre, deux
  corps se choisiraient l'un l'autre à des images différentes et l'arc
  clignoterait.
- **La rupture est plus large que la formation** (`lienRupture` > `lienRange`) :
  sans cette hystérésis, une paire qui oscille autour de sa portée passe son
  temps à se recharger, et le joueur voit un arc **battre** au lieu d'un arc.
- **La cohésion est ce qui fait tenir un arc**, et elle ne s'applique qu'au-delà
  de la moitié de la portée : de près les deux corps sont libres, et c'est ce
  qui garde l'arc mobile.
- **CE QUI SÉPARE LES MODES EST LE ROSTER ET LES TRAITS, pas le résidu.**
  Cinq / huit / treize types, zéro / six / douze attachements de trait. Le calme
  s'arrête aux cinq d'origine et n'attache rien ; le normal s'arrête **avant**
  le soutien et le déni de sol (ni soigneur, ni chœur, ni générateur, ni
  saboteur, ni relais) ; le cauchemar les a tous.
- **`hp` EN CAUCHEMAR NE PORTAIT AUCUNE DIFFICULTÉ, seulement de l'éponge.** À
  la population plafond, des PV en plus ne retiennent personne : 1,35 → 1,10
  laisse la pression à quatre joueurs à moins de 2 % d'écart, rend 22 % de débit
  de mise à mort et retire 17 % de PV moyen. Un résidu qui ne change que
  l'épaisseur des corps est exactement ce que le plan refuse.
- **`spawn` est INERTE au plafond** (1,28 → 1,45 : aucun effet mesurable) : il
  ne compte qu'**avant** la saturation. **`dmg` est le seul levier chiffré qui
  déplace la pression**, et il reste donc le dernier à toucher.
- **UNE ÉLITE EST UNE VARIANTE DE COMPORTEMENT**, écrite **sur la ligne de son
  type** (`elite: { … }`). Elle ne surcharge que du comportement : les
  statistiques d'apparition et l'économie sont **interdites**
  (`ELITE_INTERDIT`), sans quoi une élite deviendrait un type de plus qui vole
  son quota et son score au sien. Les trois multiplicateurs existants
  (`ELITE_HP_MUL`, `ELITE_SPEED_MUL`, `ELITE_RADIUS_MUL`) restent le socle et ne
  se redéclarent jamais ligne à ligne.
- **`defDe(type, elite)` est LE point de lecture du bestiaire par corps**, des
  deux côtés du réseau. Il est **pur**, donc le client le rejoue à partir du bit
  `e.elite` qu'il reçoit déjà : aucune fiche ne traverse le réseau.
- **Les statistiques d'apparition viennent de la ligne de BASE, le comportement
  de la variante** (`_spawnEnemy`) : rayon, PV et vitesse restent ceux du type,
  cadences et portées sont celles de l'élite.
- **La fiche d'un arc se lit PAR PAIRE**, jamais une fois pour toutes : une
  élite tend un arc plus long et plus mordant, et prendre la fiche du premier
  arc pour tous ferait porter sa morsure à des paires ordinaires.
- **L'arc du porte-bouclier se mesure en RADIANS.** Le dépôt comparait
  `def.shieldArc` (100, en degrés) au retour de `_angleDiff` (au plus 3,15) :
  le test était **toujours vrai**, donc il absorbait de toutes les directions
  depuis qu'il existe — pendant que le client ne dessinait le blocage que de
  face. L'arc en radians vit sur le **corps**, posé à l'apparition.
- **Un arc se charge avant de blesser**, par le même préavis que tout le reste
  (`ATK_CFG.WARN`, les deux porteurs dans `wu`), et `pair` ne traverse le réseau
  qu'une fois l'arc **vif** : pas de trait dessiné pendant la charge, c'est le
  préavis qui porte cet instant.

- **L'état de provocation est global** (`state.taunt = {id, until, x, y}`), lu par
  `_nearestPlayer()`.
- **Le mode soin est une POSTURE, pas une recharge, et en posture le soigneur ne
  tire plus du tout.** Les liens s'accrochent seuls (`_healLinks`) : alliés
  d'abord, jusqu'à `HEAL_LINK_MAX`, rupture après `HEAL_LINK_GRACE` hors rayon
  — sans ce délai, un allié qui oscille à la limite fait clignoter le lien. La
  question posée au joueur n'est plus « ai-je une ligne de tir ? » mais « puis-je
  **rester** près de lui ? ».
- **Le lien ne rend AUCUN PV au soigneur** : l'auto-subsistance appartient à la
  vague, qui l'inclut déjà. **Sa posture est donc inerte en solo**, et c'est
  assumé — un soutien seul n'a pas de sens stratégique. C'est un problème
  d'affichage (`solo` dans `CLASSES`, montré à un joueur), pas de puissance. La
  carte `siphon` est ce qui rend l'autonomie : elle **réécrit une règle** du mode,
  et les ennemis ne comblent que les liens **restés libres**.
- **Le soin du medic est un chemin NEUF**, jamais un `_damage()` négatif. Rupture
  mesurée en **temps passé sous le feu**.
- **La purge par le soin se compte en TEMPS** (`STATUS_CFG.PURGE_WINDOW` de lien
  continu), là où elle se comptait en touches.
- **Le relèvement n'a qu'UN point d'achèvement, `_revive()`** : il compte la
  proximité **et** le lien, au lieu d'ouvrir un second chemin.
- **Ne jamais écrire dans `ENEMY_TYPES`** : `standoff`, `traits`, `shieldArc`,
  `dashCd`, `dashWarn`, `dashT`, `trailAt`, `healT`, `fireT`, `fleeT`, `hitAt`,
  `aura` sont **copiés sur l'entité** à l'apparition.
- **Le bulwark est le seul ennemi dont `e.ang` n'est pas l'angle vers sa cible**
  (`shieldTurnRate`). L'angle d'absorption se mesure du **centre de l'ennemi vers
  le point d'impact**.
- **L'aura ne se cumule jamais** : meilleure réduction, jamais le produit.
  Relevée une fois par tick (`_auraPass`), lue dans `_damage()`. Même règle pour
  le Vœu partagé, les auras de givre et les champs de ralentissement.
- **UN SOL PERSISTANT PORTE SA PROVENANCE** (`z.sol` : `SOL_HORDE`,
  `SOL_JOUEUR`, `SOL_BOSS`). Elle dit **deux** choses, et il faut les tenir
  séparées : *tout* sol est exclu de la logique d'abri du boss
  (`_zoneEcarteAbris`, `_solPose`, `_foyerPoint` lisent la seule présence du
  champ), mais **le plafond et la mesure ne comptent que le leur**. Sous son
  ancien nom (`horde`) le champ confondait les deux : le calme, qui n'attache
  aucun trait, affichait 21 % de « sol de horde », et le plafond évinçait « la
  plus ancienne zone de horde » sans regarder qui l'avait posée — donc le
  terrain d'un joueur pouvait effacer une traînée, et l'inverse.
- **`_groundZone()` porte un plafond global** (`trailMax()`, traînées et spores
  confondues, la plus ancienne cède). La traînée se pose à la **distance
  parcourue**, pas au temps.
- **Les deux plafonds de traits se dérivent de l'ÉCRAN, jamais de la
  population.** `trailMax()` = ce qui remplit `TRAIL_SURFACE` (12 %, le budget de
  `HAZARD_SURFACE_MAX`) d'**une vue** ; `DASH_WARN_MAX` = les préavis de ruée
  simultanés qu'**une vue** peut porter. Un plafond indexé sur `enemyCap()`
  suivrait la densité que la lisibilité, elle, ne suit pas.
- **Le budget de préavis se compte à la POSITION DE L'ENNEMI**, pas à celle de sa
  cible (un ennemi lancé sur A s'affiche sur l'écran de B), et **un préavis
  accordé s'inscrit dans les DEUX tables** (`_windupCompte`) — la table de
  l'image, et celle qui la reporte à la suivante. Sans le second appel, le
  plafond effectif double exactement.
- **Un préavis refusé ne consomme pas la recharge** : `dashCd` reste à zéro et
  l'ennemi réessaie à l'image suivante.
- **Les systèmes lisent `p.mods`, jamais la liste de cartes.** Les minuteurs
  (`p.timers`), les états (`p.statuses`) et les reliques (`p.relics`) vivent **à
  côté** : un recalcul de mods ne doit pas les effacer.
- **La classe passe par `p.mods`**, comme les cartes. Seules `_skill1`/`_skill2`
  lisent `classAt(p.cls)`.
- **`state.bounds` est la surface jouable** ; tout ce qui borne un déplacement la
  lit, jamais `CFG.ARENA_W/H`. Depuis le lot I, la **géométrie des zones** et le
  **rebond des balles** aussi. Gardent l'arène entière : l'**apparition** des
  ennemis et le **culling** des projectiles.
- **`state.walls` bloque, il ne blesse pas.** On repousse du côté **d'où l'on
  venait** (une esquive traverse 162 px en trois images). Le client rejoue la
  règle. Les obstacles de biome repoussent **par axe** (glissement). Le **boss**
  n'y passe pas — et c'est vrai sans qu'il y ait de test, parce qu'il n'y a plus
  rien à traverser : voir `biomeNu` juste dessous. `_bossMove` n'appelle donc ni
  `_obstacleBlock` ni `_wallBlock`.
- **L'ARÈNE DU BOSS EST NUE, ET C'EST UNE DÉCISION** (`biomeNu`, un getter :
  `obstacles` et `hazards` rendent une liste **vide** dès `bossPending`, serveur
  **et** client — `render/stage.js` rejoue la même règle). Mesuré : **0 obstacle
  sur 62 377 images de combat**. Deux raisons, et aucune n'est l'économie :
  - les six **archétypes** disent tous comment le boss *déforme* l'espace, ce qui
    suppose un sol neutre au départ ;
  - la **garantie d'abri** (`_solLibrePart`, `_zoneEcarteAbris`, `_foyerPoint`)
    est écrite sur un sol propre. Y compter le terrain rouvrirait le seul
    invariant que le dépôt a payé deux fois.
- **CE QUI EST PLACÉ UNE FOIS POUR LA MANCHE LIT LA GÉOMÉTRIE DE LA MANCHE**
  (`obstaclesDuLieu()` / `hazardsDuLieu()`), **ce qui se dessine par image lit
  les listes actives** (`obstaclesActifs()` / `hazardsActifs()`). Confondre les
  deux fait **bouger** du décor déterministe : l'amer choisit le candidat le plus
  loin de tout danger, or sur une liste vide tous valent `Infinity` et
  `Infinity > Infinity` est faux — c'est le **premier** qui sortait. **299 cas
  sur 320** (4 lieux × 2 modes × 40 graines), saut jusqu'à **2 596 px**, rejoué à
  l'envers à la mort du boss. Le semis bougeait pour la même raison, et sa clé de
  cache ne contient ni obstacles ni dangers : c'est le panoramique du combat qui
  déclenchait le recalcul.
- **Le plafond de population est une FONCTION, pas une constante** :
  `enemyCap(diffIndex, joueurs)` = `MAX_ENEMIES_BASE × MAX_ENEMIES_DIFF[i] ×
  joueurs^WAVE_CROWD_EXP`, borné par `MAX_ENEMIES_HARD_CAP`. Le **même exposant**
  que la division d'XP de `_addXp` : la horde grossit exactement de ce que la
  normalisation retire. `MAX_ENEMIES_HARD_CAP` est une limite de **moteur** — la
  seule valeur du dépôt qu'on règle au profileur et non en jouant.
- **La saturation ne traverse pas le réseau** : passé `_enemyCap()`,
  `_spawnEnemy` rend `null` en silence. La réponse est de l'**information** (taux
  d'occupation au HUD, déduit de `enemies.length` — le client rejoue `enemyCap()`
  à partir de la difficulté et de la longueur de `playerList`).
- **LA HORDE SUIT LES GROUPES, ET UN GROUPE EST UNE VUE.** Deux joueurs à moins
  de `GROUPE_VUE` l'un de l'autre affrontent la même horde ; au-delà, ils en
  affrontent deux. `_spawnBox(groupe)` rend **une boîte par groupe** et
  `beatSide` s'applique **dans** cette boîte : la géométrie du battement dit d'où
  ça vient, elle n'a jamais eu à dire pour qui. Avant, une seule boîte englobante
  et un bord tiré par le script donnaient, à 3 600 px d'écart, un rapport de 2,7 à
  4,4 entre les deux joueurs — **et le sens changeait avec la graine**. Ce n'était
  pas une difficulté, c'était une loterie : rien à l'écran ne disait de quel côté
  la vague allait tomber.
- **LE BUDGET SE RÉPARTIT, IL NE SE MULTIPLIE PAS.** `poids = effectif^0,5`,
  `part = poids / Σ poids × budget`. Le total ne bouge **jamais**, quel que soit
  l'exposant : c'est ce qui rend ce bouton sûr — il déplace la pression entre
  groupes, il n'en crée pas, donc `verifierScript()` et `verifierPopulation()`
  restent valides. `crowd^WAVE_CROWD_EXP` reste calculé sur l'effectif **total** :
  un joueur qui part seul ne doit pas subir la pression d'un solo, il doit subir
  **sa part** de celle d'une équipe.
- **L'EXPOSANT EST LE SEUL RÉGLAGE DE L'ISOLEMENT, ET IL SE LIT SUR UNE LIGNE.**
  À `e = 1` (prorata pur) un joueur parti seul d'une équipe de quatre reçoit
  **0,71** fois la horde d'un vrai solo — partir seul serait plus **doux** que
  jouer solo. À `e = 0,5` il reçoit **1,04** : la pression d'un solo, sans aucune
  des compensations du solo (lien du Soigneur et sa rupture, auras de classe,
  cartes coopératives, `REVIVE_RADIUS = 96`). Le coût de l'isolement est
  **émergent** — personne ne l'a écrit, il découle de la coopération elle-même.
- **LE PLAFOND SE RÉPARTIT, IL NE SE DIVISE PAS.** `_enemyCap()` reste global —
  sinon se séparer multiplierait la horde — mais chaque groupe reçoit une part
  proportionnelle à son effectif, avec du jeu. Sans elle, le groupe le plus
  fourni consomme tout le plafond et l'autre joue dans le vide.
- **UN GROUPEMENT PÉRIMÉ EST PIRE QUE PAS DE GROUPEMENT.** Refait au seul
  battement, il tient jusqu'à **soixante secondes** après que l'équipe s'est
  séparée, et pendant tout ce temps la horde naît sur la boîte englobante :
  mesuré, 358 corps d'un côté contre 11 de l'autre, et la masse ainsi posée
  consomme le plafond bien après le regroupement. La validité se **vérifie** à
  chaque tick, avec **hystérésis** — on entre dans un groupe à une vue, on n'en
  sort qu'à une vue et demie — sinon deux joueurs qui marchent à la limite font
  clignoter la géométrie du battement.
- **ON REGROUPE TOUT LE MONDE, À TERRE COMPRIS.** Un joueur à terre à l'instant du
  battement sortait de tous les groupes, et sa part de horde tombait sur son
  voisin : rapport mesuré 4,2 là où le partage doit rendre 1. Le tri des vivants
  appartient à la **lecture**, pas au regroupement.
- **UN CORPS À PLUS DE `RECYCLE_DIST` DE TOUT JOUEUR EST RETIRÉ EN SILENCE**, et
  sa place rendue au plafond. À 3 600 px d'écart la population **doublait ou
  triplait** (55-69 → 106-200) sans que le contact augmente : les corps en trop
  étaient **en transit**, on payait leur simulation, leur séparation et leur
  instantané, et ils ne menaçaient personne. Trois conditions, et elles ne sont
  pas négociables : il **ne passe pas par `_killEnemy()`** (ni XP, ni cumul, ni
  haut fait, ni butin) ; il **ne s'applique ni aux élites ni au porteur
  d'objectif** — un contrat « tuez trois élites » ne doit pas se vider tout
  seul ; et la distance est **franchement plus grande** que la boîte
  d'apparition, sinon un corps naît et meurt aussitôt et la horde clignote.
  C'est le pendant exact du champ fenêtré : là on cesse de **calculer** loin, ici
  on cesse d'**entretenir** loin.
- **LA COMPOSITION DES GROUPES EST LISIBLE DEPUIS L'ÉTAT** (`this.groupes`),
  jamais recalculée ailleurs. Le Director en aura besoin : **une équipe en
  difficulté est un accident, un joueur qui s'isole est une décision**, et il ne
  doit pas venir au secours du second — sinon il lirait la tension de l'isolé
  comme une surcharge et **adoucirait** la composition, ce qui annulerait tout ce
  qui précède.
- **UN ENNEMI NE SE MATÉRIALISE JAMAIS SOUS LES YEUX** (`_pushOffScreen`). Le
  **côté appartient au script, la distance à la lisibilité** : on ne change jamais
  de bord, on repousse le long de l'axe du bord, quitte à sortir de la salle. Le
  rectangle de vue est **reconstruit** (centré puis clampé). Exempts : `anneau`
  et les nuées de pondeuse.

- **LE HASARD APPARTIENT À LA SALLE, PAS AU PROCESSUS.** `this.alea =
  mulberry32(this.seed ^ 0x9E3779B9)`, et **aucun `Math.random` ne subsiste dans
  la simulation** — `hub.js` tient jusqu'à seize salles dans un processus, et un
  générateur global ne peut pas les servir : imposer une graine à l'une l'imposait
  aux quinze autres. Le décalage sépare le terrain du déroulé. Les deux seuls
  `Math.random` restants sont dans le constructeur, quand rien n'impose ni graine
  ni biome ; `room.js` garde le sien pour ce qui est **hors manche** (couleurs,
  mélange des armes proposées). `offerCards` passe `this.alea` à `drawCards` :
  `cards.js` ne connaît pas `GameState` et ne doit pas le connaître.
- **Une graine identique donne le même CONTENU — même terrain, même composition
  de horde, mêmes instants d'élite, mêmes attaques de boss. Elle ne donne jamais
  le même RÉSULTAT** : les entrées des joueurs restent des entrées.
- **`verifierDeterminisme()` avance deux états EN ALTERNANCE**, et c'est tout le
  test : avancés l'un après l'autre ils passeraient même avec un générateur
  global. C'est la panne de production, pas une propriété théorique.

- **DEUX INDICES SONT MESURÉS ET RIEN NE LES LIT.** C'est le point : le Director
  arrive deux plans plus tard avec six réglages à calibrer, et s'il apportait sa
  mesure avec lui, ces réglages seraient **devinés** faute d'une seule manche
  enregistrée. Ils sont calculés, tracés, et aucun comportement du jeu ne change.
  Si la mesure est mauvaise, on le voit **avant** qu'un système s'appuie dessus.
- **LA TENSION EST UN RESSENTI, PAS UN COMPTE** : les dégâts y entrent en
  **fraction des PV max** — un Rempart et un Tireur ne reçoivent pas le même coup
  de la même façon — et la **densité proche** est le seul terme qui monte **avant**
  qu'on prenne des coups. Sans elle la mesure est toujours en retard, et être au
  contact est une tension même quand on gagne.
- **Aucune instrumentation neuve.** Le terme de dégâts se prend dans `_hurt()`,
  passage obligé de tout ce qui blesse un joueur ; la densité se compte dans
  `_separateFromPlayers`, qui parcourt **déjà** le voisinage 3×3 ; `p.downed`
  existe. Coût mesuré : p50 17,7 → 18,0 µs et p99 216 → 219 µs par tick, soit
  **+1,2 %**, sous le bruit.
- **DEUX AGRÉGATS D'ÉQUIPE, PAS UN.** `tensionMax` dira « trop haut »,
  `tensionMoy` dira « trop bas » — l'ennui est un état collectif. Une moyenne
  seule effacerait exactement ce que la mesure du plan 31 a trouvé : à 3 600 px de
  séparation, un joueur voyait 137 corps pendant que l'autre en voyait 36.
- **La mémoire courte est une DURÉE, pas une valeur** : temps depuis la dernière
  élite, depuis le dernier événement, et **temps passé sous le seuil bas**. Une
  tension basse dix secondes n'est rien ; quatre-vingt-dix, c'est une manche plate.
- **`survieIndex()` RÉPARE UN DÉFAUT QUE PERSONNE N'A CONÇU, ET IL NE SERT QU'À LA
  TENSION.** `powerIndex()` est purement offensif — c'est délibéré, il dit ce que
  l'arme rend contre une cible unique — mais il remonte jusqu'aux **PV du boss**
  (`powerIndex → _playerPower → _teamPower → bossPower`) : une équipe cuirassée
  est donc mesurée **faible**, et un loot défensif serait invisible à l'indice donc
  entièrement **gratuit**, là où un loot offensif grossit le boss et paie une
  partie de lui-même. `powerIndex()` **ne bouge pas** : ni `BOSS_POWER_REF`, ni
  `SUMMON_REF`, ni la courbe des six boss. Aucun boss, aucun mini-boss, aucune
  récompense ne se branche sur l'indice de survie.
- **La tension ne tire jamais** : elle est aussi déterministe que la manche.
  `verifierIndices()` rejoue deux manches de même graine et exige la même courbe,
  bornée à [0, 1], **ni plate ni saturée** — une tension qui reste à zéro ou colle
  à 1 ne dit rien, et c'est maintenant qu'on veut le savoir.

- **LA BORNE EST DANS LA GRAINE, SON CONTRAT NE L'EST PAS.** Deux manches de
  même graine posent les bornes aux **mêmes endroits** ; ce qu'elles proposent se
  tire à l'**activation**. Conséquence à connaître avant de promettre un challenge
  à graine imposée : il comparerait des **parcours**, pas des tirages.
- **ELLE NE DISPARAÎT PAS**, et c'est ce qui en fait un **choix différé** plutôt
  qu'une occasion qui s'évapore — cohérent avec un jeu dont le fond reste la
  horde. Le prix du refus est la **recharge** : refuser coûte d'**attendre**, pas
  de renoncer. Sans ce prix, on relancerait le tirage jusqu'à obtenir ce qu'on
  veut.
- **Elle évite les dangers autant que les obstacles.** `_dropPoint` pousse hors
  des boîtes et **ne connaît pas les nappes** : une borne dans une flaque de
  fusion demanderait de traverser le feu pour lire une proposition qu'on peut
  refuser.
- **LA TOUCHE D'INTERACTION EST GÉNÉRIQUE** (`F`) : elle interagit avec ce qui est
  à portée, pas « avec une borne ». Une touche par système est ce qui rend un jeu
  impossible à apprendre. `G` refuse — refuser doit coûter un geste **différent**
  pour ne jamais se faire par inadvertance.
- **UN CONTRAT N'EST PAS UN ÉVÉNEMENT, ET SA TABLE EST SÉPARÉE.** Un événement
  remplace la **composition du battement** (`types`, `rateMul`) ; un contrat ne
  touche à **rien** du budget de pression. Les mélanger ferait qu'accepter un
  contrat changerait la horde, et `verifierScript()` mesurerait deux choses à la
  fois. `CONTRATS` est **append-only** comme `EVENTS` : son index circule.
- **AUCUN OBJECTIF N'INSTRUMENTE LA SIMULATION**, et c'est le critère de
  sélection : kills, élites, temps tenu, position tenue — tous les compteurs
  existaient, sauf celui des élites, qui est **une ligne** au point de passage
  unique de toute mort. Un objectif qui demanderait un compteur neuf sort de la
  table.
- **UN SEUL CONTRAT ACTIF.** Le suivi reste lisible et le jeu ne devient pas une
  liste de tâches.
- **UN COMPTEUR DE TEMPS RECULE, IL NE SE REMET PAS À ZÉRO** : une progression
  perdue d'un coup se lit comme un bug, pas comme un coût.
- **LES QUATRE RARETÉS CHANGENT LA FORME, PAS SEULEMENT LA QUANTITÉ** : plus le
  joueur accepte de mettre la manche en danger, plus la récompense change la forme
  de sa run. Le `loot` est **déclaré** dans la table et pas encore versé — le
  plan 35 le branchera, et le déclarer maintenant évite d'écrire deux fois la
  table des récompenses.
- **UN CONTRAT NE PAIE JAMAIS EN XP** — voir la doctrine plus haut : c'est le seul
  canal qui ne peut pas distinguer qui a pris le risque. Les éclats sont
  **individuels**, l'objectif est d'**équipe**, et chacun touche la même part où
  qu'il soit.
- **LA PROPOSITION NE SUSPEND PAS LA SIMULATION.** Les écrans de carte et de
  marchand figent la manche ; celui-ci non — sinon activer une borne devient une
  **pause**, et le joueur l'utilisera comme telle sous la horde.
  `verifierProposition()` le **mesure** au lieu de l'affirmer.

### Bonus au sol

- **UN BONUS EST UNE MICRO-DECISION DE COMBAT, jamais un second système de
  build.** Effet simple, immédiat, le plus souvent temporaire. Rien ne se
  conserve, rien ne s'empile : un ramassage **rafraîchit** son minuteur
  (`Math.max`), il ne l'additionne pas.
- **`POWERUP_TYPES` dit ce qui circule, `POWERUP_ROTATION` ce qui tombe,
  `POWERUP_POIDS` QUAND.** Le poids est une fonction de l'état — PV manquants,
  densité de horde, boss, joueurs à terre, et ce que les **armes de l'équipe**
  savent lire (`litCadence`, `litCanons`, `litPerce`, `litRebond`). **Jamais un
  interdit** : `CFG.POWERUP_PART_MIN` garde les onze types tirables, y compris
  celui qui ne sert pas maintenant.
- **La densité se lit sur la FOULE par joueur** (`CFG.POWERUP_FOULE`), pas sur le
  plafond de population : celui-ci vaut 370 pour 29 corps médians, donc une
  densité de 0,08 en permanence et une nova qui ne tombait plus.
- **La part des trois bonus de survie est un INVARIANT d'équilibrage** —
  `heal`, `shield`, `beacon`, 43 % des chutes. C'était la proportion de la
  rotation à sept types, et la survie médiane y est sensible d'un facteur 1,5 :
  rendre des bonus offensifs à la rotation ne doit rien retirer de soin.
  `verifierRythmeBonus()` tient la bande.
- **AUCUN LEVIER DE DIFFICULTÉ dans la table de poids.** Compenser un mode par
  des récompenses est refusé par principe ; `DIFFICULTIES` n'a aucun champ de
  bonus et n'en gagne pas. Même raison que `hasHealer()` pour `heal` : un second
  poids qui dépendrait de la composition ferait de la composition un réglage.
- **`_applyPowerup()` ne rend jamais rien du tout.** Le surplus de soin part en
  bouclier (`_soinBonus`), le plafond de bouclier s'**ajoute** à la jauge de la
  build (`_capBonus`) au lieu de la remplacer, une purification à vide rend la
  moitié d'un soin. `verifierBonus()` refuse une empreinte de combat inchangée
  sur un état défavorable mais plausible.
- **Le fragment n'est pas un bonus de rotation** : il tombe d'une carte, sur un
  kill, donc par dizaines. Plafond séparé (`CFG.FRAGMENT_MAX_GROUND`) — compté
  dans `POWERUP_MAX_GROUND`, il bloquait le générateur.
- **Une dépouille d'élite ne consulte pas le plafond du sol.** C'est voulu : une
  récompense de kill tombe toujours. Le corollaire est qu'à quatre joueurs le
  générateur est bloqué la plupart du temps et que les élites fournissent
  l'essentiel — la mesure porte donc sur la **part de temps bloquée**, pas sur
  l'occupation moyenne.

### États

- **Une purge ne retire jamais qu'un seul état**, dans l'ordre `PURGE_ORDER` :
  Sentence > Brûlure > Entrave > un cumul de Vulnérabilité. Seule la Purification
  au sol y échappe.
- **La Sentence n'est jamais posée dans une équipe sans soigneur**
  (`hasHealer()`). À l'échéance elle **met à terre**.
- Les effets se lisent **là où ils s'appliquent** : Vulnérabilité dans `_hurt()`,
  Entrave dans `_players()`, Brûlure dans `_statuses()`.

### Zones

- **Les zones de dégâts sont pleines** ; les retraits sont purement visuels
  (`zonePath()` côté client).
- **`ZONE_FORGIVE` : la zone affichée est plus grande que celle qui blesse, de
  10 %.** Écart assumé (110 ms d'interpolation). Le sens s'**inverse** pour ce
  qui épargne (trou d'anneau, secteur sûr) : la tolérance pardonne toujours dans
  le même sens.
- **Une zone persistante inflige `dot` par paliers de `ZONE_TICK`**, jamais à
  chaque image, et passe `overTime = true`.
- **Les mécaniques de groupe vivent dans une liste unique, `state.marks`.** Un
  marqueur dont le porteur se déconnecte ou tombe **se supprime lui-même**.
- **`shape`** : 0 disque · 1 rectangle orienté · 2 anneau · 3 cône · 4 Pac-Man ·
  5 croix.


### Script, événements, difficulté

- **Une manche est SIX SEGMENTS de 300 s de horde** (`shared/timeline.js`), cinq
  beats de 60 s, débit écrit beat par beat, boss en clôture. **L'horloge de horde
  (`hordeTime`) s'arrête pendant le boss et pendant l'écran de cartes.**
- **Les six étapes portent un NOM** (`SEGMENT_NAMES` / `segmentName()`) :
  Installation, Emprise, Crise, Ressac, Étau, Apothéose. Le numéro reste affiché
  à côté. Les identifiants du code gardent `segment`.
- **Le crescendo et le balayage vont ensemble** : le balayage d'arrivée du boss
  ne crédite **ni score ni expérience** (il ne passe pas par `_killEnemy`) ; il a
  un point de passage unique, `_sweepEnemies`.
- **UN ÉVÉNEMENT EST UNE ENTRÉE DU SCRIPT**, jamais un second système. Le
  calendrier est une **colonne de la table**, pas une arithmétique.
  `verifierScript()` en est le critère rejouable.
- **`MECHS` reste réservé aux boss ; `EVENTS` et `WEATHERS` sont des tables à
  part.** Trois tables, **un seul chemin d'annonce** (`applyAlert`).
- **Un événement remplace la COMPOSITION du beat, pas le beat** : `types` dit
  quoi, le beat dit combien et par où. La composition traverse `adaptType` et le
  roster de difficulté.
- **Réussir un événement rend 100 % des PV et du bouclier et RELÈVE les joueurs à
  terre**, sans condition. « Terminer » = atteindre l'échéance du beat, **sauf
  `chasse`**, qui se termine à la mort du gibier et ne rend rien s'il survit.
- **Le gibier de `chasse` porte `noExec`** (exclu du seuil d'exécution) ; ses PV
  sont une **fraction de ceux d'un boss** du même segment, et ne suivent pas la
  puissance.
- **UNE DIFFICULTÉ EST UN PROFIL** : `script`, `roster`, `traits`, `resume`,
  `bossProfil`, puis le **résidu** `hp`/`spawn`/`dmg`/`boss`/`speed`. Ni `events`
  ni `biome` n'y ouvrent de clé.
- **Deux refus explicites** : pas de variante de **mécanique** par difficulté,
  pas de statistique de **type** par difficulté (le résidu porte tout
  l'ajustement chiffré). Le troisième refus — pas de variante de boss par
  difficulté — est **levé pour le boss final seulement** : `finalPour` dans
  `BOSS_ROSTER`, un final par mode, le **pool de tirage reste commun**.
- **LA DIFFICULTÉ D'UN COMBAT DE BOSS SE RÈGLE PAR LE NOMBRE DE CHOSES À LIRE EN
  MÊME TEMPS**, ni par les PV ni par les dégâts. `bossProfil` porte les six
  leviers et il n'y a qu'un point de lecture, `_bossProfil()` : `parPhase`
  (mécaniques simultanées, `superpose` les fait se chevaucher), `warn` (décalage
  de classe de télégraphe, `reflexe` la phase à partir de laquelle on tombe à
  0,8 s), `mechRatio`, `echec`, `couches` (calme s'arrête à `unlock[2]`),
  `dwell`, `renforts`.
- **`warn` négatif est le levier de cauchemar, et il est BLOQUÉ** : le mode est
  encore à `0`, donc à la même classe de télégraphe que normal. Descendre d'un
  cran casse l'invariant du safe spot, parce que `ABRI_RETOUR` vaut 1,2 s **en
  dur** quand le télégraphe, lui, tomberait à 0,8 s — une zone ne peut plus « se
  résoudre avant l'échéance » et `verifierMecaniques` compte des abris sous le
  feu. Le rendre **proportionnel à la classe de télégraphe** est le préalable.
- **`parPhase` est un PLAFOND, la barre en donne le rythme** :
  `min(parPhase, 1 + floor(phase / 2))`. Le joueur apprend une mécanique à la
  fois, puis les voit se combiner — un combat qui ouvre à son régime de croisière
  n'a pas de courbe.
- **Le tirage d'attaque se souvient des TROIS dernières** (`ATK_MEMO`,
  `_pickAtk`, point de passage unique, le différé d'une salve consomme un cran
  lui aussi). Une mémoire de un donne `A B A B A B` dès qu'un pool a trois ou
  quatre entrées.
- **LE REGARD EST UN INSTANT DE RÉSOLUTION, PAS UN ÉTAT** : un décompte, une
  résolution, terminé. `GAZE_TIME` vaut 0 ; la tolérance (`GAZE_GRACE`) se relève
  **en continu** sur la dernière fraction de seconde (`p.gazeSafe`), au lieu d'un
  test à l'image près. `GAZE_PERMANENT` reste la **seule** occurrence d'état
  soutenu du jeu, et garde donc son propre ratio de tic.
- **C'est la seule mécanique dont la réponse n'est pas spatiale**, donc la seule
  qui a son propre canal visuel : quatre couches, un seul signe (l'œil barré).
  La **couche 1 se dessine avant tout télégraphe au sol** — par construction, pas
  par réglage d'opacité. La **couche 4** dessine `acos(BOSS_CFG.GAZE_COS)`, la
  constante que le serveur mesure, jamais un angle recopié.
- **Le palier MONTE avec la difficulté** (`bossProfil.palier`, 1,0 / 1,4 / 1,8),
  ce qui est contre-intuitif : le palier est le moment où se joue la mécanique de
  la phase suivante, donc en cauchemar on en subit **plus**, pas moins.
- **P4 · L'ÉCHEC EST D'ABORD INDIVIDUEL**, point de passage `_mechFail(fautifs,
  ratio, mech)`. En `mixte` (normal), seules les mécaniques d'**occupation**
  restent collectives — et elles se reconnaissent à leur **forme `colonne`**,
  déjà écrite dans la grammaire : rien de plus à déclarer.
- **Les variantes de script changent la FORME de la pression, jamais sa
  QUANTITÉ** (qui vit dans `diff.spawn`). Il ne reste qu'un axe : **quelle
  géométrie**.
- **Les variantes sont DÉRIVÉES de la table de référence** (`derive()`), jamais
  recopiées.
- **Un TRAIT est un module de comportement attaché à `(type, difficulté)`**,
  jamais une variante de type. Masque résolu **une fois à l'apparition**
  (`e.traits`). **L'ATTACHEMENT vit dans le PROFIL, les VALEURS dans
  `enemies.js`.** `TRAIT_BY_TYPE` résout au chargement. **Le client recalcule à
  partir de `(diffIndex, type)`** — coût réseau nul, sauf `wu` (anticipation de
  ruée).
- **Tout ce qui s'indexait sur la vague s'indexe sur le NIVEAU D'ÉQUIPE** (D3).
  `this.tier` n'existe plus. `beatIndex()` était resté exporté sans appelant :
  supprimé, `verifierScript()` calculait déjà son indice en ligne.

### Boss

- **DEUX ORDRES DU MÊME AXE ET DE SENS CONTRAIRE NE COEXISTENT JAMAIS.** Le
  joueur n'a qu'une position et qu'une ligne de visée : ce n'est pas *deux choses
  à lire*, c'est une consigne impossible. La grammaire le porte déjà — `AXES`
  (`bosses.js`) donne pour chaque **forme** ce qu'elle prend (`place`, `visée`) et
  dans quel sens. Deux ordres qui **désignent** un point ne se tiennent pas non
  plus ; deux écarts ou deux cibles de tir, si. Point de lecture unique
  `_mechLibre`, consulté par **`_pickAtk` avant le tirage** : un refus est un
  **retirage**, pas un repli sur `_atkMarques` — replier fait perdre au boss sa
  pression et allonge les combats de moitié. `verifierCoexistence()` liste les
  paires, `verifierMecaniques()` est le critère rejouable.
- **DEUX RÈGLES PEUVENT PARTAGER UN CRÉNEAU, JAMAIS UNE ANNONCE.** `MECH_CLUSTER`
  porte trois chemins — `_atkGrappes`, sa version hâtive (compte à rebours de
  moitié) et `_atkNoeuds` — et le partage du créneau est **correct** : deux
  mécaniques d'occupation ne doivent pas tourner ensemble. Ce qui doit diverger
  est ce que le joueur **lit**. Une grappe fait **éclore**, un nœud **prend
  l'espace** : le verbe change parce que l'enjeu change, et annoncer une éclosion
  qui n'arrive jamais est le seul mensonge que le jeu écrive au joueur.
  `MECHS[i].variantes[v]` porte le seul libellé (`nom`, `texte`, `ordre`) ;
  ni le niveau, ni la forme, ni le créneau, ni le comptage ne se redéclarent.
  `_alert(mech, dur, variante)` la transporte dans `a.v`, et le **Silence se
  souvient par variante** — avoir vu une grappe n'apprend rien sur un nœud, côté
  serveur comme dans le `premiereFois` du client.
- **`parPhase` n'est pas le seul chemin de superposition** : la cadence suffit
  (3,08 s en phase 3 contre 4 s d'annonce de tours), donc le **calme**, à
  `parPhase: 1`, n'est pas protégé par sa difficulté.
- **IL Y A TOUJOURS UN ABRI, ET IL PEUT Y AVOIR DU TIMING.** Une zone qui
  recouvrirait un abri — foyer de forme `colonne`, ou refuge `MECH_SANCTUARY`
  dont le sens est **inverse** et se nomme au lieu de se déduire — s'écarte
  (`_zoneEcarteAbris`, rejoué **à chaque image** pour ce qui bouge), **sauf** si
  elle se résout `ABRI_RETOUR` avant l'échéance : la superposition devient alors
  du réflexe, ce qui est le but. Symétrique à la pose (`_foyerPoint`), qui écarte
  aussi les obstacles de biome et les dangers qui blessent. Un refuge **fuit** le
  feu (`_zoneFeu`), et « le feu » inclut ce qui va tomber.
- **UN SEUL MOTIF DE SATURATION À LA FOIS** (`b.solT`, durée **mesurée** sur les
  zones posées, détonations seules, **plus `ABRI_RETOUR`**) : chaque motif laisse
  un creux — l'autre parité du damier, le trou de la couronne, l'entre-deux des
  lames — mais le creux de l'un tombe sous le plein de l'autre. Une croix n'est
  **pas** un motif de saturation : elle est locale à sa cible et laisse les
  quadrants. **Deux dérogations ont été essayées et REFUSÉES par la mesure** :
  retirer `ABRI_RETOUR` de `_solPose` (les zones **rémanentes** survivent à la
  dernière détonation, donc les motifs se chaînent : 2,85 → 14 zones hostiles en
  moyenne, et un combat à deux passe de 86 à 181 s) et sortir la **constriction**
  du verrou (elle ne pose aucune zone, mais elle resserre `state.bounds` sous un
  motif déjà posé — `verifierMecaniques` compte alors des abris sous le feu).
  **Le verrou coûte la moitié de la présence au sol en solo, et c'est le prix de
  la garantie : il se paie sur `bossProfil`, jamais sur le verrou.**
- **Le nombre de places à tenir suit l'effectif à la RÉSOLUTION, pas à la pose**
  (`_resolveTowers`, `_resolveSceau`) : une équipe qui perd un joueur pendant
  l'annonce ne peut pas tenir la place qui était la sienne.
- **La parade d'une prison est la CAGE, pas l'esquive** : un joueur cloué par
  `_markTick` ne prend pas le sol (`_zoneApply`).
- **`bars` est une propriété du ROSTER** (`CFG.BOSS_BARS` en repli). Le final en
  a huit.
- **N barres font N−1 ruptures, donc N−1 entrées d'`unlock`** : `phase` plafonne
  à `bars - 1`, `bossPool` lit `unlock[0..phase-1]`. Le final a **sept** entrées.
- **La file d'attaques différées est une LISTE**, pas un emplacement unique.
- **Chaque barre du boss final OUVRE sur le patron qu'elle vient de débloquer**,
  par cette file.
- **La rupture de barre ne blesse pas**, et elle est déclinée par **boss**
  (`_bossBreak`). Chaque variante **s'annonce**. Le boss peut mourir dans sa
  propre rupture : tester `this.boss` après chaque tour de boucle.
- **LE PALIER S'OUVRE AU PLANCHER, PAS À LA RUPTURE PRÉCÉDENTE**
  (`BOSS_CFG.PALIER_TIME`, `_bossBars(b, dt)`). L'ancien `BAR_DWELL` comptait
  depuis `lastBreak`, donc une barre fondue en 2 s laissait 8 s où le boss ne
  prenait plus rien et une barre lente n'en laissait aucune : **le temps mort
  était maximal exactement quand l'équipe jouait le mieux**. Mesuré, part du
  combat au palier : 4 % au Ravageur contre **54 %** à l'Oracle en calme, 42 % en
  normal. La fenêtre est maintenant **courte et constante** — 10 à 17 % partout —
  et la durée d'un combat redevient la somme des fontes, donc `hpMul` règle
  vraiment la durée.
  - **Elle est courte parce que la mesure le dit.** Première écriture à 2,6 s :
    quatre paliers pesaient 10,4 s sur 53 s, soit **20 %**, plus que la règle
    qu'elle remplaçait n'en produisait à la médiane. Le défaut n'était pas le
    niveau, c'était la **variance**.
  - **Les dégâts en excès restent perdus** (`_damage`) : la banque a été retirée
    parce qu'elle cadençait la mort du boss sans jamais la retarder.
  - **La dernière barre du final a son palier elle aussi**, et `b.finalLibre` en
    est le terminus — sans lui le plancher se rouvre à l'image suivante, puisque
    `palierOuvert` retombe à zéro dès que le plancher disparaît.
  - **LE FINAL RESPIRE DE PLUS EN PLUS** (`FINAL_PALIER_RAMP`, `_palierTime(b)`) :
    sa fenêtre s'allonge avec la phase, 1,4 s à la première rupture et 4,8 s au
    moment où il devient tuable, soit **3,5×**. Sept ruptures qui ouvrent chacune
    une couche, toutes cadencées pareil, sont une escalade sans palier de lecture.
    Aux fenêtres tardives, le patron différé par `PALIER_AMORCE` **se résout dans
    la fenêtre** : la mécanique de la phase suivante se joue pendant que le boss
    est invulnérable, ce qui est exactement l'intention écrite du palier.
  - **La respiration se paie en PV, jamais sur l'horloge.** `FINAL_HP_MUL`
    descend de ce que les fenêtres ajoutent (1,30 → 1,17 pour 11,2 s → 24,9 s).
    Ce qui change est la **composition** du combat, pas sa durée : moins de
    fonte, plus de moments étagés. Ajoutée par-dessus, la respiration sortait le
    final de la bande à quatre joueurs.
- **L'EMPORTEMENT SE COMPTE PAR BARRE** (`_bossEnrage`,
  `ENRAGE_PAR_BARRE × b.bars`, puis `ENRAGE_STEP`). Deux secondes absolues —
  150 s, 300 s pour le final — contre des combats de 40 à 120 s : il ne partait
  **jamais** en calme ni en normal à deux, 4 % à quatre, 8 % en solo, et jamais
  sur un final. Le nombre de barres est ce qui fait la longueur d'un combat, donc
  un boss à huit barres a plus de temps qu'un boss à cinq **sans seconde
  constante**. Il vient du **jeu**, pas du critère : l'indexer sur
  `BOSS_FIGHT_MAX` rendrait `verifierBoss` vrai par construction.
  Il monte dégâts de zone et cadence, **s'annonce à chaque palier**, et passe par
  `_zoneDamage()` et `attackCd`, donc sous le plafond des mécaniques.
- **`BOSS_ENRAGE_MIN`/`MAX` est une BANDE, pas un plafond.** Le critère n'avait
  qu'une borne haute, donc « jamais » le passait : l'anti-enlisement est resté
  mort pendant tout un plan sans qu'aucune mesure ne le dise.
- **LE POOL EST UNE LISTE, PAS UN PRÉFIXE** (`BOSS_POOL`, huit entrées) : le
  roster est **append-only** puisque l'index circule dans `bo[9]`, donc les
  finaux vivent *après* les boss de pool dans le tableau. `BOSS_POOL_COUNT` (5)
  dit combien une **manche** en montre, pas combien le dépôt en compte — une
  partie n'en voit que 5/8.
- **Un final par difficulté** (`finalPour`, `finalPour(diffIndex)`,
  `estFinal(kind)`) : Récitant en calme, Amalgame en normal, Silence en
  cauchemar. Aucun final n'est tiré ; `_pickBoss` le rend quand
  `_rosterCleared()` — **`bossKindsKilled.size >= BOSS_POOL_COUNT`**, ce que la
  manche a montré et non la taille du pool. `finalDone` l'empêche de revenir.
- **Le tirage se souvient de la MANCHE PRÉCÉDENTE** (`state.bossPrecedents`,
  rempli par `room.js` depuis le `bossSeen` de la manche d'avant) : ce que la
  précédente a montré passe en dernier. Mesure : **au moins 3 boss nouveaux**
  entre deux manches consécutives, pire cas sur 500 paires.
- **Le boss final clôt le segment 6**, et rien d'autre ne le fait sortir.
- **Le sceau ne coexiste pas avec un autre ordre du même axe** (`_mechLibre`,
  `_atkSceau`) ; un échec le **repose**. Son
  cumul est un **temps** (`m.cur` en secondes) qui **redescend à mi-vitesse**. Il
  réutilise `towerCount(alive)` ; sanction **pleine sur toute l'équipe** dès qu'un
  foyer est vide.
- **Le deck se distribue exactement : cinq boss pour cinq places, à tout
  effectif.** Pas de `minPlayers` sur un boss ; `MECH_SPREAD` et `MECH_LINK`
  sortent du répertoire solo.
- **Le répertoire du boss est indexé sur le SEGMENT**, pas sur `bossCount`.
- **`state.victory` et `state.finalKill`** sont posés sur `state.time`. La
  victoire est relevée par `endRound()` **avant** `awardRun`. Record **par
  difficulté** (`bestFinal`).
- **Les structures de mécanique passent par `_bossPower()`**, comme le boss.

### Difficulté et puissance

- **PLUS RIEN N'INDEXE LA DIFFICULTÉ SUR LA PUISSANCE DE L'ÉQUIPE** (D2).
  `WAVE_HP_POWER_K` et `WAVE_RATE_POWER_K` valent **0** ; les PV de boss lisent
  `BOSS_POWER_REF` (2,36) au lieu de `_bossPower()`. Revenir en arrière = trois
  constantes. `powerIndex()`, `bossPower()`, `_teamPower()` et `p.powerMods`
  restent (fenêtre de build).
- **`powerIndex(mods, flat)` et `bossPower()` sont exportés en fonctions pures**,
  comme `fullMods` et `effectiveCards`. Les deux côtés passent `flat`. Le flat
  « boss uniquement » compte à **un tiers**.
- **Toute nouvelle source de dégâts permanente doit entrer dans `powerIndex`**, et
  toute pénalité qui accompagne un gain aussi.
- **L'indexation porte sur la puissance mesurée, jamais sur la composition de
  l'équipe.**
- **La pression compte les joueurs VIVANTS** (`aliveCrowd()`, hystérésis 8 s : on
  descend après délai, on remonte immédiatement), **l'expérience les joueurs
  CONNECTÉS** (`joueurs^WAVE_CROWD_EXP` dans `_addXp`).
- **La progression permanente est EXCLUE de la difficulté par construction** :
  `p.powerMods` = cartes + classe (lu par `_playerPower()`), `p.mods` = copie +
  méta.
- **Cette exclusion ne vaut QUE pour la difficulté : ce qu'on MONTRE au joueur
  est `p.mods`, méta comprise.** Le panneau de stats et la fenêtre de build
  rejouent `metaLinesFor()` + `applyMeta()` — point de passage unique partagé
  avec `room.js`, **lignes équipées seulement** — sur **son propre** profil, le
  seul qui voyage. Sans quoi un compte qui a monté « Précision » lit 5 % de
  critique là où le serveur en roule 15.


### Biome et environnement

- **LE BIOME NE COÛTE RIEN AU RÉSEAU** : deux nombres (index, graine) dans le
  payload de salon. La géométrie se **régénère à l'identique des deux côtés**
  (`buildBiome`, mulberry32 écrit à la main), l'état d'un danger est une
  **fonction du temps de manche**.
- **Seule exception : les PV d'un mur destructible** (clé `ob`), liste **creuse**
  de paires (index, part de PV), **absente** tant que rien n'a été touché.
- **`kind` nomme la FAMILLE d'un obstacle, et la simulation ne le lit jamais.**
  Il traverse `buildBiome` pour le seul rendu (`BLOC[biome][kind]`) : collision,
  navigation, apparition et dépôt restent sur l'AABB, au pixel près. Ajouter une
  famille ne peut donc pas déplacer un mur. Table `BLOCS`, append-only, `lieu`
  en déclare le propriétaire.
- **Un danger d'environnement est du SOL, jamais un télégraphe** : il s'annonce
  par sa **géométrie permanente**. Le canal du télégraphe instantané appartient au
  **boss** et ne se partage pas.
- **Le plafond de surface est STRICT** (`BIOME_CFG.HAZARD_SURFACE_MAX`, 12 % pour
  l'ensemble, traînées et spores comprises). `buildBiome` **jette** les dangers
  qui franchissent le budget — et il les **compte** (`hazardJetes`) : une entrée
  déclarée pouvait n'être jamais construite sans que rien ne le dise.
- **L'échelle d'un danger appartient au lieu, ses dégâts non.** `ECHELLE`
  multiplie `r` par lieu (l'Usine est la référence et n'y figure pas) ; `dot` ne
  bouge jamais, sinon le joueur réapprend un barème à chaque lieu. Et
  `verifierBiomes()` refuse qu'une surface de danger s'écarte de plus de **25 %**
  de la moyenne des quatre à mode égal : une identité qui rendrait un lieu
  franchement plus dur est un déséquilibre.
- **Chaque lieu pose les CINQ `kind`**, répartis entre normal (les deux qui ne
  blessent pas) et cauchemar. `hazardsDe(lieu)` le déclare ; `verifierDangers()`
  (`render/dangers.js`) croise avec la table de dessin dans les deux sens.
- **La géométrie est posée à la construction et ne bouge plus.** Ce qui peut
  naître en cours de manche : les zones, traversables. `verifierBiomes()` est le
  critère rejouable (plafonds, aucun danger en calme, aucun danger **qui blesse**
  en normal, **passage traversable dans le carré central minimal** `SHRINK_MIN`).
- **La géométrie DÉPEND du mode**, et c'est `min` sur une entrée d'`OBSTACLES`
  qui le dit (0 partout, 1 dès le normal, 2 en cauchemar seul). L'invariant
  inverse était écrit ici jusqu'en 0.22.6.
  - **Ce qui change est ce qu'il y a, pas la taille de ce qu'il y a.** Un facteur
    d'échelle sur `w`/`h` aurait donné la même arène grossie — donc le même
    parcours, avec moins de place ; une entrée en plus ou en moins change le
    **chemin**.
  - On **ouvre par le centre** (les entrées retirées au calme sont celles qui
    encombrent le milieu) et on **resserre par le pourtour**.
  - **Monotonie stricte, vérifiée** : `verifierBiomes()` refuse qu'un mode n'ait
    pas plus d'obstacles *et* plus de surface que le précédent, par lieu. Trois
    modes qui produisent la même géométrie ne servent à rien ; un cauchemar plus
    ouvert qu'un normal est une inversion de signe que personne ne verrait.
  - **Aucun PV, aucun dégât, aucun multiplicateur ne bouge.** Le terrain n'est
    pas un second système de difficulté : `_teamPower()` et le résidu de
    `DIFFICULTIES` restent seuls.
- **Un mur destructible ne cède qu'au TIR DU JOUEUR, ne rend NI SCORE NI
  EXPÉRIENCE, et ne passe PAS par `_damage()`.**
- **Une météo est un MODIFICATEUR GLOBAL, jamais une entité** (cauchemar
  seulement, un segment sur trois sans). Déduite de `(graine, segment)`, mais
  **annoncée** par le canal d'alerte en `ALERT_INFO`. La **brume** n'assombrit que
  les **bords** ; la **bourrasque** pousse **joueurs et ennemis**.
- **Les points de récolte** n'apparaissent jamais à moins de
  `HARVEST_PLAYER_DIST` d'un joueur vivant, ni pendant un boss. Le cristal se
  détruit **hors de `_bulletHitEnemy()`**. Les **éclats** sont versés à **chaque**
  joueur et meurent avec le `GameState`.

