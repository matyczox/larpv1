import assert from 'node:assert/strict';
import test from 'node:test';
import { parseLine, tryParseLine, equivalent, fmtSet, exprEqual, parseExpr, pretty } from '../docs/app/src/math.js';
import { SKILLS, BUGS, LINES, makeTask } from '../docs/app/src/catalog.js';
import { checkStep, checkAnswer, checkFix, judgeExplanation, kubaReply } from '../docs/app/src/check.js';
import { emptyLearner, record, mastery, noteBug, resolveBug, bugStatus, recommend, quickRound, saveLearner, loadLearner, assignCondition, startTrial, finishTrial, trialSummary, MASTERY } from '../docs/app/src/learner.js';
import { initExperiment, updateExperiment, TEMPLATE_OF } from '../docs/app/src/experiments.js';

const set = s => fmtSet(parseLine(s).set);

test('silnik: zbiory rozwiązań równań i nierówności', () => {
  assert.equal(set('3x + 5 = 11'), 'x = 2');
  assert.equal(set('2(x - 3) = 8'), 'x = 7');
  assert.equal(set('-2x > 4'), 'x < −2');
  assert.equal(set('(x - 1)(x - 4) > 0'), 'x ∈ (−∞; 1) ∪ (4; +∞)');
  assert.equal(set('x^2 - 5x + 4 <= 0'), 'x ∈ ⟨1; 4⟩');
  assert.equal(set('-x^2 + 5x - 4 >= 0'), 'x ∈ ⟨1; 4⟩');
  assert.equal(set('x^2 + 1 < 0'), 'brak rozwiązań');
  assert.equal(set('x^2 + 1 > 0'), 'x ∈ ℝ');
  assert.equal(set('(x - 3)^2 >= 0'), 'x ∈ ℝ');
  assert.equal(set('(x - 3)^2 > 0'), 'x ∈ (−∞; 3) ∪ (3; +∞)');
});

test('silnik: zapisy wyniku są rozpoznawane jako końcowe', () => {
  for (const s of ['x = 2', 'x < -2', 'x ∈ (-∞; 1) ∪ (4; +∞)', 'x < 1 lub x > 4', 'x = 1, x = 4', 'brak rozwiązań', 'x ∈ ⟨1; 4⟩', 'x ≥ 3'])
    assert.equal(parseLine(s).final, true, s);
  for (const s of ['3x = 6', '-2x > 4', '(x-1)(x-4) > 0']) assert.equal(parseLine(s).final, false, s);
  assert.ok(equivalent(parseLine('x < 1 lub x > 4'), parseLine('x ∈ (-∞; 1) ∪ (4; +∞)')));
});

test('silnik: równoważność wyrażeń i komunikaty o błędach zapisu', () => {
  assert.ok(exprEqual(parseExpr('(x+3)^2'), parseExpr('x^2+6x+9')));
  assert.ok(exprEqual(parseExpr('5x - (2x - 3)'), parseExpr('3x + 3')));
  assert.ok(!exprEqual(parseExpr('(x+3)^2'), parseExpr('x^2+9')));
  assert.equal(tryParseLine('(x+1').ok, false);
  assert.match(tryParseLine('3x+').error, /urywa/);
  assert.equal(tryParseLine('x^3 > 1').ok, false);
  assert.equal(pretty('x^2 - 6x + 9'), 'x² − 6x + 9');
  assert.equal(pretty('-3x+5>=-1'), '−3x + 5 ≥ −1');
});

test('katalog: 4 działy, 12 stacji, każda pułapka ma opis, przykład i wyjaśnienie dla Kuby', () => {
  assert.equal(LINES.length, 4);
  assert.equal(LINES.flatMap(l => l.skills).length, 12);
  for (const b of Object.values(BUGS)) {
    assert.ok(b.name && b.example && b.why && b.concepts.length && b.kuba.intro && b.kuba.success, b.id);
    assert.ok(TEMPLATE_OF[b.id], `pułapka ${b.id} ma eksperyment`);
  }
});

test('generatory: każdy wzorcowy krok jest równoważny, każda pułapka psuje wynik dokładnie we wskazanym kroku', () => {
  for (const id of Object.keys(SKILLS)) {
    for (let seed = 1; seed <= 40; seed++) {
      const t = makeTask(id, seed);
      if (!t.answerOnly) {
        for (const s of t.steps) assert.equal(checkStep(t, s).status, 'ok', `${id}#${seed}: ${s}`);
        assert.equal(checkStep(t, t.steps.at(-1)).done, true, `${id}#${seed} ostatni krok jest wynikiem`);
      }
      for (const b of t.bugs) {
        assert.ok(!equivalent(b.answer, t.answer), `${id}#${seed} ${b.id} daje inny wynik`);
        if (!t.answerOnly) {
          const first = b.steps.findIndex(s => checkStep(t, s).status !== 'ok');
          assert.equal(first, b.idx, `${id}#${seed} ${b.id} psuje krok ${b.idx}`);
        }
        const res = checkStep(t, b.steps.at(-1));
        assert.equal(res.status, 'wrong');
        assert.equal(res.bug, b.id, `${id}#${seed} wynik pułapki ${b.id} jest rozpoznawany`);
      }
    }
  }
});

