import { parse as parseTFM, TFM } from "../tfm/mod.ts";
import { tokenize } from "./tokenize.ts";
import {
  BOP,
  DOWN,
  EOP,
  FNT,
  FNT1,
  FNT2,
  FNT3,
  FNT4,
  FNT_DEF,
  NOP,
  POP,
  POST,
  POST_POST,
  PRE,
  PUSH,
  PUT_CHAR,
  PUT_RULE,
  RIGHT,
  SET_CHAR,
  SET_RULE,
  W,
  X,
  XXX,
  Y,
  Z,
} from "./const.ts";

export type { TFM };
export * from "./specials/color.ts";
export * from "./specials/svg.ts";
export * from "./specials/papersize.ts";
export * from "./specials/ps.ts";
export * from "./specials/psfile.ts";
export type { Matrix } from "./specials/matrix.ts";

export interface Register {
  horizontal: number;
  vertical: number;
  w: number;
  x: number;
  y: number;
  z: number;
  fontNum: number;
}
export interface Text {
  type: "text";
  text: string;
  font: DviFont;
  top: number;
  left: number;
}
export interface Rule {
  type: "rect";
  left: number;
  top: number;
  width: number;
  height: number;
}
export interface Special extends Omit<Register, "fontNum"> {
  type: "special";
  data: Uint8Array;
  emitChange: (register: Omit<Register, "fontNum">) => void;
}
export interface ParseInfo {
  type: "info";
  version: number;
  numerator: number;
  denominator: number;
  magnification: number;
  comment: string;
  maxHeight?: number;
  maxWidth?: number;
  pages?: number;
  dviVersion?: number;
}

export interface DviFont {
  name: string;
  checksum: number;
  scaleFactor: number;
  designSize: number;
  metrics: TFM;
}

/** Plugin to transform Special according to certain rules
 *
 * @param current Current Special
 * @param next Next Special
 * @return `null` if the Special should be dropped, `undefined` if the plugin doesn't deal with the Special, or a new Special
 */
export type SpecialPlugin<T> = (
  current: Special,
  next?: Text | Rule | Special | ParseInfo,
) => T | null | undefined;

export interface ParseInit<
  // deno-lint-ignore no-explicit-any
  Plugins extends SpecialPlugin<any>[],
> {
  tfmLoader: (filename: string) => Promise<Uint32Array>;
  plugins?: Plugins;
}

export async function* parse<
  // deno-lint-ignore no-explicit-any
  Plugins extends SpecialPlugin<any>[] = SpecialPlugin<Special>[],
>(
  dvi: Uint8Array,
  init: ParseInit<Plugins>,
): AsyncGenerator<
  | Text
  | Rule
  | Special
  | ParseInfo
  | {
    [K in keyof Plugins]: Plugins[K] extends SpecialPlugin<infer U> ? U : never;
  }[number]
> {
  const iterator = middleParser(dvi, init.tfmLoader);
  const result = await iterator.next();
  let next = !result.done ? result.value : undefined;

  while (next) {
    const command = next;
    const result = await iterator.next();
    next = !result.done ? result.value : undefined;

    if (command.type === "special" && init.plugins) {
      let found = false;
      for (const plugin of init.plugins) {
        const result = plugin(command, next);
        if (result === undefined) continue;
        if (result !== null) yield result;
        found = true;
        break;
      }
      if (!found) yield command;
      continue;
    }
    yield command;
  }
}

async function* middleParser(
  dvi: Uint8Array,
  tfmLoader: (filename: string) => Promise<Uint32Array>,
): AsyncGenerator<
  | Text
  | Rule
  | Special
  | ParseInfo
