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

## 3 · Le vérificateur — ce qu'il couvrait déjà, ce qui manquait

**Correction d'une erreur de ce plan.** La première rédaction affirmait qu'aucun
`verifierReliques()` n'existait. C'est faux : il existe, mais il est exporté par
`shared/game_state.js` et non par `shared/reliques.js` — d'où la conclusion
hâtive, tirée des seuls exports du module de données. C'est exactement le défaut
de méthode que le README de ce plan reproche à plan 26, commis dans le plan
lui-même.

### 3.1 · Ce qu'il faisait déjà, et bien

Il couvre le sens **champ → lecteur**, et par la bonne méthode : il relit la
**source** des méthodes de `GameState.prototype` et exige que chaque champ
d'effet y apparaisse comme littéral. Pas de seconde liste à tenir — l'idiome de
`sonsManques()`. Il vérifie aussi les identifiants en double, la plage de
palier, la description, `requiresArme` ↔ `ARME_EXIGENCE`, les reliques à
`mode` (cherchées par identifiant), l'absence d'effet, et **un malus sans
contrepartie écrite**.

### 3.2 · Ce qui manquait : le sens inverse

La boucle ne parcourait que les **reliques**. Trois angles morts, chacun prouvé
par mutation :

| angle mort | mutation | avant |
|---|---|---|
| un **lecteur** réclame un champ que plus aucune relique ne porte | `_relicFlag(p, "blindageFlat")` ajouté | **vert** |
| `requiresSystem` mal orthographié — comparé **en dur** à deux endroits, donc n'exclut plus rien | `"hasards_actifs"` → `"hasard_actif"` | **vert** |
| une entrée d'`ARME_EXIGENCE` que plus personne ne demande | `requiresArme: "souffle"` retiré | **vert** |

Le premier est le plus dangereux : il survient quand on écrit un système avant
sa relique, ou qu'on renomme un champ d'un seul côté. Le lecteur reçoit zéro et
rien ne le dit.

Un cas voisin était **déjà** couvert sans qu'on l'ait prévu : mal orthographier
la clef au *seul* point d'appel retire le littéral de la source, donc orpheline
les reliques qui portent le champ — le contrôle avant rougit. C'est seulement
quand la clef n'a jamais eu de relique que rien ne parle.

**Livré en v0.30.1.** Les trois croisements se mesurent sur la source, comme le
premier ; aucune seconde liste n'a été créée.

## 4 · Lots proposés

| lot | contenu | fichiers |
|---|---|---|
| **a** | **étendre** `verifierReliques()` (il existe, dans `game_state.js`) : les trois croisements inverses, rouges prouvés par mutation — **livré v0.30.1** | `shared/game_state.js` |
| **b** | nouveaux axes de contrepartie dans `RELIC_MALUS`/`RELIC_MALUS_NEG` + 2-3 reliques les employant (dont Condensateur fracturé) — **livré v0.30.2** (`RELIC_MALUS_POS` : le sens positif n avait pas de case, `harvestSpeed` et `shieldFlat` rejetés par la mesure) | `shared/game_state.js`, `shared/reliques.js`, `shared/lang/en.js` |
| **c** | ~~conditionner les dix bonus plats~~ — **la prémisse était fausse**. Six des dix portent déjà une condition réelle, non déclarée ; le vrai défaut est que **quatre reliques rendent exactement zéro** selon la partie. `requiresMod` + `minPlayers` les déclarent, et le filtre d offre devient un seul endroit — **livré v0.30.3** | `shared/game_state.js`, `shared/reliques.js` |

Le lot **c** est le seul qui touche à l'existant, et il n'y touche que par
**ajout de condition** — jamais par suppression, jamais par réordonnancement.
