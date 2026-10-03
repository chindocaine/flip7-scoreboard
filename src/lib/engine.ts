// Pure game logic for Flip 7. No UI, no storage: every function takes a state and returns a new one.

export const MODS = ['+2', '+4', '+6', '+8', '+10', 'x2'] as const;
export type Mod = (typeof MODS)[number];
export const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;
export const FLIP7_BONUS = 15;
export const DEFAULT_TARGET = 200;

export type Status = 'active' | 'stayed' | 'busted' | 'frozen';

export interface Hand {
  nums: number[];
  mods: Mod[];
  sc: boolean; // holds a Second Chance
  status: Status;
  bustNum: number | null;
}

/** One card (or the Stay decision) selected during the current, not yet confirmed turn. */
export type Sel =
  | { k: 'n'; v: number; dup?: 'sc' | 'bust' }
  | { k: 'm'; v: Mod }
  | { k: 'a'; v: 'freeze' | 'flip3'; target: number }
  | { k: 's'; give: number | 'self' | null };

/** A player who has to draw three cards because of a Flip 3. */
export interface Frame {
  player: number;
  from: number;
}

export interface Round {
  starter: number;
  cur: number; // player whose regular turn it is (frames take precedence)
  hands: Hand[];
  frames: Frame[];
  sel: Sel[];
  stay: boolean;
}

export interface RoundResult {
  starter: number;
  scores: number[];
  status: Status[];
  flip7: boolean[];
}

export interface Game {
  phase: 'setup' | 'play' | 'roundEnd' | 'over';
  target: number;
  players: string[];
  history: RoundResult[];
  round: Round | null;
}

// JSON round-trip (not structuredClone) so reactive proxies from the UI can be cloned too
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v));

// ---------- scoring ----------

export function emptyHand(): Hand {
  return { nums: [], mods: [], sc: false, status: 'active', bustNum: null };
}

export function isFlip7(h: Hand): boolean {
  return h.status !== 'busted' && h.nums.length >= 7;
}

export function scoreOf(h: Hand): number {
  if (h.status === 'busted') return 0;
  let n = h.nums.reduce((a, b) => a + b, 0);
  if (h.mods.includes('x2')) n *= 2;
  for (const m of h.mods) if (m !== 'x2') n += parseInt(m.slice(1), 10);
  if (h.nums.length >= 7) n += FLIP7_BONUS;
  return n;
}

export function totals(g: Game): number[] {
  return g.players.map((_, i) => g.history.reduce((a, r) => a + r.scores[i], 0));
}

export function ranking(g: Game): { player: number; score: number; place: number }[] {
  const sorted = totals(g)
    .map((score, player) => ({ player, score }))
    .sort((a, b) => b.score - a.score);
  return sorted.map((e) => ({ ...e, place: sorted.findIndex((o) => o.score === e.score) + 1 }));
}

/** The game is decided once somebody reached the target and the lead is not tied. */
export function isDecided(g: Game): boolean {
  const r = ranking(g);
  return r[0].score >= g.target && (r.length < 2 || r[0].score > r[1].score);
}

// ---------- round setup ----------

export function newRound(g: Game): Round {
  const starter = g.history.length % g.players.length;
  return {
    starter,
    cur: starter,
    hands: g.players.map(emptyHand),
    frames: [],
    sel: [],
    stay: false,
  };
}

export function startGame(players: string[], target: number): Game {
  const g: Game = { phase: 'play', target, players, history: [], round: null };
  g.round = newRound(g);
  return g;
}

export function resetGame(g: Game): Game {
  return startGame(g.players, g.target);
}

export function nextRound(g: Game): Game {
  const n = clone(g);
  if (isDecided(n)) {
    n.phase = 'over';
    return n;
  }
  n.phase = 'play';
  n.round = newRound(n);
  return n;
}

// ---------- the current turn ----------

export const curPlayer = (r: Round): number => r.frames[0]?.player ?? r.cur;
export const inFlip3 = (r: Round): boolean => r.frames.length > 0;

