# Ordre d'exécution — lot par lot

Les plans sont numérotés dans l'ordre où ils s'enchaînent, mais **à l'intérieur
d'un plan, l'ordre des fichiers n'est pas toujours l'ordre d'exécution.** Ce
document donne la séquence réelle et, surtout, les **barrières** — les endroits où
inverser deux lots casse quelque chose.

---

# AVANT TOUT — deux corvées

Elles ne sont dans aucun plan et elles doivent être faites **avant le premier
lot** :

**C1 · Régénérer `LISEZMOI.md` § Réglages.** Il annonce `ARENA_W/H: 1600 x 900`
(c'est 4800 × 2700), `BOSS_HP_BASE: 1200` (c'est 520), et une quinzaine de
constantes `WAVE_*` / `LEVEL_KILLS_*` absentes de `CFG`.
`npm run constantes-check` attrape une constante sans lecteur, pas une doc qui
invente une constante. **Sans ça, le premier lot qui mesure part d'une valeur
fausse.**

**C2 · Inscrire sa réserve dans le document du plan 30.** Ses valeurs calibrées
supposent que toute la puissance vient des niveaux, des cartes et des reliques.
Le loot de run les invalidera : elles seront à **remesurer, pas à reconduire**.

---

# LA SÉQUENCE

## Plan 30 — finir

Courbe d'XP, boss, armes. Rien ne se calibre contre une base qu'on s'apprête à
changer.

## Plan 31 — fondations

```
31/02  determinisme          ← EN PREMIER : les criteres des lots suivants
                               s appuient sur des graines appariees
31/03  grilles bornees
31/04  horde par groupe
31/06  doctrine XP           ← ecriture pure, aucune dependance
31/01  classement            ← independant, place ou vous voulez
31/05  chevron unique        ← independant
```

**31/02 vient en tête**, et c'est la seule contrainte forte du plan. Les critères
d'acceptation de 31/03 et 31/04 comparent des manches de même graine ; sans le
générateur par salle, ces comparaisons ne veulent rien dire.

31/01, 31/05 et 31/06 sont indépendants de tout. Ce sont les trois lots à donner
en parallèle si vous travaillez à plusieurs, ou à garder pour les soirs où vous ne
voulez pas ouvrir la simulation.

## Plan 32 — outillage

```
32/01  armement + compte rendu   ← LE SOCLE : les trois suivants y ecrivent
32/04  les deux indices          ← tot, pour que les courbes s accumulent
32/02  les trous de donnees
32/03  le releve client
32/05  les anomalies             ← EN DERNIER : il lit tout ce qui precede
```

**32/04 est remonté juste après le socle**, et c'est délibéré. La mesure de
tension ne pilote rien, mais **chaque manche jouée à partir de là accumule une
courbe** — et le plan 36 se calibrera dessus. Plus il est tôt, meilleur sera le
Director.

**32/05 est nécessairement dernier** : les anomalies croisent le relevé client
(32/03), la ventilation des dégâts (32/02) et la tension (32/04).

## Plan 33 — mode custom

```
33/01  la table des conditions
33/02  le mode, branche
33/03  partage et prereglages
33/04  l interface
```

Strictement séquentiel. 33/01 est le vrai travail — le coût de chaque rang est un
jugement — et les trois autres en découlent.

**À la fin de ce plan, le banc est complet.** Graine + compte rendu + mutateurs =
isoler une variable.

## Plan 34 — contrats

```
34/04  LES SEPT SONS      ← EN PREMIER, et c est contre-intuitif
34/01  la borne
34/02  les objectifs      ← peut aller en parallele de 34/01
34/03  le suivi HUD       ← apres 01 et 02
```

**Les sons passent en tête du plan.** Trois d'entre eux servent ici, quatre
serviront aux plans 35 et 37 — mais ils doivent être **composés ensemble**, et le
seul moment où ils peuvent l'être est avant que le premier soit branché. Le dépôt
a payé le défaut inverse : *« treize bonus rendaient la même quinte montante »*.

34/01 et 34/02 ne se touchent pas : l'un est un objet du monde, l'autre une table.

## Plan 35 — mini-boss, loot, statistiques

```
35/03  trois statistiques   ← D ABORD : le loot les alimente, il ne peut pas
                              les preceder
35/01  le mini-boss         ← peut aller en parallele de 35/03
35/02  le loot au sol       ← apres 03 (les axes) et apres 01 (une source)
35/04  l equilibrage        ← IMPERATIVEMENT DERNIER
```

