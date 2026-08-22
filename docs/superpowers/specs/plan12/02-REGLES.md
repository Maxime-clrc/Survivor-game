# Survivor LAN — les règles fausses

Trois chemins de code qui manquent. Aucun n'appelle une décision de
conception : dans les trois cas, ce que le jeu **annonce** au joueur et ce qu'il
**fait** divergent, et il n'y a qu'une bonne réponse.

Ils touchent la simulation, donc ils passent après l'interface — mais ils sont
indépendants entre eux et se relisent séparément.

| chantier | ce qui est annoncé | ce qui se passe |
|---|---|---|
| **03** | « PV max plafonnés à 60 » | les reliques et les lignes passent par-dessus |
| **04** | un cristal se casse en tirant dessus | seules les **balles** le touchent |
| **06** | « il faut anticiper la trajectoire » | la grenade explose à distance fixe |

**04 est le préalable du chantier 07** (la refonte du tesla) : on ne change pas
l'acquisition d'une arme dont un type de cible entier est encore hors de portée.

---

## 03 — Le plafond de PV ne plafonne pas

### Le constat

« Contrat de sang » (`cards.js:906`) annonce **PV max plafonnés à 60**. Les PV
bruts s'appliquent quand même.

### La cause

Trois sources ajoutent des PV, et le plafond n'est appliqué qu'après la
première.

```
game_state.js:577   applyMeta()          maxHp = min(maxHp, hpCap)   ← le plafond
progression.js:197  applyMeta()          maxHp *= (1 + metaHpRatio)  ← après
game_state.js:979   _recomputeMods()     maxHp += flatHp (reliques)  ← après
```

Chacune est correcte prise seule. Le défaut est **structurel** : le plafond est
posé au milieu de la chaîne au lieu de sa fin. Toute source de PV ajoutée plus
tard le contournera aussi, sans que personne ne s'en aperçoive — c'est déjà
arrivé deux fois.

Le `hpBonus` de la lame tournoyante (`armes.js`, `maxHpRatio += 0.40`) passe,
lui, par `fullMods` en amont : il est bien plafonné. Ce n'est pas de la chance,
c'est qu'il est du bon côté de la ligne.

### Le correctif

**Un point de passage unique, en toute fin de chaîne.** `hpCap` sort de
`applyMeta` et devient une fonction appelée une fois, là où `maxHp` est
définitivement arrêté :

```js
// shared/game_state.js — LE plafond, et il est le dernier
export function plafonnerHp(maxHp, mods) {
  return mods.hpCap > 0 ? Math.min(maxHp, mods.hpCap) : maxHp;
}
```

Dans `_recomputeMods`, après les reliques :

```js
const flat = this._relicSum(p, "flatHp") + this._relicAllySum(p, "allyFlatHp");
if (flat !== 0) p.maxHp = Math.max(1, p.maxHp + flat);
p.maxHp = plafonnerHp(p.maxHp, p.mods);   // <- ici, et nulle part ailleurs
```

Retirer la ligne 577 et laisser `fullMods` renvoyer le `maxHp` non plafonné.
`applyMeta` n'a plus à connaître `hpCap`.

### La contrepartie, à trancher

Un contrat qui plafonne vraiment devient nettement plus dur pour un compte
avancé — c'est un joueur avec des lignes de PV et des reliques de PV qui perd
le plus. C'est cohérent avec l'intitulé (+80 % de dégâts pour 60 PV), mais le
chiffre 60 a été équilibré à une époque où il fuyait. **Le remonter à 80 est
probablement nécessaire.** À mesurer, pas à décider ici.

### Le critère

Un profil avec la ligne commune de PV au palier max et Cœur-machine équipé,
prenant Contrat de sang : les PV affichés valent exactement `hpCap`. Aucune
relique ni ligne ne le dépasse.

---

## 04 — Les éclats ne sont brisables qu'à la balle

### Le constat

Avec le tesla — et avec le laser, et avec la lame — on ne peut pas casser un
cristal.

### La cause

`_harvestHit()` n'est appelé **que depuis `_bullets()`** (`game_state.js:6622`).

