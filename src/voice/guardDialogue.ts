import type { AgentSession } from '@fishaudio/agent-client';
import { guardDemoResponseSchema } from '../ai/guardContracts';
import { GuardInteraction, type ReactionResult } from '../game/guardInteraction';
export const GUARD_AGENT_ID = '50a6c83da0584763bc7662f6908454a3';
type Turn = { id: string; assessed: boolean; response: boolean; outcome?: ReactionResult; resolve(result: ReactionResult): void; reject(error: Error): void; timer: number };
export class GuardDialogue {
  private session?: AgentSession;
  private engineSession?: string;
  private revision = 0;
  private pending?: Turn;
  private history: string[] = [];
  private live = false;
  private listening = true;
  constructor(private readonly engine: GuardInteraction, private readonly callbacks: { message(text: string): void; status(text: string): void; ended(text: string): void }) {}
  get isLive() { return this.live; }
  async start(live: boolean, sound: boolean): Promise<void> {
    const token = this.engine.begin();
    if (!token) throw new Error('Bond must be next to the guard and stationary to start persuasion.');
    this.engineSession = token; this.history = []; this.live = live; const revision = ++this.revision;
    if (!live) { this.callbacks.message('This is a restricted area. What is your business here?'); return; }
    try {
      const { AgentSession } = await import('@fishaudio/agent-client');
      if (revision !== this.revision) return;
      const current = () => revision === this.revision && this.engine.active && this.engineSession === token;
      const session = await AgentSession.start({
        agentId:GUARD_AGENT_ID, microphone:false, wakeLock:false, worldContext:false,
        dynamicVariables:{player_role:'James Bond',guard_location:'Security Room',suspicion:this.engine.suspicion,persuasion:this.engine.persuasion,keycard_owned:this.engine.keycardOwned},
        clientTools:{ guard_reaction:(params,{callId})=>{
          if(!current() || !this.pending) return {accepted:false,reason:'No current player turn. Do not change inventory or alarm state.'};
          const pending=this.pending;
          const outcome=this.engine.applyReaction(token,pending.id,callId,params);
          if(outcome.accepted&&current()&&this.pending===pending){pending.assessed=true;pending.outcome=outcome;this.finishTurn();}
          return outcome;
        } },
        callbacks:{
          onMessage:message=>{if(current()&&message.role==='agent')this.callbacks.message(message.text.slice(0,500));},
          onAgentResponse:()=>{if(current()&&this.pending){this.pending.response=true;this.finishTurn();}},
          onModeChange:mode=>{if(current()){this.listening=mode==='listening';this.callbacks.status(mode==='speaking'?'Guard speaking…':mode==='thinking'?'Guard considering your story…':'Speaking as Bond · Hold to talk or type');this.finishTurn();}},
          onDisconnect:()=>{if(current()){void this.end();this.callbacks.ended('Guard conversation disconnected. Returned to Q.');}},
          onError:error=>{if(current()){void this.end();this.callbacks.ended(error.code==='tool_failed'?'Guard tool setup failed. Check guard_reaction configuration.':'Guard voice connection failed. Returned to Q; your draft is retained.');}},
        },
      });
      if(!current()){await session.end();return;}
      this.session=session;this.session.setOutputVolume(sound?1:0);
      // The Send click calls startAudio again inside a user gesture for browsers
      // that require a fresh gesture after async session creation.
      await session.startAudio().catch(()=>this.callbacks.status('Guard connected. Press Send to enable spoken replies.'));
    } catch(error) {
      if(revision===this.revision)await this.end();
      throw error;
    }
  }
  unlockAudio(){void this.session?.startAudio().catch(()=>{});}
  setSound(sound:boolean){this.session?.setOutputVolume(sound?1:0);}
  interrupt(){this.session?.interrupt();}
  async send(text:string):Promise<ReactionResult>{
    const engineSession=this.engineSession;
    const turnId=engineSession?this.engine.beginTurn(engineSession,text):undefined;
    if(!engineSession||!turnId)throw new Error('This conversation has ended, reached its turn limit, or the guard raised the alarm. Return to Q.');
    const revision=this.revision;
    if(!this.live){
      const requestId=crypto.randomUUID();
      const response=await fetch('/api/guard/demo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({requestId,text,history:this.history,context:this.engine.context()}),signal:AbortSignal.timeout(8000)});
      const result=await response.json();if(!response.ok)throw new Error(result.error||'Guard conversation unavailable.');
      const parsed=guardDemoResponseSchema.parse(result);
      if(revision!==this.revision||parsed.requestId!==requestId)throw new Error('Old guard reply ignored.');
      const outcome=this.engine.applyReaction(engineSession,turnId,requestId,parsed.assessment);
      if(!outcome.accepted)throw new Error(outcome.reason);
      this.history.push(text);
      this.callbacks.message(outcome.keycardGranted?'All right. Sign out the card and bring it straight back.':parsed.reply);
      return outcome;
    }
    if(!this.session||this.pending)throw new Error('Wait for the guard to finish his current response.');
    const session=this.session;
    return new Promise<ReactionResult>((resolve,reject)=>{
      const timer=window.setTimeout(()=>{
        if(this.pending?.id===turnId){this.pending=undefined;reject(new Error('Guard response timed out. Confirmed guard reactions remain in effect. Check the guard_reaction tool setup.'));void this.end();this.callbacks.ended('Guard conversation timed out. Returned to Q.');}
      },25000);
      this.pending={id:turnId,assessed:false,response:false,resolve,reject,timer};this.listening=false;
      try{session.sendUserMessage(text,{audio:true});}catch(error){window.clearTimeout(timer);this.pending=undefined;reject(error instanceof Error?error:new Error('Could not send dialogue to guard.'));}
    });
  }
  private finishTurn(){
    if(this.pending?.assessed&&this.pending.response&&this.listening&&this.pending.outcome){
      const turn=this.pending;this.pending=undefined;window.clearTimeout(turn.timer);turn.resolve(turn.outcome!);
    }
  }
  async end(){
    ++this.revision;this.engine.end();this.engineSession=undefined;
    if(this.pending){const pending=this.pending;this.pending=undefined;window.clearTimeout(pending.timer);pending.reject(new Error('Guard conversation ended.'));}
    const session=this.session;this.session=undefined;
    if(session){session.interrupt();await session.end().catch(()=>{});}
  }
}
