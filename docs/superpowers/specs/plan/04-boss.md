# Lot 4 — Roster de boss

## Objectif

Cinq boss ayant chacun **un verbe** différent, tirés au sort, avec une
adaptation systématique à l'effectif.

Dépend des lots 1 et 3.

## 1. Le principe

Plutôt qu'empiler des mécaniques sur un boss unique, cinq combats qui demandent
chacun autre chose. Le Ravageur actuel devient l'un d'eux sans être réécrit.

```
BOSS_ROSTER = [
  { id:"ravageur",  verbe:"positionnement",   minPlayers:1, hpMul:1.00 },
  { id:"matriarche",verbe:"gestion de cibles",minPlayers:1, hpMul:0.85 },
  { id:"metronome", verbe:"mouvement",        minPlayers:1, hpMul:0.90 },
  { id:"oracle",    verbe:"cohesion",         minPlayers:2, hpMul:1.10 },
  { id:"jumeaux",   verbe:"separation",       minPlayers:2, hpMul:1.00 },
]
```

Tirage **sans répétition tant que la liste n'est pas épuisée**, filtré par
`minPlayers`. En solo on tire parmi trois boss dont les mécaniques sont
individuelles par nature — plus propre que de dénaturer un combat pour le rendre
jouable seul.

`BOSS_ROSTER` est un tableau ordonné dont l'index circule : ne jamais insérer
au milieu.

Les cinq barres de vie et la montée en répertoire par barre rompue restent le
squelette commun. Ce qui change d'un boss à l'autre, c'est **le répertoire
disponible**.

## 2. Les mécaniques de groupe

Nouvelles mécaniques transversales, réutilisées par plusieurs boss. Chacune
suit le cycle annonce → résolution déjà en place.

**Regroupement** — un joueur est marqué, un cercle apparaît sur lui. À la
résolution, les dégâts sont **divisés par le nombre de joueurs dans le cercle**.
Seul, on encaisse tout. C'est la mécanique de cohésion de référence.

**Dispersion** — distance minimale entre joueurs à la résolution. Chaque paire
trop proche prend des dégâts supplémentaires.

**Tours** — N zones à occuper. Chaque tour non occupée inflige des dégâts à
**toute l'équipe**. C'est ce qui force une répartition explicite en pleine vague.

**Dénombrement** — variante des tours avec un nombre exact de joueurs requis par
zone, affiché sur le marqueur. La plus exigeante, à réserver aux effectifs de 3-4.

**Lien** — deux joueurs reliés subissent des dégâts continus jusqu'à ce qu'ils
s'éloignent d'une distance seuil.

**Prison** — un joueur enfermé, immobile, jusqu'à ce que les autres brisent la
cage en tirant dessus.

**Regard** — pendant 2 s, tout joueur dont la **direction de visée** pointe vers
le boss subit des dégâts et gagne un cumul de Vulnérabilité. Mécanique inédite
et gratuite : elle punit exactement le réflexe central du jeu et n'existe que
parce qu'on a une visée à la souris.

**Proximité** — dégâts dégradés selon la distance à l'épicentre, létal au
centre. Remplace le binaire dedans/dehors par un dégradé, plus lisible pour un
débutant et plus exigeant pour un joueur qui optimise.

## 3. Adaptation à l'effectif

Un seuil **par mécanique** plutôt qu'une variante par boss : cinq variantes de
combat seraient impossibles à maintenir.

| mécanique | 1 joueur | 2 | 3-4 |
|---|---|---|---|
| Tours | 1 tour | 2 | = joueurs vivants |
| Dénombrement | absent | absent | actif |
| Regroupement | remplacé par une zone à esquiver | actif | actif |
| Dispersion | absente | active | active |
| Lien | absent | actif | actif |
| Prison | remplacée par une grappe à détruire | active | active |
| Regard | actif | actif | actif |
| Proximité | actif | actif | actif |
| Sentence | absente sans soigneur | selon composition | selon composition |

Chaque mécanique porte donc `minPlayers` et, le cas échéant, une `fallback`.

## 4. Les cinq boss

### Le Ravageur — positionnement

Existant, à conserver. Damier, murs, balayages rotatifs, anneaux, spirale,
traque. Il apprend à lire le sol.

Ajouts de ce lot : **constriction de l'arène** (lot 5) et **verrouillage par
quadrant** aux dernières barres, cohérents avec ses murs actuels.

### La Matriarche — gestion de cibles

Le combat n'est plus « tirer sur le boss » mais « choisir sa cible », ce qui
punit une équipe qui ne fait que du dégât brut.

- **Grappes** : pond des amas qui éclosent après 12 s en trois runners si on ne
  les détruit pas.
- **Liens nourriciers** : des rejetons la soignent tant que le lien n'est pas
  coupé — il faut les tuer, pas elle.
- **Prison** : cocon sur un joueur. En solo, remplacée par une grappe à détruire
  dans un délai serré : même verbe, sans dépendance à un allié.
- **Flaques rémanentes** (lot 5) laissées par les rejetons : l'arène pourrit si
  on laisse vivre les ajouts.

`hpMul` réduit à 0,85 : une partie des dégâts de l'équipe part nécessairement
sur autre chose qu'elle.

### Le Métronome — mouvement

Aucune décision, que de l'exécution. Le seul boss où le tir compte peu.

- **Exaflares** : séquences d'explosions qui traversent l'arène, seule la
  première étant marquée.
