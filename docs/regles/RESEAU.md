# Réseau, salles, comptes, salon

**Quand lire ce fichier :** on touche à `server.js`, `hub.js`, `room.js`, `ws_lite.js`, `progress_store.js`, au snapshot, ou à un message qui traverse la socket.

Les règles qui valent pour *toute* tâche vivent dans `CLAUDE.md`, à la racine.
Celui-ci ne porte que ce qui ne sert qu'ici — et il n'est PAS chargé
automatiquement : c'est la carte de `CLAUDE.md` qui dit quand l'ouvrir.
## Serveur autoritaire

Les clients n'envoient que des **intentions** (deux directions, distance au
réticule, drapeau d'esquive) à 30 Hz. Ils ne décident jamais position, dégâts,
morts, score ni cible. Les vecteurs sont renormalisés côté serveur.

- **`ar` (distance au réticule) est CONTINU** comme `ax`/`ay` : pas remis à zéro
  après le tick, et le client l'envoie **BRUT**. `porteeReticule()`
  (`classes.js`) est son point de passage unique : il **assainit** seulement —
  valeur absente/négative/aberrante → `Infinity`, « aussi loin que possible ».
  **Chaque usage dit jusqu'où il porte** : `bombRange()` pour la Bombe (80-460),
  la portée de l'arme pour le lance-grenades. Un clamp unique en donnait une
  seule aux deux, et la grenade explosait à distance fixe.
- **`d`, `s1`, `s2`, `s3` sont PONCTUELS** : remis à zéro après chaque tick
  (`room.js`). `s3` n'existe que si sa carte a été tirée (`mods.skill3`), tables
  dans `CARD_CFG` (`SKILL3_*`). La Salve ne consomme pas sa recharge sans cible.

### Côté client

- **Interpolation** : 110 ms de retard, entre les deux états qui encadrent.
- **Prédiction locale** : recalage sec au-delà de 90 px, **désactivé pendant une
  esquive** (l'écart dépasse volontairement le seuil), rappel relâché.
- **Pas de temps fixe** : 1/60 s des deux côtés.

### Hub et salles

**Un seul processus, salles en mémoire.** La progression vit en mémoire avec
Supabase pour seule persistance ; deux processus tiendraient deux copies du même
compte.

- **Une `Room` ne touche jamais à Supabase, ne lit aucune globale, et ne connaît
  pas les autres salles.** Elle reçoit ses entrées et émet des événements — les
  `hooks` : `awardRun`, `awardPartial`, `sendProgress`, `occupancy`, `persist`.
  Le hub est le SEUL écrivain. **Tout nouvel état serveur s'attache à la `Room`,
  jamais au module.**
- **Un client est en état HUB ou en état SALLE.** `hub.js` traite `join`,
  `listRooms` (1/s), `createRoom`, `joinRoom`, `leaveRoom` et les `meta*` (hub ET
  salon, jamais en manche) ; le reste va à `room.handleMessage()` et est
  **rejeté** si le client n'est dans aucune salle. `nextClientId` vit au hub.
- **LES `meta*` SONT UNE LISTE BLANCHE, PAS UN PRÉFIXE.** `handleConnection`
  nomme chaque type un par un avant d’appeler `handleMeta` ; un `case` ajouté
  dans `handleMeta` sans son entrée dans cette liste tombe dans la branche
  salle, où `room.handleMessage` ne le connaît pas non plus — **le bouton ne
  fait rien et rien ne le dit**. Les deux endroits se modifient ensemble.
- **Le recomptage d'effectif a un point de passage unique** : le hook
  `occupancy` → `broadcastRooms()`. La liste est POUSSÉE aux clients en état hub.
- **Une salle pleine se refuse** (`joinRoomError{motif:"pleine"}`), elle ne met
  pas en attente ; le client RESTE au hub. Motifs distincts : `pleine`,
  `disparue`, `motdepasse`, `plafond`.
- **Une salle vide survit `ROOM_GRACE_MS` (60 s) puis est détruite**, et **ticke
  quand même** pendant ce délai. `welcome` propose la dernière salle (`rejoin`),
  un membre connu re-entre sans mot de passe (`knownMembers`).
- **Un seul intervalle à 120 Hz pour toutes les salles, `try/catch` par salle**
  (une exception ferme LA salle via `closeRoom`). Accumulateurs **décalés** à la
  création (`staggerFrac`) ; la remise à zéro du compteur de snapshot est
  RELATIVE.
- **La compression se fait UNE fois par broadcast** : `prepareMessage()` produit
  trame claire et trame deflate, `sendPrepared()` choisit. Possible parce que
  permessage-deflate est négocié `no_context_takeover`. Niveau 1, seuil 256
  octets. RSV1 hors négociation = erreur de protocole.
- **Pas de TLS dans `ws_lite.js`** : proxy inverse devant. Plafond de connexions
  par IP (`IP_CONN_MAX`).


### Réseau et snapshot

- **Les snapshots sont des tableaux positionnels.** On ajoute des champs **à la
  fin, jamais au milieu** ; le client lit avec un repli (`a[16] ?? 0`).
- **L'instantané est FILTRÉ PAR VUE** (`snapshot(vue)`, `vueDe()` dans
  `room.js`). Le rectangle est celui que le client affiche vraiment — centré sur
  le joueur **puis écrêté à l'arène**, comme `updateCamera` et `_pushOffScreen`
  — élargi de `CULL_MARGE` puis **arrondi vers l'extérieur** sur `CULL_GRID`,
  ce qui fait qu'une équipe groupée ne paie qu'**une** compression. Restent
  entiers : joueurs, boss, zones, marqueurs. `vue` absent = instantané complet.
