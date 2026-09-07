# 05 · Un seul indicateur d'allié hors écran

## Le constat

Il y en a **deux**, et les deux tournent à chaque image.

### La version canvas

`drawAllyArrows(v.playerList)` (`public/render/world.js:580`), appelée par
`drawScreen` ligne 538, en fin de pile de rendu. Triangle projeté sur le bord de
la vue à `ARROW_MARGIN = 34`, orienté par `atan2`, à la couleur du joueur
(`colorOf`), avec la distance en mètres via `fmtM`, et une pulsation quand
l'allié est à terre (`0,45 + 0,4·sin(t/160)`).

### La version DOM

`updateMarks(v, c)` (`public/hud.js:418`), appelée par `updateHud` ligne 1267.
Éléments `.mark` dans `#hudMarks`, style dans `hud.css:1268` sous le titre
« LES CHEVRONS HORS ECRAN ». Marge propre (`MARK_MARGE`), projection propre, et un
vocabulaire d'état plus riche : la **forme** change avant la couleur, et le
chevron écrit « à terre » **à la place** de la distance.

Son commentaire porte deux décisions payées :

> un cercle laisse les quatre coins vides et fait glisser le chevron

> le chevron garde la couleur du joueur, toujours : c'est une DIRECTION, et la
> charte interdit le rouge pour ce vers quoi il faut aller

**Un allié hors écran reçoit donc deux indicateurs superposés, à deux marges
différentes.** L'une des deux est très probablement le vestige d'un remplacement
dont la suppression a été oubliée — exactement le genre de code mort que
`CLAUDE.md` dit de traquer au `grep`.

## La décision

**On garde la version DOM. `drawAllyArrows` est supprimée.**

Trois raisons :

- **le vocabulaire d'état est plus riche** — la forme avant la couleur, « à terre »
  au lieu d'une distance. C'est la version qui a été pensée ;
- **son commentaire décrit une conception**, avec deux défauts déjà payés et
  documentés. Le commentaire de la version canvas décrit une implémentation ;
- **c'est du DOM**, donc le clignotement du ping se pilotera par une classe CSS
  et une transition, sans toucher à la boucle de rendu ni au budget d'image.

## Pourquoi ce lot est ici et pas dans le plan du ping

Le ping fait clignoter **l'indicateur du joueur émetteur**. Avec deux couches
superposées, il ferait clignoter l'une et pas l'autre, et ça se verrait
immédiatement.

Résoudre le doublon d'abord évite d'écrire le ping deux fois — ou pire, de
l'écrire sur la mauvaise couche.

## Ce qu'il faut vérifier avant de supprimer

Les deux versions ne font pas exactement la même chose. Avant de retirer la
canvas, s'assurer que la DOM couvre tout ce qu'elle portait :

- la **distance en mètres**, via `fmtM` de `shared/units.js` — c'est le **seul**
  point de conversion pour un texte destiné au joueur (`PX_PER_M = 20`). Un
  indicateur qui écrirait « 1740 » au lieu de « 87 m » violerait la règle ;
- la **pulsation à terre**. La DOM change la forme et le mot ; si elle ne pulse
  pas, c'est un signal perdu et il faut l'ajouter — un allié à terre hors écran
  est l'information la plus urgente que ce système transporte ;
- le **cas du joueur qui quitte le salon** — `ownerColorOf` le gère déjà côté
  couleur ; vérifier que le chevron disparaît proprement.

## Le contexte qui rend ce système gratuit

Dans `snapshot(vue)`, tout est filtré par la vue — ennemis, balles, tirs,
zones — **sauf les joueurs** :

```js
p: [...this.players.values()].map(p => [ p.id, r1(p.x), r1(p.y), ... ]),
```

La liste `p` est **complète, toujours**, avec position, PV, bouclier, état à
terre, classe et couleur. Les chevrons ne demandent **aucun champ réseau, sur
aucune taille de map** — y compris sur l'arène cible. C'est du rendu pur.

## Critère d'acceptation

1. **Un seul indicateur par allié hors écran.** Le test est visuel et il est
   suffisant : deux joueurs, l'un sort du champ, on compte les chevrons.
2. **Rien ne régresse sur les trois signaux** : direction, distance en mètres,
   état à terre.
3. `grep -rn "drawAllyArrows\|ARROW_MARGIN" public/` ne rend plus rien.
4. Le budget d'image ne bouge pas — la suppression d'un appel canvas ne peut que
   le baisser, mais le relevé de `?banc` sert de contrôle.

## Ce que ce lot ne fait pas

**Il ne livre pas le ping.** Le message `ping`, la classe `.pingue`, la durée du
clignotement et le son appartiennent au plan qui portera les sons — parce que le
son du ping doit être composé **avec les six autres**, en une fois, et pas seul.

## Nature de la tâche

Suppression d'un chemin mort après vérification d'équivalence. Le relevé
d'équivalence se délègue ; la suppression et le contrôle des trois signaux se
font au fil principal, parce que « les deux font pareil » est précisément le genre
d'affirmation qu'il faut vérifier soi-même.
