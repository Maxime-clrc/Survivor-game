# 03 · Chance, esquive, armure — et l'indice de survie étendu

## Pourquoi ces trois-là

L'inventaire de `defaultMods()` — **151 clés** — donne :

| catégorie | clés |
|---|---:|
| **offensif universel** | **53** |
| propre à une arme | 26 |
| propre à une classe | 26 |
| **défensif** | **24** |
| **économie** | **13** |
| invocation | 9 |

Et `AXE_DE_CLEF`, ce que la table d'échelle des armes sait voir, ne connaît que
sept axes : dégâts, cadence, portée, zone, perforation, ricochet, critique.
**Tous offensifs.**

Conséquence jamais écrite : **il n'existe aucun arbitrage défensif dans le jeu.**
On empile des PV et de la réduction. C'est le trou, et c'est celui que ce lot
comble.

## Les trois

**La chance / rareté.** Aucun axe unifié de rareté n'existe — `eliteDrop` et
`cardsQuality` sont ponctuels. **Elle agit sur la RARETÉ seule, jamais sur la
quantité.** C'est elle qui change la nature de ce qu'on trouve, donc la forme de la
run, et ça garde l'axe lisible à haut niveau — là où le genre devient illisible en
faisant les deux.

C'est aussi elle qui rend le loot **systémique** au lieu de robinetier : « je joue
chance, donc je prends tous les contrats, donc je trouve autrement ».

**L'esquive.** Le seul axe défensif du genre absent, et de **nature différente** de
`damageTakenMul` : binaire et variante contre lisse et multiplicative. Deux joueurs
à +30 % de survie ne jouent pas pareil selon lequel des deux ils ont pris.

Le socle existe : `PLAYER_HIT_CD = 0,55 s` est déjà une fenêtre d'invulnérabilité,
donc l'esquive s'y branche naturellement — une esquive rend le coup gratuit *et*
ouvre la fenêtre. `_hurt(p, d, opts)` est le point de passage unique.

**Elle a besoin d'un plafond dès le premier jour** (le genre le fixe vers 60 %).
Sans lui c'est une immunité stochastique, et en coop elle rend le Soigneur
illisible.

**L'armure plate.** Soustractive, donc **anti-corrélée** au multiplicateur : elle
compte énormément contre les petits coups et peu contre les gros. C'est ce qui
crée la spécialisation Tank contre le **contact de horde**, plutôt que contre les
mécaniques de boss.

Elle **coexiste** avec `damageTakenMul` — c'est la réponse du genre — mais ça
double la surface d'équilibrage défensif, qui est aujourd'hui la moins mesurée du
dépôt. Le compte rendu du plan 32 devient la condition pour la régler.

## Où elles vivent

**Dans les cartes, et le loot les alimente.**

Un axe qui n'existerait que dans le loot serait un axe qu'on **subit** : on ne peut
pas décider de « jouer esquive » si l'esquive tombe au hasard. Un axe qui
n'existerait que dans les cartes rendrait le loot redondant.

La répartition qui marche : **la carte ouvre l'axe, le loot l'amplifie.** Une carte
donne les premiers points et la famille qui en dépend ; un loot d'esquive trouvé
ensuite vaut beaucoup pour qui a pris ces cartes et presque rien pour les autres.
C'est ce qui fait qu'un loot est une trouvaille et pas un cadeau.

## Le défaut qu'elles révèlent, et sa réparation

`powerIndex()` est **purement offensif**. Il remonte toute la chaîne :

```
powerIndex → _playerPower → _teamPower → bossPower() → PV du boss et du mini-boss
```

Donc un loot **offensif** grossit le boss et paie une partie de lui-même ; un loot
**défensif** est invisible et **entièrement gratuit**. Avec six loots par manche et
des joueurs qui apprennent, l'optimum est de prendre du défensif — ce n'est pas un
choix, c'est un tarif.

**La réparation, décidée** : un **second indice**, de survie, réservé à la tension
du Director. Il a été livré au plan 32 lot 04 en lisant `maxHp`, `damageTakenMul`
et `shieldPool` ; **ce lot l'étend à l'armure plate et à l'esquive.**

> `powerIndex()` ne bouge pas. `BOSS_POWER_REF = 2,89`, `SUMMON_REF`, la courbe des
> six boss et les mesures des plans 27 à 30 sont **intacts**. L'indice de survie ne
> sert **qu'à** la tension : aucun boss, aucun mini-boss, aucune récompense ne s'y
> branche.

Le tarif des loots défensifs — plus rares ou plus chers que les offensifs — reste
un travail d'équilibrage, mesurable avec le compte rendu. Pas une formule.

## Ce qui va dans la documentation, pas dans le code

`docs/regles/CONTENU.md` reçoit **l'ordre de la chaîne de calcul**, qui existe déjà
et n'est écrit nulle part, et la place du loot dedans. C'est le vrai contenu du
« point 12 » du brainstorm : un besoin de documentation, pas de refonte.

## Critère d'acceptation

1. L'esquive a un **plafond**, et il est atteint dans un test.
2. `powerIndex()` rend **exactement** la même valeur qu'avant sur une build sans
   les trois nouvelles clefs. Non-régression stricte.
3. L'indice de survie bouge quand on prend de l'armure ; **le boss ne bouge pas**.
   C'est le test qui dit que la séparation tient.
4. `verifierEquilibreArmes` et `verifierProgression` restent verts.
5. L'ordre de la chaîne est dans `CONTENU.md`.

## Nature de la tâche

**Fil principal.** Trois axes qui touchent `_hurt`, `_recomputeMods` et l'indice de
survie ; et la non-régression de `powerIndex` est le genre de chose qu'on vérifie
soi-même.
