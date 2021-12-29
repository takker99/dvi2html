// PyDvi - A Python Library to Process DVI Stream
// Copyright (C) 2014 Fabrice Salvaire
//;
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
/////////////////////////////////////////////////////////////////////////////

/*  This module handles TeX Font Metric.

The class :class:`PyDvi.Tfm` handles the font's metric.  To get a :class:`PyDvi.Tfm` instance for a
particular font use the static method :meth:`PyDvi.TfmParser.TfmParser.parse`.  For example use this
code for the font "cmr10"::

  tfm = TfmParser.parse('cmr10', '/usr/share/texmf/fonts/tfm/public/cm/cmr10.tfm')

The number of characters in the font can be obtained using the function :func:`len`::

  >>> len(tfm)
  128

Each character's metric is stored in a :class:`TfmChar` instance that can be accessed using the char
code as index on the :class:`Tfm` class instance.  For example to get the metric of the character
"A" use::

   tfm[ord('A')]

 */

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////;

/** This class encapsulates a TeX Font Metric for a Glyph. */
export class TfmChar {
  constructor(
    protected tfm: Tfm,
    protected char_code: number,
    protected width: number,
    protected height: number,
    protected depth: number,
    protected italic_correction: number,
    protected lig_kern_program_index: number,
    protected next_larger_char: number,
  ) {
    tfm.set_char(char_code, this);
  }

  scaled_width(scale_factor: number) {
    /*  Return the scaled width by *scale_factor*.  */
    return this.width * scale_factor;
  }

  scaled_height(scale_factor: number) {
    /*  Return the scaled height by *scale_factor*.  */
    return this.height * scale_factor;
  }

  scaled_depth(scale_factor: number) {
    /*  Return the scaled depth by *scale_factor*.  */
    return this.depth * scale_factor;
  }

  scaled_dimensions(scale_factor: number) {
    /*  Return the 3-tuple made of the scaled width, height and depth by *scale_factor*.  */
    return [this.width, this.height, this.depth].map((x) => x * scale_factor);
  }

  next_larger_tfm_char() {
    /*  Return the :class:`TfmChar` instance for the next larger char if it exists else return
        :obj:`None`. */ if (this.next_larger_char !== null) {
      return this.tfm.get_char(this.next_larger_char);
    } else {
      return null;
    }
  }

  get_lig_kern_program() {
    /*  Get the ligature/kern program of the character.  */ if (
      this.lig_kern_program_index !== null
    ) {
      return this.tfm.get_lig_kern_program(this.lig_kern_program_index);
    } else {
      return null;
    }
  }
}

/** This class encapsulates a TeX Font Metric for an extensible Glyph. */
export class TfmExtensibleChar extends TfmChar {
  public top = 0;
  public mid = 0;
  public bot = 0;
  public rep = 0;

  constructor(
    tfm: Tfm,
    char_code: number,
    width: number,
    height: number,
    depth: number,
    italic_correction: number,
    extensible_recipe: [number, number, number, number],
    lig_kern_program_index: number,
    next_larger_char: number,
  ) {
    super(
      tfm,
      char_code,
      width,
      height,
      depth,
      italic_correction,
      lig_kern_program_index,
      next_larger_char,
    );

    [this.top, this.mid, this.bot, this.rep] = extensible_recipe;
  }
}

export class TfmLigKern {
  /*tfm : Tfm;
  stop : number = 0;
  index : number = 0;
  next_char: TfmChar;*/

  constructor(
    public tfm: Tfm,
    public index: number,
    public stop: boolean,
    public next_char: TfmChar,
  ) {
    /*this.tfm = tfm;
    this.stop = stop;
    this.index = index;
    this.next_char = next_char;*/
    this.tfm.add_lig_kern(this);
  }
}

/*  This class represents a Kerning Program Instruction. */
export class TfmKern extends TfmLigKern {
  constructor(
    tfm: Tfm,
    index: number,
    stop: boolean,
    next_char: TfmChar,
    protected kern: number,
  ) {
    super(tfm, index, stop, next_char);
  }
}

/*  This class represents a Ligature Program Instruction. */
export class TfmLigature extends TfmLigKern {
  constructor(
    tfm: Tfm,
    index: number,
    stop: boolean,
    next_char: TfmChar,
    protected ligature_char_code: number,
    protected number_of_chars_to_pass_over: number,
    protected current_char_is_deleted: boolean,
    protected next_char_is_deleted: boolean,
  ) {
    super(tfm, index, stop, next_char);
  }
}

/*  This class encapsulates a TeX Font Metric for a font. */
export class Tfm {
  protected slant = 0;
  protected spacing = 0;
  protected space_stretch = 0;
  protected space_shrink = 0;
  protected x_height = 0;
  protected quad = 0;
  protected extra_space = 0;
  protected num1 = 0;
  protected num2 = 0;
  protected num3 = 0;
  protected denom1 = 0;
  protected denom2 = 0;
  protected sup1 = 0;
  protected sup2 = 0;
  protected sup3 = 0;
  protected sub1 = 0;
  protected sub2 = 0;
  protected supdrop = 0;
  protected subdrop = 0;
  protected delim1 = 0;
  protected delim2 = 0;
  protected axis_height = 0;
  protected default_rule_thickness = 0;
  protected big_op_spacing = [] as number[];

  private _lig_kerns: TfmLigKern[] = [];
  private characters: TfmChar[] = [];

  constructor(
    protected smallest_character_code = 0,
    protected largest_character_code = 0,
    protected checksum = 0,
    protected designSize = 0,
    protected character_coding_scheme = "",
    protected family = "",
  ) {
  }

  get_char(x: number) {
    return this.characters[x];
  }

  set_char(x: number, y: TfmChar) {
    this.characters[x] = y;
  }

  set_font_parameters(
    parameters: [number, number, number, number, number, number, number],
  ) {
    /*  Set the font parameters.  */ this.slant = parameters[0];
    this.spacing = parameters[1];
    this.space_stretch = parameters[2];
    this.space_shrink = parameters[3];
    this.x_height = parameters[4];
    this.quad = parameters[5];
    this.extra_space = parameters[6];
  }

  set_math_symbols_parameters(
    parameters: [
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
      number,
    ],
  ) {
    /*  Set the math symbols parameters.  */ this.num1 = parameters[0];
    this.num2 = parameters[1];
    this.num3 = parameters[2];
    this.denom1 = parameters[3];
    this.denom2 = parameters[4];
    this.sup1 = parameters[5];
    this.sup2 = parameters[6];
    this.sup3 = parameters[7];
    this.sub1 = parameters[8];
    this.sub2 = parameters[9];
    this.supdrop = parameters[10];
    this.subdrop = parameters[11];
    this.delim1 = parameters[12];
    this.delim2 = parameters[13];
    this.axis_height = parameters[14];
  }

  set_math_extension_parameters(parameters: [number, ...number[]]) {
    this.default_rule_thickness = parameters[0];
    this.big_op_spacing = parameters.slice(1);
  }

  add_lig_kern(obj: TfmLigKern) {
    /*  Add a ligature/kern program *obj*.  */ this._lig_kerns.push(obj);
  }

  get_lig_kern_program(i: number) {
    /*  Return the ligature/kern program at index *i*.  */ return this
      ._lig_kerns[i];
  }
}
