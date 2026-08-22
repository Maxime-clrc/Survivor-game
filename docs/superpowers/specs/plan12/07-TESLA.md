# Survivor LAN — la refonte du tesla

Une arme qui atteint la référence sans exiger de visée n'est pas une arme
alternative, c'est l'arme optimale. `sansVisee` était l'idée du plan 11 ;
**l'idée était mauvaise** — pas parce qu'elle déséquilibre, parce qu'elle retire
le geste que le jeu demande.

Le reste tient debout : les arcs, les rebonds, le 0 % de crit, la conversion
boss. C'est la **délivrance** qui change, pas l'identité.

Ce chantier vient en dernier parce qu'il consomme les trois précédents : il a
besoin des cristaux atteignables (**04**), des coefficients corrigés (**12d**),
et surtout des chiffres que la campagne de mesure du modèle d'équilibrage
(**06-EQUILIBRAGE**) est la seule à pouvoir produire.

---

## 05 — Tesla

### Le constat, en trois mesures

| ce qui est écrit | ce que ça donne |
|---|---|
| `sansVisee: true`, portée `0.7` | acquisition automatique à **34 m**, sans viser |
| `TESLA_REBONDS: 2`, perte 28 % | **3 cibles** touchées à chaque tir, dès le premier |
| 10 dégâts / 0,30 s | 33 DPS mono → **~74 DPS en horde**, soit la référence |

Une arme qui atteint la référence sans exiger de visée n'est pas une arme
alternative, c'est l'arme optimale. Le plan 11 l'assumait (« la plus différente
à jouer »), mais il l'a payée du seul geste que le jeu demande.

`sansVisee` était l'idée. **L'idée était mauvaise** — pas parce qu'elle
déséquilibre, parce qu'elle **retire le jeu**. Le reste du plan tient debout :
les arcs, les rebonds, le 0 % de crit, la conversion boss. C'est la
**délivrance** qui doit changer, pas l'identité.

### La refonte

**Le tesla se vise.** Le tir part droit devant, au réticule, comme toute autre
arme. Ce qu'il fait de particulier, c'est ce qui arrive **quand il arrive**.

```
1. le tir part en ligne droite, dans l'axe du réticule
2. il s'accroche au premier corps rencontré — avec une tolérance latérale
   généreuse (TESLA_ACCROCHE, ~40 px), parce que le tesla est l'arme qui
   pardonne la visée, pas celle qui s'en passe
3. à l'impact, l'arc se disperse : rebonds successifs vers les corps les plus
   proches, avec la perte par saut, exactement comme aujourd'hui
4. rien à portée dans l'axe : le tir se perd. Un tir raté est un tir raté.
```

Le point 4 est le cœur du correctif. Aujourd'hui un tir tesla ne peut pas
rater. Après, il peut.

### Les constantes

```js
// armes.js
TESLA_REBONDS: 1,        // 2 -> 1 : le deuxieme rebond s'achete (voir 07)
TESLA_PERTE: 0.30,
TESLA_SAUT: 220,         // 260 -> 220 : la dispersion est locale, pas globale
TESLA_ACCROCHE: 40,      // tolerance laterale du trait, en px
```

et dans la table `ARMES` :

```js
{ id: "tesla", nom: "Tesla", tir: "arc", axe: "visee",
  interval: 0.30, degats: 10, portee: 0.85,
  rebonds: true, critBase: 0,          // sansVisee: SUPPRIME
  resume: "un trait qui se disperse en arcs sur les corps voisins",
  contrainte: "aucun coup critique, et chaque saut perd 30 %",
  ech: ECH(0.7, 1.2, 0.5, 1.2, 0.0, 0.2) }
```

`portee: 0.85` et non 0,7 : 34 m était énorme **parce que l'arme visait
seule**. Une arme qu'on vise a le droit à sa portée — 41 m reste sous le tir
standard.

### Ce qui change dans `_teslaTir`

L'acquisition par « le corps le plus proche du joueur » est remplacée par « le
premier corps sur le segment ». Le reste de la fonction — rebonds, perte,
`_effetArc`, `teslaEntrave`, `teslaRetour`, conversion boss — ne bouge pas.
`_segmentHits` fait déjà exactement la projection nécessaire ; en extraire le
test de distance au segment plutôt que le réécrire.

**Attention** : `_bot()` (`game_state.js:8775` et suivantes) et le simulateur de
mesure supposent que le tesla n'a pas besoin de viser. Les deux doivent viser
comme pour toute autre arme après ce chantier, sinon les campagnes de mesure
mentiront sur la seule arme qu'on vient de changer.

### L'effet visuel

Il ne change pas — c'est ce qui plaisait, et rien dans la refonte ne l'entame.
Ajouter une seule chose : le **trait d'amorce**, du joueur au premier corps
touché, distinct visuellement des arcs de dispersion. Sans lui, le joueur ne
voit pas qu'il vise, et l'arme continue de se lire comme automatique.

### Le critère

Viser à côté d'un groupe : aucun dégât. Viser le groupe : le premier corps
prend le plein, les voisins prennent la dispersion. Un joueur qui regarde
l'écran doit pouvoir dire, sans lire le code, **où il devait pointer**.
