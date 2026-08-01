# Lot 2 — Économie de progression

Trois sujets liés : la courbe de rareté, les familles de cartes par rareté, et
les bonus au sol devenus redondants.

## 1. La courbe de rareté

### Le problème

La dérive a été mesurée et calibrée — le commentaire de `cards.js` annonce
0,72 légendaire par manche et 55 % des manches en voyant une. En jeu solo,
l'observation est nettement au-dessus.

L'hypothèse la plus probable : **la calibration a été faite à un effectif, et
la qualité de tirage dépend du niveau d'équipe.** En solo, l'expérience commune
n'est pas diluée entre quatre joueurs qui se partagent les kills — un joueur
seul monte les mêmes niveaux, mais chaque niveau ne donne qu'**un** tirage au
lieu de quatre. La qualité grimpe donc aussi vite pour beaucoup moins de cartes
distribuées, et la proportion de légendaires par carte obtenue explose.

**Première action : remesurer à 1, 2, 3 et 4 joueurs séparément**, et
reporter les quatre colonnes. Si l'hypothèse se confirme, le correctif porte
sur `QUALITY_PER_LEVEL` indexé sur l'effectif, pas sur les poids.

### Ce qu'une légendaire doit être

Une légendaire doit être **rare et décisive**. Aujourd'hui la dérive la rend
progressivement banale, ce qui est le pire des deux mondes : assez fréquente
pour ne plus surprendre, pas assez pour structurer une build.

Trois changements :

**a. Plus de dérive sur la légendaire.** `RARITY_DRIFT[3]` passe de 1,10 à
**1,0**. Sa fréquence ne dépend plus que de son poids de base.

**b. Un système de compensation à la place.** La légendaire devient
**garantie** à des jalons fixes plutôt qu'aléatoire :

```
CARD_CFG.LEGENDARY_WAVES: [10, 20]   // une legendaire garantie dans le tirage
CARD_CFG.LEGENDARY_MAX: 2            // plafond dur par manche
```

Aux vagues 10 et 20, une des trois cartes proposées est légendaire. Partout
ailleurs, `RARITY_WEIGHT[3]` descend à **1**, ce qui la rend presque
introuvable au hasard.

C'est plus prévisible, donc plus lisible pour le joueur, et surtout **beaucoup
plus facile à équilibrer** : on sait exactement combien de légendaires une
manche peut contenir. Le hasard du roguelike reste entier — c'est *laquelle*
qui est tirée qui compte, pas *si*.

**c. Le plafond dur.** `LEGENDARY_MAX` empêche le cas dégénéré où un joueur
chanceux en cumule quatre et rend toute mesure d'équilibrage inutilisable.

### Effet attendu

| | avant | après |
|---|---|---|
| légendaires par manche | variable, jusqu'à 3+ | 0 à 2, dont 2 garanties si la manche va loin |
| manches avec au moins une | ~55 % | 100 % de celles qui atteignent la vague 10 |
| poids de la légendaire hors jalon | 2 dérivé | 1 fixe |

La légendaire cesse d'être une loterie pour devenir **une récompense de
progression**. Atteindre la vague 10 devient un objectif en soi.

## 2. Familles de cartes par rareté

### L'idée

Une même famille d'effet déclinée sur trois ou quatre paliers. Ça résout trois
problèmes d'un coup : l'épuisement du pool, la lisibilité de la progression, et
le fait que les raretés hautes n'ont aujourd'hui aucun équivalent « simple ».

```js
// nouveau champ dans la table des cartes
{ id: "affutage", family: "degats", tier: 0, ... }
```

### Les familles

| famille | commune | rare | épique | légendaire |
|---|---|---|---|---|
| **dégâts** | Affûtage +12 % | Calibre supérieur +25 % | Canon surdimensionné +45 % | Cœur de forge +80 %, et +5 % par vague survécue |
| **cadence** | Culasse allégée −7 % | Cadence accélérée −16 % | Rotative −28 % | Chaîne d'assaut −40 %, et la surchauffe ne s'applique plus |
| **survie** | Plaquage +18 PV | Cuir épais −10 % de dégâts subis | Peau de titane +40 PV | Constitution +80 PV et 2 PV/s de régénération |
| **mobilité** | Foulée +7 % | Semelles légères +14 % | Célérité +22 % et −20 % de recharge d'esquive | Vif-argent : l'esquive laisse une traînée qui blesse |
| **soutien** | Trousse +25 % de réanimation | Réanimateur rayon ×1,6 | Ange gardien | Vœu partagé : les cartes de soutien profitent à toute l'équipe |

### Règles de tirage

- **Jamais deux paliers de la même famille dans le même tirage.** Sinon le
  choix est faussé : le palier supérieur écrase toujours l'autre.
- Un palier supérieur possédé **retire les paliers inférieurs du pool** —
  inutile de proposer Affûtage à quelqu'un qui a Cœur de forge.
