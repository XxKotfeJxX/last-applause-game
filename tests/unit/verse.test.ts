import { describe,it,expect } from 'vitest';
import game from '../../content/locales/uk/game.json';
import ui from '../../content/locales/uk/ui.json';
import profiles from '../../content/speech/profiles.json';
import { characters,dialogues } from '../../src/content';
import { createWorld,execute,getOptions } from '../../src/domain/game';
import { verse } from '../../src/content/verse';
describe('authored poetic content',()=>{
 it('covers every NPC in all decay stages with distinct registered speech profiles',()=>{
  expect(new Set(characters.map(c=>c.speechProfileId)).size).toBe(6);
  for(const c of characters){expect(profiles.profiles.some(p=>p.id===c.speechProfileId)).toBe(true);for(let stage=0;stage<4;stage++){const s=createWorld();s.decayStage=stage;Object.assign(s.player,{x:s.actors[c.id].x,z:s.actors[c.id].z});const result=execute(s,c.id,'talk');expect(result.ok).toBe(true);expect(result.message).toContain('\n');expect(result.message).not.toMatch(/\{p\d+\}/);expect(dialogues.some(d=>d.actorId===c.id&&d.minDecay===stage&&result.message.includes(d.text))).toBe(true);}}
 });
 it('resolves every catalog substitution and preserves clear costs and disabled prerequisites',()=>{
  for(const [id,text] of Object.entries({...game,...ui})){const params=Object.fromEntries([...text.matchAll(/\{(\w+)\}/g)].map(m=>[m[1],'EXAMPLE']));expect(verse(id,params)).not.toMatch(/\{p\d+\}/);}
  const s=createWorld();s.tokens=0;const option=getOptions(s,'npc.quartermaster').find(o=>o.id==='issueSafe')!;expect(option.enabled).toBe(false);expect(option.label).toContain('1 жетон');expect(option.reason).toContain('1 жетон');
 });
 it('keeps known prices and completed prerequisites truthful at every decay stage',()=>{
  for(let stage=0;stage<4;stage++){
   const s=createWorld();s.decayStage=stage;s.facts.push('fact.hidden_passage','fact.safe_issued');s.mechanisms.rigPrepared=true;
   for(const id of ['npc.illusionist','npc.acrobat','npc.quartermaster']){
    Object.assign(s.player,{x:s.actors[id].x,z:s.actors[id].z});const message=execute(s,id,'talk').message;
    const eligible=dialogues.filter(d=>d.actorId===id&&(d.requiresFact||d.requiresMechanism)&&d.minDecay===stage);
    expect(eligible.some(d=>message===d.text)).toBe(true);
   }
  }
 });

});
