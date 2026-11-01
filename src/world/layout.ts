import data from '../../content/areas/objects.json';
import { worldData, type CorridorDef } from '../content';
export interface MapObject {id:string;kind:string;area:string;x:number;z:number;w:number;h:number;d:number;solid:boolean;y?:number;decayKey?:string}
export interface Wall {id:string;area:string;x:number;z:number;w:number;d:number;h:number;floorY:number}
export const mapObjects=data.objects as MapObject[];
export const PLAYER_RADIUS=.22,ACTOR_HEIGHT=1.8;
export const contains=(b:{x:number;z:number;w:number;d:number},x:number,z:number)=>Math.abs(x-b.x)<=b.w/2+1e-7&&Math.abs(z-b.z)<=b.d/2+1e-7;
export function corridorSlope(c:CorridorDef){
 const a=worldData.areas.find(a=>a.id===c.a)!,b=worldData.areas.find(a=>a.id===c.b)!;
 const axis:'x'|'z'=Math.abs(b.x-a.x)>Math.abs(b.z-a.z)?'x':'z';
 const sign=Math.sign(b[axis]-a[axis]),size=axis==='x'?'w':'d';
 return{axis,start:a[axis]+sign*a[size]/2,end:b[axis]-sign*b[size]/2,from:a.floorY,to:b.floorY};
}
export function surfaceHeight(x:number,z:number):number{
 const area=worldData.areas.find(a=>contains(a,x,z));if(area)return area.floorY;
 const corridor=worldData.corridors.find(c=>contains(c,x,z));if(!corridor)return 0;
 const s=corridorSlope(corridor),t=Math.max(0,Math.min(1,((s.axis==='x'?x:z)-s.start)/(s.end-s.start)));
 return s.from+(s.to-s.from)*(Number.isFinite(t)?t:0);
}
export const walls:Wall[]=[];
for(const a of worldData.areas){
 for(const axis of ['x','z'] as const){const cross=axis==='x'?'z':'x',length=axis==='x'?a.w:a.d,depth=axis==='x'?a.d:a.w;
  for(const side of [-1,1]){const border=a[cross]+side*depth/2;let segments:[number,number][]=[[a[axis]-length/2,a[axis]+length/2]];
   for(const c of worldData.corridors.filter(c=>c.a===a.id||c.b===a.id)){
    const halfCross=(cross==='x'?c.w:c.d)/2;if(Math.abs(c[cross]-border)>halfCross+.01)continue;
    const half=(axis==='x'?c.w:c.d)/2,l=c[axis]-half,r=c[axis]+half;
    segments=segments.flatMap(([p,q])=>r<=p||l>=q?[[p,q] as [number,number]]:([[p,Math.min(q,l)],[Math.max(p,r),q]] as [number,number][]).filter(([v,w])=>w-v>.01));
   }
   for(const [l,r] of segments)walls.push({id:`wall.${a.id}.${axis}.${side}.${l}`,area:a.id,x:axis==='x'?(l+r)/2:border,z:axis==='z'?(l+r)/2:border,w:axis==='x'?r-l:.26,d:axis==='z'?r-l:.26,h:side===1?.55:1.7,floorY:a.floorY});
  }
 }
}
export function corridorSections(c:CorridorDef){const s=corridorSlope(c),size=s.axis==='x'?c.w:c.d,min=c[s.axis]-size/2,max=c[s.axis]+size/2;return{...s,cuts:[...new Set([min,max,Math.max(min,Math.min(max,s.start)),Math.max(min,Math.min(max,s.end))])].sort((a,b)=>a-b)};}

/** Rooms own their floors. Render only the exposed portions between their edges. */
export function corridorDeckSections(c:CorridorDef):{x:number;z:number;w:number;d:number}[]{
 const s=corridorSections(c),result:{x:number;z:number;w:number;d:number}[]=[];
 for(let i=0;i<s.cuts.length-1;i++){
  const min=s.cuts[i],max=s.cuts[i+1];if(max-min<.001)continue;
  const x=s.axis==='x'?(min+max)/2:c.x,z=s.axis==='z'?(min+max)/2:c.z;
  if(worldData.areas.some(a=>contains(a,x,z)))continue;
  result.push({x,z,w:s.axis==='x'?max-min:c.w,d:s.axis==='z'?max-min:c.d});
 }
 return result;
}
