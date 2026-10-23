import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {mfaPolicyUrl,withSecurity} from './mfa-fixture.mjs';

let code=ts.transpileModule(await readFile(new URL('../lib/supabase/account-details.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
code=code.replace("'./auth-policy'",JSON.stringify(new URL('../lib/supabase/auth-policy.ts',import.meta.url).href));
code=code.replace("'./mfa-policy'",JSON.stringify(mfaPolicyUrl));
const {accountDetails,readAccount}=await import('data:text/javascript,'+encodeURIComponent(code));
const user={id:'own-user',email:'own@example.test',email_confirmed_at:'2026-10-18T10:00:00Z',created_at:'2026-10-17T09:00:00Z',last_sign_in_at:'2026-10-18T11:00:00Z',user_metadata:{full_name:'Registered Student',admin:true,email_verified:true},app_metadata:{providers:['email','google']},identities:[{provider:'email'}],factors:[]};

test('account projection returns supported own-account fields and only actually linked providers',()=>{
  assert.deepEqual(accountDetails(user),{fullName:'Registered Student',email:'own@example.test',verified:true,confirmedAt:'2026-10-18T10:00:00.000Z',createdAt:'2026-10-17T09:00:00.000Z',lastSignInAt:'2026-10-18T11:00:00.000Z',providers:['email'],twoFactor:'not_enrolled'});
  assert.deepEqual(accountDetails({...user,identities:[{provider:'email'},{provider:'google'},{provider:'email'}]}).providers,['email','google']);
  assert.deepEqual(accountDetails({...user,identities:undefined}).providers,['email','google']);
  assert.deepEqual(accountDetails({...user,identities:[]}).providers,[]);
});

test('editable metadata cannot prove email verification or enroll a factor',()=>{
  const details=accountDetails({...user,email_confirmed_at:undefined,user_metadata:{email_verified:true,twoFactor:true,full_name:'  Display name  '}});
  assert.equal(details.verified,false);assert.equal(details.confirmedAt,null);assert.equal(details.fullName,'Display name');
  assert.equal(details.twoFactor,'not_enrolled');
});

test('factor status distinguishes real enrollment, pending enrollment, missing data and no factors',()=>{
  for(const [factors,status] of [[undefined,'unknown'],[[],'not_enrolled'],[[{status:'unverified',factor_type:'totp'}],'pending'],[[{status:'verified',factor_type:'totp',secret:'private'}],'enrolled']]) {
    const details=accountDetails({...user,factors});
    assert.equal(details.twoFactor,status);assert.equal(JSON.stringify(details).includes('private'),false);
  }
});

test('missing account fields and invalid dates are safe; anonymous sessions have no student account',()=>{
  assert.equal(accountDetails(null),null);assert.equal(accountDetails({...user,is_anonymous:true}),null);
  const details=accountDetails({id:'minimal',created_at:'bad-date',last_sign_in_at:'not-a-date',user_metadata:{full_name:123}});
  assert.equal(details.fullName,null);assert.equal(details.email,null);assert.equal(details.createdAt,null);assert.equal(details.lastSignInAt,null);assert.deepEqual(details.providers,[]);
});

test('readAccount validates its own identity without a supplied ID and never returns secrets or raw metadata',async()=>{
  const calls=[];
  const response=await readAccount(async()=>withSecurity({auth:{getUser:async(...args)=>{calls.push(args);return {data:{user:{...user,access_token:'secret-access',refresh_token:'secret-refresh',identities:[{provider:'email',identity_data:{secret:'private'}}]}},error:null};}}},user));
  assert.deepEqual(calls,[[]]);
  const body=await response.json();
  assert.equal(body.account.email,'own@example.test');assert.equal(body.user.id,'own-user');
  assert.doesNotMatch(JSON.stringify(body),/secret|private|admin|identity_data/);
  assert.equal(response.headers.get('cache-control'),'private, no-store');assert.equal(response.headers.get('vary'),'Cookie');
});

test('unverified account details can be displayed without granting verified access',async()=>{
  const response=await readAccount(async()=>withSecurity({auth:{getUser:async()=>({data:{user:{...user,email_confirmed_at:undefined}},error:null})}},user));
  const body=await response.json();assert.equal(body.user,null);assert.equal(body.account.verified,false);
});

test('expired or absent sessions clear account data; network failures never return stale identities',async()=>{
  for(const error of [{name:'AuthSessionMissingError'}, {status:401,code:'session_not_found'}]) {
    const response=await readAccount(async()=>withSecurity({auth:{getUser:async()=>({data:{user},error})}},user));
    assert.deepEqual(await response.json(),{user:null,account:null});
  }
  for(const error of [{status:500,message:'private'}, {status:429}, {name:'NetworkError'}]) {
    const response=await readAccount(async()=>withSecurity({auth:{getUser:async()=>({data:{user},error})}},user));
    assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'unavailable'});
  }
  assert.equal((await readAccount(async()=>{throw Error('private configuration');})).status,503);
});
