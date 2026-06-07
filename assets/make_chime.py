"""Generate a short two-note chime WAV for the banner notification."""
import wave, struct, math, os

SR = 44100
DUR = 0.55          # total seconds
FREQ1 = 880         # A5
FREQ2 = 1318.5      # E6 (perfect fifth up — bright, pleasant)
NOTE1_DUR = 0.22
NOTE2_START = 0.11
NOTE2_DUR = 0.40
PEAK = 0.55         # overall amplitude (well above the previous 0.10 gain)

samples = []
n_samples = int(SR * DUR)
for i in range(n_samples):
    t = i / SR

    # Note 1: A5 — quick attack, exponential decay
    a1 = 0.0
    if 0 <= t < NOTE1_DUR:
        attack = min(1.0, t / 0.008)
        decay = math.exp(-t / 0.12)
        a1 = attack * decay
    s1 = math.sin(2 * math.pi * FREQ1 * t) * a1

    # Note 2: E6 — starts at NOTE2_START
    a2 = 0.0
    t2 = t - NOTE2_START
    if 0 <= t2 < NOTE2_DUR:
        attack = min(1.0, t2 / 0.010)
        decay = math.exp(-t2 / 0.18)
        a2 = attack * decay
    s2 = math.sin(2 * math.pi * FREQ2 * t) * a2

    # Mix + tiny stereo-mono shaping (just additive here, mono out).
    s = (s1 * 0.55 + s2 * 0.65) * PEAK
    # Final hard limit to avoid clipping.
    s = max(-0.95, min(0.95, s))
    samples.append(int(s * 32767))

# Apply very short fade-out at the end to avoid click.
fade = int(SR * 0.03)
for k in range(fade):
    idx = len(samples) - fade + k
    factor = 1 - (k / fade)
    samples[idx] = int(samples[idx] * factor)

out = os.path.join(os.path.dirname(os.path.abspath(__file__)), "chime.wav")
with wave.open(out, "w") as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(b"".join(struct.pack("<h", s) for s in samples))

print("wrote", out, "(", os.path.getsize(out), "bytes)")
