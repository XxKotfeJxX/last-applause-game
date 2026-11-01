import { assetCatalog } from './generated/catalog';
import { characters, items } from './content';
import { AssetResolver, clipFrames } from './render/assets';
import { ItemIcons } from './render/item-icons';
import { GameAudio } from './audio/audio';
import './style.css';
const app=document.getElementById('app')!,resolver=new AssetResolver(),audio=new GameAudio(),icons=new ItemIcons();
const people=[{visualId:'visual.character.hero',name:'Герой',color:'#e6dac0',accent:'#802c3d'},...characters];
app.style.cssText='overflow:auto;height:100%;padding:28px;background:#17141f;color:#f6e5c9';
app.innerHTML=`<h1>Перегляд пакетів асетів</h1><p>Технічний інструмент: рамка кадру, червона опора, блакитні sockets. Масштаб показує відносний розмір персонажа в метрах.</p><div style="position:sticky;top:0;background:#17141f;padding:12px;z-index:2"><label><input id="paused" type="checkbox"> Пауза</label> <label><input id="grid" type="checkbox" checked> Сітка</label> <label><input id="sockets" type="checkbox" checked> Опора / sockets</label> <label>Масштаб <select id="zoom"><option value=".5">0.5×</option><option value="1" selected>1×</option><option value="1.5">1.5×</option></select></label></div><div id="cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px"></div><h2>Семантичні звуки</h2><div id="sounds"></div>`;
const cards=document.getElementById('cards')!;
function card(name:string,id:string){const el=document.createElement('article');el.style.cssText='background:#29202b;border:1px solid #b58b62;padding:14px;overflow:hidden';const title=document.createElement('h2');title.textContent=name;title.style.fontSize='18px';el.appendChild(title);const label=document.createElement('small');label.textContent=id;el.appendChild(label);cards.appendChild(el);return el;}
const previews=people.map(def=>{
 const el=card(def.name,def.visualId);el.insertAdjacentHTML('beforeend',`<canvas width="256" height="288" style="display:block;width:256px;height:288px;background:#39303b;margin:12px 0;image-rendering:pixelated"></canvas><select class="clip">${Object.keys(clipFrames).map(x=>`<option>${x}</option>`).join('')}</select> <select class="direction">${['south','west','east','north'].map(d=>`<option>${d}</option>`).join('')}</select><p class="status-text"></p>`);return{el,def};
});
const itemPreviews=items.map(def=>{const el=card(def.name,def.visualId);el.insertAdjacentHTML('beforeend','<canvas width="256" height="192" style="width:256px;height:192px;background:#39303b"></canvas>');const image=new Image();image.src=icons.icon(def);return{el,def,image};});
for(const [id,entry] of Object.entries(assetCatalog).filter(([,a])=>a.kind==='environment')){
 const el=card(id.replace('visual.environment.',''),id),img=document.createElement('img');img.src=entry.files.albedo;img.alt=id;img.style.cssText='display:block;width:100%;height:180px;object-fit:contain;background:repeating-conic-gradient(#39303b 0% 25%,#504551 0% 50%) 0/20px 20px';el.appendChild(img);
 const meta=document.createElement('p');meta.textContent=`${entry.meta.renderMode}; ${entry.meta.worldHeight??'surface'}; ${entry.meta.repeat?'repeat':'clamp'}`;el.appendChild(meta);
}
for(const sound of ['ui','act','decay','knife','victory','death'] as const){const b=document.createElement('button');b.textContent=sound;b.addEventListener('click',()=>audio.play(sound));document.getElementById('sounds')!.appendChild(b);}
const checked=(id:string)=>(document.getElementById(id) as HTMLInputElement).checked;
function cross(c:CanvasRenderingContext2D,x:number,y:number,color:string){c.strokeStyle=color;c.lineWidth=2;c.beginPath();c.moveTo(x-5,y);c.lineTo(x+5,y);c.moveTo(x,y-5);c.lineTo(x,y+5);c.stroke();}
let previous=0,time=0;
function render(now:number){
 if(!checked('paused'))time+=Math.min(100,now-previous);previous=now;
 const zoom=Number((document.getElementById('zoom') as HTMLSelectElement).value);
 for(const {el,def} of previews){
  const canvas=el.querySelector('canvas')!,c=canvas.getContext('2d')!,clip=(el.querySelector('.clip') as HTMLSelectElement).value,row=(el.querySelector('.direction') as HTMLSelectElement).selectedIndex;
  const atlas=resolver.character(def,clip),image=atlas.texture.image as HTMLImageElement,fw=image.width/atlas.frames,fh=image.height/atlas.rows,raw=Math.floor(time/1000*(atlas.fps??4)),frame=atlas.loop?raw%atlas.frames:Math.min(raw,atlas.frames-1);
  c.clearRect(0,0,256,288);
  if(checked('grid')){c.strokeStyle='#675b6a';c.lineWidth=.5;for(let n=0;n<288;n+=24){c.beginPath();c.moveTo(n,0);c.lineTo(n,288);c.moveTo(0,n);c.lineTo(256,n);c.stroke();}}
  const h=(atlas.worldHeight??2)*96*zoom,w=h*(atlas.width??128)/(atlas.height??192),anchor=atlas.anchor??[64,176],x=128-w*anchor[0]/(atlas.width??128),y=262-h*anchor[1]/(atlas.height??192);
  if(fw&&fh)c.drawImage(image,frame*fw,row*fh,fw,fh,x,y,w,h);
  c.strokeStyle='#d3b176';c.lineWidth=1;c.strokeRect(x,y,w,h);
  if(checked('sockets')){cross(c,128,262,'#ff7b7b');for(const point of Object.values(atlas.sockets??{}))cross(c,x+point[0]*w/(atlas.width??128),y+point[1]*h/(atlas.height??192),'#6fe7ea');}
  el.querySelector('.status-text')!.textContent=`${assetCatalog[def.visualId]?.files[clip]??'procedural fallback'} · ${atlas.fps} fps · ${frame+1}/${atlas.frames} · ${atlas.loop?'loop':'hold'} · ${atlas.width}×${atlas.height} · ${atlas.worldHeight}m`;
 }
 for(const {el,image} of itemPreviews){const c=el.querySelector('canvas')!.getContext('2d')!;c.clearRect(0,0,256,192);if(image.width)c.drawImage(image,64,16,128,128);}
 requestAnimationFrame(render);
}
requestAnimationFrame(render);
