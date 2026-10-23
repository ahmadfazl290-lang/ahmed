'use client';
import React,{useEffect,useState} from 'react';
import App from './cadence/RepositoryApp.jsx';
export default function RepositoryClient(){
 const [ready,setReady]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{let active=true;
  (async()=>{
   try{
    let id=localStorage.getItem('cadence:guest-id');
    if(!id){id=crypto.randomUUID();localStorage.setItem('cadence:guest-id',id);}
    window.CADENCE_SESSION={mode:'guest',development:false,emailAuth:false,emailConfigured:false,user:{userId:id,email:`${id}@guest.invalid`,displayName:'فێرخواز'}};
    const prefix='cadence:guest-data:';
    window.storage={get:async key=>{const value=localStorage.getItem(prefix+key);return value===null?null:{key,value};},set:async(key,value)=>{localStorage.setItem(prefix+key,value);return {key,value};},delete:async key=>{localStorage.removeItem(prefix+key);return {key,deleted:true};}};
    if(active)setReady(true);
   }catch{if(active)setError('پاشەکەوتکردنی وێبگەڕ بەردەست نییە. ڕێگە بە پاشەکەوتکردنی داتا بدە و دووبارە هەوڵبدە.');}
  })();return()=>{active=false;};
 },[]);
 if(error)return <main dir="rtl" className="min-h-screen flex items-center justify-center"><div role="alert">{error}<button className="m-4 underline" onClick={()=>location.reload()}>دووبارە هەوڵبدە</button></div></main>;
 return ready?<App/>:<main className="min-h-screen flex items-center justify-center" aria-busy="true">Cadence…</main>;
}
