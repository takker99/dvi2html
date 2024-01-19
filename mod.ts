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
  const depth: ("svg")[] = [];
  const matrix: Matrix = [...identifyMatrix];
  let fontName = "";
  let fontSize = 0;
  let html = "";

  let lastTextV = 0;
  let lastTextRight = 0;

  let paperwidth = 0;
  let paperheight = 0;

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

        if (!depth.includes("svg")) {
          const hasSpace = (lastTextV == command.top) &&
            (left > lastTextRight + 2);

          html += `<span class="text ${fontName}" style="top:${
            top - height
          }pt;left:${left}pt;color:${color};font-size:${fontSize}pt;"><span ${
            hasSpace ? 'class="has-space" ' : ""
          } style="vertical-align:${-height}pt;">${htmlText}</span></span>\n`;
          lastTextV = command.top;
          lastTextRight = left + width;
        } else {
          const bottom = command.top * pointsPerDviUnit;
          // No 'pt' on fontsize since those units are potentially scaled
          html +=
            `<text alignment-baseline="baseline" y="${bottom}" x="${left}" fill="${color}" font-size="${fontSize}" font-family="${fontName}">${htmlText}</text>\n`;
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
        let svg = command.svg;
        for (const match of command.svg.matchAll(/<svg\s[^>]+>/g)) {
          const tag = match[0];
          if (tag === "<svg beginpicture>") {
            // In this case we are inside another svg element so drop the svg start tags.
            svg = `${svg.slice(0, match.index)}${
              depth.includes("svg")
                ? ""
                : `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${paperwidth}pt" height="${paperheight}pt" viewBox="-72 -72 ${paperwidth} ${paperheight}">`
            }${svg.slice(match.index! + tag.length)}`;
          }

          if (tag !== "<svg beginpicture>" || !depth.includes("svg")) {
            depth.push("svg");
          }
        }

        for (const match of command.svg.matchAll(/<\/svg\s[^>]+>/g)) {
          const tag = match[0];
          if (tag === "<\/svg endpicture>") {
            // If we are inside another svg element, then drop the svg end tag.
            // Otherwise just remove the " endpicture" bit.
            svg = `${svg.slice(0, match.index)}${
              !depth.includes("svg") ? "" : "<\/svg>"
            }${svg.slice(match.index! + tag.length)}`;
          }

          if (tag !== "<\/svg endpicture>" || depth.includes("svg")) {
            depth.pop();
          }
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
    }
  }

  for (const index of depth) {
    html += index === "svg" ? "</g>" : "</span>";
  }

  return `<div class="page">${html}</div>`;
};
