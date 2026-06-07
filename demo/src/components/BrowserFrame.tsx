import { C } from "../theme";

// A simplified Chrome window chrome (toolbar + address bar) wrapping content.
export const BrowserFrame: React.FC<{
  url: string;
  width: number;
  height: number;
  children: React.ReactNode;
}> = ({ url, width, height, children }) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 18,
        overflow: "hidden",
        background: C.canvas,
        boxShadow:
          "0 40px 90px rgba(7,24,41,0.22), 0 8px 24px rgba(7,24,41,0.10)",
        border: `1px solid ${C.borderLight}`,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* toolbar */}
      <div
        style={{
          height: 52,
          background: "#f3f3f4",
          borderBottom: `1px solid ${C.borderLight}`,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "0 18px",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", gap: 9 }}>
          {["#ff5f57", "#febc2e", "#28c840"].map((c) => (
            <div
              key={c}
              style={{ width: 13, height: 13, borderRadius: 99, background: c }}
            />
          ))}
        </div>
        <div
          style={{
            flex: 1,
            height: 30,
            background: "#fff",
            borderRadius: 16,
            border: `1px solid ${C.borderLight}`,
            display: "flex",
            alignItems: "center",
            padding: "0 16px",
            fontFamily: '"Inter", sans-serif',
            fontSize: 15,
            color: C.slate,
            gap: 10,
          }}
        >
          <span style={{ color: C.deepGreen, fontSize: 13 }}>🔒</span>
          {url}
        </div>
        {/* toolbar icon = the extension button */}
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: C.deepGreen,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          🛡
        </div>
      </div>
      {/* viewport */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );
};
