export const PCM_SAMPLE_RATE=16000;
export const MAX_AUDIO_SECONDS=20;
export const MAX_WAV_BYTES=44+PCM_SAMPLE_RATE*2*MAX_AUDIO_SECONDS;

// Downsample the microphone's native rate before creating uncompressed mono PCM.
export function encodePcmWav(samples,inputRate){
  if(!(samples instanceof Float32Array)||!samples.length||!Number.isFinite(inputRate)||inputRate<8000||inputRate>192000)throw new Error('INVALID_AUDIO');
  const length=Math.min(Math.floor(samples.length*PCM_SAMPLE_RATE/inputRate),PCM_SAMPLE_RATE*MAX_AUDIO_SECONDS);
  if(length<1)throw new Error('INVALID_AUDIO');
  const bytes=new Uint8Array(44+length*2),view=new DataView(bytes.buffer);
  const text=(at,value)=>{for(let i=0;i<value.length;i++)view.setUint8(at+i,value.charCodeAt(i));};
  text(0,'RIFF');view.setUint32(4,bytes.length-8,true);text(8,'WAVE');text(12,'fmt ');
  view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,1,true);view.setUint32(24,PCM_SAMPLE_RATE,true);
  view.setUint32(28,PCM_SAMPLE_RATE*2,true);view.setUint16(32,2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,length*2,true);
  const ratio=inputRate/PCM_SAMPLE_RATE;
  for(let i=0;i<length;i++){
    const start=i*ratio,end=(i+1)*ratio;
    let sample=0;
    if(ratio>=1){
      for(let j=Math.floor(start);j<Math.ceil(end)&&j<samples.length;j++)sample+=(Number.isFinite(samples[j])?samples[j]:0)*Math.max(0,Math.min(end,j+1)-Math.max(start,j));
      sample/=ratio;
    }else{
      const left=Math.floor(start),fraction=start-left;
      const a=Number.isFinite(samples[left])?samples[left]:0,b=Number.isFinite(samples[Math.min(left+1,samples.length-1)])?samples[Math.min(left+1,samples.length-1)]:0;
      sample=a+(b-a)*fraction;
    }
    sample=Math.max(-1,Math.min(1,sample));
    view.setInt16(44+i*2,Math.round(sample*(sample<0?32768:32767)),true);
  }
  return bytes;
}

export function inspectPcmWav(bytes){
  if(!(bytes instanceof Uint8Array)||bytes.length<44||bytes.length>MAX_WAV_BYTES)throw new Error('INVALID_AUDIO');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const text=at=>String.fromCharCode(...bytes.slice(at,at+4));
  const dataLength=view.getUint32(40,true);
  if(text(0)!=='RIFF'||text(8)!=='WAVE'||text(12)!=='fmt '||text(36)!=='data'||view.getUint32(4,true)!==bytes.length-8||view.getUint32(16,true)!==16||view.getUint16(20,true)!==1||view.getUint16(22,true)!==1||view.getUint32(24,true)!==PCM_SAMPLE_RATE||view.getUint32(28,true)!==PCM_SAMPLE_RATE*2||view.getUint16(32,true)!==2||view.getUint16(34,true)!==16||dataLength!==bytes.length-44||dataLength%2)throw new Error('INVALID_AUDIO');
  const seconds=dataLength/(PCM_SAMPLE_RATE*2);
  if(seconds<1||seconds>MAX_AUDIO_SECONDS)throw new Error('AUDIO_DURATION');
  let energy=0;
  for(let i=44;i<bytes.length;i+=2){const value=view.getInt16(i,true)/32768;energy+=value*value;}
  return {seconds,rms:Math.sqrt(energy/(dataLength/2))};
}
