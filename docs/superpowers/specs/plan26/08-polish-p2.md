# 08 · Polish P2 — matériaux/lumière, ennemis/armes, audio, archétypes (brief §14-17)

Ces quatre chantiers sont regroupés parce qu'ils sont individuellement plus
petits que les précédents et dépendent tous des piliers P0/P1 (menu, cartes,
maps) pour avoir un terrain stable. Le brief les classe déjà P2.

## 8a · Matériaux, lumière, profondeur (§14)

- Substrat existant : `public/render/material.js` (cuisson de sol par
  biome/mode/graine), `lumiere.js` (deux canaux, déjà utilisé pour les
  transitions boss).
- Décomposition : différenciation de matériaux (béton/métal/verre/goudron…)
  → extension de la table de matériaux de `material.js`, pas un nouveau
  pipeline ; usure/rayures/oxydation → variation de texture par cellule,
  dérivée de la graine comme le reste ; ombres de contact renforcées puis
  ombres portées si le budget le permet ; hiérarchie de plans → vérifier ce
  que `world.js` sépare déjà avant d'ajouter une passe de parallaxe/brume.
- Risque : coût de rendu cumulé avec le chantier VFX feu (§4) et le nouveau
  biome (§12) — mesurer les trois ensemble, pas séparément, avant de figer
  des budgets.

## 8b · Ennemis, animations, réactions (§15)

- Le plan 25 a déjà un vérificateur de silhouettes (`verifierSilhouettes()`)
  **rouge depuis 0.21.7** sur la paire porte-bouclier/chœur (5 axes de
  confusion mesurés). **Ce chantier doit régler ce défaut connu en premier**
  — c'est littéralement la demande du brief (« silhouettes identifiables
  sans couleur ») appliquée à un cas déjà détecté et non corrigé, pas une
  nouvelle exploration.
- Réactions d'impact, signatures d'armes : `shared/feedback.js` («
  déduit famille d'arme et matière de créature ») est déjà l'endroit
  prévu pour ce genre de règle — étendre plutôt que créer un nouveau
  système.

## 8c · Audio et feedback (§16)

- Le plan 25 a mesuré un défaut directement pertinent : **`applyAlert()`
  sonne les événements météo mais jamais `msg.mech` (ordre de boss)** — la
  recette `annonce` existe dans `audio.js` mais n'est citée nulle part dans
  le dépôt. C'est le point d'entrée le plus rentable de ce chantier : une
  ligne de câblage manquante sur un système déjà écrit, avant toute
  nouvelle signature sonore.
- Système de limiteur/ducking déjà mesuré sain (16 voix, aucune volée,
  musique étouffée en rampe sur bus) — ne pas retoucher cette partie,
  seulement l'étendre aux nouveaux sons créés par les autres chantiers de ce
  plan (VFX feu, hauts faits, bestiaire).

## 8d · Reconnaissance des archétypes de build (§17)

Comme noté dans `README.md` §5 : **ne pas traiter comme un chantier séparé**.
Une fois `05-audit-cartes-reliques.md` §3 (matrice d'archétypes) validé par
télémétrie, le badge d'archétype est :
1. une règle de détection côté client (seuil de cartes d'une même famille
   possédées — pure lecture de l'état de build déjà networké, pas de
   nouvelle donnée serveur) ;
2. un élément d'affichage discret sur l'écran Arsenal/Build existant.

Pas de système de classes caché : la détection reste informative, jamais
bloquante — cohérent avec la contrainte explicite du brief.

## Fichiers concernés (ensemble du chantier 08)

- `public/render/material.js`, `lumiere.js`, `world.js` (8a)
- `shared/enemies.js` (silhouettes — probablement geometrie de sprite, pas
  la donnée `ENEMY_TYPES` elle-même), `shared/feedback.js` (8b)
- `public/audio.js`, `public/net/interp.js` (`applyAlert`) (8c)
- `public/ui/build.js` ou `panel.js` (badge d'archétype, 8d)
- `docs/regles/RENDU.md` (8a, 8b), `docs/regles/RESEAU.md` n/a ici

## Risque

Le seul risque partagé par les quatre est le **budget de performance
cumulé** avec les chantiers P0/P1 déjà plus coûteux (VFX feu, nouveau
biome). Recommandation : chiffrer et mesurer 8a/8b/8c après que 02 et 07
soient livrés et mesurés, pas en parallèle à l'aveugle.
