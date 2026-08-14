# Lot C — la diversité spatiale

**Le seul échec structurel de l'audit.** Les six boss sont des monstres qui se
déplacent. Le verbe les différencie sur le papier ; l'espace, non — et c'est
l'espace que le joueur ressent.

## Le principe

> Ce qui différencie deux boss, ce n'est pas leur silhouette ni leur liste
> d'attaques, c'est **la façon dont ils déforment l'arène**.

Six archétypes, un par boss. **Au plus un garde « mobile ».**

| boss | archétype | ce que ça fait à l'espace |
|---|---|---|
| **Oracle** | **ancré** | l'arène devient asymétrique — il occupe un bord |
| **Ravageur** | **constricteur** | l'espace disponible diminue et ne revient pas |
| **Matriarche** | **diffus** | la horde est son corps |
| **Jumeaux** | **multiple** | l'équipe doit se diviser dans l'espace |
| **Métronome** | **mobile** | l'espace se déplace avec lui |
| *Amalgame* | **fixe** | l'espace est neutre, tout est dans la lecture du sol |

## C-1 · Oracle → ancré

**La transformation la moins coûteuse et la plus payante du plan.**

L'Oracle s'encastre dans un bord de l'arène, tiré au sort à l'apparition. Il ne
se déplace plus.

Pourquoi lui : **aucune de ses mécaniques n'a besoin qu'il bouge.**
`rassemblement`, `dispersion`, `tours`, `dénombrement`, `regard` se jouent sur le
sol et entre les joueurs. On gagne un archétype sans réécrire une mécanique.

Ce que ça change pour le joueur : un côté de l'arène devient dangereux en
permanence, l'autre est un refuge. La distance à l'Oracle devient un arbitrage
constant — proche pour le DPS, loin pour la sécurité — là où un boss mobile
impose sa distance.

**Deux bras destructibles** à ajouter, un de chaque côté. Chacun balaye un
couloir depuis le bord. Casser les deux ouvre une fenêtre de vulnérabilité sur le
noyau. C'est la seule addition mécanique du lot, et elle donne une **priorité de
cible**, ce qui manque au jeu.

## C-2 · Ravageur → constricteur

Il l'est déjà à moitié : `SHRINK_STEP: 0.13`, `SHRINK_MIN: 0.45`, `CROWN_DPS: 60`.

**Promotion de mécanique à identité :** la constriction cesse d'être une attaque
ponctuelle et devient l'**état permanent** du combat. À chaque rupture de barre,
l'arène perd un cran et **ne le récupère pas**. Au plancher (`SHRINK_MIN: 0.45`),
il reste 45 % de la surface pour la dernière phase.

C'est un soft-enrage entièrement spatial, sans compte à rebours : il punit la
lenteur en supprimant l'espace, ce qui est bien plus lisible qu'un multiplicateur
de dégâts.

⚠ **Interaction avec le plan 6 :** l'arène qui se referme à densité constante
augmente la pression réelle. À mesurer avec `_enemyCap()`, et la couronne doit
repousser les ennemis hors de la zone morte plutôt que de les y tuer — sinon la
constriction devient un outil de nettoyage gratuit.

## C-3 · Matriarche → diffus

Elle a déjà les rejetons et le `lien nourricier` (`FEED_HEAL: 0.005`).

**La pousser jusqu'au bout :** elle se soigne de **toute la horde** proche, pas
seulement de ses rejetons. Tant que la foule l'entoure, elle est presque
insensible. Le combat devient : nettoyer autour d'elle pour ouvrir une fenêtre.

C'est le seul boss qui **utilise la horde comme mécanique** au lieu de la subir —
donc le plus spécifique à ton genre, impossible dans un survivor solo classique.
Et il valorise directement les builds de zone.

## C-4 · Jumeaux → multiple, renforcé

L'archétype est acquis, il est sous-exprimé. Deux changements :

- **les liens sont visibles en permanence**, pas seulement pendant `MECH_LINK`.
  Le joueur doit voir *pourquoi* il faut les séparer, sans qu'on le lui dise ;
- **le soin mutuel passe au premier plan** : `TWIN_HEAL: 0.008` est aujourd'hui
  imperceptible. Le monter, et l'afficher — une barre qui remonte visiblement
  quand les jumeaux sont proches.

Le rendu de lien du plan 7 (arc à double couche, [15]-[19]) sert exactement ici.

## C-5 · Métronome → mobile, assumé

Il garde l'archétype et devient le seul à l'avoir. Rien à changer côté espace ;
tout son travail est dans le lot B (métronome visuel).

## C-6 · Amalgame → fixe

Le final se téléporte au lieu de marcher. L'espace est neutre : tout est dans la
lecture du sol. C'est l'archétype « examen », cohérent avec son verbe *synthèse*
et ses 8 barres.

## Critères d'acceptation

1. Un joueur qui voit dix secondes de combat **identifie le boss sans lire son
   nom**, uniquement à la façon dont l'arène se comporte.
2. Aucun archétype n'est partagé par deux boss du pool.
3. La transformation de l'Oracle **ne modifie aucune de ses mécaniques
   existantes** — si elle en casse une, c'est que le mauvais boss a été choisi.
4. Le Ravageur au plancher de constriction reste **jouable** à quatre joueurs à
   densité de plafond (renvoi lot A du plan 6).
