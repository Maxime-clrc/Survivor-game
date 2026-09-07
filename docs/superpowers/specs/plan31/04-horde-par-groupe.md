# 04 · La horde suit les groupes, et elle ne s'entretient pas au loin

## Ce que la mesure dit

`sim/separation.mjs`. Deux joueurs invulnérables **maintenus** à écart fixe,
manche réelle depuis t = 0, relevé minutes 10-15 hors boss, corps à moins de
700 px de chacun. Trois graines.

| écart | graine | près de A | près de B | rapport | total en jeu |
|---|---|---:|---:|---:|---:|
| 400 px | 3517 | 65,7 | 65,0 | **1,0** | 69 |
| 400 px | 10007 | 45,0 | 45,1 | **1,0** | 55 |
| 3600 px | 7919 | 14,1 | 63,2 | **4,5** | 106 |
| 3600 px | 3517 | 54,5 | 117,2 | **2,2** | 196 |
| 3600 px | 10007 | 136,8 | 36,1 | **3,8** | 200 |

Deux résultats, et le second n'était pas attendu.

**Ensemble, la horde est parfaitement partagée.** 65,7 contre 65,0 ; 45,0 contre
45,1. Ce n'est pas une moyenne qui se rejoint, c'est la même horde vue deux fois.

**Séparés, l'un est noyé et l'autre au chômage**, dans un rapport de 2,2 à 4,5 —
et **le sens du déséquilibre change avec la graine** : A gagne sur 10007, B sur
7919 et 3517. Ce n'est pas un biais de position, c'est un tirage.

**Et la population double ou triple** (55-69 → 106-200) sans que le contact
augmente. Les corps en trop sont **en transit** à travers la boîte. On paie leur
simulation, leur séparation, leur snapshot ; ils ne menacent personne.

## La cause, dans le code

`_spawnBox()` construit **une seule** boîte englobante de tous les joueurs
vivants, élargie d'une demi-vue plus `TL_CFG.SPAWN_MARGIN`.

`_edgePoint(side)` fait naître sur **un** des quatre bords de cette boîte, et le
côté vient de `this.beatSide` / `this.packSide` — c'est-à-dire du **battement du
script**, tiré à `_startBeat()`, sans aucune connaissance de la position des
joueurs. Sur une boîte de 3 600 px de large, le bord tiré est adjacent à l'un et à
3 600 px de l'autre.

**Le défaut est mesuré sur l'arène ACTUELLE**, à un écart que trois écrans
permettent. Sur la map cible il est quatre fois plus atteignable.

## Distinguer deux choses qui n'ont rien à voir

Ce lot corrige **la loterie**, il ne supprime pas **le coût de l'isolement**.

- La loterie est un défaut : rien à l'écran ne dit de quel côté la vague va
  tomber, donc rien ne s'anticipe. Ça se corrige.
- Le coût de l'isolement est du design : un joueur isolé **doit** être en
  difficulté et **doit** devoir appeler ou revenir. C'est la boucle que le ping
  sert à porter, et sans elle le ping n'a pas de raison d'exister.

## Ce que l'isolement coûte, chiffré

Avec un partage au prorata pur, ce que reçoit un joueur parti seul, comparé à un
vrai solo :

| équipe | budget total (`n^0,75`) | part de l'isolé | un vrai solo | rapport |
|---|---:|---:|---:|---:|
| 2 | 1,68 | 0,84 | 1,00 | **0,84** |
| 3 | 2,28 | 0,76 | 1,00 | **0,76** |
| 4 | 2,83 | 0,71 | 1,00 | **0,71** |

**Le prorata pur rend l'isolement plus doux qu'une partie solo.** Le danger réel
n'est pas dans le nombre d'ennemis : il est dans ce qu'on perd en partant — le
lien du Soigneur et sa rupture, les auras de classe, les cartes coopératives
(`allyDamageStep`, `oathDamage`, `phalanxStep`, `downedRally`), le tir concentré,
et `REVIVE_RADIUS = 96` qui rend un relevé impossible sans traverser la map.

## Les cinq règles

**1 · Grouper.** Deux joueurs à moins d'une vue l'un de l'autre forment un
groupe ; au-delà, deux groupes. Passe en O(n²) sur quatre joueurs au plus,
refaite **à chaque battement**, pas à chaque tick — sinon le groupe clignote quand
on est à la limite.

**2 · Répartir le budget, avec un poids.**

