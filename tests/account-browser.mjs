// Isolated local browser QA. All authentication is mocked; no accounts or emails.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {PLACEMENT_QUESTIONS,scorePlacement} from '../components/cadence/placement.js';
const origin='http://127.0.0.1:3217';
const target=await(await fetch('http://127.0.0.1:9337/json/new?about:blank',{method:'PUT'})).json();
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let sequence=0;const pending=new Map();
socket.onmessage=event=>{const message=JSON.parse(event.data);if(!message.id)return;const task=pending.get(message.id);pending.delete(message.id);message.error?task.reject(new Error(JSON.stringify(message.error))):task.resolve(message.result);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error(JSON.stringify(result.exceptionDetails));return result.result.value;}
async function wait(expression){for(let attempt=0;attempt<150;attempt++){if(await evaluate(`Boolean(${expression})`))return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Timed out: '+expression);}
const click=text=>evaluate(`(()=>{const button=[...document.querySelectorAll('button')].find(button=>button.getClientRects().length && button.textContent.trim()===${JSON.stringify(text)});if(!button)throw Error('Missing button');button.click();})()`);
const navigate=async suffix=>{await send('Page.navigate',{url:origin+suffix});await wait('window.qa && document.querySelector("h1")');};
const accountText='document.querySelector(".ec-account")?.innerText';
const reports=[],screenshots=[];
const fixture={fullName:'Registered Student',email:'student@example.test',verified:true,confirmedAt:'2026-10-18T09:00:00Z',createdAt:'2026-10-17T09:00:00Z',lastSignInAt:'2026-10-18T10:00:00Z',providers:['email'],twoFactor:'not_enrolled'};
const profile={name:'Guest Learner',email:'phase22-guest@guest.invalid',assessment:scorePlacement(PLACEMENT_QUESTIONS.map(q=>({id:q.id,answer:'__unknown__'}))),onboardingComplete:true,placementComplete:true,englishLevel:'A1',priorities:[],learningGoals:[],interests:[]};
async function screenshot(name){if(!process.env.QA_ARTIFACT_DIR)return;await mkdir(process.env.QA_ARTIFACT_DIR,{recursive:true});const result=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});const file=path.join(process.env.QA_ARTIFACT_DIR,name+'.png');await writeFile(file,Buffer.from(result.data,'base64'));screenshots.push(file);}
try {
  await send('Page.enable');await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    localStorage.setItem('cadence:guest-id','phase22-guest');
    localStorage.setItem('cadence:ui-language',sessionStorage.getItem('qa-language') || 'en');
    if(!localStorage.getItem('cadence:guest-data:profile:phase22-guest@guest.invalid'))localStorage.setItem('cadence:guest-data:profile:phase22-guest@guest.invalid',JSON.stringify(${JSON.stringify(profile)}));
    localStorage.setItem('cadence:guest-data:qa-preservation','preserved-progress');
    window.qa={account:JSON.parse(sessionStorage.getItem('qa-account') || ${JSON.stringify(JSON.stringify(fixture))}),read:sessionStorage.getItem('qa-read')||'normal',calls:[],realAuth:0};
    const nativeFetch=window.fetch.bind(window);
    window.fetch=async(url,options={})=>{
      if(String(url)==='/api/supabase-mfa'){
        const account=window.qa.account;
        if(!account || !account.verified)return Response.json({error:'expired'},{status:401});
        if(account.twoFactor==='unknown')return Response.json({error:'unavailable'},{status:503});
        return Response.json({currentLevel:account.twoFactor==='enrolled'?'aal2':'aal1',nextLevel:account.twoFactor==='enrolled'?'aal2':'aal1',required:false,expiresAt:Date.now()+3600000,factorCount:account.twoFactor==='enrolled'?1:0,factors:account.twoFactor==='enrolled'?[{id:'own-fixture',name:'My authenticator',type:'totp',status:'verified',createdAt:'2026-10-18T10:00:00Z'}]:[]});
      }
      if(String(url)!=='/api/supabase-auth'){
        if(String(url).includes('/auth/v1')){window.qa.realAuth++;throw Error('Real auth forbidden');}
        return nativeFetch(url,options);
      }
      if(!options.method){
        const snapshot=structuredClone(window.qa.account);
        if(window.qa.read==='error')return Response.json({error:'unavailable'},{status:503});
        if(window.qa.read==='delayed')await new Promise(resolve=>window.qa.release=resolve);
        return Response.json({user:snapshot?.verified?{id:'fixture',email:snapshot.email,verified:true}:null,account:snapshot});
      }
      const body=JSON.parse(options.body);window.qa.calls.push(body.action);
      if(body.action==='signout'){window.qa.account=null;sessionStorage.setItem('qa-account','null');}
      return Response.json({ok:true});
    };
  `});
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await navigate('/');await wait("[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Settings')");await click('Settings');
  await wait(`${accountText}?.includes('Registered Student')`);
  const originalProfile=await evaluate("localStorage.getItem('cadence:guest-data:profile:phase22-guest@guest.invalid')");
  assert.equal(await evaluate(`${accountText}.includes('student@example.test')`),true);
  assert.equal(await evaluate(`${accountText}.includes('Email and Password')`),true);
  assert.equal(await evaluate(`${accountText}.includes('Google')`),false);
  assert.equal(await evaluate("document.querySelector('.ec-account-verified').textContent"),'Verified');
  assert.equal(await evaluate(`${accountText}.includes(new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date('2026-10-17T09:00:00Z')))`),true);
  assert.equal(await evaluate(`${accountText}.includes(new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date('2026-10-18T10:00:00Z')))`),true);
  reports.push('Settings → My Account displays registered name, email, verified status, dates and actual providers');
  assert.equal(await evaluate("document.querySelector('.ec-account a[href*=update]').getAttribute('href')"),'/account?provider=supabase&mode=update');
  await screenshot('account-settings-desktop-en');
  await evaluate("window.qa.account.providers=['email','google'];window.qa.account.twoFactor='enrolled';window.dispatchEvent(new Event('focus'))");
  await wait(`${accountText}?.includes('Google')`);await wait(`${accountText}?.includes('Enabled')`);
  await evaluate("window.qa.account.twoFactor='unknown';window.dispatchEvent(new Event('focus'))");
  await wait(`${accountText}?.includes('Status Unavailable')`);
  reports.push('Linked-provider, enrolled-factor and unavailable-factor states remain truthful');
  await evaluate("window.qa.account.verified=false;window.qa.account.confirmedAt=null;sessionStorage.setItem('qa-account',JSON.stringify(window.qa.account));window.dispatchEvent(new Event('focus'))");
  await wait("location.pathname==='/account' && document.querySelector('form input[name=email]')");
  assert.equal(await evaluate("document.body.innerText.includes('student@example.test')"),false);
  reports.push('Unverified entry returns existing resend flow without exposing prior private details');
  await evaluate(`sessionStorage.setItem('qa-account',${JSON.stringify(JSON.stringify(fixture))})`);
  await navigate('/');await wait(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Settings')`);await click('Settings');await wait(`${accountText}?.includes('Registered Student')`);
  await evaluate("window.qa.read='error';sessionStorage.setItem('qa-read','error');window.dispatchEvent(new Event('focus'))");
  await wait("location.pathname==='/account' && document.querySelector('.ec-entry-account-frame [role=alert]')");
  assert.equal(await evaluate("document.body.innerText.includes('student@example.test')"),false);
  await evaluate("sessionStorage.setItem('qa-read','normal')");
  await navigate('/');await wait(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()==='Settings')`);await click('Settings');await wait(`${accountText}?.includes('Registered Student')`);
  reports.push('Failed root refresh removes account details and supplies retry; a fresh check restores valid settings');
  await evaluate("window.qa.read='delayed';window.dispatchEvent(new Event('focus'))");
  await wait('window.qa.release');assert.equal(await evaluate("document.querySelector('[data-entry-state=account]').hidden"),true);
  await evaluate("window.qa.account.fullName='Second Student';window.qa.account.email='second@example.test';window.qa.read='normal';window.dispatchEvent(new Event('focus'))");
  await wait(`${accountText}?.includes('Second Student')`);
  await evaluate('window.qa.release()');
  assert.equal(await evaluate(`${accountText}.includes('Registered Student')`),false);
  reports.push('Loading and account switching discard stale in-flight responses');
  await click('Sign Out');await wait("location.pathname==='/account' && document.querySelector('input[name=email]')");
  assert.equal(await evaluate("document.body.innerText.includes('Second Student')"),false);
  assert.equal(await evaluate("[...document.querySelectorAll('button')].some(b=>b.textContent==='Create Account')"),true);
  assert.equal(await evaluate("localStorage.getItem('cadence:guest-data:profile:phase22-guest@guest.invalid')"),originalProfile);
  assert.equal(await evaluate("localStorage.getItem('cadence:guest-data:qa-preservation')"),'preserved-progress');
  assert.equal(await evaluate("localStorage.getItem('cadence:guest-id')"),'phase22-guest');
  reports.push('Logout returns existing sign-in entrance; placement/progress storage is preserved');
  for(const language of ['en','ku']){
    await evaluate(`sessionStorage.setItem('qa-language',${JSON.stringify(language)});sessionStorage.setItem('qa-account',${JSON.stringify(JSON.stringify(fixture))})`);
    await navigate('/account?provider=supabase');await wait("document.querySelector('.ec-account dd')");
    assert.equal(await evaluate("document.querySelector('.ec-account').dir"),language==='ku'?'rtl':'ltr');
    if(language==='ku')assert.equal(await evaluate("/[٠-٩]/.test(document.querySelector('.ec-account').innerText)"),true);
    for(const width of [320,375,390,768,1440]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
      const layout=await evaluate("({overflow:document.documentElement.scrollWidth>innerWidth,controls:[...document.querySelectorAll('.ec-account a,.ec-account button')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.height>=44})})");
      assert.deepEqual(layout,{overflow:false,controls:true},`${language} ${width}px`);
      if(language==='ku' && width===375)await screenshot('account-mobile-ku');
    }
  }
  reports.push('10 responsive account layouts across five widths and English/Kurdish RTL');
  for(const language of ['en','ku']){
    await evaluate(`sessionStorage.setItem('qa-language',${JSON.stringify(language)})`);
    await send('Emulation.setDeviceMetricsOverride',{width:375,height:1000,deviceScaleFactor:1,mobile:true});
    await navigate('/');await wait(`[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(language==='en'?'More':'زیاتر')})`);
    await click(language==='en'?'More':'زیاتر');await click(language==='en'?'Settings':'ڕێکخستنەکان');
    await wait("document.querySelector('.ec-account dd')");
    for(const width of [320,375,390,768,1440]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:width<768});
      assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'),true,`${language} Settings ${width}px`);
    }
  }
  reports.push('Mobile More → Settings navigation and 10 embedded account layouts in both languages');
  await evaluate("sessionStorage.setItem('qa-language','en')");
  await navigate('/account?provider=supabase');await wait("document.querySelector('.ec-account dd')");
  await click('Change Password');await wait("document.querySelector('h1')?.textContent==='Choose a new password'");
  assert.equal(await evaluate("document.querySelector('input[name=password]').autocomplete"),'new-password');
  reports.push('Account security action opens the existing password-change form');
  await navigate('/account?provider=supabase&result=verified');await wait("document.querySelector('h1')?.textContent==='Email Verified Successfully!'");
  assert.equal(await evaluate("document.querySelector('a.ec-auth-primary').getAttribute('href')"),'/');
  await evaluate("sessionStorage.setItem('qa-account','null')");
  await navigate('/account?provider=supabase&result=verified');await wait("document.querySelector('h1')?.textContent==='Sign in to continue'");
  assert.equal(await evaluate("document.body.innerText.includes('Email Verified Successfully!')"),false);
  for(const [reason,text] of [['expired','expired or was already used'],['state','missing the sign-up state'],['unavailable','couldn’t complete']]){
    await navigate('/account?provider=supabase&result=invalid&reason='+reason);
    await wait("document.querySelector('h1')?.textContent==='Email Verification Failed'");
    assert.equal(await evaluate(`document.body.innerText.includes(${JSON.stringify(text)})`),true);
  }
  reports.push('Confirmation success requires a verified session; no-session, expired, PKCE and network failures guide sign-in');
  assert.equal(await evaluate('window.qa.realAuth'),0);
  console.log(JSON.stringify({passed:reports.length,checks:reports,realAuthRequests:0,screenshots},null,2));
} finally {await send('Page.close').catch(()=>{});socket.close();}
