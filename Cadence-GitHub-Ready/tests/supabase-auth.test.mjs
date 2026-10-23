import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import {createServerClient} from '@supabase/ssr';
import {AuthApiError} from '@supabase/supabase-js';
import {createHash} from 'node:crypto';
import {mfaPolicyUrl,withSecurity} from './mfa-fixture.mjs';
import {ACCOUNT_PATH, callbackDestination, publicUser, requestOrigin, validEmail, validPassword, allowAttempt, reserveEmailRequest} from '../lib/supabase/auth-policy.ts';

async function load(path, replacements) {
  let code = ts.transpileModule(await readFile(new URL(path, import.meta.url),'utf8'), {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  for (const [from,to] of Object.entries(replacements)) code = code.replaceAll("'"+from+"'",JSON.stringify(to));
  return import('data:text/javascript,'+encodeURIComponent(code));
}
const policy = new URL('../lib/supabase/auth-policy.ts',import.meta.url).href;
const {handleAuth} = await load('../lib/supabase/auth-handler.ts',{'./auth-policy':policy,'./mfa-policy':mfaPolicyUrl});
let counter = 0;
const verified = {id:'uuid-fixture',email:'student@example.test',email_confirmed_at:'2026-10-15T00:00:00Z'};
function fixture(overrides={}) {
  const calls = [];
  const names = ['signUp','signInWithPassword','signOut','resend','resetPasswordForEmail','getUser','updateUser'];
  const auth = Object.fromEntries(names.map(name=>[name,async (...args)=>{calls.push([name,...args]);return overrides[name] ?? {data:{user:verified,session:null},error:null};}]));
  return {calls,client:withSecurity({auth})};
}
function request(body,origin='https://school.example') {
  return new Request('https://school.example/api/supabase-auth',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:typeof body === 'string' ? body : JSON.stringify(body)});
}
function credentials(action='signin') {return {action,name:'Student',email:`student-${++counter}@example.test`,password:'long-password',confirm:'long-password'};}
async function run(body,overrides={}) {
  const f=fixture(overrides);
  const response=await handleAuth(request(body),async()=>f.client);
  return {...f,response,body:await response.json()};
}

test('registration validation rejects malformed email, name, password and mismatch before SDK calls', async()=>{
  for(const change of [{email:'invalid'},{name:' '},{name:'x'.repeat(81)},{password:'short'},{password:'x'.repeat(129)},{confirm:'different'}]) {
    const result=await run({...credentials('signup'),...change});
    assert.equal(result.response.status,400); assert.equal(result.calls.length,0);
  }
  assert.equal(validEmail('a@example.test'),true);assert.equal(validPassword('x'.repeat(10)),true);
  assert.equal(validPassword('x'.repeat(128)),true);assert.equal(validPassword(null),false);
});
test('auth mutations reject foreign origins, malformed JSON, null and oversized requests',async()=>{
  const f=fixture();
  assert.equal((await handleAuth(request(credentials(),'https://evil.test'),async()=>f.client)).status,403);
  for(const body of ['{bad','null','x'.repeat(4097),JSON.stringify({action:'oauth'})]) assert.equal((await handleAuth(request(body),async()=>f.client)).status,400);
  assert.equal(f.calls.length,0);
});
test('local origin checks support loopback spelling without trusting arbitrary Host headers',async()=>{
  const local = new Request('http://localhost:3217/api/supabase-auth',{method:'POST',headers:{host:'127.0.0.1:3217',origin:'http://127.0.0.1:3217'},body:JSON.stringify({action:'signout'})});
  const f=fixture();
  assert.equal((await handleAuth(local,async()=>f.client)).status,200);
  assert.equal(requestOrigin(new Request('https://school.example/auth/confirm',{headers:{host:'evil.example'}})),'https://school.example');
  assert.equal(requestOrigin(new Request('http://localhost:3217/auth/confirm',{headers:{host:'evil.example'}})),'http://localhost:3217');
});
test('signup uses official SDK with name metadata and fixed confirmation URL',async()=>{
  const result=await run(credentials('signup'));
  assert.equal(result.body.message,'verification_requested');
  assert.equal(result.body.cooldown,60);
  assert.deepEqual(result.calls.map(call=>call[0]),['signUp'],'initial signup must never call resend');
  const args=result.calls[0][1];
  assert.equal(args.options.data.full_name,'Student');
  assert.equal(args.options.emailRedirectTo,'https://school.example/auth/confirm');
  assert.equal(result.response.headers.get('cache-control'),'private, no-store');
});
test('signup terminates unexpected automatic sessions and requires confirmation configuration',async()=>{
  const automatic=await run(credentials('signup'),{signUp:{data:{user:verified,session:{access_token:'never-return'}},error:null}});
  assert.deepEqual(automatic.calls[1],['signOut',{scope:'local'}]);
  assert.equal(automatic.response.status,503);
  assert.equal(automatic.body.error,'confirmation_required');
  assert.equal(JSON.stringify(automatic.body).includes('never-return'),false);
});

test('signup without a returned user cannot claim that verification was requested',async()=>{
  const result=await run(credentials('signup'),{signUp:{data:{user:null,session:null},error:null}});
  assert.equal(result.response.status,503);
  assert.deepEqual(result.body,{error:'unavailable'});
  assert.deepEqual(result.calls.map(call=>call[0]),['signUp']);
});

test('existing passwords can sign in without meeting the newer registration length policy',async()=>{
  const result=await run({...credentials(),password:'older123'});
  assert.equal(result.response.status,200);
  assert.equal(result.calls[0][1].password,'older123');
  const empty=await run({...credentials(),password:''});
  assert.equal(empty.response.status,400);
  assert.equal(empty.calls.length,0);
});
test('duplicate signup receives the same neutral verification response as a new signup',async()=>{
  const normal=await run(credentials('signup'));
  const duplicate=await run(credentials('signup'),{signUp:{data:{session:null},error:{code:'user_already_exists',status:422}}});
  assert.deepEqual(duplicate.body,normal.body);
  const obfuscated=await run(credentials('signup'),{signUp:{data:{session:null,user:{...verified,identities:[]}},error:null}});
  assert.deepEqual(obfuscated.body,normal.body);
});
test('signup email restrictions, provider failures and unexpected errors never claim success',async()=>{
  for(const error of [{code:'email_address_not_authorized',status:400},{code:'signup_disabled',status:422},{code:'unexpected_failure',status:500},{code:'weak_password',status:422}]) {
    const result=await run(credentials('signup'),{signUp:{data:{session:null,user:null},error:new AuthApiError('Synthetic provider failure',error.status,error.code)}});
    assert.equal(result.response.ok,false);
    assert.equal(result.body.message,undefined);
    assert.deepEqual(result.calls.map(call=>call[0]),['signUp']);
    assert.equal(JSON.stringify(result.body).includes(error.code),false);
  }
});
test('provider email rate limits never invent a retry duration or claim email success',async()=>{
  for(const action of ['signup','resend','recover']) {
    const method={signup:'signUp',resend:'resend',recover:'resetPasswordForEmail'}[action];
    const result=await run(credentials(action),{[method]:{data:{session:null},error:new AuthApiError('Synthetic provider rate limit',429,'over_email_send_rate_limit')}});
    assert.equal(result.response.status,429);assert.equal(result.response.headers.get('retry-after'),null);
    assert.equal(result.body.retryAfter,undefined);assert.equal(result.body.message,undefined);
    assert.deepEqual(result.calls.map(call=>call[0]),[method]);
  }
});
test('repeated email requests are blocked before another SDK call',async()=>{
  const body=credentials('signup');
  const first=await run(body);
  assert.equal(first.response.ok,true);
  const repeat=await run({...body,action:'resend'});
  assert.equal(repeat.response.status,429);
  assert.equal(repeat.calls.length,0);
  assert.equal(repeat.response.headers.get('retry-after'),'60');
});
test('verified login succeeds; unverified and incorrect credentials cannot grant account access',async()=>{
  assert.deepEqual((await run(credentials())).body,{ok:true,redirect:'/'});
  const unverified=await run(credentials(),{signInWithPassword:{data:{user:{id:'unverified'},session:{}},error:null}});
  assert.equal(unverified.response.status,403);assert.equal(unverified.body.error,'verify');
  assert.equal(unverified.calls[1][0],'signOut');
  const incorrect=await run(credentials(),{signInWithPassword:{data:{},error:{code:'invalid_credentials',status:400,message:'sensitive detail'}}});
  assert.deepEqual(incorrect.body,{error:'credentials'});
  const pending=await run(credentials(),{signInWithPassword:{data:{},error:{code:'email_not_confirmed',status:400}}});
  assert.equal(pending.body.error,'verify');
});
test('recovery and resend use official email methods and suppress account enumeration',async()=>{
  for (const action of ['resend','recover']) {
    const success=await run(credentials(action));
    const method=action==='resend'?'resend':'resetPasswordForEmail';
    const unknown=await run(credentials(action),{[method]:{error:{status:400,code:'user_not_found'}}});
    assert.deepEqual(success.body,unknown.body);
    assert.equal(success.calls[0][0],method);
    const options=success.calls[0];
    if(action==='recover') assert.equal(options[2].redirectTo,'https://school.example/auth/confirm?flow=recovery');
    else assert.equal(options[1].type,'signup');
  }
});
test('password update validates online identity and rejects unverified or expired users before mutation',async()=>{
  for (const user of [null,{id:'unverified'}]) {
    const result=await run(credentials('update'),{getUser:{data:{user},error:null}});
    assert.equal(result.response.status,401);assert.deepEqual(result.calls.map(x=>x[0]),['getUser']);
  }
  const success=await run(credentials('update'));
  assert.deepEqual(success.calls.map(x=>x[0]),['getUser','updateUser','signOut']);
  assert.equal(success.body.redirect,ACCOUNT_PATH+'&result=reset');
});
test('logout requests local session revocation without touching legacy identities or storage',async()=>{
  const result=await run({action:'signout'});
  assert.deepEqual(result.calls,[['signOut',{scope:'local'}]]);assert.equal(result.body.ok,true);
});
test('network/configuration failures return safe availability errors',async()=>{
  const response=await handleAuth(request(credentials()),async()=>{throw new Error('private credential');});
  assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'unavailable'});
  const f=fixture();f.client.auth.signUp=async()=>{throw new TypeError('Synthetic network failure')};
  const signup=await handleAuth(request(credentials('signup')),async()=>f.client);
  assert.equal(signup.status,503);assert.deepEqual(await signup.json(),{error:'unavailable'});
});
test('verified identity projection excludes metadata, tokens and unverified users',()=>{
  assert.equal(publicUser(null),null);assert.equal(publicUser({id:'forged'}),null);
  assert.deepEqual(publicUser({...verified,user_metadata:{admin:true}}),{id:verified.id,email:verified.email,verified:true});
});
test('email attempt limits persist across actions and expire after the window',async()=>{
  const time=Date.now()+1000000;
  for(let i=0;i<10;i++) assert.equal(await allowAttempt('fixture-address','fixture-rate@example.test',time),true);
  assert.equal(await allowAttempt('fixture-address','fixture-rate@example.test',time),false);
  assert.equal(await allowAttempt('fixture-address','fixture-rate@example.test',time+900001),true);
});

