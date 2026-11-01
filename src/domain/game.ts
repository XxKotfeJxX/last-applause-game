import { rulesFor } from './rules';
import { verse } from '../content/verse';
import { acts, actById, characterById, characters, dialogues, initialOrder, itemById, items, pack, stationById, worldData } from '../content';
import { areaAt, closestNode, findRoute, nodePosition, moveOnFloor, walkable } from '../simulation/navigation';
import type { ActorState, Agreement, ItemLocation, ItemState, Option, Result, WorldState } from './types';

const ok=(message:string, extra:Partial<Result>={}):Result=>({ok:true,message,...extra});
const fail=(message:string):Result=>({ok:false,message,sound:'ui'});
const has=(s:WorldState,f:string)=>s.facts.includes(f);
const learn=(s:WorldState,f:string,text:string)=>{if(!has(s,f)){s.facts.push(f);note(s,text);}};
const note=(s:WorldState,text:string)=>{s.log.unshift(text);s.log=s.log.slice(0,45);};
const itemForRole=(s:WorldState,role:string):ItemState|undefined=>Object.values(s.items).find(i=>i.defId===pack.roles[role]);
const playerHas=(s:WorldState,role:string)=>itemForRole(s,role)?.location.kind==='actor' && (itemForRole(s,role)?.location as {actorId:string}).actorId==='player';
const live=(s:WorldState)=>itemForRole(s,'role.live_projectiles')!;
const safe=(s:WorldState)=>itemForRole(s,'role.safe_projectiles')!;
const double=(s:WorldState)=>itemForRole(s,'role.stage_double')!;
const stage=(s:WorldState)=>s.slots.find(x=>x.status!=='completed');
const actName=(id:string)=>actById[id]?.name??id;

export function createWorld(seed=1,ruleSetId='rules.base'):WorldState {
  const actors:Record<string,ActorState>={};
  for(const def of characters){const n=nodePosition(def.start);actors[def.id]={id:def.id,x:n.x,z:n.z,nodeId:n.id,goalNode:def.id==='npc.knife_thrower'?'props':def.patrol[1]??def.start,route:[],routeIndex:0,routineIndex:0,task:def.id==='npc.knife_thrower'?'fetch':'patrol',planRevision:0,animationState:'idle',animationStartedAt:0,direction:'south',waitUntil:0,reaction:''};}
  const instances:Record<string,ItemState>={};
  for(const def of items)instances[`instance.${def.id}`]={instanceId:`instance.${def.id}`,defId:def.id,location:{kind:'world',areaId:def.startArea,x:def.x,z:def.z},state:'normal'};
  return {ruleSetId,schemaVersion:1,contentPackId:pack.id,contentVersion:pack.version,seed,gameTimeMs:0,
    player:{x:0,z:13,direction:'north',animationState:'idle',animationStartedAt:0},actors,items:instances,tokens:rulesFor({ruleSetId}).initialTokens,
    facts:['fact.vision'],mechanisms:{serviceGateOpen:true},slots:initialOrder.map((actId,i)=>({id:`slot.${i}`,actId,status:'scheduled'})),agreements:[],
    areaStates:{...Object.fromEntries(worldData.areas.map(a=>[a.id,'intact'])),'area.dressing.illusionist':'intact','area.gallery.spotlights':'intact','area.foyer.audience':'intact'} as WorldState['areaStates'],decayStage:0,navigationVersion:0,
    events:[],eventSequence:0,log:[verse('game.001')],
    mode:'playing',activeActId:null,cueIndex:0,finaleDeadline:0,ending:null,deathReason:null};
}

export function transferItem(s:WorldState,id:string,expected:ItemLocation['kind'],to:ItemLocation):Result {
  const item=s.items[id];if(!item)return fail(verse('game.002'));
  if(item.location.kind!==expected)return fail(verse('game.003'));
  if(to.kind==='actor'&&to.slot==='carry'){
    if(Object.values(s.items).some(x=>x.instanceId!==id&&x.location.kind==='actor'&&x.location.actorId===to.actorId&&x.location.slot==='carry'))return fail(verse('game.004'));
  }
  item.location=to;return ok(verse('game.005'));
}

