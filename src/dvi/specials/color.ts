import { SpecialPlugin } from "../mod.ts";

export type TexColor = "black" | "white" | `#${string}`;

export interface Color {
  type: "color";
  color: TexColor;
}

export const color: () => SpecialPlugin<Color> = () => {
  const stack: TexColor[] = [];
  let nowColor: TexColor = "black";

  return (command) => {
    const data = new TextDecoder().decode(command.data);
    if (data.startsWith("color push ")) {
      stack.push(nowColor);
      nowColor = texColor(data.slice(11));
      return { type: "color", color: nowColor };
    }
    if (data.startsWith("color pop")) {
      const result = stack.pop();
      if (!result) throw new Error("Popped from empty color stack");
      nowColor = result;
      return { type: "color", color: nowColor };
    }
  };
};

const intToHex = (n: number) =>
  `${Math.round(n).toString(16)}`.padStart(2, "0");

const texColor = (name: string): TexColor => {
  if (name === "gray 0") return "black";
  if (name === "gray 1") return "white";
  if (name.startsWith("rgb ")) {
    return `#${
      name.split(" ").slice(1).map((x) => intToHex(parseFloat(x) * 255)).join(
        "",
      )
    }`;
  }
  if (name.startsWith("gray ")) {
    const x = name.split(" ")[1];
    return texColor(`rgb ${x} ${x} ${x}`);
  }
  return "black";
};