const mockServer='data:text/javascript,'+encodeURIComponent(`import {withSecurity} from ${JSON.stringify(new URL('./mfa-fixture.mjs',import.meta.url).href)};export async function createClient(){return withSecurity(globalThis.__callbackClient);}`);
const {GET:confirm}=await load('../app/auth/confirm/route.ts',{
  'next/server':import.meta.resolve('next/server.js'),
  '../../../lib/supabase/server':mockServer,
  '../../../lib/supabase/auth-policy':policy,
  '../../../lib/supabase/mfa-policy':mfaPolicyUrl,
});
test('confirmation uses verifyOtp and fixed redirects; external next parameters are ignored',async()=>{
  const calls=[];
  globalThis.__callbackClient={auth:{verifyOtp:async input=>{calls.push(input);return {error:null};},exchangeCodeForSession:async()=>({data:{redirectType:'recovery'},error:null}),getUser:async()=>({data:{user:verified},error:null})}};
  try {
    for(const type of ['signup','email','recovery']) {
      const response=await confirm(new Request(`https://school.example/auth/confirm?token_hash=fixture&type=${type}&next=https://evil.test`));
      assert.equal(response.headers.get('location'),'https://school.example'+callbackDestination(type));
      assert.equal(response.headers.get('referrer-policy'),'no-referrer');
      assert.deepEqual(calls.at(-1),{token_hash:'fixture',type});
    }
    assert.equal((await confirm(new Request('https://school.example/auth/confirm?code=pkce&flow=recovery'))).headers.get('location'),'https://school.example'+ACCOUNT_PATH+'&mode=update');
  } finally {delete globalThis.__callbackClient;}
});
test('PKCE callback forwards the SDK flow ID and uses validated recovery metadata',async()=>{
  const calls=[];
  globalThis.__callbackClient={auth:{exchangeCodeForSession:async(...args)=>{calls.push(args);return {data:{redirectType:null},error:null};},getUser:async()=>({data:{user:verified},error:null})}};
  try {
    const response=await confirm(new Request('https://school.example/auth/confirm?code=fixture&sb_flow_id=fixture_flow_123&flow=recovery&next=https://evil.test'));
    assert.deepEqual(calls,[['fixture',{flowId:'fixture_flow_123'}]]);
    assert.equal(response.headers.get('location'),'https://school.example'+ACCOUNT_PATH+'&result=verified','query flow cannot override SDK metadata');
    const invalid=await confirm(new Request('https://school.example/auth/confirm?code=fixture&sb_flow_id=bad'));
    assert.equal(invalid.headers.get('location'),'https://school.example'+ACCOUNT_PATH+'&result=invalid');
    assert.equal(calls.length,1);
  } finally {delete globalThis.__callbackClient;}
});
test('callback requires a verified online identity after successful code exchange',async()=>{
  for(const user of [null,{id:'unverified'}]) {
    globalThis.__callbackClient={auth:{exchangeCodeForSession:async()=>({data:{redirectType:null},error:null}),getUser:async()=>({data:{user},error:null})}};
    try {
      const response=await confirm(new Request('https://school.example/auth/confirm?code=fixture'));
      const destination=new URL(response.headers.get('location'));
      assert.equal(destination.origin,'https://school.example');assert.equal(destination.pathname,'/account');
      assert.equal(destination.searchParams.get('result'),'invalid');
    } finally {delete globalThis.__callbackClient;}
  }
});
test('real SSR SDK supports default-email PKCE signup, resend and recovery with persisted verifier cookies',async()=>{
  for(const flow of ['signup','resend','recovery']) {
    const jar=new Map([['cadence_email_session','legacy-fixture']]);
    const requests=[];
    const email='sdk-fixture@example.test';
    const sdkUser={...verified,email,aud:'authenticated',role:'authenticated',created_at:'2026-10-15T00:00:00Z',app_metadata:{provider:'email'},user_metadata:{}};
    const exp=Math.floor(Date.now()/1000)+3600;
    const jwt=[{alg:'HS256',typ:'JWT'},{sub:sdkUser.id,aud:'authenticated',aal:'aal1',exp,iat:exp-3600}].map(part=>Buffer.from(JSON.stringify(part)).toString('base64url')).join('.')+'.fixture';
    const transport=async(input,init)=>{
      const url=new URL(input);const body=init?.body?JSON.parse(init.body):null;
      requests.push({url,body});
      if(['/auth/v1/signup','/auth/v1/resend','/auth/v1/recover'].includes(url.pathname)) return Response.json(url.pathname.endsWith('signup')?{...sdkUser,email_confirmed_at:null}:{});
      if(url.pathname==='/auth/v1/token') return Response.json({access_token:jwt,refresh_token:'refresh-fixture',expires_in:3600,expires_at:exp,token_type:'bearer',user:sdkUser});
      if(url.pathname==='/auth/v1/user') return Response.json(sdkUser);
      throw Error('Unexpected mocked SDK request path');
    };
    const make=()=>createServerClient('https://sdk-project.example','sb_publishable_fixture',{
      global:{fetch:transport},cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:values=>values.forEach(({name,value,options})=>options.maxAge===0?jar.delete(name):jar.set(name,value))},
    });
    const sender=make(), callbackUrl='https://school.example/auth/confirm';
    try {
      const result=flow==='signup'
        ?await sender.auth.signUp({email,password:'fixture-password',options:{emailRedirectTo:callbackUrl}})
        :flow==='resend'?await sender.auth.resend({email,type:'signup',options:{emailRedirectTo:callbackUrl}})
        :await sender.auth.resetPasswordForEmail(email,{redirectTo:callbackUrl+'?flow=recovery'});
      assert.equal(result.error,null);
      assert.equal(requests.length,1,'one official request initiates the email; no compensating resend');
      const start=requests[0];
      const redirect=new URL(start.url.searchParams.get('redirect_to'));
      const flowId=redirect.searchParams.get('sb_flow_id');
      assert.equal(flowId,null,'installed SDK leaves flow IDs out of redirects unless explicitly enabled');
      assert.equal(start.body.code_challenge_method,'s256');
      assert.ok([...jar.keys()].some(key=>key.endsWith('-code-verifier')));
      const receiver=make();globalThis.__callbackClient=receiver;
      try {
        // The default ConfirmationURL is verified by Supabase first, then
        // redirects to the application with an authorization code.
        redirect.searchParams.set('code','authorization-code-fixture');
        const response=await confirm(new Request(redirect));
        assert.equal(response.headers.get('location'),'https://school.example'+callbackDestination(flow==='recovery'?'recovery':null));
        const exchange=requests.find(item=>item.url.pathname==='/auth/v1/token');
        assert.ok(exchange,'the callback must exchange a code using the official SDK');
        assert.equal(createHash('sha256').update(exchange.body.code_verifier).digest('base64url'),start.body.code_challenge);
        assert.ok(requests.some(item=>item.url.pathname==='/auth/v1/user'),'identity must be checked with the Auth server');
        assert.ok([...jar.keys()].some(key=>key.endsWith('-auth-token')),'session cookie must survive the callback');
        assert.equal(jar.get('cadence_email_session'),'legacy-fixture');
      } finally {receiver.auth.stopAutoRefresh();delete globalThis.__callbackClient;}
    } finally {sender.auth.stopAutoRefresh();}
  }
});
test('confirmation and recovery requests share a server cooldown without leaking account existence',async()=>{
  const email='cooldown-specific@example.test', now=Date.now()+2000000;
  assert.equal(await reserveEmailRequest(email,now),0);
  assert.equal(await reserveEmailRequest(email,now+500),60);
  assert.equal(await reserveEmailRequest(email,now+30000),30);
  assert.equal(await reserveEmailRequest(email,now+60001),0);
});
test('invalid, expired and unsupported verification links never redirect to a success destination',async()=>{
  globalThis.__callbackClient={auth:{verifyOtp:async()=>({error:{status:400,message:'private token'}}),exchangeCodeForSession:async()=>({error:{status:400}})}};
  try {
    for(const query of ['', '?token_hash=expired&type=recovery','?token_hash=fixture&type=invite','?code=expired','?error=access_denied']) {
      const response=await confirm(new Request('https://school.example/auth/confirm'+query));
      const destination=new URL(response.headers.get('location'));
      assert.equal(destination.origin,'https://school.example');assert.equal(destination.pathname,'/account');
      assert.equal(destination.searchParams.get('result'),'invalid');assert.equal(destination.searchParams.has('code'),false);
    }
  } finally {delete globalThis.__callbackClient;}
});

