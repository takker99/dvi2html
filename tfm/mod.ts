const LIG_TAG = 1;
const LIST_TAG = 2;
const EXT_TAG = 3;

const KERN_OPCODE = 128;
export const parse = (tfm: Uint32Array): TFM => {
  // Read and set the table lengths
  const view = new DataView(tfm.buffer, tfm.byteOffset, tfm.byteLength);

  const entire_file_length = view.getUint16(0);
  const header_length = view.getUint16(2);
  const smallest_character_code = view.getUint16(4);
  const largest_character_code = view.getUint16(6);

  const table_lengths = {
    header: Math.max(18, header_length),
    character_info: largest_character_code - smallest_character_code + 1,
    width: view.getUint16(8),
    height: view.getUint16(10),
    depth: view.getUint16(12),
    italic_correction: view.getUint16(14),
    lig_kern: view.getUint16(16),
    kern: view.getUint16(18),
    extensible_character: view.getUint16(20),
    font_parameter: view.getUint16(22),
  } as const;

  // check validation
  if (
    !(smallest_character_code <= largest_character_code + 1 &&
      largest_character_code < 256)
  ) {
    throw new Error(
      `Smallest character code (${smallest_character_code}) must be larger than largest character code (${largest_character_code}) and largest character code must be less than 256 (actual: ${largest_character_code})`,
    );
  }
  if (table_lengths.extensible_character > 256) {
    throw new Error(
      `Extensible character must be less than 256 (actual: ${table_lengths.extensible_character})`,
    );
  }
  {
    const actual = 6 + header_length + table_lengths.character_info +
      table_lengths.width +
      table_lengths.height + table_lengths.depth +
      table_lengths.italic_correction + table_lengths.lig_kern +
      table_lengths.kern + table_lengths.extensible_character +
      table_lengths.font_parameter;

    if (
      entire_file_length !== actual
    ) {
      throw new Error(
        `entire_file_length must be ${actual} (actual: ${entire_file_length})`,
      );
    }
  }

  // Read the tables
  let position = 24;
  const slice = (length: number) =>
    [...Array(length).keys()].map((i) => view.getUint32(position + i * 4));

  const headerWords = view.buffer.slice(
    position,
    position + table_lengths.header * 4,
  );
  position += table_lengths.header * 4;
  const character_info = slice(table_lengths.character_info);
  position += table_lengths.character_info * 4;
  const width = slice(table_lengths.width);
  position += table_lengths.width * 4;
  const height = slice(table_lengths.height);
  position += table_lengths.height * 4;
  const depth = slice(table_lengths.depth);
  position += table_lengths.depth * 4;
  const italic_correction = slice(table_lengths.italic_correction);
  position += table_lengths.italic_correction * 4;
  const lig_kern = slice(table_lengths.lig_kern);
  position += table_lengths.lig_kern * 4;
  // deno-lint-ignore no-unused-vars
  const kern = slice(table_lengths.kern);
  position += table_lengths.kern * 4;
  const extensible_character = slice(table_lengths.extensible_character);
  position += table_lengths.extensible_character * 4;
  const font_parameter = slice(table_lengths.font_parameter);
  position += table_lengths.font_parameter * 4;

  const header = readHeader(headerWords);
  const charecterInfo = readCharacterInfo(character_info);

  const fontParameters = readFontParamerters(
    font_parameter,
    header.coding_scheme,
  );

  return {
    checksum: header.checksum,
    design_size: header.design_size,
    family: header.family,
    face: header.face,
    ligKernPrograms: readLigKernPrograms(lig_kern),
    characters: charecterInfo.map(
      (charInfo) => {
        const { width_index, height_index, depth_index, italic_index } =
          charInfo;
        const char: TFMChar = {
          width: width[width_index],
          height: height.at(height_index) ?? 0,
          depth: depth.at(depth_index) ?? 0,
          italic_correction: italic_correction.at(italic_index) ?? 0,
        };
        switch (charInfo.type) {
          case "lig":
            char.lig_kern_program = lig_kern[charInfo.lig_kern_index];
            break;
          case "link":
            char.next_larger_char = charInfo.next_larger_char;
            break;
          case "ext":
            char.extensible_recipe =
              extensible_character[charInfo.extensible_index];
            break;
          default:
            break;
        }
        return char;
      },
    ),
    ...fontParameters,
  };
};

