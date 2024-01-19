import { Matrix, rotate, scale, translate } from "./matrix.ts";

const stateQueue: Matrix[] = [];

/** Postscript interpreter.
 * Most postscript is not implemented.
 * There is enough implemented to perform the basic operations that result from the LaTeX commands \scalebox,
 * \rotatebox, and \resizebox, and a little more that is incomplete and mostly untested.
 */
export const interpret = (
  psInput: string,
  matrix: Matrix,
  horizontal: number,
  vertical: number,
) => {
  const stack: StackObject[] = [];
  const temp = { matrix, horizontal, vertical };

  /** The value of each key is the number of parameters from the stack it needs. */
  const operators = {
    // Stack operators
    pop: () => stack.pop(),

    exch: () => {
      const a1 = stack.pop();
      const a2 = stack.pop();
      if (a1) stack.push(a1);
      if (a2) stack.push(a2);
    },

    dup: () => {
      stack.push(stack[stack.length - 1]);
    },

    mark: () => stack.push(new PSMark()),

    // Math operators
    neg: () => {
      const x = stack.pop();
      if (!x) return;
      stack.push(new PSNumber(-x.value));
    },

    add: () => {
      const x = stack.pop();
      const y = stack.pop();
      if (!x) return;
      if (!y) return;
      stack.push(new PSNumber(x.value + y.value));
    },

    sub: () => {
      const x = stack.pop();
      const y = stack.pop();
      if (!x) return;
      if (!y) return;
      stack.push(new PSNumber(y.value - x.value));
    },

    mul: () => {
      const x = stack.pop();
      const y = stack.pop();
      if (!x) return;
      if (!y) return;
      stack.push(new PSNumber(x.value * y.value));
    },

    div: () => {
      const x = stack.pop();
      const y = stack.pop();
      if (!x) return;
      if (!y) return;
      stack.push(new PSNumber(y.value / x.value));
    },

    // Graphics state operators
    gsave: () => stateQueue.push([...matrix]),

    grestore: () => {
      const mat = stateQueue.pop();
      if (!mat) return;
      temp.matrix = mat;
    },

    // Path construction operators
    currentpoint: () => stack.push(new PSNumber(temp.x), new PSNumber(temp.y)),

    moveto: () => {
      const y = stack.pop();
      const x = stack.pop();
      temp.horizontal = x?.value;
      temp.vertical = y?.value;
    },

    // Coordinate system and matrix operators
    scale: () => {
      const y = stack.pop();
      const x = stack.pop();
      if (!x) return;
      if (!y) return;
      temp.matrix = scale(temp.matrix, x.value, y.value);
    },

    translate: () => {
      const y = stack.pop();
      const x = stack.pop();
      if (!x) return;
      if (!y) return;
      temp.matrix = translate(temp.matrix, x.value, y.value);
    },

    rotate: () => {
      // r is in degrees
      const r = stack.pop();
      if (!r) return;
      temp.matrix = rotate(temp.matrix, r.value);
    },
  };

  for (const token of tokens(psInput)) {
    // Numeric literals
    if (/^[+-]?\d+(\.\d*)?$/.test(token)) {
      stack.push(new PSNumber(token));
      continue;
    }
    // String literals
    if (token[0] === "(") {
      stack.push(new PSString(token));
      continue;
    }
    // Array start (same as a mark)
    if (token === "[") {
      operators.mark();
      continue;
    }
    // Array end
    if (token === "]") {
      const array = new PSArray();
      const elt = stack.pop();
      if (!elt) continue;
      while (elt.name !== "mark") array.push(elt);
      stack.push(array);
    }
    // Identifiers (i.e. Variables)
    if (token[0] === "/") {
      stack.push(new PSIdentifier(token));
    }
    // Procedures
    if (token[0] === "{") {
      stack.push(new PSProcedure(token));
    }
    // Operators
    if (token in operators) {
      //@ts-ignore no-explicit-any
      operators[token](this);
      continue;
    }
    throw Error("Invalid or unimplemented postscript expression");
  }

  return temp;
};

// Parse a string into tokens.  This method attempts to emulate ghostscript's parsing.
function* tokens(input: string) {
  let token = "";
  let stringLevel = 0;
  let procedureLevel = 0;

  const charGen = input[Symbol.iterator]();
  for (const character of charGen) {
    let nextChar: IteratorResult<string> | undefined = undefined;
    switch (character) {
      case " ": // White space characters
      case "\t":
      case "\n":
        if (procedureLevel) {
          if (token[token.length - 1] !== " ") token += " ";
          continue;
        }
        if (stringLevel) {
          switch (character) {
            case " ":
              token += " ";
              break;
            case "\n":
              token += "\\n";
              break;
            case "\t":
              token += "\\t";
              break;
          }
          continue;
        }
        if (token) {
          yield token;
          token = "";
        }
        continue;
      case "[": // Array delimiters
      case "]":
        if (!procedureLevel && !stringLevel) {
          if (token) yield token;
          token = "";
          yield character;
          continue;
        }
        token += character;
        continue;
      case "{": // Procedure delimiters
        if (!stringLevel) {
          if (procedureLevel == 0 && token) yield token;
          ++procedureLevel;
        }
        token += character;
        continue;
      case "}":
        token += character;
        if (stringLevel) continue;
        --procedureLevel;
        if (procedureLevel) continue;
        yield token;
        token = "";
        continue;
      case "(": // String delimiters
        ++stringLevel;
        if (token && !procedureLevel && stringLevel == 1) yield token;
        if (stringLevel > 1) token += "\\";
        token += character;
        continue;
      case ")":
        --stringLevel;
        if (stringLevel) token += "\\";
        token += character;
        if (procedureLevel || stringLevel) continue;
        yield token;
        token = "";
        continue;
      case "\\": // Escape character
        token += character;
        nextChar = charGen.next();
        if (nextChar.done) throw Error("Invalid escape character.");
        if (!nextChar.done) token += nextChar.value;
        continue;
      case "/": // Name start
        if (!procedureLevel && !stringLevel && token) yield token;
        token += character;
        continue;
      case "%": // Comments
        do {
          nextChar = charGen.next();
        } while (!nextChar.done && nextChar.value !== "\n");
        continue;
      default: // Any other character
        token += character;
    }
  }
  if (token) yield token;
}

// Postscript stack objects
abstract class StackObject {
  name: string;
  // deno-lint-ignore no-explicit-any
  value: any;
  constructor(name: string) {
    this.name = name;
  }
}

// Stack number
class PSNumber extends StackObject {
  constructor(value: number | string) {
    super("number");
    this.value = typeof value === "number" ? value : parseFloat(value);
  }
}

// Stack string
class PSString extends StackObject {
  constructor(value: string) {
    super("string");
    this.value = value.replace(/^\(|\)$/g, "");
  }
}

// Stack array
class PSArray extends StackObject {
  constructor(value?: StackObject[]) {
    super("array");
    this.value = value || [];
  }

  push(elt: StackObject) {
    this.value.push(elt);
  }

  pop(): StackObject {
    return this.value.pop();
  }
}

// Stack mark
class PSMark extends StackObject {
  constructor() {
    super("mark");
    this.value = "-mark-";
  }
}

// Stack identifier
class PSIdentifier extends StackObject {
  constructor(value: string) {
    super("identifier");
    this.value = value.replace(/^\//, "");
  }
}

// Stack procedure object
class PSProcedure extends StackObject {
  constructor(value: string) {
    super("procedure");
    this.value = value;
  }
}
