# 04 · Ce que les trois lots font à la courbe

Pas un lot de formalité. Les trois précédents ajoutent de la puissance **hors du
système de niveaux**, et le plan 30 avait calibré un jeu où toute la puissance
venait des niveaux, des cartes et des reliques.

## La péremption annoncée

`BOSS_POWER_REF = 2,89` et la puissance médiane de **2,7 à 3,2** en fin de manche
sont des **relevés**, pas des constantes de conception.

Six loots offensifs par manche les feront monter. La calibration du plan 30
décrira alors un jeu qui n'existe plus.

C'est écrit dans le document du plan 30 lui-même — *« ces valeurs seront à
remesurer, pas à reconduire »*. Ce lot est le moment où on le fait.

## Ce qu'il faut remesurer, et dans quel ordre

**1 · La puissance médiane en fin de manche.** `mesurePuissanceBoss` la donne. Si
elle passe de 3,0 à 3,6, le seuil de `bossPower()` mord plus tôt et les six boss
grossissent d'eux-mêmes — ce qui est le comportement voulu, mais il faut vérifier
que la durée des combats reste dans sa fourchette.

**2 · La durée des combats de boss.** `mesureTTK`. C'est la grandeur que les
joueurs ressentent, et celle qui doit rester stable pendant que tout bouge
autour.

**3 · L'équilibre des dix armes.** `verifierEquilibreArmes(3, 10)`. Le loot
offensif ne rend pas les mêmes services à toutes les armes : `flatDamage` compte
énormément pour une arme à cadence élevée et peu pour le railgun. **Un loot peut
déséquilibrer les armes sans qu'aucune arme n'ait été touchée**, et c'est le
scénario que ce lot doit attraper.

**4 · La courbe de progression.** `verifierProgression`. Le plan 30 vient de la
régler ; le loot lui ajoute une seconde source de puissance qui ne suit pas la
même pente.

**5 · Le temps d'abattage du mini-boss.** Sa fourchette a été écrite au lot 01 ;
elle se vérifie après que les statistiques et le loot existent, pas avant.

## Le tarif du loot défensif

C'est le seul réglage qui n'a pas de formule, et il vient du défaut de
`powerIndex` : un loot défensif est gratuit, un loot offensif se taxe.

Deux leviers, à choisir par la mesure :

- **la rareté** — le loot défensif tombe moins souvent ;
- **la valeur** — il donne moins, à rareté égale.

**La rareté est probablement le bon levier**, parce qu'elle laisse au loot
défensif sa valeur de trouvaille quand il tombe, au lieu d'en faire une version
tiède de l'offensif.

Le compte rendu du plan 32 est l'instrument : la ventilation des dégâts infligés
et l'indice de survie, relevés sur des manches réelles, disent ce qui est
réellement pris et ce que ça rend.

## Ce qui doit rester vrai

1. **La durée des combats de boss ne bouge pas** de plus de sa fourchette écrite.
   C'est le critère principal du lot.
2. `verifierEquilibreArmes` reste vert **avec du loot**, pas seulement sans.
3. La puissance médiane est **relevée et écrite** dans `LISEZMOI.md`, avec sa date
   et la mention que le loot y contribue désormais.
4. `BOSS_POWER_REF` est mis à jour si la médiane a bougé — et l'ancienne valeur est
   conservée à côté, avec la raison. Le dépôt garde son histoire.

## Nature de la tâche

Mesure et arbitrage. **Fil principal**, et il faut prévoir des allers-retours :
c'est le premier lot du dépôt qui recalibre contre une source de puissance neuve.
