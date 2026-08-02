# Lot 6 — Correctifs, identité des boss, et nouveaux axes de build

Analyse faite sur l'archive du 1er août : 23 000 lignes, WebGL en place,
`sprites.js`, `hud.js`, `icons.js` et les CSS livrés.

---

# Partie 1 — Deux bugs avec cause identifiée

## 1.1 La vague se termine avant que l'arène soit vide

### Ce n'est pas la logique serveur

Elle est correcte :

```js
// _waveTick(), phase 1 (nettoyage)
if (this.enemies.length === 0 && !this.boss) { this._endWave(); return; }
```

### C'est un problème d'horloge côté client

Le client affiche le monde avec **110 ms de retard** (`INTERP_MS`), parce qu'il
interpole entre deux instantanés. Mais le message `cards` de fin de vague est
appliqué **immédiatement** à la réception :

```js
// client.js, ligne ~364
case "cards":
  cardsState = { ... };      // aucun report
```

Donc au moment où le serveur constate l'arène vide et envoie `cards`, le client
est encore en train de dessiner l'état d'il y a 110 ms — où deux ou trois
ennemis vivent encore. **L'écran de cartes s'ouvre par-dessus des ennemis
toujours visibles.**

C'est exactement la sensation décrite. Et ce n'est pas systématique : ça ne se
voit que si les derniers ennemis meurent groupés, donc de façon irrégulière.

### La preuve que le correctif est connu

Le même piège a déjà été traité pour les annonces :

```js
// client.js, ligne 1836
alertQueue.push({ msg, at: performance.now() + INTERP_MS });
```

### Le correctif

Reporter de `INTERP_MS` **toutes les transitions d'état de manche** :
`cards`, `roundEnd`, `roundAbort`, `round`, et le bandeau de vague. Le plus
propre est une file unique, sur le modèle de `alertQueue`, plutôt qu'un
`setTimeout` par message.

**Règle à ajouter à `CLAUDE.md`** : tout message ponctuel qui décrit un
changement du monde se consomme depuis la timeline interpolée, jamais à la
réception. Les seules exceptions sont les messages hors-monde — salon, choix de
classe, tableau des scores.

## 1.2 On ne peut plus changer de classe entre deux manches

### La cause

```js
case "pickClass": {
  if (client.clsLocked) break;
```

`clsLocked` est posé au lancement de la première manche et n'est jamais levé.

### Pourquoi c'est à corriger

Le verrouillage de session venait d'une justification qui **n'existe plus** :
protéger l'investissement en cartes de classe. Or `startRound()` crée un
`new GameState()` à chaque manche, donc **les cartes ne survivent pas d'une
manche à l'autre**. Il n'y a plus rien à protéger.

Le verrou n'a donc de sens que **pendant** une manche — pour éviter qu'on change
de classe au milieu d'un combat.

### Le correctif

- Poser `clsLocked` à l'entrée en manche, **le lever à `endRound` et à
  `abortRound`**.
- Refuser tout changement hors du salon, ce que le code fait déjà par ailleurs.
- Libérer l'emplacement unique au moment du déverrouillage, pour que quelqu'un
  d'autre puisse prendre le tank à la manche suivante.

Point de vigilance : deux joueurs qui visent le même emplacement unique au
retour au salon. La validation existante (`takenClasses()`) le gère déjà, à
condition que la libération soit faite **avant** de diffuser le salon.

---

# Partie 2 — Le Rempart

## Ce qui ne va pas

```js
function tankClassPath(k) {
  // hexagone 14 x 12.5
  // deux plaques laterales : lineTo(-3, ±13) -> (4+move, ±16.5) -> (9, ±10)
  // canon court : (13,-5) -> (21,-4.5) -> (21,4.5) -> (13,5)
}
```

Trois défauts qui se cumulent :

**Il n'est pas plus imposant que les autres.** Hexagone de 14 × 12,5 contre 13
de rayon pour le soigneur. Un tank doit se lire comme **massif** — c'est son
identité entière, et la taille est le signal le plus rapide.

**Les plaques latérales lisent comme des pinces.** Elles partent de l'arrière
(`-3`) et pointent vers l'avant à ±16,5 : la silhouette évoque un crabe, pas un
bouclier.

**Le canon est aussi long que celui du tireur** (21 contre 21), alors que la
fiche de classe annonce « canon court et large ».

## La refonte

- **Corps porté à 17 × 15**, contre 14 × 12,5. Nettement le plus gros des trois.
- **Plaques déplacées à l'avant**, formant un arc de bouclier frontal plutôt que
  deux appendices arrière. C'est ce que le joueur doit lire : un truc qui
  protège ce qui est devant lui.
