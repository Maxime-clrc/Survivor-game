# Lot D — Progression permanente

Le lot le plus structurant. Il change la façon dont tout le reste se mesure.

Dépend du lot B : l'arbre du Tireur consomme le système de critique.

---

## D1. Le principe, et pourquoi il tient en coopératif

Le risque classique d'une progression permanente en coopératif est l'écart : un
vétéran trivialise la partie, ou un débutant devient un poids mort.

Trois mécanismes le contiennent :

**a. La puissance méta est bornée par construction.** On débloque
définitivement, mais on n'équipe que N points par partie. Le maximum est connu,
donc mesurable.

**b. Elle est exclue de `_teamPower()`.** Les cartes restent absorbées par la
difficulté, la méta non — c'est ce qui fait qu'on se sent réellement plus fort
au lieu de courir sur un tapis roulant.

**c. Les gains de première fois compriment l'écart.** Un débutant progresse vite,
un vétéran a des rendements décroissants.

## D2. La monnaie

**Nom** : les **noyaux**, extraits des créatures. Cohérent avec la direction
— l'arène est une machine, les monstres sont ce qui s'y est introduit.

### Comment on en gagne

**Jamais sur les kills individuels.** Le soigneur tue peu par construction : le
faire payer sur ce critère reproduirait exactement la spirale qu'on a supprimée
en passant l'expérience en jauge d'équipe.

| source | montant |
|---|---|
| par vague atteinte | 4 × numéro de vague |
| boss vaincu | 120 |
| première fois vague 5 / 10 / 15 / 20 | 200 / 400 / 800 / 1500 |
| première victoire sur chaque boss | 300 |
| difficulté | ×1 calme, ×1,35 normal, ×1,8 cauchemar |

**Versé à parts égales à tous les participants**, y compris ceux qui étaient à
terre à la fin. Un joueur qui rejoint en cours de manche touche au prorata des
vagues qu'il a jouées.

### Ordre de grandeur visé

- Une partie moyenne : 250 à 500 noyaux.
- Premier palier d'une amélioration : 150.
- Arbre d'une classe entièrement débloqué : environ 40 parties.

## D3. Les emplacements

**On débloque définitivement, on équipe partiellement.**

```
SLOTS_BASE: 3
SLOTS_MAX: 6
SLOTS_STEP: 1 tous les 12 paliers achetes dans la classe
```

- **Propres à chaque classe** : la build du tank ne concurrence pas celle du
  tireur.
- **Réattribution libre au salon**, gratuite, entre deux manches.
- Chaque palier acheté coûte **1 emplacement** à équiper, quel que soit son
  niveau.

C'est ce qui distingue ce système d'une simple échelle : après cent parties, la
décision existe toujours, et deux tanks peuvent être joués différemment.

## D4. Les trois arbres

Principe : **chaque arbre renforce ce que la classe fait déjà**, il ne comble
pas ses faiblesses. Un tank qui achète des dégâts devient un mauvais tireur ; un
tank qui achète de la protection d'équipe devient un meilleur tank.

Cinq paliers par ligne, coût croissant : 150, 260, 420, 650, 1000.

### Rempart — absorber et protéger

| ligne | par palier | au palier 5 |
|---|---|---|
| Constitution | +6 % de PV max | +30 % |
| Alliage | −2 % de dégâts subis | −10 % |
| Ancrage | +8 % de rayon et de durée du rempart | +40 % |
| Défi | −1 s de recharge de provocation | −5 s |
| Épines | renvoie 4 % des dégâts subis dans 4 m | 20 % |
| Garde | les alliés à moins de 6 m subissent −2 % de dégâts | −10 % |

### Soigneur — soutenir

| ligne | par palier | au palier 5 |
|---|---|---|
| Vitalité | +4 % de PV max | +20 % |
| Flux | +7 % de soins prodigués | +35 % |
| Portée | +8 % de portée et de vitesse du faisceau | +40 % |
| Relève | +10 % de vitesse de réanimation, +4 PV au relevé | +50 %, +20 PV |
| Osmose | 4 % des soins prodigués reviennent en PV | 20 % |
| Catalyse | la cible soignée gagne +3 % de dégâts pendant 3 s | +15 % |

**Catalyse est la ligne la plus importante de tout le lot.** Elle rend le
soigneur offensif *indirectement*, ce qui est le seul moyen de le rendre
désirable sans en faire un tireur. Sans elle, personne ne joue soigneur en
dehors d'une soirée à quatre.

### Tireur — tuer vite

| ligne | par palier | au palier 5 |
|---|---|---|
| Calibre | +4 % de dégâts | +20 % |
| Précision | +2 % de chance critique | +10 % |
| Létalité | +8 % de dégâts critiques | +40 % |
| Munitions | +6 % de vitesse et de portée des balles | +30 % |
| Charge | −0,6 s de recharge de bombe, +5 % de rayon | −3 s, +25 % |
| Surchauffe | +0,5 s de durée de surcharge | +2,5 s |

