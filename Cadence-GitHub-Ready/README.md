# Cadence — English Learning

A React / Next.js platform with a required 36-question placement assessment, A1–C2 lesson routing, teacher-supplied lesson texts, vocabulary, learning progress and pronunciation practice. English and Kurdish Sorani RTL are supported.

## Start locally

Use Node.js 24.x (the major is pinned for Vercel). Run `npm ci`, `npm test`, `npm run typecheck`, `npm run build`, then `npm start`. Guest learning works without an environment file or email account. Progress stays in this browser; clearing browser data removes it.

## Accounts and student records

Supabase sign-in, sign-up, verification, recovery and optional authenticator-based two-factor verification are available at `/account?provider=supabase`. Configure the public Supabase project URL and publishable key privately using `.env.example`. Keep email confirmation enabled, configure your site's callback URL and email delivery in Supabase, and use HTTPS in production.

Guest progress and each validated account's progress use separate local storage. Signing in does not import guest progress. Learning records are browser-local and do not synchronize between devices. Account authentication and security operations are protected independently by the server.

## Lessons

Placement is required and cannot be skipped. It assigns one of six lesson tiers (A1–C2). Add teacher texts to `components/cadence/curriculum.json` following `CONTENT-GUIDE.md`. Pending lesson slots have no lesson content and cannot be marked complete. The question bank guides lesson routing; it is not an accredited CEFR certification exam.

Legacy AI Call, Tutor, Practice and Mistakes screens and the old course library are removed. Azure pronunciation assessment is the only optional external assessment integration.

## Pronunciation

Students can record and replay up to 20 seconds locally without Azure. Assessment requires a valid Azure Speech F0 resource and private server configuration; it never invents a score when the service is unavailable. See `AZURE-SETUP-KURDISH.md` for setup and free-tier limits. A browser preview and automated mocked tests do not prove real Azure or email delivery.

## GitHub and Vercel

See `VERCEL-FIX-KURDISH.md` and `DEPLOY-KURDISH.md`. Upload the extracted project files to the repository root, preserving folders. Uploading a ZIP file itself does not replace application source. The GitHub-ready archive has no extra outer folder and omits optional browser-QA scripts and old handoff documents to fit GitHub's 100-file web-upload limit. Unit tests and runtime source remain included. The full source archive retains the supplementary files. Keep `.env.local`, `node_modules`, `.next` and secret values out of GitHub. Automatic deployment is no longer disabled for `dev/auth`; Vercel still determines whether a branch creates a Preview or Production deployment.

Run the checks before committing. Existing handoff documents describe earlier versions; this README and the new setup guide describe this release.
