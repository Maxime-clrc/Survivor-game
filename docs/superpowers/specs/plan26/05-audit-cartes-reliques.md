# 05 · Audit cartes / reliques / builds (brief §7, §8, §10)

Données extraites par script depuis `shared/cards.js` (voir méthode en fin
de fichier — reproductible, pas un audit lu à l'œil sur 178 entrées).

## 1 · Vue d'ensemble

- **178 cartes** (et non 185 — un des chiffres retenus en mémoire de projet
  datait d'avant nettoyage). Répartition par rareté : 54 commune / 58 peu
  commune / 37 rare / 29 épique-légendaire.
- Par tag : `off` 120, `def` 50, `coop` 25, `util` 9, `cadence` 8 (une carte
  peut porter plusieurs tags).

## 2 · Constat principal : le catalogue a déjà deux familles, pas une

Le brief pose la question en ces termes : *quelles cartes créent une
nouvelle façon de jouer et lesquelles ajoutent une variation numérique ?*
L'audit montre que le catalogue distingue déjà, en pratique, deux familles :

### A. Des échelles de puissance verticales (légitimes, à conserver)

Plusieurs cartes plates forment des **paliers d'une même échelle**, une par
rareté, et ne sont pas redondantes entre elles :

| échelle | commune | peu commune | rare | épique/légendaire |
|---|---|---|---|---|
| cadence de tir | `culasse` (−7 %) | `cadence` (−16 %) | `rotative` (−28 %) | `chaine_assaut` (−40 %, **et retire la surchauffe** — voir §5) |
| dégâts plats | `affutage` (+12 %) | `calibre` (+25 %) | `canon_surdimensionne` (+45 %) | — |
| critique | `precision` (+6 %) | `mire` (+12 %) | `oeil_de_faucon` (+20 %/+50 %) | `sentence_capitale` (+25 %/+50 %, effet de traversée) |
| recharge de compétence | `condensateur` (−7 %) | `surtension` (−15 %) | `flux_continu` (−25 %, +ricochet kill) | `dynamo` (−45 %, +ricochet kill) |
| réduction de dégâts subis | `sangles` (−4 %) | `cuir` (−10 %) | — | — |

**Verdict : conserver telles quelles.** C'est le squelette de progression
verticale du run — sans lui, il n'y a pas de sensation de montée en
puissance entre le tour 1 et le tour 20. Le brief risquait de les classer en
« variation numérique » à tort ; l'audit les distingue explicitement.

### B. Un vrai cluster de redondance : portée/vitesse de balle

| carte | rareté | effet |
|---|---|---|
| `poudre` | commune | +12 % vitesse balle |
| `canonLong` | commune | +25 % portée |
| `chargeur_long` | peu commune | +45 % portée, +10 % vitesse |
| `canon_siege` | rare | +75 % portée, +20 % vitesse |
| `horizon` | légendaire | +150 % portée, +40 % vitesse, +1 pénétration |

Contrairement au cluster A, celui-ci **mélange deux stats (portée, vitesse)
sans règle de progression claire** — `poudre` et `canonLong` sont deux
cartes séparées pour un seul palier de puissance, alors que `chargeur_long`
fait déjà les deux à la fois. **Verdict : fusionner `poudre` et `canonLong`**
en une seule carte commune « portée + vitesse » pour clarifier la lecture ;
garder `chargeur_long` → `canon_siege` → `horizon` comme la vraie échelle.

### C. Cartes-graines de build déjà présentes (contredit une partie du risque du brief)

Le catalogue a déjà des cartes qui **modifient une règle plutôt qu'une
statistique** — exactement ce que le brief demande en §7 :

- `elan` : dégâts croissants sans être touché (jusqu'à +25 %) → graine
  d'archétype *sniper/kiting*.
- `meute` : dégâts croissants par ennemi proche (jusqu'à +30 %) → graine
  *forteresse/mêlée*.
- `adrenaline` : cadence sous 50 % PV → graine *berserker*.
- `symbiose` : dégâts par carte défensive possédée → graine *hybride
  tank-dégâts*, unique car elle relie explicitement les tags `off`/`def`.
- `austerite` : +30 % dégâts tant qu'aucune épique/légendaire prise → graine
  *build minimaliste*, contrepartie sur le choix de cartes plutôt que sur
  une stat.
- `dette` / `contrat` : dégâts contre coût d'équipe / PV plafonnés → graines
  *glass cannon*.
- `catalyseur` : dégâts contre cible affectée d'un état → graine
  *statut/contrôle*, relie aux 4 états de `shared/statuses.js`.

**Verdict : ce sont déjà des « cartes clé de build » au sens du brief.** Le
travail du chantier n'est donc pas d'en créer depuis zéro mais de :
1. vérifier qu'elles sont assez visibles/choisies en jeu (télémétrie —
   voir `traces/*.jsonl`, déjà collecté) ;
2. leur donner une reconnaissance visuelle une fois l'archétype engagé
   (rejoint §17, voir `README.md` §5 — recommandation de fusionner ce
   sous-chantier ici plutôt que d'en faire un chantier séparé).

## 3 · Matrice d'archétypes (première version, à confirmer par télémétrie)

| archétype proposé par le brief | cartes-graines déjà identifiées | statut |
|---|---|---|
| Incendiaire | cartes famille feu (à cartographier — hors extraction ci-dessus, nécessite un passage sur les tags d'effet de statut, pas seulement `tags`) | à auditer en phase suivante |
| Sniper | `elan`, cluster portée/vitesse (§2.B), `prec_portee`/`prec_marque` (spécifiques fusil de précision) | **confirmé, bien fourni** |
| Forteresse | `meute`, `symbiose`, cluster réduction de dégâts (`sangles`→`cuir`) | **confirmé** |
| Berserker | `adrenaline`, `dernier_souffle` (+80 % sous 25 % PV), `contrat` | **confirmé, dense** |
| Technicien | `catalyseur`, `flux_continu`/`dynamo` (recharge) | partiellement confirmé — dépend du volume de cartes de compétence hors extraction |
| Acrobat/Mobilité | `celerite`, `vif_argent` (esquive + traînée de dégâts) | peu de cartes trouvées — **à surveiller, risque d'archétype creux** |
| Démolition | cluster rayon d'explosion (`expansion`→`deflagration`→`singularite`→`cataclysme`) | **confirmé, échelle propre** |

**Recommandation : ne nommer/badger officiellement que les archétypes
« confirmé »/« confirmé, dense » en V1** (Sniper, Forteresse, Berserker,
Démolition). Acrobat/Mobilité doit être étoffé ou retiré avant d'être promu
en badge visible, sous peine d'exposer un archétype dont le joueur ne
trouvera pas assez de pièces en jeu — c'est exactement le risque que le
brief demande de signaler (§19.13).

## 4 · Reliques (brief §10)

35 reliques réparties en 4 tiers (0 à 3). Contrairement aux cartes, la
structure par tier suggère déjà une intention de progression verticale
propre. L'audit complet élément par élément (doublons de fonction) n'a pas
été fait ligne à ligne dans cette phase — méthode proposée pour la suite :
même script d'extraction que pour les cartes, catégorisation par effet
(`apply`) plutôt que par nom, recherche de paires `(tier, effet similaire)`
comme au §2.B.

**Point de vigilance identifié sans script** : `shared/game_state.js:3705`
contient un commentaire du code lui-même signalant qu'une relique de
chaleur sur un railgun (qui n'a pas la propriété `chaleur`) est un
« emplacement d'offre perdu » — c'est-à-dire que le système d'offre de
reliques peut déjà proposer une relique inapplicable à l'arme portée. Ce
bug d'exposition (pas de simulation) doit être corrigé indépendamment de la
refonte de contenu, et devient plus visible si la carte de surchauffe
manuelle (chantier 9) ajoute une deuxième arme à chaleur.

## 5 · Orbiteurs / Surcharge orbitale (brief §8)

- `orbiteurs` (rare) : +2 lames tournantes par charge, jusqu'à 3 charges (6
  lames), 25 dégâts au contact, rayon `CARD_CFG.ORBIT_RADIUS`.
- `surcharge_orbitale` (peu commune) : +60 % de dégâts aux lames, **requiert**
  `orbiteurs` (`requires: ["orbiteurs"]`).
- Les deux sont marquées `horsEchelle: true` — un signal explicite dans le
  code que ce mini-système est déjà traité à part du reste de l'équilibrage
  standard, cohérent avec la remarque du brief (« mini-système autonome »).

**Ce que l'audit ne peut pas trancher sans mesure en jeu** : impact réel sur
DPS/survie en horde et en boss. Recommandation de méthode (à exécuter avant
la décision conserver/fusionner/rework/remplacer) :
1. Utiliser le protocole `?banc` existant (densité réglable, relevé `R`) avec
   un profil « orbiteurs x3 + surcharge » contre un profil de DPS équivalent
   investi ailleurs (ex. `calibre`+`canon_surdimensionne`), à dégâts de build
   comparables.
2. Mesurer séparément le DPS en cible unique (boss) et en zone (horde), le
   système orbital étant par nature meilleur en AoE constant qu'en burst
   ciblé — c'est l'hypothèse à vérifier, pas à supposer.
3. Si le DPS horde est significativement supérieur au DPS boss pour un même
   investissement de cartes, la relique/carte candidate à ajouter est une
   **contrepartie identitaire** plutôt qu'un pur ajustement numérique
   (ex. les lames ralentissent en présence d'un seul ennemi, forçant un vrai
   choix de build plutôt qu'un bonus toujours bon) — cohérent avec la
   consigne du brief de lui donner « une vraie identité de build ».

## 6 · Fichiers concernés

- `shared/cards.js`, `shared/reliques.js` (contenu)
- `shared/game_state.js` (application des mods, `_relicSum`, `mods.orbiter*`)
- `docs/regles/CONTENU.md` (documenter les échelles A et les fusions décidées)

## 7 · Méthode d'extraction (reproductible)

```js
import("./shared/cards.js").then(m => {
  const cards = m.CARDS;
  // grouper par cluster de mots-clés dans desc, croiser avec rarity pour
  // distinguer échelle verticale (A) de doublon (B)
});
```
Le script complet utilisé pour ce fichier est fourni dans l'archive
(`sim/audit_cartes.mjs`) pour être rejoué après tout changement de
catalogue.
