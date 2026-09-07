# 03 · Le suivi, à gauche

## Ce que c'est

Un encart discret, façon FFXIV : le contrat accepté, son objectif, sa progression
chiffrée. Il disparaît quand il n'y a rien.

## Le point que le lot doit traiter

**C'est le premier élément persistant du HUD de jeu.**

Aujourd'hui, tout ce qui informe est transitoire : les bandeaux `_alert()`
s'effacent, les popups de haut fait passent, les pips de compétence sont des
états et non des messages. Un suivi de contrat **reste à l'écran** tant que le
contrat vit.

Trois questions de place, à traiter d'un coup :

**Où.** À gauche, et c'est libre : `#hudRun` (l'horloge et le segment) occupe le
coin haut-gauche et ne descend pas ; `#hudTeam` est à droite avec ses 190 px.
Toute la hauteur gauche sous l'horloge est disponible.

**À quatre joueurs.** Un seul contrat actif par équipe, donc un seul encart. La
question ne se pose pas — et c'est une des raisons de la décision « un seul à la
fois ».

**Quand rien ne bouge.** Un encart figé pendant deux minutes devient du décor. Il
doit soit se réduire, soit ne rappeler que le chiffre qui change.

## Ce qu'il porte, et rien de plus

```
NOM DU CONTRAT          (rarete lisible par la couleur ou la forme)
l objectif, en une phrase
42 / 150
```

**Pas de minuteur si le contrat n'en a pas.** Pas de récompense affichée en
permanence — elle est dans la proposition, au moment d'accepter. Pas de flèche
vers la zone : le ping et les chevrons sont un autre système, et un contrat n'est
pas une destination imposée.

## La proposition, au moment d'activer

Distincte du suivi. Quand on appuie sur `F`, la borne propose : nom, objectif,
rareté, récompense. On accepte ou on referme.

**Ça ne doit pas figer la simulation.** Les écrans de carte et de marchand
suspendent la manche (`cardsPending`, `relicPending`) ; une proposition de contrat
**ne doit pas** — sinon activer une borne devient une pause, et le joueur
l'utilisera comme telle sous la horde.

C'est le vrai piège de ce lot : la tentation de réutiliser le mécanisme d'écran
existant est forte, et il est le mauvais.

## La rareté se lit sans texte

Quatre raretés, et le dépôt a déjà sa doctrine : la **forme** avant la couleur
(c'est ce que disent les chevrons du HUD), et la charte interdit le rouge pour ce
vers quoi il faut aller.

## Critère d'acceptation

1. Le suivi apparaît à l'acceptation, se met à jour, disparaît à la fin.
2. **La proposition ne suspend pas la simulation** — un vérificateur : la horde
   avance pendant qu'elle est affichée.
3. Le suivi ne recouvre rien du HUD existant à la résolution de référence.
4. Un joueur qui rejoint en cours de manche voit le contrat actif.

## Nature de la tâche

Interface. Se délègue, **sauf** le point 2 : le choix de ne pas réutiliser le
mécanisme d'écran est une décision d'architecture, et elle doit être écrite avant
de commencer.
