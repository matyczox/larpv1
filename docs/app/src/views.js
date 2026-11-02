/** Widoki stron. Każda funkcja zwraca HTML na podstawie stanu. */
import { SUBJECTS, MISSIONS, getMission, getSubject, subjectMissions } from './data.js';
import { summarize, recommend } from './engine.js';
import { renderActivity } from './activities.js';
import { metroMap } from './art.js';
import { esc, icon, ring, subjectStyle } from './ui.js';

const tries = n => `${n} ${n === 1 ? 'próba' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'próby' : 'prób'}`;
const solved = (progress, id) => progress.attempts.some(a => a.missionId === id && a.correct);
const solvedIn = (progress, subjectId) => subjectMissions(subjectId).filter(m => solved(progress, m.id)).length;
const position = m => subjectMissions(m.subject).findIndex(x => x.id === m.id) + 1;

/* ---------- Szkielet ---------- */

export function layout(ctx, page) {
  const { state } = ctx;
  const name = state.route.name;
  const active = n => (n === name || (n === 'labs' && ['subject', 'mission'].includes(name))) ? 'aria-current="page"' : '';
  const ai = state.ai.online
    ? `<span class="ai-chip on" title="Tutor korzysta z lokalnego modelu">${icon('sparkle', 14)} Tutor AI włączony</span>`
    : `<span class="ai-chip" title="Ćwiczenia i sprawdzanie działają bez AI">Bez tutora AI</span>`;
  const nav = `<a href="#/" ${active('home')}>${icon('home')}<span>Start</span></a><a href="#/labs" ${active('labs')}>${icon('labs')}<span>Przedmioty</span></a><a href="#/progress" ${active('progress')}>${icon('progress')}<span>Postępy</span></a>`;
  return `<header class="topbar"><div class="wrap topbar-in"><a class="brand" href="#/" aria-label="PARADOX, strona startowa"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" width="30" height="30"><rect width="32" height="32" rx="9" class="bm-bg"/><path d="M10 24V8h7a5 5 0 0 1 0 10h-7" class="bm-p"/><circle cx="23" cy="23" r="3" class="bm-dot"/></svg></span><span class="brand-name">paradox</span></a><nav class="nav" aria-label="Główna nawigacja">${nav}</nav>${ai}</div></header>
  <main class="wrap main" id="main" tabindex="-1">${page}</main>
  <footer class="wrap footer"><span>PARADOX, laboratorium nauki przez działanie. Zadania są autorskie, postępy zapisują się tylko w tej przeglądarce.</span></footer>
  <nav class="tabbar" aria-label="Nawigacja mobilna">${nav}</nav>
  ${state.toast ? `<div class="toast" role="status">${esc(state.toast)}</div>` : ''}`;
}

/* ---------- Strona startowa ---------- */

function planner(ctx) {
  const { state, progress } = ctx;
  const r = state.plan.result;
  const subject = r?.supported ? getSubject(r.subject) : null;
  const target = subject ? recommend(progress, subject.id).mission : null;
  const result = r ? `<div class="plan-result ${subject ? 'ok' : 'no'} ${state.plan.fresh ? 'enter' : ''}" role="status">
      <span class="plan-ico" ${subject ? subjectStyle(subject) : ''}>${icon(subject ? subject.id : 'info', 18)}</span>
      <div><strong>${subject ? `${esc(subject.name)}: ${esc(subject.subtitle.toLowerCase())}` : 'Tego tematu jeszcze nie ma'}</strong><p>${esc(r.reason)}</p></div>
      ${target ? `<a class="btn btn-primary btn-sm" href="#/m/${target.id}">Otwórz „${esc(target.title)}”</a>` : ''}
    </div>` : '';
  return `<form class="planner" data-form="plan" autocomplete="off">
    <label for="plan-input" class="planner-label">Czego chcesz się dziś nauczyć?</label>
    <div class="plan-row"><input id="plan-input" name="topic" maxlength="300" placeholder="Na przykład: nie rozumiem Past Perfect" value="${esc(state.plan.query)}"/><button class="btn btn-primary" type="submit" ${state.plan.loading ? 'disabled' : ''}>${state.plan.loading ? 'Szukam…' : 'Znajdź ćwiczenie'}</button></div>
    <div class="plan-hints"><span class="muted small">Spróbuj:</span>${['funkcja liniowa', 'krążenie krwi', 'Past Continuous', 'najkrótsza ścieżka'].map(t => `<button type="button" class="chip" data-act="plan-try" data-topic="${esc(t)}">${esc(t)}</button>`).join('')}</div>
    ${result}
  </form>`;
}