export function setActorTask(s:WorldState,id:string,task:string,goalNode:string):void {
  const a=s.actors[id];a.planRevision++;a.task=task;a.goalNode=goalNode;a.route=[];a.routeIndex=0;a.waitUntil=0;
}

export function setAreaState(s:WorldState,areaId:string,state:'intact'|'fading'|'erased'):void{
  s.areaStates[areaId]=state;
  if(state!=='erased')return;
  for(const item of Object.values(s.items))if(item.location.kind==='world'&&item.location.areaId===areaId&&itemById[item.defId].decayPolicy==='local')item.location={kind:'removed',reason:'erased'};
  for(const actor of Object.values(s.actors))if(areaAt(actor.x,actor.z)===areaId)setActorTask(s,actor.id,'patrol','arena');
  if(areaAt(s.player.x,s.player.z)===areaId){s.player.x=0;s.player.z=0;note(s,verse('game.006'));}
  s.navigationVersion++;
}

function arrive(s:WorldState,a:ActorState):void {
  a.nodeId=a.goalNode;a.route=[];a.routeIndex=0;a.animationState='idle';a.animationStartedAt=s.gameTimeMs;
  if(a.task==='fetch'){
    a.task='pickupPending';a.animationState='interact';a.animationStartedAt=s.gameTimeMs;
    s.events.push({id:`event.${++s.eventSequence}`,dueTimeMs:s.gameTimeMs+900,actorId:a.id,planRevision:a.planRevision,kind:'pickupKnives'});
  } else if(a.task==='perform'){
    a.task='performReady';a.animationState='perform';a.animationStartedAt=s.gameTimeMs;
    note(s,verse('game.007', {p0: characterById[a.id].name}));
  } else if(a.task==='return'){
    setActorTask(s,a.id,'patrol','arena');note(s,verse('game.008'));
  } else if(a.task==='search'){
    a.waitUntil=s.gameTimeMs+5000;a.reaction=verse('game.009');
  } else {
    if(a.id==='npc.stagehand'&&a.nodeId==='props'){
      const tool=s.items['instance.item.wrench'];
      if(tool?.location.kind==='world'&&tool.location.areaId==='zone.props'){
        transferItem(s,tool.instanceId,'world',{kind:'actor',actorId:a.id,slot:'inventory'});
        a.reaction=verse('game.010');note(s,verse('game.011'));
      }else a.reaction=verse('game.012');
    }
    if(a.id==='npc.stagehand'&&a.nodeId==='gallery'){
      const tool=s.items['instance.item.wrench'];
      if(tool?.location.kind==='actor'&&tool.location.actorId===a.id){
        transferItem(s,tool.instanceId,'actor',{kind:'world',areaId:'zone.gallery',x:-14,z:1});
        a.reaction=verse('game.013');note(s,verse('game.014'));
      }
    }
    if(a.id==='npc.quartermaster'&&a.nodeId==='props'){
      a.reaction=has(s,'fact.safe_issued')?verse('game.015'):verse('game.016');
    }
    if(a.id==='npc.illusionist'&&a.nodeId==='dressing')a.reaction=s.areaStates['area.dressing.illusionist']==='erased'?verse('game.017'):verse('game.018');
    if(a.id==='npc.acrobat'&&a.nodeId==='gallery')a.reaction=s.mechanisms.rigPrepared?verse('game.019'):verse('game.020');
    if(a.id==='npc.ringmaster'&&a.nodeId==='backstage')a.reaction=stage(s)?verse('game.021', {p0: actName(stage(s)!.actId)}):verse('game.022');
    const def=characterById[a.id];a.waitUntil=s.gameTimeMs+2400;
    a.routineIndex=(a.routineIndex+1)%def.patrol.length;
    a.goalNode=def.patrol[a.routineIndex];
  }
}

