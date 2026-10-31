export type ItemLocation =
  | { kind: 'world'; areaId: string; x: number; z: number }
  | { kind: 'actor'; actorId: string; slot: 'inventory' | 'carry' }
  | { kind: 'installed'; stationId: string; slot: string }
  | { kind: 'removed'; reason: 'consumed' | 'erased' | 'destroyed' };

export interface ItemState { instanceId: string; defId: string; location: ItemLocation; state: string }
export interface ActorState {
  id: string; x: number; z: number; nodeId: string; goalNode: string; route: string[]; routeIndex: number;
  routineIndex: number; task: string; planRevision: number; animationState: string; animationStartedAt: number;
  direction: 'south' | 'west' | 'east' | 'north'; waitUntil: number; reaction: string;
}
export interface SlotState { id: string; actId: string; status: 'scheduled' | 'called' | 'preparing' | 'performing' | 'completed' }
export interface Agreement {
  id: string; currentSlotId: string; candidateSlotId: string; candidateActorIds: string[];
  status: 'proposed' | 'candidateAccepted' | 'committed' | 'rejected' | 'cancelled' | 'invalidated';
  price: number; actorConsent: boolean; displacedActorConsent: boolean; currentActId: string; candidateActId: string;
  paid: boolean;
}
export interface ScheduledEvent { id: string; dueTimeMs: number; actorId: string; planRevision: number; kind: 'pickupKnives' }
export interface WorldState {
  ruleSetId?: string; schemaVersion: 1; contentPackId: string; contentVersion: number; seed: number; gameTimeMs: number;
  player: { x: number; z: number; direction: ActorState['direction']; animationState: string; animationStartedAt: number };
  actors: Record<string,ActorState>; items: Record<string,ItemState>; tokens: number;
  facts: string[]; mechanisms: Record<string,boolean>; slots: SlotState[]; agreements: Agreement[];
  areaStates: Record<string,'intact'|'fading'|'erased'>; decayStage: number; navigationVersion: number;
  events: ScheduledEvent[]; eventSequence: number; log: string[];
  mode: 'playing' | 'act' | 'finale' | 'dead' | 'won'; activeActId: string | null; cueIndex: number; finaleDeadline: number;
  ending: string | null; deathReason: string | null;
}
export interface Option { id: string; label: string; enabled: boolean; reason?: string }
export interface Result { ok: boolean; message: string; checkpoint?: boolean; sound?: 'ui'|'act'|'decay'|'knife'|'victory'|'death' }
