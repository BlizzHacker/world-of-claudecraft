// ArcForgePalette.jsx — "ArcForge Evolve" in-game asset placement sidebar.
// Shown when `game.adminEditorEnabled === true`. Thumbnail palette with
// category tabs, live search, undo/save/clear, Meshy browser shortcut, and
// per-instance transform controls.
//
// Z-index 195000 — below the pause overlay (200000) but above the canvas +
// chat. Responsive: desktop = right sidebar, mobile = bottom sheet.

import React, { useEffect, useMemo, useState } from "react";
import { CR_ADMIN_PLACEABLES, CR_ADMIN_PLACEABLE_CATEGORIES } from "../engine/CrypticRealmGame.js";

const UI_Z = 195000;
const FONT = "Inter, system-ui, Segoe UI, sans-serif";

// SVG-based glyphs keyed to placeable id/kind. We use emoji as a free, no-load
// thumbnail layer until we wire real GLB previews. For categories we have a
// generic kind→emoji fallback so newly added items still render.
const ICONS = {
  // exact id matches (most specific)
  barrel_large:"🛢", barrel_small:"🛢", barrel_small_stack:"🛢",
  crates_stacked:"📦", box_large:"📦", box_stacked:"📦", trunk_large_A:"🧰",
  keg:"🍺", keg_decorated:"🍺",
  chest:"📦", chest_gold:"💰", coin_stack_large:"💰", key:"🗝",
  table_long:"🪑", table_medium:"🪑", shelf_large:"📚", shelves:"📚", shelf_big:"📚",
  pillar:"🏛", pillar_decorated:"🏛", stairs:"🪜",
  rubble_large:"🪨", rubble_half:"🪨",
  banner_red:"🚩", banner_blue:"🚩", banner_green:"🚩",
  sword_shield:"⚔",
  bottle_A_green:"🧪",
  torch_lit:"🔥", torch_mounted:"🔥",
  candle_lit:"🕯", candle_triple:"🕯",
  blacksmith:"⚒", market:"🏪", tavern:"🍻", church:"⛪", castle:"🏰",
  tower_a:"🗼", tower_b:"🗼", home_a:"🏠", home_b:"🏠", barracks:"🏚",
  archeryrange:"🏹", windmill:"🌬", watermill:"💧", mine:"⛏", lumbermill:"🪓",
  well:"♨", fence_stone:"🧱", bridge_a:"🌉",
  tree_a:"🌳", tree_b:"🌳", tree_pine:"🌲", tree_bare:"🌿",
  bush_1_a:"🌿", bush_2_a:"🌿",
  rock_a:"🪨", rock_b:"🪨", rock_1_a:"🪨",
  chair_a:"🪑", chair_b:"🪑", stool:"🪑", armchair:"🛋",
  bed_single:"🛏", bed_double:"🛏",
  lamp_standing:"💡", rug_oval:"🪅",
};
// kind→default emoji
const KIND_ICONS = {
  d11:"📦", dungeon1:"📦", wall:"🧱", floor:"⬜",
  building:"🏰", forest:"🌳", furniture:"🪑",
  npc:"🧙", character:"🧝", monster:"💀", imported:"✨",
};
function iconFor(it) { return ICONS[it.id] || KIND_ICONS[it.kind] || "◆"; }

