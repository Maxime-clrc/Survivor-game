# SURVIVOR LAN — DÉCISIONS ARRÊTÉES

**3 septembre 2026 — version 7** — issu du brainstorming d'évolution et de cinq
tours de R&D sur le dépôt **0.33.1**.

*Changé en v7 :* les trois points de relecture sont **arbitrés** — second indice
de survie pour le Director, mesure de tension livrée avec l'outillage, péremption
écrite dans le plan 30 (section XXI). **Le document est complet ; la suite est
l'écriture des plans.**

*Changé en v6 :* trois points relevés en relecture, dont un défaut de conception
qui rendrait le loot défensif systématiquement supérieur (section XXI).

*Changé en v5 :* **plus aucun point bloquant** · le mode custom passe aux
conditions à rangs façon Hades, avec un indice de sévérité et un partage
(XVIII) · les sept sons reçoivent une palette (XXI).

*Changé en v4 :* le Director est **adopté** (section XV) · le **mode custom**
reçoit enfin sa section (XVIII) et il devient l'instrument d'équilibrage, pas un
bonus · la horde en multijoueur est corrigée sur votre objection : l'isolement
**doit** coûter, et le Director ne vient pas au secours de qui s'isole
(XVI bis).

*Changé en v3 :* tous les points bloquants et importants de la liste courte sont
**arbitrés** · le Director reçoit une proposition de mesure de tension
(section XV) · la horde en multijoueur sur grande map reçoit sa section (XVI bis)
· la taille de map est fixée · les variantes sont ramenées à 4 et purgées de tout
ce qui ressemble à un couloir.

*Changé en v2 :* le classement est **inopérant** et la cause est trouvée
(section III bis) · la courbe de niveau est corrigée sur votre relevé en jeu
(15-20 min) · le ping se règle sur **un seul** indicateur (section X) · le mot
« genou » disparaît, c'était mon jargon (section IV) · les contrats sont tranchés
(section XIV) · le Director reçoit sa liste de décisions (section XV) · la
performance de la grande map est traitée avec recherche (section XVI) · les
variantes de biome reçoivent un modèle de génération (section VII).

Ce document ne contient que ce qui est **décidé**. Ce qui reste ouvert est
regroupé en fin de document et clairement marqué. Les propositions non validées
n'y figurent pas — elles restent dans les documents de R&D.

Convention : **DÉCIDÉ** = arrêté. **PROPOSÉ** = ma recommandation, en attente de
votre arbitrage. **MESURÉ** = chiffre relevé sur le code, pas une estimation.

---

# I · CE QUI EST ABANDONNÉ

**Portes et zones fermées** (brainstorm §8). Techniquement gratuit — un obstacle
avec des PV, et la navigation gère déjà la destruction dynamique. Abandonné pour
raison de design : une porte qui s'ouvre après un contrat n'ajoute pas de
décision, elle ajoute une attente.

**Refonte du calcul des statistiques** (brainstorm §12). La chaîne est déjà
ordonnée et porte quatre plans de mesures : cartes → échelle d'arme → classe →
conversions → méta → reliques → plafond. La rouvrir invaliderait l'équilibre des
dix armes, `BOSS_POWER_REF = 2,89` et les 36 hauts faits. **Remplacée par un
audit** (section V).

**Quêtes rares comme système distinct** (brainstorm §7). Fusionnées dans les
contrats : même objet, deux raretés près. Deux systèmes qui font la même chose,
c'est deux fois l'équilibrage et deux fois le vocabulaire à l'écran.

**Anomalies rares** (brainstorm §23). Reportées. Une anomalie sera une entrée de
plus dans la table de choix du Director, pas un système à part — donc elle n'a de
sens qu'après lui.

**POI classiques** (brainstorm §1). Déjà écarté dans le brainstorm.

---

# II · CE QUI EST PARQUÉ

**Le système d'énergie** (brainstorm §18). Trop flou à ce stade, et surtout : une
monnaie sans magasin ne vaut rien. L'énergie n'existe pas tant que les contrats
n'existent pas.

Une contrainte à retenir dès maintenant pour ne pas écrire le mécanisme deux
fois : **si l'énergie revient, elle sera une ressource d'équipe et dépensable** —
c'est le seul créneau vide de la grille (l'XP est d'équipe mais se convertit toute
seule ; les éclats se dépensent mais sont individuels ; `armeRes` est individuelle
et propre à l'arme). Donc le déclenchement d'un contrat doit être conçu comme
pouvant devenir payant.

---

# III · CE QUI EXISTE DÉJÀ — RIEN À FAIRE

Cinq points du brainstorm redemandent des choses présentes dans le dépôt.

**Les classements par effectif** (§20, §21, §22) — *la mécanique existe, mais
elle ne produit rien. Voir la section III bis : c'est un bug, pas un manque.*

**Les élites à fonction** (§13). C'est la doctrine du dépôt, verrouillée par
`ELITE_INTERDIT` : une élite ne peut surcharger ni `hpMul`, ni `speed`, ni
`score`, ni `xp`, ni `share` — elle ne peut être qu'une **variante de
comportement**. Quatre des cinq élites demandées existent : aura du colosse et du
chœur, égide du générateur, splits de la pondeuse, trait `FRENZY`. Seul le
**perturbateur** est neuf, et c'est le plus délicat — « modifier les capacités du
joueur » est le seul verbe qui punirait le joueur pour ce qu'il a construit.

**La courbe de niveau** (§29, §30). C'est le lot 01 du **plan 30, en cours**.
Mesure : niveau 30 atteint **entre la minute 15 et la minute 20** — votre relevé
en jeu, plus sévère que celui du banc (qui donnait « vers 20 »). Le banc joue
avec un pilote qui ne récolte pas et achète peu, donc il **sous-estime** la
vitesse de montée ; c'est votre chiffre qui fait foi. Sur une manche de trente
minutes, la progression cesse donc **à la moitié**, dans le pire cas.

**La graine** (§15). `new GameState(diff, biomeIndex, seed)` existe et pilote
`buildBiome()` et `weatherFor()`. Ce qui manque est le **déterminisme**, pas la
graine (section IX).

**Les flèches d'allié hors écran.** `drawAllyArrows()`
(`public/render/world.js:580`, appelée ligne 538). Triangle projeté sur le bord de
la vue à `ARROW_MARGIN = 34`, orienté par `atan2`, à la couleur du joueur
(`colorOf`), avec la distance en mètres via `fmtM` — et **il pulse quand l'allié
est à terre** (`0,45 + 0,4·sin(t/160)`). *J'avais affirmé à deux reprises que ce
système n'existait pas ; c'était faux, mes recherches étaient mal ciblées.*

**Et en cherchant mieux, un défaut : il y en a DEUX, et les deux tournent.**
À côté de la version canvas ci-dessus vit une version **DOM** — `updateMarks()`
(`hud.js:418`), `#hudMarks` / `.mark` (`hud.css:1268`) — appelée par `updateHud`
à chaque image. Elle fait le même travail avec sa propre marge (`MARK_MARGE`
contre `ARROW_MARGIN = 34`), sa propre projection, et un vocabulaire d'état plus
riche : la **forme** change avant la couleur, elle écrit « à terre » à la place de
la distance, et son commentaire porte deux décisions payées — *« un cercle laisse
les quatre coins vides et fait glisser le chevron »*, *« le chevron garde la
couleur du joueur, toujours : c'est une DIRECTION, et la charte interdit le rouge
pour ce vers quoi il faut aller »*.

Un allié hors écran reçoit donc **deux indicateurs superposés**, à deux marges
différentes. L'une des deux est très probablement le vestige d'un remplacement
dont la suppression a été oubliée — exactement le genre de code mort que
`CLAUDE.md` dit de traquer au `grep`. La version DOM paraît être la bonne : elle
est plus récente dans son vocabulaire et son commentaire décrit une conception,
pas une implémentation.

**À trancher avant de brancher le ping dessus** — sinon le ping fera clignoter
l'un des deux et pas l'autre.

---

# III bis · LE CLASSEMENT NE MARCHE PAS — LA CAUSE

Vous avez raison, et ce n'est pas un manque de fonctionnalité : **tout est
construit, mais presque rien ne s'écrit.**

La chaîne complète existe et elle est bonne. `classement()` regroupe par
difficulté × effectif, dédoublonne une manche d'équipe en une ligne (clef
`difficulté, effectif, temps, date`), `hub.js` répond au message `leaderboard`,
et `renderBoard()` affiche quatre sections par difficulté avec le joueur
surligné. Rien à écrire de ce côté.

**Le blocage est une condition, une seule**, dans `hub.js` :

```js
if (state.victory && state.finalKill > 0) {
  ...
  const bat = recordFinal(pr, { ... });
}
```

`recordFinal` n'est appelé **que si l'équipe a tué le boss final**. Toute manche
qui se termine autrement — mort, abandon, trente minutes atteintes sans le coup
de grâce — n'écrit **aucun record**. Le classement est donc vide ou quasi vide,
et il le restera tant que la victoire complète sera la seule entrée.

Et le brainstorm disait exactement ça sans connaître la cause : *« le classement
doit être réellement fonctionnel et basé sur les parties terminées »*.

## Ce qu'il faut décider

Le point n'est pas technique, il est de conception : **qu'est-ce qu'une manche
classable ?**

**DÉCIDÉ — la victoire reste la condition d'entrée, et elle vaut pour TOUS les
classements.** Pas de classement de progression : on n'entre au tableau qu'en
ayant fini. La condition `victory && finalKill > 0` ne bouge donc pas, elle
devient simplement la porte d'entrée d'une manche **enregistrée**, au lieu d'être
la porte d'entrée d'un seul chiffre.

**DÉCIDÉ — plusieurs classements sur la même manche, et ils sont par rôle.**

| classement | trié sur | ce qu'il récompense |
|---|---|---|
| **Temps** | durée de la manche | l'équipe qui finit vite |
| **Kills** | ennemis éliminés | celui qui tient la horde |
| **Dégâts** | dégâts infligés | celui qui frappe |

**DÉCIDÉ — chaque classement est coupé par effectif** (1, 2, 3, 4). C'est déjà ce
que fait `clefRecord(difficulté, joueurs)` et `classement()` ; la coupe existe,
elle s'applique simplement à trois tableaux au lieu d'un.

**Ce que ça implique côté code.** `recordFinal` écrit aujourd'hui `time`,
`level`, `total`, `variant`, `biome`, `players`, `date`. Il lui faut deux champs
de plus — kills et dégâts infligés du **joueur**, pas de l'équipe, puisque le
classement est par rôle. Les kills existent déjà (`p.kills`) ; les dégâts
infligés existent aussi (`p.damageDealt`).

**Attention à une asymétrie** : le temps est une grandeur d'**équipe** (une
manche, un temps, une ligne dédoupliquée), tandis que kills et dégâts sont des
grandeurs de **joueur**. Le regroupement actuel de `classement()` — qui fusionne
quatre records identiques en une ligne — vaut pour le temps et **ne doit pas**
s'appliquer aux deux autres, sinon quatre joueurs d'une même manche
disparaîtraient derrière un seul. Deux modes d'affichage, donc, dans la même
fonction.

**Autres classements à envisager plus tard** — soins prodigués et
`p.contrib` (dégâts évités, protégés, détournés, permis), qui sont les seules
grandeurs où un Soigneur ou un Rempart peut apparaître. Ils sont déjà calculés
et ne sortent nulle part ; c'est la suite naturelle de « par rôle », mais ils ne
sont pas décidés.

---

# IV · LE MINI-BOSS

**DÉCIDÉ — sa place.** Entre l'élite et le boss. Il se joue **sur la map
normale**, jamais dans une arène de boss : pas de rétrécissement de `bounds`, pas
de coupure du spawner, pas de barres, pas de bascule musicale. C'est un **ennemi**
(`this.enemies`), pas un `this.boss`.

**MESURÉ — la bande est large.** PV effectifs en normal, minute 15 :

| | solo | 4 joueurs |
|---|---:|---:|
| fantassin | 121 | 121 |
| élite fantassin | 363 | 363 |
| **élite colosse** (la plus grosse) | **1 634** | **1 634** |
| proie actuelle (`_spawnQuarry`) | 2 415 | 7 982 |
| **boss médian** | **6 882** | **22 750** |

Facteur 4,2 entre la plus grosse élite et le boss médian en solo. **Attention** :
les PV d'élite ne dépendent que du temps (`ELITE_HP_MUL = 3` sur une base
temporelle), ceux du boss portent `crowd^1.15`. « Entre l'élite et le boss » est
donc **deux positions différentes selon l'effectif**.

**DÉCIDÉ — apparition aléatoire, tirée de la graine.** Nombre, instants et
positions **tirés à la construction de la manche et figés**, pas au fil de l'eau.
Une manche dont on connaît d'avance la liste est rejouable et mesurable — deux
réglages comparés sur la même graine voient les mêmes mini-boss aux mêmes
endroits. **Dépend du déterminisme** (section IX).

**DÉCIDÉ — dormant.** Il n'est attiré par personne tant qu'on ne l'a pas agressé.
Trois états, trois accroches existantes :

| état | comportement | accroche |
|---|---|---|
| dormant | immobile, ne cible personne | `mul = 0` dans `_enemies()`, comme `rootUntil` |
| éveillé | tient sa zone, applique son verbe | comportement d'ennemi normal, borné |
| retrait | rentre, se soigne, se rendort | `fleeTime` du soigneur |

Réveil par les dégâts : `_damage()` est le point de passage unique de tout ce qui
blesse un ennemi. Réveil par proximité : `_nearestPlayer()` existe.

**DÉCIDÉ — il garde sa zone. Si on s'éloigne trop, il rentre ET récupère ses
points de vie.** C'est la laisse classique des MMO, et elle règle trois choses
d'un coup : elle interdit d'attirer un mini-boss dans une zone de farm confortable,
elle empêche de l'user en plusieurs passages, et elle **augmente le risque de
l'échec** — ce qui est exactement l'effet recherché. Un mini-boss n'est pas une
ressource qu'on grignote, c'est un engagement qu'on prend.

Trois points à écrire avec soin :

