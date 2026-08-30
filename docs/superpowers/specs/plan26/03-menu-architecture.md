# 03 · Menu — refonte de l'architecture (brief §5)

## Ce qui existe déjà

- `public/ui/screens.js` gère déjà une liste d'écrans structurée
  (`ECRANS`, `TOPBAR_SCREENS`, `MASQUE_SCREENS`) avec transitions croisées
  (280 ms sortie / 380 ms entrée, mesuré au plan 25) et un système de son de
  navigation (`UI_SOUND_SCREENS`, `UI_CLICK_SCREENS`). **L'infrastructure de
  transition existe et fonctionne** (le plan 25 l'a mesurée « déjà réglée »)
  — le chantier ne réinvente pas les transitions, il réorganise ce qui
  s'accroche à l'infrastructure existante.
- 14 écrans recensés au plan 25, avec une checklist connue de **9 points
  d'enregistrement** par écran (dom.js, observateur, fil/masque, son, entrée
  css, sortie css, balayage, curseur — et un neuvième implicite : le
  topbar). C'est la checklist à appliquer à tout nouvel écran de ce plan
  (Bestiaire notamment).

## Limite actuelle

Le brief demande une hiérarchie claire entre Jouer, Arsenal/Build,
Progression, Collection, Bestiaire, Hauts faits, Paramètres — cette
hiérarchie n'existe pas encore en tant que structure de navigation : les
écrans actuels (`menu`, `hubScreen`, `panel`, `settings`, `hautsFaits`) sont
une liste plate d'écrans indépendants, pas un arbre avec des sections.

## Cible

Une arborescence à deux niveaux : un hub (`hubScreen`, déjà présent) avec des
sections déjà nommées par le brief, chaque section ouvrant un écran existant
ou nouveau sans changer le mécanisme de transition sous-jacent.

## Décomposition

1. **Définir l'arbre avant les écrans** (demande explicite du brief §19.10) :
   - Jouer → lancement de partie (existant)
   - Arsenal/Build → `panel`/`build` existants, regroupés visuellement
   - Progression → écran de progression méta existant (`shared/progression.js`
     déjà riche : arbres, noyaux, jalons)
   - Collection → nouveau point d'entrée commun pour Bestiaire (nouveau) et
     tout futur contenu de collection
   - Bestiaire → nouvel écran, voir `01-bestiaire-codex.md`
   - Hauts faits → écran existant, à réparer d'abord (`04-hauts-faits.md`)
   - Paramètres → `settings` existant ; le plan 25 note que le palier
     graphique et le confort n'y sont pas alors qu'ils devraient l'être —
     ce chantier est l'occasion de corriger ce classement en même temps que
     la hiérarchie change.
2. **Étendre `ECRANS`/`TOPBAR_SCREENS`** pour porter cette hiérarchie (parent/
   section) sans dupliquer le mécanisme de transition — un écran de section
   est un `ECRANS` de plus, pas un système différent.
3. **États actif/inactif et hiérarchie visuelle** — travail de
   `public/ui/dom.js` + CSS (`menus.css`), sur la base des cadres déjà
   utilisés pour les hauts faits (`CADRES` dans `shared/hauts_faits.js`,
   déjà pensés comme un langage visuel de rareté/progression réutilisable).
4. **Appliquer la checklist des 9 points à chaque écran, existant ou
   nouveau**, en particulier au moment de rattacher Hauts faits et Bestiaire
   à la nouvelle arborescence — c'est le point exact où le bug du plan 25
   s'est produit.

## Fichiers à modifier

- `public/ui/screens.js` (ossature de navigation)
- `public/ui/dom.js` (références DOM des nouvelles sections)
- `public/ui/cadres.js` (si les cadres de hauts faits sont réutilisés comme
  langage visuel commun)
- CSS de menu (non listé dans l'extraction ci-dessus — repérer via
  `public/css/`)
- `docs/regles/RENDU.md` (la carte « où vit un écran » doit refléter la
  nouvelle arborescence)

## Ordre de dépendance

Ce chantier doit être fait **avant** la refonte visuelle des Hauts faits et
avant l'ajout du Bestiaire (ils s'accrochent à l'arbre qu'il définit), mais
**après** la réparation structurelle de `#hautsFaits` (sinon on rattache un
écran cassé à la nouvelle hiérarchie).

## Risque

Purement UI/lisibilité — aucun risque réseau ou simulation. Le risque réel
est la régression sur les 14 écrans existants : valider la checklist des 9
points sur chacun après le remaniement, pas seulement sur les écrans
touchés.
