# 01 · Le mini-boss

## Ce qu'il est

Un **ennemi**, pas un `this.boss`. Entre l'élite et le boss. Il joue sur la map
normale, jamais dans une arène de boss.

`_spawnQuarry()` en est déjà le squelette : formule du boss sans le terme de
puissance, à 80 %, taille ×2,5, vitesse ×0,72, `noExec = 1`. Il lui manque un
lieu, des verbes, une récompense et un cycle de vie.

## L'échelle, mesurée

PV effectifs en normal, avec la puissance médiane relevée :

| minute | fantassin | élite colosse | proie actuelle | boss médian |
|---|---:|---:|---:|---:|
| 15, solo | 121 | 1 634 | 2 415 | 6 882 |
| 15, à 4 | 121 | **1 634** | 7 982 | 22 750 |

**Les PV d'élite ne dépendent que du temps ; ceux du boss portent `crowd^1,15`.**
« Entre l'élite et le boss » est donc deux positions différentes selon l'effectif,
et à quatre la bande basse est vide.

**Exposant retenu : `crowd^0,6`.** Il reste entre les deux dans les deux cas. À
confirmer par la mesure, pas par le raisonnement.

## Le suivi de puissance, avec limite

`bossPower()` fait déjà exactement ce qu'il faut :

```js
if (power <= CFG.BOSS_POWER_KNEE) return power;              // seuil 2,5
return CFG.BOSS_POWER_KNEE + CFG.BOSS_POWER_K * (power - CFG.BOSS_POWER_KNEE);
```

En clair : la cible suit la puissance du joueur jusqu'à un **seuil**, puis ne la
suit plus qu'à **la moitié**. Une build deux fois plus forte ne rend la cible
qu'une fois et demie plus grosse.

**La proie actuelle n'utilise pas ce terme du tout** — elle ne suit rien et fond
en fin de manche. Le mini-boss l'utilise avec **son propre seuil et sa propre
fraction**, tous deux plus bas que ceux du boss.

**La cible se règle en temps d'abattage, pas en points de vie.** `mesureTTK`
existe.

## Le cycle

```
CONSTRUCTION (graine)
  → table figee : n mini-boss, chacun { instant, position, type }

APPARITION
  → pose au sol, DORMANT
  → message vague, ALERT_INFO : « une menace est apparue »
  → fenetre de PRESENCE demarre

REVEIL   degats recus (_damage) OU joueur a moins de R (_nearestPlayer)
  → fenetre de presence annulee
  → fenetre de COMBAT demarre, RECHARGEE a chaque coup encaisse
  → verbe actif, dans sa zone

SORTIE
  ├── abattu              → loot + eclats, JAMAIS d XP
  ├── presence expiree    → retrait silencieux (occasion manquee)
  ├── combat expire       → retrait annonce (echec)
  └── laisse rompue       → il rentre, RECUPERE SES PV, se rendort
```

**La laisse.** Il garde sa zone. Si on s'éloigne trop, il rentre **et récupère ses
points de vie**. Ça interdit de l'attirer dans une zone de farm confortable,
empêche de l'user en plusieurs passages, et augmente le risque d'échec.

Trois points à écrire avec soin :

- le **rayon de laisse** se mesure depuis son point d'apparition, pas depuis le
  joueur le plus proche — sinon deux joueurs se relaient et le promènent ;
- la **régénération doit être visible** : retour rapide mais pas instantané, corps
  qui marche en sens inverse. Sinon le joueur ne comprend pas pourquoi la barre est
  repartie en haut ;
- le **retour au sommeil réarme la fenêtre de combat, pas la présence**. On peut
  retenter tant qu'il est là ; on ne rallonge pas son séjour. L'échec coûte donc du
  **temps**, et l'occasion peut se refermer pendant qu'on se soigne.

## On ne le montre pas

Pas de flèche, pas de marqueur, pas de minicarte. **On tombe dessus.** Le filtre
de vue du snapshot devient le comportement voulu : rien à changer côté réseau.

