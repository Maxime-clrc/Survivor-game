# Survivor LAN — plan 17 : le HUD au niveau de l'arène

Les plans 13 à 16 ont amené le **monde** à un niveau de finition : lumière,
matière de sol, semis, silhouettes de bloc, dangers diégétiques, quatre lieux
réellement distincts. Le HUD, lui, n'a pas bougé de forme depuis qu'il existe.
Il est correct — il est même déjà optimisé, agrégé et memoïsé — mais il se lit
comme une **liste de valeurs posée sur un jeu**, pas comme l'instrumentation de
la machine qu'est l'arène.

Ce plan ne change **aucune règle de jeu**. Rien dans `shared/game_state.js`,
rien dans le protocole : l'audit ci-dessous établit que **toute** information
nécessaire est déjà chez le client.

---

## 1 · Ce qui est déjà fait, et qu'on ne réécrit pas

| acquis | où |
|---|---|
| écriture DOM conditionnelle (`setText`/`setWidth`/`setStyle`/`setHidden`/`setClass` + table `memo`) | `hud.js` |
| oubli de la table `memo` au changement de langue | `hud.js`, `onLangChange` |
| fantôme de dégâts sur **toutes** les barres, un seul point de passage | `barGhost` / `setGhost`, `RESIDU_MS = 300` |
| graduations tous les 25 PV (`--tick`) | `setTicks` |
| réconciliation des pastilles **par clé** (entrée/sortie animées, pas de reconstruction) | `reconcileBadges` |
| chiffres de dégâts agrégés + fusion spatiale à 34 px / 420 ms, plafond 40 nœuds | `hudDamage` |
| une seule consigne à la fois, et le bandeau part **avant** la résolution | `applyAlert` (`net/interp.js`, `dur - 250 ms`) |
| **tous** les sons d'état sont déjà branchés sur le canal d'événements | `render/fx.js` ← `events.js` |
| retour d'appui sur une compétence en recharge (`pipPress`) | `core/state.js` + `.pip.press` |
| durée d'un bonus **déduite** de `CFG.BUFF_TIME` et du front montant du bit | `updateBuffs` |
| le bandeau de haut fait attend la fermeture de l'écran de cartes | `updateHautsFaits` |

**Conséquence directe : ce plan ne rajoute pas un seul son.** `events.js` émet
déjà `bouclierPose`, `bouclierTouche`, `bouclierBrise`, `niveau`, `barre`,
`aterre`, `releve`, `blesse`, `soigne`, `segment`, et `fx.js` les fait sonner.
Le HUD **s'abonne** à ce canal pour ses états ; il n'en ouvre pas un second.

---

## 2 · L'audit — relevé sur le code, pas sur la capture

`o` = présent · `~` = présent mais mal placé ou mal calibré · `x` = absent

