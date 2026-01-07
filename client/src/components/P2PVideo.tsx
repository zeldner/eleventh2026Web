// Ilya Zeldner - P2P Video (Final Clean Version)
import { useState, useEffect, useRef } from "react";
import Peer from "peerjs";

export default function P2PVideo() {
  const [myId, setMyId] = useState<string>("");
  const [friendId, setFriendId] = useState<string>("");
  const [status, setStatus] = useState<string>("Offline");
  const [cameraActive, setCameraActive] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const currentCallRef = useRef<any>(null);

  useEffect(() => {
    // 1. DYNAMIC URL CONFIGURATION (Works for both Local & Render)
    const rawUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

    // Extract pure hostname (e.g. "myapp.onrender.com")
    const cleanHost = rawUrl
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .split(":")[0]; // Remove protocol and path from URL

    // Detect HTTPS (Render uses HTTPS, Local uses HTTP)
    const isSecure = rawUrl.startsWith("https");

    // Determine Port (443 for Render/HTTPS, 3001 for Local)
    const portMatch = rawUrl.match(/:(\d+)/);
    const port = isSecure ? 443 : portMatch ? parseInt(portMatch[1]) : 3001; // Default to 3001 

    console.log(
      `Connecting to PeerServer at ${cleanHost}:${port} (Secure: ${isSecure})`
    );

    // PEER INITIALIZATION
    const peer = new Peer("", {
      host: cleanHost,
      port: port,
      secure: isSecure,
      path: "/peerjs",
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      },
    });

    peerRef.current = peer;

    peer.on("open", (id) => {
      setMyId(id);
      setStatus("Standby - Share ID manually");
      console.log("✅ My Peer ID:", id);
    });

    peer.on("call", (call) => {
      if (!localStreamRef.current) {
        alert("Someone is calling! Please click 'Turn On Camera' first.");
        return;
      }
      handleCall(call);
    });

    peer.on("error", (err) => {
      console.error("❌ PeerJS Error:", err);
      if (err.type === "peer-unavailable") {
        setStatus("⚠️ Friend ID not found");
      } else {
        setStatus("⚠️ Network Error");
        setIsConnected(false);
      }
    });

    return () => {
      peer.destroy();
    };
  }, []);

  // UI & CAMERA LOGIC
  useEffect(() => {
    if (cameraActive && localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [cameraActive]);

  const handleCall = (call: any) => {
    if (currentCallRef.current) currentCallRef.current.close();
    currentCallRef.current = call;
    setStatus("Connecting...");
    setIsConnected(true);

    call.answer(localStreamRef.current!);

    call.on("stream", (remoteStream: MediaStream) => {
      setStatus("🟢 Connected!");

      // Safe Video Playback (AbortError Fix)
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        const playPromise = remoteVideoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            if (error.name === "AbortError") {
              console.log("Video play aborted (safe to ignore).");
            } else {
              console.error("Error playing remote video:", error);
            }
          });
        }
      }
    });

    call.on("close", () => endCallUI());
  };

  const hangUp = () => {
    if (currentCallRef.current) currentCallRef.current.close();
    endCallUI();
  };

  const endCallUI = () => {
    setStatus("Call Ended");
    setIsConnected(false);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    currentCallRef.current = null;
  };

  const startCamera = async () => {
    try {
      setStatus("Accessing Camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      localStreamRef.current = stream;
      setCameraActive(true);
      setStatus("Camera Ready ✅");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setStatus("❌ Camera Denied: " + errorMessage);
    }
  };

  const callPeer = () => {
    if (!peerRef.current || !friendId) return;
    if (!localStreamRef.current) {
      alert("Turn on your camera first!");
      return;
    }
    setStatus("Calling...");
    const call = peerRef.current.call(friendId, localStreamRef.current);
    handleCall(call);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-purple-500 flex flex-col h-[500px]">
      <h2 className="text-xl font-bold mb-1">3. P2P Video 🤝</h2>
      <p className="text-xs text-gray-500 mb-4 font-mono bg-gray-100 p-1 rounded">
        {status}
      </p>

      <div className="bg-black rounded-lg overflow-hidden flex-1 relative mb-4 flex items-center justify-center">
        <video
          ref={remoteVideoRef}
          playsInline
          className="w-full h-full object-cover"
        />
        {!cameraActive && (
          <div className="absolute text-white text-sm opacity-50">
            Camera is OFF
          </div>
        )}
        {cameraActive && (
          <div className="absolute bottom-3 right-3 w-24 h-32 bg-gray-800 rounded-lg border-2 border-white overflow-hidden shadow-lg z-10">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover transform -scale-x-100"
            />
          </div>
        )}
      </div>

      <div className="bg-gray-100 p-3 rounded text-xs font-mono mb-3 break-all border border-gray-200">
        <span className="font-bold text-gray-500 block uppercase">My ID:</span>
        {myId || "Generating ID..."}
      </div>

      <div className="flex gap-2">
        {!cameraActive ? (
          <button
            onClick={startCamera}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition font-medium"
          >
            📸 Turn On Camera
          </button>
        ) : isConnected ? (
          <button
            onClick={hangUp}
            className="w-full bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600 transition font-medium animate-pulse"
          >
            📞 End Call
          </button>
        ) : (
          <>
            <input
              className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              value={friendId}
              onChange={(e) => setFriendId(e.target.value)}
              placeholder="Paste Friend's ID..."
            />
            <button
              onClick={callPeer}
              className="bg-purple-500 text-white px-4 py-2 rounded text-sm hover:bg-purple-600 transition font-medium"
            >
              Call
            </button>
          </>
        )}
      </div>
    </div>
  );
}
