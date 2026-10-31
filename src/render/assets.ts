import * as THREE from 'three';
import { assetCatalog } from '../generated/catalog';
import type { CharacterDef, ItemDef } from '../content';

export const clipFrames:Record<string,number>={idle:4,walk:6,talk:4,interact:6,react:4,perform:8,carry_walk:6};
export const clipFps:Record<string,number>={idle:4,walk:8,talk:6,interact:8,react:8,perform:8,carry_walk:8};
const W=128,H=192;
type Atlas={texture:THREE.Texture;frames:number;rows:number};
export class AssetResolver {
  readonly requests=new Map<string,number>();readonly fallback=new Set<string>();
  private cache=new Map<string,Atlas>();private loader=new THREE.TextureLoader();
  environment(visualId:string):THREE.Texture {
    const key=`${visualId}:albedo`;
    const found=this.cache.get(key);if(found)return found.texture;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
    const c=canvas.getContext('2d')!;c.fillStyle='#51403a';c.fillRect(0,0,64,64);
    c.strokeStyle='#332b2c';for(let y=0;y<64;y+=16){c.beginPath();c.moveTo(0,y);c.lineTo(64,y);c.stroke();}
    const fallback=new THREE.CanvasTexture(canvas);fallback.colorSpace=THREE.SRGBColorSpace;
    const atlas:Atlas={texture:fallback,frames:1,rows:1};this.cache.set(key,atlas);
    const file=assetCatalog[visualId]?.files.albedo;
    this.requests.set(key,1);
    if(file)this.loader.load(new URL(file,document.baseURI).href,texture=>{
      texture.colorSpace=THREE.SRGBColorSpace;
      texture.anisotropy=4;
      texture.wrapS=texture.wrapT=THREE.ClampToEdgeWrapping;
      atlas.texture=texture;this.fallback.delete(key);
    },undefined,()=>{this.fallback.add(key);console.warn(`Environment ${visualId}: using procedural fallback.`);});
    else this.fallback.add(key);
    return atlas.texture;
  }
  character(def:CharacterDef|{visualId:string;color:string;accent:string;name:string},clip:string):Atlas{
    const key=`${def.visualId}:${clip}`;this.requests.set(key,(this.requests.get(key)??0)+1);
    const found=this.cache.get(key);if(found)return found;
    const entry=assetCatalog[def.visualId];const file=entry?.files[clip];
    const metaClip=(entry?.meta?.clips as Record<string,{frameCount?:number}>|undefined)?.[clip];
    const frames=metaClip?.frameCount??clipFrames[clip]??4;
    const fallback=this.proceduralCharacter(def,clip,frames);
    const atlas={texture:fallback,frames,rows:4};this.cache.set(key,atlas);
    if(file){
      this.loader.load(new URL(file,document.baseURI).href,texture=>{texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;atlas.texture=texture;},undefined,()=>{this.fallback.add(key);console.warn(`Асeт ${key} не завантажився; використано заглушку.`);});
    }else this.fallback.add(key);
    return atlas;
  }
  item(def:ItemDef):THREE.Texture {
    const key=`${def.visualId}:world`;this.requests.set(key,(this.requests.get(key)??0)+1);
    const found=this.cache.get(key);if(found)return found.texture;
    const texture=this.proceduralItem(def);const atlas={texture,frames:1,rows:1};this.cache.set(key,atlas);
    const file=assetCatalog[def.visualId]?.files.world;
    if(file)this.loader.load(new URL(file,document.baseURI).href,t=>{t.colorSpace=THREE.SRGBColorSpace;atlas.texture=t;},undefined,()=>{this.fallback.add(key);console.warn(`Асeт ${key} не завантажився; використано заглушку.`);});
    else this.fallback.add(key);
    return atlas.texture;
  }
  private proceduralCharacter(def:{color:string;accent:string;name:string},clip:string,frames:number):THREE.Texture{
    const canvas=document.createElement('canvas');canvas.width=W*frames;canvas.height=H*4;
    const c=canvas.getContext('2d')!;
    for(let row=0;row<4;row++)for(let frame=0;frame<frames;frame++){
      const cx=frame*W+64,top=row*H;const phase=frame/frames*Math.PI*2;
      const bob=clip==='walk'||clip==='carry_walk'?Math.sin(phase*2)*3:Math.sin(phase)*1.5;
      c.save();c.translate(cx,top+bob);c.lineJoin='round';c.lineCap='round';c.lineWidth=4;c.strokeStyle='#1b1721';
      const leg=clip==='walk'||clip==='carry_walk'?Math.sin(phase)*10:1;
      c.fillStyle='#252330';c.beginPath();c.moveTo(-17,137);c.lineTo(-19-leg,175);c.lineTo(-5-leg,175);c.lineTo(0,140);c.fill();c.stroke();
      c.beginPath();c.moveTo(4,139);c.lineTo(5+leg,175);c.lineTo(21+leg,175);c.lineTo(19,139);c.fill();c.stroke();
      c.fillStyle=def.accent;c.beginPath();c.moveTo(-26,72);c.lineTo(26,72);c.lineTo(29,142);c.lineTo(-29,142);c.closePath();c.fill();c.stroke();
      c.fillStyle=def.color;c.beginPath();c.moveTo(-22,80);c.lineTo(22,80);c.lineTo(17,126);c.lineTo(-17,126);c.closePath();c.fill();
      const gesture=clip==='talk'?Math.sin(phase)*12:clip==='perform'?18:clip==='interact'?Math.max(0,Math.sin(phase))*17:0;
      c.strokeStyle=def.color;c.lineWidth=12;c.beginPath();c.moveTo(-23,84);c.lineTo(-32,112-gesture);c.moveTo(23,84);c.lineTo(34,112-gesture);c.stroke();
      c.strokeStyle='#1b1721';c.lineWidth=3;c.beginPath();c.moveTo(-23,84);c.lineTo(-32,112-gesture);c.moveTo(23,84);c.lineTo(34,112-gesture);c.stroke();
      c.fillStyle='#e8c6a7';c.beginPath();c.ellipse(0,54,22,26,0,0,Math.PI*2);c.fill();c.stroke();
      c.fillStyle=def.accent;c.fillRect(-27,28,54,11);c.beginPath();c.moveTo(-20,29);c.lineTo(-16,12);c.lineTo(18,12);c.lineTo(22,29);c.fill();c.stroke();
      if(row===0){c.fillStyle='#211e26';c.fillRect(-10,56,5,3);c.fillRect(6,56,5,3);}else if(row===3){c.fillStyle=def.accent;c.fillRect(-13,49,26,15);}else{c.fillStyle='#211e26';c.fillRect(row===1?-11:6,55,5,3);}
      if(clip==='react'){c.fillStyle='#fff7d6';c.font='bold 22px serif';c.fillText('!',22,31);}
      if(clip==='perform'){c.strokeStyle='#f3d18a';c.lineWidth=2;c.beginPath();c.arc(0,95,43,phase,phase+1.2);c.stroke();}
      c.restore();
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=THREE.NearestFilter;texture.minFilter=THREE.NearestFilter;return texture;
  }
  private proceduralItem(def:ItemDef):THREE.Texture{
    const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const c=canvas.getContext('2d')!;
    c.fillStyle='#e9c781';c.strokeStyle='#221c25';c.lineWidth=6;c.lineJoin='round';
    if(def.id.includes('knives')){for(let i=0;i<3;i++){c.beginPath();c.moveTo(37+i*22,104);c.lineTo(43+i*22,24);c.lineTo(50+i*22,80);c.closePath();c.fill();c.stroke();}}
    else if(def.id.includes('mask')){c.beginPath();c.ellipse(64,61,39,45,0,0,Math.PI*2);c.fill();c.stroke();c.fillStyle='#312737';c.fillRect(40,54,15,8);c.fillRect(73,54,15,8);}
    else if(def.id.includes('double')){c.fillStyle='#7f756e';c.beginPath();c.arc(64,25,15,0,Math.PI*2);c.fill();c.fillRect(45,43,38,70);c.strokeRect(45,43,38,70);}
    else if(def.id.includes('costume')){c.beginPath();c.moveTo(30,30);c.lineTo(50,18);c.lineTo(78,18);c.lineTo(98,30);c.lineTo(83,109);c.lineTo(45,109);c.closePath();c.fill();c.stroke();}
    else if(def.id.includes('blood')){c.fillStyle='#a33b43';c.beginPath();c.arc(64,67,27,0,Math.PI*2);c.fill();c.stroke();}
    else {c.lineWidth=15;c.beginPath();c.moveTo(37,85);c.lineTo(89,35);c.stroke();}
    const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;return t;
  }
}
