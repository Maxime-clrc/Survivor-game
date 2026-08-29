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
| **4** | 0.21.3 | **Les quatre archétypes.** Harceleur, générateur, saboteur, relais — un verbe de gameplay chacun. | chacun change une décision du joueur, mesurée |
| **5** | 0.21.4 | **Le groupe.** Priorités de cible produites par la composition, pas par une IA. | tuer le support change le combat, mesuré |
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
| E1 | 1 | `TRAIT_CFG.DASH_WARN_MAX` | 10 préavis simultanés pour un budget de 8, en cauchemar/4 j. Un préavis **déjà en cours** n'est pas recompté quand le corps **entre** dans une vue ; une meilleure navigation rend le cas plus fréquent. | recompter à l'entrée dans la vue, ou baisser `DASH_CD` |
| E2 | 1 | `TRAIT_CFG.TRAIL_SURFACE` | le sol de horde couvre 19 à 82 % d'une vue pour un budget de 12 %. **Antérieur au plan 18** (mesuré sur `git stash`), aggravé à la marge par une horde qui arrive vraiment. | `trailMax()` s'indexe sur la vue, pas sur la population : vérifier que le plafond est bien appliqué par vue et non globalement |
| E3 | 1 | `verifierPopulation` | « population en baisse au segment N » sur 9 profils sur 18, **avant comme après**. Les sims ne sont pas graînées, les comptes bougent d'un tirage à l'autre. | graîner `mesurePopulation` avant d'en tirer une conclusion |
| E4 | 2 | `ENEMY_TYPES[2].speed` (colosse, 44) | 90 corps devant un goulet de 200 px : **90/90 franchissent** en 30 s, avec ou sans colosses. Ils ne bouchent pas — ils mettent 1 600 px / 44 px/s ≈ 36 s à contourner un mur long. La sensation de « bouchon » est une sensation de **lenteur**. | monter la vitesse du colosse **ou** raccourcir les détours, jamais les deux ; la doctrine de vitesse plafonne à `0,90 × médiane` |
| E5 | 2 | `ROLE_CFG.FLANC_SPAN` / `flanc` du coureur | ±26° d'écart-type circulaire à 0,55. Lisible, mais le flanc n'est pour l'instant porté que par **un** type : son étalonnage n'a de sens qu'une fois le harceleur du lot 4 écrit, qui en fera son verbe. | régler les deux ensemble, pas le coureur seul |

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
