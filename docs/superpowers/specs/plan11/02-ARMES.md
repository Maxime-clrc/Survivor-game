# Survivor LAN — les armes

Récapitulatif de conception. Dix armes, trois proposées au départ de chaque
manche.

**Référence :** tir standard = intervalle 0,16 s · 12 dégâts · ~75 DPS
mono-cible. Toutes les armes tournent autour de **70-76 DPS mono-cible**. Celles
qui perforent ou rebondissent sont volontairement un peu sous la référence en
cible unique, et largement au-dessus en densité.

---

## 1. Les fiches

| arme | intervalle | dégâts/tir | portée | propriétés de base | contrainte |
|---|---|---|---|---|---|
| **Tir standard** | 0,16 s | 12 | ×1,0 | — | aucune |
| **Canon d'assaut** | 0,11 s | 8 | ×0,8 | **dégâts ×1 → ×2,2 en 2,5 s immobile**, retombée progressive en 1,2 s | rampe perdue en bougeant |
| **Canon laser** | continu | 90/s | ×1,6 | **perforation illimitée** · ne rate jamais | chaleur, muet 1,5 s à saturation |
| **Tesla** | 0,30 s | 10 | ×0,7 | **2 rebonds** (−28 %/saut) · **aucune visée** · **0 % crit** | dégâts faibles par cible |
| **Lame tournoyante** | 0,40 s/tour | 14/passage | ×0,25 | touche **tout l'arc** · **+40 % PV max** | portée nulle |
| **Fusil de siège** | 0,70 s | 70 | ×1,2 | chargeur **6** · souffle 60 px · **+10 % crit** | recharge 1,8 s |
| **Fusil de précision** | 0,55 s | 42 | **×2,2** | **+15 % crit** · traverse **1** ennemi | cadence lente |
| **Railgun** | 0,70 s charge | 60 | ×1,8 | **perforation illimitée** en ligne | charge avant chaque tir |
| **Dispersion** | 0,50 s | 6 × 6 plombs | ×0,5 | cône large | portée courte |
| **Lance-grenades** | 0,80 s | 40 + zone 110 px | ×0,9 | dégâts de zone | projectile lent |

### Ce que chaque profil implique

**Fusil de précision** — le crit de base et la perforation de 1 en font l'arme
qui profite le plus des cartes de critique et de perforation, deux axes
aujourd'hui sous-exploités. Sa portée lui permet de traiter une ligne avant
qu'elle arrive : du placement, sans avoir besoin d'un malus de proximité.

**Canon d'assaut** — la rampe est ce qui crée le dialogue permanent entre le
danger qui approche et le compteur qui monte. La **retombée progressive** est
essentielle : sans elle, esquiver une mécanique de boss coûterait toute la
puissance accumulée, et l'arme serait injouable sur les onze boss.

**Canon laser** — la perforation illimitée est sa vraie signature, pas les
dégâts. À froid il fait 90/s ; avec la chaleur qui impose ~65 % de temps de tir,
il tombe à ~58 effectif en mono-cible, mais il touche toute une file d'un coup.

**Tesla** — les 0 % de crit sont délibérés : c'est l'arme qui ignore complètement
cet axe, donc ses cartes de critique tirées sont mortes. C'est ce qui rend le
tableau de coefficients réel plutôt que décoratif. Ses 2 rebonds de base sont
volontairement faibles — c'est sa famille qui les monte à 5.

**Lame tournoyante** — les +40 % de PV max sont **intrinsèques à l'arme**, pas
une carte. C'est ce qui la rend jouable au contact dès le premier choix, sans
dépendre d'un tirage.

**Fusil de siège** — 6 obus à 0,70 s puis 1,8 s de recharge : on tire 4,2 s, on
est vulnérable 1,8 s. Le rythme est prévisible, donc anticipable.

**Railgun** — sa charge le rend mauvais en réaction et excellent en anticipation.
Il ne se joue pas contre la horde qui arrive, mais contre celle qui va arriver.

---

## 2. Contraintes et contreparties

| arme | ce qu'elle coûte | ce qu'elle donne |
|---|---|---|
| Canon d'assaut | immobilité | **le meilleur DPS soutenu du jeu** (160 à plein régime) |
| Canon laser | surchauffe | ne rate jamais, traverse une ligne entière |
| Fusil de siège | fenêtre de recharge | **bouclier ×3 pendant la recharge** |
| Lame tournoyante | portée nulle | **+40 % PV max**, aucune visée à gérer |
| Fusil de précision | cadence lente | portée ×2,2, crit et perforation de base |
| Railgun | charge | traverse tout, sans limite de cibles |

