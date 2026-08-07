/* ===========================================================================
   WebSocket minimal (RFC 6455 + RFC 7692), sans dependance externe.
   Node n'expose pas de serveur WebSocket natif : plutot que d'imposer un
   npm install, on implemente le strict necessaire — poignee de main,
   lecture des trames masquees, ecriture des trames serveur, ping/pong,
   et permessage-deflate. Suffisant pour du JSON. Pas de TLS : le chiffrement
   est le travail du proxy inverse, pas celui de ce module.

   La compression est negociee SANS reprise de contexte des deux cotes
   (no_context_takeover) : chaque message se compresse et se decompresse
   seul. C'est ce qui permet de compresser un broadcast UNE fois et d'ecrire
   la meme trame sur toutes les sockets — un flux zlib par connexion aurait
   impose une compression par client, soit exactement le cout qu'on refuse
   (mesure : 0,31 ms par compression, une par salle et non une par joueur).
   Le prix est ~3 % de taux en moins, tres loin de justifier l'etat partage.
   =========================================================================== */

import { createHash } from "node:crypto";
import { deflateRawSync, inflateRawSync, constants as zconst } from "node:zlib";
import { PERF_ON } from "./perf.js";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

const OP_CONT  = 0x0;
const OP_TEXT  = 0x1;
const OP_BIN   = 0x2;
const OP_CLOSE = 0x8;
const OP_PING  = 0x9;
const OP_PONG  = 0xa;

const MAX_MESSAGE = 1 << 20;   // 1 Mo, garde-fou

/* Sous ce poids, la compression coute plus qu'elle ne rapporte : l'en-tete
   deflate et l'appel zlib ne se remboursent que sur les gros messages — en
   pratique les snapshots (7 Ko), qui sont precisement ce qu'on vise. */
const COMPRESS_MIN = 256;

/* Queue de vidage sync (RFC 7692 § 7.2.1) : l'emetteur la retire, le
   recepteur la remet avant d'inflater. */
const FLUSH_TAIL = Buffer.from([0x00, 0x00, 0xff, 0xff]);

function compressPayload(payload) {
  const out = deflateRawSync(payload, { level: 1, finishFlush: zconst.Z_SYNC_FLUSH });
  // Le vidage sync termine toujours par 00 00 ff ff ; on le retire comme
  // l'impose la RFC. S'il manque (jamais observe), on envoie non compresse
  // plutot que d'emettre une trame que le navigateur refusera.
  if (out.length < 4 || !out.subarray(out.length - 4).equals(FLUSH_TAIL)) return null;
  return out.subarray(0, out.length - 4);
}

export class WsConnection {
  constructor(socket, deflate = false) {
    this.socket = socket;
    this.open = true;
    this.onmessage = null;
    this.onclose = null;
    // Vrai si permessage-deflate a ete negocie a la poignee de main. Les
    // trames RSV1 ne sont acceptees que dans ce cas — hors negociation,
    // RSV1 reste une erreur de protocole, comme avant.
    this.deflate = deflate;

    /* Compteurs de diagnostic, remis a zero a chaque rapport par la salle.
       Deux entiers par connexion : ils sont poses inconditionnellement parce
       qu'un champ absent coute plus a tester qu'a initialiser. */
    this.perfBlocked = 0;
    this.perfQueueMax = 0;

    this._buf = Buffer.alloc(0);
    this._fragOp = 0;
    this._frags = [];
    this._fragLen = 0;
    this._fragCompressed = false;

    socket.on("data", chunk => this._onData(chunk));
    socket.on("error", () => this._shutdown());
    socket.on("close", () => this._shutdown());
    /* 'end' aussi, et ce n'est pas de la ceinture-bretelles : une socket
       d'upgrade HTTP ne re-emet pas toujours 'close' apres le FIN du pair
       (mesure : un client qui detruit sa connexion sans trame de fermeture ne
       produisait QUE 'end'). Un pair qui a dit FIN n'enverra plus jamais de
       trame — c'est une fin de connexion. Sans ca, le serveur gardait un
       client fantome jusqu'a la prochaine ecriture echouee, et le compteur de
       connexions par adresse IP ne redescendait jamais. */
    socket.on("end", () => this._shutdown());
  }

  send(str) {
    if (!this.open) return;
    try {
      const payload = Buffer.from(str, "utf8");
      if (this.deflate && payload.length >= COMPRESS_MIN) {
        const z = compressPayload(payload);
        if (z) { this.socket.write(encodeFrame(OP_TEXT, z, true)); return; }
      }
      this.socket.write(encodeFrame(OP_TEXT, payload));
    } catch {
      this._shutdown();
    }
  }

