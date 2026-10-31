import { acts, actById, characterById, characters, dialogues, initialOrder, itemById, items, pack, stationById, worldData } from '../content';
import { areaAt, closestNode, findRoute, nodePosition, walkable } from '../simulation/navigation';
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

export function createWorld(seed=1):WorldState {
  const actors:Record<string,ActorState>={};
  for(const def of characters){const n=nodePosition(def.start);actors[def.id]={id:def.id,x:n.x,z:n.z,nodeId:n.id,goalNode:def.id==='npc.knife_thrower'?'props':def.patrol[1]??def.start,route:[],routeIndex:0,routineIndex:0,task:def.id==='npc.knife_thrower'?'fetch':'patrol',planRevision:0,animationState:'idle',animationStartedAt:0,direction:'south',waitUntil:0,reaction:''};}
  const instances:Record<string,ItemState>={};
  for(const def of items)instances[`instance.${def.id}`]={instanceId:`instance.${def.id}`,defId:def.id,location:{kind:'world',areaId:def.startArea,x:def.x,z:def.z},state:'normal'};
  return {schemaVersion:1,contentPackId:pack.id,contentVersion:pack.version,seed,gameTimeMs:0,
    player:{x:0,z:13,direction:'north',animationState:'idle',animationStartedAt:0},actors,items:instances,tokens:4,
    facts:['fact.vision'],mechanisms:{serviceGateOpen:true},slots:initialOrder.map((actId,i)=>({id:`slot.${i}`,actId,status:'scheduled'})),agreements:[],
    areaStates:{...Object.fromEntries(worldData.areas.map(a=>[a.id,'intact'])),'area.dressing.illusionist':'intact','area.gallery.spotlights':'intact','area.foyer.audience':'intact'} as WorldState['areaStates'],decayStage:0,navigationVersion:0,
    events:[],eventSequence:0,log:['Карта показала маску, колесо, червону пляму й нерухому постать. Це фрагменти, а не вирок.'],
    mode:'playing',activeActId:null,cueIndex:0,finaleDeadline:0,ending:null,deathReason:null};
}

export function transferItem(s:WorldState,id:string,expected:ItemLocation['kind'],to:ItemLocation):Result {
  const item=s.items[id];if(!item)return fail('Предмета не існує.');
  if(item.location.kind!==expected)return fail('Предмет уже змінив місце.');
  if(to.kind==='actor'&&to.slot==='carry'){
    if(Object.values(s.items).some(x=>x.instanceId!==id&&x.location.kind==='actor'&&x.location.actorId===to.actorId&&x.location.slot==='carry'))return fail('Можна нести лише один великий реквізит.');
  }
  item.location=to;return ok('Предмет переміщено.');
}

export function setActorTask(s:WorldState,id:string,task:string,goalNode:string):void {
  const a=s.actors[id];a.planRevision++;a.task=task;a.goalNode=goalNode;a.route=[];a.routeIndex=0;a.waitUntil=0;
}

export function setAreaState(s:WorldState,areaId:string,state:'intact'|'fading'|'erased'):void{
  s.areaStates[areaId]=state;
  if(state!=='erased')return;
  for(const item of Object.values(s.items))if(item.location.kind==='world'&&item.location.areaId===areaId&&itemById[item.defId].decayPolicy==='local')item.location={kind:'removed',reason:'erased'};
  for(const actor of Object.values(s.actors))if(areaAt(actor.x,actor.z)===areaId)setActorTask(s,actor.id,'patrol','arena');
  if(areaAt(s.player.x,s.player.z)===areaId){s.player.x=0;s.player.z=0;note(s,'Завіса вивела вас на безпечну мітку манежу, коли кімната зникла.');}
  s.navigationVersion++;
}

