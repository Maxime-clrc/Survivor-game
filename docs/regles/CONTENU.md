# Cartes, armes, hauts faits, progression, équilibrage

**Quand lire ce fichier :** on touche à `shared/cards.js`, `armes.js`, `hauts_faits.js`, `progression.js`, `reliques.js`, ou on règle un chiffre.

Les règles qui valent pour *toute* tâche vivent dans `CLAUDE.md`, à la racine.
Celui-ci ne porte que ce qui ne sert qu'ici — et il n'est PAS chargé
automatiquement : c'est la carte de `CLAUDE.md` qui dit quand l'ouvrir.
### Progression et cartes

- **Une famille de cartes occupe les quatre paliers de rareté, et le palier vaut
  la rareté** (`family`/`tier`). Trois règles indissociables : jamais deux paliers
  de la même famille dans un tirage, un palier supérieur possédé retire les
  inférieurs, les paliers **se cumulent**. **Douze familles**, 48 cartes.
- **UN AXE EST UNE CLÉ DE `mods`, et deux cartes qui ne touchent QUE la même clé
  — sans condition, sans classe, sans famille — sont le même effet écrit deux
  fois.** La correction est de créer la famille, jamais de supprimer une carte :
  les doublons deviennent des paliers et rien n'est perdu. On ne supprime que
  lorsque les quatre paliers de la famille sont déjà pris.
- **Un 4/4 porte la statistique de sa famille.** Le palier supérieur retire les
  inférieurs du pool, donc une légendaire qui ferme une échelle sans en porter
  l'axe se verrouille **hors de sa propre famille** et meurt à la prise. Seule
  exception : une carte **sans `apply`** (Vœu partagé), qui réécrit une règle.
- **Le pool compte au moins 1,5 commune par épique.** Une commune revue en
  boucle et une épique jamais revue sont le même défaut, pris par les deux bouts.
- **Les cartes neuves s'ajoutent en QUEUE de `CARDS`.** L'ordre du tableau est
  ce sur quoi s'indexent les déblocages ; une insertion au milieu reverrouille
  des cartes déjà gagnées chez tous les comptes existants.
- **`verifierCartes()` (`game_state.js`) est le critère rejouable du catalogue**,
  et il appelle `verifierCatalogue()` (`cards.js`) pour la structure de la table
  — axes en doublon, paliers vides, forme du pool, chaînes de prérequis.


### Armes

- **LA VARIÉTÉ NE VIENT PAS DU PROJECTILE**, elle vient de ce que l’arme exige du
  corps et de l’attention : le **mouvement**, la **ressource**, la **visée**, la
  **distance**. `verifierArmes(cards, axesDeCarte)` refuse un dépôt où l’un des
  quatre axes est vide, où une arme n’a **pas de famille**, où une famille
  déclarée n’a pas ses quatre paliers, ou où une carte offensive échappe au
  tableau. Le catalogue lui est **passé** et non importé — `cards.js` importe
  déjà `armes.js`, et `verifierCartes()` est l’endroit où les deux se rencontrent.
- **AUCUNE ARME N’AJOUTE UNE ENTRÉE, UN BOUTON NI UN GESTE.** On vise et on
  maintient le tir : c’est l’arme qui se comporte autrement, pas le joueur qui
  apprend une manipulation.
- **ET AUCUNE N’EN RETIRE.** Une arme qui atteint la référence **sans exiger de
  visée** n’est pas une arme alternative, c’est l’arme optimale — `sansVisee` a
  été essayé sur le tesla et retiré. Son trait part droit devant et s’accroche au
  premier corps du **segment** (`_surSegment`, extrait de `_segmentHits`), avec
  une tolérance latérale généreuse : le tesla est l’arme qui **pardonne** la
  visée, pas celle qui s’en passe. Un tir à côté est un tir perdu, et c’est le
  cœur du correctif — avant, un tir tesla ne pouvait pas rater.
- **L’AMORCE ET LA DISPERSION SE DISTINGUENT À L’ŒIL** : le premier arc porte
  `n: 1` (le champ de magnitude, déjà dans le tuple d’effet — aucune clé neuve),
  et se dessine presque droit et épais là où les rebonds sont agités et fins.
  Sans cette différence l’arme se relit comme automatique, ce qu’elle n’est plus.
- **Une arme ne change pas ce qu’une carte FAIT, elle change ce qu’elle lui
  RAPPORTE** (`appliquerEchelle`, point de passage unique). **Sept coefficients**
  par arme ; la cadence se rescale sur sa **réduction**, parce que
  `fireIntervalMul` descend quand la cadence monte. Aucun coefficient sous 0,2 —
  une carte à valeur nulle est un choix vide ; seules la **perforation** et le
  **ricochet** ont droit au zéro.
- **`perforation` et `ricochet` sont DEUX AXES**, parce que `pierce` et `chain`
  sont deux clés de `mods` : un coefficient unique tuait le rebond du railgun en
  même temps que sa perforation. Une arme sans projectile met les deux à zéro ;
  le laser et le railgun mettent la **perforation** à zéro parce que
  `perforeTout` la rend déjà infinie — le mod calculé était écrasé avant d’être
  lu, et les deux plus fortes valeurs de la table s’appliquaient aux deux armes
  pour qui la statistique ne voulait rien dire.
