// ToS Guard — background service worker (MV3)
// Calls the Google Gemini API to analyze Terms of Service / Privacy Policy text.

const DEFAULT_MODEL = "gemini-3.5-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const MAX_INPUT_CHARS = 60000; // ~15k tokens, safe for one-shot analysis

const SYSTEM_PROMPT = `You are ToS Guard, a legal-tech analyzer that protects everyday users from predatory clauses in Terms of Service and Privacy Policy documents.

Your job: read the legal text the user pastes, find clauses that are HARMFUL or RISKY to the user, and explain WHY in plain language a non-lawyer can understand.

What counts as a "malicious" / predatory clause (شروط خبيثة):
- Forced arbitration / class-action waivers
- Unilateral changes ("we may change these terms at any time without notice")
- Broad content/IP licenses (perpetual, irrevocable, sublicensable rights over user content)
- Selling, sharing, or broad data-sharing with "partners" or "affiliates"
- Tracking, profiling, behavioral advertising without clear opt-out
- Indefinite data retention or vague deletion policies
- Auto-renewal / negative-option billing / hard-to-cancel subscriptions
- Liability disclaimers that strip the user of legal remedies
- Indemnification clauses where the user agrees to defend the company
- Cross-border data transfers to jurisdictions with weak protections
- Cookie / fingerprinting consent buried or implied
- Children's data handling concerns
- Account termination with no recourse, content forfeiture
- Vague / overbroad definitions ("we may use your data to improve our services")
- Mandatory venue / governing law in user-hostile jurisdictions
- Waivers of consumer rights (GDPR, CCPA, local equivalents)

You MUST respond with ONLY a single JSON object — no markdown fences, no preamble, no trailing commentary. The JSON must match this schema exactly:

{
  "is_legal_document": boolean,           // true if this looks like a ToS / Privacy / EULA / cookie policy
  "doc_type": string,                     // e.g. "Terms of Service", "Privacy Policy", "EULA", "Cookie Policy", "Unknown"
  "risk_score": number,                   // 0-100, overall predatory-ness
  "summary_en": string,                   // 1-2 sentences, plain English
  "summary_ar": string,                   // same in Arabic
  "clauses": [
    {
      "snippet": string,                  // EXACT substring copied verbatim from the input text (≤ 280 chars). Must appear character-for-character in the input so we can highlight it.
      "category": string,                 // one of: arbitration, data_sharing, content_license, auto_renewal, liability, indemnification, unilateral_change, tracking, retention, jurisdiction, termination, children, other
      "severity": string,                 // "high" | "medium" | "low"
      "title_en": string,                 // 3-6 word headline, English
      "title_ar": string,                 // same in Arabic
      "why_en": string,                   // 1-3 sentences explaining WHY this is bad for the user, in plain English
      "why_ar": string                    // same in Arabic
    }
  ]
}

Rules:
- If the input is clearly NOT a legal document, set is_legal_document=false, risk_score=0, clauses=[], and put a short note in summary_en/summary_ar.
- snippet MUST be an exact substring of the input. Do not paraphrase, fix typos, or merge sentences. If you can't find a verbatim snippet, omit that clause.
- Return at most 12 clauses, prioritized by severity. Skip boilerplate that is not actually harmful.
- Be concise. No legal jargon in explanations.
- If there are NO predatory clauses, return clauses: [] with a low risk_score and an encouraging summary.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    is_legal_document: { type: "BOOLEAN" },
    doc_type: { type: "STRING" },
    risk_score: { type: "NUMBER" },
    summary_en: { type: "STRING" },
    summary_ar: { type: "STRING" },
    clauses: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          snippet: { type: "STRING" },
          category: { type: "STRING" },
          severity: { type: "STRING" },
          title_en: { type: "STRING" },
          title_ar: { type: "STRING" },
          why_en: { type: "STRING" },
          why_ar: { type: "STRING" }
        },
        required: ["snippet", "category", "severity", "title_en", "title_ar", "why_en", "why_ar"]
      }
    }
  },
  required: ["is_legal_document", "doc_type", "risk_score", "summary_en", "summary_ar", "clauses"]
};

async function getSettings() {
  const { apiKey, model } = await chrome.storage.local.get(["apiKey", "model"]);
  return { apiKey, model: model || DEFAULT_MODEL };
}

function endpoint(model) {
  return `${API_BASE}/${encodeURIComponent(model)}:generateContent`;
}

async function callGemini(apiKey, model, body) {
  const res = await fetch(endpoint(model), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify(body)
  });
  return res;
}

async function analyzeText(text) {
  const { apiKey, model } = await getSettings();
  if (!apiKey) {
    throw new Error("NO_API_KEY");
  }

  const trimmed = (text || "").trim();
  if (trimmed.length < 200) {
    throw new Error("TEXT_TOO_SHORT");
  }

  const input = trimmed.length > MAX_INPUT_CHARS
    ? trimmed.slice(0, MAX_INPUT_CHARS * 0.7) + "\n\n[...truncated...]\n\n" + trimmed.slice(-MAX_INPUT_CHARS * 0.3)
    : trimmed;

  const body = {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }]
    },
    contents: [
      {
        role: "user",
        parts: [{
          text: `Analyze the following legal text and return the JSON object as instructed.\n\n---BEGIN DOCUMENT---\n${input}\n---END DOCUMENT---`
        }]
      }
    ],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 16384,
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      thinkingConfig: { thinkingBudget: 0 }
    },
    safetySettings: [
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ]
  };

  const res = await callGemini(apiKey, model, body);

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`API_ERROR ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const candidate = data?.candidates?.[0];
  if (!candidate) {
    const blockReason = data?.promptFeedback?.blockReason;
    if (blockReason) throw new Error(`API_ERROR: blocked by safety filters (${blockReason})`);
    throw new Error("API_ERROR: empty response from Gemini");
  }
  const finish = candidate.finishReason;
  const raw = candidate?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (!raw) {
    throw new Error(`API_ERROR: empty content (finishReason=${finish || "unknown"})`);
  }
  const jsonStr = extractJson(raw);
  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch (e) {
    if (finish === "MAX_TOKENS") {
      throw new Error("PARSE_ERROR: output was truncated (MAX_TOKENS). Try a shorter page or a smaller doc.");
    }
    const preview = raw.slice(0, 200).replace(/\s+/g, " ");
    throw new Error(`PARSE_ERROR: non-JSON output (finish=${finish || "?"}): ${preview}`);
  }

  parsed.clauses = Array.isArray(parsed.clauses) ? parsed.clauses : [];
  parsed.risk_score = Math.max(0, Math.min(100, Number(parsed.risk_score) || 0));
  return parsed;
}

