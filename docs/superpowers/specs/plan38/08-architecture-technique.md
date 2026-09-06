# ÉTAPE 5 — ARCHITECTURE TECHNIQUE

---

# 1. CINQ DÉFAUTS VIVANTS, TROUVÉS PENDANT L'AUDIT

Ils ne sont pas hypothétiques : ils jouent **aujourd'hui**, sur toute partie
lancée depuis `0.41.0`, et ils viennent tous de la même cause — sur une carte
composée `biomeIndex === BIOME_COMPOSE === -1`, et `biomeAt(-1)` replie sur
`BIOMES[0]`, **l'Usine**.

| # | endroit | ce qui se passe |
|---|---|---|
| 1 | `decor.js:57` `drawFond` | `biomeAt(-1).fond` est `undefined` → `fondDe` rend `null` → **aucun arrière-plan sur aucune carte composée**, Nébuleuse et Secteur compris |
| 2 | `decor.js:114` `drawBaies` + `:291-293` | même cause : **aucune baie**, et le repli `VITRAGE`/`VIE` sur `verre`/`vieEspace` ne sert jamais |
| 3 | `decor.js:1494` `AMBIANCE` | l'air de **l'Usine** est soufflé dans les cinq régions |
| 4 | `decor.js:1285` `contourDe` | tous les blocs prennent le liseré de **l'Usine**, y compris ceux de la Fonderie |
| 5 | `decor.js:1529` | `biomeAt(-1).key === "fonderie"` est **toujours faux** → la coulée ne dégage **jamais** sa chaleur sur une carte composée |

`drawAmer` fait, lui, la bonne chose (`lieuKeyAt(r.x, r.y)`) — la règle existe,
elle n'a simplement pas été appliquée partout.

**Ces cinq défauts disparaissent d'eux-mêmes** avec « une carte = un thème » :
`biomeIndex` redevient un index réel, `biomeAt(biomeIndex)` redevient vrai, et
tout ce qui peint la vue entière a le droit de le lire. C'est le premier argument
technique du plan : **la correction retire de la complexité au lieu d'en
ajouter.**

Même remarque pour `lumDir()`, qui porte aujourd'hui un commentaire entier
expliquant pourquoi la direction de lumière doit rester une propriété de la carte
et non de la région : avec un thème par carte, la tension n'existe plus.
Et pour `fondCache`, cache **à une seule entrée** : sur une carte composée
Nébuleuse + Secteur il se ferait jeter et recuire à chaque traversée de frontière
— une toile de `2200 × 1500` par recuisson. Avec un thème par carte, un seul fond
vit.

---

# 2. LA HIÉRARCHIE, EN CODE

```
THEME                       5, index reseau, append-only
 ├─ skin                    BIOME_SKIN  (palette de base, `dir`, `amb`, `k`)
 ├─ matiere de sol          TUILE + MACRO_TUILE + PORTE_MAILLE
 ├─ fond                    FOND + VITRAGE + VIE
 ├─ familles baties         BLOCS filtre par `lieu` + BLOC[theme][kind]
 ├─ catalogue de props      TABLE[theme]           (24 a 30 props)
 ├─ dangers dessines        DANGER[theme] + SOUFFLE[theme]
 ├─ profil emissif          LED[theme]
 ├─ enveloppe               les 4 axes de loi, `[min, max]`
 └─ BIOMES[theme]           10 a 13 entrees, index LOCAL
      ├─ key, nom, resume
      ├─ arrangements[]     2 a 4 `poser[]` + `bords[4]`   <- l ancien `OBSTACLES`
      ├─ familles[]         sous-ensemble des kinds du theme
      ├─ zones[]            2 a 4 listes de props            <- l ancien `ZONES`
      ├─ quartier{}         kind -> indice de zone           <- l ancien `QUARTIER`
      ├─ matieres[]         une primitive de trace par zone  <- l ancien `MATIERE`
      ├─ densite, echelle   scalaire + [base, etendue]
      ├─ dangers            { normal: [...], cauchemar: [...], echelle: {} }
      ├─ accent             delta de palette borne en LAB
      └─ amer               fonction de dessin du repere
```

**Ce qui est remarquable** : *toutes* ces tables existent déjà, à l'identique de
forme. Elles changent de **clé**, pas de nature. Le plan est un **reparentage**,
pas une réécriture — c'est ce qui le rend faisable.

## 2.1 La question du nom

Aujourd'hui `BIOMES` **est** la liste des thèmes, et `lieu` **est** le thème. Le
vocabulaire du code contredit le vocabulaire du jeu, et c'est ce qui a produit le
défaut de conception qu'on corrige.

**Recommandation : renommer, une fois, mécaniquement.**

