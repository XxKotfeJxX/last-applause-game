import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
const root=join(process.cwd(),'public','assets'),errors=[],warnings=[];
const requireFinal=process.argv.includes('--require-final');
function pngDimensions(data){if(data.length<24||data.toString('hex',0,8)!=='89504e470d0a1a0a')throw new Error('PNG signature/IHDR missing');return[data.readUInt32BE(16),data.readUInt32BE(20)];}
for(const kind of ['characters','items','environment','ui','audio']){
  let dirs=[];try{dirs=await readdir(join(root,kind),{withFileTypes:true});}catch{continue;}
  for(const dir of dirs.filter(x=>x.isDirectory())){
    const path=join(root,kind,dir.name);let meta;
    try{meta=JSON.parse(await readFile(join(path,'asset.meta.json'),'utf8'));}catch(e){errors.push(`${path}/asset.meta.json: ${e.message}`);continue;}
    if(meta.schemaVersion!==1||!meta.id||meta.kind!==kind.replace(/s$/,''))errors.push(`${path}/asset.meta.json: schemaVersion/id/kind invalid`);
    const frame=meta.frame;if(frame&&(!Number.isInteger(frame.width)||!Number.isInteger(frame.height)||frame.width<=0||frame.height<=0||frame.anchorPx?.[0]<0||frame.anchorPx?.[0]>=frame.width||frame.anchorPx?.[1]<0||frame.anchorPx?.[1]>=frame.height))errors.push(`${path}: invalid frame or anchor`);
    if(meta.kind==='character'&&JSON.stringify(meta.directions)!==JSON.stringify(['south','west','east','north']))errors.push(`${path}: directions must be south,west,east,north`);
    const files=meta.kind==='character'?Object.fromEntries(Object.entries(meta.clips??{}).map(([key,c])=>[key,c.file])):meta.files??{};
    if(meta.kind==='character')for(const [key,clip] of Object.entries(meta.clips??{}))if(!Number.isInteger(clip.frameCount)||clip.frameCount<=0||!(clip.fps>0))errors.push(`${path}: clips.${key} frameCount/fps invalid`);
    for(const [slot,file] of Object.entries(files)){
      if(typeof file!=='string'||file.includes('..')||file.includes('\\')||file.startsWith('/')){errors.push(`${path}: unsafe file for ${slot}`);continue;}
      let data;try{data=await readFile(join(path,file));}catch{warnings.push(`${meta.id}.${slot}: final file missing; procedural fallback`);continue;}
      if(file.endsWith('.png'))try{const [w,h]=pngDimensions(data);const expectedW=meta.kind==='character'?frame.width*meta.clips[slot].frameCount:frame.width;const expectedH=meta.kind==='character'?frame.height*4:frame.height;if(w!==expectedW||h!==expectedH)errors.push(`${path}/${file}: ${w}x${h}; expected ${expectedW}x${expectedH}`);}catch(e){errors.push(`${path}/${file}: ${e.message}`);}
    }
  }
}
for(const e of errors)console.error('ERROR',e);for(const w of warnings)console.warn('WARN',w);
console.log(`Assets: ${errors.length} errors, ${warnings.length} placeholder slots.`);
if(errors.length||(requireFinal&&warnings.length))process.exitCode=1;
