# Plan unique — moteur de rendu et identité visuelle

Ce document remplace le lot 4 du plan v2 et absorbe le lot 3. Il couvre
l'architecture de rendu, la direction artistique, les sprites, l'animation,
l'arène, le HUD et les menus.

Les lots 1 (corrections) et 2 (économie de progression) du plan v2 restent
valides et indépendants.

---

# Partie A — Architecture de rendu

## A1. La ligne de partage : monde ou écran

La question n'est pas « canvas ou CSS » mais **où vit l'élément**.

| couche | contenu | technologie |
|---|---|---|
| **Monde** | entités, projectiles, zones, sol, particules | canvas |
| **Écran** | HUD, barres, recharges, bandeaux, vignettes, chiffres de dégâts | DOM + CSS |
| **Menus** | salon, cartes, bilan, chargement | DOM + CSS |

**Pourquoi le monde reste au canvas** : 220 ennemis repositionnés à chaque
image, ce sont 220 couches composées en DOM, chacune avec son coût mémoire GPU,
et 220 écritures de `style.transform` par image. Le canvas est fait pour ça.

**Pourquoi l'écran passe en DOM** : une recharge de compétence en
`conic-gradient`, une barre de vie avec `transition`, un voile rouge en
`opacity`, c'est trois lignes de CSS contre trente au canvas — et c'est le
compositeur qui travaille, pas la boucle de jeu.

Deux conséquences agréables tombent de ce découpage :

- **Le tressaillement d'écran devient un `transform` CSS sur l'élément canvas.**
  Le problème « il faut séparer les passes pour que le HUD ne tremble pas »
  disparaît : le HUD est un frère du canvas, pas son contenu.
- **Les chiffres de dégâts peuvent être des éléments DOM.** Plafonnés à 40, ils
  récupèrent gratuitement l'assouplissement, le contour de texte et le fondu.
  Seul coût : la conversion monde → écran, symétrique de celle déjà faite pour
  la souris.

## A2. Densité de pixels native

### Le défaut

Le canvas a une mémoire fixe de 1600 × 900 que le CSS étire. Sur un écran 1440p
ou 4K, tout est **agrandi** : sprites flous, texte flou. C'est la même cause
racine que le HUD illisible, vue sous un autre angle — et aucun ajustement de
taille de police ne la corrige.

### Le correctif

```js
function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);   // plafonne a 2
  const rect = cv.getBoundingClientRect();
  cv.width  = Math.round(rect.width  * dpr);
  cv.height = Math.round(rect.height * dpr);
  renderScale = cv.width / CFG.ARENA_W;
  ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);
}
```

Les coordonnées monde restent en 1600 × 900, **aucune ligne de logique de rendu
ne change**, et tout devient net. Le plafond à 2 est délibéré : au-delà, on
quadruple le coût de remplissage pour un gain invisible.

Les atlas doivent être générés au même facteur — raison de plus de les
construire au chargement plutôt que de les figer.

## A3. Atlas d'animation généré au chargement

`buildSprites()` fait déjà la moitié du travail : chaque type est rendu une fois
dans un canvas hors écran. L'extension est directe — **N images par type dans un
atlas unique**, puis chaque image de jeu n'est plus qu'un `drawImage` avec un
rectangle source, l'opération la moins chère qui existe.

### La règle qui divise le budget par deux

**Ne pas stocker en image ce qu'une transformation peut faire.**

| effet | moyen | coût |
|---|---|---|
| respiration, pulsation | `ctx.scale` | nul |
| écrasement au déplacement | `ctx.scale` non uniforme | nul |
| orientation | `ctx.rotate` | nul |
| recul au tir | translation | nul |
| flash blanc de dégât | `globalCompositeOperation` | nul |
| élite | échelle 1,3 + contour tracé | nul |
| **membres, mandibules, pattes** | **image d'atlas** | 1 image |
| **télégraphe d'attaque** | **image d'atlas** | 1 image |
| **étapes de mort** | **image d'atlas** | 1 image |

