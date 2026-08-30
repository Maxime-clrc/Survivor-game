# 06 · Carte de surchauffe / déclenchement manuel (brief §9)

Traité comme hypothèse à analyser, pas comme fonctionnalité validée — c'est
la formulation du brief, et la conclusion de cette analyse la confirme :
**prototype avant implémentation définitive**, mais avec un point de départ
chiffré plutôt qu'un pari.

## 1 · Ce que le code fait déjà (confirme et précise l'observation du brief)

- Le tir est géré en boucle serveur autoritaire : `p.fireCd` décompte,
  `_shoot(p)` se déclenche quand `fireCd <= 0 && tirAutorise && armeMuet <= 0`
  (`shared/game_state.js:1439-1441`). Aucune entrée de tir n'existe
  aujourd'hui dans le message client → serveur (`public/input.js` transmet
  mouvement, visée, compétences, pas de commande de tir).
- Le laser a **déjà** un système de chaleur générique et networké :
  `ARME_CFG.CHALEUR_MONTEE`, `CHALEUR_MONTEE_VIDE`, `CHALEUR_CHUTE`,
  `CHALEUR_MUET`, `CHALEUR_BONUS` (`shared/armes.js:27-34`), appliqué à
  toute arme portant `chaleur: true` (`shared/game_state.js:1592-1645`) : la
  chaleur monte à la touche, moins vite à vide, retombe hors tir, un palier
  déclenche un mutisme temporaire (`armeMuet`), et un bonus de dégâts
  s'applique proportionnellement à la chaleur courante.
- Un champ `mods.noOverheat` existe déjà dans la structure de mods
  (`shared/game_state.js:1786`), et la carte légendaire `chaine_assaut`
  retire explicitement « la surchauffe » en contrepartie de −40 %
  d'intervalle (`shared/cards.js`, voir `05-audit-cartes-reliques.md` §2.A).
  **Une carte de surchauffe manuelle sur Tir standard doit interagir
  proprement avec `chaine_assaut` et avec toute relique de chaleur — ne pas
  supposer que ce sont les seules interactions déjà présentes.**

**Conséquence directe pour l'implémentation :** ce chantier ajoute (a) une
commande de tir dans le message client→serveur, (b) le flag `chaleur: true`
conditionnel sur Tir standard porté par la carte, (c) rien de nouveau côté
moteur de chaleur — c'est le système du laser, réutilisé.

## 2 · Simulation livrée (brief §9.2, obligatoire avant de proposer des valeurs)

Script complet dans l'archive : `sim/surchauffe2.mjs`. Modèle : Tir standard
(interval 0,16 s, 12 dégâts → **DPS de base 75**), chaleur calquée sur celle
du laser (mêmes constantes de montée/chute/mutisme), bonus de dégâts en
hypothèse de départ à +55 % en pleine jauge (à comparer au +25 % du laser —
volontairement plus haut ici car le tir est discret, pas continu).

Cinq profils simulés sur 2 minutes :

| profil | DPS | vs base | surchauffes | % temps chaleur ≥ 0,8 | % temps verrouillé |
|---|---|---|---|---|---|
| **sans carte (auto)** | 75,0 | — | — | — | — |
| joueur parfait (seuil strict 0,90) | 72,3 | **−3,6 %** | 0 | 96,8 % | 0 % |
| bon joueur (seuil 0,85, bruit léger) | 71,4 | −4,8 % | 0 | 96,7 % | 0 % |
| joueur moyen (seuil 0,70, bruit, 15 % de clics ratés) | 68,1 | −9,2 % | 0 | 36,5 % | 0 % |
| bourrinage (clic permanent, ignore la jauge) | 67,5 | −10,0 % | 28 | 34,6 % | 35,0 % |
| joueur timide (seuil 0,40, sous-exploite) | 58,7 | −21,7 % | 0 | 0 % | 0 % |

### Lecture

