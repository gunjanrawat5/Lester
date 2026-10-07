import { guardReactionSchema, type GuardContext } from '../ai/guardContracts';
export const GUARD_RULES = { conversationRange: 60, suspicionPerReaction: 40, persuasiveTurns: 3, maxTurns: 12 } as const;
export type GuardGameEvent = {
  type: 'SUSPICION_CHANGED' | 'PERSUASION_CHANGED' | 'KEYCARD_ACQUIRED' | 'ALARM_TRIGGERED' | 'GUARD_DOWN';
  source: 'guard_dialogue'; reason: string; suspicion: number; delta: number;
};
export type ReactionResult = {
  accepted: boolean; reason: string; suspicion: number; persuasion: number;
  keycardOwned: boolean; keycardGranted: boolean; alarmTriggered: boolean;
};
export class GuardInteraction {
  suspicion = 0;
  persuasion = 0;
  keycardOwned = false;
  knockedDown = false;
  private sessionId?: string;
  private turnId?: string;
  private turns = 0;
  private assessedTurn?: string;
  private currentText = '';
  private readonly persuasiveClaims = new Set<string>();
  private readonly results = new Map<string, ReactionResult>();
  constructor(private readonly inRange: () => boolean, private readonly emit: (event: GuardGameEvent) => void = () => {}) {}
  get active() { return Boolean(this.sessionId); }
  get available() { return !this.knockedDown && !this.active && this.inRange() && !this.keycardOwned && this.suspicion < 100; }
  get canKnockDown(){return !this.knockedDown&&this.suspicion>0&&this.inRange();}
  knockDown(){
    if(!this.canKnockDown)return {accepted:false,text:'Knockdown requires a nearby suspicious guard.'};
    this.knockedDown=true;this.end();
    this.emit({type:'GUARD_DOWN',source:'guard_dialogue',reason:'Guard knocked down. +20 alarm.',suspicion:this.suspicion,delta:0});
    if(!this.keycardOwned){this.keycardOwned=true;this.emit({type:'KEYCARD_ACQUIRED',source:'guard_dialogue',reason:'Bond recovered the keycard from the knocked-down guard.',suspicion:this.suspicion,delta:0});}
    return {accepted:true,text:'Guard down, Q. Keycard secured. +20 alarm.'};
  }
  context(): GuardContext { return { suspicion: this.suspicion, persuasion: this.persuasion, keycardOwned: this.keycardOwned }; }
  begin(): string | undefined {
    if (!this.available) return undefined;
    this.sessionId = crypto.randomUUID(); this.turns = 0; this.turnId = undefined; this.assessedTurn = undefined; this.results.clear();
    return this.sessionId;
  }
  end() { this.sessionId = undefined; this.turnId = undefined; this.results.clear(); }
  beginTurn(sessionId: string, text: string): string | undefined {
    if (!text.trim() || text.length > 500 || sessionId !== this.sessionId || !this.inRange() || this.turns >= GUARD_RULES.maxTurns || this.suspicion >= 100) return undefined;
    this.turns++; this.currentText = text.toLowerCase().replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim(); this.turnId = crypto.randomUUID(); return this.turnId;
  }
  applyReaction(sessionId: string, turnId: string, callId: string, input: unknown): ReactionResult {
    const result = (accepted: boolean, reason: string, keycardGranted = false): ReactionResult => ({ accepted, reason, ...this.context(), keycardGranted, alarmTriggered: this.suspicion >= 100 });
    if (!callId || callId.length > 256 || sessionId !== this.sessionId || !this.inRange()) return result(false, 'Conversation is no longer active or Bond is out of range.');
    const previous = this.results.get(callId);
    if (previous) return result(false, 'This reaction was already applied.');
    if (!turnId || turnId !== this.turnId || this.assessedTurn === turnId || this.suspicion >= 100) return result(false, 'This player turn is stale or already assessed.');
    const parsed = guardReactionSchema.safeParse(input);
    if (!parsed.success) return result(false, 'Invalid guard reaction. No game state changed.');
    this.assessedTurn = turnId;
    const { reaction, reason } = parsed.data;
    if (reaction === 'suspicious') {
      const before = this.suspicion;
      this.suspicion = Math.min(100, this.suspicion + GUARD_RULES.suspicionPerReaction);
      this.persuasion = Math.max(0, this.persuasion - 1);
      this.emit({ type: 'SUSPICION_CHANGED', source: 'guard_dialogue', reason, suspicion: this.suspicion, delta: this.suspicion - before });
      if (before < 100 && this.suspicion === 100) this.emit({ type: 'ALARM_TRIGGERED', source: 'guard_dialogue', reason: 'The guard has raised the alarm.', suspicion: this.suspicion, delta: 0 });
    } else if (reaction === 'persuasive' && !this.keycardOwned && !this.persuasiveClaims.has(this.currentText)) {
      this.persuasiveClaims.add(this.currentText);
      this.persuasion = Math.min(GUARD_RULES.persuasiveTurns, this.persuasion + 1);
      this.emit({ type: 'PERSUASION_CHANGED', source: 'guard_dialogue', reason, suspicion: this.suspicion, delta: 0 });
    }
    let keycardGranted = false;
    if (!this.keycardOwned && this.persuasion >= GUARD_RULES.persuasiveTurns && this.suspicion < 100) {
      this.keycardOwned = true; keycardGranted = true;
      this.emit({ type: 'KEYCARD_ACQUIRED', source: 'guard_dialogue', reason: 'The guard hands his keycard to Bond.', suspicion: this.suspicion, delta: 0 });
    }
    const applied = result(true, reason, keycardGranted); this.results.set(callId, applied);
    return applied;
  }
}
