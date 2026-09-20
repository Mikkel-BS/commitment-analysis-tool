import { AREAS, CONTEXT, TYPES, KINDS, newState, normalizeClaims, analyze, shareURL, restoreURL } from './areas.js';
const $ = selector => document.querySelector(selector);
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sessions = {philosophy: newState(), norway: newState()};
const datasets = {};
let area = 'philosophy', toastTimer;
const state = () => sessions[area];
const dataset = () => datasets[area];
const policy = () => area === 'norway';
function toast(message) {
  $('#toast').textContent = message; $('#toast').classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'), 4000);
}
async function loadArea(id) {
  const config = AREAS[id];
  const values = await Promise.all(['claims','rules','sources',config.templates].map(async name => {
    const response = await fetch(`${config.base}${name}.json`);
    if (!response.ok) throw new Error(`Unable to load ${config.label}. Please reload to retry.`);
    return response.json();
  }));
  return {claims: normalizeClaims(id, values[0]), rules: values[1], sources: Object.fromEntries(values[2].map(s => [s.id, s])), templates: values[3]};
}
function sourcesHTML(ids) {
  if (!ids.length) return '<p>Editorial definition / Redaksjonell formulering.</p>';
  return ids.map(id => {
    const s = dataset().sources[id];
    if (!s) return '';
    return `<p><a href="${escape(s.url)}" target="_blank" rel="noreferrer">${escape(s.title)} ↗</a></p>${s.sourceRole ? `<p>${escape(s.sourceRole)} · ${escape(s.locator)} · Accessed ${escape(s.accessed)}</p>` : ''}${s.supports ? `<p>${escape(s.publisher)} · Checked ${escape(s.accessed)}<br>${escape(s.locator)}</p><p><strong>Supports:</strong> ${escape(s.supports)}</p><p><strong>Does not establish:</strong> ${escape(s.doesNotEstablish)}</p>` : ''}`;
  }).join('');
}
function filters() {
  const counts = new Map();
  for (const c of dataset().claims) counts.set(c.category, (counts.get(c.category) || 0) + 1);
  $('#category-filters').innerHTML = [['All', dataset().claims.length], ...counts].map(([name,count]) => `<button class="filter ${state().category === name ? 'active' : ''}" aria-pressed="${state().category === name}" data-category="${escape(name)}">${escape(name)}<span>${count}</span></button>`).join('');
}
function claimsView() {
  const s = state(), claims = dataset().claims;
  const visible = claims.filter(c => (s.category === 'All' || c.category === s.category) && `${c.id} ${c.title} ${c.statement} ${c.tags.join(' ')}`.toLowerCase().includes(s.search.toLowerCase()));
  $('#claim-count').textContent = `Showing ${visible.length} of ${claims.length} commitments`;
  $('#expand-all').textContent = s.expanded.size === claims.length ? 'Collapse all' : 'Expand all';
  $('#claims-list').innerHTML = visible.map(c => {
    const selected = s.selections[c.id] || 'undecided', expanded = s.expanded.has(c.id);
    return `<article class="claim-card ${expanded ? 'expanded' : ''}" lang="${policy() ? 'nb' : 'en'}">
      <div class="claim-top"><div><div class="claim-category">${escape(c.category)} · ${escape(c.id)}</div>
      ${policy() ? `<p class="claim-type">${escape(TYPES[c.type])}${c.type === 'assumption' ? ' · Ikke verifisert av verktøyet' : ''}</p>` : ''}
      <h3>${escape(c.title)}</h3>${policy() ? '' : `<p class="statement">${escape(c.statement)}</p>`}</div></div>
      <div class="choice-group" role="group" aria-label="${escape(c.title)}">${['affirm','deny','undecided'].map(v => `<button class="choice ${v} ${selected === v ? 'active' : ''}" aria-pressed="${selected === v}" data-id="${c.id}" data-value="${v}">${policy() ? ({affirm:'Bekreft',deny:'Avvis',undecided:'Uavklart'})[v] : ({affirm:'Affirm',deny:'Deny',undecided:'Undecided'})[v]}</button>`).join('')}</div>
      <button class="detail-toggle" aria-expanded="${expanded}" aria-controls="detail-${c.id}" data-expand="${c.id}">${expanded ? '− Hide note' : '+ Definition & sources'}</button>
      <div id="detail-${c.id}" class="claim-detail"><p>${escape(c.description)}</p>${sourcesHTML(c.sources)}</div></article>`;
  }).join('') || '<p class="empty-state">No matching claims. Try another search or category.</p>';
}
function resultsView() {
  const s = state(), items = analyze(area, dataset().rules, s);
  const count = Object.keys(s.selections).length;
  $('#selection-count').textContent = count;
  $('#score-ring').style.background = `conic-gradient(var(--sage) ${count / dataset().claims.length * 360}deg, #304139 0deg)`;
  $('#consequence-count').textContent = items.filter(r => r.resultType === (policy() ? 'incomplete' : 'consequence')).length;
  $('#tension-count').textContent = items.filter(r => r.resultType === (policy() ? 'conditional' : 'conflict')).length;
  $('#analysis-status').textContent = policy() ? `${items.filter(r => r.resultType === 'conditional').length} conditional findings; ${items.filter(r => r.resultType === 'incomplete').length} need context.` : `${items.filter(r=>r.resultType==='tension').length} interpretive tensions; ${items.filter(r=>r.resultType==='incomplete').length} incomplete arguments. Direct selected-premise matching only; consequences are not fed into further rules.`;
  if (!items.length) {
    $('#analysis-results').innerHTML = `<div class="empty-state"><span>◇</span><h3>${count ? 'No active relations.' : 'A clearer map begins here.'}</h3><p>${count ? 'No warning does not establish coherence. Only the documented rules are checked.' : 'Select statements or load an editable example.'}</p></div>`;
    return;
  }
  $('#analysis-results').innerHTML = items.map(r => {
    const label = policy() ? (r.resultType === 'incomplete' ? 'Needs context / Mangler avgrensning' : KINDS[r.kind]) : ({incomplete:'Incomplete argument — no conclusion drawn',tension:'Interpretive tension — not a contradiction',consequence:'Conditional consequence',conflict:'Incompatibility under the stated definitions'})[r.resultType];
    return `<article class="result-card ${r.resultType}" data-rule="${r.id}"><div class="result-label">${escape(label)} · ${escape(r.status)}</div><h3>${escape(r.title)}</h3>
      ${policy() && r.resultType === 'incomplete' ? `<p>Complete: ${escape([...r.missingContext.map(k => CONTEXT[k]), ...(r.needsScopeConfirmation ? ['confirm a common scope below'] : [])].join('; '))}. This is not yet a finding.</p><a href="#policy-context">Edit scenario context ↓</a>` : ''}
      ${!policy() && r.missingPremises ? `<p><strong>Additional premises required:</strong> ${r.missingPremises.map(p=>`${escape(p.claim)} (${s.selections[p.claim] ? 'currently opposed' : 'undecided'})`).join('; ')}. Nothing is selected automatically. Rejecting a premise does not prove the opposite conclusion.</p>` : ''}
      <div class="premises">${r.premises.map(p => `<span>${p.polarity === 'deny' ? '¬ ' : ''}${escape(p.claim)}</span>`).join('')}${r.conclusion && r.resultType !== 'incomplete' ? `<span>→ ${r.conclusion.polarity === 'deny' ? '¬ ' : ''}${escape(r.conclusion.claim)}</span>` : ''}</div>
      <p>${escape(r.explanation)}</p>${policy() ? '<p class="result-warning">Conditional on your assumptions; not independently verified.</p>' : ''}
      <details><summary>Reasoning, qualifications & sources</summary><p><strong>Caveat:</strong> ${escape(r.caveat)}</p>
      ${!policy() && r.assessment ? `<p><strong>Inference:</strong> ${escape(r.assessment.inference)}. <strong>Premises:</strong> ${escape(r.assessment.premises)}.</p><p>${escape(r.assessment.framework)}</p><p><strong>Scope:</strong> ${escape(r.assessment.scope)}</p><p><strong>Audit:</strong> ${escape(r.assessment.justification)}</p><p>Editorial audit ${escape(r.assessment.reviewedOn)}; no independent specialist approval.</p>${listHTML(r.objectionTargets?.map(o=>`${o.target}: ${o.text}`),'Objection targets')}${listHTML(r.citations.map(c=>`${c.source}: ${c.locator} (${c.role})`),'Source roles and locators')}` : ''}
      ${listHTML(policy() ? r.alternatives : r.objections, 'Possible revisions')}
      ${policy() ? listHTML(r.evidenceNeeded, 'Evidence required') + `<p><strong>Source role:</strong> ${escape(r.sourceRole)}</p>` + Object.entries(r.context).map(([k,v]) => `<p><strong>${escape(CONTEXT[k])}:</strong> ${escape(v)}</p>`).join('') : ''}
      ${sourcesHTML(r.sources)}</details></article>`;
  }).join('');
}
function listHTML(items, title) { return items?.length ? `<p><strong>${escape(title)}:</strong></p><ul>${items.map(v => `<li>${escape(v)}</li>`).join('')}</ul>` : ''; }
function render() { filters(); claimsView(); resultsView(); }
function contextView() {
  $('#context-fields').innerHTML = Object.entries(CONTEXT).map(([key,label]) => `<label for="context-${key}">${escape(label)}<input id="context-${key}" data-context="${key}" maxlength="300" value="${escape(state().context[key] || '')}" autocomplete="off"></label>`).join('');
  $('#scope-confirmed').checked = state().scopeConfirmed;
  $('#example-notice').textContent = state().example ? `Based on a synthetic example: ${state().example}. Your edits are hypothetical and unverified.` : 'Your own scenario. No party positions or project facts are verified here.';
}
function areaView() {
  $('#area-select').value = area;
  $('#area-description').textContent = policy() ? 'Explore Norwegian policy choices and scenario assumptions. Research prototype · Bokmål dataset.' : 'Analytic philosophical theology: divine attributes, freedom, providence and a hiddenness argument. Limited coverage, not a survey of all religions.';
  $('#hero-title').innerHTML = policy() ? 'How do your policies<br><em>fit together?</em>' : 'What else follows from<br><em>what you believe?</em>';
  $('#hero-lede').textContent = policy() ? 'Choose policies and assumptions, define a shared scenario, and inspect conditional relationships. Examples are illustrative—not party assessments.' : 'Choose your commitments. Trace consequences, points of pressure and disputed assumptions.';
  $('#template-button').textContent = policy() ? 'Start from an example' : 'Start from a position';
  $('#template-title').textContent = policy() ? 'Illustrative policy scenarios' : 'Position templates';
  $('#template-description').textContent = policy() ? 'Synthetic examples, not party platforms. Loading one replaces this area’s selections and context; every item remains editable.' : 'Loading a template replaces this area’s selections. Templates are editable sketches, not definitions.';
  $('#template-list').innerHTML = dataset().templates.map(p => `<button class="template" data-template="${p.id}"><strong>${escape(p.title || p.label)}</strong><span>${escape(p.description || p.lesson)}</span></button>`).join('');
  $('#policy-context').hidden = !policy(); $('#policy-notice').hidden = !policy();
  $('#consequence-label').textContent = policy() ? 'need context' : 'consequences';
  $('#tension-label').textContent = policy() ? 'conditional findings' : 'incompatibilities';
  $('#search').value = state().search;
  $('#method-content').innerHTML = policy()
    ? '<h1>Assumptions stay visible.</h1><p class="method-intro">The Norwegian corpus checks policy packages only under the assumptions and boundaries you supply. It neither verifies those assumptions nor rates parties.</p><div class="method-grid"><article><h2>Three kinds of statement</h2><p>Policy choices, self-imposed constraints and scenario assumptions are separate. Undecided never means rejected.</p></article><article><h2>One shared scenario</h2><p>Use the same actor, period, baseline and relevant project boundaries. Missing context prompts clarification rather than a finding.</p></article><article><h2>Conditional results</h2><p>Accounting conflicts, unsupported inferences and implementation pressures have different meanings. An unsupported inference does not prove its conclusion false.</p></article></div><div class="method-note"><p>No warnings does not establish coherence. No empirical or legal review is performed. Sources explain the framework, and evidence requirements remain visible with each result.</p><p><a href="data/norway/AUDIT.md">Read the editorial audit</a> · <a href="data/norway/README.md">Dataset documentation</a></p></div>'
    : '<h1>Pressure is not contradiction.</h1><p class="method-intro">Validity and disputed premise truth are separate; a valid conditional argument need not be sound. The analysis checks the explicit selections against documented rules; it does not perform general theorem proving.</p><div class="method-grid"><article><h2>Claims are atomic</h2><p>Position templates are starting points. The analysis uses your individual selections.</p></article><article><h2>Strength is visible</h2><p>Conditional deductions, interpretive tensions and incomplete arguments are labeled separately. Conclusions are displayed without silently changing your beliefs.</p></article><article><h2>Assumptions stay exposed</h2><p>All premises must be explicitly selected. Objections, qualifications and sources remain attached.</p></article></div><div class="method-note"><p>No warnings does not establish consistency: coverage is limited to the documented rules. Displayed consequences do not trigger further rules.</p><p><a href="data/AUDIT.md">Read the philosophy editorial audit</a>. Formal checks do not constitute independent specialist review.</p></div>';
  contextView(); render();
}
function clearSharedAddress() { history.replaceState(null, '', location.pathname); }
function markEdited() { clearSharedAddress(); $('#share-output').hidden = true; }
function restoreFocus(selector) { $(selector)?.focus({preventScroll:true}); }
async function init() {
  await Promise.allSettled(Object.keys(AREAS).map(async id => { datasets[id] = await loadArea(id); }));
  if (!Object.keys(datasets).length) throw new Error('The datasets could not be loaded. Please reload to retry.');
  const restored = restoreURL(location.href, datasets); area = restored.area; sessions[area] = restored.state;
  if (restored.error) toast(restored.error);
  clearSharedAddress();
  $('#area-select').disabled = false; $('#begin-button').disabled = false; $('#template-button').disabled = false; $('#share-button').disabled = false;
  $('#area-select').onchange = async e => {
    const next = e.target.value; $('#area-select').disabled = true;
    try { if (!datasets[next]) datasets[next] = await loadArea(next); area = next; markEdited(); areaView(); }
    catch (error) { $('#area-select').value = area; toast(error.message); }
    finally { $('#area-select').disabled = false; }
  };
  document.addEventListener('click', e => {
    const choice = e.target.closest('.choice');
    if (choice) {
      const {id,value} = choice.dataset;
      if (value === 'undecided') delete state().selections[id]; else state().selections[id] = value;
      if (policy()) { state().scopeConfirmed = false; $('#scope-confirmed').checked = false; }
      markEdited(); render(); restoreFocus(`.choice[data-id="${id}"][data-value="${value}"]`);
    }
    const filter = e.target.closest('.filter');
    if (filter) { state().category = filter.dataset.category; render(); [...document.querySelectorAll('.filter')].find(x => x.dataset.category === state().category)?.focus({preventScroll:true}); }
    const expand = e.target.closest('[data-expand]');
    if (expand) { const id = expand.dataset.expand; state().expanded.has(id) ? state().expanded.delete(id) : state().expanded.add(id); claimsView(); restoreFocus(`[data-expand="${id}"]`); }
    const template = e.target.closest('[data-template]');
    if (template) {
      const p = dataset().templates.find(x => x.id === template.dataset.template);
      sessions[area] = newState(); state().selections = Object.fromEntries(Object.entries(p.selections).filter(([,v]) => v === 'affirm' || v === 'deny'));
      state().context = {...p.context}; state().example = policy() ? p.label : '';
      $('#template-dialog').close(); markEdited(); areaView(); $('#workspace').scrollIntoView();
    }
  });
  $('#search').oninput = e => { state().search = e.target.value; claimsView(); };
  $('#clear-button').onclick = () => { sessions[area] = newState(); markEdited(); areaView(); toast('Cleared this area’s selections and context.'); };
  $('#begin-button').onclick = () => $('#workspace').scrollIntoView();
  $('#template-button').onclick = () => $('#template-dialog').showModal();
  $('.dialog-close').onclick = () => $('#template-dialog').close();
  $('#expand-all').onclick = () => { state().expanded = state().expanded.size === dataset().claims.length ? new Set() : new Set(dataset().claims.map(c => c.id)); claimsView(); };
  $('#context-fields').oninput = e => {
    if (!e.target.dataset.context) return;
    state().context[e.target.dataset.context] = e.target.value;
    state().scopeConfirmed = false; $('#scope-confirmed').checked = false; markEdited(); resultsView();
  };
  $('#scope-confirmed').onchange = e => { state().scopeConfirmed = e.target.checked; markEdited(); resultsView(); };
  $('#share-button').onclick = async () => {
    const url = shareURL(location.href, area, state());
    $('#share-link').value = url; $('#share-output').hidden = false;
    try { await navigator.clipboard.writeText(url); toast('Link copied. It includes this area’s selections and context.'); }
    catch { $('#share-link').focus(); $('#share-link').select(); toast('Copy the displayed link manually.'); }
  };
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = () => {
    const method = b.dataset.view === 'method';
    $('#explore-view').classList.toggle('hidden', method); $('#method-view').classList.toggle('hidden', !method);
    document.querySelectorAll('[data-view]').forEach(x => x.classList.toggle('active', x === b)); window.scrollTo(0,0);
  });
  areaView();
}
init().catch(error => { $('#claim-count').textContent = error.message; $('#analysis-results').textContent = 'Analysis unavailable until the data loads.'; });
