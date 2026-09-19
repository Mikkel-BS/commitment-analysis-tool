import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { evaluate } from './norway-engine.mjs';
const root = new URL('../data/norway/', import.meta.url);
const read = async name => JSON.parse(await readFile(new URL(name + '.json', root), 'utf8'));
const [claims, rules, sources, scenarios, manifest] = await Promise.all(['claims','rules','sources','scenarios','manifest'].map(read));
const values = ['affirm','deny','undecided'];
let tests = 0;
const check = (condition, message) => { tests++; assert.ok(condition, message); };
const text = value => typeof value === 'string' && value.trim().length > 0;
const date = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value));
function shape(object, fields, label) {
  check(object !== null && typeof object === 'object' && !Array.isArray(object), `${label}: object required`);
  assert.deepEqual(Object.keys(object).sort(), fields.split(' ').sort(), `${label}: missing or unexpected field`); tests++;
}
function ids(items, label) {
  check(Array.isArray(items) && items.length > 0, `${label}: nonempty array`);
  const keys = items.map(x => x.id);
  check(keys.every(x => /^[A-Z][A-Z0-9-]+$/.test(x)), `${label}: ID format`);
  check(new Set(keys).size === keys.length, `${label}: duplicate ID`);
  return new Set(keys);
}
function strings(items, label, nonempty = true) {
  check(Array.isArray(items) && (!nonempty || items.length > 0) && items.every(text), `${label}: strings required`);
  check(new Set(items).size === items.length, `${label}: duplicate value`);
}
const claimIds = ids(claims, 'claims'), ruleIds = ids(rules, 'rules'), sourceIds = ids(sources, 'sources'); ids(scenarios,'scenarios');
for (const s of sources) {
  shape(s, 'id publisher title url accessed locator supports doesNotEstablish review', s.id);
  for (const key of ['publisher','title','locator','supports','doesNotEstablish']) check(text(s[key]), `${s.id}.${key}`);
  check(new URL(s.url).protocol === 'https:', `${s.id}: HTTPS required`);
  check(date(s.accessed), `${s.id}: date`);
  check(s.review === 'passage-checked', `${s.id}: unreviewed source`);
}
for (const c of claims) {
  shape(c, 'id type area statement qualification sources', c.id);
  check(['policy','constraint','assumption'].includes(c.type), `${c.id}: type`);
  check(['finance','energy','climate','nature','municipal','delivery','petroleum'].includes(c.area), `${c.id}: area`);
  check(text(c.statement) && text(c.qualification), `${c.id}: wording`);
  strings(c.sources, `${c.id}: sources`, false);
  c.sources.forEach(id => check(sourceIds.has(id), `${c.id}: source ${id}`));
}
const scopeKeys = ['actor','period','baseline','budgetBoundary','project','location','deadline','emissionsBoundary'];
for (const r of rules) {
  shape(r, 'id title kind status premises scope explanation caveat alternatives evidenceNeeded sources sourceRole review', r.id);
  for (const key of ['title','explanation','caveat']) check(text(r[key]), `${r.id}.${key}`);
  const statuses = {'conditional-incompatibility':['accounting-identity','definitional'], 'unsupported-inference':['institutional','conceptual'], 'implementation-pressure':['scenario-dependent']};
  check(statuses[r.kind]?.includes(r.status), `${r.id}: kind/status mismatch`);
  check(r.review === 'editorial-reviewed', `${r.id}: review`);
  check(r.premises && !Array.isArray(r.premises) && Object.keys(r.premises).length >= 2, `${r.id}: premises`);
  for (const [id, value] of Object.entries(r.premises)) { check(claimIds.has(id), `${r.id}: claim ${id}`); check(values.slice(0,2).includes(value), `${r.id}: polarity`); }
  strings(r.scope, `${r.id}: scope`);
  r.scope.forEach(k => check(scopeKeys.includes(k), `${r.id}: scope key`));
  for (const k of ['actor','period','baseline']) check(r.scope.includes(k), `${r.id}: base scope`);
  strings(r.alternatives, `${r.id}: alternatives`); strings(r.evidenceNeeded, `${r.id}: evidence`); strings(r.sources, `${r.id}: sources`, false);
  r.sources.forEach(id => check(sourceIds.has(id), `${r.id}: source ${id}`));
  check(['institutional-background','direct-support','conceptual-background','editorial-definition'].includes(r.sourceRole), `${r.id}: source role`);
  check(r.sources.length > 0 || r.sourceRole === 'editorial-definition', `${r.id}: unsourced external claim`);
  const context = Object.fromEntries(r.scope.map(k => [k, 'synthetic-test-context']));
  const original = structuredClone(r.premises);
  assert.equal(evaluate([r], r.premises, context)[0]?.state, 'conditional-finding'); tests++;
  assert.deepEqual(r.premises, original); tests++;
  // Every premise must be necessary for activation, in both polarities.
  for (const [id, value] of Object.entries(r.premises)) {
    for (const replacement of [undefined,'undecided',value === 'affirm' ? 'deny' : 'affirm']) {
      const selection = {...r.premises};
      if (replacement === undefined) delete selection[id]; else selection[id] = replacement;
      assert.deepEqual(evaluate([r], selection, context), [], `${r.id}: false positive without ${id}`); tests++;
    }
  }
  for (const key of r.scope) {
    const incomplete = {...context}; delete incomplete[key];
    assert.equal(evaluate([r], r.premises, incomplete)[0]?.state, 'needs-context'); tests++;
  }
  const noisy = {...r.premises, 'UNRELATED': 'affirm'};
  assert.deepEqual(evaluate([r], noisy, context), evaluate([r], r.premises, context)); tests++;
}
for (const s of scenarios) {
  shape(s, 'id label synthetic context selections expected lesson', s.id);
  check(s.synthetic === true && text(s.label) && text(s.lesson), `${s.id}: attribution/wording`);
  for (const [id,value] of Object.entries(s.selections)) { check(claimIds.has(id), `${s.id}: claim ${id}`); check(values.includes(value), `${s.id}: selection`); }
  for (const [key,value] of Object.entries(s.context)) check(scopeKeys.includes(key) && text(value), `${s.id}: context`);
  strings(s.expected, `${s.id}: expected`, false); s.expected.forEach(id => check(ruleIds.has(id), `${s.id}: rule ${id}`));
  const findings = evaluate(rules, s.selections, s.context);
  check(findings.every(f => f.state === 'conditional-finding'), `${s.id}: incomplete scope`);
  assert.deepEqual(findings.map(f => f.rule).sort(), s.expected.slice().sort(), `${s.id}: regression`); tests++;
}
shape(manifest, 'id version language created status jurisdiction scope claimsAre partyAttributions sourceReview reviewDue reviewTriggers defaults requiredContext deferred privacy', 'manifest');
check(manifest.status === 'research-prototype' && manifest.language === 'nb-NO', 'manifest status/language');
check(date(manifest.created) && date(manifest.reviewDue) && manifest.reviewDue > manifest.created, 'manifest review dates');
check(manifest.partyAttributions.length === 0, 'Party attribution requires a new reviewed attribution schema');
assert.deepEqual(manifest.defaults, {selection:'undecided',deriveBeliefs:false,overallScore:false}); tests++;
assert.deepEqual(evaluate(rules, {}, {}), []); tests++;
console.log(`Norway: ${claims.length} claims, ${rules.length} rules, ${sources.length} sources, ${scenarios.length} scenarios; ${tests} checks passed.`);
