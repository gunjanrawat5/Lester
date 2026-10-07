import { waypoints } from './map';
export type NodeId = keyof typeof waypoints;
export function routeBetween(start: NodeId, target: NodeId, vaultOpen = false, via?:'left'|'right'): NodeId[] {
  const pending: NodeId[][] = [[start]];
  const visited = new Set<NodeId>([start]);
  for (let i = 0; i < pending.length; i++) {
    const path = pending[i]; const last = path[path.length - 1];
    if (last === target) return path;
    const links=[...waypoints[last].links] as NodeId[];
    // Honor the selected side in both directions through the main hall.
    if(via&&last==='entry')links.splice(0,links.length,...links.filter(next=>next!==(via==='left'?'hall_south':'hall_left_south')));
    if(via&&last==='hall')links.splice(0,links.length,...links.filter(next=>next!==(via==='left'?'hall_north':'hall_left_north')));
    for (const next of links) {
      if ((!vaultOpen && (next === 'vault_entry' || next === 'relic')) || visited.has(next)) continue;
      visited.add(next); pending.push([...path, next]);
    }
  }
  return [];
}

/** Start from Bond's physical position on his current corridor segment. */
export function routeFromPosition(position:{x:number;y:number},start:NodeId,next:NodeId|undefined,target:NodeId,vaultOpen=false,via?:'left'|'right'):NodeId[]{
 // A future waypoint on the opposite side cannot bypass the chosen fork.
 const opposite=via==='left'?'hall_south':via==='right'?'hall_left_south':undefined;
 const oppositeNorth=via==='left'?'hall_north':via==='right'?'hall_left_north':undefined;
 const eligibleNext=next&&next!==start&&!(start==='entry'&&next===opposite)&&!(start==='hall'&&next===oppositeNorth);
 const candidates=[start,...(eligibleNext?[next!]:[])].map(anchor=>{
  const path=routeBetween(anchor,target,vaultOpen,via);
  let cost=0,previous=position;
  for(const node of path){const point=waypoints[node];cost+=Math.hypot(point.x-previous.x,point.y-previous.y);previous=point;}
  return {path,cost:path.length?cost:Infinity};
 });
 candidates.sort((a,b)=>a.cost-b.cost);
 const path=candidates[0].path;
 // A waypoint already reached must not send Bond back to an old anchor.
 return path.filter((node,i)=>i!==0||Math.hypot(waypoints[node].x-position.x,waypoints[node].y-position.y)>.01);
}
