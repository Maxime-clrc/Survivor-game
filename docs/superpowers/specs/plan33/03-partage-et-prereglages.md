# 03 · Partage et préréglages

## Le partage

Les réglages s'exportent en une **chaîne courte** qu'on colle. C'est de la
sérialisation : la liste des rangs tient dans quelques caractères.

**Le vrai usage n'est pas le fun, c'est le protocole d'expérience.**

> « Voici le code, voici la graine, voici le compte rendu »

devient une phrase qui suffit à reproduire une mesure — chez un ami, ou dans une
conversation avec un modèle. C'est le chaînon qui manquait entre le mode custom et
l'outillage du plan 32, et c'est ce qui rend le banc utilisable **à plusieurs**.

## La chaîne porte la version, et ce n'est pas décoratif

`shared/version.js` existe et la convention est établie : minor = plan, patch =
lot.

Un code de mutateurs collé après un changement de table **décale silencieusement
les rangs** : la condition 4 rang 2 devient autre chose, et rien ne le dit. La
chaîne porte donc la version, et le collage refuse — ou avertit — si elle ne
correspond pas.

C'est le genre de défaut qui coûte une soirée de mesure fausse avant qu'on
comprenne.

## Le format

Court, collable, pas cryptique au point d'être indébogable. Un code qu'on peut
lire à voix haute en LAN vaut mieux qu'un code deux fois plus court.

**Ce qu'il porte** : la version, les rangs actifs, et **rien d'autre**. Pas la
graine — elle se partage à côté, parce qu'un réglage et une graine ne se
partagent pas toujours ensemble. Pas le biome, pour la même raison.

## Les préréglages

Trois ou quatre combinaisons nommées, écrites à la main.

Elles ne servent pas à jouer : elles servent à **enseigner le mode** à qui l'ouvre
pour la première fois. Une page de curseurs vierges n'apprend rien ; trois
préréglages montrent ce que le mode sait faire et donnent un point de départ à
modifier.

Deux principes :

- un préréglage doit être **jouable**, pas une démonstration de maximum ;
- ils doivent **couvrir des familles différentes** — un qui joue la horde, un qui
  joue la build, un qui joue les ennemis. Trois variantes de « plus dur » n'
  enseignent rien.

## Critère d'acceptation

1. Exporter puis réimporter un réglage rend **exactement** les mêmes rangs.
2. Un code d'une version différente est refusé ou signalé, jamais appliqué en
   silence.
3. Chaque préréglage est jouable jusqu'au bout par un pilote de banc — c'est un
   test bête et il attrape les combinaisons impossibles.

## Nature de la tâche

Sérialisation : mécanique. Le choix des préréglages est du jugement.
