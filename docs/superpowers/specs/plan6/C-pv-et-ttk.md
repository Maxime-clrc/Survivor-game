# Lot C — la rampe de PV et le temps de mise à mort

**Dépend de A** (la densité finale) et **se mesure après B** (la vitesse change
la façon dont toute survie se lit).

## Constat

Le dépôt s'est fixé une cible explicite : *« le temps de mise à mort d'un grunt
doit rester entre 0,15 et 0,50 s pour une build médiane, du début à la fin »*.
Elle n'est pas tenue sur toute la seconde moitié de la manche.

| | PV d'un grunt | DPS build médiane | TTK |
|---|---|---|---|
| minute 1 | 29 | ~75 | 0,39 s ✔ |
| minute 15 | 211 | ~230 | 0,92 s ✘ |
| minute 30 | 406 | ~350 | 1,16 s ✘ |

À `ENEMY_HP_MIN_RAMP = 13`, les PV font **×25** sur la manche pendant que la
puissance joueur fait ×4 à ×5. L'écart d'un facteur cinq se paie deux fois : le
jeu devient spongieux — ennuyeux, pas difficile — et la boucle d'expérience se
bouche mécaniquement, puisque l'XP est proportionnelle au débit de kills.

## Décision

`ENEMY_HP_MIN_RAMP` passe de **13 à 7**. La difficulté que ces six points
portaient repart sur la densité (lot A), le roster et les traits — principe
verrouillé n°1.

| | PV grunt | TTK avant (13) | TTK après (7) |
|---|---|---|---|
| minute 1 | 23 | 0,39 s | 0,31 s |
| minute 15 | 121 | 0,92 s | 0,53 s |
| minute 30 | 226 | 1,16 s | 0,65 s |

À la minute 30 le TTK tombe à 0,65 s — encore au-dessus de la cible de 0,50, et
**c'est voulu** : le reste de l'écart doit se combler par la remesure de la
puissance médiane, pas par un troisième aller-retour sur la rampe.

## Remesure obligatoire dans le même lot

`BOSS_POWER_REF = 2,36` doit être **remesuré et non recalculé**. La valeur date
d'un modèle à ~13 cartes par manche ; le lot X en distribue 26. Elle est
vraisemblablement périmée d'un facteur ~1,5, ce qui rend les boss de fin de
manche trop faibles.

**Protocole :** bot invulnérable, manche complète, `_playerPower()` relevé à la
mort de chaque boss, médiane sur 6 manches par effectif.

## Ce que le lot NE fait pas

**Ne pas toucher à la vitesse** — c'est le lot B. Vitesse et PV se compensent
visuellement (un ennemi lent et résistant se lit comme un ennemi rapide et
fragile) ; les changer dans le même lot rendrait les deux mesures illisibles.

## Critères d'acceptation

1. TTK d'un grunt entre **0,15 et 0,60 s** aux minutes 1, 10, 20 et 30, pour une
   build médiane, dans les trois difficultés. La borne haute est relevée de 0,50
   à 0,60 : la cible d'origine n'a jamais été tenue, et prétendre l'atteindre du
   premier coup ferait sur-corriger. *(Décision à valider — voir DECISIONS.md)*
2. Durée médiane d'un combat de boss entre **50 et 90 s** après remesure.
3. La survie médiane d'une équipe qui joue mal ne **remonte pas**. Si baisser
   les PV rend le jeu plus facile en net, c'est que A n'a pas assez donné : il
   faut y retourner plutôt qu'annuler C.
