import { describe, expect, it } from 'vitest';
import * as E from './engine';

const start = (n = 3) => E.startGame(Array.from({ length: n }, (_, i) => `P${i}`), 200);
const round = (g: E.Game) => g.round!;
const pick = (g: E.Game, ...nums: number[]) => {
  for (const v of nums) {
    const res = E.tapNumber(round(g), v);
    if ('round' in res) g = { ...g, round: res.round };
    else throw new Error('unexpected dup question');
  }
  return g;
};

describe('scoring', () => {
  it('sums numbers, applies x2 before additive modifiers and adds the Flip 7 bonus', () => {
    const h = { ...E.emptyHand(), nums: [3, 8, 12], mods: ['x2', '+4'] as E.Mod[] };
    expect(E.scoreOf(h)).toBe((3 + 8 + 12) * 2 + 4);
    const f7 = { ...E.emptyHand(), nums: [0, 1, 2, 3, 4, 5, 6] };
    expect(E.scoreOf(f7)).toBe(21 + 15);
    expect(E.scoreOf({ ...h, status: 'busted' })).toBe(0);
  });
});

describe('turn flow', () => {
  it('only advances on confirm, and can deselect', () => {
    let g = pick(start(), 5);
    expect(E.curPlayer(round(g))).toBe(0);
    g = pick(g, 5); // deselect
    expect(round(g).sel).toHaveLength(0);
    expect(E.canConfirm(round(g))).toBe(false);
    g = pick(g, 5);
    g = E.confirmTurn(g);
    expect(E.curPlayer(round(g))).toBe(1);
    expect(round(g).hands[0].nums).toEqual([5]);
  });

  it('busts on duplicates and skips busted players', () => {
    let g = start();
    g = E.confirmTurn(pick(g, 5)); // P0
    g = E.confirmTurn(pick(g, 1)); // P1
    g = E.confirmTurn(pick(g, 2)); // P2
    const res = E.tapNumber(round(g), 5); // P0 draws 5 again
    expect('round' in res && E.preview(res.round)[0].status).toBe('busted');
    g = E.confirmTurn({ ...g, round: (res as { round: E.Round }).round });
    expect(E.curPlayer(round(g))).toBe(1);
    g = E.confirmTurn(pick(g, 3));
    g = E.confirmTurn(pick(g, 4));
    expect(E.curPlayer(round(g))).toBe(1); // P0 skipped
  });

  it('uses a Second Chance on a duplicate', () => {
    let g = start();
    g.round!.hands[0] = { ...E.emptyHand(), nums: [8], sc: true };
    const res = E.tapNumber(round(g), 8);
    expect('askDup' in res).toBe(true);
    const r = E.resolveDup(round(g), 8, true);
    const h = E.preview(r)[0];
    expect(h.status).toBe('active');
    expect(h.sc).toBe(false);
    expect(h.nums).toEqual([8]);
  });

  it('keeps a first Second Chance and offers a second one to others', () => {
    let g = start();
    let res = E.tapSecondChance(round(g));
    expect('round' in res).toBe(true);
    g = E.confirmTurn({ ...g, round: (res as { round: E.Round }).round });
    expect(round(g).hands[0].sc).toBe(true);
    g = { ...g, round: { ...round(g), cur: 0 } };
    res = E.tapSecondChance(round(g));
    expect('askGive' in res).toBe(true);
    expect(E.scEligible(round(g))).toEqual([1, 2]);
    const given = E.giveSecondChance(round(g), 2);
    expect(E.preview(given)[2].sc).toBe(true);
    round(g).hands[1].sc = true;
    round(g).hands[2].sc = true;
    expect(E.scEligible(round(g))).toEqual([]);
  });

  it('modifiers held by others are gone', () => {
    const g = start();
    g.round!.hands[1].mods = ['+4'];
    expect(E.goneMods(round(g)).has('+4')).toBe(true);
    const r = E.tapMod(round(g), '+4');
    expect(r.sel).toHaveLength(0);
  });

  it('freeze banks the target, flip 3 makes the target draw three cards', () => {
    let g = start();
    let r = E.setActionTarget(round(g), 'freeze', 1);
    g = E.confirmTurn({ ...g, round: r });
    expect(round(g).hands[1].status).toBe('frozen');
    expect(E.curPlayer(round(g))).toBe(2);

    r = E.setActionTarget(round(g), 'flip3', 0);
    g = E.confirmTurn({ ...g, round: r });
    expect(E.curPlayer(round(g))).toBe(0);
    expect(E.inFlip3(round(g))).toBe(true);
    g = pick(g, 1, 2);
    expect(E.canConfirm(round(g))).toBe(false);
    g = pick(g, 3);
    expect(E.canConfirm(round(g))).toBe(true);
    g = E.confirmTurn(g);
    expect(round(g).hands[0].nums).toEqual([1, 2, 3]);
    expect(E.curPlayer(round(g))).toBe(0); // P2 -> P0 regular turn (P1 frozen)
    expect(E.inFlip3(round(g))).toBe(false);
  });
});

