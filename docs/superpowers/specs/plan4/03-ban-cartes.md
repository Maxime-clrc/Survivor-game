# Lot J — Bannissement de cartes

Aucun mécanisme de ce type n'existe dans le code actuel : ce lot part de zéro,
côté serveur comme côté client.

---

## J1. La règle — tranchée par le porteur du projet

Le but du ban est simple : **qu'une carte précise ne revienne plus jamais sur
ce compte.**

- Bannir une carte proposée la retire **définitivement** du pool de tirage de
  ce compte pour toutes les parties futures.
- **Bannir une carte bannit aussi les cartes qui dépendent d'elle.** Une carte
  dont l'effet est inopérant sans la carte bannie n'a plus de raison
  d'apparaître — la proposer serait offrir une carte morte. Rien de plus :
  pas de cascade sur la famille, pas de règle de palier.
- **Bannir consomme la phase de choix en cours** : le joueur ne peut pas
  sélectionner une autre carte à la place lors de cette même phase.
- L'exception « palier différent visible dans la même phase » discutée en
  équipe est traitée comme une **clause anticipée** : le tirage actuel est à
  offre unique (trois cartes, une sélection), aucun palier multiple simultané
  n'existe. La clause ne s'activera que si un tel système apparaît un jour.

---

## J2. La dépendance entre cartes, concrètement

Le catalogue actuel n'a **pas de champ de dépendance** : les paliers d'une
famille sont indépendants au tirage (un palier supérieur possédé retire les
inférieurs, mais aucun palier n'exige d'en posséder un autre), et les
exclusions passent par `incompatible`, qui est une relation symétrique, pas
une dépendance.

L'implémentation ajoute donc un champ déclaratif dans la table de `cards.js` :

```js
dependsOn: ["id_de_la_carte_socle"]
```

posé uniquement sur les cartes dont l'effet est réellement inopérant sans une
autre (exemple type : une carte qui modifie un effet qu'une seule autre carte
peut poser). Le ban ferme la **clôture transitive** : bannir la carte socle
bannit toute carte qui en dépend, directement ou par chaîne. Les cartes
dépendantes rejoignent `bannedCards` explicitement à l'écriture — le tirage
n'a ainsi qu'une liste plate à filtrer, jamais un graphe à résoudre.

**Cas des trois variantes de troisième compétence** (par classe, mutuellement
`incompatible`) : ce sont des variantes, pas des dépendances — bannir l'une
laisse les deux autres disponibles. Mais bannir **les trois** prive le compte
de `s3` pour toujours : la fenêtre de confirmation doit l'annoncer quand la
dernière variante est en jeu.

---

## J3. Stockage

Liste de cartes bannies, par compte, dans le **profil de la ligne Supabase**
(la persistance n'est plus `data/progress.json`, voir `LISEZMOI-BDD.md`) :

```json
"bannedCards": ["symbiose", "dette"]
```

Champ ajouté au schéma de profil existant, migration triviale : un compte sans
ce champ est traité comme une liste vide. Les identifiants y figurent à plat,
cartes dépendantes incluses (cf. J2) — relire la liste suffit, aucun recalcul
de dépendances au chargement.

---

## J4. Le tirage exclut les cartes bannies

Le point d'entrée du tirage (fonction équivalente à `drawCards`) doit recevoir
la liste des cartes bannies du joueur et les retirer du pool **avant** tirage,
pas après — sinon une carte bannie omniprésente dans une famille peut réduire
artificiellement les autres cartes disponibles si le filtrage intervient après
la sélection des trois candidates.

```js
function drawCards(pool, quality, forceRare, bannedIds) {
  const available = pool.filter(c => !bannedIds.has(c.id));
  // ... logique de tirage existante, inchangee sur "available"
}
```

**Vérification obligatoire** : que se passe-t-il si un joueur a banni
suffisamment de cartes pour qu'une rareté donnée soit épuisée ? Le mécanisme de
repli déjà prévu pour l'épuisement du pool (carte `ravitaillement`) doit
couvrir ce cas — à tester explicitement, pas seulement supposé fonctionner.

---

## J5. Protocole

```
client -> serveur : { t: "banCard", id: "symbiose" }
```

Le serveur valide :

- la carte proposée figure bien dans l'offre en cours pour ce joueur ;
- la carte n'est pas déjà bannie (idempotence) ;
- la phase de choix pour ce joueur est encore ouverte.

Réponse : la carte **et sa clôture de dépendances** rejoignent `bannedCards`,
la phase se ferme pour ce joueur sans sélection, écriture immédiate dans la
sauvegarde — le bannissement ne doit pas se perdre si le serveur redémarre
avant la fin de la manche.

---

## J6. Interface

- Sur chaque carte proposée, un bouton distinct du choix normal, clairement
  séparé pour éviter un bannissement accidentel — confirmation systématique
  avant validation, puisque l'action est irréversible.
- Un écran de gestion (accessible depuis le Terminal, lot H) listant les
  cartes bannies avec possibilité de consulter leur effet — **pas de
  possibilité de les débannir**, sauf décision contraire à valider par le
  porteur du projet.
- Rappel explicite dans la fenêtre de confirmation : « cette carte ne sera plus
  jamais proposée sur ce compte, et vous ne recevrez pas de carte de
  remplacement pour cette apparition ».
- La confirmation **liste les cartes entraînées** par la clôture de
  dépendances (cf. J2), le cas échéant — bannir une carte socle sans savoir ce
  qu'elle emporte serait une irréversibilité cachée.
- Cas particulier affiché en évidence : bannir la **dernière variante de
  troisième compétence** disponible pour une classe prive ce compte de `s3`
  sur cette classe, définitivement.

---

## J7. Interaction avec les autres lots

- **Lot H (Terminal)** : l'écran de gestion des cartes bannies y trouve
  naturellement sa place, comme troisième onglet à côté de l'arbre et des
  jalons.
- **Lot K (marchand de reliques)** : les reliques ne sont pas des cartes, donc
  hors du champ de ce mécanisme. À confirmer que la distinction reste claire
  dans l'interface, pour qu'un joueur ne s'attende pas à pouvoir bannir une
  relique.

---

## J8. Mesures et critères

| mesure | attendu |
|---|---|
| tirage avec pool réduit par bannissement massif | ne plante jamais, repli fonctionnel |
| latence entre bannissement et mise à jour du pool | immédiate, dès la manche suivante |

Critères d'acceptation :

- Une carte bannie n'apparaît plus jamais dans aucun tirage pour ce compte,
  y compris après redémarrage du serveur.
- Bannir une carte bannit sa clôture de dépendances, et la confirmation
  l'affiche avant l'action.
- Bannir ferme la phase de choix sans sélection.
- Le serveur rejette toute tentative de bannir une carte hors de l'offre
  actuelle du joueur.
- L'action est confirmée explicitement avant d'être exécutée.
