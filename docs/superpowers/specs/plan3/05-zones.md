# Lot E — Refonte des zones au sol

Le WebGL est en place et les zones n'en profitent pas encore. Aujourd'hui tout
est un disque rouge qui se remplit : on ne distingue pas ce qui va exploser de
ce qui reste actif, ni ce qui se déplace de ce dans quoi il faut entrer.

Indépendant des autres lots.

---

## E1. Le principe : la forme et le comportement avant la couleur

**On doit reconnaître une mécanique sans lire sa couleur.** La couleur confirme,
elle ne distingue jamais — elle se perd dans le chaos, et elle est déjà prise
par la grammaire fonctionnelle.

Quatre signatures, chacune reconnaissable au coin de l'œil :

| catégorie | signature | ce qu'elle dit |
|---|---|---|
| **imminent** | craquelures qui s'ouvrent depuis le centre | ça va exploser ici |
| **persistant** | braises et fumée qui montent | ça restera après |
| **mobile** | courant qui défile dans la direction du déplacement | ça vient vers moi |
| **accueillant** | halo qui monte vers l'intérieur | il faut être dedans |

Ces quatre signatures se combinent avec les formes existantes — disque,
rectangle, anneau, cône, Pac-Man, croix. Une zone est donc décrite par un
couple **forme × signature**, ce qui donne un vocabulaire complet sans multiplier
les cas particuliers.

---

## E2. Imminent — les craquelures

C'est le télégraphe, la mécanique la plus fréquente du jeu.

**Ce qui remplace le remplissage uni** :

- Un **réseau de fissures** généré depuis le centre, qui s'étend au rythme du
  compte à rebours. Les fissures sont pré-générées dans l'atlas — quatre
  variantes suffisent, tirées par identifiant de zone pour que deux zones
  voisines ne soient pas identiques.
- Une **lueur qui monte depuis les fissures**, en additif, dont l'intensité suit
  une courbe **non linéaire** : lente sur les deux premiers tiers, brutale sur
  les 300 dernières millisecondes. C'est ce qui fait qu'on *ressent* l'échéance
  au lieu de lire une jauge.
- Le **contour** reste, mais fin et animé — il définit la limite exacte, et
  c'est la seule information dont le joueur a besoin pour se placer.
- **Trois éclats** projetés vers le haut à 0,4 s de l'échéance : le dernier
  avertissement, perceptible même si on regarde ailleurs.

À la résolution : éclair, **onde annulaire additive** qui dépasse largement le
rayon, débris projetés, et une **décoloration du sol qui persiste 2 s** — la
trace de ce qui vient de se passer, qui aide à comprendre ce qui nous a touché.

---

## E3. Persistant — les braises

C'est le manque le plus criant : rien ne distingue aujourd'hui une zone active
d'une zone en cours d'annonce.

- **Texture de braises** qui défile lentement à l'intérieur, avec un léger
  décalage de teinte par cellule pour que ça respire.
- **Fumée** qui monte en continu depuis la surface — quelques dizaines de
  particules en additif, plafonnées globalement.
- **Bord net et fixe**, sans animation : c'est le contraire du télégraphe, dont
  le bord est animé. La distinction se lit instantanément.
- **Pulsation d'intensité** synchronisée sur le tic de dégâts : on voit *quand*
  ça frappe, ce qui rend le danger prévisible au lieu de continu.

---

## E4. Mobile — le courant

Pour les zones qui glissent, les exaflares et les zones poursuivantes.

- **Bandes de courant** orientées dans la direction du déplacement, qui défilent
  plus vite que la zone elle-même. C'est ce qui donne la sensation de vitesse.
- **Traînée** derrière la zone, qui s'estompe sur environ deux longueurs.
- **Avant-garde** : un liseré plus lumineux sur le bord avant, plus sombre à
  l'arrière. On lit la direction sans avoir à observer le mouvement.

