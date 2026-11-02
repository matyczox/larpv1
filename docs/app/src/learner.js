/**
 * Model ucznia: opanowanie umiejętności (Bayesian Knowledge Tracing), stan pułapek,
 * powtórki w odstępach oraz dziennik porównania „wskazówka tekstowa vs eksperyment”.
 * Dane zostają w przeglądarce (localStorage).
 */
import { LINES, SKILLS, skillsOfBug } from './catalog.js';

const KEY = 'paradox.errorlab.v1';
const DAY = 24 * 60 * 60 * 1000;
export const MASTERY = 0.95;
const BKT = { init: 0.15, learn: 0.2, slip: 0.1, guess: 0.12 };

export function emptyLearner() {
  return { attempts: [], skills: {}, bugs: {}, trials: [] };
}

export function loadLearner(storage = globalThis.localStorage) {
  try {
    const d = JSON.parse(storage.getItem(KEY) || 'null');
    if (!d || !Array.isArray(d.attempts)) return emptyLearner();
    return { attempts: d.attempts.slice(-800), skills: d.skills || {}, bugs: d.bugs || {}, trials: Array.isArray(d.trials) ? d.trials.slice(-800) : [] };
  } catch { return emptyLearner(); }
}

export function saveLearner(L, storage = globalThis.localStorage) {
  try { storage.setItem(KEY, JSON.stringify(L)); return true; } catch { return false; }
}

const skillState = (L, id) => (L.skills[id] ||= { p: BKT.init, n: 0, interval: 0, due: 0 });
const bugState = (L, id) => (L.bugs[id] ||= { detected: 0, resolved: 0, last: 0 });

export const mastery = (L, id) => L.skills[id]?.p ?? BKT.init;
export const attemptsOf = (L, id) => L.skills[id]?.n ?? 0;

/** Zapisuje próbę i aktualizuje model. */
export function record(L, { skill, mode, correct, bug = null, now = Date.now() }) {
  L.attempts.push({ skill, mode, correct, bug, at: new Date(now).toISOString() });
  const s = skillState(L, skill);
  const p = s.p;
  const post = correct ? p * (1 - BKT.slip) / (p * (1 - BKT.slip) + (1 - p) * BKT.guess)
    : p * BKT.slip / (p * BKT.slip + (1 - p) * (1 - BKT.guess));
  s.p = post + (1 - post) * BKT.learn;
  s.n += 1;
  if (correct) { s.interval = s.interval ? s.interval * 2 : 1; s.due = now + s.interval * DAY; }
  else { s.interval = 0; s.due = now; }
  if (bug) noteBug(L, bug, now);
  return s.p;
}

export function noteBug(L, id, now = Date.now()) { const b = bugState(L, id); b.detected += 1; b.last = now; }
export function resolveBug(L, id, now = Date.now()) { const b = bugState(L, id); b.resolved = Math.max(b.resolved + 1, 1); b.last = now; }

/** 'unseen' | 'active' | 'resolved' */
export function bugStatus(L, id) {
  const b = L.bugs[id];
  if (!b || !b.detected) return b?.resolved ? 'resolved' : 'unseen';
  return b.resolved >= b.detected ? 'resolved' : 'active';
}
export const activeBugs = L => Object.keys(L.bugs).filter(id => bugStatus(L, id) === 'active').sort((a, b) => L.bugs[b].last - L.bugs[a].last);

/** Następna stacja: umiejętność z aktywną pułapką, potem pierwsza nieopanowana. */
export function recommend(L) {
  for (const bug of activeBugs(L)) {
    const skill = skillsOfBug(bug).find(s => mastery(L, s) < MASTERY) || skillsOfBug(bug)[0];
    if (skill) return { skill, bug, reason: 'Wróć do pułapki, w którą ostatnio wpadłeś.' };
  }
  for (const line of LINES) for (const skill of line.skills) {
    if (mastery(L, skill) < MASTERY) return { skill, bug: null, reason: attemptsOf(L, skill) ? 'Ta umiejętność nie jest jeszcze opanowana.' : 'Kolejna stacja na twojej trasie.' };
  }
  const due = Object.keys(SKILLS).sort((a, b) => (L.skills[a]?.due ?? 0) - (L.skills[b]?.due ?? 0))[0];
  return { skill: due, bug: null, reason: 'Wszystko opanowane. Czas na powtórkę.' };
}

/** Szybka runda: 5 umiejętności wg pilności (aktywne pułapki, termin powtórki, słabe opanowanie). */
export function quickRound(L, now = Date.now(), size = 5) {
  const active = new Set(activeBugs(L));
  const scored = Object.keys(SKILLS).map(id => {
    const s = L.skills[id];
    const bug = SKILLS[id].bugIds.find(b => active.has(b)) || null;
    let score = 1 - mastery(L, id);
    if (bug) score += 3;
    if (s && s.due <= now && s.n) score += 2;
    if (!s) score += 0.3;
    return { skill: id, bug, score };
  }).sort((a, b) => b.score - a.score);
  return scored.slice(0, size).map(({ skill, bug }) => ({ skill, bug }));
}

export function lineProgress(L, lineId) {
  const line = LINES.find(l => l.id === lineId);
  const done = line.skills.filter(s => mastery(L, s) >= MASTERY).length;
  return { done, total: line.skills.length };
}

/* ---------- Porównanie: wskazówka tekstowa vs eksperyment ---------- */

/** Losuje warunek dla nowej próby porównawczej (zrównoważone przydzielanie). */
export function assignCondition(L, rand = Math.random) {
  const open = L.trials.filter(t => t.outcome !== undefined);
  const nText = open.filter(t => t.condition === 'text').length, nExp = open.filter(t => t.condition === 'experiment').length;
  if (nText !== nExp && Math.abs(nText - nExp) >= 2) return nText < nExp ? 'text' : 'experiment';
  return rand() < 0.5 ? 'text' : 'experiment';
}

export function startTrial(L, { bug, skill, condition, now = Date.now() }) {
  const t = { id: `${now}-${bug}`, bug, skill, condition, at: new Date(now).toISOString() };
  L.trials.push(t);
  return t;
}

export function finishTrial(L, id, correct) {
  const t = L.trials.find(x => x.id === id);
  if (t && t.outcome === undefined) t.outcome = !!correct;
  return t;
}

export function trialSummary(L) {
  const out = {};
  for (const c of ['text', 'experiment']) {
    const done = L.trials.filter(t => t.condition === c && t.outcome !== undefined);
    out[c] = { n: done.length, correct: done.filter(t => t.outcome).length };
  }
  return out;
}
