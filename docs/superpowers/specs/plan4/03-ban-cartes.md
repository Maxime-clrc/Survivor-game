# Lot J — Bannissement de cartes

Aucun mécanisme de ce type n'existe dans le code actuel : ce lot part de zéro,
côté serveur comme côté client.

---

## J1. La règle, telle qu'actée par l'équipe

- Bannir une carte proposée la retire **définitivement** du pool de tirage de
  ce compte pour toutes les parties futures.
- **Bannir consomme la phase de choix en cours** : le joueur ne peut pas
  sélectionner une autre carte à la place lors de cette même phase.
- **Exception** : si la phase de choix comporte plusieurs paliers de rareté
  visibles simultanément (par exemple une offre normale et une offre de palier
  supérieur liée à un jalon), le joueur reste libre de choisir une carte dans
  un palier différent de celui où il a banni.

Cette dernière règle demande de bien définir ce qu'est un « palier » dans le
système actuel, avant de coder quoi que ce soit.

---

## J2. Vérification du modèle de tirage actuel

Le tirage de cartes fonctionne aujourd'hui par offre unique : trois cartes
proposées, une sélection, la phase se termine. **Aucune notion de palier
multiple simultané n'existe.**

L'exception actée par l'équipe ne peut donc s'appliquer que si le jeu propose
déjà, ou proposera par ailleurs, plusieurs paliers dans une même phase — ce qui
n'est pas le cas dans le code présent. Deux options :

- **Traiter l'exception comme une clause anticipée**, qui ne s'active que si un
  futur système de paliers multiples est introduit. Dans l'état actuel du jeu,
  bannir consomme donc systématiquement la phase.
- **Ou considérer que la phase de troisième compétence** (offre séparée,
  filtrée par classe) constitue déjà un « palier différent » au sens de la
  règle, si elle tombe sur la même vague qu'une offre normale.

**Point à trancher avec le porteur du projet avant implémentation** : la
seconde option demande de vérifier si les deux phases (carte normale et
troisième compétence) peuvent effectivement coïncider sur la même vague dans
le système actuel.

---

## J3. Stockage

Liste de cartes bannies, par compte, dans `data/progress.json` :

```json
"bannedCards": ["symbiose", "dette"]
```

Ajout **en fin** du schéma existant, migration triviale : un compte sans ce
champ est traité comme une liste vide.

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

Réponse : la carte rejoint `bannedCards`, la phase se ferme pour ce joueur sans
sélection (sauf clause d'exception du lot J1, si applicable), écriture
immédiate dans la sauvegarde — le bannissement ne doit pas se perdre si le
serveur redémarre avant la fin de la manche.

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
- Bannir ferme la phase de choix sans sélection, sauf cas d'exception validé.
- Le serveur rejette toute tentative de bannir une carte hors de l'offre
  actuelle du joueur.
- L'action est confirmée explicitement avant d'être exécutée.
