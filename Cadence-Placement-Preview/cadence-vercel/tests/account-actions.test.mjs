import {test} from 'node:test';
import assert from 'node:assert/strict';
import {
  TOKEN_LIFETIMES, randomToken, tokenDigest, validToken, accountLink,
  consumeVerification, consumeReset,
} from '../lib/account-actions.mjs';

// These tests check request and database interface contracts. The recorder does
// not execute PostgreSQL or demonstrate real transaction/concurrency behavior.
function recordingDatabase(result={userId:'email:learner'}) {
  const calls=[];
  return {calls,db:{prepare(sql) {
    const call={sql,values:null,firstCalls:0};
    calls.push(call);
    return {bind(...values) {
      call.values=values;
      return {async first() {call.firstCalls++;return result;}};
    }};
  }}};
}

test('account links use distinct random 32-byte hexadecimal tokens',()=>{
  const values=Array.from({length:128},()=>randomToken());
  assert.equal(new Set(values).size,values.length);
  for(const value of values) {
    assert.match(value,/^[a-f0-9]{64}$/);
    assert.equal(validToken(value),true);
  }
});

test('token hashing matches the SHA-256 known vector',async()=>{
  assert.equal(await tokenDigest('abc'),'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
});

test('account links retain only the configured origin and put tokens in a fragment',()=>{
  const token='ab'.repeat(32);
  for(const action of ['verify','reset']) {
    const url=new URL(accountLink('https://cadence.example/nested?ignored=1#old',action,token));
    assert.equal(url.origin,'https://cadence.example');
    assert.equal(url.pathname,'/account');
    assert.equal(url.search,'');
    const fragment=new URLSearchParams(url.hash.slice(1));
    assert.equal(fragment.get('action'),action);
    assert.equal(fragment.get('token'),token);
    assert.equal([...fragment].length,2);
  }
  assert.equal(new URL(accountLink('http://localhost:3000','reset',token)).origin,'http://localhost:3000');
  assert.equal(new URL(accountLink('http://127.0.0.1:4174','verify',token)).origin,'http://127.0.0.1:4174');
});

test('account links reject credentials, remote HTTP, unsupported origins and invalid tokens',()=>{
  const token='cd'.repeat(32);
  const origins=[
    'https://user:password@cadence.example',
    'https://cadence.example@other.example',
    'http://cadence.example',
    'http://127.0.0.1.other.example',
    'ftp://cadence.example',
    'javascript:alert(1)',
    '/relative',
  ];
  for(const origin of origins)assert.throws(()=>accountLink(origin,'reset',token));
  for(const value of ['',token.slice(1),token+'0',token.toUpperCase(),null,123])
    assert.throws(()=>accountLink('https://cadence.example','reset',value));
  for(const purpose of ['signin','verify-reset','',null])
    assert.throws(()=>accountLink('https://cadence.example',purpose,token));
});

test('malformed action tokens are rejected before any database access',async()=>{
  const {db,calls}=recordingDatabase();
  const tokens=['','x'.repeat(64),'a'.repeat(63),'a'.repeat(65),'A'.repeat(64),' a'.repeat(32),null,undefined,123,{},[]];
  for(const token of tokens) {
    assert.equal(validToken(token),false);
    assert.equal(await consumeVerification(db,token,'new-password-hash','salt',1000),null);
    assert.equal(await consumeReset(db,token,'new-password-hash','salt',1000),null);
  }
  assert.deepEqual(calls,[]);
});

test('verification binds a token digest and atomically requests password rotation and session revocation',async()=>{
  const token='ef'.repeat(32),now=1720000000000;
  const result={userId:'email:learner'};
  const {db,calls}=recordingDatabase(result);
  assert.equal(await consumeVerification(db,token,'new-password-hash','new-salt',now),result);
  assert.equal(calls.length,1);
  const {sql,values,firstCalls}=calls[0];
  assert.deepEqual(values,[await tokenDigest(token),now,now,'new-password-hash','new-salt']);
  assert.equal(values.includes(token),false);
  assert.equal(sql.includes(token),false);
  assert.equal(firstCalls,1);
  assert.match(sql,/DELETE FROM email_action_tokens WHERE token_hash=\? AND purpose='verify' AND expires_at>\?/);
  assert.match(sql,/RETURNING user_id,auth_version/);
  assert.match(sql,/SET email_verified_at=\?,password_hash=\?,salt=\?,auth_version=a\.auth_version\+1/);
  assert.match(sql,/a\.user_id=c\.user_id AND a\.auth_version=c\.auth_version/);
  assert.match(sql,/DELETE FROM email_sessions WHERE user_id IN \(SELECT user_id FROM updated\)/);
});

test('reset binds its purpose and expiry without marking email verified, and rotates the auth version',async()=>{
  const token='12'.repeat(32),now=1720000000000;
  const {db,calls}=recordingDatabase(null);
  assert.equal(await consumeReset(db,token,'new-password-hash','new-salt',now),null);
  assert.equal(calls.length,1);
  const {sql,values,firstCalls}=calls[0];
  assert.deepEqual(values,[await tokenDigest(token),now,'new-password-hash','new-salt']);
  assert.equal(values.includes(token),false);
  assert.equal(sql.includes(token),false);
  assert.equal(firstCalls,1);
  assert.match(sql,/DELETE FROM email_action_tokens WHERE token_hash=\? AND purpose='reset' AND expires_at>\?/);
  assert.match(sql,/SET password_hash=\?,salt=\?,auth_version=a\.auth_version\+1/);
  assert.match(sql,/a\.user_id=c\.user_id AND a\.auth_version=c\.auth_version/);
  assert.match(sql,/DELETE FROM email_sessions WHERE user_id IN \(SELECT user_id FROM updated\)/);
  assert.doesNotMatch(sql,/email_verified_at/);
});

test('verification and password reset have explicit bounded token lifetimes',()=>{
  assert.equal(TOKEN_LIFETIMES.verify,24*60*60*1000);
  assert.equal(TOKEN_LIFETIMES.reset,30*60*1000);
});
