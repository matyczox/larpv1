import test from 'node:test';
import assert from 'node:assert/strict';

// Minimalne środowisko DOM do sprawdzenia montowania i przełączania widoków
// niezależnie od dostępności binarnej przeglądarki w CI.
const handlers={};
const root={innerHTML:'',addEventListener:(type,fn)=>handlers[type]=fn,querySelector:()=>null};
globalThis.document={querySelector:()=>root};
globalThis.window={scrollTo:()=>{},confirm:()=>true};
globalThis.fetch=async()=>{throw Error('Tryb statyczny')};
await import('../docs/app/src/app.js');
function click(dataset) {
  handlers.click({target:{closest:()=>({dataset,tagName:'BUTTON'})},preventDefault:()=>{}});
}
test('strona startowa renderuje katalog 4 dziedzin',()=>{
  assert.match(root.innerHTML,/Wiedza zaczyna się/);
  for(const name of ['Matematyka','Biologia','Angielski','Informatyka'])assert.ok(root.innerHTML.includes(name));
});
test('nawigacja i otwarcie misji',()=>{
  click({view:'library'});assert.match(root.innerHTML,/KATALOG DOŚWIADCZEŃ/);
  click({subject:'math'});assert.match(root.innerHTML,/Trzy misje/);
  click({mission:'math-1'});assert.match(root.innerHTML,/INTERAKTYWNY WYKRES/);
  assert.match(root.innerHTML,/Sprawdź rozwiązanie/);
});
test('cztery typy ćwiczeń montują się bez błędu',()=>{
  for(const [id,label] of [['biology-1','SCHEMAT KRĄŻENIA'],['english-1','THE'],['algorithms-1','SIEĆ POŁĄCZEŃ'],['math-2','INTERAKTYWNY WYKRES']]){
    click({mission:id});assert.match(root.innerHTML,new RegExp(label));
  }
});
test('sekcja postępów i powrotu do pulpitu',()=>{
  click({view:'progress'});assert.match(root.innerHTML,/Mapa postępów/);
  click({view:'home'});assert.match(root.innerHTML,/Kontynuuj odkrywanie/);
});
