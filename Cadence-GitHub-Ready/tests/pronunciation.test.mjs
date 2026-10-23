import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createPronunciationHandlers,speechConfiguration,normalizePronunciationResult} from '../lib/pronunciation-service.mjs';
import {encodePcmWav,inspectPcmWav,MAX_WAV_BYTES} from '../lib/pronunciation-audio.mjs';
import {PRONUNCIATION_PROMPTS} from '../components/cadence/pronunciation-data.js';
import {requestPronunciationAssessment} from '../lib/pronunciation-client.mjs';

const config={key:'private-unit-test-value',region:'eastus',tier:'F0'};
const success={RecognitionStatus:'Success',NBest:[{Display:'Good morning.',AccuracyScore:84.4,FluencyScore:79.8,CompletenessScore:100,PronScore:85.3,Words:[{Word:'good',AccuracyScore:90,ErrorType:'None'},{Word:'morning',AccuracyScore:72,ErrorType:'Mispronunciation'}]}]};
function audio(seconds=1,rate=16000){return encodePcmWav(Float32Array.from({length:seconds*rate},(_,i)=>Math.sin(i*2*Math.PI*220/rate)*0.3),rate);}
function request(bytes=audio(),headers={}){return new Request('https://cadence.test/api/pronunciation',{method:'POST',headers:{origin:'https://cadence.test','Content-Type':'audio/wav','X-Pronunciation-Prompt':PRONUNCIATION_PROMPTS[0].id,...headers},body:bytes});}
function server(overrides={}){return createPronunciationHandlers({getConfig:()=>config,fetchImpl:async()=>Response.json(success),...overrides});}

test('microphone samples become bounded 16 kHz mono PCM WAV and preserve speech energy',()=>{
  const wav=audio(2,48000),details=inspectPcmWav(wav),view=new DataView(wav.buffer);
  assert.equal(wav.length,44+2*16000*2);assert.equal(view.getUint32(24,true),16000);assert.equal(details.seconds,2);assert.ok(details.rms>0.1);
  assert.equal(audio(21).length,MAX_WAV_BYTES);
  assert.throws(()=>encodePcmWav(new Float32Array(),16000));
  const clipped=encodePcmWav(Float32Array.from([2,-2,NaN,Infinity]),16000),samples=new DataView(clipped.buffer);
  assert.equal(samples.getInt16(44,true),32767);assert.equal(samples.getInt16(46,true),-32768);assert.equal(samples.getInt16(48,true),0);
});

test('WAV validation rejects wrong encoding, mismatched payloads and invalid duration',()=>{
  for(const at of [0,8,12,20,22,24,28,32,34,36,40]){const wav=audio();wav[at]^=1;assert.throws(()=>inspectPcmWav(wav));}
  assert.throws(()=>inspectPcmWav(audio().slice(0,-2)));assert.throws(()=>inspectPcmWav(new Uint8Array(MAX_WAV_BYTES+1)));
  assert.throws(()=>inspectPcmWav(audio(0.5)),/AUDIO_DURATION/);
});

test('F0 settings accept only Azure hosts and never enable a declared paid tier',()=>{
  assert.ok(speechConfiguration(config)?.url.startsWith('https://eastus.stt.speech.microsoft.com/'));
  assert.equal(speechConfiguration({}),null);assert.equal(speechConfiguration({...config,tier:'S0'}),null);
  assert.equal(speechConfiguration({...config,tier:undefined}),null);
  assert.equal(speechConfiguration({...config,key:'REPLACE_ME'}),null);
  const valid=speechConfiguration({...config,endpoint:'https://cadence-speech.cognitiveservices.azure.com/'});
  assert.ok(valid.url.includes('.azure.com/stt/speech/recognition/'));
  for(const endpoint of ['http://cadence.cognitiveservices.azure.com/','https://other.test/','https://cadence.cognitiveservices.azure.com.attacker.test/','https://user:pass@cadence.cognitiveservices.azure.com/','https://cadence.cognitiveservices.azure.com/private','https://cadence.cognitiveservices.azure.com/?token=x','https://cadence.cognitiveservices.azure.com:444/'])assert.equal(speechConfiguration({...config,endpoint}),null);
  assert.equal(speechConfiguration({...config,region:'eastus.attacker.test/path'}),null);
});

test('missing Azure settings expose no secrets and make no external requests',async()=>{
  let calls=0;const api=server({getConfig:()=>({}),fetchImpl:async()=>{calls++;throw new Error();}});
  const status=await api.GET();assert.deepEqual(await status.json(),{configured:false,provider:'Azure Speech',maxSeconds:20});
  const response=await api.POST(request());assert.equal(response.status,503);assert.equal((await response.json()).error.code,'NOT_CONFIGURED');assert.equal(calls,0);
});

