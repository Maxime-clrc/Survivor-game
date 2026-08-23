# Survivor LAN — plan 15 : le poids du tir

Le plan 13 a donné au rendu sa matière, le plan 14 a donné quatre langues aux
lieux. Les deux portaient sur le **décor**. Ce plan porte sur ce qui se passe
devant : **le combat**.

Le constat est simple et il tient en une phrase : **dix armes tirent, un seul
son part, et aucune n'a de départ de coup.**

Ce plan n'ajoute pas d'effets. Il ouvre les **canaux** qui n'existent pas, et il
donne aux canaux existants une **identité par arme**.

---

## Ce qui existe déjà, et qu'on ne réécrit pas

Un audit honnête d'abord : la moitié de ce qu'un cahier des charges de *game
feel* réclame est **déjà dans le dépôt**, souvent mieux fait que ce qu'une
refonte produirait.

| demandé | où c'est déjà, et sous quelle forme |
|---|---|
| pipeline d'événements de combat | `events.js` / `EventPump` / `handleEvent` — un instantané diffé produit des événements typés, sortis sur l'horloge de rendu. **C'est le pipeline.** |
| explosion en couches à timings distincts | `spawnBlast()` : noyau (34 ms, né à taille max), boule de feu ×3, onde de choc qui dépasse, débris, fumée, marque au sol. Mise à l'échelle par le nombre de tués. |
| priorité et limitation des voix | `VoiceLimiter` : 16 voix, cooldown par clé, vol de voix avec fondu, `claim` pour prendre la place sans passer devant. |
| budget de retour par fréquence | quatre paliers **écrits** dans `RENDU.md` : touche / mort / fait notable / moment de manche. |
| hit-stop borné | `addHitstop`, réservé aux **barres de boss**, 100 ms, ≤ 30 par manche, sur l'horloge de **rendu**. |
| screen shake par niveaux | `addShake` + `SHAKE_MAX`, table `EFFECT_SOUND` où chaque effet déclare son `shake` (0 pour un tir ordinaire). |
| réaction de l'ennemi | éclair d'atlas + **recul directionnel** (`HIT_KICK`) + écrasement + **coup de zoom** ×1,15 sur critique. |
| silhouette de projectile par arme | 7 formes (`BOLT_*`) **déduites** d'`ARMES`, aucune clef réseau ouverte. |
| mort différenciée | `DEATH_BURST`, une ligne par type d'ennemi : nombre, taille, vitesse, cône, éclair. |
| pooling / batch | tableau plat + retrait par échange, `PARTICLE_MAX` 300 (2D) / 3 000 (GL), 3 cases d'atlas, **un** lot WebGL, additif. |
| lecture des ressources d'arme | anneau de rampe, ligne de charge du railgun, crans de chargeur, nappe + terminus du laser. |
| debug / profiling | `?perf` : fps, particules, `GL/2D`, lots, quads, voix actives, pic de voix. |

**Rien de tout ça ne se refait.** Le travail est ailleurs.

---

## Les six manques

Classés par ce qu'ils coûtent au joueur, pas par difficulté.

### 1 — Aucun départ de coup. Zéro.

`grep -rn "muzzle\|bouche\|recul" public/` rend **zéro ligne**. Le personnage ne
recule pas, le canon ne s'allume pas, rien ne sort. Un projectile **apparaît**
à 4 px du corps. C'est le plus gros manque du dépôt, et le moins cher à combler :
le recul est un `scaleX/scaleY` et un décalage sur un `drawSprite` qui existe
déjà — **aucune image d'atlas**, budget déjà écrit dans `RENDU.md`.

### 2 — Un `tir` par instantané, sans propriétaire et sans arme

```js
let firstNew = null;
for (const [id, bu] of b.bullets) {
  if (!a.bullets.has(id) && dansVue(vue, bu.x, bu.y)) { firstNew = bu; break; }
}
if (firstNew) out.push({ t: "tir", x: firstNew.x, y: firstNew.y });
```

`break` au premier. Pas d'`owner`. Pas d'angle. À 20 Hz, quatre joueurs portant
quatre armes différentes produisent **un** `playSound("tir")` toutes les 50 ms,
le même échantillon pour tout le monde.

**L'identité sonore des armes n'est pas mal réglée : elle est structurellement
impossible.** C'est le seul verrou d'architecture du plan.

### 3 — L'impact ne sait pas d'où vient le coup

`registerHit()` calcule la direction depuis **le joueur le plus proche**, pas
depuis le projectile. Un tir allié venu de l'autre bout de l'écran envoie ses
étincelles dans le mauvais sens. Or `auteurDe()` **retrouve déjà** la balle
éteinte la plus proche du point d'impact — il jette sa direction.