| avant | après |
|---|---|
| `BIOMES` | `THEMES` |
| `biomeAt(i)` | `themeAt(i)` |
| `biomeIndex`, `biomeKey()` | `themeIndex`, `themeKey()` |
| `lieuAt` / `lieuKeyAt` / `skinAt` | `zoneAt` / `zoneKeyAt` / `skinAt` *(rend le BIOME)* |
| *(neuf)* | `BIOMES[themeKey] = [...]`, `biomeAt(theme, i)` |

Coût : ~15 fichiers, purement mécanique, entièrement couvert par `node --check`
et `npm run verif`. **L'ordre du tableau ne bouge pas**, donc la règle
append-only et les index réseau sont intacts. Bénéfice : plus jamais deux sens
pour un mot dans un dépôt qui se lit bien plus qu'il ne s'écrit.

Si le renommage est jugé trop coûteux, l'alternative est d'ajouter
`export const THEMES = BIOMES` et de nommer le nouveau niveau `AIRES`. C'est
moins bon : le mot « biome » resterait faux à l'endroit où on le lit le plus.

## 2.2 Les signatures qui changent

```js
// AVANT
lieuxDe(seed, cols, rows)                  // -> index de THEME par cellule
grilleVariantes(lieu, seed, cols, rows, lieux)
buildBiome(biomeIndex, diffIndex, seed, ...)   // biomeIndex peut valoir -1

// APRES
biomesDe(theme, seed, cols, rows)          // -> index de BIOME (local au theme)
grilleArrangements(theme, biomes, seed, cols, rows)
buildCarte(themeIndex, diffIndex, seed, ...)   // themeIndex est TOUJOURS reel
```

`buildCarte` rend, en plus de ce qu'il rend déjà :

```js
{ theme: themeIndex, key, nom,
  biomes,            // index de biome par cellule (jamais null : une carte en a toujours)
  arrangements,      // index d arrangement par cellule
  districts, cols, rows, cw, ch,
  obstacles, hazards, obstacleSurface, hazardSurface, hazardJetes }
```

`BIOME_COMPOSE` **disparaît**. Une carte a toujours un thème réel ; le tirage du
thème redevient l'affaire de `Room.drawBiome()`, qui retrouve sa règle
d'origine — « deux manches de suite ne montrent pas le même thème » — et son
forçage `BIOME=`. Sur le réseau, `msg.biome` porte toujours un index de thème :
**aucun champ ajouté, aucun champ retiré.**

## 2.3 `biomesDe` — le tirage des 5 biomes

Plus simple qu'aujourd'hui, parce que le pool est plus grand que le besoin :

```
nq = 3..6 quartiers    pool = 10..13 biomes du theme
```

Mélanger le pool sur la graine, parcourir les quartiers dans l'ordre, prendre le
premier biome non pris **et** non porté par un voisin déjà posé. Le repli sur le
pool complet ne peut jamais servir (le pool est toujours plus grand que `nq`),
mais on le garde : c'est l'idiome du dépôt et il coûte une ligne.

La bijection reste garantie, donc `verifierCarte` garde ses trois questions —
tous les biomes attendus présents, chacun d'un seul tenant, pavage valide aux
frontières — et il devient **plus** solide, parce que deux biomes voisins
partagent maintenant un vocabulaire bâti, donc leurs arêtes s'accordent mieux.

## 2.4 Les arrangements, par cellule

`grilleVariantes` devient `grilleArrangements` et change une seule chose : le
pool de variantes est celui du **biome de la cellule**, pas du thème. Toute la
mécanique Wang (`bordsDe`, `bordsAccordes`, la réparation locale, les miroirs
`mx`/`my`) est reconduite telle quelle.

Le second découpage en quartiers (`districtsDe(seed ^ 0x51ed270b)`), introduit
par le plan 41 pour qu'une région de seize cellules ne pose pas seize fois le
même écran, **reste utile** : il choisit maintenant l'arrangement à l'intérieur
d'un biome, ce qui est précisément son rôle.

## 2.5 Le pipeline de composition, du monde au détail

```
THEME            (la carte entiere)
  v
BIOME            (le quartier, ~16 cellules)          districtsDe + biomesDe
  v
ARRANGEMENT      (la cellule, une vue)               grilleArrangements + Wang
  v
BATI             (les blocs)                          poser[] + miroir + budget
  v
ANCRE            (le quartier de props le plus proche) sonder() + PORTEE_QUARTIER
  v
PROPS SECONDAIRES (le semis par zone)                 ZONES[biome] + FUITE
  v
GRAPPE           (les satellites d une ancre)         GRAPPE[prop]   <- neuf
  v
TRACES           (la marque au sol, par cellule)      MATIERE[biome]
```

Sept niveaux, dont **cinq existent** et deux sont neufs (le biome comme palier,
la grappe). Chaque niveau ne connaît que celui du dessus.

