# Survivor LAN — plan 16 : quatre lieux, pas quatre couleurs

Le plan 14 a donné aux lieux leur charte : quatre tuiles de sol, quatre
silhouettes de bloc, quatre habillages, quatre premiers plans, une table de
dangers entièrement spécifique. L'ossature est en place.

Le constat de ce plan est ailleurs : **six éléments transverses écrasent tout
ce que cette ossature distingue.** Quatre captures nom masqué se lisent encore
« quatre installations industrielles ».

---

## Ce qui est déjà fait, et qu'on ne réécrit pas

| demandé | où c'est déjà |
|---|---|
| une charte par lieu | `BIOME_SKIN` — arène, grille, bloc, ambiante, direction de lumière, émissif |
| quatre sols | `material.js` : tôle, plaques + voies + vitrifié, dalles + joints de coulage + végétation, nid d'abeille |
| quatre lois d'implantation | `OBSTACLES` dans `biomes.js` |
| des dangers diégétiques | `DANGER[biome][kind]` — 21 entrées, aucun cercle ambre |
| quatre premiers plans | passerelle, cheminées, grillage, haubans |
| un arrière-plan spatial | `fondEspace()` — bande de nébuleuse, astres à terminateur, 765 étoiles en 3 `fill`, deux parallaxes |

---

## Les sept dénominateurs communs, par ordre de nuisance

1. **La grille de 20 m est identique dans les quatre.** 400 px, lignes droites
   pleine arène, ~9 par vue. Le signal « plan technique » le plus fort de
   l'écran, et le seul qui ne varie pas d'un pixel.
2. **Le liseré clair des blocs, à 0,45 / 0,70 partout.** Tout obstacle se lit
   « panneau usiné ». Une ruine n'a pas d'arête nette.
3. **Les silhouettes sont sous le seuil de perception** : chanfreins de 9 et
   16 px sur des blocs de 130 à 480 px, soit 3 à 12 % de l'arête.
4. **Deux lieux partagent leur loi d'implantation** : usine `0.230 × 0.036`,
   nébuleuse `0.300 × 0.034`. Même barre longue et mince.
5. **Le catalogue de props** : part réellement propre au lieu — fonderie 50 %,
   usine 42 %, nébuleuse 58 %, **friche 0 %**. La nébuleuse porte les cinq props
   terrestres (caillebotis, plaque, câble, tuyau, coffret) ; la friche porte un
   coffret allumé et un néon.
6. **Les quatre sols sont le même geste** : panneau + joint, période 400 px,
   plus une macro-couche de 1 200 px commune aux quatre.
7. **Les dangers restent des disques parfaits**, mêmes rayons aux mêmes places.

## Nébuleuse : le fond existe et ne se voit pas

Le plancher est peint à **0,93**, les baies font **3 hexagones de 41 px par
tuile de 400** — 4 % de la surface — et comme elles sont découpées *dans le
motif*, elles se répètent sur un réseau de 400 px. `arena: #0b1020` est à
quelques niveaux du fond, donc rien ne dit « trou ». Et la grille de 400 px se
trace **par-dessus** le nid d'abeille : deux réseaux superposés.

**Direction retenue : option A poussée.** Le pont reste — les obstacles sont des
AABB, `_clampToBounds` et `_spawnPoint` supposent une arène pleine, et « on
marche sur un plancher, jamais sur le vide » est ce qui rend le déplacement
lisible. Mais la proportion s'inverse : charpente ouverte au-dessus du vide,
~30 % de baies **ancrées au monde** et non à la tuile. Ce que l'option B a de
plus fort — fragments et débris — entre comme **obstacles et props**, pas comme
sol.

---

## Les lots

| lot | contenu | portée |
|---|---|---|
| **1** | La grille cesse d'être universelle : le pas de 20 m reste, sa **forme** devient celle du lieu. Et le liseré de bloc devient une propriété de la **matière**. | transverse |
| **2** | Nébuleuse, le vide : baies ancrées au monde, fond enrichi, plancher désaturé. | nébuleuse |
| **3** | Nébuleuse, le vocabulaire : props orbitaux, loi d'implantation propre, débris flottants. | nébuleuse |
| **4** | Friche, l'abandon : bibliothèque propre, retrait de ce qui est encore allumé. | friche |
| **5** | Usine, le mouvement : convoyeurs qui défilent, pistons, chenille de LED, vapeur. | usine |
| **6** | Fonderie, la masse : coulée ancrée au monde, bases de cheminée, lumière du sol. | fonderie |
| **7** | Vérification : quatre captures nom masqué, parts spécifiques relevées, coût aux quatre paliers. | transverse |

## Ce qui ne bouge dans aucun lot

Rien en DOM ; tout en motif cuit, `champ()` ou quad GL. `PARTICLE_MAX`
inchangé. `low` reste le contrat d'avant le plan 13 — mais **la forme d'un lieu
n'est pas dans ce contrat** : elle vaut à tous les paliers, comme
`silhouetteBloc` et comme la palette d'arène. Tableaux exportés append-only.
Télégraphes, barres et HUD jamais touchés : c'est ce qui garde les quatre maps
dans le même jeu.
