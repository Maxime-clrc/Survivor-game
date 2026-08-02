# Lot 5 — Correctifs issus du jeu

Quatre points relevés en partie. Les deux premiers sont des bugs avec une cause
racine identifiée dans le code, les deux suivants sont des manques d'interface.

---

## 1. L'ennemi collé est intouchable

### Le symptôme

Un petit ennemi rapide se colle au joueur et devient impossible à toucher.
Constaté en solo, sur un combat de boss.

### La cause racine

Deux faits du code se combinent :

**a. Les balles apparaissent en dehors du joueur.**

```js
// _fire(), shared/game_state.js
x: p.x + dx * (CFG.PLAYER_RADIUS + 2),   // 16 px du centre
y: p.y + dy * (CFG.PLAYER_RADIUS + 2),
```

**b. Rien n'empêche un ennemi de chevaucher un joueur.** `ENEMY_SEPARATION`
n'est utilisé que dans la boucle ennemi contre ennemi. Il n'existe **aucune
séparation ennemi / joueur** : un runner peut se placer exactement sur le centre
du joueur.

Conséquence arithmétique. Un runner a un rayon de 9, une balle de 4, donc la
collision se produit à 13 px. Si le centre du runner est à moins de 3 px du
centre du joueur, la balle naît à 16 px — **déjà au-delà de lui** — puis
s'éloigne. Elle ne peut plus jamais le toucher.

Il existe donc une **zone morte de 16 px de rayon autour du joueur** dans
laquelle un ennemi est strictement invulnérable à son porteur.

En équipe, un allié le tue depuis l'extérieur et le bug passe inaperçu. En solo,
il n'y a personne d'autre — d'où la reproduction systématique en solo.

### Les correctifs

**a. Séparation ennemi / joueur.** Le correctif principal, et c'est aussi le
bon choix de conception : un monstre ne devrait pas se superposer au joueur.
Même traitement que la séparation entre ennemis, appliqué avec `r_ennemi +
PLAYER_RADIUS` comme distance minimale.

Cela rend aussi les dégâts de contact bien plus lisibles : on voit le monstre
qui frappe au lieu de le voir disparaître sous soi.

Constante dédiée, `PLAYER_SEPARATION`, plutôt que réutiliser
`ENEMY_SEPARATION` : la force de répulsion contre un joueur doit pouvoir être
réglée séparément, sinon on obtient soit des monstres qui glissent sans
toucher, soit un joueur qu'on peut pousser à travers l'arène.

**b. Test de collision à l'apparition.** Filet de sécurité pour tout ce qui
franchirait quand même la zone morte : à la création d'une balle, tester le
segment allant du centre du joueur au point d'apparition, et enregistrer la
touche immédiatement.

C'est aussi la bonne correction pour les balles rapides en général — le plan v2
notait déjà l'absence de balayage continu comme limite connue. Ce cas la rend
concrète.

**c. Ne pas toucher à la vitesse.** L'observation était juste : le problème
n'est pas qu'il aille vite, c'est qu'il devienne invulnérable. Une fois la
séparation en place, un ennemi rapide au contact redevient une menace normale.

### Vérification

Test dédié : placer un runner exactement sur le joueur, tirer, vérifier qu'il
meurt. Le faire aussi à 5, 10 et 15 px du centre — les trois cas de la zone
morte.

---

## 2. Les dégâts sur les ennemis ne sont pas toujours visibles

### Ce qui existe

- Les chiffres de dégâts sont **réservés au boss** (`dmgFloat`, plafonné à 24).
- Le flash de touche sur les ennemis existe, mais il est **déduit de la
  variation de PV entre deux images interpolées**.

### Le défaut structurel

Les snapshots partent à 20 Hz. Entre deux snapshots il s'écoule 50 ms, pendant
lesquelles un joueur à cadence élevée place **deux à quatre balles** sur la même
cible. Le client ne voit qu'une seule variation de PV : il affiche **un** flash
pour trois touches.

Pire : un ennemi tué entre deux snapshots ne montre jamais de PV intermédiaires.
Il disparaît. **Le coup fatal ne produit aucun retour visuel** — or c'est
précisément le plus satisfaisant.

Le retour d'impact déduit d'un différentiel de PV échantillonné à 20 Hz est
donc structurellement lacunaire. Aucun réglage côté client ne le corrigera.

### Le correctif

**Transmettre un compteur de touches par ennemi.** Un octet qui s'incrémente à
chaque appel de `_damage()` et repasse à zéro après 255.

```
e: [id, x, y, hp, maxHp, type, ang, ..., hitSeq]
```

Le client compare au compteur précédent et sait **exactement** combien de
touches ont eu lieu, y compris quand elles se produisent entre deux snapshots,
y compris la dernière avant la mort.

