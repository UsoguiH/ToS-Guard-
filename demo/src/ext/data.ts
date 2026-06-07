// The analysis result the popup renders — mirrors the real Gemini output
// shape (see background/background.js RESPONSE_SCHEMA) and matches the
// Netflix Terms screenshots: risk 75, 2 high / 3 medium / 0 low.

export type Severity = "high" | "medium" | "low";

export type Clause = {
  snippet: string;
  category: string;
  severity: Severity;
  title_en: string;
  title_ar: string;
  why_en: string;
  why_ar: string;
};

export type Result = {
  is_legal_document: boolean;
  doc_type: string;
  risk_score: number;
  summary_en: string;
  summary_ar: string;
  clauses: Clause[];
};

export const RESULT: Result = {
  is_legal_document: true,
  doc_type: "Terms of Service",
  risk_score: 75,
  summary_en:
    "This document governs the use of Netflix's brand assets and promotional materials. It contains strict limitations on liability, broad indemnification requirements, unilateral termination rights, and mandates California as the exclusive legal venue.",
  summary_ar:
    "تحكم هذه الوثيقة استخدام علامة نتفليكس وموادها الترويجية. تتضمن قيودًا صارمة على المسؤولية، ومتطلبات تعويض واسعة، وحقوق إنهاء أحادية الجانب، وتفرض كاليفورنيا كمكان قانوني حصري.",
  clauses: [
    {
      severity: "high",
      category: "liability",
      title_en: "Complete Disclaimer of Liability",
      title_ar: "إخلاء كامل من المسؤولية",
      why_en:
        "Netflix accepts no responsibility for any damages you suffer, leaving you with no financial recourse if something goes wrong.",
      why_ar:
        "لا تتحمّل نتفليكس أي مسؤولية عن أي أضرار تتعرّض لها، ممّا يحرمك من أي تعويض مالي إذا حدث خطأ.",
      snippet:
        "In no event shall Netflix be liable for any indirect, incidental, special, consequential or punitive damages arising out of or related to these Terms.",
    },
    {
      severity: "high",
      category: "indemnification",
      title_en: "Broad Indemnification Required",
      title_ar: "تعويض واسع مطلوب",
      why_en:
        "You agree to pay Netflix's legal costs and defend them against third-party claims — a potentially unlimited financial obligation.",
      why_ar:
        "توافق على دفع التكاليف القانونية لنتفليكس والدفاع عنها ضد دعاوى الغير — التزام مالي قد يكون غير محدود.",
      snippet:
        "You agree to indemnify, defend and hold harmless Netflix from any and all claims, damages, and expenses arising from your use of the Netflix Brand Assets.",
    },
    {
      severity: "medium",
      category: "jurisdiction",
      title_en: "Mandatory Out-of-State Venue",
      title_ar: "مكان تقاضٍ إلزامي خارج ولايتك",
      why_en:
        "Any legal disputes must be resolved in Santa Clara County, California, under California law, which can be highly inconvenient and expensive if you are located elsewhere.",
      why_ar:
        "يجب حلّ أي نزاعات قانونية في مقاطعة سانتا كلارا بكاليفورنيا ووفقًا لقانونها، ممّا قد يكون مكلفًا وغير عملي إذا كنت في مكان آخر.",
      snippet:
        "These Terms will be governed and construed in accordance with the laws of the State of California, without regard to conflict of law principles. The venue for any dispute or claim shall be Santa Clara County, California.",
    },
    {
      severity: "medium",
      category: "termination",
      title_en: "Unilateral Termination Rights",
      title_ar: "حقوق إنهاء أحادية الجانب",
      why_en:
        "Netflix can modify or revoke your permission to use its materials at any time, at its sole discretion, with no notice or recourse.",
      why_ar:
        "يمكن لنتفليكس تعديل أو إلغاء إذنك باستخدام موادها في أي وقت، وفق تقديرها وحدها، دون إشعار أو حق اعتراض.",
      snippet:
        "Netflix may modify or terminate Your permission to display the Netflix Brand Assets at any time in its sole discretion.",
    },
    {
      severity: "medium",
      category: "content_license",
      title_en: "Strict Usage Restrictions",
      title_ar: "قيود استخدام صارمة",
      why_en:
        "The license is revocable and narrowly limited to approved promotion only — any other use can be pulled instantly.",
      why_ar:
        "الترخيص قابل للإلغاء ومحصور في الترويج المعتمد فقط — وأي استخدام آخر يمكن سحبه فورًا.",
      snippet:
        "Netflix grants You a worldwide, non-exclusive, non-transferable, non-assignable, royalty-free, revocable license to use the Netflix Materials solely as approved by Netflix.",
    },
  ],
};

// Index of the clause that gets expanded on camera (the jurisdiction one,
// matching the screenshot) and whose snippet is highlighted on the page.
export const FOCUS_CLAUSE = 2;
