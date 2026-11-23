# Dompetcho roadmap

The backlog for post-MVP1 work — including work done by a scheduled Claude Code agent
running unattended. Pick the first unchecked item, do only that item, and open a PR; don't
pull in extra items or drift into adjacent cleanup that isn't listed here.

## Non-goals (still off-limits)

Carried over from the original MVP1 spec — do not implement these without the item first
being added to this file by a human:

- No budgets — except the single per-category monthly limit described under "More features"
  ("Monthly budget per category"). Nothing broader: no rollover, no per-account or yearly
  budgets, no alerts/notifications.
- No subscriptions/recurring-expense tracking — except the weekly/monthly recurring
  transactions described under "More features" ("Recurring transactions", three steps).
  Nothing broader: no yearly or custom intervals, no reminders, and no push notifications
  of any kind (they still apply below) — due items are simply posted when the app opens.
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

- [x] **In-app account deletion.** Play requires any app that lets users create an account to
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

- [x] **Link the privacy policy from inside the app.** Play expects the policy to be reachable
      in-app, not only on the store listing. Add a "Kebijakan Privasi" row to `ProfileScreen`
      (next to the existing "Tentang Dompetcho" block) and a small tappable "Kebijakan
      Privasi" line under the sign-in buttons on `LoginScreen`, both opening
      `https://aldinag.github.io/Dompetcho/` with `Linking.openURL`. Put the URL in one
      constant (e.g. `src/constants/links.ts`). No new dependency, and don't change the
      published policy page itself (it lives on the `gh-pages` branch, separate from app code).

- [x] **Show the real app version on Profile.** `ProfileScreen` hardcodes "Versi 1.0 (MVP1)".
      Replace it with a single source-of-truth constant (e.g. `src/config/appInfo.ts`) and add
      a Jest test that reads `android/app/build.gradle` and fails if its `versionName` ever
      drifts from that constant, so the two can't silently disagree. No new native
      dependency (don't pull in `react-native-device-info` for this).

## More features

- [x] **Let Summary's chart cover any month, not just the latest.** `SummaryScreen`'s donut
      chart and legend always show the most recent month that has expenses. Add a compact
      month selector above the chart (previous/next chevrons using existing `Icon`s, label
      like "September 2026", disabled at the first/last month that has data) that drives the
      chart + legend. Default stays "latest month". The month-grouped list below is unchanged.

- [x] **Break Summary down by source account, not just category.** Now that expenses can be
      tagged with an account (see "Tag each expense with a source account"), add a
      "Kategori | Akun" segmented toggle above `SummaryScreen`'s chart that re-slices the same
      month's expenses by `account_id` (untagged ones grouped as "Tanpa Akun", using a neutral
      color distinct from the category palette). This is still just a breakdown — no
      per-account balance, no effect on Home's Sisa Saldo (see non-goals).

- [x] **Search and filter the expense list.** Add a search field on Home that filters by note
      text, plus a category filter. Because Home is paginated, this must be a server-side
      filter (`ilike` on `note`, `eq` on `category_id` via `listExpenses`'s options), not a
      client-side filter over the loaded page — otherwise results silently miss older rows.
      Debounce the input, show a distinct "no results" state (not the first-run `EmptyState`),
      and keep the balance/month cards unaffected by the filter. Likely bigger than a typical
      item — fine to split the search and the category filter into two PRs; note the split.

- [x] **Home: retry button for failed loads, and an offline state.** Today a failed
      `loadInitial`/`refresh`/`loadMoreExpenses` only shows an `Alert` and leaves Home blank
      or stale with no way to try again except pull-to-refresh. Add an inline error state
      (Bahasa Indonesia copy, a "Coba Lagi" button using the existing button styles) in the
      list's empty/footer slot, keyed off the store's error state, and a slim "Tidak ada
      koneksi" banner when a request fails with a network error. No new native dependency —
      detect offline from the failed request, don't add `@react-native-community/netinfo`.
      Cover the store's error → retry transition with a test.

- [x] **Swipe to delete an expense, with undo.** First check whether `ExpenseFormScreen`
      already deletes (it mentions "Hapus"); the goal here is the fast path on Home: swipe a
      row (`react-native-gesture-handler` is already installed) to reveal a "Hapus" action,
      delete via a new `deleteExpense` in `expenseService.ts`, and show a short "Dihapus —
      Urungkan" snackbar that restores the row if tapped within a few seconds (re-insert the
      same values rather than keeping a soft-delete column). Balance and month cards must
      update immediately and stay correct after undo. Add store tests for delete and undo.

