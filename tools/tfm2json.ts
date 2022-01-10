import desiredFonts from "./fontlist.json" assert { type: "json" };
import { exec, OutputMode } from "https://deno.land/x/exec@0.0.5/mod.ts";
import { pooledMap } from "https://deno.land/std@0.120.0/async/mod.ts";

const results = pooledMap(
  10,
  Object.keys(desiredFonts),
  async (fontname) => {
    const res = await exec(`kpsewhich ${fontname}.tfm`, {
      output: OutputMode.Capture,
    });
    const filename = res.output.split("\n")[0];
    console.log(fontname, filename);

    return [fontname, await Deno.readFile(filename)] as const;
  },
);

const fonts = {} as Record<string, string>;
for await (const [fontname, buffer] of results) {
  fonts[fontname] = arrayBufferToBase64(buffer);
}

const outputPath = new URL("../src/tfm/fonts.json", import.meta.url);
await Deno.writeTextFile(outputPath, JSON.stringify(fonts));

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
