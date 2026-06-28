// CrypticSkillTreeOverlay.jsx — Polished React skill tree replacement.
// Replaces canvas _drawSkillTree (~line 10353). MWU nav style. ESC/T/✕ close.

import React, { useEffect, useState } from "react";

const UI_Z = 199700;
const FONT = "Inter, system-ui, Segoe UI, sans-serif";

export default function CrypticSkillTreeOverlay({ game, onClose }) {
  const [tick, setTick] = useState(0);
  const [layout, setLayout] = useState(() => probeLayout());
  const [activeTree, setActiveTree] = useState(game?.skillTreeTab || 0);

  useEffect(() => {
    const r = () => setLayout(probeLayout());
    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "t" || e.key === "T" || e.key === "k" || e.key === "K") {
        e.preventDefault();
        if (game) game.showSkillTree = false;
        onClose?.();
      }
    };
    window.addEventListener("resize", r);
    window.addEventListener("keydown", onKey, true);
    const t = setInterval(() => setTick(v => v + 1), 200);
    return () => { window.removeEventListener("resize", r); window.removeEventListener("keydown", onKey, true); clearInterval(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  if (!game?.player || !game.cls) return null;
  const accent = game.cls.color || "#44aaff";
  const theme = {
    accent, accentSoft: accent + "26",
    bg: "linear-gradient(180deg, rgba(15,10,18,0.97), rgba(8,6,14,0.985))",
    panel: "rgba(12,10,18,0.85)", panelHi: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderHi: `1px solid ${accent}55`,
    text: "#f0e9d8", muted: "#9a8f7a", dim: "#5a5044",
    ok: "#44ff88", warn: "#ff9a34", locked: "#553a30",
  };

  const p = game.player;
  const cls = game.cls;
  const skills = Array.isArray(cls.skills) ? cls.skills : [];
  const trees = Array.isArray(cls.skillTrees) && cls.skillTrees.length ? cls.skillTrees : ["Combat", "Magic", "Support"];
  const skillRanks = Array.isArray(p.skillRanks) ? p.skillRanks : new Array(skills.length).fill(0);

  // 10 skills per tree (max 30 skills, 3 trees)
  const startIdx = activeTree * 10;
  const treeSkills = skills.slice(startIdx, startIdx + 10);

  const spendPoint = (skIdx) => {
    if ((p.skillPoints || 0) <= 0) return;
    const sk = skills[skIdx];
    if (!sk) return;
    if (sk.reqLevel && p.level < sk.reqLevel) return;
    if ((skillRanks[skIdx] || 0) >= 20) return;
    skillRanks[skIdx] = (skillRanks[skIdx] || 0) + 1;
    p.skillRanks = skillRanks;
    p.skillPoints = (p.skillPoints || 0) - 1;
    // Auto-bind to skill bar if empty slot
    const bar = Array.isArray(game.skillBar) ? game.skillBar : [];
    if (!bar.includes(skIdx) && bar.indexOf(null) >= 0) {
      bar[bar.indexOf(null)] = skIdx;
    }
    setTick(v => v + 1);
  };
  const assignLeft = (skIdx) => { game.leftSkill = skIdx; setTick(v => v + 1); };
  const assignRight = (skIdx) => { game.rightSkill = skIdx; setTick(v => v + 1); };

  const mobile = layout.mobile;
  return (
    <div onClick={e => { if (e.target === e.currentTarget) { game.showSkillTree = false; onClose?.(); } }}
      style={{
        position: "fixed", inset: 0, zIndex: UI_Z,
        background: "rgba(2,2,8,0.55)", backdropFilter: "blur(3px)",
        fontFamily: FONT, color: theme.text,
        display: "flex", alignItems: mobile ? "flex-start" : "center", justifyContent: "center",
        padding: mobile ? 6 : 24, overflowY: "auto",
      }}>
      <div style={{
        width: "100%", maxWidth: mobile ? "100%" : 1040,
        background: theme.bg, border: theme.border, borderRadius: mobile ? 10 : 14,
        boxShadow: `0 30px 90px rgba(0,0,0,0.65), 0 0 80px ${accent}25`,
        display: "flex", flexDirection: "column",
        maxHeight: mobile ? "calc(100dvh - 12px)" : "min(94vh, 820px)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: mobile ? "10px 14px" : "14px 22px", borderBottom: theme.border, gap: 10 }}>
          <div>
            <div style={{ color: accent, fontWeight: 950, fontSize: 14, letterSpacing: ".12em" }}>SKILL TREE</div>
            <div style={{ color: theme.muted, fontSize: 10, fontWeight: 700, letterSpacing: ".10em" }}>
              {cls.name?.toUpperCase()} · LV {p.level} · <span style={{ color: (p.skillPoints||0) > 0 ? theme.ok : theme.muted }}>+{p.skillPoints || 0} POINTS</span>
            </div>
          </div>
          <button onClick={() => { game.showSkillTree = false; onClose?.(); }} title="Close (Esc / T / K)" style={{
            background: "rgba(255,77,77,0.18)", border: "1px solid #ff4d4d", color: "#ff4d4d",
            padding: "8px 18px", borderRadius: 10, cursor: "pointer",
            fontFamily: FONT, fontSize: 11, fontWeight: 950, letterSpacing: ".10em",
          }}>✕ CLOSE</button>
        </div>

        {/* Tree tabs */}
        <div style={{ display: "flex", gap: 4, padding: "10px 18px 0 18px", flexShrink: 0, overflowX: "auto" }}>
          {trees.map((name, i) => {
            const active = activeTree === i;
            const pointsInTree = skillRanks.slice(i*10, i*10+10).reduce((a,b) => a + (b||0), 0);
            return (
              <button key={i} onClick={() => { setActiveTree(i); game.skillTreeTab = i; }} style={{
                padding: "8px 16px", borderRadius: 7,
                background: active ? theme.accentSoft : theme.panel,
                border: active ? `1px solid ${accent}55` : theme.border,
                color: active ? accent : theme.muted,
                fontFamily: FONT, fontSize: 11, fontWeight: 900, letterSpacing: ".10em",
                cursor: "pointer", whiteSpace: "nowrap",
              }}>{name.toUpperCase()} · {pointsInTree}</button>
            );
          })}
        </div>

        {/* Skill grid */}
        <div style={{ flex: 1, overflowY: "auto", padding: mobile ? 10 : 18, display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 8 }}>
          {treeSkills.map((sk, localIdx) => {
            const absIdx = startIdx + localIdx;
            const rank = skillRanks[absIdx] || 0;
            const locked = sk.reqLevel && p.level < sk.reqLevel;
            const maxed = rank >= 20;
            const isLeft = game.leftSkill === absIdx;
            const isRight = game.rightSkill === absIdx;
            const c = sk.color || theme.text;
            return (
              <div key={absIdx} style={{
                padding: "10px 12px",
                background: locked ? "rgba(40,30,20,0.5)" : (rank > 0 ? c + "12" : theme.panel),
                border: locked ? `1px solid ${theme.locked}` : (rank > 0 ? `1px solid ${c}66` : theme.border),
                borderRadius: 10,
                opacity: locked ? 0.55 : 1,
                display: "flex", flexDirection: "column", gap: 6,
              }}>
                {/* Top row: icon + name + rank */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 7,
                    background: locked ? theme.locked : c + "33",
                    border: `1px solid ${locked ? theme.locked : c}88`,
                    color: locked ? theme.muted : c,
                    display: "grid", placeItems: "center",
                    fontSize: 18, fontWeight: 900, flexShrink: 0,
                  }}>{sk.icon || "✦"}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: locked ? theme.muted : theme.text, fontSize: 12, fontWeight: 900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sk.name}</div>
                    <div style={{ color: theme.muted, fontSize: 9, letterSpacing: ".06em" }}>
                      {sk.type ? sk.type.toUpperCase() + " · " : ""}{sk.mp ? `MP ${sk.mp}` : "PASSIVE"}
                      {locked ? ` · LOCKED (LV ${sk.reqLevel})` : ""}
                    </div>
                  </div>
                  <div style={{
                    padding: "2px 8px", borderRadius: 5,
                    background: maxed ? theme.warn + "33" : c + "22", color: maxed ? theme.warn : c,
                    fontSize: 11, fontWeight: 950, letterSpacing: ".06em",
                  }}>{rank}/20</div>
                </div>

                {/* Rank bar */}
                <div style={{ height: 6, background: "#0a0a12", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${rank/20*100}%`, background: `linear-gradient(90deg, ${c}55, ${c})`, transition: "width 0.3s" }} />
                </div>

                {/* Action row */}
                <div style={{ display: "flex", gap: 4 }}>
                  <button onClick={() => assignLeft(absIdx)} disabled={locked || rank === 0} style={btnLR(theme, isLeft, accent)}>L {isLeft ? "✓" : ""}</button>
                  <button onClick={() => assignRight(absIdx)} disabled={locked || rank === 0} style={btnLR(theme, isRight, accent)}>R {isRight ? "✓" : ""}</button>
                  <button onClick={() => spendPoint(absIdx)} disabled={locked || maxed || (p.skillPoints||0) === 0} style={btnPlus(theme, locked || maxed || (p.skillPoints||0) === 0)}>+ SPEND</button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "8px 18px", borderTop: theme.border, color: theme.muted, fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textAlign: "center" }}>
          ESC · T · K — close · L / R assign mouse · + spends a point
        </div>
      </div>
    </div>
  );
}

const btnLR = (theme, active, accent) => ({
  flex: 1, padding: "6px 8px",
  background: active ? accent + "33" : theme.panel,
  border: active ? `1px solid ${accent}` : theme.border,
  color: active ? accent : theme.text,
  borderRadius: 6, cursor: "pointer",
  fontFamily: FONT, fontSize: 9, fontWeight: 900, letterSpacing: ".06em",
});
const btnPlus = (theme, disabled) => ({
  flex: 1, padding: "6px 8px",
  background: disabled ? theme.dim + "22" : theme.ok + "22",
  border: `1px solid ${disabled ? theme.dim : theme.ok}`,
  color: disabled ? theme.dim : theme.ok,
  borderRadius: 6, cursor: disabled ? "not-allowed" : "pointer",
  fontFamily: FONT, fontSize: 9, fontWeight: 900, letterSpacing: ".08em",
});

function probeLayout() {
  const w = window.innerWidth || 1024;
  const h = window.innerHeight || 768;
  return { mobile: w < 760, w, h };
}
