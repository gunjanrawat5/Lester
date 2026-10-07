import type { AgentSession } from '@fishaudio/agent-client';
import { actionSchema, type PreviewAction } from '../ai/contracts';
export const BOND_AGENT_ID = 'e8434f5b6cc646c4b426c07d01ebfd72';
type Pending = { allowActions:boolean; acted:boolean; response:boolean; resolve(acted:boolean):void; reject(error:Error):void; timer:number };
/** Fish owns Bond's reasoning and voice; only validated tools can move him. */
export class BondDialogue {
  private session?: AgentSession;
  private revision=0;
  private pending?: Pending;
  private listening=false;
  private sound=true;
  private calls=new Set<string>();
  constructor(private readonly execute:(action:PreviewAction)=>{accepted:boolean;text:string},private readonly callbacks:{message(text:string):void;status(text:string):void;action(action:PreviewAction,result:{accepted:boolean;text:string}):void},private readonly context:()=>unknown=()=>({})){}
  async connect(){
    if(this.session)return;
    const revision=++this.revision;
    const {AgentSession}=await import('@fishaudio/agent-client');
    if(revision!==this.revision)throw new Error('Bond connection canceled.');
    const current=()=>revision===this.revision;
    const session=await AgentSession.start({agentId:BOND_AGENT_ID,microphone:false,wakeLock:false,worldContext:false,
      clientTools:{bond_command:(params,{callId})=>{
        if(!current()||!this.pending||!this.pending.allowActions||this.pending.acted||this.calls.has(callId))return {accepted:false,text:'No current Q order, or this order already called a tool.'};
        const parsed=actionSchema.safeParse(params);
        if(!parsed.success)return {accepted:false,text:'Invalid game action. Use the declared action types and exact fields. STOP, CONTINUE, OPEN_VAULT, TAKE_RELIC have no target. MOVE and HACK_CAMERA require target.'};
        this.calls.add(callId);
        this.pending.acted=true;
        const outcome=this.execute(parsed.data);this.callbacks.action(parsed.data,outcome);return outcome;
      }},callbacks:{
        onMessage:message=>{if(current()&&message.role==='agent')this.callbacks.message(message.text.slice(0,500));},
        onAgentResponse:()=>{if(current()&&this.pending){this.pending.response=true;this.finish();}},
        onModeChange:mode=>{if(current()){this.listening=mode==='listening';this.callbacks.status(mode==='thinking'?'Bond considering your command…':mode==='speaking'?'Bond speaking…':'Ready for your command');this.finish();}},
        onDisconnect:()=>{if(current()){void this.end();this.callbacks.status('Bond disconnected. Send to reconnect.');}},
        onError:error=>{if(current()){void this.end();this.callbacks.status(`Bond connection failed (${error.code}). Check public access and the agent configuration.`);}},
      }});
    if(!current()){await session.end();throw new Error('Bond connection canceled.');}
    this.calls.clear();this.session=session;session.setOutputVolume(this.sound?1:0);
    await session.startAudio().catch(()=>{});
  }
  async send(text:string,allowActions=true){
    this.unlockAudio();await this.connect();
    if(!this.session)throw new Error('Bond is unavailable.');
    if(this.pending)throw new Error('Wait for Bond to finish.');
    const session=this.session;
    return new Promise<boolean>((resolve,reject)=>{
      const timer=window.setTimeout(()=>{if(this.pending){const acted=this.pending.acted;void this.end();this.callbacks.status(acted?'Bond reply timed out. The confirmed order remains in effect.':'Bond reply timed out. Check the published agent and bond_command tool.');}},30000);
      this.pending={allowActions,acted:false,response:false,resolve,reject,timer};this.listening=false;
      try{session.sendUserMessage(allowActions?`[CURRENT GAME STATE: ${JSON.stringify(this.context())}]\nQ: ${text}`:`[ENGINE FIELD EVENT — report this to Q, do not call any tool or change state.] ${text}`,{audio:true});}catch(error){window.clearTimeout(timer);this.pending=undefined;reject(error instanceof Error?error:new Error('Could not send to Bond.'));}
    });
  }
  private finish(){if(this.pending?.response&&this.listening){const turn=this.pending;this.pending=undefined;window.clearTimeout(turn.timer);turn.resolve(turn.acted);}}
  unlockAudio(){void this.session?.startAudio().catch(()=>{});}
  setSound(enabled:boolean){this.sound=enabled;this.session?.setOutputVolume(enabled?1:0);}
  interrupt(){this.session?.interrupt();}
  async end(){
    ++this.revision;const pending=this.pending;this.pending=undefined;
    if(pending){window.clearTimeout(pending.timer);pending.reject(new Error('Bond conversation ended. Your draft is retained; confirmed orders remain in effect.'));}
    const session=this.session;this.session=undefined;
    if(session){session.interrupt();await session.end().catch(()=>{});}
  }
}
