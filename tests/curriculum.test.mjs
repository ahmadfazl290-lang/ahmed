import test from 'node:test';
import assert from 'node:assert/strict';
import { CEFR_TIERS, PLACEMENT_QUESTIONS, scorePlacement } from '../components/cadence/placement.js';
import { LEVEL_CATALOG, assignedCurriculum, lessonPublished, mayCompleteLesson, levelProgress } from '../components/cadence/curriculum.js';

function assessmentAt(level) {
  const index = CEFR_TIERS.indexOf(level);
  return scorePlacement(PLACEMENT_QUESTIONS.map(question => ({
    id: question.id,
    answer: CEFR_TIERS.indexOf(question.cefr) <= index ? question.accepted[0] : '__unknown__',
  })));
}

test('each valid placement routes to exactly its assigned curriculum tier', () => {
  assert.deepEqual(LEVEL_CATALOG.map(level => level.cefr), CEFR_TIERS);
  for (const [index, cefr] of CEFR_TIERS.entries()) {
    const assessment = assessmentAt(cefr);
    const assigned = assignedCurriculum(assessment);
    assert.equal(assessment.assignedLevel, cefr);
    assert.equal(assigned, LEVEL_CATALOG[index]);
    assert.equal(assigned.number, index + 1);
    assert.equal(assigned.cefr, cefr);
  }
});

test('skipped, incomplete, outdated and unsupported results cannot unlock any curriculum', () => {
  const valid = assessmentAt('B1');
  for (const assessment of [
    null,
    undefined,
    { placementComplete: true, placementSkipped: true, assignedLevel: 'B1' },
    { overallLevel: 'B1', overallIndex: 2, completedAt: new Date().toISOString() },
    { ...valid, answers: valid.answers.slice(0, 35) },
    { ...valid, version: 'placement-9-v0' },
    { ...valid, assignedLevel: 'D1' },
    { ...valid, assignedLevel: 'C2' },
  ]) {
    assert.equal(assignedCurriculum(assessment), null);
    assert.equal(mayCompleteLesson(assessment, LEVEL_CATALOG[0].lessons[0].id), false);
    assert.deepEqual(levelProgress(assessment, { completed: { [LEVEL_CATALOG[0].lessons[0].id]: 'saved' } }), { completed: 0, published: 0, total: 0, percentage: 0 });
  }
});

test('publication requires an explicit published status and nonempty string text', () => {
  assert.equal(lessonPublished({ status: 'published', text: 'A lesson with actual content.' }), true);
  for (const lesson of [
    null,
    undefined,
    { status: 'pending', text: 'Content is drafted but not published.' },
    { status: 'draft', text: 'A draft.' },
    { text: 'A text without a publication status.' },
    { status: 'published', text: '' },
    { status: 'published', text: ' \n\t  ' },
    { status: 'published', text: null },
    { status: 'published', text: { body: 'Not a string.' } },
  ]) assert.equal(lessonPublished(lesson), false);
});

test('current placeholders cannot be completed even when progress claims they were', () => {
  for (const level of LEVEL_CATALOG) {
    const assessment = assessmentAt(level.cefr);
    const completed = {};
    for (const lesson of level.lessons) {
      assert.equal(lessonPublished(lesson), false);
      assert.equal(mayCompleteLesson(assessment, lesson.id), false);
      completed[lesson.id] = '2026-10-12T09:00:00.000Z';
    }
    assert.equal(mayCompleteLesson(assessment, 'unlisted-lesson'), false);
    assert.deepEqual(levelProgress(assessment, { completed }), { completed: 0, published: 0, total: level.lessons.length, percentage: 0 });
  }
});

test('published fixtures unlock only the assigned tier and count only its published completions', () => {
  const assigned = LEVEL_CATALOG[0];
  const other = LEVEL_CATALOG[1];
  const saved = [assigned.lessons[0], assigned.lessons[1], other.lessons[0]];
  try {
    assigned.lessons[0] = { ...saved[0], status: 'published', text: 'First teacher-provided lesson.' };
    assigned.lessons[1] = { ...saved[1], status: 'published', text: 'Second teacher-provided lesson.' };
    other.lessons[0] = { ...saved[2], status: 'published', text: 'A lesson assigned to another tier.' };
    const assessment = assessmentAt('A1');
    assert.equal(mayCompleteLesson(assessment, assigned.lessons[0].id), true);
    assert.equal(mayCompleteLesson(assessment, assigned.lessons[1].id), true);
    assert.equal(mayCompleteLesson(assessment, assigned.lessons[2].id), false);
    assert.equal(mayCompleteLesson(assessment, other.lessons[0].id), false);
    assert.equal(mayCompleteLesson(assessment, 'unlisted-lesson'), false);
    const progress = {
      completed: {
        [assigned.lessons[0].id]: '2026-10-12T09:00:00.000Z',
        [assigned.lessons[2].id]: '2026-10-12T09:01:00.000Z',
        [other.lessons[0].id]: '2026-10-12T09:02:00.000Z',
        'unlisted-lesson': '2026-10-12T09:03:00.000Z',
      },
    };
    assert.deepEqual(levelProgress(assessment, progress), { completed: 1, published: 2, total: 3, percentage: 50 });
    assert.deepEqual(levelProgress(assessment, { completed: { [other.lessons[0].id]: 'saved', [assigned.lessons[2].id]: 'saved' } }), { completed: 0, published: 2, total: 3, percentage: 0 });
    assert.deepEqual(levelProgress(assessment, null), { completed: 0, published: 2, total: 3, percentage: 0 });
    assert.deepEqual(levelProgress(assessment, undefined), { completed: 0, published: 2, total: 3, percentage: 0 });
  } finally {
    assigned.lessons[0] = saved[0];
    assigned.lessons[1] = saved[1];
    other.lessons[0] = saved[2];
  }
  assert.ok(LEVEL_CATALOG.every(level => level.lessons.every(lesson => !lessonPublished(lesson))));
});
