// ToS Guard — popup logic
// Drives state machine: idle -> loading -> results | error
// Coordinates with content script (text extraction) and background (API).

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const I18N = {
  en: {
    hero_title: "Scan this page for hidden traps",
    hero_sub: "ToS Guard reads the legal text on this page and flags clauses that quietly hurt you.",
    scan: "Scan this page",
    rescan: "Re-scan",
    highlight_page: "Highlight on page",
    open_settings: "Open settings",
    retry: "Retry",
    jump: "Jump on page →",
    risk_score: "risk",
    high: "high",
    medium: "medium",
    low: "low",
    footer: "Powered by Gemini · your key, your data",
    short_doc: "This page doesn't look like much of a legal document — scanning anyway.",
    not_legal: "This page doesn't look like a Terms of Service or Privacy Policy. Open one and try again.",
    no_key_title: "Add your Google Gemini API key",
    no_key_msg: "ToS Guard uses your own Google Gemini API key. Open settings to paste one in.",
    api_err_title: "Couldn't reach Gemini",
    text_short_title: "Not enough text to analyze",
    text_short_msg: "We couldn't find enough legal text on this page (need at least ~200 characters).",
    parse_err_title: "Got a confusing reply",
    parse_err_msg: "Gemini returned something we couldn't parse. Try again — re-scan usually fixes it.",
    no_clauses: "Looks clean — no obviously predatory clauses found.",
    loader_phases: [
      "Reading the fine print…",
      "Spotting predatory patterns…",
      "Drafting plain-language explanations…",
      "Almost done…"
    ]
  },
  ar: {
    hero_title: "افحص هذه الصفحة بحثًا عن الفخاخ المخفية",
    hero_sub: "تقرأ ToS Guard النص القانوني وتكشف الشروط الخبيثة التي تضرّك بصمت.",
    scan: "افحص هذه الصفحة",
    rescan: "إعادة الفحص",
    highlight_page: "تمييز في الصفحة",
    open_settings: "الإعدادات",
    retry: "إعادة المحاولة",
    jump: "اذهب إلى الموضع ←",
    risk_score: "خطر",
    high: "عالٍ",
    medium: "متوسط",
    low: "منخفض",
    footer: "مدعوم بـ Gemini · مفتاحك، بياناتك",
    short_doc: "لا تبدو الصفحة وثيقة قانونية، لكن سنحاول الفحص.",
    not_legal: "لا تبدو هذه الصفحة شروط استخدام أو سياسة خصوصية.",
    no_key_title: "أضف مفتاح Google Gemini API",
    no_key_msg: "تستخدم ToS Guard مفتاحك الخاص. افتح الإعدادات للصقه.",
    api_err_title: "تعذّر الوصول إلى Gemini",
    text_short_title: "النص غير كافٍ للتحليل",
    text_short_msg: "لم نجد نصًا قانونيًا كافيًا في هذه الصفحة.",
    parse_err_title: "رد غير مفهوم",
    parse_err_msg: "أعاد Gemini نصًا لم نستطع تحليله. أعد المحاولة.",
    no_clauses: "تبدو نظيفة — لم نعثر على شروط خبيثة واضحة.",
    loader_phases: [
      "نقرأ النص الدقيق…",
      "نرصد الأنماط الخبيثة…",
      "نصيغ الشرح بلغة بسيطة…",
      "اقتربنا من النهاية…"
    ]
  }
};

let lang = "en";
let lastResult = null;
let lastClauses = [];
let loaderInterval = null;
let ambientTl = null;
let laserTw = null;

// ---------- View management ----------
function show(view) {
  ["welcomeView", "idleView", "loadingView", "resultsView", "errorView"].forEach((id) => {
    $("#" + id).classList.toggle("hidden", id !== view);
  });
}

function t(key) {
  return I18N[lang][key] ?? I18N.en[key] ?? key;
}

