# Cartes d'amelioration — contrat technique

Complement de `cartes-ameliorations.md`, qui reste la reference de *design* (liste
des cartes, valeurs, pieges). Ce document-ci fige les **interfaces** : protocole
reseau, cles de `mods`, ajouts au snapshot. Il sert de contrat commun a tout ce
qui touche au systeme, cote serveur comme cote client.

Decisions prises avec le joueur avant demarrage :

- **catalogue complet** (42 cartes) des le premier jet ;
- **le boss durcit par de nouveaux patterns**, pas par une auto-regulation de ses PV ;
- **la cadence de tir ne progresse plus toute seule** : elle ne s'obtient que par
  les cartes et les bonus au sol.

---

## 1. Phase de choix

`GameState` reste pur : il ne connait ni le reseau ni les minuteurs de salon.

1. `_killBoss()` remplit `state.cardOffers` — une Map `playerId -> [3 ids]` — et
   leve `state.cardsPending = true`.
2. Le serveur voit le drapeau, passe en `PHASE_CARDS`, **cesse d'appeler
   `step()`** mais **continue de diffuser les snapshots a 20 Hz** : l'arene reste
   visible, figee, derriere l'ecran de choix.
3. Chaque joueur recoit ses trois cartes. Les joueurs a terre choisissent aussi.
4. Reprise quand tous ont choisi, ou a l'expiration du delai
   (`CARD_PICK_TIME`, 30 s) : la premiere carte offerte est prise d'office.

### Messages

| Sens | Message |
|---|---|
| S → C | `{t:"cards", boss, deadline, offers:[{id, nom, rarity, desc}]}` — personnel |
| S → C | `{t:"cardsWait", pending:[playerId]}` — a chaque choix enregistre |
| C → S | `{t:"pickCard", id}` |
| S → C | `{t:"loadout", byPlayer:{playerId:[cardId]}}` — a chaque changement |

`deadline` est un horodatage `Date.now()` cote serveur ; le client affiche le
decompte restant sans avoir besoin d'horloges synchronisees, l'ecart d'une
seconde etant sans consequence ici.

**Le serveur valide** que l'id recu figure bien dans les trois offertes a ce
joueur pour ce boss. Sans cette verification, n'importe quel client s'octroie
une legendaire.

Les cartes possedees **ne passent jamais dans le snapshot** : elles ne changent
qu'entre deux manches de boss, une diffusion par changement suffit.

---

## 2. `shared/cards.js`

Nouveau module pur, importe par le serveur **et** par le navigateur via
`/shared/`. Les identifiants sont des **chaines** (`"calibre"`, `"railgun"`) et
non des index : ces ids ne circulent pas dans le snapshot 20 Hz, l'invariant
positionnel des tableaux exportes ne s'applique donc pas ici. On peut inserer
une carte au milieu de la table sans rien casser.

```js
{
  id: "calibre",
  nom: "Calibre superieur",
  rarity: 0,            // 0 commune, 1 rare, 2 epique, 3 legendaire
  max: 5,
  desc: "+15 % de degats",       // affiche au joueur, avec accents
  tags: ["off"],                 // off | def | coop — sert aux mesures
  incompatible: [],
  apply(m, n) { m.damageMul += 0.15 * n; },
}
```

`apply` recoit l'objet `mods` en construction et `n`, le nombre d'exemplaires
possedes. Il ne lit jamais l'etat du joueur : le calcul doit rester une fonction
pure de la liste de cartes.

### Tirage

`drawCards(owned, bossIndex, rng)` :

- poids de base `[60, 28, 10, 2]` ;
- a chaque boss : `commune x0.85`, `epique x1.35`, `legendaire x1.8` ;
- les trois cartes sont **distinctes** ;
- une carte au `max` atteint est retiree ;
- une carte listee dans `incompatible` d'une carte possedee est retiree — c'est
  ce qui empeche « Perforation » de sortir a un joueur qui a deja le Railgun,
  et les trois armes de remplacement de se cumuler ;
- **garantie anti-frustration** : deux boss consecutifs sans rien d'autre que
  des communes forcent une rare dans le tirage suivant.

---

## 3. Cles de `mods`

`_recomputeMods(p)` est appele **uniquement a la prise d'une carte**. Les
systemes lisent `p.mods` ; aucun ne parcourt la liste de cartes.

**Convention de cumul** : les gains sont **additifs** (`base * (1 + Σ)`), les
reductions sont **multiplicatives et plafonnees** (`Math.max(plancher, Π)`).
Ne pas melanger les deux.