- **Canon raccourci à 17**, et élargi à ±6.
- **Contour à 3,5 px** au lieu de 3 — le poids du trait participe à la masse.
- **Ancrage au sol** : une ombre portée plus marquée que les deux autres classes.

Test de validation : la planche des silhouettes en noir uni. Le Rempart doit
être identifiable **par sa masse seule**, sans détail interne.

---

# Partie 3 — Les cinq boss se ressemblent

## Le constat

`drawBoss()` est **une seule routine** : couronne de dix pointes en rotation,
noyau à huit faces, œil central. Le seul écart entre boss est la couleur des
Jumeaux.

Or le roster a été conçu autour de **cinq verbes différents** — positionnement,
gestion de cibles, mouvement, cohésion, séparation. Mécaniquement ils n'ont rien
à voir ; visuellement ils sont interchangeables. C'est le plus gros écart
identité/contenu du jeu aujourd'hui.

## Cinq silhouettes

Chacune doit passer le test du noir uni, et surtout **annoncer son verbe**.

**Le Ravageur — positionnement.** L'actuel, conservé. Bloc compact, couronne de
pointes, lourd. Il est la référence.

**La Matriarche — gestion de cibles.** Abdomen segmenté et bas sur le sol,
quatre appendices courts, et **des poches d'œufs qui pulsent** dont le nombre
décroît à mesure qu'elle perd ses barres. Le joueur doit comprendre au premier
regard que la menace vient de ce qu'elle produit, pas d'elle.

**Le Métronome — mouvement.** Purement géométrique, **aucun membre** : trois
anneaux concentriques désaxés qui tournent à des vitesses différentes, et un
noyau vide au centre. C'est le seul boss qui doit paraître mécanique — cohérent
avec le fait qu'il ne frappe jamais, il occupe l'espace.

**L'Oracle — cohésion.** Un grand œil unique entouré d'anneaux flottants
séparés du corps, avec des glyphes qui s'allument selon la mécanique en cours.
Les anneaux servent aussi de télégraphe : ils s'orientent vers ce qui va se
passer.

**Les Jumeaux — séparation.** Deux **demi-formes complémentaires**, chacune
incomplète : l'une porte la moitié gauche d'un motif, l'autre la droite. Quand
ils se rapprochent, les moitiés s'alignent visuellement — ce qui rend leur
mécanique de soin mutuel lisible sans lire la barre.

## Ce qui va avec

- **Une couleur dominante par boss**, distincte des couleurs d'ennemis
  normaux, pour que la barre de vie en haut et la créature s'accordent.
- **Une animation d'inactivité propre** : la Matriarche pulse, le Métronome
  tourne, l'Oracle dérive, le Ravageur respire, les Jumeaux oscillent en
  opposition de phase.
- **Une posture d'annonce par boss** : le corps se contracte avant une attaque.
  Le plan précédent la prévoyait pour les monstres ; c'est sur le boss qu'elle
  compte le plus, puisque c'est là qu'on lit les mécaniques.

---

# Partie 4 — Pousser les effets maintenant qu'on est en WebGL

## 4.1 Ce que la bascule a débloqué et qui n'est pas encore utilisé

Le mélange additif et la teinte par sprite sont désormais gratuits. Les zones et
attaques n'en profitent pas encore.

**Télégraphes** — aujourd'hui un contour et un arc de progression. À ajouter :
une texture de sol qui se craquelle progressivement, des particules qui montent
depuis la zone, et une intensité qui croît de façon non linéaire (lente puis
brutale sur les 300 dernières ms). C'est ce qui fait qu'on ressent l'échéance
au lieu de lire une jauge.

**Résolutions** — un éclair, une onde de choc annulaire en additif, des débris
projetés, et une décoloration brève du sol qui persiste 2 s.

**Zones persistantes** — une texture qui défile lentement à l'intérieur, plutôt
qu'un remplissage uni. C'est le seul moyen de distinguer d'un coup d'œil
« active » de « en cours d'annonce », même à la périphérie du regard.

**Projectiles** — traînée additive, lueur proportionnelle aux dégâts. Les balles
d'un joueur avec Balles lourdes doivent se voir plus que celles d'un joueur sans.

**Morts** — actuellement discrètes. Éclat, fragments à la couleur du type, et
une brève onde additive pour les élites.

## 4.2 Sprites libres de droit : lesquels, et lesquels surtout pas

J'ai vérifié les sources. **Kenney** est la référence : <cite index="7-1">plus de 30 000 assets, tous en CC0 (domaine public), utilisables librement y compris commercialement</cite>, et <cite index="10-1">aucune attribution n'est requise, bien qu'elle soit appréciée</cite>.

