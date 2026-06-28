// CrypticPauseOverlay.jsx — Polished React pause/dashboard for Cryptic Realm.
// Replaces the raw-canvas `_drawPauseDashboard()` (lines 10662-11109 in
// CrypticRealmGame.js). The canvas implementation still exists as a fallback
// (toggle via `game.usePauseReactOverlay = false`) but this overlay renders on
// top of the canvas at zIndex 200000 and suppresses the canvas pause when
// `game.usePauseReactOverlay` is true.
//
// Visual language matches UnifiedGameNav.jsx — dark panel, accent-colored
// chip-tabs keyed to the player class color, role badge in top-right.
// Responsive: desktop = side-tabs + content panel, mobile = horizontal scroll
// tab strip + full-width content.

import React, { useEffect, useMemo, useState } from "react";
import { CR_CLASSES } from "../engine/CrypticRealmGame.js";

const UI_Z = 200000;       // sits above UnifiedGameNav (120000) + canvas
const FONT = "Inter, system-ui, Segoe UI, sans-serif";

// Theme palette — keyed to the class color so each character feels different.
function themeFor(cls) {
  const accent = cls?.color || "#b44cff";
  return {
    accent,
    accentSoft: accent + "33",
    accentDim:  accent + "55",
    bg:         "linear-gradient(180deg, rgba(15,10,18,0.97), rgba(8,6,14,0.985))",
    panel:      "rgba(12,10,18,0.85)",
    panelHi:    "rgba(255,255,255,0.05)",
    border:     "1px solid rgba(255,255,255,0.10)",
    borderHi:   `1px solid ${accent}55`,
    text:       "#f0e9d8",
    muted:      "#9a8f7a",
    dim:        "#5a5044",
    ok:         "#44ff88",
    warn:       "#ff9a34",
    danger:     "#ff4d4d",
  };
}

const TABS = [
  { id: "save",      label: "SAVE",      icon: "S" },
  { id: "game",      label: "GAME",      icon: "G" },
  { id: "online",    label: "ONLINE",    icon: "N" },
  { id: "video",     label: "VIDEO",     icon: "V" },
  { id: "audio",     label: "AUDIO",     icon: "A" },
  { id: "controls",  label: "CONTROLS",  icon: "C" },
  { id: "chronicle", label: "CHRONICLE", icon: "M" },
];

const QUALITY_CYCLE = ["low", "medium", "high", "ultra"];
const QUALITY_LABELS = { low: "16-BIT", medium: "32-BIT", high: "64-BIT", ultra: "128-BIT" };

// Lightweight reusable building blocks.
function PrimaryBtn({ children, onClick, theme, color, disabled, full }) {
  const c = color || theme.accent;
  return (
    <button onClick={onClick} disabled={disabled} style={{
      background: `${c}1e`, border: `1px solid ${c}99`, color: c,
      padding: "9px 16px", borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer",
      fontFamily: FONT, fontSize: 11, fontWeight: 900, letterSpacing: ".06em",
      width: full ? "100%" : "auto", opacity: disabled ? 0.5 : 1,
      transition: "background 0.12s, border-color 0.12s",
    }}>{children}</button>
  );
}

function SecondaryBtn({ children, onClick, theme, full }) {
  return (
    <button onClick={onClick} style={{
      background: theme.panel, border: theme.border, color: theme.text,
      padding: "8px 14px", borderRadius: 8, cursor: "pointer",
      fontFamily: FONT, fontSize: 10, fontWeight: 700, letterSpacing: ".04em",
      width: full ? "100%" : "auto",
    }}>{children}</button>
  );
}

function Toggle({ checked, onClick, theme, label }) {
  return (
    <button onClick={onClick} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
      background: checked ? theme.accentSoft : theme.panel,
      border: checked ? theme.borderHi : theme.border,
      borderRadius: 9, cursor: "pointer", color: checked ? theme.accent : theme.text,
      fontFamily: FONT, fontSize: 11, fontWeight: 800, width: "100%",
      transition: "all 0.12s",
    }}>
      <span style={{
        width: 30, height: 16, borderRadius: 8,
        background: checked ? theme.accent : "rgba(255,255,255,0.12)",
        position: "relative", flexShrink: 0, transition: "background 0.12s",
      }}>
        <span style={{
          position: "absolute", top: 2, left: checked ? 16 : 2,
          width: 12, height: 12, borderRadius: 6,
          background: checked ? "#fff" : "#888", transition: "left 0.12s",
        }} />
      </span>
      {label}
    </button>
  );
}

