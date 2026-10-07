import { waypoints } from './map';
export type NodeId = keyof typeof waypoints;
export function routeBetween(start: NodeId, target: NodeId, vaultOpen = false): NodeId[] {
  const pending: NodeId[][] = [[start]];
  const visited = new Set<NodeId>([start]);
  for (let i = 0; i < pending.length; i++) {
    const path = pending[i]; const last = path[path.length - 1];
    if (last === target) return path;
    for (const next of waypoints[last].links as NodeId[]) {
      if ((!vaultOpen && (next === 'vault_entry' || next === 'relic')) || visited.has(next)) continue;
      visited.add(next); pending.push([...path, next]);
    }
  }
  return [];
}
