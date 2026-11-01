import * as THREE from 'three';
import { characterById,characters,itemById,items,stationById,worldData } from '../content';
import { floorY,collisionBodies,type CollisionBody } from '../simulation/navigation';
import { mapObjects } from '../world/layout';
import type { WorldState } from '../domain/types';
import { AssetResolver } from './assets';
import { Scenography } from './scenography';
import { ItemIcons } from './item-icons';
type Avatar={mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;shadow:THREE.Mesh;clip:string;atlasKey:string};
const heroDef={visualId:'visual.character.hero',color:'#e6dac0',accent:'#802c3d',name:'Герой'};
export class GameScene{
 readonly renderer:THREE.WebGLRenderer;readonly scene=new THREE.Scene();readonly camera:THREE.OrthographicCamera;
 readonly assets=new AssetResolver();readonly icons=new ItemIcons();
 private scenery:Scenography;private avatars=new Map<string,Avatar>();private itemMeshes=new Map<string,THREE.Group>();private labels=new Map<string,THREE.Sprite>();
 private frustum=new THREE.Frustum();private viewProjection=new THREE.Matrix4();private bounds=new THREE.Sphere(new THREE.Vector3(),2);private debugGroup=new THREE.Group();
 private bloodMark:THREE.Mesh;private debugBodies:CollisionBody[]|null=null;
 constructor(container:HTMLElement){
  this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.setSize(container.clientWidth,container.clientHeight);container.appendChild(this.renderer.domElement);
  this.scene.background=new THREE.Color('#11111c');this.scene.fog=new THREE.Fog('#11111c',30,75);this.scene.add(new THREE.HemisphereLight('#ddd6ff','#241721',2));const light=new THREE.DirectionalLight('#ffe0ad',2.4);light.position.set(-10,24,12);this.scene.add(light);
  this.camera=new THREE.OrthographicCamera(-16,16,10,-10,.1,120);this.camera.position.set(17,22,23);this.scenery=new Scenography(this.scene,this.assets);
  this.avatars.set('player',this.createAvatar(heroDef));for(const c of characters)this.avatars.set(c.id,this.createAvatar(c));
  for(const def of items){const model=this.scenery.factory.item(def);this.scene.add(model);this.itemMeshes.set(`instance.${def.id}`,model);}
  for(const area of worldData.areas){const label=this.makeLabel(area.name,4.8);label.position.set(area.x,area.floorY+3,area.z);this.scene.add(label);this.labels.set(area.id,label);}
  for(const t of worldData.interactables){const o=mapObjects.find(o=>o.id===t.id),label=this.makeLabel(t.name,2.5);label.position.set(t.x,floorY(t.x,t.z)+Math.max(2.1,(o?.h??0)+.3),t.z);this.scene.add(label);this.labels.set(t.id,label);}
  this.bloodMark=new THREE.Mesh(new THREE.CircleGeometry(.15,16),new THREE.MeshBasicMaterial({color:'#ae243a',side:THREE.DoubleSide,transparent:true,depthWrite:false}));this.scene.add(this.bloodMark);
  this.debugGroup.visible=false;this.scene.add(this.debugGroup);this.resize();window.addEventListener('resize',()=>this.resize());
 }
 private makeLabel(text:string,width:number){const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const c=canvas.getContext('2d')!;c.fillStyle='#16121ddd';c.fillRect(8,9,496,77);c.strokeStyle='#d4aa69';c.lineWidth=3;c.strokeRect(8,9,496,77);c.fillStyle='#ffe5ad';c.font='bold 30px Georgia';c.textAlign='center';c.fillText(text,256,60,485);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,depthTest:false}));sprite.scale.set(width,width*96/512,1);return sprite;}
 private buildDebug(s:WorldState){
  const bodies=collisionBodies(s);if(bodies===this.debugBodies)return;this.debugBodies=bodies;
  for(const child of this.debugGroup.children){const helper=child as THREE.Box3Helper;helper.geometry.dispose();(helper.material as THREE.Material).dispose();}this.debugGroup.clear();
  for(const o of bodies){const box=new THREE.Box3(new THREE.Vector3(o.x-o.w/2,o.bottom,o.z-o.d/2),new THREE.Vector3(o.x+o.w/2,o.top,o.z+o.d/2));const helper=new THREE.Box3Helper(box,0x85dfbd);(helper.material as THREE.Material).depthTest=false;this.debugGroup.add(helper);}
 }
 showDebug(value:boolean){this.debugGroup.visible=value;}
  private createAvatar(def:typeof heroDef){
    const geo=new THREE.PlaneGeometry(1.35,2);const mat=new THREE.MeshBasicMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false});
    const mesh=new THREE.Mesh(geo,mat);this.scene.add(mesh);
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(.43,20),new THREE.MeshBasicMaterial({color:'#08070b',transparent:true,opacity:.37,depthWrite:false}));shadow.rotation.x=-Math.PI/2;this.scene.add(shadow);
    return{mesh,shadow,clip:'',atlasKey:''};
  }
  private setAvatar(id:string,def:typeof heroDef,x:number,z:number,clip:string,direction:string,started:number,time:number,hidden=false){
    const view=this.avatars.get(id)!;this.bounds.center.set(x,floorY(x,z)+1,z);const visible=!hidden&&this.frustum.intersectsSphere(this.bounds);view.mesh.visible=visible;view.shadow.visible=visible;if(!visible)return;
    const atlas=this.assets.character(def,clip);
    if(view.mesh.material.map!==atlas.texture){view.mesh.material.map=atlas.texture;view.mesh.material.needsUpdate=true;}
    const elapsed=Math.max(0,time-started),rawFrame=Math.floor(elapsed/1000*(atlas.fps??4)),frame=atlas.loop?rawFrame%atlas.frames:Math.min(rawFrame,atlas.frames-1),row=Math.max(0,['south','west','east','north'].indexOf(direction));
    const uv=view.mesh.geometry.attributes.uv as THREE.BufferAttribute;
    const l=frame/atlas.frames,r=(frame+1)/atlas.frames,top=1-row/4,bottom=1-(row+1)/4;
    uv.setXY(0,l,top);uv.setXY(1,r,top);uv.setXY(2,l,bottom);uv.setXY(3,r,bottom);uv.needsUpdate=true;
    const y=floorY(x,z),h=atlas.worldHeight??2,w=h*(atlas.width??128)/(atlas.height??192),anchor=atlas.anchor??[64,176];
    view.mesh.scale.set(w/1.35,h/2,1);
    const yaw=Math.atan2(this.camera.position.x-x,this.camera.position.z-z),offset=w*(.5-anchor[0]/(atlas.width??128));
    view.mesh.position.set(x+Math.cos(yaw)*offset,y+h*(anchor[1]/(atlas.height??192)-.5),z-Math.sin(yaw)*offset);view.shadow.position.set(x,y+.025,z);
    view.mesh.rotation.y=Math.atan2(this.camera.position.x-x,this.camera.position.z-z);
  }
 update(s:WorldState,dt:number){
  const width=this.renderer.domElement.clientWidth,height=this.renderer.domElement.clientHeight,halfH=10.5,aspect=width/Math.max(1,height);this.camera.left=-halfH*aspect;this.camera.right=halfH*aspect;this.camera.top=halfH;this.camera.bottom=-halfH;this.camera.updateProjectionMatrix();
  const target=new THREE.Vector3(s.player.x,floorY(s.player.x,s.player.z)+.7,s.player.z);this.camera.position.lerp(target.clone().add(new THREE.Vector3(16,21,24)),Math.min(1,dt/250));this.camera.lookAt(target);this.camera.updateMatrixWorld();this.frustum.setFromProjectionMatrix(this.viewProjection.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse));
  if(this.debugGroup.visible)this.buildDebug(s);this.scenery.update(s);this.setAvatar('player',heroDef,s.player.x,s.player.z,s.player.animationState,s.player.direction,s.player.animationStartedAt,s.gameTimeMs);for(const a of Object.values(s.actors))this.setAvatar(a.id,characterById[a.id],a.x,a.z,a.animationState,a.direction,a.animationStartedAt,s.gameTimeMs);
  for(const item of Object.values(s.items)){
   const mesh=this.itemMeshes.get(item.instanceId)!,def=itemById[item.defId],l=item.location,baseScale=Number(mesh.userData.baseScale??mesh.scale.x);mesh.userData.baseScale=baseScale;mesh.scale.setScalar(baseScale);mesh.rotation.set(0,0,0);let show=true,x=0,z=0,y=0;
   if(l.kind==='world'){x=l.x;z=l.z;y=floorY(x,z)+.015;}
   else if(l.kind==='actor'){
    const a=l.actorId==='player'?s.player:s.actors[l.actorId],isMask=def.modelId==='mask'&&l.actorId==='player'&&s.mechanisms.heroMaskEquipped;
    if(!a||(!isMask&&l.actorId==='player'&&l.slot!=='carry'))show=false;
    else{const avatar=this.assets.character(l.actorId==='player'?heroDef:characterById[l.actorId],a.animationState),anchor=avatar.anchor??[64,176],socket=avatar.sockets?.[isMask?'head':'handRight']??[94,112],unit=(avatar.worldHeight??2)/(avatar.height??192),yaw=Math.atan2(this.camera.position.x-a.x,this.camera.position.z-a.z),dx=(socket[0]-anchor[0])*unit;
     x=a.x+Math.cos(yaw)*dx+.04;z=a.z-Math.sin(yaw)*dx+.11;const height=Number(mesh.userData.height);if(isMask){mesh.scale.multiplyScalar(.6);y=floorY(a.x,a.z)+(anchor[1]-socket[1])*unit-height*.3;mesh.rotation.y=yaw;}else y=Math.max(floorY(a.x,a.z)+.015,floorY(a.x,a.z)+(anchor[1]-socket[1])*unit-height*.45);
    }
   }else if(l.kind==='installed'){
    const mounted=['double','costume','mask'].includes(l.slot);if(mounted){const local=new THREE.Vector3(l.slot==='costume'?.015:0,(l.slot==='double'?.28:l.slot==='costume'?.72:2.0)-1.45,l.slot==='double'?.28:l.slot==='costume'?.54:.57);const pos=this.scenery.wheelMount.localToWorld(local);x=pos.x;y=pos.y;z=pos.z;mesh.rotation.z=this.scenery.wheelMount.rotation.z;if(l.slot==='costume')mesh.scale.multiplyScalar(1.6);if(l.slot==='mask')mesh.scale.multiplyScalar(.6);}else{x=3.6;y=.02;z=-1;}
   }else show=false;
   this.bounds.center.set(x,y+Number(mesh.userData.height)/2,z);mesh.visible=show&&this.frustum.intersectsSphere(this.bounds);if(show)mesh.position.set(x,y,z);
  }
  this.bloodMark.visible=(s.mode==='finale'||s.mode==='won')&&(s.mechanisms.bloodReady||s.mechanisms.doubleMounted);if(this.bloodMark.visible){const onDouble=s.mechanisms.doubleMounted&&!s.mechanisms.bloodReady;this.bloodMark.position.set(onDouble?2.02:s.player.x+.12,onDouble?1.27:floorY(s.player.x,s.player.z)+1.16,onDouble?-.18:s.player.z+.13);this.bloodMark.rotation.y=onDouble?0:Math.atan2(this.camera.position.x-s.player.x,this.camera.position.z-s.player.z);}
  for(const [id,label] of this.labels){const p=id.startsWith('zone.')?worldData.areas.find(a=>a.id===id)!:stationById[id],distance=Math.hypot(p.x-s.player.x,p.z-s.player.z);label.visible=id.startsWith('zone.')?distance>5&&distance<22:distance<4.5;}
  this.renderer.render(this.scene,this.camera);
 }
 resize(){const c=this.renderer.domElement.parentElement;if(c)this.renderer.setSize(c.clientWidth,c.clientHeight,false);}
 diagnostics(){return{drawCalls:this.renderer.info.render.calls,textures:this.renderer.info.memory.textures,assetRequests:this.assets.requests.size,placeholderSlots:this.assets.fallback.size};}
}