```
poids d un groupe = (effectif du groupe) ^ e
part du groupe    = poids / somme des poids   ×   budget total
```

**`e = 0,5`.** Un joueur parti seul d'une équipe de quatre reçoit alors **1,04**,
soit la pression d'un vrai solo, sans aucune des compensations du solo.

**Le budget total ne bouge jamais, quel que soit `e`** — c'est ce qui rend ce
bouton sûr : il déplace la pression entre groupes, il n'en crée pas. Contrepartie
assumée : le groupe resté ensemble est légèrement soulagé.

`crowd^0,75` reste calculé sur l'effectif **total**. C'est le poids qui distribue,
pas le calcul du budget.

**3 · Une boîte par groupe.** `_spawnBox()` rend une boîte pour un groupe donné, et
`beatSide` s'applique **dans** cette boîte. La géométrie du battement garde tout
son sens : elle dit d'où ça vient, elle n'a jamais eu à dire pour qui.

**4 · Le plafond se répartit, il ne se divise pas.** `_enemyCap()` reste global —
sinon se séparer multiplierait la horde. Mais chaque groupe reçoit une **part**,
proportionnelle à son effectif, avec un peu de jeu. Sans ça, le groupe le plus
fourni consomme tout le plafond et l'autre joue dans le vide.

**5 · Le recyclage lointain.** C'est la règle neuve, et la mesure la rend
nécessaire.

> Un corps qui se retrouve à plus d'une certaine distance de **tout** joueur est
> retiré silencieusement, et sa place est rendue au plafond.

Trois conditions, avec le même soin que pour le retrait du mini-boss :

- **il ne passe pas par `_killEnemy()`** — ni XP, ni comptage en kill, ni haut
  fait, ni butin. `_killEnemy` est le point de passage unique de toute mort
  d'ennemi et il ne doit pas voir passer un recyclage ;
- **il ne s'applique ni aux élites, ni au mini-boss, ni à un porteur
  d'objectif** — un contrat « tuez trois élites » ne doit pas se vider tout seul ;
- **la distance est franchement plus grande que la boîte d'apparition**, sinon un
  corps naît et meurt aussitôt et la horde clignote.

C'est le pendant exact du champ fenêtré du lot 03 : là on cesse de **calculer**
loin, ici on cesse d'**entretenir** loin.

## La règle qui n'est pas dans ce lot mais qui en dépend

> **Le Director ne vient pas au secours d'un groupe qui s'est isolé.**

Sans elle, tout ce lot est annulé : le joueur isolé aurait une tension élevée, le
Director la lirait comme une surcharge et **adoucirait** la composition. La
distinction est de nature morale plutôt que technique — une équipe en difficulté
est un accident, un joueur qui s'isole est une décision.

Elle appartient au plan du Director. **Elle est notée ici pour qu'elle ne se
perde pas**, et le lot doit laisser l'information disponible : la composition des
groupes doit être lisible depuis l'état, pas recalculée ailleurs.

*Cas limite* : un joueur seul parce que les trois autres sont morts n'a rien
choisi. Le test est probablement « effectif vivant de l'équipe », pas « effectif
du groupe ».

## Critère d'acceptation

Rejouer `sim/separation.mjs`, trois graines, écarts 400 et 3600 px :

1. **rapport A/B ≤ 1,4** à 3 600 px sur les trois graines (il est de 2,2 à 4,5) ;
2. **total en jeu à 3 600 px dans ±25 % du total à 400 px** (il double aujourd'hui) ;
3. **à 3 600 px, la part reçue par l'isolé vaut 1,04 ± 0,05** fois celle d'un vrai
   solo — c'est le test du poids `e` ;
4. `verifierPopulation(45, [1, 2, 4], 16)` reste vert : le budget global n'a pas
   bougé ;
5. `verifierScript()` reste vert : les sommes par segment n'ont pas bougé ;
6. **à 400 px, rien ne change du tout.** Si `parSegment` bouge pour une équipe
   soudée, la calibration a été déplacée au lieu que la géométrie soit corrigée.

Les points 4, 5 et 6 sont les critères de non-régression, et ils comptent autant
que les trois premiers.

## Nature de la tâche

Logique de simulation, invariants croisés avec le script et le plafond de
population. **Fil principal.** Six points touchés — `_spawnBox`, `_edgePoint`,
`_spawnGeom`, `_ringPoint`, `_spawner`, `_renforts` — c'est au-dessus du seuil de
délégation, et `_spawnEnemy` est un point de passage unique.
