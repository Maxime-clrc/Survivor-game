# Survivor LAN — plan 30 : audit mesuré et chantiers

Adossé à des **mesures rejouées sur le dépôt v0.31.8**. Plusieurs résultats
contredisent des prémisses des briefs — signalés comme tels, avec le protocole
pour les rejouer.

Scripts : `sim/pop5.mjs` (densité de horde), `sim/README-mesures.md`.

---

## 1 · Les six mesures qui pilotent ce plan

### M1 — Le système d'emplacements s'annule à l'endgame

`TREES` porte **6 lignes par classe** et `PROG_CFG.SLOTS_MAX` vaut **6**. Un
joueur qui a débloqué ses emplacements équipe **tout** son arbre : le choix ne
se réduit pas, il disparaît. Plus profond que le Confort visé par le brief.
Tout acheter = 49 900 noyaux, soit 84 manches minimum. → **chantier 01**

### M2 — Le plafond de horde est atteignable ; ni les armes ni le spawn ne sont le goulot

Horde pure, minute 25, solo (plafond 220) :

| fenêtre | sans tir | avec tir |
|---|---|---|
| 45 s | 107 (49 %) | 107 (49 %) |
| **300 s** | **220 (100 %)** | **220 (100 %)** |

Part de horde retirée par les armes, minute 10 à 30 : **0 %**. Les courbes sont
superposées. « Les armes tuent trop vite » et « le spawn est trop faible » sont
**tous deux réfutés**. Le goulot est le **temps de horde ininterrompu**.
→ **chantier 03**

### M3 — Les combats de boss sont les moments les plus vides

`_spawner()` : `if (this.boss || this.bossPending) return;` — horde coupée
net. `_bossAddCap() = min(_enemyCap(), 42 × joueurs^0.75)` la plafonne à **42
corps en solo** contre 220 nominal. Un cinquième du temps de manche
(`PART_BOSS: 0.2`) se joue à 19 % de la densité. → **chantier 03**

### M4 — L'équilibre des armes est rouge, et pas sur l'arme soupçonnée

`verifierEquilibreArmes(3, 10)`, 6 problèmes sur 10 armes :

| arme | délivré | cible | écart |
|---|---|---|---|
| **laser** | **122 %** | 106 % | **+16** |
| precision | 99 % | 106 % | −7 |
| dispersion | 97 % | 106 % | −9 |
| **siege** | **96 %** | 106 % | **−10** |
| railgun | 95 % | 110 % | −15 |
| grenade | 92 % | 104 % | −12 |

**Le siège sous-délivre.** « Le siège est trop fort contre les boss » ne se
vérifie pas. Le seul dépassement est le **laser**. → **chantier 02**

### M5 — Le Tesla ignore les obstacles

`_teslaTir` sélectionne via `_surSegment` sans jamais consulter
`this.obstacles`. → **chantier 02**

### M6 — Le classement détruit des records à chaque manche

Clé de stockage = difficulté seule, donc un record solo est écrasé par un
meilleur temps à 4. `recordFinal` appelé par profil, donc une manche d'équipe
occupe 4 places du top 10. Six champs sur sept stockés puis jetés à
l'affichage. → **chantier 07**

## 2 · Trois corrections d'audits antérieurs

- **`litCanons` n'est pas un test d'explosion.** `canonEffet` répond à
  « qu'ajoute un canon supplémentaire » et renvoie non-null pour 9 armes sur 10.
  Seuls **grenade** (`souffle: 68`) et **siège** (`souffle: 48`) explosent.
- **`CHALEUR_BONUS_MANUEL` vaut déjà 0.7** — la valeur que la simulation du plan
  26 recommandait. Chambre thermique est calibrée. Sujet clos.
- **Les backgrounds sont en grande partie faits** : les « ronds » ont été
  remplacés par 6 traces directionnelles, et le set dressing hiérarchique
  (zones fonctionnelles + quartiers) existe avec son vérificateur. → chantier 11

## 3 · Ce qui existe déjà — ne pas reconstruire

