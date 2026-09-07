# Plan 35 — le mini-boss, le loot, et trois statistiques

**Adossé à `decisions-2026-09-03.md` v7, sections IV, V et VI.**

Trois systèmes qui n'en font qu'un : le mini-boss est ce qu'on va chercher, le
loot est ce qu'il laisse, et les trois statistiques sont ce que le loot alimente.
Les séparer en trois plans ferait trois calibrations au lieu d'une.

## Les lots

```
01 le mini-boss        dormant, deux fenetres, laisse, suivi de puissance
02 le loot au sol      il tombe, on passe dessus, il est instancie
03 trois statistiques  chance, esquive, armure — et l indice de survie etendu
04 l equilibrage       ce que les trois lots ensemble font a la courbe
```

Le lot 04 n'est pas une formalité : c'est le lot qui vérifie que les trois autres
n'ont pas déplacé ce que le plan 30 avait calibré.

## Ce qui existe déjà et qui porte tout

**Le mini-boss existe**, sans son nom. `_spawnQuarry()` applique la formule du
boss **sans le terme de puissance**, à 80 %, sur un **ennemi ordinaire** — il vit
dans `this.enemies`, passe par `_damage`, `_killEnemy`, `_enemies(dt)`. Il ne coupe
pas `_spawner`, ne rétrécit pas `bounds`, n'affiche pas de barres, ne change pas
la musique. C'est exactement ce qu'on veut.

**Le pipeline de butin au sol existe** : `_poserBonus(type, x, y)` est le point de
passage unique de la pose, `POWERUP_TYPES` est append-only, `_powerups(dt)` porte
durée de vie et ramassage, `bonusFamille()` (`feedback.js`) dit ce qu'un objet
**annonce**, et deux plafonds séparés cohabitent déjà (`POWERUP_MAX_GROUND = 2`,
`FRAGMENT_MAX_GROUND = 6`) — le précédent d'un troisième est posé.

**Le suivi de puissance avec limite existe** : `bossPower()`, seuil à
`BOSS_POWER_KNEE = 2,5` puis `BOSS_POWER_K = 0,50` de pente.

## La contrainte qui traverse le plan

> `_killEnemy()` est le point de passage unique de toute **mort** d'ennemi : XP,
> cumuls, hauts faits, butin. Un corps qui **part** n'y passe pas.
> **Retirer n'est pas tuer.**

Elle vaut pour les deux retraits du mini-boss et pour le recyclage lointain du
plan 31. Elle est écrite dans `docs/regles/SIMULATION.md` ; ce plan est le premier
à s'en servir deux fois.