| Cle | Defaut | Sens |
|---|---|---|
| `damageMul` | 1 | multiplicateur de degats des balles |
| `fireIntervalMul` | 1 | multiplicatif, plancher 0.35 |
| `maxHpBonus` | 0 | PV max en plus |
| `hpCap` | 0 | plafond dur de PV max (0 = aucun) |
| `speedMul` | 1 | vitesse de deplacement |
| `bulletSpeedMul` | 1 | vitesse des balles |
| `bulletLifeMul` | 1 | portee |
| `reviveSpeedMul` | 1 | vitesse de reanimation |
| `reviveRadiusMul` | 1 | rayon de reanimation |
| `reviveHpRatio` | 0 | plancher sur la part de PV rendus au releve |
| `damageTakenMul` | 1 | multiplicatif, plancher 0.4 — applique dans `_hurt()` |
| `pickupRadius` | 0 | rayon d'aimantation des bonus au sol |
| `scoreMul` | 1 | score gagne |
| `healPerBoss` | 0 | PV rendus a chaque boss tue |
| `pierce` | 0 | ennemis traverses par balle |
| `extraBarrels` | 0 | balles supplementaires en eventail |
| `barrelDamageMul` | 1 | penalite de degats des canons en plus |
| `shieldPool` | 0 | bouclier regenerant |
| `lifesteal` | 0 | part des degats rendue en PV |
| `burnDmg` | 0 | degats de brulure, sur `BURN_TIME` |
| `chain` | 0 | rebonds de ricochet permanents |
| `chainChance` | 0 | probabilite d'arc de foudre |
| `selfRevive` | 0 | 1 = premiere mise a terre relevee seule |
| `counterNova` | 0 | degats de la nova de riposte |
| `zoneImmunity` | 0 | secondes d'immunite apres une zone |
| `autoTurretCd` | 0 | periode de pose automatique de tourelle |
| `orbiters` | 0 | nombre de lames orbitales |
| `backShot` | 0 | 1 = balle arriere a 70 % |
| `pulsarCd` | 0 | periode de l'onde automatique |
| `drones` | 0 | drones de soutien |
| `swarm` | 0 | mini-drones d'essaim |
| `frenzy` | 0 | 1 = cadence cumulative sur les kills |
| `frostRadius` | 0 | rayon de l'aura de givre |
| `harvest` | 0 | probabilite de fragment de soin |
| `deathWave` | 0 | degats de l'onde de mort |
| `echoChance` | 0 | probabilite de tir double |
| `guardianCd` | 0 | recharge du relevement instantane d'allie |
| `instinctCd` | 0 | recharge de l'instinct de survie |
| `weapon` | `null` | `"dispersion"` \| `"railgun"` \| `"grenade"` |

Les **minuteurs** correspondants vivent a part, sur le joueur (`p.timers`) : les
mods sont recalcules a chaque carte prise, les minuteurs ne doivent pas l'etre.

---

## 4. Ajouts a la simulation

| Systeme | Etat |
|---|---|
| brulure | `e.burn = {dmg, t}`, decompte dans `_enemies()` |
| orbiteurs | **aucun etat** : angle derive de `this.time`, meme formule des deux cotes |
| drones / essaim | `this.drones`, nouvelle cle de snapshot `dr` |
| givre | rayon lu dans `_enemies()`, pas d'entite |
| tourelle auto, pulsar, riposte, ange gardien, instinct | minuteurs sur le joueur |
| vampirisme, recolte, onde de mort, frenesie | crochets dans `_killEnemy()` et au point de degat |
| armes de remplacement | branche dans `_fire()` ; la grenade est une balle `boom:true` |

### Registres partages — entrees ajoutees

Ajouts **a la fin**, jamais au milieu :

- `POWERUP_TYPES` : `"fragment"` (soin de la carte Recolte) ;
- `kind` d'effet : `7` explosion de grenade, `8` onde blanche (pulsar, onde de
  mort, riposte) ;
- tableau joueur du snapshot : un champ de drapeaux visuels **en derniere
  position** (givre actif, nombre d'orbiteurs), lu avec repli `?? 0` ;
- nouvelle cle de snapshot `dr` : `[id, x, y, ang, kind, owner]`, `kind` valant
  0 pour un drone de soutien et 1 pour un mini-drone d'essaim. `owner` sert
  uniquement a teinter le drone aux couleurs de son proprietaire : sans lui, on
  ne distingue pas les drones de deux joueurs cote a cote.

---

## 5. Boss

La puissance qui indexe les PV (`power` dans `_boss`) doit inclure
`p.mods.damageMul` et les autres sources permanentes, pas seulement `p.dmgMul` —
sinon le troisieme boss tombe en quinze secondes.

Trois patterns nouveaux, ouverts par **numero de boss** et non par barre :

- **spirale** — salve en rotation continue, on lit le sens et on court avec ;
- **traque** — zone qui suit un joueur, trois vagues successives ;
- **mur** — bande qui traverse l'arene avec un trou mobile.

Le boss N demarre avec les mecaniques deja ouvertes jusqu'a la barre
`min(N - 1, 4)` : au troisieme boss on ne reapprend pas le damier.

---

## 6. Cadence

`FIRE_RAMP` disparait : l'intervalle de tir ne depend plus du temps de manche.

```
interval = max(FIRE_INTERVAL_MIN, FIRE_INTERVAL * mods.fireIntervalMul * (buff ? BUFF_RATE_MUL : 1))
```

La cadence ne s'obtient donc plus que par les cartes et les bonus au sol. C'est
le point qui demande le plus de remesure : les DPS de fin de manche chutent
mecaniquement, et les 180 premieres secondes se jouent **avant** la premiere
carte. `FIRE_INTERVAL` de base et `ENEMY_HP_RAMP` sont a recaler par simulation,
chiffres reportes dans `LISEZMOI.md`.

---

## 7. Ce que le client affiche

- ecran de choix : trois cartes, couleur de rarete, effet en clair, decompte ;
- bandeau « en attente de X, Y » pendant que les autres choisissent ;
- **touche Tab** : liste des cartes possedees, consultable en jeu ;
- tableau de fin : les cartes de chacun, et les **degats totaux infliges** —
  sans cette colonne, un joueur qui a pris des cartes defensives a l'impression
  d'avoir perdu ses tours.

---

## 8. A verifier apres implementation

Le plafond de 220 ennemis a ete cale **sans** ces effets. Avec vampirisme,
brulure, ricochet et chaine de foudre actifs simultanement, la boucle de
collision s'alourdit nettement : mesurer le temps CPU par tick avant de
conclure, comme pour tout le reste de l'equilibrage de ce depot.
