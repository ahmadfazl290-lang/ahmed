'use client';
import React,{useEffect,useState} from 'react';
import App from './cadence/App.jsx';
import {useLearningIdentity} from './LearningIdentityContext';
import {createBrowserProgress} from '../lib/browser-progress.mjs';
export default function CadenceClient(){
 const identity=useLearningIdentity();
 const [ready,setReady]=useState(false);const [error,setError]=useState('');
 useEffect(()=>{let active=true,adapter;
  (async()=>{
   try{
    adapter=createBrowserProgress(identity,localStorage);
    window.CADENCE_SESSION=adapter.session;
    window.storage=adapter.storage;
    if(active)setReady(true);
   }catch{if(active)setError('پاشەکەوتکردنی وێبگەڕ بەردەست نییە. ڕێگە بە پاشەکەوتکردنی داتا بدە و دووبارە هەوڵبدە.');}
  })();return()=>{active=false;adapter?.dispose();};
 },[identity]);
 if(error)return <main dir="rtl" className="min-h-screen flex items-center justify-center"><div role="alert">{error}<button className="m-4 underline" onClick={()=>location.reload()}>دووبارە هەوڵبدە</button></div></main>;
 return ready?<App/>:<main className="min-h-screen flex items-center justify-center" aria-busy="true">Cadence…</main>;
}

