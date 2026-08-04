/* ===========================================================================
   EVENEMENTS
   Le piege du lot, tranche ici une fois pour toutes : SUR QUELLE HORLOGE ?

   Le client rend l'image avec 110 ms de retard sur le dernier snapshot recu.
   Declencher un son ou un tressaillement a la RECEPTION du snapshot le fait
   arriver un dixieme de seconde avant l'image correspondante — largement
   perceptible sur un impact, et impossible a rattraper ensuite.

   Donc : tout se declenche depuis la TIMELINE INTERPOLEE, jamais depuis
   `latest`. Le client compare deux snapshots consecutifs, en deduit les
   evenements, et ne les LIVRE qu'au moment ou l'horloge de rendu franchit le
   second des deux. Le son tombe alors pile sur l'image.

   Ce module est pur : aucun DOM, aucun contexte audio, aucun reseau. Le son et
   les particules le consomment tous les deux — c'est ce qui garantit qu'ils
   sont d'accord sur ce qui vient de se passer.
   =========================================================================== */

/* Au-dela de cet ecart entre deux snapshots, on ne diffuse RIEN et on avance
   simplement le curseur. C'est le cas apres un ecran de choix de carte : les
   deux snapshots qui l'encadrent different de tout, et les diffuser lachait
   d'un coup quarante morts, six montees de niveau et un mur de bruit. */
export const EVENT_GAP_MS = 500;

/* Plafonds par diffusion. Une bombe qui tue quarante ennemis dans le meme tick
   n'a pas besoin de quarante objets : les particules ont de toute facon leur
   propre plafond, et les eclairs blancs au-dela de la quarantaine se
   superposent sur une masse ou plus personne ne distingue rien. */
const MAX_IMPACT = 48;
const MAX_DEATH = 40;

/* Rend la liste des evenements survenus ENTRE deux snapshots consecutifs.
   `a` est le plus ancien, `b` le plus recent. `opts.myId` sert a n'extraire
   que ses propres degats sur le boss — le seul chiffre qu'on affiche. */
