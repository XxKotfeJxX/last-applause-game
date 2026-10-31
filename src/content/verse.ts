import game from '../../content/locales/uk/game.json';
import ui from '../../content/locales/uk/ui.json';
/** Stable authored lines, never generated at runtime. Fragments are composed by authored parent poems. */
const catalog:Record<string,string>={...game,...ui};
export function verse(id:string,params:Record<string,string|number>={}):string{
  const text=catalog[id];if(text===undefined)throw new Error(`Missing verse: ${id}`);
  return text.replace(/\{(\w+)\}/g,(_,key:string)=>String(params[key]??`{${key}}`));
}
