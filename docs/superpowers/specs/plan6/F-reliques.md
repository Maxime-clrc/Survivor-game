# Lot F — marchand, éclats, catalogue de reliques

Le marchand n'est pas déséquilibré : il est **résolu** avant la moitié de la
manche.

## Constat — le triple problème

**1. Le catalogue est plus petit que la demande d'une seule manche.**
10 reliques pour **18 offres** (6 boss × `OFFER_COUNT = 3`). Au troisième
marchand, tout a été vu.

**2. Le revenu couvre la dépense maximale.**

- revenu : un point de récolte toutes les 25 à 45 s, 15 à 35 éclats, **versés en
  entier à chaque joueur** (`for (const p of this.players.values()) p.eclats += gain`).
  Sur 1800 s de horde, à 60-80 % de points récoltés : **800 à 1000 éclats par
  joueur** ;
- dépense : 18 offres à `PRICE = [25, 45, 80, 150]` ≈ **1 200 éclats**.

`RELIC_CFG` dit « c'est un budget à répartir ». Il n'y a rien à répartir : le
budget n'a jamais été inférieur à ce qu'il y a à acheter.

**3. La répartition par palier est presque plate.** 3 communes, 3 rares, 3
épiques, 1 légendaire — là où les cartes utilisent `RARITY_WEIGHT = [60, 28, 10, 1]`.
Une épique tombe presque aussi souvent qu'une commune.

---

## Décision 1 — un seul achat par marchand

| | actuel | revenu ÷2 seul | revenu ÷2 + achat unique |
|---|---|---|---|
| offres vues | 18 | 18 | 24 (à 4 offres) |
| achats possibles | 18 | ~10 | **6** |
| revenu par joueur | 800-1000 | 400-500 | 400-500 |
| coût des achats | ~1 200 | ~1 200 | ~360 |
| **reste pour les relances** | 0 | ~0 | **~150** |

Le troisième modèle est le seul où il **reste de l'argent après les achats**. La
relance cesse d'être un luxe pour devenir le vrai usage de la monnaie : un joueur
qui voit quatre reliques médiocres peut payer pour en voir quatre autres — une
décision, avec un coût, un risque et un renoncement.

### Ce que ça coûte : une décision verrouillée à rouvrir

`reliques.js` dit explicitement le contraire :

> achats **INDÉPENDANTS** — contrairement aux cartes ce n'est pas un choix
> exclusif, c'est un budget à répartir

Il faut donc rouvrir la décision franchement. Le raisonnement d'origine était
bon ; sa prémisse ne l'a jamais été.

**Trois raisons qui ne sont pas des préférences :**

- **Un budget contraint est invisible, un choix exclusif se voit.** Un joueur qui
  achète deux reliques sur trois faute d'argent n'a rien sacrifié — il n'avait pas
  assez. Avec un achat unique, il a regardé quatre objets et en a pris un. C'est
  ce qui rend l'écran de cartes bon, et le marchand n'a aucune raison d'être le
  seul écran du jeu où l'on ne choisit pas.
- **Ça dimensionne le catalogue.** Six achats sur 24, c'est **25 % du catalogue
  par manche** : deux parties consécutives ne se ressemblent plus. À dix achats
  on est à 42 % et la différence s'estompe.
- **Ça remet la puissance sous contrôle.** Six objets en valeur brute au lieu de
  dix-huit, c'est ce qui autorise à les rendre **individuellement plus forts** —
  ce dont le catalogue a besoin : à `+6 dégâts bruts`, `Éclat dur` ne se remarque
  pas au milieu de vingt-six cartes.

### Réglages

```js
RELIC_CFG = {
  OFFER_COUNT: 4,           // était 3 — un choix exclusif mérite un choix plus large
  BUY_PER_VISIT: 1,         // nouveau
  REROLL_BASE: 10,          // était 6
  REROLL_LEVEL: 3,          // était REROLL_WAVE: 2 (dette d'unité, ci-dessous)
  PRICE: [25, 45, 80, 150], // inchangés : le rapport entre paliers est bon
  WEIGHT: [50, 28, 15, 4],  // nouveau — plus plat que les cartes, voir plus bas
}
```

**La relance doit croître DANS la visite**, pas seulement sur la manche. Avec un
achat unique, rien n'empêche d'enchaîner cinq relances jusqu'à trouver l'épique
voulue :

```js
relicRerollCost(niveau, dansLaVisite) {
  return Math.round((REROLL_BASE + REROLL_LEVEL * Math.max(0, niveau - 1))
    * Math.pow(1.8, dansLaVisite));
}
```

**Ne pas relever le revenu pour compenser.** La cible de 400-500 éclats finance
six achats et une dizaine de relances. Si le revenu remonte, la relance redevient
gratuite et le problème est seulement déplacé.

**Garder « une seule légendaire par manche ».** À poids 4/97 et six tirages de
quatre offres, une légendaire apparaît dans un peu plus d'une manche sur deux :
la contrainte ne mord presque jamais, elle reste comme garde-fou.

### Le point à surveiller en test

Avec six achats, **le marchand du segment 1 devient un piège** : on y dépense
pour une commune ce qu'on regrettera au segment 5 face à une épique. Si la bonne
stratégie s'avère être de sauter les deux premiers marchands, c'est que les
paliers ne se départagent pas, et il faudra faire monter la **qualité de
l'offre** avec le segment, comme `QUALITY_PER_LEVEL` le fait pour les cartes.
**À ne faire qu'après mesure** : posé d'avance, ce correctif masquerait le vrai
problème.

---

## Décision 2 — le revenu

