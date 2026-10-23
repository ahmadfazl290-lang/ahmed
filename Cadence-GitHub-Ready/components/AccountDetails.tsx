'use client';
import {useEffect, useId, useRef, useState, type ReactNode} from 'react';
import {Check, CircleAlert, Loader2, LockKeyhole, LogOut, ShieldCheck, UserRound} from 'lucide-react';
import type {AccountDetailsData} from '../lib/supabase/account-details';
import MfaPanel from './MfaPanel';

const copy = {
  en: {
    title:'My Account', intro:'Your English-Co account details and security settings.', personal:'Personal information', information:'Account information', security:'Account security',
    name:'Full name', email:'Email address', created:'Account created', last:'Last sign-in', method:'Sign-in method', verification:'Email verification', verified:'Verified', unverified:'Not Verified', confirmed:'Confirmed',
    password:'Change Password', twoFactor:'Two-factor authentication', enrolled:'Enrolled', pending:'Enrollment incomplete', none:'Not enrolled', unknown:'Status unavailable', soon:'New enrollment coming soon',
    logout:'Sign Out', guest:'You are currently learning as a guest.', signup:'Create Account', signin:'Sign In', missing:'Not available', emailProvider:'Email and Password',
    loading:'Loading your account…', error:'Your account information could not be refreshed. Please try again.', retry:'Try Again', signedOut:'You have signed out.',
    local:'Learning progress stays in this browser. Signing in does not transfer or synchronize guest progress.',
  },
  ku: {
    title:'هەژمارەکەم', intro:'زانیاریی هەژمار و ڕێکخستنەکانی پاراستنی English-Co.', personal:'زانیاریی کەسی', information:'زانیاریی هەژمار', security:'پاراستنی هەژمار',
    name:'ناوی تەواو', email:'ناونیشانی ئیمەیڵ', created:'بەرواری دروستکردنی هەژمار', last:'دوا چوونەژوورەوە', method:'شێوازی چوونەژوورەوە', verification:'پشتڕاستکردنەوەی ئیمەیڵ', verified:'پشتڕاستکراوەتەوە', unverified:'پشتڕاست نەکراوەتەوە', confirmed:'پشتڕاستکراوەتەوە لە',
    password:'گۆڕینی وشەی نهێنی', twoFactor:'پشتڕاستکردنەوەی دوو هەنگاوی', enrolled:'تۆمارکراوە', pending:'تۆمارکردن تەواو نەکراوە', none:'تۆمار نەکراوە', unknown:'دۆخەکە بەردەست نییە', soon:'تۆمارکردنی نوێ بەم زووانە',
    logout:'چوونەدەرەوە', guest:'ئێستا وەک میوان فێر دەبیت.', signup:'دروستکردنی هەژمار', signin:'چوونەژوورەوە', missing:'بەردەست نییە', emailProvider:'ئیمەیڵ و وشەی نهێنی',
    loading:'هەژمارەکەت دەخوێنرێتەوە…', error:'زانیاریی هەژمارەکەت نوێ نەکرایەوە. دووبارە هەوڵبدە.', retry:'دووبارە هەوڵبدە', signedOut:'چوویتە دەرەوە.',
    local:'پێشکەوتنی فێربوون لەم وێبگەڕە دەمێنێتەوە. چوونەژوورەوە پێشکەوتنی میوان ناگوازێتەوە و هاوکاتی ناکات.',
  },
};

