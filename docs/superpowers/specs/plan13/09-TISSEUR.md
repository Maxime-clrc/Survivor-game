# Survivor LAN — le Tisseur

> *« je ne comprends pas les grappes sur le boss du Tisseur. »*

**C'est normal : le Tisseur n'a pas de grappes.** Il a des **nœuds**, le jeu les
dessine comme des grappes, et il annonce une éclosion qui n'arrive jamais.

---

<a id="16"></a>
## 16 — Deux mécaniques, un seul visage

### Le constat

`shared/bosses.js` donne au Tisseur `base: ["mur", "marques", "salve"]` et
`unlock: [["noeuds"], ["prison"], ["quadrant"], ["entrelacs"]]`. **`grappes`
n'y figure pas.** L'attaque que tu vois est `noeuds`.

Les deux partagent le même identifiant de mécanique :

```js
// game_state.js:375
grappes: MECH_CLUSTER, noeuds: MECH_CLUSTER,
```

Ce partage était volontaire — un seul créneau, une seule règle d'occupation, un
seul chemin de rendu. Mais il fait passer **trois choses** dans le même tuyau, et
deux d'entre elles ne devraient pas y être.

### Ce qui diffère, et que rien ne montre

| | grappes | **nœuds** |
|---|---|---|
| durée | 12 s | **9 s** |
| PV | 230 × puissance | **260 × puissance** |
| nombre | 2 | **2 à 4, selon les joueurs vivants** |
| rayon | 30 | 34 |
| **si le temps expire** | 3 ennemis éclosent | **une zone au sol de 120 px pendant 14 s** |

La dernière ligne est tout. Le commentaire du code le dit sans ambiguïté :

> *un noeud tenu jusqu'au bout ne fait pas eclore : il PREND l'espace.*

Et c'est **l'identité entière du boss** — `sous: "il te reste de moins en moins
de place"`, `archetype: "batisseur"`, et la note du code sur `_atkNoeuds` :

> *le Ravageur RETIRE de l'arene par la peripherie, le Tisseur CONSTRUIT a
> l'interieur. Les noeuds sont la contrepartie : les detruire rend de l'espace,
> et c'est le seul boss ou le joueur repare l'arene.*

### Pourquoi c'est illisible

**Trois défauts qui se cumulent.**

**a) L'annonce décrit l'autre mécanique.** `_atkNoeuds` termine par
`this._alert(MECH_CLUSTER, …)`, et le texte associé à `MECH_CLUSTER`
(`bosses.js:88`) est :

> DÉTRUIS la grappe avant l'éclosion

Le joueur lit *grappe* et *éclosion*. Il détruit dans l'urgence, rien n'éclot
quand il échoue, et il en conclut — correctement — qu'il n'a pas compris. **Le
jeu lui a menti dans la seule phrase qu'il lui a écrite.**

**b) Le rendu est identique.** `render/boss.js:819` ne teste pas `m.noeud` : même
disque, même anneau de rupture, même arc de compte à rebours, même jauge de PV.
Rien à l'écran ne distingue une grappe d'un nœud.

**c) La conséquence est invisible.** Un nœud qui expire pose une zone au sol de
120 px pendant 14 secondes — mais **rien ne relie la zone au nœud qui l'a
produite**. Le joueur voit apparaître une flaque sans cause, à un endroit qu'il
avait cessé de regarder.

### Le correctif

**Ne pas séparer `MECH_CLUSTER`.** Le partage du créneau reste bon : deux
mécaniques d'occupation ne doivent pas pouvoir tourner ensemble. Ce qu'il faut
séparer, c'est ce que le joueur **lit** et ce qu'il **voit** — le champ `m.noeud`
existe déjà et suffit à tout.

**1. Un texte d'alerte par variante.** L'alerte prend le libellé du marqueur
plutôt que celui de la mécanique :

```
grappes → « DÉTRUIS la grappe avant l'éclosion »
nœuds   → « DÉTRUIS le nœud avant qu'il ne prenne la place »
```

Le verbe change parce que **l'enjeu change** : dans un cas on empêche des
ennemis d'arriver, dans l'autre on garde du terrain. Ce sont deux raisons
différentes de lâcher le boss, et c'est exactement ce qu'une annonce doit dire.

**2. Une forme par variante.** Le nœud n'est pas un œuf, c'est un point
d'ancrage. Le distinguer par ce qu'il va devenir plutôt que par une couleur :

- une **empreinte de la future zone** — un cercle de `NOEUD_R` (120 px) en
  pointillés fins, sous le nœud, dès son apparition. Le joueur voit **la place
  qu'il va perdre**, à l'échelle réelle, pendant les 9 secondes où il peut encore
  l'empêcher ;
- des **amarres** vers le boss, sur le modèle du trait de `MECH_FEED` qui existe
  déjà (`boss.js:834`) : c'est le Tisseur qui tisse, le lien doit se voir.

L'empreinte fait tout le travail. Une mécanique dont on montre la conséquence
**avant** qu'elle arrive n'a plus besoin d'être expliquée.

**3. Une continuité à l'expiration.** La zone au sol naît de l'empreinte au lieu
d'apparaître : le pointillé s'épaissit et se remplit. La cause reste visible
pendant la transition, donc le joueur relie les deux.

**4. Une récompense visible à la destruction.** Le code dit que le Tisseur est
*« le seul boss où le joueur répare l'arène »* — mais un nœud détruit se contente
de disparaître avec l'effet de rupture générique (`kind: 4`). L'empreinte doit se
**rétracter** vers le centre plutôt que s'éteindre : on rend l'espace, ça doit se
voir se refermer.

### Ce qu'il faut vérifier ailleurs

Ce défaut n'appartient probablement pas qu'au Tisseur. `MECH_CLUSTER` est partagé
par **trois** chemins : `_atkGrappes` normal, `_atkGrappes(b, 1, true)` en
version urgente (durée divisée par deux, ligne 5458) et `_atkNoeuds`. Le
deuxième réutilise lui aussi l'alerte standard, avec un compte à rebours deux
fois plus court et **aucun signe que l'urgence est différente**.

Plus généralement : `game_state.js:375` mappe plusieurs noms d'attaque sur un
même `MECH_*`. **Chaque paire est un endroit où deux règles peuvent porter la
même annonce.** Le passer en revue vaut le coup avant de conclure que le Tisseur
était un cas isolé — le plan 11 a montré trois fois de suite qu'un défaut trouvé
une fois avait des frères.

### Le critère

Un joueur qui rencontre le Tisseur pour la première fois, sans explication : à
la fin du combat, il doit pouvoir dire **ce que fait un nœud non détruit**. S'il
répond « ça fait apparaître des ennemis », le chantier a échoué.