- **LES AXES D’UNE CARTE SE RELÈVENT, ILS NE SE DÉCLARENT PAS**
  (`axesDeCarte(c)`, `cards.js`) : on observe ce que l’`apply` — et l’`applyAfter`
  — écrivent dans `mods`, et on range chaque clé sous son axe. Un champ `axes:`
  écrit à la main dérive dès que l’effet bouge. `inertia` compte comme une
  **perforation** : elle n’a pas de colonne à elle, mais elle est morte partout
  où la perforation l’est.
- **UNE CARTE À COEFFICIENT NUL SORT DU POOL** (`eligibleCards`) : sur trois
  offertes, en tirer une morte fait un choix à deux options sans le dire. `=== 0`
  et non un seuil — à 0,2 le joueur fait un choix informé et perdant, ce qui
  reste un choix. `every` et non `some` : une carte qui donne perforation **et**
  dégâts sert encore par ses dégâts. `poolThin()` se rejoue **arme par arme**.
- **UN LEVIER OFFENSIF HORS DU TABLEAU EST INVISIBLE À L’ÉQUILIBRAGE PAR ARME**,
  et c’est par là qu’est passé « Second canon ». Toute carte `off` doit toucher
  un axe ou porter `horsEchelle: true` — une exemption **explicite**, le porteur
  écrit qu’il a regardé. Une carte de famille d’arme en est dispensée : l’arme
  **est** son contexte.
- **LA PÉNALITÉ VIT AU MÊME ENDROIT QUE LE BÉNÉFICE.** `barrelDamageMul` se
  payait en haut de `_volley`, avant l’aiguillage, alors qu’`extraBarrels` n’était
  lu que par la branche à **balles unitaires** : quatre armes sur huit payaient
  −18 % cumulable deux fois pour rien. Même découpe dans `powerIndex()` et dans
  le panneau de stats.
- **UN CANON EN PLUS N’AJOUTE PAS LA MÊME CHOSE PARTOUT** (`canonEffet(a)`) : une
  balle en éventail, **deux plombs**, une grenade, un arc, une nappe de laser.
  Le retirer du pool pour cinq armes les laissait sans aucune carte de projectile,
  et le joueur qui prenait « Second canon » ne voyait rien changer. `litCanons` se
  **déduit** de `canonEffet` — seule la lame ne lance rien. `canonGain(a, extra)`
  est le point de passage du gain : `_volley`, `powerIndex()` et le panneau de
  stats lisent la **même** fonction. Le bonus « double » emprunte le même chemin,
  donc il vaut désormais pour les dix armes.
- **AUCUNE ARME NE DESCEND SOUS 60 % DE LA RÉFÉRENCE DANS L’UN DES DEUX
  CONTEXTES.** Les boss sont un cinquième du temps de manche, contre une cible
  unique : une arme qui saute entre les cibles n’a rien à sauter. D’où
  `conversionBoss()` — les arcs du tesla **reviennent**, l’obus **frappe deux fois**, la lame **empile une
  marque**, la chaleur du laser **sature** donc son bonus se paie sur la moyenne
  du cycle. La conversion se calcule, elle ne se déclare pas à côté de la
  mécanique, et l’**uptime n’y est pas** : c’est un terme à part du modèle,
  l’inclure le compterait deux fois. Les cinq autres rendent 1, et c’est
  **mesuré** : la gerbe de la dispersion couvre un corps à la scission, elle ne
  le frappe pas deux fois. `powerIndex()` lit
  `dpsBase × conversionBoss`, donc une conversion fausse déréglait la mise à
  l’échelle des boss elle-même.
- **DIX ARMES, DIX FAMILLES DE QUATRE CARTES**, et chacune est donnée par
  exactement un haut fait. Les quatre axes se répartissent : **mouvement**
  (assaut) · **ressource** (laser, railgun, siège) · **visée** (tesla, précision)
  · **distance** (lame, dispersion, grenade).
- **UNE JAUGE QUI NE SE DÉCLENCHE PAS EST UNE HORLOGE, PAS UNE MANIPULATION.**
  Le tir est automatique, donc une charge qu'on relâche n'existe pas : la charge
  du railgun se lit **sur la ligne de tir**, qui se dessine un peu plus loin à
  chaque image. Elle dit **quand** et **où** en même temps, et ce que le joueur
  pilote est sa position à l'instant où le rail part — pas un geste de plus.
