/** Interaktywne ćwiczenia: wykres, schemat krążenia, scena językowa, graf. */
import { BIO_NODES, BIO_LINKS, GRAPHS } from './data.js';
import { routeCost } from './engine.js';
import { esc, icon } from './ui.js';

export function defaultAnswer(mission) {
  if (mission.type === 'linear') return { a: 1, b: 0 };
  if (mission.type === 'choice') return { selected: null };
  if (mission.type === 'path') return { path: [] };
  if (mission.type === 'graph') return { path: [mission.params.start] };
  return {};
}

export function isAnswerEmpty(mission, answer) {
  if (mission.type === 'choice') return answer.selected === null;
  if (mission.type === 'path') return answer.path.length === 0;
  if (mission.type === 'graph') return answer.path.length < 2;
  return false;
}

/* ---------- Matematyka ---------- */

const PLOT = { w: 560, h: 380, left: 44, right: 536, top: 18, bottom: 350, xMin: -5, xMax: 5, yMin: -6, yMax: 6 };
const sx = x => PLOT.left + (x - PLOT.xMin) / (PLOT.xMax - PLOT.xMin) * (PLOT.right - PLOT.left);
const sy = y => PLOT.top + (PLOT.yMax - y) / (PLOT.yMax - PLOT.yMin) * (PLOT.bottom - PLOT.top);
const fmt = n => (n < 0 ? '−' : '') + Math.abs(n);

export function equation({ a, b }) {
  const slope = a === 0 ? '' : a === 1 ? 'x' : a === -1 ? '−x' : `${fmt(a)}x`;
  if (!slope) return `y = <b>${fmt(b)}</b>`;
  const tail = b === 0 ? '' : ` ${b > 0 ? '+' : '−'} <b>${Math.abs(b)}</b>`;
  return `y = <b>${slope}</b>${tail}`;
}

export function linearPlot(m, { a, b }) {
  const g = [];
  for (let x = PLOT.xMin; x <= PLOT.xMax; x++) {
    g.push(`<line x1="${sx(x)}" y1="${PLOT.top}" x2="${sx(x)}" y2="${PLOT.bottom}" class="${x === 0 ? 'p-axis' : 'p-grid'}"/>`);
    if (x !== 0) g.push(`<text x="${sx(x)}" y="${sy(0) + 18}" class="p-tick" text-anchor="middle">${fmt(x)}</text>`);
  }
  for (let y = PLOT.yMin; y <= PLOT.yMax; y++) {
    g.push(`<line x1="${PLOT.left}" y1="${sy(y)}" x2="${PLOT.right}" y2="${sy(y)}" class="${y === 0 ? 'p-axis' : 'p-grid'}"/>`);
    if (y !== 0 && y % 2 === 0) g.push(`<text x="${sx(0) - 9}" y="${sy(y) + 4}" class="p-tick" text-anchor="end">${fmt(y)}</text>`);
  }
  const x1 = PLOT.xMin - 1, x2 = PLOT.xMax + 1;
  const line = `<line x1="${sx(x1)}" y1="${sy(a * x1 + b)}" x2="${sx(x2)}" y2="${sy(a * x2 + b)}" class="p-line"/>`;
  // Trójkąt nachylenia: krok o 1 w prawo od punktu (0, b).
  const tri = a === 0 ? '' : `<path d="M${sx(0)} ${sy(b)} H${sx(1)} V${sy(b + a)}" class="p-tri"/><text x="${sx(0.5)}" y="${sy(b) + (a > 0 ? 16 : -8)}" class="p-tri-label" text-anchor="middle">1</text><text x="${sx(1) + 8}" y="${sy(b + a / 2) + 4}" class="p-tri-label">${fmt(a)}</text>`;
  const intercept = `<circle cx="${sx(0)}" cy="${sy(b)}" r="4.5" class="p-b"/>`;
  const points = m.params.points.map(([x, y], i) => {
    const hit = a * x + b === y;
    const name = 'ABPQ'[m.id === 'math-2' ? i + 2 : i];
    const left = x <= 0 || x > 3;
    const lx = sx(x) + (left ? -12 : 12), anchor = left ? 'end' : 'start';
    return `<g class="p-pt ${hit ? 'hit' : ''}"><circle cx="${sx(x)}" cy="${sy(y)}" r="11" class="p-halo"/><circle cx="${sx(x)}" cy="${sy(y)}" r="5.5"/><text x="${lx}" y="${sy(y) - 10}" text-anchor="${anchor}" class="p-pt-label">${name} (${fmt(x)}; ${fmt(y)})</text></g>`;
  }).join('');
  return `<svg class="plot" viewBox="0 0 ${PLOT.w} ${PLOT.h}" role="img" aria-label="Układ współrzędnych z twoją prostą ${esc(equation({ a, b }).replace(/<[^>]+>/g, ''))}"><defs><clipPath id="plot-clip"><rect x="${PLOT.left}" y="${PLOT.top}" width="${PLOT.right - PLOT.left}" height="${PLOT.bottom - PLOT.top}"/></clipPath></defs>${g.join('')}<text x="${PLOT.right - 4}" y="${sy(0) - 8}" class="p-axis-name" text-anchor="end">x</text><text x="${sx(0) + 8}" y="${PLOT.top + 12}" class="p-axis-name">y</text><g clip-path="url(#plot-clip)">${line}${tri}</g>${intercept}${points}</svg>`;
}

