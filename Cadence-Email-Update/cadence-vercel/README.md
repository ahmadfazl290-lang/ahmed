# Cadence - English Learning

An English-learning website with a Kurdish/English interface, ten courses, twenty lessons, vocabulary review, optional placement questions and user progress. This repository targets **Next.js on Vercel**, with **Neon Postgres** for accounts and learning data.

## What works / what remains

- Email/password registration, sign-in and sign-out; isolated learning records.
- Optional placement assessment; skipping keeps the learner's selected level.
- Existing course and practice interface.
- AI remains disabled without a provider key. The preserved text-tutor endpoint supports Anthropic; **OpenAI Realtime is not implemented or activated in this package**.
- Email ownership verification and password recovery are implemented, but require the database migration and a configured Resend sender. Follow `EMAIL-SETUP-KURDISH.md` before deploying this update.
- Existing local test accounts/data are not included or migrated.

## Upload to GitHub

1. Extract the supplied ZIP. Open the `cadence-vercel` folder.
2. Create a new **private** GitHub repository, for example `cadence-english`.
3. Choose **Add file > Upload files** and upload the contents of that folder. `package.json` must be at the repository root, beside `app`, `components`, and `lib`.
4. Include `.gitignore` and `.env.example`. Do not upload the ZIP itself, `node_modules`, `.next`, or a real `.env` file.
5. Commit the upload. Alternatively use Git locally to preserve all dotfiles automatically.

This is a source package; no database password, AI key or user records are included.

## Create the database

1. Create a Neon account and a Postgres project at https://neon.com/.
2. In its SQL Editor, run the entire `database/schema.sql` file once.
3. Use Neon **Connect** to obtain the connection string. Keep it private; never commit it or send it in chat.
4. Set it as `DATABASE_URL` in Vercel. Use a separate database/branch for Preview deployments if you want to keep test users apart from production.

No database is created automatically during the build. A deployment without `DATABASE_URL` can load the interface, but account and learning-storage operations will not work. A configured URL without the schema will also fail.

## Deploy on Vercel

1. Sign in to https://vercel.com/ and select **Add New > Project**.
2. Import your GitHub repository.
3. Select **Next.js**. Root Directory is the folder containing `package.json` (normally repository root).
4. Use Node.js **22.x**. Build command: `npm run build`. Leave Output Directory at the framework default.
5. Add **Environment Variables** before deploying:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Required for accounts and progress; private Neon connection string |
| `REGISTRATION_CODE` | Optional private invitation code; recommended while testing alone |
| `ANTHROPIC_API_KEY` | Optional; leave unset to keep AI off |
| `ANTHROPIC_MODEL` | Optional; defaults to `claude-sonnet-4-6` |

These are server-side variables. Do not prefix them with `NEXT_PUBLIC_`.

6. Select **Deploy**. Open the resulting URL, create your account, sign out and sign back in.
7. Verify that progress remains after refreshing. Test a second account to confirm records stay separate.
8. Changes to environment variables require a new deployment. Do not publish an API key in GitHub.

## Local development

Install Node.js 22.x, then run:

```sh
npm install
```

Copy `.env.example` to `.env.local` and privately configure the Neon connection string. Then:

```sh
npm run dev
```

Open http://localhost:3000/. For checks:

```sh
npm test
npm run typecheck
npm run build
```

## Account security and data

Passwords are salted and hashed with PBKDF2-SHA256 (600,000 iterations). Only hashes are stored. Session cookies are HttpOnly and SameSite=Strict, with Secure enabled in production; the database stores token hashes and a seven-day expiration. Sign-out revokes the session. Authentication requests check Origin and rate-limit attempts per email and per client address. Learning writes are checked against the authenticated user ID and email.

Setting `REGISTRATION_CODE` restricts new accounts to people who know that code. Leaving it unset allows registration. Verification/recovery requires `RESEND_API_KEY`, `EMAIL_FROM`, and trusted `SITE_URL`. Run `database/002-account-email.sql` on an existing database before deploying. Set `REQUIRE_EMAIL_VERIFICATION=true` only after delivery is tested. Legacy accounts remain unverified. Verification establishes a new password and revokes sessions; reset also revokes old sessions. Tokens are single use and stored only as hashes.

The website does not award a formal CEFR certificate. Placement is a preliminary estimate of grammar, vocabulary and reading, not an assessment of speaking or writing.

## References

- https://vercel.com/docs/frameworks/full-stack/nextjs
- https://vercel.com/docs/git
- https://github.com/neondatabase/serverless

See `DEPLOY-KURDISH.md` for the Kurdish deployment guide and `VALIDATION.md` for verification results and limits.
