import { C } from "../theme";

// Animated radial risk gauge, 0-100. `progress` is 0..1 of the reveal,
// `value` is the final score.
export const Gauge: React.FC<{ value: number; progress: number; size?: number }> = ({
  value,
  progress,
  size = 340,
}) => {
  const stroke = 26;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // 270° arc, starting at 135°
  const startAngle = 135;
  const sweep = 270;
  const circumference = 2 * Math.PI * r;
  const arcLen = (sweep / 360) * circumference;
  const shown = (value / 100) * progress;

  // color shifts green → amber → coral as score climbs
  const arcColor =
    value >= 66 ? C.coral : value >= 33 ? "#e0a000" : C.deepGreen;

  const displayed = Math.round(value * progress);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        {/* track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={C.stone}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circumference}`}
          transform={`rotate(${startAngle} ${cx} ${cy})`}
        />
        {/* value arc */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={arcColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${shown * arcLen} ${circumference}`}
          transform={`rotate(${startAngle} ${cx} ${cy})`}
        />
      </svg>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            fontFamily: '"Inter", sans-serif',
            fontWeight: 500,
            fontSize: 110,
            lineHeight: 1,
            color: C.nearBlack,
            letterSpacing: "-0.04em",
          }}
        >
          {displayed}
        </div>
        <div
          style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: 22,
            color: C.muted,
            marginTop: 8,
            letterSpacing: "0.02em",
          }}
        >
          / 100 risk
        </div>
      </div>
    </div>
  );
};