- **Une absence n'est plus une mort côté client** (`dansVue` dans `events.js`,
  `opts.vue`) : un corps filtré peut être simplement sorti du champ. La marge du
  client est **plus étroite** que celle du serveur, donc un corps filtré n'est
  jamais dans la vue. Vaut aussi pour le ramassage d'un bonus et le son de tir.
- **Les tableaux exportés sont ordonnés et l'index circule** : `POWERUP_TYPES`,
  `ENEMY_TYPES`, `DIFFICULTIES`, `CLASSES`, `STATUSES`, `BOSS_ROSTER`, `MECHS`,
  `EVENTS`, `BIOMES`, `WEATHERS`, `DAMAGE_SOURCES`. Insérer au milieu réécrit le
  sens de tous les snapshots.
- **Les zéros de queue sont coupés** (`trimTail`). `keep = 7` pour un ennemi (le
  client lit `a[6]`, l'orientation, sans repli).
- **Le rang d'élite est encodé dans le champ de type** (`+100`) :
  `type = a[5] % 100`, `elite = a[5] % 200 >= 100`. Le `% 200` tolère encore le
  `+200` disparu (retardataire).
- **Les compteurs de touches sont CYCLIQUES de 0 à 9** : le client ne lit qu'une
  différence entre deux instantanés. `hitSeq` compte les touches, `critSeq` les
  critiques. Un critique qui **tue** ne laisse rien sur la victime — il compte sur
  le TUEUR (`p.critKills`, même forme cyclique).
- **Clés NOMMÉES du snapshot** (ignorées par un client ancien) : `sg`, `xl`,
  `xp`, `bw`, `bm`, `an`, `sa`, `mk`, `bo2`, `sp`, `bn`, `wl`, `bd`, `wu`, `ev`,
  `ob`, `hl`. `bn`, `wl`, `wu`, `ev`, `ob`, `hl` sont **absentes** la plupart du
  temps.
- **Avant d'ouvrir une clé de snapshot, chercher si la valeur est une fonction de
  ce que le client a déjà** : la géométrie d'une graine, l'état d'un danger du
  temps, la météo du segment, un trait de `(diffIndex, type)`.
- **Cinq informations sont DÉDUITES** côté client : cadence des tireurs (observée
  au second tir, repos avant), direction des projectiles (image précédente),
  déplacement d'un joueur (deux images, **seuil non nul**), cible du soigneur
  ennemi (`drawMedicLinks` rejoue le choix du serveur), et **auteur d'une touche**
  (la balle éteinte la plus proche du point d'impact, `BULLET_CLAIM`).
- **Le canal d'alerte est ponctuel, hors snapshot** : `state.alerts` est une file
  que la simulation empile et que le serveur vide après chaque tick. GameState ne
  diffuse pas.
- **Tout message ponctuel qui décrit un changement du MONDE passe par
  `pushWorld()`** : `round`, `roundAbort`, `roundEnd`, `cards`, `cardsWait`, la
  fermeture de l'écran de cartes. Une file, pas un `setTimeout`. Elle se vide à
  `onclose` et nulle part ailleurs (`resetFeedback` ne doit pas la vider).
- **Le salon s'applique à la réception SAUF si la file n'est pas vide** — il
  porte `phase`, et posé avant `roundEnd` il ouvrirait le salon 110 ms avant le
  bilan. Un vote, un « prêt », une arrivée ne commentent aucune image.
- **`briefState` s'applique à la RÉCEPTION** : il ne commente aucune image.


### Persistance et comptes

- **Supabase est la SEULE persistance.** Une table `comptes`, **UNE LIGNE PAR
  COMPTE** : authentification en **colonnes**, progression en **jsonb** (`data`) —
  jamais l'inverse. État chaud en mémoire (Map `accounts`). Configuration :
  `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` et rien d'autre. Appels REST en
  `node:https` natif.
- **Les écritures de PROGRESSION n'ont lieu qu'au salon, en fin de manche et au
  départ d'un joueur** — jamais pendant une vague. Les écritures
  d'**AUTHENTIFICATION** partent quand elles arrivent (un upsert par ligne est
  atomique).
- **Écritures CIBLÉES et REGROUPÉES** : `save(pseudoLower)` marque sale, fenêtre
  de 2 s, un seul upsert multi-lignes, sérialisation défensive (une ligne malade
  s'écarte en journalisant).
- **Chargement PAGINÉ** (en-tête `Range`, PostgREST plafonne à 1000).
- Protections : **chargement avant écoute** (`store.ready` avant `listen()`) ;
  **écriture suspendue tant qu'aucune lecture n'a réussi** ; ligne de version
  inconnue **GELÉE** (`frozen`) ; **migrations enchaînées** (`migrate` traverse
  3 → 4 → 5) ; **envoi raté réessayé** (10 s) ; **`flush()` sur SIGTERM/SIGINT**.
  Récupération tardive : n'adopte une ligne distante que si le local est
  **vierge** (`pristine()`).
- **Le compte est pseudo + MOT DE PASSE, la session est un JETON.** Trois portes
  (`register`, `login`, `loginToken`) aboutissent toutes à `finishAuth`. Mot de
  passe haché **scrypt** avec sel par compte (dans `progress_store.js`, jamais
  dans `shared/`), **jamais normalisé**. Jeton : 32 octets aléatoires, seul le
  **sha256** est gardé, expiration **glissante** 30 jours, rangé en
  `localStorage` — **jamais le mot de passe**. Chaque `login` le régénère.
- **Deux freins sur `login`** : cinq essais par connexion (`fatal:1` au-delà) et
  un **gel de 10 s par pseudo cible** après cinq échecs, testé **AVANT** scrypt.
  Un échec de `loginToken` est NORMAL : ni compteur ni gel.
- **La session dupliquée reçoit une copie détachée** (`structuredClone`), jamais
  rangée dans le magasin.
- **Un mot de passe perdu n'a qu'un filet : l'opérateur** (`adminPassReset`).
  `changePass` exige l'ancien et **le jeton actif survit**.
- **La page admin (`/admin`) n'existe que si `ADMIN_KEY` est posée** (sinon 404,
  page comprise) ; clé dans l'en-tête `x-admin-key`, comparée en
  `timingSafeEqual`. Elle liste les comptes depuis la **mémoire** (jamais un
  hachage ni un jeton), réinitialise un mot de passe, supprime un compte (le
  connecté est déconnecté **D'ABORD**) et remet tout à zéro (`store.reset()`,
  refusée si une salle est en manche, après attente de l'envoi en vol, puis
  `kickAccounts`).

### Salon, manche, briefing

- **Le lancement attend que TOUS les présents aient confirmé**, garde des DEUX
  côtés (`notReady()`). Le drapeau `ready` est porté par le **client** et se remet
  à zéro à **trois** endroits : `startRound()`, `attach()`, initialisation client.
  `notReady()` **ne filtre pas les spectateurs**. **À UN SEUL JOUEUR, il rend une
  liste vide** (le client recopie `lobby.length <= 1`). Le bouton désarmé **nomme
  qui manque**.
- **Le lancement est DIFFÉRÉ de trois secondes et n'importe qui l'interrompt.**
  `case "start"` arme `room.launchAt` et diffuse `launch` ; la garde d'hôte reste
  sur le lancement, jamais sur l'annulation. **Conditions revalidées à chaque
  tick** (`tickLaunch`). Un **départ** n'annule pas ; une salle **vidée** si.
- **Le message porte une DURÉE, jamais une échéance.** Vaut pour **tout** compte
  à rebours envoyé au client — `launch`, mais aussi `cards` et `merchant`
  (`duree`, `cardLeft()`) : une échéance absolue force le client à comparer
  l'horloge du serveur à la sienne, et une machine en retard voyait sa jauge de
  cartes encore pleine alors que la manche avait déjà repris. `why` n'accompagne
  que les annulations subies. `cancelStart` ne rediffuse pas le salon.
- **`renderLaunch()` ne repasse pas par le salon** et est appelé **en dernier**
  par `refreshPanel()`. À l'échéance locale, le bouton se désarme sur
  « Lancement… ».
- **Le briefing de classe retient la VAGUE, pas la simulation** (`state.warmup`,
  `WARMUP_S` = 20 s) : seuls `_segmentTick()`, `_spawner()` et le **tir automatique**
  sont retenus ; la recharge continue de descendre. **`this.time` ne court pas
  non plus.**
- **Aucun texte du briefing ne voyage** : tout vit dans `CLASSES`. Le message
  `round` ne porte que `warmup`.
- **L'échauffement se termine au PREMIER DES DEUX** : tout le monde a fermé, ou
  l'échéance tombe. Couper `state.warmup` est le **seul** champ à toucher.
  `briefWaiting()` filtre sur **`state.players` et rien d'autre** (un joueur à
  terre y est, un déconnecté en sort seul). `syncBrief()` a **quatre** appelants ;
  `room.briefOpen` évite les diffusions inutiles ; la phase est testée **dans**
  `syncBrief()`. `client.briefDone` se remet à zéro aux deux mêmes endroits que
  `ready` ; le `briefDone` part du **bouton**, pas de `closeBrief()`.
