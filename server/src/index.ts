// Author: Ilya Zeldner

import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import https from "https";
import * as admin from "firebase-admin";
import { ExpressPeerServer } from "peer";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// CORS
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// PeerJS
const peerServer = ExpressPeerServer(server, {
  path: "/",
  allow_discovery: true,
} as any);
app.use("/peerjs", peerServer);

// STRICT SOCKET LOGIC
let io: Server;
const isProduction = !!process.env.RENDER_EXTERNAL_URL;

if (isProduction) {
  // 🌍 Render
  console.log("🌍 Render : Enforcing Pure WebSockets on Main Port");
  io = new Server(server, {
    cors: {
      // We explicitly allow requests from our Vercel Frontend
      origin: (origin, callback) => callback(null, true),
      credentials: true,
    },
    // 🔥 FORCE PURE WEBSOCKETS IN render TOO
    transports: ["websocket"],
  });
} else {
  // 💻 LOCALHOST (Dev)
  console.log("💻 Local Mode: Dedicated Socket Port 3002");
  const socketServer = http.createServer();
  io = new Server(socketServer, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      credentials: true,
    },
    transports: ["websocket"],
  });
  socketServer.listen(3002);
}

// Firebase setup
const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
if (serviceAccountVar) {
  try {
    const serviceAccount = JSON.parse(serviceAccountVar);
    serviceAccount.private_key = serviceAccount.private_key.replace(
      /\\n/g,
      "\n"
    );
    if (!admin.apps.length)
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
  } catch (e) {
    console.error("Firebase Error", e);
  }
}
const db = admin.firestore(); // Firestore Database Instance

// API Routes
app.get("/", (_req, res) => res.send("<h1>Server Online</h1>"));
app.get("/api/chat", async (_req, res) => {
  const s = await db.collection("messages").orderBy("timestamp", "asc").get();
  res.json(s.docs.map((d) => ({ id: d.id, ...d.data() })));
});
app.post("/api/chat", async (req, res) => {
  await db.collection("messages").add({ ...req.body, timestamp: new Date() });
  io.emit("chat-updated");
  res.json({ success: true });
});
app.delete("/api/chat", async (_req, res) => {
  const s = await db.collection("messages").get();
  const b = db.batch();
  s.docs.forEach((d) => b.delete(d.ref));
  await b.commit();
  io.emit("chat-updated");
  res.json({ success: true });
});

// SOCKET EVENTS
io.on("connection", (socket) => {
  console.log("⚡ Pure WebSocket Connected:", socket.id);

  socket.on("draw_line", (data) => {
    // Broadcast to everyone else
    socket.broadcast.emit("draw_line", data);
  });
});

// Keep Alive & Listen
const SELF_PING_URL = process.env.RENDER_EXTERNAL_URL;
function keepAlive() {
  if (!SELF_PING_URL) return;
  const protocol = SELF_PING_URL.startsWith("https") ? https : http;
  protocol.get(SELF_PING_URL, () => {}).on("error", console.error);
}

server.listen(PORT, () => {
  console.log(`🚀 Main Server running on port ${PORT}`);
  if (SELF_PING_URL) {
    setInterval(keepAlive, 13 * 60 * 1000);
    keepAlive();
  }
});
