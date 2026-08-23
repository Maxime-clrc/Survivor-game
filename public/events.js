
export const EVENT_GAP_MS = 500;

const MAX_IMPACT = 48;
const MAX_DEATH = 40;

const PICKUP_NEAR = 80;
const BULLET_CLAIM = 90;
// une balle nait a `PLAYER_RADIUS + 2` et parcourt au plus un instantane avant
// d'etre vue : la marge couvre les deux, et reste tres en dessous des 260 px de
// la scission, qui est ce qu'elle doit exclure.
const TIR_PROCHE = 110;

// DEPUIS QUE LE SERVEUR FILTRE PAR VUE, UNE ABSENCE N'EST PLUS UNE MORT : un
// corps peut simplement etre sorti du champ. On ne compte l'evenement que si le
// corps etait DANS la vue, et la marge du serveur est plus large que celle-ci
// — un corps filtre est donc toujours au-dela, jamais dedans.
const VUE_MARGE = 140;
function dansVue(v, x, y) {
  if (!v) return true;
  return x >= v.x0 - VUE_MARGE && x <= v.x1 + VUE_MARGE
      && y >= v.y0 - VUE_MARGE && y <= v.y1 + VUE_MARGE;
}

export function diffSnapshots(a, b, opts = {}) {
  const out = [];
  if (!a || !b) return out;
  if (b.recvAt - a.recvAt > EVENT_GAP_MS) return out;

  const vue = opts.vue ?? null;

  // UN TIR EST UN DEPART, PAS UNE BALLE QUI APPARAIT. Une balle neuve loin de
  // son proprietaire n'est pas un coup parti : c'est une scission (le porteur du
  // fusil a dispersion s'ouvre a 260 px) ou une tourelle. Seul ce qui nait a la
  // bouche compte — et le compte est PAR PROPRIETAIRE : sans lui, quatre joueurs
  // portant quatre armes differentes rendaient un seul son anonyme toutes les
  // 50 ms, et l'identite sonore d'une arme etait impossible, pas mal reglee.
  const tirs = new Map();
  for (const [id, bu] of b.bullets) {
    if (a.bullets.has(id)) continue;
    if (!dansVue(vue, bu.x, bu.y)) continue;
    const p = b.players.get(bu.owner ?? 0);
    if (!p) continue;
    if ((p.x - bu.x) ** 2 + (p.y - bu.y) ** 2 > TIR_PROCHE * TIR_PROCHE) continue;
    const e = tirs.get(p.id);
    if (e) { e.n++; continue; }
    tirs.set(p.id, { n: 1 });
  }
  for (const [owner, e] of tirs) out.push({ t: "tir", owner, n: e.n });

  // [22] a QUI est ce coup. Rien ne le transporte : une balle disparue pres du
  // point d'impact le dit aussi bien, et ne coute pas un octet de reseau.
  const eteintes = [];
  for (const [id, bu] of a.bullets) {
    if (!b.bullets.has(id)) eteintes.push(bu);
  }
  /* UN PROJECTILE PERFORANT NE MEURT PAS SUR SA CIBLE. Le railgun et le fusil de
     precision traversent : aucune balle ne s'eteint, donc 38 % des impacts
     n'avaient aucun auteur — dont TOUS ceux de l'arme la plus directionnelle du
     jeu. Une balle qui a survecu et qui passe pres du coup l'explique aussi bien,
     et sa direction est EXACTE : deux positions, un pas de temps.
     Elle passe APRES les eteintes : une balle qui est morte la est une meilleure
     explication qu'une balle qui n'a fait que passer. */
  const perforants = [];
  for (const [id, bb] of b.bullets) {
    const ba = a.bullets.get(id);
    if (ba && (bb.x !== ba.x || bb.y !== ba.y)) perforants.push(ba, bb);
  }
  // un seul objet reutilise : `diffSnapshots` tourne 20 fois par seconde et
  // rendre un litteral par impact allouerait jusqu'a 48 objets par appel.
  const COUP = { owner: 0, dx: 0, dy: 0 };
  const coupDe = (x, y) => {
    COUP.owner = 0; COUP.dx = 0; COUP.dy = 0;
    let bd = BULLET_CLAIM * BULLET_CLAIM, mort = null;
    for (const bu of eteintes) {
      const d = (bu.x - x) ** 2 + (bu.y - y) ** 2;
      if (d < bd) { bd = d; mort = bu; }
    }
    if (mort) {
      COUP.owner = mort.owner ?? 0;
      // LA LIGNE DE TIR, et non le dernier pas : une balle vole droit depuis son
      // tireur, donc l'axe se lit sur des centaines de pixels au lieu des trente
      // d'un instantane — et il reste juste quand la balle meurt sur le corps.
      const p = b.players.get(COUP.owner);
      if (p) { COUP.dx = x - p.x; COUP.dy = y - p.y; }
      return COUP;
    }
    bd = BULLET_CLAIM * BULLET_CLAIM;
    for (let i = 0; i < perforants.length; i += 2) {
      const bb = perforants[i + 1];
      const d = (bb.x - x) ** 2 + (bb.y - y) ** 2;
      if (d >= bd) continue;
      bd = d;
      COUP.owner = bb.owner ?? 0;
      COUP.dx = bb.x - perforants[i].x; COUP.dy = bb.y - perforants[i].y;
    }
    return COUP;
  };

  // [26f] combien de mes critiques ont TUE pendant ce pas. Le compteur vit sur
  // le joueur : la victime, elle, a disparu de l'instantane.
  const moiA = opts.myId !== undefined ? a.players.get(opts.myId) : null;
  const moiB = opts.myId !== undefined ? b.players.get(opts.myId) : null;
  let critKills = moiA && moiB
    ? ((moiB.critKills ?? 0) - (moiA.critKills ?? 0) + 10) % 10
    : 0;
  const morts = [];

  let nImpact = 0, nDeath = 0;
  for (const [id, eb] of b.enemies) {
    if (nImpact >= MAX_IMPACT) break;
    const ea = a.enemies.get(id);
    if (!ea) continue;
    const hits = ((eb.hitSeq ?? 0) - (ea.hitSeq ?? 0) + 10) % 10;
    const crits = ((eb.critSeq ?? 0) - (ea.critSeq ?? 0) + 10) % 10;
    const lost = ea.hp - eb.hp;
    if (hits === 0 && lost <= 0) continue;
    const c = coupDe(eb.x, eb.y);
    // `hits` VAUT ZERO ET CE N'EST PAS UN DEFAUT : le serveur n'incremente pas
    // `hitSeq` pour un degat continu (`_damage(..., overTime)`), donc zero dit
    // « des PV sont partis sans que rien n'ait touche » — brulure, zone, poison.
    // Le forcer a un faisait passer 81 % des evenements pour des touches.
    out.push({ t: "impact", id, x: eb.x, y: eb.y, dmg: Math.max(0, lost),
               hits, crits, type: eb.type, maxHp: eb.maxHp,
               ang: eb.ang, owner: c.owner, dx: c.dx, dy: c.dy });
    nImpact++;
  }
  for (const [id, ea] of a.enemies) {
    if (nDeath >= MAX_DEATH) break;
    if (b.enemies.has(id)) continue;
    if (!dansVue(vue, ea.x, ea.y)) continue;
    const m = { t: "mort", id, x: ea.x, y: ea.y, type: ea.type, elite: ea.elite,
                ang: ea.ang, dmg: Math.max(0, ea.hp), maxHp: ea.maxHp, crit: false,
                owner: coupDe(ea.x, ea.y).owner };
    morts.push(m);
    out.push(m);
    nDeath++;
  }
  if (critKills > 0 && morts.length > 0 && moiB) {
    morts.sort((m, n) => ((m.x - moiB.x) ** 2 + (m.y - moiB.y) ** 2)
                       - ((n.x - moiB.x) ** 2 + (n.y - moiB.y) ** 2));
    for (const m of morts) {
      if (critKills-- <= 0) break;
      m.crit = true;
    }
  }

  if (b.boss) {
    if (!a.boss || a.boss.id !== b.boss.id) {
      out.push({ t: "boss", kind: b.boss.kind ?? 0, x: b.boss.x, y: b.boss.y });
    } else {
      if (b.boss.hp < a.boss.hp) {
        out.push({ t: "impact", boss: true, x: b.boss.x, y: b.boss.y,
                   dmg: a.boss.hp - b.boss.hp });
      }
      if ((b.boss.phase ?? 0) > (a.boss.phase ?? 0)) {
        out.push({ t: "barre", phase: b.boss.phase, x: b.boss.x, y: b.boss.y });
      }
    }
    const mine = (b.bossDmg ?? []).find(d => d[0] === opts.myId);
    if (mine && mine[1] > 0) {
      out.push({ t: "degats", x: mine[3] ?? b.boss.x, y: mine[4] ?? b.boss.y,
                 dmg: mine[1], crit: (mine[2] ?? 0) > 0 });
    } else if (mine) {
      // une touche sans degat : le palier. Elle RICOCHE, elle ne chiffre pas.
      out.push({ t: "ricochet", x: mine[3] ?? b.boss.x, y: mine[4] ?? b.boss.y,
                 cx: b.boss.x, cy: b.boss.y });
    }
  }

  for (const [id, pb] of b.players) {
    const pa = a.players.get(id);
    if (!pa) continue;
    if (!pa.downed && pb.downed) out.push({ t: "aterre", id, x: pb.x, y: pb.y });
    else if (pa.downed && !pb.downed) out.push({ t: "releve", id, x: pb.x, y: pb.y });

    if (pb.hp < pa.hp) {
      out.push({ t: "blesse", id, x: pb.x, y: pb.y, dmg: pa.hp - pb.hp,
                 src: pb.src ?? 0 });
    } else if (pb.hp > pa.hp && !pb.downed) {
      out.push({ t: "soigne", id, x: pb.x, y: pb.y, dmg: pb.hp - pa.hp });
    }

    // le bouclier ne coute RIEN de plus au reseau : sa pose et sa rupture sont
    // deux fronts sur une valeur deja transportee. La rupture est le moment ou
    // le joueur perd son tampon — elle merite d'etre un evenement, pas la
    // disparition silencieuse d'un cercle.
    const sa = pa.shield ?? 0, sb = pb.shield ?? 0;
    if (sa <= 0 && sb > 0) out.push({ t: "bouclierPose", id, x: pb.x, y: pb.y, v: sb });
    else if (sa > 0 && sb <= 0) out.push({ t: "bouclierBrise", id, x: pb.x, y: pb.y, v: sa });
    else if (sb < sa) out.push({ t: "bouclierTouche", id, x: pb.x, y: pb.y, v: sa - sb });
  }

  const zb = new Map(b.zones.map(z => [z.id, z]));
  for (const za of a.zones) {
    if (za.warn <= 0) continue;
    const z = zb.get(za.id);
    if (z && z.warn > 0) continue;
    const zz = z ?? za;
    out.push({ t: "explosion", x: zz.x, y: zz.y, r: zz.r, shape: zz.shape ?? 0 });
  }

  const fa = new Set(a.effects.map(f => f.id));
  for (const f of b.effects) {
    if (fa.has(f.id)) continue;
    out.push({ t: "effet", kind: f.kind ?? 0, x: f.x, y: f.y, r: f.r ?? 0,
               n: f.n ?? 0 });
  }

  const wb = new Set(b.powerups.map(w => w.id));
  for (const w of a.powerups) {
    if (wb.has(w.id)) continue;
    if (!dansVue(vue, w.x, w.y)) continue;
    let near = false;
    for (const [, p] of b.players) {
      if ((p.x - w.x) ** 2 + (p.y - w.y) ** 2 < PICKUP_NEAR * PICKUP_NEAR) { near = true; break; }
    }
    if (near) out.push({ t: "bonus", x: w.x, y: w.y, type: w.type });
  }

  // [3] la canalisation de recolte : une hauteur qui monte par paliers, puis
  // l'accord de liberation. Huit paliers — un son continu serait un mur.
  const hvA = new Map((a.harvests ?? []).map(h => [h.id, h]));
  for (const h of b.harvests ?? []) {
    if (h.kind !== 1) continue;
    const was = hvA.get(h.id);
    if (!was) continue;
    if (Math.floor(h.k * 8) > Math.floor(was.k * 8)) {
      out.push({ t: "recolte", x: h.x, y: h.y, k: h.k });
    }
  }
  for (const [id, h] of hvA) {
    if ((b.harvests ?? []).some(o => o.id === id)) continue;
    if (h.kind === 1 && h.k > 0.5) out.push({ t: "recolteFin", x: h.x, y: h.y });
  }

  const covA = new Map((a.cover ?? []).map(c => [c[0], c[1]]));
  for (const c of b.cover ?? []) {
    if (c[1] > 0 || (covA.get(c[0]) ?? 1) <= 0) continue;
    out.push({ t: "murDetruit", index: c[0] });
  }

  if (opts.hazards && opts.hazardState) {
    for (const h of opts.hazards) {
      const wasOn = opts.hazardState(h, a.tm).on;
      const st = opts.hazardState(h, b.tm);
      if (!wasOn && st.on) out.push({ t: "danger", kind: h.kind, x: st.x, y: st.y });
    }
  }

  if ((b.teamLevel ?? 1) > (a.teamLevel ?? 1)) {
    out.push({ t: "niveau", level: b.teamLevel });
  }

  if ((b.segment ?? 0) > (a.segment ?? 0)) {
    out.push({ t: "segment", segment: b.segment });
  }

  const avant = a.event ? a.event.id : -1;
  const apres = b.event ? b.event.id : -1;
  if (avant !== apres) {
    if (avant >= 0) out.push({ t: "evenementFin", event: avant });
    if (apres >= 0) out.push({ t: "evenementDebut", event: apres });
  }

  return out;
}

export class EventPump {
  constructor(handler, opts = {}) {
    this.handler = handler;
    this.opts = opts;
    this.cursor = 0;
  }

  reset() { this.cursor = 0; }

  pump(snapshots, renderTime) {
    if (snapshots.length < 2) return;
    if (this.cursor === 0) {
      this.cursor = snapshots[snapshots.length - 1].recvAt;
      return;
    }
    for (let i = 1; i < snapshots.length; i++) {
      const b = snapshots[i];
      if (b.recvAt <= this.cursor) continue;
      if (b.recvAt > renderTime) break;
      const evs = diffSnapshots(snapshots[i - 1], b, this.opts);
      for (const e of evs) this.handler(e);
      this.cursor = b.recvAt;
    }
  }
}
