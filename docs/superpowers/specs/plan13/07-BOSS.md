# Survivor LAN — le boss change le monde

**Le lot 6.** Un boss ne doit pas seulement apparaître dans l'arène : il doit
la **prendre**.

---

## Pourquoi c'est presque gratuit

Tout ce qu'il faut piloter existe déjà et se recalcule à la demande :

| levier | où | recalcul |
|---|---|---|
| teinte du sol | `sol` (`stage.js`), composé par `teinter(decor, biome)` | `refreshSol()` |
| vignettage | `decor.vignette`, `.vignetteFrom`, `.pulse` | `setVignette(null)` invalide, `drawVignette()` recuit |
| ambiante de lumière | `lumiere.js` (lot 3) | par image |
| atmosphère | `champ()` (lot 5) | par image |

Ce sont **des nombres**. Un profil de boss est un petit objet, et l'application
est une interpolation. Aucune structure nouvelle.

Le resserrement de l'arène à une vue est déjà en place (`state.bounds`,
`_teamCentroid`) : le monde se referme physiquement, il ne manque que la couleur.

---

## Le profil

Un boss déclare, dans `BOSS_SKIN` (`palette.js:219`) qui existe déjà :

```
ambiante   la couleur de la lumiere ambiante vers laquelle on tire
sol        la teinte du sol
vignette   l'amplitude, et si elle pulse
atmo       le champ ancre a l'arene (cendre, poussiere, energie)
```

Absent = pas de prise sur le monde. La table est **append-only** comme toutes les
tables exportées, et `BOSS_SKIN` est déjà indexée par `kind`.

---

## La transition

**C'est le seul point délicat du lot.** Une bascule instantanée de la couleur du
sol se lit comme un bug de rendu, pas comme une entrée en scène.

| moment | durée | ce qui se passe |
|---|---|---|
| **annonce** | ~1,2 s | l'ambiante descend, le vignettage se ferme. Le sol ne bouge **pas** encore. |
| **prise** | ~0,8 s | la teinte du sol glisse, l'atmosphère démarre |
| **rupture de barre** | instantané puis retour | une pointe d'ambiante, courte |
| **mort** | ~1,5 s | tout revient au profil de biome |

`bossAnnounce` (`net/interp.js`) porte déjà l'horodatage de l'annonce, et
`lastBossPhase` celui du changement de phase. La transition lit ces deux horloges
— elle n'en ouvre pas une troisième.

**Le sol arrive en second, et c'est délibéré** : la lumière change avant la
matière. On sent l'arrivée avant de la voir, ce qui est l'ordre dans lequel une
menace se manifeste.

---

## Ce que ça donne, concrètement

| boss | prise sur le monde |
|---|---|
| **Ravageur** | l'ambiante chute, la vignette se ferme, ambre profond — l'arène devient une fosse |
| **Matriarche** | pulsation lente de l'ambiante, synchronisée sur ses poches |
| **Métronome** | l'ambiante **bat**, à la vitesse de ses anneaux |
| **Oracle** | le sol se désature, la vignette s'ouvre — trop de visibilité, pas assez |
| **Jumeaux** | deux ambiances froides, une par corps, qui se mélangent selon leur écart |
| **le final** | l'**absorption** : l'ambiante est aspirée vers lui, le reste du sol s'éteint |

Chacun rejoue le verbe que sa silhouette dit déjà (`RENDU.md`, « *chaque boss
rend le coup dans son propre verbe* »). Le monde ne fait pas un effet en plus :
il répète le boss.

---

## Les garde-fous

1. **Un télégraphe ne perd jamais de contraste.** Le profil pilote l'ambiante,
   qui pilote la passe `multiply` du lot 3, qui ne touche que le sol. Un
   télégraphe est dessiné après. Par construction.
2. **La barre de PV, les marqueurs et les annonces ne bougent jamais.** Ils sont
   sur `#cv` et dans le HUD DOM.
3. **Pas de dérive chromatique.** Le §1 du brief l'interdit : rouge et bleu
   froid restent des accents contrôlés, jamais une saturation d'écran.
4. **Le profil s'annule à `_killBoss()`**, en même temps que les bounds se
   rouvrent. Une manche qui garde la couleur d'un boss mort est un bug d'état.

---

## Critères de sortie

1. Une capture pendant un boss et une capture hors boss sont **immédiatement**
   distinguables, sans lire le HUD.
2. Aucune mécanique n'est moins lisible pendant la prise. Vérifié sur les six
   boss, mécanique par mécanique.
3. La couleur revient entièrement à la mort du boss.
4. Le coût par image est nul hors transition — un profil appliqué est une
   constante, pas un calcul.