export function pointChecks(m, { a, b }) {
  const names = m.id === 'math-2' ? ['P', 'Q'] : ['A', 'B'];
  return m.params.points.map(([x, y], i) => {
    const hit = a * x + b === y;
    return `<li class="${hit ? 'hit' : ''}">${icon(hit ? 'check' : 'target', 15)} ${names[i]} ${hit ? 'leży na prostej' : `jest poza prostą (tu y = ${fmt(a * x + b)})`}</li>`;
  }).join('');
}

function slider(key, label, value, min, max) {
  return `<div class="slider"><div class="slider-head"><label for="s-${key}">${label}</label><output id="o-${key}">${fmt(value)}</output></div><div class="slider-row"><button class="icon-btn" data-act="nudge" data-key="${key}" data-delta="-1" aria-label="Zmniejsz ${key}">${icon('minus', 16)}</button><input id="s-${key}" type="range" min="${min}" max="${max}" step="1" value="${value}" data-slider="${key}"/><button class="icon-btn" data-act="nudge" data-key="${key}" data-delta="1" aria-label="Zwiększ ${key}">${icon('plus', 16)}</button></div></div>`;
}

function renderLinear(m, s) {
  const ans = s.answer;
  return `<div class="stage stage-math">
    <div class="stage-bar"><span class="kicker">Wykres funkcji liniowej</span><span class="eq" id="eq">${equation(ans)}</span></div>
    <div class="plot-wrap" id="plot">${linearPlot(m, ans)}</div>
    <div class="math-controls">
      ${slider('a', 'Nachylenie <i>a</i>', ans.a, -4, 4)}
      ${slider('b', 'Wyraz wolny <i>b</i>', ans.b, -5, 5)}
      <ul class="pt-checks" id="pt-checks" aria-live="polite">${pointChecks(m, ans)}</ul>
    </div>
  </div>`;
}

/* ---------- Biologia ---------- */

const DEOXY = new Set(['right_ventricle|pulmonary_artery', 'pulmonary_artery|lungs', 'body|vena_cava', 'vena_cava|right_atrium', 'right_atrium|right_ventricle']);
const nodeR = n => n.kind === 'organ' ? 30 : n.kind === 'heart' ? 24 : 19;

function shorten(p, q, rp, rq) {
  const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
  return [p.x + dx / d * rp, p.y + dy / d * rp, q.x - dx / d * rq, q.y - dy / d * rq];
}

