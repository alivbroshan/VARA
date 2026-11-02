import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07090e",
          borderRadius: "8px",
          border: "1px solid rgba(244, 63, 94, 0.4)",
        }}
      >
        <svg viewBox="0 0 32 32" width="22" height="22" fill="none">
          <path
            d="M6 8L16 24L26 8"
            stroke="#ffffff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10 14H14.5L16 11L17.5 17L19 14H22"
            stroke="#f43f5e"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="16" cy="6" r="2.2" fill="#fb7185" />
        </svg>
      </div>
    ),
    { ...size }
  );
}