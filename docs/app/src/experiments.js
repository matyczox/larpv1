/**
 * Eksperymenty dobierane do rozpoznanej pułapki. Każdy to sprawdzony szablon
 * konfigurowany liczbami z bieżącego zadania; cel eksperymentu sprawdza silnik, nie AI.
 *
 *  - roznica:   wyrażenie vs błędna wersja; uczeń odkrywa brakujący wyraz (B01–B05)
 *  - podstaw:   podstawianie x do równania; uczeń znajduje x, dla którego obie strony są równe (B06–B09, B16)
 *  - znak:      parabola i oś liczbowa; uczeń zaznacza, gdzie nierówność jest spełniona (B11–B13)
 *  - zwrot:     mnożenie nierówności przez k; uczeń odkrywa, kiedy zwrot się zmienia (B10)
 *  - nachylenie: trójkąt nachylenia na wykresie; uczeń odczytuje Δx, Δy albo b (B14, B15, B18)
 */
import { parseExpr, parseLine, exprEqual, polyFit, fmtNum, pretty, solvePoly, normalize } from './math.js';
import { esc } from './ui.js';

export const TEMPLATE_OF = {
  B01: 'roznica', B02: 'roznica', B03: 'roznica', B04: 'roznica', B05: 'roznica',
  B06: 'podstaw', B07: 'podstaw', B08: 'podstaw', B09: 'podstaw', B16: 'podstaw',
  B10: 'zwrot', B11: 'znak', B12: 'znak', B13: 'znak',
  B14: 'nachylenie', B15: 'nachylenie', B18: 'nachylenie',
};

/* ---------- Wykres (wspólny) ---------- */

export function plot({ xMin = -6, xMax = 8, yMin = -8, yMax = 8, fns = [], points = [], marks = [], tri = null, probe = null, w = 560, h = 360 }) {
  const L = 40, R = w - 12, T = 12, B = h - 26;
  const sx = x => L + (x - xMin) / (xMax - xMin) * (R - L);
  const sy = y => T + (yMax - y) / (yMax - yMin) * (B - T);
  const g = [];
  for (let x = Math.ceil(xMin); x <= xMax; x++) {
    g.push(`<line x1="${sx(x)}" y1="${T}" x2="${sx(x)}" y2="${B}" class="${x === 0 ? 'p-axis' : 'p-grid'}"/>`);
    if (x !== 0 && x % 2 === 0) g.push(`<text x="${sx(x)}" y="${Math.min(B, Math.max(T, sy(0))) + 16}" class="p-tick" text-anchor="middle">${fmtNum(x)}</text>`);
  }
  const ys = Math.max(1, Math.round((yMax - yMin) / 8));
  for (let y = Math.ceil(yMin); y <= yMax; y++) {
    if (y !== 0 && y % ys) continue;
    g.push(`<line x1="${L}" y1="${sy(y)}" x2="${R}" y2="${sy(y)}" class="${y === 0 ? 'p-axis' : 'p-grid'}"/>`);
    if (y !== 0) g.push(`<text x="${Math.min(R, Math.max(L, sx(0))) - 7}" y="${sy(y) + 4}" class="p-tick" text-anchor="end">${fmtNum(y)}</text>`);
  }
  const curves = fns.map(({ f, cls = 'p-line' }) => {
    const pts = [];
    for (let i = 0; i <= 160; i++) {
      const x = xMin + (xMax - xMin) * i / 160, y = f(x);
      if (Number.isFinite(y)) pts.push(`${sx(x).toFixed(1)},${sy(Math.max(yMin - 50, Math.min(yMax + 50, y))).toFixed(1)}`);
    }
    return `<polyline points="${pts.join(' ')}" class="${cls}" fill="none"/>`;
  }).join('');
  const triangle = tri ? `<path d="M${sx(tri.x1)} ${sy(tri.y1)} H${sx(tri.x2)} V${sy(tri.y2)}" class="p-tri"/>${tri.labels ? `<text x="${(sx(tri.x1) + sx(tri.x2)) / 2}" y="${sy(tri.y1) + (tri.y2 > tri.y1 ? 18 : -8)}" class="p-tri-label" text-anchor="middle">${esc(tri.labels[0])}</text><text x="${sx(tri.x2) + 8}" y="${(sy(tri.y1) + sy(tri.y2)) / 2 + 4}" class="p-tri-label">${esc(tri.labels[1])}</text>` : ''}` : '';
  const pr = probe ? `<line x1="${sx(probe.x)}" y1="${sy(0)}" x2="${sx(probe.x)}" y2="${sy(probe.y)}" class="p-probe"/><circle cx="${sx(probe.x)}" cy="${sy(Math.max(yMin, Math.min(yMax, probe.y)))}" r="6" class="p-probe-dot ${probe.ok ? 'hit' : ''}"/>` : '';
  const pts = points.map(([x, y, label, cls = '']) => `<g class="p-pt ${cls}"><circle cx="${sx(x)}" cy="${sy(y)}" r="5.5"/>${label ? `<text x="${sx(x) + 9}" y="${sy(y) - 9}" class="p-pt-label">${esc(label)}</text>` : ''}</g>`).join('');
  const mk = marks.map(({ x, cls }) => `<circle cx="${sx(x)}" cy="${sy(0)}" r="5" class="p-mark ${cls || ''}"/>`).join('');
  return `<svg class="plot" viewBox="0 0 ${w} ${h}" role="img" aria-label="Wykres"><defs><clipPath id="pc"><rect x="${L}" y="${T}" width="${R - L}" height="${B - T}"/></clipPath></defs>${g.join('')}<g clip-path="url(#pc)">${curves}${triangle}${pr}</g>${mk}${pts}</svg>`;
}

