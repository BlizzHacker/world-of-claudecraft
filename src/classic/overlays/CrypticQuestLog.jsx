// CrypticQuestLog.jsx — Polished React quest log overlay.
// Replaces the canvas `_drawQuestLog` (lines ~10239 of CrypticRealmGame.js).
// Wade: "Quest menu doesn't fit right - menu ui still is very much ugly".
//
// Matches the MoveWeight Universe nav language (dark chip panel, accent
// color keyed to player class, ESC to close, click outside to close,
// scrollable on small screens). Mounted by GameOverlay.jsx when
// `game.questLog === true`; canvas variant is suppressed when
// `game.useQuestLogReactOverlay === true`.

import React, { useEffect, useMemo, useState } from "react"; // useMemo for filter + stats

const UI_Z = 199000; // below pause (200000), above palette (195000)
const FONT = "Inter, system-ui, Segoe UI, sans-serif";

export default function CrypticQuestLog({ game, onClose }) {
  const [tick, setTick] = useState(0);
  const [layout, setLayout] = useState(() => probeLayout());
  const [filter, setFilter] = useState("active"); // active | done | all

  useEffect(() => {
    const r = () => setLayout(probeLayout());
    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "q" || e.key === "Q" || e.key === "j" || e.key === "J") {
        e.preventDefault();
        if (game) game.questLog = false;
        onClose?.();
      }
    };
    window.addEventListener("resize", r);
    window.addEventListener("keydown", onKey, true);
    const tickInterval = setInterval(() => setTick(v => v + 1), 250);
    return () => {
      window.removeEventListener("resize", r);
      window.removeEventListener("keydown", onKey, true);
      clearInterval(tickInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, onClose]);

  if (!game || !game.cls) return null;

  const accent = game.cls?.color || "#44aaff";
  const theme = {
    accent, accentSoft: accent + "26", accentDim: accent + "55",
    bg: "linear-gradient(180deg, rgba(15,10,18,0.97), rgba(8,6,14,0.985))",
    panel: "rgba(12,10,18,0.85)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderHi: `1px solid ${accent}55`,
    text: "#f0e9d8", muted: "#9a8f7a", dim: "#5a5044",
    ok: "#44ff88", warn: "#ff9a34",
  };

  const quests = Array.isArray(game.quests) ? game.quests : [];
  const filtered = useMemo(() => {
    if (filter === "active") return quests.filter(q => !q.complete);
    if (filter === "done") return quests.filter(q => q.complete);
    return quests;
  }, [quests, filter]);

  const stats = useMemo(() => ({
    done: quests.filter(q => q.complete).length,
    total: quests.length,
  }), [quests]);

  const mobile = layout.mobile;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) { game.questLog = false; onClose?.(); } }}
      style={{
        position: "fixed", inset: 0, zIndex: UI_Z,
        background: "rgba(2,2,8,0.55)", backdropFilter: "blur(3px)",
        fontFamily: FONT, color: theme.text,
        display: "flex", alignItems: mobile ? "flex-start" : "center", justifyContent: "center",
        padding: mobile ? 6 : 32, overflowY: "auto",
        animation: "mwQlFade 0.18s ease-out",
      }}>
      <style>{`@keyframes mwQlFade { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }`}</style>
      <div style={{
        width: "100%", maxWidth: mobile ? "100%" : 720,
        background: theme.bg, border: theme.border, borderRadius: mobile ? 10 : 14,
        boxShadow: `0 30px 90px rgba(0,0,0,0.65), 0 0 80px ${accent}25`,
        display: "flex", flexDirection: "column",
        maxHeight: mobile ? "calc(100dvh - 12px)" : "min(90vh, 760px)",
        overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: mobile ? "10px 14px" : "14px 22px",
          borderBottom: theme.border, gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: accent + "33", border: `1px solid ${accent}88`,
              color: accent, display: "grid", placeItems: "center",
              fontWeight: 950, fontSize: 14,
            }}>Q</div>
            <div>
              <div style={{ color: accent, fontWeight: 950, fontSize: 14, letterSpacing: ".12em" }}>
                QUEST LOG
              </div>
              <div style={{ color: theme.muted, fontSize: 10, fontWeight: 700, letterSpacing: ".10em" }}>
                {stats.done} / {stats.total} COMPLETE · ACT {(game.actIdx ?? 0) + 1}
              </div>
            </div>
          </div>
          <button onClick={() => { game.questLog = false; onClose?.(); }}
            title="Close (Q / J / Esc)" style={{
              background: "rgba(255,77,77,0.18)", border: "1px solid #ff4d4d", color: "#ff4d4d",
              padding: "8px 18px", borderRadius: 10, cursor: "pointer",
              fontFamily: FONT, fontSize: 11, fontWeight: 950, letterSpacing: ".10em",
            }}>✕ CLOSE</button>
        </div>

        {/* Filter chips */}
        <div style={{ display: "flex", gap: 6, padding: "10px 18px", flexShrink: 0 }}>
          {[
            ["active", `ACTIVE (${quests.filter(q => !q.complete).length})`],
            ["done",   `COMPLETE (${stats.done})`],
            ["all",    `ALL (${stats.total})`],
          ].map(([id, label]) => {
            const active = filter === id;
            return (
              <button key={id} onClick={() => setFilter(id)} style={{
                padding: "6px 14px", borderRadius: 7,
                background: active ? theme.accentSoft : theme.panel,
                border: active ? theme.borderHi : theme.border,
                color: active ? accent : theme.muted,
                fontFamily: FONT, fontSize: 10, fontWeight: 900, letterSpacing: ".08em",
                cursor: "pointer", whiteSpace: "nowrap",
              }}>{label}</button>
            );
          })}
        </div>

        {/* Quest list */}
        <div style={{ flex: 1, overflowY: "auto", padding: mobile ? "0 12px 14px" : "0 22px 22px", minHeight: 0 }}>
          {filtered.length === 0 && (
            <div style={{
              padding: "30px 20px", textAlign: "center",
              background: theme.panel, border: theme.border, borderRadius: 9,
              color: theme.muted, fontSize: 12, lineHeight: 1.7,
            }}>
              {filter === "active"
                ? "All caught up — no active quests in this act. Talk to NPCs or descend into the dungeon to find more."
                : filter === "done"
                  ? "No completed quests yet."
                  : "No quests in this log."}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {filtered.map((q, i) => {
              const pct = Math.min(1, (q.done || 0) / Math.max(1, q.needed || 1));
              const barColor = q.complete ? theme.ok : accent;
              return (
                <div key={q.id || i} style={{
                  padding: "12px 14px",
                  background: q.complete ? "rgba(0,50,15,0.45)" : theme.panel,
                  border: q.complete ? `1px solid ${theme.ok}55` : theme.border,
                  borderRadius: 10,
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 10, marginBottom: 8 }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 4,
                        padding: "2px 8px", borderRadius: 5,
                        background: q.complete ? theme.ok + "22" : accent + "22",
                        border: `1px solid ${q.complete ? theme.ok : accent}`,
                        color: q.complete ? theme.ok : accent,
                        fontSize: 9, fontWeight: 900, letterSpacing: ".10em",
                      }}>
                        {q.complete ? "✔ COMPLETE" : "○ ACTIVE"}
                      </div>
                      <div style={{
                        color: q.complete ? "#cfeed5" : theme.text,
                        fontSize: mobile ? 13 : 14, fontWeight: 800, lineHeight: 1.35,
                      }}>
                        {q.name}
                      </div>
                      {q.desc && (
                        <div style={{
                          color: theme.muted, fontSize: 11, marginTop: 4, lineHeight: 1.5,
                        }}>{q.desc}</div>
                      )}
                    </div>
                    <div style={{
                      flexShrink: 0, textAlign: "right",
                      color: q.complete ? "#cfeed5" : theme.muted,
                      fontSize: 11, fontWeight: 800,
                    }}>
                      {q.done || 0} / {q.needed || 1}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div style={{
                    height: 8, background: "#0a0a12", border: theme.border,
                    borderRadius: 4, overflow: "hidden", marginBottom: 6,
                  }}>
                    <div style={{
                      height: "100%",
                      width: `${pct * 100}%`,
                      background: `linear-gradient(90deg, ${barColor}55, ${barColor})`,
                      transition: "width 0.3s ease-out",
                    }} />
                  </div>

                  {/* Reward */}
                  {q.reward && (
                    <div style={{
                      display: "flex", gap: 12, color: "#ddbb66",
                      fontSize: 10, fontWeight: 700, letterSpacing: ".04em",
                    }}>
                      {q.reward.xp ? <span>+{q.reward.xp} XP</span> : null}
                      {q.reward.gold ? <span>💰 {q.reward.gold}</span> : null}
                      {q.reward.identify ? <span>🔍 ID scroll</span> : null}
                      {q.reward.item ? <span>📜 {q.reward.item}</span> : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer hint */}
        <div style={{
          padding: "8px 18px", borderTop: theme.border,
          color: theme.muted, fontSize: 9, fontWeight: 700, letterSpacing: ".08em",
          textAlign: "center", flexShrink: 0,
        }}>
          ESC · Q · J — close
        </div>
      </div>
    </div>
  );
}

function probeLayout() {
  const w = window.innerWidth || 1024;
  const h = window.innerHeight || 768;
  return { mobile: w < 760, w, h };
}
