import { matchAccountByLabel } from '../accountMatching';
import { Account } from '../../types';

function account(name: string, kind: Account['kind'] = 'bank'): Account {
  return { id: name, user_id: 'u1', name, kind, created_at: '2026-01-01T00:00:00Z' };
}

describe('matchAccountByLabel', () => {
  const accounts = [account('Mandiri'), account('GoPay', 'ewallet'), account('Tunai', 'cash')];

  it('matches an account whose name appears in the label', () => {
    const match = matchAccountByLabel('TEGAR ALDINA GALARI / Bank Mandiri - •••••••7448', accounts);
    expect(match?.name).toBe('Mandiri');
  });

  it('matches case-insensitively', () => {
    const match = matchAccountByLabel('sumber dana dari bank mandiri', accounts);
    expect(match?.name).toBe('Mandiri');
  });

  it('returns null when no account name appears in the label', () => {
    expect(matchAccountByLabel('Bank BCA - 1234567890', accounts)).toBeNull();
  });

  it('returns null for a null label', () => {
    expect(matchAccountByLabel(null, accounts)).toBeNull();
  });

  it('returns null when there are no accounts to match against', () => {
    expect(matchAccountByLabel('Bank Mandiri - •••••••7448', [])).toBeNull();
  });
});
