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

## G-2 · La magnitude et la structure de la méta

### L'incohérence, révélée par la matrice

La matrice de `PROFILS.md` demande que le taux de réussite en `normal` passe de
**5 % (P0) à 45-60 % (P1)**. Or P1, c'est ~30 parties, soit **×1,25 de
puissance** dans le système actuel.

**Un multiplicateur de 1,25 ne fait pas passer un taux de réussite de 5 % à
50 %.** C'est l'incohérence de fond : la matrice décrit un saut de nature, et
l'arbre ne propose qu'un saut de degré.

Elle se résout en séparant les deux moitiés de la progression :

> **Le saut P0 → P1 se paie en QUALITATIF** (secondes chances, qualité des
> choix). **Le saut P1 → P2 se paie en POURCENTAGES**, dont la queue est longue
> et sert `cauchemar`.

C'est ce que font Vampire Survivors (Revival, Amount) et Halls of Torment
(boutique globale puis traits). Ce n'est pas un emprunt de forme, c'est la seule
structure qui produit la matrice qu'on s'est donnée.

### Le second problème : le budget ne tenait pas

`TIER_COSTS` totalise 6 900 par ligne, six lignes par classe = **41 400 noyaux**,
soit **135 parties** à 307/manche. Mais `cauchemar` est conçu pour P2. Si P2
demande 135 parties, personne ne l'atteint et le mode est décoratif.

Le calibrage écrit dans le dépôt (« ligne complète vers la dix-huitième partie »)
était juste — **pour une ligne**. Personne n'avait multiplié par six.

### La structure retenue

Quatre familles, au lieu d'une seule grille cloisonnée par classe.

| famille | lignes | portée | rôle |
|---|---|---|---|
| **`CONFORT`** | 5 entrées uniques | compte | la qualité des choix — le vrai levier P0→P1 |
| **`SECOURS`** | 1 ligne, 5 paliers | compte | la clémence : `sursis`, relèvement automatique au palier 5 |
| **tronc commun** | 3 lignes | compte | PV, foulée, portée de ramassage — achetés une fois pour **toutes** les classes |
| **lignes de classe** | 6 lignes | par classe | l'existant, inchangé dans son contenu |

**`CONFORT` passe de 3 à 5 entrées** : relance, quatrième offre, ravitaillement
(existants), plus **bannissement** (le champ `bannedCards` existe déjà dans le
profil) et **seconde relance**. C'est la famille la moins chère et la plus forte :
la qualité d'une build tient au nombre de choix, pas au nombre de pourcentages.

**`SECOURS` est neuf.** Au palier 5, `sursis` donne **un relèvement automatique
par manche** — le `Revival` de Vampire Survivors. `selfRevive` existe déjà comme
mod de carte : rien de neuf à écrire côté simulation. C'est l'achat qui change
l'issue d'une partie, là où +20 % de dégâts n'en change que la marge.

**Le tronc commun règle le cloisonnement** (décision D10) : aujourd'hui, le
joueur qui dépanne en soigneur repart de zéro, ce qui est une taxe sur la
polyvalence dans un jeu où l'on change de rôle selon la table.

### Le budget, dérivé à rebours de la matrice

```js
CONFORT_COSTS: [250, 450, 500, 700, 900],   //  2 800  relance, 4e offre, ravito, bannissement, 2e relance
SECOURS_COSTS: [200, 400, 700, 1100, 1600], //  4 000  la ligne la plus chère : la plus forte
TRONC_COSTS:   [120, 220, 400, 700, 1160],  //  2 600  x3 lignes =  7 800
TIER_COSTS:    [100, 180, 320, 560, 840],   //  2 000  x6 lignes = 12 000  (était 6 900)
```

**Total pour un compte complet sur une classe : 26 600 noyaux.**

Vérification contre la matrice, à ~420 noyaux par manche (mélange de manches
médianes et complètes, post-D — valeur à confirmer par **M4**) :

| profil | contenu acquis | coût | parties |
|---|---|---|---|
| **P1** | `CONFORT` complet + `SECOURS` complet + paliers 1-3 partout | 12 620 | **30** ✔ |
| **P2** | tout | 26 600 | **63** ✔ |

P1 tombe à trente parties, ce qui est exactement la définition du profil. Et P1
possède alors **toute la partie qualitative** — les cinq conforts et le
relèvement automatique — plus des statistiques moyennes. C'est ce profil-là qui
doit gagner `normal` une fois sur deux, et c'est le relèvement automatique, pas
les +18 % de dégâts, qui produit ce chiffre.

### Ordre d'achat induit — et pourquoi il est bon

Les coûts font que le joueur achète naturellement `CONFORT` d'abord (250 pour la
relance dès la première partie), puis `SECOURS`, puis les statistiques. **C'est
l'ordre qui aide le plus tôt un joueur qui perd**, et il tombe tout seul : aucun
tutoriel, aucune recommandation à écrire.

### Garde-fou de puissance

Le tronc commun ajoute trois lignes, donc de la puissance. Le total pour un
compte complet passe de ×1,45 à environ **×1,65**. Cela reste **sous le plafond
de ×1,8** fixé aux critères d'acceptation : au-delà, `cauchemar` deviendrait
facile pour P2 et il faudrait un quatrième mode.

⚠ **Dépendance non vérifiée, à revoir en premier après les premiers retours :**
tout ce budget suppose **~420 noyaux par manche** et un public qui joue une
soixantaine de parties. Si vos sessions LAN sont plus courtes, il faut comprimer
davantage ; si le jeu se joue au long cours, on peut relâcher. C'est le seul
endroit du plan où une hypothèse sur le public détermine des nombres.

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
