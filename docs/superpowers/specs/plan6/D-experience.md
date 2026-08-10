# Lot D — l'expérience indexée sur la minute

**Dépend de C** : le TTK pilote le débit de kills, donc le débit d'XP.

## Constat chiffré

Courbe actuelle (`BASE = 200`, `GROWTH = 1,18`, `XP_LEVEL_GROWTH = 1,09`) :

| niveau | coût du palier | coût en XP **brute** (÷ courbe de valeur) |
|---|---|---|
| 2 | 200 | 200 |
| 5 | 328 | 253 |
| 10 | 750 | 376 |
| 15 | 1 716 | 560 |
| 20 | 3 927 | 833 |
| 25 | 8 983 | 1 238 |
| 30 | 20 551 | 1 840 |

Le coût réel en valeur brute d'ennemis fait **×9,2** sur la manche pendant que
le débit de kills plafonne à la minute 5-10. D'où le rythme vécu : un niveau par
minute sur les neuf premières, puis un affaissement.

**Mais le défaut de fond est dans l'indexation, pas dans les coefficients.**
`XP_LEVEL_GROWTH` fait dépendre la valeur d'un kill du niveau d'équipe,
c'est-à-dire de **la sortie de la jauge que cette valeur alimente**. La boucle
est amortie (1,09 < 1,18) donc elle ne diverge pas, mais elle est **non
mesurable** — et c'est ce qui explique l'écart-type de six cartes d'une manche à
l'autre à réglage identique, que le lot X constatait sans pouvoir l'expliquer.

C'est exactement ce que D2 a banni pour les PV et le débit.

## Décision

La valeur d'un kill s'indexe sur la **minute de horde écoulée** : axe fixe,
extérieur à la boucle, identique pour toutes les équipes.

```js
XP_LEVEL_GROWTH: 1.0,      // neutralisé — la clé reste, elle documente
XP_MINUTE_GROWTH: 1.055,   // ×5,0 sur 30 minutes de horde
```

```js
_xpTimeMul() {                       // renommé depuis _xpLevelMul
  return Math.pow(CFG.XP_MINUTE_GROWTH, this.hordeMinutes());
}
```

**Le renommage fait partie du lot.** Deux points d'appel seulement (le kill et
le boss), donc sans risque — et laisser un nom qui dit « level » sur une courbe
qui lit l'horloge est le genre de dette qui fait rouvrir la décision dans six
mois.

**Garde-fou remplaçant l'ancien** (« ne pas monter au-dessus de `GROWTH` ») :
`XP_MINUTE_GROWTH` doit rester strictement sous le rapport de `LEVEL_XP_GROWTH`
à la croissance du débit de kills. Si la valeur d'un kill croît plus vite que le
coût d'un palier une fois le débit pris en compte, les paliers tardifs deviennent
plus rapides que les premiers et la progression n'a plus de fin.

## Trois propriétés qui tombent sans code supplémentaire

- la courbe redevient **déterministe** et balayable en script : `LEVEL_XP_BASE`
  se règle par mesure au lieu de se mesurer par tâtonnement ;
- deux équipes de niveaux différents à la minute 20 gagnent **au même rythme** :
  une table en retard rattrape au lieu de décrocher — exactement la propriété
  qu'on est allé chercher en quittant l'horloge des vagues ;
- un ennemi laissé en vie ne devient toujours pas un placement financier : la
  valeur suit l'horloge, pas la cible.

## Forme cible

Le total (26-27 niveaux) est bon et ne change pas — Halls of Torment tourne
autour de 30 à 40 améliorations sur 30 minutes. C'est la **répartition** qu'on
redresse.

| tranche | aujourd'hui | cible |
|---|---|---|
| minutes 0-8 | niveaux 1 → 10 | 1 → 10 |
| minutes 8-20 | 10 → 18 | 10 → 20 |
| minutes 20-32 | 18 → 24 | 20 → 27 |

Le début ne bouge pas : il est bon, et c'est lui qui dit au joueur que la
progression existe. C'est la traîne qu'on relève.

## Critères d'acceptation

1. **Écart-type du nombre de cartes par manche sous 3** (aujourd'hui 6). C'est le
   vrai critère du lot : si l'indexation par le temps ne resserre pas la
   dispersion, l'hypothèse était fausse.
2. Répartition conforme au tableau, à ±1 niveau par tranche.
3. Parité d'effectif conservée (portée par le lot A — ce lot ne doit pas la casser).