function renderPath(m, s) {
  const sel = s.answer.path;
  const byId = Object.fromEntries(BIO_NODES.map(n => [n.id, n]));
  const base = BIO_LINKS.map(([a, b]) => {
    const [x1, y1, x2, y2] = shorten(byId[a], byId[b], nodeR(byId[a]), nodeR(byId[b]));
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="bio-link"/>`;
  }).join('');
  const route = sel.slice(1).map((id, i, arr) => {
    const p = byId[sel[i]], q = byId[id];
    if (!p || !q) return '';
    const [x1, y1, x2, y2] = shorten(p, q, nodeR(p) + 3, nodeR(q) + 7);
    const kind = DEOXY.has(`${sel[i]}|${id}`) ? 'deoxy' : 'oxy';
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="bio-route ${kind} ${i === arr.length - 1 ? 'new' : ''}" marker-end="url(#arrow-${kind})"/>`;
  }).join('');
  const nodes = BIO_NODES.map(n => {
    const order = sel.map((id, i) => id === n.id ? i + 1 : null).filter(Boolean);
    const last = sel.at(-1) === n.id;
    return `<g class="bio-node k-${n.kind} ${order.length ? 'on' : ''} ${last ? 'last' : ''}" data-node="${n.id}" tabindex="0" role="button" aria-label="${esc(n.label)}${order.length ? `, krok ${order.join(' i ')}` : ''}"><circle cx="${n.x}" cy="${n.y}" r="${nodeR(n)}"/><text x="${n.x}" y="${n.y + 5}" class="bio-num" text-anchor="middle">${order.length ? order.join('·') : ''}</text><text x="${n.x}" y="${n.y + nodeR(n) + 17}" class="bio-label" text-anchor="middle">${esc(n.label)}</text></g>`;
  }).join('');
  const marker = k => `<marker id="arrow-${k}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10z" class="arrow-${k}"/></marker>`;
  const crumbs = sel.length
    ? sel.map((id, i) => `<li><span>${i + 1}</span>${esc(byId[id]?.label || id)}</li>`).join('')
    : '<li class="empty">Kliknij na schemacie pierwszy element drogi krwi.</li>';
  return `<div class="stage stage-bio">
    <div class="stage-bar"><span class="kicker">Schemat układu krążenia</span><span class="legend"><i class="lg deoxy"></i>krew odtlenowana <i class="lg oxy"></i>utlenowana</span></div>
    <div class="bio-wrap"><svg class="bio" viewBox="0 0 480 530" role="group" aria-label="Interaktywny schemat krążenia. Wybieraj struktury w kolejności przepływu krwi."><defs>${marker('oxy')}${marker('deoxy')}</defs>${base}${route}${nodes}</svg></div>
    <div class="route-bar"><ol class="crumbs">${crumbs}</ol><div class="route-actions"><button class="btn btn-ghost btn-sm" data-act="undo" ${sel.length ? '' : 'disabled'}>${icon('undo', 15)} Cofnij</button><button class="btn btn-ghost btn-sm" data-act="clear" ${sel.length ? '' : 'disabled'}>${icon('trash', 15)} Wyczyść</button></div></div>
  </div>`;
}

/* ---------- Angielski ---------- */

function renderChoice(m, s) {
  const sel = s.answer.selected;
  const [before, after] = m.prompt.split('___');
  const filled = sel === null ? '<span class="blank">&nbsp;?&nbsp;</span>' : `<span class="blank filled">${esc(m.params.options[sel])}</span>`;
  return `<div class="stage stage-case">
    <div class="case">
      <div class="case-head"><span class="case-stamp">Akta sprawy nr ${m.level}</span><span class="case-meta">Sala 204, godz. 18:42</span></div>
      <p class="case-scene">${esc(m.params.scene)}</p>
      <blockquote class="case-quote" lang="en">„${esc(before)}${filled}${esc(after ?? '')}”</blockquote>
      <span class="case-note">Zeznanie świadka. Uzupełnij lukę.</span>
    </div>
    <div class="options" role="radiogroup" aria-label="Warianty odpowiedzi">${m.params.options.map((o, i) =>
      `<button class="option ${sel === i ? 'on' : ''}" role="radio" aria-checked="${sel === i}" data-choice="${i}"><kbd>${i + 1}</kbd><span lang="en">${esc(o)}</span></button>`).join('')}</div>
    <p class="stage-foot">${icon('info', 14)} Możesz też wybierać klawiszami 1–4.</p>
  </div>`;
}

/* ---------- Informatyka ---------- */

export function dijkstraTrace(graph, from) {
  const ids = graph.nodes.map(n => n.id);
  const dist = Object.fromEntries(ids.map(i => [i, Infinity]));
  const prev = {};
  const done = new Set();
  const steps = [];
  dist[from] = 0;
  steps.push({ current: null, done: [], dist: { ...dist }, prev: { ...prev }, updated: [from], note: `Start: koszt dojścia do ${from} wynosi 0, do pozostałych węzłów — ∞.` });
  while (done.size < ids.length) {
    let u = null;
    for (const i of ids) if (!done.has(i) && (u === null || dist[i] < dist[u])) u = i;
    if (u === null || dist[u] === Infinity) break;
    done.add(u);
    const updated = [];
    for (const [a, b, w] of graph.edges) {
      const v = a === u ? b : b === u ? a : null;
      if (!v || done.has(v)) continue;
      if (dist[u] + w < dist[v]) { dist[v] = dist[u] + w; prev[v] = u; updated.push(v); }
    }
    const note = updated.length
      ? `Wybieram ${u} (koszt ${dist[u]}) i poprawiam: ${updated.map(v => `${v} → ${dist[v]}`).join(', ')}.`
      : `Wybieram ${u} (koszt ${dist[u]}). Żaden sąsiad nie zyskuje tańszej drogi.`;
    steps.push({ current: u, done: [...done], dist: { ...dist }, prev: { ...prev }, updated, note });
  }
  return steps;
}

