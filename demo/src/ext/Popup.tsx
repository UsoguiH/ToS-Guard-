import { Clause, Result, Severity } from "./data";

// Mirror of the I18N strings the popup actually uses (popup.js).
const T = {
  en: { rescan: "Re-scan", highlight: "Highlight on page", risk: "risk",
        high: "high", medium: "medium", low: "low", jump: "Jump on page →",
        footer: "Powered by Gemini · your key, your data",
        loaderSub: "Asking Gemini to flag risky clauses" },
  ar: { rescan: "إعادة الفحص", highlight: "تمييز في الصفحة", risk: "خطر",
        high: "عالٍ", medium: "متوسط", low: "منخفض", jump: "اذهب إلى الموضع ←",
        footer: "مدعوم بـ Gemini · مفتاحك، بياناتك",
        loaderSub: "نطلب من Gemini تمييز الشروط الخطرة" },
} as const;

const LOADER_PHASES = {
  en: ["Reading the fine print…", "Spotting predatory patterns…",
       "Drafting plain-language explanations…", "Almost done…"],
  ar: ["نقرأ النص الدقيق…", "نرصد الأنماط الخبيثة…",
       "نصيغ الشرح بلغة بسيطة…", "اقتربنا من النهاية…"],
} as const;

type Lang = "en" | "ar";

function badgeFor(score: number): { text: string; cls: string } {
  if (score >= 70) return { text: "HIGH RISK", cls: "high" };
  if (score >= 40) return { text: "MODERATE", cls: "medium" };
  if (score >= 15) return { text: "SOME ISSUES", cls: "low" };
  return { text: "LOOKS OK", cls: "good" };
}

const C = 2 * Math.PI * 58; // gauge circumference = 364.42