function applyI18n() {
  document.body.classList.toggle("rtl", lang === "ar");
  $$("[data-i18n]").forEach((el) => {
    const k = el.getAttribute("data-i18n");
    if (I18N[lang][k]) el.textContent = I18N[lang][k];
  });
  $("#langBtn").textContent = lang === "en" ? "AR" : "EN";
}

// ---------- Animation helpers ----------
// Wrap each visible character of an element in a span for stagger animation.
// Detect RTL scripts (Hebrew, Arabic, Syriac, Thaana, NKo, Arabic Presentation Forms).
const RTL_RX = /[֐-׿؀-ۿ܀-ݏݐ-ݿހ-޿߀-߿ࡠ-࡯ࢠ-ࣿיִ-ﭏﭐ-﷿ﹰ-﻿]/;

// Wrap visible units of an element in spans for stagger animation.
// - Latin: split per character (cinematic per-letter cascade).
// - Arabic / RTL: split per WORD only — per-char destroys cursive shaping
//   (initial/medial/final forms + ligatures), which is exactly why
//   "الفخاخ" was breaking into "ال / فخاخ" before.
function splitChars(el) {
  if (!el) return [];
  if (el.dataset.split === "1") {
    return Array.from(el.querySelectorAll(".split-char, .split-word"));
  }
  const text = el.textContent;
  const useWords = RTL_RX.test(text);
  el.textContent = "";
  const frag = document.createDocumentFragment();
  if (useWords) {
    const parts = text.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
      } else {
        const s = document.createElement("span");
        s.className = "split-word";
        s.textContent = part;
        frag.appendChild(s);
      }
    }
  } else {
    const parts = text.split(/(\s+)/);
    for (const part of parts) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
        continue;
      }
      const wordWrap = document.createElement("span");
      wordWrap.className = "split-word-wrap";
      for (const ch of part) {
        const s = document.createElement("span");
        s.className = "split-char";
        s.textContent = ch;
        wordWrap.appendChild(s);
      }
      frag.appendChild(wordWrap);
    }
  }
  el.appendChild(frag);
  el.dataset.split = "1";
  return Array.from(el.querySelectorAll(".split-char, .split-word"));
}

// Resplit (re-wraps after text changes).
function resplit(el) {
  if (!el) return [];
  delete el.dataset.split;
  return splitChars(el);
}

function magneticHover(el, strength = 14) {
  if (!el || !window.gsap) return;
  const move = (e) => {
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    gsap.to(el, { x: x / r.width * strength, y: y / r.height * strength, duration: 0.35, ease: "power3.out" });
  };
  const leave = () => gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1, 0.4)" });
  el.addEventListener("mousemove", move);
  el.addEventListener("mouseleave", leave);
}

function rippleOnClick(el) {
  if (!el) return;
  el.addEventListener("click", (e) => {
    if (!window.gsap) return;
    const r = el.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.style.cssText = `position:absolute;left:${e.clientX - r.left}px;top:${e.clientY - r.top}px;width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,0.35);transform:translate(-50%,-50%);pointer-events:none;z-index:5;`;
    el.appendChild(ripple);
    gsap.fromTo(ripple,
      { scale: 0, opacity: 0.7 },
      { scale: 30, opacity: 0, duration: 0.8, ease: "power3.out", onComplete: () => ripple.remove() }
    );
  });
}

function killAmbient() {
  if (ambientTl) { ambientTl.kill(); ambientTl = null; }
  if (laserTw) { laserTw.kill(); laserTw = null; }
  if (window.gsap) {
    gsap.killTweensOf([".shield-wrap", ".cta-shine", ".hint", ".shield-check"]);
  }
}

