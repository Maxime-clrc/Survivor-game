# Lot L — Vagues spéciales

Dépend du lot I : se déroulent sur la carte principale, pas d'arène dédiée.

---

## L1. Les quatre vagues retenues

La cinquième proposition du brainstorm (vague vide) a été explicitement
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
bouclier à tous les joueurs, **et relève les joueurs à terre** au moment de la
clôture. Contrairement aux vagues normales, qui ne soignent pas à leur
clôture. Une seule règle, sans condition : la réussite remet toute l'équipe
debout à pleine vie — un cas « relevé mais pas soigné » ou « soigné mais
resté à terre » serait illisible.

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

### La solution actée : activation déterministe, calée sur la cadence des boss

**Les vagues spéciales n'apparaissent plus au hasard : elles tombent sur les
vagues dont le numéro vérifie `vague % 5 === 3`, identiques pour toutes les
parties.** Le type suit une séquence cyclique fixe.

```js
SPECIAL_WAVE_MOD: 5,       // meme module que WAVE_BOSS_EVERY, decale de 3
SPECIAL_WAVE_REM: 3,
SPECIAL_SEQUENCE: ["nuee", "croise", "siege", "chasse"],  // cyclique
```

Soit : vague 3 nuée, 8 tir croisé, 13 siège, 18 chasse, 23 nuée, 28 tir
croisé, et ainsi de suite.

**Le calcul qui fixe ce choix** (vérifié contre le code : `WAVE_BOSS_EVERY: 5`,
les boss occupent les vagues 5, 10, 15, 20, 25…) :

- `3 % 5 ≠ 0` : une vague spéciale ne coïncide **jamais** avec un boss, par
  arithmétique et non par liste à maintenir — la proposition initiale
  (3, 6, 9, 12 puis cycle) serait retombée sur les vagues 15 et 20 dès le
  premier cycle.
- Deux vagues spéciales sont espacées de cinq vagues : **jamais deux
  consécutives**, le critère L7 est structurel.
- Chaque tranche de cinq vagues a le même motif : trois normales, une
  spéciale, un boss — le rythme s'apprend.
- Le boss final (lot N) tombe vague 30 (`% 5 === 0`) : jamais de
  chevauchement avec une spéciale, même garantie arithmétique.

L'équilibrage fin (densité, place dans la tranche) viendra plus tard, en
jouant ; ce qui est fixé ici est le **caractère déterministe et l'absence de
collision**, pas les valeurs.

Cette approche rend aussi les vagues spéciales **prévisibles et annonçables à
l'avance**, comme envisagé au brainstorm : un joueur sait qu'à la vague 13
vient un siège de tanks et ajuste ses choix de cartes dans les vagues
précédentes — une couche de décision stratégique à moyen terme, plutôt qu'une
surprise ponctuelle. La surprise pure est sacrifiée, compromis assumé ; une
graine fixe par version resterait l'amélioration possible d'une itération
future si la prévisibilité s'avère être un défaut en jeu réel.

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

**Piège identifié : `chasse` × exécution.** L'invariant du dépôt exclut le
boss et les structures de mécanique du seuil d'exécution (un seuil appliqué à
une grosse réserve de PV en supprime une part entière d'un coup). L'élite de
`chasse` porte exactement ce profil : le gibier doit être **exclu de
l'exécution**, comme le boss, sinon le dernier quart de la vague disparaît en
un tir pour tout joueur qui a la carte.

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
  joueurs, et relève ceux qui étaient à terre au moment de la clôture.
- Aucune vague spéciale ne coïncide avec un boss ni ne suit immédiatement une
  autre vague spéciale (garanti par `vague % 5 === 3`).
- L'élite de `chasse` est exclu du seuil d'exécution, comme le boss.
