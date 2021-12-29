import color from "./specials/color.ts";
import svg from "./specials/svg.ts";
import html from "./specials/html.ts";
import papersize from "./specials/papersize.ts";
import title from "./specials/title.ts";
import ximera from "./specials/ximera.ts";

import HTMLMachine from "./html.ts";
import TextMachine from "./text.ts";

export const Machines = {
  HTML: HTMLMachine,
  text: TextMachine,
};

import { dviParser, execute, mergeText } from "./parser.ts";

export const specials = {
  color,
  svg,
  html,
  papersize,
};

export function dvi2html(dviStream: Uint8Array, htmlStream: WritableStream) {
  const parser = ximera(
    title(papersize(html(svg(color(mergeText(dviParser(dviStream))))))),
  );

  const machine = new HTMLMachine(htmlStream);

  execute(parser, machine);

  return machine;
}

export function dvi2vdom(
  dviStream: any,
  h: any,
  ximeraRuleHandler: any,
  ximeraPushHandler: any,
  ximeraPopHandler: any,
  callback: any,
) {
  let parser = ximera(
    title(papersize(html(svg(color(mergeText(dviParser(dviStream))))))),
  );

  let machine = new VDomMachine(
    h,
    ximeraRuleHandler,
    ximeraPushHandler,
    ximeraPopHandler,
    callback,
  );

  execute(parser, machine);

  return machine;
}

import { tfmData } from "./tfm/index.ts";

export { dviParser, execute, mergeText, tfmData };
