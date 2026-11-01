import * as T from 'three';
import { ModelFactory } from './models';
import type { ItemDef } from '../content';
/** Render the very same meshes as the world; no unrelated inventory placeholder icons. */
export class ItemIcons{
 private renderer:T.WebGLRenderer|null=null;private factory=new ModelFactory();private cache=new Map<string,string>();
 icon(def:ItemDef):string{
  const key=def.visualId+':'+def.modelId,found=this.cache.get(key);if(found)return found;
  this.renderer??=new T.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});const r=this.renderer;r.setSize(192,192);r.setClearColor(0,0);r.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene(),model=this.factory.item(def);scene.add(model);scene.add(new T.HemisphereLight('#fff0d0','#302d3a',2.6));const lamp=new T.DirectionalLight('#ffffff',3);lamp.position.set(-3,5,4);scene.add(lamp);
  const box=new T.Box3().setFromObject(model),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3()),half=Math.max(size.x,size.y,size.z)*.68;
  const camera=new T.OrthographicCamera(-half,half,half,-half,.01,40);camera.position.copy(center).add(new T.Vector3(2.5,1.7,5));camera.lookAt(center);r.render(scene,camera);const url=r.domElement.toDataURL('image/png');this.cache.set(key,url);return url;
 }
}