| information | existe | visible | rang réel | aujourd'hui | demain |
|---|---|---|---|---|---|
| PV / PV max | `p.hp`, `p.maxHp` | o | 1 | jauge 22 px, texte **dans** la barre | bas gauche, ligne dédiée |
| bouclier | `p.shield` | ~ | 1 | hachure **par-dessus** les PV + nombre dans la même phrase | **ligne séparée**, au-dessus |
| réserve de bouclier | `mods.shieldPool` (déductible) | x | 1 | normalisé sur `CFG.SHIELD_POOL = 80` — **faux** (§3.1) | normalisé sur la vraie réserve |
| état critique | dérivé (`k < 0.30`) | o | 1 | pulsation de la jauge 620 ms | cadre + vignette, pas de clignotement |
| états (vuln, brûlure, entrave, sentence) | `p.statuses`, `p.vuln`, `p.doom` | ~ | 1 | **coin haut droit**, 13 px, dans ma ligne d'équipe | bandeau à côté des vitales |
| effets de build (lames, givre, drone, essaim…) | `ownedCounts` | o | 3 | pastilles bas gauche | inchangé, rang baissé |
| bonus ramassés | `p.buffs` (5 bits) | o | 2 | pastilles + balayage de durée | inchangé |
| esquive | `p.dashCd`, `c.dashCd` | o | 2 | pastille ESP | cellule de mobilité |
| compétences 1 et 2 | `p.cd1`, `p.cd2`, `p.skillFlags` | o | 2 | pastilles A / E | cellules d'action |
| 3ᵉ compétence | `p.cd3`, `p.skill3` (palier 0-3) | o | 2 | pastille barrée quand absente | socle verrouillé, pas de trou |
| réserve d'arme (rampe, chaleur, charge, chargeur) | `p.armeRes` | o (monde) | 2 | anneau / jauge **autour du joueur** | **inchangé — pas de doublon** (§3.6) |
| munitions du siège | `p.armeRes × n` | o (monde) | 2 | pips autour du joueur | inchangé |
| niveau d'équipe | `v.teamLevel` | o | 3 | texte dans la jauge de PV | bloc de progression |
| progression d'XP | `v.teamProgress` | o | 3 | barre de 4 px | inchangé de rang, retravaillée |
| segment (1-6) et son nom | `v.segment` | o | 3 | `Installation · 1/6 · Usine · Pluie` | en-tête de mission, dégressif |
| **vague dans le segment (1-5)** | `v.beat` | **x** | 3 | rien — `beat` ne sert qu'au crescendo | `VAGUE 3 / 5` |
| temps de horde restant | `v.hordeLeft` | o | 3 | `mm:ss` + barre | inchangé |
| événement en cours | `v.event` | o | 2 | remplace le chrono de horde | ligne d'événement propre |
| saturation d'arène | dérivé (`enemyCap`) | o | 4 | `arène 87 %` collé à l'état | témoin, pas une phrase |
| chronomètre de manche | `v.tm` | o | 3 | 29 px haut gauche | inchangé, hiérarchie renforcée |
| kills | `v.kills` | o | 4 | ligne de 13 px | colonne alignée |
| ennemis vivants | `v.enemyList.length` | o | 4 | idem | idem |
| ping | `c.ping` | ~ | 5 | **même rang que les kills** | dernier rang, tabulaire |
| éclats | `p.eclats` | o | 4 | ligne haut gauche, cachée à 0 | bloc de progression |
| difficulté ≠ normale | `c.difficulty` | o | 4 | ligne ambre | inchangé |
| temps ralenti | `v.slow` | o | 4 | ligne violette | témoin d'état |
| équipe : nom, classe, couleur | `lobby`, `p.cls` | o | 2 | glyphe + nom + score | inchangé |
| équipe : PV | `p.hp` | o | 2 | nombre + jauge | nombre + jauge fine |
| équipe : bouclier | `p.shield` | ~ | 3 | hachure superposée | filet séparé sous les PV |
| équipe : états | `p.statuses` | o | 3 | ligne de tags | inchangé |
| équipe : à terre | `p.downed` | o | 1 | tag « à terre » | tag + bord de ligne |
| **équipe : relèvement en cours** | `p.revive` | o (monde) | 2 | arc autour du corps | **+ remplissage de la ligne** |
| **allié hors écran** | `p.x/p.y` (**jamais filtrés**) | **x** | 2 | rien du tout | chevron DOM + distance |
| boss : nom, rang, verbe | `bo.kind`, `bo.index` | o | 1 | en-tête | inchangé, recomposé |
| boss : PV, barres, barre courante | `bo.hp`, `bo.bars` | o | 1 | barre + `×N` + pips | rail de segments + barre |
| boss : phase | `bo.phase` | o | 1 | annonce plein écran | + état dans le cadre |
| boss : palier d'invulnérabilité | `bo.palier` | o | 1 | banque blanche | inchangé |
| boss : emportement | `bo.enrage` | o | 1 | suffixe du nom, clignotant | badge d'état |
| boss : ultime | `bo.ult` | o | 1 | barre + phrase | inchangé |
| boss : métronome | `beatPhase(v.tm)` | o | 1 | quatre témoins | inchangé |
| boss : dégâts que **j'ai** infligés | `v.bossDmg` (`bd`) | o (monde) | 4 | chiffres sur le boss | inchangé |
| alerte de mécanique | canal `alert` | o | 1 | bandeau centre à 30 % | cadre compact, même règle |
| forme de la mécanique | `def.forme` | o | 1 | pastille `::before` | inchangé |
| consigne collective | `mechCollective` | o | 1 | violet | inchangé |
| DPS | `p.damage / v.tm` | o | 6 | ligne du panneau | mode COMBAT |
| 14 statistiques effectives | `fullMods` + méta + reliques | o | 6 | panneau bas droite | mode DÉTAIL, replié |
| provenance des dégâts subis | `p.src` + chute de PV | o | 6 | ventilation en % | mode DÉTAIL |
| haut fait obtenu | `pousserHautFait` | o | 3 | bandeau bas droite | **recouvre le panneau** (§3.2) |
| spectateur, pause, perf | — | o | 4 | inchangés | inchangés |