> {
  let version = 2;
  let numerator = 25400000;
  let denominator = 473628672;
  let magnification = 1000;
  let comment = "";
  let maxHeight = 0;
  let maxWidth = 0;
  let pages = 0;
  const register: Register = {
    horizontal: 0,
    vertical: 0,
    w: 0,
    x: 0,
    y: 0,
    z: 0,
    fontNum: 0,
  };
  const stack: Omit<Register, "fontNum">[] = [];
  const fonts = new Map<number, DviFont>();

  let text = "";

  const iterator = tokenize(dvi);
  const result = iterator.next();
  let next = !result.done ? result.value : undefined;

  while (next) {
    const command = next;
    const result = iterator.next();
    next = !result.done ? result.value : undefined;

    switch (command.opcode) {
      case SET_CHAR:
      case PUT_CHAR:
        text += String.fromCharCode(command.c);
        if ((next?.opcode !== SET_CHAR && next?.opcode !== PUT_CHAR) || !next) {
          const font = fonts.get(register.fontNum);
          if (!font) throw Error(`Font "${register.fontNum}" is not loaded`);
          yield {
            type: "text",
            text,
            font,
            top: register.vertical,
            left: register.horizontal,
          };
          if (command.opcode === SET_CHAR) {
            register.horizontal += getTextWidth(text, font);
          }
          text = "";
        }
        break;
      case SET_RULE:
      case PUT_RULE:
        if (command.a > 0 && command.b > 0) {
          yield {
            type: "rect",
            left: register.horizontal,
            top: register.vertical,
            height: command.a,
            width: command.b,
          };
        }
        if (command.opcode === SET_RULE) {
          register.horizontal += command.b;
        }
        break;
      case NOP:
      case EOP:
        break;
      case BOP:
        register.horizontal = 0;
        register.vertical = 0;
        register.w = 0;
        register.x = 0;
        register.y = 0;
        register.z = 0;
        register.fontNum = 0;
        stack.splice(0, stack.length);
        // count0 = command.c_0;
        // count1 = command.c_1;
        // count2 = command.c_2;
        // count3 = command.c_3;
        // count4 = command.c_4;
        // count5 = command.c_5;
        // count6 = command.c_6;
        // count7 = command.c_7;
        // count8 = command.c_8;
        // count9 = command.c_9;
        break;
      case PUSH:
        stack.push({ ...register });
        break;
      case POP: {
        const register_ = stack.pop();
        if (register_) {
          register.horizontal = register_.horizontal;
          register.vertical = register_.vertical;
          register.w = register_.w;
          register.x = register_.x;
          register.y = register_.y;
          register.z = register_.z;
        }
        break;
      }
      case RIGHT:
        register.horizontal += command.b;
        break;
      case W:
        if (command.b !== 0) register.w = command.b;
        register.horizontal += register.w;
        break;
      case X:
        if (command.b !== 0) register.x = command.b;
        register.horizontal += register.x;
        break;
      case DOWN:
        register.vertical += command.a;
        break;
      case Y:
        if (command.a !== 0) register.y = command.a;
        register.vertical += register.y;
        break;
      case Z:
        if (command.a !== 0) register.z = command.a;
        register.vertical += register.z;
        break;
      case FNT:
      case FNT1:
      case FNT2:
      case FNT3:
      case FNT4:
        register.fontNum = command.k;
        break;
      case XXX:
        yield {
          type: "special",
          data: command.x,
          ...register,
          emitChange: (newRegister) => {
            register.horizontal = newRegister.horizontal;
            register.vertical = newRegister.vertical;
            register.w = newRegister.w;
            register.x = newRegister.x;
            register.y = newRegister.y;
            register.z = newRegister.z;
          },
        };
        break;
      case FNT_DEF: {
        if (fonts.has(command.k)) break;
        const name = command.n;
        const scaleFactor = command.s;
        const designSize = command.d;
        const checksum = command.c;
        const font = parseTFM(await tfmLoader(command.n));
        fonts.set(command.k, {
          name,
          checksum,
          scaleFactor,
          designSize,
          metrics: font,
        });
        break;
      }
      case PRE:
        version = command.i;
        numerator = command.num;
        denominator = command.den;
        magnification = command.mag;
        comment = command.x;
        yield {
          type: "info",
          version,
          numerator,
          denominator,
          magnification,
          comment,
        };
        break;
      case POST:
        maxHeight = command.l;
        maxWidth = command.u;
        pages = command.t;
        break;
      case POST_POST:
        yield {
          type: "info",
          version,
          numerator,
          denominator,
          magnification,
          comment,
          maxHeight,
          maxWidth,
          pages,
          dviVersion: command.i,
        };
        break;
    }
  }
}

const getTextWidth = (text: string, font: DviFont) => {
  let width = 0;
  for (const char of text) {
    const codePoint = char.codePointAt(0) ?? 0;
    const metrics = font.metrics.characters.at(codePoint);
    if (metrics === undefined) {
      throw Error(`Could not find font metric for ${codePoint}`);
    }
    width += metrics.width;
  }

  // tfm is based on 1/2^16 pt units, rather than dviunit which is 10^−7 meters
  const dviUnitsPerFontUnit = font.metrics.design_size /
    1048576.0 *
    65536 / 1048576;
  return width * dviUnitsPerFontUnit * font.scaleFactor / font.designSize;
};
