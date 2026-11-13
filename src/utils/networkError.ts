// Detects a failed fetch (no connectivity) rather than a real server/validation error.
// Supabase's client surfaces those as a plain Error/TypeError from the underlying fetch
// (React Native's fetch polyfill says "Network request failed"; other environments say
// "Failed to fetch" or "fetch failed") instead of its usual PostgrestError shape, which
// always carries a `code`.
export function isNetworkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const normalized = message.toLowerCase();
  return (
    normalized.includes('network request failed') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('fetch failed') ||
    normalized.includes('network error')
  );
}
