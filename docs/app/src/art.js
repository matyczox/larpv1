/** Ilustracje: rysunki przedmiotów (plansze) i mapa linii nauki (metro). */
import { SUBJECTS, subjectMissions } from './data.js';
import { esc } from './ui.js';

/** Proste rysunki liniowe w kolorze currentColor, viewBox 200×140. */
const ART = {
  math: `<path d="M20 120H186M30 132V10" class="a-thin"/><path d="M14 118 L180 20" class="a-bold"/><circle cx="64" cy="92" r="6" class="a-dot"/><circle cx="130" cy="53" r="6" class="a-dot"/><path d="M64 92H130V53" class="a-dash"/><text x="94" y="108" class="a-txt">1</text><text x="138" y="78" class="a-txt">a</text>`,
  biology: `<path d="M100 70C70 30 30 22 22 48S60 96 100 70Z" class="a-bold"/><path d="M100 70C130 110 172 118 178 92S140 44 100 70Z" class="a-bold"/><circle cx="100" cy="70" r="12" class="a-dot"/><text x="20" y="30" class="a-txt">płuca</text><text x="132" y="134" class="a-txt">ciało</text>`,
  english: `<path d="M14 84H188" class="a-thin"/><path d="M178 76 188 84 178 92" class="a-thin"/><circle cx="62" cy="84" r="7" class="a-dot"/><circle cx="138" cy="84" r="7" class="a-dot"/><path d="M62 72C76 38 124 38 138 72" class="a-dash"/><text x="30" y="116" class="a-txt">had taken</text><text x="112" y="116" class="a-txt">arrived</text>`,
  algorithms: `<path d="M30 70 80 26 150 34 176 92 100 112Z M80 26 100 112 M30 70 100 112" class="a-thin"/><path d="M30 70 80 26 150 34 176 92" class="a-bold"/><circle cx="30" cy="70" r="9" class="a-dot"/><circle cx="80" cy="26" r="7" class="a-node"/><circle cx="150" cy="34" r="7" class="a-node"/><circle cx="176" cy="92" r="9" class="a-dot"/><circle cx="100" cy="112" r="7" class="a-node"/>`,
};

export const subjectArt = id => `<svg class="art" viewBox="0 0 200 140" aria-hidden="true" fill="none">${ART[id] || ''}</svg>`;

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