---

# 3. IMPACTS GAMEPLAY — la liste, point par point

| point | impact | garde |
|---|---|---|
| **pathfinding** | plus de petits blocs (trames de poteaux) → plus de cases fermées sur la grille de 40 px | `coeurTraversable` sur **50 graines** au lieu de 3 ; `PASSAGE_MIN` respecté par construction dans chaque `poser` |
| **circulation des ennemis** | les couloirs (U05, U08, R06, S05) canalisent la horde en file | `_navChamp` est **par joueur**, pas par ennemi : le coût ne suit pas la population. Les couloirs le rendent même plus rapide (moins de gradients concurrents) |
| **circulation des joueurs** | les biomes fermés réduisent le kite | aucun biome n'a d'impasse ; chaque poche a ≥ 2 sorties, chaque enceinte ≥ 4 brèches |
| **lignes de vue** | fortement variables, c'est le but | l'axe `ouverture` de la matrice le mesure ; aucune arme ne devient inutilisable sur plus d'un biome à la fois |
| **armes à distance** | favorisées sur DEGAGE/LINEAIRE, punies sur COULOIRS/POCHES | la carte porte **5** biomes : aucune manche n'est entièrement d'un type |
| **armes de mêlée** | l'inverse exact | idem |
| **projectiles** | plus d'obstacles = plus d'impacts précoces | rien à changer : la collision reste l'AABB |
| **explosions** | `_blastPush` inchangé ; `_dansUnTrou` inchangé | les nouveaux `hors` (plan haut) n'ont **pas** de collider, donc ils n'arrêtent rien |
| **zones** | `_zoneEcarteAbris` doit voir les nouveaux blocs | il lit la liste d'obstacles, pas les familles : rien à faire |
| **horde** | les biomes denses concentrent | `enemyCap` inchangé ; le risque est le bouchon, couvert par la garde 50 graines |
| **boss** | `biomeNu()` vide obstacles et dangers pendant le boss | **le biome ne disparaît pas visuellement** : le semis et le repère lisent `obstaclesDuLieu()` (la géométrie de la manche), pas la liste active. Comportement déjà correct, à préserver |
| **multijoueur** | quatre joueurs dans quatre biomes différents | tout est déjà par point (`skinAt`, `zoneKeyAt`) ; la seule constante de carte est la lumière, et elle **doit** l'être |
| **performances** | voir §4 | |

## 3.1 Les trois biomes à mesurer avant de les garder

Ce sont ceux qui introduisent une figure que le jeu n'a nulle part, donc ceux qui
peuvent produire un bouchon sans qu'un vérificateur le voie :

1. **U08 le traitement** — passages calibrés entre bacs. Mesure : temps de
   premier contact, joueur au centre, horde en anneau à 800 px, 20 calages de
   grille. Rejeter si un calage sur cinq dépasse 60 s.
2. **S08 la station** — la ligne de tourniquets. Même protocole. Six passages
   minimum sur la largeur.
3. **R12 le dépôt de fûts** — la pile détruite qui **pose** une flaque toxique.
   Mesure : parties réelles, pas banc. Rejeter si l'équipe se blesse sans
   comprendre — c'est le seul critère qui compte et il ne se mesure pas seul.

## 3.2 Ce qui ne doit pas arriver

- **Un obstacle plus grand qu'une cellule.** N07 (la cale sèche) le demande.
  `poser` est fractionnaire **dans** une cellule ; un objet inter-cellules casse
  le miroir, le budget de surface et le tirage d'arrangement. **Solution retenue :
  trois blocs bord à bord dans la même table**, ce que la Friche fait déjà avec
  ses tronçons de mur (`0.150` remplaçant deux entrées qui se recouvraient).
  L'extension du modèle est refusée : elle coûterait plus que ce qu'elle rend.
- **Un obstacle traversable visuellement.** N09 (verrière) et U07 (grillage) le
  frôlent. Règle : ce qui bloque est **opaque à hauteur de collider**. La
  transparence est au-dessus, jamais au niveau du corps.
- **Une ouverture qui ne mène nulle part.** S10 (garde-corps sur le vide) le fait
  exprès. Elle est admise **à condition** d'être marquée au sol, franchement, à
  hauteur de collider.

---

# 4. IMPACTS TECHNIQUES

## 4.1 Réseau — **zéro octet**

`buildCarte` est déterministe et rejoué des deux côtés sur `(theme, diff, seed)`.
`biomes`, `arrangements`, `districts` sortent avec la carte et **ne circulent
pas**. Le salon envoie déjà `biome` (index de thème) : rien à ajouter, rien à
retirer, aucun instantané touché, aucune clé nouvelle.

## 4.2 Coût de construction

