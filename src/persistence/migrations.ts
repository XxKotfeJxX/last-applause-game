import data from '../../content/migrations/saves.json';
export interface MigrationStep { from:number;to:number;aliases:Record<string,string> }
/** Exact ID aliases only; never rewrites prose, substrings or IDs from an unrelated pack. */
export function migrateSave(value:unknown,targetVersion:number,steps:MigrationStep[]=data.steps):unknown{
  const copy=structuredClone(value) as {contentVersion:number};const visited=new Set<number>();
  while(copy.contentVersion!==targetVersion){
    if(visited.has(copy.contentVersion))throw new Error('Save migration cycle');visited.add(copy.contentVersion);
    const step=steps.find(s=>s.from===copy.contentVersion&&s.to> s.from&&s.to<=targetVersion);
    if(!step)throw new Error('No save migration path');
    const alias=(text:string)=>step.aliases[text]??(text.startsWith('instance.')&&step.aliases[text.slice(9)]?`instance.${step.aliases[text.slice(9)]}`:text);
    const rewrite=(v:unknown):unknown=>typeof v==='string'?alias(v):Array.isArray(v)?v.map(rewrite):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[alias(k),rewrite(x)])):v;
    Object.assign(copy,rewrite(copy));copy.contentVersion=step.to;
  }
  return copy;
}
