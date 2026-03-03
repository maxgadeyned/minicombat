/* eslint-disable no-console */
"use strict";

const { WebSocketServer } = require("ws");

const PORT = Number(process.env.PORT || 8787);

/** @type {Map<string, {host: import('ws').WebSocket, join: import('ws').WebSocket | null}>} */
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
  rooms.delete(code);
  const msg = reason || "Room closed";
  try { send(room.host, { type: "error", message: msg }); } catch (_) {}
  try { if (room.join) send(room.join, { type: "error", message: msg }); } catch (_) {}
  try { room.host.close(); } catch (_) {}
  if (room.join) {
    setTimeout(() => { try { room.join.close(); } catch (_) {} }, 100);
  }
}

const wss = new WebSocketServer({ port: PORT });
console.log(`[signaling] ws://localhost:${PORT}`);

wss.on("connection", (ws) => {
  console.log("[signaling] Client connected");
  ws._roomCode = null;
  ws._role = null; // "host" | "join"

  ws.on("message", (raw) => {
    let msg;
    try { msg = JSON.parse(String(raw)); } catch (_) { return; }
    if (!msg || typeof msg !== "object") return;

    if (msg.type === "createRoom") {
      console.log("[signaling] createRoom received, sending roomCreated");
      const code = createUniqueRoomCode();
      rooms.set(code, { host: ws, join: null, pendingSignals: [] });
      ws._roomCode = code;
      ws._role = "host";
      send(ws, { type: "roomCreated", code });
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

