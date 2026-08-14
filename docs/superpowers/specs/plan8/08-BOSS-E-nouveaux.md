# Lot E — nouveaux boss et finaux par difficulté

**À faire en dernier.** Les lots A à D corrigent ce qui existe ; ce lot ajoute.
Écrire de nouveaux boss avant d'avoir la grammaire (B) et les archétypes (C)
reviendrait à produire du contenu qu'il faudrait réécrire.

## E-1 · Trois boss supplémentaires

`BOSS_POOL_COUNT: 5` reste — on tire toujours cinq boss par manche. Le pool
passe à **huit**, ce qui fait qu'une manche n'en montre plus que 5/8 : deux
parties consécutives cessent de se ressembler.

Chaque nouveau boss doit apporter un **verbe** et un **archétype** que le pool
n'a pas.

### Le Veilleur — verbe *renoncement* · archétype fixe
> « accepte de ne pas tirer »

Bâti autour de `MECH_GAZE`, qui existe et est sous-exploitée. C'est la seule
mécanique du jeu qui **interdit l'action principale** — en jeu de tir à double
stick, « détourner le regard » se traduit par *cesser de viser*, donc renoncer à
son DPS. Un boss entier sur ce principe est un verbe inédit.

- **base** : `regard`, `cone`, `salve`
- **unlock** : `[double regard]`, `[regard + damier]`, `[regard mobile]`,
  `[regard permanent en phase 5]`

En phase 5, l'œil ne se ferme plus : il faut tuer le boss en ne le visant que
par intermittence. C'est une fin de combat que personne n'a vue ailleurs.

### Le Tisseur — verbe *espace* · archétype constricteur mobile
> « il te reste de moins en moins de place »

Distinct du Ravageur : le Ravageur **retire** de l'arène par la périphérie, le
Tisseur **construit** à l'intérieur — murs, nœuds, zones interdites qui
s'accumulent où il passe.

- **base** : `mur`, `puddle`, `marques`
- **unlock** : `[noeuds destructibles]`, `[prison]`, `[quadrant]`, `[entrelacs]`

Les nœuds sont la contrepartie : les détruire **rend** de l'espace. C'est le seul
boss où le joueur peut réparer l'arène.

### Le Prisme — verbe *identification* · archétype multiple
> « lequel est le vrai »

Se scinde en copies qui rejouent les déplacements des joueurs avec un décalage.
Complémentaire des Jumeaux : là où les Jumeaux demandent de **séparer**, le
Prisme demande de **distinguer**.

- **base** : `copies`, `croix`, `marques`
- **unlock** : `[copies qui renvoient]`, `[echange]`, `[copies liees]`,
  `[la vraie change a chaque barre]`

⚠ **`minPlayers: 2`.** À un joueur, il n'y a rien à copier. C'est le premier boss
réservé au multijoueur, et c'est assumé — le repli existe déjà côté mécaniques.

## E-2 · Un boss final par difficulté

`BOSS_FINAL` (Amalgame, 8 barres, verbe *synthèse*) devient le final de
**`normal`**. Deux autres le rejoignent.

### Calme — **le Récitant** · 5 barres
> « tout ce qu'ils t'ont appris »

Un **récapitulatif** : il rejoue une mécanique de chacun des cinq boss du pool,
une par barre, dans l'ordre où on les a rencontrés, en classe de télégraphe
*lecture* (2,4 s).

C'est l'examen de fin d'apprentissage. Il ne demande rien de neuf — il vérifie
qu'on a appris la grammaire du lot B. Un joueur qui le passe est prêt pour
`normal`, et c'est exactement ce qu'un mode d'entrée doit produire.

### Normal — **l'Amalgame** · 8 barres
Inchangé. C'est déjà le meilleur boss du dépôt, et le seul dont les paliers sont
correctement occupés (`_deferAtk` sur `unlock[phase-1]`) — c'est lui qui sert de
modèle au lot A.

### Cauchemar — **le Silence** · 6 barres
> « il n'y aura pas d'avertissement »

Un combat **inconnu**, qui n'apparaît nulle part ailleurs. C'est la récompense de
contenu, celle dont on parle.

Sa signature : il est le seul du jeu autorisé à **casser une règle**, et une
seule — ses télégraphes ne s'affichent qu'**une fois**, à leur première
occurrence dans le combat. Ensuite, la mécanique revient sans annonce. On ne la
survit qu'en l'ayant retenue.

C'est un pari de conception assumé : ça ne fonctionne **que** parce que la
grammaire du lot B est acquise partout ailleurs. Une règle ne peut se briser que
si elle est solide.

- **base** : `salve`, `marques`, `croix`, `regard`
- **unlock** : `[sceau]`, `[synthese]`, `[entrelacs]`, `[double synthese]`,
  `[tout sans telegraphe]`

⚠ **Le seul endroit du plan où P3 est violé, volontairement.** À écrire en
dernier, et à retirer sans hésiter si les tests montrent que c'est frustrant
plutôt que mémorable.

## E-3 · Ce que ça implique côté données

- `BOSS_ROSTER` passe de 6 à **11 entrées** (8 du pool + 3 finaux) ;
- `BOSS_POOL_COUNT: 5` inchangé — le tirage puise dans les 8 premiers ;
- le final se choisit par `diffIndex` au lieu d'être constant ;
- ⚠ **`LEGENDARY_SPLIT = 5`** : les cartes légendaires sont réparties par boss.
  Passer le pool de 5 à 8 **ne doit pas** changer ce partage, sinon on
  reverrouille des cartes chez les comptes existants — même piège que la règle
  append-only du plan 6. Le partage reste sur **cinq paquets**, indexé sur le
  rang du boss dans la manche et non sur son identité.

## Critères d'acceptation

1. Deux manches consécutives montrent **au moins deux boss différents**.
2. Aucun nouveau boss ne partage verbe **ni** archétype avec un existant.
3. Le Récitant ne contient **aucune mécanique inédite**.
4. Le partage des légendaires est **identique** avant et après l'ajout — vérifié
   sur un profil existant.
5. Le Prisme ne sort jamais en solo.
