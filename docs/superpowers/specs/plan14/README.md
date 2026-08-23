# Survivor LAN — plan 14 : quatre lieux

Le plan 13 a donné au rendu sa matière, sa lumière et son volume. Il a échoué
sur un point : **les quatre biomes parlent la même langue**. Le semis de props
et la tuile de sol les distinguent ; tout le reste — obstacles, dangers,
couleur d'arène, premier plan — est commun, et c'est le reste qui occupe
l'écran.

Ce plan ne rend pas les maps plus belles. Il leur donne **quatre langues**.

---

## Le constat, chiffré

| symptôme | cause |
|---|---|
| les quatre sols ont la même couleur | après `teinter()`, les quatre arènes tiennent dans **15 niveaux RGB sur 255** — `teinter` préserve la luminance et les quatre `tint` sont déjà quasi noirs |
| les quatre obstacles ont la même forme | **une seule** `silhouette()`, seul le chanfrein change |
| les quatre obstacles ont la même matière | **un seul** `habillage()` : tôle striée + bande LED |
| les quatre obstacles ont la même couleur | `BIOME.block` est unique |
| les dangers ressemblent à du debug | disque + hachures + ambre, identique aux quatre |
| aucune composition | quatre tables de rectangles dans la même gamme de taille |

**La masse à l'écran, c'est l'obstacle.** Un semis de props ne rattrape pas une
architecture commune.

---

## Les quatre langues

Le socle commun reste : sci-fi industriel sombre, ambre de signal réservé au
gameplay, télégraphes jamais concurrencés. **La différence est structurelle** :
forme, matière, source de lumière, danger.

| | FRICHE | USINE | FONDERIE | NÉBULEUSE |
|---|---|---|---|---|
| **verbe** | a été laissée | fabrique | coule | flotte |
| **forme** | fracturée, effondrée, jamais d'angle droit tenu | modulaire, orthogonale, répétée | massive, trapézoïdale, lourde | ajourée, longue, suspendue |
| **matière** | béton lavé, rouille, grillage | tôle peinte, panneaux, rails | brique réfractaire, fonte brûlée | panneau composite, treillis |
| **source de lumière** | presque aucune — un tube qui grésille | bandes LED ambrées, nombreuses | **le sol et la gueule des fours** | feux de position froids + la nébuleuse |
| **ambiante** | gris froid, plate, morte | anthracite neutre | brun-rouge chaud | bleu nuit profond |
| **danger qui blesse** | câble sous tension, flaque toxique | arc industriel, jet de vapeur | coulée en fusion, grille chaude | anomalie plasma, champ de radiation |
| **danger qui ralentit** | gravats et boue | convoyeur, caillebotis | scorie en refroidissement | puits de gravité |
| **premier plan** | grillage affaissé | passerelle et conduites | cheminées et fumée | haubans et antennes |

**La règle de non-régression** : si on échange les quatre noms et que les
captures restent difficiles à attribuer, le lot n'est pas fini.

---

## Ce qui ne bouge pas

- **Le gameplay.** Rayons, dégâts, ralentissements, collisions, apparitions :
  aucun chiffre ne change. Un danger reste **un disque de collision** ; seule sa
  représentation change.
- **La lisibilité.** Un danger s'annonce toujours par sa géométrie permanente,
  et sa surface reste **lisible au bord près** : une coulée en fusion doit dire
  où elle s'arrête aussi bien que le cercle qu'elle remplace.
- **L'ordre de dessin.** La lumière s'arrête avant le premier élément de
  gameplay. Rien de ce plan ne se dessine après.
- **Le contrat `low`.** Palier de qualité = coût de rendu. La direction
  artistique vaut à tous les paliers.
- **Le réseau.** Le biome reste deux nombres.

---

## Les lots

| # | lot | ce qui change |
|---|---|---|
| **1** | la charte de lieu | `BIOME_SKIN` dans `palette.js` : un lieu déclare sa couleur d'arène, son bloc, son accent, ses dangers. Les quatre sols se séparent enfin. |
| **2** | l'architecture | `render/blocs.js` : quatre familles de silhouette et d'habillage. `ledDe()` devient la source émissive d'un bloc, teinte comprise. |
| **3** | les dangers diégétiques | `render/dangers.js` : table `(biome, kind) -> dessin`. Le collider reste, le cercle disparaît. |
| **4** | la composition | `biomes.js` : quatre implantations avec un rythme dense/ouvert, des empreintes qui varient, `verifierBiomes()` toujours muet. |
| **5** | le sol, le fond, le bord | `material.js` par biome, nébuleuse au fond, `drawPremierPlan()` par lieu. |

**Un lot = un commit = un bump.** Le plan 13 occupait `0.16.x`, le plan 14
ouvre **`0.17.x`**.