**Deux règles de méthode :**

- **la contrepartie est du même ordre que le malus.** Le fusil de siège
  transforme sa fenêtre de faiblesse en fenêtre de récupération — ce n'est pas
  « +10 % de dégâts pour compenser » ;
- **le malus est pilotable.** La surchauffe se relâche, la recharge s'anticipe,
  l'immobilité se choisit. C'est la différence entre une contrainte et une
  punition.

---

## 3. Conversions contre cible unique

Les boss représentent **un cinquième du temps de manche**, contre une cible
unique. Une arme qui saute entre les cibles n'a rien à sauter face à un boss.

> **Règle : aucune arme ne descend sous 60 % de la référence dans l'un des deux
> contextes.**

| arme | conversion |
|---|---|
| Tesla | les arcs **reviennent** sur la même cible, avec la perte par rebond |
| Lame tournoyante | les coups répétés **empilent une marque** (+8 %, max 5) |
| Canon laser | **la chaleur devient un bonus** : plus elle est haute, plus le faisceau fait mal |
| Dispersion | les plombs **convergent** sous 250 px |
| Lance-grenades | **détonation au contact**, dégâts directs + souffle |

Le laser est le modèle à retenir : **la même ressource est un malus en horde et
un bonus sur boss.** Une mécanique, deux lectures selon le contexte.

---

## 4. Coefficients d'échelle

**Un seul pool de cartes.** Chaque arme déclare ce qu'elle tire de chaque
statistique — une carte de cadence est excellente sur le tesla et presque
inutile sur le railgun, sans écrire une seule carte neuve et sans gonfler le
pool.

| arme | dégâts | cadence | portée | zone | perforation | critique |
|---|---|---|---|---|---|---|
| tir standard | 1,0 | 1,0 | 1,0 | 0,3 | 1,0 | 1,0 |
| canon d'assaut | 1,2 | 1,1 | 0,8 | 0,2 | 0,9 | 1,0 |
| canon laser | 1,2 | 0,4 | 1,3 | 0,2 | 1,5 | 0,6 |
| tesla | 0,7 | 1,2 | 0,5 | 1,2 | **0,0** | **0,2** |
| lame tournoyante | 1,3 | 1,3 | 0,2 | 0,8 | 0,0 | 1,0 |
| fusil de siège | 1,4 | 0,3 | 1,1 | 0,4 | 1,2 | 1,3 |
| fusil de précision | 1,5 | 0,4 | 1,6 | 0,1 | 1,4 | 1,4 |
| railgun | 1,5 | 0,3 | 1,5 | 0,2 | 2,0 | 1,4 |
| dispersion | 0,9 | 0,8 | 0,7 | 0,6 | 0,6 | 0,8 |
| lance-grenades | 1,1 | 0,5 | 0,8 | 1,5 | 0,0 | 0,6 |

Aucun coefficient sous 0,2 — une carte à valeur nulle est un choix vide. Seules
exceptions assumées : le tesla et la lame ignorent la perforation, ce qui rend
le tableau réel plutôt que décoratif.

---

## 5. Familles de cartes

**Chaque arme reçoit sa propre famille de 4 paliers**, commune → légendaire.
Aucune machinerie nouvelle : c'est le système `family` / `tier` existant.

| arme | 1/4 | 2/4 | 3/4 | 4/4 |
|---|---|---|---|---|
| **Canon d'assaut** | rampe plus rapide | plafond ×2,2 → ×2,8 | **la rampe ne retombe qu'à moitié** | zone ralentissante en tirant immobile |
| **Canon laser** | seuil de chaleur +25 % | refroidit 2× plus vite | **chaleur haute = +30 % dégâts** | la surchauffe déclenche une nova |
| **Tesla** | +1 rebond | rétention 12 % au lieu de 28 % | **+2 rebonds, retour sur cible déjà touchée** | rebonds entravants, arcs partant des morts |
| **Lame tournoyante** | rayon +20 % | les coups repoussent | **second arc en sens inverse** | tuer prolonge et accélère le balayage |
| **Fusil de siège** | +2 au chargeur | recharge −35 % | **le dernier obus fait ×2** | recharge instantanée après un kill |
| **Fusil de précision** | portée +25 % | +1 perforation | **×2,5 sur cible non touchée depuis 3 s** | le tir marque la cible pour les alliés |
| **Railgun** | charge −30 % | +1 charge en réserve | **traînée persistante 1 s** | la charge se garde en se déplaçant |

**Trois effets de bord, tous voulus :**

- **le palier 3 est systématiquement celui qui corrige la faiblesse boss.** Le
  joueur qui investit répare lui-même son arme — c'est le rôle d'un arbre de
  progression ;
