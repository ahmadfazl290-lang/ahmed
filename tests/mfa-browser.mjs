// Local production server :3217, isolated Chrome :9337. Auth is fully mocked.
// No screenshots are permitted while enrollment material is present.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {mfaCopy} from '../components/mfa-copy.ts';
const origin='http://127.0.0.1:3217';
const target=await(await fetch('http://127.0.0.1:9337/json/new?about:blank',{method:'PUT'})).json();
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let sequence=0;const pending=new Map();
socket.onmessage=event=>{const message=JSON.parse(event.data);if(!message.id)return;const task=pending.get(message.id);pending.delete(message.id);message.error?task.reject(Error(JSON.stringify(message.error))):task.resolve(message.result);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});socket.send(JSON.stringify({id,method,params}));});
async function evaluate(expression){const result=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(result.exceptionDetails)throw Error('Browser evaluation failed');return result.result.value;}
async function wait(expression){for(let attempt=0;attempt<150;attempt++){if(await evaluate(`Boolean(${expression})`))return;await new Promise(resolve=>setTimeout(resolve,100));}throw Error('Browser state did not settle');}
const click=async text=>{
  await wait(`[...document.querySelectorAll('button')].some(b=>!b.disabled && b.getClientRects().length && b.textContent.trim()===${JSON.stringify(text)})`);
  return evaluate(`(()=>{const b=[...document.querySelectorAll('button')].find(b=>!b.disabled && b.getClientRects().length && b.textContent.trim()===${JSON.stringify(text)});if(!b)throw Error('Control missing');b.click();})()`);
};
const fill=(selector,value)=>evaluate(`(()=>{const input=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)});input.dispatchEvent(new Event('input',{bubbles:true}));})()`);
const submit=()=>evaluate("document.querySelector('.ec-mfa form').requestSubmit()");
const navigate=async query=>{await send('Page.navigate',{url:origin+'/account?provider=supabase'+query});await wait("document.querySelector('h1') && !document.querySelector('[aria-busy=true]')");};
const panel='document.querySelector(".ec-mfa")?.innerText';
const reports=[],screenshots=[];
let layouts=0;
async function fit(){
  for(const width of [320,375,390,768,1440]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
    assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth && [...document.querySelectorAll('.ec-mfa button,.ec-mfa input,.ec-mfa select')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.height>=44})"),true);
    layouts++;
  }
}
async function screenshot(name){assert.equal(await evaluate("!!document.querySelector('.ec-mfa-qr,.ec-mfa-secret')"),false,'Enrollment material must never be captured');if(!process.env.QA_ARTIFACT_DIR)return;await mkdir(process.env.QA_ARTIFACT_DIR,{recursive:true});const result=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});const file=path.join(process.env.QA_ARTIFACT_DIR,name+'.png');await writeFile(file,Buffer.from(result.data,'base64'));screenshots.push(file);}
try{
  await send('Page.enable');await send('Runtime.enable');
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
    localStorage.setItem('cadence:ui-language',sessionStorage.getItem('qa-mfa-language') || 'en');
    localStorage.setItem('cadence:guest-data:mfa-preserve','preserved-progress');
    window.qa=Object.assign({aal:'aal1',factors:[],expiresAt:Date.now()+900000},JSON.parse(sessionStorage.getItem('qa-mfa') || '{}'));
    window.qa.calls=[];window.qa.result='success';window.qa.realAuth=0;window.qa.hidden=false;
    Object.defineProperty(document,'hidden',{configurable:true,get:()=>window.qa.hidden});
    window.qa.persist=()=>sessionStorage.setItem('qa-mfa',JSON.stringify({aal:window.qa.aal,factors:window.qa.factors,expiresAt:window.qa.expiresAt,signedOut:window.qa.signedOut}));
    window.qa.snapshot=()=>({currentLevel:window.qa.aal,nextLevel:window.qa.factors.some(f=>f.status==='verified')?'aal2':'aal1',required:window.qa.aal!=='aal2' && window.qa.factors.some(f=>f.status==='verified'),factors:structuredClone(window.qa.factors),expiresAt:window.qa.expiresAt,factorCount:window.qa.factors.length});
    const nativeNow=Date.now;window.qaOffset=0;Date.now=()=>nativeNow()+window.qaOffset;
    const nativeFetch=window.fetch.bind(window);
    window.fetch=async(url,options={})=>{
      const mfa=String(url)==='/api/supabase-mfa',auth=String(url)==='/api/supabase-auth';
      if(!mfa && !auth){if(String(url).includes('/auth/v1')){window.qa.realAuth++;throw Error('Real Auth forbidden');}return nativeFetch(url,options);}
      const status=window.qa.snapshot();
      if(!options.method){
        if(window.qa.signedOut || window.qa.expiresAt<Date.now())return mfa?Response.json({error:'expired'},{status:401}):Response.json({user:null,account:null});
        if(mfa)return window.qa.result==='network'?Response.json({error:'unavailable'},{status:503}):Response.json(status);
        if(status.required)return Response.json({error:'mfa_required',mfaRequired:true},{status:403});
        return Response.json({user:{id:'own-user',email:'own@example.test',verified:true},account:{fullName:'Own Student',email:'own@example.test',verified:true,confirmedAt:'2026-10-18T10:00:00Z',createdAt:'2026-10-17T10:00:00Z',lastSignInAt:'2026-10-18T11:00:00Z',providers:['email'],twoFactor:status.nextLevel==='aal2'?'enrolled':'not_enrolled'}});
      }
      const body=JSON.parse(options.body);window.qa.calls.push(body.action);
      await new Promise(resolve=>setTimeout(resolve,100));
      if(window.qa.result==='network')throw Error('Mock network failure');
      if(window.qa.result==='rate')return Response.json({error:'rate',retryAfter:60},{status:429});
      if(body.action==='signout'){window.qa.signedOut=true;window.qa.persist();return Response.json({ok:true});}
      if(body.action==='signin'){window.qa.signedOut=false;window.qa.aal='aal1';window.qa.expiresAt=Date.now()+900000;window.qa.persist();return Response.json({ok:true,mfaRequired:window.qa.factors.some(f=>f.status==='verified'),redirect:'/'});}
      if(window.qa.expiresAt<Date.now())return Response.json({error:'expired'},{status:401});
      if(body.action==='enroll'){
        const factor={id:'own-factor-'+(window.qa.factors.length+1),name:body.name,type:'totp',status:'unverified',createdAt:'2026-10-18T10:00:00Z'};window.qa.factors.push(factor);window.qa.persist();
        return Response.json({enrollment:{id:factor.id,qrCode:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="white"/></svg>'),secret:'QA-MOCK-SETUP-MATERIAL'}});
      }
      const factor=window.qa.factors.find(f=>f.id===body.factorId);
      if(!factor)return Response.json({error:'factor_missing'},{status:400});
      if(body.action==='verify'){
        if(body.code!=='123456')return Response.json({error:'invalid_code'},{status:400});
        factor.status='verified';window.qa.aal='aal2';window.qa.persist();return Response.json({ok:true,...window.qa.snapshot()});
      }
      if(body.action==='cancel' || body.action==='remove'){
        if(body.action==='cancel' && factor.status==='verified')return Response.json({error:'factor_verified'},{status:409});
        window.qa.factors=window.qa.factors.filter(f=>f.id!==body.factorId);if(!window.qa.factors.some(f=>f.status==='verified'))window.qa.aal='aal1';window.qa.persist();return Response.json({ok:true,...window.qa.snapshot()});
      }
      return Response.json({ok:true});
    };
  `});
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:900,deviceScaleFactor:1,mobile:true});
  await navigate('&mode=security');
  await wait(`${panel}?.includes('Not Enabled')`);
  await click('Enable Two-Factor Authentication');
  await wait(`${panel}?.includes('Secure Your English-Co Account')`);
  await evaluate("const b=[...document.querySelectorAll('button')].find(b=>b.textContent==='Continue Setup');b.click();b.click()");
  await wait("document.querySelector('.ec-mfa-qr')");
  assert.equal(await evaluate("window.qa.calls.filter(a=>a==='enroll').length"),1);
  await evaluate("document.querySelector('.ec-mfa summary').click()");
  assert.equal(await evaluate("document.querySelector('.ec-mfa-secret').textContent.length>0"),true);
  assert.equal(await evaluate("Object.values(localStorage).concat(Object.values(sessionStorage)).some(v=>v.includes(document.querySelector('.ec-mfa-secret').textContent))"),false);
  for(const width of [320,375,390,768,1440]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
    assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth && document.querySelector('.ec-mfa-qr').getBoundingClientRect().right<=innerWidth"),true);
  }
  reports.push('One enrollment request, temporary QR/manual key, no browser storage, and responsive QR bounds');
  await evaluate("window.qa.hidden=true;document.dispatchEvent(new Event('visibilitychange'))");
  await wait("!document.querySelector('.ec-mfa-qr')");
  await evaluate("window.qa.hidden=false;document.dispatchEvent(new Event('visibilitychange'))");
  await wait("document.querySelector('.ec-mfa-qr')");
  assert.equal(await evaluate("window.qa.calls.filter(a=>a==='enroll').length"),1);
  reports.push('Switching to an authenticator app hides setup material and safely resumes the same pending factor');
  await fill('.ec-mfa-code','000000');await submit();await wait(`${panel}?.includes('That code was not accepted')`);
  await fill('.ec-mfa-code','123456');await submit();await wait(`${panel}?.includes('Two-Factor Authentication Enabled')`);
  assert.equal(await evaluate("!!document.querySelector('.ec-mfa-qr,.ec-mfa-secret')"),false);
  await screenshot('mfa-enabled-en');await click('Done');await wait(`${panel}?.includes('Manage Two-Factor Authentication')`);
  reports.push('Invalid codes stay in setup; successful server verification shows enabled status and disposes secrets');
  await click('Add Another Authenticator');await fill('.ec-mfa input','Backup authenticator');await click('Continue Setup');await wait("document.querySelector('.ec-mfa-code')");
  await fill('.ec-mfa-code','123456');await submit();await wait(`${panel}?.includes('Two-Factor Authentication Enabled')`);await click('Done');await wait(`${panel}?.includes('Manage Two-Factor Authentication')`);
  await click('Manage Two-Factor Authentication');await wait("document.querySelectorAll('.ec-mfa-factor').length===2");
  await click('Remove');await wait("document.querySelector('[role=alertdialog]')");await click('Keep Authenticator');assert.equal(await evaluate('window.qa.factors.length'),2);
  await click('Remove');await click('Confirm Removal');await wait('window.qa.factors.length===1');await wait(`${panel}?.includes('Enabled')`);
  await click('Remove');await click('Confirm Removal');await wait('window.qa.factors.length===0');await wait(`${panel}?.includes('Not Enabled')`);
  reports.push('Multiple factors, explicit removal confirmation, remaining-factor status, and final disablement');
  await click('Enable Two-Factor Authentication');await click('Continue Setup');await wait("document.querySelector('.ec-mfa-qr')");await click('Cancel Setup');await wait('window.qa.factors.length===0');await wait("!document.querySelector('.ec-mfa-qr')");
  reports.push('Cancellation removes only pending setup and clears its temporary material');
  await click('Enable Two-Factor Authentication');await click('Continue Setup');await wait("document.querySelector('.ec-mfa-qr')");
  await evaluate("window.qa.hidden=true;document.dispatchEvent(new Event('visibilitychange'));window.qa.factors=[];window.qa.persist();window.qa.hidden=false;document.dispatchEvent(new Event('visibilitychange'))");
  await wait("!document.querySelector('.ec-mfa[aria-busy=true]')");
  assert.equal(await evaluate("!!document.querySelector('.ec-mfa-qr,.ec-mfa-secret')"),false);
  reports.push('Pending setup material cannot reappear after a session no longer owns that factor');
  await evaluate("window.qa.factors=[{id:'verified-one',name:'Primary',type:'totp',status:'verified'},{id:'verified-two',name:'Backup',type:'totp',status:'verified'}];window.qa.aal='aal1';window.qa.persist()");
  await evaluate("window.qa.signedOut=true;window.qa.persist()");await navigate('&mode=signin');
  await fill('input[name=email]','own@example.test');await fill('input[name=password]','long-password');
  await evaluate("document.querySelector('form').requestSubmit()");await wait("document.querySelector('.ec-mfa-code')");
  assert.equal(await evaluate("document.querySelector('h1').textContent"),'Two-Factor Verification');
  assert.equal(await evaluate("document.body.innerText.includes('Own Student')"),false);
  reports.push('Successful first-factor password login opens the MFA challenge before protected account data');
  await navigate('&mode=mfa&after=recovery');await wait("document.querySelector('.ec-mfa-code')");
  assert.equal(await evaluate("document.querySelectorAll('.ec-mfa select option').length"),2);
  assert.equal(await evaluate("document.body.innerText.includes('Own Student')"),false);
  await send('Page.reload');await wait("document.querySelector('.ec-mfa-code')");assert.equal(await evaluate("location.search.includes('after=recovery')"),true);
  await fill('.ec-mfa-code','123456');await submit();await wait("document.querySelector('h1')?.textContent==='Choose a new password'");
  reports.push('AAL1 challenge survives refresh, supports factor selection, withholds account data and resumes recovery after AAL2');
  await evaluate("window.qa.aal='aal1';window.qa.persist()");await navigate('&mode=mfa');await wait("document.querySelector('.ec-mfa-code')");
  await evaluate("window.qa.result='rate'");await fill('.ec-mfa-code','123456');await submit();await wait(`${panel}?.includes('Too many attempts')`);
  assert.equal(await evaluate("document.querySelector('.ec-mfa form button').disabled"),true);
  await evaluate("window.qa.result='success';window.qaOffset=61000");await wait("!document.querySelector('.ec-mfa form button').disabled");
  await evaluate("window.qa.expiresAt=Date.now()-1");await submit();await wait(`${panel}?.includes('session has expired')`);
  await click('Sign Out');await wait("document.querySelector('h1')?.textContent==='Welcome back'");
  assert.equal(await evaluate("location.search.includes('mode=mfa')"),false);
  await send('Page.reload');await wait("document.querySelector('h1')?.textContent==='Welcome back'");
  assert.equal(await evaluate("localStorage.getItem('cadence:guest-data:mfa-preserve')"),'preserved-progress');
  reports.push('Provider rate limits disable retry; expired sessions guide sign-in; challenge sign-out preserves guest data');
  for(const language of ['en','ku']){
    await evaluate(`sessionStorage.setItem('qa-mfa-language',${JSON.stringify(language)});sessionStorage.setItem('qa-mfa',JSON.stringify({aal:'aal1',factors:[{id:'verified-one',name:'Authenticator',type:'totp',status:'verified'}],expiresAt:Date.now()+900000,signedOut:false}))`);
    await navigate('&mode=mfa');await wait("document.querySelector('.ec-mfa-code')");
    assert.equal(await evaluate("document.querySelector('.ec-mfa').dir"),language==='ku'?'rtl':'ltr');
    assert.equal(await evaluate("document.querySelector('.ec-mfa-code').dir"),'ltr');
    assert.equal(await evaluate("document.querySelector('.ec-mfa-code').inputMode"),'numeric');
    assert.equal(await evaluate("document.querySelector('.ec-mfa-code').labels.length"),1);
    for(const width of [320,375,390,768,1440]){
      await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:width<768});
      assert.equal(await evaluate("document.documentElement.scrollWidth<=innerWidth && [...document.querySelectorAll('.ec-mfa button,.ec-mfa input')].every(e=>{const r=e.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth && r.height>=44})"),true);
      layouts++;
      if(language==='ku' && width===375)await screenshot('mfa-challenge-mobile-ku');
    }
  }
  reports.push('10 bilingual challenge layouts, numeric LTR inputs, labels and comfortable controls');
  for(const language of ['en','ku']){
    const t=mfaCopy[language];
    await evaluate(`sessionStorage.setItem('qa-mfa-language',${JSON.stringify(language)});sessionStorage.setItem('qa-mfa',JSON.stringify({aal:'aal1',factors:[],expiresAt:Date.now()+900000,signedOut:false}))`);
    await navigate('&mode=security');await fit();await click(t.enable);await fit();await click(t.start);await wait("document.querySelector('.ec-mfa-qr')");await fit();await click(t.cancel);await wait('window.qa.factors.length===0');
    await evaluate("window.qa.factors=[{id:'verified-one',name:'My authenticator',type:'totp',status:'verified'}];window.qa.aal='aal2';window.qa.persist()");
    await navigate('&mode=security');await click(t.manage);await fit();await click(t.remove);await fit();await click(t.keep);
  }
  reports.push('50 bilingual status, introduction, QR setup, factor-management and removal-dialog layouts');
  assert.equal(await evaluate('window.qa.realAuth'),0);
  console.log(JSON.stringify({passed:reports.length,checks:reports,responsiveLayouts:layouts,realAuthRequests:0,enrollmentScreenshots:0,screenshots},null,2));
}finally{await send('Page.close').catch(()=>{});socket.close();}
