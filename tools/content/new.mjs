import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
const kind=process.argv[2],idIndex=process.argv.indexOf('--id'),id=process.argv[idIndex+1];
if(!['npc','item','act'].includes(kind)||!id?.startsWith(`${kind}.`)||!/^\w+\.[a-z][a-z0-9_-]*$/.test(id)){console.error(`Usage: npm run new:${kind||'item'} -- --id ${kind||'item'}.example`);process.exit(1);}
const slug=id.split('.')[1].replaceAll('_','-'),root=process.cwd();
const path=kind==='npc'?'content/characters/characters.json':kind==='item'?'content/items/items.json':'content/acts/acts.json';
const document=JSON.parse(await readFile(join(root,path),'utf8'));const list=kind==='npc'?document.characters:kind==='item'?document.items:document.acts;
if(list.some(x=>x.id===id)){console.error(`${id} already exists; no file changed.`);process.exit(1);}
let def,meta,assetPath;
if(kind==='npc'){
  def={id,name:'Новий артист',visualId:`visual.character.${slug}`,color:'#c9a678',accent:'#414251',start:'backstage',patrol:['backstage','arena'],roleIds:[],actIds:[]};
  assetPath=`public/assets/characters/${slug}`;meta={schemaVersion:1,id:def.visualId,kind:'character',renderMode:'uprightBillboard',worldHeight:2,frame:{width:128,height:192,anchorPx:[64,176]},directions:['south','west','east','north'],clips:{idle:{file:'idle.png',frameCount:4,fps:4,loop:true},walk:{file:'walk.png',frameCount:6,fps:8,loop:true},talk:{file:'talk.png',frameCount:4,fps:6,loop:true},interact:{file:'interact.png',frameCount:6,fps:8,loop:false},react:{file:'react.png',frameCount:4,fps:8,loop:false},perform:{file:'perform.png',frameCount:8,fps:8,loop:true}},defaultSocketsPx:{handRight:[94,112],handLeft:[34,112],head:[64,38]},fallback:'procedural.character'};
}else if(kind==='item'){
  def={id,name:'Новий предмет',visualId:`visual.item.${slug}`,capabilities:['capability.tool'],carryClass:'small',decayPolicy:'persistent',roleId:`role.${slug.replaceAll('-','_')}`,startArea:'zone.props',x:15,z:-10};
  assetPath=`public/assets/items/${slug}`;meta={schemaVersion:1,id:def.visualId,kind:'item',renderMode:'uprightBillboard',worldSize:[.8,.8],frame:{width:128,height:128,anchorPx:[64,118]},files:{world:'world.png',icon:'icon.png'},fallback:'procedural.item'};
}else def={id,name:'Новий номер',actorId:'npc.illusionist',prepStation:'station.workbench',prepKey:`${slug}Prepared`,cueLabels:['Перший сигнал','Другий сигнал'],fact:`fact.${slug.replaceAll('-','_')}`};
if(assetPath){try{await readFile(join(root,assetPath,'asset.meta.json'));console.error(`${assetPath} exists; no definition changed.`);process.exit(1);}catch{}}
list.push(def);await writeFile(join(root,path),JSON.stringify(document,null,2)+'\n');if(assetPath){await mkdir(join(root,assetPath),{recursive:true});await writeFile(join(root,assetPath,'asset.meta.json'),JSON.stringify(meta,null,2)+'\n');}
console.log(`${id} created. Add dialogue/roles and enable acts explicitly as needed.`);
