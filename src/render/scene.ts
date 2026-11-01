import * as THREE from 'three';
import { characterById,characters,itemById,items } from '../content';
import { floorY,collisionBodies,type CollisionBody } from '../simulation/navigation';
import type { WorldState } from '../domain/types';
import { AssetResolver } from './assets';
import { Scenography } from './scenography';
import { ItemIcons } from './item-icons';
import { CharacterRig,type CharacterLook } from './characters';
import { CameraRig,shortestAngle } from './camera';
import { WorldLabels } from './labels';
type Avatar={rig:CharacterRig;shadow:THREE.Mesh;lastX?:number;lastZ?:number;yaw?:number};
const heroDef={visualId:'visual.character.hero',color:'#e6dac0',accent:'#802c3d',name:'Герой'};
export class GameScene{
 readonly renderer:THREE.WebGLRenderer;readonly scene=new THREE.Scene();readonly camera:THREE.OrthographicCamera;
 readonly assets=new AssetResolver();readonly icons=new ItemIcons();
 private scenery:Scenography;private avatars=new Map<string,Avatar>();private itemMeshes=new Map<string,THREE.Group>();private labels:WorldLabels;readonly cameraRig=new CameraRig();
 private frustum=new THREE.Frustum();private viewProjection=new THREE.Matrix4();private bounds=new THREE.Sphere(new THREE.Vector3(),2);private debugGroup=new THREE.Group();
 private visualTime=0;private bloodMark:THREE.Mesh;private debugBodies:CollisionBody[]|null=null;
 constructor(container:HTMLElement){
  this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.setSize(container.clientWidth,container.clientHeight);container.appendChild(this.renderer.domElement);
  this.scene.background=new THREE.Color('#11111c');this.scene.fog=new THREE.Fog('#11111c',30,75);this.scene.add(new THREE.HemisphereLight('#ddd6ff','#241721',2));const light=new THREE.DirectionalLight('#ffe0ad',2.4);light.position.set(-10,24,12);this.scene.add(light);
  this.camera=new THREE.OrthographicCamera(-16,16,10,-10,.1,120);this.camera.position.set(17,22,23);this.scenery=new Scenography(this.scene,this.assets);
  this.avatars.set('player',this.createAvatar(heroDef));for(const c of characters)this.avatars.set(c.id,this.createAvatar(c));
  for(const def of items){const model=this.scenery.factory.item(def);this.scene.add(model);this.itemMeshes.set(`instance.${def.id}`,model);}
  this.labels=new WorldLabels(container);
  this.bloodMark=new THREE.Mesh(new THREE.CircleGeometry(.15,16),new THREE.MeshBasicMaterial({color:'#ae243a',side:THREE.DoubleSide,transparent:true,depthWrite:false}));this.scene.add(this.bloodMark);
  this.debugGroup.visible=false;this.scene.add(this.debugGroup);this.resize();window.addEventListener('resize',()=>this.resize());
 }
 private buildDebug(s:WorldState){
  const bodies=collisionBodies(s);if(bodies===this.debugBodies)return;this.debugBodies=bodies;
  for(const child of this.debugGroup.children){const helper=child as THREE.Box3Helper;helper.geometry.dispose();(helper.material as THREE.Material).dispose();}this.debugGroup.clear();
  for(const o of bodies){const box=new THREE.Box3(new THREE.Vector3(o.x-o.w/2,o.bottom,o.z-o.d/2),new THREE.Vector3(o.x+o.w/2,o.top,o.z+o.d/2));const helper=new THREE.Box3Helper(box,0x85dfbd);(helper.material as THREE.Material).depthTest=false;this.debugGroup.add(helper);}
 }
 showDebug(value:boolean){this.debugGroup.visible=value;}
  private createAvatar(def:CharacterLook){
    const rig=new CharacterRig(this.scenery.factory,def);this.scene.add(rig.root);
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(.36,20),new THREE.MeshBasicMaterial({color:'#08070b',transparent:true,opacity:.32,depthWrite:false}));shadow.rotation.x=-Math.PI/2;this.scene.add(shadow);
    return{rig,shadow};
  }
  private setAvatar(id:string,x:number,z:number,clip:string,direction:string,started:number,time:number,carrying:boolean){
    const view=this.avatars.get(id)!,y=floorY(x,z);this.bounds.center.set(x,y+1,z);const visible=this.frustum.intersectsSphere(this.bounds);view.rig.root.visible=visible;view.shadow.visible=visible;
    const dx=x-(view.lastX??x),dz=z-(view.lastZ??z),moved=Math.hypot(dx,dz),fallback=({south:0,west:-Math.PI/2,east:Math.PI/2,north:Math.PI} as Record<string,number>)[direction]??0;
    if(view.yaw===undefined||moved>6)view.yaw=fallback;else if(moved>.00001)view.yaw=Math.atan2(dx,dz);
    view.lastX=x;view.lastZ=z;view.rig.root.position.set(x,y,z);view.rig.root.rotation.y+=shortestAngle(view.rig.root.rotation.y,view.yaw)*.35;
    // Pose and sockets remain current offscreen, without rendering the actor.
    view.rig.animate(clip,Math.max(0,time-started),time,carrying);view.shadow.position.set(x,y+.025,z);
  }
 update(s:WorldState,dt:number,speakingId?:string){
  this.visualTime+=dt;
  const width=this.renderer.domElement.clientWidth,height=this.renderer.domElement.clientHeight,halfH=10.5,aspect=width/Math.max(1,height);this.camera.left=-halfH*aspect;this.camera.right=halfH*aspect;this.camera.top=halfH;this.camera.bottom=-halfH;this.camera.updateProjectionMatrix();
  const feet=new THREE.Vector3(s.player.x,floorY(s.player.x,s.player.z),s.player.z);this.cameraRig.update(this.camera,feet.clone().add(new THREE.Vector3(0,.8,0)),dt);this.frustum.setFromProjectionMatrix(this.viewProjection.multiplyMatrices(this.camera.projectionMatrix,this.camera.matrixWorldInverse));
  if(this.debugGroup.visible)this.buildDebug(s);this.scenery.update(s);this.scenery.cutaway(s,this.camera,feet,dt);
  const carrying=(id:string)=>Object.values(s.items).some(i=>i.location.kind==='actor'&&i.location.actorId===id&&(id!=='player'||i.location.slot==='carry'));
  this.setAvatar('player',s.player.x,s.player.z,s.player.animationState,s.player.direction,s.player.animationStartedAt,s.gameTimeMs,carrying('player'));
  for(const a of Object.values(s.actors))this.setAvatar(a.id,a.x,a.z,a.id===speakingId?'talk':a.animationState,a.direction,a.id===speakingId?0:a.animationStartedAt,a.id===speakingId?this.visualTime:s.gameTimeMs,carrying(a.id));
  for(const item of Object.values(s.items)){
   const mesh=this.itemMeshes.get(item.instanceId)!,def=itemById[item.defId],l=item.location,baseScale=Number(mesh.userData.baseScale??mesh.scale.x);mesh.userData.baseScale=baseScale;mesh.scale.setScalar(baseScale);mesh.rotation.set(0,0,0);let show=true,x=0,z=0,y=0;
   if(l.kind==='world'){x=l.x;z=l.z;y=floorY(x,z)+.015;}
   else if(l.kind==='actor'){
    const a=l.actorId==='player'?s.player:s.actors[l.actorId],isMask=def.modelId==='mask'&&l.actorId==='player'&&s.mechanisms.heroMaskEquipped;
    if(!a||(!isMask&&l.actorId==='player'&&l.slot!=='carry'))show=false;
    else{const socket=this.avatars.get(l.actorId)!.rig.sockets[isMask?'head':'handRight'],pos=socket.getWorldPosition(new THREE.Vector3());x=pos.x;y=pos.y;z=pos.z;mesh.quaternion.copy(socket.getWorldQuaternion(new THREE.Quaternion()));
     const height=Number(mesh.userData.height);if(isMask)mesh.scale.multiplyScalar(.48);else{const offset=new THREE.Vector3(0,-height*.45,0).applyQuaternion(mesh.quaternion);x+=offset.x;y+=offset.y;z+=offset.z;}
    }
   }else if(l.kind==='installed'){
    const mounted=['double','costume','mask'].includes(l.slot);if(mounted){const local=new THREE.Vector3(l.slot==='costume'?.015:0,(l.slot==='double'?.28:l.slot==='costume'?.72:2.0)-1.45,l.slot==='double'?.28:l.slot==='costume'?.54:.57);const pos=this.scenery.wheelMount.localToWorld(local);x=pos.x;y=pos.y;z=pos.z;mesh.rotation.z=this.scenery.wheelMount.rotation.z;if(l.slot==='costume')mesh.scale.multiplyScalar(1.6);if(l.slot==='mask')mesh.scale.multiplyScalar(.6);}else{x=3.6;y=.02;z=-1;}
   }else show=false;
   this.bounds.center.set(x,y+Number(mesh.userData.height)/2,z);mesh.visible=show&&this.frustum.intersectsSphere(this.bounds);if(show)mesh.position.set(x,y,z);
  }
  this.bloodMark.visible=(s.mode==='finale'||s.mode==='won')&&(s.mechanisms.bloodReady||s.mechanisms.doubleMounted);if(this.bloodMark.visible){const onDouble=s.mechanisms.doubleMounted&&!s.mechanisms.bloodReady;if(onDouble){this.bloodMark.position.set(2.02,1.27,-.18);this.bloodMark.rotation.set(0,0,0);}else{const socket=this.avatars.get('player')!.rig.sockets.chest;this.bloodMark.position.copy(socket.getWorldPosition(new THREE.Vector3()));this.bloodMark.quaternion.copy(socket.getWorldQuaternion(new THREE.Quaternion()));}}
  this.labels.update(s,this.camera,width,height);
  this.renderer.render(this.scene,this.camera);
 }
 resize(){const c=this.renderer.domElement.parentElement;if(c)this.renderer.setSize(c.clientWidth,c.clientHeight,false);}
 diagnostics(){return{drawCalls:this.renderer.info.render.calls,textures:this.renderer.info.memory.textures,assetRequests:this.assets.requests.size,placeholderSlots:this.assets.fallback.size};}
}
