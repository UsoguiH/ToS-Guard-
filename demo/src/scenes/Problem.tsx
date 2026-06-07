import {
  AbsoluteFill,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { Background, Stage } from "../components/Stage";
import { C, FONT } from "../theme";

const LEGAL_LINES = `By accessing or using the Service you agree to be bound by these Terms and all terms incorporated by reference. We reserve the right, at our sole discretion, to modify or replace these Terms at any time and without prior notice. You grant us a worldwide, non-exclusive, royalty-free, perpetual, irrevocable and fully sublicensable license to use, reproduce, modify, adapt, publish, translate, create derivative works from, distribute and display such content. You waive your right to a trial by jury and to participate in a class action. All disputes shall be resolved exclusively through binding individual arbitration. We may share your personal information with our affiliates, partners, and third-party service providers for any purpose, including marketing. Your subscription will automatically renew at the end of each billing period unless cancelled in writing thirty days in advance. To the maximum extent permitted by law, the Company shall not be liable for any indirect, incidental, special, consequential or punitive damages. You agree to indemnify, defend and hold harmless the Company from any and all claims. We retain your data for as long as we deem necessary. Continued use constitutes acceptance.`
  .repeat(4)
  .split(". ")
  .map((s) => s.trim() + ".");

export const Problem: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();

  const scrollY = interpolate(frame, [0, durationInFrames], [0, -420]);
  const headlineOpacity = interpolate(frame, [18, 42], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const subOpacity = interpolate(frame, [50, 74], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <Stage durationInFrames={durationInFrames}>
      <Background />
      {/* dense legal text wall */}
      <AbsoluteFill style={{ opacity: 0.5 }}>
        <div
          style={{
            transform: `translateY(${scrollY}px)`,
            padding: "60px 140px",
            columnCount: 2,
            columnGap: 80,
            fontFamily: FONT.body,
            fontSize: 21,
            lineHeight: 1.7,
            color: C.muted,
            textAlign: "justify",
          }}
        >
          {LEGAL_LINES.map((line, i) => (
            <p key={i} style={{ margin: "0 0 6px 0" }}>
              {line}
            </p>
          ))}
        </div>
      </AbsoluteFill>
      {/* gradient scrim so headline reads */}
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(circle at center, rgba(255,255,255,0.92) 0%, rgba(255,255,255,0.78) 45%, rgba(255,255,255,0.5) 100%)",
        }}
      />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 18,
        }}
      >
        <div
          style={{
            fontFamily: FONT.display,
            fontWeight: 500,
            fontSize: 92,
            letterSpacing: "-0.04em",
            color: C.nearBlack,
            textAlign: "center",
            lineHeight: 1.05,
            opacity: headlineOpacity,
            maxWidth: 1300,
          }}
        >
          Nobody reads the<br />Terms of Service.
        </div>
        <div
          style={{
            fontFamily: FONT.body,
            fontSize: 36,
            color: C.coral,
            fontWeight: 500,
            opacity: subOpacity,
            textAlign: "center",
          }}
        >
          That&rsquo;s exactly where the traps are hidden.
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
