import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PLACEMENT_VERSION, CEFR_TIERS, PLACEMENT_QUESTIONS,
  scorePlacement, hasValidPlacement, getPlacementDraft, orderPlacementOptions,
} from '../components/cadence/placement.js';

const correctAnswers = () => PLACEMENT_QUESTIONS.map(question => ({ id: question.id, answer: question.accepted[0] }));
const unknownAnswers = () => PLACEMENT_QUESTIONS.map(question => ({ id: question.id, answer: '__unknown__' }));
const miss = (answers, id) => answers.map(entry => entry.id === id ? { ...entry, answer: '__unknown__' } : entry);

test('bank covers every band and assessed skill with valid unique objective questions', () => {
  assert.equal(PLACEMENT_QUESTIONS.length, 36);
  assert.equal(new Set(PLACEMENT_QUESTIONS.map(question => question.id)).size, 36);
  for (const level of CEFR_TIERS) {
    const band = PLACEMENT_QUESTIONS.filter(question => question.cefr === level);
    assert.equal(band.length, 6);
    for (const skill of ['grammar', 'vocabulary', 'reading']) assert.equal(band.filter(question => question.skill === skill).length, 2);
  }
  for (const question of PLACEMENT_QUESTIONS) {
    assert.equal(question.type, 'mcq');
    assert.equal(question.options.length, 4);
    assert.equal(new Set(question.options).size, 4);
    assert.equal(question.accepted.length, 1);
    assert.ok(question.options.includes(question.accepted[0]));
    assert.ok(question.prompt);
    if (question.skill === 'reading') assert.ok(question.passage);
  }
});

test('option ordering is a stable permutation and does not mutate the question bank', () => {
  const seed = '00000000-0000-4000-8000-000000000001@guest.invalid';
  for (const question of PLACEMENT_QUESTIONS) {
    const original = question.options.slice();
    const ordered = orderPlacementOptions(question, seed);
    assert.notEqual(ordered, question.options);
    assert.deepEqual(ordered.slice().sort(), original.slice().sort());
    assert.deepEqual(ordered, orderPlacementOptions(JSON.parse(JSON.stringify(question)), seed));
    assert.deepEqual(question.options, original);
    assert.ok(ordered.includes(question.accepted[0]));
  }
});

test('student and question seeds both vary option ordering', () => {
  const question = PLACEMENT_QUESTIONS[0];
  const studentOrders = new Set(Array.from({ length: 12 }, (_, index) => JSON.stringify(orderPlacementOptions(question, `student-${index}@guest.invalid`))));
  assert.ok(studentOrders.size >= 3);
  const questionOrders = new Set(Array.from({ length: 12 }, (_, index) => JSON.stringify(orderPlacementOptions({ ...question, id: `question-${index}` }, 'same-student@guest.invalid'))));
  assert.ok(questionOrders.size >= 3);
  for (const seed of ['student-a', 'student-b', 'student-c']) {
    const correctPositions = PLACEMENT_QUESTIONS.map(item => orderPlacementOptions(item, seed).indexOf(item.accepted[0]));
    assert.ok(new Set(correctPositions).size >= 3);
    assert.ok(correctPositions.some((position, index) => index >= 4 && position !== correctPositions[index - 4]));
  }
});

test('all unknown answers assign the A1 starting floor without inventing correct responses', () => {
  const result = scorePlacement(unknownAnswers());
  assert.equal(result.assignedLevel, 'A1');
  assert.equal(result.overallIndex, 0);
  assert.equal(result.totalCorrect, 0);
  assert.equal(result.overallScore, 0);
  assert.deepEqual(result.strongAreas, []);
  assert.deepEqual(result.weakAreas, ['Grammar', 'Vocabulary', 'Reading']);
  assert.equal(result.bandScores.A1.passed, false);
  assert.ok(hasValidPlacement(result));
});

