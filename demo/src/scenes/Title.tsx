import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background, Stage } from "../components/Stage";
import { Shield } from "../components/Logo";
import { C, FONT } from "../theme";

export const Title: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const pop = spring({ frame, fps, config: { damping: 14, mass: 0.7 } });
  const scanProgress = interpolate(frame, [12, 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const titleY = interpolate(pop, [0, 1], [40, 0]);
  const subOpacity = interpolate(frame, [30, 55], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const arOpacity = interpolate(frame, [45, 70], [0, 1], {
    extrapolateLeft: "clamp",
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
          gap: 4,
        }}
      >
        <div style={{ transform: `scale(${0.6 + pop * 0.4})`, marginBottom: 20 }}>
          <Shield size={150} scan={scanProgress} />
        </div>
        <div
          style={{
            fontFamily: FONT.display,
            fontWeight: 500,
            fontSize: 130,
            letterSpacing: "-0.05em",
            color: C.nearBlack,
            transform: `translateY(${titleY}px)`,
            opacity: pop,
          }}
        >
          ToS&nbsp;Guard
        </div>
        <div
          style={{
            fontFamily: FONT.body,
            fontSize: 38,
            color: C.slate,
            opacity: subOpacity,
            maxWidth: 1100,
            textAlign: "center",
            lineHeight: 1.35,
            marginTop: 8,
          }}
        >
          Read the fine print you were never going to read.
        </div>
        <div
          style={{
            fontFamily: FONT.arabic,
            fontSize: 30,
            color: C.muted,
            opacity: arOpacity,
            direction: "rtl",
            marginTop: 14,
          }}
        >
          كاشف الشروط الخبيثة في اتفاقيات الاستخدام
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