/** Hands as they look after applying the current (unconfirmed) selections. */
export function preview(r: Round): Hand[] {
  const hands = clone(r.hands);
  const p = curPlayer(r);
  const h = hands[p];
  for (const s of r.sel) {
    if (h.status !== 'active') break;
    if (s.k === 'n') {
      if (s.dup === 'sc') h.sc = false;
      else if (s.dup === 'bust') {
        h.status = 'busted';
        h.bustNum = s.v;
      } else h.nums.push(s.v);
    } else if (s.k === 'm') h.mods.push(s.v);
    else if (s.k === 's') {
      if (s.give === 'self') h.sc = true;
      else if (s.give !== null) hands[s.give].sc = true;
    }
  }
  if (r.stay && r.sel.length === 0 && h.status === 'active') h.status = 'stayed';
  return hands;
}

/** Modifier cards held by players other than the one currently drawing (only one of each exists). */
export function goneMods(r: Round): Set<Mod> {
  const p = curPlayer(r);
  const s = new Set<Mod>();
  r.hands.forEach((h, i) => {
    if (i !== p) h.mods.forEach((m) => s.add(m));
  });
  return s;
}

const withRound = (r: Round, f: (r: Round) => void): Round => {
  const n = clone(r);
  f(n);
  return n;
};

const removeSel = (r: Round, pred: (s: Sel) => boolean): Round | null => {
  const i = r.sel.findIndex(pred);
  return i < 0 ? null : withRound(r, (n) => n.sel.splice(i, 1));
};

/**
 * Regular turns allow a single card: a new selection replaces the previous one.
 * During a Flip 3 several cards can be selected. `base` is the round without the selection a new tap would replace.
 */
const base = (r: Round): Round => (inFlip3(r) ? r : { ...r, sel: [], stay: false });

export const FLIP3_CARDS = 3;
/** During a Flip 3 exactly three cards can be selected. */
export const isFull = (r: Round): boolean => inFlip3(r) && r.sel.length >= FLIP3_CARDS;

const addSel = (r: Round, s: Sel): Round =>
  withRound(r, (n) => {
    if (isFull(n)) return;
    if (!inFlip3(n)) n.sel = [];
    n.sel.push(s);
    n.stay = false;
  });

const canDraw = (r: Round): boolean => preview(r)[curPlayer(r)].status === 'active';

/**
 * Result of tapping a number: the new round, or a question for the UI.
 * - askDup: the player already holds this number from an earlier turn and has a Second Chance.
 * - askSelDup: during a Flip 3 the number is already selected – deselect it, or was it drawn twice?
 */
export function tapNumber(r: Round, v: number): { round: Round } | { askDup: true } | { askSelDup: true } {
  const dup = removeSel(r, (s) => s.k === 'n' && s.v === v && !!s.dup);
  if (dup) return { round: dup };
  if (r.sel.some((s) => s.k === 'n' && s.v === v)) {
    return inFlip3(r) && !isFull(r) ? { askSelDup: true } : { round: deselectNumber(r, v) };
  }
  if (isFull(r)) return { round: r };
  const b = base(r);
  if (!canDraw(b)) return { round: r };
  const h = preview(b)[curPlayer(b)];
  if (!h.nums.includes(v)) return { round: addSel(r, { k: 'n', v }) };
  if (h.sc) return { askDup: true };
  return { round: addSel(r, { k: 'n', v, dup: 'bust' }) };
}

/** Removes the plain (non-duplicate) selection of a number. */
export function deselectNumber(r: Round, v: number): Round {
  return removeSel(r, (s) => s.k === 'n' && s.v === v && !s.dup) ?? r;
}

export function resolveDup(r: Round, v: number, useSecondChance: boolean): Round {
  return addSel(r, { k: 'n', v, dup: useSecondChance ? 'sc' : 'bust' });
}

export function tapMod(r: Round, m: Mod): Round {
  const removed = removeSel(r, (s) => s.k === 'm' && s.v === m);
  if (removed) return removed;
  const p = curPlayer(r);
  if (isFull(r) || !canDraw(base(r)) || goneMods(r).has(m) || r.hands[p].mods.includes(m)) return r;
  return addSel(r, { k: 'm', v: m });
}

/** Players who may still receive a Second Chance from the current player. */
export function scEligible(r: Round): number[] {
  const hands = preview(base(r));
  const p = curPlayer(r);
  return hands.flatMap((h, i) => (i !== p && h.status === 'active' && !h.sc ? [i] : []));
}

