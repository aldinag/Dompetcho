// Copy this file to `env.ts` (same folder) and fill in real values.
// `env.ts` is gitignored — never commit real keys.
//
// SUPABASE_URL / SUPABASE_ANON_KEY: Project Settings > API in your Supabase dashboard.
// GOOGLE_WEB_CLIENT_ID: the OAuth 2.0 "Web application" client ID from Google Cloud Console
//   (NOT the Android client ID). Used as `webClientId` on both platforms so the ID token
//   Google Sign-In returns can be verified server-side — it must match a Client ID
//   configured under Google auth in the Supabase dashboard.
// GOOGLE_IOS_CLIENT_ID: the OAuth 2.0 "iOS" client ID from Google Cloud Console, created
//   against this app's bundle ID (com.dompetcho). Required on iOS only — without it (or a
//   GoogleService-Info.plist) the native Google Sign-In SDK has no client to authenticate
//   against and throws "failed to determine clientID" at configure() time.
export const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR-SUPABASE-ANON-KEY';
export const GOOGLE_WEB_CLIENT_ID = 'YOUR-WEB-CLIENT-ID.apps.googleusercontent.com';
export const GOOGLE_IOS_CLIENT_ID = 'YOUR-IOS-CLIENT-ID.apps.googleusercontent.com';
