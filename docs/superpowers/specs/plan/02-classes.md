# Lot 2 — Classes et compétences

## Objectif

Trois classes choisies au salon et verrouillées pour la session, deux
compétences chacune, avec des écarts de puissance modérés.

Dépend du lot 1 : `_teamPower()` doit exister avant qu'on y injecte des
multiplicateurs de classe.

## 1. Les trois classes

```
CLASSES = [
  { id: "tank",    hp: 150, damageMul: 0.80, speedMul: 0.92, unique: true  },
  { id: "soigneur",hp: 100, damageMul: 0.85, speedMul: 1.00, unique: true  },
  { id: "dps",     hp:  85, damageMul: 1.20, speedMul: 1.04, unique: false },
]
```

**Les écarts sont volontairement modérés.** Avec « maximum un tank et un
soigneur », une partie à deux peut être composée d'un tank et d'un soigneur —
donc les trois classes doivent rester capables de tuer. Des écarts du type
0,3 / 1 / 2 rendraient ce duo incapable de finir une vague.

`CLASSES` est un tableau exporté et ordonné : son index circule dans les
snapshots, ne jamais insérer au milieu.

## 2. Sélection au salon

- Choix avant la première manche, **verrouillé pour toute la session**.
- `unique: true` : un seul tank et un seul soigneur par partie. Premier arrivé,
  premier servi ; l'interface grise les emplacements pris.
- Un joueur sans choix explicite est `dps` par défaut au lancement de la manche.
- **Libération à la déconnexion** : l'emplacement redevient disponible. Un
  joueur qui arrive ensuite choisit parmi les emplacements libres.
- Un spectateur choisit sa classe pendant qu'il regarde, elle s'applique à son
  entrée en jeu.

Le serveur valide : refuser un choix pour une classe unique déjà prise, refuser
tout changement une fois la première manche lancée.

## 3. Compétences

