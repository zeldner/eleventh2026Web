"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config"); // Crucial for LocalHost
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const https_1 = __importDefault(require("https"));
const cors_1 = __importDefault(require("cors"));
const admin = __importStar(require("firebase-admin"));
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const server = http_1.default.createServer(app);
const io = new socket_io_1.Server(server, {
    cors: { origin: "*", methods: ["GET", "POST"] },
});
// 1. --- FIREBASE INITIALIZATION WITH PEM FIX ---
const serviceAccountVar = process.env.FIREBASE_SERVICE_ACCOUNT;
if (serviceAccountVar) {
    try {
        const serviceAccount = JSON.parse(serviceAccountVar);
        // FIX: Replaces escaped \\n with actual newlines to solve PEM error
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, "\n");
        if (!admin.apps.length) {
            admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
            });
            console.log("✅ Firebase Connected Successfully");
        }
    }
    catch (error) {
        console.error("❌ Firebase Initialization Error:", error);
    }
}
else {
    console.error("❌ Error: FIREBASE_SERVICE_ACCOUNT is not defined in environment.");
}
const db = admin.firestore();
// 2. --- HTTP ROUTES ---
// ROOT: Verification page
app.get("/", (_req, res) => {
    res.send(`
        <div style="font-family: sans-serif; text-align: center; padding: 40px;">
            <h1 style="color: #2ecc71;">Classroom Server: ONLINE</h1>
            <p>Connection: <strong>HTTP (Chat) + Socket (Drawing) + WebRTC (Video)</strong></p>
            <p>Check Database: <a href="/api/database-view">/api/database-view</a></p>
        </div>
    `);
});
// DATABASE VIEW: Direct Firebase inspection
app.get("/api/database-view", (_req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const snapshot = yield db
            .collection("messages")
            .orderBy("timestamp", "desc")
            .get();
        const data = snapshot.docs.map((doc) => (Object.assign({ id: doc.id }, doc.data())));
        res.status(200).json(data);
    }
    catch (error) {
        res.status(500).send("Database read error.");
    }
}));
// HTTP CHAT: Post a message
app.post("/api/chat", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { user, text } = req.body;
        const msg = { user, text, timestamp: new Date() };
        yield db.collection("messages").add(msg);
        res.status(201).json({ success: true, via: "HTTP" });
    }
    catch (e) {
        res.status(500).json({ error: "Post failed" });
    }
}));
// 3. --- SOCKET.IO & WEBRTC SIGNALING ---
io.on("connection", (socket) => {
    console.log("Socket User Connected:", socket.id);
    // DRAWING (Real-Time Socket)
    socket.on("draw-stroke", (data) => {
        socket.broadcast.emit("draw-stroke", data);
    });
    // VIDEO SIGNALING (WebRTC Middleman)
    socket.on("video-offer", (data) => socket.broadcast.emit("video-offer", data));
    socket.on("video-answer", (data) => socket.broadcast.emit("video-answer", data));
    socket.on("ice-candidate", (data) => socket.broadcast.emit("ice-candidate", data));
    socket.on("disconnect", () => console.log("User disconnected"));
});
// 4. --- SELF-PING (Keep-Alive) ---
const SELF_PING_URL = process.env.RENDER_EXTERNAL_URL;
app.get("/ping", (_req, res) => res.status(200).send("pong"));
function keepAlive() {
    if (!SELF_PING_URL)
        return;
    https_1.default
        .get(SELF_PING_URL, (res) => {
        res.on("data", () => { });
    })
        .on("error", (err) => console.error("Self-ping error:", err.message));
}
setInterval(keepAlive, 13 * 60 * 1000); // Ping every 13 min
// 5. --- START SERVER ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`\n🚀 Server is running on port ${PORT}`);
    console.log(`🌍 Health Check: http://localhost:${PORT}/ping`);
    keepAlive();
});
