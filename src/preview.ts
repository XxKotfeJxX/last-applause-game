import * as T from 'three';
import { assetCatalog } from './generated/catalog';
import { characters,items } from './content';
import { CharacterRig,characterClips } from './render/characters';
import { ModelFactory } from './render/models';
import { ItemIcons } from './render/item-icons';
import { GameAudio } from './audio/audio';
import './style.css';
const app=document.getElementById('app')!,audio=new GameAudio(),icons=new ItemIcons(),factory=new ModelFactory();
const people=[{visualId:'visual.character.hero',name:'Герой',color:'#e6dac0',accent:'#802c3d'},...characters];
app.style.cssText='overflow:auto;height:100%;padding:28px;background:#17141f;color:#f6e5c9';
app.innerHTML=`<h1>Майстерня персонажів і реквізиту</h1><p>Ті самі об’ємні моделі, суглоби та анімації, що й у грі. Червона мітка — опора, блакитні — кріплення голови й руки.</p><div style="position:sticky;top:0;background:#17141f;padding:12px;z-index:2"><label><input id="paused" type="checkbox"> Пауза</label> <label><input id="grid" type="checkbox" checked> Сітка</label> <label><input id="sockets" type="checkbox" checked> Кріплення</label> <label>Масштаб <select id="zoom"><option value=".5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option></select></label></div><div id="cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px"></div><h2>Семантичні звуки</h2><div id="sounds"></div>`;
const cards=document.getElementById('cards')!;
function card(name:string,id:string){const el=document.createElement('article');el.style.cssText='background:#29202b;border:1px solid #b58b62;padding:14px;overflow:hidden';const title=document.createElement('h2');title.textContent=name;title.style.fontSize='18px';el.appendChild(title);const label=document.createElement('small');label.textContent=id;el.appendChild(label);cards.appendChild(el);return el;}
const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(512,576);renderer.outputColorSpace=T.SRGBColorSpace;
const stage=new T.Scene();stage.background=new T.Color('#39303b');stage.add(new T.HemisphereLight('#eee3ff','#29202a',2));const light=new T.DirectionalLight('#ffe3ba',2.4);light.position.set(-3,5,5);stage.add(light);
const grid=new T.GridHelper(4,16,'#c7a16a','#685c6c');stage.add(grid);
const camera=new T.OrthographicCamera(-1.3,1.3,1.45,-1.45,.1,30);camera.position.set(3,2.8,5);camera.lookAt(0,1.1,0);
const previews=people.map(def=>{
 const el=card(def.name,def.visualId);el.insertAdjacentHTML('beforeend',`<canvas width="512" height="576" style="display:block;width:256px;max-width:100%;height:auto;margin:12px 0"></canvas><label>Рух <select class="clip">${characterClips.map(x=>`<option>${x}</option>`).join('')}</select></label> <label>Бік <select class="direction">${['south','west','east','north'].map(d=>`<option>${d}</option>`).join('')}</select></label><p class="status-text">Оригінальна 3D-модель · ${characterClips.length} анімацій</p>`);
 const rig=new CharacterRig(factory,def);stage.add(rig.root);const markers=Object.values(rig.sockets).map(socket=>{const dot=factory.sphere(socket,.026,'#5effee');(dot as T.Mesh).material=new T.MeshBasicMaterial({color:'#5effee',depthTest:false});return dot;});const origin=factory.sphere(rig.root,.035,'#ff6666');markers.push(origin);rig.root.visible=false;return{el,rig,markers};
});
const itemPreviews=items.map(def=>{const el=card(def.name,def.visualId);const img=document.createElement('img');img.src=icons.icon(def);img.alt=def.name;img.style.cssText='width:192px;height:192px;display:block';el.appendChild(img);return el;});void itemPreviews;
for(const [id,entry] of Object.entries(assetCatalog).filter(([,a])=>a.kind==='environment')){const el=card(id.replace('visual.environment.',''),id),img=document.createElement('img');img.src=entry.files.albedo;img.alt=id;img.style.cssText='display:block;width:100%;height:180px;object-fit:contain';el.appendChild(img);}
for(const sound of ['ui','act','decay','knife','victory','death'] as const){const b=document.createElement('button');b.textContent=sound;b.addEventListener('click',()=>{audio.unlock();audio.play(sound);});document.getElementById('sounds')!.appendChild(b);}
const checked=(id:string)=>(document.getElementById(id) as HTMLInputElement).checked;
let previous=0,time=0;
function render(now:number){
 if(!checked('paused'))time+=Math.min(100,now-previous);previous=now;
 const zoom=Number((document.getElementById('zoom') as HTMLSelectElement).value);camera.zoom=zoom;camera.updateProjectionMatrix();grid.visible=checked('grid');
 for(const {el,rig,markers} of previews){
  const rect=el.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight)continue;
  const clip=(el.querySelector('.clip') as HTMLSelectElement).value,row=(el.querySelector('.direction') as HTMLSelectElement).selectedIndex;
  rig.root.visible=true;rig.root.rotation.y=[0,-Math.PI/2,Math.PI/2,Math.PI][row];rig.animate(clip,time,time,clip==='carry_walk');for(const marker of markers)marker.visible=checked('sockets');
  renderer.render(stage,camera);el.querySelector('canvas')!.getContext('2d')!.drawImage(renderer.domElement,0,0);rig.root.visible=false;
 }
 requestAnimationFrame(render);
}
requestAnimationFrame(render);
