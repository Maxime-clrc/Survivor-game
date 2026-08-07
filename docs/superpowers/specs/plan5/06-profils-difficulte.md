# Lot T — Profils de difficulté

Dépend du lot S : les traits doivent exister avant qu'un profil les attache.

C'est le lot qui réalise la demande *« chaque difficulté doit donner l'impression de jouer
à une version différente du jeu »*.

---

## T1. Le profil remplace les quatre multiplicateurs

Aujourd'hui une difficulté est **quatre nombres** :

```js
{ key: "cauchemar", label: "cauchemar", hp: 1.35, spawn: 1.28, dmg: 1.25, boss: 1.25 }
```

Le mécanisme est sain et il faut garder son argument d'origine : *« tout passe par des
multiplicateurs sur la courbe de pression, qui vit dans `CFG` : rien n'est dupliqué, et un
réglage ajuste les trois modes d'un coup »*. Ce qui change, c'est que les multiplicateurs
cessent d'être l'**identité** du mode pour n'être plus qu'un **résidu**.

```js
{
  key: "cauchemar", label: "cauchemar",
  script: "cauchemar",        // variante de la table de debit (lot P)
  roster: [...],              // types autorises, EN PLUS des minLevel du lot S
  traits: {                   // attachement (type -> traits), lot S
    grunt:   [TRAIT_DASH, TRAIT_TRAIL],
    runner:  [TRAIT_DASH],
    tank:    [TRAIT_AURA, TRAIT_FRENZY],
    shooter: [TRAIT_VOLLEY],
    brood:   [TRAIT_SPORE],
  },
  events: [...],              // pool d'evenements (lot U)
  biome: "corrompu",          // couche d'environnement (lot V)
  hp: 1.35, spawn: 1.28, dmg: 1.25, boss: 1.25,   // le residu
}
```

`DIFFICULTIES` reste un **tableau ordonné** dont l'index circule (`diffIndex` dans le
salon). Ne jamais insérer au milieu — invariant inchangé.

---

## T2. Les trois profils

### Calme — apprendre l'espace

| axe | contenu |
|---|---|
| script | variante `calme` : débits abaissés, **un silence par segment** au lieu de trois sur la manche |
| roster | les cinq types d'origine seulement |
| traits | **aucun** |
| événements | pression (silences, crescendos) et composition (`nuee`, `siege`) uniquement |
| biome | géométrie du biome, **aucun danger actif** |
| résidu | `hp` 0,78 · `spawn` 0,80 · `dmg` 0,80 · `boss` 0,75 |

Calme ne voit ni `medic`, ni `bulwark`, ni `choeur` : ce sont les trois types qui demandent
de **choisir sa cible**, et c'est précisément la compétence que ce mode n'a pas à enseigner.
Il enseigne le déplacement, la distance et la lecture des zones.

### Normal — apprendre à choisir sa cible

| axe | contenu |
|---|---|
| script | la table de référence du lot P |
| roster | les cinq d'origine, plus `kamikaze` et `bulwark` |
| traits | `DASH` sur grunt et runner |
| événements | les quatre familles, `chasse` incluse |
| biome | obstacles statiques, deux zones ralentissantes, **aucun danger qui blesse** |
| résidu | `hp` 1 · `spawn` 1 · `dmg` 1 · `boss` 1 |

`kamikaze` et `bulwark` sont les deux types qui font passer le mode de « tirer sur ce qui
approche » à « tirer sur le bon d'abord, sous le bon angle ». C'est le saut que normal doit
produire.

### Cauchemar — le sol est hostile

| axe | contenu |
|---|---|
| script | variante `cauchemar` : débits relevés, **un seul silence** sur la manche (segment 6) |
| roster | les neuf types |
| traits | la table du T1 |
| événements | les quatre familles, plus les événements d'environnement |
| biome | geysers, flaques de poison, cover destructible, une météo par segment |
| résidu | `hp` 1,35 · `spawn` 1,28 · `dmg` 1,25 · `boss` 1,25 |

Le mode se distingue moins par ses chiffres que par le fait que **le sol participe** : entre
les traînées des grunts, les spores des broods et les dangers du biome, la surface jouable
se réduit en permanence — un chronomètre déguisé, ce que le dépôt trouve déjà *« bien plus
lisible qu'un enrage brutal »* pour les flaques de la Matriarche.

