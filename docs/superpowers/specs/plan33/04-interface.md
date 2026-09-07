# 04 · L'interface

## La forme

**Un mélange de curseurs et de cases, au cas par cas.** Le rang reste la structure
de fond ; la présentation s'adapte à la condition :

- une condition à **deux ou trois rangs** se lit mieux en **cases** — on voit les
  options d'un coup ;
- une condition à **cinq rangs monotones** (+20 %, +40 %, … ) se lit mieux en
  **curseur cranté** — le sens de la progression est évident ;
- une condition **binaire** est une case, évidemment.

C'est une décision de présentation, pas de modèle : le fond reste une liste de
rangs.

## Ce qui doit être visible en permanence

**L'indice de sévérité**, mis à jour à chaque changement. C'est le repère
principal, et il doit être présenté comme **une approximation** — pas comme une
difficulté objective (voir lot 01 : la sévérité réelle dépend de l'arme).

**Le produit des multiplicateurs**, à côté. Il dit autre chose que la somme des
coûts : la sévérité annonce l'intention, le produit annonce ce que la simulation
va réellement subir. Les deux ensemble évitent la surprise de la composition.

**Un repère par rapport aux modes existants** — « ×3,4 par rapport à cauchemar »
en dit plus qu'un nombre absolu, surtout pour quelqu'un qui ouvre le mode pour la
première fois.

## Ce qu'il ne faut pas faire

**Ne pas cacher les conditions derrière des onglets par famille** si elles tiennent
sur un écran. Le mode custom vaut par la vue d'ensemble : voir les huit conditions
ensemble est ce qui donne envie d'en combiner deux.

**Ne pas afficher d'avertissement moralisateur.** « Attention, ce réglage est très
difficile » n'apprend rien à quelqu'un qui vient de mettre tous les curseurs à
fond exprès.

## Le point que le HUD de manche doit porter

Une manche custom doit **se voir pendant qu'on y joue**, pas seulement dans le
salon. Un joueur qui rejoint doit savoir dans quoi il entre.

Le côté gauche du HUD est libre sous `#hudRun` (l'horloge), et c'est là que le
suivi de contrat ira au plan 34 : la mention du mode custom et de sa sévérité s'y
place naturellement, en petit, et disparaît dans les trois modes normaux.

## Critère d'acceptation

1. Changer un rang met à jour la sévérité **et** le produit, immédiatement.
2. Le réglage est visible en manche par **tous** les joueurs de la salle.
3. Un joueur qui rejoint une salle custom voit les réglages avant de se dire prêt.
4. L'écran tient sans défilement à la résolution de référence.

## Nature de la tâche

Interface. Se délègue, avec une relecture sur les deux indicateurs — c'est le seul
endroit où une erreur d'affichage ferait tirer de fausses conclusions d'une
mesure.