Chaque classe a **une compétence de placement** (proactive, à anticiper) et
**une compétence de réaction** (le bouton qu'on presse quand ça tourne mal).
C'est ce qui évite d'avoir deux boutons redondants.

### Tank

**Rempart** — placement. Touche 1.

```
TANK_BULWARK_RADIUS: 170
TANK_BULWARK_TIME: 8
TANK_BULWARK_SHIELD_RATE: 12    // points de bouclier par seconde
TANK_BULWARK_SHIELD_CAP: 60
TANK_BULWARK_CD: 20
```

Zone posée à la position du tank. Quiconque s'y tient gagne du bouclier. Elle
crée une vraie tension : elle récompense l'immobilité dans un jeu qui la punit,
et la horde converge exactement là.

**Provocation** — réaction. Touche 2.

```
TANK_TAUNT_RADIUS: 400
TANK_TAUNT_TIME: 5
TANK_TAUNT_INVULN: 1.2
TANK_TAUNT_REDUCTION: 0.5       // apres l'invulnerabilite
TANK_TAUNT_CD: 24
```

Tous les ennemis dans le rayon prennent le tank pour cible pendant la durée. Le
tank est invulnérable 1,2 s, puis à −50 % de dégâts subis.

**Pourquoi 1,2 s et non une invulnérabilité franche** : les annonces de boss
durent 1,4 à 2 s. Une invulnérabilité couvrant une annonce entière ferait
traverser les mécaniques sans les lire, et l'écart entre « lire l'annonce » et
« l'ignorer » — la métrique de référence du dépôt — s'effondrerait. 1,2 s
couvre le pic d'un coup encaissé, pas une phase.

C'est aussi la compétence qui donne enfin un sens à la réanimation : elle
arrache la horde d'un allié à terre pour qu'un troisième puisse le relever.

*Piège technique* : les ennemis ciblent via `_nearestPlayer`. Implémenter un
**état de provocation global** (`state.taunt = {id, until}`) consulté par cette
fonction, et non une cible par ennemi — ce serait 200 champs de plus dans la
simulation et le snapshot.

### Soigneur

**Bascule mode soin** — mode permanent, pas une recharge. Touche 1.

```
HEAL_MODE_INTERVAL: 0.35        // cadence propre au mode soin
HEAL_MODE_ALLY: 10              // PV rendus par impact sur un allie
HEAL_MODE_SELF: 3               // PV rendus au soigneur par impact sur un ennemi
HEAL_MODE_REVIVE: 0.35          // secondes de reanimation par impact sur un joueur a terre
HEAL_MODE_SWAP_CD: 0.5          // anti-spam de la bascule
```

En mode soin : zéro dégât aux ennemis, mais **les projectiles s'arrêtent quand
même sur eux**. C'est la contrainte qui rend la classe intéressante — soigner
quelqu'un derrière la horde devient un problème de position et de ligne de vue,
pas un clic sur une barre.

Trois règles qui la complètent :

- **Toucher un allié à terre fait progresser sa réanimation.** Le soigneur
  devient le releveur à distance, ce qui n'existe nulle part ailleurs.
- **Le surplus de soin se convertit en bouclier**, sinon soigner quelqu'un à
  pleine vie ne sert à rien.
- **Un petit retour de PV sur soi à chaque impact ennemi** : sans allié, le mode
  soin serait mort, or le jeu se joue aussi en solo.

*Piège technique* : en mode soin, les balles doivent entrer en collision avec
les **joueurs**, ce qui n'existe pas aujourd'hui. Restreindre strictement au
propriétaire soigneur en mode soin, pour ne pas payer ce test sur toutes les
balles de la partie.

**Vague de soin** — réaction. Touche 2.

```
HEAL_WAVE_RADIUS: 300
HEAL_WAVE_AMOUNT: 35
HEAL_WAVE_CD: 16
```

Instantanée, contrairement au rempart du tank qui se prépare. Elle purge aussi
un état — voir le lot 3.

### DPS

**Bombe** — placement. Touche 1.

```
DPS_BOMB_DELAY: 0.6
DPS_BOMB_RADIUS: 140
DPS_BOMB_DAMAGE: 200
DPS_BOMB_BOSS_MUL: 0.25         // fortement reduite sur le boss
DPS_BOMB_MAX_TARGETS: 12        // plafond : voir ci-dessous
DPS_BOMB_CD: 9
```

Lancée sur le réticule, explose après un délai. Le délai est essentiel : sans
lui, c'est un clic gagnant sans anticipation.

*Piège d'équilibrage* : avec 200 ennemis, une explosion peut en toucher
quarante. Sans plafond de cibles, la bombe devient l'essentiel de la
contribution du DPS et le reste de son jeu ne compte plus. Plafonner à 12
cibles, les plus proches d'abord.

**Surcharge** — réaction. Touche 2.

```
DPS_OVERDRIVE_TIME: 6
DPS_OVERDRIVE_BASE: 0.20        // bonus de cadence au declenchement
DPS_OVERDRIVE_PER_KILL: 0.08
DPS_OVERDRIVE_MAX: 1.00
DPS_OVERDRIVE_CD: 26
```

Le bonus **monte à chaque kill pendant la fenêtre**. C'est ce qui la sauve du
bouton sans décision : déclenchée au creux d'une vague elle est médiocre, au
pic elle est spectaculaire. Le DPS doit lire le rythme, comme le tank lit les
regroupements.

## 4. Protocole

Deux drapeaux ponctuels de plus, sur le modèle **exact** du drapeau d'esquive :

```
client -> serveur : { t:"input", x, y, ax, ay, d, s1, s2 }
```

`s1` et `s2` sont **remis à zéro par la boucle de simulation après chaque
tick**, comme `d`. Sans ça, une demande resterait levée et la compétence
repartirait toute seule à chaque fin de recharge — le bug est documenté dans
`CLAUDE.md` pour l'esquive, ne pas le refaire.

Côté client, touches **1** et **2**, plus **clic droit** en alias de la
compétence 1 (la bombe et le rempart se posent tous deux à un endroit).

## 5. Sérialisation

Ajouts **en fin** de tableau joueur, avec repli côté client :

| champ | contenu |
|---|---|
| `cls` | index dans `CLASSES` |
| `cd1` | recharge restante de la compétence 1, arrondie au dixième |
| `cd2` | idem compétence 2 |
| `flags` | masque : mode soin actif, provocation active, surcharge active |

Nouvelles entités dans le snapshot : rempart (position, rayon, durée restante),
bombes en vol (position, temps avant explosion).

Nouveaux `kind` d'effet à déclarer dans le registre de `CLAUDE.md` :
`9` rempart posé · `10` provocation · `11` vague de soin · `12` explosion de bombe.

## 6. Cartes de classe

Un champ `cls` dans la table des cartes, filtré au tirage. Très peu de code,
beaucoup de rejouabilité — et ça soulage l'épuisement du pool signalé au lot 1.

### Tank

| id | nom | effet | rareté |
|---|---|---|---|
| `rempart_large` | Rempart élargi | rayon ×1,4 et durée +3 s | rare |
| `provocation_longue` | Provocation prolongée | +2 s de durée, −4 s de recharge | rare |
| `carapace` | Carapace | le bouclier reçu par le rempart s'applique aussi au tank hors zone | épique |
| `represailles` | Représailles | encaisser pendant la provocation renvoie 40 dégâts sur 150 px | épique |

### Soigneur

| id | nom | effet | rareté |
|---|---|---|---|
| `faisceau_double` | Faisceau divisé | le projectile de soin touche deux alliés alignés | rare |
| `bascule_vive` | Bascule vive | la bascule est instantanée et donne +25 % de cadence pendant 2 s | rare |
| `vague_large` | Vague ample | rayon ×1,5, purge un état de plus | épique |
| `transfusion` | Transfusion | 30 % des soins prodigués sont aussi rendus au soigneur | épique |

### DPS

| id | nom | effet | rareté |
|---|---|---|---|
| `bombe_fragmentation` | Fragmentation | l'explosion projette 8 éclats à 50 % de dégâts | rare |
| `bombe_double` | Double charge | deux bombes en réserve, recharge inchangée | rare |
| `surcharge_longue` | Surcharge prolongée | +3 s de durée, le bonus ne retombe pas d'un coup | épique |
| `detonateur` | Détonateur | la bombe applique Vulnérabilité (lot 3) | épique |

## 7. Modifications par fichier

### `shared/classes.js` (nouveau)

Module pur, sur le modèle de `cards.js` : ne dépend de rien, ni de
`game_state.js` ni du réseau. Contient `CLASSES`, les constantes de compétences,
et les fonctions de description utilisées par les deux côtés.

### `shared/game_state.js`

- `addPlayer(id, name, colorIndex, cls)` : appliquer PV, multiplicateurs.
- `_players()` : lire `s1`/`s2`, déclencher les compétences, décompter les
  recharges.
- `_teamPower()` : intégrer `damageMul` de classe.
- `_nearestPlayer()` : consulter `state.taunt`.
- Nouvelles entités : `bulwarks`, `bombs`.
- Mode soin : branche séparée dans `_fire()` et une collision balle/joueur
  restreinte.
- `_recomputeMods()` : prendre en compte les cartes de classe.

### `server.js`

- Message `{t:"pickClass", cls}`, validé (unicité, phase salon, session non
  commencée).
- Diffuser les classes dans le salon et le tableau des scores.
- Remise à zéro de `s1`/`s2` après chaque tick.

### `public/client.js` + `index.html`

- Sélecteur de classe au salon, emplacements pris grisés.
- Deux icônes de compétence avec voile de recharge, en bas d'écran.
- Rendu du rempart, de la bombe, du mode soin (couleur de projectile
  différente), de l'aura de provocation.

## 8. Mesures à relever

| mesure | attendu |
|---|---|
| vague atteinte par composition : solo dps, 2 dps, tank+dps, soigneur+dps, trio | écart entre compositions inférieur à 1,5 vague à effectif égal |
| dégâts totaux par classe sur une partie | le tank et le soigneur ne doivent pas être sous 40 % du DPS |
| taux d'utilisation des compétences | plus de 80 % des recharges consommées |
| durée de survie d'un soigneur solo | comparable à celle d'un DPS solo, à ±20 % |

**C'est la mesure de l'écart entre compositions qui décide** s'il faut un
correctif. Si l'écart dépasse 1,5 vague, corriger `WAVE_RATE_POWER_K` (le débit),
pas les PV des monstres.

## 9. Critères d'acceptation

- Deux joueurs ne peuvent pas être tank simultanément, y compris en cas de
  choix simultané.
- La déconnexion du tank libère l'emplacement immédiatement.
- Un soigneur seul termine au moins la vague 4.
- Aucune compétence ne se relance seule après sa recharge (le bug du drapeau
  persistant).
- Le mode soin ne blesse jamais un ennemi, et ses projectiles s'arrêtent bien
  sur eux.
