# Plan 7, lot 3 — passe VFX et audio

Complément au lot 1. Trois sujets : le flash trop blanc, les effets muets, et
l'arc électrique qui n'a rien.

---

## L3-1 · Le flash d'explosion — la cause est technique

`COMBAT.flash` vaut **`#ffffff`**, et les quatre styles de souffle l'utilisent
tous comme cœur :

```js
const BLAST_STYLE = {
  0:  { coeur: COMBAT.flash, ... },   // nova
  7:  { coeur: COMBAT.flash, ... },   // souffle
  8:  { coeur: COMBAT.flash, ... },   // onde
  12: { coeur: COMBAT.flash, ... },   // bombe
};
```

En mélange **additif**, les quads superposés s'additionnent vers le blanc. Un
cœur déjà `#ffffff` à alpha plein sature dès la deuxième couche : c'est une
**surexposition immédiate**, exactement le symptôme.

**La correction n'est pas d'assombrir le résultat, c'est de baisser la source et
de laisser l'empilement fabriquer le cœur chaud.**

```js
// palette.js — nouvelle entrée, NE PAS toucher COMBAT.flash
// (il sert aussi au flash de touche de la horde, qui doit rester blanc)
blastCore: "#fff4e0",   // blanc CHAUD
```

| couche | teinte | alpha |
|---|---|---|
| cœur (2 images) | `#fff4e0` | 0,90 |
| boule de feu | `#ffd98a` → `#ff9e3d` → `#c7481e` sur la durée | 0,55 par quad |
| onde de choc | `#ffc46b` | 0,40 |

Trois quads à 0,55 s'additionnent vers ~1,0 **uniquement là où ils se
recouvrent** : cœur brûlant et bords colorés, au lieu d'un disque blanc uniforme.
Le biais chaud (`f4e0` au lieu de `ffff`) suffit à faire lire « feu » plutôt que
« flash d'interface ».

⚠ **Ne pas modifier `COMBAT.flash` lui-même** : il sert aussi au flash de touche
de la horde, où le blanc pur est correct. Ajouter une entrée dédiée.

## L3-2 · Les effets muets — l'inventaire

`EFFECT_SOUND` ne couvre que **7 identifiants** : 0, 5, 7, 8, 12, 13, 14. Le
dépôt en produit bien davantage (`kind: 6` pour la rupture de barre, les
sanctuaires, les remparts, les ancres, les novas de contre…).

**Tout `kind` absent de cette table est silencieux.** C'est l'inventaire à faire
en premier : lister les `kind` réellement émis par `game_state.js`, les croiser
avec la table, et traiter chaque manquant.

Chaque effet passe trois cases :

| a-t-il un visuel propre ? | a-t-il un son propre ? | est-il distinguable de ses voisins ? |
|---|---|---|

Un effet qui échoue à la troisième est **pire que muet : il ment**. Et la règle
du lot 1 s'applique — le budget de retour suit la **fréquence** de l'effet, pas
son importance narrative.

Cas prioritaire relevé : **`kind: 6`, la rupture de barre de boss.** C'est un
moment de palier 3 (une trentaine par manche) et il n'a **aucun son**. Le lot A
du plan 8 en fait un moment structurant du combat — il lui faut le budget qui va
avec : impact grave, hitstop de 80-120 ms (item [6]), onde blanche.

## L3-3 · L'arc électrique

`Chaîne de foudre` existe (`chainChance`, `CHAIN_TARGETS: 3`, `CHAIN_MUL: 0.4`)
et **n'a ni tracé ni son**. C'est l'effet le plus visible du jeu à ne rien avoir.

### Le tracé

Repris des items [15] à [19] du lot 1 :

- **déplacement de point milieu**, 3-4 niveaux, amplitude décroissante ;
- **double couche additive** : cœur clair fin + halo 3-4× plus large à faible
  alpha. C'est ce doublage qui fait la différence entre « une ligne bleue » et
  « de l'électricité » ;
- **1-2 branches mortes** par segment, plus fines et plus sombres — le signal le
  plus fort de la liste, un arc sans branche ressemble à un laser ;
- **régénération à 15-20 Hz**, jamais par image ;
- **point brillant** à chaque extrémité, pour ancrer l'arc sur ce qu'il relie.

Un arc de chaîne relie 3 cibles : c'est donc **2 segments**, chacun avec son
propre tracé et ses branches.

### Le son

L'électricité n'est pas un bourdonnement, c'est une **série de craquements
irréguliers**. Trois couches, toutes à l'oscillateur :

| couche | contenu |
|---|---|
| **crépitement** | salves de bruit filtré passe-haut (3-6 kHz), intervalles **irréguliers** de 30 à 90 ms |
| **corps** | oscillateur carré 180-260 Hz avec détonation aléatoire de ±15 % |
| **halo** | nappe très basse, continue, faible volume — la présence |

L'irrégularité **est** l'effet : un intervalle constant donne une machine à
coudre. Et le carré est essentiel — c'est lui qui donne le côté « sale ».

> **Le son se régénère sur la même horloge que le tracé.** Si le tracé saute à
> 18 Hz et que le son crépite à un autre rythme, le cerveau les dissocie et
> l'effet perd sa matière. Une seule horloge pour les deux.

Le nombre de cibles touchées met la gravité et le volume à l'échelle, comme
l'intensité pour les explosions (item [8]).

## Critères d'acceptation

1. Aucun `kind` d'effet émis par la simulation n'est absent d'`EFFECT_SOUND`.
2. Une explosion ne présente **aucune zone de blanc pur** en dehors des deux
   images de cœur.
3. La rupture de barre de boss a un son, un hitstop et une onde.
4. Un joueur distingue à l'oreille une chaîne de foudre d'une explosion.
5. Le tracé d'arc et son crépitement **partagent la même horloge**.
