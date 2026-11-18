// Ham mau tham chieu tren CPU, dung de kiem shader. Xem CHUC-NANG.md F-02.
export const srgbEotf = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
export const srgbOetf = (l: number) => (l <= 0.0031308 ? l * 12.92 : 1.055 * Math.pow(l, 1 / 2.4) - 0.055);
export const bt709Oetf = (l: number) => (l < 0.018 ? 4.5 * l : 1.099 * Math.pow(l, 0.45) - 0.099);
export const bt709Eotf = (v: number) => (v < 0.081 ? v / 4.5 : Math.pow((v + 0.099) / 1.099, 1 / 0.45));
export const gamma24Oetf = (l: number) => Math.pow(Math.max(l, 0), 1 / 2.4);

export type OutputTransform = 'srgb' | 'bt709' | 'gamma24';
export const OUTPUT_TRANSFORMS: OutputTransform[] = ['srgb', 'bt709', 'gamma24'];
