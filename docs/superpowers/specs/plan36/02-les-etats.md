# 02 · Ennui, normal, surcharge

## La table

| état | signal | réponse, à budget CONSTANT |
|---|---|---|
| **ennui** | `tensionMoy` bas depuis longtemps | composition plus dure, une élite de plus, géométrie plus exigeante (`pince` plutôt que `bords`), un contrat proposé |
| **normal** | entre les seuils | ce que le script prévoyait |
| **surcharge** | `tensionMax` très haut | arrivée d'un seul côté, moins d'élites, composition plus simple — **et jamais moins d'ennemis** |
| **respiration** | après un pic | ce que le script prévoyait **déjà** |

## Deux agrégats, et pourquoi pas un

C'est l'écart assumé avec Left 4 Dead, et il vient d'une mesure faite sur ce jeu :
à 3 600 px de séparation, un joueur voit 137 corps pendant que l'autre en voit 36,
et le sens change avec la graine.

- **`tensionMax`** dit « trop haut » — un joueur qui se noie est une tension même
  si les trois autres s'ennuient ;
- **`tensionMoy`** dit « trop bas » — l'ennui est un état collectif.

Deux seuils, deux réponses, **jamais les deux en même temps**.

## La règle qui rend la boucle coop réelle

> **Le Director ne vient PAS au secours d'un groupe qui s'est isolé.**

Sans elle, tout le lot 04 du plan 31 est annulé : le joueur isolé a une tension
élevée, le Director la lit comme une surcharge, et il **adoucit** la composition —
exactement l'inverse de l'effet voulu.

La distinction est de nature morale plutôt que technique :

> **Une équipe en difficulté est un accident. Un joueur qui s'isole est une
> décision.**

Le Director soulage le premier et pas le second. Aucune contradiction avec « ne
jamais punir un joueur qui joue bien » : on ne lui ajoute rien, on s'abstient de
lui retirer ce qu'il a choisi d'affronter.

Concrètement : l'état **surcharge** ne s'applique qu'aux groupes de deux joueurs
ou plus, ou aux équipes non séparées.

*Cas limite, à trancher en écrivant* : un joueur seul **parce que les trois autres
sont morts** n'a rien choisi. Le test est probablement « effectif vivant de
l'équipe », pas « effectif du groupe ».

Le plan 31 lot 04 a laissé la composition des groupes lisible depuis l'état,
précisément pour que ce test soit possible ici.

## Ce que « ennui » ne doit jamais faire

Épuiser d'abord les leviers de **forme** — composition plus dure, plus d'élites,
géométrie plus exigeante — avant tout levier de **quantité**. Le budget ne bouge
pas ; c'est ce qui garantit qu'une équipe forte reçoit une manche plus
intéressante et non une manche plus longue.

## Il ne se voit pas

Comme Left 4 Dead. Le joueur doit sentir que la manche a un rythme, pas qu'un
système répond à ses statistiques. Aucune annonce, aucun retour visuel.

**Le critère qui en découle est inconfortable et il est juste** : si un test
aveugle ne distingue pas une manche avec Director d'une manche sans, c'est que la
mesure de tension est mal réglée — pas que le Director est inutile.

## Critère d'acceptation

1. Sur une manche où un joueur s'isole, le Director **n'entre pas** en surcharge
   pour lui. Test direct, avec le banc de séparation du plan 31.
2. Sur une manche où toute l'équipe est en difficulté, il y entre.
3. Aucun état ne modifie le `rate` — vérifié par `verifierDirector()`.
4. Les respirations tombent aux mêmes battements qu'avant.

## Nature de la tâche

Conception, avec un jugement moral au milieu. **Fil principal.**
