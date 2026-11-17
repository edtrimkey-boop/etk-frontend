// lib/sound.ts
// 🔊 ZERO-LATENCY WEB AUDIO API ENGINE FOR ED-TRIM KEY
// Downloads and decodes sounds straight to RAM with cross-browser Web Audio API support.

type SoundType = 'notification' | 'error' | 'warning' | 'success';

const SOUND_URLS: Record<SoundType, string> = {
  notification: 'https://ypmnsgpohaaavbjdqjye.supabase.co/storage/v1/object/public/sound/Notification.mp3',
  error: 'https://ypmnsgpohaaavbjdqjye.supabase.co/storage/v1/object/public/sound/Error%20UI.mp3',
  warning: 'https://ypmnsgpohaaavbjdqjye.supabase.co/storage/v1/object/public/sound/edtrimkey-warning.mp3',
  success: 'https://ypmnsgpohaaavbjdqjye.supabase.co/storage/v1/object/public/sound/Success%20UI.mp3',
};

let audioCtx: AudioContext | null = null;
const audioBuffers: Partial<Record<SoundType, AudioBuffer>> = {};
let isUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  return audioCtx;
}

// Preloader: Downloads and decodes directly to RAM
export async function preloadAudio(name: SoundType, url: string) {
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const decoded = await ctx.decodeAudioData(arrayBuffer);
    audioBuffers[name] = decoded;
  } catch (err) {
    console.warn(`[SoundEngine] Failed to preload sound "${name}":`, err);
  }
}

// Initialize all sounds in RAM immediately upon client-side load
export function initSoundEngine() {
  if (typeof window === 'undefined') return;

  const ctx = getAudioContext();
  if (!ctx) return;

  // Preload all 4 core sound cues
  (Object.keys(SOUND_URLS) as SoundType[]).forEach((type) => {
    if (!audioBuffers[type]) {
      preloadAudio(type, SOUND_URLS[type]);
    }
  });

  // Browser Autoplay Policy Unlocker:
  // Browsers block AudioContext until user interaction. This listener resumes the context on first user gesture.
  if (!isUnlocked) {
    const unlock = () => {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      isUnlocked = true;
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };

    window.addEventListener('click', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
  }
}

// Zero-Latency Sound Trigger
export function playSound(name: SoundType) {
  if (typeof window === 'undefined') return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const buffer = audioBuffers[name];
    if (!buffer) {
      // If buffer is still loading or failed, fallback to preloading on-demand
      preloadAudio(name, SOUND_URLS[name]).then(() => {
        const freshlyLoaded = audioBuffers[name];
        if (freshlyLoaded && ctx) {
          const source = ctx.createBufferSource();
          source.buffer = freshlyLoaded;
          source.connect(ctx.destination);
          source.start(0);
        }
      });
      return;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch (e) {
    console.warn('[SoundEngine] Playback error:', e);
  }
}

// Auto-run initialization when this module is imported on the client
if (typeof window !== 'undefined') {
  initSoundEngine();
}
