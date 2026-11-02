/**
 * Mały, deterministyczny silnik matematyczny (bez zależności).
 * - parsuje zapis ucznia: wyrażenia z x, równania, nierówności, przedziały,
 * - porównuje wyrażenia przez próbkowanie numeryczne,
 * - wyznacza zbiory rozwiązań równań i nierówności stopnia ≤ 2.
 */

const EPS = 1e-7;
const close = (a, b) => Math.abs(a - b) <= EPS * (1 + Math.abs(a) + Math.abs(b));

/* ---------- Normalizacja zapisu ---------- */

export function normalize(src) {
  return String(src ?? '')
    .replace(/[−–—]/g, '-')
    .replace(/[·×∙]/g, '*')
    .replace(/:/g, '/')
    .replace(/²/g, '^2').replace(/³/g, '^3')
    .replace(/≤|=<|<=/g, '≤').replace(/≥|=>|>=/g, '≥')
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/X/g, 'x')
    .trim();
}

/* ---------- Parser wyrażeń ---------- */

class ParseError extends Error {}

function tokenize(s) {
  const out = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === ' ') { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i; while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const text = s.slice(i, j);
      if (!/^\d*\.?\d+$|^\d+\.$/.test(text)) throw new ParseError(`Niepoprawna liczba „${text}”`);
      out.push({ t: 'num', v: Number(text) }); i = j; continue;
    }
    if (c === 'x') { out.push({ t: 'x' }); i++; continue; }
    if ('+-*/^()'.includes(c)) { out.push({ t: c }); i++; continue; }
    throw new ParseError(`Nieznany znak „${c}”`);
  }
  return out;
}

export function parseExpr(src) {
  const toks = tokenize(normalize(src));
  if (!toks.length) throw new ParseError('Puste wyrażenie');
  let p = 0;
  const peek = () => toks[p]?.t;
  const eat = t => { if (peek() !== t) throw new ParseError(t === ')' ? 'Brakuje nawiasu zamykającego' : `Oczekiwano „${t}”`); p++; };
  function expr() {
    let f = term();
    while (peek() === '+' || peek() === '-') {
      const op = toks[p++].t, a = f, b = term();
      f = op === '+' ? x => a(x) + b(x) : x => a(x) - b(x);
    }
    return f;
  }
  function term() {
    let f = unary();
    for (;;) {
      const t = peek();
      if (t === '*' || t === '/') {
        p++; const a = f, b = unary();
        f = t === '*' ? x => a(x) * b(x) : x => a(x) / b(x);
      } else if (t === 'num' || t === 'x' || t === '(') {
        const a = f, b = power(); f = x => a(x) * b(x); // mnożenie domyślne: 2x, 3(x+1), (x+1)(x-2)
      } else return f;
    }
  }
  function unary() {
    if (peek() === '-') { p++; const a = unary(); return x => -a(x); }
    if (peek() === '+') { p++; return unary(); }
    return power();
  }
  function power() {
    const base = primary();
    if (peek() === '^') { p++; const e = unary(); return x => Math.pow(base(x), e(x)); }
    return base;
  }
  function primary() {
    const t = toks[p];
    if (!t) throw new ParseError('Wyrażenie urywa się');
    if (t.t === 'num') { p++; const v = t.v; return () => v; }
    if (t.t === 'x') { p++; return x => x; }
    if (t.t === '(') { p++; const f = expr(); eat(')'); return f; }
    throw new ParseError(`Nieoczekiwany znak „${t.t}”`);
  }
  const f = expr();
  if (p < toks.length) throw new ParseError(toks[p].t === ')' ? 'Za dużo nawiasów zamykających' : `Nieoczekiwany znak „${toks[p].t}”`);
  return f;
}

/* ---------- Wielomiany stopnia ≤ 2 ---------- */

const PROBES = [2, -3, 0.5, 7, -1.7, 3.3];

/** Współczynniki [a2, a1, a0] albo null, gdy funkcja nie jest wielomianem stopnia ≤ 2. */
export function polyFit(f) {
  const f0 = f(0), f1 = f(1), fm = f(-1);
  if (![f0, f1, fm].every(Number.isFinite)) return null;
  const a2 = (f1 + fm) / 2 - f0, a1 = (f1 - fm) / 2, a0 = f0;
  for (const x of PROBES) {
    const v = f(x), q = a2 * x * x + a1 * x + a0;
    if (!Number.isFinite(v) || !close(v, q)) return null;
  }
  const clean = v => (Math.abs(v) < 1e-10 ? 0 : v);
  return [clean(a2), clean(a1), clean(a0)];
}