/* ---------- Konfiguracja eksperymentu dla zadania i pułapki ---------- */

export function initExperiment(task, bugId) {
  const type = TEMPLATE_OF[bugId];
  const bug = task.bugs.find(b => b.id === bugId);
  const base = { type, bugId, done: false, msg: null };
  if (type === 'roznica') {
    const good = parseExpr(task.statement), bad = bug.answer.f;
    return { ...base, x: 2, guess: '', good, bad, badText: bug.steps.at(-1) };
  }
  if (type === 'podstaw') {
    const [left, right] = normalize(task.statement).split('=');
    return { ...base, x: 0, L: parseExpr(left), R: parseExpr(right), wrong: bug.answer.set[0]?.lo, left, right };
  }
  if (type === 'znak') {
    const [lhs, op] = splitIneq(task.statement);
    const f = parseExpr(lhs), c = polyFit(f);
    const roots = solvePoly('=', c).map(s => s.lo);
    return { ...base, f, c, op, roots, x: Math.round(roots[0] - 1), marks: {} };
  }
  if (type === 'zwrot') {
    return { ...base, k: 1, seenFlip: false, seenKeep: false, choice: null };
  }
  if (type === 'nachylenie') {
    const [[x1, y1], [x2, y2]] = task.points;
    const a = (y2 - y1) / (x2 - x1);
    return { ...base, x1, y1, x2, y2, a, b: y1 - a * x1, dx: '', dy: '', b0: '', askB: bugId === 'B18' };
  }
  return base;
}

function splitIneq(st) {
  const m = normalize(st).match(/^(.*?)(≤|≥|<|>)\s*0\s*$/);
  return [m[1], m[2]];
}

const holds = (op, v) => (op === '<' ? v < 0 : op === '>' ? v > 0 : op === '≤' ? v <= 1e-12 : v >= -1e-12);

/** Kawałki osi dla szablonu „znak”: (−∞; r1), {r1}, (r1; r2), {r2}, (r2; +∞). */
function pieces(e) {
  const [p, q] = e.roots;
  const list = [{ key: 'L', label: `x < ${fmtNum(p)}`, x: p - 1 }];
  list.push({ key: 'P', label: `x = ${fmtNum(p)}`, x: p });
  if (q !== undefined) list.push({ key: 'M', label: `${fmtNum(p)} < x < ${fmtNum(q)}`, x: (p + q) / 2 }, { key: 'Q', label: `x = ${fmtNum(q)}`, x: q }, { key: 'R', label: `x > ${fmtNum(q)}`, x: q + 1 });
  else list.push({ key: 'R', label: `x > ${fmtNum(p)}`, x: p + 1 });
  return list.map(pc => ({ ...pc, truth: holds(e.op, e.f(pc.x)) }));
}

/* ---------- Widoki ---------- */

const slider = (act, value, min, max, label) => `<label class="exp-slider"><span>${label}</span><input type="range" min="${min}" max="${max}" step="1" value="${value}" data-exp="${act}"/><output>${fmtNum(value)}</output></label>`;

