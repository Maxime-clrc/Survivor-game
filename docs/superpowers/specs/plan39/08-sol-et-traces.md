# G — NOUVELLE LOGIQUE DE SOL ET DE TRACES

---

## G.0 — Pourquoi le sol est le levier n°1

Le sol est la **plus grande surface de l'écran**, sans concurrence. Il est
aujourd'hui cuit sans terme de région :

```js
floorPattern(ctx, biomeIndex, diffIndex, seed, dpr)     // pas de `loi`
cle = `f|${biomeIndex}|${diffIndex}|${seed}|${dpr}|${gfx}`
```

Donc **une carte de 14 400 × 8 100 px a un seul sol**, et les deux captures de
`docs/screens/` le montrent au pixel. Le corriger coûte **un argument et une
constante de cache** (§C.5). C'est le meilleur rapport du dossier.

---

## G.1 — La composition : BASE DE THÈME × TRAITEMENT DE BIOME

```
SOL(biome) = TUILE_THEME(palette, usure_mode)  puis  TRAITEMENT(parametres)
```

La base de thème est la recette actuelle (`usine`, `fonderie`, `friche`,
`nebuleuse`, `secteur`), **inchangée** : elle porte la palette, le grain de
fond, la maille de 5 m là où le thème en a une (`PORTE_MAILLE`). Le traitement
est une passe **par-dessus**, paramétrée, tirée d'une liste fermée de douze.

Ce n'est pas une couche de plus au rendu : la tuile est **cuite une fois par
région** dans le même `cuire()`, et le cache la garde. Le coût par image est nul.

---

## G.2 — LES DOUZE TRAITEMENTS

| traitement | ce qu'il dit | paramètres | biomes |
|---|---|---|---|
| `lisse` | c'est entretenu et ça glisse | brillance, teinte, joints | U01, U06, U11, S03, S07, N08 |
| `dalle` | c'est construit en modules | module, joint, contraste, désordre | U08, F02, R08, S01, S11 |
| `granulat` | ça a été déversé | grain, teinte, tassement | U05, F06, F08, R04, R11, S12 |
| `poudre` | ça retombe et ça garde l'empreinte | finesse, teinte, empreinte | F05, U09, R03, R11 |
| `ajoure` | il n'y a pas de sol partout | **taux de vide**, motif, épaisseur | N01→N12, S09, S13, U12 |
| `technique` | c'est un plancher démontable | module, boulons, repérage | N04, N07, U12 |
| `terre` | rien n'a été fait | compacité, sentiers, ornières | R01, R07, R12, U10 |
| `vegetal` | le vivant a repris | densité, teinte, interstices | R05, N05 |
| `bitume` | on roule dessus | usure, marquages, rapiéçage | U03, R06, R13, S01, S04 |
| `mineral` | on a creusé dedans | strates, éclats, forage | R11, F06 |
| `mouille` | il y a de l'eau | film, flaques, **réflexion**, ondulation | S01→S13, F03, R09 |
| `marque` | le sol donne un ordre | motif, netteté, couleur, effacement | U07, U11, R06, S10, S11 |

**Un biome en déclare un dominant et au plus un secondaire**, avec une frontière
franche entre les deux quand il y en a deux (S01 chaussée/trottoir, R13
remblai/enrobé, N11 pressurisé/vide, S09 sec/mouillé).

### Les paramètres qui font le plus de travail

- **`taux de vide` (`ajoure`)** — 0 % à 80 %. À lui seul il porte **onze sols
  distincts de la Nébuleuse**, et la mécanique existe (`BAIE_TAUX`, aujourd'hui
  figée à 0,38). C'est le paramètre le moins cher et le plus payant du dossier.
- **`réflexion` (`mouille`)** — le Secteur a `k = 0.52`, le plus bas du dépôt,
  précisément parce qu'il est mouillé. Faire varier la réflexion **dans** le
  thème sépare S03 (miroir), S07 (sec), S02 (mat détrempé) et S04 (miroir animé).
- **`empreinte` (`poudre`)** — un sol qui garde une trace de pas est le seul
  moyen de dire « quelqu'un est passé ici » sans un mot. Deux biomes seulement,
  et c'est ce qui les rend mémorables (F05, R12).

---

## G.3 — LES TRACES : de 9 primitives à 20, et une règle

### Ce qui existe et fonctionne

Neuf primitives (`roulage`, `souillure`, `poussiere`, `cendres`, `rayures`,
`ruissellement`, `corrosion`, `fissures`, `dechets`), une par cellule de 200 px,
deux cellules sur trois, sondées **au centre** et posées ailleurs. La mécanique
est bonne, son vocabulaire est trop court : quatre thèmes sur cinq réutilisent la
même primitive dans deux régions.

