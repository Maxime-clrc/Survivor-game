# Lot 1 — retours de combat

Vingt-trois items, regroupés par **ordre d'écriture** et non par ordre de
sélection. Les numéros entre crochets renvoient au catalogue d'origine.

---

## L1-0 · Prérequis : enrichir les événements en MAGNITUDE

Le défaut de fond, et il est commun aux explosions et aux critiques : **le client
est informé de ce qui arrive, jamais de combien.**

```js
out.push({ t: "explosion", x: zz.x, y: zz.y, r: zz.r, shape: zz.shape ?? 0 });
```

Position, rayon, forme. Une grenade qui fauche trente ennemis produit exactement
la même image et le même son qu'une grenade dans le vide. Aucune mise à l'échelle
n'est possible côté client tant que ce champ n'existe pas.

**[8] Intensité de l'explosion.** Ajouter le nombre de tués (ou la somme des
dégâts) à l'événement. **Prérequis strict de [2], [9], [10] et [11]** : sans lui,
toutes les couches suivantes sont dessinées à taille fixe.

**[26a] État de touche critique sur la horde.** `crit` ne part aujourd'hui sur le
réseau que pour les **boss** (cumul dans `bossDmg`), et sous forme agrégée. La
horde n'en transporte rien.

Deux voies, à trancher à l'écriture :

- **(a) drapeau d'état sur l'ennemi dans l'instantané** — deux bits (aucune
  touche / touche / touche critique), lus par le client qui anime. Les ennemis
  sont déjà sérialisés à chaque instantané, le surcoût est marginal ;
- **(b) événement par touche** — à 600 ennemis et des dizaines de touches par
  seconde, c'est un flux à part entière. À éviter.

**(a) est la voie recommandée.** C'est la seule question technique ouverte du
lot.

---

## L1-1 · Explosions — composer par couches

**Le principe :** chaque couche a sa **propre constante de temps**. Si tout
s'estompe sur la même courbe, ça reste un élément d'interface, quelle que soit la
qualité du sprite.

**[7] Vérifier le mélange additif.** Une explosion en alpha classique est un
disque gris ; en additif, c'est de la lumière. `BLEND_ADD` existe déjà — c'est
peut-être une ligne. **À faire en premier** : la réponse change l'ampleur du
reste du travail.

**[12] Cuire quatre sprites dans l'atlas procédural** : dégradé radial doux,
anneau, bouffée de fumée, éclat de débris. **Prérequis de [9].**

**[9] La composition.**

| couche | mélange | durée | comportement |
|---|---|---|---|
| noyau | additif | **2 images** | blanc pur, petit |
| boule de feu | additif | ~150 ms | 2-3 quads superposés, blanc→jaune→orange, croissance en ease-out |
| onde de choc | additif | ~250 ms | anneau fin |
| débris | normal | ~600 ms | 6-12 quads, vitesse radiale + traînée + rotation propre |
| fumée | normal | ~1,2 s | 3-5 gros quads très transparents, dérive lente |
| marque au sol | normal | ~2 s | sous tout le reste, s'efface lentement |

Toutes les durées et tailles sont mises à l'échelle par l'intensité de **[8]**.

**[10] Le noyau ne grandit pas.** L'explosion naît à sa taille maximale ; la
montée progressive est ce qui fait « animation » plutôt que « détonation ».
Rotation aléatoire sur chaque quad, et 2-3 boules superposées légèrement
décalées — un cercle parfait se lit comme de l'interface, une forme irrégulière
se lit comme de la matière.

**[11] L'onde de choc grandit plus vite que la boule.** C'est de **dépasser** le
remplissage qui la fait lire comme un souffle. Si elle reste dedans, elle
disparaît.

**[13] Le recul.** ⚠ *Touche la simulation.* Impulsion radiale sur tout ce qui
est dans le rayon, décroissante avec la distance, appliquée aussi aux survivants.

En vue de dessus, il n'y a ni gerbe ni caméra sur un visage : **ce qui lit la
puissance, c'est la matière qui bouge.** Quinze ennemis chassés vers l'extérieur,
ça se voit ; quinze ennemis qui disparaissent, non.

La grille spatiale rend la requête par rayon quasi gratuite et le système de
séparation résout déjà les chevauchements — c'est le bon moment pour l'écrire.

*Conséquence de jeu à assumer :* la bombe devient un outil de **positionnement**,
elle ouvre un trou pour fuir. Cela dialogue avec la doctrine de fuite du lot B du
plan 6 et rend les cartes de bombe plus fortes. À signaler à l'équilibrage, pas à
empêcher.

