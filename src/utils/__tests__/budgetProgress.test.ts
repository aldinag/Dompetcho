import { budgetProgress, formatBudgetProgressLabel } from '../budgetProgress';

describe('budgetProgress', () => {
  it('is neutral well under the limit', () => {
    expect(budgetProgress(50_000, 100_000)).toEqual({ percent: 50, status: 'neutral' });
  });

  it('is neutral just under the warning threshold', () => {
    expect(budgetProgress(79_000, 100_000).status).toBe('neutral');
  });

  it('is warning exactly at 80%', () => {
    expect(budgetProgress(80_000, 100_000).status).toBe('warning');
  });

  it('is warning exactly at 100%', () => {
    expect(budgetProgress(100_000, 100_000).status).toBe('warning');
  });

  it('is danger just over 100%', () => {
    const { percent, status } = budgetProgress(100_001, 100_000);
    expect(status).toBe('danger');
    expect(percent).toBeCloseTo(100.001);
  });

  it('is danger well over the limit', () => {
    expect(budgetProgress(150_000, 100_000)).toEqual({ percent: 150, status: 'danger' });
  });

  it('is neutral with no spend', () => {
    expect(budgetProgress(0, 100_000)).toEqual({ percent: 0, status: 'neutral' });
  });

  it('treats a non-positive limit as neutral instead of dividing by zero', () => {
    expect(budgetProgress(50_000, 0)).toEqual({ percent: 0, status: 'neutral' });
    expect(budgetProgress(50_000, -10)).toEqual({ percent: 0, status: 'neutral' });
  });

  it('clamps negative spend to zero', () => {
    expect(budgetProgress(-5_000, 100_000)).toEqual({ percent: 0, status: 'neutral' });
  });
});

describe('formatBudgetProgressLabel', () => {
  it('formats both sides as Rupiah', () => {
    expect(formatBudgetProgressLabel(450_000, 500_000)).toBe('Rp 450.000 dari Rp 500.000');
  });
});
