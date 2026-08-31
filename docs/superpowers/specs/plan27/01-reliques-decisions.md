# 01 · Les reliques comme décisions (brief §11)

Plan 26 a reporté ce chantier en toutes lettres : *« L'audit complet élément par
élément n'a pas été fait ligne à ligne dans cette phase »*
(`plan26/05-audit-cartes-reliques.md` §4). **Il est fait ici.**

## 1 · L'audit, relevé le 2026-08-31

35 reliques, quatre paliers : **15 / 10 / 8 / 2**.

### 1.1 · Aucun doublon fonctionnel

Une relique n'est **pas** une fonction `apply` comme une carte : c'est une
**table déclarative**. `RELICS` porte 32 champs d'effet (`flatDamage`,
`rateFlat`, `slipImmune`, `speedFixed`, `mode`…) lus par accesseur à clef
chaîne — `_relicSum(p, "flatDamage")`, `_relicFlag(p, "speedFixed")`,
`relicFlat(id, …)`.

Un premier passage automatique a signalé six paires « identiques ». **C'est
faux** : les quatre reliques concernées partagent le champ `mode`, dont les
valeurs sont distinctes — `filtre`, `battery`, `swarm`, `memoire`. Quatre
mécaniques différentes derrière un champ d'aiguillage. Aucun doublon réel dans
le catalogue.

### 1.2 · Le vrai défaut est ailleurs : la contrepartie n'a qu'un seul levier

| forme | nombre |
|---|---|
| bonus **sec** — ni contrepartie ni condition | **17** / 35 |
| conditionnel (`requiresArme`, `requiresSystem`, `minPlayers`) | 9 |
| avec contrepartie | 9 |

Et sur ces 9 contreparties, **6 sont la même** :

| relique | palier | contrepartie |
|---|---|---|
| `noyau_instable` | 1 | −10 PV bruts |
| `givre_de_poche` | 1 | −15 PV bruts |
| `coque_stratifiee` | 1 | −20 PV bruts |
| `verre_taille` | 2 | −20 PV bruts |
| `culasse_froide` | 2 | −20 PV bruts |
| `culasse_legere` | 2 | −25 PV bruts |

Il n'existe donc que **trois** contreparties distinctes dans tout le catalogue :
pas de soin reçu (`serment_de_fer`), vitesse figée (`coeur_machine`), recharge
d'esquive allongée (`pas_de_cote`).

**Le brief §11 dit « tes reliques sont déjà plus intéressantes que de simples
+5 % ». La mesure ne le confirme pas.** Le palier 0 est quinze reliques dont
dix sont un unique bonus plat, et « avoir une contrepartie » veut dire « payer
des PV » cinq fois sur six.

## 2 · Ce qui est donc à faire — et ce qui ne l'est pas

**Ne pas faire :** supprimer ou remplacer des reliques. `RELICS` est ordonné et
son index circule ; une suppression reverrouille des acquis chez les comptes
existants. C'est le piège nommé dans `CLAUDE.md`.

**À faire :** deux choses, dans cet ordre.

### 2.1 · Diversifier le levier de contrepartie (le cœur du chantier)

Cible : que « payer des PV » cesse d'être la seule monnaie. Les axes déjà
disponibles dans le moteur, donc gratuits en plomberie :

| axe | champ existant | déjà utilisé par |
|---|---|---|
| soin reçu | `noHeal` | `serment_de_fer` (t3) |
| vitesse | `speedFixed` | `coeur_machine` (t3) |
| esquive | `dashCdFlat` négatif | `pas_de_cote` (t0) |
| bouclier | `shieldFlat` négatif | personne |
| chargeur | `chargeurPlus` négatif | personne |
| récolte | `harvestSpeed` négatif | personne |

Les trois derniers n'ont **jamais** servi de malus. Une relique qui échange de
la puissance contre du chargeur ou de la récolte est une décision d'un genre
que le catalogue ne propose pas encore.

