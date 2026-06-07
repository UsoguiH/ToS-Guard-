import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
} from "remotion";
import { ExtStyles } from "./ext/useExtCss";
import { Fonts } from "./Fonts";
import { Screen } from "./ext/Screen";
import { RESULT, FOCUS_CLAUSE } from "./ext/data";

export const EXT_FPS = 30;
export const EXT_DURATION = 880;

const W = 1920;
const H = 1080;

const lin = (f: number, fs: number[], vs: number[], easing?: (n: number) => number) =>
  interpolate(f, fs, vs, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

// triangle wave 0→1→0 over [0,1]
const tri = (t: number) => (t < 0.5 ? t * 2 : 2 - t * 2);

export const ToSGuardExtensionDemo: React.FC = () => {
  const frame = useCurrentFrame();

  // ---- View state ----
  const view: "idle" | "loading" | "results" =
    frame < 130 ? "idle" : frame < 255 ? "loading" : "results";

  const lang: "en" | "ar" = frame >= 729 ? "ar" : "en";

  // ---- Camera ----
  const camF = [0, 45, 80, 255, 285, 440, 495, 552, 595, 690, 720, EXT_DURATION];
  const ease = Easing.inOut(Easing.cubic);
  const scale = lin(frame, camF, [1, 1, 1.5, 1.5, 1.22, 1.22, 1.22, 1.22, 1.0, 1.0, 1.4, 1.4], ease);
  const fx = lin(frame, camF, [960, 960, 1698, 1698, 1698, 1698, 1698, 1698, 960, 960, 1698, 1698], ease);
  const fy = lin(frame, camF, [540, 540, 330, 330, 430, 430, 600, 600, 520, 520, 330, 330], ease);
  const tx = W / 2 - fx * scale;
  const ty = H / 2 - fy * scale;

  // ---- Loader ----
  const tLoad = frame - 130;
  const laserY = tri(((tLoad % 36) / 36));
  const phaseIndex = Math.min(3, Math.floor(tLoad / 60)) % 4;
  const sincePhase = tLoad % 60;
  const phaseFade = Math.min(
    lin(sincePhase, [0, 8], [0.3, 1]),
    lin(sincePhase, [50, 60], [1, 0.3])
  );

  // ---- Results animations ----
  const gaugeProgress = lin(frame, [258, 332], [0, 1], Easing.out(Easing.exp));
  const countsProgress = lin(frame, [292, 334], [0, 1], Easing.out(Easing.cubic));
  const badgePop = lin(frame, [266, 302], [0, 1], Easing.out(Easing.back(2)));
  const dotPulseHigh = 1 + 0.225 * (1 + Math.sin((2 * Math.PI * frame) / 25.5));
  const dotPulseMed = 1 + 0.15 * (1 + Math.sin((2 * Math.PI * frame) / 31.5));
  const cardIn = (i: number) =>
    lin(frame, [296 + i * 10, 326 + i * 10], [0, 1], Easing.out(Easing.cubic));

  const expandedIdx = frame >= 462 ? FOCUS_CLAUSE : null;
  const expandProgress = lin(frame, [462, 498], [0, 1], Easing.out(Easing.cubic));

  const anim = {
    gaugeProgress,
    countsProgress,
    badgePop,
    cardIn,
    dotPulseHigh,
    dotPulseMed,
    expandedIdx,
    expandProgress,
  };

  // ---- Highlight on page ----
  const highlightOn = frame >= 595;
  const pulse = lin(frame, [595, 645], [0, 1]);

  // ---- Scan button click feedback ----
  const scanClick = lin(frame, [122, 126, 132], [0, 1, 0]);
  const scanBtnScale = 1 - scanClick * 0.05;

  // ---- Cursor ----
  const cF = [0, 90, 122, 160, 430, 460, 510, 545, 690, 716, EXT_DURATION];
  const cX = [1300, 1300, 1700, 1480, 1480, 1648, 1648, 1788, 1788, 1778, 1778];
  const cY = [840, 840, 486, 800, 800, 752, 752, 528, 528, 110, 110];
  const curX = lin(frame, cF, cX, Easing.inOut(Easing.cubic));
  const curY = lin(frame, cF, cY, Easing.inOut(Easing.cubic));
  const click = Math.max(
    lin(frame, [122, 126, 132], [0, 1, 0]),
    lin(frame, [460, 464, 470], [0, 1, 0]),
    lin(frame, [545, 549, 555], [0, 1, 0]),
    lin(frame, [716, 720, 726], [0, 1, 0])
  );

  // ---- Popup language flip ----
  const popupFlip =
    frame < 720 ? 1 : frame < 729 ? lin(frame, [720, 729], [1, 0]) : lin(frame, [729, 739], [0, 1]);

  // ---- Global end fade ----
  const fadeOut = lin(frame, [864, EXT_DURATION], [1, 0]);

  return (
    <AbsoluteFill style={{ background: "#0d0d0d", overflow: "hidden", opacity: fadeOut }}>
      <Fonts />
      <ExtStyles />
      <div style={{ position: "absolute", width: W, height: H, transformOrigin: "0 0", transform: `translate(${tx}px, ${ty}px) scale(${scale})` }}>
        <Screen
          view={view}
          lang={lang}
          result={RESULT}
          loader={{ laserY, phaseIndex, phaseFade }}
          anim={anim}
          scanBtnScale={scanBtnScale}
          highlightOn={highlightOn}
          pulse={pulse}
          cursor={{ x: curX, y: curY, click }}
          popupFlip={popupFlip}
        />
      </div>
    </AbsoluteFill>
  );
};
