# Audit des cinq boss existants

Grille passée sur `BOSS_ROSTER`. Huit contrôles, issus des piliers.

## Vue d'ensemble

| boss | verbe | archétype spatial | mécaniques marquantes | `hpMul` |
|---|---|---|---|---|
| **Ravageur** | positionnement | mobile | damier, couronne, constriction, quadrant | 1,00 |
| **Matriarche** | gestion de cibles | mobile | grappes, nourriciers, prison, proximité | 0,85 |
| **Métronome** | mouvement | mobile | exaflare, appâts, dérive, sanctuaires | 0,90 |
| **Oracle** | cohésion | mobile | rassemblement, dispersion, regard, tours, dénombrement | 0,95 |
| **Jumeaux** | séparation | mobile | croix, lien, prison, damier | 1,00 |
| *Amalgame* | synthèse | mobile | synthèse, entrelacs, sceau (8 barres) | 1,00 |

## Le résultat, contrôle par contrôle

| # | contrôle | verdict |
|---|---|---|
| 1 | archétype spatial unique | ❌ **les six sont mobiles** |
| 2 | trois mécaniques marquantes | ✅ chacun en a 3 à 5 |
| 3 | courbe sur cinq barres | ⚠️ la structure existe (`base` + 4 `unlock`) mais **les couches tardives ne se jouent jamais** — voir lot A |
| 4 | transitions verrouillées + bouclier | ❌ la banque annule le verrouillage, aucun bouclier |
| 5 | grammaire respectée | ⚠️ 31 mécaniques, **aucune convention de forme ni de couleur** |
| 6 | au moins une mécanique coopérative | ✅ `minPlayers` + `fallback` sont écrits et corrects |
| 7 | échec individuel en calme | ❌ pas de distinction par difficulté |
| 8 | rien d'exclusivement sonore | ⚠️ à vérifier, le Métronome est le cas à risque |

**Deux bonnes surprises.** Le contrôle 6 passe : `adaptMech(id, alive)` avec
repli, et `towerCount(alive)` qui adapte les tours à la table, c'est du travail
sérieux et c'est déjà là. Le contrôle 2 aussi : les boss ne sont pas des sacs à
PV, ils ont un vocabulaire.

**Le contrôle 1 est le seul échec structurel.** Et il explique la sensation que
tu décris mieux que le nombre d'attaques : quand cinq boss occupent l'espace de
la même façon, le joueur les vit comme **un seul boss avec cinq jeux de
télégraphes**. Le verbe les différencie sur le papier ; l'espace, non.

---

## Fiches — ce qu'il faut faire de chacun

### Ravageur — *positionnement* · « lis le sol »
Le plus proche de sa forme finale. `constriction`, `couronne` et `quadrant`
travaillent déjà l'espace.

**Archétype à lui donner : constricteur.** Il l'est à moitié — `SHRINK_STEP`,
`SHRINK_MIN: 0.45`, `CROWN_DPS` existent. Le pousser jusqu'au bout : l'arène se
referme sur toute la durée du combat et **ne se rouvre pas**. Il devient le boss
qui punit la lenteur sans compte à rebours.
*Action : lot C, promotion de la constriction du statut de mécanique à celui
d'identité.*

### Matriarche — *gestion de cibles* · « choisis ta cible »
`grappes`, `nourriciers` (qui la soignent), `prison`. Bonne identité, verbe clair.

**Archétype à lui donner : diffus.** C'est la candidate évidente pour le
« parasite » : elle a déjà des rejetons et un lien nourricier. La pousser vers
« la horde est son corps » — elle se soigne de la horde environnante, et le seul
moyen de la blesser est de nettoyer autour d'elle.
*Action : lot C.*

### Métronome — *mouvement* · « ne t'arrête jamais »
`exaflare` (7 pas, 0,32 s d'intervalle), `appat`, `derive`. Le rythme est déjà
dans les constantes.

**Archétype : mobile** — c'est lui qui garde cet archétype, il le mérite.
⚠ **Contrôle 8 :** c'est le boss dont l'information est la plus temporelle. Il
lui faut un **métronome visuel** — quatre témoins sous la barre, un anneau qui se
contracte sur le temps. L'audio ne doit qu'accélérer la lecture.
*Action : lots B et C.*

### Oracle — *cohésion* · « jouez ensemble »
`rassemblement`, `dispersion`, `regard`, `tours`, `dénombrement`. **C'est déjà le
meilleur boss coopératif du jeu**, et de loin.

**Archétype à lui donner : ancré.** C'est le candidat idéal pour ton idée de boss
posé au bord : un Oracle immobile, encastré, qui ne fait qu'observer et dicter.
Ses mécaniques n'ont **aucun besoin** qu'il se déplace — elles se jouent sur le
sol et entre les joueurs. L'immobiliser lui donnerait une identité spatiale
immédiate sans toucher une seule de ses mécaniques.
*Action : lot C. C'est la transformation la moins coûteuse et la plus payante du
plan.*

### Jumeaux — *séparation* · « séparez-vous »
Deux corps, `TWIN_HEAL_RANGE: 400`, `TWIN_GAP: 520`, `croix`, `lien`, `swap`.

**Archétype : multiple.** Il l'a déjà. À renforcer plutôt qu'à changer : porter
le soin mutuel au premier plan (aujourd'hui `TWIN_HEAL: 0.008`, très discret) et
rendre les liens **visibles en permanence**, pas seulement pendant `MECH_LINK`.
Le joueur doit voir *pourquoi* il faut les séparer.
*Action : lots B et C.*

### Amalgame — *synthèse* · 8 barres
Le final. `synthese`, `entrelacs`, `sceau`, et `_deferAtk` qui pose une couche à
chaque rupture — **la seule implémentation correcte du palier dans le dépôt**.

**C'est le modèle à généraliser** (lot A) : ce que l'Amalgame fait pendant ses
paliers, les cinq autres doivent le faire.
*Action : devient le boss final de `normal`. Voir lot E pour `calme` et
`cauchemar`.*
