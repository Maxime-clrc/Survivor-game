# Survivor LAN — plan 12 : cartes, armes, interface

Le plan 11 a livré la **mécanique** : dix armes annoncées, les hauts faits
nommés, les cadres. Ce plan livre ce qui manque pour que ça se joue.

Sept plans. **L'ordre d'exécution est celui des lots**, plus bas — pas celui des
numéros de fichier.

| # | plan | objet |
|---|---|---|
| **01** | [interface](01-INTERFACE.md) | overlays coupés, écran d'arme, cadres |
| **02** | [règles fausses](02-REGLES.md) | plafond de PV, éclats, portée de la grenade |
| **03** | [audit des huit armes](03-AUDIT-ARMES.md) | carte piège, armes muettes, railgun sans charge |
| **04** | [pool de cartes](04-POOL.md) | cartes mortes, familles vides |
| **05** | [armes manquantes](05-ARMES-MANQUANTES.md) | fusil de siège, fusil de précision, 20 cartes |
| **06** | [équilibrage](06-EQUILIBRAGE.md) | le modèle, l'instrumentation, la campagne |
| **07** | [tesla](07-TESLA.md) | la refonte de la délivrance |

Les **chantiers gardent leurs numéros 01 à 12** d'un bout à l'autre : ce sont des
identifiants stables, pas des positions. Un plan en contient un ou plusieurs, et
l'ordre d'exécution les prend dans un ordre à lui.

---

## D'où viennent ces douze chantiers

| # | chantier | source | où ça casse |
|---|---|---|---|
| **01** | overlays coupés | test + audit | `.overlay` centre un contenu plus haut que l'écran |
| **02** | écran d'arme | test | `#briefArme` sans largeur, aucun état de survol |
| **03** | le plafond de PV fuit | test | `hpCap` appliqué **avant** les reliques et les lignes |
| **04** | éclats intouchables | test | seules les **balles** frappent un cristal |
| **05** | tesla | test | auto-visée, 34 m de portée, arme finie dès la vague 1 |
| **06** | lance-grenades | test | explose en fin de vie, pas au réticule |
| **07** | modèle d'équilibrage | test | le critère ne regarde que le DPS nominal |
| **08** | cartes mortes | audit | rien ne filtre le pool par arme portée |
| **09** | cadres | test | un cadre décore un mot, pas un joueur |
| **10** | familles vides | audit | 3 armes appauvrissent leur propre pool |
| **11** | armes fantômes | audit | 2 armes récompensées n'existent pas |
| **12** | audit des huit armes | audit | carte piège, 2 armes muettes, railgun sans charge |

Six viennent du test, six d'un audit du dépôt. **11 est le plus lourd** — c'est
du plan 11 jamais exécuté, pas une régression. **12c est le plus urgent** : une
carte de rareté 1 retire jusqu'à 33 % de dégâts en échange de rien, sur la
moitié des armes, en ce moment même.

---

## L'état réel du plan 11

| plan 11 | annoncé | dans le dépôt | reste |
|---|---|---|---|
| **01** cartes | familles complètes | 158 cartes, 16 familles, `verifierCatalogue()` muet | rien |
| **02** armes | 10 armes, 40 cartes de famille | **8 armes**, 16 cartes | 2 armes + **20 cartes** |
| **03** hauts faits | récompenses nommées | 36 hauts faits, `verifierHautsFaits()` muet | la validation des ids d'arme |
| **04** cadres | 5 emplacements, 3 paliers | 13 cadres, 12 peaux, tous donnés et vérifiés | le matériau |

01 et 03 sont finis et se vérifient tout seuls. **02 est à moitié fait**, et ses
deux vérificateurs — `verifierArmes()` et `verifierHautsFaits()` — sont
précisément ceux qui ne regardent pas ce qui manque.

---

## L'ordre d'exécution

Six lots. Le principe tient en une phrase :

> **On arrête ce qui saigne, on répare ce qui ment, on pose les filets, on
> écrit le contenu, on équilibre une fois, on habille en dernier.**

### Lot 1 — arrêter les pertes

Cinq changements courts, aucun ne touche la simulation, tous se voient
immédiatement. Ce lot existe parce que trois de ces défauts **retirent en ce
moment de la valeur au joueur**, et qu'il serait absurde de les laisser tourner
pendant les semaines que prendront les lots 4 et 5.

