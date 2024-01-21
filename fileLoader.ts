import { JSZip } from "https://deno.land/x/jszip@0.11.0/mod.ts";
import { ensureDir, exists } from "https://deno.land/std@0.212.0/fs/mod.ts";
import { Spinner } from "https://deno.land/std@0.212.0/cli/mod.ts";

const spinner = new Spinner();
{
  const pathes: string[] = [];
  if (!await exists(new URL("./dist/bakoma", import.meta.url))) {
    pathes.push("https://mirrors.ctan.org/fonts/cm/ps-type1/bakoma.zip");
  }
  if (!await exists(new URL("./dist/amsfonts", import.meta.url))) {
    pathes.push("https://mirrors.ctan.org/fonts/amsfonts.zip");
  }
  if (pathes.length > 0) {
    spinner.message = "Downloading assets...";
    spinner.start();
    const buffers = await Promise.all(
      pathes.map((path) => fetch(path).then((res) => res.arrayBuffer())),
    );
    spinner.message = "Extracting assets...";

    await ensureDir(new URL("../../dist", import.meta.url));
    await Promise.all(
      buffers.map((buffer) =>
        new JSZip().loadAsync(buffer).then((zip) => zip.unzip("./dist"))
      ),
    );
  }
}
export const fileLoader = async (filename: string) => {
  try {
    if (filename.endsWith(".tfm")) {
      return Deno.readFile(
        new URL(`./dist/bakoma/tfm/${filename}`, import.meta.url),
      ).catch((e: unknown) => {
        if (!(e instanceof Deno.errors.NotFound)) throw e;
        return Deno.readFile(
          new URL(`./dist/amsfonts/tfm/${filename}`, import.meta.url),
        );
      });
    }
    if (filename.endsWith(".ttf")) {
      return await Deno.readFile(
        new URL(`./dist/bakoma/ttf/${filename}`, import.meta.url),
      );
    }
    return await Deno.readFile(new URL(`./dist/${filename}`, import.meta.url));
  } catch (e: unknown) {
    console.error(e);
    throw e;
  }
};
