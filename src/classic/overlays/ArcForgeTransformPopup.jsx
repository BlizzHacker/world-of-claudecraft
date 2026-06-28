// ArcForgeTransformPopup.jsx — Floating "nose pinch" editor that anchors
// to the currently-selected placed asset (game._adminSelectedInstance).
//
// Mario-64-style feel: select an asset (right-click in admin editor mode),
// then move / rotate / raise-lower / scale / delete it with buttons OR
// keyboard. Changes persist to localStorage + /api/admin/transform.
//
// Hotkeys handled by CrypticRealmGame._onKeyDown:
//   Arrow keys    → move (Shift = larger step)
//   Q / E         → rotate
//   R / F         → raise / lower
//   + / -         → scale up / down
//   Delete / Bksp → remove
//   Esc           → deselect

import React, { useEffect, useState } from "react";

const UI_Z = 198000; // below pause overlay (200000), above palette (195000)
const FONT = "Inter, system-ui, Segoe UI, sans-serif";
const accent = "#44ff88";

const theme = {
  accent, accentSoft: accent + "26", borderHi: `1px solid ${accent}66`,
  bg: "linear-gradient(180deg, rgba(8,18,12,0.97), rgba(4,10,7,0.99))",
  panel: "rgba(8,15,10,0.85)",
  border: "1px solid rgba(255,255,255,0.18)",
  text: "#e8f7ec", muted: "#8aa595", dim: "#4a5a50",
  warn: "#ff9a34", danger: "#ff4d4d",
};

