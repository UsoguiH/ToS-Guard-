# ToS Guard — demo videos (Remotion)

The demos in the main README are produced here with
[Remotion](https://www.remotion.dev/). There are three compositions:

- **`ToSGuardDemo`** (`src/Demo.tsx`) — the animated overview montage
  (`assets/demo.mp4` / `demo.gif`). Pure React, not a screen recording.
- **`ToSFocusEdit`** (`src/FocusEdit.tsx`) — the **live walkthrough**
  (`assets/demo-live.mp4`): a real screen recording with a keyframed focus
  camera (smooth zoom-in/Ken-Burns) and Arabic lower-third captions.
  It reads the recording from `public/ToS_Demo.mp4` (kept out of git — drop
  your own recording there and adjust the keyframe table in `FocusEdit.tsx`).
- **`ToSGuardExtensionDemo`** (`src/ExtensionDemo.tsx`) — a fully synthetic
  re-creation of the popup using the extension's real `popup.css`/`content.css`.

Colors and fonts are pulled straight from the extension's `popup.css` so the
synthetic visuals match the real product.

## Regenerate the video

```bash
cd demo
npm install
npm run render        # → ../assets/demo.mp4
```

Then rebuild the inline GIF + poster used in the README (needs ffmpeg):

```bash
# from the repo root
ffmpeg -y -i assets/demo.mp4 -vf "fps=12,scale=920:-1:flags=lanczos,palettegen=stats_mode=diff" assets/_palette.png
ffmpeg -y -i assets/demo.mp4 -i assets/_palette.png -lavfi "fps=12,scale=920:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=3" assets/demo.gif
ffmpeg -y -i assets/demo.mp4 -vf "select='eq(n\,445)'" -vframes 1 assets/demo-poster.png
```

## Edit it live

```bash
npm run dev           # opens Remotion Studio at http://localhost:3000
```

## Structure

```
src/
  Demo.tsx            Composition — sequences every scene with crossfades
  Root.tsx            Registers the composition (1920×1080, 30fps)
  theme.ts            Color + font tokens (mirror of popup.css)
  components/         Shield logo, browser frame, risk gauge, clause card
  scenes/             Title · Problem · Detect · Score · Clauses · Privacy · Outro
public/fonts/         Inter + Cairo (copied from /lib/fonts)
```
