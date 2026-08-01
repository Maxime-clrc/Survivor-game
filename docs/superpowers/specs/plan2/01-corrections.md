# Lot 1 — Corrections et lisibilité

Quatre défauts précis, tous constatés en jeu. Lot court, aucune refonte.

## 1. Les distances en mètres

### Le problème

Les descriptions de cartes et de compétences parlent en pixels : « ramasse les
bonus au sol à 120 px », « 35 PV à toute l'équipe dans 300 px ». Le pixel n'est
pas une unité de jeu — il dépend de la résolution, il ne se compare à rien, et
il n'aide pas à décider entre deux cartes.

### La solution

**Une conversion d'affichage uniquement. La simulation reste en pixels.**

```js
// shared/units.js (nouveau)
export const PX_PER_M = 20;
export const toM = px => px / PX_PER_M;
export const fmtM = px => {
  const m = px / PX_PER_M;
  return (m < 10 ? m.toFixed(1) : Math.round(m)) + " m";
};
```

À 20 px/m, l'arène de 1600 × 900 fait **80 × 45 m**, ce qui est une salle
plausible, et les rayons existants tombent juste :

| constante | px | m |
|---|---|---|
| rayon du joueur | 14 | 0,7 |
| rayon de réanimation | 88 | 4,4 |
| lames orbitales | 74 | 3,7 |
| champ de givre | 160 | 8 |
| rempart du tank | 170 | 8,5 |
| explosion de bombe | 140 | 7 |
| vague de soin | 300 | 15 |
| provocation | 400 | 20 |
| portée de bombe | 420 | 21 |
| onde de choc | 430 | 21,5 |

### Portée

- Toutes les descriptions de `cards.js`, `classes.js`, `bosses.js`.
- Les libellés du salon et de l'écran de cartes.
- L'écran de fin de manche.

**Ne pas convertir** : les constantes de `CFG`, les commentaires techniques, les
mesures du `LISEZMOI`. Ce sont des valeurs de simulation, elles restent en
pixels et le commentaire doit le dire explicitement — sinon quelqu'un
convertira `CFG` un jour et cassera tout.

Ajouter la règle à `CLAUDE.md` : *les distances s'affichent en mètres, la
simulation reste en pixels*.

## 2. La bombe doit être visée

### Le problème

`DPS_BOMB_SPEED: 700` et `DPS_BOMB_DELAY: 0.6` : la bombe parcourt toujours
420 px avant d'exploser, quelle que soit la position du réticule. Le joueur
choisit une direction, pas une cible. C'est particulièrement frustrant sur un
amas proche, où la bombe passe au-dessus et explose derrière.

### La solution

La bombe atterrit **à la position du réticule**, bornée entre une portée
minimale et maximale, et le temps de vol suit la distance à vitesse constante.

```
DPS_BOMB_RANGE_MIN: 80      // 4 m — en deca, elle explose sur soi
DPS_BOMB_RANGE_MAX: 460     // 23 m
DPS_BOMB_SPEED: 700         // inchange : le temps de vol devient variable
```

Temps de vol = distance / vitesse, borné à `[0.15, 0.75]` s. Un lancer court
explose vite, un lancer long laisse le temps de réagir — ce qui est le bon
compromis entre réactivité et anticipation.

### Protocole

Le client envoie déjà une direction de visée normalisée (`ax`, `ay`). Il faut
un scalaire de plus :

```
{ t:"input", x, y, ax, ay, d, s1, s2, ar }
```

`ar` = distance au réticule **en pixels**, bornée côté serveur à
`[RANGE_MIN, RANGE_MAX]`. Le serveur ne fait jamais confiance au client : une
valeur absente, négative ou aberrante retombe sur `RANGE_MAX`.

`ar` n'est pas un drapeau ponctuel — il est continu, comme `ax`/`ay`, et ne
doit **pas** être remis à zéro après le tick.

### Rendu

Un **cercle d'atterrissage** au sol pendant le vol, à la couleur de danger,
avec un arc de progression — la même grammaire que les annonces de boss. Le
joueur voit où ça va tomber, ce qui est aujourd'hui invisible.

Le réticule affiche aussi la portée max quand la bombe est prête : un anneau
discret de 23 m autour du joueur, uniquement pendant les 2 s qui suivent la fin
de recharge.

## 3. Les descriptions de cartes

### Le problème

Elles disent l'effet, pas l'état. Un joueur qui a déjà deux exemplaires
d'Affûtage lit « +12 % de dégâts » et ne sait ni ce qu'il a déjà, ni ce que ça
lui fera au total.

