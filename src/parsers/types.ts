export interface ParsedReceiptFields {
  amount: number | null;
  /** ISO date, e.g. "2026-08-26" */
  date: string | null;
  /** 24h "HH:mm" */
  time: string | null;
  recipientName: string | null;
  referenceNo: string | null;
  /** The sender's own memo, from the "Keterangan Transaksi" field — not shown on every receipt. */
  parsedNote: string | null;
}

export const EMPTY_PARSED_FIELDS: ParsedReceiptFields = {
  amount: null,
  date: null,
  time: null,
  recipientName: null,
  referenceNo: null,
  parsedNote: null,
};

/**
 * A pluggable bank/e-wallet receipt parser. MVP1 only ships `mandiriReceiptParser`;
 * MVP2 can register more of these (other banks, a cloud LLM+OCR fallback) in
 * `parsers/index.ts` without touching the OCR pipeline or the review/confirm screen.
 */
export interface ReceiptParser {
  bankId: string;
  /** Cheap text-pattern check — does this OCR text look like this parser's format? */
  detect(rawText: string): boolean;
  /** Best-effort field extraction. Fields that can't be found are left null, never guessed. */
  parse(rawText: string): ParsedReceiptFields;
}
