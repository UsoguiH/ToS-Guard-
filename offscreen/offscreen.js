// ToS Guard — offscreen audio playback.
// Bypasses the host page's autoplay restrictions by playing in an
// extension-owned context (Chrome MV3 chrome.offscreen with AUDIO_PLAYBACK).
//
// The chime is synthesized in real time via Web Audio API to mimic Apple's
// iPhone "Tri-tone" notification: three quick bell-like notes in a
// high-low-high pattern (~F#6, C#6, F#6) with a sharp attack and
// exponential decay for that classic glockenspiel/bell timbre.

let audioCtx = null;
function ctx() {
  if (!audioCtx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AC();
  }
  return audioCtx;
}

// Schedule a single bell-like note at `when` (audio-ctx seconds).
// Bell timbre = fundamental sine + a quieter 2nd-harmonic-ish partial.
function playNote(when, freq, duration, gain) {
  const c = ctx();

  const osc1 = c.createOscillator();
  osc1.type = "sine";
  osc1.frequency.value = freq;

  const osc2 = c.createOscillator();
  osc2.type = "sine";
  // Slightly inharmonic partial gives the metallic "bell" shimmer.
  osc2.frequency.value = freq * 2.01;

  const mix1 = c.createGain();
  mix1.gain.value = 0.85;
  const mix2 = c.createGain();
  mix2.gain.value = 0.18;

  const env = c.createGain();
  // Sharp attack (3ms), exponential decay over the note's duration.
  env.gain.setValueAtTime(0.0001, when);
  env.gain.exponentialRampToValueAtTime(gain, when + 0.003);
  env.gain.exponentialRampToValueAtTime(0.0001, when + duration);

  osc1.connect(mix1).connect(env);
  osc2.connect(mix2).connect(env);
  env.connect(c.destination);

  osc1.start(when);
  osc2.start(when);
  osc1.stop(when + duration + 0.05);
  osc2.stop(when + duration + 0.05);
}

// Apple Tri-tone: high → low → high, brisk triplet.
function playTriTone(volume) {
  const c = ctx();
  if (c.state === "suspended") {
    // Best-effort resume; offscreen ctx with AUDIO_PLAYBACK reason should
    // be allowed to play without a user gesture.
    c.resume().catch(() => {});
  }

  const v = Math.max(0, Math.min(1, typeof volume === "number" ? volume : 1.0)) * 0.5;
  const now = c.currentTime + 0.02;
  const noteDur = 0.17;      // ~170ms decay tail per note
  const stepMs = 0.085;      // ~85ms between note onsets (quick triplet)

  // Frequencies chosen to evoke Apple's Tri-tone: F#6, C#6, F#6.
  playNote(now,               1479.98, noteDur, v);   // F#6
  playNote(now + stepMs,      1108.73, noteDur, v);   // C#6
  playNote(now + stepMs * 2,  1479.98, noteDur, v);   // F#6
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || msg.target !== "offscreen") return false;

  if (msg.type === "PING") {
    sendResponse({ ok: true, ready: true });
    return false;
  }

  if (msg.type === "PLAY_CHIME") {
    try {
      playTriTone(msg.volume);
      sendResponse({ ok: true });
    } catch (e) {
      sendResponse({ ok: false, error: String(e?.message || e) });
    }
    return false;
  }
});

// Announce ready so the background can stop waiting.
chrome.runtime.sendMessage({ from: "offscreen", type: "OFFSCREEN_READY" }).catch(() => {});
