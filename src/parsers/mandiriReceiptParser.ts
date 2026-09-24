import { EMPTY_PARSED_FIELDS, ParsedReceiptFields, ReceiptParser } from './types';

// NOTE ON TUNING: written against the publicly-known layout of the Livin' by Mandiri
// transfer/payment confirmation screen (a "Berhasil!" header, a large Rp amount, then a
// label/value "Detail Transaksi" list: Tanggal, Ke/Penerima, No. Referensi, ...).
// This has NOT been run against real device OCR output. Before shipping, capture
// `raw_ocr_text` from a few real Livin' receipt screenshots (it's stored on the
// receipt_scans row) and drop them into
// `src/parsers/__tests__/mandiriReceiptParser.test.ts` as fixtures, then adjust the
// label regexes below until they pass. ML Kit sometimes merges a label and its value
// onto one line and sometimes splits them across two — both cases are handled below,
// but exact label spelling/spacing can only be confirmed against real output.

const INDONESIAN_MONTHS: Record<string, string> = {
  jan: '01', januari: '01',
  feb: '02', februari: '02',
  mar: '03', maret: '03',
  apr: '04', april: '04',
  mei: '05',
  jun: '06', juni: '06',
  jul: '07', juli: '07',
  agu: '08', agt: '08', agustus: '08', aug: '08',
  sep: '09', sept: '09', september: '09',
  okt: '10', oktober: '10', oct: '10',
  nov: '11', november: '11',
  des: '12', desember: '12', dec: '12',
};

function normalizeLines(rawText: string): string[] {
  return rawText
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
}

/**
 * Finds a label line (e.g. "Tanggal", "No. Referensi") and returns whatever value is
 * associated with it — either inline after a ":"/"-" separator, or on the next line
 * when the label sits alone (ML Kit frequently renders label/value as separate lines).
 */
function findValueAfterLabel(lines: string[], labelPattern: RegExp): string | null {
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(labelPattern);
    if (!match) continue;

    const remainder = line.slice(match.index! + match[0].length).replace(/^[\s:.-]+/, '').trim();
    if (remainder.length > 0) return remainder;

    const next = lines[i + 1];
    if (next && !labelPattern.test(next)) return next.trim();
  }
  return null;
}

function parseAmount(rawText: string): number | null {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  // "Total Transaksi" — what actually left the account, nominal amount plus any transaction
  // fee — is preferred over "Nominal ..." (the bill/transfer amount before fees), which the
  // real receipts above show can differ by the fee (e.g. a Rp210.900 bill with a Rp3.000 fee
  // debits Rp213.900). Fall back to "Nominal" only when there's no separate total shown
  // (e.g. a fee-free sesama-Mandiri transfer already reports its one figure as the total).
  const labeled = findValueAfterLabel(lines, /total\s*transaksi/i) ?? findValueAfterLabel(lines, /nominal/i);
  const candidates: string[] = [];
  if (labeled) candidates.push(labeled);
  // Fallback: the first "Rp ..." occurrence anywhere in the receipt (usually the large
  // confirmation amount shown right under "Berhasil!").
  const anyRpMatch = rawText.match(/Rp\.?\s*([0-9][0-9.,]*)/i);
  if (anyRpMatch) candidates.push(anyRpMatch[0]);

  for (const candidate of candidates) {
    const match = candidate.match(/Rp\.?\s*([0-9][0-9.,]*)/i) ?? candidate.match(/([0-9][0-9.,]*)/);
    if (!match) continue;
    let numStr = match[1];
    numStr = numStr.replace(/[.,]00$/, ''); // drop ",00"/".00" cents — IDR receipts don't carry meaningful decimals
    numStr = numStr.replace(/[.,]/g, '');
    const value = parseInt(numStr, 10);
    if (!Number.isNaN(value) && value > 0) return value;
  }
  return null;
}