function renderGraph(m, s) {
  const graph = GRAPHS[m.params.graph];
  const path = s.answer.path;
  const trace = s.trace;
  const step = trace ? trace.steps[trace.index] : null;
  const onRoute = new Set(path.slice(1).map((id, i) => [path[i], id].sort().join('|')));
  const treeEdges = step ? new Set(Object.entries(step.prev).map(([v, u]) => [u, v].sort().join('|'))) : new Set();
  const byId = Object.fromEntries(graph.nodes.map(n => [n.id, n]));
  const last = path.at(-1);
  const edges = graph.edges.map(([a, b, w]) => {
    const p = byId[a], q = byId[b], key = [a, b].sort().join('|');
    const reachable = !trace && (a === last || b === last) && !path.includes(a === last ? b : a);
    const cls = trace ? (treeEdges.has(key) ? 'tree' : '') : onRoute.has(key) ? 'on' : reachable ? 'next' : '';
    const cx = (p.x + q.x) / 2, cy = (p.y + q.y) / 2;
    return `<g class="g-edge ${cls}"><line x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/><rect x="${cx - 15}" y="${cy - 12}" width="30" height="24" rx="12"/><text x="${cx}" y="${cy + 4.5}" text-anchor="middle">${w}</text></g>`;
  }).join('');
  const nodes = graph.nodes.map(n => {
    const role = n.id === m.params.start ? 'start' : n.id === m.params.end ? 'end' : '';
    let cls = `g-node ${role}`;
    let badge = '';
    if (trace) {
      if (step.done.includes(n.id)) cls += ' done';
      if (step.current === n.id) cls += ' current';
      if (step.updated.includes(n.id)) cls += ' updated';
      const d = step.dist[n.id];
      badge = `<g class="g-dist"><rect x="${n.x - 19}" y="${n.y - 52}" width="38" height="20" rx="10"/><text x="${n.x}" y="${n.y - 38}" text-anchor="middle">${d === Infinity ? '∞' : d}</text></g>`;
    } else {
      if (path.includes(n.id)) cls += ' on';
      if (n.id === last) cls += ' last';
    }
    return `<g class="${cls}" data-node="${n.id}" tabindex="${trace ? -1 : 0}" role="button" aria-label="Węzeł ${n.id}${role === 'start' ? ' (start)' : role === 'end' ? ' (cel)' : ''}"><circle cx="${n.x}" cy="${n.y}" r="25"/><text x="${n.x}" y="${n.y + 6.5}" class="g-label" text-anchor="middle">${n.id}</text>${badge}</g>`;
  }).join('');
  const cost = routeCost(graph, path) ?? 0;
  const footer = trace
    ? `<div class="trace-bar"><div class="trace-note" aria-live="polite"><span class="kicker">Krok ${trace.index} z ${trace.steps.length - 1}</span><p>${esc(step.note)}</p></div><div class="route-actions"><button class="btn btn-ghost btn-sm" data-act="trace-prev" ${trace.index === 0 ? 'disabled' : ''} aria-label="Poprzedni krok">${icon('prev', 16)}</button><button class="btn btn-ghost btn-sm" data-act="trace-next" ${trace.index === trace.steps.length - 1 ? 'disabled' : ''} aria-label="Następny krok">${icon('next', 16)}</button><button class="btn btn-ghost btn-sm" data-act="trace-close">${icon('close', 15)} Zamknij</button></div></div>`
    : `<div class="route-bar"><div class="route-sum"><span class="kicker">Twoja trasa</span><strong class="mono">${path.join(' → ')}</strong></div><div class="route-sum"><span class="kicker">Koszt</span><strong class="mono">${cost}</strong></div><div class="route-actions"><button class="btn btn-ghost btn-sm" data-act="undo" ${path.length > 1 ? '' : 'disabled'}>${icon('undo', 15)} Cofnij</button>${s.result ? `<button class="btn btn-ghost btn-sm" data-act="trace">${icon('play', 14)} Pokaż, jak liczy Dijkstra</button>` : ''}</div></div>`;
  return `<div class="stage stage-graph">
    <div class="stage-bar"><span class="kicker">${trace ? 'Algorytm Dijkstry krok po kroku' : 'Graf ważony'}</span><span class="legend">${trace ? '<i class="lg done"></i>koszt ustalony <i class="lg cur"></i>sprawdzany teraz' : `liczba przy krawędzi to koszt, trasa z <b>${m.params.start}</b> do <b>${m.params.end}</b>`}</span></div>
    <div class="graph-wrap"><svg class="graph ${trace ? 'tracing' : ''}" viewBox="0 0 600 385" role="group" aria-label="Graf ważony. Wybieraj sąsiednie węzły, aby zbudować trasę.">${edges}${nodes}</svg></div>
    ${footer}
  </div>`;
}

export function renderActivity(m, session) {
  return { linear: renderLinear, path: renderPath, choice: renderChoice, graph: renderGraph }[m.type](m, session);
}
