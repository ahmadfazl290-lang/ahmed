import {encodePcmWav} from '../../lib/pronunciation-audio.mjs';

export async function startPronunciationRecording({signal,onLimit=()=>{},onFailure=()=>{}}={}){
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!window.isSecureContext)throw new Error('INSECURE_CONTEXT');
  if(!navigator.mediaDevices?.getUserMedia||!AudioContextClass||!window.AudioWorkletNode)throw new Error('UNSUPPORTED_BROWSER');
  const stream=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true,autoGainControl:true},video:false});
  if(signal?.aborted){stream.getTracks().forEach(track=>track.stop());throw new Error('REQUEST_CANCELLED');}
  let context,node,source,mute,timeout,finishTimeout,settled=false,resolveFinished,rejectFinished;
  const chunks=[];
  const finished=new Promise((resolve,reject)=>{resolveFinished=resolve;rejectFinished=reject;});
  finished.catch(()=>{});
  function release(){
    signal?.removeEventListener('abort',cancel);
    clearTimeout(timeout);clearTimeout(finishTimeout);stream.getTracks().forEach(track=>track.stop());
    if(node){node.port.onmessage=null;node.port.close();node.disconnect();}
    source?.disconnect();mute?.disconnect();
    if(context&&context.state!=='closed')context.close().catch(()=>{});
  }
  function fail(error){if(settled)return;settled=true;release();rejectFinished(error);onFailure(error);}
  function complete(reason){
    if(settled)return;settled=true;
    try{
      const length=chunks.reduce((sum,chunk)=>sum+chunk.length,0),samples=new Float32Array(length);
      let offset=0;for(const chunk of chunks){samples.set(chunk,offset);offset+=chunk.length;}
      const bytes=encodePcmWav(samples,context.sampleRate);release();resolveFinished(bytes);if(reason==='limit')onLimit();
    }catch(error){release();rejectFinished(error);onFailure(error);}
  }
  function stop(){
    if(!settled){node.port.postMessage({type:'stop'});stream.getTracks().forEach(track=>track.stop());finishTimeout??=setTimeout(()=>complete('stop'),1200);}
    return finished;
  }
  function cancel(){if(!settled){settled=true;release();rejectFinished(new Error('REQUEST_CANCELLED'));}}
  signal?.addEventListener('abort',cancel,{once:true});
  try{
    context=new AudioContextClass();
    if(!context.audioWorklet)throw new Error('UNSUPPORTED_BROWSER');
    await context.audioWorklet.addModule('/pcm-recorder.worklet.js');
    if(settled||signal?.aborted)throw new Error('REQUEST_CANCELLED');
    await context.resume();
    if(context.state!=='running')throw new Error('MICROPHONE_UNAVAILABLE');
    source=context.createMediaStreamSource(stream);
    node=new AudioWorkletNode(context,'cadence-pcm-recorder',{channelCount:1,channelCountMode:'explicit'});
    mute=context.createGain();mute.gain.value=0;
    node.port.onmessage=event=>{
      if(event.data?.type==='samples'&&event.data.samples instanceof Float32Array)chunks.push(event.data.samples);
      if(event.data?.type==='done')complete(event.data.reason);
    };
    node.onprocessorerror=()=>fail(new Error('MICROPHONE_UNAVAILABLE'));
    source.connect(node);node.connect(mute);mute.connect(context.destination);
    timeout=setTimeout(()=>{stop();onLimit();},20500);
    return {finished,stop,cancel};
  }catch(error){release();throw error;}
}
