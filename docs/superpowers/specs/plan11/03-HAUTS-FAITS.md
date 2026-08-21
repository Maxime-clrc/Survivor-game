# Survivor LAN — les hauts faits

Conception du système : ce qu'on débloque, avec quoi, et à quel rythme.

---

# 1. Le principe

> **Les hauts faits ouvrent des PORTES. Ils ne donnent pas de puissance.**

Une arme débloquée doit encore être choisie et jouée. Une ligne d'améliorations
coûte toujours des noyaux. Un cadre ne change rien.

La raison est structurelle : **les noyaux sont une courbe, les hauts faits sont
des marches.** Une puissance qui arrive par marches crée des falaises — le joueur
devient brutalement plus fort sans que rien dans sa manche ne l'explique. La
progression de puissance appartient à la monnaie, qui est lisse et pilotable.

---

# 2. Les cinq types de récompense

| type | ce que ça débloque | rôle |
|---|---|---|
| **arme** | 7 des 8 armes du pool de départ | l'axe principal — chaque haut fait enseigne l'arme qu'il donne |
| **carte** | légendaires, conditionnelles | horizontal : plus d'options dans le pool |
| **ligne** | `SECOURS`, tronc commun | ouvre un achat, ne le donne pas |
| **relique** | la moitié du pool (12 sur 24) | fraîcheur à long terme, risque d'équilibrage nul |
| **cadre** | cosmétique équipable | la seule récompense des défis les plus durs |

**Ce qui reste ouvert dès la première manche**, délibérément :

- **les trois difficultés.** Les verrouiller obligerait à doubler les hauts faits
  pour chaque mode ; à la place, **certains hauts faits exigent une difficulté**,
  ce qui répartit les objectifs sans fermer de porte ;
- **les 12 biomes** — un débutant a besoin de variété tout de suite ;
- **les 3 classes** — en coopératif, il faut pouvoir dépanner un rôle dès la
  première soirée ;
- **les 11 boss** — même raison que les biomes.
- **les emplacements de cartes**, qui restent gagnés par niveau et par nombre de
  manches, hors système de hauts faits.

---

# 3. Les cadres

C'est le seul système à créer, et il est petit : **une chaîne sur le profil**.

```js
profile.cadres = ["defaut", "foudroyant", "or"];   // possédés
profile.cadreActif = "foudroyant";                  // équipé
```

**Où il s'affiche :** autour du nom au salon, au tableau de fin de manche, et sur
la plaque au-dessus du personnage en jeu. Trois endroits, tous déjà existants —
c'est un habillage, pas une nouvelle surface.

**L'interface d'équipement :** une grille dans l'écran méta, à côté de l'arbre.

- un cadre par ligne, avec son nom et le haut fait qui le donne ;
- **les cadres non obtenus sont visibles mais grisés**, avec leur condition —
  c'est ce qui les rend désirables ;
- un clic équipe, un seul actif à la fois ;
- aperçu en direct sur ton propre nom.

**Pourquoi c'est le bon lot de récompense pour les défis durs :** un cadre ne
touche à aucun équilibrage, donc on peut le mettre derrière n'importe quelle
exigence, y compris déraisonnable. C'est ce qui permet d'avoir de vrais défis
sans jamais créer d'écart de puissance entre joueurs.

---

# 4. Trois niveaux d'exigence

Il en faut des simples **et** des vraiment durs. Trois niveaux, avec des rôles
distincts :

| niveau | proportion | rôle | récompenses typiques |
|---|---|---|---|
| **Simple** | ~40 % | dire que le système existe, récompenser d'avoir joué | armes, lignes, premières reliques |
| **Intermédiaire** | ~40 % | orienter vers de nouvelles façons de jouer | armes, cartes, reliques |
| **Défi** | ~20 % | donner une raison de revenir après avoir tout vu | cadres, dernières légendaires |

**Les armes vivent en simple et intermédiaire, jamais en défi.** Une arme
verrouillée derrière un exploit signifierait que le choix de départ reste pauvre
pendant des dizaines de manches.

