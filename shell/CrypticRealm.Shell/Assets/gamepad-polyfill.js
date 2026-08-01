// Present host controller state to the page AS the Gamepad API.
//
// The Gamepad API does not reach WebView2 content on UWP
// (MicrosoftEdge/WebView2Feedback#4366 - open since Feb 2024, no documented
// workaround). Cryptic Realm's own input stack polls navigator.getGamepads()
// every frame, so rather than teaching the game about a console-only channel,
// the host reads Windows.Gaming.Input and this shim republishes that state
// through the exact API the game already uses. The game ships unmodified.
//
// Synthesising key events instead would have been worse: the game maps sticks
// to analogue look/move and reads button VALUES, none of which survives a
// keydown. A Gamepad object keeps the whole existing binding and remap UI
// working.
//
// Runs at document-create, before any page script, so nothing can capture the
// real (dead) getGamepads first.
(function () {
  'use strict';
  if (!window.chrome || !window.chrome.webview) return;

  var BUTTONS = 16;
  var AXES = 4;

  function makeButtons() {
    var out = [];
    for (var i = 0; i < BUTTONS; i++) out.push({ pressed: false, touched: false, value: 0 });
    return out;
  }

  // One live object reused across polls. The Gamepad API hands back a snapshot
  // each call, but callers overwhelmingly read it immediately, and reallocating
  // 16 button records every frame is pure garbage on a console.
  var pad = {
    id: 'Xbox Wireless Controller (STANDARD GAMEPAD)',
    index: 0,
    connected: false,
    mapping: 'standard',
    timestamp: 0,
    axes: new Array(AXES).fill(0),
    buttons: makeButtons(),
    vibrationActuator: null,
  };

  var announced = false;

  function fire(type) {
    var ev;
    try {
      ev = new GamepadEvent(type, { gamepad: pad });
    } catch (e) {
      // GamepadEvent is not constructible everywhere; a plain Event with the
      // property attached is enough for listeners that read e.gamepad.
      ev = new Event(type);
      try { ev.gamepad = pad; } catch (e2) { /* frozen Event: listeners can still poll */ }
    }
    window.dispatchEvent(ev);
  }

  window.chrome.webview.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || m.t !== 'pad') return;

    if (!m.connected) {
      if (pad.connected) {
        pad.connected = false;
        // Release everything: a disconnect mid-press would otherwise latch the
        // button down forever, and the game would keep walking.
        pad.buttons = makeButtons();
        pad.axes = new Array(AXES).fill(0);
        pad.timestamp = performance.now();
        announced = false;
        fire('gamepaddisconnected');
      }
      return;
    }

    for (var i = 0; i < BUTTONS; i++) {
      var down = !!(m.buttons && m.buttons[i]);
      var b = pad.buttons[i];
      b.pressed = down;
      b.touched = down;
      b.value = down ? 1 : 0;
    }
    for (var a = 0; a < AXES; a++) {
      pad.axes[a] = (m.axes && typeof m.axes[a] === 'number') ? m.axes[a] : 0;
    }
    pad.connected = true;
    // Callers use timestamp to detect "has anything changed since I last looked".
    pad.timestamp = performance.now();

    if (!announced) {
      announced = true;
      fire('gamepadconnected');
    }
  });

  var EMPTY = [null, null, null, null];
  function getGamepads() {
    return pad.connected ? [pad, null, null, null] : EMPTY;
  }

  try {
    Object.defineProperty(navigator, 'getGamepads', {
      value: getGamepads,
      configurable: true,
      writable: true,
    });
  } catch (e) {
    navigator.getGamepads = getGamepads;
  }
  if (navigator.webkitGetGamepads) navigator.webkitGetGamepads = getGamepads;
})();
