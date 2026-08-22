# Survivor LAN — le modèle d'équilibrage

Le critère actuel connaît un seul nombre : le DPS nominal en cible unique. Il
ne remonte aucune anomalie, et pourtant le tesla domine et le lance-grenades
fait ×1,88 de survie. **Le critère ne ment pas, il regarde le mauvais nombre.**

Ce document remplace la doctrine du plan 11 (« toutes les armes autour de 70-76
DPS ») par un modèle qui compte cinq choses de plus : les cibles réellement
touchées, le temps où l'arme peut tirer, la part des tirs qui atteignent leur
valeur pleine, la survie que l'arme donne, et **ce qu'elle exige du joueur**.

C'est l'avant-dernier chantier de la liste, et c'est voulu : équilibrer huit
armes puis en ajouter deux revient à tout refaire.

---

## 07 — Le modèle d'équilibrage

### La règle

**Toutes les armes tiennent dans une fourchette autour du tir standard.** Aucune
n'est faible, aucune n'écrase. Mais la fourchette n'est pas un simple intervalle
de DPS : **une arme punitive à jouer doit rendre un peu plus qu'une arme facile**,
sinon personne n'a de raison de la prendre.

C'est la différence entre équilibrer des chiffres et équilibrer une expérience.
Deux armes qui rendent 75 DPS ne sont pas équilibrées si l'une exige une visée
au pixel et l'autre tire toute seule.

### Ce que le dépôt sait déjà faire, et ce qui lui manque

`verifierArmes()` applique aujourd'hui un unique critère : le DPS en cible
unique, entre 60 % et 160 % de la référence. Mesuré :

| arme | DPS nominal | % réf. cible unique | portée |
|---|---|---|---|
| standard | 75 | 100 % | 48 m |
| assaut | 73 | 97 % | 38 m |
| laser | 90 | 120 % | 77 m |
| tesla | 33 | 99 % | 34 m |
| lame | 35 | 65 % | 12 m |
| dispersion | 72 | 96 % | 24 m |
| railgun | 86 | 114 % | 86 m |
| grenade | 50 | 67 % | 43 m |

