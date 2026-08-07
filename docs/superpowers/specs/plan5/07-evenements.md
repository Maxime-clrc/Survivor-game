# Lot U — Événements

Dépend des lots P et S. Reprend `plan4` lot L (vagues spéciales), qui devient le système
d'événements complet.

---

## U1. Une seule liste, une seule autorité

Le brief demande un « système d'événements dynamiques ». La tentation est un **second
système**, tirant au hasard en parallèle du script. C'est une erreur, et elle a déjà été
identifiée dans ce dépôt.

Deux autorités sur la même horloge produisent :

- des **collisions** — un événement pendant un crescendo, deux événements simultanés, un
  événement pendant un boss ;
- une partie **non reproductible**, donc non classable. `plan4/L3` avait déjà tranché :
  *« si elles apparaissent totalement au hasard, elles risquent de fausser un classement
  basé sur le temps de complétion d'une partie »*, et `plan4/N8` a confirmé que cette
  décision était **nécessaire et non optionnelle**.

> **Un événement est une entrée du script**, au même titre qu'un beat de débit.

Le calendrier n'est donc plus une arithmétique à maintenir (`vague % 5 === 3`) mais une
colonne de la table du lot P. Les garanties de `plan4/L3` — jamais de collision avec un
boss, jamais deux consécutives — deviennent **triviales à vérifier** puisqu'elles se lisent
dans la table.

---

## U2. Les quatre familles

| famille | exemples | rôle |
|---|---|---|
| **pression** | silence, crescendo | la plus importante et la moins coûteuse (U3) |
| **composition** | `nuee` (runners), `siege` (tanks), `croise` (shooters) | reprend `plan4/L1` |
| **chasse** | un élite au gabarit très augmenté, seul dans l'arène | reprend `plan4/L1` |
| **environnement** | un champ de geysers s'active, la météo tourne | identité de cauchemar (lot V) |

`EVENTS` est un **tableau ordonné dont l'index circule** — dans le canal d'alerte et dans
une clé nommée `ev`. Ajouter en fin, jamais au milieu : même invariant que `MECHS`,
`STATUSES` et `POWERUP_TYPES`.

`MECHS` reste **réservé aux boss**. Un événement de horde et une mécanique de boss n'ont ni
le même cycle, ni le même client, ni le même échec : les mélanger dans une table ferait que
`adaptMech` réponde à deux questions.

---

## U3. La famille « pression » est la plus importante

Un silence et un crescendo sont des événements au même titre qu'une nuée, et il faut qu'ils
soient dans la même table pour une raison structurelle : **ils occupent la même ressource**
— le temps de horde — et rien ne doit pouvoir les superposer.

Le silence est détaillé au lot P (§P3). Rappel du chiffre qui compte : la population doit
descendre **sous 25**, sinon le silence ne se lit pas, il ne fait que ralentir.

Le crescendo est détaillé au lot P (§P4) : dernière minute de chaque segment, et le
balayage qui suit ne crédite **aucune expérience**.

---

## U4. Les trois règles reprises de `plan4` lot L

Toujours valides, et maintenant garanties par la table plutôt que par l'arithmétique.

### Annonce obligatoire

Via le canal d'alerte existant, à l'ouverture du beat précédent ou en tout début
d'événement. *« Pas de surprise silencieuse, cohérent avec le principe déjà établi que les
mécaniques se lisent avant de se subir. »*

Le niveau d'alerte suit la règle du dépôt : une **consigne** (`ALERT_ORDER`) demande une
action immédiate, un **avertissement** (`ALERT_WARN`) prévient d'un danger, une
**information** (`ALERT_INFO`) raconte. Un silence est une information ; une nuée est un
avertissement ; `chasse` est une consigne (« concentrez le feu »).

Et le bandeau **disparaît avant la résolution** — durée d'annonce moins 250 ms : *« un texte
encore affiché au moment de l'impact masque exactement ce qu'il faut regarder »*.

### Jamais de collision

- Pas d'événement pendant un combat de boss : l'horloge de horde est arrêtée, la question
  ne se pose pas.
- Pas deux événements simultanés : une seule colonne `event` par beat.
- Pas d'événement sur le beat de crescendo d'un segment : le crescendo **est** l'événement.

### Réussir un événement remet l'équipe debout

**Décision actée de `plan4/L2`, reprise sans changement** : terminer un événement rend
**100 % des PV et du bouclier** à tous les joueurs **et relève les joueurs à terre**.

