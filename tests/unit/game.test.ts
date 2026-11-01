import { describe,expect,it } from 'vitest';
import { createWorld, execute, getOptions, movePlayer, setActorTask, setAreaState, tickWorld, transferItem } from '../../src/domain/game';
import { itemById, items, pack } from '../../src/content';
import { findRoute } from '../../src/simulation/navigation';

describe('authoritative world',()=>{
  it('moves the single knife instance when the thrower is offscreen, independent of rendering',()=>{
    const a=createWorld(),b=createWorld();tickWorld(a,40000);tickWorld(b,40000);
    expect(a).toEqual(b);
    const knives=a.items['instance.item.live_knives'];expect(knives.location).toEqual({kind:'actor',actorId:'npc.knife_thrower',slot:'inventory'});
    expect(a.actors['npc.knife_thrower'].task).toBe('patrol');
  });
  it('does not duplicate a claimed item and reacts to a missing kit',()=>{
    const s=createWorld(),id='instance.item.live_knives';
    s.player.x=14;s.player.z=-13;expect(execute(s,id,'pickup').ok).toBe(true);
    tickWorld(s,40000);expect(s.items[id].location).toEqual({kind:'actor',actorId:'player',slot:'inventory'});
    expect(s.actors['npc.knife_thrower'].reaction).toContain('немає');
    expect(transferItem(s,id,'world',{kind:'actor',actorId:'npc.stagehand',slot:'inventory'}).ok).toBe(false);
  });
  it('invalidates a scheduled pickup when the plan revision changes',()=>{
    const s=createWorld();const actor=s.actors['npc.knife_thrower'];
    // Drive until the pickup event is scheduled, then replace the plan before it fires.
    for(let i=0;i<300&&actor.task!=='pickupPending';i++)tickWorld(s,100);
    expect(actor.task).toBe('pickupPending');setActorTask(s,actor.id,'patrol','arena');tickWorld(s,2000);
    expect(s.items['instance.item.live_knives'].location.kind).toBe('world');
  });
  it('requires both consents and makes an atomic, one-time paid swap',()=>{
    const s=createWorld();s.player.x=-15;s.player.z=-12;
    expect(execute(s,'npc.illusionist','accept').ok).toBe(false); // current act cannot replace itself
    s.player.x=15;s.player.z=-12;s.mechanisms.rigPrepared=true;
    // Lada is the candidate; position at her current location.
    s.player.x=s.actors['npc.acrobat'].x;s.player.z=s.actors['npc.acrobat'].z;
    expect(execute(s,'npc.acrobat','accept').ok).toBe(true);
    const a=s.agreements[0];expect(a.status).toBe('candidateAccepted');expect(s.slots[0].actId).toBe('act.illusion');
    s.player.x=s.actors['npc.ringmaster'].x;s.player.z=s.actors['npc.ringmaster'].z;
    expect(getOptions(s,'npc.ringmaster').some(o=>o.id===`commit:${a.id}`)).toBe(false);
    s.player.x=s.actors['npc.illusionist'].x;s.player.z=s.actors['npc.illusionist'].z;
    expect(execute(s,'npc.illusionist',`consent:${a.id}`).ok).toBe(true);
    s.player.x=s.actors['npc.ringmaster'].x;s.player.z=s.actors['npc.ringmaster'].z;
    expect(execute(s,'npc.ringmaster',`commit:${a.id}`).ok).toBe(true);
    expect(s.slots.map(x=>x.actId)).toEqual(['act.aerial','act.illusion','act.knives']);
    const tokens=s.tokens;expect(execute(s,'npc.ringmaster',`commit:${a.id}`).ok).toBe(false);expect(s.tokens).toBe(tokens);
  });
  it('rejects a stale candidate without changing the schedule or charging',()=>{
    const s=createWorld();s.mechanisms.rigPrepared=true;
    s.player.x=s.actors['npc.acrobat'].x;s.player.z=s.actors['npc.acrobat'].z;
    expect(execute(s,'npc.acrobat','accept').ok).toBe(true);const a=s.agreements[0];
    s.player.x=s.actors['npc.illusionist'].x;s.player.z=s.actors['npc.illusionist'].z;
    execute(s,'npc.illusionist',`consent:${a.id}`);
    const before=s.slots.map(x=>x.actId),tokens=s.tokens;
    s.actors['npc.acrobat'].task='unavailable';s.player.x=s.actors['npc.ringmaster'].x;s.player.z=s.actors['npc.ringmaster'].z;
    expect(execute(s,'npc.ringmaster',`commit:${a.id}`).ok).toBe(false);
    expect(s.slots.map(x=>x.actId)).toEqual(before);expect(s.tokens).toBe(tokens);
  });
  it('preserves item ownership and NPC routes in serialized state',()=>{
    const s=createWorld();tickWorld(s,12400);s.player.x=16;s.player.z=-13;execute(s,'instance.item.safe_knives','inspect');
    const restored=JSON.parse(JSON.stringify(s));tickWorld(s,10000);tickWorld(restored,10000);
    expect(restored).toEqual(s);
  });
  it('applies decay policy to world items without duplicating items held by the player',()=>{
    const s=createWorld();const wrench=s.items['instance.item.wrench'],mask=s.items['instance.item.hero_mask'];
    wrench.location={kind:'world',areaId:'zone.dressing',x:-15,z:-12};
    s.player.x=-14;s.player.z=-10;execute(s,mask.instanceId,'pickup');
    setAreaState(s,'zone.dressing','erased');
    expect(wrench.location).toEqual({kind:'removed',reason:'erased'});
    expect(mask.location).toEqual({kind:'actor',actorId:'player',slot:'inventory'});
    expect(s.player.x).toBe(0);
  });
  it('uses the alternative route when the service gate closes',()=>{
    const s=createWorld();s.player.x=6;s.player.z=0;
    expect(execute(s,'station.gate','closeGate').ok).toBe(true);
    const route=findRoute(s,'understage','arena');
    expect(route).not.toContain('arenaEast');expect(route.at(-1)).toBe('arena');
    for(let i=0;i<50;i++)movePlayer(s,1,0,100);
    expect(s.player.x).toBeLessThan(8.21);expect(s.player.x).toBeGreaterThan(8.0);
  });
  it('accepts a new role-bound double with existing capabilities',()=>{
    const original=pack.roles['role.stage_double'];
    const replacement={...itemById[original],id:'item.paper_double',visualId:'visual.item.paper-double',name:'Паперовий двійник',roleId:'role.stage_double'};
    items.push(replacement);itemById[replacement.id]=replacement;pack.roles['role.stage_double']=replacement.id;
    try{
      const s=createWorld();const instance=s.items[`instance.${replacement.id}`];
      s.player.x=17;s.player.z=-11;expect(execute(s,instance.instanceId,'pickup').ok).toBe(true);
      s.mechanisms.finalInspected=true;s.player.x=2;s.player.z=-1;
      expect(execute(s,'station.wheel','mountDouble').ok).toBe(true);
      expect(instance.location).toEqual({kind:'installed',stationId:'station.wheel',slot:'double'});
    }finally{pack.roles['role.stage_double']=original;items.pop();delete itemById[replacement.id];}
  });
});
