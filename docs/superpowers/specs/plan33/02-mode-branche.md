# 02 · Le mode, branché

## Ce que c'est

Un objet de difficulté **construit au lancement** à partir des rangs choisis, au
lieu d'être lu dans `DIFFICULTIES`.

```js
DIFFICULTIES[3] = construireCustom(rangs)   // hp, spawn, dmg, boss, speed,
                                            // roster, traits, script, bossProfil
```

Rien d'autre ne change dans la simulation : elle lit une difficulté, elle ne
demande pas d'où elle vient.

## Les quatre garde-fous, en code

**Index 3, réservé.** `DIFFICULTIES` est append-only. L'entrée 3 existe et
n'est jamais réordonnée. Toute lecture indexée — message `round`, `clefRecord`,
`DIFF_MUL` — la voit passer.

**Pas de classement.** Le test est à l'endroit unique où `recordFinal` est appelé
(`hub.js`), et il vaut pour les trois classements du plan 31.

**Pas de noyaux, pas de hauts faits.** `PROG_CFG.DIFF_MUL` a **trois** entrées et
en garde trois : `coresForRun(level, bossKills, diffIndex)` lit
`DIFF_MUL[diffIndex] ?? 1`, donc l'index 3 rendrait 1 par défaut — ce qui est
**faux**, il doit rendre 0. Le test est explicite, pas laissé au `??`.
Pour les hauts faits, `pousserHautFait()` est le point de passage unique.

**Le plafond moteur.** `_enemyCap()` borne déjà par `MAX_ENEMIES_HARD_CAP`. Le
vérificateur du lot 01 s'assure qu'aucune combinaison ne le demande — mais la
borne reste, parce qu'une borne qu'on suppose inatteignable finit par être
atteinte.

## Le piège de composition

Les multiplicateurs se **composent** : `hp × spawn × dmg × boss`. Le produit
explose bien avant que chaque facteur soit à son maximum.

Deux conséquences :

- l'interface doit afficher **le produit estimé** à côté de l'indice de sévérité —
  les deux disent des choses différentes, et il faut les deux ;
- le dépôt sait déjà faire ce genre de calcul : la formule d'équilibration
  `V = 0,8·Vhorde + 0,2·Vboss × U × R + S` est de cette famille. C'est le modèle à
  copier, pas à réinventer.

## Le compte rendu

Le custom apparaît comme n'importe quelle manche si la mesure est armée, et son
**en-tête porte tous les rangs actifs plus l'indice de sévérité**.

Un compte rendu de custom sans ses réglages ne veut rien dire, et c'est l'usage
principal du mode.

## Critère d'acceptation

1. Une manche custom **n'écrit rien** dans `bestFinal`, ne crédite **aucun** noyau,
   ne débloque **aucun** haut fait. Trois tests, trois assertions.
2. Une manche custom aux réglages **identiques à `normal`** produit la même chose
   qu'une manche normale sur la même graine. C'est le test qui dit que le mode ne
   dérive pas.
3. Le compte rendu d'une manche custom porte ses rangs.
4. `verifierPopulation` reste vert sur les trois modes existants : le mode 3 n'a
   rien touché.

Le point 2 est le meilleur test du lot : si `custom(normal) ≠ normal`, la
construction ment.

## Nature de la tâche

Mécanique, sauf les quatre garde-fous — qui sont chacun un test explicite à
placer au bon endroit, et dont l'oubli ne se verrait qu'après coup. **Fil
principal** pour ceux-là.