function heroLinie(ctx, next) {
  const { progress } = ctx;
  const done = summarize(progress).done;
  return `<section class="hero hero-linie">
    <div class="l-head"><h1>Twoja mapa nauki</h1><p class="lead">Cztery linie, dwanaście stacji. Wypełnione kółko to misja zaliczona. ${done ? `Masz za sobą ${done} z ${MISSIONS.length}.` : 'Wsiadaj na dowolnej linii.'}</p></div>
    <div class="metro-wrap">${metroMap(progress, next.mission.id)}</div>
    <div class="l-strips">${SUBJECTS.map(s => `<a class="l-strip" href="#/labs/${s.id}" ${subjectStyle(s)}><span class="l-badge">${s.name[0]}</span><span><strong>${esc(s.name)}</strong><small>${solvedIn(progress, s.id)} z 3 stacji</small></span></a>`).join('')}</div>
    <p class="l-next">Następna stacja: <a href="#/m/${next.mission.id}">${esc(next.mission.title)}</a> <span class="muted">(${esc(getSubject(next.mission.subject).name.toLowerCase())})</span></p>
  </section>`;
}

export function homeView(ctx) {
  const next = recommend(ctx.progress);
  return `${heroLinie(ctx, next)}
  <section class="section">${planner(ctx)}</section>`;
}

/* ---------- Przedmioty ---------- */

export function labsView(ctx) {
  const { state, progress } = ctx;
  const filters = [['all', 'Wszystkie'], ['Ścisłe', 'Ścisłe'], ['Przyrodnicze', 'Przyrodnicze'], ['Języki', 'Języki']];
  const list = SUBJECTS.filter(s => state.filter === 'all' || s.category === state.filter);
  return `<header class="page-head"><h1>Przedmioty</h1><p class="lead">Cztery dziedziny, w każdej trzy misje od najprostszej do najtrudniejszej. Możesz zacząć od dowolnej.</p></header>
  <div class="chips" role="group" aria-label="Filtr przedmiotów">${filters.map(([v, l]) => `<button class="chip ${state.filter === v ? 'on' : ''}" aria-pressed="${state.filter === v}" data-act="filter" data-value="${esc(v)}">${l}</button>`).join('')}</div>
  <div class="lab-list">${list.map(s => `<section class="lab-row" ${subjectStyle(s)}>
      <a class="lab-row-head" href="#/labs/${s.id}"><span class="sc-ico">${icon(s.id, 22)}</span><span><strong>${esc(s.name)}</strong><small>${esc(s.subtitle)}, ukończone ${solvedIn(progress, s.id)} z 3</small></span>${icon('next', 18)}</a>
      <ol class="lab-row-missions">${subjectMissions(s.id).map(m => missionLink(ctx, m)).join('')}</ol>
    </section>`).join('')}</div>
  <p class="note">${icon('shield', 18)}<span>Poprawność odpowiedzi sprawdzają reguły i algorytmy, zawsze tak samo. Tutor AI może podpowiadać, ale nie wystawia ocen.</span></p>`;
}

function missionLink(ctx, m) {
  const done = solved(ctx.progress, m.id);
  return `<li><a class="mission-link ${done ? 'done' : ''}" href="#/m/${m.id}"><span class="ml-lvl" aria-hidden="true">${done ? icon('check', 15) : position(m)}</span><span class="ml-text"><strong>${esc(m.title)}</strong><small>${esc(m.skill)}${done ? ', zaliczone' : ''}</small></span></a></li>`;
}

export function subjectView(ctx, subjectId) {
  const { progress } = ctx;
  const s = getSubject(subjectId);
  if (!s) return notFound();
  const missions = subjectMissions(s.id);
  const done = solvedIn(progress, s.id);
  const next = recommend(progress, s.id).mission;
  return `<a class="crumb" href="#/labs">${icon('back', 15)} Przedmioty</a>
  <header class="subject-head" ${subjectStyle(s)}>
    <span class="l-badge big" aria-hidden="true">${s.name[0]}</span>
    <div class="sh-text"><h1>${esc(s.name)}</h1><p class="sh-sub">${esc(s.subtitle)}</p><p class="lead">${esc(s.summary)}</p></div>
    <div class="sh-side"><span class="sc-ring big">${ring(done / missions.length, 72, 5)}<b>${done}/${missions.length}</b></span><a class="btn btn-primary" href="#/m/${next.id}">${done === missions.length ? 'Powtórz' : done ? 'Kontynuuj' : 'Zacznij'}</a></div>
  </header>
  <ol class="trail" ${subjectStyle(s)}>${missions.map((m, i) => {
    const ok = solved(progress, m.id);
    const tried = progress.attempts.filter(a => a.missionId === m.id).length;
    return `<li class="${ok ? 'done' : ''}"><span class="trail-dot" aria-hidden="true">${ok ? icon('check', 16) : i + 1}</span><a href="#/m/${m.id}" class="trail-card"><strong>${esc(m.title)}</strong><p>${esc(m.prompt)}</p><small>${esc(m.skill)}. ${tried ? `Za tobą ${tries(tried)}.` : 'Jeszcze bez prób.'}</small></a></li>`;
  }).join('')}</ol>`;
}

