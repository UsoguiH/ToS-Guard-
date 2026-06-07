import { Composition } from "remotion";
import { ToSGuardDemo, DEMO_DURATION, FPS } from "./Demo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="ToSGuardDemo"
      component={ToSGuardDemo}
      durationInFrames={DEMO_DURATION}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
