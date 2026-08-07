# Lot W — Boss final

Dépend des lots R, S et U. **À implémenter en dernier avant la campagne de mesure** : il
réutilise des patterns des cinq boss existants et doit être calibré une fois la pression
(R), le bestiaire (S) et les événements (U) stabilisés — le faire avant obligerait à le
recalibrer à chaque lot suivant.

Reprend `plan4` lot N. Ce document ne redit pas ce qui y est déjà écrit ; il note **ce que la
refonte change**.

---

## W1. Ce que la refonte simplifie

`plan4/07` demandait que le boss final apparaisse *« après qu'un cycle complet du roster a été
effectué »*, et devait le prouver par arithmétique : les boss occupent les vagues multiples de
5, le roster compte cinq boss, donc le cycle se termine vague 25 et le final tombe vague 30.

**Le segment 6 est cet instant, par construction.** La constante
`FINAL_BOSS_AFTER_FULL_ROSTER` disparaît, la garantie reste, et il n'y a plus de calcul à
maintenir.

De même, le critère *« aucune vague spéciale ne peut coïncider avec le boss final »* était
garanti par un modulo (`% 5 === 3` contre `% 5 === 0`). Il se lit désormais dans la table de
beats du lot P : le segment 6 se termine par un crescendo, puis le boss. Aucun événement n'y
est possible (lot U §U4).

---

## W2. Le roster et le cas solo

Cinq boss intermédiaires, cinq entrées de roster, tirés sans répétition : **le deck se
distribue exactement**. C'est la deuxième source de rejouabilité du plan (120 permutations) et
elle est gratuite — `_pickBoss` fait déjà le tirage sans répétition.

**Mais `minPlayers: 2` sur l'Oracle et les Jumeaux.** En solo le pool tombe à trois pour cinq
places.

| option | conséquence |
|---|---|
| répéter deux boss en solo | le solo voit deux fois le même combat sur six : c'est visible et pauvre |
| deux boss solo dédiés | deux combats de plus à écrire, à dessiner et à mesurer |
| **adapter l'Oracle et les Jumeaux au solo** | `adaptMech` existe déjà et fait précisément ça |

**Recommandé : l'adaptation.** Le mécanisme est écrit, testé, documenté et déjà utilisé par
onze mécaniques. Le coût est de retirer `minPlayers: 2` du roster et de vérifier que chaque
mécanique des deux combats a un repli solo — ce qui est **déjà vrai pour la plupart**
(`MECH_STACK` → `MECH_DODGE`, `MECH_COUNT` → `MECH_TOWER`, `MECH_JAIL` → `MECH_CLUSTER`,
`MECH_QUADRANT` → `MECH_DODGE`).

Réserve honnête, déjà écrite dans le dépôt : *« un Oracle solo, c'est le boss de la cohésion
sans équipe »*, et le combat perdra de son sens. **À mesurer avant de trancher** : si l'écart
lit / ignore tombe **sous 40 %** en solo sur ces deux combats, revenir aux boss solo dédiés.

Deux mécaniques restent à traiter :

- **`MECH_SPREAD`** (dispersion) a `fallback: -1` : elle n'a aucun sens seul. Elle sort
  simplement du répertoire de l'Oracle solo.
- **`MECH_LINK`** et **`MECH_CONVERGE`** des Jumeaux ont le même problème. Les Jumeaux solo
  gardent leur verbe — deux entités, une réserve de vie — mais perdent le lien : le combat
  devient « frappe celui qui n'est pas soigné », ce qui reste une question de séparation.

---

## W3. Ce que D2 change pour le boss final

Sous D2 (lot R), le boss final est calibré sur `BOSS_POWER_REF` comme les autres. Deux
conséquences chiffrées, à partir de `plan4/N5` (`FINAL_BOSS_BARS: 8`,
`FINAL_BOSS_HP_MUL: 2.2`) :

| build | puissance | durée attendue |
|---|---|---|
| défensive et malchanceuse | 1,26 | ~290 s |
| médiane | 2,36 | **~155 s** |
| optimisée | 5,71 | ~64 s |

### Plancher de barre à 10 s

Huit barres × 10 s = **80 s de combat minimum**, ce qui correspond au statut du combat et
garantit que les huit couches de répertoire passent à l'écran. C'est la raison d'être du
plancher (lot R §R4) et elle est ici plus forte qu'ailleurs : le boss final est *« la synthèse
des cinq »*, et une build optimisée qui traverse ses huit barres en soixante secondes n'en
verrait que la moitié.

