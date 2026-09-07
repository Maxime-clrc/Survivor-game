# 02 · Les objectifs

## Un contrat est une entrée d'`EVENTS`, étendue

La table porte déjà `types[]`, `rateMul`, `level`, `texte`, `minPlayers`,
`fallback`. Un contrat lui ajoute trois champs :

```
objectif    un compteur et un seuil
rarete      commun · rare · dangereux · maudit
recompense  eclats, loot, et leur qualite
```

`_closeEvent(parBeat)` sait déjà distinguer réussite et échec — c'est la ligne
`const gagne = parBeat && (id !== EV_CHASSE || this.quarry === 0)`. Le contrat
généralise ce test au lieu d'en écrire un second.

**`EVENTS` est append-only.** Les contrats s'ajoutent à la fin. `EV_CHASSE` garde
son index et sera **redéfini** au plan 35, pas retiré.

## Les compteurs mesurables, et ils existent tous

Un objectif doit se compter sans instrumenter quoi que ce soit :

| objectif | compteur | où il est déjà |
|---|---|---|
| tuer N ennemis dans la zone | kills avec position | `_killEnemy()` |
| tuer N élites | même, filtré sur `e.elite` | idem |
| survivre N secondes | temps | `this.time` |
| tenir une zone N secondes | présence dans un rayon | `_nearestPlayer` |
| tuer une cible désignée | `this.quarry` | déjà écrit pour `EV_CHASSE` |

Aucun ne demande un système neuf. C'est le critère de sélection : **si un objectif
demande d'instrumenter la simulation, il sort de ce lot.**

## Ce qu'un contrat doit être

Il se lit **en une phrase** et se fait **sans quitter longtemps** ce qu'on
faisait. Le fond du jeu reste la horde.

Deux dérives à éviter, et elles sont symétriques :

- **trop dur** — le contrat devient un combat, et il dilue le mini-boss qui doit
  être la seule menace nommée qu'on va chercher ;
- **trop nombreux** — le contrat devient obligatoire, et un objectif obligatoire
  n'est plus une décision, c'est une corvée.

## Les quatre raretés

Elles ne changent pas seulement la **quantité** de récompense mais sa **forme** —
c'est la décision de la section V du document.

| rareté | risque | récompense |
|---|---|---|
| commun | faible | éclats, statistique plate |
| rare | objectif plus dur | loot garanti, **choix entre deux** |
| dangereux | forte pression | loot rare, **conversion avec contrepartie** |
| maudit | très rare | plusieurs récompenses |

> Plus le joueur accepte de mettre la manche en danger, plus la récompense change
> la **forme** de sa run, pas seulement ses chiffres.

## Le tirage à l'activation, et ce qu'il coûte

Le contrat est tiré **quand on active la borne**, pas fixé à la graine.

Conséquence assumée : **le contenu du contrat sort du domaine rejouable.** Deux
manches de même graine ont les mêmes bornes aux mêmes endroits, et des contrats
différents.

C'est acceptable — les *occasions* sont identiques — mais il faut le savoir avant
de promettre un challenge à graine imposée : il comparerait des parcours, pas des
tirages.

## Un seul contrat actif

Le suivi HUD reste lisible et le jeu ne devient pas une liste de tâches.

*Question à trancher en écrivant* : le contrat est **d'équipe** (une borne, un
objectif) avec des récompenses **individuelles**. Mais avec la horde par groupe du
plan 31, « éliminez 150 ennemis dans cette zone » n'a pas le même sens selon qu'on
est groupés ou non. Deux réponses possibles : l'objectif compte pour toute
l'équipe où qu'elle soit, ou il exige la présence dans la zone. La première est
plus simple et plus permissive ; la seconde crée une vraie décision de placement.

## Ce que le contrat ne verse jamais

**De l'XP.** `_addXp` a deux appelants — `_killEnemy()` et `_damage()` pour le
boss — et `_eventReward()` n'en fait pas partie. La règle est donc **déjà
respectée aujourd'hui** : ce lot la préserve, il ne l'introduit pas.

`_eventReward()` verse actuellement des PV, du bouclier et un relevé. Le contrat
ajoute éclats et loot **à côté**, sans toucher à ce qui existe.

## Critère d'acceptation

1. Un contrat accepté puis réussi verse sa récompense, et **zéro XP**. Un
   vérificateur compare `this.xp` avant et après.
2. Un contrat échoué ne verse rien et ne casse pas le battement en cours.
3. `verifierScript()` reste vert : les contrats ne touchent pas au budget de
   pression.
4. Chaque objectif de la table est atteignable par un pilote de banc sur les trois
   modes — c'est le test qui attrape un seuil écrit trop haut.

## Nature de la tâche

La table est déclarative et se délègue une fois écrite. **Le choix des objectifs,
des seuils et des quatre raretés est de la conception** : fil principal.
