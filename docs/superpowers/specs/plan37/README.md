# Plan 37 — la map

**Adossé à `decisions-2026-09-03.md` v7, sections VII, XVI et X.**

Il vient en dernier parce qu'il a besoin que tout le reste existe. La question
« une map plus grande, pour y mettre quoi ? » n'a de réponse qu'une fois les
contrats, les mini-boss et le loot écrits.

Et il n'a plus de problème de performance : les deux coûts de surface ont été
retirés au plan 31.

## Les décisions

- **on ne fusionne pas les thèmes.** Les cinq lieux restent cinq thèmes ; une
  manche se joue dans un thème ;
- **quatre variantes par thème**, assemblées à la graine ;
- **une variante fait la taille d'une map actuelle** — 4800 × 2700. La map est un
  **2 × 2 de régions**, soit **9600 × 5400**, quatre fois la surface d'aujourd'hui ;
- **aucune variante ne peut être un couloir.** Ça reste un jeu de horde ;
- **le ping** fait clignoter l'indicateur DOM du joueur émetteur.

## Les lots

```
01 les variantes      quatre gabarits par theme, bords declares
02 l agrandissement   2 x 2 regions, et ce qu il faut verifier
03 le ping            le message, la classe, le son deja compose
```

## Ce que le plan 31 a déjà rendu possible

| obstacle identifié en R&D | statut |
|---|---|
| `biomeIndex` scalaire lu par 7 modules client | **inchangé** — un thème par manche |
| cache de tuiles : un lieu à la fois (9,8 Mo/tuile à dpr 1) | **inchangé** — un seul thème vivant |
| `lumDir()` : deux ombres sur un écran | **sans objet** |
| `verifierCharte()` : plus de place pour un 6ᵉ lieu | **sans objet** |
| fonds incompatibles (`espace`, `ville`) | **sans objet** |
| `_grille()` en O(surface) | **retiré** (plan 31 lot 03) |
| `diffuser()` en O(surface) × effectif | **retiré** (plan 31 lot 03) |
| horde déséquilibrée à la séparation | **retiré** (plan 31 lot 04) |

**Le client est déjà quasi insensible à la taille de la map** : le réseau est
filtré par vue (`vueDe` + `snapshot(vue)`), le sol est un motif répété dont le coût
est celui de la vue, les props bouclent sur des cellules dérivées de la caméra.

*(Correction d'une analyse antérieure : les boucles pleine arène de `decor.js` ne
sont pas un coût. À `GRID_FINE = 100`, une arène de 4800 × 2700 donne 75 segments
de ligne par image ; à huit fois la surface, 212. Le canvas les écrête.)*
