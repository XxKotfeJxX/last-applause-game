import {it,expect} from 'vitest';
import * as T from 'three';
import {ModelFactory} from '../../src/render/models';
import {worldData} from '../../src/content';
import {floorBaseGeometry,inlayGeometry} from '../../src/render/scenography';
import {surfaceHeight,corridorDeckSections,mapObjects} from '../../src/world/layout';
type P=[number,number];
const cross=(a:P,b:P,c:P)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
function hull(points:P[]):P[]{const unique=[...new Map(points.map(p=>[p.join(','),p])).values()].sort((a,b)=>a[0]-b[0]||a[1]-b[1]);const a:P[]=[],b:P[]=[];for(const p of unique){while(a.length>1&&cross(a[a.length-2],a[a.length-1],p)<=0)a.pop();a.push(p);}for(const p of [...unique].reverse()){while(b.length>1&&cross(b[b.length-2],b[b.length-1],p)<=0)b.pop();b.push(p);}return a.slice(0,-1).concat(b.slice(0,-1));}
function overlap(subject:P[],clip:P[]):number{
 let result=subject;
 for(let i=0;i<clip.length;i++){const a=clip[i],b=clip[(i+1)%clip.length],input=result;result=[];for(let j=0;j<input.length;j++){const p=input[j],q=input[(j+1)%input.length],dp=cross(a,b,p),dq=cross(a,b,q),pi=dp>=-1e-9,qi=dq>=-1e-9;if(pi)result.push(p);if(pi!==qi){const t=dp/(dp-dq);result.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}}}
 return Math.abs(result.reduce((s,p,i)=>{const q=result[(i+1)%result.length];return s+p[0]*q[1]-p[1]*q[0];},0))/2;
}
function conflicts(model:T.Group):string[]{
 model.updateMatrixWorld(true);const faces:{mesh:T.Mesh;index:number;key:string;points:P[]}[]=[];
 model.traverse(o=>{if(!(o instanceof T.Mesh)||!(o.geometry instanceof T.BoxGeometry))return;const g=o.geometry,index=g.index!,pos=g.attributes.position,norm=g.attributes.normal,nm=new T.Matrix3().getNormalMatrix(o.matrixWorld);
  for(const [face,group] of g.groups.entries()){
   const n=new T.Vector3().fromBufferAttribute(norm,index.getX(group.start)).applyMatrix3(nm).normalize(),axis=[n.x,n.y,n.z].findIndex(v=>Math.abs(v)>.99999);if(axis<0||n.y<-.99999)continue;
   const vertices=Array.from({length:group.count},(_,i)=>new T.Vector3().fromBufferAttribute(pos,index.getX(group.start+i)).applyMatrix4(o.matrixWorld)),other=[0,1,2].filter(a=>a!==axis),plane=vertices[0].getComponent(axis);
   faces.push({mesh:o,index:face,key:`${axis}:${Math.sign(n.getComponent(axis))}:${Math.round(plane*10000)}`,points:hull(vertices.map(v=>[v.getComponent(other[0]),v.getComponent(other[1])]))});
  }
 });
 const result:string[]=[];for(let i=0;i<faces.length;i++)for(let j=i+1;j<faces.length;j++){const a=faces[i],b=faces[j];if(a.mesh===b.mesh||a.mesh.material===b.mesh.material||a.key!==b.key)continue;const area=overlap(a.points,b.points);if(area>1e-5)result.push(`${a.mesh.geometry.type}[${a.index}] ${a.mesh.material instanceof T.MeshStandardMaterial?a.mesh.material.color.getHexString():''} vs [${b.index}] ${b.mesh.material instanceof T.MeshStandardMaterial?b.mesh.material.color.getHexString():''}; area=${area.toFixed(5)}`);}
 return result;
}
it('has no overlapping coplanar differently shaded box faces across all map props',()=>{
 const factory=new ModelFactory();const reports=mapObjects.flatMap(o=>conflicts(factory.object(o)).map(message=>`${o.id}: ${message}`));expect(reports).toEqual([]);
});

it('never renders corridor slabs over a room floor',()=>{
 for(const c of worldData.corridors)for(const part of corridorDeckSections(c))for(const a of worldData.areas){const width=Math.min(part.x+part.w/2,a.x+a.w/2)-Math.max(part.x-part.w/2,a.x-a.w/2),depth=Math.min(part.z+part.d/2,a.z+a.d/2)-Math.max(part.z-part.d/2,a.z-a.d/2);expect(Math.max(0,width)*Math.max(0,depth),`${c.a} / ${a.id}`).toBeLessThan(1e-6);}
});
it('uses open-top foundations under textured floors',()=>{
 for(const a of worldData.areas){const g=floorBaseGeometry(a.w,a.d),index=g.index!,norm=g.attributes.normal;for(let i=0;i<index.count;i++)expect(norm.getY(index.getX(i))).toBeLessThan(.5);g.dispose();}
});
it('keeps every seam above and parallel to the sloped walking surface',()=>{
 for(const c of worldData.corridors)for(const p of corridorDeckSections(c)){const g=inlayGeometry(p.x,p.z,p.w,.025),pos=g.attributes.position;for(let i=0;i<pos.count;i++)expect(pos.getY(i)-surfaceHeight(pos.getX(i),pos.getZ(i))).toBeCloseTo(.008,5);g.dispose();}
});