**Rien à ouvrir dans le protocole.** Les instantanés portent déjà tout ; les
joueurs ne sont **jamais** filtrés par vue (`RESEAU.md`), donc même le chevron
hors écran ne coûte pas un octet.

---

## 3 · Les six défauts réels, par ordre de nuisance

### 3.1 · Le bouclier est normalisé sur une constante, pas sur la réserve

`updateShield` fait `k = shield / CFG.SHIELD_POOL`, avec `SHIELD_POOL = 80`.
Or la réserve de base est **zéro** : elle vient des cartes (+12, +30, +45, +60)
et peut être dépassée par le Rempart et le mode soin
(`shieldPool + BULWARK_SHIELD_CAP`). Un joueur avec une seule carte de bouclier
a une réserve de 12 : **plein, il affiche 15 % de barre.** Un tank sous dôme
dépasse 100 % et se fait écrêter. La superposition n'est pas seulement laide,
elle est **fausse** — et c'est la première chose à corriger, avant tout dessin.

La vraie réserve est déductible chez le client, pour soi **et** pour les alliés :
`ownedCounts(id)` existe pour tous les joueurs (`loadouts`), `computeMods` est
pur. Coût : une signature de cartes memoïsée, exactement comme `modsSig`.

### 3.2 · Deux blocs occupent le même coin

`#hudStats` est en `right: 16px; bottom: 16px`, `#hudHf` en `right: 24px;
bottom: 24px` sur 320 px de large. Un haut fait obtenu **recouvre** le panneau
de statistiques. Personne ne l'a vu parce que les deux sont optionnels et rares
ensemble ; ça reste un recouvrement non décidé.

### 3.3 · L'information la plus dangereuse est dans le coin le plus froid

Sentence, vulnérabilité empilée, brûlure et entrave **ne s'affichent que dans la
ligne d'équipe**, en haut à droite, en 13 px, à 900 px du regard. Ce sont les
seules données du HUD dont la lecture change ce qu'on fait dans la seconde.

### 3.4 · Deux informations partagent un pixel

Les PV et le bouclier partagent la même jauge ; le nombre de PV et le nombre de
bouclier partagent la même phrase (`93 / 93 pv · 40 bouclier`) ; le niveau
partage la même barre. Trois lectures, une surface.

### 3.5 · La vague n'existe pas à l'écran

`v.beat` circule et ne s'affiche jamais. Le joueur sait dans quel **segment** il
est (sur six, sur 30 minutes) mais pas où il en est **dans** le segment
(cinq vagues de 60 s). C'est le seul palier de progression à l'échelle de la
minute, et c'est celui qui manque.

### 3.6 · Ce qui est déjà bien placé et qu'il ne faut pas déplacer

La réserve d'arme (rampe / chaleur / charge / chargeur) est rendue **autour du
personnage**, là où le regard est déjà. La recopier dans le HUD créerait deux
lectures pour une décision. **Décision : elle reste dans le monde**, et la barre
de compétences ne porte pas de cellule d'arme.

---

## 4 · Le système

### 4.1 · Ce qui ne se négocie pas

- Échelle typographique **13 / 15 / 18 / 22 / 29 / 38 / 50** (`TYPE`,
  `palette.js`). Aucune valeur ad hoc, aucun `px` littéral dans `hud.css`.
