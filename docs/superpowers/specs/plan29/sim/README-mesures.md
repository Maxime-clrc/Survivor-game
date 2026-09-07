# Protocoles de mesure du plan 30

Copier `pop5.mjs` a la RACINE du depot (a cote de `shared/`), puis :

    node pop5.mjs '[[1,1]]'                  # solo normal, minutes 1..30, fenetre 45 s
    node pop5.mjs '[[1,4]]'                  # 4 joueurs normal
    node pop5.mjs '[[2,4]]'                  # 4 joueurs cauchemar
    node pop5.mjs '[[1,1]]' '[25]' 300       # equilibre reel a la minute 25, fenetre 300 s

Arguments : `[[diffIndex, joueurs], ...]`, puis la liste des minutes cibles,
puis la duree de fenetre en secondes.

## Ce que le script fait, et pourquoi

Il ne joue pas une manche : il place l'horloge de horde a la minute voulue via
`(segment, beat)` — `hordeMinutes()` vaut `((segment-1)*300 + hordeTime)/60`,
donc regler `hordeTime` seul ne suffit pas et donne une population nulle.

Le boss est neutralise a chaque tick (`g.boss = null`). Sans cela on ne mesure
que `_bossAddCap()` (42 en solo) et jamais la horde, parce que `_spawner` se
coupe entierement pendant un boss.

Les bots sont immortels et kitent en cercle. Le mode « sans tir » force
`p.fireCd = 999` a chaque tick : l'ecart entre les deux modes EST la part de
population imputable a l'efficacite des armes.

La moyenne ne porte que sur les 60 % finaux de la fenetre, pour laisser
l'accumulation s'etablir.

## Piege connu

Modifier `g.boss.hp` directement NE TUE PAS le boss : la mort passe par le
chemin de degats du jeu. Un boss a PV negatifs reste actif indefiniment, et la
mesure retombe sur `_bossAddCap()` sans le signaler.

## Vérificateurs du depot a rejouer

    node -e 'import("./shared/game_state.js").then(m=>{const r=m.verifierEquilibreArmes(3,10); for(const l of r) console.log(l);})'

Environ 80 s. Etat au 2026-09-02 : 6 problemes sur 10 armes (laser +16 au-dessus
de sa cible ; precision, dispersion, siege, railgun, grenade en dessous).

    node -e 'import("./shared/game_state.js").then(m=>{console.log(m.verifierCartes(), m.verifierReliques(), m.verifierBonus());})'

Instantane. Etat au 2026-09-02 : les trois sont verts.
