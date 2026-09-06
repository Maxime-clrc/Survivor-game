# Plan 38 — THÈME et BIOME

**Phase de conception, 6 septembre 2026. Aucun code modifié.**
Audit du dépôt en `0.41.1`. À valider avant implémentation.

## Le problème, en une ligne

`shared/biomes.js:906` — `lieuxDe()` distribue **les cinq THÈMES** sur les cinq
quartiers d'une arène, et `verifierCarte` **exige** qu'ils soient tous là. Le
système fait exactement ce pour quoi il a été écrit, et ce pour quoi il a été
écrit est le défaut : la Friche peut être une Nébuleuse.

## La correction, en trois lignes

```
UNE CARTE   = UN THEME
UN THEME    = 10 a 13 BIOMES, tous variations de ce theme
UN BIOME    = 2 a 4 ARRANGEMENTS, tires par cellule
```

Les cinq quartiers reçoivent cinq **biomes du thème de la carte**. Même
découpage, même bijection, même vérificateur. **Zéro octet de réseau.**

## Les fichiers

| fichier | contenu |
|---|---|
| `00-audit-et-concept.md` | où vit quoi · le défaut · ce qui est déjà bon · l'inventaire des 5 thèmes · le concept corrigé |
| `01-biomes-usine.md` | 12 biomes |
| `02-biomes-fonderie.md` | 12 biomes |
| `03-biomes-friche.md` | 13 biomes |
| `04-biomes-nebuleuse.md` | 12 biomes |
| `05-biomes-secteur.md` | 12 biomes |
| `06-matrice-variete.md` | 9 axes · enveloppes de thème · les 61 biomes croisés · les 8 exigences du vérificateur |
| `07-obstacles-et-props.md` | 12 systèmes d'obstacle · 60 props · les grappes · les fonds et les repères |
| `08-architecture-technique.md` | **5 défauts vivants trouvés à l'audit** · la hiérarchie en code · impacts gameplay et techniques |
| `09-priorisation-et-roadmap.md` | TOP 10 biomes · TOP 20 assets · 10+ lots · jalons · le risque nommé |

## Les chiffres

| | avant | après |
|---|---|---|
| thèmes par carte | **5** | **1** |
| biomes par thème | 4 | 10 à 13 |
| biomes totaux | 20 | **61** |
| compositions de carte | **1** | **792** par thème |
| familles bâties | 15 | 59 |
| silhouettes de bloc | 15 | 19 *(4 systèmes neufs)* |
| props | 48 | ~108 |
| primitives de trace | 9 | 12 |
| recettes de fond | 2 | 5 |
| repères par arène | 1 | 5 |
| champs réseau | — | **inchangé** |

## Ce qui ne bouge pas

L'ordre append-only de `BIOMES` et de `BLOCS` · le déterminisme · le point de
passage unique du rendu · `OBSTACLE_SURFACE_MAX` · `HAZARD_SURFACE_MAX` ·
`NAV_CFG.PASSAGE_MIN` · la traversabilité du carré central sur les deux axes ·
la monotonie calme < normal < cauchemar · le fait que la silhouette remplisse son
rectangle.

## Trois décisions attendues

1. **Renommer `BIOMES` → `THEMES`** dans le code (recommandé : mécanique, sûr,
   et le mot a aujourd'hui deux sens).
2. **Garder 5 quartiers par carte** (recommandé : quatre écrans de côté par
   biome, c'est la bonne échelle).
3. **S09 « les cages »** : biome à part entière, ou accent de S05 ? La matrice
   tranchera à la mesure ; si elle fusionne, il faut un remplaçant — le plus
   évident étant un quartier corporatif propre, qui manque au Secteur.