function arrive(s:WorldState,a:ActorState):void {
  a.nodeId=a.goalNode;a.route=[];a.routeIndex=0;a.animationState='idle';a.animationStartedAt=s.gameTimeMs;
  if(a.task==='fetch'){
    a.task='pickupPending';a.animationState='interact';a.animationStartedAt=s.gameTimeMs;
    s.events.push({id:`event.${++s.eventSequence}`,dueTimeMs:s.gameTimeMs+900,actorId:a.id,planRevision:a.planRevision,kind:'pickupKnives'});
  } else if(a.task==='perform'){
    a.task='performReady';a.animationState='perform';a.animationStartedAt=s.gameTimeMs;
    note(s,`${characterById[a.id].name} вийшов на манеж. Можна подавати сценічний сигнал.`);
  } else if(a.task==='return'){
    setActorTask(s,a.id,'patrol','arena');note(s,'Марко повернувся з ножами й перевіряє їх перед номером.');
  } else if(a.task==='search'){
    a.waitUntil=s.gameTimeMs+5000;a.reaction='Ножі зникли зі столу. Потрібно з’ясувати, хто їх узяв.';
  } else {
    if(a.id==='npc.stagehand'&&a.nodeId==='props'){
      const tool=s.items['instance.item.wrench'];
      if(tool?.location.kind==='world'&&tool.location.areaId==='zone.props'){
        transferItem(s,tool.instanceId,'world',{kind:'actor',actorId:a.id,slot:'inventory'});
        a.reaction='Несу ключ до лебідки.';note(s,'Гнат забрав ключ із майстерні та поніс на галерею.');
      }else a.reaction='Ключа на верстаку немає. Перевіряю заявки без нього.';
    }
    if(a.id==='npc.stagehand'&&a.nodeId==='gallery'){
      const tool=s.items['instance.item.wrench'];
      if(tool?.location.kind==='actor'&&tool.location.actorId===a.id){
        transferItem(s,tool.instanceId,'actor',{kind:'world',areaId:'zone.gallery',x:-14,z:1});
        a.reaction='Ключ залишено біля лебідки.';note(s,'Гнат поклав ключ на галереї.');
      }
    }
    if(a.id==='npc.quartermaster'&&a.nodeId==='props'){
      a.reaction=has(s,'fact.safe_issued')?'Сценічний комплект записано; звіряю стелаж.':'Сценічний комплект без запису не видаю.';
    }
    if(a.id==='npc.illusionist'&&a.nodeId==='dressing')a.reaction=s.areaStates['area.dressing.illusionist']==='erased'?'Мій портрет зник. Дивний спосіб звільнити місце.':'Репетирую вихід за дзеркалом.';
    if(a.id==='npc.acrobat'&&a.nodeId==='gallery')a.reaction=s.mechanisms.rigPrepared?'Лебідка тримає.':'Страховка ще не перевірена.';
    if(a.id==='npc.ringmaster'&&a.nodeId==='backstage')a.reaction=stage(s)?`Звіряю програму: далі ${actName(stage(s)!.actId)}.`:'Програма вичерпана; лишився останній номер.';
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
        note(s,'Марко забрав бойові ножі зі столу. Тепер стіл порожній.');
        setActorTask(s,a.id,'return','backstage');
      } else {note(s,'Марко знайшов порожнє місце для ножів і пішов питати Розу.');setActorTask(s,a.id,'search','props');a.reaction='Бойових ножів немає на столі.';}
    }
    for(const a of Object.values(s.actors)){
      if(a.task==='performReady')continue;
      if(a.task==='pickupPending')continue;
      if(a.waitUntil>s.gameTimeMs)continue;
      if(a.task==='search'&&a.waitUntil<=s.gameTimeMs){setActorTask(s,a.id,'patrol','backstage');}
      if(a.route.length===0){a.route=findRoute(s,closestNode(a.x,a.z),a.goalNode);a.routeIndex=0;if(a.route.length===0){if(closestNode(a.x,a.z)===a.goalNode)arrive(s,a);else{a.reaction='Маршрут перекрито.';a.waitUntil=s.gameTimeMs+1000;}continue;}}
      const target=nodePosition(a.route[a.routeIndex]);if(!target){a.route=[];continue;}
      const dx=target.x-a.x,dz=target.z-a.z,d=Math.hypot(dx,dz),step=0.15;
      if(d<=step){a.x=target.x;a.z=target.z;a.nodeId=target.id;a.routeIndex++;if(a.routeIndex>=a.route.length)arrive(s,a);}
      else {a.x+=dx/d*step;a.z+=dz/d*step;a.direction=Math.abs(dx)>Math.abs(dz)?(dx>0?'east':'west'):(dz>0?'south':'north');if(a.animationState!=='walk'){a.animationState='walk';a.animationStartedAt=s.gameTimeMs;}}
    }
    if(s.mode==='finale'&&s.gameTimeMs>=s.finaleDeadline){s.mode='dead';s.deathReason='Ви пропустили оголошений сценічний сигнал. Бойовий комплект влучив у справжнього учасника.';note(s,s.deathReason);}
  }
}

