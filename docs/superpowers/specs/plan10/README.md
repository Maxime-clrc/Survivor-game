# Survivor LAN — ce qu'il reste à faire

**Vérifié lot par lot contre l'archive du 15 août**, et non supposé. La série
précédente en comptait onze ; sept sont exécutés.

| # | lot | objet |
|---|---|---|
| **01** | [bugs à confirmer](01-BUGS-A-CONFIRMER.md) | zoom aux bords, drones, flaque de feu |
| **02** | [boss — difficulté](02-BOSS-difficulte.md) | l'échelle par difficulté ne touche pas les mécaniques |
| **03** | [interface de jeu](03-INTERFACE.md) | barres, icônes de compétences, panneau de stats |
| **04** | [ultimes](04-ULTIMES.md) | Salve en missiles, Ancre et Sanctuaire visibles |

**[plus-tard/arene-de-test.md](plus-tard/arene-de-test.md)** — le mode
développeur, reporté.

---

## Ce qui est exécuté — constaté dans le code

| lot | preuve relevée |
|---|---|
| plan 6, A à H | `MAX_ENEMIES_BASE: 220`, `ENEMY_HP_MIN_RAMP: 7`, `XP_MINUTE_GROWTH: 1.055`, 24 reliques, `BUY_PER_VISIT: 1`, `TRONC_COSTS`, `SECOURS_COSTS` |
| correctif bouclier | `SHIELD_REGEN_RAMP: 1.8`, appliqué en rampe |
| boss — la banque | `bank` a **disparu** de `game_state.js` : le DPS excédentaire est perdu |
| ressenti L1 | les repères `[1]`, `[4]`, `[6]`, `[8]`, `[27]` sont dans `fx.js` |
| VFX / audio L3 | `blastCore: "#fff4e0"` dans la palette et utilisé par les quatre souffles ; son `foudre` ; `chainPitch()` |
| boss — lisibilité et archétypes | `ARCHETYPES` avec `ancre`, validation au démarrage |
| boss — nouveaux | **11 boss** : Veilleur, Tisseur, Prisme, Récitant, Silence ajoutés |
| soigneur | `HEAL_LINK_RADIUS/MAX/RATE/GRACE/REVIVE`, posture en lien |

---

## Ce qui reste, et pourquoi

**02 · La difficulté des boss.** C'est le seul lot du chantier boss non exécuté.
`DIFFICULTIES` module bien la horde (`enemySpeed` lit `.speed`, `typesFor` lit
`.roster`, `traitsOf` lit les traits par difficulté) — mais **rien ne module les
mécaniques de boss** : pas de `MECH_DAMAGE_RATIO` par difficulté, pas de classe
de télégraphe variable, pas de restriction des couches tardives en calme.
Aujourd'hui un boss se joue à l'identique en calme et en cauchemar, aux PV près.

**03 · L'interface de jeu.** `hud.css` a gagné 66 lignes et `hud.js` importe
maintenant la palette — le travail a commencé. Mais `tokens.css` est **inchangé à
25 lignes**, donc le système de design n'existe toujours pas. À reprendre depuis
la génération des variables de couleur depuis `palette.js`.

**04 · Les ultimes.** Rien : aucune trace de `SALVE_TURN_RATE`, de missile ni
d'amorce. La Salve est toujours du hitscan.

**01 · Les trois bugs** ne se vérifient pas depuis le code — ce sont des
symptômes visuels. À confirmer en jeu avant d'ouvrir le lot.

---

## Ordre

`01 → 02 → 03 → 04`, mais les quatre sont **indépendants** : aucun ne bloque les
autres. L'ordre proposé va du moins cher au plus cher.

Une seule dépendance réelle : le lot **04** réutilise le tracé d'arc pour les
chaînes de l'Ancre et les traînées de missiles, et le lien du soigneur pour le
Sanctuaire — les deux sont déjà en place.
