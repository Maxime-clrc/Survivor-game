# 04 · Les sept sons, écrits en une fois

## Pourquoi ils sont tous ici alors que trois seulement servent dans ce plan

Parce que le dépôt a **déjà payé** le défaut inverse. Le commentaire d'`audio.js`
le raconte : *« treize bonus rendaient la même quinte montante »*, corrigés en une
seule fois par les trois matières.

Sept sons ajoutés séparément par sept lots différents ne feront pas une palette,
ils feront un bruit, et il faudra les refaire. Ils peuvent être approximatifs et
changer plus tard ; ils ne peuvent pas être écrits à sept moments différents.

Trois servent dans ce plan (borne, interaction, contrat), quatre servent plus tard
(ping, réveil du mini-boss, ramassage de loot, échec). Les quatre attendent leur
branchement, pas leur écriture.

## Les règles que la palette impose déjà

Elles sont dans les commentaires, et elles décident presque tout :

- **« la famille donne la matière, le RANG ajoute une quinte au-dessus, jamais du
  gain : *rare* se dit en hauteur, pas en volume »** — toute notion de rareté
  passe par la **hauteur** ;
- **« l'apparition est un appel, pas un gain : très court, très haut, très bas en
  gain »** (`bonusNe`) — ce qui naît ne dispute pas sa place à ce qu'on ramasse ;
- **une seule place de voix par famille**, même clef de limiteur ;
- **« le moment le plus tendu du jeu mérite le plus gros budget »** (`relevement`).

## Les sept, du plus contraint au plus libre

**1 · Le ping.** Le plus contraint : il doit percer deux cents corps. Famille
`annonce` — fondamentale grave plus quinte, deux notes, c'est la famille qui
coupe.

**Proposition : la hauteur porte l'identité du joueur.** Quatre joueurs, quatre
fondamentales. On entend **qui** appelle avant de regarder l'écran. C'est gratuit
et ça double la valeur du son.

**2 · Le réveil du mini-boss.** Bas, physique, pas musical — famille
`impactLourd` / `mur`, **pas** famille `annonce`. Il ne doit surtout pas sonner
comme un boss : le boss a son bandeau et sa musique, le mini-boss n'a que ça.
Court, sourd, sans résolution.

**3 · Le ramassage d'un loot.** Aucune invention : une **quatrième matière** à
côté des trois qui existent (corps, métal, masse), et **la rareté passe par la
quinte de rang** — mécanisme déjà écrit, déjà mesuré. La matière devrait être
**cristalline** : la seule des quatre qui ne soit ni organique, ni métallique, ni
massive.

**4 · Le contrat réussi.** Le seul des sept qui ait droit à un vrai budget. Entre
`recolteFin` et `hautFait` : il résout, il dure, mais il ne prend pas la place
d'un haut fait.

**5 · Le contrat accepté.** Famille `recolteFin` : trois notes qui montent et se
referment. Mais **plus petite que `hautFait`**, qui garde sa quinte tenue et son
accord ouvert. Accepter n'est pas accomplir.

**6 · L'échec ou l'expiration.** Le modèle existe : `aterre` descend de 520 à 120
en dents de scie, **sans résoudre**. Un contrat qui expire fait ça, en plus court.

**7 · Entrer dans le rayon d'interaction.** Le plus répété du lot, donc le plus
discret : une seule note, très courte, très basse en gain, **et une seule fois par
entrée** — pas tant qu'on est dedans. C'est celui qui agacera le premier s'il est
mal réglé.

**Et un huitième qui n'existera peut-être pas** : la borne repérée. `bonusNe`
conviendrait — très court, très haut, très bas. Mais le « ! » au-dessus fait déjà
le travail, et un son à chaque borne qui entre dans le champ deviendrait un
tic-tac. **À trancher en écoutant**, pas maintenant.

## Critère d'acceptation

1. Les sept sont écrits dans le même lot, dans `audio.js`, à côté de la famille
   dont ils héritent.
2. Aucun n'utilise le **gain** pour dire la rareté ou l'importance — la règle de
   la palette.
3. Le ping s'entend à 200 corps, avec la horde et un boss. Test à l'oreille, et il
   est nécessaire.
4. Le son d'entrée de rayon ne se répète pas tant qu'on reste dedans.
5. `verifierFeedback()` reste vert.

## Nature de la tâche

Composition. **Fil principal**, en une session, et il faut les écouter ensemble
avant de les brancher — c'est tout l'objet du lot.
