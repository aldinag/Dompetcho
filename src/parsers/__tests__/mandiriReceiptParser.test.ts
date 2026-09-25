import { mandiriReceiptParser } from '../mandiriReceiptParser';

// This fixture is a best-effort reconstruction of a Livin' by Mandiri transfer receipt's
// OCR text — it has NOT been validated against a real device scan. Replace it with the
// actual `raw_ocr_text` captured from a real receipt_scans row (log it during dev, or
// read it back from Supabase) and adjust src/parsers/mandiriReceiptParser.ts until this
// test passes against real data.
const SAMPLE_MANDIRI_OCR_TEXT = `
Livin' by Mandiri
Transfer Berhasil
Rp150.000
Detail Transaksi
Tanggal
26 Agu 2026, 14:32:10 WIB
Jenis Transaksi
Transfer Antar Bank
Sumber Dana
••• 1234
Ke
BUDI SANTOSO
BCA - 1234567890
Berita
Bayar makan siang
No. Referensi
2608261432ABCDEF
Simpan sebagai bukti transaksi yang sah
`;

describe('mandiriReceiptParser', () => {
  it('detects a Livin by Mandiri receipt', () => {
    expect(mandiriReceiptParser.detect(SAMPLE_MANDIRI_OCR_TEXT)).toBe(true);
  });

  it('does not detect unrelated text', () => {
    expect(mandiriReceiptParser.detect('Struk belanja Indomaret\nTotal Rp45.000')).toBe(false);
  });

  it('parses amount, date, time, recipient and reference number', () => {
    const result = mandiriReceiptParser.parse(SAMPLE_MANDIRI_OCR_TEXT);
    expect(result.amount).toBe(150000);
    expect(result.date).toBe('2026-08-26');
    expect(result.time).toBe('14:32');
    expect(result.recipientName).toBe('BUDI SANTOSO');
    expect(result.referenceNo).toBe('2608261432ABCDEF');
    // No "Keterangan Transaksi" label on this receipt layout — left null, not guessed
    // from "Berita" (a different field entirely).
    expect(result.parsedNote).toBeNull();
  });

  it('leaves fields null instead of guessing when text is unparseable', () => {
    const result = mandiriReceiptParser.parse('Livin by Mandiri\nsomething went wrong');
    expect(result.amount).toBeNull();
    expect(result.date).toBeNull();
    expect(result.recipientName).toBeNull();
    expect(result.referenceNo).toBeNull();
    expect(result.parsedNote).toBeNull();
  });
});

// Reconstructed line-by-line from a real Livin' by Mandiri "QR Bayar" (QRIS merchant
// payment) screenshot the user shared — a different layout from the transfer receipt
// above: "Pembayaran Berhasil!" instead of "Transfer Berhasil", a "Sumber Dana" block
// naming the *payer* (not the recipient), and two reference numbers — the header's
// "No. Ref." (the primary transaction reference, kept) and a secondary
// "No. Referensi QRIS" line whose label is immediately followed by the qualifier word
// "QRIS" rather than the number itself.
const REAL_QRIS_PAYMENT_OCR_TEXT = `
livin
by mandiri
QR Bayar
Pembayaran Berhasil!
22 Sep 2026 • 08:27:48 WIB • No. Ref.
2609221122568501967
Penerima
PT Tokopedia
Jakarta Selatan, ID
Detail Transaksi
Total Transaksi
Rp 292.633
Sumber Dana
TEGAR ALDINA GALARI
Bank Mandiri - •••••••7448
No. Referensi QRIS
609626943489
Pengakuisisi
Doku
Merchant PAN
9360089900000594006
Customer PAN
9360000812191374484
Terminal ID
A01
`;

describe('mandiriReceiptParser — real QRIS payment receipt', () => {
  it('detects it as a Livin by Mandiri receipt', () => {
    expect(mandiriReceiptParser.detect(REAL_QRIS_PAYMENT_OCR_TEXT)).toBe(true);
  });

  it('parses the merchant, amount, date/time, and the header reference (not the QRIS sub-reference)', () => {
    const result = mandiriReceiptParser.parse(REAL_QRIS_PAYMENT_OCR_TEXT);
    expect(result.amount).toBe(292633);
    expect(result.date).toBe('2026-09-22');
    expect(result.time).toBe('08:27');
    expect(result.recipientName).toBe('PT Tokopedia');
    expect(result.referenceNo).toBe('2609221122568501967');
    expect(result.parsedNote).toBeNull();
  });
});

// Reconstructed from a real Livin' "Bayar" (bill payment) receipt. Two things this format
// changes: the payee is labeled "Penyedia Jasa" (a service provider, not a "Penerima"), and
// the debited amount ("Total Transaksi") is Rp3.000 more than the bill itself ("Nominal
// Transaksi") because of the transaction fee — the parser must prefer the total.
const REAL_BILL_PAYMENT_OCR_TEXT = `
livin
by mandiri
Bayar
Pembayaran Berhasil!
06 Sep 2026 • 19:49:51 WIB • No. Ref.
7026090619449471952
Penyedia Jasa
Telkom/Indihome
02122821056 - TEGAR
Detail Pembayaran
Nominal Transaksi
Rp 210.900
Biaya Transaksi
Rp 3.000
Total Transaksi
Rp 213.900
Sumber Dana
TEGAR ALDINA GALARI
Bank Mandiri - •••••••7448
Detail Transaksi
PEMBAYARAN
TELKOM
NO. TELEPON
0002122821056
NAMA
TEGAR
NO. TAGIHAN
609A
PERIODE
609A
TAGIHAN
210900
ADMIN
0
TOTAL
000000210900
`;