const TopBar: React.FC<{ lang: Lang; docType: string }> = ({ lang, docType }) => (
  <header className="topbar">
    <div className="brand">
      <div className="logo">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <defs>
            <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#17171c" />
              <stop offset="100%" stopColor="#003c33" />
            </linearGradient>
          </defs>
          <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" fill="url(#lg)" />
          <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div className="title">
        <h1>ToS Guard</h1>
        <span className="tag">{docType}</span>
      </div>
    </div>
    <div className="topbar-actions">
      <button className="icon-btn">{lang === "en" ? "AR" : "EN"}</button>
      <button className="icon-btn" aria-label="History">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6a7 7 0 1 1 2.05 4.95l-1.42 1.42A9 9 0 1 0 13 3zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8z" /></svg>
      </button>
      <button className="icon-btn" aria-label="Settings">
        <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M19.4 13a7.5 7.5 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-1.7-1L15 3h-4l-.3 2.6a7.5 7.5 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.5 7.5 0 0 0 0 2l-2 1.6 2 3.4 2.4-1c.5.4 1.1.7 1.7 1L11 21h4l.3-2.6c.6-.3 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6zM13 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" /></svg>
      </button>
    </div>
  </header>
);

export type ResultsAnim = {
  gaugeProgress: number;   // 0..1 arc + number
  countsProgress: number;  // 0..1 count numbers
  badgePop: number;        // 0..1
  cardIn: (i: number) => number; // 0..1 per clause
  dotPulseHigh: number;    // scale multiplier
  dotPulseMed: number;
  expandedIdx: number | null;
  expandProgress: number;  // 0..1 height reveal
};

const Gauge: React.FC<{ score: number; p: number }> = ({ score, p }) => {
  const offset = C - C * (score / 100) * p;
  const num = Math.round(score * p);
  return (
    <div className="gauge">
      <svg viewBox="0 0 140 140" width="140" height="140">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#b30000" />
            <stop offset="100%" stopColor="#b30000" />
          </linearGradient>
        </defs>
        <circle cx="70" cy="70" r="58" stroke="#eeece7" strokeWidth="10" fill="none" />
        <circle cx="70" cy="70" r="58" stroke="url(#gaugeGrad)" strokeWidth="10" fill="none"
          strokeDasharray={C.toFixed(2)} strokeDashoffset={offset.toFixed(2)}
          strokeLinecap="round" transform="rotate(-90 70 70)" />
      </svg>
      <div className="gauge-center">
        <div className="gauge-num">{num}</div>
        <div className="gauge-label">risk</div>
      </div>
    </div>
  );
};

const ClauseCard: React.FC<{
  clause: Clause; idx: number; lang: Lang; anim: ResultsAnim;
}> = ({ clause, idx, lang, anim }) => {
  const sev = clause.severity;
  const open = anim.expandedIdx === idx;
  const inP = anim.cardIn(idx);
  const title = lang === "ar" ? clause.title_ar : clause.title_en;
  const why = lang === "ar" ? clause.why_ar : clause.why_en;
  const pulse = sev === "high" ? anim.dotPulseHigh : sev === "medium" ? anim.dotPulseMed : 1;

  return (
    <article
      className={`clause ${sev}${open ? " open" : ""}`}
      style={{
        opacity: inP,
        transform: `translateY(${(1 - inP) * 14}px)`,
      }}
    >
      <header className="clause-head">
        <div className="sev-pill">
          <span className="dot" style={{ transform: `scale(${pulse})` }} />
          <span className="sev-text">{sev.toUpperCase()}</span>
        </div>
        <div className="clause-title">{title}</div>
        <button className="clause-toggle" style={{ transform: open ? "rotate(180deg)" : "none" }}>
          <svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M7 10l5 5 5-5z" /></svg>
        </button>
      </header>
      {open && (
        <div
          className="clause-body"
          style={{
            display: "block",
            opacity: anim.expandProgress,
            maxHeight: anim.expandProgress * 360,
            overflow: "hidden",
          }}
        >
          <p className="clause-why">{why}</p>
          <blockquote className="clause-snippet">{"“" + clause.snippet.trim() + "”"}</blockquote>
          <div className="clause-actions">
            <span className="cat-chip">{clause.category.replace(/_/g, " ")}</span>
            <button className="link-btn">{T[lang].jump}</button>
          </div>
        </div>
      )}
    </article>
  );
};

export const Popup: React.FC<{
  view: "idle" | "loading" | "results";
  lang: Lang;
  result: Result;
  loader?: { laserY: number; phaseIndex: number; phaseFade: number };
  anim?: ResultsAnim;
  scanBtnScale?: number;
}> = ({ view, lang, result, loader, anim, scanBtnScale = 1 }) => {
  const counts = { high: 0, medium: 0, low: 0 };
  result.clauses.forEach((c) => (counts[c.severity as Severity]++));
  const badge = badgeFor(result.risk_score);
  const summary = lang === "ar" ? result.summary_ar : result.summary_en;

  return (
    <div className={`tg-popup${lang === "ar" ? " rtl" : ""}`} dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="bg-orb orb-1" />
      <div className="bg-orb orb-2" />
      <div className="bg-orb orb-3" />

      <TopBar lang={lang} docType={result.doc_type} />

      <main>
        {view === "idle" && (
          <section className="view">
            <div className="hero">
              <div className="shield-wrap">
                <svg className="shield" viewBox="0 0 120 120" width="120" height="120">
                  <defs>
                    <linearGradient id="shieldGrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#17171c" />
                      <stop offset="100%" stopColor="#003c33" />
                    </linearGradient>
                    <linearGradient id="shieldInner" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(238,236,231,0.85)" />
                      <stop offset="100%" stopColor="rgba(255,255,255,1)" />
                    </linearGradient>
                  </defs>
                  <path d="M60 8 18 22v30c0 26 18 49 42 58 24-9 42-32 42-58V22L60 8z" fill="url(#shieldGrad)" opacity="0.06" />
                  <path d="M60 14 24 26v26c0 22 15 42 36 50 21-8 36-28 36-50V26L60 14z" fill="url(#shieldInner)" stroke="#17171c" strokeWidth="1.5" />
                  <path d="M44 60l12 12 22-22" stroke="#17171c" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h2 className="hero-title">
                {lang === "ar" ? "افحص هذه الصفحة بحثًا عن الفخاخ المخفية" : "Scan this page for hidden traps"}
              </h2>
              <p className="hero-sub">
                {lang === "ar"
                  ? "تقرأ ToS Guard النص القانوني وتكشف الشروط الخبيثة التي تضرّك بصمت."
                  : "ToS Guard reads the legal text on this page and flags clauses that quietly hurt you."}
              </p>
              <button className="cta" style={{ transform: `scale(${scanBtnScale})` }}>
                <span className="cta-shine" />
                <span className="cta-label">{lang === "ar" ? "افحص هذه الصفحة" : "Scan this page"}</span>
                <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M5 12h12l-4-4 1.5-1.5L21 12l-6.5 5.5L13 16l4-4H5z" /></svg>
              </button>
              <p className="hint">{lang === "ar" ? "تبدو هذه الصفحة وثيقة قانونية ✓" : "This page looks like a legal document ✓"}</p>
            </div>
          </section>
        )}

        {view === "loading" && loader && (
          <section className="view">
            <div className="loader-stack">
              <div className="scanner">
                <div className="doc">
                  {["w70", "w90", "w60", "w85", "w50", "w95", "w75", "w65"].map((w, i) => (
                    <div key={i} className={`line ${w}`} />
                  ))}
                </div>
                <div className="laser" style={{ top: `${loader.laserY * 198}px` }} />
              </div>
              <div className="loader-text">
                <div className="loader-title" style={{ opacity: loader.phaseFade }}>
                  {LOADER_PHASES[lang][loader.phaseIndex]}
                </div>
                <div className="loader-sub">{T[lang].loaderSub}</div>
              </div>
            </div>
          </section>
        )}

        {view === "results" && anim && (
          <section className="view">
            <div className="score-card">
              <Gauge score={result.risk_score} p={anim.gaugeProgress} />
              <div className="score-meta">
                <div
                  className={`badge ${badge.cls}`}
                  style={{ opacity: anim.badgePop, transform: `scale(${0.6 + anim.badgePop * 0.4})` }}
                >
                  {badge.text}
                </div>
                <p className="summary">{summary}</p>
                <div className="counts">
                  <span className="count-pill high"><span className="dot" style={{ transform: `scale(${anim.dotPulseHigh})` }} />{Math.round(counts.high * anim.countsProgress)} <span>{T[lang].high}</span></span>
                  <span className="count-pill medium"><span className="dot" style={{ transform: `scale(${anim.dotPulseMed})` }} />{Math.round(counts.medium * anim.countsProgress)} <span>{T[lang].medium}</span></span>
                  <span className="count-pill low"><span className="dot" />{Math.round(counts.low * anim.countsProgress)} <span>{T[lang].low}</span></span>
                </div>
              </div>
            </div>

            <div className="results-actions">
              <button className="ghost">{T[lang].rescan}</button>
              <button className="ghost">{T[lang].highlight}</button>
            </div>

            <div className="clauses">
              {result.clauses.map((c, i) => (
                <ClauseCard key={i} clause={c} idx={i} lang={lang} anim={anim} />
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="footbar">
        <span>{T[lang].footer}</span>
      </footer>
    </div>
  );
};
