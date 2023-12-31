import { SpecialPlugin } from "../mod.ts";

export interface Papersize {
  type: "papersize";
  width: number;
  height: number;
}

export const papersize: SpecialPlugin<Papersize> = (command) => {
  const data = new TextDecoder().decode(command.data);
  if (!data.startsWith("papersize=")) return;
  const [width, height] = data.slice(10).split(",");
  if (width === undefined || height === undefined) {
    throw Error("Papersize special requires two arguments.");
  }

  if (!width.endsWith("pt")) {
    throw Error("Papersize special width must be in points.");
  }
  if (!height.endsWith("pt")) {
    throw Error("Papersize special height must be in points.");
  }
  return {
    type: "papersize",
    width: parseFloat(width.slice(0, -2)),
    height: parseFloat(height.slice(0, -2)),
  };
};
