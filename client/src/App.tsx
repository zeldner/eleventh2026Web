// Ilya Zeldner
import { HttpFirebaseChat } from "./components/HttpFirebaseChat";
import { SocketBoard } from "./components/SocketBoard";
import { P2PVideo } from "./components/P2PVideo";

function App() {
  return (
    // MAIN CONTAINER: Gray background, Flex column (vertical), centered, padding
    <div className="min-h-screen bg-gray-100 flex flex-col items-center py-8 gap-6">
      {/* Chat Section */}
      <div className="w-[90%] max-w-lg bg-white p-4 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-center">💬 Chat</h2>
        <HttpFirebaseChat />
      </div>

      {/* Board Section */}
      <div className="w-[90%] max-w-lg bg-white p-4 rounded-xl shadow-lg overflow-hidden">
        <h2 className="text-xl font-bold mb-4 text-center">🎨 Board</h2>
        <SocketBoard />
      </div>

      {/* Video Section */}
      <div className="w-[90%] max-w-lg bg-white p-4 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-center">📹 Video</h2>
        <P2PVideo />
      </div>
    </div>
  );
}

export default App;
