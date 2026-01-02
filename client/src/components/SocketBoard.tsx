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

export default function SocketBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null); // Reference to the canvas

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d"); // Get the canvas context
    if (!ctx) return;

    // LISTEN: Server pushes drawing data
    socket.on("draw_line", (data: DrawData) => {
      ctx.fillStyle = data.color;
      ctx.beginPath();
      ctx.arc(data.x, data.y, 3, 0, Math.PI * 2); // Draw a small circle at the position from the server data (Shared by Mouse and Touch)
      ctx.fill();
    });

    return () => {
      socket.off("draw_line"); // Cleanup on unmount to avoid memory leaks
    };
  }, []);

  // The actual drawing logic (Shared by Mouse and Touch)
  const executeDraw = (x: number, y: number, ctx: CanvasRenderingContext2D) => {
    // Draw Locally
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2); // Draw a small circle at the position from the user input
    ctx.fill();

    // Send to Server
    socket.emit("draw_line", { x, y, color: "blue" });
  };

  // MOUSE Handler (For PC)
  const drawMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1) return; // Only draw if clicked

    const canvas = canvasRef.current; // Get the canvas element from the ref
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect(); // Get the position of the canvas
    const scaleX = canvas.width / rect.width; // Scale the position to fit the canvas
    const scaleY = canvas.height / rect.height; // Scale the position to fit the canvas

    const x = (e.clientX - rect.left) * scaleX; // Get the position of the mouse on the canvas
    const y = (e.clientY - rect.top) * scaleY; // Get the position of the mouse on the canvas

    executeDraw(x, y, ctx); // Draw the circle at the mouse position
  };

  // TOUCH Handler (For Phone/S-Pen)
  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    // Prevent scrolling while drawing
    // (touch-action: none' in CSS usually handles this, but this is safe)

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Get the position of the FIRST finger
    const touch = e.touches[0];

    const x = (touch.clientX - rect.left) * scaleX;
    const y = (touch.clientY - rect.top) * scaleY;

    executeDraw(x, y, ctx);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500 flex flex-col h-[500px]">
      <h2 className="text-xl font-bold mb-1">2. Sockets (Real-Time) 🚀</h2>
      <p className="text-xs text-gray-500 mb-4">Updates instantly via Push.</p>

      <div className="flex-1 relative border-2 border-dashed border-gray-300 rounded bg-gray-50 overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseMove={drawMouse} // PC
          onTouchMove={drawTouch} // Phone
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
