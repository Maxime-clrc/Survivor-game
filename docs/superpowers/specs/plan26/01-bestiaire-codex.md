# 01 · Bestiaire / Codex (brief §3)

## Ce qui existe déjà et qui porte le chantier

- `shared/enemies.js` : `ENEMY_TYPES` (9 fiches), `TRAITS` (6 traits nommés :
  Ruée, Traînée, Salve, Frénésie, Spores, Aura), `ELITE_INTERDIT` (variantes
  élite exclues par type), `ROLE_CFG`, `adaptType(index, minute)` — le
  bestiaire a déjà une richesse de données largement suffisante pour des
  fiches, rien à inventer côté contenu.
- `shared/bosses.js` : 10 boss nommés (`BOSS_RAVAGEUR` … `BOSS_SILENCE`) +
  `BOSS_FINAL`, tirés par `BOSS_POOL_COUNT = 5` par partie, et un registre de
  **32 mécaniques** (`MECHS`, avec `nom`, `minPlayers`, `fallback`) — c'est
  exactement la matière d'une fiche boss riche (§3 : « attaques/mécaniques
  déjà rencontrées »).
- `shared/hauts_faits.js` a déjà un mécanisme de récompenses nommées et de
  déblocage par compte (`progress_store.js`) — le même mécanisme peut porter
  « vu en jeu » pour une entité du bestiaire, sans nouveau sous-système de
  persistance.

## Limite actuelle / cause réelle

Il n'existe **aucun** compteur « ce joueur a vu cette entité » nulle part
dans le dépôt (`grep -rn "vu\b\|decouvert\|discovered" shared/` ne remonte
rien côté bestiaire). Ce n'est pas un manque d'UI, c'est une donnée absente
à la source : le chantier commence côté simulation/persistance, pas côté
écran.

## Cible

Un écran Codex intégré au menu (dépend de `03-menu-architecture.md`), avec
deux listes (Ennemis, Boss), chaque entrée masquée en « ? » jusqu'à
rencontre, fiche déverrouillée au premier contact confirmé.

## Décomposition

1. **Donnée de découverte (append-only, par compte)**
   - Ajouter deux compteurs dans le magasin de progression existant
     (`progress_store.js`, aux côtés de ce que `hauts_faits.js` persiste déjà) :
     un `Set`/bitmask d'index `ENEMY_TYPES` vus, un bitmask des index
     `BOSS_ROSTER` vus. Utiliser un bitmask (comme `traitBit` le fait déjà
     pour les traits) plutôt qu'un tableau : 9 ennemis + 11 boss tiennent
     dans un entier, cohérent avec la convention « tableaux exportés
     ordonnés, append-only » de `CLAUDE.md`.
   - Écriture au moment du spawn côté serveur (`_spawnEnemy`, l'arrivée d'un
     boss) — un seul point d'écriture, le hub reste seul à écrire dans le
     magasin (invariant `CLAUDE.md`).
2. **Transport réseau**
   - Le compteur de découverte est un état de compte, pas un état de partie :
     il n'a pas besoin de voyager dans le snapshot par tick. Le transmettre
     une fois à la connexion (comme les hauts faits déjà acquis) et le
     mettre à jour par message ponctuel à la première rencontre — pas de
     champ supplémentaire dans les instantanés positionnels.
3. **Écran Codex**
   - Nouveau fichier `public/ui/codex.js` (même famille que `build.js`,
     `cadres.js`) : grille filtrable Ennemis/Boss, carte « ? » vs carte
     déverrouillée, réutilise le style de carte des Hauts faits une fois ce
     dernier refondu (`04-hauts-faits.md`) pour une cohérence visuelle
     immédiate entre les deux écrans de collection.
   - Fiche ennemi : nom, sprite (déjà dans `public/sprites.js`), rôle/traits
     lus directement depuis `ENEMY_TYPES`/`TRAITS` — pas de duplication de
     texte, la fiche est une vue sur la donnée existante + un champ de lore
     à écrire (nouveau, court, par entité).
   - Fiche boss : identité, visuel, **liste des mécaniques déjà vues** —
     dérivée du même compteur bitmask que ci-dessus mais au niveau mécanique
     (`MECHS`), pas seulement au niveau boss, pour remplir « attaques déjà
     rencontrées » sans étage de donnée supplémentaire.

## Fichiers à modifier/créer

- `progress_store.js` — persistance des deux bitmasks
- `hub.js` — écriture au spawn (seul point d'écriture)
- `shared/enemies.js` / `shared/bosses.js` — pas de modification de structure,
  seulement lecture ; ajouter le champ `lore` (court, FR sans accents côté
  code comme le reste du fichier) sur chaque entrée
- `public/ui/codex.js` — nouveau
- `public/ui/dom.js`, `public/ui/screens.js` — enregistrement aux 9 points
  (voir `04-hauts-faits.md` pour la checklist exacte, à appliquer ici aussi
  dès la création pour ne pas reproduire le bug trouvé sur Hauts faits)
- `docs/regles/RESEAU.md`, `docs/regles/CONTENU.md` — documenter le nouveau
  compteur

## Risques

- Faible sur simulation/réseau (état de compte, pas de tick).
- Le vrai risque est **organisationnel** : ne pas répéter l'erreur
  d'enregistrement partiel qui a cassé `#hautsFaits` (plan 25). Utiliser la
  checklist des 9 points dès l'écriture du premier commit de cet écran.

## Décision à trancher avant de coder (le brief ne tranche pas)

Découverte **par compte** (persistée, cohérent avec Hauts faits, valorise la
progression long terme) vs **par partie** (plus simple, mais perd son intérêt
de collection). Recommandation : par compte — c'est la seule option qui
justifie un écran de collection.