function parseDateAndTime(rawText: string): { date: string | null; time: string | null } {
  const lines = normalizeLines(rawText);
  const dateAreaValue = findValueAfterLabel(lines, /tanggal/i) ?? rawText;

  const dateMatch = dateAreaValue.match(/(\d{1,2})\s+([A-Za-z]{3,9})\.?\s+(\d{4})/);
  const timeMatch = dateAreaValue.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);

  let date: string | null = null;
  if (dateMatch) {
    const day = dateMatch[1].padStart(2, '0');
    const monthKey = dateMatch[2].toLowerCase();
    const month = INDONESIAN_MONTHS[monthKey];
    const year = dateMatch[3];
    if (month) date = `${year}-${month}-${day}`;
  }

  let time: string | null = null;
  if (timeMatch) {
    time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;
  }

  return { date, time };
}

function parseRecipient(rawText: string): string | null {
  const lines = normalizeLines(rawText);
  const value = findValueAfterLabel(lines, /nama penerima/i)
    ?? findValueAfterLabel(lines, /penerima/i)
    // Bill payments and top-ups ("Bayar"/"Top-up" receipts) have no recipient *person* —
    // Livin labels the biller/provider "Penyedia Jasa" instead of "Penerima".
    ?? findValueAfterLabel(lines, /penyedia jasa/i)
    ?? findValueAfterLabel(lines, /^ke$/i);
  if (!value) return null;
  // Recipient line sometimes has the destination bank/account trailing after a dash, e.g.
  // "BUDI SANTOSO - BCA 1234567890" — keep just the name portion.
  return value.split(/\s+-\s+/)[0].trim() || null;
}

function parseReferenceNo(rawText: string): string | null {
  const lines = normalizeLines(rawText);
  // "No. Ref." (the header's primary transaction reference) is tried before the fuller
  // "No. Referensi" spelling — a payment receipt's "No. Referensi QRIS" is a secondary,
  // QRIS-specific number, and its own label would otherwise match this pattern too if
  // tried first, since \b after "ref" only excludes "Referensi" ("f" is followed by a
  // word char there, not a boundary).
  const labelPatterns = [/no\.?\s*ref\b/i, /no\.?\s*referensi/i, /nomor referensi/i];

  for (const pattern of labelPatterns) {
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(pattern);
      if (!match) continue;

      // Livin sometimes prints a qualifier word ("QRIS") right after the label instead
      // of the number, with the actual number on a following line — so scan the label
      // line's suffix and the next couple of lines for a token that actually contains
      // digits, rather than trusting whatever token immediately follows the label.
      // References are usually all-digit, but not always (e.g. "2608261432ABCDEF").
      const suffix = lines[i].slice(match.index! + match[0].length);
      const candidates = [suffix, lines[i + 1], lines[i + 2]].filter((s): s is string => !!s);
      for (const candidate of candidates) {
        const tokens = candidate.match(/[A-Za-z0-9]{6,}/g) ?? [];
        const referenceLike = tokens.find(token => /\d/.test(token));
        if (referenceLike) return referenceLike;
      }
    }
  }
  return null;
}

export const mandiriReceiptParser: ReceiptParser = {
  bankId: 'mandiri',

  detect(rawText: string): boolean {
    const text = rawText.toLowerCase();
    const isLivinMandiri = /livin['’]?\s*(by)?\s*mandiri/.test(text);
    const isBankMandiri = /bank mandiri/.test(text);
    const mentionsMandiriWithTxnContext =
      /\bmandiri\b/.test(text) && /(berhasil|transfer|pembayaran|bayar|referensi|nominal)/.test(text);
    return isLivinMandiri || isBankMandiri || mentionsMandiriWithTxnContext;
  },

  parse(rawText: string): ParsedReceiptFields {
    if (!rawText) return { ...EMPTY_PARSED_FIELDS };
    const { date, time } = parseDateAndTime(rawText);
    return {
      amount: parseAmount(rawText),
      date,
      time,
      recipientName: parseRecipient(rawText),
      referenceNo: parseReferenceNo(rawText),
    };
  },
};
