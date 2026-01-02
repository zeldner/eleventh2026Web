// Ilya Zeldner
import React, { useEffect, useRef } from "react";
import io from "socket.io-client";

interface DrawData {
  x: number;
  y: number;
  color: string;
}

// Environment Variable
const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

// Initialize Socket connection once (outside component)
const socket = io(SERVER_URL);

// SOCKET COMPONENT (The "Active" Board)
export function SocketBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // LISTEN: Server pushes drawing data
    socket.on("draw_line", (data: DrawData) => {
      ctx.fillStyle = data.color;
      ctx.beginPath();
      ctx.arc(data.x, data.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    return () => {
      socket.off("draw_line");
    };
  }, []);

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1) return; // Only draw if clicked

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Draw Locally (Black)
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2); 
    ctx.fill();

    // Send to Server
    socket.emit("draw_line", { x, y, color: "blue" });
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500 flex flex-col h-[500px]">
      <h2 className="text-xl font-bold mb-1">2. Sockets (Real-Time) 🚀</h2>
      <p className="text-xs text-gray-500 mb-4">Updates instantly via Push.</p>

      <div className="flex-1 relative border-2 border-dashed border-gray-300 rounded bg-gray-50 overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseMove={draw}
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