Pour les exaflares en particulier, chaque explosion successive doit **hériter
de l'orientation** de la précédente : c'est ce qui permet d'extrapoler la suite,
qui est tout l'intérêt de la mécanique.

---

## E5. Accueillant — le halo

Pour les tours, les regroupements, les sanctuaires, le rempart du tank et le
sanctuaire du soigneur.

- **Halo qui monte vers l'intérieur** — l'inverse exact du télégraphe, dont
  l'énergie sort. Le mouvement ascendant et centripète est lu comme un appel.
- **Colonne lumineuse** verticale au centre, visible de loin par-dessus la
  horde. C'est le seul élément du jeu autorisé à dépasser en hauteur, justement
  pour être repérable dans une foule.
- **Compteur d'occupants** pour les tours et le dénombrement : un chiffre net au
  centre, qui vire au vert quand le compte est bon. Sans ça, le dénombrement
  est indevinable.
- **Cyan strictement**, jamais de rouge — la règle de la grammaire.

---

## E6. Ce que le WebGL rend possible et qu'on n'utilise pas

- **Le mélange additif** pour toutes les lueurs. C'est ce qui donne aux
  superpositions leur intensité — deux zones qui se croisent doivent brûler
  plus fort.
- **La teinte par sprite** pour les particules : une seule texture de braise,
  déclinée en orange pour le feu, bleu pour le givre, violet pour le poison, or
  pour les zones bénéfiques. Un seul rectangle d'atlas, quatre significations.
- **La distorsion** au moment des résolutions : échantillonner le tampon avec un
  décalage radial pendant 200 ms. C'est l'effet le plus spectaculaire de la
  liste, et il coûte une passe.

---

## E7. Les particules

Les sprites de particules manquent. **Kenney** fournit ce qu'il faut en CC0,
sans attribution requise : *Particle Pack* et *Smoke particle assets*.

Ils sont **stylistiquement neutres** — volutes, étincelles, éclats, anneaux —
donc ils s'intègrent sans entrer en conflit avec les monstres générés par
`sprites.js`. C'est l'import à rendement maximal et à risque nul.

**À ne pas importer** : les personnages et monstres des mêmes packs. Du
vectoriel plat représentant des humains armés, qui contredirait la direction
retenue et jetterait les 874 lignes de `sprites.js`.

Intégration : les particules rejoignent l'atlas existant, avec la gouttière de
2 px déjà en place. Rien ne change au pipeline, seulement son contenu.

---

## E8. Garde-fous

**La lisibilité prime sur l'effet.** À 220 ennemis, 40 zones et 3 000
particules, l'écran peut devenir illisible. Trois plafonds :

- particules de zone : 40 par zone, 600 au total ;
- fumée : uniquement sur les zones persistantes, jamais sur les télégraphes ;
- distorsion : une seule à la fois, la plus récente écrase la précédente.

**Le télégraphe ne doit jamais être plus voyant que la zone active.** C'est
l'erreur classique : on soigne l'annonce, et le joueur ne voit plus qu'il est
en train de brûler.

**Test de l'image réelle** : une capture à la vague 8 avec un boss, 150 ennemis,
trois zones de catégories différentes et le HUD complet. C'est cette image qui
valide le lot, pas chaque effet pris isolément.

---

## E9. Mesures et critères

| mesure | attendu |
|---|---|
| images par seconde, 220 ennemis + 40 zones + 600 particules | pas de chute sous 60 |
| identification de la catégorie d'une zone, sans couleur | correcte dans tous les cas |
| coût de la passe de distorsion | sous 2 ms |

Critères d'acceptation :

- Une zone active et une zone en annonce ne se confondent jamais, même à la
  périphérie du regard.
- Aucune zone où il faut aller n'est rouge.
- La direction d'une zone mobile se lit à l'arrêt sur une capture.
- Le compteur d'occupants est lisible par-dessus la horde.
- Aucun effet ne dépasse les plafonds de particules.
