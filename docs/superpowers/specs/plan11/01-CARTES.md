# Lot 01 — nettoyage du catalogue

**139 cartes. 21 seulement appartiennent à une famille — soit 15 %.**

Et le constat est net : **tout axe qui a une famille est propre, tout axe qui
n'en a pas est en doublon.** Ce n'est donc pas une accumulation de petites
erreurs, c'est un système de progression qui n'a jamais été étendu au-delà de
cinq axes.

| axe | cartes | hors famille | verdict |
|---|---|---|---|
| dégâts % | 3 | 0 | propre — 1/4 → 4/4 |
| vitesse de déplacement | 2 | 0 | propre |
| intervalle de tir | 5 | 1 | *Ressort de détente* est l'orphelin |
| recharge des compétences | 4 | **4** | ❌ |
| portée | 3 | **3** | ❌ |
| bouclier | 3 | **3** | ❌ |
| critique | 2 | **2** | ❌ |
| brûlure | 2 | **2** | ❌ |
| exécution | 2 | **2** | ❌ |
| dégâts subis | 3 | 2 | ❌ |

---

## 01-A · Créer les six familles manquantes

**La correction n'est pas de supprimer des cartes, c'est de créer les familles.**
Les doublons deviennent alors des paliers, et rien n'est perdu.

| nouvelle famille | 1/4 | 2/4 | 3/4 | 4/4 |
|---|---|---|---|---|
| **recharge** | Condensateur −7 % | Surtension −15 % | Flux continu −25 % | *à écrire* |
| **portée** | Canon long +25 % | Chargeur long | *à écrire* | *à écrire* |
| **bouclier** | Réserve 12 pts | Bouclier régénérant 30 | *à écrire* | Pacte de fer |
| **critique** | Précision +6 % | Mire +12 % | Œil de faucon | Sentence capitale |
| **brûlure** | Braises 3 dég. | Munitions incendiaires 8 | *à écrire* | *à écrire* |
| **exécution** | *à écrire* | Achèvement 12 % | Moisson 20 % | *à écrire* |

Sept cartes à écrire pour combler les trous de ces échelles. **`Rodage` fusionne
dans la famille recharge ou disparaît** — il fait doublon avec `Condensateur` à
deux points près.

**`Ressort de détente` rejoint la famille cadence ou disparaît.** C'est ton
exemple, et c'est le cas le plus net du catalogue : −8 % contre −7 % pour
`Culasse allégée`, à un palier près.

⚠ **Contrainte de tirage à préserver :** jamais deux paliers de la même famille
dans une même offre. La règle existe déjà, elle s'appliquera mécaniquement aux
nouvelles.

---

## 01-B · La forme du pool est inversée

C'est probablement la cause principale de la sensation de répétition, **avant
même les doublons**.

| rareté | cartes | poids de tirage | conséquence |
|---|---|---|---|
| commune | **28** | 60 | on voit les mêmes en boucle |
| rare | 48 | 28 | correct |
| épique | **44** | 10 | on ne voit presque jamais une épique donnée |
| légendaire | 18 | 1 | correct pour une légendaire |

Deux corrections, complémentaires :

- **rééquilibrer le pool** vers ~45 communes et ~25 épiques. Une partie des
  épiques actuelles sont en réalité des rares déguisées ;
- **retirer une commune du pool une fois son maximum atteint**, pour libérer la
  place plutôt que de la proposer en vain.

---

## 01-C · Les invocations décrochent — c'est structurel

`orbiteurs` (épique, 2 lames à 25 dégâts) exige `surcharge_orbitale` (rare, qui
elle-même **exige** orbiteurs) pour être viable : **trois cartes pour une seule
idée**.

Mais le vrai défaut est ailleurs : les dégâts orbitaux ont leur **propre
multiplicateur** et ne profitent donc pas de ce que le joueur investit ailleurs.
Son tir principal fait ×4 sur la manche ; ses lames restent à 25.

> **Toute source de dégâts qui ne bénéficie pas des cartes de dégâts est
> condamnée à devenir inutile.**

Ça touche un axe entier : `orbiteurs`, `essaim`, `drone`, `tourelleAppui`,
`pulsar`, `ondeMort`.

**Deux options, à trancher :**

- **(a)** les brancher sur `damageMul` — simple, mais elles suivent alors la
  build principale et perdent leur identité de source indépendante ;
- **(b)** les indexer sur la **minute**, comme les PV de horde et de boss depuis
  les plans précédents — cohérent avec la doctrine du dépôt, mais elles cessent
  de récompenser l'investissement.

**Recommandation : (a), avec un coefficient réduit** (0,6 de `damageMul`). Elles
suivent la progression sans la dominer, et `surcharge_orbitale` redevient un
bonus au lieu d'un correctif obligatoire.

---

## Critères d'acceptation

1. Aucun axe du catalogue n'a deux cartes de même effet **hors famille**.
2. Le nombre de communes est **au moins 1,5×** celui des épiques.
3. Une lame orbitale prise à la minute 5 fait encore **plus de 15 %** des dégâts
   du joueur à la minute 25.
4. Aucune carte du catalogue n'exige deux autres cartes pour être fonctionnelle.
