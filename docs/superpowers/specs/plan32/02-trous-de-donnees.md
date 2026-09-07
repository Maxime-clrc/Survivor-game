# 02 · Les quatre trous de données

Par ordre de valeur. Aucun ne demande un système : ce sont des grandeurs qui
existent et qui ne sortent pas, ou qui manquent d'un pendant.

## 1 · Les dégâts INFLIGÉS ne sont pas ventilés

`p.hurtBy` ventile les dégâts **subis** par `DAMAGE_SOURCES` — contact,
projectile, zone, mécanique, brûlure, explosion, environnement. Il n'existe **rien
de symétrique** pour ce que le joueur inflige : `p.damageDealt` est un total.

Conséquence : on ne sait pas quelle part des dégâts vient de l'arme, des
invocations, des zones posées, de la brûlure ou du ricochet. **C'est précisément
ce qui manque pour équilibrer une arme sur une vraie partie.**

Le point de passage existe déjà : `_damage(target, amount, ownerId, ...)` voit
passer tout ce qui blesse. Il lui manque une **source**, comme `_hurt()` en a une.

*Attention à ne pas doubler la vérité* : `damageDealt` reste le total, et la somme
de la ventilation doit lui être égale. Un vérificateur d'égalité, sinon les deux
dérivent.

## 2 · `p.contrib` est calculé et ne sort nulle part

Quatre grandeurs, écrites aux points de passage :

| champ | ce qu'il mesure | écrit dans |
|---|---|---|
| `evites` | ce que le joueur s'épargne | `_hurt`, ligne 8106 |
| `proteges` | ce qu'il épargne à un **allié** | `_hurt`, ligne 8113 |
| `detournes` | ce que la provocation attire sur lui | `_hurt`, ligne 8154 |
| `permis` | ce que le catalyseur permet à un autre | `_damage`, ligne 2993 |

Elles alimentent `mesureContribution` en campagne de bots. Elles sont **absentes
du scoreboard comme de la trace**.

**Un Rempart qui joue parfaitement a aujourd'hui un tableau de fin vide.** C'est le
seul rôle du jeu dont la contribution est invisible, et les quatre nombres qui la
diraient existent déjà.

## 3 · La build n'est datée que de la fin

Les cartes sont dans la ligne `fin`. On ne sait pas **quand** chacune a été prise,
donc on ne peut pas corréler un saut de DPS à une prise.

Il y a déjà une ligne `niveau` produite par comparaison ; une ligne **`carte`** au
même endroit coûte trois lignes et débloque toute l'analyse de build. Même chose
pour les reliques et, plus tard, pour le loot de run.

## 4 · Les performances client n'entrent jamais dans la trace

Le serveur trace une manche dont il ignore le rendu. C'est le trou principal, et
il a son lot — voir 03.

## Ce que ces quatre ajouts coûtent

Rien en simulation : trois d'entre eux sont des lectures de champs existants, et
le premier ajoute un argument à un point de passage unique.

Le vrai coût est **la place dans le compte rendu**. Quatre grandeurs de plus par
joueur, c'est quatre colonnes ; il faut décider lesquelles sont dans le tableau et
lesquelles sont dans une ligne de détail.

## Critère d'acceptation

1. La somme de la ventilation des dégâts infligés **égale** `p.damageDealt`, à
   l'arrondi près, sur trois manches de bots. Vérificateur en suite rapide.
2. Un Rempart en manche de test produit des `proteges` non nuls dans le compte
   rendu.
3. Le nombre de lignes `carte` de la trace égale le nombre de cartes de la build
   finale.
4. `verifierContribution()` reste vert.

## Nature de la tâche

L'argument de source dans `_damage` touche un point de passage unique et sa
ventilation doit rester cohérente avec le total : **fil principal**. Le reste —
lecture de `p.contrib`, ligne `carte` — se délègue.