test('a complete perfect test reaches C2 and reports twelve answers per skill', () => {
  const result = scorePlacement(correctAnswers());
  assert.equal(result.assignedLevel, 'C2');
  assert.equal(result.overallLevel, 'C2');
  assert.equal(result.overallIndex, 5);
  assert.equal(result.completedItems, 36);
  assert.equal(result.totalQuestions, 36);
  assert.equal(result.totalCorrect, 36);
  assert.equal(result.overallScore, 1);
  assert.equal(result.version, PLACEMENT_VERSION);
  assert.equal(result.provisional, true);
  assert.ok(Number.isFinite(Date.parse(result.completedAt)));
  assert.deepEqual(result.weakAreas, []);
  for (const category of Object.values(result.categories)) assert.deepEqual(category, { score: 1, correct: 12, total: 12 });
  assert.ok(hasValidPlacement(JSON.parse(JSON.stringify(result))));
});

test('five correct answers pass a band, while four do not', () => {
  const fiveCorrect = scorePlacement(miss(correctAnswers(), 'b2-g1'));
  assert.equal(fiveCorrect.bandScores.B2.correct, 5);
  assert.equal(fiveCorrect.bandScores.B2.passed, true);
  assert.equal(fiveCorrect.assignedLevel, 'C2');
  const fourCorrect = scorePlacement(miss(miss(correctAnswers(), 'b2-g1'), 'b2-g2'));
  assert.equal(fourCorrect.bandScores.B2.correct, 4);
  assert.equal(fourCorrect.bandScores.B2.skillScores.grammar.correct, 0);
  assert.equal(fourCorrect.bandScores.B2.passed, false);
  assert.equal(fourCorrect.assignedLevel, 'B1');
});

test('higher scores cannot skip a failed prerequisite band', () => {
  let answers = correctAnswers();
  answers = miss(miss(answers, 'a2-v1'), 'a2-r1');
  const result = scorePlacement(answers);
  assert.equal(result.bandScores.A1.passed, true);
  assert.equal(result.bandScores.A2.passed, false);
  assert.equal(result.bandScores.C2.passed, true);
  assert.equal(result.assignedLevel, 'A1');
  assert.equal(result.totalCorrect, 34);
});

test('each consecutive band boundary routes to its highest passed tier', () => {
  for (let lastPassed = 0; lastPassed < CEFR_TIERS.length; lastPassed += 1) {
    const answers = PLACEMENT_QUESTIONS.map(question => ({
      id: question.id,
      answer: CEFR_TIERS.indexOf(question.cefr) <= lastPassed ? question.accepted[0] : '__unknown__',
    }));
    assert.equal(scorePlacement(answers).assignedLevel, CEFR_TIERS[lastPassed]);
  }
});

test('scoring rejects partial, duplicate, unknown-id and invalid-option submissions', () => {
  const answers = correctAnswers();
  assert.throws(() => scorePlacement(answers.slice(0, 35)), TypeError);
  assert.throws(() => scorePlacement([]), TypeError);
  assert.throws(() => scorePlacement(null), TypeError);
  assert.throws(() => scorePlacement([...answers.slice(0, 35), answers[0]]), TypeError);
  assert.throws(() => scorePlacement([{ id: 'not-a-question', answer: 'is' }, ...answers.slice(1)]), TypeError);
  assert.throws(() => scorePlacement([{ id: answers[0].id, answer: 'invented option' }, ...answers.slice(1)]), TypeError);
  assert.throws(() => scorePlacement([null, ...answers.slice(1)]), TypeError);
});

test('scoring follows ids rather than input order and retains reviewable answers', () => {
  const reversed = correctAnswers().reverse();
  const result = scorePlacement(reversed);
  assert.equal(result.assignedLevel, 'C2');
  assert.deepEqual(result.answers, reversed);
  assert.notEqual(result.answers[0], reversed[0]);
});

test('validity requires current version, complete evidence and consistent routing', () => {
  const valid = scorePlacement(correctAnswers());
  assert.equal(hasValidPlacement(null), false);
  assert.equal(hasValidPlacement({ placementComplete: true, overallLevel: 'C2' }), false);
  assert.equal(hasValidPlacement({ ...valid, version: 'placement-9-v0' }), false);
  assert.equal(hasValidPlacement({ ...valid, completedAt: 'not a date' }), false);
  assert.equal(hasValidPlacement({ ...valid, answers: valid.answers.slice(1) }), false);
  assert.equal(hasValidPlacement({ ...valid, assignedLevel: 'B1' }), false);
  assert.equal(hasValidPlacement({ ...valid, overallIndex: 2 }), false);
  assert.equal(hasValidPlacement({ ...valid, totalCorrect: 0 }), false);
  assert.equal(hasValidPlacement({ ...valid, answers: [...valid.answers.slice(0, 35), valid.answers[0]] }), false);
  assert.equal(hasValidPlacement({ ...valid, answers: [{ id: valid.answers[0].id, answer: 'invalid' }, ...valid.answers.slice(1)] }), false);
  assert.equal(hasValidPlacement({ ...valid, categories: { ...valid.categories, Grammar: { score: 0, correct: 0, total: 12 } } }), false);
});

