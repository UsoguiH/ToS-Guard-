import { C } from "../theme";

// ToS Guard mark: a shield with a scan line. Pure SVG so it scales crisply.
export const Shield: React.FC<{ size?: number; scan?: number }> = ({
  size = 120,
  scan = 1,
}) => {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="shieldFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={C.deepGreen} />
          <stop offset="1" stopColor={C.navy} />
        </linearGradient>
        <clipPath id="shieldClip">
          <path d="M50 6 L86 20 V48 C86 70 70 86 50 94 C30 86 14 70 14 48 V20 Z" />
        </clipPath>
      </defs>
      <path
        d="M50 6 L86 20 V48 C86 70 70 86 50 94 C30 86 14 70 14 48 V20 Z"
        fill="url(#shieldFill)"
      />
      {/* scan line sweeping down the shield */}
      <g clipPath="url(#shieldClip)">
        <rect
          x="14"
          y={14 + scan * 68}
          width="72"
          height="3"
          fill={C.coral}
          opacity={0.9}
        />
        <rect
          x="14"
          y={14 + scan * 68}
          width="72"
          height="26"
          fill={C.coral}
          opacity={0.12}
          transform="translate(0,-26)"
        />
      </g>
      {/* check mark */}
      <path
        d="M37 50 L46 60 L65 38"
        stroke="#fff"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
};
