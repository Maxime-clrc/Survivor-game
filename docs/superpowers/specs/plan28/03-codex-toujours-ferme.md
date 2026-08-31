# 03 · Le codex reste fermé quand la manche ne se termine pas

## Ce qui a été prouvé, pas supposé

La chaîne complète a été exécutée le 2026-08-31, **deux fois**, sur le dépôt réel
en 0.29.24.

**Essai 1 — en processus** (`createStore` + `createHub` + faux `conn`) : compte
créé, salle créée, manche lancée, 60 s de simulation, joueur tué, `tick`.
Résultat : `room.state.vus = ['e:grunt']`, puis `client.profile.vus = ['e:grunt']`.

**Essai 2 — sur socket réelle** (`BANC=1 PORT=7791 node server.js`, client
WebSocket RFC 6455 écrit à la main, `bancPop: 300` pour mourir vite) :

```
PROGRESS vus = []
ROUNDEND victory = 0 time = 11
PROGRESS vus = ["e:grunt"]
```

**Sur une mort, la chaîne est saine de bout en bout** : `awardRun` fusionne,
`progressPayload` transporte, `ws_lite` livre, et `renderCodex()` lit la bonne
clef. Le lot ne touche donc pas à ce chemin — il ne doit pas le casser.

## La cause

`awardRun()` n'est appelé que par `room.js endRound()`, donc uniquement sur une
victoire ou une défaite. Les deux autres sorties de manche perdent tout :

```
room.js:1157   case "leaveRound":  → hooks.awardPartial(client, this)
room.js:492    detach(client)      → hooks.awardPartial(client, this)
room.js:1215   players.size === 0  → abortRound()   // n'appelle PAS awardRun
```

et `awardPartial` (`hub.js:208`) ne verse que des noyaux :

```js
function awardPartial(c, room) {
  if (room.phase === PHASE_LOBBY || !c.profile || !room.state.players.has(c.id)) return;
  c.profile.cores += coresPartial(room.state.level, room.state.diffIndex);
  persist(c);
}
```

Quitter par le menu pause, ou fermer l'onglet, rend donc des noyaux et **jette
toutes les rencontres de la manche**. C'est ce que montre le journal de l'hôte du
2026-08-31 :

```
[AU69] max quitte la manche 1
[AU69] manche 1 interrompue — plus aucun joueur en jeu
```

## La correction

Un point de passage unique, sur le modèle que `CLAUDE.md` impose partout :

```js
function mergerCodex(pr, state) {
  for (const cle of state.vus) if (!pr.vus.includes(cle)) pr.vus.push(cle);
}
```

appelé depuis `awardRun()` **et** `awardPartial()`, et de nulle part ailleurs.
`awardRun` perd sa boucle inline, et le commentaire qui l'accompagne change de
sens : ce n'est plus « `endRound` couvre les deux sorties », c'est **« une
rencontre ne dépend pas de la façon dont la manche se termine »**.

`awardPartial` garde sa garde `players.has(c.id)`. Elle vaut aussi pour le
codex : un **spectateur** entré à la dernière seconde hériterait sinon de tout ce
que la salle a vu depuis le début, ce qui ferait dépendre la collection du hasard
des connexions plutôt que du jeu.

## Le trou secondaire

`public/net/router.js`, `case "progress"` appelle `renderMeta()`,
`renderHautsFaits()` et `updateTerminalDot()` — **pas `renderCodex()`**. Un
`progress` reçu pendant que l'écran du codex est ouvert ne le rafraîchit pas.
`renderCodex()` commence déjà par `if (!codexEl || codexEl.hidden) return;`,
l'ajout est donc inconditionnel et gratuit.

## Ce qui n'est PAS un défaut, et qu'il faut savoir en testant

En local, sans `SUPABASE_URL` / `SUPABASE_SERVICE_KEY`, `progress_store.js`
n'écrit sur aucun disque : c'est **voulu**, l'environnement local est un
environnement de test. Chaque redémarrage du serveur recrée les comptes à zéro —
le journal le dit à chaque démarrage (« les comptes ne survivront PAS à un
redémarrage ») et à chaque connexion (« nouveau compte »).

Conséquence pratique pour la vérification ci-dessous : **le contrôle du codex se
fait sans redémarrer le serveur entre la manche et l'ouverture de l'écran.** Un
redémarrage remet la collection à « ? » sans que le lot y soit pour quoi que ce
soit.

## Vérification

1. Manche, deux ou trois types de corps tués, **sortie par le menu pause**,
   codex ouvert **sans redémarrage** : les types rencontrés sont ouverts.
2. Manche, mort : le comportement d'avant n'a pas changé — les deux essais
   ci-dessus donnent la référence.
3. Codex ouvert **pendant** qu'une manche se termine : la grille se met à jour
   sans qu'on ait à refermer l'écran.
4. `verifierCodex(profil.vus)` reste muet — il refuse toute clef enregistrée qui
   ne correspond à aucune entrée, seul garde-fou contre une clef mal formée qui
   se persisterait pour toujours.

## Ce que le lot ne fait pas

Aucune migration. `progress_store.js` normalise déjà `vus` à la lecture ; bumper
`PROG_CFG.VERSION` remettrait à neuf tout profil sans entrée de migration, ce que
le fichier dit l. 178-184.
