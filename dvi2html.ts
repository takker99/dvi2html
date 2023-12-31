import { promises } from "fs";
import { parse } from "./src/dvi/mod";
import { color } from "./src/dvi/specials/color";
import { papersize } from "./src/dvi/specials/papersize";
import { svg } from "./src/dvi/specials/svg";
import { ps } from "./src/dvi/specials/ps";
import { resolve } from "path";
import { convertToHTML } from "./src/html";
import { tokenize } from "./src/dvi/tokenize";

(async () => {
  // console.log(loadFont("cmb10"));
  const file = await promises.readFile(
    resolve(__dirname, "./test/two_page_tikz.dvi"),
  );
  // for (const token of tokenize(file)) {
  //   console.log(token);
  // }
  const div = convertToHTML(parse(file, [papersize, color(), svg()]));
  const html = `<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <title>dvi2html testing</title>
    <style>
      .page {
        position: relative;
        width: 100%;
        height: 0;
      }
      .text {
        line-height: 0;
        position: absolute;
        overflow: visible;
      }
      .rect {
        position: absolute;
        min-width: 1px;
        min-height: 1px;
      }
      svg {
        position: absolute;
        overflow: visible;
      }
    </style>
</head>

<body>${div}</body></html>`;
  console.log(html);
  // for (const command of parse(file, [papersize, color(), svg(),ps()])) {
  //   switch (command.type) {
  //     case "rect":
  //     case "info":
  //     case "color":
  //     case "papersize":
  //     case "svg":
  //       console.log(command);
  //       break;
  //     case "special":
  //       console.log({ type: command.type, data: new TextDecoder().decode(command.data) });
  //       break;
  //     case "text":
  //       console.log({
  //         type: command.type,
  //         text: command.text,
  //         font: command.font.name,
  //         top: command.top,
  //         left: command.left,
  //       });
  //       break;
  //   }
  // }
})();
