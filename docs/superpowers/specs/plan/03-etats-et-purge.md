# Lot 3 — États et purge

## Objectif

Un système d'états générique, volontairement réduit à quatre entrées, qui sert
aux boss, aux élites, au soigneur et aux cartes d'un seul coup.

Dépend du lot 2 : la purge est une fonction du soigneur.

## 1. Quatre états, pas plus

| id | nom | effet | cumuls | expire seul | purgeable |
|---|---|---|---|---|---|
| 0 | **Vulnérabilité** | +25 % de dégâts subis par cumul | 3 | 20 s | oui, un cumul à la fois |
| 1 | **Brûlure** | 6 dégâts par seconde | 1 | 5 s | oui |
| 2 | **Entrave** | vitesse −40 % | 1 | 6 s | oui |
| 3 | **Sentence** | mort à échéance sauf si soigné à plein | 1 | 8 s, **létal** | oui |

### Ce qui a été écarté, et pourquoi

C'est aussi important que ce qui reste — ne pas les réintroduire sans relire
ceci :

- **Immobilité / Fuite** (le couple bien connu de FFXIV : rester immobile ou
  rester en mouvement à la fin d'un décompte). Excellent en MMO, injuste ici :
  rester immobile deux secondes au milieu de 200 ennemis est une condamnation,
  pas une consigne.
- **Sceau** (blocage des compétences) : invisible, frustre sans rien apprendre.
- **Contagion** (propagation aux alliés proches) : suppose un système de
  dispersion qui n'existe pas encore.
- **Aveuglement** (portée réduite) : trop discret pour être lu en pleine action.

Les quatre retenus tiennent sur les seuls verbes du jeu : encaisser, bouger,
tirer.

### Vulnérabilité, la pièce maîtresse

Elle transforme toute mécanique « quelqu'un doit encaisser » en décision
d'équipe : celui qui encaisse deux fois de suite ne peut pas encaisser une
troisième, donc quelqu'un d'autre doit prendre le relais. C'est le seul état
qui crée de la rotation, et c'est pour ça qu'il n'expire pas vite.

## 2. Structure

```js
// p.statuses : Map(stateId -> { stacks, until })
```

Les états vivent **à côté** de `p.mods`, comme les minuteurs (`p.timers`) : un
recalcul de mods ne doit jamais les réinitialiser.

Deux points d'entrée uniques, sur le modèle de `_hurt()` / `_damage()` :

```js
_applyStatus(p, id, stacks = 1, duration = null)   // pose ou rafraichit
_purgeStatus(p)                                     // retire selon la priorite
```

L'effet de Vulnérabilité s'applique **dans `_hurt()` et nulle part ailleurs**,
comme le multiplicateur de difficulté. Une nouvelle source de dégâts est ainsi
couverte sans qu'on y pense.

L'Entrave s'applique dans `_players()` sur le déplacement, la Brûlure dans une
passe dédiée qui appelle `_hurt()` avec `ignoreCooldown`.

## 3. La purge, à deux niveaux

### Par insistance — le faisceau de soin

**Deux impacts de soin sur le même allié en moins de 3 s retirent un état.**

```
STATUS_PURGE_HITS: 2
STATUS_PURGE_WINDOW: 3
```

C'est ce qui rend le mode soin plus intéressant qu'un robinet de PV : il faut
choisir une cible et rester dessus, alors que le jeu pousse à arroser. Et c'est
cohérent avec la contrainte du projectile qui s'arrête sur les ennemis — purger
quelqu'un derrière la horde devient un problème de position.

Compteur par couple (soigneur, cible), remis à zéro à l'expiration de la
fenêtre.

### En urgence — la vague de soin

Retire un état à **tous les alliés touchés**. C'est sa seule utilité
supplémentaire, et elle a 16 s de recharge : c'est le bouton pour rattraper une
phase ratée.

### Règle d'ordre

**Un seul état par purge, jamais tout d'un coup**, avec une priorité fixe :

```
Sentence > Brulure > Entrave > un cumul de Vulnerabilite
```

Sans cette règle, les cumuls ne veulent plus rien dire et le soigneur annule
mécaniquement tout le travail du boss.

### Purges de secours

Pour les équipes sans soigneur, deux sources supplémentaires :

- **Bonus au sol « Purification »** — nouvelle entrée dans `POWERUP_TYPES`
  (**à ajouter en fin de tableau**, l'index circule sur le réseau). Retire tous
  les états du ramasseur. Poids de tirage relevé quand l'équipe n'a pas de
  soigneur.
- **Rempart du tank** — retire un état à l'entrée dans la zone, une fois par
  joueur et par pose. Donne une raison de plus de s'y regrouper.

## 4. Sans soigneur

Le principe qui évite l'écueil : **tous les états expirent seuls, le soigneur
ne fait qu'accélérer massivement.** La mécanique existe pour tout le monde, il
en est un multiplicateur et non une condition d'accès. Une équipe sans soigneur
joue le même combat, en subissant plus longtemps.

**Sauf Sentence**, qui ne peut pas expirer sans devenir décorative. Elle
**n'apparaît que si l'équipe compte un soigneur** ; sinon le boss la remplace
par un gros coup encaissable sur la même cible. Un simple drapeau
`needsHealer: true` par mécanique, lu au moment de la sélection — plus honnête
que d'affaiblir arbitrairement une menace.

## 5. Sources d'états

### Élites

Application au contact, ce qui donne enfin une raison de les traiter en
priorité plutôt que de les ignorer :

| élite | état appliqué |
|---|---|
| runner | Entrave |
| tank | Vulnérabilité (1 cumul) |
| shooter | Brûlure |
| grunt / brood | aucun |

Recharge par élite pour éviter l'application en boucle : `ELITE_STATUS_CD: 4`.

### Boss

Détaillé au lot 4. Deux usages généraux :

- **Échec de mécanique** → Vulnérabilité. C'est la sanction standard : ne tue
  pas, mais rend la suite plus dangereuse.
- **Usure imposée** → un cumul de Vulnérabilité à toute l'équipe toutes les
  25 s (`BOSS_MIASMA_EVERY`), sur les boss qui l'utilisent. C'est un chronomètre
  déguisé : le combat devient injouable si on traîne.

Le Miasme ne vaut **que** parce qu'il existe un moyen de le gérer. Pris seul, il
punit tout le monde également sans creuser l'écart entre un joueur qui lit les
annonces et un joueur qui les ignore — la métrique de référence du dépôt. Ne
jamais l'ajouter à un boss qui n'offre aucune fenêtre de purge.

### Cartes

- `detonateur` (DPS, lot 2) : la bombe applique Vulnérabilité.
- Nouvelle carte rare `antidote` : les états durent 40 % moins longtemps sur
  soi. Max 2.
- Nouvelle carte épique `catalyseur` : +15 % de dégâts contre les ennemis
  affectés par un état. Max 2. *(Nécessite que les états existent aussi sur les
  ennemis — voir la réserve ci-dessous.)*

**Réserve** : les états sur les ennemis n'existent pas dans ce lot. `catalyseur`
n'a de sens que si la Brûlure des cartes existantes (`munitions_incendiaires`)
est reversée dans le même système. À faire dans ce lot ou à repousser, mais pas
à moitié.

## 6. Sérialisation et affichage

### Snapshot

Trois nombres ajoutés **en fin** de tableau joueur :

| champ | contenu |
|---|---|
| `stMask` | masque de bits des états actifs |
| `vuln` | cumuls de Vulnérabilité, 0 à 3 |
| `doom` | secondes restantes de Sentence, au dixième, 0 si absente |

On ne transmet pas les durées des autres états : l'icône suffit, et trois
nombres par joueur restent négligeables. Sentence fait exception parce que le
décompte **est** l'information.

### Affichage — prérequis, pas finition

Sans lecture instantanée de l'état des alliés, la classe de soigneur est
injouable. Ce lot doit livrer :

- **Une barre de vie au-dessus de chaque joueur**, 40 px, couleur du joueur,
  virant à l'ambre sous 50 % et au rouge sous 25 %, avec le bouclier en segment
  cyan **superposé** et non à côté.
- **Un cadre d'équipe** en coin d'écran : une ligne par joueur, nom, barre,
  icônes d'états. Quand l'arène contient 200 ennemis, chercher visuellement qui
  est bas est impossible.
- **Les icônes d'états sous la barre**, plus un halo coloré sur le personnage —
  une icône seule ne se voit pas en pleine action.
- **Sentence en compte à rebours chiffré**, gros, sur le joueur concerné et dans
  le cadre d'équipe. C'est l'urgence absolue du jeu.

Codes couleur, cohérents avec la grammaire du lot 6 : Vulnérabilité ambre,
Brûlure orange, Entrave bleu-gris, Sentence rouge clignotant.

## 7. Modifications par fichier

### `shared/statuses.js` (nouveau)

Module pur : identifiants, table des effets, priorité de purge, libellés.
Ne dépend de rien.

### `shared/game_state.js`

- `_applyStatus()`, `_purgeStatus()`, passe `_statuses(dt)` pour l'expiration
  et la Brûlure.
- `_hurt()` : appliquer le multiplicateur de Vulnérabilité.
- `_players()` : appliquer l'Entrave au déplacement.
- Sentence : vérifier à l'échéance si `hp >= maxHp`, sinon mettre à terre —
  **pas tuer sèchement**, voir le lot 4 sur la sanction d'échec.
- Collisions élites : appliquer l'état avec recharge.
- Mode soin : compteur d'impacts par couple, purge au seuil.

### `public/client.js` + `index.html`

- Barres de vie joueurs, cadre d'équipe, icônes, halos.
- `POWERUP_ICON` et `POWERUP_STYLE` : entrée « Purification ».

### `CLAUDE.md`

Nouveau registre partagé « états » dans le tableau, et mention de la règle de
priorité de purge dans les invariants.

## 8. Mesures à relever

| mesure | attendu |
|---|---|
| survie d'une équipe avec / sans soigneur face à un boss appliquant le Miasme | écart inférieur à 25 % |
| nombre moyen d'états simultanés sur un joueur en fin de manche | inférieur à 2 |
| taux de purge du soigneur | plus de 60 % des états posés sur l'équipe |
| Sentence : taux de survie avec soigneur | supérieur à 80 % |

Si les états s'empilent au-delà de 2 en moyenne, c'est que les sources sont
trop généreuses : réduire `ELITE_STATUS_CD` ou la fréquence du Miasme, pas la
durée des états.

## 9. Critères d'acceptation

- Un recalcul de mods (prise de carte) ne réinitialise aucun état ni recharge.
- La purge ne retire jamais deux états d'un coup.
- Sentence n'apparaît jamais dans une équipe sans soigneur.
- Tous les états finissent par expirer, y compris si le soigneur se déconnecte
  en cours de manche.
- Un joueur qui subit Sentence à l'échéance est **mis à terre**, jamais tué sec.
