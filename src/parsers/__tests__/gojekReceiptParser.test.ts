import { gojekReceiptParser } from '../gojekReceiptParser';

// This fixture is a best-effort reconstruction of a GoPay merchant payment confirmation
// screen's OCR text — it has NOT been validated against a real device scan (see the NOTE ON
// TUNING comment in gojekReceiptParser.ts). Replace it with actual `raw_ocr_text` captured
// from a real receipt_scans row and adjust the parser until this test passes against it.
const SAMPLE_GOPAY_PAYMENT_OCR_TEXT = `
GoPay
Pembayaran Berhasil
Rp50.000
Waktu Transaksi
23 Sep 2026, 14:32 WIB
Dibayar ke
Indomaret Sudirman
ID Transaksi
GP230926143245XY
Metode Pembayaran
GoPay
Sisa Saldo GoPay
Rp1.250.000
`;

describe('gojekReceiptParser', () => {
  it('detects a GoPay receipt', () => {
    expect(gojekReceiptParser.detect(SAMPLE_GOPAY_PAYMENT_OCR_TEXT)).toBe(true);
  });

  it('does not detect unrelated text', () => {
    expect(gojekReceiptParser.detect('Struk belanja Indomaret\nTotal Rp45.000')).toBe(false);
  });

  it('parses amount, date, time, recipient, reference number and payment method', () => {
    const result = gojekReceiptParser.parse(SAMPLE_GOPAY_PAYMENT_OCR_TEXT);
    expect(result.amount).toBe(50000);
    expect(result.date).toBe('2026-09-23');
    expect(result.time).toBe('14:32');
    expect(result.recipientName).toBe('Indomaret Sudirman');
    expect(result.referenceNo).toBe('GP230926143245XY');
    expect(result.transactionWarning).toBeNull();
    expect(result.sourceAccountLabel).toBe('GoPay');
  });

  it('ignores the "Sisa Saldo GoPay" balance line when picking the transaction amount', () => {
    const result = gojekReceiptParser.parse(SAMPLE_GOPAY_PAYMENT_OCR_TEXT);
    expect(result.amount).not.toBe(1250000);
  });

  it('leaves fields null instead of guessing when text is unparseable', () => {
    const result = gojekReceiptParser.parse('Gojek\nsomething went wrong');
    expect(result.amount).toBeNull();
    expect(result.date).toBeNull();
    expect(result.recipientName).toBeNull();
    expect(result.referenceNo).toBeNull();
    expect(result.parsedNote).toBeNull();
    expect(result.transactionWarning).not.toBeNull();
    expect(result.sourceAccountLabel).toBeNull();
  });
});

// Reconstructed from the publicly-known layout of a GoPay peer-to-peer transfer confirmation
// screen — a different layout from the merchant payment above: "Dikirim ke" instead of
// "Dibayar ke", an optional "Catatan" note field, and no "Metode Pembayaran"/balance lines.
const SAMPLE_GOPAY_TRANSFER_OCR_TEXT = `
Gojek
Transfer Berhasil
Rp100.000
23 Sep 2026 • 09:15 WIB
Dikirim ke
Budi Santoso
Catatan
Bayar patungan
ID Transaksi
GP230926091530AB
`;

describe('gojekReceiptParser — peer-to-peer transfer receipt', () => {
  it('parses the recipient, note and reference from a transfer layout', () => {
    const result = gojekReceiptParser.parse(SAMPLE_GOPAY_TRANSFER_OCR_TEXT);
    expect(result.amount).toBe(100000);
    expect(result.date).toBe('2026-09-23');
    expect(result.time).toBe('09:15');
    expect(result.recipientName).toBe('Budi Santoso');
    expect(result.parsedNote).toBe('Bayar patungan');
    expect(result.referenceNo).toBe('GP230926091530AB');
    expect(result.transactionWarning).toBeNull();
    // No "Metode Pembayaran"/"Sumber Dana" line on this layout — left null, not guessed.
    expect(result.sourceAccountLabel).toBeNull();
  });
});

describe('gojekReceiptParser — transaction status warning', () => {
  // No real failed/pending GoPay/Gojek receipt sample exists yet — these are synthetic
  // snippets exercising the success-keyword-absent heuristic (see the NOTE ON TUNING comment
  // above parseTransactionWarning in gojekReceiptParser.ts). Revisit once a real
  // failed-receipt fixture is available.
  it('warns when a failure keyword is present', () => {
    const result = gojekReceiptParser.parse('GoPay\nPembayaran Gagal\nRp50.000');
    expect(result.transactionWarning).toMatch(/gagal/i);
  });

  it('warns when a pending keyword is present', () => {
    const result = gojekReceiptParser.parse('GoPay\nPembayaran Sedang Diproses\nRp50.000');
    expect(result.transactionWarning).toMatch(/diproses/i);
  });

  it('does not warn on a normal successful receipt', () => {
    const result = gojekReceiptParser.parse(SAMPLE_GOPAY_PAYMENT_OCR_TEXT);
    expect(result.transactionWarning).toBeNull();
  });
});
