// Ilya Zeldner
import { useState, useEffect, useCallback } from "react";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001"; // Server URL

// Type Definitions
interface Message {
  // Chat Message
  id: string; // Firebase ID
  text: string; // Message Text
  user: string; // User Name
}
// HTTP COMPONENT (The "Passive" Chat)

export function HttpFirebaseChat() {
  // Chat Component
  const [messages, setMessages] = useState<Message[]>([]); // Chat Messages
  const [input, setInput] = useState<string>(""); // User Input
  const [loading, setLoading] = useState<boolean>(false); // Loading State

  // FETCH: Get messages from DB
  const fetchMessages = useCallback(async () => {
    // Manual Refresh
    setLoading(true); // Set loading state
    try {
      const res = await fetch(`${SERVER_URL}/api/chat`); // HTTP GET
      const data = await res.json(); // Parse JSON
      setMessages(data); // Set messages
    } catch (err) {
      console.error("Fetch error:", err); // Error handling
    }
    setLoading(false);
  }, []);

  // SEND: Post new message to DB
  const sendMessage = async () => {
    // HTTP POST
    if (!input) return; // No empty messages

    await fetch(`${SERVER_URL}/api/chat`, {
      // HTTP POST
      method: "POST", // HTTP Method
      headers: { "Content-Type": "application/json" }, // Content-Type
      body: JSON.stringify({ text: input, user: "Student" }), // Body
    });

    setInput(""); // Clear input
    fetchMessages(); // Manual Refresh (Pull)
  };

  // CLEAR: Delete all messages (Self-Destruct)
  const clearChat = async () => {
    // HTTP DELETE
    if (!confirm("Are you sure you want to delete all messages?")) return;

    try {
      await fetch(`${SERVER_URL}/api/chat`, { method: "DELETE" });
      fetchMessages(); // Refresh to show empty list
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchMessages(); // Fetch messages
  }, [fetchMessages]); // Depend on fetchMessages

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-500 flex flex-col h-[500px]">
      <div className="flex justify-between items-center mb-1">
        <h2 className="text-xl font-bold">1. HTTP (Firebase) 💾</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        Saved to DB. Passive updates (Pull).
      </p>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto bg-gray-50 p-4 rounded mb-4 border border-gray-200">
        {loading && (
          <div className="text-blue-500 text-xs text-center">
            Loading from DB...
          </div>
        )}
        {messages.length === 0 && !loading && (
          <div className="text-gray-400 text-xs text-center mt-10">
            No messages yet
          </div>
        )}
        {/* Display messages */}
        {messages.map((m) => (
          <div
            key={m.id}
            className="mb-2 text-sm border-b border-gray-100 pb-1"
          >
            <span className="font-bold text-blue-600">{m.user}:</span> {m.text}
          </div>
        ))}
      </div>

      {/* Input Area */}
      <div className="flex gap-2 mb-2">
        <input
          className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message..."
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
        />
        <button
          onClick={sendMessage}
          className="bg-blue-500 text-white px-4 py-2 rounded text-sm hover:bg-blue-600 transition font-medium"
        >
          Send
        </button>
      </div>

      {/* Control Buttons */}
      <div className="flex gap-2">
        <button
          onClick={fetchMessages}
          className="flex-1 bg-gray-100 text-gray-700 py-2 rounded text-sm font-bold hover:bg-gray-200 transition"
        >
          🔄 Refresh
        </button>
        <button
          onClick={clearChat}
          className="bg-red-50 text-red-600 px-3 py-2 rounded text-sm font-bold hover:bg-red-100 transition"
          title="Clear Database"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
