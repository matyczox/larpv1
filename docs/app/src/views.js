/** Widoki stron. Każda funkcja zwraca HTML na podstawie stanu. */
import { SUBJECTS, MISSIONS, getMission, getSubject, subjectMissions } from './data.js';
import { summarize, recommend } from './engine.js';
import { renderActivity } from './activities.js';
import { esc, icon, ring, pad2, subjectStyle } from './ui.js';

const tries = n => `${n} ${n === 1 ? 'próba' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'próby' : 'prób'}`;
const solved = (progress, id) => progress.attempts.some(a => a.missionId === id && a.correct);
const solvedIn = (progress, subjectId) => subjectMissions(subjectId).filter(m => solved(progress, m.id)).length;

/* ---------- Szkielet ---------- */

export function layout(ctx, page) {
  const { state } = ctx;
  const name = state.route.name;
  const active = n => (n === name || (n === 'labs' && ['subject', 'mission'].includes(name))) ? 'aria-current="page"' : '';
  const ai = state.ai.online
    ? `<span class="ai-chip on" title="Tutor korzysta z lokalnego modelu">${icon('sparkle', 14)} AI: ${esc(state.ai.model)}</span>`
    : `<span class="ai-chip" title="Ćwiczenia i sprawdzanie działają bez AI">Tryb offline</span>`;
  const nav = `<a href="#/" ${active('home')}>${icon('home')}<span>Start</span></a><a href="#/labs" ${active('labs')}>${icon('labs')}<span>Laboratoria</span></a><a href="#/progress" ${active('progress')}>${icon('progress')}<span>Postępy</span></a>`;
  return `<header class="topbar"><div class="wrap topbar-in"><a class="brand" href="#/" aria-label="PARADOX — start"><span class="brand-mark" aria-hidden="true"><svg viewBox="0 0 32 32" width="30" height="30"><rect width="32" height="32" rx="9" class="bm-bg"/><path d="M10 24V8h7a5 5 0 0 1 0 10h-7" class="bm-p"/><circle cx="23" cy="23" r="3" class="bm-dot"/></svg></span><span class="brand-name">paradox</span></a><nav class="nav" aria-label="Główna nawigacja">${nav}</nav>${ai}</div></header>
  <main class="wrap main" id="main" tabindex="-1">${page}</main>
  <footer class="wrap footer"><span>PARADOX · laboratorium nauki przez działanie</span><span>Autorskie zadania demonstracyjne · postępy zapisywane lokalnie w przeglądarce</span></footer>
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
      <div><strong>${subject ? `${esc(subject.name)} · ${esc(subject.subtitle)}` : 'Tego tematu jeszcze nie ma'}</strong><p>${esc(r.reason)}</p><small>${r.mode === 'ai' ? 'Dopasował lokalny model AI' : 'Dopasowanie regułami offline'}</small></div>
      ${target ? `<a class="btn btn-primary btn-sm" href="#/m/${target.id}">Zaczynamy ${icon('arrow', 15)}</a>` : ''}
    </div>` : '';
  return `<form class="planner" data-form="plan" autocomplete="off">
    <label for="plan-input" class="kicker">Czego chcesz się dziś nauczyć?</label>
    <div class="plan-row"><input id="plan-input" name="topic" maxlength="300" placeholder="np. nie rozumiem Past Perfect" value="${esc(state.plan.query)}"/><button class="btn btn-primary" type="submit" ${state.plan.loading ? 'disabled' : ''}>${state.plan.loading ? 'Dobieram…' : 'Dobierz ćwiczenie'}</button></div>
    <div class="plan-hints">${['funkcja liniowa', 'krążenie krwi', 'Past Continuous', 'najkrótsza ścieżka'].map(t => `<button type="button" class="chip" data-act="plan-try" data-topic="${esc(t)}">${esc(t)}</button>`).join('')}</div>
    ${result}
  </form>`;
}

