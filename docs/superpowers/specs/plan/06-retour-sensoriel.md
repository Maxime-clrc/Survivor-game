# Lot 6 — Retour sensoriel

## Objectif

Son, retour d'impact, alertes de mécanique et grammaire de marqueurs. Le jeu
est aujourd'hui muet et sans confirmation d'impact : c'est ce qui donne le plus
l'impression d'un prototype, avant même le contenu.

Ne dépend d'aucun autre lot et ne touche pas `shared/game_state.js`, sauf le
canal d'événements — lequel est de toute façon requis par le lot 4. Peut donc
être fait en premier.

## 1. Le piège commun : sur quelle horloge ?

À trancher avant tout le reste. Le client rend l'image avec **110 ms de retard**
sur le dernier snapshot reçu. Déclencher un son ou un tressaillement à la
réception du snapshot le fait arriver **avant** l'image correspondante — un
dixième de seconde de décalage systématique, largement perceptible sur un impact.

**Tout se déclenche depuis la timeline interpolée, jamais depuis `latest`.**

Concrètement : le client compare deux images interpolées successives et en déduit
les événements — une balle qui disparaît près d'un ennemi, un identifiant
d'ennemi qui s'évanouit, un effet qui apparaît. Rien à ajouter côté serveur pour
l'essentiel, et le son tombe pile sur l'image.

Un module `public/events.js` fait cette diffusion et émet des événements typés
que le son et les particules consomment tous les deux.

## 2. Son

Synthèse WebAudio uniquement, **aucun fichier** : cohérent avec le zéro
dépendance et le zéro build du projet.

### Palette

Chaque son est un oscillateur et une enveloppe, une dizaine de lignes chacun.

| son | recette |
|---|---|
| tir | impulsion carrée très courte, 900 Hz, 25 ms |
| impact sur ennemi | bruit blanc filtré, 40 ms |
| mort d'ennemi | bruit descendant, 120 ms, hauteur variant selon le type |
| ramassage de bonus | deux sinus montants |
| montée de niveau | arpège de trois notes |
| annonce de mécanique | sinus grave à deux temps |
| explosion de zone | bruit filtré passe-bas, 300 ms |
| joueur à terre | glissando descendant |
| réanimation réussie | arpège court montant |
| barre de boss rompue | accord grave + bruit |

### Limitation de voix — obligatoire

À 200 ennemis et une cadence à 0,05 s, il peut y avoir cinquante déclenchements
dans la même image. Sans garde-fou, c'est un mur de bruit et le contexte audio
sature.

```
SOUND_SAME_COOLDOWN: 0.04     // un meme son ne se rejoue pas avant 40 ms
SOUND_MAX_VOICES: 16          // les plus anciennes sont coupees
```

### Hiérarchie de volume

Les annonces de mécanique et l'alerte de boss passent devant tout, les impacts
sont un fond discret. Sinon l'information importante se noie dans le tapis.

```
alerte 1.0 · boss 0.9 · niveau 0.8 · bonus 0.6 · mort 0.4 · impact 0.25 · tir 0.15
```

### Déblocage et réglages

Les navigateurs exigent un geste utilisateur : le clic « Rejoindre » est déjà au
bon endroit, y créer le contexte audio.

Réglage de volume et coupure, mémorisés dans `localStorage` comme le pseudo.

## 3. Retour d'impact

Par ordre de rendement :

**Éclair blanc** sur l'ennemi touché, 60 ms. Le moins cher et le plus efficace :
sans lui, tirer dans la foule ne donne aucune confirmation. Le rendu par sprites
facilite les choses — un second passage en blanc suffit.

**Recul du sprite** de quelques pixels dans l'axe du tir. Trois lignes, et ça
donne du poids.

**Tressaillement d'écran**, uniquement sur les gros événements : explosion de
zone, onde de choc, rupture de barre de boss, bombe. **Jamais sur un impact
ordinaire.** Amplitude 6 à 10 px, décroissance en 200 ms.

> Point d'attention : il faut secouer **le monde et pas l'interface**, sinon le
> HUD tremble et devient illisible. Ça impose de séparer les deux passes de
> rendu, ce qui n'est pas le cas aujourd'hui — c'est le seul vrai travail de
> structure du lot.

**Particules à la mort**, six à huit fragments à la couleur du type, 400 ms,
avec un plafond global (`PARTICLE_MAX: 300`). Quand quarante ennemis meurent
sous une bombe, il faut couper.

**Chiffres de dégâts** — et c'est là qu'il faut se retenir. N'afficher que
**ses propres** dégâts, et uniquement sur le boss. Tout afficher à 200 ennemis
rend l'écran inutilisable, et sur la piétaille l'information n'a aucune valeur.

