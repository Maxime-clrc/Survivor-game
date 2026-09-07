# 01 · Progression permanente — le budget qui n'arbitre plus

## Le constat, chiffré

| catégorie | contenu | emplacement ? | coût 5 paliers |
|---|---|---|---|
| lignes de classe | **6 par classe** | oui, `cp.equipped` | 2 000 noyaux/ligne |
| Communes | 4 lignes (`sursis`, `carcasse`, `foulee`, `glanage`) | non — mais `communOff` permet de couper **gratuitement** | 4 000 (sursis) / 2 600 (autres) |
| Confort | 4 items | **non, tout actif dès achat** | 250 / 450 / 500 / 900 |

`SLOTS_BASE = 3`, `SLOTS_MAX = 6`, débloqués par 3 jalons (niveau 13, 3 boss,
25 manches). **Les arbres ont exactement 6 lignes.** Donc :

- début de compte : 3 emplacements pour 6 lignes → vrai arbitrage ;
- fin de compte : 6 emplacements pour 6 lignes → **arbitrage nul**.

Le système est conçu pour se désactiver lui-même. C'est un défaut de
dimensionnement, pas une catégorie oubliée.

### Économie complète

Tout acheter = **49 900 noyaux**. À `CORE_RUN_CAP = 600` par manche, plancher
de **84 manches** pour un compte qui maximise chaque manche. Passé ce cap, un
joueur n'a plus une seule décision de méta à prendre — ni classe, ni commune,
ni confort.

## Cible

Conserver un arbitrage à tous les stades, sans punir le joueur qui a payé.

## Options évaluées

Les cinq options du brief, tranchées contre les chiffres ci-dessus.

**A — budget unique pour toute la méta.** Force à comparer +20 % de dégâts
(calibre T5) à une relance de tirage. Comparaison hétérogène → un seul optimum
global calculable → méta obligatoire. **Écartée.**

**B — trois budgets (puissance/utilitaire/confort).** Correct sur le principe,
mais surdimensionné : Communes + Confort ne pèsent que 8 items. Trois jauges
pour 8 items produit des budgets d'1 ou 2 places, où « choisir » redevient
« prendre les deux meilleurs ». **Écartée en l'état.**

**C — points de doctrine.** La plus profonde, mais elle exige de coter 26
lignes/items (18 lignes de classe + 4 communes + 4 conforts) un par un. C'est
un chantier d'équilibrage complet, pas un changement de règle. **À garder en
réserve**, pas pour cette itération.

**D — emplacements à poids différenciés.** Concept intuitif, garde un seul
compteur. Défaut : conserve la comparaison hétérogène d'A, atténuée.

**E — hybride, recommandé.** Voir ci-dessous.

## Recommandation — Option E, deux budgets

### E.1 Découpler le nombre de lignes du nombre d'emplacements

**`SLOTS_MAX` doit être strictement inférieur au nombre de lignes de l'arbre.**
C'est le correctif minimal, et il est indépendant de tout le reste.

Deux voies, non exclusives :
- **abaisser `SLOTS_MAX` à 4** (sur 6 lignes) — un joueur maximal renonce à 2
  lignes sur 6. Coût technique nul (une constante), migration : déséquiper
  l'excédent dans l'ordre d'achat, rien n'est perdu ;
- **ou étendre les arbres à 8 lignes** en gardant 6 emplacements — même effet
  d'arbitrage, mais c'est un chantier de contenu (6 nouvelles lignes ×
  3 classes) avec son propre équilibrage.

Recommandation : **abaisser `SLOTS_MAX`**. L'effet de design est identique, le
coût est incomparable, et l'extension d'arbre reste possible plus tard sans
défaire ce choix.

### E.2 Un second budget, à poids, pour Communes + Confort

8 items, un seul budget commun (pas deux : trop peu d'items pour scinder).

Poids proposés, adossés à ce que le code dit déjà de l'impact réel :

| item | poids | justification tirée du code |
|---|---|---|
| `sursis` T5 | **3** | seul achat dont le commentaire du dépôt dit qu'il « change l'issue d'une manche » (relèvement automatique) ; c'est aussi le plus cher (4 000) |
| `sursis` T1-T4 | 2 | +1,2 PV/s par palier, sans le relèvement |
| `carcasse` | 2 | +15 % PV max à T5 — comparable à une ligne de classe défensive |
| `quatrieme` | 2 | +33 % d'options par tirage : agit sur **toute** la construction de build, pas sur une stat |
| `relance` | 2 | même famille : qualité moyenne du build |
| `relance2` | 1 | rendement décroissant sur la même mécanique |
| `foulee` | 1 | +7,5 % vitesse à T5 |
| `glanage` | 1 | +70 px de ramassage, confort pur |
| `ravitaillement` | 1 | un bonus au sol en ouverture, effet borné |

Budget suggéré : **6 points**, débloqués comme les emplacements actuels
(3 jalons). Un joueur maximal prend par exemple `sursis` T5 (3) + `quatrieme`
(2) + `foulee` (1), et renonce au reste — ou trois items légers et aucun
lourd. Les poids sont **à valider en jeu** ; leur ordre relatif, lui, est
adossé aux coûts et aux commentaires du dépôt, pas à une intuition.

### E.3 Absorber `communOff`

`profile.communOff` (`progression.js:172-176`) coupe une ligne commune
**gratuitement**. Si le budget E.2 arrive sans le retirer, le jeu affiche deux
mécanismes de renoncement concurrents pour la même catégorie — l'un coûteux,
l'autre gratuit. `communOff` devient simplement « non équipé dans le budget » ;
le champ existant sert de valeur initiale à la migration.

## Migration

- Aucun achat n'est perdu — seulement de l'activation. C'est la même politique
  que celle déjà écrite pour `communOff` (« aucun profil existant ne change »).
- Au premier chargement : équiper dans l'**ordre d'achat historique** jusqu'au
  budget, laisser le reste acheté mais non équipé, et **ouvrir l'écran de
  progression une fois** avec un bandeau explicatif — un joueur qui perd
  silencieusement 2 lignes actives sans comprendre pourquoi lira ça comme un
  nerf, pas comme un choix rendu.
- `PROG_CFG.VERSION` passe de 7 à 8.

## Règles serveur

Le budget se vérifie au même point de passage unique que les emplacements
actuels (`metaLinesFor` / `applyMeta`, lus par le serveur au lancement). Aucune
nouvelle catégorie de règle réseau : une ligne hors budget ne s'applique pas,
exactement comme une ligne non équipée aujourd'hui.

## Tests

- `verifierMeta` (existant) doit rester vert après le changement de constante.
- Nouveau : aucun profil, après migration, n'a plus de lignes actives qu'avant
  en **puissance appliquée** sans que le joueur l'ait choisi (test sur profil
  synthétique « tout acheté »).
- Nouveau : le budget n'est pas dépassable en forgeant le message client
  (vérification serveur, pas seulement affichage).

## Fichiers

- `shared/progression.js` — `PROG_CFG.SLOTS_MAX`, table de poids, `metaLinesFor`,
  `applyMeta`, `slotsFor`
- `hub.js`, `room.js` — lecture/persistance du profil
- écran de progression (`public/ui/`) — affichage du budget et du poids par item
- `docs/regles/CONTENU.md`