- [x] **Monthly budget per category.** This is the one budgets feature a human has approved
      (see the note on the "No budgets" non-goal). Add a `category_budgets` table to
      `supabase/schema.sql` (`user_id`, `category_id`, `monthly_limit`, unique per
      user+category, RLS scoping to the owner, idempotent `create table if not exists`),
      flag in the PR that schema.sql auto-applies on merge to `dev`. Add a small "Anggaran"
      row per category on Summary (tap to set or clear a limit through the existing
      `AmountInput`) and, for the selected month, a thin progress bar under each category in
      the month list: neutral under 80%, warning color from 80%, danger color over 100%, with
      "Rp X dari Rp Y" text. No rollover, no per-account or yearly budgets, and no
      notifications — display only. Put the percent/over-budget math in `src/utils/` with
      tests.

- [x] **Export expenses to CSV.** Add an "Ekspor CSV" row on Profile that builds a CSV of
      the expenses for a chosen month (a simple previous/next month picker is enough;
      default is the current month) and hands it to the system share sheet with React
      Native's built-in `Share` API — no new native dependency (no file-system or
      document-picker library). Columns: date (local, `YYYY-MM-DD`), type, category, account,
      amount, note. Put CSV building in `src/utils/` with tests covering commas, quotes and
      newlines in the note, and a month with no expenses (show a message instead of sharing
      an empty file). The export should fetch with `listExpenses` pagination so it isn't
      limited to what Home has loaded.

### Recurring transactions (one feature, three steps — do them in order)

- [x] **Recurring transactions, step 1 of 3: data layer.** Add a `recurring_transactions`
      table to `supabase/schema.sql` (`id`, `user_id`, `type` income/expense, `amount > 0`,
      `category_id`, `account_id`, `note`, `frequency` `weekly`|`monthly`, `anchor_date`
      (the first occurrence), `last_posted_on` date nullable, `is_active` default true,
      `created_at`), RLS scoping to the owner, idempotent `create table if not exists`.
      Also add nullable `recurring_id` (references the table, `on delete set null`) and
      `occurrence_date` (date) columns to `expenses` plus a partial unique index on
      `(recurring_id, occurrence_date) where recurring_id is not null` — this is what makes
      posting idempotent across devices — and allow `'recurring'` in the `expenses.source`
      check (mirror how earlier migrations dropped/re-added that constraint). Flag in the PR
      that schema.sql auto-applies on merge to `dev`. Add `src/services/recurringService.ts`
      (list/create/update/delete) following `budgetService.ts`'s shape, and a pure util in
      `src/utils/` that, given a rule and "today", returns every due occurrence date not yet
      posted: weekly steps by 7 days, monthly keeps the anchor's day-of-month but clamps to
      the last day of short months (31st → 28/29/30), local-time dates, capped at 12
      occurrences per call. Unit-test the util hard (month-end clamping, leap year, a rule
      starting in the future, nothing due, the cap, timezone near midnight). No UI yet.

- [x] **Recurring transactions, step 2 of 3: manage screen.** Add a "Transaksi Berulang" row
      on Profile (next to "Kelola Akun") opening a `ManageRecurringScreen`, modelled on
      `ManageAccountsScreen`: a list showing each rule's note/category, amount, "Tiap
      minggu" / "Tiap bulan" plus the next due date, a pause/resume switch, and swipe or
      button delete with confirmation; an add/edit form reusing `AmountInput`,
      `CategoryPicker`, `AccountPicker`, the income/expense toggle and the date picker (the
      chosen date becomes `anchor_date`), with a weekly/monthly segmented control. Add an
      `EmptyState` explaining the feature in one sentence. UI text in Bahasa Indonesia.
      Don't post anything yet — this step only creates and edits rules.

