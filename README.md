# Dompetcho

MVP1: share a Livin' by Mandiri transfer receipt screenshot and get a logged expense with
near-zero typing. On-device OCR (ML Kit), Google Sign-In via Supabase, manual quick-add
fallback, home list, and a monthly summary chart.

Bare React Native CLI (no Expo). **Tested against a physical Android device** — the share
sheet and Google Sign-In can't be verified reliably on an emulator/simulator, see below.

## What's implemented

- `src/screens/LoginScreen.tsx` — Google Sign-In
- `src/screens/ExpenseFormScreen.tsx` — shared manual quick-add + receipt review/confirm screen
- `src/screens/HomeScreen.tsx`, `src/screens/SummaryScreen.tsx`
- `src/parsers/mandiriReceiptParser.ts` — the pluggable OCR text parser (see the big warning
  in that file — it needs tuning against real receipts, not just this reconstruction)
- `src/hooks/useShareIntent.ts` — Android share-sheet handler
- `supabase/schema.sql` — full schema, RLS policies, and the auth trigger that provisions a
  `users` row + default categories on first Google sign-in

## 1. Install JS dependencies

```bash
npm install
```

## 2. Configure environment variables

```bash
cp src/config/env.example.ts src/config/env.ts
```

Edit `src/config/env.ts` with three values — where to get each is covered in the sections
below:

| Variable | Where it comes from |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Supabase dashboard > Project Settings > API |
| `GOOGLE_WEB_CLIENT_ID` | Google Cloud Console, the **Web application** OAuth client (step 4) |
| `GOOGLE_IOS_CLIENT_ID` | Google Cloud Console, the **iOS** OAuth client (step 4) — iOS build only, unused on Android |

`src/config/env.ts` is gitignored — never commit real keys.

## 3. Set up the Supabase project

1. Create a project at [supabase.com](https://supabase.com) (or use an existing one).
2. Open **SQL Editor > New query**, paste the entire contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This creates `users`,
   `categories`, `expenses`, `receipt_scans`, RLS policies, and the trigger that
   auto-creates a user profile + seeds the 8 default categories the first time someone
   signs in.
3. Copy the Project URL and `anon` public key into `src/config/env.ts`.

### Email/password login (skips Google Sign-In entirely)

Google Sign-In needs real OAuth clients + native config (next section) before it works at
all, which is a blocker if you just want to poke at Home/Add/Summary right now — and it
doesn't work at all on devices without Google Play Services (e.g. Huawei phones), since it
depends on the native Google Sign-In SDK. The Login screen has an **email/password
fallback** shown on every build, including release, for exactly this case.

There's no self-serve sign-up — each person who needs this needs a Supabase user created
for them first:

1. Supabase dashboard > **Authentication > Providers** — confirm **Email** is enabled (on
   by default).
2. **Authentication > Users > Add user** — create one with any email/password, e.g.
   `dev@example.com` / a password of your choice. Leave "Auto Confirm User" checked so it
   doesn't need email verification.
3. In the app's Login screen, below the Google button, enter that same email/password and
   tap **Masuk**.

This goes through the same `handle_new_auth_user` trigger as Google sign-in, so your dev
user gets a real `users` row and the 8 default categories seeded automatically — Home, Add,
and Summary all work normally against it.

## 4. Google Sign-In: SHA-1 fingerprint + OAuth clients

Google Sign-In on Android is validated against your app's SHA-1 certificate fingerprint, so
you need that before creating the OAuth client.

### Get the debug SHA-1

```bash
cd android
./gradlew signingReport
```

Look for the `SHA1` line under the `debug` variant (you'll need a separate one for your
release keystore later, when you actually ship).

### Create the Google Cloud OAuth clients

In [Google Cloud Console](https://console.cloud.google.com) > **APIs & Services >
Credentials** (create a project first if you don't have one):

1. **Configure the OAuth consent screen** if you haven't already (External, add your own
   Google account as a test user while unpublished).
2. **Create Credentials > OAuth client ID > Android**
   - Package name: `com.dompetcho`
   - SHA-1: the debug fingerprint from above
3. **Create Credentials > OAuth client ID > Web application**
   - No redirect URIs needed for this flow
   - Copy this client's **Client ID** — this is your `GOOGLE_WEB_CLIENT_ID`. (Yes, the *Web*
     client ID is what `@react-native-google-signin/google-signin` wants as `webClientId`
     on Android — this is expected, not a typo.)
4. **Create Credentials > OAuth client ID > iOS** (iOS build only — skip if you're only
   testing Android)
   - Bundle ID: `com.dompetcho`
   - No SHA-1 needed for iOS
   - Copy this client's **Client ID** — this is your `GOOGLE_IOS_CLIENT_ID`. Without it (or a
     Firebase `GoogleService-Info.plist`), `GoogleSignin.configure()` throws "failed to
     determine clientID" at runtime on iOS.
   - Then open `ios/Dompetcho/Info.plist` and replace the placeholder URL scheme with your
     iOS client ID **reversed** — e.g. client ID `1234-abcd.apps.googleusercontent.com`
     becomes `com.googleusercontent.apps.1234-abcd` in the `CFBundleURLTypes` entry already
     there. Without this, Safari can't hand control back to the app after the Google
     sign-in page and the flow just hangs.

