//Ilya Zeldner - socket.ts
import io from "socket.io-client";

// URL LOGIC
const rawUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
const cleanHost = rawUrl
  .replace(/^https?:\/\//, "")
  .split("/")[0]
  .split(":")[0]; // Remove protocol and path from URL to get hostname only

let CONNECT_URL; // Variable to store the final URL

if (cleanHost === "localhost") {
  CONNECT_URL = "http://localhost:3002"; // Dev URL
} else {
  CONNECT_URL = rawUrl; // Prod URL
}

// Initialize and Export the socket
export const socket = io(CONNECT_URL, {
  // Initialize Socket.io
  withCredentials: true, // Allow Cross-Origin Resource Sharing
  autoConnect: true, // Automatically connect
});