export function movePlayer(s:WorldState,dx:number,dz:number,dtMs:number):void {
  if(s.mode!=='playing')return;
  const m=Math.hypot(dx,dz);if(m<0.01){if(s.player.animationState!=='idle'){s.player.animationState='idle';s.player.animationStartedAt=s.gameTimeMs;}return;}
  const carrying=Object.values(s.items).find(i=>i.location.kind==='actor'&&i.location.actorId==='player'&&i.location.slot==='carry');
  const speed=carrying?2.1:3.1,step=speed*Math.min(dtMs,100)/1000,ux=dx/m,uz=dz/m;
  if(walkable(s.player.x+ux*step,s.player.z,s))s.player.x+=ux*step;
  if(walkable(s.player.x,s.player.z+uz*step,s))s.player.z+=uz*step;
  s.player.direction=Math.abs(dx)>Math.abs(dz)?(dx>0?'east':'west'):(dz>0?'south':'north');
  if(s.player.animationState!==(carrying?'carry_walk':'walk')){s.player.animationState=carrying?'carry_walk':'walk';s.player.animationStartedAt=s.gameTimeMs;}
}

export function nearbyTargets(s:WorldState):{id:string;name:string;distance:number}[]{
  const result:{id:string;name:string;distance:number}[]=[];
  const add=(id:string,name:string,x:number,z:number)=>{const d=Math.hypot(x-s.player.x,z-s.player.z);if(d<=2.8)result.push({id,name,distance:d});};
  for(const a of Object.values(s.actors))add(a.id,characterById[a.id].name,a.x,a.z);
  for(const i of Object.values(s.items))if(i.location.kind==='world')add(i.instanceId,itemById[i.defId].name,i.location.x,i.location.z);
  for(const t of worldData.interactables)add(t.id,t.name,t.x,t.z);
  return result.sort((a,b)=>a.distance-b.distance);
}

