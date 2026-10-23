export const PLACEMENT_VERSION = 'placement-36-v1';
export const CEFR_TIERS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

// Authored practice questions guide in-app lesson routing. This question bank
// has not been calibrated as a formal CEFR certification examination.
export const PLACEMENT_QUESTIONS = [
  {
    id: 'a1-g1', cefr: 'A1', skill: 'grammar', type: 'mcq',
    prompt: 'My sister ___ a teacher.',
    options: ['is', 'are', 'am', 'be'], accepted: ['is'],
  },
  {
    id: 'a1-g2', cefr: 'A1', skill: 'grammar', type: 'mcq',
    prompt: 'There ___ two books on the table.',
    options: ['is', 'am', 'are', 'be'], accepted: ['are'],
  },
  {
    id: 'a1-v1', cefr: 'A1', skill: 'vocabulary', type: 'mcq',
    prompt: 'Which word is the opposite of "hot"?',
    options: ['big', 'cold', 'fast', 'new'], accepted: ['cold'],
  },
  {
    id: 'a1-v2', cefr: 'A1', skill: 'vocabulary', type: 'mcq',
    prompt: 'You usually cook food in the ___.',
    options: ['bedroom', 'garden', 'bathroom', 'kitchen'], accepted: ['kitchen'],
  },
  {
    id: 'a1-r1', cefr: 'A1', skill: 'reading', type: 'mcq',
    passage: 'My name is Lina. I work in a shop. I start at nine in the morning and finish at five in the afternoon.',
    prompt: 'When does Lina finish work?',
    options: ['At five in the afternoon', 'At nine in the morning', 'At midday', 'At midnight'],
    accepted: ['At five in the afternoon'],
  },
  {
    id: 'a1-r2', cefr: 'A1', skill: 'reading', type: 'mcq',
    passage: 'Omar has a blue bag and a red coat. His phone is in his bag. His coat is on the chair.',
    prompt: 'Where is Omar\'s phone?',
    options: ['In his coat', 'On the chair', 'In his bag', 'Under the chair'], accepted: ['In his bag'],
  },
  {
    id: 'a2-g1', cefr: 'A2', skill: 'grammar', type: 'mcq',
    prompt: 'Last Saturday, we ___ to the museum.',
    options: ['go', 'went', 'going', 'goes'], accepted: ['went'],
  },
  {
    id: 'a2-g2', cefr: 'A2', skill: 'grammar', type: 'mcq',
    prompt: 'This suitcase is ___ than that one.',
    options: ['heavy', 'heaviest', 'more heavy', 'heavier'], accepted: ['heavier'],
  },
  {
    id: 'a2-v1', cefr: 'A2', skill: 'vocabulary', type: 'mcq',
    prompt: 'The sign says "Please return borrowed books on Friday." What does "return" mean here?',
    options: ['Bring them back', 'Buy them', 'Read them aloud', 'Give them away'], accepted: ['Bring them back'],
  },
  {
    id: 'a2-v2', cefr: 'A2', skill: 'vocabulary', type: 'mcq',
    prompt: 'A train that is "delayed" will ___.',
    options: ['arrive early', 'carry no passengers', 'arrive later than planned', 'travel to another country'],
    accepted: ['arrive later than planned'],
  },
  {
    id: 'a2-r1', cefr: 'A2', skill: 'reading', type: 'mcq',
    passage: 'Nadia usually takes the bus to college. Today the buses are not running, so her brother is driving her. She will take the bus again tomorrow.',
    prompt: 'Why is Nadia travelling by car today?',
    options: ['She has finished college', 'The buses are not running', 'Her brother works at college', 'She missed the last bus yesterday'],
    accepted: ['The buses are not running'],
  },
  {
    id: 'a2-r2', cefr: 'A2', skill: 'reading', type: 'mcq',
    passage: 'The library is open until six on weekdays. On Saturdays it closes at two. It is closed all day on Sundays. Sam wants to visit at four this Saturday.',
    prompt: 'Can Sam visit the library at the time he plans?',
    options: ['Yes, because it closes at six every day', 'Yes, because Saturday is a weekday', 'No, because it is closed all Saturday', 'No, because it closes at two on Saturday'],
    accepted: ['No, because it closes at two on Saturday'],
  },
  {
    id: 'b1-g1', cefr: 'B1', skill: 'grammar', type: 'mcq',
    prompt: 'She ___ here since 2021, and she still works here now.',
    options: ['has worked', 'works', 'is working', 'will work'], accepted: ['has worked'],
  },
  {
    id: 'b1-g2', cefr: 'B1', skill: 'grammar', type: 'mcq',
    prompt: 'If we leave now, we ___ the last bus.',
    options: ['would caught', 'caught', 'will catch', 'had caught'], accepted: ['will catch'],
  },
  {
    id: 'b1-v1', cefr: 'B1', skill: 'vocabulary', type: 'mcq',
    prompt: 'A "reliable" colleague is someone you can ___.',
    options: ['easily surprise', 'depend on', 'never contact', 'always disagree with'], accepted: ['depend on'],
  },
  {
    id: 'b1-v2', cefr: 'B1', skill: 'vocabulary', type: 'mcq',
    prompt: 'Mira will "look after" her younger cousin tonight. What will she do?',
    options: ['Search for her cousin', 'Follow her cousin outside', 'Forget about her cousin', 'Take care of her cousin'],
    accepted: ['Take care of her cousin'],
  },
  {
    id: 'b1-r1', cefr: 'B1', skill: 'reading', type: 'mcq',
    passage: 'The community garden initially attracted very few volunteers. After the organisers moved the sessions from weekday mornings to Saturday afternoons, more working people joined. The organisers have decided to keep the new schedule.',
    prompt: 'What most likely increased the number of volunteers?',
    options: ['Sessions became easier for working people to attend', 'Volunteers started receiving wages', 'The garden moved to a larger site', 'Sessions were reduced to once a year'],
    accepted: ['Sessions became easier for working people to attend'],
  },
  {
    id: 'b1-r2', cefr: 'B1', skill: 'reading', type: 'mcq',
    passage: 'Two flats cost the same monthly rent. Flat A is beside Rami\'s workplace. Flat B is outside town, and travelling from it would cost him an extra eighty pounds each month. Rami chooses Flat A to reduce his total monthly spending.',
    prompt: 'Why does Rami choose Flat A?',
    options: ['Its rent is eighty pounds lower', 'It has more rooms', 'It avoids additional travel costs', 'Flat B is already occupied'],
    accepted: ['It avoids additional travel costs'],
  },
  {
    id: 'b2-g1', cefr: 'B2', skill: 'grammar', type: 'mcq',
    prompt: 'She asked me where ___ before I moved to this city.',
    options: ['did I live', 'I had lived', 'had I lived', 'I have live'], accepted: ['I had lived'],
  },
  {
    id: 'b2-g2', cefr: 'B2', skill: 'grammar', type: 'mcq',
    prompt: 'If they had left earlier, they ___ the train yesterday.',
    options: ['will catch', 'would catch', 'had catch', 'would have caught'], accepted: ['would have caught'],
  },
  {
    id: 'b2-v1', cefr: 'B2', skill: 'vocabulary', type: 'mcq',
    prompt: 'The engineer described the proposal as "feasible". She meant it was ___.',
    options: ['possible to carry out', 'already completed', 'unnecessary to discuss', 'certain to be profitable'],
    accepted: ['possible to carry out'],
  },
  {
    id: 'b2-v2', cefr: 'B2', skill: 'vocabulary', type: 'mcq',
    prompt: 'Jon was "reluctant" to speak in public, but he eventually agreed. At first, he was ___.',
    options: ['eager and enthusiastic', 'unable to hear', 'hesitant and unwilling', 'certain he had already spoken'],
    accepted: ['hesitant and unwilling'],
  },
  {
    id: 'b2-r1', cefr: 'B2', skill: 'reading', type: 'mcq',
    passage: 'A town introduced a parking fee to discourage short car journeys. Car use fell in the centre, but traffic increased in nearby streets where parking remained free. Shop owners welcomed the quieter centre, while residents in those streets complained about congestion.',
    prompt: 'Which conclusion is best supported by the passage?',
    options: ['The fee reduced traffic in every part of town', 'The policy partly shifted the problem to other streets', 'Shop owners demanded that all parking fees end', 'Free parking disappeared throughout the town'],
    accepted: ['The policy partly shifted the problem to other streets'],
  },
  {
    id: 'b2-r2', cefr: 'B2', skill: 'reading', type: 'mcq',
    passage: 'A company tested a four-day working week for three months. Output stayed stable and staff reported less stress. However, the trial took place during the firm\'s quietest season. The director wants another trial during the busiest months before making a permanent change.',
    prompt: 'Why does the director want a second trial?',
    options: ['Staff refused to answer the survey', 'Output fell during the first trial', 'The first trial lasted only four days', 'The first results may not represent busier conditions'],
    accepted: ['The first results may not represent busier conditions'],
  },
  {
    id: 'c1-g1', cefr: 'C1', skill: 'grammar', type: 'mcq',
    prompt: 'Only after reviewing all the evidence ___ change her mind.',
    options: ['did she', 'she did', 'does she has', 'she had did'], accepted: ['did she'],
  },
  {
    id: 'c1-g2', cefr: 'C1', skill: 'grammar', type: 'mcq',
    prompt: 'The contract, the terms of ___ were revised yesterday, was signed this morning.',
    options: ['whose', 'that', 'which', 'whom'], accepted: ['which'],
  },
  {
    id: 'c1-v1', cefr: 'C1', skill: 'vocabulary', type: 'mcq',
    prompt: 'The minister gave an "equivocal" answer about the proposed reform. The answer was ___.',
    options: ['unequivocally supportive', 'ambiguous and open to different interpretations', 'a detailed numerical forecast', 'unrelated to any political issue'],
    accepted: ['ambiguous and open to different interpretations'],
  },
  {
    id: 'c1-v2', cefr: 'C1', skill: 'vocabulary', type: 'mcq',
    prompt: 'The report describes the link between the two events as "tenuous". What does this imply?',
    options: ['The link is conclusively proven', 'The events happened at exactly the same time', 'The link is deliberately kept secret', 'The evidence for the link is weak'],
    accepted: ['The evidence for the link is weak'],
  },
  {
    id: 'c1-r1', cefr: 'C1', skill: 'reading', type: 'mcq',
    passage: 'The museum credits its new advertising campaign for a sharp rise in visitors. Yet admission became free in the same month, and a major exhibition opened a week later. The campaign may have contributed, but attributing the entire increase to it overlooks other plausible explanations. A comparison with a similar museum that changed only its advertising would provide stronger evidence.',
    prompt: 'What is the writer\'s main criticism of the museum\'s claim?',
    options: ['It assigns a cause without separating the effects of simultaneous changes', 'It proves that advertising never influences attendance', 'It assumes the major exhibition was unpopular', 'It uses visitor numbers that the writer shows are fabricated'],
    accepted: ['It assigns a cause without separating the effects of simultaneous changes'],
  },
  {
    id: 'c1-r2', cefr: 'C1', skill: 'reading', type: 'mcq',
    passage: 'The reviewer praises the novel\'s precise descriptions and convincing dialogue. She then remarks that its characters spend so long explaining their dilemmas that the plot scarcely moves. Readers who value atmosphere above momentum may find much to admire; those expecting a tightly paced story are likely to lose patience.',
    prompt: 'How does the reviewer assess the novel overall?',
    options: ['She recommends it unreservedly to readers of fast-paced stories', 'She dismisses both its dialogue and its descriptions', 'She recognises stylistic strengths while questioning its pace', 'She believes its atmosphere prevents convincing dialogue'],
    accepted: ['She recognises stylistic strengths while questioning its pace'],
  },
  {
    id: 'c2-g1', cefr: 'C2', skill: 'grammar', type: 'mcq',
    prompt: 'Which sentence preserves the meaning of "The board did not approve the plan until every objection had been addressed"?',
    options: ['Until the board approved the plan, every objection had been addressed', 'Not until every objection had been addressed did the board approve the plan', 'The board approved the plan so that every objection could be addressed', 'Every objection was addressed only after the board approved the plan'],
    accepted: ['Not until every objection had been addressed did the board approve the plan'],
  },
  {
    id: 'c2-g2', cefr: 'C2', skill: 'grammar', type: 'mcq',
    prompt: 'Which sentence expresses an unreal past condition and its unreal present consequence?',
    options: ['If she accepts the offer, she will live abroad next year', 'If she accepted the offer tomorrow, she would live abroad next year', 'If she had accepted the offer, she would have moved abroad last year', 'Had she accepted the offer last year, she would be living abroad now'],
    accepted: ['Had she accepted the offer last year, she would be living abroad now'],
  },
  {
    id: 'c2-v1', cefr: 'C2', skill: 'vocabulary', type: 'mcq',
    prompt: 'Calling an apology "disingenuous" suggests that it ___.',
    options: ['appears sincere but conceals a lack of honesty', 'is too brief to be understood', 'expresses more remorse than expected', 'uses language that is difficult to pronounce'],
    accepted: ['appears sincere but conceals a lack of honesty'],
  },
  {
    id: 'c2-v2', cefr: 'C2', skill: 'vocabulary', type: 'mcq',
    prompt: 'The agency\'s authority is "circumscribed" by its founding statute. Its authority is ___.',
    options: ['extended to all areas of government', 'described only in informal discussions', 'restricted within defined limits', 'renewed automatically each year'],
    accepted: ['restricted within defined limits'],
  },
  {
    id: 'c2-r1', cefr: 'C2', skill: 'reading', type: 'mcq',
    passage: 'The council calls its consultation inclusive because anyone may submit comments online. That claim treats the absence of a formal barrier as equivalent to an equal opportunity to participate. Residents without reliable internet access, time to read lengthy proposals, or confidence with official language may be nominally invited yet practically excluded. The point is not that an online consultation has no value, but that its accessibility cannot be established merely by counting the people permitted to respond.',
    prompt: 'Which assumption does the writer challenge?',
    options: ['Consultation can be valuable even when its results are disputed', 'Formal permission to participate guarantees practical access to participation', 'Some residents prefer to submit comments in writing', 'Official proposals can contain lengthy explanations'],
    accepted: ['Formal permission to participate guarantees practical access to participation'],
  },
  {
    id: 'c2-r2', cefr: 'C2', skill: 'reading', type: 'mcq',
    passage: 'An archive preserves every surviving letter written by a celebrated explorer, and the exhibition presents that completeness as evidence of a balanced portrait. But survival is itself selective: official dispatches were carefully stored, while informal notes to local guides were rarely retained. An exhaustive account of what remains can therefore perpetuate the very imbalance it appears to correct. The curator acknowledges this problem in a footnote, yet the exhibition\'s confident narrative leaves little room for the uncertainty that acknowledgement should introduce.',
    prompt: 'What is the writer\'s central objection to the exhibition?',
    options: ['The archive deliberately destroyed official dispatches', 'A complete surviving collection proves that informal notes never existed', 'A footnote makes it impossible to tell a coherent historical story', 'It presents a selectively preserved record with more certainty than that record warrants'],
    accepted: ['It presents a selectively preserved record with more certainty than that record warrants'],
  },
];