  /* Ecrit un message prepare par `prepareMessage` : la serialisation ET la
     compression ont deja eu lieu, une seule fois pour tout le broadcast. */
  sendPrepared(prep) {
    if (!this.open) return;
    try {
      const ok = this.socket.write(this.deflate && prep.deflated ? prep.deflated : prep.plain);
      /* Le retour de write() est IGNORE en production : il n'y a aucune
         backpressure dans ce module, un lien sature empile dans le tampon
         interne de Node — illimite, le highWaterMark de 16 Ko n'est qu'un
         signal. On se contente de le COMPTER (PERF=1) : c'est la mesure qui
         dit si la latence observee vient de la file d'envoi ou d'ailleurs.
         `writableLength` est releve meme quand write() a rendu true, sinon on
         ne verrait pas une file qui grossit sous le seuil. */
      if (PERF_ON) {
        if (!ok) this.perfBlocked++;
        if (this.socket.writableLength > this.perfQueueMax) {
          this.perfQueueMax = this.socket.writableLength;
        }
      }
    } catch {
      this._shutdown();
    }
  }

  ping() {
    if (!this.open) return;
    try { this.socket.write(encodeFrame(OP_PING, Buffer.alloc(0))); } catch { this._shutdown(); }
  }

  close() {
    if (!this.open) return;
    try {
      this.socket.write(encodeFrame(OP_CLOSE, Buffer.alloc(0)));
      this.socket.end();
    } catch { /* ignore */ }
    this._shutdown();
  }

  _shutdown() {
    if (!this.open) return;
    this.open = false;
    try { this.socket.destroy(); } catch { /* ignore */ }
    if (this.onclose) this.onclose();
  }

  _onData(chunk) {
    this._buf = this._buf.length ? Buffer.concat([this._buf, chunk]) : chunk;

    while (this.open) {
      const frame = decodeFrame(this._buf, this.deflate);
      if (frame === null) break;                 // trame incomplete, on attend la suite
      if (frame === false) { this.close(); return; }  // trame invalide

      this._buf = this._buf.subarray(frame.consumed);

      switch (frame.opcode) {
        case OP_PING:
          try { this.socket.write(encodeFrame(OP_PONG, frame.payload)); } catch { this._shutdown(); }
          break;

        case OP_PONG:
          break;

        case OP_CLOSE:
          this.close();
          return;

        case OP_TEXT:
        case OP_BIN:
          if (frame.fin) {
            this._deliver(frame.opcode, frame.payload, frame.rsv1);
          } else {
            this._fragOp = frame.opcode;
            this._frags = [frame.payload];
            this._fragLen = frame.payload.length;
            // RSV1 ne se pose que sur la PREMIERE trame d'un message (RFC
            // 7692) : on le retient ici pour la livraison finale.
            this._fragCompressed = frame.rsv1;
          }
          break;

        case OP_CONT:
          if (!this._fragOp) { this.close(); return; }
          this._frags.push(frame.payload);
          this._fragLen += frame.payload.length;
          if (this._fragLen > MAX_MESSAGE) { this.close(); return; }
          if (frame.fin) {
            const full = Buffer.concat(this._frags, this._fragLen);
            const op = this._fragOp;
            const compressed = this._fragCompressed;
            this._fragOp = 0;
            this._frags = [];
            this._fragLen = 0;
            this._fragCompressed = false;
            this._deliver(op, full, compressed);
          }
          break;

        default:
          this.close();
          return;
      }
    }
  }

  _deliver(opcode, payload, compressed) {
    if (opcode !== OP_TEXT || !this.onmessage) return;
    if (compressed) {
      /* no_context_takeover cote client aussi : chaque message s'inflate
         seul, aucun flux a maintenir. `maxOutputLength` borne la detente —
         sans elle, un message d'un kilo-octet pourrait se gonfler en
         gigaoctets (bombe zip) et le garde-fou MAX_MESSAGE ne verrait rien. */
      try {
        payload = inflateRawSync(Buffer.concat([payload, FLUSH_TAIL]), {
          finishFlush: zconst.Z_SYNC_FLUSH,
          maxOutputLength: MAX_MESSAGE,
        });
      } catch {
        this.close();
        return;
      }
    }
    this.onmessage(payload.toString("utf8"));
  }
}