export type TFM =
  & (
    | SymbolFontParameter
    | ExtensionFontParameter
    | ItalicFontParameter
    | FontParameter
  )
  & {
    checksum: number;
    design_size: number;
    family: string;
    face: number;
    ligKernPrograms: unknown[];
    characters: TFMChar[];
  };
export interface TFMChar {
  width: number;
  height: number;
  depth: number;
  italic_correction: number;
  lig_kern_program?: unknown;
  next_larger_char?: number;
  extensible_recipe?: number;
}

interface Header {
  checksum: number;
  design_size: number;
  coding_scheme: string;
  family: string;
  seven_bit_safe_flag: number;
  face: number;
}

/** The first data array is a block of header information, which contains general facts about the font.
 * The header must contain at least two words, and for TFM files to be used with Xerox printing software it must contain at least 18 words, allocated as described below.
 *
 * ``header[0]`` is a 32-bit check sum that TEX will copy into the DVI output file whenever it uses the font.  Later on when the DVI file is printed, possibly on another computer, the actual font that gets used is supposed to have a check sum that agrees with the one in the TFM file used by TEX.
 * In this way, users will be warned about potential incompatibilities.
 * (However, if the check sum is zero in either the font file or the TFM file, no check is made.)
 * The actual relation between this check sum and the rest of the TFM file is not important; the check sum is simply an identification number with the property that incompatible fonts almost always have distinct check sums.
 *
 * ``header[1]`` is a fix word containing the design size of the font, in units of TEX points (7227 TEX points = 254 cm).
 * This number must be at least 1.0; it is fairly arbitrary, but usually the design size is 10.0 for a "10 point" font, i.e., a font that was designed to look best at a 10-point size, whatever that really means.
 * When a TEX user asks for a font "at delta pt", the effect is to override the design size and replace it by delta, and to multiply the x and y coordinates of the points in the font image by a factor of delta divided by the design size.
 * All other dimensions in the TFM file are fix word numbers in design-size units.
 * Thus, for example, the value of ``param[6]``, one em or ``\quad``, is often the fix word value ``2**20 = 1.0``, since many fonts have a design size equal to one em.
 * The other dimensions must be less than 16 design-size units in absolute value; thus, ``header[1]`` and ``param[1]`` are the only fix word entries in the whole TFM file whose first byte might be something besides 0 or 255.
 *
 * ``header[2 ... 11]``, if present, contains 40 bytes that identify the character coding scheme.
 * The first byte, which must be between 0 and 39, is the number of subsequent ASCII bytes actually relevant in this string, which is intended to specify what character-code-to-symbol convention is present in the font.
 * Examples are ASCII for standard ASCII, TeX text for fonts like cmr10 and cmti9, TeX math extension for cmex10, XEROX text for Xerox fonts, GRAPHIC for special-purpose non- alphabetic fonts, UNSPECIFIED for the default case when there is no information.
 * Parentheses should not appear in this name.
 * (Such a string is said to be in BCPL format.)
 *
 * ``header[12 ... 16]``, if present, contains 20 bytes that name the font family (e.g., CMR or HELVETICA), in BCPL format.
 * This field is also known as the "font identifier."
 *
 * ``header[17]``, if present, contains a first byte called the ``seven_bit_safe_flag``, then two bytes that are ignored, and a fourth byte called the ``face``.
 * If the value of the fourth byte is less than 18, it has the following interpretation as a "weight, slope, and expansion": Add 0 or 2 or 4 (for medium or bold or light) to 0 or 1 (for roman or italic) to 0 or 6 or 12 (for regular or condensed or extended).
 * For example, 13 is ``0+1+12``, so it represents medium italic extended.
 * A three-letter code (e.g., MIE) can be used for such face data.
 *
 * ``header[18 ... whatever]`` might also be present; the individual words are simply called ``header[18]``, ``header[19]``, etc., at the moment.
 */
const readHeader = (buffer: ArrayBuffer): Header => {
  const view = new DataView(buffer);
  const checksum = view.getUint32(0);
  const design_size = view.getUint32(4);

  const codingSchemeLength = view.getUint8(8);
  if (codingSchemeLength > 39) throw new Error("Invalid TFM file");

  const coding_scheme = new TextDecoder().decode(
    buffer.slice(9, 9 + codingSchemeLength),
  );

  const familyLength = view.getUint8(48);
  if (familyLength > 20) throw new Error("Invalid TFM file");
  const family = new TextDecoder().decode(buffer.slice(49, 49 + familyLength));

  const header17 = new Uint8Array(buffer, 68, 4);
  const seven_bit_safe_flag = header17[0];
  const face = header17[3];

  return {
    checksum,
    design_size,
    coding_scheme,
    family,
    seven_bit_safe_flag,
    face,
  };
};

