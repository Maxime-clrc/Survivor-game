# Lot G — la progression de compte

**Dépend de D** pour la partie revenu. La partie contenu (G-2, G-3) est
indépendante et peut avancer en parallèle.

Lot réécrit après la question du **rôle de la méta** : dans un survivor, perdre
ses premières parties est normal, et ce sont les améliorations permanentes qui
finissent par ouvrir la fin de la manche. Le lot G ne se contente donc plus de
recalibrer un revenu — il vérifie que la méta **peut tenir ce rôle**.

Prérequis de lecture : **[PROFILS.md](PROFILS.md)**.

---

## G-1 · Le revenu, recalibré après D

L'étalonnage actuel est explicitement dérivé d'une hypothèse : *« une manche
atteint le niveau 15 à 20 en médiane et 22 à 26 pour une manche complète »*.

```
médiane normal      18 × 8 + 3 × 25 = 219, ×1,4 = 307
complète normal     26 × 8 + 6 × 25 = 358, ×1,4 = 501
complète cauchemar                    358, ×2   = 716 → plafonnée à 600
```

Si D déplace la médiane vers le haut (cible : 20 à 24), le revenu monte de ~15 %
et `CORE_RUN_CAP = 600` se met à mordre sur la manche complète en **normal**. Or
le rôle du plafond est de borner la soirée exceptionnelle, pas le cas nominal —
exactement le défaut que le lot H avait corrigé en descendant `CORE_LEVEL`.

**Décision : ne rien changer avant la mesure.** Si le plafond mord sur le cas
nominal, l'ajustement porte sur **`CORE_LEVEL` (8 → 7)**, jamais sur
`CORE_RUN_CAP` : un plafond de sécurité se constate, il ne se règle pas.

---

## G-2 · La magnitude de la méta — le vrai sujet

### Constat

| | gain de puissance | parties nécessaires |
|---|---|---|
| premier palier des 6 lignes | ×1,08 | 4 |
| trois paliers partout | ×1,25 | ~30 |
| **compte complet (1 classe)** | **×1,45** | **~135** |

À comparer avec ce qu'une manche donne elle-même : 26 cartes valent **×4 à ×5**.

**La méta pèse donc environ un dixième de ce que pèse une partie.** Si l'intention
est « les améliorations permanentes sont ce qui finit par ouvrir la fin », elle
est **sous-dimensionnée pour ce rôle** : à ×1,45 au bout de cent trente parties,
c'est l'habileté et la chance de tirage qui décident, pas le compte.

Point de comparaison utile : dans Vampire Survivors, la boutique donne largement
plus que +45 %, et surtout elle donne **deux résurrections** et **un projectile
supplémentaire** — des changements de nature, pas des pourcentages.

### Décision — élargir par le QUALITATIF, pas par le pourcentage

Monter les pourcentages est la mauvaise réponse : ça rend le compte complet
trivial en normal sans rien changer au compte neuf, puisque le problème du
débutant n'est pas de manquer 20 % de dégâts, c'est de mourir au segment 3 sans
recours.

**Trois ajouts, tous qualitatifs.**

**1. Un tronc commun de secours** — nouvelle ligne, disponible aux trois classes :

```js
SECOURS = [
  { id: "sursis",    step: 1,    desc: n => n >= 5 ? "un relèvement automatique par manche" : `−${8*n} % de temps à terre` },
  { id: "paquetage", step: 0.10, desc: n => `+${pct(0.10*n)} de PV au début de la manche, sous forme de bouclier` },
]
```

`sursis` au palier 5 donne **une seconde chance par manche**. C'est le
`Revival` de Vampire Survivors, et c'est précisément le genre d'achat qui change
l'issue d'une partie au lieu d'en changer la marge. `selfRevive` existe déjà
comme mod de carte — rien de neuf à écrire côté simulation.

**2. Élargir `CONFORT`, qui est la meilleure valeur du jeu et ne compte que trois
entrées.** « Quatrième offre » vaut à elle seule plus que trois paliers d'arbre :
la qualité d'une build tient au nombre de choix, pas au nombre de pourcentages.
Deux entrées à ajouter :

- **bannissement** — retirer définitivement une carte de ses tirages (le champ
  `bannedCards` existe déjà dans le profil) ;
- **seconde relance** — la relance de tirage passe à deux par manche.

**3. Un tronc commun de puissance, partagé entre les classes.** Aujourd'hui
l'arbre est **cloisonné par classe** : 41 400 noyaux par classe, soit ~400 parties
pour les trois. Dans un jeu coopératif où l'on change de rôle selon la table,
c'est une taxe sur la polyvalence — le joueur qui dépanne en soigneur repart de
zéro.

Deux ou trois lignes communes (PV, vitesse, portée de ramassage), achetées une
fois pour toutes les classes. C'est la distinction que fait Halls of Torment entre
sa boutique globale et ses traits par personnage.

---

## G-3 · Les jalons de niveau, après D

`SLOTS_LEVEL = 12` donne un emplacement au niveau 12 ; `LEGENDARY_LEVELS = [12, 22]`
vise « la même place relative » sur un objectif de 22 à 26. Si D porte l'objectif
à 24-28, les deux doivent suivre — à **`[13, 24]`** pour les légendaires.

`TIER_COSTS` (6 900 la ligne, « ligne complète vers la dix-huitième partie ») est à
revalider une fois le revenu réel connu. C'est la seule grandeur du plan qui se
compte en semaines de jeu.

---

## Critères d'acceptation

1. Le plafond `CORE_RUN_CAP` ne mord **que** sur cauchemar complet.
2. La progression d'une ligne reste dans la fourchette 15-20 manches.
3. **La matrice de cohérence de [PROFILS.md](PROFILS.md) est vérifiée** : P0
   termine calme en jouant bien, P1 termine normal, P2 termine cauchemar.
4. Aucun jalon de compte ne devient inatteignable ou trivial du fait de D.
5. Le gain méta d'un compte complet reste **sous ×1,8** : au-delà, cauchemar
   devient facile pour P2 et il faudrait un quatrième mode.
