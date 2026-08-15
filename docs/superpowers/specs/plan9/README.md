# Plan 9 — correctifs, météo vivante, et le coût du VPS

Six lots. Les trois premiers réparent ou complètent du jeu, les trois derniers
attaquent le seul poste qui limite vraiment le serveur.

L'audit de performance qui ouvre ce plan a donné un résultat contre-intuitif,
et c'est lui qui fixe l'ordre : **le CPU n'est pas le problème, la bande
passante l'est.** Une salle saturée (900 corps, quatre joueurs, cauchemar) coûte
1,22 ms de `step` médian, soit 7,3 % d'un cœur — mais 2,2 Mbit/s **par client**
en pic, ~1,8 Go par heure et par salle. Optimiser le `step` sans toucher au
réseau n'aurait rien rendu.

| lot | version | contenu |
|---|---|---|
| 01 | 0.11.0 | trois correctifs : chiffres de dégâts du boss, rebond sur obstacle, Jumeaux hors solo |
| 02 | 0.11.1 | la météo devient vivante : `windAt`, la horde n'y est plus soumise, traits de vent |
| 03 | 0.11.2 | grille statique pour obstacles et dangers — la part la plus chère du `step` |
| 04 | 0.11.3 | télémétrie de vraies parties, JSONL, armée par paramètre d'URL |
| 05 | 0.11.4 | instantané filtré par vue de client — 2,5× de bande passante |
| 06 | — | **abandonné à la mesure** — voir plus bas |

## Mesures d'ouverture

Banc de saturation, 4 joueurs, cauchemar, population poussée au plafond dur.
Machine de développement — un VPS mono-cœur est 2 à 4× plus lent, mais les
rapports entre postes tiennent.

```
step (pop > 400)     med 1,22 ms   p99 2,08 ms   max 4,03 ms
snapshot clair       36 091 o      deflate niveau 1   13 881 o
pic par client       275 Kio/s comprime = 2,2 Mbit/s
composition          ennemis 86,7 %   zones 10,8 %   joueurs 1,0 %
culling union equipe 99,96 %   <- inutile, les monstres suivent les joueurs
culling par client   40,2 %    <- 2,5x, c'est le lot 05
```

Écartés à la mesure, pour qu'on n'y revienne pas :

- **brotli** — meilleur des deux côtés (13 278 o en 0,119 ms contre 13 881 o en
  0,175 ms) mais le `WebSocket` du navigateur ne sait décompresser que
  `permessage-deflate`. Inutilisable sans embarquer un décodeur JS, qui
  annulerait le gain.
- **deflate niveau 6** — 12 420 o (−10 %) pour 0,679 ms (×3,9). Mauvais rapport,
  le niveau 1 reste le bon choix.
- **encodage binaire pour la bande passante** — 43 % du JSON clair, mais deflate
  récupère déjà l'essentiel de la redondance : le gain retombe à ~19 % après
  compression. Le binaire vaut pour le **CPU client**, pas pour les octets, et à
  ce titre il est derrière le pool d'objets du lot 06, moins cher.
- **OffscreenCanvas / rendu dans un worker** — le HUD est en DOM par décision
  d'architecture, gain partiel et risque élevé.

## Lot 06 — abandonné, et c'est l'audit qui avait tort

L'audit d'ouverture annonçait le chemin de réception client comme « une fabrique
à micro-saccades » : `JSON.parse` de 36 Ko vingt fois par seconde, puis 900
objets et une `Map` reconstruits, soit ~40 000 objets par seconde jetés au
ramasse-miettes sur le thread qui dessine. Mesuré, à 800 corps :

```
JSON.parse de 32 Kio          0,096 ms
construction de l'instantane  0,033 ms
                              -------
total par instantane          0,129 ms, UNE image sur trois
                              soit 0,8 % du budget d'une image a 60 fps
```

La boucle directe à la place de `map` + paires gagne bien 30 % (0,033 → 0,023
ms), mais 30 % de 0,03 ms n'est pas une optimisation, c'est du bruit.

Deuxième moitié du lot, les anneaux d'élite et d'aura tracés un par un en 2D :
comptés à saturation, **18 élites sur 800 corps et zéro aura**. Le batch aurait
économisé dix-huit `stroke` par image, pas la centaine que la lecture du code
laissait craindre.

Rien dans ce lot ne valait son risque. Ce qui l'a rendu inutile, en partie,
c'est le lot 05 : à équipe séparée le paquet a déjà fondu de 67 %, donc le
volume à parser avec lui.

**Ce qu'il faut faire à la place** : si une saccade se voit en jeu, la mesurer
dans le navigateur avec l'instrumentation qui existe déjà (`PERF`, `fps`,
`netPerf`, `frameMax`, `?repere`) plutôt que de deviner d'après le code. Le
poste suspect n'est plus la réception.

## Ce qui reste ouvert après le plan

`node:worker_threads`, une salle par worker. Aujourd'hui toutes les salles
partagent un cœur, et aucune micro-optimisation ne déplacera ce plafond. Le
contrat de `Room` (« ne touche jamais à Supabase, ne lit aucune globale, ne
connaît pas les autres salles, reçoit ses entrées et émet des événements ») est
déjà exactement la frontière d'un worker : les `hooks` deviennent des messages,
le hub reste seul écrivain. À engager quand le besoin arrive, pas avant.
