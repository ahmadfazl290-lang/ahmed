// Run with production server :3217 and isolated Chrome CDP :9337 using fake media.
// No real microphone, accounts, private records or external services are used.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {PLACEMENT_VERSION,PLACEMENT_QUESTIONS,scorePlacement} from '../components/cadence/placement.js';
import {PRONUNCIATION_PROMPTS} from '../components/cadence/pronunciation-data.js';
const origin='http://127.0.0.1:3217';
const target=await(await fetch('http://127.0.0.1:9337/json/new?about:blank',{method:'PUT'})).json();
const socket=new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
let id=0;const pending=new Map(),errors=[],external=[],reports=[];let layouts=0;
socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}else if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);else if(m.method==='Network.requestWillBeSent'&&/^https?:/.test(m.params.request.url)&&!m.params.request.url.startsWith(origin))external.push(new URL(m.params.request.url).hostname);};
const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});
const ev=async expression=>{let r;try{r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true,userGesture:true});}catch(error){throw Error(error.message+' in '+expression);}if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;};
async function wait(expr){for(let i=0;i<160;i++){if(await ev(`Boolean(${expr})`))return;await new Promise(r=>setTimeout(r,100));}throw Error('Timed out: '+expr);}
async function click(text){await wait(`[...document.querySelectorAll('button')].some(b=>b.getClientRects().length&&!b.disabled&&b.textContent.trim()===${JSON.stringify(text)})`);await ev(`(()=>{[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&!b.disabled&&b.textContent.trim()===${JSON.stringify(text)}).click()})()`);}
async function nav(){await send('Page.navigate',{url:origin+'/?guest=1'});await wait('document.querySelector("aside")');}
const snapshot=()=>ev(`JSON.stringify(Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('cadence:guest-data:')).sort().map(k=>[k,localStorage.getItem(k)])))`);
const assessment=scorePlacement(PLACEMENT_QUESTIONS.map(q=>({id:q.id,answer:'__unknown__'})));
const profile={name:'Local QA Learner',email:'integration-fixture@guest.invalid',nativeLanguage:'',targetLanguage:'English',englishLevel:null,priorities:[],learningGoals:[],interests:[],professionalField:'',dailyGoalMinutes:20,preferredStudyTime:'Morning',supportLanguage:'English + Kurdish Sorani',uiLang:'en',onboardingComplete:true,placementComplete:true,assessment,roadmap:null};
const seed={profile,version:PLACEMENT_VERSION,firstQuestion:PLACEMENT_QUESTIONS[0],prompt:PRONUNCIATION_PROMPTS[0].id};
try{
 await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
 await send('Network.setBlockedURLs',{urls:['*supabase*','*microsoft.com*','*azure.com*','*googleapis.com*','*gstatic.com*']});
 await send('Page.addScriptToEvaluateOnNewDocument',{source:`
  const seed=${JSON.stringify(seed)};
  window.qa={calls:[],mediaCalls:0,tracks:[],created:[],revoked:[],user:null,account:null};
  if(!sessionStorage.getItem('integration-seeded')){
   localStorage.setItem('cadence:guest-id','integration-fixture');localStorage.setItem('cadence:ui-language','en');
   localStorage.setItem('cadence:guest-data:profile:integration-fixture@guest.invalid',JSON.stringify(seed.profile));
   localStorage.setItem('cadence:guest-data:qa-vocab','unchanged synthetic vocabulary');
   localStorage.setItem('cadence:guest-data:qa-activity','unchanged synthetic activity');
   sessionStorage.setItem('integration-seeded','yes');
  }
  const nativeFetch=window.fetch.bind(window);
  window.fetch=async(url,options={})=>{
   const u=new URL(String(url),location.origin);window.qa.calls.push({path:u.pathname,method:options.method||'GET'});
   if(u.origin!==location.origin)throw Error('External fetch forbidden');
   if(u.pathname==='/api/supabase-auth')return Response.json({user:window.qa.user,account:window.qa.account});
   if(u.pathname==='/api/supabase-mfa')return Response.json({currentLevel:'aal1',required:false,factors:[],expiresAt:Date.now()+900000});
   return nativeFetch(url,options);
  };
  const nativeMedia=navigator.mediaDevices?.getUserMedia.bind(navigator.mediaDevices);
  window.qa.nativeMedia=nativeMedia;
  if(nativeMedia)navigator.mediaDevices.getUserMedia=async constraints=>{window.qa.mediaCalls++;const stream=await nativeMedia(constraints);window.qa.tracks.push(...stream.getTracks());return stream;};
  const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
  URL.createObjectURL=blob=>{const u=create(blob);window.qa.created.push(u);return u;};
  URL.revokeObjectURL=u=>{window.qa.revoked.push(u);revoke(u);};
 `});
 await nav();const before=await snapshot();
 assert.equal(await ev('window.qa.mediaCalls'),0);
 assert.equal(await ev('!!document.querySelector(\'a[href="/account?provider=supabase"]\')'),true);
 await click('Home');await wait('document.body.innerText.includes("Placement completed")');
 await click('Pronunciation');await wait('document.querySelector(".ec-pronunciation")');
 assert.equal(await ev('window.qa.mediaCalls'),0);
 assert.equal(await ev(`[...document.querySelectorAll('.ec-pronunciation button')].find(b=>b.textContent==='Start recording').disabled`),true);
 await ev(`document.querySelector('.ec-pronunciation input[type=checkbox]').click()`);
 await click('Start recording');await wait('window.qa.tracks.length && document.querySelector(".ec-pronunciation").innerText.includes("Stop recording")');
 await new Promise(resolve=>setTimeout(resolve,2200));
 await click('Stop recording');await wait('document.querySelector(".ec-pronunciation audio")');
 await wait('window.qa.tracks.every(t=>t.readyState==="ended")');
 assert.equal(await ev(`[...document.querySelectorAll('.ec-pronunciation button')].find(b=>b.textContent.trim()==='Assess pronunciation').disabled`),true);
 const playback=await ev(`(async()=>{const a=document.querySelector('.ec-pronunciation audio');await a.play();await new Promise(r=>setTimeout(r,120));const playing=!a.paused;a.pause();return {playing,duration:a.duration,src:a.src};})()`);
 assert.equal(playback.playing,true);assert.ok(playback.duration>=1);assert.match(playback.src,/^blob:/);
 await click('Cancel practice');await wait('!document.querySelector(".ec-pronunciation audio")');
 assert.equal(await ev('window.qa.revoked.includes(window.qa.created[0])'),true);
 assert.equal(await snapshot(),before);reports.push('Explicit consent; actual synthetic microphone/AudioWorklet recording, stop, WAV playback, track and object-URL release; no upload or score writes');

 for(const name of ['NotAllowedError','NotFoundError','NotReadableError']){
  await ev(`navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Synthetic media error',${JSON.stringify(name)})}`);
  await ev(`document.querySelector('.ec-pronunciation input[type=checkbox]').click()`);await click('Start recording');
  await wait('document.querySelector(".ec-pronunciation [role=alert]")');
  assert.equal(await ev(`document.querySelector('.ec-pronunciation [role=alert]').textContent.length>15`),true);
  await ev(`document.querySelector('.ec-pronunciation input[type=checkbox]').click()`);
 }
 // Leave consent unchecked; test cancellation while the browser permission promise is pending.
 await ev(`navigator.mediaDevices.getUserMedia=()=>new Promise(resolve=>window.qa.resolvePermission=resolve)`);
 await ev(`document.querySelector('.ec-pronunciation input[type=checkbox]').click()`);await click('Start recording');
 await wait('window.qa.resolvePermission');await click('Cancel practice');
 await ev(`window.qa.resolvePermission({getTracks:()=>[{stop(){window.qa.pendingStopped=true}}]})`);
 await wait('window.qa.pendingStopped');
 reports.push('Denied permission, missing/busy device and cancelled pending permission handled without leaked microphone');

 // Synthetic media capture also stops on navigation/unmount.
 await ev(`navigator.mediaDevices.getUserMedia=async c=>{const s=await window.qa.nativeMedia(c);window.qa.tracks.push(...s.getTracks());return s}`);
 await ev(`document.querySelector('.ec-pronunciation input[type=checkbox]').click()`);await click('Start recording');
 await wait('document.querySelector(".ec-pronunciation").innerText.includes("Stop recording")');
 await click('Home');await wait('!document.querySelector(".ec-pronunciation")');await wait('window.qa.tracks.every(t=>t.readyState==="ended")');
 assert.equal(await snapshot(),before);reports.push('Navigation releases active capture and preserves all local learning records');

 for(const lang of ['en','ku']){
  await ev(`localStorage.setItem('cadence:ui-language',${JSON.stringify(lang)});const k='cadence:guest-data:profile:integration-fixture@guest.invalid';const p=JSON.parse(localStorage.getItem(k));p.uiLang=${JSON.stringify(lang)};localStorage.setItem(k,JSON.stringify(p));`);
  await nav();await click(lang==='en'?'Pronunciation':'تەلەفوز');
  for(const dark of [false,true]){
   if(dark)await ev(`[...document.querySelectorAll('button[aria-label="Toggle dark mode"]')].find(b=>b.getClientRects().length).click()`);
   for(const width of [320,375,390,768,1440]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:960,deviceScaleFactor:1,mobile:width<768});
    await wait('document.querySelector(".ec-pronunciation")');
    assert.equal(await ev('document.documentElement.scrollWidth<=innerWidth'),true,`overflow ${lang}/${dark}/${width}`);
    assert.equal(await ev(`[...document.querySelectorAll('.ec-pronunciation button,.ec-pronunciation select')].filter(e=>e.getClientRects().length).every(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.height>=44})`),true);
    assert.equal(await ev(`document.querySelector('.ec-pronunciation').dir`),lang==='ku'?'rtl':'ltr');
    assert.equal(await ev(`document.querySelector('.ec-pronunciation blockquote').dir`),'ltr');
    layouts++;
    if(width===390||width===1440){if(process.env.QA_ARTIFACT_DIR){await mkdir(process.env.QA_ARTIFACT_DIR,{recursive:true});const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(path.join(process.env.QA_ARTIFACT_DIR,`pronunciation-${lang}-${dark?'dark':'light'}-${width}.png`),Buffer.from(shot.data,'base64'));}}
   }
  }
 }
 reports.push('20 EN/KU × light/dark × width layouts; RTL/LTR prompts, 44px controls and no horizontal overflow');
 await ev(`localStorage.setItem('cadence:ui-language','en');const k='cadence:guest-data:profile:integration-fixture@guest.invalid';const p=JSON.parse(localStorage.getItem(k));p.uiLang='en';localStorage.setItem(k,JSON.stringify(p));`);await nav();
 await send('Emulation.setDeviceMetricsOverride',{width:375,height:960,deviceScaleFactor:1,mobile:true});
 await click('More');await click('Profile');await wait('document.body.innerText.includes("Student profile") || [...document.querySelectorAll("h1")].some(e=>e.textContent==="Profile")');
 await click('More');await click('Settings');await wait('document.body.innerText.includes("My Account")');
 assert.equal(await ev(`document.body.innerText.includes('You are currently learning as a guest.')`),true);
 await ev(`window.qa.user={id:'mock-user',email:'mock@example.test',verified:true};window.qa.account={fullName:'Mock Account',email:'mock@example.test',verified:true,providers:['email'],twoFactor:'not_enrolled'};window.dispatchEvent(new Event('englishco-auth-change'))`);
 await wait("document.querySelector('[data-entry-state=account]')");await click('More');await click('Settings');await wait('document.body.innerText.includes("Mock Account")');
 assert.equal(await ev(`document.querySelector('aside').textContent.includes('Local QA Learner')`),true);
 await ev(`window.qa.user=null;window.qa.account=null;window.dispatchEvent(new Event('englishco-auth-change'))`);await wait('location.pathname==="/account" && document.querySelector("input[name=email]")');assert.equal(await ev('document.body.innerText.includes("mock@example.test")'),false);
 assert.equal(await ev('localStorage.getItem("cadence:guest-id")'),'integration-fixture');
 reports.push('Mobile More -> Profile and Settings -> My Account retained; separate local learner/account display and stale account clearing');
 await nav();await click('Pronunciation');
 await ev(`Object.defineProperty(window,'AudioWorkletNode',{value:undefined,configurable:true});true`);
 await click('Home');await click('Pronunciation');await wait('document.querySelector(".ec-pronunciation [role=alert]")');
 assert.equal(await ev(`[...document.querySelectorAll('.ec-pronunciation button')].find(b=>b.textContent==='Start recording').disabled`),true);
 assert.equal(await ev(`window.qa.calls.filter(c=>c.path==='/api/pronunciation'&&c.method!=='GET').length`),0);
 reports.push('Unsupported recorder disables start; UI makes zero assessment POSTs');
 for(const route of ['/api/pronunciation','/api/pronunciation/token'])for(const method of ['GET','POST']){
  const r=await fetch(origin+route,{method,headers:{origin,enabled:'true'},...(method==='POST'?{body:'do-not-read-upload'}:{})});
  assert.equal(r.status,route==='/api/pronunciation'&&method==='GET'?200:503);
 }
 assert.equal(errors.length,0,JSON.stringify(errors));
 assert.equal(external.some(h=>/azure|microsoft|supabase/.test(h)),false);
 reports.push('Real HTTP assessment/token routes disabled; no Azure/Supabase provider traffic or runtime exceptions');
 // Previously stored scores remain historical, never a newly assessed recording.
 await ev(`localStorage.setItem('cadence:guest-data:pronunciation_results:integration-fixture@guest.invalid',JSON.stringify([{promptId:${JSON.stringify(seed.prompt)},pronunciation:87,assessedAt:'2026-10-01T12:00:00Z'}]))`);
 await nav();await click('Pronunciation');
 await wait('document.querySelector(".ec-pronunciation").innerText.includes("87/100")');
 assert.equal(await ev(`document.querySelector('.ec-pronunciation').innerText.includes('Previous results on this device (assessment is currently off)')`),true);
 assert.equal(await ev(`document.querySelector('.ec-pronunciation').innerText.includes('Your pronunciation feedback')`),false);
 // Keyboard focus and scoped style don't change account/dashboard elements.
 await ev(`document.querySelector('.ec-pronunciation select').focus()`);
 await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9});
 assert.equal(await ev(`!!document.activeElement.closest('.ec-pronunciation')`),true);
 reports.push('Existing synthetic history labeled as previous/off; no new feedback; keyboard focus stays reachable');
 // Verify repository-specific learning remains reachable through the guest adapter.
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:900,deviceScaleFactor:1,mobile:false});
 await ev("localStorage.setItem('cadence:ui-language','en')");
 await send('Page.navigate',{url:origin+'/practice-library'});await wait('document.querySelector("aside")');
 for(const label of ['Daily Lesson','Courses','Practice','Vocabulary','Mistakes','Progress','Tutor']){await click(label);await wait('document.querySelector("main")');}
 assert.equal(await ev('!!document.querySelector(\'a[href="/account?provider=supabase"]\')'),true);
 assert.equal(await ev('window.CADENCE_SESSION.mode'),'guest');
 assert.equal(errors.length,0,JSON.stringify(errors));
 await send('Page.navigate',{url:origin});await wait('document.querySelector("aside")');
 reports.push('Repository daily lessons, courses, practice, mistakes, progress and tutor presentation remain reachable as guest learning');
 // Exercise an actual placement draft resume and save without real records.
 const draft=PLACEMENT_QUESTIONS.slice(0,3).map(q=>({id:q.id,answer:'__unknown__'}));
 await ev(`{const k='cadence:guest-data:profile:integration-fixture@guest.invalid';const p=JSON.parse(localStorage.getItem(k));p.assessment=null;p.placementComplete=false;p.placementDraft=${JSON.stringify({version:PLACEMENT_VERSION,answers:draft})};localStorage.setItem(k,JSON.stringify(p));}`);
 await send('Page.navigate',{url:origin});await wait('document.body.innerText.includes("3/36")');
 await click('Resume test');await wait('document.querySelector("fieldset")');
 await click("I don't know");await click('Save answer and continue');
 await wait(`JSON.parse(localStorage.getItem('cadence:guest-data:profile:integration-fixture@guest.invalid')).placementDraft.answers.length===4`);
 await send('Page.navigate',{url:origin});await wait('document.body.innerText.includes("4/36")');
 assert.equal(await ev(`localStorage.getItem('cadence:guest-id')`),'integration-fixture');
 assert.equal(await ev(`localStorage.getItem('cadence:guest-data:qa-vocab')`),'unchanged synthetic vocabulary');
 assert.equal(await ev(`localStorage.getItem('cadence:guest-data:qa-activity')`),'unchanged synthetic activity');
 reports.push('Guest placement draft resumes, saves next answer and survives reload; UUID/vocabulary/activity retained');
 console.log(JSON.stringify({passed:true,groups:reports.length,layouts,reports,externalHosts:[...new Set(external)]},null,2));
}catch(error){console.log('Completed groups',reports);console.log('Synthetic QA diagnostic',await ev(`({panel:document.querySelector('.ec-pronunciation')?.innerText,mediaCalls:window.qa?.mediaCalls,trackStates:window.qa?.tracks.map(t=>t.readyState),errors:${JSON.stringify(errors)}})`));throw error;
}finally{socket.close();await fetch('http://127.0.0.1:9337/json/close/'+target.id);}
