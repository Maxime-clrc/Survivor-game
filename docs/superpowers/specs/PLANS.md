# Survivor LAN — les plans 31 à 37

**3 septembre 2026.** Issus de `decisions-2026-09-03.md` v7, lui-même issu du
brainstorming d'évolution et de six tours de R&D sur le dépôt **0.33.1**.

**Le brainstorming est couvert en entier.** Chacun de ses 34 points est soit
planifié ci-dessous, soit explicitement abandonné, soit déjà fait — le détail est
dans le document de décisions, sections I à III.

## L'enchaînement

```
plan 30  (en cours)   courbe d XP, boss, armes
   │                  ⚠ ses valeurs sont a REMESURER apres le plan 35, pas a reconduire
   ▼
plan 31  fondations   classement · determinisme · grilles bornees ·
   │                  horde par groupe · chevron unique · doctrine XP
   ▼
plan 32  outillage    ?mesure retire · compte rendu · trous de donnees ·
   │                  releve client · LES DEUX INDICES · anomalies
   ▼
plan 33  mode custom  conditions a rangs · index 3 · partage · interface
   │                  ← le banc de mesure est complet a ce stade
   ▼
plan 34  contrats     la borne · les objectifs · le suivi HUD · LES SEPT SONS
   ▼
plan 35  mini-boss    le mini-boss · le loot au sol · trois statistiques ·
   │      + loot      l equilibrage
   ▼
plan 36  Director     table de choix fermee · les etats · calibration
   ▼
plan 37  la map       quatre variantes par theme · 9600 x 5400 · le ping
```

## Pourquoi cet ordre

**Les fondations d'abord**, parce que tout ce qui suit se mesure et que trois
défauts mesurés empirent avec la map : le hasard global, les deux coûts de
surface, et la horde tirée au sort quand les joueurs se séparent.

**L'outillage en troisième**, parce que tout ce qui vient après demande une
décision humaine — accepter un contrat, aller chercher un mini-boss, ramasser un
loot — et qu'**aucun bot ne mesurera ça**. `LISEZMOI.md` admet déjà que le pilote
de banc ne sait pas jouer deux armes sur quatre et qu'il ne récolte pas.

**Le mode custom en quatrième**, parce qu'il complète le banc. Graine
déterministe + compte rendu + mutateurs = **isoler une variable**, ce que le
dépôt n'a jamais pu faire.

**Les contrats avant le mini-boss et le loot**, parce qu'ils sont ce qui les
justifie.

**Le Director en avant-dernier**, parce que sa mesure de tension part avec
l'outillage et sera tracée pendant quatre plans. Il se calibre alors sur des
courbes réelles au lieu de valeurs devinées.

**La map en dernier**, parce que « une map plus grande, pour y mettre quoi ? »
n'a de réponse qu'une fois le reste écrit — et parce qu'à ce stade elle ne coûte
plus rien.

## Trois traversées

Trois choses ne tiennent dans aucun plan et se retrouvent dans plusieurs.

**Retirer n'est pas tuer.** `_killEnemy()` est le point de passage unique de toute
**mort** : XP, cumuls, hauts faits, butin. Un corps qui **part** — recyclé au loin,
mini-boss qui se retire — n'y passe pas. Écrit au plan 31 lot 06, utilisé aux plans
31 et 35.

**Les objectifs ne paient jamais en XP.** `_addXp` a deux appelants —
`_killEnemy()` et `_damage()` pour le boss, au prorata des dégâts. `_eventReward()`
n'en fait pas partie : **la règle est déjà respectée aujourd'hui**, on la préserve.

**Les sept sons s'écrivent en une fois.** Le dépôt a payé le défaut inverse —
« treize bonus rendaient la même quinte montante ». Écrits au plan 34, branchés
plan par plan.

## Deux corvées, avant le premier lot

- **régénérer `LISEZMOI.md` § Réglages**, périmé : il annonce `ARENA_W/H:
  1600 x 900` (c'est 4800 × 2700) et `BOSS_HP_BASE: 1200` (c'est 520).
  `npm run constantes-check` attrape une constante sans lecteur, pas une doc qui
  invente une constante ;
- **inscrire dans le document du plan 30** que ses valeurs calibrées supposent que
  toute la puissance vient des niveaux, des cartes et des reliques — et qu'elles
  seront à **remesurer, pas à reconduire**, après le plan 35.
