# Dompetcho roadmap

The backlog for post-MVP1 work — including work done by a scheduled Claude Code agent
running unattended. Pick the first unchecked item, do only that item, and open a PR; don't
pull in extra items or drift into adjacent cleanup that isn't listed here.

## Non-goals (still off-limits)

Carried over from the original MVP1 spec — do not implement these without the item first
being added to this file by a human:

- No budgets
- No subscriptions/recurring-expense tracking
- No push notifications
- No per-account balance tracking ("mini-wallets"). Multiple accounts are now in scope as a
  source/payment-method *tag* on each expense (see Next MVP below) — but a running balance
  per account is not. Home's "Sisa Saldo" stays one overall number.
- No support for banks other than Mandiri (Livin'). E-wallets (Gojek/GoPay, Grab) are now in
  scope as new OCR parser targets (see Next MVP below) — but other *banks* (BCA, BNI, etc.)
  are not, until a human adds that here.

## Branching & release flow

- `main` is production. It's what `distribute.yml` ships to Firebase App Distribution's
  `prod-testers` group on every merge.
- `dev` is the integration branch and GitHub's default branch — this is where PRs land,
  including every roadmap item and bug fix. Every merge here also auto-ships to
  `dev-testers` via the same workflow, so `dev` is always installable, not just compilable.
- Promoting `dev` to production is a deliberate, separate act: open a PR from `dev` into
  `main` and merge it. That PR is the release — a human reviews and merges it, same as any
  other PR. Nothing here automates that step, on purpose.
- Both branches are protected: the CI status check must pass before merging, no
  force-pushes, no deletions.
- **Firebase App Distribution is the only release channel automation may touch.** A merge to
  `dev` ships to `dev-testers` and nothing else — never to Google Play (any track, including
  Internal testing), and never to any other store or external distribution service. The same
  holds for `main` → `prod-testers`. Publishing to the Play Store is a manual, human-only act
  done from the Play Console; see the ground rule below.

## Ground rules for automated work

- **Never add Play Store / app-store publishing to automation.** Don't add a workflow, job,
  step, Fastlane lane, or script that uploads to Google Play or the App Store (or that holds
  a Play Developer API service account), and don't make any workflow triggered by a push to
  `dev` produce a store-bound artifact other than the existing Firebase APK. Building an AAB
  locally by hand is fine; shipping one anywhere is a human decision. If a roadmap item seems
  to need this, stop and say so in the PR/report instead of doing it. Likewise, never touch
  how the release-signing secrets are read or stored (`DOMPETCHO_RELEASE_*`).

- **First, before picking a new item: re-check every other open PR for conflicts.** Run
  `gh pr list --state open --json number,headRefName,mergeable`. A merge to `dev` (including
  one this agent didn't open) can silently turn an unrelated open PR conflicting — it doesn't
  self-heal and nobody gets notified. For each `mergeable: CONFLICTING` PR: check out its
  branch, `git merge origin/dev`, resolve conflicts by keeping *both* sides' changes (two PRs
  usually just add different fields to the same shared object/type — never drop one to keep
  the other), rerun typecheck/lint/test, commit, and push to update the PR in place. Skip a
  PR only if it's a known duplicate flagged for closing (say so in the report instead of
  fixing it). Only after this pass is clean, move on to the next backlog item below.
- **Never push to `main` or `dev` directly.** Work on a branch off `dev`, open a PR against
  `dev`, let CI run.
