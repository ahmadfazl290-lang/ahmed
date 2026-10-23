import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {createServerClient} from '@supabase/ssr';
import {assessMfa,requireMfa,SecurityError,safeMfaState} from '../lib/supabase/mfa-policy.ts';
const policy=new URL('../lib/supabase/auth-policy.ts',import.meta.url).href;
const mfaPolicy=new URL('../lib/supabase/mfa-policy.ts',import.meta.url).href;
async function load(file,extra={}){
  let code=ts.transpileModule(await readFile(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for(const [from,to] of Object.entries({'./auth-policy':policy,'./mfa-policy':mfaPolicy,...extra}))code=code.replaceAll("'"+from+"'",JSON.stringify(to));
  return import('data:text/javascript,'+encodeURIComponent(code));
}
const {handleMfa}=await load('../lib/supabase/mfa-handler.ts');
const {handleAuth}=await load('../lib/supabase/auth-handler.ts');
const {readAccount}=await load('../lib/supabase/account-details.ts');
let serial=0;
const factor=(id='own-totp',status='verified')=>({id,status,factor_type:'totp',friendly_name:'My authenticator',created_at:'2026-10-18T10:00:00Z'});
function fixture(options={}){
  const state={id:'mfa-user-'+(++serial),aal:'aal1',factors:[],exp:Math.floor(Date.now()/1000)+900,...options};
  const calls=[];
  const user=()=>({id:state.id,email:'student@example.test',email_confirmed_at:'2026-10-18T10:00:00Z',created_at:'2026-10-17T10:00:00Z',user_metadata:{full_name:'Private Student'},app_metadata:{providers:['email']},factors:structuredClone(state.factors)});
  const auth={
    getUser:async()=>({data:{user:user()},error:state.userError || null}),
    getSession:async()=>({data:{session:{access_token:'mock-carrier'}},error:null}),
    getClaims:async()=>({data:{claims:{sub:state.claimSub || state.id,aal:state.claimAal || state.aal,exp:state.exp}},error:state.claimError || null}),
    refreshSession:async()=>{calls.push(['refresh']);if(state.refreshError)return {error:state.refreshError};if(!state.factors.some(f=>f.status==='verified'))state.aal='aal1';return {data:{session:{}},error:null};},
    signInWithPassword:async()=>{calls.push(['signin']);return {data:{user:user(),session:{}},error:null};},
    updateUser:async()=>{calls.push(['update']);return {data:{user:user()},error:null};},
    signOut:async()=>{calls.push(['signout']);return {error:null};},
    mfa:{
      getAuthenticatorAssuranceLevel:async token=>{assert.equal(token,'mock-carrier');return {data:{currentLevel:state.aal,nextLevel:state.factors.some(f=>f.status==='verified')?'aal2':state.aal},error:state.assuranceError || null};},
      listFactors:async()=>({data:{all:structuredClone(state.factors)},error:state.listError || null}),
      enroll:async input=>{calls.push(['enroll',input]);if(state.enrollError)return {data:null,error:state.enrollError};const f=factor('pending-totp','unverified');state.factors.push(f);return {data:{id:f.id,type:'totp',totp:{secret:'MOCK-ONLY-NOT-A-REAL-SECRET',qr_code:'data:image/svg+xml;utf-8,<svg xmlns="http://www.w3.org/2000/svg"></svg>'}},error:null};},
      challengeAndVerify:async input=>{calls.push(['verify',input.factorId]);if(state.verifyError)return {data:null,error:state.verifyError};if(input.code!=='123456')return {data:null,error:{code:'mfa_verification_failed',status:422}};state.factors.find(f=>f.id===input.factorId).status='verified';state.aal='aal2';return {data:{access_token:'never-return',refresh_token:'never-return'},error:null};},
      unenroll:async input=>{calls.push(['unenroll',input.factorId]);if(state.removeError)return {data:null,error:state.removeError};if(!state.keepRemoved)state.factors=state.factors.filter(f=>f.id!==input.factorId);return {data:{id:input.factorId},error:null};},
    },
  };
  return {state,calls,client:{auth},user};
}
const request=body=>new Request('https://school.example/api/supabase-mfa',{method:body?'POST':'GET',headers:body?{origin:'https://school.example','Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined});
async function run(f,body){const response=await handleMfa(request(body),async()=>f.client);return {response,body:await response.json()};}

test('MFA policy allows optional AAL1, blocks enrolled AAL1, and allows validated AAL2',async()=>{
  for(const [aal,factors,allowed] of [['aal1',[],true],['aal1',[factor()],false],['aal2',[factor()],true]]){
    const f=fixture({aal,factors});const state=await assessMfa(f.client,f.user());
    assert.equal(state.required,!allowed);
    if(allowed)assert.doesNotThrow(()=>requireMfa(state));else assert.throws(()=>requireMfa(state),error=>error.code==='mfa_required');
  }
});
test('signed claims must match the online identity, assurance level, and expiry',async()=>{
  for(const change of [{claimSub:'other-account'},{claimAal:'aal2'},{exp:Math.floor(Date.now()/1000)-1},{claimError:{name:'AuthInvalidJwtError',status:400}},{listError:{status:503}},{assuranceError:{status:503}}]){
    const f=fixture(change);await assert.rejects(()=>assessMfa(f.client,f.user()),SecurityError);
  }
});
test('a stale AAL2 session without factors is refreshed before optional access is allowed',async()=>{
  const f=fixture({aal:'aal2'});const state=await assessMfa(f.client,f.user());assert.equal(state.currentLevel,'aal1');assert.equal(state.required,false);assert.equal(f.calls[0][0],'refresh');
  const failed=fixture({aal:'aal2',refreshError:{status:401,code:'session_expired'}});await assert.rejects(()=>assessMfa(failed.client,failed.user()),e=>e.code==='expired');
});
test('MFA status exposes only safe challenge-factor metadata at AAL1',async()=>{
  const f=fixture({factors:[factor(),factor('pending','unverified')]});const result=await run(f);
  assert.equal(result.body.required,true);assert.deepEqual(result.body.factors.map(f=>f.id),['own-totp']);
  assert.equal('email' in result.body,false);assert.equal('user' in result.body,false);assert.equal('secret' in result.body,false);
  assert.equal(result.response.headers.get('cache-control'),'private, no-store');
});
test('private account reads and password changes reject enrolled AAL1 without returning account data',async()=>{
  const f=fixture({factors:[factor()]});const response=await readAccount(async()=>f.client);const body=await response.json();
  assert.equal(response.status,403);assert.equal(body.error,'mfa_required');assert.equal('account' in body,false);assert.equal('user' in body,false);
  const update=new Request('https://school.example/api/supabase-auth',{method:'POST',headers:{origin:'https://school.example'},body:JSON.stringify({action:'update',password:'new-long-password',confirm:'new-long-password'})});
  const changed=await handleAuth(update,async()=>f.client);assert.equal(changed.status,403);assert.equal(f.calls.some(c=>c[0]==='update'),false);
});
test('password login requires MFA only when verified factors exist and preserves the first-factor session',async()=>{
  for(const factors of [[],[factor()]]){
    const f=fixture({factors});const req=new Request('https://school.example/api/supabase-auth',{method:'POST',headers:{origin:'https://school.example'},body:JSON.stringify({action:'signin',email:`login-${f.state.id}@example.test`,password:'long-password'})});
    const response=await handleAuth(req,async()=>f.client);const body=await response.json();assert.equal(response.status,200);
    assert.equal(!!body.mfaRequired,!!factors.length);assert.equal(f.calls.some(c=>c[0]==='signout'),false);
  }
});
test('enrollment uses official TOTP options and only the enrollment response contains temporary setup material',async()=>{
  const f=fixture();const result=await run(f,{action:'enroll',name:'My phone'});
  assert.equal(result.response.status,200);assert.deepEqual(f.calls[0],['enroll',{factorType:'totp',issuer:'English-Co',friendlyName:'My phone'}]);
  assert.equal(result.body.enrollment.qrCode.startsWith('data:image/svg+xml;'),true);assert.equal(typeof result.body.enrollment.secret,'string');
  assert.equal(/access_token|refresh_token/.test(JSON.stringify(result.body)),false);
  assert.equal((await run(f)).body.factors[0].status,'unverified');
});
test('verified-factor enrollment cannot be bypassed by creating or verifying a pending factor at AAL1',async()=>{
  const f=fixture({factors:[factor(),factor('pending','unverified')]});
  assert.equal((await run(f,{action:'enroll',name:'Attacker phone'})).response.status,403);
  assert.equal((await run(f,{action:'verify',factorId:'pending',code:'123456'})).response.status,403);
  assert.equal(f.calls.length,0);
});
test('six-digit syntax is not authorization: Supabase verifies every code before AAL2 is accepted',async()=>{
  const f=fixture({factors:[factor()]});
  assert.equal((await run(f,{action:'verify',factorId:'own-totp',code:'123'})).response.status,400);assert.equal(f.calls.length,0);
  const invalid=await run(f,{action:'verify',factorId:'own-totp',code:'000000'});assert.equal(invalid.body.error,'invalid_code');
  const valid=await run(f,{action:'verify',factorId:'own-totp',code:'123456'});assert.equal(valid.response.status,200);assert.equal(valid.body.currentLevel,'aal2');assert.equal(valid.body.required,false);assert.equal(/access_token|refresh_token/.test(JSON.stringify(valid.body)),false);
});
test('enrollment activation requires a freshly verified factor and actual AAL2 after Supabase verification',async()=>{
  const f=fixture({factors:[factor('pending','unverified')]});
  const result=await run(f,{action:'verify',factorId:'pending',code:'123456'});assert.equal(result.body.currentLevel,'aal2');assert.equal(result.body.factors[0].status,'verified');
  const fake=fixture({factors:[factor()]});fake.client.auth.mfa.challengeAndVerify=async()=>({data:{},error:null});
  const failure=await run(fake,{action:'verify',factorId:'own-totp',code:'123456'});assert.equal(failure.response.ok,false);assert.equal(failure.body.ok,undefined);
});
test('cross-account and removed factor IDs never reach the Supabase mutation methods',async()=>{
  for(const action of ['verify','cancel','remove']){
    const f=fixture({aal:'aal2',factors:[factor()]});const result=await run(f,{action,factorId:'another-users-factor',code:'123456',confirm:true});
    assert.equal(result.body.error,'factor_missing');assert.equal(f.calls.length,0);
  }
});
test('cancellation removes only an owned unverified TOTP factor; verified factors are preserved',async()=>{
  const pending=fixture({factors:[factor('pending','unverified')]});assert.equal((await run(pending,{action:'cancel',factorId:'pending'})).response.ok,true);assert.equal(pending.state.factors.length,0);
  const verified=fixture({aal:'aal2',factors:[factor()]});assert.equal((await run(verified,{action:'cancel',factorId:'own-totp'})).body.error,'factor_verified');assert.equal(verified.state.factors.length,1);
});
test('removing verified factors requires AAL2 and explicit confirmation, then reconciles the session',async()=>{
  for(const change of [{aal:'aal1',confirm:true},{aal:'aal2',confirm:false}]){
    const f=fixture({aal:change.aal,factors:[factor()]});assert.equal((await run(f,{action:'remove',factorId:'own-totp',confirm:change.confirm})).response.status,403);assert.equal(f.calls.length,0);
  }
  const f=fixture({aal:'aal2',factors:[factor()]});const result=await run(f,{action:'remove',factorId:'own-totp',confirm:true});
  assert.equal(result.body.factors.length,0);assert.equal(result.body.nextLevel,'aal1');assert.equal(result.body.currentLevel,'aal1');assert.deepEqual(f.calls.map(c=>c[0]),['unenroll','refresh']);
});
test('removing one of multiple verified factors does not report MFA disabled',async()=>{
  const f=fixture({aal:'aal2',factors:[factor(),factor('backup')]});const result=await run(f,{action:'remove',factorId:'own-totp',confirm:true});
  assert.equal(result.body.nextLevel,'aal2');assert.deepEqual(result.body.factors.map(f=>f.id),['backup']);
  const stale=fixture({aal:'aal2',factors:[factor()],keepRemoved:true});assert.equal((await run(stale,{action:'remove',factorId:'own-totp',confirm:true})).response.ok,false);
});
test('Supabase rate limits, expired challenges, expired sessions and outages produce safe actionable errors',async()=>{
  for(const [error,code,status] of [[{status:429},'rate',429],[{status:400,code:'mfa_challenge_expired'},'code_expired',400],[{status:401,code:'session_expired'},'expired',401],[{status:503,message:'private'},'unavailable',503]]){
    const f=fixture({factors:[factor()],verifyError:error});const result=await run(f,{action:'verify',factorId:'own-totp',code:'123456'});
    assert.equal(result.body.error,code);assert.equal(result.response.status,status);assert.equal(JSON.stringify(result.body).includes('private'),false);
    if(status===429)assert.equal(result.response.headers.get('retry-after'),'60');
  }
});
test('the real server-provided fifteen-minute token window expires without being extended by UI state',async()=>{
  const start=Math.floor(Date.now()/1000),f=fixture({factors:[factor()],exp:start+900});
  const status=await run(f);assert.equal(status.body.expiresAt,(start+900)*1000);
  f.state.exp=start-1;
  const result=await run(f,{action:'verify',factorId:'own-totp',code:'123456'});assert.equal(result.response.status,401);assert.equal(result.body.error,'expired');assert.equal(f.calls.length,0);
});
test('factor limits, malformed bodies and foreign-origin mutations fail before enrollment',async()=>{
  const limit=fixture({aal:'aal2',factors:Array.from({length:10},(_,i)=>factor('factor-'+i))});assert.equal((await run(limit,{action:'enroll',name:'Extra'})).body.error,'factor_limit');assert.equal(limit.calls.length,0);
  let clients=0;const make=async()=>{clients++;return fixture().client;};
  for(const body of ['null','{bad',JSON.stringify({action:'phone'}),'x'.repeat(2049)]){
    const response=await handleMfa(new Request('https://school.example/api/supabase-mfa',{method:'POST',headers:{origin:'https://school.example'},body}),make);assert.equal(response.status,400);
  }
  const foreign=await handleMfa(new Request('https://school.example/api/supabase-mfa',{method:'POST',headers:{origin:'https://evil.test'},body:'{}'}),make);assert.equal(foreign.status,403);assert.equal(clients,0);
});

test('concurrent enrollment requests cannot create duplicate factors in the same server process',async()=>{
  const f=fixture();let release;let entered;
  const waiting=new Promise(resolve=>entered=resolve);
  const original=f.client.auth.mfa.enroll;
  f.client.auth.mfa.enroll=async input=>{entered();await new Promise(resolve=>release=resolve);return original(input);};
  const first=run(f,{action:'enroll',name:'My phone'});await waiting;
  const duplicate=await run(f,{action:'enroll',name:'My phone'});assert.equal(duplicate.response.status,429);
  release();assert.equal((await first).response.status,200);assert.equal(f.calls.filter(c=>c[0]==='enroll').length,1);
});

const {GET:confirmation}=await load('../app/auth/confirm/route.ts',{
  'next/server':import.meta.resolve('next/server.js'),
  '../../../lib/supabase/server':'data:text/javascript,'+encodeURIComponent('export async function createClient(){return globalThis.__mfaCallback;}'),
  '../../../lib/supabase/auth-policy':policy,'../../../lib/supabase/mfa-policy':mfaPolicy,
});
test('email and recovery callbacks require MFA before protected account access and preserve reset navigation',async()=>{
  for(const flow of [null,'recovery']){
    const f=fixture({factors:[factor()]});f.client.auth.exchangeCodeForSession=async()=>({data:{redirectType:flow},error:null});globalThis.__mfaCallback=f.client;
    try{
      const response=await confirmation(new Request('https://school.example/auth/confirm?code=mock&next=https://evil.test'));
      assert.equal(response.headers.get('location'),'https://school.example/account?provider=supabase&mode=mfa'+(flow==='recovery'?'&after=recovery':''));
      f.state.aal='aal2';
      const elevated=await confirmation(new Request('https://school.example/auth/confirm?code=mock'));
      assert.equal(new URL(elevated.headers.get('location')).searchParams.get(flow==='recovery'?'mode':'result'),flow==='recovery'?'update':'verified');
    }finally{delete globalThis.__mfaCallback;}
  }
});

test('real installed SSR SDK enrolls, challenges, verifies, persists AAL2 cookies and removes factors using mocked Auth transport',async()=>{
  const now=Math.floor(Date.now()/1000),jar=new Map(),requests=[];
  let aal='aal1',factors=[],latestToken;
  const sdkUser=()=>({id:'sdk-user',email:'sdk@example.test',email_confirmed_at:'2026-10-18T09:00:00Z',created_at:'2026-10-17T09:00:00Z',aud:'authenticated',role:'authenticated',app_metadata:{providers:['email']},user_metadata:{},factors});
  const session=()=>{latestToken=[{alg:'HS256',typ:'JWT'},{sub:'sdk-user',aud:'authenticated',aal,exp:now+900,iat:now}].map(x=>Buffer.from(JSON.stringify(x)).toString('base64url')).join('.')+'.mock';return {access_token:latestToken,refresh_token:'mock-refresh',token_type:'bearer',expires_in:900,user:sdkUser()};};
  const transport=async(input,init={})=>{
    const url=new URL(input),method=init.method || 'GET',body=init.body?JSON.parse(init.body):{};
    requests.push([method,url.pathname]);
    if(url.pathname==='/auth/v1/token'){if(url.searchParams.get('grant_type')==='refresh_token' && !factors.length)aal='aal1';return Response.json(session());}
    if(url.pathname==='/auth/v1/user')return Response.json(sdkUser());
    if(url.pathname==='/auth/v1/factors' && method==='POST'){assert.equal(body.factor_type,'totp');assert.equal(body.issuer,'English-Co');factors=[factor('sdk-factor','unverified')];return Response.json({id:'sdk-factor',type:'totp',totp:{secret:'MOCK-ONLY-SETUP-MATERIAL',qr_code:'<svg xmlns="http://www.w3.org/2000/svg"></svg>',uri:'otpauth://mock-only'}});}
    if(url.pathname.endsWith('/challenge'))return Response.json({id:'sdk-challenge',expires_at:now+60});
    if(url.pathname.endsWith('/verify')){assert.equal(body.challenge_id,'sdk-challenge');assert.equal(body.code,'123456');factors[0].status='verified';aal='aal2';return Response.json(session());}
    if(url.pathname==='/auth/v1/factors/sdk-factor' && method==='DELETE'){factors=[];return Response.json({id:'sdk-factor'});}
    throw Error('Unexpected mocked SDK path');
  };
  const make=()=>createServerClient('https://sdk.example','sb_publishable_mock',{global:{fetch:transport},cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value,options})=>options.maxAge===0?jar.delete(name):jar.set(name,value))}});
  const sender=make();
  try{
    assert.equal((await sender.auth.signInWithPassword({email:'sdk@example.test',password:'mock-password'})).error,null);
    const enrolled=await handleMfa(request({action:'enroll',name:'My phone'}),async()=>sender);assert.equal(enrolled.status,200);
    const setupBody=await enrolled.json();assert.equal(typeof setupBody.enrollment.secret,'string');
    const receiver=make();
    try{
      const result=await handleMfa(request({action:'verify',factorId:'sdk-factor',code:'123456'}),async()=>receiver);assert.equal(result.status,200);assert.equal((await result.json()).currentLevel,'aal2');
      const next=make();
      try{
        const refreshedIdentity=await next.auth.getUser();const state=await assessMfa(next,refreshedIdentity.data.user);assert.equal(state.currentLevel,'aal2');
        const removed=await handleMfa(request({action:'remove',factorId:'sdk-factor',confirm:true}),async()=>next);assert.equal(removed.status,200);assert.equal((await removed.json()).factors.length,0);
      }finally{next.auth.stopAutoRefresh();}
    }finally{receiver.auth.stopAutoRefresh();}
    assert.equal(requests.some(([method,path])=>method==='POST' && path.endsWith('/challenge')),true);
    assert.equal(requests.some(([method,path])=>method==='POST' && path.endsWith('/verify')),true);
    assert.equal([...jar.keys()].some(key=>key.includes('auth-token')),true);
  }finally{sender.auth.stopAutoRefresh();}
});
