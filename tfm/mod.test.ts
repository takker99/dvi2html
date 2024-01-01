import { loadFont } from "./mod.ts";
import { assertSnapshot } from "https://deno.land/std@0.210.0/testing/snapshot.ts";
import fontdata from "./fonts.json" with { type: "json" };

Deno.test("parse()", async (t) => {
  await t.step("valid TFM file", async (t) => {
    for (const key of Object.keys(fontdata)) {
      await t.step(key, () => assertSnapshot(t, loadFont(key)));
    }
  });
});
