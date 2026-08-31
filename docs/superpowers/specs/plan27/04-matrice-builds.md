# 04 · La matrice de builds (brief §12)

Annoncée comme livrable de plan 26, jamais produite. Ce qui **a** été livré est
sa moitié amont : `ARCHETYPES` et `archetypeDe(owned)` (v0.29.15), qui
détectent l'archétype d'une build en cours et l'affichent en insigne.

Ce chantier produit la moitié aval : **savoir si chaque archétype est
atteignable**.

## 1 · L'asymétrie, relevée le 2026-08-31

Sept archétypes, seuil identique de **3 cartes**, mais un support très inégal :

| archétype | familles | cartes de famille | graines | bassin total |
|---|---|---|---|---|
| **sniper** | 2 — `portee`, `critique` | 8 | 5 | **13** |
| **berserker** | 1 — `execution` | 4 | 4 | 8 |
| **demolition** | 1 — `souffle` | 4 | 4 | 8 |
| **acrobat** | 1 — `mobilite` | 4 | 3 | 7 |
| **forteresse** | 2 — `survie`, `bouclier` | 8 | 2 | **10** |
| **technicien** | 1 — `recharge` | 4 | 2 | 6 |
| **incendiaire** | 1 — `brulure` | 4 | 1 | **5** |

*(cartes de famille = 4 paliers par famille, `FAMILY_TIERS`)*

**Sniper a treize cartes pour franchir un seuil de trois. Incendiaire en a
cinq.** À tirage égal, ces deux archétypes ne se rencontrent pas à la même
fréquence — et rien dans le code ne le dit.

C'est précisément ce que le brief §12 demande de savoir.

## 2 · La mesure

Le tirage est déjà écrit (`shared/cards.js`, offre par rareté, familles d'arme
filtrées sur l'arme portée, paliers inférieurs retirés quand le supérieur est
pris). **On ne le remodélise pas — on l'appelle.**

Protocole : N parties simulées (N ≥ 2000), une build jouée jusqu'au bout par
une politique de choix simple, puis `archetypeDe()` sur la build finale.

Trois politiques, parce qu'une seule ne dit rien :

| politique | ce qu'elle mesure |
|---|---|
| **aléatoire** | la fréquence de base, sans intention |
| **gloutonne** — prend toujours la carte de plus haute rareté | ce que fait un joueur qui ne planifie pas |
| **dirigée** — vise un archétype donné, prend toute carte qui y mène | **l'atteignabilité réelle**, la seule qui répond au §12 |

Sortie : une matrice `archétype × politique` donnant le taux d'obtention.

## 3 · Ce que le résultat autorise

- Un archétype **inatteignable même en politique dirigée** est un archétype qui
  n'existe pas. Deux corrections possibles, dans cet ordre de préférence :
  lui ajouter une **graine** (une carte existante peut souvent être rattachée
  sans être réécrite), ou abaisser son `seuil`.
- Un archétype atteint **par accident** en politique aléatoire est un archétype
  trop large — son insigne ne veut rien dire.
- **`familles` n'est pas un axe libre.** `family` porte l'échelle verticale et
  est lu par la logique de tirage : y toucher change ce qui est offert. Une
  correction passe par `graines`, qui n'est lu que par `archetypeDe`.

## 4 · Dépendance

Ce chantier vient **après** `01` et `02` : les reliques du lot `01-b` et la
décision du lot `02-b` changent le bassin de cartes. Une matrice mesurée avant
décrirait un état intermédiaire.

## 5 · Lot

| lot | contenu |
|---|---|
| **a** | script de simulation de tirage, trois politiques, matrice consignée dans `LISEZMOI.md` ; correction **par `graines` ou `seuil` seulement**, et uniquement pour les archétypes que la mesure montre inatteignables |
