/** Widoki. Każda funkcja zwraca HTML na podstawie stanu. */
import { LINES, SKILLS, BUGS, lineOf, skillsOfBug } from './catalog.js';
import { pretty, fmtSet, parseExpr } from './math.js';
import { mastery, attemptsOf, bugStatus, activeBugs, recommend, lineProgress, trialSummary, MASTERY } from './learner.js';
import { renderExperiment, experimentTitle, plot } from './experiments.js';
import { metroMap } from './art.js';
import { esc, icon } from './ui.js';

const pct = p => `${Math.round(p * 100)}%`;
const lineStyle = id => `style="--c:var(--${id})"`;
const tries = n => `${n} ${n === 1 ? 'próba' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'próby' : 'prób'}`;
const STATUS = { unseen: 'nie wykryto', active: 'aktywna', resolved: 'rozbrojona' };

/* ---------- Szkielet ---------- */

export function layout(ctx, page) {
  const { state } = ctx;
  const n = state.route.name;
  const cur = (...names) => (names.includes(n) ? 'aria-current="page"' : '');
  const nav = `<a href="#/" ${cur('home', 'line', 'skill', 'lab')}>${icon('home')}<span>Mapa</span></a><a href="#/runda" ${cur('round')}>${icon('bolt')}<span>Szybka runda</span></a><a href="#/pulapki" ${cur('traps')}>${icon('warn')}<span>Pułapki</span></a><a href="#/postepy" ${cur('progress')}>${icon('progress')}<span>Postępy</span></a>`;
  return `<header class="topbar"><div class="wrap topbar-in"><a class="brand" href="#/" aria-label="PARADOX ErrorLab, mapa"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" width="30" height="30"><rect width="32" height="32" rx="9" class="bm-bg"/><path d="M10 24V8h7a5 5 0 0 1 0 10h-7" class="bm-p"/><circle cx="23" cy="23" r="3" class="bm-dot"/></svg></span><span class="brand-name">paradox <small>ErrorLab</small></span></a><nav class="nav" aria-label="Główna nawigacja">${nav}</nav><span class="ai-chip" title="Wyjaśnienia ocenia moduł offline oparty na słowach kluczowych">Tryb offline</span></div></header>
  <main class="wrap main" id="main" tabindex="-1">${page}</main>
  <footer class="wrap footer"><span>PARADOX ErrorLab: matematyka na maturze podstawowej. Matematykę sprawdza silnik algebraiczny, a nie model językowy. Postępy zapisują się tylko w tej przeglądarce.</span></footer>
  <nav class="tabbar" aria-label="Nawigacja mobilna">${nav}</nav>
  ${state.toast ? `<div class="toast" role="status">${esc(state.toast)}</div>` : ''}`;
}

/* ---------- Pole do wpisywania matematyki ---------- */

const KEYS = {
  expr: [['x²', '^2'], ['(', '('], [')', ')'], ['·', '*'], ['/', '/']],
  set: [['x²', '^2'], ['≤', '≤'], ['≥', '≥'], ['∈', '∈'], ['∪', '∪'], ['∞', '∞'], ['⟨', '⟨'], ['⟩', '⟩'], [';', ';'], ['lub', ' lub ']],
};

export function mathField(name, value, { kind = 'expr', submit, label, placeholder = '', button = 'Sprawdź', autofocus = false } = {}) {
  return `<div class="math-field">
    <label for="mi-${name}" class="mf-label">${esc(label)}</label>
    <div class="mf-row"><input id="mi-${name}" class="math-in" data-math="${name}" data-submit="${submit}" value="${esc(value)}" placeholder="${esc(placeholder)}" autocomplete="off" autocapitalize="off" spellcheck="false" ${autofocus ? 'data-autofocus' : ''}/><button class="btn btn-primary" data-act="${submit}">${esc(button)}</button></div>
    <div class="mf-tools"><div class="keypad" role="group" aria-label="Symbole">${KEYS[kind].map(([l, ins]) => `<button type="button" class="key" data-act="key" data-target="mi-${name}" data-ins="${esc(ins)}" tabindex="-1">${esc(l)}</button>`).join('')}</div><output class="math-preview" id="pv-${name}" aria-live="polite">${previewText(value)}</output></div>
  </div>`;
}

export function previewText(value) {
  if (!String(value || '').trim()) return '';
  return `Czytam: ${esc(pretty(value))}`;
}

/* ---------- Mapa (start) ---------- */