Les prix sont bons ; c'est le revenu qui est deux fois trop élevé.

```js
HARVEST_YIELD_MIN: 10,     // était 15
HARVEST_YIELD_MAX: 22,     // était 35
```

Cible : **400 à 500 éclats par joueur et par manche**. « Je garde pour une épique
au prochain marchand » devient une stratégie.

**Ne pas toucher au versement à l'équipe entière.** C'est la bonne décision et
elle est déjà argumentée : celui qui explore prend le risque, celui qui tient la
ligne ne doit pas être taxé. La récolte reste un acte coopératif.

## Décision 3 — le catalogue à 24

Répartition `10 / 7 / 5 / 2`. Vingt-quatre pour dix-huit à vingt-quatre offres :
on ne voit plus tout, et deux manches ne proposent plus la même chose. Deux
légendaires plutôt qu'une.

`WEIGHT: [50, 28, 15, 4]` est **plus plat que celui des cartes**, volontairement :
le marchand est un achat, pas un cadeau. Voir une épique sans pouvoir se la payer
est une décision, pas une frustration.

## Dette d'unité à solder

`relicRerollCost(niveau)` et `RELIC_CFG.REROLL_WAVE` portent encore le mot
« vague », qui n'existe plus depuis le plan 5. La fonction reçoit déjà le niveau
d'équipe ; seuls le nom et le commentaire mentent. À renommer `REROLL_LEVEL` —
cosmétique, mais c'est le genre de nom qui fait régler la mauvaise grandeur trois
lots plus tard.

---

## Les 14 reliques à écrire

Deux règles de construction, reprises de `reliques.js` : **valeur brute et non
pourcentage** — c'est ce qui fait qu'une relique reste utile sur une build qui
n'a rien pris dans son axe — et **au moins trois objets à contrepartie**, le
dépôt n'en ayant que deux et notant lui-même que c'est le type le plus
intéressant.

Les valeurs sont plus hautes que le catalogue actuel : à six objets par manche
au lieu de dix-huit, il faut que chacun se voie.

### Communes (+7 → 10) · 25 éclats

| id | nom | effet | axe orphelin |
|---|---|---|---|
| `silex` | Silex | +5 dégâts de brûlure bruts | états |
| `semelle_cloutee` | Semelle cloutée | immunité aux sols glissants | hasards |
| `contrepoids` | Contrepoids | −0,6 s de recharge d'esquive | esquive |
| `lame_recolte` | Lame de récolte | canalisation d'un amas deux fois plus rapide | récolte |
| `fanion` | Fanion | +15 PV bruts aux alliés à moins de 6 m | coop |
| `cran_arret` | Cran d'arrêt | +12 dégâts bruts sur le premier tir après une esquive | esquive |
| `besace` | Besace | +6 éclats par point de récolte | économie |

### Rares (+4 → 7) · 45 éclats

**`crochet`** — 10 % de chance d'entraver la cible 1 s. *Pendant de `Filins` en
relique. Les deux coexistent : la carte dépend de la build, la relique non — c'est
la distinction que `reliques.js` pose.*

**`trousse_campagne`** — relever un allié rend 30 PV bruts aux deux.

**`boussole`** — un point de récolte de plus au sol en permanence. *Touche
`HARVEST_MAX_GROUND`, donc **effet d'équipe**, à signaler à l'achat. Cohérent
avec le versement des éclats à toute la table.*

**`marteau_breche`** — +30 dégâts bruts contre les structures de mécanique de
boss. *Les tours de `MECH_TOWER` sont des sacs de PV que personne ne peut
construire à casser. Très spécialisé : c'est ce qui en fait une bonne relique
plutôt qu'une bonne carte.*

### Épiques (+2 → 5) · 80 éclats

**`terre_brulee`** — +22 dégâts bruts contre tout ennemi dans un hasard du sol.
*Remplace `Cœur de tempête` (version météo, cauchemar-only). Fait équipe avec la
carte `Conducteur` sans la dupliquer : l'une blesse dans la zone, l'autre bonifie
ce qu'on y tire.* ⚠ `requiresSystem: "hasards_actifs"` — le marchand ne doit pas
l'offrir en `calme`.

**`registre`** — chaque barre de boss brisée donne +7 dégâts bruts, jusqu'à
+105, pour le reste de la manche. *L'objet le plus fort du lot, et c'est voulu :
acquis tôt, il récompense d'aller au bout des six combats. Le plafond à quinze
barres est le garde-fou.*

### Légendaire (+1 → 2) · 150 éclats

**`serment_de_fer`** — +35 dégâts bruts et +50 PV bruts à **tous les alliés**,
mais tu ne peux plus être soigné par qui que ce soit.

*Contrepartie : aucun soin reçu.* La légendaire coopérative qui manque en face de
`Cœur-machine`, purement individuelle. La contrepartie est réelle en équipe (elle
neutralise le soigneur sur toi) et **presque nulle en solo** — défaut connu, la
piste de correction est de la rendre indisponible au tirage en solo plutôt que
d'affaiblir l'effet.

---

## Critères d'acceptation

1. Un joueur achète **6 reliques** par manche complète (plafond structurel) et en
   **voit moins de 70 %** du catalogue.
2. Le taux de relance est **entre 15 et 40 %** des visites : sous 15 % elle est
   trop chère, au-dessus de 40 % elle est gratuite.
3. Aucun palier n'est acheté dans plus de **50 %** des cas — si les communes sont
   prises systématiquement, les prix ne se départagent pas.
4. La stratégie « sauter les deux premiers marchands » n'est pas dominante.
