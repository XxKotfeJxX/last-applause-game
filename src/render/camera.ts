import * as T from 'three';
export const DEFAULT_BEARING=Math.atan2(16,24);
export function shortestAngle(from:number,to:number){return Math.atan2(Math.sin(to-from),Math.cos(to-from));}
/** Both ends follow one smoothed point: walking never changes the camera's bearing. */
export class CameraRig{
 readonly target=new T.Vector3();bearing=DEFAULT_BEARING;private desired=DEFAULT_BEARING;private ready=false;
 rotate(steps:number){this.desired+=steps*Math.PI/4;}
 reset(){this.desired=DEFAULT_BEARING;this.ready=false;}
 update(camera:T.OrthographicCamera,point:T.Vector3,dt:number){
  const blend=1-Math.exp(-Math.max(0,dt)/130);
  if(!this.ready||this.target.distanceTo(point)>6){this.target.copy(point);this.ready=true;}else this.target.lerp(point,blend);
  this.bearing+=shortestAngle(this.bearing,this.desired)*blend;
  camera.position.copy(this.target).add(new T.Vector3(Math.sin(this.bearing)*29,29,Math.cos(this.bearing)*29));
  camera.lookAt(this.target);camera.updateMatrixWorld();
 }
 movement(dx:number,dz:number){const c=Math.cos(this.bearing),s=Math.sin(this.bearing);return{x:dx*c+dz*s,z:-dx*s+dz*c};}
}
/** Only blockers between the eye and hero/path are cut away; geometry behind stays opaque. */
export function blocksView(box:T.Box3,eye:T.Vector3,focus:T.Vector3){
 const hit=new T.Vector3(),right=new T.Vector3(eye.z-focus.z,0,focus.x-eye.x).normalize();
 for(const y of [.2,1.15,1.8])for(const side of [-.65,0,.65]){
  const end=focus.clone().addScaledVector(right,side).add(new T.Vector3(0,y,0)),direction=end.clone().sub(eye),length=direction.length();
  const ray=new T.Ray(eye,direction.normalize());
  if(ray.intersectBox(box,hit)&&eye.distanceTo(hit)<length-.12)return true;
 }
 return false;
}
