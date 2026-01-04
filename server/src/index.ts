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

// CORS for Express
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// SOCKET.IO (INITIALIZE FIRST!)
// We MUST initialize this before PeerJS so
// it handles the 'upgrade' event first.
let io: Server;
const isProduction = !!process.env.RENDER_EXTERNAL_URL;

if (isProduction) {
  console.log("🌍 Render Mode: Socket.io attached to Main Server (Priority 1)");
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      credentials: true,
    },
  });
} else {
  console.log("💻 Local Mode: Socket.io on dedicated Port 3002");
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

// PEERJS (INITIALIZE SECOND)
const peerServer = ExpressPeerServer(server, {
  path: "/",
  allow_discovery: true,
} as any);

app.use("/peerjs", peerServer);

// FIREBASE
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
const db = admin.firestore();

// ROUTES & EVENTS
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

io.on("connection", (socket) => {
  console.log("⚡ Board Connected:", socket.id);
  socket.on("draw_line", (data) => {
    socket.broadcast.emit("draw_line", data);
  });
});

// KEEP ALIVE & LISTEN
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