export function experimentTitle(type) {
  return { roznica: 'Sprawdź na liczbach', podstaw: 'Podstaw i sprawdź', znak: 'Znak paraboli', zwrot: 'Mnożenie nierówności', nachylenie: 'Trójkąt nachylenia' }[type];
}

function parts(task, e) {
  const done = e.done ? `<div class="exp-done" role="status">Odkryte. ${esc(doneText(task, e))}</div>` : '';
  const msg = e.msg ? `<p class="exp-msg">${esc(e.msg)}</p>` : '';
  if (e.type === 'roznica') {
    const v1 = e.good(e.x), v2 = e.bad(e.x);
    return { head: `<p class="exp-goal">Kuba twierdzi, że <b>${esc(pretty(task.statement))} = ${esc(pretty(e.badText))}</b>. Podstawiaj różne x i porównaj obie strony.</p>`, slider: slider('x', e.x, -5, 10, 'x ='), live: `<table class="exp-table"><tr><th>${esc(pretty(task.statement))}</th><td>${fmtNum(v1)}</td></tr><tr><th>${esc(pretty(e.badText))}</th><td>${fmtNum(v2)}</td></tr><tr class="diff"><th>różnica</th><td>${fmtNum(v1 - v2)}</td></tr></table>
      <p class="exp-goal">Jak różnica zależy od x? Wpisz ją jako wyrażenie z x. To właśnie zgubił Kuba.</p>
      <div class="row"><input class="math-in" data-exp-input="guess" value="${esc(e.guess)}" placeholder="np. 4x" autocomplete="off" spellcheck="false"/><button class="btn btn-primary btn-sm" data-act="exp-check">Sprawdź</button></div>${msg}${done}` };
  }
  if (e.type === 'podstaw') {
    const lv = e.L(e.x), rv = e.R(e.x), eq = Math.abs(lv - rv) < 1e-9;
    const wl = Number.isFinite(e.wrong) ? `<p class="exp-note">Kuba twierdzi, że x = ${fmtNum(e.wrong)}. Wtedy lewa strona to ${fmtNum(e.L(e.wrong))}, a prawa ${fmtNum(e.R(e.wrong))}.</p>` : '';
    return { head: `<p class="exp-goal">Rozwiązanie równania to taka liczba, po której podstawieniu obie strony są równe. Przesuwaj x i znajdź ją.</p>`, slider: slider('x', e.x, -10, 12, 'x ='), live: `<table class="exp-table"><tr><th>lewa strona: ${esc(pretty(e.left))}</th><td>${fmtNum(lv)}</td></tr><tr><th>prawa strona: ${esc(pretty(e.right))}</th><td>${fmtNum(rv)}</td></tr><tr class="${eq ? 'eq' : 'diff'}"><th>${eq ? 'obie strony równe' : 'strony się różnią'}</th><td>${eq ? '=' : '≠'}</td></tr></table>
      ${wl}<button class="btn btn-primary btn-sm" data-act="exp-check">To jest rozwiązanie</button>${msg}${done}` };
  }
  if (e.type === 'znak') {
    const y = e.f(e.x), ok = holds(e.op, y);
    const ext = Math.max(...e.roots.map(Math.abs)) + 3;
    const vals = [e.f(e.roots[0] - 3), e.f(e.roots.at(-1) + 3), e.f((e.roots[0] + e.roots.at(-1)) / 2)];
    const yMax = Math.max(4, ...vals) + 1, yMin = Math.min(-4, ...vals) - 1;
    const pcs = pieces(e);
    return { head: `<p class="exp-goal">Wykres to y = ${esc(pretty(task.statement.replace(/\s*(≤|≥|<|>)\s*0\s*$/, '')))}. Przesuwaj punkt i sprawdzaj znak y. Potem zaznacz, gdzie spełniona jest nierówność <b>y ${e.op} 0</b>.</p>`, slider: slider('x', e.x, Math.floor(e.roots[0] - 4), Math.ceil(e.roots.at(-1) + 4), 'x ='), live: `<div class="plot-wrap">${plot({ xMin: Math.floor(Math.min(e.roots[0], -1) - 3), xMax: Math.ceil(ext), yMin, yMax, fns: [{ f: e.f }], marks: e.roots.map(x => ({ x })), probe: { x: e.x, y, ok } })}</div>
      <p class="exp-note">y = ${fmtNum(y)}, ${ok ? 'nierówność spełniona' : 'nierówność niespełniona'}</p>
      <div class="sign-pieces" role="group" aria-label="Części osi liczbowej">${pcs.map(p => `<button class="piece ${e.marks[p.key] === true ? 'yes' : e.marks[p.key] === false ? 'no' : ''}" data-act="exp-piece" data-key="${p.key}" aria-pressed="${e.marks[p.key] === true}">${esc(p.label)}<small>${e.marks[p.key] === true ? 'spełnia' : e.marks[p.key] === false ? 'nie spełnia' : 'kliknij'}</small></button>`).join('')}</div>
      <button class="btn btn-primary btn-sm" data-act="exp-check">Sprawdź zaznaczenie</button>${msg}${done}` };
  }
  if (e.type === 'zwrot') {
    const u = 1, v = 3, ku = e.k * u, kv = e.k * v;
    const rel = ku < kv ? '<' : ku > kv ? '>' : '=';
    return { head: `<p class="exp-goal">Wiemy, że 1 < 3. Pomnóż obie strony przez k i zobacz, co dzieje się ze znakiem nierówności.</p>`, slider: slider('k', e.k, -4, 4, 'k ='), live: `<p class="exp-big">${fmtNum(e.k)} · 1 ${rel} ${fmtNum(e.k)} · 3 <span class="muted">czyli</span> ${fmtNum(ku)} ${rel} ${fmtNum(kv)} ${rel === '>' ? '<b class="flip">zwrot się zmienił</b>' : rel === '<' ? '<b class="keep">zwrot ten sam</b>' : ''}</p>
      <p class="exp-note">${e.seenFlip ? '✓ widziałeś zmianę zwrotu' : '○ znajdź k, przy którym zwrot się zmienia'} · ${e.seenKeep ? '✓ widziałeś zachowany zwrot' : '○ znajdź k, przy którym zwrot zostaje'}</p>
      <fieldset class="exp-choice"><legend>Zwrot nierówności zmienia się, gdy mnożymy (albo dzielimy) przez liczbę…</legend>${['dodatnią', 'ujemną', 'większą od 1'].map((o, i) => `<button class="chip ${e.choice === i ? 'on' : ''}" data-act="exp-choice" data-value="${i}">${o}</button>`).join('')}</fieldset>
      <button class="btn btn-primary btn-sm" data-act="exp-check">Sprawdź</button>${msg}${done}` };
  }
  if (e.type === 'nachylenie') {
    const f = x => e.a * x + e.b;
    const ys = [e.y1, e.y2, e.b, 0];
    return { head: '', slider: '', live: `<p class="exp-goal">${e.askB ? 'Wyraz wolny b to wartość y w punkcie, w którym prosta przecina oś y (x = 0). Odczytaj go z wykresu.' : 'Odczytaj z trójkąta, o ile zmienia się x i o ile y, gdy przechodzisz z A do B.'}</p>
      <div class="plot-wrap">${plot({ xMin: Math.min(-2, e.x1 - 1), xMax: Math.max(6, e.x2 + 1), yMin: Math.min(...ys) - 2, yMax: Math.max(...ys) + 2, fns: [{ f }], points: [[e.x1, e.y1, 'A'], [e.x2, e.y2, 'B'], ...(e.done && e.askB ? [[0, e.b, 'b', 'hit']] : [])], tri: e.askB ? null : { x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2, labels: ['Δx = ?', 'Δy = ?'] } })}</div>
      ${e.askB ? `<div class="row"><label class="inline">y dla x = 0: <input class="math-in short" data-exp-input="b0" value="${esc(e.b0)}" autocomplete="off"/></label></div>`
        : `<div class="row"><label class="inline">Δx = <input class="math-in short" data-exp-input="dx" value="${esc(e.dx)}" autocomplete="off"/></label><label class="inline">Δy = <input class="math-in short" data-exp-input="dy" value="${esc(e.dy)}" autocomplete="off"/></label></div>`}
      <button class="btn btn-primary btn-sm" data-act="exp-check">Sprawdź</button>${msg}${done}` };
  }
  return { head: '', slider: '', live: '' };
}

