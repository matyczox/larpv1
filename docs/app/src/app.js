import { SUBJECTS, MISSIONS, BIO_NODES, BIO_LINKS, GRAPHS, getMission, getSubject, subjectMissions } from './data.js';
import { grade, shortestPath, routeCost, emptyProgress, readProgress, saveProgress, summarize, recommend, matchTopic } from './engine.js';

const root = document.querySelector('#app');
const progress = readProgress();
const state = {
  view: 'home', subjectId: null, missionId: null, filter: 'all',
  answer: null, result: null, hintVisible: false, hintsUsed: 0,
  ai: { online: false, model: '', checked: false }, aiQuestion: '', aiAnswer: '', aiLoading: false,
  notice: '', planQuery:'', planResult:null, planLoading:false,
};

const icons = {
  sparkle: '<path d="M12 2l1.9 6.1L20 10l-6.1 1.9L12 18l-1.9-6.1L4 10l6.1-1.9L12 2z"/><path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8L19 17z"/>',
  dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  library: '<path d="M4 19V5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z"/><path d="M4 17a2 2 0 0 1 2-2h13"/><path d="M9 8h6"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  arrow: '<path d="M4 12h16m-7-7 7 7-7 7"/>',
  back: '<path d="M20 12H4m7 7-7-7 7-7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="M5 5l14 14M19 5 5 19"/>',
  lightbulb: '<path d="M9 18h6m-5 4h4"/><path d="M8 15a7 7 0 1 1 8 0l-1 3H9z"/>',
  chart: '<path d="M3 3v18h18"/><path d="m7 16 4-6 4 2 5-7"/>',
  function: '<path d="M18 4c-5 0-5 16-10 16"/><path d="M7 9h11"/><path d="M4 5h2m12 14h2"/>',
  heart: '<path d="M20.8 5.6a5.5 5.5 0 0 0-7.8 0L12 6.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/>',
  languages: '<path d="m5 8 6 8m0-8-6 8m-3-8h12M8 4v4M13 20l5-12 4 12M14.5 17h6"/>',
  network: '<circle cx="5" cy="6" r="2"/><circle cx="18" cy="5" r="2"/><circle cx="8" cy="19" r="2"/><circle cx="20" cy="17" r="2"/><path d="m7 7 9 9M17 7 9 17M7 6l9-1m-6 14 8-2"/>',
  wand: '<path d="m4 20 13-13 3 3L7 23zM15 3l.5 2.5L18 6l-2.5.5L15 9l-.5-2.5L12 6l2.5-.5zM20 13l.4 1.6L22 15l-1.6.4L20 17l-.4-1.6L18 15l1.6-.4z"/>',
  refresh: '<path d="M20 7V3l-4 4h4A8 8 0 1 0 21 14"/>',
  book: '<path d="M2 5a3 3 0 0 1 3-3h6v18H5a3 3 0 0 0-3 2zm20 0a3 3 0 0 0-3-3h-6v18h6a3 3 0 0 1 3 2z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  shield: '<path d="m12 2 9 4v6c0 6-4 9-9 10-5-1-9-4-9-10V6z"/><path d="m8 12 3 3 5-6"/>',
  message: '<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H5l-3 2v-7.5a8.5 8.5 0 1 1 19-3z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
  trophy: '<path d="M7 3h10v7a5 5 0 0 1-10 0z"/><path d="M7 5H3v3a4 4 0 0 0 4 4m10-7h4v3a4 4 0 0 1-4 4M12 15v5m-5 1h10"/>',
  layers: '<path d="m12 2 9 5-9 5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-12h-7z"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h9a7 7 0 0 1 0 14"/>',
};
const icon = (name, size=19) => `<svg class="icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.sparkle}</svg>`;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const countCorrect = id => progress.attempts.some(a => a.missionId === id && a.correct);
const subjectColor = id => getSubject(id)?.color || '#9cadff';