| arme | chemin de dégât | touche un cristal |
|---|---|---|
| standard, assaut, dispersion, railgun, grenade | `_fire` → `bullets` | oui |
| **laser** | `_segmentHits` | **non** |
| **tesla** | `_teslaTir` | **non** |
| **lame** | `_lameTir` | **non** |

Trois armes sur huit ne peuvent pas ramasser la monnaie du jeu. Et la
conséquence est pire que l'inconfort : les éclats achètent les reliques, donc
c'est **un axe entier de progression fermé** à trois armes.

### Le correctif

Le cristal doit devenir une **cible**, pas un cas particulier des balles.
Ajouter aux trois chemins de dégât un appel au même point de passage :

- `_segmentHits` — le faisceau frappe le cristal comme il frappe un corps, en
  testant la distance au segment. Un laser qui traverse une file **et** un
  cristal casse les deux, ce qui est exactement sa signature ;
- `_teslaTir` — le cristal entre dans l'acquisition et dans les rebonds, avec
  une réserve : il **ne doit pas voler la cible** quand un ennemi est à portée.
  Un cristal qui aspire les arcs pendant une vague est une punition. Règle :
  le cristal n'est acquis **que si aucun ennemi n'est à portée** ;
- `_lameTir` — le cristal est dans l'arc, il prend le coup. Sans réserve : la
  lame frappe tout ce qui est autour, c'est sa définition.

Étendre `_harvestHit(x, y, dmg)` en une seconde signature, ou ajouter un
`_harvestDamageAt(x, y, r, dmg)` qui prend un rayon — le faisceau et l'arc de
lame ne sont pas des points.

### Le critère

Les huit armes, une par une, sur un cristal isolé : chacune le casse. Chrono
comparable entre armes (à ±30 %), pour qu'aucune ne fasse de la récolte une
corvée. Puis : tesla, un cristal **et** trois ennemis à portée — les arcs vont
aux ennemis.

---

## 06 — Le lance-grenades explose au mauvais endroit

### Le constat

La grenade explose en bout de course, à une distance fixe, quel que soit le
réticule.

### La cause

`_volley()` construit la grenade avec `court: arme.portee`, qui multiplie la
**durée de vie** du projectile (`_fire`, ligne 1705). La détonation se produit
donc à `vitesse × vie`, une constante. Le curseur n'entre nulle part.

### Le correctif

`p.aimR` **existe déjà** et contient la distance du curseur au joueur, envoyée
par le client à chaque trame (`input.js:90` → `game_state.js:1214`). La
compétence Bombe du Tireur s'en sert (ligne 1786). Le lance-grenades doit
faire pareil :

```js
case "grenade": {
  const max = CFG.BULLET_SPEED * CFG.BULLET_LIFE * arme.portee * p.mods.bulletLifeMul;
  const d = Math.min(p.aimR, max);
  const v = CFG.BULLET_SPEED * p.mods.bulletSpeedMul * CARD_CFG.GRENADE_SPEED_MUL;
  this._fire(p, 0, 0, {
    boom: true, boomDmg: dmg,
    vie: d / v,                        // detone LA ou vise le reticule
    boomR: (arme.souffle ?? CARD_CFG.GRENADE_RADIUS) * p.mods.areaMul,
  });
  break;
}
```

`vie` remplace `court` **pour la grenade seulement** — `court` reste le levier
des autres armes. Dans `_fire`, `life: opt.vie ?? (CFG.BULLET_LIFE * mul *
(opt.court ?? 1))`.

La détonation au contact d'un corps est déjà gérée (`_bullets`, `b.boom > 0`)
et ne change pas : le réticule fixe le point **maximum**, un ennemi rencontré
avant fait sauter la grenade plus tôt. C'est ce que « il faut anticiper la
trajectoire » veut dire, et ça ne marchait pas.

### Le retour visuel

Une arme qui vise au sol doit **montrer où**. Un marqueur au sol sous le
réticule pendant que le lance-grenades est porté, saturé quand la portée max est
dépassée. Sans lui, le joueur découvre le point d'impact après le tir.

### Le critère

Curseur à 5 m : explosion à 5 m. Curseur à 60 m sur une arme qui porte à 43 :
explosion à 43, et le marqueur au sol l'a annoncé avant le tir.