interface CharInfoBase {
  width_index: number;
  height_index: number;
  depth_index: number;
  italic_index: number;
}
interface NormalCharInfo extends CharInfoBase {
  type?: undefined;
}
interface LigKernCharInfo extends CharInfoBase {
  type: "lig";
  lig_kern_index: number;
}
interface LinkCharInfo extends CharInfoBase {
  type: "link";
  next_larger_char: number;
}
interface ExtensibleCharInfo extends CharInfoBase {
  type: "ext";
  extensible_index: number;
}
type CharInfo =
  | NormalCharInfo
  | LigKernCharInfo
  | LinkCharInfo
  | ExtensibleCharInfo;

/** Next comes the char info array, which contains one char info word per character.
 * Each char info word contains six fields packed into four bytes as follows.
 *
 * - first byte: ``width_index`` (8 bits)
 * - second byte: ``height_index`` (4 bits) times 16, plus ``depth_index`` (4 bits)
 * - third byte: ``italic_index`` (6 bits) times 4, plus ``tag`` (2 bits)
 * - fourth byte: ``remainder`` (8 bits)
 *
 * The actual width of a character is ``width[width_index]``, in design-size units; this is a device for compressing information, since many characters have the same width.
 * Since it is quite common for many characters to have the same height, depth, or italic correction, the TFM format imposes a limit of 16 different heights, 16 different depths, and 64 different italic corrections.
 *
 * Incidentally, the relation ``width[0] = height[0] = depth[0] = italic[0] = 0`` should always hold, so that an index of zero implies a value of zero.
 * The width index should never be zero unless the character does not exist in the font, since a character is valid if and only if it lies between ``bc`` and ``ec`` and has a nonzero width index.
 *
 * The tag field in a char info word has four values that explain how to interpret the remainder field.
 *
 * - ``tag = 0`` (``no_tag``) means that remainder is unused.
 * - ``tag = 1`` (``lig_tag``) means that this character has a ligature/kerning program starting at ``lig_kern[remainder]``.
 * - ``tag = 2`` (``list_tag``) means that this character is part of a chain of characters of ascending sizes, and not the largest in the chain.
 * The remainder field gives the character code of the next larger character.
 * - ``tag = 3`` (``ext_tag``) means that this character code represents an extensible character, i.e., a character that is built up of smaller pieces so that it can be made arbitrarily large.
 * The pieces are specified in ``exten[remainder]``.
 * - ``no_tag = 0`` vanilla character
 * - ``lig_tag = 1`` character has a ligature/kerning program
 * - ``list_tag = 2`` character has a successor in a charlist
 * - ``ext_tag = 3`` character is extensible
 */
const readCharacterInfo = (
  buffer: number[],
): CharInfo[] =>
  buffer.map((charInfo) => {
    const width_index = charInfo >> 24;
    const height_index = (charInfo >> 20) & 0b1111;
    const depth_index = (charInfo >> 16) & 0b1111;
    const italic_index = (charInfo >> 10) & 0x111111;
    const tag = (charInfo >> 8) & 0b11;
    const remainder = charInfo & 0b11111111;
    switch (tag) {
      case LIG_TAG:
        return {
          type: "lig",
          width_index,
          height_index,
          depth_index,
          italic_index,
          lig_kern_index: remainder,
        };
      case LIST_TAG:
        return {
          type: "link",
          width_index,
          height_index,
          depth_index,
          italic_index,
          next_larger_char: remainder,
        };
      case EXT_TAG:
        return {
          type: "ext",
          width_index,
          height_index,
          depth_index,
          italic_index,
          extensible_index: remainder,
        };
      default:
        return {
          width_index,
          height_index,
          depth_index,
          italic_index,
        };
    }
  });

