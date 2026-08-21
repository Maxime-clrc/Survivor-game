# Survivor LAN — les cadres

Refonte visuelle de la seule récompense des défis. Ce qui change : un cadre
cesse d'être une couleur, il devient un **matériau**.

---

# 1. Le principe

> **Un cadre ne change rien à la partie. C'est précisément pour ça qu'il doit se
> voir.**

Le plan 03 a posé le système : douze cadres, un par défi, équipables, visibles
au salon, au bilan et en jeu. Il a délibérément arrêté le visuel au minimum
viable — un soulignement coloré — parce que le lot devait d'abord livrer la
mécanique de déblocage.

Ce lot ne touche ni à la mécanique, ni au réseau, ni à l'équilibrage. Il ne
touche qu'au matériau.

**La raison est entière dans le mot « défi ».** Un cadre est la contrepartie
d'une exigence déraisonnable — vaincre un boss sans subir un dégât, terminer une
manche complète en solo, obtenir tous les autres hauts faits. Une contrepartie
qu'on ne distingue pas d'une autre à deux mètres d'écran annule l'exigence :
personne ne poursuit ce que personne ne remarque.

---

# 2. Ce qui existe, et ce qui manque

```js
export const CADRES = [
  { id: "or", nom: "Or", trait: "#ffd24a" },
];
```

Une entrée = **un hex**, rendu en `border-bottom` au salon, en
`box-shadow: inset 0 -2px 0` au bilan, en `moveTo`/`lineTo` au canvas.

Trois défauts, dans l'ordre de gravité :

**Douze traits colorés ne se distinguent pas.** À la largeur d'un nom, ce qui
sépare *Or* d'*Arsenal* est deux ambres voisins. Le joueur ne lit ni lequel, ni
ce qu'il a coûté.

**Rien ne dit le rang.** Un défi qui exige le cauchemar rend le même objet qu'un
défi libre. Or l'échelle existe déjà dans les données — cinq défis portent
`diffMin: 2`, un seul exige tous les autres hauts faits — elle n'est simplement
pas rendue.

**La couleur vit hors de `palette.js`.** `trait: "#ffd24a"` dans
`shared/hauts_faits.js` contredit « une seule source de vérité pour les
couleurs ». Le précédent propre est à côté : `BOSS_ROSTER` porte l'identité,
`BOSS_SKIN` porte la peau.

---

# 3. Le modèle : cinq emplacements, un rang

`CADRES` ne garde que l'identité. La peau part dans `palette.js` :

```js
// shared/palette.js
export const CADRE_SKIN = {
  or: { palier: 2, teinte: "#ffd24a",
        fond: "balaye", bordure: "double", ornement: "barres",
        lueur: "nette", insigne: "laurier" },
};
```

**`CADRE_DEFAUT` n'a pas de peau.** `CADRES` compte treize entrées, dont
`defaut` (« Aucun ») qui n'est pas un cadre mais son absence : `CADRE_SKIN` n'en
contient pas, `appliquerCadre()` sort sans rien poser, et `verifierHautsFaits()`
l'exclut de ses trois tests. Les **douze** de ce document sont les autres.

**Les valeurs sont NOMMÉES, jamais du CSS.** Une table de données qui contient
une déclaration de style n'est plus une table de données ; elle devient
inspectable à l'œil seulement.

| emplacement | valeurs | ce que ça rend |
|---|---|---|
| **fond** | `aucun` · `voile` · `trame` · `balaye` · `irise` | rien · lavis à 8 % · hachures fines · dégradé balayé · dégradé conique animé |
| **bordure** | `trait` · `plein` · `double` · `encoche` | soulignement · cadre 1 px · gros trait + filet · coins coupés (`clip-path`) |
| **ornement** | `aucun` · `crans` · `chevrons` · `barres` · `pointes` · `angles` | marques géométriques **à droite**, en `::after` |
| **lueur** | `aucune` · `douce` · `nette` · `pulse` | `box-shadow` externe |
| **insigne** | un glyphe SVG par cadre | 16 px, à gauche du nom |

## 3.1 Le rang borne le matériau, et il se vérifie

`palier` n'est pas un sixième emplacement : c'est **ce qui décide de ce que les
cinq autres ont le droit de contenir.**

| palier | qui | permis | interdit |
|---|---|---|---|
| **1** | défis libres (6) | lueur au plus `douce` | `double`, `balaye`, `nette`, toute animation |
| **2** | défis `diffMin: 2` (5) | `double`, `balaye`, `nette` — **au moins un** | toute animation |
| **3** | `legende` (1) | `irise`, `pulse` | — |

Et il **se croise avec l'exigence** au lieu de se déclarer :

- palier 2 ⟺ le haut fait qui donne le cadre porte `diffMin: 2` ;
- palier 3 ⟺ ce haut fait est `legende` ;
- un seul cadre au palier 3.

