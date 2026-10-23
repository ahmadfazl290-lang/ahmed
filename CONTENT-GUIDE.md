# Preparing the teacher's lessons

The preview flow is: student name → mandatory 36-question placement test → result → assigned lesson area. Returning students resume their saved test or open their assigned lessons in the same browser.

## Provisional level map

| Website level | CEFR label | Preview name |
| --- | --- | --- |
| 1 | A1 | Foundation |
| 2 | A2 | Elementary |
| 3 | B1 | Intermediate |
| 4 | B2 | Upper intermediate |
| 5 | C1 | Advanced |
| 6 | C2 | Proficient |

The six CEFR labels come from the Council of Europe's [level descriptions](https://www.coe.int/en/web/common-european-framework-reference-languages/level-descriptions). Numbering them 1–6 is this website's preview convention. It is not a classification of lesson texts that have not yet been supplied. Review each submitted text's language demands and learning objectives before choosing its final band.

## What to send later

Send each lesson separately with:

1. Your level number and lesson number.
2. Lesson title.
3. The full lesson text, preserving paragraphs.
4. Any learning objectives, vocabulary list or exercises you want included.

There is no need to supply all lessons at once. The three slots per level are placeholders; their number and order can change.

## Adding content

Edit `components/cadence/curriculum.json`. Each level has a `cefr` label and an ordered `lessons` array. A lesson contains a stable `id`, a `title`, a `status` and plain `text`.

```json
{
  "id": "a1-lesson-01",
  "title": "Your lesson title",
  "status": "published",
  "text": "First paragraph.\n\nSecond paragraph."
}
```

Publish only after the real text is present and checked. Both `status: "published"` and nonempty text are required for completion. Keep lesson ids stable after students start; completion is saved against the id. Plain text is rendered as paragraphs without executing HTML. Students see only their assigned level's lessons; other levels appear in a read-only level map.

This version has no owner/admin editor. Source changes are deployed through GitHub/Vercel. Texts in source are included in the browser bundle, so the level restriction guides learning; it is not a paid-content security boundary.

## Placement and storage

Each provisional band has two grammar, two vocabulary and two reading questions. All 36 must be answered; "I don't know" records an attempted answer with no correct-answer credit. Choices are shuffled per question/student and remain stable on resume. A band passes with at least five correct answers, including at least one correct answer in each assessed skill. Allocation uses consecutive passed bands from A1 upward, with A1 as the starting floor. Higher-band guesses cannot bypass a failed earlier band.

The result is a lesson-placement estimate. The authored bank and thresholds need trials with real learners and expert review before any accuracy or certification claim. Listening, speaking and writing are not assessed.

A current, complete and consistent result is required to open lessons. Test drafts and lesson completions are saved in the browser. Save failures keep the student on the current question with a retry message. Each browser profile holds one student record; another device or website origin has separate progress. Clearing storage removes the record. Teacher reporting and cross-device accounts are future additions.
