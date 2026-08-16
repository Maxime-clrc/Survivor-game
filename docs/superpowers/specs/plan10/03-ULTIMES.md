# Lot 10 — les troisièmes compétences comme ultimes

Trois compétences existent déjà (`SKILL3_NAME = { tank: "Ancre", soigneur:
"Sanctuaire", dps: "Salve" }`, débloquées au niveau 5 par une carte exclusive).
Elles se déclenchent aujourd'hui comme n'importe quelle compétence. Ce lot les
fait basculer dans le registre de l'**ultime**, et refond entièrement la Salve.

---

## 10-A · Ce qui manque aux trois pour être des ultimes

Quatre traitements communs, à écrire une fois pour les trois.

**L'amorce — 0,35 s.** Un temps de préparation visible où le personnage marque
le coup, avant que l'effet parte. C'est ce qui distingue un ultime d'un sort :
il s'annonce. Pendant l'amorce, le joueur est engagé — l'annulation n'est pas
possible.

**L'effet d'écran — 0,15 s.** Un bref voile ou une onde qui traverse la vue, pas
seulement un effet local. Court, sinon il gêne.

**Le marqueur pour les alliés.** Un signe bref au-dessus du lanceur. Dans un jeu
à quatre, savoir qu'un coéquipier vient de lâcher son ultime change tes propres
décisions — c'est de l'information de jeu, pas de la décoration.

**Le palier doit se voir.** Passer du palier 1 au 3 ne change aujourd'hui que des
nombres. Le palier 3 doit être **visuellement distinct** : couleur, amorce plus
longue, densité. C'est la récompense d'un investissement de build, elle doit se
constater à l'œil.

---

## 10-B · La Salve — refonte en missiles

### L'existant

`_skill3`, branche `default` : **hitscan instantané**. Cône de 0,7 rad, portée
480, jusqu'à `c.targets` ennemis, dégâts appliqués immédiatement, effet
`kind: 13` (un trait du joueur vers la cible). Aucun projectile, aucun trajet,
aucune explosion.

### Les paliers

| palier | missiles | direct | souffle | recharge | vuln. |
|---|---|---|---|---|---|
| 1 | 4 | 0,55× | 70 px à 0,45× | 20 s | — |
| 2 | 6 | 0,55× | 70 px à 0,45× | 17 s | — |
| 3 | 8 | 0,55× | 85 px à 0,50× | 14 s | oui |

Le multiplicateur par missile descend de 0,60-0,90 à **0,55** parce que le
souffle ajoute des dégâts que le hitscan n'avait pas. **À mesurer** : c'est la
seule valeur du lot qui n'est pas dérivée.

```js
SALVE_RANGE: 480,
SALVE_DUMB_TIME: 0.15,      // vol droit avant guidage
SALVE_TURN_RATE: 6.0,       // rad/s — la limite crée l'arc
SALVE_SPEED: 620,
SALVE_LIFE: 2.5,            // au-delà, le missile s'écrase
SALVE_SPREAD: 0.9,          // éventail de lancement, rad
SALVE_BOSS_MUL: 0.25,       // aligné sur DPS_BOMB_BOSS_MUL
```

### L'acquisition — 360°, départagée par la visée

Un tir à tête chercheuse qui respecte un cône est incohérent. L'acquisition
passe donc à **360°**, mais la visée **départage** : les cibles dans le cône du
réticule passent devant les autres à distance comparable.

```js
score = d2 * (dansLeCone ? 1 : 2.2)
```

Le joueur garde le choix du paquet à frapper sans être puni si un ennemi est
derrière lui.

### L'attribution — trois passes

**C'est le cœur du lot.** La troisième passe fait la différence entre « six
missiles » et « une salve ».

**Passe 1 — collecte.** Ennemis vivants dans `SALVE_RANGE`, triés par le score
ci-dessus.

**Passe 2 — répartition.** Une cible par missile tant qu'il reste des cibles.
S'il y a moins de cibles que de missiles, tour de rôle : 2 ennemis et 6 missiles
→ 3 chacun.

**Passe 3 — garde anti-surtuage.** Chaque missile **réserve** ses dégâts. Avant
d'en attribuer un de plus à un ennemi, on vérifie que les dégâts déjà réservés
ne suffisent pas à le tuer.

```js
const reserve = new Map();          // enemy.id -> dégâts déjà engagés
const cibles = [];
for (let i = 0; i < nbMissiles; i++) {
  let choisi = null;
  for (const t of tries) {
    if ((reserve.get(t.id) ?? 0) < t.hp) { choisi = t; break; }
  }
  if (!choisi) choisi = tries[i % tries.length];   // tout est saturé : on double
  reserve.set(choisi.id, (reserve.get(choisi.id) ?? 0) + direct);
  cibles.push(choisi);
}
```

