# Cadence - English Learning

A learning website with an English/Kurdish interface, a mandatory placement test and lessons assigned to the student's result. Vocabulary, browser-saved progress, a student profile and appearance settings remain available.

## Current experience

No email or password is needed. Enter a student name and complete all 36 placement questions before entering the learning area. Answers are saved after each question, so the test can resume in the same browser. There is no skip-test option. Previous skipped or obsolete test results cannot unlock lessons.

After the final answer is saved, the assigned level and its lessons open immediately. The preview maps Level 1 to A1, Level 2 to A2, Level 3 to B1, Level 4 to B2, Level 5 to C1 and Level 6 to C2. This numbering is a provisional design for this website; it will be reviewed against the teacher's texts when they arrive.

The previous built-in course library has been replaced with three empty lesson slots per level. Pending lessons can be opened to preview the reading layout but cannot be marked complete. Add, rename or reorder lessons through `components/cadence/curriculum.json`; see CONTENT-GUIDE.md.

The placement result is an estimate for lesson allocation, not a validated CEFR certificate. The authored questions cover grammar, vocabulary and reading. Listening, speaking and writing are not assessed.

Progress is saved only in the current browser and website origin. Clearing browser data removes it; it does not synchronize between devices. Each browser profile has one student record. The teacher cannot receive results centrally in this preview.

AI Call, Tutor, the separate Practice and Mistakes pages and related settings remain removed. Vocabulary review is manual. The retired model endpoint returns HTTP 410 and cannot call a provider.

## Upload and deploy

1. Extract this ZIP. Open cadence-vercel.
2. At the GitHub repository ROOT, use Add file > Upload files. Upload all folder contents, including app, components, lib, public and the root configuration files. package.json must remain at repository root.
3. Commit the changes. In Vercel, deploy that NEW commit and wait for Ready. Do not redeploy an older commit.
4. Open https://english-learning-project-eta.vercel.app/.

Vercel: Next.js framework, Node 22.x, npm install, npm run build, default Output Directory. No database or email service is needed for the guest learning interface. Server-side account code is retained for optional future account use and remains protected; existing account data has not been deleted. Its separate setup docs apply only if accounts are re-enabled.

## Checks

Use npm install, npm test, npm run typecheck and npm run build. The local Vinext preview shares the edited learning UI. See VALIDATION.md for verification and limits, and CONTENT-GUIDE.md for lesson preparation.