- **le rayon de laisse** se mesure depuis son point d'apparition, pas depuis le
  joueur le plus proche — sinon deux joueurs qui se relaient le promènent ;
- **la régénération doit être visible**, sinon le joueur ne comprend pas pourquoi
  la barre est repartie en haut. Un retour rapide mais pas instantané, avec le
  corps qui marche en sens inverse ;
- **DÉCIDÉ — le retour au sommeil réarme la fenêtre de combat, pas la fenêtre de
  présence.** On peut retenter tant qu'il est là ; on ne rallonge pas son séjour.
  L'échec coûte donc du **temps**, ce qui est la bonne monnaie : plus on tarde,
  moins il reste de fenêtre de présence, et l'occasion peut se refermer pendant
  qu'on se soigne.

**DÉCIDÉ — deux échéances distinctes.**

- **fenêtre de présence** : il est là de tel instant à tel instant. S'il est
  encore dormant à la fin, il s'en va — c'est une **occasion manquée**, et rien ne
  l'annonce.
- **fenêtre de combat** : une fois réveillé, l'équipe a N secondes. Au-delà il
  s'en va — c'est un **échec**, et il s'annonce.

**Piège à tenir** : le retrait **ne passe pas par `_killEnemy()`**, qui est le
point de passage de toute mort d'ennemi (XP, explosion du kamikaze, cumuls, hauts
faits). Un mini-boss qui s'en va ne doit ni créditer d'XP ni compter comme un
kill.

**DÉCIDÉ — scaling sur la puissance, avec limite.** La fonction existe déjà et
c'est celle du boss :

```js
export function bossPower(power) {
  if (power <= CFG.BOSS_POWER_KNEE) return power;          // 2,5
  return CFG.BOSS_POWER_KNEE + CFG.BOSS_POWER_K * (power - CFG.BOSS_POWER_KNEE);
}                                                          // K = 0,50
```

*(« genou » était mon jargon — le mot n'a rien à faire ici. En clair : la courbe
suit la puissance du joueur au début, puis **à partir d'un seuil elle ne suit
plus qu'à moitié**. `BOSS_POWER_KNEE = 2,5` est ce seuil, `BOSS_POWER_K = 0,50`
est la fraction de pente conservée au-delà.)*

Traduit en jeu : jusqu'à une build correcte, la cible grossit autant que vous ;
au-delà, une build deux fois plus forte ne rend la cible qu'une fois et demie
plus grosse. C'est exactement « un scaling, avec une limite, et si on a un gros
build c'est normal de moins galérer ».

**La proie actuelle n'utilise pas ce terme du tout** — elle ne suit pas la
puissance et fond en fin de manche. Le mini-boss l'utilisera avec **son propre
seuil et sa propre fraction de pente**, tous deux plus bas que ceux du boss. La
puissance médiane réelle en fin de manche est **mesurée à 2,7 – 3,2**, donc un
seuil à 2,5 mord sur le dernier tiers.

**DÉCIDÉ — on ne le montre pas.** Pas de flèche, pas de marqueur, pas de
minicarte. On tombe dessus. Le filtre de vue du snapshot devient le comportement
voulu : **rien à changer côté réseau.** C'est le seul objet du jeu qu'on peut
rater sans le savoir.

**DÉCIDÉ — un message vague est acceptable.** Type « une menace est apparue », via
`_alert()` / `applyAlert()`, point de passage unique de toute annonce. Trois
règles : **aucune direction ni distance**, **il ne dit pas lequel**, et niveau
`ALERT_INFO` — pas `ALERT_WARN`, canal réservé à ce qui affecte le joueur
maintenant.

**DÉCIDÉ — des designs propres.** Pas un colosse zoomé. Contrainte réelle :
`verifierSilhouettes()` refuse deux corps proches sur cinq axes (élancement,
remplissage, sommets, avance, matière), et avec treize corps la marge est déjà
mince — porte-bouclier et chœur sont la paire limite. La taille ×2,5 aide mais ne
suffit pas.

**DÉCIDÉ — de petites mécaniques propres**, dans une contrainte dure :
`ATK_CFG` réserve le **télégraphe au sol au boss** — *« le canal du télégraphe au
sol appartient au boss et ne se partage pas, sans quoi une arène à 200 corps n'a
plus de sol lisible »*. Un mini-boss dispose donc de trois canaux, tous déjà
implémentés : la **posture / windup sur le corps** (`ATK_CFG.WARN = 0,5 s`,
`VUE_MAX = 8`), le **sol persistant** (traînée, spores, zones du saboteur — pas un
préavis), et l'**aura / anneau**.

**DÉCIDÉ — élites et mini-boss peuvent être propres à un biome.** Le bestiaire,
lui, reste global (section VI).

---

# V · LE LOOT DE RUN

**DÉCIDÉ — au sol, façon Diablo.** Il tombe, il faut aller le chercher. Le
pipeline existe : `_poserBonus()` est le point de passage unique de la pose au
sol, `POWERUP_TYPES` est une table append-only, et le **précédent d'un plafond
séparé est déjà posé** (`POWERUP_MAX_GROUND = 2` d'un côté,
`FRAGMENT_MAX_GROUND = 6` de l'autre).

**DÉCIDÉ — le ramassage ignore la portée de ramassage.** Il faut vraiment passer
dessus. Aujourd'hui :

```js
const reach = (CFG.PLAYER_RADIUS + CFG.POWERUP_RADIUS + p.mods.pickupRadius)
  * p.mods.pickupRadiusMul;
```

Le loot se ramassera à `PLAYER_RADIUS + LOOT_RADIUS`, sans terme de build. Trois
conséquences assumées : le ramassage **redevient un geste** (donc une prise de
risque sous la horde) ; **une asymétrie avec les bonus** que le loot doit dire
visuellement — `bonusFamille()` (`shared/feedback.js`) est le point où ça
s'écrit ; et `pickupRadius` **perd une partie de sa valeur**, à noter pour
l'équilibrage.

**DÉCIDÉ — jamais d'XP.** Un contrat, un mini-boss, une quête et une extraction
ne versent **jamais** d'XP. `_addXp()` garde trois appelants — `_killEnemy`,
`_killBoss`, `_eventReward` — et la liste est fermée. Voir section VIII.

Point de vigilance : `TL_CFG.QUARRY_XP_WORTH = 40`. La proie vaut aujourd'hui
quarante fois un corps ordinaire en XP. Quand elle deviendra un mini-boss porteur
de récompense, cette valeur **se convertit** en éclats et en loot, elle ne s'y
ajoute pas.

**DÉCIDÉ — le loot vit beaucoup plus longtemps qu'un bonus.** Un ordre de
grandeur de minutes, pas de secondes. Deux conséquences à écrire : la durée est
un champ **par objet** et non la constante `POWERUP_LIFE`, et la **cendre**
(météo) qui raccourcit `max` ne doit pas s'appliquer au loot — sinon un loot
gagné dans une tempête disparaît plus vite qu'un autre, ce que personne ne
comprendra.

**Cinq choses qui cassent, à traiter** : `POWERUP_LIFE = 22 s` (un loot n'expire
pas en vingt-deux secondes) ; `_powerups` tire son point de chute dans **toute
l'arène** alors qu'un loot doit tomber là où l'objectif a eu lieu — `_dropPoint()`
prend déjà une position ; le plafond au sol (un loot qui n'apparaît pas parce que
le sol est plein est un loot volé) ; le **filtre de vue du snapshot** — un loot
hors écran est invisible, et un loot qu'on ne voit pas tomber est un piège, pas un
loot ; et les fragments qui **passent sous le boss** depuis la bascule WebGL,
limite connue à vérifier avant de faire tomber du loot pendant un combat.

**PROPOSÉ — instancié par joueur.** Chacun voit et ramasse son exemplaire. Ça
supprime d'un coup les quatre risques du brainstorm §11 (conflit, vol, joueur
prioritaire, arbitrage permanent), et c'est cohérent avec `cardOffers`, déjà une
`Map` par identifiant. Avec « il faut passer dessus », l'instanciation devient
encore plus nécessaire : sinon le premier à passer prend tout, et ce n'est plus un
choix, c'est une course. Un loot ramassé pourrait rester **reposable** pour un
allié — geste volontaire, hors combat, sans arbitrage.

**PROPOSÉ — la nature du loot suit la rareté** : commun = statistique plate,
rare = choix entre deux, dangereux = conversion avec contrepartie (le dépôt sait
déjà faire — `hpToDamage`, `damageToHp`, `shieldToDamage`). Ce qui fait que
prendre un risque change la **forme** de la run, pas son nombre.

---

# VI · L'AUDIT DES STATISTIQUES

**DÉCIDÉ — un audit, pas une refonte.**

**MESURÉ — l'inventaire.** `defaultMods()` porte **151 clés** :

| catégorie | clés |
|---|---:|
| **offensif universel** | **53** |
| propre à une arme | 26 |
| propre à une classe | 26 |
| **défensif** | **24** |
| **économie** | **13** |
| invocation | 9 |

Et `AXE_DE_CLEF` — ce que la table d'échelle des armes sait mettre à l'échelle —
ne compte que **sept axes**, tous offensifs : dégâts, cadence, portée, zone,
perforation, ricochet, critique.

**Conclusion de l'audit : il n'existe aucun arbitrage défensif dans le jeu.** Un
joueur qui veut se spécialiser en défense n'a pas d'axe à choisir : il empile des
PV et de la réduction. Ajouter du loot dans cet état reviendrait à ajouter encore
de l'offensif, parce que c'est là qu'il y a de la place et du vocabulaire.

**Trois manques, par ordre de valeur :**

1. **La chance / rareté.** Aucun axe unifié (`eliteDrop` et `drawQuality` sont
   ponctuels). C'est la statistique qui rend un système de butin
   **auto-renforçant** au lieu de robinetier — donc celle qui ferait le plus pour
   le loot décidé en section V.
2. **L'esquive.** Le seul axe défensif du genre absent, et de nature différente de
   `damageTakenMul` : binaire et variante contre lisse et multiplicative. Le socle
   existe (`PLAYER_HIT_CD = 0,55 s` est déjà une fenêtre d'invulnérabilité,
   `_hurt()` est le point de passage unique). **Doit avoir un plafond**, sinon
   c'est une immunité stochastique.
3. **L'armure plate** (soustractive). Anti-corrélée au multiplicateur : elle
   compte contre les petits coups et peu contre les gros. C'est ce qui crée la
   spécialisation Tank contre le contact de horde.

**Acquis à préserver, absents du genre** : le bouclier, les conversions
(`hpToDamage`…), le momentum (`elanStep`, `packStep`, `ragePerKill`) et tout l'axe
coopératif (`allyDamageStep`, `oathDamage`, `phalanxStep`, `downedRally`,
`powerupShare`), qui n'existe nulle part ailleurs parce que le genre est solo.

**DÉCIDÉ — les trois axes sont retenus.** Chance/rareté, esquive, armure plate.

**PROPOSÉ — les trois vivent dans les CARTES, et le loot les alimente.** Un axe
qui n'existerait que dans le loot serait un axe qu'on subit au lieu de le
construire : on ne peut pas décider de « jouer esquive » si l'esquive tombe au
hasard. À l'inverse, un axe qui n'existerait que dans les cartes rendrait le loot
redondant.

La répartition qui marche dans le genre : **la carte ouvre l'axe, le loot
l'amplifie.** Une carte donne les premiers points d'esquive et les cartes de la
famille qui en dépendent ; un loot d'esquite trouvé après coup vaut alors
beaucoup pour qui a pris ces cartes, et presque rien pour les autres. C'est ce
qui fait qu'un loot est une trouvaille et pas un cadeau.

**Trois pièges à écrire d'avance :**

- **l'esquive a besoin d'un plafond dès le premier jour** (le genre le fixe vers
  60 %). Sans lui, c'est une immunité stochastique, et en coop elle rend le
  Soigneur illisible ;
- **l'armure plate et `damageTakenMul` coexistent** — c'est la réponse du genre,
  mais elle double la surface d'équilibrage défensif, qui est aujourd'hui la
  moins mesurée du dépôt. Le compte rendu de vraie partie (XI) devient la
  condition pour la régler ;
- **DÉCIDÉ — la chance agit sur la RARETÉ seule, jamais sur la quantité.** C'est
  elle qui change la nature de ce qu'on trouve, donc la forme de la run. Et ça
  garde l'axe lisible à haut niveau, là où le genre devient illisible en faisant
  les deux.

**Action retenue** : écrire l'ordre de la chaîne dans `docs/regles/CONTENU.md`, et
y déclarer où le loot de run s'insère — entre la méta et les reliques.

---

# VII · LA MAP ET LES BIOMES

**DÉCIDÉ — les cinq lieux restent les thèmes.** Pas de fusion des cinq en une
seule carte. Usine, fonderie, friche, nébuleuse, secteur restent cinq thèmes
distincts, chacun avec **sa lumière, sa palette, son fond, ses blocs, ses dangers
par difficulté**.

**DÉCIDÉ — des variantes à l'intérieur de chaque thème.** Une grande map est
assemblée **aléatoirement** à partir de variantes du même thème, avec des
transitions cohérentes. Exemple : la nébuleuse tient aujourd'hui de la station
spatiale ; elle peut porter plusieurs variantes — des salles différentes, un
secteur plus ouvert sur le vide — reliées entre elles.

**Pourquoi cette décision est la bonne, et elle est presque gratuite.**
`buildBiome()` **tuile déjà l'arène par cellules d'une vue** :

```js
const cols = Math.max(1, Math.round(arenaW / viewW));
const rows = Math.max(1, Math.round(arenaH / viewH));
```

…puis répète **la même table de composition** (`OBSTACLES[key]`, `HZ_*[key]`) dans
chaque cellule, en la miroitant selon la parité `(cx + cy) & 1` et
`(cx·2 + cy) & 1`. Sur l'arène actuelle de 4800 × 2700, c'est **3 × 3 cellules,
la même composition neuf fois, miroitée**.

