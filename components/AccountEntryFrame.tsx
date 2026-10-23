'use client';
import {useEffect,useState,type ReactNode,type MouseEvent} from 'react';
import {EXPLICIT_GUEST_KEY,ENTRY_NOTICE_KEY} from '../lib/entry-state';
/** Surround the existing account route; no forms, authentication calls, or policies are duplicated. */
export default function AccountEntryFrame({children}:{children:ReactNode}) {
  const [lang,setLang]=useState<'en'|'ku'>('en');
  const [unavailable,setUnavailable]=useState(false);
  useEffect(()=>{
    try{
      sessionStorage.removeItem(EXPLICIT_GUEST_KEY);
      setUnavailable(sessionStorage.getItem(ENTRY_NOTICE_KEY)==='unavailable');
      sessionStorage.removeItem(ENTRY_NOTICE_KEY);
      setLang(localStorage.getItem('cadence:ui-language')==='ku'?'ku':'en');
    }catch{}
    const observer=new MutationObserver(()=>setLang(document.documentElement.lang==='ku'?'ku':'en'));
    observer.observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
    return()=>observer.disconnect();
  },[]);
  const ku=lang==='ku';
  function chooseGuest(event:MouseEvent<HTMLDivElement>){
    const target=event.target instanceof Element?event.target:null;
    // The protected Supabase form already has a guest footer. Compose its existing navigation.
    if(new URLSearchParams(location.search).get('provider')==='supabase' && target?.closest('footer a[href="/"]')){
      try{sessionStorage.setItem(EXPLICIT_GUEST_KEY,'chosen');}catch{}
    }
  }
  return <div className="ec-entry-account-frame" onClickCapture={chooseGuest} onAuxClickCapture={chooseGuest}>
    <nav className="ec-entry-account-nav" dir={ku?'rtl':'ltr'} aria-label={ku?'هەڵبژاردەکانی چوونەژوورەوە':'Entry options'}>
      <span>{ku?'English-Co — هەژمار و فێربوون':'English-Co — account and learning'}</span>
    </nav>
    {unavailable && <div className="ec-entry-account-error" dir={ku?'rtl':'ltr'} role="alert"><p>{ku?'پشکنینی هەژمار بەردەست نییە. فێربوون بە خۆکار دەست پێ ناکات. تکایە دووبارە هەوڵبدە.':'Your account could not be checked. Learning has not started automatically. Please try again.'}</p><a href="/">{ku?'دووبارە هەوڵبدە':'Retry account check'}</a></div>}
    {children}
    <style>{`.ec-entry-account-nav{display:flex;gap:12px;align-items:center;justify-content:space-between;flex-wrap:wrap;padding:8px 20px;background:#f3f8f4;border-bottom:1px solid #dfe7e1;color:#254a3b;font:13px/1.6 "Segoe UI",Tahoma,Arial,sans-serif}.ec-entry-account-nav a,.ec-entry-account-error a{display:inline-flex;align-items:center;min-height:44px;color:#087454;text-decoration:underline}.ec-entry-account-nav a:focus-visible,.ec-entry-account-error a:focus-visible{outline:3px solid #087454;outline-offset:3px}.ec-entry-account-error{padding:12px 20px;border-bottom:1px solid #e8d4b4;background:#fff8ec;color:#654512;font:14px/1.6 "Segoe UI",Tahoma,Arial,sans-serif}.ec-entry-account-error p{margin:0}.ec-entry-account-error a{margin-top:4px}`}</style>
  </div>;
}
