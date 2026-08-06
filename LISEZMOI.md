# Survivor LAN

Survivor coopératif jouable à 4 sur un réseau local. Un joueur lance le serveur,
les autres ouvrent une URL. Aucune installation côté joueurs.

## Lancer

```bash
node server.js
```

Node 18 ou plus, **aucun `npm install`** : le projet n'a aucune dépendance.
Le serveur affiche l'adresse à communiquer. Le port par défaut est **7777**
(derrière un proxy inverse, le port interne n'a plus d'importance — autant en
prendre un sans collision) ; pour en changer : `PORT=3000 node server.js`

### Si les autres n'arrivent pas à se connecter

1. **Profil réseau Windows en « Public »** — le pare-feu bloque tout entrant.
   À basculer en « Privé ». C'est la cause n°1.
2. **Pare-feu** — autoriser Node.js en entrée.
3. **IP changée** — relance le serveur et relis l'adresse affichée.

## Déroulement d'une partie

On entre avec un **compte** : pseudo + mot de passe, créé sur la page
d'accueil (pas de récupération par email — noter son mot de passe ; sur le
même navigateur, « Se connecter » avec le mot de passe laissé vide reprend la
session pendant 30 jours). Voir `LISEZMOI-BDD.md` pour le détail des comptes
et de leur sauvegarde. À la connexion on arrive au **hub** : la liste des salles. On en rejoint une
d'un clic, ou on crée la sienne — avec un mot de passe optionnel pour une
partie privée. Chaque salle est une partie indépendante (jusqu'à 16 salles de
4 joueurs sur le même serveur) ; une salle pleine reste affichée `4/4`, grisée,
pour qu'on sache s'il faut patienter ou créer la sienne. Une salle vide survit
60 secondes : recharger sa page ne détruit pas la partie, et on retrouve sa
salle d'un geste.

Dans une salle, le serveur alterne entre **salon**, **manche** et **choix de
cartes**.

- Au salon, le tableau des scores de la manche précédente s'affiche, avec le
  cumul de la session. Seul **l'hôte** peut lancer la manche suivante.
- Chacun y choisit sa **classe** — Rempart, Soigneur ou Tireur. Au maximum **un
  tank et un soigneur** par partie, premier arrivé premier servi ; le choix se
  **verrouille au lancement de la manche** et se rouvre à la fin de celle-ci —
  on change donc de classe entre deux manches, mais jamais au milieu d'un
  combat. Un spectateur choisit la sienne pendant qu'il regarde.
- Tout le monde y vote la **difficulté** ; l'hôte n'a pas de voix double.
- L'hôte est le plus ancien joueur connecté. S'il part, le suivant hérite du
  bouton automatiquement.
- Qui se connecte **pendant** une manche est **spectateur** : il voit la partie
  en direct et entre en jeu à la manche suivante.
- La manche se joue en **vagues**. Une vague est un budget d'apparitions : elle
  se termine quand le budget est épuisé **et** que l'arène est vide. Une vague
  sur cinq est un **boss**, qui occupe la vague entière.
- L'arène fait **trois écrans dans chaque dimension** : chacun voit sa propre
  vue, centrée sur son personnage, avec des flèches de bord d'écran vers les
  coéquipiers hors champ (distance en mètres ; un allié à terre pulse). Des
  **points de récolte** dorés apparaissent au loin — un cristal se détruit en
  tirant, un amas se canalise en restant dessus 1,5 s — et rapportent des
  **éclats** à toute l'équipe : la monnaie de la manche en cours, perdue à sa
  fin. Un combat de **boss** resserre l'arène à un seul écran autour de
  l'équipe ; sa mort la rouvre.
- **À la fin d'une vague, s'il y a eu une montée de niveau, la manche se met en
  pause** : chacun choisit une carte parmi trois, et la partie reprend quand
  tout le monde a choisi — ou au bout de 30 s, la première carte étant alors
  attribuée d'office. Deux niveaux gagnés dans la même vague donnent deux choix
  d'affilée.
- Les manches rapportent des **noyaux** — la vague atteinte et les boss
  vaincus, versés à parts égales, plafonnés par partie — à dépenser dans le
  **Terminal** (bouton au salon, pastille quand un achat est possible) :
  les trois arbres de classe par onglets, le confort, les jalons. Les
  **emplacements** (3 à 6) se gagnent aux jalons du compte — vague 10, trois
  boss différents, 25 parties — et la réattribution est libre entre les
  manches.
- La manche se termine quand tout le monde est à terre. Le bilan titre sur la
  **vague atteinte** et non sur le numéro de manche : l'unité de jeu est devenue
  la vague, et lire « Manche 1 terminée » après en avoir enchaîné douze donnait
  l'impression d'un compteur cassé. Le numéro de manche descend avec les autres
  chiffres, où il est juste et sans ambiguïté.

## Commandes

- **ZQSD** ou flèches pour se déplacer
- **La souris pour viser** — le tir part tout seul dans la direction du réticule
- **Espace pour esquiver** — un bond de 162 px, **invulnérable pendant tout le
  bond**, une esquive toutes les 3 s. À l'arrêt, on esquive vers le réticule.
- Un joueur à 0 PV tombe **à terre**. Reste dans son cercle pour le relever :
  **1 s à un sauveteur, 0,5 s à deux, 0,33 s à trois**. Se regrouper paie.
  Il repart avec **45 % de ses PV max**.
- **A** et **E** déclenchent les deux compétences de la classe, **1** et **2**
  aussi. A et E sont les deux voisines immédiates de ZQSD : on les atteint sans
  lâcher le déplacement, alors que le rang des chiffres demande de décoller la
  main en pleine vague. Le clic droit **n'est plus** un alias de la compétence 1 :
  dans un navigateur, un clic droit reste d'abord un menu contextuel, et la
  compétence partait sur des clics qui ne visaient pas le jeu.
- **Tab** ouvre la **fenêtre de build**. Au bout de trois boss, plus personne ne
  se souvient de ce qu'il a pris — c'est la raison d'être de cette touche. Les
  **flèches gauche et droite** y passent d'un joueur à l'autre sans refermer, et
  **Échap** ferme.
- **Échap** ouvre le **menu pause** : reprendre, régler le son, consulter sa
  build, quitter la manche. En solo il met vraiment la simulation en pause ; à
  plusieurs la partie continue et le panneau le dit.
- **M** coupe et rétablit le son sans repasser par le salon. Le volume se règle
  sur l'écran de connexion **et dans le menu pause**, et le réglage survit à un
  rechargement.

## Contenu

### Esquive

C'était la seule chose que le jeu ne permettait pas : on subissait ou on
marchait, jamais on ne réagissait. L'esquive donne enfin une **entrée
défensive** — et c'est elle qui rend les mécaniques du boss jouables plutôt que
punitives.

Les images d'invulnérabilité couvrent **exactement** la durée du bond, pas une
milliseconde de plus : sinon on traverse les vagues en martelant une touche au
lieu de choisir un trou. Elles ignorent aussi le temps d'invincibilité normal,
ce qui en fait la seule réponse possible aux zones du boss.

Le serveur reste seul juge de la recharge — un client qui demande l'esquive à
chaque paquet n'en obtient jamais plus d'une toutes les 3 s — mais le client la
joue **aussi en local**, sinon on appuie et il ne se passe rien pendant un
aller-retour réseau, précisément au moment où on avait besoin d'être ailleurs.
Pendant le bond, le recalage sur la position serveur est relâché : le corriger
en direct ferait bafouiller le mouvement au pire moment. La pastille de recharge
affichée, elle, vient toujours du serveur : on ne doit jamais lire « prêt » sur
une touche qui ne répondra pas.

### Élites

Toutes les 22 à 34 s, un ennemi sort en version **dorée** : ×3 PV, ×2,5 score,
et il **lâche un bonus à coup sûr** — même si le sol est déjà plein, parce que
le plafond est là pour brider la pluie automatique, pas pour annuler une
récompense qu'on est allé chercher.

Elles créent une hiérarchie de cibles dans une foule de deux cents silhouettes,
et une économie de bonus qui récompense le ciblage plutôt que l'arrosage.

**Elles sont cadencées par un minuteur, pas par un tirage à chaque
apparition.** Sous forme de probabilité, leur nombre suivait mécaniquement le
débit d'apparition : trois par minute au début, une toutes les sept secondes en
fin de manche. Le minuteur garantit le même rythme du début à la fin.

### Difficulté

Chaque joueur vote au salon ; la majorité l'emporte et, **à égalité, le mode le
plus doux gagne** — personne ne doit pouvoir imposer cauchemar à la table en
étant seul de son avis.

| mode | PV ennemis | débit | dégâts subis | PV du boss |
|---|---|---|---|---|
| calme | ×0,78 | ×0,80 | ×0,80 | ×0,75 |
| normal | ×1 | ×1 | ×1 | ×1 |
| cauchemar | ×1,35 | ×1,28 | ×1,25 | ×1,25 |

Tout passe par des multiplicateurs sur la courbe de pression, qui vit dans
`CFG` : rien n'est dupliqué, et un réglage ajuste les trois modes d'un coup. Le
multiplicateur de dégâts subis s'applique **dans `_hurt`**, seul passage obligé
de tout ce qui blesse un joueur : une nouvelle attaque du boss est couverte sans
qu'on ait à y penser. Le poser aux points d'appel revenait à parier qu'on n'en
oublierait jamais un — pari déjà perdu une fois pendant l'écriture.

### Types d'ennemis

Ils arrivent progressivement et se mélangent, chacun avec un quota.

| type | apparaît | PV | vitesse | particularité |
|---|---|---|---|---|
| grunt | 0 s | ×1 | 95 | la masse de base |
| runner | 40 s | ×0,45 | 188 | rapide et fragile, prend à revers |
| tank | 80 s | ×4,5 | 52 | lent, encaisse, frappe fort |
| shooter | 115 s | ×1,3 | 62 | garde ses distances et tire |
| brood | 150 s | ×1,8 | 78 | libère 3 runners en mourant |

**Le quota par type est le garde-fou important.** Sans lui, les shooters — qui
restent hors du corps à corps et meurent rarement — finissaient par occuper
117 des 180 places : les vagues ne contenaient plus que des tireurs et toute la
variété disparaissait. Chaque type est maintenant borné à une part du plafond
(16 % pour les shooters, 22 % pour les tanks).

**Un monstre ne se superpose jamais à un joueur**, et cette règle a corrigé un
bug qu'on croyait être un problème de vitesse. Un runner rapide qui se collait
au joueur devenait **strictement impossible à toucher**, systématiquement en
solo, jamais remarqué en équipe.

La cause était arithmétique. Les balles apparaissent à 16 px du centre du
joueur ; un runner a 9 px de rayon et une balle 4, donc la collision se fait à
13 px. Un runner à moins de 3 px du centre voyait la balle naître **déjà
au-delà de lui**, puis s'éloigner : il y avait un disque de 16 px de rayon autour
de chaque joueur dans lequel un ennemi était invulnérable à son porteur. En
équipe, un allié le tuait depuis l'extérieur et le bug passait inaperçu.

La correction n'est pas de ralentir le runner — l'observation initiale était
juste, le problème n'était pas qu'il aille vite mais qu'il devienne invulnérable.
C'est une **séparation ennemi/joueur**, avec en filet de sécurité un test de
collision sur le segment centre du joueur → point d'apparition de la balle. Elle
rend aussi les dégâts de contact bien plus lisibles : on voit le monstre qui
frappe au lieu de le voir disparaître sous soi.

Trois détails qui comptent. La répulsion contre un joueur a sa **propre**
constante — celle qui sépare deux monstres est un évitement souple, le troupeau
doit continuer de couler. Le joueur, lui, **n'est jamais poussé en retour** :
deux cents ennemis l'auraient charrié à travers l'arène et la prédiction locale
aurait combattu le serveur à chaque image. Et le contact garde **une morsure
d'un pixel** : une séparation résolue pile à la somme des rayons fait échouer le
test de dégât de contact une image sur deux au gré de l'arrondi flottant, ce qui
aurait été le bug inverse.

Vérifié : un runner posé à 0, 5, 10 et 15 px du centre du joueur **meurt en
0,18 s** sous son tir. Chevauchement maximal après résolution : **1,00 px**
(critère : 2). Mesuré sur cinq manches solo, la séparation ne change ni la
survie ni le nombre de kills — 133 s / 92 kills sans, 143 s / 95 kills avec.

### Bonus temporaires

Ils apparaissent au sol toutes les 18 à 26 s, **deux** au maximum, et
disparaissent au bout de 22 s. On les ramasse en marchant dessus.

| bonus | effet | durée |
|---|---|---|
| **+** soin | +45 PV | immédiat |
| **O** bouclier | absorbe 80 points de dégâts | jusqu'à épuisement |
| **T** temps ralenti | tous les ennemis à 45 % de vitesse | 7 s, **effet d'équipe** |
| **\*** onde de choc | 140 dégâts et répulsion sur 430 px, efface les projectiles | immédiat |
| **^** balise | relève **tous** les joueurs à terre, où qu'ils soient, à 45 % de leurs PV | immédiat |
| **T** tourelle | tire seule sur 350 px, une balle toutes les 0,35 s | 20 s |
| **~** ricochet | chaque balle qui **tue** rebondit sur 2 voisins dans 250 px | 14 s |
| **()** purification | retire **tous** les états du ramasseur | immédiat |

**Un bonus au sol est un événement, pas un revenu.** Quatre d'entre eux —
dégâts ×1,8, cadence ×0,55, double canon, perforant — sont **sortis de la
rotation** : depuis que les cartes sont fréquentes, ils n'étaient qu'une redite
de quatorze secondes de ce qu'une carte permanente donne pour toute la manche.
Ce qui reste est **situationnel** (soin, bouclier, purge) ou de **l'action
ponctuelle** (nova, balise, tourelle, ralentissement), c'est-à-dire ce qu'une
carte ne peut pas offrir : on garde ce qui crée une décision de trajet, on
retire ce qui n'est qu'un multiplicateur en double. La fréquence a été divisée
par deux dans le même mouvement — leur calibrage datait de l'époque où ils
étaient la seule progression du jeu.

Les quatre retirés **restent dans `POWERUP_TYPES`, à leur place exacte** : c'est
l'index qui circule dans le snapshot, et réordonner le tableau aurait fait
dessiner la mauvaise icône à tout onglet resté sur une version antérieure. Ce
qui circule est l'index, ce qui se tire est `POWERUP_ROTATION`.

Les bonus actifs se voient à des anneaux colorés autour du personnage. Le
bouclier s'affiche en arc bleu : il se vide au fur et à mesure des coups encaissés.

Deux choix de conception à noter. Le **bouclier est une réserve de dégâts et non
une durée** : il tient tant qu'on joue proprement, ce qui vaut mieux qu'un
compte à rebours qu'on regarde s'épuiser sans rien pouvoir y faire. Et le
**ralentissement est global** : celui qui le ramasse en fait profiter toute
l'équipe, ce qui crée un petit moment de coordination.

L'**onde de choc** est le bouton panique : elle efface aussi les projectiles
ennemis dans son rayon, ce qui en fait un vrai recours quand l'écran sature
pendant un boss.

Les trois derniers posent chacun une décision plutôt qu'un gain :

- **La balise** est le seul bonus purement coopératif. Sa valeur dépend
  entièrement du moment où on la prend : la garder sous le pied ou la ramasser
  tout de suite. Quand personne n'est à terre elle ne se gaspille pas pour
  autant — elle donne **45 points de bouclier à toute l'équipe**, un repli plus
  faible que son effet principal, assez pour qu'on n'ait jamais peur d'y
  toucher.
- **La tourelle** se pose **à l'endroit du ramassage** : c'est le seul bonus qui
  demande une décision de placement, et la même tourelle vaut le double dans un
  couloir d'arrivée que dans un coin. Elle tire aux dégâts de base du poseur,
  **niveau compris mais bonus temporaires exclus** : dégâts ×1,8 plus double
  canon plus perforant sur une tourelle qui vise seule pendant 20 s, ce n'était
  plus un bonus mais une deuxième partie qui se jouait sans nous. Elle change
  aussi le combat de boss : on la dépose avant d'aller esquiver.
- **La purification** ne fait pas partie de la rotation : elle se tire à part,
  avec un poids qui **double quand l'équipe n'a pas de soigneur** (6 % → 16 %).
  C'est le seul bonus du jeu dont la fréquence dépend de la table, et c'est
  assumé — sans soigneur la purge doit venir de quelque part, et aussi fréquente
  avec un soigneur elle rendrait la classe optionnelle.
- **Le ricochet** ne part que sur un **kill**, et les dégâts décroissent à
  chaque saut (60 %, puis 36 %). Contrairement au perforant, qui est linéaire,
  il brille dans la foule et ne sert à rien contre un boss isolé — d'où une
  vraie raison de choisir sa cible. Le piège d'implémentation est la boucle
  infinie : sans mémoire des ennemis déjà touchés, deux voisins se renvoient
  l'arc indéfiniment.

### Vagues

Le jeu était un **flux continu** : les ennemis arrivaient sans interruption et
la seule respiration venait de la mort d'un boss, toutes les trois minutes. Sur
une survie moyenne de 182 s, **la plupart des parties ne voyaient qu'un seul
choix de carte**, parfois zéro.

Une vague est maintenant un **budget d'apparitions**. Elle passe par trois
phases : *apparition* (le budget se consomme), *nettoyage* (plus rien ne sort,
il reste à finir le travail), *répit* (4 s, et 18 PV rendus à tout le monde).

```
budget de la vague N = (14 + 6 × (N−1)) × joueurs^0,75
```

L'exposant 0,75 donne ×2,8 à quatre joueurs, là où l'ancien `√joueurs` donnait
×2 : la difficulté à effectif élevé était trop molle.

**Les retardataires.** C'est le point faible du modèle : shooters et runners
fuient, et traquer les six derniers à travers 1600 × 900 prenait plus longtemps
que la vague elle-même. Passé **8 s** après l'épuisement du budget, les ennemis
restants reçoivent un **halo bleu**, leur vitesse est multipliée par 1,6 et les
tireurs perdent leur distance de sécurité : ils viennent au contact et la vague
se termine d'elle-même.

Une vague sur cinq est un **boss**. Son budget d'apparitions est nul : il occupe
la vague entière et seuls ses propres renforts sortent.

### Niveaux

Les niveaux ne donnent **plus aucune statistique**. Ils ne donnent que le droit
de **choisir une carte**. Il y avait auparavant deux progressions parallèles —
+30 % de dégâts par niveau jusqu'au niveau 12 (soit ×4,3) automatiquement, et
les cartes par-dessus — et aucune des deux ne se lisait. La première ne se
choisissait même pas.

**La jauge est commune à l'équipe.** Les niveaux montent aux kills ; un soigneur
ne tue rien, un tank tue moins qu'un DPS. Avec des jauges individuelles donnant
des cartes, le DPS accumule pendant que le soutien décroche — et moins il a de
cartes, moins il tue. C'est une spirale, et elle rend les rôles de soutien
injouables.

Les paliers sont **normalisés sur l'effectif** (divisés par `joueurs^0,75`, le
même exposant que le budget de vague). Une jauge commune à paliers fixes donnait
quatre fois plus de cartes à quatre joueurs qu'à un seul, alors que les deux
tables voient exactement les mêmes vagues.

Base **15 kills normalisés** pour le niveau 2, puis **×1,18** à chaque palier,
plafond au niveau 30. La fin de vague verse en prime l'équivalent de 12 kills.
Les montées se **mettent en file** et se consomment à la fin de la vague, jamais
en plein combat : un écran de choix qui s'ouvre pendant qu'on esquive n'est pas
un choix, c'est une punition.

> **Ce qui suit décrit l'ancien système et n'a pas été remesuré.** La lecture de
> fond reste juste — c'est le produit des PV et du débit qui écrase le joueur —
> mais les chiffres datent d'avant les vagues et d'avant la suppression des
> gains de niveau. Les mesures à jour sont plus bas, section « Mesures
> relevées ».

**La pente venait d'une mesure, pas d'une intuition.** Les PV des ennemis montent
linéairement et leur débit d'apparition aussi : c'est le produit des deux qui
écrase le joueur, pendant que la cadence de tir, elle, plafonne. Avec la
première version de la courbe (+12 %), l'arène **saturait à 4 minutes** — passé
ce point on ne nettoyait plus rien, on ne faisait que reculer. À +30 %, la
saturation est repoussée à **plus de 5 minutes** et les 3 minutes redeviennent
jouables :

| ennemis vivants | 2 min | **3 min** | 4 min | 5 min |
|---|---|---|---|---|
| avant (+12 %) | 24 | **111** | 94 | 200 (saturé) |
| après (+30 %) | 21 | **33** | 49 | 144 |

Le correctif est réparti pour qu'aucun levier ne porte seul : dégâts par niveau
+12 % → +30 %, plafond de cadence 0,09 → 0,07 s, rampe d'apparition tous les
45 s → 58 s, PV des ennemis +0,25/s → +0,20/s, plafond d'ennemis 220 → 200.

Depuis, la cadence de tir est devenue **fixe** et ne s'obtient plus que par les
cartes — le bonus au sol de cadence a été retiré de la rotation, comme les trois
autres qui faisaient doublon avec une carte permanente — puis les rampes de
pression sont passées du temps
écoulé au **numéro de vague** : sur une horloge, une équipe qui nettoyait vite
affrontait la vague 6 avec la pression de la vague 3, et la vague cessait d'être
une unité de difficulté comparable d'une partie à l'autre. Les PV montent
maintenant de 9 par vague et le débit de 0,15 apparition/s par vague.

### Classes et compétences

Trois classes, choisies au salon et **verrouillées pendant la manche** :

| classe | PV | dégâts | vitesse | unique |
|---|---|---|---|---|
| Rempart (tank) | 150 | ×0,80 | ×0,92 | oui |
| Soigneur | 100 | ×0,85 | ×1,00 | oui |
| Tireur (dps) | 85 | ×1,20 | ×1,04 | non |

**Les écarts sont volontairement modérés.** Avec « au maximum un tank et un
soigneur », une table de deux peut se composer d'un tank et d'un soigneur : les
trois classes doivent donc rester capables de tuer. Des écarts du type
0,3 / 1 / 2 rendaient ce duo incapable de finir une vague, et la table ne le
découvrait qu'au bout de dix minutes.

Les multiplicateurs de classe passent par `p.mods`, comme les cartes : aucun
système ne demande jamais la classe d'un joueur. Conséquence voulue, la
puissance d'équipe — donc les PV du boss et la pression des vagues — intègre la
classe sans une ligne de plus.

