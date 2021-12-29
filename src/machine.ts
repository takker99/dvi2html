import { Tfm } from "./tfm/tfm.ts";
import { loadFont } from "./tfm/index.ts";

export interface Rule {
  a: number;
  b: number;
}

interface Position {
  h: number;
  v: number;
  w: number;
  x: number;
  y: number;
  z: number;
}

export class DviFont {
  name!: string;
  checksum = 0;
  scaleFactor = 0;
  designSize = 0;
  metrics!: Tfm;

  constructor(properties: DviFont) {
    this.name = properties.name;
    this.checksum = properties.checksum;
    this.scaleFactor = properties.scaleFactor;
    this.designSize = properties.designSize;
  }
}

export class Machine {
  fonts: DviFont[] = [];
  font!: DviFont;
  stack: Position[] = [];
  position: Position = new Position();
  title = "";

  savedPosition: Position = new Position(); // for the ximera:save and ximera:restore specials

  constructor() {
    // this.fonts = [];
  }

  preamble(
    numerator: number,
    denominator: number,
    magnification: number,
    comment: string,
  ) {
  }

  pushColor(c: string) {
  }

  popColor() {
  }

  setXimeraRule(r: string) {
  }

  setXimeraRuleOpen(r: string) {
  }

  setXimeraRuleClose() {
  }

  pushXimera(e: string) {
  }

  popXimera() {
  }

  setPapersize(width: number, height: number) {
  }

  push() {
    this.stack.push(new Position(this.position));
  }

  pop() {
    const result = this.stack.pop();

    if (result) {
      this.position = result;
    } else {
      throw new Error("Popped from empty position stack");
    }
  }

  beginPage(page: any) {
    this.stack = [];
    this.position = new Position();
  }

  endPage() {}

  post(p: any) {}

  postPost(p: any) {}

  putRule(rule: Rule) {
  }

  moveRight(distance: number) {
    this.position.h += distance;
  }

  moveDown(distance: number) {
    this.position.v += distance;
  }

  setFont(font: DviFont) {
    this.font = font;
  }

  beginSVG() {
  }

  endSVG() {
  }

  putSVG(svg: string) {
  }

  putHTML(html: string) {
  }

  setTitle(title: string) {
    this.title = title;
  }

  // Returns the width of the text
  putText(text: Buffer): number {
    return 0;
  }

  loadFont(properties: any): DviFont {
    var f = new DviFont(properties);
    f.metrics = loadFont(properties.name);
    return f;
  }
}
