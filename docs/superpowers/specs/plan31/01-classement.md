# 01 · Le classement enregistre les manches, pas seulement les victoires

## Le constat

Le système est écrit et il ne montre rien.

Ce qui existe et qui ne bouge pas :

- `classement(profils, modes, limit)` (`shared/progression.js`) rend un tableau
  **par difficulté × effectif**, trié au temps ;
- il **dédoublonne une manche d'équipe** — quatre joueurs qui finissent ensemble
  écrivaient quatre records au même temps, et deux bonnes manches à quatre
  consommaient huit places sur dix. La clef de regroupement est
  `(difficulté, effectif, temps, date)`, et c'est pour ça que le tampon horaire
  d'une manche se calcule **une** fois par manche ;
- `clefRecord(difficulté, joueurs)` porte la coupe par effectif ;
- `hub.js` répond au message `leaderboard` ;
- `renderBoard()` (`public/ui/screens.js`) affiche les sections par effectif, avec
  le joueur surligné et un onglet par difficulté.

Ce qui bloque, et c'est une seule condition, dans `hub.js` :

```js
if (state.victory && state.finalKill > 0) {
  const avant = pr.bestFinal?.[clefRecord(state.diffIndex, effectif)]?.time ?? null;
  const bat = recordFinal(pr, { ... });
}
```

`recordFinal` n'est appelé qu'à la **victoire complète**. Toute autre fin n'écrit
rien.

## La décision

**La victoire reste la condition d'entrée, et elle vaut pour tous les
classements.** On n'entre au tableau qu'en ayant fini. La condition ne bouge donc
pas — elle devient la porte d'entrée d'une manche **enregistrée** au lieu d'être
la porte d'entrée d'un seul chiffre.

**Trois classements sur la même manche, par rôle :**

| classement | trié sur | nature de la grandeur |
|---|---|---|
| **Temps** | durée de la manche | **équipe** |
| **Kills** | `p.kills` | **joueur** |
| **Dégâts** | `p.damageDealt` | **joueur** |

**Chacun coupé par effectif** (1, 2, 3, 4), comme aujourd'hui.

## Le piège, et c'est LE point de ce lot

**Le dédoublonnage vaut pour le temps et NE VAUT PAS pour les deux autres.**

Le regroupement actuel existe pour une bonne raison : une manche d'équipe est une
ligne, pas quatre. Mais appliqué aux kills, il ferait **disparaître trois joueurs
sur quatre** — alors que le sens d'un classement par rôle est précisément de les
montrer tous les quatre, chacun avec son chiffre.

`classement()` a donc deux modes :

- **groupé** — pour le temps. Une manche, une ligne. Le comportement actuel, mot
  pour mot.
- **individuel** — pour les kills et les dégâts. Un joueur, une ligne. Le
  dédoublonnage ne s'applique pas ; c'est le tri qui change, pas la clef.

Écrire un troisième chemin serait une erreur : c'est **un paramètre**, et les deux
modes doivent rester dans la même fonction pour que la coupe par
difficulté × effectif ne se recopie pas.

## Ce que ça change dans les données

`recordFinal` écrit aujourd'hui `time`, `level`, `total`, `variant`, `biome`,
`players`, `date`. Il lui faut deux champs :

```
kills    ← p.kills          (existe)
degats   ← p.damageDealt    (existe)
```

Les deux sont déjà comptés en manche. Rien à instrumenter.

**Sur la comparaison au record.** `recordFinal` remplace l'entrée si le nouveau
temps est meilleur (`if (cur && cur.time <= run.time) return false`). Avec trois
grandeurs, un joueur peut battre son record de kills dans une manche plus lente.
Deux réponses :

- **une entrée par grandeur** — trois records indépendants. Plus juste, et c'est
  ce que fait le genre ;
- **une entrée par manche, la meilleure au temps** — plus simple, mais un
  excellent record de kills serait perdu parce que la manche était lente.

**La première.** `bestFinal[clef]` devient trois sous-entrées, ou trois clefs.
Le stockage est du JSON par profil, il n'y a pas de schéma à migrer.

**Compatibilité.** Les profils existants ont des entrées sans `kills` ni
`degats`. Elles se lisent comme zéro et se classent en bas, ce qui est exact :
ces manches n'ont pas mesuré ces grandeurs. Aucune migration nécessaire, mais il
faut que `classement()` traite l'absence comme zéro et non comme `NaN` — sinon un
tri se casse sur un profil ancien.

## Ce que ce lot ne fait pas

**Pas de classement de progression.** Les manches non gagnées n'entrent nulle
part. C'est la décision, et elle a une conséquence assumée : le tableau restera
vide tant que personne n'aura battu le boss final. C'est le classement des gens
qui finissent.

**Pas de classement de soutien.** Les soins prodigués et `p.contrib`
(`evites`, `proteges`, `detournes`, `permis`) sont les seules grandeurs où un
Soigneur ou un Rempart peut apparaître. Elles sont **déjà calculées** aux points
de passage et ne sortent nulle part. C'est la suite naturelle de « par rôle »,
elle n'est pas décidée, et elle appartient au plan de l'outillage — qui va de
toute façon les faire sortir dans le compte rendu.

## Critère d'acceptation

1. **Une manche gagnée à quatre écrit quatre records** et le classement au temps
   n'en montre **qu'une ligne** ; les classements kills et dégâts en montrent
   **quatre**.
2. **Un profil sans `kills`** (créé avant ce lot) se classe sans erreur, en bas.
3. `classement()` reste **pur** — testable sans monter un serveur, comme
   aujourd'hui : c'est la raison pour laquelle il a quitté `hub.js`, et elle vaut
   toujours.
4. Un vérificateur `verifierClassement()` dans la suite rapide : trois profils
   fabriqués, une manche à quatre, une manche solo — les trois tableaux rendent le
   bon nombre de lignes, dans le bon ordre, coupés par le bon effectif.

## Nature de la tâche

`classement()` est pur et testable ; les deux champs de `recordFinal` sont
mécaniques. Le seul jugement est le mode groupé/individuel, et il tient en un
paramètre.

| étape | qui |
|---|---|
| ajout des deux champs, lecture de l'absence comme zéro | builder |
| les deux modes de `classement()`, le vérificateur | **fil principal** |
| affichage des trois onglets dans `renderBoard()` | builder, puis relecture |