- **Run `npm run typecheck`, `npm run lint`, and `npm test` before opening the PR.** All
  three must pass clean (lint may have pre-existing warnings — don't add new ones).
- **A DB schema change is a PR, not a migration run.** If an item needs a new/changed
  Supabase column, add the idempotent SQL to `supabase/schema.sql` (see its existing
  `alter table ... add column if not exists` / `do $$ ... $$` patterns) and say clearly in
  the PR description that a human needs to run it in the Supabase SQL Editor. Never assume
  it's already applied.
- **UI text is Bahasa Indonesia**, matching the rest of the app. Code, comments, and commit
  messages are English.
- **Match the existing design system** — tokens in `src/constants/` (spacing, radius,
  typography, elevation, theme colors), the custom SVG icon set in `src/components/Icon.tsx`
  (no emoji, no icon-font libraries), and the established screen patterns (e.g. how
  `useStatusBarStyle` is called per-screen).
- **One item per PR.** Keep it reviewable.

## Next MVP

- [x] **Self-serve sign-up for email/password login.** Right now every email/password user
      has to be created by hand in the Supabase dashboard (see README). Add a sign-up mode
      to `LoginScreen`'s email/password block (toggle between "Masuk" and "Daftar", call
      `supabase.auth.signUp`), so anyone can create their own account without asking the
      developer first. Decide how to handle email confirmation (Supabase's default requires
      it unless "Auto Confirm User" is on project-wide — note whichever behavior ships in
      the PR description so it's a visible decision, not a silent one).

- [x] **Extract "Keterangan Transaksi" from receipts into the note field.** Several real
      Livin' receipts carry a personal memo under this label (e.g. "rumah sep 26") that
      maps directly to the app's own Catatan/note concept, but the parser doesn't extract
      it at all today — `ExpenseFormScreen` currently prefills the note with the recipient
      name instead. Add a `parsed_note` column to `receipt_scans` (schema migration, see
      ground rules above), extract it in `mandiriReceiptParser.ts` with a test fixture from
      the real receipts already in `mandiriReceiptParser.test.ts`, thread it through
      `receiptImportService.ts`, and prefill the note field from it when present (falling
      back to the current recipient-name behavior when it's absent).

- [x] **Warn instead of silently importing a failed/pending transaction.** The parser
      assumes every receipt screenshot is a successful transaction. If OCR text doesn't
      contain a success indicator (e.g. "Berhasil"), or contains a clear failure/pending one
      (e.g. "Gagal", "Diproses", "Pending"), surface a warning on the review screen instead
      of silently treating it as a normal expense to confirm. There's no real sample of a
      failed receipt in the test fixtures yet — write this from the success-keyword-absent
      heuristic and leave a comment noting a real failed-receipt fixture would sharpen it
      further.

- [x] **Tag each expense with a source account.** Add an `accounts` table (`id`, `user_id`,
      `name`, `kind`: `'bank' | 'ewallet' | 'cash'`, `created_at`) and a nullable
      `account_id` FK on `expenses` (schema migration, see ground rules above). Users manage
      their own list — a simple "Kelola Akun" flow (create/rename/delete) — and pick one per
      expense in `ExpenseFormScreen`, defaulting to unset. For receipt imports, extract the
      "Sumber Dana" line Mandiri receipts already show (e.g. "TEGAR ALDINA GALARI / Bank
      Mandiri - •••••••7448") into a new parser field, and try to match it to an existing
      account by name before prompting the user to create one. This is a source/payment-
      method *tag*, not a wallet — no per-account balance, no effect on Home's Sisa Saldo;
      it's a new filter/breakdown dimension for later (e.g. on Summary). Likely bigger than
      a typical item — fine to split into a schema+parser PR followed by a UI PR if that's
      more reviewable; note the split in each PR description.

- [x] **Add a Gojek/GoPay receipt parser.** Follow the exact pattern in
      `src/parsers/mandiriReceiptParser.ts` (a `ReceiptParser` with `detect`/`parse`,
      registered in `src/parsers/index.ts`) for GoPay transaction confirmation screenshots.
      Widen the `BankDetected` type (`src/types/index.ts`) and the `bank_detected` check
      constraint in `supabase/schema.sql` to add `'gojek'`. **There is no real sample of a
      GoPay receipt in the test fixtures yet** — the same situation Mandiri's parser started
      in. Build a best-effort first pass from publicly-known GoPay receipt layout
      conventions, ship it behind the same "not yet validated against real OCR output"
      caveat the Mandiri parser originally shipped with (see README's tuning section), and
      leave a comment asking for a real screenshot to tune against — don't block the PR on
      getting one.

- [x] **Add a Grab receipt parser.** Same approach and same caveat as the Gojek item above —
      a new `ReceiptParser` for Grab's transaction confirmation screenshots (rides/food,
      paid via GrabPay or an in-app OVO balance), registered the same way, adding `'grab'`
      to `BankDetected` and the schema check constraint. No real sample exists yet; ship a
      best-effort first pass and ask for a real screenshot to tune against.

## Store-readiness (app-side only)

Things Google Play requires of the app itself before a human can submit it. None of these
publish anything — see "Firebase App Distribution is the only release channel automation may
touch" above.

- [ ] **In-app account deletion.** Play requires any app that lets users create an account to
      also let them delete it from inside the app. Add a "Hapus Akun" row to `ProfileScreen`
      (below "Keluar", styled as destructive via `theme.danger`) with a two-step confirmation
      `Alert` that spells out that every expense, account tag, and receipt scan is permanently
      deleted. The client can't delete its own `auth.users` row, so add a
      `public.delete_my_account()` `security definer` function to `supabase/schema.sql` (it
      deletes `auth.uid()`'s row from `auth.users`; confirm the existing `on delete cascade`
      FKs from `users`/`expenses`/`accounts`/`receipt_scans` actually clear everything, and fix
      any that don't) and call it via `supabase.rpc`. On success sign out and clear the local
      stores. This is a schema change — flag the manual SQL step clearly in the PR (see ground
      rules). Don't just delete the `users` profile row; a leftover auth user would still be
      able to sign in.

- [ ] **Link the privacy policy from inside the app.** Play expects the policy to be reachable
      in-app, not only on the store listing. Add a "Kebijakan Privasi" row to `ProfileScreen`
      (next to the existing "Tentang Dompetcho" block) and a small tappable "Kebijakan
      Privasi" line under the sign-in buttons on `LoginScreen`, both opening
      `https://aldinag.github.io/Dompetcho/` with `Linking.openURL`. Put the URL in one
      constant (e.g. `src/constants/links.ts`). No new dependency, and don't change the
      published policy page itself (it lives on the `gh-pages` branch, separate from app code).

- [ ] **Show the real app version on Profile.** `ProfileScreen` hardcodes "Versi 1.0 (MVP1)".
      Replace it with a single source-of-truth constant (e.g. `src/config/appInfo.ts`) and add
      a Jest test that reads `android/app/build.gradle` and fails if its `versionName` ever
      drifts from that constant, so the two can't silently disagree. No new native
      dependency (don't pull in `react-native-device-info` for this).

## More features

- [ ] **Let Summary's chart cover any month, not just the latest.** `SummaryScreen`'s donut
      chart and legend always show the most recent month that has expenses. Add a compact
      month selector above the chart (previous/next chevrons using existing `Icon`s, label
      like "September 2026", disabled at the first/last month that has data) that drives the
      chart + legend. Default stays "latest month". The month-grouped list below is unchanged.

- [ ] **Break Summary down by source account, not just category.** Now that expenses can be
      tagged with an account (see "Tag each expense with a source account"), add a
      "Kategori | Akun" segmented toggle above `SummaryScreen`'s chart that re-slices the same
      month's expenses by `account_id` (untagged ones grouped as "Tanpa Akun", using a neutral
      color distinct from the category palette). This is still just a breakdown — no
      per-account balance, no effect on Home's Sisa Saldo (see non-goals).

- [ ] **Search and filter the expense list.** Add a search field on Home that filters by note
      text, plus a category filter. Because Home is paginated, this must be a server-side
      filter (`ilike` on `note`, `eq` on `category_id` via `listExpenses`'s options), not a
      client-side filter over the loaded page — otherwise results silently miss older rows.
      Debounce the input, show a distinct "no results" state (not the first-run `EmptyState`),
      and keep the balance/month cards unaffected by the filter. Likely bigger than a typical
      item — fine to split the search and the category filter into two PRs; note the split.

## Maintenance / hardening

- [x] **Fix negative "Sisa Saldo" formatting.** `formatRupiah` on a negative number
      currently renders like `Rp -50.000`. Indonesian convention is `-Rp 50.000`. Fix in
      `src/utils/format.ts` and add a test case.

- [x] **Remove the unused `react-native-chart-kit` dependency.** It was used for
      `SummaryScreen`'s pie chart, which was replaced by the month-grouped list. Confirm
      there's no remaining import anywhere, then remove it from `package.json` and run
      `npm install` to update the lockfile.

- [x] **Add pagination to `listExpenses`.** It currently fetches every expense with no
      limit. Fine at MVP1 scale, but add a reasonable page size + "load more" (or
      infinite-scroll) on Home before it becomes a real problem for long-time users. Keep
      Summary's month-grouping working correctly against a paginated fetch (it may need its
      own unpaginated query, or a "load earlier months" affordance — use your judgment and
      explain the choice in the PR).

- [x] ~~Add an Android release-build CI job.~~ Superseded by `distribute.yml`, which builds
      `assembleRelease` on every merge to `dev`/`main` (and ships it to Firebase App
      Distribution) — so native build breakage now surfaces immediately rather than needing
      a separate job. This still doesn't replace testing on a real device.

- [ ] **Move the totals and Summary breakdown to server-side aggregates.** `getExpenseTotals`
      still pulls every row's `amount, type` to sum client-side, and `SummaryScreen` still
      pulls every expense (with its category join) to group by month/category — both stay
      O(history) for the life of an account. Add Postgres RPC functions to
      `supabase/schema.sql` (e.g. `expense_totals(month_start, month_end)` and
      `expense_breakdown_by_month()` returning month × category sums, both `security invoker`
      so RLS still scopes to the caller) and switch the two call sites over. Schema change —
      flag the manual SQL step in the PR. Keep the existing unit tests' intent (balance,
      month totals, per-month sums) passing against the new shape.

- [ ] **Extract and test the grouping helpers.** `groupByDay` (HomeScreen) and `groupByMonth`
      (SummaryScreen) hold real logic — local-time day/month keys, income vs expense signs,
      category roll-ups — but live inside screen files with no tests. Move them to
      `src/utils/` (e.g. `groupExpenses.ts`) and cover the edge cases: a late-night expense
      near midnight in a non-UTC timezone, uncategorized expenses, income excluded from the
      spend breakdown, and ordering. Behavior must not change.

- [ ] **[needs a human with a native debugger — agent: skip this item]** Fix the local `assembleDebug` + Metro dev loop: crashes with `PlatformConstants`
      could not be found.** On this project's dev machine (Android emulator, API level of
      "Pixel_10" AVD), launching a debug build connected to Metro crashes immediately with:
      ```
      Invariant Violation: TurboModuleRegistry.getEnforcing(...): 'PlatformConstants' could
      not be found. ... Bridgeless mode: true. Modules loaded: {"NativeModules":[],
      "TurboModules":[],"NotFound":["NativePerformanceCxx","NativePerformanceObserverCxx",
      "PlatformConstants"]}
      ```
      followed by `AppRegistryBinding::startSurface failed. Global was not installed.` Every
      core TurboModule comes back unregistered, not just app-specific ones. `assembleRelease`
      is unaffected — `distribute.yml` ships working release builds to Firebase App
      Distribution on every merge, and one was confirmed working on a real Android phone. Only
      the local debug/Bridgeless dev loop is broken, which blocks taking real before/after
      screenshots for PR evidence.

      Already ruled out, each with hard evidence (see PR that added this item for the
      full investigation):
      - Stale Gradle/CMake cache — a true `./gradlew clean`, removing `android/app/.cxx`, and
        a full native recompile (366/430 tasks actually executed) reproduced the identical
        crash.
      - JS/native version mismatch — both resolve to exactly `react-native@0.87.0`.
      - The known upstream `appmodules.so` CMake glob bug
        ([facebook/react-native#47352](https://github.com/facebook/react-native/issues/47352))
        — already fixed in our installed `react-native` version; confirmed `OnLoad.cpp` is
        actually compiled into `libappmodules.so` via `compile_commands.json`.
      - Broken/duplicate symbol linkage — `llvm-nm`/`llvm-readelf` on the built
        `libappmodules.so` confirm `JNI_OnLoad` is exported, `DefaultTurboModuleManagerDelegate
        ::cxxModuleProvider`/`javaModuleProvider` are correctly `U` (undefined/external, not
        duplicated), and `libreactnative.so` is a correct `NEEDED` entry.
      - Stale app data/ART cache — a full `adb uninstall` + fresh install reproduced the
        identical crash.

      Next step needs a native debugger (lldb) attached to the running process to check
      whether `JNI_OnLoad` in `libappmodules.so` actually executes and what
      `DefaultTurboModuleManagerDelegate::cxxModuleProvider`/`javaModuleProvider` resolve to
      at runtime — or trying a different AVD system image in case this one has a bad build.