function subjectCard(ctx, s) {
  const { progress } = ctx;
  const missions = subjectMissions(s.id);
  const done = solvedIn(progress, s.id);
  return `<a class="subject-card" href="#/labs/${s.id}" ${subjectStyle(s)}>
    <span class="sc-top"><span class="sc-ico">${icon(s.id, 22)}</span><span class="sc-ring">${ring(done / missions.length, 40, 3.5)}<b>${done}/${missions.length}</b></span></span>
    <span class="sc-cat">${esc(s.category)}</span>
    <strong class="sc-name">${esc(s.name)}</strong>
    <span class="sc-sub">${esc(s.subtitle)}</span>
    <span class="sc-desc">${esc(s.summary)}</span>
    <span class="sc-dots" aria-hidden="true">${missions.map(m => `<i class="${solved(progress, m.id) ? 'on' : ''}"></i>`).join('')}</span>
  </a>`;
}

export function homeView(ctx) {
  const { progress } = ctx;
  const stats = summarize(progress);
  const next = recommend(progress);
  const ns = getSubject(next.mission.subject);
  const fresh = stats.attempts === 0;
  return `<section class="hero">
    <div class="hero-copy">
      <span class="kicker">${fresh ? 'Witaj w laboratorium' : 'Dobrze, że wracasz'}</span>
      <h1>Ucz się, <em>eksperymentując.</em></h1>
      <p class="lead">Przesuwaj wykresy, prowadź krew przez serce, rozwiązuj śledztwa po angielsku i szukaj najtańszych tras w grafach. Każdą odpowiedź sprawdza algorytm — nie zgadywanie modelu językowego.</p>
    </div>
    <a class="next-card" href="#/m/${next.mission.id}" ${subjectStyle(ns)}>
      <span class="kicker">${fresh ? 'Pierwsza misja' : 'Twój następny krok'}</span>
      <span class="nc-row"><span class="sc-ico">${icon(ns.id, 22)}</span><span><small>${esc(ns.name)} · poziom ${next.mission.level}</small><strong>${esc(next.mission.title)}</strong></span></span>
      <span class="nc-reason">${esc(next.reason)}</span>
      <span class="nc-go">Otwórz misję ${icon('arrow', 16)}</span>
    </a>
  </section>
  ${planner(ctx)}
  <section class="stats" aria-label="Podsumowanie">
    <div><span>Ukończone misje</span><strong>${pad2(stats.done)}<small>/${MISSIONS.length}</small></strong></div>
    <div><span>Trafność prób</span><strong>${stats.attempts ? stats.accuracy + '<small>%</small>' : '—'}</strong></div>
    <div><span>Wszystkie próby</span><strong>${pad2(stats.attempts)}</strong></div>
  </section>
  <section class="section">
    <div class="section-head"><h2>Laboratoria</h2><a class="link" href="#/labs">Wszystkie misje ${icon('arrow', 15)}</a></div>
    <div class="subject-grid">${SUBJECTS.map(s => subjectCard(ctx, s)).join('')}</div>
  </section>
  <section class="section how">
    <h2>Jak to działa</h2>
    <ol class="how-list">
      <li><b>01</b><strong>Spróbuj sam</strong><p>Każda misja to mały eksperyment. Zmieniasz parametry i obserwujesz skutek.</p></li>
      <li><b>02</b><strong>Sprawdź algorytmem</strong><p>Wynik ocenia deterministyczny silnik — ten sam dla każdego, bez losowości.</p></li>
      <li><b>03</b><strong>Wróć do błędów</strong><p>Zadania, które sprawiły trudność, wracają jako rekomendowana powtórka.</p></li>
    </ol>
  </section>`;
}

/* ---------- Laboratoria ---------- */

