import Phaser from 'phaser';
import { SecurityCamera, securityCameraLayout } from './securityCameras';
import { MAP_WIDTH as W, MAP_HEIGHT as H, perimeter } from './map';

export class MapScene extends Phaser.Scene {
  private securityCameras: SecurityCamera[] = [];
  // Temporary art preview: later visibility uses each camera's discovered flag.
  private readonly previewCameras = true;

  update(_time: number, delta: number) {
    for (const camera of this.securityCameras) camera.render(delta, this.previewCameras);
  }
  preload() {
    this.load.image('bond', '/assets/kenney/bond.png');
    this.load.image('guard', '/assets/kenney/guard.png');
  }
  create() {
    const fit = () => { this.cameras.main.setZoom(Math.min(this.scale.width / 810, this.scale.height / 810)).centerOn(548, 438); };
    fit(); this.scale.on(Phaser.Scale.Events.RESIZE, fit);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, fit));
    const texture = this.textures.createCanvas('museum', W, H)!;
    const ctx = texture.context;
    const polygon = () => {
      ctx.beginPath(); perimeter.forEach(([x,y], i) => i ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath();
    };
    const box = (x:number,y:number,w:number,h:number,color:string) => { ctx.fillStyle=color;ctx.fillRect(x,y,w,h); };
    const light = (x:number,y:number,r:number,color='255,203,118',strength=.3) => {
      const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${color},${strength})`);g.addColorStop(1,`rgba(${color},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
    };
    const fixture = (x:number,y:number,w:number,h:number) => {
      ctx.save();ctx.shadowColor='#000b';ctx.shadowBlur=10;ctx.shadowOffsetY=6;
      box(x,y,w,h,'#0c141c');ctx.restore();
      const g=ctx.createLinearGradient(x,y,x+w,y+h);g.addColorStop(0,'#475564');g.addColorStop(.5,'#283541');g.addColorStop(1,'#17222c');ctx.fillStyle=g;ctx.fillRect(x+2,y+2,w-4,h-4);
      box(x+4,y+3,w-8,2,'#637180');box(x+4,y+h-7,w-8,4,'#101923');
    };
    const lamp = (x:number,y:number,w=28) => {
      box(x-3,y-3,w+6,10,'#111820');ctx.save();ctx.shadowColor='#ffd99a';ctx.shadowBlur=12;box(x,y,w,4,'#ffe5a5');ctx.restore();
    };
    const label = (text:string,x:number,y:number,size=16) => {
      ctx.save();ctx.textAlign='center';ctx.font=`600 ${size}px monospace`;ctx.fillStyle='#ece1c378';ctx.shadowColor='#080d14';ctx.shadowOffsetY=1;ctx.fillText(text,x,y);ctx.restore();
    };
    const plant = (x:number,y:number) => {
      fixture(x-13,y-9,26,32);
      ctx.save();ctx.translate(x,y);ctx.shadowColor='#0008';ctx.shadowBlur=4;
      for(let i=0;i<7;i++){ctx.save();ctx.rotate(i*Math.PI*2/7);ctx.fillStyle=i%2?'#687144':'#414d31';ctx.strokeStyle='#242f20';ctx.beginPath();ctx.ellipse(0,-8,5,13,-.25,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.restore();}ctx.restore();
    };
    // One coherent floor silhouette, with raised walls and contact shadows.
    polygon();ctx.save();ctx.shadowColor='#000b';ctx.shadowBlur=30;ctx.shadowOffsetY=15;ctx.fillStyle='#080e17';ctx.fill();ctx.restore();
    polygon();ctx.fillStyle='#65645f';ctx.fill();
    ctx.save();polygon();ctx.clip();
    for(let y=80;y<H;y+=24)for(let x=180;x<920;x+=24){
      const v=89+Math.round(Math.sin(x*17+y*13)*4);
      box(x,y,24,24,`rgb(${v+6},${v+5},${v})`);box(x,y,24,1,'#22293230');box(x,y,1,24,'#22293230');box(x+1,y+1,22,1,'#d7ccab0b');
    }
    // Subtle perimeter vignette and pools of warm architectural light.
    polygon();ctx.strokeStyle='#080f19';ctx.lineWidth=46;ctx.shadowColor='#050b13';ctx.shadowBlur=24;ctx.stroke();ctx.shadowBlur=0;
    light(265,335,160);light(492,335,150);light(365,470,150,'255,213,146',.24);
    light(360,660,95);light(750,120,170);light(645,220,100,'114,211,210',.14);
    light(710,570,90);light(732,700,160,'255,209,117',.28);
    ctx.restore();
    // Raised dark blue wall caps; outer height creates the reference's diorama effect.
    polygon();ctx.lineJoin='miter';ctx.strokeStyle='#0a111c';ctx.lineWidth=22;ctx.stroke();
    polygon();ctx.strokeStyle='#2c394b';ctx.lineWidth=18;ctx.stroke();
    polygon();ctx.strokeStyle='#63708135';ctx.lineWidth=1;ctx.stroke();
    // Room dividers leave actual corridor openings.
    const wall=(x:number,y:number,w:number,h:number)=>{box(x,y+6,w,h,'#0a111b');box(x,y,w,h,'#2b3849');box(x+1,y,w-2,1,'#526071');};
    wall(610,290,60,18);wall(738,290,157,18);
    wall(600,600,67,18);wall(752,600,113,18);
    wall(545,280,18,80);wall(545,420,18,220);
    // Door thresholds, security reader, and a visibly locked vault.
    lamp(549,365,4);box(550,370,4,43,'#dfd1a0');
    lamp(678,296,52);lamp(680,604,58);
    box(679,602,63,7,'#918873');box(682,603,56,2,'#efd6a0');
    fixture(756,570,13,24);box(760,575,5,7,'#dcb270');
    // Main hall gallery exhibits and comfortable cover.
    plant(246,330);plant(504,330);plant(246,587);plant(504,587);
    fixture(340,429,74,89);fixture(350,435,54,65);
    ctx.save();ctx.translate(377,461);ctx.shadowColor='#000b';ctx.shadowBlur=8;
    const sculpture=[[-15,-27],[12,-31],[18,-16],[3,-2],[13,16],[9,29],[-17,26],[-8,5],[-16,-9]];
    ctx.beginPath();sculpture.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fillStyle='#b5b4a9';ctx.fill();
    ctx.beginPath();ctx.moveTo(-15,-27);ctx.lineTo(2,-8);ctx.lineTo(-8,5);ctx.lineTo(9,29);ctx.lineTo(13,16);ctx.lineTo(3,-2);ctx.lineTo(12,-31);ctx.closePath();ctx.fillStyle='#d0cdbf';ctx.fill();ctx.restore();
    fixture(265,447,29,73);fixture(459,447,29,73);
    lamp(260,303,18);lamp(485,303,18);lamp(344,637,31);
    // Security desk, live monitors, server cabinets, and a guard station.
    fixture(645,124,186,44);
    for(let i=0;i<3;i++){fixture(658+i*56,129,43,25);box(662+i*56,133,35,16,'#1b494b');box(665+i*56,136,17,1,'#6aa4a0');box(665+i*56,140,28,1,'#458580');box(665+i*56,144,23,1,'#458580');}
    fixture(842,180,24,76);for(let i=0;i<6;i++){box(846,186+i*10,16,5,'#16232c');box(857,187+i*10,2,2,i===4?'#cd795f':'#73a29b');}
    fixture(644,209,26,46);lamp(741,94,26);
    // Corridor console.
    fixture(730,450,17,62);box(734,455,8,11,'#844842');box(736,457,4,7,'#e87862');box(734,487,9,11,'#344959');
    // Vault enclosure, inset floor border and central relic plinth.
    ctx.strokeStyle='#c3b28032';ctx.lineWidth=2;ctx.strokeRect(640,638,188,116);
    fixture(697,673,69,69);fixture(707,680,49,46);
    fixture(624,687,26,54);fixture(817,657,20,76);
    lamp(689,771,29);
    label('MAIN HALL',377,567,19);label('01 / PUBLIC GALLERY',377,584,9);
    label('SECURITY ROOM',752,273,14);
    label('VAULT',732,758,17);
    label('AUTHORIZED ACCESS ONLY',732,773,7);
    label('EXTRACTION',360,740,9);
    texture.refresh();this.add.image(0,0,'museum').setOrigin(0);
    this.securityCameras = securityCameraLayout.map(config => new SecurityCamera(this, config));
    this.securityCameras.forEach(camera => camera.render(0, this.previewCameras));
    // Relic glow and faceted gold artifact (kept separate for later acquisition).
    const relicGlow=this.add.circle(732,699,26,0xffcf70,.07);
    this.tweens.add({targets:relicGlow,alpha:.45,scale:1.25,duration:1800,yoyo:true,repeat:-1});
    const gem=this.add.graphics();gem.fillStyle(0x1a1815).fillEllipse(733,718,35,10);
    gem.lineStyle(1.5,0xffe8aa);gem.fillStyle(0xe1af49);gem.fillPoints([[732,682],[748,692],[745,708],[732,718],[718,707],[717,692]].map(([x,y])=>new Phaser.Math.Vector2(x,y)),true);gem.strokePoints([[732,682],[748,692],[745,708],[732,718],[718,707],[717,692]].map(([x,y])=>new Phaser.Math.Vector2(x,y)),true);
    gem.fillStyle(0xffd77a);gem.fillTriangle(732,684,719,693,732,704);gem.fillStyle(0xf5c565);gem.fillTriangle(732,684,745,693,732,704);gem.fillStyle(0xa97b2e);gem.fillTriangle(719,696,732,705,732,716);
    const extraction=this.add.circle(360,704,21,0x56ded4,.08).setStrokeStyle(2,0x62e5da,.65);
    this.add.circle(360,704,6,0x74e7dc,.75);this.tweens.add({targets:extraction,alpha:.4,duration:2000,yoyo:true,repeat:-1});
    this.add.circle(360,679,16,0x68e2d9,.08).setStrokeStyle(1,0x68e2d9,.3);
    this.add.image(360,679,'bond').setDisplaySize(23,30).setAngle(-90).setTint(0xb1bac1);
    this.add.text(389,677,'007',{fontFamily:'monospace',fontSize:'10px',color:'#8ae2d7'});
    this.add.ellipse(706,224,27,12,0x000000,.25);
    this.add.image(706,213,'guard').setDisplaySize(25,32).setAngle(90).setTint(0xa6afb8);
    // Map selection highlights objects; it never moves Bond.
    const selection=this.add.graphics().setDepth(10);
    this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>{
      const x=p.worldX, y=p.worldY;
      if (!Phaser.Geom.Polygon.Contains(new Phaser.Geom.Polygon(perimeter.flat()), x, y)) return;
      const room=x>600?(y>590?'vault':y<310?'security':'corridor'):y>635?'entrance':'gallery';
      const names:Record<string,string>={vault:'Vault · Relic chamber',security:'Security room · Guard station',corridor:'Connecting corridor',entrance:'Entrance · Extraction',gallery:'Main hall · Museum gallery'};
      const el=document.querySelector('#selection');if(el)el.textContent=names[room];
      selection.clear().lineStyle(1,0x85e4d8,.6).strokeCircle(x,y,12);
    });
  }
}