- Les paliers **se cumulent** s'ils sont obtenus dans l'ordre croissant : c'est
  une progression, pas un remplacement.

### Bénéfice sur l'épuisement du pool

Avec 15 à 20 tirages par manche, les communes se vidaient. Cinq familles × 4
paliers = 20 cartes structurées qui couvrent tout le spectre de rareté, dont
les paliers hauts ne sortent que tard. C'est le meilleur remplissage possible
du pool, parce qu'il est **lisible** : le joueur comprend immédiatement qu'il
existe une version supérieure de ce qu'il vient de prendre.

## 3. Les bonus au sol

### Le problème

Onze types de bonus au sol, dont plusieurs font exactement ce que font les
cartes permanentes : `damage`, `rate`, `double`, `pierce`. Depuis que les
cartes sont fréquentes, ces bonus temporaires n'apportent qu'une redite de
14 secondes.

Et leur fréquence — un toutes les 9 à 14 s, trois au sol simultanément — a été
calibrée à une époque où ils étaient la seule progression du jeu.

### La solution : les deux à la fois

**a. Retirer de la rotation** les quatre qui font doublon :

```
retires  : damage, rate, double, pierce
conserves: heal, shield, slow, nova, beacon, turret, ricochet, purification
```

Ne **pas** les supprimer du tableau `POWERUP_TYPES` — l'index circule sur le
réseau et le client sait les dessiner. Les sortir de la rotation via
`POWERUP_RANDOM_COUNT`, exactement comme `fragment` et `purification` le sont
déjà. Réordonner le tableau pour que les retirés passent après le seuil.

Justification du tri : ce qui reste est **situationnel** (soin, bouclier,
purge) ou **de l'action ponctuelle** (nova, balise, tourelle, ralentissement) —
c'est-à-dire ce qu'une carte permanente ne peut pas offrir. On garde ce qui
crée une décision de trajet, on retire ce qui n'est qu'un multiplicateur en
double.

**b. Réduire la fréquence :**

```
POWERUP_MIN: 9  -> 18
POWERUP_MAX: 14 -> 26
POWERUP_MAX_GROUND: 3 -> 2
```

Un bonus au sol devient un événement, pas un revenu. Cela redonne aussi de la
valeur au trajet : aller le chercher doit être une prise de risque.

### Réserve à surveiller

Le bonus `heal` est la principale source de récupération pour une équipe sans
soigneur. Le diviser par deux en fréquence pourrait rendre l'absence de
soigneur nettement plus punitive — ce qui contredirait la décision du plan
précédent (« le soigneur accélère, il n'est jamais une condition d'accès »).

**À mesurer explicitement** : survie d'une équipe sans soigneur avant / après.
Si l'écart dépasse 20 %, relever le poids de `heal` dans le tirage quand
l'équipe n'a pas de soigneur — le mécanisme existe déjà pour `purification`.

## 4. Modifications par fichier

### `shared/cards.js`
- `RARITY_DRIFT[3]` à 1,0, `RARITY_WEIGHT[3]` à 1.
- `LEGENDARY_WAVES`, `LEGENDARY_MAX` dans `CARD_CFG`.
- Champs `family` et `tier` sur les cartes concernées.
- Vingt cartes de familles, dont réétiquetage de celles qui existent déjà.
- `drawCards` : exclusion intra-famille, retrait des paliers inférieurs,
  garantie de légendaire aux jalons, plafond.

### `shared/game_state.js`
- `POWERUP_TYPES` réordonné, `POWERUP_RANDOM_COUNT` ajusté.
- `CFG.POWERUP_*` mis à jour.
- `_randomPowerupType` : poids relevé sur `heal` sans soigneur, si la mesure le
  justifie.

### `server.js`
Passer le numéro de vague à `drawCards` pour la garantie de légendaire.

### `public/client.js`
Afficher le palier de famille sur la carte (« dégâts — palier 3/4 »), ce qui
rend la progression lisible.

## 5. Mesures à relever

Cinq essais par configuration, à **1, 2, 3 et 4 joueurs séparément** — c'est
l'omission qui a produit le défaut :

| mesure | attendu |
|---|---|
| légendaires par manche, par effectif | 0 à 2, jamais plus |
| épiques par manche, par effectif | écart entre effectifs inférieur à 30 % |
| cartes distinctes proposées sur une manche | pas de répétition avant épuisement de la rareté |
| vague atteinte, avant / après retrait des bonus au sol | écart inférieur à 1 vague |
| **survie sans soigneur, avant / après** | **écart inférieur à 20 %** |

## 6. Critères d'acceptation

- Aucune manche ne distribue plus de deux légendaires.
- Deux paliers de la même famille ne sont jamais proposés ensemble.
- Un joueur possédant un palier haut ne se voit jamais proposer un palier bas.
- Les bonus retirés de la rotation n'apparaissent plus au sol, mais le client
  sait toujours les dessiner si un ancien index arrive.
- La vague 10 propose systématiquement une légendaire.