**L'ordre des fichiers n'est pas l'ordre d'exécution ici.** Le loot est numéroté
02 parce qu'il se lit après le mini-boss, mais il s'écrit après les statistiques :
un loot d'esquive n'a pas de sens tant que l'esquive n'existe pas.

**35/04 est le seul lot du corpus qui recalibre contre une source de puissance
neuve.** Il remesure la puissance médiane, la durée des combats de boss,
l'équilibre des dix armes et la courbe de progression. C'est là que la réserve C2
se solde.

## Plan 36 — Director

```
36/01  la table de choix fermee   ← et son verificateur, ecrit AVANT le Director
36/02  les etats
36/03  calibration                ← lit les courbes accumulees depuis 32/04
```

Strictement séquentiel. **Le vérificateur de 36/01 s'écrit avant le Director
lui-même** : c'est le contrat du système, et un Director sans lui dérive
silencieusement hors de sa liste.

## Plan 37 — la map

```
37/01  les variantes        ← se verifient sur l arene ACTUELLE
37/02  l agrandissement     ← apres 01
37/03  le ping              ← independant, des que 31/05 et 34/04 sont faits
```

**37/01 avant 37/02**, et pour une raison de mesure : les vingt variantes se
vérifient plus vite et plus proprement sur l'arène actuelle. Agrandir d'abord
mélangerait deux causes en cas de défaut.

**37/03 peut être fait bien plus tôt.** Dès que le chevron est unique (31/05) et
que les sons sont composés (34/04), le ping tient en un message et une classe CSS.
C'est le lot à sortir un soir où vous voulez livrer quelque chose de visible.

---

# LES NEUF BARRIÈRES

Les seuls ordres qu'il ne faut jamais inverser. Tout le reste est souple.

| # | avant | après | ce qui casse sinon |
|---|---|---|---|
| **B1** | plan 30 fini | tout | on calibre contre une base qui va bouger |
| **B2** | 31/02 déterminisme | 31/03, 31/04, tout à partir de 32 | aucun critère à graines appariées ne veut plus rien dire |
| **B3** | 31/03 + 31/04 | 37/02 agrandissement | les deux coûts de surface explosent, et on mesure un mélange de trois causes |
| **B4** | 31/05 chevron unique | 37/03 ping | le ping fait clignoter une couche sur deux |
| **B5** | 32/01 compte rendu | 32/02, 32/03, 32/05 | les trois écrivent dedans |
| **B6** | 32/04 les indices | 36/03 calibration | pas de courbes à lire, les six réglages sont devinés |
| **B7** | 34/04 les sept sons | tout branchement d'un des sept | sept sons composés séparément ne font pas une palette |
| **B8** | 34 contrats | 35 mini-boss et loot | la rareté du loot vient de la rareté du contrat |
| **B9** | 35/01, 35/02, 35/03 | 35/04 équilibrage | on recalibre contre un système incomplet |

**B6 est la seule barrière qui demande du temps, pas un ordre.** Entre 32/04 et
36/03 il doit s'écouler assez de **parties réelles** pour que les courbes de
tension soient représentatives. D'où la consigne qui suit.

---

# LA CONSIGNE QUI NE TIENT DANS AUCUN LOT

> **À partir du plan 32, armez la mesure sur vos parties normales.**

Pas sur des manches de test : sur les vraies, celles où vous jouez pour jouer.
C'est la seule façon d'accumuler ce dont le plan 36 aura besoin, et c'est aussi ce
qui fera remonter les anomalies auxquelles personne n'aurait pensé.

Le plan 32 existe précisément parce qu'aujourd'hui **tout est mesuré sur des
bots**, et que `LISEZMOI.md` admet que le pilote ne sait pas jouer deux armes sur
quatre. Armer la mesure et ne jamais jouer avec reproduirait le défaut sous une
autre forme.

---

# SI VOUS VOULEZ LIVRER QUELQUE CHOSE DE VISIBLE TÔT

Les plans 31 à 33 ne se voient presque pas. Trois lots font exception et peuvent
être sortis quand vous voulez :

- **31/01 le classement** — il rend fonctionnel un système écrit à 95 %, et c'est
  le seul lot du plan 31 qu'un joueur remarquera ;
- **31/05 le chevron unique** — invisible, mais il retire un doublon d'affichage ;
- **37/03 le ping** — dès que B4 et B7 sont levées. Petit, visible, et il rend la
  coop meilleure sans rien attendre de la map.
