# 07 · Maps — composition authored, nouvelle map cyberpunk, monde vivant (brief §11, §12, §13)

## Ce qui existe déjà

- `shared/biomes.js` : 4 biomes (`usine`, `fonderie`, `friche`, `nebuleuse`),
  générateur déterministe par graine, dangers (`geyser`, `flaque`, `braise`,
  `ralenti`, `glissant`), météos (`brume`, `bourrasque`, `cendres`).
- `public/render/props.js` : `drawProps()`, semis déterministe par cellule,
  **déjà tagué par lieu** — extrait de `shared/biomes.js` : props `chaine`,
  `machine`, `poste` pour `usine` ; `four`, `conduite`, `cuve` pour
  `fonderie` ; `ruine`, `mur`, `carcasse` pour `friche` ; `fragment`,
  `travee`, `debris` pour `nebuleuse`. **La notion de « prop qui appartient à
  un biome » existe déjà** — ce qui manque, comme le brief le dit
  correctement, c'est la notion de *zone fonctionnelle* au-dessus (stockage,
  production, circulation…), pas la donnée de prop elle-même.
- `public/render/material.js` : cuisson du sol par `(biome, mode, graine)` —
  substrat pour la couche de matériaux du §14 (voir `08-polish-p2.md`).
- `public/render/lumiere.js` : système à deux canaux déjà utilisé pour les
  transitions boss — réutilisable pour l'ambiance nocturne cyberpunk.

## 7a · Composition authored (brief §11)

### Cible

Passer d'un placement de props par cellule (fonctionnellement aléatoire dans
sa distribution même s'il est déterministe dans son calcul) à une
composition par **zones fonctionnelles**.

### Décomposition

1. **Introduire une couche « zone » au-dessus du semis actuel**, sans casser
   la génération déterministe : chaque biome se découpe en un petit nombre
   de zones fonctionnelles typées (stockage/production/maintenance/
   circulation/accès/déchets/sécurité — le brief liste ces catégories,
   toutes plausibles pour `usine`/`fonderie` ; `friche`/`nebuleuse` auront
   probablement un sous-ensemble différent, à définir par biome plutôt que
   d'imposer les 7 catégories partout).
2. **Hiérarchie de placement** : architecture majeure (déterminée par zone)
   → props intermédiaires (contraints à être cohérents avec la fonction de
   la zone, via une table zone→props autorisés plutôt qu'un tirage global) →
   micro-détails (câbles, débris, salissures — déjà dans l'esprit de
   `props.js`, à enrichir).
3. **Anchor points / clusters / contraintes de voisinage** : le système
   actuel place par cellule indépendamment ; ce chantier ajoute une
   contrainte de corrélation locale (un prop de zone "maintenance" attire
   des props compatibles à proximité) sans changer le fait que tout reste
   dérivé de la graine.
4. **Conserver déterminisme et performance** — condition explicite du brief
   et invariant du dépôt (`CLAUDE.md` : zéro `Math.random`, mesuré muet par
   `verifierAmers`/`verifierEmpreinte` au plan 25). La couche de zones doit
   rester une fonction pure de `(biome, graine, cellule)`.

### Fichiers

- `shared/biomes.js` (définition des zones par biome)
- `public/render/props.js` (règles zone→props, clusters)
- `docs/regles/SIMULATION.md` (si la zone influence des dangers de gameplay)
  ou `docs/regles/RENDU.md` (si purement visuel — à trancher : le brief ne
  demande pas de gameplay lié à la zone, recommandation : rendu seul en V1)

## 7b · Nouvelle map cyberpunk (brief §12)

### Constat

Aucun biome cyberpunk n'existe actuellement (les 4 biomes listés dans
`shared/biomes.js` sont tous industriels/spatiaux). C'est un cinquième
biome complet, pas une variante — et **la table d'historique de
`shared/version.js` traite `BIOMES` comme un tableau append-only** : l'ajout
est sûr côté versioning tant qu'il se fait en fin de liste.

### Décomposition

1. Définir le biome `cyberpunk` dans `shared/biomes.js` avec ses propres
   props (premier plan : rues/containers/véhicules ; milieu : bâtiments/
   passerelles/enseignes ; arrière-plan : skyline/circulation lointaine),
   suivant la même structure `lieu:` que les 4 biomes existants.
2. Appliquer la composition authored du §7a **dès la conception** de ce
   biome plutôt que de le composer à l'ancienne puis le migrer — c'est le
   candidat naturel pour valider la méthode de zones en conditions réelles,
   comme le brief le suggère lui-même (§18 : « terrain idéal pour appliquer
   la nouvelle philosophie »).
3. Profondeur premier plan / gameplay / arrière-plan : utiliser la même
   séparation de plans que `public/render/world.js`/`decor.js` gèrent déjà
   pour les biomes existants (à vérifier l'extensibilité avant de coder une
   nouvelle passe de rendu).
4. Ambiance (vapeur, pluie, reflets, écrans, hologrammes) : couches de
   `fx.js`/`decor.js`, budgetées comme tout effet d'ambiance existant —
   contrainte du brief : ambiance, pas surcharge, couleurs saturées réservées
   au fond/accents.

### Fichiers

- `shared/biomes.js` (nouveau biome, append en fin de tableau)
- `public/render/props.js`, `world.js`, `decor.js`, `material.js`
- `docs/screens/` (nouvelle capture une fois livré, pour cohérence avec les
  captures existantes des 4 biomes)

## 7c · Monde vivant / ambiance (brief §13)

Éléments animés cohérents avec la fonction du lieu, un chantier
d'enrichissement de `decor.js` pour les 4 biomes existants + le nouveau. Pas
de nouvelle architecture : extension de ce qui anime déjà les biomes
(météos `brume`/`bourrasque`/`cendres` montrent que le concept de couche
animée par biome existe déjà, juste pas encore pour ces éléments de
décor-machine).

## Risques transverses de ce chantier

- **Performance** : un cinquième biome + une couche de zones ajoutent du
  calcul de composition (a priori à la génération de carte, pas par frame —
  à confirmer que le placement reste pré-calculé et non recalculé en jeu).
- **Déterminisme multijoueur** : toute nouvelle règle de composition doit
  rester une fonction pure de la graine, testée avec le même protocole que
  `verifierAmers`/`verifierEmpreinte` (rejouée à deux graines identiques,
  doit produire un résultat identique).
- **Portée** : le §12 est le chantier visuel le plus lourd de tout ce plan
  (nouveau biome complet) — à ne pas sous-estimer dans le chiffrage, même
  s'il est classé P1 et non P0 dans le brief.
