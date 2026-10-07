import test from 'node:test';
import assert from 'node:assert/strict';
import { transcribe, speak, VoiceError } from '../server/fish';
test('Fish adapters follow the documented contract and handle provider failures', async () => {
  const originalFetch=globalThis.fetch, originalKey=process.env.FISH_API_KEY, originalVoice=process.env.FISH_BOND_VOICE_ID;
  const file={buffer:Buffer.from('browser audio'),mimetype:'audio/webm;codecs=opus'} as Express.Multer.File;
  try {
    delete process.env.FISH_API_KEY;
    await assert.rejects(()=>transcribe(file),(error:unknown)=>error instanceof VoiceError&&error.status===503);
    process.env.FISH_API_KEY='test-only-key';process.env.FISH_BOND_VOICE_ID='test-only-voice';
    globalThis.fetch=async(input,init)=>{
      assert.equal(input,'https://api.fish.audio/v1/asr');
      assert.equal((init?.headers as Record<string,string>).model,'transcribe-1-pro');
      assert.ok(init?.body instanceof FormData); assert.equal(init.body.get('ignore_timestamps'),'true');assert.equal(init.body.get('tag_audio_events'),'false');
      const upload=init.body.get('audio') as File;assert.equal(upload.name,'command.webm');assert.equal(await upload.text(),'browser audio');
      return Response.json({text:'<|speaker:0|> Bond, go to security.'});
    };
    assert.deepEqual(await transcribe(file),{text:'Bond, go to security.',provider:'fish-audio'});
    globalThis.fetch=async()=>Response.json({unexpected:true});
    await assert.rejects(()=>transcribe(file),(error:unknown)=>error instanceof VoiceError&&error.status===502);
    globalThis.fetch=async()=>new Response('provider details',{status:401});
    await assert.rejects(()=>transcribe(file),(error:unknown)=>error instanceof VoiceError&&error.status===401&&!error.message.includes('provider details'));
    globalThis.fetch=async(input,init)=>{
      assert.equal(input,'https://api.fish.audio/v1/tts');
      assert.equal((init?.headers as Record<string,string>).model,'s2.1-pro-free');
      assert.deepEqual(JSON.parse(init!.body as string),{text:'Holding position, Q.',reference_id:'test-only-voice',format:'mp3',latency:'balanced'});
      return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Type':'audio/mpeg'}});
    };
    assert.deepEqual(await speak('Holding position, Q.'),Buffer.from([1,2,3]));
  } finally {
    globalThis.fetch=originalFetch;
    if(originalKey===undefined)delete process.env.FISH_API_KEY;else process.env.FISH_API_KEY=originalKey;
    if(originalVoice===undefined)delete process.env.FISH_BOND_VOICE_ID;else process.env.FISH_BOND_VOICE_ID=originalVoice;
  }
});
