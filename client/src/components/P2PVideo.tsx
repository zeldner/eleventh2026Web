// Ilya Zeldner - P2P COMPONENT (Video)
import { useState, useEffect, useRef } from "react";
import Peer from "peerjs";
export function P2PVideo() {
  const [myId, setMyId] = useState<string>("Connecting...");
  const [friendId, setFriendId] = useState<string>("");

  const videoRef = useRef<HTMLVideoElement>(null);
  const peerRef = useRef<Peer | null>(null);

  useEffect(() => {
    const peer = new Peer();
    peerRef.current = peer;

    peer.on("open", (id) => setMyId(id));

    peer.on("call", (call) => {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          call.answer(stream); // Answer call
          call.on("stream", (remoteStream) => {
            if (videoRef.current) videoRef.current.srcObject = remoteStream;
          });
        });
    });
  }, []);

  const callPeer = () => {
    if (!peerRef.current) return;
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: true })
      .then((stream) => {
        const call = peerRef.current!.call(friendId, stream);
        call.on("stream", (remoteStream) => {
          if (videoRef.current) videoRef.current.srcObject = remoteStream;
        });
      });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-purple-500 flex flex-col h-[500px]">
      <h2 className="text-xl font-bold mb-1">3. P2P (Video Stream) 🤝</h2>
      <p className="text-xs text-gray-500 mb-4">Bypasses server entirely.</p>

      <div className="bg-black rounded-lg overflow-hidden flex-1 relative mb-4">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute top-2 right-2 bg-red-600 w-3 h-3 rounded-full animate-pulse"></div>
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
