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
