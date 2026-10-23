# Validation of the Vercel source package

## Passed

- Five automated security/grading checks: anonymous/cross-account access, nested practice keys, cross-origin writes, tutor message restrictions/token limits, exact objective answers.
- Eight account-action checks: random tokens, hashing, trusted-origin fragment links, malformed-token rejection, purpose/expiry/auth-version SQL contracts and password/session mutation binding. These tests use a recording database; they do not establish real PostgreSQL concurrency.
- One mocked mail-provider check: missing configuration makes no network call, sender/recipient/link construction, digest-only idempotency metadata and generic provider errors. No real provider requests were made. Total: 14 passing tests.
- Both edited JSX files parsed successfully. TypeScript still reports only the missing local Neon dependency.
- The original local email/password implementation passed registration, sign-in, duplicate-account rejection, weak-password rejection, account isolation and revoked-session checks before this migration.

## Not verified against a hosted service

- Neon database connectivity and the PostgreSQL version of the account/storage endpoints: no Neon account or connection string has been supplied.
- Live Vercel deployment and browser interaction on that deployment.
- AI responses and realtime voice: no provider credential is configured, and OpenAI Realtime is not implemented.
- Verification and recovery code is now implemented; provider delivery and actual PostgreSQL token consumption/concurrency have not been verified against a live service. No real email was sent during testing.

## Build restriction on this machine

`next build --webpack` was attempted using the installed Next.js runtime. It stopped because `@neondatabase/serverless` was not installed locally. The attempted package installation could not access the npm registry (network EACCES). The driver is declared in `package.json`; `npm install` in an environment with registry access is required before building. No successful production build is claimed for this source package.

After connecting Neon and installing dependencies, run `npm test`, `npm run typecheck`, and `npm run build`, then follow the deployment checklist in README.md. Keep testing credentials and production records separate.

TypeScript checking was also attempted; the only remaining diagnostic was the missing Neon driver/type declarations. Unused starter UI components are excluded from this source ZIP. No successful typecheck is claimed until the declared dependencies are installed.
