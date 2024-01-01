import {
  BOP,
  DOWN,
  DOWN2,
  DOWN3,
  DOWN4,
  EOP,
  FNT,
  FNT1,
  FNT2,
  FNT3,
  FNT4,
  FNT_DEF,
  FNT_DEF2,
  FNT_DEF3,
  FNT_DEF4,
  NOP,
  POP,
  POST,
  POST_POST,
  PRE,
  PUSH,
  PUT2,
  PUT3,
  PUT4,
  PUT_CHAR,
  PUT_RULE,
  RIGHT,
  RIGHT2,
  RIGHT3,
  RIGHT4,
  SET1,
  SET2,
  SET3,
  SET4,
  SET_CHAR,
  SET_RULE,
  W,
  W1,
  W2,
  W3,
  W4,
  X,
  X1,
  X2,
  X3,
  X4,
  XXX,
  XXX2,
  XXX3,
  XXX4,
  Y,
  Y1,
  Y2,
  Y3,
  Y4,
  Z,
  Z1,
  Z2,
  Z3,
  Z4,
} from "./const.ts";

// 133	put1	c[1]	typeset a character
// 134	put2	c[2]
// 135	put3	c[3]
// 136	put4	c[4]
export interface PutChar {
  opcode: typeof PUT_CHAR;
  c: number;
}

// 0...127	set_char_i		typeset a character and move right
// 128	set1	c[1]	                typeset a character and move right
// 129	set2	c[2]
// 130	set3	c[3]
// 131	set4	c[4]

export interface SetChar {
  opcode: typeof SET_CHAR;
  c: number;
}

// 137	put_rule	a[4], b[4]	typeset a rule
export interface PutRule {
  opcode: typeof PUT_RULE;
  a: number;
  b: number;
}

// 132	set_rule	a[4], b[4]	typeset a rule and move right

export interface SetRule {
  opcode: typeof SET_RULE;
  a: number;
  b: number;
}

// 138	nop		no operation

export interface Nop {
  opcode: typeof NOP;
}

// 139	bop	c_0[4]..c_9[4], p[4]	beginning of page
export interface Bop {
  opcode: typeof BOP;
  c_0: number;
  c_1: number;
  c_2: number;
  c_3: number;
  c_4: number;
  c_5: number;
  c_6: number;
  c_7: number;
  c_8: number;
  c_9: number;
  p: number;
}

// 140	eop		ending of page
export interface Eop {
  opcode: typeof EOP;
}

// 141	push		save the current positions
export interface Push {
  opcode: typeof PUSH;
}

// 142	pop		restore previous positions
export interface Pop {
  opcode: typeof POP;
}

// 143	right1	b[1]	move right
// 144	right2	b[2]
// 145	right3	b[3]
// 146	right4	b[4]
export interface MoveRight {
  opcode: typeof RIGHT;
  b: number;
}

// 147	w0		move right by w
// 148	w1	b[1]	move right and set w
// 149	w2	b[2]
// 150	w3	b[3]
// 151	w4	b[4]

export interface MoveW {
  opcode: typeof W;
  b: number;
}

// 152	x0		move right by x
// 153	x1	b[1]	move right and set x
// 154	x2	b[2]
// 155	x3	b[3]
// 156	x4	b[4]

export interface MoveX {
  opcode: typeof X;
  b: number;
}

// 157	down1	a[1]	move down
// 158	down2	a[2]
// 159	down3	a[3]
// 160	down4	a[4]

export interface MoveDown {
  opcode: typeof DOWN;
  a: number;
}

// 161	y0		move down by y
// 162	y1	a[1]	move down and set y
// 163	y2	a[2]
// 164	y3	a[3]
// 165	y4	a[4]

export interface MoveY {
  opcode: typeof Y;
  a: number;
}

// 166	z0		move down by z
// 167	z1	a[1]	move down and set z
// 168	z2	a[2]
// 169	z3	a[3]
// 170	z4	a[4]