- **Avec ces valeurs de départ, la carte ne remplit pas encore le principe
  d'équilibrage demandé par le brief** (« le meilleur joueur doit obtenir une
  récompense nette ») : même un joueur parfait reste légèrement **sous** le
  DPS auto (−3,6 %). La carte serait un choix strictement pire que de ne pas
  la prendre pour un joueur au sommet de sa forme.
- L'écart parfait/moyen (+6,2 %) et parfait/bourrinage (+7,1 %) est en
  revanche dans une fourchette saine : assez pour récompenser la maîtrise
  sans rendre le mauvais jeu punitif au point d'être inutilisable.
- Le bourrinage n'est pas catastrophique dans ce modèle (−10 % vs base,
  35 % de temps verrouillé) : la pénalité de surchauffe telle que modélisée
  ici est clémente. À comparer/discuter avec le ressenti du laser en jeu
  réel avant de la copier telle quelle.

### Recommandation de tuning (point de départ pour le prototype, pas une valeur finale)

Remonter `DMG_BONUS_AT_MAX` de +55 % vers **+70-75 %** pour que le joueur
parfait dépasse la base d'environ +5-8 %, en conservant l'écart
parfait/moyen actuel (le modèle montre que cet écart bouge peu avec ce
paramètre, car il dépend surtout du taux de duty-cycle, pas du bonus final).
**Le script est structuré pour tester ce paramètre en une ligne** — le
rejouer avec plusieurs valeurs avant de figer un chiffre en jeu réel.

### Limites explicites du modèle (à ne pas oublier en le citant)

- Ne modélise pas la différence boss (cible stable, viser est facile) vs
  horde (viser/se déplacer est difficile) demandée par le brief §9.2 — le
  modèle actuel est identique pour les deux cas, ce qui **sous-estime**
  l'avantage réel en combat de boss et **surestime** la performance en
  horde. À affiner avec un modèle de raté de clic dépendant du contexte
  avant validation finale.
- Ne modélise pas les interactions avec les cartes de cadence, critique,
  incendiaire etc. listées par le brief §9.2 — nécessite le prototype en
  jeu, pas un modèle isolé.
- Le taux de raté de clic (5 %/15 % selon profil) est une hypothèse de
  design, pas une mesure de joueurs réels — à valider en playtest.

## 3 · Rareté suggérée

Compte tenu du fait qu'elle modifie le contrôle fondamental de l'arme
(question posée par le brief) et que la simulation montre un plafond de
performance modeste (~+5-8 % de DPS pour un joueur parfait, avec les
ajustements recommandés) mais un vrai risque de perte pour un joueur moyen
(−9 % dans le modèle) : **rareté épique**, pas légendaire — l'effet est
qualitatif (nouvelle façon de jouer) plus que quantitatif, ce qui correspond
au registre des épiques déjà présentes dans le catalogue (`05-audit-cartes-reliques.md`).

## 4 · Étapes d'implémentation (une fois le prototype validé)

1. Ajouter une commande de tir optionnelle au message client→serveur
   (`public/input.js` → protocole réseau), désactivée par défaut (tir auto
   inchangé pour toute arme sans la carte).
2. Card `apply(m)` : bascule `tirAutorise` en mode manuel + `chaleur: true`
   sur Tir standard uniquement quand la carte est possédée.
3. Réutiliser `ARME_CFG.CHALEUR_*` et la logique de `shared/game_state.js:1592-1645`
   sans dupliquer — paramétrer par arme si les constantes doivent différer
   du laser (probable, vu la simulation).
4. Vérifier l'interaction avec `chaine_assaut` (`noOverheat`) et les
   reliques de chaleur existantes.
5. Prototype jouable → mesure réelle avec `?banc` (DPS boss vs horde,
   1-4 joueurs) avant de figer les constantes.

## Fichiers concernés

- `public/input.js`, protocole réseau (nouvelle commande)
- `shared/armes.js` (constantes de chaleur, éventuellement par arme)
- `shared/game_state.js` (application, déjà générique)
- `shared/cards.js` (nouvelle carte)
- `docs/regles/RESEAU.md`, `docs/regles/CONTENU.md` (documenter)
