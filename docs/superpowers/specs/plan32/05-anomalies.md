# 05 · Le compte rendu cherche de lui-même

C'est la section qui vaut le plus cher et que personne n'écrit jamais.

## Le principe

> « Trois images au-dessus de 33 ms, toutes pendant une nova à 190 corps » est une
> information. Un tableau de 1 800 durées d'image n'en est pas une.

Le compte rendu ne doit pas seulement présenter des chiffres : il doit **chercher
ce qui cloche** et le dire en une ligne, avec son contexte.

## Les anomalies à détecter, et ce qu'elles disent

**Images au-dessus de 33 ms, avec le contexte de cet instant.** C'est la première
et la plus utile. La trace serveur sait ce qui se passait à la seconde près —
population, événement, boss, mécanique posée, météo. Croiser les deux est
exactement ce que le plan 32 rend possible.

**Population au plafond pendant plus de N secondes.** `_enemyCap()` atteint et
tenu veut dire que le budget de spawn demande plus que le moteur ne rend : la
difficulté cesse d'augmenter sans que personne le voie.

**Joueur à terre plus de N secondes.** Avec `REVIVE_RADIUS = 96`, un joueur à
terre longtemps veut dire que personne n'a pu venir — et sur la map cible ça
deviendra fréquent. C'est la métrique qui dira si l'isolement est trop puni.

**Arme muette.** Un joueur dont les dégâts infligés restent nuls pendant un
intervalle : soit il est à terre, soit son arme ne peut pas atteindre ce qui est
là, soit il y a un défaut. Les trois valent d'être vus.

**Mécanique de boss jamais déclenchée.** La trace pose déjà les lignes de pose et
d'échec. Une mécanique qui ne se pose jamais sur une manche entière est un
réglage mort.

**Ennemi dont la mécanique n'est jamais observée.** Le pendant du point précédent,
côté horde. C'est la mesure que le brainstorm demandait au §14 et qui n'a jamais
été écrite : temps de survie médian d'un type contre temps nécessaire pour
déclencher son verbe. Un type qui meurt avant d'agir n'a pas d'identité.

**Tension plate.** Si `tensionMoy` reste sous le seuil bas plus de N secondes
d'affilée, la manche est plate à cet endroit — et on le saura **avant** que le
Director existe.

## La règle qui garde la section utile

**Une anomalie non détectée est un défaut ; une anomalie détectée trop souvent est
un bruit.** Si une ligne apparaît dans tous les comptes rendus, ce n'est plus une
anomalie, c'est un réglage à corriger — ou un seuil à relever.

Les seuils sont donc des constantes déclarées, pas des nombres écrits dans le
code de détection.

## Critère d'acceptation

1. Une manche saine produit une section anomalies **vide ou presque**. C'est le
   critère principal : une section toujours pleine ne sera plus lue.
2. Une manche fabriquée avec un défaut connu — population forcée au plafond, un
   joueur laissé à terre — le fait apparaître.
3. Chaque anomalie porte **son contexte**, pas seulement son moment.

## Nature de la tâche

Conception : quelles anomalies, quels seuils, quel contexte joindre. C'est du
jugement d'un bout à l'autre. **Fil principal.**