test('validity rejects missing, malformed and inconsistent displayed band scores', () => {
  const valid = scorePlacement(correctAnswers());
  assert.equal(hasValidPlacement({ ...valid, bandScores: undefined }), false);
  assert.equal(hasValidPlacement({ ...valid, bandScores: null }), false);
  assert.equal(hasValidPlacement({ ...valid, bandScores: [] }), false);
  assert.equal(hasValidPlacement({ ...valid, bandScores: 'invalid' }), false);
  const { A1, ...missingBand } = valid.bandScores;
  assert.equal(hasValidPlacement({ ...valid, bandScores: missingBand }), false);
  assert.equal(hasValidPlacement({ ...valid, bandScores: { ...valid.bandScores, D1: A1 } }), false);
  for (const [field, incorrect] of [['correct', 0], ['total', 0], ['score', 0], ['passed', false]]) {
    const bandScores = { ...valid.bandScores, C1: { ...valid.bandScores.C1, [field]: incorrect } };
    assert.equal(hasValidPlacement({ ...valid, bandScores }), false, `Reject inconsistent ${field}`);
  }
  assert.equal(hasValidPlacement({ ...valid, bandScores: { ...valid.bandScores, B2: null } }), false);
  for (const skill of ['grammar', 'vocabulary', 'reading']) {
    for (const field of ['correct', 'total']) {
      const bandScores = {
        ...valid.bandScores,
        B1: { ...valid.bandScores.B1, skillScores: { ...valid.bandScores.B1.skillScores, [skill]: { ...valid.bandScores.B1.skillScores[skill], [field]: 0 } } },
      };
      assert.equal(hasValidPlacement({ ...valid, bandScores }), false, `Reject inconsistent ${skill} ${field}`);
    }
  }
  assert.equal(hasValidPlacement({ ...valid, bandScores: { ...valid.bandScores, A2: { ...valid.bandScores.A2, skillScores: {} } } }), false);
  const lowScore = scorePlacement(unknownAnswers());
  assert.equal(hasValidPlacement(JSON.parse(JSON.stringify(lowScore))), true);
  assert.equal(hasValidPlacement(JSON.parse(JSON.stringify(valid))), true);
});

test('draft accepts and copies only a current valid sequential prefix', () => {
  const answers = correctAnswers().slice(0, 5);
  answers[1].answer = '__unknown__';
  const draft = getPlacementDraft({ placementDraft: { version: PLACEMENT_VERSION, answers } });
  assert.deepEqual(draft, { version: PLACEMENT_VERSION, answers });
  assert.notEqual(draft.answers, answers);
  assert.notEqual(draft.answers[0], answers[0]);
  const empty = { version: PLACEMENT_VERSION, answers: [] };
  assert.deepEqual(getPlacementDraft(null), empty);
  assert.deepEqual(getPlacementDraft({ placementDraft: { version: 'old', answers } }), empty);
  assert.deepEqual(getPlacementDraft({ placementDraft: { version: PLACEMENT_VERSION, answers: answers.slice(1) } }), empty);
  assert.deepEqual(getPlacementDraft({ placementDraft: { version: PLACEMENT_VERSION, answers: [answers[1], answers[0]] } }), empty);
  assert.deepEqual(getPlacementDraft({ placementDraft: { version: PLACEMENT_VERSION, answers: [answers[0], answers[0]] } }), empty);
  assert.deepEqual(getPlacementDraft({ placementDraft: { version: PLACEMENT_VERSION, answers: [{ id: answers[0].id, answer: 'invalid' }] } }), empty);
  assert.deepEqual(getPlacementDraft({ placementDraft: { version: PLACEMENT_VERSION, answers: correctAnswers() } }), empty);
});
