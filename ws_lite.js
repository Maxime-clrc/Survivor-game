
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

const MAX_MESSAGE = 1 << 20;

const COMPRESS_MIN = 256;

const FLUSH_TAIL = Buffer.from([0x00, 0x00, 0xff, 0xff]);

function compressPayload(payload) {
  const out = deflateRawSync(payload, { level: 1, finishFlush: zconst.Z_SYNC_FLUSH });
  if (out.length < 4 || !out.subarray(out.length - 4).equals(FLUSH_TAIL)) return null;
  return out.subarray(0, out.length - 4);
}

export class WsConnection {
  constructor(socket, deflate = false) {
    this.socket = socket;
    this.open = true;
    this.onmessage = null;
    this.onclose = null;
    this.deflate = deflate;

    this.rtt = null;
    this._pingAt = 0;

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

  sendPrepared(prep) {
    if (!this.open) return;
    try {
      const ok = this.socket.write(this.deflate && prep.deflated ? prep.deflated : prep.plain);
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
    const stamp = Buffer.alloc(8);
    stamp.writeDoubleBE(Date.now());
    try { this.socket.write(encodeFrame(OP_PING, stamp)); } catch { this._shutdown(); }
  }

  close() {
    if (!this.open) return;
    try {
      this.socket.write(encodeFrame(OP_CLOSE, Buffer.alloc(0)));
      this.socket.end();
    } catch {  }
    this._shutdown();
  }

  _shutdown() {
    if (!this.open) return;
    this.open = false;
    try { this.socket.destroy(); } catch {  }
    if (this.onclose) this.onclose();
  }

  _onData(chunk) {
    this._buf = this._buf.length ? Buffer.concat([this._buf, chunk]) : chunk;

    while (this.open) {
      const frame = decodeFrame(this._buf, this.deflate);
      if (frame === null) break;
      if (frame === false) { this.close(); return; }

      this._buf = this._buf.subarray(frame.consumed);

      switch (frame.opcode) {
        case OP_PING:
          try { this.socket.write(encodeFrame(OP_PONG, frame.payload)); } catch { this._shutdown(); }
          break;

        case OP_PONG:
          if (frame.payload.length === 8) {
            const sample = Date.now() - frame.payload.readDoubleBE(0);
            if (sample >= 0 && sample < 60000) {
              this.rtt = this.rtt == null ? sample : this.rtt * 0.8 + sample * 0.2;
            }
          }
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

  if (rsv23 !== 0) return false;
  if (rsv1 && (!allowDeflate || (opcode !== OP_TEXT && opcode !== OP_BIN))) return false;
  if (!masked) return false;

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
  header[0] = 0x80 | (rsv1 ? 0x40 : 0) | opcode;

  return Buffer.concat([header, payload], header.length + len);
}

export function attachWebSocket(httpServer, onConnection) {
  httpServer.on("upgrade", (req, socket) => {
    const upgrade = String(req.headers.upgrade || "").toLowerCase();
    const key = req.headers["sec-websocket-key"];

    if (upgrade !== "websocket" || !key) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

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
    socket.setNoDelay(true);

    onConnection(new WsConnection(socket, deflate), req);
  });
}
