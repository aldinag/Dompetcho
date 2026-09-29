import { EMPTY_PARSED_FIELDS, ParsedReceiptFields, ReceiptParser } from './types';

// NOTE ON TUNING: written against publicly-known GoPay/Gojek transaction confirmation screen
// conventions (a "Berhasil" header, a large Rp amount, then a label/value detail list —
// "Waktu Transaksi", "Dikirim ke"/"Dibayar ke", "ID Transaksi", "Metode Pembayaran", and
// sometimes a "Sisa Saldo GoPay" line). This has NOT been run against real device OCR
// output — there is no real GoPay/Gojek receipt sample in the test fixtures yet, the same
// situation the Mandiri parser started in. Before shipping this more broadly, capture
// `raw_ocr_text` from a real GoPay/Gojek receipt screenshot (it's stored on the
// receipt_scans row) and drop it into `src/parsers/__tests__/gojekReceiptParser.test.ts` as
// a fixture, then adjust the label regexes below until it passes.

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
 * Finds a label line (e.g. "Dikirim ke", "ID Transaksi") and returns whatever value is
 * associated with it — either inline after a ":"/"-" separator, or on the next line when the
 * label sits alone (ML Kit frequently renders label/value as separate lines).
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

/**
 * Drops a "Sisa Saldo ..." (remaining GoPay balance) line and its value line — that figure
 * isn't the transaction amount and would otherwise be picked up by the generic Rp fallback
 * below when it appears before the actual amount in the confirmation screen.
 */
function stripBalanceLines(lines: string[]): string[] {
  const result: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    if (/sisa saldo/i.test(lines[i])) {
      i++; // also drop the balance value, which normally sits on the next line
      continue;
    }
    result.push(lines[i]);
  }
  return result;
}

function parseAmount(rawText: string): number | null {
  const lines = normalizeLines(rawText);
  const labeled = findValueAfterLabel(lines, /total (pembayaran|transaksi)/i) ?? findValueAfterLabel(lines, /nominal/i);
  const candidates: string[] = [];
  if (labeled) candidates.push(labeled);
  const anyRpMatch = stripBalanceLines(lines).join('\n').match(/Rp\.?\s*([0-9][0-9.,]*)/i);
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
  const dateAreaValue = findValueAfterLabel(lines, /waktu transaksi/i) ?? rawText;

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
  const value = findValueAfterLabel(lines, /dikirim ke/i)
    ?? findValueAfterLabel(lines, /dibayar ke/i)
    ?? findValueAfterLabel(lines, /penerima/i)
    ?? findValueAfterLabel(lines, /nama merchant/i)
    ?? findValueAfterLabel(lines, /merchant/i);
  return value?.trim() || null;
}

function parseNote(rawText: string): string | null {
  const lines = normalizeLines(rawText);
  const value = findValueAfterLabel(lines, /catatan/i) ?? findValueAfterLabel(lines, /pesan/i);
  return value?.trim() || null;
}

/**
 * "Metode Pembayaran" (e.g. "GoPay", "GoPay Coins", or a linked card) — not a full account
 * number like Mandiri's masked bank account, but still a name the user's own tagged accounts
 * can be matched against (see `accountMatching.ts`).
 */
function parseSourceAccountLabel(rawText: string): string | null {
  const lines = normalizeLines(rawText);
  const value = findValueAfterLabel(lines, /metode pembayaran/i) ?? findValueAfterLabel(lines, /sumber dana/i);
  return value?.trim() || null;
}

function parseReferenceNo(rawText: string): string | null {
  const lines = normalizeLines(rawText);
  const labelPatterns = [/id\.?\s*transaksi/i, /no\.?\s*transaksi/i, /nomor transaksi/i];

  for (const pattern of labelPatterns) {
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(pattern);
      if (!match) continue;

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

// NOTE ON TUNING: there's no real sample of a failed or pending GoPay/Gojek receipt in the
// test fixtures yet — this is written purely from the success-keyword-absent heuristic
// below, the same approach the Mandiri parser started with. A real failed-receipt fixture,
// once available, would help confirm whether Gojek actually uses these exact words.
function parseTransactionWarning(rawText: string): string | null {
  if (/\b(gagal|ditolak|dibatalkan)\b/i.test(rawText)) {
    return 'Struk ini tampak menunjukkan transaksi gagal — periksa kembali sebelum menyimpan.';
  }
  if (/\b(diproses|pending|tertunda|menunggu)\b/i.test(rawText)) {
    return 'Struk ini tampak menunjukkan transaksi masih diproses — periksa kembali sebelum menyimpan.';
  }
  if (!/berhasil/i.test(rawText)) {
    return 'Tidak ditemukan tanda transaksi berhasil pada struk ini — periksa kembali sebelum menyimpan.';
  }
  return null;
}

export const gojekReceiptParser: ReceiptParser = {
  bankId: 'gojek',

  detect(rawText: string): boolean {
    const text = rawText.toLowerCase();
    const mentionsGojekBrand = /\bgojek\b/.test(text) || /\bgo-?pay\b/.test(text);
    const hasTxnContext = /(berhasil|transaksi|pembayaran|bayar|transfer|kirim|nominal)/.test(text);
    return mentionsGojekBrand && hasTxnContext;
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
      parsedNote: parseNote(rawText),
      transactionWarning: parseTransactionWarning(rawText),
      sourceAccountLabel: parseSourceAccountLabel(rawText),
    };
  },
};
