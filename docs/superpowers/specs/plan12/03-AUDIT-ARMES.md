# Survivor LAN — l'audit des huit armes

Le porteur n'avait testé que le tesla et le lance-grenades. Ce document est le
relevé des six autres, passées au banc : tir, identité visuelle, son, cartes
mortes, écart entre la fiche et le code.

**Cinq constats, référencés `12a` à `12e` dans l'ordre d'exécution.** Le premier
à traiter n'est pas le premier écrit : `12c` retire activement de la puissance
au joueur en ce moment même.

---

## 12 — Passe globale sur les huit armes

Tu n'as testé que le tesla et le lance-grenades. J'ai passé les six autres au
banc — tir, identité visuelle, son, cartes mortes, écart entre la fiche et le
code. **Trois défauts touchent des armes que tu n'as pas ouvertes, et l'un des
trois est le pire du dépôt.**

### L'état des huit

| arme | tir | identité visuelle | son de tir | fiche vs code |
|---|---|---|---|---|
| standard | balle | capsule générique | `tir` | conforme |
| assaut | balle + rampe | capsule + **anneau de rampe** | `tir` | conforme |
| laser | faisceau | **nappe deux couches, teinte à la chaleur** | **aucun** | conforme |
| tesla | arc | **arcs, effet `kind 3`** | `foudre` | auto-visée (05) |
| lame | balayage | **arc au sol, effet `kind 17`** | **aucun** | conforme |
| dispersion | 6 plombs | capsule générique ×6 | `tir` | conforme |
| railgun | balle perforante | **capsule générique** | `tir` | **charge absente** |
| grenade | projectile + souffle | capsule + explosion | `tir` + explosion | portée fixe (06) |