function Slider({ value, min = 0, max = 100, step = 5, onDelta, theme, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
      <div style={{ flex: "0 0 70px", color: theme.muted, fontFamily: FONT, fontSize: 10, fontWeight: 700 }}>
        {label}
      </div>
      <button onClick={() => onDelta(-step)} style={chipBtn(theme)}>-</button>
      <div style={{
        flex: 1, height: 8, borderRadius: 4, background: theme.panel,
        border: theme.border, position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", top: 0, left: 0, bottom: 0,
          width: `${Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))}%`,
          background: `linear-gradient(90deg, ${theme.accent}55, ${theme.accent})`,
          transition: "width 0.12s",
        }} />
      </div>
      <button onClick={() => onDelta(step)} style={chipBtn(theme)}>+</button>
      <div style={{ flex: "0 0 38px", textAlign: "right", color: theme.text, fontFamily: FONT, fontSize: 11, fontWeight: 800 }}>
        {Math.round(value)}
      </div>
    </div>
  );
}

const chipBtn = (theme) => ({
  background: theme.panel, border: theme.border, color: theme.text,
  width: 26, height: 26, borderRadius: 6, cursor: "pointer",
  fontFamily: FONT, fontSize: 12, fontWeight: 900,
});

function StatTile({ label, value, theme, color }) {
  return (
    <div style={{
      flex: 1, minWidth: 110, padding: "10px 12px",
      background: theme.panel, border: theme.border, borderRadius: 9,
    }}>
      <div style={{ color: theme.muted, fontSize: 9, fontFamily: FONT, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ color: color || theme.text, fontSize: 16, fontFamily: FONT, fontWeight: 900 }}>
        {value}
      </div>
    </div>
  );
}