`buildCarte` fait aujourd'hui ~25 ms sur 81 cellules. Le nombre de `poser` par
cellule ne monte pas (les budgets de surface plafonnent), donc le coût est
stable. Ce qui monte est le nombre de **tables** en mémoire : 61 biomes × ~3
arrangements × ~10 entrées = ~1800 lignes de données statiques. Négligeable.

## 4.3 Le chemin chaud du semis

`sonder(x, y, quartiers)` balaie **toute** la liste d'obstacles de l'arène pour
chaque prop candidat. Aujourd'hui : ~750 obstacles × ~100 candidats à chaque
changement de fenêtre = 75 000 itérations. Si le nombre d'obstacles double, ça
double.

**Correctif recommandé, indépendant du reste** : mettre les obstacles en seaux de
cellule, exactement comme `compteSuperpositions` le fait déjà dans `biomes.js`.
`sonder` ne regarde alors que les 9 seaux autour du point. C'est un gain immédiat
même sans le plan 38.

## 4.4 Les caches

| cache | taille | état après le plan |
|---|---|---|
| `material.js` `cache` (tuiles) | `CACHE_MAX = 5` par famille | **inchangé** : le sol reste au thème, seuls `USURE` et l'accent entrent dans la clé, donc au plus 5 tuiles vivantes — exactement le dimensionnement actuel |
| `material.js` `fondCache` | **1 entrée** | **assaini** : un thème par carte = un fond, plus de recuisson à la frontière |
| `decor.js` `amerCache` | **1 entrée** | **à porter à 6** : cinq repères vivants au lieu d'un |
| `props.js` `cle` (fenêtre) | 1 | inchangé |
| `stage.js` `parLieu` (props) | Map par clé | inchangé, ≤ 5 entrées |

`amerCache` est le seul changement de dimensionnement du plan.

## 4.5 Le coût des vérificateurs

`npm run verif` doit rester sous 3 s. Aujourd'hui `verifierCarte` tourne sur 3
graines × 3 modes ; le plan demande 50 graines pour la traversabilité, sur 5
thèmes. À 25 ms la carte, `50 × 3 × 5 = 750` constructions = **19 s**. Trop.

**Découpage proposé** :

| vérificateur | mode rapide | mode `--tout` |
|---|---|---|
| planchers / enveloppes / accents | table seule, **gratuit** | idem |
| arêtes Wang | 50 graines, sans construire d'arène (déjà le cas) | idem |
| superpositions de blocs | 3 graines | 50 graines |
| **traversabilité du cœur** | **8 graines × 3 modes × 1 thème tournant** | **50 × 3 × 5** |
| dangers sur obstacle | 3 graines | 50 graines |

« Un thème tournant » = le mode rapide teste un thème différent à chaque
exécution, choisi sur l'horloge ou sur le hash du commit. En cinq exécutions les
cinq sont passés, et le coût reste à un cinquième. C'est le compromis honnête :
le rapide **échantillonne**, le `--tout` **prouve**.

## 4.6 Déterminisme et rejouabilité

Contrat inchangé et vérifié par `verifierDeterminisme` :

- même `(theme, diff, seed)` → même arène, au pixel ;
- graines différentes → composition des 5 biomes différente (792 possibilités),
  arrangements différents, groupes de props différents, repères déplacés,
  densité de décoration différente ;
- **jamais** : une règle fondamentale de biome enfreinte. Les tables sont fixes,
  la graine ne choisit que **parmi** ce qu'elles autorisent.

Ce qu'une graine a le droit de bouger : quels 5 biomes, où, quel arrangement par
cellule, la position du repère, le tirage des props et des grappes, le tremblement
de cellule (Friche), la météo.
Ce qu'une graine n'a **pas** le droit de bouger : le thème (il est tiré à part et
annoncé), le vocabulaire bâti d'un biome, sa densité, son accent, ses dangers.

---

# 5. CE QUI RESTE À DÉCIDER

Trois choix ne se prennent pas depuis le code, et ils changent le travail :

1. **Le renommage `BIOMES` → `THEMES`.** Recommandé (§2.1). Mécanique, sûr,
   définitif. Le refuser laisse un mot pour deux sens.
2. **Le nombre de biomes par carte.** `districtsDe` en rend 3 à 6. Cinq est le
   nombre actuel et il est bon : quatre écrans de côté par biome. Le passer à 6
   ou 7 raccourcirait chaque zone et diluerait l'identité qu'on vient de créer.
   **Recommandation : ne pas y toucher.**
3. **S09 « les cages ».** La matrice pourrait la déclarer trop proche de S05
   (`06-matrice-variete.md` §5). Si c'est le cas, elle devient un **accent** de
   S05 et un biome de remplacement est à choisir — le plus évident étant un
   quartier corporatif propre, qui manque au Secteur.