function option(id:string,label:string,enabled=true,reason?:string):Option{return{id,label,enabled,reason};}
function accepted(s:WorldState){return s.agreements.filter(a=>a.status==='candidateAccepted'&&a.currentActId===stage(s)?.actId);}
function candidateCondition(s:WorldState,id:string):string|null {
  const actor=s.actors[id];
  if(!actor||actor.task==='unavailable'||actor.task==='perform'||actor.task==='performReady')return 'Артист зараз недоступний для заміни.';
  if(findRoute(s,closestNode(actor.x,actor.z),'arena').length===0&&closestNode(actor.x,actor.z)!=='arena')return 'У артиста немає доступного шляху до манежу.';
  if(id==='npc.illusionist'&&s.tokens<2&&!has(s,'fact.hidden_passage'))return 'Северин просить 2 жетони або доказ, що його гримерка зникне.';
  if(id==='npc.acrobat'&&!s.mechanisms.rigPrepared)return 'Лада погодиться після перевірки лебідки.';
  if(id==='npc.knife_thrower'&&!s.mechanisms.wheelPrepared)return 'Марко хоче, щоб колесо було налаштоване.';
  return null;
}
export function getOptions(s:WorldState,targetId:string):Option[]{
  if(s.mode==='act'&&targetId==='station.stage'){
    const def=actById[s.activeActId!];const ready=s.actors[def.actorId].task==='performReady';return [option('cue',def.cueLabels[s.cueIndex]??'Завершити номер',ready,'Артист ще йде до манежу.')];
  }
  if(s.mode==='finale'&&targetId==='station.stage')return [option('freeze','Завмерти за сигналом і показати червону пляму'),option('escape','Піти прихованим проходом під час затемнення')];
  if(s.mode!=='playing')return [];
  const i=s.items[targetId];
  if(i){
    if(i.location.kind==='world')return [option('pickup',`Підібрати: ${itemById[i.defId].name}`,i.defId!=='item.safe_knives'||has(s,'fact.safe_issued'),'Роза має записати видачу сценічного комплекту.'),option('inspect','Оглянути')];
    if(i.location.kind==='actor'&&i.location.actorId==='player')return [option('inspect','Оглянути'),...(i.defId==='item.hero_mask'?[option('equipMask','Надягти маску')]:[]),option('drop','Покласти на підлогу')];
    return [option('inspect','Оглянути')];
  }
  const actor=s.actors[targetId];
  if(actor){
    const out=[option('talk','Поговорити'),option('inspect','Оглянути')];
    const next=stage(s),actorAct=characterById[targetId].actIds[0];
    if(actorAct&&next&&actorAct!==next.actId&&s.slots.some(x=>x.actId===actorAct&&x.status==='scheduled')){
      const reason=candidateCondition(s,targetId);
      out.push(option('accept',`Запропонувати виступити зараз: ${actName(actorAct)}`,!reason,reason??undefined));
    }
    if(next&&actById[next.actId].actorId===targetId)for(const agreement of accepted(s))out.push(option(`consent:${agreement.id}`,`Погодити заміну на ${actName(agreement.candidateActId)}`));
    if(targetId==='npc.quartermaster'&&!has(s,'fact.safe_issued'))out.push(option('issueSafe','Взяти сценічні ножі під запис (1 жетон)',s.tokens>=1,'Потрібен 1 жетон.'));
    if(targetId==='npc.ringmaster'){
      for(const a of accepted(s).filter(a=>a.displacedActorConsent))out.push(option(`commit:${a.id}`,`Оголосити перестановку: ${actName(a.candidateActId)}`));
      if(next)out.push(option('startAct',`Почати номер: ${actName(next.actId)}`,!!s.mechanisms[actById[next.actId].prepKey],`Спершу підготуйте ${actName(next.actId)}.`));
      if(s.slots.every(x=>x.status==='completed')){
        out.push(option('finalInspect','Провести останню перевірку ножів',!s.mechanisms.finalInspected,'Перевірку вже проведено.'));
        out.push(option('startFinale','Почати останній номер',!!s.mechanisms.finalInspected,'Спершу потрібна остання перевірка.'));
      }
    }
    return out;
  }
  const station=stationById[targetId];if(!station)return [];
  const out=[option('inspect','Оглянути')];
  switch(station.kind){
    case 'cabinet':out.push(option('prepare','Налаштувати дзеркало й вихід',!s.mechanisms.cabinetPrepared));break;
    case 'rig':out.push(option('prepare','Налаштувати лебідку',!s.mechanisms.rigPrepared));if(has(s,'fact.blackout'))out.push(option('blackout','Підготувати затемнення',!s.mechanisms.blackoutReady));break;
    case 'wheel':out.push(option('prepare','Вирівняти колесо',!s.mechanisms.wheelPrepared));
      if(s.mechanisms.finalInspected){const doubleItem=double(s),doubleLocation=doubleItem.location;const compatible=['capability.human_silhouette','capability.wear_costume','capability.mount_on_wheel'].every(c=>itemById[doubleItem.defId].capabilities.includes(c));const safeCompatible=itemById[safe(s).defId].capabilities.includes('capability.safe_projectiles');out.push(option('swap','Поставити сценічні ножі після перевірки',safeCompatible&&playerHas(s,'role.safe_projectiles'),'Потрібні сумісні сценічні ножі у вас.'));out.push(option('paint','Підготувати червону пляму',playerHas(s,'role.stage_blood'),'Потрібна сценічна фарба.'));out.push(option('mountDouble','Закріпити двійника на колесі',compatible&&doubleLocation.kind==='actor'&&doubleLocation.actorId==='player','Потрібен сумісний двійник із майстерні.'));if(s.mechanisms.doubleMounted){out.push(option('dressDouble','Надягти на двійника костюм',playerHas(s,'role.costume'),'Потрібен костюм.'));out.push(option('maskDouble','Надягти на двійника маску',playerHas(s,'role.hero_mask'),'Потрібна маска.'));}}break;
    case 'passage':if(has(s,'fact.hidden_passage'))out.push(option('openPassage','Відкрити прихований вихід',!s.mechanisms.passageOpen));break;
    case 'program':out.push(option('program','Прочитати порядок виступів'));break;
    case 'gate':{
      const occupied=[s.player,...Object.values(s.actors)].some(a=>a.x>7&&a.x<11&&Math.abs(a.z)<1.5);
      out.push(option(s.mechanisms.serviceGateOpen?'closeGate':'openGate',s.mechanisms.serviceGateOpen?'Зачинити службову браму':'Відчинити службову браму',!occupied,'Хтось стоїть у проході.'));
      break;
    }
    case 'poster':out.push(option('vision','Переглянути карту пророцтва'));break;
    case 'stage':out.push(option('program','Згадати порядок виступів'));break;
  }
  return out;
}

