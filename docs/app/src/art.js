/** Mapa linii nauki w stylu metra: przedmioty to linie, misje to stacje. */
import { SUBJECTS, subjectMissions } from './data.js';
import { esc } from './ui.js';

/* ---------- Mapa metra ---------- */

const HUB = { x: 550, y: 210 };
const LINES = {
  math:       { dir: [1, -1], y: 120, stations: [690, 840, 990], label: 'above' },
  algorithms: { dir: [1, 1], y: 300, stations: [690, 840, 990], label: 'below' },
  biology:    { dir: [-1, -1], y: 120, stations: [410, 260, 110], label: 'above' },
  english:    { dir: [-1, 1], y: 300, stations: [410, 260, 110], label: 'below' },
};

export function metroMap(progress, nextId) {
  const done = id => progress.attempts.some(a => a.missionId === id && a.correct);
  const parts = [];
  const stations = [];
  for (const s of SUBJECTS) {
    const L = LINES[s.id];
    const bend = { x: HUB.x + L.dir[0] * 90, y: L.y };
    const end = L.stations.at(-1) + L.dir[0] * 60;
    parts.push(`<path d="M${HUB.x} ${HUB.y} L${bend.x} ${bend.y} H${end}" class="m-line" style="--c:var(--${s.id})"/>`);
    const bx = end + L.dir[0] * 4;
    parts.push(`<g class="m-badge" style="--c:var(--${s.id})"><circle cx="${bx}" cy="${L.y}" r="17"/><text x="${bx}" y="${L.y + 6}" text-anchor="middle">${s.name[0]}</text></g>`);
    parts.push(`<text x="${bx + L.dir[0] * 26}" y="${L.y + 5}" text-anchor="${L.dir[0] > 0 ? 'start' : 'end'}" class="m-line-name">${esc(s.name)}</text>`);
    subjectMissions(s.id).forEach((m, i) => {
      const x = L.stations[i], y = L.y;
      const ty = L.label === 'above' ? y - 24 : y + 34;
      stations.push(`<a href="#/m/${m.id}" class="m-station ${done(m.id) ? 'done' : ''} ${m.id === nextId ? 'next' : ''}" style="--c:var(--${s.id})" aria-label="${esc(s.name)}, ${esc(m.title)}${done(m.id) ? ', ukończona' : ''}"><circle cx="${x}" cy="${y}" r="11"/><text x="${x}" y="${ty}" text-anchor="middle">${esc(m.title)}</text></a>`);
    });
  }
  return `<svg class="metro" viewBox="-130 70 1360 290" role="group" aria-label="Mapa linii nauki: cztery przedmioty, po trzy misje">
    ${parts.join('')}
    <g class="m-hub"><rect x="${HUB.x - 44}" y="${HUB.y - 22}" width="88" height="44" rx="22"/><text x="${HUB.x}" y="${HUB.y + 6}" text-anchor="middle">Start</text></g>
    ${stations.join('')}
  </svg>`;
}
