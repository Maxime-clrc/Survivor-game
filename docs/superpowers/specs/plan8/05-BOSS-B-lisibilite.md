# Lot B — grammaire visuelle et annonces

31 mécaniques, aucune convention commune. Chacune a un texte, aucune n'a de
vocabulaire partagé — donc rien ne s'apprend d'un boss à l'autre.

## B-1 · La grammaire — à figer avant tout le reste

### La forme dit l'ACTION

| forme | action | mécaniques concernées |
|---|---|---|
| disque plein | **sortir** | `dodge`, `prox`, `cross` |
| anneau | **rentrer** | `couronne`, `shrink` |
| cône | **contourner** | `cone`, `pacman` |
| ligne / couloir | **traverser latéralement** | `balayage`, `mur`, `croix` |
| damier | **se placer dans un creux** | `damier`, `quadrant` |
| **cercle sur un joueur** | **se regrouper dessus** | `stack`, `converge` |
| **triangle sur un joueur** | **s'éloigner de lui** | `spread`, `bait` |
| **colonne au sol** | **occuper à N** | `tower`, `seal`, `count` |
| **œil** | **cesser de viser** | `gaze` |
| **chaîne entre deux** | **s'éloigner l'un de l'autre** | `link` |
| **cage** | **tirer dessus** | `jail`, `cluster` |

Onze formes pour 31 mécaniques : c'est le bon rapport. Une forme peut servir
plusieurs mécaniques ; **une mécanique ne peut jamais changer de forme**.

### La couleur dit l'INTENTION

| couleur | sens |
|---|---|
| **rouge** | ça tue — jamais autre chose |
| **jaune** | ça pousse ou entrave, ça ne tue pas |
| **bleu** | zone sûre, ou zone à occuper |
| **blanc** | **invulnérabilité du boss** — réservé au palier (lot A) |
| **violet** | mécanique **collective** : rater engage l'équipe |

Le violet est le plus important : c'est le seul qui dit « ce n'est pas ton
problème, c'est notre problème ». Il se branche directement sur `minPlayers` —
**toute mécanique dont `minPlayers >= 2` est violette**, la règle s'applique
toute seule sur les données existantes.

### Le temps dit l'URGENCE

Trois durées, jamais entre les deux. Les constantes actuelles sont dispersées de
0,4 s (`PUDDLE_WARN`) à 6,0 s (`SEAL_WARN`) sans logique lisible.

| classe | durée | usage |
|---|---|---|
| **réflexe** | 0,8 s | cauchemar seulement, sur une mécanique déjà vue |
| **standard** | 1,6 s | le défaut |
| **lecture** | 2,4 s | apprentissage, ou mécanique superposée |
| **préparation** | 4,0 s | mécanique collective : il faut le temps de se coordonner |

Les `*_WARN` existants se rangent dans ces quatre classes. `SEAL_WARN: 6.0`
descend à 4,0 ; `PUDDLE_WARN: 0.4` est trop court pour être un télégraphe — c'est
un effet, pas un avertissement, à traiter comme tel.

Le **remplissage progressif du télégraphe est le compte à rebours**. Pas de
chiffre, pas de barre séparée.

## B-2 · Les annonces — cinq canaux hiérarchisés

Le champ `level` existe déjà (`ALERT_ORDER`, `ALERT_WARN`, `ALERT_INFO`) et c'est
la bonne base. Ce qui manque, c'est la hiérarchie des **canaux**.

**1 · Le télégraphe au sol** — porte 80 % de l'information.

**2 · Le marqueur sur le joueur** — uniquement quand la mécanique le cible
*lui*. C'est le seul moment où quelqu'un doit savoir que c'est son tour.

**3 · Le son de famille** — un son par **famille** (regroupement, dispersion,
tour, regard, balayage), pas par mécanique. On reconnaît le type sans lever les
yeux. **Redondant, jamais nécessaire.**

**4 · Le texte** — deux mots, impératif, **au centre du regard**. Les textes
actuels sont trop longs : « le nombre inscrit doit être exact », « la jauge ne
descend que si les tours sont tenues ». Personne ne lit ça en combat.

> Chaque mécanique a **deux** textes : un **impératif court** affiché en combat
> (« OCCUPEZ LES TOURS »), et une **explication** réservée à la première
> rencontre et au journal.

C'est la correction la plus rentable du lot : les textes actuels sont de bonnes
*explications* utilisées comme *ordres*.

**5 · Le nom de la mécanique** — discret, en bas. Sert à en parler entre
joueurs, pas à réagir.

## B-3 · Accessibilité — rien d'exclusivement sonore

Règle absolue. Le cas critique est le **Métronome**, dont l'information est
temporelle par nature.

**Métronome visuel, en trois couches redondantes :**

- **quatre témoins** sous la barre de vie, allumés 1-2-3-4 ; le quatrième vire au
  rouge avant la frappe ;
- **un anneau** autour du boss qui se contracte à chaque temps et claque au
  quatrième ;
- **le sol** pulse faiblement sur le tempo.

Un joueur sans son doit pouvoir tout résoudre. L'audio n'accélère que la lecture.

## B-4 · Le shader de télégraphes

Disque, anneau, cône, ligne, damier sont des **fonctions de distance signée** :
quelques lignes de fragment shader, nets à toute taille, bordure animée et
remplissage progressif intégrés. Un quad plein écran, un programme, **coût
constant quel que soit le nombre de télégraphes**.

En canvas 2D ils sont flous et coûteux — et avec 31 mécaniques dont certaines
superposées, le nombre de télégraphes simultanés est le pire cas du rendu.
C'est **la** technique du chantier.

## Critères d'acceptation

1. Un joueur qui a fait **trois manches** réagit correctement à une mécanique
   qu'il n'a jamais vue, uniquement sur la forme et la couleur.
2. Aucune mécanique n'utilise une forme pour un sens différent d'une autre.
3. Toute mécanique `minPlayers >= 2` est violette, sans exception.
4. **Le Métronome est intégralement jouable son coupé.**
5. Aucun texte de combat ne dépasse **quatre mots**.