// ---------- GSAP intro ----------
function introAnimation() {
  if (!window.gsap) return;

  // Soft drift on the background washes — kept very subtle for editorial feel.
  gsap.from(".orb-1", { scale: 0.6, opacity: 0, duration: 1.1, ease: "power2.out" });
  gsap.from(".orb-2", { scale: 0.6, opacity: 0, duration: 1.3, ease: "power2.out", delay: 0.1 });
  gsap.from(".orb-3", { scale: 0.4, opacity: 0, duration: 1.5, ease: "power2.out", delay: 0.2 });
  gsap.to(".orb-1", { x: 18, y: 12, duration: 10, ease: "sine.inOut", yoyo: true, repeat: -1 });
  gsap.to(".orb-2", { x: -22, y: -16, duration: 12, ease: "sine.inOut", yoyo: true, repeat: -1 });
  gsap.to(".orb-3", { x: -12, y: 18, duration: 14, ease: "sine.inOut", yoyo: true, repeat: -1 });

  // Top bar.
  gsap.from(".topbar", { y: -16, opacity: 0, duration: 0.55, ease: "power3.out" });
  const brandChars = splitChars($(".title h1"));
  gsap.from(brandChars, {
    y: 14, opacity: 0, duration: 0.45, ease: "power3.out", stagger: 0.035, delay: 0.15
  });
  gsap.from(".tag", { y: -6, opacity: 0, duration: 0.4, ease: "power3.out", delay: 0.4 });

  // Logo SVG nod-in.
  gsap.from(".logo svg", {
    scale: 0.4, rotation: -25, opacity: 0,
    duration: 0.7, ease: "back.out(1.8)", transformOrigin: "50% 50%"
  });

  if ($("#idleView") && !$("#idleView").classList.contains("hidden")) {
    // Hero shield + checkmark draw.
    gsap.from(".shield-wrap", { y: 24, opacity: 0, duration: 0.7, ease: "power3.out", delay: 0.1 });
    gsap.from(".shield", { scale: 0.7, opacity: 0, duration: 0.9, ease: "back.out(1.5)", delay: 0.15, transformOrigin: "50% 50%" });
    gsap.fromTo(".shield-check",
      { strokeDashoffset: 80, opacity: 0 },
      { strokeDashoffset: 0, opacity: 1, duration: 1.0, ease: "power2.out", delay: 0.55 }
    );

    // Hero copy.
    const titleChars = splitChars($(".hero-title"));
    gsap.from(titleChars, {
      y: 22, opacity: 0, duration: 0.5, ease: "power3.out", stagger: 0.018, delay: 0.35
    });
    gsap.from(".hero-sub", { y: 12, opacity: 0, duration: 0.55, ease: "power3.out", delay: 0.65 });
    gsap.from("#scanBtn", { y: 14, opacity: 0, scale: 0.94, duration: 0.55, ease: "back.out(1.6)", delay: 0.75 });
    gsap.from(".hint", { opacity: 0, duration: 0.4, ease: "power2.out", delay: 0.95 });

    // Ambient idle loop — gentle shield float, soft check stroke pulse, CTA shine sweep.
    ambientTl = gsap.timeline({ repeat: -1, yoyo: true });
    ambientTl
      .to(".shield-wrap", { y: -6, duration: 2.4, ease: "sine.inOut" })
      .to(".shield-check", { opacity: 0.65, duration: 1.2, ease: "sine.inOut" }, 0);

    gsap.to(".cta-shine", {
      left: "120%", duration: 1.4, ease: "power2.inOut",
      repeat: -1, repeatDelay: 2.6
    });

    // Hint slow shimmer.
    gsap.to(".hint", {
      opacity: 0.55, duration: 1.8, ease: "sine.inOut",
      yoyo: true, repeat: -1
    });
  }
}

