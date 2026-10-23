import {test} from 'node:test';
import assert from 'node:assert/strict';
import {storageKey,validOrigin} from '../lib/cadence-security.mjs';
import {gradeAnswer} from '../components/cadence/grading.js';
test('anonymous and cross-account learning requests are rejected',()=>{
 const user={userId:'email:a',email:'alice@example.test'};
 assert.equal(storageKey('profile:alice@example.test',user),'profile');
 assert.throws(()=>storageKey('profile:bob@example.test',user));
 assert.throws(()=>storageKey('profile:alice@example.test',null));
 assert.throws(()=>storageKey('user:alice@example.test',user));
});
test('removed learning features cannot write their legacy storage namespaces',()=>{
 const user={userId:'a',email:'alice@example.test'};
 for(const key of ['practice_active:grammar','tutor_sessions','call_sessions','errors','daily_lesson','course_progress'])assert.throws(()=>storageKey(key+':alice@example.test',user));
});
test('cross-origin mutations are rejected',()=>{
 assert.equal(validOrigin(new Request('https://cadence.example/api/storage',{headers:{Origin:'https://other.example'}})),false);
 assert.equal(validOrigin(new Request('https://cadence.example/api/storage',{headers:{Origin:'https://cadence.example'}})),true);
});
test('objective answers reject misleading substring matches',()=>{
 const task={type:'fill',accepted:['is']};
 assert.equal(gradeAnswer(task,'is'),1);
 assert.equal(gradeAnswer(task,'this is incorrect'),0);
});
