'use client';
import React,{useEffect,useState} from 'react';
import App from './cadence/App.jsx';
export default function CadenceClient(){
 const [ready,setReady]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{let active=true;
  (async()=>{
   try{
    const r=await fetch('/api/session',{credentials:'same-origin'});if(!r.ok)throw new Error('Connection unavailable');
    const session=await r.json();if(session.mode!=='hosted')throw new Error('Connection unavailable');
    window.CADENCE_SESSION=session;
    async function request(method,key,value){const r=await fetch('/api/storage',{method,credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({key,value})});const data=await r.json();if(!r.ok)throw new Error(data?.error||'Storage unavailable');return data;}
    const unreadableKeys=new Set();
    window.storage={get:async key=>{try{const data=await request('POST',key);unreadableKeys.delete(key);return data;}catch(e){unreadableKeys.add(key);window.dispatchEvent(new Event('cadence-save-error'));throw e;}},set:(key,value)=>{if(unreadableKeys.has(key))return Promise.reject(new Error('Reload before saving this record.'));return request('PUT',key,value);},delete:key=>request('DELETE',key)};
    if(active)setReady(true);
   }catch{if(active)setError('پەیوەندی بەردەست نییە. تکایە دووبارە هەوڵبدە.');}
  })();return()=>{active=false;};
 },[]);
 if(error)return <main dir="rtl" className="min-h-screen flex items-center justify-center"><div role="alert">{error}<button className="m-4 underline" onClick={()=>location.reload()}>دووبارە هەوڵبدە</button></div></main>;
 return ready?<App/>:<main className="min-h-screen flex items-center justify-center" aria-busy="true">Cadence…</main>;
}

