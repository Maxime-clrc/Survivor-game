# Survivor LAN — plan 20 : le combat a une matière

Le plan 18 a amené **ce qui bouge** au niveau, le plan 19 **le lieu**. Ce qui se
passe entre les deux — le tir, l'impact, la mort, le souffle — a une architecture
correcte et **quatre trous silencieux** que rien ne signalait.

Ce plan ne touche **ni les dégâts, ni les cadences, ni les portées, ni les
coefficients d'échelle**. `verifierArmes()` et `verifierEquilibreArmes()` doivent
rendre exactement ce qu'ils rendent aujourd'hui. Il ne crée pas de second système
de retour : `shared/feedback.js` reste la fiche, `PALIER` reste le barème,
`VoiceLimiter` reste le mix, `PARTICLE_MAX` ne bouge pas.

---

## 1 · Ce qui est déjà là, et qu'on ne réécrit pas

| acquis | où |
|---|---|
| famille **déduite** d'un champ de mécanique, huit familles | `familleDe()` |
| poids **relevé** sur `interval`, jamais déclaré | `poids()`, `echelleBouche()` |
| bouche par famille, attachée au canon, née à taille max | `BOUCHE`, `drawBouche` |
| silhouette de projectile par arme, **déduite** | `silhouetteArme()`, 7 formes |
| quatre paliers d'impact, décidés par la **cible** | `palierDe()`, `PALIER` |
| dégât continu **muet**, chiffres agrégés à 200 ms | `HIT_CONTINU`, `dmgAgg` |
| matière de mort déduite du comportement | `matiereDe()`, `MATIERE` |
| souffle en couches à constantes de temps distinctes | `spawnBlast()` |
| arc par déplacement de point milieu, 17 Hz, branches | `drawArc()` |
| touche de boss en **part de barre**, en racine | `bossTouche()` |
| clé de limiteur = **famille**, `claim` pour les priorités | `playSound`, `VoiceLimiter` |
| croisement des tables avec les recettes | `verifierFeedback()` |

---

## 2 · Les quatre trous, tous silencieux

1. **La lame balaie toujours vers l'est.** `_lameTir` pose `ang` et `n2` sur son
   effet ; la sérialisation d'`effects` ne porte **que** `[id,x,y,r,k,kind,owner,
   y2,n]`. Le client lit `f.ang ?? 0`. Le seul canal qui dit *où* frappe l'arme
   la plus courte du jeu est mort depuis qu'il existe. Aucune erreur : `??` a
   fait son travail.
2. **Un tir bloqué se lit comme une touche.** Dans `_bulletHitInterne`, la
   seconde garde `e.shieldArc > 0` est **inatteignable** — la première teste la
   même chose et rend `true`. L'effet de blocage n'a jamais été poussé, et
   `hitSeq++` sans dégât rend un `HIT_LEGER` : le porte-bouclier absorbe, le
   joueur voit un coup qui porte.
3. **La scission n'a pas de moment.** Le seul chiffre que le fusil à dispersion
   demande d'apprendre partage son `kind: 14` avec le blocage, le téléport de
   boss et la récolte — et sa seule voix est `impact` transposé. La branche
   `kind === 14` d'`actors.js:993` est **morte** : celle de la ligne 852 la
   précède et fait `continue`.
4. **Trois ressources d'arme sont muettes.** `armeRes` circule déjà (index 36 du
   tuple joueur) et le client le dessine : rampe, charge, chargeur, chaleur. Un
   seul des quatre a une voix. La recharge du siège — 1,8 s où l'arme ne rend
   rien — ne s'entend pas.

---

## 3 · Les lots

Un lot = un commit = un bump de patch. Le plan ouvre **0.23.x**.

| lot | version | contenu | critère |
|---|---|---|---|
| **1** | 0.23.0 | **La matière à l'impact.** `MATIERE` porte ce qu'une créature dit quand on la **touche**, pas seulement quand elle meurt. Le blocage devient un événement. | même compte de particules · `verifierFeedback()` muet |
| **2** | 0.23.1 | **La lame retrouve son arc.** Angle et second tranchant **déduits** du porteur, aucune clef ouverte. Balayage à traînée. | l'arc suit la visée · zéro octet de plus |
| **3** | 0.23.2 | **La scission est un événement.** Son `kind` à elle, son tracé, sa voix. Branche morte retirée. | le fourre-tout `14` ne porte plus la scission |
| **4** | 0.23.3 | **Les ressources parlent.** `routerArme()` : charge du rail, chargeur du siège, rampe de l'assaut. Joueur local seulement. | +0 voix par joueur distant |
| **5** | 0.23.4 | **Le faisceau chauffe.** Instabilité, bouche continue, saturation lisible ; la chaleur pilote plus que la hauteur. | rien ne masque l'écran |
| **6** | 0.23.5 | **La chaîne s'entend.** Le rang du saut voyage sur l'effet ; hauteur et amplitude en sortent. | une chaîne de 3 ne coûte pas 3 voix |
| **7** | 0.23.6 | **Les souffles ont une échelle.** Débris directionnels, double onde au-delà d'une magnitude, palette chaude au cœur. | `COMBAT.flash` inchangé |
| **8** | 0.23.7 | **Le banc.** Script de mesure par arme et par densité, contrôles rejouables ajoutés à `verifierFeedback()`. | 50/100/150/200 corps mesurés |

---

## 4 · Ce que le plan ne fait pas

- **Aucun hitstop de plus.** Il reste aux barres de boss et à la mort du boss.
  Dans un survivor la fluidité du déplacement **est** le jeu, et `CRIT_PUNCH`
  porte déjà la réponse d'un critique — sur la **cible**, où elle se lit dans une
  foule, et non sur la caméra.
- **Aucun tressaillement de plus.** Il reste aux détonations.
- **Aucune couleur d'arme à l'impact.** Quatre canaux disent quatre choses : la
  bouche dit l'arme, le projectile ce qu'elle envoie, l'impact ce que ça a coûté
  **à la cible**, la mort de quoi elle était faite. La matière du lot 1 est un
  attribut de la **cible**, pas de l'arme — elle ne redit rien.
- **Aucun `PARTICLE_MAX` relevé.** La qualité vient de la trajectoire et de la
  durée, pas du nombre.
