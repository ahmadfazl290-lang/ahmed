# Stage B integration report

Completed locally; no Git/GitHub publication, live accounts, database/configuration changes or Azure activation.

Project: C:\Users\SherdllStore\AppData\Local\Temp\EnglishCo-Integrated-2026-10-18T20-49-43-400Z-c882c1

QA artifacts (outside package): C:\Users\SherdllStore\AppData\Local\Temp\EnglishCo-Integrated-2026-10-18T20-49-43-400Z-c882c1-qa

## Preservation and conflict decisions

| Feature | Final implementation |
| --- | --- |
| Shared home/dashboard | A HomePage and existing placement/courses/default route retained; no invented redesign or attribution |
| Accounts and security | A Supabase forms, signup initial email/resend/callback/recovery/logout, account details, SSR cookies/proxy and TOTP gates unchanged |
| Legacy auth | A isolated Neon routes preserved; B older auth wiring not imported or activated; no second Supabase flow |
| Pronunciation | Actual B panel, prompt data, PCM encoder/validator, AudioWorklet recorder and dormant provider helper retained |
| Navigation | B Mic/Pronunciation item and mobile primary slot merged at component level; Profile/Settings remain in More; A account link/My Account retained |
| Languages/style | B EN/KU strings/direction and dark/responsive UI retained; added CSS scoped under .ec-pronunciation; A globals/layout/fonts unchanged |
| Local learning | UUID, cadence:guest-data:, cadence:ui-language, placement/progress/curriculum/vocabulary/activity formats unchanged; account email never substituted as guest history key |
| Recording safety | Explicit local consent before capture; useful unsupported/denied/missing/busy-device states; pending-permission cancellation; track/context/object-URL cleanup on end/cancel/unmount; no persistent audio |
| Azure | Hard false constant; route code does not import provider/read configuration/body. GET status reports false; assessment POST and token GET/POST return 503 ASSESSMENT_DISABLED, no tokens or uploads. Browser has no active upload path or new score generation |
| History | Existing device-local score history retained and clearly labeled previous results while service is off; no new result writes |
| Dependencies | A package.json/package-lock.json byte-identical; no dependency added/upgraded/downgraded, no copied node_modules |

Routes: / unchanged guest placement/learning, default courses after completed placement. /account?provider=supabase and its signup/recover/update/mfa/security modes, /auth/confirm and Supabase APIs unchanged. Successful signin reaches / only after required MFA. Pronunciation is internal view. New /api/pronunciation and /api/pronunciation/token are inactive-only contracts. Existing legacy endpoints are isolated, not a Supabase fallback.

## Tests and builds actually performed

All commands ran outside OneDrive. A baseline tests/typecheck/build first ran in the new integrated directory before mutation. B unit baseline ran in C:\Users\SherdllStore\AppData\Local\Temp\EnglishCo-Integrated-2026-10-18T20-49-43-400Z-c882c1-qa\source-b-reference; later both A/B reference staging projects built for visual comparison. B lacked a lockfile, so reference npm ci used A's compatible lock without changing the original B manifest. B installed 69 packages and A/integrated installed 79. Scripts were inspected; install used npm ci --ignore-scripts --offline --no-audit --no-fund.