- Espacement **4 / 8 / 12 / 16 / 24 / 32 / 48** (`--sp-*`).
- **Rayon 2 px maximum.** Le biseau (`--bevel: 10px`, `clip-path`) remplace
  l'arrondi. `--bevel` et une lueur externe **ne coexistent pas** : un
  `clip-path` clippe le `box-shadow`.
- **Une seule source de couleur** : `shared/palette.js` → `cssVars()` → `:root`.
  Tout token de HUD nouveau s'ajoute dans `HUD` (`palette.js`) et sort par
  `cssVars()`. `tokens.css` reste **sans couleur**.
- **Tout texte passe par `t()` / `tf()`**, français écrit à côté de sa donnée en
  repli, surcharge par clé dans `shared/lang/en.js`.
- **Distances en mètres via `fmtM`** — jamais un nombre de pixels recopié.
- `hud.js` n'importe que `core/state.js`, `icons.js` et `shared/*`. Tout ce qui
  vient d'une couche supérieure entre par une **fonction exportée**
  (`updateHud`, `hudDamage`, `pousserHautFait`, `showHud`, `resetHud`) — le
  plan en ajoute exactement une : `hudEvent(e)`.
- **Aucun canvas, aucun WebGL.** DOM, CSS, pseudo-éléments, `clip-path`,
  `transform`, `opacity`.
- **Aucune écriture DOM si la valeur n'a pas changé** (table `memo`).

### 4.2 · La matière : une gaine, trois épaisseurs

Un seul matériau, décliné par **rang de lecture**, jamais par composant :

| rang | fond | filet | arête d'accent | biseau |
|---|---|---|---|---|
| **1 · vital** | `--bg-void` à 62 % | 1 px `--line-soft` | 2 px, couleur fonctionnelle, côté bord d'écran | coin extérieur |
| **2 · combat** | `--bg-void` à 55 % | 1 px `--line-soft` | aucune | coin extérieur |
| **3 · contexte** | aucun fond | aucun | aucune | — |

Trois marques techniques, et pas une de plus, pour que ça se lise « instrument »
et non « carte » : un **repère d'angle** (deux traits de 6 px), une
**inscription** en 13 px capitales espacées (`--track-caps`) posée dans le
filet, une **graduation** sur les barres. Aucun dégradé décoratif : les seuls
dégradés autorisés sont ceux qui existent déjà — matière de jauge et
remplissage de boss.

### 4.3 · Les primitives

Onze classes, toutes dans `hud.css`, toutes construites sur les tokens :

