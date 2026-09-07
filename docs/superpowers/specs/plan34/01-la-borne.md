# 01 · La borne

## Ce que c'est

Un objet du monde, posé aléatoirement, **tiré de la graine** (donc rejouable),
avec lequel on interagit.

Quatre états : **disponible**, **proposée** (le contrat est affiché, on n'a pas
répondu), **acceptée**, **consommée**.

Elle voyage dans le snapshot et elle est filtrée par la vue comme le reste. C'est
voulu : on la trouve en jouant.

## Elle ne disparaît pas

**Décidé.** On peut partir et revenir. Ça en fait un **choix différé** plutôt
qu'une occasion qui s'évapore, et ça supprime la pression du « il faut y aller
maintenant » — cohérente avec un jeu dont le fond reste la horde.

*Conséquence à surveiller* : si on peut refuser puis revenir, on peut relancer le
tirage jusqu'à obtenir ce qu'on veut. **Un temps de recharge sur la borne règle le
cas** — refuser coûte d'attendre, pas de renoncer. À régler en écrivant, avec un
ordre de grandeur d'une minute.

## Le marqueur

**Un « ! » ou « ? » au-dessus de la borne**, façon marqueur de quête. « ! »
disponible, « ? » en cours.

C'est la bonne réponse à un problème que je croyais coûteux : les anneaux au sol
sont **tous pris** — `REVIVE_RADIUS` en pointillés, l'aura du colosse, l'égide du
générateur, les cercles de compétence. Le canal **au-dessus du corps** est libre,
et il a déjà un précédent : `actors.js:932` pose *« trois chevrons qui montent »*
au-dessus du lanceur.

Le joueur apprend la convention en une seconde parce qu'il la connaît d'ailleurs.

**De loin**, la borne se remarque parce qu'elle est **émissive** : `emis` est la
couleur d'identité du thème, et un objet qui l'utilise saute aux yeux sur son
propre sol.

## Elle a cinq apparences

Comme les blocs : `BLOC[biome][kind]` est exactement cette table. Une borne dans la
nébuleuse, un autre mobilier cohérent ailleurs. **Même objet fonctionnel, cinq
dessins.**

C'est aussi ce qui rend le lot compatible avec les variantes de biome du plan 37 :
l'apparence suit le thème, pas la variante.

## La touche

**`F`**, et elle est libre : `input.js` occupe WASD et flèches (déplacement),
`Space` (dash), `Q`/`1`, `E`/`2`, `R`/`3` (compétences), `H` et `R` (outils).
`KeyF` n'est lié à rien.

**C'est la touche d'interaction générique**, pas la touche « contrat ». Elle ouvre
la porte à d'autres usages — ramasser volontairement, activer, ouvrir. Une touche
par système est ce qui rend un jeu impossible à apprendre.

*`e.code` est indépendant de la disposition clavier : `KeyF` est la même touche
physique en AZERTY et en QWERTY.*

*Piège à régler au passage : `R` sert à la fois de compétence 3 et de relevé de
banc (`input.js:147`). Si on touche aux entrées, autant nettoyer ça.*

## Ce qu'il faut décider en écrivant

- **combien par manche** — trois à cinq est l'ordre de grandeur, à mesurer avec le
  compte rendu du plan 32 ;
- **où elles tombent** — uniforme sur la map, ou biaisé vers ce qui attire déjà
  les joueurs ? Le second rend les bornes trouvables sans marqueur global ;
- **le temps de recharge** après un refus.

## Critère d'acceptation

1. Deux manches de même graine posent les bornes **aux mêmes endroits**. Le
   contenu du contrat, lui, diffère — c'est la décision.
2. La borne n'est jamais posée dans un obstacle ni dans un danger : `_dropPoint`
   et `_obstacleAt` existent.
3. Le marqueur est lisible à 200 corps. C'est un test visuel et il est
   nécessaire — l'écran est chargé.
4. `F` n'entre pas en conflit avec une saisie de texte (salon, chat).

## Nature de la tâche

L'objet, ses états et son réseau : mécanique. **Le marqueur et sa lisibilité à
pleine horde sont du jugement**, et ils se jugent à l'écran.
