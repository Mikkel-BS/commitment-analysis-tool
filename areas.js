import { evaluate as evaluateNorway } from './scripts/norway-engine.mjs';
export const AREAS = {
  philosophy: { label: 'Philosophy of religion', base: 'data/', templates: 'positions' },
  norway: { label: 'Norwegian politics · Norsk politikk', base: 'data/norway/', templates: 'scenarios' }
};
export const CONTEXT = {
  actor: 'Actor / Aktør', period: 'Period / Periode', baseline: 'Baseline / Referansebane',
  budgetBoundary: 'Budget boundary / Budsjettavgrensning', project: 'Project / Prosjekt',
  location: 'Location / Sted eller område', deadline: 'Deadline / Frist',
  emissionsBoundary: 'Emissions boundary / Utslippsregnskap'
};
export const CATEGORIES = {finance:'Offentlig økonomi',energy:'Kraft og nett',climate:'Klima og regnskap',nature:'Natur og areal',municipal:'Kommunale tjenester',delivery:'Gjennomføring',petroleum:'Petroleum'};
export const TYPES = {policy:'Politisk valg',constraint:'Valgt begrensning',assumption:'Scenarioforutsetning'};
export const KINDS = {'conditional-incompatibility':'Betinget uforenlighet','unsupported-inference':'Utilstrekkelig slutningsgrunnlag','implementation-pressure':'Gjennomføringsutfordring'};
export function newState() { return {selections:{},context:{},scopeConfirmed:false,category:'All',search:'',expanded:new Set(),example:''}; }
export function normalizeClaims(area, claims) {
  return claims.map(c => area === 'norway' ? {...c,title:c.statement,category:CATEGORIES[c.area],description:c.qualification,tags:[c.id,c.type,c.area]} : c);
}
export function analyze(area, rules, state) {
  if (area === 'norway') return evaluateNorway(rules,state.selections,state.context).map(f => ({
    ...rules.find(r => r.id === f.rule),...f,
    resultType:f.state === 'needs-context' || !state.scopeConfirmed ? 'incomplete' : 'conditional',
    needsScopeConfirmation:!state.scopeConfirmed
  }));
  return rules.filter(r => r.premises.every(p => state.selections[p.claim] === p.polarity)).map(r => {
    const contradicted = Boolean(r.conclusion && state.selections[r.conclusion.claim] && state.selections[r.conclusion.claim] !== r.conclusion.polarity);
    return {...r,resultType:r.conclusion && !contradicted ? 'consequence':'conflict',contradicted};
  });
}
// Fragments are not sent to the host; only explicit Share creates one.
export function shareURL(base,area,state) {
  const url = new URL(base); url.search=''; url.hash='';
  const selections=Object.fromEntries(Object.entries(state.selections).filter(([,v]) => v==='affirm'||v==='deny'));
  url.hash='map='+encodeURIComponent(JSON.stringify({v:1,area,selections,context:area==='norway'?state.context:{}}));
  return url.href;
}
export function restoreURL(href,datasets) {
  const url=new URL(href); let area='philosophy',data;
  const fallback = Object.hasOwn(datasets,'philosophy') ? 'philosophy' : Object.keys(datasets)[0];
  if(url.hash.startsWith('#map=')) {
    try {
      if(url.hash.length>40000) throw Error('too long');
      data=JSON.parse(decodeURIComponent(url.hash.slice(5)));
      if(data?.v!==1 || !Object.hasOwn(AREAS,data.area)) throw Error('unsupported');
      area=data.area;
    } catch { return {area:fallback,state:newState(),error:'This shared map could not be read. Starting with an empty map.'}; }
  } else {
    const requested=url.searchParams.get('area');
    if(requested && !Object.hasOwn(AREAS,requested)) return {area:fallback,state:newState(),error:'Unknown area. Showing an available area.'};
    area=requested||'philosophy';
  }
  const state=newState();
  if(!datasets[area]) return {area:Object.keys(datasets)[0],state,error:'The requested area could not load. Try selecting it again.'};
  for(const c of datasets[area].claims) {
    const v=data?data.selections?.[c.id]:({a:'affirm',d:'deny'})[url.searchParams.get(c.id)];
    if(v==='affirm'||v==='deny') state.selections[c.id]=v;
  }
  if(area==='norway' && data?.context && typeof data.context==='object') {
    for(const k of Object.keys(CONTEXT)) if(typeof data.context[k]==='string') state.context[k]=data.context[k].slice(0,300);
  }
  return {area,state,error:''}; // Recipient must confirm common scope independently.
}
