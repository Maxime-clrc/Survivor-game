# Survivor LAN — plan 18 : les ennemis 2.0

Les plans 13 à 16 ont amené le **monde** au niveau, le plan 17 le **HUD**. Ce
qui se déplace dedans, non : neuf types qui partagent une seule façon de bouger,
un évitement qui ne voyait pas les murs, et une difficulté qui se règle encore
beaucoup par un résidu chiffré.

Ce plan ne touche **ni les boss, ni les cartes, ni les classes, ni la géométrie
des lieux**. Il ne crée pas de second système de scaling : `_teamPower()`,
`powerIndex()` et le résidu `hp`/`spawn`/`dmg` de `DIFFICULTIES` restent les
seuls, et `WAVE_HP_POWER_K` reste à zéro.

---

## 1 · Ce qui est déjà là, et qu'on ne réécrit pas

| acquis | où |
|---|---|
| bestiaire data-driven, 9 types, quotas `share × enemyCap()` | `enemies.js`, `_pickType` |
| traits attachés à `(type, difficulté)`, masque résolu à l'apparition | `TRAIT_BY_TYPE`, `e.traits` |
| difficulté = **profil** (`roster`, `traits`, `script`, `bossProfil`) | `DIFFICULTIES` |
| séparation par grille, tri par comptage, preuve de couverture écrite | `_grille()` |
| morsure d'un pixel, joueur jamais déplacé en retour | `PLAYER_SEPARATION`, `PLAYER_BITE` |
| doctrine de vitesse, rampe multiplicative, écart lent/rapide invariant | `SPEED_DOCTRINE`, `verifierVitesses` |
| 9 silhouettes procédurales + animation par état | `sprites.js`, `enemyFrame()` |
| matière de mort **déduite** de ce que fait la créature | `matiereDe()`, `feedback.js` |
| limiteur de voix, recettes croisées avec les tables | `verifierFeedback()` |
| navigation en trois couches, un champ par joueur | `navigation.js` (lot 1) |

---

## 2 · Les lots

Un lot = un commit = un bump de patch. Le plan ouvre **0.21.x**.