export function homeView({ learner: L }) {
  const next = recommend(L);
  const active = activeBugs(L);
  const ns = SKILLS[next.skill];
  return `<section class="hero hero-linie">
    <div class="l-head"><h1>Matura z matematyki bez pułapek</h1><p class="lead">Rozwiązujesz zadanie krok po kroku, a silnik sprawdza każde przekształcenie. Gdy wpadniesz w typową pułapkę, PARADOX rozpozna ją po nazwie i przygotuje eksperyment, który pokaże, skąd bierze się błąd.</p></div>
    <div class="metro-wrap">${metroMap(L, next.skill)}</div>
    <div class="l-strips">${LINES.map(l => { const p = lineProgress(L, l.id); return `<a class="l-strip" href="#/linia/${l.id}" ${lineStyle(l.id)}><span class="l-badge">${l.badge}</span><span><strong>${esc(l.name)}</strong><small>${p.done} z ${p.total} stacji opanowane</small></span></a>`; }).join('')}</div>
    <div class="home-actions">
      <a class="btn btn-primary btn-lg" href="#/u/${next.skill}">${next.bug ? 'Wróć do pułapki' : 'Następna stacja'}: ${esc(ns.name)}</a>
      <a class="btn btn-ghost btn-lg" href="#/runda">${icon('bolt', 17)} Szybka runda, 5 zadań</a>
    </div>
    <p class="muted">${esc(next.reason)}</p>
  </section>
  ${active.length ? `<section class="section"><h2>Pułapki do rozbrojenia</h2><ul class="trap-list">${active.slice(0, 4).map(id => trapRow(id)).join('')}</ul></section>` : ''}
  <section class="section how-modes">
    <h2>Trzy sposoby ćwiczenia każdej stacji</h2>
    <dl class="modes">
      <div><dt>Krok po kroku</dt><dd>Wpisujesz kolejne przekształcenia. Każde jest sprawdzane: czy nie zmienia zbioru rozwiązań albo wartości wyrażenia.</dd></div>
      <div><dt>Napraw błąd</dt><dd>Dostajesz rozwiązanie z jednym typowym błędem. Wskazujesz pierwszy zły krok i go poprawiasz.</dd></div>
      <div><dt>Naucz Kubę</dt><dd>Kuba to symulowany uczeń, który ma konkretną pułapkę. Przekonujesz go wyjaśnieniem, gdzie popełnia błąd.</dd></div>
    </dl>
  </section>`;
}

function trapRow(id) {
  const b = BUGS[id], skill = skillsOfBug(id)[0];
  return `<li class="trap-row"><span class="trap-id">${id}</span><span class="trap-text"><strong>${esc(b.name)}</strong><small>${esc(b.example)}</small></span><a class="btn btn-primary btn-sm" href="#/lab/${skill}/${id}">Rozbrój</a></li>`;
}

/* ---------- Dział ---------- */

export function lineView({ learner: L }, lineId) {
  const line = LINES.find(l => l.id === lineId);
  if (!line) return notFound();
  return `<a class="crumb" href="#/">${icon('back', 15)} Mapa</a>
  <header class="subject-head" ${lineStyle(line.id)}><span class="l-badge big" aria-hidden="true">${line.badge}</span><div class="sh-text"><h1>${esc(line.name)}</h1><p class="lead">Trzy stacje. Na każdej możesz ćwiczyć krok po kroku, naprawiać cudze błędy albo uczyć Kubę.</p></div></header>
  <ol class="trail" ${lineStyle(line.id)}>${line.skills.map((id, i) => {
    const s = SKILLS[id], p = mastery(L, id), ok = p >= MASTERY;
    return `<li class="${ok ? 'done' : ''}"><span class="trail-dot" aria-hidden="true">${ok ? icon('check', 16) : i + 1}</span><div class="trail-card"><a href="#/u/${id}"><strong>${esc(s.name)}</strong></a><p>${esc(s.hint)}</p><small>${attemptsOf(L, id) ? `Opanowanie ${pct(p)}, ${tries(attemptsOf(L, id))}.` : 'Jeszcze bez prób.'} Pułapki: ${s.bugIds.map(b => `${b} (${STATUS[bugStatus(L, b)]})`).join(', ')}.</small><div class="trail-links"><a href="#/u/${id}">Krok po kroku</a>${s.answerOnly ? '' : `<a href="#/u/${id}/napraw">Napraw błąd</a>`}<a href="#/u/${id}/kuba">Naucz Kubę</a></div></div></li>`;
  }).join('')}</ol>`;
}

/* ---------- Stacja: wspólny nagłówek i panel boczny ---------- */

