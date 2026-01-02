// Ilya Zeldner
import { HttpFirebaseChat } from "./components/HttpFirebaseChat";
import SocketBoard from "./components/SocketBoard";
import { P2PVideo } from "./components/P2PVideo";

function App() {
  return (
    // MAIN CONTAINER
    // 1. 'flex-col': Vertical stack for mobile
    // 2. 'md:flex-row': Left-to-Right for Laptop/PC
    // 3. 'items-start': Aligns them at the top
    <div className="min-h-screen bg-gray-100 flex flex-col md:flex-row items-center md:items-start justify-center py-8 gap-6">
      {/* 1. Chat Section */}
      <div className="w-[90%] md:w-1/3 max-w-md bg-white p-4 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-center">💬 Chat</h2>
        <HttpFirebaseChat />
      </div>

      {/* 2. Board Section */}
      <div className="w-[90%] md:w-1/3 max-w-md bg-white p-4 rounded-xl shadow-lg overflow-hidden">
        <h2 className="text-xl font-bold mb-4 text-center">🎨 Board</h2>
        <SocketBoard />
      </div>

      {/* 3. Video Section */}
      <div className="w-[90%] md:w-1/3 max-w-md bg-white p-4 rounded-xl shadow-lg">
        <h2 className="text-xl font-bold mb-4 text-center">📹 Video</h2>
        <P2PVideo />
      </div>
    </div>
  );
}

export default App;