Un cadre qui ne mérite pas son matériau fait échouer `verifierHautsFaits()`.
C'est ce qui empêche l'échelle de se défaire au prochain défi ajouté.

## 3.2 Pourquoi une seule animation

Douze aperçus animés en continu sur l'écran des hauts faits, ce sont douze
compositions permanentes pour une page qu'on lit à l'arrêt. Et surtout : une
chose qui bouge attire l'œil **parce que rien d'autre ne bouge**. Douze
animations n'en font aucune.

`prefers-reduced-motion: reduce` fige `irise` et `pulse` — le dégradé reste, il
ne tourne plus.

---

# 4. Les douze

## 4.1 Palier 1 — défis libres

Mat, aucune animation, lueur au plus douce.

| cadre | défi | teinte | fond | bordure | ornement | lueur | insigne |
|---|---|---|---|---|---|---|---|
| **Sobre** | Puriste | `#9aa4b2` | `trame` | `trait` | `aucun` | `aucune` | cercle **vide** |
| **Dépouillé** | Ascète | `#7f8a99` | `aucun` | `plein` | `crans` | `aucune` | anneau **brisé** |
| **Immaculé** | Intouchable | `#eaf2ff` | `voile` | `trait` | `aucun` | `douce` | losange **plein** |
| **Foudroyant** | Foudroyant | `#63d7ff` | `aucun` | `encoche` | `pointes` | `douce` | éclair anguleux |
| **Arsenal** | Armurier | `#ffb454` | `trame` | `plein` | `barres` | `aucune` | trois canons en faisceau |
| **Ermite** | Ermite | `#8f7ad6` | `aucun` | `trait` | `angles` | `douce` | un point cerné d'un arc **ouvert** |

**Chaque insigne dit le défi, pas le nom du cadre.** L'anneau brisé du Dépouillé
est l'ultime qu'on n'a jamais lancée. L'arc ouvert de l'Ermite est le vide
autour du joueur seul. Le cercle vide du Sobre est le rien assumé.

**Sobre garde un matériau** (`trame`, hachures fines gris acier) bien qu'il soit
le plus pauvre des douze. C'est le premier cadre que beaucoup obtiendront : sans
matériau il serait indiscernable de l'absence de cadre, et le premier déblocage
du système passerait inaperçu.

## 4.2 Palier 2 — défis cauchemar

Relief, double trait, lueur marquée. Toujours aucune animation.

| cadre | défi | teinte | fond | bordure | ornement | lueur | insigne |
|---|---|---|---|---|---|---|---|
| **Insomniaque** | Nuit blanche | `#c4453f` | `trame` | `double` | `crans` | `nette` | œil **barré** |
| **Intact** | Sans une égratignure | `#4fd6a0` | `voile` | `double` | `angles` | `douce` | bouclier plein |
| **Chasseur** | Bestiaire III | `#d64f8f` | `trame` | `encoche` | `pointes` | `nette` | trophée : pointe traversant un anneau |
| **Or** | Perfection | `#ffd24a` | `balaye` | `double` | `barres` | `nette` | couronne de laurier |
| **Phalange** | Quatuor | `#4a8fff` | `voile` | `double` | `chevrons` | `nette` | quatre boucliers serrés |

**L'œil barré de l'Insomniaque reprend le signe du Regard**, déjà connu du
joueur : un vocabulaire qui se réutilise coûte moins à lire qu'un vocabulaire
qui s'invente.

**Le laurier de l'Or est le seul insigne franchement figuratif**, et c'est là
que le choix du SVG paie. Un laurier en CSS est une suite de compromis ; en
chemin vectoriel, c'est un chemin.

**Chasseur ne porte pas de croc.** Le défi est « vaincre les onze boss en
cauchemar » — le trophée dit « abattu », le croc dirait « bête », et le roster
n'en contient pas.

## 4.3 Palier 3 — Légende

| cadre | défi | teinte | fond | bordure | ornement | lueur | insigne |
|---|---|---|---|---|---|---|---|
| **Prismatique** | Légende | **spectre** | `irise` | `double` | `pointes` | `pulse` | prisme séparant un trait en trois |

Seule entrée dont `teinte` n'est pas une couleur mais un dégradé, et seul
insigne qui prend ce dégradé au lieu d'une teinte plate.

Un Prismatique se reconnaît à travers la pièce. C'est le but : son défi est
d'avoir obtenu **tous les autres hauts faits**.

---

# 5. Où ça se rend

Quatre surfaces, toutes existantes. Aucune nouvelle.

| surface | traitement | pourquoi |
|---|---|---|
| **Salon** — `.teamRow .teamName` | complet | de la place, et le temps de regarder |
| **Bilan** — `#scores` / `#bilanScores td.name` | **sans fond** | le `<td>` porte déjà la couleur de **classe** en texte ; un fond entrerait en concurrence avec elle |
| **Méta** — `.cadreApercu` | mini-plaque portant **ton pseudo** | on équipe ce qu'on a vu, pas un échantillon. Colonne 56 px → 148 px |

