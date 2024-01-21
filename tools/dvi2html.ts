import { color, papersize, parse, ps, svg } from "../dvi/mod.ts";
import { convertToHTML } from "../mod.ts";
import { tokenize } from "../dvi/tokenize.ts";
import { join } from "https://deno.land/std@0.212.0/path/mod.ts";
import { Command } from "https://deno.land/x/cliffy@v0.25.7/command/mod.ts#^";
import { fileLoader } from "../fileLoader.ts";

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
        tfmLoader: fileLoader,
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
  .option("--svg", "Get standalone SVG")
  .action(async ({ svg: standaloneSVG }, input, output) => {
    const dvi = await Deno.readFile(join(Deno.cwd(), input));

    const xml = await convertToHTML(
      await Array.fromAsync(
        parse(dvi, {
          plugins: [papersize, color(), svg()],
          tfmLoader: fileLoader,
        }),
      ),
      { svg: standaloneSVG, fileLoader },
    );

    if (output) {
      await Deno.writeTextFile(output, xml);
    } else {
      console.log(xml);
    }
  })
  .command("tokenize", token)
  .command("parse", parser)
  .parse(Deno.args);
