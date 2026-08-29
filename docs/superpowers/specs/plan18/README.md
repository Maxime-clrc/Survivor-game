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
| **8** | 0.21.7 | **Identité.** Silhouettes, animations et morts des nouveaux, sons sous le limiteur de voix. | `verifierFeedback()` muet · mix non saturé |

---

## 3 · Le registre d'équilibrage

**Rien de ce qui suit ne se règle pendant son lot.** Un chiffre touché au milieu
d'un lot masque ce que le lot a réellement changé. On les relève au passage, on
les laisse, et on les traite **en une passe après le lot 8**, à géométrie et
comportements figés — c'est la seule façon d'attribuer un écart à sa cause.

| # | relevé au lot | ce qui est en cause | ce qu'on a mesuré | piste |
|---|---|---|---|---|
| ~~E1~~ | 1 | ~~budget de préavis~~ | **CLOS au lot 3.** Le budget était reporté de l'image précédente, donc un corps qui *entrait* dans une vue en cours de préavis n'y figurait pas. Une passe dédiée le rend exact : 8 max par vue, mesuré, jamais 9. | — |
| E2 | 1, **diagnostiqué au lot 3** | `_groundZone()` / `horde: 1` | Le « sol de horde » couvre 21 à 41 % d'une vue pour un budget de 12 %. **Ce n'est pas la horde.** `_groundZone` a **cinq** appelants et estampille `horde: 1` sur tous : la traînée et les spores, mais aussi **la carte de terrain du joueur** (`_blastGround`, rayon `r × 0,7` d'un souffle) et **les nœuds du boss** (`BOSS_CFG.NOEUD_R`). Le calme, qui n'a aucun trait, affiche quand même 21 % — c'est la preuve. Le plafond `trailMax()` évince en plus « la plus ancienne zone de horde », donc le terrain d'un joueur peut évincer une traînée et l'inverse. | séparer le drapeau de **provenance** du drapeau de **budget** ; touche les cartes et le boss, donc hors du plan 18 |
| E3 | 1 | `verifierPopulation` | « population en baisse au segment N » sur 9 profils sur 18, **avant comme après**. Les sims ne sont pas graînées, les comptes bougent d'un tirage à l'autre. | graîner `mesurePopulation` avant d'en tirer une conclusion |
| E4 | 2 | `ENEMY_TYPES[2].speed` (colosse, 44) | 90 corps devant un goulet de 200 px : **90/90 franchissent** en 30 s, avec ou sans colosses. Ils ne bouchent pas — ils mettent 1 600 px / 44 px/s ≈ 36 s à contourner un mur long. La sensation de « bouchon » est une sensation de **lenteur**. | monter la vitesse du colosse **ou** raccourcir les détours, jamais les deux ; la doctrine de vitesse plafonne à `0,90 × médiane` |
| E5 | 2 | `ROLE_CFG.FLANC_SPAN` / `flanc` du coureur | ±26° d'écart-type circulaire à 0,55. Lisible, mais le flanc n'est pour l'instant porté que par **un** type : son étalonnage n'a de sens qu'une fois le harceleur du lot 4 écrit, qui en fera son verbe. | régler les deux ensemble, pas le coureur seul |
| E6 | 3 | `ATK_CFG.WARN` sur la **visée** | Le préavis de visée **n'améliore pas le taux d'esquive** : 33 % de touches sur une cible immobile, 9 % sur une cible qui bouge, avant comme après. Le temps de vol (0,7 à 1,3 s) fournissait déjà la fenêtre. Il est gardé pour l'**attribution** — savoir *qui* tire, dans une horde de 200 — et parce qu'il remplace une devinette du client qui était fausse. | le lot 5 doit démontrer la valeur d'attribution (priorité de cible), sinon la visée redevient instantanée |
| E7 | 3 | `ATK_CFG.AIM_SLOW` | La visée immobilise le tireur 0,5 s par cycle de 2,6 s, soit −13 % de vitesse moyenne. Le volume de tir, lui, est intact (−0,8 %). L'effet sur le **placement** du tireur n'a pas été mesuré. | mesurer la distance moyenne tireur/cible au moment du tir, à la passe finale |
| E8 | 4 | `DIFFICULTIES[i].roster` | Les trois archétypes sont entrés en **cauchemar**, et seul le harceleur en **normal** ; le calme n'en voit aucun. C'est un placement provisoire, pas une décision de composition : ils pèsent 14,5 % de la horde en cauchemar. | le lot 7 redistribue délibérément, avec les mesures de composition |
| E9 | 4 | `_groundZone()` | Le saboteur est un **cinquième** appelant, et un légitime cette fois : il pose bien du sol de horde. Il aggrave néanmoins le conflit d'étiquette décrit en E2. | à traiter **avec** E2, pas séparément |
| E10 | 4 | `ENEMY.TINT` | Douze types pour une roue de teintes déjà serrée : harceleur (jaune) contre porte-bouclier (ocre), générateur (bleu ciel) contre soigneur (turquoise). La charte dit qu'un corps se reconnaît **sans sa couleur** — la silhouette porte donc seule, et elle n'a pas été jugée à l'écran. | lot 8 : vérifier les douze silhouettes en niveaux de gris, à 200 corps |
| E11 | 4 | `egideShield` = 0,34 | Ignorer le générateur coûte **+52 %** de dégâts pour nettoyer le même paquet ; le tuer d'abord coûte +13 %. Le gradient est le bon, mais il n'a été mesuré que sur un paquet de fantassins focalisés à cadence constante. | rejouer sur une vraie manche, avec les dix armes |

À chaque lot, on ajoute une ligne ici plutôt qu'un réglage dans le code.

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
