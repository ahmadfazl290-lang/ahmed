import assert from 'node:assert/strict';
import {test} from 'node:test';
import {entryDecision} from '../lib/entry-state.ts';
test('entry uses only a complete validated account projection',()=>{
 assert.deepEqual(entryDecision(200,{user:null,account:null}),{kind:'signed-out'});
 assert.deepEqual(entryDecision(401,{error:'expired'}),{kind:'signed-out'});
 assert.deepEqual(entryDecision(200,{user:null,account:{verified:false}}),{kind:'verification'});
 assert.deepEqual(entryDecision(403,{error:'mfa_required'}),{kind:'mfa'});
 assert.deepEqual(entryDecision(200,{user:{id:'one',verified:true},account:{verified:true}}),{kind:'authenticated',subject:'one'});
 for(const value of [null,{},[],{user:{id:'one',verified:true}},{user:{id:'one',verified:false},account:{verified:true}},{user:{id:'one',verified:true},account:{verified:false}},{user:{id:'',verified:true},account:{verified:true}},{error:'unavailable',user:null,account:null}])assert.equal(entryDecision(200,value).kind,'unavailable');
 for(const status of [403,500,503])assert.equal(entryDecision(status,{user:null,account:null}).kind,'unavailable');
});
