# Plan 36 — le Game Director

**Adossé à `decisions-2026-09-03.md` v7, section XV.**

Il arrive tard, et c'est voulu : sa mesure de tension a été livrée au plan 32 et
tracée depuis. **Quand ce plan démarre, il existe des dizaines de manches réelles
avec leur courbe.** Les six réglages se lisent sur des distributions observées au
lieu d'être devinés.

## Le cadre, en une phrase

> **Le script garde le budget, le Director choisit la forme.**

`verifierScript()` tient les sommes de pression par segment —
6,0 · 10,0 · 12,6 · 14,7 · 17,9 · 20,7 — et quatre plans de mesures reposent
dessus. Un Director qui choisirait librement son `rate` les invaliderait toutes.

Effet secondaire, et il est important : **« ne jamais punir un joueur qui joue
bien » est tenu par construction**, puisque le budget est une fonction du temps et
non de la puissance.

## Ce qui existe déjà, et qui est la moitié du travail

- `SCRIPT` — 6 segments × 5 battements, chacun portant `rate`, `geom` et `event`,
  en trois variantes ;
- `adaptEntry()` / `adaptMech()` / `adaptType()` — adaptation à l'effectif et au
  niveau, avec repli ;
- `_contexteBonus()` — lit **déjà** six grandeurs de contexte : PV manquants,
  densité, boss présent, joueurs à terre, et ce que les armes de l'équipe savent
  lire. C'est le modèle d'observation à copier ;
- `tensionMoy`, `tensionMax`, l'indice de survie et les trois compteurs de mémoire
  — livrés au plan 32.

## Les lots

```
01 la table de choix   liste FERMEE de ce qu il peut decider
02 les etats           ennui, normal, surcharge — et la regle de l isolement
03 calibration         les six reglages, lus sur les courbes du plan 32
```

## Ce qu'il ne fait jamais

- toucher au `rate`, aux points de vie, à la vitesse ;
- inventer une respiration — elles restent **écrites dans le script**, sinon il
  pourrait rendre une manche plus facile qu'écrite et le classement au temps
  cesserait de comparer deux courses identiques ;
- **venir au secours d'un groupe qui s'est isolé** ;
- se voir.
