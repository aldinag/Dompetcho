/** Ensures a raw filesystem path (as returned by the share-intent module) has a URI scheme. */
export function normalizeFileUri(path: string): string {
  if (/^[a-z]+:\/\//i.test(path)) return path;
  return `file://${path}`;
}