function extractJson(s) {
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : s;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first === -1 || last === -1) return candidate.trim();
  return candidate.slice(first, last + 1);
}

async function testApiKey(apiKey, model) {
  const body = {
    contents: [{ role: "user", parts: [{ text: "Reply with the single word OK." }] }],
    generationConfig: { maxOutputTokens: 16, temperature: 0 }
  };
  const res = await callGemini(apiKey, model || DEFAULT_MODEL, body);
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: t.slice(0, 300) };
  }
  return { ok: true };
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg?.type === "ANALYZE_TOS") {
    // Capture URL/title — popup can pass them explicitly; for content-script
    // callers we fall back to sender.tab (background can't access tab APIs
    // from a runtime message otherwise).
    const url = msg.url || sender?.tab?.url || "";
    const title = msg.title || sender?.tab?.title || "";
    analyzeText(msg.text)
      .then(async (result) => {
        // Persist a history entry — fire and forget, don't block the response.
        saveHistoryEntry({ url, title, result }).catch((e) =>
          console.warn("[ToS Guard] history save failed:", e?.message || e)
        );
        sendResponse({ ok: true, result });
      })
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }
  if (msg?.type === "TEST_API_KEY") {
    testApiKey(msg.apiKey, msg.model)
      .then((r) => sendResponse(r))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }
  if (msg?.type === "OPEN_OPTIONS") {
    chrome.runtime.openOptionsPage();
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.type === "GET_HISTORY") {
    getHistory().then((items) => sendResponse({ ok: true, items }));
    return true;
  }
  if (msg?.type === "DELETE_HISTORY_ENTRY") {
    deleteHistoryEntry(msg.id).then((items) => sendResponse({ ok: true, items }));
    return true;
  }
  if (msg?.type === "CLEAR_HISTORY") {
    clearHistory().then(() => sendResponse({ ok: true }));
    return true;
  }
  // Only the *unforwarded* PLAY_CHIME from content/popup/options reaches us;
  // ignore the one we re-broadcast toward "offscreen".
  if (msg?.type === "PLAY_CHIME" && msg.target !== "offscreen") {
    playChime(typeof msg.volume === "number" ? msg.volume : 1.0)
      .then((r) => sendResponse(r || { ok: true }))
      .catch((err) => sendResponse({ ok: false, error: String(err.message || err) }));
    return true;
  }
});

// ---- Scan history -----------------------------------------------------
//
// Persisted to chrome.storage.local under "scanHistory" as a most-recent-first
// array. Each entry is a compact view of a successful Gemini scan:
//   { id, url, title, host, scannedAt, riskScore, docType, summary, counts,
//     clauses }
// Capped at HISTORY_MAX entries — chrome.storage.local is 5 MB total and
// each entry can be ~5 KB with full clause text, so 100 is a safe ceiling.

const HISTORY_KEY = "scanHistory";
const HISTORY_MAX = 100;

function safeHost(u) {
  try { return new URL(u).hostname; } catch (_) { return ""; }
}

async function getHistory() {
  const data = await chrome.storage.local.get([HISTORY_KEY]);
  return Array.isArray(data[HISTORY_KEY]) ? data[HISTORY_KEY] : [];
}