### Enable Google auth in Supabase

Supabase dashboard > **Authentication > Providers > Google**:
- Enable it
- Under "Authorized Client IDs", add the **Web application** client ID from above (this is
  what lets `supabase.auth.signInWithIdToken()` accept the token)

No native Android manifest changes are needed for Google Sign-In itself — this library uses
the legacy Google Sign-In SDK directly, not `google-services.json`/Firebase. On iOS, the one
required native edit is the URL scheme in `Info.plist` covered in step 4 above.

## 5. Native module linking

Everything here autolinks via React Native's CLI — no manual `MainApplication` package
registration needed. Two Android files were already hand-edited for the parts autolinking
can't do:

- `android/app/src/main/AndroidManifest.xml` — a `SEND` intent-filter for `image/*` so
  Dompetcho appears in the Android share sheet, plus camera/media-read permissions
- `android/app/src/main/java/com/dompetcho/MainActivity.kt` — an `onNewIntent` override so a
  share arriving while the app is already running is actually picked up (the app's
  `singleTask` launch mode means Android reuses the existing activity and calls
  `onNewIntent` instead of restarting it)

Just do a clean native build after `npm install` so Gradle picks up all the new
dependencies:

```bash
cd android && ./gradlew clean && cd ..
```

## 6. Run on a physical Android device

An emulator can't be used to properly test this app — the Android share sheet needs another
real app (Gallery, WhatsApp) to share *from*, and Google Sign-In needs Play Services signed
in with a real Google account. Use a physical device:

1. Enable Developer Options + USB debugging on the device, connect via USB, accept the
   debugging prompt.
2. Confirm it's visible: `adb devices`
3. Run:
   ```bash
   npm run android
   ```
   This builds the debug APK, installs it, and starts Metro.

### Testing the share flow
Share any Mandiri Livin' transfer receipt screenshot from Gallery (or forward one to
yourself in WhatsApp and share it from there) → choose **Dompetcho** in the share sheet →
the app opens on the review screen with fields pre-filled.

### Testing Google Sign-In
Tap "Sign in with Google" on first launch → pick the Google account you added as a test user
on the OAuth consent screen (or any account, once the app/consent screen is published).

## 7. Tuning the Mandiri parser against real receipts

`src/parsers/mandiriReceiptParser.ts` was written against the known shape of a Livin' by
Mandiri transfer confirmation screen, but **has not been validated against real ML Kit OCR
output** — that requires an actual device and actual receipt screenshots, neither of which
were available while building this. Before relying on it:

1. Share/upload a real receipt in the running app.
2. Grab the `raw_ocr_text` that got stored on the corresponding `receipt_scans` row (easiest
   via the Supabase Table Editor, or a temporary `console.log` in
   `src/services/receiptImportService.ts`).
3. Paste it into the fixture at the top of
   `src/parsers/__tests__/mandiriReceiptParser.test.ts`, replacing the placeholder text.
4. Run `npm test` and adjust the label regexes in `mandiriReceiptParser.ts` until it passes
   against your real sample. Try a couple of different receipts (different recipient banks,
   with/without a note) since label wording can vary slightly.