**[14] Suppression locale d'apparition (~1 s) après une grosse explosion.**
⚠ *Touche la simulation.* Le trou dans la foule **est** la récompense. À 622
ennemis et aux débits que le lot A rend opérants, il se comble instantanément et
la détonation n'a plus aucune conséquence visible.

---

## L1-2 · Arcs électriques

**[15] Tracé par déplacement de point milieu.** Segment A→B, milieu déplacé
perpendiculairement d'un aléa, récursion sur les deux moitiés. 3 à 4 niveaux,
**amplitude décroissante à chaque niveau** — sinon c'est du bruit et non un arc.

**[16] Double couche additive.** Un cœur blanc fin, plus un halo coloré 3 à 4
fois plus large à faible alpha. **C'est ce doublage qui fait la différence**
entre « une ligne bleue » et « de l'électricité » : la surexposition au centre
est la signature de tout ce qui est très lumineux.

**[17] Une ou deux branches mortes** par arc, plus fines et plus sombres, qui ne
mènent nulle part. Signal le plus fort de la section : un arc sans branche
ressemble à un laser.

**[18] Régénération entre 15 et 20 Hz**, pas par image — à 60 Hz c'est un
scintillement illisible. Ajouter des coupures irrégulières : un arc continu
paraît statique.

**[19] Point brillant fixe aux deux extrémités**, pour ancrer l'arc sur ce qu'il
relie.

---

## L1-3 · Audio

**[1] Échelle de tonalité sur les kills en chaîne.** *Palier 1.* Chaque kill dans
une fenêtre de ~0,4 s monte d'un demi-ton, plafonné à une octave, retour au sol
quand la chaîne casse.

L'audio est **synthétisé** : la hauteur est un paramètre gratuit, et `admit` gère
déjà la polyphonie. **Meilleur rapport impact/coût de tout le lot** — c'est la
réponse au palier 1 : le retour n'est pas sur la mort, il est sur la **cadence
des morts**.

**[2] Explosion en trois couches.** *Palier 2-3.* Un transitoire claquant et bref
(haut), un corps de bruit filtré à décroissance rapide (médium), un sub — sinus
qui balaie vers le grave sur ~200 ms. Les trois à l'oscillateur, aucun
échantillon. Hauteur et gravité mises à l'échelle par **[8]**.

**[3] Canalisation de récolte.** *Palier 2.* Hauteur qui monte pendant la
canalisation, accord de libération à la fin. C'est par construction de la tension
puis du relâchement — le schéma le plus satisfaisant qui existe, et il n'a
aujourd'hui presque aucun retour. Le lot F du plan 6 rend les éclats rares, donc
chaque récolte compte davantage.

---

## L1-4 · Coopératif

L'axe que personne dans le genre n'exploite — Vampire Survivors, Halls of Torment
et Megabonk sont solo.

**[20] Pouls simultané sur les quatre écrans à la montée de niveau.** *Palier 3.*
La jauge d'XP **est déjà commune** : la montée de niveau est un événement
d'équipe que rien ne célèbre comme tel. Un pouls visuel et sonore synchronisé
transforme un menu en moment partagé, et rend visible ce que le design fait déjà.

**[21] Relèvement d'un allié.** *Palier 3.* Le moment le plus tendu du jeu
mérite le plus gros budget : flash, son grave, et invulnérabilité brève et
**visible**. Rend aussi désirables les six cartes coopératives du lot E.

**[22] Flash de touche teinté aux couleurs de l'allié** qui tue. *Palier 0.* On
voit ce que font les autres sans quitter son propre écran.

⚠ Contrainte : `setFlashColor` est un **uniforme global**. Une couleur par joueur
impose de grouper les dessins par teinte — un lot par couleur, soit au plus
quatre vidages supplémentaires par image. Acceptable, mais à concevoir dès le
départ plutôt qu'à rattraper.

---

## L1-5 · Divers

**[4] Flux d'XP visuel.** *Palier 1.* À la mort, un filet de particules part du
cadavre vers le joueur et se fond dans la jauge. **Aucune entité, aucune logique
de ramassage, aucun changement de jeu** — l'XP reste instantanée.

L'aspiration des gemmes est probablement la mécanique la plus satisfaisante du
genre et elle manque totalement ; des orbes ramassables à 622 ennemis seraient
intenables côté perf. Cette version donne l'essentiel du ressenti pour une
fraction du coût, et rend le partage d'équipe lisible pour la première fois.

