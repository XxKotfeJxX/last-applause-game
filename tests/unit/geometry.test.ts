import {describe,it,expect} from 'vitest';
import { Box3,Vector3 } from 'three';
import {worldData,items} from '../../src/content';
import {createWorld,movePlayer,tickWorld} from '../../src/domain/game';
import {walkable,floorY,moveOnFloor,repairWorldPositions} from '../../src/simulation/navigation';
import {mapObjects,walls,corridorSections} from '../../src/world/layout';
import {deckGeometry} from '../../src/render/scenography';
import {ModelFactory} from '../../src/render/models';
describe('shared physical map',()=>{
 it('has continuous rendered ramp tops, including the flat lips at both landings',()=>{
  for(const c of worldData.corridors){const section=corridorSections(c);for(let i=0;i<section.cuts.length-1;i++){const a=section.cuts[i],b=section.cuts[i+1];if(b-a<.001)continue;const x=section.axis==='x'?(a+b)/2:c.x,z=section.axis==='z'?(a+b)/2:c.z,g=deckGeometry(x,z,section.axis==='x'?b-a:c.w,section.axis==='z'?b-a:c.d),p=g.attributes.position;for(let v=0;v<4;v++)expect(p.getY(v)).toBeCloseTo(floorY(p.getX(v),p.getZ(v)),5);g.dispose();}}
  expect(floorY(-11,0)).toBe(3.5);expect(floorY(-9,0)).toBe(1.75);expect(floorY(-7,0)).toBe(0);expect(floorY(-15,-8)).toBe(0);expect(floorY(-15,-6)).toBe(1.75);expect(floorY(-15,-4)).toBe(3.5);
 });
 it('keeps every navigation edge clear for both NPCs and a player-sized body',()=>{
  const s=createWorld();for(const [from,to] of worldData.edges){const a=worldData.nodes.find(n=>n.id===from)!,b=worldData.nodes.find(n=>n.id===to)!,len=Math.hypot(b.x-a.x,b.z-a.z);for(let i=0;i<=Math.ceil(len*8);i++){const t=i/Math.ceil(len*8),x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;expect(walkable(x,z,s),`${from} -> ${to}: ${x},${z}`).toBe(true);}}
 });
 it('blocks the complete wall envelope, permits doors and prevents diagonal corner clipping',()=>{
  const s=createWorld();for(const w of walls)expect(walkable(w.x,w.z,s),w.id).toBe(false);
  s.player.x=0;s.player.z=-12;for(let i=0;i<100;i++)movePlayer(s,0,-1,100);expect(s.player.z).toBeGreaterThan(-15.7);
  const p={x:5.9,z:6.1};for(let i=0;i<40;i++)moveOnFloor(p,.3,.3,s);expect(walkable(p.x,p.z,s)).toBe(true);expect(p.x).toBeLessThan(6.7);expect(p.z).toBeLessThan(6.7);
 });
 it('walks up and down both ramps on the surface without a teleport or hanging platform',()=>{
  const s=createWorld();for(const [start,dx,dz,end] of [[[-6,0],-1,0,[-12,0]],[[-15,-9],0,1,[-15,-3]]] as const){Object.assign(s.player,{x:start[0],z:start[1]});let before=floorY(s.player.x,s.player.z);for(let i=0;i<20;i++){movePlayer(s,dx,dz,100);const y=floorY(s.player.x,s.player.z);expect(Math.abs(y-before)).toBeLessThan(.3);before=y;}expect(s.player.x).toBeCloseTo(end[0],0);expect(s.player.z).toBeCloseTo(end[1],0);expect(before).toBe(3.5);for(let i=0;i<20;i++)movePlayer(s,-dx,-dz,100);expect(floorY(s.player.x,s.player.z)).toBe(0);}
 });
 it('blocks furniture, allows a hatch and overhead pipes, and removes the collision of erased benches',()=>{
  const s=createWorld();expect(walkable(-16.35,-11,s)).toBe(false);expect(walkable(15,1,s)).toBe(true);expect(walkable(11.35,0,s)).toBe(true);expect(walkable(-3.8,11,s)).toBe(false);s.areaStates['area.foyer.audience']='erased';expect(walkable(-3.8,11,s)).toBe(true);
 });
 it('repairs legacy positions inside new geometry and keeps offscreen NPCs out of obstacles',()=>{
  const s=createWorld();s.player.x=-16.35;s.player.z=-11;s.actors['npc.stagehand'].x=13.5;s.actors['npc.stagehand'].z=-11;repairWorldPositions(s);expect(walkable(s.player.x,s.player.z,s)).toBe(true);
  for(let i=0;i<1000;i++){tickWorld(s,100);for(const a of Object.values(s.actors))expect(walkable(a.x,a.z,s),a.id).toBe(true);}
  expect(s.items['instance.item.wrench'].location).toMatchObject({kind:'world',areaId:'zone.gallery'});
 });
 it('keeps every interaction target reachable from a free nearby standing position',()=>{
  const s=createWorld();for(const target of [...worldData.interactables,...items.map(i=>({id:i.id,x:i.x,z:i.z}))]){let accessible=false;for(let n=0;n<32;n++){const angle=n*Math.PI/16;if(walkable(target.x+Math.cos(angle)*2,target.z+Math.sin(angle)*2,s)){accessible=true;break;}}expect(accessible,target.id).toBe(true);}
 });
 it('models every placed element and all seven inventory props as real nonempty geometry',()=>{
  const factory=new ModelFactory();for(const o of mapObjects){const model=factory.object(o),box=new Box3().setFromObject(model);expect(box.isEmpty(),o.id).toBe(false);expect(box.min.y,o.id).toBeGreaterThanOrEqual(-.05);}
  expect(new Set(mapObjects.map(o=>o.id)).size).toBe(mapObjects.length);for(const station of worldData.interactables)expect(mapObjects.some(o=>o.id===station.id)).toBe(true);for(const item of items){const model=factory.item(item),box=new Box3().setFromObject(model),size=box.getSize(new Vector3());expect(box.min.y).toBeCloseTo(0,5);expect(size.y).toBeGreaterThan(.5);expect(model.userData.modelId).toBe(item.modelId);}
 });
});
