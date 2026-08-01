# Système de cartes d'amélioration — spécification

Document de référence à donner à Claude Code. Il décrit la structure du système,
la liste complète des cartes avec leurs valeurs, et les pièges d'implémentation.

Les valeurs sont calées sur les constantes actuelles de `shared/game_state.js` :
`BULLET_DAMAGE 12`, `FIRE_INTERVAL 0.26` (plancher `0.09`), `PLAYER_MAX_HP 100`,
`PLAYER_SPEED 260`, `BULLET_SPEED 640`, `BULLET_LIFE 1.5`, `REVIVE_TIME 1.5`,
`REVIVE_RADIUS 88`, `SHIELD_POOL 80`.

---

## 1. Structure du système

### Déclenchement

À la mort de chaque boss, la manche se met en pause côté serveur (`phase =
PHASE_CARDS`). Chaque joueur reçoit **3 cartes tirées indépendamment** et en
choisit une. La manche reprend quand tous ont choisi, ou après un délai de
30 s (choix automatique de la première carte pour les absents).

Les joueurs à terre choisissent aussi : sinon un joueur malchanceux décroche
définitivement.

### Raretés

| rareté | poids de base | couleur suggérée |
|---|---|---|
| commune | 60 | `#8a90a2` |
| rare | 28 | `#5ab6f0` |
| épique | 10 | `#d98cf0` |
| légendaire | 2 | `#f4d35e` |

Le poids évolue avec le numéro du boss, sinon les légendaires ne sortent
jamais : à chaque boss, `poids_épique × 1.35` et `poids_légendaire × 1.8`,
`poids_commune × 0.85`. Au quatrième boss, une légendaire sort environ une fois
sur sept tirages.

**Garantie anti-frustration** : si un joueur n'a eu que des communes sur deux
boss consécutifs, forcer au moins une rare dans son tirage suivant.

### Règles de tirage

- Les 3 cartes d'un même tirage sont **distinctes**.
- Une carte non cumulable déjà possédée est retirée du tirage.
- Les cartes cumulables peuvent ressortir (voir `max` dans les tables).
- Les cartes qui **remplacent l'arme** (légendaires) s'excluent mutuellement.

### Cumul

Deux conventions à choisir explicitement, et à ne pas mélanger :

- **Additif sur un multiplicateur** : `dégâts = base × (1 + Σ bonus)`.
  Trois cartes à +15 % donnent +45 %. Prévisible, ne s'emballe pas.
- **Multiplicatif** : `1.15³ = +52 %`. S'emballe vite.

**Recommandation : additif pour tout**, sauf mention contraire. C'est le seul
moyen de garder le boss équilibrable.

Les réductions (intervalle de tir, dégâts subis) doivent être **multiplicatives
et plafonnées**, sinon quatre cartes à -25 % donnent 0.

---

## 2. Cartes communes

Petits gains, toujours utiles, jamais décisifs. Ce sont elles qui remplissent
les tirages.

| carte | effet | max | coût |
|---|---|---|---|
| **Calibre supérieur** | +15 % de dégâts | 5 | ● |
| **Ressort de détente** | −8 % d'intervalle de tir | 5 | ● |
| **Plaque de blindage** | +20 PV max, soigne d'autant | 5 | ● |
| **Semelles légères** | +8 % de vitesse de déplacement | 4 | ● |
| **Poudre dense** | +12 % de vitesse des balles | 3 | ● |
| **Canon long** | +25 % de portée (`BULLET_LIFE`) | 3 | ● |
| **Trousse de secours** | réanimation 25 % plus rapide | 3 | ● |
| **Cuir épais** | −10 % de dégâts subis (multiplicatif, plancher 40 %) | 4 | ● |
| **Convalescence** | +8 PV rendus à chaque boss tué | 3 | ● |
| **Poches larges** | ramasse les bonus au sol à 120 px | 1 | ●● |
| **Bourse** | +20 % de score gagné | 3 | ● |

`●` = simple multiplicateur sur une valeur existante.

---

## 3. Cartes rares

Elles modifient une mécanique plutôt qu'un nombre.

