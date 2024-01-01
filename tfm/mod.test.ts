import { loadFont } from "./mod.ts";
import { assertSnapshot } from "../deps_test.ts";
import fontdata from "./fonts.json" with { type: "json" };

Deno.test("parse()", async (t) => {
  await t.step("valid TFM file", async (t) => {
    for (const key of Object.keys(fontdata)) {
      await t.step(key, () => assertSnapshot(t, loadFont(key)));
    }
  });
});
