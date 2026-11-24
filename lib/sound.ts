// lib/sound.ts
// 🔊 ZERO-LATENCY WEB AUDIO API ENGINE FOR ED-TRIM KEY (WITH iOS PWA BACKGROUND RECOVERY)
// Downloads and caches raw audio in RAM + Blob URLs so iOS Safari / Home Screen PWAs
// seamlessly recover audio after switching apps or locking the screen.

type SoundType = 'notification' | 'error' | 'warning' | 'success';

const SOUND_URLS: Record<SoundType, string> = {
  notification: 'https://ypmnsgpohaaavbjdqjye.supabase.co/storage/v1/object/public/sound/Notification.mp3',
  error: 'https://ypmnsgpohaaavbjdqjye.supabase.co/storage/v1/object/public/sound/Error%20UI.mp3',
  warning: 'https://ypmnsgpohaaavbjdqjye.supabase.co/storage/v1/object/public/sound/edtrimkey-warning.mp3',
  success: 'https://ypmnsgpohaaavbjdqjye.supabase.co/storage/v1/object/public/sound/Success%20UI.mp3',
};

let audioCtx: AudioContext | null = null;
const audioBuffers: Partial<Record<SoundType, AudioBuffer>> = {};
const rawBufferCache: Partial<Record<SoundType, ArrayBuffer>> = {};
const blobUrlCache: Partial<Record<SoundType, string>> = {};
let listenersAttached = false;
let needsUnlock = true;
let isResuming = false;

function configureIOSAudioSession() {
  if (typeof navigator === 'undefined') return;
  try {
    const navAny = navigator as any;
    if (navAny.audioSession && 'type' in navAny.audioSession) {
      // 'ambient' lets notifications/UI chimes coexist without getting permanently severed on iOS app switches
      navAny.audioSession.type = 'ambient';
    }
  } catch {}
}

function attachCtxListeners(ctx: AudioContext) {
  try {
    ctx.onstatechange = () => {
      const state = ctx.state as string;
      if (state === 'suspended' || state === 'interrupted') {
        needsUnlock = true;
      } else if (state === 'running') {
        needsUnlock = false;
      }
    };
  } catch {}
}

function getAudioContext(forceNew = false): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioContextClass) return null;

  if (forceNew && audioCtx) {
    try {
      audioCtx.close().catch(() => {});
    } catch {}
    audioCtx = null;
    // Decoded AudioBuffers are tied to the old AudioContext; clear decoded refs (rawBufferCache remains in RAM)
    (Object.keys(SOUND_URLS) as SoundType[]).forEach((k) => {
      delete audioBuffers[k];
    });
  }

  if (!audioCtx || (audioCtx.state as string) === 'closed') {
    configureIOSAudioSession();
    audioCtx = new AudioContextClass();
    attachCtxListeners(audioCtx);
  }
  return audioCtx;
}

