import { GRAPHS, getMission, subjectMissions, SUBJECTS } from './data.js';

const closeTo = (a, b) => Number.isFinite(a) && Math.abs(a - b) < 1e-8;

export function shortestPath(graph, from, to) {
  const nodes = graph.nodes.map(n => n.id);
  if (!nodes.includes(from) || !nodes.includes(to)) throw new Error('Nieznany węzeł');
  const dist = Object.fromEntries(nodes.map(n => [n, Infinity]));
  const previous = {};
  const pending = new Set(nodes);
  dist[from] = 0;
  while (pending.size) {
    const node = [...pending].reduce((best, key) => dist[key] < dist[best] ? key : best);
    if (dist[node] === Infinity || node === to) break;
    pending.delete(node);
    for (const [a,b,cost] of graph.edges) {
      if (cost < 0) throw new Error('Dijkstra wymaga wag nieujemnych');
      const next = a === node ? b : b === node ? a : null;
      if (!next || !pending.has(next)) continue;
      if (dist[node] + cost < dist[next]) {
        dist[next] = dist[node] + cost;
        previous[next] = node;
      }
    }
  }
  const path = [];
  if (dist[to] !== Infinity) {
    let node = to;
    while (node !== undefined) { path.unshift(node); node = previous[node]; }
  }
  return { distance: dist[to], path, distances: dist };
}

export function routeCost(graph, path) {
  if (!Array.isArray(path) || path.length < 2) return null;
  let cost = 0;
  for (let i = 1; i < path.length; i++) {
    const edge = graph.edges.find(([a,b]) => (a === path[i - 1] && b === path[i]) || (a === path[i] && b === path[i - 1]));
    if (!edge) return null;
    cost += edge[2];
  }
  return cost;
}

export function grade(mission, answer) {
  if (!mission) throw new Error('Nieznana misja');
  const { type, params } = mission;
  if (type === 'linear') {
    const a = Number(answer?.a), b = Number(answer?.b);
    const correct = closeTo(a, params.a) && closeTo(b, params.b);
    let diagnosis = mission.diagnose;
    if (!closeTo(a, params.a) && closeTo(b, params.b)) diagnosis = 'Punkt przecięcia osi OY jest poprawny. Sprawdź jeszcze nachylenie prostej.';
    if (closeTo(a, params.a) && !closeTo(b, params.b)) diagnosis = 'Nachylenie jest poprawne. Ustaw b tak, aby prosta przechodziła przez punkt z x = 0.';
    return { correct, diagnosis, explanation: mission.explanation, score: correct ? 1 : 0 };
  }
  if (type === 'choice') {
    const correct = Number.isInteger(answer?.selected) && answer.selected === params.answer;
    return { correct, diagnosis: mission.diagnose, explanation: mission.explanation, score: correct ? 1 : 0 };
  }
  if (type === 'path') {
    const selected = answer?.path ?? [];
    const correct = Array.isArray(selected) && selected.length === params.path.length && selected.every((id, i) => id === params.path[i]);
    const wrongIndex = selected.findIndex((id, i) => id !== params.path[i]);
    const diagnosis = wrongIndex >= 0 ? `Pierwsza niezgodność jest na pozycji ${wrongIndex + 1}. ${mission.diagnose}` : mission.diagnose;
    return { correct, diagnosis, explanation: mission.explanation, score: correct ? 1 : 0 };
  }
  if (type === 'graph') {
    const graph = GRAPHS[params.graph];
    const path = answer?.path ?? [];
    const cost = routeCost(graph, path);
    const optimum = shortestPath(graph, params.start, params.end);
    const valid = Array.isArray(path) && path[0] === params.start && path.at(-1) === params.end && cost !== null;
    const correct = valid && cost === optimum.distance;
    let diagnosis = mission.diagnose;
    if (path.length < 2 || path.at(-1) !== params.end) diagnosis = 'Trasa musi zaczynać się w A i kończyć w F.';
    else if (cost === null) diagnosis = 'Co najmniej jeden wybór nie jest połączony krawędzią.';
    else if (cost > optimum.distance) diagnosis = `Twoja trasa kosztuje ${cost}, a możliwy jest koszt ${optimum.distance}. Poszukaj tańszego objazdu.`;
    return { correct, diagnosis, explanation: `${mission.explanation} Najtańsza trasa: ${optimum.path.join(' → ')} (koszt ${optimum.distance}).`, score: correct ? 1 : 0, cost, optimum };
  }
  throw new Error('Nieobsługiwany typ ćwiczenia');
}

