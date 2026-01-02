// Ilya Zeldner
import express, { Request, Response } from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import * as admin from "firebase-admin";
import dotenv from "dotenv"; // Needed for dotenv
import path from "path"; // Needed for path.resolve

dotenv.config();

const app = express(); // Create Express App
const PORT = process.env.PORT || 3001; // Set Port

// Setup Middleware
// We allow requests from ANYWHERE (*) because Vercel (our frontend)
// needs to talk to this server.
app.use(cors({ origin: "*" }));
app.use(express.json());

// Setup Firebase (Loading for Render)
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // for Render
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT); // Parse JSON
    console.log("✅ Loaded Firebase config from Environment Variable");
  } catch (error) {
    console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env var.");
  }
} else {
  try {
    serviceAccount = require(path.resolve(
      // for Local Development
      __dirname, // Current Directory
      "../serviceAccountKey.json" // JSON File Access
    ));
    console.log("✅ Loaded Firebase config from Local File");
  } catch (error) {
    console.warn("⚠️ No local 'serviceAccountKey.json' found.");
  }
}

if (serviceAccount && !admin.apps.length) {
  // Initialize Firebase
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount), // Service Account
  });
}
const db = admin.firestore(); // Firestore Database

// Create Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", //  for Vercel connection
    methods: ["GET", "POST"], // Only allow GET and POST
  },
});

// ROUTES

app.get("/", (req, res) => {
  res.send(
    "<h1>Server is Running! 🚀</h1><p>The Frontend is hosted on Vercel.</p>"
  );
});

app.get("/api/chat", async (req: Request, res: Response) => {
  try {
    const snapshot = await db
      .collection("chats") // Collection Name
      .orderBy("createdAt", "desc") // Sort by createdAt desc
      .limit(50) // Limit to 50 messages
      .get(); // Get messages
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(), // Spread data from doc
    }));
    res.json(messages.reverse()); // Send messages to client
  } catch (error) {
    res.status(500).json({ error: "DB Error" });
  }
});

app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { text, user } = req.body; // Get text and user
    await db.collection("chats").add({
      // Add message
      text, // Text from req.body
      user, // User from req.body or "Anonymous"
      createdAt: admin.firestore.FieldValue.serverTimestamp(), // Timestamp from Firestore
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "DB Error" });
  }
});

app.delete("/api/chat", async (req: Request, res: Response) => {
  try {
    const batch = db.batch(); // Create batch object to delete all messages at once
    const snapshot = await db.collection("chats").get(); // Get all messages
    snapshot.docs.forEach((doc) => batch.delete(doc.ref)); // Delete each message
    await batch.commit(); // Commit batch to delete
    res.json({ success: true }); // Send success response to client
  } catch (error) {
    res.status(500).json({ error: "Delete Error" });
  }
});

// SOCKETS
io.on("connection", (socket) => {
  console.log(`⚡ User Connected: ${socket.id}`); // Log connection ID
  socket.on("draw_line", (data) => {
    // Listen for 'draw_line'
    io.emit("draw_line", data); // Emit 'draw_line' to all clients
  });
});

// Start Server and Listen for Connections on PORT
server.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
