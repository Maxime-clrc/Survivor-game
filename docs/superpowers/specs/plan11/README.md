# Survivor LAN — cartes, armes, hauts faits

Quatre plans, à exécuter dans l'ordre des numéros.

| # | plan | objet |
|---|---|---|
| **01** | [cartes](01-CARTES.md) | nettoyage du catalogue : familles manquantes, forme du pool, invocations |
| **02** | [armes](02-ARMES.md) | dix armes, coefficients d'échelle, familles par arme, identité visuelle et sonore |
| **03** | [hauts faits](03-HAUTS-FAITS.md) | les jalons deviennent des hauts faits et débloquent armes, cartes, lignes, reliques et cadres |
| **04** | [cadres](04-CADRES.md) | un cadre cesse d'être une couleur : cinq emplacements, trois paliers, un insigne par défi |

---

## L'ordre, et pourquoi

**01 d'abord.** Indépendant, il corrige l'existant et assainit le pool avant
qu'on y ajoute une trentaine de cartes d'arme.

**03 avant 02.** Les hauts faits suppriment le déblocage **par index de
tableau**. Ajouter sept armes avant reviendrait à casser les comptes existants,
puis à réparer.

**02 avant-dernier**, et par tranches : quatre armes d'abord (canon d'assaut,
laser, tesla, lame), soit 16 cartes de famille au lieu de 40.

**04 en dernier.** Purement cosmétique et sans dépendance : il refait le
matériau des cadres que 03 a créés. Le repousser ne bloque rien, et l'avancer
reviendrait à habiller un système qui n'existe pas encore.

---

## Le fil rouge technique

Le même piège traverse les trois plans :

> **Un déblocage indexé sur une position de tableau se casse dès qu'on ajoute un
> élément.**

`armes.filter((_, k) => k % 2 === 0)` et `legendairesDuBoss(i)` dépendent de la
position dans `CARDS`. Passer de 3 à 10 armes décale la parité et
**reverrouille des cartes chez tous les comptes existants**.

Le plan 03 le supprime définitivement en passant à des récompenses **nommées** —
`reward: { type: "arme", id: "laser" }`.

---

## Les trois principes

**Cartes — la structure existe, elle n'a jamais été étendue.** 139 cartes, 21
dans une famille. Tout axe qui a une famille est propre, tout axe qui n'en a pas
est en doublon. La correction est de créer les six familles manquantes, pas de
supprimer des cartes.

**Armes — la variété ne vient pas du projectile.** Elle vient de ce que l'arme
exige du corps et de l'attention : le mouvement, la ressource, la visée, la
distance. Et aucune arme n'ajoute une entrée ou un geste — c'est l'arme qui se
comporte autrement, pas le joueur qui apprend une manipulation.

**Hauts faits — ils ouvrent des portes, ils ne donnent pas de puissance.** Les
noyaux sont une courbe, les hauts faits sont des marches ; une puissance qui
arrive par marches crée des falaises. Une arme débloquée doit encore être choisie
et jouée, une ligne coûte toujours des noyaux, un cadre ne change rien.

---

## Ce qui reste à mesurer

Les seuils des hauts faits sont **provisoires**. Le volume réel est de
~5 000 apparitions par manche complète en solo, et trois compteurs n'ont aucune
donnée : la part de kills à courte et longue portée, les kills par explosion sans
build de zone, et le ratio kills/tirs médian. Méthode d'étalonnage en section 6
du plan 03.
