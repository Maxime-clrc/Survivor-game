# Lot M — Nouveaux types d'ennemis

Indépendant des autres lots, peut avancer en parallèle. Trois types, comme
validé par l'équipe.

---

## M1. Le principe retenu

Les cinq types existants (grunt, runner, tank, shooter, brood) se distinguent
par des statistiques — PV, vitesse, dégâts. Aucun ne change ce que le joueur
doit **décider**. Les trois nouveaux types ont chacun un comportement qui
impose une priorité de ciblage ou une adaptation tactique, pas seulement un
profil de statistiques différent.

---

## M2. Le soigneur ennemi

Le plus important des trois : c'est le seul qui force explicitement une
priorité de cible, ce qu'aucun ennemi actuel ne demande.

### Comportement

- Reste en retrait du groupe, à distance de sécurité du joueur le plus proche
  (même logique de `standoff` que le shooter).
- Émet un lien visuel vers l'ennemi allié le plus proche non plein PV et le
  soigne à intervalle régulier tant que le lien est maintenu.
- **Rompt son soin s'il est visé directement** pendant plus d'une seconde
  (détection par les impacts reçus), l'obligeant à fuir plutôt que de soigner
  en continu — évite qu'il devienne un mur invincible qui régénère tout seul
  indéfiniment.

### Statistiques de départ

```
key: "medic"
from: 130 s              // apparait a partir de ce palier
weight: 0.28
hpMul: 0.9
speed: 68
dmg: 10                  // faible au contact, il est concu pour fuir
r: 13
heal: 6                  // PV rendus par tic a la cible liee
healInterval: 1.2
```

### Signature visuelle

Cohérente avec la palette déjà en place (couleur froide, différenciée des
teintes chaudes/menaçantes des autres types) : un vert médical distinct de
toute autre couleur du jeu, avec le lien de soin rendu comme un filet
lumineux entre lui et sa cible — c'est ce filet, visible même dans la
mêlée, qui permet au joueur de le repérer et de couper le soin en priorité.

---

## M3. Le porte-bouclier

### Comportement

- Porte un bouclier frontal orienté vers sa cible, qui **bloque les
  projectiles joueurs venant de face** (absorption totale dans un cône
  d'environ 100° face à lui).
- Le bouclier ne protège pas les flancs ni l'arrière : un tir venant de côté ou
  de dos touche normalement.
- S'oriente pour garder son bouclier face au joueur qu'il poursuit, avec une
  vitesse de rotation limitée — un joueur qui se déplace latéralement peut
  donc gagner l'angle avant qu'il ne réoriente son bouclier.

### Statistiques de départ

```
key: "bulwark"
from: 100 s
weight: 0.30
hpMul: 2.2
speed: 58
dmg: 22
r: 15
shieldArc: 100            // degres du cone protege
shieldTurnRate: 2.4        // radians/s de reorientation
```

### Signature visuelle

Le bouclier est rendu comme une plaque distincte devant le corps, avec un
éclat visuel bref quand il absorbe un tir — sans ce retour, le joueur ne
comprendrait pas pourquoi ses tirs frontaux n'infligent aucun dégât.

---

## M4. Le kamikaze

### Comportement

- Fonce en ligne droite vers sa cible, plus rapide que le grunt de base.
- **Explose à la mort**, quelle que soit la cause du décès (tir, zone, contact),
  dans un rayon fixe, infligeant des dégâts à tous les joueurs et alliés
  ennemis dans la zone.
- L'explosion a un très bref délai de préavis visuel (0,15 s) au moment où ses
  PV tombent à zéro, pour laisser une chance de sortie sans rendre
  l'explosion totalement anticipable — cohérent avec le principe déjà établi
  que les zones dangereuses doivent se lire avant de frapper, mais ici le
  délai est volontairement court puisqu'il s'agit d'un ennemi normal et non
  d'une mécanique de boss.

Ce type punit spécifiquement le corps-à-corps et rend les cartes de dégâts de
zone du joueur (nova, onde de mort) risquées à utiliser à bout portant contre
lui — une tension qui n'existe pas aujourd'hui.

### Statistiques de départ

```
key: "kamikaze"
from: 70 s
weight: 0.22
hpMul: 0.5
speed: 118
dmg: 8                   // faible au contact direct, le vrai danger est l'explosion
r: 10
blastRadius: 90
blastDamage: 45
blastDelay: 0.15
```

### Signature visuelle

Pulsation croissante à mesure que ses PV descendent — un indice progressif de
danger, cohérent avec le principe de télégraphe déjà appliqué au brood
(gonflement avant scission).

---

## M5. Quotas et intégration au tirage

Comme pour les cinq types existants, chaque nouveau type doit avoir un quota
`share` dans le tirage pondéré, pour éviter qu'il ne sature les vagues (défaut
déjà rencontré et corrigé pour le shooter par le passé).

```
medic:    share 0.12
bulwark:  share 0.16
kamikaze: share 0.18
```

Le soigneur ennemi doit rester rare relativement aux autres — c'est un
multiplicateur de menace pour le reste de la horde, pas un ennemi qu'on veut
voir en nombre.

---

## M6. Interaction avec les vagues spéciales (lot L)

Aucun des trois nouveaux types n'est inclus dans les compositions
`nuee`/`siege`/`chasse`/`croise` par défaut — ces vagues restent définies sur
les cinq types existants pour cette itération, sauf décision contraire du
porteur du projet. Une vague spéciale future centrée sur les nouveaux types
(par exemple une vague « Renfort » faite uniquement de soigneurs et de leurs
protégés) est une extension naturelle mais hors du périmètre validé ici.

---

## M7. Mesures

| mesure | attendu |
|---|---|
| taux de survie d'un soigneur ennemi une fois repéré | doit chuter nettement une fois ciblé en priorité, sinon le lien de soin est trop généreux |
| taux de traversée du bouclier par tir de flanc | proche de 100 %, sinon l'angle protégé est mal calé |
| taux de dégâts subis par corps-à-corps à cause du kamikaze | mesurable, sert à calibrer le rayon d'explosion |

## M8. Critères d'acceptation

- Le soigneur ennemi cesse de soigner dès qu'il subit des dégâts directs
  pendant plus d'une seconde.
- Le bouclier du porte-bouclier ne protège jamais un angle supérieur à celui
  défini par `shieldArc`.
- L'explosion du kamikaze se déclenche quelle que soit la source de sa mort,
  y compris les dégâts de zone et de brûlure.
- Les trois nouveaux types respectent leur quota de tirage et n'écrasent pas
  la composition des vagues normales.
