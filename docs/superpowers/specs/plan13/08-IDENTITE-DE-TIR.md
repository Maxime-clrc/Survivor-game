# Survivor LAN — l'identité de tir

Le [plan 03](03-AUDIT-ARMES.md) constatait que cinq armes sur huit partagent la
même capsule. Ce plan-ci traite la conséquence : **une arme ne se reconnaît pas
à sa fiche, elle se reconnaît à ce qu'elle projette.**

Trois chantiers. Le premier est une correction de perception autant que de
chiffres — deux des trois reproches faits au canon laser portent sur des
mécaniques **qui existent déjà et que le joueur ne peut pas sentir**.

| chantier | arme | objet |
|---|---|---|
| **13** | canon laser | portée visible, chaleur ressentie, allumage lisible |
| **14** | canon d'assaut | la rampe devient une dispersion qui se resserre |
| **15** | les huit | une forme et une taille de projectile par arme |

---

<a id="13"></a>
## 13 — Le canon laser

### Ce qui a été dit, et ce que dit le code

> *« j'aime pas le fait que ce soit un rayon simple illimité et à portée
> illimitée, faut une portée limitée et qu'il se déclenche au clic avec système
> de surchauffe »*

Trois reproches. **Deux visent des mécaniques qui existent.**

| reproche | état réel |
|---|---|
| portée illimitée | `portee: 1.8` → **77 m**, borné dans `_faisceau` |
| pas de surchauffe | `CHALEUR_MONTEE 1/4,2` · `CHALEUR_MUET 1,5 s` · `_surchauffe()` |
| ne se déclenche pas au clic | `tirAutorise` : c'est bien un maintien de tir |

Ce n'est pas une bonne nouvelle. **Une mécanique qu'on a écrite et que le joueur
ne perçoit pas coûte le même travail qu'une mécanique absente, sans rien
rapporter.** Trois causes, toutes mesurables.

### a) La portée est réelle mais jamais visible

```
portée laser = 640 × 1,5 × 1,8 = 1728 px  →  1540 px après la borne d'arène
vue          = VIEW_W 1600 × VIEW_H 900
```

Le joueur est au centre : il voit **800 px** devant lui. Le faisceau en parcourt
1540. **Il sort de l'écran dans tous les cas, à chaque tir, sans exception.**

Une portée dont on ne voit jamais la fin *est* une portée illimitée, du point de
vue qui compte. Le nombre dans la table ne décrit rien de ce que le joueur vit.

**Correctif :** `portee: 0,9` → **43 m ≈ 860 px**, soit un peu plus que le
demi-écran. La fin du faisceau tombe alors dans le champ de vision, et le joueur
apprend sa portée en la voyant s'arrêter — sans qu'on lui écrive nulle part.

Le même calcul condamne le railgun (`portee: 1.8`, 86 m) : lui aussi sort
toujours de l'écran. À traiter avec le chantier **12a**.

### b) La chaleur ne monte que si l'on touche

```js
if (p.armeTouche) { p.armeRes += … } else { p.armeRes -= … }
```

Tirer dans le vide est **gratuit**. La jauge ne se remplit donc que dans les
moments où le joueur est déjà en train de gagner — jamais dans ceux où il
apprendrait qu'elle existe. Et comme le bonus de dégâts croît avec la chaleur
(`CHALEUR_BONUS`), la ressource **récompense** sans jamais mordre tant qu'on ne
sature pas.

**Correctif :** la chaleur monte **tant que le faisceau est actif**, touche ou
non. Deux régimes plutôt qu'un seul, pour ne pas punir la couverture de zone :

```js
CHALEUR_MONTEE:      1 / 4.2,   // en contact — inchangé
CHALEUR_MONTEE_VIDE: 1 / 7.0,   // faisceau actif, rien touche
```

Un faisceau tenu dans le vide sature en 7 s au lieu de jamais. C'est la
différence entre une jauge qu'on gère et une jauge qu'on subit une fois par
manche.