test('origin, prompt, format and oversize audio are checked before Azure receives anything',async()=>{
  let calls=0;const api=server({fetchImpl:async()=>{calls++;return Response.json(success);}});
  assert.equal((await api.POST(request(audio(),{origin:'https://other.test'}))).status,403);
  assert.equal((await api.POST(request(audio(),{'X-Pronunciation-Prompt':'invented'}))).status,400);
  assert.equal((await api.POST(request(audio(),{'Content-Type':'audio/webm'}))).status,415);
  assert.equal((await api.POST(request(new Uint8Array(MAX_WAV_BYTES+1)))).status,413);
  assert.equal((await api.POST(request(new Uint8Array(44)))).status,400);
  assert.equal(calls,0);
});

test('silent recordings receive no invented score and are not sent to Azure',async()=>{
  let calls=0;const api=server({fetchImpl:async()=>{calls++;return Response.json(success);}});
  const response=await api.POST(request(encodePcmWav(new Float32Array(16000),16000)));
  assert.equal(response.status,422);assert.equal((await response.json()).error.code,'NO_SPEECH');assert.equal(calls,0);
});

test('assessment sends only approved reference text and baseline parameters with a server-only key',async()=>{
  let calls=0;const api=server({fetchImpl:async(url,options)=>{
    calls++;assert.ok(url.includes('language=en-US&format=detailed'));
    assert.equal(options.headers['Ocp-Apim-Subscription-Key'],config.key);
    assert.equal(options.redirect,'error');assert.equal(options.headers['Content-Type'],'audio/wav; codecs=audio/pcm; samplerate=16000');
    const parameters=JSON.parse(atob(options.headers['Pronunciation-Assessment']));
    assert.equal(parameters.ReferenceText,PRONUNCIATION_PROMPTS[0].text);assert.equal(parameters.EnableMiscue,true);assert.equal(parameters.GradingSystem,'HundredMark');
    assert.ok(!('EnableProsodyAssessment' in parameters));assert.ok(!('ScenarioId' in parameters));assert.ok(options.body instanceof Uint8Array);
    return Response.json(success);
  }});
  const response=await api.POST(request());assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
  const text=await response.text();assert.ok(!text.includes(config.key));const result=JSON.parse(text);
  assert.equal(result.pronunciation,85);assert.equal(result.fluency,80);assert.equal(result.completeness,100);assert.equal(result.words[1].error,'Mispronunciation');assert.equal(calls,1);
});

test('both documented REST and nested score shapes normalize without making up missing values',()=>{
  const best=success.NBest[0];const nested={RecognitionStatus:'Success',NBest:[{Display:'Good morning.',PronunciationAssessment:{AccuracyScore:84.4,FluencyScore:79.8,CompletenessScore:100,PronScore:85.3},Words:best.Words.map(word=>({Word:word.Word,PronunciationAssessment:word}))}]};
  assert.deepEqual(normalizePronunciationResult(nested),normalizePronunciationResult(success));
  assert.throws(()=>normalizePronunciationResult({RecognitionStatus:'Success',NBest:[{AccuracyScore:95}]}),/INVALID_RESPONSE/);
  assert.throws(()=>normalizePronunciationResult({...success,NBest:[{...best,PronScore:101}]}),/INVALID_RESPONSE/);
});

test('Azure authorization, quota, no-speech and malformed responses become safe errors',async()=>{
  for(const [upstream,expected,code]of [[new Response('secret upstream diagnostics',{status:401}),503,'AZURE_CONFIGURATION'],[new Response('quota',{status:429}),429,'AZURE_QUOTA'],[Response.json({RecognitionStatus:'InitialSilenceTimeout'}),422,'NO_SPEECH'],[Response.json({RecognitionStatus:'Success',NBest:[]}),502,'AZURE_UNAVAILABLE'],[new Response('invalid json'),502,'AZURE_UNAVAILABLE']]){
    const response=await server({fetchImpl:async()=>upstream}).POST(request());assert.equal(response.status,expected);const body=await response.text();assert.equal(JSON.parse(body).error.code,code);assert.ok(!body.includes('secret upstream'));assert.ok(!body.includes(config.key));
  }
});

