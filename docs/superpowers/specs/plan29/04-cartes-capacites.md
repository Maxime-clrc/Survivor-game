# 04 · Compatibilité des cartes — ce que le système fait vraiment

## Correction préalable : `litCanons` n'est pas ce qu'on croyait

Les briefs (et le plan 26) traitaient `litCanons` comme le test de capacité
d'explosion. C'est faux, et l'erreur oriente mal tout le chantier.

```js
export const canonEffet = a =>
  a.tir === "arc_sol" ? null
    : a.plombs ? "plombs"
    : a.tir === "balle" ? "balle"
    : a.tir;

export const litCanons = a => canonEffet(a) !== null;
```

`canonEffet` répond à **« qu'ajoute un canon supplémentaire à cette arme »**.
Elle renvoie non-null pour **9 armes sur 10** — seule la lame (`arc_sol`) est
exclue, parce qu'elle ne lance rien. `litCanons` est donc un test
d'applicabilité de la carte « Second canon », pas un filtre d'explosion.

Le commentaire du dépôt le dit d'ailleurs explicitement : la fonction a été
écrite parce que « Second canon » était un malus pur pour cinq armes et sortait
du pool, ce qui laissait cinq armes sans carte de projectile.

### Les vraies explosions

Deux armes seulement portent un souffle : **grenade** (`souffle: 68`) et
**siège** (`souffle: 48`, `obus: true`, `souffleDmg: 0.5`).

`areaMul` est lu à **11 endroits** de `game_state.js` :

| ligne | source | dépend de |
|---|---|---|
| 1859 | explosion de grenade | arme |
| 1914 | souffle du siège | arme |
| 2036 | rayon de la lame | arme |
| 2320, 2334, 2410 | explosions de **cartes** | build |
| 2750 | bombe (compétence) | **classe** |
| 3170, 3219, 3246 | rayon de grenade, chaîne, rayon générique | build |
| 4338 | nova (compétence) | **classe** |

**Conséquence de design importante** : une carte de zone n'est pas morte sur
une arme sans souffle, parce que le joueur peut avoir la bombe (classe dps) ou
une carte d'explosion. La règle du brief — « effet principal inutile mais effet
secondaire utile → la carte doit pouvoir apparaître » — est donc **déjà
respectée**, mais par une autre voie que celle supposée.

C'est aussi ce qui justifie `ech.zone = 0.3` pour le tir standard, qui n'a
pourtant aucun souffle : le coefficient couvre le chemin carte/compétence.

## Ce qui reste réellement à faire

### 4a — Distinguer les deux sens de « rebond »

```js
export const litPerce  = a => a.tir === "balle" && !a.perforeTout && !a.obus;
export const litRebond = a => a.tir === "balle" && !a.obus;
```

`litRebond` teste `tir === "balle"`. Le tesla a `tir: "arc"` : **il est déjà
exclu**, donc le cas cité par le brief (une carte de rebond-sur-mur proposée
avec le tesla) ne devrait déjà pas se produire. À **vérifier en jeu** plutôt
qu'en lecture — si ça se produit quand même, c'est une régression ponctuelle,
pas un système à construire.

Ce qui manque en revanche : le rebond **entre cibles** du tesla
(`TESLA_REBONDS: 1`, `TESLA_PERTE: 0.3`, `TESLA_SAUT: 220`) et le rebond
**sur obstacle** partagent le mot « rebond » sans partager de fonction.
Documenter explicitement que ce sont deux capacités distinctes, et vérifier
qu'aucune carte ne promet l'une en délivrant l'autre.

### 4b — Fonction de rapport lisible carte × arme

C'est la seule brique réellement absente. Elle s'écrit **en surcouche** de
`axesDeCarte` / `litCanons` / `litPerce` / `litRebond` / `litCadence`, sans
nouveau moteur de règles :

```
carte « horizon » → laser  : inapplicable (ech.portee lu, mais perforation nulle)
                  → siege  : applicable   (raison : portée + vitesse)
```

Valeur : outil de design et de debug, pas une mécanique de jeu. Il rend
auditables les 178 cartes × 10 armes sans lecture manuelle.

### 4c — `litCadence` et les armes à intervalle nul

`litCadence = a => a.interval > 0`. Le **laser** a `interval: 0` : il ne lit
aucun bonus de cadence. Vérifier que c'est bien reflété partout — y compris
dans `ech.cadence = 0.4` du laser, qui suggère au contraire qu'il *encaisse*
partiellement les cartes de cadence. Ces deux affirmations ne peuvent pas être
vraies en même temps ; en trancher une.

C'est un candidat sérieux au +16 % du laser mesuré au chantier 02.

## Ce qui est déjà vert — ne pas y toucher

`verifierCartes()`, `verifierReliques()`, `verifierBonus()` : **0 problème**
au 2026-09-02. `verifierArmes` garantit déjà qu'aucune arme n'a un pool vide
et que chaque famille d'arme porte ses 4 paliers. Le système de compatibilité
fonctionne au niveau où il a été conçu ; ce chantier l'affine, il ne le
reconstruit pas.

## Cartes spécifiques au siège — à ne pas ajouter tout de suite

Le brief propose fragmentation, obus perforant, sous-munitions, etc. **La
mesure du chantier 02 dit que le siège sous-délivre de 10 points**, donc lui
ajouter des cartes est prématuré tant qu'on n'a pas isolé pourquoi. Une
nouvelle carte sur une arme mal calibrée déplace le problème au lieu de le
résoudre.

Ordre correct : mesurer le DPS boss isolé du siège (H1/H2 du chantier 02) →
corriger le levier identifié → rejouer `verifierEquilibreArmes` → **puis**
seulement envisager du contenu.

## Fichiers

- `shared/armes.js` — `litCadence`, `litRebond`, documentation des capacités
- `shared/cards.js` — `axesDeCarte`, `eligibleCards`
- nouveau : rapport carte × arme (script d'outillage, pas code de jeu)
- `docs/regles/CONTENU.md`