export function renderExperiment(task, e) {
  const p = parts(task, e);
  return `${p.head}${p.slider}<div id="exp-live" aria-live="polite">${p.live}</div>`;
}

export const renderExperimentLive = (task, e) => parts(task, e).live;

function doneText(task, e) {
  if (e.type === 'roznica') return `Brakowało ${pretty(e.guess)}. Tyle wynosi różnica między poprawnym rozwinięciem a wersją Kuby, dla każdego x.`;
  if (e.type === 'podstaw') return `Dla x = ${fmtNum(e.x)} obie strony są równe, a dla wyniku Kuby nie. Podstawienie to najprostszy sposób, żeby sprawdzić rozwiązanie.`;
  if (e.type === 'znak') return 'Zaznaczyłeś dokładnie zbiór rozwiązań. Znak paraboli decyduje, czy rozwiązanie jest między miejscami zerowymi, czy na zewnątrz.';
  if (e.type === 'zwrot') return 'Mnożenie przez liczbę ujemną odwraca kolejność liczb na osi, dlatego zwrot nierówności się zmienia.';
  return e.askB ? `b = ${fmtNum(e.b)}: to wartość y dla x = 0, a nie y dowolnego punktu.` : `a = Δy/Δx = ${fmtNum(e.y2 - e.y1)}/${fmtNum(e.x2 - e.x1)} = ${fmtNum(e.a)}. Zmiana y jest w liczniku.`;
}

