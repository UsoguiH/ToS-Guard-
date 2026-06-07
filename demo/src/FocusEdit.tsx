import {
  AbsoluteFill,
  Easing,
  interpolate,
  OffthreadVideo,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { Fonts } from "./Fonts";

// Source: ToS_Demo.mp4 — real screen recording (Arabic UI) of ToS Guard
// scanning TikTok's Terms of Service. 1920×1080, 60fps, ~30.09s.
export const FOCUS_FPS = 60;
export const FOCUS_DURATION = 1805;

const W = 1920;
const H = 1080;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// Keyframed camera. Opens on the FULL screen, then eases in gently. Each
// region is held with a slow continuous push (two slightly different anchors
// per hold = Ken Burns drift), and transitions glide over ~1s with smooth
// ease-in-out. Targets are source-pixel centers; clamping keeps the framing
// inside the frame (no black edges from the transform).
// Stays WIDE for the first ~4s (banner + detection play in full view), then a
// single slow zoom-in as the ToS Guard popup appears, then gentle glides with
// a continuous Ken-Burns push on every hold.
const KF = {
  //    full(intro)   popup (loading)   score        clauses       expand        highlight     pull back
  f:  [0,    230,     330,  775,        835, 965,    1025, 1265,   1320, 1450,   1515, 1715,   1772, 1805],
  z:  [1.0,  1.07,    1.66, 1.76,       1.84,1.90,   1.80, 1.88,   1.92, 1.99,   1.50, 1.60,   1.0,  1.0],
  cx: [960,  960,     1700,1700,        1700,1700,   1700, 1700,   1700, 1700,   560,  585,    960,  960],
  cy: [540,  540,     315, 345,         360, 360,    362,  384,    380,  392,    500,  500,    540,  540],
};

// ---- Arabic captions (lower-third) ----
type Cap = { start: number; end: number; text: string };
const CAPTIONS: Cap[] = [
  { start: 70, end: 230, text: "اكتشف ToS Guard وثيقة قانونية في هذه الصفحة" },
  { start: 250, end: 330, text: "شروط الخدمة الخاصة بمنصّة TikTok" },
  { start: 380, end: 800, text: "يقرأ الإضافة النص القانوني ويحلّله بالذكاء الاصطناعي" },
  { start: 860, end: 1005, text: "درجة الخطورة ٨٥ من ١٠٠ — خطر مرتفع" },
  { start: 1045, end: 1300, text: "تم رصد ٦ شروط عالية الخطورة وشرط متوسّط" },
  { start: 1340, end: 1490, text: "مثال: التنازل عن حقوق الخصوصية والعلانية" },
  { start: 1530, end: 1730, text: "يُبرز الشرط الخطير مباشرةً داخل صفحة الشروط" },
  { start: 1745, end: 1805, text: "ToS Guard — اقرأ ما لا تقرأه أبدًا" },
];

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const cap = CAPTIONS.find((c) => frame >= c.start && frame <= c.end);
  if (!cap) return null;
  const opacity = Math.min(
    interpolate(frame, [cap.start, cap.start + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
    interpolate(frame, [cap.end - 14, cap.end], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
  );
  const y = interpolate(opacity, [0, 1], [22, 0]);

  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 70 }}>
      <div
        dir="rtl"
        style={{
          opacity,
          transform: `translateY(${y}px)`,
          display: "flex",
          alignItems: "center",
          gap: 16,
          background: "rgba(13,13,16,0.82)",
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 18,
          padding: "18px 30px",
          boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
          maxWidth: 1400,
        }}
      >
        {/* shield kicker */}
        <svg viewBox="0 0 24 24" width="30" height="30" style={{ flexShrink: 0 }}>
          <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" fill="#003c33" />
          <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span
          style={{
            fontFamily: '"Cairo", sans-serif',
            fontWeight: 500,
            fontSize: 42,
            color: "#fff",
            lineHeight: 1.3,
            letterSpacing: 0,
          }}
        >
          {cap.text}
        </span>
      </div>
    </AbsoluteFill>
  );
};

export const FocusEdit: React.FC = () => {
  const frame = useCurrentFrame();
  const ease = Easing.bezier(0.42, 0, 0.58, 1); // smooth ease-in-out

  const z = interpolate(frame, KF.f, KF.z, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  let cx = interpolate(frame, KF.f, KF.cx, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
  let cy = interpolate(frame, KF.f, KF.cy, { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });

  const halfW = W / 2 / z;
  const halfH = H / 2 / z;
  cx = clamp(cx, halfW, W - halfW);
  cy = clamp(cy, halfH, H - halfH);

  const tx = W / 2 - cx * z;
  const ty = H / 2 - cy * z;

  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <Fonts />
      <div style={{ position: "absolute", width: W, height: H, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${z})` }}>
        <OffthreadVideo src={staticFile("ToS_Demo.mp4")} style={{ width: W, height: H }} />
      </div>
      <Captions />
    </AbsoluteFill>
  );
};