Le message est **vague** — pas de direction, pas de distance, pas de nom — et au
niveau `ALERT_INFO`, pas `ALERT_WARN` : le canal WARN est celui des choses qui
affectent le joueur maintenant.

**Le risque à surveiller** : un mini-boss qui n'attire pas, ne se signale pas et
disparaît peut n'être **jamais** rencontré. Le levier honnête est la **fenêtre de
présence** — généreuse, plusieurs minutes. Il ne vient pas à vous, il dure assez
pour que votre trajet le croise. Le placement peut aussi être biaisé vers ce qui
attire déjà (cristaux, bornes).

## Ses verbes, et la contrainte qui les borne

`ATK_CFG` est catégorique : *« le préavis de la horde se porte sur le corps, celui
du boss sur le SOL. Le canal du télégraphe au sol appartient au boss et ne se
partage pas, sans quoi une arène à 200 corps n'a plus de sol lisible. »*

Un mini-boss sur la map normale **ne peut pas** poser de cercle d'annonce. Il lui
reste trois canaux, tous déjà implémentés : la **posture** (`windup`,
`ATK_CFG.WARN = 0,5 s`, `VUE_MAX = 8`), le **sol persistant** (comme le saboteur,
`SOL_HORDE`), l'**aura**.

Quatre esquisses, toutes constructibles avec le vocabulaire existant :

- **le Bélier** — `DASH` long qui ne s'arrête pas au contact : esquiver le fait
  s'encastrer dans un obstacle et ouvre une fenêtre. `_encastre(b, bord)` existe
  pour le boss et est de la géométrie pure ;
- **le Réacteur** — `egideRadius` très large, `egideShield` élevé : toute la horde
  autour est cuirassée. Il ne blesse presque pas. « On le tue d'abord ou on
  subit » ;
- **le Fondeur** — verbe du saboteur poussé : zones persistantes qui
  **s'accumulent**. Il rend lentement une zone de farm impraticable ;
- **le Chœur majeur** — aura large qui protège la horde tant que plusieurs joueurs
  sont dedans. Le seul qui produise une décision de placement, et le seul qui
  demande une variante solo.

## Son dessin

`verifierSilhouettes()` refuse deux corps qui se ressemblent sur cinq axes, et
avec treize corps la marge est mince — porte-bouclier et chœur sont déjà la paire
limite.

La taille ×2,5 aide mais ne suffit pas : un mini-boss qui n'est qu'un colosse
zoomé se lit comme un bug d'échelle. **Piste** : aucun des treize corps n'est
creux, segmenté ou asymétrique. Le générateur est le seul anneau, et il est le
corps le mieux séparé du roster.

## Ce qu'il reste à décider en écrivant

- combien par manche (deux à quatre) ;
- **compte-t-il dans `_enemyCap()` ?** `_spawnEnemy` refuse au-delà du plafond ; un
  mini-boss bloqué par le plafond de horde serait absurde. Il faut l'exempter ou
  lui réserver sa place ;
- **que se passe-t-il si un boss arrive ?** Deux menaces nommées simultanées, c'est
  la lisibilité perdue. Il se retire, se met en pause, ou le boss attend ;
- `EV_CHASSE` est **redéfini**, pas retiré : son index circule.

## Critère d'acceptation

1. Deux manches de même graine ont les mêmes mini-boss, aux mêmes instants, aux
   mêmes endroits.
2. **Un retrait ne passe pas par `_killEnemy()`** : ni XP, ni kill compté, ni haut
   fait, ni butin. Vérificateur explicite, `this.xp` et `totalKills` comparés.
3. Le temps d'abattage médian tient dans une fourchette écrite, sur les trois
   modes et les quatre effectifs — `mesureTTK`.
4. Un mini-boss ignoré disparaît sans rien annoncer ; un combat abandonné annonce.
5. `verifierSilhouettes()` reste vert avec les nouveaux corps.

## Nature de la tâche

**Fil principal.** Le cycle de vie touche cinq transitions et deux points de
passage uniques ; les verbes se composent d'existant mais leur réglage est du
jugement.