/* ---------- Interakcje ---------- */

export function updateExperiment(task, e, act, value) {
  e.msg = null;
  if (act === 'x') e.x = Number(value);
  if (act === 'k') {
    e.k = Number(value);
    if (e.k < 0) e.seenFlip = true;
    if (e.k > 0) e.seenKeep = true;
  }
  if (act === 'piece') e.marks[value] = e.marks[value] === true ? false : true;
  if (act === 'choice') e.choice = Number(value);
  if (act === 'input') Object.assign(e, value);
  if (act === 'check') checkExperiment(task, e);
  return e;
}

function num(s) {
  try { const f = parseExpr(s); const v = f(0); return Number.isFinite(v) && Math.abs(v - f(1.7)) < 1e-9 ? v : NaN; } catch { return NaN; }
}

function checkExperiment(task, e) {
  if (e.type === 'roznica') {
    let g;
    try { g = parseExpr(e.guess); } catch { e.msg = 'Nie rozumiem tego zapisu. Wpisz wyrażenie z x, np. 4x.'; return; }
    if (exprEqual(g, x => e.good(x) - e.bad(x))) e.done = true;
    else e.msg = 'Jeszcze nie. Sprawdź różnicę dla kilku x: jak się zmienia, gdy x rośnie o 1?';
  } else if (e.type === 'podstaw') {
    if (Math.abs(e.L(e.x) - e.R(e.x)) < 1e-9) e.done = true;
    else e.msg = 'Dla tego x strony się różnią. Przesuwaj dalej.';
  } else if (e.type === 'znak') {
    const pcs = pieces(e);
    if (pcs.some(p => e.marks[p.key] === undefined)) { e.msg = 'Zaznacz wszystkie części osi (kliknięcie przełącza „spełnia” i „nie spełnia”).'; return; }
    const wrong = pcs.filter(p => e.marks[p.key] !== p.truth);
    if (!wrong.length) e.done = true;
    else e.msg = `Sprawdź jeszcze raz: ${wrong.map(p => p.label).join(', ')}. Ustaw tam punkt i zobacz znak y.`;
  } else if (e.type === 'zwrot') {
    if (!e.seenFlip || !e.seenKeep) e.msg = 'Najpierw poeksperymentuj: znajdź k, przy którym zwrot się zmienia, i takie, przy którym zostaje.';
    else if (e.choice !== 1) e.msg = 'Spójrz jeszcze raz, przy jakich k zwrot się zmieniał.';
    else e.done = true;
  } else if (e.type === 'nachylenie') {
    if (e.askB) {
      if (Math.abs(num(e.b0) - e.b) < 1e-9) e.done = true; else e.msg = 'Znajdź punkt prostej leżący na osi y, czyli dla x = 0.';
    } else if (Math.abs(num(e.dx) - (e.x2 - e.x1)) < 1e-9 && Math.abs(num(e.dy) - (e.y2 - e.y1)) < 1e-9) e.done = true;
    else e.msg = 'Policz kratki: o ile w prawo (Δx) i o ile w górę lub w dół (Δy) przechodzisz z A do B.';
  }
}

export { parseLine };
