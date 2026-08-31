# 02 · La chaîne de la surchauffe (brief §9)

Le brief demande une chaîne de quatre cartes :
**Chambre thermique → Refroidissement brutal → Pression critique → Fusion.**

La première est livrée (`surchauffe`, v0.29.22). **Les trois autres ne sont pas
à écrire — elles existent déjà.**

## 1 · Ce que le relevé montre

Le système de chaleur porte quatre mods : `chaleurSeuil`, `chaleurChute`,
`chaleurDegats`, `surchauffeNova`. Et il possède **déjà une échelle complète de
quatre paliers** — la famille `arme_laser` :

| palier | carte | rareté | mod |
|---|---|---|---|
| 0 | **Dissipateur** (`laser_seuil`) | commune | `chaleurSeuil` |
| 1 | **Circuit froid** (`laser_froid`) | rare | `chaleurChute` |
| 2 | **Focale ardente** (`laser_chaud`) | épique | `chaleurDegats` |
| 3 | **Purge thermique** (`laser_nova`) | légendaire | `surchauffeNova` |

La correspondance avec le brief est terme à terme :

| brief | carte existante |
|---|---|
| Refroidissement brutal | Circuit froid |
| Pression critique | Focale ardente |
| Fusion | Purge thermique |

**Écrire les trois cartes du brief produirait quatre quasi-doublons d'une
échelle déjà en place.** C'est exactement ce que l'audit de plan 26 avait pour
mission d'éviter.

## 2 · Le vrai problème

`shared/cards.js:2031` :

```js
if (c.family && FAMILLES_D_ARME.has(c.family) && c.family !== mienne) return false;
```

Une carte de famille d'arme ne tombe que si on **porte** cette arme. Or
`shared/game_state.js:1622` :

```js
const porteChaleur = arme.chaleur || p.mods.tirManuel > 0;
```

**La chaleur est un système ; les cartes de chaleur sont un contenu d'arme.**
Conséquence directe : un joueur qui prend Chambre thermique sur Tir standard a
une jauge de chaleur, un bonus de dégâts, un mutisme à saturation — et **aucune
carte ne peut jamais l'améliorer**. La carte-graine ne germe pas.

C'est la définition même d'une cul-de-sac de build, et c'est le sujet du §9.

## 3 · La décision à prendre — avant toute ligne de contenu

Trois options, à trancher par l'auteur.

### A · Les cartes de chaleur suivent le SYSTÈME, pas l'arme

Remplacer le verrou d'arme, pour ces quatre cartes seulement, par un verrou de
système : elles tombent si le joueur **a de la chaleur**, laser ou `tirManuel`.

- *pour* : zéro carte nouvelle, la chaîne du brief existe d'un coup, et les
  descriptions (« canon laser : … ») deviennent le seul travail réel.
- *contre* : touche la logique de tirage, donc **change ce qu'un joueur laser
  voit aujourd'hui** — il faut vérifier que son pool ne bouge pas.
- *coût* : faible. C'est une condition, pas une table.

### B · Une seconde échelle, parallèle, pour le tir manuel

Quatre cartes `family: "surchauffe"` avec leurs propres paliers.

- *pour* : n'effleure pas le laser.
- *contre* : quatre cartes de plus pour des effets déjà écrits ; le plancher
  `communes >= epiques × 1,5` de `verifierCatalogue()` devra suivre ; et
  `FAMILLES_D_ARME` n'est pas la bonne clef puisque `surchauffe` n'est pas une
  arme.
- *coût* : élevé, pour un catalogue plus gros et pas plus riche.

### C · Chambre thermique devient une carte de la famille laser

Abandonner le tir manuel sur les autres armes.

- *pour* : cohérence immédiate.
- *contre* : annule le §9 du brief, qui veut précisément la gâchette sur une
  arme automatique.
- *coût* : nul, mais c'est un renoncement.

**Recommandation : A.** C'est la seule qui traite la cause. B ajoute du volume
là où le brief demande de la profondeur — et le brief §7 reproche justement au
catalogue son volume.

## 4 · Si A est retenue, les points de passage à vérifier

1. **Le pool laser ne doit pas bouger.** Compter les cartes offertes à une build
   laser avant et après : le nombre doit être identique.
2. **Les descriptions.** Les quatre disent « canon laser : … ». Elles doivent
   dire ce que fait la chaleur, pas quelle arme la porte — et le français reste
   écrit à côté de la donnée, l'anglais est une surcharge par clef
   (`shared/lang/en.js`).
3. **`verifierCatalogue()` §famille.** Le contrôle « le palier 3 porte une clef
   du palier 0 » reste vrai (`laser_nova` pose `chaleurSeuil`, comme
   `laser_seuil`). À reconfirmer après modification.
4. **`noOverheat`.** `chaine_assaut` retire la surchauffe ; Chambre thermique
   s'efface devant lui via `applyAfter`. Si les cartes de chaleur deviennent
   tirables hors laser, **vérifier qu'une build `noOverheat` ne peut pas se les
   voir proposer** — elles seraient sans effet, donc mortes en main.

Le point **4** est celui qui produira un défaut silencieux si on l'oublie.

## 5 · Lots proposés

| lot | contenu |
|---|---|
| **a** | ~~mesure du pool laser~~ — la mesure a trouvé un défaut **en amont** et s y est arrêtée : `chaine_assaut` annonçait retirer la surchauffe sans jamais la retirer (drapeau jamais lu par `_armeTick`), et la garde de la Chambre thermique reposait sur cette promesse — les deux cartes ensemble annulaient l épique. Texte aligné sur le code, `noOverheat` → `lowRateFloor`, garde retirée — **livré v0.30.4**. La décision A/B/C reste à prendre |
| **b** | si A : le verrou de système, les quatre descriptions, la garde `noOverheat`, l'anglais |
