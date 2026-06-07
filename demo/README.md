# ToS Guard — demo video (Remotion)

The animated demo in the main README is generated here with
[Remotion](https://www.remotion.dev/) — the whole video is React components,
not a screen recording. Colors and fonts are pulled straight from the
extension's `popup.css` so it matches the real product.

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
