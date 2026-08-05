# Plan v5 — index

Sept lots, issus de la validation en équipe du récapitulatif. Deux
vérifications faites sur le code actuel changent la donne par rapport au
brainstorm initial :

- **Aucune caméra n'existe.** Le rendu est câblé sur l'arène entière (1600×900)
  tenant dans un seul écran. La grande arène (lot G) demande donc un système de
  caméra complet, pas un simple agrandissement de `CFG.ARENA_W/H`.
- **Aucun mécanisme de bannissement n'existe.** Le lot J part de zéro.

## Ordre recommandé

| # | lot | dépend de | pourquoi cette place |
|---|---|---|---|
| H | [Économie du Terminal](H-economie-terminal.md) | — | déjà cadré, aucune dépendance |
| I | [Grande arène et caméra](I-grande-arene.md) | — | le plus gros morceau technique, à isoler tôt |
| J | [Bannissement de cartes](J-ban-cartes.md) | — | indépendant |
| K | [Marchand et reliques](K-marchand-reliques.md) | I | payé par la monnaie de manche du lot I |
| L | [Vagues spéciales](L-vagues-speciales.md) | I | se déroulent sur la carte principale |
| M | [Nouveaux ennemis](M-nouveaux-ennemis.md) | — | indépendant, peut avancer en parallèle |
| N | [Boss final](N-boss-final.md) | tous les précédents (contenu) | doit voir passer tout le reste avant d'être calibré |

**N doit être fait en dernier.** Il réutilise des patterns des cinq boss
existants et doit être calibré une fois la difficulté des vagues (I), les
reliques (K) et les nouveaux ennemis (M) stabilisés — sinon il faudrait le
recalibrer à chaque lot suivant.

## Décisions actées par l'équipe

- **Le modèle de vague actuel (budget puis nettoyage) est conservé**, y compris
  sur la grande arène. Pas de passage à un modèle par durée.
- **Aucun danger de bordure de carte** dans cette itération.
- **Aucune incitation à rester groupé** au-delà de ce qui existe déjà : le
  rayon d'action limité du soigneur et du tank est assumé comme un coût
  d'exploration, pas un défaut à corriger.
- **Classement basé sur le temps** pour atteindre et vaincre le boss final —
  nouvelle conséquence directe du lot N, à prévoir dans la persistance.
- **Vagues spéciales sur la carte principale**, pas d'arène dédiée.
- **Réussir une vague spéciale rend 100 % des PV et du bouclier.**
- **Le ban interdit toute autre sélection dans le même palier de rareté** pour
  cette phase de cartes — sauf s'il existe un palier supérieur accessible dans
  la même phase, auquel cas il reste choisissable.
- **Trois nouveaux types d'ennemis**, pas plus, pour cette itération.

## Ce qui reste à valider par le porteur du projet

- **La liste de reliques de départ** (lot K) — proposée ici, à valider carte
  par carte.
- **Le système d'activation des vagues spéciales** (lot L) — le risque de
  fausser le classement au temps est identifié, la solution proposée est à
  valider.
- **La taille exacte de la grande arène** (lot I) et le rythme des points de
  récolte.

## Invariants du dépôt

Inchangés, à relire avant chaque lot (`CLAUDE.md`) :

- `shared/game_state.js` ne référence jamais le DOM, le canvas, le clavier, le
  réseau ni le système de fichiers.
- Snapshots en append-only, lecture client avec repli.
- Tableaux exportés ordonnés, index circulant sur le réseau.
- Tout ce qui blesse passe par `_hurt()` / `_damage()`.
- Les systèmes lisent `p.mods`, jamais la liste de cartes.
- Le serveur valide tout choix client.
- Commentaires et identifiants en français sans accents, chaînes affichées avec
  accents.
- Mesurer, ne pas extrapoler.
- Toute mesure de progression précise son profil de compte (neuf / maximal).