export default function ArcForgeTransformPopup({ game }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(v => (v + 1) % 1_000_000), 80);
    return () => clearInterval(t);
  }, []);

  const sel = game?._adminSelectedInstance;
  if (!sel || !game?.adminEditorEnabled) return null;

  const list = game._adminPlacedForCurrentArea() || [];
  const placed = list.find(o => o.instanceId === sel.instanceId);
  if (!placed) return null;

  const def = game._adminPlaceableDef(placed.id);
  const transform = game._adminGetTransform(sel.areaKey, sel.instanceId);
  const screen = game._adminSelectionScreenPos();

  const apply = (partial) => game._adminSetTransform(sel.areaKey, sel.instanceId, partial);
  const close = () => { game._adminSelectedInstance = null; setTick(v => v + 1); };

  // Anchor the popup near the asset but clamp to viewport. Width ~280px.
  const POP_W = 300, POP_H = 380;
  const cw = window.innerWidth, chH = window.innerHeight;
  let px = screen ? screen.x : cw / 2;
  let py = screen ? screen.y - POP_H - 30 : chH / 2;
  px = Math.max(8, Math.min(cw - POP_W - 8, px - POP_W / 2));
  py = Math.max(80, Math.min(chH - POP_H - 8, py));

  const rotationDeg = ((transform.rotation || 0) * 180 / Math.PI).toFixed(0);

  return (
    <div style={{
      position: "fixed", left: px, top: py, width: POP_W,
      zIndex: UI_Z, fontFamily: FONT, color: theme.text,
      background: theme.bg, border: theme.border, borderRadius: 12,
      boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "9px 12px", borderBottom: theme.border, gap: 6,
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: accent, fontSize: 10, fontWeight: 950, letterSpacing: ".14em" }}>
            EDIT PLACED ASSET
          </div>
          <div style={{
            color: theme.text, fontSize: 12, fontWeight: 800,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {def?.label || "—"} · <span style={{ color: theme.muted, fontSize: 10 }}>{def?.kind?.toUpperCase()}</span>
          </div>
        </div>
        <button onClick={close} title="Close (Esc)" style={iconBtn(theme.danger)}>✕</button>
      </div>

      {/* MOVE pad */}
      <Section title="MOVE">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "1fr 1fr 1fr", gap: 4, width: 132, margin: "0 auto" }}>
          <div />
          <button onClick={() => apply({ dy: transform.dy - game.TS * 0.25 })} style={dpadBtn}>▲</button>
          <div />
          <button onClick={() => apply({ dx: transform.dx - game.TS * 0.25 })} style={dpadBtn}>◀</button>
          <button onClick={() => apply({ dx: 0, dy: 0 })} title="Center" style={{ ...dpadBtn, fontSize: 10 }}>◉</button>
          <button onClick={() => apply({ dx: transform.dx + game.TS * 0.25 })} style={dpadBtn}>▶</button>
          <div />
          <button onClick={() => apply({ dy: transform.dy + game.TS * 0.25 })} style={dpadBtn}>▼</button>
          <div />
        </div>
        <ValueRow>
          dx <code>{transform.dx.toFixed(0)}</code> · dy <code>{transform.dy.toFixed(0)}</code>
        </ValueRow>
      </Section>

      {/* ROTATE */}
      <Section title="ROTATE">
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button onClick={() => apply({ rotation: transform.rotation - Math.PI / 12 })} style={ctlBtn} title="Q · −15°">⟲</button>
          <button onClick={() => apply({ rotation: transform.rotation - Math.PI / 2 })} style={ctlBtn} title="−90°">↺ 90</button>
          <button onClick={() => apply({ rotation: 0 })} style={{ ...ctlBtn, color: theme.muted }} title="Reset">⊙</button>
          <button onClick={() => apply({ rotation: transform.rotation + Math.PI / 2 })} style={ctlBtn} title="+90°">90 ↻</button>
          <button onClick={() => apply({ rotation: transform.rotation + Math.PI / 12 })} style={ctlBtn} title="E · +15°">⟳</button>
        </div>
        <ValueRow><code>{rotationDeg}°</code></ValueRow>
      </Section>

      {/* RAISE / LOWER + SCALE row */}
      <Section title="HEIGHT (R / F)">
        <RangeRow
          left={() => apply({ yLift: transform.yLift - 4 })}
          right={() => apply({ yLift: transform.yLift + 4 })}
          reset={() => apply({ yLift: 0 })}
          label={`${transform.yLift > 0 ? "+" : ""}${transform.yLift.toFixed(0)} px`}
          leftIcon="▲ raise"
          rightIcon="▼ lower"
        />
      </Section>

      <Section title="SCALE (+ / −)">
        <RangeRow
          left={() => apply({ scaleMul: transform.scaleMul / 1.1 })}
          right={() => apply({ scaleMul: transform.scaleMul * 1.1 })}
          reset={() => apply({ scaleMul: 1 })}
          label={`× ${transform.scaleMul.toFixed(2)}`}
          leftIcon="− smaller"
          rightIcon="+ larger"
        />
      </Section>

      {/* Actions */}
      <div style={{
        display: "flex", gap: 6, padding: "8px 12px", borderTop: theme.border,
      }}>
        <button onClick={() => game._adminDeletePlaced(sel.areaKey, sel.instanceId)} style={{
          flex: 1, padding: "8px 10px",
          background: theme.danger + "22", border: `1px solid ${theme.danger}`,
          color: theme.danger, borderRadius: 7, cursor: "pointer",
          fontFamily: FONT, fontSize: 10, fontWeight: 900, letterSpacing: ".08em",
        }}>✕ DELETE</button>
        <button onClick={close} style={{
          flex: 1, padding: "8px 10px",
          background: accent + "22", border: `1px solid ${accent}`,
          color: accent, borderRadius: 7, cursor: "pointer",
          fontFamily: FONT, fontSize: 10, fontWeight: 900, letterSpacing: ".08em",
        }}>✓ DONE</button>
      </div>

      <div style={{
        padding: "5px 12px 8px 12px",
        color: theme.muted, fontSize: 8, fontFamily: FONT, fontWeight: 700, letterSpacing: ".05em",
        textAlign: "center",
      }}>
        Arrow keys move · Q/E rotate · R/F raise · +/- scale · Del remove
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ padding: "8px 12px", borderTop: theme.border }}>
      <div style={{ color: theme.muted, fontSize: 8, fontWeight: 900, letterSpacing: ".14em", marginBottom: 6 }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ValueRow({ children }) {
  return (
    <div style={{ color: theme.muted, fontSize: 9, marginTop: 6, textAlign: "center" }}>
      {children}
    </div>
  );
}

function RangeRow({ left, right, reset, label, leftIcon, rightIcon }) {
  return (
    <>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <button onClick={left} style={ctlBtn}>{leftIcon}</button>
        <button onClick={reset} style={{ ...ctlBtn, color: theme.muted }}>⊙</button>
        <button onClick={right} style={ctlBtn}>{rightIcon}</button>
      </div>
      <ValueRow><code>{label}</code></ValueRow>
    </>
  );
}

const ctlBtn = {
  flex: 1, padding: "6px 8px",
  background: theme.panel, border: theme.border,
  color: theme.text,
  borderRadius: 6, cursor: "pointer",
  fontFamily: FONT, fontSize: 9, fontWeight: 800, letterSpacing: ".04em",
};

const dpadBtn = {
  background: theme.panel, border: theme.border,
  color: theme.accent,
  borderRadius: 6, cursor: "pointer",
  fontFamily: FONT, fontSize: 14, fontWeight: 900,
  display: "grid", placeItems: "center",
  aspectRatio: "1 / 1", padding: 0,
};

const iconBtn = (color) => ({
  background: "transparent", border: 0,
  color, padding: 4, cursor: "pointer",
  fontFamily: FONT, fontSize: 12, fontWeight: 900,
});