/* ---------- Misja ---------- */

function feedback(m, s, next) {
  const r = s.result;
  if (!r) return '';
  if (r.correct) {
    return `<div class="feedback ok ${s.fresh ? 'enter' : ''}" id="feedback" role="status"><span class="fb-ico">${icon('check', 20)}</span><div><strong class="fb-mark">Dobrze!</strong><p>${esc(r.explanation)}</p><div class="fb-actions">${next ? `<a class="btn btn-primary btn-sm" href="#/m/${next.id}">Następna misja: ${esc(next.title)}</a>` : `<a class="btn btn-primary btn-sm" href="#/labs/${m.subject}">Wróć do przedmiotu</a>`}</div></div></div>`;
  }
  return `<div class="feedback no ${s.fresh ? 'enter' : ''}" id="feedback" role="status"><span class="fb-ico">${icon('close', 20)}</span><div><strong class="fb-mark">Jeszcze nie.</strong><p>${esc(r.diagnosis)}</p><small>Popraw odpowiedź i sprawdź jeszcze raz. Każda próba trafia do historii.</small></div></div>`;
}

export function missionView(ctx, missionId) {
  const { state, progress } = ctx;
  const m = getMission(missionId);
  if (!m) return notFound();
  const s = state.session;
  const subj = getSubject(m.subject);
  const siblings = subjectMissions(m.subject);
  const idx = siblings.findIndex(x => x.id === m.id);
  const next = siblings[idx + 1];
  const heading = m.type === 'choice' ? 'Wybierz formę czasownika, która pasuje do zeznania.' : m.prompt;
  const ai = state.ai;
  return `<div class="mission-top" ${subjectStyle(subj)}>
    <a class="crumb" href="#/labs/${m.subject}">${icon('back', 15)} ${esc(subj.name)}</a>
    <ol class="stepper" aria-label="Misje w tym przedmiocie">${siblings.map((x, i) => `<li><a href="#/m/${x.id}" class="${x.id === m.id ? 'cur' : ''} ${solved(progress, x.id) ? 'done' : ''}" ${x.id === m.id ? 'aria-current="step"' : ''} title="${esc(x.title)}">${solved(progress, x.id) ? icon('check', 13) : i + 1}</a></li>`).join('')}</ol>
  </div>
  <div class="mission" ${subjectStyle(subj)}>
    <section class="mission-main">
      <header class="mission-head"><span class="m-pos">Misja ${idx + 1} z ${siblings.length}</span><h1>${esc(m.title)}</h1><p class="task">${esc(heading)}</p></header>
      ${renderActivity(m, s)}
      ${feedback(m, s, next)}
      <div class="actions"><button class="btn btn-ghost" data-act="restart">${icon('reset', 16)} Zacznij od nowa</button><button class="btn btn-primary btn-lg" data-act="check">${s.result?.correct ? 'Sprawdź ponownie' : 'Sprawdź'}</button></div>
    </section>
    <aside class="mission-side">
      <section class="panel"><h3>${esc(m.skill)}</h3><div class="lvl" aria-label="Poziom ${m.level} z 3">${[1, 2, 3].map(l => `<i class="${l <= m.level ? 'on' : ''}"></i>`).join('')}<span>poziom ${m.level} z 3</span></div></section>
      <section class="panel">
        <button class="panel-toggle" data-act="hint" aria-expanded="${s.hint}"><span>${icon('bulb', 18)} ${s.hint ? 'Ukryj podpowiedź' : 'Pokaż podpowiedź'}</span>${icon(s.hint ? 'minus' : 'plus', 16)}</button>
        ${s.hint ? `<p class="hint ${s.fresh ? 'enter' : ''}">${esc(m.hint)}</p>` : '<p class="muted small">Naprowadza na kolejny krok, nie zdradza wyniku. Zapisujemy, że z niej korzystasz.</p>'}
      </section>
      <section class="panel tutor">
        <div class="panel-title"><span>${icon('chat', 18)} Tutor</span><span class="badge ${ai.online ? 'on' : ''}">${ai.online ? 'włączony' : 'wyłączony'}</span></div>
        ${ai.online
          ? `<form data-form="tutor"><textarea id="tutor-input" name="question" rows="3" maxlength="800" placeholder="Na przykład: dlaczego b nie jest równe 5?">${esc(s.aiQ)}</textarea><button class="btn btn-soft btn-block" type="submit" ${s.aiLoading ? 'disabled' : ''}>${s.aiLoading ? 'Tutor odpowiada…' : 'Zapytaj tutora'}</button></form>${s.aiA ? `<div class="tutor-answer" aria-live="polite">${esc(s.aiA)}</div>` : ''}<p class="muted small">Model działa na twoim komputerze i może się mylić. Nie wpływa na ocenę.</p>`
          : `<p class="muted small">Tutor potrzebuje lokalnej Ollamy. Ćwiczenia, podpowiedzi i sprawdzanie działają bez niego.</p><details class="howto"><summary>Jak włączyć tutora</summary><ol><li><code>ollama pull qwen3.5:9b</code></li><li><code>ollama serve</code></li><li><code>npm start</code> w katalogu projektu</li></ol></details>`}
      </section>
    </aside>
  </div>`;
}

