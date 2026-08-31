# 03 · La lame orbitale mérite-t-elle son palier ? (brief §8)

Plan 26 a posé la question et s'est arrêté là : *« ce que l'audit ne peut pas
trancher sans mesure en jeu »*. Un protocole `?banc` était proposé. **Il n'a
jamais été exécuté.** Ce chantier est une mesure, pas une livraison.

## 1 · L'objet mesuré

| | |
|---|---|
| `orbiteurs` | **épique**, max 3, `+2` lames par exemplaire — jusqu'à **6** |
| `surcharge_orbitale` | rare, max 2, `requires: ["orbiteurs"]`, `+60 %` par exemplaire |

Constantes (`CARD_CFG`) : rayon **74 px** (3,7 m), vitesse **2,2**, dégâts
**25**, temps de recharge par cible **0,5 s**.

Dégâts effectifs (`shared/game_state.js:3325`) :

```js
const dmg = CARD_CFG.ORBIT_DAMAGE * this._summonMul(p) * p.mods.orbiterDamageMul;
```

`_summonMul` est le point de passage unique de **toute** source qui n'est pas le
tir — la lame orbitale y est donc déjà correctement branchée, et son échelle
suit la puissance de la build.

## 2 · Ce que la question veut vraiment dire

Le plafond théorique d'une lame est `25 / 0,5 = 50` dégâts/s **par cible en
contact permanent**. Il n'est jamais atteint : la lame ne blesse qu'à 74 px du
joueur, donc son rendement dépend entièrement de la **densité d'ennemis dans une
couronne étroite**.

C'est pourquoi la question ne se répond pas au calcul. Deux régimes s'opposent :

- **en horde dense**, six lames balaient en permanence — rendement élevé ;
- **contre un boss**, une cible unique qui tient ses distances — rendement
  proche de zéro, et une épique qui ne fait rien contre un boss est une épique
  ratée.

## 3 · Le protocole — headless, pas `?banc`

Plan 26 proposait le banc. **Le banc est le mauvais outil** : il mesure des
images par seconde, et la question ici est en dégâts. La logique est pure et
sans DOM ; on l'importe.

```js
import { GameState, CFG } from "file:///<absolu>/shared/game_state.js";
```

Mesure : 600 s de jeu simulé (≈ 1 s de CPU), un joueur bot immobile puis mobile,
**trois profils de build** à puissance totale égale :

| profil | cartes |
|---|---|
| témoin | une épique offensive quelconque, sans lame |
| lames seules | `orbiteurs` ×3 |
| lames soutenues | `orbiteurs` ×3 + `surcharge_orbitale` ×2 |

**Deux scènes**, parce que le verdict en dépend :

1. **horde** — densité normale, pas de boss ;
2. **boss** — segment de boss, horde réduite.

**Ce qu'on compte** : dégâts totaux attribués aux lames, via `_damage()`, qui
est le point de passage unique de tout ce qui blesse un ennemi ou le boss. Pas
de compteur nouveau à poser dans la simulation — l'instrumentation vit dans le
script jetable.

**Le piège à éviter** : une cible synthétique immobile donne des chiffres
absurdes. C'est déjà arrivé sur ce dépôt (un banc de DPS a rendu `+789 %` et a
été jeté). La mesure doit tourner sur une vraie `GameState` avec sa vraie
horde, sinon elle ne vaut rien et il faut le dire plutôt que de la publier.

## 4 · Le verdict possible, et ce qu'il autorise

| résultat | conclusion |
|---|---|
| lames ≈ témoin sur les **deux** scènes | le palier épique est justifié, **on ne touche à rien** |
| lames ≫ témoin en horde, ≈ 0 sur boss | c'est une carte de **niche**, pas une faiblesse — la corriger serait la banaliser. Reste à décider si sa description le dit |
| lames < témoin sur les deux scènes | sous-dimensionnée : relever `ORBIT_DAMAGE` ou `ORBIT_HIT_CD`, **pas** la rareté (l'index de `CARDS` circule, mais `rarity` non — c'est le pool tirable qui bougerait, et `verifierCatalogue()` contrôle le plancher `communes >= epiques × 1,5`) |

**Aucun de ces trois résultats n'ajoute de carte.** Ce chantier peut très
légitimement se conclure par « rien à faire », et c'est un résultat.

## 5 · Lot

| lot | contenu |
|---|---|
| **a** | **livré v0.30.6.** Verdict PARTIEL, et la limite est écrite : les deux bots sont des extrêmes (l un laisse 29,7 % des ennemis au corps, l autre 96,4 % au loin), donc le banc **ne peut pas** trancher le palier de la carte — il faut une partie réelle. Ce qui est tranché ne dépend pas du bot : `orbitHits` étant indexé par ennemi, le 3ᵉ exemplaire ne rendait rien même dans le cas favorable. `max` 3 → 2. Relevé dans `LISEZMOI.md` |