async function saveHistoryEntry({ url, title, result }) {
  if (!result) return;
  const clauses = Array.isArray(result.clauses) ? result.clauses : [];
  const counts = { high: 0, medium: 0, low: 0 };
  for (const c of clauses) {
    const s = (c.severity || "medium").toLowerCase();
    if (counts[s] !== undefined) counts[s]++;
  }
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    url: url || "",
    host: safeHost(url || ""),
    title: title || "",
    scannedAt: Date.now(),
    riskScore: Math.round(result.risk_score || 0),
    docType: result.doc_type || "Document",
    summary: result.summary_en || result.summary_ar || "",
    summaryAr: result.summary_ar || "",
    counts,
    clauses
  };
  const items = await getHistory();
  items.unshift(entry);
  // Cap — keep most recent HISTORY_MAX.
  if (items.length > HISTORY_MAX) items.length = HISTORY_MAX;
  await chrome.storage.local.set({ [HISTORY_KEY]: items });
}

async function deleteHistoryEntry(id) {
  const items = await getHistory();
  const filtered = items.filter((it) => it.id !== id);
  await chrome.storage.local.set({ [HISTORY_KEY]: filtered });
  return filtered;
}

async function clearHistory() {
  await chrome.storage.local.set({ [HISTORY_KEY]: [] });
}

// ---- Offscreen audio (notification chime) -----------------------------

const OFFSCREEN_URL = "offscreen/offscreen.html";
let creatingOffscreen = null;

async function ensureOffscreen() {
  // chrome.runtime.getContexts is available on Chromium 116+. Fall back
  // to a try/create-catch flow on older versions.
  try {
    if (chrome.runtime.getContexts) {
      const existing = await chrome.runtime.getContexts({
        contextTypes: ["OFFSCREEN_DOCUMENT"],
        documentUrls: [chrome.runtime.getURL(OFFSCREEN_URL)]
      });
      if (existing.length > 0) return;
    }
  } catch (_) { /* fall through */ }

  if (creatingOffscreen) { await creatingOffscreen; return; }
  creatingOffscreen = chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: ["AUDIO_PLAYBACK"],
    justification: "Play notification chime when ToS Guard detects a legal page."
  }).catch((e) => {
    // Already exists race — silently ignore.
    if (!/single offscreen document|Only a single/i.test(e.message || "")) throw e;
  });
  try { await creatingOffscreen; } finally { creatingOffscreen = null; }
}

async function playChime(volume = 1.0) {
  // Two parallel sound paths, because any single one can be defeated by
  // browser/OS state:
  //   1. OS-native notification — uses system notification sound, bypasses
  //      tab mute, autoplay policy, and extension audio entirely.
  //   2. Offscreen-document <audio> — plays our bundled WAV chime.
  fireOsNotification();

  try {
    await ensureOffscreen();
    let lastErr = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const resp = await chrome.runtime.sendMessage({
          target: "offscreen", type: "PLAY_CHIME", volume
        });
        if (resp?.ok) return resp;
        lastErr = resp?.error || "no response";
      } catch (e) {
        lastErr = e?.message || String(e);
      }
      await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
    }
    console.warn("[ToS Guard] chime play failed after retries:", lastErr);
    return { ok: false, error: lastErr };
  } catch (e) {
    console.warn("[ToS Guard] chime play failed:", e?.message || e);
    return { ok: false, error: e?.message || String(e) };
  }
}

function fireOsNotification() {
  try {
    if (!chrome.notifications?.create) return;
    const id = "tos-guard-detect-" + Date.now();
    chrome.notifications.create(id, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("icons/icon-128.png"),
      title: "ToS Guard",
      message: "Legal document detected — click the toolbar icon to scan.",
      silent: false,       // play the OS notification sound
      priority: 1
    });
    // Auto-clear after 5s so it doesn't pile up.
    setTimeout(() => { try { chrome.notifications.clear(id); } catch (_) {} }, 5000);
  } catch (e) {
    console.warn("[ToS Guard] OS notification failed:", e?.message || e);
  }
}

if (chrome.notifications?.onClicked) {
  chrome.notifications.onClicked.addListener((id) => {
    if (id.startsWith("tos-guard-")) {
      chrome.notifications.clear(id);
    }
  });
}

// ---- Context menu — manual "always works" fallback -------------------

function ensureContextMenu() {
  try {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: "tos-guard-scan",
        title: "Scan this page with ToS Guard",
        contexts: ["page", "selection", "link"]
      });
    });
  } catch (e) { /* contextMenus may be unavailable in some sandboxes */ }
}

chrome.runtime.onInstalled.addListener(async (details) => {
  ensureContextMenu();
  if (details.reason === "install") {
    chrome.runtime.openOptionsPage();
  }
});
chrome.runtime.onStartup?.addListener(ensureContextMenu);

if (chrome.contextMenus?.onClicked) {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    if (info.menuItemId !== "tos-guard-scan" || !tab?.id) return;
    // Ensure the content script is present, then tell it to run the banner scan flow.
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "PING_TOS_GUARD" });
    } catch (_) {
      try {
        await chrome.scripting.insertCSS({ target: { tabId: tab.id }, files: ["content/content.css"] });
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content/content.js"] });
      } catch (e) { return; }
    }
    try { await chrome.tabs.sendMessage(tab.id, { type: "FORCE_SCAN" }); } catch (_) {}
  });
}
