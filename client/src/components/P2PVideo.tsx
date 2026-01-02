// Ilya Zeldner - P2P Video (Fixed Local Stream Timing)
import { useState, useEffect, useRef } from "react";
import Peer from "peerjs";

export default function P2PVideo() {
  const [myId, setMyId] = useState<string>("");
  const [friendId, setFriendId] = useState<string>("");
  const [status, setStatus] = useState<string>("Offline");
  const [cameraActive, setCameraActive] = useState(false);

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const currentCallRef = useRef<any>(null);

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

    peer.on("call", (call) => {
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

  // This waits for the 'cameraActive' state to change.
  // Once the UI shows the video player, WE ATTACH THE STREAM.
  useEffect(() => {
    if (cameraActive && localStreamRef.current && localVideoRef.current) {
      console.log("Attaching stream to local video...");
      localVideoRef.current.srcObject = localStreamRef.current;
    }
  }, [cameraActive]);
  // -----------------------------

  const handleCall = (call: any) => {
    currentCallRef.current = call;
    setStatus("Connecting...");

    call.answer(localStreamRef.current!);

    call.on("stream", (remoteStream: MediaStream) => {
      setStatus("🟢 Connected!");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current
          .play()
          .catch((e) => console.error("Autoplay blocked", e));
      }
    });

    call.on("close", () => endCallUI());

    if (call.peerConnection) {
      call.peerConnection.oniceconnectionstatechange = () => {
        if (call.peerConnection.iceConnectionState === "disconnected") {
          endCallUI();
        }
      };
    }
  };

  const endCallUI = () => {
    setStatus("Call Ended");
    if (remoteVideoRef.current) {
      remoteVideoRef.current.srcObject = null;
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

      // Save stream to variable
      localStreamRef.current = stream;

      // Trigger the UI update (shows the video player)
      // The useEffect above will handle attaching the video!
      setCameraActive(true);

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
          <button
            onClick={startCamera}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition font-medium"
          >
            📸 Turn On Camera
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
