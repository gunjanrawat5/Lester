export class ReplyPlayback {
  private audio?: HTMLAudioElement;
  private url?: string;
  private controller?: AbortController;
  private revision = 0;
  stop() {
    this.revision++; this.controller?.abort(); this.controller=undefined;
    this.audio?.pause();this.audio=undefined;
    if(this.url)URL.revokeObjectURL(this.url);this.url=undefined;
    window.speechSynthesis?.cancel();
  }
  async speak(text:string,fish:boolean,onState:(state:string)=>void,onError:(text:string)=>void,agent:'bond'|'guard_1'='bond'){
    this.stop();const revision=this.revision;
    if(fish){
      const controller=this.controller=new AbortController();
      const timeout=window.setTimeout(()=>controller.abort(),18000);
      try {
        onState(agent==='bond'?'Preparing Bond’s voice…':'Preparing guard’s voice…');
        const response=await fetch('/api/speak',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agent,text}),signal:controller.signal});
        if(!response.ok){const data=await response.json();throw new Error(data.error||'Spoken reply unavailable.');}
        const blob=await response.blob();if(revision!==this.revision)return;
        this.url=URL.createObjectURL(blob);this.audio=new Audio(this.url);
        this.audio.onended=()=>{if(revision===this.revision){onState('Ready for your command');this.stop();}};
        this.audio.onerror=()=>{if(revision===this.revision){onError('Audio playback failed. The caption is still available.');this.stop();}};
        onState(agent==='bond'?'Bond speaking…':'Guard speaking…');await this.audio.play();
      }catch(error){if(revision===this.revision){onError(error instanceof Error && error.name!=='AbortError'?error.message:'Spoken reply timed out. Captions remain available.');this.stop();}}
      finally{window.clearTimeout(timeout);}
    }else if(window.speechSynthesis){
      const utterance=new SpeechSynthesisUtterance(text);utterance.lang='en-GB';utterance.rate=.95;
      const voice=speechSynthesis.getVoices().find(v=>v.lang==='en-GB');if(voice)utterance.voice=voice;
      utterance.onend=()=>{if(revision===this.revision)onState('Ready for your command');};
      utterance.onerror=()=>{if(revision===this.revision)onError('Browser speech unavailable. The caption is still available.');};
      onState(agent==='bond'?'Bond speaking · Demo fallback':'Guard speaking · Demo fallback');speechSynthesis.speak(utterance);
    }else onError('Speech playback unavailable. The caption is still available.');
  }
}