/* Serialise un message UNE fois pour un broadcast : la trame claire toujours,
   la trame compressee seulement si elle en vaut la peine. `sendPrepared`
   choisit ensuite par connexion selon ce qui a ete negocie — c'est ce qui
   donne « une seule compression par salle, pas une par client ». */
export function prepareMessage(str) {
  const payload = Buffer.from(str, "utf8");
  const prep = { plain: encodeFrame(OP_TEXT, payload), deflated: null };
  if (payload.length >= COMPRESS_MIN) {
    const z = compressPayload(payload);
    if (z) prep.deflated = encodeFrame(OP_TEXT, z, true);
  }
  return prep;
}

function decodeFrame(buf, allowDeflate = false) {
  if (buf.length < 2) return null;

  const b0 = buf[0];
  const b1 = buf[1];
  const fin = (b0 & 0x80) !== 0;
  const rsv1 = (b0 & 0x40) !== 0;
  const rsv23 = b0 & 0x30;
  const opcode = b0 & 0x0f;
  const masked = (b1 & 0x80) !== 0;
  let len = b1 & 0x7f;
  let offset = 2;

  if (rsv23 !== 0) return false;        // RSV2/RSV3 : aucune extension ne les pose
  // RSV1 n'est licite que si permessage-deflate a ete negocie, et seulement
  // sur une trame de donnees (jamais sur un ping ni une continuation).
  if (rsv1 && (!allowDeflate || (opcode !== OP_TEXT && opcode !== OP_BIN))) return false;
  if (!masked) return false;            // un client DOIT masquer ses trames

  if (len === 126) {
    if (buf.length < offset + 2) return null;
    len = buf.readUInt16BE(offset);
    offset += 2;
  } else if (len === 127) {
    if (buf.length < offset + 8) return null;
    const big = buf.readBigUInt64BE(offset);
    if (big > BigInt(MAX_MESSAGE)) return false;
    len = Number(big);
    offset += 8;
  }

  if (len > MAX_MESSAGE) return false;
  if (buf.length < offset + 4 + len) return null;

  const mask = buf.subarray(offset, offset + 4);
  offset += 4;

  const payload = Buffer.allocUnsafe(len);
  for (let i = 0; i < len; i++) payload[i] = buf[offset + i] ^ mask[i & 3];

  return { fin, rsv1, opcode, payload, consumed: offset + len };
}

function encodeFrame(opcode, payload, rsv1 = false) {
  const len = payload.length;
  let header;

  if (len < 126) {
    header = Buffer.allocUnsafe(2);
    header[1] = len;
  } else if (len < 65536) {
    header = Buffer.allocUnsafe(4);
    header[1] = 126;
    header.writeUInt16BE(len, 2);
  } else {
    header = Buffer.allocUnsafe(10);
    header[1] = 127;
    header.writeBigUInt64BE(BigInt(len), 2);
  }
  // FIN + RSV1 eventuel + opcode, pas de masque cote serveur
  header[0] = 0x80 | (rsv1 ? 0x40 : 0) | opcode;

  return Buffer.concat([header, payload], header.length + len);
}

/* Branche la gestion des upgrades WebSocket sur un serveur HTTP existant. */
export function attachWebSocket(httpServer, onConnection) {
  httpServer.on("upgrade", (req, socket) => {
    const upgrade = String(req.headers.upgrade || "").toLowerCase();
    const key = req.headers["sec-websocket-key"];

    if (upgrade !== "websocket" || !key) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    /* Negociation permessage-deflate. On repond SANS reprise de contexte des
       deux cotes, quelles que soient les options offertes — c'est toujours une
       reponse licite a une offre permessage-deflate (RFC 7692 § 7.1.1), et
       c'est la condition du broadcast compresse une seule fois. Un client qui
       n'offre rien garde le protocole nu d'avant, trame pour trame. */
    const offers = String(req.headers["sec-websocket-extensions"] || "");
    const deflate = /(^|,)\s*permessage-deflate\b/.test(offers);

    const accept = createHash("sha1").update(key + GUID).digest("base64");
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      "Sec-WebSocket-Accept: " + accept + "\r\n" +
      (deflate
        ? "Sec-WebSocket-Extensions: permessage-deflate; " +
          "server_no_context_takeover; client_no_context_takeover\r\n"
        : "") +
      "\r\n"
    );
    socket.setNoDelay(true);   // desactive Nagle : indispensable pour du temps reel

    onConnection(new WsConnection(socket, deflate), req);
  });
}