/** The lig kern array contains instructions in a simple programming language that explains what to do for special letter pairs.
 * Each word is a lig kern command of four bytes.
 *
 * - first byte: ``skip_byte``, indicates that this is the final program step if the byte is 128 or more, otherwise the next step is obtained by skipping this number of intervening steps.
 * - second byte: ``next_char``, "if ``next_char`` follows the current character, then perform the operation and stop, otherwise continue."
 * - third byte: ``op_byte``, indicates a ligature step if less than 128, a kern step otherwise.
 * - fourth byte: ``remainder``.
 *
 * In a kern step, an additional space equal to ``kern[256 * (op_byte + 128) + remainder]`` is inserted between the current character and next char.
 * This amount is often negative, so that the characters are brought closer together by kerning; but it might be positive.
 *
 * There are eight kinds of ligature steps, having ``op_byte`` codes ``4a+2b+c`` where ``0 <= a <= b+c`` and ``0 <= b; c <= 1``.
 * The character whose code is remainder is inserted between the current character and next char; then the current character is deleted if ``b = 0``, and next char is deleted if ``c = 0``; then we pass over a characters to reach the next current character (which may have a ligature/kerning program of its own).
 *
 * Notice that if ``a = 0`` and ``b = 1``, the current character is unchanged; if ``a = b`` and ``c = 1``, the current character is changed but the next character is unchanged.
 *
 * If the very first instruction of the lig kern array has ``skip_byte = 255``, the ``next_char`` byte is the so-called right boundary character of this font; the value of ``next_char`` need not lie between ``bc`` and ``ec``.
 * If the very last instruction of the lig kern array has ``skip_byte = 255``, there is a special ligature/kerning program for a left boundary character, beginning at location ``256 * op_byte + remainder``.
 * The interpretation is that TEX puts implicit boundary characters before and after each consecutive string of characters from the same font.
 * These implicit characters do not appear in the output, but they can affect ligatures and kerning.
 *
 * If the very first instruction of a character's ``lig_kern`` program has ``skip_byte > 128``, the program actually begins in location ``256 * op_byte + remainder``.
 * This feature allows access to large lig kern arrays, because the first instruction must otherwise appear in a location ``<= 255``.
 *
 * Any instruction with ``skip_byte > 128`` in the lig kern array must have ``256 * op_byte + remainder < nl``.
 * If such an instruction is encountered during normal program execution, it denotes an unconditional halt; no ligature command is performed.
 */
const readLigKernPrograms = (buffer: number[]) =>
  buffer.map((lig_kernel, i) => {
    const skip_byte = lig_kernel >> 24;
    if ((i === 0 || i === buffer.length) && skip_byte === 255) {
      throw Error(
        `Font has ${
          i === 0 ? "right" : "left"
        } boundary char. This is not supported yet.`,
      );
    }
    const next_char = (lig_kernel >> 16) & 0xff;
    const op_byte = (lig_kernel >> 8) & 0xff;
    const remainder = lig_kernel & 0xff;

    if (op_byte >= KERN_OPCODE) {
      // kern step
      // deno-lint-ignore no-unused-vars
      const kern_index = 256 * (op_byte - KERN_OPCODE) + remainder;
      return {
        skip_byte,
        next_char,
        op_byte,
        kern: remainder,
      };
    }

    // Ligature step
    // deno-lint-ignore no-unused-vars
    const number_of_chars_to_pass_over = op_byte >> 2;
    // deno-lint-ignore no-unused-vars
    const current_char_is_deleted = (op_byte & 0x02) == 0;
    // deno-lint-ignore no-unused-vars
    const next_char_is_deleted = (op_byte & 0x01) == 0;
    // deno-lint-ignore no-unused-vars
    const ligature_char_code = remainder;
    return skip_byte >= 128
      ? {
        skip_byte,
        next_char,
        op_byte,
        remainder,
      }
      : {
        skip_byte,
        next_char,
        op_byte,
        kern: remainder,
      };
  });

export type SymbolFontParameter = Omit<FontParameter, "coding_scheme"> & {
  coding_scheme: "TeX math symbols";
  num1: number;
  num2: number;
  num3: number;
  denom1: number;
  denom2: number;
  sup1: number;
  sup2: number;
  sup3: number;
  sub1: number;
  sub2: number;
  supdrop: number;
  subdrop: number;
  delim1: number;
  delim2: number;
  axis_height: number;
  default_rule_thickness?: undefined;
  big_op_spacing?: undefined;
};
export type ExtensionFontParameter = Omit<FontParameter, "coding_scheme"> & {
  coding_scheme: "TeX math extension" | "euler substitutions only";
  default_rule_thickness: number;
  big_op_spacing: [number, number, number, number, number];
};