Les variantes se branchent exactement là : au lieu d'une table répétée, **chaque
cellule tire une variante du thème**, à la graine. Le miroir reste, les budgets de
surface restent (`OBSTACLE_SURFACE_MAX = 0,10`, `HAZARD_SURFACE_MAX = 0,08`), et
**aucun module de rendu ne change** — la palette, la tuile de sol, la lumière, le
fond, les blocs, les LED et les props appartiennent au thème, pas à la variante.

Les variantes sont donc **de la donnée pure**, et elles passent d'échelle
gratuitement : `cols` et `rows` se déduisent déjà de la taille de l'arène.

**Cette décision annule trois obstacles identifiés en R&D :**

| obstacle | pourquoi il disparaît |
|---|---|
| la **palette est pleine** — `arena` a un plancher de 6 et fonderie/friche sont à **6,1**, `emis` a un plancher de 8 et usine/friche sont à **8,4** | les variantes partagent la palette de leur thème ; `verifierCharte()` compare des thèmes, pas des variantes |
| **deux directions de lumière sur un écran**, nommé comme *« LE défaut visible d'un rendu 2D »* | un thème, une `dir` |
| le **cache de matière ne tient qu'une tuile à la fois** (éviction active, **9,8 Mo par tuile à dpr 1, ×4 à dpr 2**, échec silencieux quand `createPattern` rend `null`) | un thème, une tuile — les variantes varient le **mobilier**, pas le **sol** |

**Le seul coût réel : les transitions.** Deux cellules voisines de variantes
différentes peuvent produire une couture incohérente — un couloir qui finit dans
un mur. Le miroir actuel crée déjà des coutures et personne ne s'en plaint, mais
avec de vraies variantes ça compte. Piste : chaque variante déclare l'état de ses
quatre bords (ouvert / fermé) et le tirage ne place que des voisines compatibles.

**Contraintes à respecter côté variante :**

- elle varie **obstacles, dangers, densité et semis de props** ;
- elle ne varie **ni la tuile de sol, ni la macro-tuile, ni la palette, ni la
  direction de lumière, ni le fond** ;
- `verifierBiomes()` / `signatureBiome()` mesurent la loi d'implantation par lieu
  — ils devront mesurer par variante, ou accepter une variance déclarée.

**MESURÉ — deux corrections utiles.**

Le **biome n'est pas choisi au salon** : `room.drawBiome()` le tire au hasard à
chaque manche, avec une surcharge d'environnement (`BIOME=fonderie`) réservée aux
tests. Il n'y a donc aucun choix joueur à préserver ou à perdre.

Et **l'identité mécanique des lieux existe déjà — le mode normal la jette.**
`HZ_CAUCHEMAR` distingue franchement : l'usine a deux geysers, une braise, une
flaque et un glissant ; la fonderie deux braises ; la friche deux flaques, deux
geysers et une braise à combustion **lente** (période 19 s, portée 300, avec le
commentaire « une friche brûle lentement et longtemps »). `HZ_NORMAL` aplatit les
cinq à `SLOW` + `SLIP`. **Il n'y a rien à inventer, il y a à propager.**

**DÉCIDÉ — le bestiaire reste global.** Le biome ne possède pas de types. C'est
aussi la bonne réponse techniquement : `_pickType()` filtre sur `minMin`,
`share × cap` et `typesFor(diffIndex)` ; un roster par lieu rendrait ces trois
filtres dépendants de la position des joueurs, et la courbe de composition —
mesurée, tenue par `verifierTraits` — cesserait d'exister.

**PROPOSÉ — l'élite de biome passe par les traits, pas par des variantes.**
Treize types × cinq lieux font 65 variantes que personne ne tient. Or
`DIFFICULTIES[i].traits` est déjà une table `type → trait`, et les six traits
(`DASH`, `TRAIL`, `VOLLEY`, `FRENZY`, `SPORE`, `AURA`) sont **des bits**, donc ils
s'empilent. Un biome peut porter la même table : la fonderie ajoute `TRAIL` au
fantassin, la friche ajoute `SPORE`, la nébuleuse ajoute `DASH`. Aucun concept
neuf, et l'identité se lit dans le comportement de la **horde ordinaire**.
`ELITE_INTERDIT` continue de valoir : un biome ne surcharge jamais `hpMul`,
`speed`, `score`, `xp` ni `share`.

**Piège réseau associé** : `defDe(index, elite)` est **pure**, le client rejoue la
fiche à partir du seul bit `elite`. Si une variante dépendait de la position, un
corps changerait de nature **en marchant**. La région doit être **estampillée à
l'apparition**. Le champ est déjà arithmétique — `e.type + (e.elite ? 100 : 0)` a
toute la place pour `+ region × 1000`, sans clef ni octet supplémentaire.

## Comment on écrit une variante — le modèle retenu

*Recherche faite sur les générateurs par gabarits. Le modèle qui colle à votre
structure est celui de **Spelunky** (gabarits de salle + emplacements
aléatoirisés), pas celui de **WaveFunctionCollapse** (qui résout une grille
entière sous contrainte, coûteux et difficile à borner).*

Spelunky découpe son niveau en 16 salles, chacune tirée d'une liste de gabarits
pré-écrits ; chaque gabarit contient du terrain **fixe** et des emplacements
marqués où un obstacle est **tiré au hasard**. Votre `OBSTACLES[thème]` est déjà
un gabarit — il lui manque les deux autres idées.

**Idée 1 — plusieurs gabarits par thème.** `OBSTACLES.nebuleuse` devient
`OBSTACLES.nebuleuse[0..n]`. Chaque cellule tire le sien à la graine. Coût : une
dimension de tableau.

**Idée 2 — des emplacements variables dans le gabarit.** Une entrée peut porter
une **liste** de `kind` au lieu d'un seul, ou une probabilité de présence. Deux
cellules du même gabarit ne se ressemblent alors plus tout à fait, et le nombre
de combinaisons explose sans qu'on écrive une table de plus. C'est le `6` des
gabarits de Spelunky — la case « ici, quelque chose ».

**Idée 3 — les bords se déclarent, et c'est ce qui règle les transitions.**
Le problème des transitions est un problème de **Wang tiles** : deux cellules
voisines doivent s'accorder sur l'arête qu'elles partagent. La solution est de ne
pas laisser l'assembleur deviner — chaque variante **déclare l'état de ses quatre
bords** (ouvert, encombré, mur), et l'assembleur ne place que des variantes dont
le bord correspond à celui du voisin déjà posé.

C'est peu de code et ça donne trois choses gratuitement : les transitions sont
cohérentes par construction, un couloir peut traverser plusieurs cellules, et
`verifierBiomes()` — qui rejoue déjà la traversabilité du carré central à chaque
graine **et à chaque mode** — devient le test de non-enfermement de l'assemblage
entier.

**Le garde-fou qui manque, et il est symétrique de celui qui existe.**
`signatureBiome()` mesure aujourd'hui la loi d'implantation d'un lieu, avec la
règle : *« deux lieux avec la même implantation sont le même lieu, quelle que
soit la couleur du sol »*. Pour les variantes il faut la version **bornée des
deux côtés** :

> deux variantes d'un même thème doivent différer **assez** pour se distinguer,
> et **pas trop** pour rester dans le thème.

Un plancher et un plafond sur la même mesure, avec l'instrument qui existe déjà.
Sans ce plafond, les variantes dérivent en lieux déguisés et le thème se dissout.

## La taille, et l'échelle d'une variante

**DÉCIDÉ — une variante fait la taille d'une map actuelle**, soit
4800 × 2700. **DÉCIDÉ — quatre variantes par thème** pour commencer. La grande
map est donc un **2 × 2 de régions**, soit **9600 × 5400** — quatre fois la
surface d'aujourd'hui. On verra plus tard s'il faut agrandir.

Ça change l'échelle de l'assemblage, et **en mieux** :

- **`buildBiome()` ne bouge presque pas.** Une région = l'arène d'aujourd'hui,
  donc elle continue de paver ses **3 × 3 cellules** de vue avec sa table et ses
  quatre orientations miroir. Ce qui est neuf est au-dessus : quelle table pour
  quelle région ;
- **l'accord des bords devient un tout petit problème.** Un 2 × 2 n'a que
  **quatre arêtes internes**, contre douze si les variantes se choisissaient
  cellule par cellule. Quatre contraintes se résolvent sans solveur ;
- **les chiffres de coût sont déjà mesurés.** ×4 surface, c'est exactement le cas
  relevé en section XVI : navigation à 1 510 µs par diffusion et 30,2 ms/s par
  salle à quatre joueurs — *avant* le champ fenêtré, qui les ramène au niveau
  actuel.

## La règle qui prime sur toutes les autres : pas de couloirs

**DÉCIDÉ — ça reste un jeu de horde.** Une variante qui étrangle le passage
détruit le jeu : la horde s'accumule derrière un goulot, le joueur tire dans un
entonnoir, et le kiting — qui est le geste central — devient impossible.

Trois garde-fous, dont deux existent déjà :

- `OBSTACLE_SURFACE_MAX = 0,10` — le plafond de surface bâtie, et il est
  **invariant d'échelle** (le rapport se réduit à `Σ(o.w × o.h)`, indépendant de
  la taille) ;
- `NAV_CFG.PASSAGE_MIN` et `verifierBiomes()`, qui rejoue déjà la traversabilité
  du carré central **à chaque graine et à chaque mode** ;
- **manquant** : une mesure de **largeur minimale de passage** sur toute la
  région, pas seulement au centre. C'est elle qui refuserait un couloir avant
  qu'on le voie en jeu.

Le dépôt a déjà payé ce défaut une fois : une géométrie à conduites parallèles a
produit *« le seul abri parfait du dépôt »*, avec un contact en **119 s** au lieu
de 4,4 s. C'est la mesure de référence pour ce que « trop fermé » veut dire.

## Des idées de variantes, par thème

Le test reste celui du dépôt : une variante doit **changer le chemin**, pas la
décoration. Le commentaire de `OBSTACLES` le dit déjà — *« ce qui change est ce
qu'il y a, pas la taille de ce qu'il y a »*, parce qu'un facteur d'échelle donne
la même arène grossie, donc le même parcours.

**Purgé de la v2** : mes propositions « le compartiment », « la coursive » et
« le refroidissement » sont retirées. Elles étaient toutes les trois des couloirs,
et la règle ci-dessus les interdit. Ce qui les remplace joue sur la **répartition**
et la **taille** des masses, jamais sur l'étranglement.

Quatre variantes par thème, écrites comme des lois d'implantation.

**NÉBULEUSE** *(dériver)* — aujourd'hui : deux masses en diagonale, deux travées
aux bords, des éclats, centre vide.
- *la dérive* — la loi actuelle, conservée comme référence ;
- *le champ d'épaves* — beaucoup de petits éclats, aucune grosse masse. Rien ne
  cache, tout accroche : on se déplace sans jamais rompre la ligne de vue ;
- *les grands fragments* — trois masses énormes, très espacées. L'inverse exact :
  on tourne autour de peu de choses, et chaque contournement est long ;
- *la brèche* — le bâti se concentre sur un bord, l'autre s'ouvre sur le vide.
  Asymétrique, et c'est ce qui justifie le fond `espace` au lieu de le subir.

**USINE** *(fabriquer)* — aujourd'hui : des bandes, chaîne / allée / chaîne.
- *la chaîne* — la loi actuelle ;
- *le carrefour* — deux allées larges qui se croisent, quatre îlots de machines.
  Le seul endroit du thème où l'on peut tourner à angle droit ;
- *l'atelier* — pas de bandes, un semis dense de petits postes. Beaucoup d'angles,
  rien qui bloque ;
- *le dégagement* — presque vide, quelques masses isolées. La respiration du
  thème, et l'endroit où une horde renforcée fait le plus peur.

**FONDERIE** *(couler)* — aujourd'hui : deux masses et un passage entre elles.
- *la coulée* — la loi actuelle, avec le passage élargi pour respecter la règle ;
- *les cuves* — six masses moyennes réparties, aucun axe. On circule partout, on
  ne se cache nulle part ;
- *le refroidissement* — des masses courtes en quinconce, écart calibré **au
  double** de `PASSAGE_MIN`. C'est la géométrie qui a produit l'abri parfait :
  elle ne revient qu'avec cette contrainte explicite ;
- *le puits* — une masse centrale unique et massive, le reste dégagé. Une seule
  décision : de quel côté on tourne.

**FRICHE** *(pourrir)* — aujourd'hui : deux champs de ruines, terrain nu au
milieu, avec une gigue de 40 px propre au thème.
- *le champ* — la loi actuelle ;
- *le mur* — une longue ruine avec **plusieurs** brèches larges. La friche qui a
  gardé une structure, sans jamais devenir un couloir ;
- *le cratère* — vide au centre, dense au pourtour. L'inverse de la loi du thème,
  et c'est ce qui la rend lisible ;
- *l'effondrement* — des masses de toutes tailles, sans loi apparente. La seule
  variante dont l'implantation est délibérément irrégulière.

