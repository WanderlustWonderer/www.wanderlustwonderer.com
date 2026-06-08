"use client";

/**
 * Renders an image or video with anti-casual-save protections + a per-viewer
 * watermark. NOTE: true screenshot prevention is impossible on the web — the
 * watermark makes any leak traceable to the viewer, which is the real deterrent.
 */
export function ProtectedMedia({
  kind, url, alt, watermark,
}: { kind: string; url: string; alt?: string; watermark: string }) {
  const block = (e: React.SyntheticEvent) => e.preventDefault();
  const stamp = watermark || "members only";
  return (
    <div
      className="protected-media"
      onContextMenu={block}
      style={{ position: "relative", overflow: "hidden", borderRadius: 12, userSelect: "none", WebkitUserSelect: "none" }}
    >
      {kind === "video" ? (
        <video
          src={url}
          controls
          controlsList="nodownload noremoteplayback noplaybackrate"
          disablePictureInPicture
          onContextMenu={block}
          style={{ width: "100%", display: "block", pointerEvents: "auto", WebkitTouchCallout: "none" } as React.CSSProperties}
        />
      ) : (
        <img
          src={url}
          alt={alt ?? ""}
          draggable={false}
          onDragStart={block}
          onContextMenu={block}
          style={{ width: "100%", display: "block", WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" } as React.CSSProperties}
        />
      )}
      {/* Tiled, faint per-viewer watermark — survives screenshots so leaks are traceable. */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage:
            `repeating-linear-gradient(-30deg, transparent 0 90px, rgba(255,255,255,0.10) 90px 92px)`,
          maskImage: "none",
        }}
      />
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden",
          display: "flex", flexWrap: "wrap", alignContent: "center", justifyContent: "center",
          transform: "rotate(-25deg) scale(1.4)", opacity: 0.18,
        }}
      >
        {Array.from({ length: 24 }).map((_, i) => (
          <span key={i} style={{ color: "#fff", fontSize: 12, whiteSpace: "nowrap", margin: "18px 26px", textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}>
            {stamp}
          </span>
        ))}
      </div>
    </div>
  );
}