## 8. Branching, CI, and Firebase App Distribution

Two long-lived branches: `dev` (default branch — PRs land here, every merge auto-ships to
testers) and `main` (production — a PR from `dev` into `main` is the release act). Both are
branch-protected (CI must pass, no force-push, no deletion). Full detail in ROADMAP.md's
"Branching & release flow" section.

`.github/workflows/ci.yml` runs typecheck/lint/test on every push and PR to either branch —
nothing to set up, it just works.

`.github/workflows/distribute.yml` builds a release APK and uploads it to Firebase App
Distribution on every merge to `dev` (→ `dev-testers` group) or `main` (→ `prod-testers`
group). This one needs three repo secrets (**Settings > Secrets and variables > Actions**)
before it'll run successfully:

| Secret | What it is |
| --- | --- |
| `DOMPETCHO_ENV_TS` | The full contents of your local `src/config/env.ts`, pasted as-is. Unlike CI's typecheck-only placeholder, a build real testers install needs real Supabase/Google config to actually work. |
| `FIREBASE_ANDROID_APP_ID` | From the Firebase console: add an Android app (package `com.dompetcho`) to a Firebase project, then copy its App ID (looks like `1:1234567890:android:abcdef`). |
| `FIREBASE_SERVICE_ACCOUNT` | A service account JSON key with the "Firebase App Distribution Admin" role. Google Cloud Console > IAM > Service Accounts (on the same project as your Firebase project) > create one > grant that role > Keys > Add key > JSON. Paste the whole file content. |

You'll also need to create two **Tester Groups** named `dev-testers` and `prod-testers` in
the Firebase console (App Distribution > Testers & Groups) — add yourself (and anyone else)
to whichever group(s) you want builds to reach. Rename the groups in `distribute.yml` if you
call them something else.

**Deliberate MVP-stage simplifications** — none of these are required to get this working,
but worth knowing about:

- **Same signing key for dev and prod.** Both are signed with the checked-in debug keystore
  (see `android/app/build.gradle`) — the same one already used for local development and
  Google Sign-In. Before ever submitting to the Play Store (a very different distribution
  channel from Firebase App Distribution's internal testing), you'd need a real release
  keystore, kept out of git, with its own SHA-1 registered for Google Sign-In.
- **Same `applicationId` for dev and prod** (`com.dompetcho`). A dev build installs *over*
  a prod build on the same device rather than living alongside it. Giving dev builds a
  separate id (e.g. via an `applicationIdSuffix` in a Gradle product flavor) would let
  testers keep both installed side by side, at the cost of needing a second Google Sign-In
  Android client registration for that new package name.
- **Same Supabase backend for dev and prod** — one project, one database, for both. A
  cleaner setup for a real team is a second Supabase project for dev/staging (its own
  `supabase/schema.sql` run, its own anon key in a `dev` variant of `DOMPETCHO_ENV_TS`), so
  testing never touches production data.

## Project structure

```
src/
  config/        env.ts (gitignored) — Supabase + Google client config
  lib/           supabase.ts client
  types/         shared TS types matching the DB schema
  parsers/       pluggable receipt parsers (mandiriReceiptParser + shared interface)
  services/      OCR, receipt import orchestration, expenses, categories, Google auth
  store/         Zustand stores (auth, expenses, import-in-progress overlay)
  hooks/         useShareIntent, useReceiptProcessor, useTheme
  navigation/    root stack (Login/Main/ExpenseForm) + bottom tabs (Home/Add/Summary)
  screens/       LoginScreen, HomeScreen, SummaryScreen, ExpenseFormScreen
  components/    AmountInput, CategoryPicker, ExpenseListItem, ProfileHeader, ...
supabase/schema.sql
```

## Non-goals for MVP1 (by design)

Other banks/e-wallets, cloud OCR, multiple accounts, budgets, subscriptions, push
notifications, recurring-transaction detection. The parser is structured so a bank/e-wallet
or a cloud LLM+OCR path can be added in `src/parsers/` later without touching the OCR
pipeline or the review/confirm screen — see `src/parsers/index.ts`.
