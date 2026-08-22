# Survivor LAN — le pool de cartes

Deux chantiers sur ce que le joueur se voit proposer entre deux vagues. Ils
partagent une cause : **`eligibleCards` filtre par famille et par classe, jamais
par arme portée** — alors que le tableau de coefficients dit précisément ce que
chaque arme tire de chaque carte.

| chantier | défaut | effet sur l'offre |
|---|---|---|
| **08** | aucun filtre par axe | une carte à coefficient 0 tombe quand même |
| **10** | trois familles déclarées et vides | l'arme retire 16 cartes du pool et n'en remet aucune |

**08 dépend de `12d`** : tant que le laser et le railgun déclarent une
perforation de 1,5 et 2,0 sur une statistique déjà infinie, le filtre lira des
coefficients qui décrivent mal la réalité et laissera passer ce qu'il devait
retirer.

---

## 08 — Les cartes mortes

### Le constat

Le tesla a `critique: 0.2` et `perforation: 0.0`. La lame a `perforation: 0.0`.
Une carte de perforation tirée sur l'une des deux **ne fait rien** —
`appliquerEchelle` multiplie par zéro (`armes.js`, `mods.pierce = round(pierce ×
e.perforation)`).

Elles tombent quand même. Le pool ne filtre que les familles d'arme
(`cards.js:1698`) ; les axes ne sont filtrés nulle part.

Sur trois cartes proposées, en tirer une morte, c'est un choix à deux options
sans le dire. C'est le pire cas d'une offre : le joueur croit choisir.

### Le correctif

**Une carte déclare ses axes. Le pool retire celles dont tous les axes sont à
zéro pour l'arme portée.**

```js
// cards.js — sur les cartes concernees
{ id: "perforation_1", axes: ["perforation"], ... }
{ id: "crit_1",        axes: ["critique"],    ... }
{ id: "canon_lourd",   axes: ["degats"],      ... }   // jamais a zero, jamais filtree
```

```js
// eligibleCards()
const ech = ARME_BY_ID.get(ctx?.arme)?.ech;
// ...
if (ech && c.axes?.length && c.axes.every(k => ech[k] === 0)) return false;
```

**`=== 0` et non un seuil.** Une carte à 0,2 rapporte peu — c'est le tableau de
coefficients qui fait son travail, et le joueur qui la prend quand même fait un
choix informé et perdant, ce qui est un choix. Une carte à 0 ne rapporte
**rien**, et c'est un mensonge. La différence entre les deux est la seule chose
que ce filtre doit connaître.

`every` et non `some` : une carte qui donne perforation **et** dégâts reste
utile sur un tesla, par ses dégâts. Seules les cartes mono-axe à coefficient nul
disparaissent.

### Le garde-fou

`POOL_MIN` (6 par rareté) existe déjà et `poolThin()` sait signaler un pool
maigre. Après ce filtre, **relancer `poolThin()` par arme** dans le script de
vérification : si retirer les cartes de perforation fait tomber le pool rare du
tesla sous 6, le problème n'est pas le filtre, c'est que le catalogue est trop
mince pour ce que ce plan lui demande.

### Le critère

Une manche tesla complète : zéro carte de perforation proposée, zéro carte de
crit pur. `poolThin()` silencieux pour les huit armes.

---

## 10 — Trois armes ont une famille vide

### Le constat, vérifié sur le dépôt

```
arme_assaut        4 cartes
arme_laser         4 cartes
arme_tesla         4 cartes
arme_lame          4 cartes
arme_dispersion    0
arme_railgun       0
arme_grenade       0
```

Le plan 11 avait prévu de commencer par quatre armes (« 16 cartes de famille au
lieu de 40 »). Les quatre sont faites. **Les trois armes reprises de l'ancien
dépôt ne l'ont jamais été.**

### Pourquoi c'est pire qu'un manque

`FAMILLES_D_ARME` se **déduit** de la table `ARMES` (`armes.js`) : toute arme
qui n'est pas le tir standard a une famille, qu'elle contienne des cartes ou
non. Et `eligibleCards` retire du pool les familles des **autres** armes :

```js
if (c.family && FAMILLES_D_ARME.has(c.family) && c.family !== mienne) return false;
```

Donc jouer la dispersion, le railgun ou le lance-grenades **retire seize cartes
du pool et n'en remet aucune**. Ces trois armes ne sont pas seulement privées de
leur progression : elles ont un pool strictement plus pauvre que le tir
standard, qui n'a pas de famille et ne retire rien.

Aucune vérification ne le signale. `verifierArmes()` contrôle les coefficients,
pas la contrepartie. C'est le fil rouge que le plan 11 s'était fixé —
*« un déblocage indexé sur une position de tableau se casse dès qu'on ajoute un
élément »* — dans sa variante suivante : **une famille déclarée par déduction se
vide dès qu'on ajoute une arme.**

### Le correctif

**Immédiat, une ligne :** ne déclarer une famille que si elle a des cartes.

```js
// armes.js — la famille se DECLARE, elle ne se deduit plus
export const FAMILLES_D_ARME = new Map(
  ARMES.filter(a => a.famille).map(a => [`arme_${a.id}`, a.id]));
```

et `famille: true` sur les quatre armes qui en ont une. Les trois autres
cessent instantanément d'appauvrir leur propre pool.

**Ajouter à `verifierArmes()`** — le critère qui manquait :

```js
// une famille declaree et vide est PIRE qu'une famille absente
for (const [f, id] of FAMILLES_D_ARME) {
  const n = CARDS.filter(c => c.family === f).length;
  if (n !== 4) out.push(`${id} : famille « ${f} » à ${n} cartes au lieu de 4`);
}
```

**Puis, le vrai travail :** écrire les douze cartes manquantes. Le plan 11 en
donne déjà la forme pour quatre armes (§5, quatre paliers, commune →
légendaire, le palier 3 corrige la faiblesse boss). Les trois manquantes suivent
la même règle :

| arme | 1/4 | 2/4 | 3/4 (faiblesse boss) | 4/4 |
|---|---|---|---|---|
| **Dispersion** | +2 plombs | gerbe resserrée | **convergence totale sous 250 px** | les plombs ricochent |
| **Railgun** | charge −30 % | +1 charge en réserve | **traînée persistante 1 s** | la charge se garde en bougeant |
| **Lance-grenades** | souffle +25 % | +1 grenade par salve | **détonation au contact, dégâts directs** | les morts explosent à leur tour |

Le chantier 07, s'il est retenu, s'appuie sur ces paliers pour dégrader les
formes de départ : on ne coupe pas une mécanique sans avoir la carte qui la
rend.
