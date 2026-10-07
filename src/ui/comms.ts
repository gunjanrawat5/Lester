import { type PreviewAction } from '../ai/contracts';
import { CommandMicrophone, recognitionAvailable, recordingAvailable } from '../voice/microphone';
import { ReplyPlayback } from '../voice/playback';
import { BondDialogue } from '../voice/bondDialogue';
import { GuardDialogue } from '../voice/guardDialogue';
import type { GuardInteraction, GuardGameEvent } from '../game/guardInteraction';
export function mountComms(options:{execute(action:PreviewAction):{accepted:boolean;text:string};pause(paused:boolean):void;guard:GuardInteraction;context():unknown}) {
  const root=document.querySelector<HTMLElement>('#comms')!;
  root.innerHTML=`<div class="comms-heading"><span id="comms-title">Q / FIELD COMMS</span><span class="link-led">● FISH AI</span></div>
    <div class="bond-card"><span class="bond-monogram">007</span><div><strong id="contact-name">James Bond</strong><small id="contact-role">FISH AUDIO AGENT</small></div><button id="sound" type="button" aria-pressed="true">Sound on</button></div>
    <div class="guard-interaction"><p id="guard-hint">Move Bond to security to meet the guard.</p><button id="persuade" type="button" disabled>Persuade guard</button><button id="return-q" type="button" hidden>← Return to Q</button><small id="player-role">YOU ARE Q</small></div>
    <p id="mission-state" class="voice-note"></p><div class="command-chips mission-actions"><button type="button" data-command="Hack the camera I just spotted">Hack camera</button><button type="button" data-command="Continue to your previous destination">Continue</button><button type="button" data-command="Get the relic from the vault">Take relic</button><button type="button" data-command="Return to extraction">Extract</button></div>
    <ol id="feed" aria-label="Communications" aria-live="polite"></ol>
    <div class="comms-controls"><label class="tiny" for="voice-provider">VOICE INPUT</label><select id="voice-provider"><option value="fish">Fish Audio</option><option value="browser">Browser speech · Demo fallback</option></select><p id="voice-note" class="voice-note">Checking voice connection…</p>
    <form id="command-form"><label for="transcript" class="tiny" id="input-label">YOUR COMMAND TO BOND</label><textarea id="transcript" rows="3" maxlength="500" placeholder="Bond, go to the main hall…"></textarea><div class="command-buttons"><button id="mic" type="button">◉ Hold to talk</button><button id="send" type="submit">Send →</button></div></form>
    <p id="comms-state" role="status">Ready for your command</p><div class="command-chips"><button type="button" data-command="Bond, go to the main hall">Main hall</button><button type="button" data-command="Bond, go to security">Security</button><button type="button" data-command="Bond, approach the vault">Vault approach</button><button type="button" data-command="Bond, stop">Stop</button></div><p class="demo-note">Bond · Fish Audio agent<br>Get keycard → open vault → collect relic → extract.</p></div>`;
  const input=root.querySelector<HTMLTextAreaElement>('#transcript')!;
  const provider=root.querySelector<HTMLSelectElement>('#voice-provider')!;
  const note=root.querySelector<HTMLElement>('#voice-note')!;
  const mic=root.querySelector<HTMLButtonElement>('#mic')!;
  const send=root.querySelector<HTMLButtonElement>('#send')!;
  const sound=root.querySelector<HTMLButtonElement>('#sound')!;
  const status=root.querySelector<HTMLElement>('#comms-state')!;
  const feed=root.querySelector<HTMLOListElement>('#feed')!;
  const playback=new ReplyPlayback();
  const persuade=root.querySelector<HTMLButtonElement>('#persuade')!;
  const returnQ=root.querySelector<HTMLButtonElement>('#return-q')!;
  const guardHint=root.querySelector<HTMLElement>('#guard-hint')!;
  let busy=false,recording=false,enabled=true,fishSTT=false,connected=false,guardAgent=true,guardTTS=false;
  let guardMode=false,guardChanging=false,guardWaiting=false,modeRevision=0,qDraft='',guardDraft='',lastGuardReply='';
  const setStatus=(text:string)=>{status.textContent=text;};
  const add=(speaker:string,text:string)=>{
    const item=document.createElement('li'),label=document.createElement('span'),body=document.createElement('p');
    label.textContent=speaker;body.textContent=text;item.append(label,body);feed.append(item);
    while(feed.children.length>16)feed.firstElementChild?.remove();feed.scrollTop=feed.scrollHeight;
  };
  const bond=new BondDialogue(options.execute,{
    message:text=>add('BOND',text),
    status:text=>{if(!guardMode&&!recording)setStatus(text);},
    action:(action,outcome)=>add(outcome.accepted?'ORDER ACCEPTED':'ORDER BLOCKED',outcome.text),
  },options.context);
  const dialogue=new GuardDialogue(options.guard,{
    message:text=>{lastGuardReply=text;add('SECURITY GUARD',text);},
    status:text=>{if(guardMode&&!recording&&!guardChanging)setStatus(text);},
    ended:text=>{if(guardMode){exitGuard();setStatus(text);add('COMMS',text);}},
  });
  const refresh=()=>{
    persuade.disabled=busy||!options.guard.available;persuade.hidden=guardMode;
    returnQ.hidden=!guardMode;returnQ.disabled=busy&&!guardChanging&&!guardWaiting;
    guardHint.textContent=guardMode?'Speak as Bond. Convince the guard to lend you his keycard.':options.guard.keycardOwned?'Keycard secured. Return to your mission.':options.guard.suspicion>=100?'The guard has raised the alarm.':options.guard.available?'Guard in range. You can speak as Bond now.':'Move Bond to security to meet the guard.';
    send.disabled=busy;provider.disabled=busy;
    mic.disabled=(busy&&!recording)||!connected||(provider.value==='fish'?!fishSTT||!recordingAvailable:!recognitionAvailable);
    mic.classList.toggle('listening',recording);mic.textContent=recording?'● Release to finish':'◉ Hold to talk';
    mic.setAttribute('aria-pressed',String(recording));
    root.querySelectorAll<HTMLButtonElement>('[data-command]').forEach(button=>button.disabled=busy);
  };
  const describe=()=>{
    note.textContent=provider.value==='fish'?(fishSTT?'Fish Audio transcription · Review before sending.':'Add FISH_API_KEY to .env and restart to enable Fish Audio.'):'Demo fallback · Browser speech may use your browser’s online recognition service.';
    if(guardMode)note.textContent+=guardAgent?' Replies: Fish Audio guard agent.':guardTTS?' Guard reasoning: Demo fallback; Fish Audio guard voice.':' Guard reasoning and voice: Demo fallback.';
    else note.textContent+=' Bond reasoning and replies: Fish Audio agent.';
    refresh();
  };
  function showMode(){
    root.classList.toggle('guard-mode',guardMode);
    root.querySelector('.demo-note')!.innerHTML=guardMode?`Guard dialogue · ${guardAgent?'Fish Audio agent':'Demo fallback'}<br>Your cover story can raise suspicion.`:'Bond · Fish Audio agent<br>Get keycard → open vault → collect relic → extract.';
    root.querySelector('#comms-title')!.textContent=guardMode?'BOND / GUARD DIALOGUE':'Q / FIELD COMMS';
    root.querySelector('#contact-name')!.textContent=guardMode?'Security Guard':'James Bond';
    root.querySelector('.bond-monogram')!.textContent=guardMode?'SEC':'007';
    root.querySelector('#contact-role')!.textContent=guardMode?(guardAgent?'FISH AUDIO AGENT':'DEMO GUARD'):'FISH AUDIO AGENT';
    root.querySelector('#player-role')!.textContent=guardMode?'YOU ARE JAMES BOND':'YOU ARE Q';
    root.querySelector('#input-label')!.textContent=guardMode?'SAY TO THE GUARD AS BOND':'YOUR COMMAND TO BOND';
    input.placeholder=guardMode?'I’m here for the scheduled maintenance…':'Bond, go to the main hall…';
    root.querySelector<HTMLElement>('.mission-actions')!.hidden=guardMode;
    const chips=Array.from(root.querySelectorAll<HTMLButtonElement>('.comms-controls [data-command]'));
    const values=guardMode?[['Introduce yourself','I am the maintenance technician.'],['Work order','I have the scheduled work order from your supervisor.'],['Access request','I can sign out the card in your logbook and return the card.'],['Ask guard','What do you need to confirm my access?']]:[['Main hall','Bond, go to the main hall'],['Security','Bond, go to security'],['Vault approach','Bond, approach the vault'],['Stop','Bond, stop']];
    chips.forEach((button,i)=>{button.textContent=values[i][0];button.dataset.command=values[i][1];});
    describe();
  }
  function exitGuard(){
    microphone.release(true);modeRevision++;guardMode=false;guardChanging=false;guardWaiting=false;busy=false;
    guardDraft=input.value;input.value=qDraft;playback.stop();void dialogue.end();options.pause(false);showMode();setStatus('Back as Q · Ready for your command');
  }
  persuade.addEventListener('click',async()=>{
    if(busy||!options.guard.available)return;
    const revision=++modeRevision;qDraft=input.value;input.value=guardDraft;guardMode=true;guardChanging=true;busy=true;playback.stop();void bond.end();options.pause(true);showMode();setStatus(guardAgent?'Connecting to guard agent…':'Speaking as Bond · Demo guard');
    add('ROLE SWITCH','You are James Bond. Your speech now addresses the security guard.');
    try{
      await dialogue.start(guardAgent,enabled);
      if(revision!==modeRevision)return;
      setStatus(guardAgent?'Speaking as Bond · Hold to talk or type':'Speaking as Bond · Demo guard dialogue');
      if(!guardAgent&&enabled)void playback.speak(lastGuardReply,guardTTS,setStatus,message=>setStatus(message),'guard_1');
    }catch(error){if(revision===modeRevision){const message=error instanceof Error?error.message:'Could not connect to the guard.';exitGuard();setStatus(message);add('COMMS',message);}}
    finally{if(revision===modeRevision){busy=false;guardChanging=false;options.pause(false);refresh();}}
  });
  returnQ.addEventListener('click',exitGuard);
  const microphone=new CommandMicrophone({
    status:text=>{setStatus(text);if(text.startsWith('Transcribing')){recording=false;refresh();}},
    transcript:text=>{input.value=text;add(guardMode?'BOND / TRANSCRIPT':'Q / TRANSCRIPT',text);setStatus('Transcript ready. Review it, then press Send.');input.focus();},
    error:message=>{setStatus(message);add('COMMS',message);},
    finished:()=>{busy=false;recording=false;options.pause(false);refresh();},
  });
  const begin=()=>{
    if(mic.disabled||busy)return;playback.stop();bond.interrupt();dialogue.interrupt();busy=true;recording=true;options.pause(true);refresh();void microphone.start(provider.value as 'fish'|'browser');
  };
  const end=(cancel=false)=>{
    if(!recording)return;recording=false;if(cancel)setStatus('Recording canceled. No command sent.');refresh();microphone.release(cancel);
  };
  mic.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();mic.setPointerCapture(event.pointerId);begin();});
  mic.addEventListener('pointerup',()=>end());mic.addEventListener('pointercancel',()=>end(true));mic.addEventListener('lostpointercapture',()=>end());
  mic.addEventListener('keydown',event=>{if((event.code==='Space'||event.code==='Enter')&&!event.repeat){event.preventDefault();begin();}});
  mic.addEventListener('keyup',event=>{if(event.code==='Space'||event.code==='Enter'){event.preventDefault();end();}});
  window.addEventListener('blur',()=>end(true));
  document.addEventListener('visibilitychange',()=>{if(document.hidden){microphone.release(true);recording=false;playback.stop();if(guardMode)exitGuard();else void bond.end();}});
  provider.addEventListener('change',describe);
  sound.addEventListener('click',()=>{enabled=!enabled;sound.textContent=enabled?'Sound on':'Sound off';sound.setAttribute('aria-pressed',String(enabled));dialogue.setSound(enabled);bond.setSound(enabled);if(!enabled){playback.stop();if(!busy)setStatus('Sound muted · Captions remain available');}});
  root.querySelectorAll<HTMLButtonElement>('[data-command]').forEach(button=>button.addEventListener('click',()=>{input.value=button.dataset.command!;input.focus();}));
  root.querySelector<HTMLFormElement>('#command-form')!.addEventListener('submit',async event=>{
    event.preventDefault();const text=input.value.trim();if(!text||busy)return;
    if(guardMode){
      const revision=modeRevision;playback.stop();dialogue.unlockAudio();busy=true;guardWaiting=true;options.pause(true);refresh();setStatus('Guard considering your story…');add('BOND (YOU)',text);
      try{
        const outcome=await dialogue.send(text);
        if(revision!==modeRevision)return;
        input.value='';setStatus(outcome.alarmTriggered?'The guard has raised the alarm.':outcome.keycardGranted?'Keycard received. Return to Q when ready.':'Speaking as Bond · Hold to talk or type');
        if(!dialogue.isLive&&enabled)void playback.speak(lastGuardReply,guardTTS,state=>{if(revision===modeRevision)setStatus(state);},message=>{if(revision===modeRevision)setStatus(message);},'guard_1');
      }catch(error){if(revision===modeRevision)setStatus(error instanceof Error?error.message:'Guard reply unavailable. Your draft is retained.');}
      finally{if(revision===modeRevision){busy=false;guardWaiting=false;options.pause(false);refresh();}}
      return;
    }
    const revision=modeRevision;
    playback.stop();busy=true;options.pause(true);refresh();setStatus('Connecting to Bond…');add('Q',text);
    try{
      const acted=await bond.send(text);
      if(revision===modeRevision){input.value='';setStatus(acted?'Ready for your command':'Bond replied · Awaiting your next order.');}
    }catch(error){if(revision===modeRevision)setStatus(error instanceof Error?error.message:'Bond is unavailable. Your draft is retained.');}
    finally{if(revision===modeRevision){busy=false;options.pause(false);refresh();}}
  });
  add('COMMS','Send an order to connect to your Fish Audio Bond agent.');refresh();
  void fetch('/api/health',{signal:AbortSignal.timeout(5000)}).then(async response=>{
    if(!response.ok)throw new Error();const config=await response.json();fishSTT=config.fishSTT===true;connected=true;guardAgent=true;guardTTS=config.guardTTS===true;
    provider.value=fishSTT?'fish':'browser';describe();
  }).catch(()=>{connected=true;provider.value='browser';describe();setStatus('Local API offline. Bond text still connects directly; browser speech input is available.');});
  return {
    async report(text:string){
      const revision=modeRevision;add('BOND / CAMERA DISCOVERY',text);busy=true;options.pause(true);refresh();setStatus('Bond reporting a camera…');
      try{await bond.send(text,false);if(revision===modeRevision)setStatus('Holding position · Hack the camera or continue.');}
      catch(error){if(revision===modeRevision){setStatus('Camera spotted. Spoken report unavailable; choose hack or continue.');add('VOICE',error instanceof Error?error.message:'Report unavailable.');}}
      finally{if(revision===modeRevision){busy=false;options.pause(false);refresh();}}
    },
    missionState(text:string){root.querySelector('#mission-state')!.textContent=text;refresh();},
    notify(text:string){add('BOND / FIELD UPDATE',text);refresh();},
    guardAvailability(){refresh();},
    guardEvent(event:GuardGameEvent){
      if(event.type==='SUSPICION_CHANGED')add('GUARD REACTION',`The guard is becoming suspicious. ${event.reason}`);
      else if(event.type==='KEYCARD_ACQUIRED')add('MISSION',event.reason);
      else if(event.type==='ALARM_TRIGGERED')add('MISSION',event.reason);
      else add('GUARD REACTION','The guard finds your story more credible.');
      refresh();
    },
  };
}
