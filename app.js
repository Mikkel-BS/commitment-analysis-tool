const load = name => fetch(`data/${name}.json`).then(r => { if (!r.ok) throw new Error(`Could not load ${name}`); return r.json(); });
const [claims, rules, positions, sources] = await Promise.all(['claims','rules','positions','sources'].map(load));
const sourceMap = Object.fromEntries(sources.map(s => [s.id, s]));
const state = { selections: {}, category: 'All', search: '', expanded: new Set() };

function encodeState(){ const p = new URLSearchParams(); Object.entries(state.selections).forEach(([id,v])=>p.set(id,v[0])); history.replaceState(null,'',`${location.pathname}?${p}`); }
function decodeState(){ const p=new URLSearchParams(location.search); claims.forEach(c=>{ const v=p.get(c.id); if(v==='a') state.selections[c.id]='affirm'; if(v==='d') state.selections[c.id]='deny'; }); }
function truth(literal){ return state.selections[literal.claim]===literal.polarity; }
function analyses(){
  return rules.filter(rule=>rule.premises.every(truth)).map(rule=>{
    if(rule.conclusion){ const selected=state.selections[rule.conclusion.claim]; const contradicted=selected && selected!==rule.conclusion.polarity; return {...rule,resultType:contradicted?'conflict':'consequence',contradicted}; }
    return {...rule,resultType:'conflict'};
  });
}
function renderFilters(){ const counts=Object.fromEntries(claims.map(c=>c.category).map(k=>[k,claims.filter(c=>c.category===k).length])); const cats=['All',...Object.keys(counts)]; document.querySelector('#category-filters').innerHTML=cats.map(c=>`<button class="filter ${state.category===c?'active':''}" data-category="${c}">${c}<span>${c==='All'?claims.length:counts[c]}</span></button>`).join(''); }
function renderClaims(){
  const visible=claims.filter(c=>(state.category==='All'||c.category===state.category)&&(`${c.title} ${c.statement} ${c.tags.join(' ')}`.toLowerCase().includes(state.search.toLowerCase())));
  document.querySelector('#claim-count').textContent=`Showing ${visible.length} of ${claims.length} commitments`;
  document.querySelector('#claims-list').innerHTML=visible.map(c=>`<article class="claim-card ${state.expanded.has(c.id)?'expanded':''}">
    <div class="claim-top"><div><div class="claim-category">${c.category} · ${c.id}</div><h3>${c.title}</h3><p class="statement">${c.statement}</p></div>
    <div class="choice-group" role="group" aria-label="Your view on ${c.title}"><button class="choice affirm ${state.selections[c.id]==='affirm'?'active':''}" data-id="${c.id}" data-value="affirm">Affirm</button><button class="choice deny ${state.selections[c.id]==='deny'?'active':''}" data-id="${c.id}" data-value="deny">Deny</button></div></div>
    <button class="detail-toggle" data-expand="${c.id}">${state.expanded.has(c.id)?'− Hide note':'+ Why this wording?'}</button>
    <div class="claim-detail"><p>${c.description}</p>${sourceLinks(c.sources)}</div>
  </article>`).join('') || '<div class="empty-state"><h3>No matching claims</h3><p>Try another search or category.</p></div>';
}
function sourceLinks(ids){ return `<p>Sources: ${ids.map(id=>{const s=sourceMap[id];return `<a href="${s.url}" target="_blank" rel="noreferrer">${s.title} ↗</a>`}).join(' · ')}</p>`; }
function renderAnalysis(){
  const items=analyses(), selected=Object.keys(state.selections).length, tensions=items.filter(x=>x.resultType==='conflict').length, consequences=items.filter(x=>x.resultType==='consequence').length;
  document.querySelector('#selection-count').textContent=selected; document.querySelector('#tension-count').textContent=tensions; document.querySelector('#consequence-count').textContent=consequences;
  document.querySelector('#score-ring').style.background=`conic-gradient(var(--sage) ${selected/claims.length*360}deg, #304139 0deg)`;
  const box=document.querySelector('#analysis-results');
  if(!items.length){ box.innerHTML=`<div class="empty-state"><span>◇</span><h3>${selected?'No active relations yet.':'A clearer map begins here.'}</h3><p>${selected?'Add more commitments to expose their connections.':'Make a few selections to reveal their connections.'}</p></div>`; return; }
  box.innerHTML=items.map(r=>`<article class="result-card ${r.resultType}"><div class="result-label">${r.resultType==='consequence'?'Consequence':r.kind} · ${r.status}</div><h3>${r.title}</h3><div class="premises">${r.premises.map(p=>`<span>${p.claim}</span>`).join('')} ${r.conclusion?`<span>→ ${r.conclusion.polarity==='deny'?'¬':''}${r.conclusion.claim}</span>`:''}</div><p>${r.explanation}</p><details><summary>Assumptions, objections & sources</summary><p><strong>Caveat:</strong> ${r.caveat}</p>${r.objections.length?`<p><strong>Ways to resist:</strong> ${r.objections.join(' · ')}</p>`:''}${sourceLinks(r.sources)}</details></article>`).join('');
}
function render(){ renderFilters();renderClaims();renderAnalysis();encodeState(); }
document.addEventListener('click',e=>{
  const choice=e.target.closest('.choice'); if(choice){ const {id,value}=choice.dataset; state.selections[id]=state.selections[id]===value?undefined:value; if(!state.selections[id])delete state.selections[id];render(); }
  const filter=e.target.closest('.filter'); if(filter){state.category=filter.dataset.category;render();}
  const exp=e.target.closest('[data-expand]'); if(exp){state.expanded.has(exp.dataset.expand)?state.expanded.delete(exp.dataset.expand):state.expanded.add(exp.dataset.expand);renderClaims();}
  const template=e.target.closest('.template'); if(template){state.selections={...positions.find(p=>p.id===template.dataset.id).selections};document.querySelector('#template-dialog').close();render();document.querySelector('#workspace').scrollIntoView();}
});
document.querySelector('#search').addEventListener('input',e=>{state.search=e.target.value;renderClaims();});
document.querySelector('#clear-button').onclick=()=>{state.selections={};render();};
document.querySelector('#begin-button').onclick=()=>document.querySelector('#workspace').scrollIntoView();
const dialog=document.querySelector('#template-dialog'); document.querySelector('#template-button').onclick=()=>dialog.showModal(); document.querySelector('.dialog-close').onclick=()=>dialog.close();
document.querySelector('#template-list').innerHTML=positions.map(p=>`<button class="template" data-id="${p.id}"><strong>${p.title}</strong><span>${p.description}</span></button>`).join('');
document.querySelector('#expand-all').onclick=()=>{const all=state.expanded.size===claims.length;state.expanded=all?new Set():new Set(claims.map(c=>c.id));document.querySelector('#expand-all').textContent=all?'Expand all':'Collapse all';renderClaims();};
document.querySelector('#share-button').onclick=async()=>{encodeState();await navigator.clipboard.writeText(location.href);const t=document.querySelector('#toast');t.textContent='Link copied to clipboard';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800);};
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{const method=b.dataset.view==='method';document.querySelector('#explore-view').classList.toggle('hidden',method);document.querySelector('#method-view').classList.toggle('hidden',!method);document.querySelectorAll('[data-view]').forEach(x=>x.classList.toggle('active',x===b));scrollTo(0,0);});
decodeState();render();
