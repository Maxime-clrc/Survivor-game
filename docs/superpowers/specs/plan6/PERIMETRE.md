# Périmètre : ce que le plan couvre, et ce qu'il ne couvre pas

## Le critère qui décide

Un levier non couvert n'est pas un défaut en soi. Ce qui compte est de savoir
s'il **porte** quelque chose du plan :

> **Un levier peut rester hors périmètre s'il est INDÉPENDANT.**
> **Il doit être couvert s'il PORTE une décision du plan, ou si un lot change ses
> conditions de fonctionnement.**

Trois questions à poser pour chaque système. Une seule réponse « oui » suffit à
le faire entrer dans le plan :

1. Un critère d'acceptation d'un lot **en dépend** ?
2. Un lot lui **délègue** de la difficulté qu'il retire ailleurs ?
3. Un lot **change ses conditions** de calibrage (densité, durée, effectif) ?

C'est ce test qui a fait naître les lots I et J : les traits répondaient « oui »
aux questions 2 **et** 3, les classes « oui » à la question 1. Ce n'était pas
« il manque des choses », c'était **le plan qui s'appuyait sur du vide**.

---

## Découvert à l'audit — et désormais couvert

Ces neuf leviers manquaient. Ils ont chacun un lot.

| système | pourquoi il devait entrer | traité par |
|---|---|---|
| les trois classes et leurs compétences | Q1 — la doctrine de fuite du lot B en dépend | **lot I** |
| composition d'équipe (4 tireurs vs 1/1/2) | Q1 — le lot I ne conclut rien sans elle | **lot I** |
| les traits d'ennemis | Q2 et Q3 — A et C leur délèguent la difficulté, A triple leur densité | **lot J** |
| les plafonds de traits (`TRAIL_MAX`…) | Q3 — calibrés pour 200 ennemis, A monte à 622 | **lot J** |
| les élites | Q3 — cadence jamais revue depuis les 37 minutes | lot J |
| les bonus au sol | Q1 — ils portent la clémence de la matrice des profils | lot J |
| les débits du `SCRIPT` | Q3 — redeviennent opérants avec A | **lot A-2** |
| les trois armes légendaires entre elles | Q1 — E-3 en rend une accessible tôt | lot E-3 |
| coût de la mort et réanimation | Q1 — axe de clémence, central pour P0 | lot G-2 |

---

## Volontairement hors périmètre — et pourquoi c'est sans risque

Trois seulement. Chacun répond **non** aux trois questions.

**Les biomes, obstacles et goulets.** `verifierBiomes()` existe déjà et vérifie
ce qui compte : surface de dangers, surface d'obstacles, existence d'un passage
traversable, absence de danger sous un obstacle. Aucun lot ne lui délègue quoi
que ce soit. ⚠ *Une réserve tout de même — voir la section suivante.*

**La durée et la structure de la manche.** Trente-sept minutes, six segments de
300 s. C'est la structure sur laquelle tous les lots se calent : la changer
invaliderait les dix. Porte fermée dans le README.

**Le netcode, le tickrate, la prédiction.** Sans effet d'équilibrage. Le lot A a
un effet sur la **taille des instantanés** — c'est de la performance, traitée par
son critère de 16 ms, pas de l'équilibrage.

---

## La réserve : le corps des ennemis comme obstacle

Trouvée en repassant le test sur les biomes, et c'est la seule chose que l'audit
laisse ouverte.

`verifierBiomes()` garantit qu'il existe un passage traversable **entre les
obstacles statiques**, obstacles dilatés du rayon du personnage. Cette garantie
ne dit rien des **corps ennemis**, qui se repoussent entre eux (c'est l'objet
même de la grille spatiale) et forment donc un mur mobile.

À 200 ennemis, ce mur est franchissable. À 622, personne ne sait — et ça
attaque directement la doctrine du lot B : **on ne fuit pas ce qu'on ne peut pas
contourner.** Un runner ramené à 196 px/s ne sert à rien si le joueur est enfermé
dans une poche de corps.

Ce n'est pas un lot de plus : c'est un **critère d'acceptation supplémentaire du
lot B**, ajouté à sa liste, parce que c'est la promesse de B qui est en jeu.

---

## Pourquoi ne pas viser 100 %

Deux raisons, et la seconde est la vraie.

Un plan qui couvre tout ne s'exécute jamais. Dix lots, quinze décisions et sept
mesures, c'est déjà au-delà de ce que le dépôt a fait tenir dans un plan
jusqu'ici.

Surtout : **une mesure prise avant que l'environnement change ne vaut rien.**
Auditer les élites aujourd'hui, à 200 ennemis, pour les réauditer après le lot A
à 622, c'est faire le travail deux fois et se fier au premier. C'est aussi
pourquoi J dépend de A plutôt que de l'accompagner.