export default function AccountDetails({lang, onSignedOut, onChangePassword}: {lang:'en'|'ku'; onSignedOut?:()=>void; onChangePassword?:()=>void}) {
  const t = copy[lang], id = useId();
  const [account,setAccount] = useState<AccountDetailsData|null>(null);
  const [status,setStatus] = useState<'loading'|'ready'|'error'|'mfa'>('loading');
  const [busy,setBusy] = useState(false), [signedOut,setSignedOut] = useState(false);
  const request = useRef<AbortController|null>(null), version = useRef(0), signingOut = useRef(false);
  function clear() {version.current++;request.current?.abort();setAccount(null);}
  async function refresh() {
    if(signingOut.current)return;
    clear();setStatus('loading');
    const current=version.current, controller=new AbortController();request.current=controller;
    try {
      const response=await fetch('/api/supabase-auth',{cache:'no-store',credentials:'same-origin',signal:controller.signal});
      const data=await response.json();
      if(current===version.current && data.error==='mfa_required'){setStatus('mfa');return;}
      if(!response.ok)throw Error('unavailable');
      if(current===version.current){setAccount(data.account || null);setStatus('ready');}
    } catch {if(current===version.current && !controller.signal.aborted)setStatus('error');}
  }
  useEffect(()=>{
    void refresh();
    const focus=()=>void refresh();
    const visibility=()=>{if(document.hidden){clear();setStatus('loading');}else void refresh();};
    const channel=typeof BroadcastChannel==='undefined'?null:new BroadcastChannel('englishco-auth');
    if(channel)channel.onmessage=focus;
    window.addEventListener('focus',focus);window.addEventListener('pageshow',focus);window.addEventListener('englishco-auth-change',focus);
    document.addEventListener('visibilitychange',visibility);
    const timer=window.setInterval(()=>{if(!document.hidden)void refresh();},60000);
    return()=>{version.current++;request.current?.abort();channel?.close();window.clearInterval(timer);window.removeEventListener('focus',focus);window.removeEventListener('pageshow',focus);window.removeEventListener('englishco-auth-change',focus);document.removeEventListener('visibilitychange',visibility);};
  },[]);
  async function signout() {
    if(signingOut.current)return;
    signingOut.current=true;clear();setBusy(true);setStatus('loading');
    try {
      const response=await fetch('/api/supabase-auth',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'signout'})});
      if(!response.ok)throw Error('unavailable');
      setSignedOut(true);setStatus('ready');
      if(typeof BroadcastChannel!=='undefined'){const channel=new BroadcastChannel('englishco-auth');channel.postMessage('changed');channel.close();}
      window.dispatchEvent(new Event('englishco-auth-change'));onSignedOut?.();
    } catch {setStatus('error');}
    finally {signingOut.current=false;setBusy(false);}
  }
  function date(value:string|null) {
    if(!value || !Number.isFinite(Date.parse(value)))return t.missing;
    try {
      // Chromium does not consistently ship Sorani month names. Numeric local
      // dates avoid silently falling back to English month names in the RTL UI.
      return new Intl.DateTimeFormat('en-GB',lang==='ku'
        ? {year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23',numberingSystem:'arab'}
        : {dateStyle:'medium',timeStyle:'short'}).format(new Date(value));
    }catch{return t.missing;}
  }
  const row=(label:string,value:ReactNode)=><div className="ec-account-row" key={label}><dt>{label}</dt><dd>{value}</dd></div>;
  const badge=account && <span className={`ec-account-badge ${account.verified?'ec-account-verified':''}`}>{account.verified?<Check size={16} aria-hidden="true"/>:<CircleAlert size={16} aria-hidden="true"/>}{account.verified?t.verified:t.unverified}</span>;
  return <section className="ec-account" dir={lang==='ku'?'rtl':'ltr'} aria-labelledby={`${id}-title`} aria-busy={status==='loading'}>
    <style>{css}</style>
    <header className="ec-account-header"><UserRound size={22} aria-hidden="true"/><div><h2 id={`${id}-title`}>{t.title}</h2><p>{t.intro}</p></div></header>
    {status==='loading'?<p role="status" className="ec-account-status"><Loader2 size={18} aria-hidden="true"/>{t.loading}</p>:
      status==='mfa'?<div className="ec-account-status"><ShieldCheck size={18} aria-hidden="true"/><a href="/account?provider=supabase&mode=mfa">{lang==='ku'?'پشتڕاستکردنەوەی دوو هەنگاوی':'Two-Factor Verification'}</a></div>:
      status==='error'?<div role="alert" className="ec-account-status"><CircleAlert size={18} aria-hidden="true"/><p>{t.error}</p><button type="button" onClick={()=>void refresh()}>{t.retry}</button></div>:
      !account?<div className="ec-account-guest">{signedOut && <p role="status">{t.signedOut}</p>}<p>{t.guest}</p><nav aria-label={t.title}><a href="/account?provider=supabase&mode=signup">{t.signup}</a><a href="/account?provider=supabase&mode=signin">{t.signin}</a></nav></div>:
      <div className="ec-account-sections">
        <section><h3><UserRound size={17} aria-hidden="true"/>{t.personal}</h3><dl>{row(t.name,account.fullName || t.missing)}{row(t.email,<bdi dir="ltr">{account.email || t.missing}</bdi>)}</dl></section>
        <section><h3>{t.information}</h3><dl>{row(t.created,<bdi dir="ltr">{date(account.createdAt)}</bdi>)}{row(t.last,<bdi dir="ltr">{date(account.lastSignInAt)}</bdi>)}{row(t.method,account.providers.length?account.providers.map(provider=>provider==='email'?t.emailProvider:provider==='google'?'Google':provider).join(' · '):t.missing)}</dl></section>
        <section><h3><ShieldCheck size={17} aria-hidden="true"/>{t.security}</h3><dl>{row(t.verification,<>{badge}{account.verified && account.confirmedAt && <small>{t.confirmed}: <bdi dir="ltr">{date(account.confirmedAt)}</bdi></small>}</>)}</dl>
          <MfaPanel lang={lang} compact /><div className="ec-account-actions">{account.verified && (onChangePassword?<button type="button" onClick={onChangePassword}><LockKeyhole size={16} aria-hidden="true"/>{t.password}</button>:<a href="/account?provider=supabase&mode=update"><LockKeyhole size={16} aria-hidden="true"/>{t.password}</a>)}<button type="button" disabled={busy} onClick={()=>void signout()}><LogOut size={16} aria-hidden="true"/>{t.logout}</button></div>
        </section>
      </div>}
    <p className="ec-account-local">{t.local}</p>
  </section>;
}