const KEY = 'paradox.progress.v1';
export function emptyProgress() { return { attempts: [] }; }
export function readProgress(storage = globalThis.localStorage) {
  try {
    const obj = JSON.parse(storage.getItem(KEY) || 'null');
    if (!obj || !Array.isArray(obj.attempts)) return emptyProgress();
    return { attempts: obj.attempts.filter(x => x && typeof x.missionId === 'string' && typeof x.correct === 'boolean').slice(-600) };
  } catch { return emptyProgress(); }
}
export function saveProgress(progress, storage = globalThis.localStorage) {
  try { storage.setItem(KEY, JSON.stringify({ attempts: progress.attempts.slice(-600) })); return true; }
  catch { return false; }
}
export function summarize(progress) {
  const attempts = progress.attempts;
  const done = new Set(attempts.filter(a => a.correct).map(a => a.missionId));
  const right = attempts.filter(a => a.correct).length;
  const withHints = attempts.filter(a => a.hintsUsed > 0).length;
  const accuracy = attempts.length ? Math.round(100 * right / attempts.length) : 0;
  const subjectStats = SUBJECTS.map(subject => {
    const subset = attempts.filter(a => getMission(a.missionId)?.subject === subject.id);
    const passed = subjectMissions(subject.id).filter(m => done.has(m.id)).length;
    const miss = subset.filter(a => !a.correct).length;
    return { ...subject, attempts: subset.length, passed, total: subjectMissions(subject.id).length, misses: miss, accuracy: subset.length ? Math.round(100 * (subset.length - miss) / subset.length) : 0 };
  });
  return { attempts: attempts.length, done: done.size, accuracy, right, withHints, subjectStats };
}
export function recommend(progress, subjectId) {
  const missions = subjectId ? subjectMissions(subjectId) : SUBJECTS.flatMap(s => subjectMissions(s.id));
  const attempts = progress.attempts;
  for (const mission of missions) {
    const own = attempts.filter(a => a.missionId === mission.id);
    if (own.length && !own.at(-1).correct) return { mission, reason: 'Wróć do zadania, które ostatnio sprawiło trudność.' };
  }
  const completed = new Set(attempts.filter(a => a.correct).map(a => a.missionId));
  const newMission = missions.find(m => !completed.has(m.id));
  if (newMission) return { mission: newMission, reason: 'Kolejny krok w twojej ścieżce nauki.' };
  return { mission: missions[0], reason: 'Powtórka utrwalająca opanowane umiejętności.' };
}


/** Jawny, bezpłatny fallback. Nie udaje modelu językowego. */
export function matchTopic(query) {
  const q=String(query || '').toLocaleLowerCase('pl-PL');
  const keywords={
    math:['matemat','funkcj','wykres','współczynnik','prosta','równan','nachylenie'],
    biology:['biolog','krążen','krew','serce','naczyn','płuc','anatom'],
    english:['angiel','english','past','grammar','gramaty','czasy przesz','czasów przesz'],
    algorithms:['informat','dijkstr','graf','algorytm','najkrótsz','programowan','węzł']
  };
  const scores=Object.entries(keywords).map(([id,words])=>({id,score:words.filter(w=>q.includes(w)).length})).sort((a,b)=>b.score-a.score);
  if(!q.trim()||scores[0].score===0)return {supported:false,reason:'Ten prototyp obsługuje na razie funkcje liniowe, krążenie krwi, czasy przeszłe i algorytm Dijkstry. Wybierz jeden z tych tematów.'};
  const explanations={
    math:'Wybrałem szablon interaktywnego wykresu i ćwiczenia funkcji liniowej.',
    biology:'Wybrałem schemat obiegu krwi, na którym wskażesz drogę między organami.',
    english:'Wybrałem interaktywne śledztwo ćwiczące czasy przeszłe.',
    algorithms:'Wybrałem symulator grafu ważonego i najkrótszej ścieżki.'
  };
  return {supported:true,subject:scores[0].id,reason:explanations[scores[0].id]};
}