**[6] Hitstop 80-120 ms, réservé aux barres de boss.** *Palier 3.* Jamais sur une
touche ni un kill normal : dans un survivor, la fluidité du déplacement **est**
le gameplay. Cinq barres × six boss = trente moments par manche, chacun mérité.
C'est le seul endroit où le vocabulaire des jeux de combat se transpose tel quel.

---

## L1-6 · Coups critiques

*Palier 2.* Les critiques sont fréquents — une build investie en critique en
produit plusieurs par seconde. Le retour doit donc être **différencié sans être
fort** : la règle est **couleur et hauteur, jamais taille et volume**.

C'est aussi une question de lisibilité de build : les lignes méta `precision` et
`letalite` et les cartes de critique existent, et rien ne fait **sentir** cet
investissement.

**[26a] Prérequis réseau** — voir L1-0.

**[26b] Flash de teinte distincte** sur la cible. Même contrainte d'uniforme
global que **[22]** : les ennemis touchés en critique se dessinent en second lot.
Les deux items partagent donc la même refonte du groupement par teinte — **à
écrire une seule fois, pour les deux.**

**[26c] Coup de zoom sur le sprite touché** : ×1,15 pendant 2-3 images, retour
élastique. Lisible instantanément, ne coûte rien, et **remplace en partie le
screen shake écarté** — la réponse est portée par la cible plutôt que par la
caméra, ce qui est plus lisible dans une foule.

**[26d] Transitoire audio aigu** superposé au son de touche normal, sans
augmenter le volume. Se combine à l'échelle de tonalité de **[1]** au lieu de la
concurrencer.

**[26e] Deux ou trois éclats nets** projetés dans l'axe du tir — des éclats, pas
un disque : la forme doit dire « perforation » et non « explosion ».

**[26f] Le critique qui TUE** monte au palier 3 : version amplifiée, avec un
fragment de l'onde de choc de **[11]**.

---

## L1-7 · Boss — le retour de touche manquant

**Constat : tirer sur un boss ne produit aujourd'hui aucun retour.** Ce n'est pas
un réglage trop discret, c'est un canal absent, et la cause est structurelle.

`sprites.js` l'écrit : *« Le boss n'y est pas : il est unique à l'écran, son coût
est négligeable, et il gagne à être animé en continu au tracé. »* Le boss est
dessiné par `render/boss.js` au tracé procédural, **hors de l'atlas batché**.

Or le flash blanc de touche vit dans cet atlas — c'est le `flashAtlas`, vers
lequel le paramètre `flash` de `r.quad()` interpole. Un ennemi de horde flashe
donc à chaque impact ; **le boss n'a aucun équivalent**.

Le choix de rendu était bon — l'animation continue donne des boss bien plus
expressifs — mais il a coûté le retour de touche sans que ça se voie.

**[27] Flash de touche pour le boss.** *Palier 2.* Exposer dans le tracé
procédural l'équivalent du `flash` : une passe de silhouette claire par-dessus la
forme, décroissance ~80 ms.

La brique existe déjà — `render/boss.js` dessine un contour `flash: 1` un cran
plus grand **sous** le sprite (ligne ~903). Il s'agit de la rejouer **par-dessus**,
brièvement, à la touche. **C'est le correctif principal de la section.**

**[28] Point d'impact pour tous les boss.** *Prérequis de [29] et [31].* Le champ
existe déjà dans le tuple `bossDmg` (`mine[3]`/`mine[4]`) et le client sait le
lire — mais le serveur ne le remplit **que pour les Jumeaux**, avec repli sur le
centre du boss pour les cinq autres.

Conséquence : sur un adversaire de grande taille, chiffres et étincelles naissent
au centre, jamais là où la balle a touché. Le retour est déconnecté de l'action.
Remplir le champ systématiquement est un petit changement serveur pour un gros
effet.

**[29] Étincelle d'impact au point de contact.** *Palier 2.* Deux ou trois éclats
additifs dans l'axe du tir — **mêmes sprites que [26e]** pour les critiques,
aucun nouvel asset à cuire.

**[30] Rendre la progression lisible.** *Palier 2.* Le problème de fond des boss :
une balle retire une fraction infime de la barre.

À moitié résolu déjà — `hud.js` note *« avançait si lentement qu'on ne voyait plus
ses dégâts ; découpée, chaque… »*, d'où les cinq barres. Il reste le mouvement :
une barre qui glisse en continu ne se voit pas. **Un résidu clair qui rattrape**
— le segment perdu reste affiché en teinte claire puis se résorbe sur ~300 ms —
rend chaque salve visible.