// Plays a 1-sample silent buffer to forcefully re-engage iOS AVAudioSession on user gesture
function kickSilentBuffer(ctx: AudioContext) {
  try {
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch {}
}

async function decodeFromRawOrFetch(name: SoundType, ctx: AudioContext): Promise<AudioBuffer | null> {
  if (audioBuffers[name]) return audioBuffers[name]!;

  try {
    let raw = rawBufferCache[name];
    if (!raw) {
      const response = await fetch(SOUND_URLS[name]);
      raw = await response.arrayBuffer();
      rawBufferCache[name] = raw.slice(0);
      if (!blobUrlCache[name]) {
        blobUrlCache[name] = URL.createObjectURL(new Blob([raw], { type: 'audio/mpeg' }));
      }
    }
    // decodeAudioData detaches the passed ArrayBuffer, so always pass a fresh slice
    const decoded = await ctx.decodeAudioData(raw.slice(0));
    audioBuffers[name] = decoded;
    return decoded;
  } catch (err) {
    console.warn(`[SoundEngine] Failed to decode sound "${name}":`, err);
    return null;
  }
}

export async function preloadAudio(name: SoundType, _url?: string) {
  const ctx = getAudioContext();
  if (!ctx) return;
  await decodeFromRawOrFetch(name, ctx);
}

// Resume or recreate a wedged iOS AudioContext safely
export async function unlockAudioEngine(fromUserGesture = false): Promise<AudioContext | null> {
  if (typeof window === 'undefined') return null;
  configureIOSAudioSession();

  let ctx = getAudioContext();
  if (!ctx) return null;

  const state = ctx.state as string;
  if (state === 'running') {
    needsUnlock = false;
    return ctx;
  }

  if (isResuming && !fromUserGesture) return ctx;
  isResuming = true;

  try {
    // Race ctx.resume() against a short timeout because iOS can leave a dead interrupted context hanging
    await Promise.race([
      ctx.resume().catch(() => {}),
      new Promise((resolve) => setTimeout(resolve, 180)),
    ]);

    if ((ctx.state as string) !== 'running' && fromUserGesture) {
      // Recreate fresh AudioContext inside this active user gesture if iOS wedged the previous one
      ctx = getAudioContext(true);
      if (ctx) {
        await Promise.race([
          ctx.resume().catch(() => {}),
          new Promise((resolve) => setTimeout(resolve, 180)),
        ]);
        kickSilentBuffer(ctx);
      }
    } else if (ctx && (ctx.state as string) === 'running' && fromUserGesture) {
      kickSilentBuffer(ctx);
    }

    if (ctx && (ctx.state as string) === 'running') {
      needsUnlock = false;
    }
  } finally {
    isResuming = false;
  }

  return ctx;
}

function playHtmlAudioFallback(name: SoundType) {
  try {
    const src = blobUrlCache[name] || SOUND_URLS[name];
    const audio = new Audio(src);
    audio.volume = 0.85;
    audio.play().catch(() => {});
  } catch {}
}

// Initialize sounds & attach persistent iOS lifecycle/gesture recovery listeners
export function initSoundEngine() {
  if (typeof window === 'undefined') return;

  configureIOSAudioSession();
  const ctx = getAudioContext();
  if (ctx) {
    (Object.keys(SOUND_URLS) as SoundType[]).forEach((type) => {
      if (!rawBufferCache[type]) {
        decodeFromRawOrFetch(type, ctx);
      }
    });
  }

  if (!listenersAttached) {
    listenersAttached = true;

    const handleUserGesture = () => {
      if (!audioCtx || (audioCtx.state as string) !== 'running' || needsUnlock) {
        unlockAudioEngine(true);
      }
    };

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        needsUnlock = true;
        // Attempt silent resume immediately on foreground return; next tap finishes unlock if iOS requires gesture
        unlockAudioEngine(false).then((c) => {
          if (c && (c.state as string) === 'interrupted') {
            // Proactively rebuild context so first tap after switching back works cleanly
            getAudioContext(true);
            needsUnlock = true;
          }
        });
      }
    };

    // Keep persistent (non-once) passive listeners so returning from another iOS app re-arms audio cleanly
    window.addEventListener('touchstart', handleUserGesture, { passive: true, capture: true });
    window.addEventListener('pointerdown', handleUserGesture, { passive: true, capture: true });
    window.addEventListener('click', handleUserGesture, { passive: true, capture: true });
    window.addEventListener('keydown', handleUserGesture, { passive: true, capture: true });

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('pageshow', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);
  }
}

// Zero-Latency Sound Trigger with iOS Recovery & HTMLAudio Fallback
export async function playSound(name: SoundType) {
  if (typeof window === 'undefined') return;

  // Check if system audio is globally muted in Settings
  try {
    if (localStorage.getItem('tk_audio_muted') === 'true') {
      return;
    }
  } catch {}

  try {
    let ctx = getAudioContext();
    if (!ctx) {
      playHtmlAudioFallback(name);
      return;
    }

    const state = ctx.state as string;
    if (state === 'suspended' || state === 'interrupted') {
      ctx = await unlockAudioEngine(false);
    }

    if (!ctx || (ctx.state as string) !== 'running') {
      // If iOS has not yet received a tap since returning from another app, use HTMLAudio fallback
      needsUnlock = true;
      playHtmlAudioFallback(name);
      return;
    }

    const buffer = await decodeFromRawOrFetch(name, ctx);
    if (!buffer) {
      playHtmlAudioFallback(name);
      return;
    }

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
  } catch (e) {
    console.warn('[SoundEngine] Playback error, using fallback:', e);
    playHtmlAudioFallback(name);
  }
}

// Auto-run initialization when this module is imported on the client
if (typeof window !== 'undefined') {
  initSoundEngine();
}