const SKILLS = ['grammar', 'vocabulary', 'reading'];
const SKILL_NAMES = { grammar: 'Grammar', vocabulary: 'Vocabulary', reading: 'Reading' };
const QUESTIONS_BY_ID = new Map(PLACEMENT_QUESTIONS.map(question => [question.id, question]));

// The student key and question id produce a stable display order without
// changing option strings, question ids, or the accepted answers.
export function orderPlacementOptions(question, seed) {
  const key = JSON.stringify([String(seed ?? ''), question.id]);
  let state = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    state = Math.imul(state ^ key.charCodeAt(index), 16777619) >>> 0;
  }
  const random = () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const options = question.options.slice();
  for (let index = options.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [options[index], options[other]] = [options[other], options[index]];
  }
  return options;
}

function validateAnswers(answers, { complete = true, sequential = false } = {}) {
  if (!Array.isArray(answers)) throw new TypeError('Placement answers must be an array.');
  if (complete && answers.length !== PLACEMENT_QUESTIONS.length) {
    throw new TypeError('Complete all placement questions before receiving a level.');
  }
  if (!complete && answers.length >= PLACEMENT_QUESTIONS.length) {
    throw new TypeError('A placement draft must leave at least one unanswered question.');
  }
  const seen = new Set();
  return answers.map((entry, index) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new TypeError('Each placement answer must identify its question.');
    }
    const question = QUESTIONS_BY_ID.get(entry.id);
    if (!question || seen.has(entry.id)) throw new TypeError('Placement question ids must be valid and unique.');
    if (sequential && question.id !== PLACEMENT_QUESTIONS[index].id) {
      throw new TypeError('Placement draft answers must follow the question order.');
    }
    if (entry.answer !== '__unknown__' && !question.options.includes(entry.answer)) {
      throw new TypeError('Select an available answer or choose I do not know.');
    }
    seen.add(entry.id);
    return { id: question.id, answer: entry.answer };
  });
}

