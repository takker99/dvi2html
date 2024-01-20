import { color, papersize, parse, ps, svg } from "../dvi/mod.ts";
import { convertToHTML } from "../mod.ts";
import { tokenize } from "../dvi/tokenize.ts";
import { join } from "https://deno.land/std@0.212.0/path/mod.ts";
import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts#^";
import { tfmLoader } from "../tfm/tfmLoader.ts";

const token = new Command()
  .arguments("<input:string> [output:string]")
  .description("Tokenize DVI command")
  .action(async (_, input, output) => {
    const dvi = await Deno.readFile(join(Deno.cwd(), input));
    const tokens = [...tokenize(dvi)];
    if (output) {
      await Deno.writeTextFile(output, JSON.stringify(tokens, null, 2));
    } else {
      console.log(tokens);
    }
  });

const parser = new Command()
  .arguments("<input:string> [output:string]")
  .description("Parse DVI file")
  .action(async (_, input, output) => {
    const dvi = await Deno.readFile(join(Deno.cwd(), input));
    const log: unknown[] = [];
    for await (
      const command of parse(dvi, {
        plugins: [papersize, ps(), svg(), color()],
        tfmLoader,
      })
    ) {
      switch (command.type) {
        case "rect":
        case "info":
        case "color":
        case "papersize":
        case "svg":
          log.push(command);
          break;
        case "special":
          log.push({
            type: command.type,
            data: new TextDecoder().decode(command.data),
          });
          break;
        case "text":
          log.push({
            type: command.type,
            text: command.text,
            font: command.font.name,
            top: command.top,
            left: command.left,
          });
          break;
      }
    }
    if (output) {
      await Deno.writeTextFile(output, JSON.stringify(log, null, 2));
    } else {
      console.log(log);
    }
  });

await new Command()
  .name("dvi2html")
  .description("Convert DVI into HTML")
  .version("v0.1.1")
  .arguments("<input:string> [output:string]")
  .action(async (_, input, output) => {
    const dvi = await Deno.readFile(join(Deno.cwd(), input));

    const div = convertToHTML(
      await Array.fromAsync(
        parse(dvi, { plugins: [papersize, color(), svg()], tfmLoader }),
      ),
    );
    const html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>dvi2html testing</title>
     <style>${await Deno.readTextFile(
      new URL("./TikZJax.css", import.meta.url),
    )}</style>
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

    if (output) {
      await Deno.writeTextFile(output, html);
    } else {
      console.log(html);
    }
  })
  .command("tokenize", token)
  .command("parse", parser)
  .parse(Deno.args);
