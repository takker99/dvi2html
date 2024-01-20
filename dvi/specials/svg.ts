import { SpecialPlugin } from "../mod.ts";

export interface SVG {
  type: "svg";
  svg: string;
  left: number;
  top: number;
}

export const svg: () => SpecialPlugin<SVG> = () => {
  let svgText = "";

  return (command, next) => {
    const data = new TextDecoder().decode(command.data);
    if (!data.startsWith("dvisvgm:raw ")) return;
    svgText += data.slice(12);

    if (next?.type === "special") {
      const nextData = new TextDecoder().decode(next.data);
      if (
        command.horizontal === next.horizontal &&
        command.vertical === next.vertical &&
        nextData.startsWith("dvisvgm:raw ")
      ) return null;
    }
    const svg = svgText.replaceAll("{?nl}", "\n");
    svgText = "";
    return {
      type: "svg",
      svg,
      left: command.horizontal,
      top: command.vertical,
    };
  };
};