### c) Rien ne signale l'allumage ni la saturation

Le faisceau est **silencieux** (chantier **12b**), il n'a **pas de terminus
dessiné**, et l'anneau de chaleur est tracé autour du personnage
(`render/boss.js:1353`) où il concourt avec tout le reste du HUD de mêlée.

Sur le déclenchement au clic : il **est** au clic, mais un faisceau continu n'a
pas d'instant de départ perceptible — il apparaît. Plutôt que de le transformer
en tir par impulsions, ce qui détruirait son identité (« un faisceau continu qui
traverse une file entière »), lui donner **un allumage** :

- une amorce de deux images, plus large et plus claire que le faisceau établi ;
- un **terminus** au bout de la portée : une petite floraison d'impact, présente
  même quand le faisceau ne touche rien. C'est elle qui rend (a) lisible ;
- la boucle sonore du chantier **12b**, dont la hauteur suit `armeRes` — **la
  chaleur devient audible avant d'être fatale.**

### Ce qui reste à trancher

Maintien ou impulsion. Le maintien est cohérent avec la fiche et avec la
mécanique de chaleur, qui n'a de sens que sur une durée. L'impulsion (un clic =
un trait bref) donnerait le retour net qui manque, mais ferait du laser un
railgun rapide et rendrait `CHALEUR_MONTEE` sans objet.

**Recommandation : garder le maintien et corriger les trois causes ci-dessus.**
Si après (a), (b) et (c) le tir manque encore de netteté, l'impulsion reste
possible — mais elle coûte l'identité de l'arme, et il vaut mieux vérifier que
la perception était le problème avant de changer la mécanique.

---

<a id="14"></a>
## 14 — Le canon d'assaut

### L'idée

> *« le canon d'assaut devrait avoir aussi une dispersion aléatoire quand on est
> en mouvement puis se resserre quand on arrête de bouger »*

Elle est juste, et elle résout un défaut réel : **la rampe existe mais ne se voit
pas dans le tir.** Elle n'apparaît que comme un anneau autour du personnage
(`render/boss.js:1373`) — une jauge d'interface pour une mécanique qui devrait
se lire dans les balles.

### Ce qu'elle coûte : rien

`p.armeRes` porte **déjà exactement la bonne valeur**. Elle monte quand le joueur
est immobile, retombe progressivement quand il bouge (`RAMPE_SEUIL`,
`RAMPE_MONTEE`, `RAMPE_CHUTE`), et elle est déjà sérialisée vers le client.

```js
// _volley, branche default — aucun etat nouveau
const disp = ARME_CFG.ASSAUT_DISPERSION * (1 - p.armeRes);
const ang  = p.armeAng + (Math.random() * 2 - 1) * disp;
```

```js
ASSAUT_DISPERSION: 0.16,   // ~9 degres a l'arret complet du gain
```

Immobile depuis assez longtemps : `armeRes = 1`, dispersion nulle, tir chirurgical.
Après un déplacement : `armeRes` retombe, la gerbe s'ouvre. **La même jauge
raconte maintenant deux choses au lieu d'une**, et la seconde est visible sans
regarder un anneau.

### Ce que ça change à l'équilibrage

Ce n'est pas neutre : c'est un **malus ajouté** à une arme mesurée aujourd'hui à
97 % de la référence. Le terme `R` du [modèle d'équilibrage](06-EQUILIBRAGE.md)
le capte exactement — une gerbe qui s'ouvre fait chuter la part des tirs qui
atteignent leur valeur pleine.

Deux conséquences à assumer :

- la note de difficulté de l'assaut passe de **`D = 2,0` à `D = 2,5`** (l'axe
  *visée* monte de 0,5 à 1 : il faut désormais choisir entre tirer et bouger) ;
- sa cible passe de 1,06 à 1,08, donc **le chiffre nominal doit monter un peu**
  pour compenser la dispersion. La campagne du lot 5 dira de combien.

