# Lot O — Numéro de version affiché

Aucune dépendance. **À faire en premier** : neuf lots de changements vont être déployés
successivement, et la première question à poser à un joueur qui signale un défaut est
« quelle version tu joues ». Aujourd'hui rien à l'écran ne le dit, et le champ `version`
de `package.json` (0.6.0) n'est lu par personne.

---

## O1. Source unique : `shared/version.js`

Module **pur**, sur le modèle de `units.js` : il n'exporte qu'une chaîne et ne dépend de
rien. Le serveur **et** le navigateur l'importent par le même chemin — `resolvePath()`
dans `server.js` route déjà `/shared/*` depuis la racine du dépôt, c'est exactement ce
qui permet au client d'importer les mêmes modules que le serveur.

```js
/* shared/version.js — LA source de verite de la version.
   Module pur : aucune dependance, importe par le serveur ET le navigateur. */
export const VERSION = "0.7.0";
```

Aucun message nouveau, aucun accès disque, aucune duplication.

### Le champ de `package.json` devient décoratif

Le paquet est `private` et n'est jamais publié : personne ne lit son `version`. Pour qu'il
ne mente pas en silence, `server.js` le compare à `shared/version.js` au démarrage et
**journalise** s'ils divergent.

Un garde-fou d'une ligne, **pas une seconde source de vérité** : le serveur ne lit jamais
`package.json` pour connaître la version, seulement pour vérifier qu'il est d'accord.

---

## O2. Ce que la fonctionnalité doit vraiment attraper : l'onglet périmé

Un numéro de version seul ne détecte pas le cas réel.

Les fichiers sont déjà servis en `Cache-Control: no-store` (`server.js`), donc **aucune
requête ne ramène du vieux code**. Mais un onglet **laissé ouvert** pendant un
redéploiement continue de faire tourner le code chargé la veille — et c'est précisément ce
qui produit les rapports de bug incompréhensibles.

D'où deux versions comparées, et c'est tout l'intérêt du lot :

| origine | ce qu'elle dit |
|---|---|
| `VERSION` importée par `client.js` | la version du **code que cet onglet exécute** |
| clé `version` du message `welcome` | la version du **serveur** |

- identiques → la version s'affiche sobrement ;
- différentes → elle passe en **ambre** avec « recharge la page ».

L'ambre n'est pas un choix esthétique : c'est la couleur de l'**avertissement** dans la
grammaire du dépôt (*« ambre : danger, sortir »* — ici, sortir de cet onglet), et un
onglet périmé en est un. Pas de rouge : rien n'est létal, et *« jamais de rouge pour
quelque chose où il faut aller »*.

### Protocole

`welcome` gagne **une clé nommée**, à côté de `id`, `pseudo`, `token?` et `dup`
(`hub.js`, dans `finishAuth`). Envoyée **une fois par connexion**.

- Aucun changement de snapshot.
- Aucun registre ordonné touché.
- Un client d'avant le lot ignore la clé et continue de fonctionner ; un client d'après
  le lot connecté à un serveur d'avant le lot voit `undefined` et n'affiche alors **aucun
  avertissement** — l'absence n'est pas un désaccord.

---

## O3. Placement et charte

L'élément est du **DOM**, couche écran. Frère des écrans et non leur contenu — comme
`#hud` est le frère de `#arena`.

- **Bas à droite.** Sans collision avec l'overlay `?perf`, qui est en bas à gauche.
- **Masqué pendant une manche.** La règle est explicite : *« rien de décoratif ne se
  superpose au jeu »*. Un numéro de version est décoratif en combat. Il reste visible sur
  `#gate`, le hub, le salon, le bilan et le menu pause — c'est-à-dire à tous les moments
  où on lit l'écran, et notamment celui où on va le recopier dans un rapport.
- **11 px**, le plus petit cran de l'échelle typographique fixe
  (11 / 13 / 15 / 19 / 26 / 34 / 46). Aucune valeur ad hoc.
- **Couleur depuis `palette.js`**, jamais en dur dans `ui.css` — une couleur écrite dans
  une feuille de style est un bug dans ce dépôt. Un ton de texte discret pour le cas
  normal, `SIGNAL` ambre pour le désaccord.
- **Espacement sur la grille de 4 px** : décalage de 8 px des deux bords.
- **Non sélectionnable ni cliquable** (`pointer-events: none`) : il ne doit jamais
  intercepter un clic destiné à un bouton d'écran.

---

## O4. Fichiers touchés

| fichier | ce qui change |
|---|---|
| `shared/version.js` | **nouveau** — la constante `VERSION`, et rien d'autre |
| `server.js` | garde-fou au démarrage : compare `package.json` à `VERSION`, journalise si désaccord |
| `hub.js` | clé `version` ajoutée au message `welcome` |
| `public/index.html` | `#version`, frère des écrans, en fin de `body` |
| `public/client.js` | importe `VERSION`, compare à `msg.version` sur `"welcome"`, bascule l'affichage aux transitions d'écran |
| `public/css/ui.css` | position, taille, `pointer-events` — aucune couleur |
| `shared/palette.js` | rien à ajouter si un ton de texte discret existe déjà ; sinon une entrée |

---

## O5. Option laissée à l'opérateur

Ajouter le **hash court du commit** (`git rev-parse --short HEAD`) au démarrage, concaténé
à la version affichée. Un seul appel `child_process` au boot, jamais par requête, et le
dépôt reste sans dépendance.

Utile sur un VPS déployé par `git pull` — deux déploiements peuvent partager la même
version de `package.json`. Inutile en LAN. D'où le choix laissé ouvert plutôt que tranché
ici.

Si l'option est prise : le hash est **ajouté au message `welcome`**, pas à
`shared/version.js`, qui doit rester une constante littérale lisible par le navigateur.

---

## O6. Mesures

| mesure | attendu |
|---|---|
| poids ajouté au message `welcome` | quelques octets, une fois par connexion |
| coût du garde-fou de démarrage | une lecture de fichier au boot, jamais en régime |
| impact sur le HUD en combat | **nul** : l'élément est masqué |

---

## O7. Critères d'acceptation

- Le numéro de version est visible sur l'écran d'entrée, le hub, le salon, le bilan et le
  menu pause.
- Il est **absent pendant une manche**.
- Sa taille est de 11 px et sa couleur provient de `palette.js` — aucune couleur en dur
  dans `ui.css`.
- Modifier `shared/version.js`, relancer le serveur **sans recharger l'onglet** affiche la
  mention ambre « recharge la page ».
- Recharger l'onglet fait disparaître la mention.
- `package.json` désaccordé de `shared/version.js` produit une **ligne de journal au
  boot**, jamais un échec silencieux et jamais un refus de démarrer.
- Un client resté sur une version antérieure au lot reste jouable : la clé `version` du
  `welcome` est simplement ignorée.
- L'élément n'intercepte aucun clic destiné à un bouton d'écran.
