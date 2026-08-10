# Ce qui reste à trancher

Le plan est exécutable une fois cette page vidée. Trois sections : ce qui demande
une **décision**, ce qui demande une **mesure**, et ce qui est déjà **prêt**.

---

## 1. Décisions de design — huit, dont trois structurantes

### D1 · Achat unique par marchand ? — **lot F** ⚠ structurante
**Ce que ça engage :** rouvre une décision verrouillée de `reliques.js`
(« achats INDÉPENDANTS… c'est un budget à répartir »).
**Ma recommandation : oui.** Le raisonnement d'origine était bon, sa prémisse ne
l'a jamais été — le budget n'a jamais été inférieur à ce qu'il y a à acheter.
**Si non :** le lot F se réduit à la baisse de revenu, `OFFER_COUNT` reste à 3,
et le catalogue peut rester à ~18 objets au lieu de 24.

### D2 · La doctrine « aucun type ne dépasse 90 % de `PLAYER_SPEED` » ? — **lot B** ⚠ structurante
**Ce que ça engage :** une contrainte permanente sur tout futur type de monstre,
vérifiée par script au même titre que `verifierBiomes()`.
**Ma recommandation : oui.** C'est ce qui garantit qu'il reste toujours quelque
chose à semer, et donc que la grande arène du lot I garde son sens.
**Si non :** il faut un autre critère explicite, sinon le runner redeviendra
imfuyable au prochain réglage de vitesse.

### D3 · Arme accessible tôt : comment, sans casser les jalons ? — **lot E-3** ⚠ structurante
**Le conflit :** `boss_5` débloque toutes les `armes` ; `sans_chute` et
`kills500` se partagent la liste **par parité d'index**. Ajouter des armes de
départ dans le même tableau décale ce partage et **reverrouille des cartes chez
les comptes existants**.
**Ma recommandation :** marquer les armes de départ d'un drapeau qui les exclut
de la liste `armes` consommée par les jalons — le champ `fallback` joue déjà ce
rôle d'exclusion ailleurs. Trois armes de départ neuves, les trois légendaires
actuelles inchangées.
**Si on refuse le coût :** garder les armes au niveau 12 et faire porter tout le
pic de puissance par la chaîne `family`/`tier` seule. C'est moins bien mais ça
marche.

### D4 · `Brume` : implémenter, retexter, ou retirer ? — **lot E-6**
Le texte promet « les bords de l'arène se ferment » ; rien ne les ferme.
- **(a)** implémenter le resserrement (cohérent avec la constriction du Ravageur,
  qui sait déjà resserrer les `bounds`) — le plus coûteux et le plus fidèle ;
- **(b)** retexter en « on ne voit plus venir » — coût : une chaîne ;
- **(c)** la retirer — il ne resterait que deux météos.

**Ma recommandation : (b) maintenant, (a) plus tard si le besoin s'en fait
sentir.** Une gêne visuelle honnête vaut mieux qu'une mécanique promise.

### D5 · Renommer « météo » en « conditions » ? — **lot E-6** · décision d'équipe
Le mot convient à bourrasque et cendres, mal à un système réservé à un mode et
qui ne fait rien de mécanique dans un cas sur trois. `WX_*` peut rester tel quel
en interne (comme `segment` que le joueur lit « Crise »).
**Non bloquant pour le code.** Mais c'est typiquement le terme que deux personnes
emploient différemment pendant six mois avant de s'en apercevoir — à trancher
maintenant justement parce que vous êtes plusieurs.

### D6 · `appel_du_vide` : on l'écrit ? — **lot E-7**
La carte qui augmente la densité pour toute la table contre des éclats.
**Ma recommandation : non au premier passage.** `Dette` est aujourd'hui la seule
carte qui engage le groupe, et c'est présenté comme une exception assumée. À
deux, ce n'est plus une exception, c'est un motif. À reprendre une fois `Dette`
remesurée sous les nouvelles courbes.

### D7 · Assouplir la cible de TTK de 0,50 à 0,60 s ? — **lot C**
**Ce que ça engage :** on modifie un critère d'acceptation qu'on s'était donné.
**Ma recommandation : oui.** Il n'a jamais été tenu ; prétendre l'atteindre du
premier coup ferait sur-corriger la rampe de PV et rendrait la fin de manche
molle. On peut le resserrer à 0,50 dans un plan ultérieur, une fois la puissance
médiane remesurée.

### D8 · Élargir la méta par le qualitatif ? — **lot G-2** ⚠ structurante
**Le constat :** la méta complète vaut **×1,45** au bout de ~135 parties, quand
une manche donne ×4 à ×5 par ses seules cartes. Elle pèse un dixième d'une
partie. Si l'intention est « les améliorations permanentes finissent par ouvrir
la fin », elle est sous-dimensionnée pour ce rôle.
**Ma recommandation :** élargir par le **qualitatif** et non par le pourcentage —
une ligne `sursis` (relèvement automatique au palier 5), deux entrées `CONFORT` de
plus (bannissement, seconde relance), et un **tronc commun** partagé entre les
classes. Monter les pourcentages rendrait le compte complet trivial sans rien
changer au compte neuf.
**Si non :** il faut assumer que l'habileté, et non le compte, décide de
l'issue — ce qui est un choix défendable mais contraire à l'intention exprimée.

### D9 · La matrice de cohérence est-elle la bonne ? — **PROFILS.md** ⚠ structurante
Elle fixe qui termine quoi : P0 termine `calme` en jouant bien, P1 termine
`normal`, P2 termine `cauchemar`. **C'est l'hypothèse dont dépend tout le reste
du plan** — chaque critère d'acceptation y renvoie.
**À valider explicitement**, parce qu'une fois posée, les sept lots s'y calent.

### D10 · Le cloisonnement de l'arbre par classe — **lot G-2**
41 400 noyaux par classe, ~400 parties pour les trois. Dans un jeu coopératif où
l'on change de rôle selon la table, c'est une taxe sur la polyvalence.
**Ma recommandation :** deux ou trois lignes communes achetées une fois pour
toutes les classes, en gardant les lignes spécifiques cloisonnées. C'est la
distinction boutique globale / traits par personnage de Halls of Torment.
**Non bloquant** pour les lots A-F.

### D12 · Indexer les PV de boss sur la minute ? — **lot H-1**
**Le constat :** `BOSS_GROWTH = 0,06` par boss donne ×1,30 sur la manche, quand
la puissance joueur fait ×2,6. **Le sixième boss est deux fois plus facile que le
premier**, et la horde, elle, rampe bien sur la minute — les deux moitiés du
contenu ne suivent pas le même axe.
**Ma recommandation : oui**, `BOSS_HP_MINUTE_RAMP = 0,055`, avec `BOSS_HP_BASE`
recalibrée d'autant. C'est le défaut exact que le lot D corrige pour l'XP, et le
même remède : un axe extérieur plutôt qu'un compteur dépendant du parcours.
**Alternative plus tiède :** monter `BOSS_GROWTH` à 0,20 — bon rapport, mais le
compteur reste un axe discret qu'une équipe qui rate un boss décale.

### D13 · Périmètre d'écriture : tout d'un coup, ou par vagues ? — **lots E et F**
19 cartes et 14 reliques, c'est beaucoup à équilibrer simultanément.
**Ma recommandation :** trois vagues.
1. **E-1** (conditionnement) + **E-2** (retrait de `scoreMul`) — aucune carte
   neuve, correction pure ;
2. les axes **coop** (6 cartes) et **boss** (3) — les deux plus gros trous ;
3. le reste (environnement, entrave, événements, récolte, esquive) + les reliques.

Mesurer entre chaque vague. Vingt cartes neuves d'un coup rendent impossible
d'attribuer un déséquilibre à sa cause.

---

## 2. Mesures bloquantes — à faire, pas à décider

### M1 · Le plafond réel de la grille spatiale — bloque **A**
`MAX_ENEMIES_HARD_CAP: 900` est une valeur d'intention. Elle se constate au
profileur, sur la machine de référence, à plafond plein. C'est la seule valeur du
plan qu'on règle en regardant un profileur et non une partie.

### M2 · `BOSS_POWER_REF` remesuré — bloque **C**
Bot invulnérable, manche complète, `_playerPower()` relevé à la mort de chaque
boss, médiane sur 6 manches par effectif. La valeur actuelle (2,36) date d'un
modèle à ~13 cartes ; le lot X en distribue 26.

### M3 · `LEVEL_XP_BASE` rebalayé — bloque **D**
Ne peut se faire qu'après C : le TTK pilote le débit de kills, donc le débit
d'XP. Le balayage devient possible **parce que** D rend la courbe déterministe.

### M4 · La distribution de niveaux post-D — bloque **G-1**
G-1 ne se tranche pas, il se constate. Rejouer le calcul de `coresForRun` avec la
distribution réelle.

### M5 · Le net du plan sur P0 — bloque la clôture du plan
Les lots A à D se compensent : A ajoute des ennemis, B et C en retirent la
vitesse et les PV. **Le net sur un compte neuf n'est écrit nulle part.**

> **P0 en normal ne doit pas reculer.** S'il atteignait le segment 3 avant le plan
> et le segment 2 après, le plan a échoué même si tous les critères individuels
> des lots A, B et C sont verts.

C'est le seul critère qui porte sur l'**ensemble** plutôt que sur un lot, et il
protège du piège le plus banal d'un chantier d'équilibrage : sept lots corrects
dont la somme est mauvaise.

---

## 3. Déjà tranché — résolu depuis la version précédente du plan

| question | réponse | conséquence |
|---|---|---|
| `PLAYER_HIT_CD` par joueur ou par couple ? | **par joueur** (`p.hitCd`) | la foule ne multiplie pas les dégâts → dans le lot B, **la vitesse est le levier principal**, la baisse de dégâts n'est qu'un réglage de confort |
| Ajouter une légendaire casse-t-il les affectations de boss ? | **non si append-only** | règle d'insertion écrite en E-1 ; `Phalange` va en fin de `CARDS` |
| `Bourse` vs `Sourcier` (doublon éclats) | `Sourcier` **retirée** | 19 cartes et non 20 |
| `Œil du cyclone` et `Cœur de tempête` | **retirées** — météo cauchemar-only | remplacées par `Terrain conquis` et `Terre brûlée`, adossées aux hasards |
| `hordeMinutes()` disponible pour la courbe d'XP ? | **oui**, déjà utilisée par `_spawnEnemy` | lot D sans dépendance cachée |
| La horde continue-t-elle pendant un combat de boss ? | **non**, elle est suspendue, et le terrain est balayé à l'arrivée | les renforts sont **toute** la pression du combat → `BOSS_ADD_CAP` est un réglage de densité, pas un détail |
| Les renforts de boss sont-ils touchés par le lot B ? | **oui** — ce sont des runners | les combats deviennent plus lisibles sans toucher `bosses.js` ; à mesurer avant de conclure sur H-2 |
| La vitesse des boss viole-t-elle la doctrine du lot B ? | **non** — `BOSS_SPEED = 44`, soit 17 % de `PLAYER_SPEED` | rien à faire |
| La difficulté compense-t-elle la progression de compte ? | **non, par construction** — `_playerPower` lit `powerMods` (cartes + classe), la méta est appliquée en aval | la méta est de la puissance **pure et non taxée** : l'architecture soutient déjà l'intention, seule la magnitude est à revoir |

---

## 4. Non bloquant — à trancher plus tard, volontairement

- **Qualité de l'offre du marchand par segment** (lot F). Correctif possible si
  « sauter les deux premiers marchands » s'avère dominant. Posé d'avance, il
  masquerait le vrai problème.
- **Les dégâts de contact appliquent ceux du premier ennemi rencontré dans la
  boucle**, pas du plus dangereux (lot B). Défaut de lisibilité, pas
  d'équilibrage — hors périmètre, à traiter séparément.
- **Genou du plafonnement additif sur `damageMul`** (lot E-4). À mesurer ; n'a de
  conséquence que si l'on décide ensuite de vider le pool de communes plus tôt.

---

## 5. Exécutable dès maintenant, sans aucune décision

Trois chantiers ne dépendent d'aucun arbitrage et corrigent des défauts avérés :

1. **E-1, filtre `requires`** — `Surcharge orbitale` tombe aujourd'hui chez des
   joueurs sans lame orbitale. C'est un défaut existant, indépendamment de toute
   carte neuve.
2. **E-1, garde-fou de pool** — le compteur qui journalise quand une rareté
   descend sous 6 cartes éligibles. Pure prévention, aucun effet de jeu.
3. **F, renommage `REROLL_WAVE` → `REROLL_LEVEL`** — la fonction reçoit déjà le
   niveau ; seuls le nom et le commentaire mentent.

Et deux vérifications à lancer en parallèle, puisqu'elles conditionnent la suite :
le **profilage de la grille spatiale** (M1) et la **remesure de
`BOSS_POWER_REF`** (M2).
