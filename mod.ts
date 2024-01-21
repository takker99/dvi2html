import {
  identifyMatrix,
  Matrix,
  toSVGTransform,
} from "./dvi/specials/matrix.ts";
import {
  Color,
  Papersize,
  ParseInfo,
  PS,
  PSFile,
  Rule,
  Special,
  SVG,
  TexColor,
  Text,
} from "./dvi/mod.ts";
import { makeFontCSS } from "./makeFontCSS.ts";

/** Options for converting to HTML. */
export interface ConvertToHTMLInit {
  /** Set to `true` to get standalone SVG.  */
  svg?: boolean;
  title?: string;
  fileLoader: (filename: string) => Promise<Uint8Array>;
}

export const convertToHTML = async (
  commands: Iterable<
    | Text
    | Rule
    | Special
    | ParseInfo
    | PSFile
    | PS
    | SVG
    | Papersize
    | Color
  >,
  init: ConvertToHTMLInit,
): Promise<string> => {
  let pointsPerDviUnit = 0;

  let color: TexColor = "black";
  let depth = init.svg ? 1 : 0;
  let matrix: Matrix = [...identifyMatrix];
  let fontName = "";
  let fontSize = 0;
  let html = "";

  let lastTextV = 0;
  let lastTextRight = 0;

  let paperwidth = 0;
  let paperheight = 0;

  const usedFontFilenames = new Set<string>();

  for (const command of commands) {
    switch (command.type) {
      case "text": {
        let textWidth = 0;
        let textHeight = 0;

        let htmlText = "";

        for (const c of command.text) {
          const codePoint = c.codePointAt(0) ?? 0;
          const metrics = command.font.metrics.characters.at(codePoint);
          if (metrics === undefined) {
            throw Error(`Could not find font metric for ${codePoint}`);
          }

          textWidth += metrics.width;
          textHeight = Math.max(textHeight, metrics.height);

          htmlText += String.fromCodePoint(
            // This is ridiculous.
            (codePoint >= 0 && codePoint <= 9)
              ? 161 + codePoint
              : (codePoint >= 10 && codePoint <= 19)
              ? 173 + codePoint - 10
              : (codePoint === 20)
              ? 8729 // O RLLY?!
              : (codePoint >= 21 && codePoint <= 32)
              ? 184 + codePoint - 21
              : (codePoint === 127)
              ? 196
              : codePoint,
          );
        }

        // tfm is based on 1/2^16 pt units, rather than dviunit which is 10^−7 meters
        const dviUnitsPerFontUnit = command.font.metrics.design_size /
          1048576.0 *
          65536 / 1048576;

        const left = command.left * pointsPerDviUnit;

        const width = textWidth * pointsPerDviUnit * dviUnitsPerFontUnit;
        const height = textHeight * pointsPerDviUnit * dviUnitsPerFontUnit;
        const top = command.top * pointsPerDviUnit;

        fontName = command.font.name;
        fontSize = (command.font.metrics.design_size / 1048576.0) *
          command.font.scaleFactor / command.font.designSize;
        const textColor = ["#000", "black"].includes(color)
          ? "CanvasText"
          : color;

        usedFontFilenames.add(`${fontName}.ttf`);
        if (depth <= 0) {
          const hasSpace = (lastTextV == command.top) &&
            (left > lastTextRight + 2);

          html += `<span class="text ${fontName}" style="top:${
            top - height
          }pt;left:${left}pt;color:${textColor};font-size:${fontSize}pt;"><span ${
            hasSpace ? 'class="has-space" ' : ""
          } style="vertical-align:${-height}pt;">${htmlText}</span></span>\n`;
          lastTextV = command.top;
          lastTextRight = left + width;
        } else {
          const bottom = command.top * pointsPerDviUnit;
          // No 'pt' on fontsize since those units are potentially scaled
          html +=
            `<text alignment-baseline="baseline" y="${bottom}" x="${left}" fill="${textColor}" font-size="${fontSize}" font-family="${fontName}">${htmlText}</text>\n`;
        }
        break;
      }
      case "rect": {
        const height = command.height * pointsPerDviUnit;
        const width = command.width * pointsPerDviUnit;
        const left = command.left * pointsPerDviUnit;
        const bottom = command.top * pointsPerDviUnit;
        const top = bottom - height;

        const textColor = ["#000", "black"].includes(color)
          ? "CanvasText"
          : color;
        html += depth > 0
          ? `<rect x="${left}" y="${top}" width="${width}" height="${height}" fill="${textColor}" ${
            toSVGTransform(matrix)
          }></rect>\n`
          // https://annualbeta.com/blog/1px-hairline-css-borders-on-hidpi-screens/
          : `<span class="rect" style="background: ${textColor}; top: ${top}pt; left: ${left}pt; width: ${width}pt; height: ${height}pt;"></span>\n`;
        break;
      }
      case "special":
        break;
      case "info": {
        const dviUnit = command.magnification * command.numerator / 1000.0 /
          command.denominator;
        pointsPerDviUnit = dviUnit * 72.27 / 100000.0 / 2.54;
        break;
      }
      case "svg": {
        let svg = command.svg;
        for (const match of command.svg.matchAll(/<svg\s[^>]+>/g)) {
          const tag = match[0];
          if (tag === "<svg beginpicture>") {
            // In this case we are inside another svg element so drop the svg start tags.
            svg = svg.replace(
              tag,
              depth > 0 ? "" : standaloneSVGBeginTag(paperwidth, paperheight),
            );
          }

          depth++;
        }

        for (const match of command.svg.matchAll(/<\/svg\s[^>]+>/g)) {
          const tag = match[0];
          if (tag === "<\/svg endpicture>") {
            // If we are inside another svg element, then drop the svg end tag.
            // Otherwise just remove the " endpicture" bit.
            svg = svg.replace(tag, depth === 1 ? "<\/svg>" : "");
          }

          depth = Math.max(0, depth - 1);
        }

        const top = command.top * pointsPerDviUnit;
        const left = command.left * pointsPerDviUnit;
        html += svg.replaceAll("{?x}", `${left}`).replaceAll(
          "{?y}",
          `${top}`,
        );
        break;
      }
      case "papersize":
        paperheight = command.height;
        paperwidth = command.width;
        break;
      case "color":
        color = command.color;
        break;
      case "ps":
        matrix = command.interpret(matrix);
        break;
      case "psfile":
        html += depth > 0
          ? command.toSVG(matrix)
          : `${standaloneSVGBeginTag(paperwidth, paperheight)}${
            command.toSVG(matrix)
          }</svg>}`;
        break;
    }
  }

  for (let _ = depth; _ > 0; _--) html += "</svg>";

  const title = `<title>${init.title ?? "input.tex"}</title>`;
  const style = `<style>${await makeFontCSS(
    usedFontFilenames,
    init.fileLoader,
  )}:root{color-scheme:light dark;background-color:Canvas;color:CanvasText;}.page{position:relative;width:100%;}.text{line-height:0;position:absolute;overflow:visible;}.rect{position:absolute;min-width:1px;min-height:1px;}</style>`;

  // ported from https://github.com/artisticat1/obsidian-tikzjax/blob/0.5.1/main.ts#L138-L143
  // Replace the color "black" with CanvasText (the current text color)
  // so that diagram axes, etc are visible in dark mode
  // And replace "white" with Canvas
  html = html.replace(/("#000"|"black")/g, '"CanvasText"')
    .replace(/("#fff"|"white")/g, '"var(--background-primary, Canvas)"');

  return init.svg
    ? `${standaloneSVGBeginTag(paperwidth, paperheight)}${title}${style}${html}`
    : `<!DOCTYPE html><html><head><meta charset="UTF-8">${title}${style}</head><body>${html}</body></html>`;
};

const standaloneSVGBeginTag = (width: number, height: number) =>
  `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="${width}pt" height="${height}pt" viewBox="-72 -72 ${width} ${height}">`;
