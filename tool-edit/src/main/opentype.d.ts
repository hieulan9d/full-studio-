// opentype.js 2.x khong co khai bao kieu: chi khai bao phan dung (doc ten ho, cmap).
declare module 'opentype.js' {
  const opentype: {
    parse(buffer: ArrayBuffer): { names: unknown; tables: unknown; charToGlyphIndex(ch: string): number };
  };
  export default opentype;
}
