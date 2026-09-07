# 04 · Les deux indices — mesurés, ne pilotant rien

Le lot qui n'a l'air de rien, et qui décide de la qualité du plan 36.

## Pourquoi la mesure part MAINTENANT et le Director plus tard

Le Director aura six réglages à calibrer — `A`, `B`, `C`, `DECAY`, seuil bas,
seuil haut. S'ils arrivent avec lui, il n'existera **aucune manche enregistrée**
pour dire à quoi ressemble une courbe de tension normale, et on les devinera.

En livrant la mesure ici, sans qu'elle pilote quoi que ce soit, on obtient
gratuitement :

- des dizaines de manches réelles avec leur courbe, avant d'écrire une ligne de
  Director ;
- des seuils lus **sur les distributions observées** ;
- la courbe de tension d'une vraie manche, comparable à celle que le brainstorm
  dessinait — on saura si le jeu a déjà le rythme voulu, ou pas ;
- et si la mesure est mauvaise, on le voit **avant** qu'un système s'appuie
  dessus.

Le coût est nul : c'est quatre flottants par joueur et par tick, qu'il faudra
écrire de toute façon.

## L'indice de tension

Par joueur, entre 0 et 1, mis à jour à chaque tick :

```
tension += degats_recus / maxHp         × A
tension += corps_proches / densite_ref  × B × dt
tension += a_terre ? C × dt : 0
tension -= DECAY × dt
                                        puis borne a [0, 1]
```

**Aucune instrumentation neuve.** `_hurt()` est déjà le passage obligé de tout ce
qui blesse un joueur ; `_grille()` donne le voisinage pour rien puisqu'elle est
déjà bâtie trois fois par tick ; `p.downed` existe.

*Les dégâts en fraction des PV max et non en valeur absolue* : un Rempart et un
DPS ne ressentent pas le même coup de la même façon, et c'est le ressenti qu'on
mesure.

*La densité proche* est le signal qui monte **avant** qu'on prenne des coups.
Sans lui la mesure est toujours en retard. C'est aussi le pendant du « tuer des
infectés tout près » de Left 4 Dead : être au contact est une tension même quand
on gagne.

## Deux agrégats d'équipe, pas un

C'est l'écart assumé avec Left 4 Dead, et il vient d'une mesure faite sur ce jeu :
à 3 600 px de séparation, un joueur voit 137 corps pendant que l'autre en voit 36,
et le sens change avec la graine. **Une moyenne d'équipe effacerait exactement
ça.**

- **`tensionMax`** — le joueur le plus en difficulté. Il dira « trop haut » ;
- **`tensionMoy`** — la moyenne. Elle dira « trop bas », parce que l'ennui est un
  état collectif.

Les deux sont tracés dans l'échantillon à 1 Hz.

## La mémoire courte, trois compteurs

Le contexte instantané ne sait pas dire « ça fait deux minutes qu'il ne s'est rien
passé ». Trois durées, gratuites :

- temps depuis la dernière élite ;
- temps depuis le dernier événement ;
- **temps passé sous le seuil bas de `tensionMoy`** — le vrai déclencheur d'ennui.
  Une tension basse dix secondes n'est rien ; quatre-vingt-dix, c'est une manche
  plate.

## L'indice de survie

Le second indice, et il répare un défaut de conception relevé en R&D.

`powerIndex()` (`shared/game_state.js:734`) est **purement offensif** — dégâts,
canons, échelle d'arme, catalyseur, critique, écho, cadence, dégâts plats. Il ne
lit ni les PV, ni le bouclier, ni la réduction, et c'est délibéré : le commentaire
dit que c'est *« ce que l'arme rend contre une cible unique »*, le contexte sur
lequel les boss sont calibrés.

Il remonte pourtant toute la chaîne :

```
powerIndex → _playerPower → _teamPower → bossPower() → PV du boss
```

**Conséquence que personne n'a conçue** : une équipe cuirassée est mesurée comme
faible. Et, plus tard, un loot défensif serait invisible à l'indice donc
entièrement gratuit, quand un loot offensif grossit le boss et paie une partie de
lui-même.

**Un second indice, de survie, réservé à la tension.** Il lit `maxHp`,
`damageTakenMul`, `shieldPool` — et, quand elles existeront, l'armure plate et
l'esquive (plan 35).

> `powerIndex()` ne bouge pas. `BOSS_POWER_REF = 2,89`, `SUMMON_REF`, la courbe
> des six boss et les mesures des plans 27 à 30 sont **intacts**. L'indice de
> survie ne sert **qu'à** la tension : aucun boss, aucun mini-boss, aucune
> récompense ne s'y branche.

## Ce que ce lot ne fait pas

**Rien ne lit ces indices.** Ils sont calculés, tracés, et c'est tout. Aucun
comportement du jeu ne change. C'est le point du lot, et le critère d'acceptation
en dépend.

## Critère d'acceptation

1. **Une manche tracée et une manche non tracée, même graine, mêmes entrées,
   produisent le même état à 600 s.** Si les indices influencent quoi que ce soit,
   ce test le voit.
2. La tension est **déterministe** : deux manches de même graine donnent la même
   courbe. Elle tire dans `this.alea`, jamais dans `Math.random`.
3. Le coût est sous le bruit : le p99 de durée de tick ne bouge pas.
4. La courbe de `tensionMoy` d'une manche réelle est **lisible** — elle monte, elle
   redescend, elle n'est ni plate ni saturée. Si elle est plate, les poids sont à
   revoir, et c'est exactement ce qu'on cherche à savoir maintenant plutôt qu'au
   plan 36.

## Nature de la tâche

Le calcul est court. **Le jugement est dans le choix des quatre poids de départ**,
et il n'y a pas de bonne réponse a priori — on part de valeurs plausibles, on
regarde des courbes réelles, et on ajuste. Fil principal, et il faut prévoir
qu'il y aura un aller-retour.
