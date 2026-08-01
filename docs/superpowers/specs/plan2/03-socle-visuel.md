# Lot 3 — Socle visuel : direction, menus et cartes

Ce lot pose la charte et l'applique aux écrans hors combat. Le lot 4 consomme
les jetons définis ici — ne pas inverser l'ordre.

## 1. La direction retenue

Le jeu a aujourd'hui une **cohérence par défaut** : fond ardoise, grille,
police à chasse fixe, formes nettes. Ce n'est pas une identité, c'est ce qui
restait quand tout était des cercles.

La direction proposée assume cet héritage au lieu de le jeter : **signal et
instrumentation**. L'interface est un poste de contrôle, l'arène est un écran
de mesure, les monstres sont des signaux hostiles. C'est cohérent avec la
police à chasse fixe déjà en place, ça garde la lisibilité que la grille offre
gratuitement, et ça donne un angle net pour trancher chaque décision.

Trois règles qui découlent de ce parti pris :

- **Rien de décoratif ne se superpose au jeu.** Tout ornement vit dans les
  écrans hors combat.
- **La couleur est fonctionnelle, jamais esthétique.** Voir la grammaire.
- **Les angles sont durs.** Rayons de bordure à 2 px maximum, coupes en biseau
  plutôt qu'arrondis. Le seul cercle du jeu est une entité vivante.

L'alternative organique — fond de chair, zones-sécrétions, en cohérence avec
les mandibules et sacs à œufs des sprites — a été écartée : elle fait perdre la
lisibilité apportée par la grille pour beaucoup plus de travail.

## 2. Les jetons

À centraliser dans `public/css/tokens.css` **et** dans un
`shared/palette.js` pour ce que le canvas doit connaître. Une seule source, pas
deux listes qui divergent.

### Fonds et surfaces

```
--bg-void:    #08090d   page, hors arene
--bg-arena:   #0f1219   fond de l'arene
--bg-panel:   #161a24   panneaux, cartes
--bg-raised:  #1e2431   elements interactifs
--line:       #2a3140   filets
--line-soft:  #1c222d   grille de l'arene
```

### Texte

```
--text:       #e9edf5
--text-dim:   #8892a6
--text-faint: #5a6376
```

### Couleurs fonctionnelles — la grammaire

Reprise du plan précédent, désormais obligatoire :

| couleur | signification | valeur |
|---|---|---|
| cyan | il faut y aller | `#38bdf8` |
| ambre | danger, sortir | `#f5a524` |
| rouge | danger létal | `#ef4056` |
| blanc | ça concerne un allié | `#e9edf5` |
| violet | persistant | `#a855f7` |
| vert | gain, soin | `#34d399` |

**Règle jamais transgressée : pas de rouge pour quelque chose où il faut
aller.** Une seule exception et le joueur cesse de faire confiance au code
couleur.

### Raretés

```
commune     #94a3b8   bordure 1 px, fond plat
rare        #38bdf8   bordure 2 px
epique      #c084fc   bordure 2 px + lueur externe
legendaire  #fbbf24   bordure 2 px + degrade + balayage anime
```

Chaque rareté a **un matériau, pas seulement une couleur** : c'est ce qui la
rend reconnaissable au coin de l'œil. La légendaire est la seule à porter une
animation — c'est ce qui fait l'événement.

### Typographie

Deux familles, pas plus :

- **Titres et chiffres** : `ui-monospace`, graisse 700, interlettrage +0,08 em
  en capitales. Déjà en place, à systématiser.
- **Corps** : même famille, graisse 400. Le monospace en corps de texte est un
  choix assumé — il appuie le registre instrumentation.

Échelle fixe, pas de valeurs ad hoc :
`11 / 13 / 15 / 19 / 26 / 34 / 46`

### Espacement

Grille de 4 px. Tout espacement est un multiple : `4 / 8 / 12 / 16 / 24 / 32 / 48`.

## 3. Les cartes — l'écran le plus important

C'est l'écran où le joueur prend la seule décision structurante de la manche,
et c'est aujourd'hui trois rectangles gris.

### Anatomie

```
┌──────────────────────────────┐
│ ◈  CŒUR DE FORGE             │  <- icone + nom
│    LÉGENDAIRE · dégâts 4/4   │  <- rarete + famille et palier
├──────────────────────────────┤
│ +80 % de dégâts              │  <- effet principal, gros
│ +5 % par vague survécue      │  <- effet secondaire
├──────────────────────────────┤
│ possédée 0 / 1               │  <- etat
│ dégâts : +45 % → +125 %      │  <- avant / apres
└──────────────────────────────┘
```

