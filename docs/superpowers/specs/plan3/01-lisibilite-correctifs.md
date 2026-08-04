# Lot A — Lisibilité et correctifs

Sept points, tous constatés en jeu. Lot court, aucune refonte.

---

## A1. Lisibilité joueur / ennemi

### Le problème

```js
// shared/palette.js
bullet: "#f4d35e",     // tir des joueurs
shot:   "#ff9d4d",     // projectiles ennemis
```

**Deux ambres voisins.** C'est le pire cas possible : on ne distingue pas ce
qu'on tire de ce qu'on reçoit, et à 220 ennemis l'écran devient une bouillie
orange.

### Trois correctifs, à faire ensemble

**a. Les balles prennent la couleur de leur tireur.** Les quatre couleurs de
joueur existent déjà. Ça résout la lisibilité *et* la question « qui a tiré
ça » en coopératif.

Attention : la quatrième couleur de joueur est `#f0a95a`, un orange. Les
projectiles ennemis doivent donc partir vers le **rouge franc** (`#ff3b5c`) pour
ne pas la croiser.

**b. Une forme différente pour l'hostile.** La couleur se perd dans le chaos,
la forme non. Les projectiles ennemis deviennent des losanges étirés dans leur
axe, les balles joueur restent rondes. C'est la distinction qui survit à la
saturation.

**c. Le liseré permanent sur les joueurs — le correctif le plus rentable.**
Rien ne distingue aujourd'hui un joueur d'un monstre en priorité d'affichage.
Un contour clair de 2 px sur les joueurs, dessinés **systématiquement au-dessus
de toutes les autres entités**, règle à lui seul l'essentiel du problème.

Ordre d'affichage à imposer : sol → zones → bonus → ennemis → projectiles →
**joueurs** → effets.

---

## A2. Le souffle à chaque barre de boss

### Le constat

```js
// _bossBars()
p.x += (dx / d) * CFG.BOSS_BREAK_PUSH;
this._clampToBounds(p, CFG.PLAYER_RADIUS);
this._hurt(p, CFG.BOSS_BREAK_DAMAGE);
```

Identique **cinq fois par combat**, et il inflige des dégâts.

### Deux corrections

**a. Retirer les dégâts.** Casser une barre est une réussite, et le jeu la
punit. Le souffle seul suffit à marquer le changement de phase : il repousse,
il efface les projectiles, il crée une fenêtre de respiration. Ça devient une
récompense au lieu d'une taxe.

**b. Décliner le souffle par boss**, selon son verbe :

| boss | à la rupture de barre |
|---|---|
| Ravageur | souffle qui repousse — l'actuel |
| Matriarche | libère une nuée de rejetons |
| Métronome | inverse le sens des motifs en cours |
| Oracle | pose un cumul de Vulnérabilité à toute l'équipe |
| Jumeaux | les deux échangent leurs positions |

Chaque variante doit s'annoncer par le canal d'alerte existant, sinon elle
surprend au lieu d'informer.

---

## A3. Le rempart doit suivre le tank

### Le constat

`bulwarks` est une entité à `x`, `y` figés. La justification d'origine — « ça
récompense l'immobilité dans un jeu qui la punit, donc c'est une tension
intéressante » — ne tient pas à l'usage. Ce n'est pas une tension, c'est
inutilisable.

### Le correctif

**Le rempart suit le tank**, avec un rayon réduit de 170 à 130 px pour
compenser le gain d'utilité.

Mais le faire suivre sans rien d'autre en fait une aura permanente, et le tank
perd sa seule décision de placement. On garde donc les deux versions :

- **Compétence de base** : suit le tank, rayon 130.
- **Carte `ancrage`** (rare, classe Rempart) : le rempart redevient posé au sol,
  rayon 220, durée 12 s, régénération de bouclier +50 %.

La compétence devient utilisable, et le choix de build existe pour qui veut
l'ancrage.

---

## A4. L'invulnérabilité de provocation reste à 1,2 s

**Décision explicite, à ne pas rouvrir sans mesure.**

Les annonces de boss durent 1,4 à 2 s. Une invulnérabilité qui couvre une
annonce entière ferait traverser les mécaniques sans les lire, et l'écart entre
un joueur qui lit et un joueur qui ignore — la métrique de référence du dépôt —
s'effondrerait.

Le renforcement passe donc par les cartes et par l'arbre de progression du
Rempart (lots C et D), pas par la valeur de base.

---

## A5. Le libellé de fin de partie

`roundNumber` s'incrémente correctement : ce n'est pas un bug de compteur. C'est
un **problème de vocabulaire**. L'unité de jeu est devenue la vague ; après en
avoir enchaîné douze, lire « Manche 1 terminée » donne l'impression d'un
compteur cassé.

```js
// avant
bilanTitle.textContent = `Manche ${res.round} terminée`;
// apres
bilanTitle.textContent = `Partie terminée — vague ${res.wave} atteinte`;
```

Le numéro de manche descend en sous-titre, avec le reste du bilan. Le serveur
doit ajouter `wave` au message `roundEnd`, qui ne le transmet pas aujourd'hui.

---

## A6. Le type des cartes, et leur poids dans la build

### Ce qui manque

Une carte affiche son nom, sa rareté et son effet. Rien ne dit **à quelle
catégorie elle appartient** ni **ce qu'on a déjà pris dans cette catégorie**.

### Ce qu'il faut afficher

```
DÉFLAGRATION                              rare
zone · 3ᵉ carte de zone
+20 % de rayon sur tous tes effets
possédée 0 / 2  ·  rayon +8 % → +28 %
```

- **La catégorie** — offensif, défensif, soutien, zone, utilitaire — en couleur,
  reprise de la grammaire fonctionnelle.
- **Le rang dans la build** : « 3ᵉ carte de zone ». C'est ce qui rend un choix
  décidable en une seconde, et ça évite d'empiler sans s'en rendre compte.

Le champ `family` existe déjà sur une partie du catalogue. Le généraliser aux
77 cartes fait partie du lot.

---

## A7. La provenance des dégâts

Quand on perd 40 PV, rien n'indique si c'est un contact, un projectile, une
zone ou une mécanique de boss. C'est la principale raison pour laquelle on ne
comprend pas ses morts.

### Le correctif

`_hurt()` reçoit déjà tous les appels — il suffit de lui passer une **source** :

```js
_hurt(p, amount, { ignoreCooldown = false, src = SRC_CONTACT } = {})
```

Sources : contact, projectile, zone, mécanique, brûlure, souffle.

Le client affiche l'icône correspondante à côté du nombre rouge, et le bilan de
fin de partie récapitule la répartition — c'est aussi un excellent outil
d'équilibrage.

**Registre partagé** à déclarer dans `CLAUDE.md`, index circulant dans le
snapshot.

---

## A8. Mesures et critères

| mesure | attendu |
|---|---|
| lisibilité à 220 ennemis | le joueur reste identifiable sans hésitation |
| dégâts subis | 100 % accompagnés d'une icône de provenance |
| rempart | utilisable en mouvement sans perdre sa zone |
| souffle de barre | ne fait plus de dégâts, s'annonce |

Critères d'acceptation :

- Aucun projectile ennemi n'est de la même famille de teinte qu'une couleur de
  joueur.
- Les joueurs sont toujours dessinés au-dessus des ennemis.
- Le bilan ne mentionne plus « Manche N » comme titre principal.
- Chaque carte affiche sa catégorie et son rang dans la build.
- La variante de souffle est cohérente avec le boss et annoncée.
