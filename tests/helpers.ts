import { actById, characterById, stationById } from '../src/content';
import { execute, movePlayer, tickWorld } from '../src/domain/game';
import type { WorldState } from '../src/domain/types';
import { closestNode, findRoute, nodePosition } from '../src/simulation/navigation';

export function stepTo(s:WorldState,x:number,z:number,tolerance=.35){
  for(let i=0;i<1200;i++){
    const dx=x-s.player.x,dz=z-s.player.z;if(Math.hypot(dx,dz)<tolerance)return;
    const before=[s.player.x,s.player.z];movePlayer(s,dx,dz,100);tickWorld(s,100);
    if(i>20&&Math.hypot(s.player.x-before[0],s.player.z-before[1])<.001)throw new Error(`Player blocked going to ${x},${z} from ${s.player.x},${s.player.z}`);
  }
  throw new Error(`Player did not reach ${x},${z}`);
}
export function go(s:WorldState,id:string){
  const location=()=>{
    if(s.actors[id])return s.actors[id];if(stationById[id])return stationById[id];
    const item=s.items[id];if(item?.location.kind==='world')return item.location;
    throw new Error(`Target ${id} has no world location`);
  };
  for(let attempt=0;attempt<8;attempt++){
    const target=location();if(Math.hypot(target.x-s.player.x,target.z-s.player.z)<2.4)return;
    const from=closestNode(s.player.x,s.player.z),to=closestNode(target.x,target.z);
    stepTo(s,nodePosition(from).x,nodePosition(from).z);
    for(const node of findRoute(s,from,to))stepTo(s,nodePosition(node).x,nodePosition(node).z);
    const newest=location();stepTo(s,newest.x,newest.z,2.4);
  }
  throw new Error(`Could not approach ${id}`);
}
export function doAt(s:WorldState,id:string,action:string){go(s,id);const result=execute(s,id,action);if(!result.ok)throw new Error(`${id}:${action}: ${result.message}`);return result;}
export function pickup(s:WorldState,defId:string){const id=`instance.${defId}`;doAt(s,id,'pickup');return id;}
export function readyAll(s:WorldState){for(const id of ['station.cabinet','station.rig','station.wheel'])doAt(s,id,'prepare');}
export function completeCurrent(s:WorldState){doAt(s,'npc.ringmaster','startAct');const actor=s.actors[actById[s.activeActId!].actorId];for(let i=0;i<800&&actor.task!=='performReady';i++)tickWorld(s,100);if(actor.task!=='performReady')throw new Error('Artist never arrived at arena');execute(s,'station.stage','cue');execute(s,'station.stage','cue');}
export function arrangeCurrent(s:WorldState,desiredAct:string){
  const current=s.slots.find(x=>x.status!=='completed');if(!current||current.actId===desiredAct)return;
  const candidateActor=Object.values(characterById).find(x=>x.actIds.includes(desiredAct))!;
  doAt(s,candidateActor.id,'accept');const agreement=s.agreements.at(-1)!;
  const currentActor=Object.values(characterById).find(x=>x.actIds.includes(current.actId))!;
  doAt(s,currentActor.id,`consent:${agreement.id}`);doAt(s,'npc.ringmaster',`commit:${agreement.id}`);
}