**Le verrou de classe ne dure que la manche.** Il valait pour la session
entière, et sa justification n'existait plus : `startRound()` construit un
`new GameState()` à chaque manche, donc les cartes de classe ne survivent pas
d'une manche à l'autre et il n'y avait plus d'investissement à protéger. Il ne
garde de sens que **pendant** un combat — on ne repasse pas tireur au premier
boss après avoir laissé le tank encaisser les vagues. Il est levé aux deux
sorties de manche, avant la diffusion du salon ; l'emplacement unique se libère
tout seul, puisqu'il se recalcule depuis les classes des clients connectés.

Chaque classe a **une compétence de placement** (proactive, à anticiper) et
**une compétence de réaction** (le bouton qu'on presse quand ça tourne mal).
C'est ce qui évite d'avoir deux boutons redondants.

- **Tank — Rempart** (8 s, recharge 20 s) : zone de 6,5 m qui **suit le tank** et
  donne du bouclier à qui s'y tient.

  Elle était **posée au sol**, et la justification d'origine — « ça récompense
  l'immobilité dans un jeu qui la punit, donc c'est une tension intéressante » —
  n'a pas tenu à l'usage. Ce n'était pas une tension, c'était inutilisable : le
  tank qui va chercher la horde pour la ramener est précisément celui qui ne peut
  jamais rester dedans, et ses alliés n'avaient aucune raison de tenir un disque
  au milieu de l'arène. Le rayon tombe donc de 8,5 m à 6,5 m — une zone qui suit
  vaut bien plus qu'une zone posée, et la garder à 170 px aurait fait du bouton
  une aura permanente sans aucune décision.

  Mais le faire suivre **sans rien d'autre** retire au tank sa seule décision de
  placement. La carte **Ancrage** (rare, classe Rempart) rend donc la version
  posée à qui la veut : 11 m, 12 s, +50 % de bouclier par seconde. C'est la seule
  carte du jeu qui change la *nature* d'une compétence au lieu d'en ajuster un
  chiffre, et « Carapace » — le bouclier du rempart hors de sa zone — est devenue
  sa compagne naturelle : elle ne dit plus rien du rempart de base, dont le
  porteur est toujours dedans.
- **Tank — Provocation** (5 s, recharge 24 s) : tous les ennemis dans 400 px
  prennent le tank pour cible ; il est invulnérable **1,2 s**, puis à −50 % de
  dégâts subis. C'est aussi la compétence qui donne enfin un sens à la
  réanimation — elle arrache la horde d'un allié à terre.
- **Soigneur — Mode soin** (bascule) : les projectiles ne blessent plus mais
  **s'arrêtent quand même sur les ennemis**. Soigner quelqu'un derrière la horde
  devient un problème de position et de ligne de vue, pas un clic sur une barre.
  Toucher un allié à terre fait progresser sa réanimation ; le surplus de soin
  devient du bouclier ; chaque impact sur un ennemi rend 3 PV au soigneur, sans
  quoi le mode serait mort en solo.
- **Soigneur — Vague de soin** (35 PV dans 15 m, recharge 16 s) : instantanée,
  contrairement au rempart qui se prépare.
- **Tireur — Bombe** (recharge 9 s) : **visée**, elle atterrit sous le réticule
  entre 4 et 23 m, et le temps de vol suit la distance (0,15 à 0,75 s). Le délai
  est essentiel — sans lui, c'est un clic gagnant sans anticipation ; mais une
  distance *fixe* de 21 m l'était tout autant dans l'autre sens : sur un amas
  proche, la bombe passait au-dessus et explosait derrière, sans aucun moyen de
  raccourcir le lancer. Un cercle d'atterrissage au sol annonce le point de
  chute pendant le vol, avec la grammaire des annonces de boss. Elle reste
  plafonnée à **12 cibles** : avec 200 ennemis, une explosion peut en toucher
  quarante, et le reste du jeu du tireur cesserait de compter.
- **Tireur — Surcharge** (6 s, recharge 26 s) : +20 % de cadence, **+8 % par
  kill** pendant la fenêtre, jusqu'à +100 %. Déclenchée au creux d'une vague
  elle est médiocre, au pic elle est spectaculaire : le tireur doit lire le
  rythme, comme le tank lit les regroupements.

Pourquoi **1,2 s** d'invulnérabilité et non une invulnérabilité franche : les
annonces du boss durent 1,4 à 2 s. Une fenêtre couvrant une annonce entière
ferait traverser les mécaniques sans les lire, et l'écart entre le joueur qui
lit et celui qui ignore — la mesure de référence de ce dépôt — s'effondrerait.

Douze **cartes de classe** complètent le pool (quatre par classe). Elles ne
sortent qu'au tirage de leur porteur, ce qui soulage au passage l'épuisement du
pool commun signalé plus haut.

### États et purge

Quatre états, pas plus. Ils servent aux boss, aux élites, au soigneur et aux
cartes d'un seul coup — c'est le point du système : une cinquième mécanique de
gêne aurait été une mécanique de plus à apprendre pour rien.

| état | effet | cumuls | expire seul | couleur |
|---|---|---|---|---|
| **Vulnérabilité** | +25 % de dégâts subis par cumul | 3 | 20 s | ambre |
| **Brûlure** | 6 dégâts par seconde | 1 | 5 s | orange |
| **Entrave** | vitesse −40 % | 1 | 6 s | bleu-gris |
| **Sentence** | mise à terre à l'échéance, sauf si soigné à plein | 1 | 8 s | rouge clignotant |

**La Vulnérabilité est la pièce maîtresse.** Elle transforme toute mécanique
« quelqu'un doit encaisser » en décision d'équipe : celui qui encaisse deux fois
de suite ne peut pas encaisser une troisième, donc quelqu'un d'autre doit
prendre le relais. C'est le seul état qui crée de la rotation, et c'est pour ça
qu'il n'expire pas vite.

Ce qui a été **écarté**, et qu'il ne faut pas réintroduire sans relire ceci :
l'immobilité et la fuite (le couple bien connu de FFXIV — rester immobile deux
secondes au milieu de 200 ennemis est une condamnation, pas une consigne), le
sceau qui bloque les compétences (invisible, il frustre sans rien apprendre), la
contagion (elle suppose un système de dispersion qui n'existe pas) et
l'aveuglement (trop discret pour se lire en pleine action). Les quatre retenus
tiennent sur les seuls verbes du jeu : encaisser, bouger, tirer.

**Tous les états expirent seuls.** Le soigneur ne fait qu'accélérer, massivement.
La mécanique existe pour tout le monde ; une équipe sans soigneur joue le même
combat, en subissant plus longtemps. **Sauf la Sentence**, qui ne peut pas
expirer sans devenir décorative : elle n'apparaît donc **que** si l'équipe compte
un soigneur, et le boss qui la porte devra la remplacer par un gros coup
encaissable sur la même cible. Un drapeau lu à la sélection est plus honnête
qu'une menace arbitrairement affaiblie.

#### La purge, à deux niveaux

- **Par insistance** — deux impacts du faisceau de soin sur le même allié en
  moins de 3 s retirent un état. C'est ce qui rend le mode soin plus intéressant
  qu'un robinet de PV : il faut choisir une cible et rester dessus alors que le
  jeu pousse à arroser, et comme le projectile s'arrête sur les ennemis, purger
  quelqu'un derrière la horde devient un problème de position. Mesuré à **0,48 s**
  pour un soigneur qui a la ligne de vue.
- **En urgence** — la vague de soin retire un état à tous les alliés touchés,
  toutes les 16 s. C'est le bouton qui rattrape une phase ratée.

Deux filets pour les équipes sans soigneur : le bonus au sol **Purification**
(retire tout, poids de tirage doublé quand personne ne peut purger) et le
**rempart du tank** (un état retiré à l'entrée, une fois par joueur et par pose).

**Une purge ne retire jamais qu'un seul état**, dans l'ordre
`Sentence > Brûlure > Entrave > un cumul de Vulnérabilité`. Sans cette règle les
cumuls ne veulent plus rien dire et le soigneur annule mécaniquement tout le
travail du boss — ce qui le rend d'abord obligatoire, puis pénible à jouer.

#### Qui pose des états

Les **élites** en appliquent au contact, ce qui donne enfin une raison de les
traiter en priorité plutôt que de les contourner : runner → Entrave, tank →
Vulnérabilité, shooter → Brûlure, avec 4 s de recharge par élite. L'esquive
protège de l'état comme elle protège des dégâts.

Les **boss** en poseront au lot 4, sur deux usages : échec de mécanique →
Vulnérabilité (la sanction standard : elle ne tue pas, elle rend la suite plus
dangereuse), et usure imposée → un cumul à toute l'équipe toutes les 25 s. Ce
« Miasme » ne vaut **que** s'il existe une fenêtre de purge en face : sans elle
il punit tout le monde également sans creuser l'écart entre un joueur qui lit les
annonces et un joueur qui les ignore, qui est la mesure de référence du dépôt.

Deux **cartes** parlent aux états : *Antidote* (rare, les états durent 40 % moins
longtemps sur soi) et *Catalyseur* (épique, +15 % de dégâts contre un ennemi
affecté). Côté ennemis, la brûlure des munitions incendiaires et la
vulnérabilité du Détonateur restent deux champs légers plutôt qu'une table
d'états complète — payer une `Map` par ennemi sur les 200 de l'arène, vingt fois
par seconde, pour deux effets qui n'en concernent qu'une poignée ne se justifie
pas. Ce qui a été unifié, c'est la **lecture** : `enemyStatusMask()` est la seule
définition de « cette cible est affectée », et c'est elle que lit *Catalyseur*.

#### Ce que l'écran montre

Sans lecture instantanée de l'état des alliés, le soigneur est injouable — d'où
un affichage livré avec la mécanique et non dans une passe de finition : une
**barre de vie au-dessus de chaque joueur** (bouclier superposé en cyan, ambre
sous 50 %, rouge sous 25 %), les **icônes d'états sous la barre** avec un halo de
la couleur de l'état sur le personnage, un **cadre d'équipe** en coin d'écran
(une ligne par joueur, barre et icônes) et le **décompte chiffré de la Sentence**,
gros, sur le joueur concerné comme dans le cadre. Quand l'arène contient 200
ennemis, chercher visuellement qui est bas est impossible, et une icône seule ne
se voit pas.

### Difficulté indexée sur la puissance de l'équipe

Les PV du boss étaient déjà calés sur la puissance mesurée de l'équipe, mais
**pas la pression des vagues**, qui suivait une rampe purement temporelle. Avec
quinze cartes au lieu de quatre, les vagues seraient devenues triviales pendant
que le boss restait calibré. Les PV des ennemis et le débit d'apparition en
tiennent donc compte à leur tour (à 55 % et 35 %).

**L'indexation porte sur la puissance mesurée, jamais sur la composition.** La
tentation était d'ajuster selon les rôles présents — plus de PV aux monstres
s'il y a un soigneur. C'est le mécanisme qui a tué les rôles de soutien dans
beaucoup de jeux coopératifs : celui qui choisit le soigneur rend la partie plus
dure pour tout le monde, et plus personne ne le choisit. Une équipe avec
soigneur a mécaniquement moins de dégâts bruts, donc une puissance mesurée plus
faible, donc des vagues un peu plus tendres. L'ajustement se fait tout seul.

*Réserve connue :* la puissance capture les dégâts, pas la survie. Un soigneur
augmente surtout la durée de vie. Si une mesure montre un écart, corriger le
**débit** et non les PV — c'est la densité qui tue, pas la résistance.

### Boss

Un boss occupe **une vague sur cinq**, avec 6 % de PV en plus à chaque fois. Il
en existe **cinq**, tirés au sort, et chacun demande **autre chose**.

Ses PV sont indexés sur **le nombre de joueurs et sur la puissance mesurée de
l'équipe**, pour que la durée du combat ne dépende ni de l'un ni de l'autre.
Sans cette indexation, une équipe bien équipée pliait le deuxième boss en 18 s
au lieu de 45 : le boss doit rester le mur de la manche, pas la récompense
d'avoir farmé.

#### Le genou de puissance

Cette indexation était **linéaire pleine, sans plafond** : puissance ×2 donnait
un boss à ×2 de PV, donc une durée de combat rigoureusement constante. C'était
le seul système du jeu dans ce cas — les vagues ne répercutent depuis toujours
qu'une **part** de la puissance (`WAVE_HP_POWER_K` à 0,55, `WAVE_RATE_POWER_K`
à 0,35).

Ce que ça coûtait, mesuré : **300 manches solo tireur** avec le vrai système de
tirage, `powerIndex` relevé à chaque carte prise.

| cartes | optimisé | hasard p10 / p50 / p90 | pire |
|---|---|---|---|
| 3 | 1,65 | 1,26 / 1,26 / 1,76 | 1,26 |
| 6 | 2,19 | 1,26 / 1,47 / 2,32 | 1,26 |
| 9 | 3,10 | 1,26 / 1,67 / 2,69 | 1,26 |
| 12 | 4,00 | 1,36 / 1,89 / 3,53 | 1,26 |
| 15 | 5,33 | 1,47 / 2,19 / 4,10 | 1,26 |

À 16 cartes, **×4,54** entre une build optimisée et une qui ne prend que du
défensif, et **×2,93** par la **chance seule** (p90/p10 à choix aléatoire). Un
joueur pouvait faire trois fois les dégâts d'un autre au même niveau et voir
exactement le même combat de boss. La sensation de puissance valait ×1,10 à
×1,59 sur les vagues, et **×1,00 exactement** sur les boss.

D'où un **genou** : les PV suivent la puissance en plein sous
`BOSS_POWER_KNEE`, puis n'en prennent plus que `BOSS_POWER_K` au-dessus.

| puissance | PV avant | PV après | ratio |
|---|---|---|---|
| 1,26 | 1512 | 1512 | ×1,000 |
| 2,50 | 3000 | 3000 | ×1,000 |
| 3,00 | 3600 | 3300 | ×0,917 |
| 4,10 | 4920 | 3960 | ×0,805 |
| 5,71 | 6852 | 4926 | ×0,719 |
| 8,00 | 9600 | 6300 | ×0,656 |

Un genou et non un plafond dur (`Math.min`) : un plafond crée une falaise où la
carte qui fait franchir le seuil ne vaut plus rien.

Le genou est à **2,5** parce que la build **médiane mesurée vaut 2,36** : tout
l'étalonnage existant (`BOSS_HP_MUL`, les `hpMul` du roster, les cinq durées par
boss) reste valide tel quel, et seules les bonnes builds voient une différence.
La sensation reste volontairement **sous** celle des vagues — ×1,39 au mieux
contre ×1,52 à ×1,59 : le boss est le mur de la manche, il doit récompenser
moins que la piétaille. `BOSS_POWER_K = 1` rend exactement l'ancienne courbe.

`_bossPower()` est le point de passage unique, et les structures de mécanique
(cage, grappe) y passent aussi : sans ça, une build au-dessus du genou trouverait
les cages **relativement plus dures** que le boss lui-même.

**Réserve sur les durées.** Le banc de combat monté pour ce lot n'est pas
fiable : bot immobile, renforts qui encaissent les balles à la place du boss,
mécaniques multi-joueurs jouées en solo. Les durées par boss qui en sortent
contiennent trop de bruit pour figurer ici. Le rapport `PV après / PV avant`
ci-dessus, lui, est déterministe. Sur les cellules où le banc terminait, la
baisse observée à 4,12 de puissance était de **0,76 à 0,81**, contre 0,805
attendu — cohérent, mais à confirmer avec un vrai bot mobile qui priorise le
boss avant de retoucher aux constantes.

La base a été recalibrée de 1500 à **1200** avec la suppression des gains de
niveau. La formule n'a pas changé, mais l'échelle de la puissance, elle, a
changé du tout au tout : elle incluait le ×4,3 de dégâts des niveaux, elle ne
reflète plus que les cartes.

#### Cinq boss, un verbe chacun

Plutôt qu'empiler des mécaniques sur un boss unique — ce qu'on avait, et qui
finissait par tout demander à la fois sans rien demander de précis — cinq
combats qui posent chacun une question différente. Le Ravageur existant en est
devenu un, sans être réécrit.

| boss | verbe | effectif | PV | ce qu'il apprend |
|---|---|---|---|---|
| **Ravageur** | positionnement | 1+ | ×1,00 | lire le sol |
| **Matriarche** | gestion de cibles | 1+ | ×0,85 | choisir sa cible plutôt que taper fort |
| **Métronome** | mouvement | 1+ | ×0,90 | ne jamais s'arrêter |
| **Oracle** | cohésion | 2+ | ×0,95 | se coordonner |
| **Jumeaux** | séparation | 2+ | ×1,00 | se séparer quand tout pousse à se grouper |

Le tirage est **sans répétition tant que la liste n'est pas épuisée**, filtré par
effectif. En solo on tire donc parmi les trois boss dont les mécaniques sont
individuelles par nature : un Oracle à un joueur, c'est le boss de la
coordination sans équipe — il ne resterait que la punition.

Son nom et son verbe sont annoncés à l'entrée et rappelés dans la barre haute.
C'est ce qui permet de savoir comment se placer avant la première mécanique.

**Chacun a sa silhouette et sa couleur.** Jusqu'au lot 6, les cinq passaient par
une seule routine de dessin — couronne de dix pointes, noyau à huit faces, œil
central — et le seul écart était la couleur des Jumeaux : mécaniquement ils
n'avaient rien à voir, visuellement ils étaient interchangeables. C'était le plus
gros écart identité / contenu du jeu. Chaque silhouette **annonce son verbe** :

| boss | silhouette | animation d'inactivité |
|---|---|---|
| **Ravageur** | l'originale, conservée : bloc compact, couronne de pointes, lourd | il respire |
| **Matriarche** | abdomen segmenté et bas sur le sol, quatre appendices courts, **poches d'œufs** dont le nombre décroît d'une par barre brisée, tête minuscule | elle pulse, les poches en opposition de phase |
| **Métronome** | purement géométrique, **aucun membre** : trois anneaux concentriques désaxés à trois vitesses, noyau **vide** | il tourne |
| **Oracle** | un grand œil unique, deux anneaux **détachés du corps**, six glyphes qui s'allument | il dérive |
| **Jumeaux** | deux **demi-formes complémentaires**, chacune incomplète, qui s'emboîtent quand ils convergent | ils oscillent en opposition de phase |

Les poches de la Matriarche sont la seule lecture de progression qui ne demande
pas de regarder la barre du haut ; le noyau vide du Métronome est ce qui le
distingue des quatre autres, tous pleins ; et les demi-formes des Jumeaux rendent
leur mécanique de soin mutuel lisible **sans lire la barre**.

Une couleur dominante par boss, distincte des cinq teintes d'ennemis, et **la
barre de vie prend la teinte de la créature** : deux informations sur le même
adversaire ne peuvent pas être de deux couleurs différentes.

#### La posture d'attaque, et pourquoi elle a été refaite

Le corps se contractait avant une attaque, et la tension était déduite du
**bandeau d'alerte** : une rampe linéaire qui montait pendant que le texte était
affiché. C'était faux, et d'une façon qui annulait tout l'effet.

Le bandeau disparaît volontairement **250 ms avant la résolution** — un texte
encore affiché au moment de l'impact masque exactement ce qu'il faut regarder.
La tension retombait donc à zéro un quart de seconde **avant** le coup : le boss
se détendait pile avant de frapper, et rien du tout ne marquait l'impact
lui-même. Une anticipation sans relâche n'est pas une anticipation, c'est un
changement de taille.

La posture a maintenant **sa propre horloge**, calée sur la résolution et non sur
le texte, en trois temps :

| temps | ce qui se passe | pourquoi cette courbe |
|---|---|---|
| **anticipation** | le corps se ramasse, jusqu'à −9 % | **en carré, pas en linéaire** : une rampe droite se lit comme un état, un resserrement qui accélère se lit comme un élan qui se charge, et le gros du mouvement tombe dans le dernier tiers |
| **maintien** | il reste ramassé jusqu'au coup | c'est ce que l'ancienne version perdait |
| **relâche** | détente à +12 %, tenue cinq images, puis retombée avec un léger contre-mouvement | l'asymétrie (−9 / +12) est voulue : une détente qui ne dépasse pas le repos se lit comme un **arrêt** et non comme un coup porté |

Le palier de maintien est **mesuré et non choisi**. Sans lui, la courbe amortie
seule tombait de 1,0 à 0,09 en cent millisecondes, soit quatre images à 60 Hz :
le sommet n'existait qu'un instant et le coup ne se lisait pas. À 0,22 de la
relâche, l'extension tient cinq images pleines — le minimum pour qu'un mouvement
soit vu plutôt que deviné.

Et **chaque boss rend le coup dans son propre verbe**, plutôt que de partager le
seul écrasement commun :

| boss | ce que fait la relâche | pourquoi |
|---|---|---|
| **Ravageur** | les pointes jaillissent au **double** de leur retrait, la couronne prend de l'avance sur le corps | le dépassement porte la lecture de l'impact ; la retraction ne fait que l'annoncer |
| **Matriarche** | les poches d'œufs se **vident** au lieu de gonfler | seule pièce du jeu à aller à contresens de la détente : ce qui sort d'elle *est* le danger, donc l'instant doit se lire comme une expulsion |
| **Métronome** | à-coup **proportionnel à la vitesse** de chaque anneau | un à-coup identique pour les trois les aurait fait bouger comme une seule pièce — exactement ce que les trois vitesses existent pour éviter |
| **Oracle** | les glyphes s'éteignent pendant que l'œil se dilate | l'énergie va quelque part, elle ne disparaît pas : la créature devient causale |
| **Jumeaux** | l'oscillation **enfle**, les deux moitiés s'écartent | leur verbe est la séparation, pas la poussée — un écrasement n'aurait rien dit ici |

Rien de tout ça ne coûte un champ de plus dans l'instantané : la fenêtre est
posée par le **canal d'alerte**, qui passe déjà par la timeline interpolée.

Les boss ne sont **pas dans l'atlas** : ils sont uniques à l'écran, leur coût de
tracé est négligeable, et ils gagnent à être animés en continu — ce que l'atlas
ne sait pas faire. Ils manquaient donc à la planche de silhouettes ; `?planche`
en sort désormais une bande à part, produite par la **même** routine de dessin
que le jeu.

Les `PV` corrigent ce que le verbe coûte en temps de tir : la Matriarche voit
une partie des dégâts partir sur ses rejetons, le Métronome fait passer le
combat à courir. L'Oracle était prévu à ×1,10 dans le plan ; **la mesure a dit
le contraire** — 80 s à deux et 97 s à quatre, contre 50 à 57 pour le Ravageur,
parce que le Regard fait cesser le tir deux secondes à chaque pose et que les
tours éloignent du boss. Ramené à ×0,95.

##### La Matriarche — gestion de cibles