export function tickWorld(s:WorldState,dtMs:number):void {
  if(s.mode==='dead'||s.mode==='won')return;
  const steps=Math.max(0,Math.floor(dtMs/100));
  for(let k=0;k<steps;k++){
    s.gameTimeMs+=100;
    s.events.sort((a,b)=>a.dueTimeMs-b.dueTimeMs||a.id.localeCompare(b.id));
    while(s.events[0]&&s.events[0].dueTimeMs<=s.gameTimeMs){
      const e=s.events.shift()!,a=s.actors[e.actorId];
      if(!a||a.planRevision!==e.planRevision||a.task!=='pickupPending')continue;
      const knives=live(s);
      if(knives.location.kind==='world'&&knives.location.areaId==='zone.props'){
        transferItem(s,knives.instanceId,'world',{kind:'actor',actorId:a.id,slot:'inventory'});
        note(s,verse('game.023'));
        setActorTask(s,a.id,'return','backstage');
      } else {note(s,verse('game.024'));setActorTask(s,a.id,'search','props');a.reaction=verse('game.025');}
    }
    for(const a of Object.values(s.actors)){
      if(a.task==='performReady')continue;
      if(a.task==='pickupPending')continue;
      if(a.waitUntil>s.gameTimeMs)continue;
      if(a.task==='search'&&a.waitUntil<=s.gameTimeMs){setActorTask(s,a.id,'patrol','backstage');}
      if(a.route.length===0){a.route=findRoute(s,closestNode(a.x,a.z),a.goalNode);a.routeIndex=0;if(a.route.length===0){if(closestNode(a.x,a.z)===a.goalNode)arrive(s,a);else{a.reaction=verse('game.026');a.waitUntil=s.gameTimeMs+1000;}continue;}}
      const target=nodePosition(a.route[a.routeIndex]);if(!target){a.route=[];continue;}
      const dx=target.x-a.x,dz=target.z-a.z,d=Math.hypot(dx,dz),step=rulesFor(s).actorSpeed/10;
      if(d<=step&&walkable(target.x,target.z,s)){a.x=target.x;a.z=target.z;a.nodeId=target.id;a.routeIndex++;if(a.routeIndex>=a.route.length)arrive(s,a);}
      else {moveOnFloor(a,dx/d*Math.min(step,d),dz/d*Math.min(step,d),s);a.direction=Math.abs(dx)>Math.abs(dz)?(dx>0?'east':'west'):(dz>0?'south':'north');if(a.animationState!=='walk'){a.animationState='walk';a.animationStartedAt=s.gameTimeMs;}}
    }
    if(s.mode==='finale'&&s.gameTimeMs>=s.finaleDeadline){s.mode='dead';s.deathReason=verse('game.027');note(s,s.deathReason);}
  }
}

export function movePlayer(s:WorldState,dx:number,dz:number,dtMs:number):void {
  if(s.mode!=='playing')return;
  const m=Math.hypot(dx,dz);if(m<0.01){if(s.player.animationState!=='idle'){s.player.animationState='idle';s.player.animationStartedAt=s.gameTimeMs;}return;}
  const carrying=Object.values(s.items).find(i=>i.location.kind==='actor'&&i.location.actorId==='player'&&i.location.slot==='carry');
  const speed=carrying?2.1:3.1,step=speed*Math.min(dtMs,100)/1000,ux=dx/m,uz=dz/m;
  moveOnFloor(s.player,ux*step,uz*step,s);
  s.player.direction=Math.abs(dx)>Math.abs(dz)?(dx>0?'east':'west'):(dz>0?'south':'north');
  if(s.player.animationState!==(carrying?'carry_walk':'walk')){s.player.animationState=carrying?'carry_walk':'walk';s.player.animationStartedAt=s.gameTimeMs;}
}

export function nearbyTargets(s:WorldState):{id:string;name:string;distance:number}[]{
  const result:{id:string;name:string;distance:number}[]=[];
  const add=(id:string,name:string,x:number,z:number)=>{const d=Math.hypot(x-s.player.x,z-s.player.z);if(d<=rulesFor(s).interactionRadius)result.push({id,name,distance:d});};
  for(const a of Object.values(s.actors))add(a.id,characterById[a.id].name,a.x,a.z);
  for(const i of Object.values(s.items))if(i.location.kind==='world')add(i.instanceId,itemById[i.defId].name,i.location.x,i.location.z);
  for(const t of worldData.interactables)add(t.id,t.name,t.x,t.z);
  return result.sort((a,b)=>a.distance-b.distance);
}

