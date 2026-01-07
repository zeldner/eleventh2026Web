// Ilya Zeldner - SocketBoard (Strict Pure WebSockets)
import React, { useEffect, useRef } from "react";
import io from "socket.io-client";

interface DrawData {
  x: number;
  y: number;
  color: string;
}

// URL LOGIC
const rawUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
const cleanHost = rawUrl
  .replace(/^https?:\/\//, "")
  .split("/")[0]
  .split(":")[0];

let CONNECT_URL;

if (cleanHost === "localhost") {
  // Local: Use dedicated port 3002
  CONNECT_URL = "http://localhost:3002"; // Dev URL for Socket.io
} else {
  // Prod: Use main render URL
  CONNECT_URL = rawUrl;
}

// STRICT SOCKET CONFIGURATION
const socket = io(CONNECT_URL, {
  withCredentials: true,
  autoConnect: true,
}); // Allow Cross-Origin Resource Sharing

export default function SocketBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null); // Canvas Ref for Drawing

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d"); // Canvas Context
    if (!ctx) return;

    // LISTEN
    socket.on("draw_line", (data: DrawData) => {
      ctx.fillStyle = data.color; // Fill with color received
      ctx.beginPath(); // Start a new path to draw
      ctx.arc(data.x, data.y, 3, 0, Math.PI * 2); // Draw a dot at the coordinates received
      ctx.fill(); // Fill with color received
    }); // Receive a "draw_line" event

    socket.on("connect", () => {
      console.log("✅ Board Connected via Pure WebSockets:", socket.id);
    }); // Receive a "connect" event

    socket.on("connect_error", (err) => {
      console.error("❌ Socket Error:", err.message);
    }); // Receive a "connect_error" event

    return () => {
      socket.off("draw_line");
      socket.off("connect");
    };
  }, []); // Run once when component mounts

  // DRAWING LOGIC
  const executeDraw = (x: number, y: number, ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "black"; // Fill with black color
    ctx.beginPath(); // Start a new path to draw
    ctx.arc(x, y, 3, 0, Math.PI * 2); // Draw a dot at the coordinates
    ctx.fill(); // Fill with black color
    socket.emit("draw_line", { x, y, color: "blue" }); // Emit a "draw_line" event
  }; // Draw a dot at the coordinates received and emit a "draw_line" event to the server

  const drawMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1) return; // Only draw if the left mouse button is pressed
    const canvas = canvasRef.current; // Get the canvas element
    if (!canvas) return; // If the canvas element is not found, return
    const ctx = canvas.getContext("2d"); // Get the canvas context
    if (!ctx) return; // If the canvas context is not found, return
    const rect = canvas.getBoundingClientRect(); // Get the bounding rectangle of the canvas
    const scaleX = canvas.width / rect.width; // Calculate the scale factor
    const scaleY = canvas.height / rect.height; // Calculate the scale factor
    const x = (e.clientX - rect.left) * scaleX; // Calculate the x and y coordinates
    const y = (e.clientY - rect.top) * scaleY; // Calculate the x and y coordinates
    executeDraw(x, y, ctx); // Draw a dot at the coordinates received
  };

  // Touch Logic
  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current; // Get the canvas element
    if (!canvas) return; // If the canvas element is not found, return
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;
    executeDraw(x, y, ctx);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500 flex flex-col h-[500px]">
      <h2 className="text-xl font-bold mb-1">2. Sockets (Real-Time) 🚀</h2>
      <p className="text-xs text-gray-500 mb-4">Pure WebSockets Only</p>
      <div className="flex-1 relative border-2 border-dashed border-gray-300 rounded bg-gray-50 overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseMove={drawMouse}
          onTouchMove={drawTouch}
          width={400}
          height={400}
          className="cursor-crosshair w-full h-full touch-none"
        />
        <p className="absolute bottom-2 left-0 right-0 text-center text-[10px] text-gray-400 pointer-events-none">
          Draw here!
        </p>
      </div>
    </div>
  );
}
