import * as THREE from 'three';
import artJson from '../../content/areas/scenography.json';
import { worldData, type AreaDef } from '../content';
import type { WorldState } from '../domain/types';
import { floorY } from '../simulation/navigation';
import type { AssetResolver } from './assets';

export interface AreaArt {
  visualId:string;wallVisualId:string;wallColor:string;trimColor:string;accentColor:string;theme:string;
}
export const areaArt=artJson.areas as Record<string,AreaArt>;
export const fixtureArt=artJson.fixtures as Record<string,string>;
type PaintedMaterial=THREE.MeshStandardMaterial|THREE.MeshBasicMaterial;
type Batch={area:string;color:string;emissive:boolean;matrices:THREE.Matrix4[]};

/** Presentation only: never writes positions, navigation, inventory or game flags. */
export class Scenography {
  private floors=new Map<string,THREE.MeshStandardMaterial>();
  private materials=new Map<string,{material:PaintedMaterial;base:THREE.Color}[]>();
  private batches=new Map<string,Batch>();
  private animated:{object:THREE.Object3D;speed:number}[]=[];
  private dust:THREE.Points;
  private loaderGeometry=new THREE.BoxGeometry(1,1,1);
  private decayTint=new THREE.Color('#383546');
  private galleryBulbs:PaintedMaterial[]=[];

  constructor(private scene:THREE.Scene,private assets:AssetResolver){
    for(const area of worldData.areas)this.room(area);
    this.portals();this.flush();
    const vertices:number[]=[];
    for(let i=0;i<48;i++)vertices.push(Math.sin(i*2.399)*6,1+(i%11)*.36,Math.cos(i*2.399)*6);
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    this.dust=new THREE.Points(geo,new THREE.PointsMaterial({color:'#d6b97e',size:.035,transparent:true,opacity:.42,depthWrite:false}));
    this.dust.frustumCulled=true;scene.add(this.dust);
  }