function skillHeader(skillId, mode) {
  const s = SKILLS[skillId], line = lineOf(skillId);
  const tab = (m, label, href) => `<a href="${href}" class="tab ${mode === m ? 'on' : ''}" ${mode === m ? 'aria-current="page"' : ''}>${label}</a>`;
  return `<div class="mission-top" ${lineStyle(line.id)}><a class="crumb" href="#/linia/${line.id}">${icon('back', 15)} ${esc(line.name)}</a></div>
  <header class="mission-head" ${lineStyle(line.id)}><span class="m-pos">${esc(line.name)}</span><h1>${esc(s.name)}</h1></header>
  <nav class="tabs" aria-label="Tryb ćwiczenia" ${lineStyle(line.id)}>${tab('solve', 'Krok po kroku', `#/u/${skillId}`)}${s.answerOnly ? '' : tab('fix', 'Napraw błąd', `#/u/${skillId}/napraw`)}${tab('kuba', 'Naucz Kubę', `#/u/${skillId}/kuba`)}</nav>`;
}

function sidePanel(L, skillId, extra = '') {
  const s = SKILLS[skillId], p = mastery(L, skillId);
  return `<aside class="mission-side">
    <section class="panel"><h3>Opanowanie</h3><div class="meter" role="meter" aria-valuenow="${Math.round(p * 100)}" aria-valuemin="0" aria-valuemax="100" aria-label="Opanowanie umiejętności"><i style="width:${pct(p)}"></i></div><p class="muted small">${attemptsOf(L, skillId) ? `${pct(p)} według modelu wiedzy, ${tries(attemptsOf(L, skillId))}.` : 'Model wiedzy zacznie się uczyć po pierwszej próbie.'} Stacja jest opanowana od ${pct(MASTERY)}.</p></section>
    <section class="panel"><h3>Pułapki na tej stacji</h3><ul class="mini-traps">${s.bugIds.map(id => `<li class="st-${bugStatus(L, id)}"><span class="trap-id">${id}</span><span>${esc(BUGS[id].name)}<small>${STATUS[bugStatus(L, id)]}</small></span></li>`).join('')}</ul><a class="small" href="#/pulapki">Cały katalog pułapek</a></section>
    ${extra}
  </aside>`;
}

function taskCard(task, extra = '') {
  return `<div class="task-card"><p class="task">${esc(task.prompt)}</p>${task.hideStatement ? '' : `<p class="statement">${esc(pretty(task.statement))}</p>`}${extra}</div>`;
}

function taskPlot(task, studentExpr = null) {
  if (task.skill === 'miejsce-zerowe') {
    const { a, b } = task.line;
    return `<div class="plot-wrap small">${plot({ xMin: -8, xMax: 8, yMin: -10, yMax: 10, fns: [{ f: x => a * x + b }], points: [[0, b, `(0; ${b})`]] })}</div>`;
  }
  if (!task.points) return '';
  const ys = task.points.map(p => p[1]);
  const fns = [];
  if (studentExpr) fns.push({ f: studentExpr, cls: 'p-line' });
  return `<div class="plot-wrap small" id="answer-plot">${plot({ xMin: -5, xMax: 7, yMin: Math.min(-4, ...ys) - 2, yMax: Math.max(4, ...ys) + 2, fns, points: task.points })}</div>`;
}

export function answerPlot(task, input) {
  let f = null;
  try { f = parseExpr(String(input).replace(/^\s*(y|f\(x\))\s*=\s*/i, '')); if (!Number.isFinite(f(0))) f = null; } catch { f = null; }
  return taskPlot(task, f);
}

/* ---------- Tryb: krok po kroku ---------- */

const lineMsg = l => {
  if (l.status === 'ok') return l.done ? 'Wynik.' : 'Równoważne z zadaniem.';
  if (l.status === 'wrong') return l.bug ? `Ten krok zmienia wynik. To typowa pułapka ${l.bug}: ${BUGS[l.bug].name}.` : 'Ten krok zmienia wynik. Sprawdź go jeszcze raz.';
  return '';
};