function defaultAnswer(mission) {
  if (mission.type === 'linear') return { a: 1, b: 0 };
  if (mission.type === 'choice') return { selected: null };
  if (mission.type === 'path') return { path: [] };
  if (mission.type === 'graph') return { path: [mission.params.start] };
  return {};
}
function startMission(id) {
  const m = getMission(id);
  if (!m) return;
  Object.assign(state, { view:'mission', missionId:id, subjectId:m.subject, answer:defaultAnswer(m), result:null, hintsUsed:0, hintVisible:false, aiQuestion:'', aiAnswer:'', notice:'' });
  window.scrollTo({top:0,behavior:'instant'});
  render();
}
function openView(view, subjectId=null) {
  state.view = view; state.subjectId = subjectId; state.notice = '';
  window.scrollTo({top:0,behavior:'instant'});
  render();
}
function subjectIcon(subj, size=21) { return `<span class="subject-icon" style="--subject-color:${subj.color}">${icon(subj.icon,size)}</span>`; }
function pill(label, extra='') { return `<span class="pill ${extra}">${escapeHtml(label)}</span>`; }
function navButton(view, symbol, label) { return `<button class="nav-item ${state.view===view?'is-active':''}" data-view="${view}">${icon(symbol)}<span>${label}</span></button>`; }
function header() {
  const online = state.ai.online;
  return `<header class="topbar"><div class="breadcrumb">PRZESTRZEŃ NAUKI <span>/</span> <strong>${state.view==='home'?'Pulpit':state.view==='library'?'Biblioteka':state.view==='progress'?'Moje postępy':state.view==='subject'?escapeHtml(getSubject(state.subjectId)?.name):'Laboratorium'}</strong></div><div class="top-actions"><span class="connection"><i class="status-dot ${online?'online':''}"></i>${online?'AI lokalne: '+escapeHtml(state.ai.model):'Ćwiczenia offline'}</span><span class="user-mark" title="Wersja demonstracyjna">P</span></div></header>`;
}
function shell(content) {
  return `<div class="shell"><aside class="sidebar"><a class="brand" href="#" data-view="home" aria-label="PARADOX — strona główna"><span class="brand-symbol">P<span>•</span></span><span class="brand-words"><strong>paradox</strong><small>LEARNING ENGINE</small></span></a><div class="sidebar-label">ODKRYWAJ</div><nav class="nav-group">${navButton('home','dashboard','Pulpit')}${navButton('library','library','Biblioteka misji')}${navButton('progress','activity','Moje postępy')}</nav><div class="side-break"></div><div class="sidebar-label">TWOJE ŚCIEŻKI</div><div class="subject-nav">${SUBJECTS.map(s=>`<button data-subject="${s.id}" class="side-subject ${state.subjectId===s.id&&['mission','subject'].includes(state.view)?'selected':''}"><span class="small-dot" style="background:${s.color}"></span>${escapeHtml(s.name)}<span class="mini-count">${subjectMissions(s.id).filter(m=>countCorrect(m.id)).length}/${subjectMissions(s.id).length}</span></button>`).join('')}</div><div class="side-bottom"><div class="mini-note">${icon('sparkle',18)}<span>Nie tylko czytaj.<br/><strong>Eksperymentuj.</strong></span></div><p>PROTOTYP KONKURSOWY · v0.1</p></div></aside><div class="workspace">${header()}<main class="content">${content}</main><footer class="page-footer"><span>PARADOX / Verified Learning Worlds</span><span>Autorskie zadania demonstracyjne · zapis lokalny</span></footer></div></div>`;
}

