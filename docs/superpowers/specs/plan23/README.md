# Survivor LAN — plan 23 : la boucle de récompense

Deux systèmes se partagent le mot « progression » et ne jouent pas le même rôle.
Les **reliques** construisent le personnage sur la manche. Les **bonus au sol**
sont des micro-décisions de combat : un effet simple, immédiat, le plus souvent
temporaire, qui ouvre une fenêtre — finir une élite, se repositionner, encaisser
une vague. Ce plan ferme d'abord le second, parce qu'il est **cassé**, puis
ouvre le premier.

---

## 1 · Ce que l'audit a trouvé

| # | défaut | preuve |
|---|---|---|
| 1 | **Quatre bonus sur treize ne tombent jamais.** `damage`, `rate`, `double`, `pierce` sont dans `POWERUP_TYPES` mais absents de `POWERUP_ROTATION`, et les trois autres points d'apparition (élite, `ravitaillement`, `harvest`) passent par `_randomPowerupType()`. **Correction apportée au lot 5** : ce n'était pas un oubli. `LISEZMOI.md`, « Retrait des bonus au sol », enregistre le retrait comme une **décision mesurée**, antérieure au premier commit du dépôt. Le lot 1 les rend, le lot 5 paie la dette d'équilibrage que ce retour crée. | `game_state.js:552`, `LISEZMOI.md` |
| 2 | **Quatre pastilles de HUD sur cinq sont donc inatteignables**, ainsi que leur rangée d'insignes sur le joueur. | `hud.js:891`, `boss.js:1415` |
| 3 | **Le bonus de ralentissement pouvait RACCOURCIR un ralentissement en cours.** `this.slow = CFG.SLOW_TIME` écrase ; la carte Instinct, elle, écrit `Math.max`. | `game_state.js:4021` vs `7747` |
| 4 | **Le bonus de bouclier plafonne à `CFG.SHIELD_POOL`**, sans lire `p.mods.shieldPool` : une build bouclier au-dessus de 80 le ramasse pour rien. | `game_state.js:4019` |
| 5 | **La balise écrit `o.shield` à la main**, hors de `_grantShield()` : ni plafond, ni relais `shieldShare`. | `game_state.js:4048` |
| 6 | **Trois bonus peuvent ne rien faire du tout** : `heal` à PV pleins, `shield` à jauge pleine, `purification` sans état. | `game_state.js:4009-4031` |
| 7 | **Un bonus qui expire sonne comme un bonus ramassé.** `events.js` n'a qu'un critère — l'identifiant disparaît près d'un joueur. | `events.js:239-248` |
| 8 | **Aucun compte à rebours** : `life` ne circule pas, donc rien ne dit qu'un bonus va disparaître. | `game_state.js:8518` |
| 9 | **Un seul son pour treize bonus**, et le `type` transporté par l'événement n'est jamais lu. | `fx.js:182` |
| 10 | **Aucune particule à la collecte, aucune à l'apparition.** Le corps dessiné est le même disque pour les treize ; seuls l'icône et la teinte changent. | `actors.js:1393` |
| 11 | Le générateur se **bloque** sur des bonus que personne ne ramasse (`POWERUP_MAX_GROUND = 2`) — relevé en 0.8.12, jamais traité. | `version.js:602` |

Les vingt-quatre reliques, elles, sont **toutes lues** : aucun champ mort.
Le défaut y est de conception, pas de câblage — voir le lot 4.

---

## 2 · Les lots

| lot | version | contenu | critère |
|---|---|---|---|
| **1** | 0.26.0 | **Réparation.** Les quatre bonus reviennent, les six effets qui ne rendaient rien rendent quelque chose, `verifierBonus()` refuse un type qui ne tombe pas et un effet qui n'écrit rien. | aucun type inatteignable, aucun ramassage nul |
| **2** | 0.26.1 | **Le tirage situationnel.** Un poids par type, fonction de l'état — PV manquants, états posés, corps à l'écran, boss, et ce que les ARMES de l'équipe savent lire. | tout type reste tirable, aucun ne dépasse le double de sa part plate |
| **3** | 0.26.2 | **Ce qu'un bonus dit.** Trois familles → une forme, un son, une gerbe ; apparition, collecte, expiration séparées ; le compte à rebours sur le fil. | un bonus se nomme sans son icône |
| **4** | 0.26.3 | **Les reliques : des archétypes, pas des pourcentages.** | aucune relique neuve sans condition ni contrepartie |
| **5** | 0.26.4 | **Mesures, et la dette du lot 1.** Rythme, part ramassée, blocage du générateur, part de survie, effectif, difficulté. | chiffres dans `LISEZMOI.md`, survie médiane rendue à la référence |

---

## 3 · Ce que le plan ne fait PAS

- **Il ne touche ni aux dégâts, ni aux PV, ni aux cadences de base.** Les seules
  valeurs qui bougent sont celles des bonus eux-mêmes, et le lot 5 les mesure.
- **Il n'ajoute pas de récompense.** `POWERUP_MIN/MAX` ne bougent qu'au lot 5, et
  seulement si la mesure dit que le sol reste bloqué.
- **Il ne fait pas des bonus un second système de build.** Aucun bonus ne se
  conserve, aucun ne s'empile : ils se rafraîchissent.
- **Il ne compense pas la difficulté par des récompenses.** `DIFFICULTIES` n'a
  aucun levier de bonus et n'en gagne pas.

---

## 4 · Ce que le lot 5 a corrigé du lot 1

Rendre quatre bonus **offensifs** à une rotation de sept types dont **trois**
étaient des bonus de survie fait tomber la part de survie de 43 % à 29 %. Mesuré,
c'est **−32 % de survie médiane**. Le retrait d'origine n'était donc pas une
économie de code : il concentrait les chutes sur le soin.

Le lot 5 rend les quatre types **sans rien retirer de soin** : les poids de
`heal`, `shield` et `beacon` montent d'autant, la part de survie revient à 43 %,
la survie médiane rentre dans le bruit de la référence. C'est le **mix** qui
change, pas la cadence — `POWERUP_MIN/MAX` n'a pas bougé du plan.
