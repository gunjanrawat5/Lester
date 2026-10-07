import Phaser from 'phaser';
import { MapScene } from './game/MapScene';
import { MAP_WIDTH, MAP_HEIGHT } from './game/map';
import './styles.css';
import { mountComms } from './ui/comms';
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header><div class="brand"><span class="insignia">Q</span><div><h1>OPERATION GLASSHOUSE</h1><p>MI6 / TACTICAL OPERATIONS</p></div></div><div class="status"><i></i> SECURE CONNECTION <span>007</span></div></header>
  <div class="workspace"><main><div class="map-heading"><span>FACILITY OVERVIEW</span><span>MUSEUM ANNEX <b>/</b> LEVEL 01</span></div><div id="map"></div><div class="map-footer"><span id="selection">Select a room to inspect</span><span><i class="dot"></i> EXTRACTION <i class="dot gold"></i> OBJECTIVE</span></div></main><aside id="comms" aria-label="Field communications"></aside></div>
  <footer><div><span class="tiny">MISSION OBJECTIVE</span><p>Get the guard’s keycard, unlock the vault, retrieve the relic, and extract.</p></div><div class="phase"><span>01</span> SECURE KEYCARD <small>MISSION ACTIVE</small></div></footer>`;
const scene = new MapScene();
const comms = mountComms({ execute: action => scene.runCommand(action), pause: paused => { scene.commsPaused = paused; }, guard: scene.guard, context:()=>scene.missionContext() });
const updateMission=()=>{
  const mission=scene.mission;
  comms.missionState(`${mission.hacksRemaining}/2 camera hacks · Keycard ${scene.guard.keycardOwned?'secured':'needed'} · Vault ${mission.vaultOpen?'open':'locked'} · Relic ${mission.relicOwned?'secured':'in vault'}`);
  const phase=document.querySelector('.phase')!;phase.textContent=mission.complete?'MISSION COMPLETE':mission.relicOwned?'EXTRACT BOND':mission.vaultOpen?'RETRIEVE RELIC':scene.guard.keycardOwned?'OPEN VAULT':'SECURE KEYCARD';
};
scene.onMissionChange=updateMission;scene.onDiscovery=text=>{void comms.report(text);};updateMission();
scene.onFeedback = text => comms.notify(text);
scene.onGuardAvailable = () => comms.guardAvailability();
scene.onGuardEvent = event => {comms.guardEvent(event);updateMission();};
new Phaser.Game({type:Phaser.AUTO,parent:'map',width:MAP_WIDTH,height:MAP_HEIGHT,backgroundColor:'#0b121d',scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},scene:scene});
