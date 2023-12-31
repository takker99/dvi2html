import { SpecialPlugin } from "../mod.ts";
import {
  Matrix,
  rotate,
  scale,
  toSVGTransform,
  translate,
} from "../../matrix.ts";

export interface PSFile {
  type: "psfile";
  href: string;
  toSVG: (matrix: Matrix, x: number, y: number) => string;
}

export const psfile: SpecialPlugin<PSFile> = (command) => {
  const ps = new TextDecoder().decode(command.data);
  if (!ps.startsWith("psfile=")) return;

  const href = getAttribute(ps, "psfile", "");
  if (!href) return null;

  // Bounding box of image in PS point units (lower left and upper right corner)
  const llx = parseFloat(getAttribute(ps, "llx", "0"));
  const lly = parseFloat(getAttribute(ps, "lly", "0"));
  const urx = parseFloat(getAttribute(ps, "urx", "0"));
  const ury = parseFloat(getAttribute(ps, "ury", "0"));

  // Desired width and height of the untransformed figure in PS point units
  const rwi = parseFloat(getAttribute(ps, "rwi", "-1")) / 10;
  const rhi = parseFloat(getAttribute(ps, "rhi", "-1")) / 10;

  if (rwi === 0 || rhi === 0 || urx === llx || ury === lly) return null;

  // User transformations (default values chosen according to dvips manual)
  // Order of transformations: rotate, scale, translate/offset
  const hoffset = parseFloat(getAttribute(ps, "hoffset", "0"));
  const voffset = parseFloat(getAttribute(ps, "voffset", "0"));
  const hscale = parseFloat(getAttribute(ps, "hscale", "100"));
  const vscale = parseFloat(getAttribute(ps, "vscale", "100"));
  const angle = parseFloat(getAttribute(ps, "angle", "0"));

  let sx = rwi / Math.abs(llx - urx);
  let sy = rhi / Math.abs(lly - ury);

  if (sx === 0 || sy === 0) return null;

  if (sx < 0) sx = sy; // rwi attribute not set
  if (sy < 0) sy = sx; // rhi attribute not set
  if (sx < 0) sx = sy = 1; // neither rwi nor rhi set

  return {
    type: "psfile",
    href,
    toSVG: (matrix, x, y) => {
      const transformedMatrix = translate(
        scale(
          rotate(
            scale(
              translate(matrix, x + hoffset, y - voffset),
              hscale / 100,
              vscale / 100,
            ),
            -angle,
          ),
          sx,
          sy,
        ),
        // Move lower left corner of image to origin
        -llx,
        -lly,
      );
      return `<image x="${llx}" y="${lly}" width="${urx}" height="${ury}" href="${href}"` +
        `${toSVGTransform(transformedMatrix)}></image>`;
    },
  };
};

const getAttribute = (
  input: string,
  attr: string,
  defaultValue: string,
): string => {
  const attrRegex = RegExp(`${attr}="?(.*?)"?( |$)`, "i");
  return input.match(attrRegex)?.[1] ?? defaultValue;
};