/* ---------- Zbiory rozwiązań ---------- */
// Zbiór to posortowana lista przedziałów {lo, hi, loC, hiC}; punkt to przedział zdegenerowany.

export const EMPTY = Object.freeze([]);
export const ALL = Object.freeze([{ lo: -Infinity, hi: Infinity, loC: false, hiC: false }]);
const point = v => ({ lo: v, hi: v, loC: true, hiC: true });
const round = v => (Number.isFinite(v) ? Math.round(v * 1e9) / 1e9 : v);

function roots([a2, a1, a0]) {
  if (a2 === 0) return a1 === 0 ? [] : [round(-a0 / a1)];
  const d = a1 * a1 - 4 * a2 * a0;
  if (d < -1e-12) return [];
  if (Math.abs(d) <= 1e-12) return [round(-a1 / (2 * a2))];
  const s = Math.sqrt(d);
  return [round((-a1 - s) / (2 * a2)), round((-a1 + s) / (2 * a2))].sort((a, b) => a - b);
}

const holds = (op, v) => op === '=' ? Math.abs(v) < 1e-9 : op === '<' ? v < -1e-12 : op === '>' ? v > 1e-12 : op === '≤' ? v <= 1e-9 : v >= -1e-9;

/** Rozwiązuje p(x) op 0 dla wielomianu stopnia ≤ 2. */
export function solvePoly(op, c) {
  const [a2, a1, a0] = c;
  const p = x => a2 * x * x + a1 * x + a0;
  if (a2 === 0 && a1 === 0) return holds(op, a0) ? ALL : EMPTY;
  const rs = roots(c);
  // Kawałki: (-∞, r1), {r1}, (r1, r2), {r2}, (r2, ∞)
  const pieces = [];
  const edges = [-Infinity, ...rs, Infinity];
  for (let i = 0; i < edges.length - 1; i++) {
    const lo = edges[i], hi = edges[i + 1];
    const mid = lo === -Infinity ? (hi === Infinity ? 0 : hi - 1) : hi === Infinity ? lo + 1 : (lo + hi) / 2;
    pieces.push({ lo, hi, loC: false, hiC: false, ok: holds(op, p(mid)) });
    if (hi !== Infinity) pieces.push({ ...point(hi), ok: holds(op, p(hi)) });
  }
  return mergePieces(pieces);
}

function mergePieces(pieces) {
  const out = [];
  for (const pc of pieces) {
    if (!pc.ok) continue;
    const last = out.at(-1);
    if (last && last.hi === pc.lo && (last.hiC || pc.loC)) { last.hi = pc.hi; last.hiC = pc.hiC; }
    else out.push({ lo: pc.lo, hi: pc.hi, loC: pc.loC, hiC: pc.hiC });
  }
  return out;
}

export function union(...sets) {
  const all = sets.flat().map(s => ({ ...s })).sort((a, b) => a.lo - b.lo || (b.loC - a.loC));
  const out = [];
  for (const s of all) {
    const last = out.at(-1);
    if (last && (s.lo < last.hi || (s.lo === last.hi && (last.hiC || s.loC)))) {
      if (s.hi > last.hi || (s.hi === last.hi && s.hiC)) { last.hi = s.hi; last.hiC = s.hiC || (s.hi === last.hi && last.hiC); }
    } else out.push(s);
  }
  return out;
}

export function setEqual(A, B) {
  if (A.length !== B.length) return false;
  return A.every((a, i) => {
    const b = B[i];
    const endOk = (x, y) => (x === y) || (Number.isFinite(x) && Number.isFinite(y) && close(x, y));
    return endOk(a.lo, b.lo) && endOk(a.hi, b.hi)
      && (a.lo === -Infinity || a.loC === b.loC) && (a.hi === Infinity || a.hiC === b.hiC);
  });
}

/* ---------- Instrukcje: wyrażenie, relacja albo odpowiedź-zbiór ---------- */

const REL = /(≤|≥|<|>|=)/;

function splitRelation(s) {
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (depth === 0 && REL.test(c)) {
      const rest = s.slice(i + 1);
      if (REL.test(rest.replace(/\([^)]*\)/g, ''))) throw new ParseError('Za dużo znaków relacji w jednym kroku');
      return { left: s.slice(0, i), op: c, right: rest };
    }
  }
  return null;
}

