import { mandiriReceiptParser } from './mandiriReceiptParser';
import { ReceiptParser } from './types';

export * from './types';

// MVP2 adds more parsers (other banks, e-wallets, a cloud LLM+OCR fallback) here —
// the OCR pipeline and review/confirm screen never need to change.
const PARSERS: ReceiptParser[] = [mandiriReceiptParser];

export function detectParser(rawText: string): ReceiptParser | null {
  return PARSERS.find(p => p.detect(rawText)) ?? null;
}
