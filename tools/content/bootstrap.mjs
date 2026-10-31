import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
const root=process.cwd();
const read=async p=>JSON.parse(await readFile(join(root,p),'utf8'));
for(const character of (await read('content/characters/characters.json')).characters){
  const slug=character.visualId.split('.').at(-1),dir=join(root,'public','assets','characters',slug);await mkdir(dir,{recursive:true});
  const clips={idle:[4,4,true],walk:[6,8,true],talk:[4,6,true],interact:[6,8,false],react:[4,8,false],perform:[8,8,true]};
  const meta={schemaVersion:1,id:character.visualId,kind:'character',renderMode:'uprightBillboard',worldHeight:2,frame:{width:128,height:192,anchorPx:[64,176]},directions:['south','west','east','north'],clips:Object.fromEntries(Object.entries(clips).map(([id,[frameCount,fps,loop]])=>[id,{file:`${id}.png`,frameCount,fps,loop}])),defaultSocketsPx:{handRight:[94,112],handLeft:[34,112],head:[64,38]},fallback:'procedural.character',placeholderStyle:{bodyColor:character.color,accentColor:character.accent,silhouette:'coat'}};
  try{await readFile(join(dir,'asset.meta.json'));}catch{await writeFile(join(dir,'asset.meta.json'),JSON.stringify(meta,null,2)+'\n');}
}
for(const item of (await read('content/items/items.json')).items){
  const slug=item.visualId.split('.').at(-1),dir=join(root,'public','assets','items',slug);await mkdir(dir,{recursive:true});
  const meta={schemaVersion:1,id:item.visualId,kind:'item',renderMode:'uprightBillboard',worldSize:item.carryClass==='large'?[1.4,2.1]:[.8,.8],frame:{width:128,height:128,anchorPx:[64,118]},files:{world:'world.png',icon:'icon.png'},fallback:'procedural.item'};
  try{await readFile(join(dir,'asset.meta.json'));}catch{await writeFile(join(dir,'asset.meta.json'),JSON.stringify(meta,null,2)+'\n');}
}
console.log('Metadata packages created without overwriting existing files.');