| carte | effet | max | coût |
|---|---|---|---|
| **Perforation** | les balles traversent 1 ennemi (cumule avec le bonus au sol) | 2 | ● |
| **Second canon** | +1 balle en éventail (écart 0,13 rad), −18 % de dégâts par balle | 2 | ●● |
| **Bouclier régénérant** | 30 points de bouclier, se recharge après 6 s sans dégât subi | 3 | ●● |
| **Vampirisme** | 2 % des dégâts infligés rendus en PV, plafond 3 PV/s | 3 | ●● |
| **Munitions incendiaires** | brûlure : 8 dégâts sur 3 s, ne se cumule pas sur la même cible | 2 | ●●● |
| **Ricochet** | à la mort d'un ennemi, la balle rebondit une fois à 50 % de dégâts (250 px) | 2 | ●●● |
| **Second souffle** | la première mise à terre de la manche se relève seule à 30 PV | 1 | ●● |
| **Réanimateur** | rayon de réanimation ×1,6 et relève à 70 PV | 1 | ● |
| **Contre-attaque** | encaisser déclenche une nova de 60 dégâts sur 120 px (recharge 3 s) | 2 | ●● |
| **Cadence accélérée** | −18 % d'intervalle de tir | 3 | ● |
| **Balles lourdes** | +35 % de dégâts, −20 % de cadence | 2 | ● |
| **Talon de fer** | immunité aux zones du boss pendant 1,5 s après en avoir subi une | 1 | ●● |
| **Tourelle d'appui** | pose une tourelle automatique toutes les 45 s (20 s de vie, 350 px, 0,35 s) | 2 | ●●● |

---

## 4. Cartes épiques

Elles définissent une orientation de build.

| carte | effet | max | coût |
|---|---|---|---|
| **Orbiteurs** | 2 lames tournant autour du joueur, 25 dégâts au contact, recharge 0,5 s par cible | 3 (+2 lames) | ●●● |
| **Salve arrière** | chaque tir envoie aussi une balle à 180°, dégâts à 70 % | 1 | ●● |
| **Chaîne de foudre** | 15 % de chance qu'un impact arce sur 3 ennemis à 40 % de dégâts | 2 | ●●● |
| **Pulsar** | toutes les 12 s, onde automatique de 90 dégâts sur 250 px | 2 | ●● |
| **Drone de soutien** | un drone suit le joueur et tire seul à 60 % de ses dégâts | 2 | ●●● |
| **Peau de titane** | +40 PV max, −6 % de vitesse | 2 | ● |
| **Frénésie** | chaque kill donne +2 % de cadence, cumulable jusqu'à +60 %, retombe après 3 s sans kill | 1 | ●● |
| **Champ de givre** | aura permanente de 160 px, ennemis à 65 % de vitesse | 2 | ●● |
| **Récolte** | les ennemis tués laissent 8 % du temps un fragment qui rend 5 PV | 2 | ●●● |
| **Onde de mort** | tuer un ennemi déclenche 25 dégâts sur 80 px | 2 | ●● |

---

## 5. Cartes légendaires

Rares, spectaculaires, structurantes. **Les trois premières remplacent l'arme et
s'excluent entre elles.**

| carte | effet | coût |
|---|---|---|
| **Fusil à dispersion** | remplace le tir : 5 balles en cône de 0,45 rad, 55 % de dégâts chacune, cadence −40 % | ●●● |
| **Railgun** | remplace le tir : traverse tous les ennemis, ×3 dégâts, cadence divisée par 2,5, balles 2× plus rapides | ●●● |
| **Lance-grenades** | remplace le tir : projectile lent qui explose (110 dégâts sur 130 px), cadence −55 % | ●●● |
| **Écho** | 20 % de chance que chaque balle soit tirée en double | ●● |
| **Ange gardien** | un allié qui tombe à moins de 200 px est relevé instantanément (recharge 60 s) | ●● |
| **Instinct de survie** | sous 20 PV, ralentit tous les ennemis à 40 % pendant 4 s (recharge 45 s) | ●● |
| **Contrat de sang** | +80 % de dégâts, mais PV max plafonnés à 60 | ● |
| **Essaim** | 4 mini-drones orbitant, 12 dégâts chacun, réapparaissent 8 s après destruction | ●●● |

