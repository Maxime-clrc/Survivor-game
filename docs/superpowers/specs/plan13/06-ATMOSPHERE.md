# Survivor LAN — l'atmosphère

**Le lot 5.** Le monde ne doit pas sembler mort quand le joueur s'arrête.

C'est le lot le moins cher du plan : la mécanique existe déjà, entièrement, et
elle est bonne.

---

## Ce qui existe

`champ()` (`decor.js:186-260`) — un champ de particules **sans particules** :

> la position d'un brin est une fonction de son indice et du temps, donc rien ne
> s'alloue, rien ne se garde entre deux images, et deux clients voient la même
> chose. **Un seul `stroke` pour tout le champ.**

Il est ancré au **monde**, pas à la caméra : sans ça le champ glisse avec le
joueur et paraît accroché à lui. Il couvre un disque, ce qui lui permet de
tourner avec le vent sans trou aux coins.

Il sert deux météos. Il peut en servir six de plus pour le prix d'un appel.

---

## Ce qu'on en tire

| effet | paramètres | où |
|---|---|---|
| **poussière en suspension** | brins très courts, lents, dérive quasi nulle, gris froid | partout, densité faible |
| **vapeur** | brins courts qui **montent**, opacité qui décroît en hauteur | ancrée sur un prop ou un danger |
| **étincelles** | brins très courts, rapides, ambre, durée de vie courte | ancrées sur un prop défectueux |
| **braise flottante** | rares, lentes, ambre faible, dérive latérale | Fonderie et Friche |

Les trois derniers sont **ancrés à un point** au lieu de couvrir la vue : c'est
une variante de `champ()` où le centre du disque n'est plus la caméra mais la
source. Un paramètre de plus, pas une seconde fonction.

**Un champ ancré est ce qui fait qu'un prop existe.** Un coffret qui grésille est
du décor ; un coffret qui grésille **et** crache trois étincelles par seconde
**et** éclaire faiblement son pourtour est un objet. Les trois canaux sont déjà
écrits après les lots 3 et 4 — celui-ci ferme le troisième.

---

## Le premier plan

Une seule couche, très légère, sur `#cv` (le canvas du dessus), après le
vignettage.

Ce qu'elle porte : quelques éléments hors du plan de jeu — une poutre en haut
d'écran, un câble qui traverse un coin, de la poussière proche et floue. Ils se
déplacent avec une **parallaxe très faible** (0,03 à 0,08 de la caméra) : assez
pour donner la profondeur, trop peu pour attirer l'œil.

Trois règles, sans exception :

1. **Rien au centre.** Le premier plan vit dans les coins et sur les bords. Le
   centre appartient au joueur.
2. **Jamais opaque.** Il ne masque rien, il assombrit un peu.
3. **Coupé pendant un boss.** L'arène se resserre déjà à une vue
   (`state.bounds`) ; y ajouter du bord serait le contraire de ce que le
   resserrement cherche.

Palier : `high` et au-dessus.

---

## Les budgets

Le §11 du brief le demande explicitement : *tout doit rester discret*. Deux
chiffres tiennent la promesse :

- **Un champ = un `stroke`.** Six champs à l'écran = six appels de tracé. Le
  champ de vent actuel monte à 220 brins pour ~85 visibles ; les nouveaux sont
  plus petits.
- **Aucune allocation par image.** C'est la propriété qui fait que ce lot ne
  peut pas dériver : si un effet a besoin d'un tableau qui persiste, il n'est pas
  dans ce lot — il est dans `fx.js`, avec les particules, sous `PARTICLE_MAX`.

---

## Ce qu'on ne fait pas

- **Pas de pluie.** Friche est intérieure-abandonnée, pas extérieure. Une météo
  de pluie demanderait des flaques réactives, des reflets, un son — c'est un lot
  entier, pas une ligne d'atmosphère.
- **Pas de brouillard volumétrique.** `voileBrume()` occupe déjà ce canal, et il
  est un **champ de vision**, pas une teinte. Deux brumes se contrediraient.

---

## Critères de sortie

1. À l'arrêt, quelque chose bouge à l'écran, et on ne sait pas dire quoi
   immédiatement.
2. En mouvement, on ne le remarque pas.
3. Aucune allocation par image dans le lot — vérifiable au profileur mémoire.
4. Pendant un boss, le premier plan est coupé.
