import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { C } from "../theme";

// Pale editorial washes in the corners — the same "Cohere" feel as the popup.
export const Background: React.FC<{ tint?: string }> = ({ tint = C.canvas }) => {
  return (
    <AbsoluteFill style={{ background: tint, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 620,
          height: 620,
          borderRadius: "50%",
          background: C.paleBlue,
          top: -220,
          left: -160,
          filter: "blur(8px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 720,
          height: 720,
          borderRadius: "50%",
          background: C.paleGreen,
          bottom: -300,
          right: -220,
          filter: "blur(8px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 360,
          height: 360,
          borderRadius: "50%",
          background: C.softCoral,
          top: "40%",
          right: -120,
          opacity: 0.16,
          filter: "blur(10px)",
        }}
      />
    </AbsoluteFill>
  );
};

// Fades scene content in/out at the edges of its Sequence.
export const Stage: React.FC<{
  durationInFrames: number;
  fade?: number;
  children: React.ReactNode;
}> = ({ durationInFrames, fade = 12, children }) => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, fade, durationInFrames - fade, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  return <AbsoluteFill style={{ opacity }}>{children}</AbsoluteFill>;
};
