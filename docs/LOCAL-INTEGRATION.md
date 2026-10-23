# Local GitHub integration ? 2026-10-19

Implemented locally in EnglishCo-GitHub on the existing dev/auth branch. No staging, commit, push, merge, deployment, database migration, dashboard change or Azure activation was performed.

## Behavior and preservation

The latest integrated application is the root functional target: Supabase signup/signin, automatic verification requests, recovery, account details, optional TOTP and server MFA checks; placement/CEFR curriculum, vocabulary, progress, guest records, English/Kurdish RTL; pronunciation consent, local recording/playback and cleanup. Existing pronunciation code was transferred intact, not reimplemented.

The repository root had genuinely unique daily lessons, practice modes, mistakes, roadmap, older courses and tutor presentation absent from the target. Instead of deleting these, RepositoryApp.jsx and repository-i18n.js preserve the earlier interface under /practice-library using RepositoryClient.jsx and the same guest storage adapter. More practice links from the main interface; the library links back and to Supabase accounts. Legacy local sign-in UI is not used as the library gate; guest entry grants no Supabase account access. This retains a separate earlier learning interface rather than attempting an unverified rewrite of its tightly coupled components. Review this navigation choice before committing.

Repository-specific courses.js, app/api/tutor/route.ts, runtime Anthropic getters, storage namespaces/tutor validator and original security tests were preserved. level_progress was added to the storage allowlist. The text tutor requires its existing separate legacy account/configuration and has not been activated or live-tested; the library displays it without claiming live AI availability. Its credentials remain blank in .env.example. Existing legacy accounts do not grant access to Supabase account operations.

All historical Cadence-* folders and Git history remain unchanged. Historical folders are excluded from root TypeScript compilation. Prior root setup instructions are preserved in docs/REPOSITORY-SETUP.md. Source AGENTS.md was read but not copied into this repository. Imported handoff/validation reports describe previous runs; this document records this checkout.

Next 16.4.2, React/React DOM 19.2.6 and Supabase dependencies use the source lockfile. SQL changes are source-only and were not executed. Production build does not configure accounts or a database.

## Validation actually performed

- npm ci: passed, 79 packages installed.
- npm audit --json: initial sandbox network attempt failed; approved network retry passed, zero reported vulnerabilities.
- npm test: 104 passed, zero failed.
- npm run typecheck: passed.
- npm run build: passed, Next 16.4.2; includes /practice-library and all account/auth/pronunciation routes.
- Auth browser: 11 groups passed, including 50 bilingual responsive layouts.
- Account browser: 9 groups passed, including standalone/embedded account layouts and stale-state handling.
- MFA browser: 11 groups passed, 60 responsive layouts, no enrollment-secret screenshots.
- Integration browser: 10 groups passed, 20 layouts; actual synthetic audio recording/playback, permission failures, cleanup, disabled Azure HTTP routes, guest storage/draft recovery and repository learning navigation. Initial extra library check timed out at a mobile viewport; desktop metrics were explicitly set for its desktop-sidebar assertions and the full suite passed on rerun.
- git diff --check: passed.

All account/provider operations used mocks and synthetic data. No real account, verification email, recovery email or MFA factor was created. No live Supabase, SMTP, physical microphone or AI provider behavior is certified. External Google fonts were blocked in browser QA, exercising fallback fonts. Prior source-comparison visual-browser.mjs requires its original A/B servers and was not run; current responsive browser suites were run.

## Security and source checks

No .env.local, dependency tree, build cache, browser profile, backup or private student data was copied from the source. .env.example contains nonworking placeholders or blank credentials. Existing ignore rules were extended for QA/browser profiles, backups and artifacts. Actual tracked plus untracked publication candidates were checked for forbidden paths and credential patterns; none found. All 76 reachable historical blobs were scanned for private-key blocks, common provider/token patterns, credential-bearing database URLs and JWTs; no matches. This is a pattern scan, not proof that arbitrary hidden secrets cannot exist. No publication blocker was identified by these scans.

