# Lot N — Boss final

**À implémenter en dernier de cette série.** Il réutilise des patterns des cinq
boss existants et doit être calibré une fois la difficulté des vagues (lot I),
les reliques (lot K) et les nouveaux ennemis (lot M) stabilisés — le faire
avant obligerait à le recalibrer à chaque lot suivant.

---

## N1. Exigences actées par l'équipe

- Un véritable boss final, pas une variante des cinq existants.
- **Patterns exclusifs**, en plus de la réutilisation de patterns existants
  pour enrichir le combat.
- **Identité visuelle forte** : barre de vie beaucoup plus imposante que celle
  des cinq autres boss, pour que le joueur comprenne immédiatement qu'il s'agit
  du combat final.
- Un classement basé sur le temps pour atteindre et vaincre ce boss.

---

## N2. Positionnement dans la progression

Le roster actuel compte cinq boss (Ravageur, Matriarche, Métronome, Oracle,
Jumeaux), tirés sans répétition tant que la liste n'est pas épuisée. Le boss
final apparaît **après qu'un cycle complet du roster a été effectué** — c'est-à-
dire une fois que les cinq boss normaux ont chacun été rencontrés au moins une
fois dans la partie en cours.

Ça donne une condition claire et lisible plutôt qu'un simple numéro de vague
fixe, et ça garantit que le joueur a vu l'ensemble du contenu de boss existant
avant d'affronter leur synthèse.

```
FINAL_BOSS_AFTER_FULL_ROSTER: true
```

**Le calcul, fait avec le lot L** : les boss occupent les vagues multiples de
5 (`WAVE_BOSS_EVERY: 5`), le roster compte cinq boss — le cycle complet se
termine vague 25, le boss final tombe donc **vague 30**. Les vagues spéciales
occupent `vague % 5 === 3` (lot L) : aucune ne peut coïncider avec un boss ni
avec le boss final, par arithmétique — il n'y a pas de liste d'exceptions à
maintenir. La vague 28 (tir croisé) est la dernière spéciale avant le combat
final.

---

## N3. Patterns réutilisés

Le combat doit piocher dans le répertoire des cinq boss existants pour
constituer une partie de son propre répertoire, plutôt que de tout réinventer.
Proposition de sélection, un pattern caractéristique par boss :

| boss d'origine | pattern repris |
|---|---|
| Ravageur | damier et murs de positionnement |
| Matriarche | grappes qui éclosent si non détruites |
| Métronome | exaflares (séquence d'explosions traversant l'arène) |
| Oracle | mécanique de regroupement / dispersion en alternance |
| Jumeaux | liens qui infligent des dégâts continus si maintenus trop proches |

Chaque pattern repris doit être **légèrement intensifié** par rapport à sa
version d'origine (fréquence accrue, ou rayon augmenté), pour que le combat
final ne se contente pas de répéter à l'identique ce que le joueur a déjà vu
cinq fois.

---

## N4. Patterns exclusifs

Au moins deux mécaniques propres au boss final, pour qu'il ait une identité
qui dépasse la simple synthèse des cinq autres. Deux pistes, à valider :

**Phase de synthèse** — le boss alterne entre les patterns repris de la
section N3 (un par barre de vie, dans un ordre fixe ou tiré) et une phase
exclusive qui les combine partiellement, par exemple des exaflares du
Métronome traversant une zone de regroupement de l'Oracle, forçant le groupe à
se déplacer ensemble tout en évitant les explosions séquentielles.

**Sceau final** — sur la dernière barre de vie uniquement, une mécanique
inédite à haute exigence de coordination, cohérente avec le statut de combat
de fin de progression. Une proposition : une variante étendue du
regroupement où **la totalité des joueurs vivants doit occuper simultanément
des zones distinctes réparties aux quatre coins de l'arène**, chaque zone
devant rester occupée un temps cumulé donné avant que la barre suivante ne
puisse être entamée — impossible à résoudre en solo, donc à adapter en nombre
de zones requises selon l'effectif, sur le même principe déjà en place pour
les mécaniques de groupe des autres boss (adaptation par seuil de joueurs).

---

## N5. Barres de vie et structure du combat

Plus de barres que les boss normaux, pour marquer la différence d'échelle :

```
FINAL_BOSS_BARS: 8          // contre 5 pour un boss normal
FINAL_BOSS_HP_MUL: 2.2      // relatif a un boss normal calibre pour la meme vague
```

