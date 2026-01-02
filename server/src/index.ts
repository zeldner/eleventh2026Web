// Ilya Zeldner
import express, { Request, Response } from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import * as admin from "firebase-admin";
import dotenv from "dotenv";

// Setup Environment
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:5173";

// Setup Middleware (CORS is crucial for Sockets!)
app.use(cors({ origin: CLIENT_URL }));
app.use(express.json());

// Setup Firebase
const serviceAccount = require("../serviceAccountKey.json");

if (!admin.apps.length) {
  //
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

// Create HTTP Server & Socket Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all connections (easier for development)
    methods: ["GET", "POST"],
  },
});

// HTTP ROUTES (Square 1)
app.get("/", (req: Request, res: Response) => {
  res.send(`<h1>Server Running</h1>`);
});

app.get("/api/chat", async (req: Request, res: Response) => {
  try {
    const snapshot = await db
      .collection("chats")
      .orderBy("createdAt", "desc")
      .limit(10)
      .get();
    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    res.json(messages.reverse());
  } catch (error) {
    res.status(500).json({ error: "DB Error" });
  }
});

app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { text, user } = req.body;
    await db.collection("chats").add({
      text,
      user,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "DB Error" });
  }
});

// DELETE route to clear the database
app.delete("/api/chat", async (req: Request, res: Response) => {
  try {
    // Get all documents in the collection
    const collectionRef = db.collection("chats");
    const snapshot = await collectionRef.get();

    // Delete them one by one (Batch delete is better for big apps)
    if (snapshot.size === 0) {
      return res.json({ message: "Nothing to delete" });
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit(); // Commit the deletion

    res.json({ success: true, message: "Chat history cleared!" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ error: "Could not delete chat history" });
  }
});

// --- SOCKET LOGIC (Square 2) ---
io.on("connection", (socket) => {
  console.log(`⚡ User Connected: ${socket.id}`);

  // Listen for drawing events
  socket.on("draw_line", (data) => {
    // Broadcast to everyone ELSE (including sender is fine too)
    io.emit("draw_line", data);
  });

  socket.on("disconnect", () => {
    console.log("User Disconnected", socket.id);
  });
});

// 5. Start Server
server.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