C'est le point le plus important de cette partie : la tentation est de générer
huit images de cycle de marche par type, alors que la respiration et
l'écrasement se font gratuitement au tracé. On ne paie que les changements de
**forme**.

### Budget

| | images |
|---|---|
| 5 types × (4 formes + 2 télégraphes + 3 morts) | 45 |
| 3 classes × 4 formes | 12 |
| boss × 8 | 8 |
| **total** | **65** |

À 192 × 192 px en RGBA (soit 96 px de côté logique à `dpr` 2) : **9,6 Mo**.
Génération au chargement : quelques dizaines de millisecondes.

Contraintes :

- **Un seul atlas**, pas 65 canvas séparés — moins de changements de texture.
- **Rester sous 4096 × 4096**, taille sûre partout. 65 images de 192 px tiennent
  dans 1536 × 1728.
- **Aucune rotation pré-calculée.** Générer 16 angles multiplierait l'atlas par
  16 pour économiser une transformation déjà quasi gratuite.

## A4. WebGL : pas maintenant, mais on prépare le terrain

### Pourquoi pas maintenant

Ce n'est **pas** une question de performance. L'atlas mettra le jeu très
au-dessus de 60 images par seconde, et le canvas 2D est accéléré
matériellement depuis longtemps — l'écart avec WebGL ne se creuse vraiment
qu'au-delà de quelques milliers de sprites par image, alors qu'on en dessine
environ 800.

La contrainte réelle est le **style d'écriture du code de rendu**. Relevé sur
`client.js` dans son état actuel :

| primitive | appels |
|---|---|
| `beginPath` | 107 |
| `arc` | 85 |
| `stroke` | 73 |
| `fillText` | 46 |
| `fill` | 41 |
| `lineTo` / `moveTo` | 73 |
| `fillRect` | 36 |
| `setLineDash` | 14 |
| **`drawImage`** | **2** |

Presque tout est dessiné en tracé vectoriel. Or **WebGL n'a aucune de ces
primitives** : ni `arc`, ni `stroke`, ni pointillés, ni texte. Il ne sait faire
que des triangles texturés. Migrer aujourd'hui reviendrait à réécrire environ
cinq cents appels répartis dans vingt-neuf fonctions.

### Ce qui déclenchera la bascule

Ce ne sera pas la fluidité mais la **capacité** : lueurs additives sur des
centaines de sprites, distorsion, éclairage dynamique, teinte par sprite
gratuite. Des effets que le canvas 2D ne sait pas produire, quelle que soit sa
vitesse.

L'atlas n'est donc pas un détour : **c'en est la condition**. Une fois les
entités devenues des rectangles d'atlas, la couche entité est exactement ce que
WebGL sait faire, et la basculer coûte quelques centaines de lignes au lieu
d'une réécriture.

### L'architecture cible : trois couches empilées

Le jour venu, on ne migre pas tout — les couches cohabitent :

```
DOM ───────────── HUD, cartes, menus, chiffres de degats
canvas 2D ─────── texte monde, barres, zones, pointilles, telegraphes
canvas WebGL ──── entites, projectiles, particules, lueurs
```

Seule la couche chaude bascule, celle qui est déjà en sprites. Les 46 `fillText`
et les 14 pointillés restent en 2D, où ils sont naturels. Et si le contexte
WebGL se perd — cela arrive réellement : bascule de GPU, veille, redémarrage de
pilote — on dégrade vers la couche 2D au lieu d'afficher un écran noir.

## A5. Préparer la bascule : le point de passage unique

**À faire dès maintenant, coût nul aujourd'hui, travail futur divisé par trois.**

Tout le dessin d'entité doit passer par **une seule fonction**, et par aucune
autre :

```js
// public/sprites.js
drawSprite(frame, x, y, {
  angle   = 0,      // rotation, en radians
  scaleX  = 1,      // ecrasement et etirement
  scaleY  = 1,
  tint    = null,   // teinte multiplicative, ou null
  alpha   = 1,
})
```