Le retour d'impact est par ailleurs le même partout : deux traits blancs
(`COMBAT.flash`), plus les éclats du critique. Un rail de 53 dégâts et un plomb
de 6 rendent la même étincelle.

### 4 — Trois armes sur dix sont sur un chemin à part

Laser, tesla et lame ne créent aucune balle, donc n'émettent aucun `tir`. Chacune
a trouvé son propre raccroc : le laser une boucle continue (`startFaisceau`), le
tesla le son `foudre` de l'effet 3, la lame `balayage` réaccordé de l'effet 17.
Trois solutions ad hoc pour la même question.

### 5 — Le biome ne touche pas le combat

Le plan 14 a donné quatre langues aux lieux. Une étincelle rend exactement la
même chose dans les quatre. Le manque est **petit** et il vaut d'être petit :
c'est une teinte et une matière secondaire, pas un second jeu d'effets.

### 6 — La touche de boss n'a qu'une voix

`bossFlash` (80 ms, rejeu de silhouette) + `spawnCritShards`. Toujours identique,
quelle que soit l'arme, quelle que soit la part de barre enlevée. Le palier
« touche sans dégât » existe pourtant déjà et il est bien fait (`ricochet`).

---

## L'architecture minimale

Quatre changements. **Aucun n'ouvre une clef d'instantané**, aucun ne touche la
simulation, aucun ne crée un second chemin d'événements.

### A · `shared/feedback.js` — la fiche de retour d'une arme

Un module **pur, sans dépendance**, sur le modèle de `palette.js` et
`units.js`. Il déclare pour chaque arme sa **famille de retour**, et pour chaque
famille ce que les quatre canaux en font.

```js
export const FAMILLES = { BALISTIQUE, PLASMA, FAISCEAU, ELECTRIQUE, EXPLOSIF, LAME };

export const FEEDBACK = {
  balistique: {
    muzzle: { taille: 0.8, duree: 0.05, fumee: 0, recul: 3.5 },
    impact: { palier: 0, matiere: "metal", eclats: 2, cone: 1.6 },
    son:    { tir: "tirSec", jitter: 0.06, impact: "impactMetal" },
    camera: 0,
  },
  ...
};
```

**La famille se DÉDUIT d'`ARMES` partout où c'est possible**, exactement comme
`silhouetteArme()`, `canonEffet()` et `conversionBoss()` : `a.chaleur → faisceau`,
`a.souffle → explosif`, `a.rebonds → électrique`, `a.lame → lame`. Une famille ne
se **déclare** que là où la déduction mentirait. Une onzième arme hérite donc
d'un retour cohérent sans ligne de table.

Le module est dans `shared/` et non dans `public/` pour une raison précise :
**`audio.js` ne dépend de rien**, et il doit lire les recettes de tir. Un module
pur de `shared/` est le seul endroit d'où les deux le peuvent.

### B · `events.js` — deux champs, zéro octet réseau

```js
// avant : un seul tir, anonyme
out.push({ t: "tir", x, y });
// après : un par propriétaire, avec son compte
out.push({ t: "tir", owner, n, x, y, ang });
```

Le propriétaire voyage **déjà** dans le tuple de la balle (`a[3]`), et l'arme
**déjà** dans le tuple du joueur (`a[35]`). `ARMES[players.get(owner).arme]`
rend la fiche. **Rien de nouveau ne circule.**

Même geste pour l'impact : `auteurDe()` connaît la balle qu'il a réclamée, il
rend en plus `dx/dy`. Le manque 3 se ferme sans une ligne de réseau.

Pour les trois armes sans balle, la même fonction rend l'événement depuis
l'effet qu'elles émettent déjà (3, 17) ou depuis l'état du joueur (`chaleur`) :
**un seul point de production de `tir`**, pas quatre.

### C · `fx.js` — la fiche pilote les canaux existants

`handleEvent` ne change pas de forme. Deux `case` lisent la fiche au lieu d'une
constante :

```
case "tir"    -> muzzle(fiche, x, y, ang, n)
case "impact" -> impact(fiche, palier, x, y, dx, dy, biome)
```

**On n'écrit pas de `combatFeedback.play("plasma_hit", …)`.** Un registre à clefs
de chaîne serait un **second** répartiteur à côté d'un pipeline typé qui marche
déjà — deux chemins pour un événement, exactement ce que ce dépôt refuse
partout ailleurs. La fiche est la donnée, `handleEvent` reste le point de
passage.

Le palier d'impact (`LÉGER / MOYEN / LOURD / CRITIQUE / BOSS`) se **calcule** de
`e.dmg / e.maxHp`, valeurs déjà présentes dans l'événement. Il ne se déclare pas.

