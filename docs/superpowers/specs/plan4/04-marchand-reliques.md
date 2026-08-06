# Lot K — Marchand de reliques

Dépend du lot I : payé par la monnaie de manche (les éclats), qui n'existe pas
sans la grande arène.

**Statut de la liste ci-dessous : validée comme liste de départ par le porteur
du projet (2026-08-06).** Les dix reliques partent telles quelles ; ajouts et
équilibrage viendront en jouant, mesures à l'appui.

---

## K1. Principe

Après chaque victoire de boss (les cinq existants, pas le boss final qui a son
propre traitement au lot N), un marchand propose des reliques à acheter contre
des éclats.

Différences fondamentales avec les cartes de manche :

| | cartes | reliques |
|---|---|---|
| monnaie | gratuites, tirage | éclats, achat |
| effet | presque toujours en % | **valeur brute** |
| fréquence | à chaque niveau | après chaque boss |
| persistance | manche uniquement | manche uniquement |
| offre | 3 imposées | 3 à 4 au choix, payantes individuellement |

Le choix de la valeur brute plutôt que le pourcentage n'est pas cosmétique :
une relique « +8 dégâts » reste utile même sur une build qui n'a pris aucune
autre carte de dégâts, ce qu'aucune carte actuelle ne permet. C'est un axe de
puissance qui ne dépend d'aucun autre choix.

---

## K2. L'offre

```
RELIC_OFFER_COUNT: 3
RELIC_REROLL_COST: proportionnel a la vague en cours
```

Trois reliques proposées, achats indépendants : un joueur peut en acheter zéro,
une, deux ou les trois s'il a assez d'éclats. Contrairement aux cartes, ce
n'est **pas** un choix exclusif — c'est un budget à répartir.

**Question ouverte pour le porteur du projet** : faut-il une possibilité de
relance de l'offre contre des éclats, comme le confort du Terminal le permet
pour les cartes ? Proposition par défaut : oui, à un coût croissant avec la
vague, pour éviter qu'une relance systématique vide le marchand de son
intérêt.

---

## K3. Rareté

Même structure que les cartes, quatre paliers, prix croissant :

```
commune     — prix bas, effet modeste mais fiable
rare        — prix moyen
epique      — prix eleve, effet marquant
legendaire  — prix tres eleve, un seul disponible par manche toutes raretes confondues
```

La contrainte « une seule légendaire par manche » évite qu'une manche très
généreuse en éclats cumule plusieurs effets exceptionnels et déséquilibre le
combat de boss suivant.

---

## K4. Proposition de liste de départ

Dix reliques, deux à trois par rareté, une base large pour la première
sortie. **Liste de départ validée** — la note sur `coeur_machine` reste un
point d'attention pour l'équilibrage, pas un blocage.

### Communes

| id | nom | effet |
|---|---|---|
| `eclat_dur` | Éclat dur | +6 dégâts bruts sur chaque tir |
| `plaque_rouillee` | Plaque rouillée | +25 PV bruts |
| `ressort_use` | Ressort usé | −0,03 s d'intervalle de tir, valeur fixe |

### Rares

| id | nom | effet |
|---|---|---|
| `noyau_instable` | Noyau instable | +18 dégâts bruts, mais −10 PV bruts |
| `filtre_purifiant` | Filtre purifiant | retire un état toutes les 10 s, sans action du joueur |
| `battery_secours` | Batterie de secours | le bouclier, une fois vide, se recharge une fois à 50 % de sa jauge (usage unique par manche) |

### Épiques

| id | nom | effet |
|---|---|---|
| `coeur_de_ravageur` | Cœur de Ravageur | +35 dégâts bruts contre les boss uniquement |
| `essaim_captif` | Essaim captif | un projectile supplémentaire orbite en permanence autour du joueur, dégâts fixes au contact |
| `mémoire_gravee` | Mémoire gravée | la première compétence utilisée à chaque vague a sa recharge immédiatement réinitialisée |

### Légendaire

| id | nom | effet |
|---|---|---|
| `coeur_machine` | Cœur-machine | +50 dégâts bruts, +80 PV bruts, mais la vitesse de déplacement est fixée à sa valeur de base (annule tout bonus de vitesse des cartes) |

