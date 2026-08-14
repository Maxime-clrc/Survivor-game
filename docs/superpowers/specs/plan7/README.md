# Plan 7 — ressenti

Deux lots. Le plan 7 ne touche **aucune valeur d'équilibrage** : il est
parallélisable avec le plan 6, à une exception près (L1-2, le recul, qui touche
la simulation — voir la note de fin).

| lot | objet |
|---|---|
| **[L1](L1-ressenti.md)** | retours de combat : explosions, arcs, audio, coopératif, critiques |
| **[L2](L2-soigneur.md)** | refonte du soin du Soigneur en **lien continu** sur les alliés proches |

⚠ **L2 dépend du lot I du plan 6** — il déplace l'équilibre entre classes, et le
lot I mesure justement la valeur des compositions. Les deux se mesurent ensemble,
sinon le lot I conclut sur une classe qui n'existe déjà plus.

## Le principe qui commande tout le lot 1

Un jeu de combat, c'est ~5 impacts par seconde : chacun peut être un événement.
Un survivor à la minute 25, c'est **20 à 60 morts par seconde**. Si chaque mort
est un événement, plus rien n'en est un — et le limiteur de voix `admit` de
`audio.js` existe parce que ce mur a déjà été rencontré.

> La satisfaction ne vient pas de l'impact **individuel**, elle vient de la forme
> de la **masse**.

D'où une hiérarchie où la fréquence d'un événement détermine **inversement** son
budget de retour :

| palier | fréquence | budget |
|---|---|---|
| 0 · touche | centaines/s | quasi rien — le flash 1 image déjà en place |
| 1 · mort d'un ennemi | 20-60/s | **jamais individuel**, uniquement agrégé |
| 2 · fait notable (critique, élite, récolte) | quelques/s à quelques/min | différencié par **couleur et hauteur**, jamais par volume |
| 3 · moment de manche (niveau, barre de boss, relèvement) | ~30/manche | tout le budget |

Chaque item du lot 1 déclare le palier auquel il appartient. C'est le critère qui
tranche les arbitrages en cours d'écriture.

## Contraintes du moteur, relevées dans le code

- **`BLEND_ADD` existe déjà** (`gl.blendFunc(gl.ONE, gl.ONE)` via `r.setBlend`).
- **Une seule primitive** : `r.quad()` — quad texturé de l'atlas, avec teinte,
  alpha et facteur de flash. Pas de ligne, pas de shader par effet. Tout ce qui
  suit se fait en quads.
- **L'atlas est généré proceduralement** au canvas 2D dans `sprites.js`. Les
  nouveaux sprites se cuisent au démarrage : **aucun asset à dessiner**.
- **`setFlashColor` est un uniforme global**, pas un attribut par quad. Toute
  couleur de flash distincte impose un second lot de dessin (voir L1-6).

## Écarté

- **Screen shake (ancien item 5)** — retiré de la sélection.
- **Étouffement audio du dernier debout (23)** — retiré.
- **Chiffres de dégâts sur la HORDE (24)** — à 600 ennemis, mur de texte. Ils
  sont en revanche **activés par défaut sur les boss** : voir L1-7 [31].
- **Second passage de shader (25)** — reporté : le halo se fake en quads
  additifs, et le budget GPU va au remplissage à 622 ennemis.
