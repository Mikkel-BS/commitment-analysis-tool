import { readFile } from 'node:fs/promises';
const dir=new URL('../data/',import.meta.url); const read=async n=>JSON.parse(await readFile(new URL(n,dir),'utf8'));
const [claims,rules,positions,sources]=await Promise.all(['claims.json','rules.json','positions.json','sources.json'].map(read));
const fail=[]; const unique=(arr,label)=>{const seen=new Set;for(const x of arr){if(seen.has(x.id))fail.push(`Duplicate ${label} id: ${x.id}`);seen.add(x.id)}return seen};
const claimIds=unique(claims,'claim'), sourceIds=unique(sources,'source'); unique(rules,'rule');unique(positions,'position');
const literals=[];rules.forEach(r=>literals.push(...r.premises,...(r.conclusion?[r.conclusion]:[]),...(r.target?[r.target]:[])));
literals.forEach(l=>{if(!claimIds.has(l.claim))fail.push(`Unknown claim reference: ${l.claim}`);if(!['affirm','deny'].includes(l.polarity))fail.push(`Bad polarity: ${l.polarity}`)});
[...claims,...rules].forEach(x=>x.sources.forEach(s=>{if(!sourceIds.has(s))fail.push(`${x.id} references unknown source ${s}`)}));
rules.forEach(r=>{if(r.strength==='deductive'&&['contested','interpretation-dependent'].includes(r.status))fail.push(`${r.id}: deductive rule cannot be ${r.status}`);if(r.kind==='tension'&&r.strength!=='dialectical')fail.push(`${r.id}: tension must be dialectical`);if(r.strength==='dialectical'&&r.conclusion)fail.push(`${r.id}: dialectical rule must not derive a conclusion`);if(r.kind==='entails'&&!r.conclusion)fail.push(`${r.id}: entailment needs a conclusion`);});
positions.forEach(p=>Object.entries(p.selections).forEach(([id,v])=>{if(!claimIds.has(id))fail.push(`${p.id}: unknown claim ${id}`);if(!['affirm','deny'].includes(v))fail.push(`${p.id}: bad selection ${v}`)}));
for(const s of sources){try{new URL(s.url)}catch{fail.push(`${s.id}: invalid URL`)}}
if(fail.length){console.error(fail.join('\n'));process.exit(1)}
console.log(`Validated ${claims.length} claims, ${rules.length} rules, ${positions.length} positions, and ${sources.length} sources.`);
