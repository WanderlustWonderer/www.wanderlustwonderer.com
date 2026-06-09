import { ImageResponse } from "next/og";

export const alt = "Wanderlust Wonderer — Mystery · Magic · Movement";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OG() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          background: "linear-gradient(135deg, #070520 0%, #1a1253 55%, #2a1f6b 100%)",
          color: "#f5f1ff", fontFamily: "serif", position: "relative",
        }}
      >
        <div style={{ display: "flex", width: 150, height: 150, borderRadius: 999, marginBottom: 40,
          background: "radial-gradient(circle at 50% 42%, #fff6da 0%, #ffc24b 45%, #ff9a3d 80%, #ff6f4d 100%)" }} />
        <div style={{ display: "flex", fontSize: 76, fontWeight: 700, letterSpacing: 8, textAlign: "center" }}>
          WANDERLUST WONDERER
        </div>
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 14, marginTop: 24, color: "#ffc24b" }}>
          MYSTERY · MAGIC · MOVEMENT
        </div>
      </div>
    ),
    { ...size }
  );
}
