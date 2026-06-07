import { staticFile } from "remotion";

// Injects @font-face rules pointing at the bundled TTFs in /public/fonts.
// Rendered once at the top of the composition.
export const Fonts: React.FC = () => {
  const css = `
    @font-face {
      font-family: "Inter";
      font-weight: 400;
      font-style: normal;
      src: url(${staticFile("fonts/inter-400.ttf")}) format("truetype");
    }
    @font-face {
      font-family: "Inter";
      font-weight: 500;
      font-style: normal;
      src: url(${staticFile("fonts/inter-500.ttf")}) format("truetype");
    }
    @font-face {
      font-family: "Cairo";
      font-weight: 400;
      font-style: normal;
      src: url(${staticFile("fonts/cairo-400.ttf")}) format("truetype");
    }
    @font-face {
      font-family: "Cairo";
      font-weight: 500;
      font-style: normal;
      src: url(${staticFile("fonts/cairo-500.ttf")}) format("truetype");
    }
  `;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
};
