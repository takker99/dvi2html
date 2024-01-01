import desiredFonts from "../fontlist.json" assert { type: "json" };

const kpsewhich = async (s: string) => {
  const result = new Deno.Command("kpsewhich", {
    args: [s],
  });
  const { stdout, stderr, success } = await result.output();
  if (!success) throw Error(new TextDecoder().decode(stderr));
  return new TextDecoder().decode(stdout).trim();
};

const loadGlyphList = async (s: string) => {
  const filename = await kpsewhich(s);
  const list = new TextDecoder().decode(await Deno.readFile(filename));
  const result: Record<string, number> = {};

  for (const line of list.split("\n")) {
    const [name, encoding] = line.replace(/#.*/, "").split(";");
    if (!name || !encoding) continue;
    const encodings = encoding.split(",")
      .filter((e: string) => e.length == 4)
      .map((e: string) => parseInt(e, 16));
    const best = Math.min(...encodings);
    result[name] = best;
  }

  return result;
};

const loadAllGlyphs = async () => {
  const glyphs1 = await loadGlyphList("glyphlist.txt");
  const glyphs2 = await loadGlyphList("texglyphlist.txt");
  Object.assign(glyphs1, glyphs2);

  glyphs1["suppress"] = 0;
  glyphs1["mapsto"] = 0x21A6;
  glyphs1["arrowhookleft"] = 0x21A9;
  glyphs1["arrowhookright"] = 0x21AA;
  glyphs1["tie"] = 0x2040;

  return glyphs1;
};

function* tokenize(chars: string) {
  const iterator = chars[Symbol.iterator]();
  let ch = getNextItem(iterator);
  do {
    //ch = getNextItem(iterator);
    // skip comments
    if (ch === "%") {
      do {
        ch = getNextItem(iterator);
      } while (ch !== "\n");
    }
    if (typeof ch === "string" && /^[\[\]\{\}]$/.test(ch)) {
      yield ch;
    } else if ((ch == "/") || isWordChar(ch)) {
      let word = "";
      do {
        word += ch;
        ch = getNextItem(iterator);
      } while (isWordChar(ch));
      yield word;
      continue;
    }
    ch = getNextItem(iterator);
    // Ignore all other characters
  } while (ch !== undefined);
}
const getNextItem = (iterator: Iterator<string>) => {
  const item = iterator.next();
  return item.done ? undefined : item.value;
};

const isWordChar = (ch?: string): ch is string =>
  typeof ch === "string" && /^[\.A-Za-z0-9]$/.test(ch);

const glyphToCodepoint = (glyphs: Record<string, number>, name: string) => {
  if (Object.hasOwn(glyphs, name)) return glyphs[name];

  if (name === ".notdef") return 0;

  if (/^u[0-9A-Fa-f]+$/.test(name)) return parseInt(name.slice(1), 16);

  throw `${name} is not a glyphname`;
};

const execute = (
  token: string,
  stack: (number | string[])[],
  // deno-lint-ignore no-explicit-any
  state: { brace?: any; bracket?: any },
  table: number[],
  glyphs: Record<string, number>,
) => {
  if (token == "repeat") {
    // deno-lint-ignore no-explicit-any
    const code: any = stack.pop();
    // deno-lint-ignore no-explicit-any
    const count: any = stack.pop();
    for (let i = 0; i < count; i++) {
      for (const c of code) {
        execute(c, stack, state, table, glyphs);
      }
    }
    return;
  }

  if (token[0] == "}") {
    state.brace = false;
    return;
  }

  if (state.brace) {
    //@ts-ignore no-explicit-any
    stack[stack.length - 1].push(token);
    return;
  }

  if (token[0] == "{") {
    state.brace = true;
    stack.push([]);
    return;
  }

  if (token[0] == "[") {
    state.bracket = true;
    return;
  }

  if (token[0] == "]") {
    state.bracket = false;
    return;
  }

  if (token[0] == "/") {
    if (state.bracket) {
      table.push(glyphToCodepoint(glyphs, token.slice(1)));
    }

    //@ts-ignore no-explicit-any
    stack.push(token);
    return;
  }

  if (/^[0-9]+$/.test(token)) {
    stack.push(parseInt(token));
    return;
  }
};

const loadEncoding = async (s: string, glyphs: Record<string, number>) => {
  const filename = await kpsewhich(s);
  const encoding = new TextDecoder().decode(await Deno.readFile(filename));
  console.log(s, filename);
  const stack: string[][] = [];
  const state = {};
  const table: number[] = [];
  for (const token of tokenize(encoding)) {
    execute(token, stack, state, table, glyphs);
  }
  return new Uint16Array(table);
};

const main = async () => {
  const glyphs = await loadAllGlyphs();
  const tables: Record<string, Uint16Array> = {};

  const encodings = new Set(Object.values(desiredFonts));
  for (const encoding of encodings) {
    console.log(`Processing ${encoding}...`);
    const table = await loadEncoding(`${encoding}.enc`, glyphs);
    if (table.length !== 256) {
      throw `Expected 256 codepoints but received ${table.length}`;
    }
    tables[encoding] = table;
  }

  const outputPath = new URL("../encodings.json", import.meta.url);
  await Deno.writeTextFile(outputPath, JSON.stringify(tables));
};

await main();
