# Recovered application integration — 2026-10-23

The accepted recovered application was integrated into the existing `dev/auth` history from baseline `9ac6883cf122151dd8f76e91f02bab025752df7b`. The recovered source directory was read only. Repository-specific files and the historical practice interface were retained; no files were deleted or dependencies upgraded.

The root now uses the recovered account-first entrance and richer dashboard. Daily lessons, courses, twelve practice modes, mistakes, roadmap, vocabulary, learning activity and preferences use the recovered learning module inside the existing shell. Assigned lessons, placement/CEFR scoring, progress, achievements and pronunciation remain available. The historical `/practice-library` route uses the same entrance controller.

Supabase authentication, email verification/recovery, account security, MFA policy, callbacks, session cookies and server authorization remain preserved. The only recovered changes inside existing authentication files report an unknown provider retry duration without inventing a countdown. Guest intent remains separate from account authorization. No database migrations, dashboard changes or live account operations were performed. Azure assessment/token routes remain disabled; AI services were not configured or activated.

## Files

Added:

- `app/account/layout.tsx`
- `components/AccountEntryFrame.tsx`
- `components/EntryController.tsx`
- `components/cadence/RecoveredLearning.jsx`
- `lib/entry-state.ts`
- `docs/RECOVERY-PROTECTED.json`
- `docs/RECOVERED-INTEGRATION.md`
- `tests/entry-browser.mjs`
- `tests/entry-state.test.mjs`
- `tests/recovery-browser.mjs`
- `tests/recovery-preservation.test.mjs`

Modified:

- `README.md`
- `app/page.tsx`
- `app/practice-library/page.tsx`
- `components/SupabaseAccount.tsx`
- `components/cadence/App.jsx`
- `lib/supabase/auth-handler.ts`
- `tests/account-browser.mjs`
- `tests/auth-browser.mjs`
- `tests/integration-browser.mjs`
- `tests/supabase-auth.test.mjs`

## Validation

- `npm test`: 108 passed, zero failed or skipped. Includes frozen-file/section preservation, placement scoring, saved-data compatibility, MFA authorization and disabled Azure routes.
- `npm run typecheck`: passed.
- `npm run build`: passed with Next.js 16.4.2; dependency manifests unchanged.
- `npm audit --json`: zero vulnerabilities.
- Browser suites: authentication (12 groups), account (10), MFA (11), integration/pronunciation (10), entry (15), recovered learning (9), all passed: 67 groups total.
- Browser checks used the local production build, an isolated Chrome profile, synthetic learner records and mocked external services. They cover responsive English/Kurdish layouts, guest/account separation, required MFA, stale-session handling, placement preservation, saved practice/course/vocabulary state and actual synthetic microphone recording/playback.
- Screenshots were inspected for the desktop English dashboard and mobile Kurdish RTL dashboard. QA profiles, screenshots and synthetic records remain ignored and unpublished.
- Reviewed publication inventory contained no environment credentials, private records, recovery backups, caches or dependency directories. `.env.example` remains placeholders only; the recovered `.env.local` was never copied or read.

These checks do not establish live Supabase email delivery, live sign-in or live MFA operation. Existing local learning data remains local; this integration does not synchronize it to Supabase. Teacher-assigned lesson placeholders and unconfigured AI remain as supplied in the recovered application.

Root `vercel.json` remains unchanged, including `git.deploymentEnabled["dev/auth"] = false` and `framework = "nextjs"`. This branch-specific rule is documented at https://vercel.com/docs/project-configuration/git-configuration. No deployment command is part of this integration. Post-push branch and deployment observations are reported separately in the final handoff.
