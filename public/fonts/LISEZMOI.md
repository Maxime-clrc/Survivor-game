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
| `Barlow-Regular.woff2` | Barlow | 400 | paragraphes, et eux seuls |

La chasse fixe (`--font`) reste le **registre du jeu** : elle garde tous les
chiffres, les effectifs, les pourcentages, les libellés techniques et les
pastilles d'état. Ces deux familles n'existent que parce que la chasse fixe
aplatit les contrastes de forme — en chasse fixe, un titre de 26 px et un
paragraphe de 15 px se ressemblent bien plus que dans deux familles
différentes, et l'écran n'avait donc aucun point d'entrée pour le regard.

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
- Barlow — Copyright 2017 The Barlow Project Authors
  (https://github.com/jpt/barlow)

## Remplacer un fichier

Le nom du fichier est écrit dans les `@font-face` en tête de
`public/css/menus.css`. Garder les mêmes noms évite d'y toucher. Sans les
fichiers, la page reste fonctionnelle : `--font-display` et `--font-body`
retombent respectivement sur `var(--font)` et `system-ui`.
