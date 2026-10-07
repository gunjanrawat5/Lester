import type {PreviewAction} from '../ai/contracts';
import {CommandMicrophone,recognitionAvailable,recordingAvailable} from '../voice/microphone';
import {BondDialogue} from '../voice/bondDialogue';
import {GuardDialogue} from '../voice/guardDialogue';
import type {GuardInteraction,GuardGameEvent} from '../game/guardInteraction';
import {icon,portrait} from './icons';
export type CommsState={alarm:number;hacksRemaining:number;keycardOwned:boolean;relicOwned:boolean;vaultOpen:boolean;complete:boolean;failed:boolean};
export function mountComms(options:{execute(action:PreviewAction):{accepted:boolean;text:string};pause(paused:boolean):void;guard:GuardInteraction;context():unknown}){
 const root=document.querySelector<HTMLElement>('#comms')!;
 const wave=()=>`<span class="wave" aria-hidden="true">${Array.from({length:17},(_,i)=>`<i style="--height:${[5,10,17,28,19,40,52,30,64,36,47,27,35,18,25,10,4][i]}px;--delay:${i*-.09}s"></i>`).join('')}</span>`;
 root.innerHTML=`<div class="comms-heading"><span class="secure-dot"></span><span id="comms-title">SECURE CONNECTION</span><button class="icon-button" id="settings" aria-label="Voice settings">${icon('gear')}</button></div>
 <section class="alarm-panel" aria-label="Alarm level"><div class="alarm-heading"><span>ALARM</span><strong><b id="alarm-value">0</b> / 100</strong></div><div id="alarm-meter" role="progressbar" aria-label="Mission alarm" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">${Array.from({length:36},(_,i)=>`<i class="${i<12?'safe':i<24?'warning':'danger'}"></i>`).join('')}</div><p id="alarm-event" aria-live="polite">Remain unseen. Keep your cover.</p></section>
 <div class="resource-row"><span>${icon('gear')}<small>OVERRIDES</small><b id="hack-value">2</b></span><span>${icon('card')}<small>KEYCARD</small><b id="keycard-value">—</b></span><span>${icon('relic')}<small>RELIC</small><b id="relic-value">—</b></span></div>
 <div class="guard-interaction"><p id="guard-hint">Reach security to meet the guard.</p><div><button id="persuade" disabled>Persuade guard</button><button id="return-q" hidden>← Return to Q</button><button id="knockdown" class="danger-button" hidden>Knock down guard · +20</button></div><small id="player-role">YOU ARE Q</small></div>
 <section class="voice-console"><div class="voice-orb-row">${wave()}<button id="mic" aria-label="Start voice command" aria-pressed="false">${icon('mic')}<span id="mic-label">TALK TO Q</span></button>${wave()}</div><button id="mic-mute" class="icon-button" aria-label="Mute microphone" aria-pressed="false">${icon('mic')}<small>MUTE</small></button><p id="comms-state" role="status">Tap the mic to speak.</p><p class="voice-auto">Tap to talk · Auto-sends when you finish speaking</p></section>
 <section class="heard"><span class="tiny">YOU SAID</span><p id="heard-text">“Bond, head to security.”</p><small id="heard-action">Your voice transcript appears here.</small></section>
 <div class="contact"><span id="contact-portrait" class="avatar">${portrait()}</span><span class="voice-symbol">${icon('sound')}</span><div><small id="contact-name">JAMES BOND</small><p id="latest-reply">Standing by, Q.</p></div></div>
 <ol id="feed" aria-label="Communications" aria-live="polite"></ol>
 <div class="mission-actions command-chips"><button data-command="Hack the camera I just spotted">Hack camera</button><button data-command="Continue to your previous destination">Continue</button><button data-command="Get the relic from the vault">Take relic</button><button data-command="Return to extraction">Extract</button></div>
 <details id="text-panel" open><summary>${icon('keyboard')} TYPE A COMMAND <span>Separate text channel</span></summary><form id="command-form"><label class="tiny" id="input-label" for="transcript">YOUR COMMAND TO BOND</label><textarea id="transcript" rows="2" maxlength="500" placeholder="Bond, take the left route to security…"></textarea><button id="send" type="submit">Send →</button></form><div class="command-chips presets"><button data-command="Bond, go to the main hall">Main hall</button><button data-command="Bond, take the left route to security">Left route</button><button data-command="Bond, go to the vault">Vault</button><button data-command="Bond, stop">Stop</button></div></details>
 <div class="comms-bottom"><button id="history" class="icon-button" aria-label="Show conversation history">${icon('clock')}</button><button id="text-toggle" class="icon-button" aria-label="Toggle typed commands">${icon('keyboard')}</button><button id="sound" class="icon-button" aria-label="Mute replies" aria-pressed="true">${icon('sound')}</button></div>
 <section id="voice-settings" hidden><div><strong>VOICE SETTINGS</strong><button id="close-settings" class="icon-button" aria-label="Close settings">${icon('close')}</button></div><label class="tiny" for="voice-provider">TRANSCRIPTION</label><select id="voice-provider"><option value="fish">Fish Audio</option><option value="browser">Browser speech</option></select><p id="voice-note"></p><button id="restart" type="button">Restart mission</button></section>`;
 const get=<T extends HTMLElement>(selector:string)=>root.querySelector<T>(selector)!;
 const input=get<HTMLTextAreaElement>('#transcript'),send=get<HTMLButtonElement>('#send'),mic=get<HTMLButtonElement>('#mic'),provider=get<HTMLSelectElement>('#voice-provider'),persuade=get<HTMLButtonElement>('#persuade'),returnQ=get<HTMLButtonElement>('#return-q'),knock=get<HTMLButtonElement>('#knockdown'),feed=get<HTMLOListElement>('#feed');
 let busy=false,recording=false,guardMode=false,guardWaiting=false,guardChanging=false,enabled=true,micMuted=false,fishSTT=false,ready=false,revision=0,qDraft='',guardDraft='';
 let suspended=false,stoppingCapture=false;
 let state:CommsState={alarm:0,hacksRemaining:2,keycardOwned:false,relicOwned:false,vaultOpen:false,complete:false,failed:false};
 let voiceTurn:{text:string;revision:number}|undefined;
 const status=(text:string)=>{get('#comms-state').textContent=text;};
 const add=(speaker:string,text:string)=>{
  const item=document.createElement('li');item.className=speaker.includes('GUARD')?'guard-message':'';
  const avatar=document.createElement('span');avatar.className='avatar';avatar.innerHTML=portrait(speaker.includes('GUARD')?'security':speaker==='Q'?'q':'bond');
  const body=document.createElement('div'),label=document.createElement('span'),p=document.createElement('p');label.textContent=speaker;p.textContent=text;body.append(label,p);item.append(avatar,body);feed.append(item);while(feed.children.length>20)feed.firstElementChild?.remove();feed.scrollTop=feed.scrollHeight;
 };
 const reply=(speaker:string,text:string)=>{get('#latest-reply').textContent=text;add(speaker,text);};
 const bond=new BondDialogue(options.execute,{message:text=>reply('BOND',text),status:text=>{if(!guardMode&&!recording)status(text);},action:(_action,outcome)=>{get('#heard-action').textContent=outcome.text;add(outcome.accepted?'ORDER ACCEPTED':'ORDER BLOCKED',outcome.text);}},options.context);
 const dialogue=new GuardDialogue(options.guard,{message:text=>reply('GUARD',text),status:text=>{if(guardMode&&!recording&&!guardChanging)status(text);},ended:text=>{if(guardMode){exitGuard();status(text);}}});
 const refresh=()=>{
  persuade.hidden=guardMode;persuade.disabled=busy||state.failed||state.complete||!options.guard.available;returnQ.hidden=!guardMode;returnQ.disabled=guardChanging;
  knock.hidden=!guardMode||!options.guard.canKnockDown;knock.disabled=guardChanging||state.failed||state.complete;
  get('#guard-hint').textContent=options.guard.knockedDown?'Guard down. Keycard recovered.':guardMode?'You are Bond. Maintain your cover.':state.keycardOwned?'Keycard secured. Reach the vault.':options.guard.available?'Guard in range. Speak as Bond.':'Reach security to meet the guard.';
  send.disabled=busy||state.failed||state.complete;input.disabled=busy;provider.disabled=busy;
  mic.disabled=(busy&&!recording)||micMuted||state.failed||state.complete||!ready||(provider.value==='fish'?!fishSTT||!recordingAvailable:!recognitionAvailable);
  mic.classList.toggle('listening',recording);root.classList.toggle('recording',recording);root.classList.toggle('thinking',busy&&!recording);mic.setAttribute('aria-pressed',String(recording));get('#mic-label').textContent=recording?'MIC LIVE':busy?'STAND BY':guardMode?'TALK AS BOND':'TALK TO BOND';
  root.querySelectorAll<HTMLButtonElement>('[data-command]').forEach(button=>button.disabled=busy||state.failed||state.complete);
 };
 function showMode(){
  root.classList.toggle('guard-mode',guardMode);get('#player-role').textContent=guardMode?'YOU ARE JAMES BOND':'YOU ARE Q';get('#contact-name').textContent=guardMode?'SECURITY GUARD':'JAMES BOND';get('#contact-portrait').innerHTML=portrait(guardMode?'security':'bond');get('#input-label').textContent=guardMode?'SAY TO THE GUARD AS BOND':'YOUR COMMAND TO BOND';input.placeholder=guardMode?'I have a scheduled maintenance order…':'Bond, take the left route to security…';get<HTMLElement>('.mission-actions').hidden=guardMode;
  const choices=guardMode?[['Identity','I am the maintenance technician.'],['Work order','I have a scheduled work order from your supervisor.'],['Access request','I can sign out the card in your logbook.'],['Ask guard','What do you need to confirm my access?']]:[['Main hall','Bond, go to the main hall'],['Left route','Bond, take the left route to security'],['Vault','Bond, go to the vault'],['Stop','Bond, stop']];
  root.querySelectorAll<HTMLButtonElement>('.presets [data-command]').forEach((button,i)=>{button.textContent=choices[i][0];button.dataset.command=choices[i][1];});refresh();
 }
 function exitGuard(){cancelMic();revision++;guardMode=false;guardWaiting=false;guardChanging=false;busy=false;guardDraft=input.value;input.value=qDraft;void dialogue.end();options.pause(false);showMode();status('Back as Q. Ready for your command.');}
 persuade.addEventListener('click',async()=>{
  if(persuade.disabled)return;cancelMic();const turn=++revision;qDraft=input.value;input.value=guardDraft;guardMode=true;guardChanging=true;busy=true;void bond.end();options.pause(true);showMode();status('Connecting to the guard…');
  try{await dialogue.start(true,enabled);if(turn===revision)status('Speaking as Bond. Tap the mic to speak.');}catch(error){if(turn===revision){exitGuard();status(error instanceof Error?error.message:'Guard unavailable.');}}
  finally{if(turn===revision){busy=false;guardChanging=false;options.pause(false);refresh();}}
 });
 returnQ.addEventListener('click',exitGuard);
 knock.addEventListener('click',()=>{
  if(knock.disabled)return;const result=options.execute({type:'KNOCK_DOWN_GUARD',agent:'bond'});
  if(result.accepted){exitGuard();reply('BOND / FIELD UPDATE',result.text);status(state.failed?'Alarm at 100. Mission compromised.':'Guard down. Return to your mission.');}else status(result.text);
 });
 async function submit(text:string,source:'voice'|'text'){
  text=text.trim();if(!text||busy||state.failed||state.complete)return;cancelMic();const turn=revision;busy=true;options.pause(true);refresh();get('#heard-text').textContent=`“${text}”`;get('#heard-action').textContent=source==='voice'?'Voice command · sent automatically':'Typed command · sent';add(guardMode?'BOND (YOU)':'Q',text);
  try{
   if(guardMode){guardWaiting=true;dialogue.unlockAudio();status('Guard considering your story…');const outcome=await dialogue.send(text);if(turn===revision)status(state.failed?'Alarm at 100. Mission compromised.':outcome.keycardGranted?'Keycard received. Return to Q.':'Speaking as Bond. Tap the mic to speak.');}
   else{status('Bond considering your command…');await bond.send(text);if(turn===revision)status('Awaiting your next order.');}
   if(turn===revision&&source==='text')input.value='';
  }catch(error){if(turn===revision){status(error instanceof Error?error.message:'Reply unavailable.');if(source==='voice')add('COMMS','Voice send failed. The transcript remains above; use the text channel to retry.');}}
  finally{if(turn===revision){busy=false;guardWaiting=false;options.pause(false);refresh();}}
 }
 const microphone=new CommandMicrophone({
  status:text=>{status(text);if(text.startsWith('Transcribing')){recording=false;busy=true;refresh();}},
  transcript:text=>{voiceTurn={text,revision};get('#heard-text').textContent=`“${text}”`;},
  error:text=>{voiceTurn=undefined;status(text);add('COMMS',text);},
  finished:()=>{
    if(stoppingCapture){busy=false;recording=false;return;}
    busy=false;recording=false;options.pause(false);refresh();const pending=voiceTurn;voiceTurn=undefined;
    if(pending)queueMicrotask(()=>{if(pending.revision===revision&&!suspended&&!document.hidden&&!micMuted&&!state.failed&&!state.complete)void submit(pending.text,'voice');});
  },
 });
 function startListening(){
  if(!ready||busy||recording||micMuted||suspended||document.hidden||state.failed||state.complete||guardChanging)return;
  recording=true;busy=true;options.pause(true);refresh();void microphone.start(provider.value as 'fish'|'browser');
 }
 function cancelMic(){
  voiceTurn=undefined;stoppingCapture=true;microphone.release(true);stoppingCapture=false;if(recording)busy=false;recording=false;options.pause(false);refresh();
 }
 mic.addEventListener('click',()=>{
  if(recording){microphone.release();return;}
  if(micMuted||busy||state.failed||state.complete)return;suspended=false;startListening();
 });
 window.addEventListener('blur',()=>{suspended=true;cancelMic();});window.addEventListener('focus',()=>{suspended=false;});
 document.addEventListener('visibilitychange',()=>{
  if(document.hidden){suspended=true;cancelMic();if(guardMode)exitGuard();else void bond.end();}
  else{suspended=false;}
 });
 get<HTMLButtonElement>('#mic-mute').addEventListener('click',()=>{
  micMuted=!micMuted;if(micMuted){cancelMic();status('Microphone muted. Typed commands remain available.');}else {status('Tap the mic to speak.');}
  get('#mic-mute').setAttribute('aria-pressed',String(micMuted));get('#mic-mute').setAttribute('aria-label',micMuted?'Unmute microphone':'Mute microphone');get('#mic-mute').innerHTML=icon(micMuted?'mute':'mic')+`<small>${micMuted?'UNMUTE':'MUTE'}</small>`;refresh();
 });
 get<HTMLButtonElement>('#sound').addEventListener('click',()=>{enabled=!enabled;bond.setSound(enabled);dialogue.setSound(enabled);get('#sound').setAttribute('aria-pressed',String(enabled));get('#sound').setAttribute('aria-label',enabled?'Mute replies':'Unmute replies');get('#sound').innerHTML=icon(enabled?'sound':'mute');});
 get<HTMLFormElement>('#command-form').addEventListener('submit',event=>{event.preventDefault();void submit(input.value,'text');});
 root.querySelectorAll<HTMLButtonElement>('[data-command]').forEach(button=>button.addEventListener('click',()=>{input.value=button.dataset.command!;get<HTMLDetailsElement>('#text-panel').open=true;input.focus();}));
 get('#text-toggle').addEventListener('click',()=>{const panel=get<HTMLDetailsElement>('#text-panel');panel.open=!panel.open;if(panel.open)input.focus();});
 get('#history').addEventListener('click',()=>{root.classList.toggle('history-expanded');feed.scrollTop=feed.scrollHeight;});
 get('#settings').addEventListener('click',()=>{get('#voice-settings').hidden=!get('#voice-settings').hidden;});get('#close-settings').addEventListener('click',()=>get('#voice-settings').hidden=true);get('#restart').addEventListener('click',()=>location.reload());
 const describe=()=>{get('#voice-note').textContent=provider.value==='fish'?(fishSTT?'Fish transcription. Silence ends capture; voice is sent automatically.':'Fish transcription needs the local API key.'):'Browser speech recognition. Voice is sent automatically on completion.';refresh();};provider.addEventListener('change',()=>{cancelMic();describe();});
 void fetch('/api/health',{signal:AbortSignal.timeout(5000)}).then(async r=>{const config=await r.json();fishSTT=config.fishSTT===true;ready=true;provider.value=fishSTT?'fish':'browser';describe();}).catch(()=>{ready=true;provider.value='browser';describe();});showMode();
 return {
  async report(text:string){cancelMic();const turn=revision;busy=true;options.pause(true);reply('BOND / CAMERA DISCOVERY',text);refresh();status('Bond reporting a camera…');try{await bond.send(text,false);if(turn===revision)status('Holding position. Hack the camera or continue.');}catch{if(turn===revision)status('Camera spotted. Spoken report unavailable.');}finally{if(turn===revision){busy=false;options.pause(false);refresh();}}},
  missionState(next:CommsState){const before=state.alarm,terminal=(next.failed||next.complete)&&!state.failed&&!state.complete;state=next;
    if(terminal){revision++;cancelMic();busy=false;guardWaiting=false;guardChanging=false;void bond.end();void dialogue.end();options.pause(true);status(next.failed?'GAME OVER · Alarm reached 100.':'Mission complete.');}
    get('#alarm-value').textContent=String(next.alarm);get('#alarm-meter').setAttribute('aria-valuenow',String(next.alarm));get('#alarm-meter').querySelectorAll('i').forEach((bar,i)=>bar.classList.toggle('filled',i<Math.ceil(next.alarm*36/100)));root.classList.toggle('alarm-high',next.alarm>=80);get('#hack-value').textContent=String(next.hacksRemaining);get('#keycard-value').textContent=next.keycardOwned?'✓':'—';get('#relic-value').textContent=next.relicOwned?'✓':'—';if(next.alarm>before)get('#alarm-event').textContent=`+${next.alarm-before} alarm · ${next.alarm>=100?'Mission compromised':'Keep your cover'}`;if(next.complete)get('#alarm-event').textContent='MISSION COMPLETE · Bond and relic extracted';refresh();},
  notify(text:string){reply('BOND / FIELD UPDATE',text);refresh();},guardAvailability(){refresh();},
  guardEvent(event:GuardGameEvent){if(event.type==='SUSPICION_CHANGED')add('GUARD REACTION',`Suspicious. +40 alarm. ${event.reason}`);else if(event.type==='KEYCARD_ACQUIRED'||event.type==='GUARD_DOWN'||event.type==='ALARM_TRIGGERED')add('MISSION',event.reason);else add('GUARD REACTION','Your cover story sounds credible.');refresh();},
 };
}
