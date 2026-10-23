// Safe staging comparison: A :3218, B :3219, integrated :3217; isolated CDP :9337.
// Account reads are mocked, Azure is never contacted, external fonts are blocked.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {PLACEMENT_QUESTIONS,scorePlacement} from '../components/cadence/placement.js';
const artifacts=process.env.QA_ARTIFACT_DIR;
if(!artifacts)throw Error('QA_ARTIFACT_DIR must point outside source to comparison artifacts');
await mkdir(artifacts,{recursive:true});
const profile={name:'Local QA Learner',email:'visual-fixture@guest.invalid',uiLang:'en',onboardingComplete:true,placementComplete:true,assessment:scorePlacement(PLACEMENT_QUESTIONS.map(q=>({id:q.id,answer:'__unknown__'}))),dailyGoalMinutes:20,priorities:[],learningGoals:[],interests:[]};
const results={};
for(const [label,port]of [['A',3218],['B',3219],['integrated',3217]]){
 const target=await(await fetch('http://127.0.0.1:9337/json/new?about:blank',{method:'PUT'})).json();
 const socket=new WebSocket(target.webSocketDebuggerUrl);await new Promise((r,j)=>{socket.onopen=r;socket.onerror=j;});
 let id=0;const pending=new Map();
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);m.error?p.reject(Error(JSON.stringify(m.error))):p.resolve(m.result);}};
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,{resolve,reject});socket.send(JSON.stringify({id:n,method,params}));});
 const ev=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
 const wait=async expression=>{for(let n=0;n<160;n++){if(await ev(`Boolean(${expression})`))return;await new Promise(r=>setTimeout(r,100));}throw Error('Reference state timeout '+label+' '+expression);};
 const click=async text=>{await wait(`[...document.querySelectorAll('button')].some(b=>b.getClientRects().length&&b.textContent.trim()===${JSON.stringify(text)})`);await ev(`{[...document.querySelectorAll('button')].find(b=>b.getClientRects().length&&b.textContent.trim()===${JSON.stringify(text)}).click();}`);};
 const screenshot=async name=>{await ev('document.fonts.ready.then(()=>true)');const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});await writeFile(path.join(artifacts,name+'.png'),Buffer.from(r.data,'base64'));};
 results[label]={};
 try{
  await send('Page.enable');await send('Runtime.enable');await send('Network.enable');
  await send('Network.setBlockedURLs',{urls:['*googleapis.com*','*gstatic.com*','*supabase*','*azure.com*','*microsoft.com*']});
  await send('Page.addScriptToEvaluateOnNewDocument',{source:`
   const p=${JSON.stringify(profile)};p.uiLang=sessionStorage.getItem('visual-language')||'en';
   localStorage.setItem('cadence:guest-id','visual-fixture');localStorage.setItem('cadence:ui-language',p.uiLang);localStorage.setItem('cadence:guest-data:profile:visual-fixture@guest.invalid',JSON.stringify(p));
   const nativeFetch=fetch.bind(window);window.fetch=(url,options={})=>{const u=new URL(String(url),location.origin);if(u.origin!==location.origin)throw Error('External request forbidden');if(u.pathname==='/api/supabase-auth')return Promise.resolve(Response.json({user:null,account:null}));if(u.pathname==='/api/pronunciation')return Promise.resolve(Response.json({configured:false,enabled:false}));return nativeFetch(url,options);};
  `});
  for(const [lang,width,dark]of [['en',1440,false],['ku',390,true]]){
   await send('Emulation.setDeviceMetricsOverride',{width,height:960,deviceScaleFactor:1,mobile:width<768});
   await send('Page.navigate',{url:`http://127.0.0.1:${port}`});await wait('document.querySelector("aside")');
   await ev(`sessionStorage.setItem('visual-language',${JSON.stringify(lang)})`);
   await send('Page.navigate',{url:`http://127.0.0.1:${port}`});await wait('document.querySelector("aside")');
   if(dark)await ev(`{[...document.querySelectorAll('button[aria-label="Toggle dark mode"]')].find(b=>b.getClientRects().length).click();}`);
   await click(lang==='en'?'Home':'سەرەکی');
   await wait('document.querySelector("main h1")');
   results[label][lang]={home:await ev(`(()=>{const m=document.querySelector('aside').nextElementSibling.querySelector('main');const h=m.querySelector('h1'),s=getComputedStyle(h);return {text:m.innerText,heading:{fontSize:s.fontSize,color:s.color,fontFamily:s.fontFamily},mainWidth:Math.round(m.getBoundingClientRect().width)};})()`)};
   await screenshot(`${label}-home-${lang}-${width}`);
   if(label!=='A'){
    await click(lang==='en'?'Pronunciation':'تەلەفوز');await wait('document.querySelector("blockquote")');
    results[label][lang].pronunciation=await ev(`(()=>{const e=document.querySelector('blockquote'),s=getComputedStyle(e),h=document.querySelector('main h1'),hs=getComputedStyle(h);return {prompt:e.textContent,background:s.backgroundColor,color:s.color,fontSize:s.fontSize,padding:s.padding,borderRadius:s.borderRadius,width:Math.round(e.getBoundingClientRect().width),heading:{text:h.textContent,color:hs.color,fontSize:hs.fontSize}};})()`);
    await screenshot(`${label}-pronunciation-${lang}-${width}`);
   }
   if(label!=='B'){
    await send('Page.navigate',{url:`http://127.0.0.1:${port}/account?provider=supabase`});await wait('document.querySelector("form input[name=email]")');
    results[label][lang].account=await ev(`(()=>{const h=document.querySelector('h1'),i=document.querySelector('input[name=email]'),s=getComputedStyle(i);return {heading:h.textContent,input:{height:Math.round(i.getBoundingClientRect().height),borderRadius:s.borderRadius,fontSize:s.fontSize},buttons:[...document.querySelectorAll('form button')].map(b=>b.textContent)};})()`);
    await screenshot(`${label}-account-${lang}-${width}`);
   }
  }
 }finally{socket.close();await fetch('http://127.0.0.1:9337/json/close/'+target.id);}
}
for(const lang of ['en','ku']){
 assert.deepEqual(results.integrated[lang].home,results.A[lang].home,'Retained dashboard presentation matches staged A');
 assert.deepEqual(results.integrated[lang].account,results.A[lang].account,'Account presentation matches staged A');
 assert.deepEqual(results.integrated[lang].pronunciation,results.B[lang].pronunciation,'B prompt card typography/palette/spacing/width and heading retained');
}
await writeFile(path.join(artifacts,'comparison-results.json'),JSON.stringify(results,null,2));
console.log(JSON.stringify({passed:true,comparisons:6,screenshots:14,coverage:['EN 1440 light','KU 390 dark'],intentionalDifferences:['local recording consent before capture','explicit inactive assessment status','previous-device-history label','A account access preserved']},null,2));