- **Le flash** se déclenche sur le compteur, donc il devient exact.
- **Le nombre** reste dérivé de la variation de PV, donc agrégé — ce qui est de
  toute façon le comportement voulu (agrégation sur 200 ms, plan v2).
- **Le coup fatal** utilise les PV restants du snapshot précédent comme montant.

Coût : un nombre de plus par ennemi et par snapshot, soit environ 8 % du poids
au pire cas. Acceptable au regard du gain.

### Et l'extension à tous les ennemis

Le plan v2 la prévoit déjà, avec ses trois garde-fous — agrégation sur 200 ms,
plafond de 40, seuil à 5 % des PV max de la cible. Ce lot ajoute simplement la
source fiable qui manquait.

---

## 3. Consulter les builds en fin de manche

### Le manque

L'écran de bilan affiche les cartes de chacun en pastilles, mais elles ne sont
pas cliquables. Impossible d'analyser ce qu'ont pris les autres — alors que
c'est exactement le moment où l'on veut comprendre pourquoi quelqu'un a fait
trois fois plus de dégâts.

### Ce qu'il faut

**Une fenêtre de détail par joueur**, ouverte au clic sur sa ligne du tableau.

Contenu :

- **Toutes ses cartes**, groupées par rareté décroissante, avec leur cumul.
- **La description complète** de chaque carte, telle qu'elle apparaissait au
  tirage — donc en mètres, avec les valeurs effectives (lot 1).
- **Sa classe** et les deux compétences associées.
- **Ses statistiques finales** : dégâts totaux, kills, morts, score, et les
  multiplicateurs effectifs qui en découlent (dégâts, cadence, PV max).

Cette dernière ligne est la plus intéressante : voir « ×2,4 dégâts, ×1,8
cadence » explique le tableau des scores bien mieux que la liste des cartes.

**Navigation** : flèches gauche et droite pour passer d'un joueur à l'autre sans
refermer, `Échap` pour fermer. Accessible aussi depuis le salon, pour consulter
la manche précédente.

### Une extension qui coûte peu

Rendre la même fenêtre accessible **pendant la partie** via la touche Tab, sur
soi et sur les alliés. Le panneau d'inventaire du lot 1 en est déjà la moitié :
il suffit d'ajouter la sélection du joueur.

---

## 4. Menu pause

### La contrainte

Le serveur est autoritaire et simule en continu. **Une pause n'a de sens que
s'il n'y a qu'un seul joueur** — sinon un joueur figerait la partie des autres.

### Le comportement

**En solo** — `Échap` met réellement la simulation en pause. Le serveur cesse
d'appeler `step()`, continue de diffuser des snapshots pour que l'affichage
reste vivant, et affiche un voile.

**À plusieurs** — `Échap` ouvre le même panneau, mais **la partie continue**.
Le panneau est translucide et le jeu reste visible derrière. Un libellé
explicite dit pourquoi : « la partie continue — pause indisponible à plusieurs ».

### Contenu du panneau

- Reprendre.
- Volume et coupure du son (réglages du lot audio).
- Consulter son build — réutilise la fenêtre du point 3.
- Quitter la manche, avec confirmation.

### Points de vigilance

**Le serveur valide.** Une demande de pause reçue alors que plusieurs clients
sont connectés est ignorée. Ne jamais se fier au client sur ce point : c'est
exactement le type de message qu'un client modifié enverrait pour figer une
partie à quatre.

**Pause automatiquement levée** au bout de 5 minutes, ou si un second joueur se
connecte. Sans cela, un solo en pause laisse le serveur bloqué indéfiniment et
personne ne peut le rejoindre — c'est le même piège que la manche qui ne se
terminait jamais quand tout le monde quittait.

**Les recharges et les états** ne doivent pas s'écouler pendant la pause. Comme
ils vivent dans `p.timers` et `p.statuses` et non dans `p.mods`, il suffit de ne
pas appeler `step()` — mais le vérifier explicitement, car une pause qui rend
les recharges gratuites serait une faille.

---

## 5. Mesures et critères

| point | critère |
|---|---|
| ennemi collé | un runner placé à 0, 5, 10 et 15 px du centre du joueur meurt sous son tir |
| séparation | aucun ennemi ne chevauche un joueur de plus de 2 px après résolution |
| retour d'impact | trois balles placées en 50 ms produisent trois flashes |
| coup fatal | toute mort d'ennemi produit un flash et un nombre |
| poids du snapshot | hausse inférieure à 10 % au pire cas |
| fenêtre de build | ouvrable depuis le bilan, le salon et en jeu |
| pause | ignorée par le serveur dès qu'un second client est connecté |
| pause | levée automatiquement après 5 minutes |
