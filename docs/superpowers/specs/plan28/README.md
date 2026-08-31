# Survivor LAN — plan 28 : ce que la session de jeu du 2026-08-31 a montré

Quatre défauts, tous relevés **contre le dépôt réel en 0.29.24**. Trois ont une
cause épinglée dans le code, dont une prouvée par exécution et non par lecture.
Le quatrième n'a qu'une signature à l'écran, et c'est lui qui ouvre le plan,
parce que sa correction commence par le rendre **capturable**.

| fichier | symptôme rapporté | état de la cause |
|---|---|---|
| `01-erreur-de-rendu-muette.md` | « bug de map », arène vide, HUD figé | signature identifiée, cause **non épinglée** — le lot livre l'instrumentation |
| `02-chaine-usine-boucle.md` | l'animation de la chaîne « boucle mal » | **épinglée** : `blocs.js:773-775`, période du modulo ≠ pas de la boucle |
| `03-codex-toujours-ferme.md` | tout reste « ? » | **épinglée** : le codex ne s'écrit qu'à `endRound()` |
| `04-traces-au-centre-des-cellules.md` | « des ronds qui ressemblent à rien » | **épinglée** : `props.js:331-338`, trace dessinée au CENTRE de la cellule |

## Ce que les essais ont éliminé

Deux hypothèses coûteuses ont été **exécutées** plutôt que discutées.

- **La chaîne du codex sur une mort est saine.** Manche réelle jouée sur socket
  WebSocket (`BANC=1 PORT=7791 node server.js`, client RFC 6455 écrit à la main,
  mort provoquée par `bancPop: 300`) : `roundEnd` puis `progress` porteur de
  `vus: ["e:grunt"]`. Le hub, le magasin et `ws_lite` livrent la bonne donnée. Ce
  qui reste est la sortie de manche qui n'est ni une mort ni une victoire.
- **La cinquième carte n'est pas suspecte.** `verifierBiomes()` sur **200 graines
  × 5 lieux × 3 modes** est muet (4,5 s), et les douze tables par lieu (`TUILE`,
  `MACRO_TUILE`, `BLOC`, `LED`, `DANGER`, `SOUFFLE`, `ZONES`, `QUARTIER`,
  `MATIERE`, `GRILLE`, `AMERS`, `PREMIER_PLAN`) ont toutes leur entrée `secteur`.
  Le tirage du lieu est uniforme sur cinq et se rejoue à **chaque** sortie de
  manche, victoire, défaite ou interruption : ne pas tomber sur le Secteur en
  quelques parties est un tirage, pas un défaut.

## Ce qui n'est pas dans le plan, et pourquoi

**L'absence de persistance en local est voulue** — sans `SUPABASE_URL` /
`SUPABASE_SERVICE_KEY`, `progress_store.js` garde tout en mémoire et rien sur
disque, parce que l'environnement local est un environnement de test. Elle a
quand même un effet sur les vérifications de ce plan : **toute vérification de
progression se fait sans redémarrer le serveur entre la manche et le contrôle.**

## Ordre

`01` d'abord, et c'est le seul ordre qui compte : tant que l'erreur de rendu
reste muette, chaque session de jeu perd l'information qui la corrigerait. Le lot
ne prétend pas corriger le bug de map — il fait qu'il se raconte tout seul à la
prochaine occurrence.

`02` ensuite : une ligne, une cause certaine, zéro conception.

`03` puis `04` : `03` est une correction de point de passage, `04` demande une
décision de rendu.

## Ce que ce plan ne touche pas

- **Aucun index de tableau ordonné n'est inséré au milieu.** Aucun lot n'ajoute
  d'entrée à `BIOMES`, `ENEMY_TYPES`, `CARDS` ni `RELICS`.
- **Aucun champ d'instantané nouveau.** `01` réutilise `clientError`, `03` ne
  fait circuler que ce que `progress` transporte déjà.
- **Aucune migration de profil.** `PROG_CFG.VERSION` ne bouge pas : le bumper
  remettrait à neuf tout profil sans entrée de migration.

## Addendum — `05-bac-a-sable-local.md`

Un cinquième lot, qui n'est pas un défaut mais un **outil** : `BAC=1` pose une
réserve de noyaux **et** tous les hauts faits à la création d'un profil, pour
pouvoir tester la méta sans jouer dix manches — d'autant que l'environnement
local ne persiste rien. Même statut que `BANC`, `BIOME` et `GRAINE` : une
surcharge d'environnement, pour les tests uniquement, **jamais déduite** de
l'absence de Supabase.

Il ne remplit pas le codex : c'est précisément ce que `03` doit pouvoir vérifier.

Il ne dépend d'aucun autre lot et aucun ne dépend de lui. Le prendre **en
premier** rend seulement les vérifications de `03` et de la méta plus rapides.
