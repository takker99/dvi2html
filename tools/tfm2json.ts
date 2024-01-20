import fontlist from "../fontlist.json" with { type: "json" };
import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts#^";

await new Command()
  .name("tfm2json")
  .version("v0.1.1")
  .description(
    "Create `fonts.json` from tfm files.\nRequires `kpsewhich` and Makes sure TexLive is installed.",
  )
  .parse(Deno.args);

const fonts: Record<string, number[]> = {};

const fontnames = [...Object.keys(fontlist), "tcrm1000", "esint10", "line10"];

for (const fontname of fontnames) {
  const kpsewhich = new Deno.Command("kpsewhich", {
    args: [`${fontname}.tfm`],
  });
  const { stdout } = await kpsewhich.output();
  const filename = new TextDecoder().decode(stdout).trim();
  console.log(fontname, filename);

  fonts[fontname] = [
    ...new Uint32Array((await Deno.readFile(filename)).buffer),
  ];
}

await Deno.writeTextFile(
  new URL("../tfm/fonts.json", import.meta.url),
  JSON.stringify(fonts),
);
