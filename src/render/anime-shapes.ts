import * as T from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
/** Soft organic silhouettes and a shared three-tone ramp; no toy joints or glossy skin. */
export class AnimeShapes{
 private geometries=new Map<string,T.BufferGeometry>();private materials=new Map<string,T.Material>();
 private ramp:T.DataTexture;
 constructor(){this.ramp=new T.DataTexture(new Uint8Array([82,157,244]),3,1,T.RedFormat);this.ramp.minFilter=this.ramp.magFilter=T.NearestFilter;this.ramp.needsUpdate=true;}
 private geo(key:string,make:()=>T.BufferGeometry){let g=this.geometries.get(key);if(!g){g=make();this.geometries.set(key,g);}return g;}
 material(color:string,ink=false){const key=color+ink;let m=this.materials.get(key);if(!m){m=ink?new T.MeshBasicMaterial({color}):new T.MeshToonMaterial({color,gradientMap:this.ramp});this.materials.set(key,m);}return m;}
 mesh(p:T.Object3D,g:T.BufferGeometry,color:string,x=0,y=0,z=0,ink=false){const m=new T.Mesh(g,this.material(color,ink));m.position.set(x,y,z);p.add(m);return m;}
 ellipsoid(p:T.Object3D,x:number,y:number,z:number,sx:number,sy:number,sz:number,color:string,ink=false){const m=this.mesh(p,this.geo('sphere',()=>new T.SphereGeometry(1,24,16)),color,x,y,z,ink);m.scale.set(sx,sy,sz);return m;}
 form(p:T.Object3D,profile:number[][],color:string,x=0,y=0,z=0,depth=1){const key=JSON.stringify(profile),g=this.geo('lathe'+key,()=>new T.LatheGeometry(profile.map(([r,h])=>new T.Vector2(r,h)),32));const m=this.mesh(p,g,color,x,y,z);m.scale.z=depth;return m;}
 limb(p:T.Object3D,length:number,top:number,bottom:number,color:string){return this.form(p,[[0,-length-.005],[bottom*.7,-length],[bottom,-length+.025],[top,-.045],[top*.83,-.005],[0,.01]],color,0,0,0,.9);}
 ribbon(p:T.Object3D,points:number[][],width:number,color:string,depth=.38){
  const key=JSON.stringify([points,width,depth]),g=this.geo('lock'+key,()=>{
   const curve=new T.CatmullRomCurve3(points.map(v=>new T.Vector3(...v as [number,number,number]))),vertices:number[]=[],indices:number[]=[],sides=8,steps=12;
   for(let i=0;i<=steps;i++){const t=i/steps,c=curve.getPoint(t),tangent=curve.getTangent(t).normalize(),u=new T.Vector3(0,0,1).cross(tangent).normalize();if(u.lengthSq()<.1)u.set(1,0,0);const v=tangent.clone().cross(u).normalize(),radius=width*(.07+.93*Math.pow(1-t,.65));for(let j=0;j<sides;j++){const a=j*Math.PI*2/sides,point=c.clone().addScaledVector(u,Math.cos(a)*radius).addScaledVector(v,Math.sin(a)*radius*depth);vertices.push(...point.toArray());}}
   for(let i=0;i<steps;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=i*sides+(j+1)%sides,c=(i+1)*sides+j,d=(i+1)*sides+(j+1)%sides;indices.push(a,b,c,b,d,c);}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(vertices,3));g.setIndex(indices);g.computeVertexNormals();return g;
  });return this.mesh(p,g,color);
 }
 panel(p:T.Object3D,points:number[][],color:string,z:number){const key=JSON.stringify(points),g=this.geo('panel'+key,()=>{const s=new T.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();return new T.ExtrudeGeometry(s,{depth:.018,bevelEnabled:true,bevelThickness:.008,bevelSize:.008,bevelSegments:2});});return this.mesh(p,g,color,0,0,z);}
 cape(p:T.Object3D,color:string,length=.65,open=.8){
  const key=`cape${length},${open}`,g=this.geo(key,()=>{
   const pos:number[]=[],indices:number[]=[],columns=24,rows=8;
   for(let j=0;j<=rows;j++)for(let i=0;i<=columns;i++){const t=j/rows,a=open+(Math.PI*2-open*2)*i/columns,r=.24+t*.15;pos.push(Math.sin(a)*r,.44-t*length,Math.cos(a)*r*.65+.015*Math.sin(i*1.7)*t);}
   for(let j=0;j<rows;j++)for(let i=0;i<columns;i++){const a=j*(columns+1)+i,b=a+1,c=a+columns+1,d=c+1;indices.push(a,c,b,b,c,d);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(indices);g.computeVertexNormals();return g;
  });const mesh=this.mesh(p,g,color);const base=this.material(color) as T.MeshToonMaterial;if(base.side!==T.DoubleSide){const mat=base.clone();mat.side=T.DoubleSide;mesh.material=mat;}return mesh;
 }
}
const factories=new WeakMap<object,AnimeShapes>();
export function animeShapes(owner:object){let f=factories.get(owner);if(!f){f=new AnimeShapes();factories.set(owner,f);}return f;}

/** Bake only static siblings; each animated joint, eye and attachment remains independent. */
export function mergeJointSurfaces(root:T.Object3D){
 const parents:T.Object3D[]=[];root.traverse(o=>parents.push(o));
 for(const parent of parents){
  const groups=new Map<T.Material,T.Mesh[]>();for(const child of parent.children)if(child instanceof T.Mesh&&!Array.isArray(child.material)){const group=groups.get(child.material)??[];group.push(child);groups.set(child.material,group);}
  for(const [material,meshes] of groups){if(meshes.length<2)continue;const parts=meshes.map(m=>{m.updateMatrix();const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();if(!g.attributes.uv)g.setAttribute('uv',new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count*2),2));return g.applyMatrix4(m.matrix);});
   const geometry=mergeGeometries(parts);for(const part of parts)part.dispose();if(!geometry)throw new Error('Character surfaces have incompatible geometry');for(const mesh of meshes)parent.remove(mesh);parent.add(new T.Mesh(geometry,material));
  }
 }
}
