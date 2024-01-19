import { interpret as interpretPS } from "./psinterpreter.ts";
import { SpecialPlugin } from "../mod.ts";
import { Matrix } from "./matrix.ts";

export interface PS {
  type: "ps";
  ps: string;
  interpret: (matrix: Matrix) => Matrix;
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
    const interpret: PS["interpret"] = (matrix) => {
      const result = interpretPS(
        psText,
        matrix,
        command.horizontal,
        command.vertical,
      );
      command.emitChange({
        horizontal: result.horizontal,
        vertical: result.vertical,
        w: command.w,
        x: command.x,
        y: command.y,
        z: command.z,
      });
      return result.matrix;
    };

    psText = "";
    return {
      type: "ps",
      ps: psText,
      interpret,
    };
  };
};