Alternance proposée sur les huit barres : cinq barres pour les patterns repris
(section N3, un par boss d'origine), deux barres pour la phase de synthèse
(section N4), une dernière barre pour le sceau final. Le nombre exact reste à
ajuster une fois les autres lots mesurés — c'est explicitement pourquoi ce lot
vient en dernier.

---

## N6. Identité visuelle

### Barre de vie

« Beaucoup plus imposante et impressionnante » — traduit en :

- **Largeur d'affichage sensiblement supérieure** à celle des boss normaux
  (occupant une part nettement plus grande de la largeur d'écran).
- **Un traitement graphique distinct** : où la barre des boss normaux est un
  simple dégradé, celle du boss final intègre une texture animée cohérente
  avec le reste de la direction artistique (l'arène est une machine, il en
  est le noyau ultime) — proposition : une pulsation lente qui accélère à
  mesure que ses PV baissent, créant un signal de progression supplémentaire
  au-delà du simple remplissage.
- **Segmentation visible des huit barres**, avec un marqueur distinct à chaque
  rupture, pour que la progression du combat soit lisible d'un coup d'œil
  malgré le nombre élevé de segments.
- **Nom affiché en évidence dès l'entrée en combat**, avec un traitement
  distinct de l'annonce standard des cinq autres boss (durée d'affichage plus
  longue, effet d'apparition marqué) — c'est ce premier instant qui doit
  installer immédiatement la reconnaissance « ceci est le combat final ».

### Silhouette

Doit se démarquer nettement des cinq boss existants en taille au minimum —
proposition de départ : gabarit supérieur d'environ 40 % au plus grand des
boss normaux, avec un traitement visuel qui évoque une combinaison ou une
synthèse des identités déjà établies (plutôt qu'une forme totalement
disjointe), cohérent avec le fait que le combat lui-même réutilise leurs
patterns.

---

## N7. Récompense de victoire

- Écran de fin dédié, distinct de la fin de manche standard (mort ou
  déconnexion complète de l'équipe).
- Le score final et le temps de complétion sont ceux enregistrés au classement
  (section N8).
- Une relique garantie au tirage suivant si une nouvelle manche est lancée
  dans la foulée — à définir précisément selon ce qui existe côté persistance
  au moment de l'implémentation de ce lot.

---

## N8. Classement au temps

Conséquence directe validée par l'équipe : *« cela permettra de mettre en
place un classement basé sur le temps nécessaire pour terminer une partie
complète lorsqu'un joueur atteint le boss final »*.

### Ce qu'il faut enregistrer

```json
"bestFinalRun": {
  "time": 1847,          // secondes depuis le debut de la manche
  "wave": 33,
  "difficulty": 1,
  "date": "..."
}
```

Dans le profil de la ligne Supabase du compte (la persistance n'est plus
`data/progress.json`), avec un classement global consultable depuis le
Terminal ou le salon (à trancher au moment de l'implémentation selon ce qui
existe alors dans l'interface). Le serveur étant multi-salons, le temps
enregistré est celui du `GameState` de la salle (`state.t`, autoritaire) ; le
classement compare des comptes, toutes salles confondues, **par difficulté**
— le champ y est.

### Dépendance critique avec le lot L

Le classement au temps n'a de sens que si le déroulement de la partie est
comparable d'une tentative à l'autre. C'est exactement la préoccupation qui a
motivé l'activation déterministe des vagues spéciales au lot L — **ce lot
confirme que cette décision était nécessaire**, et non optionnelle : sans
elle, le classement au temps du boss final serait faussé par le hasard des
vagues spéciales rencontrées en chemin.

---

## N9. Mesures

| mesure | attendu |
|---|---|
| durée totale du combat, compte maximal | à définir une fois les lots H, I, K, M mesurés |
| taux de victoire au premier essai, compte maximal | volontairement bas, c'est un combat de fin de contenu |
| écart de puissance nécessaire entre compte neuf et compte maximal pour l'atteindre | cohérent avec la règle générale du dépôt (moins de 1,5 vague d'écart) |

## N10. Critères d'acceptation

- Le boss final n'apparaît qu'après un cycle complet des cinq boss normaux
  dans la même partie.
- Sa barre de vie est visuellement distincte de celle des cinq boss normaux,
  identifiable sans lire le nom.
- Au moins deux mécaniques n'existent nulle part ailleurs dans le jeu.
- Le temps de complétion enregistré au classement correspond au temps réel
  écoulé depuis le début de la manche, vérifiable côté serveur.
- Aucune vague spéciale ne peut coïncider avec l'apparition du boss final
  (garanti par l'arithmétique du lot L : `% 5 === 3` contre `% 5 === 0`).