`.hudPanel` (gaine + rang) · `.hudLabel` (13 px, capitales, `--text-dim`) ·
`.hudValue` (chiffres tabulaires, 700) · `.hudBar` (piste + remplissage +
fantôme + graduation, variantes `--hp --shield --xp --boss --cd --mission`) ·
`.hudPip` (segment de barre de boss / de vague) · `.hudIcon` ·
`.hudChip` (état ou bonus : glyphe + durée) · `.hudCell` (cellule de
compétence) · `.hudAlert` · `.hudRow` (ligne d'escouade) · `.hudMark`
(chevron hors écran).

**Une barre = une primitive.** Aujourd'hui il y a six implémentations de barre
(`#segBar`, `#bossBar`, `.gauge`, `#selfXp`, `#bossUlt`, `.cd`) qui ne partagent
ni leur transition ni leur graduation. Après ce plan, **une**, paramétrée.

### 4.4 · Les six ancrages, et la marge

```
┌─ 24 ─────────────────────────────────────────────────────────┐
│ TÉLÉMÉTRIE            MISSION  ·ou·  BOSS            ESCOUADE │
│ 01:24                 SECTEUR 02 · USINE             ◆ MAX    │
│ KILLS    042          VAGUE 3/5 ▓▓▓▓▓░░░ 2:14        ◆ ALICE  │
│ HOSTILES 018                                                  │
│ PING     38                                                   │
│                                                               │
│                       [ consigne de mécanique ]               │
│                                                               │
│                                                               │
│ ÉTATS ▣ ▣ ▣                                                   │
│ ┌─────────────────┐    ┌────┬────┬────┐ ┌────┐   ┌──────────┐ │
│ │ BC  ▰▰▰▰▰▱  40  │    │ESP │ A  │ E  │ │ 3  │   │ DPS      │ │
│ │ PV  ██████  93  │    └────┴────┴────┘ └────┘   │ 1 284    │ │
│ │ NIV 12 ▓▓▓░░    │                              └──────────┘ │
│ └─────────────────┘                                           │
└───────────────────────────────────────────────────────────────┘
```

Marge de sécurité **24 px** au-dessus de 1400 px de large, **16 px** en dessous.
Aucun texte au contact du bord. Le centre reste vide : la consigne et l'annonce
y passent, rien n'y stationne.

### 4.5 · Le responsive tient au CADRE, pas à la fenêtre

`#frame` fait 16/9 et vaut `min(100%, 100vh × 16/9)` : le HUD est en pixels
d'écran, donc il occupe **proportionnellement plus** de place sur un petit
écran. On ne scale pas le HUD (item 42) : `#frame` devient un conteneur de
taille (`container-type: size`) et `hud.css` porte deux points de bascule.

| palier | `@container` | ce qui change |
|---|---|---|
| large | ≥ 1400 px | tout |
| moyen | 1150-1400 px | libellés de compétence retirés, escouade 190 → 160 px, cellules 44 → 38 px, marge 24 → 16 px |
| petit | < 1150 px | télémétrie réduite au chrono + hostiles, escouade sans filet de bouclier, panneau de détail indisponible (le mode COMBAT reste) |

`container-type: size` exige que la taille de `#frame` ne dépende pas de son
contenu : c'est le cas (`aspect-ratio` + `width`), et les canvas sont en
`position: absolute`.

### 4.6 · Les états du HUD viennent du canal d'événements

Neuf états, une classe sur `#hud`, **aucun** ne déplace un pixel de mise en
page — ils ne peignent que couleur, opacité, `transform` et pseudo-éléments.

| état | source | durée | effet |
|---|---|---|---|
| `NORMAL` | — | — | — |
| `LOW_HP` | valeur (`k < 0.30`) | tant que vrai | cadre du panneau vital + vignette DOM très faible, **période 2,6 s** |
| `SHIELD_BREAK` | `bouclierBrise` | 420 ms | onde sur la ligne de bouclier, la ligne reste en place |
| `SHIELD_HIT` | `bouclierTouche` | 220 ms | extinction de la trame (déjà là) |
| `LEVEL_UP` | `niveau` | 600 ms | balayage de la barre d'XP + `NIVEAU 13` en 18 px, en place |
| `BOSS_ENTER` | `boss` | déjà géré | annonce, inchangée |
| `BOSS_PHASE` | `barre` | 500 ms | segment qui casse dans le rail, puis `BARRE 03 DÉTRUITE` |
| `PLAYER_DOWN` | `aterre` | tant que vrai | ligne d'escouade + panneau vital |
| `PAUSED` | `setPaused` | — | déjà géré |

`fx.js` appelle `hudEvent(e)` dans `handleEvent`, à côté de ce qu'il fait déjà.
**Aucun son ajouté** : ils sonnent tous déjà là.

### 4.7 · Ce que la couleur n'a pas le droit de porter seule

Chaque information garde **une forme** en plus de sa couleur, comme les
marqueurs du monde : bouclier = trame segmentée + glyphe `▰` ; PV = plein +
graduation ; XP = filet de 3 px ; classe = glyphe de compétence 0 ; état =
glyphe de `STATUS_ICON` ; à terre = tag texte ; danger = repère d'angle.
Une capture en niveaux de gris doit rester lisible — c'est le critère.

---

## 5 · Les lots

Un lot = un commit = un bump de patch. Le plan ouvre **0.20.x**.

| lot | version | contenu | critère |
|---|---|---|---|
| **1** | 0.20.0 | **Le matériau et la grille.** Tokens de HUD dans `palette.js`, primitives dans `hud.css`, six ancrages, marges, conteneur de taille et deux paliers, fin du recouvrement `#hudHf` / `#hudStats`. Aucun contenu nouveau, aucune information déplacée. | capture identique en contenu, matière neuve, rien ne se recouvre à 1280×720 |
| **2** | 0.20.1 | **Les vitales.** Bouclier et PV sur deux lignes, normalisation sur la **vraie** réserve (soi et alliés), état critique sans clignotement, bandeau d'états à côté des vitales avec priorité danger → bonus → effets. | réserve 12 pleine = barre pleine ; capture en gris lisible ; `hp=10 %` compris en < 1 s |
| **3** | 0.20.2 | **Les compétences.** Cellules communes esquive / A / E / ultime, recharge lisible sans le nombre, socle verrouillé sans trou, retour d'appui et éclair de disponibilité conservés. | les huit cas de test du §6 |
| **4** | 0.20.3 | **L'escouade.** Lignes recomposées, filet de bouclier séparé, relèvement dans la ligne, **chevrons hors écran** (classe + distance en mètres, plus visibles si à terre ou bas). | un allié à 60 m se retrouve sans regarder la carte |
| **5** | 0.20.4 | **La progression.** Bloc de télémétrie haut gauche (chrono dominant, ping au dernier rang), en-tête de mission avec **la vague**, dégressif après 6 s, XP et niveau dans le bloc vital, éclats rapatriés. | savoir « où je suis » en une fixation ; le nom de lieu ne masque plus rien |
| **6** | 0.20.5 | **Le boss.** Rail de segments, barre courante majeure, phase et emportement comme états du cadre, rupture de barre jouée dans le rail. | `BARRE 3 / 5` compris sans compter les pips |
| **7** | 0.20.6 | **Alertes et états.** Cadre de consigne compact, `hudEvent`, les neuf états, micro-animations bornées. | aucune animation permanente ; aucun décalage de mise en page |
| **8** | 0.20.7 | **La télémétrie optionnelle.** Deux modes (COMBAT : DPS + total ; DÉTAIL : les 14 lignes + provenance), rang le plus bas, absente sans trou. | DPS coupé = aucun vide ; pendant un boss, encore plus discret |

L'ordre est **layout → typographie → couleur → barres → icônes → animations** :
les lots 1 et 2 ne portent aucune animation nouvelle, le lot 7 les porte toutes.

---

## 6 · Les cas de test

Sans suite de tests, on force les états par un script jetable qui pousse des
instantanés fabriqués dans `updateHud`, plus une partie réelle sur un port
dédié pour les états d'événement.

**Vitales** — bouclier 0 / réserve 12 pleine / réserve 12 à moitié / réserve
145 (tank sous dôme) ; PV 100 / 50 / 10 / 0 ; rupture ; recharge en rampe.
**Compétences** — disponible ; recharge 0,4 s ; recharge 45 s ; troisième
absente ; palier 3 ; mode soin actif ; provocation active ; appui refusé.
**Escouade** — 1 à 4 joueurs ; un spectateur ; un à terre ; un en cours de
relèvement ; un hors écran à 20 m et à 90 m ; un déconnecté.
**Progression** — segment 1 vague 1 ; segment 6 vague 5 (crescendo) ; événement
en cours ; arène à 98 %.
**Boss** — 5 barres et 8 barres ; palier ; emportement II ; ultime à 80 % ;
métronome ; rupture de barre.
**Charge** — écran calme, 50, 200 ennemis, explosion de bombe, boss + horde.

---

## 7 · Critère de réussite du plan

Trois questions, posées sur une capture arrêtée à 200 ennemis :

1. **En moins d'une seconde** : combien de PV, ai-je un bouclier, suis-je en
   danger ?
2. **Sans lire un chiffre** : quelles compétences partent maintenant ?
3. **En niveaux de gris** : toutes les réponses précédentes tiennent-elles ?

Et une quatrième, posée sur l'ensemble : le HUD a-t-il l'air d'avoir été dessiné
**en même temps** que la Fonderie et l'Usine, ou posé dessus ?
