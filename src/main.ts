import { verse } from './content/verse';
import './style.css';
import './settings.css';
import { actById, characterById, itemById, worldData } from './content';
import { createWorld, execute, getOptions, movePlayer, nearbyTargets, tickWorld } from './domain/game';
import type { Option, WorldState } from './domain/types';
import { areaAt } from './simulation/navigation';
import { GameScene } from './render/scene';
import { GameAudio } from './audio/audio';
import { actionFor } from './input/map';
import { hasSave, loadWorld, saveWorld } from './persistence/save';

type Overlay='intro'|'target'|'inventory'|'journal'|'vision'|'pause'|'stage'|'end'|null;
const app=document.getElementById('app')!;
app.innerHTML=verse('ui.001');
const viewport=document.getElementById('viewport')!,overlayEl=document.getElementById('overlay')!,toastEl=document.getElementById('toast')!;
const targetEl=document.getElementById('targets')!,promptEl=document.getElementById('prompt')!,devEl=document.getElementById('dev')!;
const scene=new GameScene(viewport),audio=new GameAudio();
try{Object.assign(audio.volume,JSON.parse(localStorage.getItem('last-applause:v1:settings')??'{}'));}catch{}
let world=createWorld(),overlay:Overlay='intro',targetId:string|null=null,message='',last=performance.now(),accumulator=0,toastTimer=0,devVisible=false,devPaths=false,lastTargetKey='';
const keys=new Set<string>();
function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
function toast(text:string){toastEl.textContent=text;toastEl.hidden=false;toastTimer=performance.now()+3500;}
function describeArea(){const id=areaAt(world.player.x,world.player.z);return worldData.areas.find(x=>x.id===id)?.name??verse('ui.002');}
function optionsHtml(opts:Option[]){return opts.map(o=>`<button class="choice" data-action="${escapeHtml(o.id)}" ${o.enabled?'':'disabled'}><span>${escapeHtml(o.label)}</span>${!o.enabled&&o.reason?`<small>${escapeHtml(o.reason)}</small>`:''}</button>`).join('');}
function renderOverlay(){
  if(!overlay){overlayEl.hidden=true;return;}overlayEl.hidden=false;let title='',body='',buttons='';
  if(overlay==='intro'){
    title=verse('ui.003');body=verse('ui.004');
    buttons=verse('ui.005', {p0: hasSave('manual')?verse('ui.006'):''});
  } else if(overlay==='target'&&targetId){
    title=world.actors[targetId]?characterById[targetId].name:world.items[targetId]?itemById[world.items[targetId].defId].name:worldData.interactables.find(x=>x.id===targetId)?.name??verse('ui.007');
    body=(world.items[targetId]?`<img class="item-preview" src="${scene.icons.icon(itemById[world.items[targetId].defId])}" alt="${escapeHtml(title)}">`:'')+`<p class="dialogue">${escapeHtml(message||verse('ui.008')).replace(/\n/g,'<br>')}</p>`;
    buttons=optionsHtml(getOptions(world,targetId))+verse('ui.009');
  } else if(overlay==='inventory'){
    title=verse('ui.010');const owned=Object.values(world.items).filter(i=>i.location.kind==='actor'&&i.location.actorId==='player');
    body=verse('ui.011', {p0: world.tokens});
    buttons=owned.map(i=>`<button class="choice" data-item="${escapeHtml(i.instanceId)}"><img class="item-icon" src="${scene.icons.icon(itemById[i.defId])}" alt="" aria-hidden="true"><span>${escapeHtml(itemById[i.defId].name)}</span> ${i.location.kind==='actor'&&i.location.slot==='carry'?verse('ui.012'):''}</button>`).join('')||verse('ui.013');
    buttons+=verse('ui.014');
  } else if(overlay==='journal'){
    title=verse('ui.015');body=verse('ui.016', {p0: world.slots.map(x=>`<li>${escapeHtml(actById[x.actId].name)} — ${x.status==='completed'?verse('ui.017'):verse('ui.018')}</li>`).join(''), p1: world.agreements.map(a=>`${escapeHtml(actById[a.candidateActId].name)}: ${a.status==='committed'?verse('ui.019'):a.status==='candidateAccepted'?verse('ui.020'):verse('ui.021')}`).join('<br>')||verse('ui.022'), p2: world.facts.map(f=>`<li>${escapeHtml(factText(f))}</li>`).join(''), p3: world.log.slice(0,8).map(escapeHtml).join('<br>')});buttons=verse('ui.023');
  } else if(overlay==='vision'){
    title=verse('ui.024');body=verse('ui.025');buttons=verse('ui.026');
  } else if(overlay==='pause'){
    title=verse('ui.027');body=verse('ui.028', {p0: (['master','music','ambience','sfx'] as const).map(id=>`<label class="volume">${{master:verse('ui.029'),music:verse('ui.030'),ambience:verse('ui.031'),sfx:verse('ui.032')}[id]}<input type="range" min="0" max="1" step="0.05" data-volume="${id}" value="${audio.volume[id]}"></label>`).join('')});
    buttons=verse('ui.033', {p0: world.mode!=='playing'?'disabled':'', p1: !hasSave('manual')?'disabled':''});
  } else if(overlay==='stage'){
    title=world.mode==='finale'?verse('ui.034'):actById[world.activeActId??'']?.name??verse('ui.035');
    body=world.mode==='finale'?verse('ui.036', {p0: Math.ceil((world.finaleDeadline-world.gameTimeMs)/1000)}):verse('ui.037', {p0: world.cueIndex+1});
    buttons=optionsHtml(getOptions(world,'station.stage'));
  } else if(overlay==='end'){
    title=world.mode==='won'?verse('ui.038'):verse('ui.039');
    body=verse('ui.040', {p0: escapeHtml(world.ending??world.deathReason??'')});
    buttons=world.mode==='dead'?verse('ui.041', {p0: hasSave('checkpoint')?'':'disabled'}):verse('ui.042');
  }
  overlayEl.innerHTML=verse('ui.043', {p0: title, p1: body, p2: buttons});
}
function factText(f:string){const map:Record<string,string>={'fact.vision':verse('ui.044'),'fact.cabinet_seen':verse('ui.045'),'fact.hidden_passage':verse('ui.046'),'fact.blackout':verse('ui.047'),'fact.knife_inspection':verse('ui.048'),'fact.safe_issued':verse('ui.049')};return map[f]??f;}
function updateHud(){
  document.getElementById('zone')!.textContent=describeArea();const next=world.slots.find(x=>x.status!=='completed');
  document.getElementById('act')!.textContent=next?verse('ui.050', {p0: actById[next.actId].name}):verse('ui.051');
  document.getElementById('decay')!.textContent=verse('ui.052', {p0: world.decayStage});
  const near=nearbyTargets(world).slice(0,5);
  const key=near.map(x=>x.id).sort().join('|');
  if(key!==lastTargetKey){targetEl.innerHTML=near.map((x,i)=>verse('ui.053', {p0: escapeHtml(x.id), p1: i===0?'first':'', p2: escapeHtml(x.name), p3: x.distance.toFixed(1)})).join('')||verse('ui.054');lastTargetKey=key;}
  else for(const x of near){const button=Array.from(targetEl.querySelectorAll<HTMLButtonElement>('button')).find(b=>b.dataset.target===x.id);const distance=button?.querySelector('small');if(distance)distance.textContent=verse('ui.055', {p0: x.distance.toFixed(1)});}
  promptEl.textContent=near[0]?`E · ${near[0].name}`:verse('ui.056');
  if(import.meta.env.DEV&&devVisible){const d=scene.diagnostics();devEl.hidden=false;devEl.innerHTML=verse('ui.057', {p0: Math.round(1000/Math.max(1,performance.now()-last)), p1: Math.round(world.gameTimeMs/1000), p2: d.drawCalls, p3: d.textures, p4: d.placeholderSlots, p5: world.events.length, p6: Object.values(world.actors).map(a=>`${a.id}: ${a.task} → ${a.goalNode} [${a.route.join(',')}]`).join('\n'), p7: Object.values(world.items).map(i=>`${i.instanceId}: ${i.location.kind}${i.location.kind==='actor'?` ${i.location.actorId}`:i.location.kind==='world'?` ${i.location.areaId}`:''}`).join('\n')});}else devEl.hidden=true;
  if(overlay==='stage'&&world.mode==='act'){const current=document.querySelector<HTMLButtonElement>('#overlay button[data-action="cue"]');const available=getOptions(world,'station.stage')[0];if(current&&current.disabled===available.enabled)renderOverlay();}
}
function openTarget(id:string){targetId=id;message=verse('ui.058');overlay='target';renderOverlay();}
function closeOverlay(){overlay=world.mode==='act'||world.mode==='finale'?'stage':null;message='';renderOverlay();accumulator=0;}
function doAction(id:string){
  const target=overlay==='stage'?'station.stage':targetId;if(!target)return;
  if(id==='startFinale'||id==='startAct')saveWorld('checkpoint',world);
  const res=execute(world,target,id);message=res.message;toast(res.message);if(res.sound)audio.play(res.sound);
  if(res.checkpoint&&world.mode==='playing')saveWorld('checkpoint',world);
  if(world.mode==='act'||world.mode==='finale')overlay='stage';else if(world.mode==='dead'||world.mode==='won')overlay='end';else if(overlay==='stage')overlay=null;
  renderOverlay();updateHud();
}
function uiAction(action:string){audio.unlock();audio.play('ui');
  if(action==='new'){world=createWorld();audio.reset();overlay=null;targetId=null;message='';saveWorld('checkpoint',world);renderOverlay();return;}
  if(action==='load'||action==='retry'){try{const loaded=loadWorld(action==='retry'?'checkpoint':'manual');if(!loaded){toast(verse('ui.059'));return;}world=loaded;audio.reset();overlay=world.mode==='act'||world.mode==='finale'?'stage':null;renderOverlay();toast(verse('ui.060'));}catch(e){toast(verse('ui.061'));}return;}
  if(action==='save'){try{saveWorld('manual',world);toast(verse('ui.062'));}catch(e){toast(verse('ui.063'));}return;}
  if(action==='title'){overlay='intro';renderOverlay();return;}
  if(action==='close')closeOverlay();
}
overlayEl.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest('button') as HTMLButtonElement|null;if(!button)return;
  if(button.dataset.action)doAction(button.dataset.action);else if(button.dataset.ui)uiAction(button.dataset.ui);else if(button.dataset.item)openTarget(button.dataset.item);
});
overlayEl.addEventListener('input',e=>{const input=e.target as HTMLInputElement;const key=input.dataset.volume as keyof typeof audio.volume|undefined;if(!key)return;audio.volume[key]=Number(input.value);localStorage.setItem('last-applause:v1:settings',JSON.stringify(audio.volume));});
targetEl.addEventListener('click',e=>{const button=(e.target as HTMLElement).closest('button') as HTMLButtonElement|null;if(button?.dataset.target)openTarget(button.dataset.target);});
devEl.addEventListener('click',e=>{const b=(e.target as HTMLElement).closest('button') as HTMLButtonElement|null;if(!b)return;
  if(b.dataset.dev==='checkpoint'){const loaded=loadWorld('checkpoint');if(loaded)world=loaded;}
  if(b.dataset.dev==='finale'){try{const saved=loadWorld('checkpoint');if(saved&&saved.slots.every(x=>x.status==='completed')&&saved.mechanisms.finalInspected){world=saved;toast(verse('ui.064'));}else toast(verse('ui.065'));}catch(e){toast(verse('ui.066'));}}
  if(b.dataset.dev==='gate'){world.mechanisms.serviceGateOpen=!world.mechanisms.serviceGateOpen;world.navigationVersion++;for(const actor of Object.values(world.actors)){actor.route=[];actor.routeIndex=0;}}
  if(b.dataset.dev==='paths'){devPaths=!devPaths;scene.showDebug(devPaths);}
});
window.addEventListener('keydown',e=>{
  if(['Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();
  if(e.repeat&&['KeyE','KeyQ','KeyJ','Tab','KeyI','Escape'].includes(e.code))return;
  if(e.code==='Backquote'&&import.meta.env.DEV){devVisible=!devVisible;updateHud();return;}
  keys.add(e.code);const action=actionFor(e.code);if(!action)return;
  if(action==='interact'&&overlay===null){const nearest=nearbyTargets(world)[0];if(nearest)openTarget(nearest.id);}
  if(action==='inventory'&&world.mode==='playing'){overlay=overlay==='inventory'?null:'inventory';renderOverlay();}
  if(action==='vision'&&world.mode==='playing'){overlay=overlay==='vision'?null:'vision';renderOverlay();}
  if(action==='journal'&&world.mode==='playing'){overlay=overlay==='journal'?null:'journal';renderOverlay();}
  if(action==='pause'){if(overlay==='intro'||overlay==='end'||overlay==='stage')return;overlay=overlay==='pause'?null:overlay?null:'pause';renderOverlay();}
});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();accumulator=0;audio.setEnabled(false);});
window.addEventListener('focus',()=>{last=performance.now();audio.setEnabled(true);});
document.addEventListener('visibilitychange',()=>{accumulator=0;last=performance.now();audio.setEnabled(!document.hidden);});
function loop(now:number){const dt=Math.min(100,now-last);last=now;
  const active=(overlay===null||overlay==='stage')&&!document.hidden&&document.hasFocus();
  if(active){let dx=0,dz=0;if(keys.has('KeyW')||keys.has('ArrowUp'))dz--;if(keys.has('KeyS')||keys.has('ArrowDown'))dz++;if(keys.has('KeyA')||keys.has('ArrowLeft'))dx--;if(keys.has('KeyD')||keys.has('ArrowRight'))dx++;
    movePlayer(world,dx,dz,dt);accumulator+=dt;while(accumulator>=100){tickWorld(world,100);accumulator-=100;}audio.update(world);
    if(world.mode==='dead'||world.mode==='won'){overlay='end';renderOverlay();}
  }else accumulator=0;
  scene.update(world,dt);if(now>toastTimer)toastEl.hidden=true;
  if(world.mode==='finale'&&overlay==='stage'){const counter=document.getElementById('countdown');if(counter)counter.textContent=String(Math.max(0,Math.ceil((world.finaleDeadline-world.gameTimeMs)/1000)));}
  if(Math.floor(now/250)!==Math.floor((now-dt)/250))updateHud();requestAnimationFrame(loop);
}
renderOverlay();updateHud();requestAnimationFrame(loop);