  private track<T extends PaintedMaterial>(area:string,material:T):T{
    const list=this.materials.get(area)??[];list.push({material,base:material.color.clone()});this.materials.set(area,list);return material;
  }
  private box(area:string,color:string,x:number,y:number,z:number,w:number,h:number,d:number,rotation=0,emissive=false){
    const key=`${area}:${color}:${emissive}`;
    let batch=this.batches.get(key);if(!batch){batch={area,color,emissive,matrices:[]};this.batches.set(key,batch);}
    const matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),rotation),new THREE.Vector3(w,h,d));
    batch.matrices.push(matrix);
  }
  private flush(){
    for(const b of this.batches.values()){
      const material=this.track(b.area,b.emissive?new THREE.MeshBasicMaterial({color:b.color}):new THREE.MeshStandardMaterial({color:b.color,roughness:.83,metalness:.12}));
      if(b.area==='zone.gallery'&&b.color==='#f1cb8c')this.galleryBulbs.push(material);
      const mesh=new THREE.InstancedMesh(this.loaderGeometry,material,b.matrices.length);
      b.matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();
      mesh.userData.decorative=true;this.scene.add(mesh);
    }
    this.batches.clear();
  }
  private disc(area:string,x:number,y:number,z:number,radius:number,color:string,opacity=.16){
    const material=this.track(area,new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,side:THREE.DoubleSide}));
    const mesh=new THREE.Mesh(new THREE.CircleGeometry(radius,32),material);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);this.scene.add(mesh);
  }
  private lamp(area:AreaDef,x:number,z:number){
    const y=area.floorY,trim=areaArt[area.id].trimColor;
    this.box(area.id,'#24262b',x,y+1.75,z,.12,.9,.12);
    this.box(area.id,trim,x,y+2.15,z,.4,.1,.4);
    this.box(area.id,trim,x,y+1.6,z,.36,.1,.36);
    this.box(area.id,'#f0c887',x,y+1.87,z,.22,.43,.22,0,true);
    this.disc(area.id,x,y+.018,z,.85,'#f1c07c',.08);
  }
  private room(a:AreaDef){
    const art=areaArt[a.id];if(!art)return;
    const floorMaterial=this.track(a.id,new THREE.MeshStandardMaterial({map:this.assets.environment(art.visualId),color:'#ffffff',roughness:1,metalness:0}));
    const floor=new THREE.Mesh(new THREE.PlaneGeometry(a.w,a.d),floorMaterial);
    floor.rotation.x=-Math.PI/2;floor.position.set(a.x,a.floorY+.012,a.z);floor.userData.areaId=a.id;this.scene.add(floor);
    this.floors.set(a.id,floorMaterial);

    // Corner columns sit on the room boundary, never across an authored doorway.
    for(const sx of [-1,1])for(const sz of [-1,1]){
      const x=a.x+sx*(a.w/2+.04),z=a.z+sz*(a.d/2+.04),front=sx===1&&sz===1;
      const height=front?.9:2.65;
      this.box(a.id,art.wallColor,x,a.floorY+height/2,z,.25,height,.25);
      this.box(a.id,art.trimColor,x,a.floorY+.12,z,.42,.22,.42);
      this.box(a.id,art.trimColor,x,a.floorY+height-.08,z,.38,.13,.38);
    }
    for(const side of [-1,1])this.lamp(a,a.x+side*(a.w/2-.65),a.z-a.d/2+.25);

    if(art.theme==='arena')this.arena(a);
    if(art.theme==='foyer')this.foyer(a);
    if(art.theme==='backstage')this.backstage(a);
    if(art.theme==='dressing')this.dressing(a);
    if(art.theme==='props')this.workshop(a);
    if(art.theme==='understage')this.understage(a);
    if(art.theme==='gallery')this.gallery(a);
  }
  private arena(a:AreaDef){
    const gold=areaArt[a.id].trimColor;
    // A cutaway proscenium frames the stage; there is no opaque ceiling over the player.
    for(const x of [-5.5,5.5]){
      this.box(a.id,'#70283c',x,2.05,-6.65,.65,4.1,.5);
      this.box(a.id,gold,x,4.05,-6.65,.9,.22,.7);
    }
    this.box(a.id,'#75273d',0,4.25,-6.65,11.8,.65,.55);
    this.box(a.id,gold,0,3.89,-6.33,11.8,.09,.06);
    for(let i=0;i<12;i++){
      const x=-5.1+i*.93;
      this.box(a.id,i%2?'#8c364a':'#582138',x,3.58,-6.5,.83,.58,.2);
      this.box(a.id,gold,x,3.26,-6.37,.12,.15,.1);
    }
    for(const side of [-1,1]){
      const material=this.track(a.id,new THREE.MeshStandardMaterial({color:'#b49a6a',roughness:.7,metalness:.4}));
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.5,.045,6,28),material);ring.position.set(side*5,2.8,-6.25);this.scene.add(ring);
    }
    this.disc(a.id,-1,.026,2,.48,'#e9c887',.1);
  }
  private foyer(a:AreaDef){
    // Ticket booths are shallow wall furniture, away from the spawn and central runner.
    for(const side of [-1,1]){
      const x=a.x+side*(a.w/2-.35),z=a.z-1;
      this.box(a.id,'#602b3b',x,.8,z,.55,1.6,2.8);
      this.box(a.id,'#c29b61',x,1.65,z,.68,.12,3);
      for(let i=0;i<5;i++)this.box(a.id,'#d2aa6a',x-side*.31,1.15,z-1+i*.5,.04,.68,.035);
    }
    // Entry arch lies past the playable foyer edge.
    for(const side of [-1,1])this.box(a.id,'#8a3345',side*3,1.65,17.18,.55,3.3,.5);
    this.box(a.id,'#ba955f',0,3.25,17.18,6.6,.36,.5);
  }
  private backstage(a:AreaDef){
    for(const x of [-6.3,6.3]){
      this.box(a.id,'#342a36',x,1.02,-15.9,2.2,2.04,.3);
      this.box(a.id,'#b8935e',x,2.08,-15.85,2.35,.12,.4);
      for(const offset of [-.7,0,.7])this.box(a.id,'#76516a',x+offset,1.06,-15.68,.5,1.8,.03);
    }
    for(const x of [-3.5,3.5]){
      this.box(a.id,'#36303d',x,.38,-15.65,1.8,.75,.42);
      this.box(a.id,'#b59a6d',x,.76,-15.65,1.9,.08,.48);
    }
  }
  private dressing(a:AreaDef){
    for(const x of [-17.5,-13]){
      this.box(a.id,'#614251',x,.75,-15.64,1.7,1.5,.4);
      this.box(a.id,'#bf9b65',x,1.8,-15.73,1.65,1.55,.12);
      this.box(a.id,'#718b8b',x,1.8,-15.65,1.42,1.28,.05,0,true);
      for(let i=0;i<4;i++)this.box(a.id,'#f4d8a5',x-.69+i*.46,2.44,-15.56,.075,.075,.075,0,true);
    }
    for(let i=0;i<5;i++)this.box(a.id,i%2?'#63384d':'#886079',-18.65,1.2,-14.7+i*1.1,.2,2.4,.8);
  }
  private workshop(a:AreaDef){
    for(const x of [12,15.3,18]){
      for(const z of [-15.7]){
        for(const side of [-.7,.7])this.box(a.id,'#34382f',x+side,1.05,z,.09,2.1,.44);
        for(let h=0;h<3;h++)this.box(a.id,'#aa8656',x,.36+h*.7,z,1.7,.09,.62);
        for(let k=0;k<3;k++)this.box(a.id,k%2?'#5c4547':'#86714c',x-.48+k*.45,.62,z,.34,.4,.35);
      }
    }
    for(let i=0;i<5;i++)this.box(a.id,'#ad945e',18.75,1.2,-14.8+i*.75,.04,.65,.09);
  }
  private understage(a:AreaDef){
    for(let i=0;i<3;i++){
      this.box(a.id,'#4a5d61',11.2+i*.3,1.7,0,.12,.12,7.6);
      this.box(a.id,'#a48759',11.2+i*.3,1.7,-3.65,.2,.2,.2);
    }
    for(const side of [-1,1]){
      this.box(a.id,'#2b3439',18.7,.8,side*2.55,.35,1.6,1.6);
      this.box(a.id,'#5a7b7c',18.48,1.15,side*2.55,.08,.6,1.05);
      for(let i=0;i<3;i++)this.box(a.id,'#e6ba73',18.41,1.1,side*2.55-.35+i*.35,.04,.08,.08,0,true);
    }
    this.gear(a.id,18.43,1.45,0,.52,'#a58b5a',.15);
  }
  private gallery(a:AreaDef){
    for(const z of [-3.8,3.8]){
      this.box(a.id,'#2d3034',-15,4.45,z,7.6,.07,.07);
      for(let i=0;i<8;i++)this.box(a.id,'#85724f',-18.5+i,4.0,z,.055,1,.055);
    }
    this.gear(a.id,-18.65,4.55,-1,.55,'#b3945c',-.12);
    this.gear(a.id,-18.65,4.5,.1,.36,'#8f7851',.19);
    for(const x of [-17.4,-14.8,-12.5]){
      this.box(a.id,'#292a32',x,5.65,-3.65,.09,1.25,.09);
      this.box(a.id,'#c2a16a',x,5.08,-3.65,.72,.42,.55);
      this.box(a.id,'#f1cb8c',x,4.86,-3.6,.47,.04,.38,0,true);
    }
  }
  private gear(area:string,x:number,y:number,z:number,r:number,color:string,speed:number){
    const material=this.track(area,new THREE.MeshStandardMaterial({color,metalness:.45,roughness:.65}));
    const group=new THREE.Group();group.position.set(x,y,z);group.rotation.y=Math.PI/2;
    group.add(new THREE.Mesh(new THREE.TorusGeometry(r,.07,6,24),material));
    for(let i=0;i<6;i++){const spoke=new THREE.Mesh(new THREE.BoxGeometry(.06,r*1.75,.08),material);spoke.rotation.z=i*Math.PI/6;group.add(spoke);}
    const pivot=new THREE.Group();pivot.add(group);this.scene.add(pivot);this.animated.push({object:group,speed});
  }
  private portals(){
    for(const c of worldData.corridors){
      const y=floorY(c.x,c.z),area=c.a,gold='#ab895c',wood='#49313c';
      const vertical=c.d>=c.w,half=(vertical?c.w:c.d)/2+.14;
      for(const side of [-1,1])this.box(area,wood,c.x+(vertical?side*half:0),y+1.32,c.z+(vertical?0:side*half),vertical?.18:.28,2.64,vertical?.28:.18);
      this.box(area,gold,c.x,y+2.64,c.z,vertical?half*2+.2:.25,.15,vertical?.25:half*2+.2);
    }
  }
  update(s:WorldState){
    for(const [id,material] of this.floors){
      const texture=this.assets.environment(areaArt[id].visualId);
      if(material.map!==texture){material.map=texture;material.needsUpdate=true;}
    }
    for(const [id,list] of this.materials){
      const amount=s.areaStates[id]==='erased'?.86:s.areaStates[id]==='fading'?.55:0;
      for(const {material,base} of list)material.color.copy(base).lerp(this.decayTint,amount);
    }
    if(s.areaStates['area.gallery.spotlights']==='erased')for(const material of this.galleryBulbs)material.color.set('#292733');
    for(const a of this.animated)a.object.rotation.z=s.gameTimeMs/1000*a.speed;
    this.dust.rotation.y=Math.sin(s.gameTimeMs/17000)*.07;
    (this.dust.material as THREE.PointsMaterial).opacity=.42-s.decayStage*.07;
  }
}
