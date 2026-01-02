// Ilya Zeldner - P2P COMPONENT (Video)
import { useState, useEffect, useRef } from "react";
import Peer from "peerjs";

export default function P2PVideo() {
  const [myId, setMyId] = useState<string>("Connecting...");
  const [friendId, setFriendId] = useState<string>("");
  const [status, setStatus] = useState<string>("Idle");

  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    // Pass the config object directly as the first argument
    // PeerJS will automatically generate an ID.
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
      setStatus("Online - Ready to call");
    });
    peer.on("call", (call) => {
      setStatus("Incoming call...");
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          if (localVideoRef.current) localVideoRef.current.srcObject = stream;
          call.answer(stream);
          call.on("stream", (remoteStream) => {
            if (remoteVideoRef.current)
              remoteVideoRef.current.srcObject = remoteStream;
            setStatus("Connected! 🟢");
          });
        })
        .catch((err) => {
          console.error("Failed to get local stream", err);
          setStatus("Camera Error 🔴");
        });
    });

    return () => {
      // Cleanup: destroy peer when component unmounts
      peer.destroy();
    };
  }, []);

  const callPeer = () => {
    if (!peerRef.current || !friendId) return;
    setStatus("Calling...");

    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        // Show My Face
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;

        const call = peerRef.current!.call(friendId, stream);

        call.on("stream", (remoteStream) => {
          if (remoteVideoRef.current)
            remoteVideoRef.current.srcObject = remoteStream;
          setStatus("Connected! 🟢");
        });

        call.on("error", (err) => {
          console.error(err);
          setStatus("Call Failed 🔴");
        });
      })
      .catch((err) => {
        console.error("Failed to get local stream", err);
        setStatus("Camera Error 🔴");
      });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-purple-500 flex flex-col h-[500px]">
      <h2 className="text-xl font-bold mb-1">3. P2P (Video Stream) 🤝</h2>
      <p className="text-xs text-gray-500 mb-4">
        Status: <span className="font-bold">{status}</span>
      </p>

      {/* Main Video Area */}
      <div className="bg-black rounded-lg overflow-hidden flex-1 relative mb-4">
        {/* Remote Video (Friend) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />

        {/* Local Video - Small Picture-in-Picture */}
        <div className="absolute bottom-3 right-3 w-24 h-32 bg-gray-800 rounded-lg border-2 border-white overflow-hidden shadow-lg">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted // MUST be muted to avoid feedback and allow autoplay
            className="w-full h-full object-cover transform -scale-x-100" // Mirror effect
          />
        </div>
      </div>

      <div className="bg-gray-100 p-3 rounded text-xs font-mono mb-3 break-all border border-gray-200">
        <span className="font-bold text-gray-500 block uppercase">
          My Peer ID:
        </span>
        {myId}
      </div>

      <div className="flex gap-2">
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
      </div>
    </div>
  );
}
