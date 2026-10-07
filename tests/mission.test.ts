import test from 'node:test';
import assert from 'node:assert/strict';
import {MissionState} from '../src/game/mission';
import {routeBetween} from '../src/game/previewNavigation';
import {actionSchema,bondToolActionSchema} from '../src/ai/contracts';
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

test('camera exposure costs 50 once per entry, resets after two seconds outside, and disabled cameras do not detect',()=>{
 const mission=new MissionState([{id:'camera_2',x:0,y:0}]);
 assert.deepEqual(mission.detectCameras(['camera_2'],16),['camera_2']);assert.equal(mission.alarm,50);
 for(let i=0;i<100;i++)mission.detectCameras(['camera_2'],16);assert.equal(mission.alarm,50);
 mission.detectCameras([],1000);mission.detectCameras(['camera_2'],16);assert.equal(mission.alarm,50);
 mission.cameras[0].active=false;mission.detectCameras([],2000);mission.detectCameras(['camera_2'],16);assert.equal(mission.alarm,50);
 mission.cameras[0].active=true;mission.detectCameras(['camera_2'],16);assert.equal(mission.alarm,100);assert.equal(mission.failed,true);
});
test('shared alarm combines detection, suspicion and knockdown, caps at 100, and freezes once compromised',()=>{
 const mission=new MissionState([]);mission.addAlarm(50);mission.addAlarm(40);assert.equal(mission.alarm,90);
 assert.equal(mission.addAlarm(20),10);assert.equal(mission.alarm,100);assert.equal(mission.failed,true);assert.equal(mission.addAlarm(20),0);
});
test('left route connects the entrance to the hallway without crossing exhibits',()=>{
 const route=routeBetween('extraction','security',false,'left');assert.ok(route.includes('hall_left_south'));assert.ok(route.includes('hall_left_mid'));assert.ok(route.includes('hall_left_north'));assert.ok(route.includes('junction'));assert.ok(!route.includes('hall_east'));
});

test('Fish empty optional tool fields normalize without relaxing strict action validation',()=>{
 assert.equal(bondToolActionSchema.safeParse({type:'HACK_CAMERA',agent:'bond',target:'camera_2',via:''}).success,true);
 assert.equal(bondToolActionSchema.safeParse({type:'STOP',agent:'bond',target:'',via:''}).success,true);
 assert.equal(bondToolActionSchema.safeParse({type:'HACK_CAMERA',agent:'bond',target:'camera_2',via:'left'}).success,false);
 assert.equal(bondToolActionSchema.safeParse({type:'STOP',agent:'bond',target:'',via:'',alarm:0}).success,false);
 assert.equal(bondToolActionSchema.safeParse({type:'MOVE',agent:'bond',target:'',via:'left'}).success,false);
});
