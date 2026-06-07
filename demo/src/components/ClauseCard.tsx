import { C, SEV } from "../theme";

export type Clause = {
  severity: keyof typeof SEV;
  category: string;
  title: string;
  why: string;
};

const SEV_LABEL: Record<keyof typeof SEV, string> = {
  high: "HIGH",
  medium: "MEDIUM",
  low: "LOW",
};

export const ClauseCard: React.FC<{ clause: Clause; width?: number }> = ({
  clause,
  width = 760,
}) => {
  const accent = SEV[clause.severity];
  return (
    <div
      style={{
        width,
        background: C.canvas,
        border: `1px solid ${C.cardBorder}`,
        borderLeft: `5px solid ${accent}`,
        borderRadius: 16,
        padding: "22px 26px",
        boxShadow: "0 10px 30px rgba(7,24,41,0.07)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span
          style={{
            fontFamily: '"Inter", sans-serif',
            fontWeight: 500,
            fontSize: 13,
            letterSpacing: "0.08em",
            color: "#fff",
            background: accent,
            padding: "4px 10px",
            borderRadius: 6,
          }}
        >
          {SEV_LABEL[clause.severity]}
        </span>
        <span
          style={{
            fontFamily: '"Inter", sans-serif',
            fontSize: 14,
            color: C.muted,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          {clause.category}
        </span>
      </div>
      <div
        style={{
          fontFamily: '"Inter", sans-serif',
          fontWeight: 500,
          fontSize: 27,
          color: C.nearBlack,
          letterSpacing: "-0.02em",
        }}
      >
        {clause.title}
      </div>
      <div
        style={{
          fontFamily: '"Inter", sans-serif',
          fontSize: 19,
          lineHeight: 1.5,
          color: C.slate,
        }}
      >
        {clause.why}
      </div>
    </div>
  );
};
