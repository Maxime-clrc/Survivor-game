# Lot 10 — l'interface de jeu

Barres de vie, icônes de compétences, boucliers, effets : l'interface que le
joueur a sous les yeux pendant toute la manche.

---

## Le constat

Le jeu est **dessiné** — `palette.js` (382 lignes), `material.js`, des sprites
et des boss tracés procéduralement, des icônes de bonus au canvas dans
`icons.js`.

Le HUD, lui, est du **CSS plat** :

```css
.teamRow .bar { height: 5px; background: var(--line-soft); }
.teamRow .bar > i { height: 100%; transition: width var(--tap) linear; }
```

Cinq pixels, une couleur pleine, une transition de largeur. C'est une barre de
progression de page web. **Deux langages visuels cohabitent, et l'interface est
le pauvre des deux.**

Symptôme révélateur : `tokens.css` fait **25 lignes**. Il n'y a presque pas de
système de design — donc chaque élément a été stylé isolément, et rien ne les
tient ensemble.

## La décision d'architecture : rester en DOM

**Ne pas réécrire le HUD au canvas.** Trois raisons :

- `hud.js` a un **cache d'écriture** (`setText`, `setWidth`, `setClass` ne
  touchent le document que si la valeur change). C'est du vrai travail, et c'est
  la bonne architecture ;
- le texte et la mise en page au canvas coûtent cher en travail pour un résultat
  moins bon ;
- **le CSS sait déjà tout faire** : `conic-gradient` donne les balayages de
  recharge radiaux, les dégradés superposés donnent la matière, les animations
  donnent les pulsations.

Ce n'est donc pas un chantier d'architecture, c'est un chantier de **matière et
de système**.

---

## H-1 · Le système de couleurs vient de `palette.js`

Aujourd'hui le CSS a ses propres couleurs (`--cls-tank`, `--line-soft`…), donc
elles **divergeront** de celles du jeu — c'est déjà probablement le cas.

> Les variables CSS de couleur sont **générées depuis `palette.js`** au
> démarrage, injectées sur `:root`. Une seule source de vérité.

Un changement de palette se répercute alors sur l'interface sans que personne
n'y pense, et la barre de vie d'un Rempart est **exactement** la couleur du
Rempart à l'écran.

C'est aussi ce qui permet au lot 06 (grammaire des télégraphes) de s'appliquer
au HUD : rouge = ça tue, jaune = ça pousse, bleu = sûr, violet = ça engage
l'équipe.

## H-2 · Les barres

Six traitements. Aucun ne demande de canvas.

**Le fantôme de dégâts.** La partie perdue reste affichée en teinte claire puis
se résorbe sur ~300 ms. **C'est le gain de lisibilité le plus important du lot** :
une barre qui glisse ne se voit pas, une barre qui laisse une trace montre
*combien* on vient de prendre. Même mécanique que celle prévue pour les barres
de boss au lot 03 — à écrire une fois, à utiliser partout.

**La matière.** Un dégradé vertical léger, un liseré clair en haut, un fond
sombre en bas. Trois lignes de CSS qui font passer un rectangle pour un objet.

**Les graduations.** Des repères tous les 25 PV : le joueur lit une valeur
absolue et pas seulement une proportion. À 150 PV pour un Rempart et 85 pour un
Tireur, la même fraction ne veut pas dire la même chose.

**Le seuil bas.** Sous 30 %, la barre pulse et se sature. C'est le seul moment où
le HUD a le droit d'attirer le regard.

**Le bouclier par-dessus, pas à côté.** Une surcouche translucide avec une trame
distincte, superposée à la vie. Et il doit **s'éteindre visiblement au coup et se
rallumer progressivement** pendant la rampe du lot 01 — sans ça le joueur subit
une règle qu'il ne voit pas.

**L'épaisseur.** Cinq pixels, c'est une ligne. La barre de soi mérite d'être plus
haute que celles des alliés : elles n'ont pas le même rang de lecture.

## H-3 · Les icônes de compétences

`buildPips` et `updatePip` gèrent déjà l'état prêt, actif et le stock. La
structure est là ; c'est la présentation qui manque.

**Le balayage de recharge en `conic-gradient`.** Un secteur qui se referme, pas
une barre qui se remplit. C'est le langage universel de la recharge, tout le
monde le lit sans apprentissage — et c'est natif en CSS.

**L'éclair de disponibilité.** Une pulsation brève à l'instant exact où la
compétence redevient prête. Trois lignes d'animation, et le joueur cesse de
surveiller ses recharges : il les *sent*.

**Le retour d'appui.** L'icône s'enfonce et se rallume à la pression. Sans ça,
appuyer sur une compétence en recharge ne donne aucun retour — le joueur ne sait
pas s'il a mal appuyé ou si c'est indisponible.

**L'ultime a un rang à part.** La troisième compétence est encadrée, plus grande,
avec sa propre animation de disponibilité. C'est le lot 12 qui en fait un
ultime ; l'interface doit le dire aussi, sinon la promotion n'existe que dans le
code.

**Les icônes elles-mêmes** sont dessinées au canvas dans `icons.js`, comme le
reste du jeu. C'est déjà la bonne approche — les compétences de classe méritent
le même traitement que les bonus au sol.

## H-4 · Les effets actifs

`updateEffects` et `updateBuffs` affichent les états en cours. Deux manques :

- **la durée restante** en balayage sur l'icône, comme les recharges. Un effet
  sans durée visible force à deviner ;
- **l'apparition et la disparition** doivent être animées. Un état qui surgit
  sans transition passe inaperçu, et c'est justement l'information qu'il fallait
  voir.

## H-5 · Le panneau de statistiques et le DPS

Optionnels, désactivables séparément dans les réglages.

**Le panneau**, sur le modèle de Binding of Isaac : les valeurs **effectives**
après cartes, reliques et méta — « 18,4 dégâts », jamais « +52 % ». Le joueur ne
doit pas faire l'arithmétique. Et **la ligne concernée s'illumine une seconde**
quand une carte est prise : c'est ce qui relie un choix à son effet.

**Le DPS.** `damageDealt` est déjà suivi par joueur, `hurtBy` par source.
Fenêtre glissante de 5 s plus cumul de manche.

⚠ **Par défaut, son propre DPS uniquement.** Afficher celui de tous dans un jeu
coopératif entre amis crée du reproche — c'est observé partout où ce compteur
existe. Le Rempart et le Soigneur auront toujours un mauvais chiffre : c'est leur
travail, et un compteur ne le dira pas. Total d'équipe en option, détail par
joueur jamais actif d'office.

**Les dégâts subis par source** valent mieux que le DPS : `hurtBy` les donne
déjà, et savoir *ce qui te tue* est plus instructif que savoir combien tu tapes.

---

## Pourquoi ce lot passe après le 06

La grammaire de couleur des télégraphes doit exister avant qu'on l'applique à
l'interface. Sinon on style le HUD deux fois.

## Critères d'acceptation

1. Aucune couleur du HUD n'est écrite en dur dans le CSS — toutes viennent de
   `palette.js`.
2. Le fantôme de dégâts rend **visible** une perte de 10 PV sur 150.
3. Une compétence qui redevient prête se **remarque sans être regardée**.
4. L'ultime est distinguable des deux autres compétences d'un coup d'œil.
5. Le détail du DPS par joueur n'est jamais actif sans action explicite.
6. Le HUD complet ne coûte pas plus d'une image par seconde.