const mockSSR='data:text/javascript,'+encodeURIComponent('export function createServerClient(...args){return globalThis.__proxyFactory(...args);}');
const {proxy,config:proxyConfig}=await load('../proxy.ts',{
  '@supabase/ssr':mockSSR,
  'next/server':import.meta.resolve('next/server.js'),
  './lib/supabase/config':new URL('../lib/supabase/config.ts',import.meta.url).href,
});
test('scoped Proxy propagates refreshed Supabase cookies and cache headers without changing Neon cookies',async()=>{
  const {NextRequest}=await import('next/server.js');
  const originalUrl=process.env.NEXT_PUBLIC_SUPABASE_URL, originalKey=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://project.example';process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY='sb_publishable_fixture';
  globalThis.__proxyFactory=(_url,_key,options)=>({auth:{getUser:async()=>{
    assert.equal(options.cookies.getAll().find(x=>x.name==='cadence_email_session').value,'legacy-fixture');
    options.cookies.setAll([{name:'sb-fixture-auth-token',value:'refreshed-fixture',options:{path:'/',sameSite:'lax'}}],{'Cache-Control':'private, no-store','Pragma':'no-cache'});
    return {data:{user:verified},error:null};
  }}});
  try {
    const req=new NextRequest('https://school.example/account',{headers:{cookie:'cadence_email_session=legacy-fixture; sb-fixture-auth-token=old-fixture'}});
    const response=await proxy(req);
    assert.equal(req.cookies.get('cadence_email_session').value,'legacy-fixture');
    assert.equal(req.cookies.get('sb-fixture-auth-token').value,'refreshed-fixture');
    assert.equal(response.cookies.get('sb-fixture-auth-token').value,'refreshed-fixture');
    assert.equal(response.cookies.get('cadence_email_session'),undefined);
    assert.equal(response.headers.get('pragma'),'no-cache');
    assert.deepEqual(proxyConfig.matcher,['/account','/api/supabase-auth','/api/supabase-mfa','/auth/confirm']);
  } finally {
    delete globalThis.__proxyFactory;
    if(originalUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=originalUrl;
    if(originalKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;else process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=originalKey;
  }
});

test('confirmation failures classify expired links, missing PKCE state and network errors without exposing tokens',async()=>{
  for(const [error,reason] of [[{code:'otp_expired',status:403},'expired'],[{code:'pkce_code_verifier_not_found',status:400},'state'],[{code:'flow_state_expired',status:400},'state'],[{status:503},'unavailable'],[{code:'bad_code_verifier',status:400},'state'],[{status:400},'invalid']]) {
    globalThis.__callbackClient={auth:{exchangeCodeForSession:async()=>({error:{...error,message:'secret-auth-code'}})}};
    try {
      const response=await confirm(new Request('https://school.example/auth/confirm?code=secret-auth-code&next=https://evil.test'));
      assert.equal(response.headers.get('location'),'https://school.example'+ACCOUNT_PATH+'&result=invalid&reason='+reason);
      assert.equal(response.headers.get('cache-control'),'private, no-store');
      assert.equal(response.headers.get('location').includes('secret-auth-code'),false);
    }finally{delete globalThis.__callbackClient;}
  }
  globalThis.__callbackClient={auth:{exchangeCodeForSession:async()=>{throw Error('private transport details');}}};
  try {
    const response=await confirm(new Request('https://school.example/auth/confirm?code=fixture'));
    assert.equal(new URL(response.headers.get('location')).searchParams.get('reason'),'unavailable');
  }finally{delete globalThis.__callbackClient;}
});

test('local signup keeps the actual hostname and port; confirmation returns to that same origin',async()=>{
  const body={...credentials('signup'),email:'local-port-fixture@example.test'};
  const f=fixture();
  const request=new Request('http://localhost:3001/api/supabase-auth',{method:'POST',headers:{host:'127.0.0.1:3001',origin:'http://127.0.0.1:3001'},body:JSON.stringify(body)});
  const response=await handleAuth(request,async()=>f.client);
  assert.equal(response.status,200);
  assert.equal(f.calls[0][1].options.emailRedirectTo,'http://127.0.0.1:3001/auth/confirm');
  globalThis.__callbackClient={auth:{exchangeCodeForSession:async()=>({data:{redirectType:null},error:null}),getUser:async()=>({data:{user:verified},error:null})}};
  try {
    const callback=await confirm(new Request('http://localhost:3001/auth/confirm?code=fixture',{headers:{host:'127.0.0.1:3001'}}));
    assert.equal(callback.headers.get('location'),'http://127.0.0.1:3001'+ACCOUNT_PATH+'&result=verified');
  }finally{delete globalThis.__callbackClient;}
});