---

## T3. Ce que la difficulté ne change PAS

Trois refus explicites, chacun pour éviter une duplication que le dépôt a déjà refusée
ailleurs.

- **Les boss ne changent pas de répertoire par difficulté.** Ils ne varient que par leur
  `hpMul` de roster, leur `floor` de segment et le résidu `boss`. Écrire trois variantes de
  six boss, c'est dix-huit combats à équilibrer et *« la dérive au premier réglage »*.
- **Les mécaniques de boss ne changent pas.** `adaptMech` adapte déjà à l'**effectif** ; y
  ajouter un second axe rendrait la table d'adaptation illisible, or *« c'est justement ce
  qui rend le système tenable »*.
- **Les statistiques de type ne changent pas.** PV, vitesse et dégâts restent ceux
  d'`ENEMY_TYPES` ; le résidu `hp` et `dmg` porte tout l'ajustement chiffré. Une seule
  table à équilibrer.

---

## T4. Identité visuelle par difficulté

Le joueur doit comprendre **immédiatement** où il se trouve. Une variante de palette par
mode, dans `shared/palette.js` — jamais ailleurs : *« une couleur en dur dans `client.js` ou
dans une feuille de style est un bug »*, et `cssVars()` la pousse sur `:root` au chargement.

### La règle qui contraint tout le reste

Le contraste de la direction artistique est **conservé sans exception** : *« l'arène est une
machine, les monstres sont ce qui s'y est introduit »* — décor froid, précis, saturation
sous 18 % ; créatures chaudes, organiques, saturation forte.

**La difficulté ne change donc pas les créatures, elle change la machine.** Teinter les
monstres en cauchemar détruirait la seule chose qui les rend instantanément lisibles à 200 à
l'écran, et casserait au passage l'identité par type (une teinte par type, six valeurs
dérivées par `ramp()`).

| mode | sol | grille | vignettage |
|---|---|---|---|
| calme | ardoise froide, saturation basse | fine, régulière | léger |
| normal | ardoise, quelques marques d'usure | double niveau (5 m fin, 20 m marqué) | actuel |
| cauchemar | ardoise virant au brun, plaques manquantes | irrégulière, sections éteintes | fort, pulsation lente |

La grille reste **graduée en mètres** dans les trois modes : *« ce ne sont pas des ornements
mais le sol, gradué pour que les distances des descriptions de cartes veuillent dire quelque
chose à l'écran »*. En cauchemar les sections éteintes sont visuelles, jamais un trou dans la
graduation.

### La grammaire fonctionnelle est intouchable

Cyan « il faut y aller », ambre « danger, sortir », rouge « létal », blanc « ça concerne un
allié », violet « persistant », vert « gain, soin ». Aucune variante de palette ne réattribue
un de ces six rôles — *« une seule exception et les joueurs cessent de faire confiance au
code couleur, donc lisent tout au cas par cas »*.

Les variantes ne touchent que les couleurs de **décor** : sol, grille, vignettage, et le
liseré d'ambiance. Rien de ce qui porte une information tactique.

---

## T5. Le vote de difficulté reste inchangé

*« Chaque joueur vote au salon ; la majorité l'emporte et, à égalité, le mode le plus doux
gagne — personne ne doit pouvoir imposer cauchemar à la table en étant seul de son avis. »*

Mais le salon doit maintenant **dire ce que le mode change**, puisque ce n'est plus une
question de chiffres. Trois lignes par mode dans le sélecteur : ce que le bestiaire ajoute,
ce que les traits ajoutent, ce que le sol fait. Sans ça, un joueur vote sur un mot.

---

## T6. Fichiers touchés