export function solveView({ state, learner: L }) {
  const s = state.session, t = s.task, skill = SKILLS[t.skill];
  const lastBug = [...s.lines].reverse().find(l => l.status === 'wrong' && l.bug)?.bug;
  const solvedPanel = s.done ? `<div class="feedback ok enter" role="status"><span class="fb-ico">${icon('check', 20)}</span><div><strong class="fb-mark">Rozwiązane.</strong><p>${s.lines.some(l => l.status === 'wrong') ? 'Udało się, choć po drodze był błędny krok. Model wiedzy to uwzględnił.' : 'Wszystkie kroki poprawne za pierwszym razem.'}</p><div class="fb-actions"><button class="btn btn-primary btn-sm" data-act="new-task">Nowe zadanie</button>${lastBug ? `<a class="btn btn-ghost btn-sm" href="#/lab/${t.skill}/${lastBug}">Rozbrój pułapkę ${lastBug}</a>` : ''}</div></div></div>` : '';
  const steps = t.answerOnly || !s.lines.length ? '' : `<ol class="steps">${s.lines.map(l => `<li class="st-${l.status}"><span class="st-math">${esc(pretty(l.text))}</span><small>${esc(lineMsg(l))}${l.status === 'wrong' && l.bug ? ` <a href="#/lab/${t.skill}/${l.bug}">Rozbrój ją w eksperymencie</a>` : ''}</small></li>`).join('')}</ol>`;
  const field = s.done ? '' : t.answerOnly
    ? mathField('answer', s.input, { kind: 'expr', submit: 'answer-check', label: 'Wzór funkcji', placeholder: 'y = ax + b', autofocus: true })
    : mathField('step', s.input, { kind: t.kind, submit: 'step-add', label: s.lines.some(l => l.status === 'ok') ? 'Następny krok' : 'Pierwszy krok', placeholder: t.kind === 'set' ? 'np. 3x = 6 albo x ∈ (−∞; 2)' : 'np. x^2 + 6x + 9', button: 'Dodaj krok', autofocus: true });
  const answerFeedback = t.answerOnly && s.answerResult && !s.done ? `<p class="inline-msg st-wrong">${esc(s.answerResult)}</p>` : '';
  const hints = `<section class="panel"><button class="panel-toggle" data-act="hint" aria-expanded="${s.hint > 0}"><span>${icon('bulb', 18)} ${s.hint ? 'Podpowiedź' : 'Pokaż podpowiedź'}</span>${icon(s.hint ? 'minus' : 'plus', 16)}</button>${s.hint ? `<p class="hint">${esc(skill.hint)}</p>${t.answerOnly ? '' : s.hint > 1 ? `<p class="hint">Następny krok mógłby wyglądać tak: <b>${esc(pretty(nextStep(s)))}</b></p>` : '<button class="btn btn-ghost btn-sm" data-act="hint-step">Pokaż następny krok</button>'}` : '<p class="muted small">Naprowadza na kolejny krok. Model wiedzy odnotowuje, że z niej korzystasz.</p>'}</section>`;
  return `${skillHeader(t.skill, 'solve')}
  <div class="mission" ${lineStyle(skill.line)}>
    <section class="mission-main">
      ${taskCard(t, t.answerOnly ? answerPlot(t, s.input) : taskPlot(t))}
      ${steps}${answerFeedback}${field}${solvedPanel}
      <div class="actions"><button class="btn btn-ghost" data-act="new-task">${icon('reset', 16)} Inne zadanie</button></div>
    </section>
    ${sidePanel(L, t.skill, hints)}
  </div>`;
}

function nextStep(s) {
  const ok = s.lines.filter(l => l.status === 'ok').length;
  const start = s.task.hideStatement ? 0 : 1;
  return s.task.steps[Math.min(s.task.steps.length - 1, start + ok)];
}

/* ---------- Tryb: napraw błąd ---------- */

export function fixView({ state, learner: L }) {
  const s = state.session, t = s.task, bug = t.bugs.find(b => b.id === s.fixBug);
  const res = s.fixResult;
  const lines = bug.steps.map((txt, i) => `<li><button class="fix-line ${s.fixSel === i ? 'on' : ''} ${res?.status === 'ok' && i === bug.idx ? 'found' : ''}" data-act="fix-line" data-i="${i}" aria-pressed="${s.fixSel === i}" ${res?.status === 'ok' ? 'disabled' : ''}><span class="fl-n">${i + 1}</span><span class="st-math">${esc(pretty(txt))}</span></button></li>`).join('');
  const done = res?.status === 'ok' ? `<div class="feedback ok enter" role="status"><span class="fb-ico">${icon('check', 20)}</span><div><strong class="fb-mark">Znalezione i poprawione.</strong><p><b>${bug.id}: ${esc(BUGS[bug.id].name)}.</b> ${esc(BUGS[bug.id].why)}</p><div class="fb-actions"><button class="btn btn-primary btn-sm" data-act="new-task">Następne rozwiązanie</button><a class="btn btn-ghost btn-sm" href="#/u/${t.skill}/kuba">Teraz wytłumacz to Kubie</a></div></div></div>` : '';
  return `${skillHeader(t.skill, 'fix')}
  <div class="mission" ${lineStyle(SKILLS[t.skill].line)}>
    <section class="mission-main">
      ${taskCard(t)}
      <h2 class="h3">Rozwiązanie Oli</h2>
      <p class="muted">Ola zrobiła jeden typowy błąd. Kliknij pierwszy krok, w którym coś poszło nie tak.</p>
      <ol class="fix-lines">${lines}</ol>
      ${res && res.status !== 'ok' ? `<p class="inline-msg st-wrong" role="status">${esc(res.message)}</p>` : ''}
      ${s.fixSel !== null && res?.status !== 'ok' ? mathField('fix', s.fixInput, { kind: t.kind, submit: 'fix-check', label: `Jak powinien wyglądać krok ${s.fixSel + 1}?`, autofocus: true }) : ''}
      ${done}
    </section>
    ${sidePanel(L, t.skill)}
  </div>`;
}

