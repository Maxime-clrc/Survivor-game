# Plan 33 — le mode custom

**Adossé à `decisions-2026-09-03.md` v7, section XVIII.**

## Pourquoi il vient si tôt

Ce n'est pas un bonus pour joueurs. **C'est la dernière pièce du banc de mesure**,
et il ne prend son sens qu'avec les deux autres :

```
graine deterministe (plan 31)   →  deux manches identiques sont comparables
compte rendu de manche (plan 32) →  on voit ce qui s est passe dans les deux
mode custom (plan 33)            →  on ne change QU UNE chose entre les deux
```

Les trois ensemble donnent ce que le dépôt n'a jamais eu : **isoler une
variable.** Même graine, même biome, même effectif, un seul mutateur changé, et le
compte rendu dit ce que ça a fait — **avec de vrais joueurs**, pas avec un pilote
qui ne sait pas jouer deux armes sur quatre.

Il coûte peu : `DIFFICULTIES` **est déjà** la table de mutateurs demandée. Il n'y
a pas de système à écrire, il y a une table, une interface, une sérialisation et
quatre garde-fous.

## Les lots

```
01 la table des conditions   des rangs et un cout par rang, facon Hades
02 le mode, branche          index 3, construction au lancement, garde-fous
03 partage et prereglages    une chaine courte, versionnee
04 l interface               curseurs et cases, au cas par cas
```

## Les quatre garde-fous, et ils ne sont pas négociables

**1 · Index réservé.** `DIFFICULTIES` est append-only et son index circule
partout : message `round`, clef de `bestFinal` via `clefRecord`, index dans
`PROG_CFG.DIFF_MUL`. Le custom prend **3** et n'y touche plus.

**2 · Exclu du classement.** Une course dont chacun écrit les règles ne se compare
à rien. Le custom n'écrit pas dans `bestFinal`.

**3 · Exclu du revenu de noyaux et des hauts faits.** `PROG_CFG.DIFF_MUL =
[1, 1.4, 2]` **ne reçoit pas** de quatrième entrée. Sinon un mutateur « ×2 loot,
−50 % ennemis » devient la meilleure façon de farmer la méta, et toute la
progression hors manche s'effondre en une soirée. Même raison pour les hauts
faits : `pousserHautFait()` est le point de passage unique, un seul test à
l'entrée suffit.

**4 · `MAX_ENEMIES_HARD_CAP = 900` reste une limite de moteur.** Aucun mutateur ne
la dépasse. Ce n'est pas un réglage de difficulté, c'est le point au-delà duquel le
rendu et le réseau lâchent — et l'échec y est silencieux.

## Ce que ce plan ne fait pas

- Il n'ajoute aucun contenu : tous les leviers existent.
- Il ne touche pas aux trois modes existants.
- **La visibilité réduite** est le seul mutateur qui demanderait du travail neuf
  côté rendu, et il interagit avec la lisibilité de la horde. **Il n'est pas dans
  ce plan.**