**SECTEUR** *(s'adresser à vous)* — aujourd'hui : rues trempées, néons,
passerelles, dangers aux bords et milieu franc.
- *la rue* — la loi actuelle ;
- *la place* — ouvert au centre, encombré au pourtour, plusieurs entrées larges ;
- *le marché* — un semis serré de petites structures, très lisible de loin grâce
  aux néons ;
- *le parvis* — presque vide, deux masses monumentales. L'endroit du thème où
  l'on voit arriver.

**Quatre par thème, et pourquoi c'est le bon nombre.** Avec les quatre
orientations miroir déjà en place, quatre variantes donnent **seize visages** pour
quatre régions. La répétition ne se voit pas, et le coût d'écriture reste celui de
douze tables neuves au total — pas de cinquante.

---

# VIII · L'XP

**DÉCIDÉ — l'XP reste une grandeur d'équipe.**

```js
_addXp(amount) {
  this.xp += amount / Math.pow(Math.max(1, this.players.size), CFG.XP_CROWD_EXP);
  ...
}
```

`this.xp`, `this.level`, `this.levelAt` : un seul compteur pour toute la salle.
Chaque joueur choisit **sa** carte, mais le niveau monte pour tout le monde en
même temps.

**Conséquence que le brainstorm ne voyait pas** : l'arbitrage « farmer ou partir
chercher un contrat » n'existe pas tel qu'il est écrit. Le fermier et
l'explorateur montent au même niveau, à la même seconde. L'explorateur ne renonce
à rien, et aucune quantité de contrats ne le fera exister tant que la récompense
de la horde est mutualisée.

**DÉCIDÉ — la sortie retenue** : les objectifs paient en **éclats** (déjà
`p.eclats`, déjà individuel, déjà dépensable) et en **loot de run** (individuel
par construction). Le niveau reste l'axe d'équipe, le loot et les éclats sont les
axes individuels.

L'arbitrage devient alors vrai et lisible : **partir, c'est échanger de la cadence
de cartes contre de la puissance immédiate.** Le fermier fait monter l'équipe,
l'explorateur fait monter sa fiche. Et le brainstorm §31 — « le niveau ne doit pas
être le seul axe » — devient littéral au lieu de décoratif.

**À écrire dans `docs/regles/SIMULATION.md`**, trois lignes : l'XP et le niveau
sont des grandeurs de **salle**, la carte / les éclats / les reliques / le loot
sont des grandeurs de **joueur** ; `_addXp()` a **trois** appelants et la liste
est fermée ; toute récompense d'objectif se verse en éclats ou en loot, jamais en
XP — parce que l'XP est le seul canal qui ne peut pas distinguer qui a pris le
risque.

---

# IX · LE DÉTERMINISME

**DÉCIDÉ — le hasard appartient à la salle, pas au processus.**

**MESURÉ** : **91** appels à `Math.random` dans la moitié simulation de
`game_state.js`, 46 dans la moitié mesure, 1 dans `cards.js`, 3 dans `room.js`.

**Le défaut est en production.** Six campagnes de mesure sèment en **écrasant la
fonction globale** :

```js
const alea = Math.random;
Math.random = grainer(r * 7919);
```

Correct pour un script à une `GameState`. Faux dès qu'il y en a deux — et
`hub.js` en tient **seize** (`ROOM_MAX = 16`) dans le même processus, avancées par
la même boucle. **Il n'existe aujourd'hui aucun moyen d'imposer une graine à une
salle sans l'imposer aux quinze autres.** Et `grainer()` est une recopie exacte de
`rng()` (`biomes.js`) : le même mulberry32, écrit deux fois.

**Ce qui change** : un générateur porté par l'état, dérivé de sa graine
(`this.alea = mulberry32(this.seed ^ 0x9E3779B9)` — le décalage évite que le
terrain et le déroulé partagent la même suite). `grainer()` supprimé, pas déplacé.
`offerCards` et `_offerRelics` reçoivent le générateur **en argument** — `cards.js`
et `reliques.js` ne doivent pas connaître `GameState` (règle d'architecture).
`room.js` garde `Math.random` : l'attribution des couleurs et le mélange des armes
sont des décisions **hors manche**.

**Le critère qui compte** : un vérificateur qui avance **deux états en
alternance**. Deux états avancés l'un après l'autre passeraient même avec un
générateur global ; alternés, ils ne passent que si chacun porte le sien. C'est la
panne de production, et c'est elle qu'on teste.

**Ce que ça ouvre** : les seeds fixes compétitives et le challenge quotidien
(brainstorm §16), et surtout les mini-boss tirés de la graine (section IV). À
dire dans le bon sens : une graine identique donne le **même contenu**, jamais le
même résultat. Les entrées des joueurs restent des entrées.

---

# X · LE PING

**DÉCIDÉ — le ping fait clignoter l'indicateur existant du joueur émetteur, avec
un son. Rien de neuf n'est dessiné.**

**DÉCIDÉ — un seul indicateur par joueur.** Le doublon relevé en section III se
règle d'abord : on garde une implémentation, on supprime l'autre. Sans ça, le
ping ferait clignoter l'une des deux couches et pas l'autre, ce qui se verrait
immédiatement.

**DÉCIDÉ — on garde la version DOM** (`updateMarks`, `#hudMarks`, `.mark`) et
supprimer la version canvas (`drawAllyArrows`). Trois raisons : elle porte le
vocabulaire d'état le plus riche (la **forme** change avant la couleur, et elle
écrit « à terre » à la place de la distance) ; son commentaire décrit une
conception et deux décisions payées, pas une implémentation ; et elle est du DOM,
donc le clignotement et le son se pilotent par une classe CSS et une transition,
sans toucher à la boucle de rendu.

Ce qu'il faut ensuite : un message `ping` portant l'identifiant de l'émetteur,
une classe `.pingue` sur le chevron correspondant pendant N secondes, et un son
via `uiSoundFor()` — point de passage unique du son d'interface.

**Aucun champ réseau supplémentaire pour les flèches elles-mêmes, sur aucune
taille de map** : dans `snapshot(vue)`, tout est filtré par la vue — ennemis,
balles, tirs, zones — **sauf les joueurs**. La liste `p` est complète, toujours.

**Pas de saturation possible** : un ping par joueur au maximum, puisque c'est *sa*
flèche qui clignote.

**Limite assumée** : le ping dit « venez vers moi », pas « allez là-bas ». Pour un
contrat dans l'autre direction il faudrait un marqueur de lieu, qui est un autre
système. Pour un LAN à quatre personnes qui se parlent, « venez vers moi » suffit
— et c'est aussi ce qui justifie de ne pas construire de minicarte.

---

# XI · L'OUTILLAGE DE MESURE

**DÉCIDÉ — `?mesure` disparaît.** La trace ne s'arme plus par l'URL. Elle devient
une **option de salle cochée avant la partie**, et elle rend un **compte rendu à
copier-coller** en fin de manche.

**Ce qui est déjà bon et ne bouge pas.** `telemetry.js` et tout `traceDebut` /
`traceEchantillon` / `traceTick` / `traceFin` produisent une vraie télémétrie : un
en-tête complet (version, difficulté, variante de script, biome, **graine**,
effectif, et pour chaque joueur sa classe, ses noyaux et sa **doctrine méta
active**) ; un échantillon à 1 Hz (segment, battement, niveau, population,
plafond, météo, état du boss, et par joueur PV / bouclier / dégâts / soins /
kills / **puissance**) ; des lignes d'événement toutes **déduites par comparaison
avec l'image précédente**, de sorte que la simulation ne sait pas qu'on l'observe.

`room.js` est déjà prêt à moitié : `armerTrace()` diffuse `traceState` à toute la
salle, l'état est porté par la salle (« deux salles peuvent être tracées
indépendamment »), `tracePar` retient qui l'a armée.

**Le vrai défaut : trois outils, trois destinations, zéro jonction.**

| | armé par | mesure | va où |
|---|---|---|---|
| trace | `?mesure` | **le serveur** | fichier sur la VPS (donc SSH) |
| relevé (`?banc` + touche R) | URL + touche | **le client** | presse-papier |
| bandeau (`?perf`) | URL | le client | l'écran, puis rien |

Rien ne relie une image qui saute à ce qui se passait dans la simulation.

**Le point rouge remplace l'argument de l'URL.** Le code justifie aujourd'hui
l'URL par *« surtout pas vivre dans un menu où on l'oublierait armée »*. La
réponse n'est pas de cacher l'option, c'est de la rendre **impossible à oublier** :
un témoin visible pendant toute la manche, avec le nom de qui l'a armée.

**Le compte rendu est une réduction de la trace, pas une seconde collecte.** Ça
garantit qu'ils ne peuvent pas diverger, et qu'on n'instrumente jamais deux fois.

**DÉCIDÉ — les données à ajouter**, par ordre de valeur :

1. **les dégâts infligés ventilés.** `p.hurtBy` ventile les dégâts **subis** par
   `DAMAGE_SOURCES` ; il n'existe **rien de symétrique** pour ce qu'on inflige. On
   ne sait pas quelle part vient de l'arme, des invocations, des zones, de la
   brûlure. C'est ce qui manque pour équilibrer une arme sur une vraie partie ;
2. **les relevés client par segment**, envoyés au serveur en fin de manche. `REL`
   (`render/world.js`) fait déjà le travail — p50, p99, max, appels de dessin,
   quads, pic de particules, trois statistiques audio, à zéro allocation par
   image. Six fenêtres au lieu d'une, et « ça a ramé au segment 5 » devient
   répondable ;
3. **`p.contrib`** — `evites`, `proteges`, `detournes`, `permis` — déjà calculé
   aux points de passage, et **absent du scoreboard comme de la trace**. Un
   Rempart qui joue parfaitement a aujourd'hui un tableau de fin vide ;
4. une ligne **`carte`** à chaque prise, comme il y a déjà une ligne `niveau` —
   sans quoi on ne peut pas corréler un saut de DPS à une carte ;
5. la section **anomalies**, qui **cherche elle-même** : images au-dessus de
   33 ms et ce qui se passait à cet instant, population au plafond trop
   longtemps, joueur à terre trop longtemps, arme muette.

Le DPS n'a rien à ajouter côté simulation : l'échantillon porte les dégâts
**cumulés**, la dérivée donne le DPS par seconde et par joueur.

**Le format** : destiné à être collé dans une conversation, donc du texte dense et
lisible, **borné** — un résumé par segment plus les événements notables, pas
1 800 échantillons. La trace JSONL complète reste sur le disque pour qui veut
creuser.

**Pourquoi c'est prioritaire, au-delà du volume à équilibrer** : aujourd'hui
**tout ce qui est mesuré l'est sur des bots**. `LISEZMOI.md` l'admet — *« le
pilote ne savait pas jouer deux des quatre armes »*, et deux hauts faits restent
non concluants *« parce que le pilote ne récolte pas et achète peu »*. Un compte
rendu de vraie partie est le seul instrument qui voie ce que le bot ne sait pas
faire — et cet angle mort **grandit à chaque système qui demande une décision
humaine** : un contrat qu'on accepte, un mini-boss qu'on choisit d'aller chercher,
un loot qu'on va ramasser.

---

# XII · QUESTIONS OUVERTES PAR SYSTÈME

**Les contrats** — désormais traités en section XIV. Ne restent ouverts que les
six points listés en fin de cette section.

**Le Game Director** — le cadre est acquis, les neuf décisions à prendre sont
listées en section XV. La version viable est **bornée**. `verifierScript()` tient une invariante — la somme de
pression par segment ne bouge pas (6,0 · 10,0 · 12,6 · 14,7 · 17,9 · 20,7) — et
quatre plans de mesures reposent dessus. Le script garde le **budget**, le
Director choisit la **forme** : composition, géométrie, élite ou pas, contrat ou
respiration. `_contexteBonus()` est le modèle d'observation à copier : il lit déjà
six grandeurs de contexte.

**La taille de la grande map** — non décidée, mais la section XVI change la
nature de la question : une fois la grille bornée et le champ de navigation
fenêtré, **la taille n'apparaît plus dans aucun coût de boucle**. Ce qui reste à
arbitrer est du temps de déplacement sans rencontre, pas du CPU. Pour mémoire,
les chiffres d'avant correctif : la diffusion de navigation coûte **8,87 ms/s** par salle à quatre
joueurs aujourd'hui, **15,35** à ×2 surface, **30,20** à ×4 ; et une seule
diffusion passe de 443 µs à **1 510 µs**, ce qui est une pointe dans un budget de
tick de 16,6 ms.

**Les nouveaux biomes** — non tranché. La décision « thèmes + variantes »
(section VII) rend la question moins urgente : des variantes coûtent beaucoup
moins qu'un thème neuf, et elles ne touchent pas la charte de couleurs, qui est
pleine.

**Le perturbateur** (la cinquième élite du brainstorm) — non conçu.

**L'identité mécanique des lieux en mode normal** — la donnée existe
(`HZ_CAUCHEMAR`), le principe est clair (la région dit **quels** dangers, la
difficulté dit **combien**), mais rien n'est arrêté.

**Trois défauts mesurés, à corriger avant d'agrandir quoi que ce soit :**

1. **`_grille()` coûte en O(cellules), pas en O(corps).** 17,4 µs à 200 corps,
   **16,6 µs à 600** sur l'arène actuelle — tripler la population ne change rien.
   Elle est reconstruite trois fois par tick à 60 Hz. Correctif : la bâtir sur la
   **boîte occupée** au lieu de l'arène.
2. **Se séparer déséquilibre la horde au lieu de la partager.** Mesuré sur trois
   graines, deux joueurs invulnérables maintenus à écart fixe, minutes 10-15 :
   **ensemble (400 px), les deux voient exactement la même horde** — 65,7 contre
   65,0 ; 45,0 contre 45,1. **Séparés (3 600 px), le rapport passe à 2,2 / 3,8 /
   4,5**, et **le sens change avec la graine**. Et la population totale double
   (55-69 → 106-200) sans que le contact augmente. Cause : `_spawnBox()` construit
   **une seule** boîte englobante, et `_edgePoint(side)` tire son bord d'après
   `beatSide` — le battement du script, qui ignore où sont les joueurs. **C'est un
   défaut actuel**, sur l'arène actuelle, dès qu'une équipe se sépare pour couvrir
   deux cristaux.
3. **`LISEZMOI.md` § Réglages est périmé** : il annonce `ARENA_W/H: 1600 x 900`
   (c'est 4800 × 2700), `BOSS_HP_BASE: 1200` (c'est 520) et une quinzaine de
   constantes `WAVE_*` / `LEVEL_KILLS_*` absentes de `CFG`. À régénérer depuis
   `CFG` avant toute mesure — sinon la première partira d'une valeur fausse.

---

# XIV · LES CONTRATS

Le système est maintenant tranché sur ses points structurants.

## Comment on en trouve un

**DÉCIDÉ — par une borne posée sur la map, avec laquelle on interagit.**
Elle apparaît aléatoirement, on la trouve en jouant, on l'active si on veut. Elle
propose un contrat qu'on **accepte ou qu'on ignore**.

**DÉCIDÉ — la borne est un objet cohérent avec le thème.** Une borne dans la
nébuleuse, un autre mobilier ailleurs. C'est le même objet fonctionnel avec cinq
apparences, comme les blocs le sont déjà (`BLOC[biome][kind]` est exactement cette
table).

