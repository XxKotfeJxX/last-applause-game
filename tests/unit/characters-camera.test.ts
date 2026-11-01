import {describe,it,expect} from 'vitest';
import * as T from 'three';
import {characters} from '../../src/content';
import {CharacterRig,characterClips} from '../../src/render/characters';
import {ModelFactory} from '../../src/render/models';
import {CameraRig,blocksView,shortestAngle,DEFAULT_BEARING} from '../../src/render/camera';
describe('articulated original characters',()=>{
 const factory=new ModelFactory(),people=[{visualId:'visual.character.hero',name:'Герой',color:'#e6dac0',accent:'#802c3d'},...characters];
 it('gives all seven characters unique geometry, grounded soles and real attachment points',()=>{
  const signatures=new Set<string>();
  for(const def of people){const rig=new CharacterRig(factory,def),box=new T.Box3().setFromObject(rig.root),meshes:T.Mesh[]=[];rig.root.traverse(m=>{if(m instanceof T.Mesh)meshes.push(m);});
   expect(box.min.y,def.name).toBeCloseTo(0,5);expect(box.max.y).toBeGreaterThan(1.8);expect(box.max.y).toBeLessThan(2.6);expect(meshes.length).toBeGreaterThan(35);
   signatures.add(meshes.map(m=>`${m.geometry.uuid}:${(m.material as T.Material).uuid}:${m.position.toArray()}`).join('|'));
   for(const socket of Object.values(rig.sockets)){expect(socket.parent).not.toBeNull();expect(socket.getWorldPosition(new T.Vector3()).y).toBeGreaterThan(.6);}
  }expect(signatures.size).toBe(7);
 });
 it('animates each joint and held item without moving the world-space actor or another rig',()=>{
  const a=new CharacterRig(factory,people[0]),b=new CharacterRig(factory,people[1]);a.root.position.set(7,3.5,-8);a.animate('idle',0,0);
  const before=a.sockets.handRight.getWorldPosition(new T.Vector3());a.animate('carry_walk',390,390,true);const after=a.sockets.handRight.getWorldPosition(new T.Vector3());
  expect(before.distanceTo(after)).toBeGreaterThan(.1);expect(a.root.position.toArray()).toEqual([7,3.5,-8]);expect(b.joints.armR.rotation.x).toBe(0);
  for(const clip of characterClips)for(const time of [0,100,500,1500,4300,1000000]){a.animate(clip,time,time);a.root.traverse(o=>{expect(o.matrixWorld.elements.every(Number.isFinite),`${clip}:${o.name}`).toBe(true);});}
 });
 it('lets a new content-only NPC reuse an existing rig with independent colors',()=>{const rig=new CharacterRig(factory,{...people[0],visualId:'visual.character.new',modelId:'stagehand',accent:'#447755'});expect(rig.modelId).toBe('stagehand');});
});
describe('camera and sight lines',()=>{
 it('keeps exactly the same bearing while following and immediately reframes teleports',()=>{
  const rig=new CameraRig(),camera=new T.OrthographicCamera();for(const point of [new T.Vector3(0,.8,13),new T.Vector3(1,.8,13),new T.Vector3(-15,4.3,0)]){rig.update(camera,point,16);const offset=camera.position.clone().sub(rig.target);expect(Math.atan2(offset.x,offset.z)).toBeCloseTo(DEFAULT_BEARING,8);expect(offset.y).toBeCloseTo(29,8);}expect(rig.target.toArray()).toEqual([-15,4.3,0]);
 });
 it('rotates along the shortest arc, and WASD remains aligned to the screen during rotation',()=>{
  expect(shortestAngle(Math.PI-.02,-Math.PI+.02)).toBeCloseTo(.04,8);const rig=new CameraRig(),camera=new T.OrthographicCamera(-10,10,10,-10);rig.rotate(7);
  for(let n=0;n<100;n++){rig.update(camera,new T.Vector3(),16);const p=rig.movement(1,0),origin=new T.Vector3().project(camera),right=new T.Vector3(p.x,0,p.z).project(camera);expect(right.x).toBeGreaterThan(origin.x);expect(right.y).toBeCloseTo(origin.y,7);const w=rig.movement(0,-1),up=new T.Vector3(w.x,0,w.z).project(camera);expect(up.y).toBeGreaterThan(origin.y);expect(up.x).toBeCloseTo(origin.x,7);}
 });
 it('cuts away foreground blockers, including raised floors, without hiding objects behind the hero',()=>{
  const eye=new T.Vector3(0,10,10),focus=new T.Vector3(0,0,0);
  expect(blocksView(new T.Box3(new T.Vector3(-1,3,4),new T.Vector3(1,7,6)),eye,focus)).toBe(true);
  expect(blocksView(new T.Box3(new T.Vector3(-1,4,3),new T.Vector3(1,4.4,5)),eye,focus)).toBe(true);
  expect(blocksView(new T.Box3(new T.Vector3(-1,0,-6),new T.Vector3(1,7,-4)),eye,focus)).toBe(false);
  expect(blocksView(new T.Box3(new T.Vector3(4,3,4),new T.Vector3(6,7,6)),eye,focus)).toBe(false);
 });
});
