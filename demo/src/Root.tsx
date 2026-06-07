import { Composition } from "remotion";
import { ToSGuardDemo, DEMO_DURATION, FPS } from "./Demo";
import { ToSGuardExtensionDemo, EXT_DURATION, EXT_FPS } from "./ExtensionDemo";
import { FocusEdit, FOCUS_DURATION, FOCUS_FPS } from "./FocusEdit";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ToSGuardDemo"
        component={ToSGuardDemo}
        durationInFrames={DEMO_DURATION}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ToSGuardExtensionDemo"
        component={ToSGuardExtensionDemo}
        durationInFrames={EXT_DURATION}
        fps={EXT_FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="ToSFocusEdit"
        component={FocusEdit}
        durationInFrames={FOCUS_DURATION}
        fps={FOCUS_FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
