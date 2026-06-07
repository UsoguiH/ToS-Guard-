import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background, Stage } from "../components/Stage";
import { BrowserFrame } from "../components/BrowserFrame";
import { Shield } from "../components/Logo";
import { C, FONT } from "../theme";

const FakeToSPage: React.FC = () => (
  <div style={{ padding: "44px 60px", fontFamily: FONT.body }}>
    <div
      style={{
        fontFamily: FONT.display,
        fontWeight: 500,
        fontSize: 40,
        color: C.nearBlack,
        marginBottom: 6,
      }}
    >
      Terms of Service
    </div>
    <div style={{ fontSize: 17, color: C.muted, marginBottom: 30 }}>
      Last updated: January 2026
    </div>
    {[
      "1. Acceptance of Terms",
      "2. License and Content",
      "3. Privacy and Data",
      "4. Dispute Resolution",
      "5. Billing and Renewal",
    ].map((h, i) => (
      <div key={i} style={{ marginBottom: 22 }}>
        <div
          style={{
            fontWeight: 500,
            fontSize: 22,
            color: C.nearBlack,
            marginBottom: 8,
          }}
        >
          {h}
        </div>
        {[0, 1, 2].map((j) => (
          <div
            key={j}
            style={{
              height: 11,
              borderRadius: 6,
              background: C.stone,
              marginBottom: 9,
              width: `${[96, 88, 72][j]}%`,
            }}
          />
        ))}
      </div>
    ))}
  </div>
);

export const Detect: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // banner slides in from the right
  const bannerIn = spring({
    frame: frame - 20,
    fps,
    config: { damping: 16 },
  });
  const bannerX = interpolate(bannerIn, [0, 1], [420, 0]);

  // cursor travels to the button, then a click press around frame 95
  const cursorProgress = interpolate(frame, [55, 92], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const cursorX = interpolate(cursorProgress, [0, 1], [1280, 1390]);
  const cursorY = interpolate(cursorProgress, [0, 1], [820, 320]);
  const clickPulse = interpolate(frame, [92, 98, 106], [0, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // after click: scanning overlay
  const scanning = frame > 100;
  const scanOpacity = interpolate(frame, [100, 112], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const spin = (frame * 8) % 360;
  const bannerOut = interpolate(frame, [100, 110], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const W = 1280;
  const H = 760;

  return (
    <Stage durationInFrames={durationInFrames}>
      <Background />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ position: "relative" }}>
          <BrowserFrame
            url="acme-cloud.com/legal/terms"
            width={W}
            height={H}
          >
            <FakeToSPage />

            {/* detection banner */}
            <div
              style={{
                position: "absolute",
                top: 24,
                right: 24,
                width: 360,
                transform: `translateX(${bannerX}px)`,
                opacity: bannerOut,
                background: C.canvas,
                borderRadius: 18,
                border: `1px solid ${C.borderLight}`,
                boxShadow: "0 24px 60px rgba(7,24,41,0.18)",
                padding: 22,
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Shield size={40} scan={1} />
                <div
                  style={{
                    fontFamily: FONT.display,
                    fontWeight: 500,
                    fontSize: 20,
                    color: C.nearBlack,
                  }}
                >
                  ToS Guard
                </div>
              </div>
              <div
                style={{
                  fontFamily: FONT.body,
                  fontSize: 17,
                  color: C.slate,
                  lineHeight: 1.4,
                }}
              >
                This looks like a legal page. Want to scan it for risky clauses?
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    background: C.nearBlack,
                    color: "#fff",
                    fontFamily: FONT.body,
                    fontWeight: 500,
                    fontSize: 17,
                    padding: "11px 0",
                    borderRadius: 12,
                    transform: `scale(${1 - clickPulse * 0.05})`,
                  }}
                >
                  Scan now
                </div>
                <div
                  style={{
                    padding: "11px 18px",
                    borderRadius: 12,
                    border: `1px solid ${C.borderLight}`,
                    color: C.muted,
                    fontFamily: FONT.body,
                    fontSize: 17,
                  }}
                >
                  Dismiss
                </div>
              </div>
            </div>

            {/* scanning overlay */}
            {scanning && (
              <AbsoluteFill
                style={{
                  background: "rgba(255,255,255,0.86)",
                  opacity: scanOpacity,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "column",
                  gap: 24,
                }}
              >
                <svg width="76" height="76" viewBox="0 0 50 50">
                  <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke={C.stone}
                    strokeWidth="5"
                  />
                  <circle
                    cx="25"
                    cy="25"
                    r="20"
                    fill="none"
                    stroke={C.deepGreen}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray="90 130"
                    transform={`rotate(${spin} 25 25)`}
                  />
                </svg>
                <div
                  style={{
                    fontFamily: FONT.display,
                    fontSize: 30,
                    fontWeight: 500,
                    color: C.nearBlack,
                  }}
                >
                  Analyzing with Gemini&hellip;
                </div>
              </AbsoluteFill>
            )}
          </BrowserFrame>

          {/* cursor */}
          <div
            style={{
              position: "absolute",
              left: cursorX,
              top: cursorY,
              transform: `scale(${1 - clickPulse * 0.2})`,
              pointerEvents: "none",
              filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))",
            }}
          >
            <svg width="34" height="34" viewBox="0 0 24 24">
              <path
                d="M4 2 L4 20 L9 15 L12 22 L15 21 L12 14 L19 14 Z"
                fill="#fff"
                stroke={C.nearBlack}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