export function scorePlacement(answers) {
  const validAnswers = validateAnswers(answers);
  const rows = validAnswers.map(entry => {
    const question = QUESTIONS_BY_ID.get(entry.id);
    return { ...entry, cefr: question.cefr, skill: question.skill, correct: question.accepted.includes(entry.answer) ? 1 : 0 };
  });
  const bandScores = Object.fromEntries(CEFR_TIERS.map(cefr => {
    const band = rows.filter(row => row.cefr === cefr);
    const correct = band.reduce((total, row) => total + row.correct, 0);
    const skillScores = Object.fromEntries(SKILLS.map(skill => {
      const skillRows = band.filter(row => row.skill === skill);
      return [skill, { correct: skillRows.reduce((total, row) => total + row.correct, 0), total: skillRows.length }];
    }));
    return [cefr, { correct, total: band.length, score: correct / band.length, passed: correct >= 5 && SKILLS.every(skill => skillScores[skill].correct >= 1), skillScores }];
  }));
  let overallIndex = 0;
  for (let index = 0; index < CEFR_TIERS.length; index += 1) {
    if (!bandScores[CEFR_TIERS[index]].passed) break;
    overallIndex = index;
  }
  const categories = Object.fromEntries(SKILLS.map(skill => {
    const skillRows = rows.filter(row => row.skill === skill);
    const correct = skillRows.reduce((total, row) => total + row.correct, 0);
    return [SKILL_NAMES[skill], { score: correct / skillRows.length, correct, total: skillRows.length }];
  }));
  const assessedSkills = SKILLS.map(skill => SKILL_NAMES[skill]);
  const strongAreas = assessedSkills.filter(name => categories[name].score >= 0.75);
  const weakAreas = assessedSkills.filter(name => categories[name].score < 0.75);
  const priorityArea = assessedSkills.reduce((current, name) => categories[name].score < categories[current].score ? name : current, assessedSkills[0]);
  const totalCorrect = rows.reduce((total, row) => total + row.correct, 0);
  return {
    version: PLACEMENT_VERSION,
    completedAt: new Date().toISOString(),
    provisional: true,
    completedItems: validAnswers.length,
    totalQuestions: PLACEMENT_QUESTIONS.length,
    assignedLevel: CEFR_TIERS[overallIndex],
    overallLevel: CEFR_TIERS[overallIndex],
    overallIndex,
    overallScore: totalCorrect / PLACEMENT_QUESTIONS.length,
    totalCorrect,
    bandScores,
    categories,
    strongAreas,
    weakAreas,
    priorityArea,
    assessedSkills,
    nextMilestone: CEFR_TIERS[Math.min(overallIndex + 1, CEFR_TIERS.length - 1)],
    answers: validAnswers,
  };
}

