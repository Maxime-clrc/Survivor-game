# Survivor — mesures et reglages

Ce fichier ne contient QUE ce qui ne se relit pas dans le code : les chiffres
releves en simulation, les reglages qui en decoulent et les limites connues.
Les regles du projet vivent dans `CLAUDE.md`, le catalogue dans `shared/`.

**Remesurer plutot qu'extrapoler** quand un reglage change.

## Mesures relevées

### La horde ne manquait pas, elle traînait (0.43.43)

`_recyclerLoin` retirait tout corps à plus de `RECYCLE_DIST` (2 400 px) de tout
joueur. C'était juste quand l'arène faisait quelques vues. Sur 14 400 × 8 100, le
joueur va à **260 px/s** et le corps le plus rapide du bestiaire à **156** : il
suffit de tourner large pour semer la horde définitivement, et le retrait finit le
travail.

Solo, normal, 280 s (avant le premier boss), 3 graines × 2 biomes, bot à visée
tournante. **Corps dans la vue, en moyenne :**

| déplacement | avant | après |
|---|---:|---:|
| immobile | 8,7 | 8,7 |
| boucle de 600 px | 40,9 | 41,4 |
| boucle de 1 200 px | 14,0 | 14,4 |
| boucle de 2 000 px | **4,7** | **17,1** |
| boucle de 3 000 px | **3,9** | **17,0** |
| fuite en ligne droite | **7,4** | **15,8** |

**Où étaient-ils.** Boucle de 2 000 px, répartition des vivants par distance :

| | < 500 | < 900 | < 1 400 | < 2 400 | > 2 400 |
|---|---:|---:|---:|---:|---:|
| avant | 1,8 | 3,6 | 9,1 | **32,1** | 0,4 |
| après | 11,9 | 14,2 | 14,0 | 6,5 | 0,5 |

70 corps vivants sur un plafond de 220, et **32 dans la bande morte** — au-delà de
la vue, en deçà du seuil de retrait. Ni vus, ni retirés, ni reposés.

**Les deux seuils n'ont pas la même raison.** Retirer doit être franchement plus
loin que la boîte d'apparition, sinon un corps naît et meurt aussitôt. Reposer n'a
qu'une contrainte : être hors vue **des deux côtés du saut**. Demi-diagonale de
vue 918 px, boîte à 860 d'un bord et 1 000 d'un coin, donc `REPOSE_DIST` = 1 600
laisse 600 px de jeu — environ quatre secondes avant le tour suivant.

**Un côté et pas trois.** Répartir la repose entre le cap et les deux flancs
(1/2, 1/4, 1/4) a été mesuré et rendu : 9,9 en fuite contre 15,8, 14,7 en boucle de
2 000 contre 17,1. Le bord de la boîte fait déjà 1 720 px de large, l'étalement
latéral est dedans.

#### Le vérificateur a mordu à sa première exécution

`verifierRepose` compare, il ne suppose pas : un joueur qui tourne large doit voir
au moins **0,8 fois** ce que voit un joueur immobile.

| rapport boucle 2 000 / arrêt | graine 7 | 101 | 4242 |
|---|---:|---:|---:|
| calme, avant | 0,41 | 0,28 | 0,46 |
| calme, après | 1,08 | 1,06 | 1,60 |
| normal, avant | 0,69 | 1,11 | 0,57 |
| normal, après | 2,66 | 1,71 | 2,05 |
| cauchemar, avant | 1,11 | 0,95 | 0,71 |
| cauchemar, après | 2,26 | 2,25 | 3,17 |

Son second critère — **rien ne se matérialise sous les yeux** — a trouvé un défaut
au premier essai : trois corps reposés **dans** une bande de trame ressortaient par
`_obstacleBlock` sur le bord le plus proche, soit dix pixels **dans** la caméra,
après un saut de 2 180 px. D'où les trois essais contre `_inObstacle`.

**La vue est la caméra, pas le joueur** : elle se bloque aux bords de l'arène, donc
au bord le joueur n'est plus au centre. Mesurer autour de *lui* comptait comme
visible ce que `_pushOffScreen` venait légitimement de poser dehors.

#### Ce que dit le reste du mode `--tout`, avant et après

`encerclement`, `determinisme`, `indices`, `groupes` et `vitesses` restent verts.
Les deux rouges sont **antérieurs**, et le relevé le montre :

| | avant | après |
|---|---|---|
| `deplacement` | poche en U / cible mobile : 5/60 bloqués | **identique** |
| `traits` | 9 préavis pour un budget de 8, en cauchemar 2j **et** 4j | 9 préavis, en cauchemar 2j **seulement** |

`_windupSature` compte au **départ** du préavis et seulement pour les joueurs qui
voient déjà le corps : un corps qui s'arme hors champ puis entre dans la vue n'est
compté par personne. Le budget peut donc être dépassé sans que rien ne l'écrive,
et ça ne dépend pas de la repose.

**`verifierPopulation` n'est pas un critère rejouable** : `mesurePopulation` fait
`new GameState(diffIndex)` **sans graine**, donc deux exécutions du même code
rendent deux verdicts. Mesuré : 15 puis 14 problèmes avant, 19 puis 17 après, et la
ligne « X à 30 cartes selon l'effectif » apparaît dans une exécution sur deux **des
deux côtés**. Aucune des quatre ne signale de saturation. Tant qu'il tire sa graine,
on ne peut rien lui attribuer.

### Un tronçon de trame est borné par le détour qu'il impose (0.43.42)

`bande()` tirait son nombre de tronçons à **l'arrondi** : à `L / TRAME_PAS` = 1,15
il rendait 1, donc `max(2, n)` = 2 et des tronçons de **3 680 px** — 184 m de mur
dont la seule brèche est au milieu, soit **92 m à longer avec la horde au dos**,
sept secondes à `PLAYER_SPEED` (260 px/s).

Relevé sur 5 graines × 3 modes, en ne gardant que ce qui est long (axe long
≥ 600 px, épaisseur ≤ 160 px) — c'est-à-dire la trame et rien d'autre : aucun bloc
de cellule ne dépasse 288 px.

| longueur de tronçon | médiane | p90 | max | ≥ 2 000 px |
|---|---:|---:|---:|---:|
| usine | 1 400 → 1 307 | 2 880 → **1 333** | 3 680 → **1 632** | 81 → **0** |
| fonderie | 1 440 → 1 307 | 2 907 → **1 333** | 3 680 → **1 540** | 66 → **0** |
| friche | 1 080 → 1 167 | 2 880 → **1 328** | 3 680 → **1 333** | 39 → **0** |
| nébuleuse | 1 120 → 1 320 | 2 880 → **1 333** | 3 680 → **1 333** | 71 → **0** |
| secteur | 768 → 1 200 | 2 907 → **1 333** | 3 680 → **1 540** | 90 → **0** |

`ceil` borne le tronçon au pas — `seg ≤ L / ceil(L / PAS) ≤ PAS` — et le pas,
ramené de 3 200 à **1 800**, borne le détour à une demi-vue. Ce qui protège la
région ne bouge pas : au moins deux tronçons, donc au moins une brèche.

**Le bâti ne maigrit pas.** Surface d'arène, moyenne de 5 graines × 3 modes :

| | bâti total | dont trame |
|---|---:|---:|
| usine | 5,00 → 4,88 % | 1,82 → 1,70 % |
| fonderie | 6,11 → 5,95 % | 1,87 → 1,70 % |
| friche | 4,55 → 4,46 % | 1,66 → 1,55 % |
| nébuleuse | 5,14 → 5,04 % | 1,50 → 1,41 % |
| secteur | 4,65 → 4,51 % | 1,91 → 1,76 % |

#### Le plancher de `verifierDebord` suit la longueur des morceaux

Un morceau franchit d'autant plus souvent une frontière **qu'il est long** : la
part de morceaux passant de plus de 100 px chez la voisine tombe de **8,0 % à
4,0 %** (25 graines) sans que `TRAME_DEBORD` ait bougé d'un pixel. Le plancher de
3 % mesurait donc la longueur, pas le débord.

Sur **trente fenêtres de six graines** — la taille de l'échantillon du
vérificateur — la part vaut **1,8 % au pire**, 2,1 % au p10, 3,6 % en médiane,
5,1 % au mieux : à 3 % il rougissait une fenêtre sur deux. Plancher ramené à
**1,5 %** ; les six graines par défaut donnent 2,4 %.

**Les émigrés ne sont pas une régression** : 5 sur 25 graines avant, 6 après —
`decouper` échantillonne au pas de `L / round(L / 40)` et le vérificateur tous les
20 px, donc un morceau à 45/55 passe d'un côté chez l'un et de l'autre chez
l'autre. Élargir le jeu de graines du vérificateur le ferait rougir sur un défaut
qui existait déjà (friche/g44 : 220 px sur 402).

### Une structure coupée à la règle signale la frontière (0.43.41)

Le sol fond (0.43.39), le semis se mélange (0.43.40), et la **trame** — la plus
grosse chose de l'écran, jusqu'à 3 680 px — s'arrêtait toujours net sur le bord de
cellule. `garde()` rejetait tout morceau dont la cellule n'appartenait pas au
district, et `decouper()` tronçonnait la bande dessus. Une machine qui s'interrompt
sur une frontière invisible est ce qui **signale** la frontière.

**Deux corrections, et il faut les deux.**

1. Le **point gauchi** (`pointMel`, le seul gauchissement du dépôt) : la coupe suit
   la même courbe que le sol et le semis au lieu de la ligne de grille.
2. Le **débord** : on relit le district à `TRAME_DEBORD` px **vers le barycentre**
   de la région. Un morceau qui dépasse de moins que ça y retombe, donc il
   traverse.

Le centre est le **barycentre des cellules**, pas celui de la boîte : un quartier
n'est pas convexe, et le centre de sa boîte peut tomber chez la voisine — la
direction du rappel pointerait alors vers l'extérieur.

| 60 cartes (5 thèmes × 12 graines) | avant | après |
|---|---:|---:|
| morceaux de trame posés | 2 065 | 2 092 |
| dépassement moyen | 2 px | **23 px** |
| morceaux passant de plus de 100 px | **0,0 %** | **7,2 %** |
| plus grand dépassement | 80 px | **1 180 px** |
| extrémités à moins de 60 px d'une ligne de grille | 8,8 % | **4,9 %** |
| surface bâtie | 122,5 Mpx | 124,5 Mpx |

**260 px n'est pas un goût.** Zéro coupe à la règle ; au-delà d'un demi-écran une
trame entière émigre. À 260, un morceau isolé ne peut pas vivre dans le débord —
il serait plus court que `TRAME_TRONCON_MIN` (300) et serait jeté.

#### Le vérificateur ne mordait pas, et c'était le premier jet

`verifierDebord` comptait d'abord « le morceau touche deux districts ». **C'est
vrai 8,2 % du temps sans aucun débord** : `decouper` teste le milieu de ses pas,
donc un morceau dépasse toujours d'un demi-pas. Réinjecter `TRAME_DEBORD = 0`
laissait le vérificateur **vert**.

Il échantillonne maintenant le morceau sur sa **longueur** et compte les pixels
passés chez la voisine. Preuve qu'il mord : `TRAME_DEBORD = 0` sort
`0.0 % des morceaux de trame passent de plus de 100 px chez la voisine`.

#### Deux fuites qu'il a sorties dès sa première exécution

| fuite | cause | correction |
|---|---|---|
| une structure entière chez la voisine | `L <= TRAME_TRONCON_MIN` n'est testé qu'à son **centre** | `chezSoi(centre)` exigé |
| **360 px sur 520** chez la voisine | un tronçon qui **longe** une frontière ondulée a son milieu dedans et les deux tiers dehors | la **moitié des pas** au moins chez elle |

Le second est le plus instructif : le centre seul semblait suffire, et il ne
suffit pas dès que la frontière n'est plus une droite.

**Ce qui protège le jeu n'a pas bougé** : budget de surface, écart aux dangers, et
surtout `TRAME_GARDE`, testé contre **toutes** les trames déjà posées et pas
seulement celles de la région — un débord ne peut donc pas fabriquer un goulot.
`passages`, `navigation`, `superpositions` et `biomes` restent verts.

#### Ce qui ne change pas : les blocs de cellule

Un bloc porte la loi de **sa** cellule, sans exception — c'est ce qui fait qu'une
région se lit, et `verifierRegions` l'exige. On ne l'a pas touché : 0.42.1 avait
déjà mesuré qu'**à une dizaine de blocs par écran, une loi d'implantation ne se
voit pas**. Ce n'était pas le canal de la couture, et le rendre flou aurait coûté
l'identité pour rien.

### Le semis s'arrêtait à la règle, lui aussi (0.43.40)

0.43.39 a fondu le **sol** ; le **semis** basculait toujours au bord de la
cellule. Sur la capture de contrôle (usine, graine 7, carrefour ↔ traitement),
au-dessus de la ligne on ne voyait que des plaques rayées et en dessous que des
caisses sombres — la droite avait disparu du sol et se relisait dans les objets.

**Une seule distinction, et elle vient de ce que sont les choses.**

| ce qui bascule | nature | traitement |
|---|---|---|
| `dens` (0,52 → 1,34, **×2,6**) | quantité | moyenne pondérée |
| `ech` (0,56 → 0,96) | quantité | moyenne pondérée |
| `zones` (catalogue) | catégoriel | **tirage** dans les poids |
| `matieres` (trace) | catégoriel | **tirage** dans les poids |

La moitié d'une caisse et d'une épave n'existe pas : un catalogue n'a pas de
milieu. On tire donc dans les poids avec le hachage déterministe que la cellule a
déjà, et **la part de chaque région sur une population est exactement son poids**.

**Le tirage est par prop, pas par cellule.** Par cellule, la maille de 200 px
redevenait visible à la frontière : on aurait remplacé une droite par un damier.

#### Le catalogue de raccord existait déjà

`TABLE[thème]` est le fonds commun — tout ce que le lieu possède, sans le
rangement par quartier — et `FUITE` en tirait déjà 18 % partout. Il suffisait d'en
tirer **plus** là où deux régions se rencontrent : un objet pris là n'appartient à
aucune des deux, donc il **relie** au lieu de désigner.

| position | part de fonds commun |
|---|---:|
| centre d'une région | 18 % (`FUITE`) |
| milieu exact du fondu | **34 %** (`FUITE_MEL`) |

Aucune nouvelle catégorie de props n'a été écrite : une table de plus aurait dû
être remplie pour cinq thèmes et soixante régions, et le dépôt a déjà mesuré
(0.43.14) que **le catalogue est le goulot, pas le rangement**.

#### Le comblement redessinait la droite

`quartierMonde` donne son quartier à un prop en terrain libre — c'est le repli
quand aucune architecture n'est à portée, soit 18 à 30 % des cellules. Il lisait la
cellule **brute** : il reposait donc la droite exactement là où le sol venait de
cesser de la montrer. Il lit maintenant le point gauchi, `pointMel` étant le seul
gauchissement du dépôt : les deux limites tombent au même endroit.

#### Ce que mesure `verifierTirage`

Un tirage a deux façons de mentir, et la seconde est la plus grave :

| question | seuil | mesuré |
|---|---|---|
| la part rendue est-elle le poids annoncé ? | écart < 12 % | vert sur 8 graines |
| un point **pur** tire-t-il sa propre région ? | toujours | vert (échec = arrêt immédiat) |

La seconde protège l'identité : une épave de la région d'à côté au milieu d'une
halle **ne lève rien**, et ne se verrait qu'à la capture d'écran. Coût : 23 ms.

Coût par image, caméra posée sur la frontière, 180 images : **5,60 ms de médiane**,
identique à avant le plan — le semis ne tourne qu'au changement de fenêtre.

### Le sol d'une région s'arrêtait à la règle (0.43.39)

Rapport de terrain, capture à l'appui : trois régions se rencontrent et on voit
**deux droites**. Texture, densité, motifs et décoration basculent toutes au même
pixel — « l'impression que trois générateurs ont été assemblés bord à bord ».

**La cause est une seule ligne**, `loiAt(b, x, y)` : la région d'un point est
`lois[floor(y / ch) * cols + floor(x / cw)]`, avec `cw × ch = 1600 × 900`,
c'est-à-dire **une vue**. C'est une fonction en escalier sur une grille dont la
maille fait un écran, donc :

- une frontière est une **droite axiale** longue d'au moins un écran ;
- il n'existe **aucune** zone de transition, la notion n'est écrite nulle part.

Le bruit de `districtsDe` déplace l'appartenance d'une **cellule**, pas d'un
pixel : à l'intérieur d'une cellule la limite reste une droite.

Ce qui bascule, tout en même temps, et de combien :

| axe | lecture | amplitude mesurée |
|---|---|---|
| teinte du sol | `solDe(mx, my).arena` par cellule | **dE 11,1** (usine), 11,3 (secteur), 11,0 (fonderie) |
| matière du sol | `floorPattern(…, loiAt)` | passe `TRAITEMENT` entière |
| densité du semis | `airDe(thème, loi).dens` | **0,52 → 1,34, soit ×2,6** |
| matière des traces | `AIR[…].matieres` | changement net |
| taux de baie | `BAIE_REGION[clé][loi]` | 0,04 → 0,62 |

**C'est la synchronisation qui fait le patchwork**, pas l'écart de chaque axe pris
seul. Les blocs, eux, ne sont pas en cause : une dizaine par écran, et 0.42.1
l'avait déjà mesuré comme invisible.

#### Ce que rend le champ de poids

`poidsAt` remplace l'entier par un **vecteur** : au centre d'une région un seul
poids vaut 1, sur une frontière deux se partagent l'unité, à un coin de trois
régions trois. Le voisinage est le 2 × 2 des centres de cellule, donc une jonction
triple n'est **pas** un cas particulier — elle tombe du même calcul.

| mesure | 10 graines × 81 cellules |
|---|---|
| centres de cellule d'une région **pure** | **100 %** (810 / 810) |
| centres dont la dominante n'est pas leur loi (îlots) | **0** |
| points de l'arène en transition | **14,8 %** |
| errance de la frontière (`ONDULE 0,19`) | **± 190 px** sur 900 px de haut |
| coût de `verifierMelange(10)` | 32 ms |

Le noyau a un **plateau** (`LARGE = 0,24` cellule, soit 768 px de bande) : un
noyau bilinéaire ordinaire aurait fondu sur une cellule entière, donc pur nulle
part sauf au centre exact. Les deux noyaux d'un axe somment à 1 **exactement**,
`smoothstep` étant antisymétrique autour de ½.

**Le gauchissement est ce qui tue la droite** : on ne déforme pas la frontière, on
déplace le point d'échantillonnage (deux octaves de bruit de valeur). Sans lui le
plateau ne fait qu'épaissir une droite, et une droite épaisse reste une droite.

#### La largeur suit la paire

Une largeur unique se trompe des deux côtés. L'écart se lit sur la **teinte du
sol** — le seul axe que les deux côtés du fondu partagent — et pilote un exposant
sur le vecteur, qui déplace la mi-pente sans toucher aux bouts.

| paire (usine) | dE | exposant | effet |
|---|---:|---:|---|
| chaîne / traitement | 0,00 | 1,90 | fondu resserré : rien à fondre |
| carrefour / traitement | 5,54 | 0,91 | fondu franc |
| maintenance / utilités | 11,11 | 0,62 | fondu étalé |

#### Le sol se peint par couche, plus par cellule

Un motif est un `fillStyle` : il n'a pas d'opacité par pixel. On peint donc la
région entière hors écran et on la ramène à travers un **masque** de 52 × 32
texels (un pour 32 px), redimensionné par le navigateur — le champ de poids est
lisse et de très basse fréquence, donc l'interpolation bilinéaire du blit **est**
le fondu. **52 × 32 évaluations par image au lieu de 1 440 000.**

La première couche est **opaque**, les suivantes ont `w / S`. Empiler k couches à
leur poids laisserait passer le fond entre elles : `a1 + a2 = 1` ne dit rien de
`(1 − a1)(1 − a2)`, qui vaut `a1 × a2`. Avec l'opacité courante le résultat est
exactement la moyenne pondérée, et `loisEnVue` met la région de la caméra en tête.

**Une seule région en vue ne paie rien** : deux `fillRect`, le chemin d'avant au
pixel — c'est le cas au centre d'un biome, donc le plus fréquent.

Combien de couches `drawFloor` doit peindre, sur 30 cartes et toutes les positions
de caméra au pas de 150 px (2,7 millions de vues) :

| couches | part des vues |
|---:|---:|
| 1 (chemin d'avant) | 35,7 % |
| 2 | 48,1 % |
| 3 | 15,7 % |
| 4 | 0,6 % |

Quatre est le maximum atteignable et il est **structurel** : le noyau est le 2 × 2
des centres de cellule.

#### Une jonction de trois régions n'est pas un cas particulier

C'est le reproche exact du rapport — trois transitions indépendantes fabriqueraient
une **quatrième** couture au centre. Le voisinage 2 × 2 rend jusqu'à quatre poids,
donc la jonction tombe du même calcul. Mesuré au coin où les cellules (3,3) = 8,
(4,3) = 1, (3,4) = 6 et (4,4) = 6 se rejoignent (usine, graine 7) :

| point | poids |
|---|---|
| (6400, 3600) | loi 6 **42 %**, loi 1 **35 %**, loi 8 **23 %** |
| (6400, 3500) | loi 1 69 %, loi 8 27 %, loi 6 3 % |
| (6300, 3700) | loi 6 88 %, loi 8 8 %, loi 1 4 % |

Coût mesuré, Chrome headless, caméra **posée sur la frontière** (usine, graine 7,
carrefour ↔ traitement), 180 images :

| | médiane | p95 | max |
|---|---:|---:|---:|
| avant | 5,60 ms | 6,00 | 7,80 |
| après | 5,50 ms | 6,00 | 8,70 |

Rien de mesurable : le masque est minuscule et les couches ne se paient que là où
il y a une frontière.

**Protocole** (rejouable) : `GRAINE=7 BIOME=usine BAC=1 node server.js` sur un port
dédié, Chrome `--headless=new --remote-debugging-port`, CDP pour créer un compte,
une salle, lancer la manche, puis `q` 3 000 ms et `z` 1 700 ms — la caméra arrive
sur le coin où les cellules (3,3)=8, (4,3)=1, (3,4)=6 et (4,4)=6 se rejoignent.

### L'Usine était le seul thème entièrement dans le noir (0.43.38)

La lumière au sol est un des dix axes de différenciation, et il ne fonctionne que
par **contraste** : des régions éclairées **et** des régions noires. Mesure :

| thème | éclairées | noires |
|---|---:|---:|
| **usine** | **0 / 12** | 12 |
| fonderie | 4 | 8 |
| friche | 3 | 9 |
| nébuleuse | 6 | 6 |
| secteur | 10 | 2 |

**L'Usine est le seul lieu dont le verbe soit au présent** — le seul où quelque
chose fonctionne encore — et c'était le seul entièrement noir, quand le Secteur
en avait dix sur douze. Une contradiction, pas un réglage.

Deux props suffisent, et **les deux avaient déjà un voyant dessiné** : il ne
manquait que le halo. Le **coffret haute tension** (quartier de l'énergie) et le
**bras robotisé** (quartier de la production) — cinq régions passent à
l'éclairage, sept restent noires.

**Deux comportements, pas un.** Le coffret **respire** : un appareil sous tension
a un rythme lent et régulier. Le bras **clignote en bout de course** : court, sec,
et il ne s'éteint jamais tout à fait — un mouvement continu et périodique n'est
pas un télégraphe, et ce canal-là appartient au boss.

`verifierLumiereSol` refuse les deux extrêmes — un thème **sans aucune** source,
un thème **sans aucune** région noire. Il n'exige pas de quota : une Friche
presque noire est **juste**, c'est un lieu abandonné. Preuve qu'il mord : retirer
les deux entrées sort `usine : aucune region n a de source au sol`.

Total : **28 régions sur 60** portent une source au sol, contre 23.

### Une bitte et une bande de trame projetaient la même ombre (0.43.37)

`OBST_OMBRE` était un décalage **fixe de 9 px** pour tous les blocs — d'une bitte
d'amarrage de 40 px à une bande de trame de **3 680**. Un pylône de 22 × 207 et
une dalle de 176 × 36 projetaient exactement la même ombre.

Ce qui décale une ombre portée est la **hauteur**, et un rendu vu de dessus ne la
modélise pas — mais la **silhouette la porte déjà** : un mât est haut et fin, un
mur bas est bas et long, une nappe est un creux.

| hauteur | décalage | silhouettes |
|---|---:|---|
| bas | **5 px** | `mur_bas`, `nappe`, `debris`, `quai`, `barre`, `eclat`, `conduite` |
| moyen | 9 px | `caisson`, `machine`, `chassis`, `conteneur`, `ouverte`, `cadre`, `masse_molle` |
| haut | **16 px** | `mat`, `fut`, `octogone`, `palettier`, `pile`, `travee`, `pan`, `devanture` |

**Trois valeurs et pas une échelle continue** : au-delà de trois, l'œil ne lit
plus une hauteur, il lit du bruit. Le moyen reste 9 px, donc rien ne bouge pour
les deux tiers du dépôt — c'est le bas et le haut qui se séparent enfin.

C'est le troisième défaut de la même forme corrigé sur ce plan : `lumDir()`
unifiait la **direction** de l'ombre, `ombre()` en a unifié la **force** au lot
35, et le **décalage** était la dernière des trois à ne rien dire de l'objet.

`verifierBlocs` croise `SILHOUETTE` et `HAUTEUR` **dans les deux sens** : le repli
de `hauteurDe` est `H_MOYEN`, donc une silhouette oubliée prendrait l'ombre
d'avant sans que rien ne lève — exactement la classe de défaut que ce plan a payée
quatre fois. Preuve : retirer `mat` sort `silhouette « mat » : aucune hauteur
declaree`.

Et `OBST_OMBRE` est **supprimée**, pas conservée : sa seule lecture était morte.

### Le taux de baie était le dernier axe resté au thème (0.43.36)

`BAIE_TAUX` était une **constante unique à 0,38** : ce qu'on voit **à travers** le
sol disait le thème, et jamais l'endroit. C'était le dernier des dix axes de
différenciation du §8 encore attaché au thème — et le dossier le classait **rang 2
de son top 10**, pour un coût nul : un paramètre qui existait déjà, aucun dessin
neuf.

| | avant | après |
|---|---:|---:|
| taux de baie distincts | **1** | **24** (12 par thème) |
| amplitude, nébuleuse | — | 0,04 (coursive) → **0,65** (dérive) |
| amplitude, secteur | — | 0,04 (ruelle) → **0,58** (berge) |

**Deux thèmes seulement, et c'est structurel** : les trois autres n'ont pas de
`fond`, donc `drawBaies` sort avant d'y arriver. Régionaliser un taux là où il n'y
a rien à voir n'aurait aucun sens.

**Zéro est permis et il est utilisé.** La coursive de la Nébuleuse est un volume
**clos**, la soute est **aveugle**, la ruelle du Secteur est un canyon : trois
régions où le sol ne montre rien, et c'est ce contraste qui fait lire les autres.
La serre monte à 0,62 parce qu'une serre **est** une verrière.

`verifierBaies` gagne trois refus :

- un lieu **à fond** sans taux de région — il prenait `0` en silence, donc plus
  une seule ouverture et le fond disparaissait sans que rien ne lève ;
- un taux pour une région qui n'existe pas, ou pour un lieu **sans** fond ;
- **un écart de moins de 0,30 entre les douze régions d'un thème** — douze taux
  identiques, c'est le réglage d'avant sous un autre nom.

Preuve qu'il mord des deux côtés : retirer `derive` sort `nebuleuse/derive :
aucun taux de baie` ; mettre les douze régions du Secteur à 0,30 sort `tous les
taux de baie tiennent en 0.00 — le fond ne dit plus l endroit`.

### Une règle écrite puis retirée : l'inclusion est structurelle (0.43.35)

**La chaufferie de l'Usine contenait DEUX inventaires entiers**, celui de la
maintenance et celui des utilités, à **67 %** chacun — le seul cas de double
inclusion à ce ratio. Une chaufferie a un circuit d'eau : elle tire donc
l'énergie et le **traitement**, et les deux singletons redescendent à 57 et 43 %.

| | inclusions strictes | dont ≥ 67 % |
|---|---:|---:|
| avant | 52 | **6** |
| après | 52 | **4** |

**Et la règle « une région ne peut pas contenir deux inventaires entiers » a été
écrite, mesurée, puis retirée.** Elle sortait **14** cas, pas un — et
l'arithmétique le prédit : une région à deux quartiers `[a, b]` contient
**nécessairement** toute région qui ne tire que `a` ou que `b`. Avec cinq à sept
quartiers pour douze régions, les singletons sont inévitables, donc toute paire
en contient deux.

C'est le même verdict qu'au lot 0.43.11 sur la table de classe des traces : une
règle qui garde un cas **impossible** se supprime, elle ne se relâche pas. Ce qui
reste vrai est ce que le dépôt avait déjà décidé au lot 20 — **un inventaire
étroit est une identité, pas un manque** — et ce qu'il faut surveiller n'est pas
l'inclusion mais le **ratio**, que `verifierVocabulaire` plafonne déjà à 70 %.

Pire recouvrement de props après correction : **67 %** (fonderie crassier/labo),
et il est structurel — une zone de 4 props incluse dans une paire de 6 donne 4/6
exactement.

### Dix-sept opacités pour la même ombre (0.43.34)

`lumDir()` unifie la **direction** de l'ombre depuis le plan 13, avec sa raison
écrite : *deux ombres qui pointent différemment sur le même écran est LE défaut
visible d'un rendu 2D*. La **force** n'avait pas de point de passage.

| | avant | après |
|---|---:|---:|
| sites qui dessinent l'ombre d'un prop | 82 | 82 |
| **valeurs d'opacité distinctes** | **17** | **1** |
| amplitude | 0,16 → 0,55 (**× 3,4**) | 0,34 |

0,34 est la médiane et ce que **23 props sur 61** portaient déjà. Sept props
n'ont aucune ombre et c'est juste : la flaque, le marquage, le passage, l'allée,
le néon tombé, le cristal et le givre n'ont pas de volume.

`npm run constantes-check` refuse désormais un littéral à cette place — il lisait
déjà les sources pour trouver une constante sans lecteur, il trouve maintenant
aussi le symétrique : **une valeur écrite en dur là où un point de passage
existe**. Preuve qu'il mord : remettre un `alpha(PROP.ombre, 0.42)` sort
`1 fois l opacite de l ombre d un prop en dur — passer par ombre()`.

---

**LES ONZE FAMILLES DE PROPS PARAMÉTRIQUES DU DOSSIER NE SERONT PAS ÉCRITES.**

Le §F.3 promettait « 11 fonctions de dessin paramétrées au lieu de 48 ». Mesure
sur les **68 props réels**, en comparant les suites d'appels canvas :

| paire | similarité |
|---|---:|
| `rail` / `eprouvette` | **100 %** |
| `caisses` / `cageot` | 100 % |
| `cable` / `gaine` | 100 % |
| `grilleAir` / `transpalette` | 100 % |

`rail` dessine deux files parallèles avec des traverses ; `eprouvette` dessine un
portoir à trois tubes. **Ce n'est pas le même dessin, c'est la même grammaire** —
`fillRect`, `arc`, `alpha`, et rien d'autre. La mesure qui donne 100 % est aveugle
au sujet, et c'est exactement l'hypothèse sur laquelle reposait le §F.3.

Ce qu'une paramétrisation factoriserait réellement : le prologue d'ombre et la
taille tirée de `p.p`, soit **~11 % des 1 373 lignes** de dessin — au prix d'une
table de paramètres par instance, d'une indirection de plus, et du risque de
props génériques que le **§9 du cahier des charges refuse explicitement**.

**Le prologue d'ombre est donc factorisé seul.** Le reste ne l'est pas, et c'est
la même règle que partout ailleurs dans ce dépôt : on ne mutualise que ce qui
sert plusieurs endroits, et une mesure décide.

### La Friche passe à douze, et les cinq thèmes y sont (0.43.33)

| région | sol | famille à elle | trame |
|---|---|---|---|
| **la sous-station** | `technique` | chapelet d'isolateurs | crible de socles |
| **la station-service** | `marque` | pompe | peigne d'îlots |
| **la lagune** | `ajoure` | bassin de décantation | nef à ciel ouvert |

- **La sous-station est le seul alignement VERTICAL du thème.** La Friche est
  faite de choses tombées ; ces chapelets tiennent encore debout parce qu'on ne
  démonte pas un poste sous tension, et personne ne sait s'il l'est. La
  porcelaine est aussi la seule chose du thème que le temps n'a pas salie : rien
  n'adhère sur du verre.
- **La station-service fait lire une ABSENCE.** Les pompes sont par paires, à
  distance régulière, et cette régularité au milieu du désordre dit qu'il y avait
  un auvent au-dessus.
- **La lagune est le quatrième creux du dépôt et le premier de la Friche.** La
  fosse du puits est noire, le bac du traitement est plein, la fontaine du parc
  renvoie le ciel ; celui-ci est **sec**, son fond est craquelé, et ce qui
  repousse dedans pousse mieux qu'ailleurs — la seule végétation du dépôt qui
  soit un **indice**.

**Les six socles sont en QUINCONCE, et c'est la carte des dangers qui l'a
imposé.** Une rangée franche à `y = 0,24` traversait la nappe de 121 px de
`(0,42 ; 0,24)` et celle de 105 px de `(0,86 ; 0,24)`, plus leurs quatre miroirs.
Le quinconce garde l'alignement **vertical**, qui est ce qui se lit, et abandonne
l'alignement horizontal, qui ne se lit pas.

---

**LES CINQ THÈMES SONT À DOUZE RÉGIONS.**

| | ouverture du plan 39 | 0.43.33 |
|---|---:|---:|
| régions | 20 | **60** |
| régions avec une famille exclusive | **0** | **60** |
| familles bâties | 15 | **91** |
| props | 48 | **69** |
| primitives de trace | 9 | **21** |
| traitements de sol | **1** | **13** |
| primitives de trame | **0** | 6 |

Bâti par thème en cauchemar, pour un plafond de 10 % : usine 7,09 %, fonderie
7,48 %, friche 5,46 %, nébuleuse 7,02 %, secteur 5,27 % — aucun thème ne touche
plus le plafond, donc plus aucune signature ne disparaît par manque de place.

Pire Jaccard bâti entre deux régions d'un thème : **0,50**, sur 330 paires.

### La Fonderie passe de neuf régions à douze, et la règle des six quartiers était fausse (0.43.32)

| région | sol | famille à elle | trame |
|---|---|---|---|
| **les silos** | `bitume` | silo | crible de cylindres |
| **le crassier** | `terre` | crasse | couronne |
| **le laboratoire** | `resine` | paillasse | peigne de paillasses |

- **Les silos sont la seule verticale de la Fonderie.** Tout le thème est bas :
  des fours trapus, des bassins, des châssis au sol. Ce qui dit la hauteur d'un
  cylindre vu de dessus est **l'anneau de passerelle** qui le ceinture.
- **La crasse est la même masse molle que le tas de minerai, et c'est la couleur
  qui les sépare** : le minerai est rouge et mat, la scorie refroidie est grise
  et **vitreuse** — elle accroche des points de lumière que rien d'autre du thème
  ne fait. Deux bouts de la même chaîne, une silhouette, deux matières.
- **Le laboratoire est le seul endroit de la Fonderie où rien ne soit ni chaud ni
  sale.** Il est à la modelerie ce que le contrôle est à la coulée : l'avant et
  l'après d'une chaîne dont tout le reste est le milieu.

**LA RÈGLE DES SIX QUARTIERS, ÉCRITE AU LOT 32, ÉTAIT FAUSSE.** Elle disait :
« quatre quartiers donnent six paires, cinq en donnent dix, il en faut quinze
pour douze régions ». Elle oubliait les **singletons** — une région peut ne tirer
qu'un quartier, et plusieurs le font déjà.

| quartiers | paires | singletons | combinaisons |
|---:|---:|---:|---:|
| 4 | 6 | 4 | **10** — insuffisant pour 12 |
| **5** | 10 | 5 | **15** — suffisant |

Ce qui a réellement forcé le sixième quartier à la Nébuleuse n'est donc pas le
**compte** mais le **recouvrement** : une paire qui contient un singleton partage
tout l'inventaire de ce singleton, et quand les deux zones ont des props en
commun le Jaccard dépasse 70 % — le champ d'antennes à `[0, 3]` contenait le dock
à **71 %**. La Fonderie s'en tire avec **cinq**.

**Et deux régions au même nombre de poses ne se séparent pas.** Les silos et le
laboratoire avaient tous deux six poses et un encombrement à 7 % près : **9 %
d'écart au mieux** sur six axes, pour un plancher de 15. Un silo de moins, et le
nombre devient ce qui les distingue.

| | régions | avec une signature | props | familles bâties |
|---|---:|---:|---:|---:|
| 0.43.31 | 54 | 54 | 67 | 84 |
| 0.43.32 | **57** | **57** | **69** | **87** |

Usine 12, Fonderie 12, Friche 9, Nébuleuse 12, Secteur 12. Pire Jaccard bâti :
**0,50**.

### La Nébuleuse passe de huit régions à douze, et six quartiers deviennent une règle (0.43.31)

| région | sol | famille à elle | trame |
|---|---|---|---|
| **la soute** | `poudre` | colis arrimé | peigne de travées |
| **le hangar** | `resine` | navette | nef de berceaux |
| **le condenseur** | `mouille` | échangeur | ruban de faisceaux |
| **la carrière** | `terre` | foreuse | couronne |

- **La soute est la seule région du thème où rien ne bouge parce que quelqu'un
  l'a voulu.** La Nébuleuse est faite de ce qui *dérive* ; ici chaque masse est
  sanglée à un rail, et les sangles débordent du bloc.
- **La navette est la seule coque INTACTE du thème** — toutes les autres sont
  crevées. C'est aussi la première fois que la silhouette `chassis` ne dit pas
  une épave : carcasse, remorque, et maintenant un vaisseau qui attend.
- **Le condenseur est le seul endroit mouillé d'un thème sans gravité**, et c'est
  précisément pour ça qu'il existe : l'eau d'une station ne tombe pas, elle se
  **dépose** sur ce qui est froid. Ses échangeurs sont le seul objet du dépôt
  dont les deux longs côtés ne disent pas la même chose — givre d'un côté,
  condensat de l'autre.
- **La carrière est la seule activité du thème qui PRODUISE quelque chose.**
  Partout ailleurs on répare, on amarre, ou on regarde dériver ce qui est déjà
  mort.

**SIX QUARTIERS POUR DOUZE RÉGIONS, ET C'EST DÉSORMAIS UNE RÈGLE.** Quatre
quartiers de props donnent six paires distinctes, cinq en donnent dix : à douze
régions il en faut quinze, donc **six quartiers**. La Nébuleuse est le troisième
thème à le payer, après l'Usine (lot 20) et le Secteur (lot 31). Le sien est
**ce qu'on transporte** — colis de fret, sangle larguée.

**Et la carte des dangers dessine la table.** L'axe `x = 0,50` de la Nébuleuse
appartient à une nappe de 99 px et à ses quatre miroirs, sur toute la hauteur :
les deux fronts de taille de la carrière tiennent donc les colonnes `0,18`,
`0,34`, `0,66` et `0,82`, et jamais le milieu.

| | régions | avec une signature | props | familles bâties |
|---|---:|---:|---:|---:|
| 0.43.30 | 50 | 50 | 65 | 80 |
| 0.43.31 | **54** | **54** | **67** | **84** |

Usine 12, Fonderie 9, Friche 9, Nébuleuse 12, Secteur 12. Pire Jaccard bâti :
**0,50**.

### Le Secteur passe de huit régions à douze, et quatre vues ne suffisaient plus (0.43.30)

| région | sol | famille à elle | trame |
|---|---|---|---|
| **le parc** | `vegetal` | fontaine | couronne |
| **la trémie** | `mineral` | mur de soutènement | nef à ciel ouvert |
| **la berge** | `poudre` | bitte d'amarrage | ruban de bittes |
| **le hall** | `resine` | banque d'accueil | crible d'îlots |

- **La fontaine est le troisième creux du dépôt, et le seul qui soit PLEIN.** La
  fosse du puits et le bac du traitement sont des vides ; celle-ci contient de
  l'eau, donc elle **renvoie** le ciel au lieu de l'avaler.
- **La trémie est la seule composition du jeu qui donne un SENS à une cellule** :
  deux murs de soutènement qui se rapprochent, et les contreforts d'un seul côté
  disent la direction de la pente.
- **La berge est la seule fois du dépôt où le hors-champ est une information.**
  Une file de bittes le long d'un bord, et rien au-delà : on comprend qu'il y a
  de l'eau derrière parce qu'elles s'alignent, et pour aucune autre raison.
- **Le hall est le seul intérieur PROPRE du Secteur**, et il n'est ni un commerce
  ni un logement. La banque d'accueil est la **quatrième matière du conteneur**,
  après la caisse, la carrosserie et le wagon.

**Un cinquième quartier de props, et c'est la troisième fois que l'arithmétique
le demande** — après l'Usine au lot 20 et la Nébuleuse au lot 27. Quatre
quartiers donnent six paires distinctes : à douze régions elles sont épuisées
bien avant. Celui-ci est le **mobilier urbain** (banc, jardinière, corbeille).

**QUATRE POINTS DE VUE NE SUFFISAIENT PLUS À `verifierDessin`.** Un thème porte
jusqu'à douze régions : à quatre vues et trois graines, une région sur douze
pouvait n'être atteinte par **aucune** vue — et avec elle sa trace et ses props.

| | vues par arène | régions max par thème |
|---|---:|---:|
| avant | 4 | 9 |
| après | **9** | 12 |

Mesure : `TRACE_EMPREINTE` a disparu du balayage **le jour où le Secteur est
passé à douze**. La table était juste, c'est l'échantillonnage qui ne l'était
plus — et c'est `tracesManquees()`, écrit au lot 24, qui l'a dit. Neuf vues
coûtent 0,1 s.

| | régions | avec une signature | props |
|---|---:|---:|---:|
| 0.43.29 | 46 | 46 | 62 |
| 0.43.30 | **50** | **50** | **65** |

Usine 12, Fonderie 9, Friche 9, Nébuleuse 8, Secteur 12. Pire Jaccard bâti :
**0,50**.

### L'Usine passe de neuf régions à douze, et le dépôt gagne un treizième sol (0.43.29)

| région | sol | famille à elle | trame |
|---|---|---|---|
| **la cour** | `terre` | benne | peigne de bennes |
| **la chaufferie** | `mineral` | chaudière | couronne |
| **la zone de charge** | **`resine`** | borne de charge | crible de bornes |

- **La cour est la première fois qu'on est DEHORS dans ce thème.** Les neuf
  autres régions de l'Usine sont des intérieurs : un sol coulé, un toit
  implicite, une lumière d'atelier. Ici c'est de la terre battue, et rien d'autre
  du thème n'en a.
- **La chaudière reprend l'octogone du four** — ce qui contient une combustion
  n'a pas de coin, quel que soit le thème. Ce qui la sépare du four est la
  **brique** : un four est en tôle, une chaudière est **maçonnée**, et c'est le
  seul appareil de l'Usine qu'on ait bâti au lieu de boulonner.
- **La borne de charge est à hauteur de genou**, et c'est la seule du thème :
  tout l'Usine est vertical. Son câble traîne au sol vers l'engin **absent** —
  c'est le câble qui dit qu'il manque quelque chose, et c'est tout le propos.

**LE TREIZIÈME TRAITEMENT DE SOL, ET IL DÉBLOQUE LES CINQ THÈMES.** `verifierMatiere`
exige un traitement différent par région d'un thème : à douze traitements, **douze
régions par thème** était un plafond dur. `T_RESINE` le lève.

**C'est aussi le seul sol du dépôt qu'on ait CHOISI pour sa couleur.** Les douze
autres sont ce que la matière donne — du béton, du gravier, de la terre, de
l'enrobé. Une résine époxy est coulée, teintée et lustrée par quelqu'un qui
voulait que l'atelier ait l'air propre. Elle porte donc une **intention**, et
elle a deux marques à elle : le **lustre** des passes de lisseuse, et les
**cloques** là où l'humidité du support est remontée — la seule usure du dépôt
qui soit un **contour** et non une tache. Un sol choisi vieillit mal, et il le
montre.

**Un rouge instructif** : `usine : « maintenance » et « charge » posent
EXACTEMENT les mêmes 4 props`. Les deux tiraient le quartier de l'entretien seul.
On charge des **engins**, donc la manutention vient avec — et les deux régions se
séparent à 50 %.

| | régions | avec une signature | traitements de sol |
|---|---:|---:|---:|
| 0.43.28 | 43 | 43 | 12 |
| 0.43.29 | **46** | **46** | **13** |

Usine 12, Fonderie 9, Friche 9, Nébuleuse 8, Secteur 8. Pire Jaccard bâti :
**0,50**. Bâti de l'Usine : 7,09 % en cauchemar pour un plafond de 10 %.

### La Fonderie passe de six régions à neuf (0.43.28)

| région | sol | famille à elle | trame |
|---|---|---|---|
| **la modelerie** | `marque` | rayonnage de gabarits | peigne de rayonnages |
| **l'ébarbage** | `technique` | cabine d'ébarbage | nef de cabines |
| **le parc à brames** | `ajoure` | brame empilée | crible de piles |

- **La modelerie est la seule pièce froide et sèche de la Fonderie.** On y taille
  les modèles *avant* de fondre quoi que ce soit : rien n'y est chaud, rien n'y
  coule, et c'est exactement ce qui la rend reconnaissable dans un thème où tout
  brûle. Elle reprend le **palettier du magasin de l'Usine** — deux thèmes, une
  silhouette, deux matières : du bois verni au lieu de l'acier.
- **La cabine d'ébarbage est le seul objet du dépôt dont la fonction soit de
  CONTENIR** ce qui gicle, et non de bloquer un passage. Fermée sur trois côtés,
  ouverte sur un — et le côté ouvert se lit parce qu'il n'a ni paroi ni liseré.
- **Le parc à brames est le contraire du parc à minerai** : même fonction, deux
  états de la matière, et la silhouette le dit — un tas n'a pas d'arête, une pile
  n'a que ça.

**AJOUTER DES RÉGIONS LÉGÈRES FAIT BAISSER LE BUDGET DU THÈME**, et c'est ce qui
règle le défaut du lot 23 à la source :

| Fonderie, bâti de l'arène | normal | cauchemar |
|---|---:|---:|
| 0.43.22 (six régions) | 8,52 % | **9,46 %** |
| 0.43.28 (neuf régions) | 7,58 % | **8,29 %** |

Le plafond est à 10 % : la Fonderie n'y touche plus, donc `buildBiome` ne jette
plus rien et aucune signature ne disparaît par manque de place.

**Une allée de rayonnage où l'on ne passe pas n'est pas une allée.** Les gabarits
étaient espacés de 108 px pour une hauteur de 32 : **76 px libres**, sous
`PASSAGE_MIN`. Ils passent à 126 px d'écart, soit **94 px** libres.

| | régions | avec une signature |
|---|---:|---:|
| 0.43.27 | 40 | 40 |
| 0.43.28 | **43** | **43** |

Usine 9, Fonderie 9, Friche 9, Nébuleuse 8, Secteur 8. Pire Jaccard bâti :
**0,50**. La plus basse en vues signées : le puits à **93,5 %**.

### La Friche passe de six régions à neuf (0.43.27)

| région | sol | famille à elle | trame |
|---|---|---|---|
| **la voie** | `mineral` | wagon à l'arrêt | ruban de rame |
| **la décharge** | `bitume` | balle compressée | crible de balles |
| **la halle éventrée** | `lisse` | ferme tombée | peigne de fermes |

- **La voie est la seule ligne droite du thème.** La Friche est faite de ce qui
  s'est effondré au hasard ; une voie ferrée a été **tracée**, et elle tient
  encore parce que le ballast ne pourrit pas.
- **La décharge, ce sont des cubes** — et c'est tout ce qui la sépare de
  l'effondrement. Un effondrement produit des morceaux de toutes les tailles ;
  ici une machine a tout ramené au même gabarit. Le désordre est accidentel, la
  décharge est un **rangement**.
- **La halle éventrée est la seule région du dépôt où une structure soit lisible
  À PLAT** : on voit le dessin de la charpente au sol, en obliques parallèles, et
  on comprend le volume qui n'existe plus. Le contraire du chantier, qui montre
  un volume qui n'existe **pas encore**.

**LA FRICHE EST LE THÈME LE PLUS CHARGÉ EN DANGERS DU DÉPÔT, et ça se paie dans
la table.** Quatorze dangers en cauchemar plus leurs **quatre miroirs**, et un
tremblement de 40 px qui mange la garde contre les bords :

| enveloppe cherchée | positions libres sur la cellule |
|---|---:|
| ferme oblique `0,31 × 0,15` | **0** |
| ferme oblique `0,21 × 0,09` | 2 |
| wagon `0,13 × 0,048` | 179 |

La halle porte donc **deux** fermes et non trois, et elles tombent en sens
**inverse** — deux charpentes ne s'effondrent pas du même côté. Le peigne de la
trame en pose d'autres à l'échelle du quartier : la région reste lisible avec
deux. Et la rame tient la bande centrale, la seule libre : les bandes `y = 0,24`
et `y = 0,76` appartiennent presque entièrement aux dangers.

**Le solveur de placement est plus strict que `verifierBiomes`, et c'est voulu.**
Le vérificateur mesure des arènes **réelles**, où le clipping au quartier peut
écarter une pose fautive ; le solveur teste les quatre miroirs contre **tous** les
dangers des deux modes. Trois positions que le vérificateur laissait passer par
chance ont été corrigées.

| | régions | avec une signature |
|---|---:|---:|
| 0.43.26 | 37 | 37 |
| 0.43.27 | **40** | **40** |

Usine 9, Fonderie 6, Friche 9, Nébuleuse 8, Secteur 8. Pire Jaccard bâti :
**0,50**, inchangé depuis le lot 22.

### La Nébuleuse passe de cinq régions à huit (0.43.26)

| région | sol | famille à elle | trame |
|---|---|---|---|
| **la serre** | `vegetal` | bac de culture | peigne de rangées |
| **le réacteur** | `dalle` | tore | couronne |
| **le champ d'antennes** | `granulat` | parabole au sol | crible d'embases |

- **La serre est la seule chose vivante hors de la Friche**, et le seul sol
  végétal du thème : la couleur dit qu'on a changé d'endroit avant qu'on ait
  identifié un objet. Les bacs sont des **cadres** — on voit les plants à travers
  sans pouvoir tirer proprement, la mécanique de la claire-voie au service de
  tout autre chose.
- **Le tore est la seule masse intacte et refermée du thème.** Tout le reste de
  la Nébuleuse est cassé : des arêtes, des éclats, des poutres tordues. Son
  intérieur n'est **pas** un trou — la silhouette remplit son rectangle, la
  collision est une AABB, et ce qui dit l'anneau est la bande claire, pas une
  absence.
- **Le champ d'antennes est la seule région du dépôt dont les masses aient une
  orientation COMMUNE**, et ça se voit avant qu'on ait identifié un seul objet.

**Quatre rouges, et trois disaient la même chose : une région neuve RETIRE sa
signature à ses voisines.** La serre posait des cloisons (celle de la coursive),
le réacteur des consoles (la coursive encore), les antennes des bras (le dock) et
une roche (la dérive). Et remplacer au hasard **recrée un noyau partagé** — ce
que le lot 22 a cassé. Chaque région neuve garde donc **deux** familles : la
sienne, et la travée, qui n'est exclusive à personne.

**Le quatrième rouge est de nouveau le catalogue, pas le rangement.** Le champ
d'antennes à `[0, 3]` **contenait** le dock — **71 %** de props partagés pour un
plafond de 70 —, et les six paires distinctes de quatre quartiers étaient déjà
prises par les cinq régions d'origine. Même arithmétique qu'à l'Usine au lot 20,
même réponse : **un cinquième quartier**, deux props neufs (réflecteur, boîtier),
et le quartier s'appelle *ce qui écoute*. Recouvrement après : **12,5 %**.

**Et la carte des dangers commande la table.** La Nébuleuse porte deux nappes de
114 et 121 px de rayon sur la bande `y = 0,34` à `0,66`, plus leurs **quatre
miroirs** : la moitié centrale de la cellule lui appartient. Les rangées de la
serre tiennent donc le haut et le bas, avec 90 px entre deux bacs.

| | régions | avec une signature | props |
|---|---:|---:|---:|
| 0.43.25 | 34 | 34 | 60 |
| 0.43.26 | **37** | **37** | **62** |

Pire Jaccard bâti : **0,50**, inchangé. Les 62 props sont tous atteints par les
soixante vues de `verifierDessin`.

### Le Secteur passe de cinq régions à huit (0.43.25)

Premier lot de contenu depuis que les six tables par région sont **toutes
indexées par clef** : l'ajout ne décale plus rien, et les trois régions sont
sorties vertes en quatre passes au lieu des dix habituelles.

| région | sol | famille à elle | trame |
|---|---|---|---|
| **le parking** | `lisse` | véhicule à l'arrêt | peigne de rangées |
| **la station** | `ajoure` | tourniquet | ruban de portiques |
| **le poste de contrôle** | `granulat` | barrière de chicane, guérite | crible de chicanes |

- **Le parking est le seul endroit du dépôt où les masses sont RANGÉES.** Tout le
  reste du Secteur est posé, empilé ou tombé. Les véhicules sont bas et larges :
  on voit par-dessus, on ne passe pas au travers — la ligne de vue diverge de la
  ligne de marche, comme à la sablerie, mais en ville.
- **La station est la seule région dont l'architecture soit une RÈGLE**, pas une
  installation : une file de tourniquets qu'il faut franchir. Les intervalles
  font **112 px** — au-dessus de `PASSAGE_MIN`, donc jamais un goulot.
- **Le contrôle est la seule composition qui impose un détour sans rien fermer** :
  trois chicanes décalées, aucune bloquante, les trois ensemble font ralentir.

**Quatre familles neuves, zéro silhouette neuve** — `conteneur` porte le
véhicule (une boîte chanfreinée vue de dessus est une caisse ou une carrosserie,
et c'est le vitrage qui dit laquelle ; la carcasse de la Friche est le même objet
trente ans plus tard), `cadre` le tourniquet, `caisson` la barrière et la guérite.

**Trois rouges, trois enseignements :**

- **`secteur/rue : aucune famille bâtie à elle`** — la station posait des
  abribus, et l'abribus était la **seule** famille que la rue avait à elle.
  Ajouter une région peut **retirer** sa signature à une voisine ; c'est
  `verifierSignature` qui l'a dit tout seul. La station prend un mur aveugle.
- **`barriere 144x27 : 11,5 % de l'empreinte vide`** — `mur_bas` a des créneaux,
  qui disent qu'un mur a **cassé** ; un bloc de chicane est **moulé**. À ce
  rapport de forme les créneaux mangent le rectangle. Elle passe en `caisson`.
- **Le mur aveugle mordait la flaque de cauchemar**, qui tient `(0,16 ; 0,28)`
  sur 52 px — et ses **quatre miroirs** avec elle.

| | régions | avec une signature |
|---|---:|---:|
| 0.43.24 | 31 | 31 |
| 0.43.25 | **34** | **34** |

Pire Jaccard bâti : **0,50**, inchangé. Bâti du Secteur : 6,47 % → **5,29 %** en
cauchemar — les trois régions neuves sont légères, donc l'arène moyenne
s'allège.

### Neuf régions portaient la trame d'une autre (0.43.24)

`TRAMES` était la **troisième** table indexée par rang, après `loiNom` (lot 5) et
`AIR`/`SOL_REGION` (0.43.19). Même mécanique, même silence, et cette fois sur la
**plus grosse structure de l'écran** — une bande de trame va jusqu'à 3 680 px.

| thème | régions portant la trame d'une autre |
|---|---:|
| usine | **6 sur 9** |
| friche | **3 sur 6** |
| fonderie, nébuleuse, secteur | 0 |

**Et six d'entre elles bâtissaient avec la famille EXCLUSIVE d'une voisine.** La
zone robotisée bâtissait des bacs — la signature du traitement. Le dégagement
bâtissait des palettiers — celle du magasin. L'exclusivité que
`verifierSignature` déclarait était donc **fausse en jeu**, parce qu'il ne lisait
que `poser` et jamais la trame.

Deux corrections :

- **`familles()` compte le `kind` de la trame.** Ce qui est posé est posé, quel
  que soit le système qui l'a posé. Le pire Jaccard bâti reste **0,50** une fois
  la trame comptée — mesuré sur les 86 paires.
- **`verifierTrame` refuse qu'une région bâtisse sa trame avec une famille
  qu'elle ne pose pas elle-même**, et croise la table **dans les deux sens**,
  comme le sol et l'air depuis 0.43.19.

**Effet de bord révélateur** : une fois la trame comptée, `verifierVue` sort
`usine/degagement : sa famille ne se voit que dans 83,3 % de ses vues` — sa
charpente tombée est sa seule famille à elle, et elle n'avait **qu'une** pose.
Une signature qui manque une vue sur six n'en est pas une : une seconde charpente
oblique, et la région repasse le plancher.

### La moitié des matières de trace étaient injoignables (0.43.23)

Les neuf primitives de trace qui manquaient sont écrites — **vingt au total** :
`empreinte`, `sentier`, `roussi`, `eclats`, `interstice`, `marquage efface`,
`givre`, `tag`, `film reflechissant`.

**Et en les branchant, on découvre que la moitié des matières déjà écrites ne
sortaient jamais.**

| mesure | avant | après |
|---|---:|---:|
| primitives dessinées par les 60 vues de `verifierDessin` | **18 / 20** | **20 / 20** |
| régions tirant une zone dont elles ne posent aucun bloc | **24 / 31** | sans objet |

Deux défauts empilés, aucun visible :

1. **`matieres[mq % n]` indexait par le numéro de quartier du thème**, pas par la
   position dans les zones tirées. `usine/chaine` tire `[0, 2]` et posait donc sa
   **première** matière sur les deux.
2. **Un quartier de PROPS n'a aucune raison d'être un quartier de BÂTI.**
   `secteur/ruelle` tire `[1, 2]` dans un thème où **aucun** bloc n'est en
   quartier 1 : sa seconde matière — le tag — était strictement inatteignable.
   Et c'était le cas de **24 régions sur 31**.

`verifierTraces` voyait pourtant chaque primitive « tirée » — **dans la table**.

**La correction est une refonte, pas un réglage.** Une trace est la conséquence
de quelque chose qui est **encore là** :

- `matieres[0]` — ce que la région fait au sol **partout** ;
- `matieres[1]` — ce que **son objet** lui fait, et rien d'autre.

`SONDE.kind` porte désormais la famille du bloc le plus proche (elle était déjà
calculée et jetée, comme sa position l'était avant 0.43.14), et `LI.sig` vient
d'`exclusivesDe()`. La seconde matière est donc atteignable **partout où elle est
écrite** : `verifierVue` garantit que la famille signature se voit dans au moins
90 % des vues de sa région.

Le nombre de matières n'est plus lié au nombre de zones — **une ou deux**,
jamais « une par zone ». C'est cet alignement qui avait créé le défaut.

**`tracesManquees()` rend le contrôle mécanique**, sur le modèle de
`sonsManques()` : on mesure ce qui est **vraiment dessiné** au lieu de tenir une
seconde liste. Coût : un `add` sur un Set de vingt entiers par trace posée, trois
microsecondes par image. Preuve qu'il mord : remplacer le tag de la ruelle par
une cendre sort `trace(s) 19 : ecrite(s) dans la table et dessinee(s) par aucune
des soixante vues`.

### Posséder un objet n'est pas le montrer (0.43.22)

`verifierSignature` dit qu'une région **possède** une famille bâtie à elle.
Il ne dit pas qu'on la **voit** — et le cahier des charges demande exactement
l'autre : *la différence doit être perceptible en jeu*. `verifierVue()` est ce
test-là, rendu mécanique : on balaie les **81 vues** d'une arène réelle, cinq
graines et deux modes, et on compte les vues qui montrent au moins une pièce de
la famille exclusive de la région qui les couvre.

**Le plancher est de 90 % PAR RÉGION**, jamais en moyenne : à 99,8 % de moyenne,
une région invisible une fois sur cinq ne se verrait pas.

| | vues signées |
|---|---:|
| total, 31 régions × 5 graines × 2 modes | **99,8 %** |
| la plus basse avant correctif — fonderie/puits | 91,9 % |
| la plus basse après | **95,9 %** |

**Ce qui fait manquer une vue est le BUDGET, pas la table.** `buildBiome` jette
un bloc dès que la surface bâtie de l'**arène** dépasserait
`OBSTACLE_SURFACE_MAX`, et il parcourt les cellules **dans l'ordre** : ce qui
tombe est donc ce qui vient en dernier, et le premier à tomber est le **plus
gros**.

Or **le puits demandait 15,5 % d'une cellule pour un plafond d'arène de 10 %** —
il ne pouvait pas être bâti tel qu'écrit. À la graine 42 la Fonderie plafonne à
**10,00 %** exactement, et ce qu'elle perd est la **fosse** : la plus grosse
masse du dépôt, et la seule chose qui nomme la région. 14 vues sur 172.

Les deux poses retirées sont celles du vocabulaire **partagé** — le troisième
four, la conduite — donc le correctif sépare aussi : puits/refroidissement tombe
de **40 %** à **20 %** de bâti commun.

**Le vérificateur mord** : `OBSTACLE_SURFACE_MAX` abaissé de 0,10 à **0,075**
sort quatre régions de la Fonderie — la coulée à **77,6 %**, le laminoir à
75,4 %, le puits à **65,7 %**. C'est bien le budget que la mesure attrape, et
pas la table.

### Le noyau partagé était une contradiction écrite dans la table (0.43.21)

**Le pire recouvrement bâti tombe de 0,60 à 0,50** — la visée du dossier —
**sur les 86 paires de régions**, et sans une seule famille neuve.

Le défaut était structurel et identique dans les cinq thèmes : un **noyau** de
trois familles que deux ou trois régions employaient *toutes*, plus une exclusive
chacune. Trois familles communes sur cinq, donc 0,60, quoi qu'on ajoute par
ailleurs.

| thème | noyau | régions qui le portaient |
|---|---|---|
| usine | chaîne, poste, machine | chaîne, dégagement |
| fonderie | four, cuve, conduite | coulée, refroidissement, puits |
| friche | mur, ruine, carcasse | champ, mur, effondrement |
| nébuleuse | fragment, travée, débris | dérive, brèche |
| secteur | devanture, pylône, conteneur | rue, marché, parvis |

**Et le noyau n'était pas une contrainte d'art : c'était une contradiction déjà
écrite.** Un **four** dans le *refroidissement*, un **mur** dans le *champ*, une
**devanture** au *marché*, un **pylône** sur le *parvis*, un **poste** dans le
*dégagement*. Chaque substitution rend la région plus juste **et** la sépare —
huit poses changent de famille, aucune ne change de boîte.

**UNE SUBSTITUTION DE `kind` À BOÎTE ÉGALE NE TOUCHE AUCUN AXE.** Les six de
`signatureVariante` (densité, encombrement, contraste, élongation, centrage,
étalement) et les quatre de `signatureBiome` se lisent **tous** sur la géométrie.
Mesure : les 59 vérificateurs sont verts **du premier coup**, ce qu'aucun lot de
contenu de ce plan n'avait fait. Le seul risque restant est l'empreinte — une
silhouette prend un rapport de forme qu'elle n'avait pas encore.

| | pire Jaccard bâti | paires au-dessus de 0,50 |
|---|---:|---:|
| 0.43.20 | 0,60 | **11** sur 86 |
| 0.43.21 | **0,50** | **0** sur 86 |

`SIGNATURE_MAX` passe donc de 0,65 (garde contre la régression) à **0,50**, la
valeur atteinte : le seuil n'est plus au-dessus de la mesure.

### Les neuf régions d'origine n'avaient aucun objet à elles (0.43.20)

**Neuf régions sur trente et une n'employaient que des familles partagées**, et
ce sont exactement les régions **d'origine** de chaque thème — celles que sept
lots de contenu avaient laissées intactes. Trois paires bâtissaient même avec un
jeu de familles **strictement égal** :

| paire | familles communes |
|---|---|
| usine chaîne / carrefour | chaîne, poste, machine |
| friche champ / mur / effondrement | mur, ruine, carcasse |
| nébuleuse dérive / brèche | fragment, travée, débris |

**Neuf familles neuves, zéro silhouette neuve** : `caisson` en porte cinq
(tunnel, tournante, convertisseur, dalle levée, sas), `cadre` deux (portail,
abribus), `masse_molle` deux (talus, roche). C'est le critère du §16 — une
silhouette sert plusieurs thèmes ou elle ne s'écrit pas.

**Trente et une régions sur trente et une ont maintenant une famille à elles**
(22 avant ce lot, **0 sur 20** à l'ouverture du plan), et `verifierSignature()`
le tient : plancher **zéro**, et il est arithmétique — chaque thème porte plus de
familles que de régions (16 pour 9 à l'Usine), donc une exclusive par région est
toujours atteignable.

---

**Une position de bloc obéit à trois contraintes dont aucune ne se voit dans la
table.** Elles ont coûté trois passes ; le solveur qui les applique vit dans les
scripts de mesure, pas dans le dépôt.

1. **Les dangers ne sont pas miroités, les poses le sont.** Une position n'est
   libre que si ses **quatre** images le sont, **aux deux modes** : le premier
   jet posait 132 talus sur une flaque de cauchemar.
2. **Le tremblement mange la garde contre un bord, et pas contre un danger.** Un
   décalage qui poserait un bloc sur un danger est **annulé** — donc c'est la
   position de table qui doit être libre. Contre un bord, il s'applique : un
   talus à **103 px** du bord de l'arène laissait une fente aveugle de **64 px**,
   soit 103 moins les 40 px de tremblement de la Friche.
3. **La garde de 80 px vaut aussi entre deux blocs de la même région**, et c'est
   ce qui a réduit la Friche à 16 positions libres pour un talus de 208 × 81.

**UNE RÉGION SATURÉE PREND SA SIGNATURE EN REMPLAÇANT, PAS EN AJOUTANT** — et
c'est le piège le plus cher du lot. `signatureBiome` construit une arène d'**une
seule cellule** : la région d'origine **est** la signature de son thème.

| | fonderie / secteur, meilleur axe |
|---|---|
| avant | **densité 41,7 %** (7 poses contre 12) |
| deux convertisseurs ajoutés à la coulée | densité 28,6 %, encombrement 38 % — **rouge** (seuil 40) |
| deux cuves **devenues** convertisseurs, géométrie identique | **densité 41,7 %** |

Et la Fonderie n'avait pas la place non plus : elle est à **9,8 %** de bâti pour
un plafond de **10 %**, donc deux convertisseurs de 0,100 × 0,150 (1,5 % de
cellule chacun) passaient le budget et **tout ce qui suivait tombait** —
`cauchemar n'a pas plus d'obstacles que normal (7 → 7)`.

**Trois autres mesures du lot :**

- **`MOLLE_CREUX` 0,04 → 0,03.** Le retrait ne dépend pas de la boîte, donc plus
  elle est plate, plus il en mange : le talus (176 × 68) et la roche (144 × 90)
  sortaient à **10,2 %** et **10,1 %** d'empreinte vide pour un seuil de 10.
- **Le petit poste du carrefour devient une petite tournante.** Il tenait le
  contraste de la variante — sans lui, deux gabarits et un rapport max/min de 1,2
  contre 2,5 ailleurs — mais il donnait au carrefour **exactement** les trois
  familles de la chaîne. Même rôle, famille de la région : 60 % → **40 %**.
- **Le pire recouvrement bâti reste 60 %**, sur plusieurs paires, et c'est
  structurel : un noyau de trois familles partagé plus une exclusive chacune
  donne 3/5. Le plafond du vérificateur est donc à **0,65** (garde contre la
  régression) et la **visée du dossier à 0,50** reste écrite — y descendre
  demande de casser les noyaux des cinq thèmes, donc un lot de contenu de plus.

### Une table par région se lit par CLEF, jamais par rang (0.43.19)

**Le défaut le plus silencieux du plan, et il était déjà livré.** `AIR`
(`props.js`) et `SOL_REGION` (`material.js`) étaient des tableaux indexés par
**rang** : insérer une région au milieu d'`OBSTACLES` décale toutes les
suivantes, donc chacune hérite des props **et** du sol de sa voisine. Mesuré sur
le code de 0.43.18 :

| thème | régions portant le sol et les props d'une autre | depuis |
|---|---:|---|
| usine | **6 sur 9** | 0.43.6 |
| friche | **2 sur 5** | 0.43.8 |

Aucun des cinquante-huit vérificateurs ne pouvait le voir : les deux tables
restaient **complètes et bien formées**. C'est exactement ce que `loiNom` avait
payé au lot 5 — et la correction d'alors n'avait été appliquée qu'**à la
traduction**. `clesDe(theme)` et `loiCle(theme, loi)` sont maintenant le point de
passage, et les deux vérificateurs croisent **dans les deux sens**.

**Le re-clefage a découvert un défaut de contenu que le désalignement masquait.**
Une fois chaque région rendue à son air, `verifierVocabulaire` remonte de 63 % à
**67 %** : le traitement à `[3, 5]` **contenait** la maintenance `[3]`. Et le
correctif ne pouvait pas être une redistribution —

- l'Usine a **neuf** régions pour **six** quartiers, dont **deux tirés seuls**
  (maintenance `[3]`, utilités `[5]`) ;
- toute paire contenant l'un des deux contient donc une région entière ;
- les **six** paires de `{0, 1, 2, 4}` étaient déjà prises par les six autres.

Le catalogue était le goulot une seconde fois. **Un septième quartier**, trois
props neufs qui n'appartiennent qu'au traitement — la vanne (un volant vu de
dessus, la seule forme de ce genre du semis), le fût sur rétention (un rond dans
un carré ; le bidon de la Friche est couché et rouillé, celui-ci est debout et
rangé), la douche de sécurité (**le seul prop du dépôt qui parle du corps**). Le
bac et la hotte suivent : ils ne sont posés que là.

| | pire recouvrement de props |
|---|---:|
| 0.43.18, table désalignée | 63 % (faux) |
| re-clefée, avant le quartier | **67 %** (traitement ⊃ maintenance) |
| après | **63 %** (magasin/expédition) |

**Deux régions neuves, et la première forme MOLLE du dépôt.** Le parc à minerai
(Fonderie) et le terrain repris (Friche) partagent une silhouette que rien
n'avait encore : un bord irrégulier et **continu**, sans un seul angle — tout le
reste du jeu est usiné ou cassé.

**Une forme ronde ne peut pas passer `verifierEmpreinte`, et c'est de
l'arithmétique.** Un contour circulaire inscrit dans son rectangle laisse
`1 - π/4` = **21,5 %** de vide au mieux, pour un seuil de **10 %** — la collision
est une AABB, un tas rond ferait buter sur du vide à ses quatre coins. Premier
jet mesuré à **37 %**. La forme parcourt donc le **périmètre** de sa boîte avec
un retrait vers l'intérieur :

| `MOLLE_CREUX` | vide mesuré |
|---:|---:|
| 0,14 | 37 % |
| 0,10 | 23 % |
| 0,06 | 13 % |
| **0,04** | **vert** |

**État des trente et une régions :**

| thème | régions | avec une signature |
|---|---:|---:|
| usine | 9 | 7 |
| **fonderie** | **6** | **5** |
| **friche** | **6** | **3** |
| nébuleuse | 5 | 3 |
| secteur | 5 | 4 |
| **total** | **31** | **22** |

**Et une passe de vérification écrite puis retirée.** `verifierDessin` ne
traverse le corps d'un prop que si le semis le tire ; on a donc ajouté une passe
qui les dessine tous, comme la cuisson du sol. Mesure avant de la garder : les
soixante vues atteignent **60 identifiants sur 60**, et ce n'est pas de la chance
— `FUITE` fait tirer une part des props dans le fonds du thème entier, donc
**toute** la table est atteignable depuis n'importe quelle cellule. Une garde qui
ne peut rien attraper se supprime.

### La sixième primitive de trame, et l'Usine à neuf régions (0.43.18)

**La FAILLE était déclarée dans le dossier et jamais posée.** Le `creux` existait
depuis 0.43.12 — la fosse du puits — mais aucune trame ne traçait de saignée à
l'échelle d'un quartier. **Le traitement de surface** la paie : une tranchée de
bacs traverse la région, on la franchit en trois points, et c'est la seule trame
du dépôt qui décrive une **absence**. Elle est 2,4 fois plus épaisse qu'un ruban
et il n'y en a **qu'une** — deux tranchées parallèles feraient une bande
impraticable entre elles.

Et **la zone robotisée** : le seul sol du dépôt **sans usure**, parce que
personne n'y marche. Un endroit propre dans une usine sale dit tout.

| thème | régions | avec une signature |
|---|---:|---:|
| **usine** | **9** | **7** |
| fonderie | 5 | 4 |
| friche | 5 | 2 |
| nébuleuse | 5 | 3 |
| secteur | 5 | 4 |
| **total** | **29** | **20** |

**Le même défaut que `gabaritsDe`, une seconde fois, et il aurait pu durer.**
`signatureVariante` lisait la pose **non dépliée** : une entrée oblique n'a ni
`w` ni `h`, donc `o.w * o.h` rend `NaN`, `surf` devient `NaN`, et **les deux
comparaisons de min et de max sont fausses pour un NaN** — l'entrée disparaissait
de trois axes sur six **sans rien lever**. Symptôme : « le dégagement » et « le
traitement » déclarés semblables à **13 %** alors que leurs densités réelles
diffèrent de **36 %**. Un faux positif, mais qui masquait trois axes morts.

### Les cinq thèmes ont cinq régions (0.43.17)

Fonderie, Nébuleuse et Secteur n'en avaient que quatre. Trois régions neuves :
**le laminoir** (une file de cages, la seule région du dépôt où tout tient sur
une ligne), **le chantier orbital** (des membrures qui **bloquent sans cacher**,
l'inverse exact de la brume) et **les capsules** (un mur d'alvéoles dont chacune
a sa lumière — le seul damier lumineux d'un thème fait de grandes enseignes).

| thème | régions | avec une signature |
|---|---:|---:|
| usine | 7 | 4 |
| fonderie | **5** | **3** |
| friche | 5 | 2 |
| nébuleuse | **5** | **3** |
| secteur | **5** | **4** |
| **total** | **27** | **18** |

**Le centre d'une cellule appartient aux dangers, et ce lot l'a payé quatre
fois.** Chacune des trois régions a dû être recalée sur les couloirs libres :

- **le laminoir** posait sept boîtes en travers avec 8 à 56 px d'écart — un
  **mur**, donc un carré central infranchissable. La table à rouleaux, pourtant
  juste physiquement, est **supprimée** : les cages seules disent la même chose
  avec 360 et 264 px d'écart. Et le train passe de `y = 0,50` à `0,26`, le milieu
  de la Fonderie appartenant au ralentissement puis à la braise ;
- **le chantier orbital** posait six poutres de 207 px en travers de deux dangers
  centraux : six appuis de 108 px répartis dans les couloirs disent la même
  ossature — c'est le **réseau** qui se lit, pas la longueur d'une pièce ;
- **les capsules** : le Secteur tient `x = 210 à 430` et `1185 à 1375` sur toute
  la bande `y = 315 à 585`, donc les murs latéraux collent aux bords ; et les
  deux passerelles **ne se font plus face**, une passerelle de 384 px centrée
  traversant forcément l'un des deux geysers ou la braise.

### Le miroir était à moitié mort (0.43.16)

`my = (cx * 2 + cy) & 1` vaut `cy & 1` — `cx * 2` est pair. Les **deux** miroirs
avaient donc la même période de deux cellules, et le bâti se répétait tous les
deux écrans **régulièrement**.

**Ce que le hachage n'ajoute pas, et le dossier se trompait dessus.** Il n'y a
que **quatre** combinaisons `(mx, my)` : le nombre d'arrangements distincts d'une
arène vaut `lois présentes × 4`, soit 16 hier avec quatre lois et **21,3**
aujourd'hui parce qu'une carte en montre 5,3. Le hachage n'en crée **aucun**.

**Ce qu'il enlève, mesuré sur 5 graines × 81 cellules** — part de paires
distantes de deux cellules portant la **même** disposition :

| | avant | après | hasard pur |
|---|---:|---:|---:|
| en x | **100 %** | 28 % | 25 % |
| en y | **100 %** | 25 % | 25 % |

La répétition existe toujours ; elle n'est plus **régulière**, donc elle ne se
lit plus comme une grille. C'est ça qu'on voyait, pas le nombre.

**Il a exposé un défaut latent de la Friche.** Une épave à `y = 0,94` tombe à
**27 px** de sa jumelle miroitée de la cellule voisine ; la Friche est le seul
thème qui tremble, deux cellules se décalent de 40 px **chacune**, et l'écart se
referme — **17 paires qui se traversent sur 50 graines, jusqu'à 108 × 44 px**.
La garde y vaut `2 × jMax + PASSAGE_MIN` = **160 px**, et la casse passe de cinq
piles à **trois** : le bas de sa cellule appartient en cauchemar à la braise
(439 à 1161 px) et à la flaque de gauche, et ce qui reste est à moins de 160 px
d'un grillage ou d'une ruine.

### Un repère unique ne repérait rien (0.43.15)

L'amer était visible dans **4 vues sur 81** — un point qu'on ne rencontre presque
jamais sur 14 400 × 8 100 px. Il y en a maintenant **un par quartier**, soit
**5,3 par arène** en moyenne sur les cinq thèmes et les trois modes.

**Trois fois le même dessin ne repère pas mieux qu'un seul**, et c'est pour ça
que ce lot avait été reporté une première fois. Chaque amer porte une
**variante** — le compte de sa répétition radiale et son élément central — et les
trois sont vues à chaque arène (`v = quartier % 3`, 3 à 6 quartiers).

| thème | amers / arène | variantes vues |
|---|---:|---|
| les cinq | **5,3** | 0, 1, 2 |

**Deux mesures ont corrigé le premier jet :**

- la boîte d'un quartier est **quatre fois plus petite** que l'arène, donc les
  quatorze candidats y sont trop serrés : la Friche en cauchemar tombait à
  **177 px** d'un danger pour une garde de 187. **Vingt-huit** points la
  dégagent — c'est le nombre de points *réellement distincts* qui compte, la
  même leçon qu'en 0.40.12 ;
- deux quartiers voisins ont des boîtes englobantes qui **se recouvrent** (une
  région est d'un seul tenant mais **pas convexe**), donc deux repères tombaient
  côte à côte. `verifierAmers` refuse une paire à moins de leur diamètre.

### Le catalogue était le goulot (0.43.14)

Sept régions d'Usine pour **quatre** quartiers de props. Ajouter des zones sans
ajouter de props n'aurait rien changé : les mêmes objets, redistribués.

| thème | régions | zones | pire Jaccard avant | après |
|---|---:|---:|---:|---:|
| usine | 7 | 4 → **6** | 67 % | **63 %** |
| fonderie | 4 | 4 | 43 % | 43 % |
| friche | 5 | 4 → **6** | 67 % | **63 %** |
| nébuleuse | 4 | 4 | 57 % | 57 % |
| secteur | 4 | 4 | 44 % | 44 % |

**Dix props neufs** : gerbeur, transpalette, cale, servante, carter, coffret HT
(Usine) ; pneus, moteur déposé, parpaings, plot (Friche).

**Deux sur-ensembles trouvés par la mesure, pas à l'œil** : les utilités à
`zones [5, 3]` **contenaient** la maintenance, et le dégagement à `[1, 5]`
**contenait** les utilités. Un sur-ensemble n'est pas une variation — les deux
régions passent à un seul quartier, et **un inventaire étroit est une identité**.

Le pire recouvrement du dépôt reste **63 %**, plafonné par la taille du
catalogue : à quatre props par quartier et deux quartiers par région, deux
régions qui partagent un quartier partagent mécaniquement la moitié de leur
inventaire. Descendre plus bas demande des quartiers **disjoints**, donc encore
des props.

### La première oblique du dépôt (0.43.13)

**Tout le jeu était horizontal ou vertical**, et pour une bonne raison :
`verifierEmpreinte` refuse une forme qui ne remplit pas son rectangle, la
collision étant une AABB. Une masse penchée ferait buter sur du vide sur toute la
surface de ses coins.

Le macro `oblique` **déplie en escalier** : `{ oblique, x0, y0, x1, y1, ep }`
devient 3 à 8 AABB. Relevé sur l'arène réelle — 4 marches de **104 × 32 px**
décalées de **22 px** chacune, soit moins que `ep` (32), donc **aucune fuite
entre deux marches** ; et leurs intervalles en x sont disjoints, donc **aucune
superposition**.

**Deux corrections que les vérificateurs ont imposées :**

- `gabaritsDe` lisait la pose **non dépliée** — une entrée oblique n'a ni `w` ni
  `h`, donc `verifierEmpreinte` jugeait la silhouette sur `NaN × NaN` et rendait
  **100 % de vide** ;
- la poutre était à la **Friche**, qui a pourtant la charpente. Elle y fermait
  **3 à 11 cases inatteignables** sur quatre graines : la Friche est le seul thème
  qui **tremble de ±40 px par cellule**, et une marge qui tient sans tremblement
  ne tient pas avec. Elle part au **dégagement de l'Usine**, région la plus vide
  du dépôt et thème à `jMax` nul.

### Le puits a enfin un trou (0.43.12)

Le dépôt ne savait dessiner que du **plein**, et trois de ses régions portaient
un nom de vide : le cratère (corrigé en 0.43.8 en devenant une casse), la brèche,
et le puits — qui posait **deux fours collés**.

`creux` sur la fiche fait sauter à `drawObstacles` les **deux passes qui font
lire un volume** : l'ombre portée et le corps décalé vers la caméra. Restent le
contour et l'habillage, qui porte seul la profondeur.

**Ce que ce lot ne fait pas, et pourquoi** : la fosse **bloque les tirs**. La
rendre traversable demanderait que la simulation lise `kind` — or `kind` ne
circule pas sur le réseau et le serveur ne le lit jamais. L'invariant passe
devant l'effet.

**Deux fois le même piège, attrapé deux fois par le même vérificateur** :
`fosse()` employait `lumDir` sans l'importer dans `blocs.js`. Un identifiant
utilisé *dans* une fonction et jamais importé **ne lève qu'à l'appel** —
`node --check` passe, les 31 modules chargent, et seul `verifierDessin` le voit.
C'est mot pour mot le défaut de `drawGrid` en 0.41.1.

**14 régions sur 24** possèdent maintenant une famille exclusive.

### Une trace a une source, et elle existait déjà (0.43.11)

`sonder()` balayait les obstacles, gardait le plus proche, en tirait un quartier
et **jetait sa position**. Or une trace n'est posée que si ce balayage rend un
quartier — donc **que si un bloc est à moins de 90 px** :

| lieu | cellules trouvant une source à moins de 90 px |
|---|---:|
| usine | 23,3 % |
| fonderie | 29,3 % |
| friche | 18,2 % |
| nébuleuse | 22,2 % |
| secteur | 29,5 % |

La source était donc **toujours** disponible ; aucune primitive ne s'en servait.

**Le centre d'un bloc n'est pas sa source.** La distance se mesurait déjà au
rectangle, mais une bande de trame fait jusqu'à **3 680 px** : son centre peut
être à dix-huit cents pixels d'une trace qui la touche. `SONDE` garde le **point
le plus proche du rectangle**, pas le centre.

**Deux règles écrites puis retirées, et c'est le lot qui les a mesurées :**

- une table de classe *libre / ancrée / orientée* dont le seul lecteur était un
  contrôle de complétude **sur elle-même** — ce qu'elle disait est porté par la
  signature des fonctions ;
- une règle « une région ne peut pas n'avoir que des traces à source », qui
  protégeait d'un cas **impossible** : le terrain libre n'en porte aucune de
  toute façon.

### Le Secteur, et les vingt régions du dépôt (0.43.10)

« La place » posait **le même catalogue de props que la rue** dans un autre
rangement — c'est l'une des quatre paires identiques mesurées à l'ouverture du
plan. Elle devient **la ruelle** : aucune vitrine, des **murs aveugles** (la
seule famille bâtie du Secteur qui **n'émette pas**, dans le seul lieu où neuf
blocs sur dix émettent) et des escaliers de secours. Même thème, même palette,
contraste maximal.

Le **marché** a enfin des **étals** — il posait des conteneurs, c'est-à-dire des
caisses — et le **parvis** son **monolithe** : le seul objet du dépôt sans aucun
détail. Dans un lieu où tout est une surface qui vend, ce qui ne dit rien est ce
qui impressionne.

**État des vingt-quatre régions, après six lots de contenu :**

| thème | régions | avec une signature | familles neuves |
|---|---:|---:|---|
| usine | 7 | **4** | palettier, pile, quai, remorque, etabli, ouverte, transfo, cloture |
| fonderie | 4 | **2** | moule, malaxeur, bassin |
| friche | 5 | **2** | epaves, grillage, poteau, banche |
| nébuleuse | 4 | **2** | bras, coque, cloison, console |
| secteur | 4 | **3** | aveugle, escalier, monolithe, etal |
| **total** | **24** | **13** | **23 familles**, 15 → 38 |

**0 sur 20 à l'ouverture, 13 sur 24 maintenant.** Les onze régions sans signature
sont exactement celles que le dossier désigne comme des *arrangements* — la
chaîne, le carrefour, le dégagement, la coulée, le puits, le champ, le mur,
l'effondrement, la dérive, la brèche, la rue.

**Le couple silhouette × habillage a tenu sa promesse** : 23 familles nouvelles
pour **10 silhouettes** seulement (dont 5 réemployées telles quelles), parce
qu'un `caisson` porte l'établi, le bassin, la coque, la cloison, la console, le
mur aveugle, l'escalier et le monolithe — huit lectures, un dessin de forme.

### La Nébuleuse : deux régions qui n'étaient qu'un facteur d'échelle (0.43.9)

« Le champ d'épaves » était **la dérive avec des éclats plus petits**, « les
grands fragments » **la dérive à `ech` 1,30**. Le commentaire d'`OBSTACLES`
l'interdisait deux cents lignes plus haut : *un facteur d'échelle donne la même
arène grossie, donc le même parcours*.

Elles deviennent **le dock** (bras d'amarrage en file, coques qui **sortent du
cadre** — le seul objet du dépôt plus grand que ce qu'on en voit) et **la
coursive** (le seul sol **plein** du thème). Sans la coursive, « dépressurisé »
ne veut rien dire : elle donne l'autre terme de l'axe.

| | régions | avec une signature |
|---|---:|---:|
| usine | 7 | 4 |
| fonderie | 4 | 2 |
| friche | 5 | 2 |
| **nébuleuse** | **4** | **2** (dock → bras, coque · coursive → cloison, console) |
| secteur | 4 | 0 |
| **total** | **24** | **10** |

**Trois défauts, trois vérificateurs différents, aucun visible à l'œil :**

- `regions` — le dock portait `BORD_MUR` face au `BORD_MUR` de la coursive,
  donc `loisAccordees` les déclarait incompatibles et l'assembleur **répétait une
  loi** plutôt que d'en poser deux distinctes. Une carte montrait 3 lois pour
  5 régions.
- `superpositions` — la console tombait dans le fragment sur **80 × 23 px**,
  904 paires sur 50 graines.
- `vocabulaire` — la dérive partageait **71 %** de ses props avec le dock, et la
  coursive **83 %**. Le seuil dur est l'identité, mais l'écart maximal sort avec
  le verdict, et c'est lui qui a désigné les deux à corriger.

### La Friche : le cratère sans cratère (0.43.8)

**Un nom qui décrivait une disposition et promettait un objet.** « Le cratère »
n'avait ni sol brûlé, ni bourrelet, ni pente — juste un endroit un peu moins
encombré. Il devient **la casse** : des piles d'épaves, seul empilement vertical
du thème et seule chose du dépôt qui monte en s'écartant de l'aplomb.

Et **le chantier** arrive : une grille de poteaux nus, des fers en attente, des
banches. Le seul endroit du thème où ce qui est là soit **neuf et déjà mort** —
il dit *inachevé* là où tout le reste dit *détruit*. C'est aussi la région la
plus ouverte de la Friche, donc l'inverse exact de la casse.

| | régions | avec une signature |
|---|---:|---:|
| usine | 7 | 4 |
| fonderie | 4 | 2 |
| **friche** | **5** | **2** (casse → epaves, grillage · chantier → poteau, banche) |
| nébuleuse | 4 | 0 |
| secteur | 4 | 0 |
| **total** | **24** | **8** |

**Le `cadre` sert trois thèmes sans un dessin de plus** : claire-voie à l'Usine,
châssis de sable à la Fonderie, grillage de casse à la Friche. La palette du lieu
suffit à les séparer — c'est l'argument de mutualisation, vérifié.

**`verifierEmpreinte` a refusé la banche à 15,6 %** : elle portait la silhouette
`mur_bas`, dont les créneaux disent qu'un mur a **cassé**. Une banche est neuve.
Le vérificateur a attrapé un mensonge de forme en même temps qu'un vide de
collision.

### La Fonderie : le refroidissement refroidit (0.43.7)

**Le plus gros écart du dépôt entre un nom et un pixel est corrigé.** La région
s'appelait « refroidissement » et il y faisait exactement aussi chaud qu'à la
coulée : même teinte, même émissif, même sol, mêmes trois familles. Elle porte
maintenant des **bassins de trempe** — une eau `#0e1a20` calme dans un lieu
orange, seule matière froide du thème.

Et « les cuves » deviennent **la sablerie** : deux tailles d'un même octogone ne
font pas deux endroits. Des châssis de sable **posés au sol**, en rangées, rien
qui monte — la seule occupation basse du dépôt, donc le seul endroit où la ligne
de vue et la ligne de marche divergent.

| | régions | avec une signature |
|---|---:|---:|
| usine | 7 | 4 |
| **fonderie** | **4** | **2** (sablerie → moule, malaxeur · refroidissement → bassin) |
| friche | 4 | 0 |
| nébuleuse | 4 | 0 |
| secteur | 4 | 0 |
| **total** | **23** | **6** |

**Le `cadre` sert déjà deux thèmes** : claire-voie à l'Usine, châssis de sable à
la Fonderie. Une silhouette qui laisse voir à travers n'a pas qu'un usage.

**Deux défauts trouvés par les vérificateurs, aucun visible à l'œil** : le four
et le châssis se traversaient sur 120 × 45 px (**1 410 paires sur 50 graines**),
et la conduite remontée à `y = 0,10` laissait **68 px** entre elle et le bord de
cellule — un corps s'y tient, la grille y voit un mur.

### L'Usine, sept régions dont quatre en possèdent une (0.43.6)

| région | familles | signature |
|---|---|---|
| chaîne | chaine, poste, machine | — |
| carrefour | machine, chaine, poste | — |
| **maintenance** | etabli, ouverte, poste, machine | **etabli, ouverte** |
| **utilités** | transfo, cloture | **transfo, cloture** |
| dégagement | machine, chaine, poste | — |
| **magasin** | palettier, pile, machine | **palettier** |
| **expédition** | quai, remorque, pile | **quai, remorque** |

**4 régions sur 7 possèdent un objet**, contre 0 sur 20 à l'ouverture du plan.
Les trois qui n'en ont pas sont les trois que le dossier désigne comme des
*arrangements* et non des biomes — la chaîne est la loi historique, le carrefour
est la croix, le dégagement est la respiration.

**Deux réemplois du couple silhouette × habillage** : la remorque est le
`chassis` de la Friche, le transformateur est le `fut` de la Fonderie. Deux
récipients à la même silhouette, et ce sont les **ailettes** qui disent lequel.

**`verifierEmpreinte` a refusé la machine ouverte à 11,8 %** (seuil 10) :
l'échancrure était trop profonde, elle passe de 0,30 à 0,19 de la petite
dimension. Une forme qui rentre ses coins fait buter sur du vide, et c'est
exactement ce qu'une silhouette échancrée risque — le vérificateur venait
d'entrer dans la suite au lot précédent.

### Les deux premières régions à posséder un objet (0.43.5)

**Avant : zéro région sur vingt avait une famille bâtie à elle.** Les vingt
employaient **les trois** familles de leur thème — c'est la mesure qui a ouvert
le plan 39. Après le magasin et l'expédition de l'Usine :

| thème | régions | avec une famille exclusive |
|---|---:|---:|
| usine | **6** | **2** (magasin → palettier · expédition → quai, remorque) |
| fonderie | 4 | 0 |
| friche | 4 | 0 |
| nébuleuse | 4 | 0 |
| secteur | 4 | 0 |
| **total** | **22** | **2** |

**Le couple silhouette × habillage a payé son premier réemploi** : la remorque
est le `chassis` de la Friche avec une matière peinte au lieu d'une carcasse
rouillée. Une silhouette, deux thèmes, deux lectures — c'est ce que le couple
1:1 rendait impossible.

**Ce que les vérificateurs ont trouvé, et qu'on n'aurait pas vu.** Les cinq
tables à remplir pour une région neuve se sont annoncées seules (`4 airs pour
6 lois`, `4 traitements de sol pour 6 régions`, `famille sans quartier`, `aucun
nom anglais`), et surtout **trois familles tombaient sur un danger en
cauchemar** — 41 travées, 46 piles, 37 quais sur cinq graines. Le mode cauchemar
porte cinq dangers dont une braise qui **balaie 420 px en x** : la bande
y = 0,60 à 0,72 lui appartient sur toute la moitié centrale. Les quatre rangs de
racks sont donc alternés en x **et** calés sur les creux, et la remorque passe de
0,150 à 0,130 de large — à 0,150 son nez atteignait 552 px et entrait dans le
balayage, qui commence à 535.

`verifierEmpreinte` **existait, était exporté, et personne ne l'appelait** — il
entre dans la suite (52 ms). C'est exactement le défaut que `verif.js` a été
écrit pour fermer, et une silhouette neuve est ce qui le rend coûteux.

### La trame (0.43.1)

**Ce qui manquait, en un chiffre.** Le plus grand objet bâti du dépôt faisait
**504 px** — la travée de la Nébuleuse — pour une vue de **1600 × 900**. Après :

| lieu | plus grand objet | objets ≥ 1 vue / arène | objets > 900 px / arène |
|---|---:|---:|---:|
| usine | **3 680 px** | 8,3 | 13,3 |
| fonderie | 3 680 | 5,3 | 9,3 |
| friche | 3 680 | 5,9 | 9,5 |
| nébuleuse | 3 680 | 4,1 | 7,9 |
| secteur | 3 680 | 9,1 | 12,5 |

**Découper au lieu de jeter, et la mesure qui l'a imposé.** Premier jet : un bloc
de trame rejeté en entier dès qu'il touchait un danger ou débordait de son
quartier. Une bande fait 3 000 px, donc elle rencontre presque toujours quelque
chose — et le nombre de dangers monte avec le mode :

| | calme | normal | cauchemar |
|---|---:|---:|---:|
| surface de trame, **en jetant** (fonderie) | 1,82 % | 1,36 % | **0,75 %** |
| blocs de trame, en jetant (usine) | 21 | 15 | **15** |
| surface de trame, **en découpant** (fonderie) | 1,94 % | 1,60 % | **1,55 %** |
| blocs de trame, en découpant (usine) | 30 | 36 | **39** |

Le mode le plus tendu était celui où l'architecture était la moins lisible.
Après découpage, le nombre de blocs **monte** avec la difficulté, et la surface
tient dans une bande de 1,5 à 2,4 % sur les cinq thèmes et les trois modes.

**Le budget bâti total ne bouge pas** — `OBSTACLE_SURFACE_MAX` = 0,10 reste le
plafond de tout, la trame se sert d'abord (plafond 0,030), les cellules
remplissent le reste :

| lieu | avant (calme/normal/cauch.) | après |
|---|---|---|
| usine | 0,0277 / 0,0422 / 0,0490 | 0,0539 / 0,0572 / 0,0626 |
| fonderie | 0,0514 / 0,0652 / **0,0743** | 0,0767 / 0,0784 / **0,0800** |
| friche | 0,0238 / 0,0384 / 0,0474 | 0,0512 / 0,0534 / 0,0548 |
| nébuleuse | 0,0467 / 0,0642 / 0,0670 | 0,0707 / **0,0844** / 0,0821 |
| secteur | 0,0245 / 0,0418 / 0,0472 | 0,0498 / 0,0624 / 0,0584 |

Le pire cas passe de 0,0743 à **0,0844**, donc le plafond de 0,10 n'est **jamais
atteint** : aucun bloc n'est évincé, et l'éviction — qui frappe la fin de l'ordre
de parcours, donc le bas-droite de l'arène — n'introduit aucun biais spatial.

**Génération d'une arène** (moyenne de 40, cauchemar) : usine 0,34 ms, fonderie
0,28, friche **1,37**, nébuleuse 0,25, secteur 0,20. La Friche est la plus chère
parce qu'elle est la seule à trembler par cellule. Une fois par manche.

**Deux défauts trouvés par les vérificateurs et pas à l'œil** : 207 paires de
blocs qui se traversent (les boîtes englobantes de deux quartiers se recouvrent —
un quartier est d'un seul tenant mais **pas convexe**) et 332 fentes aveugles de
33 px (jeter ce qui se traverse ne suffit pas, il faut la distance de passage).

### Le sol par région (0.43.0)

**L'audit qui a ouvert le plan 39, en trois relevés — et aucun des 55
vérificateurs ne les signalait.**

| mesure | valeur | comment |
|---|---|---|
| régions employant **les trois** familles bâties de leur thème | **20 / 20** | balayage de `OBSTACLES[theme][v].poser` |
| arrangements distincts sur une arène de **81 vues** | **16** | `(loi, mx, my)` distincts, `buildBiome` graine 7 |
| thèmes ayant deux régions au vocabulaire de props **identique** | **4 / 5** | Jaccard des `ZONES` tirées par `AIR[…].zones` |

Les paires identiques : **usine 1≡3** (`zones [2,1]` contre `[1,2]`),
**friche 1≡3**, **nébuleuse 1≡3** (`[0,2]` contre `[2,0]`), **secteur 0≡1**
(`[0,1]` contre `[1,0]`). Elles ne diffèrent plus que par `dens` et `ech` — un
nombre et un calibre. `verifierTraces` contrôle la *couverture* (aucune zone
orpheline), jamais la *distinction* : il ne peut pas les voir.

Les seize arrangements viennent de `my = (cx·2 + cy) & 1`, qui **vaut `cy & 1`**
— `cx·2` est pair. Les deux miroirs ont donc la même période de 2 cellules, et
**le bâti se répète tous les deux écrans**. Corrigé plus tard, seul : le
changement déplace toutes les arènes déjà mesurées.

**Cuisson d'une tuile de région**, contexte de papier (donc coût d'**appel** et
nombre d'opérations, pas de rastérisation), 20 cuissons à froid par entrée :

| lieu | rég. 0 | rég. 1 | rég. 2 | rég. 3 |
|---|---:|---:|---:|---:|
| usine | 0,163 | 0,080 | 0,144 | 0,094 |
| fonderie | 0,099 | 0,195 | 0,054 | 0,053 |
| friche | **0,353** | **0,389** | 0,201 | 0,236 |
| nébuleuse | 0,120 | 0,117 | 0,063 | 0,093 |
| secteur | 0,089 | 0,082 | 0,235 | 0,084 |

La Friche est la plus chère : sa tuile de base l'était déjà (`fricheLegacy` et
ses dalles), et `terre`/`granulat` ajoutent des centaines de grains.

**Le cache tient la traversée**, et c'est ce qu'il fallait prouver : dix demandes
sur quatre régions alternées coûtent **0,212 ms** au premier passage (quatre
cuissons) puis **0,014 ms** toutes chaudes — soit **×15**. Si la région était
entrée *après* `biomeIndex` dans la clef, chaque cellule aurait vidé le cache de
sa voisine et les dix demandes auraient coûté dix cuissons.

### Les quartiers d'un lieu (0.40.12)

Grille de 9 × 9 cellules d'une vue, 40 graines par lieu, amas de cellules de
**même variante** en 4-voisinage.

| lieu | amas avant | taille avant | amas après | taille après | plus gros |
|---|---:|---:|---:|---:|---:|
| usine | 45 | 1,79 | **12** | **7,04** | 34 |
| fonderie | 45 | 1,79 | **12** | **7,04** | 34 |
| secteur | 45 | 1,79 | **12** | **7,04** | 34 |
| nébuleuse | 47 | 1,72 | **19** | **4,26** | 34 |
| friche | 48 | 1,68 | **21** | **3,90** | 31 |

Avant, une arène était coupée en **~46 morceaux d'1,8 écran** : on changeait de
loi d'implantation tous les deux écrans. Quatre lois existaient et aucune n'avait
la place de se faire reconnaître. La friche et la nébuleuse restent les plus
fragmentées — leurs variantes s'accordent moins bien aux arêtes, donc la passe de
réparation les casse plus souvent.

**Le semis suivait un second découpage, à une autre échelle.** Il hachait une
maille de 3 × 200 px = **600 px**, plus petite qu'une vue (1600 × 900) : **4
cases de quartier par écran**, et aucun rapport avec le bâti. Après, il lit le
découpage du lieu — mesure sur des vues **non alignées** (pas de 400 px, la caméra
suit le joueur et ne tombe jamais sur la grille) : **1,32 quartier par vue**.

`verifierDistricts()` sur 60 graines : aucun quartier en deux morceaux, aucun de
moins de trois cellules, taille moyenne au-dessus de huit.

### Le semis, avant et après la densité par lieu (0.40.10)

Un prop = un `ctx.scale` dans `drawProps`, et c'est le seul de tout le module :
le compte est **exact**, contrairement au relevé de 0.40.8 qui comptait les
`translate`. Balayage des 81 vues, graine 7, mode normal, `gfx` élevée.

| lieu | avant | après | ×  | ops par prop |
|---|---:|---:|---:|---:|
| secteur | 53 | **65** | 1,28 | 15,9 |
| usine | 53 | **62** | 1,15 | 33,1 |
| fonderie | 53 | **53** | 1,00 | 30,7 |
| friche | 53 | **41** | 0,78 | 45,1 |
| nébuleuse | 53 | **30** | 0,62 | 26,4 |

**Avant, les cinq lieux posaient le même nombre d'objets** : `DENSITE[gfx]` et
l'échelle `0,72 + h × 0,66` n'avaient aucun terme de lieu, donc ils ne
différaient que par leur catalogue. Après, l'écart est de **2,2×** entre le plus
dense et le plus vide.

Les **ops par prop** disent l'autre moitié : le Secteur pose beaucoup de petites
choses (15,9), la Friche peu de grandes et de très inégales (45,1). C'est
l'échelle par lieu, `[base, étendue]`.

### La palette des lieux, en LAB (0.40.10)

`arena` est la surface qu'on regarde le plus, et les cinq tiennent dans **sept
points de luminance**, tout en bas de l'échelle : nébuleuse 2,2 · secteur 6,4 ·
fonderie 6,9 · usine 9,1 · friche 9,1. Les ΔE deux à deux :

| paire | ΔE `arena` | | paire | ΔE `emis` |
|---|---:|---|---|---:|
| fonderie / friche | **6,1** | | usine / friche | **8,4** |
| fonderie / nébuleuse | **8,9** | | usine / fonderie | 15,2 |
| usine / nébuleuse | **9,3** | | fonderie / friche | 23,2 |
| usine / secteur | 10,6 | | les six autres | > 82 |
| friche / secteur | 21,6 | | | |

« Indiscernable » commence vers 5. **Trois des cinq émissifs sont ambre.** Les
seuils de `verifierCharte()` (6 / 9 / 8) sont les minima déjà présents : le
vérificateur **ratifie** l'existant au lieu de poser une barre, donc il ne peut
pas rougir dessus. Non traité dans ce lot.

### Ce que chaque palier de `gfx` retire, par lieu (0.40.8)

Banc jetable, protocole « faire tourner les contrôles du rendu hors navigateur »
(plus bas) : le contexte 2D **enregistre** au lieu de peindre — il compte les
opérations et relève les couleurs posées. Balayage des **81 vues** de l'arène,
graine 7, mode normal. Une passe qui rend 0 op sur 81 vues ne dessine rien.

Opérations par vue, `gfx = élevée` :

| passe | usine | fonderie | friche | nébuleuse | secteur |
|---|---:|---:|---:|---:|---:|
| fond | 0 | 0 | 0 | 12 | 13 |
| props | 1 797 | 1 637 | 2 444 | 1 354 | 819 |
| traces | 226 | 230 | 161 | 305 | 238 |
| obstacles | 1 268 | 1 290 | 1 361 | 2 681 | 810 |
| baies | 0 | 0 | 0 | 524 | 768 |
| atmosphère | 283 | 212 | 175 | 365 | 402 |
| premier plan | 23 | 17 | 1 545 | 119 | 365 |

Et en **objets** par vue : 6 à 15 blocs. *(Le relevé de props annoncé ici en
0.40.8 — « 51 à 124 » — comptait les `translate`, donc des traits de dessin et non
des objets. Le compte exact est le nombre de `scale`, un par prop dans
`drawProps` : voir le tableau du semis plus bas.)*

**Ce que `basse` retire :** props **0**, traces **0**, fond **0**, baies **0**,
coulée **0**, atmosphère **0**, premier plan **0**. Il ne reste que la tuile de
sol, la grille de 20 m et les blocs. C'est le contrat écrit du palier — mais il
rendait aussi **le sol de l'usine sur la Nébuleuse et le Secteur** (`sol` : 8, 4,
16, **8**, **8** ops), donc trois lieux indiscernables. Après correction :
8, 4, 16, **6**, **1**.

**`meteo` rend 0 op dans les cinq lieux, et c'est correct** : `weatherFor` sort
sur `diffIndex < 2`. La météo n'existe qu'en **cauchemar**, et même là un segment
sur trois n'en a pas. En calme et en normal il n'y en a jamais.

**L'amer est visible dans 4 vues sur 81** (2 pour le Secteur) : un repère unique
par arène couvre 5 % de la carte.

### 14400 × 8100 (0.40.7)

Banc jetable, un bot par joueur en cercle, PV rendus à chaque pas pour tenir les
600 s, biome `nebuleuse`, graine 7, normal. Les deux tailles dans le **même**
processus, `CFG.ARENA_W/H` réécrit entre les deux passes.

| | 9600 × 5400 | 14400 × 8100 |
|---|---:|---:|
| cellules du générateur | 6 × 6 | 9 × 9 |
| obstacles (usine / friche / secteur) | 262 / 310 / 319 | 594 / 682 / 726 |
| génération, par manche | < 1 ms | 0,5 – 1,9 ms |
| population moyenne 1 j / 4 j | 64 / 154 | 68 / 155 |
| `step` 1 j / 4 j | 46 / 140 µs | 45 / **193 µs** |

**La population ne bouge pas, et c'est une limite du banc, pas un résultat** :
les bots suivent la même trajectoire des deux côtés, donc l'écart maximal entre
joueurs est identique (1 722 px) et le temps de transit ne change pas. Une équipe
réelle s'écarte davantage sur une map plus grande — c'est là que 0.40.1 avait
mesuré le doublement.

**`step` à quatre monte de 38 % (140 → 193 µs), et ce n'est pas la population** :
elle est identique. Ce sont les **obstacles**, dont le nombre suit la surface
(× 2,25) et que la pose d'apparition et le blocage rebalayent. 193 µs sur une
image de 16 600, c'est 1,2 %.

`BORNE_CFG.PAR_MANCHE` passe de 7 à 10 — **arithmétique, pas mesuré** : le nombre
suit la dimension linéaire (4 à 4800, 7 à 9600, 10 à 14400). Le banc d'écart
d'intérêt de 0.40.1 ne peut toujours pas trancher : `pilotage()` ne va pas aux
bornes.

### 9600 × 5400, et ce qui bouge vraiment, plan 37 (0.40.1)

Même banc des deux côtés, `pilotage()`, mesures **en cours de manche** — une
manche qui se termine pendant un combat de boss rend une arène vidée, et la
première version de ce banc a mesuré exactement ça.

#### Le critère principal : les deux coûts du plan 31

| | 4800 × 2700 | 9600 × 5400 |
|---|---:|---:|
| `diffuser`, fenêtre | **3 025 cases** | **3 025 cases** |
| `diffuser`, 1 j / 4 j | 60 / 66 µs | 64 / 80 µs |
| `_grille`, cases 1 j / 4 j | 816 / 1 900 | 1 540 / 4 002 |
| `_grille`, µs 1 j / 4 j | 9,6 / 9,4 | 7,4 / 15,5 |
| `nav` plein (une fois par manche) | 8 160 cases | 32 400 cases |

**La fenêtre de diffusion ne bouge pas d'une case**, et c'est le critère : elle
est ancrée sur la boîte d'apparition, pas sur l'arène.

**`_grille` double, et ce n'est pas un coût de surface** : elle est bâtie sur la
**boîte occupée**, donc elle suit l'écartement des joueurs — et une arène quatre
fois plus grande leur permet de s'écarter deux fois plus. Le terme
`ARENA_W × ARENA_H` a bien disparu ; ce qui reste est une conséquence de
gameplay. 15,5 µs sur une image de 16 600, c'est 0,09 %.

#### Ce qui monte vraiment : la population

| cas | 4800, pic / moyenne / `step` | 9600, pic / moyenne / `step` |
|---|---|---|
| normal 1 j | 174 / 43 / 109 µs | 56 / 25 / 18 µs |
| normal 4 j | 404 / 75 / 451 µs | 556 / 115 / 555 µs |
| cauchemar 4 j | 284 / 52 / 363 µs | 332 / 96 / 637 µs |

**À plusieurs, la population moyenne double.** Un corps met plus longtemps à
traverser une map quatre fois plus grande, donc il reste plus longtemps **en
transit**, donc il est vivant plus longtemps à taux d'apparition égal. En solo
c'est l'inverse — le joueur s'éloigne, et `_recyclerLoin` ramasse.

637 µs sur 16 600 reste à 3,8 %. Si un jour ça mord, le levier est
`RECYCLE_DIST`, pas le plafond.

#### La densité d'intérêt, et le levier qui ne répond pas

Secondes entre deux choses qui valent le détour — borne libre, mini-boss posé,
cristal, bonus, loot — à moins d'une demi-vue d'un joueur, sur 50 min par cas :

| | écart médian | plus long trou | trous > 30 s |
|---|---:|---:|---:|
| 4800 × 2700 | 1,0 s | 44 – 55 s | 1 – 5 |
| 9600 × 5400, 4 bornes | 1,0 s | 76 – 103 s | 8 – 14 |
| 9600 × 5400, 7 bornes | 1,0 s | 59 – 149 s | 8 – 16 |

**La médiane ne bouge jamais et la queue double.** C'est la queue qui se joue :
le plus long trou passe de `50 s à `90 s, et les trous de plus de 30 s triplent.

**Et le levier prescrit ne répond pas.** Passer de 4 à 7 bornes n'améliore rien —
il dégrade même deux cases sur trois. La raison : `pilotage()` **ne va pas aux
bornes**, il ne cherche que le loot et les bonus. Ce banc mesure donc l'errance du
bot, pas la densité d'intérêt d'un joueur — un joueur qui **voit** une borne y va,
et aucun bot ne couvre cette différence. Le passage à sept bornes reste, mais sa
justification est **arithmétique** — à nombre égal la densité spatiale est divisée
par quatre — et pas mesurée.

#### Le banc de séparation, et l'agrandissement le RÉPARE

Deux joueurs invulnérables tenus à 3 600 px, corps à moins de 700 px de chacun :

| | près de A | près de B | rapport | population |
|---|---:|---:|---:|---:|
| 4800 × 2700 | 9,1 | 36,7 | **4,04** | 46,7 |
| 9600 × 5400 | 9,7 | 16,4 | **1,68** | 27,8 |

**Le rapport était déjà hors de sa borne avant le lot**, et l'agrandissement le
divise par 2,4. La cause est que 3 600 px font **75 % de la largeur** de l'ancienne
arène : les deux joueurs se retrouvent chacun à 600 px d'un bord, les boîtes
d'apparition sont écrêtées, et le traitement cesse d'être symétrique. À 9600 le
même écart laisse les deux joueurs largement à l'intérieur. Aucune des deux tailles
n'atteint 1,4.

#### Ce qui ne bouge pas

`verifierPopulation` : **13 problèmes** à 9600, contre 13 avant le plan 35 et 17 à
4800 aujourd'hui — la forme de la courbe n'est pas dégradée.
`verifierMecaniques` : **3** à 9600 contre **4** à 4800, même famille. Le boss était
**déjà** confiné — `this.bounds` lui donne une boîte de la taille d'une **vue**,
centrée sur l'équipe — donc l'agrandissement ne le touche pas, et la question
« région tirée de la graine ou région de l'équipe ? » était déjà tranchée dans le
code : celle de l'équipe, ce qui évite le déplacement forcé.

### La sensibilité des six réglages de tension, plan 36 (0.39.2)

`sim/sens.mjs`. Chaque poids **doublé**, tout le reste identique, deux graines,
15 minutes simulées, `pilotage()` à deux joueurs, `tensionMoy` échantillonnée à
1 Hz. **Un poids dont un doublement ne change rien à la courbe est un poids mort :
il faut le retirer, pas le régler.** C'est l'étape 3 de la calibration, et la seule
des quatre qui ne demande pas de vraies parties.

| réglage ×2 | tensionMoy | p80 | part sous le seuil bas | écart |
|---|---:|---:|---:|---:|
| *référence* | 0,179 | 0,380 | 73 % | — |
| `A` (dégâts) | 0,234 | 0,545 | 62 % | **+30,8 %** |
| `B` (densité) | 0,182 | 0,406 | 72 % | +1,8 % |
| `C` (à terre) | 0,179 | 0,380 | 73 % | **0,0 %** |
| `DECAY` | 0,097 | 0,075 | 84 % | **−46,1 %** |
| `DENSITE_REF` | 0,176 | 0,374 | 73 % | −1,5 % |

**Deux poids portent la courbe** — `A` et `DECAY` — et `DECAY` plus que tout le
reste réuni.

**`C` rend exactement 0,0 %, et ce n'est PAS un poids mort : c'est le banc qui le
masque.** Le harnais relève les joueurs à chaque tick pour que toutes les mesures
voient la même horde ; `C` ne s'applique qu'à un joueur **à terre**, donc il ne
peut jamais s'exprimer ici. Lire ce zéro comme « à supprimer » serait exactement le
piège que ce relevé existe pour éviter.

**`B` à +1,8 % pour un doublement est presque inerte, avec CE pilote.** Le bot ne
reste pas longtemps dans un paquet dense — il recule et esquive. Ce chiffre décrit
le pilote autant que le poids, et il demande une vraie partie pour être tranché.

**Et la courbe est plate : 73 % des relevés sous le seuil bas, p20 à 0,000.** Le
brainstorm dessinait un rythme — pression, pic, résolution, respiration. La courbe
observée n'est pas ce rythme. **Ce sont donc les poids qu'il faut corriger avant les
seuils**, et cette correction se fait sur des manches réelles.

### Le Director sort de « normal », et il en sort assez, plan 36 (0.39.1)

`sim/etats.mjs`. Deux manches par case, `pilotage()`, 25 minutes simulées, chaque
battement journalisé avec son état.

| cas | battements | normal | ennui | surcharge | tension moyenne |
|---|---:|---:|---:|---:|---:|
| calme / 1 j | 39 | 26 | 10 | 3 | 0,120 |
| normal / 1 j | 30 | 19 | 6 | 5 | 0,228 |
| normal / 4 j | 35 | 20 | 9 | 6 | 0,161 |
| cauchemar / 2 j | 36 | 31 | 1 | 4 | 0,264 |

**C'est le relevé qui dit que le système n'est pas décoratif** : un Director qui
resterait en « normal » rendrait son vérificateur vide de sens — il validerait des
décisions neutres. Un tiers des battements sort de l'état neutre en calme, un sur
huit en cauchemar, et la direction est la bonne : **l'ennui disparaît quand la
tension monte**, 10 battements sur 39 à tension moyenne 0,120 contre 1 sur 36 à
0,264.

**Les seuils ne sont pas calibrés, et c'est écrit.** `ENNUI_T = 75 s` et
`SURCHARGE = 0,82` sont des défauts raisonnés. Le lot 03 du plan les règle sur les
courbes de tension accumulées **en vraies parties** — il ne peut pas le faire avant
qu'il y en ait, et aucun bot ne remplace ça.

### Les deux instruments d'équilibrage ne mesuraient pas ce qu'ils annonçaient, plan 35 (0.38.3)

**5 septembre 2026.** Ce lot devait recalibrer contre le loot. Il a d'abord dû
mesurer ses propres instruments, et les deux se sont révélés inutilisables tels
quels.

#### `verifierEquilibreArmes` : le verdict dépend du nombre de manches

Même code, trois tailles d'échantillon :

| manches | armes rouges |
|---:|---|
| 3 | laser, tesla, lame, dispersion, precision |
| 6 | laser, tesla, lame, dispersion, railgun, grenade, siege |
| 12 | laser, lame, dispersion, siege, precision |

**Trois armes tiennent aux trois tailles** — laser, lame, dispersion — et elles
sont toutes au-delà de 9 points d'écart. Toutes les entrantes-sortantes sont à
**5-9 points**, c'est-à-dire à portée de `TOLERANCE_V = 0,05` plus la dispersion
du banc. **La tolérance dit ce qu'on accepte, la résolution ce que l'instrument
distingue** : les confondre fait rougir du bruit. D'où `RESOLUTION_V = 0,10` et
le contrat `{ err, note }`, qui existait déjà pour `verifierBoss`.

**Contre-épreuve, décisive** : retirer les trois cartes du lot 0.38.0 du pool ne
change **rien** au verdict des armes à 3 manches — mêmes cinq armes, mêmes
pourcentages. Ce n'est donc pas le contenu du plan 35 qui a bougé la liste, c'est
l'échantillon.

#### `mesurePuissanceBoss` : une médiane sur une distribution trois fois plus large qu'elle

Solo, 12 manches, 52 relevés : **médiane 1,58, p10 0,93, p90 4,08, étendue
0,89 – 6,23**. Et les médianes par tiers d'échantillon valent **2,45 / 1,71 /
1,50** — l'estimateur ne converge pas, il dérive avec la famille de graines.

À 4 manches, la même mesure a rendu **3,01 avant le plan 35, 2,60 après, et 5,30
après en retirant trois cartes sur cent quatre-vingt-une.** Un changement qui ne
devrait presque rien faire double le résultat.

**Conclusion, écrite pour le prochain lot : `BOSS_POWER_REF = 2,89` NE BOUGE
PAS.** La médiane mesurée a bougé, mais l'instrument ne sait pas la mesurer à
mieux qu'un facteur deux. Recalibrer la constante qui gouverne les PV des six
boss sur ce relevé serait déplacer le jeu sur du bruit. L'ancienne valeur reste,
et la raison est ici.

#### Ce que le loot fait vraiment à la puissance

Le bot de `mesureTTK` (`botVersBoss`) **ne ramasse rien** : il ne va pas sur le
loot et ne réveille pas les mini-boss. La puissance qu'il mesure est donc celle
d'un jeu **sans loot**, même maintenant que le loot existe — et c'est pour ça que
la calibration du plan 30 n'a pas bougé sous lui.

Avec `pilotage()`, qui ramasse depuis ce plan, à quatre joueurs : **3,204 avant le
plan 35, 3,587 après, pour 22 loots ramassés sur trois manches.** C'est la vraie
mesure de ce que le loot ajoute, et elle vaut **+12 %**.

#### Les trois armes corrigées, et la non-linéarité du faisceau

| arme | levier | avant | après | écart avant | écart après |
|---|---|---:|---:|---:|---:|
| laser | dégâts | 75 | **72** | +0,092 | −0,035 |
| lame | rayon | 0,25 | **0,227** | +0,135 | +0,051 |
| dispersion | dégâts | 6,2 | **8,75** | −0,308 | −0,050 |

**Le laser a demandé deux passes.** Le multiplicateur relevé donnait 69 ; à 69 il
rendait 95 %, soit un dépassement dans l'autre sens. **−8 % de dégâts coûtent
−20 % de débit horde** : un faisceau qui tue moins vite garde ses cibles devant
lui plus longtemps, donc sa réponse n'est pas linéaire en dégâts. 72 est
l'interpolation des deux points mesurés.

**La lame ne pouvait pas être corrigée par les dégâts**, et c'est le garde-fou du
dps nominal qui l'a dit : son débit sur **cible unique** était déjà au plancher
(51 % du tir standard au banc, 53 % au modèle, pour un plancher de 60 %). Baisser
ses dégâts la faisait passer dessous — un balayage qui ne peut plus rien contre un
boss n'est plus une arme. Le **rayon** ne touche que la horde : 0,25 → 0,227,
l'aire ×0,824, et l'écart tombe de +0,135 à +0,051.

**Le modèle de la dispersion était faux, et de deux fois.** `dpsBase` compte
`dégâts × plombs` et `conversionBoss` rendait 1, avec un commentaire affirmant que
« la gerbe couvre un boss à la scission sans dépasser ». Le banc mesure
**109,0 contre 98,7** pour le tir standard, soit **110 %**, là où le modèle lisait
**219 %**. Un plomb sur deux porte : `DISP_GERBE = 0,50`. Sans ce terme, le
garde-fou refusait une arme que le banc trouve juste — et il l'aurait refusée dès
qu'on aurait touché à sa ligne, pas avant.

Restent `siege` (−0,089), `precision` (−0,073) et `lame` (+0,051), tous **sous la
résolution** du banc : notés, pas corrigés. Les corriger reviendrait à régler sur
du bruit, ce que ce lot vient précisément d'établir.

#### La courbe de progression, elle, s'est améliorée

`verifierProgression` passe de **six défauts à trois** entre avant le plan 35 et
après ce lot. Les trois qui restent sont des **dépassements** — niveau 23 à la
minute 20 pour une cible de 20 en solo, 12,5 à la minute 8 et 25 à la minute 20 à
quatre. Le loot n'y contribue pas : le bot de `verifierProgression` ramasse
depuis ce plan, mais la courbe est portée par l'XP, et le loot n'en verse jamais.

### Le mini-boss, plan 35 (0.38.1)

`sim/ttk-mini.mjs`. Le pilote de `pilotage()` garde sa visée, ses esquives et ses
compétences ; on ne lui impose que la **destination** tant qu'un mini-boss est
posé et qu'aucun boss n'est là — sinon on mesure « le bot le trouve-t-il » et non
« combien de temps met-il à l'abattre ». Deux graines par case, trois occasions
par manche, cartes tirées au hasard dans l'offre.

#### Temps d'abattage médian, en secondes

| mode | 1 j | 2 j | 3 j | 4 j |
|---|---:|---:|---:|---:|
| calme | 24 | 11 | 13 | 12 |
| normal | 42 | 27 | 16 | — |
| cauchemar | 86 | 65 | 39 | 24 |

**Médiane globale 18 s sur 50 abattages**, de 5 s à 205 s. **50 abattages sur 55
occasions ouvertes** : cinq se sont refermées sans que le mini-boss tombe.

**Remesuré après l'équilibrage des armes (0.38.3)**, puisque trois armes ont
changé : 12 / 12 / 9 / 12 en calme, 35 / 16 / 16 / — en normal, 86 / 25 / 48 / 24
en cauchemar. **Médiane globale 16 s sur 52 abattages, de 5 s à 114 s** — la
médiane bouge de deux secondes et l'étendue se resserre de moitié. La fourchette
écrite au lot 01 tient.

#### Ce que ces chiffres disent, et ce qu'ils ne disent pas

**Le temps d'abattage BAISSE avec l'effectif.** `CROWD_EXP = 0,6` a été choisi
pour que les PV restent **entre l'élite** (qui ne dépend que du temps) **et le
boss** (`crowd^1,15`) aux deux bouts de l'effectif — pas pour que la durée du
combat soit stable. Les dégâts d'équipe montent en `n`, les PV en `n^0,6` : à
quatre, on met environ la moitié du temps qu'on met seul. C'est un choix, il est
mesuré, et **c'est le lot 04 du plan qui le retouche s'il faut** — il est
impérativement le dernier et recalibre contre toutes les sources neuves.

**`normal/4j` n'a produit aucun relevé, et ce n'est pas le mini-boss.** Le pilote
n'abat pas le boss du premier segment avec un tirage de cartes aléatoire : la
manche reste bloquée à `hordeTime = 300` pendant les soixante minutes simulées, et
aucun mini-boss n'a donc son heure. Avec un tirage déterministe (première carte
offerte), la même case va jusqu'à la victoire et pose ses trois mini-boss.

**L'encastrement se produit.** 89 sur les onze cases mesurées, pour 268 charges
lancées — un tiers. Le pilote esquive assez pour l'ouvrir sans le chercher.

### La horde suivait le script, pas les joueurs, plan 31 (0.34.3)

`sim/separation.mjs`. Deux joueurs invulnérables maintenus à un écart fixe
pendant la horde, manche réelle depuis t = 0. Relevé : **600 s hors boss** après
la minute 10, corps à moins de 700 px. Chacun vise son plus proche.

#### Le rapport entre les deux joueurs, à 3 600 px

| graine | avant | après | total avant | total après |
|---|---:|---:|---:|---:|
| 7919 | **2,67** | **1,13** | 196 | 41 |
| 10007 | **4,35** | **1,36** | 130 | 52 |
| 4242 | **24,16** | **1,39** | 293 | 256 |
| 3517 | *non mesurable* | *non mesurable* | — | — |

Et **à 400 px, la ligne ne bouge pas d'un chiffre** : 1,10 · 1,30 · 1,03 avant
comme après. C'était le critère de non-régression le plus important — si la
calibration avait bougé pour une équipe soudée, la géométrie n'aurait pas été
corrigée, elle aurait été déplacée.

Les **naissances** par joueur, qui sont ce que le lot gouverne directement,
passent de 1,02-1,31 à **1,01-1,08** selon la graine. Le reste de l'écart
appartient au terrain et à ce que chacun tue.

#### Trois pièges de protocole, payés

**Un joueur figé à 1 800 px d'un boss ne peut pas le toucher** — aucune arme ne
porte si loin. Le combat ne finissait jamais, la horde ne reprenait pas, et deux
graines sur trois ne rendaient **aucune image**. On rend donc leur déplacement
aux deux joueurs pendant un boss ; l'écart n'est tenu que pendant la horde, qui
est ce qu'on mesure. La graine 3517 reste inmesurable **des deux côtés** : sa
manche passe les 4 000 s de garde en combats de boss que deux bots immobiles ne
tuent pas.

**Une visée figée sur un cap fixe a un plancher de bruit de 1,33**, mesuré à
écart nul — donc sur la même horde vue deux fois. Un joueur balaie ce qui arrive,
l'autre laisse passer. Chacun vise son plus proche depuis.

**Ce qui est près d'un joueur mélange trois causes** : où les corps naissent, ce
que le terrain retient, ce que le joueur tue. Seule la première appartient à ce
lot, d'où la colonne des naissances.

#### Ce que la mesure a trouvé et que personne ne cherchait

Deux défauts de l'implémentation, tous deux invisibles à la lecture :

- **un joueur à terre à l'instant du battement sortait de tous les groupes**, et
  sa part de horde tombait sur son voisin — rapport 4,2 là où le partage doit
  rendre 1. On regroupe désormais tout le monde ; le tri des vivants appartient à
  la lecture ;
- **un groupement périmé est pire que pas de groupement.** Refait au seul
  battement, il tenait jusqu'à soixante secondes après une séparation, et pendant
  ce temps la horde naissait sur la boîte englobante : **358 corps d'un côté
  contre 11**, et la masse ainsi posée consommait le plafond global bien après le
  regroupement. La validité se vérifie à chaque tick, avec hystérésis — on entre à
  une vue, on sort à une vue et demie.

### Les deux structures qui couvraient l'arène, plan 31 (0.34.1)

Même machine, même session, `process.hrtime`. Les chiffres du document de plan
(443 µs pour une diffusion) viennent d'une autre machine : c'est le **rapport
avant/après** et l'**invariance à la surface** qui se lisent ici, pas la valeur
absolue.

#### `_grille()`, 2 000 appels, 600 corps semés sur 1,6 vue

| | cases | coût |
|---|---:|---:|
| pleine arène (4800 × 2700) | 3 225 | 16,6 µs |
| **bornée à la boîte occupée** | **1 118** | **8,8 µs** |
| bornée, arène doublée dans le banc | 1 118 | **7,5 µs** |

La troisième ligne est le critère : le coût **ne suit plus la surface**. Le
budget de la salle passe de 3,1 ms/s à 1,6 ms/s, et il ne bougera plus quand
l'arène passera à 9600 × 5400.

#### `diffuser()`, une source, grille de 40 px

| | cases | coût |
|---|---:|---:|
| pleine arène | 8 160 | 184 µs |
| **fenêtre ancrée sur la source** | **3 481** | **83 µs** |

La fenêtre vaut la demi-diagonale de la boîte d'apparition plus quatre cases,
soit 59 × 59 cases — et cette taille **ne dépend pas de l'arène**. À la map
cible, la diffusion pleine arène passait à 32 400 cases et 1,5 ms ; la fenêtre y
coûtera les mêmes 83 µs.

#### Ce qui reste vert après

`verifierNavigation` (cloison de 32 px, passage de 80 px, trois modes, cinq
lieux), `verifierEncerclement`, `verifierDeplacement`, `verifierMecaniques` et
`verifierDeterminisme`. C'est ce qui dit que la fenêtre n'a pas cassé
l'approche : ce sont les vérificateurs qui mesurent l'arrivée de la horde.

### La couture, plan 25 (0.28.x)

#### La lisibilité aux quatre densités

Cauchemar, quatre joueurs, population **forcée**, 300 s par cas, relevé deux fois
par seconde sur la vue **réelle** du joueur 1 (1600 × 900 centrée puis écrêtée
comme `vueDe()`). Un bonus compte comme recouvert dès qu'un corps vivant
chevauche le disque de son icône.

| pop | corps dans la vue | surface couverte | paires en contact | bonus vus | **part recouverte** |
|---|---|---|---|---|---|
| 50 | 30,0 | 1,0 % | 3,2 | 499 | **2,6 %** |
| 100 | 52,1 | 1,7 % | 10,1 | 478 | **18,0 %** |
| 150 | 96,8 | 3,1 % | 23,4 | 2 036 | **21,3 %** |
| 200 | 106,3 | 3,3 % | 46,5 | 2 049 | **36,9 %** |

**Les corps ne mangent pas l'écran** : 3,3 % de la vue à 200. Le personnage, les
projectiles, les télégraphes, le boss et les objectifs vivent tous au-dessus de
la horde ou dans le HUD. Le **bonus** était le seul objet de gameplay dessiné en
dessous, et c'est le seul chiffre qui se dégrade — ×14 pour une densité ×4. Ce
n'est donc pas un problème de densité, c'est un problème d'**ordre**, et le
lot 4 le corrige en faisant monter le **signal** (socle, cadran, anneau de rang)
sans l'objet. La hiérarchie devient structurelle : le signal est sur `#cv`, les
corps sur `#cvGl`.

Contrôle de non-régression du découpage : la géométrie tracée par les **deux**
passes réunies est identique à celle de la passe unique d'avant, rejouée sur un
contexte enregistreur — 24 anneaux, 12 dans chacune.

#### Les silhouettes, après le pavois

`verifierSilhouettes()` était **rouge depuis 0.21.7** : porte-bouclier et chœur
se confondaient sur les cinq axes. La table de 0.21.7 tient, une ligne change.

| type | élancement | remplissage | sommets | avance | matière |
|---|---|---|---|---|---|
| **porte-bouclier** | **0,78** | **0,84** | 29 | **−0,008** | **0,68** |

Les douze autres lignes sont inchangées. L'écart d'élancement avec le chœur
(1,12) passe de **0,16 à 0,34**, pour une tolérance de 0,18.

**Ce qui rend une paire lisible se mesure en part de tolérance**, et c'est le
chiffre qu'il faut regarder plutôt que le seul verdict :

| paire | avant | après |
|---|---|---|
| porte-bouclier / chœur | **0,87** (confondues) | 1,20 sur un autre axe |
| couvain / porte-bouclier | 1,53 | **1,20** (la plus serrée) |
| fantassin / kamikaze | 1,40 | 1,40 |

La paire la plus serrée du bestiaire passe donc de **0,87 à 1,20** : le
plancher monte, il ne se déplace pas.

#### Les quatorze écrans contre les neuf points d'enregistrement

Un écran s'enregistre à neuf endroits et **un oubli ne lève rien**.
`#hautsFaits` n'en tenait qu'un — le fil d'Ariane.

| | avant | après |
|---|---|---|
| points tenus par `#hautsFaits` | **1 / 9** | 9 / 9 |
| contrôles muets (`#brief`, `#merchant`, `#hautsFaits`) | **~24** | 0 |
| listes JS qui se recopiaient | 4 | **0** (dérivées d'`ECRANS`) |
| listes CSS croisées par un contrôle | 0 | **5** |

Les quatre points dérivés — observateur, masquage de la barre, les deux
sélecteurs de son — ne **peuvent plus** diverger. Les cinq qui vivent en CSS le
peuvent encore, et `verifierEcrans(css)` les croise **dans les deux sens** : un
écran qui déclare un point absent de la règle, et un identifiant dans la règle
que la table ne déclare pas. Témoin : retirer `#hautsFaits` de deux règles fait
sortir exactement deux lignes.

La cinquième règle est le **miroir du curseur** — « ce qui montre le crochet est
exactement ce qui sonne au survol » était écrit des deux côtés et vérifié nulle
part.

#### Ce que le banc attend toujours

La table de `?banc` reste **vide**, et c'est la seule chose de ce plan qui
demande un navigateur : FPS médian et p1, ms p99 et max, `draws`, `quads`,
particules, aux quatre densités × cinq paliers de qualité. Le protocole est
écrit plus bas (0.25.1) ; ce qui se mesure sans navigateur l'est :
`verifierPopulation` ne signale **aucun** dépassement du budget de 16 ms au p99,
aux trois modes × trois effectifs sur 45 minutes.

### Ce qui restait à dire, plan 21 (0.24.2)

#### Le budget du tressaillement de touche

`PALIER` gagne sa dernière colonne. Le chiffre qui autorise l'exception est celui
déjà relevé au plan 15 : sur 17 317 vraies touches, le découpage est
**93 / 5 / 2 %**, soit **31,7 / 1,7 / 0,53 par seconde** pour léger / moyen /
lourd, toute l'équipe confondue.

Réservé à **son propre** tireur, le lourd tombe sous **0,15/s** à quatre joueurs.
À 0,7 px sur une vue de 1 600 et une décroissance de 0,2 s, c'est un accent
toutes les six à sept secondes — pas un tremblement.

#### L'acte final : quatre lignes sur treize

| type | acte déduit de | rayon |
|---|---|---|
| tank | rayon ≥ 20 | 63 |
| chœur | `auraRadius` | 130 |
| générateur | `egideRadius` | 150 |
| relais | `lienRange` | 300 |

Les neuf autres n'ont **aucun** acte final, et c'est la condition : à 20-60 morts
par seconde, un acte sur tous les types cesserait d'être une information.

#### Le mix après le plan 21

Même protocole qu'au plan 20 (`AudioContext` de papier, recettes du dépôt,
`pilotage()`, `diffSnapshots` à 20 Hz), cauchemar, 4 joueurs, 120 s.

| pop | pas (ms) | voix pointe | refusées/s | volées/s | nœuds/s |
|---|---|---|---|---|---|
| 50 | 0,080 | 8 | 14 | 0,0 | 115 |
| 100 | 0,104 | 8 | 18 | 0,0 | 126 |
| 150 | 0,182 | 9 | 22 | 0,0 | 133 |
| 200 | 0,316 | 12 | 27 | 0,0 | 200 |

**Aucune voix volée.** Le plan 21 n'ajoute aucune recette : ses trois lots sont
visuels, sauf le renommage d'`effleure` qui garde exactement le son qu'il avait.

### Le retour de combat, plan 20 (0.23.7)

#### Ce que le plan a trouvé, et que rien ne signalait

**Quatre défauts, tous silencieux, trois de la même famille** : un champ posé
d'un côté et jamais transporté de l'autre. `??` rend un repli qui a l'air normal,
donc le rendu dessine tranquillement la mauvaise chose.

| défaut | depuis | ce qu'on voyait |
|---|---|---|
| `f.ang` du balayage jamais sérialisé | l'origine de la lame | l'arc frappe **toujours vers l'est** |
| `f.n` jamais sérialisé pour un arc | l'origine du tesla | l'**amorce** — le trait qu'on a visé — n'a jamais été tracée |
| `f.n2` du second tranchant | l'origine de `lame_double` | le 2ᵉ arc n'existe pas à l'image |
| 2ᵉ garde `e.shieldArc > 0` inatteignable | 0.19.x | un tir bloqué se lit comme une **touche légère** |

`verifierEffets(g)` rejoue la classe entière : il **mesure** les emplacements du
tuple au lieu de les déclarer, et refuse toute valeur numérique non nulle posée
sur un effet vivant qui ne ressort nulle part. Témoin : réintroduire `n2` à la
main le fait parler immédiatement.

#### Le mix, mesuré avec le vrai limiteur

`MAX_VOICES` = 16, `SAME_COOLDOWN` = 40 ms, `CLAIM_GAP` = 90 ms.

Protocole : `GameState` piloté par `pilotage()`, profil `PROFIL_ENGAGE`, cartes
tirées au hasard à chaque niveau — le même harnais que `mesureSurvie`. Les
instantanés sont diffés par `diffSnapshots()` à 20 Hz avec la vue réelle centrée
sur le joueur 1, et les événements rejoués dans `playSound()` **avec les
recettes du dépôt**, sur un `AudioContext` de papier qui compte les nœuds.
Cauchemar, 4 joueurs, 300 s, population forcée.

| pop | pas (ms) | voix pointe | refusées/s | volées/s | nœuds/s | impacts/s | morts/s |
|---|---|---|---|---|---|---|---|
| 50 | 0,078 | 8 | 14 | 0,0 | 120 | 8,9 | 7,4 |
| 100 | 0,203 | 10 | 18 | 0,0 | 140 | 97,1 | 14,0 |
| 150 | 0,421 | 12 | 32 | 0,0 | 175 | 23,3 | 18,5 |
| 200 | 0,510 | 14 | 35 | 0,0 | 180 | 235,2 | 26,5 |

**Aucune voix volée à aucune densité.** La pointe monte de 8 à 14 sur 16 : le
limiteur travaille, il ne rompt pas. Les refus sont ce qui protège le mix — ils
montent avec la densité, comme prévu, et ce qu'ils refusent est la touche
ordinaire, jamais un boss ni un critique (`claim`).

#### Par arme, à 200 corps

180 s, cauchemar, 4 joueurs sur la **même** arme — le pire cas de contention,
puisque la clef du limiteur est la famille.

| arme | voix pointe | refusées/s | volées/s | nœuds/s | tirs/s | morts/s |
|---|---|---|---|---|---|---|
| standard | 11 | 35 | 0,0 | 178 | 31,3 | 25,9 |
| assaut | 11 | 35 | 0,0 | 178 | 37,6 | 21,7 |
| laser | 10 | 59 | 0,0 | 90 | 0,1 | 68,4 |
| tesla | 13 | 27 | 0,0 | 169 | 0,1 | 31,6 |
| lame | 12 | 31 | 0,0 | 119 | 0,2 | 34,7 |
| dispersion | 10 | 14 | 0,0 | 100 | 4,7 | 18,4 |
| railgun | 11 | 8 | 0,0 | 62 | 4,4 | 13,9 |
| grenade | 14 | 21 | 0,0 | 109 | 5,3 | 25,2 |
| siège | 13 | 18 | 0,0 | 93 | 3,0 | 22,6 |
| précision | 9 | 16 | 0,0 | 101 | 8,6 | 23,2 |

**Zéro voix volée sur les dix armes.** Le laser, le tesla et la lame rendent
~0,1 tir/s et c'est correct : ils ne créent pas de balle, donc `diffSnapshots`
n'en déduit aucun départ — c'est exactement pourquoi leurs trois familles ont
`son: null` et sonnent par leur délivrance.

Le laser paie le plus de refus (59/s) parce qu'il tue le plus (68 morts/s) : la
contention est sur la clef `mort`, pas sur le tir. C'est le comportement voulu —
le palier 1 porte sur la **cadence** des morts, pas sur la mort.

#### Coût de la matière à l'impact

Aucune particule de plus : `PALIER` décide toujours du compte, du cône et de la
vitesse ; `MATIERE.touche` ne fait que les plier. `PARTICLE_MAX` inchangé
(300 en 2D, 3 000 en WebGL). Le seul ajout d'émission du plan est la matière du
faisceau chaud, bornée à **16 Hz par émetteur** et **au-delà de 0,45 de jauge**
seulement — au plus 3 quads par émission en WebGL, 1 en 2D.

#### Le banc (0.25.0)

Les quatre protocoles ci-dessous étaient bloqués par un outil manquant, pas par
une difficulté : ils se jugent **à l'œil**, et il fallait pouvoir choisir l'arme,
la densité et le lieu sans relancer dix manches.

```bash
BANC=1 BIOME=fonderie GRAINE=7 npm start   # puis /?banc&perf
```

**1-0** les dix armes · **[** **]** la densité par pas de 50 · **H** coupe le HUD
· **R** lance un relevé de 10 s.
Les deux moitiés sont nécessaires : sans `BANC=1`, `?banc` n'obtient rien.

#### Le relevé (0.25.1)

`?perf` **montre** les chiffres, il ne les **retient** pas. Quatre densités fois
cinq paliers de qualité font vingt relevés, et recopier à la main un compteur qui
bouge en donne vingt dont aucun n'est comparable au suivant.

**R** échantillonne 10 s, imprime une ligne prête à coller (console **et**
presse-papier) et la laisse à l'écran. Le pire centile y est parce qu'il compte
plus que la moyenne : un rendu à 60 images en médiane qui tombe à 22 sur les
souffles est pire qu'un rendu plat à 50, et c'est justement la médiane qui le
cache.

Protocole : `BANC=1 BIOME=… npm start`, puis `/?banc&perf` ; pour chaque palier
de qualité (menu pause) et chaque densité (`[` `]`), tenir le tir et presser `R`.

| gfx | rendu | arme | corps | FPS méd | FPS p1 | ms p99 | ms max | draws | quads | frag max | voix pointe | refusées/s | volées/s |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| *(à remplir au banc)* | | | | | | | | | | | | | |

#### Ce qui n'a PAS été mesuré, et son protocole

- **FPS et coût WebGL par palier de qualité** : demande un navigateur.
  `?perf` affiche `fx`, `draws`, `quads`, `voices`, `peak`, `refus`, `vols`.
  Protocole : cauchemar, 200 corps, les dix armes, relever `draws`/`quads` à
  `gfx = low` puis `ultra`.
- **La lisibilité à 200 corps** : le test du nom masqué — regarder 10 s de jeu
  sans HUD et nommer l'arme. Aucun banc ne le remplace.
- **Le faisceau sur la Nébuleuse, les souffles sur la Fonderie** : contraste du
  retour contre chaque sol. `solDeBiome()` donne la teinte, le retour est
  additif — mais l'additif sur un sol clair est justement le cas qui se mesure
  à l'œil.

### Vérification du plan 19 (0.22.8)

#### Ce que le plan a touché

| | lignes |
|---|---|
| `public/render/blocs.js` | +1 148 |
| `public/render/decor.js` | +575 |
| `shared/biomes.js` | +317 |
| `public/render/dangers.js` | +159 |
| `public/render/material.js` | +117 |
| `public/render/world.js` | +3 |

**`shared/game_state.js` n'apparaît pas dans le diff**, ni `room.js`, ni
`server.js`, ni `hub.js`, ni `public/net/`. Trois mille lignes, et le cœur de
simulation n'a pas bougé d'un caractère : **zéro octet de réseau, zéro règle de
déplacement, zéro point de vie**. `git diff --stat c8854de..HEAD` le rejoue.

#### Le coût de navigation, là où le plan l'a augmenté

Le lot 7 ajoute des obstacles en cauchemar. `construireNav` est refaite une fois
par manche et à chaque couverture qui cède ; `diffuser` au plus une fois par
image (`_navBudget = 1`, `REBUILD_MIN = 0,2 s`).

| lieu | calme | normal | cauchemar | cellules bloquées (cauchemar) |
|---|---|---|---|---|
| usine | 45 obs · 0,05 / 0,18 ms | 63 · 0,05 / 0,17 | 81 · **0,04 / 0,17** | 9,9 % |
| fonderie | 27 · 0,07 / 0,17 | 45 · 0,04 / 0,18 | 63 · **0,05 / 0,17** | **15,0 %** |
| friche | 54 · 0,06 / 0,17 | 90 · 0,05 / 0,18 | 108 · **0,07 / 0,17** | 9,9 % |
| nébuleuse | 36 · 0,04 / 0,17 | 63 · 0,05 / 0,17 | 81 · **0,04 / 0,16** | 9,9 % |

**Le coût ne suit pas le nombre d'obstacles** : de 27 à 108 boîtes, `construireNav`
reste entre 0,04 et 0,07 ms. Il est dominé par l'allocation de la grille
(120 × 68 = 8 160 cellules), pas par le marquage. `diffuser` est plat à 0,17 ms,
et amorti par `REBUILD_MIN` il coûte **~0,014 ms par tick**.

#### Le pas complet, à population croissante

ms par tick, 600 ticks, 1 joueur, budget de 16,7 ms :

| lieu | mode | 50 | 100 | 150 | 200 |
|---|---|---|---|---|---|
| usine | normal | 0,063 | 0,068 | 0,082 | 0,117 |
| usine | cauchemar | 0,059 | 0,079 | 0,112 | **0,141** |
| fonderie | normal | 0,050 | 0,070 | 0,099 | 0,132 |
| fonderie | cauchemar | 0,049 | 0,077 | 0,104 | **0,130** |
| friche | normal | 0,051 | 0,071 | 0,095 | 0,130 |
| friche | cauchemar | 0,035 | 0,065 | 0,100 | **0,131** |
| nébuleuse | normal | 0,048 | 0,070 | 0,101 | 0,134 |
| nébuleuse | cauchemar | 0,041 | 0,071 | 0,107 | **0,146** |

À 200 corps le pas coûte **0,9 % du budget d'image**, et la géométrie de cauchemar
en ajoute au plus 20 % sur celle de normal (usine, 0,117 → 0,141).

#### La horde arrive-t-elle encore ?

Lâchée telle quelle, elle arrive **plus vite** en cauchemar (6,9 s de médiane)
qu'en calme (9,3 s) : le roster, la cadence et la rampe de vitesse de la
difficulté écrasent tout ce que la géométrie pourrait dire. **Le témoin garde donc
le profil fixe — normal — et ne change que la géométrie.** C'est la seule façon
d'attribuer un écart au lot 7 plutôt qu'au plan 18.

90 corps lâchés aux bords, joueur immobile au centre, 60 s :

| lieu | géométrie | arrivée | médiane | p90 | jamais arrivés |
|---|---|---|---|---|---|
| usine | calme / normal / cauchemar | 100 / 100 / 100 % | 7,8 → 8,1 → **8,1 s** | 9,2 → 9,6 → 9,8 | 0 |
| fonderie | | 99 / 97 / 98 % | 7,8 → 7,3 → **8,1 s** | 9,8 → 9,7 → 9,7 | 0 / 0 / 1 |
| friche | | 98 / 97 / 100 % | 7,5 → 8,0 → **8,4 s** | 9,2 → 9,9 → 10,1 | 0 |
| nébuleuse | | 100 / 99 / 100 % | 8,5 → 8,6 → **8,2 s** | 9,7 → 10,6 → 10,3 | 0 / 1 / 0 |

**Densifier le cauchemar coûte 0,3 à 0,9 s sur l'approche médiane et ne bouche
jamais.** Au pire un corps sur 90 n'arrive pas en 60 s. Le colosse (44 px/s),
signalé E4 au plan 18, arrive à 95 % dans les quatre lieux.

#### L'espace de combat

Arène échantillonnée tous les 20 px ; un point est jouable s'il n'est ni dans un
obstacle gonflé du rayon joueur, ni dans un danger **qui blesse**. Le dégagement
est la distance au premier blocage.

| lieu | % jouable (calme → cauchemar) | dégagement médian | 1er décile |
|---|---|---|---|
| usine | 94,0 → 91,7 → **85,4 %** | 196 → 125 → **70 px** | 40 → 30 → 18 |
| fonderie | 93,3 → 90,6 → **81,6 %** | 181 → 135 → **81 px** | 48 → 29 → 14 |
| friche | 95,1 → 91,8 → **83,2 %** | 171 → 108 → **63 px** | 41 → 25 → 14 |
| nébuleuse | 91,6 → 88,8 → **84,6 %** | 188 → 125 → **74 px** | 36 → 25 → 16 |

Monotone dans les quatre lieux et sur les trois métriques. Le plus resserré est
la Fonderie en cauchemar à 81,6 % de l'arène jouable — c'est le lieu dont la loi
est la masse, et c'est cohérent.

**Remesure (lot 8).** Les conduites de la Fonderie ont bougé de 0,06 à 0,12 pour
fermer l'abri de navigation ci-dessous. Au même protocole : **93,0 → 89,5 →
80,1 %**, soit −0,3 / −1,1 / −1,5 point — la conduite n'est plus collée au bord,
elle prend donc un peu plus d'arène. Monotonie conservée, classement des lieux
inchangé. Les colonnes de dégagement ne sont **pas** reprises : l'estimateur
rejoué donne 168/120/69 px sur l'Usine contre 196/125/70 publiés, donc il ne
mesure pas tout à fait la même chose et mélanger les deux ne dirait rien.

#### L'abri de navigation

Un joueur immobile, la horde lâchée en anneau à 800 px, spawner coupé, 120 s.
**Test A** = l'abri voulu, contesté après une fenêtre bornée. **Test B** = jamais
contesté. Le balayage large répond A partout ; c'est la géométrie fine qui
trouve B.

| portée | résultat |
|---|---|
| 17 286 positions, 5 lieux × 2 modes, pas de 80 px | **aucun B**, pire contact 6,3 s |
| fente Fonderie d1 (écart 64 px, long 416 px) | **119 s**, et **jamais** avec le spawner |
| fente jumelle, même géométrie, autre calage | 4,4 s |
| la même après correctif | 4,0 s |

Le pas de 80 px ne voit pas l'intérieur d'une fente de 64 px : un balayage seul
aurait conclu « pas d'exploit ». La forme se cherche donc sur la géométrie
(`passagesAveugles()`) et se confirme en simulation.

Les deux seuils, au **pire** calage de grille (fente centrée sur un multiple de
`CELL`, la bande libre tenant entre deux centres) :

| écart | 50 | 65 | 68 | 72 | 80 | 90 |
|---|---|---|---|---|---|---|
| contact | jamais | jamais | jamais | 5,1 s | 5,1 s | 4,9 s |

| longueur | 80 | 120 | 160 | 200 | 416 | 900 |
|---|---|---|---|---|---|---|
| contact | 4,3 s | 4,2 s | 4,2 s | jamais | jamais | jamais |

D'où `PASSAGE_MIN = 80` et `PASSAGE_LONG = 200`. Sur 20 calages tirés au hasard,
une bande de 22 px échoue 9 fois, 37 px une fois, 40 px une fois, 52 px zéro : le
défaut ne dépend que du calage, donc il est invisible à la lecture.

#### Les six contrôles rejouables

| contrôle | portée | état |
|---|---|---|
| `verifierBiomes()` | 200 graines × 4 lieux × 3 modes | **muet** (14,6 s) |
| `verifierNavigation()` | 5 lieux × 3 modes | **muet** — fentes aveugles comprises |
| `verifierBlocs()` | 12 familles / 12 fiches | **muet** |
| `verifierEmpreinte()` | 12 familles × gabarits réels × 5 positions | **muet** |
| `verifierDangers()` | 2 sens × 4 lieux | **muet** |
| `verifierAmers()` | 200 graines × 4 lieux × 3 modes | **muet** |

Trois d'entre eux n'existaient pas avant ce plan, et **les cinq défauts qu'ils
ont trouvés étaient tous silencieux** : l'embase de cheminée jamais dessinée, la
travée en créneau, le tracé qui se croise, les six entrées de dangers qui ne se
rencontraient pas, les candidats d'amer translatés en bloc.

#### Ce qui n'a PAS été mesuré, et son protocole

Trois choses demandent un navigateur et des yeux ; aucun banc ne les remplace.

- **Le test du nom masqué.** `BIOME=<clé> GRAINE=7 PORT=7911 node server.js`, une
  capture par lieu à la même graine, **recadrée sous le bandeau de segment**
  (le nom du lieu y est écrit), montrées dans le désordre. Réponse attendue :
  « un site abandonné / une usine automatisée / une fonderie / l'espace ».
  « Quatre installations industrielles » est un échec.
- **Le coût de rendu par palier.** `?perf` donne fps, particules, `GL/2D`, lots,
  quads. Relever aux quatre paliers `gfx` sur la **Nébuleuse** (le lieu le plus
  chargé : jusqu'à 11 baies × 4 blits depuis le lot 5, plus `orbite()`) et sur la
  **Fonderie** (jusqu'à 10 regards). Ce que le plan a ajouté au budget de rendu :
  une passe `orbite()` par baie, un `drawAmer()` par image, et trois habillages
  de bloc plus détaillés.
- **La lisibilité en combat.** 200 ennemis, projectiles, boss : vérifier que
  l'amer et le plan intermédiaire restent sous le gameplay. Ils sont dessinés
  sous `drawLumiere()`, donc la hiérarchie tient par l'ordre de dessin — mais
  l'ordre garantit la valeur, pas la quantité de détail.

### L'amer, et un jeu de candidats qui n'en était pas un (0.22.7)

Un point unique par arène, ancré au monde, tiré par graine. **Plaqué au sol,
sans collider, sans réseau, sans lumière** : le plus grand élément du lieu est
aussi celui qui ne coûte pas un pixel de collision.

| lieu | amer | rayon |
|---|---|---|
| friche | embase de la tour, pan qui a cédé, bassin repris par la brousse | 460 px |
| usine | cœur de ligne, plateau tournant, ancrages d'une machine démontée | 460 px |
| fonderie | creuset, ceintures réfractaires, trou de coulée | 460 px |
| nébuleuse | collier d'amarrage, griffes de verrouillage, secteurs de guidage | 460 px |

#### Le défaut que `verifierAmers()` a trouvé

Le premier jet tirait **un** décalage appliqué aux six candidats : le jeu de
positions était donc un motif rigide **translaté en bloc**, donc six essais qui
réussissaient ou échouaient presque ensemble.

| | candidats | jitter | échecs / 40 graines | pire distance |
|---|---|---|---|---|
| premier jet | 6 | commun aux six | **11** (friche/cauchemar) | 139 px |
| écart par candidat | 10 | propre à chacun | 1 | 178 px |
| **retenu** | **14** | **propre à chacun** | **0** | **≥ 187 px** |

Garde de 187 px = `AMER_R × 0,32 + 40` — elle porte sur le **cœur** de l'amer et
non sur son rayon plein : les anneaux extérieurs sont clairsemés, un danger qui
en effleure un ne trompe personne, alors que le disque central plein pourrait
passer pour une surface.

**Le défaut n'était pas la garde, c'était le nombre de points réellement
distincts.** C'est la Friche — le lieu le plus dense, 12 obstacles et 5 dangers
par vue en cauchemar — qui l'a révélé.

**On prend le moins mauvais, pas le premier qui passe.** En cauchemar l'arène
porte jusqu'à 45 dangers : un « premier emplacement libre » n'aurait aucune
garantie d'exister, et un repli silencieux poserait l'amer sur une flaque — deux
marquages au sol au même endroit, dont un seul blesse.

Collision de nom évitée au passage : `drawRepere()` existe déjà et c'est la mire
de calage `?repere`. Le terme cartographique exact pour un point de repère est un
**amer**.

`verifierAmers()`, `verifierBlocs()`, `verifierEmpreinte()` et
`verifierDangers()` muets sur 200 graines ; `verifierBiomes()` muet sur 200
(13,7 s), `verifierNavigation()` muet.

### La difficulté touche enfin le terrain (0.22.6)

*« La géométrie est la MÊME dans les trois modes, seuls les dangers changent »*
était écrit comme un invariant depuis le plan 14. Il tombe ici — seul point du
plan 19 qui lève une règle du dépôt, et il le fait sur demande explicite.

| lieu | objets/vue | % obstacles | dangers/vue | % dangers |
|---|---|---|---|---|
| usine | 5 → 7 → **9** | 2,9 → 4,2 → **5,3** | 0 → 2 → **5** | 0 → 4,6 → **6,3** |
| fonderie | 3 → 5 → **7** | 5,1 → 6,8 → **8,5** | 0 → 2 → **4** | 0 → 5,2 → **6,2** |
| friche | 6 → 10 → **12** | 2,6 → 4,4 → **5,3** | 0 → 2 → **5** | 0 → 5,6 → **6,8** |
| nébuleuse | 4 → 7 → **9** | 5,6 → 7,0 → **7,3** | 0 → 2 → **5** | 0 → 6,0 → **6,4** |

Plafond d'obstacles à 10 % tenu partout ; la Fonderie en cauchemar est la plus
proche, à 8,5 %.

**Ce qui change est ce qu'il y a, pas la taille de ce qu'il y a.** Un facteur
d'échelle sur `w`/`h` aurait donné la même arène grossie — donc le même parcours,
avec moins de place. Une entrée en plus ou en moins change le **chemin**. C'est
la différence entre « plus exigeant spatialement » et « le joueur ne peut plus
bouger ».

On **ouvre par le centre** — les entrées retirées au calme sont celles qui
encombrent le milieu — et on **resserre par le pourtour**. Ce que la Nébuleuse
ajoute en cauchemar est **destructible** : `celluleTraversable()` ignore les
couvertures, donc densifier par là ne peut pas fermer le carré central, et le
joueur garde un moyen de rouvrir un passage au tir.

**Monotonie stricte, vérifiée.** `verifierBiomes()` refuse qu'un mode n'ait pas
plus d'obstacles **et** plus de surface que le précédent, par lieu. Trois modes
qui produisent la même géométrie ne servent à rien ; un cauchemar plus *ouvert*
qu'un normal serait une inversion de signe que personne ne remarquerait à
l'écran.

**Les quatre lois restent séparées aux mêmes écarts** — la loi d'implantation est
celle du **cauchemar**, les deux autres modes en sont des retraits, donc
`signatureBiome()` ne bouge que d'un facteur commun :

| paire | axe | écart |
|---|---|---|
| usine / fonderie | contraste | 47 % |
| usine / friche | élongation | 57 % |
| usine / nébuleuse | contraste | 87 % |
| fonderie / friche | contraste | 56 % |
| fonderie / nébuleuse | contraste | 75 % |
| friche / nébuleuse | contraste | 89 % |

Deux entrées de cauchemar de l'Usine tombaient sur un danger au premier essai
(le poste sur un geyser à 67 px pour 70 de rayon, la machine sur le bac de trempe
à 50 pour 85) : `comptePosesSurObstacle` les a signalées sur les 60 graines avant
qu'aucune image ne soit produite.

**Aucun PV, aucun dégât, aucun multiplicateur ne bouge.** Le terrain n'est pas un
second système de difficulté : `_teamPower()` et le résidu de `DIFFICULTIES`
restent seuls. `verifierBiomes()` muet sur 200 graines (11,5 s),
`verifierNavigation()`, `verifierBlocs()`, `verifierEmpreinte()` et
`verifierDangers()` muets.

### Les dangers : une échelle par lieu, six entrées qui ne se rencontraient pas (0.22.5)

#### L'état de départ

| lieu | `kind` posés | normal | cauchemar |
|---|---|---|---|
| usine | **3/5** | ralenti ×2, r110 | 5,28 % · 7,14 % |
| fonderie | **4/5** | ralenti ×2, r110 | 5,28 % · 6,61 % |
| friche | **3/5** | ralenti ×2, r110 | 5,28 % · 5,29 % |
| nébuleuse | **4/5** | ralenti ×2, r110 | 5,28 % · 6,83 % |

**Le mode normal était rigoureusement identique dans les quatre lieux** — deux
champs de ralentissement, même rayon, même place, 5,28 % de surface. Toute une
difficulté sans une once d'identité, pour un tiers du budget.

Et `h.r` était lu par `buildBiome` depuis toujours (`h.r ?? d.r`) : **aucune
table ne s'en servait**. Tout geyser faisait 70 px dans les quatre lieux, toute
flaque 85. Le dessin changeait, la géométrie non — et c'est la géométrie qu'on
joue.

#### Six entrées qui ne se rencontraient pas

| sens | ce qui manquait |
|---|---|
| dessin sans pose | chariot (usine) · boue (friche) · glissant (fonderie) · anomalie (nébuleuse) |
| pose sans dessin | flaque (usine) · braise (friche) |

Aucun des deux sens ne lève quoi que ce soit : une entrée morte ne se signale
jamais, et un `kind` sans dessin replie sur `defaut()` — un disque ambre qui a
l'air d'un placeholder mais qui **joue normalement**. `verifierDangers()` croise
les deux tables dans les deux sens.

**La Fonderie dessinait son ralenti et son glissant avec la même fonction.** Deux
mécaniques opposées sous une seule image — le joueur ne peut pas savoir si le sol
va le freiner ou l'emporter. Tant que le glissant n'y était posé nulle part ça
n'avait aucune conséquence, et c'est exactement ce qui rendait la chose
invisible. Il a son **vitrifié**, dont la matière est déjà dans sa tuile de sol.

#### L'échelle par lieu

`ECHELLE` multiplie `r`. **L'Usine n'y figure pas : elle est la référence.**

| | geyser | flaque | braise | ralenti | glissant |
|---|---|---|---|---|---|
| usine (référence) | 70 | 85 | 55 | 110 | 95 |
| friche | ×0,76 | ×1,24 | ×1,10 | ×1,10 | ×1,10 |
| fonderie | ×1,14 | ×1,30 | ×1,26 | ×1,10 | ×1,00 |
| nébuleuse | ×0,72 | ×1,16 | ×0,80 | ×1,10 | ×1,20 |

**`dot` ne bouge jamais.** Ce qui blesse doit blesser pareil partout, sinon le
joueur réapprend un barème à chaque lieu ; la seule constante des quatre reste
« ce qui est chaud blesse, ce qui est froid ralentit ».

#### Et les quatre restent comparables

| mode | usine | fonderie | friche | nébuleuse | moyenne | écart max |
|---|---|---|---|---|---|---|
| normal | 4,61 % | 5,16 % | 5,60 % | 6,03 % | 5,35 % | **13,8 %** |
| cauchemar | 6,34 % | 6,16 % | 6,85 % | 6,36 % | 6,43 % | **6,5 %** |

`verifierBiomes()` refuse un écart de plus de **25 %** à la moyenne, à mode égal :
le §28 rendu exécutable. Une identité qui rendrait un lieu franchement plus dur
est un déséquilibre, pas une identité.

**Le budget évinçait en silence.** Un premier équilibrage mettait la Fonderie à
9,8 % pour un plafond de 8 % : elle perdait 3 flaques, 11 braises et 11 geysers,
et rien ne le disait — la table annonçait cinq entrées, l'arène en construisait
moins. `hazardJetes` les compte, `verifierBiomes()` les refuse.

Couverture finale **5/5 pour les quatre lieux**. `verifierBiomes()` muet sur
200 graines (11,5 s), `verifierNavigation()`, `verifierBlocs()`,
`verifierEmpreinte()` et `verifierDangers()` muets.

### La Nébuleuse, et trois défauts que rien ne signalait (0.22.4)

Les quatre lieux ont désormais leur vocabulaire bâti. Tableau complet du vide
d'empreinte, **pire sur cinq positions**, seuil ramené de 12 à **10 %** :

| lieu | famille | gabarit | vide |
|---|---|---|---|
| usine | chaîne | 368 × 32 | 0,0 % |
| usine | cellule | 83 × 117 | 5,4 % |
| usine | poste | 77 × 81 · 112 × 43 | 1,3 % · 1,5 % |
| fonderie | four | 192 × 171 | 0,5 % |
| fonderie | conduite | 416 × 43 | 2,8 % |
| fonderie | cuve | 112 × 63 | 5,7 % |
| friche | ruine | 136 × 63 · 72 × 99 · 96 × 43 | 5,5 % · 3,8 % · **8,2 %** |
| friche | mur | 176 × 36 | 7,2 % |
| friche | carcasse | 131 × 43 · 99 × 59 · 64 × 88 | 4,3 % · 4,1 % · 4,5 % |
| nébuleuse | travée | 32 × 504 | 2,5 % |
| nébuleuse | fragment | 232 × 135 | 3,4 % |
| nébuleuse | débris | 67 × 34 · 58 × 29 | 1,9 % · 2,3 % |

Le seuil suit ce que le dépôt tient : il valait 12 % quand la plus creuse était
le débris à 9,6 %. La plus creuse est maintenant la ruine de la Friche à 8,2 %,
et garder l'ancienne marge reviendrait à la garder pour un défaut corrigé.

#### Les trois défauts, et aucun ne se voyait

| # | ce qui n'allait pas | mesuré | après |
|---|---|---|---|
| 1 | le **débris** portait le chanfrein de 16 px du fragment sur 58 × 29 : quatre coins coupés de plus de la moitié de la hauteur | 9,6 % | **2,3 %** |
| 2 | la première **travée** alternait plat / creux d'un nœud à l'autre — un **créneau**, qui retire la moitié de la longueur | 12,7 % | **2,5 %** |
| 3 | le coin cisaillé du **fragment** émettait ses deux points toujours dans le même ordre, alors que le premier est sur l'arête d'**arrivée** : tracé qui se croise | 10,0 % | **3,4 %** |

Le second est le plus intéressant : un créneau n'est pas un défaut de dessin,
c'est un défaut de **jeu** — un joueur qui glisse le long d'une travée aurait
buté sur du vide un pas sur deux. Un creux triangulaire au nœud seul retire
`largeur × profondeur / 2` par nœud au lieu de la moitié de la longueur.

Le troisième ne produisait aucune erreur : un chemin qui se croise reste
dessinable, il a seulement un enroulement inversé sur le triangle. À l'écran il
aurait fallu regarder très près.

#### Le plan intermédiaire

Le fond avait **trois** vitesses — astres 0,05, gaz 0,10, étoiles 0,16 — donc
trois couches toutes à l'infini ou presque. Rien entre le ciel et le plancher,
alors que c'est là que se joue la sensation d'espace : une structure qu'on
dépasse dit la distance, une étoile ne le peut pas.

| | technique | mémoire | où |
|---|---|---|---|
| astres 0,05 | image cuite 2200 × 1500 | 13 Mo | pleine vue + baies |
| gaz 0,10 | image cuite demi-résolution | 3,3 Mo | pleine vue + baies |
| étoiles 0,16 | image cuite 2200 × 1500 | 13 Mo | baies seules |
| **orbite 0,22** | **chemins, tirés par cellule** | **0** | **baies seules** |

Une quatrième image cuite aurait coûté 13 Mo pour quelques pour cent
d'occupation utile — ce sont des **silhouettes**. Cellule de 620 px, taux 0,46,
soit ≤ 4 cellules testées par baie et le plus souvent une structure retenue :
au pire 11 baies × ~2 structures × ~15 opérations de chemin.

Trois contraintes d'ordre, chacune pour une raison :

- **plus rapide que les étoiles donc plus proche donc dessiné après elles** — une
  station passant derrière une étoile serait le seul endroit du jeu où la
  profondeur mentirait ;
- **sous le voile de verre** — le décor perd du contraste avant le gameplay ;
- **dans les baies seulement** — sous un plancher à 0,93 il aurait coûté une
  passe pleine vue pour rester invisible, l'argument qui avait déjà sorti les
  étoiles de `drawFond()`.

**Une seule direction de lumière** pour toute la couche : dans le vide il y a un
astre, pas douze. Et les feux des modules battent **quatre fois plus lentement**
que ceux des travées du plan de jeu — on ne les confond pas avec un objet qu'on
peut atteindre.

Signatures des quatre lieux **inchangées** ; `verifierBiomes()` muet sur
200 graines (11,8 s), `verifierNavigation()`, `verifierBlocs()` et
`verifierEmpreinte()` muets.

### La Fonderie, et une branche morte depuis le plan 16 (0.22.3)

| famille | ce qui la dit | vide d'empreinte |
|---|---|---|
| four | octogone à huit côtés égaux, brique, tirants, gueule ou embase | 0,5 % |
| conduite | coins **de bout seuls**, dégradé transversal, selles, brides, joint qui fuit | 2,8 % |
| cuve | biseau **allongé**, ceinture ferrée, peau noire déchirée, tourillons | 5,7 % |

#### L'embase de cheminée n'avait jamais été dessinée

La charte déclare : *« l'embase de cheminée est le pied des cheminées du premier
plan, posée sur les fours qui n'ont pas de gueule — sans elle les silhouettes du
bord ne tiennent à rien »*. Le code disait l'inverse, **en silence** :

```
const seuil = cle === "fonderie" ? 10 : …
if ((h % 10) >= seuil) return null;     // h % 10 ∈ [0,9] : jamais vrai
```

`ledDe()` ne rendait donc jamais `null` pour ce lieu, et la branche `if (!l)` de
`four()` était morte depuis son écriture. Seuil ramené à **6**.

**Sources fixes de la Fonderie**, graine 7, arène complète :

| famille | avant | après | type |
|---|---|---|---|
| four | 18 / 18 | **8 / 18** | gueule (`r ≈ long + 128`) |
| conduite | 9 / 9 | **0 / 9** | — |
| cuve | 18 / 18 | 18 / 18 | gueule (`r ≈ long + 74`) |
| **total** | **45** | **26** | |

Neuf conduites par arène portaient une bouche de four : les trois familles
tiraient la même déclaration. Une conduite ne s'ouvre pas — ce qui brûle est
dedans, et ne se voit qu'aux joints, dans l'habillage. Une pièce manifestement
brûlante qui n'est **pas** une source de lumière de plus : la gueule et la coulée
en tiennent déjà deux, une troisième rendrait le tampon uniformément chaud.

Le seuil ne peut pas viser 2/3 : `h = (x·73856093) ^ (y·19349663)` sur des
positions pavées et mirroitées ne donne que deux paquets modulo 10 — 44 % à
seuil 5 ou 6, 89 % à 7 ou 8. Le pas est grossier, et **c'est le seuil 6 qui sert
le lieu** : une halle où plus de la moitié des fours sont en veille a du
contraste thermique, ce que la couche de 1 200 px raconte au même moment.

#### L'air, terme à terme contre l'Usine

| | Usine | Fonderie |
|---|---|---|
| vitesse | 64 | **9** |
| longueur | 7 | **9** |
| brins | 130 | **72** |
| épaisseur | 1,2 | **2,3** |
| angle | 0,12 rad, tenu | **−π/2**, ±0,10 |

Teinte **cendre** et non fonte : ce qui flotte a refroidi, le ton chaud reste à
ce qui brûle. `AMB_DEFAUT` est **supprimé** — les quatre lieux déclarent leur
air, et un cinquième qui ne le ferait pas n'en aurait aucun (visible tout de
suite) plutôt que celui d'un autre (jamais signalé).

Signatures des quatre lieux **inchangées** ; `verifierBiomes()` muet sur
200 graines (11,7 s), `verifierNavigation()`, `verifierBlocs()` et
`verifierEmpreinte()` muets.

### L'Usine, trois rôles dans une même ligne (0.22.2)

| famille | rôle | ce qui le porte | vide d'empreinte |
|---|---|---|---|
| chaîne | transporte | longerons, rouleaux, taquet qui court, groupe d'entraînement | **0,0 %** |
| cellule | transforme | profil en marche, tôle nervurée, lucarne, table nue + pièce | **5,4 %** |
| poste | commande | joint de porte, poignée, ouïes groupées, pupitre | 1,3 % · 1,5 % |

La chaîne à **0,0 %** est un rectangle plein : elle est la seule pièce du dépôt
sans un coin cassé. À 368 × 32 px un chanfrein de 6 px ne se voit pas, alors
qu'une poutre **extrudée** se voit. Les trois autres familles d'Usine gardent
leurs coins coupés — c'est l'écart qui parle, pas la valeur.

La marche de la cellule est à **12 % de la hauteur**, soit 14 px sur 117 : assez
pour lire un bâti et une table, pour 5,4 % d'empreinte vide, sous le seuil de
12 % et sous la ruine de la Friche (8,2 %).

**L'air de l'Usine ne dérive pas, il tire.** Le champ commun faisait osciller son
angle de ±0,30 rad — la signature d'un courant d'air *libre*, donc de tout sauf
d'une extraction.

| | commun | Usine |
|---|---|---|
| vitesse | 24 | **64** |
| oscillation d'angle | ±0,30 rad | **0** |
| angle | π × 0,62 | **0,12 rad** |
| brins | 150 | 130 |

L'angle n'est pas horizontal : à 0 exactement les brins se confondraient avec le
trait franc de la grille de 20 m, seul autre réseau rectiligne du lieu.

#### Deux trouvailles du banc

**`verifierEmpreinte()` a levé `g.rect is not a function`** au lieu de mesurer du
vide : l'enregistreur de chemin ne connaissait que `moveTo`/`lineTo`, et la
chaîne est la première forme à utiliser `rect`. Un enregistreur incomplet ne
rend pas un faux chiffre, il casse — c'est ce qu'on lui demande.

**La bascule d'orientation de `chaine()` n'aurait jamais tourné** : la loi de ce
lieu ne pose que des bandes horizontales (« chaîne, allée, chaîne »). Retirée,
pas gardée au cas où. Contraste avec la Friche en 0.22.1, où la branche verticale
de la carcasse a été rendue *vivante* parce que trois épaves de même gabarit
étaient un défaut de composition — ici l'uniformité est la loi.

Signatures des quatre lieux **inchangées** ; `verifierBiomes()` muet sur
200 graines (11,6 s), `verifierNavigation()`, `verifierBlocs()` et
`verifierEmpreinte()` muets.

### La Friche, et une règle qui n'était pas rejouée (0.22.1)

**`verifierEmpreinte()`** fait dessiner chaque famille dans un enregistreur de
chemin — les formes n'émettent que `moveTo`/`lineTo`, donc c'est de la géométrie
pure — et mesure la part de rectangle laissée vide, sur les **gabarits réels**
et **cinq positions**. Seuil 12 %.

| lieu | famille | gabarit | vide au pire |
|---|---|---|---|
| usine | chaîne | 368 × 32 | 0,4 % |
| usine | machine | 83 × 117 | 0,7 % |
| usine | poste | 77 × 81 · 112 × 43 | 1,3 % · 1,5 % |
| fonderie | four | 192 × 171 | 0,5 % |
| fonderie | conduite | 416 × 43 | 0,9 % |
| fonderie | cuve | 112 × 63 | 2,0 % |
| friche | ruine | 136 × 63 · 72 × 99 · 96 × 43 | 5,5 % · 3,8 % · **8,2 %** |
| friche | **mur** | 176 × 36 | **7,2 %** |
| friche | **carcasse** | 131 × 43 · 99 × 59 · 64 × 88 | 4,3 % · 4,1 % · 4,5 % |
| nébuleuse | fragment | 232 × 135 | 1,6 % |
| nébuleuse | travée | 32 × 504 | 1,1 % |
| nébuleuse | débris | 67 × 34 · 58 × 29 | 9,2 % · **9,6 %** |

Le seuil est à 12 % parce que les formes **d'origine** y tiennent : la plus
creuse est le débris de la Nébuleuse à 9,6 % (`chanfreine` à 16 px sur 58 × 29),
antérieure au plan et à revoir au lot 5. Les deux formes de ce lot sont dans la
gamme de la ruine qu'elles côtoient.

**Le piège, payé dès la première mesure.** `graine(o)` vaut **zéro** en (0, 0) :
un obstacle posé à l'origine tire la variante *nulle* de toute forme aléatoire —
créneaux tous plats, nez toujours du même côté. Le banc annonçait **0,0 %** de
vide sur le mur bas, ce qui était exact et ne voulait rien dire. La mesure se
fait donc sur cinq positions et garde la pire ; le mur bas passe de 0,0 à 7,2 %.

**Trois épaves de même gabarit étaient trois fois le même objet.** Elles portent
maintenant trois formats à surface égale (± 3 %). La vue étant en 16/9, un format
**debout** demande `h/w > 1,78` en fraction et non 1,2 — avec l'ancien 0,062 ×
0,066 la branche verticale de la silhouette ne s'exécutait **jamais**.

Signature de la Friche **inchangée** : 10,0 obj/vue · 4,4 % · ×2,1 · ×4,9.
`verifierBiomes()` muet sur 200 graines × 4 lieux × 3 modes (11,8 s),
`verifierNavigation()`, `verifierBlocs()` et `verifierEmpreinte()` muets.

#### Faire tourner les contrôles du rendu hors navigateur

`blocs.js` importe `stage.js`, et les modules client utilisent des
spécificateurs absolus (`/shared/…`, `/gl.js`) que Node résout depuis la racine
du disque. Un **hook de résolution** (`node:module` `register()`) qui rejoue
`resolvePath()` de `server.js`, plus un DOM-proxy qui avale tout, suffisent à les
charger : `localStorage` rendant une valeur non nulle, `rendererFlag()` ne vaut
pas `"webgl"` et `createGL` n'est jamais construit. C'est ce qui rend
`verifierBlocs()` et `verifierEmpreinte()` rejouables en script jetable plutôt
qu'à la console — `verifierSilhouettes()` peut suivre le même chemin.

#### Une recette que personne ne nomme (0.28.3)

`verifierFeedback()` refuse un nom de recette **absent** de la palette. Il ne dit
rien du sens inverse : une recette **présente** dans la palette qu'aucun chemin
n'atteint. `annonce` est restée écrite et muette assez longtemps pour qu'un
**ordre de boss arrive en silence**, et rien ne pouvait le lever.

**Le contrôle est STATIQUE, et c'est mesuré.** On croise `recettes()` avec le
texte de tout le dépôt : une recette dont le nom n'apparaît nulle part hors
d'`audio.js` est orpheline. Vingt lignes de Node, et c'est ce qui a trouvé
`annonce` — **une seule sur cinquante**.

```js
const jamais = audio.recettes().filter(n => !code.includes(`"${n}"`));
```

**Un comptage à l'exécution ne peut pas le remplacer, et ç'a été essayé.** Un
compteur dans `playSound` a été écrit, mesuré, puis **retiré**. Sur cent minutes
de jeu piloté (calme solo, normal à deux, cauchemar à quatre, quinze combats de
boss traversés), le pipeline complet — `GameState` → `snapshot(vue)` → `ingest`
→ `EventPump` → `playSound`, avec les vraies recettes sur un `AudioContext` de
papier — n'en nomme que **28 sur 50**. Les vingt-deux autres ne sont pas
orphelines : ce sont les quatre voix d'arme que le bot n'équipe pas, la recharge
et sa fin, le geyser, le rempart, la provocation, la vague de soin, le
relèvement et la mise à terre (les bots de mesure sont immortels), et les huit
sons d'interface, qui n'ont pas d'interface. **Un comptage mesure une
COUVERTURE, pas une orpheline** — et un compteur dont la seule lecture ne peut
pas conclure est exactement ce que ce dépôt supprime.

Le harnais reste utile pour autre chose : c'est le même que celui du mix, et
c'est lui qui rejoue le limiteur avec les vrais événements.

### Le vocabulaire bâti d'un lieu (0.22.0)

Plomberie du plan 19 : `kind` sur l'obstacle, `BLOC[biome][kind]` côté rendu.
**Aucun pixel ne bouge** — le contrôle de non-régression est que les quatre
signatures d'implantation soient identiques au relevé de 0.19.6.

| lieu | densité | encombrement | contraste | élongation | obstacles | familles posées |
|---|---|---|---|---|---|---|
| usine | 7,0 | 4,2 % | ×2,5 | ×11,4 | 63 | chaîne 18 · poste 27 · machine 18 |
| fonderie | 5,0 | 6,8 % | ×4,7 | ×9,6 | 45 | four 18 · conduite 9 · cuve 18 |
| friche | 10,0 | 4,4 % | ×2,1 | ×4,9 | 90 | ruine 54 · mur 9 · carcasse 27 |
| nébuleuse | 7,0 | 7,0 % | ×18,9 | ×15,8 | 63 | fragment 18 · travée 18 · débris 27 |

Les quatre lignes de gauche sont celles de 0.19.6 au dixième près : la géométrie
est inchangée, et c'est ce qu'on voulait démontrer.

**Les familles n'ont pas été inventées, elles ont été nommées.** Elles vivaient
déjà dans `OBSTACLES` sans nom — la barre de 0,230 × 0,036 de l'Usine et son
armoire de 0,048 × 0,090 ne sont pas le même objet. Douze familles, chacune
propriété d'un seul lieu.

`verifierBiomes()` **muet sur 200 graines × 4 lieux × 3 modes** (12,3 s),
appartenance et entrées mortes comprises ; `verifierNavigation()` muet sur
4 lieux × 3 modes × 3 graines.

`verifierBlocs()` : **12 familles, 12 fiches de dessin.** Il vit côté client ;
le protocole pour le jouer hors navigateur est décrit en 0.22.1.

### La horde et le terrain (0.21.0)

**Le défaut, reproduit avant d'être corrigé.** Un corps lâché à 212 px de sa
cible, celle-ci derrière la chaîne de production de l'Usine (368 × 32 px) :

| lieu | avant | après |
|---|---|---|
| usine, cible derrière la chaîne | **jamais** en 40 s, figé à 134 px | 5,5 s |
| poche en U (3 boîtes) | **jamais** en 60 s, figé à 253 px | 11,2 s |
| fonderie / friche / nébuleuse | 4,0 à 6,3 s | 3,1 à 5,7 s |

Le corps se figeait à **(448, 172)**, c'est-à-dire au centre exact de la face
basse du mur, au pixel près, pendant 39 des 40 secondes. Deux causes empilées :
le sondage d'évitement était **un point** à `r + 46` px, donc il sautait
par-dessus toute cloison plus mince que lui (la plus mince du dépôt fait 32 px) ;
et le centre d'une face est un **attracteur**, la composante tangentielle y étant
nulle par symétrie.

**Ce que coûte la couche.** Usine, cible mobile, moyenne sur 30 s de jeu :

| effectif | corps | sans nav | avec nav | écart | distance moyenne à la cible |
|---|---|---|---|---|---|
| 1 j | 50 | 0,064 ms | 0,062 ms | −0,002 | 314 → 311 px |
| 1 j | 100 | 0,079 ms | 0,087 ms | +0,008 | 311 → 303 px |
| 1 j | 150 | 0,091 ms | 0,108 ms | +0,017 | 390 → 367 px |
| 1 j | 200 | 0,115 ms | 0,136 ms | +0,021 | 384 → **352 px** |
| 2 j | 200 | 0,119 ms | 0,135 ms | +0,015 | 293 → 279 px |
| 4 j | 200 | 0,125 ms | 0,158 ms | +0,033 | 263 → 253 px |

Une diffusion vaut **0,202 ms** sur 8 160 cases, et il en part au plus une par
image. Le pas complet reste à **0,16 ms en moyenne, 0,46 ms au p99** à 200 corps
et quatre joueurs, pour un budget de 16,6 ms.

**Deux pièges payés, tous deux mesurés.** La case libre « la plus proche » d'un
corps plaqué contre une cloison est celle d'**en face** : elle porte une distance
plus courte, donc elle aspire le corps dans le mur — 4 corps sur 4 plantés à la
face, 0 arrivée en 40 s. Le bon côté se **souvient** (`navAncre`). Et le point
visé doit se rejoindre en ligne droite : sinon la tangente locale corrige un cap
qui traverse la boîte et annule exactement la composante qui ferait tourner le
coin (poche en U : 0 arrivée avant, 11,2 s après).

**Le désenclavement a été supprimé après mesure.** Détection d'immobilité sur
fenêtre d'une seconde, biais latéral, reprise forcée du champ : sur douze
mesures (quatre lieux × trois graines, 200 corps, 2 joueurs), la distance moyenne
à la cible bouge de **1 px sur 283**. Le champ résout déjà la géométrie, la
séparation résout la foule. Le biais latéral, lui, *dégradait* — 2 corps sur 60
bloqués dans la poche en U contre 0 sans lui. La détection reste comme critère
dans `verifierDeplacement()`, pas comme code.

**Non-régression du contact**, 120 corps sur un joueur immobile pendant 12 s :
pénétration au-delà de la morsure **0,00 px**, dérive du joueur **0,00 px**.

`verifierDeplacement()` rejoue les dix situations (ligne directe, cloison mince,
mur long, poche en U, couloir étroit, deux boîtes proches, goulet à 50/100/150/
200 corps, cible mobile, quatre cibles, cible qui meurt, couverture détruite) et
la grille des quatre lieux. Muet au 0.21.0.

### Le sol de horde n'était pas de la horde (0.21.8)

`verifierTraits` signalait « le sol de horde couvre 21 à 41 % d'une vue pour un
budget de 12 % » à **chaque** exécution depuis le lot 1. Le diagnostic du lot 3
disait déjà où regarder ; le correctif tient en un renommage.

`_groundZone` a **cinq** appelants et estampillait le même drapeau sur tous :
la traînée, les spores et le saboteur — la horde — mais aussi **la carte de
terrain d'un joueur** (`_blastGround`) et **les nœuds du boss**. Le drapeau
portait deux sens à la fois :

| sens | vrai pour | lu par |
|---|---|---|
| « ce sol est persistant, ce n'est pas un télégraphe » | les cinq | `_zoneEcarteAbris`, `_solPose`, `_foyerPoint` |
| « ce sol compte dans le budget de la horde » | **trois sur cinq** | le plafond, `mesureTraits` |

La preuve était dans la mesure elle-même : le **calme**, qui n'attache aucun
trait et n'a donc ni traînée ni spore, affichait quand même 21 %. Et le plafond
évinçait « la plus ancienne zone de horde » sans regarder qui l'avait posée —
le terrain d'un joueur pouvait donc effacer une traînée, et l'inverse.

La provenance est nommée (`SOL_HORDE`, `SOL_JOUEUR`, `SOL_BOSS`) et reste
toujours vraie, donc la logique d'abri du boss ne bouge pas d'un pixel. Seuls
le plafond et la mesure savent désormais de quoi ils parlent.

**`verifierTraits` est muet**, pour la première fois du plan.

### L'identité, rendue vérifiable (0.21.7)

**La charte disait qu'un corps se reconnaît sans sa couleur ; rien ne le
vérifiait.** Cinq nombres par silhouette, sur le modèle de `signatureBiome()` :

| type | élancement | remplissage | sommets | avance | matière |
|---|---|---|---|---|---|
| fantassin | 0,87 | 0,79 | 37 | −0,054 | 0,79 |
| coureur | 0,52 | 0,65 | 10 | −0,206 | 0,70 |
| colosse | 0,91 | 0,70 | 22 | 0,015 | 1,00 |
| tireur | 0,69 | 0,61 | 13 | 0,020 | 0,91 |
| pondeuse | 0,69 | 0,75 | 23 | −0,003 | 0,71 |
| kamikaze | 0,97 | 0,69 | 37 | 0,023 | 0,63 |
| porte-bouclier | 0,96 | 0,79 | 29 | 0,001 | 0,66 |
| soigneur | 2,00 | 0,83 | 32 | −0,023 | 0,66 |
| chœur | 1,12 | 0,78 | 27 | 0,001 | 0,78 |
| harceleur | 0,60 | 0,81 | 14 | −0,005 | 0,54 |
| générateur | 1,10 | 0,79 | 34 | 0,038 | **0,39** |
| saboteur | 1,04 | 0,89 | 17 | −0,049 | 0,65 |
| relais | **2,59** | 0,84 | 25 | −0,020 | 0,54 |

**Deux mesures ont été refaites avant de servir.** L'aire signée n'a aucun sens
sur ces formes : un corps est fait de sous-tracés **disjoints** — un tronc, deux
lames, trois pattes — dont les enroulements s'annulent. Elle rendait 0,03 pour
le harceleur et 1,00 pour le colosse, c'est-à-dire du bruit. Remplacée par
l'**enveloppe convexe**. Et l'enveloppe ne voit pas les creux : il a fallu un
cinquième axe, `matiere`, pour séparer un **anneau** d'un **disque** — c'est lui
qui sépare le générateur (0,39) du kamikaze (0,63), les deux seuls corps que les
quatre premiers axes confondaient.

**Une paire résiste, et elle est antérieure au plan.** Porte-bouclier et chœur
se ressemblent sur les cinq axes (élancement 0,96/1,12, matière 0,66/0,78) : deux
masses rondes de taille voisine avec des appendices. J'ai avancé le pavois de
huit pixels — son verbe est un blocage **frontal**, sa silhouette ne le disait
pas — mais **la mesure ne bouge pas** : déplacer la masse déplace aussi la boîte
englobante, et `avance` est invariante par translation. Le changement est gardé
pour son **sens**, pas pour le chiffre. Sculpter une forme contre un indicateur
qu'on ne peut pas regarder ferait pire.

**Quatre types mouraient en fantassin.** `DEATH_BURST` s'arrêtait à neuf entrées
et `?? DEATH_BURST[0]` faisait le reste, en silence. Chacun a la sienne : le
harceleur éclate vers l'avant (`cone` 1,0 comme le coureur), la coque du
générateur se défait en gros éclats lents, le châssis du saboteur se démonte, le
mât du relais cède en un jet court et vif.

**Aucun son ajouté, et c'est la bonne réponse.** `verifierFeedback()` croisé
avec les **41 recettes réelles** d'`audio.js` est muet : les quatre archétypes
héritent de `mort` / `mortEnergie` par `matiereDe()`, et le relais y est passé
d'`carapace` à `énergie` — il émet un arc. Le limiteur voit **trois** clés de
mort pour treize types, pas treize.

### La difficulté par la composition (0.21.6)

Un pilote **identique** partout — même cadence, même trajectoire, même politique
de cible — sur un beat sans événement. Ce qui change est le mode, et rien
d'autre. Quatre minutes, trois graines.

**Ce que le résidu de cauchemar portait vraiment.** On fait varier un
multiplicateur à la fois :

| résidu | dég/min 1 j | dég/min 4 j | tués/min 4 j | PV moyen |
|---|---|---|---|---|
| 1,35 / 1,28 / 1,25 (référence) | 1 362 | **1 477** | 49 | 403 |
| **hp 1,10** | 1 671 | **1 447** | 60 | 333 |
| hp 1,00 | 1 584 | 1 534 | 62 | 332 |
| dmg 1,10 | 1 193 | 1 305 | 49 | 403 |
| spawn 1,45 | 1 284 | 1 490 | 48 | 411 |

Trois faits, et deux sont contre-intuitifs :

- **`hp` ne retient personne.** À la population plafond, des PV en plus
  n'épaississent que les corps : 1,35 → 1,10 laisse la pression à quatre
  joueurs à **moins de 2 %** d'écart, tout en rendant **+22 %** de débit de mise
  à mort et **−17 %** de PV moyen. C'est le « sac à PV » que la consigne refuse,
  mesuré.
- **`spawn` est inerte au plafond.** 1,28 → 1,45 ne change rien : la horde est
  déjà saturée. Il ne compte qu'avant la saturation.
- **`dmg` est le seul levier chiffré qui déplace la pression**, à peu près
  linéairement (−12 % pour 1,25 → 1,10). C'est donc le dernier à toucher.

**Décision : `hp` de cauchemar passe de 1,35 à 1,10.** Le reste ne bouge pas.

**Ce que la composition porte, elle.** Le gradient est désormais explicite :

| mode | types | attachements de trait | dég/min 4 j | PV moyen |
|---|---|---|---|---|
| calme | 5 | 0 | 777 | 278 |
| normal | 8 | 6 | 1 037 | 343 |
| cauchemar | 13 | 12 | **1 475** | 332 |

Les quatre archétypes des lots 4 et 5 n'avaient **aucun trait, dans aucun
mode** : cauchemar ne les durcissait pas du tout. Ils en ont quatre désormais
(harceleur `DASH|FRENZY`, générateur `AURA`, saboteur `TRAIL`, relais
`FRENZY`), et le harceleur en a un en normal. Effet mesuré : **+3 %** de
pression — peu, mais c'est précisément le point : **cauchemar était déjà porté
par sa composition, et le 1,35 était du poids mort.**

**Un effet non désiré, signalé plutôt qu'enterré.** À quatre joueurs l'écart est
conservé (1 475 contre 1 477) ; **en solo la pression monte de 23 à 38 %**
selon les graines. Une horde qui meurt plus vite se renouvelle plus vite, et un
joueur seul en voit davantage arriver. La mesure solo est bruitée à trois
graines et je n'ai pas de réglage validé aux deux effectifs — c'est au registre
(E18), pas dans un chiffre inventé.

### Les élites, et un bug de treize mois (0.21.5)

**Le porte-bouclier absorbait de toutes les directions.** Le serveur comparait
`def.shieldArc` — 100, en **degrés** — au retour de `_angleDiff`, qui vaut au
plus 3,15 **radians**. Le test `|d| ≤ 50` était donc toujours vrai. Pendant ce
temps le client, lui, ne dessinait le blocage que de face. Après correction,
corps orienté vers 0° :

| angle du tir | ordinaire (arc 100°) | élite (arc 165°) |
|---|---|---|
| 0° · 30° · 45° | absorbé | absorbé |
| 60° · 80° | **passe** | absorbé |
| 90° · 120° · 180° | passe | passe |

Exactement ±50° et ±82°, c'est-à-dire ce que le client dessinait déjà. Le
porte-bouclier reste néanmoins imprenable pour un joueur qui tourne **moins
vite que lui** : 1,4 rad/s contre `shieldTurnRate` 2,4 (3,4 en élite). Il faut
le déborder plus vite qu'il ne pivote, ou le prendre de dos.

**Les treize variantes, chacune jugée sur SON verbe.** PV égalisés — sinon on
ne mesurerait que `ELITE_HP_MUL` — et géométrie choisie *entre* la valeur de
base et celle de l'élite, seule position d'où l'écart se voit :

| type | grandeur mesurée | ordinaire | élite |
|---|---|---|---|
| fantassin | dégâts de souffle à 60 px (0 → 80) | **0** | **57** |
| coureur | part de cibles = joueur isolé | **0,00** | **0,31** |
| colosse | corps sous aura à 90 px (90 → 105) | 0,65 | 0,77 |
| tireur | balles en 24 s | 154 | **270** |
| pondeuse | rejetons après six morts | 24 | **36** |
| kamikaze | dégâts de souffle à 115 px (90 → 135) | **0** | **56** |
| porte-bouclier | tir à 60° et 80° | passe | **absorbé** |
| soigneur | PV rendus à 210 px (190 → 250) | **0** | **153** |
| chœur | corps sous aura à 155 px (130 → 180) | 2,12 | 2,88 |
| harceleur | part du temps au contact | 0,05 | 0,04 |
| générateur | corps sous égide à 185 px (150 → 215) | 1,69 | 2,56 |
| saboteur | zones posées en 24 s | 36 | **60** |
| relais | part d'arc vif à 350 px (300 → 400) | **0,00** | **1,00** |

Douze variantes sur treize se lisent. **Le harceleur est la plus faible** :
0,05 → 0,04 de temps au contact, parce que sa base n'y passe déjà presque
aucun temps — allonger son retrait ne change presque rien.

**Une surcharge a été écrite, mesurée, puis retirée.** L'élite harceleur portait
aussi `flanc: 1.25` : la mesure a donné 0,32 → **0,16** sur son propre verbe de
ciblage. Un flanc plus large déplace le corps, et le corps déplacé ne choisit
plus le même joueur — la surcharge combattait son propre type. Retirée, le
ciblage revient à 0,32 → 0,32.

**Deux pièges de banc de plus.** Une scène générique saturait tout : six corps
sur un anneau de 340 px sont soit tous dans un rayon d'aura, soit tous dehors,
et la mesure rendait « 6 contre 6 » pour toutes les auras. Et le poids
d'isolement (`ISOLE_COUVERT` = 2,2) ne peut renverser un choix que si les
distances sont **comparables** : avec l'isolé deux fois plus loin, le rapport
au carré vaut 8,2 et aucun poids de 2,2 ne le retourne.

Coût inchangé : 0,235 ms à 200 corps, 0,500 ms à 400.

### Le groupe, le relais, et un instrument aveugle (0.21.4)

**Le relais.** Le seul corps dont la menace n'est pas lui mais la **paire**.
Quatre graines, cible mobile, 30 s :

| relais | tue un à 10 s | paires vives | dégâts subis |
|---|---|---|---|
| 1 | — | 0,00 | 0 |
| 2 | non | 0,90 | 0 |
| 4 | non | 1,86 | 23 |
| 6 | non | 2,90 | 45 |
| 2 | **oui** | **0,23** | 0 |
| 6 | **oui** | 2,23 | 45 |

Tuer une extrémité casse l'arc — c'est la première fois que le roster propose
une cible dont la valeur dépend d'une **autre** cible. Et l'arc est une menace
**positionnelle**, pas une course aux dégâts :

| six relais, cible qui | dégâts en 30 s |
|---|---|
| campe | **701** |
| se déplace | 45 |

**Les priorités de combat.** Même horde, même cadence, même trajectoire ; seule
la question que le joueur se pose en choisissant sa cible change. Cauchemar,
13 types, deux pilotes, 70 s, trois graines :

| politique | dégâts subis | tués | soutiens en vue |
|---|---|---|---|
| le plus proche | 2 564 | 98 | 26,3 |
| le plus loin (témoin) | 2 544 | 86 | 20,7 |
| les gros | 2 429 | 29 | 25,2 |
| les tireurs | 2 584 | 122 | 27,2 |
| ceux qui visent | 2 515 | 97 | 27,2 |
| **les soutiens** | 2 596 | **134** | **1,9** |

Viser les soutiens tue **+37 %** et vide le terrain de ses soutiens (26,3 → 1,9).
La priorité existe, et elle se lit sur le **débit**.

**Mais le témoin invalide la colonne des dégâts subis.** Tirer sur le corps le
plus *loin* — la pire politique concevable — encaisse 2 544, c'est-à-dire moins
que la meilleure. À 500 corps, le contact sature : aucune politique de cible ne
peut le réduire. Une mesure dont le témoin ne bouge pas ne mesure rien, et il
valait mieux le dire que publier six chiffres qui se ressemblent.

**Verdict sur le préavis de visée (registre E6).** J'avais écrit au lot 3 :
« démontrer ou retirer ». Deuxième instrument, monté exprès — douze tireurs et
rien d'autre, la balle est la seule source de dégâts, la pression est maintenue
constante en remplaçant les morts :

| politique | dégâts subis | tireurs abattus |
|---|---|---|
| le plus proche | 372 | 73,0 |
| celui qui vise | 368 | 72,5 |

**Aucun gain, sur les deux instruments.** La promesse était le mauvais test :
la valeur d'un télégraphe est la lisibilité pour un **humain**, et aucun banc de
bots ne la mesure. Le préavis est conservé **sur son coût** — −0,8 % de volume
de tir, quelques octets, et une devinette fausse du client supprimée — pas sur
un gain démontré. Il sera jugé à l'écran au lot 8.

### Trois archétypes, trois verbes (0.21.3)

Chacun est mesuré sur **la décision qu'il change**, pas sur ses statistiques.
Cauchemar, roster ouvert, quatre graines.

**Harceleur — « es-tu couvert ? »** Trois joueurs : deux collés à 90 px, un
seul à 1 100 px. Part des cibles choisies qui est le joueur isolé :

| | part |
|---|---|
| fantassin | 46 % |
| coureur | 46 % |
| **harceleur** | **59 %** |

Et il ne s'installe pas. Part du temps passée **au contact** d'une cible
immobile :

| | part |
|---|---|
| fantassin | 80 % |
| coureur | 100 % |
| **harceleur** | **6 %** |

**Générateur — « qui d'abord ? »** Quatorze fantassins, cadence de tir
constante, jamais un coup sur la source. Dégâts à fournir pour nettoyer :

| | dégâts |
|---|---|
| sans générateur | 3 879 |
| **avec, ignoré** | **5 893 (+52 %)** |
| avec, tué en premier | ≈ 4 370 (+13 %) |

Le gradient est le bon : la bonne décision est nettement meilleure, la mauvaise
n'est pas punitive au point d'être injuste.

**Le bouclier plat ne marchait pas, et la mesure l'a dit.** À 26 points fixes,
l'écart n'était que de **+12 %** : une réserve constante vaut 38 % d'un
fantassin à la cinquième minute et 9 % à la trentième — écrasante au début,
invisible à la fin, c'est-à-dire l'inverse de ce qu'on demande à un ennemi
tardif. En **part des PV** (0,34), elle ne bouge plus avec la rampe.

**Saboteur — « où te tiens-tu ? »** Quatre saboteurs, 40 s, dégâts subis :

| cible | dégâts |
|---|---|
| campe | 3 850 |
| **se déplace** | **13** |

**Coût.** Cauchemar, roster complet de douze types, cible mobile :

| | corps | moyenne | p99 |
|---|---|---|---|
| 1 j | 200 | 0,226 ms | 0,96 |
| 4 j | 200 | 0,236 ms | 0,87 |
| 4 j | 400 | 0,454 ms | 0,85 |

Les trois nouveaux pèsent **14,5 %** de la horde en cauchemar (10 harceleurs,
12 générateurs, 7 saboteurs sur 200) : un garnissage, pas une prise de contrôle.

**Un piège de banc d'essai, noté parce qu'il se reproduira.** Les deux premières
mesures du générateur et du saboteur ont donné « aucun effet » : `_spawnEnemy`
replie sur le fantassin tout type absent du roster de la difficulté, en silence.
Les deux archétypes n'étant qu'en cauchemar, un banc réglé sur *normal* mesurait
des fantassins. Un banc d'archétype doit vérifier `e.type` après l'apparition.

### La grammaire d'attaque de la horde (0.21.2)

Trois attaques, un seul préavis de 0,5 s porté par le corps. Horde réelle,
8 min, roster ouvert, cibles immobiles et invulnérables, trois graines.

**Ce que le préavis de visée ne coûte pas.** Le mettre sous le budget de ruée
coûtait 84 % du volume de tir :

| mode | j | avant | budget partagé | budget séparé |
|---|---|---|---|---|
| calme | 4 | 10 456 | 6 560 | 10 379 |
| normal | 4 | 27 921 | 7 806 | 27 697 |
| cauchemar | 1 | 17 637 | 6 501 | 17 506 |
| cauchemar | 4 | 46 613 | **7 554** | 46 245 |

Écart final : **−0,8 %** partout. Le préavis se paie sur la recharge
(`shootCd - WARN`), pas sur la cadence.

**Préavis simultanés par vue** — la ruée est plafonnée, la visée bornée par sa
part de population :

| mode | j | ruée max | visée max | identifiants dans `wu` par instantané |
|---|---|---|---|---|
| calme | 4 | 0 | 22 | 10,0 |
| normal | 4 | **8** | 19 | 10,9 |
| cauchemar | 4 | **8** | 30 | 16,9 |

La ruée ne dépasse jamais 8, jamais 9 : le budget est désormais **exact**. Il
était reporté de l'image précédente et ratait les corps qui *entraient* dans une
vue en cours de préavis — la mesure comptait 10 pour un budget de 8.

**La mèche du kamikaze**, un joueur à 40 px d'un kamikaze qu'on abat :

| | mèche 0,15 s | mèche 0,5 s |
|---|---|---|
| le joueur reste | 90 | 90 |
| le joueur s'écarte | **90** | **0** |

C'est le gain net du lot : l'explosion était inévitable, elle est maintenant
entièrement esquivable, et ne punit plus que l'inattention.

**Ce que le préavis de visée n'apporte PAS, et il faut le dire.** Un tireur, une
cible, 90 s, quatre graines :

| ce que la cible regarde | tirs | touchée |
|---|---|---|
| rien (immobile) | 402 | 33 % |
| la balle déjà partie | 402 | **9 %** |
| le préavis | 402 | 19 % |

Le temps de vol (0,7 à 1,3 s à 235 px/s) fournissait **déjà** la fenêtre
d'esquive ; le taux de touche est identique avant et après (33 % / 9-10 %). Le
préavis est conservé pour l'**attribution** — savoir *qui* tire dans une horde de
200 — et parce qu'il remplace une devinette du client qui était fausse
(`enemyFrame` dérivait la pose de visée de `def.shootCd`, que le serveur ne
respecte pas : première recharge tirée au sort). Il doit faire ses preuves au
lot 5 ou redevenir instantané.

**Et la mesure de couverture du sol était fausse.** Elle additionnait le disque
**entier** d'une zone à moitié hors champ et comptait **deux fois** ce que deux
zones recouvrent ensemble — d'où « 120 % d'une vue », un chiffre impossible qui
accusait le jeu d'un défaut de la mesure. Rasterisée sur une grille de 80 × 45,
elle donne 21 à 41 % : l'excès est **réel**, mais sa cause n'est pas la horde
(voir le registre du plan 18, E2).

### Les rôles dans le déplacement (0.21.1)

Trois mécanismes, deux **déduits** et un déclaré. Comparaison à graine fixée —
le tirage de vitesse de `_spawnEnemy` est un bruit de ±10 % qui, non graîné,
comparait deux tirages plutôt que deux comportements.

| mesure | sans | avec |
|---|---|---|
| 14 tireurs, voisin le plus proche | 39,4 px | **65,3 px** |
| 14 tireurs, étalement angulaire | 0,785 | 0,846 |
| 24 coureurs lâchés du même côté, étalement des relèvements | 0,043 | **0,102** |
| 200 corps, coût du pas | 0,148 ms | 0,135 ms |

`POSTE_ECART` vaut 64 et la distance mesurée tombe à 65,3 : le réglage se lit
directement dans le résultat. Le flanc à 0,55 donne ±26° d'écart-type
circulaire — les coureurs se séparent en deux arcs au lieu d'arriver en ligne.

**La masse, mesurée pour ce qu'elle fait et non pour ce qu'on en attendait.**
Horde mixte de 90 corps, cible immobile, distance moyenne après 18 s, six
graines :

| type | rayon | masse | sans | avec | écart |
|---|---|---|---|---|---|
| coureur | 9 | 0,56 | 27,9 px | 30,2 px | **+2,3** |
| fantassin | 12 | 1,00 | 55,1 px | 52,5 px | −2,6 |
| pondeuse | 16 | 1,78 | 85,4 px | 75,8 px | **−9,6** |
| colosse | 21 | 3,06 | 113,0 px | 106,0 px | −7,0 |

Monotone en masse et dans le sens voulu : le lourd avance, le léger cède.
**Ce que la masse ne fait PAS** : elle ne change pas le débit d'un passage.
90 corps devant un goulet de 200 px, 30 s — 90/90 franchissent dans les quatre
configurations (avec ou sans colosses, avec ou sans masse). Les colosses ne
bouchaient pas, ils étaient seulement **lents** ; c'est `speed: 44` qui produit
la sensation, pas un blocage.

**Ce que la première version du vérificateur cachait.** Son goulet était fait de
deux boîtes qui se touchent — donc un mur de 1 400 px, pas un passage — et sa
fenêtre était taillée pour le fantassin. Résultat : 11 colosses sur 20 comptés
« bloqués » alors qu'ils marchaient encore (44 px/s pour 1 600 px de détour).
La fenêtre se dérive désormais du **plus lent du roster** (`fenetreDe`), et
`mesureDeplacement` avance l'horloge pour que le roster soit ouvert — sans quoi
`adaptType` repliait les cinq types sur le fantassin et les sept situations ne
testaient qu'un seul corps.

### Le critère de non-régression, rendu mesurable (0.19.6)

Le plan 16 s'était donné un critère qui ne s'exécute pas : *« si on échange les
quatre noms et que les captures restent difficiles à attribuer, le travail n'est
pas fini »*. La moitié qui pouvait devenir du code l'est : `signatureBiome()`
décrit une loi d'implantation en **quatre nombres**, et `verifierBiomes()` refuse
que deux lieux se ressemblent sur les quatre à la fois.

| lieu | densité (obj/vue) | encombrement | contraste | élongation |
|---|---|---|---|---|
| usine | 7,0 | 4,2 % | ×2,5 | ×11,4 |
| fonderie | 5,0 | 6,8 % | ×4,7 | ×9,6 |
| friche | 10,0 | 4,4 % | ×2,1 | ×4,9 |
| nébuleuse | 7,0 | 7,0 % | ×18,9 | ×15,8 |

Deux lois sont distinctes dès qu'**un** axe les sépare d'au moins **40 %** —
exiger les quatre interdirait des variations légitimes, n'en exiger aucun a
produit deux fois la même map.

| paire | axe qui sépare | écart |
|---|---|---|
| usine / fonderie | contraste | 47 % |
| usine / friche | élongation | 57 % |
| usine / nébuleuse | contraste | 87 % |
| fonderie / friche | contraste | 56 % |
| fonderie / nébuleuse | contraste | 75 % |
| friche / nébuleuse | contraste | 89 % |

**Le garde-fou attrape le défaut qu'il est censé attraper** — rejoué contre
l'ancienne table de la Nébuleuse, celle d'avant le lot 3 :

| axe | usine | nébuleuse (avant) | écart |
|---|---|---|---|
| densité | 7,00 | 7,00 | 0 % |
| encombrement | 4,2 % | 4,3 % | 3 % |
| contraste | ×2,46 | ×3,25 | 24 % |
| élongation | ×11,36 | ×15,69 | **28 %** |

Meilleur axe à 28 % pour un seuil de 40 % : les deux lois auraient été signalées.

`verifierBiomes()` muet sur **200 graines × 4 lieux × 3 modes**, lois comprises.

#### Ce qui ne se mesure pas, et son protocole

**Le test du nom masqué.** `BIOME=<clé> GRAINE=7 PORT=7911 node server.js`, une
capture par lieu à la même graine, **recadrée sous le bandeau de segment** (le
nom du lieu y est écrit). Montrer les quatre dans un ordre quelconque. La réponse
attendue est « une zone abandonnée / une usine automatisée / une fonderie /
l'espace ». « Quatre installations industrielles différentes » est un échec.

**Le coût par palier.** `?perf` affiche fps, particules, `GL/2D`, lots, quads.
Relever aux quatre paliers `gfx`, sur la Nébuleuse (le lieu le plus chargé :
jusqu'à 11 baies × 3 blits) et sur la Fonderie (jusqu'à 10 regards, chacun une
source de lumière et un champ). Le contrat de `low` porte sur la **technique** —
matière, semis, lumière, grille d'avant le plan 13 — et **pas** sur la forme d'un
lieu : la grille par biome et le liseré de bloc valent à tous les paliers, c'est
de la direction artistique.

**Les cinq points de lecture de `gfx`** — `material`, `props`, `lumiere`,
`decor`, `fx` — se vérifient au `grep`. Ils étaient **six** depuis le plan 13 :
`actors.js` gardait sa passe d'ombres par un `gfx >= GFX_MEDIUM`. Corrigé en
0.19.6 par `ombresActives()`, même motif que `lumiereActive()` : l'appelant
apprend ce qu'il doit savoir sans devenir un point de lecture.

### La part de props propre à chaque lieu (0.19.4)

Un prop est **propre** quand il n'appartient pas au fonds commun. Relevé sur les
quatre tables de `props.js`, douze tirages chacune. Cible du plan 16 : **≥ 70 %**.

**Le fonds commun est DÉCLARÉ, jamais déduit** — plaque, caillebotis, câble,
tuyau, débris, marquage, coffret, les sept props industriels d'origine. La
définition « un prop que deux lieux tirent » se retourne toute seule : purger
l'Usine ferait passer le tuyau pour un prop *propre* à la Fonderie, et son score
monterait de 50 à 83 % sans qu'une ligne bouge.

| lieu | propres / 12 | part | avant le plan 16 |
|---|---|---|---|
| usine | 10 | **83 %** | 42 % |
| fonderie | 10 | **83 %** | 50 % |
| friche | 10 | **83 %** | **0 %** |
| nébuleuse | 12 | **100 %** | 58 % |

La plaque et le coffret ont été **supprimés du dépôt**, pas déplacés : la
Fonderie était la dernière à les tirer, et un prop que plus aucune table ne tire
ne s'oublie pas au catalogue. Le fonds commun tombe à cinq — caillebotis, câble,
tuyau, débris, marquage.

### Le canal de coulée de la Fonderie (0.19.5)

Deux canaux orthogonaux traversant l'arène, tirés par graine, avec un regard
tous les 460 px. Relevé sur six graines, caméra balayée tous les 100 px.

| | avant filtrage | après |
|---|---|---|
| regards par arène | 20 – 21 | 16 – 18 |
| visibles par vue (moyenne) | 2,3 – 5,0 | 1,9 – 4,4 |
| visibles au pire | 11 | 10 |
| **sous un bloc** | **1 à 4** | **0** |
| **dans un danger** | **0 à 2** | **0** |

Les deux défauts étaient réels : un regard sous un bloc pose un halo au sol sans
rien qui l'émette, et un regard dans un danger superpose deux fois la même
matière — dont une seule blesse. **Le filtrage est fait à la génération**, donc
une fois et pour les deux lecteurs (`decor.js` dessine, `lumiere.js` allume) ;
le faire à l'usage le referait par image et laisserait les deux listes diverger.

Le canal, lui, passe sous un bloc sans être filtré : une conduite passe sous une
machine. C'est la **source** qui n'a pas le droit d'être invisible.

**Aucune entrée morte** — chaque prop déclaré est tiré par au moins une table.
Le contrôle est fait au même relevé : un prop que plus personne ne tire se
supprime, il ne s'oublie pas au catalogue.

La Friche était à zéro : douze tirages, aucun qui lui appartienne, dont un
coffret à voyant et un caillebotis dans un lieu abandonné depuis vingt ans.

### Les quatre lois d'implantation (0.19.2)

`buildBiome(bi, 2, 7)` sur l'arène complète, taille des obstacles relevée.

| lieu | objets/vue | % surface | plus petit | plus gros | rapport |
|---|---|---|---|---|---|
| usine | 7,0 | 4,2 | 4 838 px² | 11 923 px² | ×2,5 |
| fonderie | 5,0 | 6,8 | 7 056 px² | 32 832 px² | ×4,7 |
| friche | 10,0 | 4,4 | 4 147 px² | 8 568 px² | ×2,1 |
| **nébuleuse** | 7,0 | 7,0 | **1 659 px²** | **31 320 px²** | **×18,9** |

Le rapport est ce qui sépare les lois, pas le nombre d'objets : l'Usine et la
Nébuleuse en posent autant, et ne se ressemblent plus. Avant ce lot la Nébuleuse
était à ×2,5 avec une barre de 0,300 × 0,034 contre 0,230 × 0,036 pour l'Usine.

`verifierBiomes()` muet sur **200 graines × 4 lieux × 3 modes**.

### Les baies de la Nébuleuse (0.19.1)

Réglage de `BAIE_TAUX`, `BAIE_INSET` et du format de bande, mesuré sur six
graines en balayant la caméra tous les 100 px sur toute l'arène (4800 × 2700,
vue 1600 × 900, pas de nervure 400).

| réglage | % d'arène ouverte | % de vue en moyenne | baies visibles au pire |
|---|---|---|---|
| taux 0,34 · inset 52 · bande 0,42 | 14,9 | 14,0 – 19,7 | 11 |
| **taux 0,38 · inset 38 · bande 0,50** | **20,0** | **18,2 – 25,3** | **11** |

Le second est retenu : un tiers de surface ouverte en plus **sans un blit de
plus**, parce que le gain vient de la taille et non du nombre. Zéro débordement
d'arène sur les six graines (la dernière rangée de cellules est tronquée à
300 px de haut, la baie y descend à 196 et reste au-dessus du plancher de 70).

Coût par image au pire : 11 baies × 3 `drawImage` de sous-rectangle ≈ 3 Mpx,
soit **deux fois un blit pleine vue**. Les étoiles ont quitté la passe pleine
vue en échange — sous un plancher à 0,93 elles ne se voyaient pas.

Mémoire de l'arrière-plan cuit, vue 1600 × 900 plus 300 px de marge de chaque
côté : `loin` 2200 × 1500 (13 Mo), `pres` 2200 × 1500 (13 Mo), `gaz` 1100 × 750
(3,3 Mo). Le gaz est en demi-résolution **parce qu'il est flou** ; à pleine
résolution la troisième parallaxe aurait coûté 13 Mo pour aucune arête de plus.

### Les dix armes (plan 12, lots 5 et 6)

**Le critère d'avant ne connaissait qu'un nombre** — le DPS nominal en cible
unique, entre 60 % et 160 % de la référence. Il est resté muet pendant que le
tesla dominait et que le lance-grenades faisait ×1,88 de survie. Il ne mentait
pas : il regardait le mauvais nombre.

```
V = 0,8 × Dh + 0,2 × Db + S          cible = 1,00 + 0,04 × (D − 0,5)
```

`Dh` dégâts/s mesurés en horde · `Db` dégâts/s mesurés contre un boss seul ·
`S` survie apportée, au taux de change des cartes de conversion (200 PV ↔ ×1,0).
`D` se note sur cinq mécaniques (`exige` dans `ARMES`), pas sur une impression.

**Protocole** — 20 graines × 20 min, difficulté normale, pilote, graines
appariées. Trois décisions de banc, chacune imposée par une mesure et non par un
principe :

- **on compte l'ABSORBÉ, jamais l'envoyé.** Le surtuage pesait jusqu'à **76 %**
  des dégâts d'une arme à gros coup ; compter le brut classait les armes par
  gaspillage. Conséquence : `degats` **sature** sur une arme qui tue déjà en un
  coup, et le levier devient la cadence ou les cibles ;
- **les deux bancs sont immortels.** Sinon `Dh` est confondu avec la survie —
  une arme qui tient plus longtemps atteint des minutes plus denses — et la
  survie serait comptée deux fois, dans `Dh` puis dans `S` ;
- **le banc de boss laisse le boss attaquer et le pilote répondre.** Figer le
  tireur offrait la rampe pleine au canon d'assaut et le mesurait à 2,6× son
  nominal.

**Relevé final** (campagne complète, après la refonte du tesla) :

| arme | Dh | Db | U | cibles/s | S | **V** | cible | écart |
|---|---|---|---|---|---|---|---|---|
| tir standard | 80 | 93 | 1,00 | 4,7 | — | **1,000** | 1,000 | +0,000 |
| canon d'assaut | 79 | 112 | 1,00 | 6,5 | — | **1,041** | 1,060 | −0,019 |
| canon laser | 90 | 66 | 0,74 | 10,5 | — | **1,037** | 1,060 | −0,023 |
| tesla | 78 | 122 | 1,00 | 4,6 | — | **1,053** | 1,020 | +0,033 |
| lame tournoyante | 74 | 56 | 1,00 | 5,9 | 0,17 | **1,030** | 1,020 | +0,010 |
| fusil à dispersion | 86 | 78 | 1,00 | 8,9 | — | **1,023** | 1,040 | −0,017 |
| railgun | 92 | 75 | 1,00 | 2,1 | — | **1,076** | 1,100 | −0,024 |
| lance-grenades | 91 | 79 | 1,00 | 2,1 | — | **1,075** | 1,040 | +0,035 |
| fusil de siège | 72 | 74 | 0,70 | 2,4 | 0,15 | **1,028** | 1,060 | −0,032 |
| fusil de précision | 88 | 79 | 1,00 | 2,6 | — | **1,049** | 1,060 | −0,011 |

Les dix dans la bande `0,95 – 1,17`, et les dix dans la tolérance de ±0,05.
Écart maximal : 0,035.

**Ce que la campagne a désigné, arme par arme.** On coupe là où le débordement
se mesure, pas là où c'est commode :

- **fusil de siège** : chaque obus comptait **deux fois** sur un même corps, le
  direct et un souffle de même valeur. Le souffle devient une part (0,5) ;
- **canon laser** : son débordement était sa **largeur** — 10,5 cibles/s contre
  4,7 pour la référence. Sa réponse aux dégâts est non monotone (67 → 0,908 ·
  75 → 1,126 · 79 → 1,118), donc y toucher revenait à ajuster du bruit ; la
  nappe passe de 26 à 22 px et l'arme rentre d'un coup ;
- **railgun** : sa perforation ne délivre que **2,1 cibles/s** — « traverse
  tout » ne vaut presque rien tant que la horde n'est pas alignée. C'est la
  piste ouverte si l'arme doit encore bouger : un rail **large**, pas un rail
  plus fort ;
- **canon d'assaut** et **lance-grenades** sont les deux armes chaotiques : elles
  bougent de 0,16 pour 2 % de dégâts.

**Limite connue.** La résolution de la campagne est de **±0,08** sur ces deux-là,
plus large que la tolérance. Au-delà de vingt graines, chaque itération coûte
cinq minutes de simulation pour un gain sous le bruit. Ce qui reste dans la
bande se tranche **en jouant**, pas au banc.

**Ce relevé précède la correction d'attribution de 0.15.9** (juste dessous) : ses
`Dh` comptaient aussi ce que la classe et les zones délivraient. La campagne est
à rejouer avant d'y retoucher.

### La dispersion se scinde (0.15.9)

Le fusil à dispersion tirait six plombs en cône : à 24 m de portée utile, rien
que le joueur puisse **jouer** ne le distinguait du tir standard. Il tire
maintenant **une balle** qui vaut deux plombs et se **scinde** à 260 px.

**Attribution corrigée d'abord.** `_bullets` posait le drapeau d'arme pendant le
vol, mais l'impact se résout dans `_collisions` : toute une image de touches
était créditée à la **dernière balle parcourue**, dégâts de classe et de zone
compris. Le drapeau se pose maintenant par balle dans `_collisions`. Conséquence
directe : le `Dh` de **toutes** les armes à balle baisse d'environ 20 %, la
référence comprise. Les deux tables ci-dessous sont relevées après correction, à
3 graines × 10 min — du **relatif**, pas la campagne.

| arme | Dh | Db | **V** | cible | écart |
|---|---|---|---|---|---|
| tir standard | 41,8 | 92,6 | **1,00** | 1,00 | +0,00 |
| canon d'assaut | 42,3 | 111,9 | **1,08** | 1,06 | +0,02 |
| canon laser | 60,6 | 65,9 | **1,19** | 1,06 | +0,13 |
| tesla | 63,0 | 122,0 | **1,44** | 1,02 | +0,42 |
| lame tournoyante | 45,3 | 55,5 | **1,08** | 1,02 | +0,06 |
| fusil à dispersion | 35,4 | 114,7 | **0,99** | 1,06 | −0,07 |
| railgun | 46,1 | 75,2 | **1,00** | 1,10 | −0,10 |
| lance-grenades | 44,8 | 79,3 | **1,00** | 1,04 | −0,04 |
| fusil de siège | 35,6 | 74,2 | **0,98** | 1,06 | −0,08 |
| fusil de précision | 48,4 | 79,4 | **1,05** | 1,06 | −0,01 |

**Le tesla et le laser ne délivrent pas par balle**, donc la correction ne les a
pas touchés : leur écart n'est pas neuf, il était **masqué** par la
sur-attribution des autres. C'est un lot d'équilibrage à part, pas un correctif.

**Profil de portée** (cible immobile immortelle, tireur figé, 20 s, dps délivré) :

| distance (px) | 60 | 120 | 180 | 240 | 260 | 300 | 340 | 400 | 460 |
|---|---|---|---|---|---|---|---|---|---|
| tir standard | 93 | 88 | 90 | 90 | 88 | 89 | 90 | 91 | 88 |
| dispersion | 46 | 46 | 45 | 46 | 49 | **138** | 92 | 45 | 45 |
| + Canon à âme lisse | 47 | 45 | 46 | 46 | 44 | 90 | 92 | 91 | 89 |
| + Second canon | 38 | 38 | 37 | 38 | 38 | **149** | 108 | 39 | 37 |

Bande utile : **276 – 350 px** (14 – 17,5 m). Sous 276 la balle touche avant de
s'ouvrir, au-delà la gerbe s'est écartée. Le 3/4 aplatit la queue au lieu de
relever la pointe.

**Le levier de horde est l'ouverture, pas les dégâts.** À cadence et dégâts
constants : arc 0,42 → V 0,80 · **0,80 → 0,90** · 1,05 → 0,74. Et 5,45 → 7,9 de
dégâts par plomb n'a rendu que **+1 de `Dh`** — les plombs se marchaient dessus,
le surtuage mangeait tout. La cadence n'a payé qu'**une fois l'ouverture
ouverte** : 0,40 → 0,32 s vaut +0,07 de V à arc 0,80, et rien à 0,42.

### Le tesla paie son écart (0.18.7)

L'écart relevé en 0.15.9 — **1,40 délivré pour une cible de 1,02** — n'avait
jamais été payé : il était noté « masqué par la sur-attribution des autres »,
donc décrit, pas corrigé. Retour de table : *trop de portée et trop de cadence*.
Le banc dit la même chose. Sweep à 3 graines × 10 min, portée × intervalle :

| portée | intervalle | Dh | Db | V | écart à 1,02 |
|---|---|---|---|---|---|
| 0,85 (41 m) | 0,30 s | 63,3 | 122,0 | **1,403** | +0,383 |
| 0,70 (34 m) | 0,36 s | 56,8 | 102,4 | 1,233 | +0,213 |
| 0,70 | 0,40 s | 51,9 | 88,4 | 1,107 | +0,087 |
| 0,75 (36 m) | 0,42 s | 47,5 | 84,0 | 1,025 | +0,005 |
| **0,70** | **0,42 s** | 48,2 | 74,4 | **0,990** | −0,030 |
| 0,72 | 0,42 s | 46,4 | 74,7 | 0,964 | −0,056 |
| 0,70 | 0,44 s | 43,3 | 83,4 | 0,959 | −0,061 |

Les deux dernières lignes sont **sous** la tolérance : le pas utile est de
0,02 s d'intervalle, pas moins. Retenu 0,70 / 0,42 s (revérifié à 5 graines ×
10 min), et non 0,75 / 0,42 qui vise plus juste : la portée est la moitié du
retour, et 0,75 la laisserait presque intacte. Les dégâts ne bougent pas — sur
une arme qui enchaîne, ils remontent `Dh` et `Db` ensemble, donc ils déplacent V
sans rien changer à ce que le joueur reproche.

**Les autres armes n'ont pas été retouchées** et restent où la correction
d'attribution les a laissées, à 5 graines × 10 min : dispersion −0,138, grenade
−0,178, siège −0,119, railgun −0,078, précision −0,074. C'est la campagne de
clôture qui est à rejouer (20 × 20), pas six chiffres à corriger un par un.

### Ressenti de combat et lien de soin (plan 7, lots L1 et L2)

**La fréquence d'un événement détermine inversement son budget de retour.** Un jeu
de combat, c'est cinq impacts par seconde ; un survivor à la minute 25, c'est
**20 à 60 morts par seconde**. Si chaque mort est un événement, plus rien n'en est
un — et le limiteur de voix `admit` d'`audio.js` existe parce que ce mur avait déjà
été rencontré. C'est le critère qui a tranché chaque arbitrage du lot.

**Ce que la magnitude change.** Avant, une grenade qui fauchait trente ennemis
produisait exactement la même image et le même son qu'une grenade dans le vide :
le client savait *ce qui* arrivait, jamais *combien*. Relevé sur douze minutes
solo en normal, le nombre de tués d'un seul souffle monte à **64** (nova, rayon
430) et à **31** à quatre en cauchemar. Le plafond d'échelle est fixé à **12
tués** : au-delà, l'oreille ne départage plus, et une nova doit saturer.

**Le recul est une vitesse, pas une téléportation.** `BLAST_KNOCK` = 620 px/s avec
un amortissement de 0,0012/s donne **≈ 92 px** de déplacement (4,6 m), comparable
au `NOVA_PUSH` instantané de 95 px — mais étalé sur 0,4 s, donc *visible*. Le trou
tient assez longtemps pour être lu, et les apparitions y sont suspendues 1,1 s.

**Le retour de touche du boss était un canal absent, pas un réglage discret.**
L'éclair blanc vit dans `flashAtlas` ; le boss est tracé à la main, hors atlas. Et
le point d'impact, prévu dans le tuple `bossDmg` depuis toujours, n'était rempli
que pour les Jumeaux : sur un corps de 34 px de rayon, chiffres et étincelles
naissaient au centre.

**Bout en bout, deux clients réels** (`net` + poignée RFC 6455) : 204 instantanés
sur dix secondes de manche, **57 entrées de lien** transmises, tuples de balle de
longueur 4 (le drapeau de soin a disparu), **zéro erreur** serveur.

#### Le lien de soin, mesuré

| critère | relevé |
|---|---|
| débit sur une cible | **20,0 PV/s** — sous les 28,6 théoriques d'avant, et le lien ne rate jamais |
| deux cibles | 2 liens, +20 PV chacun · `ramification` en ajoute un troisième |
| clignotement à la limite du rayon | **0 rupture** sur 2 s d'oscillation autour du rayon |
| rupture hors rayon | 0,33 s → tenue · 0,75 s → rompue (délai de grâce 0,5 s) |
| relèvement par le lien à 10 m | **1,00 s**, soit `REVIVE_TIME` exactement |
| solo | **0 lien, 0 PV** — la posture est inerte, et c'est le choix du lot |
| `siphon` | 1 allié + 1 ennemi : allié +20 PV, ennemi −14 PV, soigneur +6 PV/s |

**Ce que le pilote a révélé, et qui n'était pas prévu.** La posture a un coût
d'opportunité **réel** : en posture, le soigneur ne tire plus du tout. Trois
politiques de déclenchement ont été mesurées sur la table 1/1/2 :

| politique du pilote | normal | cauchemar |
|---|---|---|
| lier quand un allié passe sous 62 % de PV | **2 106 s** | **978 s** |
| lier dès qu'un allié n'est pas plein (PV + bouclier) | 1 401 s | 344 s |
| lier sous 65 % de PV + bouclier | posture engagée **0,6 %** du temps |

La deuxième politique semblait la plus compétente — elle l'est pour le soin, elle
coûte un tiers de la manche. La troisième ne se déclenche jamais : **le bouclier du
Rempart tient les alliés à plein**, donc un seuil qui compte le bouclier ne part
pas. Le seuil retenu lit donc les **PV seuls** : un joueur qui perd des PV est
déjà celui que le bouclier n'a pas suffi à couvrir.

### Classes, compétences et compositions (lot I)

Le lot est **d'abord un protocole** : le plan interdit toute décision de valeur
avant mesure, et les trois mesures qu'il demande — survie par classe, débit par
classe, valeur d'une composition — étaient toutes **impossibles** jusqu'ici. Les
lots B, C, D et J ont chacun sorti un critère rouge avec la même note : *il faut
un pilote*. Le lot I paie cette dette.

**Deux bots, et ils ne se remplacent pas.** `botInput` avance sur le corps le
plus proche et n'appuie sur rien ; il reste **intact**, parce que toutes les
mesures des lots A à H se rejouent contre lui. `pilotage()` est le second : il
recule d'une menace pondérée, teste douze directions **plus l'arrêt** à 10 Hz en
interrogeant `_zoneHits` sur le point candidat (la géométrie d'une zone ne se
recopie pas — le pilote passe par le point de passage du moteur), se
tient hors des bords, relève un allié à terre, ramasse les bonus, se met **dans
le rempart d'un allié**, et consomme ses recharges.

| taux de recharges consommées | Rempart / Provocation | Bombe / Surcharge | Mode soin / Vague |
|---|---|---|---|
| pilote, normal P1, 12 min | **100 % / 60 %** | **91 % / 94 %** | 0 % / 0 % |

Le soigneur à 0 % n'est pas un défaut du pilote : le protocole de débit est
**invulnérable**, donc personne n'a besoin d'être soigné. Les compétences du
soigneur ne se mesurent qu'en équipe et en mortel.

**Les trois profils de compte deviennent un objet de manche.** `metaProfil()`
rend exactement la forme que `room.js` construit au lancement — lignes équipées,
tronc commun, confort, **et cartes verrouillées**. Le nombre d'**emplacements**
en fait partie : P1 n'équipe que 5 des 6 lignes de sa classe, P2 les six.

| | lignes équipées | palier | secours | cartes verrouillées | légendaires tirables |
|---|---|---|---|---|---|
| **P0** neuf | 0 | — | 0 | **21** | **0 / 15** |
| **P1** engagé | 5 | 3 | 5 | 9 | 7 à 8 / 15 |
| **P2** complet | 6 | 5 | 5 | 0 | 15 / 15 |

**Le jalon de légendaire est vide à P0, et c'est structurel.** `LEGENDARY_LEVELS`
garantit une légendaire aux niveaux 13 et 24 ; sur un compte neuf, les quinze
légendaires sont verrouillées par les jalons de boss, donc le tirage garanti rend
trois cartes ordinaires. Le garde-fou de pool du lot E le journalise
(« rareté 3 : 0 cartes éligibles »). Ce n'est pas un défaut du lot I — c'est le
prix écrit du système de jalons — mais c'est une **partie de ce qui fait P0**, et
il fallait le mesurer avant de juger un taux de réussite.

#### Matrice de survie, en solo

Quatre manches par cellule, **graines appariées** (mulberry32 dérivé du numéro de
manche, protocole du lot D), mortelles, plafond de 45 min. `deg/min` est le débit
**observé**, progression comprise : il monte avec le niveau atteint, donc il ne
sert pas à comparer deux classes — c'est le rôle du tableau suivant.

| mode | profil | Rempart | Soigneur | Tireur |
|---|---|---|---|---|
| **calme** | P0 neuf | **676 s** (seg. 2) | 388 s | 479 s |
| | P1 engagé | 1 086 s (seg. 3, 25 % de manches finies) | 462 s | **1 341 s** (seg. 4) |
| | P2 complet | **1 354 s** (seg. 4) | 534 s | 664 s |
| **normal** | P0 neuf | 331 s | 273 s | **656 s** (seg. 2) |
| | P1 engagé | 607 s | 504 s | **672 s** |
| | P2 complet | 400 s | 489 s | **1 022 s** (seg. 3) |
| **cauchemar** | P0 neuf | 220 s | 207 s | **379 s** |
| | P1 engagé | 287 s | 214 s | **586 s** |
| | P2 complet | 211 s | 206 s | **491 s** |

**Le Rempart solo à P0 en calme n'est pas le point faible que D14 redoutait** :
676 s contre 388 (Soigneur) et 479 (Tireur), premier des trois. La
sous-vérification obligatoire du lot est **verte**, et aucune correction de
compétence n'est donc autorisée par cette clause. Le raisonnement de D14 (b) est
confirmé à la lettre : la réponse du tank à la horde n'est pas la fuite, c'est son
Rempart — avec un déclencheur timide (« au moins deux corps dans le rayon »), le
même tank tombait à 331 s en normal ; posé **dès qu'il est prêt et qu'il y a de
quoi le menacer**, il passe devant. Une mesure de classe est d'abord une mesure de
son pilotage.

**Le Tireur domine les deux autres classes en solo, sauf en calme.** L'écart n'est
pas marginal : 656 contre 331 s en normal à P0. La lecture est structurelle — le
kit du tank est en **valeurs fixes** (12 PV de bouclier par seconde, −50 % de
dégâts) là où le Tireur multiplie sa propre build, donc `diff.dmg` mange le
premier et pas le second. En calme, où la pression rentre dans les valeurs fixes,
l'ordre s'inverse.

**Biais de mesure à garder :** le pilote applique **une seule politique** — reculer,
esquiver, appuyer — et c'est celle que la fiche du Rempart contredit le plus (« va
la chercher, ramène-la loin des tiens »). Une politique par classe rendrait la
comparaison caduque (on comparerait des politiques), une politique unique
handicape le tank. Le chiffre à retenir n'est donc pas l'écart absolu, c'est
l'inversion **calme ↔ cauchemar**, qui ne dépend pas de la politique.

**Les profils ne s'ordonnent pas toujours** : P2 sort sous P1 dans trois cellules
sur neuf (calme/Tireur 664 contre 1 341, normal/Rempart 400 contre 607). Quatre
manches ne suffisent pas à ordonner deux profils voisins, et une seconde cause est
probable : P2 déverrouille les quinze légendaires **et les cartes d'arme**, qu'un
bot qui tire au hasard parmi trois offres prend sans savoir s'en servir. Trancher
demanderait un tireur de cartes qui **choisit** — même réserve qu'au lot E,
vague 3.

**La matrice n'existe qu'en solo, et ce n'est pas un raccourci.** Rempart et
Soigneur sont `unique` : `room.js` refuse une seconde instance. Une équipe
monoclasse à deux, trois ou quatre joueurs n'existe donc pas en jeu pour deux
classes sur trois, et « deux tanks deux soigneurs » — la quatrième composition du
plan — n'est pas jouable. Au-dessus d'un joueur, la comparaison de classes **est**
une comparaison de compositions.

**Un taux de réussite absolu ne se mesure pas sans pilote humain.** La matrice de
`PROFILS.md` (20-30 % en calme à P0, etc.) reste le critère de **clôture du
plan**, pas un critère de lot : le pilote gagne une manche sur quatre en calme à
P1 et jamais ailleurs. Ce qui se mesure ici est le **relatif** — classe contre
classe, profil contre profil, à graines appariées.

#### Débit par classe

Solo, invulnérable, P1, 12 min × 3 manches graînées : mêmes niveaux, même durée,
donc les chiffres se comparent.

| classe | dégâts/min | A par min | % de recharges | E par min | % de recharges | niveau à 12 min |
|---|---|---|---|---|---|---|
| Rempart | 4 354 | 3,0 | **100 %** | 1,5 | 60 % | 16 |
| Soigneur | 4 321 | 0,0 | — | 0,0 | — | 15 |
| Tireur | **13 236** | 6,1 | 91 % | 2,2 | 94 % | 19 |

**Le Tireur sort trois fois le débit des deux autres pour +20 % de `damageMul`.**
Le multiplicateur de classe n'explique qu'un tiers de l'écart ; le reste est une
**boucle** : il tue plus vite, donc il monte de niveau plus vite (19 contre 15-16
en douze minutes), donc il tire plus de cartes de dégâts. Débit et progression ne
sont pas deux axes indépendants, et c'est le Tireur qui encaisse les intérêts.

**Le Rempart et le Soigneur sortent le même débit** (4 354 contre 4 321) pour des
`damageMul` de 0,80 et 0,85 : l'écart de fiche est dans le bruit d'une build.

#### Compositions à quatre

Normal et cauchemar, P1, trois manches graînées. **Calme est écarté parce que la
mesure y serait censurée** : une table de quatre y atteint le plafond de temps, et
toutes les compositions rendent alors le même chiffre. Deux modes et pas un seul,
parce qu'ils ne disent pas la même chose — voir l'apport du tank.

La liste est une **chaîne** : chaque ligne ajoute une classe à la précédente, donc
l'écart entre deux lignes **est** l'apport de cette classe.

| | 4 tireurs | + tank | + soigneur |
|---|---|---|---|
| **normal** | 658 s (seg. 2) | 1 032 s (seg. 3) — **+57 %** | 1 447 s (seg. 4) — **+40 %** |
| **cauchemar** | 1 021 s (seg. 3) | 1 018 s (seg. 3) — **−0,3 %** | 1 381 s (seg. 4) — **+36 %** |

**La composition 1/1/2 va plus loin que quatre tireurs : +120 % en normal, +35 %
en cauchemar.** Le critère du plan est vert, et largement — le système de classes
n'est pas décoratif, alors même que la table mixte sort **moins de dégâts** (21 530
contre 35 220 par minute en cauchemar) et **neuf niveaux de moins**. C'est
exactement l'échange que trois rôles promettent.

**La valeur d'un tank est une question de POSITIONNEMENT, et c'est mesuré.** Avec
un pilote dont les alliés ignorent le rempart, la même composition rendait **691 s
contre 1 021** pour quatre tireurs, soit −32 % : ajouter un tank *coûtait* une
manche. Un seul terme dans le pilote — se tenir dans le rempart d'un allié quand
on n'a rien de plus urgent — la remet à parité en cauchemar et à +57 % en normal.
Sans ce terme, la mesure jugeait une table qui ne suit pas son tank.

**Le tank n'apporte rien en cauchemar** (−0,3 %), et c'est le résidu du lot. Il
recoupe la matrice solo : c'est le mode où sa survie propre s'effondre. Le plan
tranche déjà la disposition — *si rien dans la manche ne punit l'absence de tank,
ça se corrige au lot J, par les traits, pas par les valeurs de classe*.

#### Verdict

| critère | issue |
|---|---|
| Rempart solo à P0 en calme au niveau des deux autres | **vert** — premier des trois (676 s) |
| aucune classe strictement dominée | **vert par l'équipe** : dominées en solo, positives en table (+57 %, +40 %) |
| 1/1/2 au moins aussi loin que 4 tireurs | **vert** — +120 % en normal, +35 % en cauchemar |
| doctrine des 90 % mesurée sur la classe médiane | **vert** — déduite de `CLASSES`, exception du Rempart vérifiée |

**Aucune valeur de classe ne bouge.** La seule clause qui autorisait une
correction — le Rempart solo à P0 — est verte, et le plan renvoie explicitement le
reste au lot J. `verifierClasses()` est le critère rejouable : doctrine, Rempart
solo à P0 en calme, domination lue **avec l'apport en équipe**, et la chaîne de
compositions dans les deux modes non censurés.

**Le relevé que le lot J avait laissé en attente se ferme.** Les bonus au sol se
ramassaient à 1-12 % avec `botInput` ; le pilote en prend **13 à 50 %** selon la
densité (24/186 en calme à P0, 279/560 en cauchemar à P2). Le sol reste encombré
dans les cellules pauvres, mais le générateur n'est plus bloqué par des bonus que
personne ne prend : la clémence des bonus redevient mesurable.

**Ce qu'un bot ne mesurera jamais** (à remesurer avec un pilote humain) : le taux
de réussite absolu de `PROFILS.md`, l'ordre P1 → P2 dans les cellules serrées, et
la valeur d'une carte d'arme — trois questions qui demandent un joueur qui
**choisit**.

### Marchand, éclats, catalogue de reliques (lot F)

Le marchand n'était pas déséquilibré, il était **résolu** : 10 reliques pour 18
offres, et un revenu qui couvrait la dépense maximale.

| | avant | après |
|---|---|---|
| catalogue | 10 (3/3/3/1) | **24** (10/7/5/2) |
| offres par visite | 3 | **4** |
| achats par visite | illimités | **1** |
| poids de tirage | plat, écrit sur place | `WEIGHT: [50, 28, 15, 4]` |
| relance | `10 + 3 × (niveau − 1)` | **× 1,8 par relance DANS la visite** |
| rendement d'un point | 15 à 35 | **8 à 17** |

**Le plafond structurel est CINQ achats, pas six.** Le boss final clôt la manche :
il n'ouvre pas de marchand derrière lui. Le critère du plan (« six reliques par
manche complète ») est arithmétiquement hors d'atteinte ; le vérificateur compare
à `(TL_CFG.SEGMENTS − 1) × BUY_PER_VISIT`.

**Le rendement du plan ne produit pas la cible du plan.** 10-22 éclats par point
donnent **576** éclats sur une manche pleine (un point toutes les 35 s, 70 % pris)
là où le plan vise 400-500 : la division par deux annoncée est un facteur 0,64. À
**8-17** le modèle rend **450**, et c'est ce montant qui fait exister la relance.

**Le bot ne récolte pas** — il tire sur le corps le plus proche, un cristal n'est
cassé qu'au passage. Le revenu est donc **injecté depuis le modèle**
(`revenuRecolte(minutes, part)`) ; il se vérifie sur le modèle et non sur une
manche, sans quoi la mesure jugerait le pilotage.

**Le taux de relance est une propriété de la POLITIQUE autant que du prix.** Deux
acheteurs sur les mêmes graines : `gourmand` vise le plus haut palier qu'il peut
payer **et qui soit encore tirable**, et relance jusqu'à deux fois pour le voir ;
`neutre` prend au hasard parmi ce qu'il peut payer et ne relance jamais.

| normal, 4 manches graînées | achats | valeur | catalogue vu | relance | paliers achetés |
|---|---|---|---|---|---|
| solo, `gourmand` | 5 | 240 | 48 % | **19 %** | 19 / 56 / 25 / 0 |
| solo, `neutre` | 5 | 165 | 56 % | 0 % | 65 / 29 / 6 / 0 |
| solo, `gourmand` sautant deux marchands | 4 | 230 | 56 % | 33 % | 21 / 21 / 57 / 0 |
| quatre, `gourmand` | 5 | 240 | 54 % | **35 %** | 20 / 60 / 20 / 0 |
| quatre, `neutre` | 5 | 175 | 56 % | 0 % | 55 / 45 / 0 / 0 |
| quatre, `gourmand` sautant deux marchands | 4 | 232 | 54 % | 35 % | 0 / 63 / 38 / 0 |

**Sauter les deux premiers marchands ne domine pas** : 230 contre 240 éclats de
reliques en solo, 232 contre 240 à quatre. Le marchand du segment 1 n'est donc
pas le piège que le plan craignait, et la montée de qualité par segment
(`QUALITY_PER_LEVEL` côté cartes) reste inutile ici — à ne poser qu'après mesure,
comme le plan le demande.

**Aucune légendaire achetée en seize manches.** Poids 4 sur 97, prix 150, et en
solo une seule des deux est tirable (`serment_de_fer` exige deux joueurs) : la
contrainte « une légendaire par manche » ne mord jamais, elle reste un garde-fou.

Au revenu de 576, le même code rendait **65 %** de visites relancées pour
`gourmand` et **6 %** pour un acheteur qui se contente d'une rare : la bande
« 15 à 40 % » ne veut rien dire sans politique écrite. Le critère porte donc sur
`gourmand`, qui borne le taux par le haut.

**« Aucun palier acheté dans plus de 50 % des cas » n'est pas testable.** Un
maximisateur concentre sur le palier du haut par construction ; un acheteur au
hasard reproduit `WEIGHT`, où la commune vaut déjà 50 %. Ce qui se teste est la
**couverture** : des prix qui départagent laissent passer trois paliers — mesuré
trois sur quatre, la légendaire restant hors de portée en solo (`serment_de_fer`
exige deux joueurs, `coeur_machine` coûte 150 pour un poids de 4).

**`noHeal` ferme `_heal()`, pas la remise à plein d'un événement.** L'invariant du
script est sans condition (« réussir un événement rend 100 % des PV ») et il
gagne : la contrepartie porte sur ce qu'un allié ou une carte donne, pas sur une
réinitialisation de manche.

**Le fanion n'a pas de rayon.** Le plan le voulait à 6 m : un PV max qui clignote
au pas d'un coéquipier est une fabrique de défauts. `_relicAllySum` s'applique à
toute l'équipe, et la relique le dit (`equipe: true`, affiché à l'achat).

`verifierMarchand()` est le critère rejouable : structure du catalogue (prix
croissants, poids décroissants, effectif par palier décroissant, taille tenant la
demande d'une manche), revenu du modèle dans la bande, cinq achats, moins de 70 %
du catalogue vu, relance dans la bande, trois paliers couverts, et « sauter les
deux premiers marchands » qui ne rend pas plus de valeur. Solo, trois manches
graînées : **ok**.

Contrôles unitaires (13) : `registre` +35 puis +105 bruts au plafond ·
`serment_de_fer` +35 dégâts et +50 PV à l'allié, tout soin reçu ramené à zéro ·
`besace` +6 éclats au porteur seul · `contrepoids` 3,00 → 2,40 s ·
`boussole` 4 → 5 points au sol · `cran_arret` 19,2 puis 9,6 · `silex` brûlure 15,
et 0 sans build de brûlure · `trousse_campagne` +30 aux deux.

### Environnement, entrave, événements, récolte, esquive (lot E, vague 3)

Douze cartes, en fin de tableau. `appel_du_vide` reste écartée (décision D6). Le
catalogue passe de 116 à **137 cartes**.

| axe | cartes | ce qui manquait |
|---|---|---|
| environnement | `crampons`, `conducteur`, `terrain_conquis` | cinq dangers du sol pour **une** carte |
| entrave | `filins`, `etau`, `nasse` | `STATUS_ROOT` existait, **aucun joueur ne pouvait entraver** |
| événements | `opportuniste`, `curee` | quatre familles d'événements, **zéro** carte |
| récolte | `prospecteur`, `filon` | deux cartes, toutes deux épiques |
| esquive | `contre_pied`, `sillage` | une commune et une légendaire, rien entre |

**Un constat du plan est faux : les élites larguent DÉJÀ un bonus** (`_killEnemy`,
inconditionnel). `curee` telle qu'écrite aurait été morte à l'écriture ; elle en
donne donc un **second** — mesuré 1 bonus sans la carte, 2 avec.

**L'entrave d'un ennemi ne traverse pas le réseau.** Les ennemis ne portent pas la
`Map` de statuts des joueurs mais des champs (`burn`, `vulnUntil`) ; `rootUntil`
en est un de plus, et l'immobilité **est** le retour visuel — la règle du dépôt
dit de chercher d'abord si la valeur est une fonction de ce que le client a déjà.

**`etau` et `terrain_conquis` se branchent sur les deux souffles du joueur**,
l'explosion et l'onde, via `_blastAfter` et `_blastGround`. Le plan demandait un
`requires` de zone : **aucune carte n'en crée** — les explosions viennent de
l'arme et de la compétence de classe, les ondes des cartes défensives. Un
`requires` aurait été impossible à écrire.

`crampons` porte `requiresSystem: "hasards_actifs"` **en plus de `teamUnique`** :
sans dangers, en calme, la carte ne fait rien. Même défaut que `Surcharge
orbitale`, même remède.

Contrôles : `groundResist` 0,438 à deux paliers · entrave de 0,80 s par explosion
· `nasse` 140 dégâts contre 100 · une zone brûlante posée par onde · 20 récoltes
doublées sur 60 pour `filon` (cible ⅓) · éclats 21 → 30 pendant un événement ·
3,5 dégâts par palier de `ZONE_TICK` à un ennemi dans un danger.

**Le critère de dérive des boss est trop bruité pour attribuer une vague.**
Relevés graînés successifs, douze manches, solo : **+5 %** après la vague 2,
**+42 %** après la vague 3 ; à quatre, −37 % puis −14 %. Deux raisons : le
plancher de barre à 40 s tronque la distribution, et **une graine cesse d'être
appariée dès que le catalogue change** — le tirage ne consomme plus le même
nombre de nombres aléatoires. Trancher demanderait un pilote qui choisit, pas un
qui tire au hasard.

**Piège de mesure payé** : deux scripts d'atelier existaient, l'un graîné
(`mesureBoss`) et l'autre non. Le non graîné a rendu « puissance médiane 1,70,
une victoire sur six » puis « 3,94, trois sur six » **au même code**. Toute
conclusion tirée d'un relevé non graîné est du bruit.

### Axes coopération et boss (lot E, vague 2)

Neuf cartes, **en fin de tableau** (règle append-only) : six de coopération, trois
de boss. Le jeu est coopératif et n'avait que six cartes de coopération sur 116 ;
les boss occupent un cinquième de la manche et n'en avaient qu'une.

Les six cartes de coop portent `minPlayers: 2` — **le premier usage réel des
filtres de contexte de la vague 1** : zéro offerte en solo, six à deux joueurs.

| carte | rareté | mesure de contrôle |
|---|---|---|
| `cordee` | C ×4 | +4 % par allié proche → puissance 1,08 à deux stacks, un allié |
| `relais` | R ×2 | allié à terre → puissance **et** vitesse ×1,30 |
| `bouclier_partage` | R ×2 | 40 de bouclier gagné → 10 à l'allié le plus proche |
| `serment` | E | relève → 8 s de +45 % **aux deux** |
| `porte_voix` | E | bonus de 14 s chez le porteur, 8,4 s chez l'allié |
| `phalange` | L | 100 de dégâts subis → 92 avec un allié proche, 100 sans |
| `reperes` | C ×4 | +12 % de dégâts de boss par palier |
| `briseur` | R ×2 | rupture de barre → les trois recharges à zéro |
| `traqueur` | E | +25 % de boss, +10 % par barre brisée |

**`Repères` passe de +7 % à +12 %, et la mesure l'imposait.** À +7 %, une commune
qui ne vaut que contre les boss était **moins bonne qu'une commune de dégâts
génériques** (+12 à 14 %) : un tirage aléatoire y perdait ses offres, et la dérive
des durées de boss en solo est partie à **+141 %** (les combats de fin
s'allongeant faute de puissance). À parité, elle retombe à **+5 %**.

**Un plafond neuf, `BOSS_DAMAGE_CAP = 1,6`**, sur le modèle de
`CRIT_CHANCE_CAP` : `Repères` pleine plus `Traqueur` à quatre barres cumulent
×2,13, et à quatre porteurs le boss fondait.

**Un critère du lot H repasse rouge à quatre joueurs, et ce n'est pas un défaut
de ces cartes.** Dérive du premier au dernier boss ordinaire, douze manches :

| | solo | quatre joueurs |
|---|---|---|
| avant la vague | −4 % | −14 % |
| après | **+5 %** | **−37 %** |

`verifierBoss` à ses valeurs par défaut (six graines) sort les deux effectifs
rouges, et **plus fort dans les deux sens** : +117 % en solo, −26 % à quatre. Six
manches ne suffisent pas à cette statistique — les durées par segment portent
quatre à douze combats chacune, contre le plancher de barre de 40 s qui tronque la
distribution par le bas.

La cause est `cordee` : les bots se **regroupent** pendant un combat de boss —
ils visent tous la même cible — et se dispersent pendant la horde. Une carte qui
paie le regroupement paie donc exactement la situation que le lot H mesure. Le
levier est la rampe de PV de boss ou `diff.boss`, pas la valeur de la carte :
re-régler H depuis E serait rouvrir un lot livré sans mandat.

**Un point de passage neuf : `_grantShield(p, montant, plafond)`.** Le bouclier
se gagnait à cinq endroits (régénération, rempart, surplus de soin, bonus au sol,
relique de secours) ; `Bouclier partagé` avait besoin d'un seul. Le partage ne se
repartage pas.

**Le partage de bonus ne concerne que le PERSONNEL** : ni le ralentissement
global, ni ce qui fait naître une entité (balise, tourelle, nova, purification).
Sans cette liste, un bonus ramassé posait quatre tourelles.

### Conditionnement du tirage et audit du catalogue (lot E, vague 1)

Le lot E s'écrit en **trois vagues** (décision D12), avec une mesure entre
chacune. Vague 1 : le conditionnement et le retrait de `scoreMul`, **aucune carte
neuve**. `verifierCartes()` est le critère rejouable.

**Quatre filtres de tirage**, dans `eligibleCards(owned, cls, niveau, locked,
ctx)` : `requires` (au moins un prérequis possédé), `minPlayers`, `teamUnique`
(le porteur continue d'empiler, la table ne la revoit plus) et `requiresSystem`
(`hasards_actifs` déduit de `state.hazards`). `ctx` absent = tout passe, un script
de mesure n'a rien à construire.

**Les trois filtres de contexte sont inertes jusqu'à la vague 2** : 99 cartes
éligibles en solo comme à quatre, aucune carte du catalogue actuel ne les
déclare. Seul `requires` mord aujourd'hui, sur `Surcharge orbitale`.

**`Surcharge orbitale` ne requiert que `orbiteurs`, pas `essaim`.** Le plan
écrivait `requires: ["orbiteurs", "essaim"]` ; `orbiterDamageMul` n'est lu qu'à un
seul endroit de la simulation, la boucle des lames — les mini-drones d'`Essaim`
ne le lisent pas. Avec `essaim` dans la liste, la carte serait restée morte sur
une build d'essaim.

**Trois défauts trouvés par l'audit, tous réels.**

1. **`railgun` déclarait une incompatibilité avec `perforation` que `perforation`
   ne déclarait pas**, et l'inverse pour `inertie` : deux paires à moitié
   écrites, donc contournables selon l'ordre de tirage. Les deux sens sont
   désormais écrits.
2. **`sharedSupport` était un champ mort** : posé par `Vœu partagé`, lu nulle
   part — le système lit l'identifiant de carte (`_hasSharedSupport()`), pas le
   mod. Supprimé, `apply` devient optionnel.
3. Aucun autre mod n'est mort : `noOverheat` est lu dans `cards.js` même.

**Il n'y a pas de genou de plafonnement additif**, contrairement au constat du
plan (« la 20ᵉ carte de dégâts vaut bien moins que la 3ᵉ »). Gain marginal de
puissance en empilant les dix sources additives de `damageMul` dans l'ordre :

| carte | 1ʳᵉ | 6ᵉ | 15ᵉ | 25ᵉ |
|---|---|---|---|---|
| gain marginal | 12,0 % | 7,5 % | 9,2 % | 9,2 % |

La dilution existe **à l'intérieur** d'une pile (`affûtage` va de 12 à 7,5 % sur
ses six paliers) mais le pas d'une autre famille la remet à 12 %. Le pool de
communes n'a donc pas besoin de se vider plus tôt. Deux valeurs sortent
**négatives** — `balles lourdes` et `railgun` — parce que leur pénalité de
cadence coûte plus que leurs dégâts n'apportent, au moment où on les prend.

**`scoreMul` n'est plus une cible de carte** et reste dans `defaultMods()` et
`_credit` : le score garde son rôle de classement. `Bourse` devient `+25 %
d'éclats` (monnaie de manche, boucle fermée sur le marchand) et `Ferraille` garde
sa moitié utile plus `pickupRadiusMul` — une **seconde clé** appliquée en aval,
`Poches larges` gardant sa sémantique de plancher.

**Le garde-fou de pool journalise une fois par rareté et par manche** — sans le
drapeau, c'est à chaque niveau.

**La brume ne ment plus** (décision D4b) : « on ne voit plus venir » au lieu de
« les bords de l'arène se ferment », que rien n'implémentait.

### Progression de compte (lot G du plan d'équilibrage)

Protocole du lot D (graines écrites), `mesureRevenu()` / `verifierMeta()`, huit
manches par cas. `gainMeta()` et `coutMeta()` sont des fonctions **pures** : deux
des cinq critères se vérifient sans simuler.

**Le plafond de noyaux ne mord que là où il doit.**

| noyaux par manche | médiane | manches plafonnées | dont terminées |
|---|---|---|---|
| calme 1 / 4 j | 390 / 390 | 0 / 0 | — |
| normal 1 / 4 j | **501 / 524** | 0 / 0 | — |
| cauchemar 1 / 4 j | 600 / 600 | 5/8 · 8/8 | 5 · 7 |

`CORE_LEVEL` reste à 8 : le plafond de 600 ne mord pas en normal (546 au plus
haut), donc la contingence du lot ne se déclenche pas. **En cauchemar à quatre il
mord sur les huit manches**, dont une non terminée : ce n'est plus un plafond de
sécurité, c'est le régime normal du mode. À revoir avec `DIFF_MUL`, pas avec le
plafond.

**Le niveau 30 est atteint dans presque toutes les manches** depuis le lot H — les
manches se terminent, donc le plafond de niveau reborne la fin de courbe que le
lot D venait de libérer. Le revenu en devient plat : `8 × 30` est une constante.

**Le budget est dérivé à rebours de la matrice, et il tombe juste.**

| | contenu | coût | manches à 501 noyaux |
|---|---|---|---|
| **P1** | confort + secours complets, paliers 1-3 partout | 12 620 | **25** |
| **P2** | tout, une classe | 26 600 | **53** |

Le plan visait 30 et 63 manches à 420 noyaux ; le revenu mesuré est de 501, soit
**+19 %**, dans la marge de 25 % que `verifierMeta` surveille. C'est cette
hypothèse de revenu qu'il faut resurveiller, pas le coût d'une ligne : l'ancien
critère (« 15-20 manches pour une ligne ») datait du cadrage à **une** ligne, quand
le compte en compte désormais dix.

**Le gain d'un compte complet reste sous le plafond de ×1,8**, et le plan le
surestimait (il annonçait ×1,65) :

| | puissance | PV |
|---|---|---|
| tireur | **×1,34** | ×1,15 |
| rempart | ×1,00 | **×1,45** |
| soigneur | ×1,00 | ×1,35 |

**Ce que le lot ajoute** : `CONFORT` passe de 3 à 5 entrées (bannissement et
seconde relance), une ligne `SECOURS` de cinq paliers dont le cinquième donne
`selfRevive` — mod qui existait déjà, rien de neuf côté simulation — et trois
lignes de **tronc commun** achetées une fois pour les trois classes. Le
bannissement devient un **achat** : un compte qui en avait déjà usé le garde à la
migration.

**Coûts divisés**, parce que le compte compte dix lignes et plus une :
`TIER_COSTS` 6 900 → 2 000 par ligne. Les comptes existants gardent leurs paliers
sans remboursement — le profil ne trace pas la dépense.

### Boss : courbe de PV et densité de renforts (lot H du plan d'équilibrage)

Protocole du lot D (graines écrites), `mesureBoss()` / `verifierBoss()`, durées
médianes **par segment**, dix à douze manches par cas.

**Les PV de boss s'indexaient sur le COMPTEUR de boss, pas sur la minute** : +6 %
par boss, soit ×1,30 sur la manche pendant que la puissance joueur fait ×2,6. La
durée des combats décroissait donc d'un facteur deux à trois.

| durée médiane par segment | s1 | s2 | s3 | s4 | s5 | s6 (final) |
|---|---|---|---|---|---|---|
| avant — normal 1 j | 147 | 87 | 70 | 47 | 40 | 106 |
| après — normal 1 j | **79** | 41 | 40 | 57 | **75** | 107 |
| avant — normal 4 j | 128 | 76 | 71 | 60 | 54 | 138 |
| après — normal 4 j | **69** | 53 | 41 | 48 | **56** | 108 |
| après — cauchemar 4 j | **81** | 60 | 55 | 71 | **77** | 145 |

Dérive du premier au dernier boss ordinaire : **−73 % → −5 %** en solo, **−58 % →
−19 %** à quatre, −5 % en cauchemar. Emportement : 4 à 7 % des combats, pour un
plafond de 25 %. Aucun combat ne dépasse `_enemyCap()` en population.

**La rampe est COMPOSÉE, et son taux se lit sur la puissance mesurée.** Le
document du lot écrivait `pow(1 + 0,055, minutes)` mais chiffrait ×1,28 à la
minute 5 et ×2,65 à la minute 30, c'est-à-dire du **linéaire**. Les deux formes
ont été mesurées : linéaire, la durée des combats redécroît de 32 à 49 % — la
rampe ne suit pas la puissance. Composée à 5,5 %, elle la suit (dérive sous 20 %
dans les deux effectifs, à douze manches). C'est donc la formule qui est juste et
la table qui est fausse.

**`BOSS_HP_BASE` 1200 → 520, et pas seulement du facteur de la minute 5.** Le
document demandait de diviser par ×1,28 pour que « le premier boss ne change pas »
— sauf que le premier boss durait **147 s**, très au-dessus de la fourchette
50-90 s du lot C. Il fallait donc descendre 2,3 fois, pas 1,28.

**`FINAL_HP_MUL` 2,2 → 1,3.** À la minute 30 la rampe vaut ×4,98 là où l'ancien
compteur valait ×1,30 : le boss final passait de 106 à 232 s. Son nombre de
barres est intouchable par ce lot, donc la compensation passe par son
multiplicateur de PV — 107 et 108 s après, soit la durée d'avant.

**Le plafond de renforts ne mordait jamais** : la population moyenne pendant un
combat est de **3 à 4 corps** pour un plafond de 55. Ce qui règle la densité est
le **compte d'invocations**, `BOSS_SUMMON_BASE + joueurs` : 4 renforts par joueur
en solo contre 1,75 à quatre. Porté à `BOSS_SUMMON_BASE × joueurs^WAVE_CROWD_EXP`,
même exposant que la horde. Débit mesuré par joueur : 0,300/s en solo, 0,178/s à
quatre, soit **19 % d'écart une fois l'exposant retiré** contre 62 % avant — le
critère demande 15 %, et le reste vient des invocations de **mécanique**, qui ne
suivent aucun effectif et que ce lot ne touche pas. `verifierBoss([1, 4], 6)`
passe à ses valeurs par défaut ; l'écart est donc à la limite de la tolérance, pas
franchement dedans.

**La densité par joueur en CORPS VIVANTS ne peut pas s'égaliser** (3,6 en solo
contre 1,4 à quatre) : un renfort meurt quatre fois plus vite face à quatre
joueurs. Ce que le réglage contrôle est le **débit**, pas la population — d'où le
choix de mesurer le débit.

**Deux critères ne se mesurent pas ici.** En calme les boss ordinaires tombent au
**plancher de barre** (40 à 47 s) : `diff.boss` vaut 0,75 et c'est lui qui règle,
pas la courbe. Et la matrice de cohérence sur les boss demande les trois profils
de compte — le bot n'en a aucun, il est immortel et sans méta.

### Expérience indexée sur la minute (lot D du plan d'équilibrage)

Protocole du lot C, plus une **graine écrite par manche** (`Math.random` remplacé
par un mulberry32 dérivé du numéro de manche, restauré en `finally`) : deux
réglages se comparent alors sur les **mêmes** manches, et le vérificateur est
**rejouable** — deux appels rendent la même liste. Sans ça rien n'était décidable
— voir plus bas. `mesureProgression()` / `verifierProgression()`, huit manches,
normal.

`XP_LEVEL_GROWTH` faisait dépendre la valeur d'un kill du **niveau d'équipe**,
c'est-à-dire de la sortie de la jauge qu'il alimente. Remplacé par
`XP_MINUTE_GROWTH = 1,055` sur la **minute de horde** (`_xpTimeMul()`, renommé
depuis `_xpLevelMul`).

| niveau atteint, mêmes graines | min 8 | min 20 | min 32 | cartes | écart-type |
|---|---|---|---|---|---|
| avant — 1 j | 13 ±1,5 | 25,5 ±5,6 | 30 ±5,7 | 26,3 | 5,0 |
| après — 1 j | **10 ±0,6** | 21 ±3,6 | 25,5 ±4,2 | 26,6 | **3,1** |
| avant — 4 j | 14,5 ±2,2 | 26 ±6,0 | 27,5 ±5,3 | 24,9 | 4,5 |
| après — 4 j | **10 ±1,2** | 27 ±5,3 | 30 ±5,3 | 26,1 | 4,3 |

Cible : 10 / 20 / 27. **Le début se cale exactement et sa dispersion est divisée
par deux et demi** ; le milieu et la fin restent au-dessus à quatre joueurs.

Verdict de `verifierProgression([1, 4], 8)`, rejouable tel quel : solo, l'écart
-type des cartes est à 3,1 pour un plafond de 3 et la minute 32 à 25,5 pour 27 —
les deux autres marques passent. À quatre, la minute 20 est à 27 pour 20, la
minute 32 au plafond de niveau, et **la cadence se resserre au milieu** (0,89 puis
0,71 min par niveau). La cause n'est pas la courbe mais la **normalisation par
l'effectif** : quatre joueurs tuent bien plus de quatre fois plus vite, et
`joueurs^WAVE_CROWD_EXP` ne reprend pas tout. L'exposant est **verrouillé** sur
celui du plafond de population (lot A) : il ne se corrige pas depuis ce lot.

**Deux constantes de coût bougent, et ce n'est pas dans le plan.** Le coût d'un
palier croissait de **1,18 par niveau** contre un revenu de 1,055 par minute : à
`LEVEL_XP_BASE` fixé, aucune valeur ne tient les deux bornes à la fois — la
tranche du milieu demande une base basse, celle de la fin une base haute, et
l'écart entre les deux demandes est d'un facteur deux. Mesuré sur onze couples,
`LEVEL_XP_GROWTH 1,18 -> 1,10` avec `LEVEL_XP_BASE 200 -> 330` est le seul
attelage qui cale le début, garde 26-27 cartes et resserre la dispersion. Les
onze couples sont dans l'historique de `shared/version.js`.

**Le plafond de niveau mordait.** À l'ancienne courbe la moitié des manches
finissaient collées à `LEVEL_MAX` (29 cartes), ce qui écrasait artificiellement
l'écart-type par le haut. Après, la fin de manche est à 25,5-26,6 : le plafond ne
borne plus rien, et l'écart-type mesure enfin la courbe.

**Le critère de dispersion reste rouge, et il mesure la mauvaise chose.**
L'écart-type du nombre de cartes par manche tombe de 5,0 à 3,1 en solo pour un
plafond de 3, mais ce qu'il capture surtout est la **longueur de manche** : 3
manches sur 8 se terminent en solo contre 7 sur 8 à quatre. La dispersion propre
à la courbe se lit à minute fixe, et là elle est franche : ±1,5 → ±0,6 à la
minute 8. Un critère d'écart-type sur une grandeur de fin de manche a besoin que
les manches se terminent — c'est-à-dire du lot H.

**Garde-fou remplacé et mesurable** (`verifierProgression`) : la cadence en
minutes par niveau doit rester **croissante** par tranche, à 10 % près
(`CADENCE_TOL` — sans tolérance, deux manches suffisent à retourner le signe).
Après : 0,89 / 1,09 / 2,67. Une cadence qui se resserrerait en fin de manche
serait une progression sans fin, et c'est ce que l'ancien garde-fou (« ne pas
monter au-dessus de `LEVEL_XP_GROWTH` ») disait sans pouvoir se vérifier.

**Rien de ce que le lot C avait réglé ne recule**, vérifié à graines appariées en
normal : durée médiane d'un combat de boss 88 → 87 s en solo et 74 → 83 s à
quatre, victoires 4/8 → 3/8 et 7/8 → 7/8 (dans le bruit). Le ttk de fin de manche
**s'améliore** au passage, 1,08 → **0,47 s** en solo, parce que la courbe plate
place les derniers niveaux là où l'ancienne les rendait inatteignables. Un relevé
non apparié donnait 4/6 → 1/6 sur les victoires : c'était du bruit, et c'est
exactement pour ça que les graines sont écrites.

### PV, temps de mise à mort et référence de boss (lot C du plan d'équilibrage)

Protocole : six cas (trois modes × 1 et 4 joueurs), manche complète, bots
immortels, **carte tirée au hasard parmi les trois offertes** (le bot des lots
précédents prenait toujours la première, ce qui n'est pas une build médiane),
médiane sur 6 manches. `mesureTTK()` / `verifierTTK()`.

TTK = PV d'un grunt ÷ (`BULLET_DAMAGE / FIRE_INTERVAL` × `powerIndex`) : la
puissance EST le multiplicateur de dps, le dps nu est une cadence de base.

| ttk d'un grunt | min 1 | min 10 | min 20 | min 30 |
|---|---|---|---|---|
| avant — normal 1 j | 0,40 | 0,91 | 1,46 | 2,15 |
| après — normal 1 j | 0,34 | 0,58 | 0,71 | **0,87** |
| après — normal 4 j | 0,32 | 0,44 | 0,54 | **0,79** |
| après — calme 1 / 4 j | 0,26 / 0,25 | 0,25 / 0,35 | 0,32 / 0,45 | 0,46 / **0,63** |
| après — cauchemar 1 / 4 j | 0,42 / 0,45 | 0,51 / 0,54 | 0,51 / **0,74** | 0,60 / **0,99** |

**Le critère sort rouge en fin de manche, et le plan le prévoyait à moitié.**
`ENEMY_HP_MIN_RAMP` passe de 13 à 7 comme décidé, ce qui divise l'écart par plus
de deux : la cible de 0,60 s est tenue partout jusqu'à la minute 10, cassée dans
deux cas sur six à la minute 20 et dans quatre à la minute 30. La cause
n'est pas la rampe : c'est la **puissance médiane réelle**. Le plan la supposait à
×4,7 en fin de manche, elle est mesurée entre **2,7 et 3,2** — le niveau 30 est
atteint vers la minute 20 et la build cesse alors de progresser. Un troisième
aller-retour sur la rampe est explicitement refusé ; l'écart appartient au lot D.

**`BOSS_POWER_REF` : 2,36 → 2,89, et la valeur converge.** Relevé de
`_playerPower()` à la mort de chaque boss, en normal (le seul mode où
`diff.boss` vaut 1) : médiane 3,06 en solo et 2,72 à quatre, soit 2,89. Réinjectée,
elle se remesure à 2,65 / 3,18, médiane **2,92** — la mesure est son propre point
fixe, une seule itération a suffi.

| durée médiane d'un combat de boss | calme | normal | cauchemar |
|---|---|---|---|
| `BOSS_POWER_REF` 2,36 — 1 / 4 j | 41 / 47 | 65 / 74 | 62 / 51 |
| `BOSS_POWER_REF` 2,89 — 1 / 4 j | 43 / 59 | **85 / 60** | 76 / 82 |

À 2,36 la moitié des combats tombaient sur le **plancher de barre** (40 s,
`BOSS_BARS × BAR_DWELL`) : le boss ne mourait pas de ses PV mais de la vitesse à
laquelle les barres consentent à casser, ce qui est le symptôme exact d'une
référence périmée. Seul calme solo reste sous la fourchette de 50-90 s, à 43 s,
et c'est cohérent : `diff.boss` y vaut 0,75.

**Le critère de non-régression n'est pas mesurable avec ce bot.** Survie médiane
d'une équipe qui joue mal, `ENEMY_HP_MIN_RAMP` 13 puis 7 : 5,0 → 5,3 min en
normal solo, 5,3 → 5,3 à quatre, 5,3 → 5,3 en calme. Les quinze manches meurent
au **premier boss**, au segment 1 : le bot ne pare pas, n'esquive pas et
n'utilise aucune compétence. Ce n'est pas la horde qui le tue, donc baisser les
PV de horde ne peut pas déplacer le chiffre. Même limite qu'aux lots B et J.

**Un artefact de mesure trouvé en chemin :** `botInput` vise le corps le plus
proche, donc les renforts et jamais le boss — un combat de boss ne se terminait
pas et la moitié des manches restaient bloquées au segment 1, horloge de horde à
l'arrêt. `botVersBoss` corrige, localement au lot C pour ne pas déplacer les
mesures des lots précédents.

### Traits, élites et bonus au sol (lot J du plan d'équilibrage)

Protocole : neuf cas (trois modes × 1, 2 et 4 joueurs), 37 min de jeu simulé,
bots immortels, échantillonnage à 6 Hz.

**Aucun des deux plafonds de traits n'en était encore un.**

| | plafond de traînée | saturé | préavis de ruée à l'écran |
|---|---|---|---|
| avant — cauchemar 1 / 2 / 4 j | 18 | 80 / 79 / 84 % | 31 / 11 / 22 |
| après — cauchemar 1 / 2 / 4 j | 81 | 18 / 41 / 48 % | 8 / 8 / 8 |

**La demande naturelle de traînée est de 200 à 400 zones.** Plafond levé, en
cauchemar : 397 (1 j), 268 (2 j), 200 (4 j) zones vivantes pour **18 places**.
Chaque porteur en tenait donc moins d'un vingtième : le trait n'existait pas. Et
il couvrait alors **19 à 27 % d'une vue en moyenne, jusqu'à 165 %** — le double
du budget de sol déjà écrit dans le dépôt (`HAZARD_SURFACE_MAX`, 12 %).

**Le plafond se dérive de l'ÉCRAN, pas de la population.** `trailMax()` rend ce
qui remplit 12 % d'une vue à `TRAIL_R = 26`, soit **81**. Le plan proposait
`_enemyCap() × 0,09`, qui vaut exactement 81 au plafond de cauchemar à quatre —
même nombre, mais indexé sur une grandeur qui bouge : à un joueur il serait tombé
à 29 alors que la horde entière tient sur le seul écran de ce joueur. La
lisibilité est une propriété de la vue, pas de l'effectif.

**Le plafond seul ne suffisait pas** : 200 à 400 de demande contre 81 places, il
serait resté saturé en permanence, donc constante et non plafond. L'empreinte par
porteur (`TRAIL_LIFE × vitesse / TRAIL_STEP`) valait 8,7 zones vivantes ; elle
est ramenée à 2,1 par `TRAIL_LIFE 4 → 1`, avec `TRAIL_DOT 14 → 26` pour rendre en
intensité ce que la durée perd. Le pas ne bouge pas : une traînée reste continue,
elle s'efface en une seconde.

**Le préavis de ruée devient un budget par VUE, pas une recharge.** Porteurs à
portée de ruée d'un joueur, selon le cas : **17 à 283**. Tenir « huit préavis à
l'écran » par la recharge aurait demandé un `DASH_CD` de 2,6 à 14 s selon le cas,
à re-régler à chaque changement de plafond. `DASH_WARN_MAX = 8` est le critère
lui-même, appliqué à l'octroi : mesuré à **8 exactement** dans les neuf cas, et un
préavis refusé ne consomme pas sa recharge.

**Le levier « comportement » se lit au nombre de traits par corps, pas à la part
de porteurs.**

| | traits par corps | part de horde porteuse |
|---|---|---|
| calme | 0,00 | 0 % |
| normal | 0,90 | 89 à 91 % |
| cauchemar | 1,66 | 97 à 99 % |

Le critère du plan — facteur 2 de `calme` à `cauchemar` — est vrai **par
construction**, `calme` n'attachant aucun trait : il ne dit rien. Le chiffre qui
dit quelque chose est le nombre de traits par corps, **×1,85 de normal à
cauchemar**, et c'est celui-là que `verifierTraits()` surveille, en croissance
stricte d'un mode au suivant.

**Les élites diluaient avec l'effectif.** `WAVE_ELITE_CROWD_EXP` valait 0,4 face
au 0,75 de `WAVE_CROWD_EXP` : la part d'élites décroissait en `joueurs^-0,35`.
Porté à **0,75** — même exposant des deux côtés, comme le plafond de population du
lot A.

| part des corps | 1 j | 2 j | 4 j | élites vues sur la manche |
|---|---|---|---|---|
| avant, calme | 2,5 % | 1,5 % | 1,3 % | 63 / 83 / 109 |
| après, calme | 2,3 % | 2,1 % | 1,9 % | 63 / 106 / 173 |
| après, normal | 2,2 % | 2,6 % | 1,7 % | 63 / 105 / 176 |

Le rapport 4 j / 1 j passe de 0,52 à 0,80 ; le reste est dans le bruit (±0,4 point
entre deux essais identiques). Une élite reste rare — 1 à 2 corps sur cent — donc
identifiable, ce que « Curée » (lot E-7) suppose.

**Les bonus au sol ne se mesurent pas sans pilote.** Le bot ne va pas les
chercher : 1 à 12 % ramassés, tout le reste périmé. Le seul chiffre
pilote-indépendant est l'occupation du sol, **1,1 à 2,9 bonus en permanence** pour
un `POWERUP_MAX_GROUND` de 2 — le générateur est donc bloqué la plupart du temps
par des bonus que personne n'a pris, et les dépouilles de `_killEnemy` passent
au-dessus du plafond. Aucune valeur touchée : la clémence des bonus est un critère
de profil, et le protocole du dépôt n'a pas de pilote.

**Le critère de composition sans tank sort rouge, et c'est le protocole.**
Dégâts subis par joueur et par minute, 12 min, trois essais :

| | avec tank | sans tank | écart |
|---|---|---|---|
| normal, rien neutralisé | 578 | 265 | 0,46× |
| normal, `dash` neutralisé | 406 | 350 | 0,86× |
| normal, `trail` neutralisé | 283 | 277 | 0,98× |

**Aucun type ne porte `trail` en normal** : neutraliser un trait absent déplace le
chiffre d'un facteur deux. La mesure est dominée par le bruit, et augmenter les
essais n'y changerait rien — le bot n'utilise ni Rempart ni Provocation, les deux
seules choses qui font un tank. `mesureComposition()` est livrée avec le lot ; le
critère est renvoyé au lot I, qui a besoin d'un pilote (même réserve qu'au lot B).
**Réglé au lot I** : `pilotage()` appuie sur les deux, et la chaîne de
compositions donne l'apport du tank — +57 % en normal, zéro en cauchemar.

### Vitesse et bestiaire (lot B du plan d'équilibrage)

**Le décrochage n'existait pas.** Distance au poursuivant le plus proche, joueur
sans aucune carte de mobilité, fuite en ligne droite, paquet de 40 corps, sans
réapprovisionnement :

| | 5 s | 10 s | 15 s |
|---|---|---|---|
| avant, les trois modes, toutes les minutes | 22 px | 22 px | 22 px |
| après — calme, minute 25 | 387 | 765 | 1 144 px |
| après — normal, minute 25 | 264 | 503 | 726 px |
| après — cauchemar, minute 25 | 171 | 268 | 365 px |

22 px est exactement `r_runner + PLAYER_RADIUS - PLAYER_BITE`, la distance de
séparation : le poursuivant était **collé**, indéfiniment, dans les neuf cas.

**La rampe additive effaçait le bestiaire.** `ENEMY_SPEED_MIN_RAMP = 4` px/s par
minute, identique pour tous, était mathématiquement une compression : le rapport
lent/rapide tombait de 4,7× à 2,1× sur une manche. La rampe multiplicative
(`ENEMY_SPEED_RAMP_PCT = 0,007`) le rend **invariant par minute** : 3,55×, à la
minute 0 comme à la minute 30, dans les trois modes.

**La table du plan cassait sa propre doctrine.** Écrite pour un runner à 196, elle
oubliait deux facteurs — le `speed` de difficulté qu'elle introduisait elle-même,
et le tirage ±10 % qui existait déjà. Vitesse du runner à la minute 30 :

| | nominale | haut de tirage | plafond |
|---|---|---|---|
| normal | 237 | 261 | 234 |
| cauchemar | 266 | 292 | 234 |

`196 × 1,21 = 237` : la base cassait la doctrine **avant** tout multiplicateur de
mode. Résolu sur le pire cas réel (haut de tirage, cauchemar, minute 30) :
runner **156**. Ce qui faisait tomber le rapport lent/rapide à 3,0×, d'où deux
fiches touchées hors plan pour tenir le plancher de 3,5× — **tank 52 → 44** et
**bulwark 58 → 50**. Le pire cas mesuré est à 233 px/s pour un plafond de 234.

**Le mur de corps n'en est pas un.** Temps pour parcourir 600 px depuis le centre
d'un encerclement, arène au plafond, biome nu :

| | corps | sortie |
|---|---|---|
| à vide | 0 | 2,31 s |
| calme / normal, tout effectif | 176 à 622 | 2,3 s |
| cauchemar 4 joueurs | 900 | 2,3 à 2,5 s |

C'est la réponse à la question laissée ouverte par le lot A (« à 622, personne ne
sait ») et elle tient dans un invariant déjà écrit : `_separateFromPlayers` ne
déplace **jamais** le joueur, seulement l'ennemi. Traverser neuf cents corps coûte
donc des **dégâts de contact**, pas du temps. `verifierEncerclement()` reste comme
garde-fou : le jour où un corps repoussera un joueur, il le dira.

**La mort médiane solo ne franchit pas le seuil demandé.** Neuf essais, bot
mortel :

| | avant | après |
|---|---|---|
| calme | 5,3 min | 5,3 min |
| normal | 4,8 min | 5,3 min |
| cauchemar | 2,7 min | 3,7 min |

Le critère visait le segment 3, soit dix minutes ; aucun mode n'y arrive, ni avant
ni après. **Ce chiffre mesure le bot, pas le jeu** : il ne pare pas, n'esquive pas
et n'utilise aucune de ses deux compétences. Le seul enseignement exploitable est
l'écart, +37 % en cauchemar. Un critère de survie a besoin d'un pilote, et le
protocole du dépôt n'en a pas.

### Plafond de population et grille spatiale (lot A du plan d'équilibrage)

Protocole : bots immortels, 45 min de jeu simulé, trois essais par case, les six
segments traversés dans les 27 cas. Population moyenne par segment, temps de
première saturation, ms de simulation par image.

| | plafond | population par segment | 1ʳᵉ saturation | ms méd. / p99 |
|---|---|---|---|---|
| calme 1j | 176 | 5 12 21 27 35 37 | 35 min (1 essai/3) | 0,06 / 0,20 |
| calme 2j | 296 | 6 20 21 33 44 48 | 35 min (1/3) | 0,07 / 0,26 |
| calme 4j | 498 | 10 24 20 26 36 43 | jamais | 0,13 / 0,59 |
| normal 1j | 220 | 6 19 24 32 37 28 | jamais | 0,09 / 0,32 |
| normal 2j | 370 | 9 29 35 34 80 86 | jamais | 0,12 / 1,29 |
| normal 4j | 622 | 17 67 45 125 166 100 | 31 min (1/3) | 0,17 / 4,55 |
| cauchemar 1j | 319 | dégénéré — voir plus bas | 9,6 min (1/3) | 0,04 / 0,97 |
| cauchemar 2j | 536 | 15 109 75 96 95 108 | 9,1 min (2/3) | 0,21 / 3,71 |
| cauchemar 4j | 900 | 20 52 34 67 70 82 | jamais | 0,19 / 2,26 |

**La parité d'effectif est le résultat principal**, et elle ne se lit pas sur le
niveau atteint (écrêté par `LEVEL_MAX = 30`, et bruyant à ±5 niveaux entre deux
essais identiques) mais sur les **tués**, une fois divisés par `joueurs^0,75` —
la division exacte que `_addXp` applique à l'expérience :

| | 1j | 2j | 4j | ÷ `joueurs^0,75` |
|---|---|---|---|---|
| calme | 4 889 | 8 220 | 14 350 | 4 889 / 4 887 / 5 074 |
| normal | 6 066 | 10 041 | 16 282 | 6 066 / 5 970 / 5 757 |

Soit **95 à 104 %**. C'est ce que le lot achetait : le plafond porte le **même
exposant** que la division d'expérience, donc la horde grossit exactement de ce
que la normalisation retire. Avant, la division s'appliquait seule.

**Le plafond ne mord presque plus.** Trois cases seulement saturent, toutes après
la minute 9, et jamais dans les trois essais. Le régulateur de fin de manche
n'est plus le plafond mais le **débit face à ce que l'équipe nettoie**.

**Le moteur tient bien plus que le plafond.** Arène forcée pleine, bots au repos,
60 s par palier :

| corps | médiane | p99 |
|---|---|---|
| 220 | 0,18 ms | 0,95 ms |
| 622 | 0,73 ms | 1,77 ms |
| 900 | 2,00 ms | 3,56 ms |
| 1600 | 4,98 ms | 7,04 ms |
| 2000 | 8,75 ms | 14,58 ms |

`MAX_ENEMIES_HARD_CAP = 900` coûte donc 3,6 ms au p99 sur un budget de 16, et le
budget ne casse qu'entre 1600 et 2000 corps. **La marge est de 1,8× en nombre de
corps** — c'est elle que les lots B et J dépensent s'ils alourdissent le coût par
ennemi. Le plafond de 900 ne mord au demeurant qu'en cauchemar à quatre, où la
valeur naturelle est 902.

**Les débits du script sont redevenus opérants** (A-2). Temps qu'un beat met à
remplir le plafond, horde jamais nettoyée :

| beat | débit | calme | normal | cauchemar |
|---|---|---|---|---|
| segment 4 beat 1 | 2,2/s | 60 % en 60 s | 60 % en 60 s | 53 % en 60 s |
| segment 4 beat 5 | 3,8/s | 58 s | 58 s | 91 % en 60 s |
| segment 5 beat 5 | 4,4/s | 50 s | 50 s | 57 s |
| segment 6 beat 5 | 5,0/s | 44 s | 44 s | 50 s |

**Le temps est le même à 1, 2 et 4 joueurs**, au dixième de seconde : plafond et
débit portent le même exposant d'effectif, donc l'un ne peut pas rattraper
l'autre. Et la montée reste un gradient et non une marche — un beat d'ouverture
de segment 4 ne remplit que 60 % du plafond, le crescendo du segment 6 le remplit
en 44 s sur les 300 du segment.

Deux réserves écrites, parce qu'elles portent sur le protocole et non sur le lot :

- **cauchemar en solo est dégénéré** : les bots immortels restent bloqués sur le
  premier boss quarante minutes (segment 1 ou 2 atteint sur trois essais). Ses
  chiffres ne veulent rien dire, dans aucun sens.
- **la croissance de population n'est pas monotone** sur huit cases : creux au
  segment 3 partout, et au segment 6 en normal. La quantité écrite au script
  monte bien ; c'est la **puissance de l'équipe** qui monte plus vite qu'elle sur
  ces deux fenêtres. Ça se règle en C (PV et TTK), pas en relevant le plafond.

Simulation à 4 joueurs, mesurée sur ce projet :

| t | ennemis | snapshot | bande passante / joueur |
|---|---|---|---|
| 60 s | 16 | 2,7 Ko | 53 Ko/s |
| 120 s | 28 | 3,1 Ko | 62 Ko/s |
| 180 s | 33 | 3,8 Ko | 75 Ko/s |
| 300 s | 52 | 3,9 Ko | 78 Ko/s |
| pire cas | 200 (plafond) | 8,1 Ko | 163 Ko/s |

430 s de jeu se simulent en 0,9 s de CPU, soit 460× le temps réel.

Ces chiffres sont ceux du **banc**, arène pleine construite à la main. Le relevé
en **production** (VPS, vague 22 atteinte en jeu réel) monte à **9,5 Ko clair,
3,9 Ko déflaté** : la ligne « pire cas » ci-dessus n'est donc pas un plafond
absolu, seulement le pire cas *de ce banc*. Ce qui compte est que la valeur
transmise soit celle **déflatée** — c'est elle qui passe sur le lien.

Le pire cas est mesuré arène pleine en cauchemar, avec quatre tourelles posées,
le ricochet actif sur tout le monde et **24 zones simultanées** (un damier plus
un balayage). Les tourelles coûtent 5 nombres chacune, une zone 12 : le poste
dominant reste et restera la liste des ennemis. À quatre joueurs, cela
représente environ 5,2 Mbit/s en sortie du serveur — sans conséquence sur un
réseau local filaire ou en Wi-Fi correct.

Le rang d'élite ne coûte **rien** : il voyage dans le champ de type (+100)
plutôt que dans un drapeau séparé, qui aurait ajouté un nombre sur chacun des
200 ennemis. Le marquage de **retardataire** s'y ajoute (+200) pour la même
raison : un huitième élément payé sur tous les ennemis, vingt fois par seconde,
pour une information qui ne concerne que les dernières secondes d'une vague.

Le **compteur de touches**, lui, a bien fallu le payer — c'est le seul champ
ajouté à la liste d'ennemis depuis l'origine. Mesuré arène pleine, tous les
ennemis déjà touchés (le pire cas absolu) :

| version du compteur | poids de l'instantané | hausse |
|---|---|---|
| sans compteur | 6,65 Ko | référence |
| un octet complet (0 à 255) | 7,43 Ko | **+11,8 %** |
| un chiffre (0 à 9) | 7,04 Ko | **+5,9 %** |

Le budget qu'on s'était fixé était de 10 %. La première version le dépassait, et
c'est la mesure qui a tranché : un chiffre suffit largement, puisque le client ne
lit qu'une différence entre deux instantanés consécutifs. Sur une campagne
normale à un joueur, la bande passante passe de 11,0 à 11,6 Ko/s.

### Les deux champs du lot de lisibilité

Le **propriétaire d'une balle** et la **provenance du dernier dégât subi**. Le
dépôt avait jusqu'ici refusé de transmettre le premier, et la raison était bonne :
il ne servait qu'à attribuer des dégâts, ce que `bd` résout côté boss sans rien
payer par balle. Ce qui a changé, c'est l'usage — la lisibilité du tir, qu'aucune
déduction locale ne peut retrouver.

Pire cas mesuré : arène pleine (200 ennemis, la moitié déjà touchés), **400 balles
en vol**, 50 projectiles ennemis, quatre joueurs.

| version | poids de l'instantané | hausse |
|---|---|---|
| avant le lot | 14 844 o | référence |
| + provenance (4 joueurs) | 14 852 o | **+0,05 %** |
| + propriétaire (400 balles) | 15 652 o | **+5,4 %** |

Sur une manche réelle de 420 s, moyenne sur 25 200 instantanés : **+0,9 %** en
solo (889 → 897 o), **+2,0 %** à quatre (1 834 → 1 870 o). La provenance coûte
quatre nombres par instantané, quelle que soit la scène ; c'est la balle qui paie,
et elle ne paie qu'en fin de manche chargée.

Le total reste sous le budget de 10 % et du même ordre que le compteur de touches.
La répartition des dégâts subis par provenance est mesurée plus haut, dans « D'où
viennent les dégâts qu'on prend ».

### Grande arène et caméra (lot I)

L'arène passe de 1600 × 900 à **4800 × 2700** ; la **vue** reste 1600 × 900,
chaque client suit sa position prédite (caméra lissée, recalage sec au-delà
d'un écran, clamp à la salle). Les combats de boss se jouent dans des
**bounds resserrés à une vue**, ancrés sur le centre de gravité de l'équipe —
c'est le mécanisme de constriction du lot 5, réutilisé tel quel, et toute la
géométrie des mécaniques (damier, exaflares, couronne…) lit désormais les
bounds au lieu de l'arène dessinée.

Coût des coordonnées à quatre chiffres, mesuré arène pleine (200 ennemis, la
moitié touchés, 400 balles, 4 joueurs, 4 points de récolte) :

| version | poids de l'instantané | hausse |
|---|---|---|
| même scène à l'échelle 1600 × 900 | 15 791 o | référence |
| grande arène (coordonnées + clé `hv` + éclats) | 16 547 o | **+4,8 %** |

Sous le budget de 10 %. La caméra a été vérifiée en jeu réel : le suivi
s'arrête exactement à `ARENA_W − VIEW_W/2 = 4000` px au bord droit, et la
conversion souris reste juste pendant le déplacement (mémorisée en vue,
convertie en monde à la lecture).

Les **points de récolte** (cristal à détruire, amas à canaliser 1,5 s)
n'apparaissent jamais à moins de 1100 px d'un joueur vivant ni pendant un
boss ; le rendement (15-35 **éclats**, la monnaie de manche, jamais persistée)
est versé à chaque joueur — même logique que l'expérience commune. Les
retardataires sont resserrés (5 s, ×2,0) : un fuyard sur une salle neuf fois
plus grande ne se rattrapait plus. Les apparitions se tirent **autour de la
boîte englobante des joueurs** (hors écran, écrêtée à la salle) et non plus
sur les bords : sur une arène d'une seule vue, ce tirage redonne exactement
les quatre bords d'avant.

Restent à mesurer en conditions réelles (fenêtre visible, table à quatre) :
les images par seconde avec culling actif — le compteur `?perf` est en place —
et la durée moyenne d'une vague avant/après (attendu : écart sous 15 %).

### Économie du Terminal (lot H)

Le revenu devient **linéaire et plafonné** — on paie la vague atteinte, plus
la somme des vagues traversées, qui croissait au carré : une seule bonne
partie payait une ligne entière au palier maximal (≈ 3 100 noyaux mesurés,
dont deux tiers de primes de première fois, supprimées avec le lot). Les
coûts deviennent géométriques (200 → 3 600, 6 900 la ligne), les emplacements
se gagnent aux **jalons du compte** et plus aux achats. Cibles du spec F5,
vérifiées avec les fonctions réelles :

| mesure | attendu | relevé |
|---|---|---|
| vague 12, normal, 2 boss | 250 à 350 | **280** |
| vague 20, cauchemar, 4 boss | plafonné à 600 | **600** |
| parties pour un premier palier | 1 | **1** (200 ◈, ~280-378/partie) |
| parties pour une ligne complète | 16 à 20 | **18,3** |
| parties pour trois lignes complètes | 50 à 60 | **54,8** |
| emplacements compte neuf → maximal | 3 → 6 | **3 → 6** (jalons) |

Vérifié en jeu réel : une manche vague 1 en normal verse exactement 14 noyaux
(10 × 1 × 1,4). L'écart compte neuf / compte maximal reste à remesurer en
simulation complète (attendu sous 1,5 vague — les valeurs des lignes n'ont
pas changé, seuls le rythme d'acquisition et la capacité ont bougé).

### Rendu WebGL

Mesuré dans Chrome sans tête, sur un banc synthétique qui reproduit le pire cas
annoncé — 220 ennemis plus 3 000 particules :

| mesure | attendu | relevé |
|---|---|---|
| appels de dessin par image | 2 à 4 | **2** (un normal, un additif) |
| quads par image, pire cas | sous 4 000 | **3 220** |
| mémoire GPU de l'atlas | sous 16 Mo | **1,5 Mo** à densité 1, **6,1 Mo** à densité 2 |
| teinte, alpha, éclair, additif | exacts | lecture de pixels conforme aux quatre |

Les deux appels de dessin sont le chiffre qui compte : un lot vidé à chaque
sprite donnerait des centaines d'appels pour exactement la même image, et rien à
l'écran ne le dirait. `?perf` dans l'adresse les affiche en jeu, à côté des
images par seconde, du nombre de fragments et du chemin de rendu utilisé.

La lecture de pixels vérifie les quatre points où une bascule WebGL échoue
visuellement : une teinte rouge pleine rend `255,0,0,255`, un alpha de 0,5 rend
`127,127,127,127` (prémultiplié — un `255,255,255,127` aurait signalé l'erreur),
un éclair à 1 rend du blanc pur, et deux quads additifs à `0x40` rendent `128`.

Les images par seconde ne sont **pas** mesurables ainsi : le rendu logiciel de
Chrome sans tête ne dit rien d'un GPU réel, et le temps virtuel fige les
horloges. Elles se relèvent en session réelle avec `?perf`.

### Les axes de cartes du lot 6

Les dégâts par seconde sont mesurés sur **cible fixe et immortelle** — un ennemi
neuf replanté à chaque tick, 120 s de tir. C'est la seule mesure qui compare
deux chargements sans faire dépendre le résultat de la survie du bot.

La comparaison se fait **à nombre de cartes égal**, ce qui est le seul angle
honnête : un chargement critique complet ne coûte pas le même nombre de tirages
qu'un chargement brut complet.

| chargement | cartes | dps | chance critique |
|---|---|---|---|
| nu | 0 | 60 | 5 % |
| critique orienté (Précision ×2, Mire, Œil de faucon) | 4 | 98 | 49 % |
| brut (Affûtage ×3, Calibre) | 4 | 98 | 5 % |
| critique maximal (+ Talon faible ×2) | 8 | 135 | 60 % |
| brut (Affûtage ×6, Calibre ×2) | 8 | 134 | 5 % |

**Écart entre build critique et build brute : 1,1 %** à huit cartes, 0,9 % à
quatre — le critère du lot était « moins de 30 % ». La chance critique d'une
build orientée atteint 49 %, au-dessus de la fourchette de 25 à 45 % annoncée
dans le plan : les plafonds d'exemplaires ont déjà été abaissés une fois à la
mesure (Précision 5 → 3, Mire 3 → 2, Œil de faucon 2 → 1), et descendre plus bas
faisait tomber la build critique **sous** la build brute.

Conséquence chiffrée du critique de base : la puissance d'un joueur nu passe de
1,00 à **1,05** dans `_playerPower()`, donc les PV de boss et la pression des
vagues montent de 5 % — c'est exact, tout le monde inflige réellement 5 % de
dégâts en plus, et c'est précisément le rôle de l'indexation.

Variété du pool, 200 manches simulées avec la même dérive de qualité que le jeu :

| tirages dans la manche | communes distinctes vues | pire cas |
|---|---|---|
| 18 | 14,3 | 8 |
| 20 | **15,1** | 11 |

Le critère était « plus de 15 ». Il est atteint en haut de la fourchette de
tirages (le dépôt en annonce quinze à vingt) et manqué de peu en bas : le pool
de rareté basse se vide toujours en milieu de manche, parce que la dérive de
qualité pousse mécaniquement les épiques. Douze communes ajoutées au lieu des
huit du plan, et c'est le levier qui reste si le chiffre doit encore monter.

Aucune case de secours (Ravitaillement) n'a été servie sur les 200 manches, là
où le pool d'avant en servait : c'est l'effet secondaire attendu d'un catalogue
passé de 77 à 106 cartes. **Mesure prise à 106 cartes** — le catalogue en compte
116 depuis, et l'effet ne peut qu'avoir grandi. Le chiffre n'est pas mis à jour
ici : une mesure se remesure, elle ne se réécrit pas.

### Les trois modes, mesurés séparément

C'est le lot où la mesure par mode devient **obligatoire** : depuis que la
difficulté n'est plus un facteur d'échelle, elle ne se déduit plus d'un
multiplicateur.

Protocole : quatre joueurs, **immortels**, 300 s de horde à segment fixe,
niveau 20 (bestiaire complet déverrouillé), compte neuf. Le bot est le même dans
les trois modes — il vise le plus proche, s'écarte de la masse et esquive dès que
la recharge est prête. Ce n'est pas un joueur ; l'écart entre modes est la mesure,
la valeur absolue ne l'est pas. Les joueurs sont immortels parce qu'avec un bot
les trois modes meurent au **même mur** — le premier boss, qui est identique
partout — et la survie brute ne mesurait alors que ce mur.

| segment | mode | population moyenne | dégâts subis / min | CPU moyen | p99 |
|---|---|---|---|---|---|
| 1 | calme | 11 | 58 | 0,006 ms | 0,033 ms |
| 1 | normal | 66 | 1 944 | 0,023 ms | 0,116 ms |
| 1 | cauchemar | 130 | 1 415 | 0,062 ms | 0,201 ms |
| 3 | calme | 175 | 698 | 0,058 ms | 0,143 ms |
| 3 | normal | 183 | 2 019 | 0,075 ms | 0,178 ms |
| 3 | cauchemar | 189 | 2 688 | 0,095 ms | 0,211 ms |
| 5 | calme | 187 | 1 177 | 0,062 ms | 0,148 ms |
| 5 | normal | 191 | 2 754 | 0,074 ms | 0,169 ms |
| 5 | cauchemar | 194 | 3 033 | 0,085 ms | 0,190 ms |

Quatre lectures, dont deux sont des avertissements.

**Les modes se séparent au segment 1 et se rejoignent après.** 11 / 66 / 130 en
population au segment 1, puis 187 / 191 / 194 au segment 5 : la population sature
contre `MAX_ENEMIES` dans les trois modes dès qu'on ne meurt pas. C'est une limite
du protocole — des bots immortels ne tuent pas assez — et pas un défaut des modes,
mais elle dit quelque chose de vrai : **c'est le début de manche qui porte
l'identité du mode**, la fin les rapproche mécaniquement par le plafond.

**Les dégâts subis se classent correctement à partir du segment 3** (698 / 2 019 /
2 688, puis 1 177 / 2 754 / 3 033) mais **pas au segment 1**, où cauchemar (1 415)
passe sous normal (1 944). Ce n'est pas une erreur de mesure : en cauchemar les
quotas font entrer des medics et des choeurs, qui n'infligent rien eux-mêmes et
prennent la place de types qui frappent — et l'aura du choeur allonge la durée de
vie de tout le paquet, donc réduit le nombre de kamikazes qui arrivent au bout de
leur course. Un mode plus dur qui fait *moins* mal la première minute est un
résultat contre-intuitif à surveiller au lot X ; il n'est pas absurde — un mur qui
ne se perce pas est une autre façon d'être dur.

**La part de zone reste quasi nulle partout** (0,3 % au mieux) alors que les
traînées de cauchemar plafonnent bien à 18 zones. Deux causes : un bot qui kite en
permanence est précisément le joueur qui ne met jamais le pied dans une flaque, et
surtout **le biome n'existe pas encore** — c'est le lot V qui porte la promesse
« le sol participe ». La cible du plan (« cauchemar doit montrer une part de zone
nettement plus élevée ») n'est donc pas atteignable à ce lot, et c'est attendu.

**Le coût CPU reste très en dessous du budget** : 0,095 ms de moyenne et 0,211 ms
de p99 dans le pire cas mesuré, contre 1 ms et 8 ms de budget. Les neuf types, les
six traits et les trois profils ne coûtent rien.

Mesure complémentaire, joueurs **mortels** cette fois, cinq essais par mode, à
quatre : survie médiane **307 s** en calme, **298 s** en normal, **236 s** en
cauchemar, soit un facteur **1,30**. Sous la cible de 1,5 à 2,5 — mais les trois
médianes tombent au même endroit, l'arrivée du premier boss à 300 s, ce qui
signifie que la mesure est saturée par le mur du boss et non par le mode. À
refaire au lot X avec un pilote capable de passer un boss.

### Vagues et progression

Cinq essais par configuration, bots qui visent l'ennemi le plus proche (le boss
en priorité quand il est là), fuient la menace et esquivent au contact.

| joueurs | vagues en 900 s | niveau d'équipe | cartes prises | durée d'une vague normale |
|---|---|---|---|---|
| 1 | 15,8 | 15,4 | 14,2 | 56,5 s |
| 2 | 17,6 | 14,2 | 13,2 | 51,8 s |
| 3 | 18,0 | 13,8 | 12,6 | 47,1 s |
| 4 | 16,0 | 14,0 | 13,0 | 49,2 s |

Le résultat quasi identique à un et à quatre joueurs **est le but** : le budget
de vague et les paliers de niveau portent le même exposant d'effectif (0,75), ce
qui donne la même partie quel que soit le nombre de joueurs.

Coût, sur les mêmes essais : **22,9 à 55,6 Ko/s** par joueur (plafond fixé à
160), et **0,20 à 1,07 s de CPU pour 600 s simulées** (plafond fixé à 3 s).

Chargements forcés sur les cartes qui réécrivent le tir, que des bots ne
tireraient jamais spontanément — c'est le cas qui inquiétait, une balle qui ne
disparaît plus se teste contre 200 ennemis à chaque image :

| chargement | CPU / 600 s | bande passante |
|---|---|---|
| témoin, tirage libre | 0,59 s | 42 Ko/s |
| Inertie | 0,71 s | 52 Ko/s |
| Inertie + Canon long ×3 + Poudre ×3 | 0,55 s | 48 Ko/s |
| Rebond + Inertie + Canon long ×3 | **0,92 s** | **68 Ko/s** |
| Rebond + Second canon ×2 + Écho | 0,74 s | 65 Ko/s |

Le pire cas reste à moins d'un tiers du budget CPU. Ce sont le plancher de
dégâts d'Inertie et le plafond de rebonds qui le tiennent : sans eux, une balle
à 0,1 dégât restait en vol jusqu'à expiration en se testant contre toute
l'arène, et le coût montait avec la densité — c'est-à-dire au pire moment.

### Classes : écarts entre compositions

**Périmé, remplacé par le lot I** (voir plus haut). Les chiffres de cette section
étaient relevés en **vagues**, unité supprimée au plan 5, et avec des bots qui
n'esquivaient pas : ils ne se comparent à rien de mesurable aujourd'hui. Ce qui
survit du constat d'alors, et que le lot I confirme : le soigneur ne tenait pas
l'objectif de dégâts (26 à 31 % de ceux du tireur) et sa survie solo était celle
du tireur à 0,1 % près.

Une observation structurelle de l'époque est **caduque depuis D2** : les PV de
boss ne s'indexent plus sur la puissance de l'équipe, donc le +20 % du tireur ne
lui achète plus de PV de boss.

### États et purge

Dix essais par composition, mêmes bots que ci-dessus, avec en plus : le soigneur
vise l'allié et non l'ennemi quand il est en mode soin, et un joueur sous
Sentence court vers lui. La Sentence et le Miasme n'ont pas encore de porteur —
le roster de boss est le lot suivant — ils sont donc **posés par le harnais** aux
cadences prévues (Miasme toutes les 25 s pendant un boss, Sentence toutes les
20 s) : c'est la mécanique qu'on mesure, pas son câblage.

| composition | survie | vague | états simultanés / joueur | max | purges par manche |
|---|---|---|---|---|---|
| témoin, système débranché | 208 s | 5,7 | 0,00 | 0 | — |
| tank + soigneur + tireur | 173 s | 5,0 | 0,06 | 2 | 3,2 (59 % des états posés) |
| tank + tireur + tireur | 161 s | 5,0 | 0,06 | 1 | 0,4 (13 %) |

**Écart avec / sans soigneur : 7 %**, pour une limite fixée à 25 %. L'objectif du
lot est tenu : le soigneur accélère, il n'est pas une condition d'accès. Les
états simultanés restent très en dessous de la limite de 2 — les sources sont
rares aujourd'hui (les élites, et le Miasme seulement pendant un boss), le
chiffre était à **remesurer au lot 4** quand les boss en poseraient vraiment.

**Remesuré**, en trio, sur 120 s de combat par boss porteur d'états :

| boss | états simultanés / joueur | max | cumuls de Vulnérabilité |
|---|---|---|---|
| Oracle | 0,90 | 1 | 2,59 |
| Jumeaux | 0,35 | 1 | 0,02 |

La limite de 2 tient toujours, et le maximum de 1 chez les Jumeaux **n'est pas un
hasard** : cumuler Brûlure et Entrave déclenche l'explosion, qui retire les deux
dans la foulée. Chez l'Oracle, ce sont les **cumuls** qui montent — 2,59 sur 3
possibles, entre le Miasme toutes les 25 s et les échecs de mécanique. C'est
exactement l'usure que le lot 3 avait prévue sans pouvoir encore la produire.

Deux chiffres ne tiennent pas leur cible :

- **Taux de purge : 59 %** contre 60 % attendus, ce qui est la limite. Sans
  soigneur, les 13 % viennent des seuls rempart et Purification : c'est peu, mais
  c'est cohérent avec le principe — les états expirent tous seuls.
- **Survie à la Sentence : 42 %** contre 80 % attendus, sur 19 poses. La
  ventilation par classe est la vraie information : **tireur 4/5, tank 4/10,
  soigneur 0/4.**

Le soigneur ne peut pas se purger lui-même : son faisceau ne se soigne pas, et sa
seule réponse est la vague de soin, dont la recharge (16 s) est plus longue que
la cadence de Sentence testée (20 s à peine). **Contrainte pour le lot 4 : un
boss ne doit pas viser le soigneur avec la Sentence, ni en enchaîner plus vite
que la recharge de la vague.** Ne pas corriger en allongeant l'état ni en
autorisant une double purge — les deux videraient la règle d'ordre de son sens.
Le tank à 4/10 s'explique autrement : « soigné à plein » coûte d'autant plus cher
qu'on a de PV, et 150 PV à remonter en 8 s dans un combat de boss demande que le
soigneur lâche tout le reste. Un soigneur en ligne de vue purge en **0,48 s**,
mesuré à part : ce qui manque n'est pas la puissance de la purge, c'est la
position.

Coût CPU d'un tick, arène pleine (200 ennemis), quatre joueurs, après rodage du
JIT :

| situation | moyenne | p99 | pire |
|---|---|---|---|
| sans états | 0,051 ms | 0,17 ms | 0,29 ms |
| 4 états sur les 4 joueurs | 0,059 ms | 0,19 ms | 0,42 ms |

Le système coûte **8 µs par tick** dans le pire cas raisonnable, pour un budget
de 16,7 ms. C'était attendu : les états vivent sur les joueurs, qui sont quatre,
et non sur les ennemis, qui sont deux cents.

### Roster de boss

Cinq essais par configuration et par politique, renforts du boss coupés pendant
la mesure (on veut l'écart dû au **répertoire**, pas le bruit de deux cents
contacts), dix cartes par bot.

**Durée du combat**, bots invulnérables — on mesure ici le mur de PV seul, sans
que la survie des bots ne s'y mêle. Cible : 50 à 80 s, comparable d'un boss à
l'autre.

| boss | 1 j. | 2 j. | 4 j. |
|---|---|---|---|
| Ravageur | 49 s | 53 s | 57 s |
| Matriarche | 80 s | 76 s | 66 s |
| Métronome | 45 s | 48 s | 52 s |
| Oracle | — | 71 s | 78 s |
| Jumeaux | — | 70 s | 77 s |

Trois réglages sont sortis de cette table, et aucun n'était prévisible :

- **soin mutuel des Jumeaux, 2 % → 0,8 %** par seconde. À 2 %, le combat durait
  **167 à 198 s** : ils se rejoignent d'eux-mêmes puisqu'ils poursuivent des
  joueurs, et la mécanique n'invitait plus à se séparer, elle interdisait de
  gagner.
- **lien nourricier, 1,2 % → 0,5 %** par seconde et par rejeton, plus **un seul
  rejeton et une seule grappe en solo**. À deux, un joueur peut se détacher
  pendant que l'autre tient le boss ; seul, chaque cible secondaire est du temps
  de tir pris sur le boss lui-même — 95 s de combat contre 49 pour le Ravageur.
- **Oracle ×1,10 → ×0,95** de PV, pour la raison décrite plus haut.

Un bug a été trouvé par la même table : le lien nourricier était créé avec une
échéance nulle et se résolvait au premier tick, donc **le soin ne s'appliquait
jamais**. Les durées de la Matriarche n'ont pas bougé d'un réglage tant que
c'était vrai.

**L'écart entre un bot qui lit les annonces et un bot qui les ignore** — la
mesure qui compte. Elle est prise en **temps de survie**, les deux politiques
partageant l'esquive et le maintien de distance (c'est le geste de base du jeu,
pas de la lecture). Cible : plus de 40 %.

| boss | 1 j. | 2 j. | 4 j. |
|---|---|---|---|
| Ravageur | −7 % | +69 % | +63 % |
| Matriarche | +20 % | +37 % | +96 % |
| Métronome | +66 % | +99 % | +87 % |
| Oracle | — | +107 % | +120 % |
| Jumeaux | — | +26 % | +52 % |

**Neuf configurations sur onze au-dessus de la cible**, et l'ordre est celui
qu'on espérait : l'Oracle, dont tout le répertoire est collectif, double la
survie d'une équipe qui lit. Les deux qui échouent sont **solo** — normal, un
boss solo n'a presque que des zones à lire, et c'est exactement ce que le bot
« ignore » sait déjà faire à moitié via l'esquive commune. Le −7 % du Ravageur
solo dit surtout que notre bot esquive mal ; il ne dit rien de neuf sur le
combat, qui n'a pas changé dans ce lot.

**Taux d'échec par mécanique**, politique « lit », toutes configurations
confondues. Cible : aucune au-dessus de 60 % au premier contact.

| mécanique | poses | échec |
|---|---|---|
| appâts | 211 | 0 % |
| dispersion | 70 | 4 % |
| grappes | 66 | 0 % |
| tours | 64 | 31 % |
| regroupement | 62 | 18 % |
| sanctuaires | 59 | 0 % |
| proximité | 38 | 3 % |
| dénombrement | 8 | 25 % |
| lien | 2 | 100 % |

Le **lien** est le seul au-dessus de la cible, sur deux poses seulement : le bot
le traite après l'esquive des zones, et les croix des Jumeaux tombent pendant ce
temps-là. Test dédié, avec des bots qui s'écartent : **20 rompus sur 20**. La
mécanique est saine, la mesure ne l'est pas — elle est notée ici pour être
refaite avec de vrais joueurs.

Les **tours** à 31 % et le **dénombrement** à 25 % sont dans la cible et sont les
deux seules mécaniques que des bots ratent vraiment : ce sont aussi les deux qui
demandent de se répartir, donc de se parler.

**Coût**, 600 s simulées par boss, quatre joueurs, combats enchaînés :

| boss | CPU / 600 s | bande passante / joueur | marqueurs moyens |
|---|---|---|---|
| Ravageur | 0,43 s | 9,4 Ko/s | 0,0 |
| Matriarche | 0,29 s | 8,5 Ko/s | 2,5 |
| Métronome | 0,36 s | 8,9 Ko/s | 1,3 |
| Oracle | 0,21 s | 6,7 Ko/s | 1,3 |
| Jumeaux | 0,27 s | 8,2 Ko/s | 0,0 |

Plafonds : 3 s de CPU et 160 Ko/s. Les marqueurs coûtent 11 nombres chacun et il
y en a moins de trois en moyenne — c'est le poste le moins cher du snapshot.

**Critères d'acceptation**, vérifiés par script plutôt que supposés :

- cinq boss sortent, **sans répétition avant épuisement** — deux cycles complets
  vérifiés ;
- **l'Oracle et les Jumeaux ne sortent jamais en solo** — 200 tirages solo, trois
  boss vus ;
- une mécanique ratée **ne tue jamais** un joueur à pleine vie, y compris avec
  trois cumuls de Vulnérabilité en cauchemar ;
- une **déconnexion** en pleine mécanique de groupe ne bloque rien : les
  marqueurs orphelins se suppriment, le combat continue ;
- une **cage détruite** rend immédiatement sa mobilité au prisonnier.

### Durée des combats de boss

**q1 49 s, médiane 70 s, q3 89 s** sur 58 combats. Référence de l'ancienne
courbe, mesurée en solo dans les mêmes conditions : 54 / 63 / 64 / 68 s.

La médiane dépasse légèrement l'ancienne fourchette et la dispersion est large.
Les deux s'expliquent par le chargement : le bot prend systématiquement la plus
haute rareté offerte, et une série défensive ne fait aucun dégât au boss là où
une série offensive le plie. Les PV du boss restent indexés sur la puissance
mesurée de l'équipe, donc la durée ne dérive **pas** d'un boss au suivant — ce
qui n'était pas vrai avant ce lot : `_playerPower` comptait les canons
supplémentaires sans la pénalité de dégâts qui les accompagne, et surestimait la
puissance de 44 % avec deux « Second canon ». Le boss recevait des PV pour des
dégâts qui n'existaient pas : 76 s au premier boss, 172 s au troisième.

### Raretés obtenues

La dérive de rareté a dû être **remesurée** avec le passage aux vagues. Elle
était indexée sur le nombre de boss, qui ne dépassait pas 2 ou 3 par manche :
l'exposant restait petit tout seul. Indexée sur la qualité de tirage, qui monte
jusqu'à 11, l'ancienne dérive (1,35 / 1,8) donnait **3,06 légendaires par manche
et 99 % des manches en voyant au moins une**, contre 0,67 et 53 % avant le lot.
Le système entier perdait sa pointe.

Deux leviers plutôt qu'un : la dérive a été adoucie (**1,18**) *et* plafonnée
(6 crans). Adoucir seul ne suffisait pas ; plafonner seul à 1 tuait le bonus de
qualité des vagues de boss, qui n'avait alors plus aucun effet. Ce sont les
**épiques** qui absorbent l'augmentation du nombre de cartes, et c'est voulu :
c'est le palier où deux joueurs de la même table cessent de jouer le même jeu.

#### Ce que la mesure par effectif a montré

Ce calibrage-là avait été fait **à un seul effectif**, et c'est ce qui a produit
le défaut constaté en jeu — trop de légendaires en solo. Remesuré à 1, 2, 3 et
4 joueurs séparément, **12 manches menées jusqu'à la vague 20** par effectif,
dégâts désactivés (la mesure porte sur le contenu des tirages, pas sur le niveau
du bot ; sans ce masque la moitié des manches s'arrêtaient au premier boss et
aucune n'atteignait le jalon de la vague 10) :

| effectif | niveau atteint | cartes / joueur | légendaires | max | épiques |
|---|---|---|---|---|---|
| **avant** 1 j. | 16,75 | 15,08 | 0,92 | **3** | 7,08 |
| avant 2 j. | 15,33 | 14,25 | 0,79 | 2 | 6,13 |
| avant 3 j. | 13,83 | 12,67 | 0,75 | **3** | 5,81 |
| avant 4 j. | 14,67 | 13,25 | 0,63 | 2 | 6,21 |
| **après** 1 j. | 16,50 | 15,50 | 1,17 | **2** | 7,33 |
| après 2 j. | 15,08 | 14,00 | 1,25 | **2** | 5,71 |
| après 3 j. | 13,67 | 12,50 | 1,36 | **2** | 5,25 |
| après 4 j. | 14,67 | 13,42 | 1,31 | **2** | 5,67 |

Trois choses s'y lisent :

- **Le cas dégénéré existait bel et bien** : trois légendaires chez un joueur, à
  1 et à 3 joueurs. C'est ce que le plafond dur supprime — jamais plus de deux,
  quel que soit l'effectif, quelle que soit la chance.
- **Le nombre de légendaires ne dépend plus de l'effectif** : 1,17 à 1,36 par
  joueur, soit 16 % d'écart entre le meilleur et le pire, contre une moyenne qui
  variait sans raison lisible avant. Ce n'est plus une loterie, c'est une
  récompense de progression : deux jalons, deux légendaires si la manche va loin.
- **L'écart d'épiques entre effectifs vient du niveau atteint, pas des poids.**
  Brut, il atteint 40 % (5,25 à 7,33) et manque la cible de 30 % ; ramené au
  nombre de cartes obtenues — la seule comparaison honnête, puisqu'un solo monte
  1,4 niveau de plus sur vingt vagues — il tombe à **15 %** (41 à 47 % des cartes
  d'un joueur sont épiques, quel que soit l'effectif). Ce qui reste à corriger,
  si on veut y revenir, est la normalisation de l'XP sur l'effectif, pas la table
  des raretés.

Le pool ne s'épuise plus : **31 à 55 cartes distinctes** proposées sur une
manche complète selon l'effectif, sur un pool commun passé de 56 à 64 cartes. Les répétitions (9 à 40 sur ~45 tirages de trois cartes) sont attendues et
voulues : une carte cumulable doit pouvoir ressortir tant qu'elle n'est pas
plafonnée.

### Retrait des bonus au sol

Quatre bonus sortis de la rotation et fréquence divisée par deux : la réserve
était qu'une équipe **sans soigneur** en souffre plus que les autres, le bonus
`heal` étant sa principale source de récupération. Cela aurait contredit la
décision du lot précédent — le soigneur accélère, il n'est jamais une condition
d'accès. Mesuré sur **25 manches par configuration et par effectif**, bots
normaux (les dégâts comptent, cette fois — c'est la survie qu'on mesure) :

| | durée moyenne avant | après | écart |
|---|---|---|---|
| **sans soigneur** | 233,4 s | 239,5 s | **+2,6 %** |
| **avec soigneur** | 327,8 s | 372,2 s | **+13,6 %** |

L'absence de soigneur n'est donc **pas** devenue plus punitive : les deux
compositions gagnent, et l'écart entre les deux écarts (11 points) reste sous la
barre des 20 % qui aurait imposé de relever le poids de `heal` sans soigneur. Le
mécanisme existe pourtant déjà pour `purification` — il n'a pas été branché sur
`heal`, parce qu'un second bonus dont le poids dépend de la composition ferait
de `hasHealer()` un réglage de difficulté, ce que le dépôt refuse par principe.

La **vague atteinte** bouge de moins d'une demi-vague (5,98 → 6,19 sans
soigneur, 7,13 → 7,62 avec), sous la cible d'une vague d'écart. Par effectif
isolé, la dispersion reste large (−17 % à +29 %) : c'est la variance d'une
manche de survie avec bots, pas un effet du retrait — d'où la lecture sur la
moyenne des quatre effectifs.

### La boucle de bonus (plan 23)

Les quatre bonus retirés ci-dessus (`damage`, `rate`, `double`, `pierce`) sont
**rendus à la rotation**. La fréquence, elle, ne revient pas : `POWERUP_MIN/MAX`
ne bouge pas du plan. Ce qui change est le **mix**, et c'est lui qu'il fallait
mesurer.

#### Ce que le retrait d'origine tenait vraiment

La rotation à sept types comptait **trois bonus de survie sur sept** — `heal`,
`shield`, `beacon`, soit **42,9 %** des chutes. À onze types et poids égaux ils
tombent à **29 %**, et la survie médiane passe de 1 044 à 708 s sur un relevé à
quatre manches. Le retrait n'économisait donc pas du code : il **concentrait les
chutes sur le soin**. Les poids de ces trois-là montent d'autant ; la part de
survie revient à **41,2 %**.

#### A/B, seize manches par bras

Les deux bras tournent dans le **même processus**, en ne changeant que
`POWERUP_ROTATION` : même code, mêmes graines, seul le tirage diffère.
`mesureSurvie(normal, 2 j., [rempart, tireur], PROFIL_ENGAGE, 16, 40 min)`.

| | moyenne | médiane | Q1 | Q3 | bonus d'arme actifs |
|---|---|---|---|---|---|
| rotation 11 | **906 s** | 692 s | 352 | 1 409 | **7,9 %** |
| rotation 7 (référence) | **876 s** | 710 s | 359 | 1 706 | 2,0 % |

**La survie ne bouge pas** (+3,4 % de moyenne, −2,5 % de médiane, pour un écart
interquartile de 1 000 s) et le temps passé avec un bonus d'arme actif est
**multiplié par quatre**. C'est exactement ce que le plan visait : de la variété,
pas de la puissance.

**Seize manches, et pas six.** À six, le même A/B a rendu successivement
708/1 044, 961/896 puis 1 055/367 : la médiane d'une manche de survie avec bots
oscille d'un facteur trois, et six tirages n'en disent rien. Le chiffre stable à
six manches est l'uptime, pas la durée.

#### La distribution

Normal, 2 joueurs, 3 × 30 min. Dénominateur : la **rotation seule** — `fragment`
et `purification` ont chacun leur propre source.

| type | part | | type | part |
|---|---|---|---|---|
| `heal` | 16,4 % | | `double` | 8,5 % |
| `shield` | 13,8 % | | `damage` | 8,2 % |
| `beacon` | 11,0 % | | `ricochet` | 6,6 % |
| `rate` | 9,1 % | | `turret` | 6,3 % |
| `pierce` | 9,1 % | | `nova` | 6,0 % |
| | | | `slow` | 5,0 % |

Part plate : 9,1 %. Aucun type hors de la bande **0,2× à 2×** sur les huit
couples (difficulté, effectif) — `verifierTirageBonus()`.

**L'échantillon doit pouvoir séparer le plancher de sa moitié.** À 66
apparitions, un type au plancher en vaut 1,2, et une manche cauchemar solo
sortait « ricochet 1,8 % » sur **un tirage** de plus ou de moins. Le critère
exige vingt apparitions par type ; à ce compte les huit couples sont muets.

#### La densité ne se normalise pas sur le plafond de population

Première écriture : `enemies.length / _enemyCap()`. Relevé, normal à deux
joueurs : **29 corps médians pour un plafond de 370**, donc une densité de 0,08
en permanence et une nova qui tombait **trois fois moins** qu'une part plate
(3,0 % contre 9,1 %). La référence est la foule **par joueur vivant**,
`CFG.POWERUP_FOULE = 28`, réglée pour que la médiane tombe à mi-échelle.

#### Le fragment bloquait le générateur

Il tombe de la carte « Récolte », sur un kill, donc par dizaines, et il comptait
dans `POWERUP_MAX_GROUND` : **55 à 64 %** des apparitions d'une manche cauchemar
à quatre joueurs. C'est la cause, jamais nommée, du relevé de 0.8.12 — « le sol
porte 1,1 à 2,9 bonus en permanence pour un `POWERUP_MAX_GROUND` de 2 ». Les
deux populations ont chacune leur plafond depuis.

#### La boucle, par mode et par effectif

`mesureSurvie(..., 4 manches, 40 min)`. « bloqué » = part du temps où l'échéance
du générateur est passée **et** le sol plein — c'est la mesure exacte du défaut
de 0.8.12, l'occupation moyenne ne suffisant pas : à quatre joueurs elle dépasse
le plafond parce que les **dépouilles d'élite ne le consultent pas**.

| | apparitions | ramassées | sol | générateur bloqué | bonus d'arme actifs |
|---|---|---|---|---|---|
| calme 2 j. | 6,1 /min | 27 % | 1,65 | 9 % | 7,5 % |
| normal 1 j. | 4,0 /min | 49 % | 1,02 | 1 % | 9,5 % |
| normal 2 j. | 5,6 /min | 32 % | 1,39 | 5 % | 9,9 % |
| normal 4 j. | 11,1 /min | 33 % | 2,04 | 24 % | 5,3 % |
| cauchemar 2 j. | 8,4 /min | 25 % | 1,51 | 8 % | 6,5 % |
| cauchemar 4 j. | 6,8 /min | 36 % | 1,80 | 21 % | 5,7 % |

Trois lectures :

- **Le générateur n'est plus bloqué** à un et deux joueurs (1 à 9 %), là où le
  relevé de 0.8.12 le décrivait bloqué la plupart du temps.
- **À quatre joueurs il l'est un cinquième du temps**, et c'est structurel : les
  élites ne consultent pas le plafond du sol, donc elles fournissent l'essentiel.
  Le plafond reste **par équipe** et non par joueur — un bonus est une ressource
  d'équipe, comme les points de récolte.
- **`pilotage()` ramasse un quart à la moitié de ce qui tombe** (poids 0,12 dans
  son champ de buts). Le chiffre sert à comparer deux bras, pas à décrire ce
  qu'un joueur ramasse.

#### Ce que la difficulté ne fait pas

`DIFFICULTIES` n'a **aucun** levier de bonus et n'en gagne pas : les écarts
ci-dessus viennent de la durée des manches et de la densité de horde, pas d'une
table. Même raison que `hasHealer()` pour `heal` — un poids qui dépendrait du
mode ferait du mode un robinet à récompenses.

### Motifs au sol

Bots remis à neuf après chaque image — la sanction de mécanique est calibrée en
part des PV **max**, gonfler la réserve ne protège donc de rien et les bots
tombaient au bout d'une minute. On mesure ainsi le combat entier et son pire cas
de zones, les dégâts encaissés étant comptés avant la remise à neuf.

**Zones simultanées et coût réseau**, un combat entier par ligne :

| boss | 1 j. | 2 j. | 4 j. |
|---|---|---|---|
| Ravageur | 15 | 20 | 13 |
| Matriarche | 7 | 13 | 8 |
| Métronome | 6 | 8 | 16 |
| Oracle | — | 2 | 4 |
| Jumeaux | — | 12 | 12 |

Pire cas mesuré : **20 zones simultanées**, moyenne de 1 à 4,5 selon le boss.
La cible du lot était « moins de 40 » : on est à la moitié, et le plafond de
rendu à 40 n'a jamais été atteint en jeu.

**Coût du snapshot.** Le pire cas réel n'est pas un combat de boss — son arrivée
balaie l'arène — mais une vague normale à arène pleine. Mesuré sur un état
synthétique (200 ennemis, 60 projectiles, un damier de 12 cases, 4 joueurs) :

| état | snapshot |
|---|---|
| sans le lot 5 | 6,4 ko |
| avec 25 flaques, arène resserrée et murs | 7,5 ko (**+16 %**) |

Sous la cible de +20 %. Deux choses y contribuent : `bn` et `wl` sont **absentes**
tant que l'arène ne bouge pas, et les **zéros de queue** des tuples de zone sont
coupés — un tuple en compte quinze et la plupart des formes n'en remplissent que
douze, ce qui économise trente-six nombres par damier et par instantané.

En combat réel de Matriarche maintenu à 150 s, le plafond de 25 mares n'est
jamais atteint : **11 zones simultanées** au pire, la horde ne tirant pas assez
vite. Le plafond reste en place — il protège du cas où la composition des
renforts changerait, et il coûte une boucle sur une liste déjà parcourue.

**CPU.** `_zoneHits` sur 40 zones (les six formes mélangées) × 4 joueurs :
**0,002 ms par tick**, contre **0,050 ms** pour l'évitement mutuel de 200
ennemis. Soit **4 %** du coût de l'évitement — négligeable, comme attendu.

**Écart entre lire les annonces et les ignorer**, la mesure de référence du dépôt
pour juger une mécanique. Dégâts subis sur 180 s à deux joueurs, **moyenne sur
huit combats** : sur un seul, le tirage d'attaques suffit à inverser le signe.

| boss | ignore | lit | écart |
|---|---|---|---|
| Ravageur | 1702 | 1175 | 31 % |
| Matriarche | 2139 | 1219 | 43 % |
| Métronome | 2245 | 1240 | 45 % |
| Oracle | 2703 | 2530 | 6 % |
| Jumeaux | 4042 | 3444 | 15 % |

Les trois premiers écarts sont sains. **Les deux derniers ne disent rien du lot**
et sont un artefact du bot : sa règle d'évitement est « fuir le centre de la zone
la plus proche », ce qui est exactement le mauvais geste pour un Pac-Man (où il
faut se **placer** dans un secteur) et ne traite ni le Regard, ni les tours, ni
la séparation des Jumeaux — c'est-à-dire l'essentiel des dégâts de ces deux
combats. À vérifier en jeu réel, pas en simulation.

### Ce qui n'a pas marché

**Donner plus de cartes ne rallonge pas la survie.** C'était le levier prévu
pour compenser la suppression des gains de niveau. Mesuré : à 22 cartes par
manche au lieu de 4, la survie ne bouge pas (77 à 128 s selon l'effectif, contre
95 à 134 s avec la courbe normale). Les morts viennent des **dégâts subis**, et
un joueur qui choisit ses cartes en prend majoritairement des offensives.

Réduire la pression des vagues ne marche pas davantage : −55 % sur les PV, le
débit et le budget ne change rien à la vague atteinte.

Ce qui manquait était ailleurs. La suppression des niveaux avait emporté avec
elle **+88 PV max** et **10 PV rendus par palier**, sans rien mettre à la place :
il ne restait plus aucune source de récupération entre deux vagues, sauf la mort
d'un boss — soit une fois toutes les cinq vagues. D'où le **soin de fin de
vague** (18 PV), qui ne figurait pas au plan du lot. Un répit qui ne rend rien
n'est pas un répit, c'est un compte à rebours.

Coût CPU d'un tick, arène pleine (200 ennemis), quatre joueurs :

| situation | moyenne | p99 | pire |
|---|---|---|---|
| sans aucune carte | 0,07 ms | 1,9 ms | 5,3 ms |
| toutes les cartes lourdes prises | 0,35 ms | 6,3 ms | 38 ms |

Le budget d'un tick est de 16,7 ms. Les cartes multiplient le coût par cinq et
il reste deux ordres de grandeur de marge : la crainte annoncée dans la
spécification — brûlure, vampirisme, ricochet et chaîne de foudre alourdissant
la boucle de collision au point de menacer le plafond de 200 ennemis — ne s'est
**pas** vérifiée. Les pics isolés à 38 ms sont des passages du ramasse-miettes,
et l'accumulateur du serveur les rattrape au tick suivant.

Effet du passage à une cadence fixe, deux joueurs simulés, moyenne sur huit
manches : survie de **182 s** contre 182 s pour l'ancienne courbe, même nombre
de boss atteints, **20 % de kills en moins**. Le réglage a demandé trois séries
de mesures — voir le commentaire de `FIRE_INTERVAL`, qui documente pourquoi la
valeur qui reproduisait le mieux l'ancienne pression (0,09) a justement été
écartée.

### Retour sensoriel

Mesures relevées avec un script jetable qui importe `public/audio.js` et
`public/events.js` tels quels, avec un faux `AudioContext` — les deux modules ne
dépendent ni du DOM ni du canvas, exactement pour ça.

| mesure | attendu | relevé |
|---|---|---|
| voix simultanées, 50 déclenchements dans la même image | plafonnées à 16 | **16** actives, 34 volées |
| même son 50 fois dans la même image | filtré par la recharge | **49 refusés**, 1 joué |
| une seconde à 18 déclenchements par image | pas de dérive | pic **16** voix, 8 volées, 1072 refusées |
| décalage son / image sur un impact | moins de 30 ms, jamais en avance | **+6,7 ms** (une image = 16,7 ms) |
| coût de la diffusion, 200 ennemis / 400 balles / 12 zones | négligeable | **0,015 ms** par snapshot |
| mise à jour de 300 particules | négligeable | **0,001 ms** par image |
| bandeau effacé avant la résolution | toujours | **250 ms** de marge au pire (Exaflare, la plus courte annonce du jeu) |

Le décalage de +6,7 ms est la seule mesure qui comptait vraiment : il est
**positif**, donc le son arrive après l'image et jamais avant. C'est la
conséquence directe du choix d'horloge — les événements se déduisent de deux
snapshots consécutifs mais ne sont livrés qu'au moment où l'horloge de rendu
franchit le second. À la réception, le même son serait tombé **110 ms trop tôt**.

Les 34 voix volées sur 50 déclenchements ne sont pas une perte : quand cinquante
choses se produisent dans la même image, les seize premières disent déjà tout, et
les trente-quatre autres n'auraient produit qu'un mur de bruit saturé.

**Les images par seconde se mesurent au navigateur**, pas en simulation : le
coût du rendu est celui du canvas, qui n'existe pas dans Node. Ouvrir
`http://localhost:8080/?perf` affiche images par seconde, nombre de fragments,
nombre d'ennemis, **chemin de rendu et appels de dessin**, et voix actives dans
le coin bas gauche. Le budget est large : les deux parts mesurables du lot —
diffusion et particules — consomment ensemble **0,016 ms** sur les 16,7 ms d'une
image.

### Refonte du catalogue (plan 11, lot 01)

**Le catalogue n'avait jamais été étendu au-delà de cinq axes.** 139 cartes, 21
dans une famille. Le relevé qui a tranché n'est pas une lecture : on applique
chaque `apply(m, 1)` sur des mods vierges et on diffe les clés touchées. **Un axe
est une clé de `mods`** ; deux cartes qui ne touchent QUE la même clé, sans
condition, sans classe et sans famille, sont le même effet écrit deux fois. Ce
relevé a trouvé un septième axe en doublon que la table du plan ne listait pas,
`areaMul` (Expansion / Déflagration / Singularité) — d'où **sept** familles
neuves et non six.

**Forme du pool.** Avant : 28 communes, 48 rares, 44 épiques, 18 légendaires.
Après : **44 / 49 / 28 / 23**, soit **1,57 commune par épique** (le critère était
1,5). Dix-neuf épiques qui n'ajustaient qu'un nombre passent rares, dix-neuf
rares passent communes. Deux d'entre elles ont dû revenir en arrière :
`nasse` exige `filins` **ou** `etau`, et un prérequis commun n'est plus un filtre
— c'est `verifierCartes()` qui l'a signalé, pas une relecture.

**Ce que la refonte déplace, mesuré.** 36 manches semées (12 graines × 3 classes),
solo, normal, jusqu'à la minute 26, tirages de cartes au hasard, même harnais des
deux côtés. On relève `_playerPower()` en fin de manche :

| | avant | après |
|---|---|---|
| niveau médian atteint | 24 | **30** |
| p10 | 1,09 | **1,61** |
| médiane | 3,07 | **3,54** |
| p75 | 4,42 | **6,58** |
| p90 | 7,65 | 8,93 |
| maximum | 12,37 | 10,61 |

**Le pool réformé monte le plancher et rabote la pointe.** C'est exactement ce
qu'un rééquilibrage vers les communes doit faire : moins de manches où le tirage
ne donne rien, moins de manches où il donne tout. Les repères de `POWER_MARKS`
(`ui/build.js`) suivent : « forte » 4,10 → **6,50**, « max » 5,71 → **9,00**,
échelle 6,5 → **10,5**. Le repère « nu » est remesuré **inchangé** à 1,26 — c'est
le Tireur ; le Rempart est à 0,84 et le Soigneur à 0,89.

**Les invocations décrochaient, et pas pour la raison écrite dans le plan.** Elles
lisaient bien `damageMul` — ce qu'elles ne lisaient pas, c'est tout le reste :
cadence, dégâts bruts, critique. Un relevé le montre sans ambiguïté : sur une
build à `ballesLourdes` (beaucoup de dégâts, peu de cadence), l'ancien
multiplicateur de lame atteignait **×4,46 pour un indice de puissance de 2,07** ;
sur une build à cadence, **×2,46 pour un indice de 7,90**. Le multiplicateur ne
suivait pas la puissance, il suivait une de ses composantes.

`_summonMul(p)` lit donc `powerIndex` entier, à exposant `SUMMON_SCALE` = **0,6**.
Mesure du critère (« une lame prise à la minute 5 fait encore plus de 15 % des
dégâts à la minute 25 ») : 10 graines, tout le hasard semé, **bot au contact** —
le pilote recule et le bot des lots A-H tient 260 px, or une lame porte à 3,7 m,
donc ni l'un ni l'autre ne la laisse toucher quoi que ce soit. Un critère de
portée de contact se mesure au contact.

| | moyenne | médiane | minimum | au-dessus de 15 % |
|---|---|---|---|---|
| part des lames après la minute 25 | **40,0 %** | 52,2 % | 7,6 % | **9 / 10** |

Le critère est tenu sur neuf graines sur dix. La dixième est une build dont le
tir principal explose (indice 3,99 pour un multiplicateur de lame de 2,23) : la
lame ne décroche pas, c'est le tir qui la dépasse — ce qui est le comportement
voulu, l'exposant 0,6 étant précisément là pour qu'une invocation suive sans
dominer.

### Étalonnage des hauts faits (plan 11, lot 03)

**Les seuils du plan étaient des paris, et la plupart étaient faux.** Ils avaient
été posés sans mesure. Relevé : **40 joueurs-manches** en normal, pilote, à un et
à quatre joueurs, jusqu'à la minute 30, tirages de cartes au hasard.

| compteur | médiane | min | max | seuil du plan | seuil retenu |
|---|---:|---:|---:|---:|---:|
| kills par manche | 1 958 | 662 | 7 980 | — | — |
| kills à moins de 6 m | 360 | 38 | 1 348 | 600 | **1 500** |
| kills à plus de 35 m | 69 | 7 | 482 | 400 | **250** |
| kills par explosion (Tireur) | 823 | 667 | 962 | 1 000 | **2 500** |
| tirs pour 100 kills | 118 | 5 | 1 645 | < 200 | **< 90** |
| meilleurs kills / 30 s | 155 | 35 | 370 | 100 | **200** |
| meilleurs critiques / 60 s | 87 | 14 | 1 160 | 50 | **115** |
| secondes sous 25 % de PV | 36 | 0 | 521 | 90 | **60** |
| sain d'affilée à partir du segment 4 | 71 s | 0 | 190 | 120 | **120** |
| kills d'un même tir | 3 | 1 | 39 | 5 | **5** |
| cartes possédées | 29 | 8 | 29 | 20 | **20** |

**Un seuil « en une manche » vise 1,3 fois la médiane** — sous quoi c'est une
formalité, au-delà de deux fois c'est du grattage. Un **cumul** ne se lit pas en
valeur absolue mais en **nombre de manches** : « 1 500 kills au contact » vaut
quatre manches, « 250 à longue portée » en vaut 3,6.

**Trois seuils étaient déjà atteints par la médiane**, donc ne testaient rien :
100 kills en 30 s (médiane 155), 50 critiques en 60 s (médiane 87), et surtout
« moins de 200 tirs pour 100 kills » quand la médiane est à 118. Ce dernier est
celui qui devait enseigner le fusil de siège ; à 200 il récompensait le tir de
base.

**Deux mesures ont dû être refaites, et le harnais n'était en cause que pour
une.**

- *« Secondes sous 25 % de PV »* rendait **0 partout** : le harnais remettait les
  PV au maximum à chaque image pour que la manche aille au bout, donc le compteur
  ne pouvait structurellement pas monter. Refait en **relevant** le joueur à
  terre sans le soigner : médiane 36 s.
- *« Kills par explosion »* rendait **0 partout aussi**, et là c'était le jeu : la
  bombe du Tireur résout son souffle **elle-même**, sans passer par `_explode`,
  donc le drapeau de cause ne la voyait pas. Deux points de passage, pas un —
  corrigé, la médiane passe de 0 à **823 par manche**.

**Une mesure reste polluée par le pilote, et son seuil est conservé tel quel :**
« 90 s cumulées sans se déplacer » (*Sur le terrain*). Le pilote rend une entrée
nulle dès qu'il n'a pas de but, donc il mesure **848 s** d'immobilité sur une
manche de 1 800 s. Un humain de survivor ne s'arrête jamais aussi longtemps. Un
taux d'utilisation est la mesure du pilote, pas du jeu.

**Rythme de déblocage, mesuré :** six manches d'affilée avec le pilote, une
classe et une difficulté différentes à chaque fois, donnent **19 hauts faits sur
36** — dont tout ce qui se gagne en jouant, et trois cadres (*Dépouillé*,
*Foudroyant*, *Insomniaque*). Les dix-sept qui restent demandent soit un cumul,
soit un défi que le pilote ne sait pas viser.

**Non-régression de la migration, 209 profils v6 :** on rejoue les tables de la
v6 pour savoir ce que chaque profil avait ouvert, on migre, on revérifie.
**2 371 déblocages testés, zéro perdu.**

### Contribution réelle des classes (plan 29, lot 02)

**Les traces ne pouvaient pas répondre, et c'était la première étape du
chantier.** `traces/` contient **deux** manches, toutes deux **solo**, en
**v0.11.5** — vingt versions avant la mesure. Champs par joueur : `degats`,
`soins`, `kills`, `morts`, `puissance`. Aucune composition, aucun dégât évité,
aucun dégât détourné, aucun dégât rendu possible. L'agrégation de traces est donc
écartée par la donnée elle-même, pas par préférence : la mesure est un **banc de
simulation**.

**Quatre grandeurs indirectes, écrites aux points de passage existants**
(`_hurt`, `_heal`, `_damage`) : `evites` (ma réduction), `proteges` (mon aura sur
un allié, attribué au **porteur**), `detournes` (ce que j'encaisse pendant ma
provocation), `permis` (les dégâts qu'un allié délivre grâce à ma catalyse).

**Le profil du banc est COMPLET, et ce n'est pas un détail.** Premier passage au
profil neuf : `proteges` et `permis` sortent à **0 partout** — `guardAura` et
`catalyse` sont des lignes de méta. Le banc mesurait « ce qu'un compte neuf n'a
pas encore », pas « ce que le rôle apporte.

#### Le relevé — normal, pilote, **mortel**, profil complet, 3 graines, 30 min

| composition | survie | niv | rôle | dgt/min | évités | protégés | détournés | soignés | permis | relev |
|---|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|
| solo tireur | 5,5 m | 9 | Tireur | 8 784 | 0 | 0 | 0 | 0 | 0 | 0 |
| solo rempart | **11,1 m** | 11 | Rempart | 2 682 | 21 | 0 | 14 | 0 | 0 | 0 |
| solo soigneur | **10,3 m** | 13 | Soigneur | 3 726 | 0 | 0 | 0 | 18 | 0 | 0 |
| duo 2 tireurs | 7,6 m | 13 | Tireur | 24 603 | 1 | 0 | 0 | 0 | 0 | 1,3 |
| duo rempart+tireur | 9,9 m | 16 | Rempart | 2 478 | 15 | 8 | 18 | 0 | 0 | 2,3 |
| duo soigneur+tireur | 10,2 m | 15 | Soigneur | 2 702 | 0 | 0 | 0 | 125 | **82** | 0,3 |
| duo rempart+soigneur | **14,4 m** | 16 | Rempart | 13 940 | 24 | 19 | 28 | 0 | 0 | 4,0 |
| trio 3 tireurs | 7,5 m | 13 | Tireur | 36 875 | 8 | 0 | 0 | 0 | 0 | 4,3 |
| trio 1/1/1 | **22,1 m** | 21 | Soigneur | 3 037 | 0 | 0 | 0 | 775 | **1 864** | 0,3 |
| quatuor 4 tireurs | 5,5 m | 9 | Tireur | 26 747 | 4 | 0 | 0 | 0 | 0 | 0 |
| quatuor 1/1/2 | **23,9 m** | 26 | Soigneur | 5 003 | 0 | 0 | 0 | 847 | **3 187** | 3,3 |

**La question du brief a sa réponse chiffrée.** En trio 1/1/1, le Soigneur
délivre 3 037 dégâts/min et en **rend possibles 1 864** — soit 61 % de son propre
débit, en plus de 775 PV/min soignés. Comparer son dps à celui du Tireur (38 552)
ne mesurait donc rien : il manquait les deux tiers de sa contribution.

#### Viabilité : le mono-Tireur est dominé à TOUS les effectifs, et l'écart croît

| effectif | pire | meilleur | écart |
|---|---|---|---:|
| 1 | 5,5 m (tireur) | 11,1 m (rempart) | **×2,01** |
| 2 | 7,6 m (2 tireurs) | 14,4 m (rempart+soigneur) | **×1,89** |
| 3 | 7,5 m (3 tireurs) | 22,1 m (1/1/1) | **×2,94** |
| 4 | 5,5 m (4 tireurs) | 23,9 m (1/1/2) | **×4,32** |

**Quatre tireurs survivent exactement aussi longtemps qu'un seul** (5,5 min) :
ajouter des tireurs n'ajoute rien à la survie pendant que la horde suit
`joueurs^0,75`. Le critère §4 de `verifierClasses` — « 1/1/2 doit aller au moins
aussi loin que quatre tireurs, sinon le système de classes est décoratif » — est
tenu avec **4,3× de marge** ; c'est le risque **inverse** qui est ouvert.

`verifierContribution` (`COMPO_VIABLE = 0,5`) remonte donc le trio et le quatuor
mono-Tireur : à 34 % et 23 % du meilleur, ces compositions ne sont plus un choix.
**Le levier n'est pas dans ce lot** — la horde suit l'effectif, c'est le sujet du
chantier 03 ; ce lot livre la mesure qui permettra d'en juger le résultat.


### Les emplacements qui n'arbitraient plus (plan 29, lot 03)

**Le système était dimensionné pour se désactiver lui-même.** `TREES` porte
**six** lignes par classe et `SLOTS_MAX` valait **six** : 3 sur 6 en début de
compte (vrai arbitrage), 6 sur 6 en fin (aucun). Les trois jalons menaient donc à
la **disparition** du choix, pas à son élargissement. `SLOTS_MAX = 4`.

#### `gainMeta` ne voit pas ce lot, et c'est le résultat à retenir

| emplacements | tank puissance / PV | soigneur | tireur |
|---|---|---|---|
| 6 | ×1,000 / ×1,453 | ×1,000 / ×1,350 | ×1,344 / ×1,153 |
| 5 | ×1,000 / ×1,453 | ×1,000 / ×1,350 | ×1,344 / ×1,153 |
| **4** | ×1,000 / ×1,453 | ×1,000 / ×1,350 | ×1,344 / ×1,153 |
| 3 | ×1,000 / ×1,453 | ×1,000 / ×1,350 | ×1,344 / ×1,153 |

**Strictement insensible de 3 à 6.** La cause : `powerIndex` et `maxHp` réunis
sont **aveugles à 13 des 18 lignes de classe**.

| classe | lignes invisibles aux deux instruments |
|---|---|
| tank | `alliage`, `ancrage`, `defi`, `epines`, `garde` — 5 sur 6 |
| soigneur | `flux`, `portee`, `releve`, `osmose`, `catalyse` — 5 sur 6 |
| tireur | `munitions`, `charge`, `surchauffe` — 3 sur 6 |

Réduction de dégâts subis, recharges, épines, aura, soins prodigués, vitesse de
réanimation, rayon de lien : aucun n'entre dans l'indice de puissance ni dans les
PV. **`verifierMeta` qui reste vert n'est donc pas une preuve que ce lot est sans
effet** — il maximise un seul axe, et cet axe sature en trois lignes.

#### L'instrument qui voit, c'est le banc de contribution du lot précédent

Quatuor 1/1/2, normal, pilote, mortel, profil complet, 3 graines, 30 min :

| emplacements | survie | niv | Rempart `protégés` | Soigneur `permis` |
|---|---:|---:|---:|---:|
| 6 | 30,0 m *(plafond de fenêtre)* | 26 | 57 | 1 674 |
| **4** | **19,2 m** | 18 | 42 | 448 |

**Solo tireur : 14,1 m → 14,0 m, inchangé.** Ses quatre premières lignes portent
déjà toute sa puissance ; les deux qu'il perd (`charge`, `surchauffe`) ne touchent
pas son débit. **La borne mord sur le jeu d'équipe et sur les rôles de soutien,
pas sur le tireur solo** — exactement là où le lot précédent avait mesuré que la
contribution se joue.

#### Un défaut créé par ce lot, trouvé par sa propre mesure

Premier passage à 4 emplacements : quatuor 1/1/2 à **15,5 min**, `protégés` = **0**
et `permis` = **0**. Ce n'était pas le jeu, c'était le banc.
`metaProfil` prenait `TREES[cls].slice(0, emplacements)` — sans conséquence tant
que le maximum valait six pour six lignes, puisqu'il prenait **tout**. À quatre,
l'ordre de la table **devient un choix**, et il met `garde` et `catalyse` en
sixième position : le profil de mesure jetait mécaniquement les deux seules lignes
qui produisent ces grandeurs, et jouait donc la pire build possible.

`LIGNES_MESURE` rend l'ordre **explicite**, rôle en tête. Après correction :
19,2 min, `protégés` 42, `permis` 448. **+3,7 min et les deux grandeurs
restaurées** — l'artefact était réel, et il aurait silencieusement corrompu toute
mesure de classe à venir.

#### Le budget de doctrine

Huit items hors classe, **13 points** au total pour un budget de **6**.

| item | poids | pourquoi |
|---|---:|---|
| `sursis` T5 | **3** | relèvement automatique — le seul palier dont le dépôt écrit qu'il « change l'issue d'une manche » |
| `sursis` T1-T4 | 2 | régénération seule |
| `carcasse` | 2 | +15 % PV max à T5 |
| `quatrieme` | 2 | +33 % d'options par tirage : agit sur toute la construction |
| `relance` | 2 | même famille — qualité moyenne du build |
| `foulee` | 1 | +7,5 % de vitesse à T5 |
| `glanage` | 1 | +70 px de ramassage |
| `ravitaillement` | 1 | un bonus au sol, effet borné |
| `relance2` | **1** | rendement décroissant : 900 noyaux achètent **moins** que les 250 de la première |

**Le poids suit l'effet, pas le prix**, et un seul dépend du palier. Payer le T5
de `sursis` peut faire déborder un budget qui tenait : `rangerDoctrine` normalise
la liste stockée **à l'achat**, sinon l'écran afficherait un item équipé que le
serveur n'applique pas.

#### Migration v8 → v9, vérifiée

- Avant migration, `metaLinesFor` n'applique déjà que **4** lignes sur les 6
  stockées : la borne est à la **lecture**, un compte non migré ne passe pas entre
  les mailles.
- Après : listes rangées, `communOff` absorbé (une ligne coupée ne revient pas
  équipée), **aucun palier, aucun achat, aucune commune perdus**, `avisMeta` armé.
- Bout en bout sur socket réelle : équiper six lignes est refusé **en entier**,
  une doctrine à exactement 6 points passe, un message forgé sur les huit items
  est refusé, et le budget tient même quand un poids **monte** avec le palier.


### Ligne de vue et équilibre des armes (plan 29, lot 04)

#### 2c · Le périmètre, mesuré et non supposé

Banc : joueur en (1000, 1000), mur plein de 60 × 600 px en x = 1200, mannequin
issu du **vrai spawner** en (1400, 1000), 120 pas. On mesure `p.hf.armeDegats` —
ce que l'**arme** délivre, pas ce que le corps perd.

| arme | tir | sans mur | avec mur (avant) | avec mur (après) |
|---|---|---:|---:|---:|
| standard | balle | 144 | 0 | 0 |
| assaut | balle | 78 | 0 | 0 |
| **laser** | **faisceau** | 181 | **181** | **0** |
| **tesla** | **arc** | 110 | **110** | **0** |
| lame | arc_sol | 0 | 0 | 0 |
| dispersion | balle | 80 | 0 | 0 |
| railgun | balle | 216 | 0 | 0 |
| grenade | grenade | 120 | 0 | 0 |
| siège | balle | 130 | 0 | 0 |
| précision | balle | 103 | 0 | 0 |

**Le périmètre se referme exactement sur deux armes** — les deux seules à ne pas
lancer de projectile physique. Précision (portée 2,2) et railgun (1,8) étaient
déjà arrêtés malgré leurs portées.

#### 2a · Ce que la ligne de vue a coûté, à graines appariées, 6 × 15 min

| arme | Dh avant | Dh après | écart | V avant | V après | cible |
|---|---:|---:|---:|---:|---:|---:|
| **laser** | 71,4 | 65,1 | **−9 %** | **1,218** | **1,132** | 1,06 |
| tesla | 53,7 | 53,8 | +0 % | 0,997 | 0,998 | 1,02 |
| les huit autres | — | — | **+0 %** | identiques à 3 décimales | | |

**Le laser perd plus de la moitié de son dépassement** : +0,158 → +0,072. C'était
le levier que §2a cherchait — sa perforation native infinie et gratuite —, et il
se borne **sans toucher un seul coefficient**. Il reste au-dessus de sa cible.

Le tesla est à **0,998 net** parce que sa dette a été payée dans le même lot.

#### La dette du tesla, payée sur un levier mesuré

Borner l'arc lui coûte 0,16 de V. Le **saut** est le seul levier **horde pure** :
contre une cible unique l'arc n'a nulle part où sauter, et `Db` reste à **74 pour
toutes les valeurs essayées** — là où la portée le fait monter à 89, ce qui la
disqualifie (elle rendrait deux fois).

| `TESLA_SAUT` | Dh | Db | cibles/s | V | écart à 1,02 |
|---|---:|---:|---:|---:|---:|
| 220 | 43,7 | 74 | 2,67 | 0,858 | −0,162 |
| 300 | 49,4 | 74 | 2,99 | 0,938 | −0,082 |
| 340 | 50,0 | 74 | 3,06 | 0,946 | −0,074 |
| **380** | 53,8 | 74 | 3,29 | **0,998** | **−0,022** |

**Le protocole se choisit avant la valeur.** À 3 graines × 10 min la même
courbe était **non monotone** (380 meilleur que 460, accroche 60 meilleure que
80) : c'était du bruit. À 6 × 15 elle est monotone. Et les deux protocoles ne
donnent pas la même liste rouge — railgun et grenade sont hors tolérance à 3 × 10
et dedans à 6 × 15, la lame l'inverse. **Le défaut de `verifierEquilibreArmes(3,
10)` n'est pas ce qu'il mesure, c'est combien.**

#### Le banc d'armes est aveugle aux coefficients d'échelle

`mesureArmes` ne gère ni `cardsPending` ni `takeCard` : **le joueur du banc n'a
aucune carte** (vérifié : `p.cards.size === 0` après 50 s). Or
`appliquerEchelle` met à l'échelle ce que les **cartes** donnent à `mods`.

| `ech.degats` du laser | Dh | V |
|---|---:|---:|
| 0,0 | 38,00 | 0,9711 |
| 1,2 *(valeur du dépôt)* | 38,00 | 0,9711 |
| 5,0 | 38,00 | 0,9711 |

**Identiques à quatre décimales.** Les sept coefficients d'`ech` sont
structurellement inertes dans ce banc, donc `verifierEquilibreArmes` **ne peut
pas** détecter un déséquilibre d'échelle — et le levier que §2a désignait en
premier pour le laser (`ech.degats = 1,2` qui amplifie les cartes génériques) est
**inévaluable en l'état**.

La largeur du faisceau, levier historique du laser en 0.15.5, est elle aussi
inerte aujourd'hui : 22 → 20 → 18 → 16 px donne V 1,132 · 1,131 · 1,157 · 1,158,
et `cibles/s` **monte** en rétrécissant. À la densité de horde actuelle le
faisceau couvre déjà tout ce qui est dans son axe.

**Le laser reste donc à +0,072, et son levier restant n'est pas identifié.** Le
rendre mesurable demande que le banc prenne des cartes — ce qui déplacerait
toutes les valeurs de V déjà enregistrées. C'est un chantier de mesure, pas un
réglage.


### La horde, le boss et la reprise (plan 29, lot 05)

#### Les prémisses, reproduites sur base propre

`sim/pop5.mjs`, solo normal, plafond 220, fenêtre 45 s :

| minute | 1 | 5 | 10 | 15 | 20 | 25 | 30 |
|---|---|---|---|---|---|---|---|
| sans tir | 28 | 44 | 63 | 69 | 94 | 107 | 107 |
| avec tir | 25 | 44 | 63 | 69 | 93 | 107 | 107 |
| part retirée par les armes | 10 % | **0 %** | **0 %** | **0 %** | 1 % | **0 %** | **0 %** |

Et le plafond de boss vaut **19 % du plafond de horde à tous les effectifs**
(42/220 solo, 71/370 à deux, 119/622 à quatre). M2 et M3 confirmés.

#### C1 — ajouter de la horde pendant un boss se retourne contre son objectif

Banc : vraie manche, 30 min, bots immortels, 3 graines **appariées**, population
relevée séparément pendant et hors boss.

| dose (taux / plafond) | j | hors boss | % cap | pendant boss | % cap | part du temps en boss |
|---|---:|---:|---:|---:|---:|---:|
| **témoin** 0 / 42 | 1 | **81** | 37 % | 2 | 1 % | **17 %** |
| 0,20 / 60 | 1 | 48 | 22 % | 9 | 4 % | 35 % |
| 0,35 / 80 | 1 | 40 | 18 % | 39 | 18 % | 51 % |
| 0,50 / 100 | 1 | 55 | 25 % | 62 | 28 % | **67 %** |
| témoin 0 / 42 | 4 | 53 | 9 % | 3 | 0 % | 19 % |
| 0,50 / 100 | 4 | 32 | 5 % | 19 | 3 % | 54 % |

**Le mécanisme est direct** : le tir se disperse, le boss meurt plus lentement, la
part du temps passée en boss monte — donc l'exposition **totale** à la horde
**baisse**. À toutes les doses, `hors boss` chute. Le levier que le chantier
proposait en P0 est **réfuté par sa propre mesure**, et le risque de second ordre
qu'il demandait d'évaluer avant n'était pas celui qu'il annonçait : ce n'est pas
le Rempart qui devient fort, c'est le **rythme** qui casse.

**C1 n'est donc pas livré.** Le plafond de boss reste à 42, le spawner reste coupé
pendant un combat.

#### C2 — la reprise, elle, tient

Un boss laisse la horde à zéro en partant et elle met **158 s** (solo) à retrouver
la moitié du plafond. Sur cinq boss, c'est la moitié de la manche passée à remonter.

| reprise | j | hors boss | % cap | part boss | reprise à 50 % |
|---|---:|---:|---:|---:|---:|
| témoin (aucune) | 1 | 86 | 39 % | 34 % | **148 s** |
| 45 s × 2 | 1 | 80 | 36 % | 28 % | 124 s |
| **45 s × 3** | 1 | **120** | **54 %** | 33 % | **25 s** |
| 60 s × 4 | 1 | 111 | 50 % | 15 % | 17 s |
| témoin | 4 | 45 | 7 % | 17 % | **jamais** |
| 45 s × 2 | 4 | 63 | 10 % | 17 % | 179 s |
| **45 s × 3** | 4 | 62 | 10 % | 19 % | **31 s** |

**Retenu : 45 s × 3.** En solo les **deux** critères d'acceptation du chantier sont
tenus — population hors boss à 54 % du plafond (seuil 50 %) et chute résorbée en
25 s (seuil 60 s). Et la part du temps passée en boss ne bouge pas (33 % contre
34 %) : on ne touche pas au combat.

**À quatre joueurs, seul le critère de reprise est tenu** (« jamais » → 31 s). La
population reste à 10 % du plafond, et elle y est **déjà hors boss chez le témoin**
(7 %) : le plafond suit `joueurs^0,75` mais la vitesse de nettoyage d'une équipe
monte plus vite. C'est une question de **taux nominal par effectif**, pas de
reprise — hors du périmètre de ce lot, et le chantier interdit d'y toucher sans
preuve. La preuve existe maintenant.

#### La garantie d'abri : mesurée, et l'alarme était à l'envers

Le chantier demande de vérifier `verifierMecaniques` avant et après, « et pas
seulement le confort visuel ». À **deux** manches, le compteur d'abri sous le feu
a rendu 1, puis 2, puis 3, puis 12, puis 18 images selon les passages — **sans
suivre la dose**, et 3 images pour la configuration *sans* rampe qui en avait
rendu 1 au passage précédent. C'est un **compte**, pas un taux : il grandit avec
le nombre de manches, donc il ne se compare qu'à échantillonnage égal, et deux
manches n'en donnent pas assez.

À **six** manches sur l'effectif qui le fait rougir :

| état | abri sous le feu, 4 joueurs |
|---|---:|
| aucune reprise *(dépôt)* | **39 images** |
| 45 s × 3 | **18 images** |

**La rampe améliore la garantie au lieu de la dégrader.** L'alarme lue à deux
manches (3 → 12) pointait dans le sens exactement inverse du résultat.


#### Le piège payé : une mesure de population non appariée ne mesure rien

La graine de `GameState` ne sème que le **biome**. Les tirages de cartes, les
types d'ennemi et la cadence d'élite passent par `Math.random`, global et **non
semé**. Deux campagnes du **même code** ont rendu **28 %** puis **50 %** de temps
passé en boss — et la première version de ce lot en avait conclu que C1 faisait
passer la part de boss de 28 à 78 %. Après avoir semé `Math.random` dans le banc,
le vrai chiffre est 17 % → 67 %. La conclusion tient, le chiffre était faux.


### Le script : 25 battements muets sur 30 (plan 29, lot 06)

#### Les trois prémisses, vérifiées

| constat | mesure |
|---|---|
| 5 événements sur 30 battements | confirmé, **identique dans les trois scripts** |
| une géométrie déclarée jamais tirée | `anneau` — absente des **trois** scripts, et pourtant **implémentée** (`_ringPoint`) |
| six segments de même forme | confirmé : montée monotone, seuls les segments 3 et 5 ont un creux |

Et une prémisse à écarter : `TL_CFG.QUARRY_*` **est** utilisé — `_spawnQuarry`
est appelé par l'événement Chasse. Le « gibier » n'était pas un concept mort.

#### Ce qui change

| | avant | après |
|---|---:|---:|
| événements | 5 / 30 | **11 / 30** |
| types d'événement | 4, dont un servi 2 fois | **6**, aucun servi plus de 2 fois |
| `anneau` tirée | **0 fois** | 4 fois |
| formes de segment distinctes | 2 sur 6 | **6 sur 6** |
| segments qui perdent 2 battements en solo | **2** (5 et 6) | 0 |

Les deux nouveaux types sont des **données pures** — un tableau de types, un
multiplicateur, une annonce : Essaim (harceleurs, ×2,2) et Chaîne de relais
(relais + générateur, ×0,8). Rien n'est écrit dans la simulation.

#### La somme ne bouge pas, la pression effective monte

Sommes de base par segment, conservées au dixième :
**6,0 · 10,0 · 12,6 · 14,7 · 17,9 · 20,7**. On redistribue *dans* le segment.

**Mais un événement multiplie le taux**, de ×0,38 (siège) à ×2,6 (nuée) : une
somme conservée ne conserve donc pas la pression. Un premier jet, sommes égales
et types répartis « pour la variété », donnait :

| segment | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---:|---:|---:|---:|---:|---:|
| pression effective | 7,4 | 12,4 | 10,8 | **21,4** | **13,4** | 18,2 |

Le segment 4 plus intense que le 5, et l'apogée du 6 **en dessous** du 4 : la
manche redescendait deux fois. Après placement des gros multiplicateurs en fin de
script :

| segment | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---:|---:|---:|---:|---:|---:|
| pression effective | 5,3 | 8,6 | 12,0 | 17,6 | 18,4 | **32,5** |

Monotone. `verifierScript` refuse désormais une pression qui retombe.

#### Effet mesuré sur la densité — solo normal, plafond 220, fenêtre 45 s

| minute | 1 | 5 | 10 | 15 | 20 | 25 | 30 |
|---|---:|---:|---:|---:|---:|---:|---:|
| avant | 25 | 44 | 63 | 69 | 93 | 107 | 107 |
| **après** | 26 | **49** | **66** | **81** | **100** | 107 | 107 |
| gain | — | +11 % | +5 % | **+17 %** | +8 % | 0 | 0 |

La mi-manche gagne jusqu'à 17 % de densité **sans que la somme des taux
change** : le gain vient du placement des multiplicateurs. Le plateau de fin
(107 en fenêtre de 45 s) ne bouge pas — c'est le temps de fenêtre qui le borne,
pas le script.

#### Les critères d'acceptation, tous tenus par `verifierScript`

Il ne vérifiait que la **pose** d'un événement (type connu, pas sur un crescendo,
pas deux d'affilée). Il vérifie maintenant aussi ce qui faisait qu'un script
formellement correct pouvait rester pauvre : aucun type plus de deux fois, aucune
géométrie déclarée absente, deux segments consécutifs de formes différentes,
aucun segment qui perde plus d'un battement en solo, et la pression effective
croissante. **Vert sur les trois scripts.**


### L'instrument mentait sur trois points (plan 30, lot 01)

Le plan 29 s'est terminé sur trois vérificateurs rouges. Avant de régler quoi que
ce soit, il fallait constater que **la mesure elle-même était fausse** à trois
endroits — et deux de ces défauts empêchaient purement et simplement le réglage.

| défaut | conséquence |
|---|---|
| `LEVEL_MARKS` demandait la **minute 32** | la horde dure exactement 30 min (6 × 300 s) : la marque ne se mesurait jamais, et le plafond `LEVEL_MAX` se lisait comme un dépassement |
| `verifierBoss` comptait le **non-mesuré** comme rouge | sept problèmes affichés là où il y en a cinq |
| `WAVE_CROWD_EXP` portait **six grandeurs + le partage d'XP** | un budget de pression et un partage de récompense sous une constante : ni l'un ni l'autre n'était réglable |

Le troisième explique le rouge de `verifierProgression` : quand le lot 5 du plan
29 a densifié la mi-manche de 17 %, l'XP a suivi la densité **sans que le partage
par effectif puisse s'ajuster**. D'où une courbe qui diverge selon qu'on joue à un
ou à quatre. `XP_CROWD_EXP` est posée à la valeur identique (0,75) : le levier
existe, aucun comportement ne change, le réglage vient ensuite.

#### Deux pièges de méthode payés sur ce lot

**La mesure à 3 manches n'est pas monotone.** `LEVEL_XP_GROWTH` à 1,12 rend un
niveau *plus haut* qu'à 1,10 à quatre joueurs, et l'écart-type atteint 4,2 cartes.
Le système a une rétroaction — niveaux → cartes → kills → XP — et la variance du
script domine. Régler là-dessus aurait été régler sur du bruit.

La sortie n'est pas « plus de manches » mais le **découplage** : on mesure l'XP
**brute** cumulée par minute de horde (une campagne par effectif), puis on résout
la courbe analytiquement. Le revenu ne dépend pas du coût des niveaux, donc une
seule campagne teste tous les couples — et le résultat redevient monotone. Valide
en milieu et fin de manche, là où sont les écarts : à saturation le revenu est
piloté par le **spawn** et non par le DPS (mesure M2 du plan 29).

Relevé brut, 6 manches, normal : solo `8=5 698 `20=51 868 `30=299 883 ;
quatre joueurs `8=29 791 `20=244 998.

**Un `&` de shell tue le job avec son shell.** Une campagne lancée en arrière-plan
de cette façon n'a rien produit du tout ; il faut le mode tâche de fond de l'outil.

### La suite de vérification (plan 29, lot 11)

#### Le défaut qu'aucun vérificateur ne pouvait attraper

**Trente-trois vérificateurs vivaient dans neuf modules et rien ne les lançait.**
Ce plan en a trouvé trois rouges, tous par hasard, en cherchant autre chose :
`verifierEquilibreArmes` (lot 09), `verifierProgression` (lot 10) et
`verifierBoss` (ce lot). Le défaut est dans l'**absence d'appel** — la seule
chose qu'un vérificateur ne peut pas signaler lui-même.

`verif.js` est le point d'entrée. Le coût sépare les deux modes, et c'est la
seule raison : un outil qu'on n'ose pas lancer ne se lance pas.

| mode | contenu | coût |
|---|---|---|
| `npm run verif` | 22 vérificateurs de table | **< 1 s** |
| `npm run verif-tout` | + les 11 campagnes simulées | ~20 min |

**Le drapeau `lent` est mesuré, pas supposé** — et deviner d'après le nom donnait
l'inverse dans les deux cas extrêmes :

| vérificateur | coût | ce qu'on aurait parié |
|---|---:|---|
| `verifierBoss` | **446 s** | table de mécaniques, donc rapide |
| `verifierBiomes` | **0,0 s** | 200 graines × 5 lieux, donc lent |
| `verifierMarchand` | 861 s | — |

#### Le troisième rouge : `verifierBoss`

Sept constats, **non corrigés ici** — rééquilibrer les boss est un chantier, pas
la fin d’un lot d’outillage :

| constat | mesure |
|---|---|
| les combats **raccourcissent** au lieu de s’allonger | 79 s au premier boss, 55 s au dernier — dérive 20 % au plafond |
| boss du segment 1 à quatre | 95 s, hors de [50, 90] |
| boss final à quatre | 173 s, hors de [94, 168] |
| emportement à quatre | 29,4 % des combats pour un plafond de 25 % |
| débit de renforts | 0,19 à 0,42 par joueur et par seconde, 58 % d’écart selon l’effectif |

Le sens est cohérent avec le lot 05 — plus de corps à quatre allonge les combats
et remplit la jauge d’emportement. **Troisième vérificateur dérivé sous le même
changement**, et le troisième trouvé par hasard.

Les **deux constats restants n’en sont pas** : « critère par boss NON MESURÉ,
moins de 8 combats pour veilleur=5, métronome=3… ». Le vérificateur mélange
« rouge » et « je n’ai pas pu mesurer », et le dit lui-même en demandant plus de
manches. Une suite qui distingue les deux vaudrait mieux qu’une suite qui compte
sept problèmes là où il y en a cinq.

#### Les constantes sans lecteur

Balayage des 689 clés des 15 tables de configuration. **Neuf** n'avaient aucun
lecteur, et trois leviers valaient zéro dans un terme neutre :

| constante | ce que c'était |
|---|---|
| `CFG.SEAL_RADIUS/HOLD/WARN/DECAY` | doublon périmé de `BOSS_CFG.SEAL_*`, qui est ce que le sceau lit |
| `CARD_CFG.SWARM_HIT_CD` | vestige : le mini-drone se **consomme** au contact |
| `CARD_CFG.INSTINCT_MUL` | l'intensité appartient au canal global (`CFG.SLOW_MUL`) |
| `STATUS_CFG.PURGE_HITS` | le code dit lui-même « la purge se comptait en touches » |
| `STATUS_CFG.BULWARK_PURGE` | le Rempart ne purge pas ; seule une relique le fait |
| `BIOME_CFG.TRAIL_BUDGET` | une seule occurrence : sa définition |
| `WAVE_HP_POWER_K`, `WAVE_RATE_POWER_K`, `BOSS_GROWTH` | à zéro depuis le lot R (« plus aucun scaling de puissance ») — le terme valait ×1 et appelait `_teamPower()` à chaque apparition |

`GAZE_TIME: 0` **n'en est pas** : le zéro porte du sens — il distingue le regard
instantané du regard permanent (`GAZE_PERM_OPEN: 1.4`). Une valeur nulle n'est pas
une valeur morte.

Deux défauts dans la sonde avant qu'elle ne dise vrai, tous deux du genre qu'elle
cherche : `` dans un *template literal* est un **backspace** (0 lecteur pour
tout le monde), et `indexOf("CFG.SEAL_RADIUS")` trouve `BOSS_CFG.SEAL_RADIUS` —
c'est derrière ce préfixe que le bloc mort de `CFG` s'était caché.

#### Les archétypes, mesurés à trois états de progression

`verifierBuilds` mesurait le bassin à **contenu complet**. La carte de rareté 3 de
chaque famille étant la récompense d'un haut fait, le bassin réel d'un compte qui
commence est plus maigre — et deux archétypes tombaient sous le plancher :

| archétype | compte neuf | à mi-parcours | complet |
|---|---:|---:|---:|
| incendiaire | **4** | **4** | 5 |
| acrobat (avant) | **4** | 5 | 5 |
| acrobat (après) | 5 | 6 | 6 |
| sniper | 6 | 6 | 9 |
| forteresse | 7 | 9 | 10 |
| berserker | 6 | 7 | 8 |
| démolition | 7 | 7 | 8 |
| technicien | 6 | 6 | 7 |

`sillage` entre chez l'acrobat : seule carte libre de verrou, d'arme et de classe
qui parle d'esquive sans appartenir déjà à un autre archétype. L'incendiaire reste
à 4 — c'est le plancher du catalogue, et le vérificateur l'exige désormais au
compte neuf (`seuil + 1`) en plus du contenu complet (`seuil + 2`).

### Les hauts faits, campagne mesurée (plan 29, lot 10)

Un **compte** qui enchaîne 20 manches de 40 min : il prend ses cartes, achète au
marchand, change d'arme et de classe, et il peut mourir. `mesureHautsFaits()`.

| piste | obtenus | manches gagnées | reliques achetées | récolte |
|---|---:|---:|---:|---:|
| normal solo | 16 / 36 | 1 / 20 | 3 | 10 |
| cauchemar solo | 7 / 36 | 0 / 20 | 0 | 0 |
| normal × 4 | 22 / 36 | 1 / 20 | 8 | 40 |

**Le pilote gagne une manche sur vingt** : tout verdict portant sur un haut fait
de victoire est donc borné par la qualité du bot, pas par le seuil. C'est la
limite principale du banc, et elle se lit dans cette colonne.

`m<n>` = manche d'obtention. Sinon, la **meilleure part de jauge atteinte** — une
jauge à 7 % dit « le pilote ne joue pas ça », une jauge à 77 % dit « le seuil est
juste au-dessus ».

| haut fait | niveau | normal solo | cauchemar | x4 |
|---|---|---|---|---|
| premier_sang | simple | **m2** | — | **m1** |
| recrue | simple | **m1** | **m1** | **m1** |
| sur_le_terrain | simple | **m1** | **m1** | **m1** |
| au_contact | simple | 77 % | 34 % | **m8** |
| curieux | simple | **m3** | **m3** | **m3** |
| collectionneur | simple | **m11** | 40 % | **m5** |
| prospecteur | simple | 7 % | — | 27 % |
| marchand | simple | 10 % | — | 27 % |
| bestiaire1 | simple | **m11** | — | **m5** |
| debrouillard | simple | **m7** | **m11** | **m3** |
| sans_faille | intermédiaire | 71 % | — | **m10** |
| moisson | intermédiaire | **m11** | 34 % | **m5** |
| economie | intermédiaire | **m7** | — | **m5** |
| longue_portee | intermédiaire | **m11** | 36 % | **m5** |
| perce_ligne | intermédiaire | **m5** | **m5** | **m5** |
| debout | intermédiaire | **m11** | — | — |
| demolisseur | intermédiaire | 39 % | 10 % | **m10** |
| veteran | intermédiaire | **m11** | — | **m5** |
| chirurgien | intermédiaire | 40 % | 28 % | **m5** |
| increvable | intermédiaire | 36 % | **m10** | **m5** |
| fraternite | intermédiaire | — | — | **m5** |
| phalange | intermédiaire | — | — | **m5** |
| bestiaire2 | intermédiaire | 55 % | — | 73 % |
| maitre_armes | intermédiaire | — | **m5** | **m3** |
| puriste | défi | — | — | — |
| ascete | défi | **m2** | — | **m1** |
| intouchable | défi | — | — | — |
| foudroyant | défi | **m4** | — | **m5** |
| armurier | défi | — | — | — |
| ermite | défi | **m11** | — | — |
| nuit_blanche | défi | — | — | — |
| sans_egratignure | défi | — | — | — |
| bestiaire3 | défi | — | — | — |
| perfection | défi | — | — | — |
| quatuor | défi | — | — | — |
| legende | défi | — | — | — |

#### Ce que le croisement a produit

**Sept hauts faits disaient « terminer une manche » en lisant `finie`**, vrai dès
que la manche s'arrête — donc en mourant. Avant/après correctif :

| haut fait | niveau | avant | après |
|---|---|---|---|
| `veteran` | intermédiaire | m1 partout | m11 solo, m5 à quatre |
| `puriste` | défi | m3 solo, **m1** cauchemar | jamais en 20 manches |
| `nuit_blanche` | défi | **m1** cauchemar | jamais en 20 manches |
| `perfection`, `quatuor` | défi | — | inchangé (déjà hors de portée du bot) |

`recrue` et `debout` gardent `arretee` : ils ouvrent la ligne `tronc` et l'arme
**dispersion**, et enfermer du contenu de départ derrière une victoire est le seul
risque que ce chantier ne prend pas. Leurs **textes** ont été corrigés à la place.

#### Non concluants, et pourquoi

- `prospecteur` (7 % solo, 27 % à quatre) : le pilote ne va pas chercher les
  cristaux — 10 et 40 points de récolte sur 20 manches. Le seuil de 150 n'est pas
  jugé.
- `marchand` (10 % / 27 %) : 3 et 8 reliques achetées sur 20 manches, faute
  d'éclats. Cible 30.
- `ascete` (défi, m1–m2) : le pilote n'utilise pas son ultime, donc la condition
  « vaincre un boss sans ultime » lui est gratuite. Un joueur ne joue pas comme ça.
- Tout ce qui exige la victoire en cauchemar : 0 sur 20.

#### Un second vérificateur a dérivé sans que personne le rejoue

`verifierProgression()` est **rouge**, et il l’était déjà avant ce lot (vérifié sur
`HEAD` dans un worktree isolé) : la courbe de niveau monte trop vite — 25 au lieu
de 20 à la minute 20 en solo, 26,5 au lieu de 20 à quatre — et l’écart-type de
cartes dépasse son plafond à quatre joueurs.

C’est le **même schéma qu’au lot 09** avec l’équilibre des armes, et la même cause
probable : le lot 05 a densifié la mi-manche de 17 %, donc plus de kills, donc
plus d’XP. Deux vérificateurs mesurés ont bougé sous un changement qui ne les
nommait pas, et rien ne les rejoue. **Non corrigé ici** — c’est l’objet du
chantier 06.

#### Ce qui reste franchement dur, et paraît juste

`au_contact` (77 % solo, obtenu m8 à quatre) et `bestiaire2` (55–73 %) sont les
deux seuils qui approchent sans tomber. Ils sont respectivement **simple** et
**intermédiaire** — le premier ouvre la **lame**, donc c'est le candidat le plus
sérieux à un REWORK de seuil, et il n'a pas été touché faute de mesure sur un
joueur humain.

### Compatibilité carte × arme (plan 29, lot 09)

#### Les cartes mortes que rien ne filtrait

Pool tirable par arme, build vide, niveau 1, classe dps :

| arme | avant | après | ce qu’elle perd |
|---|---:|---:|---|
| standard | 112 | 112 | — |
| assaut | 116 | 116 | — |
| **laser** | 113 | **104** | 4 cartes de cadence, rebond, écho, salve arrière, frénésie, adrénaline |
| tesla | 113 | 112 | rebond |
| lame | 112 | 111 | rebond |
| dispersion | 116 | 116 | — |
| railgun | 114 | 114 | — |
| grenade | 113 | 112 | rebond |
| siège | 113 | 112 | rebond |
| précision | 116 | 116 | — |

Le plus pauvre est le laser à **93 %** du pool du tir standard, d’où le plancher
de `verifierPools()` à 80 % : un verrou de plus vide le pool par le bas sans que
rien ne le dise.

« Balles rebondissantes » était offerte aux **dix** armes. Elle est morte sur les
quatre qui ne lancent pas de balle, et **nuisible** sur l’obus du siège :
`if (o && b.bounce > 0)` le fait rebondir sur l’obstacle au lieu d’exploser.

#### Équilibre des armes, rejoué (3 manches × 10 min, `mesureArmes`)

Tolérance 0,05. **Cette mesure se fait sans cartes** — c’est ce qui réfute
l’hypothèse du chantier, qui voyait dans `ech.cadence` du laser la cause de son
dépassement : `appliquerEchelle` n’y intervient pas.

| arme | délivré | cible | écart | v0.31.8 (plan) |
|---|---:|---:|---:|---:|
| **lame** | 123 % | 102 % | **+21** | absente du tableau |
| **laser** | 124 % | 106 % | **+18** | +16 |
| assaut | 110 % | 108 % | +2 | — |
| standard | 100 % | 100 % | 0 | — |
| railgun | 108 % | 110 % | −2 | −15 |
| grenade | 102 % | 104 % | −2 | −12 |
| tesla | 99 % | 102 % | −3 | — |
| précision | 101 % | 106 % | −5 | −7 |
| **siège** | 93 % | 106 % | **−13** | −10 |
| **dispersion** | 92 % | 106 % | **−14** | −9 |

**Cinq armes hors tolérance, et le tableau a bougé depuis le plan.** Railgun et
grenade sont rentrés ; la **lame** est sortie, à +21. Le sens du déplacement est
cohérent avec le lot 05 (densité de mi-manche +17 %) : les armes de zone montent,
les armes à cible unique descendent. Personne n’avait rejoué la mesure après.
**Rien n’est corrigé ici** — le chantier 04 porte sur la compatibilité, pas sur
l’équilibrage, et la règle du plan est de mesurer le levier avant d’y toucher.

Reste un défaut connu et non traité : `ballesLourdes` (+35 % de dégâts, −20 % de
cadence) est un **bonus pur** pour le laser, qui ne lit pas la cadence. C’était
déjà vrai avant ce lot — `ech.cadence` à 0,4 ne réduisait que la déclaration, pas
l’effet, qui était déjà nul.

### Les armes, banc d'essai (plan 11, lot 02 — tranche de quatre)

**Banc, pas manche.** Le spawner, l'horloge de vague et le crédit d'expérience
sont neutralisés : sans ça la horde entre dans la mesure, et le boss fait monter
le joueur de niveau pendant qu'on le mesure. Mannequin unique = cible unique,
file de dix corps = densité, boss réel = conversion. Classe neutralisée
(`damageMul = 1`), critique à zéro : on juge **l'arme**.

| arme | mono | boss | file | boss / réf | file / réf |
|---|---:|---:|---:|---:|---:|
| tir standard | 72 | 72 | 72 | 0,96 | 0,96 |
| canon d'assaut | 145 | 145 | 145 | **1,94** | 1,94 |
| canon laser | 72 | 72 | 724 | 0,96 | **9,65** |
| tesla | 32 | 72 | 72 | 0,96 | 0,96 |
| lame tournoyante | 34 | 46 | 67 | 0,62 | 0,90 |
| dispersion | 70 | 70 | 70 | 0,94 | 0,94 |
| railgun | 87 | 87 | 855 | 1,16 | **11,40** |
| lance-grenades | 50 | 50 | 150 | 0,67 | 2,00 |

Référence : 75 dps. **Aucune arme sous 60 % dans l'un des deux contextes** — le
critère du plan est tenu, et les conversions sont ce qui le tient : le tesla
passe de 0,43 à 0,96 sur un boss, la lame de 0,45 à 0,62.

**Le canon d'assaut à 1,94 est le plus haut du lot**, et le plan demandait de le
surveiller en premier. C'est voulu : c'est le prix de l'immobilité, et la rampe
met 2,5 s à monter — sur les douze secondes du banc elle n'est pleine que la
moitié du temps, donc le régime de croisière réel est plus bas que le pic.

**Trois bugs que seul le banc pouvait trouver, et aucun n'était une question
d'équilibrage :**

- **`boss.r` n'existe pas.** Le rayon d'un boss est `CFG.BOSS_RADIUS` ; mes deux
  nouveaux tests de portée comparaient contre `undefined`, donc contre `NaN` — et
  un `>` sur `NaN` est **faux**, donc la garde *laissait passer* au lieu de
  rejeter. Le faisceau du laser touchait un boss à 1 200 px, hors de vue.
- **Le souffle du lance-grenades se calculait en fraction de
  `CFG.BULLET_DAMAGE`.** Juste tant qu'une arme était une *carte* qui ne changeait
  que des multiplicateurs, faux dès qu'elle déclare ses propres dégâts : 1 540 %
  de la référence au premier relevé.
- **Le combat de boss resserre `state.bounds` à une vue**, donc une position de
  mannequin posée en absolu ne tient pas une image — le joueur était ramené à
  1 200 px de sa cible et toutes les colonnes « boss » étaient fausses. La cible
  se place **par rapport au joueur**, pas dans l'arène.

**Une manche complète par arme** (pilote, normal, 15 min, tirages au hasard) :

| arme | kills | dégâts |
|---|---:|---:|
| tir standard | 1 252 | 175 883 |
| canon d'assaut | 1 581 | 244 871 |
| canon laser | 1 655 | 178 477 |
| tesla | 1 577 | 193 223 |
| lame tournoyante | **387** | **71 464** |
| dispersion | 1 400 | 217 738 |
| railgun | 1 620 | 200 684 |
| lance-grenades | 1 533 | 220 195 |

**Le chiffre de la lame ne juge pas la lame, il juge le pilote.** `pilotage()`
recule — c'est sa règle depuis le lot I — et la lame demande exactement
l'inverse. Un critère de survie se mesure avec le pilote, un critère d'arme de
contact demanderait un pilote qui avance. Tant qu'il n'existe pas, ce chiffre
n'est pas une mesure d'équilibrage.

### Équilibrage des armes entre elles (plan 11, lot 02)

Le banc dit ce qu'une arme **sort**. Il ne dit pas ce qu'elle fait **gagner**.
Manche réelle, horde réelle, boss réels, profil P1, **et la mort compte** — on ne
relève plus le joueur. Six graines, solo, normal. La mesure est le **temps tenu**,
rapporté au tir standard.

#### Le pilote ne savait pas jouer deux des quatre armes

Avant de corriger le moindre chiffre : `pilotage()` recule toujours, c'est sa
doctrine depuis le lot I. Une arme de contact lui demande l'inverse, une arme à
rampe lui demande de ne pas bouger. Relevé de compétence :

| arme | ressource tenue | distance au corps | tenue visée |
|---|---:|---:|---:|
| canon d'assaut | rampe **0,39** | 490 px | reculer |
| canon laser | chaleur **0,99** | 567 px | reculer |
| lame | — | **196 px** | 88 px |

Le pilote gagne donc **une tenue de distance dérivée de l'arme**, et un terme
d'immobilité pour les armes à rampe. Les deux ne s'activent que si l'arme les
déclare : **avec le tir standard son comportement est inchangé**, sinon toutes
les mesures des lots I à K changeraient de sens.

#### Un défaut de conception que seule cette mesure pouvait montrer

**La chaleur du laser tenait 0,99 en moyenne.** Elle montait dès qu'on tirait —
or le tir est **automatique**, il n'y a pas de gâchette à relâcher, et le plan
interdit d'ajouter une entrée. La ressource n'était donc pas pilotable : c'était
un métronome. La chaleur monte maintenant quand le faisceau **touche**, et le
joueur la gère en visant ailleurs. Moyenne mesurée après : **0,64** — une
ressource qui cycle.

Un bug d'échantillonnage se cachait derrière : le faisceau se résout à 10 Hz mais
la chaleur s'intègre à 60 Hz, donc elle refroidissait cinq images sur six et ne
montait jamais. Le verdict du dernier tic est désormais retenu.

#### Ce que la mesure a corrigé

| arme | avant | après | levier |
|---|---:|---:|---|
| lance-grenades | ×1,88 | **×1,03** | rayon de souffle 130 → 95 px |
| lame tournoyante | ×0,66 | **×1,14** | rayon dérivé + arc 162° → 108° |
| canon laser | ×0,62 | **×1,28** | chaleur pilotable (conception) |
| dispersion | ×0,67 | **×1,30** | tenue de distance (pilote) |
| canon d'assaut | ×0,62 | **×0,76** | rampe 2,5 s → 1,6 s |

**Le lance-grenades débordait par sa SURFACE, pas par ses dégâts** : 0,67 de la
référence en cible unique et pourtant 1 063 kills contre 416. La première coupe
portait sur les dégâts — `verifierArmes()` l'a **refusée**, elle le faisait
tomber à 53 % de la référence, sous son propre plancher. La coupe porte donc là
où le débordement se mesure.

**Le rayon de la lame n'est pas un levier de réglage, c'est un seuil.** 130 px
donne ×0,66, 156 px donne ×1,58 : vingt pour cent de rayon font basculer la
survie d'un facteur 2,4. En dessous d'environ 150 px la lame ne perce pas
l'anneau de corps qui se referme sur elle, au-dessus elle le nettoie. Le rayon a
donc été posé **au-dessus du seuil** et c'est l'**arc** qui règle — 108° au lieu
de 162°, ce qui demande en plus de faire face.

#### État final

| arme | temps tenu | niveau | kills | TTK boss |
|---|---:|---:|---:|---:|
| tir standard | ×1,00 | 10 | 416 | 88 s |
| canon d'assaut | ×0,76 | 10 | 419 | 119 s |
| canon laser | ×1,28 | 18 | 1 072 | 92 s |
| tesla | ×1,05 | 13 | 652 | 169 s |
| lame tournoyante | ×1,14 | 25 | 1 920 | 105 s |
| dispersion | ×1,30 | 15 | 898 | 109 s |
| railgun | ×0,93 | 13 | 640 | 66 s |
| lance-grenades | ×1,03 | 10 | 416 | — |

**Écart total 0,76 à 1,30.** Le canon d'assaut est volontairement le plus bas :
c'est l'arme qui paie sa survie pour 2,22 fois la référence en dégâts, et le
plan lui donne l'immobilité pour prix. Le railgun à 0,93 avec le meilleur TTK
boss (66 s) est l'inverse : il paie en horde ce qu'il gagne sur cible unique.

**Ce qui n'est pas mesuré :** un seul effectif (solo), une seule difficulté
(normal), un seul profil (P1), six graines. Les compositions à plusieurs et le
cauchemar restent à faire.

### Le retour de combat (plan 15)

Tous les seuils de ce plan sont **relevés**, aucun n'est choisi. Ils tiennent en
un protocole unique, rejouable sans le navigateur : la logique est pure, on
fabrique des instantanés à la main depuis un `GameState` et on les passe à
`diffSnapshots` — le module d'événements ne dépend de rien.

```js
// le squelette : GameState -> instantanés 20 Hz -> diffSnapshots -> comptage
const g = new GameState(1);                       // 2 pour le cauchemar
for (let i = 1; i <= 4; i++) { g.addPlayer(i, `bot${i}`, i - 1);
  const p = g.players.get(i); p.arme = ARMES_CHOISIES[i - 1]; g._recomputeMods(p); }
g.warmup = 0;
const pil = pilotage();                           // le pilote du dépôt, pas un bot ad hoc
// à chaque image : g.step(CFG.TICK, inputs) ; un instantané toutes les 3 images
```

Trois pièges déjà payés dans ce protocole :

- **Un bot maison fausse tout.** Une visée « l'ennemi d'indice `k % n` » a rendu
  **54 impacts en 10 minutes** contre 1 590 avec `pilotage()` : sans réticule
  correct, les armes ne délivrent pas. Toujours le pilote du dépôt.
- **La fenêtre décide de ce qu'on mesure.** Le couvain arrive à la minute 9, le
  soigneur à 19, le chœur à 23. Une mesure de 12 minutes ne voit **jamais** deux
  des trois matières. Forcer `minMin = 0` mesure le mélange de fin de manche.
- **Le roster dépend du MODE.** Soigneur et chœur n'existent qu'en cauchemar
  (`roster: [0..8]` contre `[0..6]` en normal) : les mesurer en normal rend zéro,
  et zéro ressemble à un bug.

**Voix de tir** — 8 min, 4 joueurs, mode normal :

| cas | sons joués | pic de voix | volées | refusées |
|---|---|---|---|---|
| avant (un `tir` anonyme par instantané) | 1 012 | ~2 / 16 | 0 | — |
| quatre armes différentes | 1 165 (+15 %) | 5 / 16 | 0 | 0 |
| quatre fois la même arme rapide | **805** — le compte d'avant | 3 / 16 | 0 | 1 873 |

Le pire cas est **gratuit** : le limiteur absorbe les 2 678 événements émis. Seule
la *différence* se paie. C'est le critère de non-régression du plan, et il porte
sur `MAX_VOICES` et le vol, jamais sur le pic — quatre familles distinctes
occupent forcément plus d'une place que le son unique qu'elles remplacent.

**Bouche** — 3 à 8 particules par tir, **~98 vivantes en régime** à 4 joueurs sur
les 3 000 du chemin WebGL. Le chemin 2D plafonne à 300 : à pleine densité la
bouche y prendrait un tiers du budget et affamerait les morts, qui sont le palier
au-dessus. Un canon, la moitié des étincelles, une bouffée.

**Impact** — 4 graines × 12 min, 4 joueurs, normal, **92 968 événements** :

| | part |
|---|---|
| dégât **continu** (brûlure, zone — aucune touche) | 75 651, **81 %** |
| vraies touches | 17 317 |
| touches **sans auteur identifié** | 1 492, **8,6 %** (38 % avant la reprise des perforants) |

Part de PV max retirée **par touche** : 0,1 % au p25, 0,3 % à la médiane, 16,3 %
au p90, 31,2 % au p95. Les seuils **0,25 / 0,60** découpent 93 / 5 / 2 %, soit
31,7 / 1,7 / 0,53 par seconde.

Bilan du lot : particules d'impact **67,8/s → 21,3/s (−69 %)**, voix de touche
**2,7/s → 1,2/s (−55 %)**, pic 2 voix sur 16. Trois paliers, un axe juste et la
matière du lieu coûtent **moins** que ce qu'il y avait avant.

**Morts** — cauchemar, bestiaire forcé, 32 min : **86 %** carapace, **5 %**
organique, **9 %** énergie. 36 % des morts d'énergie s'entendent contre 28 % pour
la horde (le `claim`), pour **+4 %** de voix et un pic de 4 sur 16. Zéro
particule de plus : seuls la case d'atlas, la rotation, la croissance et
l'opacité changent.

**Boss** — 3 graines, 4 joueurs, 4 500 s, **38 barres brisées, 9 boss tués** :

- `bossMort` émis **9 fois**. Aucun faux positif, aucun manque — la garde « il
  était sur sa dernière barre » suffit à séparer la mort de la remise à zéro.
- Part d'**une barre** retirée par pas de 50 ms : 0,01 % à la médiane, 1,14 % au
  p90, 4,22 % au p99, 15 % au maximum. Plein à **2 %**, plancher 0,25.
- **La racine, pas la proportion** : en linéaire 82 % des touches tombaient sur
  le plancher ; en racine, 62 %, p75 à 0,41 et p90 à 0,76. L'éclair dure 73 ms à
  la médiane et 140 ms au p99, contre 80 ms fixes.

**Ce qui n'est pas mesuré :** tout est en simulation, sans navigateur. Le coût
GPU réel des nouvelles particules, la lisibilité des cinq formes de bouche et le
rendu de la séquence de mort du boss demandent un œil en jeu — `?perf` sort
désormais `frag/plafond`, le nombre d'effets vivants, les balles et les refus de
voix pour ça.

### Le palier de barre : une fenêtre, plus un plancher (plan 24, lot 1)

Protocole du lot H — `mesureBoss()` / `verifierBoss()`, graines écrites, six
manches, effectifs 1 / 2 / 4, normal. La part de palier est **nouvelle** :
`partPalier` compte les images où `boss.palier > 0`, c'est-à-dire où le boss ne
prend **rien**.

**Le défaut n'était pas le niveau, c'était la variance.** `BAR_DWELL` comptait
depuis la rupture précédente, donc le temps mort valait `dwell − fonte` : nul
quand la barre était lente, maximal quand elle était rapide. La médiane restait
à 9-10 %, et personne ne la regardait par boss.

| part du combat au palier, 2 j, quatre manches | avant | après |
|---|---|---|
| calme | 0 % (Jumeaux) à **54 %** (Oracle) | 4 à 17 % |
| normal | 4 % (Ravageur) à **42 %** (Oracle) | 10 à 17 % |
| médiane, calme / normal | 9 % / 10 % | 10 % / 11 % |

Au bot du dépôt, six manches, les trois effectifs : **5 à 14 %**, aucun boss
au-dessus du plafond de 15 %. Quatre paliers de **1,40 s exactement** par combat
ordinaire en normal, tracés.

**La première écriture valait 2,6 s et c'était pire que la règle remplacée** :
quatre paliers pesaient 10,4 s sur un combat de 53 s, soit 20 % contre 10 % à la
médiane d'avant. Le niveau et la variance sont deux réglages, et un seul était
cassé. 1,0 / 1,4 / 1,8 tient les deux.

**La Matriarche n'est pas une régression, c'est un outlier antérieur.** Boss
forcé, mêmes graines, bot du dépôt à deux joueurs :

| Matriarche forcée, 2 j, dix graines | abattue | durée | soin cumulé |
|---|---|---|---|
| avant (`BAR_DWELL`) | 4 / 10 | 142 s | **122 %** des PV max |
| après (`PALIER_TIME`) | 3 / 10 | **106 s** | **70 %** des PV max |

Le soin tombe de 43 % et le combat de 25 %. L'écart d'un combat abattu est du
bruit à dix graines ; les deux grandeurs continues, elles, vont dans le même
sens. Ce qui reste est
`DIFFUS_HEAL` — jusqu'à 1,44 % des PV max par seconde sur douze corps — contre un
bot qui **ne nettoie pas autour d'elle** : `botVersBoss` va au boss. Au tirage
naturel, avant le lot, elle sortait à 189 s en solo, 118 s à deux et 212 s à
quatre, pour le `hpMul` le plus bas du roster (0,85). **Baisser son `hpMul`
réglerait le bot, pas le jeu** : c'est une mesure qui manque un pilote, pas une
courbe de PV à corriger.

**Le critère par boss ne décide rien à six manches.** Même boss, même effectif :
Ravageur de 49 à 126 s, Tisseur de 52 à 206 s, Ravageur à deux joueurs jusqu'à
179 s. Six manches ne donnent que trois à cinq combats par boss puisqu'une manche
en montre cinq sur huit. `BOSS_ECHANTILLON_MIN = 8`, et en dessous `verifierBoss`
**nomme** les boss qu'il n'a pas jugés — un critère qui passe au vert sans avoir
rien regardé est le défaut que ce plan a trouvé sur l'emportement.

**Le final perd ses 60 s de séjour, et la bande dit maintenant l'intention.**
Elle passe de `[7 × FINAL_BAR_DWELL, 180]` à `[2 × 50, 2 × 90]` — la borne basse
était un plancher de séjour qui n'existe plus, et « deux boss ordinaires » se
lit, alors que « sept fois dix secondes d'attente » ne se lisait pas.

| boss final, médiane | 1 j | 2 j | 4 j |
|---|---|---|---|
| avant | 101 s | 145 s | **211-232 s** |
| après | **87 s** | **99 s** | 167 s |

Les sept paliers valaient jusqu'à 60 s : le combat à quatre joueurs rentre dans
la bande, celui à un et deux joueurs passe **sous** la borne basse. C'est le
constat que le lot 3 prend en charge — le final n'a **jamais** montré un palier
(0 % à tous les effectifs, avant comme après), donc sa respiration est à écrire,
pas à récupérer.

**`verifierBoss` était déjà rouge avant le lot**, et sur des points qu'il ne
touche pas : dérive du premier au dernier boss ordinaire au-delà de 20 % aux
**trois** effectifs, boss du segment 5 à 104 s à quatre joueurs, débit de
renforts à 26 % d'écart pour une tolérance de 15 %.

**Ce qui n'est pas mesuré :** le cauchemar. La campagne y prend plusieurs fois le
temps du normal, et `verifierMecaniques` n'y a été rejoué qu'à un effectif.

### L'emportement se compte par barre (plan 24, lot 2)

Protocole du lot H, huit manches pour la distribution, six pour le taux, trois
effectifs, normal.

**Deux secondes absolues contre des combats de 40 à 120 s.** `ENRAGE_AT` valait
150 s, `FINAL_ENRAGE_AT` 300 s. Taux relevé avant : **0 %** en calme, **0 %** en
normal à deux joueurs, 4 % à quatre, 8 % en solo, 12 % en cauchemar, et **jamais**
sur un boss final. Le critère ne le voyait pas : `BOSS_ENRAGE_MAX` était un
plafond sans plancher.

**Le seuil est lu sur la distribution, pas choisi.** 82 combats ordinaires :

| | p50 | p75 | p80 | p90 | max |
|---|---|---|---|---|---|
| ordinaire (n=82) | 65 s | 90 s | 96 s | 118 s | 278 s |
| final (n=13) | 105 s | 136 s | 150 s | 160 s | 185 s |

| seuil | combats ordinaires emportés |
|---|---|
| 18 s × barres (90 s) | 26 % |
| **21 s × barres (105 s)** | **15 %** |
| 24 s × barres (120 s) | 10 % |

Le nombre de **barres** est la bonne échelle : c'est lui qui fait la longueur
d'un combat, donc un boss à huit barres a plus de temps qu'un boss à cinq sans
qu'on écrive une seconde constante. Et il vient du jeu, pas du critère —
l'indexer sur `BOSS_FIGHT_MAX` rendrait `verifierBoss` vrai par construction.

**Ce que la mesure a refusé de donner : la bande aux trois effectifs.** Au même
seuil de 105 s :

| | 1 j | 2 j | 4 j |
|---|---|---|---|
| combats ordinaires emportés | **48 %** | **0 %** | 6 % |
| finaux emportés | 25 % | 0 % | 67 % |

L'agrégat tombe à 15 %, en plein dans la bande [10, 25] ; par effectif, rien n'y
est. La cause n'est pas le seuil, c'est que **les combats solo durent le double
des combats à deux** — médianes par boss en solo jusqu'à 120 s contre 40 à 66 s à
deux. Aucune forme de seuil ne rattrape un écart de durée, et le lever pour le
solo reviendrait à compenser un déséquilibre par une punition. Le critère le
**dit** maintenant, au lieu de le taire ; c'est la campagne d'équilibrage (lot 7)
qui referme l'écart.

Six combats sur 80 atteignent le palier 2 ou plus : la rampe existe sans devenir
la règle.

### La respiration du final (plan 24, lot 3)

Le lot 1 lui avait déjà rendu ses paliers — **0 %** du combat avant, 11 à 13 %
après. Restait qu'ils étaient tous de la même longueur : sept ruptures qui
ouvrent chacune une couche, toutes cadencées pareil, sont une escalade sans
palier de lecture.

`FINAL_PALIER_RAMP` allonge la fenêtre avec la phase. Mesuré **dans le moteur**,
phase par phase :

```
1,38  1,88  2,37  2,87  3,35  3,85  4,33  4,82 s
```

La dernière — celle où il devient tuable — vaut **3,5×** la première, et le
patron différé par `PALIER_AMORCE` s'y **résout** au lieu de déborder : la
mécanique de la phase suivante se joue pendant qu'il est invulnérable, ce qui est
l'intention écrite du palier depuis le début.

**Elle se paie en PV.** `FINAL_HP_MUL` 1,30 → 1,17, de ce que les fenêtres
ajoutent (11,2 s → 24,9 s). Ce qui change est la **composition** du combat, pas
sa durée. Ajoutée par-dessus, elle rendait 182 s à quatre joueurs, hors bande.

| boss final | avant | après |
|---|---|---|
| 1 j | 87 s · palier 13 % | 147 s · palier **21 %** |
| 2 j | 99 s · palier 11 % | **109 s** · palier **23 %** |
| 4 j | 167 s · palier 7 % | 176 s · palier **14 %** |

La part de palier double partout : c'est la mesure du lot. Les durées à deux et
quatre joueurs rentrent dans [100, 180] ; **176 s à quatre est tenu de peu, sur
trois combats**. La médiane solo bouge de 87 à 147 s sur quatre combats, ce que
l'échantillon ne sépare pas de la fourchette historique (82 à 152 s). Le net
mesuré est +9 à +10 s là où l'arithmétique donne 0 : **on ne retouche pas
`FINAL_HP_MUL` sur un écart de 9 s entre deux échantillons de 2 et 3 combats** —
c'est exactement l'erreur que le lot 1 s'est interdite. Le protocole profond
tranchera (lot 7).

### Un boss a une voix (plan 24, lot 4)

Onze boss partageaient **un** son d'arrivée et **un** son de rupture. C'était le
seul canal d'identité sans rien à lui : la silhouette, la teinte, le verbe, le
répertoire et l'archétype en ont tous un.

L'**archétype** porte la matière, les **barres** portent l'échelle. Les onze
voix, croisées par `verifierFeedback` — **zéro souci** :

| boss | archétype | fondamentale | matière |
|---|---|---|---|
| veilleur | guetteur | 196 Hz tenu | sinus, **aucun bruit** |
| prisme | reflet | 165 Hz | triangle, battement 1,03 |
| matriarche | diffus | 131 → 124 | triangle, battement 1,01 |
| jumeaux | multiple | 123 Hz | scie, **quinte** |
| ravageur | constricteur | 110 → **73** | scie, elle descend |
| tisseur | bâtisseur | 110 → 98 | **créneau** |
| récitant | fixe (5 barres) | 98 → 82 | scie |
| silence | fixe (6 barres) | 92 → 77 | scie |
| oracle | ancre | 87 Hz **tenu** | scie |
| métronome | mobile | **82 → 131** | scie, elle monte |
| amalgame | fixe (8 barres) | 83 → 70 | scie |

Les trois finaux partagent « fixe » — le roster l'autorise, un seul sort par
manche — et se séparent par les barres seules : 98/92/83 Hz.

**Une seule recette, `bossVoix`, neuf jeux de paramètres.** La table porte les
nombres, `audio.js` porte la forme — le modèle de `BOUCHE`. Neuf recettes écrites
à la main auraient neuf enveloppes à tenir d'accord. `pitch` va aussi à `barre`,
`bossBrise` et `bossQueue` ; la **cassure** ne bouge pas, c'est du bruit large et
le transporter ferait un autre son au lieu du même en plus gros.

**Ce qui n'est pas mesuré :** l'oreille. Onze fondamentales distinctes et quatre
timbres se lisent sur le papier ; que le Ravageur et le Tisseur (110 Hz tous
deux, scie contre créneau) se distinguent **en jeu, sous le fracas d'un combat**,
demande une écoute.

### Cinq boss portaient la prise d'arène du final (plan 24, lot 5)

Relevé, pas mesuré : cinq lignes de `BOSS_SKIN` recopiaient celle de l'Amalgame
**au caractère près** — `amb #2e2a30, k 0.80, vig 1.45, puls [0.35, 0.22],
atmo #e8e4dc`. Le commentaire de la table les appelait « les finals par
difficulté », mais **trois d'entre elles sont des boss de pool** (Veilleur,
Tisseur, Prisme), ajoutés en queue après l'écriture de ce commentaire. La doc
justifiait donc la copie par une phrase devenue fausse.

Rien ne levait : la table était bien indexée, les couleurs de corps différaient,
seule la prise était la même. Pour ces cinq boss, « le monde répète le boss » se
réduisait à un changement de couleur de corps.

| boss | pool | amb | k | vig | puls | atmo |
|---|---|---|---|---|---|---|
| ravageur | pool | `#5a3a28` | 0,72 | 1,30 | — | `#ff8a3d` |
| matriarche | pool | `#4f5a3a` | 0,66 | 1,15 | 0,55 / 0,16 | `#a8d13a` |
| métronome | pool | `#5a6270` | 0,62 | 1,12 | 1,50 / 0,20 | aucune |
| oracle | pool | `#6e6a72` | 0,48 | 0,78 | — | `#8b5cf6` |
| jumeaux | pool | `#44506e` | 0,68 | 1,18 | 0,90 / 0,10 | `#7ec8ff` |
| **veilleur** | pool | `#3a3226` | 0,66 | **1,50** | 0,28 / 0,09 | `#f2c14e` |
| **tisseur** | pool | `#23332f` | **0,84** | 1,22 | — | `#3fbfa0` |
| **prisme** | pool | `#2b3a4a` | **0,52** | **0,92** | 1,10 / 0,13 | `#b4e0ff` |
| amalgame | final | `#2e2a30` | 0,80 | 1,45 | 0,35 / 0,22 | `#e8e4dc` |
| **récitant** | final | `#33302a` | 0,70 | 1,28 | 0,30 / 0,14 | `#c9a227` |
| **silence** | final | `#202028` | **0,88** | **1,62** | — | `#4a4a55` |

Chacun rejoue son verbe. Le Veilleur porte le **vignettage le plus fort du
roster** — c'est un iris qui se resserre — et son battement lent et faible est un
clignement. Le Tisseur épaissit l'ombre et n'a **aucun** battement : ce qu'il fait
n'a pas de rythme, c'est une accumulation. Le Prisme ouvre l'arène, claire et
sans cadre, et son battement rapide **est** l'interférence. Le Silence n'a aucun
battement non plus, et c'est son verbe : il n'y aura pas d'avertissement.

`verifierPrises(BOSS_SKIN)` est vert, huit prises distinctes sur huit boss de
pool. **L'atmosphère y a sa propre règle** — c'est le seul champ qui traverse le
centre de l'écran — et elle a attrapé un cas que le tuple laissait passer : le
Prisme soufflait la couleur des Jumeaux.

**Ce qui n'est pas mesuré :** l'œil. Que huit prises se distinguent sur le papier
ne dit pas qu'elles se distinguent en jeu, et `k`, `vig` et `puls` sont des
grandeurs qui se jugent à l'écran.

### L'amer téléportait à l'arrivée du boss (plan 24, lot 6)

`amerDe` prend le candidat le **plus loin** de tout danger. `drawAmer` lui passait
`hazardsActifs()`, vide pendant un combat : tous les candidats valent alors
`Infinity`, et `Infinity > Infinity` est faux — c'est le **premier** qui sortait,
pas le meilleur.

| amer déplacé à l'arrivée du boss | cas | saut maximal |
|---|---|---|
| avant | **299 / 320** (93 %) | **2 596 px** |
| après | **0 / 320** | 0 px |

4 lieux × 2 modes × 40 graines. Le saut se rejouait **à l'envers** à la mort du
boss : un objet de 460 px de rayon, dont sa propre règle dit qu'il est « ancré au
MONDE », traversait l'arène deux fois par combat.

Le semis bougeait pour la même raison — `occupe()` ne rejetait plus rien, donc des
props naissaient dans l'empreinte des blocs. Sa clé de cache ne contient ni
obstacles ni dangers : c'est le **panoramique** du combat qui déclenchait le
recalcul, pas l'arrivée du boss.

**La règle qui manquait :** ce qui est **placé une fois** pour la manche lit
`obstaclesDuLieu()` / `hazardsDuLieu()`, ce qui se **dessine par image** lit
`obstaclesActifs()` / `hazardsActifs()`. Les deux lecteurs de décor posé une fois
étaient les seuls à confondre ; les huit autres sont du dessin par image et
restent sur les listes actives.

**Aucun changement de simulation** — trois fichiers de rendu. L'arène du boss
reste nue, et `biomeNu` s'écrit enfin dans `SIMULATION.md` : il n'était documenté
nulle part, et la seule ligne qui aurait dû le dire (« le boss n'y passe pas »)
était devenue vide de sens puisqu'il n'y a plus rien à traverser.

**Ce qui n'est pas mesuré :** la trace d'un bloc absent. Le semis évite maintenant
des empreintes qu'on ne voit pas pendant un combat — un vide discret, contre un
semis qui change. Le choix se juge à l'œil.

### La campagne du plan 24 (lot 7)

Ce qui se vérifie **sans simuler**, après les six lots. Sept vérificateurs, tous
verts :

| vérificateur | ce qu'il tient |
|---|---|
| `verifierGrammaire` | 11 formes pour 32 mécaniques, chacune son ordre court et son explication |
| `verifierCoexistence` | 41 paires d'ordres incompatibles, toutes gardées par `_mechLibre` |
| `verifierArchetypes` | 9 archétypes, unicité sur le **pool** |
| `verifierPrises` | 8 prises d'arène distinctes, atmosphères comprises — **lot 5** |
| `verifierFeedback` | 11 voix, 9 timbres, aucune recette absente — **lot 4** |
| patrons | **45 clés, 45 `case`, 0 orphelin dans les deux sens** |
| amer | **0 / 320** déplacements à l'arrivée du boss — **lot 6** |

Les deux constantes que les lots ont déplacées, dans leur forme finale :

```
emportement   21 s × barres    ordinaire 105 s · Silence 126 s · Amalgame 168 s
palier        ordinaire        1,40 s × 4
              final            1,40 1,89 2,38 2,87 3,36 3,85 4,34 4,83  (24,9 s)
```

**Ce que la suite statique ne dit pas :** rien sur les durées. Le critère par boss
(`BOSS_ECHANTILLON_MIN = 8`) demande une campagne, et c'est elle qui départage
ce que les lots 1, 2 et 3 ont laissé ouvert.

### La lame orbitale, et ce que le banc ne peut pas dire (plan 27, chantier 3)

**Protocole.** `GameState` réelle, difficulté normale, un joueur rendu
invulnérable, 300 s par manche, **5 graines appariées** (11, 23, 37, 53, 71).
On compte le montant passé à `_damage()` avec le joueur pour propriétaire, en
séparant la horde du boss. Aucune cible synthétique : un banc de DPS sur cible
immobile avait déjà rendu +789 % sur ce dépôt et été jeté.

**Empilement d'Orbiteurs**, bot immobile — la scène la plus favorable à la
carte, puisque la horde vient à lui :

| exemplaires | lames | dégâts horde | vs témoin |
|---|---|---|---|
| témoin (aucune) | — | 12 419 | — |
| ×1 | 2 | 16 398 | +32 % |
| ×2 | 4 | 17 346 | +40 % |
| ×3 | 6 | 17 313 | **+39 %** |

Le troisième exemplaire ne rend rien. `orbitHits` est indexé par **ennemi** et
partagé par toutes les lames : une fois touché, un ennemi est immunisé
`ORBIT_HIT_CD` contre **toutes**. Diviser la recharge par le nombre de lames a
été essayé et ne change rien (16 717 à six lames) — ce n'est pas la recharge qui
lie, c'est que les ennemis **traversent** la bande au lieu d'y séjourner.

**Où sont les ennemis**, part du temps passé par bande de 20 px :

| distance | bot immobile | bot qui recule |
|---|---|---|
| 20-40 px | 29,7 % | 0,0 % |
| **60-100 px (les lames)** | **2,6 %** | **0,1 %** |
| 220-240 px | 54,6 % | 96,4 % |

**Ce que ce banc ne peut pas trancher.** Les deux bots sont des extrêmes : l'un
ne bouge jamais et laisse la horde le couvrir, l'autre recule dès 260 px et n'en
laisse approcher aucun. Aucun ne représente un joueur. La question « l'épique
est-elle au bon palier » **reste ouverte** — elle demande une partie réelle, pas
un bot. Ce qui est tranché est plus étroit et ne dépend pas du bot : `max: 3`
promettait un empilement que le code ne rend pas, et le troisième exemplaire
était mort **même dans le cas favorable**.

**Pour mémoire, les pairs** (bot immobile, mêmes graines) : `pulsar` ×2 rend
+168 %, `drone` ×2 rend +13 %, `orbiteurs` ×2 rend +40 %. L'écart entre épiques
d'invocation est large, et ce relevé ne suffit pas à le corriger.

### La matrice des builds (plan 27, chantier 4)

**Protocole.** 300 manches par politique, 25 cartes par manche, arme standard,
graines écrites. On appelle le vrai `offerCards()` — le tirage n'est pas
remodélisé — puis `archetypeDe()` sur la build finale. Trois politiques : prise
au hasard, prise de la plus haute rareté, et **dirigée** — on joue *pour*
l'archétype, en prenant toute carte qui y mène, du palier le plus bas au plus
haut (l'ordre croissant est le seul qui permette de posséder les quatre paliers
d'une famille, un palier supérieur retirant les inférieurs du pool).

**Ce que la mesure a trouvé.** L'atteignabilité ne suit pas la taille du bassin
*déclaré* : elle suit le bassin **réellement tirable**, c'est-à-dire hors cartes
d'arme et hors cartes de classe.

| archétype | cartes libres | dirigé, avant | dirigé, après |
|---|---|---|---|
| forteresse | 10 | 87 % | 87 % |
| sniper | 9 | 76 % | 76 % |
| **demolition** | 4 → **8** | **4 %** | **77 %** |
| **technicien** | 6 → **9** | **4 %** | **72 %** |
| berserker | 8 | 69 % | 69 % |
| acrobat | 7 | 25 % | 25 % |
| incendiaire | 5 | 17 % | 17 % |

Les **quatre** graines de *demolition* étaient des cartes de la grenade : sans
elle il restait 4 cartes pour un seuil de 3. Les cartes qui collaient au thème
sans dépendre d'une arme — `bombe_fragmentation`, `bombe_double`,
`detonateur` — sont `cls: "dps"`, soit le **même verrou sous un autre nom**.
Seules `etau`, `terrain_conquis`, `contreAttaque` et `pulsar` sont libres des
deux.

**Le seuil de lisibilité est autour de 8 cartes libres.** 4 en rendent 4 %, 5 en
rendent 17 %, 7 en rendent 25 %, 8 en rendent 69 %. Un bassin égal au seuil
demande que les trois cartes soient offertes *et* prises sur 25 tirages, ce qui
n'arrive pas.

**Effet de bord mesuré** : les manches qui ne lisent **aucun** archétype tombent
de 55 % à 40 % en prise au hasard, et de 58 % à 36 % en prise gloutonne. Le
badge parle plus souvent.

**Reste faible, et c'est noté plutôt que corrigé** : *incendiaire* (5 cartes,
17 %) et *acrobat* (7 cartes, 25 %). Ils sont atteignables, contrairement aux
deux corrigés ; en jouant pour *acrobat* on finit d'ailleurs plus souvent
*sniper* (14 %) qu'*acrobat*. À trancher en jouant, pas au banc.

## Réglages

Tout est en haut de `shared/game_state.js`, dans `CFG` — **156 constantes**, dont
voici les seules qui se règlent à la main. Les valeurs ci-dessous sont relues sur
le code : `npm run constantes-check` attrape une constante sans lecteur, il
n'attrape pas une documentation qui invente une constante.

```js
ARENA_W / ARENA_H       // 4800 x 2700
VIEW_W / VIEW_H         // 1600 x 900 — la vue, et l'unite du filtrage reseau
PLAYER_SPEED: 260
DASH_TIME / DASH_CD: 0.18 s / 3 s   // duree du bond, puis recharge
DASH_SPEED: 900         // 162 px parcourus
DASH_CD_MIN: 0.3        // plancher de recharge, cartes cumulees
REVIVE_RADIUS: 96       // distance a laquelle on peut relever
REVIVE_TIME: 1.0        // secondes, divisees par le nombre de sauveteurs
REVIVE_HP_RATIO: 0.45   // part des PV max rendus au releve
RESUME_GRACE: 0.6       // un ecran ne tue pas : `_hurt` inerte a la reprise

ELITE_FROM: 40          // premiere elite, en secondes
ELITE_MIN / MAX: 22-34  // secondes entre deux elites
ELITE_HP_MUL: 3         // et butin garanti
ENEMY_HP_BASE: 16       // PV a la minute 0
ENEMY_HP_MIN_RAMP: 7    // PV gagnes par minute de horde
ENEMY_SPEED_RAMP_PCT: 0.007   // vitesse gagnee par minute
MAX_ENEMIES_BASE: 220   // plafond de reference, solo, normal
MAX_ENEMIES_DIFF: [0.80, 1.00, 1.45]  // par mode
MAX_ENEMIES_HARD_CAP: 900             // limite du MOTEUR, reglee au profileur
WAVE_CROWD_EXP: 0.75    // budget de pression x joueurs^0.75
WAVE_ELITE_CROWD_EXP: 0.75            // part d'elites, meme exposant
CROWD_HYSTERESIS: 8     // secondes avant qu'un depart change l'effectif

LEVEL_MAX: 30           // plafond — un niveau = une carte
LEVEL_XP_BASE: 330      // XP du premier palier
LEVEL_XP_GROWTH: 1.10   // cout de chaque palier suivant
XP_CROWD_EXP: 0.75      // PARTAGE de l'XP par effectif — separe du budget
XP_MINUTE_GROWTH: 1.055 // valeur d'un corps, par minute de horde
XP_LEVEL_GROWTH: 1      // ... et par niveau d'equipe (neutre aujourd'hui)
BOSS_XP_BASE: 300       // XP d'un boss, versee AU PRORATA des degats

POWERUP_MIN / MAX: 18-26 // secondes entre deux bonus au sol
POWERUP_LIFE: 22        // duree de vie au sol, raccourcie par la cendre
POWERUP_MAX_GROUND: 2   // bonus presents au sol simultanement — FRAGMENTS EXCLUS
POWERUP_PART_MIN: 0.04  // plancher de PART : aucun type ne cesse d'etre tirable
POWERUP_FOULE: 28       // corps par joueur vivant qui valent « la horde est dense »
FRAGMENT_MAX_GROUND: 6  // les fragments de la carte Recolte, plafond separe
BUFF_TIME: 14           // duree des bonus
HARVEST_MIN / MAX: 25-45 // secondes entre deux cristaux
HARVEST_MAX_GROUND: 4   // cristaux simultanes
HARVEST_CRYSTAL_HP: 60  // PV d'un cristal, entames par TOUTE arme
HARVEST_YIELD_MIN / MAX: 8-17   // eclats rendus

BOSS_HP_BASE: 520       // PV de reference, avant joueurs / puissance / difficulte
BOSS_BARS: 5            // barres de vie, une mecanique de plus par barre brisee
BOSS_HP_MUL: 2.6        // du boss de segment au boss FINAL
BOSS_HP_MINUTE_RAMP: 0.055      // croissance d'un boss au suivant, par minute
BOSS_POWER_REF: 2.89    // puissance d'equipe de reference
BOSS_POWER_KNEE / K: 2.5 / 0.5  // au-dela du genou, la puissance compte a moitie
BOSS_SUMMON_EVERY: 15   // intervalle des renforts pendant le combat
BOSS_ADD_CAP_BASE: 42   // plafond des renforts, solo
BOSS_REPRISE_TIME / MUL: 45 s / 3   // la horde reprend, triplee, apres un boss
GRID_COLS / ROWS: 4 x 3 // decoupe du damier
SWEEP_BLADES: 12        // pales du balayage

FIRE_INTERVAL: 0.16     // intervalle de tir, fixe : il ne progresse plus seul
FIRE_INTERVAL_MIN: 0.05 // plancher, cartes et bonus cumules
TURRET_LIFE / RANGE: 20 s / 350 px
RICOCHET_RADIUS: 250    // portee d'un saut de chaine
SHIELD_POOL: 80         // reserve du bouclier
SLOW_TIME / SLOW_MUL: 7 s / 0.45    // duree et vitesse pendant le ralentissement
NOVA_RADIUS: 430        // portee de l'onde de choc
```

**Le rythme de la manche n'est plus dans `CFG`.** Il n'y a ni `BOSS_FIRST`, ni
`BOSS_EVERY`, ni aucune constante `WAVE_BUDGET_*` : depuis le passage au script
(0.7.1), la cadence vient de `shared/timeline.js` — `TL_CFG.SEGMENTS = 6` fois
`SEGMENT_TIME = 300 s`, `BEATS = 5` battements de `BEAT_TIME = 60 s` par segment,
et un boss à la fin de chaque segment. Le débit d'apparition est **lu sur le
battement**, pas calculé :

```js
const entry = this._beat();
const rate = entry.rate * (ev ? ev.rateMul : 1)
  * Math.pow(crowd, CFG.WAVE_CROWD_EXP) * this.diff.spawn
  * (this.repriseT > 0 ? CFG.BOSS_REPRISE_MUL : 1);
```

Les PV d'un corps, eux, ne dependent que de la minute de horde :
`(ENEMY_HP_BASE + minute × ENEMY_HP_MIN_RAMP) × diff.hp`.

Le nombre de joueurs entre en `crowd^0.75` : à quatre, la pression monte sans
devenir quatre fois plus forte. **`WAVE_CROWD_EXP` et `XP_CROWD_EXP` sont deux
leviers distincts depuis 0.33.0** — le premier gouverne la pression, le second le
partage de la récompense ; les confondre rendait les deux inréglables.

Le levier qui compte reste **le débit d'apparition, pas les PV** : baisser la
rampe de PV seule ne rallonge la survie que de quelques secondes, là où le débit
la déplace de trente. C'est la densité qui tue, pas la résistance.

Les valeurs propres aux cartes vivent dans `CARD_CFG`, en haut de
`shared/cards.js`, celles des compétences dans `SKILL_CFG` (`shared/classes.js`),
celles des états dans `STATUS_CFG` (`shared/statuses.js`) et celles des boss dans
`BOSS_CFG` (`shared/bosses.js`) — pour que ces modules ne dépendent de rien :
`game_state.js` les importe, l'inverse créerait un cycle.

Les réglages des états, dans `STATUS_CFG` :

```js
VULN_PER_STACK: 0.25    // dégâts subis en plus, par cumul (3 au maximum)
BURN_DPS: 6             // dégâts par seconde
ROOT_SLOW: 0.40         // part de vitesse perdue
PURGE_WINDOW: 3         // secondes de lien CONTINU qui purgent un etat
ELITE_STATUS_CD: 4      // secondes entre deux applications par la même élite
BOSS_MIASMA_EVERY: 25   // usure imposée par les boss qui l'utilisent (lot 4)
PURIFY_CHANCE: 0.06     // ... et 0,16 quand l'équipe n'a pas de soigneur
```

Les réglages des boss et de leurs mécaniques, dans `BOSS_CFG` — les valeurs qui
ont bougé à la mesure portent leur historique en commentaire dans le fichier :

```js
MECH_DAMAGE_RATIO: 0.90  // sanction d'un échec, en part des PV max de la cible
MECH_VULN: 1             // cumuls de Vulnérabilité posés par un échec
STACK_RADIUS: 135        // regroupement : rayon du cercle
SPREAD_MIN: 230          // dispersion : distance minimale entre joueurs
TOWER_RADIUS: 95         // tours : rayon d'une zone à occuper
LINK_BREAK: 300          // lien : distance qui le rompt
JAIL_HP: 240             // cage, avant indexation sur la puissance de l'équipe
GAZE_WARN: 4.0           // regard : décompte, puis UN instant de résolution
GAZE_RATIO: 0.30         // regard : le coup unique, en part des PV max
GAZE_GRACE: 0.2          // regard : détourner une fois dans cette fenêtre suffit
FEED_HEAL: 0.005         // soin par seconde et par rejeton, en part des PV max
TWIN_HEAL: 0.022         // soin mutuel des Jumeaux, à moins de 400 px
ULT_FILL / ULT_DRAIN     // 1/42 par seconde, 1/9 tours tenues
SLIP_ACCEL: 3.4          // sol glissant : plus c'est bas, plus ça patine

PUDDLE_MAX: 25           // flaques simultanées — plafond STRICT, la plus ancienne cède
PUDDLE_LIFE / DOT: 15 s / 20  // durée d'une mare et dégâts par seconde
CONE_R / CONE_SPREAD     // 640 px, demi-angle 0,40 rad (~23°)
PACMAN_R / PACMAN_SAFE   // 700 px, secteur épargné de 0,58 rad (~33°)
CROSSD_LIFE / DOT: 8 s / 26   // croix durable des Jumeaux
SHRINK_STEP / MIN: 0.13 / 0.45 // constriction : palier, puis plancher de l'arène
SHRINK_WARN: 2.4         // annonce d'un palier
QUAD_TIME / QUAD_THICK   // verrouillage : 20 s, murs de 26 px (3 joueurs minimum)
```

Et les réglages génériques des zones, dans `CFG` :

```js
ZONE_TICK: 0.25          // paliers de dégâts d'une zone persistante
ZONE_FORGIVE: 0.9        // rayon de collision / rayon affiché — écart ASSUMÉ
HUNT_CHASE: 165          // vitesse de poursuite de la traque (joueur : 260)
```

Le roster lui-même — verbes, seuils d'effectif, multiplicateurs de PV et
répertoires par barre — vit dans `BOSS_ROSTER`, et les seuils par mécanique dans
`MECHS`, tous deux **tableaux ordonnés dont l'index circule sur le réseau**.

Composition des vagues, dans `ENEMY_TYPES` : `from` (moment d'apparition),
`weight` (poids du tirage) et `share` (quota, en part du plafond).

## Limites connues

- `ws_lite.js` couvre le nécessaire, pas plus : **pas de TLS**, qui est le
  travail du proxy inverse. Il fait en revanche la compression
  (`permessage-deflate`) depuis le lot infra.
- L'évitement entre ennemis passe par une grille spatiale depuis le lot A du plan
  d'équilibrage (`_grille()`). C'est ce qui a permis de relever le plafond de
  population de 200 à 176-900 selon mode et effectif.
- Pas de reprise de partie : une coupure en pleine manche fait perdre la place
  dans la salle en cours. La **session**, elle, se reprend toute seule
  (`loginToken`) — on ne retape pas son mot de passe.
- Pas de récupération de mot de passe autonome : sans email, seul l'opérateur
  peut réinitialiser (`adminPassReset`). Assumé, documenté dans
  `LISEZMOI-BDD.md`.
- Les collisions sont testées par distance, sans balayage continu **en vol** :
  une balle très rapide pourrait traverser un ennemi très fin. Aux vitesses
  actuelles le cas ne se produit pas. Seule l'**apparition** est balayée en
  continu, parce que là le cas se produisait vraiment — voir la séparation
  ennemi/joueur.
- L'évitement ennemi/joueur passe par la même grille, qu'il reconstruit lui-même
  — il est appelé depuis deux endroits (la boucle des ennemis et `_areaPull`), et
  une grille périmée séparerait mal. Deux passes en O(n) contre une passe en
  O(joueurs × ennemis) : le compte y est dès la centaine d'ennemis.
- Les fragments passent **sous** le boss et les barres de vie depuis la bascule
  WebGL, là où le chemin canvas 2D les mettait au-dessus de tout. Les remonter
  demanderait un second contexte WebGL par-dessus la couche 2D supérieure — un
  canvas de plus à composer à chaque image pour quatre cents millisecondes
  d'effet derrière un boss.
- La bascule WebGL s'est arrêtée aux capacités qui servaient déjà à quelque
  chose : teinte, éclair, additif, particules. Restent ouvertes, dans l'ordre du
  rapport effet/effort — la passe de post-traitement (vignettage, aberration
  chromatique à l'impact, étalonnage par difficulté, flou directionnel pendant
  l'esquive), la distorsion du souffle des explosions, et l'échange de palette
  par texture de correspondance pour des variantes d'ennemis sans une seule
  image d'atlas de plus. L'éclairage dynamique est possible mais c'est un
  chantier à part entière, à ne pas embarquer dans la même migration.
