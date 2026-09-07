# 01 · Quatre variantes par thème

## Le mécanisme existe à moitié

`buildBiome()` pave l'arène en cellules de la taille d'une vue
(`cols = round(arenaW / viewW)`, donc 3 × 3 aujourd'hui) et rejoue la **même**
table `OBSTACLES[thème]` dans chaque cellule, sous quatre orientations miroir
(`(cx+cy)&1`, `(cx*2+cy)&1`).

Une variante est donc **une table de plus dans le tableau du thème** :

```js
for (const o of OBSTACLES[def.key])              // aujourd hui
for (const o of VARIANTES[def.key][choix(...)])  // demain
```

Le reste du générateur ne bouge pas.

**Deux propriétés vérifiées qui aident :**

- **le budget de surface est invariant d'échelle.** `obsArea / surface` se réduit à
  `Σ(o.w × o.h)`, indépendant de la taille de l'arène. Agrandir ne vide pas les
  cellules du fond. L'usine est à 0,053 pour un plafond de `OBSTACLE_SURFACE_MAX
  = 0,10` ;
- **le champ `min` existe déjà** sur chaque entrée — le mode à partir duquel elle
  apparaît. Les variantes en héritent gratuitement.

## Le modèle : gabarits, pas WaveFunctionCollapse

Spelunky découpe son niveau en salles tirées d'une liste de **gabarits**
pré-écrits, chacun mêlant du terrain fixe et des emplacements où un obstacle est
tiré. C'est ce modèle-là qui colle ; WFC résout une grille entière sous contrainte
et se borne mal.

Trois idées, par ordre de coût :

**1 · Plusieurs gabarits par thème.** `OBSTACLES.nebuleuse` devient
`OBSTACLES.nebuleuse[0..3]`. Une dimension de tableau.

**2 · Des emplacements variables dans le gabarit.** Une entrée porte une **liste**
de `kind` au lieu d'un seul, ou une probabilité de présence. Deux régions du même
gabarit ne se ressemblent plus tout à fait, et le nombre de combinaisons explose
sans qu'on écrive une table de plus.

**3 · Les bords se déclarent.** Le problème des transitions est un problème de
**Wang tiles** : deux régions voisines doivent s'accorder sur l'arête partagée. La
solution est de ne pas laisser l'assembleur deviner — **chaque variante déclare
l'état de ses quatre bords** (ouvert, encombré, mur), et l'assembleur ne place que
des variantes compatibles avec le voisin déjà posé.

Sur un 2 × 2, il n'y a que **quatre arêtes internes**. Quatre contraintes se
résolvent sans solveur.

## La règle qui prime : pas de couloirs

**Ça reste un jeu de horde.** Une variante qui étrangle le passage détruit le jeu :
la horde s'accumule derrière un goulot, le joueur tire dans un entonnoir, et le
kiting — le geste central — devient impossible.

Trois garde-fous, dont deux existent :

- `OBSTACLE_SURFACE_MAX = 0,10`, invariant d'échelle ;
- `NAV_CFG.PASSAGE_MIN` et `verifierBiomes()`, qui rejoue déjà la traversabilité du
  carré central à chaque graine **et à chaque mode** ;
- **manquant** : une mesure de **largeur minimale de passage** sur toute la région,
  pas seulement au centre. C'est elle qui refuserait un couloir avant qu'on le voie
  en jeu.

Le dépôt a payé ce défaut une fois : une géométrie à conduites parallèles a produit
*« le seul abri parfait du dépôt »*, avec un contact en **119 s** au lieu de 4,4 s.
C'est la mesure de référence de « trop fermé ».

## Le garde-fou symétrique de celui qui existe

`signatureBiome()` mesure la loi d'implantation d'un lieu, avec la règle :
*« deux lieux avec la même implantation sont le même lieu, quelle que soit la
couleur du sol »*. Pour les variantes, il faut la version **bornée des deux
côtés** :

> deux variantes d'un même thème doivent différer **assez** pour se distinguer, et
> **pas trop** pour rester dans le thème.

Un plancher et un plafond sur la même mesure, avec l'instrument qui existe.
Sans le plafond, les variantes dérivent en lieux déguisés et le thème se dissout.

## Les seize variantes

Écrites comme des **lois d'implantation**, pas comme des décors. Le commentaire
d'`OBSTACLES` le dit déjà : *« ce qui change est ce qu'il y a, pas la taille de ce
qu'il y a »* — un facteur d'échelle donne la même arène grossie, donc le même
parcours.

**NÉBULEUSE** *(dériver)* — la dérive (loi actuelle) · le champ d'épaves (beaucoup
de petits éclats, aucune grosse masse : rien ne cache, tout accroche) · les grands
fragments (trois masses énormes très espacées : peu de choses, chaque contournement
est long) · la brèche (bâti concentré sur un bord, l'autre ouvert sur le vide).

**USINE** *(fabriquer)* — la chaîne (loi actuelle) · le carrefour (deux allées
larges qui se croisent, quatre îlots) · l'atelier (semis dense de petits postes,
beaucoup d'angles, rien qui bloque) · le dégagement (presque vide, quelques masses
isolées — la respiration du thème).

**FONDERIE** *(couler)* — la coulée (loi actuelle, passage élargi) · les cuves (six
masses moyennes, aucun axe) · le refroidissement (masses courtes en quinconce,
écart calibré **au double** de `PASSAGE_MIN` — c'est la géométrie de l'abri
parfait, elle ne revient qu'avec cette contrainte explicite) · le puits (une masse
centrale massive, le reste dégagé).

**FRICHE** *(pourrir)* — le champ (loi actuelle, avec sa gigue de 40 px) · le mur
(une longue ruine avec **plusieurs** brèches larges) · le cratère (vide au centre,
dense au pourtour — l'inverse de la loi du thème) · l'effondrement (masses de
toutes tailles, sans loi apparente).

**SECTEUR** *(s'adresser à vous)* — la rue (loi actuelle) · la place (ouvert au
centre, encombré au pourtour) · le marché (semis serré de petites structures) · le
parvis (presque vide, deux masses monumentales).

**Quatre par thème** donnent **seize visages** avec les quatre orientations miroir,
pour quatre régions. La répétition ne se voit pas.

## Critère d'acceptation

1. `verifierBiomes()` reste vert sur les **vingt** variantes, aux trois modes et
   sur cinquante graines.
2. Le nouveau vérificateur de largeur de passage est vert partout, pas seulement au
   centre.
3. La signature de deux variantes d'un thème est **entre** le plancher et le
   plafond. Deux variantes trop proches sont un doublon ; trop loin, un autre lieu.
4. Deux régions voisines ont des bords compatibles, sur cinquante graines.

## Nature de la tâche

Les tables sont de la donnée et se délèguent une fois écrites. **Les lois
d'implantation et les deux nouveaux vérificateurs sont de la conception** : fil
principal.