- **L'attente ne s'affiche qu'à celui qui a DÉJÀ fermé** (`#hudBrief`), nomme qui
  manque (noms jusqu'à deux, compte au-delà), reprend le compte à rebours, en
  **blanc**.
- **LA PAUSE EST CELLE DE L'HÔTE, ET ELLE VAUT POUR TOUT LE MONDE**, accordée
  par le serveur (`pauseReal` ne vaut vrai que sur sa réponse). Deux portes :
  **l'hôte**, à tout effectif et même en spectateur, et le joueur **seul dans sa
  salle** — un spectateur suffisait à retirer la pause au joueur seul. Reprendre
  appartient à **celui qui a figé** (`room.pausedBy`) et à l'hôte ; un départ du
  pauseur lève la pause, une **arrivée** ne la lève plus. Elle se lève seule au
  bout de **5 minutes**. **Les recharges et les états ne s'écoulent pas** (il
  suffit de ne pas appeler `step()`), et le client **cesse de prédire**
  (`readMove()`). Celui qui n'a pas ouvert le menu lit un bandeau, `#hudPause`.
- **L'historique appartient à la SALLE** (`room.history`), rempli par
  `recordRound()` aux DEUX sorties, plafonné à `ROUND_HISTORY_MAX` (8), porte la
  **vague atteinte et rien d'autre** (ni victoire ni défaite), heure en
  **horodatage absolu**.
