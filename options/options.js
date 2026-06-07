// ToS Guard — options page

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));

async function load() {
  const { apiKey, model, autoDetect, soundEnabled, dismissedOrigins } = await chrome.storage.local.get(["apiKey", "model", "autoDetect", "soundEnabled", "dismissedOrigins"]);
  if (apiKey) $("#apiKey").value = apiKey;
  if (model) $("#model").value = model;
  $("#autoDetect").checked = autoDetect !== false;
  $("#soundEnabled").checked = soundEnabled !== false;
  refreshDismissedCount(dismissedOrigins);
}

function refreshDismissedCount(map) {
  const count = map ? Object.keys(map).length : 0;
  const el = $("#dismissStatus");
  if (!el) return;
  el.textContent = count === 0
    ? "No sites dismissed."
    : `${count} site${count === 1 ? "" : "s"} dismissed.`;
  el.classList.remove("good", "bad");
}

async function saveAutoDetect() {
  await chrome.storage.local.set({ autoDetect: $("#autoDetect").checked });
}

async function saveSoundEnabled() {
  await chrome.storage.local.set({ soundEnabled: $("#soundEnabled").checked });
}

async function playTestChime() {
  setStatus("Asking background to play chime…", "");
  try {
    const r = await chrome.runtime.sendMessage({ type: "PLAY_CHIME", volume: 1.0 });
    if (r?.ok) setStatus("✓ Chime sent to offscreen player. If silent, check OS / tab volume.", "good");
    else setStatus("✗ " + (r?.error || "unknown error"), "bad");
  } catch (e) {
    setStatus("✗ " + (e.message || e), "bad");
  }
}

async function resetDismissed() {
  await chrome.storage.local.set({ dismissedOrigins: {} });
  refreshDismissedCount({});
  if (window.gsap) gsap.fromTo("#dismissStatus", { y: -4, opacity: 0 }, { y: 0, opacity: 1, duration: 0.3, ease: "power3.out" });
  const el = $("#dismissStatus");
  el.textContent = "All sites cleared — the banner will reappear next visit.";
  el.classList.add("good");
}

async function save() {
  const apiKey = $("#apiKey").value.trim();
  const model = $("#model").value;
  if (!apiKey || !/^AIza[0-9A-Za-z_-]{20,}$/.test(apiKey)) {
    setStatus("That doesn't look like a Google API key (should start with AIza...).", "bad");
    return;
  }
  await chrome.storage.local.set({ apiKey, model });
  setStatus("Saved. You can close this tab.", "good");
}

async function testKey() {
  const apiKey = $("#apiKey").value.trim();
  const model = $("#model").value;
  if (!apiKey) {
    setStatus("Paste your API key first.", "bad");
    return;
  }
  setStatus("Testing…", "");
  try {
    const r = await chrome.runtime.sendMessage({ type: "TEST_API_KEY", apiKey, model });
    if (r?.ok) setStatus("✓ Key works. Don't forget to save.", "good");
    else setStatus(`✗ ${r?.error || `HTTP ${r?.status || "?"}`}`, "bad");
  } catch (e) {
    setStatus("✗ " + (e.message || String(e)), "bad");
  }
}

function setStatus(msg, cls) {
  const el = $("#status");
  el.textContent = msg;
  el.classList.remove("good", "bad");
  if (cls) el.classList.add(cls);
  if (window.gsap) {
    gsap.fromTo(el, { y: -6, opacity: 0 }, { y: 0, opacity: 1, duration: 0.35, ease: "power3.out" });
  }
}

// Wrap each visible character in a span for stagger animations.
function splitChars(el) {
  if (!el || el.dataset.split === "1") return Array.from(el.querySelectorAll(".split-char"));
  const text = el.textContent;
  el.textContent = "";
  for (const ch of text) {
    const s = document.createElement("span");
    s.className = "split-char";
    s.textContent = ch === " " ? " " : ch;
    el.appendChild(s);
  }
  el.dataset.split = "1";
  return Array.from(el.querySelectorAll(".split-char"));
}

function magneticHover(el, strength = 14) {
  if (!el || !window.gsap) return;
  el.addEventListener("mousemove", (e) => {
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    gsap.to(el, { x: x / r.width * strength, y: y / r.height * strength, duration: 0.35, ease: "power3.out" });
  });
  el.addEventListener("mouseleave", () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.55, ease: "elastic.out(1, 0.4)" });
  });
}

