# Lot J — traits, élites, bonus au sol

**Le lot sans lequel A et C retirent de la difficulté sans rien remettre.**

Les lots A et C disent tous les deux que la difficulté retirée aux PV repart sur
« les traits et le roster ». C'est la bonne doctrine — mais elle n'a jamais été
vérifiée. Le lot J est cette vérification.

## Constat 1 — les plafonds de traits sont calibrés pour 200 ennemis

`TRAIT_CFG` est soigneusement réglé, et ses commentaires disent explicitement sur
quelle hypothèse :

> `TRAIL_MAX: 18` — *« deux cents ennemis à traînée sont un cas bien plus dense
> qu'un combat de boss »*

Le lot A porte le plafond à **622** en normal à quatre joueurs, et 900 en
cauchemar. Trois conséquences mécaniques :

- **`TRAIL_MAX = 18`** devient négligeable : à 622 porteurs, la traînée cesse
  d'exister en tant que menace, chaque ennemi n'en pose plus jamais ;
- **`DASH`** (`DASH_MUL 2,5`, `DASH_RANGE 420`) devient illisible en masse : le
  préavis de 0,5 s se noie quand cinquante créatures ruent dans la même seconde ;
- **`AURA`** et **`SPORE`** se cumulent spatialement d'une façon qui n'a jamais
  été observée à cette densité.

**Rien de tout ça n'est un défaut aujourd'hui** — c'est une dette que le lot A
crée. Elle doit être payée dans le même chantier, sinon A rend le jeu plus dense
et moins dangereux à la fois.

## Constat 2 — la table des traits n'a jamais été auditée

Six traits (`dash`, `trail`, `volley`, `frenzy`, `spore`, `aura`), attribués par
`traitsOf(diffIndex, type)`. Le plan en fait **son levier principal de
différenciation des modes** et personne n'a écrit :

- combien de types portent un trait, par difficulté ;
- quelle **proportion de la horde** est porteuse, en pratique, minute par minute ;
- si la montée en difficulté entre `normal` et `cauchemar` se joue vraiment là,
  ou si elle repose en fait sur `diff.hp` et `diff.dmg`.

Sans ces trois chiffres, « la difficulté repose sur le comportement » est une
intention, pas un fait.

## Constat 3 — élites et bonus au sol, jamais revus

- **Élites** : `ELITE_HP_MUL`, `ELITE_SPEED_MUL` (0,88), `ELITE_RADIUS_MUL`. Leur
  cadence d'apparition et leur poids dans la pression n'ont pas été mesurés
  depuis que la manche dure 37 minutes. Le lot E-7 ajoute `Curée`, qui **suppose**
  que les élites sont une cible prioritaire — c'est à vérifier.
- **Bonus au sol** : `POWERUP_LIFE = 22 s`, cadence, puissance. C'est un levier
  de clémence direct (et `ASH_LIFE` le divise par deux en cauchemar), donc il
  entre dans la matrice des profils : les bonus sont ce qui sauve un compte neuf.

## Décisions

**Trois re-dérivations, toutes conséquences de A :**

```js
TRAIL_MAX: 18  ->  proportionnel au plafond : Math.round(_enemyCap() * 0.09)
DASH_CD:    6  ->  par difficulté, pour que la fréquence par SECONDE et par
                   ÉCRAN reste comparable à densité variable
```

**Un relevé, avant toute valeur :** proportion de la horde porteuse d'au moins un
trait, par minute et par difficulté. C'est le chiffre qui dit si le levier
« comportement » existe.

**Un garde-fou, sur le modèle de `verifierBiomes()` :** un script qui, à plafond
plein pour chaque difficulté × effectif, vérifie qu'aucun plafond de trait n'est
saturé en permanence — un plafond toujours atteint n'est plus un plafond, c'est
une constante.

## Critères d'acceptation

1. La **part de horde porteuse d'un trait** croît de `calme` à `cauchemar` d'un
   facteur au moins 2. Si ce n'est pas le cas, la différenciation des modes ne
   repose pas sur le comportement et le principe verrouillé n°1 est un vœu.
2. Aucun plafond de trait n'est saturé plus de 50 % du temps.
3. La lisibilité de la ruée est préservée : à plafond plein, jamais plus de 8
   préavis simultanés à l'écran.
4. Une composition sans tank est **mesurablement pénalisée** par au moins un
   trait (renvoi du lot I, critère de composition).
