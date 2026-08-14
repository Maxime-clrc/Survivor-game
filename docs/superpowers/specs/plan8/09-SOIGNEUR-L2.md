# Lot 2 — le soin en lien continu

**Statut : toutes les décisions sont tranchées, le lot est exécutable.**

Refonte du mode soin du Soigneur : le projectile de soin devient un **lien
continu** vers les alliés proches, actif tant que la posture est engagée.

---

## Ce que le code fait aujourd'hui

Le mode soin **n'est pas un tir séparé** : c'est une **bascule de posture**. Le
commentaire de `classes.js` est explicite, et l'argument est bon :

> Le mode soin est une BASCULE et non une recharge : c'est une posture, pas un
> déclenchement. En mode soin les projectiles ne blessent plus mais s'arrêtent
> quand même sur les ennemis — **c'est cette contrainte qui rend la classe
> intéressante** : soigner quelqu'un derrière la horde devient un problème de
> position et de ligne de vue, pas un clic sur une barre.

Les constantes en jeu :

| constante | valeur | rôle |
|---|---|---|
| `HEAL_MODE_INTERVAL` | 0,35 s | cadence des projectiles de soin |
| `HEAL_MODE_ALLY` | 10 PV | par impact sur un allié |
| **`HEAL_MODE_SELF`** | **3 PV** | **par impact sur un ENNEMI** — l'auto-subsistance |
| `HEAL_MODE_REVIVE` | 0,35 s | réanimation gagnée par impact sur un joueur à terre |
| `HEAL_MODE_SHIELD_CAP` | 60 | le surplus de soin devient du bouclier |
| `HEAL_MODE_SWAP_CD` | 0,5 s | anti-spam de la bascule |

## Ce que le passage au lien coûte — à assumer explicitement

**La ligne de vue disparaît.** C'est nommément ce que le dépôt identifie comme
l'intérêt de la classe. Un lien de proximité automatique supprime la visée, donc
supprime cette expression d'habileté.

**Ce n'est pas rédhibitoire, à condition de remplacer la contrainte plutôt que de
la retirer.** La proposition ci-dessous change la nature du problème posé au
joueur :

| | aujourd'hui | avec le lien |
|---|---|---|
| la question posée | « ai-je une ligne de tir ? » | « puis-je **rester** près de lui ? » |
| le geste | viser à travers la horde | tenir une position dangereuse |
| l'échec | je rate mon tir | le lien casse |

Le lien pousse le soigneur **dans** la mêlée au lieu de le laisser tirer de
loin. Pour un jeu coopératif, c'est un meilleur problème — et ça règle au passage
la faiblesse actuelle du rôle : **ce que fait le soigneur devient visible pour
toute la table**.

---

## La mécanique proposée

**La bascule est conservée.** C'est une posture, pas une recharge — cette
décision reste juste et n'est pas remise en cause.

Posture engagée : le joueur **ne tire plus**, et des liens s'accrochent
automatiquement.

```js
HEAL_LINK_RADIUS: 260,        // rayon d'accrochage et de rupture
HEAL_LINK_MAX: 2,             // cibles simultanées (lisibilité, et voir plus bas)
HEAL_LINK_RATE: 20,           // PV par seconde et par allié lié
HEAL_LINK_GRACE: 0.5,         // délai de rupture hors rayon, anti-clignotement
HEAL_LINK_REVIVE: 1.0,        // secondes de réanimation par seconde de lien
```

- **accrochage automatique** aux alliés dans le rayon, jusqu'à `HEAL_LINK_MAX` ;
- **rupture** au-delà du rayon, après `HEAL_LINK_GRACE` — sans ce délai, un allié
  qui oscille à la limite fait clignoter le lien et le rend illisible ;
- **cibles : alliés uniquement** au socle — voir ci-dessous ;
- **allié à terre** : le lien accélère la réanimation au lieu de soigner ;
- **surplus en bouclier** : `HEAL_MODE_SHIELD_CAP` est conservé tel quel. C'est
  une bonne règle — soigner quelqu'un à pleine vie reste utile, et c'est
  justement le moment où on en a le temps.

### Le socle ne lie que les ALLIÉS — décision tranchée

