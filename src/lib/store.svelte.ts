import { DEFAULT_TARGET, type Game } from './engine';
import { translate, type Key, type Lang } from './i18n';

export type Theme = 'light' | 'dark';

/** UI state that is persisted as well, so a reload restores open dialogs. */
export type Dialog =
  | { t: 'target'; kind: 'freeze' | 'flip3' }
  | { t: 'dup'; n: number }
  | { t: 'selDup'; n: number }
  | { t: 'scgive' }
  | { t: 'menu' }
  | { t: 'board' }
  | { t: 'edit'; player: number }
  | { t: 'abort' }
  | { t: 'fix'; player: number }
  | { t: 'score' }
  | null;

interface Persisted {
  lang: Lang;
  theme: Theme;
  setupNames: string[];
  game: Game;
  dialog: Dialog;
}

const KEY = 'flip7.v1';

const systemTheme = (): Theme =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
const systemLang = (): Lang => (typeof navigator !== 'undefined' && navigator.language?.startsWith('de') ? 'de' : 'en');

function load(): Persisted {
  const fresh: Persisted = {
    lang: systemLang(),
    theme: systemTheme(),
    setupNames: ['', ''],
    game: { phase: 'setup', target: DEFAULT_TARGET, players: [], history: [], round: null },
    dialog: null,
  };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...fresh, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable or corrupt: start fresh */
  }
  return fresh;
}

export const app = $state<Persisted>(load());

export function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify($state.snapshot(app)));
  } catch {
    /* ignore */
  }
}

export const t = (key: Key, params?: Record<string, string | number>): string => translate(app.lang, key, params);

export function applyTheme(): void {
  document.documentElement.dataset.theme = app.theme;
  document.documentElement.lang = app.lang;
  document.querySelector('meta[name=theme-color]')?.setAttribute('content', app.theme === 'dark' ? '#12172b' : '#f3f5fd');
}

export function setGame(g: Game): void {
  app.game = g;
  save();
}

export function setDialog(d: Dialog): void {
  app.dialog = d;
  save();
}

export const playerName = (i: number): string => app.game.players[i];

// Layout: tablet layout at >= 900px width
export const layout = $state({ tablet: false });
if (typeof matchMedia !== 'undefined') {
  const mq = matchMedia('(min-width: 900px)');
  layout.tablet = mq.matches;
  mq.addEventListener('change', (e) => (layout.tablet = e.matches));
}