| ordre | chantier | geste |
|---|---|---|
| 1 | **12c** *(immédiat)* | retirer « Second canon » du pool des cinq armes qui ne lisent pas `extraBarrels` |
| 2 | **10** *(immédiat)* | `famille: true` déclaré au lieu de déduit — trois pools cessent de s'appauvrir |
| 3 | **11** *(affichage)* | la branche `arme` dans `nomsRecompense()` |
| 4 | **01** | `justify-content: safe center` |
| 5 | **02** | largeur, grille à trois colonnes, états de survol et de sélection |

**Critère de sortie.** Une manche à la lame ou à la dispersion ne peut plus
proposer « Second canon ». Le haut de la page Hauts faits est lisible. Les trois
armes tiennent sur une ligne et réagissent au survol.

### Lot 2 — réparer les règles fausses

Là où le jeu annonce une chose et en fait une autre. Aucune décision de
conception : dans les cinq cas, il n'y a qu'une bonne réponse.

| ordre | chantier | geste |
|---|---|---|
| 1 | **03** | `hpCap` devient un point de passage unique, en **fin** de chaîne |
| 2 | **04** | le cristal devient une cible pour le faisceau, l'arc et le balayage |
| 3 | **06** | la grenade détone à `p.aimR`, et un marqueur au sol l'annonce |
| 4 | **12b** | `kind 17` dans `EFFECT_SOUND`, boucle sonore pour le faisceau |

**Pourquoi 04 ici et pas plus tard.** C'est le préalable du lot 6 : on ne
retouche pas l'acquisition du tesla tant qu'un type de cible entier lui est
encore inaccessible.

**Critère de sortie.** Les huit armes cassent un cristal. Contrat de sang
plafonne vraiment. La grenade explose sous le curseur. Aucune arme n'est
silencieuse.

### Lot 3 — poser les filets

**Le lot pivot.** Il n'ajoute pas une ligne de contenu : il ajoute les critères
qui empêcheront les lots 4 et 5 de recreuser les mêmes trous. Le fil rouge du
plan 11 s'est cassé trois fois de suite (récompense indexée, famille déduite,
récompense nommée sans cible) parce que chaque garde-fou a été écrit **après**
le contenu qu'il aurait dû surveiller.

| ordre | chantier | geste |
|---|---|---|
| 1 | *(préalable)* | **`conversionBoss()` pour les six armes manquantes** |
| 2 | **12d** | `perforation: 0` sur le laser et le railgun — décrire la réalité |
| 3 | **12e** | critère : toute carte offensive est dans le tableau, ou exemptée par `horsEchelle` |
| 4 | **08** | le filtre par axe dans `eligibleCards`, `poolThin()` rejoué par arme |
| 5 | **11** *(validation)* | `verifierHautsFaits(…, armeIds)` + le test inverse |
| 6 | **10** *(critère)* | toute famille déclarée compte exactement 4 cartes |
| 7 | **12c** *(structurel)* | `barrelDamageMul` descend là où `extraBarrels` est lu |

**Le préalable est le point le plus important du plan.** `conversionBoss()` ne
renvoie autre chose que `1` que pour `rebonds` et `lame`. Or `powerIndex()`
l'utilise comme multiplicateur d'arme, et `powerIndex` alimente `bossPower()` :
**la mise à l'échelle des boss tourne aujourd'hui sur une conversion fausse pour
six armes sur huit.** Le corriger règle d'un coup la vérification, le modèle
d'équilibrage et le scaling des boss.

**Critère de sortie.** `verifierArmes()`, `verifierHautsFaits()` et
`verifierCatalogue()` remontent chacun **au moins une erreur** — celles des lots
4 et 5, qui n'ont pas encore été faits. Un lot 3 qui rend tout silencieux n'a
pas posé de filets, il a posé des tests complaisants.

### Lot 4 — écrire le contenu manquant

Le gros volume. Il vient après les filets, donc chaque ajout est validé au fur
et à mesure au lieu d'être vérifié à la fin.

| ordre | chantier | geste |
|---|---|---|
| 1 | **12a** | trancher le railgun : implémenter la charge, ou retirer la charge de la fiche |
| 2 | **11** | le fusil de siège et le fusil de précision dans `ARMES` |
| 3 | **11** + **10** | les **20 cartes de famille** — 8 pour les deux armes neuves, 12 pour dispersion, railgun et grenade |