export function labsView(ctx) {
  const { state, progress } = ctx;
  const filters = [['all', 'Wszystkie'], ['Ścisłe', 'Ścisłe'], ['Przyrodnicze', 'Przyrodnicze'], ['Języki', 'Języki']];
  const list = SUBJECTS.filter(s => state.filter === 'all' || s.category === state.filter);
  return `<header class="page-head"><span class="kicker">Katalog</span><h1>Laboratoria</h1><p class="lead">Cztery dziedziny, po trzy misje o rosnącej trudności. Wybierz miejsce startu albo przejdź od razu do konkretnego zadania.</p></header>
  <div class="chips" role="group" aria-label="Filtr dziedzin">${filters.map(([v, l]) => `<button class="chip ${state.filter === v ? 'on' : ''}" aria-pressed="${state.filter === v}" data-act="filter" data-value="${esc(v)}">${l}</button>`).join('')}</div>
  <div class="lab-list">${list.map(s => `<section class="lab-row" ${subjectStyle(s)}>
      <a class="lab-row-head" href="#/labs/${s.id}"><span class="sc-ico">${icon(s.id, 22)}</span><span><strong>${esc(s.name)}</strong><small>${esc(s.subtitle)} · ${solvedIn(progress, s.id)}/3 ukończone</small></span>${icon('arrow', 18)}</a>
      <div class="lab-row-missions">${subjectMissions(s.id).map(m => missionLink(ctx, m)).join('')}</div>
    </section>`).join('')}</div>
  <p class="note">${icon('shield', 18)}<span>Wszystkie ćwiczenia są autorskie. Poprawność sprawdzają reguły i algorytmy z <code>engine.js</code>; tutor AI jest tylko pomocą, nie oceną.</span></p>`;
}

function missionLink(ctx, m) {
  const done = solved(ctx.progress, m.id);
  return `<a class="mission-link ${done ? 'done' : ''}" href="#/m/${m.id}"><span class="ml-lvl">${done ? icon('check', 15) : pad2(m.level)}</span><span class="ml-text"><strong>${esc(m.title)}</strong><small>${esc(m.skill)}</small></span>${icon('arrow', 16)}</a>`;
}

export function subjectView(ctx, subjectId) {
  const { progress } = ctx;
  const s = getSubject(subjectId);
  if (!s) return notFound();
  const missions = subjectMissions(s.id);
  const done = solvedIn(progress, s.id);
  const next = recommend(progress, s.id).mission;
  return `<a class="crumb" href="#/labs">${icon('back', 15)} Laboratoria</a>
  <header class="subject-head" ${subjectStyle(s)}>
    <span class="sh-ico">${icon(s.id, 34)}</span>
    <div><span class="kicker">${esc(s.category)} · ${esc(s.subtitle)}</span><h1>${esc(s.name)}</h1><p class="lead">${esc(s.summary)}</p></div>
    <div class="sh-side"><span class="sc-ring big">${ring(done / missions.length, 72, 5)}<b>${done}/${missions.length}</b></span><a class="btn btn-primary" href="#/m/${next.id}">${done === missions.length ? 'Powtórka' : done ? 'Kontynuuj' : 'Zacznij'} ${icon('arrow', 16)}</a></div>
  </header>
  <ol class="trail" ${subjectStyle(s)}>${missions.map(m => {
    const ok = solved(progress, m.id);
    const tried = progress.attempts.filter(a => a.missionId === m.id).length;
    return `<li class="${ok ? 'done' : ''}"><span class="trail-dot">${ok ? icon('check', 16) : m.level}</span><a href="#/m/${m.id}" class="trail-card"><span class="kicker">${esc(m.eyebrow)}</span><strong>${esc(m.title)}</strong><p>${esc(m.prompt)}</p><small>${esc(m.skill)} · ${tried ? tries(tried) : 'jeszcze nie próbowano'}</small></a></li>`;
  }).join('')}</ol>`;
}

/* ---------- Misja ---------- */

