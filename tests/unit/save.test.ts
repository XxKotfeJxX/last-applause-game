import { describe,it,expect } from 'vitest';
import { createWorld,tickWorld } from '../../src/domain/game';
import { validateWorld } from '../../src/persistence/save';
import { migrateSave } from '../../src/persistence/migrations';
describe('save boundary',()=>{
 it('accepts an old version-1 world after independent NPC tasks have progressed',()=>{const s=createWorld();tickWorld(s,40000);expect(validateWorld(JSON.parse(JSON.stringify(s)))).toEqual(s);});
 it('rejects broken references and duplicate equipped slots before restoring a world',()=>{
  const s=createWorld();s.actors['npc.stagehand'].route=['missing-node'];expect(()=>validateWorld(s)).toThrow();
  const other=createWorld();other.items['instance.item.hero_mask'].location={kind:'actor',actorId:'missing-actor',slot:'inventory'};expect(()=>validateWorld(other)).toThrow();
  const duplicate=createWorld();duplicate.items['instance.item.live_knives'].location={kind:'installed',stationId:'station.wheel',slot:'knives'};duplicate.items['instance.item.safe_knives'].location={kind:'installed',stationId:'station.wheel',slot:'knives'};expect(()=>validateWorld(duplicate)).toThrow();
 });
 it('renames definitions, instance keys and references without rewriting dialogue or the original save',()=>{
  const s=createWorld();s.log=['item.hero_mask is a word in this sentence'];
  const m=migrateSave(s,2,[{from:1,to:2,aliases:{'item.hero_mask':'item.new_mask'}}]) as typeof s;
  expect(m.items['instance.item.new_mask'].defId).toBe('item.new_mask');expect(m.log).toEqual(s.log);expect(s.items['instance.item.hero_mask']).toBeDefined();expect(m.contentVersion).toBe(2);
  expect(()=>migrateSave(s,3,[])).toThrow();
 });
});