**12a en premier des trois.** La difficulté du railgun (`D = 3,5` ou `D = 1,5`)
dépend de cette décision, et le lot 5 la lit pour fixer sa cible. Trancher après
la campagne de mesure obligerait à la rejouer.

**Critère de sortie.** Dix armes dans la table, dix familles à quatre cartes,
chaque arme donnée par exactement un haut fait, et les trois vérificateurs du
lot 3 redevenus silencieux.

### Lot 5 — équilibrer, une fois

| ordre | chantier | geste |
|---|---|---|
| 1 | **07** | poser les quatre compteurs (`armeTemps`, `armeMuet`, `armeCibles`, `armeDegats`) |
| 2 | **07** | campagne de mesure : une manche complète par arme, difficulté normale |
| 3 | **07** | relever `V` pour les dix armes, comparer à `1,00 + 0,04 × (D − 0,5)` |
| 4 | **07** | corriger **le terme qui déborde**, que la mesure désigne — pas les dégâts par défaut |
| 5 | **07** | rejouer la campagne |

**Pourquoi ici et pas avant.** Équilibrer huit armes puis en ajouter deux revient
à tout refaire. Et la prime de difficulté du modèle se calcule sur des mécaniques
réelles : tant que le railgun n'a pas de charge (12a) et que le tesla vise tout
seul (lot 6), leurs notes `D` décrivent un jeu qui n'existe pas.

**Critère de sortie.** Les dix armes dans la fourchette `0,95 – 1,17`, mesurée et
non déclarée.

### Lot 6 — la refonte du tesla

| ordre | chantier | geste |
|---|---|---|
| 1 | **05** | le trait visé, l'accrochage tolérant, la dispersion à l'impact |
| 2 | **05** | le bot et le simulateur de mesure visent comme pour toute autre arme |
| 3 | **07** *(rappel)* | repasser le tesla à la campagne : c'est l'arme dont `R` change le plus |

**Le seul chantier volontairement placé après l'équilibrage.** Il consomme tout
le reste : les cristaux atteignables (04), les coefficients corrigés (12d), et
les chiffres que seule la campagne du lot 5 peut produire. Le refondre plus tôt
reviendrait à l'équilibrer deux fois.

**Attention.** `_bot()` et le simulateur supposent aujourd'hui que le tesla n'a
pas besoin de viser. Les laisser en l'état ferait mentir la campagne sur la seule
arme qu'on vient de changer.

### Lot 7 — habiller

Purement cosmétique, aucune dépendance, rien ne bloque si on le repousse.

| ordre | chantier | geste |
|---|---|---|
| 1 | **09** | le cadre s'applique à `.teamRow`, la portée `"ligne"` disparaît |
| 2 | **12** *(identité visuelle)* | cinq armes partagent la même capsule — au minimum le railgun s'en détache |

---

## Le chemin critique

Si le temps manque, voici ce qui ne peut pas être coupé :

```
12c-immédiat  ──►  (le joueur cesse de perdre 33 % pour rien)
conversionBoss ─►  12d ──► 08 ──► 12a ──► 11 ──► 07 ──► 05
                                   │
                                   └─►  10 (20 cartes, avec 11)
```

Les lots 1 (hors 12c), 2 et 7 en sont hors : ils améliorent le jeu sans rien
conditionner. Les couper décale du confort, pas de la structure.

---

## Ce qu'il reste à vérifier

Ce plan couvre ce qui a été vu ou trouvé. Deux zones n'ont été ni testées ni
auditées, et 04 comme 10 montrent que ce genre de trou ne se signale pas tout
seul.

1. **Les armes non essayées en jeu** — assaut, dispersion, railgun, et les deux
   qui n'existent pas encore. Le protocole de 04 (« une par une, sur un cristal
   isolé ») s'étend : une par une, sur un boss, sur un mur destructible, sur un
   éclat, à travers un Rempart. **Ce sont autant de chemins de dégât distincts**,
   et 04 a montré que le passage par `bullets` n'est pas garanti.

2. **La rampe de l'assaut sur les onze boss.** Le plan 11 la dit essentielle —
   *« sans elle, esquiver une mécanique de boss coûterait toute la puissance
   accumulée »* — et le commentaire du code relève que le pilote ne la tient que
   39 % du temps. C'est la seule arme dont l'équilibrage dépend d'un
   comportement de joueur, donc la seule que le lot 5 ne peut pas trancher tout
   seul.