export default function ArcForgePalette({ game, onClose, onOpenMeshyBrowser }) {
  const [tick, setTick] = useState(0);
  const [layout, setLayout] = useState(() => probeLayout());
  const [collapsed, setCollapsed] = useState(false);
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const r = () => setLayout(probeLayout());
    const onKey = (e) => {
      // ESC closes the palette. B toggles editor (handled by game).
      if (e.key === "Escape" && !game?.paused) {
        // If we have a placed-asset selection active, ESC just clears it
        // — see the Transform popup. Otherwise it closes the palette.
        if (game?._adminSelectedInstance) {
          game._adminSelectedInstance = null;
          setTick(v => v + 1);
        } else {
          e.preventDefault();
          onClose?.();
        }
      }
    };
    window.addEventListener("resize", r);
    window.addEventListener("orientationchange", r);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("resize", r);
      window.removeEventListener("orientationchange", r);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 250);
    return () => clearInterval(t);
  }, []);

  const accent = "#44ff88";
  const theme = {
    accent, accentSoft: accent + "26", accentDim: accent + "55",
    bg: "linear-gradient(180deg, rgba(8,18,12,0.96), rgba(4,10,7,0.985))",
    panel: "rgba(8,15,10,0.7)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderHi: `1px solid ${accent}66`,
    text: "#e8f7ec", muted: "#8aa595", dim: "#4a5a50",
  };

  // Live placeable list: base catalog + imported.
  const items = useMemo(() => {
    const imported = Array.isArray(game?._importedAdminPlaceables) ? game._importedAdminPlaceables : [];
    return [...CR_ADMIN_PLACEABLES, ...imported];
  }, [game, tick]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(it => {
      if (category !== "all" && it.category !== category) return false;
      if (!q) return true;
      return (it.label || "").toLowerCase().includes(q)
          || (it.id || "").toLowerCase().includes(q)
          || (it.tag || "").toLowerCase().includes(q)
          || (it.kind || "").toLowerCase().includes(q);
    });
  }, [items, category, search]);

  const idx = game?.adminEditorPaletteIndex ?? 0;
  // We track selection by id (more stable than index when filtered list changes).
  const currentBaseIdx = idx % items.length;
  const current = items[currentBaseIdx] || items[0];
  const placedCount = (game?._adminCurrentPlaced?.() || []).length;

  const handleSelect = (filteredItem) => {
    if (!game) return;
    const absIdx = items.findIndex(i => i.id === filteredItem.id);
    if (absIdx >= 0) game.adminEditorPaletteIndex = absIdx;
    setTick(v => v + 1);
  };

  const handlePlace = () => game?._adminPlaceCurrentAtPlayer?.();
  const handleErase = () => game?._adminEraseNearestPlaced?.();
  const handleUndo  = () => game?._adminUndoLastPlaced?.();
  const handleClear = () => {
    if (window.confirm("Clear ALL placed assets in this area? Cannot be undone (without server backup).")) {
      game?._adminClearAreaPlaced?.();
      setTick(v => v + 1);
    }
  };
  const handleSaveLayout = async () => {
    // Local save (localStorage) — synchronous.
    game?._adminSaveLayout?.();
    // Server save (vite-plugin-meshy /api/admin/map) — async.
    try {
      const edits = game?.adminMapEdits || {};
      const transforms = game?.adminMapTransforms || {};
      const r = await fetch("/api/admin/map", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ edits, transforms }),
      });
      if (r.ok) game._addFloat?.("Layout synced to server", game.player.wx, game.player.wy - 60, accent, 110);
      else throw new Error(`HTTP ${r.status}`);
    } catch (e) {
      game?._addFloat?.("Local save OK (server sync failed)", game.player.wx, game.player.wy - 60, "#ffaa44", 110);
    }
  };

  const mobile = layout.mobile;
  const visible = game?.adminEditorEnabled;
  if (!visible) return null;

  const rootStyle = mobile ? {
    position: "fixed", left: 6, right: 6, bottom: 6,
    zIndex: UI_Z, fontFamily: FONT, color: theme.text,
    background: theme.bg, border: theme.border, borderRadius: 12,
    boxShadow: "0 -10px 40px rgba(0,0,0,0.6)",
    maxHeight: collapsed ? 56 : "62vh",
    display: "flex", flexDirection: "column", overflow: "hidden",
    transition: "max-height 0.2s",
  } : {
    position: "fixed", right: 12, top: "max(82px, calc(env(safe-area-inset-top) + 82px))",
    bottom: 12, width: collapsed ? 56 : 340,
    zIndex: UI_Z, fontFamily: FONT, color: theme.text,
    background: theme.bg, border: theme.border, borderRadius: 12,
    boxShadow: "0 20px 50px rgba(0,0,0,0.6)",
    display: "flex", flexDirection: "column", overflow: "hidden",
    transition: "width 0.2s",
  };

  if (collapsed) {
    return (
      <div style={rootStyle}>
        <button onClick={() => setCollapsed(false)} style={{
          flex: 1, background: "transparent", border: 0,
          color: theme.accent, fontSize: 18, fontWeight: 950, cursor: "pointer",
        }}>{mobile ? "▲" : "◀"}</button>
      </div>
    );
  }

  return (
    <div style={rootStyle}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 12px", borderBottom: theme.border, gap: 6,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 6,
            background: theme.accent, color: "#04150b",
            display: "grid", placeItems: "center",
            fontWeight: 950, fontSize: 13, flexShrink: 0,
          }}>AF</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: theme.accent, fontWeight: 950, fontSize: 11, letterSpacing: ".16em" }}>
              ARCFORGE EVOLVE
            </div>
            <div style={{ color: theme.muted, fontSize: 9, fontWeight: 700, letterSpacing: ".10em" }}>
              {items.length} ASSETS · {placedCount} placed
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setCollapsed(true)} style={iconBtn(theme)} title="Collapse">
            {mobile ? "▼" : "▶"}
          </button>
          <button onClick={onClose} style={iconBtn(theme, "#ff4d4d")} title="Close editor">
            ✕
          </button>
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: "8px 12px 4px 12px" }}>
        <input
          type="text"
          placeholder="🔍 Search 80+ assets..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", padding: "7px 10px",
            background: theme.panel, border: theme.border, borderRadius: 7,
            color: theme.text, fontSize: 11, fontFamily: FONT, boxSizing: "border-box",
          }}
        />
      </div>

      {/* Category tabs */}
      <div style={{
        display: "flex", gap: 3, padding: "4px 12px 8px 12px",
        overflowX: "auto", flexShrink: 0,
      }}>
        {CR_ADMIN_PLACEABLE_CATEGORIES.map(c => {
          const active = category === c.id;
          return (
            <button key={c.id} onClick={() => setCategory(c.id)} style={{
              padding: "5px 9px", borderRadius: 6,
              border: active ? `1px solid ${c.accent}` : theme.border,
              background: active ? c.accent + "22" : theme.panel,
              color: active ? c.accent : theme.muted,
              fontSize: 9, fontWeight: 900, letterSpacing: ".06em",
              fontFamily: FONT, cursor: "pointer", whiteSpace: "nowrap",
              flexShrink: 0,
            }}>{c.label}</button>
          );
        })}
      </div>

      {/* Currently selected */}
      <div style={{
        margin: "0 12px 8px 12px", padding: "8px 10px",
        background: theme.accentSoft, border: theme.borderHi, borderRadius: 9,
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 6,
          background: current?.color || theme.accent,
          color: "#04150b", display: "grid", placeItems: "center",
          fontSize: 22, flexShrink: 0,
        }}>{iconFor(current || {})}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: theme.text, fontSize: 11, fontWeight: 900,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>{current?.label || "—"}</div>
          <div style={{ color: theme.muted, fontSize: 9, fontWeight: 700, letterSpacing: ".06em" }}>
            {(current?.category || "").toUpperCase()} · SCALE {current?.scale || "—"}
          </div>
        </div>
        <button onClick={handlePlace} style={primaryBtn(theme)} title="Insert at player">
          PLACE
        </button>
      </div>

      {/* Grid */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "0 12px 8px 12px",
        minHeight: 0,
      }}>
        {filtered.length === 0 && (
          <div style={{
            padding: "20px 10px", textAlign: "center",
            color: theme.muted, fontSize: 10,
            background: theme.panel, border: theme.border, borderRadius: 8,
          }}>
            No assets match. Clear search or try another category.
          </div>
        )}
        <div style={{
          display: "grid",
          gridTemplateColumns: mobile ? "repeat(auto-fit, minmax(60px, 1fr))" : "repeat(4, 1fr)",
          gap: 5,
        }}>
          {filtered.map((it, i) => {
            const active = current && it.id === current.id;
            return (
              <button key={it.id + i} onClick={() => handleSelect(it)} title={it.label} style={{
                aspectRatio: "1 / 1",
                background: active ? theme.accentSoft : theme.panel,
                border: active ? theme.borderHi : theme.border,
                borderRadius: 7, cursor: "pointer",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 2, padding: 3, position: "relative",
                transition: "all 0.12s",
              }}>
                <div style={{
                  fontSize: 20, lineHeight: 1, color: it.color || theme.accent,
                  filter: active ? "drop-shadow(0 0 6px " + theme.accent + ")" : "none",
                }}>{iconFor(it)}</div>
                <div style={{
                  fontSize: 7, fontWeight: 800, letterSpacing: ".04em",
                  color: active ? theme.accent : theme.muted,
                  textAlign: "center", overflow: "hidden", textOverflow: "ellipsis",
                  whiteSpace: "nowrap", maxWidth: "100%",
                }}>{it.label}</div>
                {active && (
                  <div style={{
                    position: "absolute", top: 2, right: 2,
                    width: 8, height: 8, borderRadius: 4, background: theme.accent,
                    boxShadow: `0 0 5px ${theme.accent}`,
                  }} />
                )}
                {it.imported && (
                  <div style={{
                    position: "absolute", top: 2, left: 2,
                    fontSize: 8, color: "#9d6bff",
                  }}>✨</div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Action row */}
      <div style={{
        padding: "8px 12px", borderTop: theme.border,
        display: "flex", flexWrap: "wrap", gap: 5,
      }}>
        <button onClick={handleUndo} style={secondaryBtn(theme)} title="Undo most recent placement">
          ⟲ UNDO
        </button>
        <button onClick={handleErase} style={secondaryBtn(theme)} title="Erase nearest (Delete key)">
          ✕ ERASE
        </button>
        <button onClick={handleSaveLayout} style={secondaryBtn(theme)} title="Save layout to server">
          💾 SAVE
        </button>
        <button onClick={handleClear} style={secondaryBtn(theme, "#ff4d4d")} title="Clear all in this area">
          ⌫ CLEAR
        </button>
      </div>

      <div style={{
        padding: "6px 12px", borderTop: theme.border,
        display: "flex", gap: 5,
      }}>
        <button onClick={onOpenMeshyBrowser} style={primaryBtn(theme, { full: true })}>
          🌐 ASSET LIBRARY
        </button>
      </div>

      <div style={{
        padding: "6px 12px 8px 12px", borderTop: theme.border,
        color: theme.muted, fontSize: 8, fontFamily: FONT, fontWeight: 700, letterSpacing: ".06em",
        textAlign: "center",
      }}>
        HOTKEYS · 1-9 · [ ] · INS place · DEL erase · B toggle · RIGHT-CLICK edit
      </div>
    </div>
  );
}

function probeLayout() {
  const w = window.innerWidth || 1024;
  const h = window.innerHeight || 768;
  return { mobile: w < 760, w, h };
}

const iconBtn = (theme, color) => ({
  background: theme.panel, border: theme.border,
  color: color || theme.text, width: 26, height: 26, borderRadius: 5,
  cursor: "pointer", fontFamily: FONT, fontSize: 11, fontWeight: 900,
});

const primaryBtn = (theme, opts = {}) => ({
  background: theme.accent, color: "#04150b",
  border: `1px solid ${theme.accent}`, padding: "7px 12px",
  borderRadius: 6, cursor: "pointer",
  fontFamily: FONT, fontSize: 10, fontWeight: 950, letterSpacing: ".06em",
  flex: opts.full ? 1 : "0 0 auto",
});

const secondaryBtn = (theme, color) => ({
  background: theme.panel, border: theme.border,
  color: color || theme.text,
  padding: "6px 8px", borderRadius: 6, cursor: "pointer",
  fontFamily: FONT, fontSize: 9, fontWeight: 800, letterSpacing: ".04em",
  flex: 1,
});
