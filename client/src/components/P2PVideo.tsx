// Ilya Zeldner - P2P Video (With End Call Button)
import { useState, useEffect, useRef } from "react";
import Peer from "peerjs";

export default function P2PVideo() {
  const [myId, setMyId] = useState<string>("");
  const [friendId, setFriendId] = useState<string>("");
  const [status, setStatus] = useState<string>("Offline"); // State: Connection Status
  const [cameraActive, setCameraActive] = useState(false); // State: Is the camera on?
  const [isConnected, setIsConnected] = useState(false); // State: Are we in a call?

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const currentCallRef = useRef<any>(null);

  useEffect(() => {
    // Initialize PeerJS when the component mounts (only once)
    const peer = new Peer({
      // Initialize PeerJS with STUN servers
      config: {
        // Use Google's and Twilio's public STUN servers
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" }, // Google's public STUN server
          { urls: "stun:global.stun.twilio.com:3478" }, // Twilio's public STUN server
        ],
      },
    });

    peerRef.current = peer; // Store the peer instance in the ref variable

    peer.on("open", (id) => {
      // Listen for 'open' event
      setMyId(id); // Set the peer's ID
      setStatus("Standby - Turn on Camera to Call");
    });

    peer.on("call", (call) => {
      // Listen for 'call' event
      if (!localStreamRef.current) {
        alert("Someone is calling! Please click 'Turn On Camera' first.");
        return;
      }
      handleCall(call); // Handle the call event
    });

    peer.on("error", (err) => {
      console.error("Peer Error:", err);
      setStatus("⚠️ Network Error");
      setIsConnected(false);
    });

    return () => {
      peer.destroy(); // Clean up when the component unmounts
    };
  }, []);

  // Attach stream when camera becomes active
  useEffect(() => {
    if (cameraActive && localStreamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = localStreamRef.current; // Attach stream to video
    }
  }, [cameraActive]); // Re-run when cameraActive changes or localStream changes

  const handleCall = (call: any) => {
    // Close any existing call first
    if (currentCallRef.current) {
      currentCallRef.current.close();
    }

    currentCallRef.current = call;
    setStatus("Connecting...");
    setIsConnected(true); // Show the "Hang Up" button

    call.answer(localStreamRef.current!); // Answer the call with the local stream

    call.on("stream", (remoteStream: MediaStream) => {
      setStatus("🟢 Connected!");
      if (remoteVideoRef.current) {
        // Attach stream to video element if it exists
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current
          .play() // Play the stream automatically (without user interaction)
          .catch((e) => console.error("Autoplay blocked", e)); // Error handling
      }
    });

    call.on("close", () => endCallUI());

    if (call.peerConnection) {
      // Check if peerConnection exists before adding event listener
      call.peerConnection.oniceconnectionstatechange = () => {
        if (call.peerConnection.iceConnectionState === "disconnected") {
          endCallUI(); // Reset the screen if the connection is lost
        }
      };
    }
  };

  // THE HANG UP FUNCTION
  const hangUp = () => {
    if (currentCallRef.current) {
      currentCallRef.current.close(); // Cut the connection
    }
    endCallUI(); // Reset the screen
  };

  const endCallUI = () => {
    setStatus("Call Ended");
    setIsConnected(false); // Switch back to "Call" button
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null; // Black screen
    }
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
      setCameraActive(true); // Triggers the useEffect to attach video
      setStatus("Camera Ready ✅");
    } catch (err) {
      console.error("Camera Error", err);
      setStatus("❌ Camera Denied");
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

      {/* VIDEO AREA */}
      <div className="bg-black rounded-lg overflow-hidden flex-1 relative mb-4 flex items-center justify-center">
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {!cameraActive && (
          <div className="absolute text-white text-sm opacity-50">
            Camera is OFF
          </div>
        )}

        {/* My Video */}
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
          // STATE 1: Camera Off
          <button
            onClick={startCamera}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition font-medium"
          >
            📸 Turn On Camera
          </button>
        ) : isConnected ? (
          // STATE 2: In a Call (Show Hang Up)
          <button
            onClick={hangUp}
            className="w-full bg-red-500 text-white px-4 py-2 rounded text-sm hover:bg-red-600 transition font-medium animate-pulse"
          >
            📞 End Call
          </button>
        ) : (
          // STATE 3: Camera On, Ready to Call
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
