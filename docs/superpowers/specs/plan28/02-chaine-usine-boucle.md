# 02 · La chaîne de l'Usine saute quatre fois par seconde

## La mesure

`public/render/blocs.js`, habillage de `B_CHAINE` :

```js
const CHAINE_PAS = 13;
const CHAINE_VITESSE = 26;
...
const u = ((maintenant() * CHAINE_VITESSE * sens) % CHAINE_PAS + CHAINE_PAS) % CHAINE_PAS;
ctx.fillStyle = alpha(S.emis, 0.30);
for (let x = -L / 2 + u; x < L / 2; x += CHAINE_PAS * 4) {
  ctx.fillRect(x - 2.4, -T / 2 + 6, 4.8, T - 12);
}
```

**Le motif a une période de `CHAINE_PAS * 4` = 52 px, l'avance est repliée sur
`CHAINE_PAS` = 13 px.** Les taquets avancent donc de 13 px, puis reviennent tous
en arrière de 13 px d'un coup, soit un quart de leur écartement. À 26 px/s, ça
arrive **toutes les 0,5 s**, indéfiniment. C'est le saut visible sur la capture.

Second défaut, du même endroit : la boucle démarre à `-L/2 + u`, donc le premier
taquet **naît** sur le bord gauche du tapis au lieu d'y entrer. Rien ne vient de
l'amont.

## La correction

```js
const CHAINE_MOTIF = CHAINE_PAS * 4;
const u = ((maintenant() * CHAINE_VITESSE * sens) % CHAINE_MOTIF + CHAINE_MOTIF) % CHAINE_MOTIF;
for (let x = -L / 2 - CHAINE_MOTIF + u; x < L / 2 + CHAINE_MOTIF; x += CHAINE_MOTIF) {
```

Le modulo se replie sur la période **du motif dessiné**, et la boucle commence une
période avant le bord et finit une période après : un taquet entre par un bout et
sort par l'autre. `CHAINE_MOTIF` devient une constante nommée à côté des deux
autres — c'est elle, et non `CHAINE_PAS`, qui est la période du mouvement ; les
deux stries du tapis (lignes 751 et 757) continuent d'utiliser `CHAINE_PAS`, qui
reste le pas de la **surface**.

Le `ctx.clip()` du tapis n'existe pas ici (contrairement à `convoyeur` dans
`props.js`) : les taquets débordants doivent donc être bornés, soit par un clip
sur le rectangle du bloc, soit en gardant la borne haute à `L / 2` et en
n'ajoutant que la borne basse. **La deuxième option est la bonne** : un taquet qui
sort du carter serait un défaut de plus, et l'entrée par la gauche suffit à
supprimer la naissance.

## Le voisinage à vérifier dans le même lot

Trois autres mouvements périodiques ont été relus le 2026-08-31 :

| endroit | verdict |
|---|---|
| `props.js` `convoyeur()` (`TAQUET = 9`) | **juste** — le modulo et le pas de boucle sont le même nombre, et le tapis est `clip()`é |
| `blocs.js` `conduite()`, brides qui fuient | **juste** — enveloppe en `sin`, sans repli |
| `blocs.js` `feux()` | **juste** en régime, mais `(t * 1.6 - i * 0.16) % 1.6` est négatif pour les premiers indices pendant la première seconde d'une partie ; `Math.max(0, …)` l'absorbe. À laisser tel quel, noté pour ne pas être re-découvert |
| `blocs.js` `dessinerLed()` | **juste** — `tube`, `enseigne` et `bande` sont des enveloppes continues |

La règle qui manquait et qui doit être écrite dans `docs/regles/RENDU.md` :
**un défilement se replie sur la période de CE QUI EST DESSINÉ, jamais sur une
sous-graduation de la surface.**

## Vérification

`BANC=1 BIOME=usine GRAINE=7 npm start`, puis `http://localhost:7777/?banc` :
regarder une chaîne pendant dix secondes. Avant : un recul net deux fois par
seconde. Après : un défilement continu, et un taquet qui entre par le bord opposé
au groupe d'entraînement.