**[31] Chiffres de dégâts sur les boss, ACTIVÉS PAR DÉFAUT.** *Palier 3.*

Le système existe déjà et est câblé : `hudDamage`, éléments DOM plafonnés à 40,
événement `"degats"` portant le drapeau critique. Il ne manquait que le point
d'impact de **[28]**.

C'est le seul endroit du jeu où les chiffres sont pleinement justifiés — un
adversaire unique, un palier 3, aucun risque de mur de texte. Ils restent
**interdits sur la horde** (item 24, écarté) : à 600 ennemis, ce serait
illisible.

*Trois précisions d'écriture :*

- le drapeau `crit` du tuple dit « ce paquet contient un critique », pas « ce coup
  en était un » — le chiffre doit donc porter une teinte distincte sans prétendre
  qualifier une touche précise ;
- le plafond de 40 éléments DOM est le garde-fou : à quatre joueurs sur un boss,
  il mordra. Prévoir la **fusion des chiffres proches** plutôt que d'en perdre au
  hasard ;
- `hudDamage` rejette déjà les positions hors cadre de vue — comportement correct
  à conserver, un chiffre poussé contre le bord mentirait sur le lieu de l'impact.

### Dépendances de la section

```
[28] point d'impact (serveur)   ← prérequis de [29] et [31]
[27] flash du boss              ⟂ indépendant, à faire en premier
[29] étincelle                  ← [28] + sprites de [26e]
[30] barre à résidu             ⟂ indépendant, HUD seul
[31] chiffres                   ← [28]
```

Tout est client sauf **[28]**, qui est un champ déjà prévu à remplir. **Aucune
interaction avec le plan 6.**

---

## Ordre d'écriture

```
L1-0  magnitude réseau [8][26a]        ← prérequis strict du reste
  │
  ├─ [7] vérifier l'additif            ← une ligne, à faire avant tout chiffrage
  ├─ [12] sprites d'atlas              ← prérequis de [9]
  │
  ├─ L1-1 explosions [9][10][11]       ← client
  │    └─ [13][14]                     ⚠ simulation — voir la note
  ├─ L1-2 arcs [15..19]                ⟂ client, totalement indépendant
  ├─ L1-3 audio [1][2][3]              ⟂ client, [2] dépend de [8]
  ├─ L1-4 coop [20][21]                ⟂ client
  ├─ groupement par teinte             ← [22] et [26b] ensemble
  │    └─ L1-6 critiques [26c..f]
  │
  └─ L1-7 boss
       ├─ [27] flash du boss            ← le correctif principal, indépendant
       ├─ [28] point d'impact           ← serveur, prérequis de [29] et [31]
       ├─ [30] barre à résidu           ⟂ HUD seul
       └─ [29][31]                      ← après [28]
```

**[1] en premier si tu veux un résultat en une heure** : c'est le meilleur
rapport du lot et il ne dépend de rien.

**[13] et [14] sont les deux seuls items qui touchent la simulation**, donc les
deux seuls qui interagissent avec le plan 6. Ils bénéficient tous deux de la
grille spatiale, mais ils modifient l'équilibrage (bombes plus fortes, densité
locale). **À écrire après le lot A du plan 6**, ou à mesurer avec lui.

---

## Critères d'acceptation

1. **Aucun retour de palier 0 ou 1 ne devient individuellement audible.** Mesure :
   nombre de sons déclenchés par seconde à la minute 25 à plafond plein — le taux
   de rejet de `admit` ne doit pas augmenter par rapport à l'existant.
2. **Une explosion qui tue 30 ennemis est distinguable à l'aveugle** d'une qui en
   tue 3, au son seul. C'est le critère qui valide [8].
3. **Un joueur sait qu'il vient de faire un critique sans regarder de chiffre**,
   dans une foule de 400 ennemis.
4. **Le hitstop ne se déclenche jamais hors barre de boss.** Vérifiable par
   compteur : au plus 30 déclenchements par manche complète.
5. **Aucune régression d'images par seconde** à plafond plein après [9] et [13] —
   les couches de particules sont plafonnées comme le reste.
6. **Une salve sur un boss produit un retour visible sans regarder la barre** :
   flash, étincelle au point de contact et chiffre sortent tous les trois de la
   zone effectivement touchée.
7. **Le plafond de 40 chiffres ne mord pas** à quatre joueurs sur un boss — la
   fusion des chiffres proches est en place avant que la limite soit atteinte.