- **la famille de l'arme portée est garantie dans le pool**, celles des autres
  armes en sont retirées : plus de manche condamnée par un tirage qui ne coopère
  pas ;
- ce sont **les seules cartes du catalogue qui ne peuvent jamais faire doublon**,
  puisque chacune n'existe que dans le contexte d'une arme.

---

## 6. Déblocage

Trois armes proposées au départ, **le tir standard toujours parmi elles** (repli
sûr pour un débutant), et **une relance** par manche.

| haut fait | débloque | difficulté |
|---|---|---|
| 90 s cumulées sans se déplacer | canon d'assaut | calme |
| 150 ennemis tués à moins de 4 m | lame tournoyante | calme |
| 3 min consécutives sans subir de dégât | canon laser | normal |
| 400 ennemis en une manche | tesla | normal |
| un segment en moins de 60 tirs | fusil de siège | normal |
| 200 ennemis tués à plus de 12 m | fusil de précision | normal |
| 5 ennemis d'un même tir | railgun | normal |

**Deux règles :**

- **chaque haut fait enseigne l'arme qu'il débloque.** « 150 ennemis à moins de
  4 m » prépare la lame ; « 5 ennemis d'un même tir » prépare le railgun. Le
  joueur qui l'obtient sait déjà comment la jouer ;
- **aucune arme ne se débloque en cauchemar.** Cauchemar est conçu pour un compte
  complet ; y placer une arme signifierait que personne n'y accède avant des
  dizaines de manches. Cauchemar donne du prestige — titres, cadres — jamais de
  la puissance.

---

## 7. Par où commencer

Quatre armes suffisent à valider le système, choisies pour couvrir les quatre
axes de gameplay **et** les deux contextes :

| arme | axe couvert | pourquoi celle-ci |
|---|---|---|
| **Canon d'assaut** | mouvement | la plus transformatrice — elle inverse la doctrine de fuite |
| **Canon laser** | ressource | la ressource qui se lit dans les deux sens |
| **Tesla** | visée | la plus différente à jouer, et le cas-test de la conversion boss |
| **Lame tournoyante** | distance | l'inverse total du jeu actuel |

Avec le tir standard et les trois armes existantes : **huit armes**, dont trois
proposées au départ, et **16 cartes de famille** à écrire au lieu de 40.

Si les conversions boss tiennent en test, le reste s'ajoute sans risque. Sinon,
on l'aura appris sur quatre armes et non sur dix.

### Deux chiffres à surveiller en premier

- **le canon d'assaut à 160 DPS** immobile est le plus haut du lot. C'est voulu,
  mais c'est la première valeur à mesurer ;
- **le laser et le railgun partagent la perforation illimitée.** Leur différence
  tient au rythme — continu contre charge — et il faudra vérifier en test que ça
  suffit à les distinguer.

---

## 8. Identité visuelle et sonore

**Le critère qui gouverne toute cette section :**

> Un allié doit identifier ton arme **d'un bout à l'autre de l'écran, sans voir
> ton personnage**, uniquement au tir.

À quatre joueurs et six cents ennemis, c'est aussi une information de jeu : savoir
qui porte le laser dit qui tient la ligne.

### 8.1 La règle de budget sonore

Reprise de la hiérarchie du plan ressenti : **le budget de retour d'un événement
est inversement proportionnel à sa fréquence.**

