# 10 · Mort, bilan, lecture du build — une donnée manquante, deux écrans qui en dépendent

## 10a · Attribution des dégâts (la donnée manquante)

Rien dans le dépôt ne porte de **cause de mort**. `bilanHurt` existe, donc les
dégâts subis sont agrégés — mais **pas attribués à une source**.

C'est le point d'entrée : sans attribution, ni l'analyse de mort ni
l'enrichissement du bilan ne sont possibles.

### Étapes

1. Au point où les dégâts joueur sont appliqués, enregistrer la **source** dans
   une catégorie courte et stable : horde, boss, danger de biome, projectile,
   élite. Cinq catégories suffisent — l'objectif est un diagnostic lisible, pas
   une comptabilité exhaustive.
2. Cumuler par manche et par joueur, à côté de `bilanHurt`.
3. Afficher la répartition au bilan :

```
CAUSE PRINCIPALE
██████████████░░  Horde
██████░░░░░░░░░░  Boss
████░░░░░░░░░░░░  Danger
██░░░░░░░░░░░░░░  Élite
```

**Cette étape seule donne l'essentiel de la valeur.** Le sous-titre plus fin
(« vous êtes resté 2,4 s dans une zone dangereuse ») demande de suivre le temps
passé en zone, ce qui est un second système : à faire après, si l'attribution
simple ne suffit pas.

### Pourquoi c'est peu risqué

Un compteur en écriture seule, qui n'influence aucune règle. Aucun impact
réseau (agrégat de fin de manche, pas un champ d'instantané).

## 10b · Bilan de fin de manche

L'écran existe déjà avec quatre blocs (`bilanStats`, `bilanHurt`, `bilanPerf`,
`bilanScoresBody` — tableau par joueur). Ce qui manque est du contenu et de la
mise en scène, pas une refonte :

- **la cause de mort** (10a) ;
- **les archétypes du build** — gratuits, `archetypeDe(owned)` existe déjà
  (voir 10c) ;
- **l'écart au record personnel** — `bestFinal` existe, mais **attention** :
  tant que le chantier 07 n'est pas fait, le record auquel on se compare peut
  être celui d'un autre effectif. Cet élément **dépend de 07**.
- **les nouveaux déblocages** de la manche — la donnée existe
  (`recompensesDe`, `lastGain` dans `hub.js`).

## 10c · Présentation des archétypes de build

**Le moteur est déjà là et calibré.** `shared/cards.js:2326` : sept archétypes
(`incendiaire`, `sniper`, `forteresse`, `berserker`, `demolition`, `acrobat`,
`technicien`), noms français, `archetypeDe(owned)` retourne le plus fourni ou
aucun, `verifierBuilds()` est vert.

Le principe recherché est déjà écrit dans le code : *« l'archétype ne change
rien au jeu — c'est une LECTURE, jamais une règle : aucun bonus, aucun
déblocage, aucun filtre de tirage. Un badge qui modifierait quoi que ce soit
deviendrait une classe cachée. »*

Affichage actuel, `public/ui/build.js:162` :
```js
const arch = archetypeDe(info.counts);
if (arch) buildClass.textContent += " \u00b7 " + archetypeNom(arch.id);
```
Une chaîne accolée au nom de classe. C'est tout.

### Ce qui reste

1. **Barre de progression** — quasi gratuite : `archetypeDe` retourne déjà `n`
   (cartes possédées) et `a.seuil`. Il manque un plafond par archétype pour
   normaliser, **et les valeurs sont déjà mesurées** dans le commentaire du
   dépôt : sniper 13, forteresse 10, berserker 8, démolition 8, acrobat 7,
   technicien 7, incendiaire 5. Les porter en donnée plutôt qu'en commentaire.
2. **Forces / faiblesses** — deux listes courtes par archétype, 7 × 2 entrées.
   Pur contenu, aucun risque de régression.
3. **Icône** par archétype — cosmétique.

### Ne pas reconstruire la détection

Les seuils sortent d'une mesure sur 300 manches par politique (4 cartes = 4 %
d'obtention, 5 = 17 %, 7 = 25 %, 8 = 69 %), et `verifierBuilds()` refuse tout
archétype dont le bassin de cartes libres d'arme **et** de classe est inférieur
au seuil + 2. Toucher à la détection sans refaire cette mesure casserait un
équilibre déjà établi.

## Fichiers

- `shared/game_state.js` — attribution des dégâts (10a)
- `public/ui/dom.js` + écran de bilan — affichage (10a, 10b)
- `shared/cards.js` — plafonds par archétype en donnée, forces/faiblesses (10c)
- `public/ui/build.js` — barre et listes (10c)
