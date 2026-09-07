# 03 · Le ping

## Ce qu'il est

**Le chevron du joueur émetteur clignote, avec un son.** Rien de neuf n'est
dessiné.

Le plan 31 lot 05 a déjà supprimé le doublon : il ne reste que la version DOM
(`updateMarks`, `#hudMarks`, `.mark`). Le son a déjà été composé au plan 34 lot 04,
avec les six autres.

Ce lot n'a donc plus que le message et la classe à écrire.

## Ce qu'il faut

- un message `ping` portant l'identifiant de l'émetteur ;
- une classe `.pingue` sur le chevron correspondant, pendant N secondes ;
- le son, via `uiSoundFor()` — point de passage unique du son d'interface.

## Pourquoi c'est si peu

Parce que la donnée est déjà là. Dans `snapshot(vue)`, tout est filtré par la vue
— ennemis, balles, tirs, zones — **sauf les joueurs** :

```js
p: [...this.players.values()].map(p => [ p.id, r1(p.x), r1(p.y), ... ]),
```

La liste `p` est **complète, toujours**, avec position, PV, bouclier, état à terre,
classe et couleur. Les chevrons ne demandent **aucun champ réseau, sur aucune
taille de map** — y compris à 9600 × 5400.

Et parce que le chevron **pulse déjà** pour un allié à terre : le vocabulaire d'un
indicateur qui « crie » est en place, il faut une seconde cause.

## Pas de saturation possible

Un ping par joueur au maximum, puisque c'est **son** chevron qui clignote. Deux
pings du même joueur ne peuvent pas s'empiler. C'est une propriété du choix de
conception, pas un garde-fou à écrire.

## La limite, assumée

**Le ping dit « venez vers moi », pas « allez là-bas ».** Pour un contrat à
2 000 px dans l'autre sens, il faudrait un marqueur de **lieu**, qui est un autre
système.

Pour un LAN à quatre personnes autour d'une table qui se parlent, « venez vers
moi » suffit — le ping remplace « attendez, venez », pas une carte tactique. C'est
aussi ce qui justifie de ne pas construire de minicarte.

## Le son porte l'identité

Décidé au plan 34 : **la hauteur porte l'identité du joueur.** Quatre joueurs,
quatre fondamentales, famille `annonce` — fondamentale grave plus quinte, la
famille qui coupe à deux cents corps.

On entend **qui** appelle avant de regarder l'écran.

## Ce qu'il reste à trancher en écrivant

- **la durée du clignotement** — assez pour être vu si on regardait ailleurs, assez
  court pour ne pas rester après qu'on a répondu ;
- **un temps de recharge par joueur**, pour qu'un ping répété ne devienne pas une
  alarme ;
- **le chevron reste-t-il permanent en dehors du ping ?** Oui — un allié hors écran
  est une information continue. Le ping est le moment où il crie.

## Critère d'acceptation

1. Un ping fait clignoter **un seul** chevron, celui de l'émetteur.
2. Le son s'entend à 200 corps, avec la horde et un boss.
3. Un joueur qui pingue alors qu'il est **dans** la vue de l'autre ne casse rien —
   il n'y a pas de chevron à faire clignoter, et le son suffit.
4. Le ping ne crée aucun trafic mesurable.

Le point 3 est le cas qu'on oublie et qui plante.

## Nature de la tâche

Petit et mécanique. Se délègue, avec une relecture sur le cas du point 3.