export function hasValidPlacement(assessment) {
  if (!assessment || typeof assessment !== 'object' || assessment.version !== PLACEMENT_VERSION) return false;
  if (typeof assessment.completedAt !== 'string' || !Number.isFinite(Date.parse(assessment.completedAt))) return false;
  try {
    const recomputed = scorePlacement(assessment.answers);
    return assessment.provisional === true && [
      'completedItems', 'totalQuestions', 'assignedLevel', 'overallLevel', 'overallIndex', 'overallScore', 'totalCorrect',
    ].every(key => assessment[key] === recomputed[key]) &&
      !!assessment.bandScores && typeof assessment.bandScores === 'object' && !Array.isArray(assessment.bandScores) &&
      Object.keys(assessment.bandScores).length === CEFR_TIERS.length &&
      CEFR_TIERS.every(cefr => {
        const stored = assessment.bandScores[cefr];
        const expected = recomputed.bandScores[cefr];
        return ['score', 'correct', 'total', 'passed'].every(key => stored?.[key] === expected[key]) &&
          SKILLS.every(skill => ['correct', 'total'].every(key => stored?.skillScores?.[skill]?.[key] === expected.skillScores[skill][key]));
      }) &&
      SKILLS.every(skill => {
        const name = SKILL_NAMES[skill];
        return ['score', 'correct', 'total'].every(key => assessment.categories?.[name]?.[key] === recomputed.categories[name][key]);
      });
  } catch {
    return false;
  }
}

export function getPlacementDraft(profile) {
  const empty = { version: PLACEMENT_VERSION, answers: [] };
  const draft = profile?.placementDraft;
  if (!draft || draft.version !== PLACEMENT_VERSION) return empty;
  try {
    return { version: PLACEMENT_VERSION, answers: validateAnswers(draft.answers, { complete: false, sequential: true }) };
  } catch {
    return empty;
  }
}
