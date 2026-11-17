import { isNetworkError } from '../networkError';

describe('isNetworkError', () => {
  it('recognizes React Native fetch polyfill failures', () => {
    expect(isNetworkError(new TypeError('Network request failed'))).toBe(true);
  });

  it('recognizes common browser/Node fetch failure messages', () => {
    expect(isNetworkError(new Error('Failed to fetch'))).toBe(true);
    expect(isNetworkError(new Error('fetch failed'))).toBe(true);
    expect(isNetworkError('A network error occurred')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isNetworkError(new Error('NETWORK REQUEST FAILED'))).toBe(true);
  });

  it('does not flag a real server/validation error as a connectivity problem', () => {
    expect(isNetworkError(new Error('relation "public.expenses" does not exist'))).toBe(false);
  });

  it('handles non-Error values without throwing', () => {
    expect(isNetworkError(undefined)).toBe(false);
    expect(isNetworkError({ code: 'PGRST116' })).toBe(false);
  });
});