### La règle qui manque : UNE TRACE A UNE SOURCE

> **Une trace n'est pas un motif, c'est la CONSÉQUENCE de quelque chose qui est
> encore là.** Elle est donc soit **ancrée** (elle entoure ou touche un objet),
> soit **orientée** (elle pointe vers un objet), soit **libre** (elle est
> partout, et c'est alors une propriété du sol, pas une trace).

C'est ce qui distingue une trace d'une texture, et c'est ce que le dépôt ne dit
pas aujourd'hui : la trace est tirée par quartier, mais elle ne **regarde** pas
l'objet dont elle est la conséquence. `sonder()` rend déjà l'obstacle le plus
proche et sa distance — **l'information est disponible et jetée**.

| classe | comportement | exemples |
|---|---|---|
| **ancrée** | naît à moins de `PORTEE_QUARTIER` d'un bloc donné, orientée par lui | flaque d'huile sous une machine, auréole autour d'un bac, roussi sous une brame, coulée de rouille sous un montant |
| **orientée** | un vecteur vers l'objet source, longueur décroissante | coulée de granulés depuis une trémie, sentier entre deux abris, roulage sortant d'un quai, éclaboussure |
| **libre** | uniforme dans la région | poussière, cendres, corrosion, givre |

### Les onze primitives nouvelles

| primitive | classe | ce qu'elle dit | biomes |
|---|---|---|---|
| `empreinte` | libre + orientée | quelqu'un est passé | F05, R12, U10 |
| `sentier` | orientée | on passe **toujours** par là | R12, R05 |
| `auréole` | ancrée | quelque chose a débordé et séché | U06, R07, F09 |
| `coulée` | orientée | ça s'est écoulé depuis un point | U09, R09, F08 |
| `roussi` | ancrée | quelque chose de chaud a été posé | F09, F02 |
| `eclats_brillants` | libre | ça a cassé et ça accroche la lumière | R01, F04, N09 |
| `interstice_vegetal` | libre | rien ne l'empêche plus de pousser | R04, R05, R08 |
| `marquage_efface` | libre | ça a servi et ça ne sert plus | R06, R08, S10 |
| `givre` | libre + ancrée | il fait froid **ici** | N01, N06, N11 |
| `tag` | ancrée (mur) | quelqu'un s'est approprié le lieu | S02, S05, R08 |
| `film_reflechissant` | libre | c'est mouillé | S01→S13, F03 |

**Vingt primitives**, chacune tirée par au moins deux biomes, aucune par plus de
six. `verifierTraces()` garde ses deux croisements et gagne :
- une primitive qu'aucun biome ne tire → morte ;
- un biome sans primitive → sol muet ;
- **deux biomes d'un thème avec le même jeu de primitives → doublon** (c'est le
  contrôle qui manque aujourd'hui) ;
- une primitive **ancrée** ou **orientée** dont aucune famille bâtie du biome ne
  peut être la source → incohérence, et c'est exactement le §10 du cahier des
  charges rendu vérifiable.

### Le budget ne bouge pas

`TRACE_TAUX = 0.66` reste : deux cellules sur trois. Le relevé de `LISEZMOI`
donne 161 à 305 opérations par vue pour les traces — le poste le moins cher du
décor après le fond. Les primitives ancrées et orientées ne coûtent **rien de
plus** : `sonder()` fait déjà le balayage et rend déjà la distance ; il suffit
de ne plus jeter la position.

---

## G.4 — Ce que le sol dit, par thème

| thème | base | ce que ses traitements racontent |
|---|---|---|
| **USINE** | béton propre, maille 5 m | **l'entretien** : du `lisse` neuf au `terre` de la cour à ferraille, on descend l'échelle sociale de l'usine |
| **FONDERIE** | fonte, calamine, maille 5 m | **la température** : `roussi` et `lisse` vitrifié au chaud, `granulat` et `mouille` au froid |
| **FRICHE** | béton lavé, joints irréguliers | **le temps** : `fissures` → `interstice_vegetal` → `vegetal`. Le seul thème dont les traitements se succèdent dans un ordre |
| **NÉBULEUSE** | nid d'abeille | **la pression** : le `taux de vide` de `ajoure`, de 0 % (coursive) à 80 % (chantier) |
| **SECTEUR** | reprises de chaussée | **qui paie** : `pierre_polie` et `marbre` en haut, `bitume` et `terre` en bas ; et `mouille` partout, sauf S07 |

**Chaque thème a un axe, et le sol le porte.** C'est ce qui fait qu'on sait où
l'on est **avant** de regarder les objets — et c'est la réponse au test du
screenshot du §19.
