# 01 · Des conditions à rangs, avec un coût par rang

## Le modèle, et pourquoi pas des curseurs libres

Le **Pacte de Châtiment** de Hades propose quinze conditions, la plupart à
plusieurs rangs. Chaque rang coûte de la **Chaleur**, et la jauge affiche la
difficulté totale. « Travail forcé » rang 1 donne +20 % de dégâts aux ennemis et
coûte 1 ; rang 5 donne +100 % et coûte 5. Certaines conditions coûtent 2 ou 3 par
rang. Tout à fond dépasse 60.

Trois choses que ça donne et qu'un curseur libre ne donne pas :

**Un indice de sévérité qui existe sans être calculé** — c'est la somme des coûts.
Plus honnête qu'un produit de multiplicateurs, parce qu'un coût écrit à la main
peut dire ce qu'un produit ne sait pas dire.

**Un espace fini et comparable** — deux joueurs peuvent se dire « j'ai fait 24 ».

**Des paliers déjà pensés** — un curseur invite à mettre 87 % parce que c'est
possible ; un rang oblige à choisir ce que veut dire chaque cran.

## Les cinq familles, et ce que chacune coûte ici

**HORDE — gratuit.** `spawn` est déjà un multiplicateur du budget ; les élites ont
`ELITE_FROM`, `ELITE_MIN`, `ELITE_MAX`. Plus d'ennemis, apparition accélérée, plus
d'élites : trois nombres. *Contrainte : `MAX_ENEMIES_HARD_CAP`.*

**ENNEMIS — gratuit.** `hp`, `speed`, `dmg` existent. Les comportements passent par
`traits`, table `type → trait`, dont les six valeurs sont **des bits** donc
empilables.

**JOUEURS — presque gratuit, un point de passage à respecter.** PV, dégâts et
vitesse sont des mods. Le multiplicateur de dégâts subis passe par `_hurt()`,
*« ici et nulle part ailleurs »*.

**MONDE — moyen.** Les zones dangereuses sont `HZ_NORMAL` / `HZ_CAUCHEMAR`, tables
par lieu. La fréquence d'événements est `rateMul` dans `EVENTS`.

**BUILD — moyen, et la plus intéressante.** `LEVEL_XP_BASE`, `LEVEL_XP_GROWTH`, le
nombre d'offres de cartes, `drawQuality` : tout est déjà des nombres. C'est la
famille qui produit les expériences les plus différentes pour le moins de code.

## Le vrai travail : combien de rangs, et quel coût

**Viser huit à dix conditions** pour commencer, réparties sur les cinq familles.
Hades en a quinze après des années.

**Le coût d'un rang est un jugement, pas un calcul.** C'est tout le travail de
conception du mode, et il ne se délègue pas. Deux repères :

- un rang qui change peu doit coûter peu, mais **jamais zéro** — un rang gratuit
  est toujours pris ;
- un rang dont l'effet dépend fortement de la build doit coûter **cher**, parce
  qu'il sera pris par ceux à qui il ne coûte rien.

## L'avertissement que Hades donne lui-même, et il vaut double ici

Son wiki le dit : *beaucoup de conditions sont presque sans effet contre une
build et extrêmement dures contre une autre.*

Avec **dix armes et trois classes**, « +50 % vitesse ennemie » ne veut pas dire la
même chose pour un laser (`ech.cadence = 0`) que pour un railgun
(`ech.portee = 1,8`). L'indice de sévérité est donc une **approximation**, et il
faut le présenter comme telle — pas comme une difficulté objective.

C'est aussi ce qui rend le mode utile pour l'équilibrage : un mutateur dont la
sévérité varie de trois à un selon l'arme **est** un résultat de mesure.

## Le plancher : plus facile que calme, mais pas beaucoup

Calme est déjà à `hp 0,80`, `spawn 0,72`, `dmg 0,70`, `MAX_ENEMIES_DIFF 0,80`.
Descendre franchement en dessous ne produit plus une partie mais une
démonstration.

Des rangs négatifs existent donc, **un ou deux crans sous la référence, pas
cinq**. L'indice de sévérité descend sous zéro, ce qui le dit clairement.

## Le script est une condition comme les autres

`SCRIPTS` a trois variantes — `calme`, `normal`, `cauchemar` — indexées par
difficulté. En faire un choix donne accès à des combinaisons qu'aucun mode ne
permet : « courbe calme, ennemis de cauchemar ».

C'est une ligne d'interface et ça multiplie par trois l'espace du mode.

## Critère d'acceptation

1. La table est **déclarative** : conditions, rangs, effets, coûts. Aucune logique
   dans la table.
2. Un vérificateur `verifierConditions()` : aucun rang à coût nul, aucun rang dont
   l'effet est identique au précédent, et le maximum global est atteignable sans
   dépasser `MAX_ENEMIES_HARD_CAP`.
3. Chaque effet se branche sur un levier **existant** — si un rang demande du code
   neuf, il sort de ce lot.

## Nature de la tâche

Conception pure. **Fil principal**, du début à la fin.