| Command/check | Result |
| --- | --- |
| Baseline A npm test | 88 passed, 0 failed |
| Baseline A npm run typecheck / npm run build | Passed |
| Baseline B node --experimental-strip-types --test tests/*.test.mjs | 44 passed, 0 failed (provider transport entirely mocked) |
| Reference A and B npm run build | Both passed in separate QA staging |
| Integrated npm test | 103 passed, 0 failed (88 retained + 12 B pronunciation + 3 focused integration boundary/recorder tests) |
| Integrated npm run typecheck / npm run build | Passed after application integration; no compiled app changes after this build |
| node tests/auth-browser.mjs | 11 groups passed; 50 responsive layouts; zero real Auth requests |
| node tests/account-browser.mjs | 9 groups passed; 20 responsive account/embedded layouts; zero real Auth requests |
| node tests/mfa-browser.mjs | 11 groups passed; 60 reported responsive layouts plus setup QR bounds checks; zero real Auth requests; zero enrollment screenshots |
| node tests/integration-browser.mjs | 9 groups passed; 20 EN/KU x light/dark x five-width layouts; real synthetic capture/AudioWorklet/WAV playback and cleanup, permission failures/cancel, More/Profile/My Account, keyboard, history and placement-resume preservation |
| node tests/visual-browser.mjs | 6 A/B comparisons passed; 14 actual staged screenshots, EN/1440/light and KU/390/dark; dashboard/account signatures match A; prompt-card typography/palette/padding/radius/width and heading match B |

Focused HTTP/unit tests confirm disabled assessment/token responses despite credential/enable flags and zero body reads/provider invocations. Browser QA makes no assessment POSTs and no Azure/Supabase provider traffic. Synthetic fixture history/drafts are used only in isolated profile; no actual student records are loaded or changed.

Visual inspection was performed on actual staged A/B/integrated screenshots, including English desktop and Kurdish dark mobile panel/home and retained account screens. Approved differences: consent before recording; honest inactive-service copy; previous-device-history label; retained A account entry; B nav placement. No clipped pronunciation controls/horizontal overflow at 320/375/390/768/1440. External Google font loading was blocked during QA, so fallback-font rendering was checked; live fonts and physical devices remain unverified. Screenshot/computed-style checks are not a claim of exhaustive pixel identity for every state.

Execution/environment notes are in TESTING.md: initial baseline began before dependency installation completed and failed on missing Next modules; unchanged baseline passed after installation. Initial isolated Chrome GPU launch failed; a fresh isolated profile with GPU disabled worked. No original/OneDrive metadata/cache cleanup occurred. The minimum-duration media fixture and a CDP window-serialization test error were corrected without weakening production validation/security assertions.

## Input preservation evidence

Pre-change manifests are recorded in docs/input-manifest.json; a separate private QA manifest covers originals, validated Dev copy and both backups, including private environment checksums without displaying values. Completion recheck: 265 protected-input file hashes unchanged; all 55 extracted B hashes unchanged; original teammate ZIP SHA-256 unchanged (0e6b8474889072096b362da7038ae1ed3e9b8092d077430f76294e40b505c44b). Comparison excludes generated dependencies/caches/browser profiles and never follows source links. No private environment was copied. All integrated Supabase helper/API/callback/proxy/auth/account/MFA files, database schemas, package/lock, placement/curriculum/shared i18n, root/layout/global CSS and guest adapter remain byte-identical to A. App.jsx has only the approved semantic pronunciation/nav/label additions.

## Changed files relative to A at report generation

- .env.example
- .gitignore
- components/cadence/App.jsx
- README.md

## Added files at report generation

- .github/CODEOWNERS
- .github/pull_request_template.md
- AGENTS.md
- app/api/pronunciation/route.ts
- app/api/pronunciation/token/route.ts
- components/cadence/pronunciation-data.js
- components/cadence/pronunciation-recorder.js
- components/cadence/pronunciation.css
- components/cadence/PronunciationPanel.jsx
- docs/COLLABORATION.md
- docs/GITHUB-HANDOFF.md
- docs/input-manifest.json
- docs/TESTING.md
- lib/pronunciation-audio.mjs
- lib/pronunciation-disabled.mjs
- lib/pronunciation-service.mjs
- public/pcm-recorder.worklet.js
- tests/integration-browser.mjs
- tests/integration.test.mjs
- tests/pronunciation.test.mjs
- tests/visual-browser.mjs
- VALIDATION.md is updated as part of report finalization.
- docs/INTEGRATION-REPORT.md and docs/package-manifest.json are final reporting/package additions.

## Limitations and rollback

Automated auth and MFA are mocked; no live Supabase/SMTP/Google/TOTP behavior is established. Original Chrome confirmation incident, OneDrive EPERM/reparse issue and public email delivery are unresolved. Azure source is provided for later review only; no resources, credentials, billing tier validation, production quota/privacy/authorization decisions or live testing are performed. Physical microphone behavior and live external fonts require later authorized checks. Existing unpublished lesson slots remain unpublished. Existing local learner context remains separate from server-validated account identity; no synchronization/migration/account-private local storage is implied.

To run THIS result, follow README.md from the exact project directory above. Guest practice needs no environment. To roll back, stop only integration-owned preview services and open the unchanged original; never clear local browser storage, copy into an original or repair OneDrive. All QA-owned services are stopped at completion. Dependencies/build caches/QA profiles stay out of the source ZIP. Exact content/checksum and secret-exclusion verification is recorded in the adjacent archive verification file.

GitHub documentation only: docs/GITHUB-HANDOFF.md, COLLABORATION.md, AGENTS.md and PR checklist. CODEOWNERS is commented until handles are verified; no CI workflow or repository protection has been enabled. Azure activation/live MFA/GitHub publication require separate explicit approval.
