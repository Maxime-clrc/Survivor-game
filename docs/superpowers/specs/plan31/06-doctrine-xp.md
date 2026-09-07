# 06 · La doctrine de l'XP, écrite

**Ce lot n'écrit aucune ligne de code.** Il inscrit dans
`docs/regles/SIMULATION.md` une règle qui a été décidée, et qui contraint tous les
plans suivants. Elle est beaucoup plus facile à tenir qu'à réparer.

## Le fait

```js
_addXp(amount) {
  this.xp += amount / Math.pow(Math.max(1, this.players.size), CFG.XP_CROWD_EXP);
  while (this.level < CFG.LEVEL_MAX && this.xp >= this.levelAt) { ... }
}
```

`this.xp`, `this.level`, `this.levelFrom`, `this.levelAt`, `this.levelStep` : **un
seul compteur pour toute la salle**. Le snapshot le confirme — `this.level` est
écrit sur la ligne de chaque joueur, la même valeur pour tous.

Ce qui est individuel : le **choix** de carte (`cardOffers` est une `Map` par
identifiant), les éclats (`p.eclats`), les reliques, la classe, l'arme.

Ce qui est collectif : le niveau, donc la **cadence** à laquelle les choix
arrivent.

## La décision, et pourquoi

**L'XP reste une grandeur d'équipe.** Les deux alternatives ont été écartées :

- l'XP individuelle demanderait de refaire `_addXp`, la courbe entière,
  `XP_CROWD_EXP`, le rythme des cartes, le rythme du marchand, `_teamPower()` et
  la calibration des six boss — c'est-à-dire de refaire le plan 30 **avant qu'il
  soit fini** ;
- garder l'XP d'équipe **sans rien d'autre** annulerait l'arbitrage central du
  brainstorm : si un joueur reste farmer pendant qu'un autre part chercher un
  contrat, les deux montent au même niveau à la même seconde. L'explorateur ne
  renonce à rien.

**Ce qui rend l'arbitrage réel** : les objectifs paient dans une autre monnaie.

> Le niveau est l'axe de progression **d'équipe**. Les éclats et le loot de run
> sont les axes **individuels**. Partir, c'est échanger de la cadence de cartes
> contre de la puissance immédiate.

## La règle à inscrire

Trois lignes dans `docs/regles/SIMULATION.md`, pas trois pages :

> - l'XP et le niveau sont des grandeurs de **salle** ; la carte, les éclats, les
>   reliques et le loot de run sont des grandeurs de **joueur** ;
> - `_addXp` a **deux** appelants, et la liste est **fermée** :
>   `_killEnemy()` pour la horde, et `_damage()` pour le boss — qui crédite
>   **au prorata des dégâts infligés** sur ses PV max, pas à la mort ;
> - toute récompense d'objectif se verse en éclats ou en loot, **jamais en XP**,
>   parce que l'XP est le seul canal qui ne peut pas distinguer qui a pris le
>   risque.

## Deux relevés faits en écrivant ce lot, et ils corrigent le document de décisions

**1 · `_addXp` a DEUX appelants, pas trois.**

```
shared/game_state.js:3019   dans _damage(), si la cible est le boss
shared/game_state.js:8589   dans _killEnemy()
```

Le document de décisions annonçait « `_killEnemy`, `_killBoss`, `_eventReward` ».
`_killBoss` n'appelle pas `_addXp` : **le boss paie au prorata des dégâts**, dans
`_damage()`, à chaque coup —
`part = min(amount, max(0, hp)) / maxHp`, puis `part × BOSS_XP_BASE × _xpTimeMul()`.
C'est une décision de conception qui n'était écrite nulle part : on est payé pour
avoir tapé, pas pour avoir achevé, donc un joueur qui meurt à 5 % des PV du boss a
déjà touché 95 % de son XP.

**2 · `_eventReward()` ne verse AUCUNE XP.** Il rend les PV, remonte le bouclier
au niveau de `shieldPool` et relève les joueurs à terre. Rien d'autre.

**La règle « les objectifs ne paient jamais en XP » est donc déjà respectée
aujourd'hui.** Ce lot ne change rien, il **préserve** — et c'est un argument plus
fort que celui du document : on n'introduit pas une contrainte, on écrit une
propriété que le code a déjà et qu'un futur lot pourrait casser sans le savoir.

## Le point à surveiller, et il est déjà dans le code

`TL_CFG.QUARRY_XP_WORTH = 40`. La proie de `EV_CHASSE` vaut aujourd'hui quarante
fois un corps ordinaire, **en XP**.

Quand elle deviendra un mini-boss porteur de récompense, cette valeur se
**convertit** en éclats et en loot. Elle ne s'y ajoute pas. Sans cette phrase
écrite quelque part, la conversion sera oubliée et le mini-boss versera les deux.

## Pourquoi c'est un lot et pas une note

Parce qu'un plan qui ne produit pas d'artefact ne se vérifie pas, et qu'une
décision qui ne vit que dans un document de brainstorm sera perdue au troisième
plan.

`docs/regles/SIMULATION.md` est le bon endroit : c'est là que vivent les règles
que la simulation doit tenir, et c'est ce qu'un futur lot relira avant de toucher
à une récompense.

## Deux autres choses à inscrire au même endroit, tant qu'on y est

Elles ont été décidées et elles n'ont pas d'autre porte d'entrée :

**Sur la graine** (lot 02) :

> Une graine identique donne le **même contenu** — même terrain, même composition
> de horde, mêmes instants d'élite, mêmes attaques de boss. Elle ne donne jamais
> le **même résultat** : les entrées des joueurs restent des entrées.

**Sur le recyclage et les retraits** (lot 04, et tout ce qui suivra) :

> `_killEnemy()` est le point de passage unique de toute **mort** d'ennemi : XP,
> cumuls, hauts faits, butin. Un corps qui **part** — recyclé au loin, mini-boss
> qui se retire — n'y passe pas. Retirer n'est pas tuer.

Cette dernière vaudra pour le recyclage lointain, pour les deux retraits du
mini-boss, et pour tout ce qui quittera la scène sans mourir. Elle est écrite une
fois.

## Critère d'acceptation

Le texte est dans `docs/regles/SIMULATION.md`, et un `grep -n "_addXp" shared/`
rend exactement trois appelants. Si un quatrième apparaît un jour, la règle est
là pour dire que c'est une erreur.

## Nature de la tâche

Conception et rédaction. **Fil principal**, rien à déléguer : il n'y a pas de
frappe.
