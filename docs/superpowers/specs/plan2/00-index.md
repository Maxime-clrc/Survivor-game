# Plan v2 — corrections, économie de progression, identité visuelle

Quatre lots, dans l'ordre. Les deux premiers sont courts et corrigent des
défauts identifiés en jeu ; les deux suivants sont la refonte visuelle.

| # | lot | nature | dépend de |
|---|---|---|---|
| 1 | [Corrections et lisibilité](01-corrections.md) | dette | — |
| 2 | [Économie de progression](02-economie.md) | équilibrage | — |
| 3 | [Socle visuel — menus et cartes](03-socle-visuel.md) | identité | — |
| 4 | [Identité en jeu — arène, HUD, monstres](04-identite-jeu.md) | identité | 3 |

Les lots 1 et 2 sont indépendants et peuvent se faire dans n'importe quel
ordre. Le lot 3 pose les jetons de design que le lot 4 consomme : ne pas
inverser, sinon la charte est écrite deux fois.

## Ce qui a été constaté en jeu

Les défauts qui motivent ce plan, tels qu'observés :

- **Les descriptions de cartes sont en pixels** — une unité qui ne veut rien
  dire pour un joueur. « ramasse les bonus au sol à 120 px ».
- **On ne voit pas ce qu'on possède.** Lames orbitales prises en même temps que
  le champ de givre : les deux se dessinent en anneau autour du personnage, à
  des rayons proches, et les lames disparaissent dans l'aura.
- **La bombe part toujours à la même distance** (21 m), quelle que soit la
  position du réticule. Elle est « lancée devant soi » et non visée.
- **Trop de légendaires en solo.** La rareté a été mesurée puis calibrée, mais
  visiblement pas sur toutes les configurations d'effectif.
- **Les bonus au sol font doublon** avec les cartes permanentes depuis que ces
  dernières sont fréquentes.
- **Le HUD est illisible.** Cause racine identifiée au lot 4 : il est dessiné
  dans le canvas, donc il rétrécit avec lui.
- **Les chiffres de dégâts ne sont que sur le boss**, et rien n'indique les
  dégâts subis.
- **Les joueurs sont indistinguables par classe** — même cercle pour les trois.
- **Le jeu n'a pas d'identité visuelle**, il a une cohérence par défaut.

## Invariants du dépôt

Inchangés, à relire avant chaque lot (`CLAUDE.md`) :

- `shared/game_state.js` ne référence jamais le DOM, le canvas, le clavier ou
  le réseau.
- Snapshots en append-only, lecture client avec repli.
- Les tableaux exportés sont ordonnés, leur index circule sur le réseau —
  **sauf `cards.js`, dont les identifiants sont des chaînes.**
- Tout ce qui blesse passe par `_hurt()` / `_damage()`.
- Les systèmes lisent `p.mods`, jamais la liste de cartes.
- Le serveur valide tout choix client.
- Commentaires et identifiants en français **sans accents**, chaînes affichées
  **avec accents**.
- Mesurer, ne pas extrapoler.

## Une règle nouvelle, à ajouter à `CLAUDE.md`

**Les distances s'affichent en mètres, jamais en pixels.** La simulation reste
en pixels — c'est une conversion d'affichage et rien d'autre. Voir le lot 1.
