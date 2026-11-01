import { nodeById, worldData } from '../content';
import { mapObjects,walls,contains,surfaceHeight,PLAYER_RADIUS,ACTOR_HEIGHT } from '../world/layout';
import type { WorldState } from '../domain/types';
export function areaAt(x:number,z:number):string|null{const a=worldData.areas.find(a=>contains(a,x,z));if(a)return a.id;return worldData.corridors.find(c=>contains(c,x,z))?.a??null;}
export const floorY=surfaceHeight;
export function objectPresent(s:WorldState,o:{area:string;decayKey?:string}){return s.areaStates[o.area]!=='erased'&&(!o.decayKey||s.areaStates[o.decayKey]!=='erased');}
function circleBox(x:number,z:number,r:number,b:{x:number;z:number;w:number;d:number}){const dx=Math.max(Math.abs(x-b.x)-b.w/2,0),dz=Math.max(Math.abs(z-b.z)-b.d/2,0);return dx*dx+dz*dz<r*r-1e-9;}
export interface CollisionBody {id:string;x:number;z:number;w:number;d:number;bottom:number;top:number}
const bodyCache=new WeakMap<WorldState,{key:string;bodies:CollisionBody[]}>();
/** The debug view and movement consume these same bodies, including an open gate's leaf. */
export function collisionBodies(s:WorldState):CollisionBody[]{
 const key=String(s.mechanisms.serviceGateOpen)+Object.values(s.areaStates).join('|'),cached=bodyCache.get(s);if(cached?.key===key)return cached.bodies;
 const bodies:CollisionBody[]=walls.map(w=>({id:w.id,x:w.x,z:w.z,w:w.w,d:w.d,bottom:w.floorY,top:w.floorY+w.h}));
 for(const o of mapObjects){if(!objectPresent(s,o))continue;const bottom=floorY(o.x,o.z)+(o.y??0),base={id:o.id,bottom,top:bottom+o.h};
  if(o.kind==='arch'){for(const side of [-1,1])bodies.push({...base,x:o.x+side*(o.w/2-.25),z:o.z,w:.45,d:o.d});continue;}
  if(o.kind==='portal'){const horizontal=o.d>o.w,span=Math.max(o.w,o.d);for(const side of [-1,1])bodies.push({...base,x:o.x+(horizontal?0:side*(span/2-.08)),z:o.z+(horizontal?side*(span/2-.08):0),w:.23,d:.23});continue;}
  if(!o.solid)continue;
  if(o.kind==='gate'){
   for(const side of [-1,1])bodies.push({...base,x:o.x,z:o.z+side*1.45,w:.2,d:.2});
   if(s.mechanisms.serviceGateOpen){bodies.push({...base,x:o.x+1.4,z:o.z-1.4,w:2.8,d:.09});continue;}
  }
  bodies.push({...base,x:o.x,z:o.z,w:o.w,d:o.d});
 }
 bodyCache.set(s,{key,bodies});return bodies;
}
export function walkable(x:number,z:number,s:WorldState,radius=PLAYER_RADIUS):boolean{
 if(!Number.isFinite(x)||!Number.isFinite(z)||!areaAt(x,z))return false;
 for(let n=0;n<8;n++){const t=n*Math.PI/4;if(!areaAt(x+Math.cos(t)*radius,z+Math.sin(t)*radius))return false;}
 const feet=floorY(x,z);for(const b of collisionBodies(s))if(feet<b.top-.04&&feet+ACTOR_HEIGHT>b.bottom&&circleBox(x,z,radius,b))return false;
 return true;
}
/** Swept small steps avoid tunnelling, then slide along the free axis. */
export function moveOnFloor(a:{x:number;z:number},dx:number,dz:number,s:WorldState,radius=PLAYER_RADIUS){
 const count=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.07)),sx=dx/count,sz=dz/count;
 for(let n=0;n<count;n++){
  const old=floorY(a.x,a.z);
  if(walkable(a.x+sx,a.z,s,radius)&&Math.abs(floorY(a.x+sx,a.z)-old)<.25)a.x+=sx;
  if(walkable(a.x,a.z+sz,s,radius)&&Math.abs(floorY(a.x,a.z+sz)-floorY(a.x,a.z))<.25)a.z+=sz;
 }
}
export function closestNode(x:number,z:number):string{let best=worldData.nodes[0],distance=Infinity;for(const n of worldData.nodes){const d=(n.x-x)**2+(n.z-z)**2;if(d<distance){best=n;distance=d;}}return best.id;}
export function findRoute(state:WorldState,start:string,goal:string):string[]{
 if(start===goal)return[goal];const queue=[start],seen=new Set([start]),parent=new Map<string,string>();
 while(queue.length){const current=queue.shift()!;
  for(const [a,b] of worldData.edges){if(!state.mechanisms.serviceGateOpen&&((a==='understage'&&b==='arenaEast')||(b==='understage'&&a==='arenaEast')))continue;const next=a===current?b:b===current?a:null;if(!next||seen.has(next))continue;
   parent.set(next,current);seen.add(next);if(next===goal){const path=[goal];while(path[0]!==start)path.unshift(parent.get(path[0])!);return path.slice(1);}queue.push(next);
  }
 }return[];
}
export function nodePosition(id:string){return nodeById[id];}
export function repairWorldPositions(s:WorldState){
 for(const actor of [s.player,...Object.values(s.actors)]){
  if(walkable(actor.x,actor.z,s))continue;const x=actor.x,z=actor.z;let found=false;
  for(let r=.15;r<=3&&!found;r+=.15)for(let n=0;n<24;n++){const a=n*Math.PI/12,nx=x+Math.cos(a)*r,nz=z+Math.sin(a)*r;if(walkable(nx,nz,s)){actor.x=nx;actor.z=nz;found=true;break;}}
  if(!found){const node=worldData.nodes.find(n=>walkable(n.x,n.z,s))!;actor.x=node.x;actor.z=node.z;}
  if('route' in actor&&'routeIndex' in actor){actor.route=[];actor.routeIndex=0;}
 }
}