### L'enrage doit être décalé

`BOSS_ENRAGE_AT: 150` est calibré pour un boss normal, dont la médiane est à 70 s. Le boss
final a une médiane à ~155 s : à 150 s, **la moitié des combats médians enrageraient**, ce qui
transformerait un garde-fou en mécanique de phase.

```js
FINAL_ENRAGE_AT: 300,      // secondes, contre 150 pour un boss normal
```

Le rapport est le même (environ deux fois la durée médiane), et c'est le rapport qu'il faut
conserver, pas la valeur. **À remesurer** une fois `FINAL_BOSS_HP_MUL` calé.

---

## W4. Structure du combat

Reprise de `plan4/N3`, `N4` et `N5` sans changement. Rappel de la répartition proposée sur
les huit barres :

| barres | contenu |
|---|---|
| 1 à 5 | un pattern repris par boss d'origine, **légèrement intensifié** (fréquence ou rayon) |
| 6 et 7 | phase de **synthèse** — deux patterns combinés (exemple de `plan4/N4` : exaflares du Métronome traversant une zone de regroupement de l'Oracle) |
| 8 | **sceau final** — mécanique inédite à haute exigence de coordination |

`bossPool(kind, phase)` fonctionne tel quel : `base` porte le répertoire d'entrée, `unlock[i]`
ce que la barre i+1 ajoute. Il faut seulement **huit entrées d'`unlock`** au lieu de quatre.

### Le sceau final et l'effectif

`plan4/N4` proposait *« la totalité des joueurs vivants doit occuper simultanément des zones
distinctes réparties aux quatre coins »*, avec la note *« impossible à résoudre en solo, donc
à adapter en nombre de zones requises selon l'effectif »*.

`towerCount(alive)` fait déjà exactement ce calcul — 1 zone à un joueur, 2 à deux, autant que
de vivants au-delà — et son commentaire dit pourquoi : *« à un joueur une seule tour, sinon la
mécanique est une taxe ; à partir de trois, répartir l'équipe devient une décision et pas une
formalité »*. **Réutiliser cette fonction**, ne pas en écrire une seconde.

Le sceau ajoute une entrée dans `MECHS`, **en fin de table**, niveau `ALERT_ORDER`, avec
`minPlayers: 1` et pas de repli : une mécanique de dernière barre qu'on ne pourrait pas poser
laisserait le combat sans fin.

---

## W5. Le boss final n'est pas dans l'atlas

Comme les cinq autres : *« il est unique à l'écran, son coût est négligeable, et il gagne à
être animé en continu au tracé »*.

Il doit donc respecter les deux règles de tracé de boss, et elles ne sont pas facultatives.

### La posture est une timeline en trois temps

`bossCue` / `bossPose` : anticipation (`gather` en **carré**, jamais en linéaire), maintien
jusqu'à l'impact, relâche (`burst` à 1 **à l'instant du coup**, palier `BOSS_HOLD`, puis
dépassement négatif).

Deux corollaires à ne pas oublier :

- **`bossPose` est sans effet de bord.** Le boss final a huit barres et des phases de synthèse
  qui peuvent dessiner deux fois par image ; une posture qui se consommerait à la lecture
  désynchroniserait les deux moitiés — c'est le bug déjà documenté pour les Jumeaux.
- **`bossSheet()` neutralise `bossCue`** le temps du tracé : le test de silhouette est un
  critère d'acceptation, il ne peut pas dépendre de l'instant où on l'a pris.

### Il doit avoir son propre verbe

*« Chaque boss rend le coup dans son propre verbe, jamais par le seul écrasement commun. »*
Les cinq existants ont chacun le leur : les pointes du Ravageur jaillissent, les poches de la
Matriarche se **vident**, les anneaux du Métronome reçoivent un à-coup proportionnel à leur
vitesse, les glyphes de l'Oracle s'éteignent pendant que son œil se dilate, l'oscillation des
Jumeaux **enfle**.

Le boss final réutilisant leurs patterns, la tentation est de réutiliser leurs verbes. C'est
l'erreur : il en aurait cinq, donc aucun. Proposition — **l'absorption** : au moment du coup,
sa masse se **contracte vers son centre** au lieu de se détendre, et ce qu'il envoie semble
arraché à lui-même. C'est le seul verbe cohérent avec « il est la synthèse des cinq » et il est
distinct des cinq autres, y compris de la Matriarche qui se vide vers l'extérieur.

---

## W6. Identité visuelle de la barre

Reprise de `plan4/N6` : largeur nettement supérieure, segmentation visible des huit barres,
pulsation lente qui accélère à mesure que les PV baissent, nom affiché avec un traitement
distinct à l'entrée.

Trois contraintes du dépôt s'appliquent :

- la barre est du **DOM** (`hud.js`), couche écran — comme celle des boss normaux ;
- **l'échelle typographique est fixe** : 11 / 13 / 15 / 19 / 26 / 34 / 46. Le nom du boss final
  peut prendre 34 ou 46 px là où un boss normal prend 26, mais **aucune valeur ad hoc** ;
- **les angles sont durs** (rayon 2 px maximum) et *« le seul cercle du jeu est une entité
  vivante »*. Une barre finale arrondie lui volerait ce signe.

La pulsation vit en **CSS**, pas dans la boucle de jeu : *« une barre avec `transition` et un
voile en `opacity` sont trois lignes de CSS contre trente au canvas — et c'est le compositeur
qui travaille »*. Et le HUD **n'écrit dans le DOM que si la valeur a changé** (table `memo`) :
une pulsation pilotée par `requestAnimationFrame` reprendrait exactement le coût qu'on est
venu chercher en sortant du canvas.

---

## W7. Classement au temps — correction de `plan4/N8`

`plan4/N8` enregistrait *« le temps nécessaire pour atteindre et vaincre le boss final »*.

**Sous D1, le temps pour l'atteindre est constant** : 1800 s de horde plus la durée des cinq
combats précédents. Le record perdrait l'essentiel de son sens — deux équipes très différentes
afficheraient des temps voisins, dominés par une constante.

Ce qui est enregistré :

```json
"bestFinalRun": {
  "kill": 155,           // secondes de combat du boss final SEUL
  "total": 2280,         // secondes de manche, pour information
  "level": 25,           // niveau atteint
  "difficulty": 2,
  "variant": "B",        // variante de script (lot X)
  "biome": "fonderie",
  "players": 3,
  "date": "..."
}
```

**Les quatre derniers champs sont obligatoires.** Un temps n'est comparable qu'à variante,
biome, difficulté et effectif égaux — c'est exactement la préoccupation de `plan4/L3`
(*« deux parties identiques en tout point peuvent avoir des temps différents »*), et le lot X
en fait un critère d'acceptation.

Le temps de combat est celui du `GameState` de la salle (`state.time`, autoritaire), le
serveur étant multi-salons. Le classement compare des comptes, toutes salles confondues.

---

## W8. Récompense de victoire

Reprise de `plan4/N7` : écran de fin dédié, distinct du bilan de fin de manche standard.

Une décision à prendre que `plan4` laissait ouverte (*« une relique garantie au tirage suivant
— à définir selon ce qui existe côté persistance »*) : les reliques sont dans `plan4` lot K,
qui n'est pas dans ce plan. **La récompense passe donc par ce qui existe** :

- un **jalon de progression** dédié (`MILESTONES`, en fin de table) : « vaincre le boss
  final », qui déverrouille des cartes ;
- un **bonus de noyaux** significatif, sur le modèle de `CORE_FIRST_BOSS: 300`.

C'est cohérent avec la règle du dépôt : *« les cartes se déverrouillent par JALONS, pas par
monnaie — deux systèmes qui puiseraient dans la même bourse feraient acheter la puissance
d'abord et ne montrer les nouvelles cartes jamais »*.

---

## W9. Fichiers touchés

| fichier | ce qui change |
|---|---|
| `shared/bosses.js` | entrée du boss final **en fin** de `BOSS_ROSTER` (index 5) ; huit entrées d'`unlock` ; `FINAL_BOSS_BARS`, `FINAL_BOSS_HP_MUL`, `FINAL_ENRAGE_AT` dans `BOSS_CFG` ; mécaniques exclusives **en fin** de `MECHS` ; `minPlayers: 2` retiré de l'Oracle et des Jumeaux |
| `shared/game_state.js` | `_pickBoss` exclut le final du tirage des cinq ; le final sort au segment 6 ; `BOSS_BARS` devient une propriété du roster et non une constante globale ; `_atk` dispatche les patterns repris et les exclusifs ; réutilisation de `towerCount` pour le sceau |
| `shared/progression.js` | jalon « vaincre le boss final » **en fin** de `MILESTONES` ; bonus de noyaux ; `bestFinalRun` dans `newProfile` |
| `progress_store.js` | `PROG_CFG.VERSION` **+1** si `bestFinalRun` est ajouté après le lot Q ; sinon groupé avec la migration du lot Q |
| `public/client.js` | `drawBossFinal()` (une routine par boss, la règle est déjà celle-là) ; `bossPose` avec le verbe d'absorption ; annonce d'entrée distincte ; écran de victoire |
| `public/hud.js` | barre du boss final : largeur, huit segments, pulsation CSS |
| `shared/palette.js` | entrée `BOSS_SKIN` pour le final |
| `public/index.html`, `public/css/ui.css` | écran de victoire |
| `LISEZMOI.md` | section boss final ; la table des durées de combat à remesurer avec six entrées |

### Registres à compléter

| registre | ajout |
|---|---|
| `BOSS_ROSTER` | le final, en fin — l'index circule dans `bo[9]` |
| `MECHS` | sceau final et mécaniques de synthèse, en fin — l'index circule dans le canal d'alerte et dans `mk` |
| `ATTACK_LABEL` (client) | libellés des nouvelles clés d'attaque — **ne circule pas** |
| `BOSS_SKIN` (palette) | teinte du final |
| `phaseUnlockText()` (client) | huit paliers au lieu de quatre |

---

## W10. Mesures

| mesure | cible |
|---|---|
| durée du combat, build médiane, compte neuf | **~155 s**, jamais sous **80 s** (plancher de barre) |
| durée du combat, build médiane, compte maximal | écart avec le compte neuf **< 1,5 segment** équivalent (règle du dépôt) |
| répertoire effectivement joué | **100 %** des huit couches sortent au moins une fois |
| part des combats atteignant l'enrage, build médiane | **< 5 %** |
| taux de victoire au premier essai, compte maximal | **volontairement bas** — c'est un combat de fin de contenu |
| écart lit / ignore les annonces | **> 40 %**, comme les cinq autres |
| taux d'échec du sceau final au premier contact | **< 60 %** (règle du dépôt), à 3 et 4 joueurs |
| écart lit / ignore, **Oracle et Jumeaux en solo** | **> 40 %** ; en dessous, revenir aux boss solo dédiés (W2) |
| CPU / 600 s, six combats enchaînés, 4 joueurs | **< 3 s** (plafond du dépôt) |
| bande passante par joueur, boss final | **< 160 Ko/s** |
| marqueurs moyens, boss final | à relever ; référence 0,0 à 2,5 pour les cinq autres |

---

## W11. Critères d'acceptation

- Le boss final apparaît **au segment 6**, et les cinq intermédiaires ont été vus une fois
  chacun — vérifié sur deux cycles complets, aux quatre effectifs.
- L'Oracle et les Jumeaux **sortent en solo** avec leurs mécaniques repliées, ou bien la
  décision W2 est renversée et documentée.
- Aucune barre du boss final ne se rompt moins de **10 s** après la précédente ; les dégâts en
  excès ne sont pas perdus.
- Le combat dure **au moins 80 s** quelle que soit la build.
- **Au moins deux mécaniques n'existent nulle part ailleurs** dans le jeu.
- Le sceau final utilise **`towerCount(alive)`** et non un second calcul d'effectif.
- Sa barre de vie est identifiable **sans lire le nom**, et respecte l'échelle typographique
  fixe et le rayon de bordure de 2 px.
- La pulsation de la barre vit en **CSS** ; le HUD n'écrit dans le DOM que si la valeur a
  changé.
- Le boss final a **son propre verbe** de relâche, distinct des cinq autres.
- `bossPose` reste **sans effet de bord** : deux appels dans la même image donnent la même
  posture.
- `bossSheet()` neutralise `bossCue` : la silhouette du final passe `?planche`.
- Le temps enregistré est celui du **combat final seul**, accompagné de la variante, du biome,
  de la difficulté et de l'effectif.
- `BOSS_ROSTER` et `MECHS` n'ont reçu d'ajouts **qu'en fin de table**.