function startLoaderAnim() {
  if (!window.gsap) return;
  killAmbient();

  // Scanner pop, lines draw width 0 → full, then breathing pulse.
  gsap.from(".scanner", { scale: 0.94, opacity: 0, duration: 0.45, ease: "back.out(1.4)" });
  gsap.from(".doc .line", {
    width: 0, duration: 0.5, ease: "power2.out", stagger: 0.07
  });
  gsap.to(".doc .line", {
    opacity: 0.55, duration: 1.4, ease: "sine.inOut",
    stagger: 0.1, yoyo: true, repeat: -1, delay: 0.6
  });

  // Laser sweep.
  laserTw = gsap.to(".laser", {
    top: "calc(100% - 2px)", duration: 1.2, ease: "sine.inOut",
    yoyo: true, repeat: -1
  });

  gsap.from(".loader-text", { y: 14, opacity: 0, duration: 0.5, ease: "power3.out", delay: 0.15 });

  // Rotating phase text.
  let i = 0;
  const phases = I18N[lang].loader_phases;
  $("#loaderTitle").textContent = phases[0];
  clearInterval(loaderInterval);
  loaderInterval = setInterval(() => {
    i = (i + 1) % phases.length;
    gsap.to("#loaderTitle", {
      opacity: 0, y: -8, skewX: -6, duration: 0.22, ease: "power2.in",
      onComplete: () => {
        $("#loaderTitle").textContent = phases[i];
        gsap.fromTo("#loaderTitle",
          { opacity: 0, y: 8, skewX: 6 },
          { opacity: 1, y: 0, skewX: 0, duration: 0.35, ease: "power3.out" }
        );
      }
    });
  }, 2200);
}

function stopLoaderAnim() {
  clearInterval(loaderInterval);
  loaderInterval = null;
  if (laserTw) { laserTw.kill(); laserTw = null; }
}

// ---------- Active tab helpers ----------
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { type: "PING_TOS_GUARD" });
  } catch (_) {
    try {
      await chrome.scripting.insertCSS({ target: { tabId }, files: ["content/content.css"] });
      await chrome.scripting.executeScript({ target: { tabId }, files: ["content/content.js"] });
    } catch (e) {
      throw new Error("RESTRICTED_PAGE");
    }
  }
}

async function getPageText(tab) {
  await ensureContentScript(tab.id);
  return await chrome.tabs.sendMessage(tab.id, { type: "GET_TEXT" });
}

// ---------- Scan flow ----------
async function runScan() {
  show("loadingView");
  startLoaderAnim();
  try {
    const tab = await getActiveTab();
    if (!tab || /^(chrome|edge|about|chrome-extension):/.test(tab.url || "")) {
      throw new Error("RESTRICTED_PAGE");
    }
    const page = await getPageText(tab);
    if (!page || !page.text || page.text.length < 200) {
      stopLoaderAnim();
      showError(t("text_short_title"), t("text_short_msg"));
      return;
    }
    const resp = await chrome.runtime.sendMessage({
      type: "ANALYZE_TOS",
      text: page.text,
      url: tab.url,
      title: tab.title || page.title || ""
    });
    stopLoaderAnim();
    if (!resp?.ok) {
      handleAnalyzeError(resp?.error || "Unknown error");
      return;
    }
    lastResult = resp.result;
    lastClauses = resp.result.clauses || [];
    renderResults(resp.result);
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "HIGHLIGHT_CLAUSES", clauses: lastClauses });
    } catch (_) {}
  } catch (err) {
    stopLoaderAnim();
    handleAnalyzeError(err?.message || String(err));
  }
}

function handleAnalyzeError(msg) {
  if (msg === "NO_API_KEY") {
    showError(t("no_key_title"), t("no_key_msg"), { showSettings: true });
  } else if (msg === "TEXT_TOO_SHORT") {
    showError(t("text_short_title"), t("text_short_msg"));
  } else if (msg === "RESTRICTED_PAGE") {
    showError("Can't scan this page", "Browser-internal pages (chrome://, extension stores, etc.) are off-limits to extensions. Open a normal website and try again.");
  } else if (msg.startsWith("PARSE_ERROR")) {
    const detail = msg.replace(/^PARSE_ERROR:\s*/, "");
    showError(t("parse_err_title"), detail || t("parse_err_msg"));
  } else if (msg.startsWith("API_ERROR")) {
    showError(t("api_err_title"), msg.replace(/^API_ERROR\s*:?\s*/, ""), { showSettings: true });
  } else {
    showError(t("api_err_title"), msg);
  }
}

