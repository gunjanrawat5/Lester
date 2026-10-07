import Phaser from 'phaser';
import { perimeter } from './map';

type Point = { x: number; y: number };
type Segment = readonly [Point, Point];
export type SecurityCameraConfig = {
  id: string; x: number; y: number; direction: number; range: number;
  coneAngle: number; sweepAngle: number; period: number; phase: number;
};
const radians = Phaser.Math.DegToRad;
export const securityCameraLayout: SecurityCameraConfig[] = [
  { id: 'camera_1', x: 229, y: 364, direction: radians(30), range: 145, coneAngle: radians(60), sweepAngle: radians(24), period: 7, phase: 0 },
  { id: 'camera_2', x: 526, y: 364, direction: radians(150), range: 145, coneAngle: radians(60), sweepAngle: radians(24), period: 8, phase: 1.4 },
  { id: 'camera_3', x: 229, y: 548, direction: radians(-30), range: 145, coneAngle: radians(60), sweepAngle: radians(24), period: 8.5, phase: 2.6 },
  { id: 'camera_4', x: 526, y: 548, direction: radians(210), range: 145, coneAngle: radians(60), sweepAngle: radians(24), period: 7.5, phase: .8 },
  { id: 'camera_5', x: 739, y: 430, direction: radians(105), range: 170, coneAngle: radians(48), sweepAngle: radians(15), period: 9, phase: 1.8 },
];
// Room-divider edges supplement the outer silhouette. The vault threshold
// blocks this preview's corridor cone; unlock/door state will drive it later.
const dividerSegments: Segment[] = [
  [{x:610,y:308},{x:670,y:308}], [{x:738,y:308},{x:895,y:308}],
  [{x:563,y:280},{x:563,y:360}], [{x:563,y:420},{x:563,y:640}],
  [{x:600,y:618},{x:865,y:618}],
];
const boundaries: Segment[] = perimeter.map(([x,y],i) => {
  const [nextX,nextY] = perimeter[(i+1)%perimeter.length];
  return [{x,y},{x:nextX,y:nextY}] as const;
}).concat(dividerSegments);
const cross = (a: Point,b: Point) => a.x*b.y-a.y*b.x;

/** Shared sector geometry: a bounded ray stops at the nearest wall. */
export function cameraRay(origin: Point, angle: number, range: number): Point {
  const direction={x:Math.cos(angle),y:Math.sin(angle)};
  let distance=range;
  for(const [a,b] of boundaries){
    const edge={x:b.x-a.x,y:b.y-a.y};
    const offset={x:a.x-origin.x,y:a.y-origin.y};
    const denominator=cross(direction,edge);
    if(Math.abs(denominator)<1e-8)continue;
    const t=cross(offset,edge)/denominator;
    const u=cross(offset,direction)/denominator;
    if(t>=0 && u>=0 && u<=1)distance=Math.min(distance,t);
  }
  return {x:origin.x+direction.x*distance,y:origin.y+direction.y*distance};
}

export class SecurityCamera {
  active=true;
  discovered=false;
  direction:number;
  private elapsed=0;
  private readonly cone:Phaser.GameObjects.Graphics;
  private readonly mount:Phaser.GameObjects.Graphics;
  private readonly head:Phaser.GameObjects.Graphics;
  private readonly label:Phaser.GameObjects.Text;
  constructor(scene:Phaser.Scene,readonly config:SecurityCameraConfig){
    this.direction=config.direction;
    this.cone=scene.add.graphics().setDepth(.1);
    this.mount=scene.add.graphics().setDepth(2);
    this.mount.fillStyle(0x060d15,.55).fillEllipse(config.x+2,config.y+5,24,15);
    this.mount.fillStyle(0x18232d).fillCircle(config.x,config.y,8);
    this.mount.lineStyle(1,0x71808a,.8).strokeCircle(config.x,config.y,7);
    this.head=scene.add.graphics({x:config.x,y:config.y}).setDepth(3);
    this.label=scene.add.text(config.x,config.y-17,config.id.replace('camera_','C0'),{fontFamily:'monospace',fontSize:'8px',color:'#e6a5a0',backgroundColor:'#141a22',padding:{x:3,y:2}}).setOrigin(.5).setDepth(3);
  }
  render(delta:number,previewVisible:boolean){
    const visible=previewVisible||this.discovered;
    this.cone.setVisible(visible&&this.active);
    this.mount.setVisible(visible);this.head.setVisible(visible);this.label.setVisible(visible);
    if(!visible)return;
    if(this.active)this.elapsed+=Math.min(delta,100)/1000;
    this.direction=this.config.direction+Math.sin(this.elapsed*Math.PI*2/this.config.period+this.config.phase)*this.config.sweepAngle;
    this.head.clear();
    this.head.fillStyle(0x08121c).fillRoundedRect(-6,-7,24,14,3);
    this.head.fillStyle(0x87949c).fillRoundedRect(-5,-6,20,12,2);
    this.head.fillStyle(0xb6c0c5).fillRect(-3,-5,13,2);
    this.head.fillStyle(0x26333e).fillRect(11,-5,6,10);
    this.head.fillStyle(this.active?0xff6666:0x76d3cd).fillCircle(17,0,3);
    this.head.fillStyle(this.active?0xe85959:0x76d3cd).fillCircle(0,3,1.5);
    this.head.setRotation(this.direction);
    this.cone.clear();if(!this.active)return;
    const vertices=[new Phaser.Math.Vector2(this.config.x,this.config.y)];
    const start=this.direction-this.config.coneAngle/2;
    for(let i=0;i<=48;i++){
      const point=cameraRay(this.config,start+this.config.coneAngle*i/48,this.config.range);
      vertices.push(new Phaser.Math.Vector2(point.x,point.y));
    }
    this.cone.fillStyle(0xf04f58,.17).fillPoints(vertices,true);
    this.cone.lineStyle(1.2,0xff7373,.72).strokePoints(vertices,true);
  }
}
