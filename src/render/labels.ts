import * as T from 'three';
import { worldData } from '../content';
import { surfaceHeight } from '../world/layout';
import type { WorldState } from '../domain/types';
/** Browser-rendered text at CSS pixel resolution, independent of WebGL resolution. */
export class WorldLabels{
 private layer=document.createElement('div');
 private entries:{id:string;x:number;z:number;y:number;node:HTMLDivElement;area:boolean}[]=[];
 constructor(container:HTMLElement){
  this.layer.className='world-label-layer';this.layer.setAttribute('aria-hidden','true');container.appendChild(this.layer);
  for(const a of worldData.areas)this.add(a.id,a.name,a.x,a.z,a.floorY+.12,true);
  for(const s of worldData.interactables)this.add(s.id,s.name,s.x,s.z,surfaceHeight(s.x,s.z)+2.25,false);
 }
 private add(id:string,text:string,x:number,z:number,y:number,area:boolean){const node=document.createElement('div');node.className=`world-label${area?' area-label':''}`;node.textContent=text;node.hidden=true;this.layer.appendChild(node);this.entries.push({id,x,z,y,node,area});}
 update(s:WorldState,camera:T.Camera,width:number,height:number){
  const occupied:{left:number;top:number;right:number;bottom:number}[]=[];
  const entries=this.entries.map(e=>({...e,distance:Math.hypot(e.x-s.player.x,e.z-s.player.z)})).sort((a,b)=>Number(a.area)-Number(b.area)||a.distance-b.distance);
  let stations=0;
  for(const e of entries){
   const p=new T.Vector3(e.x,e.y,e.z).project(camera),x=Math.round((p.x+1)*width/2),y=Math.round((1-p.y)*height/2),erased=s.areaStates[e.id]==='erased';
   if(erased||e.distance>(e.area?19:4.5)||e.area&&e.distance<5||!e.area&&stations>=3||Math.abs(p.x)>1||Math.abs(p.y)>1||p.z< -1||p.z>1){e.node.hidden=true;continue;}
   e.node.hidden=false;
   const w=e.node.offsetWidth,h=e.node.offsetHeight,left=Math.round(x-w/2),top=Math.round(y-h),rect={left,top,right:left+w,bottom:top+h};
   const inSidebar=width>700&&left<282&&rect.right>12&&top<420;
   if(left<8||rect.right>width-8||top<110||rect.bottom>height-110||inSidebar||occupied.some(r=>rect.left<r.right+8&&rect.right>r.left-8&&rect.top<r.bottom+6&&rect.bottom>r.top-6)){e.node.hidden=true;continue;}
   e.node.style.left=`${left}px`;e.node.style.top=`${top}px`;occupied.push(rect);if(!e.area)stations++;
  }
 }
}
