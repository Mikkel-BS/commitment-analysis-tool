import { readFile } from 'node:fs/promises';
const dir=new URL('../data/',import.meta.url); const read=async n=>JSON.parse(await readFile(new URL(n,dir),'utf8'));
const [claims,rules,positions,sources]=await Promise.all(['claims.json','rules.json','positions.json','sources.json'].map(read));
const schema=await read('schema.json');
// Enforce all keywords used by this repository's schema; not a general JSON Schema library.
const supported=new Set(['$ref','type','required','properties','additionalProperties','pattern','minLength','enum','const','items','prefixItems','minItems','maxItems','uniqueItems','oneOf']);
function check(value,s,path) {
  if(s.$ref) return check(value,schema.$defs[s.$ref.split('/').at(-1)],path);
  for(const key of Object.keys(s)) if(!supported.has(key)) throw Error(`Unsupported schema keyword: ${key}`);
  if(s.oneOf) { const matches=s.oneOf.filter(option=>check(value,option,path).length===0); return matches.length===1?[]:[`${path}: oneOf mismatch`]; }
  const errors=[]; const bad=m=>errors.push(`${path}: ${m}`);
  if(s.enum&&!s.enum.includes(value)) bad('enum');
  if(Object.hasOwn(s,'const')&&value!==s.const) bad('const');
  const type=Array.isArray(value)?'array':value===null?'null':typeof value;
  if(s.type&&type!==s.type) return [...errors,`${path}: expected ${s.type}`];
  if(type==='string') { if(s.minLength&&value.length<s.minLength) bad('short string'); if(s.pattern&&!new RegExp(s.pattern).test(value)) bad('pattern'); }
  if(type==='array') {
    if(s.minItems&&value.length<s.minItems) bad('too few items'); if(s.maxItems&&value.length>s.maxItems) bad('too many items');
    if(s.uniqueItems&&new Set(value.map(x=>JSON.stringify(x))).size!==value.length) bad('duplicate items');
    value.forEach((x,i)=>{const sub=s.prefixItems?.[i]||s.items;if(sub)errors.push(...check(x,sub,`${path}[${i}]`));});
  }
  if(type==='object') {
    for(const k of s.required||[]) if(!Object.hasOwn(value,k)) bad(`missing ${k}`);
    for(const [k,v] of Object.entries(value)) { if(s.properties?.[k]) errors.push(...check(v,s.properties[k],`${path}.${k}`)); else if(s.additionalProperties===false) bad(`unknown ${k}`); }
  }
  return errors;
}
const fail=[]; const unique=(arr,label)=>{const seen=new Set;for(const x of arr){if(seen.has(x.id))fail.push(`Duplicate ${label} id: ${x.id}`);seen.add(x.id)}return seen};
const claimIds=unique(claims,'claim'), sourceIds=unique(sources,'source'); unique(rules,'rule');unique(positions,'position');
for(const c of claims) fail.push(...check(c,schema.$defs.claim,c.id));
for(const r of rules) {
  fail.push(...check(r,schema.$defs.rule,r.id));
  if(r.strength==='deductive'&&r.assessment.inference==='not-established')fail.push(`${r.id}: unestablished deduction`);
  if(r.strength==='dialectical'&&r.assessment.inference!=='not-established')fail.push(`${r.id}: dialectical validity mismatch`);
  for(const c of r.citations) if(!r.sources.includes(c.source))fail.push(`${r.id}: unlinked citation`);
  for(const id of r.sources) if(!r.citations.some(c=>c.source===id))fail.push(`${r.id}: source lacks locator`);
  for(const o of r.objectionTargets||[]) if(!r.premises.some(p=>p.claim===o.target))fail.push(`${r.id}: objection target is not a premise`);
  if(r.assessment.inference==='truth-table-checked'&&!r.formalization)fail.push(`${r.id}: missing formalization`);
}
const literals=[];rules.forEach(r=>literals.push(...r.premises,...(r.conclusion?[r.conclusion]:[]),...(r.target?[r.target]:[])));
literals.forEach(l=>{if(!claimIds.has(l.claim))fail.push(`Unknown claim reference: ${l.claim}`);if(!['affirm','deny'].includes(l.polarity))fail.push(`Bad polarity: ${l.polarity}`)});
[...claims,...rules].forEach(x=>x.sources.forEach(s=>{if(!sourceIds.has(s))fail.push(`${x.id} references unknown source ${s}`)}));
rules.forEach(r=>{if(r.kind==='tension'&&r.strength!=='dialectical')fail.push(`${r.id}: tension must be dialectical`);if(r.strength==='dialectical'&&r.conclusion)fail.push(`${r.id}: dialectical rule must not derive a conclusion`);if(r.kind==='entails'&&!r.conclusion)fail.push(`${r.id}: entailment needs a conclusion`);});
positions.forEach(p=>Object.entries(p.selections).forEach(([id,v])=>{if(!claimIds.has(id))fail.push(`${p.id}: unknown claim ${id}`);if(!['affirm','deny'].includes(v))fail.push(`${p.id}: bad selection ${v}`)}));
for(const s of sources){try{new URL(s.url)}catch{fail.push(`${s.id}: invalid URL`)}}
if(fail.length){console.error(fail.join('\n'));process.exit(1)}
console.log(`Validated ${claims.length} claims, ${rules.length} rules, ${positions.length} positions, and ${sources.length} sources.`);
