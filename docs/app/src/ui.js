/** Wspólne narzędzia interfejsu: ikony, escapowanie, drobne komponenty. */

export const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const pad2 = n => String(n).padStart(2, '0');

const PATHS = {
  home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
  labs: '<path d="M9 3h6"/><path d="M10 3v6.5L4.6 18.4A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.4-2.6L14 9.5V3"/><path d="M7.5 15h9"/>',
  progress: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
  arrow: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  back: '<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  bulb: '<path d="M9 18h6"/><path d="M10 21.5h4"/><path d="M8.2 14.8A6.5 6.5 0 1 1 15.8 14.8c-.8.6-1.3 1.5-1.3 2.4V18h-5v-.8c0-.9-.5-1.8-1.3-2.4z"/>',
  sparkle: '<path d="M12 3.5 13.7 9l5.8 1.8-5.8 1.8L12 18.1l-1.7-5.5L4.5 10.8 10.3 9z"/><path d="M19 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  math: '<path d="M4 20 20 4"/><path d="M4 4v16h16"/><circle cx="9" cy="15" r="1.3"/><circle cx="15" cy="9" r="1.3"/>',
  biology: '<path d="M12 20.5s-8-4.6-8-10.6A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.9c0 6-8 10.6-8 10.6z"/><path d="M4.5 12h4l1.5-3 2.5 6 1.5-3h5.5"/>',
  english: '<path d="M4 5h11a3 3 0 0 1 3 3v11H7a3 3 0 0 1-3-3z"/><path d="M8 9h6M8 13h4"/><path d="M18 8h2v13H8"/>',
  algorithms: '<circle cx="5" cy="12" r="2.2"/><circle cx="12" cy="5" r="2.2"/><circle cx="12" cy="19" r="2.2"/><circle cx="19" cy="12" r="2.2"/><path d="m6.6 10.4 3.8-3.8M6.6 13.6l3.8 3.8M13.6 6.6l3.8 3.8M13.6 17.4l3.8-3.8M12 7.2v9.6"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  reset: '<path d="M4 4v6h6"/><path d="M4.6 15a8 8 0 1 0 1.9-8.3L4 10"/>',
  chat: '<path d="M20 15a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2z"/>',
  shield: '<path d="M12 3 4.5 6v6c0 4.6 3.2 7.8 7.5 9 4.3-1.2 7.5-4.4 7.5-9V6z"/><path d="m9 12 2 2 4-4"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r=".8"/>',
  flag: '<path d="M5 21V4"/><path d="M5 4h11l-2 4 2 4H5"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
  next: '<path d="m9 6 6 6-6 6"/>',
  prev: '<path d="m15 6-6 6 6 6"/>',
  trash: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6.5 7 7.5 20h9l1-13"/>',
  minus: '<path d="M5 12h14"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5"/><path d="M12 7.6v.1"/>',
};

export const icon = (name, size = 18) =>
  `<svg class="i" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || PATHS.sparkle}</svg>`;

/** Pierścień postępu (0–1). */
export function ring(fraction, size = 46, stroke = 4) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const f = Math.max(0, Math.min(1, fraction));
  return `<svg class="ring" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" aria-hidden="true"><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-track" stroke-width="${stroke}"/><circle cx="${size / 2}" cy="${size / 2}" r="${r}" class="ring-value" stroke-width="${stroke}" stroke-dasharray="${(c * f).toFixed(2)} ${c.toFixed(2)}" transform="rotate(-90 ${size / 2} ${size / 2})"/></svg>`;
}

export const subjectStyle = s => `style="--c:var(--${s.id})"`;