Le lien **ne s'accroche qu'aux alliés** et **ne rend aucun PV au soigneur**. Le
soin de soi appartient à la vague (`HEAL_WAVE`), qui soigne bien le soigneur
lui-même — `for (const o of this.players.values())` l'inclut. Mettre la même
fonction à deux endroits diluerait les deux.

**Conséquence chiffrée, à assumer.** `HEAL_MODE_SELF: 3` par impact toutes les
0,35 s vaut aujourd'hui **8,6 PV/s** en continu tant que le soigneur touche des
ennemis. La vague seule vaut **2,2 PV/s** en moyenne (35 PV / 16 s).

> **L'auto-subsistance du soigneur est divisée par quatre, et sa posture devient
> inerte en solo** — sans allié, il n'y a rien à lier.

**C'est assumé.** Le soigneur est un soutien : jouer soutien seul n'a pas de sens
stratégique, et le solo est un mode d'entraînement dans un jeu qui s'appelle
Survivor LAN. Son autonomie n'est pas son sujet.

Deux conséquences à piloter, qui ne sont pas de l'équilibrage :

- **le critère du lot I bascule du solo vers le GROUPE** — le soigneur n'a pas à
  tenir seul, mais il ne doit pas être dominé à 2, 3 ou 4. Voir le lot I du
  plan 6, dont le critère a été amendé en conséquence ;
- **c'est un problème d'affichage, pas de puissance.** Un joueur qui choisit
  soigneur pour une partie solo doit le savoir **avant**, pas le découvrir à la
  minute 8. Une ligne sur l'écran de choix de classe suffit, et c'est la seule
  chose à écrire ici.

### `siphon` — carte soigneur, épique, max 1

Ce que le socle abandonne devient un **choix de build** plutôt qu'un acquis :

> le lien s'accroche aussi aux ennemis : 14 dégâts par seconde, et 6 PV par
> seconde rendus au soigneur

Priorité d'accrochage inchangée : **alliés d'abord**, les ennemis ne comblent que
les liens libres. Un allié blessé n'est jamais supplanté.

C'est la carte qui rend le soigneur autonome, et c'est le bon registre pour une
épique — elle *réécrit une règle* du mode plutôt qu'elle n'ajuste un nombre.

⚠ **À ne pas confondre avec `transfusion`**, qui existe déjà : *« 30 % des soins
prodigués sont aussi rendus au soigneur »*. Celle-là couvre déjà « le lien me
soigne quand je soigne un allié » — elle reste inchangée et parfaitement adaptée
au lien. `siphon` est l'autre besoin : **avoir une cible quand il n'y a pas
d'allié**. Les deux ne se recouvrent pas.

```js
HEAL_SIPHON_RATE: 6,        // PV/s rendus au soigneur — CARTE, pas socle
HEAL_SIPHON_DAMAGE: 14,     // dégâts/s infligés
```

---

## Cartes et méta à reprendre

### À réécrire — la carte devient vide

**`faisceau_double` (Faisceau divisé, rare soigneur)** — *« le projectile de soin
traverse un allié et en touche un second »*. Sans projectile, elle ne veut plus
rien dire.

**Remplacement — `ramification` (Ramification)** : `HEAL_LINK_MAX` +1.
Même intention (toucher un allié de plus), transposée à la nouvelle mécanique, et
elle devient la carte qui définit l'archétype « soigneur de groupe ».

### À conserver sans changement

`transfusion` (30 % des soins rendus au soigneur), `vague_large`,
`sanctuaire`/`grand_sanctuaire`/`sanctuaire_absolu` — ces trois derniers passent
par `cd2` et ne touchent pas la posture. `trousse`, `reanimateur`,
`bouclierRegen`, `reserve` : indifférents.

### Méta du soigneur — deux lignes changent de sens

| ligne | aujourd'hui | avec le lien | remarque |
|---|---|---|---|
| `flux` | +35 % de soins | → `HEAL_LINK_RATE` | direct |
| **`portee`** | +40 % de portée | → **`HEAL_LINK_RADIUS`** | change de nature : ce n'est plus une portée de tir mais un rayon de tolérance. Devient **la ligne défensive du soigneur** — elle lui permet de rester plus loin du danger |
| `releve` | +50 % / +20 PV | → `HEAL_LINK_REVIVE` | direct |
| `osmose` | +20 % | inchangé | — |
| `vitalite` | +20 % PV | inchangé | — |
| **`catalyse`** | +15 % de dégâts sur la cible soignée | **à trancher** | voir ci-dessous |

