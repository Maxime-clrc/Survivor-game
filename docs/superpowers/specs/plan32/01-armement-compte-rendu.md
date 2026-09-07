# 01 · `?mesure` disparaît, le compte rendu apparaît

## Ce qui change

**L'armement.** La trace ne s'arme plus par l'URL mais par une **option de
salle**, cochée avant la partie, visible par tout le monde.

La moitié du travail est faite : `armerTrace(client, on)` diffuse déjà
`traceState` à toute la salle, l'état est porté **par la salle** et non par le
module — *« deux salles peuvent être tracées indépendamment »* — et `traceDebut()`
est déjà appelé sur l'entrée en manche. Il n'y a qu'à changer le déclencheur.

**Le garde-fou change de nature.** Le code justifie aujourd'hui l'URL par :
*« elle ne doit coûter aucun clic à personne — et surtout pas vivre dans un menu
où on l'oublierait armée »*. L'objection est juste, mais la réponse n'est pas de
cacher l'option : c'est de la rendre **impossible à oublier**. Un témoin visible
dans le HUD pendant toute la manche, et la mention du joueur qui l'a armée —
`tracePar` existe déjà.

**La sortie.** Une page à copier-coller à la fin de la manche, destinée à être
collée dans une conversation avec un modèle.

## Le compte rendu est une réduction, jamais une seconde collecte

Le serveur a déjà tout en mémoire : la trace complète, `scoreboardRows()`, et
bientôt les relevés clients. **Le compte rendu se déduit de la trace.**

Ça compte pour deux raisons : on n'instrumente jamais deux fois, et le compte
rendu ne **peut pas** diverger de la trace.

Le JSONL sur disque reste en sortie secondaire. Il ne coûte rien et il sert quand
le résumé ne suffit pas.

## Le format

Du texte, pas du JSON brut. Dense mais lisible. Des tableaux markdown pour ce qui
est tabulaire.

**Et surtout borné.** Trente minutes à 1 Hz font 1 800 échantillons : illisible et
coûteux à coller. Le compte rendu est un **résumé par segment** — six lignes —
plus les événements notables et les anomalies.

```
en-tete       version, graine, biome, difficulte, effectif, duree, issue,
              qui a arme la mesure
par segment   population moy/max, plafond, kills, niveau, DPS d equipe,
              images/s p50 et p99 de chaque client, evenement, meteo
par joueur    classe, arme, build finale (cartes + reliques, avec l ordre
              de prise), DPS moyen et pointe, degats infliges VENTILES,
              degats subis par source, soins, contribution indirecte,
              morts, eclats
par boss      type, duree, barres cassees, DPS d equipe pendant le combat,
              mecaniques posees / echouees
anomalies     (lot 05)
```

## Deux questions de conception, tranchées ici

**Une partie observée reste-t-elle classable ?** Oui. La trace n'altère rien : elle
lit un état déjà calculé et déduit ses lignes par comparaison. Rien dans la
simulation ne sait qu'elle est observée, et c'est cette propriété qu'il faut
préserver — pas s'en priver.

**Des pseudos dans le compte rendu ?** Non. Le compte rendu est fait pour être
collé ailleurs. Chaque joueur y apparaît par sa **classe et sa couleur**
(« Rempart bleu »), pas par son nom. C'est plus lisible pour l'analyse et ça évite
de coller quatre pseudos dans une conversation.

## Critère d'acceptation

1. `grep -rn "mesure" public/net/router.js` ne rend plus le déclencheur d'URL.
2. Une manche tracée produit **et** le JSONL **et** le compte rendu, et les
   chiffres du second se retrouvent dans le premier.
3. Le témoin est visible pendant toute la manche, chez **tous** les joueurs.
4. Le compte rendu d'une manche de 30 min tient sous 400 lignes.
5. Deux salles tracées simultanément produisent deux comptes rendus distincts —
   c'est le test qui vérifie que l'état est bien porté par la salle.

## Nature de la tâche

Le déclencheur et le témoin sont mécaniques. **La réduction est le travail**, et
elle demande de décider ce qui mérite une ligne : c'est du jugement, fil
principal.
