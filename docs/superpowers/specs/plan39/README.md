# Plan 39 — REFONTE PROFONDE DES BIOMES

**Phase de conception, 6 septembre 2026. Aucune ligne de code modifiée.**
Audit du dépôt en **`0.42.1`**, à partir du **code** et des **deux captures** de
`docs/screens/`.

> **Le plan 38 n'est pas une prémisse.** Il a livré « une carte = un thème »
> (0.42.0) et rien d'autre ; ses 61 fiches n'ont jamais existé en jeu. Sa
> conception est réexaminée ici comme le reste du dépôt, et **elle est jugée
> insuffisante pour la même raison que l'existant** : elle multipliait les lois
> d'implantation sans toucher aux canaux que l'œil lit en premier.

---

## Le diagnostic, en trois mesures

Relevées sur le dépôt, rejouables, **et aucune n'est signalée par les
54 vérificateurs** :

| mesure | valeur |
|---|---|
| régions employant **les trois** familles bâties de leur thème | **20 sur 20** |
| arrangements distincts sur une arène de **81 vues** | **16** (4 lois × 4 miroirs) |
| thèmes ayant deux régions au vocabulaire de props **identique** | **4 sur 5** |

Et la cause racine :

> **Le dépôt n'a pas de couche ARCHITECTURE.** Il a des blocs (40 à 420 px) et
> des props (20 à 140 px). Une vue fait 1600 × 900. **Rien n'a la taille d'un
> écran**, donc rien ne se reconnaît de loin, rien ne traverse plusieurs vues,
> et un biome ne peut être qu'un rangement.

Trois canaux sur dix sont indexés par la région. Le **sol** — la plus grande
surface de l'écran — est cuit sans terme de région : `floorPattern(ctx,
biomeIndex, diffIndex, seed, dpr)`. Une carte de 14 400 × 8 100 px a **un seul
sol**.

---

## La correction, en trois lignes

```
LA CHARTE APPARTIENT AU THEME       lumiere, ambiante, grille, fond, meteo
LE VOCABULAIRE APPARTIENT AU BIOME  familles baties, sol, props, amer
IL MANQUE UNE COUCHE : LA TRAME     une structure a l echelle du QUARTIER
```

**La TRAME** : six primitives fermées (`RUBAN`, `NEF`, `PEIGNE`, `COURONNE`,
`CRIBLE`, `FAILLE`), une par région, ancrée au **monde** et non à la cellule,
sortie dans le même tableau `obstacles` que le reste — donc collision,
navigation, apparition et dépôt la voient **sans une ligne de code en plus**, et
**zéro octet de réseau**.

---

## Les fichiers

| fichier | contenu |
|---|---|
| [`00-audit.md`](00-audit.md) | **A + B** — les trois mesures · les 20 régions notées une par une · ce qui est bon et se garde · les cinq causes de la répétition |
| [`01-concept.md`](01-concept.md) | **C + H** — la hiérarchie · **la TRAME** · le vocabulaire par biome · la mutualisation silhouette × habillage · le sol par région · l'amer par quartier · les 9 arrangements |
| [`02-usine.md`](02-usine.md) | **13 biomes** |
| [`03-fonderie.md`](03-fonderie.md) | **12 biomes** — axe : la température |
| [`04-friche.md`](04-friche.md) | **13 biomes** — axe : abandonné × repris par |
| [`05-nebuleuse.md`](05-nebuleuse.md) | **12 biomes** — axe : la pression |
| [`06-secteur.md`](06-secteur.md) | **13 biomes** — axe : qui paie |
| [`07-obstacles-et-props.md`](07-obstacles-et-props.md) | **E + F** — 22 silhouettes + 1 macro · 29 habillages · ~115 familles bâties · 11 familles de props paramétriques |
| [`08-sol-et-traces.md`](08-sol-et-traces.md) | **G** — 12 traitements de sol · 20 primitives de trace · **une trace a une source** |
| [`09-matrice.md`](09-matrice.md) | **I** — 11 axes × 63 biomes · les paires sous surveillance · `verifierSignature()` en six exigences |
| [`10-gameplay.md`](10-gameplay.md) | **J** — `biomeNu` · ce que chaque trame fait au combat · aucune arme perdante · les 5 garde-fous chiffrés |
| [`11-technique.md`](11-technique.md) | **K** — zéro octet de réseau · **les 5 pièges qui ne lèveraient rien** · fichier par fichier · le risque nommé |
| [`12-roadmap.md`](12-roadmap.md) | **L + M** — 53 assets en P0-P3 · TOP 10 biomes par ratio · 19 lots · les jalons visibles |

---

## Les chiffres

| | 0.42.1 | proposé |
|---|---|---|
| biomes par thème | 4 | **12 à 13** |
| biomes totaux | 20 | **63** |
| régions employant tout le vocabulaire de leur thème | **20 / 20** | **0 / 63** |
| arrangements distincts par arène | **16** | 96 à 192 |
| sols distincts par thème | **1** | 12 à 13 |
| compositions de carte par thème | **1** | **792** |
| amers par arène | 1 | 3 à 6 |
| familles bâties | 15 | ~115 (50 couples sil × hab) |
| postes de dessin à écrire | — | **23** (8 silhouettes + 1 macro + 14 habillages) |
| primitives de trace | 9 | 20 |
| **champs d'instantané ajoutés** | — | **0** |
| **valeurs d'équilibrage touchées** | — | **0** |
| budget de surface bâtie | 0,10 | **0,10** (scindé 0,045 trame / 0,055 cellule) |

---

## Les deux premiers lots, et pourquoi ils suffisent à prouver le diagnostic

| lot | contenu | coût | ce qu'un joueur constate |
|---|---|---|---|
| **01** | `floorPattern(+ loi)`, `CACHE_MAX = 8`, 12 traitements de sol | **un argument et une table** | « le sol change quand je traverse » — sur les **20 régions actuelles**, sans un biome neuf |
| **02** | `poserTrame()` + les 6 primitives + `verifierTrame()` | un générateur | « il y a des bâtiments maintenant » — la première structure plus grande qu'un écran |

Si le diagnostic est juste, **deux lots suffisent à rendre les régions actuelles
reconnaissables**. C'est la vérification la moins chère de tout le dossier, et
elle vient avant les 63 fiches.

---

## Ce que ce dossier refuse

- **d'ajouter des petits props en premier** — le semis est déjà le canal le plus
  travaillé du dépôt et il ne suffit pas ; les props arrivent au **lot 10** ;
- **de remplir le quota** — quatre biomes fusionnés ou supprimés avant écriture,
  deux paires sous surveillance mesurée, **F12 déclarée sacrifiable** ;
- **de toucher à l'équilibrage** — aucun PV, dégât, plafond, vitesse ni rayon ;
- **de toucher au réseau** — zéro octet.
