import data from '../../content/rules/sets.json';
export const ruleSets=data.sets;
export function rulesFor(s:{ruleSetId?:string}){const rules=ruleSets.find(r=>r.id===(s.ruleSetId??data.defaultId));if(!rules)throw new Error('Unknown ruleset');return rules;}
