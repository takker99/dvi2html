// The matrix is in the format of an svg transform matrix.  In other words it is the matrix
// [[ values[0], values[2], values[4] ],
//  [ values[1], values[3], values[5] ],
//  [     0    ,     0    ,     1     ]]
export type Matrix = [number, number, number, number, number, number];

export const identifyMatrix: Matrix = [1, 0, 0, 1, 0, 0];

export const isIdentity = (
  m: Matrix,
): boolean => (Math.abs(m[0] - 1) < Number.EPSILON &&
  Math.abs(m[1]) < Number.EPSILON &&
  Math.abs(m[2]) < Number.EPSILON && Math.abs(m[3] - 1) < Number.EPSILON &&
  Math.abs(m[4]) < Number.EPSILON && Math.abs(m[5]) < Number.EPSILON);

// A * B
export const multiply = (A: Matrix, B: Matrix): Matrix => [
  A[0] * B[0] + A[2] * B[1],
  A[1] * B[0] + A[3] * B[1],
  A[0] * B[2] + A[2] * B[3],
  A[1] * B[2] + A[3] * B[3],
  A[0] * B[4] + A[2] * B[5] + A[4],
  A[1] * B[4] + A[3] * B[5] + A[5],
];

// this = this * [[x, 0, 0], [0, y, 0], [0, 0, 1]]
export const scale = (
  m: Matrix,
  x: number,
  y: number,
): Matrix => [m[0] * x, m[1] * x, m[2] * y, m[3] * y, m[4], m[5]];

// this = this * [[1, 0, x], [0, 1, y], [0, 0, 1]]
export const translate = (m: Matrix, x: number, y: number): Matrix => [
  m[0],
  m[1],
  m[2],
  m[3],
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
];

// this = this * [[cos(x), sin(x), 0], [-sin(x), cos(x), 0], [0, 0, 1]]
// x is in degrees
export const rotate = (m: Matrix, x: number): Matrix => {
  const rad = x * Math.PI / 180;
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [
    m[0] * c + m[2] * s,
    m[1] * c + m[3] * s,
    -m[0] * s + m[2] * c,
    -m[1] * s + m[3] * c,
    m[4],
    m[5],
  ];
};

export const toSVGTransform = (m: Matrix): string =>
  isIdentity(m) ? "" : ` transform="matrix(${m.join(" ")})"`;
export const toString = (m: Matrix): string => `[${m.join(",")}]`;
