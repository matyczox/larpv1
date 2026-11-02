/** PARADOX ErrorLab: stan, routing (hash), zdarzenia. */
import { SKILLS, BUGS, makeTask } from './catalog.js';
import { fmtSet, pretty } from './math.js';
import { checkStep, checkAnswer, checkFix, judgeExplanation, kubaReply } from './check.js';
import { loadLearner, saveLearner, emptyLearner, record, noteBug, resolveBug, quickRound, assignCondition, startTrial, finishTrial } from './learner.js';
import { initExperiment, updateExperiment, renderExperimentLive } from './experiments.js';
import { layout, homeView, lineView, solveView, fixView, kubaView, labView, roundView, trapsView, progressView, notFound, previewText, answerPlot } from './views.js';

const root = document.querySelector('#app');
const COMPARE_KEY = 'paradox.errorlab.compare';
let learner = loadLearner();
const state = { route: { name: 'home' }, session: null, lab: null, round: null, toast: null, compare: readCompare(), focus: false };
let toastTimer = null;

function readCompare() { try { return localStorage.getItem(COMPARE_KEY) === '1'; } catch { return false; } }
const persist = () => { if (!saveLearner(learner)) toast('Przeglądarka blokuje zapis. Postępy zostaną tylko do zamknięcia karty.'); };
const newSeed = () => 1 + Math.floor(Math.random() * 1e6);
const correctText = t => (t.kind === 'set' ? fmtSet(t.answer.set) : pretty(t.steps.at(-1)));

/* ---------- Routing ---------- */

export function parseRoute(hash) {
  const p = String(hash || '').replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  if (!p.length) return { name: 'home' };
  if (p[0] === 'linia' && p[1]) return { name: 'line', id: p[1] };
  if (p[0] === 'u' && p[1]) return { name: 'skill', id: p[1], mode: p[2] === 'napraw' ? 'fix' : p[2] === 'kuba' ? 'kuba' : 'solve', bug: p[3] || null };
  if (p[0] === 'lab' && p[1] && p[2]) return { name: 'lab', id: p[1], bug: p[2] };
  if (p[0] === 'runda') return { name: 'round' };
  if (p[0] === 'pulapki') return { name: 'traps' };
  if (p[0] === 'postepy') return { name: 'progress' };
  return { name: 'missing' };
}

function newSession(skill, mode, bug = null) {
  if (!SKILLS[skill]) return null;
  if (mode === 'fix' && SKILLS[skill].answerOnly) mode = 'solve';
  const seed = newSeed();
  const task = makeTask(skill, seed, bug && SKILLS[skill].bugIds.includes(bug) ? bug : null);
  const pick = bug && task.bugs.some(b => b.id === bug) ? bug : task.bugs[seed % task.bugs.length].id;
  return {
    task, mode, input: '', lines: [], done: false, hint: 0, hadWrong: false, answerResult: null,
    fixBug: pick, fixSel: null, fixInput: '', fixResult: null, fixFailed: false,
    kuba: { bug: pick, chat: [], known: [], understood: false, draft: '' },
  };
}

function newLab(skill, bug) {
  if (!SKILLS[skill] || !BUGS[bug] || !SKILLS[skill].bugIds.includes(bug)) return null;
  const task = makeTask(skill, newSeed(), bug);
  const condition = state.compare ? assignCondition(learner) : 'experiment';
  const trial = state.compare ? startTrial(learner, { bug, skill, condition }) : null;
  if (trial) persist();
  return { skill, bug, stage: 'help', condition, trialId: trial?.id || null, task, exp: initExperiment(task, bug), chat: [], known: [], understood: false, draft: '', transfer: null, input: '', msg: null };
}

function newRound() {
  const items = quickRound(learner);
  return { items, i: 0, task: makeTask(items[0].skill, newSeed(), items[0].bug), input: '', results: [], feedback: null, msg: null };
}

