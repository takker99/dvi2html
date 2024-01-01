import { tokenize } from "./tokenize.ts";
import { assertSnapshot } from "../deps_test.ts";

Deno.test("tokenize()", async (t) => {
  await t.step(
    "color.dvi",
    async () =>
      await assertSnapshot(
        t,
        [...tokenize(
          await Deno.readFile(new URL("../test/color.dvi", import.meta.url)),
        )],
      ),
  );

  await t.step(
    "main.dvi",
    async () =>
      await assertSnapshot(
        t,
        [...tokenize(
          await Deno.readFile(new URL("../test/main.dvi", import.meta.url)),
        )],
      ),
  );
});
