import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GET,POST} from '../app/api/pronunciation/route.ts';
import {GET as tokenGet,POST as tokenPost} from '../app/api/pronunciation/token/route.ts';
import {startPronunciationRecording} from '../components/cadence/pronunciation-recorder.js';

test('actual assessment and token routes stay disabled despite credentials and hostile enable flags, without reading uploads',async()=>{
  const names=['AZURE_SPEECH_KEY','AZURE_SPEECH_REGION','AZURE_SPEECH_TIER','AZURE_ENABLED','NEXT_PUBLIC_AZURE_ENABLED'];
  const saved=names.map(name=>process.env[name]);
  const nativeFetch=globalThis.fetch;
  let network=0,bodyRead=0;
  try{
    names.forEach(name=>process.env[name]='true');
    globalThis.fetch=async()=>{network++;throw Error('No external request allowed');};
    const hostile={url:'https://example.test/api/pronunciation?enabled=true',get body(){bodyRead++;throw Error('Must not read upload');},async text(){bodyRead++;throw Error('Must not read upload');},async arrayBuffer(){bodyRead++;throw Error('Must not read upload');}};
    for(const handler of [POST,tokenGet,tokenPost]){
      const result=await handler(hostile);
      assert.equal(result.status,503);
      assert.deepEqual(await result.json(),{error:{code:'ASSESSMENT_DISABLED'}});
      assert.match(result.headers.get('cache-control'),/no-store/);
    }
    const status=await (await GET(hostile)).json();
    assert.equal(status.enabled,false);assert.equal(status.configured,false);
    assert.equal(network,0);assert.equal(bodyRead,0);
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
