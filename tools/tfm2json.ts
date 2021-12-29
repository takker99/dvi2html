const outputPath = new URL("../src/tfm/fonts.json", import.meta.url);
const desiredFonts = JSON.parse(
  await Deno.readTextFile("./fontlist.json"),
) as Record<string, string>;

const fonts = {} as Record<string, string>;

async function processTfmFile(fontname: string, filename: string) {
  console.log(fontname, filename);

  const buffer = await Deno.readFile(filename);
  fonts[fontname] = arrayBufferToBase64(buffer);
}

for (const fontname of Object.keys(desiredFonts)) {
  const filename =
    execSync("kpsewhich " + fontname + ".tfm").toString().split("\n")[0];
  processTfmFile(fontname, filename);
}

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
