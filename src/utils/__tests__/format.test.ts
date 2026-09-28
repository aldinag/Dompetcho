import { formatRupiah } from '../format';

describe('formatRupiah', () => {
  it('formats a positive amount', () => {
    expect(formatRupiah(50000)).toBe('Rp 50.000');
  });

  it('formats a negative amount with the minus sign before "Rp", not after', () => {
    expect(formatRupiah(-50000)).toBe('-Rp 50.000');
  });

  it('formats zero without a sign', () => {
    expect(formatRupiah(0)).toBe('Rp 0');
  });

  it('rounds fractional amounts before formatting', () => {
    expect(formatRupiah(-50000.6)).toBe('-Rp 50.001');
  });
});
