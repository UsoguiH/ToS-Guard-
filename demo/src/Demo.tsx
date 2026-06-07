import { AbsoluteFill, Sequence } from "remotion";
import { Fonts } from "./Fonts";
import { C } from "./theme";
import { Title } from "./scenes/Title";
import { Problem } from "./scenes/Problem";
import { Detect } from "./scenes/Detect";
import { Score } from "./scenes/Score";
import { Clauses } from "./scenes/Clauses";
import { Privacy } from "./scenes/Privacy";
import { Outro } from "./scenes/Outro";

export const FPS = 30;
const OVERLAP = 14; // crossfade window between scenes

type SceneDef = {
  Comp: React.FC<{ durationInFrames: number }>;
  duration: number;
};

const SCENES: SceneDef[] = [
  { Comp: Title, duration: 100 },
  { Comp: Problem, duration: 135 },
  { Comp: Detect, duration: 165 },
  { Comp: Score, duration: 135 },
  { Comp: Clauses, duration: 165 },
  { Comp: Privacy, duration: 150 },
  { Comp: Outro, duration: 115 },
];

// Place each scene OVERLAP frames before the previous one ends → crossfade.
const PLACED = SCENES.reduce<{ from: number; def: SceneDef }[]>(
  (acc, def, i) => {
    const prev = acc[i - 1];
    const from = prev ? prev.from + prev.def.duration - OVERLAP : 0;
    acc.push({ from, def });
    return acc;
  },
  []
);

export const DEMO_DURATION =
  PLACED[PLACED.length - 1].from + SCENES[SCENES.length - 1].duration;

export const ToSGuardDemo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: C.canvas }}>
      <Fonts />
      {PLACED.map(({ from, def }, i) => {
        const { Comp, duration } = def;
        return (
          <Sequence key={i} from={from} durationInFrames={duration}>
            <Comp durationInFrames={duration} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
