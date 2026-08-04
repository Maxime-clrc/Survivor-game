# Lot B — Coups critiques et nouveaux axes de cartes

Vérification faite sur les clés de `mods` : il n'existe **aucun** système de
critique, **aucun** multiplicateur global de rayon, **aucune** réduction de
recharge générique, **aucun** seuil d'exécution, **aucune** conversion de
statistique. Cinq piliers du genre absents.

---

## B1. Le système de critique

### Pourquoi c'est l'axe prioritaire

Il est **multiplicatif**. Contrairement à une carte de dégâts qui concurrence
les autres cartes de dégâts, le critique **valorise tout le catalogue
existant** : plus tes dégâts de base sont hauts, plus le critique rapporte. Une
build de critique et une build de dégâts bruts se renforcent au lieu de
s'exclure.

C'est aussi le socle de l'arbre du Tireur (lot D) et de la satisfaction des
chiffres de dégâts.

### Règles

```
CRIT_CHANCE_BASE: 0.05      // 5 %
CRIT_MUL_BASE: 2.0          // degats x2
CRIT_CHANCE_CAP: 0.75       // plafond dur
```

- Le tirage se fait **par balle**, pas par salve : avec un double canon, chaque
  balle tente sa chance.
- Le plafond à 75 % est nécessaire : au-delà, le critique n'est plus un pic mais
  une moyenne, et le retour visuel perd tout son sens.
- Les dégâts de zone (bombe, nova, pulsar, onde de mort) **peuvent** critiquer,
  mais le tirage est unique pour toute l'explosion — sinon un tapis de 40
  ennemis produirait 40 chiffres dorés et l'information serait noyée.

### Transmission

Le compteur de touches par ennemi (`hitSeq`) transporte déjà l'information
d'impact. Ajouter **un bit de critique** dans le même octet, ou un champ
`critSeq` séparé — le second est plus simple et évite un décodage.

### Interaction avec `_playerPower`

**Le critique doit entrer dans le calcul de puissance**, sinon les vagues seront
calibrées pour la moitié des dégâts réels — exactement le défaut déjà corrigé
pour `barrelDamageMul` et `catalyseur`.

```js
const crit = 1 + m.critChance * (m.critMul - 1);
return m.damageMul * barrels * catalyseur * crit * (1 + m.echoChance) / m.fireIntervalMul;
```

---

## B2. Le visuel du critique

C'est ce qui donne au système sa raison d'être : un critique doit **se voir et
s'entendre**, sinon ce n'est qu'un nombre plus grand dans une moyenne.

### Le chiffre

| | normal | critique |
|---|---|---|
| couleur | blanc cassé `#e9edf5` | or `#ffc94d` |
| taille | 15 px | **22 px** |
| graisse | 600 | 800 |
| apparition | fondu simple | **pic d'échelle** : 1,4 → 1,0 en 120 ms |
| trajectoire | montée droite | montée avec léger arc latéral |
| durée | 0,7 s | 1,0 s |

Le pic d'échelle est l'élément qui porte : c'est lui qu'on perçoit du coin de
l'œil, pas la couleur.

### L'impact

- **Éclat en étoile** au lieu du flash rond : six branches, en additif, 80 ms.
- **Teinte dorée** sur l'ennemi touché au lieu du flash blanc, 90 ms au lieu de
  60.
- **Recul du sprite doublé** par rapport à un coup normal.
- **Particules** : trois éclats dorés projetés dans l'axe du tir.

### Le son

Variante du son d'impact, transposée d'une quinte vers le haut, avec une
attaque plus nette. **Soumise au même limiteur de voix** : à 40 % de chance de
critique et onze tirs par seconde, il ne faut pas qu'ils s'empilent.

### Le cas particulier de l'exécution

Une carte du catalogue ci-dessous tue les ennemis sous un seuil de PV. Ces
morts doivent avoir leur **propre signature** — un éclat blanc net, sans
chiffre — pour ne pas se confondre avec un critique. Sinon on ne comprend plus
ce qui tue quoi.

---

## B3. Le déficit de communes

77 cartes : **13 communes**, 27 rares, 25 épiques, 12 légendaires.

Les communes sortent six fois plus souvent que les rares et sont deux fois
moins nombreuses. Sur 15 à 20 tirages, on revoit les mêmes en boucle, dont
plusieurs plafonnées donc retirées du pool en cours de route.

**À corriger avant d'ajouter des axes.** Les propositions ci-dessous ajoutent
huit communes, portant le total à 21. Toujours pas idéal, mais tenable.

---

## B4. Le catalogue à ajouter

### A. Critique

| id | nom | rareté | effet |
|---|---|---|---|
| `precision` | Précision | commune | +6 % de chance critique |
| `mire` | Mire | rare | +12 % de chance critique |
| `talon_faible` | Talon faible | rare | +40 % de dégâts critiques |
| `oeil_de_faucon` | Œil de faucon | épique | +20 % de chance et +50 % de dégâts critiques |
| `sentence_capitale` | Sentence capitale | légendaire | les critiques perforent et appliquent Vulnérabilité |

### B. Rayon — une clé, un effet partout

Une seule clé `areaMul`, appliquée à la bombe, la nova, le pulsar, l'onde de
mort, le givre, le rempart, la vague de soin, la contre-attaque.

