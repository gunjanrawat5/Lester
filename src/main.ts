import Phaser from 'phaser';
import { MapScene } from './game/MapScene';
import { MAP_WIDTH, MAP_HEIGHT } from './game/map';
import './styles.css';
document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <header><div class="brand"><span class="insignia">Q</span><div><h1>OPERATION GLASSHOUSE</h1><p>MI6 / TACTICAL OPERATIONS</p></div></div><div class="status"><i></i> SECURE CONNECTION <span>007</span></div></header>
  <main><div class="map-heading"><span>FACILITY OVERVIEW</span><span>MUSEUM ANNEX <b>/</b> LEVEL 01</span></div><div id="map"></div><div class="map-footer"><span id="selection">Select a room to inspect</span><span><i class="dot"></i> EXTRACTION <i class="dot gold"></i> OBJECTIVE</span></div></main>
  <footer><div><span class="tiny">MISSION OBJECTIVE</span><p>Retrieve the relic. Bring Bond home.</p></div><div class="phase"><span>01</span> RECONNAISSANCE <small>MAP PREVIEW</small></div></footer>`;
new Phaser.Game({type:Phaser.AUTO,parent:'map',width:MAP_WIDTH,height:MAP_HEIGHT,backgroundColor:'#0b121d',scale:{mode:Phaser.Scale.RESIZE,autoCenter:Phaser.Scale.CENTER_BOTH},scene:MapScene});
