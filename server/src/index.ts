// Author: Ilya Zeldner
// Backend: Dual-Port Strategy for Pure WebSockets on Localhost

import "dotenv/config";
import express, { Request, Response } from "express";
import http from "http";
import { Server, Socket } from "socket.io";
import https from "https";
import * as admin from "firebase-admin";
import { ExpressPeerServer } from "peer";
import cors from "cors";

// MAIN SERVER (HTTP + PeerJS)
const app = express(); // Create Express app
const server = http.createServer(app); // Create HTTP server from Express
const PORT = process.env.PORT || 3001; // Default port

// CORS
app.use(cors({ origin: true, credentials: true })); // Allow cross-origin requests
app.use(express.json()); // Parse JSON bodies

// PEERJS (Video) - Runs on Main Server (3001)
const peerServer = ExpressPeerServer(server, {
  path: "/",
  allow_discovery: true,
} as any); // PeerJS config
app.use("/peerjs", peerServer); // Mount PeerJS

// SOCKET.IO (Drawing) - THE DUAL PORT STRATEGY
let io: Server;

if (process.env.RENDER_EXTERNAL_URL) {
  // PROD (Render): Run everything on ONE port (Standard)
  io = new Server(server, {
    cors: { origin: true, credentials: true },
    transports: ["websocket", "polling"],
  });
  console.log("🌍 Sockets attached to main server");
} else {
  // LOCAL (Dev): Run Sockets on a SEPARATE port (3002) to avoid PeerJS conflict
  const socketServer = http.createServer(); // Create a separate HTTP server
  const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";
  io = new Server(socketServer, {
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:3001",
        "http://localhost:3002",
        CLIENT_URL,
      ], // Allow these origins
      credentials: true, // Allow credentials
    },
    transports: ["websocket"], // PURE WEBSOCKETS ONLY!
  });
  socketServer.listen(3002, () => {
    console.log(
      "🎨 Socket Board running on Dedicated Port: 3002 (Pure WebSocket)"
    );
  });
}

// FIREBASE & ROUTES
const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT; // Firebase Service Account Key
if (serviceAccountVar) {
  try {
    const serviceAccount = JSON.parse(serviceAccountVar); // Parse JSON string
    serviceAccount.private_key = serviceAccount.private_key.replace(
      /\\n/g,
      "\n"
    ); // Replace escaped \\n with actual newlines
    if (!admin.apps.length)
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      }); // Initialize Firebase with Service Account
  } catch (e) {
    console.error("Firebase Error", e);
  }
}
const db = admin.firestore(); // Initialize Firestore database

app.get("/", (_req, res) => res.send("<h1>Server Online</h1>")); // ROOT: Verification page
app.get("/api/chat", async (_req, res) => {
  const s = await db.collection("messages").orderBy("timestamp", "asc").get();
  res.json(s.docs.map((d) => ({ id: d.id, ...d.data() })));
}); // GET ALL MESSAGES FROM DB
app.post("/api/chat", async (req, res) => {
  await db.collection("messages").add({ ...req.body, timestamp: new Date() });
  io.emit("chat-updated");
  res.json({ success: true });
}); // POST NEW MESSAGES TO DB
app.delete("/api/chat", async (_req, res) => {
  const s = await db.collection("messages").get();
  const b = db.batch();
  s.docs.forEach((d) => b.delete(d.ref));
  await b.commit();
  io.emit("chat-updated");
  res.json({ success: true });
}); // DELETE ALL MESSAGES

// SOCKET EVENTS
io.on("connection", (socket) => {
  console.log("Connected to Drawing Board:", socket.id);
  socket.on("draw_line", (data) => socket.broadcast.emit("draw_line", data));
}); // DRAWING LOGIC

// KEEP-ALIVE PING (Prevents Render from sleeping)
const SELF_PING_URL = process.env.RENDER_EXTERNAL_URL;

function keepAlive(): void {
  // Only ping if we have a URL (on render)
  if (!SELF_PING_URL) return;

  const protocol = SELF_PING_URL.startsWith("https") ? https : http;

  protocol
    .get(SELF_PING_URL, (resp) => {
      // Just a simple ping
      if (resp.statusCode === 200) {
        // console.log("✅ Self-Ping Successful"); // Debug
      }
    })
    .on("error", (err) => {
      console.error("❌ Self-Ping Failed:", err.message);
    });
}

// Start the server
server.listen(PORT, () => {
  console.log(`🚀 Main Server running on port ${PORT}`);

  // If we are on render , start the ping timer
  if (SELF_PING_URL) {
    console.log("⏰ Keep-Alive Timer Started");
    setInterval(keepAlive, 13 * 60 * 1000); // Ping every 13 minutes
    keepAlive(); // Ping immediately on start
  }
});