/* ---------- Kuba (wspólny czat) ---------- */

export function kubaThread(task, bugId, chat, known, understood, draft = '') {
  const bug = task.bugs.find(b => b.id === bugId), B = BUGS[bugId];
  const lines = bug.narrative || bug.steps;
  const correct = task.kind === 'set' ? fmtSet(task.answer.set) : task.steps.at(-1);
  const fill = txt => txt.replace('{wrong}', pretty(bug.steps.at(-1))).replace('{correct}', pretty(correct)).replace('{first}', pretty(bug.steps[1] || ''));
  const msgs = [{ who: 'kuba', text: fill(B.kuba.intro) }, ...chat.map(m => ({ ...m, text: m.who === 'kuba' ? fill(m.text) : m.text }))];
  return `<div class="kuba">
    <div class="kuba-work"><span class="kuba-avatar" aria-hidden="true">K</span><div><strong>Rozwiązanie Kuby</strong><ol class="kuba-lines">${lines.map(l => `<li class="st-math">${esc(pretty(l))}</li>`).join('')}</ol></div></div>
    <ol class="chat" aria-live="polite">${msgs.map(m => `<li class="msg ${m.who}"><span class="who">${m.who === 'kuba' ? 'Kuba' : 'Ty'}</span><p>${esc(m.text)}</p></li>`).join('')}</ol>
    <div class="kuba-meter" aria-label="Postęp przekonywania">${B.concepts.map((c, i) => `<span class="${known.includes(i) ? 'on' : ''}">${known.includes(i) ? `✓ ${esc(c.label)}` : 'Kuba jeszcze tego nie rozumie'}</span>`).join('')}</div>
    ${understood ? '' : `<label class="mf-label" for="kuba-input">Wytłumacz Kubie, gdzie jest błąd i dlaczego</label><textarea id="kuba-input" data-kuba rows="3" maxlength="600" placeholder="Pisz własnymi słowami, jak do kolegi.">${esc(draft)}</textarea><button class="btn btn-primary" data-act="kuba-send">Wyślij Kubie</button>`}
    <p class="muted small">Kuba to symulowany uczeń. Jego obliczenia wykonuje kod pułapki, więc zawsze popełnia dokładnie ten błąd. W tej wersji rozumie wyjaśnienia na podstawie słów kluczowych, bez modelu językowego.</p>
  </div>`;
}

export function kubaView({ state, learner: L }) {
  const s = state.session, t = s.task;
  const done = s.kuba.understood ? `<div class="feedback ok enter" role="status"><span class="fb-ico">${icon('check', 20)}</span><div><strong class="fb-mark">Kuba zrozumiał.</strong><p>${esc(BUGS[s.kuba.bug].why)}</p><div class="fb-actions"><button class="btn btn-primary btn-sm" data-act="new-task">Kolejny uczeń</button><a class="btn btn-ghost btn-sm" href="#/u/${t.skill}">Teraz rozwiąż sam</a></div></div></div>` : '';
  return `${skillHeader(t.skill, 'kuba')}
  <div class="mission" ${lineStyle(SKILLS[t.skill].line)}>
    <section class="mission-main">${taskCard(t)}${kubaThread(t, s.kuba.bug, s.kuba.chat, s.kuba.known, s.kuba.understood, s.kuba.draft)}${done}</section>
    ${sidePanel(L, t.skill)}
  </div>`;
}

/* ---------- Laboratorium błędu (ErrorLab) ---------- */

const LAB_STAGES = [['help', 'Zrozum'], ['kuba', 'Naucz Kubę'], ['transfer', 'Sprawdź się'], ['done', 'Wynik']];