**DÉCIDÉ — un marqueur « ! » ou « ? » au-dessus de la borne**, façon marqueur de
quête. C'est la bonne réponse et elle résout le problème que j'avais soulevé : les
anneaux au sol sont tous pris (`REVIVE_RADIUS` en pointillés, l'aura du colosse,
l'égide du générateur, les cercles de compétence), mais **le canal au-dessus du
corps est libre et il a déjà un précédent** — `actors.js:932` pose « trois
chevrons qui montent » au-dessus du lanceur. Le vocabulaire existe.

Le marqueur porte en plus une information gratuite : **« ! » disponible, « ? » en
cours**, comme dans un MMO. Le joueur apprend la convention en une seconde parce
qu'il la connaît déjà d'ailleurs.

La borne elle-même se remarque **de loin** parce qu'elle est émissive, et `emis`
est la couleur d'identité du thème — un objet qui l'utilise saute aux yeux sur son
propre sol.

## La touche

**DÉCIDÉ — `F`.** Et elle est libre : `input.js` occupe WASD + flèches
(déplacement), `Space` (dash), `Q`/`1`, `E`/`2`, `R`/`3` (compétences), `H` et `R`
(outils). `KeyF` n'est lié à rien.

**DÉCIDÉ — c'est la touche d'interaction générique**, pas la touche « contrat ».
Elle ouvre la porte à d'autres usages plus tard (ramasser volontairement,
activer, ouvrir). C'est la bonne décision : une touche par système est ce qui
rend un jeu impossible à apprendre.

*Note : `e.code` est indépendant de la disposition clavier, donc `KeyF` est la
même touche physique en AZERTY et en QWERTY. Rien à prévoir de ce côté.*

*Piège à traiter : `R` sert à la fois de compétence 3 et de relevé de banc
(`input.js:147`). Si on ajoute une touche, autant régler ce conflit au passage.*

## Le HUD

**DÉCIDÉ — un suivi de type MMO (FFXIV), sur le côté GAUCHE.** Un encart discret
qui porte le contrat accepté, son objectif et sa progression chiffrée, et qui
disparaît quand il n'y a rien.