- [ ] **Recurring transactions, step 3 of 3: post due items on app open.** When the user is
      signed in and the app starts or returns to the foreground (`AppState`), fetch active
      rules, compute due occurrences with the step-1 util, and insert them as normal
      expenses (`source = 'recurring'`, with `recurring_id` + `occurrence_date`), then update
      `last_posted_on`. Rely on the unique index for safety: treat a unique-violation as
      "already posted" and carry on, so two devices opening at once can't double-post. Catch
      up missed periods (up to the cap) rather than skipping them. Refresh the Home store
      afterwards and show one `UndoSnackbar`-style message, "N transaksi berulang
      ditambahkan", with no per-item prompts. Show a small "Berulang" badge on those rows in
      `ExpenseListItem`. Throttle so it runs at most once per foreground. Add tests for the
      orchestration with the service mocked (nothing due, several due, unique-violation
      swallowed, a failing rule doesn't block the others).

### Smoother UX on existing features

- [x] **Add form: remember the last category and account.** Opening "Tambah" currently
      starts blank, so repeat entries cost extra taps. Default the new-expense form's
      category and account (and type) to those of the most recent expense already in the
      Home store; no new storage or dependency. Don't override anything when editing or when
      a receipt import pre-fills the form. The user can still change every field. Put the
      "pick defaults from the latest expense" logic in `src/utils/` with tests (empty
      history, latest has no category/account, deleted category/account).

- [x] **Add/edit form: inline validation and a delete button.** Replace the "Nominal wajib
      diisi" `Alert` with an inline error under the amount field (danger color, cleared as
      soon as a valid amount is entered) and keep "Simpan" visually enabled-but-guarded
      rather than silently failing. When editing an existing expense, add a "Hapus" button
      at the bottom (danger style, confirmation `Alert`, then go back and reuse the same
      delete + undo flow as Home's swipe-to-delete — check `HomeScreen` and the store
      before writing any new delete code). Keep every other `Alert` as is.

- [ ] **Summary: tap a category to see its transactions.** In the month list on Summary,
      make each category row open Home pre-filtered to that category and that month. Check
      first whether Home's filter state (search + category, from the "Search and filter"
      item) can be seeded through navigation params; if it can't, add the smallest param
      wiring needed and a visible "Filter: <kategori>, <bulan>" chip with an "x" to clear it.
      The balance/month cards on Home must stay unfiltered. Keep the budget "Ubah anggaran"
      tap target separate so tapping it doesn't navigate.

- [ ] **Summary: compare with last month.** Under the selected month's total expense, show
      a one-line comparison with the previous month ("Rp 250.000 lebih hemat dari bulan
      lalu" in the success color / "Rp 120.000 lebih boros…" in the danger color; hide it
      when the previous month has no data), and the same small delta per category row. Reuse
      the data `SummaryScreen` already loads — no extra query. Put the delta math in
      `src/utils/` with tests (no previous month, zero previous, category missing last month,
      income excluded).

- [ ] **Consistent error handling on Summary and Kelola Akun.** Home got an inline "Coba
      Lagi" error state; Summary and `ManageAccountsScreen` still only throw an `Alert` on a
      failed load and then sit blank. Give both the same inline error state (reuse the
      pattern/component from Home rather than copying it — extract a small shared component
      if that's cleaner) with a retry button, plus the "Tidak ada koneksi" wording for
      network errors via `src/utils/networkError.ts`. Don't change save/delete failure
      alerts.

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

- [x] **Move the totals and Summary breakdown to server-side aggregates.** `getExpenseTotals`
      still pulls every row's `amount, type` to sum client-side, and `SummaryScreen` still
      pulls every expense (with its category join) to group by month/category — both stay
      O(history) for the life of an account. Add Postgres RPC functions to
      `supabase/schema.sql` (e.g. `expense_totals(month_start, month_end)` and
      `expense_breakdown_by_month()` returning month × category sums, both `security invoker`
      so RLS still scopes to the caller) and switch the two call sites over. Schema change —
      flag the manual SQL step in the PR. Keep the existing unit tests' intent (balance,
      month totals, per-month sums) passing against the new shape.

- [x] **Extract and test the grouping helpers.** `groupByDay` (HomeScreen) and `groupByMonth`
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
