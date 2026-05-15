"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="ko">
      <body
        style={{
          minHeight: "100vh",
          margin: 0,
          background: "#000",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 460, padding: "0 24px" }}>
          <p
            style={{
              fontSize: 12,
              letterSpacing: "0.3em",
              color: "#f87171",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            Critical Error
          </p>
          <h1 style={{ fontSize: 30, fontWeight: 700, marginBottom: 12 }}>
            앱을 불러올 수 없습니다
          </h1>
          <p style={{ fontSize: 14, color: "#a1a1aa", marginBottom: 8 }}>
            루트 레이아웃에서 예상치 못한 오류가 발생했습니다.
          </p>
          {error.digest && (
            <p
              style={{
                fontSize: 12,
                color: "#52525b",
                marginBottom: 24,
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              }}
            >
              ref: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              background: "#fff",
              color: "#000",
              border: "none",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