### La solution

Trois informations sur chaque carte proposée :

```
AFFÛTAGE                            commune
+12 % de dégâts
possédée 2 / 6  ·  +24 % → +36 %
```

- La ligne d'effet, en mètres et en pourcentages.
- **Le cumul actuel et le plafond**, si la carte est cumulable.
- **La valeur avant et après**, si elle est déjà possédée. C'est ce qui permet
  de comparer une troisième carte de dégâts à une première carte défensive.

Pour les cartes conditionnelles (`symbiose`, `austerite`, `resonance`,
`catalyseur`), afficher **la valeur effective à l'instant du tirage** :
« +5 % de dégâts par carte défensive — actuellement +15 % ». Sans ça, elles
sont impossibles à évaluer et personne ne les prend.

Pour les cartes qui remplacent l'arme, une ligne d'avertissement explicite :
« remplace ton tir — incompatible avec Railgun, Lance-grenades ».

## 4. Voir ce qu'on possède

### Le problème

Lames orbitales et Champ de givre pris ensemble : les deux se dessinent en
anneau autour du personnage, à 3,7 m et 8 m. L'aura de givre est un disque
teinté, les lames de petits triangles de la couleur du joueur — dans le chaos,
les lames disparaissent dedans. Le joueur ne sait pas qu'il a la carte.

C'est un cas particulier d'un problème général : **rien ne récapitule les
effets actifs**.

### Trois correctifs

**a. Bande d'effets actifs dans le HUD.** Une rangée d'icônes permanentes, une
par effet possédé qui a une manifestation en jeu : orbiteurs, givre, drone,
essaim, pulsar, bouclier régénérant, vampirisme. Pastille avec le nombre de
cumuls. C'est la source de vérité, indépendante de ce qu'on arrive à voir dans
l'arène.

**b. Séparation des bandes de rayon.** Chaque effet de zone autour du joueur
occupe une bande exclusive, et deux effets ne se dessinent jamais au même
rayon :

| effet | rayon | rendu |
|---|---|---|
| bouclier | 0,9 m | arc épais collé au corps |
| états | 1,1 m | halo coloré |
| lames orbitales | 3,7 m | lames + **traînée**, dessinées **au-dessus** de tout |
| champ de givre | 8 m | disque teinté à bord net, **sans anneau** |
| rempart du tank | 8,5 m | zone au sol, sous les entités |

Le givre perd son anneau : un disque teinté avec un bord de 1 px suffit, et les
lames cessent d'être noyées. Les lames gagnent une traînée courte, ce qui les
rend visibles en mouvement même à travers une aura.

**c. Panneau d'inventaire.** Touche **Tab** maintenue : liste des cartes
possédées avec cumuls, groupées par rareté. Existe peut-être déjà sous forme de
`loadoutList` — dans ce cas, vérifier qu'il est accessible **pendant** la vague
et pas seulement entre deux.

## 5. Modifications par fichier

### `shared/units.js` (nouveau)
`PX_PER_M`, `toM`, `fmtM`. Module pur, importé par `cards.js`, `classes.js`,
`bosses.js` et le client.

### `shared/classes.js`
`DPS_BOMB_RANGE_MIN/MAX`, temps de vol variable, descriptions en mètres.

### `shared/cards.js`
Descriptions en mètres. Champ de description structuré plutôt qu'une chaîne
figée : `{ base, perStack, conditional }` pour que le client compose la ligne
« +24 % → +36 % ».

### `shared/game_state.js`
Lecture de `ar`, bornage, temps de vol de la bombe. **Ne pas** convertir `CFG`.

### `server.js`
Validation de `ar`. Ne pas l'inclure dans la remise à zéro des drapeaux
ponctuels.

### `public/client.js`
Envoi de `ar`, cercle d'atterrissage, anneau de portée, bande d'effets actifs,
bandes de rayon séparées, descriptions enrichies.

## 6. Critères d'acceptation

- Aucune chaîne affichée au joueur ne contient « px ».
- La bombe atterrit sous le réticule, à ±1 m, y compris à bout portant.
- Un `ar` absent ou aberrant ne plante pas et retombe sur la portée maximale.
- Lames orbitales et champ de givre pris ensemble : les deux restent
  identifiables sans ambiguïté.
- La bande d'effets actifs liste tout effet possédé ayant une manifestation en
  jeu, et rien d'autre.
