import { dvi2html } from "./src/mod.ts";

let fonts = "";
//fonts = fonts + `@font-face { font-family: esint10; src: url('./esint/esint10.ttf'); }\n`;
for await (const file of Deno.readDir("./fonts")) {
  if (!file.isFile) continue;
  const name = file.name.replace(/.ttf/, "");
  fonts +=
    `@font-face { font-family: ${name}; src: url('fonts/${file.name}'); }\n`;
}
await Deno.writeTextFile("fonts.css", fonts);

const filename = "sample.dvi";

const buffer = await Deno.readFile(filename);

let html = `<!doctype html>
<html lang=en>
<head>
<link rel="stylesheet" type="text/css" href="fonts.css">
<link rel="stylesheet" type="text/css" href="base.css">
</head>
<body>
<div style="position: absolute; width: 100%;">`;

//html = html + dviParser( buffer );

const myWritable = new WritableStream({
  write(chunk, encoding, callback) {
    html = html + chunk;
    callback();
  },
});

async function main() {
  dvi2html(buffer, myWritable);

  html += `</div>
</body>
</html>`;
  await Deno.writeTextFile("index.html", html);
}

main();
console.log("DONE");
