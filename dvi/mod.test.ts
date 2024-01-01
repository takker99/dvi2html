import { color, papersize, parse, ps, svg } from "./mod.ts";
import { assertSnapshot } from "https://deno.land/std@0.210.0/testing/snapshot.ts";

const test = async (t: Deno.TestContext, filename: string) => {
  const result: unknown[] = [];

  for (
    const command of parse(
      await Deno.readFile(new URL(`../test/${filename}`, import.meta.url)),
      [papersize, color(), svg(), ps()],
    )
  ) {
    switch (command.type) {
      case "rect":
      case "info":
      case "color":
      case "papersize":
      case "svg":
        result.push(command);
        break;
      case "special":
        result.push({
          type: command.type,
          data: new TextDecoder().decode(command.data),
        });
        break;
      case "text":
        result.push({
          type: command.type,
          text: command.text,
          font: command.font.name,
          top: command.top,
          left: command.left,
        });
        break;
    }
  }
  await assertSnapshot(t, result);
};

Deno.test("parse()", async (t) => {
  await t.step("color.dvi", () => test(t, "color.dvi"));
  await t.step("main.dvi", () => test(t, "main.dvi"));
});