const css=`
.ec-account{font-family:"Segoe UI",Tahoma,Arial,sans-serif;color:#182d27;background:#fff;border:1px solid #dfe7e1;border-radius:14px;padding:24px;text-align:start;min-width:0;overflow-wrap:anywhere}
.ec-account *{box-sizing:border-box}.ec-account-header{display:flex;gap:12px;align-items:flex-start;margin-bottom:20px}.ec-account-header>svg{color:#087454;flex-shrink:0;margin-top:4px}
.ec-account h2{font-size:21px;font-weight:700;margin:0}.ec-account p{font-size:14px;line-height:1.7;margin:5px 0}.ec-account-header p,.ec-account dt,.ec-account small{color:#62716a}
.ec-account-sections{display:grid;gap:16px}.ec-account-sections>section{border:1px solid #e2e9e4;border-radius:10px;padding:18px}.ec-account h3{display:flex;align-items:center;gap:8px;font-size:15px;font-weight:650;margin:0 0 12px}.ec-account h3 svg{color:#087454;flex-shrink:0}
.ec-account dl{margin:0}.ec-account-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1.3fr);gap:16px;padding:12px 0;border-top:1px solid #edf1ee;font-size:14px;line-height:1.7}.ec-account-row:first-child{border-top:0}.ec-account dd{margin:0;font-weight:550;min-width:0}.ec-account small{display:block;font-weight:400;font-size:12px;margin-top:5px}
.ec-account-badge{display:inline-flex;align-items:center;gap:6px;color:#8a4d12;background:#fff7e9;border:1px solid #e9d5b7;border-radius:6px;padding:2px 8px;font-size:13px}.ec-account-verified{color:#096044;background:#edf8f1;border-color:#cce5d5}
.ec-account-actions,.ec-account nav{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.ec-account :is(a,button){display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;border:1px solid #cdded4;border-radius:8px;padding:10px 14px;color:#087454;background:#fff;font:600 14px/1.5 "Segoe UI",Tahoma,Arial,sans-serif;text-decoration:none;cursor:pointer}.ec-account :is(a,button) svg{flex-shrink:0}.ec-account :is(a,button):hover{background:#eff7f2}.ec-account :is(a,button):focus-visible{outline:3px solid #087454;outline-offset:3px}.ec-account button:disabled{opacity:.6;cursor:wait}
.ec-account .ec-account-local{border-top:1px solid #e2e9e4;margin:20px 0 0;padding-top:16px;font-size:12px;color:#62716a}.ec-account-status{display:flex;flex-wrap:wrap;gap:10px;align-items:center;min-height:80px}.ec-account-status p{flex:1;min-width:160px}
@media(max-width:540px){.ec-account{padding:18px}.ec-account-sections>section{padding:14px}.ec-account-row{grid-template-columns:minmax(0,1fr);gap:3px}.ec-account-actions{flex-direction:column}.ec-account h2{font-size:20px}}
`;