Le laser, le tesla et la lame ont chacun un rendu propre, écrit avec soin — la
note du code sur le faisceau (*« une nappe, pas un tir : c'est ce doublage qui
sépare une ligne bleue d'un rayon »*) montre que le travail a été fait. Les cinq
autres partagent la même capsule.

---

### a) Le railgun n'a pas de charge

Sa fiche annonce *« une charge avant chaque tir »*, son axe déclaré est
**ressource**, et le plan 11 en fait l'arme qui *« ne se joue pas contre la horde
qui arrive, mais contre celle qui va arriver »*.

Dans le code : `interval: 0.70, degats: 60, perforeTout: true`. **Aucun flag de
charge, aucune branche dans `_shoot`, aucune ressource.** C'est un fusil lent
qui perfore. `armeRes` — le champ qui porte la rampe de l'assaut et la chaleur du
laser — n'est jamais alimenté pour lui.

Trois conséquences en cascade :

- **son axe est vide.** `verifierArmes()` exige un axe et vérifie que les quatre
  sont couverts ; il ne vérifie pas que l'axe déclaré correspond à une mécanique.
  Le railgun et le laser occupent tous deux « ressource », et un seul en a une ;
- **sa difficulté est fausse.** Le chantier 07 lui donne D = 3,5, dont 1 point
  d'anticipation et 1 de vulnérabilité qui viennent de la charge. Sans elle,
  D = 1,5 — et à 114 % de la référence pour une cible de 1,04, **il est
  surpayé** ;
- **il ressemble au tir standard.** Même capsule, même rayon, même couleur, pour
  60 dégâts contre 12.

Deux issues, à trancher : implémenter la charge (`armeRes` monte pendant le
maintien, le tir part au relâchement ou à saturation — le mécanisme existe déjà
deux fois), ou **retirer la charge de la fiche** et rebaser le railgun sur l'axe
distance avec sa vraie difficulté. La première est fidèle au plan, la seconde est
honnête. Ce qui n'est pas tenable, c'est l'état actuel : une contrainte annoncée
au joueur qu'il ne subit jamais.

---

### b) Deux armes sont muettes

`EFFECT_SOUND` (`fx.js:62`) associe un son à chaque effet. L'arc du tesla y est
(`3: foudre`), **le balayage de la lame n'y est pas** — `kind 17` est absent de
la table.

Et le son de tir général n'est pas déclenché par un tir : il est déduit de
l'apparition d'une balle dans le diff de snapshot (`events.js:32`, *« une balle
disparue près du point d'impact le dit aussi bien »*). L'astuce est bonne et ne
coûte rien au réseau — mais **les armes qui ne créent pas de balle n'émettent
aucun son.** Le laser tire un faisceau, la lame balaie : ni l'un ni l'autre ne
pousse dans `bullets`.

Résultat : **le laser et la lame sont silencieux quand ils tirent.** Ce sont
précisément les deux armes les plus physiques du jeu, l'une continue et l'autre
au contact — celles pour qui le retour sonore compte le plus.

Le correctif suit la logique existante plutôt que de la contourner :

- `17: { son: "balayage", force: 0.8, shake: 2 }` dans `EFFECT_SOUND`. Le son
  `balayage` existe déjà (`audio.js:393`) et sert au boss ; il est fait pour ça ;
- pour le laser, une boucle plutôt qu'un déclenchement — un faisceau continu ne
  se découpe pas en tirs. Un bourdonnement dont la hauteur monte avec `armeRes`,
  coupé net à la saturation. **La chaleur devient audible avant d'être fatale**,
  ce qui est exactement ce qu'une ressource pilotable doit offrir.

---

### c) « Second canon » est une carte piège

C'est le pire défaut trouvé, et il est invisible à la lecture.

```js
apply(m, n) { m.extraBarrels += n; m.barrelDamageMul *= Math.pow(0.82, n); }
```

`barrelDamageMul` est appliqué **en haut de `_volley`**, avant l'aiguillage :
`const dmg = base * p.mods.barrelDamageMul`. Toutes les armes le paient.

`extraBarrels` n'est lu que dans la branche `default` de l'aiguillage. Les
branches `arc`, `arc_sol`, `grenade` et le chemin `plombs` **ne le lisent
jamais**.

| arme | pénalité | bénéfice | résultat |
|---|---|---|---|
| standard, assaut, railgun | −18 % | +1 balle | conforme |
| **dispersion, grenade, tesla, lame** | **−18 %** | **rien** | **−18 % sec** |
| laser | non appliquée | rien | inerte |

Quatre armes sur huit : la carte est un **malus pur**, cumulable deux fois, soit
**−33 % de dégâts en échange de rien**. Elle est de rareté 1, donc elle tombe
souvent, et son texte promet un gain.

Ce n'est pas une carte morte comme celles du chantier 08 — une carte morte ne
fait rien. Celle-ci **retire de la puissance**, et le joueur ne peut pas le
savoir : rien à l'écran ne distingue une arme qui lit `extraBarrels` d'une arme
qui l'ignore.

**Le correctif immédiat** est de la retirer du pool pour les cinq armes
concernées. Le filtre du chantier 08 ne suffit pas : il raisonne sur les six axes
du tableau, et `extraBarrels` n'en fait pas partie (voir (e)).

**Le correctif juste** est que la pénalité vive au même endroit que le bénéfice.
Si `barrelDamageMul` descend dans la branche `default`, l'incohérence devient
structurellement impossible au lieu d'être rattrapée par une liste.

---

### d) Le tableau de coefficients est décoratif là où il promet le plus

`perforation` vaut **2,0 pour le railgun** et **1,5 pour le laser** — les deux
plus fortes valeurs de toute la table.

Les deux armes portent `perforeTout: true`. Pour le railgun, `_fire` écrit
`pierce = pierceAll ? Infinity : …` — le mod calculé est écrasé avant d'être lu.
Le laser ne passe même pas par `_fire` : `_segmentHits` touche tout ce qui est
sur le segment, sans compteur.

**Les deux coefficients les plus élevés du tableau s'appliquent aux deux armes
pour lesquelles la statistique est déjà infinie.** Le plan 11 disait des trois
zéros qu'ils *« rendent le tableau réel plutôt que décoratif »* ; ces deux
valeurs-là font exactement l'inverse.

À corriger dans le sens qui décrit la réalité : `perforation: 0` pour le laser et
le railgun, avec la même justification que le tesla et la lame — l'axe ne
s'applique pas. Et les cartes de perforation quittent leur pool par le filtre du
chantier 08, au lieu d'y rester sans effet.

Attention : `Ricochet` agit sur `chain`, pas sur `pierce`. Le rebond entre cibles
reste utile sur une arme perforante, et ne doit pas partir avec.

---

### e) Le tableau ne couvre que 28 cartes sur 158

Mesuré en instrumentant chaque `apply()` :

```
cartes touchant au moins un des six axes :  28
cartes n'en touchant aucun               : 129
```

Les 129 autres agissent sur des leviers absents du tableau — `skill3` (9 cartes),
`maxHpBonus` (5), `speedMul` (5), `execThreshold` (4), `skillCdMul` (4),
`shieldPool` (4), `burnDmg` (4)…

Ces cartes ne sont **ni mises à l'échelle par l'arme, ni filtrables par elle**.
C'est acceptable pour la plupart — une carte de vitesse ou de bouclier n'a pas à
dépendre de l'arme portée. Mais c'est précisément la faille par laquelle
« Second canon » est passé : un levier offensif qui n'est pas dans les six axes
est **invisible à tout le système d'équilibrage par arme**.

Le tableau n'a pas à grandir à trente colonnes. Ce qu'il faut, c'est un critère
qui refuse le silence :

```js
// verifierArmes() — toute carte OFFENSIVE doit etre couverte ou exemptee
for (const c of CARDS) {
  if (!c.tags?.includes("off")) continue;
  if (axesTouches(c).length === 0 && !c.horsEchelle) {
    out.push(`carte « ${c.id} » : offensive et hors du tableau d'échelle`);
  }
}
```

`horsEchelle: true` est une **exemption explicite** — le porteur écrit qu'il a
regardé. C'est la différence entre une carte qui échappe au système et une carte
qu'on a décidé d'en sortir.

---

### Les cartes mortes, chiffrées

Le chantier 08 posait la règle ; voici ce qu'elle retire, mesuré :

| arme | mortes (coefficient 0) | quasi-mortes (≤ 0,3) |
|---|---|---|
| standard, assaut, laser | — | Expansion, Déflagration *(zone 0,2-0,3)* |
| **tesla** | Perforation, Ricochet | + Précision, Mire, Talon faible, Œil de faucon |
| **lame** | Perforation, Ricochet | + Canon long |
| **grenade** | Perforation, Ricochet | — |
| dispersion | — | — |
| **railgun** | *(après (d) : Perforation)* | Culasse allégée, Cadence accélérée, Rotative, Expansion, Déflagration |

Deux enseignements :

- **le filtre à `=== 0` retire peu** : deux cartes, sur trois armes. C'est le bon
  ordre de grandeur — `poolThin()` ne bronchera pas, et le chantier 08 est sans
  risque pour la santé du pool ;
- **le tesla est le vrai problème, et le plan 11 se contredit à son sujet.** Sa
  prose dit *« l'arme qui ignore complètement cet axe, donc ses cartes de
  critique tirées sont mortes »* ; son tableau dit `critique: 0,2`. Avec
  `critBase: 0`, une carte de crit lui rend 2 % de chance de critique : ce n'est
  pas « peu », c'est rien, mais habillé d'un chiffre non nul pour satisfaire la
  règle « aucun coefficient sous 0,2 ». **Le mettre à 0 et l'assumer** aligne le
  code sur la prose et retire quatre cartes de plus de son pool.

---

### Ce qu'il faut vérifier à la main

Ce que le banc ne peut pas voir :

1. **le ressenti de chaque tir** — huit armes, une manche courte chacune. Ce sont
   les deux tirs sans son (b) et les cinq capsules identiques qui ressortiront ;
2. **les huit armes contre chaque type de cible** — cristal (04), mur
   destructible, éclat, Rempart allié, boss. `_harvestHit` a montré qu'un chemin
   de dégât peut manquer une catégorie entière sans que rien ne le dise ;
3. **la rampe de l'assaut sur les onze boss** — le plan 11 la dit essentielle
   (*« sans elle, esquiver une mécanique de boss coûterait toute la puissance
   accumulée »*), et le commentaire du code dit que le pilote ne la tient que
   39 % du temps. C'est la seule arme dont l'équilibrage dépend d'un comportement
   de joueur.
