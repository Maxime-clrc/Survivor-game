# Lot D — l'échelle de difficulté

Aujourd'hui, la difficulté ne touche les boss que par `diff.boss` sur les PV.
Les mécaniques, elles, sont identiques en calme et en cauchemar.

## Le principe

> La difficulté d'un combat de boss ne se règle **ni par les PV ni par les
> dégâts**, mais par le **nombre de choses à lire en même temps**.

La vraie difficulté d'un raid n'a jamais été la fenêtre de réaction : c'est la
**superposition**. Un télégraphe seul est facile ; un télégraphe pendant qu'on
tient une tour et qu'un allié est marqué, c'est un vrai problème — et c'est bien
plus intéressant que +25 % de PV.

## La table

| | calme | normal | cauchemar |
|---|---|---|---|
| mécaniques par phase | 1 | 2 | 2 dont une **superposée** |
| classe de télégraphe | lecture (2,4 s) | standard (1,6 s) | standard, **réflexe en phase 5** |
| `MECH_DAMAGE_RATIO` | 0,60 | 0,90 | 1,15 |
| échec de mécanique | **individuel** | individuel sauf une | **collectif** |
| couches débloquées | `unlock[0..2]` | toutes | toutes + une inédite en phase 5 |
| `BAR_DWELL` | 8 s | 10 s | 12 s |
| renforts | normaux | normaux | **durcissent s'ils se regroupent** |

Trois remarques sur ce tableau.

**`BAR_DWELL` monte avec la difficulté**, ce qui est contre-intuitif : un palier
plus long rend le combat plus long, donc plus exigeant, parce que le palier est
le moment où se joue la mécanique de la phase suivante (lot A). En cauchemar, on
subit plus de mécaniques, pas moins.

**Calme ne débloque pas `unlock[3]`.** C'est la couche la plus dure de chaque
boss ; la réserver donne à `normal` un contenu que `calme` n'a pas, au lieu du
même contenu en plus mou.

**Les renforts qui durcissent en se rapprochant** forcent l'écartement de
l'équipe sans aucun télégraphe, juste par une règle. C'est un modificateur de
cauchemar idéal : il ne s'annonce pas, il se découvre.

## L'échec individuel ou collectif — pilier P4

C'est la décision qui distingue un jeu de fête d'un jeu de raid, et le mode dit
lequel on joue.

| difficulté | conséquence d'un échec |
|---|---|
| **calme** | seul celui qui rate encaisse |
| **normal** | individuel, sauf **une** mécanique collective par boss |
| **cauchemar** | collectif — c'est ce qui en fait le mode raid |

Un débutant qui rate doit mourir **lui**, pas faire perdre la soirée à trois
autres. En pratique, les mécaniques concernées sont celles à `minPlayers >= 2` :
`stack`, `spread`, `count`, `link`, `jail`, `quadrant`. En calme, leur échec
n'applique de dégâts qu'aux joueurs fautifs.

## L'effectif

D�jà bien traité : `adaptMech(id, alive)` avec repli et `towerCount(alive)`.
Rien à refaire, deux compléments :

- **`STACK_RADIUS: 135` et `SPREAD_MIN: 230` sont fixes.** À quatre joueurs, un
  rassemblement dans 135 px est serré ; à deux, une dispersion de 230 px est
  triviale. Les deux doivent suivre l'effectif ;
- **`MECH_DAMAGE_RATIO` ne varie pas avec la table.** À quatre joueurs, un raté
  collectif coûte quatre fois plus à l'équipe. À vérifier au test.

## Critères d'acceptation

1. Le taux de réussite d'un combat suit la matrice `PROFILS.md` du plan 6.
2. **Aucun échec de mécanique n'inflige de dégâts à un joueur non fautif en
   calme.**
3. En cauchemar, au moins une phase par boss impose **deux mécaniques
   simultanées**.
4. `unlock[3]` n'apparaît jamais en calme.
