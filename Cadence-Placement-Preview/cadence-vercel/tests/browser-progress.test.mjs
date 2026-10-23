import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseLessonProgress} from '../components/cadence/curriculum.js';

test('browser lesson progress recovers from malformed data and retains valid completion dates',()=>{
  const completedAt='2026-10-12T10:00:00.000Z';
  assert.deepEqual(parseLessonProgress(JSON.stringify({completed:{'a1-lesson-01':completedAt,'a1-lesson-02':false,'a1-lesson-03':'invalid'}})),{completed:{'a1-lesson-01':completedAt}});
  for(const raw of [null,undefined,'null','[]','{broken','{"completed":[]}','{"completed":null}']) assert.deepEqual(parseLessonProgress(raw),{completed:{}});
});