export interface MoveZ {
  opcode: typeof Z;
  a: number;
}

// 171...234	fnt_num_i		set current font to i
// 235	fnt1	k[1]	set current font
// 236	fnt2	k[2]
// 237	fnt3	k[3]
// 238	fnt4	k[4]
export interface SetFont {
  opcode:
    | typeof FNT
    | typeof FNT1
    | typeof FNT2
    | typeof FNT3
    | typeof FNT4;
  k: number;
}

// 239	xxx1	k[1], x[k]	extension to DVI primitives
// 240	xxx2	k[2], x[k]
// 241	xxx3	k[3], x[k]
// 242	xxx4	k[4], x[k]
export interface XXX {
  opcode: typeof XXX;
  x: Uint8Array;
  k: number;
}

// 243	fnt_def1	k[1], c[4], s[4], d[4],
// a[1], l[1], n[a+l]	define the meaning of a font number
// 244	fnt_def2	k[2], c[4], s[4], d[4],
// a[1], l[1], n[a+l]
// 245	fnt_def3	k[3], c[4], s[4], d[4],
// a[1], l[1], n[a+l]
// 246	fnt_def4	k[4], c[4], s[4], d[4],
// a[1], l[1], n[a+l]
export interface FontDefinition {
  opcode: typeof FNT_DEF;
  /** font id */
  k: number;
  /** checksum */
  c: number;
  /** fixed-point scale factor (applied to char widths of font) */
  s: number;
  /** design-size factors with the magnification (`s/1000`) */
  d: number;
  /** length of directory path of font (`./` if a = 0) */
  a: number;
  /** length of font name */
  l: number;
  /** font name (first `a` bytes is dir, remaining `l` = name) */
  n: string;
}

// 247	pre	i[1], num[4], den[4], mag[4],  k[1], x[k]	preamble
export interface Preamble {
  opcode: typeof PRE;
  i: number;
  num: number;
  den: number;
  mag: number;
  x: string;
  k: number;
}

// 248	post	p[4], num[4], den[4], mag[4], l[4], u[4], s[2], t[2]
// < font definitions >	postamble beginning
export interface Post {
  opcode: typeof POST;
  p: number;
  num: number;
  den: number;
  mag: number;
  l: number;
  u: number;
  s: number;
  t: number;
}

// 249	post_post	q[4], i[1]; 223's	postamble ending

export interface PostPost {
  opcode: typeof POST_POST;
  q: number;
  i: number;
}

// 250...255	undefined

export type Command = Readonly<
  | SetChar
  | SetRule
  | PutChar
  | PutRule
  | Nop
  | Bop
  | Eop
  | Push
  | Pop
  | MoveRight
  | MoveW
  | MoveX
  | MoveDown
  | MoveY
  | MoveZ
  | SetFont
  | XXX
  | FontDefinition
  | Preamble
  | Post
  | PostPost
>;

export interface DviCommand {
  opcode: number;
}

