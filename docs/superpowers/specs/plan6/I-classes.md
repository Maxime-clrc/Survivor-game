# Lot I — les classes et leurs compétences

**Indépendant de A-H sur le fond, mais bloquant pour le lot B** : la doctrine des
90 % ne peut pas se fermer avant D14.

## Constat 1 — la doctrine de fuite exclut le tank

| classe | PV | `damageMul` | `speedMul` | vitesse | runner à la min 30 (lot B) |
|---|---|---|---|---|---|
| Rempart | 150 | 0,80 | 0,92 | 239 | 234 = **98 %** ✘ |
| Soigneur | 100 | 0,85 | 1,00 | 260 | 234 = 90 % ✔ |
| Tireur | 85 | 1,20 | 1,04 | 270 | 234 = 87 % ✔ |

**D14 est tranchée : (b) — la classe médiane.** Un tank est lent, mais il a des
options de défense, et c'est aux autres joueurs de l'aider. Ce qui suit garde les
trois issues pour mémoire, la retenue étant la (b).

Trois issues (**D14 — retenue : b**) :

- **(a)** mesurer la doctrine contre la **classe la plus lente** : plafond à
  `0,90 × 239 = 215`, donc runner de base à **159** au lieu de 196. Le plus
  protecteur, et le plus coûteux pour la menace du runner ;
- **(b)** mesurer contre la classe **médiane** et assumer que le tank ne fuit
  pas : c'est un tank, il a 150 PV, une provocation avec 1,2 s d'invulnérabilité
  et un rempart. Sa réponse à la horde n'est pas la fuite ;
- **(c)** relever `speedMul` du tank de 0,92 à 1,00 et lui retirer ailleurs.

**Retenu : (b)**, écrit explicitement dans la doctrine du lot B — « 90 % de la
vitesse de la classe médiane » — et non laissé implicite. Une garantie qui a une
exception non écrite est une garantie fausse.

> ⚠ **Sous-vérification obligatoire : le tank SOLO.** Le raisonnement de (b) est
> coopératif — « c'est aux autres de l'aider » — et il est juste à 2, 3 et 4
> joueurs. **En solo, personne n'aide.** Un Rempart seul est donc la seule
> configuration du jeu où la garantie de fuite ne s'applique ni par la vitesse ni
> par l'équipe.
>
> **Critère :** un Rempart solo à P0 doit atteindre le taux de réussite de la
> matrice en `calme` (20-30 %), comme les deux autres classes. S'il est
> nettement en dessous, le correctif porte sur ses **compétences** (portée ou
> recharge de la provocation, durée du rempart) et **jamais** sur `speedMul` —
> qui rouvrirait D14.

## Constat 2 — la comparaison des classes n'a jamais été faite

Aucune mesure n'existe sur :

- **la survie relative** en solo, par difficulté et par profil de compte ;
- **le débit de dégâts relatif**, une fois les compétences comptées (`Surcharge`
  du tireur, `Catalyse` du soigneur en méta) ;
- **la valeur d'une composition** : une table de quatre tireurs va-t-elle plus
  loin qu'une table 1 tank / 1 soigneur / 2 tireurs ? Si oui, le système de
  classes est décoratif en coopératif.

Le soigneur est le cas le plus suspect : `damageMul 0,85` et 100 PV, soit **entre
les deux autres sur les deux axes**. Sa valeur tient donc entièrement à ce qu'il
apporte aux autres — et le dépôt le sait, le commentaire de `catalyse` dit
« la ligne la plus importante du lot : elle rend le soigneur offensif
INDIRECTEMENT ». Mais rien ne mesure si ça suffit.

## Décisions

**Aucune décision de valeur avant mesure.** Ce lot est d'abord un protocole :

1. **Matrice de survie** : bot par classe, 3 difficultés × 4 effectifs × 3
   profils, segment atteint en médiane sur 6 manches.
2. **Matrice de composition** : les 4 compositions plausibles à 4 joueurs
   (4 tireurs / 3+1 tank / 2+1+1 / 2 tanks 2 soigneurs), segment atteint.
3. **Débit de dégâts par classe**, compétences comprises, à P1.

**Critère d'acceptation :** aucune classe ne doit être **strictement dominée**,
et la composition 1/1/2 doit aller au moins aussi loin que 4 tireurs. Si les
quatre tireurs gagnent, le problème n'est pas dans les classes mais dans le fait
que rien dans la manche ne punit l'absence de tank — et ça se corrige au lot J,
par les traits, pas ici.
