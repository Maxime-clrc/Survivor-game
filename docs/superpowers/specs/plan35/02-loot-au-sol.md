# 02 · Le loot tombe au sol et il faut passer dessus

## Ce qui existe et qu'on réutilise

| pièce | rôle |
|---|---|
| `_poserBonus(type, x, y)` | LA pose au sol — les cinq sources y passent |
| `POWERUP_TYPES` | table append-only, index réseau |
| `_powerups(dt)` | durée de vie et ramassage |
| `bonusFamille(cle)` (`feedback.js`) | ce qu'un objet **dit** : socle, gerbe |
| `POWERUP_MAX_GROUND` / `FRAGMENT_MAX_GROUND` | **deux plafonds séparés existent déjà** |

Le fragment de la carte Récolte est le modèle : un objet au sol avec son propre
plafond, sa propre famille visuelle, et qui ne vole pas la place d'un bonus.

## La décision qui change tout : pas de rayon de ramassage

Aujourd'hui :

```js
const reach = (CFG.PLAYER_RADIUS + CFG.POWERUP_RADIUS + p.mods.pickupRadius)
  * p.mods.pickupRadiusMul;
```

**Le loot ignore `pickupRadius` et `pickupRadiusMul`.** Il se ramasse à
`PLAYER_RADIUS + LOOT_RADIUS`, sans terme de build. **Il faut passer dessus.**

Trois conséquences, toutes bonnes :

- **le ramassage redevient un geste** — passer sur un point précis pendant qu'une
  horde arrive est une prise de risque, donc une décision ;
- **une asymétrie avec les bonus** — un bonus se ramasse de loin, un loot de près.
  C'est une information qu'on apprend une fois, **à condition que le loot le
  DISE** : socle plus petit, halo plus serré, matière différente. `bonusFamille()`
  est l'endroit où ça s'écrit ;
- **`pickupRadius` perd de la valeur** — elle en garde assez (bonus, fragments,
  éclats), mais c'est une statistique dont la valeur change sans qu'on l'ait
  touchée. À noter pour l'équilibrage.

## Les cinq choses qui cassent

**1 · `POWERUP_LIFE = 22 s`.** Le loot vit **des minutes**, pas des secondes. La
durée devient un champ **par objet**. Et la **cendre** (météo), qui raccourcit
`max`, ne s'applique pas au loot : un loot gagné dans une tempête qui disparaît
plus vite qu'un autre, personne ne le comprendra.

**2 · Le point de chute.** `_powerups` tire dans `this.bounds`, c'est-à-dire dans
toute l'arène. Le loot doit tomber **là où l'objectif a eu lieu** — sur le cadavre
du mini-boss, dans la zone du contrat. `_dropPoint(x, y, margin)` prend déjà une
position.

**3 · Le plafond au sol.** Un troisième plafond, et il doit être **généreux** :
un loot qui n'apparaît pas parce que le sol est plein est un loot volé.

**4 · Le filtre de vue.** Un loot posé hors écran est invisible, et un loot qu'on
ne voit pas tomber n'est pas un loot — c'est un piège. Le loot tombe toujours près
de ce qu'on vient de faire, donc dans la vue : **le cas ne devrait pas se
produire**, et un vérificateur doit le confirmer plutôt qu'on l'espère.

**5 · Les fragments passent sous le boss depuis la bascule WebGL.** Limite connue
et documentée. À vérifier avant de faire tomber du loot pendant un combat.

## Instancié par joueur

Chacun voit et prend son exemplaire. Ça supprime d'un coup les quatre risques du
brainstorm — conflit, vol, joueur prioritaire, arbitrage permanent — et c'est
cohérent avec les cartes, déjà individuelles (`cardOffers` est une `Map` par
identifiant). Le vocabulaire visuel existe : `ownerColorOf`, et le champ `pj` sur
les zones porte déjà « à qui ».

**Le loot partagé à négocier serait mauvais en LAN de trente minutes** : il arrête
le jeu pour arbitrer, au moment où deux cents corps arrivent.

**Nuance conservée** : un loot instancié reste **reposable**. Un joueur qui ramasse
une lentille critique dont il n'a que faire peut la reposer pour l'équipe. Geste
volontaire, hors combat, sans arbitrage — et ça rend vrai « le DPS prend les
dégâts, le Tank la défense » sans en payer le coût.

## Sa nature change avec la rareté

- **commun** — une statistique plate. Lisible, cumulable, et **elle ne crée aucune
  décision** : personne ne refuse +1 dégât. C'est du fond de panier ;
- **rare** — le loot tombe en deux versions, on en prend une. C'est une carte, en
  plus rapide et sans figer la simulation ;
- **dangereux** — une conversion avec contrepartie : `+15 % dégâts, −10 % PV max`.
  C'est ce qui rend un loot mémorable, et le dépôt sait déjà le faire —
  `hpToDamage`, `damageToHp`, `shieldToDamage` sont exactement des conversions.

## Comment il entre dans les statistiques

`_recomputeMods(p)` est le point de passage unique. La chaîne actuelle :

```
computeMods(cartes) → appliquerEchelle(arme) → classe → conversions
                    → applyMeta(profil)      → RELIQUES → plafonnerHp()
```

**Le loot s'insère entre la méta et les reliques.** Et il voyage comme une **liste
d'identifiants**, pas comme des mods : c'est déjà le modèle des cartes et des
reliques, et le HUD rejoue `myMods` de son côté.

## Ce qu'il ne verse jamais

**De l'XP.** Voir plan 34 lot 02 : la règle est déjà respectée par le code
existant.

## Critère d'acceptation

1. Un loot **n'est jamais ramassé** par un joueur qui passe à `pickupRadius` de
   distance sans passer dessus. Test direct, avec une build à `pickupRadius`
   maximal.
2. Un loot tombé est **dans la vue** du joueur qui l'a mérité, dans 100 % des cas
   sur trois manches de bots.
3. La durée de vie n'est pas raccourcie par la cendre.
4. Un loot reposé au sol est ramassable par un autre joueur.
5. `verifierBonus()` et `verifierFeedback()` restent verts.

## Nature de la tâche

Le pipeline est là ; la pose et le ramassage se délèguent. **Le point de chute, le
troisième plafond et la famille visuelle sont du jugement** : fil principal.
