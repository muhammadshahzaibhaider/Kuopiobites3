import React from "react";

export default function LightRays() {
  return (
    <div className="light-rays-bg" aria-hidden>
      <div className="ray-conic" />
      <div className="ray-glow" />
      <div
        className="absolute inset-0 opacity-[0.035]"
        style={{
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.4) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#030303] via-[#030303]/80 to-transparent" />
    </div>
  );
}
