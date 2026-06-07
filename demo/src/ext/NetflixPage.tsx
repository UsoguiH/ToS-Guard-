// The page behind the popup — Netflix brand Terms, dark theme, matching the
// screenshots. The California governing-law sentence is wrapped in a
// <mark> that lights up (with the real content.css classes) on the
// "Highlight on page" beat.

const HEAD: React.CSSProperties = {
  color: "#fff",
  fontSize: 26,
  fontWeight: 700,
  margin: "44px 0 18px",
  fontFamily: '"Inter", sans-serif',
};
const P: React.CSSProperties = {
  color: "#d4d4d4",
  fontSize: 19,
  lineHeight: 1.75,
  margin: "0 0 22px",
  fontFamily: '"Inter", sans-serif',
  maxWidth: 1180,
};

export const NetflixPage: React.FC<{ highlightOn: boolean; pulse: number }> = ({
  highlightOn,
  pulse,
}) => {
  const markClass = "tos-guard-mark" + (highlightOn ? " tos-guard-medium" : "");
  const markStyle: React.CSSProperties = highlightOn
    ? { boxShadow: `0 0 0 ${pulse * 10}px rgba(255,119,89,${0.35 * (1 - pulse)}), inset 0 -2px 0 0 rgba(255,119,89,0.9)` }
    : {};

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "#0d0d0d",
        padding: "40px 70px",
        overflow: "hidden",
      }}
    >
      <div style={HEAD}>Netflix's Rights</div>
      <p style={P}>
        Netflix will interpret Your compliance with these Terms in its sole
        discretion. Netflix may modify or terminate Your permission to display
        the Netflix Brand Assets at any time. Netflix may take action against any
        use of the Netflix Brand Assets that does not comply with these terms,
        infringes any Netflix owned or licensed intellectual property or other
        right, or violates applicable law.
      </p>

      <div style={HEAD}>General Provisions</div>
      <p style={P}>
        You may not assign Your rights or delegate Your obligations under these
        Terms without Netflix's prior written consent. These Terms do not confer
        any rights in any third party.{" "}
        <mark className={markClass} style={markStyle}>
          These Terms will be governed and construed in accordance with the laws
          of the State of California, without regard to conflict of law
          principles. The venue for any dispute or claim shall be Santa Clara
          County, California.
        </mark>{" "}
        Neither party shall be deemed to be an employee, agent, partner, or legal
        representative of the other. Netflix's waiver of breach of any provision
        of these Terms shall not be deemed a waiver of the Terms themselves.
      </p>

      <div style={HEAD}>Netflix Materials License Agreement</div>
      <p style={P}>
        By downloading or otherwise receiving from Netflix the Netflix artwork,
        images, graphics, photographs, clips, video, audio, text, title art, or
        other content available on the Netflix Brand Site, you agree to be bound
        by the following terms and conditions. Netflix, Inc. and its affiliates
        hereby grant to You a worldwide, non-exclusive, non-transferable,
        non-assignable, royalty-free, revocable license to use the Netflix
        Materials solely as approved by Netflix for the promotion of Netflix or
        its programming.
      </p>
    </div>
  );
};
