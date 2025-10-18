import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "AI Sessions - Share AI coding sessions";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0a0a0a",
        backgroundImage:
          "radial-gradient(circle at 25px 25px, #333 2%, transparent 0%), radial-gradient(circle at 75px 75px, #333 2%, transparent 0%)",
        backgroundSize: "100px 100px",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px",
        }}
      >
        <h1
          style={{
            fontSize: "72px",
            fontWeight: "bold",
            background: "linear-gradient(to right, #fff, #999)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            color: "transparent",
            marginBottom: "20px",
            textAlign: "center",
          }}
        >
          AI Sessions
        </h1>
        <p
          style={{
            fontSize: "36px",
            color: "#999",
            textAlign: "center",
            maxWidth: "800px",
          }}
        >
          Share AI coding sessions
        </p>
      </div>
    </div>,
    {
      ...size,
    },
  );
}
