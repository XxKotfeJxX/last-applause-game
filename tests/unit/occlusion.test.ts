import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {characterSightRays,occludesCharacter,OcclusionFade} from '../../src/render/occlusion';
import {ModelFactory} from '../../src/render/models';
const camera=new T.OrthographicCamera(-8,8,8,-8,.1,120);camera.position.set(0,10,10);camera.lookAt(0,1,0);camera.updateMatrixWorld();
const rays=characterSightRays(camera,new T.Vector3());
function box(x:number,y:number,z:number,w:number,h:number,d:number){const m=new T.Mesh(new T.BoxGeometry(w,h,d),new T.MeshBasicMaterial());m.position.set(x,y,z);m.updateMatrixWorld(true);return m;}
describe('only geometry occluding the character fades',()=>{
 it('uses parallel orthographic rays and a tight torso/head silhouette',()=>{
  for(const r of rays){expect(r.ray.direction.distanceTo(rays[0].ray.direction)).toBeLessThan(1e-8);const end=r.ray.at(r.distance+.04,new T.Vector3());expect(Math.abs(end.x)).toBeLessThanOrEqual(.121);expect(end.y).toBeGreaterThan(1);}
 });
 it('ignores adjacent touched furniture, low furniture, geometry behind and empty archways',()=>{
  expect(occludesCharacter([box(.58,1.2,0,.55,2,.6)],rays)).toBe(false); // contact at the side, not the sight line
  expect(occludesCharacter([box(0,.25,.7,1,.5,1)],rays)).toBe(false);
  expect(occludesCharacter([box(0,1.1,-1.2,1,2,1)],rays)).toBe(false);
  expect(occludesCharacter([box(0,14,15,3,4,3)],rays)).toBe(false);
  const arch=new T.Group();arch.add(box(-1.5,2,2,.2,4,.2),box(1.5,2,2,.2,4,.2),box(0,4,2,3,.15,.2));arch.updateMatrixWorld(true);
  expect(occludesCharacter([arch],rays)).toBe(false); // bounding box intersects the rays, real opening does not
 });
 it('detects an actual wall between the camera and the torso, even when the source mesh is batched',()=>{
  const wall=box(0,2.5,2,3,3,.2);wall.visible=false;expect(occludesCharacter([wall],rays)).toBe(true);
  const portal=new ModelFactory().object({id:'test.portal',kind:'portal',area:'zone.arena',x:0,z:2,w:4,h:4,d:.2,solid:true});portal.position.z=2;portal.updateMatrixWorld(true);expect(occludesCharacter([portal],rays)).toBe(false);
 });
 it('starts opaque, fades in and out over time, holds briefly at an edge, and remains frame-rate independent',()=>{
  const a=new OcclusionFade();for(let i=0;i<60;i++)expect(a.update(false,16)).toBe(1);
  const first=a.update(true,16);expect(first).toBeGreaterThan(.8);expect(first).toBeLessThan(1);
  for(let i=0;i<25;i++)a.update(true,16);expect(a.opacity).toBeLessThan(.21);
  const before=a.opacity;expect(a.update(false,16)).toBeLessThanOrEqual(before);for(let i=0;i<8;i++)a.update(false,16);const recovering=a.opacity;expect(recovering).toBeGreaterThan(before);expect(recovering).toBeLessThan(1);
  for(let i=0;i<90;i++)a.update(false,16);expect(a.opacity).toBe(1);
  const b=new OcclusionFade(),c=new OcclusionFade();for(let i=0;i<30;i++)b.update(true,1000/30);for(let i=0;i<120;i++)c.update(true,1000/120);expect(b.opacity).toBeCloseTo(c.opacity,5);
 });
});
