# Survivor LAN — le palier de qualité

**Le lot 1 du plan.** Il n'améliore rien à l'écran : il rend les six autres lots
comparables, réversibles et mesurables. Sans lui, il n'y a ni AVANT/APRÈS, ni
repli sur une machine lente, ni moyen de savoir quel lot a coûté quoi.

---

## Le drapeau

Même modèle que `survivor.renderer` (`render/stage.js`) et que les deux bascules
de HUD (`core/state.js:125`) : lecture au chargement, écriture au clic,
`try/catch` autour de `localStorage` — un navigateur privé ne doit pas casser le
jeu.

```js
// public/core/state.js
const GFX_KEY = "survivor.gfx";
export const GFX = ["low", "medium", "high", "ultra"];
export let gfx = readGfx();
export function setGfx(v) { … }
```

`gfx` vit en **couche 0** (`core/state.js` n'importe rien) : tous les modules de
rendu sont au-dessus, ils le lisent tous en descendant.

**Défaut : `high`.** Pas `medium` — un défaut prudent fait que personne ne voit
jamais le travail. `low` reste à un clic pour qui en a besoin.

---

## Les quatre paliers

| palier | ce qu'il rend |
|---|---|
| **low** | **exactement l'image d'aujourd'hui**, au pixel |
| **medium** | matière à deux échelles, props, joints cuits. Pas de lumière. |
| **high** | + lumière, ombres portées, atmosphère |
| **ultra** | + post-traitement, sources de lumière secondaires, tampon pleine résolution |

**`low` est un contrat, pas une approximation — mais sur la TECHNIQUE.** Matière,
semis, lumière, grille : `low` rend ce que le jeu rendait avant le plan 13. C'est
le bouton AVANT du test visuel, et tout lot suivant qui touche un chemin partagé
vérifie qu'il n'a pas bougé.

**La palette d'arène est hors contrat.** `DECOR[]` et les teintes de biome
glissent vers l'anthracite à **tous** les paliers. Un palier règle un coût de
rendu ; il n'annule pas une décision de direction artistique. Une machine lente
doit voir le même jeu, pas un autre. La comparaison AVANT/APRÈS porte donc sur la
matière, la profondeur et la lumière — pas sur la teinte, qui est acquise.

**Ce qui ne change JAMAIS entre paliers** : la simulation, les collisions, les
apparitions, la portée des armes, la position de quoi que ce soit. Un joueur en
`low` et un joueur en `ultra` dans la même partie voient la même **information**,
pas la même **image**.

---

## Ce que chaque palier pilote

Un seul point de lecture par module, jamais un `if (gfx === …)` dispersé.

| module | ce qu'il lit |
|---|---|
| `material.js` | nombre d'échelles cuites (1 en `low`, 2 au-dessus) |
| `props.js` | densité du semis (0 en `low`) |
| `lumiere.js` | résolution du tampon : `null` en `low`/`medium`, 1/4 en `high`, 1/2 en `ultra` |
| `decor.js` | ombres portées, atmosphère secondaire |
| `fx.js` | `PARTICLE_MAX` — déjà présent, se branche dessus |

`PARTICLE_MAX` existe déjà (300 en 2D, 3 000 en WebGL) : le palier devient un
second facteur, il ne remplace pas la bascule de renderer.

---

## Le sélecteur

Menu pause, à côté de `statsBtn` et `dpsBtn` (`public/ui/pause.js:11-25`). Pas
une bascule à deux états : quatre paliers, donc quatre boutons ou un cycle.

Le texte passe par `t()` comme tout texte affiché. Les quatre noms de palier vont
dans `shared/lang/en.js` en surcharge par clé.

---

## L'adaptation dynamique — ce qu'on ne fait PAS

Le brief évoque un décor qui perd du contraste quand l'écran se charge. **Pas
dans ce lot, et probablement jamais.**

Raison : un contraste qui varie avec la densité d'ennemis fait **respirer le
sol**, et cette respiration se lit comme un événement. Le §16 du brief tranche
lui-même — cinq effets bien intégrés valent mieux que cinquante. La hiérarchie
de lisibilité est déjà obtenue **par construction** (la lumière ne touche que le
canvas du bas) ; l'obtenir une seconde fois par un asservissement coûterait un
canal visuel pour rien.

Si le besoin réapparaît après le lot 3, il se re-tranchera **sur une mesure**,
pas sur une intuition.

---

## Critères de sortie

1. `low` rend l'image d'aujourd'hui, vérifié par capture comparée.
2. Le palier survit à un rechargement, et à un `localStorage` indisponible.
3. Le sélecteur est traduit.
4. Aucun `if (gfx …)` en dehors des cinq points de lecture du tableau ci-dessus.
