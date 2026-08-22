# Survivor LAN — l'interface

Trois chantiers qui ne touchent **ni la simulation, ni le réseau, ni le
catalogue**. Du CSS et du rendu de salon. Ils sont regroupés parce qu'ils se
testent de la même façon — on ouvre l'écran et on regarde — et parce qu'aucun
ne peut casser une manche en cours.

Deux d'entre eux viennent de ton test (01, 02), le troisième était déjà dans le
plan 11 mais son matériau n'a jamais tenu à l'échelle demandée (09).

| chantier | objet | taille |
|---|---|---|
| **01** | les overlays coupent leur propre contenu | une déclaration CSS |
| **02** | l'écran de choix d'arme : largeur, grille, états | une trentaine de lignes |
| **09** | les cadres deviennent des plaques de salon | une refonte de matériau |

---

## 01 — Le haut de l'écran est inatteignable

### Le constat

Sur la page Hauts faits, les premières lignes sont coupées au-dessus du bord et
**aucun scroll ne les ramène**.

### La cause

`public/css/ui.css:51`

```css
.overlay {
  position: fixed; inset: 0;
  display: flex; flex-direction: column;
  align-items: center;
  justify-content: center;   /* <- ici */
  overflow-y: auto;
}
```

Un conteneur de défilement qui centre par `justify-content: center` place le
débordement **des deux côtés**. Le débordement en bas est atteignable, celui en
haut ne l'est pas : la zone de scroll commence à `scrollTop: 0`, qui est déjà
sous le début du contenu. C'est un comportement du modèle de boîte, pas un
réglage — aucune valeur de `padding` ne le corrige.

Ce n'est pas propre aux hauts faits. **Tout overlay dont le contenu dépasse la
hauteur de la fenêtre a le même défaut** : réglages, bilan, méta. Les hauts
faits sont juste le plus long, donc le premier à le montrer.

### Le correctif

Un seul mot-clé, sur la règle partagée :

```css
.overlay {
  justify-content: safe center;
}
```

`safe` demande au navigateur de retomber sur `flex-start` **dès que le
centrage causerait une perte de données**. Court, chargé du sens, et vrai pour
les huit overlays d'un coup.

Repli si la cible doit supporter un moteur sans `safe` : `justify-content:
flex-start` sur `.overlay`, et `margin-block: auto` sur l'enfant direct — la
marge automatique centre quand il y a de la place et se réduit à zéro quand il
n'y en a plus, ce que `justify-content` ne sait pas faire.

### Le critère

Réduire la fenêtre à 600 px de haut, ouvrir Hauts faits : la ligne « Objectifs
du compte » est lisible sans scroll, et le bouton Retour est atteignable en
scrollant. Répéter sur Réglages, Bilan, Méta.

---

## 02 — L'écran d'arme

### Trois défauts, trois causes distinctes

**a) Le bloc est plus étroit que le reste du briefing.**

`.briefWrap` est `align-items: center` (`menus.css:2235`). `#briefMission` et
`#briefSkills` portent `width: 100%`, `#briefArme` **non** — il se réduit donc à
la largeur de son contenu. C'est ce qu'on voit en capture : le bloc « Ton arme »
flotte au milieu, plus étroit que la mission juste en dessous.

```css
#briefArme { width: 100%; }
```

**b) Les trois armes ne tiennent pas sur une ligne.**

`#briefArmeRow` est `repeat(auto-fit, minmax(200px, 1fr))`. Dans un conteneur
rétréci par (a), `auto-fit` ne trouve la place que pour deux colonnes et
renvoie la troisième à la ligne. Corriger (a) suffit dans la plupart des cas,
mais `auto-fit` reste une promesse molle : **l'offre est de trois, la grille
doit dire trois.**

```css
#briefArmeRow {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--sp-3);
  align-items: stretch;
}
@media (max-width: 720px) {
  #briefArmeRow { grid-template-columns: 1fr; }
}
```

`minmax(0, 1fr)` et non `1fr` : la valeur `auto` implicite du minimum empêche
une colonne de descendre sous la largeur de son texte le plus long, ce qui
déséquilibre les trois cartes selon le nom de l'arme.

**c) Aucun retour au survol, et la sélection est invisible.**

`.armeOpt` n'a **ni `:hover`, ni `:focus-visible`, ni `:active`**. `.mine` ne
change qu'une couleur de bordure — sur fond sombre, à un cheveu d'épaisseur,
c'est illisible.

Le briefing dure quelques secondes, sous compte à rebours. C'est exactement le
moment où un choix doit se voir sans être cherché.