export function labView({ state, learner: L }) {
  const lab = state.lab, B = BUGS[lab.bug], line = lineOf(lab.skill);
  const stepper = `<ol class="stepper lab-stepper" aria-label="Etapy">${LAB_STAGES.map(([k, l], i) => `<li><span class="${lab.stage === k ? 'cur' : LAB_STAGES.findIndex(x => x[0] === lab.stage) > i ? 'done' : ''}">${i + 1}</span><small>${l}</small></li>`).join('')}</ol>`;
  let body = '';
  if (lab.stage === 'help') {
    body = lab.condition === 'experiment'
      ? `<section class="stage exp" id="exp"><div class="stage-bar"><span class="kicker">Eksperyment: ${esc(experimentTitle(lab.exp.type))}</span><span class="legend">dobrany do pułapki ${lab.bug}</span></div><div class="exp-body">${renderExperiment(lab.task, lab.exp)}</div></section>
        <div class="actions"><button class="btn btn-primary btn-lg" data-act="lab-next" ${lab.exp.done ? '' : 'disabled'}>Dalej: naucz Kubę</button></div>`
      : `<section class="panel text-hint"><h2 class="h3">Wskazówka</h2><p>${esc(B.why)}</p><p class="muted small">Przykład tej pułapki: ${esc(B.example)}</p></section>
        <div class="actions"><button class="btn btn-primary btn-lg" data-act="lab-next">Dalej: naucz Kubę</button></div>`;
  } else if (lab.stage === 'kuba') {
    body = `${taskCard(lab.task)}${kubaThread(lab.task, lab.bug, lab.chat, lab.known, lab.understood, lab.draft)}
      <div class="actions">${lab.understood ? '<button class="btn btn-primary btn-lg" data-act="lab-next">Dalej: zadanie bez podpowiedzi</button>' : '<button class="btn btn-ghost btn-sm" data-act="lab-next">Pomiń ten etap</button>'}</div>`;
  } else if (lab.stage === 'transfer') {
    body = `<p class="lead">Nowe zadanie, bez podpowiedzi. Tak sprawdzamy, czy pułapka jest naprawdę rozbrojona.</p>
      ${taskCard(lab.transfer, lab.transfer.points ? answerPlot(lab.transfer, lab.input) : '')}
      ${mathField('transfer', lab.input, { kind: lab.transfer.kind, submit: 'lab-answer', label: 'Twoja odpowiedź', placeholder: lab.transfer.kind === 'set' ? 'np. x ≥ 2' : '', autofocus: true })}
      ${lab.msg ? `<p class="inline-msg st-wrong">${esc(lab.msg)}</p>` : ''}`;
  } else {
    const ok = lab.outcome;
    body = `<div class="feedback ${ok ? 'ok' : 'no'} enter" role="status"><span class="fb-ico">${icon(ok ? 'check' : 'close', 20)}</span><div><strong class="fb-mark">${ok ? 'Pułapka rozbrojona.' : 'Pułapka jeszcze działa.'}</strong><p>${ok ? 'Samodzielnie rozwiązałeś nowe zadanie, w którym ten błąd był możliwy.' : `Twoja odpowiedź: ${esc(lab.answerText)}. Poprawna: ${esc(lab.correctText)}.${lab.repeat ? ` To znowu ${lab.repeat}.` : ''}`}</p><div class="fb-actions">${ok ? `<a class="btn btn-primary btn-sm" href="#/runda">Szybka runda</a>` : `<button class="btn btn-primary btn-sm" data-act="lab-restart">Spróbuj jeszcze raz</button>`}<a class="btn btn-ghost btn-sm" href="#/">Wróć na mapę</a></div></div></div>`;
  }
  return `<a class="crumb" href="#/u/${lab.skill}">${icon('back', 15)} ${esc(SKILLS[lab.skill].name)}</a>
  <header class="mission-head" ${lineStyle(line.id)}><span class="m-pos">Laboratorium błędu ${lab.bug}</span><h1>${esc(B.name)}</h1><p class="task">Przykład tej pułapki: <span class="st-math">${esc(B.example)}</span></p></header>
  ${stepper}
  ${state.compare ? `<p class="compare-note">${icon('flask', 15)} Tryb porównawczy: w tej próbie dostajesz ${lab.condition === 'experiment' ? 'eksperyment' : 'wskazówkę tekstową'} (przydział losowy).</p>` : ''}
  <div class="lab" ${lineStyle(line.id)}>${body}</div>`;
}

/* ---------- Szybka runda ---------- */

