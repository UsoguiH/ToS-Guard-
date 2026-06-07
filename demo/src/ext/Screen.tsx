import { Chrome } from "./Chrome";
import { NetflixPage } from "./NetflixPage";
import { Popup, ResultsAnim } from "./Popup";
import { Result } from "./data";

// Native popup anchor on the 1920×1080 "screen".
export const POPUP_LEFT = 1498;
export const POPUP_TOP = 76;
export const POPUP_W = 400;

const Cursor: React.FC<{ x: number; y: number; click: number }> = ({ x, y, click }) => (
  <div style={{ position: "absolute", left: x, top: y, transform: `scale(${1 - click * 0.18})`, transformOrigin: "0 0", filter: "drop-shadow(0 2px 3px rgba(0,0,0,0.4))", zIndex: 50, pointerEvents: "none" }}>
    {click > 0 && (
      <div style={{ position: "absolute", left: 2, top: 2, width: 26, height: 26, borderRadius: 99, border: "2px solid rgba(23,23,28,0.5)", transform: `translate(-50%,-50%) scale(${click * 1.6})`, opacity: 1 - click }} />
    )}
    <svg width="26" height="26" viewBox="0 0 24 24">
      <path d="M4 2 L4 20 L9 15 L12 22 L15 21 L12 14 L19 14 Z" fill="#fff" stroke="#17171c" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  </div>
);

export const Screen: React.FC<{
  view: "idle" | "loading" | "results";
  lang: "en" | "ar";
  result: Result;
  loader?: { laserY: number; phaseIndex: number; phaseFade: number };
  anim?: ResultsAnim;
  scanBtnScale?: number;
  highlightOn: boolean;
  pulse: number;
  cursor: { x: number; y: number; click: number };
  popupFlip?: number;
}> = ({ view, lang, result, loader, anim, scanBtnScale, highlightOn, pulse, cursor, popupFlip = 1 }) => {
  return (
    <div style={{ position: "absolute", width: 1920, height: 1080, background: "#0d0d0d", overflow: "hidden" }}>
      {/* page content under the chrome */}
      <div style={{ position: "absolute", top: 92, left: 0, right: 0, bottom: 0 }}>
        <NetflixPage highlightOn={highlightOn} pulse={pulse} />
      </div>

      <Chrome />

      {/* the extension popup, docked top-right like the real in-page overlay */}
      <div
        style={{
          position: "absolute",
          left: POPUP_LEFT,
          top: POPUP_TOP,
          width: POPUP_W,
          borderRadius: 22,
          overflow: "hidden",
          boxShadow: "0 30px 80px rgba(0,0,0,0.45), 0 6px 20px rgba(0,0,0,0.3)",
          border: "1px solid rgba(0,0,0,0.06)",
          transform: `scaleX(${popupFlip})`,
          transformOrigin: "center center",
        }}
      >
        <Popup view={view} lang={lang} result={result} loader={loader} anim={anim} scanBtnScale={scanBtnScale} />
      </div>

      <Cursor x={cursor.x} y={cursor.y} click={cursor.click} />
    </div>
  );
};
