# Plan d'évolution — index

Six lots livrables et testables séparément. Chacun est un document autonome
destiné à être donné tel quel à Claude Code, un lot à la fois.

## Ordre recommandé

| # | lot | dépend de | pourquoi cette place |
|---|---|---|---|
| 1 | [Vagues et progression](01-vagues-et-progression.md) | — | change l'équilibrage de tout le reste, donc d'abord |
| 2 | [Classes et compétences](02-classes.md) | 1 | la puissance d'équipe doit exister avant d'y ajouter des multiplicateurs de classe |
| 3 | [États et purge](03-etats-et-purge.md) | 2 | la purge est une fonction du soigneur |
| 4 | [Roster de boss](04-boss.md) | 1, 3 | les boss appliquent des états et occupent des vagues |
| 5 | [Motifs au sol](05-motifs-au-sol.md) | 4 | les motifs se distribuent entre les boss |
| 6 | [Retour sensoriel](06-retour-sensoriel.md) | — | indépendant, insérable à tout moment |

Le lot 6 ne dépend de rien et ne touche pas `shared/game_state.js`, à
l'exception du canal d'événements — lequel est de toute façon requis par le
lot 4. Il peut donc être fait en premier si l'envie est de voir le jeu changer
de peau avant d'attaquer l'équilibrage.

## Décisions verrouillées

Elles ont été arbitrées en amont, ne pas les rouvrir sans raison :

- **Fin de vague** : budget d'apparitions épuisé **puis** arène nettoyée.
- **Niveaux** : plus de gain de statistiques automatique. Un niveau donne un
  choix de carte. L'expérience est **commune à l'équipe**.
- **Classes** : choisies au salon, **verrouillées pour toute la session**.
  Maximum un tank et un soigneur par partie.
- **DPS** : bombe lancée sur le réticule + fenêtre de surcharge.
- **Tank** : rempart de zone + provocation (et non invulnérabilité pure).
- **États** : quatre seulement, tous à expiration naturelle. Le soigneur
  accélère, il n'est jamais une condition d'accès.
- **Équilibrage** : indexé sur la **puissance mesurée** de l'équipe, jamais sur
  sa composition. Voir le lot 1 pour le raisonnement.

## Invariants du dépôt à respecter dans tous les lots

Repris de `CLAUDE.md`, à relire avant chaque lot :

- `shared/game_state.js` ne référence **jamais** le DOM, le canvas, le clavier
  ou le réseau.
- Les snapshots sont des tableaux positionnels : on ajoute **à la fin**, jamais
  au milieu, et le client lit avec un repli (`a[16] ?? 0`).
- Les tableaux exportés sont ordonnés et leur index circule sur le réseau.
- Tout ce qui blesse un joueur passe par `_hurt()`, tout ce qui blesse un
  ennemi par `_damage()`.
- Les systèmes lisent `p.mods`, jamais la liste de cartes.
- Le serveur valide tout choix reçu d'un client.
- Commentaires et identifiants **en français sans accents**, chaînes affichées
  au joueur **avec accents**.
- Les commentaires expliquent le *pourquoi*, en documentant ce qui a été essayé
  et pourquoi ça ne marchait pas.
- **Mesurer, ne pas extrapoler.** Chaque lot se termine par une campagne de
  mesure dont les chiffres partent dans `LISEZMOI.md`.

## Registres partagés

Chaque lot ajoute des entrées aux registres listés dans `CLAUDE.md`. Mettre le
tableau à jour fait partie du lot, pas d'une passe ultérieure.

| registre | lots concernés |
|---|---|
| `kind` d'effet | 2, 3, 4, 5 |
| `shape` de zone | 5 |
| bits de buff / états | 3 |
| bonus au sol | 3 |
| clés de `mods` | 1, 2 |
| identifiants de mécanique (nouveau) | 4, 6 |
| identifiants de classe (nouveau) | 2 |
