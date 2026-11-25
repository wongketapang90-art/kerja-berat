// SEMENTARA (estimasi 14.1 frame/kata) — ditimpa scripts/make_timing.py sesudah audio final.
export const FPS = 30;
export interface SegRange { a: number; b: number }
export const SEG: Record<string, SegRange> = {
  s1: { a: 0, b: 790 },
  s2: { a: 794, b: 1457 },
  s3: { a: 1461, b: 2222 },
  s4: { a: 2226, b: 2875 },
  s5: { a: 2879, b: 3683 },
  s6: { a: 3687, b: 4420 },
  s7: { a: 4424, b: 5185 },
  s8: { a: 5189, b: 5922 },
  s9: { a: 5926, b: 6730 },
  s10: { a: 6734, b: 7538 },
  s11: { a: 7542, b: 8275 },
  s12: { a: 8279, b: 9040 },
  s13: { a: 9044, b: 9791 },
  s14: { a: 9795, b: 10528 },
  s15: { a: 10532, b: 11364 },
  s16: { a: 11368, b: 12158 },
  s17: { a: 12162, b: 12881 },
  s18: { a: 12885, b: 13661 },
  s19: { a: 13665, b: 14102 },
};
export const TOTAL_FRAMES = 14102;
export interface Word { w: string; start: number; end: number }
export const WORDS: Word[] = [];
export interface Phrase { text: string; a: number; b: number }
export const CAPTIONS: Phrase[] = [];
