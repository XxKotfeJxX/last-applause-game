import * as T from 'three';
import { ModelFactory } from './models';
import { animeShapes,mergeJointSurfaces } from './anime-shapes';
export const characterModels=['hero','ringmaster','illusionist','knife-thrower','acrobat','stagehand','quartermaster'] as const;
export const characterClips=['idle','walk','carry_walk','talk','interact','react','perform'] as const;
type Part='body'|'head'|'armL'|'armR'|'elbowL'|'elbowR'|'legL'|'legR'|'kneeL'|'kneeR';
export type CharacterLook={visualId:string;color:string;accent:string;name:string;modelId?:string};
/** Anime-inspired cel-shaded rigs. +Z faces forward; feet stay at local y=0. */
export class CharacterRig{
 readonly root=new T.Group();readonly pose=new T.Group();readonly joints={} as Record<Part,T.Group>;
 readonly sockets:Record<'handRight'|'head'|'chest',T.Object3D>={handRight:new T.Object3D(),head:new T.Object3D(),chest:new T.Object3D()};
 readonly modelId:string;private eyes:T.Group[]=[];
 constructor(f:ModelFactory,def:CharacterLook){
  const slug=def.modelId??def.visualId.replace('visual.character.',''),id=characterModels.includes(slug as typeof characterModels[number])?slug:'hero',a=animeShapes(f);
  this.modelId=id;this.root.name=def.visualId;this.root.userData.modelId=id;this.root.userData.style='anime-toon';this.root.add(this.pose);
  const skin=id==='stagehand'?'#c99a7e':id==='quartermaster'?'#e4b6a3':'#f2d2be',dark='#242332',gold='#d5ac68',shirt='#f1e4cc',hair=id==='acrobat'?'#a34b58':id==='quartermaster'?'#b4a1ba':id==='illusionist'?'#535281':id==='knife-thrower'?'#c4cdd8':'#493749';
  const stocky=id==='quartermaster'||id==='stagehand',width=stocky?.53:.44,coat=id==='hero'?'#78364c':id==='ringmaster'?'#92314d':def.accent,iris=id==='acrobat'?'#67a99c':id==='illusionist'?'#9d93cf':id==='knife-thrower'?'#6da4b6':'#b79658';
  const joint=(name:Part,parent:T.Object3D,x:number,y:number,z=0)=>{const g=new T.Group();g.name=name;g.position.set(x,y,z);parent.add(g);this.joints[name]=g;return g;};
  const body=joint('body',this.pose,0,1.05),head=joint('head',body,0,.59);
  a.form(body,[[0,-.06],[width*.38,-.05],[width*.42,.08],[width*.36,.18],[width*.49,.36],[width*.45,.44],[.08,.48],[0,.48]],coat,0,0,0,.64);
  a.limb(body,.08,.072,.075,skin).position.y=.55;
  a.panel(body,[[-.10,.42],[-.12,.08],[.12,.08],[.10,.42],[0,.46]],shirt,.147);
  for(const sign of [-1,1])a.panel(body,[[sign*.08,.45],[sign*.20,.37],[sign*.055,.12],[sign*.025,.31]],id==='stagehand'?def.color:coat,.18);
  for(let n=0;n<3;n++)a.ellipsoid(body,.025,.1+n*.095,.178,.012,.013,.009,gold);
  // Tapered chin, larger painted eyes with irises, upper lashes, catchlights and cheek tint.
  a.form(head,[[0,-.18],[.062,-.165],[.13,-.105],[.172,-.025],[.183,.065],[.172,.15],[.115,.205],[0,.22]],skin,0,0,0,.83);
  for(const sign of [-1,1]){
   const eye=new T.Group();eye.name='anime-eye';eye.position.set(sign*.076,.057,.144);eye.rotation.y=sign*.21;head.add(eye);this.eyes.push(eye);
   a.ellipsoid(eye,0,0,0,.056,.038,.016,'#fff5ed',true);a.ellipsoid(eye,sign*.003,-.002,.015,.027,.034,.009,iris,true);a.ellipsoid(eye,sign*.003,.001,.024,.012,.026,.004,dark,true);
   a.ellipsoid(eye,-.008,.014,.028,.009,.012,.003,'#ffffff',true);a.ellipsoid(eye,.011,-.014,.026,.004,.005,.002,'#ffffff',true);
   a.ribbon(eye,[[-.055,.024,.004],[0,.038,.009],[.058,.022,.003]],.009,dark,.5);
   a.ribbon(head,[[sign*.032,.132,.135],[sign*.078,.147,.14],[sign*.121,.127,.12]],.009,hair,.5);
   a.ellipsoid(head,sign*.112,-.027,.132,.032,.011,.004,'#e5a69f');a.ellipsoid(head,sign*.176,-.006,-.005,.031,.048,.024,skin);
  }
  a.ellipsoid(head,0,-.013,.152,.015,.023,.018,skin);a.ribbon(head,[[-.024,-.082,.126],[0,-.085,.132],[.026,-.08,.125]],.0045,'#a96d73',.4);
  a.ellipsoid(head,0,.15,-.025,.187,.135,.16,hair);
  const longHair=id==='illusionist'||id==='acrobat'||id==='quartermaster';
  for(let n=0;n<7;n++){const x=(n-3)*.043,flip=id==='knife-thrower'?-1:1;a.ribbon(head,[[x*.5,.238,-.005],[x+flip*.028,.16,.127],[x+flip*.025,.055+Math.abs(n-3)*.018,.149]],.035,hair);}
  for(const sign of [-1,1]){
   a.ribbon(head,[[sign*.13,.20,-.035],[sign*.18,.08,.025],[sign*.16,longHair?-.22:-.065,.03]],.044,hair);
   if(longHair)for(let n=0;n<3;n++)a.ribbon(head,[[sign*(.08+n*.03),.15,-.11],[sign*(.12+n*.03),-.05,-.11],[sign*(.11+n*.025),-.30,-.07]],.04,hair);
  }
  for(const [side,sign] of [['L',-1],['R',1]] as const){
   const arm=joint(`arm${side}`,body,sign*(width/2+.025),.405),elbow=joint(`elbow${side}`,arm,0,-.285);
   a.limb(arm,.30,.078,.065,id==='acrobat'?skin:coat);a.limb(elbow,.255,.062,.045,id==='knife-thrower'||id==='acrobat'?skin:coat);
   a.form(elbow,[[0,-.258],[.047,-.258],[.049,-.22],[0,-.22]],id==='acrobat'?gold:shirt);
   a.ellipsoid(elbow,0,-.292,.005,.043,.065,.031,id==='illusionist'||id==='ringmaster'?shirt:skin);a.ellipsoid(elbow,-sign*.035,-.278,.02,.018,.032,.02,skin);
   const leg=joint(`leg${side}`,this.pose,sign*.12,.96),knee=joint(`knee${side}`,leg,0,-.43);
   a.limb(leg,.44,.092,.067,id==='acrobat'?def.color:dark);a.limb(knee,.41,.068,.046,id==='acrobat'?skin:dark);
   a.form(knee,[[0,-.43],[.064,-.43],[.061,-.19],[.05,-.17],[0,-.17]],id==='acrobat'?coat:dark,0,0,0,.87);
   a.ellipsoid(knee,0,-.47,.058,.079,.06,.143,dark);a.ellipsoid(knee,0,-.466,.147,.065,.048,.071,dark);
  }
  this.sockets.handRight.position.set(0,-.3,.045);this.joints.elbowR.add(this.sockets.handRight);this.sockets.head.position.set(0,-.18,.17);head.add(this.sockets.head);this.sockets.chest.position.set(.065,.2,.224);body.add(this.sockets.chest);
  const tails=(color:string)=>a.cape(body,color,.78,1.05);
  const topHat=(color:string,h:number)=>{a.form(head,[[0,.235],[.25,.235],[.25,.258],[.175,.267],[.166,.27+h],[0,.27+h]],color,0,0,-.02,.85);a.form(head,[[0,.28],[.176,.28],[.175,.323],[0,.323]],gold,0,0,-.02,.85);};
  if(id==='hero'){
   tails(coat);a.ribbon(body,[[-.14,.43,.2],[-.12,.19,.2],[-.04,-.03,.18]],.03,'#ccbba0');a.panel(body,[[.12,.16],[.20,.15],[.19,.01],[.12,.02]],coat,.178);
  }else if(id==='ringmaster'){
   topHat('#2f283d',.22);tails(coat);for(const sign of [-1,1]){a.panel(body,[[0,.42],[sign*.082,.46],[sign*.07,.37]],gold,.2);a.ribbon(body,[[sign*.20,.39,.1],[sign*.19,.32,.18],[sign*.12,.26,.195]],.012,gold);}
   const cane=new T.Group();cane.position.set(0,-.29,.07);this.joints.elbowL.add(cane);a.limb(cane,.59,.013,.013,dark);a.ellipsoid(cane,0,.025,0,.035,.035,.035,gold);
  }else if(id==='illusionist'){
   a.cape(body,'#4b3e6e',.8,.75);a.ellipsoid(body,0,.405,.206,.037,.052,.017,'#9ed1ca');a.ribbon(head,[[.15,.18,.04],[.22,.25,-.04],[.17,.4,-.09]],.039,'#bca9df');
   for(const x of [-.18,.18])a.ellipsoid(head,x,-.05,.015,.015,.035,.013,gold);
  }else if(id==='knife-thrower'){
   a.ribbon(body,[[-.18,.44,.19],[.015,.21,.2],[.16,-.015,.18]],.029,'#895b57');
   for(let n=0;n<3;n++){const knife=new T.Group();knife.position.set(-.11+n*.08,.17+n*.05,.225);knife.rotation.z=-.45;body.add(knife);a.panel(knife,[[-.013,0],[-.015,.14],[0,.19],[.015,.14],[.013,0]],'#b8cbd3',0);a.limb(knife,.055,.02,.02,coat);}
   a.ribbon(head,[[-.16,.17,.08],[0,.20,.14],[.17,.16,.07]],.021,'#a85e72');
  }else if(id==='acrobat'){
   a.form(body,[[0,.02],[.30,.02],[.24,.13],[.16,.18],[0,.18]],def.color,0,0,0,.68);a.ellipsoid(head,0,.19,-.18,.11,.12,.10,hair);
   for(const sign of [-1,1]){a.ribbon(head,[[0,.21,-.15],[sign*.11,.24,-.12],[sign*.15,.18,-.15]],.038,gold);a.ellipsoid(head,sign*.18,-.065,.015,.018,.037,.018,gold);}
   a.ellipsoid(body,0,.3,.194,.025,.04,.012,gold);
  }else if(id==='stagehand'){
   a.panel(body,[[-.14,.33],[-.15,-.08],[.15,-.08],[.14,.33]],'#3e756d',.18);for(const x of [-.16,.16])a.ribbon(body,[[x,.43,.11],[x,.28,.18],[x,.05,.18]],.022,'#699991');
   a.form(body,[[0,-.055],[.23,-.055],[.23,.01],[0,.01]],'#8b654a',0,0,0,.7);a.panel(body,[[-.06,.24],[-.06,.12],[.06,.12],[.06,.24]],'#5a8b80',.2);
   a.ellipsoid(head,0,.20,-.02,.195,.075,.161,coat);a.ellipsoid(head,0,.19,.125,.18,.018,.12,coat);
  }else if(id==='quartermaster'){
   a.form(body,[[0,-.43],[.34,-.43],[.32,-.25],[.24,.03],[.18,.08],[0,.08]],coat,0,0,0,.72);a.panel(body,[[-.15,.25],[-.22,-.35],[.22,-.35],[.15,.25]],'#d4b99a',.205);
   a.ellipsoid(head,0,.21,-.045,.187,.07,.16,coat);for(const sign of [-1,1])a.ribbon(head,[[sign*.13,.2,-.04],[sign*.18,.06,-.05],[sign*.15,-.12,-.08]],.037,coat);
   for(const x of [-.076,.076])f.ring(head,.060,.005,gold,x,.056,.169).scale.set(1,.82,1);a.ribbon(head,[[-.02,.06,.18],[0,.068,.18],[.02,.06,.18]],.003,gold);
   a.panel(this.joints.elbowL,[[-.075,-.17],[-.075,-.36],[.075,-.36],[.075,-.17]],'#754b5a',.065);
  }
  mergeJointSurfaces(this.root);this.root.updateMatrixWorld(true);
 }
 animate(clip:string,elapsed:number,time:number,carrying=false){
  for(const j of Object.values(this.joints))j.rotation.set(0,0,0);
  const t=elapsed/1000,p=t*8.5,walking=clip==='walk'||clip==='carry_walk',j=this.joints;
  this.pose.position.y=walking?Math.abs(Math.sin(p))*.025:Math.sin(time/850)*.009;
  j.body.rotation.z=walking?Math.sin(p)*.018:0;j.body.rotation.y=walking?Math.sin(p)*.045:0;
  if(walking){for(const side of ['L','R'] as const){const phase=p+(side==='L'?0:Math.PI);j[`leg${side}`].rotation.x=Math.sin(phase)*.31;j[`knee${side}`].rotation.x=Math.max(0,-Math.sin(phase))*.48;j[`arm${side}`].rotation.x=-Math.sin(phase)*.3;}}
  if(clip==='talk'){j.head.rotation.y=Math.sin(t*2.4)*.12;j.armL.rotation.z=.25+Math.sin(t*3)*.13;j.elbowL.rotation.x=-.75;j.armR.rotation.x=-.15;}
  if(clip==='interact'){const reach=Math.sin(Math.min(1,t/.7)*Math.PI/2);j.armR.rotation.x=-reach*1.1;j.elbowR.rotation.x=-.3;}
  if(clip==='react'){const recoil=Math.sin(Math.min(1,t/.8)*Math.PI);j.body.rotation.x=-recoil*.18;j.armL.rotation.z=recoil*.45;j.armR.rotation.z=-recoil*.45;}
  if(clip==='perform'){j.armL.rotation.z=.75+Math.sin(t*2)*.25;j.armR.rotation.z=-.75-Math.sin(t*2)*.25;j.elbowL.rotation.x=-.5;j.elbowR.rotation.x=-.5;j.head.rotation.y=Math.sin(t)*.25;if(this.modelId==='acrobat')j.legL.rotation.z=-.35;}
  if(carrying||clip==='carry_walk'){j.armR.rotation.x=-.45;j.elbowR.rotation.x=-.8;j.armR.rotation.z=-.12;}
  const blink=(time%4300)>4140;for(const eye of this.eyes)eye.scale.y=blink?.12:1;
  this.root.updateMatrixWorld(true);
 }
}
