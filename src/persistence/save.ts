import { pack } from '../content';
import type { WorldState } from '../domain/types';
const prefix='last-applause:v1:';
export function saveWorld(slot:'manual'|'checkpoint',world:WorldState):void{
  const payload=JSON.stringify(world),key=prefix+slot;
  // setItem replaces one value atomically. A failed write leaves the previous valid save intact.
  localStorage.setItem(key,payload);
}
export function loadWorld(slot:'manual'|'checkpoint'):WorldState|null{
  const raw=localStorage.getItem(prefix+slot);if(!raw)return null;
  const value=JSON.parse(raw) as WorldState;
  if(value.schemaVersion!==1||value.contentPackId!==pack.id||value.contentVersion!==pack.version||!value.player||!value.items||!value.actors||!Array.isArray(value.slots))throw new Error('Збереження несумісне з поточним пакетом. Почніть нову гру.');
  return value;
}
export function hasSave(slot:'manual'|'checkpoint'){return !!localStorage.getItem(prefix+slot);}