**Note sur `coeur_machine`** : c'est la seule relique à contrepartie de la
liste. Une légendaire sans contrepartie à ce niveau de valeur brute risque
d'écraser toute décision de carte suivante — à discuter spécifiquement,
c'est le candidat le plus probable à retravailler.

---

## K5. Interaction avec `_teamPower`

**Les reliques doivent entrer dans le calcul de puissance**, exactement comme
les cartes. Sinon les vagues suivant un passage chez le marchand seront
sous-calibrées par rapport aux dégâts réels de l'équipe.

Comme les valeurs sont en brut et non en multiplicateur, elles s'intègrent en
amont du calcul plutôt qu'en facteur :

```js
// _playerPower(), avant application des multiplicateurs
const flatDamage = p.relics.flatDamage ?? 0;
const effectiveBaseDamage = CFG.BULLET_DAMAGE + flatDamage;
```

À vérifier avec soin : une relique de dégâts bruts pris tôt (après le premier
boss, vers la vague 5) pèse proportionnellement plus lourd qu'un pourcentage,
puisque les dégâts de base sont encore faibles. C'est un comportement
attendu — c'est l'intérêt de la valeur brute — mais ça doit être mesuré
explicitement pour calibrer les prix.

---

## K6. Protocole et persistance

```
serveur -> client : { t: "merchant", offers: [...], eclats }
client -> serveur : { t: "buyRelic", id }
```

Le serveur valide le solde d'éclats et l'appartenance de la relique à l'offre
en cours, débite, applique la relique au joueur.

**Aucune persistance au-delà de la manche** : les reliques ne touchent jamais
la ligne Supabase du compte, cohérent avec la monnaie qui les paie. L'offre,
le solde et la limite de légendaire vivent dans le `GameState` de la salle —
le serveur étant multi-salons, chaque salle a son marchand, son offre et sa
propre limite « une légendaire par manche ».

Trois points d'implémentation, calés sur les patterns du dépôt :

- **Les reliques vivent à côté de `p.mods`, comme les états et les
  minuteurs** — jamais dedans : `_recomputeMods()` rejoue tout le chargement à
  chaque carte prise, et une relique rangée dans `mods` disparaîtrait au
  premier écran de choix. Un `p.relics` que `_playerPower()` et les points de
  calcul de dégâts lisent explicitement.
- **`essaim_captif` (projectile orbital) doit occuper une bande de rayon
  libre** : les bandes existantes (`RING_*`, lames orbitales à 3,7 m, givre à
  8 m, rempart à 8,5 m) sont exclusives — deux effets au même rayon
  reviennent à en perdre un, l'invariant est documenté.
- **L'écran du marchand est un message de transition du monde** : il passe
  par `worldQueue` / `pushWorld()` comme `cards` et `roundEnd`, jamais
  appliqué à la réception — sinon il s'ouvre par-dessus la dépouille du boss
  110 ms avant que le client ne la dessine morte.

---

## K7. Interface

Écran dédié, ouvert automatiquement après la victoire sur un boss, avant le
retour à la phase de vagues normale. Chaque relique affiche :

- son effet en valeur exacte (jamais de pourcentage, pour rester cohérent avec
  la nature de la relique) ;
- son prix et le solde d'éclats restant après achat potentiel ;
- si elle a une contrepartie, celle-ci en évidence, pas en petit texte.

Un bouton « passer » explicite, pour ne pas donner l'impression qu'un achat est
obligatoire.

---

## K8. Mesures

| mesure | attendu |
|---|---|
| éclats moyens accumulés à l'arrivée du premier marchand | à calibrer selon le rythme du lot I |
| taux d'achat par rareté | les communes doivent rester achetées en majorité, sinon leur prix est mal calé |
| écart de puissance avant / après un passage chez le marchand | mesurable, sert à recalibrer `_teamPower` |

## K9. Critères d'acceptation

- Aucune relique ne persiste après la fin de la manche.
- Une seule légendaire peut être achetée par manche, tous marchands confondus.
- Toute relique à contrepartie affiche sa contrepartie aussi visiblement que
  son bénéfice.
- Le solde d'éclats est vérifié côté serveur à chaque achat.
