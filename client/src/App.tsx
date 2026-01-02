// Ilya Zeldner
import { HttpFirebaseChat } from "./components/HttpFirebaseChat";
import { SocketBoard } from "./components/SocketBoard";
import { P2PVideo } from "./components/P2PVideo";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-100 p-8 font-sans">
      <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
        3 Architectures 🏛️
      </h1>

      {/* 3-Column Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto">
        <HttpFirebaseChat />
        <SocketBoard />
        <P2PVideo />
      </div>
    </div>
  );
}