function feedback(m, s, next) {
  const r = s.result;
  if (!r) return '';
  if (r.correct) {
    return `<div class="feedback ok ${s.fresh ? 'enter' : ''}" id="feedback" role="status"><span class="fb-ico">${icon('check', 20)}</span><div><strong>Dokładnie tak.</strong><p>${esc(r.explanation)}</p><div class="fb-actions">${next ? `<a class="btn btn-primary btn-sm" href="#/m/${next.id}">Następna misja ${icon('arrow', 15)}</a>` : `<a class="btn btn-primary btn-sm" href="#/labs/${m.subject}">Ścieżka ukończona ${icon('arrow', 15)}</a>`}</div></div></div>`;
  }
  return `<div class="feedback no ${s.fresh ? 'enter' : ''}" id="feedback" role="status"><span class="fb-ico">${icon('close', 20)}</span><div><strong>Jeszcze nie.</strong><p>${esc(r.diagnosis)}</p><small>Popraw odpowiedź i sprawdź ponownie — każda próba trafia do historii.</small></div></div>`;
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
    <ol class="stepper" aria-label="Misje w tej ścieżce">${siblings.map((x, i) => `<li><a href="#/m/${x.id}" class="${x.id === m.id ? 'cur' : ''} ${solved(progress, x.id) ? 'done' : ''}" ${x.id === m.id ? 'aria-current="step"' : ''} title="${esc(x.title)}">${solved(progress, x.id) ? icon('check', 13) : i + 1}</a></li>`).join('')}</ol>
  </div>
  <div class="mission" ${subjectStyle(subj)}>
    <section class="mission-main">
      <header class="mission-head"><span class="kicker">${esc(m.eyebrow)}</span><h1>${esc(m.title)}</h1><p class="task">${esc(heading)}</p></header>
      ${renderActivity(m, s)}
      ${feedback(m, s, next)}
      <div class="actions"><button class="btn btn-ghost" data-act="restart">${icon('reset', 16)} Od nowa</button><button class="btn btn-primary btn-lg" data-act="check">${s.result?.correct ? 'Sprawdź ponownie' : 'Sprawdź'} ${icon('check', 17)}</button></div>
    </section>
    <aside class="mission-side">
      <section class="panel"><span class="kicker">Umiejętność</span><h3>${esc(m.skill)}</h3><div class="lvl" aria-label="Poziom ${m.level} z 3">${[1, 2, 3].map(l => `<i class="${l <= m.level ? 'on' : ''}"></i>`).join('')}<span>poziom ${m.level}/3</span></div></section>
      <section class="panel">
        <button class="panel-toggle" data-act="hint" aria-expanded="${s.hint}"><span>${icon('bulb', 18)} Podpowiedź</span>${icon(s.hint ? 'minus' : 'plus', 16)}</button>
        ${s.hint ? `<p class="hint ${s.fresh ? 'enter' : ''}">${esc(m.hint)}</p>` : '<p class="muted small">Naprowadza na kolejny krok, nie zdradza wyniku. Użycie jest odnotowywane.</p>'}
      </section>
      <section class="panel tutor">
        <div class="panel-title"><span>${icon('chat', 18)} Tutor</span><span class="badge ${ai.online ? 'on' : ''}">${ai.online ? 'lokalne AI' : 'offline'}</span></div>
        ${ai.online
          ? `<form data-form="tutor"><textarea id="tutor-input" name="question" rows="3" maxlength="800" placeholder="Np. dlaczego b nie jest równe 5?">${esc(s.aiQ)}</textarea><button class="btn btn-soft btn-block" type="submit" ${s.aiLoading ? 'disabled' : ''}>${s.aiLoading ? 'Myślę…' : 'Zapytaj'}</button></form>${s.aiA ? `<div class="tutor-answer" aria-live="polite">${esc(s.aiA)}</div>` : ''}<p class="muted small">Model działa na Twoim komputerze i może się mylić. Nie wpływa na ocenę.</p>`
          : `<p class="muted small">Tutor wymaga lokalnej Ollamy. Ćwiczenia, podpowiedzi i sprawdzanie działają bez niej.</p><details class="howto"><summary>Jak włączyć?</summary><ol><li><code>ollama pull qwen3.5:9b</code></li><li><code>ollama serve</code></li><li><code>npm start</code> w katalogu projektu</li></ol></details>`}
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
  const date = iso => { const d = new Date(iso); return Number.isNaN(+d) ? '' : d.toLocaleString('pl-PL', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); };
  return `<header class="page-head"><span class="kicker">Twoje dane</span><h1>Postępy</h1><p class="lead">Widzisz, co już opanowane, a co warto powtórzyć. Wszystko zapisuje się tylko w tej przeglądarce.</p></header>
  <section class="stats big">
    <div><span>Ukończone misje</span><strong>${stats.done}<small>/${MISSIONS.length}</small></strong><span class="bar"><i style="width:${Math.round(stats.done / MISSIONS.length * 100)}%"></i></span></div>
    <div><span>Trafność prób</span><strong>${stats.attempts ? stats.accuracy + '<small>%</small>' : '—'}</strong><small class="muted">${stats.right} z ${stats.attempts} sprawdzeń poprawnych</small></div>
    <div><span>Z podpowiedzią</span><strong>${stats.withHints}</strong><small class="muted">prób, w których sięgnięto po wskazówkę</small></div>
  </section>
  <div class="progress-grid">
    <section class="panel">
      <h2 class="h3">Dziedziny</h2>
      <ul class="subject-bars">${stats.subjectStats.map(s => `<li ${subjectStyle(s)}><a href="#/labs/${s.id}"><span class="sc-ico sm">${icon(s.id, 17)}</span><span class="sb-text"><strong>${esc(s.name)}</strong><small>${s.attempts ? `${s.accuracy}% trafnych · ${tries(s.attempts)}` : 'brak prób'}</small></span><span class="sb-val">${s.passed}/${s.total}</span><span class="bar"><i style="width:${Math.round(s.passed / s.total * 100)}%"></i></span></a></li>`).join('')}</ul>
    </section>
    <section class="panel">
      <span class="kicker">Rekomendacja</span>
      <h2 class="h3">${esc(next.mission.title)}</h2>
      <p class="muted">${esc(next.reason)}</p>
      <a class="btn btn-primary btn-sm" href="#/m/${next.mission.id}">Otwórz ${icon('arrow', 15)}</a>
    </section>
  </div>
  <section class="panel history">
    <div class="panel-title"><h2 class="h3">Ostatnie próby</h2>${recent.length ? `<button class="btn btn-ghost btn-sm" data-act="clear-progress">${icon('trash', 15)} Wyczyść dane</button>` : ''}</div>
    ${recent.length ? `<ul class="history-list">${recent.map(a => {
      const m = getMission(a.missionId); if (!m) return '';
      return `<li><span class="h-mark ${a.correct ? 'ok' : 'no'}">${icon(a.correct ? 'check' : 'close', 13)}</span><a href="#/m/${m.id}">${esc(m.title)}</a><small>${esc(getSubject(m.subject).name)}${a.hintsUsed ? ' · z podpowiedzią' : ''}</small><time>${date(a.at)}</time></li>`;
    }).join('')}</ul>` : `<p class="muted">Jeszcze nic tu nie ma. <a href="#/m/${next.mission.id}">Zacznij pierwszą misję</a> i sprawdź odpowiedź.</p>`}
  </section>`;
}

export function notFound() {
  return `<header class="page-head"><span class="kicker">404</span><h1>Nie ma takiego miejsca</h1><p class="lead">Ten adres nie prowadzi do żadnej misji.</p><a class="btn btn-primary" href="#/">Wróć na start ${icon('arrow', 16)}</a></header>`;
}
