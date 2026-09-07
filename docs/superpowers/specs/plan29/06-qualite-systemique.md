# 06 · Qualité systémique — transverse, en dernier

## 6a · Le schéma de bug qui traverse quatre plans

Cinq bugs distincts des plans 25 à 28 partagent **la même forme** : un élément
a une entrée mais pas la sortie symétrique qui devrait l'accompagner.

- écran Hauts faits enregistré à 1 point d'accroche sur 9 ;
- ordre de boss qui sonne l'alerte météo mais jamais `msg.mech` ;
- Codex écrit en fin de manche au lieu de l'instant de rencontre ;
- trace de matière dessinée au centre de la cellule sondée, pas au point rendu ;
- une carte à la fois injouable et invisible.

Chacun a été trouvé par playtest ou relecture ponctuelle. **Aucun n'a été
trouvé en cherchant la classe de bug elle-même.** Rien ne garantit qu'il n'y a
pas un sixième cas.

Le dépôt nomme d'ailleurs déjà ce danger : `CLAUDE.md` identifie le bug qui
« ne lève aucune erreur et produit du silence » comme le risque n°1 du projet.

### Méthode — balayage des symétries attendues

Vérifier mécaniquement, pas au fil de l'eau :

- tout écran a-t-il ses 9 points d'enregistrement (checklist connue du plan 25) ?
- tout son d'apparition a-t-il son pendant de fin/disparition ?
- tout gain (XP, carte, relique, haut fait, arme) a-t-il son accusé de
  réception visuel **et** sonore ?
- toute donnée de compte (bestiaire `vus`, `hf`, `cadres`, `kills`) s'écrit-elle
  à l'instant réel de l'événement et non au bilan ?
- toute constante de `CFG` a-t-elle au moins un lecteur ? (le dépôt a déjà eu
  `WAVE_HP_POWER_K: 0` et `WAVE_RATE_POWER_K: 0` — deux leviers à zéro, donc
  inertes : intentionnel ou vestige ? à trancher)

Sortie attendue : les corrections trouvées, pas un rapport de méthode.

## 6b · Les sept archétypes de build

`0.30.7` a mesuré que **2 archétypes sur 7 étaient inatteignables** — des
badges que personne ne pouvait obtenir. Un seul cas est nommé comme corrigé
(démolition : 4 cartes disponibles pour un seuil de détection à 3, cassé par la
dépendance à la carte grenade). **Le second n'est pas nommé.**

La méthode qui l'a trouvé (300 manches simulées par politique, en jouant *pour*
l'archétype, en comptant les cartes réellement disponibles compte tenu de
`lockedCards`) n'a apparemment servi qu'une fois, sur signal externe. La
rejouer sur les 7, pas seulement vérifier que démolition reste corrigé.

Point d'attention supplémentaire issu du chantier 05 : `lockedCards` dépend des
hauts faits obtenus. Un archétype peut donc être atteignable pour un compte
avancé et inatteignable pour un compte neuf — la mesure doit se faire **à
plusieurs états de progression**, pas seulement à contenu complet.

## 6c · Contribution réelle du Tank et du Soigneur

Aujourd'hui seul le DPS brut est mesuré (`verifierClasses` compare des
vitesses). Rien n'agrège les contributions indirectes, alors que les
constantes existent (`SKILL_CFG` : rayons de Provocation, Rempart, Mode soin,
`GUARD_RADIUS`, `THORNS_RADIUS`).

Ce qui manque pour répondre honnêtement à « le rôle est-il satisfaisant ? » :
PV évités par la Provocation, PV soignés, relèvements, temps de vie d'équipe
gagné, dégâts rendus possibles aux autres.

Étapes : vérifier ce que `traces/*.jsonl` logue déjà (l'agrégation peut être un
script d'analyse pur si les événements y sont) ; sinon ajouter les événements
manquants au point d'écriture existant (`telemetry.js`), sans créer un second
système de log.

**Ce chantier conditionne deux autres** : les hauts faits de coopération
(chantier 05) et l'évaluation du risque de second ordre de C1 (chantier 03 —
ajouter de la horde pendant les boss renforce mécaniquement Tank et Soigneur ;
sans mesure de contribution, on ne saura pas de combien).

## 6d · Tests de régression sur le mode de contrôle des armes

Le chantier 02 touche `_teslaTir` et potentiellement la boucle de faisceau. Ces
codes sont partagés ou voisins. Écrire, pour chacune des 10 armes, un test
vérifiant que son mode de contrôle par défaut (auto / tenu / clic) et son
`tir` (`balle`, `faisceau`, `arc`, `arc_sol`, `grenade`) sont inchangés après
les modifications de ce plan.

C'est exactement 6a appliqué en prévention plutôt qu'en constat.

## 6e · Rejouer les vérificateurs en fin de plan

État de référence au 2026-09-02, à retrouver ou améliorer :

| vérificateur | état actuel |
|---|---|
| `verifierCartes` | vert |
| `verifierReliques` | vert |
| `verifierBonus` | vert |
| `verifierEquilibreArmes(3,10)` | **6 problèmes** (cible : 0) |

Aucun chantier de ce plan ne doit être considéré comme livré si l'un des trois
verts est passé au rouge.

## Fichiers

- suite de vérification (`shared/game_state.js`, à côté des `verifier*`)
- `telemetry.js` (6c, si des événements manquent)
- `shared/cards.js` (6b, si un archétype doit être corrigé)
- scripts de test jetables (6d), idiome `CLAUDE.md`
