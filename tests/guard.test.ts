import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { GuardInteraction, type GuardGameEvent } from '../src/game/guardInteraction';
import { demoGuardTurn, createGuardSession } from '../server/guard';
import { VoiceError } from '../server/fish';
const reaction = (guard:GuardInteraction, session:string, text:string, kind='suspicious', callId=randomUUID()) => {
  const turn=guard.beginTurn(session,text)!;
  return {turn,callId,result:guard.applyReaction(session,turn,callId,{reaction:kind,reason:'Guard assessment.'})};
};
test('guard conversation requires proximity; stale and duplicate reactions cannot raise suspicion',()=>{
  let nearby=false;const events:GuardGameEvent[]=[];const guard=new GuardInteraction(()=>nearby,e=>events.push(e));
  assert.equal(guard.begin(),undefined);nearby=true;const session=guard.begin()!;
  const first=reaction(guard,session,'I will steal the relic');assert.equal(first.result.suspicion,15);
  guard.applyReaction(session,first.turn,first.callId,{reaction:'suspicious',reason:'Repeat'});
  guard.applyReaction(session,first.turn,randomUUID(),{reaction:'suspicious',reason:'Second call for same turn'});
  assert.equal(guard.suspicion,15);assert.equal(events.length,1);
  const next=guard.beginTurn(session,'New turn')!;
  guard.applyReaction(session,first.turn,randomUUID(),{reaction:'suspicious',reason:'Old turn'});
  assert.equal(guard.suspicion,15);
  assert.equal(guard.applyReaction(session,next,randomUUID(),{reaction:'suspicious',reason:'Extra',delta:100}).accepted,false);
  nearby=false;assert.equal(guard.applyReaction(session,next,randomUUID(),{reaction:'suspicious',reason:'Out of range'}).accepted,false);
  guard.end();nearby=true;assert.equal(guard.applyReaction(session,next,randomUUID(),{reaction:'suspicious',reason:'After returning to Q'}).accepted,false);
});
test('suspicion is capped and alarm event fires once',()=>{
  const events:GuardGameEvent[]=[];const guard=new GuardInteraction(()=>true,e=>events.push(e));const session=guard.begin()!;
  for(let i=0;i<7;i++)reaction(guard,session,`Threat ${i}`);
  assert.equal(guard.suspicion,100);assert.equal(events.filter(e=>e.type==='ALARM_TRIGGERED').length,1);
  assert.equal(guard.beginTurn(session,'Another threat'),undefined);guard.end();assert.equal(guard.begin(),undefined);
});
test('keycard needs distinct persuasive turns, persists across sessions, and transfers once',()=>{
  const events:GuardGameEvent[]=[];const guard=new GuardInteraction(()=>true,e=>events.push(e));let session=guard.begin()!;
  reaction(guard,session,'Maintenance technician','persuasive');guard.end();session=guard.begin()!;
  reaction(guard,session,'Maintenance technician','persuasive');assert.equal(guard.persuasion,1);assert.equal(guard.keycardOwned,false);
  reaction(guard,session,'Scheduled work order','persuasive');assert.equal(guard.keycardOwned,false);
  const last=reaction(guard,session,'I will sign the card out','persuasive');assert.equal(last.result.keycardGranted,true);
  reaction(guard,session,'Another reassurance','persuasive');assert.equal(events.filter(e=>e.type==='KEYCARD_ACQUIRED').length,1);
  guard.end();assert.equal(guard.available,false);
});
test('demo guard flags threats and changed stories, but neutral speech adds no alarm',()=>{
  const context={suspicion:0,persuasion:0,keycardOwned:false};
  assert.equal(demoGuardTurn('I will steal the relic',[],context).assessment.reaction,'suspicious');
  assert.equal(demoGuardTurn('Actually I am a tourist',['I am maintenance'],context).assessment.reaction,'suspicious');
  assert.equal(demoGuardTurn('Good evening',[],context).assessment.reaction,'neutral');
  assert.equal(demoGuardTurn('I have a scheduled work order',[],context).assessment.reaction,'persuasive');
});
test('private guard session uses a server key, guard voice override, safe context and an unchanged join token',async()=>{
  const original=globalThis.fetch, saved=[process.env.FISH_API_KEY,process.env.FISH_GUARD_AGENT_ID,process.env.FISH_GUARD_VOICE_ID];
  try{
    process.env.FISH_API_KEY='test-key';process.env.FISH_GUARD_AGENT_ID='test-agent';process.env.FISH_GUARD_VOICE_ID='test-guard-voice';
    const token={session_id:'test-session',expires_at:'2026-10-07T23:00:00Z',max_duration_seconds:300,transport:'livekit',livekit_url:'wss://example.test',token:'test-join-token',future_field:'preserved'};
    globalThis.fetch=async(input,init)=>{
      assert.equal(input,'https://api.fish.audio/v1/agent/sessions');
      const body=JSON.parse(init!.body as string);assert.equal(body.agent_id,'test-agent');assert.deepEqual(body.overrides,{voice_id:'test-guard-voice'});
      assert.equal(body.dynamic_variables.player_role,'James Bond');assert.equal(body.dynamic_variables.suspicion,15);assert.equal(body.record_audio,false);
      assert.ok(!JSON.stringify(body).includes('camera_'));return Response.json(token,{status:201});
    };
    assert.deepEqual(await createGuardSession({requestId:randomUUID(),context:{suspicion:15,persuasion:1,keycardOwned:false}}),token);
    globalThis.fetch=async()=>Response.json({bad_token:true},{status:201});
    await assert.rejects(()=>createGuardSession({requestId:randomUUID(),context:{suspicion:0,persuasion:0,keycardOwned:false}}),(error:unknown)=>error instanceof VoiceError&&error.status===502);
  }finally{
    globalThis.fetch=original;
    ['FISH_API_KEY','FISH_GUARD_AGENT_ID','FISH_GUARD_VOICE_ID'].forEach((name,i)=>{if(saved[i]===undefined)delete process.env[name];else process.env[name]=saved[i];});
  }
});
