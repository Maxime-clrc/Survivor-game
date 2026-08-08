# Polices des menus

Trois fichiers, 42 Ko au total. Ils sont **versionnés avec le jeu** et non
chargés depuis Google : une dépendance à un tiers ajoute un point de panne et
une latence au premier rendu sur un chemin critique — l'écran de connexion.
`server.js` sert déjà `public/` en statique, il n'y a rien à router (le type
MIME `.woff2` y est déclaré).

| Fichier | Famille | Graisse | Usage |
| --- | --- | --- | --- |
| `ChakraPetch-Bold.woff2` | Chakra Petch | 700 | titres d'écran, boutons d'action, noms de classe |
| `ChakraPetch-SemiBold.woff2` | Chakra Petch | 600 | onglets, segment de difficulté |
| `SpaceGrotesk-Variable.woff2` | Space Grotesk | 300 → 700 | paragraphes, et eux seuls |

La chasse fixe (`--font`) reste le **registre du jeu** : elle garde tous les
chiffres, les effectifs, les pourcentages, les libellés techniques et les
pastilles d'état. Ces deux familles n'existent que parce que la chasse fixe
aplatit les contrastes de forme — en chasse fixe, un titre de 26 px et un
paragraphe de 15 px se ressemblent bien plus que dans deux familles
différentes, et l'écran n'avait donc aucun point d'entrée pour le regard.

## Pourquoi Space Grotesk a remplacé Barlow

La raison n'est pas le goût. Barlow était la seule des trois familles qui ne
**disait** rien : une grotesque neutre, dessinée pour ne pas se faire remarquer,
entre une chasse fixe qui signe « poste de contrôle » et une Chakra Petch qui
signe « technique ». Le corps de texte était donc le seul endroit de l'écran où
le jeu ressemblait à un site.

Space Grotesk vient du même monde que les deux autres — terminaisons coupées
net, `g` à un seul étage, chiffres anguleux — sans copier Chakra Petch : celle-ci
est étroite et titrée, celle-là est large et se lit en petit corps.

Elle corrige aussi un vrai défaut de lisibilité, et c'est le fichier **variable**
qui le permet. Un texte clair sur fond sombre s'amincit optiquement : à graisse
égale, il paraît plus fin que le même texte en sombre sur clair. Barlow n'avait
que son Regular versionné, donc rien à faire — demander 500 aurait produit un
faux gras. L'axe de graisse rend un poids **intermédiaire** possible
(`--weight-body: 450`), pour un seul fichier.

Le `@font-face` déclare donc une **plage** (`font-weight: 300 700`) et non une
valeur : c'est elle qui autorise le navigateur à interpoler.

L'interligne des paragraphes est passé de 1,7 à **1,6** en même temps, et les
deux vont ensemble : 1,7 était juste pour Barlow, dont la hauteur d'x est basse.
Space Grotesk a une hauteur d'x nettement plus grande — mesurée à 8 px pour un
corps de 15 — donc le même 1,7 délite le paragraphe au lieu de l'aérer.

## Sous-ensemble

Chaque fichier est le sous-ensemble **latin** de Google Fonts
(`U+0000-00FF` et la ponctuation générale), et non la famille complète : il
couvre tous les accents du français, l'espace insécable, le point médian
`·` (U+00B7), le tiret cadratin `—` (U+2014) et le signe `×` (U+00D7), soit
tout ce que l'interface écrit. La famille entière pèse plusieurs fois ce
poids pour du thaï, du vietnamien et du latin étendu qui ne sortiront jamais.

Les rares glyphes hors sous-ensemble — `⚿` du cadenas de salle, l'exposant
`ᵉ` de « 3ᵉ carte » — retombent sur la police système, ce qui est le
comportement voulu : ils vivent dans des éléments qui restent en chasse fixe.

## Licence

Les deux familles sont sous **SIL Open Font License 1.1**, qui autorise la
redistribution avec le logiciel. Le texte intégral est dans `OFL.txt`.

- Chakra Petch — Copyright 2018 The Chakra Petch Project Authors
  (https://github.com/m4rc1e/Chakra-Petch)
- Space Grotesk — Copyright 2020 The Space Grotesk Project Authors
  (https://github.com/floriankarsten/space-grotesk)

## Remplacer un fichier

Le nom du fichier est écrit dans les `@font-face` en tête de
`public/css/menus.css`. Garder les mêmes noms évite d'y toucher. Sans les
fichiers, la page reste fonctionnelle : `--font-display` et `--font-body`
retombent respectivement sur `var(--font)` et `system-ui`.
