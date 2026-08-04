# Plan v3 — index

Cinq lots. Les deux premiers sont courts et corrigent des défauts constatés en
jeu ; les trois suivants ajoutent du contenu.

| # | lot | nature | dépend de |
|---|---|---|---|
| A | [Lisibilité et correctifs](A-lisibilite-correctifs.md) | dette | — |
| B | [Coups critiques et axes de cartes](B-critique-cartes.md) | contenu | — |
| C | [Troisième compétence](C-troisieme-competence.md) | contenu | B |
| D | [Progression permanente](D-progression.md) | système | B |
| E | [Refonte des zones au sol](E-zones.md) | visuel | — |

A et E sont indépendants de tout. B doit précéder C et D, parce que le système
de critique et la clé `areaMul` sont consommés par les deux.

## Décisions verrouillées

Arbitrées en amont. Ne pas les rouvrir sans raison :

- **Les cartes sont absorbées par la difficulté, la méta ne l'est pas.**
  `_teamPower()` continue de piloter les vagues et les boss à partir des seules
  cartes. La puissance permanente est un gain net, borné par les emplacements.
- **Plafonnement par emplacements**, pas par valeurs. On débloque définitivement,
  on n'équipe que N points par partie, réattribution libre au salon.
- **Emplacements propres à chaque classe**, monnaie commune au compte.
- **La monnaie vient de la performance d'équipe** — vague atteinte, boss
  vaincus — versée à parts égales. Jamais des kills individuels.
- **Les cartes se déverrouillent par jalons, pas par monnaie.** Les deux
  systèmes ne partagent pas de ressource.
- **Progression par classe** : améliorer le tank ne bénéficie pas au tireur.

## L'asymétrie à connaître avant de commencer

`_playerPower()` ne mesure que l'offensif :

```js
return m.damageMul * barrels * catalyseur * (1 + m.echoChance) / m.fireIntervalMul;
```

Donc une carte de dégâts est taxée à 55 % par `WAVE_HP_POWER_K`, une carte de
PV ne l'est pas du tout. C'est déjà vrai aujourd'hui pour les cartes, et c'est
le motif pour lequel la méta est explicitement exclue du calcul : sans ça, les
arbres du Rempart et du Tireur auraient des rendements différents sans que
personne ne comprenne pourquoi.

**Ne pas « corriger » `_playerPower` en y ajoutant la survie** sans mesurer
d'abord : ça rendrait les vagues nettement plus dures pour toute build
défensive, y compris celles qui existent déjà.

## Invariants du dépôt

Inchangés, à relire avant chaque lot (`CLAUDE.md`) :

- `shared/game_state.js` ne référence jamais le DOM, le canvas, le clavier, le
  réseau ni le système de fichiers.
- Snapshots en append-only, lecture client avec repli.
- Tableaux exportés ordonnés, index circulant sur le réseau.
- Tout ce qui blesse passe par `_hurt()` / `_damage()`.
- Les systèmes lisent `p.mods`, jamais la liste de cartes.
- Le serveur valide tout choix client.
- Commentaires et identifiants en français sans accents, chaînes affichées avec
  accents.
- Mesurer, ne pas extrapoler.

## Une règle nouvelle, à ajouter à `CLAUDE.md`

**Toute mesure doit préciser son profil de compte.** À partir du lot D, une
campagne sans mention du profil ne veut plus rien dire. Deux références :
*compte neuf* (aucune amélioration, aucune carte déverrouillée) et *compte
maximal* (tous les emplacements remplis).
