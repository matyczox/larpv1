/** PARADOX — punkt wejścia: stan, routing (hash), zdarzenia. */
import { BIO_NODES, GRAPHS, getMission, getSubject } from './data.js';
import { grade, routeCost, readProgress, saveProgress, matchTopic } from './engine.js';
import { defaultAnswer, isAnswerEmpty, linearPlot, equation, pointChecks, dijkstraTrace } from './activities.js';
import { layout, homeView, labsView, subjectView, missionView, progressView, notFound, THEMES } from './views.js';

/* ---------- Motyw ---------- */
const THEME_KEY = 'paradox.theme';
function initialTheme() {
  let t = null;
  try { t = new URLSearchParams(globalThis.location?.search || '').get('theme') || localStorage.getItem(THEME_KEY); } catch { /* brak dostępu do pamięci */ }
  return THEMES.some(x => x.id === t) ? t : THEMES[0].id;
}
let theme = initialTheme();
function applyTheme(t) {
  theme = t;
  try { localStorage.setItem(THEME_KEY, t); } catch { /* tryb prywatny */ }
  const html = globalThis.document?.documentElement;
  if (html) html.dataset.theme = t;
  const link = globalThis.document?.getElementById?.('theme-css');
  if (link) link.href = `./assets/themes/${t}.css`;
}

const root = document.querySelector('#app');
const progress = readProgress();
const state = {
  route: { name: 'home' },
  filter: 'all',
  session: null,
  ai: { online: false, model: '' },
  plan: { query: '', result: null, loading: false },
  toast: null,
};
let toastTimer = null;

/* ---------- Routing ---------- */

export function parseRoute(hash) {
  const parts = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean);
  if (!parts.length) return { name: 'home' };
  if (parts[0] === 'labs') return parts[1] ? { name: 'subject', id: parts[1] } : { name: 'labs' };
  if (parts[0] === 'm' && parts[1]) return { name: 'mission', id: parts[1] };
  if (parts[0] === 'progress') return { name: 'progress' };
  return { name: 'missing' };
}

function newSession(id) {
  const m = getMission(id);
  return m ? { id, answer: defaultAnswer(m), result: null, hint: false, hintsUsed: 0, trace: null, aiQ: '', aiA: '', aiLoading: false } : null;
}

function onRoute() {
  const route = parseRoute(globalThis.location?.hash);
  const changed = route.name !== state.route.name || route.id !== state.route.id;
  state.route = route;
  if (route.name === 'mission' && state.session?.id !== route.id) state.session = newSession(route.id);
  render();
  if (changed) {
    try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch { /* środowisko bez przewijania */ }
    const titles = { home: 'Start', labs: 'Laboratoria', progress: 'Postępy', subject: getSubject(route.id)?.name, mission: getMission(route.id)?.title };
    if (globalThis.document) document.title = `${titles[route.name] || 'PARADOX'} · PARADOX`;
  }
}

/* ---------- Render ---------- */

function page() {
  const ctx = { state, progress, theme };
  const r = state.route;
  if (r.name === 'home') return homeView(ctx);
  if (r.name === 'labs') return labsView(ctx);
  if (r.name === 'subject') return subjectView(ctx, r.id);
  if (r.name === 'mission') return state.session ? missionView(ctx, r.id) : notFound();
  if (r.name === 'progress') return progressView(ctx);
  return notFound();
}

function render() {
  root.innerHTML = layout({ state, progress, theme }, page());
  // Animacja „wejścia” tylko przy pierwszym pokazaniu elementu.
  if (state.session) state.session.fresh = false;
  state.plan.fresh = false;
}

function toast(message) {
  state.toast = message;
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toast = null; render(); }, 3800);
  toastTimer.unref?.();
}

/* ---------- Ćwiczenia ---------- */

const mission = () => state.session && getMission(state.session.id);

function invalidate() {
  const s = state.session;
  s.result = null;
  s.trace = null;
}