**L'insigne tient la gauche, l'ornement la droite.** Un élément n'a que deux
pseudo-éléments : l'insigne prend `::before`, l'ornement `::after`. Miroiter
l'ornement des deux côtés aurait demandé un troisième nœud dans le markup de
chaque site d'appel, pour une composition moins équilibrée qu'un glyphe à chaque
bout.
| **Jeu** — `render/boss.js` | soulignement + teinte + `shadowBlur` si palier ≥ 2 | voir 5.1 |

## 5.1 Le jeu garde le soulignement, et c'est un choix

L'invariant « rien de décoratif ne se superpose au jeu » n'est pas levé. Une
plaque au-dessus d'un personnage couvre le sol, et le sol porte les télégraphes,
les zones, les dangers de biome — tout ce dont la lecture décide de la survie.

Le cadre en manche gagne donc **la teinte et la lueur**, qui ne coûtent aucune
surface, et rien d'autre. Ni fond, ni ornement, ni insigne.

L'invariant voisin — « autour d'un nom, c'est un soulignement, jamais une
boîte » — se **restreint au jeu**. Sa raison est conservée et devient sa
formulation.

---

# 6. Le point de passage unique

```js
// public/ui/cadres.js
appliquerCadre(el, id, portee)   // portee : "plaque" | "ligne"
```

Il pose `data-cadre-fond` / `-bordure` / `-ornement` / `-lueur`, les variables
`--cadre` et `--cadre-2`, et injecte l'insigne.

**`portee: "ligne"` est ce qui supprime le fond** — une règle écrite une fois,
pas douze exceptions dans la table.

`menus.css` gagne une règle **par valeur d'emplacement** (~20 au total), jamais
par cadre. Ajouter un treizième cadre = une ligne dans `CADRE_SKIN`, un glyphe,
**zéro CSS**.

**Couche** : `ui/cadres.js` n'importe que `shared/palette.js` et
`shared/hauts_faits.js`. Feuille, placée avant `ui/build.js`. Aucun cycle.

---

# 7. Ce qui change dans le dépôt

| fichier | change |
|---|---|
| `shared/palette.js` | `+ CADRE_SKIN` (12 peaux) |
| `shared/hauts_faits.js` | `CADRES` perd `trait` ; `verifierHautsFaits()` croise palier ↔ exigence |
| `public/ui/cadres.js` | **NEUF** — `appliquerCadre()` + `INSIGNES` |
| `public/ui/screens.js` | 3 sites d'appel → `appliquerCadre` |
| `public/css/menus.css` | section emplacements |
| `public/render/stage.js` | `cadreOf()` rend `{ teinte, palier }` au lieu d'un hex |
| `public/render/boss.js` | teinte + lueur sur le soulignement |
| `CLAUDE.md` | 3 lignes (invariant restreint, module ajouté, registre ajouté) |
| `shared/version.js` + `package.json` | bump 0.14.3 → 0.14.4 |

**Le réseau ne change pas.** Le serveur envoie l'`id` et rien d'autre, comme
avant. Aucune clé d'instantané ouverte, aucun octet de plus au salon.

**La persistance ne change pas.** `profile.cadres` et `profile.cadreActif`
portent des identifiants, pas des couleurs. Aucune migration.

---

# 8. Le critère rejouable

`verifierHautsFaits()` gagne trois tests :

1. tout cadre de `CADRES` a une entrée dans `CADRE_SKIN` — et l'inverse ;
2. le palier concorde avec l'exigence du haut fait qui donne le cadre
   (2 ⟺ `diffMin: 2`, 3 ⟺ `legende`), et le matériau respecte les bornes du
   palier ;
3. un seul cadre au palier 3.

Pas de suite de tests dans le dépôt : `node --check`, `verifierHautsFaits()`
depuis un script jetable, puis contrôle visuel sur l'écran des hauts faits — les
douze aperçus côte à côte, c'est là que la lisibilité se juge.

---

# 9. Ce qu'on ne fait pas

**Pas de cadre acheté.** Un cadre est la récompense d'un défi ; une seconde
porte d'entrée retirerait au premier ce qui fait sa valeur.

**Pas d'effet en jeu.** Voir section 5.1.

**Pas de cadre par classe, par arme ou par biome.** Ce sont des identités déjà
portées par la couleur du joueur ; un second canal pour la même information ne
dit rien de plus.

**Pas de dessin libre par cadre.** Douze cas particuliers ne se vérifient pas et
rendent la hauteur de ligne imprévisible. La créativité vit dans ce qu'on met
dans les cinq emplacements et dans le glyphe — pas dans l'abandon du gabarit.