// Main overlay component.
export default function CrypticPauseOverlay({ game, onClose, isSuperAdmin, openAdminQueue, openChronicle, openMeshyBrowser }) {
  // We tick a counter to force re-renders on game state changes (paused state,
  // quality, etc. live on the game instance and React doesn't observe them).
  const [tick, setTick] = useState(0);
  const [tab, setTab] = useState(game?.pauseTab || "save");
  const [layout, setLayout] = useState(() => probeLayout());
  const [saveStatus, setSaveStatus] = useState(null);

  useEffect(() => {
    const r = () => setLayout(probeLayout());
    const onKey = (e) => {
      // ESC closes the pause dashboard from any tab. We stop propagation so
      // the underlying game doesn't also try to handle it.
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        if (game) game.paused = false;
        onClose?.();
      }
    };
    window.addEventListener("resize", r);
    window.addEventListener("orientationchange", r);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("resize", r);
      window.removeEventListener("orientationchange", r);
      window.removeEventListener("keydown", onKey, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game]);

  // Sync the canvas pauseTab in case any canvas-side code reads it.
  useEffect(() => { if (game) game.pauseTab = tab; }, [game, tab]);

  // Force a re-render every 200ms while paused so live values (HP/MP, online
  // game list, etc.) stay fresh. Cheap and bounded — pause is transient.
  useEffect(() => {
    const t = setInterval(() => setTick(v => v + 1), 200);
    return () => clearInterval(t);
  }, []);

  const theme = useMemo(() => themeFor(game?.cls), [game?.cls?.color]);
  const compact = layout.compact;
  const mobile  = layout.mobile;

  if (!game || !game.cls || !game.player) return null;

  const cls = game.cls;
  const player = game.player;
  const tabs = isSuperAdmin ? [...TABS, { id: "admin", label: "ARCFORGE", icon: "F" }] : TABS;

  const handleResume = () => { game.paused = false; onClose?.(); };
  const handleSaveNow = () => {
    try {
      game.saveToStorage?.();
      setSaveStatus({ kind: "ok", msg: "Saved to local browser slot." });
      setTimeout(() => setSaveStatus(null), 2400);
    } catch (e) {
      setSaveStatus({ kind: "err", msg: e?.message || "Save failed." });
    }
  };

  const setQuality = (q) => {
    game.quality = q;
    if (typeof game.setQuality === "function") game.setQuality(q);
    setTick(v => v + 1);
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: UI_Z,
      background: "rgba(2,2,8,0.85)", backdropFilter: "blur(6px)",
      fontFamily: FONT, color: theme.text,
      display: "flex", alignItems: "stretch", justifyContent: "center",
      padding: mobile ? "6px" : compact ? "16px" : "32px",
      overflowY: "auto", touchAction: "manipulation",
    }}>
      <div style={{
        width: "100%", maxWidth: mobile ? "100%" : 1180,
        background: theme.bg, border: theme.border, borderRadius: mobile ? 10 : 14,
        boxShadow: `0 30px 90px rgba(0,0,0,0.65), 0 0 80px ${theme.accent}25`,
        display: "flex", flexDirection: mobile ? "column" : "row",
        overflow: "hidden", minHeight: 0,
      }}>

        {/* Sidebar (desktop) / horizontal tab strip (mobile) */}
        <div style={{
          flex: mobile ? "0 0 auto" : `0 0 ${compact ? 180 : 220}px`,
          background: "rgba(5,3,10,0.55)",
          borderRight: mobile ? "none" : theme.border,
          borderBottom: mobile ? theme.border : "none",
          display: "flex", flexDirection: mobile ? "row" : "column",
          padding: mobile ? "6px" : "16px 12px",
          gap: mobile ? 4 : 4,
          overflowX: mobile ? "auto" : "hidden",
          flexWrap: "nowrap",
        }}>
          {/* Brand block (desktop only) */}
          {!mobile && (
            <div style={{
              padding: "8px 10px 14px 10px", borderBottom: theme.border, marginBottom: 8,
            }}>
              <div style={{ color: theme.accent, fontWeight: 950, fontSize: 14, letterSpacing: ".18em" }}>
                CRYPTIC REALM
              </div>
              <div style={{ color: theme.muted, fontSize: 10, fontWeight: 700, letterSpacing: ".18em", marginTop: 2 }}>
                DASHBOARD
              </div>
            </div>
          )}

          {tabs.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                display: "flex", alignItems: "center", gap: mobile ? 0 : 10,
                padding: mobile ? "8px 14px" : "10px 12px",
                background: active ? theme.accentSoft : "transparent",
                border: 0, borderLeft: !mobile && active ? `3px solid ${theme.accent}` : "3px solid transparent",
                borderBottom: mobile && active ? `2px solid ${theme.accent}` : "2px solid transparent",
                color: active ? theme.accent : theme.text,
                cursor: "pointer", textAlign: "left",
                fontFamily: FONT, fontSize: mobile ? 10 : 11, fontWeight: 900, letterSpacing: ".10em",
                borderRadius: mobile ? 0 : 6,
                whiteSpace: "nowrap", flexShrink: 0,
                transition: "background 0.12s",
              }}>
                {!mobile && <span style={{
                  width: 22, height: 22, borderRadius: 5, background: theme.panel,
                  display: "grid", placeItems: "center",
                  color: active ? theme.accent : theme.muted, fontSize: 11, fontWeight: 950,
                }}>{t.icon}</span>}
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Main content area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>

          {/* Header row */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: mobile ? "10px 12px" : "16px 22px",
            borderBottom: theme.border, gap: 12,
          }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                color: cls.color, fontSize: mobile ? 14 : 18, fontWeight: 950,
                letterSpacing: ".06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
              }}>
                {cls.name} · LV {player.level}
              </div>
              <div style={{ color: theme.muted, fontSize: mobile ? 9 : 10, fontWeight: 700, letterSpacing: ".12em", marginTop: 2 }}>
                {game.difficulty?.toUpperCase()} · {(game.act?.name || "TOWN").toUpperCase()} · {QUALITY_LABELS[game.quality] || game.quality}
              </div>
            </div>
            <button onClick={handleResume} style={{
              background: `${theme.ok}1e`, border: `1px solid ${theme.ok}99`, color: theme.ok,
              padding: mobile ? "8px 14px" : "10px 22px", borderRadius: 10, cursor: "pointer",
              fontFamily: FONT, fontSize: mobile ? 11 : 12, fontWeight: 950, letterSpacing: ".10em",
              whiteSpace: "nowrap", flexShrink: 0,
            }}>
              ▶ RESUME
            </button>
          </div>

          {/* Tab content */}
          <div style={{
            flex: 1, padding: mobile ? "12px" : "20px 22px",
            overflowY: "auto", minHeight: 0,
          }}>
            {tab === "save"      && <SaveTab game={game} theme={theme} mobile={mobile} status={saveStatus} onSave={handleSaveNow} onResume={handleResume} />}
            {tab === "game"      && <GameTab game={game} theme={theme} mobile={mobile} onResume={handleResume} setTick={setTick} />}
            {tab === "online"    && <OnlineTab game={game} theme={theme} mobile={mobile} setTick={setTick} />}
            {tab === "video"     && <VideoTab game={game} theme={theme} mobile={mobile} setTick={setTick} setQuality={setQuality} />}
            {tab === "audio"     && <AudioTab game={game} theme={theme} mobile={mobile} setTick={setTick} />}
            {tab === "controls"  && <ControlsTab game={game} theme={theme} mobile={mobile} />}
            {tab === "chronicle" && <ChronicleTab game={game} theme={theme} mobile={mobile} onOpen={openChronicle} />}
            {tab === "admin" && isSuperAdmin && (
              <AdminTab game={game} theme={theme} mobile={mobile} onResume={handleResume}
                openAdminQueue={openAdminQueue} openMeshyBrowser={openMeshyBrowser} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function probeLayout() {
  const w = window.innerWidth || 1024;
  const h = window.innerHeight || 768;
  const mobile  = w < 760 || h < 480;
  const compact = !mobile && (w < 1100 || h < 720);
  return { mobile, compact, w, h };
}

// ── TABS ────────────────────────────────────────────────────────────────────

function SaveTab({ game, theme, mobile, status, onSave, onResume }) {
  const player = game.player;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionTitle theme={theme} accent={theme.ok}>SAVE GAME</SectionTitle>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <StatTile label="LEVEL" value={player.level} theme={theme} color={game.cls.color} />
        <StatTile label="GOLD" value={(player.gold || 0).toLocaleString()} theme={theme} color="#ffd700" />
        <StatTile label="ACT" value={game.actIdx + 1} theme={theme} />
        <StatTile label="QUALITY" value={QUALITY_LABELS[game.quality] || game.quality} theme={theme} />
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <PrimaryBtn theme={theme} color={theme.ok} onClick={onSave}>SAVE NOW</PrimaryBtn>
        <PrimaryBtn theme={theme} onClick={onResume}>RESUME</PrimaryBtn>
        <SecondaryBtn theme={theme} onClick={() => game._rescueToTown?.()}>RESCUE TO TOWN</SecondaryBtn>
      </div>

      {status && (
        <div style={{
          padding: "10px 12px", borderRadius: 8,
          background: (status.kind === "ok" ? theme.ok : theme.danger) + "22",
          border: `1px solid ${status.kind === "ok" ? theme.ok : theme.danger}`,
          color: status.kind === "ok" ? theme.ok : theme.danger,
          fontFamily: FONT, fontSize: 11, fontWeight: 700,
        }}>
          {status.msg}
        </div>
      )}

      <div style={{ color: theme.muted, fontSize: 10, lineHeight: 1.6, fontFamily: FONT }}>
        Saves write to localStorage as <code style={{ color: theme.text }}>cryptic_realm_save_v1</code>. Cloud sync runs on character switch / explicit save when logged in.
      </div>
    </div>
  );
}

function GameTab({ game, theme, mobile, onResume, setTick }) {
  const player = game.player;
  const setPlayerCount = (delta) => { game._setPlayerCount?.((game.playerCount || 1) + delta); setTick(v => v + 1); };
  const toggle = (k) => () => { game[k] = !game[k]; game.paused = false; setTick(v => v + 1); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionTitle theme={theme}>GAME SETTINGS</SectionTitle>

      <Row label="Local players" theme={theme}>
        <button onClick={() => setPlayerCount(-1)} style={chipBtn(theme)}>-</button>
        <div style={{ color: theme.accent, fontSize: 18, fontWeight: 950, minWidth: 22, textAlign: "center" }}>{game.playerCount || 1}</div>
        <button onClick={() => setPlayerCount(1)} style={chipBtn(theme)}>+</button>
      </Row>

      <SectionTitle theme={theme}>QUICK PANELS</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <PrimaryBtn theme={theme} onClick={toggle("showInventory")}>INVENTORY [I]</PrimaryBtn>
        <PrimaryBtn theme={theme} onClick={toggle("showSkillTree")}>SKILL TREE [K]</PrimaryBtn>
        <PrimaryBtn theme={theme} onClick={toggle("questLog")}>QUEST LOG [J]</PrimaryBtn>
        <SecondaryBtn theme={theme} onClick={() => { game._rescueToTown?.(); onResume(); }}>RESCUE TO TOWN</SecondaryBtn>
      </div>
    </div>
  );
}

function OnlineTab({ game, theme, mobile, setTick }) {
  const list = game.onlineGames || [];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionTitle theme={theme}>ONLINE PLAY</SectionTitle>
      <div style={{ display: "flex", gap: 8 }}>
        <PrimaryBtn theme={theme} onClick={() => { game._requestOnlineGameList?.(); setTick(v => v + 1); }}>REFRESH</PrimaryBtn>
        <PrimaryBtn theme={theme} color={theme.ok} onClick={() => game._createOnlineGame?.()}>CREATE LOBBY</PrimaryBtn>
      </div>
      <div style={{ background: theme.panel, border: theme.border, borderRadius: 9, padding: 10, minHeight: 80 }}>
        {list.length === 0 && <div style={{ color: theme.muted, fontSize: 11, textAlign: "center", padding: "20px 0" }}>No active lobbies — try refresh.</div>}
        {list.map((g, i) => (
          <div key={g.id || i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "6px 8px", borderBottom: i < list.length - 1 ? theme.border : "none",
          }}>
            <div style={{ fontSize: 11, fontWeight: 700 }}>{g.name || g.id}</div>
            <SecondaryBtn theme={theme} onClick={() => game._joinOnlineGame?.(g.id)}>JOIN</SecondaryBtn>
          </div>
        ))}
      </div>
    </div>
  );
}

