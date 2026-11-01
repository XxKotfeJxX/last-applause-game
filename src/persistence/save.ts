import { acts, characterById, characters, initialOrder, itemById, items, nodeById, pack, stationById, worldData } from '../content';
import { rulesFor } from '../domain/rules';
import { createWorld } from '../domain/game';
import type { WorldState } from '../domain/types';
import { repairWorldPositions } from '../simulation/navigation';
import { migrateSave } from './migrations';
const prefix='last-applause:v1:';
const error=()=>new Error('Запис не впізнався у світлі рампи.\nНову виставу почніть — старий лишився в пам’яті.');
const finite=(n:unknown)=>typeof n==='number'&&Number.isFinite(n);
const strings=(v:unknown):v is string[]=>Array.isArray(v)&&v.every(x=>typeof x==='string');
/** Validate before replacing the live world. A broken/foreign save never overwrites its stored source. */
export function validateWorld(value:unknown):WorldState{
  if(!value||typeof value!=='object')throw error();
  const s=value as WorldState;
  try{
    rulesFor(s);
    const require=(valid:unknown)=>{if(!valid)throw error();};
    require(s.schemaVersion===1&&s.contentPackId===pack.id&&s.contentVersion===pack.version);
    require(['playing','act','finale','dead','won'].includes(s.mode));
    for(const n of ['seed','gameTimeMs','tokens','decayStage','navigationVersion','eventSequence','cueIndex','finaleDeadline'] as const)require(finite(s[n])&&s[n]>=0);
    require(Number.isInteger(s.tokens)&&Number.isInteger(s.decayStage)&&s.decayStage<=3&&Number.isInteger(s.cueIndex)&&s.cueIndex<=2);
    const position=(a:WorldState['player'])=>require(a&&finite(a.x)&&finite(a.z)&&finite(a.animationStartedAt)&&['south','west','east','north'].includes(a.direction)&&['idle','walk','talk','interact','react','perform','carry_walk'].includes(a.animationState));
    position(s.player);
    require(s.actors&&Object.keys(s.actors).length===characters.length);
    for(const def of characters){const a=s.actors[def.id];position(a);require(a.id===def.id&&nodeById[a.nodeId]&&nodeById[a.goalNode]&&strings(a.route)&&a.route.every(n=>nodeById[n])&&Number.isInteger(a.routeIndex)&&a.routeIndex>=0&&a.routeIndex<=a.route.length&&Number.isInteger(a.routineIndex)&&finite(a.waitUntil)&&Number.isInteger(a.planRevision)&&typeof a.task==='string'&&typeof a.reaction==='string');}
    require(s.items&&Object.keys(s.items).length===items.length);const carry=new Set<string>(),installed=new Set<string>();
    for(const def of items){const id=`instance.${def.id}`,i=s.items[id];require(i&&i.instanceId===id&&i.defId===def.id&&itemById[i.defId]&&typeof i.state==='string');const l=i.location;require(l&&typeof l==='object');
      if(l.kind==='world')require(worldData.areas.some(a=>a.id===l.areaId)&&finite(l.x)&&finite(l.z));
      else if(l.kind==='actor'){require((l.actorId==='player'||characterById[l.actorId])&&['inventory','carry'].includes(l.slot));if(l.slot==='carry'){require(!carry.has(l.actorId));carry.add(l.actorId);}}
      else if(l.kind==='installed'){require(stationById[l.stationId]&&typeof l.slot==='string');const key=l.stationId+':'+l.slot;require(!installed.has(key));installed.add(key);}
      else require(l.kind==='removed'&&['consumed','erased','destroyed'].includes(l.reason));
    }
    require(strings(s.facts)&&strings(s.log)&&s.log.length<=45&&s.mechanisms&&Object.values(s.mechanisms).every(x=>typeof x==='boolean'));
    require(s.areaStates&&Object.entries(s.areaStates).every(([id,v])=>(worldData.areas.some(a=>a.id===id)||id.startsWith('area.'))&&['intact','fading','erased'].includes(v)));
    for(const id of Object.keys(createWorld().areaStates))require(s.areaStates[id]);
    require(Array.isArray(s.slots)&&s.slots.length===initialOrder.length&&new Set(s.slots.map(x=>x.actId)).size===initialOrder.length);
    for(const [i,slot] of s.slots.entries())require(slot.id===`slot.${i}`&&initialOrder.includes(slot.actId)&&['scheduled','called','preparing','performing','completed'].includes(slot.status));
    const actIds=new Set(acts.map(a=>a.id)),slotIds=new Set(s.slots.map(x=>x.id));
    require(s.activeActId===null||actIds.has(s.activeActId));if(s.mode==='act')require(s.activeActId&&s.slots.some(x=>x.actId===s.activeActId&&x.status==='performing'));
    require(Array.isArray(s.agreements)&&new Set(s.agreements.map(a=>a.id)).size===s.agreements.length);
    for(const a of s.agreements)require(typeof a.id==='string'&&slotIds.has(a.currentSlotId)&&slotIds.has(a.candidateSlotId)&&actIds.has(a.currentActId)&&actIds.has(a.candidateActId)&&strings(a.candidateActorIds)&&a.candidateActorIds.every(id=>characterById[id])&&['proposed','candidateAccepted','committed','rejected','cancelled','invalidated'].includes(a.status)&&finite(a.price)&&a.price>=0&&typeof a.paid==='boolean'&&typeof a.actorConsent==='boolean'&&typeof a.displacedActorConsent==='boolean');
    require(Array.isArray(s.events)&&new Set(s.events.map(e=>e.id)).size===s.events.length);
    for(const e of s.events)require(typeof e.id==='string'&&finite(e.dueTimeMs)&&characterById[e.actorId]&&Number.isInteger(e.planRevision)&&e.kind==='pickupKnives');
    require((s.ending===null||typeof s.ending==='string')&&(s.deathReason===null||typeof s.deathReason==='string'));
    return s;
  }catch{throw error();}
}
export function saveWorld(slot:'manual'|'checkpoint',world:WorldState):void{
  validateWorld(world);localStorage.setItem(prefix+slot,JSON.stringify(world));
}
export function loadWorld(slot:'manual'|'checkpoint'):WorldState|null{
  const raw=localStorage.getItem(prefix+slot);if(!raw)return null;
  try{const value=JSON.parse(raw);if(value.contentPackId!==pack.id)throw error();const restored=validateWorld(migrateSave(value,pack.version));repairWorldPositions(restored);return restored;}catch{throw error();}
}
export function hasSave(slot:'manual'|'checkpoint'){return !!localStorage.getItem(prefix+slot);}