**Les cadres vivent en défi, jamais ailleurs.** C'est ce qui leur donne leur
valeur : un cadre se voit, et tout le monde sait ce qu'il a coûté.

---

# 5. La liste

## 5.1 Simples — les 5 premières manches

| haut fait | objectif | récompense |
|---|---|---|
| **Premier sang** | vaincre un premier boss | cartes conditionnelles |
| **Recrue** | terminer une manche en `calme` | ligne du tronc commun |
| **Sur le terrain** | 90 s cumulées sans se déplacer | **canon d'assaut** |
| **Au contact** | 600 ennemis tués à moins de 120 px | **lame tournoyante** |
| **Curieux** | jouer une manche avec chaque classe | ligne `SECOURS` |
| **Collectionneur** | posséder 20 cartes en une manche | 3 reliques |
| **Prospecteur** | récolter 150 points de récolte (cumulé) | 3 reliques |
| **Marchand** | acheter 30 reliques au total | 3 reliques |
| **Bestiaire I** | vaincre 5 types de boss différents | légendaires, groupe 1 |
| **Débrouillard** | utiliser 150 fois une compétence de classe (cumulé) | légendaires, groupe 2 |

## 5.2 Intermédiaires

| haut fait | objectif | récompense |
|---|---|---|
| **Sans faille** | 2 min consécutives sans subir de dégât, à partir du segment 4 | **canon laser** |
| **Moisson** | 100 ennemis tués en 30 s | **tesla** |
| **Économie de munitions** | 100 ennemis tués avec moins de 200 tirs | **fusil de siège** |
| **Longue portée** | 400 ennemis tués à plus de 700 px | **fusil de précision** |
| **Perce-ligne** | 5 ennemis d'un même tir | **railgun** |
| **Debout** | terminer une manche sans être mis à terre | **dispersion** |
| **Démolisseur** | 1 000 ennemis tués par explosion (cumulé) | **lance-grenades** |
| **Vétéran** | terminer une manche en `normal` | 3 reliques |
| **Chirurgien** | 50 coups critiques en 60 s | légendaires, groupe 3 |
| **Increvable** | 90 s cumulées sous 25 % de vie | légendaires, groupe 4 |
| **Fraternité** | relever 25 alliés | carte de soutien |
| **Phalange** | terminer une manche complète à 4 joueurs | carte de soutien |
| **Bestiaire II** | vaincre les 11 types de boss | 3 reliques |
| **Maître d'armes** | porter une famille d'arme au palier 4 | légendaires, groupe 5 |

## 5.3 Défis — les cadres

Ici, l'exigence peut être déraisonnable : la récompense est cosmétique.

| haut fait | objectif | cadre |
|---|---|---|
| **Puriste** | terminer une manche sans prendre une seule carte épique ni légendaire | *Sobre* |
| **Ascète** | vaincre un boss sans utiliser d'ultime | *Dépouillé* |
| **Intouchable** | vaincre un boss sans subir un seul dégât | *Immaculé* |
| **Foudroyant** | vaincre un boss en moins de 65 s | *Foudroyant* |
| **Armurier** | terminer une manche avec chacune des 8 armes | *Arsenal* |
| **Ermite** | terminer une manche complète en solo | *Ermite* |
| **Nuit blanche** | terminer une manche en `cauchemar` | *Insomniaque* |
| **Sans une égratignure** | terminer un segment en `cauchemar` sans dégât | *Intact* |
| **Bestiaire III** | vaincre les 11 boss en `cauchemar` | *Chasseur* |
| **Perfection** | terminer une manche en `cauchemar` sans mise à terre | **or** |
| **Quatuor** | terminer une manche en `cauchemar` à 4 joueurs | *Phalange* |
| **Légende** | obtenir tous les autres hauts faits | **prismatique** |

## 5.4 La répartition par difficulté

Puisque les difficultés restent ouvertes, ce sont les **exigences** qui les
répartissent :

