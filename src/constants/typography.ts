// Type scale per the design guideline. Sizes/weights/line-heights match exactly; the
// typeface itself uses each platform's system font rather than a bundled Inter — swap
// fontFamily below if Inter gets linked natively later.
export const typography = {
  display: { fontSize: 40, lineHeight: 48, fontWeight: '700' as const },
  h1: { fontSize: 20, lineHeight: 28, fontWeight: '600' as const },
  h2: { fontSize: 16, lineHeight: 24, fontWeight: '500' as const },
  body: { fontSize: 14, lineHeight: 20, fontWeight: '400' as const },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' as const },
};

/** Monospaced digit widths so amounts don't jitter as they change — use on any Rupiah figure. */
export const tabularNums = { fontVariant: ['tabular-nums' as const] };
