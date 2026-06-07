import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";

// Scope the real popup.css so its `html, body` sizing and fixed-position
// orbs apply to a <div class="tg-popup"> wrapper instead of the whole
// Remotion document. Everything else (class selectors) is untouched, so
// the design stays byte-for-byte identical to the shipped extension.
function scopePopupCss(css: string): string {
  let out = css
    .replace("html, body {", ".tg-popup {")
    .split("body.rtl").join(".tg-popup.rtl")
    .replace("position: fixed;", "position: absolute;");
  // Let the popup grow to fit its content for the video (the real popup
  // scrolls inside a fixed 400×600 frame; here we show everything).
  out += `
    .tg-popup {
      max-height: none !important;
      min-height: 0 !important;
      height: auto !important;
      overflow: hidden !important;
    }
    .tg-popup main {
      max-height: none !important;
      overflow: visible !important;
    }
  `;
  return out;
}

/**
 * Loads the extension's real popup.css + content.css and injects them.
 * Returns true once both are in the document so callers can gate render.
 */
export const ExtStyles: React.FC = () => {
  const [handle] = useState(() => delayRender("load-extension-css"));
  const [css, setCss] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(staticFile("css/popup.css")).then((r) => r.text()),
      fetch(staticFile("css/content.css")).then((r) => r.text()),
    ])
      .then(([popup, content]) => {
        setCss(scopePopupCss(popup) + "\n" + content);
        continueRender(handle);
      })
      .catch(() => continueRender(handle));
  }, [handle]);

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};
