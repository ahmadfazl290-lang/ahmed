class CadenceRecorder extends AudioWorkletProcessor {
  constructor(){
    super();this.buffer=new Float32Array(4096);this.used=0;this.total=0;this.stopped=false;
    this.port.onmessage=event=>{if(event.data?.type==='stop')this.finish('stop');};
  }
  flush(){
    if(!this.used)return;
    const chunk=this.buffer.slice(0,this.used);this.port.postMessage({type:'samples',samples:chunk},[chunk.buffer]);this.used=0;
  }
  finish(reason){if(this.stopped)return;this.stopped=true;this.flush();this.port.postMessage({type:'done',reason});}
  process(inputs){
    if(this.stopped)return false;
    const channel=inputs[0]?.[0];
    if(channel)for(let i=0;i<channel.length;i++){
      this.buffer[this.used++]=channel[i];this.total++;
      if(this.used===this.buffer.length)this.flush();
      if(this.total>=sampleRate*20){this.finish('limit');return false;}
    }
    return true;
  }
}
registerProcessor('cadence-pcm-recorder',CadenceRecorder);
