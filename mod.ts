import {
  identifyMatrix,
  Matrix,
  toSVGTransform,
} from "./dvi/specials/matrix.ts";
import {
  Color,
  Papersize,
  ParseInfo,
  Rule,
  Special,
  SVG,
  TexColor,
  Text,
} from "./dvi/mod.ts";
import glyphs from "./encodings.json" with { type: "json" };
import fontlist from "./fontlist.json" with { type: "json" };

export const convertToHTML = (
  commands: Iterable<
    | Text
    | Rule
    | Special
    | ParseInfo
    | SVG
    | Papersize
    | Color
  >,
): string => {
  let pointsPerDviUnit = 0;

  let color: TexColor = "black";
  const depth: ("font-color" | "svg")[] = [];
  const matrix: Matrix = [...identifyMatrix];
  let fontName = "";
  let fontSize = 0;
  let html = "";

  let lastTextV = 0;
  let lastTextRight = 0;

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

          const encoding = Object.hasOwn(fontlist, command.font.name)
            ? fontlist[command.font.name as keyof typeof fontlist]
            : undefined;
          const glyph = encoding && Object.hasOwn(glyphs, encoding)
            ? glyphs[encoding as keyof typeof glyphs]
            : undefined;
          const newCodePoint = glyph && Object.hasOwn(glyph, codePoint)
            ? glyph[codePoint as unknown as keyof typeof glyph]
            : undefined;
          htmlText += String.fromCodePoint(
            newCodePoint ??
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

        const fontsize = (command.font.metrics.design_size / 1048576.0) *
          command.font.scaleFactor / command.font.designSize;

        if (fontName !== command.font.name || fontSize !== fontsize) {
          fontName = command.font.name;
          fontSize = fontsize;
          html += `${
            depth.at(-1) === "font-color"
              ? depth.includes("svg") ? "</g>" : "</span>"
              : ""
          }${
            depth.includes("svg")
              ? `<g fill="${color}" font-family="${fontName} font-size=${fontSize}>`
              : `<span class="font color ${fontName}" style="color: ${color};font-size: ${fontSize}pt;">`
          }`;
          if (depth.at(-1) !== "font-color") depth.push("font-color");
        }

        if (!depth.includes("svg")) {
          const hasSpace = (lastTextV == command.top) &&
            (left > lastTextRight + 2);

          html += `<span class="text" style="top: ${
            top - height
          }pt; left: ${left}pt;"><span ${
            hasSpace ? 'class="has-space" ' : ""
          } style="vertical-align: ${-height}pt;">${htmlText}</span></span>\n`;
          lastTextV = command.top;
          lastTextRight = left + width;
        } else {
          const bottom = command.top * pointsPerDviUnit;
          // No 'pt' on fontsize since those units are potentially scaled
          html +=
            `<text alignment-baseline="baseline" y="${bottom}" x="${left}">${htmlText}</text>\n`;
        }
        break;
      }
      case "rect": {
        const height = command.height * pointsPerDviUnit;
        const width = command.width * pointsPerDviUnit;
        const left = command.left * pointsPerDviUnit;
        const bottom = command.top * pointsPerDviUnit;
        const top = bottom - height;

        html += depth.includes("svg")
          ? `<rect x="${left}" y="${top}" width="${width}" height="${height}" fill=${color} ${
            toSVGTransform(matrix)
          }></rect>\n`
          // https://annualbeta.com/blog/1px-hairline-css-borders-on-hidpi-screens/
          : `<span class="rect" style="background: ${color}; top: ${top}pt; left: ${left}pt; width: ${width}pt; height: ${height}pt;"></span>\n`;
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
        const top = command.top * pointsPerDviUnit;
        const left = command.left * pointsPerDviUnit;

        let depthDiff = (command.svg.match(/<svg.*>/g) ?? []).length -
          (command.svg.match(/<\/svg.*>/g) ?? []).length;
        for (let i = 0; i < depthDiff; i++) {
          depth.push("svg");
        }
        while (depthDiff < 0) {
          switch (depth.pop()) {
            case "font-color":
              html += depth.includes("svg") ? "</g>" : "</span>";
              break;
            case "svg":
              depthDiff++;
              break;
            default:
              break;
          }
        }

        html += command.svg.replaceAll("{?x}", `${left}`).replaceAll(
          "{?y}",
          `${top}`,
        );
        break;
      }
      case "papersize":
        break;
      case "color":
        if (color === command.color) break;
        color = command.color;
        html += `${
          depth.at(-1) === "font-color"
            ? depth.includes("svg") ? "</g>" : "</span>"
            : ""
        }${
          depth.includes("svg")
            ? `<g fill="${color}" font-family="${fontName} font-size=${fontSize}>`
            : `<span class="font color ${fontName}" style="color: ${color};font-size: ${fontSize}pt;">`
        }`;
        if (depth.at(-1) !== "font-color") depth.push("font-color");
        break;
    }
  }

  for (const index of depth) {
    html += index === "svg" ? "</g>" : "</span>";
  }

  return `<div class="page">${html}</div>`;
};
