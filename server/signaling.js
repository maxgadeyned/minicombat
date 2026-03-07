/* eslint-disable no-console */
"use strict";

const { WebSocketServer } = require("ws");
const runGame = require("./runGame.js");

const PORT = Number(process.env.PORT || 8787);
const TICK_MS = 1000 / 60;
/** Send state every N ticks (1 = 60Hz, 2 = 30Hz). Higher = less bandwidth, slightly more latency. */
const STATE_SEND_INTERVAL = 1;

/** @type {Map<string, {host: import('ws').WebSocket, join: import('ws').WebSocket | null, pendingSignals: any[], state: any, loop: NodeJS.Timer | null, matchRunning: boolean, lastP1Bits: number, lastP2Bits: number, tickCount?: number}>} */
const rooms = new Map();

function randomCode(len = 5) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no O/0, I/1
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

function createUniqueRoomCode() {
  for (let i = 0; i < 1000; i++) {
    const code = randomCode(5);
    if (!rooms.has(code)) return code;
  }
  return randomCode(6);
}

function send(ws, obj) {
  if (!ws || ws.readyState !== ws.OPEN) return;
  ws.send(JSON.stringify(obj));
}

function cleanupRoom(code, reason) {
  const room = rooms.get(code);
  if (!room) return;
  if (room.loop) {
    clearInterval(room.loop);
  }
  room.state = null;
  rooms.delete(code);
  const msg = reason || "Room closed";
  try { send(room.host, { type: "error", message: msg }); } catch (_) {}
  try { if (room.join) send(room.join, { type: "error", message: msg }); } catch (_) {}
  try { room.host.close(); } catch (_) {}
  if (room.join) {
    setTimeout(() => { try { room.join.close(); } catch (_) {} }, 100);
  }
}

const wss = new WebSocketServer({ host: "0.0.0.0", port: PORT });
console.log(`[signaling] listening on port ${PORT} (ws://localhost:${PORT})`);

wss.on("connection", (ws) => {
  console.log("[signaling] Client connected");
  ws._roomCode = null;
  ws._role = null; // "host" | "join"

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(String(raw)); } catch (_) { return; }
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "createRoom") {
      const code = createUniqueRoomCode();
      console.log("[signaling] createRoom received, sending roomCreated code:", code);
      rooms.set(code, { host: ws, join: null, pendingSignals: [], state: null, loop: null, matchRunning: false, lastP1Bits: 0, lastP2Bits: 0 });
      ws._roomCode = code;
      ws._role = "host";
      const payload = { type: "roomCreated", code };
      send(ws, payload);
      return;
    }

    if (msg.type === "joinRoom") {
      const code = String(msg.code || "").trim().toUpperCase();
      const room = rooms.get(code);
      if (!room || !room.host) { send(ws, { type: "error", message: "Room not found" }); return; }
      if (room.join) { send(ws, { type: "error", message: "Room already full" }); return; }
      room.join = ws;
      ws._roomCode = code;
      ws._role = "join";
      send(ws, { type: "joined", code });
      send(room.host, { type: "peerJoined", code });
      // Forward any offers/ICE the host already sent while waiting for a joiner.
      for (const sig of room.pendingSignals || []) {
        send(ws, { type: "signal", data: sig.data });
      }
      room.pendingSignals = [];
      return;
    }

    // Game messages: server-authoritative sim (HaxBall-style).
    if (msg.type === "game") {
      const code = String(msg.code || ws._roomCode || "").trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) { send(ws, { type: "error", message: "Room not found" }); return; }
      const data = msg.data || {};

      if (data.t === "i") {
        if (ws === room.host) room.lastP1Bits = data.b | 0;
        else if (ws === room.join) room.lastP2Bits = data.b | 0;
        return;
      }
      if (data.t === "versusGo" && data.state) {
        room.state = data.state;
        room.matchRunning = true;
        room.lastP1Bits = 0;
        room.lastP2Bits = 0;
        if (room.join) send(room.join, { type: "game", data: { t: "versusGo", state: data.state } });
        if (!room.loop) {
          room.tickCount = 0;
          room.loop = setInterval(() => {
            if (!room.matchRunning || !room.state) return;
            try {
              room.state = runGame.step(room.state, room.lastP1Bits, room.lastP2Bits);
              room.tickCount = (room.tickCount || 0) + 1;
              if (room.tickCount % STATE_SEND_INTERVAL === 0) {
                if (room.host) send(room.host, { type: "game", data: { t: "state", state: room.state } });
                if (room.join) send(room.join, { type: "game", data: { t: "state", state: room.state } });
              }
            } catch (err) {
              console.error("[signaling] step error:", err);
            }
          }, TICK_MS);
        }
        return;
      }

      const target = ws === room.host ? room.join : room.host;
      if (target) send(target, { type: "game", data });
      return;
    }

    if (msg.type === "signal") {
      const code = String(msg.code || ws._roomCode || "").trim().toUpperCase();
      const room = rooms.get(code);
      if (!room) { send(ws, { type: "error", message: "Room not found" }); return; }
      const data = msg.data || {};

      const isHost = ws === room.host;
      const target = isHost ? room.join : room.host;
      if (!target) {
        // Host sent offer before joiner connected; buffer it.
        if (isHost) {
          room.pendingSignals = room.pendingSignals || [];
          room.pendingSignals.push({ data });
        } else {
          send(ws, { type: "error", message: "Peer not connected yet" });
        }
        return;
      }
      send(target, { type: "signal", data });
      return;
    }
  });

  ws.on("close", () => {
    const code = ws._roomCode;
    if (!code) return;
    const room = rooms.get(code);
    if (!room) return;
    if (ws === room.host) {
      cleanupRoom(code, "Host disconnected");
    } else if (ws === room.join) {
      room.join = null;
      send(room.host, { type: "peerLeft", code });
    }
  });
});