export function diffSnapshots(a, b, opts = {}) {
  const out = [];
  if (!a || !b) return out;
  if (b.recvAt - a.recvAt > EVENT_GAP_MS) return out;

  /* --- tir ---------------------------------------------------------------
     Les projectiles ne portent PAS leur proprietaire : un identifiant de plus
     sur chacune des quatre cents balles en vol, vingt fois par seconde, pour
     savoir lesquelles sont les miennes. On emet donc un seul evenement de tir
     par diffusion, quel que soit le nombre de balles apparues — la recharge
     par nom du module audio en fait de toute facon un crepitement et non une
     salve, et le tir est le dernier de la hierarchie de volume. */
  let firstNew = null;
  for (const [id, bu] of b.bullets) {
    if (!a.bullets.has(id)) { firstNew = bu; break; }
  }
  if (firstNew) out.push({ t: "tir", x: firstNew.x, y: firstNew.y });

  /* --- impacts et morts --------------------------------------------------
     L'impact se lit sur la PERTE DE PV et non sur la disparition d'une balle :
     les zones, les brulures et les ondes blessent sans projectile, et une
     confirmation qui ne vaut que pour les tirs apprend au joueur a ne pas s'y
     fier. */
  let nImpact = 0, nDeath = 0;
  for (const [id, eb] of b.enemies) {
    if (nImpact >= MAX_IMPACT) break;
    const ea = a.enemies.get(id);
    if (!ea) continue;
    /* NOMBRE DE TOUCHES. Le compteur du serveur est un chiffre cyclique : on lit
       une DIFFERENCE modulo 10, jamais une valeur absolue. C'est ce qui rend le
       flash exact — la perte de PV, elle, ne dit qu'une chose, « il a pris des
       degats », alors que trois balles sont tombees pendant les cinquante
       millisecondes de l'intervalle.

       Repli sur l'ancien comportement quand le compteur ne bouge pas mais que
       les PV baissent : c'est le cas d'un serveur anterieur, et celui d'un
       degat CONTINU (brulure, couronne) que le serveur ne compte volontairement
       pas comme une touche — un flash unique y reste la bonne lecture. */
    const hits = ((eb.hitSeq ?? 0) - (ea.hitSeq ?? 0) + 10) % 10;
    const lost = ea.hp - eb.hp;
    if (hits === 0 && lost <= 0) continue;
    // `maxHp` voyage avec l'impact : les chiffres de degats ne s'affichent
    // qu'au-dela de 5 % des PV de la cible, et ce seuil se juge sur la cible
    // et non dans l'absolu — cinq points sur un runner sont un evenement,
    // cinq points sur un tank ne sont rien.
    out.push({ t: "impact", id, x: eb.x, y: eb.y, dmg: Math.max(0, lost),
               hits: Math.max(1, hits), type: eb.type, maxHp: eb.maxHp });
    nImpact++;
  }
  for (const [id, ea] of a.enemies) {
    if (nDeath >= MAX_DEATH) break;
    if (b.enemies.has(id)) continue;
    /* Le COUP FATAL ne laisse aucune trace dans les PV : l'ennemi disparait
       entre deux instantanes, sans jamais montrer de valeur intermediaire. Le
       montant est donc ce qui lui restait au dernier instantane connu — c'est
       exactement ce que la balle lui a pris, aux degats de surplus pres, et
       c'est le chiffre le plus satisfaisant du jeu. */
    out.push({ t: "mort", id, x: ea.x, y: ea.y, type: ea.type, elite: ea.elite,
               dmg: Math.max(0, ea.hp), maxHp: ea.maxHp });
    nDeath++;
  }

  /* --- boss --------------------------------------------------------------- */
  if (b.boss) {
    if (!a.boss || a.boss.id !== b.boss.id) {
      out.push({ t: "boss", kind: b.boss.kind ?? 0, x: b.boss.x, y: b.boss.y });
    } else {
      if (b.boss.hp < a.boss.hp) {
        out.push({ t: "impact", boss: true, x: b.boss.x, y: b.boss.y,
                   dmg: a.boss.hp - b.boss.hp });
      }
      // La rupture de barre est l'evenement le plus important d'un combat :
      // elle a son propre son et son propre tressaillement.
      if ((b.boss.phase ?? 0) > (a.boss.phase ?? 0)) {
        out.push({ t: "barre", phase: b.boss.phase, x: b.boss.x, y: b.boss.y });
      }
    }
    /* Chiffres de degats : uniquement les SIENS, et uniquement sur le boss.
       Tout afficher a 200 ennemis rend l'ecran inutilisable, et sur la
       pietaille l'information n'a aucune valeur — on tue en un coup. */
    const mine = (b.bossDmg ?? []).find(d => d[0] === opts.myId);
    if (mine && mine[1] > 0) {
      /* `mine[2]` est la part critique, ajoutee en fin de tuple : un instantane
         agrege plusieurs touches, le chiffre dit donc « ce paquet contient un
         critique » et non « ce coup en etait un ».
         `mine[3]`/`mine[4]` est le POINT D'IMPACT, et il existe pour les seuls
         Jumeaux : ils partagent une reserve de vie, donc le serveur redirige tout
         sur le premier et le chiffre sortait sur lui quel que soit celui qu'on
         frappait. Repli sur la position du boss — c'est exactement ce qu'elle
         vaut pour les quatre autres, et le comportement d'un serveur anterieur. */
      out.push({ t: "degats", x: mine[3] ?? b.boss.x, y: mine[4] ?? b.boss.y,
                 dmg: mine[1], crit: (mine[2] ?? 0) > 0 });
    }
  }

  /* --- joueurs ------------------------------------------------------------ */
  for (const [id, pb] of b.players) {
    const pa = a.players.get(id);
    if (!pa) continue;
    if (!pa.downed && pb.downed) out.push({ t: "aterre", id, x: pb.x, y: pb.y });
    else if (pa.downed && !pb.downed) out.push({ t: "releve", id, x: pb.x, y: pb.y });

    /* Degats SUBIS et soins RECUS. Ils se deduisent de la vie du joueur, comme
       l'impact se deduit de celle de l'ennemi : rien de plus ne circule.

       Le soin merite son propre evenement parce que sans lui le soigneur ne
       sait pas s'il soigne — ses projectiles partent, ils touchent, et rien a
       l'ecran ne le confirme. C'est la seule classe du jeu dont l'action n'a
       aucun retour visible sans ce chiffre. */
    /* La PROVENANCE, elle, ne se deduit pas : une variation de PV ne dit jamais
       si c'est un contact, une zone ou une brulure. C'est le seul champ du
       tuple joueur que le client ne pourrait pas recalculer, et c'est la
       principale raison pour laquelle on ne comprenait pas ses morts. */
    if (pb.hp < pa.hp) {
      out.push({ t: "blesse", id, x: pb.x, y: pb.y, dmg: pa.hp - pb.hp,
                 src: pb.src ?? 0 });
    } else if (pb.hp > pa.hp && !pb.downed) {
      out.push({ t: "soigne", id, x: pb.x, y: pb.y, dmg: pb.hp - pa.hp });
    }
  }

  /* --- detonations de zone ------------------------------------------------
     Une zone detonne quand son annonce tombe a zero. Elle peut aussi
     DISPARAITRE dans le meme intervalle si le souffle tient en moins de 50 ms :
     les deux cas comptent, sinon les zones les plus breves — celles qui font le
     plus sursauter — seraient justement les seules muettes. */
  const zb = new Map(b.zones.map(z => [z.id, z]));
  for (const za of a.zones) {
    if (za.warn <= 0) continue;
    const z = zb.get(za.id);
    if (z && z.warn > 0) continue;
    const zz = z ?? za;
    out.push({ t: "explosion", x: zz.x, y: zz.y, r: zz.r, shape: zz.shape ?? 0 });
  }

  /* --- effets -------------------------------------------------------------
     Le registre des `kind` est celui de CLAUDE.md ; le client decide quoi en
     faire. Un effet est PONCTUEL : un identifiant nouveau, c'est un effet qui
     vient de naitre. */
  const fa = new Set(a.effects.map(f => f.id));
  for (const f of b.effects) {
    if (fa.has(f.id)) continue;
    out.push({ t: "effet", kind: f.kind ?? 0, x: f.x, y: f.y, r: f.r ?? 0 });
  }

  /* --- bonus ramasses -----------------------------------------------------
     Un bonus disparait quand il est ramasse, jamais autrement. Pas besoin de
     tester la distance a un joueur : le serveur ne les fait pas expirer. */
  const wb = new Set(b.powerups.map(w => w.id));
  for (const w of a.powerups) {
    if (!wb.has(w.id)) out.push({ t: "bonus", x: w.x, y: w.y, type: w.type });
  }

  /* --- progression commune ------------------------------------------------ */
  if ((b.teamLevel ?? 1) > (a.teamLevel ?? 1)) {
    out.push({ t: "niveau", level: b.teamLevel });
  }

  return out;
}

/* Curseur de diffusion. Il vit ici et non dans le client pour que la campagne
   de mesure puisse verifier, sans navigateur, qu'un evenement sort bien a
   l'image ou son etat devient visible et pas une image avant. */
export class EventPump {
  constructor(handler, opts = {}) {
    this.handler = handler;
    this.opts = opts;
    this.cursor = 0;           // recvAt du dernier snapshot deja diffuse
  }

  /* Remise a zero entre deux manches : sans elle, le premier snapshot d'une
     nouvelle manche se comparait au dernier de la precedente. */
  reset() { this.cursor = 0; }

  /* `renderTime` est l'horloge de rendu, soit `now - INTERP_MS`. On ne
     diffuse un snapshot que lorsqu'elle l'a FRANCHI : c'est tout le sujet du
     module. */
  pump(snapshots, renderTime) {
    if (snapshots.length < 2) return;
    // Premiere diffusion : on part du present, sinon toute la file en attente
    // se deverse d'un coup a la connexion.
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
