/**
 * Sprawdzanie: kroki rozwiązania, odpowiedzi, poprawki w „Napraw błąd”
 * i ocena wyjaśnień w „Naucz Kubę”. Poprawność matematyki zawsze ocenia silnik z math.js.
 */
import { tryParseLine, equivalent, normalize } from './math.js';
import { SKILLS, BUGS } from './catalog.js';

const strip = (task, line) => {
  const p = SKILLS[task.skill].prefix;
  return p ? String(line).replace(p, '') : String(line);
};

/** Która pułapka daje dokładnie taki wynik? */
export function matchBug(task, parsed) {
  return task.bugs.find(b => b.answer.kind === parsed.kind && equivalent(b.answer, parsed))?.id || null;
}

/**
 * Sprawdza jeden krok.
 * status: 'parse' (nie rozumiem zapisu, bez kary) | 'kind' (zły rodzaj zapisu) | 'ok' | 'wrong'
 */
export function checkStep(task, line) {
  const text = strip(task, line);
  const r = tryParseLine(text);
  if (!r.ok) return { status: 'parse', error: r.error };
  const p = r.value;
  if (p.kind !== task.answer.kind) {
    return { status: 'kind', error: task.kind === 'set' ? 'Każdy krok powinien być równaniem albo nierównością (z „=”, „<”, „>” itp.) albo zapisem wyniku.' : 'Tu każdy krok jest wyrażeniem, bez znaku „=”.' };
  }
  if (equivalent(p, task.answer)) {
    return { status: 'ok', done: !!SKILLS[task.skill].final(text, p) };
  }
  return { status: 'wrong', bug: matchBug(task, p) };
}

/** Odpowiedź końcowa (szybka runda, zadanie sprawdzające, wzór prostej). */
export function checkAnswer(task, line) {
  const res = checkStep(task, line);
  if (res.status === 'ok' && !res.done) return { status: 'unfinished' };
  return res;
}

/** „Napraw błąd”: czy wskazano pierwszy zły krok i czy poprawka jest równoważna? */
export function checkFix(task, bug, index, correction) {
  if (index !== bug.idx) {
    return { status: 'wrong-line', message: index < bug.idx ? 'Ten krok jest jeszcze poprawny. Szukaj dalej.' : 'Błąd pojawia się wcześniej. Ten krok tylko go powiela.' };
  }
  const res = checkStep(task, correction);
  if (res.status === 'parse' || res.status === 'kind') return { status: 'parse', message: res.error };
  if (res.status === 'ok') return { status: 'ok' };
  return { status: 'wrong-fix', message: res.bug === bug.id ? 'Poprawka powtarza ten sam błąd.' : 'Ta poprawka nadal zmienia wynik.' };
}

/* ---------- Ocena wyjaśnienia (tryb offline) ---------- */

export const plain = s => normalize(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');

/** Które elementy dobrego wyjaśnienia zawiera tekst ucznia? Zwraca indeksy trafionych pojęć. */
export function judgeExplanation(bugId, text) {
  const t = plain(text);
  const concepts = BUGS[bugId].concepts;
  const hits = concepts.map((c, i) => (c.patterns.some(p => new RegExp(p).test(t)) ? i : -1)).filter(i => i >= 0);
  const words = t.split(/\s+/).filter(Boolean).length;
  return { hits, missing: concepts.map((_, i) => i).filter(i => !hits.includes(i)), tooShort: words < 4 };
}

/** Odpowiedź Kuby na kolejne wyjaśnienie. understood = wszystkie pojęcia trafione (łącznie w rozmowie). */
export function kubaReply(bugId, known, judged) {
  const b = BUGS[bugId];
  const all = new Set([...known, ...judged.hits]);
  if (judged.tooShort && !judged.hits.length) return { text: 'Możesz wytłumaczyć to trochę dokładniej? Nie wiem, o co chodzi.', known: [...all], understood: false };
  if (all.size === b.concepts.length) return { text: null, known: [...all], understood: true };
  if (!judged.hits.length) return { text: b.kuba.pushback, known: [...all], understood: false };
  const next = b.concepts.findIndex((_, i) => !all.has(i));
  return { text: `${judged.hits.length ? 'Okej, to ma sens. ' : ''}${b.kuba.followups[next] || b.kuba.followups.at(-1)}`, known: [...all], understood: false };
}
