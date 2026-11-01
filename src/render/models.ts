import * as T from 'three';
import type { ItemDef } from '../content';
import type { MapObject } from '../world/layout';
import { assetCatalog } from '../generated/catalog';
const C={wood:'#493137',panel:'#723247',gold:'#c8a16a',iron:'#293c43',teal:'#477474',cream:'#e8d3a0',red:'#aa3044',steel:'#abb9b9'};
/** Original, geometry-based props. Every mesh is authored here; no downloaded models. */
export class ModelFactory{
 private materials=new Map<string,T.MeshStandardMaterial>();private geometries=new Map<string,T.BufferGeometry>();
 material(color:string,metal=false){const key=color+metal;let m=this.materials.get(key);if(!m){m=new T.MeshStandardMaterial({color,roughness:metal?.42:.8,metalness:metal?.58:.05});this.materials.set(key,m);}return m;}
 private geo(key:string,create:()=>T.BufferGeometry){let g=this.geometries.get(key);if(!g){g=create();this.geometries.set(key,g);}return g;}
 mesh(parent:T.Object3D,geo:T.BufferGeometry,color:string,x=0,y=0,z=0,metal=false){const m=new T.Mesh(geo,this.material(color,metal));m.position.set(x,y,z);parent.add(m);return m;}
 box(p:T.Object3D,w:number,h:number,d:number,color:string,x=0,y=0,z=0,metal=false){return this.mesh(p,this.geo(`b${w},${h},${d}`,()=>new T.BoxGeometry(w,h,d)),color,x,y,z,metal);}
 cylinder(p:T.Object3D,r:number,h:number,color:string,x=0,y=0,z=0,r2=r){return this.mesh(p,this.geo(`c${r},${r2},${h}`,()=>new T.CylinderGeometry(r,r2,h,16)),color,x,y,z,color===C.gold||color===C.steel);}
 sphere(p:T.Object3D,r:number,color:string,x=0,y=0,z=0){return this.mesh(p,this.geo('s'+r,()=>new T.SphereGeometry(r,12,8)),color,x,y,z);}
 ring(p:T.Object3D,r:number,tube:number,color:string,x=0,y=0,z=0){return this.mesh(p,this.geo(`t${r},${tube}`,()=>new T.TorusGeometry(r,tube,8,32)),color,x,y,z,true);}
 private legs(p:T.Object3D,w:number,h:number,d:number){for(const x of [-w/2+.1,w/2-.1])for(const z of [-d/2+.1,d/2-.1])this.cylinder(p,.055,h,C.wood,x,h/2,z,.08);}
 private frame(p:T.Object3D,w:number,h:number,d:number,x=0,y=0,z=0){for(const s of [-1,1]){this.box(p,.07,h,d,C.gold,x+s*w/2,y,z,true);this.box(p,w+.07,.07,d,C.gold,x,y+s*h/2,z,true);}}
 private star(p:T.Object3D,r:number,color:string,x=0,y=0,z=0){const s=new T.Shape();for(let i=0;i<10;i++){const angle=Math.PI/2+i*Math.PI/5,rad=i%2?r*.43:r;const px=Math.cos(angle)*rad,py=Math.sin(angle)*rad;if(i)s.lineTo(px,py);else s.moveTo(px,py);}s.closePath();return this.mesh(p,this.geo('star'+r,()=>new T.ExtrudeGeometry(s,{depth:.025,bevelEnabled:false})),color,x,y,z,true);}
 private gear(p:T.Object3D,r:number,x:number,y:number,z:number){const g=new T.Group();g.position.set(x,y,z);p.add(g);this.ring(g,r,.055,C.gold);this.cylinder(g,.1,.12,C.iron).rotation.x=Math.PI/2;for(let i=0;i<12;i++){const a=i*Math.PI/6,b=this.box(g,.12,.18,.12,C.gold,Math.sin(a)*r,Math.cos(a)*r,0,true);b.rotation.z=-a;if(i%2===0){const spoke=this.box(g,.045,r*2,.05,C.iron);spoke.rotation.z=a;}}return g;}
 private knife(p:T.Object3D,safe:boolean,x:number,y:number,z:number){
  const g=new T.Group();g.position.set(x,y,z);p.add(g);const blade=new T.Shape();blade.moveTo(-.055,.18);blade.lineTo(.055,.18);blade.lineTo(.04,.55);blade.lineTo(0,.7);blade.lineTo(-.04,.55);blade.closePath();
  this.mesh(g,this.geo('blade',()=>new T.ExtrudeGeometry(blade,{depth:.025,bevelEnabled:true,bevelThickness:.008,bevelSize:.007,bevelSegments:1,steps:1})),safe?'#c9decb':C.steel,0,0,0,true);
  this.cylinder(g,.038,.18,safe?C.teal:C.wood,0,.09,.012);this.box(g,.18,.025,.06,C.gold,0,.19,.02,true);
  if(safe){this.sphere(g,.041,C.teal,0,.697,.014);this.box(g,.12,.045,.035,C.teal,0,.13,.04);}else this.cylinder(g,.043,.035,C.red,0,.02,.012);
  return g;
 }
 item(def:ItemDef):T.Group{
  const group=new T.Group(),id=def.modelId??(def.capabilities.includes('capability.human_silhouette')?'mannequin':def.capabilities.includes('capability.tool')?'wrench':'parcel');
  if(id==='mask'){
   const shape=new T.Shape();shape.moveTo(0,0);shape.bezierCurveTo(-.3,.08,-.38,.55,-.23,.72);shape.bezierCurveTo(-.1,.85,.1,.85,.23,.72);shape.bezierCurveTo(.38,.55,.3,.08,0,0);
   for(const x of [-.135,.135]){const hole=new T.Path();hole.absellipse(x,.5,.09,.055,0,Math.PI*2,true);shape.holes.push(hole);}
   this.mesh(group,this.geo('mask',()=>new T.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:true,bevelThickness:.018,bevelSize:.018,bevelSegments:2})),C.cream);
   const nose=this.sphere(group,.055,C.gold,0,.37,.13);nose.scale.set(.7,1.5,1.6);this.star(group,.07,C.gold,0,.68,.09);this.box(group,.12,.018,.015,C.red,0,.18,.095);
  }else if(id==='mannequin'){
   this.cylinder(group,.38,.09,C.wood,0,.045,0);this.cylinder(group,.055,.45,C.gold,0,.28,0);
   const torso=this.sphere(group,.42,'#a99775',0,1.18,0);torso.scale.set(.72,1.2,.45);
   this.sphere(group,.2,'#baa787',0,1.92,0);this.cylinder(group,.065,.18,C.gold,0,1.68,0);
   for(const sign of [-1,1]){
    const leg=this.cylinder(group,.075,.57,'#a99775',sign*.14,.65,0);leg.rotation.z=sign*.06;
    const arm=this.cylinder(group,.06,.62,'#a99775',sign*.37,1.2,0);arm.rotation.z=sign*.15;
    this.sphere(group,.085,C.gold,sign*.32,1.52,0);this.sphere(group,.07,C.gold,sign*.39,.9,0);
   }
   this.box(group,.015,.65,.018,C.wood,0,1.2,.2);this.cylinder(group,.22,.025,C.gold,0,2.12,0);
  }else if(id==='costume'){
   const shape=new T.Shape();shape.moveTo(-.23,0);shape.lineTo(-.32,.7);shape.lineTo(-.51,.62);shape.lineTo(-.57,.85);shape.lineTo(-.24,1.03);shape.lineTo(-.12,.93);shape.lineTo(.12,.93);shape.lineTo(.24,1.03);shape.lineTo(.57,.85);shape.lineTo(.51,.62);shape.lineTo(.32,.7);shape.lineTo(.23,0);shape.lineTo(0,.12);shape.closePath();
   this.mesh(group,this.geo('coat',()=>new T.ExtrudeGeometry(shape,{depth:.17,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:1})),C.panel);
   for(const sign of [-1,1]){const lapel=this.box(group,.1,.4,.03,C.gold,sign*.09,.72,.2);lapel.rotation.z=sign*.23;}for(let i=0;i<4;i++)this.sphere(group,.025,C.gold,0,.3+i*.12,.23);
  }else if(id==='safe-knives'||id==='live-knives'){
   for(let n=0;n<3;n++){const knife=this.knife(group,id==='safe-knives',(n-1)*.2,.04,0);knife.rotation.z=(1-n)*.1;}
   this.box(group,.65,.08,.18,C.wood,0,.04,0);this.star(group,.045,id==='safe-knives'?C.teal:C.red,0,.11,.11);
  }else if(id==='blood'){
   this.cylinder(group,.17,.5,'#702d3c',0,.28,0,.2);this.cylinder(group,.12,.13,C.gold,0,.6,0);this.cylinder(group,.14,.05,C.wood,0,.69,0);
   this.box(group,.22,.23,.035,C.cream,0,.32,.18);const drop=this.sphere(group,.055,C.red,0,.31,.22);drop.scale.y=1.5;this.ring(group,.17,.015,C.gold,0,.1,0).rotation.x=Math.PI/2;
  }else if(id==='wrench'){
   this.box(group,.105,.6,.07,C.steel,0,.35,0,true);this.ring(group,.12,.04,C.steel,0,.08,0);
   const jaw=new T.Shape();jaw.moveTo(-.17,.56);jaw.lineTo(-.19,.77);jaw.lineTo(-.09,.88);jaw.lineTo(-.09,.7);jaw.lineTo(.09,.7);jaw.lineTo(.09,.88);jaw.lineTo(.19,.77);jaw.lineTo(.17,.56);jaw.closePath();this.mesh(group,this.geo('jaw',()=>new T.ExtrudeGeometry(jaw,{depth:.08,bevelEnabled:false})),C.steel,0,0,-.04,true);
   this.box(group,.12,.23,.08,C.teal,0,.35,0);
  }else{this.box(group,.5,.5,.45,C.panel,0,.25,0);this.frame(group,.5,.5,.035,0,.25,.24);}
  group.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(group),size=bounds.getSize(new T.Vector3()),center=bounds.getCenter(new T.Vector3());
  const meta=assetCatalog[def.visualId]?.meta,worldSize=meta?.worldSize as number[]|undefined,targetHeight=worldSize?.[1]??(def.carryClass==='large'?2.1:.8),scale=targetHeight/size.y;
  // Origin is the support plane; all views use this same normalized object.
  for(const child of group.children)child.position.sub(new T.Vector3(center.x,bounds.min.y,center.z));group.scale.setScalar(scale);
  group.userData.modelId=id;group.userData.height=targetHeight;group.name=def.visualId;return group;
 }
 object(o:MapObject):T.Group{
  const p=new T.Group();p.name=o.id;const {w,h,d}=o,front=d/2;
  switch(o.kind){
   case 'cabinet':{
    this.box(p,w,h-.2,d,C.wood,0,h/2,0);this.box(p,w+.12,.15,d+.06,C.gold,0,h-.04,0);this.legs(p,w,.15,d);
    for(const sign of [-1,1]){this.box(p,w/2-.06,h-.42,.06,C.panel,sign*w/4,h/2,front+.02);this.frame(p,w/2-.1,h-.48,.025,sign*w/4,h/2,front+.065);this.sphere(p,.04,C.gold,sign*.1,h*.46,front+.12);}
    this.star(p,.17,C.gold,0,h-.18,front+.08);for(const sign of [-1,1])this.cylinder(p,.05,h-.2,C.gold,sign*(w/2-.04),h/2,front+.05);break;
   }
   case 'workbench':{
    this.legs(p,w,h-.13,d);this.box(p,w,.13,d,'#b29060',0,h-.065,0);this.box(p,w-.15,.28,d-.08,C.teal,0,h-.32,0);
    for(const sign of [-1,1]){this.box(p,w*.4,.21,.03,C.wood,sign*w*.23,h-.32,front);this.sphere(p,.035,C.gold,sign*w*.23,h-.32,front+.04);}
    this.box(p,w-.17,.08,d-.1,C.wood,0,.22,0);this.box(p,.25,.12,.2,C.iron,-w*.3,h+.06,.05);this.box(p,.08,.3,.07,C.gold,-w*.3,h-.05,.2);this.box(p,.35,.025,.025,C.steel,-w*.3,h-.18,.22,true);break;
   }
   case 'wheel':{
    for(const x of [-.7,.7]){this.box(p,.16,1.5,.18,C.wood,x,.75,-.17);this.box(p,.45,.12,d,C.iron,x,.06,0);}
    const rotor=new T.Group();rotor.name='rotor';rotor.position.set(0,1.45,0);p.add(rotor);
    const disk=this.cylinder(rotor,1.25,.16,C.wood);disk.rotation.x=Math.PI/2;
    for(let i=0;i<12;i++){const points=[new T.Vector3(0,0,.09)];for(let n=0;n<=4;n++){const angle=(i+n/4)*Math.PI/6;points.push(new T.Vector3(Math.cos(angle)*1.16,Math.sin(angle)*1.16,.09));}const geo=new T.BufferGeometry().setFromPoints(points);const vertices:number[]=[];for(let n=1;n<points.length-1;n++)vertices.push(...points[0].toArray(),...points[n].toArray(),...points[n+1].toArray());geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();this.mesh(rotor,geo,i%2?C.teal:C.panel);}
    this.ring(rotor,1.23,.055,C.gold,0,0,.12);this.sphere(rotor,.075,C.gold,0,0,.14);for(let i=0;i<8;i++){const a=i*Math.PI/4;this.box(rotor,.07,.18,.05,C.cream,Math.sin(a)*.97,Math.cos(a)*.97,.16);}break;
   }
   case 'winch':{
    this.box(p,w,.16,d,C.iron,0,.08,0);for(const x of [-.45,.45])this.box(p,.1,.85,.55,C.teal,x,.55,0);
    for(const y of [.4,.92]){const drum=this.cylinder(p,.19,.8,C.gold,0,y,0);drum.rotation.z=Math.PI/2;for(let i=0;i<9;i++)this.ring(p,.2,.014,C.iron,-.33+i*.08,y,0).rotation.y=Math.PI/2;}
    this.gear(p,.35,.59,.88,.05);this.box(p,.07,.5,.07,C.gold,-.57,.65,.25).rotation.z=.25;this.sphere(p,.09,C.red,-.63,.92,.25);break;
   }
   case 'gate':{
    for(const z of [-1.45,1.45]){this.cylinder(p,.085,h,C.iron,0,h/2,z);this.sphere(p,.11,C.gold,0,h,z);}
    const leaf=new T.Group();leaf.name='gateLeaf';leaf.position.z=-1.4;p.add(leaf);
    for(const y of [.15,h-.2])this.box(leaf,.09,.09,2.8,C.gold,0,y,1.4,true);for(let i=0;i<11;i++)this.cylinder(leaf,.026,h-.35,C.iron,0,h/2,.12+i*.25);break;
   }
   case 'hatch':{
    this.box(p,w,h,d,C.iron,0,h/2,0);for(let i=0;i<6;i++)this.box(p,w-.1,.018,.19,C.wood,0,h+.005,-d/2+.13+i*.22);this.ring(p,.1,.018,C.gold,0,h+.035,.2).rotation.x=-Math.PI/2;break;
   }
   case 'program':case 'poster':{
    this.box(p,w,h-.15,.13,C.wood,0,h/2,0);this.box(p,w-.13,h-.3,.025,C.cream,0,h/2,.08);this.frame(p,w-.05,h-.17,.06,0,h/2,.1);
    for(const x of [-w*.38,w*.38])this.box(p,.08,.25,d,C.gold,x,.125,0);this.star(p,.11,C.red,0,h-.22,.12);p.userData.board=true;break;
   }
   case 'stage':{const ring=this.ring(p,w/2,.018,C.gold,0,.01,0);ring.rotation.x=-Math.PI/2;this.star(p,.13,C.cream,0,.015,0).rotation.x=-Math.PI/2;break;}
   case 'bench':{
    this.legs(p,w,.48,d);for(let n=0;n<3;n++)this.box(p,w,.09,.19,C.panel,0,.52,-.25+n*.24);for(const x of [-w/2+.1,w/2-.1])this.box(p,.07,.6,.08,C.gold,x,.73,-d*.4);this.box(p,w,.36,.09,C.wood,0,.83,-d*.4);for(const x of [-w*.4,w*.4])this.box(p,.08,.08,d,C.gold,x,.75,0);break;
   }
   case 'crate':{
    this.box(p,w-.04,h-.04,d-.04,'#795e41',0,h/2,0);for(const x of [-1,1])for(const z of [-1,1])this.box(p,.1,h,.1,'#bd9865',x*(w/2-.05),h/2,z*(d/2-.05));for(const y of [.1,h-.1]){this.box(p,w,.09,.05,C.wood,0,y,front);this.box(p,w,.09,.05,C.wood,0,y,-front);}const brace=this.box(p,w*.1,h*1.05,.05,C.wood,0,h/2,front+.01);brace.rotation.z=-Math.atan(w/h)*.8;break;
   }
   case 'trunk':{
    this.box(p,w,h*.72,d,C.wood,0,h*.36,0);this.box(p,w,h*.28,d,C.panel,0,h*.86,0);for(const x of [-w*.35,w*.35])this.box(p,.08,h,d+.025,C.gold,x,h/2,0);this.box(p,.14,.18,.05,C.gold,0,h*.65,front+.03);for(const x of [-w/2,w/2])this.ring(p,.1,.02,C.gold,x,h*.5,0).rotation.y=Math.PI/2;break;
   }
   case 'shelf':{
    for(const x of [-w/2+.05,w/2-.05])this.box(p,.09,h,d,C.iron,x,h/2,0);for(let i=0;i<4;i++){const y=.15+i*(h-.2)/3;this.box(p,w,.08,d,C.wood,0,y,0);if(i<3)for(let n=0;n<3;n++){this.box(p,.28,.3,.3,n%2?C.teal:C.panel,-w*.32+n*w*.32,y+.19,0);this.box(p,.3,.035,.32,C.gold,-w*.32+n*w*.32,y+.34,0);}}break;
   }
   case 'vanity':{
    this.legs(p,w,.7,d);this.box(p,w,.12,d,C.wood,0,.75,0);this.box(p,w-.15,h-.9,.13,C.gold,0,(h+.7)/2,-d*.35);
    this.box(p,w-.32,h-1.07,.04,'#779995',0,(h+.7)/2,-d*.35+.09);for(let i=0;i<5;i++)this.sphere(p,.045,C.cream,-w*.36+i*w*.18,h-.12,-d*.35+.12);this.cylinder(p,.07,.12,C.teal,-w*.3,.88,0);break;
   }
   case 'curtain':{
    this.box(p,w,h,d,C.wood,0,h/2,0);for(let i=0;i<12;i++){const fold=this.cylinder(p,.13,h,C.panel,w/2,h/2,-d/2+.2+i*(d-.4)/11);fold.scale.z=.65;}this.box(p,.1,.08,d+.1,C.gold,w/2,h-.04,0);break;
   }
   case 'portrait':{
    this.box(p,w,h,d,C.wood,0,h/2,0);this.frame(p,w,h,.04,0,h/2,front);const head=this.sphere(p,.14,C.gold,0,h*.63,front+.02);head.scale.z=.08;const body=this.sphere(p,.24,C.panel,0,h*.32,front+.02);body.scale.set(1,1.2,.1);break;
   }
   case 'lamp':{
    this.cylinder(p,.15,.13,C.iron,0,.065,0);this.cylinder(p,.035,h-.55,C.gold,0,(h-.55)/2,0);this.box(p,.2,.32,.2,C.cream,0,h-.33,0);for(const x of [-.13,.13])for(const z of [-.13,.13])this.box(p,.025,.4,.025,C.iron,x,h-.33,z);this.cylinder(p,.21,.13,C.gold,0,h-.56,0,.15);this.cylinder(p,.04,.23,C.panel,0,h-.08,0,.22);break;
   }
   case 'spotlight':{
    this.cylinder(p,.28,.1,C.iron,0,.05,0);this.cylinder(p,.04,.8,C.gold,0,.45,0);const light=this.cylinder(p,.24,.5,C.iron,0,1.03,0);light.rotation.x=Math.PI/2;this.cylinder(p,.2,.025,C.cream,0,1.03,.26).rotation.x=Math.PI/2;this.ring(p,.23,.03,C.gold,0,1.03,.27);break;
   }
   case 'control':{
    this.box(p,w,h,d,C.iron,0,h/2,0);this.box(p,.05,h*.72,d-.15,C.teal,-w/2-.02,h*.58,0);for(let n=0;n<4;n++){const button=this.cylinder(p,.05,.05,n%2?C.red:C.cream,-w/2-.06,h*.65,-d*.33+n*d*.22);button.rotation.z=Math.PI/2;}break;
   }
   case 'pipes':{
    for(let i=0;i<3;i++){const pipe=this.cylinder(p,.045,d,C.iron,-w/2+.08+i*.14,h/2,0);pipe.rotation.x=Math.PI/2;for(const z of [-d*.45,d*.45])this.ring(p,.058,.015,C.gold,-w/2+.08+i*.14,h/2,z);}break;
   }
   case 'gear':{const gear=this.gear(p,h*.43,0,h/2,0);gear.rotation.y=Math.PI/2;gear.name='gear';break;}
   case 'portal':{
    const span=Math.max(w,d),horizontal=d>w;
    for(const side of [-1,1]){const x=horizontal?0:side*(span/2-.08),z=horizontal?side*(span/2-.08):0;this.box(p,.14,h,.14,C.wood,x,h/2,z);this.box(p,.23,.12,.23,C.gold,x,.06,z);}
    this.box(p,horizontal?.14:span,.14,horizontal?span:.14,C.gold,0,h-.07,0);break;
   }
   case 'arch':{
    const y=h-.45;for(const x of [-w/2+.25,w/2-.25]){this.box(p,.45,h,d,C.wood,x,h/2,0);this.box(p,.58,.18,d+.1,C.gold,x,.12,0);this.box(p,.58,.17,d+.1,C.gold,x,h-.05,0);}
    this.box(p,w,.45,d,C.panel,0,y+.2,0);this.box(p,w,.06,d+.03,C.gold,0,y-.05,0);for(let n=0;n<12;n++){const swag=this.sphere(p,.3,C.panel,-w*.44+n*w*.08,y-.15,.05);swag.scale.set(1.15,.65,.7);}this.star(p,.2,C.gold,0,h-.3,front+.04);break;
   }
   default:throw new Error(`Unmodeled map object: ${o.kind}`);
  }
  if(o.kind!=='gate'){
   p.updateMatrixWorld(true);const box=new T.Box3().setFromObject(p),size=box.getSize(new T.Vector3()),center=box.getCenter(new T.Vector3());
   for(const child of p.children)child.position.sub(new T.Vector3(center.x,box.min.y,center.z));
   p.scale.set(Math.min(1,w/Math.max(size.x,.001)),Math.min(1,h/Math.max(size.y,.001)),Math.min(1,d/Math.max(size.z,.001)));
  }
  p.userData.mapObjectId=o.id;p.userData.kind=o.kind;return p;
 }
}
