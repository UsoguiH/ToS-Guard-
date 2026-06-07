import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background, Stage } from "../components/Stage";
import { C, FONT } from "../theme";

const PILLS = [
  { en: "Your own Gemini key", icon: "🔑" },
  { en: "Stays on your machine", icon: "💻" },
  { en: "No tracking, ever", icon: "🚫" },
];

export const Privacy: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headOpacity = interpolate(frame, [0, 16], [0, 1], {
    extrapolateRight: "clamp",
  });

  // bilingual cards
  const enIn = spring({ frame: frame - 16, fps, config: { damping: 16 } });
  const arIn = spring({ frame: frame - 26, fps, config: { damping: 16 } });

  return (
    <Stage durationInFrames={durationInFrames}>
      <Background />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 44,
        }}
      >
        <div
          style={{
            fontFamily: FONT.display,
            fontWeight: 500,
            fontSize: 64,
            letterSpacing: "-0.03em",
            color: C.nearBlack,
            opacity: headOpacity,
            textAlign: "center",
          }}
        >
          Every clause, in English&nbsp;
          <span style={{ fontFamily: FONT.arabic }}>والعربية</span>.
        </div>

        {/* two cards: EN + AR */}
        <div style={{ display: "flex", gap: 28 }}>
          <div
            style={{
              opacity: enIn,
              transform: `translateY(${interpolate(enIn, [0, 1], [30, 0])}px)`,
              width: 500,
              background: C.canvas,
              border: `1px solid ${C.cardBorder}`,
              borderLeft: `5px solid ${C.coral}`,
              borderRadius: 16,
              padding: "26px 30px",
              boxShadow: "0 14px 36px rgba(7,24,41,0.08)",
            }}
          >
            <div
              style={{
                fontFamily: FONT.display,
                fontWeight: 500,
                fontSize: 28,
                color: C.nearBlack,
                marginBottom: 12,
              }}
            >
              You waive your right to sue
            </div>
            <div
              style={{
                fontFamily: FONT.body,
                fontSize: 20,
                lineHeight: 1.5,
                color: C.slate,
              }}
            >
              Disputes go to private arbitration — no court, no jury, no class
              action.
            </div>
          </div>

          <div
            dir="rtl"
            style={{
              opacity: arIn,
              transform: `translateY(${interpolate(arIn, [0, 1], [30, 0])}px)`,
              width: 500,
              background: C.canvas,
              border: `1px solid ${C.cardBorder}`,
              borderRight: `5px solid ${C.coral}`,
              borderRadius: 16,
              padding: "26px 30px",
              boxShadow: "0 14px 36px rgba(7,24,41,0.08)",
            }}
          >
            <div
              style={{
                fontFamily: FONT.arabic,
                fontWeight: 500,
                fontSize: 28,
                color: C.nearBlack,
                marginBottom: 12,
              }}
            >
              تتنازل عن حقك في المقاضاة
            </div>
            <div
              style={{
                fontFamily: FONT.arabic,
                fontSize: 20,
                lineHeight: 1.7,
                color: C.slate,
              }}
            >
              تُحَل النزاعات عبر تحكيم خاص — بلا محكمة ولا هيئة محلفين ولا دعوى
              جماعية.
            </div>
          </div>
        </div>

        {/* privacy pills */}
        <div style={{ display: "flex", gap: 18 }}>
          {PILLS.map((p, i) => {
            const o = interpolate(
              frame,
              [40 + i * 7, 56 + i * 7],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            return (
              <div
                key={i}
                style={{
                  opacity: o,
                  transform: `translateY(${interpolate(o, [0, 1], [14, 0])}px)`,
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  background: C.deepGreen,
                  color: "#fff",
                  borderRadius: 99,
                  padding: "14px 26px",
                  fontFamily: FONT.body,
                  fontWeight: 500,
                  fontSize: 22,
                }}
              >
                <span style={{ fontSize: 22 }}>{p.icon}</span>
                {p.en}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