Monstres, joueurs, projectiles, particules, bonus, boss : tous passent par là.
Le jour de la bascule, on réécrit **ce module** et aucun appelant ne bouge.

Deux règles qui vont avec :

- **`tint` doit exister dès aujourd'hui**, même implémenté en canvas 2D par un
  mode de composition approximatif. Sinon il faudra reprendre tous les appelants
  le jour où il devient gratuit. C'est le paramètre qui remplacera à terme le
  flash blanc, le marquage des élites et les variantes d'état.
- **Aucune entité ne dessine directement au contexte.** Si un cas ne rentre pas
  dans la signature, c'est la signature qu'on étend — pas une exception qu'on
  ouvre.

C'est précisément l'erreur qui rend la situation actuelle coûteuse : cinq cents
appels vectoriels dispersés, sans point de passage. Ne pas la répéter un cran
au-dessus.

### Ce qui transférera, ce qui sera à refaire

| élément | après bascule |
|---|---|
| recette en six couches (partie C1) | **intacte** — tout est cuit dans la texture |
| atlas et coordonnées source | **intact** — c'est le format natif |
| rotation, échelle, écrasement | **intacts** — mêmes transformations |
| particules | **transfèrent**, et deviennent bien plus rapides |
| flash blanc par composition | **à refaire**, en mieux : une teinte en uniforme |
| élite = échelle 1,3 + contour tracé | **à refaire** : image dédiée ou shader |
| grille, vignettage, zones, télégraphes | **restent en 2D** |
| texte, barres, pointillés | **restent en 2D ou en DOM** |

Les deux seuls postes à refaire sont ceux où WebGL fait mieux. Rien n'est jeté.

### La limite à ne pas franchir

**Une seule indirection, pas une couche d'abstraction de rendu.** Pas
d'interfaces, pas de fabriques, pas de gestionnaire de ressources. Ce serait de
l'ingénierie anticipée pour un besoin sans date, et ça alourdirait un code que
les invariants du dépôt demandent lisible.

Une fonction, une signature, un module.

## A6. Écran de chargement

Le clic « Rejoindre » débloque déjà le contexte audio. Même moment, même barre :
génération des atlas **et** décodage des sons, avec un pourcentage.

C'est aussi l'endroit où afficher le logotype — le seul écran où l'on peut
prendre trois secondes.

---

# Partie B — Direction artistique

## B1. Le parti pris

> **L'arène est une machine. Les monstres sont ce qui s'y est introduit.**

Le décor est froid, précis, instrumenté : grille technique, filets fins, angles
durs, palette désaturée. Les créatures sont chaudes, organiques, irrégulières :
contours épais, formes asymétriques, saturation forte.

Ce contraste **est** l'identité, et il n'est pas décoratif : les monstres sont
les seuls éléments organiques à l'écran, donc ils se détachent instantanément.
La direction artistique sert la lisibilité au lieu de la combattre.

Ça résout aussi la tension actuelle du projet, qui a une grille technique et des
sprites à mandibules sans avoir tranché entre les deux. On garde les deux, mais
en les opposant délibérément.

## B2. Le test de la silhouette

Un principe de conception d'ennemis largement documenté : <cite index="12-1">chaque ennemi doit avoir une silhouette unique permettant au joueur de reconnaître son type à moyenne distance</cite>, et une silhouette est valide si <cite index="5-1">le personnage reste lisible une fois réduit à une ombre pleine</cite>.

**Critère d'acceptation formel** : générer une planche de tous les sprites en
noir uni sur fond blanc. Un lecteur qui ne connaît pas le jeu doit pouvoir les
regrouper par type sans hésitation. Si un type n'est reconnaissable que par sa
couleur ou son détail interne, la silhouette est ratée — <cite index="4-1">si un ennemi dépend de son détail interne pour être reconnu, le style et la mécanique travaillent l'un contre l'autre</cite>.

