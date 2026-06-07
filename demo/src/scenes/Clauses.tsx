import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { Background, Stage } from "../components/Stage";
import { ClauseCard, Clause } from "../components/ClauseCard";
import { C, FONT } from "../theme";

const CLAUSES: Clause[] = [
  {
    severity: "high",
    category: "Arbitration",
    title: "You waive your right to sue",
    why: "Disputes go to private arbitration you can't opt out of — no court, no jury, no class action.",
  },
  {
    severity: "high",
    category: "Content license",
    title: "A perpetual license to everything you post",
    why: "They claim a worldwide, irrevocable, sublicensable right to use and modify your content forever.",
  },
  {
    severity: "medium",
    category: "Data sharing",
    title: "Your data shared with “partners”",
    why: "Personal information can be shared with unnamed affiliates and advertisers for marketing.",
  },
  {
    severity: "medium",
    category: "Billing",
    title: "Auto-renews, hard to cancel",
    why: "Subscriptions renew silently and cancellation must be requested in writing 30 days ahead.",
  },
];

export const Clauses: React.FC<{ durationInFrames: number }> = ({
  durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headOpacity = interpolate(frame, [0, 16], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <Stage durationInFrames={durationInFrames}>
      <Background />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "flex-start",
          flexDirection: "column",
          paddingTop: 90,
        }}
      >
        <div
          style={{
            fontFamily: FONT.display,
            fontWeight: 500,
            fontSize: 58,
            letterSpacing: "-0.03em",
            color: C.nearBlack,
            opacity: headOpacity,
            marginBottom: 6,
          }}
        >
          Here&rsquo;s what they buried.
        </div>
        <div
          style={{
            fontFamily: FONT.body,
            fontSize: 26,
            color: C.slate,
            opacity: headOpacity,
            marginBottom: 40,
          }}
        >
          Every flagged clause, in plain language.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {CLAUSES.map((clause, i) => {
            const start = 18 + i * 16;
            const enter = spring({
              frame: frame - start,
              fps,
              config: { damping: 16, mass: 0.8 },
            });
            const x = interpolate(enter, [0, 1], [80, 0]);
            return (
              <div
                key={i}
                style={{
                  opacity: enter,
                  transform: `translateX(${x}px)`,
                }}
              >
                <ClauseCard clause={clause} width={920} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};
