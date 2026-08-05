# Infrastructure de salons

Refonte de l'architecture serveur pour permettre plusieurs parties simultanées.

**Lot indépendant.** Il peut être exécuté avant ou après la série de contenu
(plan v5) — voir `00-index.md` pour les conséquences de chaque ordre, et la
règle qui rend les deux équivalents.


## 1. La décision d'architecture, et pourquoi elle est déjà prise

**Un seul processus, salles en mémoire.** Pas de processus par salon.

Ce n'est pas un arbitrage de performance — les mesures donnent 5 % d'un cœur
par salle au pire cas, soit une vingtaine de salles sur un seul cœur. C'est une
contrainte imposée par la persistance :

> `LISEZMOI-BDD.md` : *« La progression permanente vit en mémoire sur le
> serveur de jeu, et Supabase en est la seule persistance. »*

Avec deux processus, chacun tiendrait sa propre copie en mémoire du même
compte. Un joueur finissant une manche dans le salon A verrait ses noyaux
écrasés par la sauvegarde du salon B. Contourner ça demanderait du verrouillage
distribué — beaucoup de complexité pour un gain CPU dont on n'a pas besoin.

S'y ajoutent deux arguments de déploiement depuis le passage sur VPS : un
certificat TLS et une règle de pare-feu par port seraient intenables, et
l'atout du projet a toujours été **une seule adresse à communiquer**.

---

## 2. Découpage en modules

```
server.js    amorce : HTTP, WebSocket, page admin, cablage
hub.js       registre des salles, comptes, progression — SEUL a ecrire
room.js      une partie : GameState, clients, phases, tick
```

`room.js` reçoit l'essentiel de ce qui est aujourd'hui dans `server.js`. Le hub
garde le service de fichiers, le registre des salles, et la persistance
Supabase existante.

### La règle qui structure tout

> **Une `Room` ne touche jamais à Supabase, ne lit jamais de variable globale,
> et ne connaît pas les autres salles.** Elle reçoit ses entrées, émet des
> événements, et c'est tout.

Quand une manche se termine, la salle n'écrit pas : elle émet un `roundEnded`
avec les résultats, le hub persiste. Trois bénéfices immédiats :

- **Les écritures concurrentes disparaissent par construction** — un seul
  écrivain, ce qui est déjà la forme de l'intégration Supabase actuelle.
- Une salle devient testable sans serveur ni base.
- Si un jour le multiprocessus devient nécessaire, seule la couche transport
  change.

---

## 3. Répartition de l'état actuel

Les variables globales de `server.js` se répartissent ainsi :