function missionCard(m, compact=false) {
  const s = getSubject(m.subject), passed = countCorrect(m.id);
  return `<button class="mission-card ${compact?'compact':''}" data-mission="${m.id}"><span class="mission-card-icon" style="--subject-color:${s.color}">${icon(s.icon,23)}</span><span class="mission-card-meta"><small>${escapeHtml(s.name)} · POZIOM ${m.level}</small><strong>${escapeHtml(m.title)}</strong><span>${escapeHtml(m.prompt)}</span></span><span class="mission-card-arrow ${passed?'passed':''}">${icon(passed?'check':'arrow',19)}</span></button>`;
}
function planWidget() {
  const result=state.planResult;
  const subject=result?.supported?getSubject(result.subject):null;
  const chosen=subject?recommend(progress,subject.id).mission:null;
  return `<section class="topic-planner"><div class="planner-copy"><span class="overline">STUDIO INTELIGENTNEJ NAUKI</span><h2>Powiedz, czego chcesz się nauczyć.</h2><p>System dobierze istniejący, sprawdzalny szablon. ${state.ai.online?'Twój lokalny model pomoże wybrać ścieżkę.':'W trybie offline używane są jawne reguły dopasowania.'}</p></div><div class="planner-controls"><div class="planner-input-wrap">${icon('sparkle',19)}<input type="text" id="plan-input" maxlength="300" placeholder="Np. Nie rozumiem Past Perfect..." value="${escapeHtml(state.planQuery)}" aria-label="Czego chcesz się nauczyć"/><button class="btn btn-primary" data-action="plan" ${state.planLoading?'disabled':''}>${state.planLoading?'Analizuję...':'Dobierz ćwiczenie'} ${icon('arrow',16)}</button></div>${result?`<div class="planner-result ${subject?'is-supported':''}"><span class="planner-result-icon">${icon(subject?'check':'lightbulb',19)}</span><span><strong>${subject?escapeHtml(subject.name)+' — '+escapeHtml(subject.subtitle):'Temat poza aktualną biblioteką'}</strong><small>${escapeHtml(result.reason)} ${result.mode==='ai'?'· Wybrał lokalny model AI':'· Reguły offline'}</small></span>${chosen?`<button class="btn btn-outline btn-sm" data-mission="${chosen.id}">Uruchom ${icon('arrow',16)}</button>`:''}</div>`:''}</div></section>`;
}
function renderHome() {
  const stats = summarize(progress), next = recommend(progress), nextSubject = getSubject(next.mission.subject);
  return `<section class="hero"><div class="hero-glow"></div><div class="hero-copy"><span class="hero-eyebrow">${icon('sparkle',15)} UCZ SIĘ PRZEZ ODKRYWANIE</span><h1>Wiedza zaczyna się<br/>od <em>ciekawości.</em></h1><p>Nie oglądaj kolejnej prezentacji. Zmieniaj parametry, odkrywaj zależności i rozwiązuj problemy w interaktywnych laboratoriach.</p><div class="hero-buttons"><button class="btn btn-primary" data-mission="${next.mission.id}">Rozpocznij naukę ${icon('arrow',17)}</button><button class="btn btn-outline" data-view="library">Odkryj misje ${icon('layers',17)}</button></div></div><div class="hero-art" aria-hidden="true"><div class="hero-grid"></div><span class="art-tag art-tag-top">SYMULACJA W CZASIE RZECZYWISTYM</span><svg viewBox="0 0 400 290" role="img"><defs><linearGradient id="heroLine" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#90b4ff"/><stop offset="1" stop-color="#d1ff99"/></linearGradient></defs>${Array.from({length:7},(_,i)=>`<line x1="30" y1="${40+i*35}" x2="378" y2="${40+i*35}" stroke="#6376a0" stroke-opacity=".22"/>`).join('')}${Array.from({length:9},(_,i)=>`<line x1="${30+i*44}" y1="30" x2="${30+i*44}" y2="262" stroke="#6376a0" stroke-opacity=".22"/>`).join('')}<path d="M37 242 C102 232 118 220 153 179 S233 75 269 109 S344 175 377 55" fill="none" stroke="url(#heroLine)" stroke-width="4" stroke-linecap="round"/><circle cx="269" cy="109" r="8" fill="#d1ff99" stroke="#163e3e" stroke-width="5"/><circle cx="377" cy="55" r="7" fill="#fff"/><path d="M269 109V250" stroke="#d1ff99" stroke-width="1" stroke-dasharray="5 5" opacity=".5"/></svg><div class="hero-annotation"><span class="tiny-spark">✦</span><span>Hipoteza zweryfikowana<small>Obserwacja → wniosek</small></span>${icon('check',16)}</div><span class="art-tag art-tag-bottom">01 / 04 · WORLD ENGINE</span></div></section>
  <section class="stats-row"><div class="stat"><span>${icon('check',18)} ODKRYTE MISJE</span><strong>${String(stats.done).padStart(2,'0')}<small> / ${MISSIONS.length}</small></strong></div><div class="stat"><span>${icon('target',18)} SKUTECZNOŚĆ PRÓB</span><strong>${stats.attempts?stats.accuracy+'%':'—'}</strong></div><div class="stat"><span>${icon('bolt',18)} WYKONANE PRÓBY</span><strong>${String(stats.attempts).padStart(2,'0')}</strong></div></section>
  ${planWidget()}
  <section class="section"><div class="section-heading"><div><span class="overline">TWÓJ NASTĘPNY KROK</span><h2>Kontynuuj odkrywanie</h2></div><button class="link-button" data-view="progress">Zobacz postępy ${icon('arrow',16)}</button></div><div class="continue-card"><div class="continue-icon" style="--subject-color:${nextSubject.color}">${icon(nextSubject.icon,28)}</div><div class="continue-copy"><span>${escapeHtml(nextSubject.name.toUpperCase())} · POZIOM ${next.mission.level}</span><strong>${escapeHtml(next.mission.title)}</strong><small>${escapeHtml(next.reason)}</small></div><button class="btn btn-primary" data-mission="${next.mission.id}">Otwórz misję ${icon('arrow',16)}</button></div></section>
  <section class="section"><div class="section-heading"><div><span class="overline">CZTERY ŚWIATY, JEDEN CEL</span><h2>Wybierz swoje laboratorium</h2></div><button class="link-button" data-view="library">Wszystkie misje ${icon('arrow',16)}</button></div><div class="subject-grid">${SUBJECTS.map(s=>subjectTile(s)).join('')}</div></section>
  <section class="how-it-works"><div class="how-head"><span class="overline">JAK DZIAŁA PARADOX</span><h2>Uczysz się, robiąc.</h2><p>Każde ćwiczenie wykorzystuje sprawdzalny mechanizm — nie tylko ocenę tekstową modelu językowego.</p></div><div class="how-steps">${[['target','01','Postaw hipotezę','Zobacz problem i spróbuj przewidzieć wynik.'],['activity','02','Eksperymentuj','Zmieniaj parametry, porównuj i testuj.'],['shield','03','Sprawdź wynik','Silnik niezależnie weryfikuje odpowiedź.'],['sparkle','04','Ucz się dalej','Trudniejsze miejsca wracają do powtórek.']].map(([sym,num,title,body])=>`<div class="how-step">${icon(sym,21)}<small>${num}</small><strong>${title}</strong><p>${body}</p></div>`).join('')}</div></section>`;
}
function subjectTile(s) {
  const done = subjectMissions(s.id).filter(m=>countCorrect(m.id)).length;
  const pct = Math.round(done/3*100);
  return `<button class="subject-tile" data-subject="${s.id}" style="--subject-color:${s.color}"><span class="tile-upper"><span class="tile-icon">${icon(s.icon,27)}</span><span class="tile-arrow">${icon('arrow',18)}</span></span><span class="tile-category">${escapeHtml(s.category)} · 3 MISJE</span><strong>${escapeHtml(s.name)}</strong><span class="tile-subtitle">${escapeHtml(s.subtitle)}</span><span class="tile-description">${escapeHtml(s.summary)}</span><span class="tile-progress"><span style="width:${pct}%"></span></span><span class="tile-footer">${done} z 3 ukończonych <span>${pct}%</span></span></button>`;
}
function renderLibrary() {
  const filters=['all','Ścisłe','Przyrodnicze','Języki'];
  const filtered=SUBJECTS.filter(s=>state.filter==='all'||s.category===state.filter);
  return `<div class="page-title"><span class="overline">KATALOG DOŚWIADCZEŃ</span><h1>Laboratoria</h1><p>Od gramatycznego śledztwa po grafy i układ krążenia. Wybierz dziedzinę i naucz się przez działanie.</p></div><div class="filter-row">${filters.map(f=>`<button class="filter-chip ${state.filter===f?'active':''}" data-filter="${f}">${f==='all'?'Wszystkie':escapeHtml(f)}</button>`).join('')}</div><div class="subject-grid library-grid">${filtered.map(subjectTile).join('')}</div><div class="notice-panel">${icon('shield',20)}<span><strong>Wszystkie ćwiczenia są autorskimi przykładami.</strong> Wyniki sprawdzają niezależne reguły matematyczne i testy. AI jest opcjonalnym tutorem, nie arbitrem poprawności.</span></div>`;
}
function renderSubject() {
  const s=getSubject(state.subjectId); if(!s)return renderLibrary();
  const missions=subjectMissions(s.id), done=missions.filter(m=>countCorrect(m.id)).length;
  return `<div class="backline"><button class="back-link" data-view="library">${icon('back',16)} Wszystkie laboratoria</button></div><section class="subject-hero" style="--subject-color:${s.color}"><span class="subject-hero-icon">${icon(s.icon,42)}</span><div><span class="overline">ŚCIEŻKA NAUKI · ${escapeHtml(s.category.toUpperCase())}</span><h1>${escapeHtml(s.name)}</h1><p>${escapeHtml(s.summary)}</p><div class="subject-hero-meta">${pill(s.subtitle)}${pill(done+' / 3 odkryte')}</div></div></section><section class="section"><div class="section-heading"><div><span class="overline">TWOJA TRASA</span><h2>Trzy misje. Rosnący poziom trudności.</h2></div></div><div class="mission-list">${missions.map(m=>missionCard(m)).join('')}</div></section>`;
}