| id | nom | rareté | effet |
|---|---|---|---|
| `expansion` | Expansion | commune | +8 % de rayon sur tous tes effets |
| `deflagration` | Déflagration | rare | +20 % de rayon |
| `singularite` | Singularité | épique | +35 % de rayon, et tes zones attirent les ennemis vers leur centre |

Excellent rapport travail/effet : une clé, et **une quinzaine de cartes
existantes deviennent meilleures**. C'est une carte qui crée des synergies au
lieu d'additionner des pourcentages.

### C. Recharge

| id | nom | rareté | effet |
|---|---|---|---|
| `condensateur` | Condensateur | commune | −7 % de recharge des compétences |
| `surtension` | Surtension | rare | −15 % de recharge |
| `flux_continu` | Flux continu | épique | −25 %, et chaque kill retire 0,1 s aux recharges |

`flux_continu` lie les compétences au rythme de la vague, ce qui les rattache
enfin au reste du jeu.

### D. Exécution

| id | nom | rareté | effet |
|---|---|---|---|
| `achevement` | Achèvement | rare | les ennemis sous 12 % de PV meurent instantanément |
| `moisson` | Moisson | épique | seuil à 20 %, et chaque exécution rend 1 PV |

Répond à la sensation d'ennemis-éponges en fin de partie, et se marie avec les
dégâts de zone qui laissent des survivants à bas PV.

### E. Conversion

| id | nom | rareté | effet |
|---|---|---|---|
| `blindage_offensif` | Blindage offensif | épique | 15 % de tes PV max s'ajoutent aux dégâts |
| `fureur_defensive` | Fureur défensive | épique | 10 % de tes dégâts s'ajoutent aux PV max |
| `pacte_de_fer` | Pacte de fer | légendaire | ton bouclier ne se régénère plus, mais +4 % de dégâts par point de bouclier maximum |

Ces cartes règlent un défaut signalé dès la première spécification : **une carte
défensive donne l'impression d'un tour perdu**. Avec la conversion, empiler du
PV devient une stratégie offensive assumée.

> **Piège d'implémentation** : `blindage_offensif` et `fureur_defensive` se
> calculent tous deux sur les valeurs **de base**, jamais sur les valeurs déjà
> modifiées par l'autre. Sinon la boucle diverge dès le premier recalcul de
> mods.

### F. Élan et momentum

| id | nom | rareté | effet |
|---|---|---|---|
| `elan` | Élan | commune | +1 % de dégâts par seconde sans être touché, max +25 %, remis à zéro au coup |
| `meute` | Meute | rare | +3 % de dégâts par ennemi à moins de 8 m, max +30 % |
| `carnage` | Carnage | rare | chaque kill donne +1 % de dégâts pendant 4 s, cumulable 30 fois |
| `adrenaline` | Adrénaline | rare | +25 % de cadence sous 50 % de PV |
| `dernier_souffle` | Dernier souffle | épique | +80 % de dégâts sous 25 % de PV |

`meute` est celle qui change le plus la façon de jouer : elle récompense le fait
de rester au contact, alors que tout le reste du jeu pousse à reculer.

### G. Communes de remplissage

En plus de `precision`, `expansion`, `condensateur` et `elan` :

| id | nom | effet |
|---|---|---|
| `lest` | Lest | +5 % de dégâts et +5 % de PV max |
| `rodage` | Rodage | −5 % de recharge et +5 % de vitesse |
| `chargeur_long` | Chargeur long | +10 % de portée et +8 % de vitesse des balles |
| `ferraille` | Ferraille | +12 % de score et +1 PV par kill |

---

## B5. Builds que ça rend possibles

- **Critique et zone** — `oeil_de_faucon` + `singularite` +
  `bombe_fragmentation` : chaque explosion devient un tapis de critiques.
- **Forteresse offensive** — `constitution` + `titane` + `blindage_offensif` +
  `fureur_defensive` : les deux conversions se nourrissent l'une l'autre.
- **Corps à corps** — `meute` + `orbiteurs` + `givre` + `represailles` +
  `dernier_souffle` : on se plante dans le tas et on ne recule plus.
- **Exécuteur** — `achevement` + `onde` + `carnage` : chaque exécution en
  déclenche d'autres.
- **Cycle de compétences** — `flux_continu` + `bombe_double` +
  `surcharge_longue` : la bombe redevient l'arme principale.

---

## B6. Mesures et critères

| mesure | attendu |
|---|---|
| chance critique en fin de partie, build orientée | 25 à 45 % |
| écart de dégâts entre build critique et build brute | inférieur à 30 % |
| communes distinctes vues sur une partie | supérieur à 15 |
| durée d'un combat de boss, avant / après le lot | écart inférieur à 20 % |

Ce dernier point est le garde-fou : si les boss s'effondrent, c'est que le
critique n'est pas entré dans `_playerPower`.

Critères d'acceptation :

- Un critique est identifiable **sans lire le chiffre**.
- Une exécution ne se confond jamais avec un critique.
- Aucune boucle de rétroaction entre les deux cartes de conversion.
- `areaMul` s'applique aux quinze effets concernés, sans exception oubliée.
