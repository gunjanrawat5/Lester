import { waypoints } from './map';
export type NodeId = keyof typeof waypoints;
export function routeBetween(start: NodeId, target: NodeId, vaultOpen = false, via?:'left'|'right'): NodeId[] {
  const pending: NodeId[][] = [[start]];
  const visited = new Set<NodeId>([start]);
  for (let i = 0; i < pending.length; i++) {
    const path = pending[i]; const last = path[path.length - 1];
    if (last === target) return path;
    const links=[...waypoints[last].links] as NodeId[];
    if(via&&last==='entry')links.sort((a,b)=>Number((via==='left'?b.startsWith('hall_left'):b==='hall_south'))-Number((via==='left'?a.startsWith('hall_left'):a==='hall_south')));
    for (const next of links) {
      if ((!vaultOpen && (next === 'vault_entry' || next === 'relic')) || visited.has(next)) continue;
      visited.add(next); pending.push([...path, next]);
    }
  }
  return [];
}
