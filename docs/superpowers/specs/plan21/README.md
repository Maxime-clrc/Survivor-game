# Survivor LAN — plan 21 : ce qui reste à dire

Le plan 20 a ouvert les canaux muets du combat. Il en reste **six points du
brief**, tous faisables sans navigateur, et aucun ne demande une architecture de
plus : trois canaux existants ne portent pas encore ce qu'ils pourraient.

Ce plan ne touche **ni les dégâts, ni les cadences, ni les portées**. Il n'ajoute
**aucune clef d'instantané** hors d'un drapeau déjà déductible, et ne relève ni
`PARTICLE_MAX` ni `MAX_VOICES`.

---

## 1 · Les six points, et pourquoi ils restent

| § du brief | ce qui manque | où |
|---|---|---|
| 8 · 19 | la grenade n'a **aucune traînée** et rien qui dise qu'elle est armée | `boltBaril` |
| 23 · 37 | une balle qui **traverse** un corps ne le dit pas | `applyHit` |
| 37 · 38 | le ricochet n'a pas de **signature de rebond** | `_ricochet`, `applyHit` |
| 40 | l'événement `ricochet` d'`events.js` est une **touche de boss sans dégât** — le nom ment | `events.js` |
| 12 | la mort a ses quatre temps, mais **aucun acte final par type** | `spawnDeath` |
| 29 · 35 | le poids pilote flash, éclats, cône, poussière, onde et voix — **pas le tressaillement** | `PALIER` |

Deux choses sont déjà vraies et n'ont pas besoin d'être faites : `bursts` est
**déjà** lu par `drawLumiere`, donc un coup lourd émet déjà de la lumière ; et la
mort joue **déjà** trois images sur 260 ms par-dessus son éclat de type.

---

## 2 · Les lots

Un lot = un commit = un bump de patch. Le plan ouvre **0.24.x**.

| lot | version | contenu | critère |
|---|---|---|---|
| **1** | 0.24.0 | **Le projectile lourd, et la traversée.** Traînée du baril dans l'axe du VOL pendant que le corps tourne, pulsation d'arme amorcée, et la ligne de passage d'une balle perforante. | aucune particule de plus par tir · `verifierEffets` muet |
| **2** | 0.24.1 | **Le ricochet se lit.** Impact → direction de rebond → nouveau départ, et l'événement mal nommé prend son vrai nom. | le rebond se lit sans compter les traits |
| **3** | 0.24.2 | **L'acte final, et le poids complet.** Un acte de fermeture **déduit** de ce que la créature tenait, et le tressaillement borné à ses propres coups lourds. | trois types sur treize seulement · shake ≤ 1,5 px |

---

## 3 · Ce que le plan ne fait pas

- **Aucun hitstop de plus.** Il reste aux barres de boss et à la mort du boss.
- **Aucun acte final sur un type ordinaire.** Un acte de fermeture sur les treize
  types serait un événement de palier 2 à 20-60 par seconde : ce n'est plus un
  fait notable, c'est du bruit. Il se **déduit** de ce que la créature tenait, et
  seules trois lignes du bestiaire tiennent quelque chose.
- **Aucune nouvelle table.** L'acte final sort de `lienRange`, `auraRadius`,
  `egideRadius` et du rayon — même idiome que `matiereDe()`.
