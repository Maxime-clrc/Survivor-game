# Survivor LAN — les deux armes qui n'existent pas

Ce document n'est pas un correctif : c'est **du plan 11 qui n'a jamais été
exécuté**. Le fusil de siège et le fusil de précision ont leur fiche dans la
spec, leur haut fait dans le code, leur ligne dans le tableau de coefficients —
et aucune existence dans le jeu.

C'est le chantier le plus lourd des douze, et le seul dont le contenu est déjà
entièrement conçu : il n'y a rien à trancher, seulement à écrire.

---

## 11 — Deux armes n'existent pas

### Le constat

Neuf hauts faits donnent une arme. Deux d'entre eux donnent une arme **absente
de la table `ARMES`** :

```
sur_le_terrain -> assaut       ok
au_contact     -> lame         ok
sans_faille    -> laser        ok
moisson        -> tesla        ok
economie       -> siege        ← ABSENT
longue_portee  -> precision    ← ABSENT
perce_ligne    -> railgun      ok
debout         -> dispersion   ok
demolisseur    -> grenade      ok
```

Le plan 11 annonçait **dix armes**. La table en contient **huit**. Le fusil de
siège et le fusil de précision ont leur fiche dans la spec, leur haut fait dans
le code, leur ligne dans le tableau de coefficients de la doc — et **aucune
existence dans le jeu**.

Ce qui se passe pour le joueur qui obtient « Économie » : le haut fait se valide,
l'écran annonce une arme débloquée, et l'offre de départ ne la propose jamais.
`armeAt("siege")` retombe silencieusement sur le tir standard (`armes.js`,
`ARME_BY_ID.get(id) ?? ARME_BY_ID.get(ARME_DEFAUT)`) — le repli qui devait
protéger d'un identifiant corrompu masque ici un manque.

### Pourquoi rien ne l'a signalé

`verifierHautsFaits()` valide les identifiants de **cadre** (contre `CADRES`), de
**carte** et de **relique** (contre les jeux d'ids qu'on lui passe). Il ne valide
**pas** ceux de type `arme` — le fichier n'importe même pas `armes.js`. Les deux
blocs de validation existants sont juste au-dessus, et le troisième n'a pas été
écrit.

C'est encore le fil rouge du plan 11, troisième variante : après la récompense
indexée et la famille déduite, **la récompense nommée qui ne pointe sur rien.**

```js
// hauts_faits.js — symetrique des deux blocs qui existent deja
if (armeIds) {
  for (const h of HAUTS_FAITS) {
    if (h.reward.type !== "arme") continue;
    for (const x of h.reward.ids) {
      if (!armeIds.has(x)) out.push(`${h.id} : arme « ${x} » inconnue`);
    }
  }
}
```

Et l'inverse, qui manque aussi : **toute arme autre que le tir standard doit être
donnée par exactement un haut fait.** Sans ce test, une arme ajoutée à `ARMES`
sans haut fait est jouable par personne, et personne ne le sait.

### Le travail réel

Les deux armes sont entièrement spécifiées au plan 11 (§1, §2, §4, §5). Il reste
à les écrire :

| | fusil de siège | fusil de précision |
|---|---|---|
| fiche | 0,70 s · 70 dégâts · portée ×1,2 | 0,55 s · 42 dégâts · portée ×2,2 |
| propre | chargeur 6, souffle 60 px, +10 % crit | +15 % crit, traverse 1 ennemi |
| coût | recharge 1,8 s | cadence lente |
| contrepartie | **bouclier ×3 pendant la recharge** | portée et crit de base |
| `ech` | 1,4 / 0,3 / 1,1 / 0,4 / 1,2 / 1,3 | 1,5 / 0,4 / 1,6 / 0,1 / 1,4 / 1,4 |
| famille | +2 chargeur · recharge −35 % · **dernier obus ×2** · recharge instantanée au kill | portée +25 % · +1 perforation · **×2,5 sur cible non touchée depuis 3 s** · le tir marque pour les alliés |

Avec les douze cartes du chantier 10, cela fait **vingt cartes de famille** à
écrire pour clore le plan 11 — pas douze.

Le chargeur du fusil de siège et le bouclier de recharge introduisent la seule
mécanique vraiment neuve des deux : un état d'arme à trois temps (tir, vide,
recharge) qui doit être lisible au HUD. Le terme `U` du chantier 07 en dépend
directement — c'est l'arme pour laquelle `armeMuet` a le plus de sens.

### Un défaut d'affichage, au passage

`nomsRecompense()` (`screens.js:1318`) n'a pas de branche pour `type: "arme"` :
elle traite cadre, relique et ligne, puis retombe sur `cardNom(id) || id`. Une
récompense d'arme s'affiche donc avec son **identifiant brut**. C'est visible sur
ta capture : *« arme débloquée : dispersion »* au lieu de « Fusil à dispersion »,
*« arme débloquée : grenade »* au lieu de « Lance-grenades ».

`armeNom` est déjà importé à la ligne 13 du fichier. C'est une branche à ajouter,
et les neuf lignes se lisent d'un coup.

### Le critère

`verifierHautsFaits(cardIds, relicIds, armeIds)` silencieux. Les dix armes dans
la table, les dix familles à quatre cartes, chaque arme donnée par exactement un
haut fait, et l'écran des hauts faits qui affiche dix noms d'armes en français.