test('sprawdzanie: odpowiedź, „Napraw błąd” i niedokończony wynik', () => {
  const t = makeTask('zwrot', 3), bug = t.bugs[0];
  assert.equal(checkAnswer(t, t.steps[1]).status, 'unfinished');
  assert.equal(checkAnswer(t, t.steps.at(-1)).status, 'ok');
  assert.equal(checkAnswer(t, bug.steps.at(-1)).bug, 'B10');
  assert.equal(checkFix(t, bug, 0, '').status, 'wrong-line');
  assert.equal(checkFix(t, bug, bug.idx, bug.steps[bug.idx]).status, 'wrong-fix');
  assert.equal(checkFix(t, bug, bug.idx, t.steps.at(-1)).status, 'ok');
});

test('Kuba: rozumie dopiero, gdy wyjaśnienie trafia we wszystkie elementy', () => {
  let r = kubaReply('B10', [], judgeExplanation('B10', 'bo tak'));
  assert.equal(r.understood, false);
  r = kubaReply('B10', [], judgeExplanation('B10', 'Dzielisz przez liczbę ujemną, czyli przez minus cztery'));
  assert.equal(r.understood, false);
  assert.deepEqual(r.known, [0]);
  r = kubaReply('B10', r.known, judgeExplanation('B10', 'wtedy trzeba odwrócić zwrot nierówności'));
  assert.equal(r.understood, true);
  assert.equal(kubaReply('B01', [], judgeExplanation('B01', 'kwadrat to nawias razy ten sam nawias i brakuje wyrazu 2ab w środku')).understood, true);
});

test('model ucznia: BKT, pułapki, rekomendacje i zapis', () => {
  const L = emptyLearner();
  record(L, { skill: 'zwrot', mode: 'solve', correct: false, bug: 'B10' });
  assert.equal(bugStatus(L, 'B10'), 'active');
  assert.equal(recommend(L).skill, 'zwrot');
  assert.equal(quickRound(L)[0].bug, 'B10');
  for (let i = 0; i < 4; i++) record(L, { skill: 'zwrot', mode: 'round', correct: true });
  assert.ok(mastery(L, 'zwrot') >= MASTERY);
  resolveBug(L, 'B10');
  assert.equal(bugStatus(L, 'B10'), 'resolved');
  noteBug(L, 'B10');
  assert.equal(bugStatus(L, 'B10'), 'active');
  const mem = new Map(), storage = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  assert.equal(saveLearner(L, storage), true);
  assert.equal(loadLearner(storage).attempts.length, 5);
  const broken = { getItem: () => { throw Error('x'); }, setItem: () => { throw Error('x'); } };
  assert.deepEqual(loadLearner(broken), emptyLearner());
  assert.equal(saveLearner(L, broken), false);
});

test('porównanie warunków: zrównoważony przydział i podsumowanie', () => {
  const L = emptyLearner();
  for (let i = 0; i < 6; i++) { const t = startTrial(L, { bug: 'B10', skill: 'zwrot', condition: i < 4 ? 'text' : 'experiment', now: i }); finishTrial(L, t.id, i % 2 === 0); }
  assert.equal(assignCondition(L, () => 0), 'experiment', 'przy przewadze jednego warunku losuje drugi');
  const s = trialSummary(L);
  assert.equal(s.text.n, 4); assert.equal(s.experiment.n, 2);
});

test('eksperymenty: każdy szablon da się ukończyć poprawną odpowiedzią', () => {
  const t1 = makeTask('kwadrat', 5, 'B01'), e1 = initExperiment(t1, 'B01');
  updateExperiment(t1, e1, 'input', { guess: '1' }); updateExperiment(t1, e1, 'check');
  assert.equal(e1.done, false);
  const a = Number(t1.statement.match(/\d+/)[0]), minus = t1.statement.includes('-');
  updateExperiment(t1, e1, 'input', { guess: `${minus ? -2 * a : 2 * a}x` }); updateExperiment(t1, e1, 'check');
  assert.equal(e1.done, true);

  const t2 = makeTask('przenoszenie', 5), e2 = initExperiment(t2, 'B06');
  updateExperiment(t2, e2, 'x', String(t2.answer.set[0].lo)); updateExperiment(t2, e2, 'check');
  assert.equal(e2.done, true);

  const t3 = makeTask('kwadratowa', 7), e3 = initExperiment(t3, 'B11');
  updateExperiment(t3, e3, 'check'); assert.match(e3.msg, /Zaznacz/);
  const truth = x => checkStep(t3, `x = ${x}`).status === 'ok' || t3.answer.set.some(s => (x > s.lo || (x === s.lo && s.loC)) && (x < s.hi || (x === s.hi && s.hiC)));
  const [p, q] = e3.roots;
  for (const [key, x] of [['L', p - 1], ['P', p], ['M', (p + q) / 2], ['Q', q], ['R', q + 1]]) { e3.marks[key] = truth(x); }
  updateExperiment(t3, e3, 'check');
  assert.equal(e3.done, true, e3.msg);

  const t4 = makeTask('zwrot', 2), e4 = initExperiment(t4, 'B10');
  updateExperiment(t4, e4, 'k', '-2'); updateExperiment(t4, e4, 'k', '3'); updateExperiment(t4, e4, 'choice', '1'); updateExperiment(t4, e4, 'check');
  assert.equal(e4.done, true);

  const t5 = makeTask('nachylenie', 4), e5 = initExperiment(t5, 'B14');
  const [[x1, y1], [x2, y2]] = t5.points;
  updateExperiment(t5, e5, 'input', { dx: String(x2 - x1), dy: String(y2 - y1) }); updateExperiment(t5, e5, 'check');
  assert.equal(e5.done, true);
});
