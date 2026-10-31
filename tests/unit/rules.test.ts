import { it,expect } from 'vitest';
import { createWorld,execute } from '../../src/domain/game';
import { rulesFor } from '../../src/domain/rules';
it('changes the finale deadline through one ruleset and keeps the selected rule in saves',()=>{
 for(const id of ['rules.base','rules.rehearsal']){const s=createWorld(1,id);for(const slot of s.slots)slot.status='completed';s.mechanisms.finalInspected=true;s.player.x=s.actors['npc.ringmaster'].x;s.player.z=s.actors['npc.ringmaster'].z;expect(execute(s,'npc.ringmaster','startFinale').ok).toBe(true);expect(s.finaleDeadline-s.gameTimeMs).toBe(id==='rules.base'?12000:24000);expect(rulesFor(JSON.parse(JSON.stringify(s))).id).toBe(id);}
});
