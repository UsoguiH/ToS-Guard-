// ToS Guard — History page logic.
// Renders the locally-stored scanHistory array from chrome.storage.local,
// with search, risk-level filter, expandable detail view, and per-entry
// delete + clear-all.

const $ = (sel, el = document) => el.querySelector(sel);
const $$ = (sel, el = document) => Array.from(el.querySelectorAll(sel));

const I18N = {
  en: {
    title: "Scan History",
    sub: "Every ToS, Privacy Policy, and EULA you've scanned with ToS Guard.",
    search_ph: "Search by site, title, or clause text…",
    all_risk: "All risk levels",
    risk_high: "High risk (70+)",
    risk_medium: "Moderate (40–69)",
    risk_low: "Some issues (15–39)",
    risk_good: "Looks OK (<15)",
    clear_all: "Clear all",
    settings: "Settings",
    empty_title: "No scans yet",
    empty_sub: "Scan a Terms of Service or Privacy Policy with ToS Guard and it'll show up here.",
    no_match_title: "No matching scans",
    no_match_sub: "Try a different search or filter.",
    show: "Show clauses",
    hide: "Hide clauses",
    open: "Open ↗",
    delete: "×",
    footer: "Your history is stored locally in this browser — nothing is uploaded.",
    count_one: "1 scan",
    count_many: (n) => `${n} scans`,
    count_filtered: (shown, total) => `Showing ${shown} of ${total} scans`,
    confirm_clear: "Delete all scan history? This cannot be undone.",
    confirm_delete: "Delete this scan from history?",
    risk_badge: {
      high: "HIGH RISK",
      medium: "MODERATE",
      low: "SOME ISSUES",
      good: "LOOKS OK"
    },
    no_clauses: "Looks clean — no obviously predatory clauses found."
  },
  ar: {
    title: "سجل الفحوصات",
    sub: "كل ما فحصته من شروط استخدام وسياسات خصوصية مع ToS Guard.",
    search_ph: "ابحث بحسب الموقع أو العنوان أو نص الشرط…",
    all_risk: "كل مستويات الخطر",
    risk_high: "خطر عالٍ (70+)",
    risk_medium: "متوسط (40–69)",
    risk_low: "بعض المشاكل (15–39)",
    risk_good: "يبدو سليمًا (<15)",
    clear_all: "مسح الكل",
    settings: "الإعدادات",
    empty_title: "لا توجد فحوصات بعد",
    empty_sub: "افحص شروط استخدام أو سياسة خصوصية لتظهر هنا.",
    no_match_title: "لا فحوصات مطابقة",
    no_match_sub: "جرّب بحثًا أو فلترًا مختلفًا.",
    show: "عرض الشروط",
    hide: "إخفاء الشروط",
    open: "افتح ↗",
    delete: "×",
    footer: "سجلك محفوظ محليًا في هذا المتصفح — لا شيء يُرفع للسحابة.",
    count_one: "فحص واحد",
    count_many: (n) => `${n} فحوصات`,
    count_filtered: (shown, total) => `يُعرض ${shown} من أصل ${total}`,
    confirm_clear: "حذف كل السجل؟ لا يمكن التراجع.",
    confirm_delete: "حذف هذا الفحص من السجل؟",
    risk_badge: {
      high: "خطر عالٍ",
      medium: "متوسط",
      low: "مشاكل قليلة",
      good: "سليم"
    },
    no_clauses: "تبدو نظيفة — لم نجد شروطًا خبيثة واضحة."
  }
};

let lang = "en";
let items = [];

function t(key) {
  return I18N[lang][key] ?? I18N.en[key];
}

function badgeForScore(score) {
  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  if (score >= 15) return "low";
  return "good";
}