- **Appâts** : zones déposées là où le joueur était il y a une seconde, avec un
  fantôme visible qui le suit.
- **Zones en translation** : disques persistants qui glissent, obligeant à un
  déplacement latéral continu.
- **Sanctuaires** : toute l'arène devient dangereuse sauf deux ou trois disques
  sûrs qui se déplacent.
- **Sol glissant** : inertie sur le déplacement.

Peu de dégâts au contact, beaucoup de zones. `hpMul` 0,90 pour compenser le
temps passé à ne pas tirer.

### L'Oracle — cohésion

Le boss « raid », celui qui exploite le plus la présence de plusieurs joueurs.

- **Regroupement** et **Dispersion** en alternance, de plus en plus serrée.
- **Tours** et, à quatre, **Dénombrement**.
- **Regard**.
- **Jauge d'ultime** : se remplit, et ne se réduit que si les tours sont toutes
  occupées. Au maximum, une attaque massive sur toute l'équipe. C'est le vrai
  contrôle de dégâts et de coordination du jeu.
- **Miasme** : un cumul de Vulnérabilité à toute l'équipe toutes les 25 s.
  L'Oracle est le boss du Miasme parce qu'il offre des fenêtres pour le purger.

Réservé à 2 joueurs et plus.

### Les Jumeaux — séparation

Deux boss, une réserve de vie commune. Ils se soignent mutuellement à moins de
400 px l'un de l'autre : l'équipe doit se séparer, ce qui est terrifiant quand
la survie dépend du regroupement.

- Chacun applique un état différent (Brûlure / Entrave). **Cumuler les deux
  déclenche une explosion** sur le porteur : il faut les traiter séparément.
- **Croix** depuis chacun d'eux (lot 5), l'intersection étant mortelle.
- À la dernière barre, ils convergent : l'équipe doit se regrouper alors même
  qu'elle a passé le combat à se séparer.

Réservé à 2 joueurs et plus.

## 5. La sanction d'échec

**Une mécanique ratée met à terre, elle ne tue jamais sèchement.**

Dans un MMO, rater une mécanique tue et on recommence en trois minutes. Ici une
manche ratée coûte plusieurs minutes de progression et de cartes. Le système de
réanimation existe précisément pour ça.

Les dégâts d'une mécanique ratée sont donc calibrés pour amener un joueur à
pleine vie **près de zéro sans le franchir**, et c'est le cumul de
Vulnérabilité qui rend le second échec fatal. La progression de la sanction est
portée par l'état, pas par la valeur brute.

## 6. Sélection et annonce

- Tirage à l'entrée d'une vague de boss, parmi les non-vus filtrés par
  effectif. Liste réinitialisée quand elle est épuisée.
- L'identité du boss est diffusée à l'entrée, avec son nom et son verbe en
  sous-titre — c'est ce qui permet à une équipe de savoir immédiatement à quoi
  s'attendre.
- Le nom du boss et le numéro d'occurrence apparaissent dans la barre haute
  existante.

## 7. Canal d'événements de mécanique

Prérequis du lot 6, à livrer ici puisque les boss en dépendent.

```
serveur -> client : { t:"alert", mech, level, dur }
```

Message **ponctuel**, hors du snapshot à 20 Hz. `mech` est un identifiant de
mécanique dans un nouveau registre partagé, `level` vaut consigne / avertissement
/ information.

Sans ce canal, personne ne comprendra jamais l'Oracle : un cercle cyan ne dit
pas « regroupez-vous » à la première rencontre.

## 8. Modifications par fichier

### `shared/bosses.js` (nouveau)

Module pur : `BOSS_ROSTER`, table des mécaniques avec `minPlayers`, `fallback`,
`needsHealer`, répertoires par boss et par barre.

### `shared/game_state.js`

- `_boss()` : sélection dans le roster, répertoire propre au boss.
- Nouvelles mécaniques de groupe, chacune avec annonce et résolution.
- Résolution des tours, du regroupement, de la dispersion : compter les joueurs
  dans les zones au moment de la résolution.
- Jauge d'ultime de l'Oracle.
- Réserve de vie commune et soin mutuel des Jumeaux.

### `public/client.js`

- Marqueurs sur les joueurs : cible, regroupement, dispersion, lien, prison.
- Rendu des liens, des cages, de la jauge d'ultime.
- Bandeau d'alerte (lot 6, ou version minimale ici).

## 9. Mesures à relever

Pour chaque boss, à 1, 2 et 4 joueurs :

| mesure | attendu |
|---|---|
| durée du combat | 50 à 80 s, comparable entre boss |
| **écart entre un bot qui résout les mécaniques et un bot qui les ignore** | **supérieur à 40 % de survie** |
| taux d'échec par mécanique | aucune au-dessus de 60 % au premier contact |
| mise à terre par mécanique ratée | oui ; mort sèche : jamais |

La deuxième ligne est **la** mesure qui compte. Si l'écart est faible, la
mécanique est punitive et non difficile : elle taxe tout le monde également au
lieu de récompenser la lecture.

## 10. Critères d'acceptation

- Les cinq boss sortent, sans répétition avant épuisement.
- L'Oracle et les Jumeaux ne sortent jamais en solo.
- Chaque mécanique a un repli fonctionnel à l'effectif inférieur à son seuil.
- Une mécanique ratée ne tue jamais un joueur à pleine vie.
- Un joueur qui se déconnecte pendant une mécanique de groupe ne la bloque pas
  (tours non occupables, lien orphelin).
