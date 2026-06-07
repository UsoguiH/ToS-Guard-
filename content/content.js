// ToS Guard — content script
// 1. Extracts legal text from the active page on demand (popup flow).
// 2. Auto-detects ToS / Privacy pages on load and shows an in-page banner
//    asking the user if they want to scan.
// 3. Highlights flagged clauses inline.

(function () {
  if (window.__tosGuardInjected) return;
  window.__tosGuardInjected = true;

  // Kept only for the popup-driven LookupLegal hint (page seems legal?).
  const LEGAL_RX = /(terms|privacy|cookie|eula|legal|policy|conditions|impressum|datenschutz|confidentialité|términos|condiciones|aviso|termini|termos|الشروط|الخصوصية|اتفاقية|利用規約|プライバシー|服务条款|隐私|이용약관|개인정보|условия|политика|gizlilik)/i;

  // ====================================================================
  // Page text extraction (used by popup-driven scans)
  // ====================================================================

  function visibleText(root) {
    if (!root) return "";
    const clone = root.cloneNode(true);
    clone.querySelectorAll("script, style, nav, footer, header, aside, noscript, iframe, svg, button, form, [aria-hidden=true]")
      .forEach((n) => n.remove());
    return (clone.innerText || clone.textContent || "")
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  function extractText() {
    const selectors = ["main", "article", "[role=main]", "#content", ".content", "#main", ".main",
      ".terms", ".tos", ".legal", ".policy", ".privacy"];
    let best = null;
    let bestLen = 0;
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        const t = visibleText(el);
        if (t.length > bestLen) { best = el; bestLen = t.length; }
      });
    }
    if (!best || bestLen < 800) {
      let densest = document.body;
      let densestLen = visibleText(document.body).length;
      document.querySelectorAll("section, div, article").forEach((el) => {
        const t = visibleText(el);
        const pCount = el.querySelectorAll("p, li").length;
        const score = t.length + pCount * 50;
        if (score > densestLen && t.length > 800) { densest = el; densestLen = score; }
      });
      best = densest;
    }
    return visibleText(best);
  }

  // ====================================================================
  // Highlighting
  // ====================================================================

  function clearHighlights() {
    document.querySelectorAll("mark.tos-guard-mark").forEach((m) => {
      const parent = m.parentNode;
      while (m.firstChild) parent.insertBefore(m.firstChild, m);
      parent.removeChild(m);
      parent.normalize();
    });
  }

  function highlightSnippets(clauses) {
    clearHighlights();
    if (!Array.isArray(clauses) || !clauses.length) return 0;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        const tag = p.tagName;
        if (["SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA"].includes(tag)) return NodeFilter.FILTER_REJECT;
        if (p.closest("mark.tos-guard-mark")) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);

    let hits = 0;
    clauses.forEach((c, idx) => {
      const needle = (c.snippet || "").trim();
      if (needle.length < 12) return;
      const short = needle.length > 180 ? needle.slice(0, 180) : needle;
      for (const node of nodes) {
        const text = node.nodeValue;
        const i = text.toLowerCase().indexOf(short.toLowerCase());
        if (i === -1) continue;
        try {
          const range = document.createRange();
          range.setStart(node, i);
          range.setEnd(node, Math.min(text.length, i + short.length));
          const mark = document.createElement("mark");
          mark.className = `tos-guard-mark tos-guard-${(c.severity || "medium").toLowerCase()}`;
          mark.dataset.tosGuardIdx = String(idx);
          mark.title = c.title_en || c.category || "Risky clause";
          range.surroundContents(mark);
          hits++;
          break;
        } catch (e) { /* range may straddle elements */ }
      }
    });
    return hits;
  }

  function scrollToClause(idx) {
    const el = document.querySelector(`mark.tos-guard-mark[data-tos-guard-idx="${idx}"]`);
    if (!el) return false;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("tos-guard-pulse");
    setTimeout(() => el.classList.remove("tos-guard-pulse"), 1600);
    return true;
  }

  // ====================================================================
  // Auto-detection of legal pages
  // ====================================================================

  // ===== Detection patterns =====

  // Definitive URL — canonical legal-page filenames in multiple languages.
  // A hit here is enough to trigger by itself.
  const DEFINITIVE_URL_RX = /(\/|[?&])(privacy[-_.]?(policy|notice|statement|center)|terms[-_.]?(of[-_.]?(service|use|sale)|and[-_.]?conditions|conditions)|terms[-_.]?&[-_.]?conditions|cookie[-_.]?(policy|notice|consent|statement)|cookies[-_.]?(policy|notice)|end[-_.]?user[-_.]?license[-_.]?(agreement)?|eula|user[-_.]?agreement|acceptable[-_.]?use[-_.]?policy|legal[-_.]?(notice|terms|info|information)|data[-_.]?(processing|protection)[-_.]?(agreement|addendum|policy|notice)?|tos\.|terms\.|privacy\.|impressum|aviso[-_.]?legal|mentions[-_.]?legales|conditions[-_.]?(generales|d[-_.]?utilisation|d[-_.]?usage)|politique[-_.]?de[-_.]?confidentialite|nutzungsbedingungen|datenschutz(erklarung|erklaerung|hinweis|bestimmungen)?|allgemeine[-_.]?geschaftsbedingungen|agb|termini[-_.]?(di[-_.]?(servizio|utilizzo)|condizioni)|condizioni[-_.]?(generali|d[-_.]?uso)|informativa[-_.]?(sulla[-_.]?)?privacy|termos[-_.]?(de[-_.]?(servico|uso|utilizacao))|politica[-_.]?de[-_.]?(privacidade|cookies)|terminos[-_.]?(de[-_.]?(servicio|uso))|politica[-_.]?de[-_.]?(privacidad|cookies)|kullanim[-_.]?kosullari|gizlilik[-_.]?politikasi|riservatezza|disclaimer)([-_./?#]|$)/i;

  // Soft URL — segment that STARTS with a legal keyword. Matches /terms,
  // /tos, /privacy, /terms.html, /privacy-policy/, /policies/privacy, /legal/terms, etc.
  // Combined with body-legalese filter to avoid product-name false positives
  // like /policy-enforcer.
  const SOFT_URL_RX = /(^|\/)(terms|tos|privacy|policy|policies|legal|eula|cookie|cookies|gdpr|ccpa|conditions|agreement|disclaimer|copyright|impressum|datenschutz|agb|confidentialite|mentions|aviso|terminos|condiciones|termini|termos|privacidade|politica|riservatezza|kosullari|gizlilik|kvkk|licence|license)([-_./?#]|[a-z0-9_-]*\.(html?|aspx?|php|jsp)|$)/i;

  // Strong title / heading — multi-word legal phrases (no false positives).
  const TITLE_STRONG_RX = /(terms\s+(of\s+(service|use|sale)|and\s+conditions|&\s*conditions)|conditions\s+of\s+(use|service|sale)|site\s+terms|privacy\s+(policy|notice|statement|center|practices)|data\s+privacy|cookie\s+(policy|notice|statement|consent|preferences)|cookies?\s+settings|end[-\s]user\s+license(?:\s+agreement)?|eula\b|user\s+agreement|subscriber\s+agreement|membership\s+agreement|service\s+agreement|acceptable\s+use\s+policy|legal\s+(notice|terms|information|disclaimer)|data\s+(processing|protection|use|sharing)\s+(policy|notice|agreement|statement)|اتفاقية|الشروط\s+و|سياسة\s*الخصوصية|سياسة\s*الاستخدام|سياسة\s*ملفات\s*تعريف|بيان\s*الخصوصية|شروط\s*الاستخدام|شروط\s*الخدمة|الشروط\s*والأحكام|términos\s+(de\s+(servicio|uso))|política\s+de\s+(privacidad|cookies)|condiciones\s+(generales|de\s+(uso|servicio))|aviso\s+legal|conditions\s+(générales|d[''']utilisation|d[''']usage|générales\s+d[''']utilisation)|politique\s+de\s+(confidentialité|cookies)|mentions\s+légales|nutzungsbedingungen|datenschutz(erklärung|hinweis|bestimmungen)?|impressum|allgemeine\s+geschäftsbedingungen|\bagb\b|termini\s+(di\s+(servizio|utilizzo))|condizioni\s+(generali|d[''']uso)|informativa\s+(sulla\s+)?privacy|termos\s+(de\s+(serviço|uso|utilização))|política\s+de\s+(privacidade|cookies)|利用規約|プライバシー\s*ポリシー|プライバシー(の|について)|個人情報(保護方針|の取り扱い)|服务条款|使用条款|隐私(政策|声明|条款)|条款(及|与)?(细则|条件)|이용약관|개인정보(처리방침|보호정책|취급방침)|условия\s+(использования|обслуживания|пользовательского)|политика\s+конфиденциальности|пользовательское\s+соглашение|kullanım\s+koşulları|gizlilik\s+(politikası|sözleşmesi)|kvkk)/i;

  // Soft title / heading — single-word headings like "Privacy", "Terms", "Cookies".
  const TITLE_SOFT_RX = /(^|[^a-zà-ÿ])(terms|privacy|cookies?|legal|eula|conditions|disclaimer|copyright|policies|policy|impressum|datenschutz|agb|nutzungsbedingungen|gizlilik|confidentialité|mentions|términos|condiciones|aviso|termini|termos|الشروط|الخصوصية|プライバシー|個人情報|利用規約|服务条款|隐私|条款|이용약관|개인정보|условия|политика|kvkk)([^a-zà-ÿ]|$)/i;

  // Multilingual legalese phrases for body density check.
  // Patterns are matched with /g against lowercased body text so we can
  // count TOTAL occurrences (frequency) — a real ToS has hundreds of hits,
  // an article merely mentioning privacy has a handful.
  const LEGALESE_PATTERNS = [
    // English — core legal doc vocabulary
    /\barbitration\b/, /\bclass[-\s]action\b/, /\bgoverning\s+law\b/,
    /\bindemnif/, /\bliabilit/, /\bdata\s+(controller|processor|protection)\b/,
    /\bpersonal\s+(data|information)\b/, /\bthird[-\s]part(y|ies)\b/,
    /\bcookies?\s+(policy|notice|statement|consent)\b/, /\buser\s+content\b/,
    /\btermination\b/, /\bdisclaim/, /\bjurisdiction\b/,
    /\bgdpr\b/, /\bccpa\b/, /\bopt[-\s]?out\b/, /\bsubprocessor/,
    /\bretention\s+period\b/, /\bdata\s+subject/, /\blawful\s+basis\b/,
    /\bcontrolling\s+law\b/, /\bdispute\s+resolution\b/,
    // English — additional ToS/Privacy hallmarks (high signal)
    /\byou\s+agree\b/, /\bwe\s+collect\b/, /\bwe\s+may\s+(use|share|disclose|collect)\b/,
    /\bsole\s+discretion\b/, /\bbinding\s+(arbitration|agreement)\b/,
    /\blimitation\s+of\s+liability\b/, /\bwarrant(y|ies)\s+disclaimer\b/,
    /\bforce\s+majeure\b/, /\bapplicable\s+law\b/, /\bautomatic\s+renew/,
    /\bsubscription\s+(terms|fees|agreement)\b/, /\bcontent\s+license\b/,
    /\bintellectual\s+property\b/, /\bprivacy\s+(policy|notice|statement|practices)\b/,
    /\bterms\s+(of\s+(service|use|sale)|and\s+conditions)\b/,
    /\bdata\s+(collection|processing|sharing|use|retention)\b/,
    /\bwe\s+(do\s+not|don[''']t)\s+(sell|share|rent)\b/,
    /\bpersonally\s+identif/, /\bcookies?\s+and\s+(similar|tracking)\b/,
    /\bdo\s+not\s+track\b/, /\bcalifornia\s+consumer\s+privacy\b/,
    /\beuropean\s+economic\s+area\b/, /\baccount\s+(termination|suspension)\b/,
    /\bmodify\s+(these|the)\s+(terms|agreement)\b/, /\bnotice\s+of\s+(changes|updates)\b/,
    // Spanish / Portuguese
    /\bderechos?\s+del?\s+(usuario|titular)\b/, /\bresponsable\s+del\s+tratamiento\b/,
    /\bdados?\s+pessoais\b/, /\btratamento\s+de\s+dados\b/,
    /\bpolítica\s+de\s+(privacidad|privacidade|cookies)\b/,
    /\btérminos\s+(y\s+condiciones|de\s+(uso|servicio))\b/,
    /\btermos\s+(de\s+(uso|serviço|utilização)|e\s+condições)\b/,
    // French
    /\bdonnées\s+personnelles\b/, /\bresponsable\s+du\s+traitement\b/,
    /\bcondition[s]?\s+générales\b/, /\bpolitique\s+de\s+confidentialité\b/,
    /\bvie\s+privée\b/, /\bmentions\s+légales\b/,
    // German
    /\bpersonenbezogen[er]?\s+daten\b/, /\bverantwortliche/, /\beinwilligung\b/,
    /\bdatenschutz/, /\bnutzungsbedingung/, /\bgeschäftsbedingung/,
    // Arabic
    /البيانات\s+الشخصية/, /شروط\s+الخدمة/, /سياسة\s+الخصوصية/, /ملفات\s+تعريف\s+الارتباط/,
    /شروط\s+الاستخدام/, /الشروط\s+والأحكام/, /حقوق\s+المستخدم/,
    // Italian
    /\bdati\s+personali\b/, /\btitolare\s+del\s+trattamento\b/,
    /\binformativa\s+sulla\s+privacy\b/, /\bcondizioni\s+(generali|d[''']uso)\b/,
    // Russian
    /\bперсональн[ыо][ех]?\s+данных?\b/, /\bобработк[аи]\s+данных\b/,
    /\bпользовательское\s+соглашение\b/, /\bполитика\s+конфиденциальности\b/,
    // Japanese
    /個人情報/, /プライバシー/, /取り扱い/, /利用規約/, /同意します/, /第三者/,
    // Chinese
    /个人(信息|资料)/, /用户协议/, /服务条款/, /隐私(政策|声明)/, /第三方/,
    // Korean
    /개인정보/, /이용약관/, /개인정보\s*처리방침/, /제3자/,
    // Turkish
    /kişisel\s+veri/i, /gizlilik\s+politikası/i, /kullanım\s+koşulları/i
  ];

  // Headings often live in <h1>–<h4>, role="heading" containers, or in divs
  // styled as headings (common SPA pattern — Amazon, Apple, many React sites).
  const HEADING_SELECTOR =
    "h1, h2, h3, h4, " +
    "[role=heading], " +
    "[class*=heading i], [class*=Heading], " +
    "[class*=title i]:not(input):not(button), [class*=Title]:not(input):not(button), " +
    "[class*=page-header], [class*=PageHeader], " +
    "[id*=heading i], [id*=title i]";

  // Pre-globalize for frequency counting. We keep the original /i flag where
  // present, even though body text is lowercased — CJK/Arabic glyphs are
  // unaffected by toLowerCase() and /i is harmless on them.
  // Defensive: if any single pattern fails to recompile, skip it instead of
  // crashing the whole content script (which would silently kill detection).
  const _LEGALESE_GLOBAL = LEGALESE_PATTERNS.map((rx) => {
    try {
      const f = rx.flags.includes("g") ? rx.flags : rx.flags + "g";
      return new RegExp(rx.source, f);
    } catch (e) {
      console.warn("[ToS Guard] bad legalese pattern, skipping:", rx, e);
      return null;
    }
  }).filter(Boolean);

  function readMetaContent(selectors) {
    let out = "";
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach((el) => {
        const v = el.getAttribute("content");
        if (v) out += " " + v;
      });
    }
    return out.trim();
  }

  // Structural markers — these phrases appear in essentially every real ToS,
  // Privacy Policy, or EULA, and almost never elsewhere. A single hit is a
  // very strong indicator we're looking at a legal document.
  const STRUCTURAL_DATE_RX = /\b(last\s+(updated|revised|modified|amended)|effective\s+(as\s+of\s+)?date|effective\s+(on\s+|date:?\s*)|last\s+revision|date\s+of\s+last\s+revision|version\s+\d+(\.\d+)?|published\s+on)\b/i;

  // Consent/acceptance phrasing — classic ToS opener. "By using this Service,
  // you agree...", "By accessing our website, you accept...".
  const CONSENT_PHRASE_RX = /\bby\s+(using|accessing|continuing\s+to\s+use|clicking|registering|signing\s+up|downloading|installing|visiting|browsing|creating\s+an\s+account)\s+(this|our|the|any)\b/i;

  // Numbered-section structure — most ToS docs use "1.", "1.1", "Section 2", etc.
  // We count distinct section anchors at line-starts to avoid catching prose
  // that just happens to contain numbers.
  const NUMBERED_SECTION_RX = /(?:^|\n)\s*(?:section\s+|article\s+|§\s*)?(\d{1,2}|[ivxlc]+)\.\s+[A-Z]/gm;

  // Long-form legal verbs/phrases (English). These are individually weak but
  // collectively prove the page is written in legalese, not prose.
  const LEGAL_VERB_RX = /\b(shall\s+(not\s+)?(be|have|apply)|hereby|hereto|herein|hereunder|hereof|whereas|notwithstanding|provided\s+that|subject\s+to|in\s+accordance\s+with|to\s+the\s+extent\s+permitted|without\s+limitation|including\s+but\s+not\s+limited\s+to)\b/gi;

  function detectLegalPage() {
    if (window.top !== window.self) return { ok: false }; // skip iframes

    // signals: { name: weight }. Final score = sum of weights. Reasons = keys.
    const signals = {};

    // --- 1. URL fast paths ---------------------------------------------
    if (DEFINITIVE_URL_RX.test(location.pathname) || DEFINITIVE_URL_RX.test(location.href)) {
      return {
        ok: true, score: 100,
        reasons: ["url_definitive"],
        phraseHits: 0, totalMatches: 0, sectionCount: 0
      };
    }
    if (SOFT_URL_RX.test(location.pathname)) signals.url_soft = 2;

    // --- 2. <title> ----------------------------------------------------
    const title = (document.title || "").trim();
    if (title) {
      if (TITLE_STRONG_RX.test(title))                          signals.title_strong = 3;
      else if (TITLE_SOFT_RX.test(title) && title.length < 80)  signals.title_soft = 1;
    }

    // --- 3. <meta> tags (description, og:*, twitter:*) -----------------
    // Sites that hide ToS behind opaque URLs (Amazon ?nodeId=, Salesforce
    // Help articles, etc.) almost always set their meta description to the
    // human-readable doc name.
    const metaText = readMetaContent([
      'meta[name="description" i]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[name="twitter:title"]',
      'meta[name="twitter:description"]',
      'meta[itemprop="name"]',
      'meta[itemprop="description"]'
    ]);
    if (metaText) {
      if (TITLE_STRONG_RX.test(metaText))      signals.meta_strong = 2;
      else if (TITLE_SOFT_RX.test(metaText))   signals.meta_soft = 1;
    }

    // --- 4. Headings (h1–h4 + ARIA role + heading-styled divs) --------
    try {
      const headings = document.querySelectorAll(HEADING_SELECTOR);
      const limit = Math.min(headings.length, 200);
      for (let i = 0; i < limit; i++) {
        const h = headings[i];
        const txt = (h.textContent || "").trim();
        if (txt.length < 3 || txt.length > 140) continue;
        if (TITLE_STRONG_RX.test(txt)) {
          signals.heading_strong = 3;
          break;
        }
        if (txt.length <= 40 && TITLE_SOFT_RX.test(txt)) {
          if (!signals.heading_soft && !signals.heading_strong) signals.heading_soft = 2;
        }
      }
    } catch (_) { /* selector unsupported — skip */ }

    // --- 5. Body content: legalese frequency + structural markers -----
    const rawBody = (document.body && document.body.innerText) || "";
    const bodyText = rawBody.slice(0, 80000).toLowerCase();

    // 5a. Multilingual legalese pattern matches (unique + total).
    let phraseHits = 0;
    let totalMatches = 0;
    for (const rx of _LEGALESE_GLOBAL) {
      rx.lastIndex = 0;
      const m = bodyText.match(rx);
      if (m && m.length) { phraseHits++; totalMatches += m.length; }
    }
    if (phraseHits >= 8)      signals.legalese_heavy   = 4;
    else if (phraseHits >= 5) signals.legalese_strong  = 3;
    else if (phraseHits >= 3) signals.legalese_med     = 2;
    else if (phraseHits >= 1) signals.legalese_light   = 1;

    // 5b. Density bonus — frequency-weighted. Real ToS docs have 50–500+
    // total matches; an article mentioning "privacy policy" once has ~5.
    if (totalMatches >= 60 && bodyText.length >= 4000)      signals.density_overwhelming = 4;
    else if (totalMatches >= 30 && bodyText.length >= 2500) signals.density_high         = 3;
    else if (totalMatches >= 15 && bodyText.length >= 1500) signals.density_med          = 2;

    // 5c. "Last updated:" / "Effective date" — almost-exclusive ToS marker.
    if (STRUCTURAL_DATE_RX.test(rawBody.slice(0, 4000))) signals.structural_date = 2;

    // 5d. "By using/accessing this..." consent phrasing — classic opener.
    if (CONSENT_PHRASE_RX.test(rawBody.slice(0, 8000))) signals.consent_phrase = 2;

    // 5e. Numbered-section structure (1., 1.1, Section X). Real ToS docs
    // tend to have 8+ numbered sections; an article never does.
    const sectionMatches = rawBody.slice(0, 60000).match(NUMBERED_SECTION_RX);
    const sectionCount = sectionMatches ? sectionMatches.length : 0;
    if (sectionCount >= 12)     signals.sections_many   = 2;
    else if (sectionCount >= 6) signals.sections_some   = 1;

    // 5f. Legal-verb density (shall, hereby, herein, notwithstanding, etc.).
    // Each on its own is mild; cumulatively they're decisive.
    const legalVerbMatches = bodyText.match(LEGAL_VERB_RX);
    const legalVerbCount = legalVerbMatches ? legalVerbMatches.length : 0;
    if (legalVerbCount >= 8)      signals.legal_verbs_heavy = 3;
    else if (legalVerbCount >= 4) signals.legal_verbs_some  = 2;
    else if (legalVerbCount >= 2) signals.legal_verbs_light = 1;

    // --- 6. Compute final score and decide --------------------------
    const reasons = Object.keys(signals);
    const score = reasons.reduce((acc, k) => acc + signals[k], 0);

    // Any of these single signals is decisive on its own — they only fire
    // on actual legal documents in practice.
    const decisiveAlone =
      signals.title_strong       ||
      signals.heading_strong     ||
      signals.meta_strong        ||
      signals.legalese_heavy     ||
      signals.density_overwhelming ||
      signals.consent_phrase     ||   // "By using this Service, you agree..." only appears in ToS docs
      signals.structural_date    ||   // "Last updated: ..." → almost exclusively legal docs
      signals.url_soft;               // URL has /terms, /privacy, /legal, etc. — high signal

    // Recall-focused triggers — we'd rather show a dismissible banner than
    // miss a ToS the user is sitting on. Order from strongest to broadest:
    //   (a) any decisive single signal alone.
    //   (b) moderate raw content density (25+ total matches).
    //   (c) any two independent signals (low bar — banner is dismissible).
    //   (d) score ≥ 2 (e.g. soft title + light legalese).
    //   (e) numbered legal-section structure.
    //   (f) heavy legal-verb usage.
    const ok =
      !!decisiveAlone ||
      totalMatches >= 25 ||
      reasons.length >= 2 ||
      score >= 2 ||
      sectionCount >= 8 ||
      legalVerbCount >= 5 ||
      phraseHits >= 4;

    return {
      ok, score, reasons,
      phraseHits, totalMatches, sectionCount,
      legalVerbCount,
      decisiveAlone: !!decisiveAlone
    };
  }

  // ====================================================================
  // Banner UI (Shadow DOM, isolated from page CSS)
  // ====================================================================

  const I18N = {
    en: {
      detected_title: "Looks like a legal document",
      detected_sub:   "Want ToS Guard to scan it for predatory clauses?",
      scan: "Scan now",
      dismiss: "Not now",
      scanning_title: "Reading the fine print…",
      scanning_sub:   "ToS Guard is calling Gemini",
      results_title: (s) => `Risk score: ${s} / 100`,
      results_open: "Open extension",
      results_highlight: "Highlight on page",
      results_clear: "Clear highlights",
      error_title: "Couldn't scan",
      error_settings: "Open settings",
      no_clauses: "No predatory clauses found.",
      counts: (h, m, l) => `${h} high · ${m} medium · ${l} low`
    },
    ar: {
      detected_title: "يبدو أن هذه وثيقة قانونية",
      detected_sub:   "هل تريد من ToS Guard فحصها بحثًا عن شروط خبيثة؟",
      scan: "افحص الآن",
      dismiss: "ليس الآن",
      scanning_title: "نقرأ النص الدقيق…",
      scanning_sub:   "ToS Guard يستدعي Gemini",
      results_title: (s) => `درجة الخطر: ${s} / 100`,
      results_open: "افتح الإضافة",
      results_highlight: "تمييز في الصفحة",
      results_clear: "مسح التمييز",
      error_title: "تعذّر الفحص",
      error_settings: "الإعدادات",
      no_clauses: "لم نعثر على شروط خبيثة.",
      counts: (h, m, l) => `${h} عالٍ · ${m} متوسط · ${l} منخفض`
    }
  };

  let bannerHost = null;
  let bannerShadow = null;
  let bannerLang = "en";
  let lastResult = null;
  let soundEnabled = true;

  // Sound is played by the background service worker via the chrome.offscreen
  // API — that's the only way to bypass the host page's autoplay policy in MV3
  // and play immediately, without waiting for a user gesture on the page.
  function playChime() {
    if (!soundEnabled) return;
    try {
      chrome.runtime.sendMessage({ type: "PLAY_CHIME", volume: 1.0 });
    } catch (_) { /* extension context invalidated, ignore */ }
  }

  function tr(key, ...args) {
    const v = I18N[bannerLang][key] ?? I18N.en[key];
    return typeof v === "function" ? v(...args) : v;
  }

  const BANNER_CSS = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: "Inter", "Cairo", "Segoe UI", "Helvetica Neue", Arial, sans-serif; }
    .wrap {
      position: fixed;
      top: 16px;
      inset-inline-end: 16px;
      width: 340px;
      max-width: calc(100vw - 32px);
      background: #ffffff;
      color: #212121;
      border: 1px solid #d9d9dd;
      border-radius: 22px;
      box-shadow: 0 18px 40px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.04);
      overflow: hidden;
      transform: translateY(-12px);
      opacity: 0;
      transition: transform .35s cubic-bezier(.22,1,.36,1), opacity .35s ease;
      z-index: 2147483647;
    }
    .wrap.in { transform: translateY(0); opacity: 1; }
    .wrap.out { transform: translateY(-12px); opacity: 0; }
    :host(.rtl) .wrap { direction: rtl; font-family: "Cairo","Segoe UI","Tahoma",Arial,sans-serif; }

    .head {
      display: flex; align-items: center; gap: 10px;
      padding: 14px 16px 0;
    }
    .icon {
      width: 32px; height: 32px;
      display: grid; place-items: center;
      background: #17171c; color: #fff;
      border-radius: 8px;
    }
    .icon svg { width: 18px; height: 18px; }
    .brand {
      font-size: 11px;
      letter-spacing: 1.6px;
      text-transform: uppercase;
      color: #93939f;
      font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
    }
    :host(.rtl) .brand { letter-spacing: 0; text-transform: none; font-family: "Cairo","Segoe UI",sans-serif; }
    .close {
      margin-inline-start: auto;
      width: 28px; height: 28px;
      border-radius: 999px;
      background: transparent;
      border: 1px solid #d9d9dd;
      color: #75758a;
      cursor: pointer;
      font-size: 16px; line-height: 1;
      display: grid; place-items: center;
      transition: background .15s ease, color .15s ease, border-color .15s ease;
    }
    .close:hover { background: #17171c; color: #fff; border-color: #17171c; }

    .body { padding: 12px 16px 16px; }
    .title {
      font-size: 16px;
      font-weight: 500;
      letter-spacing: -0.32px;
      line-height: 1.3;
      color: #17171c;
      margin: 4px 0 6px;
    }
    .sub {
      font-size: 13.5px;
      color: #212121;
      opacity: 0.75;
      line-height: 1.5;
      margin: 0 0 14px;
    }
    :host(.rtl) .title { letter-spacing: 0; line-height: 1.4; }
    :host(.rtl) .sub { line-height: 1.7; }

    .actions { display: flex; gap: 8px; align-items: center; }
    .cta {
      padding: 10px 18px;
      border-radius: 32px;
      border: 1px solid #17171c;
      background: #17171c;
      color: #fff;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background .15s ease, transform .12s ease;
    }
    .cta:hover { background: #000; }
    .cta:active { transform: translateY(1px); }
    .ghost {
      padding: 10px 14px;
      border-radius: 32px;
      border: 1px solid #d9d9dd;
      background: #fff;
      color: #17171c;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: background .15s ease, border-color .15s ease, color .15s ease;
    }
    .ghost:hover { border-color: #17171c; background: #17171c; color: #fff; }

    /* loader dots */
    .loader { display: inline-flex; gap: 5px; margin: 6px 0 0; }
    .loader span {
      width: 6px; height: 6px; border-radius: 50%;
      background: #17171c;
      opacity: 0.25;
      animation: tg-bounce 1.1s infinite ease-in-out;
    }
    .loader span:nth-child(2) { animation-delay: .15s; }
    .loader span:nth-child(3) { animation-delay: .30s; }
    @keyframes tg-bounce {
      0%, 80%, 100% { transform: scale(0.7); opacity: 0.25; }
      40% { transform: scale(1.0); opacity: 1; }
    }

    /* results */
    .score-row {
      display: flex; align-items: baseline; gap: 8px;
      margin-bottom: 8px;
    }
    .score-num {
      font-size: 30px;
      font-weight: 500;
      letter-spacing: -0.9px;
      line-height: 1;
      color: #17171c;
    }
    .score-of { font-size: 12px; color: #93939f; }
    .badge {
      margin-inline-start: auto;
      padding: 3px 10px;
      border-radius: 32px;
      font-size: 10.5px;
      font-weight: 500;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      font-family: "JetBrains Mono", ui-monospace, Menlo, monospace;
      border: 1px solid #17171c;
      color: #17171c;
    }
    .badge.high   { color: #b30000; border-color: #b30000; }
    .badge.medium { color: #ff7759; border-color: #ff7759; }
    .badge.low    { color: #1863dc; border-color: #1863dc; }
    .badge.good   { color: #003c33; border-color: #003c33; }
    :host(.rtl) .badge { font-family: "Cairo","Segoe UI",sans-serif; letter-spacing: 0; text-transform: none; }

    .counts {
      display: flex; gap: 12px;
      font-size: 12.5px;
      color: #75758a;
      margin-bottom: 12px;
    }
    .counts .pill { display: inline-flex; align-items: center; gap: 6px; }
    .counts .dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
    .dot.high   { background: #b30000; }
    .dot.medium { background: #ff7759; }
    .dot.low    { background: #1863dc; }

    .err { color: #b30000; font-size: 13px; margin-bottom: 12px; line-height: 1.5; }

    /* ---------------------------------------------------------------------
       Popup panel — when the user clicks "Scan now" in the banner, we open
       the EXACT extension popup (popup/popup.html) inside an iframe, docked
       to the top-right corner. No backdrop, no dimming — the rest of the
       page stays fully interactive.

       Layout: a slim 30px host bar sits above the iframe and owns the ×
       close button, so it never collides with the popup's own header
       (settings/lang/brand). Panel is always anchored top-RIGHT regardless
       of UI language (uses 'right', not 'inset-inline-end').
       --------------------------------------------------------------------- */
    .popup-panel {
      position: fixed;
      top: 16px;
      right: 16px;
      /* Match popup body's intrinsic size (popup.css: 400px wide, 520–600px tall) + 30px host bar. */
      width: 400px;
      max-width: calc(100vw - 32px);
      height: 630px;
      max-height: calc(100vh - 32px);
      border-radius: 22px;
      overflow: hidden;
      box-shadow: 0 18px 40px rgba(0,0,0,0.18), 0 2px 10px rgba(0,0,0,0.08);
      background: #fff;
      transform: translateY(-12px) scale(0.98);
      opacity: 0;
      transition: transform .3s cubic-bezier(.22,1,.36,1), opacity .25s ease;
      z-index: 2147483647;
      pointer-events: auto;
      display: flex;
      flex-direction: column;
      /* Force LTR so × is always visually on the right, even when bannerLang=ar. */
      direction: ltr;
    }
    .popup-panel.in { transform: translateY(0) scale(1); opacity: 1; }
    .popup-panel.out { transform: translateY(-12px) scale(0.98); opacity: 0; }

    .popup-bar {
      flex: 0 0 30px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 0 8px;
      background: linear-gradient(180deg, #f7f7f8 0%, #eeeef1 100%);
      border-bottom: 1px solid rgba(0,0,0,0.06);
    }
    .popup-close {
      width: 22px;
      height: 22px;
      border-radius: 999px;
      background: rgba(255,255,255,0.85);
      border: 1px solid #d9d9dd;
      color: #75758a;
      cursor: pointer;
      font-size: 14px;
      line-height: 1;
      display: grid;
      place-items: center;
      padding: 0;
      transition: background .15s ease, color .15s ease, border-color .15s ease, transform .15s ease;
    }
    .popup-close:hover { background: #17171c; color: #fff; border-color: #17171c; transform: scale(1.08); }
    .popup-frame {
      flex: 1 1 auto;
      width: 100%;
      border: 0;
      background: #fff;
      display: block;
    }
  `;

  function ensureBannerHost() {
    if (bannerHost && document.documentElement.contains(bannerHost)) return;
    bannerHost = document.createElement("div");
    bannerHost.id = "tos-guard-banner-host";
    bannerHost.style.cssText = "all: initial; position: fixed; top: 0; right: 0; left: 0; height: 0; z-index: 2147483647; pointer-events: none;";
    bannerHost.dir = "ltr";
    document.documentElement.appendChild(bannerHost);
    bannerShadow = bannerHost.attachShadow({ mode: "closed" });
    const style = document.createElement("style");
    style.textContent = BANNER_CSS;
    bannerShadow.appendChild(style);
  }

  function applyRtl() {
    if (!bannerHost) return;
    bannerHost.classList.toggle("rtl", bannerLang === "ar");
    bannerHost.dir = bannerLang === "ar" ? "rtl" : "ltr";
  }

  function renderBanner(html) {
    ensureBannerHost();
    let wrap = bannerShadow.querySelector(".wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "wrap";
      wrap.style.pointerEvents = "auto";
      bannerShadow.appendChild(wrap);
    }
    wrap.innerHTML = html;
    requestAnimationFrame(() => wrap.classList.add("in"));
    applyRtl();
    return wrap;
  }

  function removeBanner() {
    bannerState = "hidden";
    if (!bannerShadow) return;
    const wrap = bannerShadow.querySelector(".wrap");
    if (wrap) {
      wrap.classList.add("out");
      setTimeout(() => {
        if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
      }, 380);
    }
  }

  // -------------------------------------------------------------------
  // Popup overlay — render the real extension popup inside an iframe.
  // This is what fires when the user clicks "Scan now" in the banner.
  // Because it loads popup/popup.html directly, the UI/UX is byte-for-byte
  // identical to the toolbar popup (same animations, gauge, clause cards).
  // -------------------------------------------------------------------

  let panelEscHandler = null;

  function closePopupOverlay() {
    if (!bannerShadow) return;
    const panel = bannerShadow.querySelector(".popup-panel");
    if (!panel) return;
    panel.classList.remove("in");
    panel.classList.add("out");
    if (panelEscHandler) {
      document.removeEventListener("keydown", panelEscHandler, true);
      panelEscHandler = null;
    }
    setTimeout(() => {
      if (panel.parentNode) panel.parentNode.removeChild(panel);
    }, 280);
    bannerState = "hidden";
  }

  function showPopupOverlay() {
    ensureBannerHost();

    // Tear down the small banner — the docked panel replaces it.
    const existingWrap = bannerShadow.querySelector(".wrap");
    if (existingWrap && existingWrap.parentNode) existingWrap.parentNode.removeChild(existingWrap);
    const existingPanel = bannerShadow.querySelector(".popup-panel");
    if (existingPanel && existingPanel.parentNode) existingPanel.parentNode.removeChild(existingPanel);

    bannerState = "popup-open";
    applyRtl();

    // Build the iframe URL — autoScan tells the popup to start scanning
    // immediately after intro, lang keeps EN/AR consistent with the banner
    // the user just clicked.
    const params = new URLSearchParams({ autoScan: "1", lang: bannerLang });
    const url = chrome.runtime.getURL("popup/popup.html") + "?" + params.toString();

    const panel = document.createElement("div");
    panel.className = "popup-panel";
    panel.innerHTML = `
      <div class="popup-bar">
        <button class="popup-close" data-act="dismiss-overlay" aria-label="Close">×</button>
      </div>
      <iframe class="popup-frame" allow="clipboard-write" src="${url}"></iframe>
    `;
    bannerShadow.appendChild(panel);
    requestAnimationFrame(() => panel.classList.add("in"));

    panel.querySelectorAll("[data-act=dismiss-overlay]").forEach((el) => {
      el.addEventListener("click", (e) => {
        e.preventDefault();
        closePopupOverlay();
      });
    });

    // Esc closes — bound on capture so we win over the host page.
    panelEscHandler = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePopupOverlay();
      }
    };
    document.addEventListener("keydown", panelEscHandler, true);
  }

  function shieldIconSvg() {
    return `<svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" fill="#003c33"/>
      <path d="M9 12l2 2 4-4" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
  }

  function showDetectedBanner() {
    renderBanner(`
      <div class="head">
        <div class="icon">${shieldIconSvg()}</div>
        <div class="brand">ToS Guard</div>
        <button class="close" data-act="dismiss" aria-label="Dismiss">×</button>
      </div>
      <div class="body">
        <div class="title">${tr("detected_title")}</div>
        <div class="sub">${tr("detected_sub")}</div>
        <div class="actions">
          <button class="cta" data-act="scan">${tr("scan")}</button>
          <button class="ghost" data-act="later">${tr("dismiss")}</button>
        </div>
      </div>
    `);
    wireBannerActions();
  }

  function showScanningBanner() {
    renderBanner(`
      <div class="head">
        <div class="icon">${shieldIconSvg()}</div>
        <div class="brand">ToS Guard</div>
        <button class="close" data-act="dismiss" aria-label="Dismiss">×</button>
      </div>
      <div class="body">
        <div class="title">${tr("scanning_title")}</div>
        <div class="sub">${tr("scanning_sub")}</div>
        <div class="loader"><span></span><span></span><span></span></div>
      </div>
    `);
    wireBannerActions();
  }

  function showResultsBanner(result) {
    const score = Math.round(result.risk_score || 0);
    const counts = { high: 0, medium: 0, low: 0 };
    (result.clauses || []).forEach((c) => {
      const s = (c.severity || "medium").toLowerCase();
      if (counts[s] !== undefined) counts[s]++;
    });
    let badgeCls = "good", badgeText = "LOOKS OK";
    if (score >= 70) { badgeCls = "high"; badgeText = "HIGH RISK"; }
    else if (score >= 40) { badgeCls = "medium"; badgeText = "MODERATE"; }
    else if (score >= 15) { badgeCls = "low"; badgeText = "SOME ISSUES"; }

    const hasAny = (result.clauses || []).length > 0;
    renderBanner(`
      <div class="head">
        <div class="icon">${shieldIconSvg()}</div>
        <div class="brand">ToS Guard</div>
        <button class="close" data-act="dismiss" aria-label="Dismiss">×</button>
      </div>
      <div class="body">
        <div class="score-row">
          <div class="score-num">${score}</div>
          <div class="score-of">/ 100</div>
          <div class="badge ${badgeCls}">${badgeText}</div>
        </div>
        ${hasAny ? `
          <div class="counts">
            <span class="pill"><span class="dot high"></span>${counts.high}</span>
            <span class="pill"><span class="dot medium"></span>${counts.medium}</span>
            <span class="pill"><span class="dot low"></span>${counts.low}</span>
          </div>
        ` : `<div class="sub">${tr("no_clauses")}</div>`}
        <div class="actions">
          ${hasAny ? `<button class="cta" data-act="highlight">${tr("results_highlight")}</button>` : ""}
          <button class="ghost" data-act="clear">${tr("results_clear")}</button>
        </div>
      </div>
    `);
    wireBannerActions();
  }

  function showErrorBanner(msg) {
    const needsKey = /NO_API_KEY/i.test(msg);
    renderBanner(`
      <div class="head">
        <div class="icon">${shieldIconSvg()}</div>
        <div class="brand">ToS Guard</div>
        <button class="close" data-act="dismiss" aria-label="Dismiss">×</button>
      </div>
      <div class="body">
        <div class="title">${tr("error_title")}</div>
        <div class="err">${msg.replace(/[<>]/g, "")}</div>
        <div class="actions">
          ${needsKey ? `<button class="cta" data-act="open-settings">${tr("error_settings")}</button>` : ""}
          <button class="ghost" data-act="retry">${tr("scan")}</button>
        </div>
      </div>
    `);
    wireBannerActions();
  }

  function wireBannerActions() {
    if (!bannerShadow) return;
    bannerShadow.querySelectorAll("[data-act]").forEach((el) => {
      el.addEventListener("click", async (e) => {
        e.preventDefault();
        const act = el.dataset.act;
        if (act === "dismiss" || act === "later") {
          // Both routes do a temporary (6h) dismissal so users can't
          // accidentally permanently silence the banner.
          await dismissForOrigin(true);
          removeBanner();
        } else if (act === "scan" || act === "retry") {
          // Hand off to the real popup — same UI/UX as the toolbar action.
          showPopupOverlay();
        } else if (act === "highlight") {
          if (lastResult) highlightSnippets(lastResult.clauses || []);
        } else if (act === "clear") {
          clearHighlights();
          removeBanner();
        } else if (act === "open-settings") {
          chrome.runtime.sendMessage({ type: "OPEN_OPTIONS" });
        }
      });
    });
  }

  async function dismissForOrigin(temporary) {
    const origin = location.origin;
    const key = "dismissedOrigins";
    const data = await chrome.storage.local.get([key]);
    const map = data[key] || {};
    map[origin] = { at: Date.now(), temporary: !!temporary };
    await chrome.storage.local.set({ [key]: map });
  }

  async function isOriginDismissed() {
    const origin = location.origin;
    const { dismissedOrigins } = await chrome.storage.local.get(["dismissedOrigins"]);
    if (!dismissedOrigins) return false;
    const rec = dismissedOrigins[origin];
    if (!rec) return false;
    // Permanent: never re-show. Temporary ("Not now"): re-show after 6 hours.
    if (!rec.temporary) return true;
    return (Date.now() - rec.at) < 6 * 60 * 60 * 1000;
  }

  async function runBannerScan() {
    bannerState = "scanning";
    showScanningBanner();
    try {
      const text = extractText();
      if (!text || text.length < 200) {
        bannerState = "error";
        showErrorBanner(bannerLang === "ar" ? "النص قصير جدًا للتحليل." : "Not enough text on this page to analyze.");
        return;
      }
      const resp = await chrome.runtime.sendMessage({ type: "ANALYZE_TOS", text });
      if (!resp?.ok) {
        let msg = resp?.error || "Unknown error";
        if (msg === "NO_API_KEY") msg = bannerLang === "ar"
          ? "أضف مفتاح Gemini API من الإعدادات."
          : "Add your Gemini API key in settings.";
        bannerState = "error";
        showErrorBanner(msg);
        return;
      }
      lastResult = resp.result;
      bannerState = "results";
      showResultsBanner(resp.result);
      try { highlightSnippets(resp.result.clauses || []); } catch (_) {}
    } catch (e) {
      bannerState = "error";
      showErrorBanner(e?.message || String(e));
    }
  }

  // State tracking — don't re-pop the banner once the user has acted on this URL.
  let bannerState = "hidden"; // hidden | detected | scanning | results | error
  let lastShownForUrl = null;

  async function maybeShowDetectionBanner() {
    try {
      if (["scanning", "results", "popup-open"].includes(bannerState)) {
        console.log("[ToS Guard] skip: bannerState =", bannerState);
        return;
      }
      if (lastShownForUrl === location.href && bannerState !== "hidden") {
        console.log("[ToS Guard] skip: already shown for this URL");
        return;
      }

      const settings = await chrome.storage.local.get(["autoDetect", "lang", "soundEnabled"]);
      const enabled = settings.autoDetect !== false;
      bannerLang = settings.lang === "ar" ? "ar" : "en";
      soundEnabled = settings.soundEnabled !== false; // default ON
      if (!enabled) {
        console.log("[ToS Guard] skip: autoDetect is OFF in settings");
        return;
      }

      let det;
      try {
        det = detectLegalPage();
      } catch (e) {
        console.error("[ToS Guard] detection THREW an error:", e);
        return;
      }
      // Diagnostic — visible in any page's DevTools console so you can tell
      // exactly why detection did or didn't trigger.
      console.log("[ToS Guard] detection", { url: location.href, ...det });

      if (!det.ok) {
        console.log("[ToS Guard] no banner — det.ok is false (signals insufficient)");
        return;
      }
      if (await isOriginDismissed()) {
        console.log("[ToS Guard] origin dismissed — skipping banner");
        return;
      }

      console.log("[ToS Guard] ✓ showing banner for", location.href);
      lastShownForUrl = location.href;
      bannerState = "detected";
      showDetectedBanner();
      playChime();
    } catch (e) {
      console.error("[ToS Guard] maybeShowDetectionBanner crashed:", e);
    }
  }

  // ====================================================================
  // Message bus (popup ↔ content)
  // ====================================================================

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "PING_TOS_GUARD") { sendResponse({ ok: true }); return false; }
    if (msg?.type === "GET_TEXT") {
      const det = detectLegalPage();
      sendResponse({
        ok: true,
        text: extractText(),
        url: location.href,
        title: document.title,
        looksLegal: det.ok,
        detection: det
      });
      return false;
    }
    if (msg?.type === "HIGHLIGHT_CLAUSES") {
      sendResponse({ ok: true, hits: highlightSnippets(msg.clauses || []) });
      return false;
    }
    if (msg?.type === "SCROLL_TO_CLAUSE") {
      sendResponse({ ok: scrollToClause(msg.idx) });
      return false;
    }
    if (msg?.type === "CLEAR_HIGHLIGHTS") {
      clearHighlights();
      sendResponse({ ok: true });
      return false;
    }
    if (msg?.type === "FORCE_DETECT") {
      maybeShowDetectionBanner();
      sendResponse({ ok: true });
      return false;
    }
    if (msg?.type === "FORCE_SCAN") {
      // Manual trigger from context menu — bypass detection + dismissal,
      // jump straight to the popup overlay so the user always has a path.
      lastShownForUrl = location.href;
      showPopupOverlay();
      sendResponse({ ok: true });
      return false;
    }
  });

  // ====================================================================
  // SPA / late-render aware detection loop
  // ====================================================================
  //
  // Many real-world ToS pages either:
  // - Render their content client-side after first paint (React/Vue SPAs).
  // - Have a generic <title> on initial HTML that gets updated post-load.
  // - Navigate without a full page reload (history.pushState).
  //
  // We handle all three by:
  // 1. Running detection on multiple delayed passes after load.
  // 2. Observing <title> and DOM mutations for ~25 seconds.
  // 3. Watching for URL changes and resetting state on navigation.

  let detectAttempts = 0;
  let observer = null;
  let observerStartedAt = 0;
  let observerTimeout = null;
  let lastObservedUrl = location.href;
  // Run the mutation observer for 90 seconds — many real-world ToS docs are
  // gated behind cookie banners, captchas, or load lazily via XHR, and the
  // legalese content only appears 30–60s after first paint.
  const OBSERVER_LIFETIME_MS = 90000;

  function runDetect() {
    detectAttempts++;
    maybeShowDetectionBanner();
  }

  function stopObserver() {
    if (observer) { observer.disconnect(); observer = null; }
    if (observerTimeout) { clearTimeout(observerTimeout); observerTimeout = null; }
  }

  function startObserver() {
    if (observer) return;
    observerStartedAt = Date.now();
    observer = new MutationObserver(() => {
      // URL changed (SPA navigation)?
      if (location.href !== lastObservedUrl) {
        lastObservedUrl = location.href;
        // New page — clear state so we can re-prompt.
        lastShownForUrl = null;
        if (bannerState === "hidden") {
          setTimeout(runDetect, 400);
          setTimeout(runDetect, 1400);
        }
      }
      // Headings or title changed mid-page (common SPA pattern).
      if (bannerState === "hidden") {
        // Debounce — many mutations fire in bursts.
        clearTimeout(observer.__t);
        observer.__t = setTimeout(runDetect, 300);
      }
      // Stop after lifetime expires.
      if (Date.now() - observerStartedAt > OBSERVER_LIFETIME_MS) stopObserver();
    });
    observer.observe(document.documentElement, {
      childList: true, subtree: true,
      characterData: true,
      attributes: false
    });
    observerTimeout = setTimeout(stopObserver, OBSERVER_LIFETIME_MS);
  }

  function scheduleDetect() {
    // Multiple delayed passes so every render strategy gets a chance:
    //  - server-rendered pages catch on the immediate pass.
    //  - React/Vue SPAs catch in the 400–3000ms window after hydration.
    //  - lazy/async content (cookie wall, late-loaded body) catches in the
    //    6–30s window. The 30s pass is the last one before the observer
    //    takes over for the remaining 60s of its lifetime.
    runDetect();                              // immediate (document_idle)
    setTimeout(runDetect, 400);
    setTimeout(runDetect, 1200);
    setTimeout(runDetect, 3000);
    setTimeout(runDetect, 6000);
    setTimeout(runDetect, 10000);
    setTimeout(runDetect, 18000);
    setTimeout(runDetect, 30000);
    startObserver();

    // Re-detect when the user returns to the tab — common case: tab was
    // backgrounded during page load, content rendered in background, user
    // came back and is now staring at the doc with no banner.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible" && bannerState === "hidden") {
        setTimeout(runDetect, 200);
      }
    });
  }

  // Patch history.pushState / replaceState so SPA navigations are noticed even
  // if the MutationObserver doesn't see a DOM change.
  (function patchHistory() {
    const fire = () => {
      const url = location.href;
      if (url !== lastObservedUrl) {
        lastObservedUrl = url;
        lastShownForUrl = null;
        if (bannerState !== "scanning") bannerState = "hidden";
        setTimeout(runDetect, 500);
        setTimeout(runDetect, 1800);
      }
    };
    try {
      const _ps = history.pushState;
      const _rs = history.replaceState;
      history.pushState = function () { const r = _ps.apply(this, arguments); fire(); return r; };
      history.replaceState = function () { const r = _rs.apply(this, arguments); fire(); return r; };
      window.addEventListener("popstate", fire);
      window.addEventListener("hashchange", fire);
    } catch (_) {}
  })();

  if (document.readyState === "complete") scheduleDetect();
  else window.addEventListener("load", scheduleDetect);
})();
