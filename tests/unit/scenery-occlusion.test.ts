import {describe,it,expect,vi} from 'vitest';
import * as T from 'three';
import {Scenography} from '../../src/render/scenography';
import type {AssetResolver} from '../../src/render/assets';
import {createWorld} from '../../src/domain/game';
import {CameraRig} from '../../src/render/camera';
import {walkable} from '../../src/simulation/navigation';
describe('whole-scene fade and batching',()=>{
 it('keeps untouched objects opaque, isolates materials and restores original batches after a smooth fade',()=>{
  const ctx={fillRect:()=>{},fillText:()=>{},drawImage:()=>{},measureText:(s:string)=>({width:s.length*15})};
  vi.stubGlobal('document',{baseURI:'https://game.test/',createElement:()=>({width:512,height:768,getContext:()=>ctx})});vi.stubGlobal('Image',class{onload=null;src='';});
  try{
   const scene=new T.Scene(),assets={environment:()=>new T.Texture()} as unknown as AssetResolver,art=new Scenography(scene,assets),s=createWorld(),camera=new T.OrthographicCamera(-10,10,10,-10,.1,120),rig=new CameraRig();
   const cut=(feet:T.Vector3,dt=16)=>{rig.update(camera,feet.clone().add(new T.Vector3(0,.8,0)),100);art.update(s);art.cutaway(s,camera,feet,dt);};
   const allMeshes=(id:string)=>{const out:T.Mesh[]=[];art.models.get(id)!.traverse(m=>{if(m instanceof T.Mesh)out.push(m);});return out;};
   const cabinet=allMeshes('station.cabinet'),original=cabinet.map(m=>m.material),other=allMeshes('station.workbench');
   cut(new T.Vector3(0,0,13));expect(cabinet.every(m=>(m.material as T.Material).opacity===1)).toBe(true);
   const behindCabinet=new T.Vector3(-17,0,-12);expect(walkable(behindCabinet.x,behindCabinet.z,s)).toBe(true);cut(behindCabinet);
   expect(cabinet.some(m=>(m.material as T.Material).opacity<1)).toBe(true);expect(cabinet.every(m=>(m.material as T.Material).opacity>.8)).toBe(true);expect(other.every(m=>(m.material as T.Material).opacity===1)).toBe(true);
   for(let i=0;i<30;i++)cut(behindCabinet);expect(cabinet.every(m=>(m.material as T.Material).opacity<.2)).toBe(true);
   for(let i=0;i<110;i++)cut(new T.Vector3(0,0,13));expect(cabinet.every((m,i)=>m.material===original[i])).toBe(true);expect(cabinet.every(m=>!m.visible)).toBe(true);
   // The static source is hidden again; a nonzero instance renders it once in the opaque batch.
   let instances=0;const matrix=new T.Matrix4();for(const child of scene.children)if(child instanceof T.InstancedMesh){for(let i=0;i<child.count;i++){child.getMatrixAt(i,matrix);if(matrix.elements.some(n=>n!==0)&&matrix.elements[0]!==0)instances++;}}expect(instances).toBeGreaterThan(100);
  }finally{vi.unstubAllGlobals();}
 });
});
