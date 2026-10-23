# Validation of the mandatory-placement preview

## Passed

- All 32 automated tests passed: 13 placement, five curriculum, one browser-progress recovery, four security/grading and nine retained account/email tests. Account/email tests use mocks; no real email was sent.
- Placement cases cover complete-answer gating, all six bands, A1 starting floor, C2 reachability, failed prerequisite bands, malformed answers, consistent saved results, shuffled choices and resumable sequential drafts.
- Curriculum cases cover exact assigned-level routing, pending/empty content, exclusion of unassigned lessons and progress counted only for published lessons. Published-content fixtures are restored after tests; the delivered curriculum contains only empty placeholders.
- JSX identifier and removed-feature checks passed. The old course module is no longer imported and is excluded from this ZIP. Current styles were generated from the edited components, including manual dark-mode classes.
- React server rendering checks passed for mandatory entry, a previously skipped profile, all 36 question screens and all six assigned lesson areas. These checks do not simulate browser clicks or localStorage failures.
- The shared local Vinext build passed all five stages. The existing local preview returned HTTP 200, and the retired model endpoint returned HTTP 410.
- Vercel-source TypeScript checking was attempted. Its only diagnostic is the missing local @neondatabase/serverless module.

## Limits of verification

The authored placement test provides provisional lesson allocation, not validated language certification. It has not been calibrated against real learner outcomes and does not test listening, speaking or writing. Current lesson texts are intentionally empty; progress cannot be awarded for them.

Interactive browser automation was unavailable during this update. Browser click testing and publication on the public Vercel deployment remain unverified here.

The local node_modules junction lacks the Neon driver. The earlier Next.js production build attempt stopped on this missing module; npm registry access was restricted on this machine. The driver is declared in package.json. No successful Vercel-source typecheck or Next.js production build is claimed until dependencies are installed in an environment with registry access. Run npm install, npm test, npm run typecheck and npm run build before deployment.

Guest access uses browser storage and does not contact the database or email endpoints. The retained optional account infrastructure has mocked security/action/mail tests, but actual PostgreSQL connectivity, concurrent token consumption and provider delivery have not been verified against hosted services. No server account records were deleted.

Progress is tied to one browser profile and website origin. It is not cross-device storage or a teacher reporting system.