function option(id:string,label:string,enabled=true,reason?:string):Option{return{id,label,enabled,reason};}
function accepted(s:WorldState){return s.agreements.filter(a=>a.status==='candidateAccepted'&&a.currentActId===stage(s)?.actId);}
function candidateCondition(s:WorldState,id:string):string|null {
  const actor=s.actors[id];
  if(!actor||actor.task==='unavailable'||actor.task==='perform'||actor.task==='performReady')return verse('game.028');
  if(findRoute(s,closestNode(actor.x,actor.z),'arena').length===0&&closestNode(actor.x,actor.z)!=='arena')return verse('game.029');
  if(id==='npc.illusionist'&&s.tokens<rulesFor(s).illusionPrice&&!has(s,'fact.hidden_passage'))return verse('game.030');
  if(id==='npc.acrobat'&&!s.mechanisms.rigPrepared)return verse('game.031');
  if(id==='npc.knife_thrower'&&!s.mechanisms.wheelPrepared)return verse('game.032');
  return null;
}
export function getOptions(s:WorldState,targetId:string):Option[]{
  if(s.mode==='act'&&targetId==='station.stage'){
    const def=actById[s.activeActId!];const ready=s.actors[def.actorId].task==='performReady';return [option('cue',def.cueLabels[s.cueIndex]??verse('game.033'),ready,verse('game.034'))];
  }
  if(s.mode==='finale'&&targetId==='station.stage')return [option('freeze',verse('game.035')),option('escape',verse('game.036'))];
  if(s.mode!=='playing')return [];
  const i=s.items[targetId];
  if(i){
    if(i.location.kind==='world')return [option('pickup',verse('game.037', {p0: itemById[i.defId].name}),i.defId!=='item.safe_knives'||has(s,'fact.safe_issued'),verse('game.038')),option('inspect',verse('game.039'))];
    if(i.location.kind==='actor'&&i.location.actorId==='player')return [option('inspect',verse('game.040')),...(i.defId==='item.hero_mask'?[option('equipMask',verse('game.041'))]:[]),option('drop',verse('game.042'))];
    return [option('inspect',verse('game.043'))];
  }
  const actor=s.actors[targetId];
  if(actor){
    const out=[option('talk',verse('game.044')),option('inspect',verse('game.045'))];
    const next=stage(s),actorAct=characterById[targetId].actIds[0];
    if(actorAct&&next&&actorAct!==next.actId&&s.slots.some(x=>x.actId===actorAct&&x.status==='scheduled')){
      const reason=candidateCondition(s,targetId);
      out.push(option('accept',verse('game.046', {p0: actName(actorAct)}),!reason,reason??undefined));
    }
    if(next&&actById[next.actId].actorId===targetId)for(const agreement of accepted(s))out.push(option(`consent:${agreement.id}`,verse('game.047', {p0: actName(agreement.candidateActId)})));
    if(targetId==='npc.quartermaster'&&!has(s,'fact.safe_issued'))out.push(option('issueSafe',verse('game.048'),s.tokens>=rulesFor(s).safeKitPrice,verse('game.049')));
    if(targetId==='npc.ringmaster'){
      for(const a of accepted(s).filter(a=>a.displacedActorConsent))out.push(option(`commit:${a.id}`,verse('game.050', {p0: actName(a.candidateActId)})));
      if(next)out.push(option('startAct',verse('game.051', {p0: actName(next.actId)}),!!s.mechanisms[actById[next.actId].prepKey],verse('game.052', {p0: actName(next.actId)})));
      if(s.slots.every(x=>x.status==='completed')){
        out.push(option('finalInspect',verse('game.053'),!s.mechanisms.finalInspected,verse('game.054')));
        out.push(option('startFinale',verse('game.055'),!!s.mechanisms.finalInspected,verse('game.056')));
      }
    }
    return out;
  }
  const station=stationById[targetId];if(!station)return [];
  const out=[option('inspect',verse('game.057'))];
  switch(station.kind){
    case 'cabinet':out.push(option('prepare',verse('game.058'),!s.mechanisms.cabinetPrepared));break;
    case 'rig':out.push(option('prepare',verse('game.059'),!s.mechanisms.rigPrepared));if(has(s,'fact.blackout'))out.push(option('blackout',verse('game.060'),!s.mechanisms.blackoutReady));break;
    case 'wheel':out.push(option('prepare',verse('game.061'),!s.mechanisms.wheelPrepared));
      if(s.mechanisms.finalInspected){const doubleItem=double(s),doubleLocation=doubleItem.location;const compatible=['capability.human_silhouette','capability.wear_costume','capability.mount_on_wheel'].every(c=>itemById[doubleItem.defId].capabilities.includes(c));const safeCompatible=itemById[safe(s).defId].capabilities.includes('capability.safe_projectiles');out.push(option('swap',verse('game.062'),safeCompatible&&playerHas(s,'role.safe_projectiles'),verse('game.063')));out.push(option('paint',verse('game.064'),playerHas(s,'role.stage_blood'),verse('game.065')));out.push(option('mountDouble',verse('game.066'),compatible&&doubleLocation.kind==='actor'&&doubleLocation.actorId==='player',verse('game.067')));if(s.mechanisms.doubleMounted){out.push(option('dressDouble',verse('game.068'),playerHas(s,'role.costume'),verse('game.069')));out.push(option('maskDouble',verse('game.070'),playerHas(s,'role.hero_mask'),verse('game.071')));}}break;
    case 'passage':if(has(s,'fact.hidden_passage'))out.push(option('openPassage',verse('game.072'),!s.mechanisms.passageOpen));break;
    case 'program':out.push(option('program',verse('game.073')));break;
    case 'gate':{
      const occupied=[s.player,...Object.values(s.actors)].some(a=>Math.abs(a.x-station.x)<.4&&Math.abs(a.z-station.z)<1.7);
      out.push(option(s.mechanisms.serviceGateOpen?'closeGate':'openGate',s.mechanisms.serviceGateOpen?verse('game.074'):verse('game.075'),!occupied,verse('game.076')));
      break;
    }
    case 'poster':out.push(option('vision',verse('game.077')));break;
    case 'stage':out.push(option('program',verse('game.078')));break;
  }
  return out;
}

