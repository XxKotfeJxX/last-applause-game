import * as T from 'three';
/** Sample only the actual head/torso silhouette, never an area around the player or the feet. */
export function characterSightRays(camera:T.Camera,feet:T.Vector3){
 const direction=camera.getWorldDirection(new T.Vector3()),right=new T.Vector3().setFromMatrixColumn(camera.matrixWorld,0),rays:{ray:T.Ray;distance:number}[]=[];
 for(const [height,offset] of [[1.02,0],[1.35,-.12],[1.35,.12],[1.7,0],[1.85,0]]){
  const end=feet.clone().add(new T.Vector3(0,height,0)).addScaledVector(right,offset),near=(camera as T.OrthographicCamera).near??0,distance=Math.max(.05,end.clone().sub(camera.position).dot(direction)-near);
  // Orthographic rays are parallel. Rays from camera.position would incorrectly converge.
  rays.push({ray:new T.Ray(end.clone().addScaledVector(direction,-distance),direction.clone()),distance:distance-.04});
 }
 return rays;
}
export function occludesCharacter(meshes:T.Object3D[],rays:ReturnType<typeof characterSightRays>){
 const raycaster=new T.Raycaster();
 for(const {ray,distance} of rays){raycaster.ray.copy(ray);raycaster.near=0;raycaster.far=distance;if(raycaster.intersectObjects(meshes,true).length)return true;}
 return false;
}
/** Frame-rate independent fade, with a short release hold to avoid edge chatter. */
export class OcclusionFade{
 opacity=1;private clearMs=90;
 update(blocked:boolean,dt:number){
  const step=Math.min(100,Math.max(0,dt));this.clearMs=blocked?0:this.clearMs+step;
  const target=blocked||this.clearMs<90?.18:1,tau=target< this.opacity?95:155;
  this.opacity+=(target-this.opacity)*(1-Math.exp(-step/tau));
  if(Math.abs(this.opacity-target)<.001)this.opacity=target;
  return this.opacity;
 }
 reset(){this.opacity=1;this.clearMs=90;}
}