| variable actuelle | destination |
|---|---|
| `phase` | champ de `Room` |
| `state` (GameState) | champ de `Room` |
| `roundNumber` | champ de `Room` |
| `clients` | champ de `Room` (les clients d'une salle) |
| `hostId` | champ de `Room` |
| `paused`, `pausedAt` | champ de `Room` |
| `cardDeadline` | champ de `Room` |
| `acc`, `lastTick`, `sinceSnapshot` | champ de `Room` — chaque salle a son propre accumulateur |
| `inputs` | champ de `Room` |
| `nextClientId` | **hub** — les identifiants restent uniques sur tout le serveur |
| progression en mémoire | **hub** |
| configuration Supabase | **hub** |

`nextClientId` au niveau du hub est important : un identifiant unique par
serveur, pas par salle, évite les collisions quand un joueur change de salon.

---

## 4. Cycle de vie d'une salle

**Seul le hub tourne en permanence.** Une salle n'existe que tant qu'elle est
occupée.

```
creation  -> un client demande, le hub instancie une Room, genere un code
occupee   -> au moins un client attache
vide      -> plus aucun client
detruite  -> apres un delai de grace
```

```
ROOM_GRACE_MS: 60000        // une salle vide survit 60 s avant destruction
ROOM_MAX: 16                // plafond de salles simultanees
ROOM_MAX_PLAYERS: 4         // inchange, voir la note ci-dessous
```

Le délai de grâce évite qu'une déconnexion réseau brève détruise la partie de
tout le monde. Il permet aussi à un joueur qui recharge sa page de retrouver sa
salle.

Le plafond de seize salles vient directement de la mesure : au-delà, une seule
salle supplémentaire au pire cas ferait décrocher la boucle.

**Note sur `ROOM_MAX_PLAYERS`** : la limite de 4 n'est pas arbitraire, elle est
câblée dans `PLAYER_COLORS` (quatre couleurs) et dans la règle « un tank et un
soigneur au maximum ». L'augmenter est un chantier distinct, hors périmètre.

**Une salle pleine se refuse, elle ne met pas en attente.** Pas de file, pas de
spectateur surnuméraire : à 4/4, `joinRoom` répond `joinRoomError` et le client
reste au hub. La solution inverse — laisser entrer un cinquième client en
spectateur, puis le promouvoir quand une place se libère — demandait une file
d'arrivée, une attribution tardive de `PLAYER_COLORS`, une reprise du choix de
classe quand la sienne a été prise entre-temps, et le doublement des mesures de
bande passante de la section 13. Beaucoup de mécanique pour un cas que le
bouton de rafraîchissement couvre.

Le refus se déplace en revanche de la connexion vers la salle : aujourd'hui
`attachWebSocket` ferme la socket d'un cinquième arrivant (`clients.size >=
MAX_PLAYERS`, `server.js`). Une connexion au hub n'occupe aucune salle et n'a
plus de raison d'être refusée — c'est `joinRoom` qui compte l'effectif de la
salle visée.

Le spectateur **existant** n'est pas touché : celui qui rejoint une salle non
pleine pendant une manche en cours reste spectateur jusqu'à la suivante,
comportement inchangé (voir section 10).

---

## 5. Le parcours client — le vrai changement de protocole

Aujourd'hui, un client qui se connecte est **immédiatement dans la partie**.
Avec des salons, il faut un état intermédiaire.

```
connexion WebSocket
   -> etat HUB : le client recoit la liste des salles
   -> il cree une salle, ou en rejoint une par son code
   -> etat SALLE : comportement actuel (salon, manche, cartes...)
   -> il quitte -> retour a l'etat HUB
```

C'est le point le plus délicat du refactor : toute la logique de message
actuelle suppose qu'un `client` appartient à une partie. Il faut désormais
router chaque message selon l'état du client — hub ou salle — et rejeter
proprement ce qui n'a pas de sens dans l'état courant.

### Découverte des salles

Une liste publique plutôt qu'un code secret : sur un serveur entre joueurs qui
se connaissent, chercher un code à taper est une friction inutile. Chaque
entrée affiche le nom de la salle, l'effectif (`3/4`), et l'état (salon ou
manche en cours).

**Les salles pleines restent dans la liste, marquées `4/4` et non cliquables.**
Les masquer ferait disparaître de l'écran la salle où sont les autres joueurs,
c'est-à-dire précisément celle qu'on attend — un joueur ne saurait pas s'il
doit patienter ou créer la sienne.

**Un bouton de rafraîchissement, et une liste qui se pousse toute seule.** Les
deux, et ce n'est pas redondant :

- Le hub **diffuse** `rooms` aux clients en état hub à chaque changement
  d'effectif ou d'état d'une salle. Ils sont peu nombreux et le message est
  minuscule ; une liste qui vieillit sur l'écran de celui qui attend une place
  est exactement le défaut qu'on veut éviter.
- Le bouton reste indispensable comme **recours**. Il couvre le cas qui motive
  toute la section : une salle passe de `4/4` à `3/4` en fin de manche, quand
  un joueur repart avant que l'hôte relance. Une diffusion perdue, une
  reconnexion, un onglet resté ouvert — le joueur qui attend doit avoir un
  moyen explicite de revérifier sans recharger la page.

Le rafraîchissement est **limité en fréquence** côté serveur (une demande par
seconde et par client, les suivantes ignorées) : c'est un bouton qu'on
martèle, et le port est public.

Un **mot de passe optionnel** à la création, pour une partie privée. Simple à
faire, et ça évite d'avoir à trancher entre « tout public » et « tout privé ».

---

## 6. La boucle de tick

Un **seul intervalle** pour toutes les salles, pas un par salle : moins de
minuteurs, et on garde la maîtrise du budget total.

```js
setInterval(() => {
  const now = process.hrtime.bigint();
  for (const room of hub.rooms.values()) {
    try {
      room.tick(now);
    } catch (err) {
      // Une salle qui plante ne doit pas emporter les autres.
      log(`salle ${room.code} en erreur : ${err.message}`);
      hub.closeRoom(room, "erreur interne");
    }
  }
}, 1000 / 120);
```

### Deux pièges à traiter explicitement

**Le regroupement de ticks.** L'intervalle tourne à 120 Hz, soit 8,3 ms de
budget. Si seize salles simulent dans le même tour, on atteint
16 × 0,779 = 12,5 ms et la boucle décroche. Les accumulateurs se désynchronisent
naturellement, mais pas de façon fiable : il faut **répartir explicitement les
salles sur les tours**, par exemple en décalant l'origine de l'accumulateur de
chaque salle à sa création.

**Les diffusions groupées.** Même problème pour les snapshots : seize salles
diffusant 7 Ko à quatre clients dans le même tour, c'est 450 Ko écrits d'un
coup. Étaler les instants de diffusion sur le cycle, comme pour la simulation.

**L'isolation aux pannes** est un bénéfice réel du `try/catch` par salle :
aujourd'hui une exception dans une partie fait tomber tout le serveur.

---

## 7. Persistance

Inchangée dans son mécanisme — l'intégration Supabase existante est conservée
telle quelle. Seul change **qui appelle** :

- Une salle émet `roundEnded`, `playerLeft`, `purchase`.
- Le hub reçoit, met à jour la progression en mémoire, et pousse vers Supabase
  avec la logique de réessai déjà en place.

Avec plusieurs salles, la fréquence d'écriture augmente. Un **regroupement**
s'impose : accumuler les changements sur une courte fenêtre (quelques
secondes) et pousser en une fois, plutôt qu'une requête par événement.

Le comportement existant est conservé : lecture complète au démarrage avant
d'accepter la première connexion, écritures suspendues tant qu'aucune lecture
n'a réussi.

---

## 8. Compression des snapshots

À inclure dans ce lot : c'est de l'infrastructure, et le passage sur VPS la
rend rentable. Mesures sur un snapshot pire cas de 7,3 Ko :

| | taille | gain |
|---|---|---|
| brut | 7,3 Ko | — |
| deflate niveau 1 | **2,8 Ko** | **61 %** |
| deflate niveau 6 | 2,6 Ko | 64 % |

Coût : 0,31 ms par compression, et **une seule compression par salle** — pas
une par client, puisque `broadcast()` sérialise déjà une seule fois.

| salles | sans | avec |
|---|---|---|
| 4 | 18,2 Mbps | **7,0 Mbps** |
| 8 | 36,3 Mbps | **14,0 Mbps** |
| 16 | 72,6 Mbps | **28,0 Mbps** |

Le niveau 1 suffit : les 3 % de gain supplémentaires du niveau 6 ne justifient
pas le CPU.

Implémentation : `permessage-deflate` dans `ws_lite.js`, négocié à la poignée
de main. C'est la seule extension WebSocket à ajouter, et elle reste dans
l'esprit du module — pas de dépendance, `node:zlib` est natif.

---

## 9. Déploiement

**TLS par proxy inverse**, pas dans `ws_lite.js`. Caddy ou nginx devant,
certificat automatique, Node continue de parler HTTP en local. `ws_lite.js`
annonce lui-même ne pas être une bibliothèque générale — ce n'est pas le
moment de le transformer en une.

Le client bascule déjà en `wss://` quand la page est servie en HTTPS, rien à
changer de ce côté.

**Un plafond de connexions par adresse IP**, puisque le port est désormais
public : quelques connexions simultanées suffisent, et ça évite qu'un scan
automatisé remplisse les salles.

**Le port** : `8080` est susceptible d'être déjà pris sur une machine de
développeur. Derrière un proxy inverse, le port interne n'a plus d'importance —
autant prendre quelque chose sans collision, `7777` par convention.

---

## 10. Points de vigilance sur le refactor

Ce sont les mécanismes les plus subtils du serveur actuel, et ceux qu'un
refactor mécanique casse le plus facilement. Chacun doit être retesté
explicitement après le passage en salles :

- **La migration d'hôte** — l'hôte est le plus ancien client connecté ; le
  calcul doit désormais se faire au sein d'une salle, pas globalement.
- **Le verrou de classe** — posé à l'entrée en manche, levé en fin de manche.
- **La pause** — validée uniquement si un seul joueur est connecté *dans cette
  salle*, avec la levée automatique après cinq minutes.
- **La reprise après déconnexion** — un joueur qui revient doit retrouver sa
  salle tant qu'elle est dans son délai de grâce.
- **Les spectateurs** — un joueur qui rejoint en cours de manche reste
  spectateur jusqu'à la manche suivante, comportement à préserver par salle.
- **L'interruption de manche** — quand plus aucun joueur n'est en jeu, la
  manche s'interrompt ; désormais par salle, sans affecter les autres.
- **La page admin** — elle suppose aujourd'hui une partie unique. À adapter
  pour lister les salles.
- **L'effectif diffusé au hub** — il doit se mettre à jour à *toutes* les
  sorties, et elles sont nombreuses : `leaveRoom`, `leaveRound`, fermeture de
  socket, expiration du délai de grâce, fermeture de salle sur erreur. Un seul
  chemin oublié laisse une salle affichée `4/4` alors qu'une place est libre —
  et c'est le cas de la fin de manche, le plus fréquent de tous. Point de
  passage unique côté hub : une seule fonction qui recompte et rediffuse,
  appelée par tout ce qui détache un client d'une salle.

---

## 11. Protocole

Nouveaux messages, à ajouter sans casser l'existant :

| sens | message |
|---|---|
| serveur → client | `rooms` — liste des salles (nom, effectif, plafond, état, protégée) |
| client → serveur | `listRooms` — demande explicite, limitée à une par seconde |
| client → serveur | `createRoom` — nom, mot de passe optionnel |
| client → serveur | `joinRoom` — code, mot de passe |
| serveur → client | `joinRoomError` — motif : `pleine`, `disparue`, `mot de passe` |
| client → serveur | `leaveRoom` |
| serveur → client | `roomJoined` — le client bascule en état salle |
| serveur → client | `roomClosed` — retour à l'état hub |

`rooms` transporte le **plafond** en plus de l'effectif plutôt que la seule
chaîne `3/4` : le client compose son libellé et sait par lui-même si l'entrée
est cliquable, sans réanalyser un texte.

`joinRoomError` porte un motif distinct pour `pleine` et `disparue` — les deux
arrivent au même moment (fin de manche, salle qui se vide ou se remplit
pendant qu'on lit la liste) et la conduite à tenir n'est pas la même :
réessayer, ou créer sa propre salle.

Tous les messages existants restent inchangés, mais ne sont valides qu'en état
salle. Le serveur rejette proprement un message de jeu reçu en état hub — c'est
exactement le type de message qu'un client modifié enverrait.

---

## 12. Interface client

Un écran de hub avant le salon actuel :

- La liste des salles, avec nom, effectif (`3/4`) et état.
- Un **bouton de rafraîchissement** au-dessus de la liste.
- Un bouton de création, avec nom et mot de passe optionnel.
- Un bouton de retour au hub depuis le salon.

Une entrée `4/4` est **désactivée**, pas masquée — voir section 5. La rendre
cliquable pour afficher ensuite un refus serait pire que de la griser : le
joueur apprend l'information deux fois, une fois de trop.

Le bouton de rafraîchissement se **désarme une seconde** après un clic, en
miroir de la limite serveur. Un bouton qui accepte le clic pendant que le
serveur l'ignore laisse croire que la liste est à jour alors qu'elle n'a pas
bougé.

Le salon existant devient l'écran **d'une salle**, sans autre changement.

---

## 13. Mesures

| mesure | attendu |
|---|---|
| CPU à 4 salles au pire cas | environ 20 % d'un cœur |
| CPU à 8 salles au pire cas | environ 40 % |
| retard maximal de la boucle sur un tour | inférieur à 4 ms |
| bande passante à 8 salles, compression active | environ 14 Mbps |
| temps de création d'une salle | imperceptible |

Le retard de boucle est la métrique décisive : c'est elle qui dira si
l'étalement des salles fonctionne. À mesurer en instrumentant l'intervalle, pas
en observant le jeu.

---

## 14. Critères d'acceptation

- Deux parties simultanées se déroulent sans interférence observable.
- Une exception dans une salle ne fait tomber ni les autres salles, ni le hub.
- Une salle vide est détruite après son délai de grâce, pas avant.
- Un joueur qui recharge sa page dans le délai de grâce retrouve sa salle.
- La progression d'un joueur est correctement persistée quelle que soit la
  salle où il a joué.
- Aucun message de jeu n'est accepté d'un client en état hub.
- Le plafond de salles est respecté, avec un refus explicite au-delà.
- Une salle à 4/4 refuse un cinquième joueur avec un motif explicite, sans
  fermer sa connexion : il reste au hub et peut rejoindre ailleurs.
- Un joueur qui quitte une salle pleine en fin de manche la fait passer à 3/4
  dans la liste de tous les clients en état hub, sans qu'aucun d'eux ait à
  recharger sa page.
- Le bouton de rafraîchissement renvoie une liste à jour, et un martèlement de
  clics ne produit pas plus d'une demande par seconde.
- Les huit mécanismes listés en section 10 fonctionnent à l'identique après refactor.
