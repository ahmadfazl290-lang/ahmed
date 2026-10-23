import {PRONUNCIATION_PROMPTS} from '../components/cadence/pronunciation-data.js';
import {MAX_WAV_BYTES,MAX_AUDIO_SECONDS,inspectPcmWav} from './pronunciation-audio.mjs';

const json=(body,status=200,headers={})=>Response.json(body,{status,headers:{'Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers}});
const fail=(code,status,headers)=>json({error:{code}},status,headers);

export function speechConfiguration(values={}){
  const key=typeof values.key==='string'?values.key.trim():'';
  const region=typeof values.region==='string'?values.region.trim().toLowerCase():'';
  const tier=values.tier||'F0';
  const endpoint=typeof values.endpoint==='string'?values.endpoint.trim():'';
  let base='';
  if(endpoint){
    try{
      const url=new URL(endpoint);
      if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash||url.pathname!=='/'||!(/^[a-z0-9][a-z0-9-]{0,62}\.cognitiveservices\.azure\.com$/i).test(url.hostname))return null;
      base=url.origin+'/stt';
    }catch{return null;}
  }else if(/^[a-z][a-z0-9]{1,30}$/.test(region))base=`https://${region}.stt.speech.microsoft.com`;
  if(!key||key.length>512||tier!=='F0'||!base)return null;
  return {key,url:base+'/speech/recognition/conversation/cognitiveservices/v1?language=en-US&format=detailed'};
}

export function normalizePronunciationResult(data){
  if(data?.RecognitionStatus!=='Success')throw new Error('NO_SPEECH');
  const best=data.NBest?.[0],scores=best?.PronunciationAssessment||best;
  const score=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100?Math.round(value):null;
  const normalized={pronunciation:score(scores?.PronScore),accuracy:score(scores?.AccuracyScore),fluency:score(scores?.FluencyScore),completeness:score(scores?.CompletenessScore)};
  if(Object.values(normalized).some(value=>value===null))throw new Error('INVALID_RESPONSE');
  const words=(Array.isArray(best.Words)?best.Words:[]).slice(0,150).filter(word=>typeof word?.Word==='string').map(word=>{
    const detail=word.PronunciationAssessment||word;
    return {word:word.Word.slice(0,100),accuracy:score(detail.AccuracyScore),error:['None','Omission','Insertion','Mispronunciation'].includes(detail.ErrorType)?detail.ErrorType:'None'};
  });
  return {provider:'Azure Speech',language:'en-US',...normalized,transcript:typeof best.Display==='string'?best.Display.slice(0,1200):typeof data.DisplayText==='string'?data.DisplayText.slice(0,1200):'',words};
}

async function boundedAudio(request){
  const declared=request.headers.get('content-length');
  if(declared&&(!/^\d+$/.test(declared)||Number(declared)>MAX_WAV_BYTES))throw new Error('TOO_LARGE');
  if(!request.body)throw new Error('INVALID_AUDIO');
  const reader=request.body.getReader(),chunks=[];
  let size=0;
  try{
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>MAX_WAV_BYTES){await reader.cancel();throw new Error('TOO_LARGE');}chunks.push(value);}
  }finally{reader.releaseLock();}
  const audio=new Uint8Array(size);let offset=0;
  for(const chunk of chunks){audio.set(chunk,offset);offset+=chunk.length;}
  return audio;
}

export function createPronunciationHandlers({getConfig=()=>({}),fetchImpl=fetch,now=Date.now,timeoutMs=25000}={}){
  // Best-effort instance limits. Azure F0 remains the authoritative account quota.
  const attempts=new Map();let active=false;
  return {
    async GET(){return json({configured:!!speechConfiguration(getConfig?.()),provider:'Azure Speech',maxSeconds:MAX_AUDIO_SECONDS});},
    async POST(request){
      if(request.headers.get('origin')!==new URL(request.url).origin)return fail('INVALID_ORIGIN',403);
      const config=speechConfiguration(getConfig?.());
      if(!config)return fail('NOT_CONFIGURED',503);
      const prompt=PRONUNCIATION_PROMPTS.find(item=>item.id===request.headers.get('x-pronunciation-prompt'));
      if(!prompt)return fail('INVALID_PROMPT',400);
      if(request.headers.get('content-type')?.split(';')[0].trim().toLowerCase()!=='audio/wav')return fail('INVALID_AUDIO',415);
      const stamp=now(),ip=(request.headers.get('cf-connecting-ip')||request.headers.get('x-forwarded-for')?.split(',')[0]||'anonymous').trim().slice(0,100);
      for(const [key,value]of attempts)if(stamp-value.start>=60000)attempts.delete(key);
      const bucket=attempts.get(ip)||{start:stamp,count:0};
      if(bucket.count>=4||attempts.size>=500&&!attempts.has(ip))return fail('RATE_LIMIT',429,{'Retry-After':'60'});
      if(active)return fail('SERVICE_BUSY',429,{'Retry-After':'10'});
      bucket.count++;attempts.set(ip,bucket);active=true;
      let timer,controller,onAbort;
      try{
        const audio=await boundedAudio(request),recording=inspectPcmWav(audio);
        if(recording.rms<0.002)return fail('NO_SPEECH',422);
        controller=new AbortController();onAbort=()=>controller.abort();
        request.signal.addEventListener('abort',onAbort,{once:true});
        if(request.signal.aborted)return fail('REQUEST_CANCELLED',408);
        timer=setTimeout(()=>controller.abort(),timeoutMs);
        const assessment={ReferenceText:prompt.text,GradingSystem:'HundredMark',Granularity:'Word',Dimension:'Comprehensive',EnableMiscue:true};
        const encoded=btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(assessment))));
        const response=await fetchImpl(config.url,{method:'POST',headers:{'Ocp-Apim-Subscription-Key':config.key,'Content-Type':'audio/wav; codecs=audio/pcm; samplerate=16000',Accept:'application/json','Pronunciation-Assessment':encoded},body:audio,signal:controller.signal,redirect:'error'});
        if(response.status===401||response.status===403)return fail('AZURE_CONFIGURATION',503);
        if(response.status===429)return fail('AZURE_QUOTA',429,{'Retry-After':'60'});
        if(!response.ok)return fail('AZURE_UNAVAILABLE',502);
        let data;try{data=await response.json();}catch{return fail('AZURE_UNAVAILABLE',502);}
        if(['NoMatch','InitialSilenceTimeout','BabbleTimeout','EndOfDictation'].includes(data?.RecognitionStatus))return fail('NO_SPEECH',422);
        const result=normalizePronunciationResult(data);
        return json({...result,promptId:prompt.id,seconds:Math.round(recording.seconds*10)/10,assessedAt:new Date(now()).toISOString()});
      }catch(error){
        if(error?.message==='TOO_LARGE')return fail('TOO_LARGE',413);
        if(['INVALID_AUDIO','AUDIO_DURATION'].includes(error?.message))return fail(error.message,400);
        if(error?.message==='NO_SPEECH')return fail('NO_SPEECH',422);
        if(error?.name==='AbortError'||controller?.signal.aborted)return fail(request.signal.aborted?'REQUEST_CANCELLED':'AZURE_TIMEOUT',request.signal.aborted?408:504);
        return fail('AZURE_UNAVAILABLE',502);
      }finally{
        clearTimeout(timer);if(onAbort)request.signal.removeEventListener('abort',onAbort);active=false;
      }
    }
  };
}
