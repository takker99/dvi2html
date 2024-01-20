import { tokenize } from "./tokenize.ts";
import { assertSnapshot } from "../deps_test.ts";

const test =  (t: Deno.TestContext, filename: string) =>
  t.step(
    filename,
    async () =>
      await assertSnapshot(
        t,
        [...tokenize(
          await Deno.readFile(new URL(`../test/${filename}`, import.meta.url)),
        )],
      ),
  );

Deno.test("tokenize()", async (t) => {
  await test(t, "main.dvi");
  await test(t, "color.dvi");
  await test(t, "tikz.dvi");
  await test(t, "circuitikz.dvi");
  await test(t, "3d.dvi");
  await test(t, "tikz-cd.dvi");
  await test(t, "chemfig.dvi");
});
