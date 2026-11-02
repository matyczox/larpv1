import assert from 'node:assert/strict';
import test from 'node:test';
import { getMission, GRAPHS, MISSIONS } from '../docs/app/src/data.js';
import { shortestPath, routeCost, grade, emptyProgress, saveProgress, readProgress, summarize, recommend, matchTopic } from '../docs/app/src/engine.js';

test('każde zadanie ma unikalny identyfikator i kompletne dane',()=>{
  assert.equal(MISSIONS.length,12);
  assert.equal(new Set(MISSIONS.map(m=>m.id)).size,MISSIONS.length);
  for(const m of MISSIONS){assert.ok(m.prompt&&m.hint&&m.explanation&&m.diagnose);}
});
test('matematyka: poprawne współczynniki i diagnoza błędów',()=>{
  const m=getMission('math-1');
  assert.equal(grade(m,{a:2,b:1}).correct,true);
  assert.equal(grade(m,{a:2,b:0}).correct,false);
  assert.match(grade(m,{a:2,b:0}).diagnosis,/Nachylenie/);
  assert.equal(grade(m,{a:-1,b:1}).correct,false);
});
test('biologia: poprawna droga w obu krążeniach',()=>{
  for(const id of ['biology-1','biology-2','biology-3']){
    const m=getMission(id);
    assert.equal(grade(m,{path:m.params.path}).correct,true);
    assert.equal(grade(m,{path:m.params.path.slice(0,-1)}).correct,false);
    assert.equal(grade(m,{path:[...m.params.path].reverse()}).correct,false);
  }
});
test('angielski: odpowiedzi w wariantach',()=>{
  for(const id of ['english-1','english-2','english-3']){
    const m=getMission(id);
    assert.equal(grade(m,{selected:m.params.answer}).correct,true);
    assert.equal(grade(m,{selected:(m.params.answer+1)%4}).correct,false);
    assert.equal(grade(m,{selected:null}).correct,false);
  }
});
test('Dijkstra: oblicza rzeczywiście najkrótszą trasę',()=>{
  const town=shortestPath(GRAPHS.town,'A','F');
  assert.equal(town.distance,13);
  assert.deepEqual(town.path,['A','C','B','D','E','F']);
  assert.equal(routeCost(GRAPHS.town,town.path),13);
  for(const id of ['algorithms-1','algorithms-2','algorithms-3']){
    const m=getMission(id),g=GRAPHS[m.params.graph];
    const answer=shortestPath(g,m.params.start,m.params.end);
    assert.equal(grade(m,{path:answer.path}).correct,true);
    assert.equal(grade(m,{path:['A','F']}).correct,false);
  }
});
test('ocena grafu sprawdza również koszt, nie tylko osiągnięcie celu',()=>{
  const m=getMission('algorithms-1');
  const r=grade(m,{path:['A','C','E','F']});
  assert.equal(r.correct,false);assert.equal(r.cost,15);assert.equal(r.optimum.distance,13);
});
test('postępy są zapisywane i mogą być odtworzone bez serwera',()=>{
  const mem=new Map();const storage={getItem:k=>mem.get(k)??null,setItem:(k,v)=>mem.set(k,v)};
  const p=emptyProgress();p.attempts.push({missionId:'math-1',correct:false,hintsUsed:1,at:'2026-11-02'});
  assert.equal(saveProgress(p,storage),true);
  assert.equal(readProgress(storage).attempts.length,1);
  assert.equal(summarize(p).done,0);
  assert.equal(recommend(p,'math').mission.id,'math-1');
  p.attempts.push({missionId:'math-1',correct:true,hintsUsed:0,at:'2026-11-02'});
  assert.equal(summarize(p).done,1);
  assert.equal(recommend(p,'math').mission.id,'math-2');
});
test('brak localStorage nie blokuje aplikacji',()=>{
  const unavailable={getItem:()=>{throw Error('disabled')},setItem:()=>{throw Error('disabled')}};
  assert.deepEqual(readProgress(unavailable),emptyProgress());
  assert.equal(saveProgress(emptyProgress(),unavailable),false);
});

test('wybór szablonu offline nie udaje obsługi nieznanych zagadnień',()=>{
  assert.equal(matchTopic('Jak działa Past Perfect?').subject,'english');
  assert.equal(matchTopic('Naucz mnie funkcji liniowej').subject,'math');
  assert.equal(matchTopic('Droga krwi przez płuca').subject,'biology');
  assert.equal(matchTopic('Najkrótsza ścieżka w grafie').subject,'algorithms');
  assert.equal(matchTopic('Naucz mnie fotosyntezy').supported,false);
});