const INF = /^([+-]?)\s*(∞|inf|oo|nieskonczonosc|nieskończoność)$/i;
function endpoint(txt) {
  const t = txt.trim();
  const m = t.match(INF);
  if (m) return m[1] === '-' ? -Infinity : Infinity;
  const f = parseExpr(t), v = f(0);
  if (!Number.isFinite(v) || !close(v, f(1.37))) throw new ParseError(`Koniec przedziału „${t}” musi być liczbą`);
  return round(v);
}

function parseInterval(s) {
  const m = s.trim().match(/^([([⟨<])\s*(.+?)\s*[;,]\s*(.+?)\s*([)\]⟩>])$/);
  if (!m) return null;
  const lo = endpoint(m[2]), hi = endpoint(m[3]);
  if (lo > hi) throw new ParseError('Lewy koniec przedziału jest większy od prawego');
  const loC = (m[1] === '[' || m[1] === '⟨' || m[1] === '<') && lo !== -Infinity;
  const hiC = (m[4] === ']' || m[4] === '⟩' || m[4] === '>') && hi !== Infinity;
  if (lo === hi && !(loC && hiC)) return EMPTY;
  return [{ lo, hi, loC, hiC }];
}

const isSetNotation = s => /^x\s*∈/.test(s) || /^(brak( rozwiązań| rozwiazan)?|∅|zbiór pusty|zbior pusty)$/i.test(s) || /^(ℝ|r)$/i.test(s) || !!s.match(/^([([⟨<])\s*[^;]+;\s*[^;]+([)\]⟩>])$/);

/** Jedna część odpowiedzi: przedział, zbiór, „x op liczba” albo dowolna relacja z x. */
function parsePart(part) {
  const s = part.trim();
  if (!s) throw new ParseError('Pusty fragment odpowiedzi');
  if (/^(brak( rozwiązań| rozwiazan)?|∅|zbiór pusty|zbior pusty)$/i.test(s)) return { set: EMPTY, final: true };
  if (/^(x\s*∈\s*)?(r|ℝ)$/i.test(s)) return { set: ALL, final: true };
  const inSet = s.match(/^x\s*∈\s*(.+)$/);
  if (inSet) return { set: parseSetList(inSet[1]), final: true };
  const iv = parseInterval(s);
  if (iv) return { set: iv, final: true };
  const rel = splitRelation(s);
  if (!rel) throw new ParseError('To nie jest równanie ani nierówność');
  const final = rel.left.trim() === 'x' && !/x/.test(rel.right);
  return { set: solveRelation(rel), final };
}

function parseSetList(s) {
  return union(...s.split(/∪|\bu\b|\bU\b/).map(p => {
    const iv = parseInterval(p);
    if (iv) return iv;
    const pts = p.trim().match(/^\{(.+)\}$/);
    if (pts) return pts[1].split(/[;,]/).map(v => point(endpoint(v)));
    throw new ParseError(`Nie rozumiem przedziału „${p.trim()}”`);
  }));
}

function solveRelation({ left, op, right }) {
  const L = parseExpr(left), R = parseExpr(right);
  const c = polyFit(x => L(x) - R(x));
  if (!c) throw new ParseError('Obsługuję równania i nierówności co najwyżej drugiego stopnia');
  return solvePoly(op, c);
}

/**
 * Parsuje jeden krok rozwiązania.
 * Zwraca {kind: 'expr', f} albo {kind: 'set', set, final}; final = zapis wyniku („x < 3”, „x ∈ …”, „x = 1 lub x = 2”).
 */
export function parseLine(src) {
  const s = normalize(src);
  if (!s) throw new ParseError('Wpisz krok rozwiązania');
  const fn = s.match(/^(y|f\(x\))\s*=\s*(.+)$/i);
  if (fn) return { kind: 'expr', f: parseExpr(fn[2]) };
  const parts = s.split(/\s+(?:lub|∨|or)\s+|,\s*(?=x\s*[=<>≤≥])/i);
  const relational = parts.length > 1 || isSetNotation(s) || !!splitRelation(s);
  if (!relational) return { kind: 'expr', f: parseExpr(s) };
  const parsed = parts.map(parsePart);
  return { kind: 'set', set: union(...parsed.map(p => p.set)), final: parsed.every(p => p.final) };
}