function formatDate(ts) {
  const d = new Date(ts);
  const opts = { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" };
  try {
    return d.toLocaleDateString(lang === "ar" ? "ar" : "en", opts);
  } catch (_) {
    return d.toLocaleString();
  }
}

function applyI18n() {
  document.body.classList.toggle("rtl", lang === "ar");
  $("h1").textContent = t("title");
  $(".brand p.muted").textContent = t("sub");
  $("#search").placeholder = t("search_ph");
  const riskSel = $("#riskFilter");
  riskSel.options[0].textContent = t("all_risk");
  riskSel.options[1].textContent = t("risk_high");
  riskSel.options[2].textContent = t("risk_medium");
  riskSel.options[3].textContent = t("risk_low");
  riskSel.options[4].textContent = t("risk_good");
  $("#clearBtn").textContent = t("clear_all");
  $("#settingsBtn").textContent = t("settings");
  $("#langBtn").textContent = lang === "en" ? "AR" : "EN";
  $("#emptyState h2").textContent = t("empty_title");
  $("#emptyState p").textContent = t("empty_sub");
  $("footer span").textContent = t("footer");
}

async function loadHistory() {
  const resp = await chrome.runtime.sendMessage({ type: "GET_HISTORY" });
  items = (resp && resp.ok && Array.isArray(resp.items)) ? resp.items : [];
  render();
}

function filtered() {
  const q = $("#search").value.trim().toLowerCase();
  const risk = $("#riskFilter").value;
  return items.filter((it) => {
    if (risk) {
      const b = badgeForScore(it.riskScore);
      if (b !== risk) return false;
    }
    if (!q) return true;
    if ((it.title || "").toLowerCase().includes(q)) return true;
    if ((it.host || "").toLowerCase().includes(q)) return true;
    if ((it.url || "").toLowerCase().includes(q)) return true;
    if ((it.summary || "").toLowerCase().includes(q)) return true;
    for (const c of (it.clauses || [])) {
      if ((c.title_en || "").toLowerCase().includes(q)) return true;
      if ((c.why_en || "").toLowerCase().includes(q)) return true;
      if ((c.snippet || "").toLowerCase().includes(q)) return true;
    }
    return false;
  });
}

function render() {
  const list = $("#list");
  list.innerHTML = "";

  const shown = filtered();
  const total = items.length;
  const countEl = $("#count");
  const emptyEl = $("#emptyState");

  if (total === 0) {
    emptyEl.classList.remove("hidden");
    emptyEl.querySelector("h2").textContent = t("empty_title");
    emptyEl.querySelector("p").textContent = t("empty_sub");
    countEl.textContent = "";
    return;
  }
  if (shown.length === 0) {
    emptyEl.classList.remove("hidden");
    emptyEl.querySelector("h2").textContent = t("no_match_title");
    emptyEl.querySelector("p").textContent = t("no_match_sub");
    countEl.textContent = t("count_filtered")(0, total);
    return;
  }
  emptyEl.classList.add("hidden");
  countEl.textContent = shown.length === total
    ? (total === 1 ? t("count_one") : t("count_many")(total))
    : t("count_filtered")(shown.length, total);

  const tpl = $("#entryTpl");
  const clauseTpl = $("#clauseTpl");
  for (const it of shown) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = it.id;
    node.querySelector(".entry-title").textContent = it.title || it.host || it.url || "(no title)";
    node.querySelector(".entry-host").textContent = it.host || "";
    node.querySelector(".entry-date").textContent = formatDate(it.scannedAt);
    node.querySelector(".entry-doctype").textContent = it.docType || "Document";

    const badge = badgeForScore(it.riskScore);
    node.querySelector(".score-num").textContent = String(it.riskScore);
    const badgeEl = node.querySelector(".score-badge");
    badgeEl.textContent = t("risk_badge")[badge];
    badgeEl.classList.add(badge);

    node.querySelector(".c-high").textContent = String(it.counts?.high ?? 0);
    node.querySelector(".c-med").textContent  = String(it.counts?.medium ?? 0);
    node.querySelector(".c-low").textContent  = String(it.counts?.low ?? 0);

    const summaryEl = node.querySelector(".entry-summary");
    const summary = lang === "ar" ? (it.summaryAr || it.summary || "") : (it.summary || "");
    summaryEl.textContent = summary || ((it.clauses || []).length ? "" : t("no_clauses"));

    const toggleBtn = node.querySelector(".toggle-btn");
    toggleBtn.textContent = t("show");
    const body = node.querySelector(".entry-body");
    toggleBtn.addEventListener("click", () => {
      const opening = body.classList.contains("hidden");
      body.classList.toggle("hidden");
      toggleBtn.textContent = opening ? t("hide") : t("show");
      if (opening && !body.dataset.rendered) {
        renderClauses(body.querySelector(".entry-clauses"), it.clauses || [], clauseTpl);
        body.dataset.rendered = "1";
      }
    });

    const openBtn = node.querySelector(".open-btn");
    openBtn.textContent = t("open");
    if (it.url) {
      openBtn.addEventListener("click", () => chrome.tabs.create({ url: it.url }));
    } else {
      openBtn.style.display = "none";
    }

    const delBtn = node.querySelector(".delete-btn");
    delBtn.textContent = t("delete");
    delBtn.addEventListener("click", async () => {
      if (!confirm(t("confirm_delete"))) return;
      const resp = await chrome.runtime.sendMessage({ type: "DELETE_HISTORY_ENTRY", id: it.id });
      if (resp?.ok) {
        items = resp.items;
        render();
      }
    });

    list.appendChild(node);
  }
}

function renderClauses(container, clauses, clauseTpl) {
  container.innerHTML = "";
  if (!Array.isArray(clauses) || clauses.length === 0) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = t("no_clauses");
    container.appendChild(p);
    return;
  }
  for (const c of clauses) {
    const node = clauseTpl.content.firstElementChild.cloneNode(true);
    const sev = (c.severity || "medium").toLowerCase();
    node.classList.add(sev);
    node.querySelector(".sev-text").textContent = sev.toUpperCase();
    node.querySelector(".clause-title").textContent =
      (lang === "ar" ? c.title_ar : c.title_en) || c.title_en || c.category || "Risky clause";
    node.querySelector(".clause-why").textContent =
      (lang === "ar" ? c.why_ar : c.why_en) || c.why_en || "";
    node.querySelector(".clause-snippet").textContent = "“" + (c.snippet || "").trim() + "”";
    node.querySelector(".cat-chip").textContent = (c.category || "other").replace(/_/g, " ");
    container.appendChild(node);
  }
}

async function init() {
  const { lang: savedLang } = await chrome.storage.local.get(["lang"]);
  lang = savedLang === "ar" ? "ar" : "en";
  applyI18n();

  $("#search").addEventListener("input", render);
  $("#riskFilter").addEventListener("change", render);
  $("#clearBtn").addEventListener("click", async () => {
    if (items.length === 0) return;
    if (!confirm(t("confirm_clear"))) return;
    await chrome.runtime.sendMessage({ type: "CLEAR_HISTORY" });
    items = [];
    render();
  });
  $("#settingsBtn").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("#langBtn").addEventListener("click", async () => {
    lang = lang === "en" ? "ar" : "en";
    await chrome.storage.local.set({ lang });
    applyI18n();
    render();
  });

  await loadHistory();

  // Refresh when storage changes (e.g. user did a scan in another tab).
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.scanHistory) {
      items = changes.scanHistory.newValue || [];
      render();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