function validAgreement(s:WorldState,a:Agreement):string|null{
  if(a.status==='committed')return 'Цю перестановку вже оголошено.';
  if(a.status!=='candidateAccepted'||!a.actorConsent||!a.displacedActorConsent)return 'Бракує згоди обох артистів.';
  const current=s.slots.find(x=>x.id===a.currentSlotId),candidate=s.slots.find(x=>x.id===a.candidateSlotId);
  if(!current||!candidate||current.actId!==a.currentActId||candidate.actId!==a.candidateActId||current.status!=='scheduled'||candidate.status!=='scheduled'||stage(s)?.id!==current.id)return 'Програма змінилася, домовленість застаріла.';
  if(s.tokens<a.price)return 'Для домовленої оплати бракує жетонів.';
  const reason=candidateCondition(s,a.candidateActorIds[0]);if(reason)return reason;
  const displaced=s.actors[actById[a.currentActId].actorId];if(!displaced||displaced.task==='unavailable')return 'Витіснений артист більше недоступний.';
  return null;
}

function decayAfterAct(s:WorldState,actId:string):void{
  s.decayStage=Math.min(3,s.decayStage+1);
  if(actId==='act.illusion'){s.areaStates['zone.dressing']='fading';s.areaStates['area.dressing.illusionist']='erased';note(s,'Портрет Северина зник із гримерки; стіни стали прозорими.');}
  if(actId==='act.aerial'){s.areaStates['zone.gallery']='fading';s.areaStates['area.gallery.spotlights']='erased';note(s,'На галереї згасли зайві прожектори. У музиці бракує ще одного інструмента.');}
  if(actId==='act.knives'){s.areaStates['zone.foyer']='fading';s.areaStates['area.foyer.audience']='erased';note(s,'У фоє зникли ряди глядачів. Оплески лунають без людей.');}
  note(s,`Номер «${actName(actId)}» завершено. Цирк утратив ще одну частину себе.`);
}

function resolveFinale(s:WorldState,route:'safe'|'double'):Result{
  let reason:string|null=null;
  if(route==='safe'){
    const safeLocation=safe(s).location;
    if(safeLocation.kind!=='installed'||safeLocation.stationId!=='station.wheel')reason='На колесі залишився бойовий комплект або сценічні ножі не встановлено після перевірки.';
    else if(!s.mechanisms.bloodReady)reason='Червона пляма з видіння не була підготовлена; сигнал завмирання зірвався.';
    else if(!s.mechanisms.heroMaskEquipped||!playerHas(s,'role.hero_mask'))reason='У фінальному кадрі не було маски. Конферансьє повернув небезпечну постановку.';
  }else{
    const doubleLocation=double(s).location;
    if(doubleLocation.kind!=='installed'||doubleLocation.stationId!=='station.wheel')reason='Двійник не закріплений на колесі.';
    else if(!s.mechanisms.doubleDressed||!s.mechanisms.doubleMasked||itemForRole(s,'role.costume')?.location.kind!=='installed'||itemForRole(s,'role.hero_mask')?.location.kind!=='installed')reason='Двійник не мав костюма й маски з видіння.';
    else if(!s.mechanisms.blackoutReady)reason='Затемнення не відбулося до кидка ножів.';
    else if(!s.mechanisms.passageOpen)reason='Прихований вихід був зачинений.';
  }
  if(reason){s.mode='dead';s.deathReason=reason;note(s,reason);return ok(reason,{sound:'death'});}
  s.mode='won';s.ending=route==='safe'?'Ви завмерли у масці. Червона фарба спалахнула на костюмі. Зал бачив нерухому постать — і ніхто не помітив, як ви дихали.':'Маска лишилася на двійнику. Ножі влучили в нерухому постать, а ви зникли за завісою. Усі кадри карти справдилися.';
  note(s,s.ending);return ok(s.ending,{sound:'victory'});
}

