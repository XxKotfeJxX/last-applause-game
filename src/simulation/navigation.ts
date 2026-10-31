import { nodeById, worldData } from '../content';
import type { WorldState } from '../domain/types';

export function areaAt(x: number, z: number): string | null {
  for (const a of worldData.areas) if (Math.abs(x-a.x) <= a.w/2 && Math.abs(z-a.z) <= a.d/2) return a.id;
  for (const c of worldData.corridors) if (Math.abs(x-c.x) <= c.w/2 && Math.abs(z-c.z) <= c.d/2) return c.a;
  return null;
}
export function floorY(x: number, z: number): number {
  if (x < -11 && z > -4 && z < 4) return 3.5;
  if (x < -11 && z <= -4 && z >= -8) return 3.5 * ((z+8)/4);
  if (x < -7 && x >= -11 && Math.abs(z)<1.5) return 3.5 * ((-x-7)/4);
  return 0;
}
export function walkable(x: number, z: number, state: WorldState): boolean {
  if (!areaAt(x,z)) return false;
  // A closed service gate leaves the main entrances available and changes NPC routes.
  if (!state.mechanisms.serviceGateOpen && x > 7 && x < 11 && Math.abs(z)<1.5) return false;
  return true;
}
export function closestNode(x: number,z: number): string {
  let best = worldData.nodes[0], distance = Infinity;
  for (const n of worldData.nodes) { const d=(n.x-x)**2+(n.z-z)**2; if(d<distance){best=n;distance=d;} }
  return best.id;
}
export function findRoute(state: WorldState, start: string, goal: string): string[] {
  if(start===goal) return [goal];
  const queue=[start], seen=new Set([start]), parent=new Map<string,string>();
  while(queue.length){
    const current=queue.shift()!;
    for(const [a,b] of worldData.edges){
      if(!state.mechanisms.serviceGateOpen && ((a==='understage'&&b==='arenaEast')||(b==='understage'&&a==='arenaEast'))) continue;
      const next=a===current?b:b===current?a:null;
      if(!next||seen.has(next))continue;
      parent.set(next,current);seen.add(next);
      if(next===goal){const path=[goal];while(path[0]!==start)path.unshift(parent.get(path[0])!);return path.slice(1);}
      queue.push(next);
    }
  }
  return [];
}
export function nodePosition(id: string){return nodeById[id];}