- **Le chargeur du siège est un COMPTE, donc des crans** (`armeRes` porte le
  remplissage, l'anneau le découpe en `chargeur` segments). Le même anneau porte
  la **recharge**, parce que c'est la même question : combien puis-je encore
  tirer. `armeMuet` est ce qui ferme l'arme, le même champ que la saturation du
  laser — un second chemin pour « je ne peux pas tirer » se désynchroniserait.
- **La garde du siège s'en va avec sa fenêtre** : le bouclier ×3 est rendu à la
  fin de la recharge, sinon la contrepartie deviendrait un cadeau permanent. Il
  ne supprime pas la vulnérabilité — 1,8 s sans rien rendre — il l'empêche
  d'être létale.
- **LA DISPERSION EST UNE DISTANCE, PAS UN CÔNE.** Une balle unique part, vaut
  `porteur` plombs, et **se scinde à `scission` px parcourus** (`b.scinde`,
  résolu par `_scinder()` dans `_bullets`, jamais dans `_fire` — pousser dans le
  tableau qu’on parcourt fait avancer les plombs d’un tick de trop). Sur la ligne
  de scission l’arme est **muette** : le porteur touche avant de s’ouvrir. La
  bande utile commence juste après, d’où `tenueDe = scission × 1,25` — un pilote
  posé sur la ligne mesurait l’arme là où elle ne rend rien.
  L’**ouverture de la gerbe est le levier de horde, pas les dégâts** : à 0,42 rad
  les plombs se marchent dessus sur un seul corps et le surtuage plafonne `Dh`
  (5,45 → 7,9 de dégâts n’a rendu que +1 de `Dh`) ; à 0,80 ils couvrent plusieurs
  corps ; à 1,05 la densité tombe et la salve ne tue plus rien. Le 3/4
  (`scissionDroite`) **supprime la divergence** au lieu de resserrer un cône :
  c’est ce qui rend l’arme jouable au-delà de la bande et sur une cible unique.
- **UN OBUS N'EST NI UNE GRENADE NI UN MISSILE.** Trois champs de balle, trois
  sens : `missile` **guide** et ne touche que sa cible (Salve) ; `direct` fait le
  **direct puis le souffle** ; `lob` **ralentit**. Les déduire l'un de l'autre a
  cassé deux fois — l'obus du siège ralenti par son `boom`, la grenade accélérée
  par son percuteur alors que sa durée de vol est calculée sur la vitesse
  attendue.
- **Trois armes proposées au départ, le tir standard TOUJOURS parmi elles**, une
  relance par manche. Le choix vit dans le **briefing** : l’écran retient déjà la
  vague et attend déjà tout le monde.
- **L’index d’arme circule dans l’instantané** : `ARMES` est **append-only**,
  comme `ENEMY_TYPES` ou `BOSS_ROSTER`.
- **LE CONTEXTE DE TIRAGE EST D’ÉQUIPE, L’ARME EST DU JOUEUR.** `_cardCtx()` ne
  porte que ce qui vaut pour tout le monde ; `offerCards(p)` y **ajoute**
  `arme: p.arme`. Sans cette ligne `eligibleCards` lisait le tir standard pour
  tous, et les trois filtres par arme tombaient **en silence** : la famille du
  porteur était retirée du pool au lieu d’y être garantie, aucune carte à
  coefficient nul n’était écartée, et « Second canon » s’offrait aux armes qui ne
  le lisaient pas. `_poolWarn()` recevait le même contexte, donc il ne pouvait
  pas le signaler.
- **La famille de l’arme portée est garantie dans le pool, celles des autres en
  sont retirées.** Ce sont les seules cartes qui ne peuvent jamais faire doublon,
  et elles sont exclues du rapport communes/épiques — les quarante ne sont jamais
  disponibles ensemble.
- **Une ressource invisible est une ressource subie.** La rampe se lit **sur le
  personnage** (elle dépend du déplacement), la chaleur sous le réticule.
- **UNE JAUGE DOIT SE LIRE DANS CE QUE L’ARME PROJETTE, pas seulement dans un
  anneau.** La rampe du canon d’assaut ouvre la **gerbe**
  (`ASSAUT_DISPERSION × (1 − armeRes)`, ~9° à rampe nulle, tir chirurgical à
  rampe pleine) : aucun état neuf, `armeRes` portait déjà exactement la bonne
  valeur. Ce n’est pas un habillage — c’est un malus qui monte l’exigence de
  **visée** de 0,5 à 1 (il faut choisir entre tirer et bouger), donc `D` et la
  cible avec, et le nominal paie la compensation que la campagne désigne.
- **UNE ARME VAUT CE QU’ELLE DÉLIVRE, PAS CE QU’ELLE AFFICHE.** Le critère de
  DPS nominal est resté muet pendant que le tesla dominait et que la grenade
  faisait ×1,88 de survie : il ne mentait pas, il regardait le mauvais nombre.
  Le modèle est `V = 0,8·Dh + 0,2·Db + S` — dégâts délivrés en horde, dégâts
  délivrés contre un boss seul, survie apportée. `verifierEquilibreArmes()`
  (`game_state.js`) est le critère rejouable, et il **ne peut pas tourner sans
  mesures** : c’est un vérificateur de campagne, comme `verifierMeta`.
- **ON MESURE L’ABSORBÉ, JAMAIS L’ENVOYÉ.** Le surtuage représentait jusqu’à
  76 % des dégâts d’une arme à gros coup : compter le brut classait les armes
  par gaspillage. Conséquence directe — **`degats` SATURE** sur une arme qui tue
  déjà en un coup, et le levier devient la **cadence** ou les **cibles**, jamais
  la puissance du coup.
- **LES DEUX BANCS SONT IMMORTELS**, et ce n’est pas un confort : sans ça `Dh`
  est confondu avec la survie — une arme qui tient plus longtemps atteint des
  minutes plus denses, donc mesure un débit plus élevé, et la survie serait
  comptée deux fois, une fois dans `Dh` et une fois dans `S`. Le banc de boss
  laisse le boss **attaquer** et le pilote **répondre** : figer le tireur offrait
  la rampe pleine au canon d’assaut et le mesurait à 2,6 fois son nominal.
- **UNE ARME PUNITIVE À JOUER DOIT RENDRE UN PEU PLUS**, sinon personne n’a de
  raison de la prendre. `D` se note sur **cinq mécaniques** (`exige` : visée,
  anticipation, position, ressource, vulnérabilité), pas sur une impression —
  « y a-t-il une jauge à lire » a une réponse dans le code. Cible :
  `1,00 + 0,04 × (D − 0,5)`, soit **0,95 à 1,17**. L’écart max est de 17 %, pas
  de 60 % : une arme difficile est mieux récompensée, elle n’est **pas** un
  palier de puissance.
- **LA RÉSOLUTION DE LA CAMPAGNE EST DE ±0,08 SUR LES ARMES CHAOTIQUES**, donc
  plus large que la tolérance de ±0,05. Le canon d’assaut et le lance-grenades
  changent de 0,16 pour 2 % de dégâts : au-delà de vingt graines on ajuste du
  bruit, pas une arme. **Le critère de sortie est la bande globale**, pas l’écart
  individuel.
- **Avant de corriger un chiffre d’arme, vérifier que le PILOTE sait la jouer.**
  `pilotage()` recule : sa tenue de distance et son terme d’immobilité se
  dérivent de l’arme, et **ne s’activent que si l’arme les déclare** — avec le
  tir standard son comportement est celui du lot I, inchangé.
- **La chaleur monte tant que le faisceau est ACTIF, à deux régimes** :
  `CHALEUR_MONTEE` en contact (4,2 s), `CHALEUR_MONTEE_VIDE` à vide (7 s).
  Adossée à la seule touche, elle ne se remplissait que dans les moments où le
  joueur gagnait déjà — donc jamais dans ceux où il aurait appris qu’elle existe,
  et comme le bonus croît avec elle, la ressource **récompensait sans jamais
  mordre**. Le second régime est ce qui évite de punir la couverture de zone. Le
  tir étant automatique, le cycle est permanent : 4 s de tir, 1,5 s de mutisme,
  ~77 % d’activité — et `armeMuet` le porte, donc le modèle d’équilibrage le
  capte par le terme d’uptime.
- **Le rayon d’une arme de balayage est un SEUIL, pas un levier** : sous ~150 px
  elle ne perce pas l’anneau qui se referme, au-dessus elle le nettoie. On pose
  le rayon au-dessus du seuil et on règle par l’**arc**.
- **Une arme est verrouillée si et seulement si un haut fait la donne**
  (`armesOuvertes`), exactement comme une carte ou une relique.

### Hauts faits

- **UN HAUT FAIT OUVRE UNE PORTE, IL NE DONNE PAS DE PUISSANCE.** Les noyaux sont
  une courbe, les hauts faits sont des marches ; une puissance qui arrive par
  marches crée des falaises. Une arme débloquée doit encore être choisie et
  jouée, une ligne coûte toujours des noyaux, un cadre ne change rien.
- **TOUTE RÉCOMPENSE EST NOMMÉE** (`reward: { type, ids }`, cinq types : `arme`,
  `carte`, `ligne`, `relique`, `cadre`). Un déblocage indexé sur une **position
  de tableau** se casse dès qu'on ajoute un élément : c'est ce qui reverrouillait
  des cartes chez tous les comptes existants. Une récompense qui nomme une arme
  **que le dépôt ne connaît pas encore** traverse sans rien verrouiller.
- **UNE CARTE, UNE RELIQUE OU UNE LIGNE EST VERROUILLÉE SI ET SEULEMENT SI UN
  HAUT FAIT LA DONNE.** La liste des verrous se **déduit** de la table des
  récompenses (`TOUTES_RECOMPENSES`), elle ne se tient pas à côté.
- **Les armes vivent en simple et intermédiaire, jamais en défi** ; **les cadres
  vivent en défi, jamais ailleurs.** `verifierHautsFaits(cardIds, relicIds,
  armeIds)` valide les **trois** familles d’identifiants, et l’inverse : une arme
  que **aucun** haut fait ne donne est jouable par personne. Il est le critère
  rejouable, et il vérifie les deux.
- **UN COMPTEUR SE BRANCHE SUR L’ÉVÉNEMENT QUE SON TEXTE NOMME, et un compteur
  qui ne monte jamais ne lève rien.** « Prospecteur » comptait `p.hf.harvests`
  au ramassage d’un **fragment** — la carte « Récolte », que la plupart des
  comptes n’ont pas — et jamais dans `_harvestYield`, qui est le seul endroit
  où un point de récolte rend quelque chose. Le seuil restait à zéro pour qui
  cassait des cristaux. **Le point de crédit est celui où la récompense de manche
  est versée** : les éclats et le compteur sortent de la même boucle, sinon les
  deux dérivent.
- **TOUS LES COMPTEURS SONT PERSONNELS** (`p.hf`), jamais l'état de manche : un
  compteur d'équipe serait atteint quatre fois plus vite à quatre joueurs.
  Le pendant est connu : la horde suit `joueurs^0,75`, donc un seuil brut est
  ~30 % plus dur en groupe — **d'où la préférence pour un RYTHME** (fenêtre
  glissante d'une case par seconde) plutôt qu'un total brut.
- **Un seuil « en une manche » vise 1,3 fois la médiane mesurée** ; un **cumul**
  se lit en **nombre de manches**. Les seuils du plan étaient des paris : ils ont
  tous été remesurés (LISEZMOI.md).
- **ON NE RETIRE JAMAIS UN DÉBLOCAGE ACQUIS.** La garantie ne passe pas par une
  correspondance jalon → haut fait : la migration relève **carte par carte** ce
  qu'un compte avait ouvert et le range dans `profile.debloquees`, qui le suit
  pour toujours. Une migration **décrit le passé** — ses tables sont figées et ne
  suivent pas `CARDS`.
- **`profile.milestones` reste le journal des événements de progression**
  (emplacements de cartes) ; **`profile.hf` est la liste des hauts faits**. Deux
  listes, deux rôles, aucune conversion à tenir.
- **Le bandeau attend la fin du combat et ne recouvre jamais un écran de cartes**
  — la décision du joueur ne se recouvre pas. Une à la fois, les autres en file.
  **En coopératif, seuls tes hauts faits produisent un bandeau** ; ceux des
  alliés passent en une ligne d'info.
- **Les hauts faits ont leur PROPRE ÉCRAN** (`#hautsFaits`), hors du Terminal,
  ouvert par le bouton sous la catégorie Classe du salon. Le Terminal ne garde
  que l’arbre et le confort. La page porte les deux sections : la liste groupée
  par niveau d’exigence, puis les cadres.
- **Le cadre ne coûte rien au réseau** : le serveur envoie un **identifiant**, il
  voyage avec le salon et le bilan comme la couleur, et n'ouvre aucune clé
  d'instantané. **L'identité vit dans `CADRES` (`hauts_faits.js`), la peau dans
  `CADRE_SKIN` (`palette.js`)** — même découpe que `BOSS_ROSTER` / `BOSS_SKIN`.
- **Une peau est SIX EMPLACEMENTS à valeurs nommées** (`silhouette`, `fond`,
  `bordure`, `ornement`, `lueur`, `insigne` — la liste est `CADRE_EMPLACEMENTS`),
  jamais du CSS dans la table. La **silhouette** est le sixième : elle était
  soudée à `bordure: encoche`, or la **forme** et l'**épaisseur** sont deux
  décisions — une plaque blindée peut avoir un bord fin. `palier` n'est pas un
  septième emplacement : il **borne** les six autres (1 mat · 2 relief · 3 le seul
  spectre) et il **se croise avec l'exigence** dans `verifierHautsFaits()`
  (palier 2 ⟺ `diffMin: 2`, palier 3 ⟺ `legende`, un seul au palier 3). Point de
  passage unique `appliquerCadre(el, id)` (`ui/cadres.js`) ; `menus.css`
  a une règle **par valeur d'emplacement**, jamais par cadre. `defaut` n'a pas de
  peau — ce n'est pas un cadre, c'est son absence.
- **LA PLAQUE EST UNE COUCHE, PAS LA LIGNE.** `appliquerCadre()` insère
  `<i class="cadreCouche"><i class="cadreEclat"></i></i>` en **premier enfant** :
  le contenu (avatar, nom, hôte, classe, ping, état) ne sait rien du cadre, et
  les deux sites d'appel n'ont pas de balisage décoratif à écrire. Six surfaces
  de peinture, aucune dans le flux : couche (matière + silhouette + lueur),
  `::before` (la bordure en pile d'ombres internes), `::after` (les **segments
  allumés**), `.cadreEclat` (bande technique, nœud, reflet), `.cadre::before`
  (visserie), `.cadre::after` (ornement). `z-index: -1` **sous**
  `isolation: isolate` : sans contexte d'empilement, une couche négative passe
  derrière le fond de son parent au lieu de dessus.
- **LA RARETÉ EST UNE COMPLEXITÉ, PAS UNE COULEUR.** Le CSS **lit**
  `data-cadre-palier` pour doser la visserie (2 · 4 · 6 vis), le reflet (absent ·
  lent · lent + nœud pulsé) et la profondeur. Aucune règle ne nomme un cadre, donc
  un treizième cadre reste **une ligne dans `CADRE_SKIN`**.
- **LA LUMIÈRE NE FAIT PAS LE TOUR** : deux segments allumés seulement, et leur
  lueur est portée par le segment (`drop-shadow` sur `::after`) avant l'auréole
  d'ensemble. Une bordure lumineuse sur tout le périmètre est ce qui fait
  « gabarit gaming ».
- **La règle de la plaque doit porter le POIDS de `:is(#teamList, .cadreApercu)
  .teamRow.ready`** (1-2-0) pour effacer fond et filet de la ligne. Un `.cadre`
  nu (0-1-0) perd en silence — c'est ce qui laissait déjà l'ancien
  `border-color` du cadre sans aucun effet.
- **Pas de WebGL sous une plaque.** Le seul palier 3 existant est unique par
  invariant, le salon en affiche une poignée et l'écran des hauts faits douze :
  un contexte GL par plaque coûterait plus que ce que le CSS rend déjà
  (spectre balayé, reflet composité, nœud pulsé). L'accroche existe si le besoin
  vient — `.cadreEclat` est un élément vide, prêt à recevoir un canvas mutualisé.
- **L'insigne est un MASQUE CSS** (`--cadre-insigne`, data-URI), pas un `<svg>`
  injecté : les sites d'appel construisent des chaînes HTML, et un masque prend
  `var(--cadre)`, donc le spectre du Prismatique s'y applique sans cas
  particulier. La **lueur passe par `filter: drop-shadow`** et non `box-shadow` —
  `encoche` est un `clip-path`, qui découperait une ombre extérieure.
- **EN MANCHE, autour d'un nom, c'est un soulignement, jamais une boîte** : rien
  de décoratif ne se superpose au jeu, et une plaque couvrirait le sol, qui porte
  les télégraphes. Le cadre n'y gagne que ce qui ne coûte aucune surface — la
  **teinte**, et la **lueur** à partir du palier 2. Le fond, l'ornement et
  l'insigne restent aux menus.
- **Une invocation ne s'indexe pas sur `damageMul`, elle s'indexe sur l'indice de
  puissance ENTIER**, à exposant réduit (`CARD_CFG.SUMMON_SCALE`) : le tir gagne
  aussi la cadence, les dégâts bruts et le critique, donc une source qui ne lit
  que le multiplicateur de dégâts **décroche**. Point de passage `_summonMul(p)`.
- **Les légendaires sont garanties à des jalons et plafonnées**
  (`LEGENDARY_LEVELS`, `LEGENDARY_MAX`) ; le jalon se déclenche au premier écran
  ouvert **à partir du** niveau seuil. `legendaryLevelDone` vit dans `GameState`.
- **L'EXPÉRIENCE EST UNE VALEUR ÉCRITE PAR TYPE** (`ENEMY_TYPES[i].xp`), versée
  dans `_killEnemy` **avant** tout test de propriétaire. Le **boss crédite en
  continu** depuis `_damage()` (`BOSS_XP_BASE`), sans le surplus du coup fatal. Un
  ennemi **supprimé** ne crédite rien. `score` = valeur tactique.
- **LA VALEUR D'UN KILL S'INDEXE SUR LA MINUTE DE HORDE, jamais sur le niveau
  d'équipe** (`_xpTimeMul()`, `XP_MINUTE_GROWTH`) : indexer l'entrée d'une jauge
  sur sa propre sortie donne une boucle amortie mais **non mesurable**.
  `XP_LEVEL_GROWTH` reste à 1 — la clé documente le refus.
- **UN NIVEAU OUVRE SON ÉCRAN DE CARTES.** Seule exception : le **combat de
  boss**, où les niveaux restent en file. Pas de carte gratuite par boss ; le boss
  reste un point d'étape par la **qualité** de tirage (`BOSS_QUALITY`) et le
  marchand.
- **`computeMods()` ne connaît qu'un chargement et qu'un instant.** Ce qui dépend
  du temps ou des autres joueurs est résolu par `_recomputeMods()`. Elle fait
  **deux passes** : `apply(m, n)` puis `applyAfter(m, n, ctx)` pour les cartes
  conditionnelles.
- **« Cœur de forge » se rejoue à la MONTÉE DE NIVEAU** (`_addXp`). Toute prise de
  carte rejoue **toute la table** quand un « Vœu partagé » est en jeu.
- **Le serveur valide** : la classe choisie (hors emplacement unique pris, refusé
  pendant la manche à laquelle on participe — verrou posé au lancement, levé par
  `unlockClasses()`), et que la carte choisie figure bien dans les trois offertes.
- **La progression est commune à l'équipe** (`state.xp`/`state.level`), gains
  **normalisés sur l'effectif**. Un niveau ne donne rien d'autre qu'un choix de
  carte.
- **Le marchand est un CHOIX, comme l'écran de cartes** : `BUY_PER_VISIT` achat
  par visite (compteur `p.relicBought`, remis à zéro par `openMerchant()`),
  quatre offres tirées aux poids `RELIC_CFG.WEIGHT`, échéance qui **ferme sans
  forcer**, relique achetée **sort de l'offre courante**. Ce qui reste finance les
  **relances**, dont le prix croît **dans la visite** (`p.relicRerolls`,
  `relicRerollCost(niveau, dansLaVisite)`, point de passage `relicRerollPrice()`).
  Le tirage **filtre** sur `minPlayers` et `requiresSystem`. Le boss final clôt la
  manche : cinq visites au plus, pas six.
- **Les reliques vivent dans `p.relics`**, lues par les points d'application :
  dégâts bruts permanents dans `_flatDamage()` (lu par `_shoot()` **et**
  `_playerPower()` — toute source permanente entre dans `powerIndex`), flat boss dans
  `_damage()` (**avant** la redirection Jumeaux), flat PV dans `_recomputeMods()`,
  cadence dans `_players()`, vitesse en **remplaçant** `speedMul`, essaim en
  ajoutant à `mods.swarm`. Elles voyagent dans le champ `relics` du `loadout`.
- **UNE RELIQUE NEUVE PORTE UNE EXIGENCE OU UNE CONTREPARTIE**, jamais un
  pourcentage nu. Le catalogue couvrait les dégâts bruts sous huit formes et
  laissait vides le critique, le bouclier, la cadence, le contrôle, les
  explosions, la mobilité et la **ressource d'arme** — les sept archétypes que le
  plan 23 a ajoutés. Une relique sans condition ni coût est un « +5 % de tout »
  qui n'a pas de décision derrière lui.
- **`requiresArme` filtre l'offre sur l'ARME PORTÉE** (`ARME_EXIGENCE` dans
  `reliques.js`, prédicats sur la fiche d'`armes.js`). Une relique de chaleur sur
  un railgun, de chargeur sur un tesla, de critique sur une arme qui n'en a pas
  était un **emplacement d'offre perdu**, et rien ne le disait. Le filtre vit au
  même endroit que `minPlayers` — **et dans `visePalier()`**, sinon l'acheteur du
  banc vise un palier que le tirage ne peut pas lui montrer et relance à vide.
- **`verifierReliques()` MESURE deux choses** : que chaque champ apparaît comme
  littéral dans la source des méthodes de `GameState` — une relique se lit à un
  **point d'application**, donc un champ mal orthographié ou dont la lecture a
  été supprimée ne lève **rien** — et qu'un **malus porte sa `contrepartie`
  écrite**. Un nombre négatif n'est pas un malus : `rateFlat` descend quand la
  cadence monte, la liste des clés où le négatif coûte est explicite.
- **L'achat recalcule TOUJOURS** (`_recomputeAll()`). La liste des champs qui
  exigeaient un recalcul (`flatHp`, `allyFlatHp`) était à tenir à jour à la main,
  et la moitié des reliques neuves touche `mods` : un achat par visite, sur un
  écran, le recalcul complet ne coûte rien.
- **Le bannissement est PAR MANCHE** (décision du porteur, 2026-08-19 — il était
  permanent par compte depuis le lot J) : la clôture (`banClosure`, champ
  `dependsOn`) rejoint `p.locked` du `GameState` et meurt avec lui. Rien ne
  s'écrit au profil — `bannedCards` y est un champ mort, jamais relu. Bannir
  **consomme la phase** ; le bouton est **libre** (l'achat confort
  `bannissement` a disparu de la table — identifiant mort dans les profils qui
  l'avaient acheté). Pool vidé → carte de secours (`ravitaillement`).
- **UNE LIGNE PERMANENTE SE COUPE, ET LA COUPURE EST UNE LISTE D’EXCLUSION.**
  Les lignes de classe se déséquipent par les **emplacements** ; les **communes**
  n’en consomment aucun, donc rien ne les arrêtait — `sursis` régénérait chez qui
  voulait s’en passer. `profile.communOff` porte les identifiants **coupés** :
  le champ absent vaut **tout actif**, donc aucun profil n’a à migrer et rien ne
  se reverrouille. Le filtre vit dans `metaLinesFor`, **le** point de lecture du
  serveur, du HUD et de la fenêtre de build — le poser ailleurs ferait mentir
  l’un des trois. Couper n’est pas vendre : les paliers restent payés.
- **UN RECORD APPARTIENT À UN EFFECTIF AUTANT QU'À UNE DIFFICULTÉ.** La clé de
  `bestFinal` était la difficulté **seule** : un profil n'avait qu'un record par
  mode, et un bon temps à quatre **détruisait définitivement** le record solo.
  `players` était bien écrit — mais **après** la comparaison qui avait déjà décidé
  d'écraser, donc la donnée existait sans jamais servir au bon moment.
  `clefRecord(difficulty, players)` est le point de passage unique de la clé : le
  stockage, la migration et le classement la lisent de là.
- **UNE MANCHE D'ÉQUIPE EST UNE LIGNE, ET ELLE EN OCCUPAIT QUATRE.**
  `recordFinal` s'appelle **par profil** : deux bonnes manches à quatre
  consommaient huit places sur dix. Le regroupement se fait à l'**affichage**, sur
  `(difficulté, effectif, temps, date)` — chaque joueur garde son record personnel
  dans son profil, et le classement montre la manche une fois.
- **Le tampon horaire d'une manche se calcule UNE fois par manche, pas par
  joueur.** À la milliseconde près, quatre appels à `toISOString()` donnent quatre
  dates, et le regroupement ci-dessus ne prend plus. C'est la seule raison pour
  laquelle `quand` sort de la boucle d'`awardRun`.
- **`classement()` vit dans `progression.js`, pas dans `hub.js`.** C'est une
  lecture de `bestFinal` : la mettre avec sa donnée la rend appelable par un
  script de mesure sans monter un serveur — et un test qui rejoue l'algorithme au
  lieu de l'appeler est une seconde source de vérité.
- **Six champs sur sept étaient stockés puis jetés.** `level` et `biome`
  remontent : un temps sans contexte ne dit pas à quel prix il a été fait.
- **L'économie** : `coresForRun` **linéaire et plafonnée** (niveau × `CORE_LEVEL` +
  boss × `CORE_BOSS`, plafond `CORE_RUN_CAP`), **les jalons ne créditent jamais de
  noyaux**, les **emplacements se gagnent aux jalons** (`slotsFor(profile)`).
  Monnaie versée **à parts égales** (`awardRun`).


## Équilibrage

Toute la courbe de pression vit dans `CFG` en haut de `shared/game_state.js` :
on compare des réglages en surchargeant `CFG` depuis un script de mesure.

- **Remesurer plutôt qu'extrapoler.** Plusieurs ajustements de cette base se sont
  révélés contre-intuitifs à la mesure.
- **Pour juger une mécanique de boss, la bonne mesure est l'écart entre un joueur
  qui lit les annonces et un joueur qui les ignore.** Écart faible = mécanique
  punitive, pas difficile.
- **Toute mesure précise son profil de compte** : `metaProfil(profil, cls)` rend
  les trois profils de `PROFILS.md` (P0 neuf, P1 engagé, P2 complet) dans la forme
  exacte que `room.js` construit au lancement — **emplacements compris** : une
  ligne achetée mais non équipée ne s'applique pas, et les **cartes verrouillées**
  d'un compte neuf en font partie. Écart attendu **sous 1,5 vague** ; s'il dépasse,
  réduire le **nombre d'emplacements**, jamais les valeurs.
- **DEUX BOTS, ET ILS NE SE REMPLACENT PAS.** `botInput` est celui des lots A à H
  (il avance sur le corps le plus proche) : le toucher déplacerait toutes leurs
  mesures. `pilotage()` est le **pilote** du lot I — il recule, esquive les zones
  par `_zoneHits`, relève, ramasse et **consomme ses recharges**. Un critère de
  **survie** se mesure avec le pilote, un critère de **population** avec le bot.
  Un taux d'utilisation de compétence est la mesure du pilote, pas de la classe.
- **UNE POSTURE QUI COÛTE LE TIR NE SE TIENT PAS EN PERMANENCE.** Lier « dès qu'un
  allié n'est pas plein » fait perdre un tiers de la manche à la table 1/1/2
  (1 401 s contre 2 106). Et le seuil se lit sur les **PV seuls** : lire PV +
  bouclier paraît plus fin, mais le bouclier tient les alliés à plein, donc le
  déclencheur ne part jamais. Les deux variantes ont été mesurées, pas devinées.
- **Une matrice « classe × effectif » n'existe qu'en SOLO** : Rempart et Soigneur
  sont `unique`, donc au-dessus d'un joueur la comparaison est une **composition**
  (`COMPOSITIONS`), et « deux tanks deux soigneurs » n'est pas jouable.
- **Un taux de réussite absolu n'est pas mesurable sans pilote humain** : la
  matrice de `PROFILS.md` est le critère de clôture du plan, pas un critère de lot.
  Ce qui se mesure en simulation est le **relatif** — classe contre classe, profil
  contre profil, composition contre composition, à graines appariées.
- **Le plafond n'est plus le régulateur de fin de manche** (lot A) : il ne mord
  plus que dans trois cas sur neuf, tous après la minute 9. Ce qui règle le
  plateau est le **débit face à ce que l'équipe nettoie**. Contrainte =
  lisibilité, pas CPU — le moteur tient 1600 corps sous les 16 ms.
- Les chiffres relevés vivent dans `LISEZMOI.md` ; le chantier d'équilibrage en
  cours dans `docs/superpowers/specs/plan6/`.


## L archétype

- **Il est une LECTURE, jamais une règle.** Aucun bonus, aucun déblocage, aucun
  filtre de tirage : pure lecture de l état de build que le client a déjà. Un
  badge qui modifierait quoi que ce soit serait une classe cachée.
- **Il ne peut pas se déduire de `family`, et c est mesuré.** `family` est une
  **échelle verticale** (21 familles × 4 raretés) et 94 cartes sur 178 n en ont
  aucune — dont les cartes-graines. Surtout elle est **lourde** :
  `eligibleCards` refuse un palier inférieur à ce qu on possède, les armes
  filtrent dessus, `appliquerEchelle` la lit. Poser une famille sur une graine
  changerait **ce qui sort du tirage**. Un archétype cite donc des familles *et*
  des cartes nommées.
- **Les seuils sortent de la mesure.** Plafond tenable : sniper 13, forteresse
  10, berserker 8, démolition 8, acrobat 7, technicien 7, incendiaire 5 — mais
  4 des 13 du sniper et 4 des 8 de la démolition n arrivent **qu avec une arme
  précise**. Sans la grenade, la démolition tombe à 4. `verifierBuilds()` refuse
  donc tout seuil qu un archétype ne peut pas atteindre **sans** son arme.
- Le plus fragile est l **incendiaire** (plafond 5), pas l acrobat comme le
  supposait le plan 26.
