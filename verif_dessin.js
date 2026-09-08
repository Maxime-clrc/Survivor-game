/* ===========================================================================
   LE DECOR SE DESSINE VRAIMENT, SUR LES CINQ LIEUX ET SUR UNE CARTE COMPOSEE.

   CHARGER UN MODULE NE SUFFIT PAS, ET C EST UNE FAUTE DEJA PAYEE. `verif_dom.js`
   attrape ce qui casse a l EVALUATION — une table qui reference un identifiant
   absent. Il ne peut rien dire de ce qui casse a l APPEL : un identifiant utilise
   DANS une fonction et jamais importe ne leve qu au moment ou cette fonction
   tourne. `drawGrid` a livre exactement ca (`biomeKey is not defined`), avec les
   cinquante-trois verificateurs au vert et les trente et un modules charges.

   ON APPELLE DONC. Un contexte de papier, une camera posee a la main, et chaque
   fonction du DECOR — celles qui prennent peu ou pas d arguments, donc celles
   qu on peut appeler sans inventer un monde. Ce n est pas un test de rendu : rien
   n est compare a une image. C est un test de CABLAGE, et c est le seul defaut
   que le reste de la suite laisse passer entier.

   CINQ LIEUX PLUS LA CARTE COMPOSEE, parce que tout ce qui se dessine ici est
   AIGUILLE PAR LIEU : `GRILLE`, `AMERS`, `FOND`, `VITRAGE`, `VIE`, `AMBIANCE`,
   `BLOC`, `DANGER`, `SOUFFLE`, `MATIERE`, `TABLE`, `ZONES`. Un seul lieu teste
   une branche sur six.
   =========================================================================== */

import { charger } from "./verif_dom.js";
import { BIOMES, CFG } from "./shared/game_state.js";
import { loisDe } from "./shared/biomes.js";

/* CE QU ON APPELLE, ET AVEC QUOI. La liste est explicite : une decouverte
   automatique par `draw*` appellerait des fonctions d ACTEURS qui demandent un
   monde entier, et un `catch` qui avale « argument manquant » ne verifierait plus
   rien. Ici chaque entree est un appel qui traverse VRAIMENT son corps. */
const APPELS = [
  ["decor", "drawFond", () => []],
  ["decor", "drawFloor", () => []],
  ["decor", "drawAmer", () => []],
  ["decor", "drawCoulee", () => []],
  ["decor", "drawBaies", () => []],
  ["decor", "drawGrid", () => []],
  ["decor", "drawObstacles", (m) => [m.obstacles]],
  ["decor", "drawWalls", () => [null]],
  ["decor", "drawArenaBounds", () => [{ x0: 0, y0: 0, x1: CFG.ARENA_W, y1: CFG.ARENA_H }]],
  ["decor", "drawWeather", () => [12]],
  ["decor", "drawBrume", () => [12]],
  ["decor", "drawAtmosphere", () => [12]],
  ["decor", "drawVignette", () => []],
  ["props", "drawProps", () => []],
  ["props", "drawTraces", () => []],
  ["dangers", "drawHazards", () => [12]],
  ["lumiere", "drawLumiere", () => [{ playerList: [], tm: 12 }]],

  /* ET CE QUI SE POSE SUR LE SOL. Le loot passe par les SEIZE fiches : chacune a
     son signe, donc son glyphe, et un glyphe absent ne se voit qu ici. La zone de
     contrat n existe que pour un objectif `OBJ_ZONE` — la lui donner est le seul
     moyen de traverser son corps. */
  ["actors", "drawLoots", (m) => [m.loots, 1]],
  ["actors", "drawContratZone", (m) => [m.contrat, m.joueurs]],
  ["actors", "drawBornes", (m) => [m.bornes, m.joueurs[0]]],
  ["actors", "drawPowerups", (m) => [m.bonus]],
  ["actors", "drawHarvests", (m) => [m.cristaux]],
];

/* UN MONDE DE PAPIER, POSE DANS LA VUE. Tout est dans le champ : un objet hors
   camera sort par `inView` et ne traverse pas son corps, donc il ne verifie
   rien. Les seize loots se posent en ligne — c est le seul moyen de passer par
   les seize signes. */
function mondeDePapier(obstacles, vx, vy) {
  const loots = [];
  for (let i = 0; i < 16; i++) {
    loots.push({ id: i + 1, loot: i, pj: i % 2 ? 1 : 0, k: i === 0 ? 0.05 : 1,
                 x: vx - 700 + i * 90, y: vy - 300 });
  }
  const joueurs = [{ id: 1, x: vx, y: vy, downed: false, hp: 100, maxHp: 100,
                     shield: 0, aimX: 1, aimY: 0, arme: 0, armeRes: 0.5,
                     armeAng: 0, buffs: 0, cls: 0, statuses: 0, vuln: 0, doom: 0,
                     cd1: 0, cd2: 0, cd3: 0, skills: 0, orbiters: 0, frostR: 0,
                     bombStock: 0, dashCd: 0, dashT: 0, revive: 0, level: 1 }];
  return {
    obstacles, loots, joueurs,
    // `def: 2` est « Position tenue », le seul contrat a OBJ_ZONE.
    contrat: { def: 2, rarete: 1, cur: 12, seuil: 30, t: 60, x: vx, y: vy },
    bornes: [{ id: 1, x: vx + 200, y: vy + 100, etat: 0, pret: 1 }],
    bonus: [{ id: 1, x: vx - 200, y: vy + 150, type: 0, k: 1 }],
    cristaux: [{ id: 1, x: vx + 300, y: vy - 150, kind: 0, v: 0.5 }],
  };
}