Sans cette passe, deux grunts à 40 PV encaissent trois missiles chacun alors que
le premier les tue. **C'est ce qui fait qu'une salve paraît intelligente** — et
ce qui la rend forte sans gonfler ses chiffres.

Le surplus, quand toutes les cibles sont saturées, **double** au lieu d'être
perdu : un ultime ne doit jamais donner l'impression de gâcher.

*La réserve utilise les dégâts directs de base, sans critique ni
vulnérabilité — c'est une approximation volontaire. La corriger demanderait de
prédire des tirages aléatoires, pour un gain nul en ressenti.*

### La réacquisition en vol

Avec 600 ennemis qui meurent vite, la cible d'un missile sera souvent morte
avant l'impact. Sans réacquisition, les missiles finissent sur des cadavres.

À la mort de la cible : reprendre la plus proche **non saturée** dans un rayon
de recherche, sinon exploser sur place. Ne jamais laisser un missile poursuivre
une cible morte.

### Le vol

- **0,15 s de vol bête** — chaque missile part avec un décalage angulaire propre,
  en éventail vers l'extérieur (`SALVE_SPREAD`). C'est cette gerbe initiale qui
  donne la silhouette d'une salve ;
- **puis guidage à taux de virage limité** (`SALVE_TURN_RATE`). La limite crée
  l'arc naturellement, sans courbe scriptée ;
- **traînée** — le tracé du lot 03 sert directement ici ;
- **écrasement** à `SALVE_LIFE` plutôt qu'une orbite infinie.

### Réseau

Les missiles sont des entités serveur, à sérialiser comme les balles. Huit au
maximum par lancement et par joueur : le surcoût est négligeable même à quatre
joueurs. Réutiliser le chemin des projectiles plutôt que d'ouvrir une liste.

⚠ **`SALVE_BOSS_MUL: 0.25`**, aligné sur `DPS_BOMB_BOSS_MUL`. Sans ça, huit
missiles sur un boss — cible unique, donc toutes les cibles saturées, donc tout
double dessus — deviendraient la meilleure source de dégâts du jeu contre un
boss.

*Interaction avec le lot 02 : pendant un palier de barre, les dégâts sont
perdus. Les joueurs apprendront à garder leur ultime pour la fenêtre ouverte.
C'est du bon jeu, pas un défaut.*

---

## 10-C · L'Ancre — rendre visible ce qui est invisible

Aujourd'hui : ralentissement de 40 % et retenue dans le double du rayon
(`SKILL3_ANCRE_SLOW`, `SKILL3_ANCRE_LEASH`). Fonctionnel, et **totalement
invisible**.

**Décision : un objet planté, avec des chaînes visibles vers chaque ennemi
retenu.** Le rendu d'arc à double couche du lot 03 fait exactement ça — cœur
clair, halo large, tracé agité.

Ça transforme une statistique en image : on **voit** le Rempart tenir vingt
ennemis. C'est aussi la seule compétence du jeu qui montrerait à l'équipe le
travail du tank, ce qui est son problème de lisibilité de fond — son rôle est
entièrement fait de choses qui n'arrivent pas.

Les chaînes doivent **casser visiblement** quand un ennemi sort de la laisse ou
meurt : c'est le retour qui dit combien l'ancre tient encore.

---

## 10-D · Le Sanctuaire — l'ultime du lien

Aujourd'hui : disque de soin, avec purge au palier 3.

**Décision : un dôme, et à l'intérieur les liens s'accrochent automatiquement à
tous les alliés — sans limite de nombre et sans rupture.**

Le Sanctuaire devient « la zone où je peux tous vous tenir ». Ça découle de la
mécanique de lien du lot 09 au lieu d'être plaqué dessus, et ça donne enfin au
Soigneur un moment où il dépasse sa limite de deux cibles.

Rendu : un dôme avec une montée visible, pas un disque plat. Les liens partent
du dôme et non du soigneur, ce qui le libère de rester au centre.

---

## Critères d'acceptation

1. **Six missiles sur six ennemis proches frappent six ennemis distincts.**
   C'est le critère du lot.
2. Six missiles sur **deux** ennemis à faible vie n'en gaspillent aucun : dès
   que la réserve couvre les PV, le suivant change de cible.
3. Aucun missile n'impacte un cadavre.
4. Un allié sait qu'un ultime vient d'être lancé **sans regarder l'interface**.
5. Le palier 3 est identifiable à l'œil, sans lire de chiffre.
6. La Salve sur un boss ne dépasse pas la Bombe en dégâts par seconde de
   recharge.