export function tryParseLine(src) {
  try { return { ok: true, value: parseLine(src) }; }
  catch (e) { if (e instanceof ParseError) return { ok: false, error: e.message }; throw e; }
}

/* ---------- Porównania ---------- */

const SAMPLES = [-2.7, -1.3, -0.45, 0.3, 1.1, 2.9, 3.7, 5.2, -4.1, 6.6, 0.77, -0.12];

export function exprEqual(f, g) {
  let n = 0;
  for (const x of SAMPLES) {
    const a = f(x), b = g(x);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (!close(a, b)) return false;
    n++;
  }
  return n >= 6;
}

/** Czy dwa sparsowane kroki są równoważne? */
export function equivalent(a, b) {
  if (a.kind !== b.kind) return false;
  return a.kind === 'expr' ? exprEqual(a.f, b.f) : setEqual(a.set, b.set);
}

/* ---------- Formatowanie ---------- */

export function fmtNum(v) {
  if (v === Infinity) return '+∞';
  if (v === -Infinity) return '−∞';
  const r = Math.round(v);
  if (close(v, r)) return (r < 0 ? '−' : '') + Math.abs(r);
  for (let d = 2; d <= 12; d++) {
    const n = Math.round(v * d);
    if (close(v, n / d)) return (n < 0 ? '−' : '') + `${Math.abs(n)}/${d}`;
  }
  return (v < 0 ? '−' : '') + String(Math.abs(Math.round(v * 1e4) / 1e4)).replace('.', ',');
}

export function fmtSet(S) {
  if (!S.length) return 'brak rozwiązań';
  if (S.length === 1 && S[0].lo === -Infinity && S[0].hi === Infinity) return 'x ∈ ℝ';
  if (S.every(s => s.lo === s.hi)) return S.map(s => `x = ${fmtNum(s.lo)}`).join(' lub ');
  if (S.length === 1 && (S[0].lo === -Infinity || S[0].hi === Infinity)) {
    const s = S[0];
    return s.lo === -Infinity ? `x ${s.hiC ? '≤' : '<'} ${fmtNum(s.hi)}` : `x ${s.loC ? '≥' : '>'} ${fmtNum(s.lo)}`;
  }
  return 'x ∈ ' + S.map(s => s.lo === s.hi ? `{${fmtNum(s.lo)}}` : `${s.loC ? '⟨' : '('}${fmtNum(s.lo)}; ${fmtNum(s.hi)}${s.hiC ? '⟩' : ')'}`).join(' ∪ ');
}

/** Ładny zapis do wyświetlania: x^2 → x², * → ·, odstępy wokół działań, minus typograficzny. */
export function pretty(src) {
  return normalize(src)
    .replace(/\^2/g, '²').replace(/\^3/g, '³')
    .replace(/\*/g, '·')
    .replace(/\s*([+=<>≤≥∈∪])\s*/g, ' $1 ')
    .replace(/([0-9x)²³])\s*-\s*/g, '$1 − ')
    .replace(/-/g, '−')
    .replace(/\(\s+/g, '(').replace(/\s+\)/g, ')')
    .replace(/(\d)\.(\d)/g, '$1,$2')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/* ---------- Budowanie zapisów w generatorach ---------- */

/** Wielomian [a2, a1, a0] jako tekst parsowalny, np. "x^2 - 6x + 9". */
export function polyStr([a2, a1, a0]) {
  const parts = [];
  const push = (c, sym) => {
    if (c === 0) return;
    const abs = Math.abs(c);
    const coef = sym && abs === 1 ? '' : String(abs);
    const sign = c < 0 ? '-' : '+';
    parts.push({ sign, text: coef + sym });
  };
  push(a2, 'x^2'); push(a1, 'x'); push(a0, '');
  if (!parts.length) return '0';
  return parts.map((p, i) => i === 0 ? (p.sign === '-' ? '-' : '') + p.text : ` ${p.sign} ${p.text}`).join('');
}

export const signed = n => (n < 0 ? ` - ${Math.abs(n)}` : ` + ${n}`);
export const paren = n => (n < 0 ? `(${n})` : String(n));

/** Deterministyczny generator liczb pseudolosowych. */
export function rng(seed) {
  let a = seed >>> 0 || 1;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (lo, hi, exclude = []) => { for (;;) { const v = lo + Math.floor(next() * (hi - lo + 1)); if (!exclude.includes(v)) return v; } },
    pick: arr => arr[Math.floor(next() * arr.length)],
  };
}

export { ParseError };
