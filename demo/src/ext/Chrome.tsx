// Minimal Chrome browser chrome (tab strip + toolbar) so the page reads as
// a real browser window, like the screenshots.

const ICON = "#9aa0a6";

export const Chrome: React.FC = () => {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
      {/* tab strip */}
      <div style={{ height: 44, background: "#dee1e6", display: "flex", alignItems: "flex-end", paddingLeft: 14 }}>
        <div
          style={{
            display: "flex", alignItems: "center", gap: 10,
            background: "#fff", height: 36, borderRadius: "10px 10px 0 0",
            padding: "0 18px 0 14px", minWidth: 240,
            fontFamily: '"Inter", sans-serif', fontSize: 14, color: "#3c4043",
          }}
        >
          <div style={{ width: 16, height: 16, borderRadius: 3, background: "#e50914", color: "#fff", fontSize: 11, fontWeight: 700, display: "grid", placeItems: "center" }}>N</div>
          Netflix Brand Site — Terms
        </div>
      </div>
      {/* toolbar */}
      <div style={{ height: 48, background: "#fff", borderBottom: "1px solid #e0e0e0", display: "flex", alignItems: "center", gap: 18, padding: "0 18px" }}>
        {/* nav icons */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill={ICON}><path d="M20 11H7.8l5.6-5.6L12 4l-8 8 8 8 1.4-1.4L7.8 13H20z" /></svg>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="#c4c7c5"><path d="M4 11h12.2l-5.6-5.6L12 4l8 8-8 8-1.4-1.4 5.6-5.6H4z" /></svg>
        <svg width="19" height="19" viewBox="0 0 24 24" fill={ICON}><path d="M17.65 6.35A8 8 0 1 0 19.73 14h-2.08A6 6 0 1 1 12 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4z" /></svg>
        {/* address bar */}
        <div style={{ flex: 1, height: 32, background: "#f1f3f4", borderRadius: 16, display: "flex", alignItems: "center", gap: 10, padding: "0 16px", fontFamily: '"Inter", sans-serif', fontSize: 14.5, color: "#3c4043" }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#5f6368"><path d="M12 1 3 5v6c0 5.6 3.8 10.7 9 12 5.2-1.3 9-6.4 9-12V5l-9-4z" /></svg>
          brand.netflix.com/en/terms/
        </div>
        {/* extension area: the ToS Guard toolbar icon, active */}
        <div style={{ width: 30, height: 30, borderRadius: 8, background: "#17171c", display: "grid", placeItems: "center" }}>
          <svg viewBox="0 0 24 24" width="18" height="18">
            <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3z" fill="#003c33" />
            <path d="M9 12l2 2 4-4" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ width: 28, height: 28, borderRadius: 99, background: "#e8a33d", display: "grid", placeItems: "center", color: "#fff", fontSize: 14, fontWeight: 600, fontFamily: '"Inter", sans-serif' }}>a</div>
      </div>
    </div>
  );
};
