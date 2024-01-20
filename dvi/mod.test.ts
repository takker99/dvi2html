import { color, papersize, parse, ps, svg } from "./mod.ts";
import { assertSnapshot } from "../deps_test.ts";
import { tfmLoader } from "../tfm/tfmLoader.ts";

const test = (t: Deno.TestContext, filename: string) =>
  t.step(filename, async () => {
    const result: unknown[] = [];

    for await (
      const command of parse(
        await Deno.readFile(new URL(`../test/${filename}`, import.meta.url)),
        { plugins: [papersize, color(), svg(), ps()], tfmLoader },
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
  });

Deno.test("parse()", async (t) => {
  await test(t, "main.dvi");
  await test(t, "color.dvi");
  await test(t, "tikz.dvi");
  await test(t, "circuitikz.dvi");
  await test(t, "3d.dvi");
  await test(t, "tikz-cd.dvi");
  await test(t, "chemfig.dvi");
});