// ---------- Render ----------
function animateNumber(el, to, duration = 1.0) {
  if (!window.gsap) { el.textContent = String(to); return; }
  const obj = { v: 0 };
  gsap.to(obj, {
    v: to, duration, ease: "power2.out",
    onUpdate: () => { el.textContent = Math.round(obj.v); }
  });
}

function renderResults(result) {
  show("resultsView");

  const score = Math.round(result.risk_score || 0);
  const docType = result.doc_type || "Document";
  $("#docType").textContent = docType;

  const summary = lang === "ar" ? (result.summary_ar || result.summary_en || "") : (result.summary_en || "");
  $("#summary").textContent = summary || (lastClauses.length ? "—" : t("no_clauses"));

  const counts = { high: 0, medium: 0, low: 0 };
  (result.clauses || []).forEach((c) => {
    const s = (c.severity || "medium").toLowerCase();
    if (counts[s] !== undefined) counts[s]++;
  });
  animateNumber($("#cHigh"), counts.high, 0.8);
  animateNumber($("#cMed"), counts.medium, 0.9);
  animateNumber($("#cLow"), counts.low, 1.0);

  // Badge
  const badge = $("#riskBadge");
  badge.classList.remove("high", "medium", "low", "good");
  if (score >= 70) { badge.textContent = "HIGH RISK"; badge.classList.add("high"); }
  else if (score >= 40) { badge.textContent = "MODERATE"; badge.classList.add("medium"); }
  else if (score >= 15) { badge.textContent = "SOME ISSUES"; badge.classList.add("low"); }
  else { badge.textContent = "LOOKS OK"; badge.classList.add("good"); }

  // Gauge.
  const circumference = 2 * Math.PI * 58;
  $("#gaugeArc").setAttribute("stroke-dasharray", circumference.toFixed(2));
  $("#gaugeArc").setAttribute("stroke-dashoffset", circumference.toFixed(2));
  if (window.gsap) {
    gsap.from(".score-card", { y: 16, opacity: 0, duration: 0.55, ease: "power3.out" });
    gsap.fromTo("#gaugeArc",
      { attr: { "stroke-dashoffset": circumference } },
      {
        attr: { "stroke-dashoffset": circumference - (circumference * (score / 100)) },
        duration: 1.6, ease: "expo.out"
      }
    );
    const num = { v: 0 };
    gsap.to(num, {
      v: score, duration: 1.4, ease: "expo.out",
      onUpdate: () => { $("#scoreNum").textContent = Math.round(num.v); }
    });
    gsap.fromTo("#riskBadge",
      { scale: 0.6, opacity: 0 },
      { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(2.2)", delay: 0.2 }
    );
    gsap.from("#summary", { y: 8, opacity: 0, duration: 0.5, ease: "power2.out", delay: 0.3 });
  } else {
    $("#gaugeArc").setAttribute("stroke-dashoffset", (circumference - (circumference * (score / 100))).toFixed(2));
    $("#scoreNum").textContent = String(score);
  }

  // Clauses list
  const list = $("#clauses");
  list.innerHTML = "";
  const tpl = $("#clauseTpl");
  (result.clauses || []).forEach((c, idx) => {
    const node = tpl.content.firstElementChild.cloneNode(true);
    const sev = (c.severity || "medium").toLowerCase();
    node.classList.add(sev);
    node.dataset.idx = String(idx);
    node.querySelector(".sev-text").textContent = sev.toUpperCase();
    const title = (lang === "ar" ? c.title_ar : c.title_en) || c.title_en || c.category || "Risky clause";
    node.querySelector(".clause-title").textContent = title;
    const why = (lang === "ar" ? c.why_ar : c.why_en) || c.why_en || "";
    node.querySelector(".clause-why").textContent = why;
    node.querySelector(".clause-snippet").textContent = "“" + (c.snippet || "").trim() + "”";
    node.querySelector(".cat-chip").textContent = (c.category || "other").replace(/_/g, " ");
    node.querySelector(".jump-btn").textContent = t("jump");

    node.querySelector(".clause-head").addEventListener("click", () => {
      const open = !node.classList.contains("open");
      node.classList.toggle("open", open);
      if (window.gsap) {
        if (open) {
          gsap.fromTo(node.querySelector(".clause-body"),
            { height: 0, opacity: 0 },
            { height: "auto", opacity: 1, duration: 0.4, ease: "power3.out" }
          );
        }
      }
    });
    node.querySelector(".jump-btn").addEventListener("click", async (e) => {
      e.stopPropagation();
      if (window.gsap) gsap.fromTo(node, { x: 0 }, { x: 4, duration: 0.1, yoyo: true, repeat: 1, ease: "power2.inOut" });
      const tab = await getActiveTab();
      try {
        await chrome.tabs.sendMessage(tab.id, { type: "SCROLL_TO_CLAUSE", idx });
      } catch (_) {}
    });

    // Hover lift on the card.
    node.addEventListener("mouseenter", () => {
      if (!window.gsap) return;
      gsap.to(node, { x: 2, duration: 0.25, ease: "power2.out" });
    });
    node.addEventListener("mouseleave", () => {
      if (!window.gsap) return;
      gsap.to(node, { x: 0, duration: 0.4, ease: "power2.out" });
    });

    list.appendChild(node);
  });

  if (window.gsap) {
    gsap.from(".clause", {
      y: 14, opacity: 0, duration: 0.5, ease: "power3.out", stagger: 0.07, delay: 0.2
    });
    gsap.from(".count-pill", {
      scale: 0.4, opacity: 0, y: 6, duration: 0.45, ease: "back.out(2)", stagger: 0.08, delay: 0.15
    });
    gsap.from(".results-actions .ghost", {
      y: 10, opacity: 0, duration: 0.4, ease: "power3.out", stagger: 0.08, delay: 0.4
    });

    // Continuous severity dot heartbeat.
    gsap.to(".count-pill.high .dot, .clause.high .sev-pill .dot", {
      scale: 1.45, duration: 0.85, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 50%"
    });
    gsap.to(".count-pill.medium .dot, .clause.medium .sev-pill .dot", {
      scale: 1.3, duration: 1.05, ease: "sine.inOut", yoyo: true, repeat: -1, transformOrigin: "50% 50%"
    });
  }
}

function showError(title, msg, opts = {}) {
  show("errorView");
  $("#errorTitle").textContent = title;
  $("#errorMsg").textContent = msg;
  $("#errOptionsBtn").style.display = opts.showSettings ? "" : "none";
  if (window.gsap) {
    gsap.from(".error-card", { y: 18, opacity: 0, duration: 0.5, ease: "power3.out" });
    gsap.from(".error-icon", { scale: 0.4, rotation: -20, opacity: 0, duration: 0.55, ease: "back.out(2.2)", delay: 0.1, transformOrigin: "50% 50%" });
    gsap.fromTo(".error-icon",
      { x: 0 },
      { x: -6, duration: 0.06, yoyo: true, repeat: 5, ease: "power2.inOut", delay: 0.6 }
    );
    gsap.from("#errorTitle", { y: 10, opacity: 0, duration: 0.4, ease: "power3.out", delay: 0.2 });
    gsap.from("#errorMsg", { y: 10, opacity: 0, duration: 0.4, ease: "power3.out", delay: 0.28 });
    gsap.from(".error-actions > *", { y: 10, opacity: 0, duration: 0.4, ease: "power3.out", stagger: 0.08, delay: 0.35 });
  }
}

// ---------- Boot ----------
async function init() {
  // URL params let the in-page overlay (content script) drive the popup:
  //   ?autoScan=1     → start scanning immediately after intro
  //   ?lang=ar|en     → pre-select language (matches the banner the user
  //                     just clicked, so EN/AR carries over seamlessly)
  const urlParams = new URLSearchParams(location.search);
  const wantAutoScan = urlParams.get("autoScan") === "1";
  const urlLang = urlParams.get("lang");

  const { lang: savedLang, apiKey: savedApiKey } = await chrome.storage.local.get(["lang", "apiKey"]);
  if (urlLang === "ar" || urlLang === "en") {
    lang = urlLang;
  } else {
    lang = savedLang === "ar" ? "ar" : "en";
  }
  applyI18n();

  // First-run: no API key yet → show the welcome/onboarding view instead of
  // jumping straight into the idle scan screen.
  const hasApiKey = typeof savedApiKey === "string" && savedApiKey.trim().length > 0;
  if (!hasApiKey && !wantAutoScan) {
    show("welcomeView");
  }

  try {
    const tab = await getActiveTab();
    if (tab && /^https?:/.test(tab.url || "")) {
      const url = tab.url.toLowerCase();
      const looksLegal = /(terms|privacy|policy|eula|legal|agreement|conditions)/.test(url);
      $("#hint").textContent = looksLegal
        ? (lang === "ar" ? "تبدو هذه الصفحة وثيقة قانونية ✓" : "This page looks like a legal document ✓")
        : "";
    } else {
      $("#hint").textContent = lang === "ar"
        ? "افتح صفحة عادية لاستخدام ToS Guard."
        : "Open a regular website to use ToS Guard.";
    }
  } catch (_) {}

  introAnimation();

  // Wire actions.
  $("#scanBtn").addEventListener("click", runScan);
  $("#rescanBtn").addEventListener("click", runScan);
  $("#errRetryBtn").addEventListener("click", runScan);
  $("#settingsBtn").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("#historyBtn").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("history/history.html") });
  });
  const welcomeSettingsBtn = $("#welcomeSettingsBtn");
  if (welcomeSettingsBtn) {
    welcomeSettingsBtn.addEventListener("click", () => chrome.runtime.openOptionsPage());
  }
  $("#errOptionsBtn").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("#highlightBtn").addEventListener("click", async () => {
    const tab = await getActiveTab();
    try {
      await chrome.tabs.sendMessage(tab.id, { type: "HIGHLIGHT_CLAUSES", clauses: lastClauses });
    } catch (_) {}
  });
  $("#langBtn").addEventListener("click", async () => {
    lang = lang === "en" ? "ar" : "en";
    await chrome.storage.local.set({ lang });

    // Flip the lang chip on toggle.
    if (window.gsap) {
      gsap.to("#langBtn", { rotationY: 90, duration: 0.2, ease: "power2.in",
        onComplete: () => {
          applyI18n();
          // Re-split chars after text swap.
          resplit($(".title h1"));
          resplit($(".hero-title"));
          gsap.fromTo("#langBtn", { rotationY: -90 }, { rotationY: 0, duration: 0.25, ease: "power3.out" });
        }
      });
    } else {
      applyI18n();
    }
    if (lastResult) renderResults(lastResult);
  });

  // Magnetic + ripple on CTAs.
  magneticHover($("#scanBtn"), 10);
  rippleOnClick($("#scanBtn"));
  rippleOnClick($("#rescanBtn"));
  rippleOnClick($("#highlightBtn"));
  rippleOnClick($("#errRetryBtn"));

  // Subtle parallax: brand & hero shift very slightly with the cursor.
  document.addEventListener("mousemove", (e) => {
    if (!window.gsap) return;
    const cx = (e.clientX / window.innerWidth) - 0.5;
    const cy = (e.clientY / window.innerHeight) - 0.5;
    gsap.to(".shield-wrap", { x: cx * 6, duration: 0.6, ease: "power2.out", overwrite: "auto" });
    gsap.to(".logo svg",    { x: cx * 3, y: cy * 3, duration: 0.6, ease: "power2.out", overwrite: "auto" });
  });

  // Auto-start the scan when opened from the in-page banner. The brief delay
  // lets the intro animation breathe so it doesn't get killed mid-frame by
  // the loader takeover.
  if (wantAutoScan) {
    setTimeout(runScan, 450);
  }
}

document.addEventListener("DOMContentLoaded", init);
