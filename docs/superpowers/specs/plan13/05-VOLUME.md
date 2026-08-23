# Survivor LAN — le volume

**Le lot 4.** Une ombre bien placée en dit plus sur un volume que n'importe
quelle quantité de détail sur sa face.

---

## Ce qui existe déjà, et qui est juste

`drawObstacles()` (`decor.js:107-180`) fait **deux** choses distinctes, et les
deux sont correctes :

| geste | ce que ça dit | valeur actuelle |
|---|---|---|
| extrusion **radiale** depuis le centre écran | la **caméra** — un objet loin du centre montre son flanc | `OBST_RELIEF = 7` |
| ombre décalée **constante** | la **lumière** — elle vient d'une direction | `(+0.6, +0.7) × OBST_OMBRE` |

**Les deux coexistent, et c'est ce que fait la 2D haut de gamme.** Le lot ne
remplace ni l'un ni l'autre : il donne un nom à la seconde et la partage.

---

## 1 — `LUM_DIR` : une direction, une seule

Aujourd'hui `(+0.6, +0.7)` est écrit en dur, à un seul endroit, et rien d'autre
dans le jeu ne le connaît. Résultat : les obstacles ont une lumière, et rien
d'autre n'en a.

Il devient une constante **par biome**, dans la table de biome — parce que la
direction de la lumière fait partie du lieu :

```
LUM_DIR = { dx, dy, dur }
```

`dur` (dureté) sépare deux comportements que le brief demande explicitement :

| objet | ombre |
|---|---|
| débris, gravats, prop plat | diffuse, courte, très douce |
| machine, coffret, obstacle | plus dure, plus longue, contour net |

Tout ce qui projette une ombre lit `LUM_DIR`. **Point de passage unique.** Deux
ombres qui pointent dans des directions différentes sur le même écran, c'est le
défaut le plus visible d'un rendu 2D — et le plus facile à éviter en refusant
qu'il existe un second endroit où l'écrire.

---

## 2 — L'ombre de contact sous les entités

Le gain le plus fort du lot, et il est presque gratuit.

Un ennemi, un joueur, un bonus posé au sol n'ont aujourd'hui **aucune ancre au
sol** : ils flottent. Une ellipse sombre sous chacun les pose.

Le chemin est déjà là : `fx_glow` est une case de l'atlas, `drawSprite()` prend
`tint` et `alpha`, le batcher WebGL groupe tout ce qui partage un mode de
mélange. **Une ombre de contact est donc un quad de plus dans un lot qui existe
déjà** — coût mesuré en quads, pas en appels de dessin.

Règles :

- Elle est dessinée en **mélange normal**, pas additif, et **avant** les entités.
  Elle appartient donc au même lot GL que les corps, sans vidage supplémentaire.
- Elle est **décalée par `LUM_DIR`**, écrasée verticalement, jamais centrée.
- Elle est **plafonnée en opacité** : à 200 ennemis serrés, 200 ombres qui
  s'additionnent feraient une flaque noire. Elle ne s'additionne pas.
- **Pas d'ombre pour un projectile.** Même raison qu'au lot 3 : la fréquence.

---

## 3 — Les silhouettes d'obstacles

`silhouette()` (`decor.js`) trace aujourd'hui un rectangle à coins coupés, avec
une variante par biome. Trois passes s'ajoutent, uniquement sur la **face du
dessus** :

| ajout | ce qu'il apporte |
|---|---|
| caillebotis / tôle striée | une **matière** identifiable, pas une surface pleine |
| bande LED ambre sur une arête | la lumière technique du §4 du brief — petite, intégrée, jamais un néon |
| coin usé, arête ébréchée | la ruine de Friche, sans ajouter d'objet |

La bande LED devient une **source** pour `lumiere.js` : un obstacle éclaire son
propre pourtour. C'est le lien qui fait que le décor et la lumière décrivent le
même monde au lieu de se superposer.

**La couverture destructible garde son contour tireté** : c'est une information
de gameplay (`cover`), elle passe devant l'habillage et ne change pas.

---

## Ce qu'on ne fait pas

- **Pas de hauteur simulée, pas de tri en Y, pas de z.** Le jeu est en vue de
  dessus et la simulation est plate ; introduire une hauteur créerait des cas où
  l'image et les collisions ne disent pas la même chose.
- **Pas d'occlusion.** Un ennemi derrière une machine reste visible. Une horde
  qu'on ne voit pas n'est pas difficile, elle est injuste — c'est déjà la seule
  règle de `voileBrume()`.

---

## Critères de sortie

1. Toutes les ombres de l'écran pointent dans la même direction.
2. À 200 ennemis serrés, les ombres de contact ne forment pas de flaque.
3. Le coût GL reste à **2 appels de dessin par image** — les ombres tombent dans
   le lot existant, elles n'en ouvrent pas un troisième.
4. Le contour tireté de la couverture destructible est aussi lisible qu'avant.