| difficulté | hauts faits qui l'exigent |
|---|---|
| **calme** | Recrue, Sur le terrain, Au contact — les premières armes |
| **normal** | Vétéran, et la plupart des intermédiaires par leur seul niveau d'exigence |
| **cauchemar** | Nuit blanche, Sans une égratignure, Bestiaire III, Perfection, Quatuor |
| **indifférent** | tout le reste — la majorité |

**Cinq hauts faits exigent cauchemar, et tous donnent un cadre.** Un joueur qui
n'y va jamais ne perd donc **aucune arme, aucune carte, aucune relique** — il
perd uniquement du prestige. C'est ce qui permet de garder le mode ouvert sans
en faire un passage obligé.

---

# 6. Étalonnage des seuils

⚠ **Les nombres de la liste ci-dessus sont provisoires et la plupart étaient
faux dans la première version.** Ils avaient été posés sans mesure.

## Le volume réel

Relevé du script de horde : **31 paliers, débit moyen 2,67 apparitions/s**, soit
**~5 000 apparitions sur une manche complète en solo**. Une manche complète
produit donc de l'ordre de **2 000 à 4 000 kills par joueur** selon la
saturation du plafond.

Un seuil à « 400 ennemis en une manche » est atteint dans le premier tiers du
premier segment. Il ne récompense rien.

## Trois règles d'étalonnage

**① Tous les compteurs sont PERSONNELS.** `p.kills`, jamais `state`. Un compteur
d'équipe serait atteint quatre fois plus vite à quatre joueurs, ce qui rendrait
les hauts faits triviaux en groupe et pénibles en solo.

⚠ **Conséquence à connaître :** la horde suit `joueurs^0,75`, donc à quatre
joueurs chacun tue **~71 %** de ce qu'il tuerait en solo (3 500 contre 5 000).
Les seuils bruts sont donc **~30 % plus durs en groupe**. C'est acceptable, mais
ça plaide pour la règle suivante.

**② Préférer un RATIO ou un RYTHME à un total brut.** Un total dépend de la durée
de la manche, du nombre de joueurs et de la difficulté — trois variables qui le
rendent illisible. Un rythme n'en dépend d'aucune.

| au lieu de | préférer | ce que ça teste |
|---|---|---|
| 400 ennemis en une manche | **100 ennemis en 30 s** | la capacité de nettoyage |
| un segment en moins de 60 tirs | **100 kills avec moins de 200 tirs** | l'efficacité par tir |
| 50 critiques en une manche | **50 critiques en 60 s** | la densité de critique |

