import { grabReceiptParser } from '../grabReceiptParser';

// This fixture is a best-effort reconstruction of a GrabFood merchant payment confirmation
// screen's OCR text — it has NOT been validated against a real device scan (see the NOTE ON
// TUNING comment in grabReceiptParser.ts). Replace it with actual `raw_ocr_text` captured
// from a real receipt_scans row and adjust the parser until this test passes against it.
const SAMPLE_GRABFOOD_PAYMENT_OCR_TEXT = `
Grab
Pembayaran Berhasil
Rp75.000
Waktu Transaksi
23 Sep 2026, 12:05 WIB
Dibayar ke
Warung Padang Sederhana
ID Transaksi
GR230926120512XY
Metode Pembayaran
GrabPay
Saldo GrabPay
Rp340.000
`;

describe('grabReceiptParser', () => {
  it('detects a Grab receipt', () => {
    expect(grabReceiptParser.detect(SAMPLE_GRABFOOD_PAYMENT_OCR_TEXT)).toBe(true);
  });

  it('does not detect unrelated text', () => {
    expect(grabReceiptParser.detect('Struk belanja Indomaret\nTotal Rp45.000')).toBe(false);
  });

  it('parses amount, date, time, recipient, reference number and payment method', () => {
    const result = grabReceiptParser.parse(SAMPLE_GRABFOOD_PAYMENT_OCR_TEXT);
    expect(result.amount).toBe(75000);
    expect(result.date).toBe('2026-09-23');
    expect(result.time).toBe('12:05');
    expect(result.recipientName).toBe('Warung Padang Sederhana');
    expect(result.referenceNo).toBe('GR230926120512XY');
    expect(result.transactionWarning).toBeNull();
    expect(result.sourceAccountLabel).toBe('GrabPay');
  });

  it('ignores the "Saldo GrabPay" balance line when picking the transaction amount', () => {
    const result = grabReceiptParser.parse(SAMPLE_GRABFOOD_PAYMENT_OCR_TEXT);
    expect(result.amount).not.toBe(340000);
  });

  it('leaves fields null instead of guessing when text is unparseable', () => {
    const result = grabReceiptParser.parse('Grab\nsomething went wrong');
    expect(result.amount).toBeNull();
    expect(result.date).toBeNull();
    expect(result.recipientName).toBeNull();
    expect(result.referenceNo).toBeNull();
    expect(result.parsedNote).toBeNull();
    expect(result.transactionWarning).not.toBeNull();
    expect(result.sourceAccountLabel).toBeNull();
  });
});

// Reconstructed from the publicly-known layout of a GrabBike ride confirmation screen — a
// different layout from the GrabFood payment above: "Pengemudi" instead of "Dibayar ke", a
// "Kode Pesanan" instead of "ID Transaksi", and no "Metode Pembayaran"/balance lines shown.
const SAMPLE_GRABBIKE_RIDE_OCR_TEXT = `
Grab
Perjalanan Selesai
Transaksi Berhasil
Rp23.000
23 Sep 2026 • 08:40 WIB
Pengemudi
Andi Wijaya
Kode Pesanan
GR230926084015AB
`;

describe('grabReceiptParser — GrabBike ride receipt', () => {
  it('parses the driver name and reference from a ride layout', () => {
    const result = grabReceiptParser.parse(SAMPLE_GRABBIKE_RIDE_OCR_TEXT);
    expect(result.amount).toBe(23000);
    expect(result.date).toBe('2026-09-23');
    expect(result.time).toBe('08:40');
    expect(result.recipientName).toBe('Andi Wijaya');
    expect(result.referenceNo).toBe('GR230926084015AB');
    expect(result.transactionWarning).toBeNull();
    // No "Metode Pembayaran"/"Sumber Dana" line on this layout — left null, not guessed.
    expect(result.sourceAccountLabel).toBeNull();
  });
});

describe('grabReceiptParser — transaction status warning', () => {
  // No real failed/pending Grab receipt sample exists yet — these are synthetic snippets
  // exercising the success-keyword-absent heuristic (see the NOTE ON TUNING comment above
  // parseTransactionWarning in grabReceiptParser.ts). Revisit once a real failed-receipt
  // fixture is available.
  it('warns when a failure keyword is present', () => {
    const result = grabReceiptParser.parse('Grab\nPembayaran Gagal\nRp75.000');
    expect(result.transactionWarning).toMatch(/gagal/i);
  });

  it('warns when a pending keyword is present', () => {
    const result = grabReceiptParser.parse('Grab\nPembayaran Sedang Diproses\nRp75.000');
    expect(result.transactionWarning).toMatch(/diproses/i);
  });

  it('does not warn on a normal successful receipt', () => {
    const result = grabReceiptParser.parse(SAMPLE_GRABFOOD_PAYMENT_OCR_TEXT);
    expect(result.transactionWarning).toBeNull();
  });
});
