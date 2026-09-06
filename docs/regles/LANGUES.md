# Traduction et texte affiché

**Quand lire ce fichier :** on écrit une chaîne que le joueur lira, ou on touche à `shared/i18n.js` ou `shared/lang/*`.

Les règles qui valent pour *toute* tâche vivent dans `CLAUDE.md`, à la racine.
Celui-ci ne porte que ce qui ne sert qu'ici — et il n'est PAS chargé
automatiquement : c'est la carte de `CLAUDE.md` qui dit quand l'ouvrir.
### Langues

- **LE FRANÇAIS RESTE ÉCRIT À CÔTÉ DE SA DONNÉE et sert de REPLI.** Une langue
  étrangère est une **surcharge par clé** (`shared/lang/*.js`), jamais une
  seconde source de vérité : `shared/cards.js` garde `nom`/`desc` en clair, le
  dictionnaire ne les recopie pas. Une clé absente rend le repli, donc une
  traduction partielle dégrade au lieu de trouer l'écran.
- **Un seul point de passage, `t(cle, repli)`** (`shared/i18n.js`). Le module est
  **pur** — aucun DOM, `localStorage` en `try/catch` — pour que le serveur puisse
  l'importer.
- **Trois formes, parce qu'une phrase n'est pas une étiquette** : `t` pour un
  libellé ; **`tf(cle, repli, vals)`** pour les `{marqueur}` — c'est ce qui laisse
  une traduction changer l'**ordre des mots**, là où une concaténation le fige ;
  **`tn(base, repliUn, repliN, n)`** pour le pluriel, qui lit `base.un` /
  `base.n`. La **règle** de pluriel diffère (le français bascule à 2, l'anglais à
  tout ce qui n'est pas 1) : elle se choisit dans la langue **affichée**.
- **`dec(v, d)` est le point de passage de tout décimal affiché** : le séparateur
  appartient à la langue, pas au nombre. Aucun `.replace(".", ",")` ailleurs.
  `fmtM` (`units.js`), `num` (`cards.js`) et `ordinal(n)` suivent la même règle.
- **Une description ne recopie un nombre dans AUCUNE des deux langues** : une
  `desc` qui compose une constante porte des **marqueurs positionnels** (`{0}`)
  et un **thunk `vals`** ; `cardDesc(id)` les remplit à la lecture. Le thunk, pas
  un objet : le séparateur décimal dépend de la langue courante.
- **`plur(n, mot)` prend le MOT FRANÇAIS pour clé** (`u.ennemi`, `u.lame`) : pas
  de table de correspondance à tenir.
- **Le texte d'une carte ne traverse pas le réseau** : `cardBrief` n'envoie que
  `id` et `rarity`, le client lit sa propre table (`cardNom`, `cardDesc`).
- **Chaque table de données porte ses points de passage**, à côté de son
  accesseur : `cardNom`/`cardDesc`, `relicNom`/`relicDesc`, `classNom`/`classDesc`
  /`classMission`/`skillNom`/`skillDesc`, `statusNom`, `bossNom`/`bossVerbe`
  /`bossSous`, `mechNom`/`mechTexte`/`mechOrdre`, `eventNom`/`eventTexte`,
  `biomeNom`/`weatherNom`/`hazardNom`, `diffLabel`/`diffResume`, `srcLabel`,
  `ligneNom`/`confortNom`, `hfNom`/`hfTexte`/`cadreNom`. `segmentName()` traduit **à l'intérieur**
  — c'était déjà le point de passage unique.
- **Un texte figé au chargement du module ne se traduit jamais** : ce qui compose
  une autre valeur traduisible est une **fonction**, pas une constante
  (le `vals` d’un haut fait, le `desc` d’une carte). Même règle pour `applyAlert` : l'entrée d'alerte lit
  les tables **au moment de l'empiler**, pas à la construction.
- **LE SERVEUR N'ENVOIE PAS DE PHRASE AU CLIENT, il envoie un CODE**
  (`launch.why` + `qui`, `roomClosed.why`, `authError.motif`). Une phrase qui
  subsiste dans le message n'est qu'un **repli** pour un code inconnu du client.
  Les **journaux** restent en français : ils sont côté opérateur.
- **Chaque module se rafraîchit lui-même** (`onLangChange` dans `ui/screens.js`,
  `hud.js`, `ui/pause.js`, `ui/build.js`) : la couche qui possède un écran est la
  seule à savoir le reconstruire. Le **HUD oublie sa table `memo`** — il n'écrit
  que si la valeur a changé, or un changement de langue change toutes les valeurs
  sans changer une seule des signatures qui les gardent.
- **Les clés sont PLATES et hiérarchisées par point** : `ui.*` pour le châssis,
  puis une famille par table (`cards.<id>.<champ>`, `class.*`, `boss.*`…). Une
  clé se grep telle quelle.
- **Le markup se traduit par ATTRIBUT** : `data-i18n` (texte), `data-i18n-title`,
  `data-i18n-ph`. `traduireStatique()` (`ui/dom.js`) relève le français d'origine
  **une fois** dans une `WeakMap`. Un nœud qui porte `data-i18n` ne doit contenir
  **aucun élément enfant** — `textContent` l'effacerait ; on enveloppe la partie
  variable dans un `<span>` frère.
- **Le nom d'une langue s'écrit dans cette langue** (« Français », « English ») :
  les boutons du sélecteur ne portent aucune clé.
- **UNE CLÉ EST UN IDENTIFIANT, JAMAIS UN RANG.** `loiNom` composait
  `biome.<lieu>.loi<i>` : réordonner `OBSTACLES` — ou en insérer une région au
  milieu — **réécrivait tous les noms affichés, dans les deux langues**, sans
  qu'une seule ligne de traduction ne bouge et sans qu'aucun vérificateur ne le
  voie. Un thème qui passe de quatre régions à douze le fera forcément. Chaque
  région porte donc une `cle` (`biome.usine.atelier`), sans accent ni majuscule,
  unique dans son thème.
- **UNE TRADUCTION MANQUANTE NE SE SIGNALE JAMAIS.** `t()` replie sur le
  français : c'est le bon comportement en jeu, et c'est exactement ce qui rend un
  oubli invisible. Un vérificateur qui veut croiser une table avec le
  dictionnaire doit donc le **lire** — `clefsDe(code)` (`i18n.js`) est ce point
  d'entrée, et il existe pour ça. `verifierVariantes` s'en sert pour refuser une
  région sans nom anglais ; toute table de texte qui grandit devrait faire pareil.
- **Trois entrées, un seul état** (`survivor.lang`) : bascule en haut à droite de
  la barre, choix explicite dans les paramètres, et **rangée sur `#gate`**
  (`#gateLangRow` — la barre y est masquée, sans quoi on ne pourrait changer de
  langue qu'une fois connecté). Une seule construction, `remplirLangRow()`.
  `onLangChange` est ce qui reconstruit ; aucun rechargement de page.
- **LE MINIMUM DE COMMENTAIRES POSSIBLE.** Par défaut : **aucun**. Un commentaire
  coûte des tokens à chaque lecture, et le dépôt est lu bien plus souvent qu'il
  n'est écrit. On n'en écrit un que si le code ne peut pas porter l'information —
  valeur mesurée, piège déjà payé, alternative rejetée — et il est **court**.
  Jamais de paraphrase, jamais de bannière de section. Ce qui explique un **choix
  de conception** appartient à ce fichier, pas au code.
- **La documentation suit la même règle** : on n'écrit que ce qu'on ne peut pas
  relire dans le code. Pas de fichier de doc entretenu « pour la forme ».