function rippleOnClick(el) {
  if (!el) return;
  el.style.position = el.style.position || "relative";
  el.style.overflow = "hidden";
  el.addEventListener("click", (e) => {
    if (!window.gsap) return;
    const r = el.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.style.cssText = `position:absolute;left:${e.clientX - r.left}px;top:${e.clientY - r.top}px;width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.30);transform:translate(-50%,-50%);pointer-events:none;`;
    el.appendChild(ripple);
    gsap.fromTo(ripple,
      { scale: 0, opacity: 0.7 },
      { scale: 40, opacity: 0, duration: 0.9, ease: "power3.out", onComplete: () => ripple.remove() }
    );
  });
}

function intro() {
  if (!window.gsap) return;

  // Pale background washes drift in & ambient float.
  gsap.from(".orb-1", { scale: 0.7, opacity: 0, duration: 1.4, ease: "power2.out" });
  gsap.from(".orb-2", { scale: 0.7, opacity: 0, duration: 1.6, ease: "power2.out", delay: 0.15 });
  gsap.to(".orb-1", { x: 30, y: 20, duration: 14, ease: "sine.inOut", yoyo: true, repeat: -1 });
  gsap.to(".orb-2", { x: -36, y: -22, duration: 16, ease: "sine.inOut", yoyo: true, repeat: -1 });

  // Brand intro.
  gsap.from(".logo", { scale: 0.4, rotation: -20, opacity: 0, duration: 0.7, ease: "back.out(1.8)", transformOrigin: "50% 50%" });
  const brandChars = splitChars($("h1"));
  gsap.from(brandChars, {
    y: 24, opacity: 0, duration: 0.6, ease: "power3.out", stagger: 0.025, delay: 0.2
  });
  gsap.from(".brand .muted", { y: 10, opacity: 0, duration: 0.5, ease: "power3.out", delay: 0.5 });

  // Cards stagger up.
  gsap.from(".card", {
    y: 24, opacity: 0, duration: 0.65, ease: "power3.out", stagger: 0.12, delay: 0.35
  });

  // Section heading per-char on visible headings.
  $$(".card h2").forEach((h, i) => {
    const chars = splitChars(h);
    gsap.from(chars, {
      y: 14, opacity: 0, duration: 0.45, ease: "power3.out",
      stagger: 0.018, delay: 0.55 + i * 0.12
    });
  });

  gsap.from("footer", { y: 12, opacity: 0, duration: 0.5, ease: "power3.out", delay: 0.85 });
}

function inputFocusFx() {
  if (!window.gsap) return;
  $$("input, select").forEach((el) => {
    el.addEventListener("focus", () => {
      gsap.fromTo(el, { boxShadow: "0 0 0 0 rgba(155,96,170,0)" }, { boxShadow: "0 0 0 6px rgba(155,96,170,0.10)", duration: 0.25, ease: "power3.out" });
    });
    el.addEventListener("blur", () => {
      gsap.to(el, { boxShadow: "0 0 0 0 rgba(155,96,170,0)", duration: 0.25, ease: "power2.out" });
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  load();
  intro();
  inputFocusFx();

  $("#saveBtn").addEventListener("click", save);
  $("#testBtn").addEventListener("click", testKey);
  $("#toggleKey").addEventListener("click", () => {
    const input = $("#apiKey");
    const isPwd = input.type === "password";
    input.type = isPwd ? "text" : "password";
    $("#toggleKey").textContent = isPwd ? "Hide" : "Show";
    if (window.gsap) {
      gsap.fromTo($("#toggleKey"), { rotationX: 90 }, { rotationX: 0, duration: 0.3, ease: "power3.out" });
    }
  });
  $("#apiKey").addEventListener("keydown", (e) => { if (e.key === "Enter") save(); });
  $("#autoDetect").addEventListener("change", saveAutoDetect);
  $("#soundEnabled").addEventListener("change", saveSoundEnabled);
  $("#resetDismissedBtn").addEventListener("click", resetDismissed);
  $("#testSoundBtn").addEventListener("click", playTestChime);

  $("#openHistoryBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("history/history.html") });
  });
  $("#clearHistoryBtn").addEventListener("click", async () => {
    const ok = confirm("Delete all scan history? This cannot be undone.");
    if (!ok) return;
    await chrome.runtime.sendMessage({ type: "CLEAR_HISTORY" });
    const status = $("#historyStatus");
    if (status) {
      status.textContent = "History cleared.";
      status.className = "status good";
      setTimeout(() => { status.textContent = ""; status.className = "status"; }, 2400);
    }
  });

  // Stamp the version from the manifest into the footer.
  try {
    const v = chrome.runtime.getManifest().version;
    const versionLink = $("#versionLink");
    if (versionLink) versionLink.textContent = `v${v}`;
  } catch (_) {}

  magneticHover($("#saveBtn"), 10);
  magneticHover($("#testBtn"), 8);
  rippleOnClick($("#saveBtn"));
  rippleOnClick($("#testBtn"));
});
