# 01 · L'erreur de rendu est muette, donc le « bug de map » n'est pas capturable

## La mesure

Capture d'écran fournie : arène entièrement vide — pas de sol, pas de props, pas
de grille, pas d'ennemis — alors que le HUD affiche `00:20`, `KILLS 8`,
`ENNEMIS 4`, `PING 58`, la barre de segment à `4:39`, le panneau DPS rempli et
le bandeau `SPECTATEUR`. **Le HUD est cohérent, l'arène est vide.**

## Ce que cette signature dit exactement

`public/render/world.js` :

```js
function draw(v) {
  ...
  underCtx.fillStyle = sol.arena;
  underCtx.fillRect(...);          // (1) le sol est REPEINT a plat
  overCtx.clearRect(...);          // (2) la couche haute est EFFACEE
  gl?.begin(null, ...);
  drawWorld(v);                    // (3) tout le monde
  gl?.end();
  applyShake();
  drawScreen(v);                   // (4) le HUD
}
```

`boucleDeRendu` enveloppe l'image entière dans un `try/catch` qui appelle
`signalerErreur("rendu", ...)`. Une exception levée en (3) laisse donc l'écran
**exactement** dans l'état de la capture : les deux effacements ont eu lieu, rien
n'a été redessiné, et (4) n'a jamais tourné — donc le HUD garde ses dernières
valeurs et **paraît vivant alors qu'il est figé**.

C'est la seule construction du dépôt qui produit « arène vide + HUD plein ». Ce
n'est pas une piste, c'est une déduction : la caméra sans cible dessinerait quand
même le sol, `gfx: low` dessinerait quand même le sol et la grille, un lieu sans
entrée de table dessinerait quand même les autres couches.

## Pourquoi on n'en sait pas plus

`signalerErreur` (`public/core/state.js:17`) fait **deux** choses : un
`console.error`, et un envoi `clientError` au serveur, que `hub.js:557` journalise
dans `data/serveur.log`. Elle n'affiche **rien à l'écran**. Un joueur qui voit
son arène disparaître n'a donc aucun moyen de savoir qu'une exception a eu lieu,
ni laquelle, et l'information n'existe que sur la machine qui **héberge** la
partie — pas sur celle qui joue.

La partie de la capture s'est jouée en LAN (`PING 58`) : le journal utile est sur
l'hôte, et il n'a pas été consulté avant que la session ne se termine.

## Ce que le lot livre

Trois choses, dans cet ordre de valeur.

### 1a · L'erreur se voit là où elle se produit

Un bandeau discret, en DOM, dans la couche écran : `rendu interrompu — <message>`
plus les deux premières lignes de pile, affiché dès le premier
`signalerErreur("rendu", …)`. Il n'a pas à être joli, il a à être **lisible sur
une capture d'écran** : c'est le seul canal qui traverse une partie LAN.

Contraintes :

- `signalerErreur` reste le point de passage unique. Le bandeau se branche
  **dedans**, pas à côté — un second chemin d'erreur est exactement le défaut que
  ce lot corrige.
- Le dédoublonnage par signature qui existe déjà (`errVues`, `ERR_MAX = 12`)
  tient : un bandeau qui se réécrit à 60 Hz est une deuxième panne.
- Aucune allocation ni aucun test sur le chemin chaud. Le bandeau ne se
  construit **qu'au premier** appel.

### 1b · Une image qui échoue ne détruit pas la précédente

L'effacement de (1) et (2) précède le dessin. Une exception laisse donc un écran
**vide** au lieu d'un écran **périmé**, et le second est strictement plus
informatif : le joueur voit la dernière image correcte et comprend que le jeu
s'est arrêté, au lieu de croire que la map n'a pas chargé.

La correction est dans l'ordre, pas dans un réglage : `drawWorld(v)` peut se
dessiner sur les deux contextes **après** que l'image a été préparée, en gardant
l'effacement à sa place ; ou bien la garde se pose autour de `draw` seul avec un
`ctx.save()/restore()` symétrique. **Le sens à préserver : l'effacement d'une
image ne doit pas survivre à l'échec de cette image.**

Attention à `overCtx.clearRect` : la couche haute est transparente, il n'y a pas
« d'ancienne image » à conserver sans double tampon. Le lot peut donc se limiter
à `cvUnder` — le sol et le décor — ce qui suffit à distinguer « rendu planté » de
« lieu vide ».

### 1c · Le journal de l'hôte devient exploitable

`logClientError` écrit déjà la bonne ligne. Ce qui manque est qu'elle porte le
**lieu** et la **graine** de la partie en cours : deux nombres, connus du hub,
sans lesquels une exception de rendu n'est pas rejouable. `BIOME=<clef>
GRAINE=<n> npm start` reproduit alors exactement l'arène fautive.

## Vérification

1. Provoquer une exception à la main dans `drawProps` (un `throw` temporaire),
   vérifier : le bandeau apparaît, la dernière image du sol reste, le HUD se fige,
   la ligne du journal de l'hôte porte le lieu et la graine.
2. Retirer le `throw`, vérifier que le bandeau ne réapparaît pas et qu'aucun test
   ne subsiste dans la boucle.
3. **Puis jouer.** Ce lot ne se conclut pas sur un correctif : il se conclut sur
   la prochaine occurrence, avec son message.

## Ce que le lot ne fait PAS

Il ne devine pas la cause. Les candidats écartés par la mesure sont écrits
ci-dessus ; les tables par lieu et le générateur de biome ont été recroisés le
2026-08-31 et sont muets. Écrire un correctif contre une hypothèse serait
exactement la faute que `plan27/README.md` reproche à plan 26.