const parseCommand = (
  buffer: Uint8Array,
): [Command, number] | undefined => {
  const opcode = buffer[0];
  if ((SET_CHAR <= opcode) && (opcode < SET1)) {
    return [{ opcode: SET_CHAR, c: opcode }, 1];
  }

  if ((FNT <= opcode) && (opcode < FNT1)) {
    return [{ opcode: FNT, k: opcode - FNT }, 1];
  }

  // Technically these are undefined opcodes, but we'll pretend they are NOPs
  if ((POST_POST < opcode) && (opcode <= 255)) {
    return [{ opcode: NOP }, 1];
  }

  const view = new DataView(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength,
  );

  switch (opcode) {
    case SET1:
    case SET2:
    case SET3:
    case SET4: {
      const charLength = (opcode - SET1 + 1) as (1 | 2 | 3 | 4);
      if (buffer.byteLength < charLength + 1) return;
      return [{
        opcode: SET_CHAR,
        c: readUint(buffer, 1, charLength),
      }, charLength + 1];
    }
    case SET_RULE:
    case PUT_RULE:
      if (buffer.byteLength < 9) return;
      return [
        { opcode, a: view.getInt32(1), b: view.getInt32(5) },
        9,
      ];
    case PUT_CHAR:
    case PUT2:
    case PUT3:
    case PUT4: {
      const charLength = (opcode - SET1 + 1) as (1 | 2 | 3 | 4);
      if (buffer.byteLength < charLength + 1) return;
      return [{
        opcode: PUT_CHAR,
        c: readUint(buffer, 1, charLength),
      }, charLength + 1];
    }
    case NOP:
    case EOP:
    case PUSH:
    case POP:
      return [{ opcode }, 1];
    case BOP:
      if (buffer.byteLength < 45) return;
      return [{
        opcode,
        c_0: view.getUint32(1),
        c_1: view.getUint32(5),
        c_2: view.getUint32(9),
        c_3: view.getUint32(13),
        c_4: view.getUint32(17),
        c_5: view.getUint32(21),
        c_6: view.getUint32(25),
        c_7: view.getUint32(29),
        c_8: view.getUint32(33),
        c_9: view.getUint32(37),
        p: view.getInt32(41),
      }, 45];
    case RIGHT:
    case RIGHT2:
    case RIGHT3:
    case RIGHT4: {
      const length = (opcode - RIGHT + 1) as (1 | 2 | 3 | 4);
      if (buffer.byteLength < length + 1) return;
      return [
        {
          opcode: RIGHT,
          b: readInt(buffer, 1, length),
        },
        length + 1,
      ];
    }
    case W:
    case X:
      return [{ opcode, b: 0 }, 1];
    case W1:
    case W2:
    case W3:
    case W4: {
      const length = (opcode - W) as (1 | 2 | 3 | 4);
      if (buffer.byteLength < length + 1) return;
      return [{
        opcode: W,
        b: readInt(buffer, 1, length),
      }, length + 1];
    }
    case X1:
    case X2:
    case X3:
    case X4: {
      const length = (opcode - X) as (1 | 2 | 3 | 4);
      if (buffer.byteLength < length + 1) return;
      return [{
        opcode: X,
        b: readInt(buffer, 1, length),
      }, length + 1];
    }
    case DOWN:
    case DOWN2:
    case DOWN3:
    case DOWN4: {
      const length = (opcode - DOWN + 1) as (1 | 2 | 3 | 4);
      if (buffer.byteLength < length + 1) return;
      return [{
        opcode: DOWN,
        a: readInt(buffer, 1, length),
      }, length + 1];
    }
    case Y:
    case Z:
      return [{ opcode, a: 0 }, 1];
    case Y1:
    case Y2:
    case Y3:
    case Y4: {
      const length = (opcode - Y) as (1 | 2 | 3 | 4);
      if (buffer.byteLength < length + 1) return;
      return [{
        opcode: Y,
        a: readInt(buffer, 1, length),
      }, length + 1];
    }
    case Z1:
    case Z2:
    case Z3:
    case Z4: {
      const length = (opcode - Z) as (1 | 2 | 3 | 4);
      if (buffer.byteLength < length + 1) return;
      return [{
        opcode: Z,
        a: readInt(buffer, 1, length),
      }, length + 1];
    }
    case FNT1:
    case FNT2:
    case FNT3:
    case FNT4: {
      const length = (opcode - FNT1 + 1) as (1 | 2 | 3 | 4);
      if (buffer.byteLength < length + 1) return;
      return [{
        opcode: FNT,
        k: readInt(buffer, 1, length),
      }, length + 1];
    }
    case XXX:
    case XXX2:
    case XXX3:
    case XXX4: {
      const length = (opcode - XXX + 1) as (1 | 2 | 3 | 4);
      if (buffer.byteLength < length + 1) return;
      const k = readUint(buffer, 1, length);
      if (buffer.byteLength < length + 1 + k) return;
      return [{
        opcode: XXX,
        x: buffer.subarray(length + 1, length + 1 + k),
        k,
      }, length + 1 + k];
    }
    case FNT_DEF:
    case FNT_DEF2:
    case FNT_DEF3:
    case FNT_DEF4: {
      const length = (opcode - FNT_DEF + 1) as (1 | 2 | 3 | 4);
      if (buffer.byteLength < length + 1) return;
      const k = readInt(buffer, 1, length);
      if (buffer.byteLength < length + 15) return;
      const a = buffer[length + 13];
      const l = buffer[length + 14];
      if (buffer.byteLength < length + 15 + a + l) return;
      return [{
        opcode: FNT_DEF,
        k,
        c: view.getUint32(length + 1),
        s: view.getUint32(length + 5),
        d: view.getUint32(length + 9),
        a,
        l,
        n: new TextDecoder().decode(
          buffer.subarray(length + 15, length + 15 + a + l),
        ),
      }, length + 15 + a + l];
    }
    case PRE: {
      if (buffer.byteLength < 15) return;
      const i = buffer[1];
      const k = buffer[14];
      if (buffer.byteLength < 15 + k) return;
      return [{
        opcode,
        i,
        num: view.getUint32(2),
        den: view.getUint32(6),
        mag: view.getUint32(10),
        x: new TextDecoder().decode(buffer.subarray(15, 15 + k)),
        k,
      }, 15 + k];
    }
    case POST:
      if (buffer.byteLength < 29) return;
      return [{
        opcode,
        p: view.getUint32(1),
        num: view.getUint32(5),
        den: view.getUint32(9),
        mag: view.getUint32(13),
        l: view.getUint32(17),
        u: view.getUint32(21),
        s: view.getUint16(25),
        t: view.getUint16(27),
      }, 29];
    case POST_POST:
      if (buffer.byteLength < 6) return;
      return [{
        opcode,
        q: view.getUint32(1),
        i: view.getUint8(5),
      }, 6];
  }
  return;
};