function selectNode(id) {
  const m = mission(), s = state.session;
  if (!m || s.trace) return;
  const path = s.answer.path;
  if (m.type === 'path') {
    if (!BIO_NODES.some(n => n.id === id)) return;
    if (path.at(-1) === id) { path.pop(); invalidate(); render(); return; }
    const closesLoop = id === m.params.path[0] && path.length === m.params.path.length - 1;
    if (path.includes(id) && !closesLoop) { toast('Ta struktura jest już na trasie. Cofnij krok albo wyczyść trasę.'); return; }
    path.push(id);
  } else if (m.type === 'graph') {
    const graph = GRAPHS[m.params.graph];
    if (id === path.at(-1) && path.length > 1) { path.pop(); }
    else if (id === path.at(-2)) { path.pop(); }
    else {
      if (path.includes(id)) { toast('Ten węzeł już jest na trasie.'); return; }
      if (routeCost(graph, [path.at(-1), id]) === null) { toast(`Z ${path.at(-1)} nie ma bezpośredniej krawędzi do ${id}.`); return; }
      path.push(id);
    }
  } else return;
  invalidate();
  render();
}

function check() {
  const m = mission(), s = state.session;
  if (!m) return;
  if (isAnswerEmpty(m, s.answer)) { toast('Najpierw zbuduj odpowiedź.'); return; }
  s.trace = null;
  s.result = grade(m, s.answer);
  s.fresh = true;
  progress.attempts.push({ missionId: m.id, correct: s.result.correct, hintsUsed: s.hintsUsed, at: new Date().toISOString() });
  if (!saveProgress(progress)) toast('Przeglądarka blokuje zapis — postępy zostaną tylko do zamknięcia karty.');
  else render();
}

function setSlider(key, value) {
  const m = mission(), s = state.session;
  if (!m || m.type !== 'linear') return;
  const limits = key === 'a' ? [-4, 4] : [-5, 5];
  s.answer[key] = Math.max(limits[0], Math.min(limits[1], value));
  const hadResult = !!s.result;
  invalidate();
  // Aktualizacja punktowa — nie przerywa przeciągania suwaka.
  const q = sel => root.querySelector?.(sel);
  const plot = q('#plot');
  if (!plot || hadResult) { render(); return; }
  plot.innerHTML = linearPlot(m, s.answer);
  q('#eq').innerHTML = equation(s.answer);
  q('#pt-checks').innerHTML = pointChecks(m, s.answer);
  q(`#o-${key}`).textContent = String(s.answer[key]).replace('-', '−');
  const input = q(`#s-${key}`);
  if (input && Number(input.value) !== s.answer[key]) input.value = s.answer[key];
}

/* ---------- AI ---------- */

async function probeAI() {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const r = await fetch('/api/health', { signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return;
    const body = await r.json();
    state.ai = { online: body.aiAvailable === true, model: String(body.model || '') };
    if (state.ai.online) render();
  } catch { state.ai = { online: false, model: '' }; }
}

async function plan(topic) {
  const value = String(topic || '').trim();
  if (!value) { toast('Wpisz temat, którego chcesz się nauczyć.'); return; }
  state.plan.query = value;
  if (!state.ai.online) { state.plan.result = { ...matchTopic(value), mode: 'offline' }; state.plan.fresh = true; render(); return; }
  state.plan.loading = true; state.plan.result = null; render();
  try {
    const r = await fetch('/api/plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ topic: value }) });
    const body = await r.json();
    if (!r.ok) throw Error(body.error);
    state.plan.result = { supported: body.supported === true, subject: body.subject || null, reason: String(body.reason || '').slice(0, 500), mode: 'ai' };
  } catch {
    state.plan.result = { ...matchTopic(value), mode: 'offline' };
  } finally { state.plan.loading = false; state.plan.fresh = true; render(); }
}

async function askTutor(question) {
  const m = mission(), s = state.session;
  const q = String(question || '').trim();
  if (!m || !state.ai.online || s.aiLoading) return;
  if (!q) { toast('Wpisz pytanie do tutora.'); return; }
  s.aiQ = q; s.aiLoading = true; s.aiA = ''; render();
  try {
    const r = await fetch('/api/tutor', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, context: { subject: getSubject(m.subject).name, task: m.prompt, hint: m.hint, explanation: m.explanation, attempt: s.answer, result: s.result?.correct ?? null } }) });
    const body = await r.json();
    if (!r.ok) throw Error(body.error || 'Błąd połączenia');
    s.aiA = String(body.reply).slice(0, 2400);
  } catch (e) {
    s.aiA = `Nie udało się uzyskać odpowiedzi: ${e.message}. Skorzystaj z podpowiedzi albo spróbuj ponownie.`;
  } finally { s.aiLoading = false; if (state.session === s) render(); }
}

