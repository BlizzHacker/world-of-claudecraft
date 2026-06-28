// CrypticInventoryOverlay.jsx — Polished React inventory replacement.
// Replaces the canvas `_drawInventory` (~ line 8174 of CrypticRealmGame.js).
// Wade Alpha 5: "menu ui still is very much ugly for Cryptic Realm".
//
// Renders:
//   - Player vitals + base stats (with +/− buttons for unspent stat points)
//   - Equipment paperdoll (10 slots) — click to unequip
//   - Bag grid — click to equip/use, right-click to drop
//   - Gold + resistances
//
// State on game:
//   game.player.inventory (array)
//   game.player.equipment (object with 10 slots)
//   game.player.statPoints / skillPoints / gold / level
//   game._equipOrUse(item, idx)
//   game._spendStatPoint(stat)
//   game._dropItem(idx)        ← we add this if missing
//
// Close: ESC, B, I, ✕ button, backdrop click.
// Canvas variant suppressed when game.useInventoryReactOverlay === true.

import React, { useEffect, useMemo, useState } from "react";

const UI_Z = 199500;
const FONT = "Inter, system-ui, Segoe UI, sans-serif";

const SLOTS = [
  ["head",    "Helm"],
  ["amulet",  "Amulet"],
  ["weapon",  "Weapon"],
  ["chest",   "Chest"],
  ["shield",  "Shield"],
  ["ring",    "Ring 1"],
  ["belt",    "Belt"],
  ["ring2",   "Ring 2"],
  ["gloves",  "Gloves"],
  ["feet",    "Boots"],
];

const STAT_KEYS = [
  ["str", "STR"],
  ["dex", "DEX"],
  ["vit", "VIT"],
  ["nrg", "NRG"],
];