export function roundView({ state }) {
  const r = state.round;
  if (!r) return '';
  const dots = `<ol class="round-dots" aria-label="Postęp rundy">${r.items.map((_, i) => `<li class="${i < r.results.length ? (r.results[i].correct ? 'ok' : 'no') : i === r.i ? 'cur' : ''}">${i + 1}</li>`).join('')}</ol>`;
  if (r.i >= r.items.length) {
    const ok = r.results.filter(x => x.correct).length;
    const bugs = [...new Set(r.results.map(x => x.bug).filter(Boolean))];
    return `<header class="page-head"><h1>Runda zakończona</h1><p class="lead">${ok} z ${r.items.length} poprawnie.</p></header>${dots}
      ${bugs.length ? `<section class="section"><h2>Wykryte pułapki</h2><ul class="trap-list">${bugs.map(trapRow).join('')}</ul></section>` : '<p>Żadna pułapka nie zadziałała.</p>'}
      <div class="actions left"><button class="btn btn-primary" data-act="round-new">Nowa runda</button><a class="btn btn-ghost" href="#/postepy">Zobacz postępy</a></div>`;
  }
  const t = r.task, item = r.items[r.i];
  return `<header class="page-head"><h1>Szybka runda</h1><p class="lead">Pięć zadań dobranych przez model wiedzy: najpierw pułapki, potem umiejętności, którym mija termin powtórki. Same odpowiedzi, bez kroków.</p></header>
    ${dots}
    <div class="round" ${lineStyle(SKILLS[t.skill].line)}>
      <p class="m-pos">${esc(lineOf(t.skill).name)}: ${esc(SKILLS[t.skill].name)}${item.bug ? ` · sprawdzamy pułapkę ${item.bug}` : ''}</p>
      ${taskCard(t, t.points ? answerPlot(t, r.input) : t.skill === 'miejsce-zerowe' ? taskPlot(t) : '')}
      ${r.feedback ? `<div class="feedback ${r.feedback.correct ? 'ok' : 'no'}" role="status"><span class="fb-ico">${icon(r.feedback.correct ? 'check' : 'close', 20)}</span><div><strong class="fb-mark">${r.feedback.correct ? 'Dobrze.' : 'Źle.'}</strong><p>${esc(r.feedback.text)}</p><div class="fb-actions"><button class="btn btn-primary btn-sm" data-act="round-next" data-autofocus>${r.i + 1 < r.items.length ? 'Następne zadanie' : 'Podsumowanie'}</button></div></div></div>`
        : mathField('round', r.input, { kind: t.kind, submit: 'round-check', label: 'Odpowiedź', placeholder: t.kind === 'set' ? 'np. x = 2 albo x ∈ ⟨1; 4⟩' : '', autofocus: true })}
      ${r.msg ? `<p class="inline-msg">${esc(r.msg)}</p>` : ''}
    </div>`;
}

/* ---------- Katalog pułapek ---------- */

export function trapsView({ learner: L }) {
  return `<header class="page-head"><h1>Katalog pułapek</h1><p class="lead">Typowe błędy maturzystów z matematyki podstawowej. Każda pułapka jest zapisana jako reguła, która wykonuje ten błąd na zadaniu. Dzięki temu silnik rozpoznaje ją w twoich krokach, a Kuba i Ola popełniają ją dokładnie tak, jak uczniowie.</p></header>
  ${LINES.map(line => {
    const ids = [...new Set(line.skills.flatMap(s => SKILLS[s].bugIds))];
    return `<section class="section" ${lineStyle(line.id)}><h2 class="line-title"><span class="l-badge">${line.badge}</span>${esc(line.name)}</h2><ul class="trap-cards">${ids.map(id => {
      const b = BUGS[id], st = bugStatus(L, id), d = L.bugs[id];
      return `<li class="trap-card st-${st}"><div class="tc-head"><span class="trap-id">${id}</span><strong>${esc(b.name)}</strong><span class="badge ${st === 'active' ? 'warn' : st === 'resolved' ? 'on' : ''}">${STATUS[st]}</span></div><p class="tc-example st-math">${esc(b.example)}</p><p>${esc(b.why)}</p><p class="muted small">${d?.detected ? `Wykryta ${d.detected}×. ` : ''}Występuje w: ${skillsOfBug(id).map(s => esc(SKILLS[s].name)).join(', ')}.</p><a class="btn btn-ghost btn-sm" href="#/lab/${skillsOfBug(id)[0]}/${id}">Otwórz laboratorium</a></li>`;
    }).join('')}</ul></section>`;
  }).join('')}`;
}

/* ---------- Postępy ---------- */