*« Une seule règle, sans condition : un cas "relevé mais pas soigné" ou "soigné mais resté à
terre" serait illisible. »*

C'est une pièce **majeure** de l'économie de récupération (lot X), et son poids a augmenté :
`WAVE_HEAL` a disparu au lot P, donc les événements et les boss sont désormais les deux
seules sources garanties de remise à plein.

Définition de « terminer » en modèle continu : l'événement a une **durée**, pas une condition
de nettoyage. Il se termine à l'échéance de son beat, sauf `chasse`, qui se termine à la mort
du gibier — et qui ne rend rien si le gibier survit à son beat.

---

## U5. Les quatre événements de composition

Repris de `plan4/L1`. La composition remplace le `mix` du beat ; le débit reste celui du
beat, sauf mention.

| id | nom | composition | ce que ça demande |
|---|---|---|---|
| `nuee` | Nuée | uniquement des runners, très nombreux, peu de PV chacun | tenir une position, dégâts de zone |
| `siege` | Siège | uniquement des tanks, lents et coriaces | patience, cadence, ne pas se laisser encercler |
| `chasse` | Chasse | un seul élite au gabarit très augmenté, **aucun autre ennemi** | concentration du feu |
| `croise` | Tir croisé | forte proportion de shooters | fermer la distance |

### Le piège de `chasse`, déjà identifié

`plan4/L5` l'avait vu, et il reste entier : *« l'invariant du dépôt exclut le boss et les
structures de mécanique du seuil d'exécution. L'élite de `chasse` porte exactement ce profil :
le gibier doit être exclu de l'exécution, sinon le dernier quart de la vague disparaît en un
tir pour tout joueur qui a la carte. »*

Sous D2 (lot R), un second piège s'ajoute : les PV du gibier ne suivent plus la puissance,
donc une build optimisée le tue en quelques secondes et l'événement n'existe pas. Deux
réponses possibles, à trancher à la mesure :

- lui donner un **plancher de durée**, comme le plancher de barre des boss — cohérent avec le
  lot R, et c'est le même problème ;
- ou accepter qu'une bonne build expédie `chasse` en dix secondes et gagne sa remise à plein
  très vite. C'est le **grand écart assumé** de D2, et `chasse` est peut-être exactement
  l'endroit où on veut qu'il se voie.

**Recommandation** : la seconde, sans plancher. `chasse` est le seul événement où la
récompense est immédiate et proportionnelle aux dégâts, donc c'est le meilleur endroit du jeu
pour *montrer* qu'une bonne build est une bonne build. Le plancher de barre des boss existe
pour protéger une **chorégraphie** ; `chasse` n'en a pas.

---

## U6. Les événements d'environnement

Détaillés au lot V. Vus d'ici, ce sont des entrées de la même table, avec deux contraintes :

- ils sont **réservés à cauchemar** (et un ou deux, doux, à normal) ;
- ils comptent dans le **plafond de surface de 12 %** avec tout le reste — traînées, spores,
  zones de boss.

---

## U7. Adaptation à l'effectif

Les entrées d'événement portent `minPlayers` et `fallback`, **la même signature que
`MECHS`** (lot P §P7).

| événement | `minPlayers` | `fallback` | pourquoi |
|---|---|---|---|
| `nuee` | 1 | — | fonctionne à tout effectif |
| `siege` | 1 | — | idem |
| `croise` | 1 | — | idem |
| `chasse` | 1 | — | idem, le gibier suit `crowd` |
| `quatre-fronts` | 3 | `pince` | à deux, quatre fronts revient à jouer deux parties solo — même raisonnement que `MECH_QUADRANT` |

**Un seul point de passage**, `adaptEntry`, généralisé depuis `adaptMech` — sinon *« chaque
appel refait le test à sa manière et la table cesse d'être vraie »*. Et **un seul niveau de
repli** : un repli qui replie serait illisible.

---

## U8. Protocole

Une clé **nommée** dans le snapshot :

```
ev: [index, restant]     // evenement actif et son compte a rebours
```

**Absente** hors événement, comme `bn` et `wl` le sont déjà la plupart du temps.

Le canal d'alerte transporte l'annonce : `{t:"alert", event, level, dur}`, sur le modèle
exact de `{t:"alert", mech, level, dur}` qui existe déjà. Il est **ponctuel et hors du
snapshot** — *« une consigne répétée vingt fois par seconde ne serait plus une consigne »* —
et `GameState` empile dans `state.alerts` sans jamais diffuser.

