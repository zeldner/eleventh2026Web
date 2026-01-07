// Ilya Zeldner - SocketBoard (With Clear Function)
import React, { useEffect, useRef } from "react";
import { socket } from "../socket"; // <--- Import from the new file
interface DrawData {
  x: number;
  y: number;
  color: string;
}

export default function SocketBoard() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // LISTEN FOR DRAWING
    socket.on("draw_line", (data: DrawData) => {
      ctx.fillStyle = data.color;
      ctx.beginPath();
      ctx.arc(data.x, data.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // LISTEN FOR CLEAR
    socket.on("clear_board", () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    socket.on("connect", () => {
      console.log("✅ Board Connected:", socket.id);
    });

    return () => {
      socket.off("draw_line");
      socket.off("clear_board");
      socket.off("connect");
    };
  }, []);

  // DRAWING LOGIC
  const executeDraw = (x: number, y: number, ctx: CanvasRenderingContext2D) => {
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2); //
    ctx.fill();
    socket.emit("draw_line", { x, y, color: "blue" });
  };

  const drawMouse = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.buttons !== 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    executeDraw(x, y, ctx);
  };

  const drawTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const x = (touch.clientX - rect.left) * (canvas.width / rect.width);
    const y = (touch.clientY - rect.top) * (canvas.height / rect.height);
    executeDraw(x, y, ctx);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    ctx?.clearRect(0, 0, canvas.width, canvas.height);

    socket.emit("clear_board");
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-green-500 flex flex-col h-[500px]">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold mb-1">2. Sockets (Real-Time) 🚀</h2>
          <p className="text-xs text-gray-500">Pure WebSockets Only</p>
        </div>

        <button
          onClick={handleClear}
          className="bg-red-100 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-200 transition font-bold border border-red-200"
        >
          🧹 Clear Board
        </button>
      </div>

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