## B3. Palette et rampes

Le défaut des sprites générés au code est d'être **plats** : un aplat, un
contour. Ce qui donne du volume, c'est une rampe de valeurs.

Chaque type reçoit **quatre valeurs** dérivées d'une teinte de base :

```js
// A partir d'une teinte de base en HSL
ombre   = hsl(h - 8,  s + 10, l - 28)
base    = hsl(h,      s,      l)
lumiere = hsl(h + 6,  s - 12, l + 16)
accent  = hsl(h + 40, s + 20, l + 30)   // yeux, plaques, points chauds
contour = hsl(h - 4,  s + 14, l - 40)
```

Le décalage de teinte dans l'ombre et la lumière — plutôt qu'un simple
assombrissement — est ce qui distingue une palette dessinée d'un dégradé
mécanique.

### Palette des monstres

Structurée par **menace**, pas par goût :

| type | teinte | logique |
|---|---|---|
| grunt | `#c9364a` rouge sourd | la masse, doit reculer visuellement |
| runner | `#f97316` orange vif | vitesse = chaud et saturé |
| tank | `#7f1d3a` bordeaux sombre | masse = valeur sombre |
| shooter | `#a855f7` violet | seul type à distance, couleur froide |
| brood | `#ec4899` rose | anomalie, la plus saturée |

Le violet du shooter le sépare enfin du reste — c'est le type le plus dangereux
à ignorer et il était noyé dans les rouges.

### Palette du décor

```
--bg-void    #08090d      hors arene
--bg-arena   #0f1219      sol
--grid-fine  #171b24      lignes tous les 5 m
--grid-major #222836      lignes tous les 20 m
--line       #2a3140      filets d'interface
```

Le décor ne dépasse jamais 18 % de saturation. C'est ce qui laisse toute la
saturation aux créatures et aux télégraphes.

## B4. Grammaire de couleurs fonctionnelles

Inchangée et obligatoire :

| couleur | signification |
|---|---|
| cyan `#38bdf8` | il faut y aller |
| ambre `#f5a524` | danger, sortir |
| rouge `#ef4056` | danger létal |
| blanc `#e9edf5` | concerne un allié |
| violet `#a855f7` | persistant |
| vert `#34d399` | gain, soin |

**Règle jamais transgressée : pas de rouge pour quelque chose où il faut
aller.** Une seule exception et le joueur cesse de faire confiance au code.

Conflit à arbitrer : le violet est à la fois la couleur du shooter et celle des
zones persistantes. Les contextes sont disjoints — une créature n'est jamais une
zone au sol — mais si la confusion apparaît en jeu, c'est le shooter qui change,
pas la grammaire.

## B5. Contour et graisse de trait

- **Contour systématique de 2 px** (en unités monde) sur toute créature, dans la
  couleur `contour` de sa rampe. Jamais noir : un noir pur écrase la teinte.
- **Aucun contour** sur les éléments de décor.
- **Filets d'interface à 1 px**, jamais plus.

Le contour épais sur les créatures et son absence sur le décor est la deuxième
moitié de l'opposition machine / organique.

---

# Partie C — Les sprites

## C1. Méthode : génération procédurale

Pas d'assets à dessiner, pas de dépendance, pas d'outil externe. Chaque sprite
est une fonction de tracé exécutée une fois au chargement.

**Recette en six couches**, appliquée uniformément — c'est elle qui fait passer
des « formes géométriques » à des créatures :

1. **Silhouette** — un tracé fermé, rempli en `base`.
2. **Ombrage** — la même silhouette décalée de 2 px vers le bas-droite,
   remplie en `ombre`, écrêtée à la silhouette (`clip`).
3. **Lumière** — un arc en haut-gauche en `lumiere`, écrêté de même.
4. **Contour** — la silhouette tracée à 2 px en `contour`.
5. **Accents** — yeux, plaques, mandibules, en `accent`.
6. **Asymétrie** — une irrégularité par type, du même côté à chaque image.

