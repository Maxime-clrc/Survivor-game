# Lot E — conditionnement et catalogue de cartes

Le catalogue compte 116 cartes. Le lot ajoute d'abord le **conditionnement du
tirage**, qui manque et sans lequel toute nouvelle carte aggrave le problème,
puis retire les cartes mortes, puis comble les axes orphelins.

**E-1 est un prérequis d'écriture de tout le reste.**

---

## E-1 — le conditionnement des cartes

### Constat

Le catalogue propose des cartes qui n'ont littéralement aucun effet chez celui
qui les tire. Cas d'école : **`Surcharge orbitale`** (rare, `+% de dégâts des
lames orbitales`) sort chez un joueur qui n'a jamais eu **`Orbiteurs`** (épique)
ni **`Essaim`** (légendaire). La carte est un choix vide qui occupe une des trois
offres — le joueur n'a pas eu trois options, il en a eu deux et un fantôme.

Le dépôt connaît le problème et l'a résolu **deux fois, différemment** :

- par la **classe** (`cls`) — `Fragmentation` ne sort jamais chez un tank ;
- par l'**affichage** (`effective()`) — `Pacte de fer` annonce elle-même
  « sans carte de bouclier, elle ne fait rien ».

Il manque le troisième cas, et c'est le plus courant.

### Décision — quatre filtres dans `eligibleCards`

**1. `requires` — prérequis de carte.** Même forme que `incompatible` : une liste
d'identifiants dont **au moins un** doit être possédé.

```js
{ id: "surcharge_orbitale", requires: ["orbiteurs", "essaim"], ... }
```

> **Règle d'arbitrage entre `requires` et `effective()` :** on **conditionne**
> quand le prérequis est de rareté **rare ou supérieure** — le joueur ne peut pas
> aller le chercher, la carte serait morte par malchance. On **affiche** quand le
> prérequis est commun et abondant : `Résonance` reste affichée, parce que sept
> cartes de cadence existent et que le joueur peut décider d'en prendre.

**2. `minPlayers` — jamais tirée sous N joueurs.** Le script de timeline et les
mécaniques de boss l'ont déjà, avec la même signature.

**3. `teamUnique` — une seule fois par table.** Pour les cartes dont l'effet est
**global** : une fois prise par n'importe qui, elle sort du pool de tout le
monde. Sans ça, un second exemplaire est soit sans effet (une offre gaspillée),
soit un cumul qui neutralise un système entier.

**4. `requiresSystem` — conditionnement au CONTEXTE de la manche.** Une carte
qui dépend d'un système absent du mode ou du biome courant ne sort pas.

```js
{ id: "conducteur", requiresSystem: "hasards_actifs", ... }
// -> jamais tirée en `calme`, où aucun hasard n'est actif
```

### Garde-fou obligatoire

Quatre filtres qui se cumulent peuvent **vider un pool**. `eligibleCards` doit
compter les cartes restantes par rareté après filtrage et journaliser un
avertissement sous un seuil (6). Même esprit que `verifierScript()` : une règle
qui se vérifie au lieu de se supposer. Le dépôt a déjà vécu ce cas exact — le
commentaire de `progression.js` raconte un écran affichant « (0 carte) » parce
qu'un groupe en absorbait un autre.

### Règle d'insertion — append-only

**Les nouvelles cartes s'ajoutent à la FIN du tableau `CARDS`.** Raison :

```js
legendaires   = CARDS.filter(c => c.rarity === LEGENDAIRE && !c.fallback && !c.remplaceArme)
legendairesDuBoss = i => legendaires.filter((_, k) => k % LEGENDARY_SPLIT === i)
```

L'affectation d'une légendaire à un boss dépend de sa **position** dans le
tableau. Insérer une légendaire au milieu décale toutes les suivantes et
**reverrouille des cartes chez tous les comptes existants** — le dépôt a déjà
documenté ce piège à propos du passage de cinq à six paquets. Même raisonnement
pour `armes`, dont le partage `k % 2` alimente les jalons `sans_chute` et
`kills500`.

En append-only, les index existants sont préservés. Une seule légendaire est
ajoutée par ce lot (`Phalange`).

---

## E-2 — retrait de `scoreMul`

Deux cartes vivent d'une statistique que seuls le HUD et le tableau de fin
lisent. Elles ne sont **pas** remplacées par du « +% d'XP » : principe verrouillé
n°4, une jauge commune ne reçoit pas de multiplicateur individuel.

**`Bourse`** devient une carte d'éclats — l'équivalent du « +coin gain » de Halls
of Torment : monnaie de manche, boucle fermée sur le marchand, aucun effet
composé sur la progression. Elle donne enfin une raison mécanique d'explorer la
grande arène, ce qui était le point du lot I.

```js
{ id: "bourse", nom: "Bourse", rarity: 0, max: 3, tags: ["util"],
  desc: "+25 % d'éclats récoltés",
  stack: n => pctAdd(0.25, n),
  apply(m, n) { m.shardMul += 0.25 * n; } },