- **La latence est une propriété de la CONNEXION** : `rtt` sur `WsConnection`,
  `hub.pingAll()` à 1 Hz (dans `server.js`, jamais dans le tick). Horodatage dans
  la **charge du ping** (la RFC impose au pair de la renvoyer). Un pong de huit
  octets est une réponse ; toute autre longueur est ignorée. **Moyenne
  exponentielle**, diffusée **sur événement**. `-1` = inconnu, affiché en tiret.


## Registres partagés serveur ↔ client

Ajouter une entrée impose de traiter les deux côtés.

| Registre | Serveur | Client |
|---|---|---|
| `kind` d'effet | 0 nova · 1 balayage · 2 niveau · 3 ricochet (2 points de plus) · 4 balise/relèvement/purification/Sentence · 5 élite · 6 barre brisée · 7 explosion · 8 onde blanche · 9 rempart · 10 provocation · 11 vague de soin · 12 bombe · 13 salve (2 points de plus) · 14 absorption · 15 rupture de barre · 16 **ultime** (`owner`, palier dans `n`) | `drawEffects()` |
| type d'ennemi | `ENEMY_TYPES` (`enemies.js`), élite à +100 | `ENEMY.TINT` (`palette.js`) + `plan()` (`e{type}_*`) + `DEATH_BURST` + `enemyFrame()` |
| trait | `TRAITS` + `TRAIT_CFG` (`enemies.js`) ; attachement dans `DIFFICULTIES[i].traits` — **l'index ne circule pas** | `traitsOf()` dans `render/actors.js` |
| profil de difficulté | `DIFFICULTIES` (`game_state.js`) | `renderVote()` + `applyPalette(diffIndex)` |
| décor de mode | `DECOR` (`palette.js`) — **ne circule pas** | `decor` dans `render/stage.js`, lu par `render/decor.js` |
| classe | `CLASSES` (`classes.js`) | sélecteur du salon + `buildPips()`/`updatePip()` |
| couleur d'un joueur | `assignColors()` (`room.js`), index dans `colorIndex` | `PLAYER_COLORS` via `colorOf`/`ownerColorOf` |
| cadre d'un joueur | `CADRES` (`hauts_faits.js`) — un **identifiant**, champ `cadre` du salon et du bilan ; la peau **ne circule pas** | `CADRE_SKIN` (`palette.js`) + `appliquerCadre()` (`ui/cadres.js`) + règles par emplacement (`menus.css`) ; `cadreOf()` (`stage.js`) rend `{ teinte, palier }` au canvas |
| bits de compétence | `SKILL_HEAL_MODE` · `SKILL_TAUNT` · `SKILL_OVERDRIVE` · `SKILL_ULT_WIND` | teinte, halos, icônes, anneau d'amorce |
| états | `STATUSES` (`statuses.js`), bit dans `_statusMask()` | `STATUS_ICON` + halo + cadre d'équipe |
| `shape` de zone | 0 disque · 1 rect · 2 anneau · 3 cône · 4 Pac-Man · 5 croix | `zonePath()`/`zoneSubPath()` + `_zoneHits()` |
| bits de buff | `BUFF_DAMAGE` … `BUFF_RICOCHET` | anneaux + bandeau HUD |
| bonus | `_applyPowerup()` ; `POWERUP_ROTATION` dit ce qui **tombe**, `POWERUP_POIDS` **quand**, `POWERUP_TYPES` ce qui **circule**. Le tuple `w` porte un cinquième emplacement : la **part de vie restante**, seul canal qui sépare un bonus neuf d'un bonus qui entre dans la vue, et un bonus pris d'un bonus expiré | `POWERUP_ICON` + `POWERUP_STYLE` + `BONUS` (`feedback.js`) |
| texte d'une carte | `CARDS` (`cards.js`) ; `cardBrief` n'envoie que `id` et `rarity` — le texte **ne circule pas** | `cardNom()` / `cardDesc()` / `cardDetail()`, marqueurs `{0}` remplis par `vals` |
| texte d'une relique | `RELICS` (`reliques.js`) — **ne circule pas** | `relicNom()` / `relicDesc()` / `relicContrepartie()` |
| clés de `mods` | `defaultMods()` (`cards.js`) | rien |
| tags de carte | `tags` (`off`, `def`, `coop`, `cadence`) | rien |
| script | `SCRIPT`/`SCRIPTS` (`timeline.js`), variante en clair (un NOM) ; clé `sg` | `updateSegment()` + `gameIntensity()` |
| géométrie d'apparition | `GEOMETRIES` (`timeline.js`) — **ne circule pas** | rien |
| boss | `BOSS_ROSTER` (`bosses.js`, **11 entrees, append-only**), index dans `bo[9]` ; `bars` et `archetype` au roster ; `BOSS_POOL` / `BOSS_POOL_COUNT` ; `finalPour` | `drawBoss*()` + `BOSS_SKIN` + `estFinal()` pour `#hudBoss.final` + `phaseUnlockText()` |
| focus des Jumeaux | `b.focus`/`b.focusAt`, posés dans `_damage()` ; `bo2[4]` et `bo2[5]`, **coupés** tant que personne ne tient le focus | `drawTwinFocus()` : anneau à la couleur du porteur (le lien, lui, reste **déduit** par `drawTwinLink`) |
| mécanique | `MECHS` (`bosses.js`), index dans l'alerte et `mk` | `drawMarks()` + `pushAlert()` |
| regard | `GAZE_*` (`bosses.js`), `_gazeOuvre`/`_gazeVise`/`_gazeResoud` ; `bo[13]` préavis, `bo[14]` œil ouvert | `drawGazeArene()` (couche 1, **avant tout télégraphe au sol**) · `drawGazeCone()` (couche 4) · `drawGazeEcran()` (couches 2 et 3) |
| événement | `EVENTS` (`timeline.js`), index dans l'alerte et `ev` ; colonne `event` des beats | `eventAt()` + bandeau de segment + `evenementDebut`/`evenementFin` |
| biome | `BIOMES` (`biomes.js`), index + graine **une fois** au salon | `buildBiome()` rejoué + `drawObstacles()`/`drawHazards()` |
| danger | `HAZARDS` + `BIOME_CFG` — **ne circule pas** ; `hazardState(h, t)` | `drawHazards()` + `groundAt()` + `danger` dans `events.js` |
| couverture destructible | `maxHp` sur un obstacle ; `_obstacleHit()` ; clé creuse `ob` | liseré tireté + blocage rejoué + `murDetruit` |
| météo | `WEATHERS` (`biomes.js`), index dans l'alerte ; `weatherFor(diff, graine, segment)` | `weatherAt()` + `drawVignette()` + `stepPrediction()` |
| attaque de boss | chaînes du `base`/`unlock`, dispatchées par `_atk()` | `ATTACK_LABEL` — **ne circule pas** |
| niveau d'alerte | `ALERT_ORDER` · `ALERT_WARN` · `ALERT_INFO` | `updateAlerts()` : consigne ambre à rebours · avertissement orange · info blanche |
| provenance d'un dégât | `DAMAGE_SOURCES` (`game_state.js`), **sept** entrées, index en fin du tuple joueur | `SRC_ICON` (`icons.js`) + `SRC_TINT` (`palette.js`) + `hudDamage()` + `renderHurtBy()` |
| soins rendus | `p.healDealt`, champ `heal` de `scoreboardRows()` | colonne « soins » du bilan |
| magnitude d'un souffle | `n` sur l'effet, 9ᵉ élément (index 8, coupé si nul) — nova, grenade, onde, bombe | `BLAST_STYLE` + `spawnBlast()` + force du son |
| critique | `critSeq` sur l'ennemi (index 8) ; `p.critKills` (index 34) | `crits` de l'impact, `crit` de la mort — teinte ambre, coup de zoom, éclats, noyau chaud, **chiffre ambre** (`a.crit` dans `dmgAgg`) |
| brûlure d'un ennemi | `e.burn.t / BURN_TIME` en **fin** de tuple ennemi (index 11), coupé à zéro — une **part de durée** et non un drapeau, pour que la lueur s'éteigne *avec* la brûlure au lieu de dire « purge » | `drawBrulure()` + `spawnBraise()` (`render/fx.js`), passe séparée avant les corps, braises budgétées **par image** |
| vulnérabilité d'un ennemi | secondes restantes de `e.vulnUntil`, index 12 — **en secondes et pas en part** : `VULNERABLE_TIME` (4 s) et `CONTRE_PIED_TIME` (3 s) diffèrent, une part obligerait le client à savoir qui l'a posée | quatre **pointes** radiales sous le corps (`drawVulnerable`, `render/fx.js`) — les trois anneaux lisses sont pris (élite, aura, égide) et l'ambre frôle l'or d'élite, donc c'est la **signature** qui sépare |
| entrave d'un ennemi | secondes restantes de `e.rootUntil`, index 13. Un ennemi **seulement** entravé porte deux zéros en 11 et 12 que `trimTail` ne peut pas couper — quatre octets, le prix des tuples positionnels | anneau **au sol** (`drawEntrave`, `render/fx.js`), froid : ce qui ralentit est froid, et `mul = 0` est le ralentissement total |
| brûlure et vulnérabilité **du boss** | index 15 et 16 du tuple `bo`, mêmes unités que la horde. `bo` n'est pas rogné par `trimTail` : il passe de 15 à 17 champs en permanence, deux nombres pour **une** entité. L'état vit sur `bo` et **jamais** sur `bo2` — `_damage` redirige le jumeau vers le boss avant de le lire, donc les deux corps le partagent comme ils partagent la barre | `drawBrulure` / `drawVulnerable`, les **mêmes** que la horde : un second vocabulaire ferait apprendre l'état deux fois. `world.js` transmet les deux au jumeau par la ligne qui portait déjà `hp`/`bars` |
| propriétaire d'une balle | 4ᵉ élément du tuple `b` | `ownerColorOf(b.owner) ?? COMBAT.bullet` |
| missile de Salve | 5ᵉ élément du tuple `b`, **émis seulement si missile** | `drawMissile()` |
| lien de soin | `_healLinks()` ; clé `hl`, triplets `[soigneur, cible, ennemi]` — **quadruplets** quand le lien vient d'un Sanctuaire (id du dôme) | `drawSoinLinks()` : soin chaud et **calme**, siphon froid et **agité** ; un lien de dôme part du **dôme** |
| intervalle de tir | `p.fireInterval`, 34ᵉ élément du tuple joueur | `fireInterval` (`ingest.js`) + ligne « cadence » de `ui/build.js` |
| catégorie de carte | `CATEGORIES` + `cardCategory()` — **ne circule pas** | `CARD_CATEGORY_COLOR` + `.cardCat` |
| hub des salles | `listRooms`/`createRoom`/`joinRoom`/`leaveRoom` → `rooms`/`roomJoined`/`joinRoomError`/`roomClosed` | `#hubScreen`, `renderRooms()`, `enterHub()`, `inRoom` |
| identité | `register`/`login`/`loginToken`/`logout`/`changePass` → `welcome{pseudo,token?,dup}`/`authError{motif,fatal?}`/`passChanged`/`loggedOut` | `#gate`, bloc compte du hub, `survivor.token` |
| lancement différé | `start`/`cancelStart` ; `room.launchAt`, `launchPayload()`, `tickLaunch()` → `launch{delay,why,qui}`, `why` = **code** (`etat`, `arrivee`, `pasPret`, `clic`) | `#start` (+ `.cancel`), `renderLaunch()`, `launchEndsAt`, `LAUNCH_CANCEL` |
| état prêt | `ready{on}` ; champ `ready` de `lobbyPayload()` ; `notReady()` | `#readyBtn` (+ `.on`), `.teamRow.ready`, `#teamReady`, `#waitMsg` |
| latence | `WsConnection.rtt` ; champ `ping`, `-1` si inconnu | `.teamPing` |
| historique | `room.history` (`{at, diffIndex, wave}`) | `renderHistory()` → `#historyList .histRow` |
| pause | `pause` → `paused{on,why,par}` ; `setPaused()`, `room.pausedBy` | `#pause`, `#hudPause`, `pauseReal`, `applyPause()` |
| briefing | `state.warmup`, `WARMUP_S`, champ `warmup` du `round` | `#brief`, `openBrief()`/`closeBrief()` |
| briefing fermé | `briefDone` → `briefState{waiting:[noms]}` | `#hudBrief`, `renderBriefWait()` |
| victoire | `state.victory`, `state.finalKill`, clés du `roundEnd` ; `bestFinal` | `#bilan.win` + `.bilanStat.final` |
| transition | `round`/`roundAbort`/`roundEnd`/`cards`/`cardsWait` | `pushWorld()` — jamais à la réception |
| sortie de manche | `leaveRound` : `removePlayer` + spectateur | bouton du menu pause, avec confirmation |
| langue | `shared/i18n.js` + `shared/lang/*.js` — **ne circule pas**, réglage de machine | `#topLang`, `#setLangRow`, `#gateLangRow`, `traduireStatique()`, `onLangChange` |
| motif d'erreur | `authError{motif}`, `joinRoomError{motif}`, `roomClosed{why}` — **codes**, la phrase n'est qu'un repli | `authTexte()` / `MOTIFS` (`net/router.js`) → `ui.auth.*`, `ui.hub.join.*` |
| version | `VERSION` (`shared/version.js`), clés `version` et `commit` du `welcome` | `#version` + `updateVersion()` : ambre `.stale` **sans le hash** |
| mesure | `trace` → `traceState{on,par}` ; clés `trace`/`tracePar` du salon ; hook `trace`, `telemetry.js` | `?mesure` dans l'URL, `#trace`, `updateTrace()` |