**À importer — les particules et effets.** Le *Particle Pack* (80+ sprites) et
les *Smoke particle assets* de Kenney sont **neutres stylistiquement** : des
volutes, étincelles, éclats, anneaux. Combinés au mélange additif, ils
transforment explosions, télégraphes et morts **sans toucher au style des
monstres**. C'est l'import à rendement maximal et à risque nul.

**À ne pas importer — les personnages et monstres.** Le *Top-down Shooter* de
Kenney (580 assets, CC0) est du vectoriel plat représentant des humains armés.
Ça contredit frontalement la direction retenue — l'arène est une machine, les
monstres sont des intrus organiques — et ça jetterait les 874 lignes de
`sprites.js` et sa recette en six couches, qui est justement ce qui donne au jeu
son identité propre.

Mélanger des sprites d'auteurs différents est d'ailleurs le moyen le plus sûr
de perdre la cohérence que tu cherches à gagner.

**Contrainte pratique** : je ne peux pas télécharger les fichiers — mon accès
réseau est limité à une liste blanche de dépôts. Claude Code, qui tourne chez
toi, le peut. Les paquets à récupérer : `kenney.nl/assets/particle-pack` et
`kenney.nl/assets/smoke-particles`.

**Intégration** : les particules rejoignent l'atlas existant, avec la gouttière
de 2 px déjà prévue. Elles ne changent rien au pipeline, seulement son contenu.

---

# Partie 5 — Les cartes : ce qui manque

## 5.1 Un déséquilibre du catalogue

77 cartes réparties ainsi :

| rareté | cartes |
|---|---|
| commune | **13** |
| rare | 27 |
| épique | 25 |
| légendaire | 12 |

**Les communes sortent six fois plus souvent que les rares et sont deux fois
moins nombreuses.** Sur une partie à 15-20 tirages, le joueur voit les mêmes
treize communes en boucle, dont plusieurs sont plafonnées et donc retirées du
pool en cours de route.

C'est le premier correctif à faire, avant même d'ajouter des axes : **il faut au
moins doubler le nombre de communes.** Les propositions ci-dessous en ajoutent
huit, ce qui n'est probablement pas encore assez.

## 5.2 Cinq axes de build absents

Vérification faite sur les clés de `mods` : il n'existe **aucun** système de
coup critique, **aucun** multiplicateur global de rayon, **aucune** réduction de
recharge générique, **aucun** seuil d'exécution, et **aucune** carte de
conversion d'une statistique en une autre.

Ce sont les cinq piliers classiques du genre, et chacun ouvre une famille
entière.

### A. Le critique — le manque le plus important

Base : 5 % de chance, ×2 dégâts. Les critiques s'affichent en ambre et plus gros
dans les chiffres de dégâts, ce qui donne enfin une raison de les regarder.

| id | nom | rareté | effet |
|---|---|---|---|
| `precision` | Précision | commune | +6 % de chance critique |
| `mire` | Mire | rare | +12 % de chance critique |
| `talon_faible` | Talon faible | rare | +40 % de dégâts critiques |
| `oeil_de_faucon` | Œil de faucon | épique | +20 % de chance et +50 % de dégâts critiques |
| `sentence_capitale` | Sentence capitale | légendaire | les critiques perforent et appliquent Vulnérabilité |

C'est l'axe le plus rentable parce qu'il est **multiplicatif** : il rend
intéressantes toutes les cartes de dégâts déjà présentes au lieu de les
concurrencer.

### B. Le rayon — une clé, un effet partout

Une seule clé `areaMul`, appliquée à la bombe, la nova, le pulsar, l'onde de
mort, le givre, le rempart, la vague de soin, la contre-attaque.

| id | nom | rareté | effet |
|---|---|---|---|
| `expansion` | Expansion | commune | +8 % de rayon sur tous tes effets |
| `deflagration` | Déflagration | rare | +20 % de rayon |
| `singularite` | Singularité | épique | +35 % de rayon, et tes zones attirent les ennemis vers leur centre |

Excellent rapport travail/effet : une clé, et **une quinzaine de cartes
existantes deviennent meilleures**. C'est exactement le genre de carte qui crée
des synergies au lieu d'additionner des pourcentages.

### C. La recharge

| id | nom | rareté | effet |
|---|---|---|---|
| `condensateur` | Condensateur | commune | −7 % de recharge des compétences |
| `surtension` | Surtension | rare | −15 % de recharge |
| `flux_continu` | Flux continu | épique | −25 %, et chaque kill retire 0,1 s aux recharges |

`flux_continu` fait dépendre les compétences du rythme de la vague, ce qui les
lie enfin au reste du jeu.

### D. L'exécution

| id | nom | rareté | effet |
|---|---|---|---|
| `achevement` | Achèvement | rare | les ennemis sous 12 % de PV meurent instantanément |
| `moisson` | Moisson | épique | seuil à 20 %, et chaque exécution rend 1 PV |