### Le tronc de confort, commun aux trois classes

Non-puissance, coût fixe, **ne consomme pas d'emplacement** :

| amélioration | effet | coût |
|---|---|---|
| Relance | une relance de tirage de carte par partie | 800 |
| Quatrième offre | quatre cartes proposées au lieu de trois | 1500 |
| Ravitaillement initial | un bonus au sol à la vague 1 | 600 |

## D5. Le déblocage de cartes

**Par jalons, pas par monnaie.** Si les deux puisaient dans la même bourse, tout
le monde achèterait de la puissance d'abord et ne verrait jamais les nouvelles
cartes.

Ce qui est verrouillé au départ : **les légendaires, les armes de remplacement
et les cartes conditionnelles**. Ce qui reste accessible : tout le socle.

Effet secondaire précieux : **un nouveau joueur découvre un pool plus simple**.
Aujourd'hui les 77 cartes arrivent d'un coup, dont des armes qui changent
entièrement le fonctionnement du tir. C'est de l'onboarding sans écrire une
ligne de tutoriel.

Exemples de jalons : atteindre la vague 8, vaincre chacun des cinq boss, tuer
500 ennemis avec une classe, terminer une partie sans être mis à terre.

## D6. La persistance

### Emplacement et format

Un seul fichier côté serveur, `data/progress.json`, écrit par le processus qui
sert déjà le jeu.

```json
{
  "version": 1,
  "players": {
    "<identifiant>": {
      "name": "Max",
      "cores": 340,
      "runs": 12,
      "best": { "wave": 14, "score": 8200 },
      "milestones": ["wave8", "boss_ravageur"],
      "unlockedCards": ["meute", "singularite"],
      "classes": {
        "tank": { "tiers": { "constitution": 3, "epines": 1 }, "equipped": ["constitution", "epines"] }
      }
    }
  }
}
```

### Trois risques à traiter dès la première ligne

**Le versionnage.** Le champ `version` dès la première écriture, et une
migration explicite. Sans ça, le premier changement de format efface la
progression de tout le monde.

**L'écriture atomique.** Écrire dans `progress.json.tmp` puis renommer. Une
coupure en pleine écriture sur le fichier unique, et c'est toute la progression
du groupe qui part. Le renommage est atomique sur tous les systèmes de fichiers
courants.

**Le pseudo n'est pas une identité.** N'importe qui peut taper le tien. La
parade peu coûteuse : un identifiant tiré au sort à la première connexion,
stocké dans le `localStorage` du client et envoyé au `join`. Le pseudo n'est
plus qu'un affichage. Un joueur qui change de navigateur repart de zéro — c'est
acceptable en réseau local, et il faut le dire dans le `LISEZMOI` plutôt que de
le laisser découvrir.

### Fréquence d'écriture

À la fin de chaque manche, et à la déconnexion d'un joueur. **Jamais pendant une
vague** : une écriture disque synchrone dans la boucle de simulation
produirait un à-coup visible.

### Validation serveur

Tout achat et toute réattribution d'emplacement passent par le serveur, qui
vérifie le solde, le palier précédent et le nombre d'emplacements. Le client
n'écrit jamais rien : c'est exactement le genre de message qu'un client modifié
enverrait.

## D7. Ce que ça change pour les mesures

**Une mesure sans profil de compte ne veut plus rien dire.** Toutes les
campagnes devront préciser deux références :

- **compte neuf** — aucune amélioration, aucune carte déverrouillée ;
- **compte maximal** — tous les emplacements remplis.

L'écart entre les deux devient une métrique en soi.

| mesure | attendu |
|---|---|
| écart de vague atteinte entre compte neuf et compte maximal | **inférieur à 1,5 vague** |
| noyaux gagnés par partie moyenne | 250 à 500 |
| parties pour compléter un arbre | 35 à 45 |
| écart de progression entre soigneur et tireur sur 10 parties | inférieur à 10 % |

Si l'écart neuf/maximal dépasse 1,5 vague, **réduire le nombre d'emplacements**
plutôt que les valeurs individuelles : c'est le seul levier qui ne casse pas
l'équilibre relatif des lignes entre elles.

## D8. Critères d'acceptation

- Un fichier corrompu ou absent ne bloque pas le démarrage du serveur : on
  repart d'un fichier neuf en journalisant l'incident.
- Un joueur peut réattribuer ses emplacements entre deux manches, jamais
  pendant.
- La monnaie gagnée est identique pour tous les participants d'une manche.
- Aucune amélioration méta n'entre dans `_teamPower()`.
- Le soigneur gagne autant de noyaux que le tireur sur une même partie.
- Les cartes verrouillées n'apparaissent jamais dans un tirage.
