# Plan infrastructure — index

Un seul lot, **volontairement indépendant** de la série de contenu (plan v5).
Il peut être exécuté avant ou après elle.

| lot | contenu |
|---|---|
| [Infrastructure de salons](infra-salons.md) | refonte serveur en hub + salles, compression, déploiement VPS |

## Pourquoi ce plan est séparé

Le refactor en salons est un chantier **d'architecture**, pas de contenu. Il ne
change aucune règle de jeu, aucune carte, aucun boss. Il n'a donc aucune raison
d'être couplé au calendrier des évolutions de gameplay.

L'ordre d'exécution reste ouvert, mais il a des conséquences — voir ci-dessous.

## Articulation avec le plan v5

Les deux plans sont exécutables dans n'importe quel ordre. Ce qui change :

**Si l'infrastructure passe en premier.** Les lots de contenu s'écrivent
directement contre l'architecture en salles. C'est l'ordre le plus économique :
aucune adaptation à prévoir.

**Si l'infrastructure passe après.** Chaque lot de contenu qui introduit de
l'état serveur ajoute une variable de plus à déplacer dans `Room` au moment du
refactor. Le surcoût reste modéré, mais il croît avec le nombre de lots
réalisés entre-temps.

### La règle qui rend les deux ordres équivalents

Une seule, et elle ne coûte rien à appliquer dès maintenant :

> **Tout nouvel état serveur introduit par un lot de contenu s'attache à la
> partie en cours, jamais au module.**

Concrètement, un lot qui a besoin de mémoriser quelque chose côté serveur — le
marchand du lot K, la séquence de vagues spéciales du lot L, l'état du boss
final du lot N — le range dans l'objet qui représente la manche, et non dans
une variable globale de `server.js`.

Si cette règle est respectée, le refactor en salles se limite à déplacer
l'existant, sans avoir à démêler ce que les lots de contenu auront ajouté.

## Ce que ce plan ne couvre pas

- La télémétrie — hors périmètre, décision actée.
- L'optimisation du classement au temps — reportée à une seconde étape.
- L'augmentation du nombre de joueurs par salle : la limite de 4 est câblée
  dans `PLAYER_COLORS` et dans la règle « un tank et un soigneur au maximum ».
  C'est un chantier distinct.
