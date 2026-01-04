// Ilya Zeldner - SocketBoard (Pure WebSocket Version)
import React, { useEffect, useRef } from "react";
import io from "socket.io-client";

interface DrawData {
  x: number;
  y: number;
  color: string;
} // DrawData Interface

//UNIVERSAL URL LOGIC
const rawUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
const cleanHost = rawUrl
  .replace(/^https?:\/\//, "")
  .split("/")[0]
  .split(":")[0];
let CONNECT_URL;

if (cleanHost === "localhost") {
  // LOCAL: Connect to the Dedicated Socket Port (3002)
  CONNECT_URL = "http://localhost:3002";
} else {
  // PROD: Connect to the Main URL (443)
  CONNECT_URL = rawUrl;
}

// PURE WEBSOCKET CONFIGURATION
// ONLY 'websocket' because Port 3002 has no conflicts!
const socket = io(CONNECT_URL, {
  transports: ["websocket"], // ⚡ Pure Real-Time (Educational Goal Met)
  withCredentials: true,
  autoConnect: true,
}); // Socket Configuration

export default function SocketBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null); // Canvas Reference

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // LISTEN
    socket.on("draw_line", (data: DrawData) => {
      ctx.fillStyle = data.color;
      ctx.beginPath();
      ctx.arc(data.x, data.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }); // ⚡ Pure Real-Time

    socket.on("connect", () => {
      console.log(
        "✅ SocketBoard Connected via Pure WebSocket! ID:",
        socket.id
      );
    });

    socket.on("connect_error", (err) => {
      console.error("Socket Error:", err.message);
    });

    return () => {
      socket.off("draw_line");
      socket.off("connect");
    }; // CLEANUP
  }, []); // USE EFFECT END

  // DRAWING LOGIC
  const executeDraw = (x: number, y: number, ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
    socket.emit("draw_line", { x, y, color: "blue" });
  }; // executeDraw Function

  const drawMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect(); // get canvas rect
    const scaleX = canvas.width / rect.width; // calculate scaling
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX; // calculate mouse position
    const y = (e.clientY - rect.top) * scaleY;
    executeDraw(x, y, ctx); // execute draw
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;
    executeDraw(x, y, ctx);
  }; // drawTouch Function

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500 flex flex-col h-[500px]">
      <h2 className="text-xl font-bold mb-1">2. Sockets (Real-Time) 🚀</h2>
      <p className="text-xs text-gray-500 mb-4">Using Pure WebSockets 📡</p>

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