Points non négociables :

- **L'effet principal est la ligne la plus grosse de la carte**, pas le nom.
  C'est ce qu'on compare.
- **La ligne avant/après** (lot 1) est ce qui rend le choix décidable.
- **Une icône par famille**, pas une par carte : cinq à huit glyphes suffisent
  et le joueur apprend à les reconnaître.

### Traitement par rareté

- **Commune** : fond `--bg-panel`, bordure 1 px, aucune animation.
- **Rare** : bordure 2 px cyan, léger éclaircissement du fond.
- **Épique** : bordure violette + lueur externe diffuse.
- **Légendaire** : bordure ambre, dégradé de fond, et un **balayage lumineux**
  qui traverse la carte toutes les 3 s. Elle doit se remarquer avant même
  d'être lue.

### Interaction

- Survol : élévation de 2 px, bordure éclaircie.
- Sélection : la carte choisie se verrouille, les deux autres s'estompent à
  30 % — le joueur doit voir ce qu'il a écarté.
- Le compte à rebours de choix d'office est un **filet horizontal** qui se vide
  sous le titre, pas un chiffre isolé.

## 4. Le salon

L'écran actuel empile titre, tableau, classes, difficulté, bouton. Tout a le
même poids visuel.

### Hiérarchie à imposer

1. **Le bouton de lancement** est l'élément le plus voyant de l'écran. C'est la
   seule action.
2. **Le choix de classe** vient ensuite : trois panneaux larges, avec la
   silhouette du personnage (lot 4) et non seulement du texte.
3. **Le tableau des scores** est de l'information, pas une action : plus
   discret, texte atténué.
4. La difficulté est un segment compact.

### Les panneaux de classe

Ils doivent montrer, pas décrire. Chaque panneau contient :

- La **silhouette** de la classe, dessinée, à l'échelle réelle du jeu.
- Trois statistiques en barres comparatives — PV, dégâts, vitesse — et non des
  pourcentages en texte.
- Les deux compétences avec leur icône et leur touche.
- L'état de disponibilité : un emplacement pris est grisé **et barré**, avec le
  nom de celui qui l'occupe.

### Fin de manche

L'écran de fin de manche mélange aujourd'hui le tableau et le salon suivant.
Les séparer en deux temps :

1. **Le bilan** — durée, kills, et le tableau des scores mis en avant, avec les
   cartes de chacun affichées en pastilles colorées par rareté.
2. **Le salon** — accessible par un bouton « continuer », ou après 8 s.

Aujourd'hui, le joueur ne lit jamais son bilan parce que l'écran suivant est
déjà là.

## 5. Détails qui portent l'identité

- **Le fond hors arène** reçoit une grille très faible et un léger vignettage.
  L'écran ne doit jamais être du noir plat.
- **Les titres de section** sont en capitales espacées, précédés d'un filet
  court — un vocabulaire de poste de contrôle.
- **Les transitions** entre écrans sont des fondus de 120 ms, jamais de
  glissements. Rapide, sec.
- **Un logotype** : le nom du jeu en capitales espacées avec un glyphe simple.
  Même minimal, il transforme l'écran d'accueil.

## 6. Modifications par fichier

### `public/css/tokens.css` (nouveau)
Tous les jetons ci-dessus en variables CSS.

### `shared/palette.js` (nouveau)
Les mêmes valeurs pour ce que le canvas doit connaître — couleurs
fonctionnelles, raretés, couleurs d'ennemis. **Une seule source de vérité** :
si une couleur existe des deux côtés, elle est définie ici et le CSS la lit,
ou l'inverse, mais jamais copiée.

### `public/index.html`
Restructuration du salon, séparation bilan / salon, anatomie des cartes.

### `public/client.js`
Consommation des jetons, rendu des cartes, panneaux de classe.

### `CLAUDE.md`
Nouvelle section « charte visuelle » : la grammaire de couleurs, l'échelle
typographique, la grille de 4 px, et la règle du rouge.

## 7. Critères d'acceptation

- Aucune valeur de couleur en dur dans `client.js` : tout passe par les jetons.
- Aucune taille de police hors de l'échelle.
- Une légendaire se remarque sans être lue.
- Un emplacement de classe pris est identifiable sans lire le texte.
- Le bilan de fin de manche est lisible avant que le salon n'apparaisse.