Côté client, l'alerte est mise en file et sortie sur l'**horloge de rendu**, comme les
autres : le canal arrive hors du snapshot donc sans les 110 ms de retard, et une annonce qui
tombe avant l'image qu'elle commente est un défaut mesuré.

---

## U9. Fichiers touchés

| fichier | ce qui change |
|---|---|
| `shared/timeline.js` | table `EVENTS` (ordonnée, l'index circule) ; colonne `event` des beats ; `adaptEntry` |
| `shared/game_state.js` | résolution de l'événement courant dans `_segmentTick` ; composition forcée dans `_spawner` ; remise à plein et relèvement à la fin d'un événement ; `chasse` exclu de l'exécution ; clé `ev` dans `snapshot()` ; annonce empilée dans `state.alerts` |
| `public/hud.js` | `updateAlerts()` gère les événements comme les mécaniques ; bandeau d'événement avec compte à rebours |
| `public/client.js` | `pushAlert` pour les événements ; effet visuel d'ouverture d'événement |
| `public/events.js` | événement typé « début / fin d'événement » déduit du snapshot |
| `public/audio.js` | une entrée de `PALETTE` par famille d'événement ; `music.js` peut basculer d'humeur sur un événement |
| `LISEZMOI.md` | une section « Événements » ; le calendrier `% 5 === 3` de `plan4/L3` devient l'historique d'une contrainte disparue |

---

## U10. Ce que `plan4` lot L perd, et pourquoi c'est un gain

`plan4/L3` avait dû inventer une arithmétique (`vague % 5 === 3`) pour garantir l'absence de
collision **sans liste d'exceptions à maintenir**. C'était la bonne solution au problème
posé.

Le problème disparaît : avec un calendrier explicite, la garantie se **lit** dans la table
au lieu de se **prouver** par un modulo. Trois conséquences :

- plus de contrainte arithmétique sur le placement — on met un événement où le rythme le
  demande, pas où le modulo le permet ;
- la séquence `["nuee", "croise", "siege", "chasse"]` cyclique devient un **choix
  d'auteur** par variante de script, et une source de rejouabilité (lot X) ;
- le critère d'acceptation *« aucune vague spéciale ne coïncide avec un boss »* se vérifie
  par lecture de table, pas par calcul.

**La prévisibilité reste**, et elle était voulue : *« un joueur sait qu'à la vague 13 vient
un siège de tanks et ajuste ses choix de cartes — une couche de décision stratégique à moyen
terme »*. Elle est même meilleure, puisque le HUD peut annoncer le prochain événement du
segment.

---

## U11. Mesures

| mesure | cible |
|---|---|
| durée d'un événement de composition vs beat normal de même débit | pas de cible a priori — à relever par type |
| taux de mise à terre pendant un événement | comparable à un beat normal ; **ni plus dangereux ni trivial** |
| écart de temps de complétion entre deux parties, même variante | **proche de zéro** — test de non-régression du classement |
| part des PV rendus par les événements dans l'économie de récupération | à relever ; alimente le lot X |
| durée de `chasse`, builds 1,26 → 5,71 | grand écart **assumé** ; relevé pour information |
| population au fond d'un silence | **< 25** |
| collisions détectées (événement × boss, ou deux événements) | **zéro**, vérifié par script sur les trois variantes de chaque mode |

---

## U12. Critères d'acceptation

- Un événement est une **entrée du script** : il n'existe aucun tirage aléatoire
  d'événement en cours de manche.
- La séquence d'événements est **identique** entre deux parties lancées avec la même
  variante, le même biome, la même difficulté et le même effectif.
- Chaque événement est **annoncé** avant son démarrage, avec le niveau d'alerte
  correspondant, et le bandeau disparaît **avant** la résolution.
- Aucun événement ne coïncide avec un boss, avec un crescendo, ni avec un autre événement —
  vérifié par script sur les neuf variantes (trois modes × trois variantes).
- Réussir un événement restaure **100 % des PV et du bouclier** de tous les joueurs et
  **relève** ceux qui étaient à terre.
- L'élite de `chasse` est **exclu du seuil d'exécution**, comme le boss et les structures de
  mécanique.
- `EVENTS` est un tableau ordonné, aucune insertion au milieu ; `MECHS` n'a reçu aucune
  entrée d'événement de horde.
- La clé `ev` est **absente** du snapshot hors événement.
- Les annonces d'événement passent par la même file client que les alertes de mécanique, et
  sortent sur l'horloge de rendu — jamais à la réception.
