// Ilya Zeldner
import express, { Request, Response } from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import * as admin from "firebase-admin";
import dotenv from "dotenv";
import path from "path";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Setup Middleware
// We allow requests from ANYWHERE (*) because Vercel (our frontend)
// needs to talk to this server.
app.use(cors({ origin: "*" }));
app.use(express.json());

// Setup Firebase (Loading for Render)
let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    console.log("✅ Loaded Firebase config from Environment Variable");
  } catch (error) {
    console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT env var.");
  }
} else {
  try {
    serviceAccount = require(path.resolve(
      __dirname,
      "../serviceAccountKey.json"
    ));
    console.log("✅ Loaded Firebase config from Local File");
  } catch (error) {
    console.warn("⚠️ No local 'serviceAccountKey.json' found.");
  }
}

if (serviceAccount && !admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
const db = admin.firestore();

// 3. Create Server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", //  for Vercel connection
    methods: ["GET", "POST"],
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
      .collection("chats")
      .orderBy("createdAt", "desc")
      .limit(50)
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

app.delete("/api/chat", async (req: Request, res: Response) => {
  try {
    const batch = db.batch();
    const snapshot = await db.collection("chats").get();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Delete Error" });
  }
});

// --- SOCKETS ---
io.on("connection", (socket) => {
  console.log(`⚡ User Connected: ${socket.id}`);
  socket.on("draw_line", (data) => {
    io.emit("draw_line", data);
  });
});

// 4. Start
server.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
