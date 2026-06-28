// ArcForgeInGameQueue.jsx — in-game asset regeneration overlay for super admin.
// Lets you flag monsters/items/characters from the chronicle, queue ArcForge jobs
// (clear bg → 3D → rigged → animated GLB), and hot-swap finished assets.

import React, { useState, useEffect, useCallback } from "react";
import { MpqPacker } from "../engine/MpqPacker.js";
import { D2_DEFAULT_PALETTE } from "../engine/crypticD2Formats.js";
import { OverlayHeader, useEscToClose } from "./OverlayControls.jsx";

const FONT = "Inter, system-ui, Segoe UI, sans-serif";
const GLASS = "linear-gradient(180deg, rgba(17,22,34,.985), rgba(8,12,22,.985))";
const BORDER = "1px solid rgba(255,255,255,.12)";
const DIVIDER = "1px solid rgba(255,255,255,.08)";
const CARD_BG = "rgba(0,0,0,.24)";
const CARD_BORDER = "1px solid rgba(255,255,255,.06)";

const QUEUE_STORAGE_KEY = "arcforge_ingame_queue_v1";
const AF_API = "/arcforge-api";

// Pipeline stages for asset regeneration
const PIPELINE = [
  { id:"clear_bg", label:"Clear Background", icon:"✂", desc:"Remove white bg → transparent PNG" },
  { id:"3d_asset", label:"3D Asset", icon:"🧊", desc:"Generate 3D model from reference" },
  { id:"3d_print_glb", label:"Print + GLB", icon:"STL", desc:"Generate STL-ready mesh plus game GLB" },
  { id:"rigged", label:"Rigged", icon:"🦴", desc:"Add skeleton/bones for animation" },
  { id:"animated_glb", label:"Animated GLB", icon:"🎬", desc:"Export animated GLB with clips" },
];

const QUEUE_STATUS = {
  queued:    { label:"Queued",    color:"#8888cc", icon:"●" },
  running:   { label:"Running",   color:"#ccaa44", icon:"▶" },
  done:      { label:"Done",      color:"#44cc44", icon:"✓" },
  failed:    { label:"Failed",    color:"#cc4444", icon:"✕" },
};

