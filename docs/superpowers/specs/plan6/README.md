# Plan 6 — équilibrage global

Sept lots, `A` à `G`, numérotés dans l'**ordre d'exécution**. La convention suit
celle du dépôt (« lot D du plan v3 ») : les lots repartent de `A` à chaque plan,
les lettres `A`-`X` déjà consommées appartiennent aux plans précédents.

| lot | objet | dépend de | porte |
|---|---|---|---|
| **[A](A-population.md)** | plafond de population | grille spatiale | densité, parité d'effectif |
| **[B](B-bestiaire.md)** | vitesse et dégâts des monstres | — (se mesure avec A) | la fuite, l'identité des types |
| **[C](C-pv-et-ttk.md)** | rampe de PV et temps de mise à mort | A | le rythme de la horde |
| **[D](D-experience.md)** | expérience indexée sur la minute | C | la courbe de progression |
| **[E](E-cartes.md)** | conditionnement et catalogue de cartes | — | la profondeur des builds |
| **[F](F-reliques.md)** | marchand, éclats, catalogue de reliques | — | la décision d'achat |
| **[G](G-meta.md)** | progression de compte | D | la méta et son rôle |
| **[H](H-boss.md)** | courbe de PV et renforts des boss | C, se lit avec D | le rythme des six combats |
| **[I](I-classes.md)** | classes, compétences, compositions | — (bloque la clôture de B) | l'équilibre des trois rôles |
| **[J](J-traits.md)** | traits, élites, bonus au sol | **A** | le levier « comportement » que A et C invoquent |

**[PERIMETRE.md](PERIMETRE.md)** — la carte de ce que le plan couvre et de ce
qu'il ne couvre pas, et pourquoi.

**[PROFILS.md](PROFILS.md)** — les trois profils de compte de référence, et la
matrice de cohérence difficulté × progression. **À lire avant les lots** : tous
leurs critères d'acceptation s'y adossent.

**[DECISIONS.md](DECISIONS.md)** — ce qui reste à trancher avant exécution.

---

## L'objet du plan

La manche de 37 minutes ne monte réellement en pression que pendant ses dix
premières, on ne peut pas semer la horde passé la mi-manche, et trois systèmes
sont saturés bien avant la fin — la population ennemie, la jauge d'expérience,
et le marchand de reliques.

Aucun des trois n'est cassé au sens d'un bug : chacun bute sur un plafond posé
pour de bonnes raisons dans un jeu qui était alors deux fois plus court.

---

## Les cinq principes verrouillés

Les trois premiers prolongent des décisions déjà prises ailleurs dans le dépôt ;
les deux derniers sont nouveaux.

**1. La difficulté tardive se porte par la DENSITÉ et le COMPORTEMENT, jamais
par les PV.** Doctrine déjà écrite dans `timeline.js` (« le levier est dans
`DIFFICULTIES[i].traits` et `.roster` »). Elle n'est aujourd'hui pas tenue :
faute de marge sur la densité, ce sont les PV qui portent tout en douce.

**2. Toute courbe s'indexe sur un axe EXTÉRIEUR à la boucle.** Extension directe
de D2 (« un scaler dont l'entrée est sa propre sortie n'est PAS MESURABLE »).
D2 l'a appliqué aux PV et au débit ; le plan 6 l'applique à l'expérience, qui
viole la règle aujourd'hui.

**3. Les cartes en %, les reliques en valeur brute.** Déjà dans `reliques.js`,
à préserver : c'est ce qui fait qu'une relique reste utile sur une build qui n'a
rien pris dans son axe.

**4. Ce qui est COMMUN à l'équipe ne reçoit jamais de multiplicateur
individuel.** La jauge d'XP est partagée et normalisée par l'effectif : une
carte « +% d'XP » vaudrait quatre fois plus à quatre joueurs qu'à un seul.
Une seule exception, assumée parce qu'elle est NÉGATIVE et visible : « Dette ».

**5. Une carte qui ne change aucune décision de jeu n'est pas une carte.**
`scoreMul` n'est lu que par le HUD et le tableau de fin. Deux cartes en vivent.

**6. Toute mesure se lit à un profil de compte NOMMÉ.** Dans un survivor, perdre
ses premières parties est le fonctionnement normal, et la progression permanente
est ce qui finit par ouvrir la fin de la manche. Un TTK mesuré sur un compte
complet et le même TTK mesuré sur un compte neuf ne décrivent pas le même jeu.
Un critère de **plancher** se mesure à P0, un critère d'**étalonnage** à P1 —
voir [PROFILS.md](PROFILS.md).

