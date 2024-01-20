import fontdata from "../tfm/fonts.json" with { type: "json" };

export const tfmLoader = (fontname: string): Promise<Uint32Array> => {
  // @ts-ignore TS7015
  const data = fontdata[fontname];
  if (data === undefined) {
    throw Error(`Could not find font ${name}`);
  }
  return Promise.resolve(new Uint32Array(data));
};
