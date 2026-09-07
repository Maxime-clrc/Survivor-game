# Plan 30 — ce que le lot 5 du plan 29 a déplacé

Le plan 29 s'est terminé sur **trois vérificateurs rouges**, trouvés chacun par
hasard en cherchant autre chose. Ils pointent tous vers le même changement : le
lot 5 a densifié la mi-manche de **+17 %** (chantier 03), et personne n'a rejoué
ce qui en dépendait.

Ce n'est pas une régression à annuler : la densité était le but, et elle est
mesurée bonne. Ce plan **réabsorbe ses effets de second ordre**.

## Ordre, et pourquoi

```
01 progression   ← EN AMONT : plus de kills = plus d'XP = plus de cartes
02 boss          ← dépend de 01 : une build plus forte raccourcit les combats
03 armes         ← EN DERNIER : la cible se mesure sur une horde stabilisée
```

Corriger les armes en premier reviendrait à les calibrer contre une courbe
d'XP qu'on s'apprête à changer.

## 01 · La courbe de niveau monte trop vite

`verifierProgression()` — cibles niveau **10 / 20 / 27** aux minutes **8 / 20 /
32**, tolérance ±1 :

| | min 8 | min 20 | min 32 |
|---|---:|---:|---:|
| solo | ok | **25** | **30** |
| ×4 | **11,5** | **26,5** | **30** |

Le plafond (`LEVEL_MAX: 30`) est atteint **avant** la minute 32, donc la fin de
manche ne progresse plus. Écart-type de cartes à quatre : **3,7** pour un
plafond de 3.

**Piège de méthode déjà payé** : à 3 manches la mesure n'est pas monotone —
1,12 rend un niveau *plus haut* que 1,10 à quatre joueurs. Le système a une
rétroaction (niveaux → cartes → kills → XP) et la variance du script domine.
Tout réglage se valide à **6 manches au moins**, et à graines appariées.

## 02 · Les combats de boss raccourcissent

`verifierBoss()`, cinq constats réels :

- 79 s au premier boss contre 55 s au dernier — dérive 20 %, dans le mauvais sens ;
- boss du segment 1 à quatre : 95 s, hors de [50, 90] ;
- boss final à quatre : 173 s, hors de [94, 168] ;
- emportement : 29,4 % des combats pour un plafond de 25 % ;
- renforts : 0,19 à 0,42 par joueur et par seconde selon l'effectif, 58 % d'écart.

**Deux constats de plus n'en sont pas** : « critère par boss NON MESURÉ, moins
de 8 combats ». Le vérificateur mélange *rouge* et *je n'ai pas pu mesurer*, et
compte sept problèmes là où il y en a cinq. À séparer — c'est aussi ce qui rend
`npm run verif-tout` illisible.

## 03 · Cinq armes hors tolérance

`verifierEquilibreArmes(3, 10)`, tolérance 0,05 :

| lame | laser | siège | dispersion | précision |
|---:|---:|---:|---:|---:|
| **+21** | **+18** | **−13** | **−14** | −5 |

La **lame** n'était pas dans le tableau du plan 29 : elle est sortie *pendant*
le plan. Railgun et grenade y sont rentrés. Le sens suit la densité — les armes
de zone montent, les armes à cible unique descendent.

**Ne pas ajouter de contenu** avant d'avoir isolé le levier : la règle du plan
29 vaut toujours.

## Ce que ce plan ne traite pas

- `prospecteur` et `marchand` (hauts faits) restent non concluants : le pilote
  ne récolte pas et achète peu. Il faut un pilote qui joue l'économie, pas un
  seuil différent.
- `ballesLourdes` est un bonus pur pour le laser, qui ne lit pas la cadence.
  Connu, mesuré, hors périmètre.

## La réserve : ces valeurs ont une date de péremption

**Inscrit le 4 septembre 2026, avant le premier lot du plan 31** (corvée C2 de
`docs/superpowers/specs/EXECUTION.md`).

Tout ce que ce plan calibre — courbe de niveau, PV et durée des combats de boss,
équilibre des dix armes — suppose que **toute la puissance d'un joueur vient des
niveaux, des cartes et des reliques**. C'est vrai aujourd'hui ; ça cessera de
l'être au **plan 35**, qui ajoute le loot de run : une source de puissance
individuelle, ramassée en manche, que rien de ce plan n'a vue.

> Les valeurs de ce plan sont à **remesurer, pas à reconduire**, après le
> plan 35 lot 02.

Concrètement, le lot 04 du plan 35 (« l'équilibrage ») rejoue
`verifierProgression`, `verifierBoss` et `verifierEquilibreArmes` **contre la
nouvelle base**. Un écart trouvé là-bas n'est pas une régression de ce plan-ci :
c'est le prix du loot, et c'est la barrière **B9**.

Deuxième péremption, plus proche : le lot 02 du **plan 31** donne à chaque salle
son propre générateur. Toutes les suites de tirage se décalent — les mesures
restent dans leurs bornes, mais elles **bougent**, et il faut savoir de combien
avant de crier à la régression.