test('request throttling resets after a minute and busy requests do not start another Azure call',async()=>{
  let stamp=0,calls=0;const api=server({now:()=>stamp,fetchImpl:async()=>{calls++;return Response.json(success);}});
  for(let i=0;i<4;i++)assert.equal((await api.POST(request())).status,200);
  assert.equal((await api.POST(request())).status,429);assert.equal(calls,4);stamp=60001;assert.equal((await api.POST(request())).status,200);
  let release;const gate=new Promise(resolve=>{release=resolve;});
  const concurrent=server({fetchImpl:async()=>{await gate;return Response.json(success);}});
  const first=concurrent.POST(request());const second=await concurrent.POST(request());assert.equal(second.status,429);assert.equal((await second.json()).error.code,'SERVICE_BUSY');release();assert.equal((await first).status,200);
});

test('timeouts cancel the provider request and release its slot',async()=>{
  const api=server({timeoutMs:10,fetchImpl:async(_url,{signal})=>new Promise((_resolve,reject)=>{signal.addEventListener('abort',()=>reject(new DOMException('timed out','AbortError')),{once:true});})});
  const response=await api.POST(request());assert.equal(response.status,504);assert.equal((await response.json()).error.code,'AZURE_TIMEOUT');
  assert.equal((await api.POST(request())).status,504);
});

test('a stalled upload times out before contacting Azure and releases the concurrency slot',async()=>{
  let cancelled=false,calls=0;
  const api=server({timeoutMs:10,fetchImpl:async()=>{calls++;return Response.json(success);}});
  const stream=new ReadableStream({cancel(){cancelled=true;}});
  const upload=new Request('https://cadence.test/api/pronunciation',{method:'POST',headers:{origin:'https://cadence.test','Content-Type':'audio/wav','X-Pronunciation-Prompt':PRONUNCIATION_PROMPTS[0].id},body:stream,duplex:'half'});
  const timedOut=await api.POST(upload);assert.equal(timedOut.status,504);assert.equal((await timedOut.json()).error.code,'AZURE_TIMEOUT');
  assert.equal(cancelled,true);assert.equal(calls,0);assert.equal((await api.POST(request())).status,200);
});

test('the browser never uploads without configured assessment and explicit consent',async()=>{
  let calls=0;const options={audio:audio(),promptId:PRONUNCIATION_PROMPTS[0].id,fetchImpl:async()=>{calls++;throw Error('Unexpected request');}};
  await assert.rejects(requestPronunciationAssessment({...options,configured:false,consent:true}),/NOT_CONFIGURED/);
  await assert.rejects(requestPronunciationAssessment({...options,configured:true,consent:false}),/CONSENT_REQUIRED/);
  assert.equal(calls,0);
});

test('the browser posts audio to its own server and accepts actual normalized scores only',async()=>{
  const promptId=PRONUNCIATION_PROMPTS[0].id;
  const assessed={...normalizePronunciationResult(success),promptId,assessedAt:'2026-10-23T00:00:00Z'};
  const options={configured:true,consent:true,audio:audio(),promptId};
  const actual=await requestPronunciationAssessment({...options,fetchImpl:async(url,init)=>{
    assert.equal(url,'/api/pronunciation');assert.equal(init.method,'POST');assert.equal(init.credentials,'same-origin');
    assert.deepEqual(Object.keys(init.headers).sort(),['Content-Type','X-Pronunciation-Prompt']);
    return Response.json(assessed);
  }});
  assert.deepEqual(actual,assessed);
  await assert.rejects(requestPronunciationAssessment({...options,fetchImpl:async()=>Response.json({...assessed,pronunciation:NaN})}),/AZURE_UNAVAILABLE/);
  await assert.rejects(requestPronunciationAssessment({...options,fetchImpl:async()=>Response.json({error:{code:'AZURE_QUOTA'}},{status:429})}),/AZURE_QUOTA/);
});

test('microphone worklet flushes on stop and automatically caps samples at twenty seconds',()=>{
  let Recorder;const messages=[];
  const context={Float32Array,sampleRate:16000,AudioWorkletProcessor:class{constructor(){this.port={postMessage:message=>messages.push(message),onmessage:null};}},registerProcessor:(_name,type)=>{Recorder=type;}};
  vm.runInNewContext(readFileSync(new URL('../public/pcm-recorder.worklet.js',import.meta.url),'utf8'),context);
  const recorder=new Recorder();for(let i=0;i<2501;i++)recorder.process([[new Float32Array(128).fill(0.1)]]);
  const count=messages.filter(message=>message.type==='samples').reduce((sum,message)=>sum+message.samples.length,0);
  assert.equal(count,16000*20);assert.equal(messages.filter(message=>message.type==='done').length,1);assert.equal(messages.at(-1).reason,'limit');
  messages.length=0;const short=new Recorder();short.process([[new Float32Array(128)]]);short.port.onmessage({data:{type:'stop'}});assert.equal(messages[0].samples.length,128);assert.equal(messages.at(-1).reason,'stop');
});