Le second exemple est le plus parlant : « moins de 60 tirs dans un segment » est
matériellement impossible (300 s à 0,16 s d'intervalle = 1 875 tirs). Un **ratio
kills/tirs** enseigne réellement le fusil de siège, qui est ce que le haut fait
doit faire.

**③ Un seuil « en une manche » vise le tiers supérieur.** Méthode : dix manches
en `normal` à un compte moyen, prendre la médiane du compteur, poser le seuil à
**1,3× la médiane**. En dessous, c'est une formalité ; au-dessus de 2×, c'est du
grattage.

## Les listes de la section 5 font foi

Les seuils y sont **déjà corrigés** selon les trois règles ci-dessus. Il n'y a
pas de table de correction séparée : une valeur écrite à deux endroits finit
toujours par être implémentée dans sa version périmée.

⚠ **Une interaction à connaître :** *Foudroyant* demande de vaincre un boss en
moins de 65 s. Le verrouillage des phases impose un plancher de
`(barres − 1) × BAR_DWELL` = **40 s** par combat, quel que soit le dégât infligé.
Descendre sous 45 s est donc matériellement impossible ; 65 s laisse 25 s de
marge réelle, ce qui en fait un défi et non une absurdité.

## Ce qui reste à mesurer avant de figer

Trois compteurs dont je n'ai aucune donnée, et dont les seuils sont donc des
paris :

- la part de kills **à moins de 120 px** et **à plus de 700 px** — elle dépend
  entièrement de l'arme portée, donc à mesurer avec le tir standard ;
- le nombre de kills **par explosion** sur une manche sans build de zone ;
- le **ratio kills/tirs** médian, qui décide du seuil du fusil de siège.

---

# 7. Ce qu'il faut prévoir

## Compteurs à ajouter

| compteur | pour quoi | où |
|---|---|---|
| `noDamageStreak` | Sans faille, Intouchable, Sans une égratignure | état de manche, remis à zéro dans `_hurt` |
| `stillTime` | Sur le terrain | état de manche |
| `killsByRange` | Au contact, Longue portée | `_killEnemy` |
| `killsByCause` | Démolisseur | `_killEnemy` |
| `shotsFired` | Économie de munitions | à l'émission |
| `maxPierceKill` | Perce-ligne | au tir |
| `lowHpTime` | Increvable | état de manche |
| `bossKilledByDiff` | Bestiaire I / II / III | profil, `Set` par difficulté |
| `shotsInSegment` | Économie de munitions (ratio) | état de manche |
| `critWindow` | Chirurgien (rythme) | fenêtre glissante de 60 s |
| `killWindow` | Moisson (rythme) | fenêtre glissante de 30 s |
| `revives`, `classRuns`, `weaponRuns`, `relicsBought`, `harvests` | divers | profil, cumulés |

**Tous ces compteurs sont portés par le JOUEUR** (`p.`), jamais par l'état de
manche partagé. C'est la règle n°1 de l'étalonnage.

Sept vivent dans l'état de manche et ne coûtent rien. Le reste va au profil et
déclenche une **migration** — donc une montée de `PROG_CFG.VERSION`.

## La règle de migration

⚠ **On ne retire jamais un déblocage acquis.** Les anciens jalons se
convertissent (`boss_0..4` → `Bestiaire I`, `kills500` → `Moisson`,
`sans_chute` → `Debout`), et tout haut fait sans équivalent est **accordé
d'office** aux comptes existants.

## Le piège technique

⚠ `armes.filter((_, k) => k % 2 === 0)` et `legendairesDuBoss(i)` dépendent de la
**position dans un tableau**. Passer de 3 à 10 armes décale la parité et
**reverrouille des cartes chez tous les comptes existants**.

**Toute récompense devient nommée :**

```js
reward: { type: "arme",    id: "laser" }
reward: { type: "cadre",   id: "foudroyant" }
reward: { type: "relique", ids: ["silex", "crochet", "boussole"] }
```

C'est la raison principale de faire ce lot **avant** d'ajouter les armes.

## La fenêtre de complétion

Bandeau en bas à droite, entrée par glissement, 4 s, sortie en fondu.

- **la récompense est nommée** — « arme débloquée : canon laser ». Un haut fait
  qui ne dit pas ce qu'il donne oblige à aller vérifier ;
- **elle attend la fin du combat en cours**, et **ne s'affiche jamais pendant un
  écran de cartes** : la décision du joueur ne doit pas être recouverte ;
- **une à la fois**, les autres en file ;
- **en coopératif, seuls tes hauts faits produisent un bandeau.** Ceux des alliés
  passent en une ligne dans le fil d'événements.

## L'écran de liste

Un haut fait caché est une loterie, pas un objectif.

- groupés par niveau d'exigence, avec un compteur global ;
- **progression chiffrée** quand elle existe : « 312 / 400 » ;
- **récompense visible** avant l'obtention — y compris les cadres, qui doivent se
  voir pour être désirés ;
- l'exigence de difficulté affichée en clair sur les cinq concernés.

---

# 8. Ce qui fait un bon haut fait

| ✅ | ❌ |
|---|---|
| enseigne une mécanique | demande de la patience |
| récompense un choix délibéré | dépend d'un tirage |
| a une progression visible | se découvre par accident |
| tient en une phrase | demande un tableau |

**Quatre motifs bannis :**

- **le grattage pur** — « tuer 10 000 ennemis » est une taxe de temps, pas un
  objectif ;
- **la chance** — « quatre légendaires en une manche » se subit ;
- **ce qui contredit le bon jeu** — « être mis à terre 50 fois » récompense
  l'échec ;
- **l'imposition d'une composition** — « terminer avec un Rempart, un Soigneur et
  deux Tireurs » force trois amis à jouer ce qu'ils n'ont pas choisi.
