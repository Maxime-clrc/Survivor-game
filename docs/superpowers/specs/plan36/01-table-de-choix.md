# 01 · La liste fermée

## Ce qu'il peut choisir

Une fois par **battement** — 60 s, le grain où le script exprime déjà son budget.

| levier | valeurs | d'où ça vient |
|---|---|---|
| **composition** | quels types dans le battement | `entry.types`, `adaptType()` |
| **géométrie** | `bords`, `front`, `pince`, `quatre-fronts`, `anneau` | `GEOMETRIES` |
| **élite** | une de plus, une de moins, aucune | `ELITE_MIN`, `ELITE_MAX` |
| **événement** | proposer un contrat, ou rien | `EVENTS`, plan 34 |

**Et rien d'autre.** La liste est fermée. Tout ce qui n'y est pas appartient au
script ou à la difficulté.

## Ce qu'il ne choisit jamais, et pourquoi c'est écrit ici

- **le `rate`** — c'est le budget, et `verifierScript()` en tient les sommes ;
- **les points de vie, la vitesse, les dégâts** — ce sont les leviers de la
  difficulté, et les mélanger rendrait un mode illisible ;
- **la respiration** — elle est écrite dans le script. Si le Director pouvait ôter
  de la pression, il pourrait rendre une manche plus facile qu'écrite ;
- **le plafond de population** — `MAX_ENEMIES_HARD_CAP` est une limite de moteur.

## Comment il choisit dans le budget

Le script dit « ce battement vaut 2,3 ». Le Director choisit ce qu'on achète avec.

Une composition plus dure coûte plus cher **par corps**, donc elle en met moins
pour le même budget. Une élite de plus consomme sa part. C'est le modèle des
crédits de Risk of Rain 2, et il se greffe sans réécrire une ligne d'équilibrage :
la conversion « ce type coûte tant » est une colonne à ajouter au bestiaire, pas
un système.

**Le point délicat** : cette colonne devient un second système d'équilibrage, à
côté de `share`. Il faut décider si le coût **est** `share` (donc rien à écrire) ou
s'il en diffère. Ma recommandation : commencer par `share`, et n'en diverger que si
une mesure le demande.

## Ce qu'il regarde

`_contexteBonus()` est le modèle : six grandeurs déjà lues. Le Director y ajoute
ce que le plan 32 a livré :

- `tensionMoy` et `tensionMax` ;
- l'indice de survie — pour ne pas confondre « équipe fragile » et « équipe
  cuirassée qui s'ennuie » ;
- les trois compteurs de mémoire : temps depuis la dernière élite, depuis le
  dernier événement, **temps passé sous le seuil bas**.

Le troisième compteur est le vrai déclencheur d'ennui. Une tension basse dix
secondes n'est rien ; quatre-vingt-dix, c'est une manche plate.

## Il est déterministe

Il tire dans `this.alea`, jamais dans `Math.random`. Sinon deux manches de même
graine divergent, et tout ce qui a été construit au plan 31 lot 02 ne lui sert à
rien — y compris la comparaison de deux réglages en mode custom.

## Critère d'acceptation

1. `verifierScript()` reste vert. **C'est le critère qui dit que le Director est
   resté dans son rôle.**
2. `verifierPopulation(45, [1, 2, 4], 16)` reste vert : le budget n'a pas bougé.
3. Deux manches de même graine, mêmes entrées, prennent les **mêmes décisions**.
4. Un vérificateur `verifierDirector()` : sur cent battements simulés, aucune
   décision hors de la liste fermée. C'est le test qui empêche la dérive, et il
   doit être écrit **avant** le Director.

## Nature de la tâche

Conception. **Fil principal.** La liste fermée est le contrat du système : elle
s'écrit d'abord, et le vérificateur avec.
