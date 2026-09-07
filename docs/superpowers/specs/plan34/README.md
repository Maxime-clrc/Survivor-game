# Plan 34 — les contrats

**Adossé à `decisions-2026-09-03.md` v7, section XIV.**

Le premier plan qui ajoute du contenu. Il commande les deux suivants : le
mini-boss et le loot n'ont de sens que comme récompenses d'un objectif, et le
Director aura besoin de pouvoir en proposer un.

## Ce qui existe et qui sert de socle

`EVENTS` (`shared/timeline.js`) est **déjà** une table purement déclarative — six
entrées portant `key`, `nom`, `level`, `texte`, `types[]`, `rateMul`,
`minPlayers`, `fallback`. Son commentaire le dit : *« un événement n'est qu'un
tableau de types, un multiplicateur de taux et une annonce : rien à écrire dans la
simulation »*.

Le cycle est écrit : `_openEvent()` lit le battement, adapte à l'effectif, pousse
l'annonce ; `_closeEvent(parBeat)` décide de la réussite ; `_eventReward()` verse.

**Contrainte permanente : `EVENTS` est append-only**, son index circule dans le
snapshot. Les contrats s'ajoutent à la fin ; `EV_CHASSE` ne peut pas disparaître,
seulement être redéfini.

## Les lots

```
01 la borne              un objet du monde, un marqueur, une touche
02 les objectifs         la table des contrats et leurs compteurs
03 le suivi HUD          le premier element persistant du HUD de jeu
04 les sept sons         ecrits en une fois, pas un par lot
```

## Les décisions déjà prises

- une **borne** posée sur la map, trouvée en jouant, **elle ne disparaît pas** si
  on l'ignore ;
- le contrat est **tiré à l'activation**, pas fixé à la graine ;
- **un seul contrat actif à la fois** ;
- touche **`F`**, générique — pas « la touche contrat » ;
- marqueur **« ! » / « ? »** au-dessus de la borne ;
- suivi **à gauche** du HUD, façon FFXIV ;
- récompenses en **éclats et loot**, jamais en XP.

## Le point de vigilance du plan

Un contrat doit se lire **en une phrase** et se faire **sans quitter longtemps**
ce qu'on faisait. Le fond du jeu reste la horde. Un contrat qui devient un combat
de boss dilue le mini-boss ; un contrat obligatoire n'est plus une décision, c'est
une corvée.
