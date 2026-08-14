# Lot 01 — correctifs

Quatre défauts relevés dans l'archive du 14 août. Petits, indépendants, à passer
avant le reste : deux d'entre eux fausseraient la mesure des lots suivants.

---

## 01-A · Le zoom aux bords de la carte

**Symptôme :** curseur près d'un bord, l'image semble zoomer.

**Diagnostic.** Il n'existe **aucune variable de zoom** dans le moteur. Ce que tu
perçois est un **désaccord entre les trois couches de canvas** — `index.html`
empile `cvUnder`, `cvGl` (WebGL) et `cv`.

`stage.js` écrête la caméra aux bornes de l'arène :

```js
camera.x = Math.min(Math.max(camera.x, CFG.VIEW_W / 2), CFG.ARENA_W - CFG.VIEW_W / 2);
```

Si les trois couches n'appliquent pas **exactement** la même transformation (ou
la même densité de pixels), une couche continue de glisser quand l'autre s'arrête
sur la borne — et l'œil lit ce glissement différentiel comme un zoom.

**Vérification :** tracer une grille de repère identique sur chacune des trois
couches et vérifier qu'elles restent alignées quand la caméra est écrêtée. Le
suspect n°1 est le traitement du `devicePixelRatio`, qui est le seul endroit où
WebGL et canvas 2D divergent naturellement.

---

## 01-B · Les drones invisibles

**Symptôme :** la carte légendaire de drones ne montre rien.

**Diagnostic.** Les drones sont **simulés** (`_drones`), **sérialisés** (`dr:`
dans l'instantané) et **dessinés** — mais en canvas 2D dans `render/actors.js`
(`drawDrones`, tracé procédural), pas via l'atlas WebGL.

Trois suspects, dans l'ordre :

1. **l'ordre des couches** — le canvas WebGL passe-t-il par-dessus le canvas 2D
   qui porte les drones ? Même famille de cause que 01-A ;
2. **le filtre de sérialisation** — `dr: this.drones.filter(d => d.dead <= 0)` ;
3. **la liste reçue** — `drawDrones(list)` reçoit-il un tableau non vide ?

**Vérification :** journaliser `list.length` dans `drawDrones` pendant une manche
avec la carte équipée. Non vide → problème de couche ou de transformation. Vide →
remonter la chaîne jusqu'à `_drones`.

---

## 01-C · La carte « Terrain conquis » sans flaque

**Symptôme :** carte équipée, aucun sol brûlant.

**Diagnostic.** La mécanique est **entièrement implémentée côté simulation** :

```js
apply(m) { m.blastGround = CARD_CFG.TERRAIN_LIFE; }          // cards.js
_blastGround(owner, x, y, r) {                                // game_state.js
  if (!owner || !(owner.mods.blastGround > 0)) return;
  this._groundZone(x, y, r * 0.7, CARD_CFG.TERRAIN_DOT, owner.mods.blastGround);
}
```

Appelé depuis deux points (`_blastAfter` et l'onde). Et les zones **sont
transmises** au client (`msg.z` → `zones` dans `ingest.js`).

**Donc la simulation fonctionne : les ennemis prennent probablement les dégâts.**
Le défaut est **au rendu** — la zone créée par `_groundZone` n'a pas de
discriminant visuel qui la distingue des autres zones, ou n'est pas dessinée du
tout.

**Vérification :** confirmer d'abord que les ennemis subissent bien `TERRAIN_DOT`
dans la zone. Si oui — et je le pense — c'est un bug d'affichage pur, à traiter
avec le lot **04** (inventaire des effets muets), qui a exactement la même cause
racine : des effets que la simulation produit et que le client ne montre pas.

---

## 01-D · La rampe de recharge du bouclier

**Ce n'est pas un bug, c'est un réglage incomplet.**

`SHIELD_REGEN_DELAY: 6` existe et **fonctionne** — le délai est bien armé à
l'encaissement et vérifié avant la recharge :

```js
if (p.mods.shieldPool > 0 && !p.downed
    && T.shieldRegen <= 0 && p.shield < p.mods.shieldPool) {
  this._grantShield(p, p.mods.shieldPool - p.shield, p.mods.shieldPool);
}
```

**Mais la recharge est instantanée** : `p.mods.shieldPool - p.shield` rend
**tout le pool d'un coup**. C'est un interrupteur, pas une récupération — et
c'est ce qui produit la quasi-invincibilité que tu décris : six secondes sans
dégât, et le bouclier est intégralement revenu.

**Décision — ajouter la rampe :**

```js
SHIELD_REGEN_RAMP: 1.5,   // secondes pour retrouver le pool plein
```

```js
const taux = p.mods.shieldPool / CARD_CFG.SHIELD_REGEN_RAMP;
this._grantShield(p, Math.min(taux * dt, p.mods.shieldPool - p.shield),
                  p.mods.shieldPool);
```

La rampe **punit les dégâts espacés** : se prendre un coup toutes les sept
secondes ne doit pas rendre un bouclier plein. C'est ça, le vrai correctif — le
délai seul ne suffit pas.

**Ne pas toucher au débit ni au délai.** Six secondes est une valeur défendable ;
c'est l'absence de progressivité qui crée le problème.

**Retour visuel obligatoire :** le bouclier doit s'éteindre visiblement au coup
et se rallumer progressivement pendant la rampe. Sans ça, le joueur subit une
règle qu'il ne voit pas.

---

## Critères d'acceptation

1. Les trois couches de canvas restent alignées à la borne, sur au moins deux
   densités de pixels différentes.
2. Les drones sont visibles pour leur propriétaire **et** pour les alliés.
3. « Terrain conquis » laisse une zone **visible**, et la zone blesse.
4. Un joueur touché toutes les 7 s ne dépasse jamais **60 %** de son pool de
   bouclier.
