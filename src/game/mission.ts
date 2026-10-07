export type CameraState={id:string;x:number;y:number;active:boolean;discovered:boolean};
export class MissionState {
  hacksRemaining=2;
  pendingCamera?:string;
  vaultOpen=false;
  relicOwned=false;
  complete=false;
  readonly cameras:CameraState[];
  constructor(layout:readonly {id:string;x:number;y:number}[]){this.cameras=layout.map(c=>({...c,active:true,discovered:false}));}
  discover(x:number,y:number,visible:(camera:CameraState)=>boolean):CameraState|undefined{
    const camera=this.cameras.find(c=>!c.discovered&&c.active&&Math.hypot(c.x-x,c.y-y)<=110&&visible(c));
    if(camera){camera.discovered=true;this.pendingCamera=camera.id;}
    return camera;
  }
  hack(target:string){
    const camera=this.cameras.find(c=>c.id===(target==='current'?this.pendingCamera:target));
    if(!camera?.discovered)return {accepted:false,text:'Only a discovered camera can be hacked, Q.'};
    if(!camera.active)return {accepted:false,text:'That camera is already disabled. No hack used.'};
    if(!this.hacksRemaining)return {accepted:false,text:'No camera hacks remain, Q. You can tell me to continue.'};
    camera.active=false;this.hacksRemaining--;
    return {accepted:true,text:`${camera.id.replace('camera_','Camera ')} disabled. ${this.hacksRemaining} camera hacks remaining. Say continue to resume the route.`};
  }
  openVault(hasCard:boolean){
    if(!hasCard)return {accepted:false,text:'The vault is locked. Get the security guard’s keycard first, Q.'};
    this.vaultOpen=true;return {accepted:true,text:'Keycard accepted. Vault open, Q.'};
  }
  takeRelic(inRange:boolean){
    if(!this.vaultOpen||!inRange)return {accepted:false,text:'I must reach the relic inside the unlocked vault first.'};
    if(this.relicOwned)return {accepted:false,text:'I already have the relic, Q.'};
    this.relicOwned=true;return {accepted:true,text:'Relic secured, Q. Bring me back to extraction.'};
  }
}
