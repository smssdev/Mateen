import { useEffect, useState } from 'react';

// One shared <audio> element for the whole app so starting a recitation always
// stops the previous one.
const audio = typeof Audio !== 'undefined' ? new Audio() : undefined;
let current = '';
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

if (audio) {
  audio.preload = 'auto';
  for (const ev of ['play', 'pause', 'ended', 'error', 'waiting', 'playing']) audio.addEventListener(ev, notify);
}

export type PlayerStatus = 'idle' | 'loading' | 'playing' | 'error';

function status(url: string): PlayerStatus {
  if (!audio || current !== url) return 'idle';
  if (audio.error) return 'error';
  if (audio.paused || audio.ended) return 'idle';
  return audio.readyState < 3 ? 'loading' : 'playing';
}

export function play(url: string, times = 1) {
  if (!audio) return;
  let left = times;
  audio.onended = () => {
    left -= 1;
    if (left > 0) {
      audio.currentTime = 0;
      void audio.play();
    }
  };
  if (current !== url) {
    current = url;
    audio.src = url;
  } else {
    audio.currentTime = 0;
  }
  audio.play().catch(notify);
  notify();
}

export function stop() {
  audio?.pause();
  notify();
}

export function usePlayer(url: string) {
  const [s, setS] = useState<PlayerStatus>(() => status(url));
  useEffect(() => {
    const l = () => setS(status(url));
    listeners.add(l);
    l();
    return () => {
      listeners.delete(l);
    };
  }, [url]);
  useEffect(() => () => stop(), []);
  return {
    status: s,
    toggle: (times = 1) => (s === 'playing' || s === 'loading' ? stop() : play(url, times)),
    play: (times = 1) => play(url, times),
  };
}
