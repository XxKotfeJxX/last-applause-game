import { describe,expect,it } from 'vitest';
import { createWorld, execute } from '../../src/domain/game';
import { arrangeCurrent, completeCurrent, doAt, pickup, readyAll } from '../helpers';

const orders=[
  ['act.illusion','act.aerial','act.knives'],['act.illusion','act.knives','act.aerial'],
  ['act.aerial','act.illusion','act.knives'],['act.aerial','act.knives','act.illusion'],
  ['act.knives','act.illusion','act.aerial'],['act.knives','act.aerial','act.illusion']
];
describe('complete show',()=>{
  for(const order of orders)it(`survives with stage knives in order ${order.join(' / ')}`,()=>{
    const s=createWorld();readyAll(s);pickup(s,'item.hero_mask');pickup(s,'item.stage_blood');
    doAt(s,'npc.quartermaster','issueSafe');pickup(s,'item.safe_knives');
    expect(execute(s,'instance.item.hero_mask','equipMask').ok).toBe(true);
    for(const act of order){arrangeCurrent(s,act);expect(s.slots.find(x=>x.status!=='completed')?.actId).toBe(act);completeCurrent(s);}
    expect(s.decayStage).toBe(3);doAt(s,'npc.ringmaster','finalInspect');doAt(s,'station.wheel','swap');doAt(s,'station.wheel','paint');
    doAt(s,'npc.ringmaster','startFinale');expect(execute(s,'station.stage','freeze').ok).toBe(true);expect(s.mode).toBe('won');expect(s.ending).toMatch(/червона фарба/i);
  },30000);
  it('survives through a dressed double, blackout and open passage',()=>{
    const s=createWorld();pickup(s,'item.hero_mask');pickup(s,'item.costume');pickup(s,'item.stage_double');readyAll(s);
    for(let i=0;i<3;i++)completeCurrent(s);
    doAt(s,'npc.ringmaster','finalInspect');doAt(s,'station.wheel','mountDouble');doAt(s,'station.wheel','dressDouble');doAt(s,'station.wheel','maskDouble');
    doAt(s,'station.rig','blackout');doAt(s,'station.passage','openPassage');doAt(s,'npc.ringmaster','startFinale');
    expect(execute(s,'station.stage','escape').ok).toBe(true);expect(s.mode).toBe('won');expect(s.ending).toContain('двійнику');
  },30000);
  it('reports a concrete cause when the final setup is incomplete',()=>{
    const s=createWorld();readyAll(s);for(let i=0;i<3;i++)completeCurrent(s);doAt(s,'npc.ringmaster','finalInspect');doAt(s,'npc.ringmaster','startFinale');
    execute(s,'station.stage','freeze');expect(s.mode).toBe('dead');expect(s.deathReason).toContain('бойові ножі');
  },30000);
});
