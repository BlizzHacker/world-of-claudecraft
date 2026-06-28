import React, { useState, useRef, useEffect } from 'react';
import { CrypticRealmGame, CR_CLASSES, CR_CLASS_ORDER } from './engine/CrypticRealmGame.js';
import './classic.css';

export default function ClassicCrypticMount({ onExit }) {
  const [started, setStarted] = useState(false);
  const [classId, setClassId] = useState(CR_CLASS_ORDER[0]);
  const canvasRef = useRef(null);
  const gameRef = useRef(null);

  useEffect(() => {
    if (!started || !canvasRef.current) return;
    const saved = (() => {
      try { return JSON.parse(localStorage.getItem('cr_classic_save') || 'null'); }
      catch { return null; }
    })();
    // saveData is the unwrapped save object (or null for a fresh game), exactly
    // as the original GameOverlay passed `crypticSaveRef.current`. Passing a
    // `{current: saved}` ref wrapper here is truthy even when empty, making the
    // engine set this.player = wrapper.player (undefined) → boot crash.
    gameRef.current = new CrypticRealmGame(
      canvasRef.current, classId, 'normal', 1, 'high',
      saved,
      { settings: {}, accountKey: 'classic', apiSettings: {},
        characterId: null, chromeTopInset: 0, isAdmin: false },
    );
    return () => { try { gameRef.current?.destroy?.(); } catch {} };
  }, [started, classId]);

  return (
    <div className="cr-classic-root">
      <button className="cr-classic-back" onClick={onExit}>← Back to CrypticRealm.com</button>
      {!started ? (
        <div className="cr-classic-select">
          <h1>Original Cryptic Realm</h1>
          <div className="cr-classic-classes">
            {CR_CLASS_ORDER.map((id) => (
              <button key={id} className={id === classId ? 'sel' : ''} onClick={() => setClassId(id)}>
                {CR_CLASSES[id]?.name ?? id}
              </button>
            ))}
          </div>
          <button className="cr-classic-play" onClick={() => setStarted(true)}>Play</button>
        </div>
      ) : (
        <canvas ref={canvasRef} className="cr-classic-canvas" />
      )}
    </div>
  );
}