function validAgreement(s:WorldState,a:Agreement):string|null{
  if(a.status==='committed')return verse('game.079');
  if(a.status!=='candidateAccepted'||!a.actorConsent||!a.displacedActorConsent)return verse('game.080');
  const current=s.slots.find(x=>x.id===a.currentSlotId),candidate=s.slots.find(x=>x.id===a.candidateSlotId);
  if(!current||!candidate||current.actId!==a.currentActId||candidate.actId!==a.candidateActId||current.status!=='scheduled'||candidate.status!=='scheduled'||stage(s)?.id!==current.id)return verse('game.081');
  if(s.tokens<a.price)return verse('game.082');
  const reason=candidateCondition(s,a.candidateActorIds[0]);if(reason)return reason;
  const displaced=s.actors[actById[a.currentActId].actorId];if(!displaced||displaced.task==='unavailable')return verse('game.083');
  return null;
}

function decayAfterAct(s:WorldState,actId:string):void{
  s.decayStage=Math.min(3,s.decayStage+1);
  if(actId==='act.illusion'){s.areaStates['zone.dressing']='fading';s.areaStates['area.dressing.illusionist']='erased';note(s,verse('game.084'));}
  if(actId==='act.aerial'){s.areaStates['zone.gallery']='fading';s.areaStates['area.gallery.spotlights']='erased';note(s,verse('game.085'));}
  if(actId==='act.knives'){s.areaStates['zone.foyer']='fading';s.areaStates['area.foyer.audience']='erased';note(s,verse('game.086'));}
  note(s,verse('game.087', {p0: actName(actId)}));
}

