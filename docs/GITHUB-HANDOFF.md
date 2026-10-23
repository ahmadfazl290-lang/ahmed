# GitHub handoff — documentation only

No repository, Git history, remote, branch, commit, permission, PR or deployment was created. Inputs contained no usable Git history. Do not invent history, handles or remote URLs.

Recommend one private repository after separate approval. main is the reviewed integrated baseline. dev/auth and dev/ui must both derive from the same approved baseline; integration/auth-home is the proposed temporary integration branch. No routine direct main pushes or forced unrelated-history merge.

Authentication owner: signup/email/account, Supabase helpers and TOTP/server assurance. UI owner: supplied pronunciation panel/navigation/assets. Shared App/routes/CSS/translations/manifest/lock changes need coordination. Require the other developer's review; security changes need auth-owner review. Propose required test/typecheck/build checks, no force pushes and protected main subject to the actual repository plan. None is configured.

After explicit Stage C approval, verify owner and handles, visibility, plan and any actual remote history; review the exact archive publication manifest and exclusions; establish/import the approved baseline; create only approved repository/remotes; publish that baseline; derive both developer branches from it; configure separately approved access/checks/protection and submit reviewed PRs. These are proposed steps, not commands executed here.

CODEOWNERS remains a commented template until handles are verified. No CI workflow is activated by this package. Preserve licenses and attribution, and inspect every publication file. Never publish .env.local, credentials, profile/cache/dependency folders or private student records.
