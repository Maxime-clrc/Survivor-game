/* ===========================================================================
   WebSocket minimal (RFC 6455), sans dependance externe.
   Node n'expose pas de serveur WebSocket natif : plutot que d'imposer un
   npm install, on implemente le strict necessaire — poignee de main,
   lecture des trames masquees, ecriture des trames serveur, ping/pong.
   Suffisant pour du JSON sur un reseau local. Ce n'est pas une lib generale :
   pas de compression (permessage-deflate), pas de TLS.
   =========================================================================== */

import { createHash } from "node:crypto";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

const OP_CONT  = 0x0;
const OP_TEXT  = 0x1;
const OP_BIN   = 0x2;
const OP_CLOSE = 0x8;
const OP_PING  = 0x9;
const OP_PONG  = 0xa;

const MAX_MESSAGE = 1 << 20;   // 1 Mo, garde-fou

export class WsConnection {
  constructor(socket) {
    this.socket = socket;
    this.open = true;
    this.onmessage = null;
    this.onclose = null;

    this._buf = Buffer.alloc(0);
    this._fragOp = 0;
    this._frags = [];
    this._fragLen = 0;

    socket.on("data", chunk => this._onData(chunk));
    socket.on("error", () => this._shutdown());
    socket.on("close", () => this._shutdown());
  }

  send(str) {
    if (!this.open) return;
    try {
      this.socket.write(encodeFrame(OP_TEXT, Buffer.from(str, "utf8")));
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
      const frame = decodeFrame(this._buf);
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
            this._deliver(frame.opcode, frame.payload);
          } else {
            this._fragOp = frame.opcode;
            this._frags = [frame.payload];
            this._fragLen = frame.payload.length;
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
            this._fragOp = 0;
            this._frags = [];
            this._fragLen = 0;
            this._deliver(op, full);
          }
          break;

        default:
          this.close();
          return;
      }
    }
  }

  _deliver(opcode, payload) {
    if (opcode !== OP_TEXT || !this.onmessage) return;
    this.onmessage(payload.toString("utf8"));
  }
}

function decodeFrame(buf) {
  if (buf.length < 2) return null;

  const b0 = buf[0];
  const b1 = buf[1];
  const fin = (b0 & 0x80) !== 0;
  const rsv = b0 & 0x70;
  const opcode = b0 & 0x0f;
  const masked = (b1 & 0x80) !== 0;
  let len = b1 & 0x7f;
  let offset = 2;

  if (rsv !== 0) return false;          // pas d'extension negociee
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

  return { fin, opcode, payload, consumed: offset + len };
}

function encodeFrame(opcode, payload) {
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
  header[0] = 0x80 | opcode;   // FIN + opcode, pas de masque cote serveur

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

    const accept = createHash("sha1").update(key + GUID).digest("base64");
    socket.write(
      "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      "Sec-WebSocket-Accept: " + accept + "\r\n\r\n"
    );
    socket.setNoDelay(true);   // desactive Nagle : indispensable pour du temps reel

    onConnection(new WsConnection(socket), req);
  });
}
