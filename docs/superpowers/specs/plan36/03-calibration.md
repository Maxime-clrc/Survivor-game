# 03 · Les six réglages

`A` (poids des dégâts), `B` (poids de la densité), `C` (poids de l'état à terre),
`DECAY`, seuil bas, seuil haut.

Six nombres, aucun ne touchant à l'équilibrage existant.

## Ce qui rend ce lot facile, et c'est le plan 32

La mesure de tension a été livrée quatre plans plus tôt et **tracée depuis**. Au
moment où ce lot commence, il existe :

- des dizaines de manches réelles avec leur courbe de `tensionMoy` et
  `tensionMax`, à 1 Hz ;
- ces courbes croisées avec la population, l'événement, le boss et la météo de
  chaque segment ;
- et l'anomalie « tension plate » du plan 32 lot 05, qui a déjà signalé les
  passages où rien ne se passait.

**Les seuils se lisent sur les distributions observées.** Ce lot est de la lecture,
pas de la devinette — et c'est tout l'intérêt d'avoir livré la mesure en avance.

## La méthode

**1 · Regarder les distributions.** Où se situent les 20ᵉ et 80ᵉ centiles de
`tensionMoy` sur des manches jugées bonnes ? Les seuils partent de là.

**2 · Vérifier que la courbe a la bonne forme.** Le brainstorm dessinait un
rythme : pression → pic → résolution → respiration → nouvelle pression. Si la
courbe réelle est déjà celle-là, le Director a peu à faire et il faut le savoir.
Si elle est plate ou saturée, ce sont **les poids** qu'il faut corriger avant les
seuils.

**3 · Vérifier la sensibilité.** Un poids dont un doublement ne change rien à la
courbe est un poids mort — il faut le retirer, pas le régler.

**4 · Le mode custom comme banc.** Même graine, un mutateur changé, deux comptes
rendus. C'est exactement l'usage pour lequel le plan 33 a été fait : « +50 %
ennemis » doit faire monter la tension, et de combien est une donnée.

## Les pièges de calibration

**La tension ne doit pas saturer.** Bornée à [0, 1], elle passe son temps à 1 si
`A` est trop fort, et la mesure ne dit plus rien. C'est le défaut le plus probable.

**`DECAY` décide de la mémoire.** Trop rapide, la tension suit les coups et le
Director réagit à chaque échange. Trop lente, elle intègre toute la manche et ne
redescend jamais. L'ordre de grandeur à viser est la durée d'un engagement, pas
d'un battement.

**Les seuils ne sont pas symétriques.** L'ennui se juge sur une **durée** (le
troisième compteur de mémoire), la surcharge sur un **instant**. On peut être
brièvement en danger sans que ce soit un problème ; on ne peut pas s'ennuyer
brièvement.

## Ce qu'il faut écrire à la fin

Les six valeurs, **avec les distributions sur lesquelles elles ont été lues**, dans
`LISEZMOI.md`. Un réglage sans sa mesure est un nombre magique, et le dépôt n'en
veut pas.

## Critère d'acceptation

1. Sur vingt manches enregistrées, `tensionMoy` passe **moins de 5 % du temps** à
   0 ou à 1. Une mesure saturée ne mesure rien.
2. Doubler chacun des trois poids change visiblement la courbe. Sinon le poids est
   mort.
3. Le Director change effectivement d'état sur une manche réelle — au moins une
   fois en ennui, au moins une fois en surcharge, sur une manche de trente
   minutes en normal.
4. `verifierScript()` et `verifierPopulation()` restent verts.

## Nature de la tâche

Mesure et jugement. **Fil principal**, avec des allers-retours prévus : c'est le
seul lot du corpus dont on ne peut pas écrire les valeurs à l'avance.