Le côté gauche est libre : `#hudRun` (l'horloge et le segment) occupe le coin
haut-gauche et ne descend pas. `#hudTeam` est à droite. Il y a donc toute la
hauteur gauche sous l'horloge.

Ce que ça implique, et qui n'existe pas encore : c'est le **premier élément
persistant** du HUD de jeu. Aujourd'hui tout ce qui informe est transitoire — les
bandeaux `_alert()` s'effacent, les popups de haut fait passent. Un suivi de
contrat reste à l'écran tant que le contrat vit.

Donc trois questions de place à traiter d'un coup : où il vit sans manger la vue
(la vue fait 1600 × 900 et les coins portent déjà le panneau d'équipe, la barre de
compétences, l'état de l'arme), comment il se comporte à quatre joueurs qui ont
chacun accepté quelque chose, et s'il se réduit quand rien ne bouge.

## Combien, et de quelle taille

**DÉCIDÉ — peu, et relativement simples.** Trop de contrats les rend obligatoires,
et un contrat obligatoire n'est plus une décision — c'est une corvée. Un contrat
difficile au point d'être un combat de boss dilue le mini-boss.

Un contrat doit se lire en une phrase et se faire **sans quitter longtemps** ce
qu'on faisait : tuer N ennemis ici, tenir une zone N secondes, abattre trois
élites. Le fond du jeu reste la horde.

**DÉCIDÉ — un seul contrat actif à la fois.** Le suivi HUD reste lisible, et le
jeu ne devient pas une liste de tâches.

**DÉCIDÉ — le contrat est tiré au moment où on active la borne.** Pas fixé à la
graine. Conséquence assumée : deux manches de même graine n'auront pas les mêmes
contrats, donc **le contrat sort du domaine rejouable**. C'est acceptable — la
borne, elle, reste tirée de la graine, donc les *occasions* sont identiques même
si le contenu diffère. À noter pour le challenge à graine imposée : il compare des
parcours, pas des tirages.

**DÉCIDÉ — la borne ne disparaît pas si on l'ignore.** On peut partir et revenir.
Ça en fait un **choix différé** plutôt qu'une occasion qui s'évapore, et ça
supprime la pression de « il faut y aller maintenant » — cohérente avec un jeu
où le fond reste la horde.

*Sous-question qui en découle et qu'il faudra trancher en écrivant* : si on
refuse un contrat et qu'on revient, en retire-t-on un nouveau ou le même ? Le
nouveau tirage récompense le retour, mais il autorise à relancer jusqu'à obtenir
ce qu'on veut. Un temps de recharge sur la borne règle les deux.

**Ordre de grandeur à valider** : trois à cinq bornes par manche. À mesurer, pas
à décider — et c'est exactement ce que l'outillage (XI) doit pouvoir répondre.

## Ce que ça touche dans le code

`EVENTS` reste le socle (table déclarative, `_openEvent` / `_closeEvent` /
`_eventReward`, cycle déjà écrit, **append-only** car l'index circule dans le
snapshot). Le contrat lui ajoute trois choses : un **objectif** (un compteur et un
seuil), un **palier de risque**, une **récompense**.

La borne, elle, est un objet neuf dans le monde : elle voyage dans le snapshot,
elle est filtrée par la vue comme le reste, et elle a besoin d'un état
(disponible, proposée, acceptée, consommée).

## Ce qui reste ouvert

- **retirer un contrat sur une borne déjà refusée** : nouveau tirage ou le même ?
  Un temps de recharge sur la borne règle le cas ;
- **le contrat est-il d'équipe ou individuel ?** Il devrait être d'équipe (une
  borne, un objectif) avec des récompenses individuelles — cohérent avec la
  section VIII ;
- **est-ce qu'on peut échouer un contrat**, ou est-ce qu'il expire simplement ?
- **le contrat suit-il l'équipe si elle se sépare ?** Avec la horde par groupe
  (XVI bis), « éliminez 150 ennemis dans cette zone » n'a pas le même sens selon
  qu'on est groupés ou non.

---

# XV · LE GAME DIRECTOR — ADOPTÉ

**DÉCIDÉ.** La mesure de tension ci-dessous et la liste fermée de ce que le
Director peut choisir sont adoptées. Le cadre reste : **le script garde le
budget, le Director choisit la forme.**

## Ce que fait Left 4 Dead, et ce qu'on en garde

Le Director de Valve suit une **intensité émotionnelle par survivant**, un nombre
entre 0 et 1 qui monte quand le joueur est attaqué et quand des ennemis meurent
tout près de lui, et qui **décroît avec le temps**. Il en tire quatre états :
montée, pic soutenu, retombée, repos. Au pic, il **arrête de faire apparaître**
des ennemis ; au repos, il ne fait rien pendant trente à quarante-cinq secondes.
Mark Booth appelle ça de l'« imprévisibilité structurée » : des fonctions de
population qui ne sont ni aléatoires ni uniformes.

Trois choses à retenir, et une à rejeter.

**À garder — la tension monte sur ce qui ARRIVE au joueur, pas sur ce qu'il
est.** L4D ne regarde ni l'équipement ni le niveau : il regarde les coups reçus
et la proximité de la mort. C'est exactement ce qui interdit de punir un joueur
parce qu'il joue bien : un bon joueur ne prend pas de coups, donc sa tension est
basse, donc le Director lui donne une composition plus intéressante — pas plus
de points de vie.

**À garder — la décroissance.** Sans elle, la tension est un cumul et le
Director ne redescend jamais.

**À garder — le cycle.** Pression, pic, retombée, respiration. C'est ce que votre
brainstorm demandait au point 27, et c'est ce que L4D fait depuis 2008.

**À rejeter — couper les apparitions au pic.** L4D peut se le permettre parce que
sa pression n'a pas de budget écrit. Chez vous, `verifierScript()` tient les
sommes par segment et quatre plans de mesures reposent dessus. **Le Director ne
touche jamais au `rate`.**

## Ce que je propose

### 1 · Une tension par joueur, entre 0 et 1

Mise à jour à chaque tick, à partir de quatre grandeurs **qui existent déjà et
qui passent toutes par un point de passage unique** :

```
tension += degats_recus / maxHp        × A     ← _hurt(), point unique
tension += corps_proches / densite_ref × B × dt ← _grille(), deja bati 3× par tick
tension += a_terre ? C × dt : 0                 ← p.downed
tension -= DECAY × dt
```

puis borné à [0, 1].

Aucune instrumentation neuve. `_hurt()` est déjà le passage obligé de tout ce qui
blesse un joueur ; `_grille()` donne le voisinage pour rien puisqu'elle est déjà
construite ; `p.downed` existe. C'est **quatre flottants par joueur et par tick**.

*Pourquoi les dégâts en fraction des PV max et pas en valeur absolue* : un Rempart
et un DPS ne ressentent pas le même coup de la même façon, et c'est le ressenti
qu'on mesure.

*Pourquoi la densité proche compte* : c'est le signal qui monte **avant** qu'on
prenne des coups. Sans lui, le Director réagit toujours en retard. C'est aussi le
pendant du « tuer des infectés tout près » de L4D — être au contact est une
tension même quand on gagne.

### 2 · Deux agrégats d'équipe, pas un

C'est le point où je m'écarte de L4D, et c'est **à cause d'une mesure faite sur
votre jeu** : à 3 600 px de séparation, un joueur voit 137 corps pendant que
l'autre en voit 36 — un rapport de 3,8, dont le sens change avec la graine. Une
moyenne d'équipe effacerait exactement ça.

- **`tensionMax`** — le joueur le plus en difficulté. C'est lui qui dit « trop
  haut », parce qu'un joueur qui se noie est une tension même si les trois autres
  s'ennuient ;
- **`tensionMoy`** — la moyenne. C'est elle qui dit « trop bas », parce que
  l'ennui est un état collectif.

Deux seuils, deux réponses, jamais les deux en même temps.

### 3 · Une mémoire courte, trois compteurs

Le contexte instantané ne sait pas dire « ça fait deux minutes qu'il ne s'est rien
passé ». Trois durées suffisent, et elles sont gratuites :

- temps depuis la dernière élite ;
- temps depuis le dernier événement ou contrat ;
- temps passé sous le seuil bas de `tensionMoy`.

Le troisième est le vrai déclencheur d'ennui. Une tension basse pendant dix
secondes n'est rien ; pendant quatre-vingt-dix, c'est une manche plate.

### 4 · Ce que le Director fait de tout ça

Une fois par battement — soit toutes les 60 s, le grain où le script exprime déjà
son budget. Il choisit **la forme** de ce que le budget achète :

| état | signal | réponse, à budget CONSTANT |
|---|---|---|
| **ennui** | `tensionMoy` bas depuis longtemps | composition plus dure, une élite de plus, géométrie plus exigeante (`pince` plutôt que `bords`), un contrat proposé |
| **normal** | entre les seuils | ce que le script prévoyait |
| **surcharge** | `tensionMax` très haut | arrivée d'un seul côté, moins d'élites, composition plus simple, **et jamais moins d'ennemis** |
| **respiration** | après un pic | ce que le script prévoyait déjà — le Director ne l'invente pas |

**La quatrième ligne est une décision de conception, pas un oubli.** La
respiration reste **écrite dans le script**. Si le Director pouvait ôter de la
pression, il pourrait rendre une manche plus facile qu'écrite, et le classement au
temps (III bis) cesserait de comparer deux courses identiques.

### 5 · Il doit être déterministe

Même graine, mêmes entrées, mêmes décisions. Sinon tout ce qui est construit en
section IX ne lui sert à rien, et deux réglages comparés sur la même graine ne se
comparent plus. Il tire donc dans `this.alea`, jamais dans `Math.random`.

### 6 · Il ne se voit pas

Comme L4D. Le joueur doit sentir que la manche a un rythme, pas qu'un système
répond à ses statistiques. Concrètement : aucune annonce, aucun retour visuel, et
si un test aveugle ne distingue pas une manche avec Director d'une manche sans,
c'est que la mesure de tension est mal réglée — pas que le Director est inutile.

### 7 · Comment on le teste

Trois instruments, tous prévus ailleurs dans ce document :

- **le compte rendu de vraie partie** (XI) doit tracer `tensionMoy` et
  `tensionMax` dans l'échantillon à 1 Hz. C'est ce qui permet de **voir la courbe
  de tension** d'une manche et de la comparer à celle du brainstorm ;
- **`mesurePopulation`** vérifie que le budget n'a pas bougé — c'est le test de
  non-régression le plus important de tout le lot ;
- **`verifierScript()`** reste vert. Si les sommes par segment bougent, le
  Director a débordé de son rôle.

### 8 · Les réglages à calibrer, et il n'y en a que six

`A` (poids des dégâts), `B` (poids de la densité), `C` (poids de l'état à terre),
`DECAY`, et les deux seuils bas et haut. Six nombres, tous mesurables sur des
manches enregistrées, aucun ne touchant à l'équilibrage existant.

## Ce qui reste à décider après ça

Les huit autres points de la v2 tiennent toujours, mais ils se tranchent en
écrivant. Le seul qui demande encore un arbitrage de votre part est le **1** :
la liste fermée de ce que le Director a le droit de choisir. Ma proposition est
la colonne de droite du tableau ci-dessus — composition, géométrie, élites,
proposition de contrat — et **rien d'autre**.

---

# XVI · LA PERFORMANCE D'UNE GRANDE MAP

Vous demandez si un cache ou du culling peuvent limiter l'impact. Recherche faite,
et le résultat est encourageant : **le culling existe déjà là où il faut, et le
vrai coût n'est pas celui qu'on croit.**

## Ce qui est déjà réglé, et qu'il ne faut pas refaire

**Le réseau.** `room.js:vueDe()` calcule un rectangle par client, arrondi sur une
grille pour que deux joueurs proches partagent un même `prepareMessage`, et
`snapshot(vue)` filtre ennemis, balles, tirs et zones. **Agrandir la map
n'augmente pas le débit.**

**Le sol.** C'est un motif répété (`createPattern`) peint sur la vue. Son coût est
celui de la vue, pas celui de l'arène. Une map dix fois plus grande coûte
exactement pareil.

**Les props.** `render/props.js` boucle sur `c0x..c1x` / `c0y..c1y`, des cellules
dérivées de la caméra, et régénère à la volée. Déjà culled, déjà indépendant de la
taille de l'arène.

**Correction à ma v1** : j'avais signalé les boucles pleine arène de `decor.js`
(`grilleFranche`, `grilleRepere`) comme un coût. C'est faux. Ce sont des segments
de ligne : à `GRID_FINE = 100`, une arène de 4800 × 2700 donne 75 segments par
image ; à huit fois la surface, 212. Le canvas les écrête. **Ce n'est pas un
problème et je n'aurais pas dû l'écrire.**

**Conclusion : le client est déjà quasi insensible à la taille de la map.** Tout
le coût mesuré est **côté serveur**, et il tient en deux fonctions.

## Les deux vrais coûts, et leur solution

### `_grille()` — la grille de séparation

**MESURÉ** : 17,4 µs à 200 corps, 16,6 µs à 600 corps sur l'arène actuelle. Le
coût ne bouge pas avec la population : il est **entièrement dans les cases vides**,
parce que la grille couvre `CFG.ARENA_W × CFG.ARENA_H` alors que la horde tient
dans la boîte des joueurs.

**Solution : la borner à la boîte occupée.** Rien d'exotique — une origine et des
dimensions au lieu de partir de (0, 0). La boîte occupée fait au plus
`VIEW + 2 × SPAWN_MARGIN`, soit environ **432 cases au lieu de 3 225**, et cette
valeur **cesse de dépendre de la taille de l'arène**. C'est le seul correctif du
lot, et il retire le problème au lieu de l'atténuer.

*Piège : garder une marge d'une cellule. `_separateFromPlayers` interroge le
voisinage ; sans marge, un corps au bord cherche un indice hors tableau et la
séparation échoue en silence.*

### `diffuser()` — le champ de navigation

**MESURÉ** : 443 µs par diffusion aujourd'hui (8 160 cases), 1 510 µs à quatre
fois la surface (32 400 cases). Une diffusion **par joueur**, toutes les
`REBUILD_MIN = 0,2 s`. À quatre joueurs et quatre fois la surface : 30 ms/s par
salle, et surtout **6 ms dans un même tick** si les quatre échéances tombent
ensemble — pour un budget de 16,6 ms.

C'est le coût dominant, et c'est celui qui grandit avec la map **et** avec
l'effectif.

**La recherche.** Le domaine est bien documenté : Supreme Commander 2 (Elijah
Emerson, *Game AI Pro*, ch. 23), Planetary Annihilation, et les moteurs récents
convergent sur le même principe — **découper la carte en secteurs et ne calculer
le champ que pour les secteurs qui contiennent des agents**, avec un graphe de
portails entre secteurs pour les trajets longs. Un raffinement classique : un
secteur entièrement libre référence un champ « dégagé » **partagé** au lieu
d'allouer le sien.

**Mais votre cas est plus simple que celui d'un RTS, et c'est important.** Dans un
RTS, une unité peut être à l'autre bout de la carte de son objectif — d'où les
portails. Chez vous, **les ennemis n'existent que dans `_spawnBox()`**, c'est-à-dire
autour des joueurs. Un corps n'est jamais loin de sa cible, donc **il n'y a jamais
de trajet long à planifier**.

**PROPOSÉ — le champ fenêtré, pas hiérarchique.** On diffuse sur une fenêtre
ancrée sur le joueur, de la taille de la boîte d'apparition plus une marge. Pas de
secteurs, pas de portails, pas de graphe : le coût devient constant et
**indépendant de la taille de la map**, comme pour `_grille()`.

Un corps hors fenêtre retombe sur le comportement `NEAR` — viser en droite ligne.
C'est déjà ce que fait tout corps à moins de 96 px, et un corps à 2 000 px de sa
cible n'a pas d'obstacle à contourner qui vaille 1,5 ms.

*`nav.bloque` reste plein arène : il est bâti une fois par manche, il n'est pas
dans la boucle, et le refaire par fenêtre coûterait plus qu'il ne rend.*

**Ce qu'on ne fait pas, et pourquoi.** Relever `REBUILD_MIN` serait le levier
évident : c'est le mauvais. Sa valeur porte sa mesure — *« un joueur à 150 px/s
traverse une case en 0,27 s »* — et la relever fait suivre la horde à un champ
périmé. Le levier est la **surface diffusée**, pas la fréquence.

## Ce que ça donne

Une fois ces deux corrections faites, **la taille de l'arène n'apparaît plus dans
aucun coût de boucle** — ni client, ni serveur. Elle ne coûte plus que de la
mémoire (les tableaux d'obstacles et de dangers, quelques centaines de kilo-octets)
et du temps de génération, une fois par manche.

**C'est ce qui rend la question « quelle taille ? » une question de conception et
non de performance** — ce qui est la bonne façon de la poser.

Reste un point qui n'est pas un coût mais qui se verra : plus la map est grande,
plus le temps passé à se déplacer sans rien rencontrer augmente. C'est un problème
de **densité d'intérêt**, pas de CPU, et il se règle avec les bornes de contrat
(XIV), les mini-boss (IV) et les cristaux — pas avec du code.

---

# XVI bis · LA HORDE EN MULTIJOUEUR SUR UNE GRANDE MAP

Votre question, et c'est la plus importante qui reste : **comment on divise ou on
priorise la horde quand les joueurs sont séparés.**

## Le défaut est déjà mesuré, et il existe AUJOURD'HUI

Deux joueurs invulnérables maintenus à écart fixe, minutes 10-15, corps à moins de
700 px, trois graines :

| écart | près de A | près de B | rapport | total en jeu |
|---|---:|---:|---:|---:|
| 400 px | 65,7 / 45,0 | 65,0 / 45,1 | **1,0** | 55-69 |
| 3600 px | 14,1 / 54,5 / 136,8 | 63,2 / 117,2 / 36,1 | **2,2 à 4,5** | 106-200 |

Ensemble, les deux joueurs voient **exactement** la même horde. Séparés, l'un est
noyé et l'autre au chômage, dans un rapport qui va jusqu'à 4,5 — et **le sens du
déséquilibre change avec la graine**. Ce n'est pas un biais de position, c'est un
tirage.

**La cause, en deux lignes de code.** `_spawnBox()` construit **une seule** boîte
englobante de tous les joueurs vivants. `_edgePoint(side)` fait naître sur **un**
de ses quatre bords, et le côté vient de `this.beatSide` — c'est-à-dire du
battement du script, qui ne sait pas où sont les joueurs. Sur une boîte de
3 600 px de large, le bord tiré est collé à l'un et à 3 600 px de l'autre.

Sur une map quatre fois plus grande, le défaut est quatre fois plus atteignable.

## Quatre règles

**1 · Grouper, pas diviser.** Deux joueurs à moins d'une vue l'un de l'autre
forment un groupe ; au-delà, deux groupes. Une passe en O(n²) sur quatre joueurs
au plus, refaite à chaque battement — pas à chaque tick, sinon le groupe clignote
quand on est à la limite.

**2 · Le budget se répartit par groupe, au prorata de l'effectif du groupe.**
Le script continue de dire combien vaut le battement. Rien de la calibration ne
bouge : c'est la même somme, distribuée.

**Le point délicat** : `crowd^0,75` reste calculé sur l'effectif **total**, pas
sur celui du groupe. Un joueur qui part seul ne doit pas subir la pression d'un
solo — il doit subir **sa part** de la pression d'une équipe de quatre. Sinon se
séparer devient une façon de baisser la difficulté.

**3 · Une boîte par groupe, et `beatSide` s'applique DANS chaque boîte.** La
géométrie du battement garde tout son sens : elle dit d'où ça vient, elle n'a
jamais eu à dire pour qui.

**4 · Le plafond se répartit aussi.** `_enemyCap()` reste global — sinon se
séparer multiplierait la horde — mais il faut une **part par groupe**,
proportionnelle à l'effectif du groupe, avec un peu de jeu. Sans ça, le groupe le
plus fourni consomme tout le plafond et l'autre joue dans le vide.

## Et la règle qui n'existe pas encore, et qui devient nécessaire

**Le recyclage lointain.** C'est le vrai enseignement de la mesure ci-dessus : à
3 600 px, la population **double ou triple** (55-69 → 106-200) alors que le
contact, lui, ne double pas. Les corps en trop sont **en transit**. On paie leur
simulation, leur séparation, leur snapshot — et ils ne menacent personne.

Sur une map quatre fois plus grande, ce phénomène devient le mode de
fonctionnement normal : le plafond se remplit d'ennemis qui marchent.

> **Un corps qui se retrouve à plus d'une certaine distance de TOUT joueur est
> retiré silencieusement, et sa place est rendue au plafond.**

Trois conditions à écrire avec le même soin que pour le retrait du mini-boss :

- **il ne passe pas par `_killEnemy()`** — ni XP, ni comptage en kill, ni haut
  fait, ni butin ;
- **il ne s'applique ni aux élites, ni au mini-boss, ni à un porteur
  d'objectif.** Un contrat « tuez trois élites » ne doit pas se vider tout seul ;
- **la distance doit être franchement plus grande que la boîte d'apparition**,
  sinon un corps naît et meurt aussitôt, et la horde a l'air de clignoter.

C'est le pendant exact du champ de navigation fenêtré (XVI) : là on cesse de
**calculer** loin, ici on cesse d'**entretenir** loin. Les deux disent la même
chose — le jeu se passe autour des joueurs.

## Ce qui doit rester vrai après tout ça

Le critère de non-régression, et il compte autant que la correction :

- **rapport A/B ≤ 1,4** à 3 600 px sur les trois graines (il est de 2,2 à 4,5) ;
- **total en jeu à 3 600 px dans ±25 % du total à 400 px** (il double aujourd'hui) ;
- `verifierPopulation(45, [1, 2, 4], 16)` reste vert — le budget global n'a pas
  bougé ;
- `verifierScript()` reste vert — les sommes par segment n'ont pas bougé ;
- **et à 400 px, rien ne change du tout.** Si `parSegment` bouge pour une équipe
  soudée, c'est que la calibration a été déplacée au lieu que la géométrie soit
  corrigée.

## S'ISOLER DOIT COÛTER — et il faut séparer deux choses

Votre objection est juste et elle corrige ma position. Je confondais deux choses
qui n'ont rien à voir.

**Ce qui est un bug** : à 3 600 px, un joueur voit 137 corps et l'autre 36, **et
le sens change avec la graine**. Ce n'est pas une difficulté, c'est une loterie.
Rien à l'écran ne dit de quel côté la vague va tomber, donc rien ne s'anticipe.
Ça se corrige, sans discussion.

**Ce qui est du design** : un joueur isolé doit être en difficulté, la pression
doit tomber sur lui, et il doit devoir **appeler ou revenir**. C'est exactement
la boucle que le ping (X) sert à porter, et sans elle le ping n'a pas de raison
d'exister.

Corriger la loterie ne supprime pas le coût de l'isolement. Ce sont deux
questions distinctes, et la seconde mérite un chiffre.

## Ce que l'isolement coûte réellement, mesuré

Avec la répartition au prorata, voici ce que reçoit un joueur qui part seul,
comparé à ce que reçoit un vrai solo :

| équipe | budget total (`n^0,75`) | part du joueur isolé | un vrai solo | rapport |
|---|---:|---:|---:|---:|
| 2 | 1,68 | 0,84 | 1,00 | **0,84** |
| 3 | 2,28 | 0,76 | 1,00 | **0,76** |
| 4 | 2,83 | 0,71 | 1,00 | **0,71** |

**Le prorata pur rend l'isolement PLUS DOUX qu'une partie solo** — 0,71 contre
1,00 pour une équipe de quatre. En pure quantité de horde, partir seul est moins
dangereux que jouer seul.

Le danger réel de l'isolement n'est donc pas dans le nombre d'ennemis. Il est
dans **tout ce qu'on perd en partant** : le lien du Soigneur et sa rupture, les
auras de classe, les cartes coopératives (`allyDamageStep`, `oathDamage`,
`phalanxStep`, `downedRally`), le tir concentré, et surtout `REVIVE_RADIUS = 96`
— à terre loin de tout le monde, personne ne peut vous relever sans traverser la
map.

C'est déjà une punition entière, et elle est **émergente** : personne ne l'a
écrite, elle découle de la coopération elle-même. C'est la meilleure espèce.

## Le levier, s'il en faut plus

Si l'isolement doit peser davantage, **il n'y a qu'un seul bouton à tourner** :
le poids de chaque groupe dans le partage du budget. Formulé proprement :

```
poids d un groupe = (effectif du groupe) ^ e
part du groupe    = poids / somme des poids   ×   budget total
```

- `e = 1` → prorata pur. Un isolé sur quatre reçoit **0,71**.
- `e = 0,75` → il reçoit **0,86**.
- `e = 0,5` → il reçoit **1,04**, soit la pression d'un vrai solo.

**Et le budget total ne bouge jamais**, quel que soit `e` — donc `verifierScript()`
reste vert et les sommes par segment sont préservées. C'est ce qui rend ce bouton
sûr : il déplace la pression entre groupes, il n'en crée pas.

**PROPOSÉ — commencer à `e = 0,5`.** Un joueur qui part seul affronte alors la
horde d'un solo, sans aucune des compensations du solo. C'est franc, c'est
lisible, et c'est le seuil au-delà duquel on entrerait dans la punition
artificielle. Contrepartie assumée : le groupe resté ensemble est légèrement
soulagé — c'est le prix d'un budget fixe, et c'est peu.

## La règle qui rend la boucle réelle

> **Le Director ne vient PAS au secours d'un groupe qui s'est isolé.**

Sans cette règle, tout ce qui précède est annulé : le joueur isolé aurait une
`tension` élevée, le Director la lirait comme une surcharge, et il **adoucirait
la composition** — exactement l'inverse de l'effet voulu.

La distinction à écrire est simple, et elle est de nature morale plutôt que
technique : **une équipe en difficulté est un accident, un joueur qui s'isole est
une décision.** Le Director soulage le premier et pas le second. Il n'y a aucune
contradiction avec « ne jamais punir un joueur qui joue bien » : on ne lui ajoute
rien, on s'abstient seulement de lui retirer ce qu'il a choisi d'affronter.

Concrètement : la réponse « surcharge » du tableau de la section XV ne s'applique
qu'aux groupes de deux joueurs ou plus, ou aux équipes non séparées.

*Cas limite à trancher en écrivant* : un joueur qui reste seul parce que les
trois autres sont morts n'a rien choisi. Le test est probablement « effectif
vivant de l'équipe » et non « effectif du groupe ».

---

# XVII · CE QUI RESTE À TRANCHER

**Plus rien ne bloque.** Tous les points de conception sont arbitrés. Ce qui suit
n'est plus une liste d'arbitrages mais une liste de **choses à écrire**, et
chacune se tranche en la faisant.

## Les arbitrages rendus

| point | décision | section |
|---|---|---|
| classement | victoire pour tous · temps, kills, dégâts · coupés par effectif | III bis |
| taille de map | une variante = une map actuelle · 2 × 2 = 9600 × 5400 | VII |
| variantes | **4** par thème, aucune ne peut être un couloir | VII |
| contrat | tiré à l'activation · **un seul à la fois** | XIV |
| borne | ne disparaît pas · marqueur « ! » / « ? » au-dessus · touche `F` | XIV |
| suivi de contrat | côté **gauche** du HUD | XIV |
| mini-boss | garde sa zone · laisse avec récupération des PV · la fenêtre de **combat** se réarme, pas celle de présence | IV |
| loot au sol | durée de vie en minutes · ramassage sans rayon | V |
| statistiques | chance, esquive, armure · **la chance agit sur la rareté seule** | VI |
| ping | version **DOM** · la version canvas est supprimée | X |
| Director | mesure de tension adoptée · liste fermée adoptée · **ne secourt pas un groupe isolé** | XV |
| horde séparée | budget réparti par groupe · poids `e = 0,5` · recyclage lointain | XVI bis |
| mode custom | conditions à rangs · indice de sévérité · partageable · script exposé · **ni hauts faits ni noyaux** | XVIII |
| sons | palette de sept, écrite **en une fois** | XIX |

## Ce qui reste à écrire, et qui se décide en écrivant

**La table des mutateurs** (XVIII) — quelles conditions, combien de rangs, **quel
coût par rang**. C'est le vrai travail de conception du mode custom : le coût
d'un rang est un jugement, pas un calcul. Viser huit à dix conditions.

**Les six réglages de la tension** (XV) — `A`, `B`, `C`, `DECAY`, seuil bas, seuil
haut. Tous mesurables sur des manches enregistrées, aucun ne touchant à
l'équilibrage existant.

**Les nombres du mini-boss** (IV) — rayon de laisse, durées des deux fenêtres,
seuil et pente de suivi de puissance, nombre par manche.

**Les nombres de la horde** (XVI bis) — distance de recyclage lointain, seuil de
regroupement.

**Le plancher de largeur de passage** des variantes (VII) — la mesure qui
refuserait un couloir avant qu'on le voie en jeu.

**Le nombre de bornes par manche** (XIV), et le temps de recharge d'une borne
refusée.

## Les quelques cas limites notés en chemin

- un joueur seul **parce que les trois autres sont morts** n'a rien choisi : le
  test du Director est probablement l'effectif vivant de l'équipe, pas celui du
  groupe (XVI bis) ;
- une borne refusée puis réactivée : nouveau tirage ou le même ? (XIV) ;
- un contrat de zone quand l'équipe est séparée : « éliminez 150 ennemis ici »
  n'a pas le même sens groupés ou non (XIV) ;
- le format de partage des mutateurs doit porter **la version** du jeu, sinon un
  code collé après un changement de table décale silencieusement les rangs (XVIII).

---

# XVIII · LE MODE CUSTOM — LE QUATRIÈME MODE

Vous avez raison, c'est le §19 du brainstorming et je l'ai cité six fois sans
jamais lui donner sa section. La voici, et elle arrive au bon moment : **ce mode
n'est pas un bonus pour joueurs, c'est l'instrument qui rend tout le reste
mesurable.**

## Pourquoi il vient TÔT, et pas en dernier

Vous dites que c'est le moment de poser des bases solides pour l'équilibrage.
Le mode custom en est la pièce manquante, et il ne prend son sens qu'avec les
deux autres décidées ailleurs dans ce document :

```
graine deterministe (IX)   →  deux manches identiques sont comparables
compte rendu de manche (XI) →  on voit ce qui s est passe dans les deux
mode custom (XVIII)           →  on ne change QU UNE chose entre les deux
```

Les trois ensemble donnent une chose que le dépôt n'a jamais eue : **isoler une
variable.** Même graine, même biome, même effectif, même build — un seul mutateur
changé — et le compte rendu dit ce que ça a fait.

C'est aussi la réponse à la limite reconnue de tout le corpus de mesure actuel :
`LISEZMOI.md` admet que le pilote de banc *« ne savait pas jouer deux des quatre
armes »* et *« ne récolte pas et achète peu »*. Le mode custom permet de mesurer
**avec de vrais joueurs**, en ne bougeant qu'un paramètre.

**Conséquence sur l'ordre de travail** : le mode custom remonte juste après
l'outillage de mesure, avant les contrats. Il ne coûte presque rien et il rend
tout ce qui suit mesurable.

## Ce que c'est, mécaniquement

`DIFFICULTIES` **est déjà** la table de mutateurs demandée. Chaque entrée porte
`hp`, `spawn`, `dmg`, `boss`, `speed`, plus `roster`, `traits`, `script` et
`bossProfil`. Un mode custom, c'est **un objet de difficulté construit au
lancement** au lieu d'être lu dans le tableau.

Il n'y a donc pas de système à écrire. Il y a une interface, une sérialisation, et
quatre garde-fous.

## Les quatre garde-fous, et ils ne sont pas négociables

**1 · Un index réservé.** `DIFFICULTIES` est append-only et son index circule
partout : dans le message `round`, dans la clef de `bestFinal`
(`clefRecord(difficulté, joueurs)`), et comme index dans `PROG_CFG.DIFF_MUL`.
Le custom prend l'index **3** et n'y touche plus jamais.

**2 · Exclu du classement.** Un classement compare des courses identiques ; une
course dont chacun écrit les règles ne se compare à rien. Le custom n'écrit pas
dans `bestFinal`.

**3 · Exclu du revenu de noyaux.** `PROG_CFG.DIFF_MUL = [1, 1.4, 2]` — le custom
n'y ajoute **pas** une quatrième entrée. Sinon un mutateur « ×2 loot, −50 %
ennemis » devient la meilleure façon de farmer la méta, et toute la progression
hors manche s'effondre en une soirée. C'est le garde-fou le plus important des
quatre, et c'est aussi ce que vous voulez dire par « mais normal, car partie
custom ».

**4 · `MAX_ENEMIES_HARD_CAP = 900` reste une limite de moteur.** Aucun mutateur ne
la dépasse. Le plafond de population n'est pas un réglage de difficulté, c'est le
point au-delà duquel le rendu et le réseau lâchent — et l'échec y est silencieux.

## Les mutateurs

Le brainstorm en propose cinq familles. Voici ce que chacune coûte dans ce
dépôt, parce qu'elles ne se valent pas.

**HORDE — gratuit.** `spawn` est déjà un multiplicateur du budget ; les élites ont
`ELITE_FROM`, `ELITE_MIN`, `ELITE_MAX`. Plus d'ennemis, apparition accélérée, plus
d'élites : trois nombres. *Contrainte : `MAX_ENEMIES_HARD_CAP`.*

**ENNEMIS — gratuit.** `hp`, `speed`, `dmg` existent. Les comportements spéciaux
passent par `traits`, qui est déjà une table `type → trait` et dont les six
valeurs sont **des bits**, donc empilables.

**JOUEURS — presque gratuit, mais un point de passage unique à respecter.**
Les PV, les dégâts et la vitesse sont des mods. Le multiplicateur de dégâts subis
passe par `_hurt()`, *« ici et nulle part ailleurs »* — un mutateur qui
l'appliquerait à un autre endroit créerait exactement le genre de divergence que
`CLAUDE.md` interdit.

**MONDE — moyen.** Les zones dangereuses existent (`HZ_NORMAL` / `HZ_CAUCHEMAR`
sont des tables par lieu), la fréquence d'événements est `rateMul` dans `EVENTS`.
La **visibilité réduite** est la seule qui demande du travail neuf côté rendu, et
elle interagit avec la lisibilité de la horde — à traiter en dernier.

**BUILD — moyen, et c'est la famille la plus intéressante.** Cartes limitées, loot
augmenté, choix réduits, progression modifiée. `LEVEL_XP_BASE`, `LEVEL_XP_GROWTH`,
le nombre d'offres de cartes, `drawQuality` : tout est déjà des nombres. C'est la
famille qui produit les expériences les plus différentes pour le moins de code.

## Le point que le brainstorm ne traite pas : le script

`SCRIPTS` a **trois variantes** (`calme`, `normal`, `cauchemar`), indexées par
difficulté. Un mode custom doit en choisir une, et c'est une vraie question :

- **imposer `cauchemar`** — le plus simple, mais tout mode custom hérite alors de
  sa courbe de pression, y compris un custom volontairement doux ;
- **l'exposer comme mutateur** — cohérent avec le reste, et ça donne accès à la
  vraie granularité : « courbe calme + ennemis de cauchemar » est une expérience
  qu'aucun mode ne permet aujourd'hui.

**PROPOSÉ — l'exposer.** C'est une ligne de plus dans l'interface et ça
multiplie par trois l'espace du mode.

## Aller au-delà du cauchemar

Vous le demandez explicitement, et rien ne s'y oppose : les multiplicateurs n'ont
pas de plafond conceptuel, seulement `MAX_ENEMIES_HARD_CAP` qui est physique.

Deux remarques pour que ça reste jouable plutôt que grotesque :

- **tout à fond n'est pas la difficulté maximale, c'est le chaos.** Les
  multiplicateurs se composent — `hp × spawn × dmg × boss` — et le produit
  explose bien avant que chaque facteur soit à son maximum. Une interface qui
  affiche **le produit estimé** à côté des curseurs vaut mieux qu'une qui les
  laisse deviner ;
- **un indicateur de sévérité** calculé depuis les multiplicateurs donnerait un
  repère (« × 3,4 par rapport à cauchemar »). Le dépôt sait déjà faire ce genre
  de calcul : la formule d'équilibration `V = 0,8·Vhorde + 0,2·Vboss × U × R + S`
  est exactement de cette famille.

## Les mutateurs : des conditions à RANGS, pas des curseurs libres

*Vous proposez de s'inspirer du genre. Le modèle le plus abouti est le **Pacte de
Châtiment** de Hades, et il règle trois problèmes d'un coup.*

Hades propose **quinze conditions**, la plupart à **plusieurs rangs**. Chaque rang
coûte de la **Chaleur**, et la jauge de Chaleur affiche la « difficulté totale »
du réglage. « Travail forcé » rang 1 donne +20 % de dégâts aux ennemis et coûte
1 Chaleur ; rang 5 donne +100 % et coûte 5. Certaines conditions coûtent 2 ou 3
par rang. Tout à fond dépasse 60 de Chaleur.

Ce que ce modèle donne, et qu'un curseur libre ne donne pas :

**1 · Un indice de sévérité qui existe sans être calculé.** C'est la somme des
coûts. C'est exactement ce que je proposais en v4 avec « le produit estimé », mais
en plus honnête : le coût de chaque rang est **écrit à la main**, donc il peut
dire ce qu'un produit de multiplicateurs ne sait pas dire.

**2 · Un espace fini et comparable.** Trois rangs valent trois valeurs, pas une
infinité. Deux joueurs peuvent se dire « j'ai fait 24 » et se comprendre.

**3 · Des paliers déjà pensés.** Un curseur libre invite à mettre 87 % parce que
c'est possible ; un rang oblige le concepteur à choisir ce que veut dire chaque
cran.

**DÉCIDÉ — l'interface mélange curseurs et cases, au cas par cas.** Le rang reste
la structure de fond ; la présentation s'adapte. Un mutateur à trois crans se lit
mieux en cases ; un mutateur à cinq crans monotone se lit mieux en curseur cranté.
C'est une décision de présentation, pas de modèle.

**Un avertissement que le wiki de Hades donne lui-même**, et qui vaut double
ici : *beaucoup de conditions sont presque sans effet contre une build et
extrêmement dures contre une autre.* Avec dix armes et trois classes, un mutateur
« +50 % vitesse ennemie » ne veut pas dire la même chose pour un laser que pour un
railgun. **L'indice de sévérité est donc une approximation, et il faut le
présenter comme tel** — pas comme une difficulté objective.

## Le partage des réglages

**DÉCIDÉ — les réglages se partagent.** C'est de la sérialisation, donc presque
gratuit : la liste des rangs tient dans une chaîne courte.

Et vous notez le vrai usage, qui n'est pas le fun : **un réglage partagé est un
protocole d'expérience.** « Voici le code, voici la graine, voici le compte
rendu » devient une phrase qui suffit à reproduire une mesure — chez un ami, ou
dans une conversation avec moi. C'est le chaînon qui manquait entre le mode
custom et l'outillage de mesure.

Le format doit donc porter **la version** du jeu. Un code de mutateurs collé après
un changement de table ne veut plus rien dire, et il vaut mieux qu'il le dise que
de silencieusement décaler les rangs.

## Le plancher : plus facile que calme, mais pas beaucoup

**DÉCIDÉ — un custom peut être plus facile que calme, sans aller beaucoup plus
bas.** Calme est déjà très simple (`hp 0,80`, `spawn 0,72`, `dmg 0,70`,
`MAX_ENEMIES_DIFF 0,80`) ; descendre franchement en dessous ne produit plus une
partie, mais une démonstration.

Les rangs négatifs existent donc, mais peu nombreux — un ou deux crans sous la
référence, pas cinq. Et l'indice de sévérité descend en dessous de zéro, ce qui
dit clairement ce qui se passe.

## Les autres points, arbitrés

**DÉCIDÉ — pas de hauts faits en custom.** Même raison que les noyaux : c'est un
mode à part, pour le fun et pour l'expérimentation. Rien n'en sort qui compte
ailleurs. `pousserHautFait()` est le point de passage unique — un seul test à
l'entrée suffit.

**DÉCIDÉ — le custom apparaît dans le compte rendu comme n'importe quelle manche**,
si la mesure est armée. Son en-tête porte **tous** les rangs actifs et l'indice de
sévérité. Un compte rendu de custom sans ses réglages ne veut rien dire, et c'est
l'usage principal du mode.

**DÉCIDÉ — le script est exposé comme mutateur.** `SCRIPTS` a trois variantes
(`calme`, `normal`, `cauchemar`) ; en faire un choix donne accès à des
combinaisons qu'aucun mode ne permet — « courbe calme, ennemis de cauchemar »,
par exemple.

## Ce qui reste à écrire

La table elle-même : quelles conditions, combien de rangs chacune, et **quel coût
par rang**. C'est le vrai travail de conception du mode, et il ne se délègue pas —
le coût d'un rang est un jugement, pas un calcul. Hades en a quinze ; en viser
huit à dix pour commencer serait raisonnable, réparties sur les cinq familles
ci-dessus.

Les **préréglages** valent aussi d'être écrits : trois ou quatre combinaisons
nommées enseignent le mode à qui l'ouvre pour la première fois, mieux qu'une page
de curseurs.

---

# XIX · LES SEPT SONS

*Vous demandez de faire au mieux, quitte à changer plus tard, mais avec des sons
cohérents. La bonne nouvelle : la doctrine sonore du dépôt est déjà écrite, et
elle décide presque tout.*

## Les règles que la palette existante impose

Elles sont dans les commentaires d'`audio.js`, et elles sont bonnes :

- **« la famille donne la matière, le RANG ajoute une quinte au-dessus, jamais du
  gain : *rare* se dit en hauteur, pas en volume »**. C'est la règle la plus
  utile : toute notion de rareté passe par la **hauteur** ;
- **« l'apparition est un appel, pas un gain : très court, très haut, très bas en
  gain »** (`bonusNe`). Ce qui naît ne dispute pas sa place à ce qu'on ramasse ;
- **une seule place de voix par famille**, avec la même clef de limiteur. Treize
  bonus rendaient la même quinte montante — c'est le défaut qui a produit les
  trois matières ;
- **le moment le plus tendu du jeu mérite le plus gros budget** (`relevement`).

## Ce que je propose, dans l'ordre du plus contraint au plus libre

**1 · Le ping.** Le plus contraint : il doit percer deux cents corps. La famille
`annonce` est celle qui coupe — fondamentale grave plus quinte, deux notes.
**Proposition : la hauteur porte l'identité du joueur.** Quatre joueurs, quatre
fondamentales ; on entend **qui** appelle avant de regarder l'écran. C'est
gratuit et ça double la valeur du son.

**2 · Le réveil du mini-boss.** Bas, physique, pas musical — famille
`impactLourd` / `mur`, pas famille `annonce`. Il ne doit surtout **pas** sonner
comme un boss : le boss a son bandeau et sa musique, le mini-boss n'a que ça.
Court, sourd, sans résolution.

**3 · Le ramassage d'un loot.** Il ne demande aucune invention : c'est une
**quatrième matière** dans la famille des trois qui existent (corps, métal,
masse), et **la rareté passe par la quinte de rang** — mécanisme déjà écrit, déjà
mesuré. La matière du loot devrait être **cristalline**, la seule des quatre qui
ne soit ni organique, ni métallique, ni massive.

**4 · La borne repérée.** `bonusNe` exactement : très court, très haut, très bas
en gain. **Et probablement rien du tout** — le « ! » au-dessus fait déjà le
travail, et un son à chaque borne qui entre dans le champ deviendrait un tic-tac.
À trancher en écoutant.

**5 · Entrer dans le rayon d'interaction.** Le son le plus répété du lot, donc le
plus discret : une seule note, très courte, très basse en gain, **et une seule
fois par entrée** — pas tant qu'on est dedans. C'est celui qui agacera le premier
s'il est mal réglé.

**6 · Le contrat accepté.** Famille `recolteFin` : une résolution, trois notes qui
montent et se referment. Mais **plus petite que `hautFait`**, qui garde sa quinte
tenue et son accord ouvert. Accepter n'est pas accomplir.

**7 · Le contrat réussi.** Le seul des sept qui ait droit à un vrai budget. Entre
`recolteFin` et `hautFait` : il résout, il dure, mais il ne prend pas la place
d'un haut fait. **Et son pendant, l'échec**, existe déjà comme modèle — `aterre`
descend de 520 à 120 en dents de scie, sans résoudre. Un contrat qui expire doit
faire ça, en plus court.

## La règle qui compte plus que les sept

**Ces sept sons doivent être écrits ENSEMBLE, pas un par lot.** C'est ce que dit
le défaut déjà payé par le dépôt — treize bonus qui rendaient la même quinte,
corrigés en une seule fois par les trois matières. Sept sons ajoutés séparément
par sept lots différents ne feront pas une palette, ils feront un bruit, et il
faudra les refaire.

Ils peuvent être approximatifs et changer plus tard. Ils ne peuvent pas être
écrits à sept moments différents.

---

# XX · ORDRE DE TRAVAIL PROPOSÉ

Non décidé, donné comme point de départ de discussion.

1. **Finir le plan 30** (courbe d'XP, boss, armes). Rien ne se calibre contre une
   base qu'on s'apprête à changer. La cible se resserre : niveau 30 atteint
   **entre 15 et 20 min**, il doit l'être en fin de manche.
2. **Le classement** (III bis). Petit, isolé, et il rend fonctionnel quelque chose
   qui est déjà écrit. À faire tôt pour cette raison.
3. **Les fondations invisibles** : déterminisme (IX), `_grille()` bornée, champ de
   navigation fenêtré (XVI), apparitions par joueur, décision XP écrite (VIII),
   **indicateur d'allié dédoublonné** (X). Aucun contenu neuf.
4. **L'outillage de mesure** (XI). Il vient tôt parce que tout ce qui suit se
   mesure, et parce qu'il est le seul instrument qui voie ce que les bots ne
   savent pas faire.
5. **Les contrats** (XIV) — bornes, touche `F`, suivi HUD. Ils commandent le reste.
6. **Le mini-boss et le loot** (IV, V).
7. **Le Director borné** (XV).
8. **La map** : variantes de thème (VII), puis agrandissement, puis ping (X).
**Le mode custom (XVIII) remonte au rang 5**, juste après l'outillage : il coûte
peu, et avec la graine déterministe et le compte rendu il forme le banc qui rend
mesurable tout ce qui suit. L'ordre devient :

```
1  finir le plan 30
2  le classement (III bis)
3  les fondations invisibles (IX, XVI, XVI bis, VIII, X)
4  l outillage de mesure (XI) + les deux indices, tension et survie
5  le mode custom (XVIII)          ← le banc est complet a ce stade
6  les contrats (XIV)
7  le mini-boss et le loot (IV, V)
8  le Director (XV)
9  la map : variantes puis agrandissement, puis ping (VII, X)
```

**Les sept sons (XIX) ne sont pas une étape** : ils se composent en une fois, dès
que les systèmes qui les portent sont connus — c'est-à-dire maintenant. Les
brancher se fait ensuite lot par lot, mais les **écrire** doit être un seul
geste, sans quoi ils ne formeront pas une palette.


---

# XXI · TROIS CHOSES VUES EN RELISANT

Rien de bloquant, mais deux d'entre elles changeraient un plan si on les
découvrait en cours de route.

## 1 · Le loot défensif serait gratuit, le loot offensif se taxerait lui-même

C'est le point le plus important de cette relecture, et il n'était visible qu'en
ouvrant `powerIndex()`.

```js
export function powerIndex(m, flat = 0, arme = ARME_DEFAUT) {
  ...
  return m.damageMul * barrels * armeMul * catalyseur * crit
    * (1 + m.echoChance) / m.fireIntervalMul * flatMul;
}
```

**L'indice de puissance est purement OFFENSIF.** Il lit les dégâts, les canons,
l'échelle d'arme, le catalyseur, le critique, l'écho, la cadence et les dégâts
plats. Il ne lit **ni les PV, ni le bouclier, ni la réduction** — et c'est
délibéré : le commentaire dit que c'est *« ce que l'arme rend contre une cible
unique »*, le contexte sur lequel les boss sont calibrés.

Or cet indice remonte toute la chaîne :

```
powerIndex → _playerPower → _teamPower → bossPower() → PV du boss
                                       → tension du Director (XV)
                                       → PV du mini-boss (IV)
```

**Conséquence, et personne ne l'a conçue :**

- un loot **offensif** (+dégâts plats, +critique) passe dans `_flatDamage` et
  `m.critChance`, donc il **grossit le boss et le mini-boss**. Il paie une partie
  de lui-même ;
- un loot **défensif** (+armure, +esquive, +PV) est **invisible** à l'indice. Il
  ne grossit rien. C'est de la puissance entièrement gratuite.

Avec six loots par manche et des joueurs qui apprennent, l'optimum est évident :
**prendre du défensif**. Ce n'est pas un choix intéressant, c'est un tarif.

Et les trois statistiques décidées en section VI — chance, esquive, armure — sont
**toutes les trois** invisibles à l'indice. Le problème n'arrive donc pas avec le
loot, il arrive avec elles.

**Trois réponses possibles**, et il faut en choisir une avant d'écrire le lot des
statistiques :

- **assumer** — l'indice mesure l'offensif et les boss sont calibrés là-dessus,
  point. Alors il faut que les loots défensifs soient **plus chers** ou **plus
  rares** que les offensifs, pour rétablir à la main ce que la formule ne fait
  pas ;
- **élargir l'indice** — ajouter un terme de survie (`maxHp`, `damageTakenMul`,
  armure, esquive, bouclier) à `powerIndex`. C'est propre, mais ça **recalibre
  tout** : `BOSS_POWER_REF = 2,89`, la courbe de PV des six boss, `_summonMul` qui
  divise par `SUMMON_REF`, et les mesures des plans 27 à 30 ;
- **un second indice** — garder `powerIndex` intact pour les boss, et créer un
  indice de survie **uniquement** pour la tension du Director. Le Director saurait
  alors qu'une équipe cuirassée n'est pas en danger, sans toucher à la calibration
  des boss.

**DÉCIDÉ — la troisième : un second indice, de survie, réservé à la tension du
Director.** `powerIndex()` ne bouge pas et les boss restent calibrés sur
l'offensif. Le Director, lui, lit les deux : il saura qu'une équipe cuirassée
n'est pas en danger.

Ce que ça implique, à écrire dans le lot des statistiques :

- l'indice de survie lit `maxHp`, `damageTakenMul`, l'armure plate, l'esquive et
  `shieldPool`. Il ne sert **qu'à** la tension : aucun boss, aucun mini-boss,
  aucune récompense ne s'y branche ;
- `BOSS_POWER_REF`, `SUMMON_REF`, la courbe des six boss et les mesures des plans
  27 à 30 sont **intacts** ;
- le tarif des loots défensifs (plus rares ou plus chers que les offensifs) reste
  un travail d'équilibrage, mesurable avec le compte rendu, pas une formule.

## 2 · La tension doit se MESURER avant de servir

Le Director arrive au rang 8 de l'ordre de travail. Ses six réglages (`A`, `B`,
`C`, `DECAY`, les deux seuils) devront être calibrés — et à ce moment-là, il n'y
aura **aucune manche enregistrée** pour dire à quoi ressemble une courbe de
tension normale.

**DÉCIDÉ — la mesure de tension part avec l'outillage (rang 4), pas avec le
Director (rang 8).** Elle est calculée, tracée dans l'échantillon à 1 Hz du
compte rendu, et **elle ne pilote rien**. Les deux indices — tension et survie —
sont donc livrés en même temps que le compte rendu, et le Director n'arrive que
lorsqu'il y a des courbes à lire.

Ce que ça donne, gratuitement :

- des dizaines de manches réelles avec leur courbe, avant d'écrire une seule
  ligne de Director ;
- les seuils bas et haut se lisent **sur les distributions observées** au lieu
  d'être devinés ;
- la courbe de tension d'une vraie manche se compare à celle que le brainstorm
  dessinait au point 27 — et on saura si le jeu a déjà le rythme voulu, ou pas ;
- si la mesure est mauvaise, on le voit **avant** qu'un système s'appuie dessus.

Le coût est nul : c'est quatre flottants par joueur et par tick, qu'il faudra
écrire de toute façon.

## 3 · Les nombres du plan 30 ont une date de péremption

Le plan 30 recalibre la courbe d'XP, les boss et les armes. Le plan des loots
(rang 7) ajoutera de la puissance **hors du système de niveaux**.

`BOSS_POWER_REF = 2,89` et la puissance médiane mesurée de 2,7 à 3,2 en fin de
manche sont des **relevés**, pas des constantes de conception. Six loots offensifs
par manche les feront monter, et la calibration du plan 30 décrira alors un jeu
qui n'existe plus.

Ce n'est pas une raison de retarder le plan 30 — il faut une base stable pour
mesurer quoi que ce soit. Mais il faut l'écrire dans son propre document :

> les valeurs calibrées ici supposent que toute la puissance vient des niveaux,
> des cartes et des reliques. Le loot de run les invalidera, et elles seront à
> remesurer, pas à reconduire.

**DÉCIDÉ — cette réserve est écrite dans le document du plan 30 lui-même**, pas
seulement ici. Sinon quelqu'un — vous, moi, ou Claude Code dans six mois —
traitera ces nombres comme acquis.

## Et sinon

Le reste tient. En relisant les vingt sections, je ne vois pas d'autre trou : les
systèmes se tiennent, chacun a son point d'accroche dans le code, chacun a son
critère de vérification, et les décisions ne se contredisent pas entre elles.

Les seules zones qui resteront floues jusqu'à l'écriture sont celles qui doivent
l'être : la table des mutateurs, les six réglages de la tension, et les nombres
du mini-boss. Ce sont des jugements, et un jugement se prend devant le résultat.