Les couches 2, 3 et 6 sont l'essentiel du travail : ce sont elles qui font la
différence entre une forme et une créature.

## C2. Les cinq monstres

Chaque silhouette est conçue pour son verbe, et doit passer le test de la
section B2.

**Grunt** — *la masse.* Corps ovoïde dentelé, deux mandibules courtes à l'avant,
deux yeux jaunes rapprochés. Trapu, plus large que long. Sa silhouette est la
plus neutre, c'est le repère par rapport auquel les autres se lisent.
*Images : repos, marche A, marche B, mandibules ouvertes.*

**Runner** — *la vitesse.* Dard effilé, pointe très marquée, deux ailerons
arrière. Beaucoup plus long que large — l'allongement **est** l'information.
Traînée intégrée au sprite.
*Images : repos, course A, course B, bond.*

**Tank** — *la masse lente.* Carapace hexagonale plaquée, épaules débordantes,
petite tête enfoncée. Silhouette la plus large et la plus basse, contour à 3 px
au lieu de 2.
*Images : repos, pas A, pas B, plaques rétractées.*

**Shooter** — *la distance.* Corps flottant à trois segments avec un œil unique
cyclopéen et un canon proéminent. Le seul type qui ne touche pas le sol : léger
décalage vertical et ombre portée séparée.
*Images : repos, dérive, **visée** (canon reculé), **tir** (canon avancé).*

**Brood** — *l'anomalie.* Sac ventru asymétrique, œufs visibles par
transparence, quatre appendices courts irréguliers. La plus organique et la plus
asymétrique.
*Images : repos, pulsation A, pulsation B, gonflée avant éclatement.*

### Élites

Aucune image supplémentaire : **échelle 1,3, contour blanc à 3 px, lueur
externe**. La taille est le signal le plus rapide à lire, et 1,3 suffit à la
rendre évidente sans casser les collisions — qui restent, elles, sur le rayon
logique.

## C3. Les trois classes

**La forme dit la classe, la couleur dit le joueur.** Les quatre couleurs de
joueur sont déjà prises pour l'identité individuelle.

| classe | silhouette |
|---|---|
| **Rempart** | hexagone trapu, contour 3 px, deux plaques latérales débordantes, canon court et large |
| **Soigneur** | corps arrondi, contour fin, emblème en croix, halo doux permanent, faisceau à la place du canon en mode soin |
| **Tireur** | dard triangulaire, pointe marquée vers la visée, contour net, canon long et fin |

*Images par classe : repos, déplacement, tir, à terre.*

**Le mode soin doit se voir de loin** : liseré vert sur la silhouette et
projectiles verts. C'est une information tactique pour toute l'équipe, pas une
coquetterie.

## C4. Le boss

Le seul dessiné intégralement au tracé plutôt que via l'atlas — il est unique à
l'écran, son coût est négligeable, et il gagne à être animé en continu.

Couronne de pointes en rotation lente, noyau à huit faces orienté vers sa cible,
fissures qui s'ouvrent avec les dégâts, œil central. Une **image par barre
rompue** dans l'atlas pour marquer l'escalade : plus il est blessé, plus sa
silhouette est déchiquetée.

---

# Partie D — Animation

## D1. Les principes retenus

Trois seulement, choisis pour leur rapport effet/effort.

**Anticipation.** <cite index="9-1">Une image avant l'action principale où le personnage fait le mouvement inverse : sans elle, les actions semblent se téléporter</cite>, et <cite index="10-1">une anticipation plus marquée s'impose sur les attaques dangereuses, particulièrement pour les ennemis</cite>. C'est aussi un télégraphe de jeu, pas seulement du style : le shooter recule son canon avant de tirer, le tank rentre ses plaques avant de charger, le brood gonfle avant d'éclater.

