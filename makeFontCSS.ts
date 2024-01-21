import { toDataURL } from "./toDataURL.ts";

export const makeFontCSS = async (
  fontFilenames: Iterable<string>,
  fileLoader: (filename: string) => Promise<Uint8Array>,
): Promise<string> =>
  (await Promise.all(
    [...fontFilenames].sort().map(async (fontFilename) => [
      fontFilename.slice(0, -4),
      await toDataURL(
        new Blob([await fileLoader(fontFilename)], { type: "font/truetype" }),
      ),
    ]),
  )).map(([k, font]) =>
    `@font-face{font-family:${k};src:local(${k}),url(${font})format("truetype");}.${k}{font-family:${k};}`
  ).join("");