## 4. Alerte de mécanique

Un bandeau centré haut, 1,5 s, texte court en capitales. Ce n'est pas de
l'assistance : c'est la condition pour que l'Oracle soit compréhensible.
Personne ne devinera « il faut se regrouper » depuis un cercle cyan à la
première rencontre.

### Trois niveaux

| niveau | exemples | rendu |
|---|---|---|
| **consigne** | REGROUPEMENT · DISPERSEZ-VOUS · TOURS · NE VISEZ PAS | cyan, avec compte à rebours |
| **avertissement** | CHARGE · MUR · CONSTRICTION | ambre, court |
| **information** | BARRE BRISÉE · RAVAGEUR II · VAGUE 8 | blanc, sans urgence |

### Canal serveur

```
serveur -> client : { t:"alert", mech, level, dur }
```

Message **ponctuel**, hors du snapshot à 20 Hz. Nouveau registre partagé
« identifiants de mécanique » à déclarer dans `CLAUDE.md` : identifiant,
libellé, niveau, durée.

**Le bandeau apparaît au début de l'annonce, pas à sa résolution, et disparaît
avant l'explosion.** Un texte encore affiché au moment de l'impact masque
exactement ce qu'il faut regarder.

## 5. Grammaire de marqueurs

Ce qui fait fonctionner les marqueurs des MMO n'est pas leur beauté mais leur
**constance** : en comprenant les marqueurs de façon générale, les joueurs
apprennent le langage de conception et l'appliquent à des combats inconnus.
C'est exactement ce qu'il faut pour cinq boss.

**Une couleur dit qui est concerné, une forme dit quoi faire, une animation dit
quand.**

| couleur | signification |
|---|---|
| rouge / ambre | danger — sortir |
| cyan | il faut être dedans — tours, regroupement |
| blanc | ça concerne un allié — soin, réanimation, lien |
| violet | persistant — ça restera là après |

**Règle jamais transgressée : pas de rouge pour quelque chose où il faut
aller.** Une seule exception et les joueurs cessent de faire confiance au code
couleur, donc lisent tout au cas par cas — ce qui est précisément ce qu'on veut
éviter avec 200 ennemis à l'écran.

Distinction absolue entre les deux temps, reprise du lot 5 :
**annonce** = contour animé, remplissage léger, arc de progression ;
**actif** = remplissage dense, contour fixe.

### Marqueurs sur les joueurs

Au-dessus de la barre de vie : cible d'une attaque, à regrouper, à écarter, lié,
état actif. **Glyphes distincts en silhouette, jamais différenciés par la seule
couleur** — un daltonien doit s'en sortir, et de toute façon la couleur sera
noyée dans le chaos.

## 6. Direction artistique

Le jeu a déjà une identité, même non voulue : fond ardoise, grille technique,
police à chasse fixe, formes nettes. C'est cohérent et ça se lit bien.

**Ne pas repartir de zéro.** La voie recommandée est d'assumer le registre
technique : grille qui réagit aux impacts, télégraphes en tracés
d'oscilloscope, monstres traités comme des signaux. La lisibilité est déjà
acquise, on ne fait que la styliser.

L'alternative organique (fond de chair, zones-sécrétions, en cohérence avec les
mandibules et sacs à œufs des sprites) est plus mémorable mais fait perdre la
lisibilité que la grille apporte gratuitement, pour beaucoup plus de travail.

## 7. Modifications par fichier

### `public/audio.js` (nouveau)

Contexte, palette, limitation de voix, hiérarchie de volume, réglages.

### `public/events.js` (nouveau)

Diffusion des snapshots interpolés en événements typés, consommés par l'audio
et les particules.

### `public/client.js`

- Séparation des passes de rendu monde / interface (prérequis du tressaillement).
- Éclair blanc, recul, particules, chiffres de dégâts sur le boss.
- Bandeau d'alerte à trois niveaux.
- Application de la grammaire de couleurs à toutes les zones existantes.

### `server.js`

Canal `alert`, émis au lancement de chaque mécanique.

## 8. Mesures à relever

| mesure | attendu |
|---|---|
| voix simultanées, pire cas | plafonnées à 16, aucune saturation audible |
| images par seconde avec 300 particules et 200 ennemis | pas de chute sous 60 |
| décalage son / image sur un impact | imperceptible (moins de 30 ms) |

## 9. Critères d'acceptation

- Le HUD ne tremble jamais pendant un tressaillement d'écran.
- Aucun son ne se déclenche avant l'image correspondante.
- Le bandeau d'alerte a disparu au moment où la mécanique se résout.
- Le son peut être coupé, et le réglage survit à un rechargement.
- Aucune zone où il faut aller n'est rouge.
