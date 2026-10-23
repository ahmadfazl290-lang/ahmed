'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import CadenceClient from './CadenceClient';
import {ACCOUNT_PATH} from '../lib/supabase/auth-policy';
import {MFA_PATH} from '../lib/supabase/mfa-policy';
import {entryDecision,learningEntry,EXPLICIT_GUEST_KEY} from '../lib/entry-state';
import {LearningIdentityContext,type LearningIdentity} from './LearningIdentityContext';
type State={checking:boolean;identity:string|null;learner:LearningIdentity|null;mode:'account'|'guest'|null};
const copy={
  en:{checking:'Checking your account…',opening:'Opening your lessons…',account:'My Account / Security',signin:'Sign In / Create Account',signedIn:'Account session checked. Learning records stay separate on this device.',guest:'Guest learning — no account access. Progress stays on this device.'},
  ku:{checking:'پشکنینی هەژمارەکەت…',opening:'کردنەوەی وانەکانت…',account:'هەژمارەکەم / پاراستن',signin:'چوونەژوورەوە / دروستکردنی هەژمار',signedIn:'هەژمارەکەت پشکنرا. تۆمارەکانی فێربوون بە جیا لەم ئامێرەدا دەمێننەوە.',guest:'فێربوونی میوان — دەستگەیشتن بە هەژمار نییە. پێشکەوتن لەم ئامێرەدا دەمێنێتەوە.'},
};
/** Entry composition only. Protected API handlers remain the independent security boundary. */
export default function EntryController({children}:{children?:ReactNode}) {
  const [state,setState]=useState<State>({checking:true,identity:null,learner:null,mode:null});
  const [lang,setLang]=useState<'en'|'ku'>('en');
  const generation=useRef(0);
  useEffect(()=>{
    let alive=true,redirecting=false;
    let request:AbortController|null=null;
    let explicitGuest=new URL(location.href).searchParams.get('guest')==='1';
    try {
      setLang(localStorage.getItem('cadence:ui-language')==='ku'?'ku':'en');
      if(explicitGuest)sessionStorage.setItem(EXPLICIT_GUEST_KEY,'chosen');
    } catch { /* Learning storage errors remain handled by the unchanged learner adapter. */ }
    const observer=new MutationObserver(()=>setLang(document.documentElement.lang==='ku'?'ku':'en'));
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    function clearGuest(){explicitGuest=false;try{sessionStorage.removeItem(EXPLICIT_GUEST_KEY);}catch{}}
    function go(path:string){
      if(!alive||redirecting)return;
      redirecting=true;request?.abort();setState({checking:true,identity:null,learner:null,mode:null});
      // Fixed local destinations only; never honor next/returnTo/forwarded-host input.
      window.location.replace(path);
    }
    function open(learner:LearningIdentity){
      const identity=learner.kind==='account'?'account:'+learner.subject:'public-guest';
      setState(previous=>({checking:false,identity,mode:learner.kind,learner:previous.identity===identity?previous.learner:learner}));
    }
    async function check(invalidate=false){
      if(!alive||redirecting)return;
      const version=++generation.current;request?.abort();
      let chosen=explicitGuest;
      try{chosen ||= sessionStorage.getItem(EXPLICIT_GUEST_KEY)==='chosen';}catch{}
      // Public learning never requires a working identity provider. Guest intent
      // selects guest records only; protected account APIs still validate MFA.
      if(chosen){open(learningEntry(null,true));return;}
      const controller=new AbortController();request=controller;
      setState(previous=>({...previous,checking:true,...(invalidate?{identity:null,learner:null,mode:null}:{})}));
      const timer=window.setTimeout(()=>controller.abort(),4000);
      try {
        const response=await fetch('/api/supabase-auth',{cache:'no-store',credentials:'same-origin',signal:controller.signal});
        const data:unknown=await response.json();
        if(!alive||version!==generation.current)return;
        const decision=learningEntry(entryDecision(response.status,data));
        if(decision.kind==='mfa'){clearGuest();go(MFA_PATH);return;}
        if(decision.kind==='account'){
          clearGuest();
          open(decision);return;
        }
        if(decision.kind==='verification'){clearGuest();go(ACCOUNT_PATH+'&mode=resend');return;}
        open(decision);
      } catch {
        if(alive&&version===generation.current)open(learningEntry(null));
      } finally {window.clearTimeout(timer);}
    }
    const changed=()=>{clearGuest();void check(true);};
    const focus=()=>void check();
    const shown=(event:PageTransitionEvent)=>{if(event.persisted)void check(true);};
    const visibility=()=>{
      if(document.hidden){generation.current++;request?.abort();setState(previous=>({...previous,checking:true}));}
      else void check();
    };
    const channel=typeof BroadcastChannel==='undefined'?null:new BroadcastChannel('englishco-auth');
    if(channel)channel.onmessage=changed;
    window.addEventListener('englishco-auth-change',changed);window.addEventListener('focus',focus);
    window.addEventListener('pageshow',shown);document.addEventListener('visibilitychange',visibility);
    const timer=window.setInterval(()=>{if(!document.hidden)void check();},60000);
    void check();
    return()=>{alive=false;generation.current++;request?.abort();observer.disconnect();channel?.close();window.clearInterval(timer);window.removeEventListener('englishco-auth-change',changed);window.removeEventListener('focus',focus);window.removeEventListener('pageshow',shown);document.removeEventListener('visibilitychange',visibility);};
  },[]);
  const t=copy[lang];
  return <>
    {state.checking && <div className="ec-entry-check" dir={lang==='ku'?'rtl':'ltr'} role="status" aria-live="polite" data-entry-state="checking">{state.identity?t.checking:t.opening}</div>}
    {state.identity && <div hidden={state.checking} inert={state.checking} key={state.identity} data-entry-state={state.mode}>
      <nav className="ec-entry-learning-nav" dir={lang==='ku'?'rtl':'ltr'} aria-label={t.account}><span>{state.mode==='account'?t.signedIn:t.guest}</span><a href={ACCOUNT_PATH}>{state.mode==='account'?t.account:t.signin}</a></nav>
      <LearningIdentityContext.Provider value={state.learner!}>{children??<CadenceClient/>}</LearningIdentityContext.Provider>
    </div>}
    <style>{`.ec-entry-check{min-height:100vh;display:grid;place-items:center;padding:24px;color:#182d27;background:#f7faf8;font:16px/1.6 "Segoe UI",Tahoma,Arial,sans-serif}.ec-entry-learning-nav{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:8px 16px;background:#f0f7f3;color:#254a3b;font:13px/1.6 "Segoe UI",Tahoma,Arial,sans-serif}.ec-entry-learning-nav a{display:inline-flex;align-items:center;min-height:44px;color:#087454;text-decoration:underline}.ec-entry-learning-nav a:focus-visible{outline:3px solid #087454;outline-offset:3px}`}</style>
  </>;
}
