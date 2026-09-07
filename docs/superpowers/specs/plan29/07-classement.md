# 07 · Classement — perte de données en cours

**P0 le plus urgent du plan.** Ce n'est pas un défaut d'affichage : le jeu
détruit des records à chaque manche jouée, et chaque jour d'attente en perd
davantage.

## Trois défauts distincts

### A — la clé écrase les records entre effectifs

```js
// shared/progression.js:419-424
if (!profile.bestFinal) profile.bestFinal = {};
const k = String(run.difficulty | 0);
const cur = profile.bestFinal[k];
if (cur && cur.time <= run.time) return false;
profile.bestFinal[k] = { time, level, total, variant, biome, players, date };
```

La clé est **la difficulté seule**. Un profil n'a donc qu'un record par
difficulté, tous effectifs confondus : un meilleur temps solo est
**définitivement détruit** dès qu'une manche à 4 joueurs fait mieux.

`players` est bien écrit — mais **après** la comparaison qui a déjà décidé
d'écraser. La donnée est là ; elle n'est simplement jamais consultée au bon
moment.

### B — une manche d'équipe occupe 4 places du classement

`recordFinal` est appelé **par profil** (boucle sur les clients, `hub.js`).
Quatre joueurs qui finissent ensemble écrivent quatre records au même temps,
et le classement les empile sans dédupliquer :

```js
// hub.js:190-202
par[d].push({ pseudo: pr.pseudo, time: bf[k].time | 0 });
```

Deux bonnes manches d'équipe consomment 8 places sur 10.

### C — six champs sur sept sont jetés

`recordFinal` stocke `time`, `level`, `total`, `variant`, `biome`, `players`,
`date`. `leaderboard()` n'en ressort que `pseudo` et `time`.

## Cible

```
NORMAL
────────────────────────────
SOLO       #1 Maxime        18:42
DUO        #1 Alice/Bob     17:51
TRIO       #1 ...
QUATUOR    #1 ...
```

## Étapes

1. **Changer la clé de stockage** : `String(run.difficulty)` →
   `` `${run.difficulty}:${run.players}` ``. C'est le correctif de fond ;
   l'affichage en découle.
2. **Migration** — récupérable sans perte grâce à `players` déjà stocké :
   pour chaque entrée `bestFinal[d]`, la déplacer vers
   `bestFinal[`${d}:${entry.players || 1}`]`. Les records déjà écrasés par le
   défaut A sont perdus définitivement : le dire dans les notes de version
   plutôt que de le masquer. `PROG_CFG.VERSION` → 8 (mutualisable avec le
   chantier 01, qui incrémente aussi).
3. **Dédupliquer les manches d'équipe.** Deux options :
   - *(recommandée)* dédupliquer à l'affichage — regrouper les entrées de même
     `(difficulté, effectif, time, date)` en une ligne, pseudos joints
     (« Alice/Bob »). Chaque joueur garde son record personnel dans son profil,
     et le classement montre une manche une fois ;
   - n'écrire le record d'équipe que sur un profil désigné — plus simple, mais
     un joueur perd la trace de sa propre performance.
4. **Remonter les champs utiles** dans `leaderboard()` : au minimum `level` et
   `biome`, qui sont déjà là et donnent du contexte à un temps.
5. **Records personnels séparés** (votre proposition) : meilleur temps
   personnel / en équipe / solo se déduisent gratuitement une fois la clé
   corrigée — c'est une lecture de `bestFinal`, pas un nouveau stockage.

## Interaction à trancher (chantier 12)

Si un biome finit par modifier le gameplay (map ↔ gameplay), le classement
compare des manches inégales. `biome` est déjà stocké. Deux issues possibles :
séparer aussi par biome, ou fixer le biome par difficulté pour les manches
classées. **À trancher avant de pousser la direction map ↔ gameplay**, pas
après.

## Tests

- Un profil avec un record solo et un record à 4 conserve les deux après
  migration.
- Une manche à 4 joueurs produit **une seule** ligne au classement.
- Le classement d'un effectif ne contient aucune entrée d'un autre effectif.

## Fichiers

- `shared/progression.js` — `recordFinal`, migration de profil
- `hub.js` — `leaderboard()`, déduplication
- écran de classement (`public/ui/`)
- `docs/regles/CONTENU.md`