| lot | version | contenu | critère |
|---|---|---|---|
| **1** | 0.21.0 | **La navigation.** Grille de 40 px, diffusion de Dial, un champ par joueur, ancre de côté, point visé atteignable, sondage à trois échantillons, tireur qui se replace. | `verifierDeplacement()` muet · coût < 0,05 ms à 200 corps |
| **2** | 0.21.1 | **Les rôles dans le déplacement.** Masse **déduite du rayon**, écart de poste entre pairs d'un même type, biais de flanc déclaré. Aucun `if (type === …)`. | tireurs qui ne s'empilent pas (39 → 65 px) · le lourd au premier rang · coût nul |
| **3** | 0.21.2 | **La grammaire d'attaque.** Télégraphe → action → impact → récupération, un seul point de passage, préavis lisible et borné par vue. | aucune attaque sans préavis · budget de préavis tenu |
| **4** | 0.21.3 | **Trois archétypes.** Harceleur (« es-tu couvert ? »), générateur (« qui d'abord ? »), saboteur (« où te tiens-tu ? »). | chacun change une décision du joueur, mesurée |
| **5** | 0.21.4 | **Le groupe, et le relais.** Le quatrième archétype est *une* interaction entre corps : sa place est ici, pas au lot 4. Priorités de cible produites par la composition, pas par une IA. | tuer le support change le combat, mesuré |
| **6** | 0.21.5 | **Les élites.** Une variante de **comportement** par type, la signature reste lisible. | type + élite reconnus sans texte |
| **7** | 0.21.6 | **La difficulté par la composition.** Calme / normal / cauchemar se séparent par le roster, l'agressivité et le rythme, pas par le résidu. | écart de mode conservé à résidu **réduit** |
| **8** | 0.21.7 | **Identité.** Silhouettes rendues **vérifiables** (cinq axes), éclatements de mort des quatre nouveaux, expression tirée de l'instantané. **Aucun son ajouté** : les trois matières couvrent les treize types. | `verifierFeedback()` muet sur les 41 recettes réelles · `verifierSilhouettes()` : une paire, antérieure au plan |

---

## 3 · Le registre d'équilibrage

**Rien de ce qui suit ne se règle pendant son lot.** Un chiffre touché au milieu
d'un lot masque ce que le lot a réellement changé. On les relève au passage, on
les laisse, et on les traite **en une passe après le lot 8**, à géométrie et
comportements figés — c'est la seule façon d'attribuer un écart à sa cause.

| # | relevé au lot | ce qui est en cause | ce qu'on a mesuré | piste |
|---|---|---|---|---|
| ~~E1~~ | 1 | ~~budget de préavis~~ | **CLOS au lot 3.** Le budget était reporté de l'image précédente, donc un corps qui *entrait* dans une vue en cours de préavis n'y figurait pas. Une passe dédiée le rend exact : 8 max par vue, mesuré, jamais 9. | — |
| ~~E2~~ | 1, diagnostiqué au lot 3, **CLOS en 0.21.8** | `_groundZone()` / `horde: 1` | Le « sol de horde » couvre 21 à 41 % d'une vue pour un budget de 12 %. **Ce n'est pas la horde.** `_groundZone` a **cinq** appelants et estampille `horde: 1` sur tous : la traînée et les spores, mais aussi **la carte de terrain du joueur** (`_blastGround`, rayon `r × 0,7` d'un souffle) et **les nœuds du boss** (`BOSS_CFG.NOEUD_R`). Le calme, qui n'a aucun trait, affiche quand même 21 % — c'est la preuve. Le plafond `trailMax()` évince en plus « la plus ancienne zone de horde », donc le terrain d'un joueur peut évincer une traînée et l'inverse. | **fait** : `z.sol` nomme la provenance, le plafond et la mesure ne comptent que la leur. `verifierTraits` est muet. |
| E3 | 1 | `verifierPopulation` | « population en baisse au segment N » sur 9 profils sur 18, **avant comme après**. Les sims ne sont pas graînées, les comptes bougent d'un tirage à l'autre. | graîner `mesurePopulation` avant d'en tirer une conclusion |
| E4 | 2 | `ENEMY_TYPES[2].speed` (colosse, 44) | 90 corps devant un goulet de 200 px : **90/90 franchissent** en 30 s, avec ou sans colosses. Ils ne bouchent pas — ils mettent 1 600 px / 44 px/s ≈ 36 s à contourner un mur long. La sensation de « bouchon » est une sensation de **lenteur**. | monter la vitesse du colosse **ou** raccourcir les détours, jamais les deux ; la doctrine de vitesse plafonne à `0,90 × médiane` |
| E5 | 2 | `ROLE_CFG.FLANC_SPAN` / `flanc` du coureur | ±26° d'écart-type circulaire à 0,55. Lisible, mais le flanc n'est pour l'instant porté que par **un** type : son étalonnage n'a de sens qu'une fois le harceleur du lot 4 écrit, qui en fera son verbe. | régler les deux ensemble, pas le coureur seul |
| ~~E6~~ | 3, **tranché au lot 5** | `ATK_CFG.WARN` sur la **visée** | **La promesse « démontrer ou retirer » était le mauvais test, et c'est moi qui l'avais posée.** Deux instruments indépendants : dans une horde, viser ce qui s'apprête ne change rien (2 515 dégâts contre 2 564) ; face à douze tireurs et rien d'autre — où la balle est la seule source de dégâts — 368 contre 372. Et le **témoin valide le verdict d'un côté seulement** : dans la horde, la pire politique possible (tirer sur le plus loin) encaisse 2 544, *moins* que la meilleure — l'instrument est aveugle à la survie. La valeur d'un télégraphe est la lisibilité pour un **humain** : aucun banc de bots ne la mesure. **Conservée sur son coût** (−0,8 % de volume de tir, quelques octets), pas sur un gain démontré. | à juger **à l'écran** au lot 8, avec les silhouettes |
| E7 | 3 | `ATK_CFG.AIM_SLOW` | La visée immobilise le tireur 0,5 s par cycle de 2,6 s, soit −13 % de vitesse moyenne. Le volume de tir, lui, est intact (−0,8 %). L'effet sur le **placement** du tireur n'a pas été mesuré. | mesurer la distance moyenne tireur/cible au moment du tir, à la passe finale |
| ~~E8~~ | 4, **tranché au lot 7** | `DIFFICULTIES[i].roster` | Placement **décidé** : cinq / huit / treize types. Le calme s'arrête aux cinq d'origine, le normal **avant** le soutien et le déni de sol, le cauchemar prend tout. Les quatre archétypes reçoivent aussi leurs premiers traits. | — |
| ~~E9~~ | 4, **CLOS en 0.21.8** | `_groundZone()` | Le saboteur est un **cinquième** appelant, et un légitime cette fois : il pose bien du sol de horde. Il aggrave néanmoins le conflit d'étiquette décrit en E2. | **fait** avec E2 : le saboteur est bien `SOL_HORDE`, et il est désormais seul avec la traînée et les spores dans ce budget. |
| E10 | 4 | `ENEMY.TINT` | Douze types pour une roue de teintes déjà serrée : harceleur (jaune) contre porte-bouclier (ocre), générateur (bleu ciel) contre soigneur (turquoise). La charte dit qu'un corps se reconnaît **sans sa couleur** — la silhouette porte donc seule, et elle n'a pas été jugée à l'écran. | lot 8 : vérifier les douze silhouettes en niveaux de gris, à 200 corps |
| E11 | 4 | `egideShield` = 0,34 | Ignorer le générateur coûte **+52 %** de dégâts pour nettoyer le même paquet ; le tuer d'abord coûte +13 %. Le gradient est le bon, mais il n'a été mesuré que sur un paquet de fantassins focalisés à cadence constante. | rejouer sur une vraie manche, avec les dix armes |

| E12 | 5 | `lienDot` = 34 | L'arc ne blesse que ce qui reste dedans : 701 dégâts sur une cible qui campe, 45 sur une cible qui bouge. C'est voulu — c'est une menace **positionnelle** — mais le chiffre n'a été mesuré que sur six relais isolés, jamais mêlés au reste de la horde. | rejouer en composition réelle à la passe finale |
| E13 | 5 | `SUPPORT` et la cadence | Viser les soutiens tue **+37 %** et vide le terrain de ses soutiens (26,3 → 1,9 en vue), mais ne réduit **pas** les dégâts subis. Le banc ne peut pas dire si c'est le jeu ou l'instrument : à 500 corps, le contact sature et aucune politique de cible ne le change. | mesurer la survie à **densité moyenne**, là où le contact ne sature pas |

| E14 | 6 | `shieldArc` du porte-bouclier | **Correction d'un bug, donc un changement d'équilibre réel.** Il absorbait de *toutes* les directions ; il n'absorbe plus que dans son arc. Tout ce qui le frappait de dos — souffles, ricochets, faisceaux qui balaient, un second joueur — devient efficace. L'ampleur n'a **pas** été mesurée en manche réelle. | mesurer le temps de mise à mort du porte-bouclier, avant/après, à la passe finale |
| E15 | 6 | `elite` du harceleur | La plus faible des treize variantes : 0,05 → 0,04 de temps au contact, parce que sa base n'y passe déjà presque aucun temps. Son verbe résiste à l'amplification. | lui chercher une variante qui porte, ou assumer qu'un type puisse avoir une élite discrète |
| E16 | 6 | `elite` du colosse et du chœur | Surcharges d'un champ que le type possède **déjà** en normal et en cauchemar (`TRAIT_AURA` pour le colosse, `auraRadius` pour le chœur) : l'écart n'est qu'un élargissement (0,65 → 0,77 · 2,12 → 2,88). En **calme**, où aucun trait n'est attaché, l'élite colosse est la seule à porter une aura — la variante y vaut beaucoup plus. | assumé, mais à revoir avec la composition du lot 7 |
| E17 | 6 | `ISOLE_COUVERT` = 2,2 | Le poids ne peut renverser un choix de cible que si les distances sont **comparables** : l'isolé deux fois plus loin donne un rapport au carré de 8,2 que 2,2 ne retourne pas. Le mécanisme marche (lot 4 : 46 % → 59 %), mais sa fenêtre d'effet est étroite. | monter le poids **ou** le rendre non quadratique, à la passe finale |

| E18 | 7 | `hp` de cauchemar, en **solo** | La coupe 1,35 → 1,10 conserve l'écart à quatre joueurs (1 475 contre 1 477) mais **monte la pression solo de 23 à 38 %** selon les graines : une horde qui meurt plus vite se renouvelle plus vite, et un joueur seul en voit davantage arriver. Trois graines ne suffisent pas à régler ça, et aucun réglage n'a été validé **aux deux effectifs**. | remesurer solo sur dix graines, puis n'ajuster qu'un seul multiplicateur |
| E19 | 7 | `spawn` de cauchemar (1,28) | **Inerte au plafond** : 1,28 → 1,45 ne produit aucun effet mesurable, la horde étant déjà saturée. Il ne compte qu'avant la saturation, donc son réglage actuel n'est justifié par aucune mesure de fin de manche. | mesurer son effet **avant** minute 10, là où il agit |
| E20 | 7 | le pilote de mesure | Toutes les pressions sont relevées avec un pilote à **900 DPS** qui tourne en cercle. C'est un instrument, pas un joueur : en calme solo il tue 217 corps/min et la horde ne dépasse jamais 3 corps, d'où « 3 dégâts/min ». Les rapports entre modes valent ; les valeurs absolues, non. | rejouer les écarts de mode avec les vraies armes à la passe finale |

| E21 | 8 | silhouettes **porte-bouclier / chœur** | `verifierSilhouettes()` les confond sur les **cinq** axes (élancement 0,96/1,12, matière 0,66/0,78). La paire est **antérieure au plan 18**. Le pavois a été avancé de huit pixels — son verbe est un blocage frontal — mais la mesure ne bouge pas : déplacer la masse déplace la boîte englobante, et `avance` est invariante par translation. | **un œil humain**, pas un chiffre : une capture en niveaux de gris à 200 corps |
| ~~E10~~ | 4, **tranché au lot 8** | `ENEMY.TINT` | La roue est bien saturée à treize types, et c'est assumé : la silhouette porte seule, et elle est désormais **vérifiable** (`verifierSilhouettes()`, cinq axes). Une seule paire résiste, reportée en E21. | — |

À chaque lot, on ajoute une ligne ici plutôt qu'un réglage dans le code.

### Deux pièges de banc d'essai, notés parce qu'ils se reproduiront

- **`_spawnEnemy` replie en silence** sur le fantassin tout type absent du roster
  de la difficulté. Un banc réglé sur *normal* mesurait des fantassins là où il
  croyait mesurer des générateurs. **Vérifier `e.type` après l'apparition.**
- **Épingler `hordeTime` peut verrouiller un ÉVÉNEMENT.** En le figeant à 120 s
  au segment 6, le banc restait sur le beat de la *nuée* : composition forcée à
  100 % de coureurs, `types: [1]`, cadence ×2,6. La mesure disait « aucun
  soutien à l'écran » et c'était vrai — il n'y en avait aucun dans l'arène.
  **Épingler sur un beat sans `event`.**

---

## 4 · Ce que le plan refuse

- **Aucun second système de scaling.** `_teamPower()` et le résidu de
  `DIFFICULTIES` restent seuls. Un archétype qui « aurait besoin » d'un
  ajustement passe par le profil de difficulté, jamais par une constante à lui.
- **Aucune statistique de type par difficulté** — le refus est déjà écrit dans
  `SIMULATION.md`, et les traits sont le mécanisme prévu pour ça.
- **Aucun `if (type === …)` dans la simulation.** Un comportement nouveau est une
  colonne de table ou un trait, sinon il n'est pas fini.
- **Aucune modification des boss, des cartes, des classes ni de la géométrie des
  lieux.** Les hooks nécessaires aux plans suivants sont créés, pas exploités.
- **Aucun ennemi ajouté pour la variété visuelle.** Quatre archétypes, quatre
  verbes de gameplay. Moins et excellents.
