# 05 · `BAC=1` — la méta ouverte en local, pour pouvoir la tester

## Le besoin

En local, tester un arbre, un noyau commun, un cadre ou une ligne verrouillée
demande de jouer les manches qui les débloquent. Et comme l'environnement local
ne persiste rien (voulu, voir `03`), ce qu'on a débloqué disparaît au redémarrage
suivant — donc à chaque lot livré.

Ce qu'on veut : ouvrir le jeu et pouvoir tout regarder, tout de suite.

Deux choses à donner : **les noyaux** (la monnaie) et **les hauts faits** (les
clefs).

## La forme, et c'est la seule décision du lot

**Une surcharge d'environnement explicite, sur le modèle exact de `BANC`,
`BIOME` et `GRAINE`.** `CLAUDE.md` les nomme déjà « surchargeables par
l'environnement, **pour les tests uniquement** » ; celle-ci entre dans la même
ligne :

```bash
BAC=1 npm start
```

`BAC` et non `NOYAUX` : le drapeau donne deux choses de nature différente, et un
nom qui décrit l'une des deux mentirait sur l'autre le jour où une troisième
s'ajoute. C'est un bac à sable, il porte ce nom.

**Et surtout : pas de déduction automatique depuis « Supabase absent ».** C'est
la tentation, puisque c'est la définition pratique de « local ». Mais un hôte de
production dont la configuration Supabase a été mal renseignée est *aussi* dans
cet état, et il distribuerait alors la méta complète à des joueurs réels sans que
rien ne le signale. Un drapeau explicite ne peut pas arriver par accident ; un
défaut implicite, si. Même règle que le dépôt applique déjà aux tables par lieu.

## L'implantation

**Un seul point de passage : la naissance d'un profil.** `progress_store.js` est
le seul endroit où un profil naît, et il en a deux occurrences — la création de
compte (l. ~390) et la remise à neuf d'un profil de version inconnue (l. ~308).
Les deux passent par `newProfile(pseudo)`. Le lot enveloppe cet appel, et rien
d'autre :

```js
const BAC = process.env.BAC === "1";
const BAC_NOYAUX = 1e6;

function profilNeuf(pseudo) {
  const p = newProfile(pseudo);
  if (BAC) {
    p.cores = BAC_NOYAUX;
    p.hf = HAUTS_FAITS.map(h => h.id);
  }
  return p;
}
```

### Pourquoi ces deux lignes suffisent, et pourquoi il ne faut pas en écrire une troisième

**Les noyaux ne se dépensent qu'à trois endroits** (`hub.js` l. 368, 391, 444),
tous de la forme `if (pr.cores < cost) break; pr.cores -= cost;`. Une réserve
posée en amont les couvre tous les trois sans qu'aucun chemin de production ne
change.

**Les récompenses de hauts faits ne se stockent pas, elles se DÉDUISENT.**
`shared/progression.js` :

```js
lignesVerrouillees(profil) → recompensesDe(hfDe(profil)).lignes
cadresDe(profil)           → recompensesDe(hfDe(profil)).cadres
```

Poser `p.hf` complet ouvre donc **d'un coup** les lignes d'arbre verrouillées,
les cadres, les cartes et les reliques que les 36 hauts faits récompensent.
Écrire aussi `p.cadres` serait une **seconde source** pour la même information,
c'est-à-dire exactement ce que ce dépôt refuse partout ailleurs.

`TOUTES_RECOMPENSES` existe déjà dans `hauts_faits.js` (l. 384) si une lecture
directe est nécessaire ailleurs — mais elle ne l'est pas ici.

### Trois contraintes qui gardent le lot petit

- **`shared/progression.js` et `shared/hauts_faits.js` ne bougent pas.**
  `newProfile` est importé par le navigateur : il ne peut pas lire `process.env`
  et n'a pas à connaître un mode de test.
- **Rien ne circule en plus.** `progressPayload` transporte déjà `cores`, `hf` et
  `cadres` ; le client affiche ce qu'on lui donne. Aucun champ, aucun cas de
  routeur, aucune traduction.
- **`1e6`, pas `Infinity`.** `Infinity` devient `null` en JSON : tout deviendrait
  impayable, l'inverse exact du but.

**Le serveur le dit au démarrage**, une ligne, à côté de celle de Supabase — sans
ça, un hôte qui a gardé la variable dans son shell ne peut pas s'en apercevoir.

## L'effet de bord à vérifier, pas à supposer

`evaluerHautsFaits(pr.hf, …)` tourne à chaque mort de boss et à chaque fin de
manche. Avec tous les hauts faits déjà acquis, elle doit rendre une liste
**vide** — sinon le joueur reçoit 36 annonces à la première manche. La garde
existe (`evaluerHautsFaits` filtre sur `acquis`), mais c'est le seul point du lot
qui puisse se voir à l'écran : il se contrôle, il ne se déduit pas.

## Ce que le lot ne fait pas

- Il ne remplit **pas le codex**. C'est ce que `03` cherche à pouvoir vérifier ;
  l'ouvrir d'office rendrait la vérification impossible.
- Il ne rend rien gratuit. Les prix restent les vrais prix — un test de méta doit
  se faire sur le vrai barème, sinon il ne teste pas le barème.

## Vérification

1. `BAC=1 npm start`, créer un compte : la réserve de noyaux est là, l'écran des
   hauts faits est plein, les lignes d'arbre verrouillées sont ouvertes, tous les
   cadres sont équipables, les prix affichés sont les prix normaux.
2. Jouer une manche jusqu'au bout : **aucune** annonce de haut fait.
3. Le codex, lui, est toujours à « ? » — et se remplit en jouant.
4. `npm start` sans la variable : un compte neuf démarre à 0 noyau, 0 haut fait.
5. La ligne de démarrage nomme le mode.
