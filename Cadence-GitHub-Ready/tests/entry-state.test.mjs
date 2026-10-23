import assert from 'node:assert/strict';
import {test} from 'node:test';
import {entryDecision,learningEntry} from '../lib/entry-state.ts';
test('entry uses only a complete validated account projection',()=>{
 assert.deepEqual(entryDecision(200,{user:null,account:null}),{kind:'signed-out'});
 assert.deepEqual(entryDecision(401,{error:'expired'}),{kind:'signed-out'});
 assert.deepEqual(entryDecision(200,{user:null,account:{verified:false}}),{kind:'verification'});
 assert.deepEqual(entryDecision(403,{error:'mfa_required'}),{kind:'mfa'});
 assert.deepEqual(entryDecision(200,{user:{id:'one',verified:true},account:{verified:true}}),{kind:'authenticated',subject:'one'});
 for(const value of [null,{},[],{user:{id:'one',verified:true}},{user:{id:'one',verified:false},account:{verified:true}},{user:{id:'one',verified:true},account:{verified:false}},{user:{id:'',verified:true},account:{verified:true}},{error:'unavailable',user:null,account:null}])assert.equal(entryDecision(200,value).kind,'unavailable');
 for(const status of [403,500,503])assert.equal(entryDecision(status,{user:null,account:null}).kind,'unavailable');
});

test('public learning remains available without Supabase configuration, a session, or a reachable account service',()=>{
 for(const response of [[503,{error:'unavailable'}],[401,{error:'expired'}],[200,{user:null,account:null}],[200,null]]) {
  assert.deepEqual(learningEntry(entryDecision(...response)),{kind:'guest'});
 }
 assert.deepEqual(learningEntry(null),{kind:'guest'},'network failure and timed-out account checks open only public learning');
});

test('explicit guest opens public records independently of account configuration and MFA state',()=>{
 for(const decision of [null,{kind:'unavailable'},{kind:'mfa'},{kind:'verification'},{kind:'authenticated',subject:'account-a'}]) {
  assert.deepEqual(learningEntry(decision,true),{kind:'guest'});
 }
 assert.deepEqual(learningEntry({kind:'authenticated',subject:'account-a'}),{kind:'account',subject:'account-a'});
 assert.deepEqual(learningEntry({kind:'mfa'}),{kind:'mfa'},'default authenticated entry still requires the existing challenge');
 assert.deepEqual(learningEntry({kind:'verification'}),{kind:'verification'});
 assert.equal(entryDecision(200,{user:{id:'x'.repeat(513),verified:true},account:{verified:true}}).kind,'unavailable');
});