**Faire ce chantier AVANT la campagne**, jamais après : mesurer l'assaut puis lui
ajouter une dispersion oblige à tout rejouer.

---

<a id="15"></a>
## 15 — Une forme de projectile par arme

### Le constat

`public/render/world.js` dessine **tous** les projectiles joueur par le même
appel :

```js
drawBolt(b, CFG.BULLET_RADIUS, couleurProprietaire, bulletTrail, BOLT_CAPSULE);
```

Même rayon, même forme, même couleur. Et le projectile sérialisé ne porte pas de
quoi faire autrement :

```js
b => [b.id, r1(b.x), r1(b.y), b.owner]        // + un 5e champ si missile
```

`drawBolt` ne connaît d'ailleurs que **deux formes** : `BOLT_CAPSULE` et
`BOLT_DIAMOND`.

Conséquence directe : un rail de 60 dégâts qui traverse tout se dessine comme une
balle de 12. Le tir standard, le canon d'assaut, le fusil à dispersion, le
railgun et le lance-grenades sont **visuellement indistinguables** en vol.

### Le préalable technique

Un **sixième champ** sur le projectile : un index de forme, pas un identifiant
d'arme — le client n'a pas besoin de savoir *quelle* arme a tiré, seulement
*comment* dessiner.

```js
b => b.forme
  ? [b.id, r1(b.x), r1(b.y), b.owner, b.missile ? 1 : 0, b.forme]
  : (b.missile ? [b.id, r1(b.x), r1(b.y), b.owner, 1]
               : [b.id, r1(b.x), r1(b.y), b.owner])
```

`trimTail` est déjà la règle du dépôt pour les zones : un champ absent coûte zéro
octet. Le tir standard garde donc sa forme par défaut et **son paquet ne
grossit pas d'un octet** — ce qui compte, puisqu'il est de loin le plus nombreux.

### Les formes

| arme | forme | taille | pourquoi |
|---|---|---|---|
| tir standard | capsule | ×1,0 | la référence, inchangée |
| canon d'assaut | capsule courte | ×0,85 | menu et rapide : la cadence se lit dans la densité |
| fusil à dispersion | **grain rond** | ×0,7 | six petits corps, pas six balles |
| railgun | **losange allongé + traînée** | ×1,6 | la seule arme qui traverse tout doit en avoir la masse |
| lance-grenades | **cylindre lent, en rotation** | ×1,3 | un objet balistique, pas un tir |
| fusil de siège | **obus court et épais** | ×1,4 | (avec le chantier 11) |
| fusil de précision | **trait fin, traînée longue** | ×0,8 | (avec le chantier 11) |

Laser, tesla et lame n'entrent pas dans ce tableau : ils ne passent pas par
`bullets` et ont déjà chacun un rendu propre.

### Le fusil à dispersion : une forme qui est aussi une mécanique

> *« une boule au début puis des petites balles dans ça se disperse »*

Ce n'est pas un habillage, c'est une **règle**. Un projectile unique qui se
scinde à distance donne au fusil à dispersion ce qui lui manque : une portée
utile lisible, et une raison de tenir la distance moyenne plutôt que le contact.

```
1. un seul corps part, plus gros que les autres projectiles
2. a SPLIT_DIST (~150 px), il se scinde en six grains
3. les six divergent selon le cone actuel, la convergence existante s'applique
```

`convergence` est déjà implémentée (`game_state.js:1542`) et resserre la gerbe
de près. La scission ne la remplace pas : elle **déplace le moment** où la gerbe
apparaît, ce qui rend la convergence enfin visible — aujourd'hui elle agit à une
distance où les six plombs se confondent déjà.

**À faire passer par le modèle d'équilibrage.** Un projectile qui ne se divise
qu'après 150 px ne peut plus toucher à bout portant avec les six plombs : c'est
un changement de `Vhorde` **et** de `R`, pas un effet visuel. Comme pour le
chantier 14 : **avant la campagne, jamais après.**