**Contrainte :** `RELIC_MALUS` et `RELIC_MALUS_NEG`
(`shared/game_state.js:10152-10153`) décrivent aujourd'hui quels champs comptent
comme malus — `noHeal`, `speedFixed`, et les négatifs de `flatHp`/`flatDamage`.
**Tout nouvel axe de contrepartie doit y être ajouté**, sinon l'affichage
présentera un malus comme un bonus. C'est le point de passage à vérifier avant
d'écrire la première ligne.

### 2.2 · Les trois reliques du brief §11, jugées contre le catalogue réel

Le brief propose trois exemples. Verdict après audit :

| proposition du brief | verdict |
|---|---|
| **Cœur instable** — gros dégâts, PV qui décroissent | **redondant.** C'est `noyau_instable` et `coeur_machine` réunis, et c'est la sixième relique à −PV. À écarter tant que §2.1 n'est pas fait. |
| **Condensateur fracturé** — puissance en échange de rechargement | **retenu.** `chargeurPlus` négatif est un axe vierge, et il crée une vraie tension avec `barillet_long` (t0, +2 munitions) : deux reliques qui se contredisent, donc un choix. |
| **Noyau parasite** — vole aux alliés | **à trancher.** `equipe` et `allyFlatHp`/`allyFlatDamage` existent, donc c'est faisable ; mais une relique qui pénalise un allié en LAN est un problème social, pas d'équilibrage. Décision de l'auteur, pas du plan. |

## 3 · Le vérificateur manquant

**Il n'existe aucun `verifierReliques()`** — `shared/reliques.js` exporte
`ARME_EXIGENCE`, `RELICS`, `RELIC_CFG`, `RELIC_RARITY` et six accesseurs, pas un
seul contrôle.

C'est un manque de la même famille que celui que `verifierFeedback` couvre pour
les sons : **l'accès est à clef chaîne**, donc `_relicSum(p, "flatDamge")` rend
zéro et ne lève rien. Un champ posé sur une relique et jamais lu est muet, et
c'est le premier piège listé par `CLAUDE.md`.

`verifierReliques()` doit croiser, **dans les deux sens** :

1. **champ d'effet ↔ lecture réelle.** Chaque champ de `RELICS` hors métadonnées
   doit apparaître dans les sources qui consomment les reliques ; et
   réciproquement, chaque clef littérale passée à `_relicSum` / `_relicFlag` /
   `relicFlat` doit exister sur au moins une relique.
2. **`requiresArme` ↔ `ARME_EXIGENCE`.** Déjà nommé point de passage unique dans
   `CLAUDE.md` : lu par `_offerRelics()` **et** `visePalier()`, et un seul des
   deux fait viser un palier que le tirage ne peut pas montrer.
3. **contrepartie ↔ `RELIC_MALUS` / `RELIC_MALUS_NEG`.** Une relique portant
   `contrepartie` dont aucun champ n'est reconnu comme malus affiche un
   avantage net faux.

**État au 2026-08-31, à reconfirmer avant d'écrire :** 32 champs d'effet,
**aucun mort** ; `requiresArme` et `ARME_EXIGENCE` se recouvrent exactement
(`crit chaleur charge chargeur rampe souffle`). Le vérificateur est donc
préventif, pas curatif — et il doit être **prouvé rouge par mutation** avant
d'être noté vert.

## 4 · Lots proposés

| lot | contenu | fichiers |
|---|---|---|
| **a** | `verifierReliques()`, les trois croisements, rouge prouvé par mutation | `shared/reliques.js` |
| **b** | nouveaux axes de contrepartie dans `RELIC_MALUS`/`RELIC_MALUS_NEG` + 2-3 reliques les employant (dont Condensateur fracturé) | `shared/game_state.js`, `shared/reliques.js`, `shared/lang/en.js` |
| **c** | relecture du palier 0 : donner une condition à une partie des dix bonus plats, **sans** en retirer aucun | `shared/reliques.js`, `shared/lang/en.js` |

Le lot **c** est le seul qui touche à l'existant, et il n'y touche que par
**ajout de condition** — jamais par suppression, jamais par réordonnancement.
