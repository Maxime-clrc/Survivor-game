# Plan 32 — l'outillage de mesure

**Adossé à `decisions-2026-09-03.md` v7, section XI.** Il vient juste après les
fondations parce que **tout ce qui suit se mesure**, et parce qu'il est le seul
instrument capable de voir ce que les bots ne savent pas faire.

## L'argument, et il n'est pas la quantité de contenu à venir

Tout ce que le dépôt mesure aujourd'hui est mesuré **sur des bots**.
`mesureTTK`, `mesureArmes`, `mesureContribution`, `mesurePopulation` : le pilote
est `botInput`, qui vise le corps le plus proche et recule à 260 px. `LISEZMOI.md`
l'admet — *« le pilote ne savait pas jouer deux des quatre armes »*, et deux hauts
faits restent non concluants *« parce que le pilote ne récolte pas et achète
peu »*.

Un contrat qu'on accepte, un mini-boss qu'on choisit d'aller chercher, un loot
qu'on va ramasser : **aucun bot ne mesurera ça.** L'angle mort grandit à chaque
système qui demande une décision humaine, et les quatre plans suivants n'en
ajoutent que de ceux-là.

## Ce qui existe déjà, et c'est beaucoup

Trois outils, trois destinations, aucun ne se parle.

| | armé par | mesure | va où |
|---|---|---|---|
| **trace** `telemetry.js` | `?mesure` dans l'URL | le **serveur** | fichier JSONL sur la VPS |
| **relevé** `REL` (`world.js`) | `?banc` + touche `R` | le **client** | presse-papier |
| **bandeau** (`hud.js:1276`) | `?perf` | le client | l'écran, puis rien |

La trace est de la vraie télémétrie : en-tête complet (version, salle, manche,
difficulté, variante de script, biome, **graine**, effectif, et par joueur sa
classe, ses noyaux, ses jalons et sa **doctrine méta active**), échantillon à 1 Hz
(temps, segment, battement, niveau, XP, population, plafond, vivants, kills,
météo, événement, état du boss, et par joueur PV, bouclier, à terre, dégâts,
soins, kills, morts, **puissance**), lignes d'événement toutes **déduites par
comparaison** avec l'image précédente — la simulation ne sait pas qu'on l'observe.

Le relevé client sait déjà ce qu'il mesure : le commentaire de `relever()` porte
son propre raisonnement — *« le p95 ne suffit pas : sur 105 images dont 5 à 45 ms,
la pointe pèse 4,76 % et le p95 tombe juste en dessous d'elle »*.

**Le défaut n'est pas la capture. C'est que rien ne relie une image qui saute à ce
qui se passait dans la simulation, et qu'il faut un accès SSH pour lire une
mesure.**

## Les lots

```
01 armement et compte rendu   ?mesure disparait, une option de salle,
                              une page a copier-coller
02 les trous de donnees       degats infliges ventiles, p.contrib, ligne carte
03 le releve client remonte   par segment, jusqu au serveur
04 les deux indices           tension et survie — mesures, ne pilotant rien
05 les anomalies              le compte rendu cherche de lui-meme
```

Le lot 04 est celui qui n'a l'air de rien et qui décide de la qualité du plan 36.

## Ce que ce plan ne fait pas

- **Aucun système de jeu.** Rien de ce qu'il mesure n'est nouveau.
- **Le Director n'est pas ici.** Le lot 04 livre la mesure de tension, et elle ne
  pilote **rien**. C'est délibéré : voir son lot.
- **Pas de rotation des traces sur disque.** `traces/` n'en a aucune aujourd'hui ;
  c'est de l'exploitation, à traiter à part.