/* ---------- Zdarzenia ---------- */

function onClick(event) {
  const el = event.target.closest?.('[data-act],[data-node],[data-choice]');
  if (!el) return;
  const s = state.session;
  if (el.dataset.node) { selectNode(el.dataset.node); return; }
  if (el.dataset.choice !== undefined && s) { s.answer.selected = Number(el.dataset.choice); invalidate(); render(); return; }
  const act = el.dataset.act;
  if (act === 'theme') { applyTheme(el.dataset.value); render(); }
  else if (act === 'filter') { state.filter = el.dataset.value; render(); }
  else if (act === 'plan-try') { plan(el.dataset.topic); }
  else if (act === 'check') check();
  else if (act === 'restart' && s) { state.session = newSession(s.id); render(); }
  else if (act === 'hint' && s) { s.hint = !s.hint; s.fresh = s.hint; if (s.hint) s.hintsUsed = 1; render(); }
  else if (act === 'nudge' && s) setSlider(el.dataset.key, s.answer[el.dataset.key] + Number(el.dataset.delta));
  else if (act === 'undo' && s) { const m = mission(); if (s.answer.path.length > (m.type === 'graph' ? 1 : 0)) { s.answer.path.pop(); invalidate(); render(); } }
  else if (act === 'clear' && s) { s.answer.path = []; invalidate(); render(); }
  else if (act === 'trace' && s) { const m = mission(); s.trace = { steps: dijkstraTrace(GRAPHS[m.params.graph], m.params.start), index: 0 }; render(); }
  else if (act === 'trace-next' && s?.trace) { s.trace.index = Math.min(s.trace.steps.length - 1, s.trace.index + 1); render(); }
  else if (act === 'trace-prev' && s?.trace) { s.trace.index = Math.max(0, s.trace.index - 1); render(); }
  else if (act === 'trace-close' && s) { s.trace = null; render(); }
  else if (act === 'clear-progress') {
    if (window.confirm('Usunąć wszystkie wyniki zapisane w tej przeglądarce?')) { progress.attempts = []; saveProgress(progress); render(); }
  }
}

function onSubmit(event) {
  const form = event.target.closest?.('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const field = form.querySelector('input,textarea');
  if (form.dataset.form === 'plan') plan(field?.value);
  if (form.dataset.form === 'tutor') askTutor(field?.value);
}

function onInput(event) {
  const t = event.target;
  if (t.dataset?.slider) setSlider(t.dataset.slider, Number(t.value));
  else if (t.id === 'plan-input') state.plan.query = t.value;
  else if (t.id === 'tutor-input' && state.session) state.session.aiQ = t.value;
}

function onKey(event) {
  const t = event.target;
  const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA');
  const node = t?.closest?.('[data-node]');
  if (node && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); selectNode(node.dataset.node); return; }
  if (typing || event.ctrlKey || event.metaKey || event.altKey) return;
  const m = mission();
  if (state.route.name !== 'mission' || !m) return;
  if (m.type === 'choice' && /^[1-4]$/.test(event.key)) { state.session.answer.selected = Number(event.key) - 1; invalidate(); render(); }
}

root.addEventListener('click', onClick);
root.addEventListener('submit', onSubmit);
root.addEventListener('input', onInput);
window.addEventListener?.('keydown', onKey);
window.addEventListener?.('hashchange', onRoute);

applyTheme(theme);
onRoute();
probeAI();
