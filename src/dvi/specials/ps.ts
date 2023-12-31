import { interpret as interpretPS } from "./psinterpreter";
import { SpecialPlugin } from "../mod";
import { Matrix } from "../../matrix";

export interface PS {
  type: "ps";
  ps: string;
  interpret: (
    matrix: Matrix,
    x: number,
    y: number,
  ) => { matrix: Matrix; x: number; y: number };
}

export const ps: () => SpecialPlugin<PS> = () => {
  let psText = "";

  return (command, next) => {
    const data = new TextDecoder().decode(command.data);
    if (!data.startsWith("ps: ")) return;
    psText += data.slice(4);

    if (next?.type === "special") {
      const nextData = new TextDecoder().decode(next.data);
      if (nextData.startsWith("ps: ")) return null;
    }
    const interpret: PS["interpret"] = (matrix, x, y) =>
      interpretPS(psText, matrix, x, y);
    psText = "";
    return {
      type: "ps",
      ps: psText,
      interpret,
    };
  };
};
