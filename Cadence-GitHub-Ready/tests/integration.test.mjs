import {test} from 'node:test';
import {encodePcmWav} from '../lib/pronunciation-audio.mjs';
import {PRONUNCIATION_PROMPTS} from '../components/cadence/pronunciation-data.js';
import assert from 'node:assert/strict';
import {GET,POST} from '../app/api/pronunciation/route.ts';
import {GET as tokenGet,POST as tokenPost} from '../app/api/pronunciation/token/route.ts';
import {startPronunciationRecording} from '../components/cadence/pronunciation-recorder.js';

test('actual assessment routes make no provider calls without valid server configuration and never issue browser tokens',async()=>{
  const names=['AZURE_SPEECH_KEY','AZURE_SPEECH_REGION','AZURE_SPEECH_ENDPOINT','AZURE_SPEECH_TIER'];
  const saved=names.map(name=>process.env[name]);const nativeFetch=globalThis.fetch;
  let network=0,bodyRead=0;
  try{
    names.forEach(name=>delete process.env[name]);
    globalThis.fetch=async()=>{network++;throw Error('No external request allowed');};
    const hostile={url:'https://example.test/api/pronunciation?enabled=true',headers:new Headers({origin:'https://example.test'}),get body(){bodyRead++;throw Error('Must not read upload');}};
    const response=await POST(hostile);assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:{code:'NOT_CONFIGURED'}});
    for(const handler of [tokenGet,tokenPost]){const result=await handler(hostile);assert.equal(result.status,503);assert.deepEqual(await result.json(),{error:{code:'TOKEN_NOT_AVAILABLE'}});}
    assert.deepEqual(await (await GET()).json(),{configured:false,provider:'Azure Speech',maxSeconds:20});
    process.env.AZURE_SPEECH_KEY='REPLACE_ME';process.env.AZURE_SPEECH_REGION='eastus';process.env.AZURE_SPEECH_TIER='F0';
    assert.equal((await (await GET()).json()).configured,false);
    assert.equal(network,0);assert.equal(bodyRead,0);
  }finally{globalThis.fetch=nativeFetch;names.forEach((name,i)=>saved[i]===undefined?delete process.env[name]:process.env[name]=saved[i]);}
});

test('the actual assessment route uses private F0 configuration and forwards valid audio to Azure',async()=>{
  const names=['AZURE_SPEECH_KEY','AZURE_SPEECH_REGION','AZURE_SPEECH_ENDPOINT','AZURE_SPEECH_TIER'];
  const saved=names.map(name=>process.env[name]);const nativeFetch=globalThis.fetch;let calls=0;
  try{
    process.env.AZURE_SPEECH_KEY='private-route-test';process.env.AZURE_SPEECH_REGION='eastus';process.env.AZURE_SPEECH_TIER='F0';delete process.env.AZURE_SPEECH_ENDPOINT;
    globalThis.fetch=async(url,options)=>{calls++;assert.match(url,/^https:\/\/eastus\.stt\.speech\.microsoft\.com\//);assert.equal(options.headers['Ocp-Apim-Subscription-Key'],'private-route-test');return Response.json({RecognitionStatus:'Success',NBest:[{AccuracyScore:80,FluencyScore:81,CompletenessScore:90,PronScore:83,Words:[]}]});};
    const status=await (await GET()).json();assert.equal(status.configured,true);assert.ok(!JSON.stringify(status).includes('private-route-test'));
    const bytes=encodePcmWav(Float32Array.from({length:16000},(_,i)=>Math.sin(i/10)*0.3),16000);
    const response=await POST(new Request('https://example.test/api/pronunciation',{method:'POST',headers:{origin:'https://example.test','Content-Type':'audio/wav','X-Pronunciation-Prompt':PRONUNCIATION_PROMPTS[0].id,'X-Forwarded-For':'route-test'},body:bytes}));
    assert.equal(response.status,200);const result=await response.json();assert.equal(result.provider,'Azure Speech');assert.equal(result.pronunciation,83);assert.equal(calls,1);
  }finally{globalThis.fetch=nativeFetch;names.forEach((name,i)=>saved[i]===undefined?delete process.env[name]:process.env[name]=saved[i]);}
});

test('recording cancelled while microphone permission is pending stops the eventual tracks before creating an audio context',async()=>{
  const oldWindow=globalThis.window,oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  let resolvePermission,stopped=0,contexts=0;
  try{
    globalThis.window={isSecureContext:true,AudioContext:class{constructor(){contexts++;}},AudioWorkletNode:class{}};
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:()=>new Promise(resolve=>resolvePermission=resolve)}}});
    const controller=new AbortController();
    const pending=startPronunciationRecording({signal:controller.signal});
    controller.abort();resolvePermission({getTracks:()=>[{stop(){stopped++;}}]});
    await assert.rejects(pending,/REQUEST_CANCELLED/);
    assert.equal(stopped,1);assert.equal(contexts,0);
  }finally{globalThis.window=oldWindow;if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete globalThis.navigator;}
});

test('unsupported and permission-denied recording return useful errors without starting capture',async()=>{
  const oldWindow=globalThis.window,oldNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
  try{
    globalThis.window={isSecureContext:false};
    await assert.rejects(startPronunciationRecording(),/INSECURE_CONTEXT/);
    globalThis.window={isSecureContext:true};
    await assert.rejects(startPronunciationRecording(),/UNSUPPORTED_BROWSER/);
    globalThis.window={isSecureContext:true,AudioContext:class{},AudioWorkletNode:class{}};
    Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getUserMedia:async()=>{throw new DOMException('Denied','NotAllowedError');}}}});
    await assert.rejects(startPronunciationRecording(),{name:'NotAllowedError'});
  }finally{globalThis.window=oldWindow;if(oldNavigator)Object.defineProperty(globalThis,'navigator',oldNavigator);else delete globalThis.navigator;}
});
