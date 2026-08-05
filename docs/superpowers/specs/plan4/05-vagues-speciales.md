# Lot L — Vagues spéciales

Dépend du lot I : se déroulent sur la carte principale, pas d'arène dédiée.

---

## L1. Les trois vagues retenues

La quatrième proposition du brainstorm (vague vide) a été explicitement
écartée par l'équipe.

| id | nom | composition |
|---|---|---|
| `nuee` | Nuée | uniquement des runners, très nombreux, peu de PV chacun |
| `siege` | Siège | uniquement des tanks, lents et coriaces |
| `chasse` | Chasse | un seul élite au gabarit très augmenté, aucun autre ennemi |
| `croise` | Tir croisé | forte proportion de shooters, oblige à fermer la distance |

Chacune remplace le tirage normal d'une vague entière, en gardant le même
modèle budget-puis-nettoyage du lot I : seule la composition change, pas la
mécanique de fin.

---

## L2. Récompense de réussite

**Décision actée** : terminer une vague spéciale rend 100 % des PV et du
bouclier à tous les joueurs participants. Contrairement aux vagues normales,
qui ne soignent pas à leur clôture.

C'est une incitation directe à ne pas fuir une vague spéciale, ce qui compte
puisque leur composition asymétrique (par exemple `siege`, uniquement des
tanks) peut sembler plus dangereuse au premier abord qu'une vague normale.

---

## L3. Le problème d'activation, identifié par l'équipe

Citation de la validation : *« si elles apparaissent totalement au hasard,
elles risquent de fausser un classement basé sur le temps de complétion d'une
partie »*.

Le raisonnement : si l'apparition d'une vague spéciale est aléatoire, deux
parties identiques en tout point peuvent avoir des temps de complétion
différents simplement parce que l'une a eu la chance de ne pas tirer de vague
spéciale ralentissant potentiellement la progression, ou au contraire en a
tiré une qui l'a avantagée. Le classement au temps (lot N) perdrait alors sa
valeur de comparaison.

### La solution proposée : activation déterministe, pas aléatoire

**Les vagues spéciales n'apparaissent plus au hasard : elles sont fixées à des
numéros de vague précis, identiques pour toutes les parties.**

```js
SPECIAL_WAVES: {
  3: "nuee",
  6: "croise",
  9: "siege",
  12: "chasse",
  // cycle a partir de la 13e, meme sequence repetee
}
```

Cette approche a un avantage supplémentaire au-delà du classement : elle rend
les vagues spéciales **prévisibles et annonçables à l'avance**, comme c'était
déjà envisagé (« annoncée à l'avance » dans le brainstorm initial). Un joueur
sait qu'à la vague 9 vient un siège de tanks, et peut ajuster ses choix de
cartes en conséquence dans les vagues précédentes — ce qui ajoute une couche
de décision stratégique à moyen terme, plutôt qu'une simple surprise
ponctuelle.

**Ce que ça sacrifie** : la surprise pure. C'est le compromis à valider
explicitement avec le porteur du projet — l'équipe a identifié le problème
mais n'a pas tranché entre « déterministe et prévisible » et une alternative
qui garderait de l'aléatoire sans casser le classement.

### Alternative si la prévisibilité totale n'est pas souhaitée

Un aléatoire **contraint et identique pour toutes les parties d'une même
version du jeu** : une séquence de vagues spéciales tirée une fois au
déploiement du serveur (ou dérivée d'une graine fixe), donc aléatoire en
apparence pour un joueur qui découvre le jeu, mais **strictement identique
d'une partie à l'autre** puisque dérivée de la même graine. Ça préserve la
comparabilité du classement sans rendre le contenu mémorisable par cœur dès la
première partie.

**Recommandation pour trancher** : partir sur l'activation déterministe
simple (numéros fixes) pour cette première itération, parce qu'elle est plus
simple à implémenter et à vérifier, avec la graine fixe comme amélioration
possible d'une itération suivante si la prévisibilité s'avère être un défaut
en jeu réel.

---

## L4. Annonce

Comme toute mécanique de vague dans ce jeu, une vague spéciale doit s'annoncer
via le canal d'alerte existant, à l'ouverture de la vague précédente ou en
tout début de la vague concernée — pas de surprise silencieuse, cohérent avec
le principe déjà établi que les mécaniques se lisent avant de se subir.

---

## L5. Interaction avec la difficulté

Les compositions asymétriques (uniquement des runners, uniquement des tanks)
ne suivent pas la même courbe de PV et de nombre que le tirage pondéré normal.
Chaque vague spéciale a donc son propre calibrage, indexé sur `_teamPower()`
comme les vagues normales, mais avec des coefficients propres à vérifier
séparément — en particulier `chasse`, où un seul ennemi porte tout le budget
de la vague et doit donc avoir des PV nettement supérieurs à un boss de milieu
de partie sans en être un pour autant (pas de barres segmentées, pas de
patterns de mécaniques de boss).

---

## L6. Mesures

| mesure | attendu |
|---|---|
| durée d'une vague spéciale vs vague normale de même numéro | à mesurer par type, pas de cible a priori |
| taux de mise à terre pendant une vague spéciale | comparable aux vagues normales, ni plus dangereux ni trivial |
| écart de temps de complétion totale entre deux parties, séquence identique | proche de zéro, sert de test de non-régression du classement |

## L7. Critères d'acceptation

- La séquence de vagues spéciales est identique entre deux parties lancées
  dans les mêmes conditions.
- Chaque vague spéciale est annoncée avant son démarrage.
- Réussir une vague spéciale restaure 100 % des PV et du bouclier de tous les
  participants, y compris ceux qui étaient à terre au moment de la clôture (à
  condition qu'ils aient été relevés avant la fin de la vague).
- Aucune vague spéciale ne peut suivre immédiatement une autre vague spéciale.