---

## Ordre d'exécution

```
A  population          ← prérequis : grille spatiale
│
├─ B  bestiaire        ← à sortir JUSTE APRÈS A, avant C
│
├─ C  PV et TTK        ← se calibre sur la densité de A et la vitesse de B
│   ├─ D  expérience   ← le TTK pilote le débit d'XP
│   │    └─ G  compte  ← dépend de la distribution de niveaux de D
│   └─ H  boss         ← besoin de BOSS_POWER_REF (C) ; se cale sur la
│                        courbe de cartes que D fixe
│
├─ J  traits, élites   ← DETTE DE A : ses plafonds sont calibrés pour 200
│                        ennemis, A monte à 622
├─ I  classes          ⟂ indépendant, mais D14 bloque la clôture de B
│
├─ E  cartes           ⟂ parallélisable, SAUF E-1 (conditionnement) qui est
│                        un prérequis d'écriture de toute nouvelle carte
└─ F  reliques         ⟂ parallélisable
```

`A → C → D → G` est une chaîne stricte : chaque lot se mesure sur le précédent,
et les mesurer dans le désordre donne des chiffres qui ne veulent rien dire.

**B passe avant C.** Il ne dépend d'aucune courbe, il corrige le défaut le plus
ressenti manette en main, et il change la façon dont toute mesure de survie se
lit. Calibrer un TTK sur un jeu où l'on ne peut pas fuir donnerait un chiffre
adossé à une contrainte qu'on s'apprête à retirer.

**E-1 est un prérequis d'écriture, pas un lot d'équilibrage.** Tant qu'il
n'existe pas, chaque carte à prérequis ajoutée au catalogue est une carte morte
de plus dans les tirages.

**J n'est pas optionnel.** A et C retirent tous deux de la difficulté aux PV en
la renvoyant « aux traits et au roster ». Sans J, ce renvoi est une promesse
non tenue : A et C allègent le jeu sans rien remettre en face.

**A, B et D portent l'essentiel du ressenti.** E et F portent la profondeur —
ce qui fait qu'on relance une manche.

---

## Ce que le plan ne fait PAS

Portes explicitement fermées, pour qu'elles ne se rouvrent pas par inadvertance.

- **Aucun retour du scaling de puissance.** D2 a retiré `WAVE_HP_POWER_K` et
  `WAVE_RATE_POWER_K` pour une raison qui reste entière. Le plan 6 étend cette
  règle à l'XP, il ne la relâche nulle part. En particulier : ne pas remettre un
  terme de **composition d'équipe** à la place du terme de puissance retiré.

- **Aucune statistique de monstre ne varie avec l'effectif.** Ce qui varie avec
  le nombre de joueurs reste la **quantité** (lot A) et la **géométrie**
  (`adaptEntry`), jamais la nature d'un monstre. Voir lot B.

- **Aucun second bouton sur la même grandeur.** Le plan ajoute `MAX_ENEMIES` par
  difficulté ; il ne touche donc pas aux débits du `SCRIPT` par variante, déjà
  refusés au lot T pour cette raison exacte.

- **Pas de refonte des MÉCANIQUES de boss.** Porte reformulée après le lot H,
  qui touche la courbe de PV et la densité de renforts : les six combats, leurs
  barres, leurs mécaniques et les variantes de rupture restent hors périmètre.
  Si les durées restent hors cible après H, ça fera un plan 7.

- **Pas de changement de la durée de manche.** Trente-sept minutes, six segments
  de 300 s : c'est la structure, pas un réglage.

- **On ne cherche PAS à rendre la fin accessible à un compte neuf.** Qu'un compte
  neuf ne termine pas `normal` est l'intention du genre, pas un défaut. Le plan
  garantit en revanche un **plancher** (calme reste terminable sans méta) et une
  **trajectoire lisible** (chaque difficulté est résolue à un profil donné).

- **La méta ne se compense jamais par la difficulté.** `_playerPower` exclut déjà
  la progression de compte par construction : les PV de boss ne rattrapent pas ce
  que le joueur a acheté. C'est ce qui rend la progression réelle, et rien dans
  le plan ne doit rouvrir cette porte.
