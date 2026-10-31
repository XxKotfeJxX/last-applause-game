import * as THREE from 'three';
import { characterById, characters, itemById, items, stationById, worldData } from '../content';
import { floorY } from '../simulation/navigation';
import type { WorldState } from '../domain/types';
import { AssetResolver, clipFps } from './assets';

type Avatar={mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;shadow:THREE.Mesh;clip:string;atlasKey:string};
const heroDef={visualId:'visual.character.hero',color:'#e6dac0',accent:'#802c3d',name:'Герой'};
export class GameScene {
  readonly renderer:THREE.WebGLRenderer;readonly scene=new THREE.Scene();readonly camera:THREE.OrthographicCamera;
  readonly assets=new AssetResolver();
  private avatars=new Map<string,Avatar>();private itemMeshes=new Map<string,THREE.Mesh>();
  private zoneMeshes=new Map<string,THREE.Object3D[]>();private labels=new Map<string,THREE.Sprite>();
  private seats:THREE.Object3D[]=[];private galleryLights:THREE.Object3D[]=[];private portrait!:THREE.Sprite;
  private debugGroup=new THREE.Group();
  private wheel!:THREE.Group;private frame=0;
  private gate!:THREE.Mesh;
  private bloodMark!:THREE.Mesh;
  constructor(container:HTMLElement){
    this.renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.setSize(container.clientWidth,container.clientHeight);container.appendChild(this.renderer.domElement);
    this.scene.background=new THREE.Color('#11111c');this.scene.fog=new THREE.Fog('#11111c',27,72);
    this.scene.add(new THREE.HemisphereLight('#ddd6ff','#241721',2.1));
    const light=new THREE.DirectionalLight('#ffe0ad',2.2);light.position.set(-10,24,12);this.scene.add(light);
    const glow=new THREE.PointLight('#c94358',45,17);glow.position.set(0,6,0);this.scene.add(glow);
    this.camera=new THREE.OrthographicCamera(-16,16,9,-9,.1,120);this.camera.position.set(17,22,23);
    this.buildWorld();
    this.bloodMark=new THREE.Mesh(new THREE.CircleGeometry(.2,16),new THREE.MeshBasicMaterial({color:'#ae243a',transparent:true,opacity:.92,side:THREE.DoubleSide,depthWrite:false,depthTest:false}));this.scene.add(this.bloodMark);
    this.buildDebug();
    this.avatars.set('player',this.createAvatar(heroDef));
    for(const def of characters)this.avatars.set(def.id,this.createAvatar(def));
    for(const def of items){const g=new THREE.PlaneGeometry(def.carryClass==='large'?1.4:.8,def.carryClass==='large'?2.1:.8);const m=new THREE.MeshBasicMaterial({map:this.assets.item(def),transparent:true,side:THREE.DoubleSide,depthWrite:false});const mesh=new THREE.Mesh(g,m);this.scene.add(mesh);this.itemMeshes.set(`instance.${def.id}`,mesh);}
    this.resize();window.addEventListener('resize',()=>this.resize());
  }
  private buildDebug(){
    const points:number[]=[];
    for(const [a,b] of worldData.edges){const na=worldData.nodes.find(n=>n.id===a)!,nb=worldData.nodes.find(n=>n.id===b)!;points.push(na.x,floorY(na.x,na.z)+.18,na.z,nb.x,floorY(nb.x,nb.z)+.18,nb.z);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));this.debugGroup.add(new THREE.LineSegments(geo,new THREE.LineBasicMaterial({color:'#8df0aa',depthTest:false})));
    for(const a of worldData.areas){const shape=new THREE.BufferGeometry();shape.setAttribute('position',new THREE.Float32BufferAttribute([a.x-a.w/2,a.floorY+.22,a.z-a.d/2,a.x+a.w/2,a.floorY+.22,a.z-a.d/2,a.x+a.w/2,a.floorY+.22,a.z+a.d/2,a.x-a.w/2,a.floorY+.22,a.z+a.d/2,a.x-a.w/2,a.floorY+.22,a.z-a.d/2],3));this.debugGroup.add(new THREE.Line(shape,new THREE.LineBasicMaterial({color:'#f0c77d',depthTest:false})));}
    this.debugGroup.visible=false;this.scene.add(this.debugGroup);
  }
  showDebug(value:boolean){this.debugGroup.visible=value;}
  private addZoneObject(id:string,obj:THREE.Object3D){this.scene.add(obj);const list=this.zoneMeshes.get(id)??[];list.push(obj);this.zoneMeshes.set(id,list);}
  private box(x:number,y:number,z:number,w:number,h:number,d:number,color:string,area?:string){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),new THREE.MeshStandardMaterial({color,roughness:.83,transparent:true}));mesh.position.set(x,y,z);
    if(area)this.addZoneObject(area,mesh);else this.scene.add(mesh);return mesh;
  }
  private makeLabel(text:string,width=3.4):THREE.Sprite{
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const c=canvas.getContext('2d')!;
    c.fillStyle='rgba(22,18,29,.84)';c.roundRect(8,9,496,77,18);c.fill();c.strokeStyle='#d4aa69';c.lineWidth=3;c.stroke();
    c.fillStyle='#ffe5ad';c.font='bold 30px Georgia, serif';c.textAlign='center';c.fillText(text,256,60,485);
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
    const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:texture,transparent:true,depthTest:false}));sprite.scale.set(width,width*96/512,1);return sprite;
  }
  private buildWorld(){
    for(const a of worldData.areas){
      this.box(a.x,a.floorY-.25,a.z,a.w,.5,a.d,a.color,a.id);
      const wallColor='#252331',h=a.id==='zone.gallery'?1.25:1.6;
      const corridorCuts=(axis:'x'|'z',side:number)=>worldData.corridors.filter(c=>c.a===a.id||c.b===a.id).filter(c=>axis==='x'?Math.abs(c.z-side)<c.d/2+0.15:Math.abs(c.x-side)<c.w/2+0.15).map(c=>axis==='x'?[c.x-c.w/2,c.x+c.w/2]:[c.z-c.d/2,c.z+c.d/2]);
      for(const zSide of [a.z-a.d/2,a.z+a.d/2]){
        let segments:[number,number][]=[[a.x-a.w/2,a.x+a.w/2]];
        for(const [left,right] of corridorCuts('x',zSide))segments=segments.flatMap(([l,r])=>right<=l||left>=r?[[l,r] as [number,number]]:([[l,Math.max(l,left)],[Math.min(r,right),r]] as [number,number][]).filter(([p,q])=>q-p>.2));
        for(const [l,r] of segments)this.box((l+r)/2,a.floorY+h/2,zSide,r-l,h,.26,wallColor,a.id);
      }
      for(const xSide of [a.x-a.w/2,a.x+a.w/2]){
        let segments:[number,number][]=[[a.z-a.d/2,a.z+a.d/2]];
        for(const [left,right] of corridorCuts('z',xSide))segments=segments.flatMap(([l,r])=>right<=l||left>=r?[[l,r] as [number,number]]:([[l,Math.max(l,left)],[Math.min(r,right),r]] as [number,number][]).filter(([p,q])=>q-p>.2));
        for(const [l,r] of segments)this.box(xSide,a.floorY+h/2,(l+r)/2,.26,h,r-l,wallColor,a.id);
      }
      const label=this.makeLabel(a.name,4.8);label.position.set(a.x,a.floorY+3,a.z);this.scene.add(label);this.labels.set(a.id,label);
    }
    for(const c of worldData.corridors){const y=c.b==='zone.gallery'||c.a==='zone.gallery'?1.55:-.22;
      this.box(c.x,y,c.z,c.w,.42,c.d,'#59515b');
    }
    // The upper gallery remains a real elevated platform. Its two entrances have visible ramps.
    const ramp1=this.box(-9,1.6,0,4,.3,3,'#756b60');ramp1.rotation.z=-Math.atan2(3.5,4);
    const ramp2=this.box(-15,1.6,-6,3,.3,4,'#756b60');ramp2.rotation.x=Math.atan2(3.5,4);
    this.box(0,.08,0,12,.15,12,'#653138','zone.arena');
    const ring=new THREE.Mesh(new THREE.TorusGeometry(5.5,.1,8,80),new THREE.MeshStandardMaterial({color:'#deb77f',metalness:.3}));ring.rotation.x=Math.PI/2;ring.position.y=.17;this.addZoneObject('zone.arena',ring);
    this.box(-3.5,1.5,-5.8,2.2,3,.18,'#732b41','zone.arena');
    this.box(3.5,1.5,-5.8,2.2,3,.18,'#732b41','zone.arena');
    this.box(0,3.1,-5.8,9,.55,.2,'#8a3449','zone.arena');
    // Stage wheel and simple machinery are true 3D objects, while people and portable props are upright quads.
    this.wheel=new THREE.Group();this.wheel.position.set(2,0,-1);
    const wheel=new THREE.Mesh(new THREE.TorusGeometry(1.22,.14,12,32),new THREE.MeshStandardMaterial({color:'#c39a6b',roughness:.45}));wheel.position.y=1.45;this.wheel.add(wheel);
    for(let i=0;i<8;i++){const spoke=this.box(0,0,0,.055,2.25,.055,'#ac8355');spoke.rotation.z=i*Math.PI/8;spoke.position.set(0,1.45,0);this.wheel.add(spoke);}
    this.scene.add(this.wheel);this.box(2,.6,-1,.45,1.2,.45,'#42313a');
    for(let j=0;j<2;j++)this.box(-16+j*2,.45,-11,1.2,.9,.8,'#624657','zone.dressing');
    this.portrait=this.makeLabel('Портрет Северина',2.1);this.portrait.position.set(-17,2.05,-14);this.scene.add(this.portrait);
    for(let j=0;j<3;j++)this.box(13+j*1.7,.7,-14,.8,1.4,1.1,'#6b5d49','zone.props');
    for(let j=0;j<5;j++)for(let k=0;k<2;k++)this.seats.push(this.box(-4+j*2,.3,12+k*2,1.1,.6,.55,'#493b3c','zone.foyer'));
    for(let j=0;j<3;j++)this.galleryLights.push(this.box(-17+j*1.7,4.15,2,.45,.35,.45,'#d7b676','zone.gallery'));
    for(const t of worldData.interactables){
      if(t.kind==='wheel')continue;
      if(t.kind==='program'||t.kind==='poster')this.box(t.x,.85,t.z,1.2,1.55,.2,t.kind==='program'?'#b48a64':'#8b555f',t.area);
      else if(t.kind==='cabinet')this.box(t.x,1,t.z,1.35,2,.8,'#6d4d6b',t.area);
      else if(t.kind==='rig')this.box(t.x,4.2,t.z,1.3,1.4,1,'#716448',t.area);
      else if(t.kind==='workbench')this.box(t.x,.6,t.z,1.4,1.2,.8,'#6b5945',t.area);
      else if(t.kind==='passage')this.box(t.x,.05,t.z,1.4,.1,1.4,'#756055',t.area);
      else if(t.kind==='gate')this.gate=this.box(t.x,1,t.z,.2,2,2.8,'#9b7256');
      const label=this.makeLabel(t.name,2.5);label.position.set(t.x,floorY(t.x,t.z)+2.1,t.z);this.scene.add(label);this.labels.set(t.id,label);
    }
  }
  private createAvatar(def:typeof heroDef){
    const geo=new THREE.PlaneGeometry(1.35,2);const mat=new THREE.MeshBasicMaterial({transparent:true,side:THREE.DoubleSide,depthWrite:false});
    const mesh=new THREE.Mesh(geo,mat);this.scene.add(mesh);
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(.43,20),new THREE.MeshBasicMaterial({color:'#08070b',transparent:true,opacity:.37,depthWrite:false}));shadow.rotation.x=-Math.PI/2;this.scene.add(shadow);
    return{mesh,shadow,clip:'',atlasKey:''};
  }
  private setAvatar(id:string,def:typeof heroDef,x:number,z:number,clip:string,direction:string,started:number,time:number,hidden=false){
    const view=this.avatars.get(id)!;view.mesh.visible=!hidden;view.shadow.visible=!hidden;if(hidden)return;
    const atlas=this.assets.character(def,clip);
    if(view.mesh.material.map!==atlas.texture){view.mesh.material.map=atlas.texture;view.mesh.material.needsUpdate=true;}
    const elapsed=Math.max(0,time-started),frame=Math.floor(elapsed/1000*(clipFps[clip]??4))%atlas.frames,row=Math.max(0,['south','west','east','north'].indexOf(direction));
    const uv=view.mesh.geometry.attributes.uv as THREE.BufferAttribute;
    const l=frame/atlas.frames,r=(frame+1)/atlas.frames,top=1-row/4,bottom=1-(row+1)/4;
    uv.setXY(0,l,top);uv.setXY(1,r,top);uv.setXY(2,l,bottom);uv.setXY(3,r,bottom);uv.needsUpdate=true;
    const y=floorY(x,z);view.mesh.position.set(x,y+1,z);view.shadow.position.set(x,y+.025,z);
    view.mesh.rotation.y=Math.atan2(this.camera.position.x-x,this.camera.position.z-z);
  }
  update(s:WorldState,dt:number){
    this.frame++;const width=this.renderer.domElement.clientWidth,height=this.renderer.domElement.clientHeight;
    const aspect=width/Math.max(1,height),halfH=10.5;this.camera.left=-halfH*aspect;this.camera.right=halfH*aspect;this.camera.top=halfH;this.camera.bottom=-halfH;this.camera.updateProjectionMatrix();
    const target=new THREE.Vector3(s.player.x,floorY(s.player.x,s.player.z)+.7,s.player.z);
    const desired=target.clone().add(new THREE.Vector3(16,21,24));this.camera.position.lerp(desired,Math.min(1,dt/250));this.camera.lookAt(target);this.camera.updateMatrixWorld();
    this.setAvatar('player',heroDef,s.player.x,s.player.z,s.player.animationState,s.player.direction,s.player.animationStartedAt,s.gameTimeMs);
    for(const a of Object.values(s.actors))this.setAvatar(a.id,characterById[a.id],a.x,a.z,a.animationState,a.direction,a.animationStartedAt,s.gameTimeMs);
    for(const i of Object.values(s.items)){
      const mesh=this.itemMeshes.get(i.instanceId)!;const def=itemById[i.defId];const nextTexture=this.assets.item(def);const material=mesh.material as THREE.MeshBasicMaterial;if(material.map!==nextTexture){material.map=nextTexture;material.needsUpdate=true;}
      mesh.scale.set(1,1,1);
      let x=0,z=0,y=0,show=true;
      if(i.location.kind==='world'){x=i.location.x;z=i.location.z;y=floorY(x,z)+(def.carryClass==='large'?1:.48);}
      else if(i.location.kind==='actor'){const actor=i.location.actorId==='player'?s.player:s.actors[i.location.actorId];if(!actor){show=false;}else if(i.location.actorId==='player'&&i.defId==='item.hero_mask'&&s.mechanisms.heroMaskEquipped){x=actor.x+.07;z=actor.z+.09;y=floorY(x,z)+1.48;mesh.scale.set(.65,.65,1);}else if(i.location.slot==='carry'||i.location.actorId!=='player'){x=actor.x+.65;z=actor.z;y=floorY(x,z)+(def.carryClass==='large'?1:.85);}else show=false;}
      else if(i.location.kind==='installed'){x=2+((i.location.slot==='double'||i.location.slot==='costume'||i.location.slot==='mask')?0:1.25);z=-1.1;y=i.location.slot==='double'?1.45:.9;
        if(i.location.slot==='costume'){x+=.08;z+=.08;y=1.38;mesh.scale.set(1.45,1.8,1);}
        if(i.location.slot==='mask'){x+=.1;z+=.1;y=2.25;mesh.scale.set(.8,.8,1);}
      }else show=false;
      mesh.visible=show;if(show){mesh.position.set(x,y,z);mesh.rotation.y=Math.atan2(this.camera.position.x-x,this.camera.position.z-z);}
    }
    for(const [id,objects] of this.zoneMeshes){const faded=s.areaStates[id]==='fading';for(const o of objects){const mat=(o as THREE.Mesh).material as THREE.Material|undefined;if(mat&&'opacity' in mat){(mat as THREE.MeshStandardMaterial).opacity=faded?.52:1;(mat as THREE.MeshStandardMaterial).transparent=true;}}}
    this.portrait.visible=s.areaStates['area.dressing.illusionist']!=='erased';
    for(const seat of this.seats)seat.visible=s.areaStates['area.foyer.audience']!=='erased';
    for(const light of this.galleryLights)light.visible=s.areaStates['area.gallery.spotlights']!=='erased';
    this.gate.visible=!s.mechanisms.serviceGateOpen;
    this.bloodMark.visible=(s.mode==='finale'||s.mode==='won')&&(s.mechanisms.bloodReady||s.mechanisms.doubleMounted);
    if(this.bloodMark.visible){const onDouble=s.mechanisms.doubleMounted&&!s.mechanisms.bloodReady,x=onDouble?2.13:s.player.x+.13,z=onDouble?-.87:s.player.z+.13;this.bloodMark.position.set(x,onDouble?1.45:floorY(s.player.x,s.player.z)+1.17,z);this.bloodMark.rotation.y=Math.atan2(this.camera.position.x-x,this.camera.position.z-z);}
    for(const [id,label] of this.labels){label.visible=id.startsWith('zone.')?true:Math.hypot((stationById[id]?.x??0)-s.player.x,(stationById[id]?.z??0)-s.player.z)<6;}
    this.wheel.rotation.z=s.mode==='finale'?Math.sin(s.gameTimeMs/220)*.15:0;
    this.renderer.render(this.scene,this.camera);
  }
  resize(){const c=this.renderer.domElement.parentElement;if(c)this.renderer.setSize(c.clientWidth,c.clientHeight,false);}
  diagnostics(){return {drawCalls:this.renderer.info.render.calls,textures:this.renderer.info.memory.textures,assetRequests:this.assets.requests.size,placeholderSlots:this.assets.fallback.size};}
}