**Registres purement CLIENTS** (ils se déduisent du snapshot ou de la liste de
cartes, déjà diffusée) : image de sprite (`plan()` dans `sprites.js`, adressée par
NOM via `frameOf()`), son (`PALETTE` + `SOUND_GAIN` dans `audio.js`), échantillon
(`SAMPLES`), piste audio (`TRACKS` dans `tracks.js` — manifeste **écrit**, un
navigateur ne liste pas un dossier), `kind` → son (`EFFECT_SOUND` dans
`render/fx.js`), glyphe posé sur un joueur (`PLAYER_MARK` + `paintMarkGlyph()`),
effet possédé (`EFFECT_BADGES` dans `icons.js`), façon de mourir (`DEATH_BURST` —
le rang d'élite reste **orthogonal** au type ; un gros morceau tourne lentement ;
l'orientation voyage avec la mort), cible d'un son d'interface
(`UI_SOUND_SCREENS`/`UI_SOUND_TARGETS`, **miroir** de `--cursor-go` dans
`menus.css`), type d'événement client (`diffSnapshots()` dans `events.js`).


## Le codex

- **RENCONTRÉ, jamais VAINCU.** `milestones` porte déjà `boss_<kind>` pour les
  boss *tués*, écrit en fin de manche. Le réutiliser laisserait en « ? » éternel
  tout boss qui vous tue. `profile.vus` est un second champ, écrit à
  l **apparition** du corps et à l **arrivée** du boss.
- **Deux points d écriture, et ce sont les points de passage** : `_spawnEnemy`
  et le bloc d apparition du boss. Il note la **ligne de base**, pas la variante
  — une élite n est pas une créature de plus.
- **Des clés, pas des index** (`e:grunt`, `b:metronome`). Les tables sont
  append-only, mais un profil dure plus longtemps qu une table, et c est le seul
  champ de progression qu on ne pourrait **jamais** réparer si les index
  bougeaient : il n a pas de source de vérité ailleurs.
- **On ne bumpe PAS `PROG_CFG.VERSION` pour ajouter un champ.** Le magasin fait
  `reset = row.version < VERSION && !migre` : sans entrée de migration, le bump
  remet à neuf tout profil — on effacerait la progression de tous pour un tableau
  vide. On **normalise à la lecture**, comme `hf` et `debloquees` juste au-dessus.
- Le repli passe par `awardRun` depuis `endRound`, qui couvre les **deux**
  sorties : une manche perdue enrichit le codex.
- `verifierCodex()` refuse une clé inconnue — une clé mal formée ne lève rien,
  se persiste pour toujours, et laisse son entrée en « ? » à jamais.
