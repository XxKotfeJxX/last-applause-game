import worldJson from '../../content/areas/world.json';
import charactersJson from '../../content/characters/characters.json';
import itemsJson from '../../content/items/items.json';
import actsJson from '../../content/acts/acts.json';
import packJson from '../../content/packs/base.json';
import dialogueJson from '../../content/dialogues/dialogues.json';

export interface AreaDef { id: string; name: string; x: number; z: number; w: number; d: number; floorY: number; color: string }
export interface CorridorDef { a: string; b: string; x: number; z: number; w: number; d: number }
export interface NodeDef { id: string; x: number; z: number; area: string }
export interface StationDef { id: string; name: string; x: number; z: number; area: string; kind: string }
export interface CharacterDef { modelId?:string; id: string; name: string; visualId: string; color: string; accent: string; start: string; patrol: string[]; roleIds: string[]; actIds: string[]; speechProfileId:string }
export interface ItemDef { id: string; name: string; visualId: string; modelId?:string; capabilities: string[]; carryClass: 'small' | 'large'; decayPolicy: 'persistent' | 'local'; roleId: string; startArea: string; x: number; z: number }
export interface ActDef { id: string; name: string; actorId: string; prepStation: string; prepKey: string; cueLabels: string[]; fact: string }
export const worldData = worldJson as { schemaVersion: number; areas: AreaDef[]; corridors: CorridorDef[]; nodes: NodeDef[]; edges: string[][]; interactables: StationDef[] };
export const characters = charactersJson.characters as CharacterDef[];
export const items = itemsJson.items as ItemDef[];
export const acts = actsJson.acts as ActDef[];
export const initialOrder = actsJson.initialOrder as string[];
export const pack = packJson as { id: string; version: number; roles: Record<string,string> };
export interface DialogueLine { id:string; actorId:string; text:string; priority:number; requiresFact?:string; requiresMechanism?:string; minDecay?:number }
export const dialogues = dialogueJson.lines as DialogueLine[];
export const characterById = Object.fromEntries(characters.map(x => [x.id, x])) as Record<string,CharacterDef>;
export const itemById = Object.fromEntries(items.map(x => [x.id, x])) as Record<string,ItemDef>;
export const actById = Object.fromEntries(acts.map(x => [x.id, x])) as Record<string,ActDef>;
export const stationById = Object.fromEntries(worldData.interactables.map(x => [x.id, x])) as Record<string,StationDef>;
export const nodeById = Object.fromEntries(worldData.nodes.map(x => [x.id, x])) as Record<string,NodeDef>;
