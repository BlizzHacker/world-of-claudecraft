// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { mountChatFrame } from '../src/ui/cryptic/chat_frame';

describe('Cryptic chat frame', () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1200 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, value: 800 });
    document.body.className = '';
    document.body.innerHTML = `
      <div id="chatlog-wrap">
        <div id="chatlog-tabs"></div>
        <div id="chatlog-frame"></div>
      </div>
      <input id="chat-input">
    `;
  });

  it('applies a persisted desktop layout and keeps chat input attached', () => {
    window.localStorage.setItem('cr_chat_frame_layout', JSON.stringify({
      left: 44,
      bottom: 28,
      width: 410,
      height: 210,
    }));

    mountChatFrame();

    const wrap = document.getElementById('chatlog-wrap')!;
    const frame = document.getElementById('chatlog-frame')!;
    const input = document.getElementById('chat-input')!;
    expect(wrap.dataset.crChatFrame).toBe('mounted');
    expect(document.querySelector('.chat-frame-grip')).not.toBeNull();
    expect(document.querySelector('.chat-frame-resize')).not.toBeNull();
    expect(wrap.style.left).toBe('44px');
    expect(wrap.style.bottom).toBe('28px');
    expect(wrap.style.width).toBe('410px');
    expect(frame.style.height).toBe('210px');
    expect(input.style.left).toBe('44px');
    expect(input.style.bottom).toBe('262px');
    expect(input.style.width).toBe('410px');
  });
});
