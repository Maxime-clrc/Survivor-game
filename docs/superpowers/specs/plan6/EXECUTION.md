# Mode d'emploi — exécution des dix lots

Toutes les décisions de design sont arrêtées (`DECISIONS.md`). Ce document dit
**dans quel ordre** exécuter, **ce qu'il faut lire** à chaque étape, et **où
l'exécution s'interrompt volontairement**.

## Ce qu'il faut lire, et quand

`PERIMETRE.md` est un document de **cadrage**, pas d'exécution — il explique
pourquoi le plan couvre ce qu'il couvre. Inutile de le faire lire à l'exécutant.

En revanche, **deux documents doivent être lus avant le premier lot et gardés
sous la main** :

- **`README.md`** — l'index, l'ordre de dépendances, les six principes verrouillés
  et les portes fermées ;
- **`PROFILS.md`** — le référentiel de mesure. Chaque critère d'acceptation des
  dix lots y renvoie ; sans lui, « build médiane » ne veut rien dire.

Puis un lot à la fois, dans l'ordre ci-dessous.

## L'ordre

```
A  population          ← prérequis : grille spatiale ; inclut A-2
│
├─ B  bestiaire        ← juste après A, AVANT C
├─ J  traits, élites   ← dette de A : ses plafonds visent 200 ennemis, A monte à 622
│
├─ C  PV et TTK        ← se calibre sur la densité de A et la vitesse de B
│   ├─ D  expérience   ← le TTK pilote le débit d'XP
│   │    └─ G  compte  ← dépend de la distribution de niveaux de D
│   └─ H  boss         ← besoin de BOSS_POWER_REF (C), se cale sur la courbe de D
│
├─ E  cartes           ⟂ E-1 en premier : prérequis d'écriture de tout le reste
├─ F  reliques         ⟂
└─ I  classes          ⟂
```

**Séquence linéaire recommandée :** `A → B → J → C → D → H → G → E → F → I`.

`I` en dernier n'est pas un hasard : ses matrices de survie ne veulent rien dire
tant que la densité, la vitesse et les PV bougent encore.

## L'exigence transversale : le script avant le lot suivant

**Chaque lot livre son script de vérification en même temps que son code**, sur
le modèle de `verifierScript()` et `verifierBiomes()` déjà présents dans le
dépôt.

C'est ce qui rend viable l'enchaînement des dix lots. Les valeurs écrites dans
les lots sont des **estimations** — certaines à ±50 % — parce que les sept
mesures n'ont pas encore été faites. Sans scripts, dix lots enchaînés donnent un
jeu déséquilibré dont on ne saura pas démêler les causes. Avec, on exécute tout,
on lance les scripts une fois, et on sait quel critère est rouge et de combien.

Scripts attendus, par lot :

| lot | ce que le script vérifie |
|---|---|
| A | temps de première saturation, population moyenne par segment, ms/image |
| B | **doctrine des 90 %** sur 3 difficultés × 30 min ; spread lent/rapide ; sortie d'encerclement |
| J | part de horde porteuse d'un trait ; saturation des plafonds ; préavis simultanés |
| C | TTK aux minutes 1/10/20/30 × 3 difficultés ; durée des combats de boss |
| D | écart-type du nombre de cartes ; répartition des niveaux par tranche |
| H | durée de combat boss 1 vs boss 6 ; densité de renforts par joueur ; taux d'enrage |
| G | `coresForRun` sur la distribution réelle ; parties pour une ligne complète |
| E | **garde-fou de pool** (rareté sous 6 cartes éligibles) ; cartes mortes |
| F | reliques achetées par manche ; part du catalogue vue ; taux de relance |
| I | matrices de survie et de composition ; **tank solo à P0 en calme** |

## Les deux seules interruptions volontaires

Le lot **E** s'écrit en trois vagues (décision D12), avec une mesure entre
chacune :

1. **E-1** (conditionnement : `requires`, `minPlayers`, `teamUnique`,
   `requiresSystem`, garde-fou, règle append-only) + **E-2** (retrait de
   `scoreMul`) — aucune carte neuve, correction pure ;
2. les axes **coop** (6 cartes) et **boss** (3) — les deux plus gros trous ;
3. le reste (environnement, entrave, événements, récolte, esquive), puis les
   14 reliques du lot F.

Vingt cartes neuves d'un coup rendent impossible d'attribuer un déséquilibre à
sa cause.

## Le critère de clôture

Ce n'est aucun des critères de lot. C'est la **matrice de `PROFILS.md`** :

| | calme | normal | cauchemar |
|---|---|---|---|
| **P0** compte neuf | **20-30 %** | 5 % | ~0 % |
| **P1** ~30 parties | 70 % | **45-60 %** | 5-10 % |
| **P2** compte complet | 90 % | 75 % | **25-35 %** |

Plus le garde-fou **M5** : *P0 en normal ne doit pas reculer.* Les lots A à C se
compensent — A ajoute des ennemis, B et C en retirent la vitesse et les PV — et
le net sur un compte neuf n'est écrit nulle part. Dix lots individuellement verts
dont la somme est mauvaise, c'est le piège le plus banal d'un chantier
d'équilibrage.

## Ce que l'exécutant ne doit pas faire

- **Ne pas rouvrir une décision de `DECISIONS.md`.** Les quinze sont arrêtées,
  avec leur raisonnement. Si le code résiste, c'est un signal à remonter, pas une
  autorisation à trancher autrement.
- **Ne pas insérer de carte au milieu du tableau `CARDS`** — append-only, sinon
  les affectations de légendaires par boss se décalent et reverrouillent des
  cartes chez les comptes existants.
- **Ne pas toucher au tableau `armes`** (décision D3) : le besoin est couvert par
  le filtre `requires`, pas par un déplacement d'index.
- **Ne pas indexer une courbe sur sa propre sortie** — principe verrouillé n°2.
  Si une valeur semble devoir dépendre du niveau, de la puissance ou de la
  composition de l'équipe, c'est qu'il faut l'indexer sur la **minute**.
- **Ne pas faire varier une statistique de monstre avec l'effectif.** Ce qui
  varie avec le nombre de joueurs est la quantité (lot A) et la géométrie.