/* ---------- Postępy ---------- */

export function progressView(ctx) {
  const { progress } = ctx;
  const stats = summarize(progress);
  const next = recommend(progress);
  const recent = [...progress.attempts].reverse().slice(0, 12);
  const date = iso => { const d = new Date(iso); return Number.isNaN(+d) ? '' : d.toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
  return `<header class="page-head"><h1>Postępy</h1><p class="lead">Co już umiesz i co warto powtórzyć. Dane zostają w tej przeglądarce.</p></header>
  <section class="stats big">
    <div><span>Zaliczone misje</span><strong>${stats.done}<small> z ${MISSIONS.length}</small></strong><span class="bar"><i style="width:${Math.round(stats.done / MISSIONS.length * 100)}%"></i></span></div>
    <div><span>Trafne odpowiedzi</span><strong>${stats.attempts ? stats.accuracy + '<small>%</small>' : '–'}</strong><small class="muted">${stats.right} z ${stats.attempts} sprawdzeń</small></div>
    <div><span>Z podpowiedzią</span><strong>${stats.withHints}</strong><small class="muted">tyle razy sięgnięto po wskazówkę</small></div>
  </section>
  <div class="progress-grid">
    <section class="panel">
      <h2 class="h3">Przedmioty</h2>
      <ul class="subject-bars">${stats.subjectStats.map(s => `<li ${subjectStyle(s)}><a href="#/labs/${s.id}"><span class="sc-ico sm">${icon(s.id, 17)}</span><span class="sb-text"><strong>${esc(s.name)}</strong><small>${s.attempts ? `${s.accuracy}% trafnych, ${tries(s.attempts)}` : 'jeszcze bez prób'}</small></span><span class="sb-val">${s.passed}/${s.total}</span><span class="bar"><i style="width:${Math.round(s.passed / s.total * 100)}%"></i></span></a></li>`).join('')}</ul>
    </section>
    <section class="panel">
      <h2 class="h3">Co dalej</h2>
      <p class="muted">${esc(next.reason)}</p>
      <a class="btn btn-primary btn-sm" href="#/m/${next.mission.id}">Otwórz „${esc(next.mission.title)}”</a>
    </section>
  </div>
  <section class="panel history">
    <div class="panel-title"><h2 class="h3">Ostatnie próby</h2>${recent.length ? `<button class="btn btn-ghost btn-sm" data-act="clear-progress">${icon('trash', 15)} Usuń historię</button>` : ''}</div>
    ${recent.length ? `<ul class="history-list">${recent.map(a => {
      const m = getMission(a.missionId); if (!m) return '';
      return `<li><span class="h-mark ${a.correct ? 'ok' : 'no'}" aria-label="${a.correct ? 'dobrze' : 'źle'}">${icon(a.correct ? 'check' : 'close', 13)}</span><a href="#/m/${m.id}">${esc(m.title)}</a><small>${esc(getSubject(m.subject).name)}${a.hintsUsed ? ', z podpowiedzią' : ''}</small><time>${date(a.at)}</time></li>`;
    }).join('')}</ul>` : `<p class="muted">Pusto. <a href="#/m/${next.mission.id}">Rozwiąż pierwszą misję</a>, a wynik pojawi się tutaj.</p>`}
  </section>`;
}

export function notFound() {
  return `<header class="page-head"><h1>Nie ma takiej strony</h1><p class="lead">Ten adres nie prowadzi do żadnej misji ani przedmiotu.</p><a class="btn btn-primary" href="#/">Wróć na start</a></header>`;
}
