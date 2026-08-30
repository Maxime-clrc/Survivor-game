# 02 · VFX — refonte des flaques de feu (brief §4)

## Ce qui existe déjà

- `shared/biomes.js` : danger `flaque` (`hurts: true`, `r: BIOME_CFG.POOL_R`,
  `dot: BIOME_CFG.POOL_DOT`) — la **donnée de gameplay est simulée
  côté serveur et networkée**, comme tous les dangers de biome.
- `public/render/fx.js` a déjà toute la machinerie de rendu de particules,
  budgets et un vocabulaire de couches (`coeur`, `feu`, `bord`, `debris` —
  voir la table `0:`, `7:`, `8:`, `12:` en tête de fichier, utilisée pour les
  explosions). C'est la même famille de primitives à réutiliser pour la
  flaque, pas une nouvelle techno de particules.
- `zoneFx` (compteur exporté, `fx.js:1626`) et `setZoneFx` existent déjà comme
  point de budget pour les effets de zone en cours — **le point d'entrée pour
  un budget de qualité est déjà là**.

## Conclusion d'audit clé

C'est un chantier de **rendu pur**. Le serveur ne change pas : la position,
le rayon et le dégât par tick de la flaque restent identiques. Le risque
réseau/simulation que le brief redoutait par précaution (§2) ne s'applique
pas ici — seul `public/render/fx.js` (et éventuellement `public/render/decor.js`
pour la trace de brûlure post-extinction) bouge.

## Cible

Remplacer le disque orange plat actuel par une matière lisible en trois
temps : apparition → combustion → extinction, avec trace résiduelle.

## Décomposition

1. **Couche de sol brûlé** — un quad/masque assombri dessiné *sous* la
   flamme, dès l'apparition (pas seulement à l'extinction). Réutilise le
   pipeline de `material.js` (qui cuit déjà le sol par biome/graine) plutôt
   que d'ajouter une couche de rendu séparée : la brûlure est une variation
   locale de la texture de sol existante.
2. **Bord irrégulier** — remplacer le cercle géométrique par un contour
   bruité (offset radial pseudo-aléatoire, déterministe par position pour
   rester stable multi-joueur sans transport réseau — le bruit se calcule
   côté client à partir de la position networkée, jamais côté serveur).
3. **Cœur de combustion** — 2-3 langues de flamme irrégulières au lieu d'un
   remplissage uniforme, sur le modèle des couches `coeur`/`feu`/`bord` déjà
   utilisées pour les explosions dans `fx.js`.
4. **Braises + fumée légère** — particules ascendantes, budgetées par
   `zoneFx`/le système de budget de particules existant (voir
   `docs/regles/RENDU.md` pour les budgets déjà mesurés).
5. **Lumière locale** — passe par `public/render/lumiere.js` (déjà utilisé
   pour l'arrivée de boss avec deux canaux à constantes distinctes) plutôt
   que d'inventer un nouveau système lumineux.
6. **États apparition/combustion/extinction** — machine à trois états pilotée
   par le timer de vie de la flaque déjà présent côté simulation (durée du
   danger), pas un nouveau timer.
7. **Trace résiduelle** — cendre/brûlure qui persiste brièvement après
   extinction, dessinée dans `decor.js` ou comme extension de l'état 3
   ci-dessus avec un fondu, sans nouvel objet de simulation (juste une durée
   de rendu plus longue que la durée de danger réelle).

## Fichiers à modifier

- `public/render/fx.js` (cœur du chantier)
- `public/render/material.js` (couche de sol brûlé)
- `public/render/lumiere.js` (lumière locale)
- `public/render/decor.js` (trace résiduelle, si non couverte par fx.js)
- `docs/regles/RENDU.md` (documenter la nouvelle recette, comme les autres
  effets de zone)

## Contraintes de lisibilité (rappel brief + convention du dépôt)

- Ne jamais recouvrir les télégraphes de gameplay (anneaux de danger,
  cibles de boss) — le plan 25 a justement mesuré un problème d'*ordre de
  dessin* similaire sur les bonus au sol (>1/3 recouverts en horde dense) :
  vérifier l'ordre de dessin flaque/joueurs/ennemis avant de livrer, pas
  seulement le rendu isolé.
- Prévoir un palier de qualité si le coût GPU/CPU dépasse le budget mesuré
  dans `LISEZMOI.md` — le point d'accroche (`setGfx`) existe déjà mais le
  plan 25 a noté qu'il n'a qu'un seul appelant (menu pause) : si ce chantier
  ajoute un palier, le raccorder au même endroit plutôt que d'ouvrir un
  nouveau réglage.

## Risque principal

Coût GPU en pleine horde avec plusieurs flaques simultanées + plusieurs
joueurs. Mesurer avec le protocole déjà en place (`?banc`, relevé `R`) avant
et après, comme le fait `LISEZMOI.md` pour les autres effets.
