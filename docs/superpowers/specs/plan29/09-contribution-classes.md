# 09 · Contribution réelle des classes — le prérequis de trois autres chantiers

Promu en P0 depuis le chantier 06 : ce n'est pas de la qualité systémique, c'est
une mesure manquante qui **bloque** trois décisions ailleurs dans ce plan.

## Le problème

`verifierClasses(manches, effectifs)` existe mais compare des **vitesses**. Rien
n'agrège les contributions indirectes. Or, comme le dit le brainstorming : le
DPS brut du Soigneur n'a aucune raison d'être compétitif avec celui du Tireur.
Tant qu'on ne mesure que le DPS, on ne peut ni valider ni invalider l'équilibre
des rôles — on ne peut qu'avoir un avis.

## Ce que ça bloque

1. **Chantier 03 (horde pendant les boss)** — ajouter de la pression pendant un
   boss renforce mécaniquement Tank et Soigneur. Sans mesure de contribution, on
   ne saura pas de combien, ni si le solo devient injouable.
2. **Chantier 05 (hauts faits de coopération)** — un haut fait « soigner X PV »
   suppose de savoir ce que X vaut. Aucune donnée aujourd'hui.
3. **Équilibrage des rôles lui-même** — la question « le rôle est-il
   satisfaisant ? » n'a pas de réponse mesurable en l'état.

## Grandeurs à agréger

Au-delà du DPS :

| grandeur | rôle concerné | source probable |
|---|---|---|
| dégâts évités | Tank (Alliage, Garde, Rempart) | `damageTakenMul`, `guardAura` au point d'application |
| dégâts détournés | Tank (Provocation) | ciblage d'ennemi redirigé |
| PV soignés | Soigneur (Flux, liens) | `_heal()` |
| relèvements | Soigneur (Relève) | déjà dans `statsVierges` : `revives` |
| dégâts rendus possibles | Soigneur (Catalyse) | `catalyse` appliqué aux alliés liés |
| temps de survie d'équipe gagné | tous | dérivé |
| TTK boss influencé | tous | comparaison avec/sans |

Les constantes existent déjà (`SKILL_CFG` : rayons de Provocation, Rempart,
Mode soin, `GUARD_RADIUS`, `THORNS_RADIUS`), donc les événements sont
probablement déjà produits dans la simulation.

## Étapes

1. **Inspecter `traces/*.jsonl` d'abord.** Si les événements nécessaires y sont
   déjà, l'agrégation est un **script d'analyse pur** — aucun changement de
   simulation, aucun risque. C'est le cas le plus probable et il faut l'écarter
   avant d'ajouter quoi que ce soit.
2. Si des événements manquent, les ajouter au point d'écriture de télémétrie
   existant (`telemetry.js`), **pas** dans un second système de log.
3. Produire un banc de compositions, sur le modèle du brainstorming :

```
SOLO : DPS · TANK · HEAL
DUO  : DPS+DPS · DPS+TANK · DPS+HEAL · TANK+HEAL
TRIO : TANK+HEAL+DPS · DPS×3
QUATUOR : 4 DPS · 2+1+1 · ...
```

   Pour chaque composition : DPS apporté, dégâts évités, dégâts indirectement
   permis, temps de survie, TTK boss, horde nettoyée.

4. **Ne pas viser l'égalité.** L'objectif est une **diversité viable** : aucune
   composition obligatoire, aucune composition non viable. Le critère
   d'acceptation est « aucune composition ne rend une manche impossible » et
   « aucune n'est strictement dominante », pas « toutes ont le même DPS ».

## Point d'attention

Le solo est le cas limite : une composition à un joueur ne peut pas avoir
Tank+Soigneur. Si Tank et Soigneur deviennent forts en équipe, le solo doit
rester jouable sur les trois classes — mesurer les trois en solo, pas seulement
le Tireur.

## Fichiers

- `telemetry.js` (si des événements manquent)
- `shared/game_state.js` — `verifierClasses` étendu ou nouveau banc
- script d'analyse de `traces/*.jsonl`
- `docs/regles/SIMULATION.md`