describe('mandiriReceiptParser — real bill payment receipt', () => {
  it('parses the provider as recipient and the fee-inclusive total as the amount', () => {
    const result = mandiriReceiptParser.parse(REAL_BILL_PAYMENT_OCR_TEXT);
    expect(result.amount).toBe(213900);
    expect(result.date).toBe('2026-09-06');
    expect(result.time).toBe('19:49');
    expect(result.recipientName).toBe('Telkom/Indihome');
    expect(result.referenceNo).toBe('7026090619449471952');
    expect(result.parsedNote).toBeNull();
  });
});

// Reconstructed from a real Livin' inter-bank transfer receipt (via BI-Fast). Its reference
// number has no header "No. Ref." at all — only a "No. Referensi" row whose label is on one
// line, a "BI Fast" qualifier on the next, and the actual reference two lines further down.
const REAL_INTERBANK_TRANSFER_OCR_TEXT = `
livin
by mandiri
Transfer Rupiah
Transfer Berhasil!
20 Sep 2026 • 13:29:02 WIB
Penerima
TEGAR ALDINA GALARI
Bank Syariah Indonesia - 7203742783
Detail Transaksi
Nominal Transfer
Rp 7.000.000
Metode Transfer
BI Fast
No. Referensi
BI Fast
20260920BMRIIDJA
010O0224406540
Tujuan Transaksi
Pembelian
Biaya Transaksi
Rp 2.500
Total Transaksi
Rp 7.002.500
Rekening Sumber
TEGAR ALDINA GALARI
Bank Mandiri - •••••••7448
Keterangan Transaksi
rumah sep 26
`;

describe('mandiriReceiptParser — real inter-bank transfer receipt (BI-Fast)', () => {
  it('parses the fee-inclusive total and the reference number two lines below its label', () => {
    const result = mandiriReceiptParser.parse(REAL_INTERBANK_TRANSFER_OCR_TEXT);
    expect(result.amount).toBe(7002500);
    expect(result.date).toBe('2026-09-20');
    expect(result.time).toBe('13:29');
    expect(result.recipientName).toBe('TEGAR ALDINA GALARI');
    expect(result.referenceNo).toBe('20260920BMRIIDJA');
    expect(result.parsedNote).toBe('rumah sep 26');
  });
});

// Reconstructed from a real Livin' same-bank ("Sesama Bank Mandiri") transfer receipt — the
// simplest layout: no separate fee, so "Total Transaksi" is the only amount shown at all.
const REAL_SESAMA_MANDIRI_TRANSFER_OCR_TEXT = `
livin
by mandiri
Transfer Rupiah
Transfer Berhasil!
16 Sep 2026 • 13:21:14 WIB • No. Ref.
2609161121035681684
Penerima
MUTIARA RAHMAYANI
Bank Mandiri - 1120018760855
Detail Transaksi
Metode Transfer
Sesama Bank Mandiri
Total Transaksi
Rp 2.020.000
Rekening Sumber
TEGAR ALDINA GALARI
Bank Mandiri - •••••••7448
Keterangan Transaksi
september 26
`;

describe('mandiriReceiptParser — real same-bank transfer receipt', () => {
  it('parses correctly when there is no separate nominal/fee breakdown', () => {
    const result = mandiriReceiptParser.parse(REAL_SESAMA_MANDIRI_TRANSFER_OCR_TEXT);
    expect(result.amount).toBe(2020000);
    expect(result.date).toBe('2026-09-16');
    expect(result.time).toBe('13:21');
    expect(result.recipientName).toBe('MUTIARA RAHMAYANI');
    expect(result.referenceNo).toBe('2609161121035681684');
    expect(result.parsedNote).toBe('september 26');
  });
});

// Reconstructed from a real Livin' "Top-up" (prepaid credit) receipt — another
// "Penyedia Jasa" + fee-inclusive-total case, with the reference number inline on the
// header line rather than wrapped to the next one.
const REAL_TOPUP_OCR_TEXT = `
livin
by mandiri
Top-up
Top-up Berhasil
09 Sep 2026 • 14:53:22 WIB • No. Ref. 7026090914531712269
Penyedia Jasa
Telkomsel Prepaid
081218589075
Detail Transaksi
Nominal
Rp 30.000
Biaya Transaksi
Rp 2.000
Total Transaksi
Rp 32.000
Rekening Sumber
TEGAR ALDINA GALARI
Bank Mandiri - •••••••7448
Detail Top-up
DARI NOMOR REK
9000019137XXX
PEMBELIAN
PULSA TELKOMSEL
`;

describe('mandiriReceiptParser — real top-up receipt', () => {
  it('parses the provider as recipient and the reference number inline on the header line', () => {
    const result = mandiriReceiptParser.parse(REAL_TOPUP_OCR_TEXT);
    expect(result.amount).toBe(32000);
    expect(result.date).toBe('2026-09-09');
    expect(result.time).toBe('14:53');
    expect(result.recipientName).toBe('Telkomsel Prepaid');
    expect(result.referenceNo).toBe('7026090914531712269');
    expect(result.parsedNote).toBeNull();
  });
});
