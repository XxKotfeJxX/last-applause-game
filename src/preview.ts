import { assetCatalog } from './generated/catalog';
import { characters, items } from './content';
import { AssetResolver, clipFps, clipFrames } from './render/assets';
import './style.css';

const app=document.getElementById('app')!,resolver=new AssetResolver();
const characterPreviews=[{visualId:'visual.character.hero',name:'Герой',color:'#e6dac0',accent:'#802c3d'},...characters];
app.style.cssText='overflow:auto;height:100%;padding:28px;background:#17141f;color:#f6e5c9';
app.innerHTML=`<h1>Перегляд пакетів асетів</h1><p>Обирайте clip і напрямок. Золота рамка позначає пакет; підпис показує файл або процедурний fallback.</p><div id="cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px"></div>`;
const cards=document.getElementById('cards')!;
for(const def of characterPreviews){
  const article=document.createElement('article');article.style.cssText='background:#29202b;border:1px solid #b58b62;padding:14px';
  article.innerHTML=`<h2 style="font-size:18px;margin:0 0 8px">${def.name}</h2><small>${def.visualId}</small><div><canvas width="128" height="192" style="display:block;width:128px;height:192px;margin:12px auto;background:#39303b;image-rendering:pixelated"></canvas></div><select class="clip">${Object.keys(clipFrames).map(x=>`<option>${x}</option>`).join('')}</select> <select class="direction"><option>south</option><option>west</option><option>east</option><option>north</option></select><p class="status-text"></p>`;
  cards.appendChild(article);
}
for(const def of items){
  const article=document.createElement('article');article.style.cssText='background:#29202b;border:1px solid #b58b62;padding:14px';
  article.innerHTML=`<h2 style="font-size:18px;margin:0 0 8px">${def.name}</h2><small>${def.visualId}</small><div><canvas width="128" height="128" style="display:block;width:128px;height:128px;margin:12px auto;background:#39303b;image-rendering:pixelated"></canvas></div><p>${assetCatalog[def.visualId]?.files.world?'Файл world.png':'Процедурний fallback'}</p>`;cards.appendChild(article);
}
function render(time:number){
  for(const [index,def] of characterPreviews.entries()){
    const article=cards.children[index] as HTMLElement,canvas=article.querySelector('canvas')!,ctx=canvas.getContext('2d')!;
    const clip=(article.querySelector('.clip') as HTMLSelectElement).value,direction=(article.querySelector('.direction') as HTMLSelectElement).selectedIndex;
    const atlas=resolver.character(def,clip),image=atlas.texture.image as CanvasImageSource,frame=Math.floor(time/1000*(clipFps[clip]??4))%atlas.frames;
    const width=(image as HTMLImageElement).width/atlas.frames,height=(image as HTMLImageElement).height/4;
    ctx.clearRect(0,0,128,192);if(width&&height)ctx.drawImage(image,frame*width,direction*height,width,height,0,0,128,192);
    article.querySelector('.status-text')!.textContent=assetCatalog[def.visualId]?.files[clip]?`Файл ${clip}.png`:'Процедурний fallback';
  }
  for(const [index,def] of items.entries()){
    const article=cards.children[characterPreviews.length+index] as HTMLElement,canvas=article.querySelector('canvas')!,ctx=canvas.getContext('2d')!;
    const image=resolver.item(def).image as CanvasImageSource;ctx.clearRect(0,0,128,128);
    if((image as HTMLImageElement).width)ctx.drawImage(image,0,0,128,128);
  }
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
