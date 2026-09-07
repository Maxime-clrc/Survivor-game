# 05 · Hauts faits — les 36, structure extraite

## La structure réelle (extraite, pas supposée)

36 hauts faits, répartis en 3 niveaux : **10 simples, 14 intermédiaires,
12 défis**. Et la répartition des récompenses est parfaitement régulière :

| niveau | nombre | ce qu'ils donnent |
|---|---|---|
| 0 — simple | 10 | cartes, reliques, 2 **lignes** de progression (`tronc`, `secours`), 2 **armes** (assaut, lame) |
| 1 — intermédiaire | 14 | **7 armes** (laser, tesla, siège, précision, railgun, dispersion, grenade), cartes, reliques |
| 2 — défi | 12 | **cadres uniquement** — aucune exception |

### Trois constats que ça produit

**1. L'invariant « aucune puissance permanente » tient parfaitement.** Les 12
hauts faits les plus durs donnent **exclusivement des cadres** (cosmétique).
Aucun ne touche `mods.*`. Le principe écrit en commentaire d'en-tête de
`hauts_faits.js` est respecté sans exception. Le risque de « checklist de
farming » que le brief redoute est structurellement absent : il n'y a rien à
farmer qui rende plus fort.

**2. Les hauts faits sont le distributeur d'armes du jeu.** 9 armes sur 10 sont
verrouillées derrière un haut fait (`sur_le_terrain` → assaut, `au_contact` →
lame, puis les 7 du niveau 1). Un compte neuf a **une seule arme**. Ce n'est pas
un système de collection annexe : c'est le chemin d'accès au contenu principal.

Conséquence pour toute refonte : **supprimer ou fusionner un haut fait de
niveau 0 ou 1 revient à supprimer l'accès à une arme, une ligne ou un lot de
cartes.** Les verrous se déduisent de `TOUTES_RECOMPENSES` (`VERROUILLABLES`,
`ARMES_VERROUILLABLES`), donc un identifiant retiré ouvre silencieusement son
contenu à tout le monde. C'est le vrai risque de ce chantier, et il n'était
dans aucun brief.

**3. Les deux lignes de progression communes sont elles-mêmes verrouillées.**
`recrue` → `tronc`, `curieux` → `secours`. Ces deux hauts faits n'ont donc pas
de substitut : ils ouvrent l'accès à `carcasse`/`foulee`/`glanage` et à
`sursis`. Ils interagissent directement avec le chantier 01 — vérifier qu'un
budget méta ne rend pas absurde une ligne tout juste débloquée.

## Ce qui reste à auditer

L'audit contenu par contenu reste à faire, mais avec un cadrage resserré par ce
qui précède :

### Périmètre réellement ouvert

- **Niveau 2 (12 défis, cadres seulement)** : le seul groupe où
  supprimer/fusionner/remplacer ne casse aucun accès au contenu. C'est là que
  la marge de manœuvre est réelle, et là que « est-ce un objectif intéressant
  ou un compteur arbitraire ? » se pose sans risque.
- **Niveaux 0 et 1** : REWORK possible (changer la **condition** d'obtention),
  REMOVE quasi exclu (casse un verrou). Si une condition est jugée mauvaise, la
  remplacer sans toucher à l'identifiant ni à la récompense.

### Méthode de calibration, déjà présente dans le dépôt

`HF_CFG` contient des constantes calibrées empiriquement — exemple documenté :
`ECONOMIE_TIRS: 90`, avec le relevé « 118 tirs pour 100 kills en médiane,
40 joueurs-manches ». **Cette méthode existe et a servi au moins une fois.**
La généraliser aux 35 autres via `traces/*.jsonl` plutôt que d'estimer à l'œil.

Le croisement décisif : `HF_NIVEAUX` déclare une difficulté ; la télémétrie
donne la fréquence réelle. Un « défi » obtenu par 80 % des joueurs est mal
classé, un « simple » obtenu par 5 % l'est autant dans l'autre sens. C'est ce
croisement qui produit les verdicts REWORK, pas une lecture des libellés.

### Nouveaux hauts faits — où il y a de la place

Le niveau 2 étant cosmétique pur, on peut y ajouter sans aucun risque
d'équilibrage. Axes cohérents avec le contenu existant :

- **maîtrise d'arme** : gagner avec une arme donnée sans prendre une seule
  carte de sa famille — récompense la compréhension de l'arme nue, et 9 armes
  sont déjà identifiées par famille (`arme_laser`, `arme_tesla`, …) ;
- **coopération mesurable** : dépend de l'agrégation de contribution du
  chantier 06 (aujourd'hui seul le DPS brut est mesuré) ;
- **maîtrise de difficulté** : cauchemar sur un segment donné sans être mis à
  terre, plutôt qu'un volume brut de kills.

À éviter : toute condition dépendant d'un tirage que le joueur ne peut pas
influencer (« obtenir la carte X »), source de frustration pure.

## Invariant à automatiser

Le principe « un haut fait ouvre des portes, il ne donne pas de puissance » est
tenu aujourd'hui, mais **rien ne le vérifie**. `verifierHautsFaits` contrôle la
cohérence structurelle (cadres orphelins, identifiants), pas ce principe.

Ajouter un contrôle : pour chaque entrée de `TOUTES_RECOMPENSES`, le type est
dans `{carte, arme, relique, ligne, cadre}` et jamais un modificateur. Six
lignes de test qui protègent définitivement l'invariant — d'autant plus utile
que ce plan propose d'**ajouter** des hauts faits.

## Fichiers

- `shared/hauts_faits.js` — conditions, `HF_CFG`, nouveau contrôle
- `shared/game_state.js` — suite de vérification
- `traces/*.jsonl` — source de calibration
- `docs/regles/CONTENU.md`
