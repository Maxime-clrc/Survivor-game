# Lot C — Troisième compétence par classe

Une carte accorde une troisième compétence, propre à la classe, déclinée en
raretés. Dépend du lot B.

---

## C1. Le principe

Aujourd'hui chaque classe a deux compétences fixes, toujours les mêmes. La
troisième est **une décision de build** : elle n'existe que si on tire la carte,
et sa rareté détermine sa puissance.

C'est le seul endroit du jeu où une carte change ce que tu **fais**, et pas
seulement tes nombres. Ça rend l'écran de cartes nettement plus intéressant à
partir de la vague où elle peut sortir.

## C2. Contrainte à traiter dès la conception

Une troisième compétence demande **une touche et un emplacement de HUD** de
plus. À prévoir maintenant, sinon ça se greffe mal :

- Touche **3**, alias **clic milieu**.
- Une troisième pastille dans le bloc personnel, **grisée et barrée** tant que
  la carte n'est pas obtenue — le joueur voit que l'emplacement existe, ce qui
  rend la carte désirable avant même de la connaître.
- Protocole : un troisième drapeau ponctuel `s3`, **remis à zéro après chaque
  tick** comme `d`, `s1` et `s2`. Le bug du drapeau persistant est documenté
  dans `CLAUDE.md`, ne pas le refaire.

## C3. Les compétences

Une par classe, avec trois paliers de rareté. Le palier ne change pas la nature
de la compétence, seulement son ampleur — sinon on ne peut pas apprendre à
jouer avec.

### Rempart — Ancre

Plante une ancre au sol. Tous les ennemis dans le rayon sont **ralentis à 40 %**
et ne peuvent pas s'éloigner de plus du double du rayon tant qu'elle tient.

C'est du contrôle de foule pur, ce qui manque totalement au jeu : aujourd'hui on
ne peut que subir la horde ou la fuir, jamais la contenir.

| rareté | rayon | durée | recharge |
|---|---|---|---|
| rare | 6 m | 4 s | 26 s |
| épique | 8 m | 5,5 s | 22 s |
| légendaire | 10 m | 7 s | 18 s, et les ennemis retenus subissent Vulnérabilité |

### Soigneur — Sanctuaire

Pose un dôme immobile. À l'intérieur : **soin continu**, et les projectiles
ennemis qui entrent sont **détruits**.

Le second effet est le plus important — c'est la seule réponse du jeu à la
saturation de projectiles pendant un combat de boss, et ça donne au soigneur un
rôle qui n'est pas du rattrapage.

| rareté | rayon | durée | soin/s | recharge |
|---|---|---|---|---|
| rare | 5 m | 5 s | 8 | 30 s |
| épique | 6,5 m | 7 s | 12 | 26 s |
| légendaire | 8 m | 9 s | 16 | 22 s, et purge un état à l'entrée |

### Tireur — Salve

Verrouille jusqu'à N ennemis dans un cône puis tire une volée simultanée sur
chacun. Dégâts réduits par cible, mais **le verrouillage ignore les obstacles**
et touche à coup sûr.

C'est la réponse aux tireurs qui se tiennent à distance et aux ennemis qui
tournent derrière — la faiblesse structurelle de la visée manuelle.

| rareté | cibles | dégâts par cible | recharge |
|---|---|---|---|
| rare | 4 | 60 % | 20 s |
| épique | 6 | 75 % | 17 s |
| légendaire | 8 | 90 % | 14 s, et les cibles marquées subissent +20 % de dégâts pendant 4 s |

## C4. Règles de tirage

- **Un seul exemplaire** : une fois la troisième compétence obtenue, les autres
  paliers sortent du pool. Pas de cumul.
- **Filtrée par classe** : le champ `cls` existe déjà sur les cartes de classe.
- **Pas avant la vague 4.** Obtenue trop tôt, elle écrase tout le reste de la
  build ; et le joueur n'a pas encore assimilé ses deux premières compétences.
- Elle compte comme **carte de la famille `competence`** pour l'affichage du
  rang dans la build (lot A6).

## C5. Interaction avec le reste

**Avec `areaMul` (lot B)** : les trois compétences ont un rayon, donc elles en
bénéficient. C'est voulu — ça donne une raison de plus de prendre les cartes de
zone.

**Avec la réduction de recharge (lot B)** : idem, et c'est ce qui rend la
version rare de chaque compétence viable face à la légendaire.

**Avec l'arbre de progression (lot D)** : les arbres ne doivent **pas** contenir
d'amélioration de la troisième compétence. Elle est déjà conditionnée à un
tirage ; y ajouter une dépendance méta rendrait son absence doublement
frustrante.

## C6. Mesures et critères

| mesure | attendu |
|---|---|
| taux d'obtention sur une partie complète | 40 à 60 % |
| écart de survie avec / sans troisième compétence | inférieur à une vague |
| taux d'utilisation une fois obtenue | plus de 80 % des recharges consommées |

Le deuxième point est le garde-fou : si l'écart dépasse une vague, la carte
n'est plus un choix mais une obligation, et il faut réduire les paliers plutôt
que la fréquence.

Critères d'acceptation :

- L'emplacement vide est visible dès le début de la partie.
- `s3` ne se relance jamais seul après sa recharge.
- Deux paliers de la même compétence ne sont jamais proposés ensemble.
- La compétence n'apparaît jamais avant la vague 4.
