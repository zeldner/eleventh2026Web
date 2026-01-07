// Ilya Zeldner - P2P Video
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
    // CONFIGURATION LOGIC
    const rawUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

    // Extract Hostname
    const cleanHost = rawUrl
      .replace(/^https?:\/\//, "")
      .split("/")[0]
      .split(":")[0]; // Remove protocol and path from URL to get hostname only

    const isSecure = rawUrl.startsWith("https"); // Check if URL starts with "https"
    const portMatch = rawUrl.match(/:(\d+)/); // Extract port from URL
    const port = isSecure ? 443 : portMatch ? parseInt(portMatch[1]) : 3001; // Default port is 3001 if not specified in URL or secure connection is used (HTTPS)

    console.log(
      `Connecting to PeerServer at ${cleanHost}:${port} (Secure: ${isSecure})`
    );

    // PEER INITIALIZATION
    const peer = new Peer("", {
      // Empty string for auto-generated ID
      host: cleanHost, // Hostname for PeerServer
      port: port, // Port for PeerServer
      secure: isSecure, // Use secure connection (HTTPS)
      path: "/peerjs", // Path for PeerServer route
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" }, // Google STUN server for ICE traversal.
          { urls: "stun:stun1.l.google.com:19302" },
        ],
      },
    }); // Initialize Peer with PeerServer configuration

    peerRef.current = peer; // Store the initialized Peer instance in the ref

    peer.on("open", (id) => {
      setMyId(id);
      setStatus("Standby - Turn on Camera to Call");
      console.log("✅ Success! My Peer ID:", id);
    }); // Handle Peer 'open' event to get our Peer ID

    peer.on("call", (call) => {
      if (!localStreamRef.current) {
        alert("Someone is calling! Please click 'Turn On Camera' first.");
        return;
      }
      handleCall(call); // Handle incoming calls from other peers
    }); // Handle Peer 'call' event to handle incoming calls

    peer.on("error", (err) => {
      console.error("❌ PeerJS Error:", err.type, err);
      if (err.type === "peer-unavailable") {
        setStatus("⚠️ Friend ID not found");
      } else {
        setStatus("⚠️ Network Error");
        setIsConnected(false);
      }
    }); // Handle Peer 'error' event

    return () => {
      peer.destroy(); // Clean up Peer instance
    };
  }, []); // Initialize Peer on component mount

  // UI & CAMERA LOGIC
  useEffect(() => {
    if (cameraActive && localStreamRef.current && localVideoRef.current) {
      // If camera is active and local stream is available
      localVideoRef.current.srcObject = localStreamRef.current; // Update local video source
    }
  }, [cameraActive]); // Run whenever cameraActive changes

  const handleCall = (call: any) => {
    if (currentCallRef.current) currentCallRef.current.close();
    currentCallRef.current = call; // Store the current call in the ref
    setStatus("Connecting...");
    setIsConnected(true);

    call.answer(localStreamRef.current!);

    call.on("stream", (remoteStream: MediaStream) => {
      setStatus("🟢 Connected!");

      // "Safe" Video Playback
      if (remoteVideoRef.current) {
        // If remote video element is available
        remoteVideoRef.current.srcObject = remoteStream; // Update remote video source

        const playPromise = remoteVideoRef.current.play(); // Attempt to play the video

        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            if (error.name === "AbortError") {
              console.log("Video play aborted (safe to ignore).");
            } else {
              console.error("Error playing remote video:", error);
            }
          }); // Handle play errors
        } // Check for play errors
      } // If remote video element is available
    }); // Handle remote stream

    call.on("close", () => endCallUI()); // Handle call closure to end the call
  };

  const hangUp = () => {
    if (currentCallRef.current) currentCallRef.current.close();
    endCallUI();
  }; // Hang up the call

  const endCallUI = () => {
    setStatus("Call Ended");
    setIsConnected(false);
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    currentCallRef.current = null;
  }; // End the call UI

  const startCamera = async () => {
    try {
      setStatus("Accessing Camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        // Access user's media devices (e.g., camera and microphone)
        video: true, // Request camera access
        audio: true, // Request microphone access
      });
      // Get user's media stream
      localStreamRef.current = stream; // Store the local stream in the ref
      setCameraActive(true);
      setStatus("Camera Ready ✅");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setStatus("❌ Camera Denied: " + errorMessage);
    }
  };

  const callPeer = () => {
    // Call another peer
    if (!peerRef.current || !friendId) return;
    if (!localStreamRef.current) {
      alert("Turn on your camera first!");
      return;
    } // If local stream is not available
    setStatus("Calling...");
    const call = peerRef.current.call(friendId, localStreamRef.current);
    handleCall(call); // Handle the call and update UI
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
          // Remove autoPlay to force our manual safe play() logic
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
              placeholder="Friend's ID..."
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
