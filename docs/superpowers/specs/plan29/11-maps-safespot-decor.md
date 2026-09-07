# 11 · Maps — safe spot, finitions de décor, map ↔ gameplay

## 11a · Safe spot — distinguer l'abri voulu de l'exploit (P1)

`docs/screens/zone safe.png` montre une position où la horde n'atteint jamais
le joueur.

**Attention avant de corriger** : le dépôt a un mécanisme **voulu** de garantie
d'abri sous le feu (`verifierMecaniques` — un joueur doit pouvoir trouver un
abri en cauchemar). Corriger l'exploit sans distinguer les deux casserait une
fonctionnalité.

### Étape 1 — écrire le test qui sépare les deux cas

- **Test A (abri voulu)** : le joueur atteint un état hors d'atteinte pendant
  une fenêtre **bornée**, après quoi la horde le reconteste — par contournement,
  par un rôle à distance (`ROLE_CFG` dans `enemies.js`), ou par expiration d'un
  timer.
- **Test B (exploit)** : le joueur reste hors d'atteinte **indéfiniment**,
  aucun type d'ennemi ne pouvant jamais le contester.

Si B est vrai sur la position de la capture, c'est l'exploit. Si seul A l'est,
ne pas y toucher — vérifier seulement que la fenêtre n'est pas trop généreuse.

### Étape 2 — chercher la classe de géométrie, pas la position

Rejouer le test sur les géométries réelles des **5 lieux**. Corriger la *forme*
qui produit le défaut (angle de mur, largeur de couloir, empilement
d'obstacles), pas la seule position photographiée — sinon le même défaut
réapparaîtra ailleurs.

`NAV_CAS` (`game_state.js`) contient déjà 10 formes de navigation en dur
(cloison mince, poche en U, goulet, couloir étroit…) avec ce raisonnement
exact : *« ce ne sont pas des lieux du jeu, ce sont les FORMES qui cassent un
évitement local »*. **La poche de la capture doit devenir un 11ᵉ cas de cette
table**, pas un correctif ponctuel.

### Étape 3 — le reste

Ennemis coincés sur une face, mauvais côté de mur choisi, tailles d'ennemis,
rôles incompatibles avec la navigation — dans cet ordre, sur les géométries où
l'étape 2 a trouvé un défaut de type B.

## 11b · Décor — ce qui est déjà fait (ne pas rouvrir)

Vérifié sur le dépôt actuel : le chantier « backgrounds » est en grande partie
livré.

**Les « ronds moches » n'existent plus.** Le code documente leur suppression :
*« ELLE ÉTAIT UNE ELLIPSE, DONC ELLE N'ÉTAIT RIEN — un ovale lisse au sol ne se
lit ni comme une flaque ni comme une marque, juste comme un rond. »* Remplacés
par six traces directionnelles :

| demandé au brief | implémenté |
|---|---|
| traces de roues | `roulage` — deux bandes parallèles, écartement constant par cellule |
| huile | `souillure` — contour organique à 7 rayons + coulée directionnelle |
| poussière | `poussiere` — dégradé linéaire, bord balayé net d'un côté |
| eau | `ruissellement` — filets qui suivent la pente et convergent |
| brûlures | `cendres` — semis de points, pas une nappe |
| marques de passage | `rayures` — fines, droites, quasi parallèles |

Le bug de position (`0.31.4`) est corrigé : la trace se **sonde** au centre de
la cellule (point stable pour lire le quartier) mais se **dessine** ailleurs,
précisément pour ne pas produire un réseau carré visible.

**Le set dressing hiérarchique existe aussi** : `ZONES` définit 4 zones
fonctionnelles par lieu, `QUARTIER` fait que l'architecture décide et le semis
suit (`PORTEE_QUARTIER = 90`), et `verifierZones()` garantit que les deux
tables se recouvrent dans les deux sens. Le Secteur y est intégré comme les
quatre autres lieux.

### Ce qui reste vraiment

1. **Trois matières manquent** de la liste d'origine : corrosion, fissures,
   déchets. Non bloquant — le vérificateur exige au moins deux matières par
   lieu et c'est satisfait. Enrichissement, pas correction.
2. **`drawTraces()` sort immédiatement si `gfx <= GFX_LOW`.** Tout ce travail
   est invisible en qualité basse. Volontaire ou vestige ? À trancher — et si
   c'est volontaire, vérifier qu'un palier intermédiaire existe plutôt qu'un
   tout-ou-rien.
3. **Revérifier sur captures fraîches.** Les captures fournies dans les briefs
   peuvent être antérieures aux correctifs `0.31.4`/`0.31.5`. Si le défaut
   persiste visuellement, c'est une régression ou un second défaut de même
   famille, pas le problème d'origine.

## 11c · Map ↔ gameplay — attention au conflit avec le classement

L'idée (« où je suis modifie subtilement comment je joue ») est bonne : longues
lignes en Usine favorisant la précision, goulots en Fonderie favorisant la
zone, etc.

**Mais elle entre en conflit avec le chantier 07.** Si un biome avantage une
arme et que le biome est tiré au sort, le classement compare des manches
inégales. `biome` est déjà stocké dans `recordFinal`.

Deux issues, à trancher **avant** de pousser cette direction :
- séparer aussi le classement par biome (multiplie les catégories : 3
  difficultés × 4 effectifs × 5 biomes = 60 classements — probablement trop) ;
- fixer le biome pour les manches classées, et laisser la variété aux manches
  non classées.

La seconde est plus praticable. Dans tous les cas, **le chantier 07 doit passer
en premier** pour que la contrainte soit connue.

## Fichiers

- `shared/navigation.js`, `shared/game_state.js` — `NAV_CAS`, safe spot (11a)
- `public/render/props.js` — matières manquantes, seuil `gfx` (11b)
- `shared/biomes.js` — géométrie par lieu (11a, 11c)
- `docs/screens/` — captures fraîches
- `docs/regles/SIMULATION.md`
