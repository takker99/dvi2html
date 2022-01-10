import desiredFonts from "./fontlist.json" assert { type: "json" };
import { exec, OutputMode } from "https://deno.land/x/exec@0.0.5/mod.ts";
import { pooledMap } from "https://deno.land/std@0.120.0/async/mod.ts";

async function kpsewhich(s: string) {
  const res = await exec(`kpsewhich ${s}`, {
    output: OutputMode.Capture,
  });
  return res.output;
}

async function loadGlyphList(s: string) {
  const filename = await kpsewhich(s);
  const list = await Deno.readTextFile(filename);

  const result = {} as Record<string, number>;

  for (const line of list.split("\n")) {
    // remove comments and split
    const items = line.replace(/#.*/, "").split(";");
    if (items.length < 2) continue;

    const name = items[0];
    // remove multi-byte characters?
    const encodings = items[1].split(",").filter((e) => e.length == 4).map((
      e,
    ) => parseInt(e, 16));
    const best = Math.min(...encodings);
    result[name] = best;
  }
  return result;
}

async function loadAllGlyphs() {
  const [glyphs1, glyphs2] = await Promise.all([
    loadGlyphList("glyphlist.txt"),
    loadGlyphList("texglyphlist.txt"),
  ]);
  Object.assign(glyphs1, glyphs2);

  // additional glyphs
  glyphs1["suppress"] = 0;
  glyphs1["mapsto"] = 0x21A6;
  glyphs1["arrowhookleft"] = 0x21A9;
  glyphs1["arrowhookright"] = 0x21AA;
  glyphs1["tie"] = 0x2040;
  return glyphs1;
}

/** parse .enc files of dvips */
function* tokenize(chars: string) {
  let i = 0;
  do {
    if (chars[i] === "%") {
      do {
        i++;
      } while (chars[i] !== "\n");
    }
    if (/^[\[\]\{\}]$/.test(chars[i])) {
      // return []{}
      yield chars[i];
    } else if ((chars[i] == "/") || isWordChar(chars[i])) {
      // return word starting with "/"
      let word = "";
      do {
        word += chars[i];
        i++;
      } while (isWordChar(chars[i]));
      yield word;
      continue;
    }
    i++;
    // Ignore all other characters
  } while (i < chars.length);
}
function isWordChar(char: string) {
  return /^[\.A-Za-z0-9]$/.test(char);
}

function glyphToCodepoint(glyphs: Record<string, number>, name: string) {
  if (Object.hasOwn(glyphs, name)) {
    return glyphs[name];
  }

  if (name === ".notdef") {
    return 0;
  }

  if (/^u[0-9A-Fa-f]+$/.test(name)) {
    return parseInt(name.slice(1), 16);
  }

  throw SyntaxError(`${name} is not a glyphname`);
}

async function loadEncoding(s: string, glyphs: Record<string, number>) {
  const filename = await kpsewhich(s);
  const encoding = await Deno.readTextFile(filename);
  const stack = [] as string[];
  const state = { brace: false, bracket: false };
  const table = [] as number[];
  const execute = (token: string) => {
    if (token == "repeat") {
      const code = stack.pop()!;
      const count = stack.pop()!;
      for (let i = 0; i < (count as unknown as number); i++) {
        for (const c of code) {
          execute(c);
        }
      }
      return;
    }

    if (token[0] == "}") {
      state.brace = false;
      return;
    }

    if (state.brace) {
      (stack[stack.length - 1] as unknown as string[]).push(token);
      return;
    }

    if (token[0] == "{") {
      state.brace = true;
      stack.push([] as unknown as string);
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

      stack.push(token);
      return;
    }

    if (/^[0-9]+$/.test(token)) {
      stack.push(parseInt(token) as unknown as string);
      return;
    }
  };
  for (const token of tokenize(encoding)) {
    execute(token);
  }
  return new Uint16Array(table);
}

async function main() {
  const glyphs = await loadAllGlyphs();
  const tables = {} as Record<string, Uint16Array>;

  const encodings = new Set(Object.values(desiredFonts));
  const task = async (encoding: string) => {
    console.log(`Processing ${encoding}...`);
    const table = await loadEncoding(`${encoding}.enc`, glyphs);
    if (table.length !== 256) {
      const message = `Expected 256 codepoints but received ${table.length}`;
      throw Error(message);
    }
    return [encoding, table] as const;
  };
  for (const encoding of encodings) {
    const [, table] = await task(encoding);
    tables[encoding] = table;
  }
  // const results = pooledMap(
  //   10,
  //   encodings,
  //   task,
  // );
  // for await (const [encoding, table] of results) {
  //   tables[encoding] = table;
  // }

  const outputPath = new URL("../src/tfm/encodings.json", import.meta.url);
  await Deno.writeTextFile(outputPath, JSON.stringify(tables));
}

await main();