All 96 inventoried source files matched their pre-integration hashes afterward; EnglishCo-Integrated was not modified. Source dependencies, environment and build caches were excluded from the inventory and were not copied or written. GitHub working files are intentionally modified; its historical project folders were preserved. main still resolves to 455d280c8c56da1f108dcdff2742a6bb6a0225cc. dev/auth HEAD and main were not updated.

## Files modified (18)

- .env.example
- .gitignore
- DEPLOY-KURDISH.md
- README.md
- VALIDATION.md
- app/api/email-auth/route.ts
- app/api/session/route.ts
- app/globals.css
- components/CadenceClient.jsx
- components/cadence/App.jsx
- components/cadence/i18n.js
- database/schema.sql
- lib/cadence-security.mjs
- lib/email-auth.ts
- next-env.d.ts
- next.config.mjs
- package.json
- tsconfig.json

## Files created (73)

- .github/CODEOWNERS
- .github/pull_request_template.md
- CONTENT-GUIDE.md
- EMAIL-SETUP-KURDISH.md
- NO-LOGIN-KURDISH.md
- app/account/page.tsx
- app/api/account-email/route.ts
- app/api/pronunciation/route.ts
- app/api/pronunciation/token/route.ts
- app/api/supabase-auth/route.ts
- app/api/supabase-mfa/route.ts
- app/auth/confirm/route.ts
- app/practice-library/page.tsx
- components/AccountDetails.tsx
- components/AccountLinks.jsx
- components/MfaPanel.tsx
- components/RepositoryClient.jsx
- components/SupabaseAccount.tsx
- components/auth-copy.ts
- components/auth-styles.ts
- components/cadence/PronunciationPanel.jsx
- components/cadence/RepositoryApp.jsx
- components/cadence/curriculum.js
- components/cadence/curriculum.json
- components/cadence/placement.js
- components/cadence/pronunciation-data.js
- components/cadence/pronunciation-recorder.js
- components/cadence/pronunciation.css
- components/cadence/repository-i18n.js
- components/mfa-copy.ts
- database/002-account-email.sql
- docs/COLLABORATION.md
- docs/GITHUB-HANDOFF.md
- docs/INTEGRATION-REPORT.md
- docs/REPOSITORY-SETUP.md
- docs/TESTING.md
- docs/input-manifest.json
- docs/package-manifest.json
- lib/account-actions.mjs
- lib/account-mail.ts
- lib/email-requests.ts
- lib/pronunciation-audio.mjs
- lib/pronunciation-disabled.mjs
- lib/pronunciation-service.mjs
- lib/supabase/account-details.ts
- lib/supabase/auth-handler.ts
- lib/supabase/auth-policy.ts
- lib/supabase/client.ts
- lib/supabase/config.ts
- lib/supabase/mfa-handler.ts
- lib/supabase/mfa-policy.ts
- lib/supabase/server.ts
- package-lock.json
- proxy.ts
- public/pcm-recorder.worklet.js
- tests/account-actions.test.mjs
- tests/account-browser.mjs
- tests/account-details.test.mjs
- tests/account-mail.test.mjs
- tests/auth-browser.mjs
- tests/browser-progress.test.mjs
- tests/curriculum.test.mjs
- tests/integration-browser.mjs
- tests/integration.test.mjs
- tests/mfa-browser.mjs
- tests/mfa-fixture.mjs
- tests/mfa.test.mjs
- tests/placement.test.mjs
- tests/pronunciation.test.mjs
- tests/supabase-auth.test.mjs
- tests/supabase-foundation.test.mjs
- tests/visual-browser.mjs
- docs/LOCAL-INTEGRATION.md

## Review readiness

Ready for local code review and an explicitly authorized later commit, with the two-interface preservation choice and mocked/live-service limitations above. No integration test failures remain. All changes remain unstaged. No publication or deployment is authorized by this result.
