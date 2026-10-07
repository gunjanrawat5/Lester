import test from 'node:test';
import assert from 'node:assert/strict';
import {MissionState} from '../src/game/mission';
import {routeBetween} from '../src/game/previewNavigation';
import {actionSchema} from '../src/ai/contracts';
test('cameras need range and sight, reveal once, and hacks consume a two-charge budget only on success',()=>{
 const mission=new MissionState([{id:'camera_1',x:100,y:0},{id:'camera_2',x:300,y:0},{id:'camera_3',x:500,y:0}]);
 assert.equal(mission.cameras.every(c=>!c.discovered),true);
 assert.equal(mission.discover(0,0,()=>false),undefined);
 assert.equal(mission.discover(-20,0,()=>true),undefined);
 assert.equal(mission.hack('camera_1').accepted,false);
 assert.equal(mission.discover(0,0,()=>true)?.id,'camera_1');
 assert.equal(mission.discover(0,0,()=>true),undefined);
 assert.equal(mission.hack('current').accepted,true);assert.equal(mission.hacksRemaining,1);
 assert.equal(mission.hack('current').accepted,false);assert.equal(mission.hacksRemaining,1);
 mission.discover(300,0,()=>true);assert.equal(mission.hack('current').accepted,true);
 mission.discover(500,0,()=>true);assert.equal(mission.hack('current').accepted,false);assert.equal(mission.hacksRemaining,0);
 assert.equal(mission.cameras[2].active,true);
});
test('vault graph and relic acquisition require the keycard and physical access',()=>{
 const mission=new MissionState([]);
 assert.deepEqual(routeBetween('security','relic'),[]);
 assert.equal(mission.openVault(false).accepted,false);assert.equal(mission.vaultOpen,false);
 assert.equal(mission.takeRelic(true).accepted,false);
 assert.equal(mission.openVault(true).accepted,true);
 const route=routeBetween('security','relic',mission.vaultOpen);assert.ok(route.includes('vault_door'));assert.ok(route.includes('vault_entry'));
 assert.equal(mission.takeRelic(false).accepted,false);
 assert.equal(mission.takeRelic(true).accepted,true);assert.equal(mission.takeRelic(true).accepted,false);
});
test('new actions reject extra fields, invalid cameras, and unsupported powers',()=>{
 assert.equal(actionSchema.safeParse({type:'HACK_CAMERA',agent:'bond',target:'current'}).success,true);
 assert.equal(actionSchema.safeParse({type:'HACK_CAMERA',agent:'bond',target:'camera_99'}).success,false);
 assert.equal(actionSchema.safeParse({type:'TAKE_RELIC',agent:'bond',keycardOwned:true}).success,false);
 assert.equal(actionSchema.safeParse({type:'CONTINUE',agent:'bond',target:'security'}).success,false);
});
