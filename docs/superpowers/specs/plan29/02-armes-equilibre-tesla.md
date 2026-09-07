# 02 · Armes — l'écart mesuré, et la ligne de vue

## 2a · Ce que le vérificateur du dépôt mesure aujourd'hui

`verifierEquilibreArmes(3, 10)` — 3 manches de 10 minutes, mesure réelle :

```
laser     : 122 % délivré pour une cible de 106 % (difficulté 2)
dispersion:  97 %                       106 %     (difficulté 2)
railgun   :  95 %                       110 %     (difficulté 3)
grenade   :  92 %                       104 %     (difficulté 1.5)
siege     :  96 %                       106 %     (difficulté 2)
precision :  99 %                       106 %     (difficulté 2)
```

Standard, assaut, tesla, lame passent. **Ce vérificateur est rouge : il doit
être vert avant tout ajout de contenu d'arme.**

### Lecture

- **Le laser est le seul dépassement du catalogue (+16 points).** Aucune autre
  arme n'est au-dessus de sa cible. C'est l'anomalie à traiter en premier.
- **Le siège sous-délivre (−10).** La prémisse « le siège est extrêmement fort
  contre les boss, peut-être trop » ne survit pas à la mesure sur manche
  complète. Deux hypothèses restent ouvertes et se départagent par une mesure
  ciblée, pas par un nerf :
  - *H1* : il domine réellement sur boss mais paie tellement en horde que le
    net est négatif → le correctif est un **buff horde**, pas un nerf boss ;
  - *H2* : la perception vient du burst visible (obus + souffle sur le même
    corps, `conversionBoss` = 1 + 0,5 = **1,5**, le plus haut du catalogue avec
    tesla) et non du DPS réel → le correctif est de **lisibilité**, pas
    d'équilibrage.
  `conversionBoss(siege) = 1.5` contre 1.0 pour standard confirme que le siège
  *est* conçu comme spécialiste boss. Mesurer le DPS boss isolé avant de
  conclure. **Ne pas nerfer le siège en l'état : la mesure dit l'inverse.**
- **Railgun à −15 pour la cible la plus haute (110 %, difficulté 3)** est le
  second écart le plus grave, et il n'est dans aucun brief. Une arme dont on
  exige la plus grande maîtrise rend le moins : c'est le pire rapport
  effort/récompense du catalogue.

### Protocole avant toute correction

Pour chaque arme rouge, isoler la variable avant de la toucher :
`dpsBase(a)` (nominal), `conversionBoss(a)` (cible unique), `survieArme(a)`
(PV convertis), `ech` (les 7 coefficients d'échelle), `cibleArme(a)` (la cible
dérivée de `difficulte(a)`). Un écart de 16 points peut venir de n'importe
lequel — et `ech` est le plus probable pour le laser, dont
`ech.cadence = 0.4` / `ech.critique = 0.6` encaissent mal les cartes
génériques alors que `ech.degats = 1.2` et `ech.portee = 1.3` les amplifient.

### Le cas laser, précisé

Le laser a `interval: 0`, `degats: 75`, `perforeTout: true`, `chaleur: true`.
`dpsBase` d'une arme à `interval = 0` renvoie `a.degats` directement, soit 75 —
identique au DPS du tir standard (12 / 0,16 = 75). Le laser est donc **nominal
à parité**, et son +22 % vient d'ailleurs : faisceau qui ne rate jamais,
traversée totale, et bonus de chaleur (`conversionBoss` = 1 + ((plancher+1)/2)
× 0,25 ≈ 1,17).

Piste à mesurer en priorité : le laser touche **tous** les ennemis de son
segment sans limite de perforation, ce qui n'est amorti par aucun coefficient
(`ech.perforation = 0`, donc les cartes de perforation ne l'affectent pas —
mais sa perforation native est infinie et gratuite). C'est le levier candidat.

## 2b · Tesla — ligne de vue (M5, confirmé non corrigé)

### Constat

`_teslaTir` (`game_state.js:1934`) calcule
`portee = BULLET_SPEED × BULLET_LIFE × arme.portee × bulletLifeMul`, puis
sélectionne via `_surSegment` sur `this.enemies` et `_bossTargets()`.
**`this.obstacles` n'est jamais consulté.** Un mur entre le joueur et
l'ennemi ne bloque rien.

### Décision : option B — l'arc s'arrête sur l'obstacle

Retenue sur l'option A (tir annulé) pour trois raisons, dont une technique
décisive : `_obstacleAt(x, y, margin)` et `_obstacleHit(x, y, dmg)` existent
déjà et servent d'autres mécaniques (rebonds, murs destructibles). L'option
B, plus riche en jeu, est donc **moins chère** à implémenter que l'option A.

### Étapes

1. Dans `_teslaTir`, avant de retenir un candidat, tester si un obstacle
   intercepte le segment joueur→candidat à une distance inférieure à celle du
   candidat. Réutiliser le test AABB déjà employé par `_obstacleAt` — ne pas
   écrire une seconde géométrie.
2. Si obstruction : l'arc se termine au point d'impact (feedback visuel là où
   il touche), aucun ennemi derrière n'est touché.
3. **Trancher explicitement** : le mur destructible encaisse-t-il l'arc ?
   `_obstacleHit` le permet ; c'est une décision de design, pas une contrainte.
   Recommandation : oui — sinon le joueur n'a aucun retour sur ce qui a bloqué.
4. Les rebonds entre cibles (`TESLA_REBONDS: 1`, `TESLA_PERTE: 0.3`,
   `TESLA_SAUT: 220`) restent inchangés : c'est une capacité distincte du
   rebond-sur-mur.
5. **Vérifier l'impact sur l'équilibre** : tesla passe aujourd'hui le
   vérificateur. Ajouter une contrainte de ligne de vue le rendra plus faible.
   Rejouer `verifierEquilibreArmes` après le changement — si tesla tombe sous
   sa cible, compenser sur un levier identifié, pas au jugé.

### Test automatisé

Script d'import direct de `GameState` (idiome documenté dans `CLAUDE.md`,
« les méthodes `_` sont volontairement appelables depuis un test ») :
joueur, mur, ennemi aligné derrière. Attendu : l'ennemi ne prend aucun dégât,
et le mur en prend si 3. est tranché en ce sens.

## 2c · Les autres armes en ligne — question ouverte, non traitée par les briefs

Le même défaut de ligne de vue s'applique potentiellement à toute arme à tir
tendu longue portée. **Précision** (`portee: 2.2`, la plus longue) et
**railgun** (`portee: 1.8`, `perforeTout`) sont candidats. Vérifier si leurs
projectiles physiques sont déjà stoppés par les obstacles (probable, ils
passent par la boucle de balles) ou non — le laser (`tir: "faisceau"`) et le
tesla (`tir: "arc"`) sont les deux qui **n'utilisent pas** de projectile
physique, donc les deux qui échappent naturellement au test d'obstacle.

Si confirmé, le sujet « ligne de vue » se referme sur exactement ces deux
armes, ce qui est un périmètre net.

## Fichiers

- `shared/game_state.js` — `_teslaTir`, boucle de faisceau laser
- `shared/armes.js` — `ech` du laser si le levier identifié y est
- `docs/regles/SIMULATION.md`
