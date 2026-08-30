# 04 · Hauts faits (brief §6) — réparation puis refonte visuelle

Ce chantier a **deux phases distinctes**, à ne pas confondre : l'écran est
actuellement cassé (mesuré au plan 25), la refonte visuelle demandée par le
brief ne peut pas être évaluée tant que la phase 1 n'est pas faite.

## Phase 1 — Réparation structurelle (préalable non négociable)

### Constat (plan 25, mesuré sur le code actuel)

`#hautsFaits` est enregistré à **1 point sur 9** (`TOPBAR_SCREENS`
seulement). Conséquences concrètes :
- l'écran disparaît d'un coup à la fermeture au lieu de sortir en transition
  croisée comme les 13 autres écrans ;
- ses **14 contrôles** (filtres/cadres) sont muets en son ;
- son nœud DOM est recherché par `getElementById` à 4 endroits différents au
  lieu d'un lookup centralisé.

### Étapes

1. Ajouter `#hautsFaits` dans `public/ui/dom.js` (référence DOM centralisée).
2. L'ajouter à l'observateur d'écrans et au fil/masque de `screens.js`.
3. L'ajouter à `UI_SOUND_SCREENS`/`UI_CLICK_SCREENS` pour que les 14
   contrôles sonnent comme `#cards`/`#build`.
4. Ajouter l'entrée/sortie CSS (croisement 280/380 ms, cohérent avec les 13
   autres écrans).
5. L'ajouter au balayage `[hidden].leaving` et aux deux listes de curseur.
6. Vérifier contre la table des 9 points du plan 25 (`docs/superpowers/specs/plan25/README.md`
   §1) que les 9 cases sont maintenant à « oui ».

Ces six étapes se font **avant** toute modification visuelle : elles ne
changent rien à l'apparence de l'écran, seulement à son comportement.

## Phase 2 — Refonte visuelle (demande du brief)

### Ce qui existe déjà côté données

- `shared/hauts_faits.js` : `HAUTS_FAITS` (liste complète), `CADRES` (système
  de cadres/badges déjà nommé, `CADRE_DEFAUT` + variantes), `HF_NIVEAUX`
  (`simple`/`intermédiaire`/`défi` — la difficulté existe déjà comme donnée),
  `hfProgres(id, stats)` (progression calculée), `REWARD_LABEL` (récompenses
  nommées).
- Autrement dit : **verrouillé / en progression / obtenu**, **difficulté**,
  **badge/cadre**, **progression chiffrée** sont tous déjà des données
  disponibles côté `shared/`. Le chantier est un chantier d'affichage, pas de
  modélisation — aucune nouvelle donnée à inventer côté simulation.

### Cible

Grille de cartes de collection plutôt que liste, avec icône/badge, titre,
description, progression, difficulté, récompense visibles par carte ;
distinction visuelle claire des 3 états ; animation de déblocage ; filtres.

### Décomposition

1. **Grille de cartes** — remplacer la liste par une grille dans
   `public/ui/cadres.js` (déjà responsable de l'affichage des cadres), en
   consommant `HAUTS_FAITS` + `hfProgres` + `CADRE_BY_ID` sans changement de
   shape de données.
2. **États verrouillé/en progression/obtenu** — trois traitements visuels
   distincts d'une même carte, pilotés par `hfProgres` (déjà 0..1 ou booléen
   selon les hauts faits — vérifier la forme exacte avant de coder l'état
   intermédiaire).
3. **Valorisation des hauts faits difficiles** — `HF_NIVEAUX` donne déjà
   3 paliers ; leur donner un traitement visuel distinct (bordure/lueur du
   cadre) plutôt qu'un nouveau champ de donnée.
4. **Animation de déblocage** — réutiliser le pipeline de popup style Steam
   déjà en place (mentionné en mémoire de projet comme existant) plutôt que
   d'écrire un nouveau système de notification.
5. **Filtres/catégories** — par cadre (`CADRES`) et par niveau (`HF_NIVEAUX`)
   suffisent pour la V1 ; éviter d'ajouter un troisième axe de filtre tant
   que le nombre de hauts faits reste dans l'ordre de grandeur actuel.
6. **Lecture immédiate** — contrainte explicite du brief : limiter chaque
   carte à icône + titre + barre de progression + récompense en vue grille,
   description complète seulement au survol/sélection (pas de mur de texte
   par défaut).

## Fichiers à modifier

- `public/ui/dom.js`, `public/ui/screens.js`, CSS de menu (phase 1)
- `public/ui/cadres.js` (phase 2, cœur du chantier)
- `shared/hauts_faits.js` — lecture seule a priori ; si l'état intermédiaire
  « en progression » manque d'un champ exploitable, l'ajouter en fin de
  structure (append-only)

## Risque

Phase 1 : aucun (correction de bug, pas de nouveau comportement). Phase 2 :
faible — écran hors-partie, pas de contrainte réseau/tick, le seul risque est
la lisibilité si le nombre de hauts faits croît sans re-vérifier la densité
de la grille.
