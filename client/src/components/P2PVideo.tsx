// Ilya Zeldner - Professional P2P Video
import { useState, useEffect, useRef } from "react";
import Peer, { MediaConnection } from "peerjs";

export default function P2PVideo() {
  const [myId, setMyId] = useState<string>("");
  const [friendId, setFriendId] = useState<string>("");
  const [status, setStatus] = useState<string>("Offline");
  const [cameraActive, setCameraActive] = useState(false);

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const currentCallRef = useRef<MediaConnection | null>(null);

  // Initialize PeerJS (But NOT the camera yet)
  useEffect(() => {
    const peer = new Peer({
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:global.stun.twilio.com:3478" },
        ],
      },
    });

    peerRef.current = peer;

    peer.on("open", (id) => {
      setMyId(id);
      setStatus("Standby - Turn on Camera to Call");
    });

    // Handle Incoming Calls
    peer.on("call", (call) => {
      // If camera is off, we can't really answer with video yet
      if (!localStreamRef.current) {
        alert("Someone is calling! Please click 'Turn On Camera' first.");
        return;
      }
      handleCall(call);
    });

    peer.on("error", (err) => {
      console.error("Peer Error:", err);
      setStatus("⚠️ Network Error");
    });

    return () => {
      peer.destroy();
    };
  }, []);

  // HELPER: Handle the connection logic (Used for both Incoming & Outgoing)
  const handleCall = (call: MediaConnection) => {
    currentCallRef.current = call;
    setStatus("Connecting...");

    // Answer with our stream
    call.answer(localStreamRef.current!);

    call.on("stream", (remoteStream) => {
      setStatus("🟢 Connected!");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current
          .play()
          .catch((e) => console.error("Autoplay blocked", e));
      }
    });

    // FIX: Handle Disconnects (Clean the screen)
    call.on("close", () => {
      endCallUI();
    });

    // Also check ICE state for network drops
    call.peerConnection.oniceconnectionstatechange = () => {
      if (call.peerConnection.iceConnectionState === "disconnected") {
        endCallUI();
      }
    };
  };

  const endCallUI = () => {
    setStatus("Call Ended");
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null; // Clear the frozen frame
    }
    currentCallRef.current = null;
  };

  // USER ACTION: Turn On Camera
  const startCamera = async () => {
    try {
      setStatus("Accessing Camera...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      setStatus("Camera Ready ✅");
    } catch (err) {
      console.error("Camera Error", err);
      setStatus("❌ Camera Denied");
    }
  };

  // USER ACTION: Call Friend
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

      {/* VIDEO AREA */}
      <div className="bg-black rounded-lg overflow-hidden flex-1 relative mb-4 flex items-center justify-center">
        {/* Remote Video (Friend) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Placeholder Message if Video is Black */}
        {!cameraActive && (
          <div className="absolute text-white text-sm opacity-50">
            Camera is OFF
          </div>
        )}

        {/* Small PIP - Only shows if camera is active */}
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

      {/* CONTROLS */}
      <div className="flex gap-2">
        {/* Step 1: Start Camera */}
        {!cameraActive ? (
          <button
            onClick={startCamera}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition font-medium"
          >
            📸 Turn On Camera
          </button>
        ) : (
          /* Step 2: Call Interface (Only visible after camera is on) */
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
