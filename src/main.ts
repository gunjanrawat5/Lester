import Phaser from 'phaser';
import { MapScene } from './game/MapScene';
import { MAP_WIDTH, MAP_HEIGHT } from './game/map';
import './styles.css';
import { mountComms } from './ui/comms';
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header><div class="brand"><span class="insignia">Q</span><div><h1>OPERATION GLASSHOUSE</h1><p>MI6 / TACTICAL OPERATIONS</p></div></div><div class="status"><i></i> SECURE CONNECTION <span>007</span></div></header>
  <div class="workspace"><main><div class="map-heading"><span>FACILITY OVERVIEW</span><span>MUSEUM ANNEX <b>/</b> LEVEL 01</span></div><div id="map"></div><div class="map-footer"><span id="selection">Select a room to inspect</span><span><i class="dot"></i> EXTRACTION <i class="dot gold"></i> OBJECTIVE</span></div></main><aside id="comms" aria-label="Field communications"></aside></div>
  <footer><div><span class="tiny">MISSION OBJECTIVE</span><p>Get the guard’s keycard, unlock the vault, retrieve the relic, and extract.</p></div><div class="phase"><span>01</span> SECURE KEYCARD <small>MISSION ACTIVE</small></div></footer>
  <dialog id="game-over" aria-labelledby="game-over-title"><div class="game-over-card"><span class="tiny">MI6 / MISSION TERMINATED</span><div class="game-over-emblem">!</div><h2 id="game-over-title">GAME OVER</h2><p>The alarm reached 100. The facility is in lockdown.</p><span class="game-over-alarm">ALARM 100 / 100</span><button id="play-again" type="button">Play Again →</button></div></dialog>`;
const gameOver=document.querySelector<HTMLDialogElement>('#game-over')!;
gameOver.addEventListener('cancel',event=>event.preventDefault());
document.querySelector('#play-again')!.addEventListener('click',()=>location.reload());
const scene = new MapScene();
const comms = mountComms({ execute: action => scene.runCommand(action), pause: paused => { scene.commsPaused = paused; }, guard: scene.guard, context:()=>scene.missionContext() });
const updateMission=()=>{
  const mission=scene.mission;
  comms.missionState({alarm:mission.alarm,hacksRemaining:mission.hacksRemaining,keycardOwned:scene.guard.keycardOwned,relicOwned:mission.relicOwned,vaultOpen:mission.vaultOpen,complete:mission.complete,failed:mission.failed});
  if(mission.failed&&!gameOver.open){gameOver.showModal();document.querySelector<HTMLButtonElement>('#play-again')!.focus();}
  const phase=document.querySelector('.phase')!;phase.textContent=mission.failed?'MISSION COMPROMISED':mission.complete?'MISSION COMPLETE':mission.relicOwned?'EXTRACT BOND':mission.vaultOpen?'RETRIEVE RELIC':scene.guard.keycardOwned?'OPEN VAULT':'SECURE KEYCARD';
};
scene.onMissionChange=updateMission;scene.onDiscovery=text=>{void comms.report(text);};updateMission();
scene.onFeedback = text => comms.notify(text);
scene.onGuardAvailable = () => comms.guardAvailability();
scene.onGuardEvent = event => {comms.guardEvent(event);updateMission();};
new Phaser.Game({type:Phaser.AUTO,parent:'map',width:MAP_WIDTH,height:MAP_HEIGHT,backgroundColor:'#0b121d',scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},scene:scene});
