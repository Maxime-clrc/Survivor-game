# Lot A — la banque de dégâts

**Le lot le plus important du plan.** Une seule cause produit les deux symptômes
que tu décris : « on les tue trop vite » et « pendant la transition on a
l'impression de ne plus faire de dégâts ».

## Le mécanisme actuel

Deux morceaux de code, à quinze cents lignes d'écart.

**À l'encaissement** (`_damage`, ligne ~1728) : quand les dégâts feraient
descendre le boss sous le plancher de sa barre courante, l'excédent est **mis de
côté** au lieu d'être perdu.

```js
if (target.hp < plancher) {
  target.bank = (target.bank ?? 0) + (plancher - target.hp);
  target.hp = plancher;
}
```

**À la rupture** (`_bossBars`, ligne ~3500) : une fois `BAR_DWELL` (10 s)
écoulé, la banque est **rendue** au boss.

```js
const prise = Math.min(b.bank, Math.max(0, b.hp - plancher));
b.hp -= prise;
b.bank -= prise;
```

## Pourquoi ça produit les deux symptômes

**« Ils meurent trop vite. »** Rien n'est perdu. Une équipe qui frappe fort
remplit la banque pendant les 10 secondes de palier, et **encaisse plusieurs
barres d'un coup** dès que le délai expire. Le `BAR_DWELL` ne fait que
**cadencer** la mort du boss, il ne la **retarde** pas : la banque paie les
barres suivantes immédiatement, en boucle `while`.

Conséquence directe : les couches `unlock[2]` et `unlock[3]` — les mécaniques
les plus intéressantes de chaque boss — **ne sont presque jamais jouées**. Le
contenu existe et personne ne le voit.

**« On ne fait plus de dégâts. »** Ce n'est pas une invulnérabilité, c'est un
**plancher invisible**. Les PV affichés sont bloqués à `plancher` pendant que la
banque se remplit. Le joueur inflige bien des dégâts — ils ne sont simplement
nulle part à l'écran.

C'est le pilier **P2** violé de la pire façon : non seulement la fenêtre est
invisible, mais elle *ment*, puisque les dégâts comptent réellement.

## Décision

**Le DPS excédentaire est perdu.** La banque disparaît.

```js
// _damage — remplace le bloc de mise en banque
if (target.hp < plancher) target.hp = plancher;
```

```js
// _bossBars — la boucle `while` devient un `if`
// une seule barre peut tomber par passage, et jamais avant la fin du palier
```

Trois conséquences à assumer :

- **la durée plancher d'un combat devient réelle** : `(bars - 1) × BAR_DWELL`,
  soit **40 s** pour un boss ordinaire et **70 s** pour l'Amalgame, quel que soit
  le DPS ;
- **les couches tardives se jouent enfin.** C'est le vrai gain du lot : quatre
  couches de déverrouillage par boss, aujourd'hui mortes ;
- **la puissance devient de la marge d'erreur, pas de la vitesse.** Exactement
  l'intention du pilier P1.

## Le bouclier de transition

Pendant le palier, le boss est **de fait** invulnérable. Il doit donc le
**montrer** (pilier P2) :

- une **enveloppe blanche** pulsée autour de la silhouette, sur toute la durée du
  palier — le blanc est réservé à ça dans la grammaire (lot B) ;
- **la barre en cours devient blanche** et se vide en 10 s : le joueur lit le
  temps restant sur l'objet qu'il regarde déjà ;
- les impacts **ricochent** — étincelle décalée vers l'extérieur, son mat, pas
  de chiffre de dégâts ;
- l'effet de rupture existe déjà (`kind: 6`, `BOSS_BREAK_RADIUS: 572`) ; il
  marque la fin du palier, pas son début. **Il en faut un second à l'entrée.**

## `BAR_DWELL` doit-il rester à 10 s ?

Aujourd'hui il ne coûte rien, donc sa valeur n'a jamais été éprouvée. Avec le
DPS perdu, il devient le **régulateur principal** de la durée d'un combat.

À 10 s, un boss ordinaire dure au minimum 40 s de palier + le temps de descendre
cinq barres. C'est cohérent avec la cible de 50-90 s du plan 6. **Le garder tel
quel et mesurer** — c'est la première valeur à revoir si les combats s'étirent.

⚠ **Le palier doit être occupé.** Dix secondes où le boss est intouchable et ne
fait rien seraient dix secondes d'ennui. Le palier est **exactement** le moment
où se joue la mécanique de la phase suivante : `_deferAtk` le fait déjà pour
l'Amalgame (`unlock[phase-1]`), il faut l'étendre aux cinq autres.

C'est le point qui transforme le lot d'un correctif en une amélioration de
rythme : **la transition cesse d'être un temps mort pour devenir le sommet de la
phase.**

## Critères d'acceptation

1. Une manche complète en normal **joue au moins une mécanique de `unlock[3]`**
   sur chaque boss rencontré — aujourd'hui proche de zéro.
2. La durée d'un combat de boss ordinaire est **entre 50 et 90 s** à P1, et
   **jamais sous 40 s** quelle que soit la puissance.
3. Aucun joueur ne peut infliger de dégâts effectifs pendant un palier, et
   **tous les canaux le montrent** : enveloppe, barre blanche, ricochets.
4. Le taux de déclenchement de l'**emportement** (`ENRAGE_AT: 150`) reste sous
   25 % des combats — s'il grimpe, `BAR_DWELL` est trop long.