describe('single selection', () => {
  it('replaces the selection in a regular turn but allows several during Flip 3', () => {
    let g = pick(start(), 5, 6);
    expect(round(g).sel).toEqual([{ k: 'n', v: 6 }]);
    g = { ...g, round: E.tapMod(round(g), '+4') };
    expect(round(g).sel).toEqual([{ k: 'm', v: '+4' }]);
    g = { ...g, round: E.toggleStay(round(g)) };
    expect(round(g).sel).toEqual([]);
    expect(round(g).stay).toBe(true);
    g = pick(g, 3);
    expect(round(g).stay).toBe(false);

    g = E.confirmTurn({ ...g, round: E.setActionTarget(E.confirmTurn(g).round!, 'flip3', 2) });
    expect(E.inFlip3(round(g))).toBe(true);
    g = pick(g, 1, 2);
    expect(round(g).sel).toHaveLength(2);
  });
});

describe('flip 3 limits and duplicates', () => {
  const inFlip = () => {
    const g = start();
    return { ...g, round: { ...round(g), frames: [{ player: 0, from: 1 }] } } as E.Game;
  };

  it('allows at most three cards', () => {
    let g = pick(inFlip(), 1, 2, 3);
    g = { ...g, round: E.tapMod(round(g), '+2') };
    expect(round(g).sel).toHaveLength(3);
    expect(E.tapNumber(round(g), 4)).toEqual({ round: round(g) });
    // tapping a selected card while full just deselects it
    const res = E.tapNumber(round(g), 3) as { round: E.Round };
    expect(res.round.sel).toHaveLength(2);
  });

  it('asks when a selected number is tapped again; bust or deselect', () => {
    const g = pick(inFlip(), 7);
    expect(E.tapNumber(round(g), 7)).toEqual({ askSelDup: true });
    expect(E.deselectNumber(round(g), 7).sel).toHaveLength(0);
    const busted = E.resolveDup(round(g), 7, false);
    expect(E.preview(busted)[0].status).toBe('busted');
    expect(E.canConfirm(busted)).toBe(true);
    // tapping the red duplicate undoes only the duplicate
    const undone = (E.tapNumber(busted, 7) as { round: E.Round }).round;
    expect(undone.sel).toEqual([{ k: 'n', v: 7 }]);
  });
});

describe('round end', () => {
  it('ends when everyone has stayed and rotates the starter', () => {
    let g = start(2);
    for (let i = 0; i < 2; i++) {
      g = E.confirmTurn(pick(g, 10 + i));
    }
    g = { ...g, round: E.toggleStay(round(g)) };
    g = E.confirmTurn(g);
    g = { ...g, round: E.toggleStay(round(g)) };
    g = E.confirmTurn(g);
    expect(g.phase).toBe('roundEnd');
    expect(g.history[0].scores).toEqual([10, 11]);
    g = E.nextRound(g);
    expect(round(g).starter).toBe(1);
    expect(E.curPlayer(round(g))).toBe(1);
  });

  it('flip 7 ends the round immediately and scores the bonus', () => {
    let g = start(2);
    g.round!.hands[0].nums = [0, 1, 2, 3, 4, 5];
    g = pick(g, 6);
    expect(E.canConfirm(round(g))).toBe(true);
    g = E.confirmTurn(g);
    expect(g.phase).toBe('roundEnd');
    expect(g.history[0].scores[0]).toBe(21 + 15);
    expect(g.history[0].flip7).toEqual([true, false]);
  });

  it('declares a winner only with a clear lead at or above the target', () => {
    let g = start(2);
    g.history = [{ starter: 0, scores: [210, 210], status: ['stayed', 'stayed'], flip7: [false, false] }];
    expect(E.isDecided(g)).toBe(false);
    g.history.push({ starter: 1, scores: [5, 0], status: ['stayed', 'busted'], flip7: [false, false] });
    expect(E.isDecided(g)).toBe(true);
    expect(E.ranking(g).map((r) => r.place)).toEqual([1, 2]);
  });

  it('edit hand can end the round', () => {
    let g = start(2);
    g.round!.hands[1].status = 'busted';
    g = E.editHand(g, 0, { ...E.emptyHand(), nums: [4], status: 'stayed' });
    expect(g.phase).toBe('roundEnd');
    expect(g.history[0].scores).toEqual([4, 0]);
  });
});