Répond directement à la sensation d'ennemis-éponges en fin de partie, et se
marie avec les dégâts de zone qui laissent des survivants à bas PV.

### E. La conversion — l'identité de build la plus forte

| id | nom | rareté | effet |
|---|---|---|---|
| `blindage_offensif` | Blindage offensif | épique | 15 % de tes PV max s'ajoutent à tes dégâts |
| `fureur_defensive` | Fureur défensive | épique | 10 % de tes dégâts s'ajoutent à tes PV max |
| `pacte_de_fer` | Pacte de fer | légendaire | ton bouclier ne se régénère plus, mais tes dégâts montent de 4 % par point de bouclier maximum |

Ces cartes règlent un problème signalé dès la première spécification : **une
carte défensive donne l'impression d'un tour perdu** quand les autres prennent
des dégâts. Avec la conversion, empiler du PV devient une stratégie offensive
assumée.

### F. Élan et momentum

| id | nom | rareté | effet |
|---|---|---|---|
| `elan` | Élan | commune | +1 % de dégâts par seconde sans être touché, max +25 %, remis à zéro au coup |
| `meute` | Meute | rare | +3 % de dégâts par ennemi à moins de 8 m, max +30 % |
| `carnage` | Carnage | rare | chaque kill donne +1 % de dégâts pendant 4 s, cumulable 30 fois |
| `adrenaline` | Adrénaline | rare | +25 % de cadence sous 50 % de PV |
| `dernier_souffle` | Dernier souffle | épique | +80 % de dégâts sous 25 % de PV |

`meute` est celle qui change le plus la façon de jouer : elle récompense le fait
de rester au contact, alors que tout le reste du jeu pousse à reculer.

### G. Communes de remplissage

Pour combler le déficit, en plus de `precision`, `expansion`, `condensateur` et
`elan` :

| id | nom | effet |
|---|---|---|
| `lest` | Lest | +5 % de dégâts et +5 % de PV max |
| `rodage` | Rodage | −5 % de recharge et +5 % de vitesse |
| `chargeur_long` | Chargeur long | +10 % de portée et +8 % de vitesse des balles |
| `ferraille` | Ferraille | +12 % de score et +1 PV par kill |

Soit **huit communes ajoutées**, portant le total à 21 pour 27 rares. Toujours
pas idéal, mais bien plus tenable.

## 5.3 Builds que ça rend possibles

- **Critique et zone** : `oeil_de_faucon` + `singularite` + `bombe_fragmentation`
  — chaque explosion devient un tapis de critiques.
- **Forteresse offensive** : `constitution` + `titane` + `blindage_offensif` +
  `fureur_defensive` — les deux conversions se nourrissent l'une l'autre.
- **Corps à corps** : `meute` + `orbiteurs` + `givre` + `represailles` +
  `dernier_souffle` — on se plante dans le tas et on ne recule plus.
- **Exécuteur** : `achevement` + `onde` (onde de mort) + `carnage` — chaque
  exécution en déclenche d'autres.
- **Cycle de compétences** : `flux_continu` + `bombe_double` +
  `surcharge_longue` — la bombe redevient l'arme principale.

---

# Partie 6 — Ordre et vérifications

## Ordre proposé

1. **Report des transitions de manche** (1.1) — un défaut visible à chaque vague.
2. **Déverrouillage de classe** (1.2) — trois lignes.
3. **Communes manquantes** (5.3 G) — corrige le pool avant d'ajouter des axes.
4. **Critique et rayon** (5.2 A et B) — les deux axes à plus fort rendement.
5. **Silhouette du Rempart** (2).
6. **Silhouettes des cinq boss** (3) — le plus gros chantier visuel.
7. **Particules Kenney et effets additifs** (4).
8. **Le reste des axes de cartes** (5.2 C à F).

## Mesures

| mesure | attendu |
|---|---|
| écart entre fin de vague serveur et fermeture visuelle | nul à l'œil |
| communes distinctes vues sur une partie | supérieur à 15 |
| chance critique moyenne en fin de partie | 25 à 45 % sur une build orientée |
| écart de dégâts entre build critique et build brute | inférieur à 30 % |
| planche des silhouettes en noir uni | cinq boss et trois classes distinguables |

## Critères d'acceptation

- L'écran de cartes ne s'ouvre jamais alors que des ennemis sont encore visibles.
- On peut changer de classe au salon entre deux manches, emplacements uniques
  respectés.
- Aucune carte de conversion ne produit de boucle de rétroaction infinie —
  `blindage_offensif` et `fureur_defensive` se calculent sur les valeurs **de
  base**, pas sur les valeurs déjà modifiées par l'autre.
- Le Rempart est reconnaissable à sa masse seule.
- Les cinq boss sont distinguables en silhouette.
