// Ilya Zeldner - P2P Video (Fixed Scope Version)
import { useState, useEffect, useRef } from "react";
import Peer from "peerjs";

export default function P2PVideo() {
  const [myId, setMyId] = useState<string>("Connecting...");
  const [friendId, setFriendId] = useState<string>("");
  const [status, setStatus] = useState<string>("Initializing...");
  const [streamReady, setStreamReady] = useState(false);

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    //  DEFINE SETUP FUNCTION INSIDE EFFECT
    const setupPeer = (stream: MediaStream) => {
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
        setStatus("✅ Online & Ready");
      });

      peer.on("call", (call) => {
        setStatus("📞 Incoming Call...");
        // Answer immediately with the stream we already have
        call.answer(stream);

        call.on("stream", (remoteStream) => {
          setStatus("🟢 Connected! (Receiving Video)");
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remoteStream;
            remoteVideoRef.current
              .play()
              .catch((e) => console.error("Auto-play error", e));
          }
        });
      });

      peer.on("error", (err) => {
        console.error("Peer Error:", err);
        setStatus("⚠️ Connection Error");
      });
    };

    // START CAMERA FIRST, THEN SETUP PEER
    setStatus("Requesting Camera...");
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        // Save stream to ref so we can use it later for calling
        localStreamRef.current = stream;

        // Show myself
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
        setStreamReady(true);
        setStatus("Camera Ready. Connecting to Network...");

        // NOW we can safely start the Peer connection
        setupPeer(stream);
      })
      .catch((err) => {
        console.error("Camera failed", err);
        setStatus("❌ Camera Error: " + err.message);
      });

    return () => {
      peerRef.current?.destroy();
    };
  }, []);

  const callPeer = () => {
    if (!peerRef.current || !friendId) return;
    if (!localStreamRef.current) {
      setStatus("❌ Wait for camera first");
      return;
    }

    setStatus("📞 Calling...");
    const call = peerRef.current.call(friendId, localStreamRef.current);

    call.on("stream", (remoteStream) => {
      setStatus("🟢 Connected! (Receiving Video)");
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current
          .play()
          .catch((e) => console.error("Auto-play error", e));
      }
    });

    call.on("error", (err) => setStatus("❌ Call Error: " + err.message));
  };

  const forcePlay = () => {
    if (remoteVideoRef.current) remoteVideoRef.current.play();
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-purple-500 flex flex-col h-[500px]">
      <h2 className="text-xl font-bold mb-1">3. P2P Video 🤝</h2>
      <p className="text-xs text-gray-500 mb-4 font-mono bg-gray-100 p-1 rounded">
        {status}
      </p>

      {/* VIDEO AREA */}
      <div className="bg-black rounded-lg overflow-hidden flex-1 relative mb-4">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Small Self-View */}
        <div className="absolute bottom-3 right-3 w-24 h-32 bg-gray-800 rounded-lg border-2 border-white overflow-hidden shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover transform -scale-x-100"
          />
        </div>

        <button
          onClick={forcePlay}
          className="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded opacity-50 hover:opacity-100"
        >
          ▶ Force Play
        </button>
      </div>

      <div className="bg-gray-100 p-3 rounded text-xs font-mono mb-3 break-all border border-gray-200">
        <span className="font-bold text-gray-500 block uppercase">My ID:</span>
        {myId}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm"
          value={friendId}
          onChange={(e) => setFriendId(e.target.value)}
          placeholder="Paste Friend's ID..."
        />
        <button
          onClick={callPeer}
          disabled={!streamReady}
          className={`px-4 py-2 rounded text-sm text-white font-medium transition
            ${
              streamReady
                ? "bg-purple-500 hover:bg-purple-600"
                : "bg-gray-400 cursor-not-allowed"
            }
          `}
        >
          Call
        </button>
      </div>
    </div>
  );
}
