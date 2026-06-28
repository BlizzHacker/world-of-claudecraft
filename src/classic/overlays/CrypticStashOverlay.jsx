// CrypticStashOverlay.jsx — Polished React stash replacement.
// Replaces canvas _drawStash (~ line 10636). MWU nav style. ESC/S/✕ close.

import React, { useEffect, useState } from "react";

const UI_Z = 199600;
const FONT = "Inter, system-ui, Segoe UI, sans-serif";

const TABS = [
  ["personal", "PERSONAL"],
  ["shared",   "SHARED"],
  ["gems",     "GEMS"],
  ["materials","MATERIALS"],
  ["runes",    "RUNES"],
];

export default function CrypticStashOverlay({ game, onClose }) {
  const [tick, setTick] = useState(0);
  const [layout, setLayout] = useState(() => probeLayout());
  const [activeTab, setActiveTab] = useState(game?.stashTab || "personal");

  useEffect(() => {
    const r = () => setLayout(probeLayout());
    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "s" || e.key === "S") {
        e.preventDefault();
        if (game) game.showStash = false;
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
    panel: "rgba(12,10,18,0.85)",
    border: "1px solid rgba(255,255,255,0.10)",
    text: "#f0e9d8", muted: "#9a8f7a", dim: "#5a5044",
    rarity: { common: "#cccccc", magic: "#7898ff", rare: "#ffe04a", set: "#3aff5a", unique: "#a37346", crafted: "#ff9a34" },
  };

  const p = game.player;
  const bag = Array.isArray(p.inventory) ? p.inventory : [];
  const personalStash = Array.isArray(p.stash) ? p.stash : [];
  const sharedStash   = Array.isArray(game.sharedStash) ? game.sharedStash : [];

  let activeList = personalStash;
  if (activeTab === "shared") activeList = sharedStash;
  else if (activeTab === "gems") activeList = bag.filter(it => it.type === "gem" || it.slot === "gem");
  else if (activeTab === "materials") activeList = bag.filter(it => it.type === "material");
  else if (activeTab === "runes") activeList = bag.filter(it => it.type === "rune" || it.slot === "rune");

  const moveStashToBag = (idx) => {
    const targetList = activeTab === "shared" ? sharedStash : personalStash;
    if (activeTab === "shared" || activeTab === "personal") {
      const [item] = targetList.splice(idx, 1);
      if (item) p.inventory = [...bag, item];
      try { game.chronicle && (game.chronicle.stashWithdrawals = (game.chronicle.stashWithdrawals || 0) + 1); } catch (_) {}
    }
    setTick(v => v + 1);
  };
  const moveBagToStash = (idx) => {
    const item = bag[idx]; if (!item) return;
    p.inventory = bag.filter((_, i) => i !== idx);
    if (activeTab === "shared") game.sharedStash = [...sharedStash, item];
    else p.stash = [...personalStash, item];
    try { game.chronicle && (game.chronicle.itemsStashed = (game.chronicle.itemsStashed || 0) + 1); } catch (_) {}
    setTick(v => v + 1);
  };

  const mobile = layout.mobile;
  return (
    <div onClick={e => { if (e.target === e.currentTarget) { game.showStash = false; onClose?.(); } }}
      style={{
        position: "fixed", inset: 0, zIndex: UI_Z,
        background: "rgba(2,2,8,0.55)", backdropFilter: "blur(3px)",
        fontFamily: FONT, color: theme.text,
        display: "flex", alignItems: mobile ? "flex-start" : "center", justifyContent: "center",
        padding: mobile ? 6 : 24, overflowY: "auto",
      }}>
      <div style={{
        width: "100%", maxWidth: mobile ? "100%" : 1080,
        background: theme.bg, border: theme.border, borderRadius: mobile ? 10 : 14,
        boxShadow: `0 30px 90px rgba(0,0,0,0.65), 0 0 80px ${accent}25`,
        display: "flex", flexDirection: "column",
        maxHeight: mobile ? "calc(100dvh - 12px)" : "min(94vh, 820px)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: mobile ? "10px 14px" : "14px 22px", borderBottom: theme.border, gap: 10 }}>
          <div>
            <div style={{ color: accent, fontWeight: 950, fontSize: 14, letterSpacing: ".12em" }}>STASH</div>
            <div style={{ color: theme.muted, fontSize: 10, fontWeight: 700, letterSpacing: ".10em" }}>
              💰 {(p.gold || 0).toLocaleString()} · {personalStash.length} personal · {sharedStash.length} shared
            </div>
          </div>
          <button onClick={() => { game.showStash = false; onClose?.(); }} title="Close (Esc / S)" style={{
            background: "rgba(255,77,77,0.18)", border: "1px solid #ff4d4d", color: "#ff4d4d",
            padding: "8px 18px", borderRadius: 10, cursor: "pointer",
            fontFamily: FONT, fontSize: 11, fontWeight: 950, letterSpacing: ".10em",
          }}>✕ CLOSE</button>
        </div>

        {/* Tab strip */}
        <div style={{ display: "flex", gap: 4, padding: "10px 18px 0 18px", flexShrink: 0, overflowX: "auto" }}>
          {TABS.map(([id, label]) => {
            const active = activeTab === id;
            return (
              <button key={id} onClick={() => { setActiveTab(id); game.stashTab = id; }} style={{
                padding: "6px 14px", borderRadius: 7,
                background: active ? theme.accentSoft : theme.panel,
                border: active ? `1px solid ${accent}55` : theme.border,
                color: active ? accent : theme.muted,
                fontFamily: FONT, fontSize: 10, fontWeight: 900, letterSpacing: ".10em",
                cursor: "pointer", whiteSpace: "nowrap",
              }}>{label}</button>
            );
          })}
        </div>

        {/* Body: stash left, bag right */}
        <div style={{
          flex: 1, display: "grid",
          gridTemplateColumns: mobile ? "1fr" : "1fr 1fr",
          gap: 10, padding: mobile ? 10 : 18, overflow: "hidden",
        }}>
          <Pane title={`STASH · ${TABS.find(t=>t[0]===activeTab)?.[1]}`} theme={theme}>
            {activeList.length === 0 ? <Empty>Empty.</Empty> : <Grid items={activeList} theme={theme} onClick={moveStashToBag} mobile={mobile} />}
          </Pane>
          <Pane title="BAG · click to deposit" theme={theme}>
            {bag.length === 0 ? <Empty>Bag empty.</Empty> : <Grid items={bag} theme={theme} onClick={moveBagToStash} mobile={mobile} />}
          </Pane>
        </div>

        <div style={{ padding: "8px 18px", borderTop: theme.border, color: theme.muted, fontSize: 9, fontWeight: 700, letterSpacing: ".08em", textAlign: "center" }}>
          ESC · S — close · CLICK to move items between stash and bag
        </div>
      </div>
    </div>
  );

  function Pane({ title, theme, children }) {
    return (
      <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
        <div style={{ color: theme.muted, fontSize: 9, fontWeight: 900, letterSpacing: ".14em", marginBottom: 6 }}>{title}</div>
        <div style={{ flex: 1, overflowY: "auto", padding: 4, background: theme.panel, border: theme.border, borderRadius: 10 }}>
          {children}
        </div>
      </div>
    );
  }
  function Empty({ children }) {
    return <div style={{ color: theme.muted, fontSize: 11, padding: 30, textAlign: "center" }}>{children}</div>;
  }
}

function Grid({ items, theme, onClick, mobile }) {
  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: `repeat(auto-fill, minmax(${mobile ? 52 : 60}px, 1fr))`,
      gap: 5,
    }}>
      {items.map((it, i) => {
        const c = theme.rarity[it.rarity] || theme.text;
        return (
          <button key={i} onClick={() => onClick(i)} title={it.name} style={{
            aspectRatio: "1 / 1",
            background: c + "1e", border: `1px solid ${c}55`,
            borderRadius: 6, cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            gap: 2, padding: 3,
            fontFamily: FONT,
          }}>
            <div style={{ fontSize: 20, color: c }}>{it.icon || "◆"}</div>
            <div style={{ fontSize: 7, color: c, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{it.name}</div>
            {it.qty > 1 && <div style={{ position: "absolute", bottom: 2, right: 3, color: "#fff", fontSize: 8, fontWeight: 900, textShadow: "0 0 4px #000" }}>x{it.qty}</div>}
          </button>
        );
      })}
    </div>
  );
}

function probeLayout() {
  const w = window.innerWidth || 1024;
  const h = window.innerHeight || 768;
  return { mobile: w < 760, w, h };
}