### `catalyse` — TRANCHÉE

**Décision : elle s'applique à tous les alliés liés, à taux réduit.**

```js
HEAL_CATALYSE_PER_LINK: 0.10,   // +10 % de dégâts par allié lié (était +15 % sur une cible)
```

Le plafond reste comparable à deux cibles (+20 % contre +15 %), et l'archétype
« lier large » se paie en efficacité par cible plutôt que d'être gratuit. Ça
préserve l'intention que le dépôt formule lui-même — *« la ligne la plus
importante : elle rend le soigneur offensif INDIRECTEMENT »* — sans la rendre
dominante en groupe.

Le raisonnement, pour mémoire :

- **à tous** : un soigneur liant deux alliés donne +30 % de dégâts à l'équipe, et
  +45 % avec `ramification`. C'est fort, mais c'est le sommet d'une ligne et le
  dépôt dit lui-même que `catalyse` est *« la ligne la plus importante : elle rend
  le soigneur offensif INDIRECTEMENT »*. Cohérent avec l'intention ;
- **à un seul, le plus blessé** : conserve le calibrage actuel mais rend la ligne
  très faible en groupe, alors que c'est précisément là que le lien brille.

Retenu : le premier, corrigé du taux. Le second conserverait le calibrage actuel
mais rendrait la ligne très faible en groupe — précisément là où le lien brille.

---

## Équilibrage

Le débit actuel est de 10 PV toutes les 0,35 s, soit **~28,6 PV/s** sur une
cible — mais il exige une visée et une ligne de vue, et rate souvent.

Un lien automatique ne peut pas soigner autant : `HEAL_LINK_RATE: 20` est
volontairement **sous** le débit théorique actuel, parce que le lien ne rate
jamais. À deux cibles, le débit total monte à 40 PV/s, ce qui est un vrai gain
de groupe — et c'est l'objet du lot.

**Interaction avec le plan 6 :** le lot I (classes et compositions) mesure
justement si une table de quatre tireurs bat une table 1/1/2. Ce lot déplace le
curseur en faveur du soigneur. **Les deux doivent être mesurés ensemble**, sinon
le lot I conclura sur une classe qui n'existe déjà plus.

---

## Rendu — là où le lot 1 paie

Le lien se dessine avec **exactement** les items [15] à [19] du lot 1 : tracé par
déplacement de point milieu, double couche additive (cœur clair + halo large),
régénération à 15-20 Hz, point brillant aux deux extrémités.

Deux différenciations à prévoir :

- **lien de soin** — teinte chaude, tracé **calme** : peu d'amplitude de gigue,
  pas de coupure. Il doit se lire comme stable ;
- **lien de siphon** — teinte froide, tracé **agité** : forte gigue, branches
  mortes ([17]), coupures irrégulières.

C'est la même fonction de tracé avec deux jeux de paramètres, et ça rend les deux
modes distinguables d'un coup d'œil par un allié à l'autre bout de l'écran.

---

## Critères d'acceptation

1. **Le soigneur n'est pas dominé EN GROUPE** : une table 1/1/2 va au moins aussi
   loin qu'une table de quatre tireurs (critère du lot I du plan 6). Le solo est
   hors critère — c'est un choix assumé, pas une régression à corriger.
2. **Le lien ne clignote jamais** sur un allié qui court à la limite du rayon —
   vérification du délai de grâce.
3. **Un allié sait qu'il est soigné sans regarder sa barre de vie.**
4. **Une table 1/1/2 va au moins aussi loin qu'une table de quatre tireurs**
   (critère du lot I, à re-mesurer après ce lot).
5. Le débit de soin d'un soigneur sur une cible unique **ne dépasse pas** celui
   d'aujourd'hui : le lot est un gain de **confort et de portée**, pas de
   puissance brute sur une cible.