export default function CrypticInventoryOverlay({ game, onClose }) {
  const [tick, setTick] = useState(0);
  const [layout, setLayout] = useState(() => probeLayout());
  const [hoverItem, setHoverItem] = useState(null);

  useEffect(() => {
    const r = () => setLayout(probeLayout());
    const onKey = (e) => {
      if (e.key === "Escape" || e.key === "b" || e.key === "B" || e.key === "i" || e.key === "I") {
        e.preventDefault();
        if (game) game.showInventory = false;
        onClose?.();
      }
    };
    window.addEventListener("resize", r);
    window.addEventListener("keydown", onKey, true);
    const t = setInterval(() => setTick(v => v + 1), 200);
    return () => {
      window.removeEventListener("resize", r);
      window.removeEventListener("keydown", onKey, true);
      clearInterval(t);
    };
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
    ok: "#44ff88", warn: "#ff9a34", danger: "#ff4d4d",
    rarity: { common: "#cccccc", magic: "#7898ff", rare: "#ffe04a", set: "#3aff5a", unique: "#a37346", crafted: "#ff9a34" },
  };

  const p = game.player;
  const inv = Array.isArray(p.inventory) ? p.inventory : [];
  const equipped = p.equipment || {};
  const mobile = layout.mobile;

  // Action handlers — all delegate to existing game methods so the React
  // overlay doesn't fork the canonical equip/use logic.
  const equipItem = (item, i) => {
    if (typeof game._equipOrUse === "function") {
      game._equipOrUse(item, i);
      setTick(v => v + 1);
    }
  };
  const unequipSlot = (slot) => {
    const item = equipped[slot];
    if (!item) return;
    if (typeof game._unequipSlot === "function") {
      game._unequipSlot(slot);
    } else {
      // Fallback: shove the equipped item into inventory + clear the slot.
      // Mirrors the canvas onClick path.
      p.inventory = [...inv, item];
      p.equipment = { ...equipped, [slot]: null };
      try { game._recalcStats?.(); } catch (_) {}
    }
    setTick(v => v + 1);
  };
  const spendStat = (stat) => {
    if ((p.statPoints || 0) <= 0) return;
    if (typeof game._spendStatPoint === "function") game._spendStatPoint(stat);
    else { p[stat] = (p[stat] || 0) + 1; p.statPoints = (p.statPoints || 0) - 1; }
    setTick(v => v + 1);
  };
  const dropItem = (idx) => {
    if (!window.confirm("Drop this item to the ground?")) return;
    if (typeof game._dropItem === "function") game._dropItem(idx);
    else { p.inventory = inv.filter((_, i) => i !== idx); }
    setTick(v => v + 1);
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) { game.showInventory = false; onClose?.(); } }}
      style={{
        position: "fixed", inset: 0, zIndex: UI_Z,
        background: "rgba(2,2,8,0.55)", backdropFilter: "blur(3px)",
        fontFamily: FONT, color: theme.text,
        display: "flex", alignItems: mobile ? "flex-start" : "center", justifyContent: "center",
        padding: mobile ? 6 : 24, overflowY: "auto",
      }}>
      <div style={{
        width: "100%", maxWidth: mobile ? "100%" : 1020,
        background: theme.bg, border: theme.border, borderRadius: mobile ? 10 : 14,
        boxShadow: `0 30px 90px rgba(0,0,0,0.65), 0 0 80px ${accent}25`,
        display: "flex", flexDirection: "column",
        maxHeight: mobile ? "calc(100dvh - 12px)" : "min(94vh, 820px)",
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
            }}>{game.cls.icon || "★"}</div>
            <div>
              <div style={{ color: accent, fontWeight: 950, fontSize: 14, letterSpacing: ".12em" }}>
                INVENTORY
              </div>
              <div style={{ color: theme.muted, fontSize: 10, fontWeight: 700, letterSpacing: ".10em" }}>
                {game.cls.name?.toUpperCase()} · LV {p.level} · 💰 {(p.gold || 0).toLocaleString()}
              </div>
            </div>
          </div>
          <button onClick={() => { game.showInventory = false; onClose?.(); }}
            title="Close (Esc / I / B)" style={{
              background: "rgba(255,77,77,0.18)", border: "1px solid #ff4d4d", color: "#ff4d4d",
              padding: "8px 18px", borderRadius: 10, cursor: "pointer",
              fontFamily: FONT, fontSize: 11, fontWeight: 950, letterSpacing: ".10em",
            }}>✕ CLOSE</button>
        </div>

        {/* Body */}
        <div style={{
          flex: 1, display: "grid",
          gridTemplateColumns: mobile ? "1fr" : "300px 1fr",
          gap: mobile ? 10 : 16,
          padding: mobile ? 10 : 18,
          overflow: "hidden",
        }}>

          {/* Left: stats + paperdoll */}
          <div style={{
            display: "flex", flexDirection: "column", gap: 10,
            overflowY: "auto", minHeight: 0,
          }}>
            <StatPanel theme={theme} p={p} cls={game.cls} onSpend={spendStat} />
            <Paperdoll theme={theme} equipped={equipped} onUnequip={unequipSlot} setHover={setHoverItem} />
          </div>

          {/* Right: bag */}
          <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: 8, color: theme.muted, fontSize: 10, fontWeight: 900, letterSpacing: ".14em",
            }}>
              <span>BAG · {inv.length} items</span>
              <span>RIGHT-CLICK to drop</span>
            </div>
            <div style={{
              flex: 1, overflowY: "auto",
              display: "grid",
              gridTemplateColumns: `repeat(auto-fill, minmax(${mobile ? 52 : 64}px, 1fr))`,
              gap: 6, padding: 4,
              background: theme.panel, border: theme.border, borderRadius: 10,
              minHeight: 200,
            }}>
              {inv.length === 0 && (
                <div style={{
                  gridColumn: "1 / -1", textAlign: "center",
                  color: theme.muted, fontSize: 11, padding: 40,
                }}>Bag is empty. Kill enemies and break props to find loot.</div>
              )}
              {inv.map((item, i) => (
                <BagSlot key={i} item={item} theme={theme}
                  onClick={() => equipItem(item, i)}
                  onRightClick={() => dropItem(i)}
                  onHover={() => setHoverItem(item)}
                  onLeave={() => setHoverItem(null)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Hover tooltip */}
        {hoverItem && <ItemTooltip item={hoverItem} theme={theme} mobile={mobile} />}

        {/* Footer */}
        <div style={{
          padding: "8px 18px", borderTop: theme.border,
          color: theme.muted, fontSize: 9, fontWeight: 700, letterSpacing: ".08em",
          textAlign: "center", flexShrink: 0,
        }}>
          ESC · I · B — close · CLICK equip/use · RIGHT-CLICK drop
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

function StatPanel({ theme, p, cls, onSpend }) {
  const accent = theme.accent;
  return (
    <div style={{
      padding: 12, background: theme.panel, border: theme.border, borderRadius: 10,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <div style={{ color: accent, fontWeight: 950, fontSize: 11, letterSpacing: ".12em" }}>STATS</div>
        {(p.statPoints || 0) > 0 && (
          <div style={{ color: theme.ok, fontSize: 10, fontWeight: 800 }}>
            +{p.statPoints} unspent
          </div>
        )}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
        <Vital theme={theme} label="HP"   v={p.hp} max={p.maxHp} color="#ff4d4d" />
        <Vital theme={theme} label="MP"   v={p.mp} max={p.maxMp} color="#4d88ff" />
        <Vital theme={theme} label="DMG"  v={p.dmg || 0} color="#ffaa44" />
        <Vital theme={theme} label="DEF"  v={p.def || 0} color="#aabbcc" />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {STAT_KEYS.map(([k, label]) => (
          <div key={k} style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "5px 8px", background: theme.panelHi, borderRadius: 5,
          }}>
            <span style={{ color: theme.muted, fontSize: 10, fontWeight: 800, letterSpacing: ".08em" }}>
              {label}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ color: theme.text, fontSize: 11, fontWeight: 900 }}>
                {p[k] || 0}
              </span>
              {(p.statPoints || 0) > 0 && (
                <button onClick={() => onSpend(k)} style={{
                  width: 20, height: 20, borderRadius: 4,
                  background: theme.ok + "22", border: `1px solid ${theme.ok}`, color: theme.ok,
                  cursor: "pointer", fontFamily: FONT, fontSize: 12, fontWeight: 900,
                  display: "grid", placeItems: "center",
                }}>+</button>
              )}
            </div>
          </div>
        ))}
      </div>
      {/* Resistances row */}
      {p.resist && (
        <div style={{
          marginTop: 8, padding: "6px 8px",
          background: theme.panelHi, borderRadius: 5,
          fontSize: 9, color: theme.muted, letterSpacing: ".06em",
        }}>
          <span style={{ color: "#ff7733" }}>FIRE {p.resist.fire||0}</span>
          {" · "}
          <span style={{ color: "#77aaff" }}>COLD {p.resist.cold||0}</span>
          {" · "}
          <span style={{ color: "#ffee33" }}>LIGHT {p.resist.lightning||0}</span>
          {" · "}
          <span style={{ color: "#88dd44" }}>POIS {p.resist.poison||0}</span>
        </div>
      )}
    </div>
  );
}

function Vital({ theme, label, v, max, color }) {
  return (
    <div style={{
      padding: "5px 8px", background: theme.panelHi, borderRadius: 5,
    }}>
      <div style={{ color: theme.muted, fontSize: 8, fontWeight: 800, letterSpacing: ".10em", marginBottom: 2 }}>
        {label}
      </div>
      <div style={{ color, fontSize: 12, fontWeight: 900 }}>
        {Math.round(v)}{Number.isFinite(max) ? ` / ${Math.round(max)}` : ""}
      </div>
    </div>
  );
}

function Paperdoll({ theme, equipped, onUnequip, setHover }) {
  const accent = theme.accent;
  return (
    <div style={{
      padding: 12, background: theme.panel, border: theme.border, borderRadius: 10,
    }}>
      <div style={{ color: accent, fontWeight: 950, fontSize: 11, letterSpacing: ".12em", marginBottom: 8 }}>
        EQUIPMENT
      </div>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 5,
      }}>
        {SLOTS.map(([slot, label]) => {
          const item = equipped[slot];
          return (
            <button key={slot} onClick={() => item && onUnequip(slot)}
              onMouseEnter={() => setHover(item || null)}
              onMouseLeave={() => setHover(null)}
              title={item ? `${item.name} — click to unequip` : `Empty ${label} slot`}
              style={{
                padding: "6px 8px", textAlign: "left",
                background: item ? (theme.rarity[item.rarity] || theme.text) + "22" : "transparent",
                border: item ? `1px solid ${theme.rarity[item.rarity] || theme.text}88` : theme.border,
                borderRadius: 6, cursor: item ? "pointer" : "default",
                fontFamily: FONT,
              }}>
              <div style={{ fontSize: 8, color: theme.muted, fontWeight: 800, letterSpacing: ".10em" }}>
                {label}
              </div>
              <div style={{
                fontSize: 10, fontWeight: 800, marginTop: 2,
                color: item ? theme.rarity[item.rarity] || theme.text : theme.dim,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {item ? `${item.icon || "◆"} ${item.name}` : "—"}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function BagSlot({ item, theme, onClick, onRightClick, onHover, onLeave }) {
  const rarityColor = theme.rarity[item?.rarity] || theme.text;
  return (
    <button
      onClick={onClick}
      onContextMenu={e => { e.preventDefault(); onRightClick?.(); }}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      title={`${item.name}${item.note ? " — " + item.note : ""}`}
      style={{
        aspectRatio: "1 / 1",
        background: rarityColor + "1e",
        border: `1px solid ${rarityColor}55`,
        borderRadius: 6, cursor: "pointer",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 2, padding: 3, position: "relative", overflow: "hidden",
        fontFamily: FONT,
      }}>
      <div style={{ fontSize: 22, lineHeight: 1, color: rarityColor }}>
        {item.icon || "◆"}
      </div>
      <div style={{
        fontSize: 7, fontWeight: 800, color: rarityColor,
        textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        maxWidth: "100%",
      }}>
        {item.name}
      </div>
      {item.qty > 1 && (
        <div style={{
          position: "absolute", bottom: 1, right: 2,
          color: "#fff", fontSize: 8, fontWeight: 900,
          textShadow: "0 0 4px #000",
        }}>x{item.qty}</div>
      )}
    </button>
  );
}

function ItemTooltip({ item, theme, mobile }) {
  if (!item) return null;
  const rarityColor = theme.rarity[item.rarity] || theme.text;
  return (
    <div style={{
      position: "fixed",
      bottom: mobile ? 10 : 28, right: mobile ? 10 : 28,
      padding: "10px 14px",
      background: "rgba(8,6,14,0.95)", border: `1px solid ${rarityColor}`,
      borderRadius: 10,
      maxWidth: 280, minWidth: 200,
      color: theme.text, fontFamily: FONT, fontSize: 11,
      pointerEvents: "none",
      boxShadow: `0 8px 30px rgba(0,0,0,0.6), 0 0 16px ${rarityColor}30`,
      zIndex: UI_Z + 10,
    }}>
      <div style={{ color: rarityColor, fontWeight: 950, marginBottom: 4 }}>
        {item.icon || "◆"} {item.name}
      </div>
      <div style={{ color: theme.muted, fontSize: 9, letterSpacing: ".08em", marginBottom: 6 }}>
        {String(item.rarity || "common").toUpperCase()} · {String(item.slot || item.type || "item").toUpperCase()}
      </div>
      {item.dmgAdd ? <div>+{item.dmgAdd} damage</div> : null}
      {item.defAdd ? <div>+{item.defAdd} defense</div> : null}
      {item.hpAdd ?  <div>+{item.hpAdd} HP</div> : null}
      {item.mpAdd ?  <div>+{item.mpAdd} MP</div> : null}
      {item.resist && Object.entries(item.resist).map(([k, v]) => v ? <div key={k} style={{ color: "#88dd66" }}>+{v} {k} resist</div> : null)}
      {item.note && <div style={{ marginTop: 4, color: theme.muted }}>{item.note}</div>}
    </div>
  );
}
