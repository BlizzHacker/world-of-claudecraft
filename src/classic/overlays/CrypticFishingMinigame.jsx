// CrypticFishingMinigame.jsx — Alpha 5.2 first mini-game inside Cryptic Realm.
// Timing-based clicker. Open via game.showFishing = true.

import React, { useEffect, useState } from "react";

const UI_Z = 199800;
const FONT = "Inter, system-ui, Segoe UI, sans-serif";

export default function CrypticFishingMinigame({ game, onClose }) {
  const [tick, setTick] = useState(0);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    if (!game?.fishing?.active) game?._startFishingMinigame?.();
    const t = setInterval(() => setTick(v => (v + 1) % 1_000_000), 50);
    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "f" || e.key === "F") {
        e.preventDefault(); game?._endFishingMinigame?.(); onClose?.();
      }
      if (e.key === " " || e.code === "Space" || e.key === "Enter") {
        e.preventDefault(); handleClick();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => { clearInterval(t); window.removeEventListener("keydown", onKey, true); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  if (!game) return null;
  const accent = "#4dd0e1";
  const theme = {
    accent, accentSoft: accent + "22",
    bg: "linear-gradient(180deg, rgba(8,18,28,0.97), rgba(4,10,18,0.99))",
    panel: "rgba(8,15,22,0.85)",
    border: "1px solid rgba(255,255,255,0.10)",
    text: "#e8f7ff", muted: "#8aa5b8",
    ok: "#44ff88", warn: "#ff9a34", danger: "#ff4d4d",
  };

  const f = game.fishing;
  const now = game._frame || 0;
  const isPreBite = f?.active && now < (f.biteAt || 0);
  const isWindow = f?.active && now >= (f.biteAt || 0) && now <= (f.biteAt || 0) + (f.windowFrames || 0);
  const isOver = !f?.active;
  const progress = f && f.biteAt ? Math.min(1, (now - f.startedAt) / Math.max(1, (f.biteAt - f.startedAt))) : 0;

  const handleClick = () => {
    if (!game._fishingClick) return;
    const r = game._fishingClick();
    setLastResult(r);
    if (r) {
      setTimeout(() => {
        game._endFishingMinigame?.();
        onClose?.();
      }, 1400);
    }
  };

  const recast = () => {
    setLastResult(null);
    game._startFishingMinigame?.();
  };

  return (
    <div onClick={e => { if (e.target === e.currentTarget) { game._endFishingMinigame?.(); onClose?.(); } }}
      style={{
        position: "fixed", inset: 0, zIndex: UI_Z,
        background: "rgba(2,2,8,0.65)", backdropFilter: "blur(4px)",
        display: "grid", placeItems: "center", padding: 24,
        fontFamily: FONT, color: theme.text,
      }}>
      <div style={{
        width: "100%", maxWidth: 540, padding: 28,
        background: theme.bg, border: theme.border, borderRadius: 14,
        boxShadow: `0 30px 90px rgba(0,0,0,0.65), 0 0 80px ${accent}25`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <div style={{ color: accent, fontWeight: 950, fontSize: 16, letterSpacing: ".12em" }}>🎣 FISHING</div>
            <div style={{ color: theme.muted, fontSize: 10, fontWeight: 700, letterSpacing: ".08em" }}>
              Cryptic Realm mini-game · 💰 {(game.player?.gold || 0).toLocaleString()}
            </div>
          </div>
          <button onClick={() => { game._endFishingMinigame?.(); onClose?.(); }} style={{
            background: "rgba(255,77,77,0.18)", border: "1px solid #ff4d4d", color: "#ff4d4d",
            padding: "6px 14px", borderRadius: 8, cursor: "pointer",
            fontFamily: FONT, fontSize: 10, fontWeight: 900, letterSpacing: ".08em",
          }}>✕ LEAVE</button>
        </div>

        {/* Water visualization */}
        <div style={{
          position: "relative", height: 180,
          background: `linear-gradient(180deg, #0a2438 0%, #04111c 100%)`,
          border: `1px solid ${accent}44`, borderRadius: 12,
          overflow: "hidden", marginBottom: 16,
        }}>
          {/* Wave lines */}
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              position: "absolute", left: 0, right: 0,
              top: `${20 + i * 30}%`, height: 1,
              background: `${accent}33`,
              transform: `translateX(${Math.sin((tick + i * 8) * 0.1) * 6}px)`,
            }} />
          ))}
          {/* Bobber */}
          <div style={{
            position: "absolute",
            left: "50%", top: isPreBite ? "50%" : isWindow ? "30%" : "60%",
            transform: `translate(-50%, -50%) translateY(${Math.sin(tick * 0.2) * 3}px)`,
            fontSize: 32,
            transition: "top 0.2s",
            filter: isWindow ? `drop-shadow(0 0 12px ${theme.ok})` : "none",
          }}>{isOver ? (lastResult?.ok ? "🐟" : "🪝") : isWindow ? "💢" : "🪝"}</div>
          {/* Status text */}
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 14,
            textAlign: "center", color: theme.text, fontSize: 12, fontWeight: 800, letterSpacing: ".08em",
          }}>
            {isPreBite && "WAITING FOR A BITE..."}
            {isWindow && <span style={{ color: theme.ok, fontSize: 16, fontWeight: 950 }}>FISH ON! CLICK NOW!</span>}
            {isOver && (lastResult?.ok ? <span style={{ color: theme.ok }}>{lastResult.reward?.label} +{lastResult.reward?.gold}g</span> : <span style={{ color: theme.danger }}>Got away — try again!</span>)}
          </div>
        </div>

        {/* Progress bar to bite */}
        {isPreBite && (
          <div style={{ height: 6, background: "#0a1218", borderRadius: 3, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ height: "100%", width: `${progress * 100}%`, background: `linear-gradient(90deg, ${accent}55, ${accent})`, transition: "width 0.1s" }} />
          </div>
        )}

        {/* Button */}
        <button onClick={isOver ? recast : handleClick} style={{
          width: "100%", padding: "14px",
          background: isWindow ? theme.ok + "33" : accent + "22",
          border: `2px solid ${isWindow ? theme.ok : accent}`,
          color: isWindow ? theme.ok : accent,
          borderRadius: 10, cursor: "pointer",
          fontFamily: FONT, fontSize: 14, fontWeight: 950, letterSpacing: ".10em",
          transition: "all 0.12s",
        }}>
          {isOver ? "🪝 RECAST" : isWindow ? "🎯 SNAG IT! (SPACE)" : "⏳ WAIT FOR THE BITE..."}
        </button>

        <div style={{ marginTop: 12, color: theme.muted, fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textAlign: "center" }}>
          SPACE / ENTER snag · F / ESC leave · click outside to leave
        </div>
      </div>
    </div>
  );
}