export function progressView({ state, learner: L }) {
  const ts = trialSummary(L);
  const rate = c => (c.n ? `${Math.round(100 * c.correct / c.n)}%` : '–');
  const recent = [...L.attempts].reverse().slice(0, 12);
  const MODE = { solve: 'krok po kroku', fix: 'napraw błąd', kuba: 'naucz Kubę', round: 'szybka runda', transfer: 'zadanie sprawdzające', answer: 'odpowiedź' };
  return `<header class="page-head"><h1>Postępy</h1><p class="lead">Opanowanie liczy model wiedzy (Bayesian Knowledge Tracing): każda próba aktualizuje prawdopodobieństwo, że umiesz daną rzecz. Dane zostają w tej przeglądarce.</p></header>
  <div class="progress-grid">
    <section class="panel"><h2 class="h3">Stacje</h2><ul class="subject-bars">${LINES.flatMap(line => line.skills.map(id => `<li ${lineStyle(line.id)}><a href="#/u/${id}"><span class="l-badge sm">${line.badge}</span><span class="sb-text"><strong>${esc(SKILLS[id].name)}</strong><small>${attemptsOf(L, id) ? tries(attemptsOf(L, id)) : 'jeszcze bez prób'}</small></span><span class="sb-val">${pct(mastery(L, id))}</span><span class="bar"><i style="width:${pct(mastery(L, id))}"></i></span></a></li>`)).join('')}</ul></section>
    <section class="panel"><h2 class="h3">Pułapki</h2><ul class="mini-traps">${Object.keys(BUGS).map(id => `<li class="st-${bugStatus(L, id)}"><span class="trap-id">${id}</span><span>${esc(BUGS[id].name)}<small>${STATUS[bugStatus(L, id)]}${L.bugs[id]?.detected ? `, wykryta ${L.bugs[id].detected}×` : ''}</small></span></li>`).join('')}</ul></section>
  </div>
  <section class="panel compare">
    <div class="panel-title"><h2 class="h3">Porównanie: wskazówka czy eksperyment?</h2><label class="switch"><input type="checkbox" data-act="compare-toggle" ${state.compare ? 'checked' : ''}/> tryb porównawczy</label></div>
    <p class="muted">Gdy tryb jest włączony, laboratorium błędu losuje jeden z dwóch warunków: zwykłą wskazówkę tekstową albo eksperyment dobrany do pułapki. Wynikiem jest zadanie sprawdzające rozwiązane bez podpowiedzi. To test hipotezy, a nie dowód.</p>
    <table class="data"><thead><tr><th>Warunek</th><th>Próby</th><th>Zadanie sprawdzające poprawnie</th></tr></thead><tbody><tr><td>Wskazówka tekstowa</td><td>${ts.text.n}</td><td>${rate(ts.text)}</td></tr><tr><td>Eksperyment</td><td>${ts.experiment.n}</td><td>${rate(ts.experiment)}</td></tr></tbody></table>
    ${ts.text.n + ts.experiment.n < 20 ? '<p class="muted small">Za mało prób, żeby wyciągać wnioski. Do pilotażu z klasą zbierzcie dane od wielu uczniów (przycisk eksportu poniżej).</p>' : ''}
    <div class="actions left"><button class="btn btn-ghost btn-sm" data-act="export">${icon('download', 15)} Eksportuj dane (JSON)</button></div>
  </section>
  <section class="panel history">
    <div class="panel-title"><h2 class="h3">Ostatnie próby</h2>${recent.length ? `<button class="btn btn-ghost btn-sm" data-act="clear-progress">${icon('trash', 15)} Usuń wszystkie dane</button>` : ''}</div>
    ${recent.length ? `<ul class="history-list">${recent.map(a => `<li><span class="h-mark ${a.correct ? 'ok' : 'no'}" aria-label="${a.correct ? 'dobrze' : 'źle'}">${icon(a.correct ? 'check' : 'close', 13)}</span><a href="#/u/${a.skill}">${esc(SKILLS[a.skill]?.name || a.skill)}</a><small>${MODE[a.mode] || a.mode}${a.bug ? `, pułapka ${a.bug}` : ''}</small><time>${new Date(a.at).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></li>`).join('')}</ul>` : '<p class="muted">Pusto. <a href="#/runda">Zacznij od szybkiej rundy</a>, a wyniki pojawią się tutaj.</p>'}
  </section>`;
}

export function notFound() {
  return `<header class="page-head"><h1>Nie ma takiej strony</h1><p class="lead">Ten adres nie prowadzi do żadnej stacji ani pułapki.</p><a class="btn btn-primary" href="#/">Wróć na mapę</a></header>`;
}
