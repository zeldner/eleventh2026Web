// Ilya Zeldner
import "dotenv/config";
import express, { Request, Response } from "express";
import http from "http"; // used for server
import { Server, Socket } from "socket.io";
import https from "https"; // used for ping on Render
import * as admin from "firebase-admin";
// This allows our local Vite (5173) and our  Vercel URL
const CLIENT_URL = process.env.CLIENT_URL;
const app = express();
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Mirror the origin: if we get a call from 5173, we say 5173 is allowed.
  if (origin) {
    // If there is an origin header
    res.setHeader("Access-Control-Allow-Origin", origin); // Allow that origin
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS"); // Allow these methods
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization"); // Allow these headers
  res.setHeader("Access-Control-Allow-Credentials", "true"); // Allow credentials

  // Instantly handle the Preflight "Knock"
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(express.json());

const server = http.createServer(app);

// SOCKET.IO UNIVERSAL ACCESS
const io = new Server(server, {
  cors: {
    // Instead of a string, use a function that validates the origin
    origin: (origin, callback) => {
      // This allows any origin to connect, solving the mismatch
      callback(null, true); // Allow any origin
    },
    methods: ["GET", "POST", "DELETE", "OPTIONS"], // Allow these methods
    credentials: true,
  },
  // Adding these helps with stability on local refreshes
  allowEIO3: true,
  transports: ["websocket", "polling"], // Allow polling
});

app.use(express.json()); // for parsing application/json

// FIREBASE INITIALIZATION
const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
if (serviceAccountVar) {
  try {
    const serviceAccount = JSON.parse(serviceAccountVar);
    // Solves "Invalid PEM" error by restoring newlines
    serviceAccount.private_key = serviceAccount.private_key.replace(
      /\\n/g,
      "\n"
    ); // Replaces escaped \\n with actual newlines

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      }); // Initialize Firebase
      console.log("✅ Firebase Connected Successfully");
    } // Check if Firebase is already initialized
  } catch (error) {
    console.error("❌ Firebase Init Error:", error);
  }
}
const db = admin.firestore(); // Initialize Firestore

// HTTP API ROUTES (Firebase Chat)

app.get("/", (_req, res) => {
  res.send(`
        <div style="font-family: sans-serif; text-align: center; padding-top: 50px;">
            <h1 style="color: #2ecc71;">🚀 Server: ONLINE</h1>
        </div>
    `);
}); // ROOT page for testing

// GET: Fetch messages from Firebase
app.get("/api/chat", async (_req: Request, res: Response) => {
  try {
    const snapshot = await db
      .collection("messages")
      .orderBy("timestamp", "asc")
      .get();
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id, // document ID
      ...doc.data(), // spread operator to get all fields
    }));
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ error: "Fetch failed" });
  }
}); // GET /api/chat to fetch messages

// POST: Save message & trigger Socket update
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { user, text } = req.body;
    await db.collection("messages").add({ user, text, timestamp: new Date() }); // Add new message to Firestore

    // Signal everyone to refresh chat list
    io.emit("chat-updated");

    res.status(201).json({ success: true });
  } catch (e) {
    res.status(500).json({ error: "Post failed" });
  }
});

// DELETE: Clear all messages & trigger Socket update
app.delete("/api/chat", async (_req: Request, res: Response) => {
  try {
    const snapshot = await db.collection("messages").get(); // Get all messages
    const batch = db.batch(); // Create a batch operation
    snapshot.docs.forEach((doc) => batch.delete(doc.ref)); // Delete all messages
    await batch.commit(); // Commit the batch operation

    // Signal everyone that the board is clean
    io.emit("chat-updated");

    console.log("🗑️ Database Cleared via DELETE");
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Delete failed" });
  }
});

// SOCKET.IO (Real-Time Board & Video)
io.on("connection", (socket: Socket) => {
  console.log("User Connected:", socket.id); // Log user connection ID

  // DRAWING BOARD
  socket.on("draw_line", (data) => {
    // Send to everyone EXCEPT the person who drew it
    socket.broadcast.emit("draw_line", data);
  });

  // VIDEO SIGNALING (WebRTC)
  socket.on("video-offer", (data) =>
    socket.broadcast.emit("video-offer", data)
  ); // Send to everyone EXCEPT the person who sent the offer
  socket.on("video-answer", (data) =>
    socket.broadcast.emit("video-answer", data)
  );
  socket.on("ice-candidate", (data) =>
    socket.broadcast.emit("ice-candidate", data)
  );

  socket.on("disconnect", () => console.log("User disconnected"));
});

// UNIVERSAL START & PING
const SELF_PING_URL = process.env.RENDER_EXTERNAL_URL;
const PORT = process.env.PORT || 3001;

function keepAlive(): void {
  if (!SELF_PING_URL) return;
  const protocol = SELF_PING_URL.startsWith("https") ? https : http;
  protocol
    .get(SELF_PING_URL, (res) => {
      res.on("data", () => {});
    })
    .on("error", (e) => console.log("Self-ping error:", e.message));
}

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  if (SELF_PING_URL) {
    setInterval(keepAlive, 13 * 60 * 1000); // Ping every 13 min
    keepAlive(); // Ping immediately
  }
});
