import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background, Stage } from "../components/Stage";
import { Gauge } from "../components/Gauge";
import { C, FONT, SEV } from "../theme";

const COUNTS: { label: string; n: number; sev: keyof typeof SEV }[] = [
  { label: "High", n: 2, sev: "high" },
  { label: "Medium", n: 2, sev: "medium" },
  { label: "Low", n: 1, sev: "low" },
];

export const Score: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // gauge fills with an eased spring
  const fill = spring({
    frame: frame - 8,
    fps,
    config: { damping: 18, mass: 1.2 },
    durationInFrames: 50,
  });

  const headOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <Stage durationInFrames={durationInFrames}>
      <Background />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 8,
        }}
      >
        <div
          style={{
            fontFamily: FONT.body,
            fontSize: 24,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: C.muted,
            opacity: headOpacity,
            marginBottom: 10,
          }}
        >
          acme-cloud.com &middot; Terms of Service
        </div>

        <Gauge value={78} progress={fill} size={380} />

        <div
          style={{
            fontFamily: FONT.display,
            fontWeight: 500,
            fontSize: 40,
            color: C.coral,
            marginTop: 18,
            opacity: interpolate(frame, [40, 58], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            }),
          }}
        >
          High risk
        </div>

        {/* severity counts */}
        <div style={{ display: "flex", gap: 22, marginTop: 26 }}>
          {COUNTS.map((c, i) => {
            const o = interpolate(
              frame,
              [50 + i * 8, 66 + i * 8],
              [0, 1],
              { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
            );
            const y = interpolate(o, [0, 1], [16, 0]);
            return (
              <div
                key={c.label}
                style={{
                  opacity: o,
                  transform: `translateY(${y}px)`,
                  background: C.canvas,
                  border: `1px solid ${C.cardBorder}`,
                  borderRadius: 16,
                  padding: "16px 28px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  boxShadow: "0 8px 24px rgba(7,24,41,0.06)",
                }}
              >
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 99,
                    background: SEV[c.sev],
                  }}
                />
                <span
                  style={{
                    fontFamily: FONT.display,
                    fontWeight: 500,
                    fontSize: 34,
                    color: C.nearBlack,
                  }}
                >
                  {c.n}
                </span>
                <span
                  style={{
                    fontFamily: FONT.body,
                    fontSize: 22,
                    color: C.slate,
                  }}
                >
                  {c.label}
                </span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