```

**`Ferraille`** garde sa moitié utile. Le PV par kill est bon — c'est de la
survie active, elle récompense de rester dans la masse.

```js
{ id: "ferraille", nom: "Ferraille", rarity: 0, max: 4, tags: ["def", "util"],
  desc: "+1 PV par ennemi tué et +15 % de portée de ramassage",
  apply(m, n) { m.hpPerKill += n; m.pickupRadiusMul += 0.15 * n; } },
```

*Note d'implémentation :* `pickupRadius` est aujourd'hui un **maximum** absolu
(`Math.max(m.pickupRadius, 120)` dans `Poches larges`), pas un multiplicateur.
Il faut une seconde clé `pickupRadiusMul` appliquée en aval, sur le modèle de
`orbiterDamageMul` face à `damageMul`. Ne pas convertir `Poches larges` : sa
sémantique de plancher est correcte.

`scoreMul` **reste** dans `defaultMods()` et dans `_credit` : le score garde sa
fonction de classement, il n'est simplement plus une cible de carte.

### Si l'axe XP est vraiment souhaité

Il peut l'être — c'est un pilier de Vampire Survivors. La condition est
l'**attribution au tueur**, et elle tient en une ligne parce que `_killEnemy` a
déjà `owner` sous la main :

```js
this._addXp(this._xpValue(e) * (owner?.mods.xpGainMul ?? 1));
```

Le porteur ne bonifie que ses propres kills, le problème coopératif disparaît.
La carte reste **petite et plafonnée** — `+8 %, max 2` : dans VS, Growth est déjà
l'un des meilleurs choix du jeu à +8 %, et l'axe existe en négatif (`xpCostMul`
de « Dette »), ce qui fixe l'échelle.

Ce n'est **pas** un remplacement de `Bourse` : si les deux sont retenues, ce sont
deux entrées distinctes.

---

## E-3 — le pic de puissance manquant

Le retour principal du lot, et il vaut plus que le reste.

Le catalogue est presque entièrement **incrémental** : +12 % de dégâts, −7 %
d'intervalle. Or Vampire Survivors, Halls of Torment et Megabonk tiennent tous
sur un moment identifiable où la build **change de nature**. C'est ce qui fait
qu'on raconte sa partie.

L'objet existe : ce sont les `remplaceArme`. Mais elles sont **toutes légendaires
ET verrouillées derrière des jalons de compte**. L'identité d'une manche se
décide donc au niveau 12, soit vers la minute 10 sur 37 ; et pour un compte neuf,
elle ne se décide jamais.

### 1. Compléter `family` / `tier` en chaîne d'évolution

Tout le gréement est déjà écrit : `FAMILY_TIERS`, le calcul du palier atteint
(`top.set(card.family, ...)`), le filtrage par palier, l'affichage « palier N/4 ».
Il ne manque **qu'une règle de tirage** : atteindre le `max` d'un palier fait
apparaître le palier suivant de la même famille avec un poids fortement relevé.

```js
FAMILY_PROMOTION_WEIGHT: 8,   // poids du palier suivant d'une famille pleine
```

C'est l'évolution de VS obtenue avec le code déjà présent, et ça rend les
communes intéressantes : elles cessent d'être un gain pour devenir un
**investissement**. Cinq familles existent, soit cinq chaînes.

### 2. Les cartes de dégâts d'arme exigent l'arme — décision D3, TRANCHÉE

**Le tableau `armes` ne bouge pas.** La proposition initiale (sortir une arme du
pool légendaire pour un choix garanti au niveau 4) est **abandonnée** : elle
décalait le partage par parité d'index qui alimente `sans_chute` et `kills500`,
et aurait reverrouillé des cartes chez tous les comptes existants.

À la place, l'exigence est celle du **filtre `requires` de E-1**, appliqué aux
cartes qui bonifient une arme :

```js
{ id: "surchauffe_dispersion", requires: ["dispersion"], ... }
{ id: "focalisation_railgun",  requires: ["railgun"],    ... }
// etc. — une carte de dégâts d'arme ne sort JAMAIS sans l'arme
```

C'est le même défaut que `Surcharge orbitale`, et donc le même remède. **Zéro
risque de migration** : aucun index ne bouge, aucun jalon n'est touché.

**Conséquence assumée :** l'identité de build côté *arme* ne diverge toujours
qu'au niveau 12. C'est la chaîne `family`/`tier` ci-dessus qui porte seule la
divergence précoce — dès le niveau 1, ce qui suffit.

**Audit obligatoire dans le même geste :** lister **toutes** les cartes qui
bonifient une arme spécifique et vérifier qu'aucune n'échappe au filtre. C'est
la classe de défaut la plus probable du catalogue, puisqu'elle s'est déjà
produite deux fois (`Surcharge orbitale`, et les cartes d'arme).

---

## E-4 — audit, sans décision de design

- **cartes mortes** : lister toutes celles dont le mod n'est lu nulle part dans
  la simulation, ou lu dans une branche inatteignable. `scoreMul` a été trouvé à
  la main ; il en reste probablement.
- **plafonnement additif** : `damageMul` reçoit de l'additif de sept cartes
  (`affutage` ×6, `lest` ×5, `calibre` ×4, `resonance`, `dette`, `contrat`,
  `coeur_forge`). À 26 cartes, la 20e carte de dégâts vaut bien moins que la 3e.
  C'est normal, mais il faut **mesurer où est le genou** pour savoir si le pool
  de communes doit se vider plus tôt.
- **incompatibilités** : `incompatible` est déclaré dans les deux sens pour les
  armes, dans un seul sens pour `perforation`/`railgun`. Vérifier qu'aucune paire
  n'est déclarée à moitié.

---

## E-5 — les axes orphelins

Relevé : quels systèmes la **simulation** possède, et combien de cartes les
touchent.

| système | présent | cartes |
|---|---|---|
| tir, dégâts, cadence, critique | oui | ~50 |
| survie, bouclier, soins | oui | ~25 |
| invocations | oui | 8 |
| momentum (élan, meute, rage, bas PV) | oui | 7 |
| **états** (4) | oui | 4 — et **l'entrave, zéro** |
| **hasards du sol** (5) | oui | **1** |
| **boss** (6 combats, ~20 % du temps) | oui | **1** |
| **événements de horde** (4) | oui | **0** |
| **récolte et exploration** | oui | 2, toutes deux épiques |
| **coopération** | oui | **6 sur 116** |
| **esquive** | oui | 2 (une commune, une légendaire — rien entre) |

Deux constats méritent d'être dits franchement. **Le jeu est coopératif et a six
cartes de coopération** : un joueur qui veut construire autour de ses coéquipiers
n'a presque rien à prendre, et la classe soigneur porte seule tout le jeu
d'équipe. **Les boss occupent un cinquième de la manche et n'ont qu'une carte**
(`Convalescence`).

---

## E-6 — mise au point sur « hasards » et « météo »

**Correction par rapport à la première version du plan**, qui traitait les deux
comme un seul axe et proposait deux cartes indexées sur la météo. C'était faux,
et ces cartes étaient mortes dans deux modes sur trois.

| système | ce que c'est | où | disponibilité |
|---|---|---|---|
| **hasards** (5) | zones **au sol** : geyser, mare, braises, ralentissement, glissement | `buildBiome`, `hazardState` | tous les modes (`normal` sans hasard qui blesse, `calme` sans hasard actif) |
| **météo** (3) | effets **globaux**, aucune zone | `weatherFor` | **cauchemar uniquement**, un segment sur trois sans |

Ce qu'on voit au sol, ce sont les **hasards**. La météo est un système séparé,
sans zones, réservé à cauchemar.

### Ce que fait vraiment chaque météo

- **Bourrasque** — réelle. `GUST_PUSH = 46` px/s poussent joueurs **et** ennemis,
  direction déterministe, rejouée par la prédiction client.
- **Cendres** — réelle. `ASH_LIFE = 11` s contre `POWERUP_LIFE = 22` : durée de
  vie des bonus au sol divisée par deux.
- **Brume** — **purement visuelle**. Elle ne touche que la vignette de rendu
  (`FOG_VIGNETTE`, `FOG_FROM` dans `decor.js`). Aucune ligne de `game_state.js`
  ne la lit.

**Et son annonce ment.** Le texte joueur dit :

> brume dense — **les bords de l'arène se ferment**

Rien ne ferme quoi que ce soit. C'est le seul endroit du jeu où une annonce
promet une mécanique inexistante — plus grave qu'un déséquilibre : un joueur qui
apprend le jeu en tirant des conclusions de ce qu'on lui annonce apprend ici
quelque chose de faux. *Trois issues, voir DECISIONS.md.*

---

## E-7 — les 19 cartes proposées

Chacune indique **ce qui existe déjà de proche**, pour qu'on puisse juger si elle
ajoute vraiment quelque chose. Les règles de rareté du dépôt sont respectées :
une commune est *« jamais un choix, seulement un gain »* ; une rare *« modifie une
mécanique plutôt qu'un nombre »* ; une épique *« réécrit une règle »*.

### Environnement

| carte | rareté | effet | filtres |
|---|---|---|---|
| `crampons` | C max 3 | −25 % de l'effet des sols glissants et ralentissants | `teamUnique` |
| `conducteur` | R max 2 | les ennemis traversant un hasard subissent 14 dég./s | `requiresSystem` |
| `terrain_conquis` | E max 1 | tes zones (bombes, ondes, givre) laissent un sol brûlant 4 s | — |

`crampons` — *proche :* `Talon de fer` (rare, immunité totale). Palier d'entrée
qui manquait. `teamUnique` parce que l'axe neutralisé est petit : deux joueurs
qui investissent dessus, c'est deux offres gaspillées pour la table.

`conducteur` — *proche :* aucun. **La proposition qui ouvre le plus de jeu :**
elle transforme la carte en arme et fait naître un geste que rien ne récompense —
attirer la horde dans un geyser au lieu de la fuir. Réutilise `hazardState`.

`terrain_conquis` — remplace `Œil du cyclone`, retirée (météo cauchemar-only).
Même désir — faire du sol un allié — mais sur un système présent dans les trois
modes : les zones du joueur. Réutilise le rendu de traînée de `TRAIT_TRAIL`.

### Entrave

`STATUS_ROOT` existe, est réseau, est rendu. Il n'est posé que **par les boss,
sur les joueurs**. Aucun joueur ne peut entraver quoi que ce soit.

| carte | rareté | effet | filtres |
|---|---|---|---|
| `filins` | R max 2 | 12 % de chance qu'une balle entrave la cible 1 s | — |
| `etau` | R max 2 | les explosions entravent les ennemis touchés 0,8 s | `requires` (zone) |
| `nasse` | E max 1 | les ennemis entravés subissent +40 % de dégâts | `requires: [filins, etau]` |

`filins` — *proche :* `Champ de givre` (ralentissement en aura). Ralentir et
entraver ne jouent pas pareil : l'un adoucit la pression, l'autre crée une
fenêtre. Le jeu n'a que le premier.

`nasse` — fait de l'entrave un **axe de build** plutôt qu'un effet isolé, et rend
`filins` intéressante rétroactivement.

### Boss

| carte | rareté | effet |
|---|---|---|
| `reperes` | C max 4 | +7 % de dégâts contre les boss |
| `briseur` | R max 2 | briser une barre de boss recharge instantanément tes compétences |
| `traqueur` | E max 1 | +25 % de dégâts contre les boss, +10 % de plus par barre brisée |

`traqueur` — une rampe **dans** un combat, ce que le jeu n'a nulle part. Elle
répond au défaut documenté en D2 : depuis que les PV de boss ne suivent plus la
build, les combats durent de 131 s à 29 s selon la puissance. Une carte qui monte
au fil des barres récompense la durée au lieu de la subir.

### Événements de horde

| carte | rareté | effet |
|---|---|---|
| `opportuniste` | R max 2 | pendant un événement, +20 % de dégâts et +30 % d'éclats |
| `curee` | E max 1 | les élites laissent un bonus au sol en mourant |

`curee` — réutilise `POWERUP_TYPES` et crée une priorité de cible que le jeu n'a
pas : aujourd'hui, tuer une élite ou un grunt ne change rien d'autre que l'XP.

### Récolte et exploration

| carte | rareté | effet |
|---|---|---|
| `prospecteur` | R max 2 | récolter un point rend 25 PV à toute l'équipe |
| `filon` | E max 1 | un point récolté sur trois laisse un second point à sa place |

*`sourcier` (+20 % de rendement) a été retirée : doublon de `Bourse` réécrite.*

### Coopération — le plus gros bloc, et c'est volontaire

| carte | rareté | effet | filtres |
|---|---|---|---|
| `cordee` | C max 4 | +4 % de dégâts par allié vivant à moins de 8 m | `minPlayers: 2` |
| `relais` | R max 2 | allié à terre → +30 % de dégâts et de vitesse jusqu'à relève | `minPlayers: 2` |
| `bouclier_partage` | R max 2 | 25 % du bouclier gagné va aussi à l'allié le plus proche | `minPlayers: 2` |
| `serment` | E max 1 | relever un allié donne aux deux +45 % de dégâts pendant 8 s | `minPlayers: 2` |
| `porte_voix` | E max 1 | tes bonus ramassés s'appliquent à l'équipe, à 60 % | `minPlayers: 2` |
| `phalange` | **L** max 1 | chaque allié à moins de 8 m donne à l'équipe −8 % de dégâts subis | `minPlayers: 2` |

`cordee` — *proche :* `Meute` (compte les **ennemis** proches). Symétrique exact
sur les alliés. Elle récompense de se regrouper, en tension directe avec
l'exploration : deux cartes du même catalogue qui tirent en sens opposés, c'est
ce qui fait une build.

`serment` — toutes les cartes de réanimation actuelles rendent le geste **plus
rapide** ; aucune ne le rend **payant**.

`phalange` — les neuf légendaires actuelles sont toutes individuelles sauf
`Vœu partagé`. **Seule légendaire ajoutée par le lot** — à insérer en fin de
`CARDS` (règle append-only, E-1).

### Esquive

| carte | rareté | effet |
|---|---|---|
| `contre_pied` | R max 2 | traverser un ennemi en esquivant le rend vulnérable 3 s |
| `sillage` | E max 1 | les trois tirs qui suivent une esquive sont des coups critiques |

Deux cartes existent sur cet axe : `Stimulant` (commune) et `Vif-argent`
(légendaire). Rien entre les deux.

### À part — l'appel du risque

**`appel_du_vide`** · épique max 1 · `teamUnique`
> +20 % d'ennemis simultanés pour toute la table, et +50 % d'éclats pour toi

Seule proposition qui touche la difficulté, et possible **uniquement si A est
fait** : sans plafond variable, elle n'a littéralement aucun effet.

*Précédent :* `Dette` — « la seule carte dont le coût se paie sur la jauge
commune… c'est assumé, et il se voit puisque la jauge est affichée à tout le
monde ». Même argument, même condition : l'effet doit être **visible à toute la
table**.

*Emprunt assumé :* le principe des malédictions de Halls of Torment — le seul
emprunt du lot qui apporte quelque chose que le jeu n'a pas, parce que la
difficulté y devient enfin un **paramètre**.

**Proposée, non recommandée au premier passage.** Deux cartes qui engagent le
groupe au lieu d'une, c'est le moment où le motif cesse d'être une exception.