function VideoTab({ game, theme, mobile, setTick, setQuality }) {
  const gs = game.gameSettings = game.gameSettings || {};
  gs.video = gs.video || {};
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionTitle theme={theme}>QUALITY TIER</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {QUALITY_CYCLE.map(q => (
          <PrimaryBtn key={q} theme={theme}
            color={game.quality === q ? theme.accent : theme.muted}
            onClick={() => setQuality(q)}>
            {QUALITY_LABELS[q]}
          </PrimaryBtn>
        ))}
      </div>

      <SectionTitle theme={theme}>CAMERA</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {["iso","top","third","fps"].map(c => (
          <PrimaryBtn key={c} theme={theme}
            color={game.camera === c ? theme.accent : theme.muted}
            onClick={() => { game.camera = c; game._cameraSnap = true; game._centerCamera?.(); setTick(v => v + 1); }}>
            {c.toUpperCase()}
          </PrimaryBtn>
        ))}
        <SecondaryBtn theme={theme} onClick={() => game._resetCameraRig?.()}>RESET</SecondaryBtn>
      </div>

      <SectionTitle theme={theme}>FX</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 8 }}>
        <Toggle theme={theme} label="Damage numbers" checked={gs.video.damageNumbers !== false}
          onClick={() => { gs.video.damageNumbers = !gs.video.damageNumbers; setTick(v => v + 1); }} />
        <Toggle theme={theme} label="Screen shake" checked={gs.video.screenShake !== false}
          onClick={() => { gs.video.screenShake = !gs.video.screenShake; setTick(v => v + 1); }} />
        <Toggle theme={theme} label="64-bit medium GLB" checked={!!gs.glbMedium}
          onClick={() => { gs.glbMedium = !gs.glbMedium; setTick(v => v + 1); }} />
      </div>
    </div>
  );
}

