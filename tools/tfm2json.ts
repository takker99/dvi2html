import fontlist from "../fontlist.json" assert { type: "json" };

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