Aucune anomalie remontée. Et pourtant le tesla domine et la grenade fait ×1,88
de survie (la mesure est dans le commentaire d'`armes.js`). **Le critère ne
ment pas, il regarde le mauvais nombre.** Ce qu'une colonne « DPS nominal » ne
peut pas voir :

- combien de cibles le tir touche réellement ;
- quelle fraction du temps l'arme peut tirer ;
- quelle fraction des tirs atteint sa valeur pleine ;
- ce que l'arme donne en survie plutôt qu'en dégâts ;
- ce qu'elle coûte au joueur pour être jouée correctement.

Les cinq manquent. C'est ce que ce chantier ajoute.

### Le modèle

**Une arme vaut ce qu'elle DÉLIVRE, pas ce qu'elle affiche.**

```
V  =  (0,8 · Vhorde  +  0,2 · Vboss)  ×  U  ×  R   +   S
```

| terme | ce qu'il capture | d'où il vient |
|---|---|---|
| **Vhorde** | DPS nominal × cibles moyennes touchées par tir | mesuré en manche |
| **Vboss** | DPS nominal × `conversionBoss(a)` | déjà dans le code |
| **0,8 / 0,2** | les boss sont **un cinquième** du temps de manche | doctrine du plan 11 |
| **U** | *uptime* : 1 − (temps muet ÷ temps porté) | mesuré |
| **R** | *taux de réalisation* : dégâts réels ÷ dégâts si tout touchait | mesuré |
| **S** | la survie que l'arme donne, convertie en DPS équivalent | `CONVERT_*_REF` |

**U** est ce qui punit le laser (1,5 s de mutisme à saturation), le fusil de
siège (1,8 s de recharge) et le railgun (0,70 s de charge avant *chaque* tir).
Aucun des trois n'apparaît dans le DPS nominal, et les trois retirent du temps
de tir réel. Un railgun à 86 DPS nominal qui passe la moitié de son temps à
charger n'a jamais rendu 86.

**R** est ce qui punit la visée exigeante et l'anticipation. Un lance-grenades
dont le projectile est lent rate les cibles mobiles ; un fusil de précision qui
demande un pointage fin rate plus qu'un fusil à dispersion. C'est le terme qui
n'existe nulle part aujourd'hui, et c'est celui qui décide si une arme est
agréable.

**S** n'a pas à être inventé. Le dépôt porte déjà un taux de change tarifé entre
PV et dégâts, celui des cartes de conversion (`cards.js:158`) :

```
CONVERT_HP_REF: 100      CONVERT_DMG_REF: 200
```

soit **200 PV ↔ ×1,0 de `damageMul`**. La lame donne +40 % de PV max ; sur un
Tireur à 85 PV, c'est 34 PV, donc l'équivalent de +17 % de DPS. Le bouclier ×3
du fusil de siège pendant sa recharge se convertit par la même règle. On ne
tranche pas une valeur d'échange à la main : **on réutilise celle qui a déjà été
équilibrée**, et si elle est fausse elle est fausse partout, ce qui se corrige à
un endroit.

### La prime de difficulté

C'est le cœur de ta demande. **La cible de chaque arme dépend de ce qu'elle
exige du joueur.**

Cinq exigences, notées 0 / 0,5 / 1 chacune :

| | ce qu'on note |
|---|---|
| **visée** | tolérance à l'erreur de pointage |
| **anticipation** | faut-il tirer là où la cible **sera** |
| **position** | l'arme impose-t-elle un placement contraint |
| **ressource** | y a-t-il une jauge à lire et à doser |
| **vulnérabilité** | y a-t-il des fenêtres où l'on ne peut pas répondre |

| arme | visée | anticip. | position | ressource | vulnér. | **D** |
|---|---|---|---|---|---|---|
| tir standard | 0,5 | 0 | 0 | 0 | 0 | **0,5** |
| tesla (refondu) | 0,5 | 0 | 0,5 | 0 | 0 | **1,0** |
| lame | 0 | 0 | 1 | 0 | 0 | **1,0** |
| dispersion | 0,5 | 0 | 1 | 0 | 0 | **1,5** |
| lance-grenades | 0,5 | 1 | 0 | 0 | 0 | **1,5** |
| canon d'assaut | 0,5 | 0 | 1 | 0,5 | 0 | **2,0** |
| canon laser | 0 | 0 | 0 | 1 | 1 | **2,0** |
| fusil de siège | 0,5 | 0 | 0 | 0,5 | 1 | **2,0** |
| fusil de précision | 1 | 0 | 0,5 | 0 | 0,5 | **2,0** |
| railgun | 1 | 1 | 0 | 0,5 | 1 | **3,5** |

**La cible :**

```
Vcible / Vréf  =  1,00  +  0,04 × (D − 0,5)
tolérance : ± 0,05
```

Soit une fourchette réelle de **0,95 à 1,17** — le tir standard à 1,00, le
railgun à 1,12, et personne au-delà de 1,17. Quatre points de pourcentage par
point de difficulté : assez pour que l'arme dure vaille la peine, trop peu pour
que la maîtriser soit obligatoire.

**Trois propriétés de ce barème, toutes voulues :**

- **le tir standard reste la référence à 1,00**, ce qui est cohérent avec sa
  fiche — « aucune contrainte, aucun avantage ». C'est le repli sûr, et il ne
  doit jamais être le mauvais choix ;
- **l'écart max est de 17 %**, pas de 60 %. Une arme difficile est un peu mieux
  récompensée, elle n'est pas un palier de puissance. Le plan 11 disait déjà des
  hauts faits qu'ils *« ouvrent des portes, ils ne donnent pas de puissance »* —
  la même règle vaut pour la difficulté d'exécution ;
- **D se note sur des mécaniques, pas sur une impression.** « Y a-t-il une jauge »
  a une réponse dans le code. C'est ce qui rend la note reproductible quand une
  onzième arme arrive.

### Ce qu'il faut instrumenter

**Rien de tout ça n'est calculable aujourd'hui.** `p.hf.tirs` est le seul
compteur de tir qui existe. Il en faut quatre de plus, tous sur le joueur, tous
remis à zéro par manche :

```js
// game_state.js, bloc hf
armeTemps: 0,      // temps porté, en secondes
armeMuet: 0,       // temps où l'arme ne PEUT pas tirer (chaleur, recharge, charge)
armeCibles: 0,     // cumul des cibles touchées, un tir = n cibles
armeDegats: 0,     // dégâts réellement infligés par l'arme
```

D'où, en fin de manche :

```
U = 1 − armeMuet / armeTemps
R = armeDegats / (DPSnominal × (armeTemps − armeMuet))
Vhorde = DPSnominal × (armeCibles / tirs)
```

`armeMuet` est le seul qui demande du soin : il s'incrémente là où le tir est
**refusé pour cause de ressource**, pas là où le joueur choisit de ne pas tirer.
Trois sites : la saturation du laser, la recharge du fusil de siège, la charge
du railgun. Un temps mort volontaire n'est pas un temps muet — sinon le modèle
mesure le style de jeu du bot et pas l'arme.

### Ce que `verifierArmes()` devient

Le critère unique 60/160 disparaît. À sa place :

```js
for (const a of ARMES) {
  const cible = 1 + 0.04 * (difficulte(a) - 0.5);
  const v = valeurDelivree(a, mesures[a.id]) / vRef;
  if (Math.abs(v - cible) > 0.05) {
    out.push(`${a.id} : ${pct(v)} délivré pour une cible de ${pct(cible)}`
      + ` (difficulté ${difficulte(a)})`);
  }
}
```

Et il faut le dire : **ce critère ne peut pas tourner sans mesures.** Il lit un
fichier de campagne, il ne calcule pas dans le vide. C'est un changement de
nature — `verifierArmes()` passe de vérificateur statique à vérificateur de
campagne, comme les critères de récolte qui existent déjà plus bas dans le
fichier (`soucis.push("recolte : … eclats sur une manche pleine")`). Le modèle
est là, il suffit de s'y brancher.

### Le préalable obligatoire

`conversionBoss()` ne renvoie autre chose que `1` que pour `rebonds` et `lame`.
Six armes sur huit ont donc `Vboss = DPS nominal`, ce qui est faux pour le laser
(sa chaleur devient un bonus, `game_state.js:1433`) et pour la dispersion (ses
plombs convergent, ligne 1542) — **les deux mécaniques existent dans la
simulation et sont absentes de la fonction qui les compte.**

Ce n'est pas un détail de vérification. `powerIndex()` (ligne 605) se sert de
`dpsBase(a) × conversionBoss(a)` comme multiplicateur d'arme, et `powerIndex`
alimente `bossPower()`, donc **la mise à l'échelle des boss elle-même est calculée
sur une conversion fausse pour six armes**. Corriger `conversionBoss` corrige
trois choses d'un coup, et c'est le préalable de tout le reste de ce chantier.

### L'ordre d'exécution

1. **corriger `conversionBoss()`** pour les six armes manquantes — c'est du
   calcul à partir de mécaniques déjà écrites, pas de la conception ;
2. **poser les quatre compteurs** et une campagne de mesure par arme, manche
   complète, difficulté normale ;
3. **relever V pour les huit armes** et comparer à la cible ;
4. **corriger ce qui sort de la fourchette**, en touchant d'abord au terme qui
   déborde — la mesure dit lequel. Le commentaire du lance-grenades montre la
   méthode : la première coupe portait sur les dégâts, `verifierArmes()` l'a
   refusée, et la bonne coupe portait sur le rayon. **On coupe là où le
   débordement se mesure**, pas là où c'est commode ;
5. **rejouer la campagne** et vérifier qu'aucune correction n'en a cassé une
   autre.

### Ce que le modèle ne capture pas, volontairement

Pour qu'il reste vérifiable, il faut dire ce qu'il laisse dehors :

- **la synergie avec les cartes** — le tableau `ech` la porte déjà, et la
  mesurer ici reviendrait à mesurer deux fois ;
- **la composition d'équipe** — une lame derrière un Rempart n'est pas la même
  arme, mais une cible qui dépend du groupe n'est plus une cible ;
- **le plaisir** — il n'a pas de colonne, et c'est bien qu'il n'en ait pas. Le
  modèle sert à écarter les armes injouables ou évidentes ; ce qui reste entre
  0,95 et 1,17 se tranche en jouant.