| intervalle | budget par tir | conséquence |
|---|---|---|
| 0,11 s (canon d'assaut) | **minimal** | un son sec et court, sinon c'est un mur de bruit |
| 0,16 s (tir standard) | faible | la référence |
| 0,30-0,40 s (tesla, lame) | moyen | on peut donner de la matière |
| 0,55-0,80 s (siège, précision, railgun, grenades) | **élevé** | chaque tir est un événement, il doit peser |
| continu (laser) | nappe modulée | pas de « tir », un timbre qui évolue |

C'est ce qui interdit de donner au canon d'assaut la détonation du fusil de
siège : à neuf tirs par seconde, ce serait illisible.

### 8.2 Fiche par arme

| arme | émission | trajet | impact | son |
|---|---|---|---|---|
| **Tir standard** | petit éclair au canon | trait court | étincelle | claquement sec, bref |
| **Canon d'assaut** | gerbe continue **qui s'intensifie avec la rampe** | traits rapides et serrés | poussière | crépitement rapide, **hauteur qui monte avec la rampe** |
| **Canon laser** | point brillant permanent | **faisceau double couche** : cœur clair fin + halo large additif | brûlure au point de contact | nappe continue, **timbre qui se dégrade à mesure que la chaleur monte** |
| **Tesla** | arc au départ | **tracé par déplacement de point milieu**, branches mortes | flash bref sur chaque cible | crépitement irrégulier, hauteur montant avec le nombre de rebonds |
| **Lame tournoyante** | arc lumineux qui balaie | traînée en arc qui persiste 0,2 s | choc net, léger recul de la cible | souffle grave, sans transitoire dur |
| **Fusil de siège** | forte lueur + **recul visible du personnage** | obus lent, visible à l'œil | explosion 60 px | détonation lourde à trois couches + douille éjectée |
| **Fusil de précision** | éclair fin et long | **trait fin persistant 0,15 s** | perforation, étincelle traversante | claquement sec et aigu, avec écho |
| **Railgun** | **charge visible qui monte** au canon | rail persistant 1 s | traversée, poussière soulevée | montée en charge, puis décharge grave |
| **Dispersion** | flash large | plombs divergents | étincelles multiples | souffle court et sale |
| **Lance-grenades** | bouffée | projectile lent en cloche | souffle 110 px | *pop* au tir, détonation à l'impact |

**Trois signatures suffisent à distinguer une arme** : la forme du trajet, la
couleur dominante, et le rythme sonore. Une arme qui ne se distingue que par ses
dégâts n'a pas d'identité.

### 8.3 Les jauges de ressource

Quatre armes ont une ressource. **Une ressource invisible est une ressource
subie** — chacune a besoin d'un affichage, et toutes au même endroit.

| arme | ce qu'on affiche | où |
|---|---|---|
| canon laser | **chaleur**, avec un seuil marqué et un changement de teinte à l'approche | sous le réticule |
| fusil de siège | **chargeur** — 6 pastilles qui s'éteignent, plus une barre de recharge | idem |
| railgun | **charge** en cours, avec un éclat au moment où elle est pleine | idem |
| canon d'assaut | **rampe** — un anneau qui se remplit autour du personnage | sur le personnage |

La rampe du canon d'assaut est le cas particulier : elle se lit **sur le
personnage** et non sous le réticule, parce qu'elle dépend du déplacement. Le
joueur doit voir sa position et sa rampe dans le même regard.

### 8.4 Ce que les cartes de famille doivent montrer

Une carte de famille qui ne se voit pas ne se ressent pas. Chaque palier doit
changer quelque chose à l'écran :

| arme | ce qui change visuellement au fil des paliers |
|---|---|
| tesla | **le nombre d'arcs visibles** — c'est le palier le plus lisible du jeu |
| canon d'assaut | l'anneau de rampe se remplit plus vite, et vire à une seconde teinte au plafond |
| canon laser | le faisceau **épaissit**, et la nova du palier 4 remplace la coupure |
| lame | un **second arc** en sens inverse, immédiatement visible |
| fusil de siège | le dernier obus du chargeur part avec une lueur distincte |
| fusil de précision | la traînée persiste plus longtemps, la marque alliée s'affiche sur la cible |
| railgun | la traînée du rail devient permanente 1 s |

### 8.5 Le retour de touche par arme

Le retour existant (flash blanc sur l'ennemi touché) reste **commun à toutes les
armes** : c'est la grammaire de base, elle ne doit pas varier.

Ce qui varie, c'est la **particule d'impact** — étincelle pour le tir standard,
brûlure pour le laser, éclat bleu pour le tesla, poussière pour le railgun. Trois
ou quatre sprites d'atlas suffisent, tous générables proceduralement.

⚠ **Ne pas donner de couleur de flash différente par arme.** Le flash de touche
sert déjà à distinguer **qui** tape (couleur d'allié). Deux informations sur le
même canal en annuleraient une.

---

## 9. Le principe de conception

Une erreur courante quand on ajoute des armes : les différencier par leur
**projectile** (rapide/lent, un/plusieurs, perforant/explosif). On obtient alors
dix armes qui se jouent pareil — on vise, on tire, on recule.

> **La variété ne vient pas du projectile. Elle vient de ce que l'arme exige de
> ton corps et de ton attention.**

Quatre axes, et ce sont eux qu'il faut répartir : **le mouvement** (dois-je
m'arrêter, bouger ?), **la ressource** (qu'est-ce que je gère en plus de la
horde ?), **la visée** (où dois-je regarder ?), **la distance** (où dois-je me
tenir ?).

Et une contrainte qui a servi de filtre à toute la sélection :

> **Aucune arme n'ajoute une entrée, un bouton ou un geste.** On vise et on
> maintient le tir, exactement comme aujourd'hui. C'est l'arme qui se comporte
> autrement, pas le joueur qui apprend une manipulation.
