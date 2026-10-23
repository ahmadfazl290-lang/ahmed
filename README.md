# English-Co

The root application integrates Supabase sign in/sign up, verification, recovery, account details and optional server-enforced TOTP MFA with placement, CEFR learning, vocabulary, progress and local pronunciation recording/playback. English and Kurdish RTL are supported.

Use Node >=22.13.0. Run npm ci, npm test, npm run typecheck, npm run build, then npm start. Guest learning needs no environment file. Configure accounts privately using the placeholders in .env.example; never commit .env.local.

The normal entrance at / checks the account and opens /account?provider=supabase when sign-in is needed. The restored dashboard includes daily lessons, courses, practice, mistakes, roadmap, vocabulary, learning activity and preferences alongside placement, assigned lessons, progress, achievements and pronunciation. Explicit guest learning is available from the account entrance; /practice-library retains the repository's additional practice interface behind the same entry controller. Guest learning does not establish an authenticated session or unlock account operations. Existing local storage formats remain compatible; local records are not automatically migrated or synchronized to Supabase.

Azure assessment and token routes remain hard-disabled. The repository text tutor endpoint remains available only with its separate server configuration and legacy account namespace; no AI credentials are supplied or activated. Historical Cadence-* folders remain unchanged and are excluded from root TypeScript compilation.

See docs/TESTING.md for mocked browser tests and docs/RECOVERED-INTEGRATION.md for the recovered application integration and validation. docs/LOCAL-INTEGRATION.md and docs/REPOSITORY-SETUP.md preserve earlier integration and setup guidance as historical documentation. Other imported handoff reports describe earlier runs, not this checkout's validation. Root vercel.json disables automatic deployment for dev/auth.
