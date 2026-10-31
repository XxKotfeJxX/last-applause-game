import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
const root=process.cwd(),errors=[];
const read=async p=>JSON.parse(await readFile(join(root,p),'utf8'));
const areas=(await read('content/areas/world.json'));
const chars=(await read('content/characters/characters.json')).characters;
const items=(await read('content/items/items.json')).items;
const actsData=await read('content/acts/acts.json'),acts=actsData.acts;
const pack=await read('content/packs/base.json');
const lines=(await read('content/dialogues/dialogues.json')).lines;
const profiles=(await read('content/speech/profiles.json')).profiles;
const speechIds=new Set(profiles.map(p=>p.id));
const all=[...areas.areas,...areas.interactables,...chars,...items,...acts,...lines];
const ids=new Set();for(const x of all){if(!x.id||ids.has(x.id))errors.push(`ID duplicate or missing: ${x.id}`);ids.add(x.id);}
const areaIds=new Set(areas.areas.map(x=>x.id)),nodeIds=new Set(areas.nodes.map(x=>x.id)),actorIds=new Set(chars.map(x=>x.id)),actIds=new Set(acts.map(x=>x.id)),itemIds=new Set(items.map(x=>x.id)),stationIds=new Set(areas.interactables.map(x=>x.id));
for(const n of areas.nodes)if(!areaIds.has(n.area))errors.push(`content/areas/world.json ${n.id}.area: unknown ${n.area}`);
for(const c of areas.corridors)if(!areaIds.has(c.a)||!areaIds.has(c.b))errors.push(`content/areas/world.json corridor: unknown area`);
for(const [a,b] of areas.edges)if(!nodeIds.has(a)||!nodeIds.has(b))errors.push(`content/areas/world.json edge: ${a},${b}: unknown node`);
for(const t of areas.interactables)if(!areaIds.has(t.area))errors.push(`content/areas/world.json ${t.id}.area: unknown ${t.area}`);
for(const c of chars){if(!speechIds.has(c.speechProfileId))errors.push(`${c.id}: unknown speech profile ${c.speechProfileId}`);if(!nodeIds.has(c.start))errors.push(`content/characters/characters.json ${c.id}.start: unknown node`);for(const n of c.patrol)if(!nodeIds.has(n))errors.push(`content/characters/characters.json ${c.id}.patrol: unknown ${n}`);for(const id of c.actIds)if(!actIds.has(id))errors.push(`content/characters/characters.json ${c.id}.actIds: unknown ${id}`);}
for(const i of items){if(!areaIds.has(i.startArea))errors.push(`content/items/items.json ${i.id}.startArea: unknown ${i.startArea}`);if(!i.capabilities?.length)errors.push(`content/items/items.json ${i.id}.capabilities: empty`);}
for(const a of acts){if(!actorIds.has(a.actorId))errors.push(`content/acts/acts.json ${a.id}.actorId: unknown ${a.actorId}`);if(!stationIds.has(a.prepStation))errors.push(`content/acts/acts.json ${a.id}.prepStation: unknown ${a.prepStation}`);if(a.cueLabels?.length!==2)errors.push(`content/acts/acts.json ${a.id}.cueLabels: expected two cues`);}
for(const id of actsData.initialOrder)if(!actIds.has(id))errors.push(`content/acts/acts.json initialOrder: unknown ${id}`);
if(new Set(actsData.initialOrder).size!==3)errors.push('content/acts/acts.json initialOrder: exactly three unique acts required');
if(JSON.stringify(actsData.enabledScenarios)!==JSON.stringify(['scenario.wheel']))errors.push('content/acts/acts.json enabledScenarios: only scenario.wheel is implemented');
for(const [role,id] of Object.entries(pack.roles))if(!itemIds.has(id)&&!actorIds.has(id))errors.push(`content/packs/base.json ${role}: unknown ${id}`);
for(const [role,required] of Object.entries({'role.stage_double':['capability.human_silhouette','capability.wear_costume','capability.mount_on_wheel'],'role.safe_projectiles':['capability.safe_projectiles'],'role.live_projectiles':['capability.live_projectiles'],'role.hero_mask':['capability.identity_mask'],'role.costume':['capability.costume'],'role.stage_blood':['capability.stage_blood']})){
  const bound=items.find(x=>x.id===pack.roles[role]);if(!bound)continue;for(const capability of required)if(!bound.capabilities.includes(capability))errors.push(`content/packs/base.json ${role}: ${bound.id} lacks ${capability}`);
}
const knownFacts=new Set([...acts.map(a=>a.fact),'fact.vision','fact.cabinet_seen','fact.hidden_passage','fact.blackout','fact.knife_inspection','fact.safe_issued']);
for(const d of lines){if(!actorIds.has(d.actorId))errors.push(`content/dialogues/dialogues.json ${d.id}.actorId: unknown ${d.actorId}`);if(d.requiresFact&&!knownFacts.has(d.requiresFact))errors.push(`content/dialogues/dialogues.json ${d.id}.requiresFact: unknown ${d.requiresFact}`);if(!d.text?.trim())errors.push(`content/dialogues/dialogues.json ${d.id}.text: empty`);}
const graph=new Map(areas.nodes.map(n=>[n.id,new Set()]));for(const [a,b] of areas.edges){graph.get(a)?.add(b);graph.get(b)?.add(a);}const seen=new Set(['arena']),q=['arena'];while(q.length)for(const n of graph.get(q.shift())??[])if(!seen.has(n)){seen.add(n);q.push(n);}if(seen.size!==areas.nodes.length)errors.push('content/areas/world.json: navigation graph is disconnected');
const visualIds=new Set(),environmentIds=new Set();for(const kind of ['characters','items','environment']){
  let folders=[];try{folders=await readdir(join(root,'public','assets',kind),{withFileTypes:true});}catch{continue;}
  for(const dir of folders){if(!dir.isDirectory())continue;const meta=await read(`public/assets/${kind}/${dir.name}/asset.meta.json`);visualIds.add(meta.id);if(kind==='environment')environmentIds.add(meta.id);}
}
for(const def of [...chars,...items])if(!visualIds.has(def.visualId))errors.push(`${def.id}.visualId: missing package ${def.visualId}`);
if(!visualIds.has('visual.character.hero'))errors.push('visual.character.hero: missing package for player');
const scenery=await read('content/areas/scenography.json');
if(scenery.schemaVersion!==1)errors.push('content/areas/scenography.json: invalid schemaVersion');
for(const area of areas.areas)if(!scenery.areas?.[area.id])errors.push(`content/areas/scenography.json: missing style for ${area.id}`);
for(const [id,style] of Object.entries(scenery.areas??{})){
  if(!areaIds.has(id))errors.push(`content/areas/scenography.json: unknown area ${id}`);
  if(!environmentIds.has(style.wallVisualId))errors.push(`content/areas/scenography.json ${id}: missing wall ${style.wallVisualId}`);
  if(!environmentIds.has(style.visualId))errors.push(`content/areas/scenography.json ${id}: missing environment ${style.visualId}`);
  for(const color of ['wallColor','trimColor','accentColor'])if(!/^#[0-9a-f]{6}$/i.test(style[color]??''))errors.push(`content/areas/scenography.json ${id}.${color}: invalid color`);
}
for(const [station,visual] of Object.entries(scenery.fixtures??{}))if(!stationIds.has(station)||!environmentIds.has(visual))errors.push(`Unknown fixture binding: ${station} / ${visual}`);
for(const name of ['game','ui'])for(const [id,text] of Object.entries(await read(`content/locales/uk/${name}.json`)))if(!id.startsWith(name+'.')||typeof text!=='string'||!text.trim())errors.push(`Invalid verse ${id}`);
if(errors.length){for(const e of errors)console.error(e);process.exitCode=1;}else console.log(`Content valid: ${chars.length} NPC, ${items.length} items, ${acts.length} acts, ${areas.areas.length} areas, ${lines.length} dialogue lines.`);
