# Survivor LAN — plan 26 : montée en qualité perçue (AAA stylisé)

Ce plan répond au *Brief brainstorming — évolution AAA*. C'est une **phase
d'audit et de cadrage**, pas d'implémentation : chaque chantier ci-dessous est
décomposé en cible, étapes et fichiers, mais rien n'est codé.

Le brief demandait de vérifier chaque piste contre le code réel avant de
proposer quoi que ce soit. C'est fait : chaque affirmation ci-dessous est
adossée à un fichier, une ligne, ou — pour la carte de surchauffe — une
simulation numérique (`sim/surchauffe2.mjs`, résultats § 6).

---

## 1 · Ce que l'audit a trouvé avant même d'ouvrir le brief

Trois éléments changent la lecture de plusieurs chantiers :

1. **Le système de Hauts faits que le brief veut « refondre » est actuellement
   cassé.** Le plan 25 (dernier plan livré, v0.28.8) a mesuré que `#hautsFaits`
   n'est enregistré qu'à 1 point sur 9 (`ui/screens.js`, `ui/dom.js`) : l'écran
   disparaît d'un coup au lieu de sortir en transition, ses contrôles sont
   muets, aucun son. **Avant toute refonte visuelle, ce chantier commence par
   une réparation structurelle**, sans quoi on habille un écran qui ne
   fonctionne pas. Voir `04-hauts-faits.md`.
2. **Le système de zones de feu existe déjà avec une vraie donnée de
   gameplay** (`shared/biomes.js` : danger `flaque`, rayon + dégât par tick),
   comme le brief le suppose. Le chantier VFX est donc bien un chantier de
   *rendu seul* (`public/render/fx.js`), sans toucher à la simulation — le
   risque réseau/équilibrage que le brief redoute est faible ici.
3. **La chaleur du laser est un système générique, pas un cas spécial.**
   `ARME_CFG.CHALEUR_*` et `p.armeRes` (`shared/game_state.js:1592-1645`) sont
   déjà écrits pour n'importe quelle arme marquée `chaleur: true`. La carte de
   surchauffe manuelle (chantier 9) n'invente rien : elle bascule une arme
   d'auto à manuel et lui attache ce système existant. Ça change complètement
   le risque perçu du chantier — voir `06-surchauffe-manuelle.md`.

Le reste de l'audit (bestiaire, cartes, maps) est détaillé dans chaque fichier
de workstream.

## 2 · Fichiers de ce plan

| fichier | chantiers du brief couverts |
|---|---|
| `01-bestiaire-codex.md` | §3 |
| `02-vfx-feu.md` | §4 |
| `03-menu-architecture.md` | §5, ossature pour §3/§6 |
| `04-hauts-faits.md` | §6 |
| `05-audit-cartes-reliques.md` | §7, §8, §10 |
| `06-surchauffe-manuelle.md` | §9 (avec simulation chiffrée) |
| `07-maps-composition-cyberpunk.md` | §11, §12, §13 |
| `08-polish-p2.md` | §14, §15, §16, §17 (regroupés : chantiers de finition, plus légers individuellement) |

## 3 · Priorisation (reprise et vérifiée contre le code)

La priorisation du brief est globalement confirmée. Un changement : la
réparation du Hauts faits passe **avant** sa refonte visuelle et avant le
Bestiaire (qui doit s'accrocher au même menu).

| ordre | chantier | pourquoi maintenant | dépend de |
|---|---|---|---|
| **P0-a** | Réparation `#hautsFaits` (les 9 points d'enregistrement) | bug bloquant, pas un choix de design | — |
| **P0-b** | Audit cartes/reliques/builds | aucun design de contenu n'est fiable avant | — |
| **P0-c** | Refonte VFX flaques de feu | gain visuel immédiat, aucun risque réseau/sim | — |
| **P0-d** | Architecture de navigation du menu | Bestiaire et Hauts faits s'y accrochent | P0-a |
| **P0-e** | Refonte visuelle Hauts faits | maintenant que l'écran fonctionne et a une place | P0-a, P0-d |
| **P1-a** | Bestiaire/Codex | nouvel écran, doit s'intégrer à l'architecture P0-d | P0-d |
| **P1-b** | Audit composition maps/props | méthode avant contenu | P0-b (les cartes de zone influent sur la lecture du décor) |
| **P1-c** | Nouvelle map cyberpunk | vitrine — vient après la méthode de composition | P1-b |
| **P1-d** | Étude surchauffe manuelle | simulation livrée dans ce plan, prototype ensuite | P0-b (interactions cartes) |
| **P2** | Matériaux/lumière, réactions ennemis, audio, archétypes de build | polish, dépend des piliers P0/P1 | tout ce qui précède |

## 4 · Risques transverses (valables sur tout le plan)

- **Simulation autoritaire** : aucun chantier de ce plan ne touche
  `shared/game_state.js` sauf la surchauffe manuelle (chantier 9) et
  l'ajout de champs de découverte au bestiaire (compteurs par joueur —
  append-only, voir `01-bestiaire-codex.md`).
- **Réseau** : le bestiaire doit décider si la découverte est un état
  **par compte** (persisté via `progress_store.js`, comme les hauts faits)
  ou **par partie**. Le brief ne tranche pas — recommandation dans
  `01-bestiaire-codex.md`.
- **Performance** : le chantier le plus sensible est le VFX feu (particules
  supplémentaires en pleine horde) — budgets et paliers de qualité proposés
  dans `02-vfx-feu.md`.
- **Dette** : `ELITE_INTERDIT`, `ROLE_CFG`, `adaptType` dans `enemies.js`
  montrent un bestiaire déjà instrumenté pour des variantes — le Codex doit
  lire ces structures plutôt que dupliquer une liste de noms.

## 5 · Idées à signaler comme faibles ou coûteuses (demande explicite du brief, §19.13)

- **Fusionner « archétypes de build » (§17) dans la refonte du catalogue de
  cartes (§7) plutôt que d'en faire un chantier séparé.** Une fois l'audit de
  185→178 cartes fait et les familles de build identifiées, le badge
  d'archétype est un sous-produit d'affichage, pas un système à part. Le
  garder séparé (comme le fait le brief, P0 vs P2) risque de faire deux
  passes sur la même donnée.
- **La progression de découverte « progressive » du Bestiaire (§3, plusieurs
  rencontres avant fiche complète) est une bonne idée UX mais coûte un
  compteur par (joueur, entité) supplémentaire sur un système déjà
  append-only et networké.** Recommandation : livrer d'abord la version
  binaire (vu / pas vu), mesurer l'appétit joueur, ajouter la progression
  en incrément si demandée. Le brief lui-même la présente comme optionnelle
  (« réfléchir à »).
- **Le classement du Bestiaire par biome, type ET niveau de découverte en
  même temps (§3) est probablement un filtre de trop dès la V1.** Un tri par
  catégorie (ennemis/boss) suffit tant que le total reste sous ~20 entrées.

## 6 · Simulation livrée dans ce plan

`sim/surchauffe2.mjs` (inclus dans l'archive) simule le DPS de Tir standard
(interval 0,16 s, dégâts 12 → DPS de base 75) sous 5 profils de joueur avec un
modèle de chaleur calqué sur celui du laser. Résultats et recommandation de
tuning : `06-surchauffe-manuelle.md` §2.

---

*Analyse et plans uniquement — aucune implémentation dans cette phase, comme
demandé par le brief.*