export function execute(s:WorldState,targetId:string,actionId:string):Result{
  if(s.mode==='playing'){
    const item=s.items[targetId],actor=s.actors[targetId],station=stationById[targetId];
    const ownItem=item?.location.kind==='actor'&&item.location.actorId==='player';
    const position=item?.location.kind==='world'?item.location:actor??station;
    if(!ownItem&&position&&Math.hypot(position.x-s.player.x,position.z-s.player.z)>2.8)return fail('Ціль надто далеко. Підійдіть ближче.');
  }
  const available=getOptions(s,targetId).find(o=>o.id===actionId);
  if(!available)return fail('Ця дія зараз недоступна.');if(!available.enabled)return fail(available.reason??'Спочатку потрібна підготовка.');
  const item=s.items[targetId],actor=s.actors[targetId],station=stationById[targetId];
  if(actionId==='inspect'){
    if(item){const def=itemById[item.defId];return ok(`${def.name}. Стан: ${item.state}. Місце: ${item.location.kind==='world'?'у світі':item.location.kind==='actor'?'в актора':item.location.kind==='installed'?'встановлено':'зникло'}.`);}
    if(actor)return ok(`${characterById[targetId].name}: ${actor.reaction||'Зайнятий власним маршрутом.'} Зараз: ${actor.task}.`);
    if(station?.kind==='cabinet'){learn(s,'fact.cabinet_seen','У шафи є дзеркальний механізм і слід прихованого виходу.');return ok('Шафа підміни має дзеркало, завісу та невидимий із манежу вихід.');}
    if(station?.kind==='wheel')return ok(`Колесо ${s.mechanisms.wheelPrepared?'вирівняне':'хитається'}. Перевірка: ${s.mechanisms.finalInspected?'проведена':'ще попереду'}. Комплект: ${safe(s).location.kind==='installed'?'сценічний':live(s).location.kind==='installed'?'бойовий':'не встановлено'}. Двійник: ${s.mechanisms.doubleMounted?'закріплений':'відсутній'}.`);
    if(station?.kind==='rig')return ok(`Лебідка ${s.mechanisms.rigPrepared?'налаштована':'потребує налаштування'}. Затемнення ${s.mechanisms.blackoutReady?'підготовлено':'не готове'}.`);
    if(station?.kind==='passage')return ok(s.mechanisms.passageOpen?'Вихід відкритий.':'Службовий вихід зачинений.');
    if(station?.kind==='gate')return ok(s.mechanisms.serviceGateOpen?'Службова брама відчинена.':'Службова брама зачинена; обхід є через закулісся.');
    return ok(station?.name??'Нічого особливого.');
  }
  if(actionId==='talk'&&actor){
    const line=dialogues.filter(d=>d.actorId===targetId&&(!d.requiresFact||has(s,d.requiresFact))&&(!d.requiresMechanism||s.mechanisms[d.requiresMechanism])&&(d.minDecay??0)<=s.decayStage).sort((a,b)=>b.priority-a.priority)[0];
    return ok(`${line?.text??'Він мовчить.'}${actor.reaction?` ${actor.reaction}`:''}`);
  }
  if(actionId==='pickup'&&item&&item.location.kind==='world'){
    if(Math.hypot(item.location.x-s.player.x,item.location.z-s.player.z)>2.8)return fail('Предмет недосяжний.');
    const def=itemById[item.defId];const res=transferItem(s,item.instanceId,'world',{kind:'actor',actorId:'player',slot:def.carryClass==='large'?'carry':'inventory'});
    if(res.ok)note(s,`Взято: ${def.name}.`);return res.ok?ok(`Взято: ${def.name}.`,{sound:'ui'}):res;
  }
  if(actionId==='drop'&&item&&item.location.kind==='actor'&&item.location.actorId==='player'){
    const areaId=areaAt(s.player.x,s.player.z)??'zone.arena';return transferItem(s,item.instanceId,'actor',{kind:'world',areaId,x:s.player.x+0.5,z:s.player.z});
  }
  if(actionId==='equipMask'&&item&&playerHas(s,'role.hero_mask')){s.mechanisms.heroMaskEquipped=true;return ok('Ви надягли маску. Її силует збігається з видінням.');}
  if(actionId==='issueSafe'){if(s.tokens<1)return fail('Бракує жетона.');s.tokens--;learn(s,'fact.safe_issued','Роза записала видачу сценічних ножів.');return ok('Роза видала сценічний комплект під запис. Тепер його можна взяти зі стелажа.');}
  if(actionId==='accept'&&actor){
    const current=stage(s),candidate=s.slots.find(x=>x.actId===characterById[targetId].actIds[0]);if(!current||!candidate)return fail('Зараз не можна змінити цей номер.');
    const existing=s.agreements.find(a=>a.currentSlotId===current.id&&a.candidateSlotId===candidate.id&&a.status==='candidateAccepted');if(existing)return ok('Цей кандидат уже погодився.');
    const price=targetId==='npc.illusionist'&&!has(s,'fact.hidden_passage')?2:0;
    const a:Agreement={id:`agreement.${s.agreements.length+1}`,currentSlotId:current.id,candidateSlotId:candidate.id,candidateActorIds:[targetId],status:'candidateAccepted',price,actorConsent:true,displacedActorConsent:false,currentActId:current.actId,candidateActId:candidate.actId,paid:false};
    s.agreements.push(a);note(s,`${characterById[targetId].name} погодився виступити раніше. Тепер потрібна згода ${characterById[actById[current.actId].actorId].name}.`);
    return ok('Кандидат погодився. Порядок поки не змінено.');
  }
  if(actionId.startsWith('consent:')){
    const a=s.agreements.find(x=>x.id===actionId.slice(8));if(!a||a.currentActId!==stage(s)?.actId)return fail('Домовленість застаріла.');
    a.displacedActorConsent=true;return ok('Поточний артист погодився перейти на майбутнє місце. Попросіть конферансьє оголосити заміну.');
  }
  if(actionId.startsWith('commit:')){
    const a=s.agreements.find(x=>x.id===actionId.slice(7));if(!a)return fail('Домовленості не знайдено.');const reason=validAgreement(s,a);if(reason)return fail(reason);
    const current=s.slots.find(x=>x.id===a.currentSlotId)!,candidate=s.slots.find(x=>x.id===a.candidateSlotId)!;
    [current.actId,candidate.actId]=[candidate.actId,current.actId];s.tokens-=a.price;a.paid=a.price>0;a.status='committed';
    for(const other of s.agreements)if(other!==a&&other.status==='candidateAccepted'&&(other.currentSlotId===a.currentSlotId||other.candidateSlotId===a.candidateSlotId))other.status='invalidated';
    note(s,`Конферансьє оголосив: зараз «${actName(current.actId)}», а «${actName(candidate.actId)}» виступить пізніше.`);
    return ok('Програму справді переставлено. Оплату списано один раз.',{sound:'act'});
  }
  if(actionId==='prepare'&&station){
    const act=acts.find(x=>x.prepStation===targetId);if(!act)return fail('Це не місце підготовки.');
    s.mechanisms[act.prepKey]=true;note(s,`Підготовлено номер «${act.name}».`);return ok(`Підготовку завершено: ${act.name}.`);
  }
  if(actionId==='startAct'){
    const next=stage(s);if(!next)return fail('Підготовчих номерів більше немає.');if(!s.mechanisms[actById[next.actId].prepKey])return fail('Номер ще не підготовлено.');
    next.status='performing';s.mode='act';s.activeActId=next.actId;s.cueIndex=0;
    setActorTask(s,actById[next.actId].actorId,'perform','arena');note(s,`Почався номер «${actName(next.actId)}».`);return ok('Артист іде до манежу. Дочекайтеся виходу та виконайте два сценічні сигнали.',{checkpoint:true,sound:'act'});
  }
  if(actionId==='cue'){
    s.cueIndex++;if(s.cueIndex<2)return ok('Перший сигнал виконано. Час для другого.');
    const slot=s.slots.find(x=>x.actId===s.activeActId)!;slot.status='completed';const def=actById[slot.actId];learn(s,def.fact,`Після номера «${def.name}» ви зрозуміли його секрет.`);
    decayAfterAct(s,slot.actId);setActorTask(s,def.actorId,'patrol','backstage');s.mode='playing';s.activeActId=null;s.cueIndex=0;return ok(`Номер «${def.name}» завершено.`,{checkpoint:true,sound:'decay'});
  }
  if(actionId==='program')return ok(s.slots.map((x,i)=>`${i+1}. ${actName(x.actId)} — ${x.status==='completed'?'завершено':'очікує'}`).join('\n')+'\n4. Останній номер: колесо й ножі.');
  if(actionId==='vision')return ok('Маска. Колесо. Кидки. Червона пляма. Нерухома постать. Завіса. Карта не показала, що сталося після оплесків.');
  if(actionId==='openPassage'){s.mechanisms.passageOpen=true;return ok('Ви відкрили службовий вихід за завісою.');}
  if(actionId==='closeGate'||actionId==='openGate'){
    s.mechanisms.serviceGateOpen=actionId==='openGate';s.navigationVersion++;
    for(const actor of Object.values(s.actors)){actor.route=[];actor.routeIndex=0;}
    return ok(s.mechanisms.serviceGateOpen?'Службова брама відчинена.':'Брама зачинена. NPC шукатимуть обхід через закулісся.');
  }
  if(actionId==='blackout'){s.mechanisms.blackoutReady=true;return ok('Лебідка готова погасити прожектори на фінальному сигналі.');}
  if(actionId==='finalInspect'){
    const knives=live(s);if(knives.location.kind==='actor'&&knives.location.actorId==='player')return fail('Бойові ножі у вас. Марко не може провести перевірку.');
    if(knives.location.kind==='removed')return fail('Бойовий комплект зник; перевірку провести неможливо.');
    const from=knives.location.kind;const t=transferItem(s,knives.instanceId,from,{kind:'installed',stationId:'station.wheel',slot:'knives'});if(!t.ok)return t;
    s.mechanisms.finalInspected=true;note(s,'Марко перевірив бойові ножі й закріпив їх біля колеса. Тепер підміна залишиться непоміченою до сигналу.');
    return ok('Останню перевірку проведено. Контрольну точку збережено.',{checkpoint:true,sound:'knife'});
  }
  if(actionId==='swap'){
    if(!playerHas(s,'role.safe_projectiles'))return fail('Сценічних ножів у вас немає.');
    const current=live(s);if(current.location.kind==='installed')transferItem(s,current.instanceId,'installed',{kind:'world',areaId:'zone.arena',x:3,z:-2});
    transferItem(s,safe(s).instanceId,'actor',{kind:'installed',stationId:'station.wheel',slot:'knives'});s.mechanisms.safeInstalled=true;
    note(s,'Після перевірки ви підмінили бойові ножі сценічними.');return ok('Сценічний комплект встановлено. Колесо можна оглянути повторно.');
  }
  if(actionId==='paint'){
    const blood=itemForRole(s,'role.stage_blood')!;transferItem(s,blood.instanceId,'actor',{kind:'removed',reason:'consumed'});s.mechanisms.bloodReady=true;return ok('Червону пляму підготовлено для сценічного сигналу.');
  }
  if(actionId==='mountDouble'){
    transferItem(s,double(s).instanceId,'actor',{kind:'installed',stationId:'station.wheel',slot:'double'});s.mechanisms.doubleMounted=true;return ok('Двійника закріплено на колесі.');
  }
  if(actionId==='dressDouble'){
    const costume=itemForRole(s,'role.costume')!;transferItem(s,costume.instanceId,'actor',{kind:'installed',stationId:'station.wheel',slot:'costume'});s.mechanisms.doubleDressed=true;return ok('Костюм на двійнику. Силует тепер збігається з вашим.');
  }
  if(actionId==='maskDouble'){
    const mask=itemForRole(s,'role.hero_mask')!;transferItem(s,mask.instanceId,'actor',{kind:'installed',stationId:'station.wheel',slot:'mask'});s.mechanisms.doubleMasked=true;s.mechanisms.heroMaskEquipped=false;return ok('Маска лишилася на двійнику — саме її було видно на карті.');
  }
  if(actionId==='startFinale'){
    s.mode='finale';s.finaleDeadline=s.gameTimeMs+12000;note(s,'Останній номер почався. Через дванадцять секунд пролунає кидок.');return ok('Оберіть підготовлений сценічний сигнал до кидка.',{checkpoint:true,sound:'act'});
  }
  if(actionId==='freeze')return resolveFinale(s,'safe');
  if(actionId==='escape')return resolveFinale(s,'double');
  return fail('Невідома дія.');
}