### D · `audio.js` — des recettes, pas un gestionnaire

`PALETTE` **est** le gestionnaire de sons, et `VoiceLimiter` **est** la priorité.
Il manque des recettes et une seule fonction :

```js
playWeapon(fiche.son, { pitch: 1 + (Math.random() - 0.5) * fiche.son.jitter })
```

La clef du limiteur est la **famille**, pas le joueur : quatre joueurs sur la
même arme partagent une place, le nombre de voix ne bouge pas. C'est la variation
de hauteur et de gain qui casse la répétition — **pas** quatre fichiers `shot_0x`.
Un seul échantillon existe aujourd'hui (`laser shot.wav`) ; le repli synthétisé
est déjà automatique et testé sur le **tampon chargé**.

---

## Ce qui ne bouge pas

- **Le gameplay.** Aucun chiffre d'`ARMES`, `CARD_CFG`, `SKILL_CFG` ne change.
  Dégâts, cadences, portées, collisions : intouchés.
- **Le réseau.** Aucune clef d'instantané n'est ouverte. Tout ce que le retour
  demande est **déductible** de ce qui circule.
- **La simulation.** `shared/game_state.js` n'est pas touché par ce plan.
- **Les quatre paliers de fréquence.** Un tir ordinaire ne secoue pas l'écran,
  une mort n'est jamais un événement individuel, le hit-stop reste aux barres de
  boss. **Un canal qui s'ouvre n'annule pas un budget.**
- **L'ordre de dessin.** La lumière s'arrête avant le premier élément de
  gameplay. Un projectile n'est ni une source de lumière ni une ombre — la
  fréquence l'interdit, et ça reste vrai.
- **Le contrat `low`.** Cinq points de lecture de `gfx`, pas un de plus.
- **`PARTICLE_MAX`.** Un canal de plus se paie dans le plafond existant, il ne le
  relève pas.

**Pas de pooling de particules dans ce plan.** Le tableau plat à retrait par
échange n'alloue qu'un petit objet et le plafond borne déjà le pire cas ; un pool
se justifie sur une **mesure**, et la mesure n'existe pas. On la fait au lot 6.

---

## Les lots

| # | lot | ce qui change |
|---|---|---|
| **1** | la fiche et la voix | `shared/feedback.js`, `tir` par propriétaire, recettes de tir par famille. Deux armes de référence : **canon d'assaut** (cadence haute) et **fusil de siège** (cadence lente, lourde). |
| **2** | le départ du coup | muzzle orienté par `armeAng`, recul du personnage, fumée et douille selon la famille. Les 10 armes. |
| **3** | l'impact | `dx/dy` dans l'événement, table d'impact par palier × matière, teinte d'étincelle par biome. |
| **4** | la mort et le souffle | familles d'ennemis (métal / organique) sur `DEATH_BURST` et `spawnBlast`, sons de mort différenciés dans le budget du palier 1. |
| **5** | le boss | voix de touche par arme, part de barre lue dans l'intensité, séquence de mort. |
| **6** | mesure | compteurs `?perf` étendus, vérification du contrat `low`, chiffres dans `LISEZMOI.md`. |

**Un lot = un commit = un bump.** Le plan 14 occupait `0.17.x`, le plan 15 ouvre
**`0.18.x`**.

---

## Le critère de non-régression

Celui du cahier des charges, et il est rejouable : **une capture de dix secondes
sans HUD doit laisser nommer l'arme qui tire.** Si le tesla, le siège et le
canon d'assaut restent interchangeables à l'oreille comme à l'œil, le lot n'est
pas fini.

Le second critère est un chiffre, et il a été **corrigé par la mesure du lot 1** :
la formulation d'origine — « le nombre de voix au pic ne monte pas » — était
fausse, puisque quatre familles distinctes *doivent* occuper plus d'une place
que le son unique qu'elles remplacent. Le critère juste est celui qui dit la
saturation : **le pic reste sous `MAX_VOICES` et aucune voix n'est volée.**

Mesuré au lot 1, 8 minutes simulées, 4 joueurs, mode normal :

| cas | sons joués | pic de voix | volées | refusées |
|---|---|---|---|---|
| avant (référence) | 1 012 | ~2 / 16 | 0 | — |
| 4 armes différentes | 1 165 (+15 %) | **5 / 16** | 0 | 0 |
| 4 fois la même arme rapide | **805** — identique à l'ancien code | 3 / 16 | 0 | 1 873 |

Le pire cas est donc **gratuit** : quatre joueurs sur la même arme rendent
exactement le nombre de sons d'avant, le limiteur absorbant les 2 678 événements
émis. Ce qui coûte, c'est la **différence** — et c'est ce qu'on achète.