function resolveFinale(s:WorldState,route:'safe'|'double'):Result{
  let reason:string|null=null;
  if(route==='safe'){
    const safeLocation=safe(s).location;
    if(safeLocation.kind!=='installed'||safeLocation.stationId!=='station.wheel')reason=verse('game.088');
    else if(!s.mechanisms.bloodReady)reason=verse('game.089');
    else if(!s.mechanisms.heroMaskEquipped||!playerHas(s,'role.hero_mask'))reason=verse('game.090');
  }else{
    const doubleLocation=double(s).location;
    if(doubleLocation.kind!=='installed'||doubleLocation.stationId!=='station.wheel')reason=verse('game.091');
    else if(!s.mechanisms.doubleDressed||!s.mechanisms.doubleMasked||itemForRole(s,'role.costume')?.location.kind!=='installed'||itemForRole(s,'role.hero_mask')?.location.kind!=='installed')reason=verse('game.092');
    else if(!s.mechanisms.blackoutReady)reason=verse('game.093');
    else if(!s.mechanisms.passageOpen)reason=verse('game.094');
  }
  if(reason){s.mode='dead';s.deathReason=reason;note(s,reason);return ok(reason,{sound:'death'});}
  s.mode='won';s.ending=route==='safe'?verse('game.095'):verse('game.096');
  note(s,s.ending);return ok(s.ending,{sound:'victory'});
}

