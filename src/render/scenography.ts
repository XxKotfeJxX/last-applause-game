import * as T from 'three';
import artJson from '../../content/areas/scenography.json';
import { worldData,actById } from '../content';
import type { WorldState } from '../domain/types';
import { mapObjects,walls,corridorSlope,corridorDeckSections,surfaceHeight,type MapObject } from '../world/layout';
import { objectPresent } from '../simulation/navigation';
import { ModelFactory } from './models';
import type { AssetResolver } from './assets';
export interface AreaArt {visualId:string;wallVisualId:string;wallColor:string;trimColor:string;accentColor:string;theme:string}
export const areaArt=artJson.areas as Record<string,AreaArt>;
export const fixtureArt=artJson.fixtures as Record<string,string>;
export function deckGeometry(x:number,z:number,w:number,d:number):T.BufferGeometry{
 const vertices:number[]=[],uv:number[]=[];
 const corners=[[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]];
 for(const [dx,dz] of corners)vertices.push(x+dx,surfaceHeight(x+dx,z+dz),z+dz);
 for(const [dx,dz] of corners)vertices.push(x+dx,surfaceHeight(x+dx,z+dz)-.28,z+dz);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex([0,2,1,0,3,2,4,5,6,4,6,7,0,1,5,0,5,4,1,2,6,1,6,5,2,3,7,2,7,6,3,0,4,3,4,7]);for(let n=0;n<8;n++)uv.push(n%2,Math.floor(n/2)%2);g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.computeVertexNormals();return g;
}
/** The visible textured floor is the only top face, never a second lid on a box. */
export function floorBaseGeometry(w:number,d:number):T.BoxGeometry{
 const g=new T.BoxGeometry(w,.35,d),index=g.index!,indices:number[]=[];
 for(const group of g.groups)if(group.materialIndex!==2)for(let i=group.start;i<group.start+group.count;i++)indices.push(index.getX(i));
 g.setIndex(indices);g.clearGroups();return g;
}
export function inlayGeometry(x:number,z:number,w:number,d:number):T.BufferGeometry{
 const vertices:number[]=[];for(const [dx,dz] of [[-w/2,-d/2],[w/2,-d/2],[w/2,d/2],[-w/2,d/2]])vertices.push(x+dx,surfaceHeight(x+dx,z+dz)+.008,z+dz);
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex([0,2,1,0,3,2]);g.computeVertexNormals();return g;
}
type Batch={mesh:T.InstancedMesh;entries:{matrix:T.Matrix4;object:MapObject}[]};
export class Scenography{
 readonly factory=new ModelFactory();readonly models=new Map<string,T.Group>();readonly wheelMount:T.Group;
 private floorMaterials=new Map<string,T.MeshStandardMaterial>();private painted:{mat:T.MeshStandardMaterial;id:string}[]=[];
 private batches:Batch[]=[];private dynamicObjects=new Set<string>();private lastDecay='';private lastProgram='';private boardCanvas:HTMLCanvasElement;private boardTexture:T.CanvasTexture;
 constructor(private scene:T.Scene,private assets:AssetResolver){
  for(const a of worldData.areas){
   const body=new T.Mesh(floorBaseGeometry(a.w,a.d),this.factory.material(a.color));body.position.set(a.x,a.floorY-.175,a.z);body.userData.floorBody=true;scene.add(body);
   const mat=new T.MeshStandardMaterial({map:assets.environment(areaArt[a.id].visualId),roughness:1});this.floorMaterials.set(a.id,mat);this.painted.push({mat,id:areaArt[a.id].visualId});
   const floor=new T.Mesh(new T.PlaneGeometry(a.w,a.d),mat);floor.rotation.x=-Math.PI/2;floor.position.set(a.x,a.floorY,a.z);floor.userData.surfaceArea=a.id;scene.add(floor);
  }
  for(const wall of walls){
   const mat=new T.MeshStandardMaterial({map:assets.environment(areaArt[wall.area].wallVisualId),roughness:.9});this.painted.push({mat,id:areaArt[wall.area].wallVisualId});
   const geo=new T.BoxGeometry(wall.w,wall.h,wall.d),uv=geo.attributes.uv;for(let n=0;n<uv.count;n++)uv.setX(n,uv.getX(n)*Math.max(wall.w,wall.d)/4);
   const mesh=new T.Mesh(geo,mat);mesh.position.set(wall.x,wall.floorY+wall.h/2,wall.z);mesh.name=wall.id;scene.add(mesh);
   this.factory.box(scene,wall.w+.04,.06,wall.d+.04,areaArt[wall.area].trimColor,wall.x,wall.floorY+wall.h+.015,wall.z,true);
  }
  for(const c of worldData.corridors){
   const axis=corridorSlope(c).axis;
   for(const {x,z,w,d} of corridorDeckSections(c)){
    const mesh=new T.Mesh(deckGeometry(x,z,w,d),this.factory.material('#766049'));mesh.userData.walkingDeck=true;scene.add(mesh);
    const min=axis==='x'?x-w/2:z-d/2,max=axis==='x'?x+w/2:z+d/2;
    for(let p=min+.2;p<max;p+=.38){const seam=new T.Mesh(inlayGeometry(axis==='x'?p:x,axis==='z'?p:z,axis==='x'?.025:w-.06,axis==='z'?.025:d-.06),this.factory.material('#4e3d34'));seam.userData.inlay=true;scene.add(seam);}
   }
  }
  const ring=this.factory.ring(scene,5.5,.026,'#d2af72',0,.03,0);ring.rotation.x=-Math.PI/2;
  for(const o of mapObjects){const model=this.factory.object(o);model.position.set(o.x,surfaceHeight(o.x,o.z)+(o.y??0),o.z);scene.add(model);this.models.set(o.id,model);if(['wheel','gate','gear'].includes(o.kind))this.dynamicObjects.add(o.id);}
  this.wheelMount=this.models.get('station.wheel')!.getObjectByName('rotor') as T.Group;
  // Board text shows the actual schedule and updates after negotiations.
  this.boardCanvas=document.createElement('canvas');this.boardCanvas.width=512;this.boardCanvas.height=768;this.boardTexture=new T.CanvasTexture(this.boardCanvas);this.boardTexture.colorSpace=T.SRGBColorSpace;
  const board=this.models.get('station.program')!,text=new T.Mesh(new T.PlaneGeometry(1.06,1.45),new T.MeshBasicMaterial({map:this.boardTexture}));text.position.set(0,.97,.153);board.add(text);text.userData.dynamic=true;
  const poster=this.models.get('station.poster')!,canvas=document.createElement('canvas');canvas.width=512;canvas.height=768;const ctx=canvas.getContext('2d')!;ctx.fillStyle='#e8d3a0';ctx.fillRect(0,0,512,768);ctx.fillStyle='#6c2b3a';ctx.textAlign='center';ctx.font='bold 48px Georgia';for(const [i,line] of ['✦','МАСКА','КОЛЕСО','ЧЕРВОНА ПЛЯМА','ЗАВІСА','✦'].entries())ctx.fillText(line,256,110+i*107,460);const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;const pm=new T.Mesh(new T.PlaneGeometry(1.06,1.45),new T.MeshBasicMaterial({map:tex}));pm.position.set(0,.97,.153);poster.add(pm);
  this.batchStatic();
 }
 private batchStatic(){
  const groups=new Map<string,{geometry:T.BufferGeometry;material:T.Material;entries:{matrix:T.Matrix4;object:MapObject}[]}>();
  for(const o of mapObjects){if(this.dynamicObjects.has(o.id))continue;const model=this.models.get(o.id)!;model.updateMatrixWorld(true);model.traverse(child=>{if(!(child instanceof T.Mesh)||child.userData.dynamic)return;const material=child.material as T.Material,key=child.geometry.uuid+material.uuid;let batch=groups.get(key);if(!batch){batch={geometry:child.geometry,material,entries:[]};groups.set(key,batch);}batch.entries.push({matrix:child.matrixWorld.clone(),object:o});child.visible=false;});}
  for(const b of groups.values()){const mesh=new T.InstancedMesh(b.geometry,b.material,b.entries.length);b.entries.forEach((v,i)=>mesh.setMatrixAt(i,v.matrix));mesh.computeBoundingSphere();this.scene.add(mesh);this.batches.push({mesh,entries:b.entries});}
 }
 update(s:WorldState){
  for(const p of this.painted){const map=this.assets.environment(p.id);if(p.mat.map!==map){p.mat.map=map;p.mat.needsUpdate=true;}}
  for(const [id,mat] of this.floorMaterials)mat.color.set(s.areaStates[id]==='fading'?'#827789':'#ffffff');
  const decay=JSON.stringify(s.areaStates);if(decay!==this.lastDecay){this.lastDecay=decay;const zero=new T.Matrix4().makeScale(0,0,0);for(const b of this.batches){b.entries.forEach((e,i)=>b.mesh.setMatrixAt(i,objectPresent(s,e.object)?e.matrix:zero));b.mesh.instanceMatrix.needsUpdate=true;}}
  for(const id of this.dynamicObjects){const model=this.models.get(id)!,o=mapObjects.find(o=>o.id===id)!;model.visible=objectPresent(s,o);if(o.kind==='gear')model.getObjectByName('gear')!.rotation.z=s.gameTimeMs/7000;}
  const gate=this.models.get('station.gate')!.getObjectByName('gateLeaf')!;gate.rotation.y=s.mechanisms.serviceGateOpen?Math.PI/2:0;
  this.wheelMount.rotation.z=s.mode==='finale'?Math.sin(s.gameTimeMs/240)*.11:0;this.wheelMount.updateWorldMatrix(true,false);
  const program=s.slots.map(x=>x.actId+':'+x.status).join('|');if(program!==this.lastProgram){this.lastProgram=program;const c=this.boardCanvas.getContext('2d')!;c.fillStyle='#e8d3a0';c.fillRect(0,0,512,768);c.textAlign='center';c.fillStyle='#642d3c';c.font='bold 34px Georgia';c.fillText('ЧИЙ ВИХІД — ГЛЯДИ,',256,65);c.fillText('СВІЙ ПОРЯДОК ЗНАЙДИ.',256,110);c.textAlign='left';for(const [i,slot] of s.slots.entries()){c.font='bold 30px Georgia';c.fillText(`${i+1}. ${slot.status==='completed'?'✓':''}`,35,185+i*155);const words=actById[slot.actId].name.split(' ');let line='',y=225+i*155;for(const word of words){if(c.measureText(line+word).width>425){c.fillText(line,35,y);line='';y+=37;}line+=word+' ';}c.fillText(line,35,y);}c.font='bold 28px Georgia';c.fillText('4. Останній номер',35,715);this.boardTexture.needsUpdate=true;}
 }
}
