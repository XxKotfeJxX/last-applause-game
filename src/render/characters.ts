import * as T from 'three';
import { ModelFactory } from './models';
export const characterModels=['hero','ringmaster','illusionist','knife-thrower','acrobat','stagehand','quartermaster'] as const;
export const characterClips=['idle','walk','carry_walk','talk','interact','react','perform'] as const;
type Part='body'|'head'|'armL'|'armR'|'elbowL'|'elbowR'|'legL'|'legR'|'kneeL'|'kneeR';
export type CharacterLook={visualId:string;color:string;accent:string;name:string;modelId?:string};
/** Original stage-puppet rigs: local +Z faces forward; origin is the soles. */
export class CharacterRig{
 readonly root=new T.Group();readonly pose=new T.Group();readonly joints={} as Record<Part,T.Group>;
 readonly sockets:Record<'handRight'|'head'|'chest',T.Object3D>={handRight:new T.Object3D(),head:new T.Object3D(),chest:new T.Object3D()};
 readonly modelId:string;private eyes:T.Mesh[]=[];
 constructor(f:ModelFactory,def:CharacterLook){
  const slug=def.modelId??def.visualId.replace('visual.character.',''),id=characterModels.includes(slug as typeof characterModels[number])?slug:'hero';
  this.modelId=id;this.root.name=def.visualId;this.root.userData.modelId=id;this.root.add(this.pose);
  const skin=id==='stagehand'?'#bc8d6f':id==='quartermaster'?'#d7a388':'#e4c4a0',dark='#211c29',gold='#d4ad68',shirt='#e9dcc2',hair=id==='acrobat'?'#783c34':id==='quartermaster'?'#a09c9c':'#3a2932';
  const stocky=id==='quartermaster'||id==='stagehand',width=stocky?.61:.47,coat=id==='hero'?'#713047':id==='ringmaster'?'#8a293f':def.accent;
  const joint=(name:Part,parent:T.Object3D,x:number,y:number,z=0)=>{const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);this.joints[name]=g;return g;};
  const body=joint('body',this.pose,0,1.05),head=joint('head',body,0,.55);
  const torso=f.sphere(body,.33,coat,0,.2);torso.scale.set(width/.66,1.18,.56);
  f.cylinder(body,.115,.12,skin,0,.49);f.box(body,width*.6,.4,.035,shirt,0,.23,.18);
  for(const sign of [-1,1]){const lapel=f.box(body,.075,.34,.045,id==='stagehand'?def.color:gold,sign*.11,.29,.215);lapel.rotation.z=sign*.23;}
  for(let n=0;n<3;n++)f.sphere(body,.023,gold,.045,.09+n*.095,.223);
  const face=f.sphere(head,.215,skin,0,.065);face.scale.set(.86,1.09,.85);
  const cap=f.sphere(head,.217,hair,0,.16,-.025);cap.scale.set(.9,.66,.86);
  f.sphere(head,.042,skin,0,.045,.191).scale.set(.7,.85,1);
  for(const x of [-.076,.076]){
   const eye=f.sphere(head,.021,dark,x,.085,.17);eye.scale.set(.85,1,.4);this.eyes.push(eye);
   const brow=f.box(head,.064,.018,.021,hair,x,.132,.171);brow.rotation.z=-Math.sign(x)*.13;
  }
  f.box(head,.066,.012,.015,'#8b4b47',0,-.029,.177);
  for(const x of [-.2,.2])f.sphere(head,.045,skin,x,.06,0);
  for(const [side,sign] of [['L',-1],['R',1]] as const){
   const arm=joint(`arm${side}`,body,sign*(width/2+.055),.37),elbow=joint(`elbow${side}`,arm,0,-.29);
   f.cylinder(arm,.083,.28,coat,0,-.14);f.sphere(arm,.086,id==='ringmaster'?gold:coat);
   f.cylinder(elbow,.067,.26,id==='knife-thrower'?skin:coat,0,-.13);f.cylinder(elbow,.075,.055,id==='stagehand'?def.color:gold,0,-.23);
   f.sphere(elbow,.069,id==='illusionist'||id==='ringmaster'?shirt:skin,0,-.305,.015).scale.y=1.12;
   const leg=joint(`leg${side}`,this.pose,sign*.14,.96),knee=joint(`knee${side}`,leg,0,-.43);
   f.cylinder(leg,.09,.41,id==='acrobat'?def.color:dark,0,-.205,0,.105);f.cylinder(knee,.075,.41,id==='acrobat'?coat:dark,0,-.205);
   f.box(knee,.17,.12,.29,dark,0,-.47,.07);f.cylinder(knee,.08,.16,id==='acrobat'?gold:coat,0,-.29);
  }
  // Three real local attachment points; no camera-facing pixel offsets.
  this.sockets.handRight.position.set(0,-.31,.04);this.joints.elbowR.add(this.sockets.handRight);
  this.sockets.head.position.set(0,-.12,.205);head.add(this.sockets.head);
  this.sockets.chest.position.set(.08,.18,.225);body.add(this.sockets.chest);
  const tail=(color:string,length=.48)=>{for(const sign of [-1,1]){const flap=f.box(body,.2,length,.08,color,sign*.14,-.18,-.15);flap.rotation.z=sign*.1;}};
  const hat=(color:string,height:number)=>{f.cylinder(head,.29,.045,color,0,.26);f.cylinder(head,.2,height,color,0,.28+height/2,0,.18);f.cylinder(head,.205,.065,gold,0,.32);};
  if(id==='hero'){
   tail(coat);f.box(body,.09,.47,.05,'#bd9b72',-.15,.1,.245).rotation.z=-.18;
   const fringe=f.sphere(head,.16,hair,-.07,.2,.08);fringe.scale.set(.9,.45,.9);
   f.box(body,.16,.17,.065,coat,.19,.09,.21);f.box(body,.18,.025,.07,gold,.19,.18,.22);
  }else if(id==='ringmaster'){
   hat(dark,.31);tail(coat,.6);f.box(body,.07,.16,.05,coat,0,.36,.24);
   for(const sign of [-1,1]){f.sphere(head,.07,dark,sign*.055,-.005,.19).scale.set(1,.3,.4);f.cylinder(body,.13,.045,gold,sign*.3,.39);}
   const cane=new T.Group();this.joints.elbowL.add(cane);cane.position.set(0,-.28,.08);f.cylinder(cane,.018,.65,dark,0,-.25);f.sphere(cane,.05,gold,0,.09);
  }else if(id==='illusionist'){
   hat('#302443',.2);tail('#594270',.65);const cape=f.cylinder(body,.26,.67,'#493159',0,-.02,-.13,.43);cape.scale.z=.54;
   f.sphere(body,.055,'#89c5bd',0,.42,.25);f.box(head,.32,.05,.03,'#876d92',0,.09,.19);
   for(let i=0;i<4;i++)f.sphere(body,.02,gold,-.3+i*.2,-.31,-.26);
  }else if(id==='knife-thrower'){
   f.cylinder(body,.26,.09,'#814052',0,-.03,0).scale.z=.6;
   const strap=f.box(body,.075,.5,.04,'#6e4b3f',0,.23,.25);strap.rotation.z=-.55;
   for(let n=0;n<3;n++){f.box(body,.034,.18,.04,'#abbfc4',-.14+n*.1,.14+n*.06,.285);f.box(body,.046,.065,.045,dark,-.14+n*.1,.02+n*.06,.285);}
   f.box(head,.36,.05,.3,'#814052',0,.205,0);f.sphere(head,.055,hair,0,-.07,.1).scale.set(1.5,.5,.6);
  }else if(id==='acrobat'){
   f.cylinder(body,.24,.17,def.color,0,.04,0,.33).scale.z=.65;
   f.sphere(head,.12,hair,0,.24,-.15);f.ring(head,.12,.022,gold,0,.24,-.15).rotation.x=Math.PI/2;
   for(const sign of [-1,1]){f.sphere(head,.036,gold,sign*.205,.005,.015);f.sphere(body,.042,gold,sign*.1,.28,.22);}
   f.sphere(body,.045,gold,0,.17,.24);f.cylinder(head,.2,.035,gold,0,.24);
  }else if(id==='stagehand'){
   f.box(body,.3,.43,.05,'#3c665e',0,.16,.24);for(const x of [-.15,.15])f.box(body,.045,.48,.04,'#568378',x,.23,.26);
   f.box(body,.56,.08,.36,'#7a5139',0,-.035);for(let n=0;n<3;n++)f.box(body,.09,.14,.07,'#9d784a',-.18+n*.18,-.09,.21);
   f.cylinder(head,.22,.12,coat,0,.25);f.box(head,.29,.04,.18,coat,0,.22,.19);
   f.box(body,.14,.12,.025,'#d0ab74',0,.23,.28);
  }else if(id==='quartermaster'){
   const skirt=f.cylinder(body,.26,.45,coat,0,-.18,0,.4);skirt.scale.z=.7;
   f.box(body,.39,.57,.045,'#c4a77f',0,-.015,.245);f.box(body,.18,.15,.035,coat,0,-.13,.277);
   const scarf=f.sphere(head,.23,coat,0,.19,-.02);scarf.scale.set(1,.6,1);f.sphere(head,.085,coat,.19,.04,-.11);
   for(const x of [-.078,.078]){const lens=f.ring(head,.06,.009,gold,x,.084,.191);lens.scale.y=.8;}f.box(head,.045,.008,.01,gold,0,.084,.193);
   f.box(this.joints.elbowL,.18,.24,.055,'#754637',0,-.25,.08);f.box(this.joints.elbowL,.16,.21,.015,shirt,0,-.25,.114);
  }
  this.root.updateMatrixWorld(true);
 }
 animate(clip:string,elapsed:number,time:number,carrying=false){
  for(const j of Object.values(this.joints))j.rotation.set(0,0,0);
  const t=elapsed/1000,p=t*8.5,walking=clip==='walk'||clip==='carry_walk',j=this.joints;
  this.pose.position.y=walking?Math.abs(Math.sin(p))*.025:Math.sin(time/850)*.009;
  j.body.rotation.z=walking?Math.sin(p)*.025:0;
  if(walking){for(const side of ['L','R'] as const){const phase=p+(side==='L'?0:Math.PI);j[`leg${side}`].rotation.x=Math.sin(phase)*.4;j[`knee${side}`].rotation.x=Math.max(0,-Math.sin(phase))*.65;j[`arm${side}`].rotation.x=-Math.sin(phase)*.3;}}
  if(clip==='talk'){j.head.rotation.y=Math.sin(t*2.4)*.12;j.armL.rotation.z=.25+Math.sin(t*3)*.13;j.elbowL.rotation.x=-.75;j.armR.rotation.x=-.15;}
  if(clip==='interact'){const reach=Math.sin(Math.min(1,t/.7)*Math.PI/2);j.armR.rotation.x=-reach*1.1;j.elbowR.rotation.x=-.3;}
  if(clip==='react'){const recoil=Math.sin(Math.min(1,t/.8)*Math.PI);j.body.rotation.x=-recoil*.18;j.armL.rotation.z=recoil*.45;j.armR.rotation.z=-recoil*.45;}
  if(clip==='perform'){j.armL.rotation.z=.75+Math.sin(t*2)*.25;j.armR.rotation.z=-.75-Math.sin(t*2)*.25;j.elbowL.rotation.x=-.5;j.elbowR.rotation.x=-.5;j.head.rotation.y=Math.sin(t)*.25;if(this.modelId==='acrobat')j.legL.rotation.z=-.35;}
  if(carrying||clip==='carry_walk'){j.armR.rotation.x=-.45;j.elbowR.rotation.x=-.8;j.armR.rotation.z=-.12;}
  const blink=(time%4300)>4140;for(const eye of this.eyes)eye.scale.y=blink?.12:1;
  this.root.updateMatrixWorld(true);
 }
}
