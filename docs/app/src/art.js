/** Mapa nauki w stylu metra: działy to linie, umiejętności to stacje. */
import { LINES, SKILLS } from './catalog.js';
import { mastery, attemptsOf, activeBugs, MASTERY } from './learner.js';
import { esc } from './ui.js';

const HUB = { x: 550, y: 210 };
const GEOM = {
  wyrazenia: { dir: [-1, -1], y: 120, stations: [410, 260, 110], label: 'above' },
  rownania: { dir: [1, -1], y: 120, stations: [690, 840, 990], label: 'above' },
  nierownosci: { dir: [-1, 1], y: 300, stations: [410, 260, 110], label: 'below' },
  funkcja: { dir: [1, 1], y: 300, stations: [690, 840, 990], label: 'below' },
};

export function metroMap(L, nextSkill) {
  const warn = new Set(activeBugs(L).flatMap(b => Object.keys(SKILLS).filter(s => SKILLS[s].bugIds.includes(b))));
  const parts = [], stations = [];
  for (const line of LINES) {
    const g = GEOM[line.id];
    const bend = { x: HUB.x + g.dir[0] * 90, y: g.y };
    const end = g.stations.at(-1) + g.dir[0] * 60;
    parts.push(`<path d="M${HUB.x} ${HUB.y} L${bend.x} ${bend.y} H${end}" class="m-line" style="--c:var(--${line.id})"/>`);
    const bx = end + g.dir[0] * 4;
    parts.push(`<a href="#/linia/${line.id}" class="m-badge" style="--c:var(--${line.id})" aria-label="Dział ${esc(line.name)}"><circle cx="${bx}" cy="${g.y}" r="17"/><text x="${bx}" y="${g.y + 6}" text-anchor="middle">${line.badge}</text></a>`);
    parts.push(`<text x="${bx + g.dir[0] * 26}" y="${g.y + 5}" text-anchor="${g.dir[0] > 0 ? 'start' : 'end'}" class="m-line-name">${esc(line.name)}</text>`);
    line.skills.forEach((id, i) => {
      const x = g.stations[i], y = g.y, ty = g.label === 'above' ? y - 24 : y + 34;
      const p = mastery(L, id), done = p >= MASTERY, started = attemptsOf(L, id) > 0;
      const cls = [done ? 'done' : started ? 'started' : '', id === nextSkill ? 'next' : '', warn.has(id) ? 'warn' : ''].join(' ');
      const state = done ? 'opanowana' : started ? `opanowanie ${Math.round(p * 100)}%` : 'jeszcze nieodwiedzona';
      stations.push(`<a href="#/u/${id}" class="m-station ${cls}" style="--c:var(--${line.id})" aria-label="${esc(line.name)}: ${esc(SKILLS[id].name)}, ${state}${warn.has(id) ? ', aktywna pułapka' : ''}"><circle cx="${x}" cy="${y}" r="11"/>${warn.has(id) ? `<circle cx="${x + 11}" cy="${y - 11}" r="6" class="m-warn"/>` : ''}<text x="${x}" y="${ty}" text-anchor="middle">${esc(SKILLS[id].name)}</text></a>`);
    });
  }
  return `<svg class="metro" viewBox="-130 70 1360 290" role="group" aria-label="Mapa nauki: cztery działy po trzy umiejętności">
    ${parts.join('')}
    <g class="m-hub"><rect x="${HUB.x - 44}" y="${HUB.y - 22}" width="88" height="44" rx="22"/><text x="${HUB.x}" y="${HUB.y + 6}" text-anchor="middle">Start</text></g>
    ${stations.join('')}
  </svg>`;
}
