# Survivor LAN — plan 22 : le banc à l'écran

Les plans 20 et 21 ont fermé tout ce qu'un banc **sans écran** peut fermer.
Quatre protocoles de `LISEZMOI.md` restent ouverts, et ils ont tous la même
raison de l'être : **ils se jugent à l'œil**. Aucune simulation ne dit si une
arme est reconnaissable, si un faisceau se voit sur un plancher clair, ou si le
retour à 200 corps est spectaculaire plutôt que bruyant.

Ce plan livre d'abord **l'outil qui les rend faisables**, puis les mesures.

---

## 1 · Pourquoi ils étaient bloqués

| protocole | ce qu'il demandait, et qu'on n'avait pas |
|---|---|
| comparer les dix armes | changer d'arme sans relancer dix manches |
| le test du nom masqué | **cacher** tout ce qui nomme l'arme |
| le retour à 50 / 100 / 150 / 200 corps | choisir la densité au lieu de l'attendre |
| le contraste sur les quatre sols | déjà faisable (`BIOME=…`), mais pas avec les deux ci-dessus |

---

## 2 · Les lots

| lot | version | contenu | critère |
|---|---|---|---|
| **1** | 0.25.0 | **Le banc.** `BANC=1` côté serveur, `?banc` côté client : les dix armes sous les chiffres, la densité sous les crochets, le HUD sous `H`. | hors banc, pas un octet du jeu ne change |
| **2** | 0.25.1 | **Le coût à l'écran.** FPS, `draws`, `quads`, particules et voix par palier `gfx`, à quatre densités. | chiffres dans `LISEZMOI.md` |
| **3** | 0.25.**4** | **Le test du nom masqué.** Dix armes, HUD coupé, verdict par arme. | toute arme non reconnue = un défaut nommé |
| **4** | 0.25.**5** | **Le contraste par lieu.** Faisceau sur la Nébuleuse, souffles sur la Fonderie, balistique sur la Friche, tesla sur l'Usine. | aucun retour perdu dans son sol |

`0.25.2` a été pris par un correctif du lot 2 — le p95 ratait la pointe qu'il
cherchait — et `0.25.3` par les mesures du lot 2 lui-même. La correspondance
lettre → chiffre s'écrit, elle ne se calcule pas.

Les lots 2 à 4 **produisent des mesures et, s'il le faut, des correctifs** ; ils
ne sont pas écrits d'avance, parce qu'un lot de correction dont on connaîtrait le
contenu avant d'avoir regardé serait un lot inventé.

---

## 3 · Ce que le banc n'est pas

- **Ni un mode de jeu, ni une triche.** Les deux moitiés sont nécessaires :
  sans `BANC=1` sur le serveur, `?banc` n'obtient rien.
- **Ni un second chemin d'apparition.** Le remplissage passe par `_spawnEnemy`,
  donc il voit les obstacles, les quotas de type et l'adaptation au niveau.
  Le plafond est **masqué** sur l'instance, donc `_enemyCap()` reste le point de
  passage unique.
- **Ni un écran de plus.** Aucune vue, aucun bouton : des touches et une
  étiquette, qui disparaît avec le HUD — le test du nom masqué exige que **tout**
  ce qui nomme l'arme se taise.