| système | état | preuve |
|---|---|---|
| **Archétypes de build** | 7 archétypes, seuils mesurés sur 300 manches, `verifierBuilds()` vert, affichés | `cards.js:2326`, `build.js:162` |
| **Grammaire des boss** | 9 archétypes d'occupation de l'arène, unicité garantie dans le pool | `bosses.js:270`, `verifierArchetypes()` vert |
| **Système d'événements** | 4 types + annonce temporisée — brique complète, seulement sous-utilisée | `timeline.js`, `EVENT_ANNOUNCE` |
| **Hauts faits** | invariant « aucune puissance permanente » tenu sans exception | 12 défis → cadres uniquement |
| **Décor / traces** | 6 traces directionnelles, zones fonctionnelles, `verifierZones()` | `props.js` |

Vérificateurs verts au 2026-09-02 : `verifierCartes`, `verifierReliques`,
`verifierBonus`, `verifierBuilds`, `verifierArchetypes`.

## 4 · Chantiers

| fichier | sujet | priorité |
|---|---|---|
| `07-classement.md` | intégrité compétitive — **perte de données en cours** | **P0** |
| `09-contribution-classes.md` | mesure de contribution coop — prérequis de 3 chantiers | **P0** |
| `01-progression-slots.md` | 6 lignes pour 6 emplacements | **P0** |
| `02-armes-equilibre-tesla.md` | laser +16, Tesla ligne de vue | **P0** |
| `03-horde-rythme.md` | densité, boss qui coupent la horde | **P0** |
| `08-rythme-script.md` | 25 battements muets sur 30, dent de scie ×6 | P1 |
| `10-mort-bilan-archetypes.md` | attribution des dégâts, bilan, présentation d'archétype | P1 |
| `11-maps-safespot-decor.md` | safe spot, finitions de décor, map ↔ gameplay | P1 |
| `04-cartes-capacites.md` | compatibilité réelle, correction `litCanons` | P1 |
| `05-hauts-faits.md` | audit des 36, invariant à automatiser | P1 |
| `06-qualite-systemique.md` | schéma de bug récurrent, tests de régression | P1 |

## 5 · Ordre d'exécution et dépendances

```
07 classement           ← EN PREMIER : chaque manche jouée aggrave la perte
09 contribution classes ← débloque 03 (risque), 05 (hauts faits coop)
01 progression          ← indépendant
02 armes                ← indépendant
        ↓
03 horde                ← a besoin de 09 pour évaluer son risque de second ordre
08 rythme               ← cohérent avec 03 (respiration post-boss) ; table de données
04 cartes               ← après 02 (le mode de tir change l'éligibilité)
10 mort/bilan           ← 10b dépend de 07 (record comparé au bon effectif)
11 maps                 ← 11c dépend de 07 (biome et classement)
        ↓
05 hauts faits          ← après 09 pour les hauts faits coop
06 qualité systémique   ← EN DERNIER : vérifie ce que les autres produisent
```

**07 passe en premier** pour deux raisons : la perte de données est active, et
deux autres chantiers (10b, 11c) attendent que la contrainte de classement soit
connue.

**09 est un prérequis, pas un polish** : sans mesure de contribution, le risque
de second ordre du chantier 03 (plus de horde pendant les boss → Tank et
Soigneur renforcés → solo peut-être injouable) n'est pas évaluable.

## 6 · Ce que ce plan ne traite pas

Non mesurable par simulation, à trancher en playtest après livraison des P0 :

- **moment de décollage du build** — mesurer d'abord la fréquence à laquelle un
  joueur moyen voit une carte transformatrice (elles existent : `chaine_assaut`,
  `horizon`, `sentence_capitale` — mais elles sont légendaires) ;
- **synergies carte ↔ relique** — auditer contre les 7 archétypes plutôt qu'en
  isolé ;
- **économie des reliques** (« j'achète ou je garde ? ») ;
- **signature sonore et visuelle des armes** — le test est de jouer ;
- **maîtrise d'arme** — la donnée n'existe pas (`profile.kills` est indexé par
  **classe**, pas par arme). À arbitrer contre les hauts faits d'arme, qui
  recouvrent déjà partiellement cette fonction, **avant** d'ajouter une
  troisième structure de progression par compte.