/**
 * Parses the given DVI (Device Independent) data and yields a sequence of commands.
 *
 * @param dvi - The DVI data to parse, represented as a Uint8Array.
 * @returns A generator that yields each parsed command.
 * @throws An error if an invalid command is encountered or if there are more than 223 bytes after the post-postamble.
 */
export function* tokenize(dvi: Uint8Array): Generator<Command> {
  let buffer = dvi;
  let offset = 0;

  while (offset < dvi.byteLength) {
    const [command, length] = parseCommand(buffer) ?? [, 0];
    offset += length;
    buffer = buffer.subarray(length);
    if (!command) break;
    if (command.opcode === POST_POST) {
      if (buffer.every((byte) => byte === 223)) break;
      throw Error("Only 223 bytes are permitted after the post-postamble.");
    }
    yield command;
  }
}

/** read bytes as Big Endian */
const readUint = (
  buffer: Uint8Array,
  offset: number,
  length: number,
) =>
  [...buffer.subarray(offset, offset + length)].reduce(
    (acc, cur, i) => acc + cur * 256 ** (length - i - 1),
    0,
  );

const readInt = (buffer: Uint8Array, offset: number, length: 1 | 2 | 3 | 4) => {
  switch (length) {
    case 1:
      return buffer[offset];
    case 2: {
      const val = buffer[offset] * 2 ** 8 + buffer[offset + 1];
      return val | (val & 2 ** 15) * 0x1fffe;
    }
    case 3: {
      const val = buffer[offset] * 2 ** 16 + buffer[offset + 1] * 2 ** 8 +
        buffer[offset + 2];
      return val | (val & 2 ** 23) * 0x1fe;
    }
    case 4:
      return (buffer[offset] << 24) +
        buffer[offset + 1] * 2 ** 16 + buffer[offset + 2] * 2 ** 8 +
        buffer[offset + 3];
  }
};
