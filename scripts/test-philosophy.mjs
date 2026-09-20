import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {analyze,newState} from '../areas.js';
const rules=JSON.parse(await readFile(new URL('../data/rules.json',import.meta.url),'utf8'));
const run=selections=>analyze('philosophy',rules,{...newState(),selections});
for(const rule of rules) {
  test(`${rule.id}: full trigger and every omitted/opposed premise`,()=>{
    const selections=Object.fromEntries(rule.premises.map(p=>[p.claim,p.polarity]));
    const before=structuredClone(selections);
    assert.ok(run(selections).some(r=>r.id===rule.id&&r.resultType!=='incomplete'));
    assert.deepEqual(selections,before);
    for(const p of rule.premises) for(const value of [undefined,p.polarity==='affirm'?'deny':'affirm']) {
      const changed={...selections}; if(value)changed[p.claim]=value;else delete changed[p.claim];
      assert.ok(!run(changed).some(r=>r.id===rule.id&&r.resultType!=='incomplete'));
    }
  });
}
test('middle knowledge never derives actual or possible free actions',()=>{
  for(const extra of [{},{'POSSIBLE-LIBERTARIAN':'deny'},{LIBERTARIAN:'deny'}]) {
    const findings=run({'MIDDLE-KNOWLEDGE':'affirm',...extra});
    assert.ok(!findings.some(r=>r.conclusion?.claim==='LIBERTARIAN'||r.conclusion?.claim==='POSSIBLE-LIBERTARIAN'));
  }
});
test('hiddenness formula matches claim bindings and passes exhaustive truth table',()=>{
  const r=rules.find(r=>r.id==='R-HIDDENNESS'), f=r.formalization;
  assert.deepEqual(f.atoms,{G:'LOVING-GOD',N:'NONRESISTANT-NONBELIEF'});
  assert.deepEqual(r.premises,[{claim:'HIDDENNESS-BRIDGE',polarity:'affirm'},{claim:f.atoms.N,polarity:'affirm'}]);
  assert.deepEqual(r.conclusion,{claim:f.atoms.G,polarity:'deny'});
  assert.deepEqual(f.premises,[['implies','G',['not','N']],'N']);
  const evaluate=(x,v)=>typeof x==='string'?v[x]:x[0]==='not'?!evaluate(x[1],v):!evaluate(x[1],v)||evaluate(x[2],v);
  let satisfying=0;
  for(const G of [false,true])for(const N of [false,true])if(f.premises.every(x=>evaluate(x,{G,N}))) {
    satisfying++;assert.equal(evaluate(f.conclusion,{G,N}),true);
  }
  assert.equal(satisfying,1); // Non-vacuous validity check.
});
test('all 27 hiddenness selection states preserve unknown, denial and conditional conflict',()=>{
  for(const g of [undefined,'affirm','deny'])for(const n of [undefined,'affirm','deny'])for(const b of [undefined,'affirm','deny']) {
    const selections=Object.fromEntries([['LOVING-GOD',g],['NONRESISTANT-NONBELIEF',n],['HIDDENNESS-BRIDGE',b]].filter(([,v])=>v));
    const finding=run(selections).find(r=>r.id==='R-HIDDENNESS');
    if(n==='affirm'&&b==='affirm')assert.equal(finding.resultType,g==='affirm'?'conflict':'consequence');
    else if(g||n||b)assert.equal(finding.resultType,'incomplete');else assert.equal(finding,undefined);
  }
});
test('simplicity requires necessary existence; creative alternatives need their effect bridge',()=>{
  assert.ok(!run({SIMPLE:'affirm','CONTINGENT-CREATION':'affirm'}).some(r=>r.id==='R-SIMPLICITY-CREATION'));
  assert.ok(!run({'DIVINE-FREEDOM':'affirm','DIVINE-PAP':'affirm'}).some(r=>r.id==='R-DIVINE-FREEDOM-ALT'));
});
test('dialectical arguments never return contradictions or conclusions',()=>{
  for(const r of rules.filter(r=>r.strength==='dialectical')) {
    const f=run(Object.fromEntries(r.premises.map(p=>[p.claim,p.polarity]))).find(f=>f.id===r.id);
    assert.equal(f.resultType,'tension');assert.equal(f.conclusion,undefined);
  }
});