function loadQueue() {
  try { return JSON.parse(localStorage.getItem(QUEUE_STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function saveQueue(queue) {
  localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
}

export function ArcForgeInGameQueue({ onClose, selectedMonster, monsterChronicle, allowCustomAsset = false, gameContext = null }) {
  const [queue, setQueue] = useState(loadQueue);
  const [minimized, setMinimized] = useState(false);

  // Universal ESC-to-close. Wade: "when i click queue I can't escape or
  // minimize that menu from the game".
  useEscToClose(onClose, !minimized);
  const [pipelineStage, setPipelineStage] = useState("animated_glb");
  const [customType, setCustomType] = useState(gameContext?.selected?.type || "monster");
  const [customId, setCustomId] = useState(gameContext?.selected?.id || "");
  const [customLabel, setCustomLabel] = useState(gameContext?.selected?.label || "");
  const [customPrompt, setCustomPrompt] = useState(gameContext?.selected?.prompt || "");
  const [customImage, setCustomImage] = useState(gameContext?.selected?.image || "");
  const [customImageName, setCustomImageName] = useState("");
  const [customNotice, setCustomNotice] = useState("");

  // Sync queue to localStorage
  useEffect(() => { saveQueue(queue); }, [queue]);

  useEffect(() => {
    if (!gameContext?.selected) return;
    setCustomType(gameContext.selected.type || "monster");
    setCustomId(gameContext.selected.id || "");
    setCustomLabel(gameContext.selected.label || "");
    setCustomPrompt(gameContext.selected.prompt || "");
    setCustomImage(gameContext.selected.image || "");
    setCustomNotice(`Loaded game target: ${gameContext.selected.label || gameContext.selected.id}`);
  }, [gameContext]);

  const slug = (value) => String(value || "asset").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80) || "asset";

  // Add selected monster to queue. Now surfaces a confirmation toast so the
  // user can see something happened — Wade: "I sent the Abominable Berserker
  // for animated GLB and got nada".
  const addToQueue = useCallback((monster) => {
    if (!monster) return;
    const existing = queue.find(q => q.assetId === monster.id && q.status !== "done");
    if (existing) {
      setQueue(prev => prev.filter(q => q.id !== existing.id));
    }
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      assetId: monster.id,
      assetLabel: monster.label,
      assetType: "monster",
      game: monster.game,
      imageUrl: monster.image,
      pipeline: pipelineStage,
      status: "queued",
      createdAt: Date.now(),
      prompt: generatePrompt(monster, pipelineStage),
    };
    setQueue(prev => [...prev, job]);
    setCustomNotice(`✓ Queued ${monster.label} for ${PIPELINE.find(p=>p.id===pipelineStage)?.label}. Click "SUBMIT ALL" below to send to the ArcForge backend.`);
  }, [queue, pipelineStage]);

  // Send all queued jobs to ArcForge API
  const submitQueue = useCallback(async () => {
    const pending = queue.filter(q => q.status === "queued");
    if (!pending.length) return;
    // Alpha 5.3: route through the Vite plugin pipeline runner instead of
    // the (currently 404'ing) FastAPI /arcforge-api/jobs. /api/pipeline/*
    // is always live since it ships with the main Vite dev server.
    for (const job of pending) {
      try {
        setQueue(prev => prev.map(q => q.id === job.id ? { ...q, status:"running" } : q));
        const resp = await fetch(`/api/pipeline/enqueue`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            assetId: job.assetId,
            sourceImage: job.imageUrl,
            stages: job.pipeline === "animated_glb"
              ? ["png16","tripoSR_32","hunyuan_64","meshy_128"]
              : ["png16","tripoSR_32","hunyuan_64"],
            maxAttempts: 3,
            timeoutMs: 5 * 60 * 1000,
          }),
        });
        if (resp.ok) {
          setQueue(prev => prev.map(q => q.id === job.id ? { ...q, status: "done", note: "queued in pipeline" } : q));
        } else {
          setQueue(prev => prev.map(q => q.id === job.id ? { ...q, status: "failed" } : q));
        }
      } catch {
        setQueue(prev => prev.map(q => q.id === job.id ? { ...q, status: "failed" } : q));
      }
    }
  }, [queue]);

  // Remove job from queue
  const removeJob = useCallback((id) => {
    setQueue(prev => prev.filter(q => q.id !== id));
  }, []);

  const addCustomReplacement = useCallback(() => {
    const label = customLabel.trim() || customId.trim() || "Custom Asset";
    const id = customId.trim() || slug(label);
    const job = {
      id: `admin_replace_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      assetId: id,
      assetLabel: label,
      assetType: customType,
      game: gameContext?.selected?.game || gameContext?.kind || "cryptic_super_admin",
      imageUrl: customImage,
      referenceImageName: customImageName,
      pipeline: pipelineStage,
      status: "queued",
      createdAt: Date.now(),
      replacementMode: "replace_existing_asset",
      outputs: ["preview_png","glb","animated_glb","sprite_sheet","stl_print_quality","patch_notes"],
      source: gameContext || null,
      prompt: customPrompt.trim() || `Replace ${customType} "${label}" with a professional game-ready asset. Produce a preview PNG, GLB, animated GLB when applicable, sprite proof for browser gameplay, STL print-quality variant when printable, and patch notes for hot-swap review.`,
    };
    setQueue(prev => [...prev, job]);
    setCustomNotice(`Queued ${label} for replacement.`);
  }, [customId, customImage, customImageName, customLabel, customPrompt, customType, gameContext, pipelineStage]);

  const handleCustomImage = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setCustomNotice("Upload an image file: PNG, JPG, WEBP, GIF, or a transparent reference.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setCustomNotice("Image is over 8 MB. Use a smaller reference for this queue pass.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCustomImage(String(reader.result || ""));
      setCustomImageName(file.name);
      if (!customLabel.trim()) setCustomLabel(file.name.replace(/\.[^.]+$/, ""));
      setCustomNotice(`Loaded reference: ${file.name}`);
    };
    reader.onerror = () => setCustomNotice("Could not read that image.");
    reader.readAsDataURL(file);
  }, [customLabel]);

  // Export selected monster as MPQ mod file
  const exportAsMpq = useCallback(async (monster) => {
    if (!monster) return;
    try {
      // Load the monster image from its URL
      const img = new Image();
      img.crossOrigin = "anonymous";
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = monster.image;
      });

      // Draw to canvas to get pixel data
      const c = document.createElement("canvas");
      c.width = img.naturalWidth || 128;
      c.height = img.naturalHeight || 128;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0);

      // Pack as MPQ with all animation states
      const builder = await MpqPacker.packMonsterAsMpq(img, monster.type || monster.id, D2_DEFAULT_PALETTE);
      const filename = `${monster.id.toUpperCase()}_MOD.MPQ`;
      builder.download(filename);
    } catch (e) {
      console.error("[ArcForge] MPQ export failed:", e);
    }
  }, []);

  // Export ALL queued monsters as a single batch MPQ
  const exportBatchAsMpq = useCallback(async () => {
    const monsters = queue.map(j => ({ type: j.assetId, label: j.assetLabel }));
    if (!monsters.length) return;
    try {
      const builder = MpqPacker.builder();
      for (const job of queue) {
        if (job.imageUrl) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = job.imageUrl;
          });
          const { D2_MONSTER_PATHS, D2_ANIM } = await import("./d2MpqPaths.js");
          const entry = D2_MONSTER_PATHS[job.assetId];
          if (entry) {
            for (const [state, animMode] of Object.entries(D2_ANIM)) {
              const mpqPath = `data/global/monsters/${entry.code}/${animMode.toLowerCase()}/dc6/${entry.code}${animMode}.dc6`;
              await builder.addImageAsDC6(img, mpqPath, D2_DEFAULT_PALETTE);
            }
          }
        }
      }
      if (builder.fileCount > 0) {
        builder.download("CRYPTIC_MONSTER_PACK.MPQ");
      }
    } catch (e) {
      console.error("[ArcForge] Batch MPQ export failed:", e);
    }
  }, [queue]);

  // Auto-submit: poll for completed jobs and hot-swap assets
  useEffect(() => {
    const running = queue.filter(q => q.status === "running");
    if (!running.length) return;
    const interval = setInterval(async () => {
      for (const job of running) {
        if (!job.resultId) continue;
        try {
          const resp = await fetch(`${AF_API}/jobs/${job.resultId}`);
          if (resp.ok) {
            const status = await resp.json();
            if (status.status === "completed") {
              setQueue(prev => prev.map(q => q.id === job.id ? {
                ...q, status:"done", outputUrl: status.output_url,
              } : q));
            }
          }
        } catch {}
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [queue]);

  // Minimized view: small floating bubble bottom-right
  if (minimized) {
    return (
      <button
        onClick={() => setMinimized(false)}
        title="Expand ArcForge Queue"
        style={{
          position:"fixed", bottom:18, right:18, zIndex:200000,
          background:"linear-gradient(135deg, #d4a030, #8a6a18)",
          color:"#fff", border:"2px solid #d4a030", borderRadius:32,
          padding:"12px 18px", cursor:"pointer",
          fontFamily:FONT, fontSize:11, fontWeight:900, letterSpacing:".08em",
          boxShadow:"0 6px 24px rgba(212,160,48,0.4)",
        }}>
        ⚒ QUEUE ({queue.length})
      </button>
    );
  }

  return (
    <div style={{
      position:"fixed", top:0, right:0, width:420, height:"100vh",
      background:GLASS,
      borderLeft:BORDER, zIndex:200000,
      display:"flex", flexDirection:"column", fontFamily:FONT, fontSize:12,
      color:"#d8d1be",
      boxShadow:"-20px 0 60px rgba(0,0,0,0.5)",
    }}>
      {/* Header */}
      <OverlayHeader
        title="ARCFORGE QUEUE"
        subtitle="Queue jobs while playing — assets hot-swap when done · ESC closes · MIN tucks the panel away"
        onClose={onClose}
        style={{ padding:"14px 18px" }}
        titleStyle={{ fontSize:15 }}
      >
        <button onClick={() => setMinimized(true)} title="Minimize to corner" style={{
          background:"rgba(212,160,48,.18)", border:"1px solid #d4a030", color:"#d4a030",
          padding:"6px 12px", cursor:"pointer", fontFamily:FONT, fontSize:11, fontWeight:900, borderRadius:8,
        }}>— MIN</button>
      </OverlayHeader>

      {/* Pipeline selector */}
      <div style={{ padding:"8px 16px", borderBottom:DIVIDER, flexShrink:0 }}>
        <div style={{ fontSize:10, color:"#8899aa", marginBottom:4, fontFamily:FONT }}>Pipeline stage:</div>
        <div style={{ display:"flex", gap:4 }}>
          {PIPELINE.map(stage => (
            <button key={stage.id} onClick={() => setPipelineStage(stage.id)} style={{
              flex:1, padding:"5px 2px", cursor:"pointer", fontFamily:FONT, fontSize:10, fontWeight:800,
              background: pipelineStage === stage.id ? "rgba(212,160,48,.15)" : "rgba(255,255,255,.04)",
              color: pipelineStage === stage.id ? "#d4a030" : "#8899aa",
              border: `1px solid ${pipelineStage === stage.id ? "#d4a030" : "rgba(255,255,255,.14)"}`,
              borderRadius:8,
            }} title={stage.desc}>{stage.icon} {stage.label}</button>
          ))}
        </div>
      </div>

      {/* Super admin text/image replacement form */}
      {allowCustomAsset && (
        <div style={{ padding:"10px 16px", borderBottom:DIVIDER, flexShrink:0, display:"grid", gap:8 }}>
          <div style={{ display:"flex", justifyContent:"space-between", gap:8, alignItems:"center" }}>
            <div style={{ fontSize:10, color:"#ffdd66", fontFamily:FONT, fontWeight:900, letterSpacing:".06em" }}>TEXT / IMAGE ASSET REPLACEMENT</div>
            {gameContext?.selected?.label && <div style={{ fontSize:9, color:"#88ccff", fontFamily:FONT }}>target: {gameContext.selected.label}</div>}
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
            <select value={customType} onChange={e=>setCustomType(e.target.value)} style={{ background:"rgba(0,0,0,.35)", border:BORDER, color:"#d8d1be", borderRadius:8, padding:"7px", fontFamily:FONT, fontSize:11 }}>
              {["monster","item","character","town_npc","building","dungeon_tile","prop","weapon","armor","ui_icon","music","card","other"].map(type => <option key={type} value={type}>{type.replace(/_/g," ").toUpperCase()}</option>)}
            </select>
            <input value={customId} onChange={e=>setCustomId(e.target.value)} placeholder="asset id / path" style={{ background:"rgba(0,0,0,.35)", border:BORDER, color:"#d8d1be", borderRadius:8, padding:"7px", fontFamily:FONT, fontSize:11 }}/>
          </div>
          <input value={customLabel} onChange={e=>setCustomLabel(e.target.value)} placeholder="Display name, monster name, item name, tile id..." style={{ background:"rgba(0,0,0,.35)", border:BORDER, color:"#d8d1be", borderRadius:8, padding:"7px", fontFamily:FONT, fontSize:11 }}/>
          <textarea value={customPrompt} onChange={e=>setCustomPrompt(e.target.value)} rows={4} placeholder="Describe the replacement: style, silhouette, materials, animation clips, gameplay readability, STL/print requirements, and what should be replaced." style={{ background:"rgba(0,0,0,.35)", border:BORDER, color:"#d8d1be", borderRadius:8, padding:"7px", fontFamily:FONT, fontSize:11, resize:"vertical", lineHeight:1.35 }}/>
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleCustomImage} style={{ background:"rgba(0,0,0,.25)", border:BORDER, color:"#8899aa", borderRadius:8, padding:"6px", fontFamily:FONT, fontSize:10 }}/>
          {customImage && (
            <div style={{ display:"grid", gridTemplateColumns:"86px 1fr", gap:8, alignItems:"center" }}>
              <img src={customImage} alt="Replacement reference" style={{ width:86, height:72, objectFit:"contain", background:"rgba(0,0,0,.35)", border:CARD_BORDER, borderRadius:8 }}/>
              <div style={{ display:"grid", gap:5 }}>
                <div style={{ fontSize:10, color:"#8899aa", fontFamily:FONT }}>{customImageName || "Reference image loaded"}</div>
                <button onClick={()=>{setCustomImage("");setCustomImageName("");}} style={{ padding:"5px 8px", cursor:"pointer", fontFamily:FONT, fontSize:10, fontWeight:800, background:"rgba(255,255,255,.04)", color:"#8899aa", border:BORDER, borderRadius:8 }}>Clear image</button>
              </div>
            </div>
          )}
          <button onClick={addCustomReplacement} style={{
            width:"100%", padding:"8px", cursor:"pointer", fontFamily:FONT, fontSize:11, fontWeight:900,
            background:"rgba(204,68,255,.14)", color:"#cc88ff", border:"1px solid #cc88ff", borderRadius:10,
          }}>+ Queue text/image replacement</button>
          {customNotice && <div style={{ fontSize:10, color:"#ffdd66", fontFamily:FONT }}>{customNotice}</div>}
        </div>
      )}

      {/* Add selected monster button */}
      {selectedMonster && (
        <div style={{ padding:"8px 16px", borderBottom:DIVIDER, flexShrink:0 }}>
          <button onClick={() => addToQueue(selectedMonster)} style={{
            width:"100%", padding:"7px", cursor:"pointer", fontFamily:FONT, fontSize:11, fontWeight:800,
            background:"rgba(212,160,48,.15)", color:"#d4a030", border:"1px solid #d4a030", borderRadius:10,
          }}>+ Queue "{selectedMonster.label}" for {PIPELINE.find(p=>p.id===pipelineStage)?.label}</button>
          {/* MPQ export buttons */}
          <div style={{ display:"flex", gap:4, marginTop:4 }}>
            <button onClick={() => exportAsMpq(selectedMonster)} style={{
              flex:1, padding:"5px", cursor:"pointer", fontFamily:FONT, fontSize:9, fontWeight:800,
              background:"rgba(255,136,0,.1)", color:"#ff8800", border:"1px solid #ff8800", borderRadius:8,
            }}>EXPORT AS MPQ</button>
            <button onClick={() => exportBatchAsMpq()} style={{
              flex:1, padding:"5px", cursor:"pointer", fontFamily:FONT, fontSize:9, fontWeight:800,
              background:"rgba(255,170,68,.1)", color:"#ffaa44", border:"1px solid #ffaa44", borderRadius:8,
            }}>EXPORT ALL AS MPQ</button>
          </div>
        </div>
      )}

      {/* Submit button — large + prominent so users notice the next step */}
      {queue.some(q => q.status === "queued") && (
        <div style={{ padding:"12px 16px", borderBottom:DIVIDER, flexShrink:0, background:"rgba(68,204,68,0.07)" }}>
          <button onClick={submitQueue} style={{
            width:"100%", padding:"14px", cursor:"pointer", fontFamily:FONT, fontSize:13, fontWeight:950, letterSpacing:".06em",
            background:"linear-gradient(135deg, rgba(68,204,68,0.32), rgba(34,140,34,0.32))",
            color:"#7fffaa", border:"2px solid #44cc44", borderRadius:10,
            boxShadow:"0 0 18px rgba(68,204,68,0.3)",
          }}>▶ SUBMIT {queue.filter(q=>q.status==="queued").length} JOB(S) TO ARCFORGE BACKEND</button>
          <div style={{ marginTop:6, fontSize:10, color:"#88aa88", textAlign:"center", letterSpacing:".04em" }}>
            Backend must be running at <code style={{color:"#aaccaa"}}>{AF_API}</code>
          </div>
        </div>
      )}

      {/* Queue list */}
      <div style={{ flex:1, overflow:"auto", padding:"8px 16px" }}>
        {queue.length === 0 && (
          <div style={{ color:"#556677", textAlign:"center", padding:20, fontFamily:FONT }}>
            No jobs queued. Select a monster from the Chronicle and click + Queue.
          </div>
        )}
        {queue.map(job => {
          const statusInfo = QUEUE_STATUS[job.status] || QUEUE_STATUS.queued;
          return (
            <div key={job.id} style={{
              padding:8, marginBottom:6,
              border:`1px solid ${statusInfo.color}33`,
              background:CARD_BG, borderRadius:8,
            }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                <span style={{ color:statusInfo.color, fontSize:11, fontFamily:FONT, fontWeight:700 }}>{statusInfo.icon || "•"} {statusInfo.label}</span>
                <button onClick={() => removeJob(job.id)} style={{
                  background:"none", border:"none", color:"#556677", cursor:"pointer", fontSize:16, fontFamily:FONT,
                }}>×</button>
              </div>
              <div style={{ color:"#d8d1be", marginTop:4, fontSize:11, fontFamily:FONT }}>{job.assetLabel}</div>
              <div style={{ color:"#8899aa", fontSize:10, marginTop:2, fontFamily:FONT }}>
                {job.assetType || "asset"} / {job.game} → {PIPELINE.find(p=>p.id===job.pipeline)?.label || job.pipeline}
              </div>
              {job.status === "done" && job.outputUrl && (
                <div style={{ color:"#44cc44", fontSize:10, marginTop:4, fontFamily:FONT }}>
                  Output: {job.outputUrl}
                </div>
              )}
              {job.status === "running" && (
                <div style={{ color:"#ccaa44", fontSize:10, marginTop:4, fontFamily:FONT }}>
                  Processing...
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function generatePrompt(monster, pipeline) {
  const base = `${monster.label} from Diablo-style ARPG. ${monster.game} era. ${monster.type} tier.`;
  switch (pipeline) {
    case "clear_bg":
      return `${base} Remove white background, output transparent PNG with clean alpha edges.`;
    case "3d_asset":
      return `${base} Generate a 3D model with clean topology, PBR materials, game-ready polycount.`;
    case "rigged":
      return `${base} Rig with humanoid skeleton, weight paint for clean deformation, T-pose.`;
    case "animated_glb":
      return `${base} Export animated GLB with idle, walk, attack, hurt, death animation clips. Humanoid rig, game-ready.`;
    default:
      return `${base} Full pipeline: clear background → 3D model → rig → animated GLB.`;
  }
}