function onRoute() {
  const r = parseRoute(globalThis.location?.hash);
  const changed = JSON.stringify(r) !== JSON.stringify(state.route);
  state.route = r;
  if (r.name === 'skill' && (changed || !state.session)) state.session = newSession(r.id, r.mode, r.bug);
  if (r.name === 'lab' && (changed || !state.lab)) state.lab = newLab(r.id, r.bug);
  if (r.name === 'round' && (!state.round || state.round.i >= state.round.items.length)) state.round = newRound();
  render();
  if (changed) {
    try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch { /* brak przewijania */ }
    const t = { home: 'Mapa', line: 'Dział', skill: SKILLS[r.id]?.name, lab: BUGS[r.bug]?.name, round: 'Szybka runda', traps: 'Pułapki', progress: 'Postępy' }[r.name];
    if (globalThis.document) document.title = `${t || 'PARADOX'} · PARADOX ErrorLab`;
  }
}

/* ---------- Render ---------- */

function page() {
  const ctx = { state, learner };
  const r = state.route;
  if (r.name === 'home') return homeView(ctx);
  if (r.name === 'line') return lineView(ctx, r.id);
  if (r.name === 'skill') {
    if (!state.session) return notFound();
    return { solve: solveView, fix: fixView, kuba: kubaView }[state.session.mode](ctx);
  }
  if (r.name === 'lab') return state.lab ? labView(ctx) : notFound();
  if (r.name === 'round') return roundView(ctx);
  if (r.name === 'traps') return trapsView(ctx);
  if (r.name === 'progress') return progressView(ctx);
  return notFound();
}

function render() {
  root.innerHTML = layout({ state, learner }, page());
  if (state.focus) {
    state.focus = false;
    root.querySelector?.('[data-autofocus]')?.focus?.();
  }
}

function toast(message) {
  state.toast = message;
  render();
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { state.toast = null; render(); }, 4200);
  toastTimer.unref?.();
}

/* ---------- Akcje: krok po kroku ---------- */

function finishSolve(s) {
  s.done = true;
  record(learner, { skill: s.task.skill, mode: 'solve', correct: !s.hadWrong && s.hint < 2 });
  persist();
}

function stepAdd() {
  const s = state.session, text = s.input.trim();
  if (!text) { toast('Wpisz krok rozwiązania.'); return; }
  const res = checkStep(s.task, text);
  if (res.status === 'parse' || res.status === 'kind') { toast(res.error); return; }
  if (res.status === 'ok') {
    s.lines.push({ text, status: 'ok', done: res.done });
    s.input = '';
    if (res.done) finishSolve(s);
  } else {
    s.lines.push({ text, status: 'wrong', bug: res.bug });
    s.hadWrong = true;
    if (res.bug) { noteBug(learner, res.bug); persist(); }
  }
  state.focus = true;
  render();
}

function answerCheck() {
  const s = state.session;
  const res = checkAnswer(s.task, s.input);
  if (res.status === 'parse' || res.status === 'kind') { toast(res.error); return; }
  if (res.status === 'unfinished') { toast('To jeszcze nie jest wynik. Zapisz wzór w postaci y = ax + b.'); return; }
  if (res.status === 'ok') { s.answerResult = null; finishSolve(s); }
  else {
    s.hadWrong = true;
    s.answerResult = res.bug ? `To nie ten wzór. Wygląda na pułapkę ${res.bug}: ${BUGS[res.bug].name}.` : 'To nie ten wzór. Sprawdź, czy prosta przechodzi przez oba punkty.';
    if (res.bug) { noteBug(learner, res.bug); persist(); }
  }
  render();
}

/* ---------- Akcje: napraw błąd, Kuba ---------- */

function fixLine(i) {
  const s = state.session, bug = s.task.bugs.find(b => b.id === s.fixBug);
  if (i !== bug.idx) { s.fixFailed = true; s.fixSel = null; s.fixResult = checkFix(s.task, bug, i, ''); }
  else { s.fixSel = i; s.fixResult = null; state.focus = true; }
  render();
}

function fixCheck() {
  const s = state.session, bug = s.task.bugs.find(b => b.id === s.fixBug);
  const res = checkFix(s.task, bug, s.fixSel, s.fixInput);
  if (res.status === 'parse') { toast(res.message); return; }
  s.fixResult = res;
  if (res.status === 'ok') { record(learner, { skill: s.task.skill, mode: 'fix', correct: !s.fixFailed }); persist(); }
  else s.fixFailed = true;
  render();
}