| fichier | ce qui change |
|---|---|
| `shared/game_state.js` | `DIFFICULTIES` passe de quatre nombres à un profil ; `this.diff` porte le profil complet ; `_pickType` filtre par `roster` ; les traits sont lus depuis `this.diff.traits` |
| `shared/enemies.js` | rien — la table d'attachement peut vivre ici **ou** dans le profil ; **choisir un seul endroit**, et le profil est le bon : c'est lui qui définit le mode |
| `shared/timeline.js` | trois variantes de script (`calme`, `normal`, `cauchemar`), chacune avec ses variantes A/B/C |
| `shared/biomes.js` | référencé par le profil (lot V) |
| `shared/palette.js` | trois variantes de décor ; `cssVars()` prend le mode en argument |
| `public/client.js` | applique la variante de palette au chargement de la manche ; grille et vignettage par mode |
| `public/index.html`, `public/css/ui.css` | sélecteur de difficulté enrichi (T5) |
| `room.js` | le payload de salon porte le mode **et** la variante de script tirée |
| `LISEZMOI.md` | la table « Difficulté » à quatre colonnes devient une section par mode |

---

## T7. Le piège de la duplication de table

`traits` peut vivre dans deux endroits : `shared/enemies.js` (à côté des types) ou dans le
profil de difficulté (à côté du mode). **Les deux serait le bug.**

Le profil est le bon endroit : c'est la difficulté qui **décide** ce que le mode est, et
`enemies.js` fournit les briques. La règle est celle du dépôt — *« les constantes de
comportement des cartes vivent dans `CARD_CFG`, celles des compétences dans `SKILL_CFG`, à
côté de leur table »* : les **valeurs** d'un trait (durée, rayon, réduction) sont dans
`enemies.js`, son **attachement** est dans le profil.

Formulé autrement : `enemies.js` répond à « comment un dash fonctionne », le profil répond à
« qui l'a ».

---

## T8. Mesures

Cinq essais par configuration, effectifs 1 à 4, **par difficulté** — c'est le lot où la
mesure par mode devient obligatoire et non plus déductible d'un multiplicateur.

| mesure | cible |
|---|---|
| segment atteint, build médiane, par mode | calme **6**, normal **5 à 6**, cauchemar **4 à 5** |
| écart de survie calme → cauchemar | facteur **1,5 à 2,5** — en dessous, les modes ne se distinguent pas ; au-dessus, cauchemar est décoratif |
| répartition des dégâts subis par provenance, par mode | cauchemar doit montrer une **part de zone nettement plus élevée** — c'est la promesse « le sol participe » ; si elle n'y est pas, le biome ne fait rien |
| part des dégâts subis venant du contact | doit **baisser** de calme à cauchemar : plus de menaces à distance et au sol |
| population moyenne, par mode | calme **60 à 90**, normal **90 à 140**, cauchemar **110 à 170** |
| temps consécutif à `MAX_ENEMIES`, cauchemar | **< 60 s** avant le segment 5 |
| CPU par tick, cauchemar, 200 ennemis avec traits, 4 joueurs | moyenne **< 1 ms**, p99 **< 8 ms** |
| poids d'instantané, cauchemar, pire cas | hausse **< 10 %** vs référence actuelle |
| lisibilité : dangers + zones + traînées | **≤ 12 %** de l'arène (lot V) |

**Chaque mesure précise son profil de compte, sa variante de script, son biome, son
effectif — et désormais sa difficulté**, qui n'est plus un simple facteur d'échelle.

---

## T9. Critères d'acceptation

- Les trois modes se distinguent par leur **bestiaire, leurs traits, leur script, leurs
  événements et leur sol**, pas seulement par quatre multiplicateurs.
- Aucun boss n'a de variante par difficulté : le répertoire est identique dans les trois
  modes.
- Aucune statistique d'`ENEMY_TYPES` ne dépend de la difficulté : l'ajustement chiffré passe
  entièrement par le résidu `hp` / `dmg`.
- La table d'attachement des traits existe en **un seul endroit** (le profil), les valeurs
  des traits en **un seul endroit** (`enemies.js`).
- Les créatures ont la même teinte dans les trois modes ; seul le décor change.
- Les six rôles de la grammaire de couleur sont identiques dans les trois modes.
- La grille reste graduée en mètres dans les trois modes.
- Le sélecteur du salon dit **ce que le mode change**, pas seulement son nom.
- `DIFFICULTIES` reste un tableau ordonné de trois entrées, aucune insertion au milieu.
- Un client resté sur une version antérieure au lot reste jouable : il reçoit un
  `diffIndex` qu'il sait lire et ignore ce qu'il ne connaît pas.
