# Les profils de référence

**Document transversal.** Il ne s'exécute pas : il définit la grandeur à laquelle
tous les critères d'acceptation des lots A à G se lisent.

## Le manque qu'il comble

Les lots parlent de « build médiane » et de « manche complète » **sans jamais
dire à quel niveau de compte**. C'est un trou : dans un survivor, perdre ses
premières parties est le fonctionnement normal, et la progression permanente est
ce qui finit par ouvrir la fin de la manche. Un TTK mesuré sur un compte complet
et un TTK mesuré sur un compte neuf ne décrivent pas le même jeu.

## Ce que l'architecture fait déjà bien

Le dépôt a déjà pris la bonne décision structurante, et elle est explicite :

> En AVAL de `fullMods` et jamais dedans : `p.powerMods` garde le résultat de
> `fullMods` (cartes + classe), c'est lui que lit `_playerPower` — **la méta est
> ainsi exclue de la difficulté par construction, pas par soustraction.**

Conséquence : les PV de boss ne compensent **jamais** la progression de compte.
La méta est de la puissance **pure et non taxée**. C'est exactement ce qu'il faut
pour que « améliorer son personnage finisse par ouvrir la fin » soit vrai.

**Le problème n'est donc pas la structure, c'est la magnitude** — voir lot G.

## Les trois profils

| | P0 · compte neuf | P1 · compte engagé | P2 · compte complet |
|---|---|---|---|
| parties jouées | 0 à 5 | ~30 | ~130 |
| paliers d'arbre | 0 à 1 par ligne | 3 par ligne | 5 partout |
| noyaux dépensés | 0 à 1 200 | ~9 000 | 41 400 |
| **gain de puissance méta** | **×1,00 à 1,08** | **×1,25** | **×1,45** |
| emplacements | 3 | 4 à 5 | 6 |
| `CONFORT` | aucun | relance + 4ᵉ offre | les trois |
| jalons de cartes | aucun | quelques-uns | tous |

*Calcul de la magnitude (classe dps, paliers pleins) :* `calibre` +20 % de
dégâts, `precision` +10 points de critique, `letalite` +40 % de dégâts critiques,
`munitions` +30 % de portée. Soit **×1,38 de DPS**, ~×1,45 en tenant compte de la
portée. Côté tank : +30 % de PV et −9,6 % de dégâts subis, soit **×1,44 de PV
effectifs**. Les deux classes convergent, ce qui est bon signe.

*Calcul du temps :* `TIER_COSTS` totalise 6 900 par ligne, six lignes par classe
= **41 400 noyaux**. À 307 noyaux pour une manche médiane, **135 parties** pour
compléter une classe. Le premier palier des six lignes coûte 1 200, soit
**4 parties** — la grille est géométrique, donc l'essentiel du gain arrive tôt.

---

## La matrice de cohérence

C'est le « juste milieu » : chaque difficulté est **résolue à un profil donné**,
et l'échelle des trois modes épouse l'échelle des trois profils.

**Exprimée en TAUX DE RÉUSSITE**, et non en « segment atteint ». C'est la seule
forme qui capture l'intention : calme doit être **possible sans être fiable**
pour un compte neuf. Un taux se mesure ; « termine en jouant bien » ne se mesure
pas.

| | calme | normal | cauchemar |
|---|---|---|---|
| **P0** compte neuf | **20-30 %** | 5 % | ~0 % |
| **P1** ~30 parties | 70 % | **45-60 %** | 5-10 % |
| **P2** compte complet | 90 % | 75 % | **25-35 %** |

*(cellules en gras : la case pour laquelle chaque difficulté est conçue)*

Trois lectures à en tirer.

**Calme ne demande aucune méta, mais demande de bien jouer ET d'avoir un bon
build.** Les 20-30 % sont le chiffre qui dit exactement ça : un bon joueur sans
un seul noyau dépensé y arrive, mais pas à tous les coups — il lui faut aussi
que les tirages coopèrent. C'est l'issue de secours du genre : sans elle, les
premières heures sont une punition sans porte de sortie. Au-dessus de 40 %, la
progression permanente perd sa raison d'être ; en dessous de 15 %, un débutant ne
voit jamais la fin de rien.

**Normal est le mode où les améliorations deviennent nécessaires.** Un compte
neuf y plafonne à 5 % — assez pour que ce ne soit pas un mur absolu, trop peu
pour en faire le mode d'entrée. C'est là que la boucle « je perds, j'achète, je
reviens plus fort » prend son sens.

**Cauchemar est le vrai défi, et il le reste même à P2.** 25-35 % pour un compte
complet : la progression permanente ouvre la porte, elle ne garantit pas la
victoire. Un mode que le compte complet gagnerait à 80 % ne serait plus un défi,
ce serait une formalité avec un temps d'attente.

---

## Le profil auquel chaque critère se mesure

| lot | critère | profil | pourquoi |
|---|---|---|---|
| — | **taux de réussite de la matrice** | les trois | le critère de clôture du plan |
| A | parité de cartes 1↔4 joueurs (±2) | **P1** | le cas nominal |
| A | temps de première saturation > min 12 | indifférent | ne dépend pas du joueur |
| B | doctrine des 90 % de `PLAYER_SPEED` | indifférent | c'est une propriété des monstres |
| B | **décrocher sans carte de mobilité** | **P0** | c'est un **plancher garanti** : la fuite ne doit jamais dépendre d'un achat |
| B | mort médiane en solo après le segment 3 | **P0** | c'est le profil qui meurt |
| C | TTK d'un grunt entre 0,15 et 0,60 s | **P1** | « build médiane » = joueur médian |
| C | `BOSS_POWER_REF` remesuré | **P1** | et la mesure doit **exclure la méta**, comme le fait déjà `_playerPower` |
| D | écart-type des cartes sous 3 | **P1** | — |
| D | répartition des niveaux | **P1** | — |
| F | 6 reliques achetées par manche | **P1** | — |
| G | plafond de noyaux ne mord qu'en cauchemar complet | **P1 → P2** | c'est la trajectoire, pas un point |

**Deux règles générales**, à retenir plus que le tableau :

- un critère de **plancher** (« ceci doit rester possible ») se mesure toujours à
  **P0**, sinon on garantit quelque chose qu'un débutant n'a pas ;
- un critère d'**étalonnage** (« ceci doit valoir tant ») se mesure toujours à
  **P1**, sinon on calibre le jeu pour une minorité.

---

## La vérification qui manquait au plan

Les lots A à D se compensent : A ajoute des ennemis, B et C en retirent la
vitesse et les PV. **Le net sur P0 n'est écrit nulle part.**

Nouveau critère, transversal, à mesurer après C :

> **P0 en normal ne doit pas reculer.** Si un compte neuf atteignait le segment 3
> avant le plan et le segment 2 après, le plan a échoué même si tous les critères
> individuels des lots A, B et C sont verts.

C'est le seul critère du plan qui porte sur l'**ensemble** plutôt que sur un lot,
et c'est celui qui protège du piège le plus banal d'un chantier d'équilibrage :
sept lots corrects dont la somme est mauvaise.