function AudioTab({ game, theme, mobile, setTick }) {
  const gs = game.gameSettings = game.gameSettings || {};
  gs.sound = gs.sound || { mute:false, master:80, music:70, sfx:80, bard:70 };
  const slide = (k) => (delta) => {
    gs.sound[k] = Math.max(0, Math.min(100, (gs.sound[k] || 0) + delta));
    game._syncAudioLevels?.();
    setTick(v => v + 1);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionTitle theme={theme}>AUDIO</SectionTitle>
      <Toggle theme={theme} label={gs.sound.mute ? "Muted" : "Audio enabled"} checked={!gs.sound.mute}
        onClick={() => { gs.sound.mute = !gs.sound.mute; game._syncAudioLevels?.(); setTick(v => v + 1); }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <Slider theme={theme} label="MASTER" value={gs.sound.master ?? 80} onDelta={slide("master")} />
        <Slider theme={theme} label="MUSIC"  value={gs.sound.music ?? 70}  onDelta={slide("music")} />
        <Slider theme={theme} label="SFX"    value={gs.sound.sfx ?? 80}    onDelta={slide("sfx")} />
        <Slider theme={theme} label="BARD"   value={gs.sound.bard ?? 70}   onDelta={slide("bard")} />
      </div>

      <PrimaryBtn theme={theme} onClick={() => game._handlePauseClick?.(0,0) || game._addFloat?.("Test sound", game.player.wx, game.player.wy - 50, theme.accent, 90)}>
        TEST SOUND
      </PrimaryBtn>
    </div>
  );
}

function ControlsTab({ game, theme, mobile }) {
  const binds = (game.gameSettings?.binds) || {};
  const rows = [
    ["Move",            ["W","A","S","D / Arrows"]],
    ["Attack",          ["Click"]],
    ["Skills",          ["Z","X","C","V","B"]],
    ["Inventory",       ["I"]],
    ["Skill tree",      ["K"]],
    ["Quest log",       ["J"]],
    ["Map",             ["TAB"]],
    ["Town portal",     ["T"]],
    ["Potion HP / MP",  ["H","M"]],
    ["Pause / Dashboard", ["ESC"]],
    ["Build mode",      ["B (super admin)"]],
    ["Camera cycle",    ["F6"]],
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionTitle theme={theme}>CONTROLS</SectionTitle>
      <div style={{ display: "grid", gridTemplateColumns: mobile ? "1fr" : "1fr 1fr", gap: 10 }}>
        {rows.map(([action, keys]) => (
          <div key={action} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "8px 12px", background: theme.panel, border: theme.border, borderRadius: 8,
          }}>
            <div style={{ color: theme.text, fontSize: 11, fontWeight: 700 }}>{action}</div>
            <div style={{ display: "flex", gap: 4 }}>
              {keys.map((k, i) => (
                <span key={i} style={{
                  padding: "2px 8px", background: theme.accentSoft, border: theme.borderHi,
                  borderRadius: 5, color: theme.accent, fontSize: 10, fontWeight: 800,
                }}>{k}</span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ color: theme.muted, fontSize: 10, lineHeight: 1.6 }}>
        Key rebinding lives on the legacy canvas dashboard for now. Tap "Use Legacy Dashboard" on the Save tab to rebind individual keys, or wait for the React rebind UI in a future release.
      </div>
    </div>
  );
}

function ChronicleTab({ game, theme, mobile, onOpen }) {
  const slain = game.monsterChronicle?.kills || {};
  const total = Object.values(slain).reduce((a, b) => a + (b || 0), 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionTitle theme={theme}>CHRONICLE</SectionTitle>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
        <StatTile label="MONSTERS SLAIN" value={total.toLocaleString()} theme={theme} color={theme.accent} />
        <StatTile label="UNIQUE SPECIES" value={Object.keys(slain).length} theme={theme} />
      </div>
      <PrimaryBtn theme={theme} onClick={() => { game.showMonsterChronicle = true; game.paused = false; onOpen?.(); }}>
        OPEN FULL CHRONICLE
      </PrimaryBtn>
    </div>
  );
}

function AdminTab({ game, theme, mobile, onResume, openAdminQueue, openMeshyBrowser }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SectionTitle theme={theme} accent={theme.ok}>ADMIN</SectionTitle>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <PrimaryBtn theme={theme} onClick={() => openMeshyBrowser?.()}>
          ASSET LIBRARY
        </PrimaryBtn>
        <SecondaryBtn theme={theme} onClick={() => { openAdminQueue?.("character"); }}>QUEUE: PLAYER SKIN</SecondaryBtn>
        <SecondaryBtn theme={theme} onClick={() => { openAdminQueue?.("monster"); }}>QUEUE: MONSTER</SecondaryBtn>
        <SecondaryBtn theme={theme} onClick={() => { openAdminQueue?.("item"); }}>QUEUE: ITEM</SecondaryBtn>
      </div>

      <div style={{ color: theme.muted, fontSize: 10, lineHeight: 1.6 }}>
        Use the Asset Library to import 3D models from KayKit (1,400+ assets on disk), any direct GLB URL, or Meshy collections — saves to <code>public/cryptic-assets/meshy-imported/</code> and they become placeable instantly.
      </div>
    </div>
  );
}

function SectionTitle({ children, theme, accent }) {
  const c = accent || theme.accent;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 2px 0" }}>
      <div style={{ width: 4, height: 14, background: c, borderRadius: 2 }} />
      <div style={{ color: c, fontSize: 11, fontWeight: 950, letterSpacing: ".16em", fontFamily: FONT }}>
        {children}
      </div>
      <div style={{ flex: 1, height: 1, background: `linear-gradient(90deg, ${c}55, transparent)` }} />
    </div>
  );
}

function Row({ label, children, theme }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "8px 12px", background: theme.panel, border: theme.border, borderRadius: 8,
    }}>
      <div style={{ color: theme.text, fontSize: 11, fontWeight: 700 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{children}</div>
    </div>
  );
}