```css
.armeOpt {
  position: relative;
  cursor: pointer;
  transition: transform var(--pop) var(--ease-pop),
              border-color var(--fade), background var(--fade);
}
.armeOpt:hover,
.armeOpt:focus-visible {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--tint) 65%, transparent);
  background: color-mix(in srgb, var(--tint) 8%, var(--bg-raised));
}
.armeOpt:active { transform: translateY(0); }

.armeOpt.mine {
  border-color: var(--tint);
  background: color-mix(in srgb, var(--tint) 12%, var(--bg-raised));
  box-shadow: 0 0 var(--sp-8) color-mix(in srgb, var(--tint) 28%, transparent);
}
/* la sélection se lit d'un coup d'œil, pas en comparant trois bordures */
.armeOpt.mine::after {
  content: "";
  position: absolute; inset-inline: 0; bottom: 0;
  height: 2px;
  background: var(--tint);
}
@media (prefers-reduced-motion: reduce) {
  .armeOpt { transition: none; }
  .armeOpt:hover, .armeOpt:focus-visible { transform: none; }
}
```

`--tint` et non `--go` : le briefing porte déjà la teinte de classe, posée par
`openBrief()`. Une arme sélectionnée en or dans un briefing bleu de Tireur
serait la seule chose de l'écran à ne pas appartenir à la classe.

### Le critère

Trois cartes de largeur égale sur une ligne, alignées avec la mission en
dessous. Survol : la carte se soulève. Clic : elle reste marquée sans ambiguïté
à un mètre de l'écran.

---

## 09 — Les cadres

### Le constat

Un cadre décore le **texte du nom** — un `inline-block` avec deux pseudo-éléments
dans son padding (`menus.css:3516`). Résultat : invisible dans les menus, à
l'étroit dans le tableau de bilan, et laid partout.

### Ce qui n'allait pas dans le principe

Le plan 11 a fait du cadre un **matériau appliqué à une chaîne de caractères**.
Un cadre est une plaque : elle a une silhouette, une profondeur, une lueur, une
zone morte. Rien de tout ça ne tient autour d'un mot de sept lettres.

Et le cadre est partout : salon, aperçu, bilan. Trois contextes, trois
contraintes qui se contredisent, d'où la portée `"ligne"` qui **désactive le
fond** — un correctif qui admet que l'endroit est mauvais.

### La refonte

**Un seul endroit : la ligne d'équipe du salon.** Le cadre s'applique à
`.teamRow`, pas à `.teamName`.

Ce n'est pas une restriction, c'est le bon support. Ta référence en capture le
montre : avatar, nom, insigne d'hôte, ligne d'état, ping. `renderTeamList()`
construit déjà **exactement cette anatomie** :

```
teamAvatar · teamMain( teamTop( teamName + teamHost ) + teamCls ) · teamPing · teamDot
```

Il n'y a rien à restructurer. Il y a un `appliquerCadre()` à déplacer d'un
niveau, et un matériau à écrire pour un rectangle de 320×90 au lieu d'un mot.

```js
// screens.js:932
appliquerCadre(row, l.cadre);            // au lieu de row.querySelector(".teamName")
```

- **bilan** : retirer `appliquerCadre(..., "ligne")` (screens.js:1421). La
  portée `"ligne"` disparaît avec, ainsi que sa règle CSS — un correctif dont
  le besoin s'évapore est un correctif qui n'aurait pas dû exister ;
- **aperçu de sélection** (screens.js:1389) : rendre une **vraie ligne
  d'équipe** en miniature, pas un `.cadreApercu` à part. On équipe ce qu'on a
  vu, et ce qu'on verra est une ligne de salon.

### Le matériau

Les cinq emplacements (`fond`, `bordure`, `ornement`, `lueur`, `palier`)
restent — la table `CADRE_SKIN` ne bouge pas, c'est l'échelle de rendu qui
change. Ce qu'une plaque permet et qu'un mot interdisait :

- **une silhouette découpée** — `clip-path` avec coins coupés et encoches, ce
  que la capture montre. Sur un `inline-block` de 90 px de large, une encoche
  mangeait une lettre ;
- **une texture de fond** — trame hexagonale, balayage diagonal, éclat. La table
  déclare déjà `trame`, `voile`, `balaye` ; ils n'avaient simplement pas de
  surface ;
- **une lueur de contour** par `drop-shadow` sur la silhouette découpée. La note
  du CSS actuel explique déjà pourquoi `drop-shadow` et non `box-shadow` — le
  raisonnement est bon, il n'attendait qu'un support ;
- **l'insigne en médaillon**, sur l'avatar, à sa vraie taille au lieu de 15 px
  coincés dans un padding ;
- **le palier 3 animé** — le dégradé qui tourne existe déjà et devient lisible.

Le HUD en jeu ne prend **pas** de cadre : douze plaques animées pendant une
vague, c'est douze sources de mouvement qui ne disent rien de la partie.

### Le critère

Salon à quatre joueurs, quatre cadres différents dont un Prismatique : les
quatre plaques se distinguent d'un mètre, aucune ne déborde de la colonne,
aucune ne tremble. Bilan : plus aucun cadre, et le tableau y gagne. Réduire à
`prefers-reduced-motion` : les dégradés restent, rien ne tourne.
