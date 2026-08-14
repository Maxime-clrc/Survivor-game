# Survivor LAN — plans à exécuter

État du dépôt au **14 août** : le **plan 6 est entièrement exécuté** (lots A à H
vérifiés dans le code : `MAX_ENEMIES_BASE: 220`, `ENEMY_HP_MIN_RAMP: 7`,
`XP_MINUTE_GROWTH: 1.055`, `BOSS_HP_MINUTE_RAMP: 0.055`, 24 reliques,
`BUY_PER_VISIT: 1`, `TRONC_COSTS`, `SECOURS_COSTS`, filtres `requires` /
`minPlayers`). Rien à y reprendre.

Ce dossier contient la suite : **neuf lots, à exécuter dans l'ordre des
numéros.**

| # | lot | objet | portée |
|---|---|---|---|
| **01** | [correctifs](01-CORRECTIFS.md) | zoom aux bords, drones invisibles, flaque de feu, rampe de bouclier | client + sim |
| **02** | [boss — la banque](02-BOSS-A-banque.md) | **le correctif de gameplay majeur** | sim |
| **03** | [ressenti L1](03-RESSENTI-L1.md) | retours de combat, dont le retour de touche des boss | client |
| **04** | [ressenti L3](04-RESSENTI-L3-vfx.md) | flash trop blanc, effets muets, arc électrique | client |
| **05** | [boss — lisibilité](05-BOSS-B-lisibilite.md) | grammaire visuelle, annonces, shader de télégraphes | client |
| **06** | [boss — archétypes](06-BOSS-C-archetypes.md) | diversité spatiale des cinq boss | sim |
| **07** | [boss — difficulté](07-BOSS-D-difficulte.md) | échelle par difficulté et effectif | sim |
| **08** | [boss — nouveaux](08-BOSS-E-nouveaux.md) | 3 boss de plus, 1 final par difficulté | sim |
| **09** | [soigneur](09-SOIGNEUR-L2.md) | refonte du soin en lien continu | sim |

**[REF-audit-boss.md](REF-audit-boss.md)** — l'audit des cinq boss existants,
document de référence, ne s'exécute pas.

---

## Pourquoi cet ordre

**01 d'abord** parce que deux de ces bugs fausseraient les mesures des lots
suivants, et parce qu'ils sont petits.

**02 avant tout le reste du chantier boss.** C'est la racine : la banque de
dégâts annule le verrouillage des phases, ce qui produit **à la fois** « ils
meurent trop vite » et « pendant la transition on ne fait plus de dégâts ». Tant
qu'elle est là, les couches `unlock[2]` et `unlock[3]` de chaque boss ne se
jouent jamais — **le contenu existe et personne ne le voit.**

**03 et 04 juste après**, parce que le lot 02 a besoin d'un bouclier de palier
visible (pilier P2) et que le retour de touche des boss vit dans le lot 03
(items [27] à [31]). Le lot 04 fournit au passage les briques de tracé et de son
que le lot 05 réutilise.

**05 avant 06.** La grammaire visuelle doit être figée avant de toucher aux
archétypes : sinon on réécrit des boss dont les télégraphes changeront ensuite.

**08 en dernier du chantier boss.** Écrire de nouveaux boss avant d'avoir la
grammaire (05) et les archétypes (06) reviendrait à produire du contenu à
réécrire.

**09 en dernier.** Il déplace l'équilibre entre classes et se mesure avec le lot
I du plan 6, qui n'a pas encore été mesuré.

---

## Les sept piliers

**P1 · La durée d'un combat est fixée par ses mécaniques, pas par ses PV.**
Cinq barres = cinq phases. Le DPS excédentaire est **perdu**.

**P2 · Aucune invulnérabilité invisible.** Toute fenêtre où les dégâts ne
comptent pas porte un bouclier visuel.

**P3 · La réponse se lit dans le télégraphe, pas dans le texte.** La grammaire
ne change jamais d'un boss à l'autre.

**P4 · L'échec est d'abord individuel.** Individuel en calme, collectif assumé
en cauchemar. Un débutant qui rate doit mourir *lui*, pas faire perdre la soirée
à trois autres.

**P5 · Trois mécaniques marquantes par boss, pas dix.** La difficulté naît de la
combinaison.

**P6 · Chaque boss déforme l'arène différemment.** Le seul pilier que le dépôt
ne tient pas aujourd'hui : les six boss sont mobiles.

**P7 · Aucune information uniquement sonore.** L'audio est un canal redondant,
jamais exclusif.

---

## Ce que le relevé a corrigé de mes hypothèses

Je pensais le système de boss pauvre. Il compte **31 mécaniques**, dont
`MECH_GAZE` (« NE VISEZ PLUS le boss ») que je proposais comme une nouveauté.
Chaque boss a un **verbe** de conception, `adaptMech(id, alive)` et
`towerCount(alive)` gèrent déjà l'effectif, et l'Amalgame occupe correctement ses
paliers via `_deferAtk` — c'est le modèle que le lot 02 généralise.

**Le contenu est là. Le plan sert à le rendre visible.**

---

## La seule valeur à trancher après mesure

`BAR_DWELL: 10` n'a jamais été éprouvé, puisque la banque le rendait sans effet.
Une fois le lot 02 passé, il devient le **régulateur principal** de la durée d'un
combat. À garder tel quel pour la première mesure, et à revoir en premier si les
combats s'étirent au-delà de la fourchette 50-90 s.