export type ItalicFontParameter =
  & Omit<FontParameter, "coding_scheme" | "extra_space">
  & {
    coding_scheme: "TeX math italic";
  };

export interface FontParameter {
  coding_scheme: string;
  slant: number;
  spacing: number;
  space_stretch: number;
  space_shrink: number;
  x_height: number;
  quad: number;
  extra_space: number;
}

/** The final portion of a TFM fie is the param array, which is another sequence of fix word values.
 *
 * - param[1] = ``slant`` is the amount of italic slant, which is used to help position accents.
 * For example, ``slant = .25`` means that when you go up one unit, you also go .25 units to the right.
 * The slant is a pure number; it's the only fix word other than the design size itself that is not scaled by the design size.
 * - param[2] = ``space`` is the normal spacing between words in text. Note that character " " in the font need not have anything to do with blank spaces.
 * - param[3] = ``space_stretch`` is the amount of glue stretching between words.
 * - param[4] = ``space_shrink`` is the amount of glue shrinking between words.
 * - param[5] = ``x_height`` is the height of letters for which accents don't have to be raised or lowered.
 * - param[6] = ``quad`` is the size of one em in the font.
 * - param[7] = ``extra_space`` is the amount added to param[2] at the ends of sentences.
 *
 * When the character coding scheme is ``TeX math symbols``, the font is supposed to have 15 additional parameters called ``num1``, ``num2``, ``num3``, ``denom1``, ``denom2``, ``sup1``, ``sup2``, ``sup3``, ``sub1``, ``sub2``, ``supdrop``, ``subdrop``, ``delim1``, ``delim2``, and ``axis_height``, respectively.
 * When the character coding scheme is ``TeX math extension``, the font is supposed to have six additional parameters called ``defaul_rule_thickness`` and ``big_op_spacing1`` through ``big_op_spacing5``.
 */
const readFontParamerters = (
  buffer: number[],
  codingScheme: string,
):
  | SymbolFontParameter
  | ExtensionFontParameter
  | ItalicFontParameter
  | FontParameter => {
  //  Set the font parameters.
  const slant = buffer[0];
  const spacing = buffer[1];
  const space_stretch = buffer[2];
  const space_shrink = buffer[3];
  const x_height = buffer[4];
  const quad = buffer[5];
  if (codingScheme === "TeX math italic") {
    return {
      coding_scheme: codingScheme,
      slant,
      spacing,
      space_stretch,
      space_shrink,
      x_height,
      quad,
    };
  }
  const extra_space = buffer[6];

  if (codingScheme === "TeX math symbols") {
    /*  Set the math symbols parameters.  */
    const num1 = buffer[7];
    const num2 = buffer[8];
    const num3 = buffer[9];
    const denom1 = buffer[10];
    const denom2 = buffer[11];
    const sup1 = buffer[12];
    const sup2 = buffer[13];
    const sup3 = buffer[14];
    const sub1 = buffer[15];
    const sub2 = buffer[16];
    const supdrop = buffer[17];
    const subdrop = buffer[18];
    const delim1 = buffer[19];
    const delim2 = buffer[20];
    const axis_height = buffer[21];

    return {
      coding_scheme: codingScheme,
      slant,
      spacing,
      space_stretch,
      space_shrink,
      x_height,
      quad,
      extra_space,
      num1,
      num2,
      num3,
      denom1,
      denom2,
      sup1,
      sup2,
      sup3,
      sub1,
      sub2,
      supdrop,
      subdrop,
      delim1,
      delim2,
      axis_height,
    };
  }

  if (
    codingScheme === "TeX math extension" ||
    codingScheme === "euler substitutions only"
  ) {
    const default_rule_thickness = buffer[7];
    const big_op_spacing = buffer.slice(8, 8 + 5) as [
      number,
      number,
      number,
      number,
      number,
    ];
    return {
      coding_scheme: codingScheme,
      slant,
      spacing,
      space_stretch,
      space_shrink,
      x_height,
      quad,
      extra_space,
      default_rule_thickness,
      big_op_spacing,
    };
  }

  return {
    coding_scheme: codingScheme,
    slant,
    spacing,
    space_stretch,
    space_shrink,
    x_height,
    quad,
    extra_space,
  };
};