---

## 6. Notes d'implémentation

### Où stocker les effets

Ne pas éparpiller les modificateurs dans le code. Un objet `p.mods` calculé une
fois à chaque prise de carte :

```
p.mods = {
  damageMul, fireIntervalMul, maxHpBonus, speedMul, bulletSpeedMul,
  bulletLifeMul, reviveSpeedMul, damageTakenMul, pickupRadius,
  pierce, extraBarrels, ...
}
```

Les systèmes lisent `p.mods`, jamais la liste de cartes. Ça évite de recalculer
une somme à chaque tir et rend le débogage possible.

### Ce qui doit rester serveur

Le choix de carte transite par le réseau (`{t:"pickCard", id}`), mais **le
serveur valide** que la carte fait bien partie des trois proposées à ce joueur,
pour ce boss. Sinon n'importe quel client s'octroie une légendaire.

Conserver côté serveur la liste des cartes proposées par joueur et par boss.

### Ce que le client doit afficher

- L'écran de choix, avec la couleur de rareté et l'effet en clair.
- Un bandeau « en attente de X, Y » pendant que les autres choisissent.
- **La liste des cartes possédées**, consultable pendant la partie (touche Tab).
  Sans ça, personne ne sait ce qu'il a pris au bout de trois boss.
- Sur le tableau des scores de fin, les cartes de chacun.

### Sérialisation

Ne pas envoyer les effets, seulement les identifiants de cartes possédées, une
fois par changement — pas dans le snapshot à 20 Hz.

---

## 7. Pièges à surveiller

**L'équilibrage du boss vole en éclats.** C'est le point le plus important. Au
troisième boss, des joueurs ayant pris six cartes offensives feront peut-être
trois fois les dégâts du premier combat. Le facteur actuel `×1,45` par boss ne
suffira pas. Deux approches :

- indexer les PV du boss sur les dégâts réellement infligés à la manche
  précédente, ce qui s'auto-régule ;
- ou compter les cartes offensives prises par l'équipe et gonfler les PV en
  conséquence.

La première est plus robuste et demande peu de code : mémoriser les dégâts
totaux infligés au boss précédent et viser une durée cible.

**Les cartes défensives ne se comparent pas aux offensives.** Un joueur qui
prend +20 PV pendant que les autres prennent +15 % de dégâts a l'impression
d'avoir perdu son tour. Deux correctifs : rendre les cartes défensives
légèrement surdimensionnées, et afficher les dégâts totaux dans le tableau de
fin de manche pour que la contribution défensive apparaisse autrement.

**Les cartes coopératives sont sous-choisies.** Personne ne prend « Réanimateur »
au premier boss quand tout va bien. Solution simple : y adjoindre un petit
bonus personnel, par exemple +10 PV max, pour qu'elles ne soient jamais un choix
purement altruiste.

**Le plancher de cadence.** `FIRE_INTERVAL_MIN 0.09` existe déjà, mais la
progression naturelle atteint déjà ce plancher vers 180 s. Toutes les cartes de
cadence deviennent alors mortes. Il faut soit baisser le plancher à 0,05, soit
convertir l'excédent de cadence en dégâts.

**Les armes de remplacement cassent les autres cartes.** Le Railgun perfore déjà
tout : « Perforation » devient inutile pour lui. Prévoir un champ
`incompatible: []` dans la table des cartes et filtrer au tirage.

**Le temps mort.** Trois minutes de jeu puis un écran de choix : si un joueur
part chercher un café, les autres attendent. Le délai de 30 s avec choix
automatique n'est pas optionnel.

**Les nombres au-dessus de tout.** Avec vampirisme, brûlure, ricochet et chaîne
de foudre actifs, la boucle de collision devient nettement plus lourde. Le
plafond de 220 ennemis a été calé sans ces effets — à revérifier après
implémentation, en mesurant le temps CPU par tick.