/** k: obiekt z polami bug, chat, known, understood, draft (sesja albo laboratorium). */
function kubaSend(k, onUnderstood) {
  const text = k.draft.trim();
  if (!text) { toast('Napisz Kubie wyjaśnienie.'); return; }
  const judged = judgeExplanation(k.bug, text);
  const reply = kubaReply(k.bug, k.known, judged);
  k.chat.push({ who: 'you', text });
  k.known = reply.known;
  if (reply.understood) { k.understood = true; k.chat.push({ who: 'kuba', text: BUGS[k.bug].kuba.success }); onUnderstood?.(); }
  else k.chat.push({ who: 'kuba', text: reply.text });
  k.draft = '';
  state.focus = true;
  render();
}

/* ---------- Akcje: laboratorium ---------- */

function labNext() {
  const lab = state.lab;
  if (lab.stage === 'help') lab.stage = 'kuba';
  else if (lab.stage === 'kuba') { lab.stage = 'transfer'; lab.transfer = makeTask(lab.skill, newSeed(), lab.bug); lab.input = ''; state.focus = true; }
  render();
}

function labAnswer() {
  const lab = state.lab;
  const res = checkAnswer(lab.transfer, lab.input);
  if (res.status === 'parse' || res.status === 'kind') { lab.msg = res.error; render(); return; }
  if (res.status === 'unfinished') { lab.msg = 'To jeszcze nie jest wynik. Doprowadź odpowiedź do końca.'; render(); return; }
  const ok = res.status === 'ok';
  record(learner, { skill: lab.skill, mode: 'transfer', correct: ok, bug: res.bug || null });
  if (ok) resolveBug(learner, lab.bug);
  if (lab.trialId) finishTrial(learner, lab.trialId, ok);
  persist();
  Object.assign(lab, { stage: 'done', outcome: ok, msg: null, answerText: pretty(lab.input), correctText: correctText(lab.transfer), repeat: res.bug ? `${res.bug}: ${BUGS[res.bug].name}` : null });
  render();
}

/* ---------- Akcje: szybka runda ---------- */

function roundCheck() {
  const r = state.round, t = r.task;
  const res = checkAnswer(t, r.input);
  if (res.status === 'parse' || res.status === 'kind') { r.msg = res.error; render(); return; }
  if (res.status === 'unfinished') { r.msg = 'To jeszcze nie jest wynik. Podaj odpowiedź w końcowej postaci.'; render(); return; }
  const correct = res.status === 'ok';
  record(learner, { skill: t.skill, mode: 'round', correct, bug: res.bug || null });
  persist();
  r.results.push({ skill: t.skill, correct, bug: res.bug || null });
  r.msg = null;
  r.feedback = { correct, text: correct ? `Wynik: ${correctText(t)}.` : `${res.bug ? `To pułapka ${res.bug}: ${BUGS[res.bug].name}. ` : ''}Poprawny wynik: ${correctText(t)}.` };
  state.focus = true;
  render();
}

function roundNext() {
  const r = state.round;
  r.i += 1; r.feedback = null; r.input = ''; r.msg = null;
  if (r.i < r.items.length) r.task = makeTask(r.items[r.i].skill, newSeed(), r.items[r.i].bug);
  state.focus = true;
  render();
}

/* ---------- Zdarzenia ---------- */

function insertSymbol(el) {
  const input = globalThis.document?.getElementById?.(el.dataset.target);
  if (!input) return;
  const ins = el.dataset.ins, start = input.selectionStart ?? input.value.length, end = input.selectionEnd ?? start;
  if (input.setRangeText) input.setRangeText(ins, start, end, 'end'); else input.value += ins;
  input.focus();
  onInput({ target: input });
}

