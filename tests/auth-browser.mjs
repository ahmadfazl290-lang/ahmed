// Browser QA: local production server on 3217, isolated Chrome CDP on 9337.
// Supabase requests are mocked; no real accounts, sessions or email deliveries.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
const origin='http://127.0.0.1:3217';
const target=await(await fetch('http://127.0.0.1:9337/json/new?about:blank',{method:'PUT'})).json();
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let sequence=0;const pending=new Map();
socket.onmessage=event=>{const message=JSON.parse(event.data);if(!message.id)return;const task=pending.get(message.id);pending.delete(message.id);message.error?task.reject(new Error(JSON.stringify(message.error))):task.resolve(message.result);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
async function wait(expression){for(let attempt=0;attempt<150;attempt++){if(await evaluate(`Boolean(${expression})`))return;await new Promise(resolve=>setTimeout(resolve,100));}throw new Error('Timed out: '+expression);}
const click=text=>evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(button=>button.textContent===${JSON.stringify(text)});if(!button)throw Error('Missing button: '+${JSON.stringify(text)});button.click();})()`);
const fill=values=>evaluate(`(()=>{const values=${JSON.stringify(values)};const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;document.querySelectorAll('input').forEach((input,index)=>{setter.call(input,values[index]);input.dispatchEvent(new Event('input',{bubbles:true}));});})()`);
const submit=()=>evaluate("document.querySelector('form').requestSubmit()");
const navigate=async query=>{await send('Page.navigate',{url:origin+'/account?provider=supabase'+query});await wait("document.querySelector('h1') && !document.querySelector('[aria-busy=true]')");};
const reports=[],screenshots=[];
async function screenshot(name){if(!process.env.QA_ARTIFACT_DIR)return;await mkdir(process.env.QA_ARTIFACT_DIR,{recursive:true});const result=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});const file=path.join(process.env.QA_ARTIFACT_DIR,name+'.png');await writeFile(file,Buffer.from(result.data,'base64'));screenshots.push(file);}
try {
 await send('Page.enable');await send('Runtime.enable');
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`
  localStorage.setItem('cadence:ui-language',sessionStorage.getItem('qa-language') || 'en');
  localStorage.setItem('cadence:guest-id','guest-qa-fixture');
  localStorage.setItem('cadence:guest-data:qa-preservation','preserved-fixture');
  window.qa={calls:[],user:JSON.parse(sessionStorage.getItem('qa-user') || 'null'),result:'success',unmocked:0};
  const nativeNow=Date.now;window.qaOffset=0;Date.now=()=>nativeNow()+window.qaOffset;
  const realFetch=window.fetch.bind(window);
  window.fetch=async(url,options={})=>{
   if(String(url)==='/api/supabase-mfa')return window.qa.user?Response.json({currentLevel:'aal1',nextLevel:'aal1',required:false,factors:[],factorCount:0,expiresAt:Date.now()+3600000}):Response.json({error:'expired'},{status:401});
   if(String(url)!=='/api/supabase-auth'){
    if(String(url).includes('/auth/v1')){window.qa.unmocked++;throw Error('Real auth forbidden in QA');}
    return realFetch(url,options);
   }
   if(!options.method)return Response.json({user:window.qa.user,account:window.qa.user?{fullName:'QA Student',email:window.qa.user.email,verified:true,confirmedAt:'2026-10-18T09:00:00Z',createdAt:'2026-10-17T09:00:00Z',lastSignInAt:'2026-10-18T10:00:00Z',providers:['email'],twoFactor:'not_enrolled'}:null});
   const body=JSON.parse(options.body);window.qa.calls.push(body.action);
   await new Promise(resolve=>setTimeout(resolve,150));
   if(window.qa.result==='network')throw Error('fixture failure');
   if(window.qa.result==='delivery')return Response.json({error:'delivery'},{status:503});
   if(window.qa.result==='rateUnknown')return Response.json({error:'rate'},{status:429});
   if(window.qa.result==='rate')return Response.json({error:'rate',retryAfter:60},{status:429});
   if(window.qa.result==='credentials')return Response.json({error:'credentials'},{status:401});
   if(window.qa.result==='verify')return Response.json({error:'verify'},{status:403});
   if(body.action==='signin'){window.qa.user={id:'fixture-user',email:'student@example.test',verified:true};sessionStorage.setItem('qa-user',JSON.stringify(window.qa.user));return Response.json({ok:true,redirect:'/'});}
   if(body.action==='signout' || body.action==='update'){
    if(body.action==='update' && window.qa.result==='expired')return Response.json({error:'expired'},{status:401});
    window.qa.user=null;sessionStorage.removeItem('qa-user');return Response.json({ok:true});
   }
   return Response.json({message:body.action==='recover'?'recovery_requested':'verification_requested',cooldown:60});
  };`});
 await navigate('');
 assert.equal(await evaluate("document.body.innerText.includes('Resend Verification Email')"),false);
 assert.equal(await evaluate("document.body.innerText.includes('Google')"),false);
 await submit();await wait("document.querySelector('input[aria-invalid=true]')");
 assert.equal(await evaluate("document.activeElement.name"),'email');
 await fill(['invalid-email','short']);await submit();
 assert.equal(await evaluate('window.qa.calls.length'),0);reports.push('Sign-in content, inline validation and focus; no premature resend or OAuth');
 await click('Create Account');
 await fill(['','student@example.test','short','different']);await submit();
 assert.equal(await evaluate("document.querySelectorAll('[role=alert]').length"),3);
 await fill(['QA Student','student@example.test','long-password','different-password']);await submit();
 await wait("document.querySelector('[role=alert]')?.textContent.includes('Passwords must match')");
 await evaluate("document.querySelector('button[aria-label=\"Show password\"]').click()");
 assert.equal(await evaluate("document.querySelector('input[name=password]').type"),'text');
 assert.equal(await evaluate("document.querySelector('button[aria-label=\"Hide password\"]').getAttribute('aria-pressed')"),'true');
 await evaluate("document.querySelector('button[aria-label=\"Show confirm password\"]').click()");
 assert.equal(await evaluate("document.querySelector('input[name=confirm]').type"),'text');
 reports.push('Full name, password length, matching and accessible visibility toggles');
 await fill(['QA Student','student@example.test','long-password','long-password']);
 await evaluate("window.qa.result='delivery'");await submit();
 await wait("document.querySelector('[role=alert]')?.textContent.includes('couldn’t request the email')");
 assert.equal(await evaluate("document.querySelector('h1').textContent"),'Create your English-Co account');
 assert.equal(await evaluate("document.querySelectorAll('input').length"),4);reports.push('Registration delivery failure never shows verification success');
 await evaluate("window.qa.result='rateUnknown'");await submit();
 await wait("document.querySelector('[role=alert]')?.textContent.includes('Please wait')");
 assert.equal(await evaluate("document.querySelector('h1').textContent"),'Create your English-Co account');
 assert.equal(await evaluate("document.querySelector('button[type=submit]').disabled"),false);
 assert.equal(await evaluate("document.body.innerText.includes('60s') || document.body.innerText.includes('Resend in')"),false);
 reports.push('Unknown provider retry duration shows a neutral rate error without a fabricated countdown');
 await evaluate("window.qa.calls=[];window.qa.result='success'");
 await evaluate("document.querySelector('form').requestSubmit();document.querySelector('form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}));");
 assert.equal(await evaluate("document.querySelector('button[type=submit]').disabled"),true);
 await wait("document.querySelector('h1')?.textContent==='Check your email'");
 assert.equal(await evaluate("document.querySelector('.ec-auth-email').textContent"),'student@example.test');
 assert.deepEqual(await evaluate('window.qa.calls'),['signup']);
 assert.equal(await evaluate("document.querySelectorAll('input[type=password]').length"),0);
 assert.equal(await evaluate("[...document.querySelectorAll('button')].find(button=>button.textContent.startsWith('Resend in')).disabled"),true);
 reports.push('One automatic signup request, dedicated email screen and disabled resend cooldown');
 await screenshot('verification-en');
 await evaluate("window.qaOffset+=61000;window.qa.result='rate'");
 await wait("[...document.querySelectorAll('button')].some(button=>button.textContent==='Resend Verification Email' && !button.disabled)");
 await click('Resend Verification Email');await wait("document.querySelector('[role=alert]')?.textContent.includes('Please wait')");
 assert.deepEqual(await evaluate('window.qa.calls'),['signup','resend']);
 assert.equal(await evaluate("document.querySelector('[role=status]')!==null"),false);
 await evaluate("window.qaOffset+=61000;window.qa.result='success'");
 await wait("[...document.querySelectorAll('button')].some(button=>button.textContent==='Resend Verification Email' && !button.disabled)");
 await click('Resend Verification Email');await wait("document.querySelector('[role=status]')?.textContent.includes('request is complete')");
 reports.push('Secondary resend respects cooldown and provider rate errors');
 await click('Back to Sign In');
 assert.equal(await evaluate("document.querySelector('input[name=email]').value"),'student@example.test');
 await fill(['student@example.test','long-password']);await evaluate("window.qa.result='credentials'");await submit();
 await wait("document.querySelector('[role=alert]')?.textContent.includes('email or password is incorrect')");
 await evaluate("window.qa.result='network'");await submit();await wait("document.querySelector('[role=alert]')?.textContent.includes('couldn’t complete')");
 await evaluate("window.qa.result='verify'");await submit();await wait("document.querySelector('[role=alert]')?.textContent.includes('verify your email')");
 await click('Request a new verification link');
 assert.equal(await evaluate("document.querySelector('h1').textContent"),'Verify your email');
 await click('Back to Sign In');await fill(['student@example.test','long-password']);
 await evaluate("window.qa.result='success'");await submit();
 await wait("location.pathname==='/' && window.CADENCE_SESSION?.mode==='guest'");
 await navigate('');await wait("document.querySelector('h1')?.textContent==='You’re signed in'");
 await evaluate("window.qa.user=null;sessionStorage.removeItem('qa-user');window.dispatchEvent(new Event('focus'))");
 await wait("document.querySelector('h1')?.textContent==='Welcome back'");
 reports.push('Invalid login, network errors, contextual verification and expired-session navigation');
 await fill(['student@example.test','long-password']);await submit();await wait("location.pathname==='/'");await navigate('');
 await wait("[...document.querySelectorAll('button')].some(button=>button.textContent==='Sign Out')");
 await click('Sign Out');await wait("document.querySelector('[role=status]')?.textContent.includes('signed out safely')");
 assert.equal(await evaluate("localStorage.getItem('cadence:guest-data:qa-preservation')"),'preserved-fixture');
 assert.equal(await evaluate("localStorage.getItem('cadence:guest-id')"),'guest-qa-fixture');
 assert.equal(await evaluate("localStorage.getItem('cadence:ui-language')"),'en');
 reports.push('Successful mocked login redirect and logout preserve guest progress and language');
 await click('Forgot password?');await fill(['student@example.test']);await submit();
 await wait("document.querySelector('h1')?.textContent==='Check your inbox'");
 assert.equal(await evaluate("document.body.innerText.includes('If this address can receive')"),true);
 await click('Back to Sign In');
 await navigate('&mode=update');await fill(['new-long-password','new-long-password']);await evaluate("window.qa.result='expired'");await submit();
 await wait("document.querySelector('[role=alert]')?.textContent.includes('session has expired')");
 await evaluate("window.qa.result='success'");await submit();
 await wait("document.querySelector('[role=status]')?.textContent.includes('password has been updated')");
 reports.push('Recovery, expired reset and successful password-update confirmation');
 await navigate('&result=invalid');await wait("document.querySelector('[role=alert]')?.textContent.includes('already used')");
 await navigate('#error=access_denied&error_code=otp_expired');await wait("document.querySelector('[role=alert]')?.textContent.includes('already used')");
 await wait("location.hash===''");reports.push('Expired and used links show recovery guidance and clear URL fragments');
 for(const language of ['en','ku']) {
  await evaluate(`sessionStorage.setItem('qa-language',${JSON.stringify(language)})`);
  for(const mode of ['signin','signup','recover','update','resend']) {
   await navigate('&mode='+mode);
   assert.equal(await evaluate('document.documentElement.dir'),language==='ku'?'rtl':'ltr');
   assert.equal(await evaluate("[...document.querySelectorAll('input')].every(input=>input.labels.length>0)"),true);
   assert.equal(await evaluate("[...document.querySelectorAll('input[name=email], input[type=password]')].every(input=>input.dir==='ltr')"),true);
   for(const width of [320,375,390,768,1440]) {
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
    const bounds=await evaluate(`({overflow:document.documentElement.scrollWidth>innerWidth,controls:[...document.querySelectorAll('input,button')].every(element=>{const r=element.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.height>=40;})})`);
    assert.deepEqual(bounds,{overflow:false,controls:true},`${language} ${mode} ${width}px`);
    if(mode==='signup')assert.equal(await evaluate("document.querySelector('h1 bdi').getClientRects().length"),1,'brand must remain an isolated, unbroken unit in both languages');
    if(language==='en' && mode==='signin' && width===1440)await screenshot('signin-desktop-en');
    if(language==='ku' && mode==='signup' && width===375)await screenshot('signup-mobile-ku');
    if(language==='ku' && mode==='signin' && width===320)await screenshot('signin-320-ku');
   }
  }
 }
 reports.push('50 responsive layouts: five auth views × five widths × English/Kurdish RTL');
 await evaluate("sessionStorage.setItem('qa-language','en')");await navigate('');
 await evaluate("document.querySelector('input[name=email]').focus()");
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 assert.equal(await evaluate("document.activeElement.tagName"),'BUTTON');
 assert.equal(await evaluate("getComputedStyle(document.activeElement).outlineStyle==='solid'"),true);
 await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 assert.equal(await evaluate("(()=>{const element=document.createElement('span');element.className='ec-auth-spinner';document.querySelector('main').append(element);const value=getComputedStyle(element).animationName;element.remove();return value;})()"),'none');
 reports.push('Keyboard focus and reduced-motion preferences');
 assert.equal(await evaluate('window.qa.unmocked'),0);
 console.log(JSON.stringify({passed:reports.length,checks:reports,realAuthRequests:0,screenshots},null,2));
} finally {await send('Page.close').catch(()=>{});socket.close();}
