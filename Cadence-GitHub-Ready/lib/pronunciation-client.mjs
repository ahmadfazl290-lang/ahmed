import {inspectPcmWav} from './pronunciation-audio.mjs';

// No provider URL, key or token is ever needed by the browser.
export async function requestPronunciationAssessment({configured,consent,promptId,audio,signal,fetchImpl=fetch}){
  if(configured!==true)throw new Error('NOT_CONFIGURED');
  if(consent!==true)throw new Error('CONSENT_REQUIRED');
  inspectPcmWav(audio);
  const response=await fetchImpl('/api/pronunciation',{
    method:'POST',credentials:'same-origin',cache:'no-store',signal,
    headers:{'Content-Type':'audio/wav','X-Pronunciation-Prompt':promptId},body:audio,
  });
  let data;try{data=await response.json();}catch{throw new Error('AZURE_UNAVAILABLE');}
  if(!response.ok)throw new Error(typeof data?.error?.code==='string'?data.error.code:'AZURE_UNAVAILABLE');
  if(data?.provider!=='Azure Speech'||data.promptId!==promptId||!Array.isArray(data.words)||!Number.isFinite(Date.parse(data.assessedAt))||['pronunciation','accuracy','fluency','completeness'].some(key=>!Number.isFinite(data[key])||data[key]<0||data[key]>100))throw new Error('AZURE_UNAVAILABLE');
  return data;
}
