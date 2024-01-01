import {
  identifyMatrix,
  isIdentity,
  Matrix,
  multiply,
  rotate,
  scale,
  toSVGTransform,
  translate,
} from "./matrix.ts";
import { assertEquals } from "../../deps_test.ts";

Deno.test("isIdentity()", () => {
  {
    const M: Matrix = [1, 0, 0, 1, 0, 0];
    assertEquals(isIdentity(M), true);
  }

  {
    assertEquals(isIdentity(identifyMatrix), true);
  }

  {
    const M: Matrix = [2, 0, 0, 2, 0, 0];
    assertEquals(isIdentity(M), false);
  }

  {
    const M: Matrix = [0, 1, -1, 0, 0, 0];
    assertEquals(isIdentity(M), false);
  }

  {
    const M: Matrix = [1, 0, 0, 1, 0, 1];
    assertEquals(isIdentity(M), false);
  }
});

Deno.test("multiply()", () => {
  {
    const A: Matrix = [1, 2, 3, 4, 5, 6];
    const B: Matrix = [7, 8, 9, 10, 11, 12];
    // \begin{pmatrix}1&3&5\\2&4&6\\0&0&1\end{pmatrix}\begin{pmatrix}7&9&11\\8&10&12\\0&0&1\end{pmatrix}=\begin{pmatrix}31&39&52\\46&58&76\\0&0&1\end{pmatrix}
    assertEquals(multiply(A, B), [31, 46, 39, 58, 52, 76]);
  }

  {
    const A: Matrix = [2, 4, 6, 8, 10, 12];
    const B: Matrix = [1, 3, 5, 7, 9, 11];
    // \begin{pmatrix}2&6&10\\4&8&12\\0&0&1\end{pmatrix}\begin{pmatrix}1&5&9\\3&7&11\\0&0&1\end{pmatrix}=\begin{pmatrix}20&52&94\\28&76&136\\0&0&1\end{pmatrix}
    assertEquals(multiply(A, B), [20, 28, 52, 76, 94, 136]);
  }

  {
    const A: Matrix = [2, 4, 6, 8, 10, 12];
    assertEquals(multiply(A, identifyMatrix), A);
    assertEquals(multiply(identifyMatrix, A), A);
  }

  {
    assertEquals(multiply(identifyMatrix, identifyMatrix), identifyMatrix);
  }

  {
    const A: Matrix = [0, 0, 0, 0, 0, 0];
    const B: Matrix = [1, 2, 3, 4, 5, 6];
    assertEquals(multiply(A, B), [0, 0, 0, 0, 0, 0]);
  }
});

Deno.test("scale()", () => {
  // \begin{pmatrix}1&3&5\\2&4&6\\0&0&1\end{pmatrix}\begin{pmatrix}2&0&0\\0&3&0\\0&0&1\end{pmatrix}=\begin{pmatrix}2&9&5\\4&12&6\\0&0&1\end{pmatrix}
  assertEquals(scale([1, 2, 3, 4, 5, 6], 2, 3), [2, 4, 9, 12, 5, 6]);
  assertEquals(scale([0, 0, 0, 0, 0, 0], 1, 1), [0, 0, 0, 0, 0, 0]);
  // \begin{pmatrix}2&6&10\\4&8&12\\0&0&1\end{pmatrix}\begin{pmatrix}0.5&0&0\\0&0.5&0\\0&0&1\end{pmatrix}=\begin{pmatrix}1&3&10\\2&4&12\\0&0&1\end{pmatrix}
  assertEquals(scale([2, 4, 6, 8, 10, 12], 0.5, 0.5), [1, 2, 3, 4, 10, 12]);
});

Deno.test("translate()", () => {
  // \begin{pmatrix}1&3&5\\2&4&6\\0&0&1\end{pmatrix}\begin{pmatrix}1&0&2\\0&1&3\\0&0&1\end{pmatrix}=\begin{pmatrix}1&3&16\\2&4&22\\0&0&1\end{pmatrix}
  assertEquals(translate([1, 2, 3, 4, 5, 6], 2, 3), [1, 2, 3, 4, 16, 22]);
  assertEquals(translate([0, 0, 0, 0, 0, 0], 1, 1), [0, 0, 0, 0, 0, 0]);
  // \begin{pmatrix}2&6&10\\4&8&12\\0&0&1\end{pmatrix}\begin{pmatrix}1&0&0.5\\0&1&0.5\\0&0&1\end{pmatrix}=\begin{pmatrix}2&6&14\\4&8&18\\0&0&1\end{pmatrix}
  assertEquals(translate([2, 4, 6, 8, 10, 12], 0.5, 0.5), [2, 4, 6, 8, 14, 18]);
});

Deno.test("rotate()", () => {
  {
    const M: Matrix = [1, 0, 0, 1, 0, 0];
    const theta = 90;
    assertEquals(
      rotate(M, theta).map((i) => Math.round(i)),
      [0, 1, -1, 0, 0, 0],
    );
  }

  {
    const M: Matrix = [2, 0, 0, 2, 0, 0];
    const theta = 45;
    assertEquals(
      rotate(M, theta),
      [
        1.4142135623730951,
        1.414213562373095,
        -1.414213562373095,
        1.4142135623730951,
        0,
        0,
      ],
    );
  }

  {
    const M: Matrix = [0, 1, -1, 0, 0, 0];
    const theta = 180;
    assertEquals(
      rotate(M, theta).map((i) => Math.round(i)),
      [-0, -1, 1, 0, 0, 0],
    );
  }
});
Deno.test("toSVGTransform()", async (t) => {
  await t.step("should return an empty string for identity matrix", () => {
    assertEquals(toSVGTransform(identifyMatrix), "");
  });
  await t.step(
    "should return the correct SVG transform string for non-identity matrix",
    () => {
      assertEquals(
        toSVGTransform([2, 0, 0, 2, 0, 0]),
        'transform="matrix(2 0 0 2 0 0)"',
      );
      assertEquals(
        toSVGTransform([1, 2, 3, 4, 5, 6]),
        'transform="matrix(1 2 3 4 5 6)"',
      );
    },
  );
});