function linearSvg(m, answer) {
  const width=620,height=324, left=48,top=22,w=536,h=272;
  const xy=(x,y)=>[left+(x+5)/10*w,top+(6.5-y)/13*h];
  const lineFor=(a,b)=>{const p1=xy(-7,a*-7+b),p2=xy(7,a*7+b);return `${p1[0]},${p1[1]} ${p2[0]},${p2[1]}`};
  const grids=[];
  for(let x=-5;x<=5;x++) {const [px]=xy(x,0);grids.push(`<line x1="${px}" y1="${top}" x2="${px}" y2="${top+h}" class="${x===0?'axis-line':'grid-line'}"/>`);if(x%2===0)grids.push(`<text x="${px}" y="${top+h+17}" class="axis-label" text-anchor="middle">${x}</text>`);}
  for(let y=-6;y<=6;y+=2) {const [,py]=xy(0,y);grids.push(`<line x1="${left}" y1="${py}" x2="${left+w}" y2="${py}" class="${y===0?'axis-line':'grid-line'}"/><text x="${left-12}" y="${py+4}" class="axis-label" text-anchor="end">${y}</text>`);}
  const markers=m.params.points.map(([x,y],i)=>{const [px,py]=xy(x,y);return `<circle cx="${px}" cy="${py}" r="6" class="target-point"/><text x="${px+9}" y="${py-10}" class="point-label">${i?'B':'A'} (${x}; ${y})</text>`}).join('');
  return `<svg class="math-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Wykres prostych. Linia przerywana to cel, pełna to twój wykres."><defs><clipPath id="math-clip"><rect x="${left}" y="${top}" width="${w}" height="${h}"/></clipPath></defs>${grids.join('')}<g clip-path="url(#math-clip)"><polyline points="${lineFor(m.params.a,m.params.b)}" class="target-line"/><polyline points="${lineFor(answer.a,answer.b)}" class="your-line"/></g>${markers}<text x="${left+w+11}" y="${xy(0,0)[1]+3}" class="axis-label">x</text><text x="${xy(0,0)[0]+8}" y="${top-8}" class="axis-label">y</text></svg>`;
}
function renderLinear(m) {
  return `<div class="visual-card"><div class="visual-toolbar"><span class="overline">INTERAKTYWNY WYKRES</span><span class="legend"><i class="legend-target"></i> cel <i class="legend-current"></i> twoja prosta</span></div><div id="math-visual">${linearSvg(m,state.answer)}</div><div class="math-equation">y = <b id="a-val">${state.answer.a}</b>x ${state.answer.b>=0?'+':'−'} <b id="b-val">${Math.abs(state.answer.b)}</b></div><div class="slider-grid"><label>Nachylenie <strong>a = <span id="slider-a-val">${state.answer.a}</span></strong><input type="range" min="-4" max="4" step="1" value="${state.answer.a}" data-slider="a" /></label><label>Przesunięcie <strong>b = <span id="slider-b-val">${state.answer.b}</span></strong><input type="range" min="-5" max="5" step="1" value="${state.answer.b}" data-slider="b" /></label></div></div>`;
}
function renderBiology(m) {
  const selected=state.answer.path;
  const edges = BIO_LINKS.map(([a,b])=>{
    const x=BIO_NODES.find(n=>n.id===a),y=BIO_NODES.find(n=>n.id===b);
    const chosen=selected.some((id,i)=>id===a&&selected[i+1]===b);
    return `<line x1="${x.x}" y1="${x.y}" x2="${y.x}" y2="${y.y}" class="bio-edge ${chosen?'active':''}" marker-end="url(#bioArrow)"/>`;
  }).join('');
  const nodes=BIO_NODES.map(n=>`<g data-node="${n.id}" class="bio-node ${selected.includes(n.id)?'selected':''}" tabindex="0" role="button" aria-label="Wybierz: ${escapeHtml(n.label)}"><circle cx="${n.x}" cy="${n.y}" r="${n.kind==='organ'?27:23}"/><text x="${n.x}" y="${n.y+4}" class="node-bullet" text-anchor="middle">${selected.indexOf(n.id)>=0?selected.indexOf(n.id)+1:'+'}</text><text x="${n.x}" y="${n.y+43}" class="bio-label" text-anchor="middle">${escapeHtml(n.label)}</text></g>`).join('');
  return `<div class="visual-card"><div class="visual-toolbar"><span class="overline">SCHEMAT KRĄŻENIA</span><span class="legend">klikaj w prawidłowej kolejności</span></div><div class="bio-display"><svg viewBox="0 0 480 530" class="bio-svg" role="group" aria-label="Interaktywny schemat krążenia"><defs><marker id="bioArrow" markerWidth="5" markerHeight="5" refX="8" refY="3" orient="auto" viewBox="0 0 10 6"><path d="M0 0 10 3 0 6z" fill="#52617e" /></marker></defs>${edges}${nodes}</svg></div><div class="path-display"><div class="path-bar"><strong>Wybrana droga</strong><button class="text-button" data-action="undo">${icon('undo',14)} Cofnij</button><button class="text-button" data-action="reset">Wyczyść</button></div><div class="path-crumbs">${selected.length?selected.map((id,i)=>`<span>${i+1}. ${escapeHtml(BIO_NODES.find(n=>n.id===id)?.label || id)}</span>`).join('<b>→</b>'):'<em>Kliknij pierwszy element schematu...</em>'}</div></div></div>`;
}
function renderEnglish(m) {
  return `<div class="visual-card english-scene"><div class="scene-caption"><span class="eyebrow-glow">● CASE FILE / 0${m.level}</span><span>${icon('clock',15)} 18:42 PM</span></div><div class="scene-art"><div class="window-glow"></div><div class="room-window"></div><div class="room-table"></div><div class="room-laptop-outline">?</div><div class="scene-details"><span>CLASSROOM 204</span><strong>THE<br/>MISSING<br/>LAPTOP</strong></div></div><div class="scene-description">${icon('message',19)}<span>${escapeHtml(m.params.scene)}</span></div><div class="english-options">${m.params.options.map((option,i)=>`<button class="answer-choice ${state.answer.selected===i?'chosen':''}" data-choice="${i}"><span class="choice-letter">${'ABCD'[i]}</span>${escapeHtml(option)}<span class="choice-selector"></span></button>`).join('')}</div></div>`;
}
function graphSvg(m, path) {
  const graph=GRAPHS[m.params.graph];
  const chosenEdges = new Set(path.slice(1).map((id,i)=>[path[i],id].sort().join('|')));
  const edges=graph.edges.map(([a,b,w])=>{
    const p=graph.nodes.find(n=>n.id===a),q=graph.nodes.find(n=>n.id===b),active=chosenEdges.has([a,b].sort().join('|'));
    const cx=(p.x+q.x)/2,cy=(p.y+q.y)/2;
    return `<g><line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}" class="graph-edge ${active?'active':''}"/><rect x="${cx-14}" y="${cy-12}" width="28" height="24" rx="10" class="weight-bg"/><text x="${cx}" y="${cy+5}" class="edge-weight" text-anchor="middle">${w}</text></g>`;
  }).join('');
  const nodes=graph.nodes.map(n=>`<g class="graph-node ${path.includes(n.id)?'selected':''} ${n.id===m.params.end?'destination':''}" tabindex="0" role="button" data-node="${n.id}" aria-label="Wybierz punkt ${n.id}"><circle cx="${n.x}" cy="${n.y}" r="26"/><text x="${n.x}" y="${n.y+7}" text-anchor="middle">${n.id}</text></g>`).join('');
  return `<svg viewBox="0 0 600 385" class="graph-svg" role="group" aria-label="Interaktywny graf ważony. Wybieraj węzły trasy.">${edges}${nodes}</svg>`;
}
function renderAlgorithm(m) {
  const graph=GRAPHS[m.params.graph];
  const cost=routeCost(graph,state.answer.path);
  return `<div class="visual-card"><div class="visual-toolbar"><span class="overline">SIEĆ POŁĄCZEŃ</span><span class="legend">waga krawędzi = koszt</span></div><div class="graph-display">${graphSvg(m,state.answer.path)}</div><div class="route-footer"><div><span>Twoja trasa</span><strong>${state.answer.path.join(' → ')}</strong></div><div><span>Suma kosztów</span><strong>${cost ?? 0}</strong></div><button class="btn btn-outline btn-sm" data-action="undo">${icon('undo',15)} Cofnij</button></div><p class="graph-note">Wybieraj połączone węzły. Możesz przechodzić przez dowolne miejsca, ale liczy się najniższy koszt trasy do F.</p></div>`;
}
function feedbackView(m) {
  if (!state.result) return '';
  const r=state.result;
  return `<div class="feedback ${r.correct?'success':'error'}"><span class="feedback-mark">${icon(r.correct?'check':'close',20)}</span><div><strong>${r.correct?'Świetnie! Odkryłeś poprawne rozwiązanie.':'Jeszcze nie. Przeanalizuj swój wybór.'}</strong><p>${escapeHtml(r.correct?r.explanation:r.diagnosis)}</p>${r.correct?'<small>Wynik zapisany w Twojej mapie postępów.</small>':''}</div></div>`;
}
function renderMission() {
  const m=getMission(state.missionId);if(!m)return renderLibrary();
  const s=getSubject(m.subject), missions=subjectMissions(m.subject), position=missions.findIndex(x=>x.id===m.id), next=missions[position+1];
  const activity={linear:renderLinear,path:renderBiology,choice:renderEnglish,graph:renderAlgorithm}[m.type](m);
  return `<div class="backline"><button class="back-link" data-subject="${m.subject}">${icon('back',16)} ${escapeHtml(s.name)} / ścieżka nauki</button></div><div class="mission-top"><div><span class="overline">${escapeHtml(m.eyebrow.toUpperCase())}</span><h1>${escapeHtml(m.title)}</h1><p>Najpierw spróbuj sam. Możesz korzystać ze wskazówek — system zapamięta, które miejsca wymagają powtórki.</p></div><div class="mission-level"><span>POZIOM</span><strong>0${m.level}</strong><small>/ 03</small></div></div><div class="mission-stepper">${missions.map((item,i)=>`<button data-mission="${item.id}" class="mission-step ${item.id===m.id?'current':''} ${countCorrect(item.id)?'complete':''}"><span>${countCorrect(item.id)?icon('check',15):String(i+1).padStart(2,'0')}</span><small>${escapeHtml(item.title)}</small></button>`).join('')}</div><div class="lesson-layout"><section class="lesson-primary"><div class="lesson-prompt"><span class="overline">TWOJE WYZWANIE</span><h2>${escapeHtml(m.prompt)}</h2></div>${activity}${feedbackView(m)}<div class="lesson-actions"><button class="btn btn-outline" data-action="restart">${icon('refresh',16)} Od początku</button><button class="btn btn-primary" data-action="check">${state.result?.correct?'Sprawdź ponownie':'Sprawdź rozwiązanie'} ${icon('arrow',17)}</button></div>${state.result?.correct?`<div class="next-challenge"><span>${icon('trophy',20)} MISJA UKOŃCZONA</span><strong>${next?'Gotowy na kolejne wyzwanie?':'Świetnie — ta ścieżka jest ukończona!'}</strong><button class="btn btn-primary" ${next?`data-mission="${next.id}"`:`data-subject="${m.subject}"`}>${next?'Następna misja':'Wróć do ścieżki'} ${icon('arrow',16)}</button></div>`:''}</section><aside class="lesson-aside"><section class="aside-card learning-goal"><span class="overline">CEL TEJ MISJI</span><div class="goal-icon" style="--subject-color:${s.color}">${icon(s.icon,24)}</div><h3>${escapeHtml(m.skill)}</h3><p>Po ćwiczeniu potrafisz samodzielnie zastosować tę umiejętność w nowym problemie.</p><div class="progress-small"><span>Poziom ${m.level} z 3</span><div><i style="width:${m.level/3*100}%"></i></div></div></section><section class="aside-card hint-card"><span class="overline">UTKNĄŁEŚ?</span><h3>${icon('lightbulb',20)} Podpowiedź</h3><p>Wskazówka pomoże znaleźć kolejny krok bez natychmiastowego zdradzania wyniku.</p>${state.hintVisible?`<div class="hint-text">${escapeHtml(m.hint)}</div>`:''}<button class="btn btn-outline btn-block" data-action="hint">${state.hintVisible?'Ukryj wskazówkę':'Pokaż wskazówkę'} ${icon('arrow',16)}</button></section><section class="aside-card tutor-card"><div class="tutor-status"><span class="overline">ASYSTENT NAUKI</span><span class="online-marker ${state.ai.online?'is-online':''}">${state.ai.online?'OLLAMA':'OFFLINE'}</span></div><h3>${icon('sparkle',20)} Zapytaj tutora</h3><p>${state.ai.online?'Model działa lokalnie na Twoim komputerze. Odpowiedzi mogą zawierać błędy.':'Brak połączenia z lokalnym modelem. Wskazówki i sprawdzanie działają niezależnie.'}</p><textarea id="tutor-input" rows="3" maxlength="800" placeholder="Np. Dlaczego moja odpowiedź jest błędna?" ${state.ai.online?'':'disabled'}>${escapeHtml(state.aiQuestion)}</textarea><button class="btn btn-secondary btn-block" data-action="ask-ai" ${state.ai.online&&!state.aiLoading?'':'disabled'}>${state.aiLoading?'Generuję odpowiedź...':'Zapytaj lokalne AI'} ${icon('arrow',16)}</button>${state.aiAnswer?`<div class="tutor-answer">${escapeHtml(state.aiAnswer)}</div>`:''}<button class="tutor-about" data-action="ai-info">Jak włączyć AI lokalnie? ${icon('arrow',14)}</button></section></aside></div>${state.notice?`<div class="toast" role="status">${escapeHtml(state.notice)}</div>`:''}`;
}
function renderProgress() {
  const stats=summarize(progress), next=recommend(progress), recent=[...progress.attempts].reverse().slice(0,8);
  return `<div class="page-title"><span class="overline">DANE Z TWOICH EKSPERYMENTÓW</span><h1>Mapa postępów</h1><p>Nie oceniamy Cię tylko wynikiem. Wracamy do błędów i pokazujemy, które umiejętności wymagają pracy.</p></div><div class="progress-overview"><div class="progress-big"><span>Odkryte misje</span><strong>${stats.done}<small> / ${MISSIONS.length}</small></strong><div class="progress-big-track"><i style="width:${stats.done/MISSIONS.length*100}%"></i></div></div><div class="progress-mini"><span>${icon('target',19)} Trafność prób</span><strong>${stats.attempts?stats.accuracy+'%':'—'}</strong><small>Poprawne odpowiedzi / wszystkie sprawdzenia</small></div><div class="progress-mini"><span>${icon('lightbulb',19)} Korzystanie z podpowiedzi</span><strong>${stats.withHints}</strong><small>Próby, w których potrzebna była wskazówka</small></div></div><section class="section"><div class="section-heading"><div><span class="overline">ANALIZA PRZEDMIOTÓW</span><h2>Co już potrafisz?</h2></div></div><div class="progress-subject-list">${stats.subjectStats.map(s=>`<button class="progress-subject" data-subject="${s.id}"><span class="progress-subject-icon" style="--subject-color:${s.color}">${icon(s.icon,24)}</span><span class="progress-subject-text"><strong>${escapeHtml(s.name)}</strong><small>${s.passed} z ${s.total} misji · ${s.attempts?s.accuracy+'% poprawnych prób':'brak prób'}</small><span class="progress-subject-track"><i style="width:${Math.round(s.passed/s.total*100)}%;background:${s.color}"></i></span></span><span class="progress-subject-count">${s.passed}/${s.total} ${icon('arrow',16)}</span></button>`).join('')}</div></section><section class="progress-bottom"><div class="recommend-box"><span class="overline">REKOMENDACJA</span><h2>Twój następny krok</h2><p>${escapeHtml(next.reason)}</p>${missionCard(next.mission,true)}</div><div class="history-box"><div class="history-head"><span class="overline">OSTATNIE PRÓBY</span><button class="text-button" data-action="clear-progress">Wyczyść dane</button></div>${recent.length?recent.map(a=>{const m=getMission(a.missionId);if(!m)return '';return `<div class="history-row"><span class="history-mark ${a.correct?'good':'bad'}">${icon(a.correct?'check':'close',14)}</span><div><strong>${escapeHtml(m.title)}</strong><small>${new Date(a.at).toLocaleDateString('pl-PL',{day:'2-digit',month:'short'})} · wskazówki: ${a.hintsUsed}</small></div><span>${a.correct?'Dobrze':'Do powtórki'}</span></div>`}).join(''):'<p class="empty-history">Jeszcze nie ma wyników. Uruchom pierwszą misję i sprawdź odpowiedź.</p>'}</div></section>`;
}
function render(){root.innerHTML=shell(({home:renderHome,library:renderLibrary,subject:renderSubject,mission:renderMission,progress:renderProgress}[state.view]||renderHome)());}

