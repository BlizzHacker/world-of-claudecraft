import React, { useEffect } from "react";

const FONT = "Inter, system-ui, Segoe UI, sans-serif";
const DIVIDER = "1px solid rgba(255,255,255,.08)";

export function useEscToClose(onClose, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof onClose !== "function") return undefined;
    const onKey = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose(event);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose, enabled]);
}

export function closeOnBackdrop(event, onClose) {
  if (event.target === event.currentTarget && typeof onClose === "function") {
    onClose(event);
  }
}

export function OverlayHeader({
  title,
  subtitle,
  onClose,
  children,
  accent = "#d4a030",
  closeLabel = "✕ CLOSE",
  closeTitle = "Close (Esc)",
  style = {},
  titleStyle = {},
}) {
  return (
    <div style={{ padding: "12px 20px", borderBottom: DIVIDER, flexShrink: 0, ...style }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ minWidth: 0 }}>
          <h2 style={{
            margin: 0,
            color: accent,
            fontSize: 18,
            fontFamily: FONT,
            fontWeight: 900,
            letterSpacing: ".06em",
            ...titleStyle,
          }}>{title}</h2>
          {subtitle && (
            <div style={{ fontSize: 10, color: "#8899aa", marginTop: 6, fontFamily: FONT, letterSpacing: ".04em" }}>
              {subtitle}
            </div>
          )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
          {children}
          {onClose && (
            <button onClick={onClose} title={closeTitle} style={{
              background: "rgba(255,77,77,.18)",
              border: "1px solid #ff4d4d",
              color: "#ff4d4d",
              padding: "8px 18px",
              cursor: "pointer",
              fontFamily: FONT,
              fontSize: 12,
              fontWeight: 900,
              borderRadius: 10,
              letterSpacing: ".08em",
            }}>{closeLabel}</button>
          )}
        </div>
      </div>
    </div>
  );
}
