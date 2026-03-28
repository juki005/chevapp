"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app error boundary]", error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "16px",
        padding: "40px 20px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "48px" }}>🍖</div>
      <h2
        style={{
          fontFamily: "Oswald, sans-serif",
          fontSize: "22px",
          fontWeight: 700,
          color: "rgb(var(--foreground))",
          margin: 0,
        }}
      >
        Nešto je pošlo po krivu
      </h2>
      <p style={{ fontSize: "14px", color: "rgb(var(--muted))", margin: 0, maxWidth: "320px" }}>
        Došlo je do neočekivane greške. Pokušaj ponovo ili osvježi stranicu.
      </p>
      <button
        onClick={reset}
        style={{
          padding: "10px 24px",
          borderRadius: "12px",
          background: "#D35400",
          color: "#fff",
          fontFamily: "Oswald, sans-serif",
          fontWeight: 700,
          fontSize: "14px",
          border: "none",
          cursor: "pointer",
        }}
      >
        POKUŠAJ PONOVO
      </button>
    </div>
  );
}
