import test from 'node:test';
import assert from 'node:assert/strict';

// Minimalne środowisko DOM: routing, montowanie widoków i interakcje bez przeglądarki.
const handlers = {}, winHandlers = {};
const root = { innerHTML: '', addEventListener: (type, fn) => { handlers[type] = fn; }, querySelector: () => null };
globalThis.document = { querySelector: () => root, title: '' };
globalThis.location = { hash: '' };
globalThis.window = { scrollTo: () => {}, confirm: () => true, addEventListener: (type, fn) => { winHandlers[type] = fn; } };
const { parseRoute } = await import('../docs/app/src/app.js');
const { makeTask } = await import('../docs/app/src/catalog.js');

const go = hash => { location.hash = hash; winHandlers.hashchange(); };
const click = dataset => handlers.click({ target: { closest: () => ({ dataset }) }, preventDefault: () => {} });
const type = (name, value) => handlers.input({ target: { value, dataset: { math: name } } });
const typeKuba = value => handlers.input({ target: { value, dataset: { kuba: '' } } });
const html = () => root.innerHTML;
const taskFromView = skill => {
  // Zadanie w widoku jest losowe; odczytujemy je z dużego zapisu „statement”.
  const m = html().match(/<p class="statement">([^<]+)<\/p>/);
  return m ? m[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : null;
};

test('routing rozpoznaje adresy', () => {
  assert.deepEqual(parseRoute(''), { name: 'home' });
  assert.deepEqual(parseRoute('#/linia/rownania'), { name: 'line', id: 'rownania' });
  assert.deepEqual(parseRoute('#/u/zwrot'), { name: 'skill', id: 'zwrot', mode: 'solve', bug: null });
  assert.deepEqual(parseRoute('#/u/zwrot/napraw'), { name: 'skill', id: 'zwrot', mode: 'fix', bug: null });
  assert.deepEqual(parseRoute('#/lab/zwrot/B10'), { name: 'lab', id: 'zwrot', bug: 'B10' });
  assert.equal(parseRoute('#/runda').name, 'round');
  assert.equal(parseRoute('#/xyz').name, 'missing');
});

test('mapa: 4 działy, mapa metra i trzy tryby', () => {
  go('#/');
  assert.match(html(), /Matura z matematyki bez pułapek/);
  assert.match(html(), /class="metro"/);
  for (const n of ['Wyrażenia', 'Równania', 'Nierówności', 'Funkcja liniowa', 'Krok po kroku', 'Napraw błąd', 'Naucz Kubę']) assert.ok(html().includes(n), n);
});

test('krok po kroku: błędny krok rozpoznany jako pułapka, poprawny prowadzi do wyniku', () => {
  go('#/u/zwrot');
  assert.match(html(), /Zmiana zwrotu/);
  const st = taskFromView();
  assert.ok(st, 'widać zadanie');
  // Odtwarzamy zadanie z tego samego zapisu przez wpisanie kroków generatora o tym samym ziarnie nie jest możliwe,
  // więc sprawdzamy na wyniku pułapki: w nierówności b − ax op c brak zmiany zwrotu.
  const m = st.replace(/−/g, '-').match(/^(\d+) - (\d+)x (.) (-?\d+)$/);
  const [, b, a, op, c] = m; const x0 = (Number(b) - Number(c)) / Number(a);
  const wrong = `x ${op} ${x0}`, flip = { '>': '<', '<': '>', '≥': '≤', '≤': '≥' }[op];
  type('step', wrong); click({ act: 'step-add' });
  assert.match(html(), /pułapka B10/);
  type('step', `x ${flip} ${x0}`); click({ act: 'step-add' });
  assert.match(html(), /Rozwiązane/);
});

test('napraw błąd: wskazanie złego kroku i poprawka', () => {
  go('#/u/przenoszenie/napraw');
  assert.match(html(), /Rozwiązanie Oli/);
  click({ act: 'fix-line', i: '0' });
  assert.match(html(), /Ten krok jest jeszcze poprawny/);
  click({ act: 'fix-line', i: '1' });
  assert.match(html(), /Jak powinien wyglądać krok 2/);
  const st = taskFromView().replace(/−/g, '-');
  const [, a, sign, b, c] = st.match(/^(\d+)x ([+-]) (\d+) = (-?\d+)$/);
  type('fix', `${a}x = ${Number(c) - (sign === '+' ? 1 : -1) * Number(b)}`);
  click({ act: 'fix-check' });
  assert.match(html(), /Znalezione i poprawione/);
});

test('Kuba: rozmowa aż do zrozumienia', () => {
  go('#/u/zwrot/kuba');
  assert.match(html(), /Rozwiązanie Kuby/);
  typeKuba('bo tak'); click({ act: 'kuba-send' });
  assert.match(html(), /Możesz wytłumaczyć|nie przekonuje|W równaniach/i);
  typeKuba('Dzielisz przez liczbę ujemną, więc musisz odwrócić zwrot nierówności'); click({ act: 'kuba-send' });
  assert.match(html(), /Kuba zrozumiał/);
});

test('laboratorium błędu: eksperyment, Kuba, zadanie sprawdzające', () => {
  go('#/lab/zwrot/B10');
  assert.match(html(), /Laboratorium błędu B10/);
  assert.match(html(), /Mnożenie nierówności/);
  assert.match(html(), /data-act="lab-next" disabled/);
  click({ act: 'exp-k', value: '-2' });
  handlers.input({ target: { value: '-2', dataset: { exp: 'k' } } });
  handlers.input({ target: { value: '2', dataset: { exp: 'k' } } });
  click({ act: 'exp-choice', value: '1' });
  click({ act: 'exp-check' });
  assert.match(html(), /Odkryte/);
  click({ act: 'lab-next' });
  assert.match(html(), /Rozwiązanie Kuby/);
  click({ act: 'lab-next' });
  assert.match(html(), /bez podpowiedzi/);
  type('transfer', 'x > 100'); click({ act: 'lab-answer' });
  assert.match(html(), /Pułapka jeszcze działa|Pułapka rozbrojona/);
});

test('szybka runda, katalog pułapek, postępy i 404', () => {
  go('#/runda');
  assert.match(html(), /Szybka runda/);
  type('round', 'x = 12345'); click({ act: 'round-check' });
  assert.match(html(), /Źle\.|To jeszcze nie jest wynik|Każdy krok powinien|Tu każdy krok/);
  go('#/pulapki');
  assert.match(html(), /Katalog pułapek/);
  assert.match(html(), /B13/);
  go('#/postepy');
  assert.match(html(), /Porównanie: wskazówka czy eksperyment/);
  assert.match(html(), /Ostatnie próby/);
  go('#/nie-ma');
  assert.match(html(), /Nie ma takiej strony/);
});