function act(name, el = { dataset: {} }) {
  const s = state.session, lab = state.lab;
  if (name === 'step-add') stepAdd();
  else if (name === 'answer-check') answerCheck();
  else if (name === 'hint' && s) { s.hint = s.hint ? 0 : 1; render(); }
  else if (name === 'hint-step' && s) { s.hint = 2; render(); }
  else if (name === 'new-task' && s) { state.session = newSession(s.task.skill, s.mode); render(); }
  else if (name === 'fix-line' && s) fixLine(Number(el.dataset.i));
  else if (name === 'fix-check' && s) fixCheck();
  else if (name === 'kuba-send') {
    if (state.route.name === 'lab' && lab) kubaSend(lab, null);
    else if (s) kubaSend(s.kuba, () => { record(learner, { skill: s.task.skill, mode: 'kuba', correct: true }); persist(); });
  }
  else if (name.startsWith('exp-') && lab) { updateExperiment(lab.task, lab.exp, name.slice(4), el.dataset.key ?? el.dataset.value); render(); }
  else if (name === 'lab-next' && lab) labNext();
  else if (name === 'lab-answer' && lab) labAnswer();
  else if (name === 'lab-restart' && lab) { state.lab = newLab(lab.skill, lab.bug); render(); }
  else if (name === 'round-check') roundCheck();
  else if (name === 'round-next') roundNext();
  else if (name === 'round-new') { state.round = newRound(); render(); }
  else if (name === 'compare-toggle') { state.compare = !!el.checked; try { localStorage.setItem(COMPARE_KEY, state.compare ? '1' : '0'); } catch { /* tryb prywatny */ } render(); }
  else if (name === 'export') exportData();
  else if (name === 'clear-progress') {
    if (window.confirm('Usunąć wszystkie wyniki i dane porównania zapisane w tej przeglądarce?')) { learner = emptyLearner(); persist(); render(); }
  }
}

function onClick(event) {
  const el = event.target.closest?.('[data-act]');
  if (!el) return;
  if (el.dataset.act === 'key') { event.preventDefault?.(); insertSymbol(el); return; }
  act(el.dataset.act, el);
}

function onInput(event) {
  const t = event.target, d = t.dataset || {};
  const s = state.session, lab = state.lab, r = state.round;
  if (d.math) {
    const v = t.value;
    if (d.math === 'step' || d.math === 'answer') s.input = v;
    if (d.math === 'fix') s.fixInput = v;
    if (d.math === 'transfer') lab.input = v;
    if (d.math === 'round') r.input = v;
    const pv = root.querySelector?.(`#pv-${d.math}`);
    if (pv) pv.innerHTML = previewText(v);
    const task = d.math === 'answer' ? s.task : d.math === 'transfer' ? lab.transfer : d.math === 'round' ? r.task : null;
    const ap = root.querySelector?.('#answer-plot');
    if (task?.points && ap) ap.outerHTML = answerPlot(task, v);
    return;
  }
  if ('kuba' in d) { if (state.route.name === 'lab' && lab) lab.draft = t.value; else if (s) s.kuba.draft = t.value; return; }
  if (d.exp && lab) {
    updateExperiment(lab.task, lab.exp, d.exp, t.value);
    const out = t.parentElement?.querySelector?.('output');
    if (out) out.textContent = String(t.value).replace('-', '−');
    const live = root.querySelector?.('#exp-live');
    if (live) live.innerHTML = renderExperimentLive(lab.task, lab.exp);
    return;
  }
  if (d.expInput && lab) lab.exp[d.expInput] = t.value;
}

function onKey(event) {
  const t = event.target;
  if (event.key !== 'Enter' || !t?.dataset) return;
  if (t.dataset.submit) { event.preventDefault(); act(t.dataset.submit); }
  else if ('kuba' in t.dataset && (event.ctrlKey || event.metaKey)) { event.preventDefault(); act('kuba-send'); }
}

function exportData() {
  const doc = globalThis.document;
  if (!doc?.createElement || !globalThis.Blob || !globalThis.URL?.createObjectURL) { toast('Eksport nie jest dostępny w tej przeglądarce.'); return; }
  const blob = new Blob([JSON.stringify({ exported: new Date().toISOString(), ...learner }, null, 2)], { type: 'application/json' });
  const a = doc.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `paradox-errorlab-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

root.addEventListener('click', onClick);
root.addEventListener('input', onInput);
root.addEventListener('keydown', onKey);
window.addEventListener?.('hashchange', onRoute);

onRoute();