/* LA CAMERA SE POSE A LA MAIN. `updateCamera(dt)` lisse vers `predicted`, nul
   hors jeu, et rend une camera `NaN` qui cull tout en silence — donc un decor qui
   ne dessine rien et un verificateur qui ne verifie rien. */
function poser(stage, x, y) {
  stage.camera.x = x; stage.camera.y = y;
  stage.camera.x0 = x - CFG.VIEW_W / 2;
  stage.camera.y0 = y - CFG.VIEW_H / 2;
}

export async function verifierDessin(graines = [1, 7, 99]) {
  const soucis = [];
  const mod = {};
  for (const m of ["stage", "decor", "props", "dangers", "lumiere", "actors", "material"]) {
    try { mod[m] = await charger(`public/render/${m}.js`); }
    catch (e) { return [`render/${m}.js n a pas charge — ${e.message}`]; }
  }
  const stage = mod.stage;

  // LES CINQ THEMES. Une carte est d UN theme : ce qui varie dans une vue est la
  // loi d implantation, jamais le monde.
  const cas = BIOMES.map((b, i) => [b.key, i]);

  for (const [nom, idx] of cas) {
    for (const graine of graines) {
      for (const diff of [0, 1, 2]) {
        stage.setBiomeIndex(idx);
        stage.setBiomeSeed(graine);
        /* ET UNE METEO, SINON DEUX FONCTIONS SUR TROIS SORTENT AU PREMIER `if`.
           `drawWeather` et `drawBrume` rendent la main sur `weather` nul : sans
           ca elles etaient dans la liste sans jamais traverser leur corps. Le
           mode sert d index — trois modes, trois meteos, aucun tour de boucle
           en plus. */
        stage.setWeather({ id: diff, p1: 0.5 });
        stage.applyPalette(diff);
        stage.rebuildBiome(diff);
        /* NEUF POINTS DE VUE, ET LES RACCORDS EN FONT PARTIE. Sur une carte
           composee, ce qui casse casse au RACCORD : une vue au centre d une
           region ne traverse qu un seul jeu de tables.
           QUATRE NE SUFFISAIENT PLUS. Un theme porte jusqu a douze regions
           depuis le lot 31 : a quatre points de vue et trois graines, une region
           sur douze pouvait n etre atteinte par AUCUNE vue, et avec elle sa
           trace et ses props. Mesure : `TRACE_EMPREINTE` a disparu du balayage
           le jour ou le Secteur est passe a douze — la table etait juste, c est
           l echantillonnage qui ne l etait plus. Neuf vues coutent 0,1 s. */
        const PV = [];
        for (let i = 0; i < 3; i++) {
          for (let j = 0; j < 3; j++) {
            PV.push([CFG.VIEW_W / 2 + i * (CFG.ARENA_W - CFG.VIEW_W) / 2,
                     CFG.VIEW_H / 2 + j * (CFG.ARENA_H - CFG.VIEW_H) / 2]);
          }
        }
        for (const [vx, vy] of PV) {
          poser(stage, vx, vy);
          const monde = mondeDePapier(stage.obstaclesActifs(), vx, vy);
          for (const [m, fn, args] of APPELS) {
            const f = mod[m]?.[fn];
            if (typeof f !== "function") {
              soucis.push(`${m}.${fn} n est pas exporte`);
              continue;
            }
            try { f(...args(monde)); }
            catch (e) {
              soucis.push(`${nom}/${["calme", "normal", "cauchemar"][diff]}`
                + `/graine ${graine} : ${m}.${fn} leve — ${e.message}`);
            }
          }
        }
      }
    }
  }
  /* CHAQUE TRAITEMENT DE SOL SE CUIT VRAIMENT, ET PAS PAR CHANCE. La boucle
     ci-dessus ne voit que les regions que le tirage a posees sous ses quatre
     points de vue : sur cinq themes et trois graines, un traitement peut n etre
     jamais atteint, et une faute DANS sa fonction ne leve qu a l appel. On les
     cuit donc tous, explicitement. Le cache les garde ensuite. */
  const mat = mod.material;
  if (typeof mat?.floorPattern !== "function") {
    soucis.push("material.floorPattern n est pas exporte");
  } else {
    for (const [nom, idx] of cas) {
      for (let loi = 0; loi < loisDe(BIOMES[idx].key); loi++) {
        try { mat.floorPattern(stage.ctx, idx, 1, 7, 1, loi); }
        catch (e) { soucis.push(`${nom}/region ${loi} : cuisson du sol leve — ${e.message}`); }
      }
    }
  }

  /* ET LES VINGT PRIMITIVES DE TRACE SORTENT VRAIMENT. La boucle ci-dessus les
     traverse toutes si les tables sont justes ; quand elles ne le sont pas, rien
     ne leve — une trace declaree mais injoignable ne fait que ne pas exister.
     C est ce qui est arrive a deux d entre elles au lot 24. */
  const tr = mod.props?.tracesManquees;
  if (typeof tr !== "function") soucis.push("props.tracesManquees n est pas exporte");
  else {
    const manque = tr();
    if (manque.length) {
      soucis.push(`trace(s) ${manque.join(", ")} : ecrite(s) dans la table et`
        + " dessinee(s) par aucune des soixante vues");
    }
  }

  // une phrase par defaut, pas une par appel : la meme faute sort 216 fois.
  return [...new Set(soucis)];
}
