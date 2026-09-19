import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { analyze, newState, normalizeClaims, restoreURL, shareURL } from '../areas.js';
const read = async path => JSON.parse(await readFile(new URL('../' + path, import.meta.url), 'utf8'));
const [philosophyClaims, philosophyRules, norwayClaims, norwayRules, scenarios] = await Promise.all([
  'data/claims.json','data/rules.json','data/norway/claims.json','data/norway/rules.json','data/norway/scenarios.json'
].map(read));
const datasets = {philosophy:{claims:philosophyClaims},norway:{claims:norwayClaims}};
const base = 'https://example.org/commitment-analysis-tool/';

test('area sessions have independent collections and filters', () => {
  const a = newState(), b = newState(); a.selections['OMNI-K']='affirm'; a.context.actor='Actor'; a.expanded.add('OMNI-K');
  assert.deepEqual(b.selections,{}); assert.deepEqual(b.context,{}); assert.equal(b.expanded.size,0);
});
test('Norwegian normalization preserves qualifications and assumption types', () => {
  const normalized = normalizeClaims('norway',norwayClaims);
  assert.equal(normalized.length,28);
  assert.ok(normalized.every(c => c.title && c.category && c.description && c.tags.length));
  assert.equal(normalized.find(c => c.id==='NO-GRID-SHORT').type,'assumption');
  assert.deepEqual(normalizeClaims('philosophy',philosophyClaims),philosophyClaims);
});
test('legacy philosophy query links still restore, ignoring foreign and invalid claims', () => {
  const result = restoreURL(base+'?FOREKNOWLEDGE=a&OMNI-K=garbage&NO-TAX-CUT=a',datasets);
  assert.equal(result.area,'philosophy'); assert.deepEqual(result.state.selections,{FOREKNOWLEDGE:'affirm'});
});
test('Norwegian share links preserve Unicode context without query parameters', () => {
  const state = newState(); state.selections={'NO-TAX-CUT':'affirm','NO-GRID-REMEDY':'deny'};
  state.context={actor:'Øst & Vest',baseline:'Årsbudsjett <2027>',period:'2027–2030'}; state.scopeConfirmed=true;
  const link = shareURL(base+'?old=private#old','norway',state), url = new URL(link);
  assert.equal(url.search,''); assert.ok(url.hash.startsWith('#map=')); assert.equal(url.pathname,'/commitment-analysis-tool/');
  const restored = restoreURL(link,datasets);
  assert.equal(restored.area,'norway'); assert.deepEqual(restored.state.selections,state.selections);
  assert.deepEqual(restored.state.context,state.context); assert.equal(restored.state.scopeConfirmed,false);
});
test('malformed and unknown-area links fail closed', () => {
  for (const tail of ['#map=%broken','#map=null','#map='+encodeURIComponent('{"v":2,"area":"norway"}'),'?area=unknown']) {
    const r=restoreURL(base+tail,datasets); assert.ok(r.error); assert.deepEqual(r.state.selections,{});
  }
});
test('unavailable area falls back without losing the usable area', () => {
  const onlyNorway={norway:datasets.norway};
  assert.equal(restoreURL(base,onlyNorway).area,'norway');
  assert.equal(restoreURL(base+'#map=bad',onlyNorway).area,'norway');
});
test('shared input cannot import foreign IDs, unknown fields or scope confirmation', () => {
  const payload={v:1,area:'norway',selections:{'OMNI-K':'affirm','NO-TAX-CUT':'affirm','NO-SPEND-UP':'false'},context:{actor:'x'.repeat(1000),unknown:'x'},scopeConfirmed:true};
  const r=restoreURL(base+'#map='+encodeURIComponent(JSON.stringify(payload)),datasets);
  assert.deepEqual(r.state.selections,{'NO-TAX-CUT':'affirm'}); assert.deepEqual(Object.keys(r.state.context),['actor']);
  assert.equal(r.state.context.actor.length,300); assert.equal(r.state.scopeConfirmed,false);
});
test('policy findings require complete context and explicit common-scope confirmation', () => {
  const example=scenarios.find(s=>s.id==='CASE-FISCAL-GAP');
  const state={...newState(),selections:example.selections,context:example.context};
  assert.equal(analyze('norway',norwayRules,state)[0].resultType,'incomplete');
  state.scopeConfirmed=true;
  assert.equal(analyze('norway',norwayRules,state)[0].resultType,'conditional');
  state.context={...state.context,baseline:''};
  assert.equal(analyze('norway',norwayRules,state)[0].resultType,'incomplete');
});
test('all policy example expectations survive adapter; unknown is not denied', () => {
  for(const s of scenarios) {
    const state={...newState(),selections:{...s.selections},context:s.context,scopeConfirmed:true};
    const original=structuredClone(state.selections);
    assert.deepEqual(analyze('norway',norwayRules,state).filter(r=>r.resultType==='conditional').map(r=>r.id).sort(),s.expected.slice().sort());
    assert.deepEqual(state.selections,original);
  }
});
test('philosophy consequences distinguish opposed selections and do not mutate beliefs', () => {
  const state=newState(); state.selections={FOREKNOWLEDGE:'affirm'};
  assert.equal(analyze('philosophy',philosophyRules,state).find(r=>r.id==='R-FUTURE-KNOWLEDGE').resultType,'consequence');
  assert.deepEqual(state.selections,{FOREKNOWLEDGE:'affirm'});
  state.selections['FUTURE-TRUTH']='deny';
  assert.equal(analyze('philosophy',philosophyRules,state).find(r=>r.id==='R-FUTURE-KNOWLEDGE').resultType,'conflict');
});
test('philosophy tension never turns into a deduction', () => {
  const state=newState();
  for(const id of ['FOREKNOWLEDGE','PAST-FIXITY','TRANSFER-N','PAP','LIBERTARIAN']) state.selections[id]='affirm';
  const result=analyze('philosophy',philosophyRules,state).find(r=>r.id==='R-FATALISM');
  assert.equal(result.kind,'tension'); assert.equal(result.resultType,'conflict'); assert.equal(result.conclusion,undefined);
});
