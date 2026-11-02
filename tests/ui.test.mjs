import test from 'node:test';
import assert from 'node:assert/strict';

// Minimalne środowisko DOM: sprawdza routing, montowanie widoków i interakcje
// niezależnie od dostępności przeglądarki w CI.
const handlers = {}, winHandlers = {};
const root = { innerHTML: '', addEventListener: (type, fn) => { handlers[type] = fn; }, querySelector: () => null };
globalThis.document = { querySelector: () => root, title: '' };
globalThis.location = { hash: '' };
globalThis.window = { scrollTo: () => {}, confirm: () => true, addEventListener: (type, fn) => { winHandlers[type] = fn; } };
globalThis.fetch = async () => { throw Error('Tryb statyczny'); };
const { parseRoute } = await import('../docs/app/src/app.js');

const go = hash => { location.hash = hash; winHandlers.hashchange(); };
const click = dataset => handlers.click({ target: { closest: () => ({ dataset }) }, preventDefault: () => {} });

test('routing rozpoznaje adresy', () => {
  assert.deepEqual(parseRoute(''), { name: 'home' });
  assert.deepEqual(parseRoute('#/labs'), { name: 'labs' });
  assert.deepEqual(parseRoute('#/labs/math'), { name: 'subject', id: 'math' });
  assert.deepEqual(parseRoute('#/m/math-1'), { name: 'mission', id: 'math-1' });
  assert.deepEqual(parseRoute('#/progress'), { name: 'progress' });
  assert.equal(parseRoute('#/xyz').name, 'missing');
});

test('strona startowa pokazuje 4 dziedziny i planer', () => {
  go('#/');
  assert.match(root.innerHTML, /Ucz się, <em>eksperymentując/);
  assert.match(root.innerHTML, /Czego chcesz się dziś nauczyć/);
  for (const name of ['Matematyka', 'Biologia', 'Angielski', 'Informatyka']) assert.ok(root.innerHTML.includes(name));
});

test('planer offline dobiera szablon i nie udaje nieobsługiwanych tematów', () => {
  click({ act: 'plan-try', topic: 'krążenie krwi' });
  assert.match(root.innerHTML, /Biologia · Układ krążenia/);
  assert.match(root.innerHTML, /href="#\/m\/biology-1"/);
  click({ act: 'plan-try', topic: 'fotosynteza' });
  assert.match(root.innerHTML, /Tego tematu jeszcze nie ma/);
});

test('laboratoria, filtr i ścieżka przedmiotu', () => {
  go('#/labs'); assert.match(root.innerHTML, /<h1>Laboratoria<\/h1>/);
  click({ act: 'filter', value: 'Języki' });
  assert.ok(root.innerHTML.includes('Angielski') && !root.innerHTML.includes('Algorytm Dijkstry'));
  click({ act: 'filter', value: 'all' });
  go('#/labs/math'); assert.match(root.innerHTML, /Przechwyć prostą/);
});

test('misja matematyczna: suwaki, sprawdzenie i zapis próby', () => {
  go('#/m/math-1');
  assert.match(root.innerHTML, /Wykres funkcji liniowej/);
  click({ act: 'check' });
  assert.match(root.innerHTML, /Jeszcze nie/);
  click({ act: 'nudge', key: 'a', delta: '1' });
  click({ act: 'nudge', key: 'b', delta: '1' });
  click({ act: 'check' });
  assert.match(root.innerHTML, /Dokładnie tak/);
  assert.match(root.innerHTML, /Następna misja/);
});

test('cztery typy ćwiczeń montują się bez błędu', () => {
  for (const [id, label] of [['biology-1', 'Schemat układu krążenia'], ['english-1', 'Akta sprawy'], ['algorithms-1', 'Graf ważony'], ['math-2', 'Wykres funkcji liniowej']]) {
    go(`#/m/${id}`); assert.match(root.innerHTML, new RegExp(label));
  }
});

test('graf: budowa trasy, ocena i podgląd Dijkstry', () => {
  go('#/m/algorithms-1');
  for (const n of ['C', 'B', 'D', 'E', 'F']) click({ node: n });
  assert.match(root.innerHTML, /A → C → B → D → E → F/);
  click({ act: 'check' });
  assert.match(root.innerHTML, /Dokładnie tak/);
  click({ act: 'trace' });
  assert.match(root.innerHTML, /Algorytm Dijkstry krok po kroku/);
  click({ act: 'trace-next' });
  assert.match(root.innerHTML, /Wybieram A/);
});

test('angielski: wybór odpowiedzi', () => {
  go('#/m/english-1');
  click({ choice: '1' });
  assert.match(root.innerHTML, /blank filled">had taken/);
  click({ act: 'check' });
  assert.match(root.innerHTML, /Dokładnie tak/);
});

test('postępy pokazują historię i nieznany adres daje 404', () => {
  go('#/progress');
  assert.match(root.innerHTML, /<h1>Postępy<\/h1>/);
  assert.match(root.innerHTML, /Ostatnie próby/);
  assert.match(root.innerHTML, /Kurier w mieście/);
  go('#/m/nie-ma');
  assert.match(root.innerHTML, /Nie ma takiego miejsca/);
});