function showNotice(message) { state.notice=message; const toast=root.querySelector('.toast'); if(toast)toast.textContent=message;else {const el=document.createElement('div');el.className='toast';el.role='status';el.textContent=message;root.appendChild(el);} }
function selectNode(id) {
  const m=getMission(state.missionId), path=state.answer?.path;
  if (!m||!Array.isArray(path)) return;
  if (m.type==='path') {
    if (!BIO_NODES.some(n=>n.id===id))return;
    if (path.at(-1)===id) { showNotice('Ten element jest już na końcu trasy.');return; }
    if (path.includes(id) && !(id===m.params.path[0]&&path.length===m.params.path.length-1)) { showNotice('Ten element już wybrano. Cofnij lub wyczyść trasę.');return; }
    path.push(id);
  } else if (m.type==='graph') {
    const graph=GRAPHS[m.params.graph];
    if(id===path.at(-2)){path.pop();}else {
      if (path.includes(id)){showNotice('Ten punkt już jest na trasie. Cofnij lub rozpocznij od nowa.');return;}
      if(routeCost(graph,[path.at(-1),id])===null) {showNotice('Nie ma bezpośredniego połączenia między tymi punktami.');return;}
      path.push(id);
    }
  } else return;
  state.result=null; state.notice=''; render();
}
function checkAnswer() {
  const m=getMission(state.missionId);
  if (!m)return;
  if ((m.type==='choice'&&state.answer.selected===null) || (m.type==='path'&&state.answer.path.length===0) || (m.type==='graph'&&state.answer.path.length<2)) {
    showNotice('Najpierw wybierz rozwiązanie.');return;
  }
  state.result=grade(m,state.answer);
  progress.attempts.push({ missionId:m.id, correct:state.result.correct, hintsUsed:state.hintsUsed, at:new Date().toISOString() });
  if (!saveProgress(progress)) state.notice='Przeglądarka nie pozwala zapisać postępów — działają tylko w tej sesji.';
  render();
}
function updateMath() {
  const m=getMission(state.missionId);
  if (!m||m.type!=='linear')return;
  const container=root.querySelector('#math-visual');if(container)container.innerHTML=linearSvg(m,state.answer);
  const e=root.querySelector('.math-equation');if(e)e.innerHTML=`y = <b>${state.answer.a}</b>x ${state.answer.b>=0?'+':'−'} <b>${Math.abs(state.answer.b)}</b>`;
  const a=root.querySelector('#slider-a-val'),b=root.querySelector('#slider-b-val');if(a)a.textContent=state.answer.a;if(b)b.textContent=state.answer.b;
  state.result=null;const feedback=root.querySelector('.feedback');if(feedback)feedback.remove();const next=root.querySelector('.next-challenge');if(next)next.remove();const btn=root.querySelector('[data-action="check"]');if(btn)btn.innerHTML='Sprawdź rozwiązanie '+icon('arrow',17);
}
async function probeAI() {
  try {
    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),2200);
    const r=await fetch('/api/health',{signal:controller.signal});clearTimeout(timer);
    if(!r.ok)return;
    const body=await r.json();state.ai={checked:true,online:body.aiAvailable===true,model:body.model||''}; render();
  } catch {state.ai={checked:true,online:false,model:''};}
}
async function requestPlan() {
  const value=root.querySelector('#plan-input')?.value.trim() || state.planQuery.trim();
  if(!value){showNotice('Wpisz temat, którego chcesz się nauczyć.');return;}
  state.planQuery=value;
  if(!state.ai.online){state.planResult={...matchTopic(value),mode:'offline'};render();return;}
  state.planLoading=true;state.planResult=null;render();
  try {
    const r=await fetch('/api/plan',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({topic:value})});
    const body=await r.json();if(!r.ok)throw Error(body.error||'Brak odpowiedzi AI');
    state.planResult={supported:body.supported===true,subject:body.subject||null,reason:String(body.reason||'').slice(0,500),mode:'ai'};
  }catch(error){state.planResult={...matchTopic(value),mode:'offline'};state.notice='Model AI jest chwilowo niedostępny — zastosowano reguły offline.';}
  finally {state.planLoading=false;render();}
}
async function askAI() {
  if (!state.ai.online || state.aiLoading)return;
  const input=root.querySelector('#tutor-input');const question=input?.value.trim();
  if (!question) {showNotice('Wpisz pytanie do tutora.');return;}
  state.aiQuestion=question;state.aiLoading=true;state.aiAnswer=''; render();
  const m=getMission(state.missionId);
  try {
    const r=await fetch('/api/tutor',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({question,context:{subject:getSubject(m.subject).name,task:m.prompt,hint:m.hint,explanation:m.explanation,attempt:state.answer,result:state.result?.correct??null}})});
    const body=await r.json();if(!r.ok)throw Error(body.error||'Błąd połączenia');
    state.aiAnswer=String(body.reply).slice(0,2400);
  } catch(e) {state.aiAnswer=`Nie udało się uzyskać odpowiedzi modelu: ${e.message}. Spróbuj ponownie albo użyj przygotowanej wskazówki.`;}
  finally {state.aiLoading=false;render();}
}
root.addEventListener('click',event=>{
  const target=event.target.closest('button,[data-node],a[data-view]');if(!target)return;
  if(target.tagName==='A')event.preventDefault();
  if(target.dataset.node){selectNode(target.dataset.node);return;}
  if(target.dataset.view){openView(target.dataset.view);return;}
  if(target.dataset.subject){openView('subject',target.dataset.subject);return;}
  if(target.dataset.mission){startMission(target.dataset.mission);return;}
  if(target.dataset.filter){state.filter=target.dataset.filter;render();return;}
  if(target.dataset.choice!==undefined){state.answer.selected=Number(target.dataset.choice);state.result=null;render();return;}
  const action=target.dataset.action;if(!action)return;
  if(action==='check')checkAnswer();
  else if(action==='hint'){state.hintVisible=!state.hintVisible;if(state.hintVisible)state.hintsUsed=Math.max(state.hintsUsed,1);render();}
  else if(action==='restart'){startMission(state.missionId);}
  else if(action==='undo'){if(state.answer?.path?.length){const m=getMission(state.missionId);if(m.type==='graph'&&state.answer.path.length<=1)return;state.answer.path.pop();state.result=null;render();}}
  else if(action==='reset'){state.answer.path=[];state.result=null;render();}
  else if(action==='ask-ai')askAI();
  else if(action==='plan')requestPlan();
  else if(action==='ai-info'){showNotice('Uruchom „ollama serve”, pobierz model „ollama pull qwen3.5:9b” i wystartuj aplikację poleceniem „npm start” z katalogu repozytorium.');}
  else if(action==='clear-progress'){if(window.confirm('Usunąć wszystkie wyniki zapisane lokalnie w tej przeglądarce?')){progress.attempts=[];saveProgress(progress);render();}}
});
root.addEventListener('input',event=>{
  const field=event.target.dataset.slider;
  if(field==='a'||field==='b'){state.answer[field]=Number(event.target.value);updateMath();}
  if(event.target.id==='tutor-input')state.aiQuestion=event.target.value;
  if(event.target.id==='plan-input')state.planQuery=event.target.value;
});
root.addEventListener('keydown',event=>{
  const node=event.target.closest('[data-node]');if(node&&(event.key==='Enter'||event.key===' ')){event.preventDefault();selectNode(node.dataset.node);}
});
render();probeAI();