**Écrasement et étirement.** Gratuit via `ctx.scale`. Une créature qui se
déplace s'étire de 6 % dans son axe ; une créature touchée s'écrase de 12 %
pendant 80 ms.

**Action secondaire.** <cite index="9-1">Un éclat d'impact en deux images et un nuage de poussière en trois images prennent quelques minutes à créer et transforment complètement le ressenti</cite>. C'est le meilleur investissement de toute cette partie.

## D2. Cycles

| entité | cycle | fréquence |
|---|---|---|
| toutes | respiration, ±3 % d'échelle | 1,2 Hz, désynchronisé par identifiant |
| en déplacement | alternance des deux images de marche | proportionnelle à la vitesse |
| touchée | flash blanc 60 ms + écrasement 12 % | à l'impact |
| shooter | visée 400 ms avant le tir | avant chaque projectile |
| brood | gonflement sur les 600 dernières ms de vie | avant la mort |

La désynchronisation par identifiant est indispensable : deux cents créatures
qui respirent en phase produisent une pulsation collective qui saute aux yeux.

## D3. Morts

Trois images d'atlas plus des particules : fissuration, éclatement, dispersion.
Durée totale 260 ms, plafond global de morts animées simultanées à 30 — au-delà,
seules les particules subsistent.

## D4. Effets d'impact

- **Éclat de tir** au bout du canon, 2 images, 50 ms.
- **Éclat d'impact** sur la cible, 2 images, 60 ms.
- **Traînée de projectile** : le sprite étiré dans son axe, plus une copie à 30 %
  d'opacité un cran en arrière.
- **Poussière** sous les créatures rapides.

---

# Partie E — L'arène

## E1. Le sol

- **Grille à deux niveaux** : lignes fines tous les 5 m, marquées tous les 20 m.
  Ça donne une échelle lisible — et rend les distances en mètres du lot 1
  immédiatement compréhensibles.
- **Vignettage** sur les bords, qui concentre le regard et masque les
  apparitions hors champ.
- **Réaction aux impacts** : les lignes de grille brillent brièvement dans le
  rayon d'une explosion ou d'une onde de choc. Peu coûteux, très caractéristique
  du registre instrumentation, et ça sert le parti pris de la partie B.

## E2. Zones : la distinction qui compte

| état | rendu |
|---|---|
| **annonce** | contour animé, remplissage 10 %, arc de progression |
| **actif** | remplissage 45 %, contour fixe, léger pulsé |

Si les deux se ressemblent, tout le vocabulaire de mécaniques devient du bruit.
C'est la partie à ne pas bâcler.

## E3. Attaques à revoir

- **Projectiles ennemis** : traînée courte, lueur pour ceux du boss.
- **Balles du joueur** : étirement dans l'axe et traînée, sans changer la taille
  de collision.
- **Explosions de bombe** : anneau qui se dilate, éclat central, tressaillement.

---

# Partie F — HUD et menus

## F1. HUD (DOM)

Reprend la disposition du plan v2, désormais en éléments CSS :

- **Bloc personnel en bas à gauche, gros** : PV, bouclier, niveau, compétences.
- **Cadre d'équipe en haut à droite** : une ligne par joueur, barre et états.
  Indispensable au soigneur.
- **Compétences en pastilles carrées**, recharge en `conic-gradient`, éclat au
  retour à disponibilité.
- **Effets actifs** en rangée d'icônes près du bloc personnel.
- **Barre de boss** centrée en haut, segmentée par dixièmes.

Tailles minimales en pixels CSS : PV 15 px, touches 13 px gras, noms d'équipe
13 px, chronomètre 26 px.

## F2. Chiffres de dégâts (DOM)

- **Sur tous les ennemis**, avec agrégation sur 200 ms, plafond de 40, et seuil
  d'affichage à 5 % des PV max de la cible.
- **Dégâts subis en rouge**, plus gros, montant depuis le joueur.
- **Soins reçus en vert** — sans quoi le soigneur ne sait pas s'il soigne.
- Déduits de la timeline interpolée, **jamais** de `latest`, sinon ils
  apparaissent 110 ms avant l'image correspondante.

