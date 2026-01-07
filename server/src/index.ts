// Author: Ilya Zeldner
import "dotenv/config";
import express from "express";
import http from "http";
import { Server } from "socket.io";
import https from "https";
import * as admin from "firebase-admin";
import { ExpressPeerServer } from "peer";
import cors from "cors";

const app = express(); // Express Server Initialization
const server = http.createServer(app); // HTTP Server for Express
const PORT = process.env.PORT || 3001; // Default Port 3001 for Localhost

// CORS for Express
app.use(cors({ origin: true, credentials: true })); // Allow Cross-Origin Resource Sharing
app.use(express.json()); // JSON Middleware for Express

// SOCKET.IO (INITIALIZE FIRST!)
// We MUST initialize this before PeerJS so
// it handles the 'upgrade' event first.
let io: Server;
const isProduction = !!process.env.RENDER_EXTERNAL_URL; // Render Mode
// '!!' : Cast to Boolean

if (isProduction) {
  // Render Mode
  console.log("🌍 Render Mode: Socket.io attached to Main Server (Priority 1)");
  io = new Server(server, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      credentials: true,
    }, // Allow Cross-Origin Resource Sharing
  }); // Initialize Socket.io Server
} else {
  console.log("💻 Local Mode: Socket.io on dedicated Port 3002");
  const socketServer = http.createServer(); // Dedicated Socket.io Server
  io = new Server(socketServer, {
    cors: {
      origin: (origin, callback) => callback(null, true),
      credentials: true,
    }, // Allow Cross-Origin Resource Sharing
    transports: ["websocket"], // Force WebSockets only
  }); // Initialize Socket.io Server
  socketServer.listen(3002); // Dedicated Port 3002
}

// PEERJS (INITIALIZE SECOND)
const peerServer = ExpressPeerServer(server, {
  path: "/",
  allow_discovery: true,
} as any); // PeerJS Express Server

app.use("/peerjs", peerServer); // PeerJS Middleware for Express

// FIREBASE
const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
if (serviceAccountVar) {
  try {
    const serviceAccount = JSON.parse(serviceAccountVar);
    serviceAccount.private_key = serviceAccount.private_key.replace(
      /\\n/g,
      "\n"
    ); // Fix for PEM error
    if (!admin.apps.length)
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      }); // Initialize Firebase with Service Account
  } catch (e) {
    console.error("Firebase Error", e);
  }
}
const db = admin.firestore(); // Initialize Firestore

// ROUTES & EVENTS
app.get("/", (_req, res) => res.send("<h1>Server Online</h1>")); // ROOT Route

app.get("/api/chat", async (_req, res) => {
  const s = await db.collection("messages").orderBy("timestamp", "asc").get();
  res.json(s.docs.map((d) => ({ id: d.id, ...d.data() })));
}); // GET Route

app.post("/api/chat", async (req, res) => {
  await db.collection("messages").add({ ...req.body, timestamp: new Date() });
  io.emit("chat-updated");
  res.json({ success: true });
}); // POST Route

app.delete("/api/chat", async (_req, res) => {
  const s = await db.collection("messages").get();
  const b = db.batch();
  s.docs.forEach((d) => b.delete(d.ref));
  await b.commit();
  io.emit("chat-updated");
  res.json({ success: true });
}); // DELETE Route

io.on("connection", (socket) => {
  console.log("⚡ Board Connected:", socket.id);
  socket.on("draw_line", (data) => {
    socket.broadcast.emit("draw_line", data);
  });
}); // Socket.IO Events

// KEEP ALIVE & LISTEN
const SELF_PING_URL = process.env.RENDER_EXTERNAL_URL; // Render Mode
function keepAlive() {
  if (!SELF_PING_URL) return;
  const protocol = SELF_PING_URL.startsWith("https") ? https : http;
  protocol.get(SELF_PING_URL, () => {}).on("error", console.error);
} // Keep-Alive Function

server.listen(PORT, () => {
  console.log(`🚀 Main Server running on port ${PORT}`);
  if (SELF_PING_URL) {
    setInterval(keepAlive, 13 * 60 * 1000);
    keepAlive();
  }
}); // Main Server Listen
