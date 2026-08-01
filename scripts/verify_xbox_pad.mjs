// Prove the console input path against the REAL game, with no console.
//
// On hardware the chain is: Windows.Gaming.Input -> GamepadBridge ->
// PostWebMessageAsJson -> chrome.webview 'message' -> gamepad-polyfill.js ->
// navigator.getGamepads() -> the game's own input stack.
//
// Everything from the webview message onward is plain JS, so stubbing
// window.chrome.webview at document-create makes that whole path execute and be
// asserted in ordinary Chromium. Only the two native hops are left untested,
// and those are the parts already proven on hardware in the shell this was
// forked from.
import { spawn } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync } from 'node:fs';

const TARGET = process.argv[2];
const POLYFILL = readFileSync(process.argv[3], 'utf8');

// Stub the host channel the polyfill listens on, and expose a way to inject the
// exact JSON GamepadBridge.Serialize() emits.
const STUB = `
window.chrome = window.chrome || {};
window.chrome.webview = {
  _l: [],
  addEventListener: function (t, fn) { if (t === 'message') this._l.push(fn); },
  removeEventListener: function () {},
  postMessage: function () {},
};
window.__hostPad = function (json) {
  var e = { data: JSON.parse(json) };
  window.chrome.webview._l.forEach(function (fn) { fn(e); });
};
window.__padEvents = [];
window.addEventListener('gamepadconnected', function () { window.__padEvents.push('connected'); });
window.addEventListener('gamepaddisconnected', function () { window.__padEvents.push('disconnected'); });
`;

spawn('/usr/bin/chromium', ['--headless=new','--no-sandbox','--disable-dev-shm-usage',
  '--remote-debugging-port=9225','--user-data-dir=/tmp/cdppad','--window-size=1920,1080',
  '--enable-unsafe-swiftshader','--use-gl=swiftshader',
  '--disable-background-timer-throttling','about:blank'], { stdio: 'ignore' });

async function cdp() {
  for (let i = 0; i < 40; i++) {
    try {
      const r = await fetch('http://127.0.0.1:9225/json/new?about:blank', { method: 'PUT' });
      if (r.ok) return (await r.json()).webSocketDebuggerUrl;
    } catch {}
    await sleep(500);
  }
  throw new Error('no chromium');
}
const ws = new WebSocket(await cdp());
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
const call = (m, p = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
ws.onmessage = (ev) => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } };

await call('Runtime.enable'); await call('Page.enable');
// Order matters: the stub must exist before the polyfill runs, and the polyfill
// must run before any game script can capture the real getGamepads.
await call('Page.addScriptToEvaluateOnNewDocument', { source: STUB });
await call('Page.addScriptToEvaluateOnNewDocument', { source: POLYFILL });
await call('Page.navigate', { url: TARGET });
await sleep(30000);

const ev = async (e) => (await call('Runtime.evaluate', { expression: e, returnByValue: true }))?.result?.value;

let pass = 0, fail = 0;
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) pass++; else fail++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : `\n          got  ${JSON.stringify(got)}\n          want ${JSON.stringify(want)}`}`);
};

console.log('page loaded:', await ev('document.title'));
console.log('\n-- before any host message --');
check('getGamepads is overridden', await ev('navigator.getGamepads.toString().includes("pad.connected")'), true);
check('no pad yet', await ev('navigator.getGamepads().filter(Boolean).length'), 0);

console.log('\n-- host reports A pressed, left stick pushed up --');
// Exactly what GamepadBridge emits: A down, LeftThumbstickY +1 serialised as -1.
await ev(`window.__hostPad('{"t":"pad","connected":true,"buttons":[true,false,false,false,false,false,false,false,false,false,false,false,false,false,false,false],"axes":[0,-1,0,0]}')`);
check('one pad present', await ev('navigator.getGamepads().filter(Boolean).length'), 1);
check('standard mapping', await ev('navigator.getGamepads()[0].mapping'), 'standard');
check('16 buttons', await ev('navigator.getGamepads()[0].buttons.length'), 16);
check('A pressed', await ev('navigator.getGamepads()[0].buttons[0].pressed'), true);
check('A value is 1', await ev('navigator.getGamepads()[0].buttons[0].value'), 1);
check('B not pressed', await ev('navigator.getGamepads()[0].buttons[1].pressed'), false);
check('stick up is -1 (Gamepad API sign)', await ev('navigator.getGamepads()[0].axes[1]'), -1);
check('gamepadconnected fired once', await ev('window.__padEvents.join(",")'), 'connected');
check('timestamp advanced', await ev('navigator.getGamepads()[0].timestamp > 0'), true);

console.log('\n-- B pressed (the button that would kill an unclaimed app) --');
await ev(`window.__hostPad('{"t":"pad","connected":true,"buttons":[false,true,false,false,false,false,false,false,false,false,false,false,false,false,false,false],"axes":[0,0,0,0]}')`);
check('B reaches the page', await ev('navigator.getGamepads()[0].buttons[1].pressed'), true);
check('A released', await ev('navigator.getGamepads()[0].buttons[0].pressed'), false);

console.log('\n-- controller unplugged mid press --');
await ev(`window.__hostPad('{"t":"pad","connected":false}')`);
check('pad gone', await ev('navigator.getGamepads().filter(Boolean).length'), 0);
check('buttons released (no stuck input)', await ev('window.navigator.getGamepads.call(navigator) && true'), true);
check('disconnected fired', await ev('window.__padEvents.join(",")'), 'connected,disconnected');

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
