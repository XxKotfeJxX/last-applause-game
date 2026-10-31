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
app.innerHTML=`<div id="game"><div id="viewport"></div><div class="vignette"></div><header class="topbar"><div class="brand"><span class="eyebrow">МІСТИЧНИЙ ЦИРК · ОСТАННЯ ВИСТАВА</span><strong>Останні оплески</strong></div><div class="status"><span id="zone"></span><span id="act"></span><span id="decay"></span></div></header><aside id="side"><div class="side-head">ПОРУЧ</div><div id="targets"></div></aside><div id="prompt"></div><footer><span>WASD — рух</span><span>E — дія</span><span>Tab — речі</span><span>Q — карта</span><span>J — журнал</span><span>Esc — пауза</span></footer><div id="overlay" hidden></div><div id="toast" hidden></div><div id="dev" hidden></div></div>`;
const viewport=document.getElementById('viewport')!,overlayEl=document.getElementById('overlay')!,toastEl=document.getElementById('toast')!;
const targetEl=document.getElementById('targets')!,promptEl=document.getElementById('prompt')!,devEl=document.getElementById('dev')!;
const scene=new GameScene(viewport),audio=new GameAudio();
try{Object.assign(audio.volume,JSON.parse(localStorage.getItem('last-applause:v1:settings')??'{}'));}catch{}
let world=createWorld(),overlay:Overlay='intro',targetId:string|null=null,message='',last=performance.now(),accumulator=0,toastTimer=0,devVisible=false,devPaths=false,lastTargetKey='';
const keys=new Set<string>();
function escapeHtml(value:string){return value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));}
function toast(text:string){toastEl.textContent=text;toastEl.hidden=false;toastTimer=performance.now()+3500;}
function describeArea(){const id=areaAt(world.player.x,world.player.z);return worldData.areas.find(x=>x.id===id)?.name??'Службовий прохід';}
function optionsHtml(opts:Option[]){return opts.map(o=>`<button class="choice" data-action="${escapeHtml(o.id)}" ${o.enabled?'':'disabled'}><span>${escapeHtml(o.label)}</span>${!o.enabled&&o.reason?`<small>${escapeHtml(o.reason)}</small>`:''}</button>`).join('');}
function renderOverlay(){
  if(!overlay){overlayEl.hidden=true;return;}overlayEl.hidden=false;let title='',body='',buttons='';
  if(overlay==='intro'){
    title='Карта останнього номера';body=`<div class="vision-card"><div class="card-symbol">✦ ◯ ✦</div><div>МАСКА · КОЛЕСО · КИДКИ</div><div>ЧЕРВОНА ПЛЯМА · НЕРУХОМА ПОСТАТЬ</div><div>ЗАВІСА</div></div><p>Ви — учасник останньої вистави. Карта показала фрагменти майбутнього, але не пояснила їх. Три номери відділяють вас від колеса й ножів.</p>`;
    buttons=`<button class="choice gold" data-ui="new">Почати виставу</button>${hasSave('manual')?'<button class="choice" data-ui="load">Завантажити гру</button>':''}`;
  } else if(overlay==='target'&&targetId){
    title=world.actors[targetId]?characterById[targetId].name:world.items[targetId]?itemById[world.items[targetId].defId].name:worldData.interactables.find(x=>x.id===targetId)?.name??'Дія';
    body=`<p class="dialogue">${escapeHtml(message||'Що робити?').replace(/\n/g,'<br>')}</p>`;
    buttons=optionsHtml(getOptions(world,targetId))+`<button class="choice quiet" data-ui="close">Відійти</button>`;
  } else if(overlay==='inventory'){
    title='Реквізит';const owned=Object.values(world.items).filter(i=>i.location.kind==='actor'&&i.location.actorId==='player');
    body=`<p>Жетони: <b>${world.tokens}</b>. Великий реквізит переноситься окремо.</p>`;
    buttons=owned.map(i=>`<button class="choice" data-item="${escapeHtml(i.instanceId)}">${escapeHtml(itemById[i.defId].name)} ${i.location.kind==='actor'&&i.location.slot==='carry'?'· несу':''}</button>`).join('')||'<p class="muted">Речей поки немає.</p>';
    buttons+=`<button class="choice quiet" data-ui="close">Закрити</button>`;
  } else if(overlay==='journal'){
    title='Журнал вистави';body=`<h3>Програма</h3><ol>${world.slots.map(x=>`<li>${escapeHtml(actById[x.actId].name)} — ${x.status==='completed'?'виконано':'очікує'}</li>`).join('')}</ol><h3>Домовленості</h3><p>${world.agreements.map(a=>`${escapeHtml(actById[a.candidateActId].name)}: ${a.status==='committed'?'оголошено':a.status==='candidateAccepted'?'кандидат погодився':'скасовано'}`).join('<br>')||'Немає'}</p><h3>Відомі факти</h3><ul>${world.facts.map(f=>`<li>${escapeHtml(factText(f))}</li>`).join('')}</ul><h3>Останні події</h3><p>${world.log.slice(0,8).map(escapeHtml).join('<br>')}</p>`;buttons='<button class="choice quiet" data-ui="close">Закрити</button>';
  } else if(overlay==='vision'){
    title='Карта пророцтва';body=`<div class="vision-card"><div class="card-symbol">✦ ◯ ✦</div><div>МАСКА · КОЛЕСО · КИДКИ</div><div>ЧЕРВОНА ПЛЯМА · НЕРУХОМА ПОСТАТЬ</div><div>ЗАВІСА</div></div><p>Ці кадри правдиві. Те, що лишилося за межами карти, доведеться з’ясувати вам.</p>`;buttons='<button class="choice quiet" data-ui="close">Закрити</button>';
  } else if(overlay==='pause'){
    title='Антракт';body=`<p>Вистава завмерла. Прогрес можна зберегти між номерами.</p><h3>Звук</h3>${(['master','music','ambience','sfx'] as const).map(id=>`<label class="volume">${{master:'Загальна',music:'Музика',ambience:'Атмосфера',sfx:'Ефекти'}[id]}<input type="range" min="0" max="1" step="0.05" data-volume="${id}" value="${audio.volume[id]}"></label>`).join('')}`;
    buttons=`<button class="choice gold" data-ui="close">Повернутися</button><button class="choice" data-ui="save" ${world.mode!=='playing'?'disabled':''}>Зберегти гру</button><button class="choice" data-ui="load" ${!hasSave('manual')?'disabled':''}>Завантажити</button><button class="choice" data-ui="title">До титулу</button><button class="choice" data-ui="new">Нова гра</button>`;
  } else if(overlay==='stage'){
    title=world.mode==='finale'?'Останній номер':actById[world.activeActId??'']?.name??'Манеж';
    body=world.mode==='finale'?`<div class="vision-card compact">МАСКА · КОЛЕСО · ЧЕРВОНА ПЛЯМА · ЗАВІСА</div><p>Кидок наближається. Зал завмер. Оберіть підготовлений план.</p><p class="danger">До сигналу: <span id="countdown">${Math.ceil((world.finaleDeadline-world.gameTimeMs)/1000)}</span> с</p>`:`<p>Конферансьє подав сигнал ${world.cueIndex+1} із 2. Виконайте сценічну дію.</p>`;
    buttons=optionsHtml(getOptions(world,'station.stage'));
  } else if(overlay==='end'){
    title=world.mode==='won'?'Оплески після порожнечі':'Колесо зупинилося';
    body=`<div class="vision-card compact">МАСКА · КОЛЕСО · КИДКИ · ЧЕРВОНА ПЛЯМА · ЗАВІСА</div><p>${escapeHtml(world.ending??world.deathReason??'')}</p>`;
    buttons=world.mode==='dead'?`<button class="choice gold" data-ui="retry" ${hasSave('checkpoint')?'':'disabled'}>Повторити з контрольної точки</button><button class="choice" data-ui="new">Почати заново</button>`:'<button class="choice gold" data-ui="new">Нова вистава</button>';
  }
  overlayEl.innerHTML=`<div class="modal"><div class="modal-kicker">ОСТАННІ ОПЛЕСКИ</div><h1>${title}</h1><div class="modal-body">${body}</div><div class="choices">${buttons}</div></div>`;
}
function factText(f:string){const map:Record<string,string>={'fact.vision':'Карта показала шість незмінних фрагментів.','fact.cabinet_seen':'У шафи є прихований вихід.','fact.hidden_passage':'Шафа підміни веде до службового проходу.','fact.blackout':'Лебідка може на мить погасити прожектори.','fact.knife_inspection':'Марко перевіряє комплект до останнього номера.','fact.safe_issued':'Роза записала видачу сценічних ножів.'};return map[f]??f;}
function updateHud(){
  document.getElementById('zone')!.textContent=describeArea();const next=world.slots.find(x=>x.status!=='completed');
  document.getElementById('act')!.textContent=next?`Далі: ${actById[next.actId].name}`:'Далі: останній номер';
  document.getElementById('decay')!.textContent=`Зникнення ${world.decayStage}/3`;
  const near=nearbyTargets(world).slice(0,5);
  const key=near.map(x=>x.id).sort().join('|');
  if(key!==lastTargetKey){targetEl.innerHTML=near.map((x,i)=>`<button data-target="${escapeHtml(x.id)}" class="near ${i===0?'first':''}"><span>${escapeHtml(x.name)}</span><small>${x.distance.toFixed(1)} м</small></button>`).join('')||'<span class="muted">Нікого поруч</span>';lastTargetKey=key;}
  else for(const x of near){const button=Array.from(targetEl.querySelectorAll<HTMLButtonElement>('button')).find(b=>b.dataset.target===x.id);const distance=button?.querySelector('small');if(distance)distance.textContent=`${x.distance.toFixed(1)} м`;}
  promptEl.textContent=near[0]?`E · ${near[0].name}`:'Досліджуйте цирк';
  if(import.meta.env.DEV&&devVisible){const d=scene.diagnostics();devEl.hidden=false;devEl.innerHTML=`<b>DEV</b> · ${Math.round(1000/Math.max(1,performance.now()-last))} FPS · ${Math.round(world.gameTimeMs/1000)} с · ${d.drawCalls} draw calls · ${d.textures} textures · ${d.placeholderSlots} fallback · ${world.events.length} events<br><button data-dev="checkpoint">Checkpoint</button><button data-dev="finale">Finale checkpoint</button><button data-dev="gate">Gate</button><button data-dev="paths">Routes / colliders</button><pre>${Object.values(world.actors).map(a=>`${a.id}: ${a.task} → ${a.goalNode} [${a.route.join(',')}]`).join('\n')}\n${Object.values(world.items).map(i=>`${i.instanceId}: ${i.location.kind}${i.location.kind==='actor'?` ${i.location.actorId}`:i.location.kind==='world'?` ${i.location.areaId}`:''}`).join('\n')}</pre>`;}else devEl.hidden=true;
  if(overlay==='stage'&&world.mode==='act'){const current=document.querySelector<HTMLButtonElement>('#overlay button[data-action="cue"]');const available=getOptions(world,'station.stage')[0];if(current&&current.disabled===available.enabled)renderOverlay();}
}
function openTarget(id:string){targetId=id;message='Що робити?';overlay='target';renderOverlay();}
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
  if(action==='load'||action==='retry'){try{const loaded=loadWorld(action==='retry'?'checkpoint':'manual');if(!loaded){toast('Збереження немає.');return;}world=loaded;audio.reset();overlay=world.mode==='act'||world.mode==='finale'?'stage':null;renderOverlay();toast('Світ, предмети й маршрути відновлено.');}catch(e){toast((e as Error).message);}return;}
  if(action==='save'){try{saveWorld('manual',world);toast('Гру збережено.');}catch(e){toast(`Збереження не вдалося: ${(e as Error).message}`);}return;}
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
  if(b.dataset.dev==='finale'){try{const saved=loadWorld('checkpoint');if(saved&&saved.slots.every(x=>x.status==='completed')&&saved.mechanisms.finalInspected){world=saved;toast('Завантажено валідну фінальну контрольну точку.');}else toast('Спершу дійдіть до останньої перевірки у звичайній грі.');}catch(e){toast((e as Error).message);}}
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