Elle pond des **grappes** qui éclosent en trois runners au bout de 12 s si on ne
les détruit pas, et des **rejetons nourriciers** qui la soignent tant qu'on ne
les tue pas. Le combat n'est plus « tirer sur le boss » mais « choisir sa
cible », ce qui punit une équipe qui ne fait que du dégât brut. Aux dernières
barres, elle enferme un joueur dans un **cocon** que les autres doivent briser.

Pendant tout son combat, **chaque tir de la horde laisse une mare** de 15 s : le
sol se réduit à mesure que le combat traîne. Sa **traque** ne vise plus une
position figée mais **poursuit** — la zone colle aux talons pendant son annonce,
plus lentement qu'on ne court. On ne s'écarte plus d'un point, on dessine une
trajectoire, et il faut le faire sans ramener la zone sur ses alliés.

##### Le Métronome — mouvement

Aucune décision, que de l'exécution : le seul boss où le tir compte peu.
**Exaflares** (une séquence d'explosions traverse l'arène, seule la première est
annoncée), **appâts** (la zone se pose là où on était il y a une seconde, avec un
fantôme visible qui suit), **disques en dérive**, **sanctuaires** (toute l'arène
devient dangereuse sauf deux ou trois disques sûrs, qui se déplacent) et **sol
glissant** (de l'inertie sur le déplacement).

##### L'Oracle — cohésion

Le boss « raid » : **regroupement** et **dispersion** en alternance, **tours** à
occuper, **dénombrement** à trois joueurs et plus, **regard**, **cônes** en
éventail sur chaque joueur et **Pac-Man** (tout le disque explose sauf un
secteur, avec des dégâts qui se dégradent depuis le centre). Sa **jauge
d'ultime** monte toute seule et ne descend que si les tours sont toutes tenues —
c'est le seul endroit du jeu où réussir une mécanique achète du temps au lieu
d'éviter une punition. Au maximum, elle frappe toute l'équipe.

Il pose aussi le **Miasme** : un cumul de Vulnérabilité à toute l'équipe toutes
les 25 s. C'est le boss du Miasme parce que c'est celui qui offre des fenêtres
pour le purger — posé ailleurs, il ne serait qu'un impôt.

##### Les Jumeaux — séparation

Deux boss, **une seule réserve de vie**. Ils se soignent mutuellement à moins de
400 px l'un de l'autre : l'équipe doit se séparer, ce qui est terrifiant quand
la survie dépend d'habitude du regroupement. Chacun applique un état différent
au contact — **Brûlure** pour l'un, **Entrave** pour l'autre — et **porter les
deux fait exploser**, ce qui interdit de les traiter ensemble. Ils se
distinguent à la couleur. À la dernière barre, ils convergent : il faut se
regrouper alors qu'on a passé le combat à s'écarter — et chacun pose une **croix
durable**, quatre bandes qui restent huit secondes et ne laissent que quatre
quadrants sûrs.

#### Les mécaniques de groupe

Elles sont transversales, réutilisées par plusieurs boss, et suivent toutes le
cycle annonce → résolution déjà en place.

- **Regroupement** — un joueur est marqué, un cercle apparaît sur lui. À la
  résolution, les dégâts sont **divisés par le nombre de joueurs dans le
  cercle**. Seul dedans, on encaisse tout.
- **Dispersion** — une distance minimale entre joueurs à la résolution. Chaque
  paire trop proche est sanctionnée, une seule fois.
- **Tours** — N zones à occuper. Chaque tour vide frappe **toute l'équipe**.
- **Dénombrement** — variante avec un nombre exact de joueurs par zone, affiché
  sur le marqueur. Deux zones, une répartition inégale tirée au sort : à une
  tour par joueur, « le nombre exact » se lirait « un chacun » et la variante
  n'ajouterait rien.
- **Lien** — deux joueurs reliés subissent des dégâts continus jusqu'à ce qu'ils
  s'éloignent de 300 px.
- **Prison** — un joueur immobilisé, **esquive comprise**, jusqu'à ce que les
  autres brisent la cage en tirant dessus. C'est la seule chose du jeu qui coupe
  l'esquive, et c'est assumé : la mécanique n'existe que parce qu'elle demande
  aux **autres** d'agir.
- **Regard** — pendant deux secondes, tout joueur dont la **direction de visée**
  pointe vers le boss est sanctionné. Elle punit exactement le réflexe central du
  jeu, et n'existe que parce qu'on vise à la souris.
- **Proximité** — dégâts dégradés selon la distance à l'épicentre, létaux au
  centre. Un dégradé plutôt qu'un binaire dedans/dehors.

Le sens se lit **à la couleur** avant même d'avoir lu le bandeau : cyan « va
dessus », rouge « sors de là », jaune « détruis ».

#### L'adaptation à l'effectif

Un **seuil par mécanique** plutôt qu'une variante de combat par effectif : cinq
variantes de cinq boss auraient été impossibles à maintenir, et la première à
dériver aurait rendu ce tableau faux sans que personne ne s'en aperçoive.

| mécanique | 1 joueur | 2 | 3-4 |
|---|---|---|---|
| Tours | 1 tour | 2 | = joueurs vivants |
| Dénombrement | remplacé par des tours | tours | actif |
| Regroupement | remplacé par une zone à esquiver | actif | actif |
| Dispersion | absente | active | active |
| Lien | absent | actif | actif |
| Prison | remplacée par une grappe à détruire | active | active |
| Grappes / rejetons | une seule | deux | deux |
| Regard, Proximité | actifs | actifs | actifs |
| Sentence | absente sans soigneur | selon composition | selon composition |

#### La sanction d'échec

**Une mécanique ratée met à terre, elle ne tue jamais sèchement.** Dans un MMO,
rater une mécanique tue et on recommence en trois minutes ; ici une manche ratée
coûte plusieurs minutes de progression et de cartes, et le système de
réanimation existe précisément pour ça.

Les dégâts d'un échec valent **90 % des PV max** de la cible — en part et non en
valeur brute, qui vieillirait dès la première carte de PV — et un joueur à
pleine vie ne peut pas en mourir : le plafond est dans `_hurt()`, au point de
passage unique. C'est le **cumul de Vulnérabilité** posé par l'échec qui rend le
**second** fatal : la progression de la sanction est portée par l'état.

Vérifié plutôt que supposé, dans le pire cas (cauchemar, trois cumuls, ratio
plein) : après un échec **1 PV, debout** ; après le second, **à terre**.

#### Le bandeau de consigne

Les mécaniques passent par un **canal d'événements ponctuel**, hors du snapshot
à 20 Hz : le serveur envoie `{t:"alert", mech, level, dur}` au moment de
l'annonce. Le client en affiche **une consigne à la fois**, la dernière reçue,
au tiers supérieur de l'arène — deux consignes empilées pendant qu'on esquive ne
se lisent pas, et une consigne collée à la barre de boss n'est jamais lue.

Sans ce canal, personne ne comprendrait jamais l'Oracle : un cercle cyan ne dit
pas « regroupez-vous » à la première rencontre.

#### Cinq barres de vie

Le boss ne se lisait qu'en trois attaques tournantes et mourait en 25 s : c'était
un gros ennemi, pas un combat. Il a maintenant **cinq barres de vie** — une
jauge affichée, et un compteur `×5` à côté qui dit combien il en reste.

Une seule jauge pour 2,6 fois plus de PV avançait si lentement qu'on ne voyait
plus ses propres dégâts. Découpée, **chaque barre est un objectif atteignable**
(une dizaine de secondes) et sa rupture devient un évènement : projectiles
effacés, respiration d'une seconde et demie, et une **mécanique de plus** qui
s'ajoute au répertoire.

Le souffle **ne déplace pas** les joueurs, et c'est un retour en arrière assumé.
Il projetait de 260 px, soit trois fois le seuil de recalage de la prédiction
locale : le personnage était arraché de sa position au lieu d'être poussé, et
ça arrivait 110 ms avant l'image qui l'explique. Pire, la rupture ne se
programme pas — on la déclenche en tirant — donc un joueur au milieu d'une
esquive de zone se faisait replacer dedans par un évènement qu'il n'avait aucun
moyen de jouer. Un déplacement qu'on ne peut ni anticiper ni contrer n'est pas
une difficulté.

**Il ne blesse plus non plus.** C'était 18 points de dégâts, multipliés par la
difficulté et par la Vulnérabilité en cours, cinq fois par combat et pour les
cinq boss : le jeu **punissait une réussite**. Casser une barre est désormais une
récompense — les projectiles en vol s'effacent et le boss respire. La sanction,
quand il en faut une, vient des mécaniques ratées, qui elles se jouent.

**Et la rupture parle le verbe de son boss.** La même ligne cinq fois par combat
pour cinq adversaires qui n'ont mécaniquement rien à voir, c'était le plus gros
écart identité / contenu qui restait après le roster.

| boss | à la rupture de barre |
|---|---|
| Ravageur | le souffle, seul — il nettoie l'arène |
| Matriarche | **cinq rejetons** éclosent autour d'elle, hors budget de vague |
| Métronome | **les motifs s'inversent** : toutes les zones mobiles repartent en sens contraire |
| Oracle | **un cumul de Vulnérabilité** à toute l'équipe |
| Jumeaux | **ils échangent leurs places** — l'équipe qui venait de se répartir est du mauvais côté |

Chacune **s'annonce** par le canal de consigne existant. Une variante qui ne
s'annonce pas surprend au lieu d'informer, c'est-à-dire exactement le reproche
qu'on fait à une mécanique punitive. Les zones qui *poursuivent* un joueur sont
exclues de l'inversion du Métronome : une poursuite inversée devient une fuite,
donc plus rien.

**Le répertoire est propre à chaque boss** — c'est ce qui change d'un combat à
l'autre, les cinq barres et la montée en répertoire restant le squelette commun.
Celui du Ravageur, pour l'exemple :

| barres brisées | ce qui s'ouvre |
|---|---|
| 0 | salve radiale · marques au sol · charge |
| 1 | **damier** — une case sur deux, puis l'autre moitié |
| 2 | **couronne** — le centre puis l'anneau, ou l'inverse |
| 3 | **couloirs** · **spirale** |
| 4 | **balayage** · **mur** · **verrouillage par quadrant** |

On apprend donc le combat **par couches**, et la dernière barre se joue avec le
répertoire complet, un rythme resserré (−36 % sur le temps entre deux attaques)
et des dégâts de zone majorés de 56 %.

Un boss démarre avec le répertoire déjà ouvert des combats précédents : au
troisième, on ne réapprend pas le damier en deuxième barre. C'est ce qui rend le
troisième combat plus dur que le premier sans lui ajouter de PV, qui
n'allongeraient que sa durée.

#### Les mécaniques

Elles reposent sur six formes de zone — disque, rectangle orienté, anneau,
cône, Pac-Man, croix — et sur un principe commun : **il n'existe pas de refuge
permanent**, il faut lire l'annonce et se déplacer entre les deux temps.

- Le **damier** découpe l'arène en 4 × 3 cases dont une sur deux explose, puis
  l'autre moitié. Chaque point appartient à exactement une case : on est
  forcément touché par une des deux vagues si on ne bouge pas. Les cases se
  touchent **exactement** — avec le jeu de quelques pixels qu'on met d'habitude
  pour la lisibilité, il restait une ligne parfaitement sûre sur toute la
  hauteur de l'arène. Le retrait visuel se fait au dessin, jamais sur la zone de
  dégâts.
- La **couronne** frappe l'anneau extérieur puis le centre, ou l'inverse — un
  tirage à pile ou face, pour qu'on ne joue pas de mémoire.
- Les **couloirs** annoncent trois bandes, puis les trois perpendiculaires : on
  lit un axe, on se place, on relit l'autre.
- Le **balayage** fait partir douze pales du boss, décalées de 0,12 s : on court
  avec l'aiguille, et il faut s'éloigner du boss pour trouver un intervalle.

**Ces mécaniques sont esquivables, et c'est mesuré.** Trois comportements
simulés face au premier boss, en solo puis à quatre :

| comportement | PV perdus (solo) | chutes | PV perdus (4 j.) | chutes |
|---|---|---|---|---|
| ne lit pas les annonces | 473 | 3 | 906 | 28 |
| sort à pied des zones | 280 | 2 | 474 | 14 |
| sort à pied **et** esquive | 280 → 217 | 1 | 382 | 11 |

Lire les annonces divise les dégâts par deux et les chutes par trois. Si le
deuxième comportement ne s'en tirait pas nettement mieux que le premier, c'est
que le combat serait injuste et non difficile — c'est précisément ce que ce
tableau surveille.

**Son arrivée balaie l'arène** : tous les ennemis présents sont effacés, ainsi
que les projectiles et les zones en cours, avec une onde blanche qui traverse
l'écran. Aucun point n'est crédité pour ces morts — ce n'est pas un cadeau de
score, c'est une remise à zéro du décor.

Sans ce nettoyage, le boss débarquait au milieu de **plus de 200 ennemis déjà
présents** : sa silhouette, ses zones télégraphiées et sa barre de vie se
perdaient dans la masse, et concentrer son feu sur lui était impossible.

Pendant le combat, **les vagues normales sont coupées**. C'est lui qui gère le
rythme : il appelle ses propres renforts toutes les 15 s (3 + un par joueur),
plafonnés à 55 ennemis pour que le combat reste lisible.

Le tuer rapporte 500 points et rend 40 PV à tout le monde, puis les vagues
normales reprennent — l'arène se remplit à nouveau en une quarantaine de
secondes. Son armure se fissure visuellement à mesure qu'il encaisse.

Ses PV sont calés sur le nombre de joueurs (`BOSS_HP_BASE × joueurs^1,15`), de
sorte que le combat dure à peu près aussi longtemps à un qu'à quatre, avec un
léger supplément pour les groupes.

Ils sont aussi calés sur la **puissance réelle de l'équipe**. C'était le niveau
moyen tant que le niveau était la seule progression ; avec les cartes, deux
équipes de même niveau peuvent infliger le simple et le triple. `_playerPower()`
estime donc des dégâts par seconde — dégâts, nombre de canons, cadence, arme de
remplacement — et le boss se dimensionne dessus. Sans ce changement, le
troisième boss tombait en quinze secondes et cessait d'être le mur de la manche.

La croissance d'un boss au suivant est **descendue de 15 % à 6 %**. Ce n'est pas
un adoucissement : la progression de l'équipe entre déjà dans le calcul via
`_playerPower()`, et la garder à 15 % par-dessus revenait à compter deux fois la
même chose. Mesuré sur quatre boss d'affilée : **54 / 63 / 64 / 68 s** en solo,
contre 51 / 61 / 71 / 77 s pour l'ancienne courbe de cadence sans cartes.

Trois mécaniques de sol se distribuent entre les boss plutôt que d'appartenir à
tous — elles étaient auparavant ouvertes par **numéro de boss**, ce qui n'a plus
de sens depuis qu'il y en a cinq :

- **spirale** (Ravageur) — trois bras de projectiles qui tournent lentement.
  Contrairement à la salve, on ne s'en écarte pas d'un pas : il faut courir dans
  le sens de rotation, ce qui interdit de rester collé au boss. C'est la réponse
  à une équipe qui a assez de dégâts pour le coller.
- **traque** (Matriarche) — la zone se pose sur le joueur, trois fois de suite.
  La première s'évite en marchant, la troisième oblige à avoir prévu où aller.
- **mur** (Ravageur) — une bande traverse l'arène par paliers, avec un trou qui
  se déplace à chaque pas. On ne lit pas une forme, on lit un trajet, et il n'y a
  nulle part où attendre.

#### Les zones qui restent

Jusqu'ici, une zone s'annonçait, explosait, disparaissait. Le jeu n'avait donc
**aucune notion de « rester dedans coûte cher »** — tout se jouait à un instant
précis, et jamais sur une position tenue.

Une zone porte maintenant deux champs de plus : `dot`, des dégâts par seconde, et
`life`, une durée de vie. Une fois l'annonce passée, elle **reste** et frappe par
paliers d'un quart de seconde. Le quart de seconde n'est pas cosmétique : à
soixante applications par seconde, la barre de vie fond en continu et plus rien
ne dit au joueur *ce* qui le frappe.

Ce sont ces deux champs qui rendent écrivables :

- les **flaques rémanentes** de la Matriarche — chaque tir de la horde laisse une
  mare de 15 s pendant son combat. L'arène se réduit au fil des minutes : un
  combat qui traîne devient physiquement plus dur. C'est un chronomètre déguisé,
  bien plus lisible qu'un enrage brutal. **Plafonnées à 25** simultanées, la plus
  ancienne cédant sa place — sans ce plafond, une fin de combat pavait le sol.
- la **croix durable** des Jumeaux (dernière barre) — quatre bandes depuis chacun,
  quatre quadrants sûrs, huit secondes à tenir sa portion au lieu d'un saut à
  placer.

#### Le cône, le Pac-Man et les dégâts de proximité

Trois ajouts pour l'Oracle, et trois gestes qu'aucune forme existante ne
demandait :

- le **cône** part du boss vers chaque joueur. On l'esquive **latéralement** — le
  disque se fuit en ligne droite, la bande se traverse, le cône ni l'un ni
  l'autre.
- le **Pac-Man** est son inverse exact : tout le disque explose **sauf** un
  secteur. On ne fuit pas, on se **place** derrière une direction précise.
- les **dégâts de proximité** ne sont pas une forme mais un **mode de
  résolution** : les dégâts se dégradent avec la distance à l'épicentre, létaux
  au centre. Il se combine avec n'importe quelle forme — le Pac-Man le porte, ce
  qui évite de dessiner deux zones concentriques pour dire la même chose.

#### L'arène qui bouge

Deux mécaniques du Ravageur ne posent pas de zone : elles changent la **surface**.

La **constriction** referme les limites par paliers. L'arène passe de 1600 × 900
à un carré central, sans descendre sous 45 % de chaque dimension — en dessous,
deux cents ennemis n'y tiennent plus et le positionnement ne veut plus rien dire.
Le palier est annoncé 2,6 s à l'avance ; qui est pris dehors à l'échéance subit
la sanction de mécanique habituelle, **qui met à terre et ne tue jamais sec**,
puis est repoussé à l'intérieur. La constriction ne piège jamais personne.

C'est aussi **la seule mécanique de sol du jeu qui blesse les ennemis**, et c'est
une décision explicite. Des zones de boss qui frapperaient la horde annuleraient
la difficulté d'elles-mêmes : on y attirerait les ennemis et le boss deviendrait
une ressource. La constriction fait l'inverse — elle **comprime** la horde avec
les joueurs, et en faire un outil de nettoyage désespéré est ce qui rend le
palier mémorable au lieu d'être une taxe de surface. Les flaques, les
sanctuaires et le sol glissant ne blessent pas les ennemis, pour la même raison
que les zones de boss.

Le **verrouillage par quadrant** plante deux murs infranchissables qui coupent
l'arène en quatre pendant 20 s. Chacun se retrouve avec sa portion de horde, le
regroupement est brisé et le soigneur hors de portée. Il ne sort **qu'à trois
joueurs et plus** : à deux, ça revient à jouer deux parties solo, et en solo ça
ne veut rien dire — en dessous du seuil, il se replie sur un quart d'arène qui
pulse, même geste sans dépendance à un allié. Les murs **bloquent et ne blessent
pas**, d'où une couleur franchement différente de tout ce qui explose.

#### Pourquoi la zone affichée est plus grande que la zone qui blesse

Le client affiche avec **110 ms de retard** sur l'état du serveur. Un joueur qui
sort d'une zone à l'image exacte où elle explose *sur son écran* était encore
dedans côté serveur. Sur des zones instantanées ça passe ; sur les exaflares, les
zones mobiles ou les croix durables, où l'on frôle en permanence, c'était la
source numéro un de « j'étais sorti ! ».

Le rayon de collision est donc **rétréci de 10 %** par rapport au rayon affiché
(`ZONE_FORGIVE`), et le sens s'inverse pour ce qui **épargne** — trou de
l'anneau, secteur sûr du Pac-Man — qui s'élargit d'autant. La tolérance pardonne
toujours dans le même sens.

L'alternative exacte était de résoudre contre la position du joueur telle qu'elle
était il y a 110 ms. Elle demande un historique de positions pour **tous** les
joueurs en permanence, alors qu'on ne le paie aujourd'hui que pour les appâts du
Métronome. C'est un écart affichage/logique assumé, documenté ici et dans
`CLAUDE.md` — sans quoi un futur lecteur le prendrait pour un bug.

#### Deux temps, deux langages

L'arène contient déjà des zones rouges, deux cents ennemis et des projectiles.
Ajouter des zones qui restent exigeait une distinction visuelle **nette**, faute
de quoi tout ce catalogue devient du bruit :

| état | rendu |
|---|---|
| **annonce** | remplissage faible, contour en pointillés qui **défilent**, anneau de compte à rebours au centre |
| **active** | remplissage franc, contour fixe, léger pulsé, clignotement sur les trois dernières secondes |

L'anneau de compte à rebours est au **centre** et non sur le contour : un arc
épousant le contour n'avait aucun sens sur un rectangle ou un couloir long de
toute l'arène — c'est la raison pour laquelle il avait été retiré. Au centre, il
vaut pour les six formes. Il ne sort que s'il y a huit annonces ou moins : douze
anneaux sur un damier disent moins que les douze contours eux-mêmes.

Les zones persistantes sont **fusionnées** : un seul chemin, un contour obtenu
par dilatation plutôt que par un trait par zone. Sur douze mares qui se
chevauchent, un trait par mare redessinait chaque cercle à l'intérieur de la
tache et on ne voyait plus où finissait la surface dangereuse. Le rendu est
plafonné à **40 zones**, les plus urgentes d'abord.

### Cartes d'amélioration

À chaque niveau d'équipe gagné, chacun choisit **une carte parmi trois**, tirées
indépendamment pour chaque joueur. Le choix se fait à la **fin de la vague**, pas
au moment de la montée : un écran qui s'ouvre pendant qu'on esquive n'est pas un
choix. Elles sont **permanentes** jusqu'à la fin de la manche. Les joueurs à
terre choisissent aussi : sinon un joueur malchanceux décroche définitivement.

Quatre raretés — commune, rare, épique, légendaire — dont les poids dérivent
avec la **qualité de tirage** (`épique ×1,18`, `commune ×0,92`), plafonnée à
6 crans. Sans dérive, une épique à 10 contre 60 ne sort jamais d'une manche ;
sans plafond, elle sort trois fois sur quatre — voir « Mesures relevées ». La
qualité monte d'un cran tous les quatre niveaux d'équipe, plus **4 crans sur une
vague de boss**, qui garantit en outre une rare dans les trois offertes.

**La légendaire, elle, ne dérive plus du tout** (`×1,0`, poids de base 1). Elle
est **garantie aux vagues 10 et 20** — `CARD_CFG.LEGENDARY_WAVES` — et
**plafonnée à deux par manche et par joueur** (`LEGENDARY_MAX`). La calibration
précédente avait été faite à un seul effectif et laissait passer jusqu'à **trois
légendaires** chez un joueur chanceux : assez fréquente pour ne plus surprendre,
pas assez pour structurer une build, c'est-à-dire le pire des deux mondes. Le
hasard du roguelike reste entier — c'est *laquelle* qui tombe qui compte, pas
*si*. Et atteindre la vague 10 devient un objectif en soi.

Le jalon se déclenche au premier écran ouvert **à partir de** la vague 10, et
non pendant cette vague exactement : une vague où personne ne monte de niveau
n'ouvre aucun écran, et la garantie sautait alors une fois sur deux.

Les 116 cartes vivent dans `shared/cards.js`, avec leurs valeurs. Les communes
sont des gains de nombres ; les rares modifient une mécanique ; les épiques
définissent une orientation de build ; trois des légendaires **remplacent
l'arme** et s'excluent entre elles.

#### Le déséquilibre du catalogue, et les six axes ajoutés

Le catalogue comptait **13 communes pour 27 rares**, alors que les communes
sortent **six fois plus souvent**. Sur une partie à quinze ou vingt tirages, le
joueur revoyait les mêmes treize en boucle, dont plusieurs plafonnées donc
retirées du pool en cours de route. Douze communes ont été ajoutées — huit qui
ouvrent un axe nouveau, quatre qui comblent un système sans entrée commune
(bouclier, brûlure, réduction de dégâts subis, recharge d'esquive). Réparition
actuelle : **25 / 35 / 32 / 14**.

Six axes classiques du genre manquaient entièrement — aucun coup critique,
aucun multiplicateur global de rayon, aucune réduction de recharge générique,
aucun seuil d'exécution, aucune conversion d'une statistique en une autre,
aucun bonus indexé sur la situation :

| axe | cartes | ce qu'il apporte |
|---|---|---|
| **critique** | Précision, Mire, Talon faible, Œil de faucon, Sentence capitale | il est **multiplicatif**, donc il rend meilleures toutes les cartes de dégâts déjà présentes au lieu de les concurrencer |
| **rayon** | Expansion, Déflagration, Singularité | une seule clé `areaMul`, et une quinzaine de cartes existantes deviennent meilleures |
| **recharge** | Condensateur, Surtension, Flux continu | Flux continu retire 0,1 s par kill : les compétences suivent enfin le rythme de la vague |
| **exécution** | Achèvement, Moisson | répond à la sensation d'ennemis-éponges de fin de manche, et se marie avec les dégâts de zone qui laissent des survivants à bas PV |
| **conversion** | Blindage offensif, Fureur défensive, Pacte de fer | empiler du PV devient une stratégie **offensive** assumée — une carte défensive ne donne plus l'impression d'un tour perdu |
| **momentum** | Élan, Meute, Carnage, Adrénaline, Dernier souffle | Meute récompense de rester **au contact**, alors que tout le reste du jeu pousse à reculer |

Le critique existe pour **tout le monde**, sans carte : 5 % de chance, ×2. Sans
cette base, la première carte de chance critique ne se compare à rien et le
joueur n'a aucun repère pour juger « +6 % ». La chance est plafonnée à **60 %** :
au-delà, ce n'est plus une pointe mais un multiplicateur permanent qu'on aurait
aussi bien pu écrire dans `damageMul`. Le tirage se fait dans `_damage()`, au
point de passage unique — une nova critique donc autant qu'une balle — et jamais
sur un dégât continu, qui critiquerait à tous les coups en moyenne à soixante
tirages par seconde.

Deux écarts assumés avec la spécification du lot :

- **Pacte de fer** donne +4 % de dégâts par tranche de **5 points** de bouclier
  et non par point. Par point, trois « Bouclier régénérant » (90 points)
  auraient donné **+360 %**, soit quatre fois la meilleure légendaire du jeu ;
  par tranche de cinq, un bouclier complet vaut +72 %, le prix étant qu'il ne
  revient jamais de la manche.
- **Les conversions** ont besoin d'une échelle : `x % de tes PV` doit se
  traduire en multiplicateur de dégâts. La référence de dégâts est posée à
  200 PV et non à 100, sans quoi « Fureur défensive » rendait 24 PV sur un
  chargement à ×2,4 — moins que Peau de titane, qui est épique elle aussi.

Les deux conversions se calculent sur les valeurs **de base**, relevées avant
toute conversion : sinon « Blindage offensif » lit des PV déjà gonflés par
« Fureur défensive », qui lit des dégâts déjà gonflés par le premier, et le
chargement dérive un peu plus à chaque carte prise.

#### Ce qu'une carte dit d'elle-même

Une carte affichait son nom, sa rareté et son effet. Rien ne disait **à quelle
catégorie elle appartient** ni **ce qu'on a déjà pris dans cette catégorie** —
donc chaque tirage se lisait isolément, et la build se construisait par accident.
Un joueur qui a pris six cartes offensives et zéro défensive ne s'en aperçoit
qu'au tableau de fin, c'est-à-dire trop tard.

```
DÉFLAGRATION                              rare
zone · 3ᵉ carte de zone
+20 % de rayon sur tous tes effets
possédée 0 / 2  ·  rayon +8 % → +28 %
```

Cinq **catégories** couvrent le catalogue entier — offensif, défensif, soutien,
zone, utilitaire — et reprennent la grammaire fonctionnelle du jeu (rouge, cyan,
vert, violet, neutre) au lieu d'inventer cinq teintes de plus. L'écran de cartes
est **hors combat**, et c'est ce qui autorise le rouge ici : la règle « jamais de
rouge pour quelque chose où il faut aller » porte sur l'arène, où une erreur de
code couleur coûte une mort ; sur un panneau de choix, le rouge ne désigne pas un
endroit, il nomme la seule famille d'effet que la grammaire appelle « dégâts ».

**Ne pas confondre catégorie et famille.** Une famille est un axe décliné sur
quatre paliers de rareté et ne concerne que vingt cartes : c'est une règle de
*tirage*. Une catégorie couvre les 116 cartes et ne sert qu'à l'*affichage*. Elle
est **déduite des tags** existants plutôt qu'écrite cent sept fois — les tags sont
déjà tenus à jour puisque « Résonance » compte `cadence` et « Symbiose » compte
`def` — avec un champ explicite pour les seules cartes de zone, que les tags ne
savent pas nommer. La priorité n'est pas arbitraire : une carte coopérative est
d'abord du soutien même si elle protège, et une carte qui touche aux dégâts est
offensive même si elle donne aussi des PV. On nomme la carte par ce qui la rend
remarquable.

Répartition mesurée du catalogue : **offensif 61 · défensif 25 · soutien 11 ·
zone 7 · utilitaire 3**. Le déséquilibre est réel et c'est le catalogue qui le
porte, pas la déduction — le rang reste informatif dans les deux sens
(« 7ᵉ carte offensive » dit qu'on est tout-en dégâts).

#### Les familles

Cinq familles — **dégâts, cadence, survie, mobilité, soutien** — déclinées sur
les quatre paliers de rareté, soit vingt cartes qui couvrent tout le spectre :

| famille | commune | rare | épique | légendaire |
|---|---|---|---|---|
| dégâts | Affûtage +12 % | Calibre supérieur +25 % | Canon surdimensionné +45 % | Cœur de forge +80 %, +5 % par vague |
| cadence | Culasse allégée −7 % | Cadence accélérée −16 % | Rotative −28 % | Chaîne d'assaut −40 %, surchauffe levée |
| survie | Plaquage +18 PV | Cuir épais −10 % subis | Peau de titane +40 PV | Constitution +80 PV, 2 PV/s |
| mobilité | Foulée +7 % | Semelles légères +14 % | Célérité +22 %, −20 % de recharge d'esquive | Vif-argent : traînée d'esquive |
| soutien | Trousse +25 % | Réanimateur ×1,6 | Ange gardien | Vœu partagé |

Trois règles de tirage, et elles ne sont pas décoratives :

- **Jamais deux paliers de la même famille dans le même tirage** — le palier
  supérieur écrase toujours l'autre, le choix serait faux.
- **Un palier supérieur possédé retire les paliers inférieurs du pool** :
  proposer Affûtage à qui a Cœur de forge, c'est proposer une carte que le joueur
  sait déjà dépassée.
- **Les paliers se cumulent** s'ils sont obtenus dans l'ordre croissant. C'est
  une progression, pas un remplacement.

Elles résolvent trois problèmes d'un coup : le pool commun se vidait en milieu
de manche (quinze à vingt tirages), les raretés hautes n'avaient aucun
équivalent « simple » qu'on puisse évaluer en trente secondes, et rien ne disait
au joueur qu'il existait une version supérieure de ce qu'il venait de prendre —
l'écran de choix affiche désormais « dégâts — palier 3 / 4 ».

Trois de ces légendaires demandent une mécanique que le reste du pool n'avait
pas :

- **Cœur de forge** est le seul mod indexé sur le **temps** et non sur le
  chargement. `computeMods()` doit rester une fonction de la seule liste de
  cartes possédées, donc la part de vague est ajoutée par `_recomputeMods()`,
  rejoué à chaque début de vague.
- **Chaîne d'assaut** lève le plancher de cadence (`FIRE_INTERVAL_FLOOR`) mais
  pas le plancher **dur** (`FIRE_INTERVAL_HARD_FLOOR`) : sans plancher du tout,
  l'intervalle tend vers zéro, c'est-à-dire une balle par image.
- **Vœu partagé** est la seule carte du jeu qui modifie les mods des **autres**.
  La fusion se fait dans `_recomputeMods()`, jamais dans `computeMods()` qui ne
  connaît qu'un chargement à la fois, et prend le **maximum** et non la somme
  des exemplaires — sinon le plafond des cartes partagées ne veut plus rien
  dire. Le Vœu ne se partage pas lui-même : il se serait propagé de proche en
  proche à toute la table.

Quatre cartes sont **conditionnelles** : elles ne valent rien seules et beaucoup
combinées — Symbiose (+5 % de dégâts par carte défensive), Austérité (+30 %
tant qu'aucune épique n'est prise, donc elle se désamorce elle-même), Résonance
(+4 % par carte de cadence) et Dette. C'est ce qui manquait au pool : quinze
cartes purement additives ne se combinent pas, elles s'additionnent, et le
tirage cesse d'être une décision dès qu'on sait laquelle a le plus gros nombre.

**Dette** est la seule carte dont le coût se paie sur la jauge **commune** :
celui qui la prend ralentit les niveaux de toute la table. C'est assumé — c'est
le seul endroit du jeu où un choix individuel engage le groupe, et il se voit
puisque la jauge est affichée à tout le monde. Le surcoût retenu est celui du
joueur le plus endetté, jamais le cumul : à quatre joueurs, deux Dette auraient
multiplié le coût par 1,44 et bloqué une progression que trois joueurs sur
quatre n'avaient pas choisie.

Une carte de secours, **Ravitaillement**, ne sort jamais du tirage normal : elle
comble une offre que le pool ne peut plus remplir. Avec quinze à vingt tirages,
un joueur qui a plafonné ses préférées et pris une arme légendaire (qui en
bloque deux autres) se voyait offrir un écran à une case.

**Le cumul est additif** (`base × (1 + Σ)`), sauf les réductions — intervalle de
tir, dégâts subis — qui sont multiplicatives et plafonnées. C'est le seul moyen
de garder le boss équilibrable : quatre cartes à −25 % additives donneraient
zéro.

Le calcul se fait en **deux passes**. Les cartes conditionnelles dépendent du
reste du chargement : les évaluer dans la même boucle rendait leur valeur
dépendante de l'ordre d'insertion dans la table, c'est-à-dire de l'ordre dans
lequel le joueur avait pris ses cartes — deux joueurs avec exactement les mêmes
cartes n'avaient pas les mêmes dégâts. La seconde passe lit un contexte figé.

Deux détails d'implémentation qui portent tout le reste :

- **Un objet `p.mods` recalculé à chaque prise de carte.** Les systèmes lisent
  `p.mods`, jamais la liste de cartes. Sans ça, les modificateurs se seraient
  éparpillés dans toute la simulation et plus rien n'aurait été débogable.
- **Tout ce qui blesse un ennemi passe par `_damage()`**, comme tout ce qui
  blesse un joueur passe par `_hurt()`. Vol de vie, brûlure et comptage des
  dégâts y sont branchés une seule fois : une nouvelle source de dégâts en
  hérite sans qu'on y pense.

Le serveur **valide** que la carte reçue fait bien partie des trois offertes à ce
joueur pour ce boss. Sans cette vérification, n'importe quel client s'octroie une
légendaire en envoyant son identifiant.

Quelques pièges rencontrés, qui expliquent des choix qui semblent arbitraires :

- **L'écho ne rejoue que la salve**, pas la salve arrière ni les canons
  supplémentaires deux fois chacun — sinon ses 20 % annoncés valaient bien
  davantage.
- **La brûlure ne se cumule pas** sur la même cible : à quatre balles par
  seconde, on empilait quatre brûlures et l'incendiaire devenait la seule carte
  offensive qui comptait.
- **L'onde de mort ne se rappelle pas elle-même.** Dans une nuée dense, elle
  partait en réaction en chaîne sur toute l'arène, avec une pile d'appels de
  deux cents niveaux et une manche gagnée par une seule balle.
- **Les balles perforantes retiennent toutes leurs victimes**, pas seulement la
  dernière : en restant superposées à la première, elles la touchaient une
  seconde fois à l'image suivante.
- **Deux auras de givre ne se cumulent pas** : à 0,65 chacune, trois joueurs
  givrés immobilisaient l'arène entière.
- **Le vol de vie se paie sur un budget par seconde** plutôt que par un plafond
  par coup — c'est le seul réglage qui tienne quand la cadence, le nombre de
  canons et les dégâts varient d'un joueur à l'autre.
- **Le « Réanimateur » donne aussi +10 PV max.** Personne ne prend une carte
  purement altruiste au premier boss quand tout va bien ; sans ce petit bonus
  personnel, elle ne sort plus jamais du tirage utile.

Les cartes ne circulent **jamais dans le snapshot à 20 Hz** : elles ne changent
qu'entre deux combats de boss, une diffusion par changement suffit.

### Consulter une build

Le bilan de fin de manche affichait les cartes de chacun en pastilles, mais
elles n'étaient pas lisibles — impossible d'analyser ce qu'avaient pris les
autres, alors que c'est exactement le moment où l'on veut comprendre pourquoi
quelqu'un a fait trois fois plus de dégâts.

**Une seule fenêtre, trois entrées** : **Tab** en jeu, un clic sur une ligne du
bilan, un clic sur une ligne du salon. Les **flèches** passent d'un joueur à
l'autre sans refermer — refermer et rouvrir pour comparer deux chargements,
c'est perdre le point de comparaison, or comparer est tout ce que cet écran sert
à faire.

Elle montre cinq choses : la **classe** et ses deux compétences, les
**statistiques** (score, kills, morts, dégâts, PV max), les **multiplicateurs
effectifs**, et toutes les **cartes** groupées par rareté décroissante avec leur
cumul et leur description complète — celle du tirage, donc en mètres et avec les
valeurs effectives.

**La ligne des multiplicateurs est la plus intéressante des cinq.** « ×2,4
dégâts, ×1,8 cadence » explique le tableau des scores bien mieux que la liste de
cartes, qu'il faut lire ligne à ligne pour reconstituer la même chose de tête.
Ils sont calculés par **la même fonction que la simulation** — Vœu partagé
compris, part de vague du Cœur de forge comprise, repli de classe compris :
recoder ce calcul côté client aurait donné deux résultats différents sur
précisément l'écran dont le seul but est de vérifier un chargement.

La **cadence s'affiche inversée** (`×1,8` et non l'intervalle) parce que la
simulation raisonne en intervalle de tir : sinon ce serait la seule ligne de
l'écran où « plus grand » voudrait dire « pire ».

#### La jauge de puissance

**Un multiplicateur nu ne se lit pas.** « ×1,49 dégâts » sonne bien et vaut en
réalité une build faible ; rien à l'écran ne permettait de le savoir. Le défaut
a été rapporté sous la forme « je fais moins de dégâts que ce qui est affiché,
les pourcentages fonctionnent ? » — les pourcentages étaient justes, c'est
l'**échelle** qui manquait. Un chiffre sans point de comparaison n'informe
personne.

La fenêtre affiche donc l'**indice de puissance** (`powerIndex`), situé sur une
jauge portant quatre repères **mesurés** — nu 1,26, médiane 2,36, forte 4,10,
max 5,71 — et un qualificatif (« sous la médiane », « forte »…). C'est le seul
chiffre du jeu qui explique à la fois les PV du boss et la pression des vagues,
et il était jusqu'ici entièrement invisible.

`powerIndex` est **exporté en fonction pure** par `game_state.js`, pour la même
raison que `fullMods` et `effectiveCards` : recoder la formule côté client aurait
donné deux implémentations qui divergent au premier réglage, sur précisément
l'écran dont le seul but est d'expliquer un chargement.

La jauge porte aussi le **genou** (`BOSS_POWER_KNEE`), et c'est le point : sous
le genou, une carte de dégâts est intégralement absorbée par les PV du boss ;
au-dessus, elle commence à payer. Une note le dit en toutes lettres — « le boss
ne suit plus que 77 % de ta puissance ». C'était jusqu'ici la seule règle du jeu
que le joueur subissait sans jamais pouvoir la voir.

Les repères sont des **mesures**, pas des constantes de réglage : les remesurer
avec le script de distribution si le catalogue ou les raretés bougent.

### Le bilan de fin de manche

Il portait quatre chiffres d'équipe (survie, kills, joueurs, manche) et le
tableau des scores. Deux manques :

- **« joueurs » n'apprenait rien** — le tableau en donne la liste nominative deux
  lignes plus bas. Remplacé par les **dégâts**, les **dégâts par seconde** et les
  **dégâts subis** de l'équipe. Les dégâts bruts ne se comparent pas d'une manche
  à l'autre sans être rapportés au temps : une manche de 4 min à 80 000 et une de
  12 min à 190 000 se lisent enfin. Tout est **déduit côté client** — la somme des
  lignes divisée par la durée — donc rien de neuf sur le réseau.
- **Ta build demandait un clic**, sur ta ligne du tableau, et personne ne
  cliquait. Un bloc « ta partie » l'affiche directement : classe, dégâts, DPS,
  part des dégâts de l'équipe, kills, dégâts subis, nombre de cartes, les
  multiplicateurs et la jauge de puissance. La liste des cartes reste derrière un
  bouton — elle demande la place d'un écran entier.

La part des dégâts de l'équipe est **coupée en solo** : elle y vaut toujours
100 %, et écrire une évidence coûte une tuile de lecture. Le bloc entier ne
s'affiche pas pour un spectateur, qui n'a pas de ligne dans le tableau.

Un seul chiffre a demandé un ajout au protocole : les **dégâts cumulés** par
joueur. Les projectiles ne portent pas leur propriétaire — un identifiant de
plus sur chacune des quatre cents balles en vol, vingt fois par seconde — donc
le client ne peut pas le déduire. Quatre nombres par instantané, à comparer aux
seize cents de la liste d'ennemis.

### Menu pause

La contrainte est structurelle : le serveur est autoritaire et simule en
continu. **Une pause n'a de sens que s'il n'y a qu'un seul joueur**, sinon un
joueur figerait la partie des autres.

- **En solo**, `Échap` met réellement la simulation en pause. Le serveur cesse
  d'appeler `step()` mais continue de diffuser des instantanés, pour que
  l'affichage reste vivant.
- **À plusieurs**, `Échap` ouvre le même panneau et **la partie continue**. Le
  panneau est translucide, le jeu reste visible derrière, et un libellé ambre
  dit pourquoi : « la partie continue — pause indisponible à plusieurs ».

Le panneau donne : reprendre, le volume et la coupure du son, la fenêtre de
build, et quitter la manche avec confirmation — qui rend spectateur jusqu'à la
manche suivante, exactement comme quelqu'un qui arrive en cours de partie.

Pour un **spectateur**, le même bouton dit « quitter la salle » et renvoie au
hub : pendant une manche le salon est caché, donc le menu pause est sa seule
porte de sortie. Sans ce cas, quelqu'un arrivé en cours de partie y restait
enfermé jusqu'à la fin de la manche — et recharger la page ne l'en sortait pas
non plus, puisque le client reprenait sa salle tout seul. La reprise est
désormais un **geste** : le hub propose « tu étais dans *nom* — reprendre »,
il ne téléporte plus. Quitter volontairement efface la proposition côté
serveur (`lastRoomOf`), sinon la salle qu'on vient de fuir revenait à chaque
reconnexion.

Trois points de vigilance, tous réglés côté serveur :

- **Le serveur valide.** Une demande de pause reçue alors qu'un second client
  est connecté est ignorée. Ne jamais se fier au client là-dessus : c'est le
  type de message qu'un onglet modifié enverrait pour figer une partie à quatre.
  On compte les **connectés** et non les vivants — un spectateur a le droit de
  ne pas voir l'image se figer.
- **La pause se lève toute seule** au bout de 5 minutes, ou dès qu'un second
  joueur se connecte. Sans ça, un solo en pause laisse le serveur bloqué
  indéfiniment et personne ne peut le rejoindre : c'est le même piège que la
  manche qui ne se terminait jamais quand tout le monde quittait.
- **Les recharges et les états ne s'écoulent pas.** Ils vivent dans `p.timers`
  et `p.statuses`, qui ne descendent que dans `step()` — il suffit donc de ne
  pas l'appeler, mais une pause qui rendrait les compétences gratuites serait
  une faille et non un confort.

Ouvrir le menu **arrête le personnage** : en solo la prédiction locale dérivait
derrière le voile pour se faire recaler sèchement à la reprise, et à plusieurs
un personnage qui court pendant qu'on règle le volume est pire encore.

### Rendu des monstres

Chaque forme est dessinée **une seule fois** dans un atlas hors écran au
démarrage, puis simplement collée, pivotée et mise à l'échelle à chaque image.
Redessiner 220 silhouettes trait par trait à 60 images par seconde coûterait
bien trop cher. Les sprites regardent vers la droite ; le serveur transmet
l'angle de chaque ennemi et la rotation fait le reste.

Tout est dans `public/sprites.js` — coordonnées locales, origine au centre, nez
vers la droite. La règle de budget de l'atlas : **ne pas stocker en image ce
qu'une transformation peut faire**. Respiration, écrasement, orientation, recul
au tir et rang d'élite sont des `scale` et des `rotate`, donc gratuits ; on ne
paie que les changements de **forme**. 50 images, 448 × 512 à densité 1 (1,8 Mo),
896 × 1024 à densité 2 (7,0 Mo).

Les trois dernières cases sont les **particules**, et c'est la même règle de
budget qui a fixé leur nombre. Chacune dit une matière : `fx_white` étiré est
une **étincelle** (ce qui file), `fx_shard` un **éclat** anguleux qui tourne (de
la matière arrachée), `fx_glow` un **halo** dégradé (de la lumière, ou de la
fumée — qui n'a pas d'arête). Avant, tout partait du même carré blanc : la mort
d'un monstre était un tas de pixels identiques à la gerbe d'un impact, et
l'éclair de mort, un carré blanc de 13 px en additif, se lisait exactement comme
un carré.

La liste s'arrête à trois, et pas à quatre ou cinq, parce que la règle tranche
seule : une étincelle allongée est le carré blanc avec `scaleX` différent de
`scaleY` et un `angle`, donc une **transformation** — la cuire aurait payé une
image pour un `scale`. Et la fumée réutilise le halo en le faisant gonfler
plutôt que d'ouvrir une case de plus : deux effets qui partagent une forme se
distinguent par leur **comportement**.

`?planche` dans l'adresse sort tous les sprites en **noir uni sur fond blanc**.
Ce n'est pas un gadget : c'est le critère d'acceptation des silhouettes. Un
lecteur qui ne connaît pas le jeu doit pouvoir les regrouper par type sans
hésiter ; un type qui n'est reconnaissable qu'à sa couleur a raté son test. Deux
silhouettes ont déjà échoué à cette planche et ont été refaites. La planche
inclut désormais une bande de **boss**, qui ne sont pas dans l'atlas.

**Il faut la regarder en résolution native.** Trois créatures étaient percées
d'un trou transparent depuis toujours — mandibules du grunt, épaules du tank,
braces du Rempart — et la planche le montrait : un pixel blanc au milieu d'une
forme noire. Mais à 64 px par case, la fente fait deux pixels et on la prend pour
du bruit de rendu. Regardée à trois fois cette taille, elle saute aux yeux.

La cause est un piège de la même famille que celui des sous-tracés, et il est
pire parce qu'il ne se voit pas à la lecture du code : écrire un appendice
**miroir** avec `y * s` inverse son **sens de parcours** quand `s = -1`, et le
remplissage par règle non nulle annule alors la zone commune avec le corps. Le
contour tracé par-dessus fait ensuite lire le trou comme une fente volontaire.

La correction ne devine pas quel côté est fautif : elle mesure l'**aire signée**
du polygone et retourne l'ordre des sommets si le signe n'est pas le bon.
Inverser « le côté `s = -1` » a été essayé et perçait les **deux** côtés — c'est
`s = +1` qui était à l'envers sur le tank, corps +845,7 contre épaule −253,5,
indice de tour nul au point (0,10).

**Le Rempart a été refait au lot 6**, pour trois défauts qui se cumulaient et se
voyaient tous sur cette planche : il n'était pas plus imposant que les autres
(hexagone 14 × 12,5 contre 13 de rayon pour le soigneur) alors que la masse est
son identité entière ; ses deux plaques partaient de l'**arrière** et pointaient
vers l'avant, ce qui lisait comme un crabe plutôt que comme un bouclier ; et son
canon était aussi long que celui du tireur, alors que sa fiche de classe annonce
« canon court et large ». Corps porté à 17 × 15, plaques déplacées à l'avant en
**arc de bouclier frontal**, canon court et épais (±6 contre ±2 pour le tireur),
contour à 3,5 px et ombre portée plus marquée que les deux autres classes — le
poids du trait et l'ancrage au sol font autant pour la masse que les dimensions.
Critère : il doit être identifiable **à sa masse seule**, sans détail interne.

**Le Soigneur a été refait ensuite, pour exactement le même motif.** C'était un
polygone à quatorze côtés de rayon 13 — un **cercle**. Aucun appendice, aucune
pointe, donc aucune orientation lisible en silhouette, et il était la seule des
trois classes dans ce cas : le Rempart a son arc de bouclier, le DPS son dard.
Or la charte disait alors « la forme dit la classe, la couleur dit le joueur » ;
un soigneur qui ne tient que par sa teinte fait porter la classe par la couleur,
alors que les quatre couleurs étaient déjà prises par l'identité des joueurs. Sur
la planche en noir uni, ses quatre cases étaient des ronds pleins qu'on ne
pouvait ni orienter ni distinguer l'un de l'autre. (La règle a depuis été
renversée — voir plus bas — mais la silhouette reste, et elle porte désormais la
même information que la couleur au lieu de la remplacer.)

Trois ajouts, et **pas un canon** — il soigne, il ne perce pas : un corps en
**œuf** pointé vers l'avant, qui garde la masse ronde le séparant de l'hexagone
et du dard mais lui donne un avant et un arrière ; une **antenne dorsale** d'un
seul côté, l'asymétrie structurelle que les cinq monstres ont tous et qu'aucune
classe n'avait ; et une **embouchure courte et large** là où part déjà le
faisceau du mode soin. Courte face aux deux autres — 21 contre 23 pour le Rempart
et 24 pour le DPS — et large par rapport à sa longueur : ça se lit comme une
buse, pas comme une arme.

### L'éclairage suit la taille de la forme

La recette avait deux grandeurs **fixes** : un décalage d'ombre de 2 px et un arc
de lumière de rayon 12,6, identiques pour les huit silhouettes. Un runner fait
21 px d'épaisseur, un Rempart 33 : sur le petit, l'arc débordait et disparaissait
presque entièrement à l'écrêtage ; sur le gros, l'ombre de 2 px était un cheveu.
La lumière était posée **à côté** de la forme au lieu de la suivre.

Les deux grandeurs, plus l'épaisseur du trait, sont maintenant indexées sur
l'étendue réelle du tracé — **mesurée**, pas déclarée à côté de chaque type, où
elle aurait menti dès le premier réglage. On retient la **plus petite** des deux
dimensions et non la plus grande : c'est l'épaisseur qui dit combien de place il
y a pour modeler. L'arc est centré sur la forme réelle et non sur l'origine,
sinon un tireur dont le corps est décalé vers l'arrière reçoit sa lumière sur son
canon.

**Une septième couche est apparue : le contre-jour.** C'est le liseré clair du
côté opposé à la lumière principale, et c'est ce qui détache une créature d'un
fond sombre — or l'arène l'est. Sans lui, une silhouette sombre sur un sol sombre
ne tient que par son contour, c'est-à-dire par la seule chose qui ne dit rien de
sa forme. Il est obtenu en décalant le tracé du côté opposé à l'ombre et en
l'écrêtant à la silhouette d'origine : là où le contour déplacé tombe à
l'intérieur, le liseré se voit ; de l'autre côté il sort de l'écrêtage et
disparaît. Un seul décalage suffit donc à épouser la forme, appendices compris,
sans avoir à décrire où est son bord.

Sa couleur reste dérivée de la **teinte du type** et non d'une couleur d'ambiance
commune : un liseré identique sur les cinq les aurait rapprochés à moyenne
distance, ce que toute la charte refuse. Très clair mais désaturé — un
contre-jour est une valeur, pas une couleur.

### Les cinq types ne mouraient pas différemment

Le seul branchement de la mort était le rang d'élite : même compte de fragments,
même taille, même vitesse pour les cinq. Un tank de 42 px de large se
désagrégeait donc en la même poussière qu'un runner de 21 — ce qui gaspille la
seule information gratuite qu'on ait, puisque le joueur **sait** déjà ce qu'il
vient de tuer et que la mort doit le lui confirmer.

| type | sa mort | pourquoi |
|---|---|---|
| **grunt** | la référence dont les quatre autres s'écartent | — |
| **runner** | peu d'éclats, petits, rapides, dans un **cône serré autour de sa course** | la vitesse était son identité entière, elle doit lui survivre d'une demi-seconde |
| **tank** | gros morceaux, lents, peu nombreux, et ils **traînent** | une masse ne se pulvérise pas, elle se casse — la durée plus longue fait qu'on voit les morceaux se poser |
| **tireur** | débris mous, sans élan propre | il flottait |
| **brood** | beaucoup, minuscules, vifs | ce qui sortait d'elle était le danger : sa mort se lit comme une dispersion, pas comme l'éclatement d'un corps |

Le rang d'élite reste **orthogonal** au type : il multiplie le compte et la
taille, il ne choisit pas une autre façon de mourir. Un tank élite doit mourir
comme un tank, en plus gros — sinon le rang effacerait le type au moment précis
où l'on veut lire les deux. Et un gros morceau tourne **lentement**, sans quoi un
fragment de tank tourbillonne comme une escarbille.

Rien de tout ça ne coûte un octet : le type est déjà dans l'instantané, et
l'orientation aussi — elle y était pour dessiner l'ennemi, elle sert maintenant
aussi à le faire éclater dans le bon sens.

### Le rendu des entités passe par WebGL

Les entités — monstres, joueurs, dépouilles, particules — sont dessinées par un
**batcher WebGL2 écrit à la main**, 400 lignes dans `public/gl.js`, sans
bibliothèque. Le reste du monde (sol, zones, télégraphes, boss, barres, noms)
reste en canvas 2D, sur deux couches qui encadrent la couche WebGL.

**Ce n'est pas une question de fluidité.** À ~800 sprites par image, le canvas
2D accéléré tient largement. Ce que la bascule apporte, ce sont des capacités
que le 2D ne sait pas produire : teinte par sprite gratuite, mélange additif,
et un plafond de particules qui passe de **300 à 3 000**.

Pourquoi pas PixiJS : c'est un moteur à **graphe de scène**, en mode retenu — on
crée des objets persistants qu'on modifie. Le jeu est en **mode immédiat** : il
redessine tout à chaque image depuis un instantané interpolé, sans état de rendu
persistant. Les marier voudrait dire maintenir un objet d'affichage par entité,
gérer sa création et sa destruction au rythme des identifiants du serveur, et
synchroniser deux sources de vérité — plus de travail que le batcher lui-même,
et toute une classe de bugs (objets fantômes, fuites) qui n'existe pas
aujourd'hui.

**La migration n'a pas touché un seul appelant.** `drawSprite()` était depuis le
début le point de passage unique du dessin d'entité ; on a réécrit ce qu'il y a
derrière. C'est très exactement ce pour quoi cette indirection existait.

**Le chemin canvas 2D reste vivant**, et ce n'est pas de la prudence gratuite :

- c'est le **repli automatique** en cas de perte de contexte WebGL — bascule de
  GPU sur un portable, mise en veille, redémarrage de pilote. Non géré, c'est un
  écran noir définitif et le joueur doit recharger la page ;
- c'est le mode dégradé quand WebGL2 manque ;
- c'est la **référence de comparaison** : `localStorage.setItem("survivor.renderer",
  "canvas2d")` dans la console y bascule, sans rien redémarrer.

**Ce que la bascule débloquait et qui ne servait pas encore** a été mis à
profit au lot 6 : les fragments de mort doublent en nombre quand WebGL est actif
(22 pour une élite contre 10 en 2D — un fragment y est un quad du même lot que
les entités, alors qu'en 2D c'est un `fillRect`), chaque mort pose un **éclat**
blanc additif qui sature le centre pendant deux images, une élite laisse une
**onde annulaire** additive, et les projectiles portent une lueur additive qui
fait lire dix balles groupées comme une gerbe lumineuse plutôt que comme dix
pastilles.

La lueur des projectiles est **uniforme et non proportionnelle aux dégâts**,
contrairement à ce que le plan proposait : un projectile ne transporte ni son
propriétaire ni ses dégâts, et un champ de plus sur les quatre cents balles en
vol, vingt fois par seconde, coûte plus que l'effet ne rapporte — c'est
exactement la raison pour laquelle `bd` existe côté boss.

Deux autres corrections de lisibilité au même lot : le télégraphe d'une zone
monte désormais en intensité de façon **non linéaire**, les 300 dernières
millisecondes valant à elles seules autant que tout le reste de l'annonce (on
lisait une jauge, on ressent maintenant une échéance) et jettent des étincelles
qui **montent** ; et une zone persistante porte une **texture qui défile** à
l'intérieur, seul moyen de distinguer « active » de « en cours d'annonce » à la
périphérie du regard, puisque les deux sont des aplats rouges et que seule la
première bouge.

Mesuré : **2 appels de dessin par image pour 3 220 quads** (220 ennemis plus
3 000 particules), atlas 1,5 Mo à densité 1 et 6,1 Mo à densité 2 — très en
dessous du plafond de 16 Mo qu'on s'était fixé.

Trois pièges connus, tous les trois évités et documentés dans le code :
l'**alpha prémultiplié** (sans lui, un liseré sombre sur chaque bord transparent
et un additif faux), la **gouttière de 2 px** autour de chaque case de l'atlas
(sans elle, le filtrage linéaire ramène des franges de l'image voisine — c'est
invisible en canvas 2D et systématique en WebGL), et le `preventDefault()` sur
`webglcontextlost` (sans lui, le contexte n'est jamais restauré).

### Son et retour d'impact

Le jeu a longtemps été muet et sans confirmation d'impact : c'est ce qui donnait
le plus l'impression d'un prototype, avant même le contenu.

**Tout le son est synthétisé, aucun fichier.** Chaque son est un oscillateur (ou
du bruit blanc) et une enveloppe, une dizaine de lignes dans `public/audio.js` —
cohérent avec le zéro dépendance et le zéro build du projet. Un tir est une
impulsion carrée de 25 ms, un impact du bruit filtré de 40 ms, une explosion un
souffle passe-bas de 300 ms, une rupture de barre un accord grave.

Deux garde-fous, tous les deux indispensables : **un même son ne se rejoue pas
avant 40 ms**, et **seize voix au maximum**, les plus anciennes coupées. À 200
ennemis et une cadence à 0,05 s il y a cinquante déclenchements dans la même
image ; sans ces deux règles, le contexte audio sature avant même d'être
désagréable.

Les volumes sont hiérarchisés — annonce 1,0 · boss 0,9 · niveau 0,8 · bonus 0,6 ·
mort 0,4 · impact 0,25 · tir 0,15. Sinon l'information qui décide du combat se
noie dans le tapis des impacts, ce qui est exactement l'inverse du but.

**Le son tombe sur l'image, jamais avant.** L'affichage a 110 ms de retard sur
le dernier snapshot : jouer un son à la réception le ferait arriver un dixième
de seconde trop tôt. Les événements se déduisent donc de deux snapshots
consécutifs mais ne sortent qu'au moment où l'horloge de rendu franchit le
second — mesuré à +6,7 ms, soit moins d'une image.

**Les transitions de manche tombent sur l'image, elles aussi.** C'était le même
piège, et il produisait un défaut qu'on remarquait à chaque vague : le serveur
envoie l'écran de cartes à l'instant où il constate l'arène vide, mais le client
dessine encore l'état d'il y a 110 ms — où deux ou trois ennemis vivent toujours.
**L'écran de choix s'ouvrait par-dessus des ennemis visibles**, de façon
irrégulière puisque ça ne se voit que si les derniers meurent groupés. Les
messages `round`, `roundAbort`, `roundEnd`, `cards` et `cardsWait` passent
désormais par une file unique, sur le modèle exact de celle des alertes : une
file plutôt qu'un minuteur par message, ce qui préserve leur ordre d'arrivée et
ne laisse rien à annuler quand la connexion tombe. Les messages **hors-monde** —
salon, choix de classe, tableau des scores, pause — s'appliquent toujours à la
réception : ils ne commentent aucune image.

Côté image : **éclair blanc de 60 ms** sur l'ennemi touché (le retour le moins
cher et le plus efficace — sans lui, tirer dans la foule ne confirme rien),
**recul du sprite** de cinq pixels, **fragments à la mort** (six à dix), et des
**chiffres de dégâts** agrégés sur 200 ms.

**Le flash est exact, et il ne l'a pas toujours été.** Il se déduisait de la
variation de PV entre deux images interpolées. Or les instantanés partent à
20 Hz : entre deux, il s'écoule 50 ms pendant lesquelles un joueur à cadence
élevée place **deux à quatre balles** sur la même cible. Le client ne voyait
qu'une seule variation de PV, donc affichait **un** flash pour trois touches.
Pire : un ennemi tué entre deux instantanés ne montre jamais de PV
intermédiaires — il disparaît, et **le coup fatal ne produisait aucun retour**,
alors que c'est le plus satisfaisant de tous.

Aucun réglage côté client ne corrigeait ça : la source manquait. Le serveur
transmet donc un **compteur de touches par ennemi**, un chiffre cyclique de 0 à
9 incrémenté dans `_damage()`. Le client en lit la **différence** entre deux
instantanés et sait exactement combien de balles sont tombées, y compris entre
deux images et y compris la dernière. Les flashes sont alors **étalés** sur
l'intervalle plutôt qu'empilés au même instant — sinon on retrouverait le flash
unique qu'on venait de corriger. Le coup fatal, lui, affiche les PV restants du
dernier instantané connu.

**Un coup critique s'affiche en ambre et un cran plus gros.** C'est la seule
raison qu'un joueur ait jamais eue de *regarder* ces chiffres : sans distinction
visible, un axe de build entier ne produit aucun retour à l'écran et personne ne
sait s'il fonctionne. La taille fait autant que la couleur — le chiffre doit se
distinguer au coin de l'œil, et un daltonien doit s'en sortir. Un instantané
agrège plusieurs touches : le chiffre dit donc « ce paquet contient un
critique », pas « ce coup en était un ». La part critique voyage en **fin** du
tuple `bd`, comme tout ce qu'on ajoute au protocole.

Un dégât **continu** — brûlure, couronne mortelle de la constriction —
n'incrémente pas le compteur : sans cette exception, un ennemi qui brûle
clignoterait soixante fois par seconde et le retour d'impact ne voudrait plus
rien dire.

Coût : un chiffre de plus par ennemi et par instantané, **+6,2 % de poids arène
pleine** (200 ennemis tous déjà touchés, c'est-à-dire le pire cas absolu). Une
première version sur un octet complet coûtait +11,8 %, au-dessus du budget de
10 % qu'on s'était fixé — d'où le passage à un seul chiffre, qui suffit
largement : dix touches en cinquante millisecondes sur la même cible, c'est deux
cents par seconde, une cadence qu'aucun chargement n'approche.

Les **chiffres de dégâts** ne s'affichent que sur le boss et uniquement les
siens : tout afficher à 200 ennemis rendrait l'écran inutilisable, et sur la
piétaille l'information n'a aucune valeur puisqu'on tue en un coup.

**Sur les Jumeaux, le chiffre sort sur celui qu'on a touché.** Ils partagent une
réserve de vie : le serveur redirige donc tous les dégâts sur le premier, et le
nombre s'affichait sur lui même quand on tirait sur le second — on voyait ses
propres dégâts apparaître à l'autre bout de l'arène. Le point d'impact est relevé
*avant* la redirection et voyage avec le cumul. C'est le piège de tout ce qu'on
branchera derrière cette redirection : la réserve de vie est commune, le retour
visuel ne l'est pas.

**Les chiffres qui concernent le joueur — dégâts subis, soins reçus — sont
agrégés comme les autres**, sur la même fenêtre de 200 ms. Ils y échappaient, et
la raison invoquée était « il n'y en a jamais qu'un à la fois par joueur ». C'est
faux depuis deux mécaniques :

- le **vol de vie** rend une fraction des dégâts à *chaque touche* : mesuré à un
  exemplaire, 0,29 à 0,58 PV par touche et six touches par seconde, soit un « +1 »
  vert environ trois fois par seconde. Un joueur en conclut logiquement que la
  carte se déclenche au *tir* — c'était un défaut de retour et non de simulation,
  vérifié comme tel : trente tirs qui touchent donnent trente soins, trente tirs
  qui ratent en donnent zéro ;
- un dégât **continu** (brûlure, mare) descend les PV à chaque tic, donc à chaque
  instantané : jusqu'à vingt nombres rouges par seconde pour un seul effet.

Mesuré sur cinq secondes de tir dans une horde : quinze nombres verts avant, neuf
après, portant des valeurs qu'on peut lire au lieu d'un clignotement.

Le **tressaillement d'écran** ne sort que sur les gros événements — détonation de
zone, onde de choc, rupture de barre, bombe — jamais sur un impact ordinaire.
Il secoue **le monde et pas l'interface** : la barre de vie, la barre de boss et
le bandeau d'alerte ne bougent pas d'un pixel, sans quoi la secousse rendrait
illisible exactement ce qu'il faut lire au moment où quelque chose explose.

### D'où viennent les dégâts qu'on prend

Quand on perdait 40 PV, **rien** n'indiquait si c'était un contact, un
projectile, une zone, une mécanique ou une brûlure. C'était la principale raison
pour laquelle on ne comprend pas ses morts : on voyait un chiffre rouge et une
barre qui tombe, jamais ce qui venait de la vider.

Tout ce qui blesse un joueur passait déjà par `_hurt()` — il suffisait de lui
faire porter une **provenance**. Cinq sources, un glyphe chacune, affiché à
gauche du chiffre rouge :

| source | ce que c'est |
|---|---|
| contact | la horde et le boss au corps à corps |
| projectile | les tirs ennemis |
| zone au sol | tout ce qui explose ou persiste par terre |
| mécanique | un échec de mécanique de groupe |
| brûlure | l'état, en dégât continu |

Cinq et non six : le plan en prévoyait une sixième, « souffle », pour la rupture
de barre de boss — le même lot vient justement de lui retirer ses dégâts, et plus
rien du jeu n'inflige de souffle à un joueur. Une entrée toujours nulle dans un
registre partagé est du poids mort ; elle s'ajoutera **en fin** le jour où une
mécanique en aura besoin.

Le bilan de fin de partie en donne la **répartition sur l'équipe**, en barres.
C'est accessoirement le meilleur outil d'équilibrage du dépôt : il distingue
enfin une mécanique punitive d'une horde mal calibrée. Mesuré sur six manches de
420 s à deux joueurs (vague 8,8 en moyenne) : **contact 78,2 % · mécanique 9,2 % ·
zone 8,3 % · projectile 3,0 % · brûlure 1,3 %**.

Coût réseau : **un nombre par joueur et par instantané**, soit quatre — la
provenance est le seul champ du tuple joueur qu'un client ne pourrait pas
recalculer, puisqu'une variation de PV ne dit jamais d'où elle vient.

### On ne confondait plus son tir avec celui d'en face

Le tir allié était `#f4d35e` et le tir ennemi `#ff9d4d` : **deux ambres
voisins**, c'est-à-dire le pire cas possible. À 220 ennemis l'écran devenait une
bouillie orange où on ne distinguait plus ce qu'on tire de ce qu'on reçoit.

Trois correctifs, et il fallait les trois — chacun seul est insuffisant :

- **Les balles prennent la couleur de leur tireur.** Les quatre couleurs de
  joueur existaient déjà, et ça répond du même coup à « qui a tiré ça », qui
  n'avait aucune réponse en coopératif. Depuis que la couleur dit la **classe**,
  elle répond en plus à « qui, dans l'équipe, tire ça ».
- **Les projectiles ennemis passent au rouge franc** (`#ff3b5c`) et deviennent
  des **losanges étirés** dans leur axe. Le rouge et non un autre ambre parce que
  le **Tireur est ambre**, et c'est la classe qui tire le plus ; la forme parce
  que la couleur se perd dans le chaos et qu'un daltonien doit s'en sortir.
- **Le tir de soin porte une croix** — troisième silhouette. Il ne se
  distinguait que par son vert, ce qui suffisait tant que le soigneur portait la
  teinte de son joueur. Le soigneur étant vert en permanence, ses deux tirs
  seraient devenus deux verts voisins : exactement le défaut du dessus, une
  seconde fois. Même réponse, et la croix est déjà le signe du soin partout
  ailleurs.
- **Un liseré clair permanent sur les joueurs**, et c'est le plus rentable des
  trois : rien ne distinguait un personnage d'un monstre en priorité
  d'affichage. Ce n'est pas un tracé — les entités passent par `drawSprite` — mais
  la silhouette blanche déjà cuite dans l'atlas, dessinée un cran plus grande
  sous le sprite. Un quad de plus, aucune image nouvelle, et le même résultat par
  les deux chemins de rendu.

L'ordre d'affichage devient : sol → zones → bonus → **ennemis → projectiles →
joueurs**. Les projectiles étaient sous la horde, donc une balle disparaissait
derrière le premier corps rencontré. Les **ondes de carte** (nova, pulsar) restent
volontairement *sous* les entités, contre la lettre de cette règle : une onde de
12 m de rayon dessinée par-dessus masquerait exactement les joueurs que le lot
vient de rendre identifiables. Une onde est un ornement de sol, un projectile est
une entité — la ligne de partage est là.

Coût réseau du propriétaire de balle : **+5,4 %** de poids d'instantané dans le
pire cas (arène pleine, 400 balles en vol, quatre joueurs) et **+2,0 %** en
moyenne sur une manche à quatre, **+0,9 %** en solo. Du même ordre que le
compteur de touches (+6,2 %) et sous le budget de 10 %. Le dépôt avait jusqu'ici
refusé de transmettre le propriétaire d'une balle, et la raison était bonne : il
ne servait qu'à attribuer des dégâts, ce que `bd` résout côté boss sans rien
payer par balle. Ce qui a changé, c'est l'usage — la lisibilité, qu'aucune
déduction locale ne peut retrouver.

### Grammaire de marqueurs

Ce qui fait fonctionner les marqueurs n'est pas leur beauté mais leur
**constance** : une couleur dit qui est concerné, une forme dit quoi faire, une
animation dit quand. En comprenant les marqueurs de façon générale, on applique
le même langage à un combat qu'on n'a jamais vu.

| couleur | signification |
|---|---|
| rouge / ambre | danger — sortir |
| cyan | il faut être dedans — tours, regroupement |
| blanc | ça concerne un allié — soin, relèvement, lien |
| violet | persistant — ça restera là après |

**Règle jamais transgressée : pas de rouge pour quelque chose où il faut aller.**
Une seule exception et plus personne ne fait confiance au code couleur, donc tout
se relit au cas par cas — précisément ce qu'on veut éviter avec 200 ennemis à
l'écran. Les mares persistantes gardent le rouge du danger et reçoivent un
**liséré violet** : le violet ajoute la durée, il ne remplace pas le danger.

Le bandeau d'alerte a trois niveaux : **consigne** en cyan avec un compte à
rebours (REGROUPEZ-VOUS, OCCUPEZ LES TOURS), **avertissement** en ambre, court,
**information** en blanc, discrète. Il **disparaît avant** que la mécanique se
résolve — un texte encore affiché au moment de l'impact masque exactement ce
qu'il faut regarder.

Les mécaniques qui désignent quelqu'un posent un **glyphe au-dessus de sa barre
de vie** : triangle pour « viens ici », deux anneaux reliés pour un lien à
rompre, carré barré pour une cage, croix pour une cible. **Distincts en
silhouette et pas seulement par la couleur** — un daltonien doit s'en sortir, et
de toute façon la couleur se noie dans le chaos.

### La couleur dit la classe

C'est le **renversement** de la règle d'origine, « la forme dit la classe, la
couleur dit le joueur ». Elle tenait tant que les quatre teintes servaient à
distinguer Paul de Marie. À l'usage, la question posée vingt fois par manche est
« où est le soigneur », pas « lequel de ces deux points est Paul ». Les deux
canaux disent donc la même chose et se renforcent, au lieu de se partager le
travail — la silhouette continue de dire la classe, elle aussi.

**Rempart bleu, Soigneur vert, Tireur ambre ou violet.** Deux teintes de tireur
parce que c'est la seule classe non unique.

Trois choses rendent la règle tenable, et aucune n'est décorative :

**Deux teintes de tireur ne suffisent pas toujours.** « Au plus un tank et un
soigneur » ne veut pas dire « exactement un » : une table de quatre où personne ne
prend ces deux rôles aligne **quatre tireurs**, et deux d'entre eux seraient
identiques. Les tireurs puisent donc dans leurs deux teintes, puis **empruntent**
les couleurs de classe unique restées libres. La règle du dessus n'en souffre
jamais : si un Rempart est là, le bleu est à lui, donc il n'est pas empruntable.

**L'attribution est triée par identifiant**, pas laissée à l'ordre d'itération.
Sans ça, un tireur change de teinte parce qu'un *autre* joueur a quitté le
salon — le genre de scintillement qu'on ne remarque qu'en partie.

**Elle ne tourne jamais en pleine manche.** Le calcul dépend de la salle entière :
une déconnexion recolorerait des joueurs vivants au milieu d'un combat, alors que
la couleur est précisément ce qui sert à se repérer. Le lancement de manche
attribue avant de basculer la phase ; un arrivant en cours de partie garde la
teinte reçue à l'entrée jusqu'au salon suivant.

Le recalcul se fait **à la diffusion du salon** plutôt qu'à chaque changement : le
salon est rediffusé à toute arrivée, tout départ et tout choix de classe, donc il
n'y a aucun point de mutation à ne pas oublier de brancher.

**Ce que ça a coûté : le mode soin a perdu son signal de couleur.** La bascule se
lisait au passage de la couleur de joueur au vert du soigneur. Le soigneur étant
maintenant vert en permanence, il ne restait qu'un vert pâle virant au vert
saturé — presque rien. Un **anneau pulsant** l'a remplacé, dans la même bande que
la provocation du Rempart et la surcharge du Tireur : trois compétences, trois
classes, elles ne coexistent jamais sur un même personnage. Le mouvement se lit à
travers la horde là où deux verts voisins ne se lisent plus.

### Un seul vert pour le soin

Il y en avait **quatre**, et c'est le genre d'incohérence qui s'installe sans que
personne la décide :

| ce qui soignait | couleur |
|---|---|
| chiffres de soin, marqueur réussi | `#34d399` |
| bonus de soin au sol | `#6fe3a0` |
| tir du soigneur, sanctuaire, vague de soin, balise | `#8ef0c8` |

Quatre verts qu'aucun joueur ne peut distinguer volontairement : la même
information dite de quatre façons, c'est-à-dire aucune. Et la balise valait
**exactement** la couleur de classe du soigneur — une balise posée au sol avait
donc la couleur d'un joueur, ce que la charte interdit partout ailleurs.

Règle : **tout ce qui rend des PV ou relève un allié porte le même vert.** Bonus
de soin, balise, tir du soigneur, vague de soin, sanctuaire, mode soin du
personnage, chiffres verts. Le relèvement en fait partie — il restaure un allié,
c'est la même promesse.

C'est une **exception assumée** à la règle qui met les couleurs d'identité
(classes, types de monstres, bonus au sol) hors de la grammaire fonctionnelle :
un bonus qui soigne est d'abord un soin, ensuite un objet. La couleur de classe
du soigneur reste l'identité du **joueur** et ne dit plus jamais « ceci
soigne » — c'est la confusion entre le *qui* et le *quoi* qui avait produit les
quatre verts.

Le sanctuaire a donc quitté la couleur de classe que partagent le rempart et
l'ancre. C'était la bonne règle pour ces deux-là, qui déplacent ou retiennent, et
la mauvaise pour lui, qui **soigne**.

### Le sanctuaire se reconnaît à ses croix qui montent

Un disque vert clair et un disque bleu clair posés au sol se distinguent mal en
pleine mêlée — le rempart est l'autre grand disque du jeu. Du **mouvement**, lui,
se lit par-dessus n'importe quel encombrement : c'est déjà le raisonnement des
signatures de zone, où une zone se reconnaît à son comportement avant sa couleur.

Sept croix montent lentement à l'intérieur du dôme, apparaissent en bas et
s'effacent en haut. La croix n'est pas un glyphe inventé pour l'occasion : c'est
celle du bonus de soin, déjà **le** signe du soin dans l'arène et dans le HUD.

Aucune allocation, aucune liste : la position de chaque croix est une fonction de
l'identifiant du sanctuaire, de son rang et du temps. Les particules du jeu
passent par une liste plafonnée qui coûte à gérer ; sept croix par dôme n'ont ni
à naître, ni à mourir, ni à être comptées.

Trois détails trahissent la boucle si on les oublie, et tous les trois ont été
vérifiés au calcul plutôt qu'à l'œil : la phase est décalée **par rang et par
identifiant** (en phase, les sept montent comme une seule barre, et deux
sanctuaires posés en même temps battent à l'unisson) ; la dérive latérale est
bornée par la **corde du cercle** à cette hauteur, sinon une croix sort du dôme ou
se pose sur le liseré qui porte l'information tactique ; et l'opacité s'ouvre et
se ferme en sinus, une croix qui surgit ou se coupe net au bord se lisant comme
un défaut de rendu. Mesuré sur 2 625 échantillons : **aucune croix hors du
disque**, aucune sur le liseré.

## Architecture

```
server.js              amorce : HTTP, WebSocket, page admin, câblage
hub.js                 registre des salles, comptes, progression — seul à écrire
room.js                une partie : GameState, clients, phases, tick
ws_lite.js             implémentation WebSocket minimale (RFC 6455 + permessage-deflate)
shared/game_state.js   LOGIQUE PURE — importée par le serveur ET le navigateur
public/index.html      page, hub, salon, tableau des scores
public/client.js       saisie, interpolation, prédiction, rendu
public/events.js       diffusion des snapshots en événements typés
public/audio.js        synthèse WebAudio — aucun fichier son
```

Un seul port sert les fichiers **et** les WebSocket : pas de second serveur, pas
de CORS, pas d'adresse à saisir côté client.

### Hub et salles

Plusieurs parties simultanées dans **un seul processus** : chaque salle tient
son propre `GameState` et ses clients, un intervalle unique à 120 Hz les fait
toutes avancer, avec un `try/catch` par salle — une partie qui plante ferme sa
salle et renvoie ses joueurs au hub, elle n'emporte plus le serveur. Pas de
processus par salon : la progression vit en mémoire avec Supabase pour seule
persistance, et deux processus tiendraient chacun leur copie du même compte.
Une salle n'écrit jamais rien elle-même — elle émet ses événements (fin de
manche, départ) et le hub, seul écrivain, persiste en regroupant les écritures
sur une courte fenêtre.

Les accumulateurs de simulation et de diffusion sont **décalés** d'une salle à
l'autre : seize salles qui simulent (0,78 ms pièce au pire cas) ou diffusent
(7 Ko × 4 clients) dans le même tour de boucle crèveraient le budget de 8,3 ms.

Les snapshots sont **compressés** (permessage-deflate, niveau 1, négocié sans
reprise de contexte) : une seule compression par salle et par message, la même
trame part vers toutes les sockets qui l'ont négociée. Mesuré sur un snapshot
pire cas de 7,3 Ko : **2,8 Ko, soit 61 % de gain** — le niveau 6 n'apporte que
3 points de plus pour bien plus de CPU. À 8 salles pleines, la bande passante
descend d'environ 36 à 14 Mbps.

Le TLS reste au proxy inverse (Caddy ou nginx) : Node parle HTTP en local, le
client passe en `wss://` tout seul quand la page est servie en HTTPS.

### Le serveur est autoritaire

Les clients n'envoient **que** deux directions — déplacement et visée — à 30 Hz.
Ils ne décident jamais de leur position, des dégâts, des morts, du score, ni de
la cible touchée. Les vecteurs reçus sont renormalisés côté serveur : envoyer
`(1e9, 1e9)` donne exactement le même résultat que `(1, 1)`.

Le serveur simule à 60 Hz et diffuse l'état à 20 Hz.

### Trois choses côté client

**Interpolation.** L'affichage a 110 ms de retard sur le dernier snapshot, soit
deux snapshots de marge, et interpole entre les deux états qui encadrent
l'instant affiché. Sans ça, le mouvement serait saccadé à 20 Hz sur un écran
qui en affiche 60 ou 144.

**Prédiction locale.** Ton personnage bouge immédiatement à la touche, puis est
ramené en douceur vers la position que le serveur renvoie. Au-delà de 90 px
d'écart, recalage sec.

**Pas de temps fixe.** Serveur et client avancent par incréments de 1/60 s,
indépendamment du taux de rafraîchissement.

### Protocole

| Sens | Message |
|---|---|
| client → serveur | `{t:"register", pseudo, pass}` · `{t:"login", pseudo, pass}` · `{t:"loginToken", pseudo, token}` · `{t:"logout"}` · `{t:"changePass", ancien, neuf}` · `{t:"listRooms"}` · `{t:"createRoom", name, pass}` · `{t:"joinRoom", code, pass}` · `{t:"leaveRoom"}` · `{t:"input", x, y, ax, ay, ar, d, s1, s2}` à 30 Hz · `{t:"vote", v}` · `{t:"pickClass", cls}` · `{t:"start"}` (hôte) · `{t:"pickCard", id}` · `{t:"pause", on}` · `{t:"leaveRound"}` |
| serveur → client | `welcome` · `authError` · `passChanged` · `loggedOut` · `rooms` · `roomJoined` · `joinRoomError` · `roomClosed` · `lobby` · `state` (20 Hz) · `round` · `roundEnd` · `roundAbort` · `cards` · `cardsWait` · `loadout` · `alert` · `paused` |

Un client est en état **hub** (liste des salles) ou en état **salle**
(comportement historique) : les messages de jeu ne sont valides qu'en salle, et
le serveur rejette proprement ce qui n'a pas de sens dans l'état courant.
`listRooms` est limité à une demande par seconde — c'est un bouton qu'on
martèle, et le port est public.

`d:1` dans `input` demande une esquive ; le serveur la consomme au tick suivant
et vérifie lui-même la recharge.

Pendant le choix de cartes, le serveur **cesse de simuler, donc de diffuser des
états**. C'est ce qui ferme l'écran de choix côté client : le premier `state` qui
revient signe la reprise, et il n'y a aucun minuteur local à tenir. Surtout, la
fermeture n'est **pas** conditionnée au fait d'avoir cliqué — le joueur qui
laisse expirer le délai reçoit une carte d'office, la manche repart pour tout le
monde, et son écran resterait ouvert sur une offre morte pendant qu'il se fait
dévorer.

`alert` est **ponctuel** et vit hors du snapshot : `{t:"alert", mech, level, dur}`
au moment de l'annonce d'une mécanique, `{t:"alert", boss}` à l'entrée d'un boss.
Une consigne répétée vingt fois par seconde ne serait plus une consigne. La
simulation empile dans `state.alerts`, le serveur vide après chaque tick — elle
ne connaît toujours pas le réseau.

La clé `bd` du snapshot suit le même modèle : les dégâts portés au boss depuis
l'instantané précédent, par joueur, vidés après diffusion. C'est la seule
information que le client ne peut pas déduire — les projectiles ne transportent
pas leur propriétaire, donc personne ne peut savoir localement quels dégâts sont
les siens. Chaque client n'y lit que sa propre ligne. Absente hors combat de
boss, c'est-à-dire l'essentiel d'une manche.

Les snapshots sont sérialisés en tableaux de nombres plutôt qu'en objets nommés,
ce qui divise leur poids par trois environ. **Ces tableaux sont positionnels :
on ajoute des champs à la fin, jamais au milieu**, et le client les lit avec une
valeur de repli — c'est ce qui permet d'ouvrir un onglet resté sur une version
précédente sans tout casser.

Ce même mécanisme autorise l'inverse : les **zéros de queue** d'un tuple de zone
sont coupés à la sérialisation. Un tuple en compte quinze et la plupart des
formes n'en remplissent que douze — un damier de douze cases économise ainsi
trente-six nombres par instantané, vingt fois par seconde. Omettre à la fin est
sûr ; *déplacer* un champ ne l'est pas.

Les tuples d'ennemi le font aussi depuis l'ajout du **compteur de touches** :
il vaut zéro tant que rien ne les a touchés, et la majorité des ennemis présents
à un instant donné n'ont jamais été touchés — on meurt en une ou deux balles.
La coupe s'arrête au septième champ et non au sixième : le client lit
l'orientation sans valeur de repli, et une orientation nulle est parfaitement
ordinaire.

`paused` est ponctuel lui aussi : le serveur l'émet quand il accorde une pause,
quand il la lève sur demande, et quand il la lève **de lui-même** — au bout de
cinq minutes ou à l'arrivée d'un second joueur. Le client garde son panneau
ouvert dans ce dernier cas et change simplement de libellé : le refermer
d'office aurait retiré le son et le bouton de sortie à quelqu'un qui ne
demandait rien.

## Mesures relevées

Simulation à 4 joueurs, mesurée sur ce projet :

| t | ennemis | snapshot | bande passante / joueur |
|---|---|---|---|
| 60 s | 16 | 2,7 Ko | 53 Ko/s |
| 120 s | 28 | 3,1 Ko | 62 Ko/s |
| 180 s | 33 | 3,8 Ko | 75 Ko/s |
| 300 s | 52 | 3,9 Ko | 78 Ko/s |
| pire cas | 200 (plafond) | 8,1 Ko | 163 Ko/s |

430 s de jeu se simulent en 0,9 s de CPU, soit 460× le temps réel.

Le pire cas est mesuré arène pleine en cauchemar, avec quatre tourelles posées,
le ricochet actif sur tout le monde et **24 zones simultanées** (un damier plus
un balayage). Les tourelles coûtent 5 nombres chacune, une zone 12 : le poste
dominant reste et restera la liste des ennemis. À quatre joueurs, cela
représente environ 5,2 Mbit/s en sortie du serveur — sans conséquence sur un
réseau local filaire ou en Wi-Fi correct.

Le rang d'élite ne coûte **rien** : il voyage dans le champ de type (+100)
plutôt que dans un drapeau séparé, qui aurait ajouté un nombre sur chacun des
200 ennemis. Le marquage de **retardataire** s'y ajoute (+200) pour la même
raison : un huitième élément payé sur tous les ennemis, vingt fois par seconde,
pour une information qui ne concerne que les dernières secondes d'une vague.

Le **compteur de touches**, lui, a bien fallu le payer — c'est le seul champ
ajouté à la liste d'ennemis depuis l'origine. Mesuré arène pleine, tous les
ennemis déjà touchés (le pire cas absolu) :

| version du compteur | poids de l'instantané | hausse |
|---|---|---|
| sans compteur | 6,65 Ko | référence |
| un octet complet (0 à 255) | 7,43 Ko | **+11,8 %** |
| un chiffre (0 à 9) | 7,04 Ko | **+5,9 %** |

Le budget qu'on s'était fixé était de 10 %. La première version le dépassait, et
c'est la mesure qui a tranché : un chiffre suffit largement, puisque le client ne
lit qu'une différence entre deux instantanés consécutifs. Sur une campagne
normale à un joueur, la bande passante passe de 11,0 à 11,6 Ko/s.

### Les deux champs du lot de lisibilité

Le **propriétaire d'une balle** et la **provenance du dernier dégât subi**. Le
dépôt avait jusqu'ici refusé de transmettre le premier, et la raison était bonne :
il ne servait qu'à attribuer des dégâts, ce que `bd` résout côté boss sans rien
payer par balle. Ce qui a changé, c'est l'usage — la lisibilité du tir, qu'aucune
déduction locale ne peut retrouver.

Pire cas mesuré : arène pleine (200 ennemis, la moitié déjà touchés), **400 balles
en vol**, 50 projectiles ennemis, quatre joueurs.

| version | poids de l'instantané | hausse |
|---|---|---|
| avant le lot | 14 844 o | référence |
| + provenance (4 joueurs) | 14 852 o | **+0,05 %** |
| + propriétaire (400 balles) | 15 652 o | **+5,4 %** |

Sur une manche réelle de 420 s, moyenne sur 25 200 instantanés : **+0,9 %** en
solo (889 → 897 o), **+2,0 %** à quatre (1 834 → 1 870 o). La provenance coûte
quatre nombres par instantané, quelle que soit la scène ; c'est la balle qui paie,
et elle ne paie qu'en fin de manche chargée.

Le total reste sous le budget de 10 % et du même ordre que le compteur de touches.
La répartition des dégâts subis par provenance est mesurée plus haut, dans « D'où
viennent les dégâts qu'on prend ».

### Grande arène et caméra (lot I)

L'arène passe de 1600 × 900 à **4800 × 2700** ; la **vue** reste 1600 × 900,
chaque client suit sa position prédite (caméra lissée, recalage sec au-delà
d'un écran, clamp à la salle). Les combats de boss se jouent dans des
**bounds resserrés à une vue**, ancrés sur le centre de gravité de l'équipe —
c'est le mécanisme de constriction du lot 5, réutilisé tel quel, et toute la
géométrie des mécaniques (damier, exaflares, couronne…) lit désormais les
bounds au lieu de l'arène dessinée.

Coût des coordonnées à quatre chiffres, mesuré arène pleine (200 ennemis, la
moitié touchés, 400 balles, 4 joueurs, 4 points de récolte) :

| version | poids de l'instantané | hausse |
|---|---|---|
| même scène à l'échelle 1600 × 900 | 15 791 o | référence |
| grande arène (coordonnées + clé `hv` + éclats) | 16 547 o | **+4,8 %** |

Sous le budget de 10 %. La caméra a été vérifiée en jeu réel : le suivi
s'arrête exactement à `ARENA_W − VIEW_W/2 = 4000` px au bord droit, et la
conversion souris reste juste pendant le déplacement (mémorisée en vue,
convertie en monde à la lecture).

Les **points de récolte** (cristal à détruire, amas à canaliser 1,5 s)
n'apparaissent jamais à moins de 1100 px d'un joueur vivant ni pendant un
boss ; le rendement (15-35 **éclats**, la monnaie de manche, jamais persistée)
est versé à chaque joueur — même logique que l'expérience commune. Les
retardataires sont resserrés (5 s, ×2,0) : un fuyard sur une salle neuf fois
plus grande ne se rattrapait plus. Les apparitions se tirent **autour de la
boîte englobante des joueurs** (hors écran, écrêtée à la salle) et non plus
sur les bords : sur une arène d'une seule vue, ce tirage redonne exactement
les quatre bords d'avant.

Restent à mesurer en conditions réelles (fenêtre visible, table à quatre) :
les images par seconde avec culling actif — le compteur `?perf` est en place —
et la durée moyenne d'une vague avant/après (attendu : écart sous 15 %).

### Économie du Terminal (lot H)

Le revenu devient **linéaire et plafonné** — on paie la vague atteinte, plus
la somme des vagues traversées, qui croissait au carré : une seule bonne
partie payait une ligne entière au palier maximal (≈ 3 100 noyaux mesurés,
dont deux tiers de primes de première fois, supprimées avec le lot). Les
coûts deviennent géométriques (200 → 3 600, 6 900 la ligne), les emplacements
se gagnent aux **jalons du compte** et plus aux achats. Cibles du spec F5,
vérifiées avec les fonctions réelles :

| mesure | attendu | relevé |
|---|---|---|
| vague 12, normal, 2 boss | 250 à 350 | **280** |
| vague 20, cauchemar, 4 boss | plafonné à 600 | **600** |
| parties pour un premier palier | 1 | **1** (200 ◈, ~280-378/partie) |
| parties pour une ligne complète | 16 à 20 | **18,3** |
| parties pour trois lignes complètes | 50 à 60 | **54,8** |
| emplacements compte neuf → maximal | 3 → 6 | **3 → 6** (jalons) |

Vérifié en jeu réel : une manche vague 1 en normal verse exactement 14 noyaux
(10 × 1 × 1,4). L'écart compte neuf / compte maximal reste à remesurer en
simulation complète (attendu sous 1,5 vague — les valeurs des lignes n'ont
pas changé, seuls le rythme d'acquisition et la capacité ont bougé).

### Rendu WebGL

Mesuré dans Chrome sans tête, sur un banc synthétique qui reproduit le pire cas
annoncé — 220 ennemis plus 3 000 particules :

| mesure | attendu | relevé |
|---|---|---|
| appels de dessin par image | 2 à 4 | **2** (un normal, un additif) |
| quads par image, pire cas | sous 4 000 | **3 220** |
| mémoire GPU de l'atlas | sous 16 Mo | **1,5 Mo** à densité 1, **6,1 Mo** à densité 2 |
| teinte, alpha, éclair, additif | exacts | lecture de pixels conforme aux quatre |

Les deux appels de dessin sont le chiffre qui compte : un lot vidé à chaque
sprite donnerait des centaines d'appels pour exactement la même image, et rien à
l'écran ne le dirait. `?perf` dans l'adresse les affiche en jeu, à côté des
images par seconde, du nombre de fragments et du chemin de rendu utilisé.

La lecture de pixels vérifie les quatre points où une bascule WebGL échoue
visuellement : une teinte rouge pleine rend `255,0,0,255`, un alpha de 0,5 rend
`127,127,127,127` (prémultiplié — un `255,255,255,127` aurait signalé l'erreur),
un éclair à 1 rend du blanc pur, et deux quads additifs à `0x40` rendent `128`.

Les images par seconde ne sont **pas** mesurables ainsi : le rendu logiciel de
Chrome sans tête ne dit rien d'un GPU réel, et le temps virtuel fige les
horloges. Elles se relèvent en session réelle avec `?perf`.

### Les axes de cartes du lot 6

Les dégâts par seconde sont mesurés sur **cible fixe et immortelle** — un ennemi
neuf replanté à chaque tick, 120 s de tir. C'est la seule mesure qui compare
deux chargements sans faire dépendre le résultat de la survie du bot.

La comparaison se fait **à nombre de cartes égal**, ce qui est le seul angle
honnête : un chargement critique complet ne coûte pas le même nombre de tirages
qu'un chargement brut complet.

| chargement | cartes | dps | chance critique |
|---|---|---|---|
| nu | 0 | 60 | 5 % |
| critique orienté (Précision ×2, Mire, Œil de faucon) | 4 | 98 | 49 % |
| brut (Affûtage ×3, Calibre) | 4 | 98 | 5 % |
| critique maximal (+ Talon faible ×2) | 8 | 135 | 60 % |
| brut (Affûtage ×6, Calibre ×2) | 8 | 134 | 5 % |

**Écart entre build critique et build brute : 1,1 %** à huit cartes, 0,9 % à
quatre — le critère du lot était « moins de 30 % ». La chance critique d'une
build orientée atteint 49 %, au-dessus de la fourchette de 25 à 45 % annoncée
dans le plan : les plafonds d'exemplaires ont déjà été abaissés une fois à la
mesure (Précision 5 → 3, Mire 3 → 2, Œil de faucon 2 → 1), et descendre plus bas
faisait tomber la build critique **sous** la build brute.

Conséquence chiffrée du critique de base : la puissance d'un joueur nu passe de
1,00 à **1,05** dans `_playerPower()`, donc les PV de boss et la pression des
vagues montent de 5 % — c'est exact, tout le monde inflige réellement 5 % de
dégâts en plus, et c'est précisément le rôle de l'indexation.

Variété du pool, 200 manches simulées avec la même dérive de qualité que le jeu :

| tirages dans la manche | communes distinctes vues | pire cas |
|---|---|---|
| 18 | 14,3 | 8 |
| 20 | **15,1** | 11 |

Le critère était « plus de 15 ». Il est atteint en haut de la fourchette de
tirages (le dépôt en annonce quinze à vingt) et manqué de peu en bas : le pool
de rareté basse se vide toujours en milieu de manche, parce que la dérive de
qualité pousse mécaniquement les épiques. Douze communes ajoutées au lieu des
huit du plan, et c'est le levier qui reste si le chiffre doit encore monter.

Aucune case de secours (Ravitaillement) n'a été servie sur les 200 manches, là
où le pool d'avant en servait : c'est l'effet secondaire attendu d'un catalogue
passé de 77 à 106 cartes. **Mesure prise à 106 cartes** — le catalogue en compte
116 depuis, et l'effet ne peut qu'avoir grandi. Le chiffre n'est pas mis à jour
ici : une mesure se remesure, elle ne se réécrit pas.

### Vagues et progression

Cinq essais par configuration, bots qui visent l'ennemi le plus proche (le boss
en priorité quand il est là), fuient la menace et esquivent au contact.

| joueurs | vagues en 900 s | niveau d'équipe | cartes prises | durée d'une vague normale |
|---|---|---|---|---|
| 1 | 15,8 | 15,4 | 14,2 | 56,5 s |
| 2 | 17,6 | 14,2 | 13,2 | 51,8 s |
| 3 | 18,0 | 13,8 | 12,6 | 47,1 s |
| 4 | 16,0 | 14,0 | 13,0 | 49,2 s |

Le résultat quasi identique à un et à quatre joueurs **est le but** : le budget
de vague et les paliers de niveau portent le même exposant d'effectif (0,75), ce
qui donne la même partie quel que soit le nombre de joueurs.

Coût, sur les mêmes essais : **22,9 à 55,6 Ko/s** par joueur (plafond fixé à
160), et **0,20 à 1,07 s de CPU pour 600 s simulées** (plafond fixé à 3 s).

Chargements forcés sur les cartes qui réécrivent le tir, que des bots ne
tireraient jamais spontanément — c'est le cas qui inquiétait, une balle qui ne
disparaît plus se teste contre 200 ennemis à chaque image :

| chargement | CPU / 600 s | bande passante |
|---|---|---|
| témoin, tirage libre | 0,59 s | 42 Ko/s |
| Inertie | 0,71 s | 52 Ko/s |
| Inertie + Canon long ×3 + Poudre ×3 | 0,55 s | 48 Ko/s |
| Rebond + Inertie + Canon long ×3 | **0,92 s** | **68 Ko/s** |
| Rebond + Second canon ×2 + Écho | 0,74 s | 65 Ko/s |

Le pire cas reste à moins d'un tiers du budget CPU. Ce sont le plancher de
dégâts d'Inertie et le plafond de rebonds qui le tiennent : sans eux, une balle
à 0,1 dégât restait en vol jusqu'à expiration en se testant contre toute
l'arène, et le coût montait avec la densité — c'est-à-dire au pire moment.

### Classes : écarts entre compositions

Cinq essais par composition, mêmes bots que ci-dessus, avec en plus l'usage des
deux compétences dès que la situation s'y prête. **Aucun réglage n'a encore été
touché à la suite de ces chiffres** — ils sont le constat, pas la conclusion.

| composition | j | vague | niveau | survie | durée d'une vague | durée d'un boss |
|---|---|---|---|---|---|---|
| tireur | 1 | 5,6 | 7,2 | 162 s | 27,3 s | 42 s |
| soigneur | 1 | 4,8 | 6,6 | 162 s | 27,9 s | — |
| tank | 1 | 6,0 | 8,0 | 218 s | 34,9 s | 56 s |
| tireur ×2 | 2 | 5,4 | 6,2 | 196 s | 30,2 s | 54 s |
| tank + tireur | 2 | 5,0 | 5,8 | 180 s | 28,2 s | — |
| soigneur + tireur | 2 | 7,0 | 7,8 | 286 s | 37,2 s | 59 s |
| tank + soigneur + tireur | 3 | 8,6 | 9,8 | 445 s | 50,9 s | 77 s |
| trio + tireur | 4 | 8,0 | 8,4 | 354 s | 39,9 s | 66 s |

**Écart à effectif égal** — le chiffre qui décide : **1,2 vague à un joueur**
(4,8 à 6,0), mais **2,0 vagues à deux** (5,0 à 7,0), au-dessus de la limite de
1,5 qu'on s'était fixée. Le duo le plus fort est *soigneur + tireur*, le plus
faible *tank + tireur*.

| classe | dégâts | part du tireur | soins |
|---|---|---|---|
| tank (avec tireur) | 7 024 | 45 % | — |
| tank (trio) | 35 478 | 56 % | — |
| soigneur (avec tireur) | 13 087 | 31 % | 458 |
| soigneur (trio) | 16 371 | 26 % | 1 191 |

Le tank tient l'objectif (au moins 40 % des dégâts du tireur), **le soigneur ne
le tient pas** : 26 à 31 %. C'était attendu — le temps passé en mode soin est du
temps sans dégâts — mais l'objectif était écrit sans compter les soins à part.

Survie du **soigneur solo : 162,1 s contre 162,0 s** pour le tireur solo, soit
0,1 % d'écart là où on tolérait 20 %.

Taux d'utilisation des compétences : **17 à 79 %** des recharges consommées,
contre 80 % attendus. Le chiffre en dit plus sur les bots que sur les
compétences : ils ne déclenchent que sous condition (rempart s'il y a au moins
deux ennemis dans la zone, bombe s'il y en a deux dans le rayon visé), et un bot
qui appuierait dès que c'est prêt afficherait 100 % sans rien prouver.

Coût : **0,06 à 0,88 s de CPU pour 900 s simulées** (plafond 3 s) et **7,7 à
11,3 Ko/s par joueur** (plafond 160). Le lot n'a rien changé à ces deux postes.

Observation structurelle, à garder en tête avant tout réglage : **les PV du boss
sont indexés sur la puissance de l'équipe, qui intègre le multiplicateur de
dégâts de classe**. Le +20 % du tireur lui achète donc +20 % de PV de boss et
ne lui laisse que ses 85 PV en moins ; le −20 % du tank lui rend un boss plus
tendre en plus de ses 150 PV. Sur les vagues, l'indexation est partielle (55 %
et 35 %), donc l'effet ne s'y annule pas de la même manière.

### États et purge

Dix essais par composition, mêmes bots que ci-dessus, avec en plus : le soigneur
vise l'allié et non l'ennemi quand il est en mode soin, et un joueur sous
Sentence court vers lui. La Sentence et le Miasme n'ont pas encore de porteur —
le roster de boss est le lot suivant — ils sont donc **posés par le harnais** aux
cadences prévues (Miasme toutes les 25 s pendant un boss, Sentence toutes les
20 s) : c'est la mécanique qu'on mesure, pas son câblage.

| composition | survie | vague | états simultanés / joueur | max | purges par manche |
|---|---|---|---|---|---|
| témoin, système débranché | 208 s | 5,7 | 0,00 | 0 | — |
| tank + soigneur + tireur | 173 s | 5,0 | 0,06 | 2 | 3,2 (59 % des états posés) |
| tank + tireur + tireur | 161 s | 5,0 | 0,06 | 1 | 0,4 (13 %) |

**Écart avec / sans soigneur : 7 %**, pour une limite fixée à 25 %. L'objectif du
lot est tenu : le soigneur accélère, il n'est pas une condition d'accès. Les
états simultanés restent très en dessous de la limite de 2 — les sources sont
rares aujourd'hui (les élites, et le Miasme seulement pendant un boss), le
chiffre était à **remesurer au lot 4** quand les boss en poseraient vraiment.

**Remesuré**, en trio, sur 120 s de combat par boss porteur d'états :

| boss | états simultanés / joueur | max | cumuls de Vulnérabilité |
|---|---|---|---|
| Oracle | 0,90 | 1 | 2,59 |
| Jumeaux | 0,35 | 1 | 0,02 |

La limite de 2 tient toujours, et le maximum de 1 chez les Jumeaux **n'est pas un
hasard** : cumuler Brûlure et Entrave déclenche l'explosion, qui retire les deux
dans la foulée. Chez l'Oracle, ce sont les **cumuls** qui montent — 2,59 sur 3
possibles, entre le Miasme toutes les 25 s et les échecs de mécanique. C'est
exactement l'usure que le lot 3 avait prévue sans pouvoir encore la produire.

Deux chiffres ne tiennent pas leur cible :

- **Taux de purge : 59 %** contre 60 % attendus, ce qui est la limite. Sans
  soigneur, les 13 % viennent des seuls rempart et Purification : c'est peu, mais
  c'est cohérent avec le principe — les états expirent tous seuls.
- **Survie à la Sentence : 42 %** contre 80 % attendus, sur 19 poses. La
  ventilation par classe est la vraie information : **tireur 4/5, tank 4/10,
  soigneur 0/4.**

Le soigneur ne peut pas se purger lui-même : son faisceau ne se soigne pas, et sa
seule réponse est la vague de soin, dont la recharge (16 s) est plus longue que
la cadence de Sentence testée (20 s à peine). **Contrainte pour le lot 4 : un
boss ne doit pas viser le soigneur avec la Sentence, ni en enchaîner plus vite
que la recharge de la vague.** Ne pas corriger en allongeant l'état ni en
autorisant une double purge — les deux videraient la règle d'ordre de son sens.
Le tank à 4/10 s'explique autrement : « soigné à plein » coûte d'autant plus cher
qu'on a de PV, et 150 PV à remonter en 8 s dans un combat de boss demande que le
soigneur lâche tout le reste. Un soigneur en ligne de vue purge en **0,48 s**,
mesuré à part : ce qui manque n'est pas la puissance de la purge, c'est la
position.

Coût CPU d'un tick, arène pleine (200 ennemis), quatre joueurs, après rodage du
JIT :

| situation | moyenne | p99 | pire |
|---|---|---|---|
| sans états | 0,051 ms | 0,17 ms | 0,29 ms |
| 4 états sur les 4 joueurs | 0,059 ms | 0,19 ms | 0,42 ms |

Le système coûte **8 µs par tick** dans le pire cas raisonnable, pour un budget
de 16,7 ms. C'était attendu : les états vivent sur les joueurs, qui sont quatre,
et non sur les ennemis, qui sont deux cents.

### Roster de boss

Cinq essais par configuration et par politique, renforts du boss coupés pendant
la mesure (on veut l'écart dû au **répertoire**, pas le bruit de deux cents
contacts), dix cartes par bot.

**Durée du combat**, bots invulnérables — on mesure ici le mur de PV seul, sans
que la survie des bots ne s'y mêle. Cible : 50 à 80 s, comparable d'un boss à
l'autre.

| boss | 1 j. | 2 j. | 4 j. |
|---|---|---|---|
| Ravageur | 49 s | 53 s | 57 s |
| Matriarche | 80 s | 76 s | 66 s |
| Métronome | 45 s | 48 s | 52 s |
| Oracle | — | 71 s | 78 s |
| Jumeaux | — | 70 s | 77 s |

Trois réglages sont sortis de cette table, et aucun n'était prévisible :

- **soin mutuel des Jumeaux, 2 % → 0,8 %** par seconde. À 2 %, le combat durait
  **167 à 198 s** : ils se rejoignent d'eux-mêmes puisqu'ils poursuivent des
  joueurs, et la mécanique n'invitait plus à se séparer, elle interdisait de
  gagner.
- **lien nourricier, 1,2 % → 0,5 %** par seconde et par rejeton, plus **un seul
  rejeton et une seule grappe en solo**. À deux, un joueur peut se détacher
  pendant que l'autre tient le boss ; seul, chaque cible secondaire est du temps
  de tir pris sur le boss lui-même — 95 s de combat contre 49 pour le Ravageur.
- **Oracle ×1,10 → ×0,95** de PV, pour la raison décrite plus haut.

Un bug a été trouvé par la même table : le lien nourricier était créé avec une
échéance nulle et se résolvait au premier tick, donc **le soin ne s'appliquait
jamais**. Les durées de la Matriarche n'ont pas bougé d'un réglage tant que
c'était vrai.

**L'écart entre un bot qui lit les annonces et un bot qui les ignore** — la
mesure qui compte. Elle est prise en **temps de survie**, les deux politiques
partageant l'esquive et le maintien de distance (c'est le geste de base du jeu,
pas de la lecture). Cible : plus de 40 %.

| boss | 1 j. | 2 j. | 4 j. |
|---|---|---|---|
| Ravageur | −7 % | +69 % | +63 % |
| Matriarche | +20 % | +37 % | +96 % |
| Métronome | +66 % | +99 % | +87 % |
| Oracle | — | +107 % | +120 % |
| Jumeaux | — | +26 % | +52 % |

**Neuf configurations sur onze au-dessus de la cible**, et l'ordre est celui
qu'on espérait : l'Oracle, dont tout le répertoire est collectif, double la
survie d'une équipe qui lit. Les deux qui échouent sont **solo** — normal, un
boss solo n'a presque que des zones à lire, et c'est exactement ce que le bot
« ignore » sait déjà faire à moitié via l'esquive commune. Le −7 % du Ravageur
solo dit surtout que notre bot esquive mal ; il ne dit rien de neuf sur le
combat, qui n'a pas changé dans ce lot.

**Taux d'échec par mécanique**, politique « lit », toutes configurations
confondues. Cible : aucune au-dessus de 60 % au premier contact.

| mécanique | poses | échec |
|---|---|---|
| appâts | 211 | 0 % |
| dispersion | 70 | 4 % |
| grappes | 66 | 0 % |
| tours | 64 | 31 % |
| regroupement | 62 | 18 % |
| sanctuaires | 59 | 0 % |
| proximité | 38 | 3 % |
| dénombrement | 8 | 25 % |
| lien | 2 | 100 % |

Le **lien** est le seul au-dessus de la cible, sur deux poses seulement : le bot
le traite après l'esquive des zones, et les croix des Jumeaux tombent pendant ce
temps-là. Test dédié, avec des bots qui s'écartent : **20 rompus sur 20**. La
mécanique est saine, la mesure ne l'est pas — elle est notée ici pour être
refaite avec de vrais joueurs.

Les **tours** à 31 % et le **dénombrement** à 25 % sont dans la cible et sont les
deux seules mécaniques que des bots ratent vraiment : ce sont aussi les deux qui
demandent de se répartir, donc de se parler.

**Coût**, 600 s simulées par boss, quatre joueurs, combats enchaînés :

| boss | CPU / 600 s | bande passante / joueur | marqueurs moyens |
|---|---|---|---|
| Ravageur | 0,43 s | 9,4 Ko/s | 0,0 |
| Matriarche | 0,29 s | 8,5 Ko/s | 2,5 |
| Métronome | 0,36 s | 8,9 Ko/s | 1,3 |
| Oracle | 0,21 s | 6,7 Ko/s | 1,3 |
| Jumeaux | 0,27 s | 8,2 Ko/s | 0,0 |

Plafonds : 3 s de CPU et 160 Ko/s. Les marqueurs coûtent 11 nombres chacun et il
y en a moins de trois en moyenne — c'est le poste le moins cher du snapshot.

**Critères d'acceptation**, vérifiés par script plutôt que supposés :

- cinq boss sortent, **sans répétition avant épuisement** — deux cycles complets
  vérifiés ;
- **l'Oracle et les Jumeaux ne sortent jamais en solo** — 200 tirages solo, trois
  boss vus ;
- une mécanique ratée **ne tue jamais** un joueur à pleine vie, y compris avec
  trois cumuls de Vulnérabilité en cauchemar ;
- une **déconnexion** en pleine mécanique de groupe ne bloque rien : les
  marqueurs orphelins se suppriment, le combat continue ;
- une **cage détruite** rend immédiatement sa mobilité au prisonnier.

### Durée des combats de boss

**q1 49 s, médiane 70 s, q3 89 s** sur 58 combats. Référence de l'ancienne
courbe, mesurée en solo dans les mêmes conditions : 54 / 63 / 64 / 68 s.

La médiane dépasse légèrement l'ancienne fourchette et la dispersion est large.
Les deux s'expliquent par le chargement : le bot prend systématiquement la plus
haute rareté offerte, et une série défensive ne fait aucun dégât au boss là où
une série offensive le plie. Les PV du boss restent indexés sur la puissance
mesurée de l'équipe, donc la durée ne dérive **pas** d'un boss au suivant — ce
qui n'était pas vrai avant ce lot : `_playerPower` comptait les canons
supplémentaires sans la pénalité de dégâts qui les accompagne, et surestimait la
puissance de 44 % avec deux « Second canon ». Le boss recevait des PV pour des
dégâts qui n'existaient pas : 76 s au premier boss, 172 s au troisième.

### Raretés obtenues

La dérive de rareté a dû être **remesurée** avec le passage aux vagues. Elle
était indexée sur le nombre de boss, qui ne dépassait pas 2 ou 3 par manche :
l'exposant restait petit tout seul. Indexée sur la qualité de tirage, qui monte
jusqu'à 11, l'ancienne dérive (1,35 / 1,8) donnait **3,06 légendaires par manche
et 99 % des manches en voyant au moins une**, contre 0,67 et 53 % avant le lot.
Le système entier perdait sa pointe.

Deux leviers plutôt qu'un : la dérive a été adoucie (**1,18**) *et* plafonnée
(6 crans). Adoucir seul ne suffisait pas ; plafonner seul à 1 tuait le bonus de
qualité des vagues de boss, qui n'avait alors plus aucun effet. Ce sont les
**épiques** qui absorbent l'augmentation du nombre de cartes, et c'est voulu :
c'est le palier où deux joueurs de la même table cessent de jouer le même jeu.

#### Ce que la mesure par effectif a montré

Ce calibrage-là avait été fait **à un seul effectif**, et c'est ce qui a produit
le défaut constaté en jeu — trop de légendaires en solo. Remesuré à 1, 2, 3 et
4 joueurs séparément, **12 manches menées jusqu'à la vague 20** par effectif,
dégâts désactivés (la mesure porte sur le contenu des tirages, pas sur le niveau
du bot ; sans ce masque la moitié des manches s'arrêtaient au premier boss et
aucune n'atteignait le jalon de la vague 10) :

| effectif | niveau atteint | cartes / joueur | légendaires | max | épiques |
|---|---|---|---|---|---|
| **avant** 1 j. | 16,75 | 15,08 | 0,92 | **3** | 7,08 |
| avant 2 j. | 15,33 | 14,25 | 0,79 | 2 | 6,13 |
| avant 3 j. | 13,83 | 12,67 | 0,75 | **3** | 5,81 |
| avant 4 j. | 14,67 | 13,25 | 0,63 | 2 | 6,21 |
| **après** 1 j. | 16,50 | 15,50 | 1,17 | **2** | 7,33 |
| après 2 j. | 15,08 | 14,00 | 1,25 | **2** | 5,71 |
| après 3 j. | 13,67 | 12,50 | 1,36 | **2** | 5,25 |
| après 4 j. | 14,67 | 13,42 | 1,31 | **2** | 5,67 |

Trois choses s'y lisent :

- **Le cas dégénéré existait bel et bien** : trois légendaires chez un joueur, à
  1 et à 3 joueurs. C'est ce que le plafond dur supprime — jamais plus de deux,
  quel que soit l'effectif, quelle que soit la chance.
- **Le nombre de légendaires ne dépend plus de l'effectif** : 1,17 à 1,36 par
  joueur, soit 16 % d'écart entre le meilleur et le pire, contre une moyenne qui
  variait sans raison lisible avant. Ce n'est plus une loterie, c'est une
  récompense de progression : deux jalons, deux légendaires si la manche va loin.
- **L'écart d'épiques entre effectifs vient du niveau atteint, pas des poids.**
  Brut, il atteint 40 % (5,25 à 7,33) et manque la cible de 30 % ; ramené au
  nombre de cartes obtenues — la seule comparaison honnête, puisqu'un solo monte
  1,4 niveau de plus sur vingt vagues — il tombe à **15 %** (41 à 47 % des cartes
  d'un joueur sont épiques, quel que soit l'effectif). Ce qui reste à corriger,
  si on veut y revenir, est la normalisation de l'XP sur l'effectif, pas la table
  des raretés.

Le pool ne s'épuise plus : **31 à 55 cartes distinctes** proposées sur une
manche complète selon l'effectif, sur un pool commun passé de 56 à 64 cartes. Les répétitions (9 à 40 sur ~45 tirages de trois cartes) sont attendues et
voulues : une carte cumulable doit pouvoir ressortir tant qu'elle n'est pas
plafonnée.

### Retrait des bonus au sol

Quatre bonus sortis de la rotation et fréquence divisée par deux : la réserve
était qu'une équipe **sans soigneur** en souffre plus que les autres, le bonus
`heal` étant sa principale source de récupération. Cela aurait contredit la
décision du lot précédent — le soigneur accélère, il n'est jamais une condition
d'accès. Mesuré sur **25 manches par configuration et par effectif**, bots
normaux (les dégâts comptent, cette fois — c'est la survie qu'on mesure) :

| | durée moyenne avant | après | écart |
|---|---|---|---|
| **sans soigneur** | 233,4 s | 239,5 s | **+2,6 %** |
| **avec soigneur** | 327,8 s | 372,2 s | **+13,6 %** |

L'absence de soigneur n'est donc **pas** devenue plus punitive : les deux
compositions gagnent, et l'écart entre les deux écarts (11 points) reste sous la
barre des 20 % qui aurait imposé de relever le poids de `heal` sans soigneur. Le
mécanisme existe pourtant déjà pour `purification` — il n'a pas été branché sur
`heal`, parce qu'un second bonus dont le poids dépend de la composition ferait
de `hasHealer()` un réglage de difficulté, ce que le dépôt refuse par principe.

La **vague atteinte** bouge de moins d'une demi-vague (5,98 → 6,19 sans
soigneur, 7,13 → 7,62 avec), sous la cible d'une vague d'écart. Par effectif
isolé, la dispersion reste large (−17 % à +29 %) : c'est la variance d'une
manche de survie avec bots, pas un effet du retrait — d'où la lecture sur la
moyenne des quatre effectifs.

### Motifs au sol

Bots remis à neuf après chaque image — la sanction de mécanique est calibrée en
part des PV **max**, gonfler la réserve ne protège donc de rien et les bots
tombaient au bout d'une minute. On mesure ainsi le combat entier et son pire cas
de zones, les dégâts encaissés étant comptés avant la remise à neuf.

**Zones simultanées et coût réseau**, un combat entier par ligne :

| boss | 1 j. | 2 j. | 4 j. |
|---|---|---|---|
| Ravageur | 15 | 20 | 13 |
| Matriarche | 7 | 13 | 8 |
| Métronome | 6 | 8 | 16 |
| Oracle | — | 2 | 4 |
| Jumeaux | — | 12 | 12 |

Pire cas mesuré : **20 zones simultanées**, moyenne de 1 à 4,5 selon le boss.
La cible du lot était « moins de 40 » : on est à la moitié, et le plafond de
rendu à 40 n'a jamais été atteint en jeu.

**Coût du snapshot.** Le pire cas réel n'est pas un combat de boss — son arrivée
balaie l'arène — mais une vague normale à arène pleine. Mesuré sur un état
synthétique (200 ennemis, 60 projectiles, un damier de 12 cases, 4 joueurs) :

| état | snapshot |
|---|---|
| sans le lot 5 | 6,4 ko |
| avec 25 flaques, arène resserrée et murs | 7,5 ko (**+16 %**) |

Sous la cible de +20 %. Deux choses y contribuent : `bn` et `wl` sont **absentes**
tant que l'arène ne bouge pas, et les **zéros de queue** des tuples de zone sont
coupés — un tuple en compte quinze et la plupart des formes n'en remplissent que
douze, ce qui économise trente-six nombres par damier et par instantané.

En combat réel de Matriarche maintenu à 150 s, le plafond de 25 mares n'est
jamais atteint : **11 zones simultanées** au pire, la horde ne tirant pas assez
vite. Le plafond reste en place — il protège du cas où la composition des
renforts changerait, et il coûte une boucle sur une liste déjà parcourue.

**CPU.** `_zoneHits` sur 40 zones (les six formes mélangées) × 4 joueurs :
**0,002 ms par tick**, contre **0,050 ms** pour l'évitement mutuel de 200
ennemis. Soit **4 %** du coût de l'évitement — négligeable, comme attendu.

**Écart entre lire les annonces et les ignorer**, la mesure de référence du dépôt
pour juger une mécanique. Dégâts subis sur 180 s à deux joueurs, **moyenne sur
huit combats** : sur un seul, le tirage d'attaques suffit à inverser le signe.

| boss | ignore | lit | écart |
|---|---|---|---|
| Ravageur | 1702 | 1175 | 31 % |
| Matriarche | 2139 | 1219 | 43 % |
| Métronome | 2245 | 1240 | 45 % |
| Oracle | 2703 | 2530 | 6 % |
| Jumeaux | 4042 | 3444 | 15 % |

Les trois premiers écarts sont sains. **Les deux derniers ne disent rien du lot**
et sont un artefact du bot : sa règle d'évitement est « fuir le centre de la zone
la plus proche », ce qui est exactement le mauvais geste pour un Pac-Man (où il
faut se **placer** dans un secteur) et ne traite ni le Regard, ni les tours, ni
la séparation des Jumeaux — c'est-à-dire l'essentiel des dégâts de ces deux
combats. À vérifier en jeu réel, pas en simulation.

### Ce qui n'a pas marché

**Donner plus de cartes ne rallonge pas la survie.** C'était le levier prévu
pour compenser la suppression des gains de niveau. Mesuré : à 22 cartes par
manche au lieu de 4, la survie ne bouge pas (77 à 128 s selon l'effectif, contre
95 à 134 s avec la courbe normale). Les morts viennent des **dégâts subis**, et
un joueur qui choisit ses cartes en prend majoritairement des offensives.

Réduire la pression des vagues ne marche pas davantage : −55 % sur les PV, le
débit et le budget ne change rien à la vague atteinte.

Ce qui manquait était ailleurs. La suppression des niveaux avait emporté avec
elle **+88 PV max** et **10 PV rendus par palier**, sans rien mettre à la place :
il ne restait plus aucune source de récupération entre deux vagues, sauf la mort
d'un boss — soit une fois toutes les cinq vagues. D'où le **soin de fin de
vague** (18 PV), qui ne figurait pas au plan du lot. Un répit qui ne rend rien
n'est pas un répit, c'est un compte à rebours.

Coût CPU d'un tick, arène pleine (200 ennemis), quatre joueurs :

| situation | moyenne | p99 | pire |
|---|---|---|---|
| sans aucune carte | 0,07 ms | 1,9 ms | 5,3 ms |
| toutes les cartes lourdes prises | 0,35 ms | 6,3 ms | 38 ms |

Le budget d'un tick est de 16,7 ms. Les cartes multiplient le coût par cinq et
il reste deux ordres de grandeur de marge : la crainte annoncée dans la
spécification — brûlure, vampirisme, ricochet et chaîne de foudre alourdissant
la boucle de collision au point de menacer le plafond de 200 ennemis — ne s'est
**pas** vérifiée. Les pics isolés à 38 ms sont des passages du ramasse-miettes,
et l'accumulateur du serveur les rattrape au tick suivant.

Effet du passage à une cadence fixe, deux joueurs simulés, moyenne sur huit
manches : survie de **182 s** contre 182 s pour l'ancienne courbe, même nombre
de boss atteints, **20 % de kills en moins**. Le réglage a demandé trois séries
de mesures — voir le commentaire de `FIRE_INTERVAL`, qui documente pourquoi la
valeur qui reproduisait le mieux l'ancienne pression (0,09) a justement été
écartée.

### Retour sensoriel

Mesures relevées avec un script jetable qui importe `public/audio.js` et
`public/events.js` tels quels, avec un faux `AudioContext` — les deux modules ne
dépendent ni du DOM ni du canvas, exactement pour ça.

| mesure | attendu | relevé |
|---|---|---|
| voix simultanées, 50 déclenchements dans la même image | plafonnées à 16 | **16** actives, 34 volées |
| même son 50 fois dans la même image | filtré par la recharge | **49 refusés**, 1 joué |
| une seconde à 18 déclenchements par image | pas de dérive | pic **16** voix, 8 volées, 1072 refusées |
| décalage son / image sur un impact | moins de 30 ms, jamais en avance | **+6,7 ms** (une image = 16,7 ms) |
| coût de la diffusion, 200 ennemis / 400 balles / 12 zones | négligeable | **0,015 ms** par snapshot |
| mise à jour de 300 particules | négligeable | **0,001 ms** par image |
| bandeau effacé avant la résolution | toujours | **250 ms** de marge au pire (Exaflare, la plus courte annonce du jeu) |

Le décalage de +6,7 ms est la seule mesure qui comptait vraiment : il est
**positif**, donc le son arrive après l'image et jamais avant. C'est la
conséquence directe du choix d'horloge — les événements se déduisent de deux
snapshots consécutifs mais ne sont livrés qu'au moment où l'horloge de rendu
franchit le second. À la réception, le même son serait tombé **110 ms trop tôt**.

Les 34 voix volées sur 50 déclenchements ne sont pas une perte : quand cinquante
choses se produisent dans la même image, les seize premières disent déjà tout, et
les trente-quatre autres n'auraient produit qu'un mur de bruit saturé.

**Les images par seconde se mesurent au navigateur**, pas en simulation : le
coût du rendu est celui du canvas, qui n'existe pas dans Node. Ouvrir
`http://localhost:8080/?perf` affiche images par seconde, nombre de fragments,
nombre d'ennemis, **chemin de rendu et appels de dessin**, et voix actives dans
le coin bas gauche. Le budget est large : les deux parts mesurables du lot —
diffusion et particules — consomment ensemble **0,016 ms** sur les 16,7 ms d'une
image.

## Réglages

Tout est en haut de `shared/game_state.js`.

```js
ARENA_W / ARENA_H       // 1600 x 900
DASH_TIME / DASH_CD: 0.18 s / 3 s   // durée du bond, puis recharge
DASH_SPEED: 900         // 162 px parcourus
ELITE_MIN / MAX: 22-34  // secondes entre deux élites
ELITE_HP_MUL: 3         // et butin garanti
BOSS_BARS: 5            // barres de vie, une mécanique de plus par barre brisée
BOSS_HP_MUL: 2.6        // par rapport à l'ancien boss
BOSS_HP_BASE: 1200      // PV de référence, avant joueurs / puissance / difficulté
BOSS_GROWTH: 0.06       // croissance d'un boss au suivant
GRID_COLS / ROWS: 4 x 3 // découpe du damier
SWEEP_BLADES: 12        // pales du balayage
REVIVE_TIME: 1.0        // secondes, divisées par le nombre de sauveteurs
REVIVE_HP_RATIO: 0.45   // part des PV max rendus au relevé

WAVE_BUDGET_BASE: 14    // apparitions de la vague 1
WAVE_BUDGET_RAMP: 6     // apparitions ajoutées par vague
WAVE_CROWD_EXP: 0.75    // budget ET paliers de niveau × joueurs^0.75
WAVE_BREATHER: 4        // secondes de répit entre deux vagues
WAVE_HEAL: 18           // PV rendus à la fin d'une vague
WAVE_BOSS_EVERY: 5      // la vague 5, 10, 15... est un boss
WAVE_STRAGGLER_DELAY: 8 // secondes avant de marquer les retardataires
WAVE_STRAGGLER_SPEED: 1.6
WAVE_HP_POWER_K: 0.55   // part de la puissance d'équipe répercutée sur les PV
WAVE_RATE_POWER_K: 0.35 // ... et sur le débit d'apparition

LEVEL_KILLS_BASE: 15    // kills normalisés du premier palier
LEVEL_KILLS_GROWTH: 1.18 // coût de chaque palier suivant
WAVE_XP_BONUS: 12       // équivalent kills versé à la fin d'une vague
LEVEL_MAX: 30           // plafond — un niveau = une carte
POWERUP_MIN / MAX: 18-26 // secondes entre deux bonus au sol
POWERUP_MAX_GROUND: 2   // bonus présents au sol simultanément
MAX_ENEMIES: 200        // plafond dur
ENEMY_HP_WAVE_RAMP: 9   // PV gagnés par les ennemis, par vague
SPAWN_WAVE_RAMP: 0.15   // apparitions par seconde gagnées par vague
TURRET_LIFE / RANGE: 20 s / 350 px
RICOCHET_RADIUS: 250    // portée d'un saut de chaîne
SHIELD_POOL: 80         // réserve du bouclier
SLOW_MUL: 0.45          // vitesse des ennemis pendant le ralentissement
NOVA_RADIUS: 430        // portée de l'onde de choc
FIRE_INTERVAL: 0.16     // intervalle de tir, fixe : il ne progresse plus seul
FIRE_INTERVAL_MIN: 0.05 // plancher, cartes et bonus cumulés
BOSS_FIRST: 180         // premier boss
BOSS_EVERY: 180         // puis tous les
BOSS_SUMMON_EVERY: 15   // intervalle des renforts pendant le combat
BOSS_ADD_CAP: 55        // plafond des renforts
BUFF_TIME: 14           // durée des bonus
```

Courbe de difficulté, dans `_spawner()` :

```js
const rate = (0.8 + this.time / 78) * Math.sqrt(crowd);  // ennemis par seconde
const hp = 16 + this.time * 0.16;                        // PV de base
```

Le nombre de joueurs entre en `sqrt` : à quatre, la pression monte sans devenir
quatre fois plus forte, sinon les grosses parties seraient plus faciles.

Les deux ont été détendus en même temps que la cadence est devenue fixe. Le
levier qui compte est **le débit d'apparition, pas les PV** : baisser
`ENEMY_HP_RAMP` seul ne rallongeait la survie que de quelques secondes, alors
que `SPAWN_RAMP` la déplaçait de trente. C'est la densité qui tue, pas la
résistance.

Les valeurs propres aux cartes vivent dans `CARD_CFG`, en haut de
`shared/cards.js`, celles des compétences dans `SKILL_CFG` (`shared/classes.js`),
celles des états dans `STATUS_CFG` (`shared/statuses.js`) et celles des boss dans
`BOSS_CFG` (`shared/bosses.js`) — pour que ces modules ne dépendent de rien :
`game_state.js` les importe, l'inverse créerait un cycle.

Les réglages des états, dans `STATUS_CFG` :

```js
VULN_PER_STACK: 0.25    // dégâts subis en plus, par cumul (3 au maximum)
BURN_DPS: 6             // dégâts par seconde
ROOT_SLOW: 0.40         // part de vitesse perdue
PURGE_HITS / WINDOW: 2 impacts en 3 s   // purge par insistance du faisceau
ELITE_STATUS_CD: 4      // secondes entre deux applications par la même élite
BOSS_MIASMA_EVERY: 25   // usure imposée par les boss qui l'utilisent (lot 4)
PURIFY_CHANCE: 0.06     // ... et 0,16 quand l'équipe n'a pas de soigneur
```

Les réglages des boss et de leurs mécaniques, dans `BOSS_CFG` — les valeurs qui
ont bougé à la mesure portent leur historique en commentaire dans le fichier :

```js
MECH_DAMAGE_RATIO: 0.90  // sanction d'un échec, en part des PV max de la cible
MECH_VULN: 1             // cumuls de Vulnérabilité posés par un échec
STACK_RADIUS: 135        // regroupement : rayon du cercle
SPREAD_MIN: 230          // dispersion : distance minimale entre joueurs
TOWER_RADIUS: 95         // tours : rayon d'une zone à occuper
LINK_BREAK: 300          // lien : distance qui le rompt
JAIL_HP: 240             // cage, avant indexation sur la puissance de l'équipe
GAZE_TIME: 2.0           // regard : durée de la fenêtre
FEED_HEAL: 0.005         // soin par seconde et par rejeton, en part des PV max
TWIN_HEAL: 0.008         // soin mutuel des Jumeaux, à moins de 400 px
ULT_FILL / ULT_DRAIN     // 1/42 par seconde, 1/9 tours tenues
SLIP_ACCEL: 3.4          // sol glissant : plus c'est bas, plus ça patine

PUDDLE_MAX: 25           // flaques simultanées — plafond STRICT, la plus ancienne cède
PUDDLE_LIFE / DOT: 15 s / 20  // durée d'une mare et dégâts par seconde
CONE_R / CONE_SPREAD     // 640 px, demi-angle 0,40 rad (~23°)
PACMAN_R / PACMAN_SAFE   // 700 px, secteur épargné de 0,58 rad (~33°)
CROSSD_LIFE / DOT: 8 s / 26   // croix durable des Jumeaux
SHRINK_STEP / MIN: 0.13 / 0.45 // constriction : palier, puis plancher de l'arène
SHRINK_WARN: 2.6         // annonce d'un palier
CROWN_DPS: 60            // dégâts par seconde aux ennemis restés dans la couronne
QUAD_TIME / QUAD_THICK   // verrouillage : 20 s, murs de 26 px (3 joueurs minimum)
```

Et les réglages génériques des zones, dans `CFG` :

```js
ZONE_TICK: 0.25          // paliers de dégâts d'une zone persistante
ZONE_FORGIVE: 0.9        // rayon de collision / rayon affiché — écart ASSUMÉ
HUNT_CHASE: 165          // vitesse de poursuite de la traque (joueur : 260)
```

Le roster lui-même — verbes, seuils d'effectif, multiplicateurs de PV et
répertoires par barre — vit dans `BOSS_ROSTER`, et les seuils par mécanique dans
`MECHS`, tous deux **tableaux ordonnés dont l'index circule sur le réseau**.

Composition des vagues, dans `ENEMY_TYPES` : `from` (moment d'apparition),
`weight` (poids du tirage) et `share` (quota, en part du plafond).

## Limites connues

- `ws_lite.js` couvre le nécessaire, pas plus : **pas de TLS**, qui est le
  travail du proxy inverse. Il fait en revanche la compression
  (`permessage-deflate`) depuis le lot infra.
- L'évitement entre ennemis reste en O(n²). À 180 c'est négligeable ; au-delà de
  400, il faudrait une grille spatiale.
- Pas de reprise de partie : une coupure en pleine manche fait perdre la place
  dans la salle en cours. La **session**, elle, se reprend toute seule
  (`loginToken`) — on ne retape pas son mot de passe.
- Pas de récupération de mot de passe autonome : sans email, seul l'opérateur
  peut réinitialiser (`adminPassReset`). Assumé, documenté dans
  `LISEZMOI-BDD.md`.
- Les collisions sont testées par distance, sans balayage continu **en vol** :
  une balle très rapide pourrait traverser un ennemi très fin. Aux vitesses
  actuelles le cas ne se produit pas. Seule l'**apparition** est balayée en
  continu, parce que là le cas se produisait vraiment — voir la séparation
  ennemi/joueur.
- L'évitement ennemi/joueur est lui aussi en O(joueurs × ennemis), soit 800
  tests par image au pire. Négligeable à côté des 20 000 de l'évitement mutuel,
  et il tomberait avec la même grille spatiale.
- Les fragments passent **sous** le boss et les barres de vie depuis la bascule
  WebGL, là où le chemin canvas 2D les mettait au-dessus de tout. Les remonter
  demanderait un second contexte WebGL par-dessus la couche 2D supérieure — un
  canvas de plus à composer à chaque image pour quatre cents millisecondes
  d'effet derrière un boss.
- La bascule WebGL s'est arrêtée aux capacités qui servaient déjà à quelque
  chose : teinte, éclair, additif, particules. Restent ouvertes, dans l'ordre du
  rapport effet/effort — la passe de post-traitement (vignettage, aberration
  chromatique à l'impact, étalonnage par difficulté, flou directionnel pendant
  l'esquive), la distorsion du souffle des explosions, et l'échange de palette
  par texture de correspondance pour des variantes d'ennemis sans une seule
  image d'atlas de plus. L'éclairage dynamique est possible mais c'est un
  chantier à part entière, à ne pas embarquer dans la même migration.
