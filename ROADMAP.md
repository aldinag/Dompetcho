# Dompetcho roadmap

The backlog for post-MVP1 work — including work done by a scheduled Claude Code agent
running unattended. Pick the first unchecked item, do only that item, and open a PR; don't
pull in extra items or drift into adjacent cleanup that isn't listed here.

## Non-goals (still off-limits)

Carried over from the original MVP1 spec — do not implement these without the item first
being added to this file by a human:

- No wallets/multiple accounts
- No budgets
- No subscriptions/recurring-expense tracking
- No push notifications

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

## Ground rules for automated work

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

- [ ] **Warn instead of silently importing a failed/pending transaction.** The parser
      assumes every receipt screenshot is a successful transaction. If OCR text doesn't
      contain a success indicator (e.g. "Berhasil"), or contains a clear failure/pending one
      (e.g. "Gagal", "Diproses", "Pending"), surface a warning on the review screen instead
      of silently treating it as a normal expense to confirm. There's no real sample of a
      failed receipt in the test fixtures yet — write this from the success-keyword-absent
      heuristic and leave a comment noting a real failed-receipt fixture would sharpen it
      further.

## Maintenance / hardening

- [ ] **Fix negative "Sisa Saldo" formatting.** `formatRupiah` on a negative number
      currently renders like `Rp -50.000`. Indonesian convention is `-Rp 50.000`. Fix in
      `src/utils/format.ts` and add a test case.

- [ ] **Remove the unused `react-native-chart-kit` dependency.** It was used for
      `SummaryScreen`'s pie chart, which was replaced by the month-grouped list. Confirm
      there's no remaining import anywhere, then remove it from `package.json` and run
      `npm install` to update the lockfile.

- [ ] **Add pagination to `listExpenses`.** It currently fetches every expense with no
      limit. Fine at MVP1 scale, but add a reasonable page size + "load more" (or
      infinite-scroll) on Home before it becomes a real problem for long-time users. Keep
      Summary's month-grouping working correctly against a paginated fetch (it may need its
      own unpaginated query, or a "load earlier months" affordance — use your judgment and
      explain the choice in the PR).

- [x] ~~Add an Android release-build CI job.~~ Superseded by `distribute.yml`, which builds
      `assembleRelease` on every merge to `dev`/`main` (and ships it to Firebase App
      Distribution) — so native build breakage now surfaces immediately rather than needing
      a separate job. This still doesn't replace testing on a real device.