## F3. Cartes (CSS)

L'écran de la seule décision structurante de la manche.

- **L'effet principal est la ligne la plus grosse**, pas le nom.
- Ligne avant/après (lot 1) et palier de famille (lot 2).
- **Un matériau par rareté**, pas seulement une couleur : commune plate, rare
  bordure 2 px, épique lueur externe, légendaire dégradé plus **balayage animé**
  toutes les 3 s. Elle doit se remarquer avant d'être lue.
- Sélection : la carte choisie se verrouille, les deux autres tombent à 30 % —
  le joueur doit voir ce qu'il a écarté.

## F4. Salon et bilan

- **Le bouton de lancement est l'élément le plus voyant.** C'est la seule action.
- **Panneaux de classe avec la silhouette dessinée** à l'échelle réelle, et trois
  barres comparatives PV / dégâts / vitesse plutôt que des pourcentages en texte.
- **Bilan et salon séparés en deux temps** : aujourd'hui personne ne lit son
  bilan parce que l'écran suivant est déjà là.

---

# Partie G — Exécution

## G1. Ordre

1. **Densité de pixels + sortie du HUD en DOM.** Socle : tout le reste en
   dépend, et ça règle à soi seul la lisibilité.
2. **Atlas, point de passage `drawSprite`, écran de chargement.**
   Infrastructure, sans changement visuel — mais c'est ici que se joue le coût
   d'une éventuelle bascule WebGL (partie A5).
3. **Rampes, contours, palette.** Premier changement visible, faible risque.
4. **Silhouettes des monstres et des classes.**
5. **Animation** : cycles, anticipation, écrasement.
6. **Arène** : grille à deux niveaux, vignettage, réaction.
7. **Effets** : impacts, morts, traînées, chiffres de dégâts.
8. **Cartes, salon, bilan.**

Les étapes 1 et 2 n'ont presque aucun effet visible et sont pourtant les plus
importantes. Ne pas les sauter pour aller aux silhouettes.

## G2. Deux garde-fous de production

**Tester l'image réelle.** <cite index="4-1">Construire un écran de jeu représentatif contenant un personnage, un ennemi, un décor, des effets et de l'interface, et juger l'ensemble comme un système plutôt que chaque pièce séparément.</cite> Concrètement : une manche figée à la vague 8 avec un boss, 150 ennemis, trois zones et le HUD complet. C'est cette capture qui valide ou non chaque étape.

**Compter la répétition.** <cite index="4-1">Un style n'est tenable que s'il peut être répété de façon cohérente sur l'ensemble du jeu.</cite> La recette en six couches de la partie C1 existe pour ça : si un type demande un traitement particulier, c'est le type qu'il faut revoir, pas la recette.

## G3. Mesures

| mesure | attendu |
|---|---|
| images par seconde, 220 ennemis + 40 chiffres + 300 particules | pas de chute sous 60 |
| mémoire de l'atlas | sous 12 Mo |
| durée de génération de l'atlas | sous 300 ms |
| taille réelle du texte de PV en 1080p et en 1440p | supérieure à 14 px CSS dans les deux cas |
| nombre d'éléments DOM du HUD | sous 120 |

## G4. Critères d'acceptation

- Le HUD garde la même taille lisible quelle que soit la fenêtre.
- Sprites et texte sont nets en 1440p.
- **La planche des silhouettes en noir uni est lisible par type.**
- Les trois classes sont identifiables sans lire de texte, de loin.
- Un élite se repère instantanément dans une foule de 200.
- Une légendaire se remarque sans être lue.
- **Aucune entité n'est dessinée hors de `drawSprite`**, et sa signature inclut
  déjà `tint`.
- Aucune couleur en dur dans `client.js` : tout passe par les jetons.
- Aucune zone où il faut aller n'est rouge.
- Le mode soin est visible par les autres joueurs.
