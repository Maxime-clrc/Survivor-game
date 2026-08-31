# Survivor LAN — plan 27 : le contenu que plan 26 n'a pas ouvert

Plan 26 a livré 25 lots (v0.28.8 → v0.29.24) et couvert §1-§7, §10, §13-§17 du
*Brief brainstorming — évolution AAA*. **Quatre sections restent fermées**, et
elles forment un bloc cohérent : elles touchent toutes les cartes, les reliques
et les builds — c'est-à-dire le seul domaine que plan 26 a explicitement
reporté.

| § du brief | sujet | état à la sortie de plan 26 |
|---|---|---|
| **§8** | lame orbitale : palier de rareté justifié ? | protocole `?banc` proposé, **jamais exécuté** |
| **§9** | chaînes de cartes-graines | 1 carte sur 4 livrée (Chambre thermique, v0.29.22) |
| **§11** | reliques comme décisions stratégiques | audit **explicitement reporté** par plan 26 lui-même |
| **§12** | matrice de builds | annoncée comme livrable, **jamais produite** |

## La leçon de plan 26, qui vaut règle ici

Plan 26 a été écrit contre un instantané du dépôt antérieur à la 0.28 : **six
chantiers sur huit décrivaient des problèmes déjà corrigés**, et un septième
reposait sur une prémisse fausse (« la chaleur, c'est le système du laser,
réutilisé » — en réalité la chaleur était soudée à la *délivrance en faisceau*,
et `chaleur: true` sur une arme discrète l'aurait fait tirer deux fois).

**Chaque chantier de plan 27 porte donc sa mesure, relevée le 2026-08-31 contre
le dépôt réel**, et aucun ne demande d'écrire avant d'avoir refait le relevé.
Un chiffre de ce plan qui ne se retrouve pas dans le code est un chiffre périmé,
pas une cible.

## Fichiers

| fichier | § | nature |
|---|---|---|
| `01-reliques-decisions.md` | §11 | audit livré + conception |
| `02-chaine-surchauffe.md` | §9 | architecture, puis contenu |
| `03-lame-orbitale.md` | §8 | mesure, puis décision |
| `04-matrice-builds.md` | §12 | relevé |

## Ordre

`01` d'abord : c'est le seul dont l'audit est déjà fait et chiffré, donc le seul
qui peut commencer par écrire.

`02` ensuite, mais il commence par **une décision d'architecture** (§2.3 de son
fichier) et non par du contenu — trois cartes écrites avant cette décision
seraient à jeter.

`03` et `04` sont des **mesures**, pas des livraisons : ils produisent un
verdict. `04` a besoin de `01` et `02` livrés pour que sa matrice décrive
l'état final plutôt qu'un état intermédiaire.

## Ce que ce plan ne touche pas

- **Aucun index de tableau ordonné n'est inséré au milieu.** `CARDS` et
  `RELICS` circulent par index ; tout ajout est en fin de tableau, toute
  suppression est proscrite (voir `01` §4 pour la seule alternative retenue).
- **Aucun champ d'instantané nouveau** n'est prévu. Si un chantier croit en
  avoir besoin, la question à poser d'abord est celle de `CLAUDE.md` : la
  valeur est-elle une fonction de ce que le client a déjà ?
- **Le visuel** reste hors plan. La position de l'auteur du dépôt est
  « j'aviserai en jouant ».

## Vérificateurs

Chaque lot étend un `verifier*()` existant plutôt que d'en créer un nouveau, et
**le rougissement se prouve par mutation avant d'être noté vert**. Les deux
concernés ici sont `verifierCatalogue()` et `verifierBuilds()`
(`shared/cards.js`). Les reliques n'en ont aucun — `01` en crée le premier.
