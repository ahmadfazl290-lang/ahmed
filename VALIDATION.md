# Corrected release validation — 2026-10-23

Source: English_learning_project-dev-auth.zip. Work was completed in an independent workspace copy; the uploaded archive was not modified.

Results:
- Complete automated suite: 120 tests passed, 0 failed.
- TypeScript: passed, with no emitted files.
- Next.js optimized production build: passed.
- Production HTTP smoke: / returned 200; pronunciation status returned configured:false without credentials; Supabase account status safely returned 503 without configuration; /practice-library redirected to /; removed /api/tutor returned 404.
- Browser: /?guest=1 opened without email. Completed all 36 questions using synthetic 'I do not know' answers. Reload after 11 saved answers retained the name/draft and resumed at question 12. Completion assigned A1 (0/36) and opened the assigned learning area. My lessons showed only assigned pending teacher-text slots; removed legacy menu items were absent. English and Sorani RTL were inspected.
- Browser: a fresh tab at /, without explicit guest selection and with no Supabase configuration, opened guest learning and retained the existing record.
- Browser: pronunciation displayed local recording consent and an unavailable assessment state without Azure credentials; no audio was submitted.

The isolated account A/B/guest storage and stale-write cases passed automated adapter/entry tests. Account/MFA/verification tests use mocked provider responses. These results do not claim a real account, email delivery, physical microphone capture or live Azure assessment was tested. Owner-provided private provider configuration is still required for those services. The application stores learning progress in this browser, not in a synchronized cloud database.

The only external assessment integration retained is optional Azure Speech F0. The configured-tier guard cannot verify Azure billing; the resource must actually be created as Free F0 in the owner's Azure account. See AZURE-SETUP-KURDISH.md.

GitHub/Vercel were not modified remotely. Upload the extracted source using DEPLOY-KURDISH.md and delete obsolete files listed in REMOVED-FILES.txt. Historical Cadence-* snapshots, installed dependencies, build output, generated agent guidance and private environment files are excluded from the deliverable.