export function execute(s:WorldState,targetId:string,actionId:string):Result{
  if(s.mode==='playing'){
    const item=s.items[targetId],actor=s.actors[targetId],station=stationById[targetId];
    const ownItem=item?.location.kind==='actor'&&item.location.actorId==='player';
    const position=item?.location.kind==='world'?item.location:actor??station;
    if(!ownItem&&position&&Math.hypot(position.x-s.player.x,position.z-s.player.z)>rulesFor(s).interactionRadius)return fail(verse('game.097'));
  }
  const available=getOptions(s,targetId).find(o=>o.id===actionId);
  if(!available)return fail(verse('game.098'));if(!available.enabled)return fail(available.reason??verse('game.099'));
  const item=s.items[targetId],actor=s.actors[targetId],station=stationById[targetId];
  if(actionId==='inspect'){
    if(item){const def=itemById[item.defId];return ok(verse('game.100', {p0: def.name, p1: item.state, p2: item.location.kind==='world'?verse('game.101'):item.location.kind==='actor'?verse('game.102'):item.location.kind==='installed'?verse('game.103'):verse('game.104')}));}
    if(actor)return ok(verse('game.105', {p0: characterById[targetId].name, p1: actor.reaction||verse('game.106'), p2: actor.task}));
    if(station?.kind==='cabinet'){learn(s,'fact.cabinet_seen',verse('game.107'));return ok(verse('game.108'));}
    if(station?.kind==='wheel')return ok(verse('game.109', {p0: s.mechanisms.wheelPrepared?verse('game.110'):verse('game.111'), p1: s.mechanisms.finalInspected?verse('game.112'):verse('game.113'), p2: safe(s).location.kind==='installed'?verse('game.114'):live(s).location.kind==='installed'?verse('game.115'):verse('game.116'), p3: s.mechanisms.doubleMounted?verse('game.117'):verse('game.118')}));
    if(station?.kind==='rig')return ok(verse('game.119', {p0: s.mechanisms.rigPrepared?verse('game.120'):verse('game.121'), p1: s.mechanisms.blackoutReady?verse('game.122'):verse('game.123')}));
    if(station?.kind==='passage')return ok(s.mechanisms.passageOpen?verse('game.124'):verse('game.125'));
    if(station?.kind==='gate')return ok(s.mechanisms.serviceGateOpen?verse('game.126'):verse('game.127'));
    return ok(station?.name??verse('game.128'));
  }
  if(actionId==='talk'&&actor){
    const line=dialogues.filter(d=>d.actorId===targetId&&(!d.requiresFact||has(s,d.requiresFact))&&(!d.requiresMechanism||s.mechanisms[d.requiresMechanism])&&(d.minDecay??0)<=s.decayStage).sort((a,b)=>b.priority-a.priority)[0];
    return ok(line?.text??verse('game.129'));
  }
  if(actionId==='pickup'&&item&&item.location.kind==='world'){
    if(Math.hypot(item.location.x-s.player.x,item.location.z-s.player.z)>rulesFor(s).interactionRadius)return fail(verse('game.130'));
    const def=itemById[item.defId];const res=transferItem(s,item.instanceId,'world',{kind:'actor',actorId:'player',slot:def.carryClass==='large'?'carry':'inventory'});
    if(res.ok)note(s,verse('game.131', {p0: def.name}));return res.ok?ok(verse('game.132', {p0: def.name}),{sound:'ui'}):res;
  }
  if(actionId==='drop'&&item&&item.location.kind==='actor'&&item.location.actorId==='player'){
    const areaId=areaAt(s.player.x,s.player.z)??'zone.arena';return transferItem(s,item.instanceId,'actor',{kind:'world',areaId,x:s.player.x,z:s.player.z});
  }
  if(actionId==='equipMask'&&item&&playerHas(s,'role.hero_mask')){s.mechanisms.heroMaskEquipped=true;return ok(verse('game.133'));}
  if(actionId==='issueSafe'){if(s.tokens<rulesFor(s).safeKitPrice)return fail(verse('game.134'));s.tokens-=rulesFor(s).safeKitPrice;learn(s,'fact.safe_issued',verse('game.135'));return ok(verse('game.136'));}
  if(actionId==='accept'&&actor){
    const current=stage(s),candidate=s.slots.find(x=>x.actId===characterById[targetId].actIds[0]);if(!current||!candidate)return fail(verse('game.137'));
    const existing=s.agreements.find(a=>a.currentSlotId===current.id&&a.candidateSlotId===candidate.id&&a.status==='candidateAccepted');if(existing)return ok(verse('game.138'));
    const price=targetId==='npc.illusionist'&&!has(s,'fact.hidden_passage')?rulesFor(s).illusionPrice:0;
    const a:Agreement={id:`agreement.${s.agreements.length+1}`,currentSlotId:current.id,candidateSlotId:candidate.id,candidateActorIds:[targetId],status:'candidateAccepted',price,actorConsent:true,displacedActorConsent:false,currentActId:current.actId,candidateActId:candidate.actId,paid:false};
    s.agreements.push(a);note(s,verse('game.139', {p0: characterById[targetId].name, p1: characterById[actById[current.actId].actorId].name}));
    return ok(verse('game.140'));
  }
  if(actionId.startsWith('consent:')){
    const a=s.agreements.find(x=>x.id===actionId.slice(8));if(!a||a.currentActId!==stage(s)?.actId)return fail(verse('game.141'));
    a.displacedActorConsent=true;return ok(verse('game.142'));
  }
  if(actionId.startsWith('commit:')){
    const a=s.agreements.find(x=>x.id===actionId.slice(7));if(!a)return fail(verse('game.143'));const reason=validAgreement(s,a);if(reason)return fail(reason);
    const current=s.slots.find(x=>x.id===a.currentSlotId)!,candidate=s.slots.find(x=>x.id===a.candidateSlotId)!;
    [current.actId,candidate.actId]=[candidate.actId,current.actId];s.tokens-=a.price;a.paid=a.price>0;a.status='committed';
    for(const other of s.agreements)if(other!==a&&other.status==='candidateAccepted'&&(other.currentSlotId===a.currentSlotId||other.candidateSlotId===a.candidateSlotId))other.status='invalidated';
    note(s,verse('game.144', {p0: actName(current.actId), p1: actName(candidate.actId)}));
    return ok(verse('game.145'),{sound:'act'});
  }
  if(actionId==='prepare'&&station){
    const act=acts.find(x=>x.prepStation===targetId);if(!act)return fail(verse('game.146'));
    s.mechanisms[act.prepKey]=true;note(s,verse('game.147', {p0: act.name}));return ok(verse('game.148', {p0: act.name}));
  }
  if(actionId==='startAct'){
    const next=stage(s);if(!next)return fail(verse('game.149'));if(!s.mechanisms[actById[next.actId].prepKey])return fail(verse('game.150'));
    next.status='performing';s.mode='act';s.activeActId=next.actId;s.cueIndex=0;
    setActorTask(s,actById[next.actId].actorId,'perform','arena');note(s,verse('game.151', {p0: actName(next.actId)}));return ok(verse('game.152'),{checkpoint:true,sound:'act'});
  }
  if(actionId==='cue'){
    s.cueIndex++;if(s.cueIndex<2)return ok(verse('game.153'));
    const slot=s.slots.find(x=>x.actId===s.activeActId)!;slot.status='completed';const def=actById[slot.actId];learn(s,def.fact,verse('game.154', {p0: def.name}));
    decayAfterAct(s,slot.actId);setActorTask(s,def.actorId,'patrol','backstage');s.mode='playing';s.activeActId=null;s.cueIndex=0;return ok(verse('game.155', {p0: def.name}),{checkpoint:true,sound:'decay'});
  }
  if(actionId==='program')return ok(s.slots.map((x,i)=>`${i+1}. ${actName(x.actId)} — ${x.status==='completed'?verse('game.156'):verse('game.157')}`).join('\n')+verse('game.158'));
  if(actionId==='vision')return ok(verse('game.159'));
  if(actionId==='openPassage'){s.mechanisms.passageOpen=true;return ok(verse('game.160'));}
  if(actionId==='closeGate'||actionId==='openGate'){
    s.mechanisms.serviceGateOpen=actionId==='openGate';s.navigationVersion++;
    for(const actor of Object.values(s.actors)){actor.route=[];actor.routeIndex=0;}
    return ok(s.mechanisms.serviceGateOpen?verse('game.161'):verse('game.162'));
  }
  if(actionId==='blackout'){s.mechanisms.blackoutReady=true;return ok(verse('game.163'));}
  if(actionId==='finalInspect'){
    const knives=live(s);if(knives.location.kind==='actor'&&knives.location.actorId==='player')return fail(verse('game.164'));
    if(knives.location.kind==='removed')return fail(verse('game.165'));
    const from=knives.location.kind;const t=transferItem(s,knives.instanceId,from,{kind:'installed',stationId:'station.wheel',slot:'knives'});if(!t.ok)return t;
    s.mechanisms.finalInspected=true;note(s,verse('game.166'));
    return ok(verse('game.167'),{checkpoint:true,sound:'knife'});
  }
  if(actionId==='swap'){
    if(!playerHas(s,'role.safe_projectiles'))return fail(verse('game.168'));
    const current=live(s);if(current.location.kind==='installed')transferItem(s,current.instanceId,'installed',{kind:'world',areaId:'zone.arena',x:3,z:-2});
    transferItem(s,safe(s).instanceId,'actor',{kind:'installed',stationId:'station.wheel',slot:'knives'});s.mechanisms.safeInstalled=true;
    note(s,verse('game.169'));return ok(verse('game.170'));
  }
  if(actionId==='paint'){
    const blood=itemForRole(s,'role.stage_blood')!;transferItem(s,blood.instanceId,'actor',{kind:'removed',reason:'consumed'});s.mechanisms.bloodReady=true;return ok(verse('game.171'));
  }
  if(actionId==='mountDouble'){
    transferItem(s,double(s).instanceId,'actor',{kind:'installed',stationId:'station.wheel',slot:'double'});s.mechanisms.doubleMounted=true;return ok(verse('game.172'));
  }
  if(actionId==='dressDouble'){
    const costume=itemForRole(s,'role.costume')!;transferItem(s,costume.instanceId,'actor',{kind:'installed',stationId:'station.wheel',slot:'costume'});s.mechanisms.doubleDressed=true;return ok(verse('game.173'));
  }
  if(actionId==='maskDouble'){
    const mask=itemForRole(s,'role.hero_mask')!;transferItem(s,mask.instanceId,'actor',{kind:'installed',stationId:'station.wheel',slot:'mask'});s.mechanisms.doubleMasked=true;s.mechanisms.heroMaskEquipped=false;return ok(verse('game.174'));
  }
  if(actionId==='startFinale'){
    s.mode='finale';s.finaleDeadline=s.gameTimeMs+rulesFor(s).finaleDurationMs;note(s,verse('game.175',{p0:rulesFor(s).finaleDurationMs/1000}));return ok(verse('game.176'),{checkpoint:true,sound:'act'});
  }
  if(actionId==='freeze')return resolveFinale(s,'safe');
  if(actionId==='escape')return resolveFinale(s,'double');
  return fail(verse('game.177'));
}
