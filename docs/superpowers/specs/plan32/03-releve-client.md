# 03 · Le relevé client remonte, et il est par segment

## Le constat

`REL` (`public/render/world.js`) est bon et il est déjà écrit : dix secondes de
mesure, zéro allocation par image, tableau plafonné à 4 096 échantillons, et il
rend palier de qualité, GL ou 2D, arme, population, images/s **médianes et p99**,
durée d'image **p99 et maximum**, appels de dessin, quads, pic de particules, et
trois statistiques audio (pic de voix, voix perdues, voix volées).

Il va dans le presse-papier. Le serveur ne le voit jamais.

## Ce qui change

**Chaque client accumule son relevé et l'envoie au serveur en fin de manche.**
Un message, une fois, pas de flux.

**Par segment, pas en une fois.** Six fenêtres au lieu d'une : c'est ce qui permet
de dire « ça a ramé au segment 5 » plutôt que « la manche a fait 48 images/s en
moyenne ». C'est la question qu'on se pose réellement.

Le coût est le même : `REL` est déjà à zéro allocation par image et déjà plafonné.
Six fenêtres, c'est six jeux de centiles au lieu d'un.

**Le lien devient possible.** Une fois les six fenêtres côte à côte avec les six
lignes de segment de la trace serveur, une chute d'images/s se lit contre la
population, l'événement, la météo et l'état du boss de ce segment-là. C'est tout
l'objet du plan.

## Ce qu'il faut décider en écrivant

**Que faire du bandeau `?perf` ?** Il montre et ne retient rien, ce qui est
assumé. Il peut rester tel quel, ou devenir la vue en direct de ce que le relevé
accumule. La seconde option évite deux chemins qui mesurent la même chose.

**Le réseau, tant qu'on y est.** `room.perf` échantillonne **déjà** la taille des
messages (`clair`, `defl`) et le débit d'envoi, sous `PERF_ON`. C'est de la donnée
gratuite, actuellement jetée. Elle a sa place dans la ligne de segment.

## Le piège

`REL` mesure **un client**. Quatre joueurs, ce sont quatre machines différentes,
et la plus faible décide de l'expérience. Le compte rendu doit donc donner **les
quatre**, pas une moyenne — une moyenne d'images/s sur quatre machines
hétérogènes ne veut rien dire.

C'est aussi ce qui rend le lot utile en LAN : on saura enfin si « ça rame » veut
dire « chez tout le monde » ou « sur le portable de Pierre ».

## Critère d'acceptation

1. Une manche de 30 min à deux clients produit **douze** fenêtres de relevé dans
   le compte rendu, six par client, identifiées par joueur.
2. Un client qui se déconnecte en cours de manche laisse ses fenêtres déjà
   remontées — pas de tout ou rien.
3. Le relevé ne coûte rien de mesurable : le p99 de durée d'image ne bouge pas
   entre une manche tracée et une manche non tracée, sur la même graine.

Le point 3 est le critère qui compte : un instrument qui change ce qu'il mesure
est inutile.

## Nature de la tâche

Un message de plus, une découpe par segment, et l'agrégation côté serveur.
Mécanique. Le choix de ce qui entre dans la ligne de segment est du jugement :
fil principal.