/** Tapping Second Chance: keep it, or (if the player already holds one) ask where it goes. */
export function tapSecondChance(r: Round): { round: Round } | { askGive: true } {
  const removed = removeSel(r, (s) => s.k === 's');
  if (removed) return { round: removed };
  const b = base(r);
  if (isFull(r) || !canDraw(b)) return { round: r };
  if (!preview(b)[curPlayer(b)].sc) return { round: addSel(r, { k: 's', give: 'self' }) };
  return { askGive: true };
}

export function giveSecondChance(r: Round, to: number | null): Round {
  return addSel(r, { k: 's', give: to });
}

/** Players who can be the target of Freeze / Flip 3 (everyone still active, including the drawer). */
export function actionTargets(r: Round): number[] {
  return preview(base(r)).flatMap((h, i) => (h.status === 'active' ? [i] : []));
}

export function tapAction(r: Round, kind: 'freeze' | 'flip3'): { round: Round } | { askTarget: true } {
  const removed = removeSel(r, (s) => s.k === 'a' && s.v === kind);
  if (removed) return { round: removed };
  if (isFull(r) || !canDraw(base(r))) return { round: r };
  return { askTarget: true };
}

export function setActionTarget(r: Round, kind: 'freeze' | 'flip3', target: number): Round {
  return addSel(r, { k: 'a', v: kind, target });
}

export function toggleStay(r: Round): Round {
  if (inFlip3(r)) return r;
  return withRound(r, (n) => {
    n.stay = !r.stay || r.sel.length > 0;
    n.sel = [];
  });
}

export function canConfirm(r: Round): boolean {
  const h = preview(r)[curPlayer(r)];
  if (inFlip3(r)) return r.sel.length >= FLIP3_CARDS || h.status !== 'active' || isFlip7(h);
  return r.sel.length > 0 || r.stay;
}

// ---------- confirming a turn / round end ----------

function roundOver(r: Round): boolean {
  return r.hands.every((h) => h.status !== 'active') || r.hands.some(isFlip7);
}

function nextActiveAfter(r: Round, from: number): number {
  const n = r.hands.length;
  for (let i = 1; i <= n; i++) {
    const idx = (from + i) % n;
    if (r.hands[idx].status === 'active') return idx;
  }
  return from;
}

/** Drops invalid frames, advances past inactive players and finishes the round when it is over. */
function settle(g: Game): Game {
  const r = g.round!;
  r.frames = r.frames.filter((f) => r.hands[f.player].status === 'active');
  if (roundOver(r)) return finishRound(g);
  if (r.frames.length === 0 && r.hands[r.cur].status !== 'active') r.cur = nextActiveAfter(r, r.cur);
  return g;
}

function finishRound(g: Game): Game {
  const r = g.round!;
  g.history.push({
    starter: r.starter,
    scores: r.hands.map(scoreOf),
    status: r.hands.map((h) => h.status),
    flip7: r.hands.map(isFlip7),
  });
  r.sel = [];
  r.stay = false;
  r.frames = [];
  g.phase = 'roundEnd';
  return g;
}

/** "Next" / "Continue": commits the selections of the current turn and moves on. */
export function confirmTurn(game: Game): Game {
  const g = clone(game);
  const r = g.round!;
  if (!canConfirm(r)) return game;
  const p = curPlayer(r);
  const hands = preview(r);
  const me = hands[p];
  const spawned: Frame[] = [];
  if (me.status !== 'busted' && !isFlip7(me)) {
    for (const s of r.sel) {
      if (s.k !== 'a') continue;
      const t = hands[s.target];
      if (t.status !== 'active') continue;
      if (s.v === 'freeze') t.status = 'frozen';
      else spawned.push({ player: s.target, from: p });
    }
  }
  r.hands = hands;
  r.sel = [];
  r.stay = false;
  if (inFlip3(r)) r.frames.shift();
  else r.cur = nextActiveAfter(r, r.cur);
  r.frames.unshift(...spawned);
  return settle(g);
}

/** "Edit hand": replace a player's committed hand (any time during a round). */
export function editHand(game: Game, player: number, hand: Hand): Game {
  const g = clone(game);
  const r = g.round!;
  r.hands[player] = hand;
  r.sel = [];
  r.stay = false;
  return settle(g);
}

/** "Fix a score" on the round summary. */
export function fixScore(game: Game, player: number, score: number): Game {
  const g = clone(game);
  g.history[g.history.length - 1].scores[player] = score;
  return g;
}
