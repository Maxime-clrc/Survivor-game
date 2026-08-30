# Survivor LAN — plan 24 : le boss comme événement

Le dépôt n'a pas un boss 1.0. Il a onze boss, huit dans le pool, cinq montrés
par manche, un final par difficulté, quarante-cinq patrons, une grammaire de
télégraphe à onze formes et quatre classes de préavis, un verrou de coexistence
par axe, six archétypes uniques, un rail de barre segmenté et un profil de
difficulté à huit leviers. **La demande « boss 2.0 » porte donc sur ce qui
manque à ce système, pas sur un système à écrire.**

L'audit ci-dessous est **mesuré**, pas relu.

---

## 1 · Ce que l'audit a trouvé

### Ce qui est déjà là, et qu'on ne refait pas

| demande de la mission | état | preuve |
|---|---|---|
| bibliothèque de patrons réutilisables | **45 patrons**, aucun orphelin dans les deux sens | `BOSS_ROSTER.base/unlock` × `_atk()` croisés : 45 clés, 45 `case`, 0 repli silencieux |
| patrons télégraphiés et lisibles | `FORMES` (11), `WARN_CLASSES` (4), `AXES`, `_mechLibre` avant le tirage, `_zoneEcarteAbris`, `_solPret` | `verifierGrammaire()`, `verifierCoexistence()`, `verifierMecaniques()` |
| identité : silhouette, comportement, rythme | 11 peintres dédiés, 6 archétypes uniques vérifiés, passives par boss (jauge d'Oracle, diffus, jumeaux) | `render/boss.js`, `verifierArchetypes()` |
| phases : seuil de PV, nouvelles attaques, rythme | `bars` par boss, `unlock[phase]`, `_bossBreak` décliné par boss, cadence `1 + phase/2` | `_bossBars`, `_bossAttack` |
| barre premium | rail segmenté, rupture animée dans le rail, état de phase, état d'emportement, rail de palier, pouls du final, teinte par boss | `hud.js:511-598` |
| multijoueur sans multiplier les projectiles | `adaptMech`/`fallback`, `towerCount`, `_stackRadius`, `_spreadMin`, `joueurs^0,75` sur les renforts ; `_atkSalve` ne lit pas l'effectif | mesuré : tous les patrons de chaque boss sortent à 1, 2 et 4 joueurs |

### Les huit défauts

| # | défaut | preuve mesurée |
|---|---|---|
| 1 | **L'amer TÉLÉPORTE à l'arrivée du boss.** `amerDe(seed, cle, hazardsActifs())` choisit le candidat le plus loin de tout danger ; pendant un boss `hazardsActifs()` est vide, donc tous les candidats valent `Infinity` et c'est le **premier** qui sort. Le point unique du lieu, 460 px de rayon, « ancré au MONDE » selon sa propre règle, saute à l'apparition du boss et resaute à sa mort. | **299 cas sur 320** (4 lieux × 2 modes × 40 graines) : **93 %**, saut maximal **2 596 px**. `render/decor.js:455-487` |
| 2 | **`biomeNu` n'est écrit dans aucune doc, et la règle qui devrait le dire est vide de sens.** « Le **boss** n'y passe pas » (`SIMULATION.md:294`) : `_bossMove` n'appelle ni `_obstacleBlock` ni `_wallBlock` — il n'y a simplement plus rien à traverser. Le semis bouge pour la même raison que l'amer : `occupe()` ne rejette plus rien, donc des props apparaissent dans l'empreinte des blocs. | **0 obstacle sur 62 377 images de combat**. `game_state.js:3550`, `render/stage.js:156`, `render/props.js:97` |
| 3 | **`hpMul < 1` ne raccourcit pas le combat, il achète du temps mort.** La durée est plancherée par `dwell × (bars−1)` : première rupture à **exactement `dwell`** pour tous les boss ordinaires. Un boss plus léger n'est pas tué plus vite, il **attend** à son plancher de barre. Le défaut grandit quand la difficulté baisse, parce que la marge de DPS y est la plus grande. | part du combat où `palier > 0` — **calme** 2 j : Oracle **54 %**, Tisseur 36 %, Prisme 25 %, Matriarche 24 % ; **normal** 2 j : Oracle 42 %, Métronome 40 %, Tisseur 26 % ; 4 j : Veilleur 37 % |
| 4 | **L'écart de durée entre deux boss va de 2,6× à 18×**, et la bande [50, 90] s que le dépôt s'est écrite n'est tenue à aucun effectif. `verifierBoss` ne teste que la médiane **par segment** : un boss aberrant est invisible au critère. | 1 j normal : Métronome 59 s … **Jumeaux 156 s** · calme 2 j : médiane ordinaire **43 s**, sous la bande · cauchemar 2 j : Prisme 65 s, Matriarche 219 s, **Tisseur 1 190 s** (n = 1, bot naïf — à reconfirmer au bot du dépôt) |
| 5 | **L'emportement est du contenu mort.** `ENRAGE_AT = 150 s` contre 43 s (calme) / 51 s (normal 2 j) / 86 s (cauchemar 2 j) de combat ordinaire ; `FINAL_ENRAGE_AT = 300 s` contre 102–172 s de final. | **0 %** des combats en calme, **0 %** en normal 2 j, 4 % à 4 j, 8 % en solo, 12 % en cauchemar. `verifierBoss` a un plafond (`BOSS_ENRAGE_MAX`) et **aucun plancher** : « jamais » passe le critère |
| 6 | **Le palier ne se voit jamais sur le boss final.** C'est pourtant « le sommet de la phase » selon le code lui-même. Le final est tenu par ses PV du début à la fin : sept ruptures, sept couches de plus, **aucune respiration**. | part `palier > 0` du final : **0 %** à 1, 2 et 4 joueurs |
| 7 | **Un son d'arrivée et un son de rupture pour onze boss.** `audio.js` : `boss`, `bossBrise`, `bossQueue`. `tracks.js` tire au hasard dans une playlist `boss` commune. C'est le seul canal d'identité qui n'a rien par boss. | `render/fx.js:278`, `fx.js:1695` |
| 8 | **Cinq entrées de `BOSS_SKIN` recopient la prise d'arène du final, à l'identique.** Veilleur, Tisseur, Prisme, Récitant, Silence portent tous `amb #2e2a30, k 0.80, vig 1.45, puls [0.35,0.22], atmo #e8e4dc`. Seul le corps change de couleur — c'est exactement ce que la mission interdit. | `palette.js:350-359`, lu par `pasBoss()` / `bossVignette()` / `bossAtmo()` |

Et un défaut de couture : `_atkRegardDouble` calcule son différé sur
`BOSS_CFG.GAZE_WARN` **brut** (`game_state.js:5629`) alors que le regard s'ouvre
sur `this._warn(GAZE_WARN)`. En cauchemar dernière phase (`reflexe: 4`) la
fenêtre tombe à 0,8 s et le second regard arrive quand même 4,0 s plus tard :
**3,2 s de trou**, et la signature du Veilleur se défait là où elle devrait être
la plus serrée.

---

## 2 · Les lots

| lot | version | contenu | critère |
|---|---|---|---|
| **1** | 0.27.0 | **La durée d'un combat est un fait, pas un plancher.** ✔ livré. Le séjour de barre cesse de compter depuis la rupture précédente : le palier s'ouvre **au plancher**, dure `PALIER_TIME` (1,0 / 1,4 / 1,8) et la durée du combat redevient la somme des fontes. `b.finalLibre` ferme la dernière barre du final. Critère **par boss** ajouté à `verifierBoss`, plus la part de palier. | part `palier` **5 à 17 %** contre 0 à 54 % avant ✔ · `verifierMecaniques` vert ✔ · la bande [50, 90] par boss reste **non tenue** et le critère se déclare *non mesuré* sous 8 combats — voir §4 |
| **2** | 0.27.1 | **L'emportement existe.** ✔ livré. `ENRAGE_PAR_BARRE × b.bars` remplace `ENRAGE_AT` et `FINAL_ENRAGE_AT` : 105 s pour un ordinaire, 168 s pour le final. `BOSS_ENRAGE_MIN` ferme la bande. | **15 %** des combats ordinaires en agrégat, contre 0 à 8 % avant ✔ · palier 2 dans 6 combats sur 80 ✔ · la bande **n'est pas tenue par effectif** (48 / 0 / 6 %) et ne peut pas l'être — voir §3 |
| **3** | 0.27.2 | **La respiration du final.** ✔ livré. `FINAL_PALIER_RAMP` allonge la fenêtre avec la phase — 1,38 s à la première rupture, 4,82 s au moment où il devient tuable. Payée en PV : `FINAL_HP_MUL` 1,30 → 1,17. Aucun projectile de plus. | part de palier du final **11-13 % → 21-23 %** ✔ · durée dans la bande à 2 et 4 joueurs ✔ (176 s tenu de peu, n=3) · médiane solo trop bruitée pour conclure |
| **4** | 0.27.3 | **Chaque boss a une voix.** ✔ livré. `voixDe(def)` déduit la matière de l’**archétype**, `echelleBoss(def)` l’échelle des **barres**. UNE recette `bossVoix`, neuf jeux de paramètres. `pitch` porté à `barre`, `bossBrise`, `bossQueue`. Le différé du regard double corrigé. | **onze fondamentales distinctes**, quatre timbres ✔ · `verifierFeedback` étendu (archétype sans voix, deux boss de même voix), **zéro souci** ✔ · reste à valider à l’oreille |
| **5** | 0.27.4 | **Cinq boss cessent de porter la prise du final.** ✔ livré. Chacune rejoue son verbe : iris du Veilleur, ombre qui s’épaissit du Tisseur, arène ouverte et battante du Prisme, Silence **sans aucun battement**. `verifierPrises(BOSS_SKIN)` en miroir de `verifierArchetypes`, table en argument. | **huit prises distinctes sur huit boss de pool** ✔ · règle propre à l’**atmosphère**, qui a attrapé un cas que le tuple laissait passer ✔ · reste à valider à l’œil |
| **6** | 0.27.5 | **Le décor déterministe cesse de bouger sous le boss.** ✔ livré. L’arène reste nue ; `obstaclesDuLieu()` / `hazardsDuLieu()` séparent ce qui est **placé une fois** de ce qui se **dessine par image**. `biomeNu` écrit dans `SIMULATION.md`. | amer **299/320 → 0/320** ✔ · semis stable ✔ · **aucun changement de simulation**, trois fichiers de rendu ✔ |
| **7** | 0.27.6 | **Mesures.** Durées par boss × effectif × mode, temps mort, taux d'emportement, couverture de patrons, dans `LISEZMOI.md`. | les chiffres du §1 rejoués après les six lots |

---

## 3 · Ce que le lot 1 a appris, et qui change la suite

- **La bande [50, 90] s par boss n'est pas atteignable en réglant `hpMul`, et le
  lot 1 ne l'a donc pas réglée.** Relevé au bot du dépôt, six manches, avant le
  lot : Matriarche **189 s** en solo, **118 s** à deux, **212 s** à quatre, pour
  un `hpMul` de 0,85 — le plus bas du roster. Sa durée ne vient pas de ses PV mais
  de `DIFFUS_HEAL` (jusqu'à 1,44 % des PV max par seconde, douze corps), et le bot
  de mesure **ne nettoie pas autour d'elle** : il va au boss. Baisser son `hpMul`
  réglerait le bot, pas le jeu. Boss forcé, dix graines identiques, le lot 1 la
  fait passer de **142 s / 122 % de soin cumulé** à **106 s / 70 %** — donc il
  l'améliore sans la ramener dans la bande.
- **Le final perd les 60 s de séjour qui le tenaient**, et sa bande dit
  maintenant l'intention (« deux boss ordinaires ») au lieu d'un plancher
  d'attente : 101 / 145 / 211 s avant, **87 / 99 / 167 s** après. Le combat à
  quatre rentre, ceux à un et deux joueurs passent sous la borne basse. C'est le
  lot 3 qui reprend ça — le final n'a **jamais** montré un palier, avant comme
  après, donc sa respiration est à écrire, pas à récupérer.
- **Le critère par boss est trop bruité à six manches pour décider quoi que ce
  soit.** Même boss, même effectif : Ravageur de 49 à 126 s, Tisseur de 52 à
  206 s. `BOSS_ECHANTILLON_MIN = 8` et, en dessous, `verifierBoss` **nomme** les
  boss qu'il n'a pas jugés au lieu de passer au vert.
- **Les combats solo durent le double des combats à deux, et ça contamine tout ce
  qui s'indexe sur la durée.** Médianes par boss en solo jusqu'à 120 s contre 40 à
  66 s à deux joueurs. Conséquence directe au lot 2 : au même seuil,
  l'emportement part dans **48 %** des combats solo, **0 %** à deux, 6 % à quatre,
  pour un agrégat de 15 % en plein dans la bande. **Aucune forme de seuil ne
  rattrape un écart de durée** — le lever pour le solo compenserait un
  déséquilibre par une punition. Les deux lots ont donc buté sur la même chose.
- **`verifierBoss` était déjà rouge avant le plan**, sur des points qu'aucun lot
  n'adresse encore : dérive de 20 % dépassée aux trois effectifs, boss du segment
  5 à 104 s à quatre joueurs, débit de renforts à 26 % d'écart. C'est une campagne
  d'équilibrage, pas un lot de boss — elle rejoint le lot 7, qui devient le lot
  **structurant** du plan et non sa conclusion.

## 4 · Ce que le plan ne fait PAS, et pourquoi

- **Il ne réindexe pas la difficulté sur la puissance de l'équipe.** La mission
  le demande ; le dépôt l'a **retiré sur mesure** (D2 : `WAVE_HP_POWER_K` et
  `WAVE_RATE_POWER_K` à 0, PV de boss sur `BOSS_POWER_REF` constant). Y revenir
  est trois constantes, et c'est une décision de conception, pas un lot. Ce qui
  suit déjà l'équipe reste : effectif, `aliveCrowd()`, `adaptMech`, `towerCount`,
  `joueurs^0,75`.
- **Il n'écrit pas de nouveaux patrons, et il ne déclare pas de familles.**
  Quarante-cinq patrons existent, tous se jouent, aucun n'est mort. Une famille
  déclarée par patron (`projectile`, `zone`, `ligne`, `cône`, `charge`,
  `invocation`, `terrain`, `combiné`) aurait servi à empêcher la répétition —
  **mesuré sur 1 066 enchaînements : 10 % de familles identiques d'affilée,
  0,7 % de triplés.** `_pickAtk` avec sa mémoire de trois suffit ; une table de
  plus n'achèterait rien et se désynchroniserait au premier patron ajouté. Les
  répertoires couvrent déjà 4 à 7 familles sur 8.
- **Il ne remet ni obstacles ni dangers dans l'arène du boss.** `biomeNu` est une
  décision, pas un oubli : les six archétypes disent tous comment le boss
  **déforme** l'espace, et cette lecture suppose un sol neutre au départ. La
  garantie d'abri (`_solLibrePart`, `_zoneEcarteAbris`, `_foyerPoint`) est écrite
  sur un sol propre ; y compter le terrain rouvrirait le seul invariant que le
  dépôt a payé deux fois. Le défaut n'est pas la boîte nue, c'est que du décor
  **déterministe** se recalcule dessus.
- **Il ne touche ni aux PV du joueur, ni aux cartes, ni aux reliques.**
- **Il ne compense aucune difficulté par une récompense.** `DIFFICULTIES` garde
  ses seuls leviers de boss dans `bossProfil`.
