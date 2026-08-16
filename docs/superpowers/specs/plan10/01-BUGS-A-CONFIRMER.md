# Lot 01 — trois bugs, à confirmer avant d'écrire

Ces trois défauts ont été relevés sur l'archive du **14 août**. Sur celle du
**15**, je ne peux pas les vérifier depuis le code seul : ce sont des symptômes
visuels. **À confirmer en jeu avant d'ouvrir le lot** — s'ils ont disparu, il
n'y a rien à faire.

---

## 01-A · Le zoom aux bords de la carte

**Toujours suspect.** `stage.js` applique bien une densité de pixels bornée :

```js
const dpr = Math.min(window.devicePixelRatio || 1, 2);
```

Mais `index.html` empile **trois canvas** — `cvUnder`, `cvGl` (WebGL) et `cv` —
et il n'existe aucune variable de zoom dans le moteur. Ce que tu perçois est donc
un **désaccord d'échelle ou de transformation entre ces couches**, qui se révèle
au moment où la caméra bute sur les bornes de l'arène.

**Vérification :** tracer une grille de repère identique sur les trois couches et
regarder si elles restent alignées quand la caméra est écrêtée. Le suspect n°1
reste le traitement de la densité de pixels, seul endroit où WebGL et canvas 2D
divergent naturellement.

## 01-B · Les drones invisibles

`DRONE_COLOR` et le tracé existent dans `render/actors.js`. Les drones sont
simulés, sérialisés (`dr:`) et dessinés — au canvas 2D, pas via l'atlas WebGL.

**Vérification :** journaliser `list.length` dans `drawDrones` avec la carte
équipée. Non vide → problème de couche ou de transformation, même famille que
01-A. Vide → remonter jusqu'à la sérialisation.

## 01-C · La flaque de feu de « Terrain conquis »

`drawZones(v.zones, v.tm)` existe maintenant dans `render/world.js`, donc les
zones **sont** dessinées. Il est possible que ce bug soit déjà réglé.

Si la flaque reste invisible, le problème est un **discriminant** : la zone créée
par `_groundZone` n'est probablement pas distinguée visuellement des autres
zones. Vérifier d'abord que les ennemis subissent bien `TERRAIN_DOT` — si oui,
c'est purement un défaut d'affichage.

---

## Déjà corrigé

**La rampe de recharge du bouclier** — `SHIELD_REGEN_RAMP: 1.8` est en place et
appliqué (`const taux = p.mods.shieldPool / CARD_CFG.SHIELD_REGEN_RAMP`). Rien à
faire.
